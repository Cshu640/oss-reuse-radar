# AGENTS.md

## 开工前
1. 读取 `HANDOFF.md`、`docs/PROJECT_STATE.json`、`docs/HANDOFF_LOG.md` 最新记录和本文件。
2. 检查真实 Git branch、HEAD、working tree、staging、tag、push、merge 状态。
3. 优先审计可复用且许可证合适的开源项目，不得默认从零重写成熟能力。
4. 本地开发与用户验收必须优先使用 `node server.mjs`，因为静态服务器不提供Gitee同源兼容、历史快照、后台采集或Ollama中文解读。

## 必须遵守
- 第一版付费 API 成本为零。
- 不得把代理潜力分描述成真实24小时、7天或30天涨幅。
- 真实增长必须来自 `data/history.json`；基线未达到阈值时必须显示“积累中”。
- 跨平台增长排序必须使用平台内百分位或其他归一化方法，不得直接混比Star、Like与Downloads原始增量。
- `data/history.json` 和 `data/insights.json` 都属于本地运行数据，不得提交到Git或打包进源码。
- 收藏键 `openradar:favorites:v1` 是兼容底线，重构不得导致收藏静默丢失。
- 修改历史或解读缓存schema前必须提供迁移或明确兼容策略。
- 不得在前端暴露 GitHub Token、Supabase service role key、Ollama云端密钥或其他模型API密钥。
- Gitee已采用止损降级：官方路径无结果时只能显示“外部搜索”，不得计入实时平台或增长。
- ModelScope已通过Windows真实验收。

## 本地AI约束
- 默认模型为 `qwen3:4b`，默认地址为 `http://127.0.0.1:11434`。
- 所有项目必须先有无需模型的规则摘要，Ollama故障不得导致项目卡空白。
- 不得打开页面后批量生成全部项目；只有用户点击“中文解读”或明确要求批量处理时才调用模型。
- 默认串行生成，一次只处理一个项目，避免显存和CPU争抢。
- 模型请求必须设置 `stream: false`、结构化JSON输出、低温度和合理上下文上限。
- 默认使用 `keep_alive: 0`，生成结束后释放模型资源。
- README或项目元数据未取得时必须降低置信度，禁止编造安装、硬件、成熟度或许可证结论。
- AI许可证说明只能是风险提示，不得写成法律结论。
- 项目未发生相关元数据变化时应复用 `data/insights.json`，不得重复消耗本地算力。
- 本地AI失败时可以返回规则摘要，但不得将规则摘要标记为“本地AI已生成”。

## 任务结束前
更新 `HANDOFF.md`、`docs/PROJECT_STATE.json`，并向 `docs/HANDOFF_LOG.md` 追加历史记录，不覆盖旧记录。必须记录：
- 当前阶段
- 分支和HEAD
- 已完成、未完成、阻塞
- 禁止事项
- 已知问题和风险
- 真实测试结果
- 工作区、暂存、提交、标签、推送、合并状态
- 下一项唯一任务
- 关键文件位置

不得把代码完成写成用户验收通过，不得把本地模拟写成真实Windows/Ollama验收。
