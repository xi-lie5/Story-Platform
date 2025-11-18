# StoryForge API 文档

## 概述

StoryForge 是一个AI交互式故事生成平台，提供用户认证、故事创建、故事管理、收藏评分等核心功能。本文档详细描述了系统的所有API接口。

**基础信息**
- 基础URL: `http://localhost:5000`
- API版本: v1
- 数据格式: JSON
- 字符编码: UTF-8

## 认证机制

系统使用JWT（JSON Web Token）进行身份认证。

### 请求头格式
```
Authorization: Bearer <token>
Content-Type: application/json
```

### Token获取
通过登录接口获取token，token有效期为24小时。

---

## 1. 用户认证模块

### 1.1 用户注册

**接口地址**: `POST /api/v1/auth/register`

**请求参数**:
```json
{
  "username": "string",     // 用户名，必填，3-20字符
  "email": "string",        // 邮箱，必填，需验证格式
  "password": "string"      // 密码，必填，6-50字符
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "注册成功",
  "data": {
    "user": {
      "id": "string",
      "username": "string",
      "email": "string",
      "role": "user",
      "isActive": true,
      "createdAt": "2023-01-01T00:00:00.000Z"
    },
    "token": "string",
    "refreshToken": "string"
  }
}
```

### 1.2 用户登录

**接口地址**: `POST /api/v1/auth/login`

**请求参数**:
```json
{
  "email": "string",        // 邮箱，必填
  "password": "string"      // 密码，必填
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "user": {
      "id": "string",
      "username": "string",
      "email": "string",
      "role": "user",
      "isActive": true,
      "lastLoginAt": "2023-01-01T00:00:00.000Z"
    },
    "token": "string",
    "refreshToken": "string"
  }
}
```

### 1.3 刷新Token

**接口地址**: `POST /api/v1/auth/refresh`

**请求头**: `Authorization: Bearer <refreshToken>`

**响应示例**:
```json
{
  "success": true,
  "message": "Token刷新成功",
  "data": {
    "token": "string",
    "refreshToken": "string"
  }
}
```

### 1.4 用户登出

**接口地址**: `POST /api/v1/auth/logout`

**请求头**: `Authorization: Bearer <token>`

**响应示例**:
```json
{
  "success": true,
  "message": "登出成功"
}
```

### 1.5 忘记密码

**接口地址**: `POST /api/v1/auth/forgot-password`

**请求参数**:
```json
{
  "email": "string"         // 邮箱，必填
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "密码重置邮件已发送"
}
```

### 1.6 重置密码

**接口地址**: `POST /api/v1/auth/reset-password`

**请求参数**:
```json
{
  "token": "string",        // 重置token，必填
  "newPassword": "string"   // 新密码，必填
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "密码重置成功"
}
```

---

## 2. 用户管理模块

### 2.1 获取当前用户信息

**接口地址**: `GET /api/v1/users/me`

**请求头**: `Authorization: Bearer <token>`

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": "string",
    "username": "string",
    "email": "string",
    "role": "user",
    "avatar": "string",
    "isActive": true,
    "createdAt": "2023-01-01T00:00:00.000Z",
    "lastLoginAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### 2.2 更新当前用户信息

**接口地址**: `PUT /api/v1/users/me`

**请求头**: `Authorization: Bearer <token>`

