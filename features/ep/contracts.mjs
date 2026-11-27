// Teaching data contracts, not extra Python function return values.
// a,b,c,d belong to global ranks 0,1,4,5 after SP; H remains symbolic.
const samples={
 groups:['DP=2，PP=2，物理 TP=2，PCP=1；global rank=4','stage 0 的 EP 组=[0,1,4,5]；EP size=4；本进程 EP rank=2'],
 registration:['可替换的 MoERunner / RoutedExperts 接口','普通 NPU 路径对应 AscendMoERunner / AscendRoutedExperts；专家归属不变'],
 factory:['本层 E=8、Top-K=2、EP4；global 4 / EP rank 2；无冗余','包含 Router、专家权重拥有者、Runner 的对象；本进程有 E4/E5 两个槽'],
 placement:['8 个物理专家，EP size=4，EP rank=2，linear 分配','local_num_experts=2；expert_map=[-1,-1,-1,-1,0,1,-1,-1]'],
 weights:['当前层 checkpoint 的 E5 权重；expert_map[5]=1','E5 权重写入 global 4 的本地槽位 1；非本地专家跳过写入'],
 setup:['本层 FusedMoEConfig：EP4、8 个专家、本地 2 个槽','按配置预先创建可用通信实现；尚未为本批选择 MoECommType'],
 context:['DP0 有 a/b 两行；DP1 有 c/d 两行；当前硬件与配置','包含本批元数据和统一 MoECommType 的上下文；局部 SP 有效行数各为 1'],
 select:['两个 DP 的有效 Token 数=[2,2]；SoC、量化及功能约束','以共同的 2 参与选择，得到一个 MoECommType；不能只凭 Token 数断言后端'],
 runner:['global 0 的 a：[1,H]；该模型的路由输入 logits；本例无共享分支','a 的路由输出 yₐ=0.7 F₁(a)+0.3 F₅(a)，有效形状 [1,H]'],
 transform:['a 的 hidden_states：[1,H]；本例不设置 latent 投影','routed/shared 输入均保持 [1,H]；shared 仅在模型配置时使用'],
 routed:['本地 a 的 hidden_states、router logits；本批通信上下文','恢复到来源 global 0 的 a 输出 [1,H]；适用分支附带完成事件'],
 prepare:['A2A/MC2：每进程一个有效 Token；AG：四份 SP 分片','A2A/MC2 保留局部输入及恢复元数据；AG 聚合 a～d 为有效 [4,H]'],
 router:['a 的特征 [1,H] 与 8 个逻辑专家的 logits [1,8]（示意接口）','topk_ids=[[1,5]]，topk_weights=[[0.7,0.3]]；均为 [1,2]'],
 quant:['a，IDs=[1,5]，α=[0.7,0.3]；对应专家权重及 scale','专家执行结果及后端元数据；本例 a 最终贡献为 0.7 F₁(a)+0.3 F₅(a)'],
 comm:['四个来源的 a～d，各选 2 个专家，共 8 项任务','按来源组织的专家结果；各目的进程任务数 Qᵣ=[3,1,3,1]'],
 alltoall:['global 0 的 a→E1/E5；全组共 8 项路由任务','global 4 收到 d→E4、a/c→E5，共 3 行；不是 3 个专家'],
 mlp:['global 4 分组 [d,a,c]：[3,H]；E4/E5 对应权重；计数 [1,2]','分组专家输出 [3,H]；常见 SwiGLU 中间为 [3,2I]→[3,I]'],
 combine:['global 4 的 E5(a) 等专家输出，及 dispatch 保存的回程元数据','E5 对 a 的贡献回到 global 0，与 E1 贡献按本后端契约合并'],
 finalize:['专家通信返回值及原始 Token 尺寸、padding、归约状态','a/b/c/d 分别恢复到 global 0/1/4/5；每份有效输出 [1,H]'],
 shared:['若模型开启共享专家，输入仍为 a：[1,H]','共享贡献 S(a)：[1,H]，或由融合路径提供；基础示例没有此贡献'],
 output:['a 的 routed_output；可选 shared_output；是否已完成归约的标志','基础 yₐ=0.7 F₁(a)+0.3 F₅(a)；有共享时再加 S(a)，不重复归约'],
 return:['已经合并的 a 输出；本例未配置 ZeroExpertRouter','原样返回 yₐ：[1,H]；本例不增加 ZeroExpert 贡献'],
 allgather:['global 0/1/4/5 的 a/b/c/d 分片与相应路由信息','准备时聚合有效 [4,H]；计算并归约后，各来源恢复 [1,H]'],
 'ag-dispatch':['聚合后的 a～d 及 Top-K；global 4 的本地专家 E4/E5','按专家重排为 [d,a,c]；group counts=[1,2]'],
 'ag-combine':['global 4 的 F₄(d)、F₅(a)、F₅(c)，及重排元数据','对齐 a/b/c/d 的本卡贡献=[0.3 F₅(a),0,0.5 F₅(c),0.5 F₄(d)]'],
 mc2:['每 rank 一个有效 Token；同一 Top-K 表及适用的设备通信配置','设备 Dispatch→专家计算→Combine；Qᵣ 仍为 [3,1,3,1]'],
 'mc2-dispatch':['global 0 的 a→E1/E5，及其他来源局部任务','global 4 的 E4:[d]、E5:[a,c]，另带设备回程元数据'],
 'mc2-combine':['global 4 的三行专家输出及 MC2 回程元数据','a 的 E5 贡献回到 global 0；其余贡献回到各自来源'],
 fused:['a～d 的原有 Top-K、量化权重和融合后端所需元数据','同一逻辑路由结果；dispatch/MLP/combine 已下沉融合算子，不再重复算一次'],
 'sp-shard':['DP0 的 [a,b]：[2,H]；物理 TP size=2','global 0 持有 a：[1,H]；global 1 持有 b：[1,H]；本批无需补行'],
 'sp-meta':['DP local_sizes=[2,2]；SP size=2；张量已完成 chunk','sp_local_sizes=[1,1]（按 DP replica）；只更新尺寸上下文，不再次切 tensor'],
 'sp-collective':['四份 [1,H] 有效分片及尺寸元数据；AG 阅读分支','有效聚合输入 [a,b,c,d]：[4,H]；真实缓冲还可能有 padding'],
 control:['同一 EP4 拓扑；开启 EPLB；逻辑专家 8，冗余槽 4','绑定本层权重视图的 AscendEplbState；物理槽 12，每进程 3 槽'],
 load:['EPLB 扩展旧布局；global 4 槽位=[E4,E5,E6]；本批任务','该进程物理槽计数=[1,2,0] 写入采样窗口；不是普通前向返回的特征'],
 step:['一次有效采样 Qᵣ=[3,1,3,1]；dummy/profile 标志、周期配置','更新窗口及异步状态；达到条件才请求重排，不保证每批产生新布局'],
 rebalance:['旧物理布局及采样计数；有效统计窗口','本批逻辑需求示意=[0,3,1,0,1,2,0,1]；交给规划路径'],
 policy:['8 个逻辑专家的需求、旧的 12 槽布局、迁移预算','教学目标：global 1 槽2改为E1，global 5 槽2改为E5；不代表策略必然输出'],
 async:['上述目标布局、来源计划、当前层权重视图','后台准备新副本及就绪状态；前台仍读旧表，待安全提交'],
 transfer:['E1：global 0→1；E5：global 4→5；专家权重及适用 scale','接收工作区中的新副本和就绪信息；此时尚不能切换 active 路由'],
 commit:['已经就绪的 E1/E5 新副本与目标布局','安装权重/映射，刷新设备表，再确认消费；后续批次才使用新表'],
 lookup:['已安全提交的 12 个物理槽；每进程 3 槽','E1→物理 ID [1,5]；E5→[7,11]；ID=EP rank×3+槽位'],
 mapping:['逻辑 Top-K 保持不变，例如 b→E1、c→E5；已提交副本表','示例选择 b→物理5（global1槽2），c→物理11（global5槽2）'],
 'offload-check':['独立单 worker / EP1；8 个逻辑专家；驻留槽2、全层池8','满足支持矩阵则允许；EP4+Offload 在本快照被拒绝，不沿用 EP 主线'],
 residency:['单 worker 的 a～d；Top-K 并集={E1,E2,E4,E5,E7}，U=5','5>驻留槽2，选全层池；若只执行 a，U=2，可使用驻留槽'],
 'offload-exec':['单 worker 单独执行 a；E1/E5 权重已就绪；逻辑 ID→设备槽位','仍得到 0.7 F₁(a)+0.3 F₅(a)；finally 恢复临时权重视图与上下文']
};
const framework={
 overview:['并行配置、模型专家配置、请求 Token','DP2/PP2/TP2/PCP1；本层 E8、Top2；a～d','完成部署和 MoE 前向；可选负载反馈','两个 EP 组各4进程；当前层四份有效输出 [1,H]'],
 init:['进程拓扑、模型配置及 checkpoint','global4；EP4；E8；checkpoint E5','通信组、专家映射及已加载权重的 MoE 对象','EP rank2；E4/E5；E5写入槽1'],
 batch:['DP 批次元信息、硬件与功能约束','DP 有效 Token 数=[2,2]','本批一致的通信类型和上下文','共同使用2作为选择依据；SP局部各1行'],
 forward:['各来源的特征、路由信息及本批上下文','a在global0：[1,H]；E1/E5，权重0.7/0.3','恢复来源布局的 MoE 输出','global0得到 yₐ=0.7 F₁(a)+0.3 F₅(a)'],
 routed:['本地特征、logits、对应专家权重和通信上下文','a：[1,H]；8个专家的路由分数','路由专家结果及适用的事件/恢复信息','a输出 [1,H]；采样只在EPLB有效时发生'],
 routing:['模型规定的路由分数；可选副本表','a 的特征 [1,H]；E0～E7 共8个逻辑专家的 logits','Top-K专家 ID及系数；EPLB时再选副本','逻辑IDs=[1,5]；系数=[0.7,0.3]'],
 comm:['四个来源的 Top-K 任务和专家权重','4 Token × Top2=8项任务','回到来源的专家输出及任务统计','各目的任务数=[3,1,3,1]；a回global0'],
 sp:['每个 DP replica 的 Token 行与物理 TP 大小','DP0=[a,b]、DP1=[c,d]；TP2','H维完整的 Token 分片及尺寸元数据','global0/1/4/5分别持有a/b/c/d，各[1,H]'],
 eplb:['当前布局、权重视图和跨批次负载统计','E8、冗余4、物理槽12；旧负载[3,1,3,1]','安全提交后的权重布局与设备路由表','教学计划新增E1/E5副本；后续任务可为[2,2,2,2]'],
 offload:['单worker支持配置、主机权重、本批Top-K','EP1；驻留槽2；a～d需要5个不同专家','已就绪的设备工作集及原语义的专家输出','全批使用全层池；单独a可用2个驻留槽']
};
export function applyContracts(nodes,lessons,sceneLessons,scenes){
 for(const n of nodes){
  const s=samples[n.id];if(!s)throw Error('Missing IO samples: '+n.id);
  lessons[n.id].io={input:{meaning:n.input,sample:s[0]},output:{meaning:n.output,sample:s[1]}};
 }
 for(const [id,l] of Object.entries(sceneLessons)){
  const f=framework[id];if(!f)throw Error('Missing framework IO: '+id);
  l.io={input:{meaning:f[0],sample:f[1]},output:{meaning:f[2],sample:f[3]}};
 }
 for(const s of scenes){
  for(const l of Object.values(s.nodeLessons||{}))l.io={input:{meaning:'单 worker 的特征与逻辑专家分数',sample:'a～d 都在 rank0；a 的 logits：[1,8]'},output:{meaning:'逻辑 Top-K ID 与权重',sample:'a→IDs=[1,5]；α=[0.7,0.3]；随后由驻留管理器准备权重'}};
  for(const [backend,v] of Object.entries(s.variants||{}))v.lesson.io={...sceneLessons[s.id].io,input:{meaning:backend==='ALLGATHER'?'聚合后的有效特征、路由任务及本地专家权重':'局部路由任务及对应专家权重',sample:backend==='ALLGATHER'?'a～d 聚合为 [4,H]；全组共8项任务':'global0/1/4/5各1个有效Token，共8项任务'}};
 }
}
