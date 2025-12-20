// aiService/aiService.js
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

/**
 * 调用智谱 AI 生成专业故事内容
 * @param {Object} storyData - 包含故事背景的对象
 * @param {string} storyData.title - 故事标题
 * @param {string} storyData.description - 故事简介
 * @param {string} storyData.style - 故事风格（文学、搞笑等）
 * @param {string} storyData.category - 故事类别（戏剧、恐怖、爱情等）
 * @param {string} storyData.userInput - 用户当前的具体输入或要求
 */
async function generateAIResponse({ title, description, style, category, userInput }) {
  const apiKey = process.env.ZHIPU_API_KEY;
  const url = "https://open.bigmodel.cn/api/paas/v4/chat/completions";

  // 构建系统提示词（调教 AI 的核心）
  const systemPrompt = `你是一位享誉全球的专业故事作家和创意导师。
你的任务是根据用户提供的元数据进行创作。
请始终遵守以下设定：
1. 风格定位：${style || '通用'}
2. 题材类别：${category || '剧情'}
3. 创作基调：如果风格是“文学风”，请使用优美、深沉、多修辞的语言；如果风格是“搞笑风”，请使用幽默、夸张、有梗的语言。
4. 逻辑一致性：必须严格遵循故事标题《${title || '未命名'}》和简介“${description || '无'}”所设定的背景。`;

  // 构建用户提示词
  const userPrompt = `基于以上设定，请处理以下内容或指令：\n${userInput}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "glm-4-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.8, // 略微调高随机性，增加文学创意
        top_p: 0.9
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`智谱 API 错误: ${data.error?.message || response.statusText}`);
    }

    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('AI Service Error:', error);
    throw error;
  }
}

module.exports = { generateAIResponse };
