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
  parts.push('1. 生成一个完整的叙事段落（800-1200字，严禁超过1500字），以场景化描写推进剧情');
  parts.push('2. 保持人物性格一致，情节逻辑连贯');
  parts.push('3. 你必须只返回一个合法的 JSON 对象，不要输出任何 JSON 之外的文字、解释、Markdown 代码块标记或注释');
  parts.push('4. content 字段中只能包含纯故事正文，严禁把选项、编号、"你可以选择"之类的引导语写进正文');
  parts.push('5. 所有分支选项必须且只能放在 choices 数组中，提供 2-3 个有张力的选项，每个选项 15-30 字，且必须基于当前情节');
  parts.push('6. choices 数组不能为空；如果剧情走向结局，也要给出 2-3 个"结局后续"或"回顾"类选项，绝不要让 choices 为空');
  parts.push('7. 【关键】JSON 字段必须严格按 title → choices → content 的顺序输出（先输出简短的 title 和 choices 数组，最后才输出正文 content）。');
  parts.push('   这是硬性要求：因为 content 篇幅较长，如果放在前面，一旦输出接近长度上限被截断，choices 就会丢失导致故事卡死；');
  parts.push('   把 choices 放在 content 之前，可以确保即使 content 被截断，choices 依然完整、可用。');
  parts.push('8. 严格按以下 JSON 结构和字段顺序输出（字段名、层级、顺序必须完全一致）：');
  parts.push('');
  parts.push('{');
  parts.push('  "title": "本段小标题（10字以内）",');
  parts.push('  "choices": [');
  parts.push('    {"text": "选项1描述（15-30字）", "hint": "可选的走向暗示"},');
  parts.push('    {"text": "选项2描述（15-30字）", "hint": "可选的走向暗示"}');
  parts.push('  ],');
  parts.push('  "content": "生成的叙事段落纯正文（800-1500字，不含任何选项）"');
  parts.push('}');
  parts.push('');
  parts.push('再次强调：输出内容必须是能被 JSON.parse 直接解析的纯 JSON，字段顺序必须是 title、choices、content，选项只能出现在 choices 数组里，不能出现在 content 里。');
  parts.push('如果你感觉正文写得比较长，宁可主动收尾控制字数，也绝不能因为篇幅原因省略或截断 choices 字段。');

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

/**
 * 构建"结束故事"请求的 messages 数组。
 * 要求 AI 写出一个完整、有收束感的大结局，并且 choices 固定为空数组 []
 * （这是唯一允许 choices 为空的场景，用于生成 type='end' 的结局节点）。
 * @param {Object} config - 完整故事配置
 * @param {Array} history - 对话历史
 * @param {string} summary - 早期内容摘要
 * @param {string} choice - 读者的最后动作（可为空）
 * @returns {Array} DeepSeek API 格式的 messages 数组
 */
function buildEndingMessages(config, history, summary, choice) {
  const systemPrompt = buildSystemPrompt(config);
  const messages = [{ role: 'system', content: systemPrompt }];

  if (summary) {
    messages.push({ role: 'system', content: `【已发生的剧情摘要】${summary}` });
  }
  if (history && history.length > 0) {
    messages.push(...history.slice(-12));
  }

  messages.push({
    role: 'user',
    content: [
      choice && choice.trim() ? `读者的最后行动：${choice}` : '读者选择在此结束这个故事。',
      '',
      '现在请为这个故事写一个完整、合理、有收束感的【大结局】：',
      '1. 呼应前文的关键伏笔与人物弧光，给出明确的收尾，不要留下待续的悬念或新的分支；',
      '2. 这是最后一章，故事到此完结，因此 choices 必须是空数组 []（本次是唯一例外，明确要求 choices 为空）；',
      '3. 仍然只返回合法 JSON，字段顺序为 title、choices、content，其中 choices 固定为 []；',
      '4. content 为结局正文（600-1200字），语气收束，可在结尾自然点出故事的终结感。',
      '',
      '严格按此结构输出：',
      '{"title":"结局小标题","choices":[],"content":"结局正文"}'
    ].join('\n')
  });

  return messages;
}

