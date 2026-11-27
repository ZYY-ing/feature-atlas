// Curated, source-checked MRv2 path. Edges describe resolution explicitly;
// the generator checks anchors, not Python's arbitrary runtime dispatch.
const worker='vllm_ascend/worker/worker.py', base='vllm/v1/worker/worker_base.py';
const loader='vllm/model_executor/model_loader/', model='vllm/model_executor/models/deepseek_v2.py';
const moe='vllm/model_executor/layers/fused_moe/', patch='vllm_ascend/patch/platform/patch_fused_moe.py';
const f=(repo,file,symbol)=>({repo,file,symbol,scope:symbol,anchor:'def '+symbol.split('.').at(-1)+'(',within:symbol.includes('.')?symbol.split('.')[0]:undefined,lines:5});
const v=(file,symbol)=>f('vllm',file,symbol),a=(file,symbol)=>f('ascend',file,symbol);
const proc=v('vllm/v1/executor/multiproc_executor.py','WorkerProc.__init__');
const init=a(worker,'NPUWorker.init_device'),device=a(worker,'NPUWorker._init_device'),env=a(worker,'NPUWorker._init_worker_distributed_environment');
const ensure=v('vllm/distributed/parallel_state.py','ensure_model_parallel_initialized'),groups=v('vllm/distributed/parallel_state.py','initialize_model_parallel');
const load=a(worker,'NPUWorker.load_model'),npu=a('vllm_ascend/worker/v2/model_runner.py','NPUModelRunner.load_model'),gpu=v('vllm/v1/worker/gpu/model_runner.py','GPUModelRunner.load_model');
const baseLoad=v(loader+'base_loader.py','BaseModelLoader.load_model'),create=v(loader+'base_loader.py','BaseModelLoader.create_model'),initialize=v(loader+'utils.py','initialize_model');
const causal=v(model,'DeepseekV2ForCausalLM.__init__'),backbone=v(model,'DeepseekV2Model.__init__'),layer=v(model,'DeepseekV2DecoderLayer.__init__'),moeLayer=v(model,'DeepseekV2MoE.__init__');
const factory=v(moe+'layer.py','FusedMoEFactory'),wrapper=a(patch,'_ascend_FusedMoE');
const oot=[{repo:'ascend',file:worker,symbol:'NPUWorker.__init__ registration',anchor:'register_ascend_customop(vllm_config)',within:'NPUWorker',lines:3},{repo:'ascend',file:'vllm_ascend/utils.py',symbol:'OOT registration loop',anchor:'CustomOp.register_oot(_decorated_op_cls=op_cls, name=name)',lines:3},{repo:'vllm',file:'vllm/model_executor/custom_op.py',symbol:'PluggableLayer.__new__',anchor:'    def __new__(',within:'PluggableLayer',lines:24}];
const edge=(from,to,anchor,description,kind='call',support=[])=>({from,to,site:{...from,anchor,lines:7},description,kind,support});
export const callPath={
 id:'ep-init-mrv2',title:'建立 EP 通信组 → 构建 MoE 执行管线',
 scope:'普通多进程启动；非 elastic scale-up、非 encoder-only；MRv2；auto/safetensors 的 DefaultModelLoader。前提是 Ascend 平台补丁已加载、普通 NPU 类已注册，模型未显式覆盖 Runner/专家类。模型分支示例为 DeepseekV2ForCausalLM 的 MoE 层。拓扑沿用 DP2/PP2/TP2/PCP1、E8/Top2；模型类名仅用于追源码，不代表所有模型。',
 boundary:'这是一条固定源码阅读路径，不是 NPU 运行轨迹。两份 SHA 未验证为兼容安装组合。EP 建组后返回启动器，再进入加载；不存在 initialize_model_parallel 直接调用 FusedMoEFactory。',
 nodeIds:['groups','factory','registration','placement','weights','setup'],
 groups:[
  {title:'建立通信组',summary:'WorkerProc → NPUWorker → ensure → initialize_model_parallel',edges:[
   edge(proc,v(base,'WorkerWrapperBase.init_device'),'self.worker.init_device()','启动器先调用 worker 包装层的设备初始化。'),
   edge(v(base,'WorkerWrapperBase.init_device'),init,'self.worker.init_device()','包装层将调用转发给已按 worker_cls 创建的 NPUWorker。','dispatch',[{repo:'vllm',file:base,anchor:'self.worker = worker_class(**kwargs)',symbol:'WorkerWrapperBase.init_worker',within:'WorkerWrapperBase',lines:3}]),
   edge(init,device,'self.device = self._init_device()','设置当前 NPU，并进入设备与分布式初始化。'),
   edge(device,env,'self._init_worker_distributed_environment()','设备初始化内部建立分布式环境。'),
   edge(env,ensure,'ensure_model_parallel_initialized(','初始化默认分布式环境后，请求上游建立或检查模型并行组。'),
   edge(ensure,groups,'initialize_model_parallel(','尚未建组时才调用；已建组则检查并行大小。','conditional'),
  ]},
  {title:'返回启动器，进入模型加载',summary:'建组完成 ↩ WorkerProc → NPUWorker.load_model',edges:[
   edge(groups,proc,'_EP = init_model_parallel_group(','此处建立 EP 组；随后沿调用栈返回。不是从本函数调用模型工厂。','return'),
   edge(init,a(worker,'NPUWorker._init_workspace_and_model_runner'),'self._init_workspace_and_model_runner()','返回 _init_device 后，继续创建 workspace 和 model runner；这仍在 init_device 阶段。','continuation'),
   edge(a(worker,'NPUWorker._init_workspace_and_model_runner'),a(worker,'NPUWorker._make_model_runner'),'self.model_runner = self._make_model_runner()','为后续 load_model 保存 runner 实例。'),
   edge(a(worker,'NPUWorker._make_model_runner'),{repo:'ascend',file:'vllm_ascend/worker/v2/model_runner.py',symbol:'NPUModelRunner',anchor:'class NPUModelRunner(',lines:4},'model_runner = NPUModelRunner(','非 encoder-only 分支明确导入 worker/v2 下的 NPUModelRunner。','construct'),
   edge(proc,load,'self.worker.load_model()','init_device 整体返回后，非 elastic 分支继续 load_model；包装层通过 __getattr__ 转发。','continuation',[v(base,'WorkerWrapperBase.__getattr__')]),
  ]},
  {title:'MRv2 Runner 调用模型加载器',summary:'NPUWorker → NPUModelRunner → GPUModelRunner → loader',edges:[
   edge(load,npu,'self.model_runner.load_model()','把模型加载委派给上一阶段创建的 MRv2 runner。'),
   edge(npu,gpu,'super().load_model(load_dummy_weights','Ascend 做适配后调用上游 MRv2 实现。上游类名含 GPU，不代表此处切换到 GPU 执行。','inheritance'),
   edge(gpu,v(loader+'__init__.py','get_model_loader'),'model_loader = get_model_loader(','先按 load_format 获取加载器；本分支 auto/safetensors 对应 DefaultModelLoader。','call',[{repo:'vllm',file:loader+'__init__.py',symbol:'loader mapping',anchor:'"auto": DefaultModelLoader,',lines:22}]),
   edge(gpu,baseLoad,'self.model = model or model_loader.load_model(','未传入现成 model 时进入 loader；DefaultModelLoader 继承 BaseModelLoader.load_model。','inheritance',[{repo:'vllm',file:loader+'default_loader.py',symbol:'DefaultModelLoader',anchor:'class DefaultModelLoader(',lines:4}]),
   edge(baseLoad,create,'model = self.create_model(','先构造模型与参数容器；create_model 返回后才继续 self.load_weights。'),
   edge(create,initialize,'model = initialize_model(','调用公共模型构造入口。'),
  ]},
  {title:'模型构造找到 MoE 层',summary:'initialize_model → 模型 → DecoderLayer → MoE → 工厂',edges:[
   edge(initialize,causal,'model = model_class(vllm_config=vllm_config, prefix=prefix)','按架构选择模型类；注册表把本示例的 DeepseekV2ForCausalLM 指向 deepseek_v2.py 中的同名类，进入现代构造接口。','dispatch',[{repo:'vllm',file:'vllm/model_executor/models/registry.py',symbol:'model architecture mapping',anchor:'"DeepseekV2ForCausalLM": ("deepseek_v2", "DeepseekV2ForCausalLM"),',lines:3}]),
   edge(causal,backbone,'self.model = self.model_cls(','model_cls=DeepseekV2Model，构造主干。','dispatch',[{repo:'vllm',file:model,symbol:'DeepseekV2ForCausalLM.model_cls',anchor:'model_cls = DeepseekV2Model',within:'DeepseekV2ForCausalLM',lines:2}]),
   edge(backbone,layer,'lambda prefix: DeepseekV2DecoderLayer(','make_layers 按 PP 本地层范围执行这个 lambda；它才调用 DecoderLayer，并非遗漏了一个普通直调。','callback',[{repo:'vllm',file:'vllm/model_executor/models/utils.py',symbol:'make_layers',anchor:'def make_layers(',lines:42}]),
   edge(layer,moeLayer,'self.mlp = DeepseekV2MoE(','仅 is_moe_layer 分支构造 MoE；dense 层走另一支。','conditional'),
   edge(moeLayer,wrapper,'self.experts = FusedMoEFactory(','模型调用名为 FusedMoEFactory 的绑定；Ascend patch 将它替换为 _ascend_FusedMoE。','registration',[{repo:'ascend',file:patch,symbol:'factory binding replacement',anchor:'_fused_moe_layer.FusedMoEFactory = _ascend_FusedMoE',lines:11}]),
  ]},
  {title:'Ascend 适配后进入上游工厂',summary:'_ascend_FusedMoE → 原始 FusedMoEFactory',edges:[
   edge(wrapper,factory,'runner = _original_FusedMoE(','Ascend 准备 Router、适配专家类，再调用预先保存的上游工厂。','call',[{repo:'ascend',file:patch,symbol:'original factory alias',anchor:'_original_FusedMoE = _fused_moe_layer.FusedMoEFactory',lines:3}]),
  ]},
  {title:'工厂构建执行管线',summary:'专家映射 + 权重拥有者 + Runner；返回后再加载 checkpoint',edges:[
   edge(factory,v(moe+'expert_map_manager.py','ExpertMapManager.__init__'),'expert_map_manager = ExpertMapManager(','工厂内部第一项：根据 EP 配置计算本地专家和 expert_map。'),
   edge(factory,a('vllm_ascend/ops/fused_moe/routed_experts.py','AscendRoutedExperts.__init__'),'routed_experts = routed_experts_cls(','工厂内部另一项：构造专家权重拥有者。普通 NPU 默认 RoutedExperts 经 OOT 注册分发到 Ascend；不是上一个对象调用它。','registration',[{repo:'ascend',file:'vllm_ascend/utils.py',symbol:'register_ascend_customop',anchor:'"RoutedExperts": AscendRoutedExperts,',lines:3},{repo:'ascend',file:patch,symbol:'adapt routed class',anchor:'routed_experts_cls = _adapt_routed_experts_cls(routed_experts_cls)',lines:3},...oot]),
   edge(factory,a('vllm_ascend/ops/fused_moe/fused_moe.py','AscendMoERunner.__init__'),'runner = runner_cls(','工厂内部随后构造 Runner。默认 MoERunner 经 OOT 注册选择 Ascend 实现，关联 Router 和专家权重拥有者。','registration',[{repo:'ascend',file:'vllm_ascend/utils.py',symbol:'register_ascend_customop',anchor:'"MoERunner": AscendMoERunner,',lines:3},...oot]),
   edge(a('vllm_ascend/ops/fused_moe/fused_moe.py','AscendMoERunner.__init__'),a('vllm_ascend/ops/fused_moe/moe_comm_method.py','setup_moe_comm_method'),'setup_moe_comm_method(self.moe_config)','Runner 初始化预注册通信实现；每批选择类型是之后的另一阶段。'),
  ]}
 ]
};
