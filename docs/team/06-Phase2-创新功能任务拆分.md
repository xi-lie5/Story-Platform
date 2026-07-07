# Phase 2 — 创新功能任务拆分

> 周期：5 周 | 前置条件：Phase 1 完成（测试 CI 通过、前端统一、迁移系统就绪）

---

## 团队分配

| 模块 | 负责人 | 预估 | 依赖 |
|------|--------|------|------|
| 评论 & 书评 | 后端 A + 前端 A | 3 周 | 故事阅读器 |
| 故事导出 | 后端 B | 2 周 | 故事数据 |
| 阅读分析仪表板 | 后端 A + 前端 B | 2 周 | story_read_events 表 |
| AI 工作坊增强 | 前端 A + 后端 B | 2 周 | AI API |

---

## 模块 P2-1: 📝 评论 & 书评系统

**负责人：** 后端 A（API） + 前端 A（UI）  
**预估：** 3 周

### 后端任务

- [ ] **P2-1.1 创建 `story_comments` 表**
  - 迁移文件：`backend/migrations/006_add_comments.sql`
  - 表结构见 [数据库文档](04-数据库Schema与迁移指南.md#21-story_comments评论)

- [ ] **P2-1.2 实现评论 API**
  - `POST /stories/:storyId/comments` — 发表评论（可绑定 nodeId）
  - `GET /stories/:storyId/comments?page=1&limit=20&nodeId=uuid` — 评论列表
  - `DELETE /comments/:id` — 删除评论（作者/管理员）
  - 验收：使用 API 契约中定义的请求/响应格式

- [ ] **P2-1.3 评分 + 评论整合**
  - 在 `POST /interactions/rating` 中增加可选 `comment` 字段
  - 评分后自动创建一条评论

### 前端任务

- [ ] **P2-1.4 阅读器底部评论区**
  - 位置：`ai-story-reader.html` 和 `story-reader.html` 的 choices panel 上方
  - 显示当前节点的评论（最新 5 条，可展开）
  - 发表评论表单：文字输入 + 提交按钮

- [ ] **P2-1.5 故事详情页评论区**
  - 位置：`story-reader.html` 详情区域下方
  - 分页加载、按时间/热度排序
  - 自己的评论可删除

- [ ] **P2-1.6 AI 广场详情模态框加评分**
  - 位置：`ai-stories.html` 的 `showDetail` 模态框
  - 在"开始冒险"按钮上方添加星级评分组件

### 验收标准

```bash
# 后端
curl -X POST http://localhost:5000/api/v1/stories/1/comments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "好看！","nodeId": "xxx-uuid"}'
# 预期: 201

curl http://localhost:5000/api/v1/stories/1/comments
# 预期: 200, data 数组包含刚才的评论

# 前端
# 打开阅读器 → 滚动到章节末尾 → 看到评论区 → 输入评论 → 发表成功 → 评论显示
```

---

## 模块 P2-2: 📦 故事导出

**负责人：** 后端 B  
**预估：** 2 周

### 任务清单

- [ ] **P2-2.1 实现 PDF 导出**
  - 安装 `pdfkit`
  - `GET /stories/:storyId/export?format=pdf`
  - 输出内容：封面标题 + 作者 + 所有节点内容（按阅读顺序）+ 分支选项标注
  - 中文字体支持（使用系统自带或内嵌字体）

- [ ] **P2-2.2 实现 EPUB 导出**
  - 安装 `epub-gen`
  - `GET /stories/:storyId/export?format=epub`
  - 每个节点一个章节
  - 生成目录（TOC）和分支路径附录

- [ ] **P2-2.3 导出按钮 UI**
  - 位置：`story-reader.html` 工具栏
  - 下拉选择导出格式：PDF | EPUB
  - 点击后显示 loading，完成后触发浏览器下载

### 验收标准

```bash
curl -o story.pdf "http://localhost:5000/api/v1/stories/1/export?format=pdf" \
  -H "Authorization: Bearer $TOKEN"
file story.pdf  # 预期: PDF document

curl -o story.epub "http://localhost:5000/api/v1/stories/1/export?format=epub" \
  -H "Authorization: Bearer $TOKEN"
file story.epub  # 预期: EPUB document
```

---

## 模块 P2-3: 🎯 阅读分析仪表板

**负责人：** 后端 A（API） + 前端 B（图表）  
**预估：** 2 周

### 后端任务

- [ ] **P2-3.1 创建 `story_read_events` 表**
  - 迁移文件：`backend/migrations/007_add_read_events.sql`
  - 表结构见 [数据库文档](04-数据库Schema与迁移指南.md#22-story_read_events阅读埋点)

- [ ] **P2-3.2 在阅读路径中埋点**
  - 在 `AI 故事阅读器` 的 `selectChoice()` 中：记录 from_node_id → to_node_id 跳转
  - 在 `手动故事阅读器` 的节点切换中：同样记录
  - 数据一层：插入 `story_read_events` 表

- [ ] **P2-3.3 实现分析 API**
  - `GET /stories/:storyId/analytics`（仅作者）
  - 返回数据格式见 [API 契约](02-API接口契约.md#阅读分析)
  - 查询逻辑：聚合 `story_read_events` 表 + `ai_story_sessions` 表

### 前端任务

- [ ] **P2-3.4 作者仪表板页面**
  - 新页面：`front/analytics.html` 或在 `my_stories.html` 增加"数据分析"入口
  - 使用 Chart.js CDN 渲染图表：
    - 节点跳转桑基图（Sankey diagram）— 展示读者选择流向
    - 完成率漏斗 — 从根节点到终章的比例
    - 热门选项排行 — 每个分支选项被选的次数

- [ ] **P2-3.5 故事卡片嵌入分析数据**
  - 在 `my_stories.html` 每个故事卡片展示：总阅读数、完成率百分比

### 验收标准

```bash
# 1. 多人阅读同一故事后
curl http://localhost:5000/api/v1/stories/1/analytics \
  -H "Authorization: Bearer $AUTHOR_TOKEN"
# 预期: 200, data.total_reads > 0, data.path_flow 有数据

# 2. 前端
# 打开 my_stories → 点击"数据分析" → 看到图表（非空态）
```

---

## 模块 P2-4: 🔧 AI 工作坊增强

**负责人：** 前端 A + 后端 B  
**预估：** 2 周

> 当前问题清单基于实际代码：

### 问题 1: 氛围标签交互不直观

**当前:** `initMoodTags()` 通过 `classList.toggle('opacity-40')` 切换——用户反馈"看不到自由文本输入框"
**修复:**
- [ ] **P2-4.1** 改为选中态：`background: rgba(99,102,241,0.4); border: 1px solid var(--accent); content: "✓"`
- [ ] **P2-4.2** 添加自定义标签输入框（输入 + 回车添加新标签）

### 问题 2: 角色工坊无 AI 辅助

**当前:** 纯手动填写表单（`addCharacter()` 创建空卡片）
**修复:**
- [ ] **P2-4.3 后端 API:** `POST /aiStory/generate-characters`
  - 输入：`{ title, worldSetting }`
  - 调用 DeepSeek 生成 2-3 个角色建议
  - 返回：`[{ name, personality_tags, description }]`

- [ ] **P2-4.4 前端 UI:** 在 Step 3 添加"AI 生成角色"按钮
  - 点击后显示 loading
  - AI 返回后展示角色卡片（带"采纳"和"放弃"按钮）
  - 采纳的角色自动添加到 `characters` 数组

### 问题 3: 大纲文本框无 AI 辅助

- [ ] **P2-4.5 后端 API:** `POST /aiStory/generate-outline`
  - 输入：`{ title, worldSetting, characters }`
  - 调用 DeepSeek 生成关键情节点建议
  - 返回：`{ outline: "大纲文本..." }`

- [ ] **P2-4.6 前端 UI:** 在 Step 4 大纲框上方添加"AI 生成大纲"按钮
  - 生成的内容填充到 `#storyOutline` textarea

### 问题 4: 保存前无法预览 AI 质量

- [ ] **P2-4.7 后端 API:** `POST /aiStory/preview`
  - 输入：完整配置对象（同 `POST /aiStory/config`）
  - 调用 DeepSeek 生成 ~300 字样本
  - 返回：`{ sample: "样本文字..." }`

- [ ] **P2-4.8 前端 UI:** 在 Step 5 添加"试运行"按钮
  - 点击后展示 ~300 字 AI 样本
  - 用户根据样本决定保存配置还是返回修改

### 问题 5: 缺乏故事模板

- [ ] **P2-4.9 创建模板数据文件**
  - 文件：`front/assets/js/templates.js`
  - 6 个模板：科幻、奇幻、悬疑、爱情、恐怖、历史
  - 每个模板包含：`{ name, icon, worldSetting, moodTags, tone, sampleOutline }`

- [ ] **P2-4.10 工作坊首页增加模板选择**
  - Step 1 开头显示 6 个模板卡片
  - 选择一个模板 → 自动填充世界观、氛围标签、风格
  - 提供"空白开始"选项

### 问题 6: 编辑模式 `setTimeout` hack

**当前:** `loadConfigForEdit()` 在第 262 行用 `setTimeout(..., 500)` 等分类异步加载
**修复:**
- [ ] **P2-4.11** `loadCategories()` 返回 Promise → `loadConfigForEdit()` 用 `.then()` 或 `await`

### 验收标准

```bash
# AI 生成角色
curl -X POST http://localhost:5000/api/v1/aiStory/generate-characters \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"测试","worldSetting":"赛博朋克世界"}'
# 预期: 200, data 数组包含 2-3 个角色对象

# 前端
# 打开 ai-workshop.html → Step 2 氛围标签选中态有视觉反馈（非 opacity）
# → Step 3 点击"AI 生成角色"→ 看到角色建议 → 采纳 → 角色卡片显示
# → Step 4 点击"AI 生成大纲"→ 大纲文字出现在 textarea
# → Step 5 点击"试运行"→ 看到 AI 生成的 ~300 字样本
# → Step 1 选择模板"科幻"→ 世界观自动填充
```

---

## 时间线

```
Week 1-2:
  后端A:   P2-1.1 ~ P2-1.3 (评论 API)
  前端A:   P2-4.1 ~ P2-4.11 (AI 工作坊全部前端)
  后端B:   P2-2.1 ~ P2-2.2 (PDF + EPUB 导出)
  前端B:   P2-3.4 (开始分析仪表板 UI 设计)

Week 3:
  后端A:   P2-3.1 ~ P2-3.2 (阅读埋点)
  前端A:   P2-1.4 ~ P2-1.6 (评论 UI)
  后端B:   P2-4.3 ~ P2-4.7 (AI 工作坊后端 API)
  前端B:   P2-3.5 (分析嵌入故事卡片)

Week 4-5:
  后端A+B: 联调、修复、性能优化
  前端A+B: 联调、修复、浏览器兼容
  全员:    代码审查 + 集成测试 + 文档更新
```

---

## Phase 2 完成标志

- [ ] 评论系统：读者可在节点/故事处发评论，作者可删
- [ ] 故事导出：PDF 和 EPUB 文件可正常下载和打开
- [ ] 阅读分析：作者可见仪表板、完成率漏斗、选择热力图
- [ ] AI 工作坊：模板选择 → AI 角色生成 → AI 大纲 → 试运行 → 保存，全部流畅
- [ ] 氛围标签有明确选中/未选中视觉反馈
- [ ] 编辑模式无 `setTimeout` hack
- [ ] 全部新增 API 有 CI 测试覆盖
- [ ] 浏览器测试：14 个页面无 JS 错误
