# OpenRadar Handoff

## 当前阶段
Phase 0.2-B.1 — Gitee Browser Compatibility Fallback（用户真实验收完成，回退仍为空）

## 分支和 HEAD
- Branch：`phase-0.2-b.1-gitee-fallback`
- Functional HEAD：`6a8996d`
- 当前 HEAD：`8798291`（本次用户验收记录提交前）

## 当前状态
用户已在 Windows Edge 使用 `node server.mjs` 启动本地兼容服务，页面与其余五个平台正常。真实查询 `project management`、`vue`、`若依` 均证明：Gitee v5 API 返回空数组；服务随后进入 `gitee-official-search` 回退，但动态搜索页面解析仍得到零项目。故本地代理、路由和回退切换已验收，Gitee项目数据交付未通过。

## 已完成
- Windows真实启动 `node server.mjs` 与本地兼容服务
- GitHub、Hugging Face、GitLab、Codeberg、ModelScope继续真实可用
- Gitee同源路由真实可访问
- Gitee v5空结果真实确认
- Gitee官方搜索回退真实触发确认
- 三组广泛关键词排除“关键词过窄”：`project management`、`vue`、`若依`
- 收藏、中文搜索、办公/生活分类保持正常

## 未完成
- Gitee从官方路径返回真实仓库项目
- Gitee动态搜索数据接口的稳定接入
- Gitee失败后的正式止损呈现
- 跨平台身份去重
- 历史快照数据库与真实24小时/7天/30天增长
- 软件包生态、外部热点、云收藏、Codex MCP、生产部署

## 当前阻塞
- Gitee v5仓库搜索对广泛关键词真实返回空数组
- `so.gitee.com` 为动态页面，当前服务器HTML解析仅取得页面外壳或无仓库数据
- 开发容器无法访问Gitee网络，不能直接检查其动态请求

## 禁止事项
- 不得继续让用户重复测试相同关键词
- 不得将Gitee回退触发写成Gitee项目结果通过
- 不得无限消耗阶段时间追逐Gitee未公开或不稳定内部接口
- 不得让Gitee失败阻塞五个平台的历史快照
- 不得把代理潜力分写成真实涨幅
- 不得加入付费API、前端Token或开放代理
- 不得破坏 `openradar:favorites:v1`

## 已知问题和风险
- Gitee官方公开搜索路径可能长期不稳定
- 动态内部接口即使找到也可能随时变化
- Gitee在止损后只能提供外部搜索入口，暂不进入榜单和历史增长
- 本地历史系统只能在 `node server.mjs` 运行期间自动采集；云端定时采集仍属后续阶段
- localStorage清除会丢收藏，仍应导出JSON备份

## 测试
- 用户Windows `node server.mjs`：通过
- 首页五平台实时数据：通过
- `/api/gitee/search?q=project%20management`：`projects: []`，source=`gitee-official-search`
- `/api/gitee/search?q=vue`：`projects: []`，source=`gitee-official-search`
- `/api/gitee/search?q=若依`：`projects: []`，source=`gitee-official-search`
- Gitee真实项目结果：未通过

## Git 状态
- Working tree：dirty，仅用户验收交接文件
- Staged：none
- Current commit：`8798291`
- Tags：none
- Push：not pushed；origin仍为本地bundle来源
- Merge：none

## 下一项唯一任务
先完成 Phase 0.2-B.2：仅进行一次有诊断、可判定结果的Gitee精准尝试；无法稳定得到仓库数据时立即降级为“外部搜索入口”，不参与实时榜单。随后马上进入 Phase 0.3-A：为五个真实平台建立零依赖本地历史快照、后台六小时采集与真实增长就绪状态。

## 关键文件
- `server.mjs`
- `platform-adapters.js`
- `app.js`
- `tests/server_test.mjs`
- `tests/browser_mock_test.py`
- `docs/PROJECT_STATE.json`
- `docs/HANDOFF_LOG.md`
