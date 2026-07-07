# Phase 1 — 地基工程任务拆分

> 周期：3 周 | 目标：代码质量、一致性、测试达到可并行开发基准

---

## 团队分配

| 角色 | 负责 |
|------|------|
| 前端 A | 前端模块化重构（主） + AI 工作坊增强（Phase 2） |
| 前端 B | 前端模块化重构（配合） + 主题统一 + 阅读分析前端（Phase 2） |
| 后端 A | 数据库迁移系统 + 错误处理统一 + 评论 API（Phase 2） |
| 后端 B | 测试框架 + CI + 安全加固 + 导出功能（Phase 2） |

---

## 模块 P1-1: 前端模块化重构

**负责人：** 前端 A + 前端 B  
**预估：** 2 周  
**依赖：** 无

### 任务清单

- [ ] **P1-1.1 创建 `utils.js`**
  - 文件：`front/assets/js/utils.js`
  - 从 `auth.js` 提取 `escapeHtml`（字符串版）
  - 从 `ai-stories.html` 提取 `showToast`、`escHtml`、`getAvatar`
  - 新增 `formatDate`、`truncate`
  - 验收：`typeof window.Utils.escapeHtml === 'function'`

- [ ] **P1-1.2 创建 `components.js`**
  - 文件：`front/assets/js/components.js`
  - `renderLoading(message)` — 统一加载动画
  - `renderEmpty(icon, message, actionText, actionUrl)` — 统一空态
  - `renderError(message, retryFn)` — 统一错误 + 重试
  - `renderPagination(current, total, goPageFn)` — 统一分页
  - 验收：每个函数返回有效 HTML 字符串

- [ ] **P1-1.3 增强 `navbar.js`**
  - 当前硬编码了导航链接字符串。改为接受 `config` 对象
  - 新增 `highlightCurrentPage()` 自动高亮当前页面
  - 深色/浅色两种模式（默认深色）
  - 验收：所有 14 个 HTML 页面使用同一套 `navbar.js`，不需要手写导航 HTML

- [ ] **P1-1.4 全局替换 `escapeHtml`**
  - 替换文件：`ai-story-reader.html`（删除自己的 `escapeHtml`）
  - 替换文件：`ai-stories.html`（删除自己的 `escHtml`）
  - 替换文件：`my_stories.html`（删除自己的 `escapeHtml`）
  - 替换文件：`story-reader.html`（删除自己的 `escapeHtml`）
  - 验收：全项目 `grep -r "function escapeHtml\|function escHtml" front/` 只在 `utils.js` 和 `auth.js`（auth.js 保留其内部版本）

- [ ] **P1-1.5 统一 `my_stories.html` 主题**
  - 当前：独立浅色导航 + Font Awesome 4.7
  - 目标：使用深色主题 + 统一导航栏结构 + Font Awesome 6.0
  - 保留：3-tab 功能（手动创作 / AI 冒险 / AI 规则书）
  - 验收：`my_stories.html` 与其他页面视觉一致

### 验收标准

```bash
# 1. 所有页面共享 utils.js
grep -l "assets/js/utils.js" front/*.html | wc -l  # 预期: ≥10

# 2. escapeHtml 只定义在 utils.js 和 auth.js 内
grep -rn "function escapeHtml\|function escHtml" front/ --include="*.html" | grep -v "utils.js"

# 3. 浏览器 console 无 JS 错误
# 手动验证: 打开每个页面 → F12 → Console → 无红色错误

# 4. 导航栏在所有页面一致
# 手动验证: 浏览所有 14 个页面，导航栏外观和交互一致
```

---

## 模块 P1-2: 数据库迁移系统

**负责人：** 后端 A  
**预估：** 1 周  
**依赖：** 无

### 任务清单

- [ ] **P1-2.1 创建 `_migrations` 追踪表 + `db/migrate.js`**
  - 文件：`backend/db/migrate.js`
  - 自动创建 `_migrations` 表（如不存在）
  - 读取 `backend/migrations/` 目录，按文件名排序
  - 只执行未运行过的迁移
  - 支持 `node db/migrate.js status|migrate|rollback`

- [ ] **P1-2.2 将现有建表 SQL 提取为迁移文件**
  - `001_init_core_tables.sql` — users, categories, stories
  - `002_add_story_nodes.sql` — story_nodes, branches, characters
  - `003_add_interactions.sql` — favorites, ratings, collections
  - `004_add_ai_mode.sql` — ai_stories, ai_story_sessions, ai_story_characters
  - `005_fix_ai_stories_columns.sql` — 补加 description, cover_image, total_sessions, view_count
  - 每个文件包含 `-- UP` 和 `-- DOWN` 部分

- [ ] **P1-2.3 修改 `server.js`**
  - 删除启动时的 `createXxxTable()` 调用
  - 改为 `require('./db/migrate').migrate()`
  - 验收：全新 `docker compose down -v` 后启动，所有表自动创建

- [ ] **P1-2.4 修正 `conn.execute`/`conn.query` 混用**

  > 这是我们在真实测试中踩过的坑。MySQL prepared statement 不支持参数化 `LIMIT ? OFFSET ?`。

  - 全项目搜索：`grep -rn "LIMIT.*OFFSET\|LIMIT ?" backend/ --include="*.js"`
  - 检出所有使用 `conn.execute()` + LIMIT 的代码
  - 修改为 `conn.query()` + 字符串拼接 LIMIT 值（limit/offset 已在代码中 `parseInt` 消毒）
  - 验收：`GET /stories` 等含分页的端点返回 200（不再报 `ER_WRONG_ARGUMENTS`）

