export const versions={vllm:{repo:'vllm-project/vllm',sha:'6ed3615cf6a3cb7921a26bc3d59949a789fd2bf8'},ascend:{repo:'vllm-project/vllm-ascend',sha:'b54afa62e8554caee22715d90ffe6a018d541b42'}};
const a='vllm_ascend/ops/fused_moe/',v='vllm/model_executor/layers/fused_moe/';
// Each anchor must exist in the pinned source. It selects original lines, never synthesized code.
const n=(id,title,repo,file,anchor,symbol,summary,input,output,note='')=>({id,title,repo,file,anchor,symbol,summary,input,output,note});
export const nodes=[
n('factory','构建 MoE 执行管线','vllm',v+'layer.py','runner = runner_cls(', 'FusedMoEFactory','上游工厂组织 Router、RoutedExperts 和 MoERunner；Ascend 包装可先准备 Router 再传入。OOT 可插拔分发让 NPU 接口落到 Ascend 实现。','模型与并行配置','MoERunner 实例','对象构造之后才由 loader 继续加载 checkpoint。'),
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
nodes.push(
n('groups','建立 EP 通信组','vllm','vllm/distributed/parallel_state.py','    global _EP','initialize_model_parallel','固定 PP 坐标，将 DP、PCP、TP 维组合成该阶段的 EP 组。组存在不代表专家切分开关已经生效。','进程拓扑、并行配置','组成员与组内 EP rank'),
n('registration','Ascend 接入上游接口','ascend','vllm_ascend/utils.py','        "MoERunner": AscendMoERunner,','register_ascend_customop','OOT 注册将上游 MoERunner / RoutedExperts 接口解析为 Ascend 类；工厂 patch 适配 Router 与 EPLB。','上游可插拔接口','Ascend 实现类'),
n('placement','计算专家归属与 expert_map','vllm',v+'expert_map_manager.py','def determine_expert_map(','determine_expert_map','将物理专家 ID 映射为本地槽位；非本地专家标为 -1。线性部署可按连续范围理解。','EP rank / size、物理专家数','local_num_experts、expert_map'),
n('weights','将 checkpoint 写入本地专家','vllm',v+'routed_experts.py','expert_id = self._map_global_expert_id_to_local_expert_id(global_expert_id)','RoutedExperts.weight_loader','把全局物理专家 ID 转成本地索引，跳过非本地权重，再按 w1/w2/w3、量化格式与分片规则写入。','checkpoint 权重、专家与 shard ID','本地参数存储'),
n('quant','量化方法委派执行','ascend',a+'routed_experts.py','        moe_comm_method = _EXTRA_CTX.moe_comm_method','AscendUnquantizedFusedMoEMethod.apply','以未量化实现为示例：把权重与量化契约交给本批 MoECommMethod.fused_experts。其他量化类需沿各自 apply 阅读。','X、Top-K、权重','FusedExpertsResult'),
n('output','合并共享贡献与必要归约','ascend',a+'fused_moe.py','        # Apply output transform (e.g. latent -> full dim)','AscendMoERunner.forward','完成输出变换、shared+routed 合并和最终条件归约；已经归约的输出不能重复求和。','shared_output、fused_output、归约标志','该 MoE 层输出'),
n('mapping','EPLB：选择同一专家的物理副本','ascend','vllm_ascend/patch/platform/patch_fused_moe.py','def _ascend_apply_eplb_mapping(','_ascend_apply_eplb_mapping','Router 映射钩子读取当前副本表；已返回物理 ID 的 Top-K 路径跳过重复映射。','逻辑 Top-K ID、当前副本表','物理 Top-K ID'),
n('ag-dispatch','按本卡专家重排输入','ascend',a+'token_dispatcher.py','    def token_dispatch(','TokenDispatcherWithAllGather.token_dispatch','从聚合后的输入中组织本卡专家任务，并生成分组计数和恢复元数据。','聚合 Token 与路由','本地专家分组输入'),
n('ag-combine','还原本卡的 Token 贡献','ascend',a+'token_dispatcher.py','    def token_combine(self, hidden_states, combine_metadata, bias=None):','TokenDispatcherWithAllGather.token_combine','撤销专家排列，合成本卡对每个 Token 的贡献；跨 rank 的归约属于后续 finalize。','本地专家输出','本卡 Token 贡献'),
n('mc2-dispatch','MC2 设备分发','ascend',a+'token_dispatcher.py','    def token_dispatch(','TokenDispatcherWithMC2.token_dispatch','使用设备 MoE 通信算子，返回本地专家输入、任务分组与回程元数据。','本地路由任务','本卡专家任务'),
n('mc2-combine','MC2 设备回程','ascend',a+'token_dispatcher.py','    def token_combine(self, hidden_states, combine_metadata, bias=None):','TokenDispatcherWithMC2.token_combine','使用与分发配对的设备回程算子，将专家贡献归还来源 Token。','专家输出、MC2 元数据','来源 Token 的输出'),
n('step','推进采样窗口与异步状态','ascend','vllm_ascend/distributed/eplb/eplb_state.py','    def step(','AscendEplbState.step','Ascend 维护采样时间轴和有效性，再调用上游 step 推进周期与异步结果检查。','本次有效负载 / dummy / profile','负载窗口与状态推进'),
n('policy','规划副本数、放置与来源','ascend','vllm_ascend/distributed/eplb/policy/factory.py','def create_eplb_policy(','create_eplb_policy','选择 default 或 stair；STAIR 使用时间窗风险、搜索预算和迁移约束产生新布局与来源计划。','逻辑专家负载、旧布局、预算','目标 placement 与迁移来源'),
n('transfer','搬运实际专家权重','ascend','vllm_ascend/distributed/eplb/explicit_transfer.py','def stage_explicit_layer_transfer(','stage_explicit_layer_transfer','按计划的 source rank/slot 搬运真实量化权重视图；HIXL / Gloo 是迁移数据通道。','目标布局与来源、权重视图','待提交层的接收工作区'),
n('commit','前台安装权重并安全发布','ascend','vllm_ascend/patch/platform/patch_eplb.py','    def _move_to_workspace(*args, **kwargs):','_wrap_move_to_workspace._move_to_workspace','待结果就绪后安装层权重与映射，刷新设备路由表，最后确认结果已消费，允许复用接收工作区。','后台就绪结果','新布局生效与消费确认')
);
const get=id=>nodes.find(n=>n.id===id);
Object.assign(get('context'),{symbol:'NPUPlatform.set_additional_forward_context',summary:'MRv2 每批建立额外上下文：使用 DP 最大 Token 数统一选通信枚举；每层再按配置匹配实现对象。'});
Object.assign(get('router'),{anchor:'    def _select_experts(',symbol:'AscendRoutedExperts._select_experts'});
get('prepare').title='Prepare：准备通信输入';
get('load').summary='根据后端选择算子计数或 AllGather 有效来源掩码重计数，再按采样资格记录本地物理专家负载。';
get('rebalance').note='AscendEplbState.rearrange 的 STAIR 异步自定义统计分支可直接发布数据，不必逐次调用上游 rearrange；上游仍拥有通用状态机。';
get('ag-dispatch').within='TokenDispatcherWithAllGather';get('ag-combine').within='TokenDispatcherWithAllGather';
get('mc2-dispatch').within='TokenDispatcherWithMC2';get('mc2-combine').within='TokenDispatcherWithMC2';
get('combine').within='TokenDispatcherWithAll2AllV';
get('alltoall').anchor='    def token_dispatch(';get('alltoall').within='TokenDispatcherWithAll2AllV';
get('shared').occurrence='last';
get('registration').additional=[{file:'vllm_ascend/patch/platform/patch_fused_moe.py',anchor:'def _ascend_FusedMoE(',symbol:'_ascend_FusedMoE'}];
get('rebalance').additional=[{repo:'ascend',file:'vllm_ascend/distributed/eplb/eplb_state.py',anchor:'    def rearrange(',symbol:'AscendEplbState.rearrange',lines:36}];
get('policy').additional=[{file:'vllm_ascend/distributed/eplb/policy/stair.py',anchor:'    def expert_risk(',symbol:'StairEplbPolicy.expert_risk'}];
get('mapping').additional=[{file:a+'eplb.py',anchor:'def map_to_physical(',symbol:'map_to_physical',lines:50}];
get('commit').lines=75;get('output').lines=16;get('placement').lines=94;
get('groups').anchor='    assert _EP is None, "expert parallel group is already initialized"';
Object.assign(get('prepare'),{anchor:'    def prepare(',within:'PrepareAndFinalizeWithAll2All',symbol:'PrepareAndFinalizeWithAll2All.prepare',lines:60});
Object.assign(get('allgather'),{anchor:'    def prepare(',within:'PrepareAndFinalizeWithAllGather',symbol:'PrepareAndFinalizeWithAllGather.prepare',lines:48});
get('allgather').additional=[{file:a+'prepare_finalize.py',anchor:'    def finalize(',within:'PrepareAndFinalizeWithAllGather',symbol:'PrepareAndFinalizeWithAllGather.finalize',lines:65}];
get('control').additional=[{file:'vllm_ascend/worker/v2/eplb.py',anchor:'    def prepare_forward(',symbol:'AscendEPLBController.prepare_forward',lines:36}];
get('fused').additional=[{file:a+'moe_comm_method.py',anchor:'    def fused_experts(',within:'FusedMC2CommImpl',symbol:'FusedMC2CommImpl.fused_experts',lines:45}];
get('offload-check').lines=85;
Object.assign(get('rebalance'),{title:'汇总需求并请求重排',repo:'ascend',file:'vllm_ascend/distributed/eplb/eplb_state.py',symbol:'AscendEplbState.rearrange',lines:36,summary:'Ascend 自定义异步统计路径收集并发布逻辑需求；其他条件委托上游 rearrange，不能画成每次必经的上游嵌套调用。'});
get('rebalance').additional=[{repo:'vllm',file:'vllm/distributed/eplb/eplb_state.py',anchor:'    def rearrange(',symbol:'EplbState.rearrange'}];
get('async').title='异步重排与搬运';
get('async').additional=[{repo:'ascend',file:'vllm_ascend/patch/platform/patch_eplb.py',anchor:'def _wrap_async_worker(',symbol:'_wrap_async_worker._run',lines:76}];
Object.assign(get('router'),{anchor:'        topk_weights, topk_ids = self.router._select_experts(',lines:6});
get('routed').additional=[{file:a+'routed_experts.py',anchor:'        eplb_state = self.router.eplb_state',symbol:'AscendRoutedExperts.forward_impl · MRv2 load recording',lines:27}];
get('load').lines=74;
Object.assign(get('policy'),{file:'vllm_ascend/distributed/eplb/policy/stair.py',anchor:'    def plan_sharded_rebalance(',symbol:'StairEplbPolicy.plan_sharded_rebalance',within:'StairEplbPolicy',lines:46});
get('policy').additional=[{file:'vllm_ascend/distributed/eplb/policy/factory.py',anchor:'def create_eplb_policy(',symbol:'create_eplb_policy'},{file:'vllm_ascend/distributed/eplb/policy/stair.py',anchor:'    def expert_risk(',symbol:'StairEplbPolicy.expert_risk'}];
export {scenes} from './views.mjs';
export const manifest={id:'ep',name:'Expert Parallelism',label:'EP 专家并行',version:'MRv2 · 阅读快照',coverage:'固定源码的核心路径；非穷尽动态调用图，未在 NPU 执行。',versions};
manifest.audit={
 intro:'当前图保留原有固定 SHA，以实际源码为准核对课程与 Notebook。课程是参考资料，版本不同的接口不直接搬用。',
 comparison:[{label:'课程 vLLM',sha:'05caae03c20f69436ff7ec23ded339ea104f1a01'},{label:'课程 Ascend',sha:'6e3299ab492ddbadb4c8e3a00b88c982c9a28131'}],
 conclusion:'已纠正：生命周期连成单线、遗漏 shared/最终归约、SP 后端边界、EPLB 前台提交以及版本接口差异。覆盖核心路径，尚未穷举所有模型与量化后端。两份本站 SHA 是阅读快照，未验证为兼容安装组合；未执行 NPU 推理。',
 report:'https://github.com/ZYY-ing/feature-atlas/blob/main/docs/mrv2-audit.md',
 reference:'https://eplb-mrv2-course-6d92.sharpcairn1.chatgpt.site/topics'
};
