const mongoose = require('mongoose');

// 故事节点模型 - 真正的树状结构
const storyNodeSchema = new mongoose.Schema({
  storyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Story',
    required: [true, '故事ID必填'],
    index: true
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StoryNode',
    default: null, // 根节点的parentId为null
    index: true
  },
  title: {
    type: String,
    required: [true, '节点标题必填'],
    trim: true,
    maxlength: [200, '标题不能超过200字符']
  },
  content: {
    type: String,
    // required: [true, '节点内容必填'],
    trim: true
  },
  type: {
    type: String,
    required: [true, '节点类型必填'],
    enum: ['normal', 'choice', 'ending'],
    default: 'normal'
  },
  description: {
    type: String,
    trim: true,
    description: '节点描述，用于choice类型节点的说明'
  },
  order: {
    type: Number,
    required: [true, '节点顺序必填'],
    min: 0,
    default: 0
  },
  choices: [{
    id: {
      type: String,
      required: true
    },
    text: {
      type: String,
      required: [true, '选项文本必填'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    targetNodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StoryNode',
      default: null // 可以为null，表示未绑定目标节点
    },
    tempTargetNodeId: {
      type: String,
      default: null // 临时目标节点ID，用于处理保存顺序问题
    },
    autoCreate: {
      type: Boolean,
      default: false // 是否自动创建分支节点
    }
  }],
  position: {
    x: {
      type: Number,
      default: 0
    },
    y: {
      type: Number,
      default: 0
    }
  },
  depth: {
    type: Number,
    default: 0, // 根节点深度为0
    index: true
  },
  path: {
    type: String,
    default: '', // 路径，如 "root,node1,node2"
    index: true
  }
}, {
  timestamps: true,
  minimize: true,
  versionKey: false
});

// 复合索引
storyNodeSchema.index({ storyId: 1, parentId: 1, order: 1 });
storyNodeSchema.index({ storyId: 1, depth: 1 });
storyNodeSchema.index({ storyId: 1, path: 1 });

// 实例方法：获取子节点
storyNodeSchema.methods.getChildren = function(options = {}) {
  const query = { parentId: this._id, storyId: this.storyId };
  if (options.type) {
    query.type = options.type;
  }
  return this.constructor.find(query).sort({ order: 1 });
};

// 实例方法：获取父节点
storyNodeSchema.methods.getParent = function() {
  if (!this.parentId) return Promise.resolve(null);
  return this.constructor.findById(this.parentId);
};

// 实例方法：获取根节点
storyNodeSchema.methods.getRoot = function() {
  if (!this.parentId) return Promise.resolve(this);
  return this.constructor.findOne({ storyId: this.storyId, parentId: null });
};

// 实例方法：获取完整路径
storyNodeSchema.methods.getFullPath = async function() {
  if (!this.parentId) return [this];
  
  const parent = await this.getParent();
  const parentPath = await parent.getFullPath();
  return [...parentPath, this];
};

// 实例方法：检查是否为祖先节点
storyNodeSchema.methods.isAncestorOf = function(nodeId) {
  if (!this.path) return false;
  const pathArray = this.path.split(',');
  return pathArray.includes(nodeId.toString());
};



// 静态方法：获取故事树
storyNodeSchema.statics.getStoryTree = async function(storyId, options = {}) {
  const nodes = await this.find({ storyId })
    .sort({ depth: 1, order: 1 })
    .lean();
  
  // 构建树状结构
  const nodeMap = {};
  const roots = [];
  const visitedNodes = new Set();
  
  // 创建节点映射
  nodes.forEach(node => {
    nodeMap[node._id] = { 
      ...node, 
      children: [],
      // 确保choices数组存在
      choices: node.choices || []
    };
  });
  
  // 首先通过parentId建立基本树结构
  nodes.forEach(node => {
    const currentNode = nodeMap[node._id];
    
    if (!node.parentId) {
      // 如果没有parentId，则为根节点
      if (!visitedNodes.has(node._id.toString())) {
        roots.push(currentNode);
        visitedNodes.add(node._id.toString());
      }
    } else {
      // 如果有parentId，添加到父节点的children中
      const parentNode = nodeMap[node.parentId];
      if (parentNode && !visitedNodes.has(node._id.toString())) {
        parentNode.children.push(currentNode);
        visitedNodes.add(node._id.toString());
      }
    }
  });
  
  // 然后通过choices.targetNodeId添加额外的连接（如果还没有添加）
  nodes.forEach(node => {
    const currentNode = nodeMap[node._id];
    
    if (currentNode.choices && currentNode.choices.length > 0) {
      currentNode.choices.forEach(choice => {
        if (choice.targetNodeId && nodeMap[choice.targetNodeId]) {
          const targetNode = nodeMap[choice.targetNodeId];
          // 检查目标节点是否已经被添加到其他父节点
          if (!visitedNodes.has(targetNode._id.toString())) {
            // 如果没有被添加，添加到当前节点的children中
            currentNode.children.push(targetNode);
            visitedNodes.add(targetNode._id.toString());
          }
        }
      });
    }
  });
  
  return roots.length > 0 ? roots[0] : null;
};

