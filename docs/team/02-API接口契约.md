# StoryForge API 接口契约

> 前后端分界线。所有端点、请求/响应格式均来自 `backend/routes/` 下的真实代码。
> 前端只能消费这些端点，后端必须严格按此格式返回。

**Base URL:** `http://localhost:5000/api/v1`

**通用规则：**
- 需认证的端点：请求头带 `Authorization: Bearer <token>`
- 响应格式：`{ success: boolean, message: string, data?: any, pagination?: object }`
- 错误格式：`{ success: false, message: string, errors?: array, code: number, timestamp: string }`

---

## 一、认证模块 — `routes/auth.js`

### `POST /auth/register`
```json
// 请求体
{ "username": "string (3-30)", "email": "email", "password": "string (≥8)", "confirmPassword": "string" }
// 响应 201
{ "success": true, "message": "注册成功", "data": { "userId": 1, "username": "...", "email": "...", "avatar": "...", "token": "jwt...", "refreshToken": "jwt..." } }
// 错误 400: "用户名已存在" / "邮箱已存在" / "参数错误"
```

### `POST /auth/login`
```json
// 请求体
{ "email": "email", "password": "string" }
// 响应 200
{ "success": true, "message": "登录成功", "data": { "userId": 1, "username": "...", "email": "...", "avatar": "...", "role": "user|admin", "token": "jwt...", "refreshToken": "jwt..." } }
// 错误 400: "邮箱或密码错误" / "账户已被锁定"
```

### `POST /auth/refresh`
```json
// 请求头: Authorization: Bearer <refreshToken>
// 响应 200
{ "success": true, "message": "Token刷新成功", "data": { "token": "jwt...", "refreshToken": "jwt..." } }
```

### `POST /auth/logout`
```json
// 请求头: Authorization: Bearer <token>
// 响应 200
{ "success": true, "message": "登出成功" }
```

---

## 二、故事模块 — `routes/stories.js`

### `GET /stories`
```json
// 查询参数: ?page=1&limit=9&category=&search=&sort=latest
// 响应 200
{ "success": true, "data": { "stories": [{ "id": 1, "title": "...", "author_name": "...", "cover_image": "...", "description": "...", "category_name": "...", "view_count": 0, "rating": 0.0, "created_at": "..." }], "pagination": { "page": 1, "limit": 9, "total": 100, "pages": 12 } } }
```

### `GET /stories/public`
```json
// 查询参数: ?page=1&limit=12&sort=newest
// 响应 200 — 格式同 GET /stories
```

### `GET /stories/:storyId`
```json
// 响应 200
{ "success": true, "data": { "id": 1, "title": "...", "author": { "id": 1, "username": "...", "avatar": "..." }, "category": { "id": 1, "name": "..." }, "nodes": [...], "branches": [...], "characters": [...] } }
```

### `POST /stories`
```json
// 请求体 (需认证)
{ "title": "string", "description": "string", "categoryId": 1, "coverImage": "string (url)" }
// 响应 201
{ "success": true, "message": "创建故事成功", "data": { "id": 1, ... } }
```

### `PUT /stories/:storyId`
```json
// 请求体 — 同 POST，需认证 + 作者权限
// 响应 200
{ "success": true, "message": "更新故事成功", "data": { ... } }
```

### `DELETE /stories/:storyId`
```json
// 需认证 + 作者权限
// 响应 200
{ "success": true, "message": "删除故事成功" }
```

### `PATCH /stories/:storyId/submit`
```json
// 提交审核，需认证 + 作者权限
// 响应 200
{ "success": true, "message": "提交审核成功" }
```

### `PATCH /stories/:storyId/complete`
```json
// 标记完成，需认证 + 作者权限
// 响应 200
{ "success": true, "message": "故事标记为完成" }
```

### `PATCH /stories/:storyId/unpublish`
```json
// 取消发布，需认证 + 作者权限
// 响应 200
{ "success": true, "message": "取消发布成功" }
```

---

## 三、AI 故事模块 — `routes/aiStory.js`（12 个端点）

### Section 1: 规则书配置

### `POST /aiStory/config`
```json
// 请求体 (需认证)
{ "title": "string", "worldSetting": "string", "startPrompt": "string",
  "outline": "string (可选)", "moodTags": ["黑暗","紧张"], "characters": [
    { "name": "角色名", "personality_tags": ["标签1"], "description": "描述", "relationships": {} }
  ], "style": { "narrative": "第三人称", "tone": "自然流畅", "length": "800-1500字/段" },
  "category_id": 1, "description": "string (可选)" }
// 响应 201
{ "success": true, "message": "规则书创建成功", "data": { "id": "uuid", "title": "..." } }
```

