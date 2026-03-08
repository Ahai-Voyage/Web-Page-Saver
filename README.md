# 📖 网页记录器 (Browser History Recorder)

<div align="center">

一个简洁高效的 Chrome/Edge 浏览器扩展，自动记录您的浏览历史，支持智能去重、快捷访问、批量打开等功能。（如果你工作需要几个固定网页但每次都要打开，这个插件可以保存这些网页，方便下次直接打开，也可以导出本地文件，放入U盘随时打开）

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Chrome](https://img.shields.io/badge/Chrome-88+-green)](https://www.google.com/chrome/)
[![Edge](https://img.shields.io/badge/Edge-88+-green)](https://www.microsoft.com/edge)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

</div>

---

## ✨ 功能特性

### 🎯 核心功能

- **自动记录** - 自动记录所有访问的网页（标题、URL、时间戳）
- **智能去重** - 5 分钟内同一页面只记录一次，避免重复
- **本地存储** - 所有数据存储在 IndexedDB，隐私安全
- **快速搜索** - 支持按标题、URL、域名搜索历史记录

### 🚀 一键打开

- **快捷访问区** - 显示最近访问的 8 个不同域名
- **固定网站** - 可固定最多 8 个常用网站到快捷访问区
- **一键打开全部** - 一键打开快捷访问区所有网站
- **批量选择打开** - 长按进入批量模式，选择多个网页一键打开

### 📊 数据统计

- **今日访问** - 显示今天访问的网页数量
- **本周访问** - 显示本周访问的网页数量
- **总计访问** - 显示历史总记录数
- **域名分组** - 按域名分组查看浏览记录

### 💾 数据导出

- **JSON 格式** - 导出为结构化 JSON 文件
- **CSV 格式** - 导出为 Excel 可读的 CSV 文件
- **HTML 格式** - 导出为美观的 HTML 表格

---

## 📦 安装方法

### 方式一：从 Chrome 网上应用店安装（推荐）

> 即将上线，敬请期待...

### 方式二：手动安装（开发者模式）

1. **下载源码**
   ```bash
   git clone https://github.com/YOUR_USERNAME/browser-history-recorder.git
   cd browser-history-recorder
   ```

2. **加载扩展**
   - 打开 Chrome/Edge 浏览器
   - 访问 `chrome://extensions/` 或 `edge://extensions/`
   - 开启右上角的 **"开发者模式"**
   - 点击 **"加载已解压的扩展程序"**
   - 选择项目文件夹

3. **开始使用**
   - 点击工具栏的扩展图标
   - 或使用快捷键 `Ctrl+Shift+H`

---

## 🎨 使用指南

### 快捷访问

- **点击图标** - 直接打开网站
- **拖拽滑动** - 鼠标拖拽或滚轮横向滚动查看更多
- **一键打开** - 点击"一键打开"按钮打开所有快捷网站

### 固定网站

1. 在历史记录中找到想要固定的网站
2. 点击右侧的 ⭐ 图钉按钮
3. 网站将出现在快捷访问区（带黄色标记）
4. 再次点击 ⭐ 取消固定

### 批量打开

1. **长按**任意历史记录项（0.5 秒）进入批量模式
2. 勾选想要打开的网页
3. 点击"打开选中"按钮
4. 或使用"全选"快速选择

### 搜索历史

- 在搜索框输入关键词
- 支持搜索标题、URL、域名
- 实时过滤显示结果

---

## 🛠️ 技术栈

- **Manifest V3** - 最新的 Chrome 扩展标准
- **IndexedDB** - 本地大容量数据存储
- **Service Worker** - 高效的后台服务工作线程
- **Vanilla JS** - 原生 JavaScript，无依赖框架

---

## 📁 项目结构

```
browser-history-recorder/
├── manifest.json          # 扩展配置文件
├── background.js          # Service Worker 后台脚本
├── popup/
│   ├── popup.html         # 弹窗主界面
│   ├── popup.css          # 样式文件
│   └── popup.js           # 弹窗交互逻辑
├── shared/
│   ├── constants.js       # 常量配置
│   ├── utils.js           # 工具函数
│   └── db.js              # IndexedDB 封装
├── icons/                 # 图标文件
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

---

## 🔧 开发

### 环境要求

- Chrome 88+ 或 Edge 88+
- 任意代码编辑器（推荐 VS Code）

### 调试

1. 打开 `chrome://extensions/`
2. 找到扩展，点击 **"查看视图：popup"**
3. 右键 → **"检查"** 打开开发者工具
4. 在 `background.js` 中查看后台日志

### 构建

本项目无需构建，直接修改源码即可生效。

---

## 📝 更新日志

### v2.0.0 (2026-03-08)

**新增功能**
- ✨ 快捷访问区：显示最近访问的网站
- 🔩 固定网站：支持固定最多 8 个常用网站
- 🖱️ 一键打开：一键打开快捷访问区所有网站
- ✅ 批量操作：长按进入批量模式，多选打开
- 🔍 智能搜索：支持标题、URL、域名搜索
- 📊 数据统计：显示今日/本周/总计访问量

**优化改进**
- 🎨 全新 UI 设计，简约高级风格
- ⚡ 智能去重，5 分钟内同一页面只记录一次
- 🔄 拖拽滑动：快捷访问区支持鼠标拖拽
- 📱 触摸支持：支持触摸屏设备
- 💾 数据库升级：IndexedDB 性能优化

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

---

## 🙏 致谢

感谢所有贡献者和使用者！

---

## 📬 联系方式

- **作者**: Ahai-Voyage
- **邮箱**: wzybfl@outlook.com
- **项目链接**:https://github.com/Ahai-Voyage/Web-Page-Saver

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给一个 Star 支持！**

Made with ❤️ by Ahai-Voyage

</div>