// 静态方法：处理节点保存后的关系绑定和自动创建
storyNodeSchema.statics.processNodeRelations = async function(nodes, storyId) {
  if (!Array.isArray(nodes)) {
    throw new Error('nodes参数必须是数组');
  }
  
  if (!storyId || !mongoose.Types.ObjectId.isValid(storyId)) {
    throw new Error('无效的storyId');
  }
  
  const nodeMap = {};
  const createdNodes = [];
  
  try {
    // 第一阶段：保存所有节点，建立临时ID映射
    for (const nodeData of nodes) {
      if (!nodeData || typeof nodeData !== 'object') {
        continue; // 跳过无效节点数据
      }
      
      // 提取临时ID
      const tempId = nodeData.tempId || nodeData.id || nodeData._id?.toString();
      
      // 准备节点数据，排除tempId字段
      const { tempId: _, id: __, ...nodeFields } = nodeData;
      
      // 确定parentId（如果有）
      let parentId = nodeData.parentId || null;
      if (parentId) {
        if (nodeMap[parentId]) {
          parentId = nodeMap[parentId];
        } else if (!mongoose.Types.ObjectId.isValid(parentId)) {
          // 如果parentId不是有效的ObjectId，跳过
          parentId = null;
        }
      }
      
      // 计算depth和path
      let depth = 0;
      let path = '';
      if (parentId) {
        try {
          const parent = await this.findById(parentId);
          if (parent) {
            depth = parent.depth + 1;
            path = parent.path ? `${parent.path},${parent._id}` : parent._id.toString();
          }
        } catch (error) {
          console.error(`获取父节点失败: ${parentId}`, error);
          // 继续执行，使用默认depth和path
        }
      }
      
      // 创建节点
      const node = new this({
        ...nodeFields,
        storyId,
        parentId: parentId,
        depth: depth,
        path: path,
        position: nodeData.position || { x: 0, y: 0 },
        order: nodeData.order || 0
      });
      
      // 处理choices中的临时关系
      if (node.choices && node.choices.length > 0) {
        node.choices = node.choices.map(choice => ({
          ...choice,
          targetNodeId: null, // 先清空，第二阶段再处理
          tempTargetNodeId: choice.tempTargetNodeId || choice.targetNodeId?.toString() || null
        }));
      }
      
      // 保存节点
      try {
        await node.save();
        if (tempId) {
          nodeMap[tempId] = node._id.toString();
        }
        createdNodes.push(node);
      } catch (error) {
        console.error('保存节点失败:', error);
        // 继续处理其他节点，而不是中断整个操作
      }
    }
    
    // 第二阶段：处理关系绑定和自动创建分支节点
    for (const node of createdNodes) {
      let needsUpdate = false;
      
      if (node.choices && node.choices.length > 0) {
        for (let i = 0; i < node.choices.length; i++) {
          const choice = node.choices[i];
          
          // 处理临时ID转换
          if (choice.tempTargetNodeId && nodeMap[choice.tempTargetNodeId]) {
            choice.targetNodeId = nodeMap[choice.tempTargetNodeId];
            choice.tempTargetNodeId = null;
            needsUpdate = true;
          }
          
          // 自动创建子节点
          if (choice.autoCreate && !choice.targetNodeId) {
            try {
              const childNode = new this({
                storyId,
                parentId: node._id,
                title: choice.text || '新章节',
                content: '',
                type: 'normal',
                order: i,
                depth: node.depth + 1,
                path: node.path ? `${node.path},${node._id}` : node._id.toString(),
                position: {
                  x: node.position.x + 200,
                  y: node.position.y + (i * 100)
                }
              });
              
              await childNode.save();
              choice.targetNodeId = childNode._id;
              choice.autoCreate = false;
              needsUpdate = true;
            } catch (error) {
              console.error('自动创建子节点失败:', error);
              // 继续处理其他选项
            }
          }
        }
      }
      
      if (needsUpdate) {
        try {
          await node.save();
        } catch (error) {
          console.error('更新节点关系失败:', error);
          // 继续处理其他节点
        }
      }
    }
    
    return createdNodes;
  } catch (error) {
    console.error('处理节点关系失败:', error);
    throw error;
  }
};
storyNodeSchema.statics.createChild = async function(parentId, nodeData) {
  if (!parentId || !mongoose.Types.ObjectId.isValid(parentId)) {
    throw new Error('无效的父节点ID');
  }
  
  if (!nodeData || typeof nodeData !== 'object') {
    throw new Error('无效的节点数据');
  }
  
  try {
    const parent = await this.findById(parentId);
    if (!parent) {
      throw new Error('父节点不存在');
    }
    
    // 获取同级节点的最大order值
    const maxOrder = await this.findOne({ 
      parentId: parentId, 
      storyId: parent.storyId 
    }).sort({ order: -1 }).select('order');
    
    const order = maxOrder ? maxOrder.order + 1 : 0;
    
    // 创建子节点
    const child = new this({
      ...nodeData,
      storyId: parent.storyId,
      parentId: parentId,
      order: order,
      depth: parent.depth + 1,
      path: parent.path ? `${parent.path},${parent._id}` : parent._id.toString()
    });
    
    // 保存子节点
    await child.save();
    
    // 如果父节点不是choice类型，并且提供了description，自动添加一个选项
    if (parent.type !== 'choice' && nodeData.description) {
      try {
        const choiceId = new mongoose.Types.ObjectId().toString();
        parent.choices.push({
          id: choiceId,
          text: nodeData.description,
          targetNodeId: child._id
        });
        await parent.save();
      } catch (error) {
        console.error('更新父节点选项失败:', error);
        // 继续执行，不影响子节点创建
      }
    }
    
    return child;
  } catch (error) {
    console.error('创建子节点失败:', error);
    throw error;
  }
};