**请求参数**:
```json
{
  "username": "string",     // 用户名，可选
  "email": "string",        // 邮箱，可选
  "avatar": "string"        // 头像URL，可选
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "用户信息更新成功",
  "data": {
    "id": "string",
    "username": "string",
    "email": "string",
    "avatar": "string",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### 2.3 修改密码

**接口地址**: `PUT /api/v1/users/me/change-password`

**请求头**: `Authorization: Bearer <token>`

**请求参数**:
```json
{
  "currentPassword": "string",  // 当前密码，必填
  "newPassword": "string"      // 新密码，必填
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "密码修改成功"
}
```

### 2.4 获取用户故事列表

**接口地址**: `GET /api/v1/users/:userId/stories`

**查询参数**:
- `page`: 页码，默认1
- `limit`: 每页数量，默认10，最大50
- `status`: 故事状态筛选（draft/published/completed）

**响应示例**:
```json
{
  "success": true,
  "data": {
    "stories": [
      {
        "id": "string",
        "title": "string",
        "description": "string",
        "coverImage": "string",
        "status": "string",
        "viewCount": 0,
        "averageRating": 0,
        "favoriteCount": 0,
        "createdAt": "2023-01-01T00:00:00.000Z",
        "updatedAt": "2023-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 0,
      "totalPages": 0
    }
  }
}
```

### 2.5 获取用户公开资料

**接口地址**: `GET /api/v1/users/:userId`

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": "string",
    "username": "string",
    "avatar": "string",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "stats": {
      "storyCount": 0,
      "totalViews": 0,
      "totalFavorites": 0
    }
  }
}
```

---

## 3. 故事管理模块

### 3.1 创建故事

**接口地址**: `POST /api/v1/stories`

**请求头**: `Authorization: Bearer <token>`

**请求参数**:
```json
{
  "title": "string",           // 故事标题，必填，1-100字符
  "description": "string",     // 故事简介，可选，最大500字符
  "categoryId": "string",      // 分类ID，必填
  "coverImage": "string",      // 封面图URL，可选
  "tags": ["string"],          // 标签数组，可选
  "settings": {                // AI辅助设置，可选
    "aiPlot": true,            // 自动生成剧情分支
    "aiCharacter": true,        // 生成角色性格
    "aiWriting": false         // AI辅助续写
  }
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "故事创建成功",
  "data": {
    "id": "string",
    "title": "string",
    "description": "string",
    "author": {
      "id": "string",
      "username": "string"
    },
    "category": {
      "id": "string",
      "name": "string"
    },
    "status": "draft",
    "viewCount": 0,
    "averageRating": 0,
    "favoriteCount": 0,
    "createdAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### 3.2 获取故事列表

**接口地址**: `GET /api/v1/stories`

**查询参数**:
- `page`: 页码，默认1
- `limit`: 每页数量，默认10，最大50
- `categoryId`: 分类ID筛选
- `authorId`: 作者ID筛选
- `status`: 状态筛选（draft/published/completed）
- `sort`: 排序方式（latest/popular/rating/views）
- `search`: 搜索关键词

**响应示例**:
```json
{
  "success": true,
  "data": {
    "stories": [
      {
        "id": "string",
        "title": "string",
        "description": "string",
        "coverImage": "string",
        "author": {
          "id": "string",
          "username": "string",
          "avatar": "string"
        },
        "category": {
          "id": "string",
          "name": "string"
        },
        "status": "published",
        "viewCount": 0,
        "averageRating": 0,
        "favoriteCount": 0,
        "tags": ["string"],
        "createdAt": "2023-01-01T00:00:00.000Z",
        "updatedAt": "2023-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 0,
      "totalPages": 0
    },
    "filters": {
      "categories": [
        {
          "id": "string",
          "name": "string",
          "storyCount": 0
        }
      ]
    }
  }
}
```

### 3.3 获取故事详情

**接口地址**: `GET /api/v1/stories/:storyId`

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": "string",
    "title": "string",
    "description": "string",
    "coverImage": "string",
    "author": {
      "id": "string",
      "username": "string",
      "avatar": "string"
    },
    "category": {
      "id": "string",
      "name": "string"
    },
    "status": "published",
    "viewCount": 0,
    "averageRating": 0,
    "favoriteCount": 0,
    "tags": ["string"],
    "settings": {
      "aiPlot": true,
      "aiCharacter": true,
      "aiWriting": false
    },
    "sections": [
      {
        "id": "string",
        "type": "text",
        "order": 1,
        "title": "string",
        "text": "string",
        "choices": [
          {
            "id": "string",
            "text": "string",
            "nextSectionId": "string"
          }
        ],
        "isEnd": false
      }
    ],
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### 3.4 更新故事

**接口地址**: `PUT /api/v1/stories/:storyId`

**请求头**: `Authorization: Bearer <token>`

**权限要求**: 仅故事作者或管理员

**请求参数**:
```json
{
  "title": "string",           // 可选
  "description": "string",     // 可选
  "categoryId": "string",      // 可选
  "coverImage": "string",      // 可选
  "status": "string",          // 可选（draft/published/completed）
  "tags": ["string"],          // 可选
  "settings": {                // 可选
    "aiPlot": true,
    "aiCharacter": true,
    "aiWriting": false
  }
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "故事更新成功",
  "data": {
    "id": "string",
    "title": "string",
    "description": "string",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### 3.5 删除故事

**接口地址**: `DELETE /api/v1/stories/:storyId`

**请求头**: `Authorization: Bearer <token>`

**权限要求**: 仅故事作者或管理员

**响应示例**:
```json
{
  "success": true,
  "message": "故事删除成功"
}
```

---

## 4. 故事章节管理模块

### 4.1 创建故事章节

**接口地址**: `POST /api/v1/stories/:storyId/sections`

**请求头**: `Authorization: Bearer <token>`

**权限要求**: 仅故事作者或管理员

**请求参数**:
```json
{
  "type": "text",              // 章节类型，必填（text/choice）
  "title": "string",           // 章节标题，可选
  "text": "string",            // 章节内容，文本类型时必填
  "order": 1,                  // 排序，必填
  "choices": [                 // 选择类型时必填
    {
      "text": "string",        // 选项文本，必填
      "nextSectionId": "string" // 下一章节ID，可选
    }
  ],
  "isEnd": false,              // 是否为结局，可选
  "visualPosition": {          // 可视化位置，可选
    "x": 0,
    "y": 0
  }
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "章节创建成功",
  "data": {
    "id": "string",
    "storyId": "string",
    "type": "text",
    "order": 1,
    "title": "string",
    "text": "string",
    "choices": [],
    "isEnd": false,
    "createdAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### 4.2 获取故事章节列表

**接口地址**: `GET /api/v1/stories/:storyId/sections`

**查询参数**:
- `page`: 页码，默认1
- `limit`: 每页数量，默认50
- `type`: 章节类型筛选

**响应示例**:
```json
{
  "success": true,
  "data": {
    "sections": [
      {
        "id": "string",
        "storyId": "string",
        "type": "text",
        "order": 1,
        "title": "string",
        "text": "string",
        "choices": [
          {
            "id": "string",
            "text": "string",
            "nextSectionId": "string"
          }
        ],
        "isEnd": false,
        "statistics": {
          "viewCount": 0,
          "choiceCount": {}
        },
        "createdAt": "2023-01-01T00:00:00.000Z",
        "updatedAt": "2023-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 0,
      "totalPages": 0
    }
  }
}
```

### 4.3 更新故事章节

**接口地址**: `PUT /api/v1/stories/:storyId/sections/:sectionId`

**请求头**: `Authorization: Bearer <token>`

**权限要求**: 仅故事作者或管理员

**请求参数**:
```json
{
  "title": "string",           // 可选
  "text": "string",            // 可选
  "order": 1,                  // 可选
  "choices": [                 // 可选
    {
      "id": "string",          // 选项ID，更新时必填
      "text": "string",        // 选项文本，必填
      "nextSectionId": "string" // 下一章节ID，可选
    }
  ],
  "isEnd": false,              // 可选
  "visualPosition": {          // 可选
    "x": 0,
    "y": 0
  }
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "章节更新成功",
  "data": {
    "id": "string",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### 4.4 删除故事章节

**接口地址**: `DELETE /api/v1/stories/:storyId/sections/:sectionId`

**请求头**: `Authorization: Bearer <token>`

**权限要求**: 仅故事作者或管理员

**响应示例**:
```json
{
  "success": true,
  "message": "章节删除成功"
}
```

### 4.5 批量创建章节

**接口地址**: `POST /api/v1/stories/:storyId/sections/batch`

**请求头**: `Authorization: Bearer <token>`

**权限要求**: 仅故事作者或管理员

**请求参数**:
```json
{
  "sections": [                // 章节数组，必填
    {
      "type": "text",
      "title": "string",
      "text": "string",
      "order": 1,
      "choices": [],
      "isEnd": false
    }
  ]
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "批量创建章节成功",
  "data": {
    "created": [
      {
        "id": "string",
        "order": 1
      }
    ],
    "failed": []
  }
}
```

---

## 5. 用户交互模块

### 5.1 收藏/取消收藏故事

**接口地址**: `POST /api/v1/stories/:storyId/favorite`

**请求头**: `Authorization: Bearer <token>`

**响应示例**:
```json
{
  "success": true,
  "message": "收藏成功",
  "data": {
    "isFavorited": true,
    "favoriteCount": 1
  }
}
```

### 5.2 获取故事收藏状态

**接口地址**: `GET /api/v1/stories/:storyId/favorite/status`

**请求头**: `Authorization: Bearer <token>`

**响应示例**:
```json
{
  "success": true,
  "data": {
    "isFavorited": true,
    "favoriteCount": 10
  }
}
```

### 5.3 获取用户收藏列表

**接口地址**: `GET /api/v1/user/favorites`

**请求头**: `Authorization: Bearer <token>`

**查询参数**:
- `page`: 页码，默认1
- `limit`: 每页数量，默认10

**响应示例**:
```json
{
  "success": true,
  "data": {
    "favorites": [
      {
        "id": "string",
        "story": {
          "id": "string",
          "title": "string",
          "description": "string",
          "coverImage": "string",
          "author": {
            "id": "string",
            "username": "string"
          },
          "category": {
            "id": "string",
            "name": "string"
          },
          "averageRating": 0,
          "favoriteCount": 0,
          "createdAt": "2023-01-01T00:00:00.000Z"
        },
        "collectedAt": "2023-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 0,
      "totalPages": 0
    }
  }
}
```

### 5.4 评分故事

**接口地址**: `POST /api/v1/stories/:storyId/rate`

**请求头**: `Authorization: Bearer <token>`

**请求参数**:
```json
{
  "rating": 5,                 // 评分，必填，1-5整数
  "comment": "string"          // 评价内容，可选，最大500字符
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "评分成功",
  "data": {
    "userRating": {
      "rating": 5,
      "comment": "string",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    },
    "storyStats": {
      "averageRating": 4.5,
      "totalRatings": 10,
      "ratingDistribution": {
        "1": 0,
        "2": 1,
        "3": 2,
        "4": 3,
        "5": 4
      }
    }
  }
}
```

### 5.5 获取故事评分信息

**接口地址**: `GET /api/v1/stories/:storyId/rating`

**响应示例**:
```json
{
  "success": true,
  "data": {
    "averageRating": 4.5,
    "totalRatings": 10,
    "ratingDistribution": {
      "1": 0,
      "2": 1,
      "3": 2,
      "4": 3,
      "5": 4
    },
    "userRating": {             // 用户已登录时显示
      "rating": 5,
      "comment": "string",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
  }
}
```

### 5.6 删除故事评分

**接口地址**: `DELETE /api/v1/stories/:storyId/rate`

**请求头**: `Authorization: Bearer <token>`

**响应示例**:
```json
{
  "success": true,
  "message": "评分删除成功",
  "data": {
    "storyStats": {
      "averageRating": 4.2,
      "totalRatings": 9,
      "ratingDistribution": {
        "1": 0,
        "2": 1,
        "3": 2,
        "4": 3,
        "5": 3
      }
    }
  }
}
```

---

## 6. 分类管理模块

### 6.1 获取分类列表

**接口地址**: `GET /api/v1/categories`

**查询参数**:
- `page`: 页码，默认1
- `limit`: 每页数量，默认50
- `includeStoryCount`: 是否包含故事数量，默认false

**响应示例**:
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "string",
        "name": "string",
        "description": "string",
        "storyCount": 0,
        "createdAt": "2023-01-01T00:00:00.000Z",
        "updatedAt": "2023-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 0,
      "totalPages": 0
    }
  }
}
```

### 6.2 获取分类详情

**接口地址**: `GET /api/v1/categories/:id`

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": "string",
    "name": "string",
    "description": "string",
    "storyCount": 0,
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### 6.3 创建分类

**接口地址**: `POST /api/v1/categories`

**请求头**: `Authorization: Bearer <token>`

**权限要求**: 仅管理员

**请求参数**:
```json
{
  "name": "string",            // 分类名称，必填，唯一
  "description": "string"      // 分类描述，可选
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "分类创建成功",
  "data": {
    "id": "string",
    "name": "string",
    "description": "string",
    "storyCount": 0,
    "createdAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### 6.4 更新分类

**接口地址**: `PUT /api/v1/categories/:id`

**请求头**: `Authorization: Bearer <token>`

**权限要求**: 仅管理员

**请求参数**:
```json
{
  "name": "string",            // 可选
  "description": "string"     // 可选
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "分类更新成功",
  "data": {
    "id": "string",
    "name": "string",
    "description": "string",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### 6.5 删除分类

**接口地址**: `DELETE /api/v1/categories/:id`

**请求头**: `Authorization: Bearer <token>`

**权限要求**: 仅管理员

**响应示例**:
```json
{
  "success": true,
  "message": "分类删除成功"
}
```

---

## 7. 收藏管理模块

### 7.1 获取用户收藏列表

**接口地址**: `GET /api/v1/users/collections`

**请求头**: `Authorization: Bearer <token>`

**查询参数**:
- `page`: 页码，默认1
- `limit`: 每页数量，默认10

**响应示例**:
```json
{
  "success": true,
  "data": {
    "collections": [
      {
        "id": "string",
        "user": {
          "id": "string",
          "username": "string"
        },
        "story": {
          "id": "string",
          "title": "string",
          "description": "string",
          "coverImage": "string",
          "author": {
            "id": "string",
            "username": "string"
          },
          "category": {
            "id": "string",
            "name": "string"
          },
          "averageRating": 0,
          "favoriteCount": 0
        },
        "collectedAt": "2023-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 0,
      "totalPages": 0
    }
  }
}
```

### 7.2 添加收藏

**接口地址**: `POST /api/v1/users/collections`

**请求头**: `Authorization: Bearer <token>`

**请求参数**:
```json
{
  "storyId": "string"          // 故事ID，必填
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "收藏成功",
  "data": {
    "id": "string",
    "storyId": "string",
    "collectedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### 7.3 取消收藏

**接口地址**: `DELETE /api/v1/users/collections/:storyId`

**请求头**: `Authorization: Bearer <token>`

**响应示例**:
```json
{
  "success": true,
  "message": "取消收藏成功"
}
```

---

## 8. 错误响应格式

所有API在出错时都会返回统一的错误格式：

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": {}              // 可选，详细错误信息
  }
}
```

### 常见错误码

| 错误码 | HTTP状态码 | 描述 |
|--------|------------|------|
| VALIDATION_ERROR | 400 | 请求参数验证失败 |
| UNAUTHORIZED | 401 | 未授权访问 |
| FORBIDDEN | 403 | 权限不足 |
| NOT_FOUND | 404 | 资源不存在 |
| CONFLICT | 409 | 资源冲突 |
| RATE_LIMIT_EXCEEDED | 429 | 请求频率超限 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |

---

## 9. 数据模型

### 9.1 用户模型 (User)

```json
{
  "id": "string",
  "username": "string",        // 用户名，唯一
  "email": "string",           // 邮箱，唯一
  "password": "string",        // 加密密码
  "role": "user",              // 角色：user/admin
  "avatar": "string",          // 头像URL
  "isActive": true,            // 是否激活
  "loginAttempts": 0,          // 登录尝试次数
  "lockUntil": "date",         // 锁定到期时间
  "passwordResetToken": "string", // 密码重置token
  "passwordResetExpires": "date", // 密码重置过期时间
  "createdAt": "date",
  "updatedAt": "date"
}
```

### 9.2 故事模型 (Story)

```json
{
  "id": "string",
  "title": "string",           // 故事标题
  "description": "string",     // 故事简介
  "author": "ObjectId",        // 作者ID
  "category": "ObjectId",      // 分类ID
  "coverImage": "string",      // 封面图URL
  "status": "draft",           // 状态：draft/published/completed
  "viewCount": 0,              // 浏览次数
  "averageRating": 0,          // 平均评分
  "favoriteCount": 0,          // 收藏次数
  "tags": ["string"],          // 标签数组
  "settings": {                // AI辅助设置
    "aiPlot": true,
    "aiCharacter": true,
    "aiWriting": false
  },
  "createdAt": "date",
  "updatedAt": "date"
}
```

### 9.3 故事章节模型 (StorySection)

```json
{
  "id": "string",
  "storyId": "ObjectId",       // 故事ID
  "temporaryId": "string",     // 临时ID
  "type": "text",              // 类型：text/choice
  "order": 1,                  // 排序
  "title": "string",           // 章节标题
  "text": "string",            // 章节内容
  "visualPosition": {          // 可视化位置
    "x": 0,
    "y": 0
  },
  "choices": [                 // 选择项
    {
      "id": "string",
      "text": "string",
      "nextSectionId": "string"
    }
  ],
  "isEnd": false,              // 是否为结局
  "statistics": {              // 统计信息
    "viewCount": 0,
    "choiceCount": {}
  },
  "createdAt": "date",
  "updatedAt": "date"
}
```

### 9.4 用户收藏模型 (UserStoryFavorite)

```json
{
  "id": "string",
  "userId": "ObjectId",        // 用户ID
  "storyId": "ObjectId",       // 故事ID
  "createdAt": "date"
}
```

### 9.5 用户评分模型 (UserStoryRating)

```json
{
  "id": "string",
  "userId": "ObjectId",        // 用户ID
  "storyId": "ObjectId",       // 故事ID
  "rating": 5,                 // 评分，1-5
  "comment": "string",         // 评价内容
  "createdAt": "date",
  "updatedAt": "date"
}
```

### 9.6 收藏模型 (Collection)

```json
{
  "id": "string",
  "user": "ObjectId",          // 用户ID
  "story": "ObjectId",         // 故事ID
  "collectedAt": "date"        // 收藏时间
}
```

### 9.7 分类模型 (Category)

```json
{
  "id": "string",
  "name": "string",            // 分类名称，唯一
  "description": "string",     // 分类描述
  "storyCount": 0,             // 故事数量
  "createdAt": "date",
  "updatedAt": "date"
}
```

---

## 10. 使用示例

### 10.1 完整的用户注册和故事创建流程

```javascript
// 1. 用户注册
const registerResponse = await fetch('/api/v1/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123'
  })
});

const { data: { token } } = await registerResponse.json();

// 2. 创建故事
const createStoryResponse = await fetch('/api/v1/stories', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    title: '我的第一个故事',
    description: '这是一个关于冒险的故事',
    categoryId: 'category_id_here',
    settings: {
      aiPlot: true,
      aiCharacter: true,
      aiWriting: false
    }
  })
});

const { data: { story } } = await createStoryResponse.json();

// 3. 添加第一章
const createSectionResponse = await fetch(`/api/v1/stories/${story.id}/sections`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    type: 'text',
    title: '开始',
    text: '在一个遥远的王国里...',
    order: 1,
    choices: [
      {
        text: '进入森林',
        nextSectionId: null
      },
      {
        text: '前往城堡',
        nextSectionId: null
      }
    ]
  })
});
```

### 10.2 获取故事列表并筛选

```javascript
// 获取已发布的奇幻类故事，按评分排序
const storiesResponse = await fetch('/api/v1/stories?status=published&categoryId=fantasy&sort=rating&page=1&limit=10');

