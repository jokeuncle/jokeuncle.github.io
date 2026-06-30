---
title: "Agent Skills 与 MCP 的研究前线：从能力包到执行边界"
description: "深读 2026 年 6 月底 arXiv 上 Skill/MCP 相关论文：Skill 如何获取、调用、参数化和治理，MCP 如何从连接协议走向安全执行层。"
pubDate: 2026-06-30
author: Lei
tags: ["learning-log", "ai-digest", "agent", "skills", "mcp", "codex"]
draft: false
---

这篇是一次专项深读。我把 6 月底 arXiv 上和 Agent Skills、MCP、skill marketplace、runtime enforcement 相关的论文 HTML 正文抓下来逐篇读了一遍，重点不是复述每篇论文做了什么，而是回答一个更实用的问题：

如果我们真的要把 Codex、Claude Code、浏览器 agent、内部自动化脚本接进长期工作流，Skill 和 MCP 到底应该怎么设计，怎么评估，怎么防守？

## 先看结论

1. Skill 正在从“提示词片段”变成“可安装、可检索、可执行、可评估的能力包”。它可以来自教程视频、产品文档、UI 探索轨迹、成功任务日志，也可以被编译成模型参数。真正有价值的不是多写几个 prompt 模板，而是建立 Skill 的获取、结构化、验证、版本管理和失效机制。

2. MCP 的研究重点正在从“怎么把工具接给模型”转向“怎么让工具调用可治理”。最新论文讨论的已经不是简单 server wrapper，而是 Resource Gateway、Tool Orchestrator、Stateful Session Server、Proxy Aggregator、Domain Adapter 这些架构模式，以及 capability grant、数据流授权、trace-level policy、deny-path audit 这些运行时约束。

3. Skill 不是天然可信的知识。UCOB 这类论文很重要，因为它明确指出 skill-conditioned branch 有时会误导 agent。生产系统里，检索到的 skill 应该是候选证据，而不是最高权限指令。系统必须能比较“用 skill”和“不用 skill”的局部收益，并记录 skill 造成的失败。

4. 多模态 Skill 会成为 GUI agent 和复杂软件 agent 的硬需求。VisualSkill 和 RESOURCE2SKILL 都说明，纯文本步骤不足以覆盖真实应用里的菜单、按钮、状态检查和视觉定位。对于 Office、CAD、Blender、UE5、浏览器后台这类环境，截图、局部图、代码片段、参数示例和 provenance 应该和文字说明一起进入 skill artifact。

5. 安全问题不是边角料，而是 Skill/MCP 的核心设计约束。ShareLock 证明恶意 payload 可以拆成多个看似无害的 MCP tool description；恶意 skill 检测论文在真实 marketplace 找到大量伪装技能；VIGIL 和 HCP 则说明，单次 tool-call 过滤不足以防住跨步骤、跨 artifact、跨数据流的违规行为。

我的整体判断是：下一代 agent 基础设施不会只比“哪个模型更强”，而会比谁能把能力包、工具协议、运行时权限、审计轨迹和评测闭环接成一个系统。Skill 负责让 agent 学会做事，MCP 负责让 agent 接触世界，但真正决定能不能上线的是中间那层可验证的执行边界。

## 这批论文在回答同一个问题

表面上看，这 10 篇论文分散在不同主题：

