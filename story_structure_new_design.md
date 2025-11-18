# 故事树状结构设计方案

## 问题分析

当前故事创建逻辑存在以下问题：

1. **节点顺序混乱**：节点按平铺顺序排列，没有体现树状层次关系
2. **分支关系不清晰**：节点连接需要手动设置，缺乏父子关系的自动管理
3. **数据结构不合理**：使用order字段线性排列，无法表达真正的树状结构

## 新的数据结构设计

### 1. 核心概念

- **StoryNode**: 故事节点，包含内容和位置信息
- **Choice**: 选项，连接父节点到子节点
- **Tree**: 树状结构，体现故事的分支走向

### 2. 数据模型

#### StoryNode 模型
```javascript
{
  _id: ObjectId,
  storyId: ObjectId,           // 所属故事
  parentId: ObjectId,          // 父节点ID（根节点为null）
  title: String,               // 节点标题
  content: String,             // 节点内容
  type: String,                // 节点类型：normal, choice, ending
  order: Number,               // 同级节点中的排序
  depth: Number,               // 节点深度（根节点为0）
  position: {                  // 可视化位置
    x: Number,
    y: Number
  },
  choices: [{                  // 从此节点出发的选项
    id: String,
    text: String,
    targetNodeId: ObjectId     // 目标节点ID
  }],
  isDeleted: Boolean,          // 软删除标记
  createdAt: Date,
  updatedAt: Date
}
```

### 3. 树状操作流程

#### 创建节点流程
1. **创建根节点**：parentId = null, depth = 0
2. **添加子节点**：
   - 通过父节点的"添加子节点"功能
   - 自动设置parentId和depth
   - 自动创建选项连接父节点到子节点
3. **添加选项**：
   - 在节点上添加选项
   - 选项可以连接到现有节点或创建新节点

#### 数据一致性保证
- 每个节点只有一个父节点（除根节点）
- 选项自动维护父子关系
- 删除节点时自动处理子节点

### 4. API设计

```javascript
// 获取故事树
GET /api/v1/stories/:storyId/tree
// 返回完整的树状结构

// 创建根节点
POST /api/v1/stories/:storyId/root
// 创建故事的第一个节点

// 创建子节点
POST /api/v1/stories/:storyId/nodes
// parentId, title, content, choiceText

// 更新节点
PUT /api/v1/nodes/:nodeId
// 更新节点内容和选项

// 删除节点
DELETE /api/v1/nodes/:nodeId
// 删除节点及其子树

// 移动节点
PUT /api/v1/nodes/:nodeId/move
// newParentId, newOrder
```

### 5. 前端实现

#### story_tree.html 功能
- **树状可视化**：使用SVG绘制连接线
- **右键菜单**：编辑、添加子节点、添加选项、删除
- **拖拽排序**：同级节点可以拖拽调整顺序
- **自动布局**：算法计算节点位置

#### story_editor.html 功能
- **节点编辑**：编辑当前节点内容
- **选项管理**：添加/编辑/删除选项
- **分支预览**：显示当前节点在树中的位置

### 6. 数据同步策略

#### 本地存储
- 编辑时先保存到localStorage
- 定期或手动同步到后端
- 支持离线编辑

#### 后端同步
- 使用事务保证数据一致性
- 批量操作减少请求次数
- 冲突检测和解决

### 7. 实现步骤

1. **创建新的StoryNode模型**
2. **实现树状API接口**
3. **重构story_tree.html界面**
4. **修改story_editor.html逻辑**
5. **数据迁移和测试**

### 8. 优势

- **清晰的层次结构**：真正的树状关系，易于理解
- **自动化的连接管理**：选项自动维护父子关系
- **灵活的编辑方式**：支持多种创建和编辑操作
- **良好的用户体验**：直观的可视化界面
- **数据一致性**：严格的数据模型保证