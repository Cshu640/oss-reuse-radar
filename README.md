# OpenRadar · 开源项目雷达

面向个人、独立开发者与 Codex 工作流的跨平台开源项目发现、搜索、收藏、真实增长与本地中文解读工具。

## Phase 0.3-B

当前版本包含三条主线：

1. **五个平台实时项目数据**
   - GitHub
   - Hugging Face
   - GitLab
   - Codeberg
   - ModelScope
2. **零依赖本地历史快照**
   - 启动即采集，之后每6小时采集
   - 保存 Stars、Forks、Likes、Downloads
   - 历史跨度足够后显示真实24小时、7天与30天增长
3. **免费中文大白话与个人适配分析**
   - 所有项目卡先显示不耗算力的规则摘要
   - 点击“中文解读”后调用本机 Ollama
   - 默认模型 `qwen3:4b`
   - 解读结果持久化缓存，项目未更新时不重复生成
   - Ollama不可用时自动退回规则摘要

Gitee保留为受限来源。当官方API和公开页面均无法稳定返回项目时，只提供外部搜索入口，不参与实时榜单和历史增长。

## 中文大白话会说明什么

每次本地AI解读会输出：

- 它到底是干什么的
- 适合谁
- 怎么使用或接入
- 许可证与商业使用风险
- 安装、系统、显存和外部服务门槛
- 交给Codex有什么价值
- 对当前用户设备和项目的适配度
- 主要风险
- 明确的下一步建议

AI结论只用于项目初筛，不等同于完整代码、安全或法律审计。

## 前置条件

### Node.js

用于启动OpenRadar本地服务。

### Ollama与本地模型

推荐模型：

```bash
ollama pull qwen3:4b
```

检查模型：

```bash
ollama list
```

Ollama通常会在Windows后台运行。OpenRadar会访问本机：

```text
http://127.0.0.1:11434
```

不需要API Key，也不调用付费模型服务。

## 推荐启动方式

进入同时包含 `index.html`、`server.mjs` 的 `open-source-radar` 文件夹。

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

终端必须保持打开。按 `Ctrl + C` 停止服务。

正常启动会显示：

```text
OpenRadar Phase 0.3-B
Local: http://localhost:8080
History: 本地快照已启用
Insights: 本地Ollama中文解读已启用
```

## 本地数据

### 历史快照

```text
data/history.json
```

- 默认保留约400天
- 只保存公开项目标识和公开指标
- 不上传第三方
- 删除后增长历史从零重新积累

### 中文解读缓存

```text
data/insights.json
```

- 生成一次后本地复用
- 项目简介、更新时间、许可证或Topic变化后才需要重新分析
- 不提交到Git
- 删除后只会丢失解读缓存，不影响收藏与历史快照

### 浏览器收藏

继续使用：

```text
openradar:favorites:v1
```

请定期在“我的收藏”中导出JSON备份。

## 本地AI资源保护

OpenRadar默认采用以下策略：

- 不自动批量分析全部项目
- 只有点击“中文解读”才调用模型
- 每次只生成一个项目
- README最多截取有限内容
- 使用结构化JSON输出
- 生成完成后通过 `keep_alive: 0` 立即卸载模型
- 项目未更新时读取缓存
- Ollama未连接时仍可使用规则摘要

## 历史增长规则

第一次启动不能凭空产生历史数据：

- 24小时增长：历史跨度达到约20小时后启用
- 7天增长：历史跨度达到约6天后启用
- 30天增长：历史跨度达到约25天后启用

不同平台先计算平台内部增长百分位，不直接混比Star、Like与Downloads原始数字。

## 本地API

```text
GET  /api/health
GET  /api/gitee/search
GET  /api/history/status
GET  /api/history/growth
POST /api/history/capture
POST /api/history/collect
GET  /api/insights/status
GET  /api/insights
POST /api/insights/generate
```

## 环境变量

默认无需配置。需要切换模型时：

```bat
set OLLAMA_MODEL=qwen3:4b
node server.mjs
```

自定义Ollama地址：

```bat
set OLLAMA_BASE_URL=http://127.0.0.1:11434
node server.mjs
```

暂停启动时自动历史采集：

```bat
set OPENRADAR_AUTO_COLLECT=0
node server.mjs
```

## 静态兼容模式

仍可运行：

```bash
npx --yes serve . -l 8080
```

但静态模式缺少：

- Gitee同源兼容通道
- 本地历史保存与后台采集
- Ollama中文解读
- `data/insights.json`缓存

正式使用必须优先运行：

```bash
node server.mjs
```

## 当前限制

- 本地服务器、电脑睡眠或关机期间不会采集历史。
- 首次打开项目的AI解读可能等待几十秒。
- README读取目前根据各平台公开路径尝试，失败时会退回元数据分析。
- 小模型可能误判成熟度、硬件要求或用途，未知信息必须人工核查。
- 许可证结论不是法律意见。
- 候选池不是全网全量项目。
- Gitee目前可能只显示外部搜索入口。
- 跨平台镜像尚未完整去重。
- 收藏仍主要保存在浏览器，请保留JSON备份。

## 下一阶段候选

Phase 0.3-C优先考虑：

1. 用户Windows真实Ollama生成验收
2. 中文解读手工纠错与编辑
3. 收藏项目优先生成和追踪
4. 跨平台同项目身份去重
5. 历史与解读数据导出、备份和迁移
6. Codex MCP与仓库级接入审计
