# Story-Platform

一个基于协作的故事创作平台，支持多用户共同创建分支式故事。

## AI 故事模式

集成 DeepSeek 大模型，支持 AI 自主生成互动小说：

- **故事工坊**：配置世界观、角色卡、大纲和风格指南
- **AI 动态生成**：读者在每个节点做出选择，AI 实时续写剧情
- **分支叙事**：每次选择产生 2-3 个有意义的剧情分支
- **大纲润色**：复用通义千问 Qwen-Max 润色故事蓝图

## 功能特性

- 用户注册和登录（JWT 认证）
- 故事创建和编辑（手动 + AI 两种模式）
- 分支式故事结构（节点 + 分支图）
- 角色系统
- AI 内容润色和扩写（通义千问）
- 故事收藏、评分和评论
- 管理员功能（审核、管理）

## 项目结构

- `backend/` - 后端服务器（Node.js/Express + MySQL）
- `front/` - 前端页面（HTML/CSS/JavaScript）
- `docs/` - 项目文档

## 快速开始

### 1. 启动 MySQL（Docker）
```bash
docker compose up -d
```

### 2. 配置环境变量
编辑 `backend/.env`：
- `DASHSCOPE_API_KEY` — 通义千问 Qwen-Max（AI 润色 + 文生图）
- `DEEPSEEK_API_KEY` — DeepSeek V3（AI 故事生成）

### 3. 安装依赖并启动
```bash
cd backend
npm install
npm start
```
服务运行在 http://localhost:5000

## 测试账号

| 邮箱 | 密码 |
|------|------|
| testai@test.com | test123456 |

## API 端点

| 路径 | 说明 |
|------|------|
| /api/v1/auth | 注册、登录、用户信息 |
| /api/v1/stories | 故事 CRUD + 浏览 |
| /api/v1/storyNodes | 故事节点管理 |
| /api/v1/aiStory | AI 故事创建、续写、会话 |
| /api/v1/ai | AI 内容润色、大纲优化 |
| /api/v1/categories | 分类管理 |
| /api/v1/admin | 管理员功能 |
