# API文档

## 1. API概述

### 1.1 API版本
当前API版本：v1

### 1.2 基础URL
- 开发环境：`http://localhost:5000/api/v1`
- 生产环境：`https://api.storyforge.example.com/api/v1`

### 1.3 认证方式
使用JSON Web Token (JWT) 进行身份验证，在请求头中添加 `Authorization: Bearer <token>`

### 1.4 响应格式
所有API响应使用统一的JSON格式：
```json
{
  "success": true,    // 布尔值，表示请求是否成功
  "data": {},         // 请求成功时返回的数据
  "message": "",      // 请求结果的描述信息
  "errors": []        // 请求失败时的错误信息列表
}
```

## 2. 认证相关API

### 2.1 用户注册
- **接口名称**：用户注册
- **请求URL**：`/auth/register`
- **HTTP方法**：POST
- **请求头**：
  - `Content-Type: application/json`

- **请求体**：
```json
{
  "username": "string",      // 用户名，必填
  "email": "string",         // 邮箱，必填，需符合邮箱格式
  "password": "string"       // 密码，必填，长度至少6位
}
```

- **响应示例**：
  - 成功：
    ```json
    {
      "success": true,
      "data": {
        "userId": "string",
        "username": "string",
        "email": "string",
        "token": "string",
        "refreshToken": "string"
      },
      "message": "注册成功",
      "errors": []
    }
    ```
  - 失败：
    ```json
    {
      "success": false,
      "data": null,
      "message": "注册失败",
      "errors": [
        { "field": "email", "message": "邮箱已被注册" }
      ]
    }
    ```

### 2.2 用户登录
- **接口名称**：用户登录
- **请求URL**：`/auth/login`
- **HTTP方法**：POST
- **请求头**：
  - `Content-Type: application/json`

- **请求体**：
```json
{
  "email": "string",         // 邮箱，必填
  "password": "string"       // 密码，必填
}
```

- **响应示例**：
  - 成功：
    ```json
    {
      "success": true,
      "data": {
        "userId": "string",
        "username": "string",
        "email": "string",
        "avatar": "string",
        "token": "string",
        "refreshToken": "string"
      },
      "message": "登录成功",
      "errors": []
    }
    ```
  - 失败：
    ```json
    {
      "success": false,
      "data": null,
      "message": "登录失败",
      "errors": [
        { "field": "password", "message": "密码错误" }
      ]
    }
    ```

### 2.3 获取用户信息
- **接口名称**：获取用户信息
- **请求URL**：`/auth/me`
- **HTTP方法**：GET
- **请求头**：
  - `Authorization: Bearer <token>`

- **响应示例**：
  - 成功：
    ```json
    {
      "success": true,
      "data": {
        "userId": "string",
        "username": "string",
        "email": "string",
        "avatar": "string",
        "bio": "string"
      },
      "message": "获取用户信息成功",
      "errors": []
    }
    ```

### 2.4 刷新令牌
- **接口名称**：刷新令牌
- **请求URL**：`/auth/refresh`
- **HTTP方法**：POST
- **请求头**：
  - `Content-Type: application/json`

- **请求体**：
```json
{
  "refreshToken": "string"       // 刷新令牌，必填
}
```

- **响应示例**：
  - 成功：
    ```json
    {
      "success": true,
      "data": {
        "token": "string",
        "refreshToken": "string"
      },
      "message": "令牌刷新成功",
      "errors": []
    }
    ```

## 3. 故事相关API

