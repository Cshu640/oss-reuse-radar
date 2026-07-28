# OpenRadar Handoff

## 当前阶段
Phase 0.2-A — Office/Life Taxonomy & Chinese Search Expansion

## 分支和 HEAD
- Branch：`phase-0.2-a-office-life-search`
- HEAD：`46c67ae`

## 当前状态
功能代码已提交；静态检查、本地 HTTP 冒烟、Chromium 模拟数据桌面/移动端交互测试通过。当前容器无法解析外部域名，因此真实 GitHub / Hugging Face API 仍需在用户 Windows 浏览器验收。不得把本阶段描述为已完成线上或真实外部 API 验收。

## 已完成
- 新增“办公效率”“生活工具”“商业应用底座”一级分类
- 增加办公、生活、商业应用关键词分类规则
- 增加六类用途识别与筛选：直接安装、个人部署、Codex 二次开发、技术组件、产品设计参考、商业化机会
- 中文自然语言搜索本地扩展为英文技术关键词，并执行多轮 GitHub / Hugging Face 搜索
- 首页增加办公与生活领域 GitHub Topic 候选扫描
- 增加15分钟雷达缓存，降低匿名搜索 API 压力
- 收藏继续沿用 `openradar:favorites:v1`，旧收藏对象可在运行时补全用途类型
- 收藏库支持按分类、用途文字检索，并展示下一步动作
- Service Worker 缓存升级为 v2，支持已安装 PWA 更新资源

## 未完成
- 用户 Windows 对 Phase 0.2-A 新分类、用途筛选和中文搜索的人工验收
- 真实外部 API 查询在当前容器中的运行验证
- 历史快照数据库及真实24小时/7天/30天增速
- 云端收藏同步与多设备访问
- GitLab、Gitee、Codeberg、ModelScope、ecosyste.ms
- Codex MCP Server 与真实项目适配分析

## 当前阻塞
当前执行容器 DNS 解析失败，无法直接访问 GitHub / Hugging Face API。该问题不影响静态代码和模拟浏览器测试，但真实搜索召回需要用户机器验证。

## 禁止事项
- 不得把代理潜力分描述成真实涨幅
- 不得把本地规则扩展描述成大模型语义搜索
- 不得在前端加入 GitHub Token、Supabase service role key 或模型密钥
- 不得更换收藏 localStorage 键而不提供迁移
- 第一版不得加入付费 API
- 不得把代码完成写成用户验收通过

## 已知问题和风险
- 中文词典仍是有限规则，冷门表达和复杂约束可能漏召回
- 多轮 GitHub 搜索会消耗匿名 Search API 限额；已增加缓存，但连续强制刷新仍可能触发限频
- 自动分类和用途识别均为启发式判断，正式采用项目之前必须人工复核
- 许可证元数据可能为空或与仓库实际 LICENSE 不一致
- localStorage 被清除时收藏仍会丢失，应继续保留 JSON 导出备份

## 测试
- `node --check app.js`：通过
- `node --check sw.js`：通过
- `manifest.webmanifest` JSON 解析：通过
- `git diff --check`：通过
- 本地 HTTP 200 与静态资源读取：通过
- Chromium 模拟 API 桌面交互：通过
- 旧 `openradar:favorites:v1` 收藏兼容：通过
- 中文“适合网页游戏的开源NPC记忆系统”关键词扩展：通过
- 用途筛选：通过
- 390px 移动端菜单与水平溢出检查：通过
- 真实 GitHub / Hugging Face API：当前容器未验证
- 用户 Windows 人工验收：未执行

## Git 状态
- Working tree：dirty（仅最终交接文件更新）
- Staged：none
- Commit：`46c67ae`
- Tags：none
- Push：not pushed；origin 是本地 Phase 0.1 bundle
- Merge：none

## 下一项唯一任务
让用户在 Windows 已安装 PWA 中覆盖更新 Phase 0.2-A，验证办公/生活分类、用途筛选，以及中文查询是否能返回真实 GitHub / Hugging Face 候选；根据真实召回结果只修复 Phase 0.2-A 缺陷，暂不进入历史快照开发。

## 关键文件
`app.js`、`index.html`、`styles.css`、`sw.js`、`README.md`、`docs/PROJECT_STATE.json`、`docs/HANDOFF_LOG.md`。
