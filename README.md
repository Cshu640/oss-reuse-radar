# OpenRadar · 开源项目雷达

面向个人、独立开发者与 Codex 工作流的跨平台开源项目发现、真实增长、中文解读、统一项目档案和研究任务生成工具。

## Phase 0.3-C

当前版本包含五条主线：

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
   - 所有项目先显示不耗算力的规则摘要
   - 点击“中文解读”后调用本机 Ollama
   - 默认模型 `qwen3:4b`
   - 结果持久化到 `data/insights.json`
4. **保守型跨平台项目去重与统一详情页**
   - 相同作者/组织与项目名可作为强身份信号
   - 项目显式互相链接时可合并
   - 仅名称相同、作者不同的项目不会合并
   - 详情页保留所有平台来源、指标、许可证和历史状态
5. **一键准备 Codex 研究任务**
   - 生成完整 `RESEARCH_TASK.md`
   - 生成机器可读 `project-context.json`
   - 自动复制研究任务到剪贴板
   - 本地写入 `exports/codex/<时间-项目名>/`
   - 当前版本不会自动启动 Codex，也不会在用户不知情时消耗额度

Gitee保留为受限来源。当官方API和公开页面均无法稳定返回项目时，只提供外部搜索入口，不参与实时榜单和历史增长。

## 跨平台去重原则

OpenRadar采用**宁可漏合并，也不错误合并**的策略。目前只使用相对强的身份信号：

- 不同平台上的标准化 `作者/项目名` 完全一致；
- Hugging Face、ModelScope或其他项目元数据显式链接到某个代码仓库；
- 两个来源显式引用同一个受支持项目地址。

不会因为以下弱信号自动合并：

- 只有项目名称相同；
- 只有简介相似；
- 只有Topic或技术栈相同；
- 只是Fork、重写、量化版本或第三方镜像，但没有明确关联证据。

统一详情页会显示合并原因和全部来源。正式采用前仍应让Codex或人工核验是否确属同一项目。

## 统一项目详情页

点击项目名称或“查看详情”，可以看到：

- 统一中文情报与本地AI解读；
- 项目分类、用途类型、技术语言和Topic；
- 各平台来源与主来源；
- 每个来源各自的Stars、Forks、Likes或Downloads；
- 各来源历史增长状态；
- 许可证差异；
- 一键收藏、分享详情链接；
- Codex研究任务生成入口。

详情地址使用本地Hash路由，例如：

```text
http://localhost:8080/#project=entity%3Axxxx
```

该链接依赖当前雷达已加载到对应项目，不是公网永久页面。

## Codex研究包

点击详情页中的“生成并复制研究任务”，OpenRadar会准备一份研究任务，要求Codex：

- 先读取 `AGENTS.md`、`HANDOFF.md`、`docs/PROJECT_STATE.json` 和最新交接记录；
- 核验跨平台身份关系；
- 审计README、LICENSE、Release、Issue/PR和关键代码；
- 区分完整产品、组件、模型、Demo与研究代码；
- 检查许可证、第三方依赖、安全和供应链风险；
- 核对Windows、Docker、GPU、8GB显存和外部API要求；
- 给出接入方式、成本、替代项目和明确结论；
- 只研究，不直接修改或集成当前项目；
- 在结束时更新完整交接和机器可读状态。

生成文件位置：

```text
exports/codex/<时间-项目名>/RESEARCH_TASK.md
exports/codex/<时间-项目名>/project-context.json
```

这些研究包是本地临时文件，默认不会提交到Git。当前版本的“一键”含义是**生成、保存并复制研究任务**；仍需用户自己在Codex中新建任务并粘贴。自动启动Codex、自动选择仓库或直接执行研究不在本阶段范围内。

## 中文大白话会说明什么

每次本地AI解读会输出：

- 它到底是干什么的；
- 适合谁；
- 怎么使用或接入；
- 许可证与商业使用风险；
- 安装、系统、显存和外部服务门槛；
- 交给Codex有什么价值；
- 对当前用户设备和项目的适配度；
- 主要风险；
- 明确的下一步建议。

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