const { data: { stories, pagination } } = await storiesResponse.json();

console.log(`共找到 ${pagination.total} 个故事`);
stories.forEach(story => {
  console.log(`${story.title} - 评分: ${story.averageRating}`);
});
```

### 10.3 用户交互操作

```javascript
// 收藏故事
await fetch('/api/v1/stories/story_id_here/favorite', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// 评分故事
await fetch('/api/v1/stories/story_id_here/rate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    rating: 5,
    comment: '非常精彩的故事！'
  })
});

// 获取收藏列表
const favoritesResponse = await fetch('/api/v1/user/favorites?page=1&limit=10', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { data: { favorites } } = await favoritesResponse.json();
```

---

## 11. 注意事项

1. **认证要求**: 大部分API需要在请求头中包含有效的JWT token
2. **权限控制**: 某些操作仅限资源所有者或管理员执行
3. **频率限制**: API可能有请求频率限制，请合理控制请求频率
4. **数据验证**: 所有请求数据都会进行严格验证，请确保数据格式正确
5. **错误处理**: 请始终检查响应的success字段，处理可能的错误情况
6. **分页参数**: 列表类API支持分页，建议合理设置page和limit参数
7. **时间格式**: 所有时间字段使用ISO 8601格式
8. **ID格式**: 所有ID字段使用字符串格式的ObjectId

---

## 12. 更新日志

### v1.0.0 (2023-01-01)
- 初始版本发布
- 实现用户认证、故事管理、交互功能等核心API
- 支持故事章节的创建、编辑和删除
- 实现收藏和评分功能
- 添加分类管理功能

---

*本文档最后更新时间: 2023-01-01*