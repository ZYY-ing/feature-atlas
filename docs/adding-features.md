# 添加特性

页面与分析工具独立实现，交互布局参考 Model Atlas；未复制其源码。首版使用无运行时依赖的 ES Modules，静态部署，无需 Python/NPU 环境即可浏览。

1. 在 `features/<id>/` 提供 manifest、nodes、scenes；可参考 `features/ep/spec.mjs`。节点使用稳定 id；每条边包含来源、目的和关系类型说明。
2. 固定每个来源仓库的完整 commit SHA。节点证据包含 repo、sha、file、symbol、start、end、code、hash、url；不得将 main 链接作为固定证据。
3. 将生成的数据写为 `generated/atlas.json`，添加 `features/registry.json` 项。页面根据 `?feature=<id>` 选择特性数据，不依赖 EP 的 Python 类名。
4. 框架为 `id/name/desc/rows/ids/edges`，通过 `parent` 定义层级，`drills` 指定节点展开目标。总图 `modules` 提供大模块的标题、说明与目标 view。`navLabel` 为顶部短索引。`rows` 控制布局，不能用排版位置代替调用证据。可选 `variants` 定义后端阅读分支，提供 `label/rows/ids/edges`。
5. 执行 `npm test`、`npm run build`，再检查桌面与窄屏节点/代码面板。更换版本必须重新提取行号和片段，不能只替换 SHA。

## 证据生成与核验边界

EP 数据由 `tools/generate.mjs` 从固定源码缓存提取。`npm run sources` 自动从完整 SHA 下载公开文件并对照 `features/ep/sources.lock.json` 校验全文哈希，默认缓存 `.cache/sources/`；`npm run generate` 重新生成图谱和完整源码文件。也可运行 `node tools/generate.mjs /path/to/cache`，缓存文件名以仓库键开头，用双下划线替换路径分隔符。工具不会执行下载的源码，也不需要 GitHub 凭据。

本版是**人工维护流程与特殊分发关系 + 自动提取片段/行号/哈希**。`call-path.mjs` 声明已核对的调用者、目标、调用点、条件和注册证据；生成器拒绝缺失或含糊锚点，测试从完整源码复核所有片段。尚无全 Python AST/运行时分发分析器，不把锚点匹配当作动态调用语义的自动证明；未做 NPU 运行验证。

文件分工：`app/main.js` 负责场景/节点/关系阅读，`app/style.css` 负责交互布局；`features/ep/spec.mjs` 定义节点及源码锚点，`views.mjs` 定义层级与布局，`learning.mjs` 定义节点/框架讲解。`tools/` 负责提取与构建。

每份讲解包含 `why/steps/formula/example/read/trap`：目的、执行步骤、公式或契约、小例子、源码阅读顺序、理解边界。不要只给一句简介。节点 `sources` 支持多个证据片段；锚点有重名时必须用 `within` 限定所属类，或显式声明 occurrence，生成器拒绝含糊匹配。新增特性应提供自己的数据与核查资料，不把领域规则写进画布逻辑。

新增 `lesson.io.input/output = {meaning, sample}`，原理页统一渲染数据含义与样例；场景、后端及场景内节点覆盖也必须提供。`contracts.mjs` 维护 EP 样例，`unified-examples.mjs` 维护图表；不在通用页面写入 EP 专家数或 rank 规则。

调用路径采用 `callPaths[].groups[].edges[]`。每条边含 `from/to/site/support/description/kind`；`kind` 区分 call、dispatch、conditional、return、continuation、inheritance、construct、callback、registration。`site` 是调用点；`support` 是继承/注册等补充证据。阶段先后不能标成 call；工厂内部不同构造动作不能伪装为对象之间互相调用。

`sourceFiles` 索引到按完整 SHA 提取的全文 JSON，源码阅读器按需加载。`app/source-reader.js` 和 `notes-store.js` 不依赖 EP 类名；新特性使用相同源码/笔记协议即可复用。个人笔记不写入构建产物，源码版本不匹配的导入会被拒绝。

更新源码版本：先修改固定 SHA 和特性锚点，从官方仓库取得该 SHA 的源码，人工核实分支和调用关系后运行 `node tools/generate.mjs /verified/cache --write-source-lock` 更新全文锁文件，再执行 `npm run reproduce`。此显式选项用于维护者核对后的升级，不应在 CI 中自动重写锁文件掩盖差异。

## 版本组合

EP 当前 vLLM 与 Ascend SHA 为研究快照，不是已验证的依赖安装组合。真实部署请使用 Ascend 发行版要求的 vLLM/CANN/PyTorch 版本。含 NPU 实测的轨迹证据可后续添加，不能用单次轨迹声称覆盖所有分支。
