# OpenRadar Handoff

## 当前阶段
Phase 0.3-A — Local Historical Snapshot Foundation

## 分支和 HEAD
- Branch：`phase-0.3-a-local-history`
- Functional HEAD：`dc554a8`
- 当前 HEAD：交接提交后需再次同步

## 当前状态
Phase 0.3-A 功能代码已完成。OpenRadar现在在 `node server.mjs` 运行期间启动即采集五个真实平台，并每6小时进行一次后台采集；浏览器刷新雷达时也会补充快照。历史数据以零依赖本地JSON保存，只有基线跨度达到阈值后才显示真实24小时、7天与30天增长，否则明确显示“积累中”。跨平台排序使用各平台内部增长百分位，不直接混比Star、Like与Downloads原始增量。

Gitee已完成一次有止损线的精准修复：v5 API、官方搜索页与公开探索页均保留诊断；全部官方路径无结果时正式降级为“外部搜索”，不计入实时平台或历史增长，也不再阻塞主线。

本阶段通过本地单元、HTTP、真实Node启动和Chromium模拟验证，但尚未由用户在Windows真实运行Phase 0.3-A，因此不得写成用户验收通过。

## 已完成
- 新增零依赖 `history-store.mjs`
- 本地历史文件：`data/history.json`
- 历史文件原子写入与约400天保留
- 每项目Stars、Forks、Likes、Downloads样本
- 相同指标约5.5小时去重；指标变化最短30分钟记录
- `server.mjs`启动即采集五个平台
- 本地服务器运行期间每6小时自动采集
- 单个平台采集失败隔离
- 浏览器刷新雷达时补充快照
- `GET /api/history/status`
- `GET /api/history/growth`
- `POST /api/history/capture`
- `POST /api/history/collect`
- 24小时基线约20小时后启用
- 7天基线约6天后启用
- 30天基线约25天后启用
- 项目卡显示真实原始指标增量与实际覆盖时长
- 未达到基线时显示“积累中”
- 未纳入历史时显示“尚未追踪”
- 静态模式显示“历史未启用”
- 跨平台历史榜按平台内部增长百分位排序
- “观察名单与真实增长”状态面板
- 手动“立即采集一次”按钮
- Gitee三段官方路径诊断与external-search止损
- Gitee降级不计入实时平台和历史增长
- Service Worker与雷达缓存升级
- 收藏键继续保持 `openradar:favorites:v1`
- `data/history.json`已加入 `.gitignore`

## 未完成
- 用户Windows真实运行Phase 0.3-A
- 用户确认 `data/history.json`真实创建并写入
- 用户确认后台采集状态与手动采集按钮
- 等待实际时间形成首个24小时真实增长基线
- 云端无人值守采集
- 收藏项目优先追踪
- 跨平台同项目身份去重
- 历史数据导出、备份与迁移
- ecosyste.ms、npm、PyPI等软件包生态
- Hacker News等外部热点信号
- 云端收藏同步
- Codex MCP Server
- 生产部署

## 当前阻塞
- 需要用户Windows使用 `node server.mjs` 或 `start-openradar.cmd` 验证真实文件写入和五平台后台采集
- 24小时、7天与30天真实数值必须等待自然时间积累，不能在当前任务中伪造验收

## 禁止事项
- 不得把首次快照写成已有24小时增长
- 不得把代理潜力分写成真实增长
- 不得在基线未就绪时显示伪造涨幅
- 不得直接混比不同平台原始Star、Like与Downloads增量
- 不得把Gitee外部搜索入口计入实时平台或历史增长
- 不得提交或打包用户运行产生的 `data/history.json`
- 不得修改历史schema而不提供迁移或兼容策略
- 不得在前端暴露GitHub、Gitee、Supabase或模型平台密钥
- 不得加入付费API
- 不得破坏 `openradar:favorites:v1`
- 不得把本地测试写成用户Windows验收通过

## 已知问题和风险
- 本地服务器关闭期间不会自动采集
- 用户电脑睡眠、关机或终端关闭会形成历史缺口
- 当前候选池不是全网全量，增长榜仅覆盖OpenRadar追踪项目
- 匿名公共API可能限频或临时失败
- 项目离开候选池后可能出现稀疏历史
- 首次24小时榜最快也需等待约20小时
- Gitee仍可能只显示外部搜索入口
- 跨平台镜像尚未去重
- 自动分类、许可证与用途判断仍需人工复核
- localStorage清除会丢收藏；应继续导出JSON

## 测试
- `node --check app.js`：通过
- `node --check platform-adapters.js`：通过
- `node --check server.mjs`：通过
- `node --check history-store.mjs`：通过
- `node --check sw.js`：通过
- `node tests/history_store_test.mjs`：通过
  - 24小时真实delta
  - 7天真实delta
  - 30天真实delta
  - Fork delta
  - 文件持久化与重载
  - 五平台采集器成功/失败隔离模拟
- `node tests/server_test.mjs`：通过
  - Gitee v5、官方搜索、Explore与external-search止损
  - `/api/health`
  - `/api/history/capture`
  - `/api/history/status`
  - `/api/history/growth`
  - `/api/history/collect`
  - 静态首页HTTP 200
- `python3 tests/browser_mock_test.py`：通过
  - 六来源状态呈现
  - 中文搜索
  - 本地历史状态
  - 项目卡“积累中”
  - 桌面端与390px移动端
  - 无横向溢出
  - 收藏键兼容
- `PORT=8097 OPENRADAR_AUTO_COLLECT=0 node server.mjs`：实际启动通过
- 实际 `/api/health`：HTTP 200，version `0.3-A`
- 实际 `/api/history/status`：HTTP 200
- 实际首页：HTTP 200
- Manifest JSON解析：通过
- `git diff --check`：通过
- 真实外部五平台后台采集：开发容器未验证
- 用户Windows Phase 0.3-A：未验收

## Git 状态
- Working tree：dirty，仅README、AGENTS与交接文件
- Staged：none
- Functional commit：`dc554a8 feat: add local historical snapshots`
- Gitee stop-loss commits：`55d0c70`、`51f9f09`
- Tags：none
- Push：not pushed；origin仍指向本地Phase 0.1 bundle
- Merge：none

## 下一项唯一任务
用户在Windows解压Phase 0.3-A，使用 `start-openradar.cmd` 或 `node server.mjs` 启动；验证终端出现History启动信息、页面“观察名单与真实增长”显示项目/样本数，并确认目录生成 `data/history.json`。只修复真实Windows文件写入、采集接口或UI兼容问题；在该验收完成前不得宣称历史系统正式验收通过。

## 关键文件
- `history-store.mjs`：历史schema、持久化、保留、基线与delta
- `server.mjs`：历史API、启动采集、六小时调度、Gitee止损
- `platform-adapters.js`：五平台采集与Gitee受限状态
- `app.js`：历史同步、真实增长排序与UI
- `index.html`：增长榜标签与历史状态面板
- `styles.css`：增长与历史面板样式
- `data/.gitkeep`
- `.gitignore`
- `tests/history_store_test.mjs`
- `tests/server_test.mjs`
- `tests/browser_mock_test.py`
- `README.md`
- `AGENTS.md`
- `docs/PROJECT_STATE.json`
- `docs/HANDOFF_LOG.md`
