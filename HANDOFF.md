# OpenRadar Handoff

## 当前阶段
Phase 0.2-B.1 — Gitee Browser Compatibility Fallback

## 分支和 HEAD
- Branch：`phase-0.2-b.1-gitee-fallback`
- Functional HEAD：`2a99832`
- 当前 HEAD：交接提交后需再次同步

## 当前状态
Phase 0.2-B.1 功能代码已完成。针对用户 Windows Edge 中 Gitee 显示“不可用”的真实问题，新增本地同源 Node 服务 `server.mjs`：浏览器不再直接跨域请求 Gitee，而是访问同源 `/api/gitee/search`。本地服务优先调用 Gitee 官方 v5 仓库搜索 API；该接口失败或返回空数组时，低频回退到 Gitee 官方 `so.gitee.com` 搜索页面并解析仓库结果。所有通道均为免费公开读取，不需要在前端存放 Token。

本阶段已完成静态、Node单元、HTTP和Chromium模拟验证，但开发容器仍无法访问真实 Gitee 网络，因此不得写成 Gitee 已验收通过。下一步必须由用户在 Windows 使用 `node server.mjs` 或双击 `start-openradar.cmd` 进行真实验证。

## 已完成
- 新增 `server.mjs`，同时提供静态文件服务、`/api/health` 和 `/api/gitee/search`
- Gitee同源兼容通道优先调用官方 v5 API
- v5 API失败或空结果时回退到 Gitee 官方 `so.gitee.com` 搜索页面
- Gitee回退HTML解析支持嵌入JSON与仓库链接两种路径
- 上游请求12秒超时
- Gitee搜索结果15分钟内存缓存
- 查询长度、返回数量和上游域名固定限制；不是开放CORS代理
- 前端Gitee适配器优先使用同源代理，静态模式下再尝试浏览器直连
- Gitee通过官方搜索回退时，状态标签显示“搜索回退”并保留原因提示
- 页面左下角自动识别“本地兼容服务”或“静态模式”
- 新增Windows双击启动器 `start-openradar.cmd`
- ModelScope已通过上一阶段用户真实验收，移除“实验”标识
- Gitee继续保留“实验”标识，等待本阶段真实验收
- 雷达缓存升级为 `openradar:radar-cache:v4`
- Service Worker升级为 v4，并明确绕过 `/api/`，避免离线壳把API错误替换成HTML
- 收藏键继续保持 `openradar:favorites:v1`
- 新增 `tests/server_test.mjs`
- 更新六平台Chromium模拟测试以覆盖同源Gitee代理和运行模式检测
- README与AGENTS规则更新

## 未完成
- 用户 Windows Edge 使用 `node server.mjs` 对 Gitee 首页雷达真实验收
- 用户 Windows Edge 对 Gitee 中文灵感搜索真实验收
- Gitee官方搜索页面真实HTML结构验证；当前解析器仅通过本地夹具与模拟页面
- Gitee回退结果的许可证、语言、Star与Fork完整度验证
- 跨平台同项目身份去重
- 历史快照数据库与真实24小时/7天/30天增长
- ecosyste.ms、npm、PyPI等软件包生态
- Hacker News等外部热点信号
- 云端收藏同步
- Codex MCP Server
- 生产部署

## 当前阻塞
- 开发容器无法解析或访问 `gitee.com` 与 `so.gitee.com`，不能完成真实上游返回和CORS验证
- 需要用户在 Windows Edge 中运行新版并提供Gitee状态与搜索结果截图

## 禁止事项
- 不得把本地模拟和HTML夹具解析通过描述成Gitee真实接口通过
- Gitee在用户真实验收前不得移除“实验”标识
- 不得把代理潜力分描述成真实24小时、7天或30天涨幅
- 不得把不同平台的Star、Like、Downloads直接当作统一绝对热度
- 不得在前端加入Gitee Token、GitHub Token、Supabase service role key或其他密钥
- 不得把本地服务改造成可代理任意网址的开放代理
- 不得移除查询长度、数量限制、上游白名单、缓存和超时
- 不得更换 `openradar:favorites:v1` 而不提供迁移
- 第一版不得加入付费API
- 不得因Gitee失败而清除其他平台结果或用户收藏

## 已知问题和风险
- Gitee v5仓库搜索存在公开的空结果缺陷反馈，即便携带个人Token也可能返回空数组
- `so.gitee.com` 页面结构属于网页实现细节，未来变化可能导致解析器失效
- 网页回退结果可能缺失准确许可证、语言、Star或Fork字段
- 本地服务只监听 `127.0.0.1`，不会供局域网其他设备访问
- 直接使用 `npx serve` 或 Python静态服务器时，Gitee同源兼容通道不会启用；另外五个平台仍可工作
- PWA旧缓存可能需要关闭重开或 `Ctrl + F5` 才会加载v4资源
- 跨平台镜像尚未去重
- 自动分类、用途判断和许可证仍需人工复核
- localStorage被清除时收藏会丢失，应继续导出JSON备份

## 测试
- `node --check app.js`：通过
- `node --check platform-adapters.js`：通过
- `node --check sw.js`：通过
- `node --check server.mjs`：通过
- `node tests/server_test.mjs`：通过
  - Gitee HTML夹具解析2个仓库
  - v5空结果转官方搜索回退
  - 15分钟缓存路径
  - v5 API成功路径
  - `/api/health` HTTP验证
  - `/api/gitee/search` HTTP验证
  - 静态 `index.html` HTTP 200
- `python3 tests/browser_mock_test.py`：通过
  - 桌面端7张候选卡
  - 6个平台live状态
  - Gitee“搜索回退”标签
  - 本地兼容服务状态
  - 中文NPC记忆系统搜索扩展
  - 390×844移动端无横向溢出
  - 收藏键兼容
- Manifest JSON解析：通过
- `git diff --check`：通过
- 真实Gitee网络：开发容器未运行
- 用户Windows Edge Phase 0.2-B.1：未验收

## Git 状态
- Working tree：功能提交后clean；写入本交接后dirty
- Staged：none
- Functional commit：`2a99832 fix: add local gitee compatibility channel`
- Tags：none
- Push：not pushed；origin仍指向本地Phase 0.1 bundle
- Merge：none

## 下一项唯一任务
用户在 Windows 解压 Phase 0.2-B.1，在包含 `index.html` 的目录双击 `start-openradar.cmd` 或运行 `node server.mjs`；确认左下角显示“本地兼容服务”，然后刷新首页并执行一次中文Gitee搜索。只修复真实Gitee返回、解析或字段兼容问题；验收前不得进入历史快照开发。

## 关键文件
- `server.mjs`：静态服务、运行健康检查、Gitee同源兼容通道、官方API与网页回退
- `start-openradar.cmd`：Windows双击启动器
- `platform-adapters.js`：Gitee代理优先与直连降级
- `app.js`：运行模式检测、Gitee回退来源状态
- `index.html`：运行模式显示与实验标识
- `sw.js`：PWA v4与API绕过
- `tests/server_test.mjs`：服务端与解析器测试
- `tests/browser_mock_test.py`：六平台浏览器模拟测试
- `README.md`
- `AGENTS.md`
- `docs/PROJECT_STATE.json`
- `docs/HANDOFF_LOG.md`
