# OpenRadar Handoff Log

历史记录只追加，不覆盖。

## 2026-07-28 — Phase 0.1 initial prototype
- 当前阶段：Phase 0.1 — Static PWA Prototype
- 分支：`phase-0.1-pwa-prototype`
- HEAD：待提交
- 已完成：静态PWA；GitHub/Hugging Face公开API；自然语言搜索；分类和许可证筛选；收藏、标签、备注、下一步动作、JSON导出；交接文件。
- 未完成：真实历史增速；云端数据库；定时采集；多设备收藏；更多平台；MCP；人工验收；线上部署。
- 当前阻塞：无业务阻塞。容器无法直接 git clone GitHub，故未直接Fork RepoPulse代码，只复用其公开架构思路。
- 禁止事项：不得把潜力分写成真实涨幅；不得暴露密钥；不得加入付费API；不得声称已验收。
- 已知问题和风险：GitHub匿名限额较低；localStorage可能被清除；跨域API需用户浏览器实测；许可证元数据可能缺失。
- 工作区/暂存/提交/标签/推送/合并：待收尾。
- 测试：待执行。
- 下一项唯一任务：完成静态检查、HTTP冒烟测试并提交 Phase 0.1。

## 2026-07-28 — Phase 0.2-A office/life taxonomy and Chinese search expansion
- 当前阶段：Phase 0.2-A — Office/Life Taxonomy & Chinese Search Expansion
- 分支：`phase-0.2-a-office-life-search`
- HEAD：`46c67ae`
- 当前状态：功能代码完成并提交；本地静态、HTTP、Chromium模拟桌面/移动端测试通过；真实外部API和用户Windows验收未完成。
- 已完成：办公效率、生活工具、商业应用底座分类；用途识别与筛选；中文需求英文关键词扩展；多轮GitHub/Hugging Face搜索；办公/生活Topic扫描；15分钟缓存；旧收藏兼容；Service Worker v2。
- 未完成：用户人工验收；真实外部API容器验证；历史快照；云同步；更多平台；MCP；生产部署。
- 当前阻塞：当前容器DNS解析失败，无法访问GitHub与Hugging Face API。
- 禁止事项：不得将代理分写成真实涨幅；不得将词典扩展称为大模型语义搜索；不得暴露密钥；不得破坏旧收藏；不得声称已验收。
- 已知问题和风险：中文词典有限；多轮搜索可能触发GitHub匿名限频；分类和用途为启发式；许可证需复核；localStorage仍可能被清除。
- 工作区/暂存/提交/标签/推送/合并：working tree dirty（交接文件）；staged none；commit `46c67ae`；tags none；not pushed；merge none。
- 测试：JS语法、Manifest、diff、HTTP、模拟桌面交互、旧收藏兼容、中文扩展、用途筛选、390px移动端均通过；真实API和用户验收未执行。
- 下一项唯一任务：在用户Windows机器更新Phase 0.2-A并验证真实API召回，只修复本阶段缺陷后再进入历史快照。
- 关键文件：`app.js`、`index.html`、`styles.css`、`sw.js`、`README.md`、`HANDOFF.md`、`docs/PROJECT_STATE.json`、`docs/HANDOFF_LOG.md`。

## 2026-07-28 — Phase 0.2-A final status pointer
- 当前阶段：Phase 0.2-A
- 分支：`phase-0.2-a-office-life-search`
- HEAD：`88bcd78`（功能提交 `46c67ae`，交接提交 `88bcd78`）
- 工作区：dirty，仅本条最终状态指针与 HEAD 同步更新；staged none。
- 标签/推送/合并：tags none；not pushed；merge none。
- 状态：代码与交接均已提交；真实外部API和用户Windows验收仍未完成。
- 下一项唯一任务：用户Windows更新并验收 Phase 0.2-A。

## 2026-07-28 — Phase 0.2-A user acceptance
- 当前阶段：Phase 0.2-A — Office/Life Taxonomy & Chinese Search Expansion
- 分支：`phase-0.2-a-office-life-search`
- HEAD：`88bcd78`（本验收记录提交前）
- 状态：用户已在 Windows Edge 和已安装 PWA 中完成真实人工验收，Phase 0.2-A 验收通过。
- 已完成：办公效率、生活工具、商业应用底座分类；用途筛选；中文关键词扩展搜索；收藏持久化；桌面PWA安装。
- 未完成：历史快照、真实增长、云同步、更多平台、MCP、生产部署。
- 当前阻塞：无 Phase 0.2-A 验收阻塞；开发容器DNS仍不适合验证新增平台真实API。
- 禁止事项：不得把代理潜力分描述成真实涨幅；不得把规则搜索描述成大模型语义检索；不得破坏收藏键；不得加入付费API。
- 已知问题和风险：复杂中文需求仍可能漏召回；许可证与自动分类仍需人工复核；localStorage清除会丢收藏。
- 工作区/暂存/提交/标签/推送/合并：working tree dirty（验收交接）；staged none；HEAD `88bcd78`；tags none；not pushed；merge none。
- 测试：用户确认首页、分类、用途筛选、收藏、中文搜索流程和Windows PWA安装全部通过。
- 下一项唯一任务：Phase 0.2-B 接入 GitLab、Codeberg、Gitee、ModelScope 的零成本平台适配器，并明确呈现数据源失败或降级状态。
- 关键文件：`app.js`、`index.html`、`styles.css`、`sw.js`、`README.md`、`HANDOFF.md`、`docs/PROJECT_STATE.json`、`docs/HANDOFF_LOG.md`。

