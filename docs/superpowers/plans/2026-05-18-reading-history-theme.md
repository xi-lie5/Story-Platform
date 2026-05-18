# 阅读进度与全局主题系统 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 StoryForge 添加基于 localStorage 的阅读进度持久化、"继续阅读"快捷入口、阅读历史记录、以及全局深色/浅色主题切换。

**Architecture:** 新建 `reading-history.js` 纯前端模块，封装 localStorage 读写和主题管理。在 story-reader.html 中自动保存进度，在 index.html 和 browse.html 中渲染"继续阅读"区块。navbar.js 注入全局主题切换按钮，各页面添加深色模式 CSS。

**Tech Stack:** Vanilla JavaScript ES6+, Tailwind CSS 3.x CDN, localStorage API

---

## 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `front/assets/js/reading-history.js` | 新建 | 阅读历史 CRUD、主题持久化、进度计算 |
| `front/story-reader.html` | 修改 | 引入模块、自动保存进度、响应主题 |
| `front/index.html` | 修改 | 引入模块、继续阅读区块、深色主题CSS |
| `front/browse.html` | 修改 | 引入模块、继续阅读区块、深色主题CSS |
| `front/assets/js/navbar.js` | 修改 | 注入全局主题切换按钮 |
| `front/create.html` | 修改 | 引入模块、深色主题CSS |
| `front/my_stories.html` | 修改 | 引入模块、深色主题CSS |
| `front/profile.html` | 修改 | 引入模块、深色主题CSS |
| `front/login.html` | 修改 | 深色主题CSS |
| `front/register.html` | 修改 | 深色主题CSS |
| `docs/开发日志.md` | 修改 | 追加开发记录 |
| `README.md` | 修改 | 更新功能列表 |

---

### Task 1: 创建 reading-history.js 核心模块

**Files:**
- Create: `front/assets/js/reading-history.js`

- [ ] **Step 1: 写入完整模块代码**

