# 将项目推送到 GitHub 仓库指南

## 当前状态

- ✅ Git 仓库已初始化
- ⚠️ 当前远程仓库指向 Gitee: `git@gitee.com:LadyDaDa/test.git`
- 📝 有未提交的更改和新文件

## 步骤 1: 更新 .gitignore 文件

确保敏感文件不会被提交：

```gitignore
# 依赖包
node_modules/

# 环境变量（包含敏感信息）
.env
.env.local
.env.*.local

# 日志文件
*.log
npm-debug.log*
yarn-debug.log*

# 系统文件
.DS_Store
Thumbs.db
.vs/
.idea/

# 临时文件
*.tmp
*.temp
~$*

# 构建输出
dist/
build/
```

## 步骤 2: 添加 GitHub 远程仓库

### 方法 A: 替换现有远程仓库（推荐）

如果你只想使用 GitHub：

```bash
# 移除现有的 Gitee 远程仓库
git remote remove origin

# 添加 GitHub 远程仓库（替换为你的 GitHub 仓库地址）
git remote add origin https://github.com/你的用户名/你的仓库名.git

# 或者使用 SSH（如果你配置了 SSH 密钥）
git remote add origin git@github.com:你的用户名/你的仓库名.git
```

### 方法 B: 同时保留两个远程仓库

如果你想同时推送到 Gitee 和 GitHub：

```bash
# 保留 Gitee 作为 origin
# 添加 GitHub 作为另一个远程仓库
git remote add github https://github.com/你的用户名/你的仓库名.git

# 推送到 GitHub
git push github master
```

## 步骤 3: 添加和提交更改

```bash
# 1. 查看当前状态
git status

# 2. 添加所有更改（包括新文件和修改）
git add .

# 3. 或者只添加特定文件
git add front/admin.html
git add backend/
git add docs/

# 4. 提交更改
git commit -m "添加管理员界面和完善功能"

# 5. 查看提交历史
git log --oneline
```

## 步骤 4: 推送到 GitHub

### 如果是第一次推送：

```bash
# 推送到 GitHub 并设置上游分支
git push -u origin master

# 或者如果主分支是 main
git push -u origin main
```

### 如果已经推送过：

```bash
# 直接推送
git push origin master
# 或
git push origin main
```

## 步骤 5: 在 GitHub 上创建仓库（如果还没有）

1. 登录 GitHub
2. 点击右上角的 "+" 按钮，选择 "New repository"
3. 填写仓库名称（例如：Story-Platform）
4. 选择 Public 或 Private
5. **不要**初始化 README、.gitignore 或 license（因为本地已有）
6. 点击 "Create repository"
7. 复制仓库地址（HTTPS 或 SSH）

## 完整操作流程

```bash
# 1. 确保在项目根目录
cd C:\Users\42045\Desktop\Story-Platform-main

# 2. 检查状态
git status

# 3. 添加所有更改
git add .

# 4. 提交更改
git commit -m "feat: 添加管理员界面和完善功能

- 新增管理员控制台页面 (admin.html)
- 实现数据总览、作品管理、用户管理功能
- 在个人中心添加管理员控制台入口
- 优化 CORS 配置和 JWT 配置"

# 5. 添加 GitHub 远程仓库（如果还没有）
git remote add origin https://github.com/你的用户名/你的仓库名.git

# 6. 推送到 GitHub
git push -u origin master
```

## 常见问题

### 问题 1: 推送被拒绝

**错误**: `! [rejected] master -> master (fetch first)`

**解决**:
```bash
# 先拉取远程更改
git pull origin master --allow-unrelated-histories

# 解决冲突后再次推送
git push origin master
```

### 问题 2: 认证失败

**错误**: `Authentication failed`

**解决**:
- 使用 Personal Access Token 代替密码
- 或者配置 SSH 密钥

### 问题 3: 想忽略某些文件

编辑 `.gitignore` 文件，添加要忽略的文件或目录。

## 推荐操作

1. **先更新 .gitignore**，确保 `.env` 等敏感文件不会被提交
2. **检查要提交的文件**：`git status`
3. **添加文件**：`git add .`
4. **提交更改**：`git commit -m "描述"`
5. **推送到 GitHub**：`git push origin master`

## 注意事项

⚠️ **重要**：确保 `.env` 文件已被 `.gitignore` 忽略，不要提交敏感信息！

✅ **建议**：在 GitHub 仓库中添加 README.md 文件，描述项目功能和使用方法。

