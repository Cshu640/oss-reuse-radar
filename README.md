# OpenRadar · 开源项目雷达

面向个人、独立开发者与 Codex 工作流的跨平台开源项目发现、真实增长、中文解读、可信度初筛、人工身份纠错、完整数据迁移和研究任务生成工具。

## Phase 0.4-A

当前版本已经形成一条完整的本地开源情报链路：

1. **五个平台实时项目数据**
   - GitHub
   - Hugging Face
   - GitLab
   - Codeberg
   - ModelScope
   - Gitee保留受限外部搜索入口，不参与真实增长
2. **真实历史快照**
   - 启动即采集，之后每6小时采集
   - 保存 Stars、Forks、Likes、Downloads
   - 历史跨度足够后才显示真实24小时、7天与30天增长
3. **免费中文大白话**
   - 所有项目先显示不耗算力的规则摘要
   - 点击后调用本机 Ollama `qwen3:4b`
   - 结果缓存到 `data/insights.json`
4. **跨平台身份图谱**
   - 强信号自动合并
   - 手工合并、拆分、指定主来源
   - 人工决定保存到 `data/identity-overrides.json`
5. **统一项目详情页**
   - 保留全部平台来源和原始指标
   - 显示许可证差异、增长、中文解读和来源证据
6. **免费可信度与供应链初筛**
   - OpenSSF Scorecard安全实践信号
   - deps.dev仓库、软件包、许可证和依赖映射
   - OSV已映射软件包版本的已知漏洞查询
   - 自动结论明确标记为规则判断，不是安全认证
7. **完整备份和版本迁移**
   - 一键导出收藏、人工纠错、历史、AI解读、可信度报告和Codex研究包
   - 新版本一键导入，导入后重启本地服务
8. **一键准备 Codex 研究包**
   - `RESEARCH_TASK.md`
   - `project-context.json`
   - 自动复制任务，但不会自动启动Codex或消耗额度

## 可信度初筛的边界

详情页点击“运行免费审计”后，OpenRadar通过本地Node服务按需访问公开接口：

- OpenSSF Scorecard：项目公开安全实践信号；
- deps.dev：代码仓库和软件包生态关联；
- OSV：明确软件包版本的已知漏洞关联。

界面区分四种来源：

- **事实数据**：第三方公开接口返回的原始信息；
- **规则判断**：OpenRadar根据事实生成的本地风险提示；
- **本地AI**：Ollama生成的大白话解读；
- **人工确认**：用户手工合并、拆分或指定主来源。

没有公开数据不等于安全，也不等于不安全；未返回漏洞不代表项目无漏洞。正式采用前仍需让Codex或人工检查代码、依赖、安装脚本、许可证和第三方资产。

## 人工合并、拆分和主来源

自动去重坚持“宁可漏合并，也不错误合并”。详情页可以：

- 把两个独立实体人工合并；
- 将误合并的某个来源拆出；
- 指定GitHub、Hugging Face、ModelScope等任一来源为主来源；
- 清除与当前项目相关的人工规则。

人工规则存储于：

```text
data/identity-overrides.json
```

浏览器同时保留兼容副本：

```text
openradar:identity-overrides:v1
```

## 完整备份与升级

升级前进入“我的收藏”或“观察名单”，点击：

```text
完整备份 / 导出全部
```

生成的备份包含：

- 收藏、标签、备注和下一步动作；
- 页面筛选设置；
- 人工身份纠错；
- `data/history.json`；
- `data/insights.json`；
- `data/trust.json`；
- `exports/codex/`中的研究包。

升级步骤：

1. 旧版导出完整备份；
2. 在旧终端按 `Ctrl + C`；
3. 解压新版；
4. 启动新版；
5. 点击“导入备份”；
6. 确认替换新版目录中的本地数据；
7. 关闭并重新运行 `start-openradar.cmd`。

