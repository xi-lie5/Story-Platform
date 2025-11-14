# 改进的故事生成系统API设计

## 问题分析

通过分析现有代码，我发现以下关键问题：

1. **节点关系问题**：当前实现中，故事节点的分支选项需要引用已存在节点的ID，但在故事创作过程中，节点是分步创建的，导致在创建主节点时分支节点可能还不存在。

2. **画布交互支持不足**：前端使用画布来展示和连接节点，但当前API没有专门支持图状结构数据管理的功能。

3. **数据关联处理复杂**：节点之间的关系管理需要多次API调用，增加了前端实现复杂度。

## 改进的API结构设计

### 1. 数据模型改进

#### StorySection模型改进
- 添加临时ID(temporaryId)字段，用于在创建过程中引用
- 改进choices结构，支持引用临时ID和真实ID
- 添加visualPosition字段，支持画布位置信息

```javascript
// StorySection模型改进示例
const StorySectionSchema = new mongoose.Schema({
  storyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Story', required: true },
  temporaryId: { type: String }, // 临时ID，用于创建过程中的引用
  order: { type: Number, required: true },
  type: { type: String, enum: ['text', 'choice'], default: 'text' },
  title: { type: String },
  text: { type: String, required: true },
  choices: [{
    text: { type: String, required: true },
    nextSectionRef: { type: String, required: true }, // 可以是临时ID或真实ID
    nextSectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'StorySection' } // 真实ID，创建后更新
  }],
  isEnd: { type: Boolean, default: false },
  visualPosition: { x: Number, y: Number }, // 画布位置信息
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
```

### 2. 改进的API端点

#### 故事管理API

##### 获取故事列表
```
GET /api/v1/stories
```
参数：
- page: 页码，默认1
- limit: 每页数量，默认9
- sort: 排序方式(latest/popular/rating)，默认latest
- category: 分类名称
- search: 搜索关键词

##### 获取故事详情
```
GET /api/v1/stories/:storyId
```
参数：
- storyId: 故事ID

##### 创建故事
```
POST /api/v1/stories
```
请求体：
```json
{
  "title": "故事标题",
  "categoryId": "分类ID",
  "description": "故事简介",
  "coverImage": "封面图片URL"
}
```

##### 更新故事
```
PUT /api/v1/stories/:storyId
```
参数：
- storyId: 故事ID

请求体：
```json
{
  "title": "新标题",
  "categoryId": "新分类ID",
  "description": "新简介",
  "coverImage": "新封面图片URL"
}
```

##### 删除故事
```
DELETE /api/v1/stories/:storyId
```
参数：
- storyId: 故事ID

#### 故事章节管理API

##### 获取故事章节列表
```
GET /api/v1/stories/:storyId/sections
```
参数：
- storyId: 故事ID

##### 获取单个章节
```
GET /api/v1/stories/:storyId/sections/:sectionId
```
参数：
- storyId: 故事ID
- sectionId: 章节ID

##### 创建章节
```
POST /api/v1/stories/:storyId/sections
```
请求体：
```json
{
  "temporaryId": "临时ID", // 可选，用于创建过程中的引用
  "order": 1,
  "type": "choice", // 或 "text"
  "title": "章节标题",
  "text": "章节内容",
  "choices": [
    {
      "text": "选项文本",
      "nextSectionRef": "引用的临时ID或节点ID"
    }
  ],
  "isEnd": false,
  "visualPosition": { "x": 100, "y": 150 }
}
```

##### 更新章节
```
PUT /api/v1/stories/:storyId/sections/:sectionId
```
参数：
- storyId: 故事ID
- sectionId: 章节ID

请求体：
```json
{
  "order": 2,
  "type": "choice",
  "title": "新标题",
  "text": "新内容",
  "choices": [
    {
      "text": "新选项",
      "nextSectionRef": "新引用"
    }
  ],
  "isEnd": false,
  "visualPosition": { "x": 200, "y": 250 }
}
```

##### 删除章节
```
DELETE /api/v1/stories/:storyId/sections/:sectionId?adjustOrder=true
```
参数：
- storyId: 故事ID
- sectionId: 章节ID
- adjustOrder: 是否调整后续章节顺序，默认true

#### 新增：批量章节操作API

##### 批量创建章节（解决节点关系问题的核心API）
```
POST /api/v1/stories/:storyId/sections/batch
```
请求体：
```json
{
  "sections": [
    {
      "temporaryId": "node1",
      "order": 1,
      "type": "choice",
      "title": "开始",
      "text": "你来到了一个岔路口...",
      "choices": [
        {
          "text": "向左走",
          "nextSectionRef": "node2"
        },
        {
          "text": "向右走",
          "nextSectionRef": "node3"
        }
      ],
      "visualPosition": { "x": 100, "y": 100 }
    },
    {
      "temporaryId": "node2",
      "order": 2,
      "type": "text",
      "title": "左边的路",
      "text": "你选择了左边的路，发现了一个神秘的洞穴...",
      "visualPosition": { "x": 50, "y": 200 }
    },
    {
      "temporaryId": "node3",
      "order": 3,
      "type": "text",
      "title": "右边的路",
      "text": "你选择了右边的路，遇到了一位老人...",
      "visualPosition": { "x": 150, "y": 200 }
    }
  ]
}
```