### 3.1 创建故事
- **接口名称**：创建故事
- **请求URL**：`/stories`
- **HTTP方法**：POST
- **请求头**：
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`

- **请求体**：
```json
{
  "title": "string",         // 故事标题，必填
  "description": "string",   // 故事描述，可选
  "categoryId": "string"     // 分类ID，可选
}
```

- **响应示例**：
  - 成功：
    ```json
    {
      "success": true,
      "data": {
        "id": "string",
        "title": "string",
        "description": "string",
        "author": "string",
        "categoryId": "string",
        "nodes": [],
        "isPublic": false,
        "isCompleted": false,
        "createdAt": "string",
        "updatedAt": "string"
      },
      "message": "故事创建成功",
      "errors": []
    }
    ```

### 3.2 获取故事列表
- **接口名称**：获取故事列表
- **请求URL**：`/stories`
- **HTTP方法**：GET
- **请求头**：
  - `Authorization: Bearer <token>`

- **查询参数**：
  - `page`: 页码，默认1
  - `limit`: 每页数量，默认10
  - `categoryId`: 分类ID，可选
  - `isPublic`: 是否公开，可选

- **响应示例**：
  - 成功：
    ```json
    {
      "success": true,
      "data": {
        "stories": [
          {
            "id": "string",
            "title": "string",
            "description": "string",
            "author": "string",
            "categoryId": "string",
            "nodes": [],
            "isPublic": false,
            "isCompleted": false,
            "createdAt": "string",
            "updatedAt": "string"
          }
        ],
        "total": 1,
        "page": 1,
        "limit": 10
      },
      "message": "获取故事列表成功",
      "errors": []
    }
    ```

### 3.3 获取单个故事
- **接口名称**：获取单个故事
- **请求URL**：`/stories/:storyId`
- **HTTP方法**：GET
- **请求头**：
  - `Authorization: Bearer <token>`

- **路径参数**：
  - `storyId`: 故事ID，必填

- **响应示例**：
  - 成功：
    ```json
    {
      "success": true,
      "data": {
        "id": "string",
        "title": "string",
        "description": "string",
        "author": "string",
        "categoryId": "string",
        "nodes": [],
        "isPublic": false,
        "isCompleted": false,
        "createdAt": "string",
        "updatedAt": "string"
      },
      "message": "获取故事成功",
      "errors": []
    }
    ```

### 3.4 更新故事
- **接口名称**：更新故事
- **请求URL**：`/stories/:storyId`
- **HTTP方法**：PUT
- **请求头**：
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`

- **路径参数**：
  - `storyId`: 故事ID，必填

- **请求体**：
```json
{
  "title": "string",         // 故事标题，可选
  "description": "string",   // 故事描述，可选
  "categoryId": "string",    // 分类ID，可选
  "isPublic": boolean,        // 是否公开，可选
  "isCompleted": boolean      // 是否完成，可选
}
```

- **响应示例**：
  - 成功：
    ```json
    {
      "success": true,
      "data": {
        "id": "string",
        "title": "string",
        "description": "string",
        "author": "string",
        "categoryId": "string",
        "nodes": [],
        "isPublic": false,
        "isCompleted": false,
        "createdAt": "string",
        "updatedAt": "string"
      },
      "message": "故事更新成功",
      "errors": []
    }
    ```

### 3.5 删除故事
- **接口名称**：删除故事
- **请求URL**：`/stories/:storyId`
- **HTTP方法**：DELETE
- **请求头**：
  - `Authorization: Bearer <token>`

- **路径参数**：
  - `storyId`: 故事ID，必填

- **响应示例**：
  - 成功：
    ```json
    {
      "success": true,
      "data": null,
      "message": "故事删除成功",
      "errors": []
    }
    ```

