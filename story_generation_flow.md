# 故事生成完整流程设计

## 1. 流程概述

### 1.1 用户故事
用户想要创建一个交互式故事，包含多个节点、选择分支和不同结局。

### 1.2 核心功能
- 创建新故事
- 添加和编辑节点
- 设置选择分支
- 预览和测试故事流程
- 发布故事

## 2. 详细流程步骤

### 步骤1: 创建新故事
**页面**: `story_list_new.html` 或专门的创建页面
**API**: `POST /api/stories`

```javascript
// 创建故事请求
{
  title: "我的冒险故事",
  description: "一个充满选择的冒险故事",
  category: "冒险",
  isPublic: false,
  status: "draft"
}
```

**响应**:
```javascript
{
  success: true,
  data: {
    id: "story_id_123",
    title: "我的冒险故事",
    // ... 其他故事信息
  }
}
```

### 步骤2: 创建根节点
**页面**: 自动跳转到 `story_editor_new.html`
**API**: `POST /api/story-nodes/stories/{storyId}/root`

```javascript
// 创建根节点请求
{
  title: "故事开始",
  content: "你站在一个十字路口，面前有两条路..."
}
```

### 步骤3: 添加选择节点
**页面**: `story_editor_new.html`
**操作**: 在根节点上右键 → "添加选择"

**后端自动处理**:
1. 创建选择节点
2. 创建对应的分支节点
3. 建立父子关系

**API调用序列**:
```javascript
// 1. 创建选择节点
POST /api/story-nodes/stories/{storyId}/nodes
{
  parentId: "root_node_id",
  title: "选择你的道路",
  content: "你要选择哪条路？",
  type: "choice",
  choices: [
    { text: "左边的路", autoCreate: true },
    { text: "右边的路", autoCreate: true }
  ]
}

// 2. 自动创建分支节点（后端处理）
// 为每个autoCreate=true的选项创建对应的branch节点
```

### 步骤4: 编辑分支内容
**页面**: `story_editor_new.html`
**操作**: 点击树状视图中的分支节点进行编辑

**API**: `PUT /api/story-nodes/nodes/{nodeId}`
```javascript
{
  title: "左边的道路",
  content: "你选择了左边的路，发现了一座神秘的房子...",
  type: "branch"
}
```

### 步骤5: 添加更多选择和分支
**操作**: 重复步骤3-4，构建完整的故事树

### 步骤6: 设置结局节点
**操作**: 在最终节点上设置类型为 "ending"

```javascript
{
  title: "冒险结束",
  content: "你成功完成了冒险！",
  type: "ending"
}
```

### 步骤7: 预览和测试
**页面**: `story_player_new.html`
**API**: `GET /api/story-nodes/stories/{storyId}/tree`

### 步骤8: 发布故事
**API**: `PUT /api/stories/{storyId}`
```javascript
{
  status: "published",
  isPublic: true
}
```

## 3. 范例故事创建

### 3.1 故事结构
```
根节点: "森林的开始"
├── 选择节点: "你要去哪里？"
    ├── 选项1: "深入森林" → 分支节点1
    │   ├── 选择节点: "发现小屋"
    │   │   ├── 选项1: "敲门" → 结局1
    │   │   └── 选项2: "绕过" → 分支节点2
    │   └── 选项2: "返回" → 结局2
    └── 选项2: "留在原地" → 结局3
```

### 3.2 具体实现步骤

#### 第1步: 创建故事
```javascript
// 调用创建故事API
const story = await createStory({
  title: "森林冒险",
  description: "一个关于选择的简单冒险故事",
  category: "冒险"
});
```

#### 第2步: 创建根节点
```javascript
const rootNode = await createRootNode(story.id, {
  title: "森林的开始",
  content: "你站在一片茂密森林的入口，阳光透过树叶洒下斑驳的光影。你感到既兴奋又紧张，因为你知道这片森林中充满了未知的选择和冒险。"
});
```

