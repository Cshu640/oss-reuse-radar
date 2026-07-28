# OpenRadar Handoff

## 当前阶段
Phase 0.3-B — Local Chinese Plain-Language Insights

## 分支和 HEAD
- Branch：`phase-0.3-b-local-insights`
- Functional HEAD：`0812d3d`
- 当前 HEAD：交接提交后需再次同步

## 当前状态
Phase 0.3-B功能代码已经完成。OpenRadar现在为每个项目卡提供不调用模型的中文规则摘要；用户点击“中文解读”后，本地Node服务会检测Windows后台Ollama与`qwen3:4b`，按需读取安全范围内的公开README节选，通过结构化JSON生成完整中文分析，并保存到`data/insights.json`。项目相关元数据未变化时直接读取缓存，不重复占用GPU。

本地AI采用串行队列，一次只生成一个项目；请求使用`stream: false`、`think: false`、低温度、4096上下文，并通过`keep_alive: 0`在生成后立即释放模型。Ollama未运行、模型缺失或生成失败时，项目仍显示规则摘要，不影响雷达、收藏和历史快照。

Phase 0.3-A已由用户在Windows确认“都可以用了”，因此本地历史运行链路已获用户验收；但真实24小时、7天和30天增长仍需自然时间，不能提前标记完成。

Phase 0.3-B已通过本地单元、HTTP、实际Node启动、离线降级与模拟浏览器测试，但尚未在用户Windows真实调用`qwen3:4b`，不得写成用户验收通过。

## 已完成
- 每个项目卡自动显示免费规则中文摘要
- “适配分析”按钮改为“中文解读”
- 中文解读大弹窗
- 结构化字段：用途、适合人群、接入方式、商业许可、运行门槛、Codex价值、用户适配、风险、建议
- `insight-store.mjs`零依赖本地缓存
- 本地缓存文件`data/insights.json`
- 缓存原子写入
- 项目元数据SHA-256指纹
- 项目未更新时复用AI缓存
- 强制重新生成功能
- `insight-service.mjs`
- Ollama `GET /api/tags`状态与模型检测
- 默认模型`qwen3:4b`
- 本地API默认地址`http://127.0.0.1:11434`
- Ollama结构化JSON Schema输出
- `stream: false`
- `think: false`
- `temperature: 0`
- `num_ctx: 4096`
- `num_predict: 900`
- `keep_alive: 0`
- 单任务串行生成队列
- README最多约7000字符
- GitHub公开README读取
- Hugging Face公开README读取
- GitLab公开README尝试
- Codeberg公开README尝试
- Gitee与ModelScope公开README安全回退尝试
- 无README时降低置信度
- Ollama不可用时规则摘要降级
- 观察名单页面增加Ollama与缓存状态
- `GET /api/insights/status`
- `GET /api/insights`
- `POST /api/insights/generate`
- Service Worker缓存升级到v7
- 雷达缓存升级到v7
- 收藏键继续保持`openradar:favorites:v1`
- 历史文件schema和主链路未改动

## 未完成
- 用户Windows真实运行Phase 0.3-B
- 用户确认页面显示“Ollama已连接 · 按需生成”
- 用户使用真实`qwen3:4b`完成至少两个平台的解读
- 用户确认`data/insights.json`真实创建并写入
- 用户确认第二次打开同项目读取缓存而不重新生成
- 真实README读取在各平台的成功率统计
- AI解读人工编辑与纠错
- 收藏项目可选批量生成
- 自动前20名生成（当前明确不做，防止资源占用）
- 自然时间24小时、7天、30天增长验收
- 跨平台同项目身份去重
- 历史与解读数据导出、备份和迁移
- 云端无人值守采集
- ecosyste.ms、npm、PyPI等软件包生态
- Hacker News等外部信号
- Codex MCP Server
- 生产部署

## 当前阻塞
- 需要用户Windows真实Ollama环境验证`qwen3:4b`结构化输出、生成速度和资源行为
- 真实历史周期仍需要自然时间积累