### 3.6 标记故事完成状态
- **接口名称**：标记故事完成状态
- **请求URL**：`/stories/:storyId/complete`
- **HTTP方法**：PATCH
- **请求头**：
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`

- **路径参数**：
  - `storyId`: 故事ID，必填

- **请求体**：
```json
{
  "isCompleted": boolean      // 是否完成，必填
}
```

- **响应示例**：
  - 成功：
    ```json
    {
      "success": true,
      "data": {
        "isCompleted": true
      },
      "message": "故事状态更新成功",
      "errors": []
    }
    ```

## 4. 故事节点相关API

### 4.1 获取故事节点列表
- **接口名称**：获取故事节点列表
- **请求URL**：`/storyNodes/stories/:storyId/nodes`
- **HTTP方法**：GET
- **请求头**：
  - `Authorization: Bearer <token>`

- **路径参数**：
  - `storyId`: 故事ID，必填

- **查询参数**：
  - `type`: 节点类型，可选，值为normal/choice/ending
  - `depth`: 节点深度，可选

- **响应示例**：
  - 成功：
    ```json
    {
      "success": true,
      "data": [
        {
          "id": "string",
          "storyId": "string",
          "parentId": "string",
          "title": "string",
          "content": "string",
          "type": "normal",
          "choices": [],
          "position": {
            "x": 0,
            "y": 0
          },
          "depth": 0,
          "order": 0,
          "createdAt": "string",
          "updatedAt": "string"
        }
      ],
      "message": "获取节点列表成功",
      "errors": []
    }
    ```

### 4.2 获取故事树
- **接口名称**：获取故事树
- **请求URL**：`/storyNodes/stories/:storyId/tree`
- **HTTP方法**：GET
- **请求头**：
  - `Authorization: Bearer <token>`

- **路径参数**：
  - `storyId`: 故事ID，必填

- **响应示例**：
  - 成功：
    ```json
    {
      "success": true,
      "data": {
        "id": "string",
        "title": "string",
        "content": "string",
        "children": [
          {
            "id": "string",
            "title": "string",
            "content": "string",
            "children": []
          }
        ]
      },
      "message": "获取故事树成功",
      "errors": []
    }
    ```

### 4.3 创建根节点
- **接口名称**：创建根节点
- **请求URL**：`/storyNodes/stories/:storyId/root`
- **HTTP方法**：POST
- **请求头**：
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`

- **路径参数**：
  - `storyId`: 故事ID，必填

- **请求体**：
```json
{
  "title": "string",         // 节点标题，可选，默认"故事开始"
  "content": "string"         // 节点内容，可选，默认"这是故事的开始..."
}
```

- **响应示例**：
  - 成功：
    ```json
    {
      "success": true,
      "data": {
        "id": "string",
        "storyId": "string",
        "parentId": null,
        "title": "故事开始",
        "content": "这是故事的开始...",
        "type": "normal",
        "choices": [],
        "position": {
          "x": 400,
          "y": 50
        },
        "depth": 0,
        "order": 0,
        "createdAt": "string",
        "updatedAt": "string"
      },
      "message": "根节点创建成功",
      "errors": []
    }
    ```

### 4.4 创建节点
- **接口名称**：创建节点
- **请求URL**：`/storyNodes/stories/:storyId/nodes`
- **HTTP方法**：POST
- **请求头**：
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`

- **路径参数**：
  - `storyId`: 故事ID，必填

- **请求体**：
```json
{
  "parentId": "string",      // 父节点ID，必填
  "title": "string",         // 节点标题，必填
  "content": "string",       // 节点内容，必填
  "type": "string",          // 节点类型，可选，值为normal/choice/ending，默认normal
  "description": "string",   // 节点描述，可选，仅适用于choice类型
  "position": {              // 节点位置，可选
    "x": 0,
    "y": 0
  },
  "choices": [               // 选项列表，可选
    {
      "id": "string",       // 选项ID，可选，自动生成
      "text": "string",      // 选项文本，必填
      "description": "string", // 选项描述，可选
      "targetNodeId": "string" // 目标节点ID，可选
    }
  ]
}
```

- **响应示例**：
  - 成功：
    ```json
    {
      "success": true,
      "data": {
        "id": "string",
        "storyId": "string",
        "parentId": "string",
        "title": "string",
        "content": "string",
        "type": "normal",
        "choices": [],
        "position": {
          "x": 0,
          "y": 0
        },
        "depth": 1,
        "order": 0,
        "createdAt": "string",
        "updatedAt": "string"
      },
      "message": "节点创建成功",
      "errors": []
    }
    ```

### 4.5 批量保存节点
- **接口名称**：批量保存节点
- **请求URL**：`/storyNodes/stories/:storyId/nodes/batch`
- **HTTP方法**：POST
- **请求头**：
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`

- **路径参数**：
  - `storyId`: 故事ID，必填

- **请求体**：
```json
{
  "nodes": [                // 节点列表，必填
    {
      "tempId": "string",    // 临时ID，用于前端标识
      "title": "string",      // 节点标题，必填
      "content": "string",    // 节点内容，必填
      "type": "string",       // 节点类型，可选
      "position": {           // 节点位置，可选
        "x": 0,
        "y": 0
      },
      "choices": [            // 选项列表，可选
        {
          "id": "string",      // 选项ID，可选
          "text": "string",     // 选项文本，必填
          "tempTargetNodeId": "string" // 临时目标节点ID，用于关联
        }
      ]
    }
  ]
}
```

