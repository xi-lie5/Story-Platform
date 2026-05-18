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
   */
  function getRecent(limit) {
    limit = limit || 4;
    return getAll().slice(0, limit);
  }

  /**
   * 获取某个故事的阅读进度百分比
   */
  function getProgress(storyId) {
    var history = getAll();
    for (var i = 0; i < history.length; i++) {
      if (String(history[i].storyId) === String(storyId)) {
        var entry = history[i];
        if (entry.totalNodes && entry.totalNodes > 0) {
          var uniqueCount = getUniqueNodeCount(storyId);
          return Math.min(Math.round((uniqueCount / entry.totalNodes) * 100), 100);
        }
        return 0;
      }
    }
    return 0;
  }

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
   */
  function removeHistory(storyId) {
    var history = getAll().filter(function (entry) {
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
      var progress = getProgress(storyId);

      html +=
        '<a href="' + readerUrl + '" class="story-card block bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all overflow-hidden group">' +
          '<div class="h-28 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">' +
            '<i class="fa fa-book text-3xl text-primary/40"></i>' +
          '</div>' +
          '<div class="p-3">' +
            '<h4 class="font-bold text-gray-900 text-sm truncate group-hover:text-primary transition-colors">' + title + '</h4>' +
            '<p class="text-xs text-slate-500 mt-1">' + timeAgo + ' · ' + nodeTitle + '</p>' +
            '<div class="mt-2 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">' +
              '<div class="h-full bg-gradient-to-r from-primary to-secondary rounded-full" style="width:' + progress + '%"></div>' +
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
