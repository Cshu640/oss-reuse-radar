# OpenRadar Handoff

## 当前阶段
Phase 0.2-B — Multi-Platform Public API Adapters

## 分支和 HEAD
- Branch：`phase-0.2-b-multi-platform-adapters`
- Functional HEAD：`ceb75c5`
- 当前 HEAD：交接提交后需再次同步

## 当前状态
Phase 0.2-B 功能代码已完成：OpenRadar 已建立统一平台适配器，并在 GitHub、Hugging Face 基础上增加 GitLab、Codeberg、Gitee 与 ModelScope。六个平台均使用免费公开读取，不在前端放置令牌或服务密钥。桌面与移动端模拟浏览器测试通过，但开发容器无法完成真实外部 API/CORS 验证；Gitee 与 ModelScope 继续显示“实验”标识，不得将本阶段写成用户验收通过。

## 已完成
- 新建 `platform-adapters.js`，集中管理平台元数据、请求超时、搜索、首页雷达、返回结构标准化和备用搜索链接
- 接入 GitHub、Hugging Face、GitLab、Codeberg、Gitee、ModelScope 六个平台
- 首页平台筛选扩展为全部六个平台
- 灵感搜索支持选择任意一个或多个平台并行查询
- GitHub/GitLab/Codeberg/Gitee 卡片使用 Stars 与 Forks 指标
- Hugging Face/ModelScope 卡片使用 Likes 与 Downloads 指标
- 首页和搜索页显示平台级 `loading/live/empty/error` 状态、结果数量与降级原因
- 空结果或接口失败时提供前往对应平台直接搜索的备用入口
- Gitee、ModelScope 保持“实验”标记
- Gitee、ModelScope 优先尝试中文原始需求；其他平台使用本地扩展后的英文技术关键词
- 请求增加12秒超时，单个平台失败不会阻塞其他平台
- 雷达缓存升级为 `openradar:radar-cache:v3`，收藏键继续保持 `openradar:favorites:v1`
- Service Worker 缓存升级为 v3，并缓存平台适配器
- 增加可重复执行的六平台 Chromium 模拟测试 `tests/browser_mock_test.py`
- README 与 Agent 约束同步更新

## 未完成
- 用户 Windows Edge 对六个平台真实接口、CORS、返回结构和降级提示的人工验收
- Gitee、ModelScope 稳定性结论；两者仍为实验数据源
- GitLab/Codeberg 返回项目的语言和许可证深度补全
- 跨平台同项目身份去重；当前只按平台内标准 ID 去重
- 历史快照数据库及真实24小时/7天/30天增速
- ecosyste.ms、npm、PyPI 等软件包生态
- Hacker News 等外部热点信号源
- 云端收藏同步与多设备访问
- Codex MCP Server 与当前仓库适配分析
- 生产部署

## 当前阻塞
- 开发容器无法解析或访问真实外部平台，因此不能验证六个平台在真实浏览器中的公开 API 与 CORS 行为
- 容器 Chromium 对 localhost 导航返回 `ERR_BLOCKED_BY_ADMINISTRATOR`，因此真实模块页面仅完成 HTTP 冒烟测试；交互验证使用内联页面与模拟 API
- 需要用户在 Windows Edge 中运行新版并提供六个平台状态截图，才能完成 Phase 0.2-B 验收

## 禁止事项
- 不得把代理潜力分描述成真实涨幅
- 不得把各平台 Star、Like、Downloads 原始数字直接描述成同口径全网排名
- 不得把模拟 API 测试通过描述成真实外部 API 通过
- Gitee 与 ModelScope 在用户真实验收前不得移除“实验”标识
- 不得在前端加入 GitHub Token、Supabase service role key、平台私钥或模型密钥
- 不得更换 `openradar:favorites:v1` 而不提供迁移
- 第一版不得加入付费 API
- 不得因新增平台失败而清除其他平台结果或用户收藏

## 已知问题和风险
- Gitee 公共搜索接口可能返回空结果、发生策略变化或受跨域限制
- ModelScope OpenAPI 的公开读取与字段结构可能变化，当前适配器做了多字段兼容但仍需真实数据验证
- GitLab Projects 列表通常不直接提供完整许可证和主语言，卡片可能显示“许可证待核查”
- Codeberg/Forgejo 实例接口参数和限频可由实例管理员调整
- 六个平台并行搜索会增加匿名接口请求量；15分钟雷达缓存只覆盖首页，不覆盖所有即时搜索
- 跨平台镜像与同一项目尚未关联，可能出现重复项目
- 自动分类、用途判断和许可证元数据仍需人工复核
- localStorage 被清除时收藏会丢失，应继续保留 JSON 导出

## 测试
- `node --check app.js`：通过
- `node --check platform-adapters.js`：通过
- `node --check sw.js`：通过
- `manifest.webmanifest` JSON 解析：通过
- `git diff --check`：通过
- 本地 HTTP 200：`/`、`index.html`、`styles.css`、`app.js`、`platform-adapters.js`、Manifest、图标均通过
- Chromium 六平台模拟桌面测试：通过；7张项目卡、6个平台 live 状态、7个平台筛选选项
- Chromium 390×844 移动端测试：通过；菜单可打开、无水平溢出
- 中文“适合网页游戏的开源NPC记忆系统”搜索扩展：通过
- Gitee/ModelScope 中文原始查询优先：模拟 URL 断言通过
- 六种平台返回结构标准化：模拟测试通过
- 收藏存储键静态兼容：`openradar:favorites:v1` 保持不变
- 真实外部 API：未在开发容器验证
- 用户 Windows Edge：未验收 Phase 0.2-B

## Git 状态
- Working tree：交接更新前 clean；交接文件写入后 dirty
- Staged：none
- Functional commit：`ceb75c5 feat: add six-platform source adapters`
- Tags：none
- Push：not pushed；origin 仍指向本地 Phase 0.1 bundle
- Merge：none

## 下一项唯一任务
在用户 Windows Edge 更新并运行 Phase 0.2-B，逐项验证首页与灵感搜索中的 GitHub、Hugging Face、GitLab、Codeberg、Gitee、ModelScope 状态；只修复真实 API、CORS 或字段兼容问题，验收前不得进入历史快照开发。

## 关键文件
- `platform-adapters.js`：六平台目录、调用、标准化与降级入口
- `app.js`：平台状态、并行雷达、跨平台搜索、卡片指标
- `index.html`：六平台筛选与实验标识
- `styles.css`：平台状态和多源搜索布局
- `sw.js`：PWA v3 缓存
- `tests/browser_mock_test.py`：可重复模拟浏览器测试
- `README.md`
- `AGENTS.md`
- `docs/PROJECT_STATE.json`
- `docs/HANDOFF_LOG.md`
