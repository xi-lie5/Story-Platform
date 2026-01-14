// 根据用户角色动态显示导航栏
(function() {
  function updateNavigationByRole() {
    const authState = AuthUI.getAuthState();
    const userRole = authState?.userInfo?.role || 'user';
    
    // 获取所有导航容器
    const desktopNavs = document.querySelectorAll('[id*="nav-desktop"], [class*="nav-desktop"]');
    const mobileNavs = document.querySelectorAll('[id*="nav-mobile"], [class*="nav-mobile"]');
    
    // 管理员导航菜单（兼容navbar-link和普通链接样式）
    const adminNavItems = `
      <a href="index.html" class="navbar-link text-slate-600 hover:text-primary font-medium transition-colors">首页</a>
      <a href="browse.html" class="navbar-link text-slate-600 hover:text-primary font-medium transition-colors">故事阅览</a>
      <a href="review.html" class="navbar-link text-slate-600 hover:text-primary font-medium transition-colors">故事审核</a>
      <a href="profile.html" class="navbar-link text-slate-600 hover:text-primary font-medium transition-colors">个人中心</a>
    `;
    
    // 普通用户导航菜单
    const userNavItems = `
      <a href="index.html" class="navbar-link text-slate-600 hover:text-primary font-medium transition-colors">首页</a>
      <a href="browse.html" class="navbar-link text-slate-600 hover:text-primary font-medium transition-colors">故事阅览</a>
      <a href="create.html" class="navbar-link text-slate-600 hover:text-primary font-medium transition-colors">创建故事</a>
      <a href="my_stories.html" class="navbar-link text-slate-600 hover:text-primary font-medium transition-colors">我的作品</a>
      <a href="profile.html" class="navbar-link text-slate-600 hover:text-primary font-medium transition-colors">个人中心</a>
    `;
    
    // 未登录导航菜单
    const guestNavItems = `
      <a href="index.html" class="navbar-link text-slate-600 hover:text-primary font-medium transition-colors">首页</a>
      <a href="browse.html" class="navbar-link text-slate-600 hover:text-primary font-medium transition-colors">故事阅览</a>
    `;
    
    const navItems = userRole === 'admin' ? adminNavItems : (authState ? userNavItems : guestNavItems);
    const mobileNavItems = userRole === 'admin' 
      ? `
        <a href="index.html" class="block py-3 px-4 rounded-lg font-medium text-slate-600 hover:bg-slate-50 hover:text-primary">首页</a>
        <a href="browse.html" class="block py-3 px-4 rounded-lg font-medium text-slate-600 hover:bg-slate-50 hover:text-primary">故事阅览</a>
        <a href="review.html" class="block py-3 px-4 rounded-lg font-medium text-slate-600 hover:bg-slate-50 hover:text-primary">故事审核</a>
        <a href="profile.html" class="block py-3 px-4 rounded-lg font-medium text-slate-600 hover:bg-slate-50 hover:text-primary">个人中心</a>
      `
      : (authState
        ? `
          <a href="index.html" class="block py-3 px-4 rounded-lg font-medium text-slate-600 hover:bg-slate-50 hover:text-primary">首页</a>
          <a href="browse.html" class="block py-3 px-4 rounded-lg font-medium text-slate-600 hover:bg-slate-50 hover:text-primary">故事阅览</a>
          <a href="create.html" class="block py-3 px-4 rounded-lg font-medium text-slate-600 hover:bg-slate-50 hover:text-primary">创建故事</a>
          <a href="my_stories.html" class="block py-3 px-4 rounded-lg font-medium text-slate-600 hover:bg-slate-50 hover:text-primary">我的作品</a>
          <a href="profile.html" class="block py-3 px-4 rounded-lg font-medium text-slate-600 hover:bg-slate-50 hover:text-primary">个人中心</a>
        `
        : `
          <a href="index.html" class="block py-3 px-4 rounded-lg font-medium text-slate-600 hover:bg-slate-50 hover:text-primary">首页</a>
          <a href="browse.html" class="block py-3 px-4 rounded-lg font-medium text-slate-600 hover:bg-slate-50 hover:text-primary">故事阅览</a>
        `);
    
    // 更新桌面端导航（如果存在）
    // 优先使用ID选择器，避免重复匹配
    const mainNavDesktop = document.getElementById('main-nav-desktop');
    if (mainNavDesktop) {
      // 直接更新 #main-nav-desktop
      const activeLink = mainNavDesktop.querySelector('.navbar-link.active, .navbar-link.text-primary, a.text-primary');
      if (activeLink) {
        const activeHref = activeLink.getAttribute('href');
        mainNavDesktop.innerHTML = navItems;
        // 恢复活动状态
        const newActiveLink = mainNavDesktop.querySelector(`a[href="${activeHref}"]`);
        if (newActiveLink) {
          newActiveLink.classList.add('active', 'text-primary');
          newActiveLink.classList.remove('hover:text-primary');
        }
      } else {
        mainNavDesktop.innerHTML = navItems;
      }
    } else {
      // 如果没有 #main-nav-desktop，使用其他选择器（向后兼容）
      const desktopNavElements = document.querySelectorAll('.hidden.lg\\:flex.items-center.space-x-8, .hidden.md\\:flex.items-center.space-x-8');
      desktopNavElements.forEach(el => {
        if (el && !el.id) { // 避免重复更新已有ID的元素
          const hasNavLinks = el.querySelector('a.navbar-link') || el.querySelector('a[href]');
          if (hasNavLinks) {
            const activeLink = el.querySelector('.navbar-link.active, .navbar-link.text-primary, a.text-primary');
            if (activeLink) {
              const activeHref = activeLink.getAttribute('href');
              el.innerHTML = navItems;
              const newActiveLink = el.querySelector(`a[href="${activeHref}"]`);
              if (newActiveLink) {
                newActiveLink.classList.add('active', 'text-primary');
                newActiveLink.classList.remove('hover:text-primary');
              }
            } else {
              el.innerHTML = navItems;
            }
          }
        }
      });
    }
    
    // 更新移动端导航（如果存在）
    const mobileMenuContainers = document.querySelectorAll('[id="mobile-menu"] .container, .lg\\:hidden.hidden .container, [id="mobile-menu"]');
    mobileMenuContainers.forEach(container => {
      if (container) {
        // 查找移动端导航链接的容器
        const existingNav = container.querySelector('a[href="index.html"]');
        if (existingNav) {
          // 找到导航链接的父容器并更新
          const navParent = existingNav.parentElement;
          if (navParent && navParent.tagName !== 'DIV' && navParent.id !== 'auth-area-mobile') {
            // 保存需要保留的链接（如认证区域）
            const authArea = navParent.querySelector('#auth-area-mobile');
            const authAreaHTML = authArea ? authArea.outerHTML : '';
            
            // 更新导航链接
            navParent.innerHTML = mobileNavItems;
            
            // 恢复认证区域
            if (authAreaHTML) {
              const newAuthArea = navParent.querySelector('#auth-area-mobile');
              if (!newAuthArea) {
                navParent.insertAdjacentHTML('beforeend', authAreaHTML);
              }
            }
          } else if (navParent && navParent.id === 'mobile-menu') {
            // 如果父容器是mobile-menu本身，直接更新其内容（但保留认证区域）
            const authArea = container.querySelector('#auth-area-mobile');
            const authAreaHTML = authArea ? authArea.outerHTML : '';
            container.innerHTML = mobileNavItems;
            if (authAreaHTML) {
              container.insertAdjacentHTML('beforeend', authAreaHTML);
            }
          }
        }
      }
    });
  }
  
  // 监听认证状态变化
  document.addEventListener('authStateChanged', updateNavigationByRole);
  
  // 页面加载时执行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateNavigationByRole);
  } else {
    updateNavigationByRole();
  }
  
  // 导出函数供外部调用
  window.updateNavigationByRole = updateNavigationByRole;
})();
