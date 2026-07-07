# StoryForge 数据库 Schema & 迁移指南

> 所有表结构来自 `backend/config/database.js` 中的真实 `CREATE TABLE` 语句 + 实际测试中发现的缺失列。

---

## 1. 现有表结构

### 1.1 users

| 列 | 类型 | 约束 | 说明 |
|----|------|------|------|
| id | INT | PK, AUTO_INCREMENT | 用户 ID |
| username | VARCHAR(30) | NOT NULL, UNIQUE | 用户名 |
| email | VARCHAR(255) | NOT NULL, UNIQUE | 邮箱 |
| password | VARCHAR(255) | NOT NULL | bcrypt 加密密码 |
| avatar | VARCHAR(255) | DEFAULT '/avatar/default.png' | 头像路径 |
| bio | VARCHAR(200) | DEFAULT '这个人很懒，什么都没留下' | 个人简介 |
| role | ENUM('user','editor','admin') | DEFAULT 'user' | 角色 |
| is_active | BOOLEAN | DEFAULT TRUE | 是否激活 |
| token_version | INT | DEFAULT 1 | Token 版本（强制登出用） |
| refresh_token | TEXT | NULL | 刷新令牌 |
| last_login | TIMESTAMP | NULL | 最后登录时间 |
| login_attempts | INT | DEFAULT 0 | 连续登录失败次数 |
| lock_until | TIMESTAMP | NULL | 锁定到期时间 |

索引: `idx_email(email)`, `idx_username(username)`, `idx_is_active(is_active)`

### 1.2 stories

| 列 | 类型 | 约束 | 说明 |
|----|------|------|------|
| id | INT | PK, AUTO_INCREMENT | 故事 ID |
| title | VARCHAR(100) | NOT NULL | 标题 |
| author_id | INT | NOT NULL, FK→users | 作者 |
| category_id | INT | NULL, FK→categories | 分类 |
| cover_image | VARCHAR(255) | DEFAULT '/coverImage/1.png' | 封面 |
| description | VARCHAR(500) | NOT NULL | 简介 |
| status | ENUM('draft','pending','published','rejected','unpublished') | DEFAULT 'draft' | 状态 |
| is_public | BOOLEAN | DEFAULT FALSE | 是否公开 |
| creation_mode | ENUM('manual','ai') | DEFAULT 'manual' | 创作模式 |
| ai_config | JSON | NULL | AI 配置快照 |
| view_count | INT | DEFAULT 0 | 浏览次数 |
| rating | DECIMAL(3,2) | DEFAULT 0.00 | 平均评分 |
| rating_count | INT | DEFAULT 0 | 评分人数 |

索引: `idx_author(author_id)`, `idx_category(category_id)`, `idx_status(status)`, `idx_created_at(created_at)`, `FULLTEXT idx_title_desc(title, description)`

### 1.3 story_nodes

| 列 | 类型 | 约束 | 说明 |
|----|------|------|------|
| id | VARCHAR(255) | PK (UUID) | 节点 ID |
| story_id | INT | NOT NULL, FK→stories | 所属故事 |
| title | VARCHAR(255) | NOT NULL | 节点标题 |
| content | TEXT | NOT NULL | 节点内容 |
| is_root | BOOLEAN | DEFAULT FALSE | 是否根节点 |
| type | ENUM('regular','branch','end') | DEFAULT 'regular' | 节点类型 |
| x | INT | DEFAULT 0 | 图谱 X 坐标 |
| y | INT | DEFAULT 0 | 图谱 Y 坐标 |

索引: `idx_story_id(story_id)`, `idx_story_root(story_id, is_root)`, `idx_story_type(story_id, type)`

### 1.4 branches

| 列 | 类型 | 约束 | 说明 |
|----|------|------|------|
| id | VARCHAR(255) | PK (UUID) | 分支 ID |
| source_node_id | VARCHAR(255) | NOT NULL, FK→story_nodes | 源节点 |
| target_node_id | VARCHAR(255) | NOT NULL, FK→story_nodes | 目标节点 |
| context | VARCHAR(500) | NOT NULL | 选项文本 |

索引: `UNIQUE(source_node_id, target_node_id)`, `idx_source(source_node_id)`, `idx_target(target_node_id)`

