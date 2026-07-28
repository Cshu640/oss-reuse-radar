function text(value, max = 8_000) {
  return String(value || '').replace(/\u0000/g, '').trim().slice(0, max);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function list(values, fallback = '暂无') {
  const items = unique((Array.isArray(values) ? values : []).map((value) => text(value, 500)));
  return items.length ? items.map((item) => `- ${item}`).join('\n') : `- ${fallback}`;
}

function metricText(source) {
  const values = [
    Number(source?.stars) ? `Stars ${Number(source.stars).toLocaleString('zh-CN')}` : '',
    Number(source?.forks) ? `Forks ${Number(source.forks).toLocaleString('zh-CN')}` : '',
    Number(source?.likes) ? `Likes ${Number(source.likes).toLocaleString('zh-CN')}` : '',
    Number(source?.downloads) ? `Downloads ${Number(source.downloads).toLocaleString('zh-CN')}` : '',
  ].filter(Boolean);
  return values.join(' · ') || '暂无公开指标';
}

function sourceRows(project) {
  const sources = Array.isArray(project?.sourceProjects) && project.sourceProjects.length ? project.sourceProjects : [project];
  return sources.map((source) => `- ${text(source.platform, 80)}：${text(source.owner, 200)}/${text(source.name, 200)}\n  - 地址：${text(source.url, 2_000)}\n  - 指标：${metricText(source)}\n  - 许可证：${text(source.license, 300) || '待核查'}\n  - 最近更新：${text(source.updatedAt, 100) || '未知'}`).join('\n');
}

function riskRows(insight) {
  return list(insight?.risks, 'OpenRadar尚未完成代码、依赖和许可证审计');
}

export function codexExportSlug(project) {
  const value = `${text(project?.owner, 100)}-${text(project?.name, 140)}`
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}._-]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
  return value || 'open-source-project';
}