- **响应示例**：
  - 成功：
    ```json
    {
      "success": true,
      "data": [
        {
          "id": "string",
          "tempId": "string",
          "title": "string",
          "content": "string",
          "type": "string",
          "position": {
            "x": 0,
            "y": 0
          },
          "choices": [
            {
              "id": "string",
              "text": "string",
              "targetNodeId": "string"
            }
          ]
        }
      ],
      "message": "节点批量保存成功",
      "errors": []
    }
    ```

### 4.6 获取单个节点
- **接口名称**：获取单个节点
- **请求URL**：`/storyNodes/nodes/:nodeId`
- **HTTP方法**：GET
- **请求头**：
  - `Authorization: Bearer <token>`

- **路径参数**：
  - `nodeId`: 节点ID，必填

- **响应示例**：
  - 成功：
    ```json
    {
      "success": true,
      "data": {
        "id": "string",
        "storyId": "string",
        "parentId": "string",
        "title": "string",
        "content": "string",
        "type": "normal",
        "choices": [],
        "position": {
          "x": 0,
          "y": 0
        },
        "depth": 0,
        "order": 0,
        "createdAt": "string",
        "updatedAt": "string"
      },
      "message": "获取节点成功",
      "errors": []
    }
    ```

### 4.7 更新节点
- **接口名称**：更新节点
- **请求URL**：`/storyNodes/nodes/:nodeId`
- **HTTP方法**：PUT
- **请求头**：
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`

- **路径参数**：
  - `nodeId`: 节点ID，必填

- **请求体**：
```json
{
  "title": "string",         // 节点标题，可选
  "content": "string",       // 节点内容，可选
  "type": "string",          // 节点类型，可选
  "description": "string",   // 节点描述，可选
  "position": {              // 节点位置，可选
    "x": 0,
    "y": 0
  },
  "choices": [               // 选项列表，可选
    {
      "id": "string",       // 选项ID，必填
      "text": "string",      // 选项文本，必填
      "description": "string", // 选项描述，可选
      "targetNodeId": "string" // 目标节点ID，可选
    }
  ]
}
```

- **响应示例**：
  - 成功：
    ```json
    {
      "success": true,
      "data": {
        "id": "string",
        "storyId": "string",
        "parentId": "string",
        "title": "string",
        "content": "string",
        "type": "normal",
        "choices": [],
        "position": {
          "x": 0,
          "y": 0
        },
        "depth": 0,
        "order": 0,
        "createdAt": "string",
        "updatedAt": "string"
      },
      "message": "节点更新成功",
      "errors": []
    }
    ```

### 4.8 删除节点
- **接口名称**：删除节点
- **请求URL**：`/storyNodes/nodes/:nodeId`
- **HTTP方法**：DELETE
- **请求头**：
  - `Authorization: Bearer <token>`

- **路径参数**：
  - `nodeId`: 节点ID，必填

- **响应示例**：
  - 成功：
    ```json
    {
      "success": true,
      "data": null,
      "message": "节点删除成功",
      "errors": []
    }
    ```

### 4.9 移动节点
- **接口名称**：移动节点
- **请求URL**：`/storyNodes/nodes/:nodeId/move`
- **HTTP方法**：PUT
- **请求头**：
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`

- **路径参数**：
  - `nodeId`: 节点ID，必填

- **请求体**：
```json
{
  "newParentId": "string",   // 新父节点ID，可选
  "newOrder": 0              // 新顺序，可选
}
```

- **响应示例**：
  - 成功：
    ```json
    {
      "success": true,
      "data": {
        "id": "string",
        "parentId": "string",
        "order": 0
      },
      "message": "节点移动成功",
      "errors": []
    }
    ```

