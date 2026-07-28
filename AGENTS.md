# AGENTS.md

## 开工前
1. 读取 `HANDOFF.md`、`docs/PROJECT_STATE.json`、`docs/HANDOFF_LOG.md` 最新记录和本文件。
2. 检查真实 Git branch、HEAD、working tree、staging、tag、push、merge 状态。
3. 优先审计可复用且许可证合适的开源项目，不得默认从零重写成熟能力。

## 必须遵守
- 第一版付费 API 成本为零。
- 不得把代理潜力分描述成真实24小时或7天涨幅。
- 不得在前端暴露 GitHub Token、Supabase service role key 或模型 API key。
- 收藏是核心功能，重构不得导致数据静默丢失。
- 正式采用第三方项目之前必须复核许可证与维护状态。
- Gitee 与 ModelScope 在用户真实浏览器验收前必须保持“实验”标识；模拟返回通过不得写成真实接口通过。

## 任务结束前
更新 `HANDOFF.md`、`docs/PROJECT_STATE.json`，并向 `docs/HANDOFF_LOG.md` 追加历史记录，不覆盖旧记录。必须记录当前阶段、分支和HEAD、已完成、未完成、阻塞、禁止事项、已知风险、真实测试、工作区/暂存/提交/标签/推送/合并状态、下一项唯一任务和关键文件。不得把代码完成写成验收通过。
