# OpenRadar Handoff

## 当前阶段
Phase 0.4-A — Trust, Correction & Portability

## 分支和 HEAD
- Branch：`phase-0.4-a-trust-correction-portability`
- Functional HEAD：`98c5ebe`
- 当前HEAD：交接提交后再次同步

## 当前状态
Phase 0.3-C已由用户在Windows真实验收：DeepSeek-R1成功合并GitHub、Hugging Face和ModelScope三个来源；统一详情页、Codex研究包、本地两个文件和剪贴板复制均通过。已知来源主卡对比度问题在本阶段修复。

Phase 0.4-A功能代码已完成。本地语法、单元、服务器API、文件持久化、桌面/移动模拟浏览器与实际Node启动测试通过；用户Windows及真实OpenSSF Scorecard、deps.dev、OSV上游尚未验收，不能写成正式通过。

本阶段新增三条能力：
1. 免费可信度与供应链初筛；
2. 人工合并、拆分和主来源纠错；
3. 收藏、历史、AI解读、可信度报告、身份规则与Codex研究包完整备份/导入。

界面明确区分事实数据、OpenRadar规则判断、本地AI和人工确认。自动可信度结果不是安全认证或法律结论。

## 已完成
- 修复主来源卡片高亮背景与文字对比度
- 人工合并两个项目实体
- 将误合并来源拆出
- 手动指定主来源
- 清除项目相关人工身份规则
- `IdentityStore`与`data/identity-overrides.json`
- 浏览器身份规则兼容键`openradar:identity-overrides:v1`
- 人工规则进入实体重建、详情页和完整备份
- OpenSSF Scorecard公开评分与检查项读取
- deps.dev项目、软件包版本与许可证映射
- OSV Querybatch已映射版本漏洞查询
- 可信度24小时缓存与串行按需审计
- `TrustStore`与`data/trust.json`
- 可信度规则分、积极信号、风险缺口、低分检查和OSV关联展示
- 事实、规则、本地AI和人工确认来源标签
- Codex研究包包含可信度初筛上下文
- `BackupService`完整导出与导入
- 备份收藏、筛选设置、身份纠错、历史、Insights、Trust和Codex研究包
- 导入替换确认与重启提示
- 静态模式浏览器数据备份降级
- 新版观察名单状态面板
- Service Worker v9与雷达缓存v9
- Phase 0.3-C用户真实验收记录

## 未完成
- 用户Windows Phase 0.4-A真实验收
- 真实OpenSSF Scorecard返回验证
- 真实deps.dev项目与软件包映射验证
- 真实OSV查询验证
- Windows人工合并、拆分和主来源重启持久化验收
- Windows完整备份导出、导入和重启恢复验收
- 完整备份冲突合并模式；当前为替换式恢复
- 更细致漏洞严重度、受影响范围和修复版本解释
- 软件包生态雷达
- 项目对比器
- Codex MCP
- 云端无人值守采集
- 自然时间7天和30天增长最终验收

## 当前阻塞
- 开发容器无法访问真实OpenSSF、deps.dev与OSV上游，需要用户Windows网络验证
- 长周期增长需要自然时间

## 禁止事项
- 不得把Scorecard分数写成安全认证
- 不得把OSV未返回漏洞写成项目无漏洞
- 不得把deps.dev未映射软件包写成项目没有依赖
- 不得把规则分与第三方事实混为同一来源
- 不得自动批量审计全部项目或滥用免费API
- 不得因名称、简介或Topic相似自动合并
- 不得丢弃原始来源ID、指标、许可证或历史
- 不得让导入静默覆盖数据，必须用户确认
- 不得提交`data/*.json`或`exports/codex/*`
- 不得修改收藏键`openradar:favorites:v1`
- 不得把代码完成、本地模拟或API Mock写成Windows真实验收
- 不得进入下一阶段，直到本阶段真实兼容问题得到处理或明确止损

## 已知问题和风险
- Scorecard只覆盖其已计算或可识别的项目，404或无结果可能是数据缺失
- deps.dev项目与软件包映射覆盖不完整
- OSV查询依赖准确的软件包生态、名称和版本
- 一个漏洞ID不等于当前部署一定可利用，仍需核对版本和路径
- Trust规则分是OpenRadar本地启发式，不是行业标准分
- 人工规则依赖平台项目ID，项目迁移或改名后可能失效
- 手工拆分通过阻止来源对自动合并；复杂传递关系仍需人工检查
- 完整导入当前替换服务器数据，不做逐条冲突合并
- 导入后必须重启Node服务
- 大量Codex研究包会增加备份文件体积
- 本地服务器关闭或电脑睡眠时历史仍会有缺口

## 测试
- 全部JS/MJS语法检查：通过
- Manifest与项目状态JSON解析：通过
- `tests/project_identity_test.mjs`：通过
  - 自动合并回归
  - 阻止自动合并
  - 人工跨作者合并
  - 人工主来源
- `tests/identity_store_test.mjs`：通过
- `tests/trust_service_test.mjs`：通过
  - Mock Scorecard
  - Mock deps.dev映射
  - Mock OSV漏洞
  - 规则评估与24小时缓存
- `tests/backup_service_test.mjs`：通过
  - 全部服务器数据导出
  - Codex研究包迁移
  - 新目录恢复
- 历史与Ollama Insights回归：通过
- Codex研究包回归与Trust上下文：通过
- `tests/server_test.mjs`：通过
  - Identity、Trust、Backup API
  - 既有Gitee、History、Insights、Codex API
- `tests/browser_mock_test.py`：通过
  - 桌面与390px移动端
  - Trust展示
  - 人工纠错控件
  - 完整备份入口
  - 主来源深色可读样式
  - 无横向溢出
- 实际`PORT=8110 OPENRADAR_AUTO_COLLECT=0 node server.mjs`：通过
- 实际`/api/health`：HTTP 200，version `0.4-A`，identity/trust/backup均为true
- 实际Trust、Backup、Identity状态接口：HTTP 200
- 实际首页：HTTP 200
- `git diff --check`：通过
- 真实外部Trust API：未执行
- 用户Windows Phase 0.4-A：未执行

## Git 状态
- Functional commit：`98c5ebe feat: add trust audits identity corrections and full backups`
- Working tree：功能提交后clean；写README、AGENTS与交接后dirty
- Staged：none
- Tags：none
- Push：not pushed；origin为本地Phase 0.3-C bundle
- Merge：none

## 下一项唯一任务
用户在Windows运行Phase 0.4-A，依次验收来源卡对比度、人工主来源或拆分后的重启持久化、一个GitHub项目的真实免费可信度审计、完整备份导出与测试目录导入恢复。只修复真实接口、字段、持久化或迁移问题；验收前不进入软件包生态或项目对比器。

## 关键文件
- `project-identity.js`
- `identity-store.mjs`
- `trust-store.mjs`
- `trust-service.mjs`
- `backup-service.mjs`
- `server.mjs`
- `app.js`
- `styles.css`
- `codex-packet.js`
- `codex-export-service.mjs`
- `tests/project_identity_test.mjs`
- `tests/identity_store_test.mjs`
- `tests/trust_service_test.mjs`
- `tests/backup_service_test.mjs`
- `tests/server_test.mjs`
- `tests/browser_mock_test.py`
- `data/identity-overrides.json`（运行时，不提交）
- `data/trust.json`（运行时，不提交）