### 4.10 绑定选项到目标节点
- **接口名称**：绑定选项到目标节点
- **请求URL**：`/storyNodes/nodes/:nodeId/choices/:choiceId/bind`
- **HTTP方法**：PUT
- **请求头**：
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`

- **路径参数**：
  - `nodeId`: 节点ID，必填
  - `choiceId`: 选项ID，必填

- **请求体**：
```json
{
  "targetNodeId": "string"   // 目标节点ID，必填
}
```

- **响应示例**：
  - 成功：
    ```json
    {
      "success": true,
      "data": {
        "id": "string",
        "text": "string",
        "targetNodeId": "string"
      },
      "message": "选项绑定成功",
      "errors": []
    }
    ```

### 4.11 添加选项到节点
- **接口名称**：添加选项到节点
- **请求URL**：`/storyNodes/nodes/:nodeId/choices`
- **HTTP方法**：POST
- **请求头**：
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`

- **路径参数**：
  - `nodeId`: 节点ID，必填

- **请求体**：
```json
{
  "text": "string",          // 选项文本，必填
  "description": "string",   // 选项描述，可选
  "targetNodeId": "string",  // 目标节点ID，可选
  "autoCreate": false         // 是否自动创建目标节点，可选
}
```

- **响应示例**：
  - 成功：
    ```json
    {
      "success": true,
      "data": {
        "id": "string",
        "text": "string",
        "description": "string",
        "targetNodeId": "string",
        "autoCreate": false
      },
      "message": "选项添加成功",
      "errors": []
    }
    ```

### 4.12 更新节点的选项
- **接口名称**：更新节点的选项
- **请求URL**：`/storyNodes/nodes/:nodeId/choices/:choiceId`
- **HTTP方法**：PUT
- **请求头**：
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`

- **路径参数**：
  - `nodeId`: 节点ID，必填
  - `choiceId`: 选项ID，必填

- **请求体**：
```json
{
  "text": "string",          // 选项文本，可选
  "description": "string",   // 选项描述，可选
  "targetNodeId": "string",  // 目标节点ID，可选
  "autoCreate": false         // 是否自动创建目标节点，可选
}
```

- **响应示例**：
  - 成功：
    ```json
    {
      "success": true,
      "data": {
        "id": "string",
        "text": "string",
        "description": "string",
        "targetNodeId": "string",
        "autoCreate": false
      },
      "message": "选项更新成功",
      "errors": []
    }
    ```

### 4.13 删除节点的选项
- **接口名称**：删除节点的选项
- **请求URL**：`/storyNodes/nodes/:nodeId/choices/:choiceId`
- **HTTP方法**：DELETE
- **请求头**：
  - `Authorization: Bearer <token>`

- **路径参数**：
  - `nodeId`: 节点ID，必填
  - `choiceId`: 选项ID，必填

- **响应示例**：
  - 成功：
    ```json
    {
      "success": true,
      "data": {
        "nodeId": "string",
        "choiceId": "string"
      },
      "message": "选项删除成功",
      "errors": []
    }
    ```

### 4.14 复制节点
- **接口名称**：复制节点
- **请求URL**：`/storyNodes/nodes/:nodeId/copy`
- **HTTP方法**：POST
- **请求头**：
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`

- **路径参数**：
  - `nodeId`: 节点ID，必填

- **请求体**：
```json
{
  "newParentId": "string"   // 新父节点ID，可选
}
```

- **响应示例**：
  - 成功：
    ```json
    {
      "success": true,
      "data": {
        "id": "string",
        "title": "string",
        "parentId": "string"
      },
      "message": "节点复制成功",
      "errors": []
    }
    ```

