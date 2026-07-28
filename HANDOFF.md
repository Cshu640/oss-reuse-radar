# OpenRadar Handoff

## 当前阶段
Phase 0.2-B.2 — Bounded Gitee Repair & Stop-Loss

## 分支和 HEAD
- Branch：`phase-0.2-b.2-gitee-stoploss`
- Functional HEAD：`55d0c70`
- 当前 HEAD：`55d0c70`（交接提交前）

## 当前状态
已完成一次有止损线的Gitee精准修复：保留v5 API与官方搜索解析，再为首页雷达增加Gitee公开探索页作为第三条官方路径；每次请求输出结构化诊断。三条官方路径仍无项目时，不再显示红色故障，也不再无限追逐不稳定内部接口，而是明确降级为“外部搜索”入口，不进入实时榜单或后续增长统计。其他五个平台未改动。

## 已完成
- Gitee v5 API → 官方搜索 → 公开探索页的有界链路
- 首页雷达允许探索页回退；关键词搜索保持语义准确，不用无关探索项目冒充结果
- 返回并打印v5、官方搜索、探索页各自状态与项目数量
- 全部官方路径为空时返回 `gitee-external-search`
- 前端将止损结果显示为黄色“外部搜索”，而非红色“不可用”
- 直接前往Gitee搜索的入口继续保留
- 五个平台实时数据不受Gitee影响
- Gitee不参与实时榜单和增长统计，除非未来真正返回项目
- 收藏键保持 `openradar:favorites:v1`

## 未完成
- 用户Windows对Gitee探索页或外部搜索标签的真实验收
- Gitee稳定项目数据
- 历史快照与真实24小时/7天/30天增长
- 云端无人值守采集、跨平台去重、软件包生态、MCP、生产部署

## 当前阻塞
- 无；Gitee已按产品止损规则降级，不再阻塞主线

## 禁止事项
- 不得再次让Gitee阻塞历史快照主线
- 不得将外部搜索入口计作实时平台或增长数据
- 不得用探索页项目冒充关键词搜索结果
- 不得暴露Token、加入付费API或开放任意代理
- 不得把代理潜力分写成真实涨幅
- 不得破坏收藏键

## 已知问题和风险
- Gitee探索页仍可能动态渲染并返回零项目；此时会自动止损
- Gitee内部接口未采用，因为其稳定性与公开契约不可验证
- 前端旧PWA缓存可能需要关闭重开或Ctrl+F5

## 测试
- 四个JS/MJS语法检查：通过
- `node tests/server_test.mjs`：通过
- v5成功、official-search回退、Explore回退、external-search止损：通过
- 健康接口版本与Gitee模式：通过
- `git diff --check`：通过
- 用户Windows真实探索页：未运行

## Git 状态
- Working tree：dirty，仅交接文件
- Staged：none
- Functional commit：`55d0c70 fix: bound gitee fallback with stop-loss`
- Tags：none
- Push：not pushed
- Merge：none

## 下一项唯一任务
Phase 0.3-A：为五个真实平台建立零依赖本地历史快照。`server.mjs`运行期间启动即采集、每6小时后台采集；本地保存有限历史；前端只在基线时间足够时显示真实24小时/7天/30天增长，否则明确显示“积累中”。

## 关键文件
- `server.mjs`
- `platform-adapters.js`
- `app.js`
- `tests/server_test.mjs`
- `docs/PROJECT_STATE.json`
- `docs/HANDOFF_LOG.md`