## 2026-07-28 — Phase 0.2-B multi-platform adapters
- 当前阶段：Phase 0.2-B — Multi-Platform Public API Adapters
- 分支：`phase-0.2-b-multi-platform-adapters`
- Functional HEAD：`ceb75c5`
- 当前状态：六平台功能代码完成；本地静态、HTTP与Chromium模拟桌面/移动端测试通过；真实外部API和用户Windows验收未完成。
- 已完成：统一适配器；GitHub、Hugging Face、GitLab、Codeberg、Gitee、ModelScope；六平台筛选与并行搜索；平台状态与失败降级；备用搜索链接；平台指标差异化；中文平台原始查询；PWA缓存v3；可重复模拟浏览器测试。
- 未完成：用户真实API/CORS验收；Gitee/ModelScope稳定性结论；跨平台身份去重；历史快照与真实增长；软件包生态；外部热点；云收藏；MCP；生产部署。
- 当前阻塞：开发容器无法验证外部API/CORS；容器Chromium localhost导航被管理员策略阻止；需用户Windows Edge验收。
- 禁止事项：不得把代理分写成真实涨幅；不得混同比较不同平台原始热度；不得把模拟通过写成真实API通过；实验平台不得提前转正式；不得暴露密钥；不得破坏收藏；不得加入付费API。
- 已知问题和风险：Gitee接口可能不稳定；ModelScope字段和公开读取策略可能变化；GitLab许可证/语言元数据不足；Codeberg实例参数可能变化；跨平台镜像未去重；匿名请求可能限频；localStorage仍可能被清除。
- 工作区/暂存/提交/标签/推送/合并：功能提交后working tree clean；写入本交接后dirty；staged none；commit `ceb75c5`；tags none；not pushed；merge none。
- 测试：JS语法、Manifest、diff、HTTP静态资源、六平台桌面模拟、390px移动端、中文扩展、中文平台原始查询、六种返回结构与收藏键均通过；真实外部API与用户Windows未执行。
- 下一项唯一任务：用户Windows Edge逐项验证六个平台首页和搜索状态，只修复API/CORS/字段兼容缺陷，验收前不进入历史快照。
- 关键文件：`platform-adapters.js`、`app.js`、`index.html`、`styles.css`、`sw.js`、`tests/browser_mock_test.py`、`README.md`、`HANDOFF.md`、`docs/PROJECT_STATE.json`、`docs/HANDOFF_LOG.md`。

## 2026-07-28 — Phase 0.2-B user acceptance
- 当前阶段：Phase 0.2-B — Multi-Platform Public API Adapters
- 分支：`phase-0.2-b-multi-platform-adapters`
- HEAD：`0ddfffe`（本验收记录提交前）
- 状态：用户已在 Windows Edge 真实环境验证首页平台扫描。GitHub、Hugging Face、GitLab、Codeberg、ModelScope 均成功返回真实数据；Gitee 显示“不可用”。Phase 0.2-B 作为五平台实时雷达验收通过，但六平台目标存在一项已知适配器失败。
- 已完成：五个平台真实API/CORS与字段结构验收；平台状态数量显示；单源失败隔离。
- 未完成：Gitee 浏览器兼容；跨平台身份去重；历史快照与真实增长；软件包生态；云收藏；MCP；生产部署。
- 当前阻塞：Gitee 浏览器直连公开搜索接口不可用，可能涉及CORS或公开搜索端点稳定性。
- 禁止事项：不得将五平台通过写成六平台全部通过；不得把代理潜力分描述为真实涨幅；不得加入付费API或在前端暴露访问令牌。
- 已知问题和风险：Gitee v5仓库搜索存在公开缺陷反馈，单纯增加令牌也未必解决；备用通道需要限频、缓存和明确来源标识。
- 工作区/暂存/提交/标签/推送/合并：working tree dirty（验收交接）；staged none；HEAD `0ddfffe`；tags none；not pushed；merge none。
- 测试：用户Windows Edge真实结果——GitHub 48、Hugging Face 18、GitLab 18、Codeberg 18、ModelScope 18、Gitee不可用。
- 下一项唯一任务：Phase 0.2-B.1 增加本地同源Gitee兼容代理，优先调用官方v5 API，失败或空结果时低频回退到Gitee官方搜索页面，并保持零付费API。
- 关键文件：`platform-adapters.js`、计划新增 `server.mjs`、`app.js`、`README.md`、交接文件。