Ollama通常会在Windows后台运行。OpenRadar访问：

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
OpenRadar Phase 0.3-C
Local: http://localhost:8080
History: 本地快照已启用
Insights: 本地Ollama中文解读已启用
Identity: 跨平台保守去重与统一项目详情已启用
Codex: 本地研究包导出已启用
```

## 从旧版本升级

新版通常解压到新文件夹。为了保留已积累数据：

1. 在旧版“我的收藏”点击“导出JSON”备份收藏；
2. 在旧终端按 `Ctrl + C`；
3. 解压新版，但暂时不要启动；
4. 从旧版复制以下文件到新版同名 `data` 文件夹：

```text
data/history.json
data/insights.json
```

5. 再启动新版；
6. 保持地址仍为 `http://localhost:8080`，浏览器收藏通常会继续存在；
7. 页面仍是旧资源时按 `Ctrl + F5`。

不要用源码包里的空 `data` 文件夹覆盖旧数据。`history.json`和`insights.json`删除后无法自动恢复。

## 本地数据

### 历史快照

```text
data/history.json
```

- 默认保留约400天；
- 只保存公开项目标识和公开指标；
- 不上传第三方；
- 删除后增长历史从零重新积累。

### 中文解读缓存

```text
data/insights.json
```

- 生成一次后本地复用；
- 项目元数据变化后自动失效；
- 不提交到Git；
- 删除后只会丢失解读缓存。

### Codex研究包

```text
exports/codex/
```

- 每次点击生成一个独立目录；
- 包含Markdown任务和JSON上下文；
- 默认被 `.gitignore` 排除；
- 可以随时手工删除，不影响雷达、历史、解读或收藏。

### 浏览器收藏

继续使用：

```text
openradar:favorites:v1
```

请定期在“我的收藏”中导出JSON备份。

## 本地AI资源保护

- 不自动批量分析全部项目；
- 只有点击“中文解读”才调用模型；
- 每次只生成一个项目；
- README最多截取有限内容；
- 使用结构化JSON输出；
- 生成完成后通过 `keep_alive: 0` 立即卸载模型；
- 项目未更新时读取缓存；
- Ollama未连接时仍可使用规则摘要。

## 历史增长规则

第一次启动不能凭空产生历史数据：

- 24小时增长：历史跨度达到约20小时后启用；
- 7天增长：历史跨度达到约6天后启用；
- 30天增长：历史跨度达到约25天后启用。

不同平台先计算平台内部增长百分位，不直接混比Star、Like与Downloads原始数字。去重后的详情仍保留每个来源独立的历史序列，历史文件schema没有改变。

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
GET  /api/codex/status
POST /api/codex/export
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

- Gitee同源兼容通道；
- 本地历史保存与后台采集；
- Ollama中文解读；
- 中文解读持久化缓存；
- Codex研究包写入本地目录。

静态模式仍能在浏览器中生成并复制Codex研究提示词，但不能写入 `exports/codex`。正式使用应运行：

```bash
node server.mjs
```

## 当前限制

- 用户Windows尚未验收Phase 0.3-C；当前仅完成本地、模拟浏览器和HTTP验证。
- 去重规则较保守，会漏掉作者名不同、未显式互链的官方镜像或配套项目。
- 相同作者与项目名也可能存在极少数无关项目，采用前仍需核验。
- 本地Hash详情链接不是公网永久链接。
- “一键交给Codex”不会自动启动Codex或绑定当前仓库。
- 本地服务器、电脑睡眠或关机期间不会采集历史。
- 首次AI解读可能等待几十秒。
- README读取失败时会退回元数据分析。
- 小模型可能误判成熟度、硬件要求或用途。
- 许可证结论不是法律意见。
- 候选池不是全网全量项目。
- Gitee目前可能只显示外部搜索入口。
- 收藏仍主要保存在浏览器，请保留JSON备份。

## 下一项唯一验收任务

在Windows运行Phase 0.3-C：

1. 搜索一个同时出现在GitHub、Hugging Face或ModelScope的项目；
2. 确认项目卡显示“已合并N个来源”；
3. 打开统一详情页，核对所有来源；
4. 点击“生成并复制研究任务”；
5. 确认 `exports/codex/` 中出现两个文件；
6. 将研究任务粘贴到Codex新任务中，但本轮只验证任务包，不要求Codex真正完成研究。
