const axios = require('axios');

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';

/**
 * 调用 DeepSeek Chat Completion API（非流式）
 * @param {Array} messages - 对话消息数组 [{role, content}, ...]
 * @param {Object} options - 可选参数 {temperature, max_tokens, ...}
 * @returns {Promise<string>} 返回模型生成的文本内容
 */
async function chatCompletion(messages, options = {}) {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY 未配置');
  }

  const {
    temperature = 0.8,
    max_tokens = 4096,
    top_p = 0.9,
    frequency_penalty = 0.3,
    presence_penalty = 0.3
  } = options;

  try {
    const response = await axios.post(
      `${DEEPSEEK_BASE_URL}/chat/completions`,
      {
        model: 'deepseek-chat',
        messages,
        temperature,
        max_tokens,
        top_p,
        frequency_penalty,
        presence_penalty
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        timeout: 120000
      }
    );

    if (response.data && response.data.choices && response.data.choices.length > 0) {
      const content = response.data.choices[0].message.content;
      console.log(`[DeepSeek] 生成完成，${content.length} 字符，tokens: ${response.data.usage?.total_tokens || 'N/A'}`);
      return content;
    }

    throw new Error('DeepSeek API 返回数据格式异常');
  } catch (error) {
    if (error.response) {
      console.error('[DeepSeek] API 错误:', error.response.status, JSON.stringify(error.response.data));
      throw new Error(`DeepSeek API 错误 (${error.response.status}): ${error.response.data?.error?.message || '未知错误'}`);
    }
    console.error('[DeepSeek] 请求失败:', error.message);
    throw error;
  }
}

/**
 * 流式调用 DeepSeek Chat Completion API
 * @param {Array} messages - 对话消息数组
 * @param {Function} onChunk - 每个 chunk 的回调 (text: string)
 * @param {Object} options - 可选参数
 * @returns {Promise<string>} 返回完整文本
 */
async function chatCompletionStream(messages, onChunk, options = {}) {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY 未配置');
  }

  const {
    temperature = 0.8,
    max_tokens = 4096
  } = options;

  const response = await axios.post(
    `${DEEPSEEK_BASE_URL}/chat/completions`,
    {
      model: 'deepseek-chat',
      messages,
      temperature,
      max_tokens,
      stream: true
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      responseType: 'stream',
      timeout: 180000
    }
  );

  let fullContent = '';
  return new Promise((resolve, reject) => {
    let buffer = '';
    response.data.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const jsonStr = trimmed.slice(6);
        if (jsonStr === '[DONE]') continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            fullContent += delta;
            if (onChunk) onChunk(delta);
          }
        } catch (e) {
          // 忽略解析失败的行
        }
      }
    });

    response.data.on('end', () => resolve(fullContent));
    response.data.on('error', reject);
  });
}

module.exports = { chatCompletion, chatCompletionStream };
