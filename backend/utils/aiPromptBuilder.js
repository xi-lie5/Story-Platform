/**
 * AI 故事 Prompt 构建器
 * 将作者配置的世界观、角色、大纲等结构化数据组装成 System Prompt
 */

/**
 * 构建 AI 故事生成的完整 System Prompt
 * @param {Object} config - 故事配置 {title, worldSetting, style, characters, outline, ...}
 * @returns {string} 组装好的 System Prompt
 */
function buildSystemPrompt(config) {
  const parts = [];

  // 开场白
  parts.push('你是一个专业的小说创作 AI，正在与读者共同创作一部精彩的互动小说。');
  parts.push('请严格遵守以下设定，根据读者的选择动态推进剧情。');
  parts.push('');

  // 故事元信息
  parts.push(`【故事标题】${config.title || '未命名故事'}`);
  if (config.category) parts.push(`【故事分类】${config.category}`);
  parts.push('');

  // 世界观设定
  if (config.worldSetting) {
    parts.push('【世界观设定】');
    parts.push(config.worldSetting);
    parts.push('');
  }

  // 角色卡
  if (config.characters && config.characters.length > 0) {
    parts.push('【角色设定】');
    config.characters.forEach((char, i) => {
      const tags = (char.personalityTags || char.personality_tags || []).join('、');
      const desc = char.description || '';
      parts.push(`${i + 1}. ${char.name}${tags ? `（${tags}）` : ''}${desc ? `：${desc}` : ''}`);
    });
    parts.push('');
  }

  // 故事大纲
  if (config.outline) {
    parts.push('【故事大纲（关键转折点）】');
    parts.push(config.outline);
    parts.push('');
  }

  // 风格指南
  if (config.style) {
    parts.push('【写作风格指南】');
    parts.push(`叙事视角：${config.style.narrative || '第三人称'}`);
    parts.push(`文风基调：${config.style.tone || '自然流畅'}`);
    parts.push(`篇幅控制：${config.style.length || '800-1500字/段'}`);
    if (config.style.taboos) parts.push(`禁忌内容：${config.style.taboos}`);
    parts.push('');
  }

  // 输出格式指令
  parts.push('【输出要求】');
  parts.push('1. 生成一个完整的叙事段落（800-1500字），以场景化描写推进剧情');
  parts.push('2. 在段落末尾给出 2-3 个有张力的分支选项，每个选项描述 15-30 字');
  parts.push('3. 每个分支选项必须基于当前情节发展，包含具体的行动或选择');
  parts.push('4. 保持人物性格一致，情节逻辑连贯');
  parts.push('5. 输出格式严格使用以下 JSON 结构：');
  parts.push('');
  parts.push('```json');
  parts.push('{');
  parts.push('  "content": "生成的叙事段落（800-1500字）",');
  parts.push('  "title": "本段小标题（简短，10字以内）",');
  parts.push('  "choices": [');
  parts.push('    {"text": "选项1描述（15-30字）", "hint": "可能的走向暗示（可选）"},');
  parts.push('    {"text": "选项2描述（15-30字）", "hint": "可能的走向暗示（可选）"}');
  parts.push('  ]');
  parts.push('}');
  parts.push('```');
  parts.push('');
  parts.push('请严格返回 JSON 格式内容，不要添加额外的解释或标记。');

  return parts.join('\n');
}

/**
 * 构建续写请求的 messages 数组（含历史上下文）
 * @param {Object} config - 完整故事配置
 * @param {Array} history - 对话历史 [{role, content}, ...]
 * @param {string} summary - 早期内容的摘要
 * @param {string} choice - 读者选择的分支文本
 * @returns {Array} DeepSeek API 格式的 messages 数组
 */
function buildContinuationMessages(config, history, summary, choice) {
  const systemPrompt = buildSystemPrompt(config);
  const messages = [{ role: 'system', content: systemPrompt }];

  // 如果有摘要，作为历史回顾插入
  if (summary) {
    messages.push({
      role: 'system',
      content: `【已发生的剧情摘要】${summary}`
    });
  }

  // 追加最近的历史对话
  if (history && history.length > 0) {
    const recentHistory = history.slice(-12); // 保留最近 12 轮（6 次对话）
    messages.push(...recentHistory);
  }

  // 读者选择
  messages.push({
    role: 'user',
    content: `读者选择了：${choice}\n请根据这个选择继续推进故事。`
  });

  return messages;
}

module.exports = { buildSystemPrompt, buildContinuationMessages };
