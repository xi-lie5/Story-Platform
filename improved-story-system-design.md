# 改进的故事生成系统API设计

## 一、问题分析

### 1. 主要技术问题

通过分析前端和后端代码，发现故事生成系统存在以下核心问题：

1. **临时ID与MongoDB ObjectId映射问题**
   - 前端使用临时ID (`Date.now().toString().slice(-6)`) 创建和连接节点
   - 后端直接使用MongoDB ObjectId作为节点标识符
   - 导致分支节点在创建时无法引用尚未创建的目标节点

2. **节点关系处理缺陷**
   - 当前模型设计在保存时无法处理节点之间的引用关系
   - 缺少节点连接的批量处理机制
   - 前端保存分支时使用 `to: null` 作为占位符，无法维护完整的图结构

3. **数据同步机制不完善**
   - 前端依赖本地存储 (`localStorage`) 保存图谱数据
   - 后端API缺少对整个故事图谱的批量操作支持
   - 没有完整的节点位置信息存储和管理

4. **编辑器与查看器交互不一致**
   - 编辑模式关注节点和连接
   - 阅读模式关注章节和选项
   - 两种模式的数据结构需要统一处理

### 2. 现有系统流程分析

**当前前端工作流：**
1. 创建临时节点ID
2. 保存节点内容和分支选项（分支的目标节点设为null）
3. 在图谱中手动连接节点
4. 尝试将节点数据保存到后端，但无法处理节点间的引用关系

**当前后端数据模型：**
1. `Story` 模型：存储故事基本信息
2. `StorySection` 模型：存储章节内容，通过 `choices` 数组中的 `nextSectionId` 引用下一个章节
3. 缺少处理临时引用和图谱结构的机制

## 二、数据模型改进设计

### 1. 修改 StorySection 模型

```javascript
const storySectionSchema = new mongoose.Schema({
  storyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Story',
    required: [true, '故事ID必填'],
    index: true
  },
  // 新增：用于前端临时ID映射
  temporaryId: {
    type: String,
    index: true
  },
  type: {
    type: String,
    required: [true, '章节类型必填'],
    enum: ['text', 'choice', 'normal', 'ending'],  // 扩展支持前端使用的类型
    default: 'text'
  },
  order: {
    type: Number,
    required: [true, '章节顺序必填'],
    min: 1
  },
  title: {
    type: String,  // 新增：节点标题
    default: '未命名节点'
  },
  text: {
    type: String,
    required: [true, '章节文本必填']
  },
  // 新增：节点在画布上的位置信息
  visualPosition: {
    x: {
      type: Number,
      default: 0
    },
    y: {
      type: Number,
      default: 0
    }
  },
  choices: [{
    text: {
      type: String,
      required: [true, '选项文本必填']
    },
    // 新增：支持临时ID引用
    nextTemporaryId: {
      type: String
    },
    nextSectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StorySection',
      required: false
    }
  }],
  isEnd: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// 保留原有索引
storySectionSchema.index(
  { storyId: 1, order: 1 },
  { unique: true, message: '同一故事内章节顺序不能重复' }
);

// 新增：临时ID索引，用于映射查找
storySectionSchema.index(
  { storyId: 1, temporaryId: 1 },
  { sparse: true }
);
```

### 2. 新增 StoryConnection 模型（可选）

如果需要更复杂的图结构管理，可以考虑新增专门的连接模型：

```javascript
const storyConnectionSchema = new mongoose.Schema({
  storyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Story',
    required: [true, '故事ID必填'],
    index: true
  },
  fromId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StorySection',
    required: [true, '起始节点ID必填']
  },
  fromTemporaryId: {
    type: String
  },
  toId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StorySection',
    required: false
  },
  toTemporaryId: {
    type: String
  },
  description: {
    type: String,
    required: [true, '连接描述必填']
  },
  // 连接的样式属性
  style: {
    color: {
      type: String,
      default: '#007bff'
    },
    thickness: {
      type: Number,
      default: 2
    }
  }
}, {
  timestamps: true
});
```

## 三、改进的API结构设计

### 1. 节点相关API

#### 1.1 创建单个节点

```
POST /api/v1/sections/:storyId
```

**请求体：**
```json
{
  "temporaryId": "123456",  // 前端生成的临时ID
  "title": "新节点",
  "type": "normal",
  "order": 1,
  "text": "节点内容",
  "visualPosition": { "x": 100, "y": 200 },
  "choices": [
    {
      "text": "选择A",
      "nextTemporaryId": "654321"  // 引用目标节点的临时ID
    }
  ],
  "isEnd": false
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "id": "mongodb-object-id",
    "temporaryId": "123456",
    "title": "新节点"
  }
}
```