## 2026-07-28 — Phase 0.2-B.1 Gitee compatibility fallback
- 当前阶段：Phase 0.2-B.1 — Gitee Browser Compatibility Fallback
- 分支：`phase-0.2-b.1-gitee-fallback`
- Functional HEAD：`2a99832`
- 当前状态：功能代码完成；本地Node、HTTP、静态与Chromium模拟测试通过；真实Gitee上游和用户Windows验收未完成。
- 已完成：本地同源Node服务；Gitee v5 API优先；v5失败或空结果时回退Gitee官方搜索页面；HTML/嵌入JSON解析；15分钟缓存；12秒超时；固定上游与输入限制；运行模式识别；Windows双击启动器；Gitee回退标签；PWA缓存v4；API绕过；ModelScope移除实验标识；收藏v1兼容。
- 未完成：用户Windows真实Gitee验收；真实so.gitee页面结构验证；Gitee元数据完整度；跨平台去重；历史快照；软件包生态；外部热点；云收藏；MCP；生产部署。
- 当前阻塞：开发容器无法解析或访问Gitee域名；需要用户Windows Edge截图与结果。
- 禁止事项：不得把模拟解析写成真实Gitee通过；不得移除Gitee实验标识；不得开放任意代理；不得暴露Token；不得加入付费API；不得把代理分写成真实增长；不得破坏收藏。
- 已知问题和风险：Gitee v5搜索存在空结果公开反馈；官方搜索网页结构可能变化；回退结果字段可能不完整；静态服务器不提供Gitee代理；旧PWA缓存可能需强刷。
- 工作区/暂存/提交/标签/推送/合并：功能提交后clean；写交接后dirty；staged none；functional commit `2a99832`；tags none；not pushed；merge none。
- 测试：四个JS/MJS语法检查；Node服务与解析测试；v5成功/空结果回退/缓存；API健康与静态HTTP；六平台桌面模拟；390px移动端；Gitee回退标签；中文搜索；收藏键；Manifest；diff均通过。真实Gitee未执行。
- 下一项唯一任务：用户使用 `node server.mjs` 或 `start-openradar.cmd` 运行新版，验证Gitee首页和中文搜索；只修复真实兼容问题。
- 关键文件：`server.mjs`、`start-openradar.cmd`、`platform-adapters.js`、`app.js`、`sw.js`、`tests/server_test.mjs`、`tests/browser_mock_test.py`、交接文件。

## 2026-07-28 — Phase 0.2-B.1 final status pointer
- 当前阶段：Phase 0.2-B.1
- 分支：`phase-0.2-b.1-gitee-fallback`
- HEAD：`5df0026`（功能提交 `2a99832`，交接提交 `5df0026`）
- 工作区：dirty，仅本条最终状态指针、`HANDOFF.md` 与 `docs/PROJECT_STATE.json` 同步更新；staged none。
- 标签/推送/合并：tags none；not pushed；merge none。
- 状态：代码与正式交接均已提交；真实Gitee上游与用户Windows验收仍未完成。
- 下一项唯一任务：用户使用 `node server.mjs` 或双击 `start-openradar.cmd` 验证Gitee首页和中文搜索。

## 2026-07-28 — Phase 0.2-B.1 occupied-port usability fix
- 当前阶段：Phase 0.2-B.1
- 分支：`phase-0.2-b.1-gitee-fallback`
- Functional HEAD：`6a8996d`
- 已完成：本地服务端口被占用时显示中文说明，提醒关闭旧OpenRadar终端或按 `Ctrl + C`，并以退出码1结束。
- 未完成：用户Windows真实Gitee验收及后续历史快照。
- 当前阻塞：真实Gitee上游仍只能由用户Windows验证。
- 禁止事项：不得因端口冲突自动终止未知进程；不得静默改用其他端口导致桌面PWA来源改变。
- 已知问题和风险：用户若保留旧服务器，仍需手工停止后再启动新版。
- 工作区/暂存/提交/标签/推送/合并：代码提交 `6a8996d`；写交接后dirty；staged none；tags none；not pushed；merge none。
- 测试：实际使用8093启动成功，健康接口与首页均HTTP 200；8094双实例冲突测试返回退出码1并显示中文提示。
- 下一项唯一任务：用户Windows使用新版启动器验证Gitee真实首页和搜索。
- 关键文件：`server.mjs`、`start-openradar.cmd`、交接文件。

## 2026-07-28 — Phase 0.2-B.1 final packaged status
- 当前阶段：Phase 0.2-B.1
- 分支：`phase-0.2-b.1-gitee-fallback`
- HEAD：`8798291`（核心功能提交 `2a99832`，端口提示提交 `6a8996d`，最新交接提交 `8798291`）
- 工作区：dirty，仅最终状态指针三份交接文件；staged none。
- 标签/推送/合并：tags none；not pushed；merge none。
- 已完成：代码、测试、Windows启动器、源码包与Git bundle准备完成。
- 未完成：用户Windows真实Gitee验收。
- 当前阻塞：开发容器无法访问Gitee真实上游。
- 禁止事项：不得把打包完成说成Gitee验收通过。
- 已知问题和风险：Gitee官方网页结构变化仍可能导致回退解析失败。
- 下一项唯一任务：用户在Windows双击 `start-openradar.cmd`，验证Gitee状态与中文搜索。