// 静态方法：删除节点及其子节点
storyNodeSchema.statics.deleteSubtree = async function(nodeId) {
  if (!nodeId || !mongoose.Types.ObjectId.isValid(nodeId)) {
    throw new Error('无效的节点ID');
  }
  
  try {
    const node = await this.findById(nodeId);
    if (!node) {
      throw new Error('节点不存在');
    }
    
    // 递归删除所有子节点
    const children = await this.find({ parentId: nodeId });
    for (const child of children) {
      try {
        await this.deleteSubtree(child._id);
      } catch (error) {
        console.error(`删除子节点失败: ${child._id}`, error);
        // 继续删除其他子节点
      }
    }
    
    // 从父节点中移除相关选项
    if (node.parentId) {
      try {
        await this.updateOne(
          { _id: node.parentId },
          { $pull: { choices: { targetNodeId: nodeId } } }
        );
      } catch (error) {
        console.error(`从父节点移除选项失败: ${node.parentId}`, error);
        // 继续执行，不影响节点删除
      }
    }
    
    // 从所有节点的choices中移除对该节点的引用
    try {
      await this.updateMany(
        { 'choices.targetNodeId': nodeId },
        { $pull: { choices: { targetNodeId: nodeId } } }
      );
    } catch (error) {
      console.error('从其他节点移除选项引用失败:', error);
      // 继续执行，不影响节点删除
    }
    
    // 删除节点
    return await this.findByIdAndDelete(nodeId);
  } catch (error) {
    console.error('删除节点及其子树失败:', error);
    throw error;
  }
};

// 静态方法：重新计算路径和深度
storyNodeSchema.statics.recalculatePaths = async function(storyId) {
  const nodes = await this.find({ storyId }).sort({ depth: 1, order: 1 });
  
  for (const node of nodes) {
    if (!node.parentId) {
      // 根节点
      node.depth = 0;
      node.path = '';
    } else {
      const parent = await this.findById(node.parentId);
      node.depth = parent.depth + 1;
      node.path = parent.path ? `${parent.path},${parent._id}` : parent._id.toString();
    }
    await node.save();
  }
};

