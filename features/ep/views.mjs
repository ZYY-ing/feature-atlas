// Rows are a visual layout; edges state the semantic relation, not an assumed call stack.
const scene=(id,name,desc,rows,edges,extra={})=>({id,name,desc,rows,ids:rows.flat().filter(Boolean),edges,...extra});
export const scenes=[
scene('overview','先看全局：EP 在做什么？','先确定专家权重的位置，再让 Token 找到专家。点击模块展开独立流程。',[
 ['factory','context','runner'],['sp-shard','control','offload-check']
],[['factory','context','部署后'],['context','runner','本批策略'],['runner','control','执行负载'],['control','runner','后续批次的新布局']],{columns:3,modules:{factory:{title:'部署与专家归属',subtitle:'建通信组 · 分配专家 · 加载权重',view:'init'},context:{title:'每批次上下文',subtitle:'统一选择通信类型与批次元数据',view:'batch'},runner:{title:'一次 MoE 前向',subtitle:'路由 · 分发 · 专家计算 · 回传',view:'forward'},control:{title:'EPLB 反馈闭环',subtitle:'采样 · 规划 · 迁移 · 安全提交',view:'eplb'},'sp-shard':{title:'SP：Token 属于谁',subtitle:'前向布局选项：每卡持有哪几行',view:'sp'},'offload-check':{title:'专家 Offload',subtitle:'独立部署路径：按需加载权重',view:'offload'}},notes:['实线为阶段 / 数据关系，虚线为反馈。SP 是前向布局选项；本快照的 Offload 不支持与 EP/EPLB 同开。']}),
scene('init','部署与专家归属','只看启动阶段：通信组决定谁协作，expert_map 决定谁存专家，weight_loader 才把 checkpoint 写进设备存储。',[
 ['groups'],['factory','registration'],['placement'],['weights'],['setup']
],[['groups','factory','建组后进入加载阶段'],['registration','factory','OOT 注册 / 工厂适配'],['factory','placement','构造权重拥有者'],['placement','weights','全局 ID 到本地槽位'],['factory','setup','Runner 初始化时注册']],{parent:'overview',notes:['点击建组与工厂之间的圆点，右侧展开这两个模块之间的调用链。模块自身只显示原理、源码与笔记。','factory → setup 是对象构造中的另一项工作；图中的垂直排列不是权重加载与通信注册的严格先后保证。']}),
scene('batch','每批次的执行上下文','这一层负责让同组 rank 对本批用哪种通信达成一致；它发生在具体 MoE 层执行之前。',[
 ['context'],['select'],['routed']
],[['context','select','内部调用选择函数'],['select','routed','枚举随 context 进入每层']],{parent:'overview',notes:['初始化创建实现对象；每批选类型；每层再按 moe_config 取匹配实例。三者不能合成一次 select 调用。']}),
scene('forward','一次 MoE 前向','沿路由专家主线阅读，右侧是共享专家分支。蓝色展开入口进入更细的模块图；最后回到 Runner 合并与必要归约。',[
 ['runner'],['transform'],['routed','shared'],['output'],['return']
],[['runner','transform','继承的输入变换'],['transform','routed','_forward_entry / _forward_impl'],['runner','shared','有共享分支时'],['shared','output','共享贡献 / 事件依赖'],['routed','output','路由贡献'],['output','return','最后的条件钩子']],{parent:'overview',drills:{routed:'routed'},navLabel:'MoE 前向',notes:['展开“路由专家执行入口”查看 prepare、Router、量化方法和专家通信。','shared 框表示逻辑分支；真实提交与等待由事件控制。MegaMoE 可把共享计算融进算子。']}),
scene('routed','路由专家：Prepare 到 Finalize','这是 AscendRoutedExperts.forward_impl 的内部主线。先选择本层通信实例，所有前后处理必须使用匹配协议。',[
 ['prepare'],['router'],['quant'],['comm'],['load'],['finalize']
],[['prepare','router','准备后的 X 与 logits'],['router','quant','Top-K 权重与 ID'],['quant','comm','fused_experts()'],['comm','load','算子任务计数'],['load','finalize','记录后恢复布局']],{parent:'forward',drills:{router:'routing',comm:'comm'},navLabel:'路由主线',notes:['load 仅在 MRv2 EPLB state 存在时记录；未启用时跳过。旧 dynamic_eplb 路径不在本图内。','prepare 使用选中的后端实现；此处源码以 All2All.prepare 展示接口，切换通信子图查看其他后端。']}),
scene('routing','Router：从逻辑专家到物理槽位','先按模型规则选专家，再在 EPLB 开启时映射到该专家的某个副本。映射改变计算位置，保留专家身份。',[
 ['router'],['mapping'],['placement']
],[['router','mapping','BaseRouter 的 EPLB 映射钩子'],['mapping','placement','执行侧根据物理 ID 找本地槽位']],{parent:'forward',notes:['placement 框是读取已有 expert_map 的数据依赖；前向不会在这里重新分配或加载全部权重。']}),
scene('comm','Dispatch → 专家计算 → Combine','切换的是源码阅读分支。All-to-All/MC2 发送目标专家需要的任务；AllGather 先聚合输入；融合分支不能再画一次独立 MLP。',[
 ['prepare'],['alltoall'],['mlp'],['combine'],['finalize']
],[['prepare','alltoall','局部路由任务'],['alltoall','mlp','按本地专家分组'],['mlp','combine','专家计算结果'],['combine','finalize','来源 Token 顺序']],{parent:'forward',variants:{
 ALLTOALL:{label:'All-to-All',rows:[['prepare'],['alltoall'],['mlp'],['combine'],['finalize']],ids:['prepare','alltoall','mlp','combine','finalize'],edges:[['prepare','alltoall','局部路由任务'],['alltoall','mlp','分组输入'],['mlp','combine','专家输出'],['combine','finalize','回程后恢复布局']]},
 ALLGATHER:{label:'AllGather',rows:[['allgather'],['ag-dispatch'],['mlp'],['ag-combine'],['finalize']],ids:['allgather','ag-dispatch','mlp','ag-combine','finalize'],edges:[['allgather','ag-dispatch','聚合 X 与 logits 后 Top-K'],['ag-dispatch','mlp','本卡专家的分组行'],['mlp','ag-combine','本卡专家贡献'],['ag-combine','finalize','跨卡求和 / 再分片']]},
 MC2:{label:'MC2',rows:[['mc2'],['mc2-dispatch'],['mlp'],['mc2-combine'],['finalize']],ids:['mc2','mc2-dispatch','mlp','mc2-combine','finalize'],edges:[['mc2','mc2-dispatch','prepare 与专用 dispatcher'],['mc2-dispatch','mlp','设备分发结果'],['mlp','mc2-combine','本地专家输出'],['mc2-combine','finalize','设备回程结果']]},
 FUSED_MC2:{label:'FUSED_MC2',rows:[['fused'],['finalize']],ids:['fused','finalize'],edges:[['fused','finalize','融合执行返回结果']]}
 },notes:['Top-K 位于 prepare 之后、fused_experts 之前。通信子图省略重复的 Router 框，AllGather 的 Top-K 因此针对聚合后的输入。']}),
scene('sp','SP：先分 Token，再选择通信路径','H 维完整，每张物理 TP rank 只拥有一段 Token 行。AllGather 与 All-to-All/MC2 的恢复方式不同。',[
 ['sp-shard'],['sp-meta'],['allgather','prepare'],['sp-collective','alltoall'],['finalize']
],[['sp-shard','sp-meta','分片后维护尺寸上下文'],['sp-meta','allgather','AllGather 分支'],['sp-meta','prepare','All-to-All / MC2 分支'],['allgather','sp-collective','内部收集实现'],['prepare','alltoall','直接路由局部 Token'],['sp-collective','finalize','计算后归约并再分片'],['alltoall','finalize','计算 / 回程后恢复']],{parent:'overview',notes:['左侧 collective 是 AllGather 的内部实现，未发生两次独立聚合；本图省略重复的专家计算。右侧 A2A 框代表 A2A/MC2 这类局部路由路径。','模型包装层已完成 shard；_sequence_parallel_context 只管理元数据，不再执行一次切分。']}),
scene('eplb','EPLB：一个跨批次的反馈闭环','先采样当前布局的真实负载，后台规划并搬运权重；前台安全提交后，后续 Token 才使用新路由表。',[
 ['control'],['load'],['step'],['rebalance'],['policy'],['async'],['transfer'],['commit'],['lookup'],['mapping']
],[['control','load','采样资格'],['load','step','物理专家计数'],['step','rebalance','窗口 / 周期条件'],['rebalance','policy','逻辑专家负载窗口'],['policy','async','新布局与来源计划'],['async','transfer','后台逐层迁移'],['transfer','commit','结果就绪后前台安装'],['commit','lookup','更新当前设备路由表'],['lookup','mapping','下一次前向使用']],{parent:'overview',notes:['这是控制与数据依赖图，跨前台线程、后台 worker 和 STAIR planner 进程；不是同一 forward 内连续发生。','STAIR/default 是规划策略；HIXL/Gloo 是专家权重迁移通道；All-to-All/MC2 是前向 Token 通信。']}),
scene('offload','专家 Offload：管理驻留工作集','本快照的独立单 worker 路径。先检查支持矩阵，再根据本批选中的专家准备设备权重，复用原有量化计算。',[
 ['offload-check'],['router'],['residency'],['offload-exec']
],[['offload-check','router','支持配置下的前向'],['router','residency','本批逻辑专家并集'],['residency','offload-exec','设备权重视图与槽位 ID']],{parent:'overview',notes:['专家权重可驻主机，但专家计算仍在 NPU；不会自动变成 CPU 专家推理。','本图没有连接 EPLB：该快照的校验明确拒绝 EP/EPLB 与 Offload 同开。']})
];
// The computation branches are children of the routed-experts framework.
for(const id of ['routing','comm'])scenes.find(s=>s.id===id).parent='routed';
scenes.find(s=>s.id==='init').connectors=[
 {path:'startup-groups',to:'groups',caption:'启动到建组'},
 {path:'groups-factory',from:'groups',to:'factory',caption:'建组到工厂'}
];
scenes.find(s=>s.id==='comm').navLabel='专家通信';
scenes.find(s=>s.id==='overview').navLabel='总框架';
scenes.find(s=>s.id==='init').navLabel='部署与加载';
scenes.find(s=>s.id==='batch').navLabel='批次上下文';
