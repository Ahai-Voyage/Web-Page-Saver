const Utils = {
  // HTML转义，防止XSS
  escapeHtml(unsafe) {
    if (!unsafe) return '';
    const div = document.createElement('div');
    div.textContent = unsafe;
    return div.innerHTML;
  },

  // 格式化时间
  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // 今天
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
    
    // 昨天
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return '昨天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
    
    // 本周内
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      return weekdays[date.getDay()] + ' ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
    
    // 更早
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) + ' ' + 
           date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  },

  // 格式化完整时间
  formatFullTime(timestamp) {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  },

  // 获取域名
  getDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  },

  // 获取域名 favicon
  getFavicon(url) {
    try {
      const domain = this.getDomain(url);
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
      return '';
    }
  },

  // 分组记录按域名
  groupByDomain(visits) {
    const groups = {};
    visits.forEach(visit => {
      const domain = this.getDomain(visit.url);
      if (!groups[domain]) {
        groups[domain] = [];
      }
      groups[domain].push(visit);
    });
    return groups;
  },

  // 防抖函数
  debounce(fn, delay) {
    let timer = null;
    return function (...args) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  },

  // 导出为 CSV
  exportToCSV(visits) {
    const headers = ['ID', '标题', 'URL', '访问时间', '域名'];
    const rows = visits.map(v => [
      v.id,
      `"${(v.title || '').replace(/"/g, '""')}"`,
      `"${v.url}"`,
      this.formatFullTime(v.visitTime),
      this.getDomain(v.url)
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  },

  // 导出为 HTML
  exportToHTML(visits) {
    const rows = visits.map(v => `
      <tr>
        <td>${v.id}</td>
        <td><a href="${v.url}" target="_blank">${this.escapeHtml(v.title || v.url)}</a></td>
        <td>${this.escapeHtml(v.url)}</td>
        <td>${this.formatFullTime(v.visitTime)}</td>
      </tr>
    `).join('');
    
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>浏览历史导出</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 1200px; margin: 2em auto; padding: 0 1em; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f5f5f5; font-weight: 600; }
    tr:hover { background: #f9f9f9; }
    a { color: #0066cc; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>浏览历史记录 (${visits.length} 条)</h1>
  <p>导出时间: ${new Date().toLocaleString('zh-CN')}</p>
  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>标题</th>
        <th>URL</th>
        <th>访问时间</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</body>
</html>`;
  },

  // 下载文件
  downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};

// 使工具函数可在不同模块间使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Utils;
}
