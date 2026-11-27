// Only the worked-example fields are changed here. Principles, formulas, source
// evidence and reading instructions continue to come from learning.mjs.
const ranks=[{global:0,ep:0,experts:[0,1]},{global:1,ep:1,experts:[2,3]},{global:4,ep:2,experts:[4,5]},{global:5,ep:3,experts:[6,7]}];
const tokens=[{id:'a',source:0,experts:[1,5],weights:[.7,.3]},{id:'b',source:1,experts:[1,2],weights:[.5,.5]},{id:'c',source:4,experts:[1,5],weights:[.5,.5]},{id:'d',source:5,experts:[4,7],weights:[.5,.5]}];
const owner=e=>ranks.find(r=>r.experts.includes(e));
const tasks=tokens.flatMap(t=>t.experts.map((e,i)=>({token:t.id,source:t.source,expert:e,dest:owner(e).global,weight:t.weights[i]})));
const oldLoads=ranks.map(r=>tasks.filter(t=>t.dest===r.global).length);
const after=tasks.map(t=>({...t,dest:t.token==='b'&&t.expert===1?1:t.token==='c'&&t.expert===5?5:t.dest}));
const newLoads=ranks.map(r=>after.filter(t=>t.dest===r.global).length);
const T=(caption,headers,rows)=>({type:'table',caption,headers,rows});
const N=text=>({type:'note',text});
const F=(caption,steps)=>({type:'flow',caption,steps:steps.map(([title,text])=>({title,text}))});
const M=text=>({type:'formula',text});
const mapRows=ranks.map(r=>[r.global,r.ep,'E'+r.experts[0],'E'+r.experts[1]]);
const placement=()=>({type:'ranks',caption:'本层专家分布（每进程 2 个）',ranks});
const rankTable=()=>T('同一组进程与专家归属',['global rank','EP rank','槽位 0','槽位 1'],mapRows);
const routes=()=>T('同一批固定 Top-K',['Token','来源 global rank','Top-K','权重'],tokens.map(t=>[t.id,t.source,t.experts.map(e=>'E'+e).join('、'),t.weights.join('、')]));
const work=()=>T('同一批 8 项专家任务',['执行位置','本地任务','Qᵣ'],ranks.map((r,i)=>[`global ${r.global} / EP rank ${r.ep}`,tasks.filter(t=>t.dest===r.global).map(t=>t.token+'→E'+t.expert).join('，'),oldLoads[i]]));
const bars=(caption,values)=>({type:'bars',caption,max:4,rows:ranks.map((r,i)=>({label:`global ${r.global} / EP rank ${r.ep}`,value:values[i],color:i}))});
const aPath=()=>({type:'token-path',caption:'始终跟踪 Token a',source:'global 0 / EP rank 0',selection:'a → E1、E5',branches:[{expert:'E1',location:'global 0 / EP rank 0',slot:1,weight:.7,color:0},{expert:'E5',location:'global 4 / EP rank 2',slot:1,weight:.3,color:2}],result:'yₐ = 0.7 F₁(a) + 0.3 F₅(a)'});
const partials=()=>T('同一 Token a 的各进程贡献',['执行位置','对 a 的贡献'],ranks.map(r=>[`global ${r.global} / EP rank ${r.ep}`,r.ep===0?'0.7 F₁(a)':r.ep===2?'0.3 F₅(a)':'0']));
const baseContext={title:'统一示例 · DP2 / PP2 / 物理 TP2 / PCP1',text:'固定 PP stage 0 的一层；SP 开启，EP4、8 个路由专家、无冗余；同一批 Token a～d。',metrics:[['全部署进程',8],['全部署 EP 组',2],['每组进程',4],['本层专家',8],['每进程本层槽',2]],reference:mapRows};
const eplbContext={title:'同拓扑扩展 · 开启 4 个冗余槽',text:'仍是 PP stage 0 的这一层、同一批 a～d；逻辑专家 8 个，物理槽增至 12，每 EP rank 3 槽。不能沿用无冗余的 expert_map。',metrics:[['EP size',4],['逻辑专家',8],['物理槽',12],['每进程本层槽',3]],kind:'variant'};
const offloadContext={title:'独立对照 · 单 worker / EP1',text:'本快照不支持 EP4 + Offload。仅在本节切换单 worker，保留本层 8 个逻辑专家和 a～d 的 Top-K。',metrics:[['进程数',1],['EP size',1],['逻辑专家',8],['驻留槽',2],['全层池',8]],kind:'variant'};
const oldSlots=[['E0','E1','E2'],['E2','E3','E4'],['E4','E5','E6'],['E6','E7','E0']];
const newSlots=[['E0','E1','E2'],['E2','E3','E1'],['E4','E5','E6'],['E6','E7','E5']];
const eplbDelta=()=>T('显式增加的假设',['项目','基础主线','EPLB 扩展'],[['EP 组大小','4 进程','仍为 4 进程'],['本层逻辑专家','8','仍为 8'],['本层物理槽','8','12'],['每进程本层槽','2','3']]);
const eplbMap=()=>T('示例布局：每进程槽位 0 / 1 / 2',['global rank','EP rank','调整前','调整后'],ranks.map((r,i)=>[r.global,r.ep,oldSlots[i].join(' / '),newSlots[i].join(' / ')]));
const copies=()=>T('只搬运两个新副本的权重',['专家','来源','目标'],[['E1','global 0 的槽位 1','global 1 的槽位 2'],['E5','global 4 的槽位 1','global 5 的槽位 2']]);
const replicaMap=()=>T('提交后选择物理副本',['逻辑专家','物理 ID','global rank','槽位'],[['E1 原副本',1,0,1],['E1 新副本',5,1,2],['E5 原副本',7,4,1],['E5 新副本',11,5,2]]);
const safeCommit=()=>F('迁移完成不等于已生效',[['当前前向','继续使用旧权重和旧映射'],['后台搬运','新副本写入接收工作区'],['前台安装','就绪后安装权重、提交映射'],['发布与确认','刷新设备表，再确认工作区已消费']]);