返回值：
```json
{
  "success": true,
  "message": "批量创建章节成功",
  "data": {
    "sections": [
      {
        "id": "60d5e4f4...", // MongoDB生成的真实ID
        "temporaryId": "node1",
        // 其他字段...
      },
      // 其他章节...
    ],
    "idMapping": {
      "node1": "60d5e4f4...",
      "node2": "60d5e4f5...",
      "node3": "60d5e4f6..."
    }
  }
}
```

##### 更新节点关系
```
PUT /api/v1/stories/:storyId/sections/connections
```
请求体：
```json
{
  "connections": [
    {
      "fromSectionId": "章节ID",
      "choiceIndex": 0, // 选项索引
      "toSectionId": "目标章节ID"
    }
  ]
}
```

#### 新增：画布数据API

##### 获取故事画布数据
```
GET /api/v1/stories/:storyId/canvas
```
参数：
- storyId: 故事ID

返回值：
```json
{
  "success": true,
  "data": {
    "nodes": [
      {
        "id": "章节ID",
        "title": "章节标题",
        "type": "text|choice",
        "isEnd": false,
        "position": { "x": 100, "y": 100 }
      }
    ],
    "edges": [
      {
        "source": "源章节ID",
        "target": "目标章节ID",
        "label": "选项文本"
      }
    ]
  }
}
```

##### 更新画布布局
```
PUT /api/v1/stories/:storyId/canvas/layout
```
请求体：
```json
{
  "nodePositions": [
    {
      "sectionId": "章节ID",
      "position": { "x": 100, "y": 100 }
    }
  ]
}
```

### 3. 故事阅读API

##### 获取故事开始章节
```
GET /api/v1/stories/:storyId/start
```
参数：
- storyId: 故事ID

返回值：
```json
{
  "success": true,
  "data": {
    "id": "章节ID",
    "title": "章节标题",
    "text": "章节内容",
    "type": "choice",
    "choices": [
      {
        "id": "选项ID",
        "text": "选项文本",
        "nextSectionId": "目标章节ID"
      }
    ],
    "isEnd": false
  }
}
```

##### 获取下一个章节
```
GET /api/v1/stories/:storyId/sections/:currentSectionId/next?choiceId=选项ID
```
参数：
- storyId: 故事ID
- currentSectionId: 当前章节ID
- choiceId: 选择的选项ID

## 实现关键点

1. **临时ID映射机制**：在批量创建API中，服务端需要维护临时ID到真实MongoDB ObjectId的映射，并在创建完成后更新所有引用关系。

2. **事务支持**：批量操作必须使用数据库事务，确保所有节点和关系要么全部创建成功，要么全部失败。

3. **引用关系验证**：在更新引用关系时，必须验证目标节点是否存在且属于同一故事。

4. **画布数据优化**：返回给前端的画布数据应该经过优化，只包含必要的信息，减少数据传输量。

## 错误码设计

| 错误码 | 错误信息 | 说明 |
|-------|---------|------|
| 10001 | 请求参数错误 | 输入验证失败 |
| 10010 | 故事不存在 | 找不到指定的故事 |
| 10011 | 章节不存在或不属于该故事 | 找不到指定的章节或章节不属于该故事 |
| 10012 | 分类不存在 | 找不到指定的分类 |
| 10020 | 没有权限修改此故事章节 | 用户不是故事作者 |
| 10030 | 节点引用关系错误 | 引用的节点不存在或无效 |
| 10031 | 循环引用错误 | 故事节点形成了循环引用 |

## 前端集成建议

1. **画布交互流程**：
   - 前端维护节点和连接的临时数据结构
   - 使用临时ID引用尚未保存的节点
   - 批量保存时调用`/api/v1/stories/:storyId/sections/batch`
   - 使用返回的ID映射更新本地数据结构

2. **故事阅读流程**：
   - 开始阅读时调用`/api/v1/stories/:storyId/start`
   - 用户做出选择后调用`/api/v1/stories/:storyId/sections/:currentSectionId/next?choiceId=选项ID`

3. **错误处理**：
   - 统一处理API错误，特别是节点引用错误
   - 提供友好的错误提示和恢复机制

## 性能优化考虑

1. **索引优化**：在StorySection集合上为storyId和temporaryId字段创建索引
2. **批量操作**：尽量使用批量API减少网络请求次数
3. **数据缓存**：缓存频繁访问的故事和章节数据
4. **分页加载**：画布数据量大时考虑分页加载策略