```js
/**
 * StoryForge 阅读进度与主题管理模块
 * 纯前端 localStorage 方案，无需数据库
 */
(function (window) {
  'use strict';

  var STORAGE_KEY = 'storyforge_reading_history';
  var THEME_KEY = 'storyforge_theme';
  var MAX_HISTORY = 10;

  /**
   * 保存阅读进度到 localStorage
   * @param {string} storyId
   * @param {string} storyTitle
   * @param {string} nodeId
   * @param {string} nodeTitle
   * @param {number} totalNodes - 故事总节点数
   * @param {string} [coverUrl] - 封面图URL
   */
  function saveProgress(storyId, storyTitle, nodeId, nodeTitle, totalNodes, coverUrl) {
    if (!storyId || !nodeId) return;

    var history = getAll();
    var existingIndex = -1;

    for (var i = 0; i < history.length; i++) {
      if (String(history[i].storyId) === String(storyId)) {
        existingIndex = i;
        break;
      }
    }

    var entry = {
      storyId: String(storyId),
      title: storyTitle || '未命名故事',
      nodeId: String(nodeId),
      nodeTitle: nodeTitle || '',
      totalNodes: totalNodes || 0,
      cover: coverUrl || '',
      timestamp: Date.now()
    };

    if (existingIndex >= 0) {
      history[existingIndex] = entry;
    } else {
      history.unshift(entry);
      if (history.length > MAX_HISTORY) {
        history = history.slice(0, MAX_HISTORY);
      }
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      console.warn('保存阅读进度失败（localStorage 可能已满）:', e.message);
    }
  }

  /**
   * 获取全部阅读历史，按时间倒序
   * @returns {Array}
   */
  function getAll() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * 获取最近 N 条阅读历史
   * @param {number} [limit=4]
   * @returns {Array}
   */
  function getRecent(limit) {
    limit = limit || 4;
    return getAll().slice(0, limit);
  }

  /**
   * 获取某个故事的阅读进度百分比
   * @param {string} storyId
   * @returns {number} 0-100
   */
  function getProgress(storyId) {
    var history = getAll();
    for (var i = 0; i < history.length; i++) {
      if (String(history[i].storyId) === String(storyId)) {
        var entry = history[i];
        if (entry.totalNodes && entry.totalNodes > 0) {
          // 通过阅读历史中的 unique 节点数估算进度
          return Math.min(Math.round((getUniqueNodeCount(storyId) / entry.totalNodes) * 100), 100);
        }
        return 0;
      }
    }
    return 0;
  }

  /**
   * 估算某故事已读节点数（基于历史记录中同 storyId 的条目数）
   */
  function getUniqueNodeCount(storyId) {
    var history = getAll();
    var seen = {};
    for (var i = 0; i < history.length; i++) {
      if (String(history[i].storyId) === String(storyId)) {
        seen[history[i].nodeId] = true;
      }
    }
    return Object.keys(seen).length;
  }

  /**
   * 删除某条阅读历史
   * @param {string} storyId
   */
  function removeHistory(storyId) {
    var history = getAll();
    history = history.filter(function (entry) {
      return String(entry.storyId) !== String(storyId);
    });
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {}
  }

  /**
   * 清空全部阅读历史
   */
  function clearAll() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  }

  /* ---- 主题管理 ---- */

  function getTheme() {
    try {
      return window.localStorage.getItem(THEME_KEY) || 'light';
    } catch (e) {
      return 'light';
    }
  }

  function setTheme(theme) {
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch (e) {}
    applyTheme(theme);
  }

  function toggleTheme() {
    var current = getTheme();
    var next = current === 'dark' ? 'light' : 'dark';
    setTheme(next);
    return next;
  }

  function applyTheme(theme) {
    if (!theme) theme = getTheme();
    var root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }

  /**
   * 渲染继续阅读卡片到指定容器
   * @param {string} containerId - 目标 DOM 元素 ID
   * @param {number} [limit=4]
   */
  function renderContinueReading(containerId, limit) {
    limit = limit || 4;
    var container = document.getElementById(containerId);
    if (!container) return;

    var history = getRecent(limit);
    if (history.length === 0) {
      container.style.display = 'none';
      return;
    }

    container.style.display = '';
    var html = '';

    for (var i = 0; i < history.length; i++) {
      var entry = history[i];
      var storyId = entry.storyId;
      var title = escapeHtml(entry.title);
      var nodeTitle = escapeHtml(entry.nodeTitle || '继续阅读');
      var timeAgo = formatTimeAgo(entry.timestamp);
      var readerUrl = 'story-reader.html?id=' + storyId + '&node=' + entry.nodeId;
      var cover = entry.cover || '';

      html +=
        '<a href="' + readerUrl + '" class="story-card block bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all overflow-hidden group">' +
          (cover
            ? '<div class="h-32 bg-cover bg-center" style="background-image:url(' + escapeHtml(cover) + ')"></div>'
            : '<div class="h-32 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">' +
                '<i class="fa fa-book text-4xl text-primary/40"></i>' +
              '</div>') +
          '<div class="p-4">' +
            '<h4 class="font-bold text-gray-900 truncate group-hover:text-primary transition-colors">' + title + '</h4>' +
            '<p class="text-xs text-slate-500 mt-1">' + timeAgo + ' · ' + nodeTitle + '</p>' +
            '<div class="mt-2 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">' +
              '<div class="h-full bg-gradient-to-r from-primary to-secondary rounded-full" style="width:' + getProgress(storyId) + '%"></div>' +
            '</div>' +
            '<span class="inline-block mt-2 text-xs text-primary font-medium">继续阅读 →</span>' +
          '</div>' +
        '</a>';
    }

    container.innerHTML = html;
  }

  /* ---- 工具函数 ---- */

  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatTimeAgo(timestamp) {
    var seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return '刚刚';
    var minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + '分钟前';
    var hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + '小时前';
    var days = Math.floor(hours / 24);
    if (days < 30) return days + '天前';
    return Math.floor(days / 30) + '个月前';
  }

  /* ---- 导出 ---- */
  window.ReadingHistory = {
    saveProgress: saveProgress,
    getHistory: getAll,
    getRecent: getRecent,
    getProgress: getProgress,
    removeHistory: removeHistory,
    clearAll: clearAll,
    getTheme: getTheme,
    setTheme: setTheme,
    toggleTheme: toggleTheme,
    applyTheme: applyTheme,
    renderContinueReading: renderContinueReading
  };

})(window);
```

- [ ] **Step 2: 验证文件写入成功**

Run: `ls -la "E:\桌面\Story-Platform-main\Story-Platform-main\front\assets\js\reading-history.js"`

---

### Task 2: 修改 story-reader.html — 自动保存进度 + 主题集成

