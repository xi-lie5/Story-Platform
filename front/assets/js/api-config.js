// API配置文件
const API_CONFIG = {
  BASE_URL: 'http://localhost:5000',
  API_VERSION: 'v1',
  
  // 构建完整的API URL
  buildUrl(path) {
    return `${this.BASE_URL}/api/${this.API_VERSION}${path}`;
  },
  
  // 获取认证头
  getAuthHeaders() {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  },
  
  // 通用API请求函数
  async request(url, options = {}) {
    try {
      const headers = {
        ...this.getAuthHeaders(),
        ...options.headers
      };
      
      const response = await fetch(url, {
        ...options,
        headers
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP错误: ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error('API请求错误:', error);
      throw error;
    }
  },
  
  // GET请求
  get(url, options = {}) {
    return this.request(url, {
      ...options,
      method: 'GET'
    });
  },
  
  // POST请求
  post(url, data = {}, options = {}) {
    return this.request(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  
  // PUT请求
  put(url, data = {}, options = {}) {
    return this.request(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  
  // DELETE请求
  delete(url, options = {}) {
    return this.request(url, {
      ...options,
      method: 'DELETE'
    });
  },
  
  // 节点相关API
    NODES: {
      // 获取单个节点
      getNode: (nodeId) => API_CONFIG.buildUrl(`/storyNodes/nodes/${nodeId}`),
      // 获取故事的所有节点
      getStoryNodes: (storyId) => API_CONFIG.buildUrl(`/storyNodes/stories/${storyId}/nodes`),
      // 创建根节点
      createRoot: (storyId) => API_CONFIG.buildUrl(`/storyNodes/stories/${storyId}/root`),
      // 创建节点
      createNode: (storyId) => API_CONFIG.buildUrl(`/storyNodes/stories/${storyId}/nodes`),
      // 批量保存节点
      batchSave: (storyId) => API_CONFIG.buildUrl(`/storyNodes/stories/${storyId}/nodes/batch`),
      // 删除节点
      deleteNode: (nodeId) => API_CONFIG.buildUrl(`/storyNodes/nodes/${nodeId}`),
      // 更新节点
      updateNode: (nodeId) => API_CONFIG.buildUrl(`/storyNodes/nodes/${nodeId}`),
      // 移动节点
      moveNode: (nodeId) => API_CONFIG.buildUrl(`/storyNodes/nodes/${nodeId}/move`),
      // 绑定选择到目标节点
      bindChoice: (nodeId, choiceId) => API_CONFIG.buildUrl(`/storyNodes/nodes/${nodeId}/choices/${choiceId}/bind`)
    },
  
  // 故事相关API
  STORIES: {
    // 获取故事列表
    getStories: () => API_CONFIG.buildUrl('/stories'),
    // 获取单个故事
    getStory: (storyId) => API_CONFIG.buildUrl(`/stories/${storyId}`),
    // 创建故事
    createStory: () => API_CONFIG.buildUrl('/stories'),
    // 更新故事
    updateStory: (storyId) => API_CONFIG.buildUrl(`/stories/${storyId}`),
    // 删除故事
    deleteStory: (storyId) => API_CONFIG.buildUrl(`/stories/${storyId}`)
  },
  
  // 认证相关API
  AUTH: {
    // 登录
    login: () => API_CONFIG.buildUrl('/auth/login'),
    // 注册
    register: () => API_CONFIG.buildUrl('/auth/register'),
    // 获取用户信息
    getUserInfo: () => API_CONFIG.buildUrl('/auth/me'),
    // 刷新token
    refreshToken: () => API_CONFIG.buildUrl('/auth/refresh')
  }
};

// 导出到全局
window.API_CONFIG = API_CONFIG;