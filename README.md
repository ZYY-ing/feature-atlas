# Feature Atlas

[在线体验](https://zyy-ing.github.io/feature-atlas/)

面向固定源码版本的特性可视化阅读工具。提供 MRv2 EP 的 10 个分层框架、45 个源码节点。总图点击进入部署、批次上下文、MoE 前向、SP、EPLB 与独立 Offload；前向继续展开路由主线、Router 和通信分支。

## 本地使用

要求 Node.js 22+，无 npm 依赖安装步骤。

```bash
npm run dev
npm test
npm run build
```

开发地址为 `http://127.0.0.1:5173`。构建结果在 `dist/`，可使用 GitHub Pages 或任意静态托管服务。顶部索引与面包屑切换框架；原理页包含每步输入输出及统一样例，源码页提供调用路径、调用点、原始行号和逐行笔记；支持通信分支、拖动缩放、可调面板宽度和节点链接。

## 一次 Action 复现

在 Actions 中运行 **Build and deploy Pages**。默认 `publish=false`：自动下载固定 SHA 源码文件，校验全文哈希，重新生成图谱/行号/源码文件，运行测试并构建，上传 `feature-atlas-preview` 产物；不部署。下载解压后可直接打开 `review.html`，或启动静态服务器浏览 `index.html`。确认后可手动设置 `publish=true` 部署；push 到 main 仍会自动部署。

本地等价命令为 `npm run reproduce`（Node 22+、curl、网络访问 GitHub）。无需 Python、PyTorch、CANN 或 NPU。普通离线浏览使用已生成的数据，不需要下载源码。

## 源码与行笔记

部署与加载框架的“源码与笔记”中提供六段可折叠路径。每步显示调用者、被调用者、所属仓库、文件、定义行号、功能及调用点；返回启动器、继承、回调和注册替换有独立标识。此路径限定普通 MRv2 启动与 DeepSeekV2 模型分支，不是全模型运行轨迹。

点击代码行号即可添加行注释，保存后在代码行旁显示。支持完整文件/关键片段切换、笔记 JSON 导入导出；切换节点或页面离开时会保存当前草稿。笔记绑定仓库、固定 SHA、文件、源码哈希及原始行，导入时验证版本和代码行。源码保持原样，个人笔记只保存在当前浏览器，不会写回 GitHub或自动跨设备同步。请使用导出备份；`file://` 审阅稿和 HTTP 网站的浏览器存储相互独立。

## 内容范围

数据为人工核验的核心流程及自动提取的代码证据，不是自动生成的全量调用图。未执行 NPU 推理。每个源码节点记录 SHA、文件、符号、原始行号和片段哈希；源码阅读快照不代表安装兼容组合。

本次已对照课程与用户提供的 Notebook 修订流程，详见 [MRv2 逐项核查](docs/mrv2-audit.md)。另见 [新增特性与数据约定](docs/adding-features.md)、[源码片段版权说明](THIRD_PARTY_NOTICES.md)。界面交互参考 [Model Atlas](https://xuchi-0808.github.io/model-atlas/#/hunyuan-hy4)，代码独立实现。
