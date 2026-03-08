importScripts('shared/constants.js', 'shared/utils.js', 'shared/db.js');

// 监听标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
    const visit = {
      url: tab.url,
      title: tab.title || '(无标题)',
      tabId: tabId,
      favIconUrl: tab.favIconUrl || ''
    };
    
    DB.addVisit(visit).then(id => {
      if (id) {
        console.log('[网页记录器] 已记录:', tab.url);
      } else {
        console.log('[网页记录器] 跳过重复记录:', tab.url);
      }
    }).catch(err => console.error('[网页记录器] 记录失败:', err));
  }
});

// 扩展安装时记录当前打开的标签页
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('[网页记录器] 首次安装，记录当前标签页...');
    
    try {
      const tabs = await chrome.tabs.query({});
      let recorded = 0;
      
      for (const tab of tabs) {
        if (tab.url && tab.url.startsWith('http')) {
          const visit = {
            url: tab.url,
            title: tab.title || '(无标题)',
            tabId: tab.id,
            favIconUrl: tab.favIconUrl || ''
          };
          
          const id = await DB.addVisit(visit).catch(() => null);
          if (id) recorded++;
        }
      }
      
      console.log(`[网页记录器] 安装完成，已记录 ${recorded} 个标签页`);
    } catch (err) {
      console.error('[网页记录器] 安装初始化失败:', err);
    }
  }
});

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStats') {
    DB.getStats().then(stats => {
      sendResponse({ success: true, stats });
    }).catch(err => {
      sendResponse({ success: false, error: err.message });
    });
    return true; // 保持消息通道开启
  }
});