export function buildCodexResearchTask(project, insight = null, { generatedAt = new Date().toISOString() } = {}) {
  if (!project?.id || !project?.name) throw new Error('Project identity is required');
  const summary = text(insight?.summary || project?.plainSummary || project?.description, 2_000) || 'OpenRadar尚未生成中文摘要。';
  const sourceCount = Number(project.sourceCount || project.sourceProjects?.length || 1);
  const aliases = unique([project.entityId, project.id, ...(project.aliases || [])]);
  const confidence = text(insight?.confidence, 40) || 'unknown';

  return `# Codex 开源项目研究任务：${text(project.name, 300)}

> 由 OpenRadar 于 ${generatedAt} 生成。此任务只做研究、验证和接入评估，不得直接修改当前产品代码。

## 研究对象
- 项目：${text(project.owner, 300)}/${text(project.name, 300)}
- 聚合来源：${sourceCount} 个平台来源
- OpenRadar实体：${text(project.entityId || project.id, 500)}
- 别名：${aliases.join('、')}
- 分类：${text(project.category, 200) || '待分类'}
- 技术语言：${unique([project.language, ...(project.languages || [])]).join('、') || '待核查'}
- 许可证：${text(project.license, 300) || '待核查'}
- OpenRadar潜力分：${Number(project.score || 0) || '未计算'}

## 各平台来源
${sourceRows(project)}

## OpenRadar当前大白话判断
- 一句话：${summary}
- 它做什么：${text(insight?.whatItDoes, 2_000) || '需阅读README与代码后确认'}
- 使用方式：${text(insight?.useMode, 2_000) || '需核查'}
- 商用判断：${text(insight?.commercial, 2_000) || '不得仅凭项目卡判断，必须核查许可证原文与第三方依赖'}
- 运行门槛：${text(insight?.requirements, 2_000) || '需核查'}
- 对Codex的价值：${text(insight?.codexValue, 2_000) || '请判断适合Fork、抽取组件、调用API还是仅参考设计'}
- 对用户的适配：${text(insight?.fitForUser, 2_000) || '用户偏好低成本复用开源项目，由Codex实施，主要设备为Windows与NVIDIA 8GB显存'}
- 当前置信度：${confidence}

## 已知风险
${riskRows(insight)}

## 你的唯一任务
对上述开源项目进行**证据驱动的技术、许可证、维护和接入审计**，输出是否值得用于用户当前或未来项目。只研究，不集成，不修改现有仓库。

## 开工前强制步骤
1. 读取当前工作区的 \`AGENTS.md\`、\`HANDOFF.md\`、\`docs/PROJECT_STATE.json\`、\`docs/HANDOFF_LOG.md\` 最新记录；文件不存在时如实记录。
2. 检查真实 Git branch、HEAD、working tree、staging、tag、push、merge 状态。
3. 不得假设OpenRadar的摘要准确；必须打开上游项目、README、LICENSE、Release、Issue/PR和关键代码目录验证。
4. 优先寻找官方文档、原始仓库和许可证原文；不要使用二手文章代替关键证据。

## 必须完成的研究
1. **身份确认与去重**：确认这些平台来源是否确属同一项目、官方镜像、模型配套仓库或无关同名项目。
2. **功能边界**：用大白话解释它实际能做什么、不能做什么，区分完整产品、技术组件、模型、演示或研究代码。
3. **许可证审计**：核对主许可证、模型权重/数据/素材许可证、第三方依赖和商用限制；不确定时标为待法律复核。
4. **维护健康度**：查看最近Release、Commit、Issue响应、PR合并、贡献者数量、是否归档及明显停更风险。
5. **运行门槛**：核对Windows支持、Node/Python/Docker/GPU/API依赖、最低硬件、8GB显存可行性和部署复杂度。
6. **安全与供应链**：检查安装脚本、遥测、密钥处理、可疑二进制、已知漏洞和高风险依赖。
7. **接入方式**：分别判断直接安装、自托管、Fork、抽取模块、通过API接入或只参考设计的可行性。
8. **对用户项目的价值**：说明可用于哪些项目、替代哪个模块、预计节省什么工作、接入成本和主要冲突。
9. **替代方案**：找2—3个许可证和维护状态更合适的开源替代品，并进行简表比较。
10. **最终结论**：只能从“立即测试 / 收藏观察 / 仅参考 / 暂不投入 / 不建议采用”中选择一个，并给出证据。

## 禁止事项
- 不得直接修改、安装到或合并进当前项目。
- 不得因为Star、Like或下载量高就认定成熟。
- 不得把AI摘要当作许可证、性能或安全证据。
- 不得执行来历不明的安装脚本或二进制文件。
- 不得把代码完成、能启动或单元测试通过写成产品验收通过。
- 不得丢弃或覆盖已有交接历史。

## 交付物
建议写入 \`docs/research/open-source/${codexExportSlug(project)}.md\`，至少包含：
- 执行摘要
- 身份与来源核验
- 功能与架构
- 许可证矩阵
- 维护健康度
- 安装与硬件要求
- 安全和供应链风险
- 用户项目适配与接入方案
- 替代方案比较
- 明确结论与下一步
- 所有关键证据链接

## 任务结束强制交接
向 \`docs/HANDOFF_LOG.md\` **追加**记录，不覆盖历史；同步 \`HANDOFF.md\` 与 \`docs/PROJECT_STATE.json\`。必须如实写明当前阶段、分支和HEAD、已完成、未完成、阻塞、禁止事项、已知问题和风险、真实测试、工作区/暂存/提交/标签/推送/合并状态、下一项唯一任务和关键文件位置。

最后附上机器可读状态：

\`\`\`json
{
  "phase": "open-source-research",
  "status": "research_complete_unintegrated",
  "branch": "<actual-branch>",
  "head": "<actual-head>",
  "working_tree": "<clean-or-dirty>",
  "completed": [],
  "not_completed": [],
  "blocked_by": [],
  "tests": [],
  "next_task": ""
}
\`\`\`
`;
}

export function buildCodexProjectContext(project, insight = null, { generatedAt = new Date().toISOString() } = {}) {
  return {
    schemaVersion: 1,
    generatedAt,
    entityId: project.entityId || project.id,
    primaryProjectId: project.id,
    aliases: unique(project.aliases || [project.id]),
    name: text(project.name, 300),
    owner: text(project.owner, 300),
    category: text(project.category, 200),
    useTypes: unique(project.useTypes || []),
    sources: (Array.isArray(project.sourceProjects) && project.sourceProjects.length ? project.sourceProjects : [project]).map((source) => ({
      id: text(source.id, 500),
      platform: text(source.platform, 100),
      name: text(source.name, 300),
      owner: text(source.owner, 300),
      url: text(source.url, 2_000),
      description: text(source.description, 2_000),
      language: text(source.language, 200),
      license: text(source.license, 300),
      stars: Number(source.stars || 0),
      forks: Number(source.forks || 0),
      likes: Number(source.likes || 0),
      downloads: Number(source.downloads || 0),
      createdAt: text(source.createdAt, 100),
      updatedAt: text(source.updatedAt, 100),
      topics: unique(source.topics || []).slice(0, 40),
    })),
    insight: insight ? {
      source: text(insight.source, 100),
      model: text(insight.model, 100),
      confidence: text(insight.confidence, 40),
      summary: text(insight.summary, 2_000),
      whatItDoes: text(insight.whatItDoes, 2_000),
      commercial: text(insight.commercial, 2_000),
      requirements: text(insight.requirements, 2_000),
      codexValue: text(insight.codexValue, 2_000),
      fitForUser: text(insight.fitForUser, 2_000),
      risks: unique(insight.risks || []).slice(0, 12),
      recommendation: text(insight.recommendation, 2_000),
    } : null,
  };
}
