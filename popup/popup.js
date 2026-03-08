document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const contentEl = document.getElementById('content');
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search');
  const refreshBtn = document.getElementById('btn-refresh');
  const exportBtn = document.getElementById('btn-export');
  const exportMenu = document.getElementById('export-menu');
  const clearBtn = document.getElementById('btn-clear');
  const viewBtns = document.querySelectorAll('.view-btn');
  
  // Quick Access Elements
  const quickAccessSitesEl = document.getElementById('quick-access-sites');
  const btnOpenAll = document.getElementById('btn-open-all');
  
  // Batch Elements
  const batchBar = document.getElementById('batch-bar');
  const selectAllCheckbox = document.getElementById('select-all');
  const batchCountEl = document.getElementById('batch-count');
  const btnBatchOpen = document.getElementById('btn-batch-open');
  
  // Stats Elements
  const statToday = document.getElementById('stat-today');
  const statWeek = document.getElementById('stat-week');
  const statTotal = document.getElementById('stat-total');
  const recordCount = document.getElementById('record-count');

  // State
  let currentView = 'list';
  let currentVisits = [];
  let searchQuery = '';
  let selectedVisits = new Set();
  let quickAccessSites = [];
  let isBatchMode = false;

  // Initialize
  init();

  async function init() {
    await loadStats();
    await loadQuickAccess();
    await loadVisits();
    setupEventListeners();
  }

  // Setup Event Listeners
  function setupEventListeners() {
    // Quick Access Drag Scroll
    setupDragScroll(quickAccessSitesEl);
    
    // Search
    searchInput.addEventListener('input', Utils.debounce((e) => {
      searchQuery = e.target.value.trim();
      clearSearchBtn.classList.toggle('visible', searchQuery.length > 0);
      loadVisits();
    }, 300));

    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      clearSearchBtn.classList.remove('visible');
      loadVisits();
    });

    // Refresh
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.classList.add('spinning');
      await loadStats();
      await loadQuickAccess();
      await loadVisits();
      setTimeout(() => refreshBtn.classList.remove('spinning'), 500);
      showToast('已刷新', 'success');
    });

    // Export Menu
    exportBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      exportMenu.classList.toggle('visible');
    });

    document.addEventListener('click', () => {
      exportMenu.classList.remove('visible');
    });

    exportMenu.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // Export Options
    document.querySelectorAll('.export-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const format = btn.dataset.format;
        handleExport(format);
        exportMenu.classList.remove('visible');
      });
    });

    // Clear
    clearBtn.addEventListener('click', async () => {
      if (confirm('确定要清空所有访问记录吗？此操作不可撤销。')) {
        try {
          await DB.clearAllVisits();
          await loadStats();
          await loadQuickAccess();
          await loadVisits();
          showToast('记录已清空', 'success');
        } catch (err) {
          showToast('清空失败: ' + err.message, 'error');
        }
      }
    });

    // View Modes
    viewBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        viewBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentView = btn.dataset.view;
        renderVisits();
      });
    });

    // Open All Quick Access
    btnOpenAll.addEventListener('click', () => {
      if (quickAccessSites.length === 0) return;
      
      quickAccessSites.forEach((site, index) => {
        setTimeout(() => {
          chrome.tabs.create({ url: site.url, active: index === 0 });
        }, index * 100);
      });
      
      showToast(`已打开 ${quickAccessSites.length} 个网站`, 'success');
    });

    // Batch Select All
    selectAllCheckbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        currentVisits.forEach(visit => selectedVisits.add(visit.id));
      } else {
        selectedVisits.clear();
      }
      updateBatchBar();
      renderVisits();
    });

    // Batch Open
    btnBatchOpen.addEventListener('click', () => {
      if (selectedVisits.size === 0) return;
      
      const selectedUrls = currentVisits
        .filter(v => selectedVisits.has(v.id))
        .map((v, i) => ({ url: v.url, index: i }));
      
      selectedUrls.forEach(({ url, index }) => {
        setTimeout(() => {
          chrome.tabs.create({ url, active: index === 0 });
        }, index * 100);
      });
      
      showToast(`已打开 ${selectedVisits.size} 个网站`, 'success');
      
      // 退出批量模式
      selectedVisits.clear();
      selectAllCheckbox.checked = false;
      updateBatchBar();
      renderVisits();
    });

    // Long press to enter batch mode
    let longPressTimer;
    contentEl.addEventListener('mousedown', (e) => {
      if (e.target.closest('.visit-checkbox') || e.target.closest('.visit-pin-btn')) return;
      
      longPressTimer = setTimeout(() => {
        if (!isBatchMode) {
          isBatchMode = true;
          const visitItem = e.target.closest('.visit-item');
          if (visitItem) {
            const visitId = parseInt(visitItem.dataset.id);
            selectedVisits.add(visitId);
            updateBatchBar();
            renderVisits();
          }
        }
      }, 500);
    });

    contentEl.addEventListener('mouseup', () => {
      clearTimeout(longPressTimer);
    });

    contentEl.addEventListener('mouseleave', () => {
      clearTimeout(longPressTimer);
    });
  }

  // Load Statistics
  async function loadStats() {
    try {
      const stats = await DB.getStats();
      statToday.textContent = stats.today;
      statWeek.textContent = stats.week;
      statTotal.textContent = stats.total;
    } catch (err) {
      console.error('加载统计失败:', err);
    }
  }

  // Load Quick Access Sites
  async function loadQuickAccess() {
    try {
      quickAccessSites = await DB.getQuickAccessSites();
      renderQuickAccess();
    } catch (err) {
      console.error('加载快捷访问失败:', err);
    }
  }

  // Render Quick Access
  function renderQuickAccess() {
    if (quickAccessSites.length === 0) {
      quickAccessSitesEl.innerHTML = '<p style="color: var(--text-tertiary); font-size: 11px; padding: 8px;">暂无快捷访问网站</p>';
      return;
    }

    quickAccessSitesEl.innerHTML = '';
    quickAccessSites.forEach(site => {
      const siteEl = document.createElement('div');
      siteEl.className = `quick-site ${site.isPinned ? 'pinned' : ''}`;
      siteEl.innerHTML = `
        <img class="quick-site-favicon" src="${Utils.getFavicon(site.url)}" 
             onerror="this.src=''" alt="">
        <span class="quick-site-name">${Utils.escapeHtml(site.domain)}</span>
      `;
      
      siteEl.addEventListener('click', () => {
        chrome.tabs.create({ url: site.url });
      });
      
      quickAccessSitesEl.appendChild(siteEl);
    });
  }

  // Load Visits
  async function loadVisits() {
    showLoading();
    
    try {
      if (searchQuery) {
        currentVisits = await DB.searchVisits(searchQuery, 100);
      } else {
        currentVisits = await DB.getRecentVisits(100);
      }
      renderVisits();
      updateRecordCount();
    } catch (err) {
      showError('加载失败: ' + err.message);
    }
  }

  // Render Visits
  async function renderVisits() {
    if (currentVisits.length === 0) {
      showEmptyState();
      return;
    }

    if (currentView === 'list') {
      await renderListView();
    } else {
      renderDomainView();
    }
  }

  // List View
  async function renderListView() {
    const ul = document.createElement('ul');
    ul.className = 'visit-list';

    for (const visit of currentVisits) {
      const isPinned = await DB.isPinned(visit.url);
      const isSelected = selectedVisits.has(visit.id);
      
      const li = document.createElement('li');
      li.className = `visit-item ${isSelected ? 'selected' : ''}`;
      li.dataset.id = visit.id;
      li.innerHTML = `
        ${isBatchMode ? `<input type="checkbox" class="visit-checkbox" ${isSelected ? 'checked' : ''}>` : ''}
        <button class="visit-pin-btn ${isPinned ? 'pinned' : ''}" title="${isPinned ? '取消固定' : '固定网站'}">
          <svg viewBox="0 0 24 24" fill="${isPinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        </button>
        <img class="visit-favicon" src="${Utils.getFavicon(visit.url)}" 
             onerror="this.style.display='none'" alt="">
        <div class="visit-info">
          <div class="visit-title">${Utils.escapeHtml(visit.title || visit.url)}</div>
          <div class="visit-url">${Utils.escapeHtml(Utils.getDomain(visit.url))}</div>
          <div class="visit-meta">
            <span class="visit-time">${Utils.formatTime(visit.visitTime)}</span>
          </div>
        </div>
      `;
      
      // Checkbox click
      const checkbox = li.querySelector('.visit-checkbox');
      if (checkbox) {
        checkbox.addEventListener('change', (e) => {
          e.stopPropagation();
          if (e.target.checked) {
            selectedVisits.add(visit.id);
          } else {
            selectedVisits.delete(visit.id);
          }
          updateBatchBar();
          li.classList.toggle('selected', e.target.checked);
        });
      }
      
      // Pin button click
      const pinBtn = li.querySelector('.visit-pin-btn');
      pinBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          if (isPinned) {
            await DB.unpinSite(visit.url);
            showToast('已取消固定', 'success');
          } else {
            await DB.pinSite(visit);
            showToast('已固定到快捷访问', 'success');
          }
          await loadQuickAccess();
          renderVisits();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
      
      // Item click (open link or toggle select)
      li.addEventListener('click', (e) => {
        if (e.target.closest('.visit-checkbox') || e.target.closest('.visit-pin-btn')) return;
        
        if (isBatchMode) {
          const cb = li.querySelector('.visit-checkbox');
          if (cb) {
            cb.checked = !cb.checked;
            cb.dispatchEvent(new Event('change'));
          }
        } else {
          chrome.tabs.create({ url: visit.url });
        }
      });
      
      ul.appendChild(li);
    }

    contentEl.innerHTML = '';
    contentEl.appendChild(ul);
  }

  // Domain View
  function renderDomainView() {
    const groups = Utils.groupByDomain(currentVisits);
    const container = document.createElement('div');
    container.className = 'domain-groups';

    Object.entries(groups).forEach(([domain, visits]) => {
      const groupEl = document.createElement('div');
      groupEl.className = 'domain-group';
      
      const headerEl = document.createElement('div');
      headerEl.className = 'domain-header';
      headerEl.innerHTML = `
        <img class="domain-favicon" src="${Utils.getFavicon(visits[0].url)}" 
             onerror="this.style.display='none'" alt="">
        <span class="domain-name">${Utils.escapeHtml(domain)}</span>
        <span class="domain-count">${visits.length}</span>
        <svg class="domain-toggle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      `;
      
      const visitsEl = document.createElement('div');
      visitsEl.className = 'domain-visits';
      
      visits.forEach(visit => {
        const itemEl = document.createElement('div');
        itemEl.className = 'visit-item';
        itemEl.innerHTML = `
          <div class="visit-info" style="margin-left: 24px;">
            <div class="visit-title">${Utils.escapeHtml(visit.title || visit.url)}</div>
            <div class="visit-meta">
              <span class="visit-time">${Utils.formatTime(visit.visitTime)}</span>
            </div>
          </div>
        `;
        
        itemEl.addEventListener('click', () => {
          chrome.tabs.create({ url: visit.url });
        });
        
        visitsEl.appendChild(itemEl);
      });
      
      headerEl.addEventListener('click', () => {
        groupEl.classList.toggle('collapsed');
      });
      
      groupEl.appendChild(headerEl);
      groupEl.appendChild(visitsEl);
      container.appendChild(groupEl);
    });

    contentEl.innerHTML = '';
    contentEl.appendChild(container);
  }

  // Update Batch Bar
  function updateBatchBar() {
    const count = selectedVisits.size;
    batchCountEl.textContent = `已选择 ${count} 项`;
    
    if (count > 0 || isBatchMode) {
      batchBar.classList.add('visible');
      isBatchMode = true;
    } else {
      batchBar.classList.remove('visible');
      isBatchMode = false;
    }
    
    // Update select all checkbox
    const allSelected = currentVisits.length > 0 && currentVisits.every(v => selectedVisits.has(v.id));
    selectAllCheckbox.checked = allSelected;
  }

  // Show Loading State
  function showLoading() {
    contentEl.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>加载中...</p>
      </div>
    `;
  }

  // Show Empty State
  function showEmptyState() {
    const isSearch = searchQuery.length > 0;
    contentEl.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <p>${isSearch ? '未找到匹配的记录' : '还没有任何访问记录'}</p>
      </div>
    `;
  }

  // Show Error
  function showError(message) {
    contentEl.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p>${message}</p>
      </div>
    `;
  }

  // Update Record Count
  function updateRecordCount() {
    const count = currentVisits.length;
    const total = searchQuery ? `找到 ${count} 条` : `显示最近 ${count} 条`;
    recordCount.textContent = total;
  }

  // Handle Export
  async function handleExport(format) {
    try {
      const visits = await DB.getAllVisits();
      const date = new Date().toISOString().slice(0, 10);
      
      switch (format) {
        case 'json':
          const json = JSON.stringify(visits, null, 2);
          Utils.downloadFile(json, `visits_${date}.json`, 'application/json');
          break;
          
        case 'csv':
          const csv = Utils.exportToCSV(visits);
          Utils.downloadFile(csv, `visits_${date}.csv`, 'text/csv;charset=utf-8');
          break;
          
        case 'html':
          const html = Utils.exportToHTML(visits);
          Utils.downloadFile(html, `visits_${date}.html`, 'text/html;charset=utf-8');
          break;
      }
      
      showToast(`已导出为 ${format.toUpperCase()}`, 'success');
    } catch (err) {
      showToast('导出失败: ' + err.message, 'error');
    }
  }

  // Show Toast
  function showToast(message, type = 'info') {
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
      existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    requestAnimationFrame(() => {
      toast.classList.add('visible');
    });
    
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  // Setup Drag Scroll for Quick Access
  function setupDragScroll(container) {
    let isDown = false;
    let startX;
    let scrollLeft;
    let velocity = 0;
    let rafId = null;

    container.addEventListener('mousedown', (e) => {
      // 如果点击的是网站图标，不启动拖拽
      if (e.target.closest('.quick-site')) return;
      
      isDown = true;
      container.style.cursor = 'grabbing';
      startX = e.pageX - container.offsetLeft;
      scrollLeft = container.scrollLeft;
      velocity = 0;
      
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    });

    container.addEventListener('mouseleave', () => {
      if (isDown) {
        isDown = false;
        container.style.cursor = 'grab';
        applyMomentum();
      }
    });

    container.addEventListener('mouseup', () => {
      if (isDown) {
        isDown = false;
        container.style.cursor = 'grab';
        applyMomentum();
      }
    });

    container.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      
      const x = e.pageX - container.offsetLeft;
      const walk = (x - startX) * 1.5; // 滑动速度倍数
      const newScrollLeft = scrollLeft - walk;
      
      velocity = newScrollLeft - container.scrollLeft;
      container.scrollLeft = newScrollLeft;
      
      startX = x;
      scrollLeft = container.scrollLeft;
    });

    // 惯性滚动
    function applyMomentum() {
      if (Math.abs(velocity) > 0.5) {
        container.scrollLeft += velocity;
        velocity *= 0.95; // 摩擦力
        rafId = requestAnimationFrame(applyMomentum);
      }
    }

    // 触摸设备支持
    let touchStartX = 0;
    let touchScrollLeft = 0;

    container.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].pageX;
      touchScrollLeft = container.scrollLeft;
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
      const x = e.touches[0].pageX;
      const walk = (touchStartX - x);
      container.scrollLeft = touchScrollLeft + walk;
    }, { passive: true });

    // 鼠标滚轮横向滚动
    container.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaY) < Math.abs(e.deltaX) || e.shiftKey) {
        return; // 让浏览器处理自然横向滚动
      }
      
      // 垂直滚轮转为横向滚动
      if (e.deltaY !== 0) {
        e.preventDefault();
        container.scrollLeft += e.deltaY;
      }
    }, { passive: false });
  }
});
