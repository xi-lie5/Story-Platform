# 故事数据结构设计方案

## 核心概念

### 1. 故事节点 (StoryNode)
每个节点代表故事的一个场景或段落，具有以下属性：
- `id`: 唯一标识符
- `parentId`: 父节点ID（根节点为null）
- `storyId`: 所属故事ID
- `title`: 节点标题
- `content`: 节点内容
- `type`: 节点类型（normal, choice, ending）
- `order`: 在同级节点中的顺序
- `choices`: 选项列表（仅choice类型节点）
- `position`: 可视化坐标（用于图谱显示）

### 2. 选项 (Choice)
每个选项包含：
- `id`: 选项ID
- `text`: 选项显示文本
- `targetNodeId`: 目标节点ID（创建时可为null，后续绑定）

### 3. 故事树结构
```
Story Root (ID: root)
├── Chapter 1 (ID: node1)
│   ├── Choice A → Chapter 2A (ID: node2)
│   └── Choice B → Chapter 2B (ID: node3)
├── Chapter 2A (ID: node2)
│   ├── Continue → Chapter 3A (ID: node4)
│   └── Back → Chapter 1 (ID: node1)
└── Chapter 2B (ID: node3)
    └── Continue → Ending (ID: node5)
```

## 操作流程

### 1. 创建新节点
- 从父节点创建子节点
- 自动建立父子关系
- 为父节点添加对应选项

### 2. 编辑节点
- 编辑内容和选项
- 选项可绑定到已存在的节点
- 或创建新的目标节点

### 3. 删除节点
- 删除节点及其所有子节点
- 自动清理父节点中的相关选项

### 4. 节点连接
- 通过选项建立连接
- 确保每个连接都有对应的选项
- 防止循环引用

## 数据库模型

### StoryNode Schema
```javascript
{
  _id: ObjectId,
  storyId: ObjectId,
  parentId: ObjectId, // 父节点，根节点为null
  title: String,
  content: String,
  type: String, // normal, choice, ending
  order: Number, // 同级排序
  choices: [{
    id: String,
    text: String,
    targetNodeId: ObjectId // 目标节点
  }],
  position: { x: Number, y: Number },
  depth: Number, // 树深度，便于查询
  path: String, // 路径，如 "root/node1/node2"
  createdAt: Date,
  updatedAt: Date
}
```

## API 设计

### 1. 获取故事树
```
GET /api/v1/stories/:storyId/tree
返回: 完整的树状结构
```

### 2. 创建子节点
```
POST /api/v1/stories/:storyId/nodes
{
  parentId: "parent123",
  title: "新章节",
  content: "内容...",
  choiceText: "选择这个选项"
}
```

### 3. 更新节点
```
PUT /api/v1/nodes/:nodeId
{
  title: "更新的标题",
  content: "更新的内容",
  choices: [...]
}
```

### 4. 删除节点
```
DELETE /api/v1/nodes/:nodeId
```

## 前端实现

### 1. story_tree.html
- 显示真实的树状结构
- 右键菜单：添加子节点、编辑、删除
- 拖拽重新排序同级节点
- 自动布局算法

### 2. story_editor.html
- 编辑当前节点内容
- 管理选项和目标节点
- 可视化预览树状结构

## 优势

1. **清晰的结构**：真正的树状关系，易于理解
2. **数据一致性**：通过选项建立连接，避免无效连接
3. **操作简单**：从父节点创建子节点，自动处理关系
4. **扩展性强**：支持复杂的分支和循环结构
5. **性能优化**：通过depth和path字段优化查询