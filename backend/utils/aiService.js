const axios = require('axios');
require('dotenv').config();

class AIService {
  constructor() {
    // 初始化配置
    this.aiConfig = this.initConfig();
    // 缓存常用配置，避免重复读取
    this.modelscopeConfig = {
      baseUrl: this.aiConfig.apiBaseUrl,
      modelId: this.aiConfig.modelId,
      token: this.aiConfig.token
    };
  }

  /**
   * 初始化AI服务配置（新增modelscope类型）
   */
  initConfig() {
    // 修复布尔值转换：环境变量是字符串，需显式转换
    const useMock = process.env.USE_MOCK_AI === 'true' || process.env.USE_MOCK_AI === undefined;
    const serviceType = process.env.AI_SERVICE_TYPE || 'modelscope'; // 默认为魔搭

    // 基础配置
    const baseConfig = {
      useMock,
      serviceType,
    };

    // 魔搭社区（ModelScope）配置
    if (serviceType === 'modelscope') {
      return {
        ...baseConfig,
        token: process.env.MODELSCOPE_TOKEN, // 魔搭访问令牌
        modelId: process.env.MODELSCOPE_MODEL_ID || 'qwen-7b-chat', // 魔搭模型ID
        apiBaseUrl: process.env.MODELSCOPE_API_BASE_URL || 'https://modelscope.cn/api/v1/models', // 魔搭基础API地址
      };
    }

    // 保留原有配置（可选，若需要兼容其他AI服务）
    return baseConfig;
  }

