import {callPath} from './call-path.mjs';
// One function per node. Return edges describe execution order, not reverse calls.
const g=callPath.groups.map(group=>group.edges);
const proc=g[0][0].from,init=g[0][2].from,groups=g[0][5].to;
const load=g[2][0].from,npu=g[2][0].to,gpu=g[2][1].to,baseLoad=g[2][3].to,create=g[2][4].to,initialize=g[2][5].to;
const causal=g[3][0].to,backbone=g[3][1].to,layer=g[3][2].to,moeLayer=g[3][3].to,wrapper=g[4][0].from,factory=g[4][0].to;
const step=(id,definition,purpose,sources=[])=>({id,definition,purpose,sources});
const link=(kind,label,description)=>({kind,label,description});
const runnerConstructor={...g[1][3].to,symbol:'NPUModelRunner.__init__',scope:'NPUModelRunner.__init__',anchor:'def __init__(',within:'NPUModelRunner'};
export const transitionPaths=[
 {
  id:'groups-factory',title:'EP 建组完成 → FusedMoEFactory',
  description:'先返回初始化流程，创建 MRv2 runner；再由启动器加载模型，沿模型构造进入 MoE 工厂。',scope:callPath.scope,
  steps:[
   step('ep-groups',groups,'EP 通信组已经建立；这个函数不调用模型工厂。',[g[1][0].site,...g[0].slice(2).map(e=>e.site)]),
   step('npu-init',init,'建组调用栈返回后，继续初始化 workspace 和 runner。',[g[1][1].site]),
   step('workspace',g[1][1].to,'创建 workspace，并保存即将构造的 model runner。',[g[1][2].site]),
   step('make-runner',g[1][2].to,'普通非 encoder-only 分支，选择 worker/v2 的 NPUModelRunner。',[g[1][3].site]),
   step('runner-instance',runnerConstructor,'构造 MRv2 runner 实例。创建完成后，初始化调用栈逐层返回。',[runnerConstructor,g[1][3].site]),
   step('worker-proc',proc,'init_device 完整返回后，启动器继续执行 load_model。',[g[1][4].site,...g[1][4].support]),
   step('worker-load',load,'把加载工作交给初始化阶段创建的 model_runner。',[g[2][0].site]),
   step('ascend-runner-load',npu,'Ascend MRv2 加载适配，再委托上游实现。',[g[2][1].site]),
   step('upstream-runner-load',gpu,'先取得 loader，再调用它加载模型；类名含 GPU，实际仍是 NPU 路径。',[g[2][2].site,...g[2][2].support,g[2][3].site,...g[2][3].support]),
   step('loader-load',baseLoad,'先创建模型，等构造完成后才写入 checkpoint。',[g[2][4].site]),
   step('loader-create',create,'进入公共模型构造入口。',[g[2][5].site]),
   step('initialize-model',initialize,'按架构注册表解析本示例的模型类。',[g[3][0].site,...g[3][0].support]),
   step('causal-model',causal,'构造 DeepseekV2Model 主干。',[g[3][1].site,...g[3][1].support]),
   step('model-backbone',backbone,'make_layers 按 PP 本地层范围调用 DecoderLayer 构造回调。',[g[3][2].site,...g[3][2].support]),
   step('decoder-layer',layer,'本层为 MoE 时，创建 DeepseekV2MoE；dense 层走另一支。',[g[3][3].site]),
   step('moe-layer',moeLayer,'模型调用 FusedMoEFactory；该名称已被 Ascend 平台补丁替换。',[g[3][4].site,...g[3][4].support]),
   step('ascend-factory',wrapper,'准备 Router 和专家类适配，再调用保存的上游工厂。',[g[4][0].site,...g[4][0].support]),
   step('upstream-factory',factory,'到达上游工厂：组织专家映射、权重拥有者和 Runner。',[g[5][0].site,g[5][1].site,g[5][2].site]),
  ],
  links:[
   link('return','沿原调用栈返回','经 ensure、分布式初始化与 _init_device 返回到 NPUWorker.init_device；下一项是创建 workspace 和 runner。'),
   link('call','调用',g[1][1].description),link('call','调用',g[1][2].description),link('construct','构造实例',g[1][3].description),
   link('return','初始化完成，沿栈返回启动器','runner 构造完成后，经 _make_model_runner、workspace 初始化和 init_device 返回；不是 runner 反向调用 WorkerProc。'),
   link('continuation','继续 load_model（包装层转发）',g[1][4].description),link('call','调用',g[2][0].description),
   link('inheritance','super：进入上游 MRv2',g[2][1].description),link('inheritance','loader 使用继承的 load_model',g[2][3].description),
   link('call','调用',g[2][4].description),link('call','调用',g[2][5].description),link('dispatch','按模型架构解析',g[3][0].description),
   link('dispatch','self.model_cls 构造',g[3][1].description),link('callback','make_layers 执行构造回调',g[3][2].description),
   link('conditional','is_moe_layer 分支',g[3][3].description),link('registration','Ascend 替换的工厂绑定',g[3][4].description),
   link('call','调用原始工厂',g[4][0].description),
  ],
 }
];
