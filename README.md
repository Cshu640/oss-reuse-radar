# OpenRadar · 开源项目雷达

面向个人与 Codex 工作流的跨平台开源项目发现 PWA。

## Phase 0.1

- 今日潜力、7天热点、30天雷达、低 Star 高潜力视图
- 浏览器端调用 GitHub Search API 与 Hugging Face Hub API
- 自然语言灵感搜索
- 平台、许可证、兴趣分类筛选
- 收藏、标签、备注、下一步动作与 JSON 导出
- localStorage 持久化
- PWA 安装与离线应用壳
- 无依赖静态部署

## 运行

```bash
python -m http.server 8080
```

打开 `http://localhost:8080`。不要直接双击 HTML。

## 当前限制

- 潜力分是代理指标，不是真实24小时涨幅。
- 未认证 GitHub API 适合个人原型，不适合高频全量采集。
- 收藏只保存在当前浏览器，请定期导出。
- 正式使用第三方项目之前必须复核 LICENSE、模型卡和维护状态。

## 下一阶段

接入 Supabase 与 GitHub Actions，保存历史快照并计算真实增长。
