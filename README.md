# ⚡ Crush 聊天记录 Debug 诊断器

> 把你和 Crush 的聊天记录交给 AI，用毒舌的专业视角生成一张赛博朋克风格的
> **诊断卡片**，并一键导出为无损 PNG。

支持四种完全不同的诊断视角，各有独立的提示词、数据结构与卡片 UI：

- 💻 **毒舌系统架构师** → 一份《系统事故报告》：Traceback、根因分析、修复补丁
- 📊 **冷酷产品经理** → 一份《增长复盘报告》：指标看板、转化漏斗、流失归因、增长实验
- 🧑‍💼 **大厂 HR** → 一份《试用期转正评估》：胜任力评分、360 环评、PIP 改进计划
- 💰 **VC 投资人** → 一份《项目尽调报告》：估值、关键数据、项目亮点与风险红旗

<!-- 运行项目后，建议在此处放一张诊断卡片截图 -->

## ✨ 特性

- 🧠 **多视角诊断**：每种视角是一个自包含的「报告模块」，新增一种 = 新增一个文件
- 🃏 **风格化卡片**：事故报告（靛蓝）与增长复盘（翠绿）结构、配色完全不同
- 📥 **一键导出无损 PNG**：基于 html-to-image，2 倍像素密度
- 🔒 **100% 浏览器端运行**：API Key 与聊天记录都不离开你的设备
- ⚙️ **零运行时框架**：Vite + 原生 JS，模块化拆分，无框架体积负担

## 🛠 技术栈

| 用途     | 选型                                                        |
| -------- | ----------------------------------------------------------- |
| 构建工具 | [Vite](https://vitejs.dev/)                                 |
| 样式     | [Tailwind CSS v4](https://tailwindcss.com/)                 |
| 图片导出 | [html-to-image](https://github.com/bubkoo/html-to-image)    |
| AI 模型  | Google Gemini                                               |
| 代码规范 | ESLint + Prettier                                           |

## 🚀 快速开始

### 环境要求

- Node.js >= 20

### 安装与运行

```bash
npm install      # 安装依赖
npm run dev      # 启动本地开发服务器
npm run build    # 构建生产产物到 dist/
npm run preview  # 本地预览构建产物
```

### 获取 API Key

诊断由 Google Gemini 驱动，需要一个免费的 API Key：前往
[Google AI Studio](https://aistudio.google.com/) 申请，填入页面 STEP 1 即可。

> Key 仅保存在浏览器 `localStorage`，不会上传到任何服务器。

## 📂 项目结构

```
.
├── .github/workflows/deploy.yml   # GitHub Pages 自动部署
├── src/
│   ├── modules/
│   │   ├── reports/               # 报告模块：一种诊断视角 = 一个文件
│   │   │   ├── index.js           # 报告注册表
│   │   │   ├── incident.js        # 系统事故报告（架构师）
│   │   │   ├── growth.js          # 增长复盘报告（产品经理）
│   │   │   ├── hr.js              # 试用期转正评估（大厂 HR）
│   │   │   └── vc.js              # 项目尽调报告（VC 投资人）
│   │   ├── gemini.js              # Gemini 接口调用（传输层）
│   │   ├── dom.js                 # 渲染层共用的 DOM 小工具
│   │   └── exporter.js            # PNG 无损导出
│   ├── styles/main.css            # Tailwind 入口与自定义样式
│   └── main.js                    # 应用入口与事件绑定
├── index.html                     # 页面骨架
├── vite.config.js                 # Vite 配置
├── eslint.config.js               # ESLint 配置
└── package.json
```

> 每个报告模块自包含 `label / required / buildPrompt / render` 四样东西，
> 提示词、JSON schema、卡片渲染都收在一个文件里，互不影响。

## 📜 可用脚本

| 命令               | 说明              |
| ------------------ | ----------------- |
| `npm run dev`      | 启动开发服务器    |
| `npm run build`    | 生产构建          |
| `npm run preview`  | 预览构建产物      |
| `npm run lint`     | ESLint 检查       |
| `npm run lint:fix` | ESLint 自动修复   |
| `npm run format`   | Prettier 格式化   |

## 🌐 部署

推送到 `main` 分支后，GitHub Actions 会自动构建并发布到 GitHub Pages。
首次使用需在仓库 **Settings → Pages → Build and deployment → Source** 选择
**GitHub Actions**。

## ⚠️ 模型说明

默认模型为 `gemini-3.5-flash`，定义在 [`src/modules/gemini.js`](./src/modules/gemini.js)。
若该模型在你的账号下不可用，请改为账号支持的模型（如 `gemini-2.5-flash`）。

## 📄 License

[MIT](./LICENSE)
