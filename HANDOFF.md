# OpenRadar Handoff

## 当前阶段
Phase 0.2-A — Office/Life Taxonomy & Chinese Search Expansion

## 分支和 HEAD
- Branch：`phase-0.2-a-office-life-search`
- HEAD：`88bcd78`（验收记录提交后需再次同步）

## 当前状态
用户已在 Windows Edge 与已安装 PWA 中完成 Phase 0.2-A 人工验收。首页、办公/生活/商业分类、用途筛选、中文灵感搜索流程、收藏持久化与桌面安装均确认正常。搜索召回质量仍属于规则扩展与多轮关键词搜索，不得描述为大模型语义检索；真实24小时/7天/30天增长仍未实现。

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
- 用户 Windows Edge 真实浏览器人工验收通过
- PWA 桌面安装、收藏持久化、分类筛选与中文搜索流程验收通过

## 未完成
- 历史快照数据库及真实24小时/7天/30天增速
- 云端收藏同步与多设备访问
- GitLab、Gitee、Codeberg、ModelScope、ecosyste.ms
- Codex MCP Server 与真实项目适配分析
- 生产部署

## 当前阻塞
无 Phase 0.2-A 验收阻塞。当前开发容器仍无法解析外部域名，因此后续新增平台的真实 API/CORS 验证仍需在用户 Windows 浏览器完成。

## 禁止事项
- 不得把代理潜力分描述成真实涨幅
- 不得把本地规则扩展描述成大模型语义搜索
- 不得在前端加入 GitHub Token、Supabase service role key 或模型密钥
- 不得更换收藏 localStorage 键而不提供迁移
- 第一版不得加入付费 API
- 不得把新增平台代码完成写成真实外部 API 已验收

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
- 用户 Windows Edge 首页与分类：通过
- 用户 Windows 收藏新增、持久化、备注与移除：通过
- 用户 Windows 中文灵感搜索流程：通过
- 用户 Windows PWA 桌面安装：通过

## Git 状态
- Working tree：dirty（当前验收交接更新）
- Staged：none
- Commit：`88bcd78`（验收记录尚未提交）
- Tags：none
- Push：not pushed；origin 是本地 Phase 0.1 bundle
- Merge：none

## 下一项唯一任务
创建 Phase 0.2-B 分支，建立统一平台适配器并接入 GitLab、Codeberg、Gitee 与 ModelScope；所有数据源保持零付费 API，并对不稳定或无法直接跨域访问的平台显示明确降级状态。

## 关键文件
`app.js`、`index.html`、`styles.css`、`sw.js`、`README.md`、`docs/PROJECT_STATE.json`、`docs/HANDOFF_LOG.md`。