/**
 * 健壮地解析 AI 返回的文本，提取 title / content / choices
 * 处理多种异常情况：Markdown 代码块包裹、JSON 前后有多余文字、
 * 因 max_tokens 截断导致 JSON 未闭合等
 *
 * 设计原则：只提取 AI 真实生成的内容，绝不编造/填充假数据兜底。
 * 如果提取结果不满足基本要求（正文过短或选项为空），交由调用方判断是否需要重试，
 * 而不是在这里塞入假选项掩盖问题。
 *
 * @param {string} rawText - AI 返回的原始文本
 * @returns {{title: string, content: string, choices: Array, truncated: boolean}}
 */
function parseAiResponse(rawText) {
  const text = String(rawText || '').trim();

  // 1. 优先尝试提取 ```json ... ``` 代码块中的内容
  let candidate = null;
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    candidate = fenceMatch[1].trim();
  }

  // 2. 如果没有代码块（很可能是被截断，代码块没有闭合），
  //    从第一个 { 开始截取；若存在闭合的 } 则用闭合区间，否则说明输出被截断，取到文本末尾
  if (!candidate) {
    const firstBrace = text.indexOf('{');
    if (firstBrace !== -1) {
      const lastBrace = text.lastIndexOf('}');
      candidate = lastBrace > firstBrace ? text.slice(firstBrace, lastBrace + 1) : text.slice(firstBrace);
    }
  }

  if (candidate) {
    // 3. 尝试严格 JSON.parse（最理想情况：AI 输出了完整合法的 JSON）
    try {
      const parsed = JSON.parse(candidate);
      const choices = normalizeChoices(parsed.choices);
      const content = typeof parsed.content === 'string' ? parsed.content.trim() : '';
      return {
        title: (parsed.title && String(parsed.title).trim()) || '续章',
        content,
        choices,
        truncated: false
      };
    } catch (e) {
      // 4. JSON.parse 失败（通常是因为 max_tokens 截断导致 JSON 未闭合）
      //    手动逐字符提取真实生成的字段内容，绝不编造数据
      return extractFieldsManually(candidate);
    }
  }

  // 5. 极端降级：AI 完全没有按 JSON 格式输出（纯文本）
  //    仍然只提取文本中真实存在的选项，提取不到就返回空数组，交给调用方重试
  const extractedChoices = extractChoicesFromText(text);
  return {
    title: '续章',
    content: stripChoicesFromText(text),
    choices: extractedChoices,
    truncated: true
  };
}

/**
 * 规范化 choices 数组：兼容字符串或 {text,hint} 对象，过滤空项
 */
function normalizeChoices(rawChoices) {
  if (!Array.isArray(rawChoices)) return [];
  return rawChoices
    .filter((c) => c && (typeof c === 'string' || c.text))
    .map((c) => (typeof c === 'string'
      ? { text: c.trim(), hint: '' }
      : { text: String(c.text).trim(), hint: c.hint || '' }))
    .filter((c) => c.text);
}

/**
 * 从字符串中扫描指定 key 对应的 JSON 字符串值，正确处理转义字符（\" \\ \n 等）。
 * 即使字符串因输出被截断而没有闭合引号，也能提取出已生成的部分内容。
 * @param {string} str - 源字符串
 * @param {string} key - 字段名，如 "content"
 * @returns {{found: boolean, value: string, complete: boolean, endIndex: number}}
 *   complete 表示该字符串值是否找到了闭合的引号（false 说明被截断）
 */
