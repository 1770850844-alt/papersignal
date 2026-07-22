# LayoutGo

LayoutGo 是一款本地优先的公众号排版与小红书制卡桌面工具。文章编辑、模板、品牌素材、预览和草稿都保存在本机；使用 AI 时由用户自行配置 API Key，内容不会经过 LayoutGo 服务器。

## 核心功能

- **公众号排版**：10 套具有不同内容结构的文章模板，配合富文本编辑、真实公众号手机预览、干净 HTML 导出与公众号正文复制。
- **小红书制卡**：12 套不同版式的知识卡片模板，支持独立编辑、真实小红书手机预览、3:4 图集导出与防裁剪查看。
- **AI 内容转换**：将长文拆解为小红书卡片，或把小红书笔记扩写为公众号文章；内置稳定的输出结构与平台语气提示词。
- **AI 排版与 AI 制卡**：基于当前编辑内容生成适合公众号或小红书的成稿，再由用户继续编辑。
- **AI 服务配置**：支持 OpenAI、智谱、Kimi、DeepSeek 及任何兼容 OpenAI Chat Completions 的服务；可保存、选择、删除并测试服务连通性。
- **本地草稿与品牌库**：公众号文章与小红书制卡草稿分别保存，可再次打开、编辑或删除；支持品牌色、字体与 Logo 的本地配置。
- **本地安全存储**：草稿数据保存于本机 SQLite；API Key 使用 macOS Keychain 或 Windows Credential Manager 保存。

## 下载桌面版

当前稳定版本：`v0.1.6`

- [下载 macOS（Apple Silicon / M 系列）`.dmg`](https://github.com/1770850844-alt/layoutgo/releases/download/app-v0.1.6/LayoutGo_0.1.6_aarch64.dmg)
- [下载 Windows 64 位 `.exe`](https://github.com/1770850844-alt/layoutgo/releases/download/app-v0.1.6/LayoutGo_0.1.6_x64-setup.exe)
- [查看全部版本与更新记录](https://github.com/1770850844-alt/layoutgo/releases)

首次使用 AI：进入 **AI 服务配置**，选择服务商或自定义端点，填写 Base URL、模型名称和自己的 API Key，然后运行连通性测试并保存。

LayoutGo 不会自动发布到微信公众号或小红书。公众号内容使用“复制公众号正文”后粘贴到后台；小红书内容下载图集后手动上传发布。

## 本地开发

前置条件：Node.js 22+、Rust stable。macOS 需要 Xcode Command Line Tools；Windows 需要 WebView2 与 MSVC Build Tools。

```bash
npm install
npm run desktop:dev
```

仅运行网页界面：

```bash
npm run dev
```

构建当前系统的桌面安装包：

```bash
npm run desktop:build
```

## 发布新版本

同步更新 `package.json`、`package-lock.json`、`src-tauri/Cargo.toml` 和 `src-tauri/tauri.conf.json` 中的版本号，完成校验后提交并推送新标签。例如发布 `0.1.7`：

```bash
git tag -a app-v0.1.7 -m "LayoutGo v0.1.7"
git push origin app-v0.1.7
```

GitHub Actions 会自动构建 macOS `.dmg` 和 Windows `.exe`，并上传到对应的 GitHub Release。

## 隐私与兼容性

AI 请求由桌面端 Rust 层发起，前端不会持久化 API Key。自定义服务需要提供 OpenAI 风格的 `/chat/completions` 接口；若服务商使用不同的鉴权方式或返回格式，请填写其兼容地址。
