# OpenRadar Handoff

## 当前阶段
Phase 0.3-C — Cross-Platform Identity, Unified Details & Codex Research Packets

## 分支和 HEAD
- Branch：`phase-0.3-c-dedup-details-codex`
- Functional HEAD：`2c70561`
- 当前 HEAD：交接提交后需再次同步最终状态指针

## 当前状态
Phase 0.3-C功能代码已经完成。用户已在Windows真实环境确认Phase 0.3-B“全部验收通过”，因此本地Ollama、`qwen3:4b`中文解读、缓存复用、历史快照和收藏兼容均可作为已验收基线；Phase 0.3-C仍未在用户Windows验收。

本阶段新增保守型跨平台项目身份图谱。OpenRadar会在同作者/组织与项目名完全一致、项目显式互相链接或共享规范项目URL时合并来源；仅名称、简介、Topic或技术栈相似不会自动合并。合并实体保留全部原始来源、平台指标、许可证和历史ID，主来源按平台优先级与元数据质量选择。

项目卡可进入独立统一详情页，展示统一中文情报、全部平台来源、每个来源的指标和历史状态、许可证差异、用途类型及合并原因。收藏键仍为`openradar:favorites:v1`，历史与解读缓存仍通过原始项目ID兼容。

详情页新增“一键交给Codex研究”。当前实现会生成、保存并复制一份研究任务，而不会自动启动Codex、选择仓库、运行命令或消耗额度。本地Node模式将文件写入`exports/codex/<时间-项目名>/RESEARCH_TASK.md`和`project-context.json`；静态模式仅在浏览器生成并复制Markdown。任务强制要求只研究不集成、读取项目交接、检查Git、核验身份/许可证/维护/安全/运行门槛/替代方案，并在结束时更新机器可读交接。

本阶段已通过身份合并、Codex导出、服务器API、现有历史/Insights回归、桌面详情页、390px移动端、实际Node启动与真实文件写入测试，但用户Windows尚未验收，不得写成Phase 0.3-C已验收。

## 已完成
- `project-identity.js`跨平台身份信号和实体合并
- 同作者/项目名强信号合并
- 项目显式互链与共享规范URL合并
- 仅同名不同作者禁止合并
- GitHub优先的主来源选择与元数据质量排序
- 每个实体保留aliases、sourceProjects、sourcePlatforms、licenseVariants、languages和dedupReasons
- 首页显示项目实体数与已合并重复来源数
- 搜索结果显示实体数量和合并来源数量
- 平台筛选支持实体任一来源
- 历史追踪继续使用全部原始来源ID
- 中文解读缓存通过实体所有alias查找
- 收藏通过实体重叠关系兼容旧项目ID
- 项目卡多来源徽标与“已合并N个来源”
- 独立统一项目详情页
- 本地Hash详情路由
- 各平台来源卡、指标、许可证和增长状态
- 统一中文情报与现有Ollama解读复用
- 详情页收藏、分享与中文解读入口
- `codex-packet.js`研究任务和机器上下文生成
- `codex-export-service.mjs`本地安全导出
- `GET /api/codex/status`
- `POST /api/codex/export`
- `exports/codex/.gitkeep`与运行文件忽略规则
- Codex研究任务自动复制和Markdown下载
- 静态模式浏览器研究提示词降级
- Codex任务强制研究、不集成、Git/交接/许可证/安全/替代方案审计
- Service Worker缓存升级到v8
- 雷达缓存升级到v8
- README新增数据迁移说明
- Phase 0.3-B用户验收事实记录

## 未完成
- 用户Windows真实运行Phase 0.3-C
- 用户确认真实项目卡出现跨平台合并
- 用户确认统一详情页所有来源正确
- 用户确认`exports/codex/`真实写入两个文件
- 用户将研究任务粘贴到Codex后的可用性验收
- 自动启动Codex或自动绑定当前仓库
- Codex MCP Server
- 去重人工拆分/合并纠错界面
- 作者名变化、组织迁移、无互链镜像和模型配套仓库的进一步关联
- 跨平台Fork、量化版、衍生版和同项目家族图谱
- 历史与解读数据一键导出、导入和自动迁移
- 云端无人值守采集
- 收藏项目爆发提醒
- ecosyste.ms、npm、PyPI等软件包生态
- Hacker News等外部信号
- 自然时间7天和30天增长最终验收
- 生产部署

## 当前阻塞
- Phase 0.3-C需要用户Windows Edge与本地Node真实验收
- 跨平台身份没有统一官方全局ID，保守规则必然存在漏合并
- 自然时间7天和30天榜仍需继续积累

## 禁止事项
- 不得仅凭项目名称、简介、Topic、语言或热度自动合并
- 不得将Fork、量化版、第三方镜像或配套模型强行当作同一项目
- 不得丢弃任何原始来源ID、URL、指标、许可证或历史序列
- 不得把去重结果描述成已人工确认的官方身份关系
- 不得把生成研究任务写成Codex已经完成研究
- 不得自动启动Codex、自动执行研究、选择仓库或消耗额度
- 不得让Codex研究任务直接修改或集成当前项目
- 不得提交或打包`exports/codex/*`运行文件
- 不得提交或打包`data/history.json`和`data/insights.json`
- 不得修改收藏键`openradar:favorites:v1`
- 不得把代理潜力分描述成真实增长
- 不得在历史基线不足时伪造24小时、7天或30天涨幅
- 不得直接混比不同平台原始Star、Like与Downloads增量
- 不得将Gitee外部搜索计入实时平台或增长
- 不得暴露Token或加入付费API