## 2026-07-28 — Phase 0.2-B.1 user validation: official paths both empty
- 当前阶段：Phase 0.2-B.1 — Gitee Browser Compatibility Fallback
- 分支：`phase-0.2-b.1-gitee-fallback`
- HEAD：`8798291`（本记录提交前）
- 状态：用户Windows真实验收完成；本地兼容服务与回退切换正常，但Gitee仓库结果未通过。
- 已完成：`node server.mjs`真实启动；五个平台继续返回；Gitee同源路由可访问；v5空结果与official-search回退均真实确认。
- 未完成：Gitee真实项目结果；稳定动态数据接口；正式止损呈现；历史快照。
- 当前阻塞：`project management`、`vue`、`若依`均由v5返回空数组，动态搜索回退也解析为零项目。
- 禁止事项：不得继续重复相同人工测试；不得无限追逐不稳定内部接口；不得让Gitee阻塞历史快照；不得称Gitee已修复。
- 已知问题和风险：Gitee只能暂按外部搜索入口降级；内部动态接口变化风险高。
- 工作区/暂存/提交/标签/推送/合并：working tree dirty（本验收交接）；staged none；HEAD `8798291`；tags none；not pushed；merge none。
- 测试：Windows `/api/gitee/search` 对 `project management`、`vue`、`若依`均返回 `projects: []` 与 `source: gitee-official-search`。
- 下一项唯一任务：一次有止损线的Gitee精准修复，失败即外部搜索降级，然后进入五平台本地历史快照。
- 关键文件：`server.mjs`、`platform-adapters.js`、`app.js`、交接文件。

## 2026-07-28 — Phase 0.2-B.2 bounded Gitee repair and stop-loss
- 当前阶段：Phase 0.2-B.2 — Bounded Gitee Repair & Stop-Loss
- 分支：`phase-0.2-b.2-gitee-stoploss`
- Functional HEAD：`55d0c70`
- 状态：代码完成，本地测试通过；Gitee已从主线阻塞项降级为受限外部搜索源。
- 已完成：v5、official-search、Explore三段官方路径；结构化诊断；所有路径为空时external-search止损；前端黄色受限状态；五平台隔离。
- 未完成：用户Windows对新状态验收；历史快照；云端采集；跨平台去重。
- 当前阻塞：无，Gitee不再阻塞主线。
- 禁止事项：不得将外部搜索计入实时平台或增长；不得继续无限追逐Gitee内部接口；不得把探索结果冒充关键词结果。
- 已知问题和风险：Explore页面仍可能动态化；旧PWA缓存可能需要强刷。
- 工作区/暂存/提交/标签/推送/合并：写交接后dirty；staged none；functional commit `55d0c70`；tags none；not pushed；merge none。
- 测试：语法、server测试、四条Gitee路径、health、diff均通过；Windows真实Explore未运行。
- 下一项唯一任务：Phase 0.3-A本地历史快照与六小时后台采集。
- 关键文件：`server.mjs`、`platform-adapters.js`、`app.js`、测试与交接文件。

## 2026-07-28 — Phase 0.3-A local historical snapshot foundation
- 当前阶段：Phase 0.3-A — Local Historical Snapshot Foundation
- 分支：`phase-0.3-a-local-history`
- Functional HEAD：`dc554a8`
- 状态：功能代码完成；本地单元、HTTP、实际Node启动、模拟桌面/移动浏览器测试通过；用户Windows未验收，真实24小时/7天/30天需等待自然时间。
- 已完成：零依赖本地历史文件；原子写入；400天保留；五平台启动与六小时后台采集；浏览器补充快照；四个历史API；真实delta与覆盖时长；基线就绪阈值；平台内百分位跨平台排序；历史面板；手动采集；Gitee有界诊断与external-search止损；收藏兼容。
- 未完成：Windows真实文件写入验收；自然时间增长验收；云端无人值守；收藏优先追踪；跨平台去重；历史导出；软件包生态；MCP；生产部署。
- 当前阻塞：需要用户Windows运行验证；历史周期必须等待真实时间，不能模拟为验收通过。
- 禁止事项：不得伪造历史涨幅；不得混比跨平台原始指标；不得将Gitee外部搜索计入增长；不得提交data/history.json；不得破坏收藏或暴露密钥。
- 已知问题和风险：服务器关闭时不采集；睡眠/关机会形成缺口；候选池非全网全量；匿名API可能限频；跨平台镜像未去重。
- 工作区/暂存/提交/标签/推送/合并：functional commit后clean；写README/AGENTS/交接后dirty；staged none；functional commit `dc554a8`；tags none；not pushed；merge none。
- 测试：五个JS/MJS语法；history store；collector隔离；server APIs；Gitee止损；Chromium模拟桌面/390px移动；真实本地8097启动、health、history status、首页HTTP均通过；Windows与真实外部后台采集未运行。
- 下一项唯一任务：用户Windows启动Phase 0.3-A，确认History终端信息、历史面板、手动采集和data/history.json创建；只修真实运行缺陷。
- 关键文件：`history-store.mjs`、`server.mjs`、`app.js`、`index.html`、`styles.css`、三套测试、README与交接文件。