**Files:**
- Modify: `front/story-reader.html`

- [ ] **Step 1: 在 `<head>` 中引入 reading-history.js**

在 `<script src="assets/js/navbar.js"></script>` 之后添加一行：

```html
<script src="assets/js/reading-history.js"></script>
```

- [ ] **Step 2: 在 renderNode() 函数末尾添加自动保存**

在 `renderNode()` 函数末尾的 `applyFontSize();` 之后，`}` 闭合之前，添加：

```js
        // 自动保存阅读进度到 localStorage
        if (currentStory && currentNode && typeof ReadingHistory !== 'undefined') {
          var totalNodes = (currentStory.nodes && currentStory.nodes.length) || currentStory.totalNodes || 0;
          ReadingHistory.saveProgress(
            currentStory.id || currentStory._id,
            currentStory.title || '未命名故事',
            currentNode.id || currentNode._id || currentNode.temporaryId,
            currentNode.title || '',
            totalNodes
          );
        }
```

- [ ] **Step 3: 页面初始化时恢复主题**

在 `DOMContentLoaded` 事件处理函数开头（AuthUI.init 之前），添加：

```js
      // 恢复用户主题偏好
      if (typeof ReadingHistory !== 'undefined') {
        ReadingHistory.applyTheme();
      }
```

- [ ] **Step 4: 主题切换按钮同步到模块**

将现有的主题切换事件处理（`theme-btn` click）改为：

```js
      // 主题切换
      document.getElementById('theme-btn').addEventListener('click', function() {
        if (typeof ReadingHistory !== 'undefined') {
          var newTheme = ReadingHistory.toggleTheme();
          isDarkMode = (newTheme === 'dark');
          showNotification(isDarkMode ? '已切换到深色模式' : '已切换到浅色模式', 'info');
        } else {
          isDarkMode = !isDarkMode;
          document.body.classList.toggle('dark');
          showNotification(isDarkMode ? '已切换到深色模式' : '已切换到浅色模式', 'info');
        }
      });
```

- [ ] **Step 5: 取消 theme-btn 的 hidden 类，始终显示**

将 `<button id="theme-btn"` 的 `class` 中的 `hidden` 移除：

```html
<button id="theme-btn" title="主题切换" aria-label="主题切换" class="p-2 rounded-full border border-slate-200 text-slate-600 hover:border-primary hover:text-primary transition-colors">
```

---

### Task 3: 修改 index.html — 继续阅读区块 + 深色主题

**Files:**
- Modify: `front/index.html`

- [ ] **Step 1: 引入 reading-history.js**

在 `<script src="assets/js/navbar.js"></script>` 之后添加：

```html
<script src="assets/js/reading-history.js"></script>
```

- [ ] **Step 2: 在 hero 区域与特色功能区域之间插入继续阅读区块**

在 `</section>`（hero 区域闭合标签）和 `<!-- 特色功能 -->` 之间插入：

```html
  <!-- 继续阅读 -->
  <section id="continue-reading-section" class="py-8 px-4" style="display:none;">
    <div class="container mx-auto max-w-6xl">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
          <i class="fa fa-bookmark text-primary"></i> 继续阅读
        </h2>
        <button onclick="ReadingHistory.clearAll();document.getElementById('continue-reading-grid').innerHTML='';document.getElementById('continue-reading-section').style.display='none';" class="text-sm text-slate-500 hover:text-red-500 transition-colors">
          <i class="fa fa-trash-o"></i> 清除记录
        </button>
      </div>
      <div id="continue-reading-grid" class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <!-- ReadingHistory.renderContinueReading 动态填充 -->
      </div>
    </div>
  </section>
```

- [ ] **Step 3: 在 DOMContentLoaded 中初始化继续阅读和主题**

在 `DOMContentLoaded` 处理函数中，`AuthUI.init()` 之后添加：

```js
      // 恢复主题
      if (typeof ReadingHistory !== 'undefined') {
        ReadingHistory.applyTheme();
        ReadingHistory.renderContinueReading('continue-reading-grid', 4);
      }
```

- [ ] **Step 4: 添加深色主题 CSS**

在 `</head>` 之前的 `</style>` 之后添加：

