---
title: "Codex AI Digest 深读版 · 2026-06-30"
description: "Codex 真读真写 · 论文/趋势/技能/工具/行动。基于 aibrief 当日 37 条高信号内容生成。"
pubDate: 2026-06-30
author: Lei
tags: ["learning-log", "ai-digest", "aibrief", "codex"]
draft: false
---

Codex 真读真写 · 论文/趋势/技能/工具/行动

## 先看结论

1. 今天最强的研究信号不是“更大模型”，而是“把 agent 的中间过程变成可训练、可检索、可校准的结构”。[WorldEvolver](https://arxiv.org/abs/2606.30639v1) 用部署期转移记忆修正 world model，[Agents-A1](https://arxiv.org/abs/2606.30616v1) 用 45K token 级长轨迹训练 agent，方向都指向同一件事：agent 能力越来越依赖过程基础设施，而不只是单次回答质量。

2. 长上下文效率的下一步不是简单把 attention 替换掉，而是选择性保留昂贵能力。[FlashMorph](https://arxiv.org/abs/2606.30562v1) 的关键价值在于把 hybrid attention 层选择建模成全局子集优化，而不是逐层打分。这对软件系统也有迁移意义：预算有限时，要优化“组合配置”，不是优化孤立模块。

3. 多 agent 系统会出现稳定行为吸引子，不同模型之间还有非对称影响。[Attractor States](https://arxiv.org/abs/2606.30571v1) 提醒我们：长期 agent 协作不能只测单轮 benchmark，必须测对话动力学、风格传染、立场漂移和目标保持。

4. 企业 AI 采购正在从“用最强模型”转向“控制模型输出的归属、成本和供应链”。[Meta 限制 Claude Code/Codex](https://the-decoder.com/meta-restricts-use-of-claude-code-and-codex-to-keep-rival-ai-out-of-its-training-data/) 和 [Amazon 被报道在蒸馏 Anthropic 模型](https://the-decoder.com/amazon-engineers-are-reportedly-distilling-anthropic-models-to-cut-costs-before-new-token-based-pricing-kicks-in/) 互相印证：distillation、训练数据污染、token 计费，正在变成组织层面的工程约束。后者来自 The Information 转述，需回原文验证。

5. AI 基础设施重新回到“原子世界”。[空芯光纤 51.3 Tb/s 试验](https://www.tomshardware.com/networking/chinas-hollow-core-fiber-trial-pushes-51-3-tb-s-over-128-miles-without-signal-regeneration-milestone-targets-ai-era-networking-bottlenecks) 和 [AI 硬件回归身体/传感器的长文](https://saqiba.substack.com/p/the-body-it-asked-for) 都在说明：模型能力增长之后，瓶颈会转移到网络、功耗、设备形态、传感器和部署位置。

## 今天先读

### 1. WorldEvolver：部署期自演化 world model，不改权重也能变准

**核心内容**
[Self-Evolving World Models for LLM Agent Planning](https://arxiv.org/abs/2606.30639v1) 研究的是 long-horizon agent 的一个老问题：agent 在执行动作前可以让 world model 预测后果，但错误预测会误导行动，甚至比没有预测更差。作者提出 WorldEvolver，保持下游 agent 和模型参数冻结，只修正部署期上下文。它有三块：Episodic Memory 存真实 action transition，用检索做模拟；Semantic Memory 从“预测-观察”不一致中提炼稳定规则；Selective Foresight 过滤低置信预测，再把可用预测放进 agent 推理上下文。实验在 ALFWorld、ScienceWorld、Word2World、AgentBoard 上看预测准确率和 agent 成功率。

**我的判断**
这篇的工程价值在于它把 world model 从“离线训练好的预测器”改成了“可审计的运行时证据库”。它没有承诺在线微调大模型，而是把真实 transition 和 mismatch rule 作为 prompt-level evidence。这一点很现实：多数生产 agent 不可能每次遇到环境偏差就更新参数，但完全不吸收经验又会重复犯错。论文里 preliminary oracle study 也给了关键直觉：完美 foresight 能提升动作准确率，噪声 foresight 会伤害决策，所以问题不是“要不要预测”，而是“什么时候让预测进入决策”。

**你可以怎么用**
做 coding agent、浏览器 agent 或内部自动化时，可以把 WorldEvolver 翻译成三个表：`transitions` 存动作前状态、动作、观察结果；`mismatch_rules` 存“我以为会发生 X，实际发生 Y，所以以后遇到 Z 要小心”；`foresight_gate` 在执行前只注入高置信预测。最小实验是选一个固定任务集，比如 30 个网页表单或 30 个 repo 修改任务，比较三组：无 foresight、无过滤 foresight、带 mismatch memory 的 selective foresight。指标不要只看成功率，还要看错误类型是否复发。

**需要小心**
论文评估场景仍偏文本环境，真实软件环境里 state space 更脏：网页状态、权限、缓存、API 限流、用户未保存改动都会让 transition 难以复用。Semantic Memory 也可能变成过时规则库。落地时必须给 rule 加来源、时间、适用条件和失效机制，否则“经验”会变成长期污染。

### 2. Agents-A1：参数不扩大，扩大 agent horizon

**核心内容**
[Scaling the Horizon, Not the Parameters](https://arxiv.org/abs/2606.30616v1) 提出 35B MoE agentic model Agents-A1，声称通过扩展 agent horizon 达到 trillion-parameter 级别表现。它的核心不是单个模型结构，而是一套 long-horizon knowledge-action infrastructure，把外部知识、动作、观察、执行结果和 verifier outcome 连起来，生成平均 45K tokens 的 agentic trajectories。训练流程三段：全域 SFT 得到通用长程 agent；训练领域 teacher；再用 domain-routed on-policy distillation 和 salient vocabulary alignment 把多个领域能力蒸馏进一个学生模型。

**我的判断**
这篇代表了 agent 训练从“答案监督”转向“过程监督”的趋势。它明确指出长程任务的难点不是模型不会说，而是要能找信息、分解、调用工具、解释观察、验证、失败恢复。平均 45K token trajectory 很重要，因为这让模型接触到真实任务里的中间状态，而不是只看到清理过的最终解。domain-routed OPD 的动机也合理：搜索、科研、工程、指令遵循的推理模式会互相冲突，直接混训容易把能力搅散。

**你可以怎么用**
如果没有训练模型的资源，也可以借它的思想做数据资产：把每次 agent 工作流记录成 knowledge-action graph，而不是聊天日志。节点包括目标、检索、文件读写、命令执行、观察、验证器、失败、修复。然后用这些轨迹训练小模型、做提示样例、做回归测试，甚至做工具路由器。最小实验：选 20 个历史 Codex 任务，重放出“动作-观察-验证”结构，看看是否能自动抽取 5 类失败恢复模式。

**需要小心**
论文声称对 1T 参数模型有优势，但 excerpt 里 benchmark 名称和引用有不少 `undef` 残留，说明 HTML/排版或引用导出不干净，需要回 PDF 和代码验证。更大的问题是：长轨迹训练可能学到“冗长行动”而不是“有效行动”。实际评估必须加入成本、工具调用次数、无效观察比例、恢复后成功率，而不只是最终 benchmark 分数。

### 3. 不确定性感知生成：主观任务不能只追求一个答案

**核心内容**
[Uncertainty-Aware Generation and Decision-Making Under Ambiguity](https://arxiv.org/abs/2606.30578v1) 处理 tutoring 和 peer review 这类高主观、高风险任务。作者用 Bayesian decision theory、risk-averse decision making 和 conformal prediction，让模型在生成前显式考虑中间状态的不确定性：辅导场景里是教学策略，审稿场景里是分数。conformal prediction 用来给状态集合提供统计保证，并剪枝候选状态；Bayesian 方法最大化期望效用；risk-averse 方法看最坏情况效用。

**我的判断**
这篇提醒我们，很多 LLM 产品失败不是因为模型不够聪明，而是决策规则太粗糙。审稿分数、学生错误类型、客服责任归因，本来就存在人类分歧。如果系统硬输出一个确定判断，会把歧义伪装成确定性。更有价值的做法是输出一个 plausible set，再基于效用函数选择回应。论文还发现 risk-averse 规则在高歧义时可能退化成泛泛而谈，因为它为了覆盖最坏情况牺牲了具体性；Bayesian 方法反而更稳。

**你可以怎么用**
用于产品评审、代码 review、学习反馈时，不要只让模型给单一评分。可以让模型先产生候选状态分布，比如“这是设计问题/实现问题/需求不清”的概率，再生成对应建议。最小实验：对 50 条历史 review 评论做人类标签，比较普通生成、Bayesian expected utility、worst-case conservative 三种策略，指标包括具体性、误导率、覆盖率和人工接受率。

**需要小心**
conformal guarantee 依赖校准集和交换性假设，生产数据分布一变，保证就会变弱。risk-averse 输出容易变成“安全但没用”。这类方法最好用于“辅助人类缩小判断空间”，不适合直接自动裁决。

### 4. Attractor States：多轮模型对话有稳定吸引子

**核心内容**
[Attractor States Emerge in Multi-Turn LLM Conversations](https://arxiv.org/abs/2606.30571v1) 研究 7 个模型在 20 个争议话题上的 20 轮辩论，区分 self-play 和 mixed-play。self-play 用来估计每个模型自己的稳定行为区间，mixed-play 则看不同模型配对时谁影响谁。作者在 embedding 空间、discourse traits 和 stance 上追踪轨迹，发现模型有 topic-independent 的行为吸引子；一些模型如 Claude Haiku 对其他模型有较强吸引力，GPT-4.1 nano 更容易被带偏。

**我的判断**
这对 multi-agent 设计很关键。我们平时常把多个 agent 当成“多样性增强器”，但这篇显示长期对话里可能出现风格和行为收敛，而且影响是非对称的。强势模型可能不仅给出观点，还改变其他模型表达方式、元评论频率、立场漂移路径。于是 multi-agent eval 不能只看最终答案投票，还要看互动过程是否压扁了多样性。

**你可以怎么用**
做 agent panel、debate、review committee 时，应记录每轮 agent 输出的 embedding、立场、语气特征和最终采纳路径。最小实验：让三个不同模型对同一设计方案做 10 轮评审，比较固定发言顺序、随机顺序、匿名摘要中转三种设置，看最终意见是否总向某个模型靠拢。如果靠拢严重，就需要引入独立草稿、延迟互看、主持人压缩或反事实角色。

**需要小心**
论文用的是开放式辩论，不等于所有工具型 agent 都会出现同样吸引子。embedding 空间里的靠近也不必然意味着任务表现退化。落地时要把 attractor 指标和业务指标一起看：是否更快收敛、是否少犯错、是否丢失少数观点。

### 5. FlashMorph：hybrid attention 的层选择是组合优化问题

**核心内容**
[Morphing into Hybrid Attention Models](https://arxiv.org/abs/2606.30562v1) 关注 Transformer-to-hybrid conversion：从预训练 Transformer 出发，只保留部分 full-attention 层，其余替换为 linear attention，以降低长上下文计算和 KV cache 成本。过去常用固定间隔、逐层扰动或逐层打分来决定保留哪些层。FlashMorph 把问题建模为预算约束下的子集选择：先给每个 full-attention 层加可转换的 linear-attention branch，冻结权重，在合成长上下文检索数据上联合优化 layer gates，用 linearization regularization 鼓励更多使用 linear attention，再按预算离散化，最后 logits distillation 和长上下文微调。

**我的判断**
这篇的关键不是“又一个 attention 变体”，而是指出层重要性不是孤立属性。两个层单独看都重要，但一起保留可能冗余；两个层单独看一般，但一起转换可能破坏同一功能链。这个问题在工程系统里很常见：缓存、检索、rerank、工具调用、审查器各自 A/B 有收益，但组合后可能互相抵消。FlashMorph 的方法论是先构造可混合系统，再联合学习配置，最后离散成可部署结构。

**你可以怎么用**
如果在做 long-context agent，不一定能改模型，但可以迁移到上下文预算：哪些历史消息保留原文，哪些压缩成摘要，哪些变成规则。不要逐条按“最近/最长/打分最高”选，应该在任务集上联合搜索组合。最小实验：对同一任务集比较三种上下文策略：最近优先、逐条重要性打分、全局预算优化。指标看长程 recall、成本和错误恢复率。

**需要小心**
FlashMorph 仍需要后续 distillation 和 finetuning，不能理解成无成本转换。合成长上下文检索数据是否覆盖真实任务，会决定 gate 学到的是通用层配置还是 benchmark 配置。对开源模型实际复现前，需要看代码和 ablation。

### 6. 空芯光纤：AI 集群瓶颈正在从 GPU 扩展到光网络

**核心内容**
[Tom’s Hardware 报道](https://www.tomshardware.com/networking/chinas-hollow-core-fiber-trial-pushes-51-3-tb-s-over-128-miles-without-signal-regeneration-milestone-targets-ai-era-networking-bottlenecks)称，YOFC、中国电信和 Dekoli 完成空芯光纤 WDM 现场试验：单波长 1.2 Tb/s，约 206.5 km 未中继，总容量 51.3 Tb/s，只用 EDFA 放大，不用远程泵浦放大。空芯光纤让光在空气芯中传播，理论上比传统玻璃芯低延迟、低非线性，但历史瓶颈是衰减。报道还提到系统级按波长调整速率和功率，避开气体吸收峰；硬件侧用了级联双增益单元和多元素掺杂的高功率放大器。

**我的判断**
这条不应只看成通信新闻，而是 AI 基础设施新闻。大规模训练和分布式推理越来越受网络限制，尤其当电力和土地迫使数据中心分散部署时，跨设施低延迟互联会变成竞争点。HCF 的价值不只是“更快”，而是让集群地理布局有更大自由度。报道还把 Microsoft/Lumenisity、AWS 自研 HCF、Corning 与 Microsoft/Meta/Lumen/Nvidia 的关系串起来，说明这不是单点试验，而是供应链正在形成。

**你可以怎么用**
对做 AI infra 或企业采购的人，应该把网络拓扑纳入模型成本表。最小验证是估算一个多机房推理系统里 token latency 的组成：模型计算、队列、跨机房传输、存储读取。然后模拟 30% latency improvement 对 SLA、批处理大小和路由策略的影响。即便不用 HCF，也能逼自己把“网络是假设”改成“网络是变量”。

**需要小心**
这是媒体报道，不是论文或运营商完整技术白皮书。容量、距离、放大方式和“商业电缆”细节需要回 YOFC/中国电信原始公告验证。HCF 的制造良率、连接器、维护、部署成本仍是未知数。

### 7. Nimetic：Zero-JS SPA 是 backend-driven UI 的一条极端路线

**核心内容**
[Nimetic](https://yottadb.com/nimetic-zero-js-single-page-applications-with-nim-datastar-and-yottadb/) 把 Nim、Datastar 和 YottaDB 组合成“零用户客户端 JavaScript”的 SPA。后端用 Nim 和 MummyDS HTTP server；前端用 Datastar，通过 HTML attributes 和 Server-Sent Events patch DOM；存储用 YottaDB，一个 daemonless、进程内、层级 key-value 数据库，支持 ACID transaction。文章的主张是：现代 SPA 的 node_modules、构建管线和 hydration 很重，可以把状态逻辑放回后端，用 SSE 做局部更新。

**我的判断**
这不是所有前端的未来，但它适合一类内部工具和实时控制台：交互复杂度中等、状态一致性重要、团队更擅长后端、希望减少 JS 构建复杂度。YottaDB 的 daemonless 架构也很有意思：应用进程直接访问数据库结构，减少网络和 IPC 开销。这和 SQLite 在边缘应用里的吸引力类似，但 YottaDB 更强调层级 globals 和事务。

**你可以怎么用**
如果你在做 agent dashboard、任务队列、评测控制台，可以试一个最小版本：后端维护任务状态，前端只接收 SSE patch，避免引入完整 React/Vue 状态管理。最小实验是做一个“agent run viewer”：列表、日志流、状态变更、取消按钮。指标看首屏复杂度、交互延迟、部署包大小和调试难度。

**需要小心**
“Zero-JS”容易变成口号。Datastar 本身仍是客户端运行的轻量 JS，只是不写应用 JS。复杂离线交互、富文本编辑、复杂图形界面、需要大量本地状态的应用不适合这条路线。Nim/YottaDB 生态也比主流 Web 栈小，团队学习成本不能忽略。

## 知识卡片

### World Model Memory

定义：把 agent 对环境的预测、真实观察和二者差异保存下来，用于后续动作前模拟。
为什么重要：长程任务里的错误常来自环境假设过时，而不是推理能力不足。[WorldEvolver](https://arxiv.org/abs/2606.30639v1) 说明 deployment-time evidence 可以不改权重地提升 foresight。
落地例子：浏览器 agent 记录“点击提交后弹出二次确认”“某站搜索框会清空过滤器”。
误用风险：把偶然现象写成永久规则，导致后续任务被旧经验误导。

### Horizon Scaling

定义：通过更长、更真实的动作轨迹训练 agent，而不是只扩大模型参数。
为什么重要：[Agents-A1](https://arxiv.org/abs/2606.30616v1) 把知识、动作、观察和 verifier outcome 连成训练基础设施，说明 agent 能力越来越依赖过程数据。
落地例子：把 Codex 任务记录成 action-observation-verification graph，用于回归测试和小模型蒸馏。
误用风险：长轨迹不等于好轨迹，可能训练出啰嗦、低效、过度工具调用的 agent。

### Selective Foresight

定义：只把高置信、任务相关的预测注入 agent 上下文。
为什么重要：错误 foresight 会伤害决策，论文的 oracle diagnostic 明确把 noisy foresight 和 perfect foresight 区分开。
落地例子：执行危险命令前，让系统预测影响半径；低置信时只提示“不确定”，不强行建议。
误用风险：置信度本身如果没校准，会让系统自信地犯错。

### Attractor Evaluation

定义：评估多轮模型交互是否向某些稳定行为、风格或立场收敛。
为什么重要：[Attractor States](https://arxiv.org/abs/2606.30571v1) 显示模型之间存在非对称影响，多 agent 不天然保证多样性。
落地例子：对 agent committee 记录每轮立场变化，检查是否总被某个强势模型牵引。
误用风险：把风格收敛误判为质量提升，忽略少数但正确的反对意见。

### Global Budget Selection

定义：在预算有限时优化模块组合，而不是给每个模块独立打分。
为什么重要：[FlashMorph](https://arxiv.org/abs/2606.30562v1) 说明 full-attention 层的价值取决于其他层是否保留。
落地例子：上下文窗口里原文、摘要、规则、检索结果的比例应联合评估。
误用风险：全局搜索容易过拟合评测集，需要跨任务验证。

### Backend-Driven Reactivity

定义：后端掌管状态和渲染意图，前端通过 SSE/HTML patch 接收更新。
为什么重要：[Nimetic](https://yottadb.com/nimetic-zero-js-single-page-applications-with-nim-datastar-and-yottadb/) 展示了减少前端状态复杂度的一条路线。
落地例子：内部评测面板、agent 日志 viewer、任务队列管理器。
误用风险：复杂本地交互和离线体验会很难做。

## 前沿论文雷达

- [WorldEvolver](https://arxiv.org/abs/2606.30639v1)：研究问题是 world model 如何在部署期适应环境偏移。方法贡献是 episodic memory、semantic mismatch rules、selective foresight。实验信号来自 ALFWorld、ScienceWorld、Word2World、AgentBoard。限制是文本环境偏多，真实工具环境的状态复用难度更高。下一步看代码、mismatch rule 的质量控制和长期遗忘机制。

- [Agents-A1](https://arxiv.org/abs/2606.30616v1)：研究问题是小于 trillion 级参数的模型能否靠长程轨迹获得强 agent 能力。方法贡献是 knowledge-action infrastructure、domain teachers、domain-routed OPD。实验信号声称在多个长程 benchmark 上超过 1T 模型。限制是 excerpt 中引用有 `undef` 异常，且成本指标未知。下一步看数据构造、trajectory 去噪、工具环境是否可复现。

- [Uncertainty-Aware Generation](https://arxiv.org/abs/2606.30578v1)：研究问题是主观任务中如何在不确定状态下生成高效用输出。方法贡献是把 Bayesian expected utility、conformal prediction 和 risk-averse decision rule 接到 LLM generation。实验信号是 tutoring 和 peer review 中 utility 可提升，但 worst-case 策略可能退化。下一步看校准集规模、主观标签分歧建模和人工工作流结合方式。

- [Attractor States](https://arxiv.org/abs/2606.30571v1)：研究问题是开放式多模型长对话是否存在稳定行为吸引子。方法贡献是 self-play baseline 加 mixed-play 轨迹分析。实验信号是 7 模型、20 话题、20 轮辩论中观察到模型特定吸引子和非对称影响。限制是 debate 场景不等于任务型 agent。下一步看工具调用 agent、代码 review agent、planner-executor 架构是否也有类似吸引子。

- [FlashMorph](https://arxiv.org/abs/2606.30562v1)：研究问题是 Transformer-to-hybrid conversion 中如何选择保留 full attention 的层。方法贡献是 morphable model、联合 gate 优化、预算离散化和后续 distillation。实验信号是更好保留长上下文 recall 与通用能力，同时降低层选择成本。限制是需要微调链路，合成检索数据可能偏窄。下一步看不同模型尺寸和真实长文任务上的复现。

## 工程迁移

1. agent 记忆不要只存“最终答案”，要存 action transition。可复用的不是聊天记录，而是“状态-动作-观察-验证”的结构化轨迹。

2. 给 foresight 加门控。预测结果只有在置信、来源、适用条件明确时才进入决策上下文，否则宁可作为旁路诊断。

3. 多 agent 系统要防风格塌缩。让 agent 先独立写草稿，再互评；让主持人汇总证据，不要让最会说的模型控制讨论轨迹。

4. 长上下文策略要按组合评估。检索、摘要、原文保留、规则注入之间有互相替代和互相污染，不能只看单项 recall。

5. 工具评估要包含“不该用”的条件。Nimetic 适合内部实时面板，不适合复杂本地富交互；HCF 适合思考大规模 AI 网络，不等于马上可采购。

6. 企业 AI 合规要记录模型输出来源。Meta 的案例说明，外部模型输出进入内部训练集会变成法律和合作风险，不只是工程便利问题。

## 趋势与证据链

**一手/较强信号**
arXiv 论文集中指向 agent 过程化：WorldEvolver 讲部署期记忆修正，Agents-A1 讲长轨迹训练，Uncertainty-Aware 讲决策规则，Attractor States 讲多轮动力学，FlashMorph 讲长上下文效率。这些互相独立，但都把重点从“单轮生成”推向“运行过程、状态和预算”。

**二手但有用信号**
The Decoder 对 [Meta 限制 Claude Code/Codex](https://the-decoder.com/meta-restricts-use-of-claude-code-and-codex-to-keep-rival-ai-out-of-its-training-data/) 的报道来自 The Information 内部文件转述，和 [Amazon 蒸馏 Anthropic 模型以控成本](https://the-decoder.com/amazon-engineers-are-reportedly-distilling-anthropic-models-to-cut-costs-before-new-token-based-pricing-kicks-in/) 的报道共同说明：企业开始把外部模型当成供应链风险、成本风险和数据污染风险。Amazon 一条需回 The Information 原文验证；Meta 一条也应看原始报道和公司政策原文。

**政策/地缘信号**
[EU 寻求 AI independence](https://the-decoder.com/eu-seeks-ai-independence-as-austria-proposes-luring-anthropic-to-europe/) 是明显的二手政策解读。可信部分是“欧洲对美国模型访问依赖的焦虑”；较弱部分是“吸引 Anthropic 搬去欧洲”的可执行性，文章自己也认为不现实。把中国开源模型作为替代也不是主权解法，只是换依赖方。

**社区热度但不足以落地**
Reddit 上关于 Dario、GPT-OSS-2、GLM 5.2、LongCat-2.0 的帖子只有标题/摘要，今天没有足够信号支撑技术判断。Simon Willison 的 [HTML table extractor](https://simonwillison.net/2026/Jun/29/html-table-extractor/#atom-everything) 和 [Ornith-1.0](https://simonwillison.net/2026/Jun/29/ornith/#atom-everything) 只有二手摘要；可作为后续阅读入口，不能直接当事实落地。GitHub Trending 里的 SimpleX、agency-agents、FluidVoice、maigret 也只说明注意力，不说明质量。

## 行动清单

1. 为现有 agent 任务日志加一个 `transition` schema：目标、状态摘要、动作、观察、验证结果、失败原因。产物是一份 20 条历史任务的 JSONL；验证指标是能否自动聚类出 5 类可复用失败模式。

2. 做一个 selective foresight A/B：同一批 30 个任务比较无预测、全量预测、门控预测。产物是成功率和误导率表；验证指标是门控预测组错误动作减少。

3. 给 multi-agent review 加 attractor 监控：每轮记录模型、立场、建议类别、是否采纳。产物是一张对话轨迹图；验证指标是是否存在单一模型持续牵引最终结论。

4. 把上下文预算从“最近优先”改成三策略评测：最近消息、重要性打分、全局组合选择。产物是同一任务集的上下文构成和结果对比；验证指标是 long-context recall 与 token 成本。

5. 复现一个 Nimetic 风格最小内部工具：agent run viewer，后端 SSE 推日志和状态，前端只做 patch。产物是可点击 demo；验证指标是无构建复杂度、日志延迟低于 500ms、取消动作可靠。

6. 建一张企业模型供应链风险表：外部模型、输出能否进入训练数据、是否允许蒸馏、token 成本、替代模型。产物是内部政策草案；验证指标是每个工具都有允许/禁止/需审批边界。

7. 回看 HCF 原始技术来源：找 YOFC/中国电信公告或论文，核对 51.3 Tb/s、206.5 km、EDFA、无远程泵浦这些参数。产物是一页 infra note；验证指标是媒体报道中的每个关键数字都有原始出处。

## 需要验证

- [Agents-A1](https://arxiv.org/abs/2606.30616v1) 的 benchmark 对比和引用异常需要回 PDF、代码和数据说明验证，尤其是“35B 对 1T 模型”的成本公平性。

- [YOFC 空芯光纤试验](https://www.tomshardware.com/networking/chinas-hollow-core-fiber-trial-pushes-51-3-tb-s-over-128-miles-without-signal-regeneration-milestone-targets-ai-era-networking-bottlenecks) 需要回原始公告确认现场条件、商用可用性和放大器配置。

- [Amazon 蒸馏 Anthropic](https://the-decoder.com/amazon-engineers-are-reportedly-distilling-anthropic-models-to-cut-costs-before-new-token-based-pricing-kicks-in/) 与 [Meta 限制 Codex/Claude Code](https://the-decoder.com/meta-restricts-use-of-claude-code-and-codex-to-keep-rival-ai-out-of-its-training-data/) 都是 The Information 转述，需回原文验证具体措辞、合同权限和公司回应。

- Reddit 上关于 Dario、GLM 5.2、LongCat-2.0、GPT-OSS-2 的内容今天没有足够信号，不能进入事实判断。

- [Ornith-1.0](https://simonwillison.net/2026/Jun/29/ornith/#atom-everything) 目前只读到 Simon 摘要，需回模型卡、训练数据、license 和 benchmark 原文验证。

---

这篇日志由 `yo digest` 自动生成，深读来源：codex。