## 2026-07-29 — Phase 0.3-A user runtime acceptance
- 当前阶段：Phase 0.3-A — Local Historical Snapshot Foundation
- 分支：`phase-0.3-a-local-history`
- HEAD：`0484b54`（用户使用的已打包版本）
- 状态：用户在Windows真实环境确认“都可以用了”，本地服务器、历史状态、文件写入与手动使用链路验收通过；真实24小时、7天、30天榜仍需自然时间。
- 已完成：Windows真实启动；本地历史功能可用；`data/history.json`运行链路可用；五平台实时数据；Gitee止损降级；收藏兼容。
- 未完成：自然时间增长榜验收；关机后云端持续采集；跨平台去重；数据导出与迁移；MCP。
- 当前阻塞：历史周期只能等待真实时间，不能即时验收。
- 禁止事项：不得将运行链路通过写成24小时、7天、30天数值已验收；不得伪造历史数据。
- 已知问题和风险：本地服务器关闭、电脑关机或睡眠时会形成历史缺口。
- 工作区/暂存/提交/标签/推送/合并：用户机器Git状态未检查；开发bundle HEAD `0484b54`；tags none；not pushed；merge none。
- 测试：用户Windows确认Phase 0.3-A整体可用。
- 下一项唯一任务：Phase 0.3-B本地Ollama中文大白话、个人适配分析与持久化缓存。
- 关键文件：`history-store.mjs`、`server.mjs`、`app.js`、`data/history.json`。

## 2026-07-29 — Phase 0.3-B local Chinese plain-language insights
- 当前阶段：Phase 0.3-B — Local Chinese Plain-Language Insights
- 分支：`phase-0.3-b-local-insights`
- Functional HEAD：`0812d3d`
- 当前状态：功能代码完成；本地单元、HTTP、实际Node启动、模拟桌面/移动浏览器与Ollama离线降级测试通过；用户Windows真实`qwen3:4b`生成未验收。
- 已完成：所有项目规则摘要；Ollama与模型检测；`qwen3:4b`默认配置；结构化JSON Schema；串行生成；`keep_alive: 0`；README安全节选；本地`data/insights.json`缓存；指纹失效；完整中文适配分析弹窗；观察名单Ollama状态；三条Insights API；收藏与历史兼容。
- 未完成：Windows真实模型输出；真实README跨平台成功率；用户编辑纠错；收藏优先批量；跨平台去重；历史/解读导出迁移；云采集；软件包生态；MCP；生产部署。
- 当前阻塞：需要用户Windows真实Ollama与`qwen3:4b`验收；历史周期仍需自然时间。
- 禁止事项：不得自动批量生成全部项目；不得并发本地模型；不得把规则摘要标成AI；不得编造README未提供的信息；不得把AI许可说明写成法律结论；不得提交运行数据；不得加入付费API。
- 已知问题和风险：首次加载较慢；小模型可能误判；真实结构化输出可能偶发失败；匿名README路径可能限频或找不到；`keep_alive: 0`会让连续生成重复加载模型。
- 工作区/暂存/提交/标签/推送/合并：功能提交后clean；写README、AGENTS和交接后dirty；staged none；functional commit `0812d3d`；tags none；not pushed；merge none。
- 测试：全部JS/MJS语法；历史回归；insight store/service；Ollama状态/Schema/缓存/强制生成/离线降级；Insights HTTP；桌面弹窗；390px移动端；实际8098启动、health、insight status、规则降级与首页HTTP均通过；用户Windows真实模型未执行。
- 下一项唯一任务：用户Windows运行Phase 0.3-B，确认Ollama状态，分别生成一个GitHub和一个Hugging Face或ModelScope项目中文解读，确认`data/insights.json`写入和缓存复用；只修真实兼容缺陷。
- 关键文件：`insight-store.mjs`、`insight-service.mjs`、`server.mjs`、`app.js`、`index.html`、`styles.css`、三套测试与交接文件。

## 2026-07-29 — Phase 0.3-B user acceptance
- 当前阶段：Phase 0.3-B — Local Chinese Plain-Language Insights
- 分支：`phase-0.3-b-local-insights`
- HEAD：`2b632aa`（用户使用的已打包版本）
- 状态：用户明确反馈“完美，全部验收通过”。Windows真实Ollama、`qwen3:4b`中文解读、规则降级、`data/insights.json`缓存、历史与收藏兼容均验收通过。
- 已完成：真实本地模型连接；中文大白话生成；个人适配分析；缓存写入与复用；历史和收藏回归。
- 未完成：跨平台身份去重；统一详情；Codex研究任务；自然时间7天/30天增长；云端采集。
- 当前阻塞：无，Phase 0.3-B已验收；历史长期周期仍需自然时间。
- 禁止事项：不得把Phase 0.3-B验收扩大为后续未开发功能通过；不得伪造长期增长。
- 已知问题和风险：AI解读仍需按项目人工复核，尤其许可证、硬件和成熟度。
- 工作区/暂存/提交/标签/推送/合并：用户机器Git状态未检查；开发版本HEAD `2b632aa`；tags none；not pushed；merge none。
- 测试：用户Windows Edge、Ollama与qwen3:4b人工验收通过。
- 下一项唯一任务：Phase 0.3-C跨平台去重、统一项目详情与Codex研究任务生成。
- 关键文件：`insight-service.mjs`、`insight-store.mjs`、`server.mjs`、`app.js`、`data/insights.json`。