## 禁止事项
- 不得把本地模拟的Ollama返回写成用户真实生成通过
- 不得自动批量生成全部项目
- 不得并发调用多个本地模型任务
- 不得把规则摘要标成AI摘要
- 不得在README或元数据不足时编造安装、硬件、成熟度或许可证结论
- 不得把AI许可证描述写成法律意见
- 不得把代理潜力分写成真实增长
- 不得在历史基线不足时显示伪造涨幅
- 不得直接混比不同平台原始Star、Like与Downloads增量
- 不得将Gitee外部搜索计入实时平台或增长
- 不得提交或打包用户运行产生的`data/history.json`或`data/insights.json`
- 不得修改收藏键`openradar:favorites:v1`
- 不得暴露Token或加入付费API

## 已知问题和风险
- 首次加载`qwen3:4b`可能需要几十秒
- 小模型可能误判项目成熟度、运行门槛或商业价值
- 结构化输出虽然有Schema约束，真实模型仍可能偶发返回错误
- README读取依赖公开路径和匿名API，可能限频或因默认分支/文件名不同失败
- GitLab、Codeberg、Gitee、ModelScope的README路径兼容度需要实机验证
- 未取得README时结论仅基于项目元数据
- `keep_alive: 0`节省显存，但连续分析多个项目时每次重新加载模型会更慢
- 服务器关闭时无法生成AI解读，但规则摘要仍可用
- `data/insights.json`删除后AI缓存会丢失
- localStorage清除仍会丢收藏，应继续导出JSON
- 本地历史在电脑睡眠、关机或终端关闭时存在缺口
- 候选池不是全网全量
- 跨平台镜像尚未去重

## 测试
- `node --check app.js`：通过
- `node --check platform-adapters.js`：通过
- `node --check server.mjs`：通过
- `node --check history-store.mjs`：通过
- `node --check insight-store.mjs`：通过
- `node --check insight-service.mjs`：通过
- `node --check sw.js`：通过
- `node tests/history_store_test.mjs`：通过
- `node tests/insight_service_test.mjs`：通过
  - Ollama状态与`qwen3:4b`检测
  - 结构化Schema请求
  - README节选
  - AI结果持久化
  - 缓存复用
  - 强制重新生成
  - Ollama离线规则降级
- `node tests/server_test.mjs`：通过
  - `/api/insights/status`
  - `/api/insights`
  - `/api/insights/generate`
  - 原历史与Gitee路线回归
- `python3 tests/browser_mock_test.py`：通过
  - 项目卡规则摘要
  - 桌面中文解读弹窗
  - 本地AI字段呈现
  - 390px移动端
  - 无横向溢出
  - 收藏v1兼容
- `PORT=8098 OPENRADAR_AUTO_COLLECT=0 node server.mjs`：实际启动通过
- 实际`GET /api/health`：HTTP 200，version `0.3-B`
- 实际无Ollama环境`GET /api/insights/status`：正常返回不可用状态
- 实际无Ollama环境`POST /api/insights/generate`：正常返回规则摘要
- 实际首页：HTTP 200
- Manifest JSON解析：通过
- `git diff --check`：通过
- 用户Windows真实Ollama生成：未验收

## Git 状态
- Working tree：dirty，仅README、AGENTS与交接文件
- Staged：none
- Functional commit：`0812d3d feat: add local Chinese project insights`
- Tags：none
- Push：not pushed；origin仍指向本地bundle
- Merge：none

## 下一项唯一任务
用户在Windows解压Phase 0.3-B，继续使用`start-openradar.cmd`或`node server.mjs`启动。进入“观察名单”确认Ollama与`qwen3:4b`已连接；分别选择一个GitHub项目和一个Hugging Face或ModelScope项目，点击“中文解读”，确认真实中文输出、`data/insights.json`创建、第二次打开使用缓存。只修复真实Windows/Ollama、README读取或结构化输出兼容问题；验收前不得进入自动批量生成或Codex MCP。

## 关键文件
- `insight-store.mjs`：缓存schema、持久化和读取
- `insight-service.mjs`：Ollama检测、README读取、Prompt、Schema、降级与队列
- `server.mjs`：Insights API与本地服务启动
- `app.js`：规则摘要、弹窗、生成和缓存加载
- `index.html`：Ollama状态面板和解读弹窗
- `styles.css`：规则摘要和解读界面
- `data/.gitkeep`
- `.gitignore`
- `tests/insight_service_test.mjs`
- `tests/server_test.mjs`
- `tests/browser_mock_test.py`
- `README.md`
- `AGENTS.md`
- `docs/PROJECT_STATE.json`
- `docs/HANDOFF_LOG.md`