```html
  <style>
    /* 深色主题 */
    html.dark body { background: #0f172a; color: #e2e8f0; }
    html.dark .bg-white, html.dark .bg-white\/95, html.dark .bg-white\/98 { background: #1e293b !important; }
    html.dark .bg-slate-50 { background: #0f172a !important; }
    html.dark .bg-gradient-to-br.from-slate-50 { background: linear-gradient(to bottom right, #0f172a, #1e293b) !important; }
    html.dark .bg-gradient-to-b.from-white { background: linear-gradient(to bottom, #1e293b, #0f172a) !important; }
    html.dark .text-slate-800, html.dark .text-gray-900 { color: #e2e8f0 !important; }
    html.dark .text-slate-600, html.dark .text-slate-700 { color: #94a3b8 !important; }
    html.dark .text-slate-500 { color: #64748b !important; }
    html.dark .border-slate-200 { border-color: #334155 !important; }
    html.dark .navbar-modern { background: rgba(30, 41, 59, 0.98); border-bottom-color: #334155; }
    html.dark .navbar-link { color: #94a3b8; }
    html.dark .navbar-link:hover, html.dark .navbar-link.active { color: #818cf8; }
    html.dark .btn-secondary-modern { background: transparent; border-color: #475569; color: #94a3b8; }
    html.dark .btn-secondary-modern:hover { background: #1e293b; }
    html.dark input, html.dark textarea, html.dark select { background: #1e293b; color: #e2e8f0; border-color: #475569; }
    html.dark .hover\:bg-slate-50:hover { background: #1e293b !important; }
    html.dark .hover\:bg-slate-100:hover { background: #1e293b !important; }
    html.dark .shadow-sm { box-shadow: 0 1px 2px rgba(0,0,0,0.3); }
    html.dark .shadow-md { box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
  </style>
```

---

### Task 4: 修改 browse.html — 继续阅读区块 + 深色主题

**Files:**
- Modify: `front/browse.html`

- [ ] **Step 1: 引入 reading-history.js**

在 `<script src="assets/js/navbar.js"></script>` 之后添加 `<script src="assets/js/reading-history.js"></script>`。

注意：browse.html 第 10-11 行有重复引入 navbar.js，先修复重复：

```html
<!-- 删除第11行重复的 <script src="assets/js/navbar.js"></script> -->
```

然后添加：

```html
<script src="assets/js/reading-history.js"></script>
```

- [ ] **Step 2: 在故事列表上方插入继续阅读区块**

在 `<main>` 开始处、搜索/过滤区域之前插入：

```html
    <!-- 继续阅读 -->
    <section id="continue-reading-section" class="container mx-auto px-4 pt-6" style="display:none;">
      <div class="max-w-7xl mx-auto">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-bold flex items-center gap-2">
            <i class="fa fa-bookmark text-primary"></i> 继续阅读
          </h2>
          <button onclick="ReadingHistory.clearAll();document.getElementById('continue-reading-grid').innerHTML='';document.getElementById('continue-reading-section').style.display='none';" class="text-sm text-slate-500 hover:text-red-500 transition-colors">
            <i class="fa fa-trash-o"></i> 清除
          </button>
        </div>
        <div id="continue-reading-grid" class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        </div>
      </div>
    </section>
```

- [ ] **Step 3: 在页面 JS 初始化中添加主题恢复和继续阅读渲染**

找到 browse.html 中的 `DOMContentLoaded` 或页面底部 `<script>` 初始化部分，添加：

```js
      if (typeof ReadingHistory !== 'undefined') {
        ReadingHistory.applyTheme();
        ReadingHistory.renderContinueReading('continue-reading-grid', 4);
      }
```

- [ ] **Step 4: 添加深色主题 CSS**（同 index.html 的深色 CSS）

---

### Task 5: 修改 navbar.js — 注入全局主题切换按钮

**Files:**
- Modify: `front/assets/js/navbar.js`

- [ ] **Step 1: 在每个导航栏渲染完成后注入主题按钮**

在 `updateNavigationByRole` 函数末尾（`window.updateNavigationByRole = updateNavigationByRole;` 之前），添加注入逻辑：