#### 第3步: 创建第一个选择节点
```javascript
const choiceNode1 = await createChoiceNode(story.id, rootNode.id, {
  title: "你要去哪里？",
  content: "面对着神秘的森林，你需要做出第一个选择。这个选择将决定你的冒险方向。",
  choices: [
    { text: "深入森林", autoCreate: true },
    { text: "留在原地", autoCreate: true }
  ]
});
```

#### 第4步: 编辑分支节点内容
```javascript
// 编辑"深入森林"分支
await updateNode(branchNode1_id, {
  title: "深入森林",
  content: "你鼓起勇气踏入了森林深处。周围越来越暗，但你听到了远处传来的奇怪声音...",
  type: "branch"
});

// 编辑"留在原地"分支
await updateNode(branchNode2_id, {
  title: "留在原地",
  content: "你决定在原地观察。很快，你发现了一条小径，通向森林的另一个方向。你的冒险以一种平静的方式结束了。",
  type: "ending"
});
```

#### 第5步: 继续构建故事树
```javascript
// 在"深入森林"节点添加更多选择
const choiceNode2 = await createChoiceNode(story.id, branchNode1_id, {
  title: "发现小屋",
  content: "在森林深处，你发现了一座神秘的小屋。烟囱里冒着烟，看起来有人居住。",
  choices: [
    { text: "敲门", autoCreate: true },
    { text: "绕过", autoCreate: true }
  ]
});
```

## 4. 关键技术实现

### 4.1 节点关系管理
- 使用 `parentId` 建立树状结构
- 使用 `choices.targetNodeId` 连接选择和目标节点
- 自动维护 `depth` 和 `path` 字段

### 4.2 自动创建逻辑
```javascript
// 在创建选择节点时，为autoCreate=true的选项自动创建分支节点
async function createChoiceNode(storyId, parentId, data) {
  const choiceNode = await StoryNode.create({
    storyId,
    parentId,
    ...data,
    type: 'choice'
  });
  
  // 为每个需要自动创建的选项创建分支节点
  for (const choice of data.choices) {
    if (choice.autoCreate) {
      const branchNode = await StoryNode.create({
        storyId,
        parentId: choiceNode.id,
        title: choice.text,
        content: '',
        type: 'branch',
        choiceText: choice.text
      });
      
      // 更新选择的目标节点ID
      choice.targetNodeId = branchNode.id;
    }
  }
  
  choiceNode.choices = data.choices;
  await choiceNode.save();
  
  return choiceNode;
}
```

### 4.3 树状视图更新机制
```javascript
// 使用localStorage进行跨页面通信
function notifyTreeUpdate(action, data) {
  const notification = {
    type: 'story_data_change',
    action: action,
    data: data,
    storyId: currentStoryId,
    timestamp: Date.now()
  };
  
  localStorage.setItem('story_data_notification', JSON.stringify(notification));
}

// 在树状视图页面监听更新
window.addEventListener('storage', (e) => {
  if (e.key === 'story_data_notification') {
    const notification = JSON.parse(e.newValue);
    if (notification.storyId === currentStoryId) {
      refreshTree();
    }
  }
});
```

## 5. 错误处理和验证

### 5.1 数据验证
- 标题不能为空
- 内容长度限制
- 选择节点必须有至少一个选项
- 避免循环引用

### 5.2 错误恢复
- 自动保存草稿
- 操作撤销功能
- 网络错误重试机制

## 6. 性能优化

### 6.1 前端优化
- 懒加载节点内容
- 虚拟滚动大型故事树
- 缓存节点数据

### 6.2 后端优化
- 数据库索引优化
- 分页加载节点列表
- 缓存故事树结构

## 7. 测试计划

### 7.1 单元测试
- 节点创建和更新
- 选择关系绑定
- 树状结构生成

### 7.2 集成测试
- 完整故事创建流程
- 多用户协作编辑
- 大型故事性能测试

### 7.3 用户测试
- 新手用户引导测试
- 复杂故事编辑测试
- 移动端适配测试