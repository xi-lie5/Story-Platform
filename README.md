# StoryForge — 在书香中创造你的互动故事

> AI 驱动的分支式互动故事创作与阅读平台

StoryForge 让你在纸质书般的温暖氛围中，与 AI 共同创作多结局互动故事。支持可视化节点编辑、分支管理、角色设定、AI 文字润色、社区收藏评分，以及完整的审核发布流程。

---

## 项目结构

```
Story-Platform-main/
├── backend/                  # Node.js/Express 后端服务
│   ├── server.js             # 应用入口 + 路由注册
│   ├── config/database.js    # MySQL 连接池 + 9 张数据表初始化
│   ├── middleware/            # 认证 / 鉴权 / 缓存 / 错误处理
│   ├── models/               # 数据模型（User, Story, StoryNode, Branch ...）
│   ├── routes/                # 10 个路由模块
│   └── scripts/              # 管理工具脚本
├── front/                    # 纯前端（HTML/CSS/JS）
│   ├── index.html            # 首页 — 温润书房风格
│   ├── browse.html           # 故事浏览 — 图书馆目录风格
│   ├── story-reader.html     # 互动阅读器 — 书页翻页体验
│   ├── create.html           # 可视化故事编辑器
│   ├── my_stories.html       # 我的作品管理
│   ├── profile.html          # 个人中心 + 管理面板
│   ├── login.html / register.html  # 登录 / 注册
│   ├── admin.html            # 管理后台
│   ├── assets/
│   │   ├── css/design-system.css   # 🌟 全局设计系统
│   │   └── js/
│   │       ├── reading-history.js  # 🌟 阅读进度 + 主题管理
│   │       ├── api-config.js       # API 配置 + 运行时注入
│   │       ├── auth.js            # AuthUI 认证模块
│   │       └── navbar.js          # 动态导航栏 + 主题切换
│   └── script.js             # 故事编辑器引擎（~90KB）
└── docs/                     # 项目文档
    ├── 开发日志.md
    ├── 项目开发汇报.doc
    ├── API文档.md / 需求分析文档.md / 项目框架文档.md
    └── superpowers/plans/    # 实现计划
```

---

## 功能特性

### 🎨 视觉设计 — 温润书房风格
- **Playfair Display + Lora** 双衬线字体，营造古典文学质感
- **暖奶油底色 + 琥珀金强调 + 墨绿点缀** 统一色调体系
- 纸质纹理卡片、层叠书本效果、装饰性分割线、首字下沉阅读体验
- **全局设计系统** (`design-system.css`) — CSS 变量驱动，310 行完整组件库

### 📖 互动阅读
- 分支式故事阅读器 — 在关键节点做出选择，探索多结局故事
- 书页翻页体验 — 暖白底、段落缩进、字体大小三档可调
- 路径指示器 + 进度条 + 阅读时间估算
- **阅读进度自动保存** — localStorage 持久化，关闭浏览器不丢失
- **继续阅读快捷入口** — 首页 / 浏览页展示最近 4 个阅读中的故事卡片
- **阅读历史管理** — 最近 10 条记录，支持单条删除 / 全部清空

### ✍️ 故事创作
- 可视化节点图编辑器 — 拖拽、平移、缩放
- 分支 / 选择管理 + 角色设定
- AI 文字润色（阿里云 DashScope Qwen-Max）
- 批量保存（事务性写入）、草稿 / 提交审核 / 发布流程

### 🔐 用户系统
- 注册 / 登录 — JWT 双令牌认证（access + refresh）
- 个人中心 — 修改资料、修改密码、创作统计
- **全局深色 / 浅色主题切换** — 导航栏一键切换，偏好持久化，覆盖全部 9 个页面

### 👑 管理后台
- 数据概览仪表盘
- 故事审核 — 通过 / 驳回（含原因）
- 用户管理 — 角色变更、启用 / 禁用、密码重置
- 分类管理 — CRUD + 故事迁移

### ❤️ 社区互动
- 故事收藏 / 取消收藏
- 故事评分（1-5 分 + 评论）
- 评分分布统计

---

## 技术栈

| 层 | 技术 |
|---|------|
| 后端 | Node.js 18+, Express 5.1, mysql2, jsonwebtoken, bcryptjs |
| 前端 | Vanilla HTML5/CSS3/ES6+, Tailwind CSS 3.x CDN |
| 设计 | CSS 自定义属性, Google Fonts (Playfair Display + Lora), Font Awesome 4.7 |
| 存储 | MySQL 8.0+ (9 张表), localStorage (阅读进度 / 主题偏好) |
| 安全 | Helmet, CORS, JWT, bcryptjs, express-validator, XSS 防御 (escapeHtml) |
| 缓存 | node-cache 内存缓存, 选择性缓存失效 |
| AI | 阿里云 DashScope (Qwen-Max 文字润色) |

---

## 安装和运行

### 前置条件
- **Node.js** 18+
- **MySQL** 8.0+

### 安装步骤

```bash
# 1. 进入后端目录
cd backend

# 2. 安装依赖
npm install

# 3. 配置环境变量
# 编辑 backend/.env，填入：
#   DB_HOST=localhost
#   DB_USER=root
#   DB_PASSWORD=你的密码
#   DB_NAME=story_platform
#   JWT_SECRET=你的JWT密钥
#   JWT_REFRESH_SECRET=你的刷新令牌密钥
#   DASHSCOPE_API_KEY=你的阿里云API密钥（可选，用于AI润色）

# 4. 启动服务（自动建表 + 插入默认分类）
npm start

# 5. 打开浏览器访问
# http://localhost:5000
```

> 首次启动后，数据库会自动创建 9 张表和默认分类数据。管理员账号需通过 `node scripts/createAdmin.js` 创建。

---

## 版本历史

| 版本 | 日期 | 核心改动 |
|------|------|----------|
| V8 | 2026-05-18 | Helmet 安全头、刷新令牌 MySQL 兼容修复、API 地址运行时注入、调试日志优化 |
| V9 | 2026-05-18 | 阅读进度持久化系统、继续阅读入口、全局深色/浅色主题切换 |
| V10 | 2026-05-18 | 前端视觉全面重构：温润书房设计体系、design-system.css、9 个页面重新设计 |

---

## 许可证

详见 [LICENSE](LICENSE) 文件。