export function applyUnifiedExamples(lessons,sceneLessons,scenes){
 // Some original lessons intentionally share an object. Detach them before
 // setting example-only fields, so an EPLB node cannot alter the base Router view.
 for(const [id,l] of Object.entries(lessons))lessons[id]={...l};
 for(const [id,l] of Object.entries(sceneLessons))sceneLessons[id]={...l};
 const put=(target,example,details=[],context=baseContext)=>Object.assign(target,{example,exampleDetails:details,exampleContext:context});
 const p=(id,text,details=[],context=baseContext)=>put(lessons[id],text,details,context);
 put(sceneLessons.overview,'先数进程，再数本层专家，最后数本批任务。三者共用这套场景，但计数单位不同。',[
  T('三种数量分开看',['对象','数量','单位'],[['全部署','8','进程'],['两个 EP 组','每组 4','进程 / 组'],['本层路由专家','8；每进程 2','专家 / 层'],['本批 Top-2','4 × 2 = 8','专家任务']]),placement(),aPath()
 ]);
 put(sceneLessons.init,'沿用 EP 组 [0,1,4,5]。global 4 是 EP rank 2，持有 E4、E5；E5 的权重写入本地槽位 1。',[rankTable(),F('从建组走到加载',[['建组','[0,1,4,5]，组大小 4'],['分配','8 个专家 ÷ 4 进程 = 每进程 2 个'],['映射','global 4 的 expert_map[5] = 1'],['加载','checkpoint E5 → 本地槽位 1']])]);
 put(sceneLessons.forward,'仍跟踪来源 global 0 的 Token a。路由专家贡献来自 E1、E5，恢复后回到同一来源。',[aPath(),N('共享专家是可选扩展；基础例子暂不加入 S(a)，路由专家总数始终为 8。')]);
 put(sceneLessons.batch,'DP0 处理 a、b；DP1 处理 c、d。两边都用共同的最大有效 Token 数 2 选择通信类型。',[T('每批统一选择依据',['DP 来源','有效 Token 数','共同依据'],[['DP 0','2（a、b）','max(2,2) = 2'],['DP 1','2（c、d）','max(2,2) = 2']]),F('三个生命周期',[['初始化','预先创建通信实现'],['每批','select 返回通信枚举'],['每层','按 moe_config 取匹配实例']])]);
 put(sceneLessons.routing,'基础例子无冗余：a 选 E1、E5，它们分别在 global 0 和 global 4。',[routes(),aPath(),N('只有显式开启 EPLB 扩展后，才展示逻辑专家到多个物理副本的映射。')]);
 put(sceneLessons.comm,'同一批 4 个有效 Token，各选 2 个专家，共 8 项任务。四种后端沿用相同逻辑路由。',[work(),bars('任务数不是专家数：Qᵣ = [3,1,3,1]',oldLoads)]);
 put(sceneLessons.sp,'DP0 的 a、b 和 DP1 的 c、d 分别按物理 TP2 切行。本批恰好整除，不补 padding。',[T('MoE 入口的 Token 所有权',['DP 来源','分片前','TP rank 0','TP rank 1'],[['DP 0','[a,b]：[2,H]','global 0：a','global 1：b'],['DP 1','[c,d]：[2,H]','global 4：c','global 5：d']]),N('每个 EP rank 持有 1 个有效 Token。物理 TP2 与本层专家内部 TP 不同：该源码路径开启 EP 后，专家内部 TP size 为 1。')]);
 put(sceneLessons.routed,'a 的输入属于 global 0。prepare 后选 E1、E5，随后委派专家计算，最后恢复 a 的输出。',[F('路由专家内部主线',[['Prepare','按后端准备当前四份分片'],['Top-K','a → E1、E5'],['量化方法 / 通信','按本层格式执行专家任务'],['Finalize','恢复来源 Token 布局']]),N('基础例子未启用 EPLB；负载采样节点的示例会明确切换到带冗余的扩展。')]);

 p('groups','先只看 8 个进程怎样分组，此时还没有分配专家。',[
  T('同一套 DP / PP 拓扑',['DP 坐标','PP stage 0','PP stage 1'],[['DP 0','global 0、1','global 2、3'],['DP 1','global 4、5','global 6、7']]),
  T('两个 EP 组各自编号',['PP 阶段','组成员：global rank','组内 EP rank'],[['stage 0','[0,1,4,5]','[0,1,2,3]'],['stage 1','[2,3,6,7]','[0,1,2,3]']]),
  N('global 4 位于第一组的索引 2，所以是 EP rank 2。PP stage 1 负责另一段层，不参与当前这一层的 8 个专家。')
 ]);
 p('placement','固定 PP stage 0 的这一层：8 个专家在线性 EP4 中分配，每个进程持有该层 2 个专家。',[placement(),M('global 4 的 expert_map = [-1,-1,-1,-1,0,1,-1,-1]'),T('只看当前进程的映射',['专家','本地槽位'],[['E4',0],['E5',1],['其余专家','-1（不在 global 4）']])]);
 p('weights','checkpoint 里的 E5 仍然是 E5。本例由 global 4 / EP rank 2 将它写入本地槽位 1。',[F('专家身份 → 存储位置',[['checkpoint','当前层的 E5 权重'],['目标进程','global 4 / EP rank 2'],['本地映射','expert_map[5] = 1'],['写入','槽位 1 的权重及相应 scale']]),T('各进程加载本层 E5 时',['global rank','本卡 expert_map[5]','动作'],[[0,-1,'跳过本地写入'],[1,-1,'跳过本地写入'],[4,1,'写入槽位 1'],[5,-1,'跳过本地写入']])]);
 p('registration','每个 worker 都按同一平台接入 Ascend 实现；注册接口不改变专家的归属。',[F('本例的接口接入',[['vLLM 接口','MoERunner / RoutedExperts'],['OOT 注册','对应 Ascend 类'],['本地实例','global 4 持有 E4、E5']])]);
 p('factory','这一个 MoE 层使用 E=8、Top-K=2、EP size=4；global 4 创建的权重拥有者只分配 2 个本地专家槽。',[T('工厂构造的组件',['组件','本例职责'],[['Router','从 8 个逻辑专家中选 2 个'],['RoutedExperts','global 4 持有 E4、E5'],['Runner','编排 routed / 可选 shared 输出']])]);
 p('runner','Runner 编排同一 Token a 的前向；最终将 E1、E5 的贡献恢复并合并。',[aPath()]);
 p('transform','教学层不设置 latent 输入投影，因此 a 的有效隐藏维仍为 H；不临时换一组模型维度。',[T('本例的输入引用',['输入','有效形状','用途'],[['routed 输入 a','[1,H]','路由专家'],['shared 输入 a','[1,H]','仅在共享分支开启时使用']]),N('真实模型若设置 latent 变换，继续按上面的原理与源码阅读；本例固定身份变换。')]);
 p('routed',sceneLessons.routed.example,sceneLessons.routed.exampleDetails);
 p('context',sceneLessons.batch.example,sceneLessons.batch.exampleDetails);
 p('select','DP0、DP1 各有 2 个有效 Token，使用共同的 2 作为选择依据，确保参与者选择相同协议。',[T('同一批的选择输入',['DP rank','本地有效 Token','选择依据'],[[0,'a、b → 2',2],[1,'c、d → 2',2]]),N('这里没有根据教学数据预测某个硬件一定选哪种后端；下拉框只是阅读路径。')]);
 p('setup','初始化时为这层 E=8、每进程 2 个本地专家的配置注册通信对象，forward 再复用。',[F('注册与查找',[['配置','EP size=4，E_local=2'],['初始化注册','可用通信实现'],['每批选择','ALLGATHER / A2A / MC2 / 融合'],['每层查找','按类型与执行配置取实例']])]);
 p('prepare','本批 a～d 在 SP 后分属四个进程。Prepare 按选中的协议准备这些输入，不再将已经分好的 Token 重切一次。',[T('只比较有效 Token 行',['后端阅读路径','本例准备阶段'],[['AllGather','聚合四份分片：共 4 个有效 Token'],['All-to-All / MC2','直接路由局部分片；各进程 1 个有效 Token']]),N('实际张量还可能包含图执行 padding、mask 或量化 scale；上表不是设备缓冲大小。')]);
 p('router',sceneLessons.routing.example,[routes(),T('a 的选择结果与执行位置',['专家','权重','global rank','EP rank','槽位'],[['E1',.7,0,0,1],['E5',.3,4,2,1]])]);
 p('quant','同一张 Top-K 表交给量化方法；E1、E5 的身份和来源 a 保持不变。',[F('委派，不另选专家',[['输入','a，IDs=[E1,E5]，α=[0.7,0.3]'],['量化契约','权重 / scale / 激活格式'],['通信方法','fused_experts 执行这批任务']])]);
 p('comm',sceneLessons.comm.example,sceneLessons.comm.exampleDetails);
 p('alltoall','a 的 E1 在来源 global 0 本地计算，E5 任务发送给 global 4。其他 Token 沿用同一张路由表。',[aPath(),work()]);
 p('mlp','固定观察 global 4：本地专家 E4 处理 d，E5 处理 a、c，共 3 项任务。',[T('本地分组输入',['槽位','专家','Token','计数','累计边界'],[[0,'E4','d',1,1],[1,'E5','a、c',2,3]]),F('常见 SwiGLU 的有效数据形状',[['GMM1','[3,H] → gate/up：[3,2I]'],['激活','SiLU(gate) ⊙ up：[3,I]'],['GMM2','投回 H：[3,H]']]),N('这是数学数据契约；实际格式与融合边界按量化实现读取。')]);
 p('combine','a 的 E1、E5 输出分别来自 global 0 和 global 4；通过本批的回程元数据还原到来源 global 0。',[aPath()]);
 p('finalize','本例 SP 输出的所有权保持不变：a 回到 global 0，b、c、d 分别回到各自来源。',[T('恢复后的有效输出',['Token','所属 global rank','有效形状'],tokens.map(t=>[t.id,t.source,'[1,H]'])),N('是否已归约依后端而定，Runner 不能对已经归约的贡献重复求和。')]);
 p('output','基础例子只合并路由专家贡献。若模型另有共享专家 S，再为同一 a 加入共享贡献。',[M('基础：yₐ = 0.7 F₁(a) + 0.3 F₅(a)'),M('可选共享：yₐ = 0.7 F₁(a) + 0.3 F₅(a) + S(a)'),N('共享专家不计入 E0～E7 这 8 个路由专家；已融合的共享贡献不重复计算。')]);
 p('shared','仍观察同一 Token a。共享专家可选，不参加 E1、E5 的 Top-K 竞争。',[T('a 的两类贡献',['分支','贡献','是否属于路由 E0～E7'],[['routed','0.7 F₁(a) + 0.3 F₅(a)','是'],['可选 shared','S(a)','否']]),M('最终按模型契约合并 routed 与 shared')]);
 p('return','基础例子不设置 ZeroExpertRouter，因此该末尾钩子直接返回已有的 a 输出。',[T('本例的末尾钩子',['条件','输出'],[['无 ZeroExpert 补充贡献','仍为 0.7 F₁(a) + 0.3 F₅(a)']])]);
 p('allgather','四个 SP 分片聚合为 a～d。各进程只计算本地专家贡献，再对相同 Token 求和并恢复分片。',[F('AllGather + SP',[['聚合','有效输入 [4,H]，路由 [4,2]'],['本地专家','任务数 3 / 1 / 3 / 1'],['归约再分片','各来源恢复 1 个有效 Token']]),partials(),N('这里对同一个 a 的贡献求和，不把 a 与 b 的隐藏状态相加。')]);
 p('ag-dispatch','聚合 a～d 后，global 4 只组织 E4 的 d 和 E5 的 a、c，不执行其他专家。',[T('global 4 的重排结果',['本地专家','排列后的 Token','任务数'],[['E4','d',1],['E5','a、c',2]]),M('本地 group counts = [1,2]')]);
 p('ag-combine','global 4 将 E4/E5 的分组输出还原为 a～d 对齐的本地贡献，再交给 finalize。',[T('global 4 还原后的贡献',['Token','本地贡献'],[['a','0.3 F₅(a)'],['b','0'],['c','0.5 F₅(c)'],['d','0.5 F₄(d)']]),N('这只是 global 4 的贡献；完整 a 还需要 global 0 的 E1 贡献。')]);
 p('mc2','仍将 a 的 E5 任务交给 global 4。MC2 使用专用 Dispatcher 和设备通信算子，任务身份不变。',[F('同一批任务的 MC2 路径',[['Prepare','本批输入与有效 mask'],['设备 Dispatch','按同一专家归属分发'],['GMM','任务数 3 / 1 / 3 / 1'],['设备 Combine','回到 a～d 的来源']]),N('本图是阅读分支；不保证某个硬件与量化配置一定可选 MC2。')]);
 p('mc2-dispatch','设备分发后，global 4 接收 E4 的 d 与 E5 的 a、c，仍为 3 项任务。',[work(),N('配对的计数、索引和 handle 需要保留给同一批 Combine。')]);
 p('mc2-combine','使用同一批 Dispatch 产生的元数据，把 a 的 E5 贡献从 global 4 交还 global 0。',[F('配对的回程',[['global 4','a 的 E5 专家输出'],['同批 metadata','来源、计数与排列信息'],['global 0','恢复 a 的路由输出']])]);
 p('fused','融合入口仍处理 a～d 的同一组 8 项任务；不要在它后面再算一次普通 MLP。',[F('融合执行的概念边界',[['融合输入','同一 Top-K、权重与量化参数'],['融合入口','概念上完成分发、专家计算和回收'],['结果恢复','a 的贡献回到来源布局']]),M('a 的语义结果仍为 0.7 F₁(a) + 0.3 F₅(a)')]);
 p('sp-shard',sceneLessons.sp.example,sceneLessons.sp.exampleDetails);
 p('sp-meta','DP0、DP1 都有 2 个有效 Token，物理 TP2 分片后，每个来源尺寸都是 1。',[T('上下文只记录尺寸',['DP 来源','T_d','ceil(T_d/2)'],[['DP 0',2,1],['DP 1',2,1]]),N('实际切片已由模型包装层完成；本上下文不再切 hidden_states。')]);
 p('sp-collective','收集 global 0、1、4、5 的四份一行分片，恢复 a、b、c、d。当前批没有 padding 要剔除。',[F('AllGather 路径的内部步骤',[['来源分片','a / b / c / d，各 [1,H]'],['收集与边界','共 4 个有效 Token'],['配对回程','按来源恢复每进程 1 行']]),N('这是 AllGather 的内部实现，不是额外再聚合一次。')]);

 put(sceneLessons.eplb,'在相同 8 卡拓扑和 8 个逻辑专家上，显式开启 4 个冗余槽，再观察同一批任务的副本选择。',[eplbDelta(),eplbMap(),bars('旧任务分布 [3,1,3,1]',oldLoads),bars('示例新分布 [2,2,2,2]',newLoads),N('该计划只说明合法布局与安全提交，不代表 STAIR 必然生成它，也不是实测性能收益。')],eplbContext);
 p('control','保持进程拓扑和 a～d 不变；本节开启 MRv2 EPLB，并为当前层准备 12 个物理槽。',[eplbDelta(),F('控制器边界',[['模型注册','绑定本层专家权重视图'],['前向前','设置本批是否有效采样'],['执行后','推进窗口与异步状态']])],eplbContext);
 p('load','旧布局中仍让任务选择原副本，物理专家执行计数按本地 3 槽记录。',[T('本批旧物理布局的计数',['global rank','槽位 0 / 1 / 2','计数'],ranks.map((r,i)=>[r.global,oldSlots[i].join(' / '),['[0,3,0]','[1,0,0]','[1,2,0]','[0,1,0]'][i]])),N('本批无 padding，4 个有效来源均可参与；真实采样仍受阶段、profile/dummy 和后端有效性约束。')],eplbContext);
 p('step','继续用相同 a～d 批次说明窗口推进；不换一套 Token 或专家编号。',[T('采样时间轴示意',['步骤','本次物理任务数','状态动作'],[['一次有效采样','[3,1,3,1]','写入当前窗口'],['后续采样','沿用当前布局计数','按配置推进采样与周期'],['有待提交结果','沿用旧表直到安全安装','检查就绪与消费状态']]),N('窗口长度与触发间隔由实际配置决定；这里不假定每次 forward 都迁移。')],eplbContext);
 p('rebalance','把当前物理副本计数合回逻辑专家需求，再交给策略。副本不是新的逻辑专家。',[T('由物理计数汇总到逻辑需求',['逻辑专家','本批需求'],[['E0',0],['E1',3],['E2',1],['E3',0],['E4',1],['E5',2],['E6',0],['E7',1]]),N('同一逻辑专家有多个副本时，需要求和；映射时期不同的样本不能无条件混用。')],eplbContext);
 p('policy','示例将两个冷副本槽改放 E1、E5；8 个逻辑专家始终被覆盖，每个进程仍是 3 个物理槽。',[eplbMap(),N('这里只核对方案合法性与后续数据流；STAIR 还考虑窗口风险、预算和收益门槛。')],eplbContext);
 p('async','后台按计划准备 E1、E5 的新副本；前台在提交之前继续读旧权重和旧表。',[copies(),safeCommit()],eplbContext);
 p('transfer','发送的是 E1、E5 的权重与适用 scale，和本批 a 的 hidden state 不是同一种数据。',[copies(),N('HIXL / Gloo 是权重迁移通道；前向的 A2A / MC2 仍处理 Token 任务。')],eplbContext);
 p('commit','global 1、5 收到新副本后，先安装对应权重和映射，再刷新路由表并确认工作区已消费。',[safeCommit(),N('如果路由先切换而权重未安装，就会读取错误专家；如果过早确认消费，接收工作区可能被复用。')],eplbContext);
 p('lookup','新布局提交后，E1 和 E5 各有两个可选位置。设备表原位刷新，不提前把规划表当 active 表。',[replicaMap(),N('本节物理 ID = EP rank × 3 + 本地槽位；它不再等于逻辑专家编号。')],eplbContext);
 p('mapping','保持逻辑 Top-K 不变，只改变其中两项任务选择的副本位置。',[replicaMap(),T('示例副本选择',['任务','原执行位置','新执行位置'],[['b→E1','global 0','global 1 的槽位 2'],['c→E5','global 4','global 5 的槽位 2'],['其余 6 项','原位置','保持不变']]),bars('新任务数 [2,2,2,2]',newLoads)],eplbContext);

 const offRoutes=()=>T('单 worker 中的同一批逻辑路由',['Token','当前进程','Top-K'],tokens.map(t=>[t.id,'rank 0',t.experts.map(e=>'E'+e).join('、')]));
 put(sceneLessons.offload,'本节显式切换成单 worker 对照。逻辑专家仍是 E0～E7，a～d 的 Top-K 也不改变。',[T('资源方式确实不同',['项目','EP 主线','Offload 对照'],[['进程数','8','1'],['EP size','4','1'],['本层逻辑专家','8','8'],['权重来源','其他 EP 进程','主机权重存储']]),offRoutes(),N('本快照不能 EP4 + Offload 同开；2 个驻留槽不代表设备总容量只容纳 2 个专家，还需容纳单层全专家池。')],offloadContext);
 p('offload-check',sceneLessons.offload.example,sceneLessons.offload.exampleDetails,offloadContext);
 p('residency','仍使用 a～d：本批专家并集为 {E1,E2,E4,E5,E7}，U=5。假设常驻槽只有 2 个。',[T('工作集范围与分支',['范围','需要专家数','执行路径'],[['只观察 a 的一次 decode','E1、E5：2','可使用驻留槽'],['整个 a～d 批次','并集 5','超出驻留容量，使用全层池'],['prefill','本层全部 8 个','使用全层池']]),N('全层池可跨层复用。权重可存主机，专家计算仍在 NPU。')],offloadContext);
 p('offload-exec','对 a 单独执行时，把 E1、E5 的逻辑 ID 映射到已经就绪的驻留槽；结束后恢复视图。',[F('同一 a 的 Offload 执行',[['逻辑选择','a → E1、E5'],['准备权重','从主机补齐设备工作集'],['原量化执行','仍计算 E1、E5 的贡献'],['finally','恢复临时权重与上下文']])],offloadContext);

 // A node reused by the Offload scene must not show the EP4 example there.
 const offloadScene=scenes.find(s=>s.id==='offload');
 offloadScene.nodeLessons={router:{...lessons.router,example:'Offload 对照只有单 worker；a～d 的逻辑 Top-K 沿用同一张表。',exampleDetails:[offRoutes(),N('Top-K 只选逻辑专家，随后由驻留管理器准备权重；这里没有跨 EP 进程分发。')],exampleContext:offloadContext}};
 const commScene=scenes.find(s=>s.id==='comm');
 const backendExamples={
  ALLTOALL:['每进程一个局部 Token，按目标专家发送同一批任务。',[aPath(),work()]],
  ALLGATHER:[lessons.allgather.example,lessons.allgather.exampleDetails],
  MC2:[lessons.mc2.example,lessons.mc2.exampleDetails],
  FUSED_MC2:[lessons.fused.example,lessons.fused.exampleDetails]
 };
 for(const [key,[example,exampleDetails]] of Object.entries(backendExamples))commScene.variants[key].lesson={...sceneLessons.comm,example,exampleDetails,exampleContext:baseContext};
 // Aliased lesson objects already share these fields; every node is explicit.
 for(const [id,l] of Object.entries(lessons))if(!l.exampleContext)throw Error('Missing unified example: '+id);
 for(const [id,l] of Object.entries(sceneLessons))if(!l.exampleContext)throw Error('Missing framework example: '+id);
 if(oldLoads.join(',')!=='3,1,3,1'||newLoads.join(',')!=='2,2,2,2')throw Error('Worked-example task counts changed');
}