### 1.5 characters

| 列 | 类型 | 约束 |
|----|------|------|
| id | VARCHAR(255) | PK (UUID) |
| story_id | INT | FK→stories |
| name | VARCHAR(100) | NOT NULL |
| description | VARCHAR(1000) | NOT NULL |

索引: `UNIQUE(story_id, name)`

### 1.6 categories

| 列 | 类型 | 约束 |
|----|------|------|
| id | INT | PK, AUTO_INCREMENT |
| name | VARCHAR(100) | NOT NULL, UNIQUE |
| description | TEXT | NULL |
| story_count | INT | DEFAULT 0 |

### 1.7 ai_stories（AI 规则书）

| 列 | 类型 | 约束 | 说明 |
|----|------|------|------|
| id | CHAR(36) | PK (UUID) | 规则书 ID |
| title | VARCHAR(100) | NOT NULL | 标题 |
| author_id | INT | NOT NULL, FK→users | 作者 |
| world_setting | TEXT | NOT NULL | 世界观 |
| start_prompt | TEXT | NOT NULL | 开端提示 |
| outline | TEXT | NULL | 大纲 |
| style | JSON | NULL | `{narrative, tone, length}` |
| mood_tags | JSON | NULL | 氛围标签数组 |
| characters_config | JSON | NULL | 角色卡数组 |
| category_id | INT | NULL, FK→categories | 分类 |
| cover_image | VARCHAR(255) | DEFAULT '/coverImage/1.png' | 封面 |
| description | VARCHAR(500) | NULL | 简介 |
| status | ENUM('draft','published','unpublished') | DEFAULT 'draft' | 状态 |
| is_public | BOOLEAN | DEFAULT FALSE | 是否公开 |
| total_sessions | INT | DEFAULT 0 | 总游玩次数 |
| view_count | INT | DEFAULT 0 | 浏览次数 |

> ⚠️ `description`、`cover_image`、`total_sessions`、`view_count` 这 4 列是在测试中补加的——旧表没有这些列。未来通过迁移系统管理。

### 1.8 ai_story_sessions（AI 冒险会话）

| 列 | 类型 | 说明 |
|----|------|------|
| id | INT | PK, AUTO_INCREMENT |
| story_id | INT | FK→stories |
| user_id | INT | FK→users |
| context_messages | JSON | 对话上下文（AI history） |
| current_node_id | VARCHAR(255) | 当前节点 |
| summary | TEXT | 摘要 |
| total_nodes | INT | 总节点数 |

### 1.9 ai_story_characters

| 列 | 类型 |
|----|------|
| id | INT PK |
| story_id | INT FK→stories |
| name | VARCHAR(100) |
| personality_tags | JSON |
| description | TEXT |
| relationships | JSON |
| avatar_prompt | TEXT |

### 1.10 其余表

- `user_story_favorites`: user_id + story_id (UNIQUE)
- `user_story_ratings`: user_id + story_id (UNIQUE), rating 1-5
- `collections`: 故事合集

---

## 2. Phase 2 新增表

### 2.1 story_comments（评论）

```sql
CREATE TABLE story_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  story_id INT NOT NULL,
  user_id INT NOT NULL,
  node_id VARCHAR(255) NULL COMMENT '绑定到特定节点，NULL=故事级评论',
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (node_id) REFERENCES story_nodes(id) ON DELETE SET NULL,
  INDEX idx_story (story_id),
  INDEX idx_user (user_id),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 2.2 story_read_events（阅读埋点）

```sql
CREATE TABLE story_read_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  story_id INT NOT NULL,
  user_id INT NOT NULL,
  session_id INT NULL,
  from_node_id VARCHAR(255) NULL COMMENT '来源节点',
  to_node_id VARCHAR(255) NOT NULL COMMENT '目标节点',
  choice_text VARCHAR(500) NULL COMMENT '用户选择的文本',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_story (story_id),
  INDEX idx_user (user_id),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 3. 迁移系统（Phase 1 模块 2）

### 3.1 设计