从0.3-C或更早版本升级且没有完整备份时，仍可手工复制：

```text
data/history.json
data/insights.json
```

## 推荐启动方式

进入同时包含 `index.html` 与 `server.mjs` 的 `open-source-radar` 文件夹。

### Windows

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
OpenRadar Phase 0.4-A
History: 本地快照已启用
Insights: 本地Ollama中文解读已启用
Identity: 人工合并/拆分与主来源纠错已启用
Trust: OpenSSF Scorecard、deps.dev与OSV按需免费审计已启用
Backup: 完整迁移已启用
Codex: 本地研究包导出已启用
```

## 本地数据

```text
data/history.json             # 历史指标
data/insights.json            # 中文AI解读缓存
data/identity-overrides.json  # 人工身份纠错
data/trust.json               # 可信度审计缓存
exports/codex/                # Codex研究包
```

这些都是本地运行数据，默认被Git忽略。不要删除仍有价值的数据；建议每次升级前导出完整备份。

浏览器收藏键继续保持：

```text
openradar:favorites:v1
```

## 历史增长规则

第一次启动不能凭空产生历史数据：

- 24小时增长：历史跨度达到约20小时后启用；
- 7天增长：历史跨度达到约6天后启用；
- 30天增长：历史跨度达到约25天后启用。

不同平台先计算平台内部增长百分位，不直接混比Star、Like与Downloads原始数字。

## Codex研究包

详情页点击“生成并复制研究任务”后写入：

```text
exports/codex/<时间-项目名>/RESEARCH_TASK.md
exports/codex/<时间-项目名>/project-context.json
```

若已经运行可信度初筛，研究包会包含初始风险事实与规则警告，但Codex仍被要求重新核验全部证据。当前版本不会自动启动Codex、选择仓库、执行命令或消耗额度。

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
GET  /api/identity/overrides
POST /api/identity/overrides
GET  /api/trust/status
GET  /api/trust
POST /api/trust/analyze
GET  /api/backup/status
POST /api/backup/export
POST /api/backup/import
GET  /api/codex/status
POST /api/codex/export
```

## 静态兼容模式

仍可使用：

```bash
npx --yes serve . -l 8080
```

但静态模式缺少：

- Gitee同源兼容通道；
- 本地历史保存与后台采集；
- Ollama中文解读与缓存；
- 人工身份规则文件同步；
- OpenSSF、deps.dev和OSV可信度服务；
- 完整备份中的服务器数据；
- Codex研究包本地写入。

正式使用应运行 `node server.mjs`。

## 当前限制

- Phase 0.4-A代码与本地模拟已通过，但尚未在用户Windows真实环境验收。
- 开发容器无法访问真实OpenSSF、deps.dev和OSV上游，因此真实返回结构、网络和限频仍需Windows验证。
- OpenSSF、deps.dev和OSV覆盖并不完整；缺少结果不能当作安全证明。
- 人工纠错规则可能因项目平台ID变化而需要重新确认。
- 完整导入会替换本地数据，操作前必须保留当前备份。
- 导入后必须重启Node服务，单纯刷新网页不会重新载入服务器内存缓存。
- 本地服务器关闭、电脑睡眠或关机时历史会出现缺口。
- 自然时间7天和30天增长仍需继续积累。
- Gitee仍可能只显示外部搜索入口。
- 许可证结论不是法律意见。

## 下一项唯一验收任务

在Windows运行Phase 0.4-A并完成四项真实验证：

1. 打开一个多来源项目，确认主来源卡文字清晰；
2. 测试指定主来源、拆分或人工合并，并确认重启后规则仍存在；
3. 对一个GitHub项目运行免费可信度审计，记录OpenSSF、deps.dev与OSV的真实结果或错误；
4. 导出完整备份，在新版测试目录导入并重启，确认收藏、历史、解读和研究包恢复。

验收前不得进入软件包生态、项目对比器或Codex MCP开发。
