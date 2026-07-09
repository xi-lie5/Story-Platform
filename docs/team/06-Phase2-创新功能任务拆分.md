# Phase 2 — 创新功能任务拆分

> 周期：5 周 | 前置条件：Phase 1 完成（测试 CI 通过、前端统一、迁移系统就绪）

---

## 📌 实施状态总览（2026-07 更新）

本次迭代按「做完低难度 + 评论评分，砍掉高难度桑基图与 AI 生成/模板」的范围推进，实际落地情况如下：

| 模块 | 状态 | 说明 |
|------|------|------|
| P2-1 评论 & 书评 | ✅ 已完成 | 后端 API 齐全；阅读器/详情页评论区、AI 广场星级评分均已接入 |
| P2-2 故事导出 | ✅ 已完成 | PDF/EPUB 后端就绪；`story-reader.html` 增加导出下拉并触发下载 |
| P2-3 阅读分析 | ✅ 核心完成（桑基图除外） | 埋点链路打通、分析页可达、卡片展示阅读数据；**桑基图本期不做**，以柱状图 + 完成率环图 + 路径流向列表替代 |
| P2-4 AI 工作坊增强 | 🟡 部分完成 | 氛围标签选中态、自定义标签、去 `setTimeout` hack 已完成；**AI 生成角色/大纲/试运行、故事模板本期不做** |

**本期明确不做（已评估为高/中难度、性价比低）：**
- ❌ P2-3.4 节点跳转桑基图（Chart.js 原生不支持，需额外插件/D3 + 复杂数据聚合）
- ❌ P2-4.3~4.8 AI 生成角色 / 生成大纲 / 试运行预览（后端 DeepSeek 新接口 + 前端交互）
- ❌ P2-4.9~4.10 故事模板数据与模板选择

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

