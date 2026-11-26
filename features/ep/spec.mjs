export const versions={vllm:{repo:'vllm-project/vllm',sha:'6ed3615cf6a3cb7921a26bc3d59949a789fd2bf8'},ascend:{repo:'vllm-project/vllm-ascend',sha:'b54afa62e8554caee22715d90ffe6a018d541b42'}};
const a='vllm_ascend/ops/fused_moe/',v='vllm/model_executor/layers/fused_moe/';
// Each anchor must exist in the pinned source. It selects original lines, never synthesized code.
const n=(id,title,repo,file,anchor,symbol,summary,input,output,note='')=>({id,title,repo,file,anchor,symbol,summary,input,output,note});
export const nodes=[
n('factory','构建 MoE 执行管线','vllm',v+'layer.py','runner = runner_cls(', 'FusedMoEFactory','上游工厂创建 Router、RoutedExperts 和 MoERunner。OOT 可插拔分发让 NPU 接口落到 Ascend 实现。','模型与并行配置','MoERunner 实例','本图未展开插件启动注册全过程。覆盖关系与直接函数调用分开标记。'),
n('runner','Ascend MoE Runner','ascend',a+'fused_moe.py','result = self._forward_entry(', 'AscendMoERunner.forward','组织输入变换、执行入口、共享与路由结果合并。该快照覆盖了上游 forward，而不是简单调用 super().forward。','hidden_states、router_logits','该层 MoE 输出'),
n('transform','继承上游输入变换','vllm',v+'runner/moe_runner.py','def apply_routed_input_transform(', 'MoERunner.apply_routed_input_transform','Ascend Runner 使用继承的方法准备 routed/shared 输入，表明跨仓库关系不只是单向调用。','原始 hidden_states','routed 与 shared 输入','这是继承方法调用；并非先执行一遍完整的上游 MoE。'),
n('routed','路由专家执行入口','ascend',a+'routed_experts.py','prepare_output = moe_comm_method.prepare(', 'AscendRoutedExperts.forward_impl','取得本层通信实例，prepare 输入，选专家后调用量化实现，并在结束时记录负载与恢复布局。','本地 Token 特征、logits','routed_out 与执行事件'),
n('router','Router / Top-K','ascend',a+'routed_experts.py','topk_weights, topk_ids = self._select_experts(', 'AscendRoutedExperts.forward_impl','依据模型规则选择逻辑专家和权重。EPLB 路径通过适配映射到物理专家。','[T,H]、[T,E]','权重与专家 ID：[T,k]','物理映射不能将逻辑专家替换为另一个专家。'),
n('comm','专家执行策略','ascend',a+'moe_comm_method.py','token_dispatch_output = self.token_dispatcher.token_dispatch(', 'MoECommMethod.fused_experts','分阶段后端在这里串联 Dispatch、专家 MLP、Combine，并返回专家任务计数。','专家 ID、权重、Token 特征','专家输出与计数','FUSED_MC2 可覆盖该方法，将多个阶段下沉到融合算子。'),
n('mlp','Grouped MLP','ascend',a+'moe_mlp.py','if quant_method.supports_fused_activation(', 'apply_moe_mlp','根据量化方法执行 GMM1、激活/量化和 GMM2。融合激活是条件分支，不能再重复执行普通激活。','分组后的专家输入','专家计算结果'),
n('finalize','恢复 Token 布局','ascend',a+'routed_experts.py','routed_out = _EXTRA_CTX.moe_comm_method.finalize(', 'AscendRoutedExperts.forward_impl','通信策略根据元数据恢复输出，是否归约依后端决定。','专家返回结果与 padding 信息','按原布局组织的 routed_out'),
n('shared','共享专家分支','ascend',a+'fused_moe.py','if self._megamoe_shared_expert_fused:', 'AscendMoERunner._forward_impl','共享分支可按事件与路由分支重叠。MegaMoE 若已融合共享计算，跳过独立分支。','shared_experts_input','shared_out 或已融合结果','这是并行/条件分支，不表示所有后端都有单独的共享 kernel。'),
n('return','上游输出补充钩子','vllm',v+'runner/moe_runner.py','def _maybe_add_zero_expert_output(', 'MoERunner._maybe_add_zero_expert_output','Ascend forward 结束时调用继承的上游钩子；仅 ZeroExpertRouter 等适用路径增加对应贡献。','合并并归约后的结果','返回模型的输出','一般模型可能为无操作。上游方法的模块归属不代表执行发生在另一个进程。'),
n('setup','注册通信实例','ascend',a+'moe_comm_method.py','def setup_moe_comm_method(', 'setup_moe_comm_method','初始化时按 MoE 执行配置注册不同通信实现。EP=1 时仅注册 AllGather 路径。','FusedMoEConfig','可复用的后端实例'),
n('select','选择本批通信类型','ascend','vllm_ascend/ascend_forward_context.py','def select_moe_comm_method(', 'select_moe_comm_method','结合硬件策略、EP、Token 数及 LoRA 等约束选枚举，函数不创建实现对象。','批次 Token 数、配置','MoECommType','页面中的后端选择是阅读过滤器，不是一次真实 NPU 策略执行。'),
n('context','建立 Forward Context','ascend','vllm_ascend/platform.py','moe_comm_method = get_moe_comm_method(moe_comm_type)', 'NPUPlatform','上下文建立时取得类型对应对象，路由专家执行时再按本层 moe_config 取得匹配实例。','本批次元信息','forward context'),
n('prepare','准备通信输入','ascend',a+'prepare_finalize.py','class PrepareAndFinalizeWithAll2All(', 'PrepareAndFinalizeWithAll2All','处理输入量化、padding、Token 分片与回程恢复；SP 场景避免重复拆分。','本地 hidden_states','通信需要的输入与恢复元数据'),
n('alltoall','All-to-All Dispatch','ascend',a+'token_dispatcher.py','class TokenDispatcherWithAll2AllV(', 'TokenDispatcherWithAll2AllV','按目的 rank 分发 Token，保留恢复顺序所需元数据，目的卡仅接收其专家所需任务。','本地 Top-K 任务','接收的专家输入','同一 Token 的多专家任务数不一定等于网络传输行数；实现可能合并或重排。'),
n('combine','All-to-All Combine','ascend',a+'token_dispatcher.py','    def token_combine(self, hidden_states, combine_metadata, bias=None):', 'TokenDispatcherWithAll2AllV.token_combine','专家输出根据 Dispatch 元数据送回来源卡并还原。此处是通信回程，不是训练反向传播。','专家输出、combine_metadata','来源卡的路由输出'),
n('allgather','AllGather 路径','ascend',a+'prepare_finalize.py','class PrepareAndFinalizeWithAllGather(', 'PrepareAndFinalizeWithAllGather','收集组内输入、执行本地专家贡献，回程归约并恢复 Token 所有权。','局部 Token 与 logits','聚合输入 / 归约输出','峰值受聚合后的输入、logits 及中间缓冲影响。'),
n('mc2','MC2 Dispatch / Combine','ascend',a+'moe_comm_method.py','class MC2CommImpl(', 'MC2CommImpl','选择 MC2 Dispatcher 与 prepare/finalize 组合，使用 Ascend 专用通信算子。','本地路由任务','通信与计算输入输出','容量、拓扑与硬件约束必须由实际配置校验。'),
n('fused','FUSED_MC2','ascend',a+'moe_comm_method.py','class FusedMC2CommImpl(', 'FusedMC2CommImpl','融合执行路径可将分发、专家计算与回收下沉到更少算子，需匹配格式与功能。','路由任务与量化权重','融合专家结果','不能把普通 Dispatch→MLP→Combine 当作该后端的固定 kernel 序列。'),
n('sp-shard','模型侧 Token 分片','ascend','vllm_ascend/models/common/ops/sequence_parallel.py','def _ascend_sp_shard_impl(', '_ascend_sp_shard_impl','将 Token 行 pad 到 P 的倍数，再按 TP rank 取连续块；H 不切分。','[T,H]','[ceil(T/P),H]'),
n('sp-meta','上游 SP 尺寸上下文','vllm',v+'runner/moe_runner.py','def _sequence_parallel_context(', 'MoERunner._sequence_parallel_context','通过 sp_local_sizes 维护来源边界，供后续可变长通信使用，本身不再切 tensor。','DP metadata、SP size','分片尺寸上下文'),
n('sp-collective','EP 收集与再分片','ascend','vllm_ascend/ops/register_custom_ops.py','def _maybe_all_gather_and_maybe_unpad_impl(', '_maybe_all_gather_and_maybe_unpad_impl','SP 布局下按各 rank 的真实分片尺寸收集、去补齐，避免把 padding 当有效 Token。','SP 分片与尺寸元数据','收集并去补齐的输入'),
n('control','MRv2 EPLB Controller','ascend','vllm_ascend/worker/v2/eplb.py','class AscendEPLBController(', 'AscendEPLBController','继承上游控制器，构建 Ascend 状态并设置批次负载采集阶段。','并行与 EPLB 配置','AscendEplbState'),
n('load','记录有效执行负载','ascend','vllm_ascend/distributed/eplb/eplb_state.py','    def record_load(', 'AscendEplbLayerState.record_load','按执行后的物理专家统计有效任务，结合来源信息去除补齐和重复数据。','专家任务计数、有效掩码','负载窗口记录'),
n('rebalance','上游布局重排事务','vllm','vllm/distributed/eplb/eplb_state.py','    def rearrange(', 'EplbState.rearrange','上游维护负载窗口、placement 与重排生命周期，调用策略并协调搬运。','统计负载与当前布局','新的专家布局与迁移工作'),
n('async','上游异步搬运 worker','vllm','vllm/distributed/eplb/async_worker.py','def start_async_worker(', 'start_async_worker','异步迁移状态机与主线程提交协作，不意味着权重搬运免费或无需同步。','迁移计划与权重视图','可提交的层结果'),
n('lookup','刷新物理专家 lookup','ascend','vllm_ascend/distributed/eplb/eplb_state.py','    def refresh_expert_replica_routing_table(', 'AscendEplbLayerState.refresh_expert_replica_routing_table','依据已提交 placement 原位更新稳定设备表，保持图捕获与长期引用有效。','已提交物理布局','逻辑到物理路由表','更新映射必须晚于对应权重就绪，随后才能确认接收缓冲可复用。'),
n('offload-check','Offload 支持边界','ascend','vllm_ascend/distributed/expert_transfer/expert_offload_config.py','def validate_expert_offload_config(', 'validate_expert_offload_config','本快照要求 950、单 worker，拒绝 EP/EPLB 等不支持组合，不能叠加到当前 EP 配置。','模型、硬件、并行配置','通过校验或明确报错'),
n('residency','准备驻留专家','ascend','vllm_ascend/distributed/expert_transfer/expert_offload_manager.py','    def prepare(self, layer, topk_ids):', 'LayerOffloadBinding.prepare','Decode 工作集可容纳时命中保留、缺失加载；Prefill/超容量使用一层全专家池。','本批 Top-K 专家集合','执行权重视图与槽位 ID','整批专家并集可能大于单 Token Top-K。'),
n('offload-exec','复用量化专家执行','ascend','vllm_ascend/distributed/expert_transfer/expert_offload_method.py','    def apply(', 'ExpertOffloadMoEMethod.apply','临时切换执行权重视图与通信对象，使用原生量化计算，finally 恢复上下文。','已驻留权重、物理槽位 ID','保持逻辑路由语义的输出')
];
export const scenes=[
{id:'overview',name:'跨仓库总览',en:'CROSS-REPOSITORY',desc:'从上游工厂到 Ascend 执行，再进入上游继承钩子。总览边表示阶段与依赖，不是逐条运行轨迹。',ids:['factory','runner','transform','routed','comm','mlp','finalize','return'],edges:[['factory','runner','覆盖解析'],['runner','transform','继承调用'],['transform','routed','流程展开'],['routed','comm','量化方法委派'],['comm','mlp','直接调用'],['mlp','finalize','结果恢复'],['finalize','return','输出钩子']]},
{id:'init',name:'初始化与上下文',en:'INITIALIZATION',desc:'建立执行管线、注册通信实例，并为每批输入选择策略。专家加载与并行组内部尚未逐项展开。',ids:['factory','runner','setup','select','context'],edges:[['factory','runner','覆盖解析'],['runner','setup','初始化调用'],['setup','select','生命周期'],['select','context','类型选择']]},
{id:'forward',name:'MoE Forward',en:'EXECUTION FLOW',desc:'分阶段执行的逻辑主线。共享专家的事件重叠与融合由具体配置决定。',ids:['runner','routed','router','shared','comm','mlp','finalize','return'],edges:[['runner','routed','调用入口'],['routed','router','Top-K'],['router','comm','执行委派'],['runner','shared','条件分支'],['comm','mlp','直接调用'],['mlp','finalize','回收恢复'],['shared','return','结果合并'],['finalize','return','输出钩子']]},
{id:'comm',name:'通信后端',en:'COMMUNICATION',desc:'选择阅读路径，比较 AllGather、All-to-All、MC2 与融合实现。这里不模拟硬件运行时策略。',ids:['select','prepare','alltoall','mlp','combine','finalize'],edges:[['select','prepare','策略组合'],['prepare','alltoall','分发输入'],['alltoall','mlp','分组计算'],['mlp','combine','专家输出'],['combine','finalize','恢复布局']]},
{id:'sp',name:'SP 与 Token 布局',en:'TOKEN OWNERSHIP',desc:'分片发生在模型包装层；上下文记录来源边界，EP collective 再完成收集与恢复。',ids:['sp-shard','sp-meta','sp-collective','comm','finalize'],edges:[['sp-shard','sp-meta','布局元数据'],['sp-meta','sp-collective','边界信息'],['sp-collective','comm','专家计算'],['comm','finalize','结果恢复']]},
{id:'eplb',name:'EPLB 负载均衡',en:'LOAD BALANCING',desc:'控制、统计、异步迁移与映射提交的生命周期。权重搬运不同于 Forward 的 Token 通信。',ids:['control','load','rebalance','async','lookup','router'],edges:[['control','load','采样配置'],['load','rebalance','统计依赖'],['rebalance','async','迁移事务'],['async','lookup','安全提交后'],['lookup','router','物理映射']]},
{id:'offload',name:'专家 Offload',en:'EXPERT RESIDENCY',desc:'独立的单 worker 路径。本快照不支持与 EP/EPLB 同时开启，仅支持特定 MXFP 格式。',ids:['offload-check','router','residency','offload-exec'],edges:[['offload-check','router','校验通过'],['router','residency','逻辑专家集合'],['residency','offload-exec','就绪权重与槽位']]}
];
export const manifest={id:'ep',name:'Expert Parallelism',label:'EP 专家并行',version:'MRv2 · 阅读快照',coverage:'人工核验的核心路径；非穷尽静态调用图，未在 NPU 执行。',versions};


const commScene=scenes.find(s=>s.id==='comm');
commScene.variants={ALLTOALL:{label:'All-to-All',ids:commScene.ids,edges:commScene.edges}};
for(const [key,id] of Object.entries({ALLGATHER:'allgather',MC2:'mc2',FUSED_MC2:'fused'}))commScene.variants[key]={label:key==='ALLGATHER'?'AllGather':key,ids:['select',id,'mlp','finalize'],edges:[['select',id,'后端选择'],[id,'mlp',key==='FUSED_MC2'?'融合执行概念':'计算阶段'],['mlp','finalize','结果恢复']]};
commScene.variants.FUSED_MC2={label:'FUSED_MC2',ids:['select','fused','finalize'],edges:[['select','fused','后端选择'],['fused','finalize','融合结果恢复']]};
