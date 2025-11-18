# AI故事创作平台 API 文档

## 概述

AI故事创作平台是一个基于Node.js + Express + MongoDB的后端服务，提供用户注册登录、故事创作、章节管理、分类管理、用户交互等功能的完整API接口。

### 基础信息

- **基础URL**: `http://localhost:5000/api/v1`
- **认证方式**: Bearer Token (JWT)
- **数据格式**: JSON
- **字符编码**: UTF-8

### 通用响应格式

所有API响应都遵循统一格式：

```json
{
  "success": true,
  "message": "操作成功",
  "data": {},
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

### 错误响应格式

```json
{
  "success": false,
  "message": "错误描述",
  "errors": [
    {
      "field": "字段名",
      "message": "错误信息"
    }
  ],
  "code": 10001
}
```

### 错误代码说明

| 错误代码 | 说明 |
|---------|------|
| 10001 | 参数验证失败 |
| 10002 | 邮箱已存在 |
| 10003 | 操作冲突 |
| 10005 | 权限不足 |
| 10006 | 认证失败 |
| 10007 | 令牌无效或过期 |
| 10008 | 刷新令牌过期 |
| 10009 | 请求过于频繁 |
| 10010 | 故事不存在 |
| 10011 | 章节不存在或无权限 |
| 10012 | 分类不存在 |
| 10013 | 数据无效 |
| 10020 | 章节操作权限不足 |
| 10030 | 无效的分类ID |
| 10031 | 分类不存在 |
| 10032 | 分类名称已存在 |
| 10040 | 用户不存在 |
| 10041 | 用户名已被使用 |
| 10042 | 邮箱已被使用 |
| 10043 | 密码错误 |
| 10044 | 无权访问其他用户数据 |

## 认证模块 (Authentication)

### 用户注册

**POST** `/auth/register`

注册新用户账户。

**请求参数:**
```json
{
  "username": "string (3-30字符)",
  "email": "string (有效邮箱格式)",
  "password": "string (最少8位)",
  "confirmPassword": "string (需与password一致)"
}
```

**响应示例:**
```json
{
  "success": true,
  "message": "注册成功",
  "data": {
    "userId": "60f7b3b3b3b3b3b3b3b3b3b3",
    "username": "testuser",
    "email": "test@example.com",
    "avatar": "/avatar/default.png",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 用户登录

**POST** `/auth/login`

用户登录获取访问令牌。

**请求参数:**
```json
{
  "email": "string (有效邮箱格式)",
  "password": "string"
}
```

**响应示例:**
```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "userId": "60f7b3b3b3b3b3b3b3b3b3b3",
    "username": "testuser",
    "email": "test@example.com",
    "avatar": "/avatar/default.png",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 刷新令牌

**POST** `/auth/refresh`

使用刷新令牌获取新的访问令牌。

**请求参数:**
```json
{
  "refreshToken": "string"
}
```

**响应示例:**
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

### 用户登出

**POST** `/auth/logout`

用户登出，使刷新令牌失效。

**请求参数:**
```json
{
  "refreshToken": "string (可选)"
}
```

**响应示例:**
```json
{
  "success": true,
  "message": "已退出登录"
}
```

## 故事模块 (Stories)

### 获取故事列表

**GET** `/stories`

获取故事列表，支持分页、搜索和筛选。

**查询参数:**
- `page`: 页码 (默认: 1)
- `limit`: 每页数量 (默认: 9, 最大: 50)
- `category`: 分类名称
- `search`: 搜索关键词
- `sort`: 排序方式 (latest: 最新, popular: 热门, rating: 评分)

**响应示例:**
```json
{
  "success": true,
  "message": "获取故事列表成功",
  "data": {
    "stories": [
      {
        "id": "60f7b3b3b3b3b3b3b3b3b3b3",
        "title": "我的冒险故事",
        "description": "一个充满冒险的故事",
        "category": {
          "name": "冒险",
          "_id": "60f7b3b3b3b3b3b3b3b3b3b4"
        },
        "author": {
          "username": "author1",
          "avatar": "/avatar/avatar1.png"
        },
        "coverImage": "/coverImage/1.png",
        "view": 100,
        "rating": 4.5,
        "createdAt": "2023-12-01T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 9,
      "total": 50,
      "pages": 6
    }
  }
}
```

### 获取故事详情

**GET** `/stories/:storyId`

获取指定故事的详细信息，包括所有章节。

**路径参数:**
- `storyId`: 故事ID

**响应示例:**
```json
{
  "success": true,
  "message": "获取故事详情成功",
  "data": {
    "id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "title": "我的冒险故事",
    "author": {
      "username": "author1",
      "avatar": "/avatar/avatar1.png"
    },
    "category": {
      "name": "冒险"
    },
    "coverImage": "/coverImage/1.png",
    "description": "一个充满冒险的故事",
    "sections": [
      {
        "id": "60f7b3b3b3b3b3b3b3b3b3b5",
        "order": 1,
        "type": "text",
        "text": "故事开始了...",
        "choices": [],
        "isEnd": false
      }
    ],
    "view": 101,
    "rating": 4.5,
    "createdAt": "2023-12-01T10:00:00.000Z",
    "updatedAt": "2023-12-01T10:00:00.000Z"
  }
}
```

### 创建故事

**POST** `/stories`

创建新故事（需要认证）。

**请求头:**
```
Authorization: Bearer <token>
```

**请求参数:**
```json
{
  "title": "string (必填, 最大100字符)",
  "categoryId": "string (必填, 分类ID)",
  "description": "string (必填, 最大500字符)",
  "coverImage": "string (可选, 有效URL)"
}
```

**响应示例:**
```json
{
  "success": true,
  "message": "创建故事成功",
  "data": {
    "id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "title": "新故事标题"
  }
}
```

### 更新故事

**PUT** `/stories/:storyId`

更新故事信息（需要认证，仅作者可操作）。

**路径参数:**
- `storyId`: 故事ID

**请求参数:**
```json
{
  "title": "string (可选)",
  "description": "string (可选)",
  "categoryId": "string (可选)",
  "coverImage": "string (可选)"
}
```

**响应示例:**
```json
{
  "success": true,
  "message": "故事更新成功"
}
```

### 删除故事

**DELETE** `/stories/:storyId`

删除故事及其所有章节（需要认证，仅作者可操作）。

**路径参数:**
- `storyId`: 故事ID

**响应示例:**
```json
{
  "success": true,
  "message": "故事及关联章节已删除"
}
```

### 获取故事图谱

**GET** `/stories/:storyId/graph`

获取故事的可视化图谱数据。

**路径参数:**
- `storyId`: 故事ID

**响应示例:**
```json
{
  "success": true,
  "message": "获取故事图谱成功",
  "data": {
    "story": {
      "id": "60f7b3b3b3b3b3b3b3b3b3b3",
      "title": "我的冒险故事",
      "author": {
        "username": "author1"
      },
      "category": {
        "name": "冒险"
      }
    },
    "nodes": [
      {
        "id": "60f7b3b3b3b3b3b3b3b3b3b5",
        "temporaryId": "temp_1",
        "type": "text",
        "order": 1,
        "title": "开始",
        "text": "故事开始了...",
        "visualPosition": { "x": 0, "y": 0 },
        "isEnd": false
      }
    ],
    "connections": [
      {
        "id": "connection_1",
        "sourceId": "60f7b3b3b3b3b3b3b3b3b3b5",
        "targetId": "60f7b3b3b3b3b3b3b3b3b3b6",
        "choiceText": "选择A",
        "choiceDescription": "描述"
      }
    ]
  }
}
```

### 保存故事图谱

**PUT** `/stories/:storyId/graph`

批量保存故事图谱数据（需要认证，仅作者可操作）。

**路径参数:**
- `storyId`: 故事ID

**请求参数:**
```json
{
  "nodes": [
    {
      "id": "string (可选, 现有节点ID)",
      "temporaryId": "string (可选, 临时ID)",
      "order": "number",
      "type": "text|choice",
      "title": "string (可选)",
      "text": "string",
      "choices": [
        {
          "id": "string (可选)",
          "text": "string",
          "description": "string (可选)",
          "nextSectionId": "string (可选)",
          "nextTemporaryId": "string (可选)"
        }
      ],
      "isEnd": "boolean",
      "visualPosition": {
        "x": "number",
        "y": "number"
      }
    }
  ],
  "metadata": {
    "lastModified": "string (可选)"
  }
}
```

**响应示例:**
```json
{
  "success": true,
  "message": "故事图谱保存成功",
  "data": {
    "updated": 5,
    "created": 2,
    "deleted": 1,
    "mapping": {
      "temp_1": "60f7b3b3b3b3b3b3b3b3b3b5",
      "temp_2": "60f7b3b3b3b3b3b3b3b3b3b6"
    }
  }
}
```

## 章节模块 (Sections)

### 获取故事章节列表

**GET** `/sections/:storyId`

获取指定故事的所有章节。

**路径参数:**
- `storyId`: 故事ID

**响应示例:**
```json
{
  "success": true,
  "data": [
    {
      "id": "60f7b3b3b3b3b3b3b3b3b3b5",
      "temporaryId": "temp_1",
      "order": 1,
      "type": "text",
      "title": "开始",
      "text": "故事开始了...",
      "visualPosition": { "x": 0, "y": 0 },
      "choices": [],
      "isEnd": false,
      "createdAt": "2023-12-01T10:00:00.000Z",
      "statistics": {
        "viewCount": 10,
        "avgReadTime": 30
      }
    }
  ]
}
```

### 获取章节详情

**GET** `/sections/:storyId/:sectionId`

获取指定章节的详细信息。

**路径参数:**
- `storyId`: 故事ID
- `sectionId`: 章节ID或临时ID

**响应示例:**
```json
{
  "success": true,
  "data": {
    "id": "60f7b3b3b3b3b3b3b3b3b3b5",
    "temporaryId": "temp_1",
    "storyId": "60f7b3b3b3b3b3b3b3b3b3b3",
    "order": 1,
    "type": "text",
    "title": "开始",
    "text": "故事开始了...",
    "visualPosition": { "x": 0, "y": 0 },
    "choices": [],
    "isEnd": false,
    "createdAt": "2023-12-01T10:00:00.000Z",
    "updatedAt": "2023-12-01T10:00:00.000Z",
    "statistics": {
      "viewCount": 11,
      "avgReadTime": 30
    }
  }
}
```

### 创建章节

**POST** `/sections/:storyId`

创建新章节（需要认证，仅故事作者可操作）。

**路径参数:**
- `storyId`: 故事ID

**请求参数:**
```json
{
  "order": "number (必填, 正整数)",
  "type": "text|choice (必填)",
  "text": "string (必填, 最大2000字符)",
  "title": "string (可选)",
  "temporaryId": "string (可选)",
  "choices": [
    {
      "id": "string (可选)",
      "text": "string (必填)",
      "description": "string (可选)",
      "nextSectionId": "string (可选)",
      "nextTemporaryId": "string (可选)"
    }
  ],
  "isEnd": "boolean (可选, 默认false)",
  "visualPosition": {
    "x": "number (可选, 默认0)",
    "y": "number (可选, 默认0)"
  }
}
```

**响应示例:**
```json
{
  "success": true,
  "message": "章节创建成功",
  "data": {
    "id": "60f7b3b3b3b3b3b3b3b3b3b5",
    "temporaryId": "temp_1",
    "order": 1,
    "type": "text"
  }
}
```

### 更新章节

**PUT** `/sections/:storyId/:sectionId`

更新章节信息（需要认证，仅故事作者可操作）。

**路径参数:**
- `storyId`: 故事ID
- `sectionId`: 章节ID

**请求参数:**
```json
{
  "order": "number (可选)",
  "type": "text|choice (可选)",
  "text": "string (可选)",
  "title": "string (可选)",
  "temporaryId": "string (可选)",
  "choices": "array (可选)",
  "isEnd": "boolean (可选)",
  "visualPosition": {
    "x": "number (可选)",
    "y": "number (可选)"
  }
}
```

**响应示例:**
```json
{
  "success": true,
  "message": "章节更新成功"
}
```

### 删除章节

**DELETE** `/sections/:storyId/:sectionId`

删除章节（需要认证，仅故事作者可操作）。

**路径参数:**
- `storyId`: 故事ID
- `sectionId`: 章节ID

**响应示例:**
```json
{
  "success": true,
  "message": "章节删除成功"
}
```

## 分类模块 (Categories)

### 获取分类列表

**GET** `/categories`

获取所有分类列表。

**查询参数:**
- `sort`: 排序方式 (storyCount: 按故事数量, createdAt: 按创建时间)

**响应示例:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "_id": "60f7b3b3b3b3b3b3b3b3b3b4",
      "name": "冒险",
      "description": "充满冒险的故事",
      "storyCount": 25,
      "createdAt": "2023-12-01T10:00:00.000Z",
      "updatedAt": "2023-12-01T10:00:00.000Z"
    }
  ]
}
```

### 获取分类详情

**GET** `/categories/:id`

获取指定分类的详细信息。

**路径参数:**
- `id`: 分类ID

**响应示例:**
```json
{
  "success": true,
  "data": {
    "_id": "60f7b3b3b3b3b3b3b3b3b3b4",
    "name": "冒险",
    "description": "充满冒险的故事",
    "storyCount": 25,
    "createdAt": "2023-12-01T10:00:00.000Z",
    "updatedAt": "2023-12-01T10:00:00.000Z"
  }
}
```

### 创建分类

**POST** `/categories`

创建新分类（需要管理员权限）。

**请求参数:**
```json
{
  "name": "string (必填, 最大50字符)",
  "description": "string (可选, 最大200字符)"
}
```

**响应示例:**
```json
{
  "success": true,
  "message": "分类创建成功",
  "data": {
    "_id": "60f7b3b3b3b3b3b3b3b3b3b4",
    "name": "新分类",
    "description": "分类描述",
    "storyCount": 0,
    "createdAt": "2023-12-01T10:00:00.000Z",
    "updatedAt": "2023-12-01T10:00:00.000Z"
  }
}
```

### 更新分类

**PUT** `/categories/:id`

更新分类信息（需要管理员权限）。

**路径参数:**
- `id`: 分类ID

**请求参数:**
```json
{
  "name": "string (可选)",
  "description": "string (可选)"
}
```

**响应示例:**
```json
{
  "success": true,
  "message": "分类更新成功",
  "data": {
    "_id": "60f7b3b3b3b3b3b3b3b3b3b4",
    "name": "更新后的分类名",
    "description": "更新后的描述",
    "storyCount": 25,
    "createdAt": "2023-12-01T10:00:00.000Z",
    "updatedAt": "2023-12-01T11:00:00.000Z"
  }
}
```

### 删除分类

**DELETE** `/categories/:id`

删除分类（需要管理员权限）。

**路径参数:**
- `id`: 分类ID

**响应示例:**
```json
{
  "success": true,
  "message": "分类删除成功"
}
```

## 用户模块 (Users)

### 获取当前用户信息

**GET** `/users/me`

获取当前登录用户的详细信息（需要认证）。

**响应示例:**
```json
{
  "success": true,
  "data": {
    "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "username": "testuser",
    "email": "test@example.com",
    "avatar": "/avatar/default.png",
    "bio": "这个人很懒，什么都没留下",
    "role": "user",
    "isActive": true,
    "tokenVersion": 1,
    "lastLogin": "2023-12-01T10:00:00.000Z",
    "createdAt": "2023-12-01T10:00:00.000Z",
    "updatedAt": "2023-12-01T10:00:00.000Z"
  }
}
```

### 更新用户信息

**PUT** `/users/me`

更新当前用户信息（需要认证）。

**请求参数:**
```json
{
  "username": "string (可选, 3-50字符)",
  "email": "string (可选, 有效邮箱格式)",
  "bio": "string (可选, 最大200字符)",
  "avatar": "string (可选)"
}
```

**响应示例:**
```json
{
  "success": true,
  "message": "用户信息更新成功",
  "data": {
    "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "username": "newusername",
    "email": "newemail@example.com",
    "avatar": "/avatar/newavatar.png",
    "bio": "更新后的个人简介",
    "role": "user",
    "isActive": true,
    "createdAt": "2023-12-01T10:00:00.000Z",
    "updatedAt": "2023-12-01T11:00:00.000Z"
  }
}
```

### 修改密码

**PUT** `/users/me/change-password`

修改用户密码（需要认证）。

**请求参数:**
```json
{
  "currentPassword": "string (必填)",
  "newPassword": "string (必填, 最少6字符)"
}
```

**响应示例:**
```json
{
  "success": true,
  "message": "密码修改成功"
}
```

### 获取用户故事列表

**GET** `/users/:userId/stories`

获取指定用户创建的故事列表（需要认证，仅可查看自己的故事）。

**路径参数:**
- `userId`: 用户ID

**查询参数:**
- `page`: 页码 (默认: 1)
- `limit`: 每页数量 (默认: 10)

**响应示例:**
```json
{
  "success": true,
  "count": 5,
  "total": 20,
  "pages": 4,
  "page": 1,
  "data": [
    {
      "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
      "title": "我的故事",
      "description": "故事描述",
      "author": "60f7b3b3b3b3b3b3b3b3b3b3",
      "category": "60f7b3b3b3b3b3b3b3b3b3b4",
      "coverImage": "/coverImage/1.png",
      "view": 100,
      "rating": 4.5,
      "createdAt": "2023-12-01T10:00:00.000Z",
      "updatedAt": "2023-12-01T10:00:00.000Z"
    }
  ]
}
```

## 用户交互模块 (Interactions)

### 收藏/取消收藏故事

**POST** `/interactions/stories/:storyId/favorite`

收藏或取消收藏故事（需要认证）。

**路径参数:**
- `storyId`: 故事ID

**响应示例:**
```json
{
  "success": true,
  "message": "收藏成功",
  "isFavorite": true
}
```

或取消收藏：
```json
{
  "success": true,
  "message": "取消收藏成功",
  "isFavorite": false
}
```

### 获取收藏状态

**GET** `/interactions/stories/:storyId/favorite/status`

获取用户对指定故事的收藏状态（需要认证）。

**路径参数:**
- `storyId`: 故事ID

**响应示例:**
```json
{
  "success": true,
  "data": {
    "isFavorite": true,
    "favoriteCount": 25
  }
}
```

### 获取用户收藏列表

**GET** `/interactions/user/favorites`

获取当前用户的收藏故事列表（需要认证）。

**查询参数:**
- `page`: 页码 (默认: 1)
- `limit`: 每页数量 (默认: 10)

**响应示例:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
      "title": "收藏的故事",
      "description": "故事描述",
      "author": {
        "username": "author1",
        "avatar": "/avatar/author1.png"
      },
      "coverImage": "/coverImage/1.png",
      "rating": 4.5,
      "createdAt": "2023-12-01T10:00:00.000Z",
      "updatedAt": "2023-12-01T10:00:00.000Z",
      "favoriteCount": 30,
      "viewCount": 150
    }
  ],
  "pagination": {
    "total": 10,
    "page": 1,
    "pages": 1
  }
}
```

### 评分故事

**POST** `/interactions/stories/:storyId/rate`

对故事进行评分（需要认证）。

**路径参数:**
- `storyId`: 故事ID

**请求参数:**
```json
{
  "rating": "number (必填, 1-5整数)",
  "comment": "string (可选, 最大500字符)"
}
```

**响应示例:**
```json
{
  "success": true,
  "message": "评分成功",
  "data": {
    "rating": 5,
    "comment": "很棒的故事！",
    "story": {
      "rating": 4.8,
      "ratingCount": 25
    }
  }
}
```

### 获取用户评分

**GET** `/interactions/stories/:storyId/rating/user`

获取用户对指定故事的评分（需要认证）。

**路径参数:**
- `storyId`: 故事ID

**响应示例:**
```json
{
  "success": true,
  "data": {
    "rating": 5,
    "comment": "很棒的故事！",
    "createdAt": "2023-12-01T10:00:00.000Z",
    "updatedAt": "2023-12-01T10:00:00.000Z"
  }
}
```

### 获取故事评分列表

**GET** `/interactions/stories/:storyId/ratings`

获取故事的所有评分列表。

**路径参数:**
- `storyId`: 故事ID

**查询参数:**
- `page`: 页码 (默认: 1)
- `limit`: 每页数量 (默认: 10)

**响应示例:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
      "userId": "60f7b3b3b3b3b3b3b3b3b3b4",
      "storyId": "60f7b3b3b3b3b3b3b3b3b3b5",
      "rating": 5,
      "comment": "很棒的故事！",
      "user": {
        "username": "reviewer1",
        "avatar": "/avatar/reviewer1.png"
      },
      "createdAt": "2023-12-01T10:00:00.000Z",
      "updatedAt": "2023-12-01T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "pages": 3
  }
}
```

