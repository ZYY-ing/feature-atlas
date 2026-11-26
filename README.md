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

开发地址为 `http://127.0.0.1:5173`。构建结果在 `dist/`，可使用 GitHub Pages 或任意静态托管服务。顶部索引与面包屑切换框架；点击节点查看原理、例子、张量公式、源码阅读提示、原始行号和上下游；支持通信分支切换、拖动缩放、明暗主题和节点链接。

## 内容范围

数据为人工核验的核心流程及自动提取的代码证据，不是自动生成的全量调用图。未执行 NPU 推理。每个源码节点记录 SHA、文件、符号、原始行号和片段哈希；源码阅读快照不代表安装兼容组合。

本次已对照课程与用户提供的 Notebook 修订流程，详见 [MRv2 逐项核查](docs/mrv2-audit.md)。另见 [新增特性与数据约定](docs/adding-features.md)、[源码片段版权说明](THIRD_PARTY_NOTICES.md)。界面交互参考 [Model Atlas](https://xuchi-0808.github.io/model-atlas/#/hunyuan-hy4)，代码独立实现。
