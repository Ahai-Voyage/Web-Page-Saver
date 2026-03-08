const CONSTANTS = {
  DB_NAME: 'PageVisitsDB',
  DB_VERSION: 3,  // 升级版本以添加新存储对象
  STORE_NAME: 'visits',
  STORE_PINNED: 'pinned_sites',
  MAX_VISITS: 5000,
  MAX_PINNED: 8,  // 最多固定8个网站
  
  // 去重时间窗口（毫秒）- 5分钟内同一页面只记录一次
  DEDUP_WINDOW: 5 * 60 * 1000,
  
  // 默认显示记录数
  DEFAULT_LIMIT: 50,
  
  // 快捷访问区显示数量
  QUICK_ACCESS_COUNT: 8,
  
  // 导出格式
  EXPORT_FORMATS: {
    JSON: 'json',
    CSV: 'csv',
    HTML: 'html'
  },
  
  // 主题设置
  THEMES: {
    LIGHT: 'light',
    DARK: 'dark'
  }
};

// 使常量可在不同模块间使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONSTANTS;
}