## 数据模型

### User (用户模型)

```json
{
  "_id": "ObjectId",
  "username": "string (3-30字符, 唯一)",
  "email": "string (邮箱格式, 唯一)",
  "password": "string (加密存储)",
  "avatar": "string (默认: /avatar/default.png)",
  "bio": "string (最大200字符)",
  "role": "string (user|editor|admin, 默认: user)",
  "isActive": "boolean (默认: true)",
  "tokenVersion": "number (默认: 1)",
  "lastLogin": "Date",
  "loginAttempts": "number",
  "lockUntil": "Date",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Story (故事模型)

```json
{
  "_id": "ObjectId",
  "title": "string (最大100字符)",
  "author": "ObjectId (引用User)",
  "category": "ObjectId (引用Category)",
  "coverImage": "string (默认: /coverImage/1.png)",
  "description": "string (最大500字符)",
  "rating": "number (0-5, 默认: 0)",
  "view": "number (默认: 0)",
  "favoriteCount": "number (默认: 0)",
  "ratingCount": "number (默认: 0)",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### StorySection (故事章节模型)

```json
{
  "_id": "ObjectId",
  "storyId": "ObjectId (引用Story)",
  "temporaryId": "string",
  "type": "string (text|choice)",
  "order": "number",
  "title": "string",
  "text": "string",
  "visualPosition": {
    "x": "number (默认: 0)",
    "y": "number (默认: 0)"
  },
  "choices": [
    {
      "id": "string",
      "text": "string",
      "description": "string",
      "nextSectionId": "ObjectId",
      "nextTemporaryId": "string"
    }
  ],
  "isEnd": "boolean (默认: false)",
  "statistics": {
    "viewCount": "number (默认: 0)",
    "avgReadTime": "number (默认: 0)"
  },
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Category (分类模型)

```json
{
  "_id": "ObjectId",
  "name": "string (唯一)",
  "description": "string",
  "storyCount": "number (默认: 0)",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### UserStoryFavorite (用户收藏模型)

```json
{
  "_id": "ObjectId",
  "userId": "ObjectId (引用User)",
  "storyId": "ObjectId (引用Story)",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### UserStoryRating (用户评分模型)

```json
{
  "_id": "ObjectId",
  "userId": "ObjectId (引用User)",
  "storyId": "ObjectId (引用Story)",
  "rating": "number (1-5)",
  "comment": "string (最大500字符)",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

## 安全特性

### 认证机制
- JWT双令牌机制（Access Token + Refresh Token）
- Access Token有效期：1天（可配置）
- Refresh Token有效期：7天（可配置）
- 令牌版本控制，密码更改后自动吊销旧令牌

### 安全中间件
- Helmet安全头设置
- CORS跨域配置
- 请求体大小限制（1MB）
- 参数验证和清理

### 账户安全
- 密码强度验证（最少8位）
- 账户锁定机制（5次失败后锁定30分钟）
- 登录尝试计数
- 账户状态管理

### 权限控制
- 基于角色的访问控制（RBAC）
- 资源所有权验证
- API端点权限保护

## 性能优化

### 数据库优化
- 复合索引设计
- 查询优化
- 连接池管理

### 缓存策略
- Redis缓存热点数据
- 故事列表缓存（5分钟TTL）
- 故事详情缓存（3分钟TTL）
- 故事图谱缓存（2分钟TTL）

### 批量操作
- 批量创建章节
- 批量更新统计数据
- 事务处理保证数据一致性

## 错误处理

### 统一错误格式
所有错误都通过统一的错误处理中间件处理，返回标准格式的错误响应。

### 错误分类
- 参数验证错误（400）
- 认证授权错误（401/403）
- 资源不存在错误（404）
- 服务器内部错误（500）
- 业务逻辑错误（自定义错误码）

### 日志记录
- 安全事件日志
- 错误详情日志
- 性能监控日志

## 部署说明

### 环境变量

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ai-story
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=7d
CLIENT_ORIGIN=http://localhost:8000
```

### 启动命令

```bash
# 开发环境
npm run dev

# 生产环境
npm start

# 运行测试
npm test

# 代码检查
npm run lint
```

### 健康检查

**GET** `/healthz`

返回服务健康状态。

**响应示例:**
```json
{
  "status": "ok"
}
```

## 版本信息

**GET** `/api/v1`

获取API版本信息和可用端点列表。

**响应示例:**
```json
{
  "message": "欢迎使用AI故事创作平台API",
  "version": "1.0.0",
  "endpoints": [
    "/api/v1/auth",
    "/api/v1/stories",
    "/api/v1/sections",
    "/api/v1/categories",
    "/api/v1/users",
    "/api/v1/interactions"
  ]
}
```

---

*本文档基于AI故事创作平台后端代码自动生成，最后更新时间：2023年12月*