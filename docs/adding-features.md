# 添加特性

页面与分析工具独立实现，交互布局参考 Model Atlas；未复制其源码。首版使用无运行时依赖的 ES Modules，静态部署，无需 Python/NPU 环境即可浏览。

1. 在 `features/<id>/` 提供 manifest、nodes、scenes；可参考 `features/ep/spec.mjs`。节点使用稳定 id；每条边包含来源、目的和关系类型说明。
2. 固定每个来源仓库的完整 commit SHA。节点证据包含 repo、sha、file、symbol、start、end、code、hash、url；不得将 main 链接作为固定证据。
3. 将生成的数据写为 `generated/atlas.json`，添加 `features/registry.json` 项。页面根据 `?feature=<id>` 选择特性数据，不依赖 EP 的 Python 类名。
4. 框架为 `id/name/desc/rows/ids/edges`，通过 `parent` 定义层级，`drills` 指定节点展开目标。总图 `modules` 提供大模块的标题、说明与目标 view。`navLabel` 为顶部短索引。`rows` 控制布局，不能用排版位置代替调用证据。可选 `variants` 定义后端阅读分支，提供 `label/rows/ids/edges`。
5. 执行 `npm test`、`npm run build`，再检查桌面与窄屏节点/代码面板。更换版本必须重新提取行号和片段，不能只替换 SHA。

## 证据生成与核验边界

EP 数据由 `tools/generate.mjs` 从固定源码缓存提取。运行 `node tools/generate.mjs /path/to/cache`；缓存文件名格式为 `ascend--vllm_ascend__ops__...py` 或 `vllm--vllm__...py`，即以双下划线替换文件路径分隔符。开发者需自行从 spec 中的完整 SHA 下载这些公开文件；工具不会运行它们，也不会读取凭据。

本版是**人工维护流程 + 自动提取片段/行号/哈希**。尚无全 Python AST/继承/注册分析器，调用边也未逐一自动验证；未解析的插件入口和底层算子明确留在范围边界。测试校验的是数据完整性和片段内部一致性，不代表已做 NPU 运行验证。

文件分工：`app/main.js` 负责场景/节点/关系阅读，`app/style.css` 负责交互布局；`features/ep/spec.mjs` 定义节点及源码锚点，`views.mjs` 定义层级与布局，`learning.mjs` 定义节点/框架讲解。`tools/` 负责提取与构建。

每份讲解包含 `why/steps/formula/example/read/trap`：目的、执行步骤、公式或契约、小例子、源码阅读顺序、理解边界。不要只给一句简介。节点 `sources` 支持多个证据片段；锚点有重名时必须用 `within` 限定所属类，或显式声明 occurrence，生成器拒绝含糊匹配。新增特性应提供自己的数据与核查资料，不把领域规则写进画布逻辑。

## 版本组合

EP 当前 vLLM 与 Ascend SHA 为研究快照，不是已验证的依赖安装组合。真实部署请使用 Ascend 发行版要求的 vLLM/CANN/PyTorch 版本。含 NPU 实测的轨迹证据可后续添加，不能用单次轨迹声称覆盖所有分支。