## 2026-07-29 — Phase 0.3-C cross-platform identity, unified details and Codex packets
- 当前阶段：Phase 0.3-C — Cross-Platform Identity, Unified Details & Codex Research Packets
- 分支：`phase-0.3-c-dedup-details-codex`
- Functional HEAD：`2c70561`
- 当前状态：功能代码完成；身份、导出、服务器、历史/Insights回归、桌面/移动模拟浏览器和实际Node本地文件写入测试通过；用户Windows未验收。
- 已完成：保守身份信号；同作者/项目名和显式互链合并；同名不同作者隔离；全部原始来源保留；实体/重复来源统计；平台筛选、收藏、Insight和历史兼容；统一详情页；每来源指标/许可证/增长；Codex Markdown与JSON研究包；本地API；浏览器降级；研究任务强制只研究不集成和完整交接。
- 未完成：Windows真实项目去重和详情验收；真实Codex研究包文件验收；自动启动Codex/MCP；人工拆分合并；项目家族图谱；自动数据迁移；云采集；软件包和外部信号；自然时间7天/30天验收。
- 当前阻塞：需要用户Windows真实接口与文件系统验证；跨平台无统一全局ID会导致保守规则漏合并。
- 禁止事项：不得仅靠名称或语义相似合并；不得丢原来源；不得称研究包等于Codex已研究；不得自动启动或消耗Codex额度；不得提交运行数据；不得破坏收藏/历史/Insights。
- 已知问题和风险：少量同作者同名项目仍可能误合并；组织迁移和不同命名配套项目会漏合并；Hash详情不是公网永久链接；研究包仍需用户粘贴到Codex；升级需手工复制历史和Insights数据。
- 工作区/暂存/提交/标签/推送/合并：功能提交后clean；写README、AGENTS和交接后dirty；staged none；functional commit `2c70561`；tags none；not pushed，origin为本地Phase 0.3-A bundle；merge none。
- 测试：全部语法与Manifest；history/insight回归；身份单测；Codex导出单测；server API；8来源合并6实体；3来源详情；Codex复制；390px移动端；实际8099启动、health、status、文件写入与首页HTTP均通过；用户Windows未执行。
- 下一项唯一任务：用户迁移旧`data/history.json`和`data/insights.json`，在Windows启动Phase 0.3-C，验收真实多来源项目、统一详情和`exports/codex`两个研究文件；只修真实兼容问题。
- 关键文件：`project-identity.js`、`codex-packet.js`、`codex-export-service.mjs`、`server.mjs`、`app.js`、`platform-adapters.js`、`index.html`、`styles.css`、`tests/project_identity_test.mjs`、`tests/codex_export_test.mjs`、交接文件。

## 2026-07-29 — Phase 0.3-C user acceptance
- 当前阶段：Phase 0.3-C — Cross-Platform Identity, Unified Details & Codex Research Packets
- 分支：`phase-0.3-c-dedup-details-codex`
- HEAD：`8ca6835`（用户使用的已打包版本）
- 状态：用户Windows真实验收通过。DeepSeek-R1成功合并GitHub、Hugging Face、ModelScope三个来源，详情页显示`3 SOURCES`；Codex研究包目录真实生成`RESEARCH_TASK.md`和`project-context.json`。
- 已完成：真实三来源合并、统一详情、原始指标保留、研究任务生成、剪贴板复制、本地文件落盘。
- 未完成：人工身份纠错、来源卡对比度、可信度初筛、完整数据迁移、MCP。
- 当前阻塞：无；主来源卡文字对比度为已知UI问题。
- 禁止事项：不得把研究包生成写成Codex已完成研究；不得把自动合并写成人工官方确认。
- 已知问题和风险：主来源高亮背景过亮，部分文字对比度不足。
- 工作区/暂存/提交/标签/推送/合并：用户机器Git状态未检查；开发版本HEAD `8ca6835`；tags none；not pushed；merge none。
- 测试：Windows Edge真实DeepSeek-R1三来源合并；统一详情；Codex两个文件实际存在。
- 下一项唯一任务：Phase 0.4-A可信度、人工纠错、来源卡对比度和完整备份迁移。
- 关键文件：`project-identity.js`、`app.js`、`styles.css`、`codex-packet.js`、`exports/codex/`。

