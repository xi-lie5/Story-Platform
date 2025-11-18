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
    required: [true, '节点内容必填'],
    trim: true
  },
  type: {
    type: String,
    required: [true, '节点类型必填'],
    enum: ['normal', 'choice', 'ending', 'branch'],
    default: 'normal'
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
  },
  statistics: {
    viewCount: {
      type: Number,
      default: 0
    },
    avgReadTime: {
      type: Number,
      default: 0
    }
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
  return this.path.includes(nodeId.toString());
};

// 静态方法：获取故事树
storyNodeSchema.statics.getStoryTree = async function(storyId, options = {}) {
  const nodes = await this.find({ storyId })
    .sort({ depth: 1, order: 1 })
    .lean();
  
  // 构建树状结构
  const nodeMap = {};
  const roots = [];
  
  // 创建节点映射
  nodes.forEach(node => {
    nodeMap[node._id] = { 
      ...node, 
      children: [],
      // 确保choices数组存在
      choices: node.choices || []
    };
  });
  
  // 构建树 - 通过choices.targetNodeId建立连接
  nodes.forEach(node => {
    const currentNode = nodeMap[node._id];
    
    // 通过choices数组查找子节点
    if (currentNode.choices && currentNode.choices.length > 0) {
      currentNode.choices.forEach(choice => {
        if (choice.targetNodeId && nodeMap[choice.targetNodeId]) {
          // 将目标节点添加为子节点
          if (!currentNode.children.find(child => child._id.toString() === choice.targetNodeId.toString())) {
            currentNode.children.push(nodeMap[choice.targetNodeId]);
          }
        }
      });
    }
    
    // 如果没有parentId，则为根节点
    if (!node.parentId) {
      roots.push(currentNode);
    }
  });
  
  return roots.length > 0 ? roots[0] : null;
};

// 静态方法：处理节点保存后的关系绑定和自动创建
storyNodeSchema.statics.processNodeRelations = async function(nodes, storyId) {
  const nodeMap = {};
  const createdNodes = [];
  
  // 第一阶段：保存所有节点，建立临时ID映射
  for (const nodeData of nodes) {
    const node = new this({
      ...nodeData,
      storyId
    });
    
    // 处理choices中的临时关系
    if (node.choices && node.choices.length > 0) {
      node.choices = node.choices.map(choice => ({
        ...choice,
        targetNodeId: null, // 先清空，第二阶段再处理
        tempTargetNodeId: choice.tempTargetNodeId || choice.targetNodeId?.toString() || null
      }));
    }
    
    await node.save();
    nodeMap[nodeData.tempId || nodeData._id?.toString()] = node._id.toString();
    createdNodes.push(node);
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
        
        // 自动创建分支节点
        if (choice.autoCreate && !choice.targetNodeId) {
          const branchNode = new this({
            storyId,
            parentId: node._id,
            title: `分支：${choice.text}`,
            content: '', // 分支节点不需要内容
            type: 'branch', // 新的分支节点类型
            order: i,
            depth: node.depth + 1,
            path: node.path ? `${node.path},${node._id}` : node._id.toString(),
            position: {
              x: node.position.x + 200, // 在父节点右侧
              y: node.position.y + (i * 100) // 垂直排列
            }
          });
          
          await branchNode.save();
          choice.targetNodeId = branchNode._id;
          choice.autoCreate = false;
          needsUpdate = true;
        }
      }
    }
    
    if (needsUpdate) {
      await node.save();
    }
  }
  
  return createdNodes;
};
storyNodeSchema.statics.createChild = async function(parentId, nodeData) {
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
  
  // 如果父节点不是choice类型，并且提供了choiceText，自动添加一个选项
  if (parent.type !== 'choice' && nodeData.choiceText) {
    const choiceId = new mongoose.Types.ObjectId().toString();
    parent.choices.push({
      id: choiceId,
      text: nodeData.choiceText,
      targetNodeId: child._id
    });
    await parent.save();
  }
  
  return child;
};

// 静态方法：删除节点及其子节点
storyNodeSchema.statics.deleteSubtree = async function(nodeId) {
  const node = await this.findById(nodeId);
  if (!node) {
    throw new Error('节点不存在');
  }
  
  // 递归删除所有子节点
  const children = await this.find({ parentId: nodeId });
  for (const child of children) {
    await this.deleteSubtree(child._id);
  }
  
  // 从父节点中移除相关选项
  if (node.parentId) {
    await this.updateOne(
      { _id: node.parentId },
      { $pull: { choices: { targetNodeId: nodeId } } }
    );
  }
  
  // 删除节点
  return await this.findByIdAndDelete(nodeId);
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