### 4.15 调整节点顺序
- **接口名称**：调整节点顺序
- **请求URL**：`/storyNodes/stories/:storyId/nodes/reorder`
- **HTTP方法**：PUT
- **请求头**：
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`

- **路径参数**：
  - `storyId`: 故事ID，必填

- **请求体**：
```json
{
  "nodeOrders": [            // 节点顺序列表，必填
    {
      "nodeId": "string",   // 节点ID，必填
      "order": 0            // 新顺序，必填
    }
  ]
}
```

- **响应示例**：
  - 成功：
    ```json
    {
      "success": true,
      "data": null,
      "message": "节点顺序调整成功",
      "errors": []
    }
    ```

### 4.16 搜索节点
- **接口名称**：搜索节点
- **请求URL**：`/storyNodes/stories/:storyId/nodes/search`
- **HTTP方法**：GET
- **请求头**：
  - `Authorization: Bearer <token>`

- **路径参数**：
  - `storyId`: 故事ID，必填

- **查询参数**：
  - `keyword`: 搜索关键词，必填
  - `limit`: 每页数量，默认20
  - `offset`: 偏移量，默认0
  - `searchInContent`: 是否在内容中搜索，默认true

- **响应示例**：
  - 成功：
    ```json
    {
      "success": true,
      "data": {
        "nodes": [
          {
            "id": "string",
            "parentId": "string",
            "title": "string",
            "content": "string",
            "type": "normal",
            "choices": [],
            "position": {
              "x": 0,
              "y": 0
            },
            "depth": 0,
            "path": "string"
          }
        ],
        "total": 1,
        "limit": 20,
        "offset": 0
      },
      "message": "搜索节点成功",
      "errors": []
    }
    ```

### 4.17 验证故事的一致性
- **接口名称**：验证故事的一致性
- **请求URL**：`/storyNodes/stories/:storyId/validate`
- **HTTP方法**：GET
- **请求头**：
  - `Authorization: Bearer <token>`

- **路径参数**：
  - `storyId`: 故事ID，必填

- **响应示例**：
  - 成功：
    ```json
    {
      "success": true,
      "data": {
        "totalNodes": 10,
        "issues": [],
        "isValid": true
      },
      "message": "故事验证成功",
      "errors": []
    }
    ```

## 5. 分类相关API

### 5.1 获取分类列表
- **接口名称**：获取分类列表
- **请求URL**：`/categories`
- **HTTP方法**：GET
- **请求头**：
  - `Authorization: Bearer <token>`

- **响应示例**：
  - 成功：
    ```json
    {
      "success": true,
      "data": [
        {
          "id": "string",
          "name": "string",
          "description": "string",
          "createdAt": "string",
          "updatedAt": "string"
        }
      ],
      "message": "获取分类列表成功",
      "errors": []
    }
    ```

## 6. 错误码列表

| 错误码 | 含义 | 说明 |
|--------|------|------|
| 400 | 坏请求 | 请求参数错误或格式不正确 |
| 401 | 未授权 | 缺少认证令牌或令牌无效 |
| 403 | 禁止访问 | 没有权限访问该资源 |
| 404 | 资源不存在 | 请求的资源不存在 |
| 405 | 方法不允许 | 不支持该HTTP方法 |
| 500 | 服务器错误 | 服务器内部错误 |
| 501 | 未实现 | 该功能尚未实现 |
| 503 | 服务不可用 | 服务暂时不可用 |

## 7. API调用示例

### 7.1 使用JavaScript调用API
```javascript
// 使用fetch API调用故事列表接口
async function getStories() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:5000/api/v1/stories', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    const result = await response.json();
    if (result.success) {
      console.log('故事列表:', result.data.stories);
    } else {
      console.error('获取故事列表失败:', result.message);
    }
  } catch (error) {
    console.error('API调用失败:', error);
  }
}

// 调用函数
getStories();
```

### 7.2 使用API_CONFIG调用API
```javascript
// 使用项目封装的API_CONFIG调用故事列表接口
async function getStories() {
  try {
    const response = await API_CONFIG.get(API_CONFIG.STORIES.getStories());
    if (response.success) {
      console.log('故事列表:', response.data.stories);
    } else {
      console.error('获取故事列表失败:', response.message);
    }
  } catch (error) {
    console.error('API调用失败:', error);
  }
}

// 调用函数
getStories();
```

## 8. 注意事项

1. 所有请求都需要添加正确的认证令牌
2. 请求体必须使用JSON格式
3. 遵循RESTful API设计规范
4. 处理好错误情况，特别是网络错误和服务器错误
5. 合理使用分页，避免一次性获取大量数据
6. 敏感操作需要进行二次确认
7. 定期刷新令牌，避免令牌过期
8. 不要在客户端存储敏感信息
9. 对用户输入进行验证，防止恶意输入
10. 定期清理无用数据，保持数据库性能