```js
  // 注入全局主题切换按钮到桌面端导航
  function injectThemeToggle() {
    // 桌面端：在认证区域后插入主题按钮
    var desktopAuthAreas = document.querySelectorAll('#auth-area-desktop');
    desktopAuthAreas.forEach(function (authArea) {
      if (authArea && !authArea.querySelector('.theme-toggle-btn')) {
        var themeBtn = document.createElement('button');
        themeBtn.className = 'theme-toggle-btn p-2 rounded-full border border-slate-200 text-slate-600 hover:border-primary hover:text-primary transition-colors';
        themeBtn.title = '切换主题';
        themeBtn.setAttribute('aria-label', '切换主题');
        themeBtn.innerHTML = '<i class="fa fa-moon-o"></i>';
        themeBtn.onclick = function () {
          if (typeof ReadingHistory !== 'undefined') {
            var newTheme = ReadingHistory.toggleTheme();
            var icon = themeBtn.querySelector('i');
            if (icon) {
              icon.className = newTheme === 'dark' ? 'fa fa-sun-o' : 'fa fa-moon-o';
            }
          }
        };
        authArea.parentElement.insertBefore(themeBtn, authArea.nextSibling);
        // 初始化图标状态
        if (typeof ReadingHistory !== 'undefined' && ReadingHistory.getTheme() === 'dark') {
          themeBtn.querySelector('i').className = 'fa fa-sun-o';
        }
      }
    });

    // 移动端：在认证区域后插入
    var mobileAuthAreas = document.querySelectorAll('#auth-area-mobile');
    mobileAuthAreas.forEach(function (authArea) {
      if (authArea && !authArea.parentElement.querySelector('.theme-toggle-btn-mobile')) {
        var themeBtn = document.createElement('button');
        themeBtn.className = 'theme-toggle-btn-mobile flex items-center gap-2 py-3 px-4 rounded-lg font-medium text-slate-600 hover:bg-slate-50 hover:text-primary w-full text-left';
        themeBtn.innerHTML = '<i class="fa fa-moon-o"></i> 切换主题';
        themeBtn.onclick = function () {
          if (typeof ReadingHistory !== 'undefined') {
            var newTheme = ReadingHistory.toggleTheme();
            var icon = themeBtn.querySelector('i');
            if (icon) {
              icon.className = newTheme === 'dark' ? 'fa fa-sun-o' : 'fa fa-moon-o';
            }
          }
        };
        authArea.parentElement.appendChild(themeBtn);
        if (typeof ReadingHistory !== 'undefined' && ReadingHistory.getTheme() === 'dark') {
          themeBtn.querySelector('i').className = 'fa fa-sun-o';
        }
      }
    });
  }

  // 延迟注入，确保DOM渲染完成
  setTimeout(injectThemeToggle, 500);
```

---

### Task 6: 为其余页面添加深色主题支持

**Files:**
- Modify: `front/create.html` — 引入 reading-history.js + 深色CSS
- Modify: `front/my_stories.html` — 引入 reading-history.js + 深色CSS
- Modify: `front/profile.html` — 引入 reading-history.js + 深色CSS
- Modify: `front/login.html` — 深色CSS
- Modify: `front/register.html` — 深色CSS

对每个文件做两个改动：
1. 在 navbar.js 引入之后添加 `<script src="assets/js/reading-history.js"></script>`
2. 在 `</head>` 前添加深色主题 CSS（与 Task 3 Step 4 相同）

---

### Task 7: 编写测试脚本并验证

**Files:**
- Create: `front/test-reading-history.html`（临时，测试后删除）

测试内容：
1. 模拟 localStorage 写入阅读进度
2. 验证 `ReadingHistory.saveProgress()` 正确存储数据
3. 验证 `ReadingHistory.getProgress()` 返回正确的百分比
4. 验证 `ReadingHistory.getRecent()` 返回最近N条记录
5. 验证 `ReadingHistory.toggleTheme()` 切换主题并在 `<html>` 上反映
6. 验证"继续阅读"区块在无数据时隐藏、有数据时显示

测试完成后删除 `test-reading-history.html`。

---

### Task 8: 更新文档

**Files:**
- Modify: `docs/开发日志.md`
- Modify: `README.md`

追加 2026-05-18 开发记录：新增阅读进度持久化、继续阅读入口、全局深色/浅色主题切换系统。
READ.ME 功能特性列表新增对应的功能描述。

---

### Task 9: 生成项目开发汇报

生成 Word 格式 (`docs/项目开发汇报.docx`) 的开发汇报，包含：
- 项目概述
- V8 版本改动
- 新功能（阅读进度与主题系统）
- 技术实现说明
- 项目架构概览
