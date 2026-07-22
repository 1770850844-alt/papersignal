# PaperSignal

本地优先的公众号和小红书内容工作台。编辑、模板、品牌 VI、预览和导出都可离线使用；AI 使用用户自己的 API Key，不经过 PaperSignal 服务器。

## 功能

- 7 套公众号文章模板与轻量富文本编辑器
- 手机壳内的公众号 / 小红书滚动预览
- 长文转换小红书卡片、笔记扩写公众号文章
- 小红书 SVG 图集打包下载、Emoji 正文复制
- 公众号兼容富文本复制、干净 HTML 导出
- 本机 SQLite 草稿与品牌 VI
- OpenAI、智谱、Kimi、DeepSeek 预设，以及任意 OpenAI Chat Completions 兼容端点
- API Key 保存到 macOS Keychain / Windows Credential Manager

## 使用桌面版

直接下载安装包：

- [下载 macOS（Apple Silicon / M 系列）版 LayoutGo 0.1.6 `.dmg`](https://github.com/1770850844-alt/layoutgo/releases/download/app-v0.1.6/LayoutGo_0.1.6_aarch64.dmg)
- [下载 Windows 64 位版 LayoutGo 0.1.6 `.exe`](https://github.com/1770850844-alt/layoutgo/releases/download/app-v0.1.6/LayoutGo_0.1.6_x64-setup.exe)
- [查看全部版本与更新记录](https://github.com/1770850844-alt/layoutgo/releases)

首次使用 AI 时，点击 `AI 设置`，选择服务商或自定义端点，填入 Base URL、模型名和自己的 API Key。

不会自动发布到微信公众号或小红书：公众号使用“复制公众号正文”后粘贴到后台；小红书使用“下载图集”和“复制正文”后手动上传发布。

## 本地开发

前置条件：Node.js 22+、Rust stable、macOS 需 Xcode Command Line Tools；Windows 需 WebView2 和 MSVC Build Tools。

```bash
npm install
npm run desktop:dev
```

只运行网页界面：

```bash
npm run dev
```

生产构建：

```bash
npm run desktop:build
```

## 发布新版

更新 `package.json` 与 `src-tauri/tauri.conf.json` 的版本号，提交并推送标签：

```bash
git tag app-v0.1.1
git push origin app-v0.1.1
```

GitHub Actions 会自动构建 macOS `.dmg` 和 Windows `.exe`，上传到对应的 GitHub Release。首次发布前可以在 GitHub 仓库的 Actions 页面确认 workflow 有 `contents: write` 权限。

## 安全与兼容性

桌面端通过 Rust 层代理 AI 请求，前端没有持久化 API Key。服务商需要支持 OpenAI 风格的 `/chat/completions` 接口；如果某个供应商的端点、鉴权或返回格式不同，请使用它提供的兼容地址，或在后续版本增加该服务商适配器。