- [x] **P2-1.1 创建 `story_comments` 表**
  - 迁移文件：`backend/migrations/006_add_comments.sql`
  - 表结构见 [数据库文档](04-数据库Schema与迁移指南.md#21-story_comments评论)

- [x] **P2-1.2 实现评论 API**
  - `GET /stories/:storyId/comments?page=1&limit=20&nodeId=uuid` — 评论列表（公开，`stories.js`）
  - `POST /stories/:storyId/comments` — 发表评论（可绑定 nodeId，需登录，`stories.js`）
  - `DELETE /comments/:id` — 删除评论（作者/管理员，`comments.js`）
  - 模型：`backend/models/StoryComment.js`

- [x] **P2-1.3 评分 + 评论整合**
  - `POST /interactions/stories/:storyId/rate` 支持可选 `comment` 字段（`interactions.js`）
  - 评分带评论时自动创建一条 `story_comments` 记录

### 前端任务

- [x] **P2-1.4 阅读器底部评论区**
  - `story-reader.html`：正文/导航下方新增「读者评论」区（列表 + 发表表单 + 分页「加载更多」+ 删除自己的评论）
  - `ai-story-reader.html`：工具栏新增「评论」按钮，弹出暗色评论弹窗（列表 + 发表 + 删除 + 分页）

- [x] **P2-1.5 故事详情页评论区**
  - `story-reader.html` 评论区按时间倒序分页加载，登录后可发表，自己的/管理员可删除
  - 临时故事（`local_` 前缀）自动提示不支持评论

- [x] **P2-1.6 AI 广场详情模态框加评分**
  - `ai-stories.html` 的 `showDetail` 模态框在「开始冒险」按钮上方加入 5 星评分组件
  - 新增后端支撑：迁移 `009_add_config_ratings.sql`（`ai_config_ratings` 表）+ `POST /aiStory/configs/:id/rate`、`GET /aiStory/configs/:id/rating`，并在 `GET /aiStory/configs/:id` 返回 `avgRating`/`ratingCount`

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

- [x] **P2-2.1 实现 PDF 导出**
  - `GET /stories/:storyId/export?format=pdf`（`stories.js` + `utils/storyExport`）
  - 输出内容：封面标题 + 作者 + 所有节点内容 + 分支选项标注

- [x] **P2-2.2 实现 EPUB 导出**
  - `GET /stories/:storyId/export?format=epub`
  - 每个节点一个章节 + 目录

- [x] **P2-2.3 导出按钮 UI**
  - `story-reader.html` 头部工具栏新增「导出」下拉：PDF | EPUB
  - 携带 Authorization 以 fetch 取 blob，点击后触发浏览器下载，含 loading 态

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

- [x] **P2-3.1 创建 `story_read_events` 表**
  - 迁移文件：`backend/migrations/007_add_read_events.sql`

- [x] **P2-3.2 在阅读路径中埋点**
  - `ai-story-reader.html`：`loadSession()` 记录进入节点，`selectChoice()` 记录 from→to 跳转及所选行动
  - `story-reader.html`：根节点进入 + `handleChoice()` 选择跳转均记录
  - 统一调用 `POST /stories/:storyId/read-events`（登录用户，失败静默）

- [x] **P2-3.3 实现分析 API**
  - `GET /stories/:storyId/analytics`（仅作者/管理员，`stories.js`）
  - 聚合 `story_read_events`：总跳转、独立读者、完成率、热门选择、路径流向（`models/StoryReadEvent.js`）

### 前端任务

- [x] **P2-3.4 作者仪表板页面**（桑基图除外）
  - `front/analytics.html` 使用 Chart.js 渲染：热门选择柱状图 + 完成率环形图 + 路径流向列表
  - `my_stories.html` 每张作品卡片新增「数据分析」入口按钮跳转此页
  - ❌ 节点跳转桑基图（Sankey）**本期不做**：Chart.js 原生不支持，需额外插件/D3 + 复杂聚合，改由「路径流向列表」呈现读者选择流向

- [x] **P2-3.5 故事卡片嵌入分析数据**
  - `my_stories.html` 卡片展示总阅读数（view）+ 平均评分；完成率等细项通过「数据分析」入口查看

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
- [x] **P2-4.1** 改为选中态：`.tag.selected` 高亮（靛蓝底 + 边框 + `✓` 前缀），默认全部未选中由用户主动挑选
- [x] **P2-4.2** 新增自定义标签输入框（输入 + 回车/按钮添加新标签，可删除），并抽出 `getSelectedMoods()`/`applyMoodTags()` 统一采集与回填

### 问题 2: 角色工坊无 AI 辅助 —— ❌ 本期不做

> 评估为中难度（后端新增 DeepSeek 接口 + 前端交互），本期范围外，暂不实现。

- [ ] **P2-4.3 后端 API:** `POST /aiStory/generate-characters`（本期不做）
- [ ] **P2-4.4 前端 UI:** Step 3「AI 生成角色」按钮（本期不做）

### 问题 3: 大纲文本框无 AI 辅助 —— ❌ 本期不做

- [ ] **P2-4.5 后端 API:** `POST /aiStory/generate-outline`（本期不做）
- [ ] **P2-4.6 前端 UI:** Step 4「AI 生成大纲」按钮（本期不做）

### 问题 4: 保存前无法预览 AI 质量 —— ❌ 本期不做

- [ ] **P2-4.7 后端 API:** `POST /aiStory/preview`（本期不做）
- [ ] **P2-4.8 前端 UI:** Step 5「试运行」按钮（本期不做）

### 问题 5: 缺乏故事模板 —— ❌ 本期不做

- [ ] **P2-4.9 创建模板数据文件** `front/assets/js/templates.js`（本期不做）
- [ ] **P2-4.10 工作坊首页增加模板选择**（本期不做）

### 问题 6: 编辑模式 `setTimeout` hack

**当前:** `loadConfigForEdit()` 曾用 `setTimeout(..., 500)` 等分类异步加载
**修复:**
- [x] **P2-4.11** 初始化改为 `loadCategories().then(...)` 后再进入编辑回填，去除 `setTimeout` 猜测加载时机；氛围标签回填改用 `applyMoodTags()`

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

- [x] 评论系统：读者可在故事处发评论，作者/管理员可删（阅读器 + AI 广场）
- [x] 故事导出：PDF 和 EPUB 文件可正常下载
- [x] 阅读分析：作者可见仪表板（热门选择 + 完成率 + 路径流向）；桑基图以列表替代（本期不做）
- [x] 氛围标签有明确选中/未选中视觉反馈，并支持自定义标签
- [x] 编辑模式无 `setTimeout` hack
- [ ] AI 工作坊：模板选择 → AI 角色生成 → AI 大纲 → 试运行（**本期不做，留待后续**）
- [ ] 全部新增 API 有 CI 测试覆盖（评论/导出/分析/config 评分接口尚需补测）
- [ ] 浏览器测试：14 个页面无 JS 错误（建议回归验证）