// 静态方法：复制节点
storyNodeSchema.statics.copyNode = async function(nodeId, newParentId = null) {
  if (!nodeId || !mongoose.Types.ObjectId.isValid(nodeId)) {
    throw new Error('无效的节点ID');
  }
  
  // 获取原始节点
  const originalNode = await this.findById(nodeId);
  if (!originalNode) {
    throw new Error('节点不存在');
  }
  
  // 确定新的parentId
  const finalParentId = newParentId || originalNode.parentId;
  const storyId = originalNode.storyId;
  
  // 获取父节点信息
  let parent = null;
  let depth = 0;
  let path = '';
  let order = 0;
  
  if (finalParentId) {
    parent = await this.findById(finalParentId);
    if (parent) {
      depth = parent.depth + 1;
      path = parent.path ? `${parent.path},${parent._id}` : parent._id.toString();
      
      // 获取同级节点的最大order值
      const maxOrder = await this.findOne({ 
        parentId: finalParentId, 
        storyId: storyId 
      }).sort({ order: -1 }).select('order');
      
      order = maxOrder ? maxOrder.order + 1 : 0;
    }
  } else {
    // 根节点
    const maxOrder = await this.findOne({ 
      parentId: null, 
      storyId: storyId 
    }).sort({ order: -1 }).select('order');
    
    order = maxOrder ? maxOrder.order + 1 : 0;
  }
  
  // 复制节点基本信息
  const newNode = new this({
    storyId: storyId,
    parentId: finalParentId,
    title: `${originalNode.title} (复制)`,
    content: originalNode.content,
    type: originalNode.type,
    description: originalNode.description,
    choices: originalNode.choices.map(choice => ({
      id: new mongoose.Types.ObjectId().toString(),
      text: choice.text,
      description: choice.description,
      targetNodeId: null, // 不复制目标节点绑定
      tempTargetNodeId: null,
      autoCreate: choice.autoCreate
    })),
    position: {
      x: originalNode.position.x + 50, // 稍微偏移一点，避免重叠
      y: originalNode.position.y + 50
    },
    depth: depth,
    path: path,
    order: order
  });
  
  await newNode.save();
  return newNode;
};

// 静态方法：调整节点顺序
storyNodeSchema.statics.reorderNodes = async function(storyId, nodeOrders) {
  if (!storyId || !mongoose.Types.ObjectId.isValid(storyId)) {
    throw new Error('无效的storyId');
  }
  
  if (!Array.isArray(nodeOrders)) {
    throw new Error('nodeOrders参数必须是数组');
  }
  
  // 批量更新节点顺序
  for (const { nodeId, newOrder } of nodeOrders) {
    if (!nodeId || !mongoose.Types.ObjectId.isValid(nodeId)) {
      continue;
    }
    
    await this.updateOne(
      { _id: nodeId, storyId: storyId },
      { $set: { order: newOrder } }
    );
  }
  
  return true;
};

// 静态方法：搜索节点
storyNodeSchema.statics.searchNodes = async function(storyId, keyword, options = {}) {
  if (!storyId || !mongoose.Types.ObjectId.isValid(storyId)) {
    throw new Error('无效的storyId');
  }
  
  if (!keyword || keyword.trim().length === 0) {
    return [];
  }
  
  const { limit = 20, offset = 0, searchInContent = true } = options;
  
  // 构建搜索查询
  const searchQuery = {
    storyId: storyId,
    $or: [
      { title: { $regex: keyword, $options: 'i' } }
    ]
  };
  
  // 如果需要搜索内容
  if (searchInContent) {
    searchQuery.$or.push({ content: { $regex: keyword, $options: 'i' } });
    searchQuery.$or.push({ description: { $regex: keyword, $options: 'i' } });
  }
  
  // 执行搜索
  const nodes = await this.find(searchQuery)
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit)
    .populate('parentId', 'title')
    .populate('choices.targetNodeId', 'title');
  
  return nodes;
};

// 中间件：保存前验证
storyNodeSchema.pre('save', async function(next) {
  // 检查循环引用
  if (this.parentId) {
    const parent = await this.constructor.findById(this.parentId);
    if (parent && await parent.isAncestorOf(this._id)) {
      return next(new Error('不能创建循环引用'));
    }
  }
  
  // 验证choice类型节点必须有选项
  if (this.type === 'choice' && (!this.choices || this.choices.length === 0)) {
    return next(new Error('choice类型节点必须至少有一个选项'));
  }
  
  next();
});

module.exports = mongoose.model('StoryNode', storyNodeSchema);