#### 1.2 批量保存节点和连接

```
POST /api/v1/sections/:storyId/batch
```

**请求体：**
```json
{
  "nodes": [
    {
      "temporaryId": "123456",
      "title": "节点1",
      "type": "normal",
      "text": "内容1",
      "visualPosition": { "x": 100, "y": 100 },
      "isEnd": false
    },
    {
      "temporaryId": "654321",
      "title": "节点2",
      "type": "normal",
      "text": "内容2",
      "visualPosition": { "x": 200, "y": 200 },
      "isEnd": true
    }
  ],
  "connections": [
    {
      "from": "123456",  // 临时ID
      "to": "654321",    // 临时ID
      "description": "前往节点2"
    }
  ]
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "createdNodes": [
      { "temporaryId": "123456", "id": "mongodb-id-1" },
      { "temporaryId": "654321", "id": "mongodb-id-2" }
    ],
    "mappings": {  // 临时ID到MongoDB ID的映射
      "123456": "mongodb-id-1",
      "654321": "mongodb-id-2"
    }
  }
}
```

#### 1.3 更新节点连接

```
PUT /api/v1/sections/:storyId/connections
```

**请求体：**
```json
{
  "mappings": {
    "123456": "mongodb-id-1",  // 临时ID到MongoDB ID的映射
    "654321": "mongodb-id-2"
  }
}
```

**响应：**
```json
{
  "success": true,
  "message": "节点连接已更新",
  "data": {
    "updatedCount": 2
  }
}
```

### 2. 图谱数据API

#### 2.1 获取完整故事图谱

```
GET /api/v1/stories/:storyId/graph
```

**响应：**
```json
{
  "success": true,
  "data": {
    "nodes": [
      {
        "id": "mongodb-id",
        "temporaryId": "123456",
        "title": "节点标题",
        "content": "节点内容",
        "type": "normal",
        "position": { "x": 100, "y": 200 },
        "isEnd": false
      }
      // 更多节点...
    ],
    "connections": [
      {
        "from": "mongodb-id-1",
        "to": "mongodb-id-2",
        "description": "选项描述"
      }
      // 更多连接...
    ]
  }
}
```

#### 2.2 保存完整故事图谱

```
PUT /api/v1/stories/:storyId/graph
```

**请求体：**
```json
{
  "nodes": [...],  // 完整的节点数组
  "connections": [...]  // 完整的连接数组
}
```

**响应：**
```json
{
  "success": true,
  "message": "故事图谱已保存",
  "data": {
    "updatedNodes": 5,
    "updatedConnections": 8,
    "mappings": {}
  }
}
```

### 3. 阅读模式相关API

#### 3.1 获取故事章节（按阅读顺序）

```
GET /api/v1/stories/:storyId/chapters
```

**响应：**
```json
{
  "success": true,
  "data": {
    "chapters": [
      {
        "id": "mongodb-id",
        "text": "章节内容",
        "choices": [
          {
            "text": "选择A",
            "nextChapterId": "next-chapter-id"
          }
        ],
        "isEnd": false
      }
    ]
  }
}
```

## 四、实现关键点

### 1. 临时ID映射机制

```javascript
// 批量保存节点时的ID映射处理
async function processNodesWithMappings(nodes, storyId) {
  // 创建临时ID到MongoDB ID的映射
  const idMappings = {};
  
  // 第一阶段：保存所有节点，只存储临时引用
  for (const nodeData of nodes) {
    const section = new StorySection({
      storyId,
      temporaryId: nodeData.temporaryId,
      title: nodeData.title,
      type: nodeData.type,
      text: nodeData.text,
      visualPosition: nodeData.visualPosition,
      choices: nodeData.choices || [],
      isEnd: nodeData.isEnd || false,
      // order可以后续计算或由前端提供
      order: nodeData.order || 0
    });
    
    await section.save();
    idMappings[nodeData.temporaryId] = section._id.toString();
  }
  
  // 第二阶段：更新所有节点的连接引用
  for (const nodeData of nodes) {
    const section = await StorySection.findOne({
      storyId,
      temporaryId: nodeData.temporaryId
    });
    
    // 更新choices中的nextSectionId
    if (section && section.choices.length > 0) {
      for (const choice of section.choices) {
        if (choice.nextTemporaryId && idMappings[choice.nextTemporaryId]) {
          choice.nextSectionId = idMappings[choice.nextTemporaryId];
        }
      }
      
      await section.save();
    }
  }
  
  return idMappings;
}
```

### 2. 事务处理