### `PUT /aiStory/config/:id`
```json
// 请求体 — 所有字段均可选，需认证 + 作者权限，id 为 UUID
// 响应 200
{ "success": true, "message": "规则书更新成功", "data": { ... } }
```

### `GET /aiStory/configs`
```json
// 查询参数: ?page=1&limit=12&category=1&search=keyword
// 无需认证（公开广场）
// 响应 200
{ "success": true, "data": [{ "id": "uuid", "title": "...", "author_name": "...", "author_avatar": "...", "world_setting": "...", "mood_tags": [...], "characters_config": [...], "style": {...}, "view_count": 0, "total_sessions": 0 }], "pagination": { "page": 1, "limit": 12, "total": 10, "pages": 1 } }
```

### `GET /aiStory/configs/my`
```json
// 查询参数: ?status=draft|published|unpublished|all
// 需认证
// 响应 200
{ "success": true, "data": [{ "id": "uuid", "title": "...", "status": "draft", "total_sessions": 0, "created_at": "..." }], "pagination": {...} }
```

### `GET /aiStory/configs/:id`
```json
// 无需认证（公开详情），id 为 UUID
// 响应 200
{ "success": true, "data": { "id": "uuid", "title": "...", "author_name": "...", "world_setting": "...", "start_prompt": "...", "outline": "...", "style": { "narrative": "...", "tone": "...", "length": "..." }, "mood_tags": [...], "characters_config": [{ "name": "...", "personality_tags": [...], "description": "..." }], "status": "published", "total_sessions": 5, "view_count": 120 } }
```

### `PATCH /aiStory/configs/:id/publish`
```json
// 请求体 (需认证 + 作者权限)
{ "action": "publish" | "unpublish" }
// 响应 200
{ "success": true, "message": "发布成功" | "下架成功", "data": { ... } }
```

### `DELETE /aiStory/configs/:id`
```json
// 需认证 + 作者权限，id 为 UUID，级联删除关联 sessions
// 响应 200
{ "success": true, "message": "规则书已删除" }
```

### Section 2: 游戏会话

### `POST /aiStory/configs/:id/start`
```json
// 需认证，id 为 UUID。调用 DeepSeek AI 生成第一章
// 响应 201
{ "success": true, "message": "冒险开始", "data": { "storyId": 18, "configId": "uuid", "rootNodeId": "uuid", "title": "第一章标题", "content": "第一章内容...", "choices": [{ "id": "uuid", "nodeId": "uuid", "text": "选项文本", "hint": "提示" }], "totalNodes": 3 } }
// 耗时: ~10-60秒（AI 生成）
```

### `POST /aiStory/story/:storyId/generate`
```json
// 请求体 (需认证)
{ "nodeId": "当前节点UUID", "choice": "用户选择的文本或自由输入" }
// 响应 200
{ "success": true, "message": "AI 续写成功", "data": { "nodeId": "新节点UUID", "title": "续章标题", "content": "续写内容...", "choices": [...], "totalNodes": 5 } }
// 耗时: ~10-60秒（AI 生成）
```

### `GET /aiStory/story/:storyId/session`
```json
// 需认证，storyId 为整数
// 响应 200
{ "success": true, "data": { "session": { "totalNodes": 5, "summary": "..." }, "currentNode": { "id": "uuid", "title": "节点标题", "content": "节点内容...", "type": "regular" }, "storyId": 18 } }
```

### `GET /aiStory/sessions`
```json
// 查询参数: ?page=1&limit=10
// 需认证
// 响应 200
{ "success": true, "data": [{ "id": 1, "story_id": 18, "current_node_id": "uuid", "total_nodes": 5, "story_title": "...", "updated_at": "..." }], "pagination": {...} }
```

### `DELETE /aiStory/sessions/:id`
```json
// 需认证，id 为整数
// 响应 200
{ "success": true, "message": "会话已删除" }
```

---

## 四、分支模块 — `routes/branches.js`

### `GET /branches/nodes/:nodeId/branches/outgoing`
```json
// 需认证
// 响应 200
{ "success": true, "data": [{ "id": "uuid", "source_node_id": "uuid", "target_node_id": "uuid", "context": "选项文本" }] }
```

### `POST /stories/:storyId/branches`
```json
// 需认证 + 作者权限
{ "sourceNodeId": "uuid", "targetNodeId": "uuid", "context": "选项文本" }
// 响应 201
{ "success": true, "data": { ... } }
```