function extractJsonStringValue(str, key) {
  const keyPattern = new RegExp(`"${key}"\\s*:\\s*"`);
  const keyMatch = keyPattern.exec(str);
  if (!keyMatch) {
    return { found: false, value: '', complete: false, endIndex: -1 };
  }

  let i = keyMatch.index + keyMatch[0].length;
  let out = '';
  let complete = false;

  while (i < str.length) {
    const ch = str[i];
    if (ch === '\\') {
      // 转义序列：如果反斜杠是最后一个字符（被截断在转义符处），停止
      if (i + 1 >= str.length) break;
      const next = str[i + 1];
      const escapeMap = { '"': '"', '\\': '\\', 'n': '\n', 't': '\t', 'r': '\r', '/': '/' };
      if (escapeMap[next] !== undefined) {
        out += escapeMap[next];
        i += 2;
        continue;
      }
      if (next === 'u' && i + 5 < str.length) {
        const hex = str.slice(i + 2, i + 6);
        if (/^[0-9a-fA-F]{4}$/.test(hex)) {
          out += String.fromCharCode(parseInt(hex, 16));
          i += 6;
          continue;
        }
      }
      // 未知转义，原样跳过反斜杠
      i += 1;
      continue;
    }
    if (ch === '"') {
      complete = true;
      i += 1;
      break;
    }
    out += ch;
    i += 1;
  }

  return { found: true, value: out.trim(), complete, endIndex: i };
}

/**
 * 当 JSON 因输出截断等原因无法被 JSON.parse 解析时，
 * 手动逐字符扫描提取 title / choices / content 字段的真实内容（不编造任何数据）。
 * @param {string} jsonLike - 疑似 JSON 的文本（可能未闭合）
 * @returns {{title: string, content: string, choices: Array, truncated: boolean}}
 */
function extractFieldsManually(jsonLike) {
  const titleResult = extractJsonStringValue(jsonLike, 'title');
  const title = (titleResult.found && titleResult.value) || '续章';

  // choices 数组在字段顺序中位于 content 之前，因此只在 "content" 出现之前的区间里提取选项，
  // 避免正文中偶然出现的 "text" 字样被误判为选项
  const contentKeyIdx = jsonLike.search(/"content"\s*:\s*"/);
  const choicesScope = contentKeyIdx >= 0 ? jsonLike.slice(0, contentKeyIdx) : jsonLike;

  const choices = [];
  const textRegex = /"text"\s*:\s*"((?:[^"\\]|\\.)*)"(?:[\s\S]*?"hint"\s*:\s*"((?:[^"\\]|\\.)*)")?/g;
  let m;
  while ((m = textRegex.exec(choicesScope)) !== null) {
    const t = m[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').trim();
    const h = (m[2] || '').replace(/\\"/g, '"').trim();
    if (t) choices.push({ text: t, hint: h });
  }

  const contentResult = extractJsonStringValue(jsonLike, 'content');
  const content = contentResult.found ? contentResult.value : '';
  // 截断判定：content 字段没有找到闭合引号，说明输出确实在写正文时被截断
  const truncated = contentResult.found ? !contentResult.complete : true;

  return { title, content, choices, truncated };
}

/**
 * 从纯文本中剥离末尾的选项引导文本（当 AI 未按 JSON 返回时的兜底）
 */
function stripChoicesFromText(text) {
  let result = String(text || '');
  // 去掉残留的代码块标记
  result = result.replace(/```(?:json)?/gi, '').trim();
  // 去掉从"选项/选择/你可以"等引导词开始到结尾的部分
  const cutPatterns = [
    /\n+\s*(?:选项|选择|你的选择|接下来|你可以选择|请选择)[:：]?[\s\S]*$/,
    /\n+\s*(?:choices?|options?)[:：]?[\s\S]*$/i,
    /\n+\s*(?:1[\.、]\s*.+\n+\s*2[\.、]\s*)[\s\S]*$/
  ];
  for (const pattern of cutPatterns) {
    result = result.replace(pattern, '');
  }
  return result.trim();
}

/**
 * 从纯文本中尽力提取选项（当 AI 未按 JSON 返回时的兜底）
 * 匹配形如 "1. xxx" / "1、xxx" / "- xxx" 的行
 */
function extractChoicesFromText(text) {
  const choices = [];
  const lines = String(text || '').split('\n');
  for (const line of lines) {
    const m = line.match(/^\s*(?:\d+[\.、]|[-*])\s*(.+)$/);
    if (m && m[1].trim().length >= 2 && m[1].trim().length <= 60) {
      choices.push({ text: m[1].trim(), hint: '' });
    }
  }
  return choices.slice(0, 3);
}

module.exports = { buildSystemPrompt, buildContinuationMessages, buildEndingMessages, parseAiResponse };