```javascript
// 使用MongoDB事务确保数据一致性
async function saveStoryGraph(storyId, nodes, connections) {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // 先删除现有章节
    await StorySection.deleteMany({ storyId }).session(session);
    
    // 创建映射
    const idMappings = {};
    
    // 保存节点
    for (const node of nodes) {
      const section = new StorySection({
        storyId,
        temporaryId: node.temporaryId,
        title: node.title,
        type: node.type,
        text: node.text,
        visualPosition: node.visualPosition,
        isEnd: node.isEnd || false,
        order: node.order || 0,
        choices: []  // 初始为空，后续更新
      });
      
      await section.save({ session });
      idMappings[node.temporaryId] = section._id.toString();
    }
    
    // 更新连接
    for (const connection of connections) {
      const fromSection = await StorySection.findOne({
        storyId,
        temporaryId: connection.from
      }).session(session);
      
      if (fromSection) {
        fromSection.choices.push({
          text: connection.description,
          nextSectionId: idMappings[connection.to] || null,
          nextTemporaryId: connection.to
        });
        
        await fromSection.save({ session });
      }
    }
    
    await session.commitTransaction();
    return { success: true, mappings: idMappings };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
```

### 3. 前端集成修改

```javascript
// 前端批量保存图谱数据
async function saveEntireGraph(storyId, graphData) {
  try {
    const response = await fetch(`/api/v1/sections/${storyId}/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nodes: Object.values(graphData.nodes),
        connections: graphData.connections
      })
    });
    
    const result = await response.json();
    if (result.success) {
      // 更新本地存储中的ID映射
      updateLocalIdsWithMappings(graphData, result.data.mappings);
      return result.data.mappings;
    }
    
    throw new Error('保存失败');
  } catch (error) {
    console.error('保存图谱失败', error);
    throw error;
  }
}

// 更新本地数据的ID映射
function updateLocalIdsWithMappings(graphData, mappings) {
  // 这里可以更新本地存储的数据，但为了简化，我们可以在下次加载时处理
  // 或者直接使用临时ID进行本地操作
}
```

## 五、错误处理和边界情况

### 1. 错误码设计

| 错误码 | 错误类型 | 描述 |
|--------|----------|------|
| 10001  | VALIDATION_ERROR | 数据验证失败 |
| 10010  | NOT_FOUND | 故事或章节不存在 |
| 10011  | PERMISSION_DENIED | 没有权限操作 |
| 10015  | MAPPING_ERROR | ID映射失败 |
| 10016  | CIRCULAR_REFERENCE | 检测到循环引用 |
| 10017  | GRAPH_INTEGRITY_ERROR | 图谱完整性错误 |

### 2. 边界情况处理

1. **循环引用检测**：保存前检测节点连接是否形成环
2. **孤立节点处理**：支持保存没有入边或出边的节点
3. **批量操作限制**：对批量保存操作设置合理的数量限制
4. **事务回滚**：确保批量操作的原子性
5. **部分更新**：支持只更新部分节点和连接

## 六、性能优化考虑

1. **索引优化**：为常用查询添加合适的索引
2. **批量操作**：使用批量写入API减少数据库操作次数
3. **缓存机制**：对故事图谱数据进行缓存
4. **读写分离**：考虑对阅读和编辑操作使用不同的数据库策略
5. **数据分区**：大型故事可考虑按章节ID范围进行分区

## 七、前端与后端交互流程

### 1. 故事编辑流程

1. **创建新故事**：调用现有API创建故事基本信息
2. **初始化图谱**：创建起始节点，使用临时ID
3. **编辑节点内容**：更新节点文本、标题等信息
4. **创建分支连接**：为节点添加分支，引用目标节点的临时ID
5. **批量保存**：调用批量保存API，一次性提交所有节点和连接
6. **更新引用**：使用返回的ID映射更新本地数据结构

### 2. 故事读取流程

1. **获取故事信息**：调用现有API获取故事基本信息
2. **获取章节内容**：根据当前章节ID获取内容和选项
3. **选择分支**：用户选择选项后，根据nextSectionId获取下一章节

## 八、总结

通过以上改进设计，我们解决了故事生成系统中的核心问题：

1. **临时ID映射机制**：允许前端在创建节点时建立完整的引用关系
2. **批量操作API**：支持一次性保存多个节点和连接，减少网络请求
3. **图谱数据模型**：完善的数据模型支持节点位置和关系的完整管理
4. **事务保证**：使用数据库事务确保数据一致性

这些改进将显著提升故事生成系统的用户体验，使作者能够更加自由地创建复杂的交互式故事，同时保持数据的完整性和一致性。