### 验收标准

```bash
# 从零重建数据库
docker compose down -v && docker compose up -d
cd backend && node server.js

# 检查迁移状态
node db/migrate.js status
# 预期输出: 所有迁移文件标记为 "executed"

# 检查所有端点无 500 错误
# 运行测试套件: npx vitest run
```

---

## 模块 P1-3: 测试框架 + CI

**负责人：** 后端 B  
**预估：** 1.5 周  
**依赖：** 无

### 任务清单

- [ ] **P1-3.1 安装测试依赖**
  ```bash
  cd backend && npm install --save-dev vitest supertest
  ```

- [ ] **P1-3.2 创建测试基础设施**
  - 文件：`backend/tests/setup.js`
  - 全局 test helper: `createTestUser()`, `loginAs(user)`, `cleanup()`
  - 测试数据库：复用主数据库，但每次测试前清理测试数据

- [ ] **P1-3.3 编写核心 API 测试**

  最低覆盖（每个端点至少 1 happy + 1 error）：

| 模块 | 测试文件 | 最少用例 |
|------|----------|----------|
| 认证 | `tests/auth.test.js` | register + login + refresh + logout (8) |
| 故事 | `tests/stories.test.js` | CRUD + list + submit (10) |
| AI 故事 | `tests/aiStory.test.js` | config CRUD (8) + sessions (4) |
| 分支 | `tests/branches.test.js` | outgoing + create + delete (5) |
| 分类 | `tests/categories.test.js` | list + admin CRUD (5) |

  **总计：≥ 40 个测试用例**

- [ ] **P1-3.4 配置 GitHub Actions CI**
  - 文件：`.github/workflows/ci.yml`
  - 触发：push 到 main / PR 到 main
  - 步骤：checkout → 安装依赖 → 启动 MySQL 服务容器 → 运行迁移 → 跑测试
  - 验收：PR 页面显示 ✅ 或 ❌

- [ ] **P1-3.5 编写前端工具函数测试**
  - 文件：`front/tests/utils.test.js`（用 vitest + jsdom）
  - 测试 `escapeHtml`、`truncate`、`formatDate`
  - 验收：`npx vitest run` 全部通过

### 验收标准

```bash
npx vitest run
# 预期: Tests: 40+ passed, 0 failed
```

---

## 模块 P1-4: 错误处理 + 安全加固

**负责人：** 后端 A（后半段）  
**预估：** 1 周  
**依赖：** 迁移系统完成后

### 任务清单

- [ ] **P1-4.1 统一错误处理中间件审计**
  - 检查所有路由：每个 `async (req, res, next)` 的 catch 块是否调用了 `next(errorFormat(...))`
  - 禁止直接 `res.status(500).json(...)` 或抛出未包装异常
  - 验收：`grep -rn "res.status(500)" backend/routes/` 返回空

- [ ] **P1-4.2 添加请求速率限制**
  - 安装 `express-rate-limit`
  - 登录/注册端点：15 分钟内最多 10 次
  - AI 生成端点：1 分钟内最多 5 次（防止 API 费用暴增）
  - 验收：连续快速请求被 429 拦截

- [ ] **P1-4.3 输入验证补全**
  - 审计所有公开端点是否都有 `express-validator` 校验
  - 重点关注：`GET /aiStory/configs`（✅ 已有）、`GET /stories`（✅ 已有）
  - 验收：所有公开端点都有至少 `query('page').optional().isInt()` 验证

### 验收标准

```bash
# 速率限制测试
for i in $(seq 1 12); do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5000/api/v1/auth/login
done
# 预期: 前 10 个 400, 后 2 个 429
```

---

## 时间线

```
Week 1:
  前端A+B: P1-1.1 ~ P1-1.3 (utils.js, components.js, navbar.js)
  后端A:   P1-2.1 ~ P1-2.2 (迁移系统框架 + 提取 SQL)
  后端B:   P1-3.1 ~ P1-3.2 (测试框架搭建)

Week 2:
  前端A+B: P1-1.4 ~ P1-1.5 (全局替换 + my_stories 统一)
  后端A:   P1-2.3 ~ P1-2.4 (server.js 改造 + execute→query 修复)
  后端B:   P1-3.3 (核心 API 测试编写)

Week 3:
  前端A+B: 修复测试中发现的前端问题 + 代码审查
  后端A:   P1-4.1 ~ P1-4.3 (错误处理 + 安全加固)
  后端B:   P1-3.4 ~ P1-3.5 (CI 配置 + 前端工具测试)
```

## Phase 1 完成标志

- [ ] 所有 14 个页面使用统一深色导航栏
- [ ] `escapeHtml` 只在 `utils.js` 和 `auth.js` 中存在
- [ ] 迁移系统可用：`node db/migrate.js status` 正常
- [ ] 所有 LIMIT/OFFSET 查询使用 `conn.query()`
- [ ] CI 通过：≥ 40 个测试全部 green
- [ ] 无浏览器 console 错误
