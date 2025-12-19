(function (window) {
  const global = window || {};
  const BACKEND_BASE_URL = global.AUTH_BACKEND_BASE_URL || 'http://localhost:5000';
  const AUTH_STORAGE_KEYS = ['token', 'refreshToken', 'userInfo'];

  function escapeHtml(text) {
    return String(text ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getAuthState() {
    const storages = [window.localStorage, window.sessionStorage];

    for (const storage of storages) {
      try {
        const token = storage.getItem('token');
        if (!token) continue;

        const userInfoRaw = storage.getItem('userInfo');
        if (!userInfoRaw) continue;

        const userInfo = JSON.parse(userInfoRaw);
        if (!userInfo?.username) continue;

        return { storage, userInfo, token };
      } catch (error) {
        console.warn('读取登录状态失败', error);
      }
    }

    return null;
  }

  function resolveAvatarUrl(avatar, username) {
    const fallback = `https://ui-avatars.com/api/?background=6366f1&color=fff&name=${encodeURIComponent(username || 'User')}`;

    if (!avatar) {
      return fallback;
    }

    if (/^https?:\/\//i.test(avatar)) {
      return avatar;
    }

    const normalized = avatar.startsWith('/') ? avatar : `/${avatar}`;
    return `${BACKEND_BASE_URL}${normalized}`;
  }

  function clearAuthStorage() {
    [window.localStorage, window.sessionStorage].forEach((storage) => {
      AUTH_STORAGE_KEYS.forEach((key) => storage.removeItem(key));
    });
  }

  function goToLogin(currentUrl = null) {
    if (!currentUrl) {
      currentUrl = window.location.href;
    }
    const encodedUrl = encodeURIComponent(currentUrl);
    window.location.href = `login.html?redirect=${encodedUrl}`;
  }

  function renderAreas(context) {
    const { desktopArea, mobileArea, mobileMenu } = context;
    if (!desktopArea) return;

    const authState = getAuthState();

    if (!authState) {
      desktopArea.innerHTML = `
        <button class="hidden md:block px-5 py-2 rounded-full bg-white text-primary border border-primary hover:bg-primary/5 transition-colors">
          <a href="javascript:void(0)" onclick="window.AuthUI.goToLogin()" class="block w-full h-full">登录</a>
        </button>
        <button class="px-5 py-2 rounded-full bg-primary text-white hover:bg-primary/90 shadow-md hover:shadow-lg transition-all">
          <a href="register.html" class="block w-full h-full">注册</a>
        </button>
      `;

      if (mobileArea) {
        mobileArea.innerHTML = `
          <button class="w-full px-5 py-2 rounded-full bg-white text-primary border border-primary hover:bg-primary/5 transition-colors">
            <a href="javascript:void(0)" onclick="window.AuthUI.goToLogin()" class="block w-full h-full">登录</a>
          </button>
          <button class="w-full px-5 py-2 rounded-full bg-primary text-white hover:bg-primary/90 shadow-md hover:shadow-lg transition-all">
            <a href="register.html" class="block w-full h-full">注册</a>
          </button>
        `;
      }
      return;
    }

    const { userInfo } = authState;
    const safeUsername = escapeHtml(userInfo.username || '用户');
    const safeEmail = escapeHtml(userInfo.email || '');
    const avatarUrl = escapeHtml(resolveAvatarUrl(userInfo.avatar, userInfo.username));

    desktopArea.innerHTML = `
      <a href="profile.html" class="hidden md:flex items-center space-x-3 group" title="查看个人信息">
        <img src="${avatarUrl}" alt="${safeUsername}" class="w-10 h-10 rounded-full border border-slate-200 object-cover transition-transform group-hover:scale-105">
        <div class="text-left">
          <div class="font-medium text-slate-700 group-hover:text-primary transition-colors">${safeUsername}</div>
          ${safeEmail ? `<div class="text-xs text-slate-500">${safeEmail}</div>` : ''}
        </div>
      </a>
      <a href="profile.html" class="md:hidden flex items-center space-x-3" title="查看个人信息">
        <img src="${avatarUrl}" alt="${safeUsername}" class="w-9 h-9 rounded-full border border-slate-200 object-cover">
        <span class="text-sm font-medium text-slate-700">${safeUsername}</span>
      </a>
      <button class="hidden md:block px-4 py-2 rounded-full bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors" data-role="logout">退出</button>
    `;

    if (mobileArea) {
      mobileArea.innerHTML = `
        <a href="profile.html" class="flex items-center space-x-3" title="查看个人信息">
          <img src="${avatarUrl}" alt="${safeUsername}" class="w-12 h-12 rounded-full border border-slate-200 object-cover">
          <div>
            <div class="font-medium text-slate-700">${safeUsername}</div>
            ${safeEmail ? `<div class="text-xs text-slate-500">${safeEmail}</div>` : ''}
          </div>
        </a>
        <button class="w-full px-5 py-2 rounded-full bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors" data-role="logout">退出登录</button>
      `;
    }

    const logoutButtons = [
      ...desktopArea.querySelectorAll('[data-role="logout"]'),
      ...(mobileArea ? mobileArea.querySelectorAll('[data-role="logout"]') : [])
    ];

    logoutButtons.forEach((button) => {
      button.addEventListener('click', () => {
        clearAuthStorage();
        if (mobileMenu) {
          mobileMenu.classList.add('hidden');
        }
        // 跳转到首页
        window.location.href = 'index.html';
      });
    });
  }

  function init(options = {}) {
    // 处理desktopArea参数 - 支持DOM元素或ID字符串，兼容多种参数名
    let desktopArea = null;
    
    // 检查所有可能的桌面区域参数名
    const desktopParams = ['desktopArea', 'desktopContainer', 'container'];
    for (const param of desktopParams) {
      if (options[param]) {
        desktopArea = options[param] instanceof Element
          ? options[param]
          : typeof options[param] === 'string'
            ? document.getElementById(options[param])
            : null;
        if (desktopArea) break;
      }
    }
    
    // 如果没有找到，使用默认ID
    if (!desktopArea) {
      desktopArea = document.getElementById('auth-area-desktop');
    }
    
    if (!desktopArea) {
      return null;
    }

    // 处理mobileArea参数 - 支持DOM元素或ID字符串，兼容多种参数名
    let mobileArea = null;
    
    // 检查所有可能的移动区域参数名
    const mobileParams = ['mobileArea', 'mobileContainer'];
    for (const param of mobileParams) {
      if (options.hasOwnProperty(param)) {
        mobileArea = options[param] instanceof Element
          ? options[param]
          : typeof options[param] === 'string'
            ? document.getElementById(options[param])
            : null;
        break;
      }
    }
    
    // 如果没有找到，使用默认ID
    if (!mobileArea) {
      mobileArea = document.getElementById('auth-area-mobile');
    }

    // 处理mobileMenu参数 - 支持DOM元素或ID字符串
    const mobileMenu = options.hasOwnProperty('mobileMenu')
      ? (options.mobileMenu instanceof Element
        ? options.mobileMenu
        : typeof options.mobileMenu === 'string'
          ? document.getElementById(options.mobileMenu)
          : null)
      : document.getElementById('mobile-menu');

    const context = { desktopArea, mobileArea, mobileMenu };

    const render = () => renderAreas(context);
    render();

    const storageHandler = (event) => {
      if (!event.key || AUTH_STORAGE_KEYS.includes(event.key)) {
        render();
      }
    };

    window.addEventListener('storage', storageHandler);

    return {
      render,
      destroy() {
        window.removeEventListener('storage', storageHandler);
      }
    };
  }

  // Categories API
  const CategoriesAPI = {
    async getCategories() {
      try {
        const response = await fetch(`${BACKEND_BASE_URL}/api/v1/categories`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.success ? data.data : [];
      } catch (error) {
        console.error('获取分类失败:', error);
        return [];
      }
    },

    async populateCategorySelect(selectElement, options = {}) {
      const { includeEmpty = false, emptyText = '请选择分类' } = options;
      
      // 清空现有选项
      selectElement.innerHTML = '';
      
      // 添加空选项（如果需要）
      if (includeEmpty) {
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = emptyText;
        selectElement.appendChild(emptyOption);
      }
      
      // 获取分类数据
      const categories = await this.getCategories();
      
      // 添加分类选项
      categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category._id;
        option.textContent = category.name;
        selectElement.appendChild(option);
      });
    }
  };

  window.AuthUI = Object.freeze({
    init,
    getAuthState,
    resolveAvatarUrl,
    clearAuthStorage,
    goToLogin,
    BACKEND_BASE_URL,
    AUTH_STORAGE_KEYS: [...AUTH_STORAGE_KEYS]
  });

  // 将CategoriesAPI添加到全局对象
  window.CategoriesAPI = CategoriesAPI;
})(window);

