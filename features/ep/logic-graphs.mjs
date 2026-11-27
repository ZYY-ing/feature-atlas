import {callPath} from './call-path.mjs';
// Only the EP reading profile is rendered. Helpers needed to resolve the next
// call remain explicit; unrelated executor/model branches stay in source only.
const g=callPath.groups.map(s=>s.edges),worker='vllm_ascend/worker/worker.py';
const parallel='vllm/distributed/parallel_state.py',moe='vllm/model_executor/layers/fused_moe/';
const fn=(repo,file,symbol,lines=10)=>({repo,file,symbol,scope:symbol,within:symbol.includes('.')?symbol.split('.')[0]:undefined,anchor:'def '+symbol.split('.').at(-1)+'(',lines});
const at=(base,anchor,lines=8)=>({...base,anchor,lines});
const node=(id,row,definition,purpose,options={})=>({id,row,definition,purpose,type:'function',sources:[definition],...options});
const edge=(from,to,label,kind='call',sources=[],options={})=>({from,to,label,kind,sources,...options});
const proc=g[0][0].from,init=g[0][2].from,device=g[0][3].from,env=g[0][4].from,ensure=g[0][5].from,groups=g[0][5].to;
const scope=callPath.scope+' 本图只追 EP 主路径：新建模型、当前层为 MoE、普通 NPU worker、EP4/E8、无冗余、linear 放置。encoder-only、elastic scale-up、复用已有 model、Dense 层及通用子类适配分支不画出。常规函数返回省略；关键初始化返回和 OOT 绑定明确标注。';
const isReady=at(ensure,'if not model_parallel_is_initialized():',14),checks=at(ensure,'assert get_tensor_model_parallel_world_size()',24);
const start={
 id:'startup-groups',title:'WorkerProc → 建立 EP 通信组',scope,
 description:'只追 EP 建组：WorkerProc 初始化设备，经 Ascend worker 回到上游建组。保留“已有组只校验”这一相关判断；worker 创建细节在入口源码中。',
 nodes:[
  node('proc',0,proc,'init_worker 已创建真实 worker，再调用 init_device。',{sources:[at(proc,'wrapper.init_worker(all_kwargs)',5),g[0][0].site,fn('vllm','vllm/v1/worker/worker_base.py','WorkerWrapperBase.init_worker')]}),
  node('wrapper-device',1,g[0][0].to,'包装层转发给已经创建的 NPUWorker。',{sources:[g[0][1].site,...g[0][1].support]}),
  node('npu-init',1,init,'进入 NPU 初始化。',{sources:[g[0][2].site]}),
  node('device',2,device,'设置设备后进入分布式初始化。',{sources:[g[0][3].site]}),
  node('environment',3,env,'默认分布式环境就绪后，请求模型并行组。',{sources:[g[0][4].site]}),
  node('ensure',4,ensure,'未初始化则创建；已有组则检查尺寸。',{sources:[isReady,checks]}),
  node('ready?',5,isReady,'判断 _TP 与 _PP 是否已存在，不是根据专家数量判断。',{title:'模型并行组已初始化？',type:'decision'}),
  node('checks',6,checks,'只检查 TP/PP/PCP/DCP 大小，不重新建组。',{title:'校验已有组',type:'operation',slot:[4,3]}),
  node('initialize',7,groups,'本图只追 MoE 模型的 EP 创建部分。',{sources:[at(groups,'assert _EP is None, "expert parallel group is already initialized"',32)]}),
  node('members',8,at(groups,'assert _EP is None, "expert parallel group is already initialized"',16),'固定 PP，组合 DP×PCP×TP；统一示例得到 [0,1,4,5]。',{title:'计算 EP 成员',type:'operation'}),
  node('make-group',9,fn('vllm',parallel,'init_model_parallel_group'),'创建 GroupCoordinator。',{sources:[g[1][0].site,fn('vllm',parallel,'init_model_parallel_group')]}),
  node('ep',10,g[1][0].site,'保存 _EP；global 4 在本组中的 EP rank 为 2。',{title:'EP 通信组可用',type:'state'}),
 ],
 edges:[
  edge('proc','wrapper-device','init_device','call',[g[0][0].site]),edge('wrapper-device','npu-init','转发','dispatch',[g[0][1].site]),
  edge('npu-init','device','调用','call',[g[0][2].site]),edge('device','environment','调用','call',[g[0][3].site]),edge('environment','ensure','请求建组','call',[g[0][4].site]),
  edge('ensure','ready?','判断','flow',[isReady]),edge('ready?','checks','是','conditional',[checks]),edge('ready?','initialize','否','conditional',[g[0][5].site],{side:'left'}),
  edge('initialize','members','EP 分支','flow',[at(groups,'if config.model_config is None or config.model_config.is_moe:',12)]),edge('members','make-group','创建组','flow',[g[1][0].site]),edge('make-group','ep','保存 _EP','flow',[g[1][0].site]),
 ]
};
const ctorRunner=fn('ascend','vllm_ascend/worker/v2/model_runner.py','NPUModelRunner.__init__');
const load=g[2][0].from,npuLoad=g[2][0].to,gpuLoad=g[2][1].to,baseLoad=g[2][3].to,create=g[2][4].to,initialize=g[2][5].to;
const modelCtor=g[3][0].to,backbone=g[3][1].to,decoder=g[3][2].to,moeCtor=g[3][3].to,ascendFactory=g[4][0].from,factory=g[4][0].to;
const reg=fn('ascend','vllm_ascend/utils.py','register_ascend_customop'),ootSources=g[5][1].support;
const calc=fn('vllm',moe+'expert_map_manager.py','ExpertMapManager._calculate_expert_maps');
const determine=fn('vllm',moe+'expert_map_manager.py','determine_expert_map');
const after={
 id:'groups-factory',title:'EP 建组完成 → MoE 执行管线',scope,
 description:'只保留当前 MoE 层的 EP 主路径：初始化返回 → 加载/构造模型 → Ascend 工厂接入 → 专家归属、参数和通信管线。没有画出的通用分支可在源码中查看。',
 nodes:[
  node('ep',0,g[1][0].site,'EP 组已建立；先沿调用栈返回 init_device。',{title:'EP 通信组已建立',type:'state'}),
  node('npu-init',0,init,'建组返回后继续创建 runner。',{sources:[g[0][2].site,g[1][1].site]}),
  node('workspace',1,g[1][1].to,'保存后续 load_model 使用的 runner。',{sources:[g[1][2].site]}),
  node('make-runner',2,g[1][2].to,'本图普通分支选择 worker/v2 的 NPUModelRunner。',{sources:[g[1][3].site]}),
  node('npu-runner',3,ctorRunner,'构造 MRv2 runner，随后沿初始化栈返回。',{sources:[ctorRunner,g[1][3].site]}),
  node('proc',4,proc,'init_device 完整返回后继续 load_model。',{sources:[g[1][4].site,...g[1][4].support]}),
  node('wrapper-forward',5,fn('vllm','vllm/v1/worker/worker_base.py','WorkerWrapperBase.__getattr__'),'load_model 属性转发到真实 NPUWorker。'),
  node('worker-load',5,load,'委托保存的 model_runner。',{sources:[g[2][0].site]}),
  node('ascend-load',6,npuLoad,'Ascend 适配后委托上游 MRv2。',{sources:[g[2][1].site]}),
  node('upstream-load',7,gpuLoad,'取得默认 loader，进入继承的 load_model；不是切到 GPU。',{sources:[g[2][2].site,...g[2][2].support,g[2][2].to,g[2][3].site,...g[2][3].support]}),
  node('loader-load',8,baseLoad,'先 create_model，模型构造返回后再 load_weights。',{sources:[g[2][4].site,at(baseLoad,'self.load_weights(model, model_config)',5)]}),
  node('create',9,create,'调用公共模型构造入口。',{sources:[g[2][5].site]}),
  node('initialize',10,initialize,'本示例架构解析为 DeepseekV2ForCausalLM。',{sources:[g[3][0].site,fn('vllm','vllm/model_executor/model_loader/utils.py','get_model_architecture'),...g[3][0].support]}),
  node('model',11,modelCtor,'通过 model_cls 构造主干。',{sources:[g[3][1].site,...g[3][1].support]}),
  node('backbone',12,backbone,'按 PP 本地层范围创建层。',{sources:[g[3][2].site]}),
  node('layers',13,fn('vllm','vllm/model_executor/models/utils.py','make_layers'),'执行模型传入的 layer_fn 构造回调。',{sources:g[3][2].support}),
  node('decoder',14,decoder,'本图只跟踪 is_moe_layer 为真的当前层。',{sources:[at(decoder,'is_moe_layer = (',6),g[3][3].site]}),
  node('moe',15,moeCtor,'调用已被 Ascend 替换绑定的工厂名称。',{sources:[g[3][4].site]}),
  node('factory-binding',15,g[3][4].support[0],'启动时替换工厂绑定，不是每层重新打补丁。',{title:'工厂绑定（预先完成）',type:'binding'}),
  node('ascend-factory',16,ascendFactory,'准备 Router 和专家类，再调用保存的原始上游工厂。',{sources:[at(ascendFactory,'if router is None:',22),at(ascendFactory,'routed_experts_cls = _adapt_routed_experts_cls(',5),g[4][0].site,...g[4][0].support]}),
  node('factory',17,factory,'① 计算映射；② 创建权重拥有者；③ 创建 Runner。',{sources:[g[5][0].site,g[5][1].site,g[5][2].site]}),
  node('expert-map',18,g[5][0].to,'根据并行配置初始化专家映射管理器。',{sources:[at(g[5][0].to,'self._calculate_expert_maps()',5),g[5][0].site]}),
  node('oot',18,reg,'RoutedExperts / MoERunner 按注册表选择 Ascend 类。',{title:'OOT 类绑定（预先注册）',type:'binding',sources:ootSources}),
  node('calculate-map',19,calc,'传入本进程的 EP rank/size 和专家总数。',{sources:[at(calc,') = determine_expert_map(',11)]}),
  node('determine-map',20,determine,'当前 EP4、E8、linear：每进程 2 个本层专家。',{sources:[at(determine,'if expert_placement_strategy == "linear":',8)]}),
  node('local-map',21,at(determine,'if expert_placement_strategy == "linear":',8),'global 4 / EP rank 2：E4→槽0，E5→槽1；其余为 -1。',{title:'本地 expert_map',type:'state'}),
  node('upstream-experts',22,fn('vllm',moe+'routed_experts.py','RoutedExperts.__init__'),'上游父类选择 quant_method 并分配参数。',{sources:[at(fn('vllm',moe+'routed_experts.py','RoutedExperts.__init__'),'self.quant_method.create_weights(layer=self, **moe_quant_params)',5)]}),
  node('ascend-experts',22,g[5][1].to,'创建 Ascend 专家权重拥有者，内部 super 初始化。',{sources:[g[5][1].site,at(g[5][1].to,'super().__init__(*args, **kwargs)',6)]}),
  node('parameters',23,at(fn('vllm',moe+'routed_experts.py','RoutedExperts.__init__'),'self.quant_method.create_weights(layer=self, **moe_quant_params)',5),'为本地专家创建参数存储；还未写入 checkpoint。',{title:'本地专家参数存储',type:'operation'}),
  node('upstream-runner',25,fn('vllm',moe+'runner/moe_runner.py','MoERunner.__init__'),'初始化上游通用 Runner 状态。'),
  node('ascend-runner',25,g[5][2].to,'连接 Router、专家权重拥有者和 Ascend 执行路径。',{sources:[at(g[5][2].to,'super().__init__(',12),g[5][3].site]}),
  node('comm-setup',26,g[5][3].to,'当前 EP4 预注册四类通信实现；每批选择类型发生在之后。',{sources:[at(g[5][3].to,'if moe_config.ep_size > 1:',9)]}),
  node('result',27,g[5][2].site,'返回 Runner，完成模型构造后，loader 才继续加载 checkpoint。',{title:'MoE 执行管线构造完成',type:'state',sources:[at(factory,'return runner',3),at(baseLoad,'self.load_weights(model, model_config)',5)]}),
 ],
 edges:[
  edge('ep','npu-init','沿栈返回','return',[g[0][2].site,g[1][1].site]),edge('npu-init','workspace','继续调用','call',[g[1][1].site]),edge('workspace','make-runner','调用','call',[g[1][2].site]),edge('make-runner','npu-runner','构造','call',[g[1][3].site]),
  edge('npu-runner','proc','初始化返回','return',[g[1][3].site,g[1][4].site]),edge('proc','wrapper-forward','load_model 转发','dispatch',[g[1][4].site,...g[1][4].support]),edge('wrapper-forward','worker-load','属性转发','dispatch',g[1][4].support),
  edge('worker-load','ascend-load','调用','call',[g[2][0].site]),edge('ascend-load','upstream-load','super 调用','inheritance',[g[2][1].site]),edge('upstream-load','loader-load','默认 loader','inheritance',[g[2][3].site,...g[2][3].support]),edge('loader-load','create','创建模型','call',[g[2][4].site]),edge('create','initialize','调用','call',[g[2][5].site]),
  edge('initialize','model','架构解析','dispatch',[g[3][0].site,...g[3][0].support]),edge('model','backbone','构造主干','dispatch',[g[3][1].site]),edge('backbone','layers','创建本地层','call',[g[3][2].site]),edge('layers','decoder','layer_fn 回调','callback',g[3][2].support),edge('decoder','moe','当前 MoE 层','conditional',[g[3][3].site]),
  edge('factory-binding','moe','启动时替换','binding',g[3][4].support),edge('moe','ascend-factory','替换后的调用','registration',[g[3][4].site,...g[3][4].support]),edge('ascend-factory','factory','原始工厂别名','call',[g[4][0].site,...g[4][0].support],{callName:'_original_FusedMoE'}),
  edge('factory','expert-map','① 映射管理','call',[g[5][0].site]),edge('expert-map','calculate-map','计算映射','call',[at(g[5][0].to,'self._calculate_expert_maps()',5)]),edge('calculate-map','determine-map','EP rank/size','call',[at(calc,') = determine_expert_map(',11)]),edge('determine-map','local-map','linear 放置','flow',[at(determine,'if expert_placement_strategy == "linear":',8)]),
  edge('factory','ascend-experts','② 权重拥有者','registration',[g[5][1].site,...ootSources]),edge('local-map','ascend-experts','传入映射','flow',[g[5][1].site]),edge('oot','ascend-experts','类注册','binding',ootSources),edge('ascend-experts','upstream-experts','super 初始化','inheritance',[at(g[5][1].to,'super().__init__(*args, **kwargs)',6)]),edge('upstream-experts','parameters','create_weights','flow',[at(fn('vllm',moe+'routed_experts.py','RoutedExperts.__init__'),'self.quant_method.create_weights(layer=self, **moe_quant_params)',5)]),
  edge('factory','ascend-runner','③ Runner','registration',[g[5][2].site,...g[5][2].support],{channel:2}),edge('oot','ascend-runner','类注册','binding',g[5][2].support,{side:'right',channel:1}),edge('ascend-runner','upstream-runner','super 初始化','inheritance',[at(g[5][2].to,'super().__init__(',12)]),edge('ascend-runner','comm-setup','通信实现','call',[g[5][3].site]),edge('comm-setup','result','构造返回','return',[at(factory,'return runner',3)],{description:'setup 返回 AscendMoERunner，再返回上游工厂；不是 setup 直接调用上游工厂。'}),
 ]
};
export const transitionPaths=[start,after];
