# OpenRadar · 开源项目雷达

面向个人与 Codex 工作流的跨平台开源项目发现 PWA。

## Phase 0.2-A

- 延续 Phase 0.1 的 GitHub / Hugging Face 免费 API、雷达、收藏与 PWA 能力
- 新增“办公效率”“生活工具”“商业应用底座”一级分类
- 新增用途识别与筛选：直接安装、个人部署、Codex 二次开发、技术组件、产品设计参考、商业化机会
- 中文自然语言搜索会在浏览器本地扩展为英文技术关键词，并执行多轮 GitHub / Hugging Face 搜索
- 增加 15 分钟雷达缓存，减少匿名 API 限额消耗
- 保持 `openradar:favorites:v1` 收藏存储键不变，旧收藏不会因升级静默丢失
- Service Worker 缓存升级为 v2，使已安装 PWA 可以获取新版资源

## 运行

Windows 已安装 Node.js 时：

```bash
npx --yes serve . -l 8080
```

也可使用 Python：

```bash
python -m http.server 8080
```

打开 `http://localhost:8080`。不要直接双击 HTML。

## 当前限制

- 潜力分是代理指标，不是真实24小时涨幅。
- 中文搜索扩展是本地规则系统，不是大模型语义检索；复杂或冷门表达仍可能漏召回。
- 未认证 GitHub API 适合个人原型，不适合高频全量采集。
- 收藏只保存在当前浏览器，请定期导出 JSON。
- 自动分类与许可证元数据都必须在正式采用项目之前人工复核。

## 下一阶段

接入 Supabase 与 GitHub Actions，保存历史快照并计算真实增长；随后增加云端收藏同步和更多平台适配器。
