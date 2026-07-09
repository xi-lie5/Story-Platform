// Dynamic role-aware navigation.
(function() {
  function getAuthState() {
    if (window.AuthUI && typeof AuthUI.getAuthState === 'function') {
      return AuthUI.getAuthState();
    }
    return null;
  }

  function getNavItems(authState) {
    var role = authState && authState.userInfo ? authState.userInfo.role : 'guest';
    // 统一导航顺序：首页、故事阅览、AI广场、创建故事、我的作品、(故事审核-管理员)、个人中心
    var items = [
      { href: 'index.html', label: '\u9996\u9875' },
      { href: 'browse.html', label: '\u6545\u4e8b\u9605\u89c8' },
      { href: 'ai-stories.html', label: 'AI \u5e7f\u573a' }
    ];

    if (authState) {
      items.push(
        { href: 'create.html', label: '\u521b\u5efa\u6545\u4e8b' },
        { href: 'my_stories.html', label: '\u6211\u7684\u4f5c\u54c1' }
      );
      if (role === 'admin') {
        items.push({ href: 'review.html', label: '\u6545\u4e8b\u5ba1\u6838' });
      }
      items.push({ href: 'profile.html', label: '\u4e2a\u4eba\u4e2d\u5fc3' });
    }

    return items;
  }

  function currentPage() {
    var path = window.location.pathname.split('/').pop();
    return path || 'index.html';
  }

  function desktopLink(item, activePage) {
    var isActive = item.href === activePage;
    var stateClass = isActive ? 'active text-primary' : 'text-slate-600 hover:text-primary';
    return '<a href="' + item.href + '" class="navbar-link font-medium transition-colors ' + stateClass + '">' + item.label + '</a>';
  }

  function mobileLink(item, activePage) {
    var isActive = item.href === activePage;
    var stateClass = isActive ? 'text-primary bg-primary/5' : 'text-slate-600 hover:bg-slate-50 hover:text-primary';
    return '<a href="' + item.href + '" class="block py-3 px-4 rounded-lg font-medium transition-colors ' + stateClass + '">' + item.label + '</a>';
  }

  function updateDesktopNav(items, activePage) {
    var html = items.map(function(item) { return desktopLink(item, activePage); }).join('');
    var targets = [];
    var main = document.getElementById('main-nav-desktop');
    if (main) targets.push(main);

    document.querySelectorAll('.hidden.lg\\:flex.items-center.space-x-8, .hidden.md\\:flex.items-center.space-x-8').forEach(function(el) {
      if (!el.id && el.querySelector('a[href]') && !el.closest('#auth-area-desktop')) {
        targets.push(el);
      }
    });

    targets.forEach(function(el) { el.innerHTML = html; });
  }

  function updateMobileNav(items, activePage) {
    var linksHtml = items.map(function(item) { return mobileLink(item, activePage); }).join('');
    document.querySelectorAll('#mobile-menu').forEach(function(menu) {
      var container = menu.querySelector('.container') || menu;
      var authArea = container.querySelector('#auth-area-mobile');
      var authHtml = authArea ? authArea.outerHTML : '<div id="auth-area-mobile"></div>';
      container.innerHTML = linksHtml + '<div class="flex flex-col space-y-3 pt-3 border-t border-slate-200">' + authHtml + '</div>';
    });
  }

  function updateNavigationByRole() {
    var authState = getAuthState();
    var items = getNavItems(authState);
    var activePage = currentPage();
    updateDesktopNav(items, activePage);
    updateMobileNav(items, activePage);
  }

  document.addEventListener('authStateChanged', updateNavigationByRole);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateNavigationByRole);
  } else {
    updateNavigationByRole();
  }

  window.updateNavigationByRole = updateNavigationByRole;
})();