  /**
   * 【魔搭社区专用】发送API请求（适配魔搭的请求/响应格式）
   * @param {Array} messages - 对话消息列表（[{role: 'user/system', content: '内容'}]）
   * @param {Object} options - 推理参数（temperature、max_new_tokens等）
   */
  async sendModelscopeRequest(messages, options = {}) {
    const { temperature = 0.7, max_new_tokens = 300 } = options;

    // 验证魔搭配置
    if (!this.aiConfig.token) {
      throw new Error('魔搭社区访问令牌未配置（MODELSCOPE_TOKEN）');
    }
    if (!this.aiConfig.modelId) {
      throw new Error('魔搭模型ID未配置（MODELSCOPE_MODEL_ID）');
    }

    try {
      // 构造魔搭API的请求地址：{baseUrl}/{modelId}/inference
      const requestUrl = `${this.aiConfig.apiBaseUrl}/${this.aiConfig.modelId}/inference`;

      // 魔搭API的请求体（不同模型的input格式需匹配，主流对话模型支持messages）
      const requestBody = {
        input: {
          messages: messages, // 核心输入：对话消息数组
        },
        parameters: {
          temperature, // 随机性
          max_new_tokens, // 最大生成长度
          top_p: 0.9, // 可选参数，提升生成多样性
        },
      };

      // 发送请求（携带魔搭令牌）
      const response = await axios.post(requestUrl, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.aiConfig.token}`, // 魔搭的认证方式
        },
        // 超时配置，避免请求挂起
        timeout: 30000,
      });

      // 解析魔搭的响应（不同模型的output格式略有差异，以下是通用解析）
      const result = response.data;

      // 处理错误响应
      if (result.code !== 0 && result.error) {
        throw new Error(`魔搭API错误：${result.error}（代码：${result.code}）`);
      }

      // 提取返回内容（主流模型的output是对象或数组，优先取content/message/result）
      const aiResponse = this.extractModelscopeResponse(result.output);
      if (!aiResponse) {
        throw new Error('魔搭API返回内容为空，请检查模型ID或输入格式');
      }

      return aiResponse.trim();
    } catch (error) {
      // 区分网络错误和API错误
      const errorMsg = error.response?.data?.error || error.message || '魔搭API请求失败';
      console.error('魔搭API调用失败:', errorMsg);
      throw new Error(`AI生成失败：${errorMsg}`);
    }
  }

  /**
   * 解析魔搭模型的响应内容（兼容不同模型的输出格式）
   * @param {*} output - 魔搭API返回的output字段
   * @returns {string} - 解析后的文本内容
   */
  extractModelscopeResponse(output) {
    // 情况1：output是对象，包含content字段（如qwen-7b-chat、llama3-8b-chat）
    if (output && typeof output === 'object' && output.content) {
      return output.content;
    }
    // 情况2：output是数组，取第一个元素的content（部分模型）
    if (Array.isArray(output) && output.length > 0 && output[0].content) {
      return output[0].content;
    }
    // 情况3：output是字符串（少数模型）
    if (typeof output === 'string') {
      return output;
    }
    // 情况4：其他格式，转为字符串后返回
    return JSON.stringify(output);
  }

  /**
   * 统一的AI请求发送方法（现在默认调用魔搭API）
   */
  async sendAIRequest(messages, options = {}) {
    if (this.aiConfig.serviceType === 'modelscope') {
      return await this.sendModelscopeRequest(messages, options);
    }
    // 保留扩展空间，若后续需要添加其他AI服务可在此补充
    throw new Error(`不支持的AI服务类型：${this.aiConfig.serviceType}`);
  }

  // ==================== 原有业务方法（完全保留，仅底层调用魔搭API） ====================
  async generateStoryContent(params) {
    const { context, prompt, style = 'classic', length = 200 } = params;

    // 验证必要参数
    if (!context || !prompt) {
      throw new Error('上下文和提示信息不能为空');
    }

    // Mock模式（开发阶段使用）
    if (this.aiConfig.useMock) {
      return this.generateMockStoryContent(params);
    }

    try {
      // 构造对话消息（和原有逻辑一致，魔搭模型支持OpenAI风格的messages）
      const messages = [
        {
          role: 'system',
          content: `你是一位专业的故事作家，擅长按照用户要求的风格生成故事内容。请根据上下文和提示，生成一段${length}字左右的故事内容，风格为${style}。`,
        },
        {
          role: 'user',
          content: `上下文：${context}\n\n提示：${prompt}`,
        },
      ];

      // 发送请求（魔搭的max_new_tokens对应tokens数，1个中文字≈0.75个token）
      return await this.sendAIRequest(messages, {
        max_new_tokens: Math.ceil(length / 0.75),
        temperature: 0.7,
      });
    } catch (error) {
      console.error('生成故事内容失败:', error.message);
      throw new Error(`AI生成失败：${error.message}`);
    }
  }

  async generateCharacterDialogue(params) {
    const { context, prompt, characters = ['主角', '配角'], style = 'dialogue' } = params;

    if (!context || !prompt) {
      throw new Error('上下文和提示信息不能为空');
    }

    if (this.aiConfig.useMock) {
      return this.generateMockCharacterDialogue(params);
    }

    try {
      const messages = [
        {
          role: 'system',
          content: `你是一位专业的编剧，擅长撰写符合角色性格的对话。请根据角色信息、上下文和提示，生成一段${style}风格的对话，涉及以下角色：${characters.join('、')}。`,
        },
        {
          role: 'user',
          content: `上下文：${context}\n\n提示：${prompt}`,
        },
      ];

      return await this.sendAIRequest(messages, {
        max_new_tokens: 300,
        temperature: 0.8,
      });
    } catch (error) {
      console.error('生成角色对话失败:', error.message);
      throw new Error(`AI生成失败：${error.message}`);
    }
  }

  async generateBranchSuggestions(params) {
    const { currentContent, style = 'classic', count = 3 } = params;

    if (!currentContent) {
      throw new Error('当前故事内容不能为空');
    }

    if (this.aiConfig.useMock) {
      return this.generateMockBranchSuggestions(params);
    }

    try {
      const messages = [
        {
          role: 'system',
          content: `你是一位专业的故事架构师，擅长设计故事分支。请根据当前故事内容，生成${count}个不同的故事分支建议，风格为${style}。每个建议用分号分隔，格式为："选项文本|分支描述"。`,
        },
        {
          role: 'user',
          content: `当前故事内容：${currentContent}`,
        },
      ];

      const suggestionsStr = await this.sendAIRequest(messages, {
        max_new_tokens: 300,
        temperature: 0.9,
      });

      // 解析返回的字符串为数组（和原有逻辑一致）
      return suggestionsStr.split(';').map(item => {
        const [text, description] = item.split('|').map(s => s.trim());
        return {
          text: text || '未知选项',
          description: description || '无描述',
        };
      }).filter(item => item.text);
    } catch (error) {
      console.error('生成分支建议失败:', error.message);
      throw new Error(`AI生成失败：${error.message}`);
    }
  }

  async convertStoryStyle(params) {
    const { content, targetStyle = 'classic' } = params;

    if (!content) {
      throw new Error('原始故事内容不能为空');
    }

    if (this.aiConfig.useMock) {
      return this.generateMockStyleConversion(params);
    }

    try {
      const messages = [
        {
          role: 'system',
          content: `你是一位专业的文体转换专家，擅长将文本转换为不同的风格。请将以下内容转换为${targetStyle}风格，保持原意不变。`,
        },
        {
          role: 'user',
          content: content,
        },
      ];

      return await this.sendAIRequest(messages, {
        max_new_tokens: Math.ceil(content.length / 0.75),
        temperature: 0.7,
      });
    } catch (error) {
      console.error('转换故事风格失败:', error.message);
      throw new Error(`AI转换失败：${error.message}`);
    }
  }

  // ==================== 模拟AI生成方法（完全保留，开发阶段使用） ====================
  generateMockStoryContent(params) {
    const { context, prompt, style } = params;
    const mockContents = {
      classic: `在${context}的背景下，${prompt}。故事在古老的城堡中缓缓展开，月光洒在石墙上，投下斑驳的影子。每一个细微的声音都在诉说着过往的秘密，仿佛时间在这里停滞了一般。`,
      modern: `基于${context}，${prompt}。现代都市的喧嚣中，人们行色匆匆，却很少有人注意到身边正在发生的故事。每个人都有自己的秘密，而这些秘密正是故事最精彩的部分。`,
      humor: `话说${context}，然后${prompt}。这可真是个让人啼笑皆非的场景，谁能想到事情会发展到这个地步呢？不过话说回来，生活不就是这样充满了意外和惊喜吗？`,
      poetic: `${context}，${prompt}。春风拂面，花香四溢，远处传来悠扬的笛声。在这个美好的时刻，一切都显得那么和谐，仿佛整个世界都在为这个故事喝彩。`,
      fast: `${context}，${prompt}！没有时间犹豫，必须立刻行动。每一秒都至关重要，任何延误都可能导致不可挽回的后果。这是一场与时间的赛跑，也是一次对勇气的考验。`,
    };

    return mockContents[style] || mockContents.classic;
  }

  generateMockCharacterDialogue(params) {
    const { characters = ['主角', '配角'], context, prompt } = params;
    const mockDialogues = [
      `${characters[0]}："${prompt}"\n${characters[1]}："这听起来很有趣，让我想想..."`,
      `${characters[0]}："我们该怎么办？"\n${characters[1]}："别担心，我有个计划。"`,
      `${characters[2]}："你确定这样做没问题吗？"\n${characters[1]}："相信我，不会有事的。"`,
      `${characters[0]}："太棒了！我们成功了！"\n${characters[1]}："是的，我们做到了！"`,
    ];

    return mockDialogues[Math.floor(Math.random() * mockDialogues.length)];
  }

  generateMockBranchSuggestions(params) {
    const { currentContent, count } = params;
    const mockSuggestions = [
      { text: '继续前进', description: '主角决定按照原计划继续前进，探索未知的领域。' },
      { text: '返回安全地带', description: '主角感到不安，决定暂时返回安全的地方。' },
      { text: '与陌生人交谈', description: '主角遇到了一个神秘的陌生人，决定与之交谈。' },
      { text: '调查异常现象', description: '主角注意到了一个异常现象，决定深入调查。' },
      { text: '做出重要决定', description: '主角需要做出一个可能改变命运的重要决定。' },
    ];

    return mockSuggestions.slice(0, count);
  }

  generateMockStyleConversion(params) {
    const { content, targetStyle } = params;
    const mockConversions = {
      classic: `[经典风格转换] ${content}`,
      modern: `[现代风格转换] ${content}`,
      humor: `[幽默风格转换] ${content}`,
      poetic: `[诗意风格转换] ${content}`,
      fast: `[快节奏转换] ${content}`,
    };

    return mockConversions[targetStyle] || `[转换为${targetStyle}] ${content}`;
  }
}

module.exports = new AIService();