## 2026-07-29 — Phase 0.4-A trust, correction and portability
- 当前阶段：Phase 0.4-A — Trust, Correction & Portability
- 分支：`phase-0.4-a-trust-correction-portability`
- Functional HEAD：`98c5ebe`
- 当前状态：功能代码完成；本地语法、单元、服务API、文件持久化、桌面/移动模拟浏览器和实际Node启动通过；用户Windows与真实OpenSSF/deps.dev/OSV未验收。
- 已完成：来源卡对比度；人工合并/拆分/主来源；IdentityStore；OpenSSF Scorecard；deps.dev映射；OSV Querybatch；TrustStore；事实/规则/本地AI/人工确认标签；可信度面板；Codex Trust上下文；完整备份导出与替换式导入；Codex研究包迁移；PWA缓存v9。
- 未完成：Windows真实Trust API；身份规则重启验收；完整备份恢复验收；冲突合并导入；软件包生态；项目对比器；MCP；云采集；长期增长。
- 当前阻塞：开发容器不能访问真实Trust上游；需要用户Windows验证。
- 禁止事项：不得称自动评分为安全认证；不得把无OSV结果写成无漏洞；不得批量轰炸免费API；不得静默覆盖数据；不得将Mock写成真实API通过。
- 已知问题和风险：三套公共数据覆盖不完整；规则分是本地启发式；导入后必须重启；人工规则可能随项目ID变化失效。
- 工作区/暂存/提交/标签/推送/合并：functional commit后clean；写README/AGENTS/交接后dirty；staged none；functional commit `98c5ebe`；tags none；not pushed，origin为本地0.3-C bundle；merge none。
- 测试：全部JS/MJS语法；identity store；自动阻断和人工合并；mock Scorecard/deps.dev/OSV；Trust缓存；完整备份恢复；History/Insights/Codex回归；Server API；桌面/390px；主来源样式；实际8110 Node、health、trust/backup/identity status与首页HTTP均通过；真实Trust上游未执行。
- 下一项唯一任务：Windows验收来源卡、人工纠错持久化、一个GitHub真实Trust审计和完整备份恢复，只修兼容问题。
- 关键文件：`identity-store.mjs`、`trust-store.mjs`、`trust-service.mjs`、`backup-service.mjs`、`server.mjs`、`app.js`、`styles.css`、测试与交接文件。

## 2026-07-29 — Phase 0.4-A.1 Windows launcher reliability hotfix
- 当前阶段：Phase 0.4-A.1 — Windows Launcher Reliability Hotfix
- 分支：`phase-0.4-a.1-launcher-fix`
- Functional HEAD：`31777f6`
- 当前状态：启动器热修代码完成；Phase 0.4-A主程序回归通过；Windows双击尚未验收。
- 已完成：新增`START-OPENRADAR.bat`；重写`start-openradar.cmd`；新增`run-openradar-server.cmd`；路径与Node检查；延迟打开浏览器；错误窗口保留；退出码与端口提示；ASCII命令与CRLF；README说明。
- 未完成：Windows双击、SmartScreen/MOTW、Phase 0.4-A真实Trust/Identity/Backup验收。
- 当前阻塞：开发容器无Windows CMD与SmartScreen。
- 禁止事项：不得把静态检查写成Windows通过；不得破坏0.4-A数据兼容；不得静默闪退；不得提前进入0.4-B。
- 已知问题和风险：下载ZIP可能需解除锁定；8080可能被旧服务占用；必须完整解压后运行。
- 工作区/暂存/提交/标签/推送/合并：functional commit `31777f6`；写交接后dirty；staged none；tags none；not pushed；merge none。
- 测试：8套Node测试全部通过；实际8111服务与health通过；三个启动器均为DOS batch ASCII CRLF；Windows双击未执行。
- 下一项唯一任务：用户完整解压修正版，从最外层双击`START-OPENRADAR.bat`并报告可见窗口结果。
- 关键文件：`START-OPENRADAR.bat`、`start-openradar.cmd`、`run-openradar-server.cmd`、`README.md`、交接文件。

## 2026-07-29 — Phase 0.4-A.1 user acceptance
- 当前阶段：Phase 0.4-A.1 — Windows Launcher Reliability Hotfix
- 分支：`phase-0.4-a.1-launcher-fix`
- HEAD：`009797f`（用户使用的已打包版本）
- 状态：用户Windows真实验收通过。外层双击启动器、来源卡对比度、人工设置Hugging Face主来源、可信度审计公开数据不足降级和完整备份JSON下载全部通过。
- 已完成：Windows启动器、人工主来源、Trust运行与降级、完整备份、原数据兼容。
- 未完成：软件包生态、项目对比器、MCP、云采集。
- 当前阻塞：无；公共Trust数据覆盖不足属于外部数据边界。
- 禁止事项：不得将无OpenSSF/OSV/deps.dev结果写成项目安全；不得把备份下载写成恢复流程已验收。
- 已知问题和风险：部分项目没有公开Trust记录；非软件包项目可能无法映射OSV。
- 工作区/暂存/提交/标签/推送/合并：用户机器Git状态未检查；开发HEAD `009797f`；tags none；not pushed；merge none。
- 测试：用户Windows截图确认启动、人工主来源、可信度面板与完整备份下载。
- 下一项唯一任务：Phase 0.4-B软件包生态雷达与多项目对比器。
- 关键文件：`START-OPENRADAR.bat`、`trust-service.mjs`、`backup-service.mjs`、`identity-store.mjs`、`app.js`。