## 已知问题和风险
- 相同作者与项目名通常是强信号，但极少数情况下仍可能误合并
- 作者/组织不同且没有显式互链的官方镜像会漏合并
- GitHub仓库与不同命名的Hugging Face/ModelScope配套模型可能仍分开显示
- 统一详情Hash依赖当前候选池已经加载，不是公网永久详情链接
- 跨平台许可证可能不一致，详情只展示差异，不自动给法律结论
- 研究包可能包含AI初筛内容，Codex必须重新验证而不能直接信任
- 当前“一键”仍需用户手动切换到Codex并粘贴
- `exports/codex/`持续生成会占少量硬盘，需要用户按需清理
- 新版本解压到新目录时必须手工复制`data/history.json`和`data/insights.json`
- localStorage清除仍会丢收藏，应继续导出JSON
- 本地服务器关闭、电脑睡眠或关机时历史存在缺口
- 候选池不是全网全量

## 测试
- `node --check app.js`：通过
- `node --check platform-adapters.js`：通过
- `node --check project-identity.js`：通过
- `node --check codex-packet.js`：通过
- `node --check codex-export-service.mjs`：通过
- `node --check server.mjs`：通过
- `node --check history-store.mjs`：通过
- `node --check insight-store.mjs`：通过
- `node --check insight-service.mjs`：通过
- `node --check sw.js`：通过
- Manifest JSON解析：通过
- `node tests/history_store_test.mjs`：通过
- `node tests/insight_service_test.mjs`：通过
- `node tests/project_identity_test.mjs`：通过
  - GitHub、Hugging Face、ModelScope三来源合并
  - 显式仓库URL关联
  - 仅同名不同作者不合并
  - 主来源选择
  - 实体别名和去重统计
- `node tests/codex_export_test.mjs`：通过
  - Markdown和JSON上下文
  - 强制交接与只研究不集成
  - 安全文件路径
  - `autoLaunch: false`
- `node tests/server_test.mjs`：通过
  - 原Gitee、历史、Insights路线回归
  - `/api/codex/status`
  - `/api/codex/export`
  - 真实临时目录文件写入
- `python3 tests/browser_mock_test.py`：通过
  - 六平台8条原始来源合并为6个项目实体
  - 3来源统一详情页
  - 中文解读回归
  - Codex研究包生成、复制和结果展示
  - 390px移动端与无横向溢出
  - 收藏v1兼容
- `PORT=8099 OPENRADAR_AUTO_COLLECT=0 node server.mjs`：实际启动通过
- 实际`GET /api/health`：HTTP 200，version `0.3-C`，codexExport true
- 实际`GET /api/codex/status`：HTTP 200，autoLaunch false
- 实际`POST /api/codex/export`：成功写入Markdown和JSON文件
- 实际首页：HTTP 200
- `git diff --check`：通过
- 用户Windows Phase 0.3-C：未验收

## Git 状态
- Working tree：功能提交后clean；写README、AGENTS与交接后dirty
- Staged：none
- Functional commit：`2c70561 feat: add unified project profiles and Codex research packets`
- Tags：none
- Push：not pushed；origin仍指向本地Phase 0.3-A bundle
- Merge：none

## 下一项唯一任务
用户在Windows将旧版`data/history.json`和`data/insights.json`复制到Phase 0.3-C新版，使用`start-openradar.cmd`启动；搜索或刷新后确认至少一个多来源项目实体，打开统一详情页，核对来源，再点击“生成并复制研究任务”，确认`exports/codex/`产生Markdown和JSON。只修复真实Windows去重、详情路由、收藏/缓存兼容或文件导出问题；验收前不进入MCP、自动启动Codex或云端部署。

## 关键文件
- `project-identity.js`：规范URL、身份信号、并查集合并、实体别名和统计
- `codex-packet.js`：Codex研究任务和机器上下文
- `codex-export-service.mjs`：本地安全导出服务
- `server.mjs`：Codex API、本地服务和既有历史/Insights/Gitee路线
- `app.js`：实体状态、卡片、详情路由、收藏兼容和Codex交互
- `platform-adapters.js`：homepage、repositoryUrl与relatedUrls元数据
- `index.html`：详情视图与实体指标
- `styles.css`：统一详情和Codex研究包界面
- `sw.js`：PWA缓存v8
- `exports/codex/.gitkeep`
- `.gitignore`
- `tests/project_identity_test.mjs`
- `tests/codex_export_test.mjs`
- `tests/server_test.mjs`
- `tests/browser_mock_test.py`
- `README.md`
- `AGENTS.md`
- `docs/PROJECT_STATE.json`
- `docs/HANDOFF_LOG.md`
