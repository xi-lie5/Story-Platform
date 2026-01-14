# StoryForge API 文档

## 目录

1. [概述](#概述)
2. [认证](#认证)
3. [故事管理](#故事管理)
4. [节点管理](#节点管理)
5. [分支管理](#分支管理)
6. [角色管理](#角色管理)
7. [分类管理](#分类管理)
8. [用户管理](#用户管理)
9. [管理员功能](#管理员功能)
10. [用户交互](#用户交互)
11. [AI功能](#ai功能)
12. [错误码](#错误码)

---

## 概述

### 基础信息

- **Base URL**: `http://localhost:5000/api/v1`
- **API版本**: v1
- **数据格式**: JSON
- **字符编码**: UTF-8

### 认证方式

API使用JWT (JSON Web Token)进行认证。需要在请求头中携带Token：

```
Authorization: Bearer <access_token>
```

### 响应格式

#### 成功响应

```json
{
  "success": true,
  "message": "操作成功",
  "data": {
    // 响应数据
  }
}
```

#### 错误响应

```json
{
  "success": false,
  "message": "错误描述",
  "errors": [
    {
      "field": "字段名",
      "message": "字段错误信息"
    }
  ],
  "code": 10001,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 分页格式

```json
{
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

---

## 认证

### 1. 用户注册

**接口**: `POST /api/v1/auth/register`

**权限**: 公开

**请求体**:

```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "confirmPassword": "string"
}
```

**参数说明**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | 是 | 用户名，3-30个字符 |
| email | string | 是 | 邮箱地址，需符合邮箱格式 |
| password | string | 是 | 密码，至少8位 |
| confirmPassword | string | 是 | 确认密码，需与password一致 |

**响应示例**:

```json
{
  "success": true,
  "message": "注册成功",
  "data": {
    "userId": 1,
    "username": "testuser",
    "email": "test@example.com",
    "avatar": "/avatar/default.png",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 2. 用户登录

**接口**: `POST /api/v1/auth/login`

**权限**: 公开

**请求体**:

```json
{
  "email": "string",
  "password": "string"
}
```

**参数说明**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| email | string | 是 | 邮箱地址 |
| password | string | 是 | 密码 |

**响应示例**:

```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "userId": 1,
    "username": "testuser",
    "email": "test@example.com",
    "avatar": "/avatar/default.png",
    "role": "user",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**错误码**:
- `10006`: 邮箱或密码错误
- `10020`: 账户已被封禁
- `10021`: 账户已被锁定

---

### 3. 刷新Token

**接口**: `POST /api/v1/auth/refresh`

**权限**: 需要Refresh Token

**请求体**:

```json
{
  "refreshToken": "string"
}
```

**响应示例**:

```json
{
  "success": true,
  "message": "刷新令牌成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 4. 用户登出

**接口**: `POST /api/v1/auth/logout`

**权限**: 需要登录

**请求体**:

```json
{
  "refreshToken": "string"
}
```

**响应示例**:

```json
{
  "success": true,
  "message": "已退出登录"
}
```

---

## 故事管理

### 1. 获取故事列表

**接口**: `GET /api/v1/stories`

**权限**: 公开

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认1 |
| limit | number | 否 | 每页数量，默认9，最大50 |
| category | string | 否 | 分类名称 |
| search | string | 否 | 搜索关键词 |
| sort | string | 否 | 排序方式：latest(最新)、popular(最受欢迎)、rating(评分最高) |

**响应示例**:

```json
{
  "success": true,
  "message": "获取故事列表成功",
  "data": {
    "stories": [
      {
        "id": 1,
        "title": "故事标题",
        "description": "故事简介",
        "categoryId": 1,
        "authorId": 1,
        "coverImage": "/coverImage/1.png",
        "view": 100,
        "rating": 4.5,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "author": {
          "id": 1,
          "username": "author",
          "avatar": "/avatar/default.png"
        },
        "category": {
          "id": 1,
          "name": "分类名称"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 9,
      "total": 100,
      "pages": 12
    }
  }
}
```

---

### 2. 获取公共故事列表

**接口**: `GET /api/v1/stories/public`

**权限**: 公开

**查询参数**: 同获取故事列表

**响应示例**: 同获取故事列表

---

### 3. 获取故事详情

**接口**: `GET /api/v1/stories/:storyId`

**权限**: 公开（已发布）或需要登录（作者）

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| storyId | number | 是 | 故事ID |

**响应示例**:

```json
{
  "success": true,
  "message": "获取故事详情成功",
  "data": {
    "id": 1,
    "title": "故事标题",
    "authorId": 1,
    "categoryId": 1,
    "coverImage": "/coverImage/1.png",
    "description": "故事简介",
    "view": 100,
    "rating": 4.5,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "status": "published",
    "isPublic": true,
    "totalNodes": 10,
    "author": {
      "id": 1,
      "username": "author",
      "avatar": "/avatar/default.png"
    },
    "category": {
      "id": 1,
      "name": "分类名称"
    }
  }
}
```

---

### 4. 创建故事

**接口**: `POST /api/v1/stories`

**权限**: 需要登录

**请求体**:

```json
{
  "title": "string",
  "description": "string",
  "categoryId": 1,
  "coverImage": "string"
}
```

**参数说明**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 是 | 故事标题，最多100字符 |
| description | string | 是 | 故事简介，最多500字符 |
| categoryId | number | 是 | 分类ID |
| coverImage | string | 否 | 封面图片路径或URL |

**响应示例**:

```json
{
  "success": true,
  "message": "创建故事成功",
  "data": {
    "id": 1,
    "title": "故事标题",
    "status": "draft",
    "isTemporary": false
  }
}
```

---

### 5. 更新故事

**接口**: `PUT /api/v1/stories/:storyId`

**权限**: 需要登录，且为故事作者

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| storyId | number | 是 | 故事ID |

**请求体**:

```json
{
  "title": "string",
  "description": "string",
  "categoryId": 1,
  "coverImage": "string"
}
```

**响应示例**:

```json
{
  "success": true,
  "message": "故事更新成功"
}
```

---

### 6. 删除故事

**接口**: `DELETE /api/v1/stories/:storyId`

**权限**: 需要登录，且为故事作者

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| storyId | number | 是 | 故事ID |

**响应示例**:

```json
{
  "success": true,
  "message": "故事及关联章节已删除"
}
```

---

### 7. 提交故事审核

**接口**: `PATCH /api/v1/stories/:storyId/submit`

**权限**: 需要登录，且为故事作者

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| storyId | number | 是 | 故事ID |

**响应示例**:

```json
{
  "success": true,
  "message": "故事提交审核成功",
  "data": {
    "id": 1,
    "title": "故事标题",
    "status": "pending"
  }
}
```

---

### 8. 标记故事完成状态

**接口**: `PATCH /api/v1/stories/:storyId/complete`

**权限**: 需要登录，且为故事作者

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| storyId | number | 是 | 故事ID |

**请求体**:

```json
{
  "isCompleted": true
}
```

**响应示例**:

```json
{
  "success": true,
  "message": "故事已标记为完成",
  "data": {
    "id": 1,
    "title": "故事标题",
    "isCompleted": true,
    "status": "published"
  }
}
```

---

### 9. 取消发布故事

**接口**: `PATCH /api/v1/stories/:storyId/unpublish`

**权限**: 需要登录，且为故事作者

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| storyId | number | 是 | 故事ID |

**响应示例**:

```json
{
  "success": true,
  "message": "故事取消发布成功",
  "data": {
    "id": 1,
    "title": "故事标题",
    "status": "draft",
    "isCompleted": false
  }
}
```

---

## 节点管理

### 1. 获取公共故事节点（用于阅读）

**接口**: `GET /api/v1/storyNodes/public/stories/:storyId/nodes`

**权限**: 公开（已发布故事）或需要登录（作者/管理员）

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| storyId | number | 是 | 故事ID |

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 否 | 节点类型过滤 |
| depth | number | 否 | 深度限制 |

**响应示例**:

```json
{
  "success": true,
  "data": [
    {
      "id": "node-uuid",
      "storyId": 1,
      "title": "节点标题",
      "content": "节点内容",
      "type": "regular",
      "isRoot": true,
      "x": 400,
      "y": 50,
      "choices": [
        {
          "id": "branch-uuid",
          "text": "选择1",
          "targetNodeId": "target-node-uuid",
          "targetNode": {
            "id": "target-node-uuid",
            "title": "目标节点标题"
          }
        }
      ]
    }
  ]
}
```

---

### 2. 获取故事的所有节点

**接口**: `GET /api/v1/storyNodes/stories/:storyId/nodes`

**权限**: 需要登录，且为故事作者

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| storyId | number | 是 | 故事ID |

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 否 | 节点类型过滤 |

**响应示例**:

```json
{
  "success": true,
  "data": [
    {
      "id": "node-uuid",
      "story_id": 1,
      "title": "节点标题",
      "content": "节点内容",
      "type": "regular",
      "is_root": true,
      "x": 400,
      "y": 50
    }
  ]
}
```

---

### 3. 获取故事树

**接口**: `GET /api/v1/storyNodes/stories/:storyId/tree`

**权限**: 需要登录，且为故事作者

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| storyId | number | 是 | 故事ID |

**响应示例**:

```json
{
  "success": true,
  "data": {
    "root": {
      "id": "node-uuid",
      "title": "根节点",
      "content": "内容"
    },
    "nodes": [...],
    "branches": [...]
  }
}
```

---

### 4. 创建根节点

**接口**: `POST /api/v1/storyNodes/stories/:storyId/root`

**权限**: 需要登录，且为故事作者

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| storyId | number | 是 | 故事ID |

**请求体**:

```json
{
  "title": "string",
  "content": "string"
}
```

**响应示例**:

```json
{
  "success": true,
  "message": "根节点创建成功",
  "data": {
    "id": "node-uuid",
    "story_id": 1,
    "title": "故事开始",
    "content": "这是故事的开始...",
    "type": "regular",
    "is_root": true,
    "x": 400,
    "y": 50
  }
}
```

---

### 5. 创建子节点

**接口**: `POST /api/v1/storyNodes/stories/:storyId/nodes`

**权限**: 需要登录，且为故事作者

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| storyId | number | 是 | 故事ID |

**请求体**:

```json
{
  "parentId": "string",
  "title": "string",
  "content": "string",
  "type": "normal|choice|ending",
  "position": {
    "x": 0,
    "y": 0
  },
  "choices": [
    {
      "text": "string",
      "targetNodeId": "string"
    }
  ]
}
```

**响应示例**:

```json
{
  "success": true,
  "message": "节点创建成功",
  "data": {
    "id": "node-uuid",
    "story_id": 1,
    "title": "节点标题",
    "content": "节点内容",
    "type": "regular",
    "is_root": false,
    "x": 0,
    "y": 0
  }
}
```

---

### 6. 批量保存节点

**接口**: `POST /api/v1/storyNodes/stories/:storyId/nodes/batch`

**权限**: 需要登录，且为故事作者

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| storyId | number | 是 | 故事ID |

**请求体**:

```json
{
  "nodes": [
    {
      "id": "node-uuid",
      "title": "string",
      "content": "string",
      "type": "normal|choice|ending",
      "isRoot": false,
      "x": 0,
      "y": 0,
      "choices": [
        {
          "id": "branch-uuid",
          "text": "string",
          "targetNodeId": "string"
        }
      ]
    }
  ]
}
```

**响应示例**:

```json
{
  "success": true,
  "message": "节点批量保存成功",
  "data": {
    "nodes": [...],
    "branchesCreated": 5
  }
}
```

---

### 7. 更新节点

**接口**: `PUT /api/v1/storyNodes/nodes/:nodeId`

**权限**: 需要登录，且为故事作者

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| nodeId | string | 是 | 节点ID (UUID) |

**请求体**:

```json
{
  "title": "string",
  "content": "string",
  "type": "normal|choice|ending",
  "position": {
    "x": 0,
    "y": 0
  },
  "choices": [
    {
      "text": "string",
      "targetNodeId": "string"
    }
  ]
}
```

**响应示例**:

```json
{
  "success": true,
  "message": "节点更新成功",
  "data": {
    "id": "node-uuid",
    "title": "更新后的标题",
    "content": "更新后的内容"
  }
}
```

---

### 8. 删除节点

**接口**: `DELETE /api/v1/storyNodes/nodes/:nodeId`

**权限**: 需要登录，且为故事作者

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| nodeId | string | 是 | 节点ID (UUID) |

**响应示例**:

```json
{
  "success": true,
  "message": "节点及其子节点删除成功"
}
```

---

### 9. 获取单个节点

**接口**: `GET /api/v1/storyNodes/nodes/:nodeId`

**权限**: 需要登录（公开故事或作者）

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| nodeId | string | 是 | 节点ID (UUID) |

**响应示例**:

```json
{
  "success": true,
  "data": {
    "id": "node-uuid",
    "story_id": 1,
    "title": "节点标题",
    "content": "节点内容",
    "type": "regular",
    "is_root": false,
    "x": 0,
    "y": 0
  }
}
```

---

## 分支管理

### 1. 获取故事的所有分支

**接口**: `GET /api/v1/branches/stories/:storyId/branches`

**权限**: 需要登录，且为故事作者

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| storyId | number | 是 | 故事ID |

**响应示例**:

```json
{
  "success": true,
  "message": "获取分支列表成功",
  "data": [
    {
      "id": "branch-uuid",
      "source_node_id": "source-uuid",
      "target_node_id": "target-uuid",
      "context": "分支描述"
    }
  ]
}
```

---

### 2. 获取节点的出向分支

**接口**: `GET /api/v1/branches/nodes/:nodeId/branches/outgoing`

**权限**: 需要登录

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| nodeId | string | 是 | 节点ID (UUID) |

**响应示例**:

```json
{
  "success": true,
  "message": "获取出向分支成功",
  "data": [
    {
      "id": "branch-uuid",
      "source_node_id": "node-uuid",
      "target_node_id": "target-uuid",
      "context": "分支描述"
    }
  ]
}
```

---

### 3. 获取节点的入向分支

**接口**: `GET /api/v1/branches/nodes/:nodeId/branches/incoming`

**权限**: 需要登录

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| nodeId | string | 是 | 节点ID (UUID) |

**响应示例**:

```json
{
  "success": true,
  "message": "获取入向分支成功",
  "data": [
    {
      "id": "branch-uuid",
      "source_node_id": "source-uuid",
      "target_node_id": "node-uuid",
      "context": "分支描述"
    }
  ]
}
```

---

### 4. 创建分支

**接口**: `POST /api/v1/branches/stories/:storyId/branches`

**权限**: 需要登录，且为故事作者

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| storyId | number | 是 | 故事ID |

**请求体**:

```json
{
  "sourceNodeId": "string",
  "targetNodeId": "string",
  "context": "string"
}
```

**响应示例**:

```json
{
  "success": true,
  "message": "创建分支成功",
  "data": {
    "id": "branch-uuid",
    "source_node_id": "source-uuid",
    "target_node_id": "target-uuid",
    "context": "分支描述"
  }
}
```

---

### 5. 批量创建分支

**接口**: `POST /api/v1/branches/stories/:storyId/branches/batch`

**权限**: 需要登录，且为故事作者

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| storyId | number | 是 | 故事ID |

**请求体**:

```json
{
  "branches": [
    {
      "sourceNodeId": "string",
      "targetNodeId": "string",
      "context": "string"
    }
  ]
}
```

**响应示例**:

```json
{
  "success": true,
  "message": "批量创建分支完成",
  "data": {
    "created": 5,
    "failed": 0
  }
}
```

---

### 6. 删除分支

**接口**: `DELETE /api/v1/branches/branches/:branchId`

**权限**: 需要登录，且为故事作者

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| branchId | string | 是 | 分支ID (UUID) |

**响应示例**:

```json
{
  "success": true,
  "message": "删除分支成功"
}
```

---

## 角色管理

### 1. 获取故事的所有角色

**接口**: `GET /api/v1/characters/stories/:storyId/characters`

**权限**: 需要登录，且为故事作者

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| storyId | number | 是 | 故事ID |

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 否 | 角色名称过滤 |

**响应示例**:

```json
{
  "success": true,
  "message": "获取角色列表成功",
  "data": [
    {
      "id": "character-uuid",
      "story_id": 1,
      "name": "角色名称",
      "description": "角色描述"
    }
  ]
}
```

---

### 2. 创建角色

**接口**: `POST /api/v1/characters/stories/:storyId/characters`

**权限**: 需要登录，且为故事作者

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| storyId | number | 是 | 故事ID |

**请求体**:

```json
{
  "name": "string",
  "description": "string"
}
```

**响应示例**:

```json
{
  "success": true,
  "message": "创建角色成功",
  "data": {
    "id": "character-uuid",
    "story_id": 1,
    "name": "角色名称",
    "description": "角色描述"
  }
}
```

---

### 3. 批量创建角色

**接口**: `POST /api/v1/characters/stories/:storyId/characters/batch`

**权限**: 需要登录，且为故事作者

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| storyId | number | 是 | 故事ID |

**请求体**:

```json
{
  "characters": [
    {
      "name": "string",
      "description": "string"
    }
  ]
}
```

**响应示例**:

```json
{
  "success": true,
  "message": "批量创建角色完成",
  "data": {
    "created": 3,
    "failed": 0
  }
}
```

---

### 4. 更新角色

**接口**: `PUT /api/v1/characters/characters/:characterId`

**权限**: 需要登录，且为故事作者

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| characterId | string | 是 | 角色ID (UUID) |

**请求体**:

```json
{
  "name": "string",
  "description": "string"
}
```

**响应示例**:

```json
{
  "success": true,
  "message": "更新角色成功",
  "data": {
    "id": "character-uuid",
    "name": "更新后的角色名称",
    "description": "更新后的角色描述"
  }
}
```

---

### 5. 删除角色

**接口**: `DELETE /api/v1/characters/characters/:characterId`

**权限**: 需要登录，且为故事作者

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| characterId | string | 是 | 角色ID (UUID) |

**响应示例**:

```json
{
  "success": true,
  "message": "删除角色成功"
}
```

---

## 分类管理

### 1. 获取分类列表

**接口**: `GET /api/v1/categories`

**权限**: 公开

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| sort | string | 否 | 排序方式：storyCount(按故事数量)、createdAt(按创建时间) |

**响应示例**:

```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "id": 1,
      "name": "分类名称",
      "description": "分类描述",
      "storyCount": 10,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 2. 获取单个分类详情

**接口**: `GET /api/v1/categories/:id`

**权限**: 公开

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | 是 | 分类ID |

**响应示例**:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "分类名称",
    "description": "分类描述",
    "storyCount": 10
  }
}
```

---

### 3. 创建分类

**接口**: `POST /api/v1/categories`

**权限**: 需要管理员权限

**请求体**:

```json
{
  "name": "string",
  "description": "string"
}
```

**参数说明**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 分类名称，最多50字符 |
| description | string | 否 | 分类描述，最多200字符 |

**响应示例**:

```json
{
  "success": true,
  "message": "分类创建成功",
  "data": {
    "id": 1,
    "name": "分类名称",
    "description": "分类描述",
    "storyCount": 0
  }
}
```

---

### 4. 更新分类

**接口**: `PUT /api/v1/categories/:id`

**权限**: 需要管理员权限

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | 是 | 分类ID |

**请求体**:

```json
{
  "name": "string",
  "description": "string"
}
```

**响应示例**:

```json
{
  "success": true,
  "message": "编辑添加成功",
  "data": {
    "id": 1,
    "name": "更新后的分类名称",
    "description": "更新后的分类描述",
    "storyCount": 10
  }
}
```

---

### 5. 删除分类

**接口**: `DELETE /api/v1/categories/:id`

**权限**: 需要管理员权限

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | 是 | 分类ID |

**响应示例**:

```json
{
  "success": true,
  "message": "分类删除成功，已将5个故事移动到默认分类"
}
```

**注意**: 如果分类下有故事，会自动移动到"默认分类"。

---

## 用户管理

### 1. 获取当前用户信息

**接口**: `GET /api/v1/users/me`

**权限**: 需要登录

**响应示例**:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com",
    "avatar": "/avatar/default.png",
    "bio": "个人简介",
    "role": "user",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 2. 更新当前用户信息

**接口**: `PUT /api/v1/users/me`

**权限**: 需要登录

**请求体**:

```json
{
  "username": "string",
  "email": "string"
}
```

**参数说明**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | 否 | 用户名，3-50个字符 |
| email | string | 否 | 邮箱地址 |

**响应示例**:

```json
{
  "success": true,
  "message": "用户信息更新成功",
  "data": {
    "id": 1,
    "username": "newusername",
    "email": "newemail@example.com"
  }
}
```

---

### 3. 更改密码

**接口**: `PUT /api/v1/users/me/change-password`

**权限**: 需要登录

**请求体**:

```json
{
  "currentPassword": "string",
  "newPassword": "string"
}
```

**参数说明**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| currentPassword | string | 是 | 当前密码 |
| newPassword | string | 是 | 新密码，至少6位 |

**响应示例**:

```json
{
  "success": true,
  "message": "密码修改成功"
}
```

---

### 4. 获取用户创作统计

**接口**: `GET /api/v1/users/me/stats`

**权限**: 需要登录

**响应示例**:

```json
{
  "success": true,
  "data": {
    "publishedStories": 5,
    "draftStories": 3,
    "collectedStories": 10,
    "totalStories": 8,
    "recentStories": 2
  }
}
```

---

### 5. 获取用户故事列表

**接口**: `GET /api/v1/users/:userId/stories`

**权限**: 需要登录，且只能访问自己的故事列表

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | number | 是 | 用户ID |

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认1 |
| limit | number | 否 | 每页数量，默认9，最大50 |
| category | string | 否 | 分类名称 |
| status | string | 否 | 状态筛选 |
| search | string | 否 | 搜索关键词 |
| sort | string | 否 | 排序方式 |

**响应示例**:

```json
{
  "success": true,
  "message": "获取用户故事列表成功",
  "data": {
    "stories": [
      {
        "id": 1,
        "title": "故事标题",
        "description": "故事简介",
        "status": "published",
        "isPublic": true,
        "isCompleted": true,
        "view": 100,
        "rating": 4.5,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 9,
      "total": 10,
      "pages": 2
    }
  }
}
```

---

### 6. 获取用户资料（公开信息）

**接口**: `GET /api/v1/users/:userId`

**权限**: 公开

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | number | 是 | 用户ID |

**响应示例**:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com",
    "avatar": "/avatar/default.png",
    "bio": "个人简介",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "storyCount": 10
  }
}
```

---

## 管理员功能

### 1. 获取统计信息

**接口**: `GET /api/v1/admin/stats`

**权限**: 需要管理员权限

**响应示例**:

```json
{
  "success": true,
  "message": "获取统计信息成功",
  "data": {
    "stories": {
      "total": 100,
      "published": 80,
      "draft": 10,
      "pending": 5,
      "rejected": 5
    },
    "users": {
      "total": 50
    },
    "categories": {
      "total": 10
    },
    "reviews": {
      "today": 5,
      "total": 85
    }
  }
}
```

---

### 2. 获取所有作品

**接口**: `GET /api/v1/admin/stories`

**权限**: 需要管理员权限

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认1 |
| limit | number | 否 | 每页数量，默认1000，最大1000 |
| status | string | 否 | 状态筛选：all|draft|pending|published|rejected |
| search | string | 否 | 搜索关键词 |

**响应示例**:

```json
{
  "success": true,
  "message": "获取作品列表成功",
  "data": {
    "stories": [
      {
        "id": 1,
        "title": "故事标题",
        "description": "故事简介",
        "author": {
          "id": 1,
          "username": "author"
        },
        "category": {
          "id": 1,
          "name": "分类名称"
        },
        "status": "pending",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 1000,
      "total": 100,
      "pages": 1
    }
  }
}
```

---

### 3. 审核作品

**接口**: `PUT /api/v1/admin/stories/:storyId/review`

**权限**: 需要管理员权限

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| storyId | number | 是 | 故事ID |

**请求体**:

```json
{
  "action": "approve|reject",
  "reason": "string"
}
```

**参数说明**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| action | string | 是 | 操作：approve(通过)或reject(拒绝) |
| reason | string | 否 | 拒绝原因（拒绝时必填），最多500字符 |

**响应示例**:

```json
{
  "success": true,
  "message": "作品审核通过，已发布",
  "data": {
    "id": 1,
    "title": "故事标题",
    "status": "published",
    "isPublic": true,
    "author": {
      "username": "author",
      "email": "author@example.com"
    }
  }
}
```

---

### 4. 删除作品

**接口**: `DELETE /api/v1/admin/stories/:storyId`

**权限**: 需要管理员权限

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| storyId | number | 是 | 故事ID |

**响应示例**:

```json
{
  "success": true,
  "message": "作品删除成功"
}
```

---

### 5. 下架作品

**接口**: `PATCH /api/v1/admin/stories/:storyId/unpublish`

**权限**: 需要管理员权限

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| storyId | number | 是 | 故事ID |

**响应示例**:

```json
{
  "success": true,
  "message": "作品下架成功",
  "data": {
    "id": 1,
    "title": "故事标题",
    "status": "unpublished",
    "isPublic": false
  }
}
```

---

### 6. 获取用户列表

**接口**: `GET /api/v1/admin/users`

**权限**: 需要管理员权限

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认1 |
| limit | number | 否 | 每页数量，默认10，最大50 |
| role | string | 否 | 角色筛选：all|user|editor|admin |
| status | string | 否 | 状态筛选 |
| search | string | 否 | 搜索关键词 |

**响应示例**:

```json
{
  "success": true,
  "message": "获取用户列表成功",
  "data": {
    "users": [
      {
        "id": 1,
        "username": "testuser",
        "email": "test@example.com",
        "storyCount": 5,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "lastLogin": "2024-01-01T00:00:00.000Z",
        "isActive": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "pages": 5
    }
  }
}
```

**注意**: 用户列表中不包含当前登录的管理员自己。

---

### 7. 禁用/启用用户

**接口**: `PUT /api/v1/admin/users/:userId/status`

**权限**: 需要管理员权限

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | number | 是 | 用户ID |

**请求体**:

```json
{
  "isActive": true
}
```

**响应示例**:

```json
{
  "success": true,
  "message": "用户已启用",
  "data": {
    "id": 1,
    "username": "testuser",
    "isActive": true
  }
}
```

---

### 8. 重置用户密码

**接口**: `PUT /api/v1/admin/users/:userId/reset-password`

**权限**: 需要管理员权限

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | number | 是 | 用户ID |

**响应示例**:

```json
{
  "success": true,
  "message": "密码重置成功",
  "data": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com"
  }
}
```

**注意**: 密码重置为 `default123`，不能重置自己的密码。

---

### 9. 删除用户

**接口**: `DELETE /api/v1/admin/users/:userId`

**权限**: 需要管理员权限

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | number | 是 | 用户ID |

**响应示例**:

```json
{
  "success": true,
  "message": "用户删除成功"
}
```

**注意**: 如果用户有故事，需要先删除所有故事才能删除用户。不能删除自己。

---

## 用户交互

### 1. 收藏/取消收藏故事

**接口**: `POST /api/v1/interactions/stories/:storyId/favorite`

**权限**: 需要登录

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| storyId | number | 是 | 故事ID |

**响应示例**:

```json
{
  "success": true,
  "message": "收藏成功",
  "isFavorite": true,
  "isTemporary": false
}
```

---

### 2. 获取收藏状态

**接口**: `GET /api/v1/interactions/stories/:storyId/favorite/status`

**权限**: 需要登录

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| storyId | number | 是 | 故事ID |

**响应示例**:

```json
{
  "success": true,
  "data": {
    "isFavorited": true,
    "favoriteCount": 10,
    "isTemporary": false
  }
}
```

---

### 3. 获取收藏列表

**接口**: `GET /api/v1/interactions/user/favorites`

**权限**: 需要登录

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认1 |
| limit | number | 否 | 每页数量，默认10 |

**响应示例**:

```json
{
  "success": true,
  "data": {
    "favorites": [
      {
        "story": {
          "id": 1,
          "title": "故事标题",
          "description": "故事简介",
          "author": {
            "username": "author",
            "avatar": "/avatar/default.png"
          },
          "coverImage": "/coverImage/1.png",
          "rating": 4.5
        },
        "collectedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 10,
      "page": 1,
      "pages": 1
    }
  }
}
```

---

### 4. 评分故事

**接口**: `POST /api/v1/interactions/stories/:storyId/rate`

**权限**: 需要登录

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| storyId | number | 是 | 故事ID |

**请求体**:

```json
{
  "rating": 5,
  "comment": "string"
}
```

**参数说明**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| rating | number | 是 | 评分，1-5之间的整数 |
| comment | string | 否 | 评论，最多500字符 |

**响应示例**:

```json
{
  "success": true,
  "message": "评分成功",
  "data": {
    "rating": 5,
    "comment": "很好的故事",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "isTemporary": false
  }
}
```

---

### 5. 获取故事评分信息

**接口**: `GET /api/v1/interactions/stories/:storyId/rating`

**权限**: 公开

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| storyId | number | 是 | 故事ID |

**响应示例**:

```json
{
  "success": true,
  "data": {
    "averageRating": 4.5,
    "ratingCount": 10,
    "ratingDistribution": {
      "1": 0,
      "2": 1,
      "3": 2,
      "4": 3,
      "5": 4
    },
    "userRating": {
      "rating": 5,
      "comment": "很好的故事",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "recentRatings": [
      {
        "rating": 5,
        "comment": "很好的故事",
        "username": "user1",
        "avatar": "/avatar/default.png",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "isTemporary": false
  }
}
```

---

### 6. 删除评分

**接口**: `DELETE /api/v1/interactions/stories/:storyId/rate`

**权限**: 需要登录

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| storyId | number | 是 | 故事ID |

**响应示例**:

```json
{
  "success": true,
  "message": "评分删除成功",
  "data": {
    "isTemporary": false
  }
}
```

---

## AI功能

### 1. AI文本润色

**接口**: `POST /api/v1/ai/polish`

**权限**: 需要登录

**请求体**:

```json
{
  "title": "string",
  "category": "string",
  "content": "string"
}
```

**参数说明**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 是 | 故事标题 |
| category | string | 否 | 故事分类 |
| content | string | 是 | 节点内容 |

**响应示例**:

```json
{
  "success": true,
  "message": "AI润色和扩写成功",
  "data": {
    "content": "润色和扩写后的内容..."
  }
}
```

**注意**: 需要配置 `DASHSCOPE_API_KEY` 环境变量，使用阿里云通义千问模型。

---

## 错误码

### 通用错误码

| 错误码 | 说明 |
|--------|------|
| 10001 | 请求参数错误 |
| 10002 | 邮箱已存在 |
| 10003 | 用户名已存在 |
| 10004 | API端点不存在 |
| 10005 | 未授权 |
| 10006 | 邮箱或密码错误 |
| 10007 | Token过期 |
| 10008 | Token无效 |
| 10009 | 权限不足 |
| 10010 | 资源不存在 |
| 10011 | 参数错误 |
| 10012 | 分类不存在 |
| 10013 | 用户不存在 |
| 10014 | 只能审核待审核状态的作品 |
| 10015 | 只有草稿或被拒绝的故事才能提交审核 |
| 10016 | 故事未发布 |
| 10017 | 该分类下还有故事，无法删除 |
| 10018 | 不能修改自己的角色 |
| 10019 | 不能禁用自己的账户 |
| 10020 | 不能重置自己的密码 / 账户已被封禁 |
| 10021 | 账户已被锁定 |
| 10022 | 该用户还有故事，无法删除 |
| 10030 | 无效的分类ID |
| 10031 | 分类不存在 |
| 10032 | 分类名称已存在 |
| 10034 | 未找到默认分类，无法移动故事 |
| 10040 | 无效的用户ID / 用户不存在 |
| 10041 | 用户名已被使用 |
| 10042 | 邮箱已被使用 |
| 10043 | 当前密码错误 |
| 10044 | 无权访问其他用户的故事列表 |
| 10099 | 系统错误 |

---

## 注意事项

1. **Token有效期**:
   - Access Token: 1天
   - Refresh Token: 7天

2. **分页限制**:
   - 默认每页数量：9-10条
   - 最大每页数量：50-1000条（根据接口不同）

3. **文件上传**:
   - 头像和封面图片需要先上传到服务器，然后使用返回的路径

4. **故事状态**:
   - `draft`: 草稿
   - `pending`: 待审核
   - `published`: 已发布
   - `rejected`: 已拒绝
   - `unpublished`: 已下架

5. **节点类型**:
   - `regular`: 普通节点
   - `branch`: 分支节点
   - `end`: 结局节点

6. **权限说明**:
   - 公开接口：无需认证
   - 需要登录：需要Access Token
   - 需要管理员权限：需要Access Token且用户角色为admin

7. **缓存机制**:
   - 故事列表缓存5分钟
   - 故事详情缓存3分钟
   - 用户统计缓存1分钟

---

## 更新日志

### v1.0.0 (2024-01-01)
- 初始版本发布
- 支持用户注册、登录、认证
- 支持故事创建、编辑、审核
- 支持节点和分支管理
- 支持角色管理
- 支持分类管理
- 支持用户交互（收藏、评分）
- 支持AI文本润色
- 支持管理员功能

---

## 联系方式

如有问题或建议，请联系开发团队。
