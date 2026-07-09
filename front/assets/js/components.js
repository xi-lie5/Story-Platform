(function (window) {
  const Utils = window.Utils || {
    escapeHtml: (text) => String(text ?? ''),
    truncate: (text) => String(text ?? '')
  };

  function renderLoading(message = '加载中...') {
    return `
      <div class="flex flex-col items-center justify-center py-12 text-slate-500" role="status">
        <div class="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin mb-3"></div>
        <p class="text-sm">${Utils.escapeHtml(message)}</p>
      </div>
    `;
  }

  function renderEmpty(icon = 'fa-inbox', message = '暂无数据', actionText = '', actionUrl = '') {
    const action = actionText && actionUrl
      ? `<a href="${Utils.escapeHtml(actionUrl)}" class="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">${Utils.escapeHtml(actionText)}</a>`
      : '';

    return `
      <div class="flex flex-col items-center justify-center py-12 text-center text-slate-500">
        <i class="fas ${Utils.escapeHtml(icon)} text-4xl text-slate-300 mb-4" aria-hidden="true"></i>
        <p class="mb-4">${Utils.escapeHtml(message)}</p>
        ${action}
      </div>
    `;
  }

  function renderError(message = '加载失败', retryFn = '') {
    const retry = retryFn
      ? `<button type="button" onclick="${Utils.escapeHtml(retryFn)}" class="mt-4 px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors">重试</button>`
      : '';

    return `
      <div class="flex flex-col items-center justify-center py-12 text-center text-red-600" role="alert">
        <i class="fas fa-circle-exclamation text-4xl text-red-300 mb-4" aria-hidden="true"></i>
        <p>${Utils.escapeHtml(message)}</p>
        ${retry}
      </div>
    `;
  }

  function renderPagination(current = 1, total = 1, goPageFn = 'goToPage') {
    const currentPage = Math.max(1, Number.parseInt(current, 10) || 1);
    const totalPages = Math.max(1, Number.parseInt(total, 10) || 1);
    const pages = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);

    for (let page = start; page <= end; page += 1) {
      const active = page === currentPage;
      pages.push(`
        <button type="button" onclick="${goPageFn}(${page})" class="w-9 h-9 rounded-lg border ${active ? 'bg-primary text-white border-primary' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}" ${active ? 'aria-current="page"' : ''}>${page}</button>
      `);
    }

    return `
      <nav class="flex items-center justify-center gap-2 mt-8" aria-label="分页">
        <button type="button" onclick="${goPageFn}(${currentPage - 1})" class="px-3 h-9 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50" ${currentPage <= 1 ? 'disabled' : ''}>上一页</button>
        ${pages.join('')}
        <button type="button" onclick="${goPageFn}(${currentPage + 1})" class="px-3 h-9 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50" ${currentPage >= totalPages ? 'disabled' : ''}>下一页</button>
      </nav>
    `;
  }

  function renderStoryCard(story = {}, options = {}) {
    const title = story.title || story.story_title || '未命名故事';
    const description = story.description || story.summary || '暂无简介';
    const author = story.author_name || story.author?.username || '未知作者';
    const cover = story.cover_image || story.cover || 'coverImage/1.png';
    const href = options.href || `story-reader.html?id=${encodeURIComponent(story.id || story._id || '')}`;

    return `
      <article class="bg-white rounded-lg border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
        <a href="${Utils.escapeHtml(href)}" class="block">
          <img src="${Utils.escapeHtml(cover)}" alt="${Utils.escapeHtml(title)}" class="w-full aspect-[4/3] object-cover">
          <div class="p-4">
            <h3 class="font-bold text-slate-900 mb-2 line-clamp-2">${Utils.escapeHtml(title)}</h3>
            <p class="text-sm text-slate-600 mb-4 line-clamp-2">${Utils.escapeHtml(Utils.truncate(description, 120))}</p>
            <div class="text-xs text-slate-500">${Utils.escapeHtml(author)}</div>
          </div>
        </a>
      </article>
    `;
  }

  window.Components = Object.freeze({
    renderLoading,
    renderEmpty,
    renderError,
    renderPagination,
    renderStoryCard
  });
})(window);
