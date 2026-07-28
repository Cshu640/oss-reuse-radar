# AGENTS.md

## 开工前
1. 读取 `HANDOFF.md`、`docs/PROJECT_STATE.json`、`docs/HANDOFF_LOG.md` 最新记录和本文件。
2. 检查真实 Git branch、HEAD、working tree、staging、tag、push、merge 状态。
3. 优先审计可复用且许可证合适的开源项目，不得默认从零重写成熟能力。
4. 本地开发与用户验收必须优先使用 `node server.mjs`，因为静态服务器不提供Gitee同源兼容通道、历史快照或后台采集。

## 必须遵守
- 第一版付费 API 成本为零。
- 不得把代理潜力分描述成真实24小时、7天或30天涨幅。
- 真实增长必须来自 `data/history.json` 的历史样本；基线未达到阈值时必须显示“积累中”。
- 跨平台增长排序必须使用平台内百分位或其他归一化方法，不得直接混比Star、Like与Downloads原始增量。
- `data/history.json` 属于本地运行数据，不得提交到Git、打包进源码或误写成云端备份。
- 不得在前端暴露 GitHub Token、Supabase service role key 或模型 API key。
- 收藏是核心功能，重构不得导致数据静默丢失。
- 历史快照也是持久数据，修改schema前必须提供迁移或明确兼容策略。
- 正式采用第三方项目之前必须复核许可证与维护状态。
- Gitee已在Phase 0.2-B.2采用有止损降级：官方路径无结果时只能显示“外部搜索”，不得计入实时平台或增长；ModelScope已通过Windows真实验收。

## 任务结束前
更新 `HANDOFF.md`、`docs/PROJECT_STATE.json`，并向 `docs/HANDOFF_LOG.md` 追加历史记录，不覆盖旧记录。必须记录当前阶段、分支和HEAD、已完成、未完成、阻塞、禁止事项、已知风险、真实测试、工作区/暂存/提交/标签/推送/合并状态、下一项唯一任务和关键文件。不得把代码完成写成验收通过。