---

## 五、分类模块 — `routes/categories.js`

### `GET /categories`
```json
// 响应 200
{ "success": true, "data": [{ "id": 1, "name": "科幻", "description": "...", "story_count": 5 }] }
```

### `POST /categories` — 管理员
### `PUT /categories/:id` — 管理员
### `DELETE /categories/:id` — 管理员

---

## 六、用户交互模块 — `routes/interactions.js`

### `POST /interactions/favorite`
```json
// 需认证
{ "storyId": 1 }
// 响应 201
{ "success": true, "message": "收藏成功" }
```

### `DELETE /interactions/favorite/:storyId`
```json
// 需认证
// 响应 200
{ "success": true, "message": "取消收藏成功" }
```

### `GET /interactions/favorites`
```json
// 需认证
// 响应 200
{ "success": true, "data": [{ "story_id": 1, "title": "...", ... }] }
```

### `POST /interactions/rating`
```json
// 需认证
{ "storyId": 1, "rating": 4 }
// 响应 201
{ "success": true, "message": "评分成功" }
```

---

## 七、管理员模块 — `routes/admin.js`

### `GET /admin/stats` — 系统统计
### `GET /admin/stories` — 所有故事管理
### `PUT /admin/stories/:id/review` — 审核故事
### `PUT /admin/stories/:id/publish` — 发布故事
### `PUT /admin/stories/:id/unpublish` — 下架故事
### `DELETE /admin/stories/:id` — 删除故事
### `GET /admin/users` — 用户管理列表
### `PUT /admin/users/:userId/status` — 禁用/解禁用户
### `PUT /admin/users/:userId/reset-password` — 重置密码
### `DELETE /admin/users/:userId` — 删除用户

---

## 八、新增端点契约（Phase 2 开发前必须对齐）

以下端点为 Phase 2 新增，前后端开发前必须在此确认。

### 评论系统

### `POST /stories/:storyId/comments`
```json
// 需认证
{ "content": "string", "nodeId": "uuid (可选，绑定到特定节点)" }
// 响应 201
{ "success": true, "data": { "id": 1, "user": { "id": 1, "username": "...", "avatar": "..." }, "content": "...", "node_id": "uuid|null", "created_at": "..." } }
```

### `GET /stories/:storyId/comments`
```json
// 查询参数: ?page=1&limit=20&nodeId=uuid (可选，筛选节点评论)
// 响应 200
{ "success": true, "data": [...], "pagination": {...} }
```

### `DELETE /comments/:id`
```json
// 需认证 + 作者/管理员权限
// 响应 200
{ "success": true, "message": "评论已删除" }
```

### 故事导出

### `GET /stories/:storyId/export`
```json
// 查询参数: ?format=pdf|epub
// 需认证（任意登录用户即可）
// 响应 200: 文件流 (Content-Type: application/pdf 或 application/epub+zip)
```

### 阅读分析

### `GET /stories/:storyId/analytics`
```json
// 需认证 + 作者权限
// 响应 200
{ "success": true, "data": { "total_reads": 100, "unique_readers": 45, "completion_rate": 0.6, "choice_distribution": [{ "node_id": "uuid", "node_title": "...", "count": 30 }, ...], "path_flow": [{ "from": "nodeId", "to": "nodeId", "count": 25 }, ...] } }
```

### AI 工作坊增强

### `POST /aiStory/generate-characters`
```json
// 需认证
{ "title": "string", "worldSetting": "string" }
// 响应 200（调用 AI）
{ "success": true, "data": [{ "name": "...", "personality_tags": [...], "description": "..." }] }
```

### `POST /aiStory/generate-outline`
```json
// 需认证
{ "title": "string", "worldSetting": "string", "characters": [...] }
// 响应 200（调用 AI）
{ "success": true, "data": "大纲文本..." }
```

### `POST /aiStory/preview`
```json
// 需认证
// 请求体同 POST /aiStory/config
// 响应 200（调用 AI 生成 ~300 字样本）
{ "success": true, "data": { "sample": "样本文字..." } }
```

---

## 九、错误代码速查

| 代码 | 含义 |
|------|------|
| 10001 | 参数错误 |
| 10002 | 资源不存在 |
| 10003 | 权限不足 |
| 10006 | 未认证 / 认证无效 |
| 10010 | 故事 ID 无效 |
| 10013 | 服务器内部错误 |
| 10020 | 节点 ID 无效 |
| 10022 | 分支创建失败 |