```
backend/migrations/
├── 001_init_core_tables.sql       # users, stories, categories
├── 002_add_story_nodes.sql        # story_nodes, branches, characters
├── 003_add_interactions.sql       # favorites, ratings
├── 004_add_ai_mode.sql            # ai_stories, ai_story_sessions, ai_story_characters
├── 005_fix_ai_stories_columns.sql # 🆕 补加缺失的 4 列
├── 006_add_comments.sql           # 🆕 Phase 2
└── 007_add_read_events.sql        # 🆕 Phase 2
```

### 3.2 迁移文件格式

```sql
-- 迁移: 006_add_comments
-- 描述: 添加故事评论表
-- 创建时间: 2026-07-07
-- UP
CREATE TABLE story_comments (...);
-- DOWN (回滚)
DROP TABLE IF EXISTS story_comments;
```

### 3.3 使用方式

```bash
# 执行所有未运行的迁移
cd backend && node db/migrate.js

# 回滚最近一次迁移
cd backend && node db/migrate.js rollback

# 查看迁移状态
cd backend && node db/migrate.js status
```

### 3.4 核心实现（`backend/db/migrate.js`）

```javascript
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

async function ensureMigrationTable() {
  await pool.query(`CREATE TABLE IF NOT EXISTS _migrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
}

async function migrate() {
  await ensureMigrationTable();
  const [done] = await pool.query('SELECT name FROM _migrations');
  const doneNames = new Set(done.map(r => r.name));

  const dir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    if (doneNames.has(file)) {
      console.log('⏭️  Skipping', file);
      continue;
    }
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    const upSection = sql.split('-- DOWN')[0].replace('-- UP\n', '');
    await pool.query(upSection);
    await pool.query('INSERT INTO _migrations (name) VALUES (?)', [file]);
    console.log('✅ Executed', file);
  }
  console.log('Migration complete.');
}

migrate().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
```

---

## 4. 数据库操作规范

### 4.1 查询 vs 预编译语句

```javascript
// 🔴 含有 LIMIT/OFFSET: 必须用 query()，LIMIT 值直接拼接
const [rows] = await conn.query(
  'SELECT * FROM table WHERE col = ? ORDER BY id DESC LIMIT ' + limit + ' OFFSET ' + offset,
  [value]
);

// 🟢 不含 LIMIT/OFFSET: 可用 execute()
const [rows] = await conn.execute('SELECT * FROM table WHERE id = ?', [id]);

// 🟢 INSERT/UPDATE/DELETE: execute() OK
await conn.execute('INSERT INTO table (a, b) VALUES (?, ?)', [a, b]);
```

### 4.2 事务

所有涉及多表写操作的必须在事务中执行：

```javascript
const conn = await pool.getConnection();
try {
  await conn.beginTransaction();
  // ... 所有写操作 ...
  await conn.commit();
} catch (e) {
  await conn.rollback();
  throw e;
} finally {
  conn.release();
}
```

### 4.3 添加新表/修改表结构

**禁止直接在 `server.js` 或 `database.js` 中修改 `CREATE TABLE`。** 必须通过迁移文件：

```bash
# 1. 创建迁移文件
touch backend/migrations/008_your_change.sql

# 2. 写 UP/DOWN SQL

# 3. 本地测试
node db/migrate.js

# 4. 提交迁移文件（连同你的功能代码一起提交）
git add backend/migrations/008_your_change.sql
```

---

## 5. ER 关系图

```
users
├── stories (1:N, author_id)
│     ├── story_nodes (1:N)
│     │     ├── branches (1:N, source_node_id)
│     │     └── branches (1:N, target_node_id)
│     ├── characters (1:N)
│     ├── story_comments (1:N) 🆕
│     ├── story_read_events (1:N) 🆕
│     ├── user_story_favorites (1:N)
│     └── user_story_ratings (1:N)
├── ai_stories (1:N, author_id)
│     └── (sessions via stories table)
├── ai_story_sessions (1:N, user_id)
└── categories (1:N — stories)
```

**关键关系：**
- `ai_stories` 是"规则书"（配置模板）
- 用户开始冒险时：从 `ai_stories` 读取配置 → 在 `stories` 创建实际故事 → 在 `ai_story_sessions` 创建会话记录
- 每次 AI 续写：在 `story_nodes` 创建新节点 → 在 `branches` 创建分支连接 → 更新 `ai_story_sessions`
