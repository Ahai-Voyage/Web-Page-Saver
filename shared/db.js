const DB = (function() {
  const { DB_NAME, DB_VERSION, STORE_NAME, STORE_PINNED, MAX_VISITS, DEDUP_WINDOW, MAX_PINNED, QUICK_ACCESS_COUNT } = CONSTANTS;

  // 打开数据库
  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
          store.createIndex('visitTime', 'visitTime', { unique: false });
          store.createIndex('url', 'url', { unique: false });
          store.createIndex('domain', 'domain', { unique: false });
        }
        
        // 创建固定网站存储对象
        if (!db.objectStoreNames.contains(STORE_PINNED)) {
          const pinnedStore = db.createObjectStore(STORE_PINNED, { keyPath: 'id', autoIncrement: true });
          pinnedStore.createIndex('url', 'url', { unique: true });
          pinnedStore.createIndex('pinnedTime', 'pinnedTime', { unique: false });
        }
      };
    });
  }

  // 检查是否需要去重（5分钟内同一URL只记录一次）
  async function shouldRecord(url) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('url');
      
      const request = index.openCursor(null, 'prev');
      const cutoffTime = Date.now() - DEDUP_WINDOW;
      
      request.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          const record = cursor.value;
          if (record.url === url && record.visitTime > cutoffTime) {
            resolve(false); // 不需要记录
            return;
          }
        }
        resolve(true); // 需要记录
      };
      
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  }

  // 添加访问记录（带去重）
  async function addVisit(visit) {
    const shouldAdd = await shouldRecord(visit.url);
    if (!shouldAdd) {
      return null; // 跳过重复记录
    }

    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      
      // 添加域名字段
      const visitData = {
        ...visit,
        domain: Utils.getDomain(visit.url),
        visitTime: Date.now()
      };
      
      const request = store.add(visitData);
      
      request.onsuccess = () => {
        trimVisitsIfNeeded(db).catch(console.error);
        resolve(request.result);
      };
      
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  // 清理旧记录
  async function trimVisitsIfNeeded(db) {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('visitTime');

    const count = await new Promise((res, rej) => {
      const req = store.count();
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });

    if (count > MAX_VISITS) {
      const deleteCount = count - MAX_VISITS;
      let deleted = 0;
      
      return new Promise((res, rej) => {
        const cursorReq = index.openCursor();
        cursorReq.onsuccess = (e) => {
          const cursor = e.target.result;
          if (cursor && deleted < deleteCount) {
            store.delete(cursor.primaryKey);
            deleted++;
            cursor.continue();
          } else {
            res();
          }
        };
        cursorReq.onerror = (e) => rej(e.target.error);
      });
    }
    return Promise.resolve();
  }

  // 获取最近记录
  async function getRecentVisits(limit = 50) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('visitTime');
      const visits = [];
      
      const request = index.openCursor(null, 'prev');
      
      request.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor && visits.length < limit) {
          visits.push(cursor.value);
          cursor.continue();
        } else {
          resolve(visits);
        }
      };
      
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  }

  // 搜索记录
  async function searchVisits(query, limit = 50) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('visitTime');
      const visits = [];
      const lowerQuery = query.toLowerCase();
      
      const request = index.openCursor(null, 'prev');
      
      request.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          const visit = cursor.value;
          const titleMatch = (visit.title || '').toLowerCase().includes(lowerQuery);
          const urlMatch = visit.url.toLowerCase().includes(lowerQuery);
          const domainMatch = (visit.domain || '').toLowerCase().includes(lowerQuery);
          
          if ((titleMatch || urlMatch || domainMatch) && visits.length < limit) {
            visits.push(visit);
          }
          cursor.continue();
        } else {
          resolve(visits);
        }
      };
      
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  }

  // 获取所有记录
  async function getAllVisits() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const visits = [];
      
      const request = store.openCursor();
      
      request.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          visits.push(cursor.value);
          cursor.continue();
        } else {
          resolve(visits);
        }
      };
      
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  }

  // 获取统计信息
  async function getStats() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      
      const request = store.openCursor();
      const stats = {
        total: 0,
        today: 0,
        week: 0,
        domains: new Set()
      };
      
      const now = Date.now();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const weekStart = new Date(now - 7 * 24 * 60 * 60 * 1000);
      
      request.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          const visit = cursor.value;
          stats.total++;
          stats.domains.add(visit.domain);
          
          if (visit.visitTime >= todayStart.getTime()) {
            stats.today++;
          }
          if (visit.visitTime >= weekStart.getTime()) {
            stats.week++;
          }
          
          cursor.continue();
        } else {
          resolve({
            total: stats.total,
            today: stats.today,
            week: stats.week,
            domains: stats.domains.size
          });
        }
      };
      
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  }

  // ========== 固定网站相关功能 ==========

  // 获取固定网站列表
  async function getPinnedSites() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PINNED, 'readonly');
      const store = tx.objectStore(STORE_PINNED);
      const index = store.index('pinnedTime');
      const sites = [];
      
      const request = index.openCursor(null, 'prev');
      
      request.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          sites.push(cursor.value);
          cursor.continue();
        } else {
          resolve(sites);
        }
      };
      
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  }

  // 添加固定网站
  async function pinSite(visit) {
    const pinnedSites = await getPinnedSites();
    
    // 检查是否已固定
    if (pinnedSites.some(site => site.url === visit.url)) {
      return null;
    }
    
    // 检查是否超过最大数量
    if (pinnedSites.length >= MAX_PINNED) {
      throw new Error(`最多只能固定 ${MAX_PINNED} 个网站`);
    }
    
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PINNED, 'readwrite');
      const store = tx.objectStore(STORE_PINNED);
      
      const siteData = {
        url: visit.url,
        title: visit.title || visit.url,
        domain: Utils.getDomain(visit.url),
        favIconUrl: visit.favIconUrl || '',
        pinnedTime: Date.now()
      };
      
      const request = store.add(siteData);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  }

  // 取消固定网站
  async function unpinSite(url) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PINNED, 'readwrite');
      const store = tx.objectStore(STORE_PINNED);
      const index = store.index('url');
      
      const request = index.openCursor(url);
      
      request.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          store.delete(cursor.primaryKey);
          resolve(true);
        } else {
          resolve(false);
        }
      };
      
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  }

  // 检查网站是否已固定
  async function isPinned(url) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PINNED, 'readonly');
      const store = tx.objectStore(STORE_PINNED);
      const index = store.index('url');
      
      const request = index.get(url);
      
      request.onsuccess = () => resolve(!!request.result);
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  }

  // 获取快捷访问网站（固定网站 + 最近访问的不同域名）
  async function getQuickAccessSites() {
    const pinnedSites = await getPinnedSites();
    const recentVisits = await getRecentVisits(100);
    
    // 获取已固定的URL集合
    const pinnedUrls = new Set(pinnedSites.map(site => site.url));
    
    // 从最近访问中筛选出不同域名的网站（排除已固定的）
    const domainSet = new Set();
    const recentSites = [];
    
    for (const visit of recentVisits) {
      if (pinnedUrls.has(visit.url)) continue;
      
      const domain = Utils.getDomain(visit.url);
      if (!domainSet.has(domain)) {
        domainSet.add(domain);
        recentSites.push({
          url: visit.url,
          title: visit.title || visit.url,
          domain: domain,
          favIconUrl: visit.favIconUrl || '',
          isRecent: true
        });
        
        if (pinnedSites.length + recentSites.length >= QUICK_ACCESS_COUNT) {
          break;
        }
      }
    }
    
    // 合并固定网站和最近网站
    return [
      ...pinnedSites.map(site => ({ ...site, isPinned: true })),
      ...recentSites
    ].slice(0, QUICK_ACCESS_COUNT);
  }

  // 清空所有记录
  async function clearAllVisits() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  }

  return {
    addVisit,
    getRecentVisits,
    searchVisits,
    getAllVisits,
    getStats,
    clearAllVisits,
    // 固定网站相关
    getPinnedSites,
    pinSite,
    unpinSite,
    isPinned,
    getQuickAccessSites
  };
})();