- [RESOURCE2SKILL](https://arxiv.org/abs/2606.29538)：把教程、仓库、文章、参考材料蒸馏成可执行 Skill Wiki，并通过 MCP 风格接口让 agent 调用。
- [VISUALSKILL](https://arxiv.org/abs/2606.18448)：给 computer-use agent 构造带截图和主题索引的多模态 skill。
- [Dynamo](https://arxiv.org/abs/2606.30185)：让视觉语言 agent 在冻结模型下动态生成认知 skill 和 Python visual tool。
- [Parametric Skills](https://arxiv.org/abs/2606.30015)：把文本 skill 编译成 LoRA 参数，让 skill 不再完全依赖长上下文阅读。
- [UCOB](https://arxiv.org/abs/2606.29502)：把 skill-conditioned 和 no-skill 两条执行分支做 return-to-go 比较，动态决定谁应该当局部老师。
- [MCP Server Architecture Patterns](https://arxiv.org/abs/2606.30317)：总结 MCP server 的架构模式、反模式和工具数量影响。
- [From Tool Connection to Execution Control](https://arxiv.org/abs/2606.29073)：提出 HCP，把 MCP 风格工具连接提升为有能力授权和数据流控制的执行层。
- [ShareLock](https://arxiv.org/abs/2606.27027)：展示多工具阈值投毒，恶意指令可以拆散藏进多个 MCP tool 描述。
- [VIGIL](https://arxiv.org/abs/2606.26524)：把 skill 里的自然语言行为规范编译成可执行 runtime policy，在 trace 上做 SMT 检查。
- [Detecting Malicious Agent Skills in the Wild](https://arxiv.org/abs/2606.23416)：用 Locate-and-Judge 扫描真实 skill marketplaces，发现隐藏恶意 skills。

但它们实际在回答同一个系统问题：

agent 的能力从哪里来，如何被调用，什么时候该信任，出错后如何归因，攻击者能从哪里进入，运行时又如何阻断？

如果只看单篇论文，很容易得到局部结论。比如“多模态 skill 有用”、“MCP server 要写好 tool description”、“skill marketplace 有恶意内容”。但放在一起看，图景更清楚：Skill/MCP 正在形成一条完整供应链。上游是知识获取，中间是表示与检索，下游是执行与监控，旁边是 marketplace 和安全审计。

这也是我觉得这批论文值得专项消化的原因。它们不是又一轮 agent hype，而是在把 agent 工程拆成可操作的层。

## 第一层：Skill 获取，不是手写 prompt 库

RESOURCE2SKILL 和 VISUALSKILL 最有启发的地方，是它们都没有把 skill 理解成“人类写一段提示词”。它们的核心问题是：真实世界的操作知识原本散落在视频、文档、教程、仓库、手册、UI 状态和历史轨迹里，怎么把这些材料变成 agent 可复用的能力包？

RESOURCE2SKILL 的做法是从 tutorial videos、repositories、articles、reference artifacts 里蒸馏知识，构建一个层级化的 multimodal Skill Wiki。每个 skill 不只是文字，还包括代码、视觉例子、元数据和 provenance。它还通过 MCP-mediated browse-select-execute 接口，让 agent 在任务中浏览、选择、执行相关技能。论文覆盖 Web、Excel、Reaper、PPT、Blender、CAD、UE5 七个 authoring domains，报告的主实验显示 Skill Wiki 平均整体分数比 no-skill 高 11.9 个百分点；在人类 A/B 评测里，带 Skill 的输出在排除平局后赢了 83.3%。

这个结果最值得看的不是数字，而是方法论：可复用能力来自人类知识材料的重新组织。很多团队今天做 agent，最大的问题不是模型不够强，而是把公司内部流程、产品文档、历史问题、UI 操作经验都当成普通 RAG 文本塞进去。RAG 能回答“文档里写了什么”，但 Skill 要回答“在这个环境里怎么完成动作，并且怎么验证动作完成了”。这是两个不同层级。

VISUALSKILL 则把这个问题推进到 GUI agent。它给每个应用构建一套 skill：中心索引加 per-topic 文件，每个 topic 带文字和图。agent 不一次性读完整 skill，而是通过 `load_topic` MCP tool 按需加载相关主题。论文在 CUA-World 和 OSExpert-Eval 上报告，multimodal skill 平均分 0.456，高于 no-skill 的 0.303，也高于 text-only skill 的 0.373。

这个差距说明一个很现实的点：很多软件任务不是语言问题，而是界面状态识别问题。按钮位置、菜单层级、弹窗状态、是否已经选中、字段是否可编辑，这些东西光靠文字很难稳定传达。对于 GUI agent，多模态 skill 不是装饰，它是在减少“看错界面”的概率。

对我们自己的博客和自动化系统，这里有一个直接迁移：以后 source pack 不应该只有正文摘要。真正有学习价值的输入应该保留来源、关键图、代码片段、表格、任务轨迹、失败样例和验证方式。只有这样，二次消化才能从“读到一些结论”升级成“学到一套可迁移流程”。

## 第二层：Skill 调用，必须有局部信用分配

UCOB 是这批论文里我最想单独拿出来提醒的一篇，因为它反过来给 Skill 热潮泼了一盆冷水：Skill 可能帮你，也可能误导你。

传统 skill memory 方法通常默认：检索到相似任务的 skill，就把它放进上下文，让 agent 跟着做。但 UCOB 认为这不够。它把 skill-conditioned prompt 和 no-skill prompt 看成同一任务、同一 anchor state 下的两种 on-policy context view，然后比较它们的 return-to-go。谁在这个局部状态下回报更高，谁才暂时当老师。

这个思想很关键。Skill 的正确性不是全局属性，而是状态相关属性。同一个 skill 在任务 A 的早期阶段可能有用，在任务 B 的后期阶段可能误导；在一个网页版本里可用，换一个 UI 就过时；对一个模型是清晰的，对另一个模型可能增加上下文负担。

UCOB 在 ALFWorld、WebShop、Search-QA 上做实验，报告 Qwen3-1.7B 在 ALFWorld 从 65.6 提到 89.1，在 WebShop 从 61.7 提到 79.7。数字本身可以等复现，但这个框架非常实用：Skill 系统不应该只记录“这个 skill 被调用了”，还要记录“调用以后局部状态有没有变好”。

如果把它落到工程里，Skill 调用至少要多出四个字段：

- 触发条件：为什么这个 skill 被检索出来？
- 局部收益：使用后是否减少了不确定性、推进了任务状态、通过了验证？
- 失败归因：失败是 skill 过时、上下文不匹配、模型没遵循，还是工具执行失败？
- 反事实样本：不用这个 skill 是否反而更好？

这会让 skill library 从“知识仓库”变成“可学习的策略库”。没有这层信用分配，Skill 越多，系统越可能变慢、变乱、变得难以归因。

## 第三层：文本 Skill 可能只是中间形态

Parametric Skills 提出一个很有野心的方向：不要每次都把 skill 当文本塞进上下文，而是把 free-form textual skills 转成模型参数，例如通过 hypernetwork 生成 LoRA adapter。它的动机很直接：长上下文里的文本 skill 会占 token，会干扰注意力，也不保证模型真的遵循。既然 skill 是稳定能力，能不能把它“编译”到参数里？

论文构建了 45.8k reusable skills，来源包括公开 skill repositories、developer ecosystems 和成功 agent trajectories，覆盖软件、AI/LLM、安全等 13 个领域。训练流程包括 skill reconstruction pretraining、single-turn skill exploitation 和 multi-turn trajectory training。评估在复杂 SWE 子任务上，报告 ParametricSkills 高于 in-context skill，DeepSeek-V4-Flash judge 下从 57.65 提到 64.09。

我对这条线的判断是：它很可能代表长期方向，但短期不适合大多数团队直接照搬。

它解决的是一个真实瓶颈：当 skill library 很大，任务又长，靠检索文本塞上下文会遇到成本、干扰和遗忘问题。把常用 skill 编译成 adapter，理论上可以让模型在不读长说明的情况下掌握操作习惯。它还支持一个自演化 loop：生成文本 skill，编译成参数，验证，修订，再合并进全局 LoRA。

但工程代价也很明显。参数化 skill 带来了版本合并、能力污染、回滚、评测覆盖、分发成本和安全审计问题。文本 skill 至少可以被人读、被静态扫描、被 provenance 追踪；参数 skill 一旦合并，行为边界更难解释。

所以我更愿意把 Parametric Skills 看成一个提醒：Skill 的终态未必是 Markdown 文件。今天我们先把 skill 结构化、可评估、可追踪；当某些 skill 被高频使用、稳定有效、风险可控时，才考虑把它们压缩进更低成本的表示，可能是 adapter，也可能是缓存策略、tool router、专用小模型。

## 第四层：MCP Server 不是随便包一层 API

MCP Server Architecture Patterns 这篇很适合当 MCP 工程设计清单。它从 15 个 MCP server 案例里总结出五类模式：

- Resource Gateway：把外部资源以统一资源接口暴露给模型。
- Tool Orchestrator：组合多个后端动作，让模型调用较高层工具。
- Stateful Session Server：维护会话状态，支持多步交互。
- Proxy Aggregator：把多个服务聚合成一个 MCP 入口。
- Domain-Specific Adapter：为特定领域封装语义更清晰的工具。

它也列了几个反模式：God Tool、Unsanitized Resource Content、Synchronous Long-Running Operations、Missing or Vague Tool Descriptions。

这里最值得注意的是工具数量实验。论文报告 Claude Haiku 4.5 在每个上下文 10 到 15 个 tool 之间准确率跌破 90%，Sonnet 4 在 20 到 30 个 tool 之间跌破。这类数字不一定能直接外推到所有模型，但方向很可信：LLM-facing API 和 REST/GraphQL 不一样。REST 面向程序员和静态调用代码，MCP tool 面向模型选择，tool description 就是模型的“路由表”。工具太多、描述太糊、粒度太乱，模型就会选错。

这对我们设计 MCP server 有几个直接约束：

1. 不要做 God Tool。一个 `run_anything(command: string)` 看起来灵活，实际会把权限、验证和语义都丢给模型。

2. 工具描述要写成决策边界，不只是功能介绍。模型需要知道什么时候该用、什么时候不该用、输入约束是什么、会产生什么副作用。

3. Tool count 要有预算。与其暴露 50 个低层工具，不如按任务面向模型设计 8 到 15 个高语义工具，再在 server 内部做编排。

4. 长任务不要同步阻塞。MCP server 需要任务 ID、状态查询、取消、重试和日志，而不是让模型等一个长调用。

5. Observability 是接口的一部分。每次调用的输入、输出、耗时、失败、权限、版本都应该可追踪。

这篇论文给我的最大启发是：MCP server 的难点不是“把 API 接上”，而是把工具设计成模型能正确选择、系统能正确约束、人能正确审计的接口。

## 第五层：连接工具不等于控制执行

HCP 这篇的标题已经把问题说清楚了：From Tool Connection to Execution Control。MCP 风格协议解决的是连接问题，但 agent 真正需要的是执行控制问题。

论文提出 8 个 invariants，包括 metadata non-authority、grant-backed approval、canonical resources、principal binding、scoped capability invocation、source-and-target data-flow authorization、deny-path audit、explicit protocol state。简单说，就是工具元数据不能自带权威，权限必须来自 grant，资源要 canonicalize，调用要绑定 principal，capability 要限定范围，数据从哪里来、到哪里去都要授权，拒绝路径也要审计，协议状态必须显式。

实验是 10 个攻击案例，比较 naive MCP-like、mitigation baseline 和 HCP。论文报告 naive 模式放过全部攻击，baseline 仍放过 6/10，HCP 阻断 10/10。虽然这是受控攻击集，不能当成生产覆盖率，但它的价值在于把“安全直觉”落成了可检查的不变量。

这对 agent 平台特别重要。很多团队会以为“加了用户确认”就安全了，但用户确认如果没有绑定资源、scope、principal 和数据流，仍可能被 confused deputy、tool poisoning 或 session confusion 绕过。一个按钮上写“允许访问文件”并不等于 agent 只能访问这一次任务需要的文件。

HCP 的工程含义是：MCP gateway 不应该只是流量转发器，而应该是 capability runtime。它需要知道谁在调用、用什么授权、访问哪个规范化资源、从哪个来源读取数据、写到哪个目标、这次调用属于哪个任务状态。如果这些信息缺失，审计日志再长也只是聊天记录。

## 第六层：Skill/MCP 的攻击面正在变真实

ShareLock 和恶意 skill 检测论文把风险从理论推到现实。

ShareLock 研究 MCP multi-tool threshold poisoning。攻击者把恶意指令用 Shamir secret sharing 拆成多个 share，藏进多个看似无害的 tool description、metadata、tool id、checksum 等位置。单独看每个工具，静态扫描器可能都觉得安全；只有当 agent 在任务中调用到足够数量的相关工具，payload 才被重构。论文在 Travel、Coding、Finance、Office 四个域、四个主流 LLM、两个 MCP client 上测试，报告平均攻击成功率超过 90%。

它最重要的启发是：安全审计不能只看单个 tool。工具集本身可能是攻击载体，更新历史、工具组合、触发条件和运行时调用序列都要被纳入检查。一个 MCP server registry 如果只做逐项扫描，很容易漏掉跨工具组合攻击。

Detecting Malicious Agent Skills in the Wild 则从 marketplace 角度证明问题已经存在。论文提出 Locate-and-Judge：先用小模型根据 instruction-following attention 选出 skill 中最可疑的结构化 span，再让强 judge 检查这些 span。这样比全文 LLM 扫描便宜，且更能发现伪装在长文档里的隐藏 payload。

它扫描了约 134k 个来自 Lobehub、Skills.sh、Clawhub.ai 的 skills。人工复核 359 个 flag，确认 131 个 malicious，其中 82 个是 Hidden Malicious Skills，也就是表面装成正常功能、内部带危险指令或代码的技能。论文还指出，很多隐藏恶意技能能逃过现有 scanner。

这对未来 skill marketplace 是一个很强的警告：Skill 的安全模型和传统 prompt injection 不一样。传统防守依赖“可信系统指令”和“不可信外部数据”的边界，但 skill 本身就是第三方写的指令，而且 agent 设计上就要遵循它。攻击不是把恶意文本塞进 data，而是把恶意指令伪装成 capability package 的一部分。

所以，skill 安装流程至少应该像安装软件包，而不是像复制一段 prompt：

- 看来源和签名。
- 看权限声明。
- 静态扫描 SKILL.md 和 helper code。
- 在沙箱里运行代表任务。
- 检查是否访问秘密、网络、文件系统和外部命令。
- 记录安装版本和后续更新 diff。
- 支持禁用、回滚和隔离。

## 第七层：运行时规范必须可执行

VIGIL 是我认为安全方向里最实用的一篇。它解决的问题是：Skill 文档里通常会写自然语言规范，比如“删除前必须确认”、“敏感数据不得泄露”、“中间 artifact 必须验证后才能被下游消费”。但今天的 runtime 只是相信 agent 会遵守这些话，并没有真正执行这些规范。

VIGIL 的做法是把 skill specification、operator constraints 和 global rules 转成 policy language，在 agent-tool event trace 上检查。它支持 temporal dependencies、argument constraints、value-flow conditions，并把检查转成 finite-trace SMT constraints。重点不是让 LLM 当裁判，而是让 LLM 只负责把自然语言规范草拟成结构化 policy，之后 grounding、SMT encoding、safe/unsafe decision 都由确定性组件完成。

这点很关键。很多违规行为不是单次 tool call 能看出来的。比如某个中间 motion estimate 应该先验证再给下游 mask generator 使用。单看每个调用，参数合法、schema 合法、最终输出也合法；但从 trace 看，某个 artifact 被未验证地传给了下游，这才是违规。

VIGIL 在 152 条 labeled runs 上报告 95.8% recall、89.6% precision，F1 领先最强 baseline 15.8 个点；在 216 个真实 skill-bundle executions 里发现 34 个 confirmed policy-violating runs，并包含一个被 NVIDIA acknowledged 的 specification defect。数字仍要等代码和数据复现，但方向很扎实：agent safety 不能只靠 prompt，也不能只靠单次调用 allowlist，必须把行为规范变成 trace-level enforcement。

对生产 agent 来说，这意味着我们需要把“任务完成了吗”和“任务是否按规范完成”分开评估。一个 agent 能完成文件修改，不代表它遵守了审阅流程；能生成报告，不代表它没有泄露 source pack；能跑完自动化，不代表它没有跳过人工确认。

## 对 Codex 自动化和博客消化系统的启发

把这些论文读完，我觉得最应该迁移到我们自己系统里的不是某个模型或某个 benchmark，而是四个设计原则。

第一，source pack 要变成 skill-grade evidence，而不是摘要输入。

现在很多 digest 系统的问题是抓到正文后就压成短摘要，信息密度看似高，但可迁移知识丢了。Skill 论文提醒我们，真正可复用的知识应该保留：

- 来源链接和 provenance。
- 任务适用场景。
- 操作步骤。
- 输入输出示例。
- 失败模式。
- 验证方法。
- 图、表、代码、界面状态。
- 与其他 skill 的依赖关系。

这对博客也一样。深度消化不应该只是“论文说了什么”，而应该回答“这篇能改变我之后怎么做事”。比如看完 VIGIL，我们应该在自己的 agent 流程里加 trace policy；看完 UCOB，我们应该记录 skill 调用是否真的改善局部结果；看完 MCP Patterns，我们应该限制 tool 数量和避免 God Tool。

第二，Skill library 要有生命周期，而不是无限堆积。

一个合理的 Skill schema 可以从这些字段开始：

```yaml
name: skill_name
purpose: 这个 skill 解决什么任务
when_to_use: 什么时候该用
when_not_to_use: 什么时候不要用
inputs: 需要哪些上下文和工具
steps: 可执行步骤
verification: 如何确认完成
failure_modes: 常见失败和修复
permissions: 需要的文件/网络/命令权限
provenance: 来源材料、作者、版本
last_validated: 最近验证时间
metrics: 成功率、返工率、误用率
```

真正的流程应该是 acquire、normalize、sandbox test、publish、monitor、deprecate。每个 skill 都应该能被禁用、回滚、重新验证。否则 skill library 会变成另一个 prompt 垃圾堆。

第三，MCP tool 要按模型选择来设计，不要按后端 API 原样暴露。

模型不是程序员。它不会像人一样读完 API 文档再写调用代码，而是在上下文里根据 tool name、description、schema 和当前任务做选择。因此 MCP 工具设计应该优先考虑：

- 一个任务阶段暴露多少工具。
- 工具之间是否语义重叠。
- 描述是否包含正反例和副作用。
- 参数是否足够结构化。
- 是否有 dry-run、validate、commit 三段式。
- 是否能返回可判定的状态，而不是大段自然语言。

如果一个 server 暴露了大量低层工具，模型选错并不是模型坏，而是接口没有为模型选择优化。

第四，运行时审计要从 command log 升级成 trace contract。

今天很多 agent log 只是记录命令和输出。这对 debug 有用，但对治理不够。VIGIL/HCP/ShareLock 共同说明，真正需要记录的是：

- task id 和 protocol state。
- principal 和 grant。
- tool invocation 的 scope。
- canonical resource。
- 输入来源和输出目标。
- artifact identity。
- 数据流。
- pending action 是否被批准或拒绝。
- 拒绝原因和 witness。

没有这些字段，就很难回答“这个 agent 到底有没有越权”。而不能回答这个问题，就不应该给它更高权限。

## 一套可以立刻做的小实验

如果要把这批论文转成行动，我会先做四个小实验。

1. 给一个真实 Codex workflow 建 skill/no-skill A/B。

选 20 个重复任务，例如修复测试、生成 digest、更新博客、整理论文。每个任务跑两次：一次只给原始需求，一次给结构化 skill。记录成功率、返工次数、token、工具调用、验证结果。重点看 skill 是否真的减少失败，而不是看输出是否更长。

2. 把博客 source pack 升级成“证据卡”。

每篇论文不要只存摘要，额外存：研究问题、方法结构、实验设置、关键数字、局限、可迁移做法、适用/不适用场景、需要验证项。每天 blog 生成时先读证据卡，再写二次消化。这样文章会自然更深入。

3. 给内部 MCP/工具接口做一次反模式检查。

逐个看工具是否是 God Tool，description 是否含糊，是否同步跑长任务，是否没有权限边界，是否没有版本和审计字段。然后把工具按任务阶段分组，控制每个阶段暴露给模型的数量。

4. 做一次 Skill/MCP 安全演练。

设计几个 benign-looking malicious skill/tool description：敏感文件读取、跨工具 payload、越权网络请求、跳过确认。看当前 agent 是否会调用，log 是否能定位，人工审核是否能发现。这个演练的目的不是攻击，而是验证防线有没有可观测性。

## 我会怎么改写自己的判断

读这些论文前，我对 Skill 的直觉更偏“把高质量经验写成 reusable prompt”。读完后，我会改成：

Skill 是带来源、权限、验证和生命周期的能力 artifact。

读这些论文前，我对 MCP 的直觉更偏“让模型调用工具的标准协议”。读完后，我会改成：

MCP 是模型接触外部世界的入口，但还需要 execution-control runtime 才能进入生产。

读这些论文前，我会认为“更多 skill 通常更好”。读完 UCOB、ShareLock 和恶意 marketplace 论文后，这个判断必须加条件：

更多 skill 只在可检索、可评估、可撤销、可审计时更好。否则它既可能降低决策质量，也可能扩大攻击面。

这也是今天最值得带走的知识：Agent 能力的复利不来自把所有东西都塞给模型，而来自把知识、工具、权限和验证做成系统。Skill 是学习层，MCP 是连接层，runtime policy 是信任层。三层缺一层，都很难长期稳定。

## 需要验证

这些论文都是 arXiv 预印本，很多实验结果还需要代码、数据和独立复现。尤其是涉及未来模型名、私有 harness、真实 marketplace scan、供应商 acknowledgement 的部分，我会把它们当成强信号，而不是最终事实。

具体来说：

- RESOURCE2SKILL、VISUALSKILL、Dynamo 的任务集和评分方式需要复现后才能判断泛化性。
- UCOB 的 return-to-go 比较思想很有价值，但不同环境下 reward 设计会直接影响结论。
- Parametric Skills 的参数合并、回滚、安全审计成本，需要比论文更长周期的实验。
- MCP Patterns 的工具数量阈值只能当设计参考，不能机械套到所有模型和客户端。
- HCP、VIGIL 的安全结果来自受控或有限样本，生产系统还会遇到日志不可观测、脚本内部副作用、policy 编译错误等问题。
- ShareLock 和恶意 skill 检测论文说明攻击面存在，但防守策略要结合具体 marketplace、安装流程和 runtime 权限模型来设计。

即便如此，这批论文已经足够改变实践优先级：不要先追更多 agent 壳，先把 skill artifact、MCP tool boundary、runtime trace 和评测闭环搭起来。
