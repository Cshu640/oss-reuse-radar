# OpenRadar · 开源项目雷达

面向个人与 Codex 工作流的跨平台开源项目发现 PWA。

## Phase 0.2-B

- 接入六个平台的零付费公开数据适配器：GitHub、Hugging Face、GitLab、Codeberg、Gitee、ModelScope
- 首页和灵感搜索显示每个平台的实时状态、结果数量、空结果或失败降级
- 平台不可用时提供直接前往该平台搜索的备用入口
- GitHub、GitLab、Codeberg、Gitee 使用 Stars / Forks；Hugging Face、ModelScope 使用 Likes / Downloads
- 中文需求继续在浏览器本地扩展为英文技术关键词；Gitee 与 ModelScope 会优先尝试中文原始需求
- Gitee、ModelScope 暂标记为实验数据源，必须在用户真实浏览器中验证公开读取、返回结构与跨域策略
- 保持 `openradar:favorites:v1` 收藏存储键不变，旧收藏不会因升级静默丢失
- Service Worker 缓存升级为 v3

## 数据架构

`platform-adapters.js` 统一负责：

- 平台目录与指标定义
- 免费公开端点调用与超时
- 不同返回结构的项目标准化
- 首页候选扫描
- 灵感搜索
- 失败后的平台搜索链接

`app.js` 只消费统一项目结构，后续增加平台时不需要重新改写项目卡片与收藏逻辑。

## 运行

Windows 已安装 Node.js 时，在包含 `index.html` 的 `open-source-radar` 文件夹运行：

```bash
npx --yes serve . -l 8080
```

也可使用 Python：

```bash
python -m http.server 8080
```

打开 `http://localhost:8080`。不要直接双击 HTML。

## 当前限制

- 潜力分是代理指标，不是真实24小时、7天或30天涨幅。
- 各平台的 Star、Like、下载量口径不同，目前只在卡片中明确展示，不应直接当作统一热度绝对值。
- 中文搜索扩展是本地规则系统，不是大模型语义检索；复杂或冷门表达仍可能漏召回。
- 免费匿名接口可能限频、调整返回结构或限制浏览器跨域访问；失败会显示降级状态。
- Gitee、ModelScope 尚未完成用户 Windows 真实接口验收。
- 收藏只保存在当前浏览器，请定期导出 JSON。
- 自动分类与许可证元数据必须在正式采用项目之前人工复核。

## 下一阶段

先在用户 Windows 浏览器验证六个平台的真实状态并修复兼容性。验收后进入 Phase 0.3：Supabase 项目库、定时历史快照与真正的24小时/7天/30天增长。