## 2026-07-29 — Phase 0.4-B package ecosystem radar and comparator
- 当前阶段：Phase 0.4-B — Package Ecosystem Radar & Multi-Project Comparator
- 分支：`phase-0.4-b-package-ecosystem-comparator`
- Functional HEAD：`fd44b7f`
- 当前状态：功能代码完成；Node单元/服务回归、实际本地服务、桌面与390px模拟浏览器通过；用户Windows真实软件包API未验收。
- 已完成：npm、PyPI、crates.io适配；本地软件包API；软件包雷达；搜索和历史集成；强信号仓库合并；2至5项目对比；规则推荐；串行Trust审计；对比备份；PWA v10。
- 未完成：Windows真实三生态召回；真实限频字段；自然时间增长；更强归一化；依赖树；可调权重；MCP；云采集。
- 当前阻塞：开发容器npm/crates出站失败、PyPI无召回；需要用户Windows验证；长期增长需自然时间。
- 禁止事项：不得把PyPI辅助下载当官方数据；不得直接混比不同生态原始下载；不得把综合分写成安全/性能/法律结论；不得弱信号合并；不得将Mock写成真实API通过。
- 已知问题和风险：PyPI搜索召回可能较弱；开放数据源可能限频；下载指标口径不同；缺少Trust时对比使用中性分；首次刷新请求更多。
- 工作区/暂存/提交/标签/推送/合并：functional commit `fd44b7f`；交接提交后working tree clean；staged none；tags none；not pushed；origin为本地0.4-A.1 bundle；merge none。
- 测试：10套Node测试；软件包服务；对比器；Server三API；9平台桌面和390px移动端；实际8112服务、health、package status和index HTTP 200；真实上游未通过开发环境验证。
- 下一项唯一任务：用户用完整备份升级Phase 0.4-B，在Windows分别测试npm、PyPI、crates.io和2至5项目对比，只修真实兼容问题。
- 关键文件：`package-service.mjs`、`project-comparator.js`、`platform-adapters.js`、`server.mjs`、`app.js`、`index.html`、`styles.css`、四套新增/扩展测试与交接文件。

## 2026-08-11 — OSS-0P verified artifact takeover and public OSS foundation

- Current phase: OSS-0P — verified artifact takeover and public OSS foundation audit.
- Artifact: ZIP `open-source-radar-phase-0.4-b.zip`, 150,410 bytes, SHA-256 `4fcd03e483196bd48e3c47f4e8d7e53c9ee96c5d8b89fb75613b42a55341ce3d`, exact match. Bundle SHA-256 `915f1c9184623e2284859c270f3db8b6a5d0e6ac57bf7104ffd01c2212597df3`, `git bundle verify` passed.
- Git: recovered genuine Bundle history from `e60b3a0`; branch `oss/phase-0-public-readiness`; current committed HEAD before final handoff evidence `776c37b`; no tag, push, remote, merge, release, or public repository.
- Completed: artifact provenance; upstream/source ledger; license boundary audit; naming decision; public runtime risk register; English README entry; CONTRIBUTING/SECURITY/CODE_OF_CONDUCT/CHANGELOG/ROADMAP; Issue/PR templates; secret-free CI; local Node regression; in-app browser smoke; local HTTP and Codex export smoke.
- Tests: Node `v24.18.0` 10/10 suites passed; JavaScript syntax passed; bundled Python `3.12.13` syntax and JSON parsing passed; standalone `tests/browser_mock_test.py` not run because bundled Python lacks `playwright`; `git diff --check` passed.
- Windows live source smoke: in-app browser English query `http client` returned GitHub 12, Hugging Face 10, GitLab 12, ModelScope 1, Codeberg 0, PyPI 0; npm and crates.io unavailable; Gitee returned fallback-only. Local Node package endpoints independently returned npm 502, PyPI 200/0, crates.io 502; this is not full all-source acceptance.
- Known issues/risks: direct browser upstream calls lack public-beta rate-limit/cache/backoff hardening; package metrics differ by ecosystem; source/API terms need re-check before redistribution; no public maintenance/adoption evidence exists.
- Readiness: internal heuristic `50/100 — NO`; functionality is not the main gap, public maintenance/adoption evidence is.
- Workspace: final evidence updates to `HANDOFF.md`, `docs/PROJECT_STATE.json`, and this append-only log are unstaged and intentionally visible as dirty; generated Python cache was removed; no user runtime data was deleted.
- Unique next task: implement and verify public-beta rate-limit, cache, backoff, and degraded-mode hardening for direct upstream calls without exposing browser tokens.
