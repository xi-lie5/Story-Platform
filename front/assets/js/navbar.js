// 根据用户角色动态显示导航栏 — 温润书房风格
(function() {
  function updateNavigationByRole() {
    var authState = typeof AuthUI !== 'undefined' ? AuthUI.getAuthState() : null;
    var userRole = authState && authState.userInfo ? (authState.userInfo.role || 'user') : 'user';

    // 管理员导航菜单 — 使用 nav-link
    var adminNavItems =
      '<a href="index.html" class="nav-link">首页</a>' +
      '<a href="browse.html" class="nav-link">故事阅览</a>' +
      '<a href="review.html" class="nav-link">故事审核</a>' +
      '<a href="profile.html" class="nav-link">个人中心</a>';

    // 普通用户导航菜单
    var userNavItems =
      '<a href="index.html" class="nav-link">首页</a>' +
      '<a href="browse.html" class="nav-link">故事阅览</a>' +
      '<a href="create.html" class="nav-link">创建故事</a>' +
      '<a href="my_stories.html" class="nav-link">我的作品</a>' +
      '<a href="profile.html" class="nav-link">个人中心</a>';

    // 未登录导航菜单
    var guestNavItems =
      '<a href="index.html" class="nav-link">首页</a>' +
      '<a href="browse.html" class="nav-link">故事阅览</a>';

    var navItems = userRole === 'admin' ? adminNavItems : (authState ? userNavItems : guestNavItems);

    var mobileNavItems = userRole === 'admin'
      ? '<a href="index.html" class="nav-link block py-3 px-4 rounded-lg">首页</a>' +
        '<a href="browse.html" class="nav-link block py-3 px-4 rounded-lg">故事阅览</a>' +
        '<a href="review.html" class="nav-link block py-3 px-4 rounded-lg">故事审核</a>' +
        '<a href="profile.html" class="nav-link block py-3 px-4 rounded-lg">个人中心</a>'
      : (authState
        ? '<a href="index.html" class="nav-link block py-3 px-4 rounded-lg">首页</a>' +
          '<a href="browse.html" class="nav-link block py-3 px-4 rounded-lg">故事阅览</a>' +
          '<a href="create.html" class="nav-link block py-3 px-4 rounded-lg">创建故事</a>' +
          '<a href="my_stories.html" class="nav-link block py-3 px-4 rounded-lg">我的作品</a>' +
          '<a href="profile.html" class="nav-link block py-3 px-4 rounded-lg">个人中心</a>'
        : '<a href="index.html" class="nav-link block py-3 px-4 rounded-lg">首页</a>' +
          '<a href="browse.html" class="nav-link block py-3 px-4 rounded-lg">故事阅览</a>');

    // 更新桌面端导航
    // 优先查找 hidden lg:flex 容器（新的 nav-library 结构）
    var desktopNavContainers = document.querySelectorAll('.hidden.lg\\:flex.items-center, .hidden.md\\:flex.items-center');
    var updatedAny = false;

    desktopNavContainers.forEach(function(el) {
      // 只更新包含导航链接的容器，跳过纯 auth-area
      if (el.querySelector('a[href="index.html"]') || el.querySelector('a[href="browse.html"]')) {
        // 保留当前 active 状态
        var activeLink = el.querySelector('.nav-link.active, a.active');
        var activeHref = activeLink ? activeLink.getAttribute('href') : null;
        el.innerHTML = navItems;
        if (activeHref) {
          var newActive = el.querySelector('a[href="' + activeHref + '"]');
          if (newActive) newActive.classList.add('active');
        }
        updatedAny = true;
      }
    });

    // 回退：更新旧式 #main-nav-desktop
    var mainNavDesktop = document.getElementById('main-nav-desktop');
    if (mainNavDesktop && !updatedAny) {
      var activeLink = mainNavDesktop.querySelector('.nav-link.active, a.active');
      var activeHref = activeLink ? activeLink.getAttribute('href') : null;
      mainNavDesktop.innerHTML = navItems;
      if (activeHref) {
        var newActive = mainNavDesktop.querySelector('a[href="' + activeHref + '"]');
        if (newActive) newActive.classList.add('active');
      }
    }

    // 更新移动端导航
    var mobileContainers = document.querySelectorAll('#mobile-menu .container, #mobile-menu > div');
    mobileContainers.forEach(function(container) {
      var firstLink = container.querySelector('a[href="index.html"]');
      if (firstLink) {
        var parent = firstLink.parentElement;
        // 保存 auth-area-mobile
        var authArea = parent.querySelector('#auth-area-mobile, [id*="auth-area-mobile"]');
        var authHTML = authArea ? authArea.outerHTML : '';
        // 找到并替换所有导航链接
        var links = parent.querySelectorAll('a[href]');
        var hasNavLinks = false;
        links.forEach(function(link) {
          if (link.id.indexOf('auth') === -1) hasNavLinks = true;
        });
        if (hasNavLinks) {
          // 清除非 auth 的链接，插入新链接 + 恢复 auth
          var children = Array.from(parent.children);
          children.forEach(function(child) {
            if (!child.id || child.id.indexOf('auth') === -1) {
              if (child.tagName === 'A' || child.querySelector('a')) {
                child.remove();
              }
            }
          });
          parent.insertAdjacentHTML('afterbegin', mobileNavItems);
          if (authHTML && !parent.querySelector('#auth-area-mobile')) {
            parent.insertAdjacentHTML('beforeend', authHTML);
          }
        }
      }
    });
  }

  // 注入全局主题切换按钮
  function injectThemeToggle() {
    // 桌面端
    var desktopAuthAreas = document.querySelectorAll('#auth-area-desktop');
    desktopAuthAreas.forEach(function(authArea) {
      if (authArea && !authArea.parentElement.querySelector('.theme-toggle-btn')) {
        var themeBtn = document.createElement('button');
        themeBtn.className = 'theme-toggle-btn btn-icon';
        themeBtn.title = '切换主题';
        themeBtn.setAttribute('aria-label', '切换主题');
        themeBtn.innerHTML = '<i class="fa fa-moon-o"></i>';
        themeBtn.onclick = function() {
          if (typeof ReadingHistory !== 'undefined') {
            var newTheme = ReadingHistory.toggleTheme();
            updateThemeIcons(newTheme);
          }
        };
        authArea.parentElement.insertBefore(themeBtn, authArea.nextSibling);
        if (typeof ReadingHistory !== 'undefined' && ReadingHistory.getTheme() === 'dark') {
          themeBtn.querySelector('i').className = 'fa fa-sun-o';
        }
      }
    });

    // 移动端
    var mobileAuthAreas = document.querySelectorAll('#auth-area-mobile');
    mobileAuthAreas.forEach(function(authArea) {
      if (authArea && !authArea.parentElement.querySelector('.theme-toggle-btn-mobile')) {
        var themeBtn = document.createElement('button');
        themeBtn.className = 'theme-toggle-btn-mobile nav-link block w-full text-left';
        themeBtn.innerHTML = '<i class="fa fa-moon-o mr-2"></i> 切换主题';
        themeBtn.onclick = function() {
          if (typeof ReadingHistory !== 'undefined') {
            var newTheme = ReadingHistory.toggleTheme();
            updateThemeIcons(newTheme);
          }
        };
        authArea.parentElement.appendChild(themeBtn);
        if (typeof ReadingHistory !== 'undefined' && ReadingHistory.getTheme() === 'dark') {
          themeBtn.querySelector('i').className = 'fa fa-sun-o';
        }
      }
    });
  }

  function updateThemeIcons(theme) {
    var isDark = theme === 'dark';
    var allBtns = document.querySelectorAll('.theme-toggle-btn i, .theme-toggle-btn-mobile i');
    allBtns.forEach(function(icon) {
      icon.className = isDark ? 'fa fa-sun-o' : 'fa fa-moon-o';
    });
  }

  // 事件监听
  document.addEventListener('authStateChanged', updateNavigationByRole);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      updateNavigationByRole();
      setTimeout(injectThemeToggle, 400);
      setTimeout(injectThemeToggle, 1200);
    });
  } else {
    updateNavigationByRole();
    setTimeout(injectThemeToggle, 400);
    setTimeout(injectThemeToggle, 1200);
  }

  window.updateNavigationByRole = updateNavigationByRole;
})();
