# Feature Atlas

[在线体验](https://zyy-ing.github.io/feature-atlas/)

面向固定源码版本的特性可视化阅读工具。首版提供 MRv2 EP 的 7 个视图、30 个源码节点，覆盖跨仓库主线、初始化与上下文、Forward、通信后端、SP、EPLB 和独立专家 Offload。

## 本地使用

要求 Node.js 22+，无 npm 依赖安装步骤。

```bash
npm run dev
npm test
npm run build
```

开发地址为 `http://127.0.0.1:5173`。构建结果在 `dist/`，可使用 GitHub Pages 或任意静态托管服务。点击节点查看说明、原始行号代码、固定 GitHub 链接和相邻关系；支持搜索、分支切换、拖动缩放、明暗主题和节点链接。

## 内容范围

数据为人工核验的核心流程及自动提取的代码证据，不是自动生成的全量调用图。未执行 NPU 推理。每个源码节点记录 SHA、文件、符号、原始行号和片段哈希；源码阅读快照不代表安装兼容组合。

参见 [新增特性与数据约定](docs/adding-features.md)、[源码片段版权说明](THIRD_PARTY_NOTICES.md)。界面交互参考 [Model Atlas](https://xuchi-0808.github.io/model-atlas/#/hunyuan-hy4)，代码独立实现。
