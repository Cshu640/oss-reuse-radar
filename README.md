# OpenRadar · 开源项目雷达

面向个人与 Codex 工作流的跨平台开源项目发现 PWA。

## Phase 0.2-B.1

- 六个平台：GitHub、Hugging Face、GitLab、Codeberg、Gitee、ModelScope
- GitHub、Hugging Face、GitLab、Codeberg、ModelScope 已通过用户 Windows Edge 真实读取验收
- 为 Gitee 新增本地同源兼容服务：优先调用官方 v5 仓库搜索 API；接口失败或返回空结果时，低频回退到 Gitee 官方 `so.gitee.com` 搜索页面
- Gitee兼容服务使用15分钟内存缓存、12秒超时、固定上游白名单和受限查询参数，不是开放代理
- Gitee使用官方搜索回退时，平台状态会显示“搜索回退”，并在悬停提示中说明 v5 API 的失败原因
- 新增 `start-openradar.cmd`，Windows可双击启动
- 页面左下角会明确显示“本地兼容服务”或“静态模式”
- ModelScope 已通过真实验收，移除“实验”标识；Gitee在用户验证本阶段前继续保持实验标识
- 收藏键继续保持 `openradar:favorites:v1`，不会因升级静默丢失
- Service Worker 与雷达缓存升级到 v4；API请求不会被离线壳错误替换成HTML

## 推荐运行方式

在包含 `index.html` 的 `open-source-radar` 文件夹中：

### Windows最简单

双击：

```text
start-openradar.cmd
```

### 命令行

```bash
node server.mjs
```

然后打开：

```text
http://localhost:8080
```

终端保持打开；按 `Ctrl + C` 停止。

## 静态兼容模式

仍然可以运行：

```bash
npx --yes serve . -l 8080
```

或者：

```bash
python -m http.server 8080
```

但这两种只是静态服务器，浏览器无法使用本地Gitee同源兼容通道。此时另外五个平台仍可工作，页面左下角会显示“静态模式”。

## Gitee数据路径

```text
浏览器
  ↓ 同源 /api/gitee/search
本地 server.mjs
  ↓ 优先
Gitee官方 v5 Search API
  ↓ 失败或空结果
Gitee官方 so.gitee.com 搜索页面
```

本地服务不需要付费API，不要求把Token写入前端，也不会代理任意网址。

## 数据架构

`platform-adapters.js` 负责统一平台结构、搜索、雷达候选和前端降级。

`server.mjs` 负责：

- 静态文件服务
- `/api/health` 运行模式检测
- `/api/gitee/search` Gitee同源兼容通道
- 上游超时、缓存、输入限制和官方搜索HTML解析

`app.js` 继续只消费统一项目结构，收藏、分类和项目卡片不需要针对Gitee单独改写。

## 当前限制

- 潜力分是代理指标，不是真实24小时、7天或30天涨幅。
- 不同平台的Star、Like、下载量口径不同，不能直接作为统一绝对热度比较。
- Gitee官方v5仓库搜索存在公开的空结果缺陷反馈；官方搜索页面结构也可能变化，因此Gitee仍需用户真实验收。
- Gitee网页回退可能缺失准确许可证、语言、Star或Fork字段；正式采用前必须打开项目核查。
- 中文搜索扩展是本地规则系统，不是大模型语义检索。
- 收藏仍只保存在当前浏览器，请定期导出JSON。
- 自动分类和许可证元数据必须在正式采用项目前人工复核。

## 下一阶段

先在用户 Windows Edge 使用 `node server.mjs` 验证 Gitee 状态和搜索结果。通过后再进入历史快照与真实增长开发。
