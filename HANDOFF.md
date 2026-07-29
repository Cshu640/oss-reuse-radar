# OpenRadar Handoff

## 当前阶段
Phase 0.4-A.1 — Windows Launcher Reliability Hotfix

## 分支和 HEAD
- Branch：`phase-0.4-a.1-launcher-fix`
- Functional HEAD：`31777f6`
- 当前HEAD：交接提交后再次同步

## 当前状态
Phase 0.4-A功能本身没有改动。本热修仅修复Windows双击启动器：用户反馈新版`start-openradar.cmd`双击无反应，但手动执行`node server.mjs`能够正常启动，说明主程序、Node.js和端口链路基本正常，故障范围被限定为发布包启动器体验。

已新增`START-OPENRADAR.bat`与`run-openradar-server.cmd`，并重写兼容入口`start-openradar.cmd`。新版启动器会检查`server.mjs`与Node.js、延迟打开浏览器，并在路径错误、Node缺失、端口冲突或服务退出时保留可见窗口和错误信息，不再静默闪退。

Linux开发容器无法真实执行Windows批处理双击，因此当前只能写成代码与静态兼容检查通过，等待用户Windows验收。

## 已完成
- 新增推荐启动器`START-OPENRADAR.bat`
- 重写兼容入口`start-openradar.cmd`
- 新增`run-openradar-server.cmd`错误保留层
- 启动前检查`server.mjs`
- 启动前检查Node.js PATH
- 延迟2秒自动打开`http://localhost:8080`
- 服务退出或启动失败后显示退出码并暂停
- 端口占用提示
- 三个批处理文件改为ASCII命令与CRLF行尾
- README更新双击、外层目录与Windows解除锁定说明
- Phase 0.4-A全部Node测试回归通过
- 实际Node服务与`/api/health`回归通过

## 未完成
- 用户Windows双击`START-OPENRADAR.bat`验收
- 用户Windows双击兼容入口`start-openradar.cmd`验收
- 下载ZIP的Mark-of-the-Web/SmartScreen真实行为验收
- Phase 0.4-A原有真实Trust API、人工纠错与完整恢复验收

## 当前阻塞
- 开发环境没有Windows CMD/SmartScreen，无法执行真实双击验收

## 禁止事项
- 不得把Linux静态检查写成Windows双击通过
- 不得修改或丢失Phase 0.4-A的历史、收藏、Insights、Trust、Identity和Codex数据兼容
- 不得让启动器静默关闭而不给用户错误信息
- 不得使用依赖PowerShell执行策略的`.ps1`作为唯一入口
- 不得进入Phase 0.4-B，直到启动器和Phase 0.4-A真实兼容问题验收或止损

## 已知问题和风险
- Windows可能对从互联网下载的ZIP传播Mark-of-the-Web，用户可能需要在ZIP属性中“解除锁定”后重新解压
- 8080端口被旧版OpenRadar占用时，新服务会失败，但新版窗口应保留并提示
- `START-OPENRADAR.bat`使用Windows自带PowerShell仅用于延迟打开浏览器；即使该步骤失败，Node服务仍应继续启动
- 用户仍可能在压缩包预览中直接双击，必须完整解压后运行

## 测试
- Phase 0.4-A八套Node测试：8/8通过
- `node --check server.mjs`：通过
- 实际`PORT=8111 OPENRADAR_AUTO_COLLECT=0 node server.mjs`：通过
- 实际`/api/health`：HTTP 200，version `0.4-A`
- `START-OPENRADAR.bat`：DOS batch、ASCII、CRLF
- `start-openradar.cmd`：DOS batch、ASCII、CRLF
- `run-openradar-server.cmd`：DOS batch、ASCII、CRLF
- `git diff --check`：通过
- Windows双击：未执行

## Git 状态
- Functional commit：`31777f6 fix: make Windows launcher visible and reliable`
- Working tree：写交接前clean；写AGENTS、HANDOFF与状态后dirty
- Staged：none
- Tags：none
- Push：not pushed；origin为本地Phase 0.4-A bundle
- Merge：none

## 下一项唯一任务
用户完整解压Phase 0.4-A.1修正版，从最外层双击`START-OPENRADAR.bat`，确认服务器窗口可见、浏览器自动打开、Phase 0.4-A页面正常；若仍失败，记录保留窗口中的精确错误，只修启动器兼容问题。

## 关键文件
- `START-OPENRADAR.bat`
- `start-openradar.cmd`
- `run-openradar-server.cmd`
- `server.mjs`
- `README.md`
- `AGENTS.md`
- `HANDOFF.md`
- `docs/PROJECT_STATE.json`
- `docs/HANDOFF_LOG.md`
