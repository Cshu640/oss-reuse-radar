# OpenRadar Handoff

## 当前阶段
Phase 0.4-B — Package Ecosystem Radar & Multi-Project Comparator

## 分支和 HEAD
- Branch：`phase-0.4-b-package-ecosystem-comparator`
- Functional HEAD：`fd44b7f`
- 当前HEAD：包含本文件的交接提交；请以 `git rev-parse HEAD` 为准

## 当前状态
Phase 0.4-A.1已由用户在Windows真实环境验收：双击启动器、来源卡对比度、人工主来源、Trust降级和完整备份均通过。本阶段在此已验收基线上新增npm、PyPI、crates.io软件包生态雷达，以及2至5个代码仓库、模型和软件包的统一对比工作台。

代码、本地Mock、全部Node回归、桌面/390px模拟浏览器、实际Node服务和本地HTTP API均通过。开发容器无法稳定访问真实npm、crates.io及部分开放元数据上游，因此不能写成用户Windows或真实软件包API验收通过。

## 已完成
- npm官方搜索和月下载量适配
- PyPI项目JSON、ecosyste.ms开放元数据、PyPI搜索/精确包名与可用时pypistats辅助统计
- crates.io搜索、累计下载和近期下载适配
- 本地`/api/packages/status`、`/api/packages/search`、`/api/packages/radar`
- 软件包雷达首页、生态筛选、下载量/下游采用/更新时间排序
- 软件包加入现有跨平台搜索与历史采集
- 共享规范仓库URL的软件包/代码仓库保守合并
- 2至5个项目对比清单与`openradar:compare:v1`持久化
- 许可证、维护、真实采用、可信度、接入简易度和个人适配规则评分
- 对比页逐项串行可信度审计
- 卡片和详情页加入/移出对比
- 对比清单进入完整备份与恢复
- PWA缓存升级到v10
- Phase 0.4-A.1全部功能回归通过

## 未完成
- 用户Windows真实npm、PyPI、crates.io召回验收
- 三个软件包生态真实限频、网络和字段兼容验收
- 软件包真实24小时、7天、30天自然时间增长验收
- 跨生态下载量统计口径的更完整归一化
- 软件包详情中的依赖树、版本时间线与弃用提示
- 项目对比的人工权重调整和保存
- Codex MCP
- 云端无人值守采集

## 当前阻塞
- 开发容器外部网络对npm和crates.io请求失败，PyPI测试无召回，真实上游只能由用户Windows验证
- 历史增长需要自然时间积累，不能即时验收

## 禁止事项
- 不得把PyPI第三方下载统计描述为PyPI官方精确下载量
- 不得直接混比npm月下载、PyPI辅助下载和crates累计/近期下载并宣称全网增长最快
- 不得把项目对比综合分描述为性能基准、安全认证、法律结论或已完成接入测试
- 不得仅凭包名或描述相似合并软件包和代码仓库
- 不得并发轰炸Trust或软件包免费接口
- 不得破坏收藏、历史、Insights、Trust、Identity、Codex和完整备份兼容
- 不得将本地Mock写成真实Windows/API验收

## 已知问题和风险
- PyPI没有稳定的官方全文搜索与可靠官方下载量字段，召回可能依赖开放元数据、HTML或精确包名降级
- ecosyste.ms、pypistats和各注册表可能限频、反滥用或临时不可用
- 三个生态下载指标口径不同，当前仅作为采用度信号
- 对比评分是启发式规则；缺少Trust时使用中性分50
- 首次刷新会比旧版多访问三个软件包生态，低速网络下加载时间可能增加
- 软件包必须通过`node server.mjs`启动；静态服务器不能使用本地软件包API

## 测试
- 10套Node测试：10/10通过
- 新增`package_service_test.mjs`：npm/PyPI/crates映射、下载、缓存通过
- 新增`project_comparator_test.mjs`：事实提取、加权评分和推荐通过
- 扩展`server_test.mjs`：三条软件包API与health v0.4-B通过
- 桌面1440px模拟浏览器：9个平台、9个实体、软件包卡、2项目对比、13个对比维度通过
- 390px移动端：无横向溢出、原功能回归通过
- 全部JS/MJS语法与Manifest解析通过
- `git diff --check`通过
- 实际`PORT=8112 OPENRADAR_AUTO_COLLECT=0 node server.mjs`通过
- 实际`/api/health`、`/api/packages/status`、`index.html`均HTTP 200
- 真实上游试跑：开发容器npm/crates网络失败、PyPI无召回；未计为通过
- Windows真实软件包API与项目对比：未执行

## Git 状态
- Functional commit：`fd44b7f feat: add package ecosystem radar and project comparator`
- Working tree：clean
- Staged：none
- Tags：none
- Push：not pushed；origin为本地Phase 0.4-A.1 bundle
- Merge：none

## 下一项唯一任务
用户从Phase 0.4-A.1导出完整备份，完整解压并启动Phase 0.4-B；分别验证npm、PyPI、crates.io一个英文关键词搜索，选择2至5个项目进入对比页并运行一次“审计缺失项目”。只修复Windows真实API、字段、限频或界面兼容问题，不进入MCP或新平台。

## 关键文件
- `package-service.mjs`
- `project-comparator.js`
- `platform-adapters.js`
- `project-identity.js`
- `server.mjs`
- `app.js`
- `index.html`
- `styles.css`
- `sw.js`
- `tests/package_service_test.mjs`
- `tests/project_comparator_test.mjs`
- `tests/server_test.mjs`
- `tests/browser_mock_test.py`
- `AGENTS.md`
- `HANDOFF.md`
- `docs/PROJECT_STATE.json`
- `docs/HANDOFF_LOG.md`
