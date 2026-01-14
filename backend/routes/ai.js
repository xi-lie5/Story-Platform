const express = require('express');
const { body, validationResult } = require('express-validator');
const authGuard = require('../middleware/auth');
const { errorFormat } = require('../utils/errorFormat');

const router = express.Router();

// 调用qwen-max模型进行文本润色和扩写
router.post('/polish', authGuard, [
  body('title').trim().notEmpty().withMessage('故事标题不能为空'),
  body('category').optional().trim(),
  body('content').trim().notEmpty().withMessage('节点内容不能为空')
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errorFormat(400, '请求参数错误', errors.array().map((err) => ({ field: err.path, message: err.msg })), 10001));
  }

  try {
    const { title, category, content } = req.body;
    
    // 检查是否配置了DASHSCOPE_API_KEY
    const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
    if (!DASHSCOPE_API_KEY) {
      return next(errorFormat(500, 'AI服务未配置，请设置DASHSCOPE_API_KEY环境变量', [], 10013));
    }

    // 动态导入dashscope（如果未安装，会抛出错误）
    let payload;
    try {
      // dashscope 是 ES 模块，需要使用动态 import
      const dashscopeModule = await import('dashscope');
      // dashscope 导出的是 payload 函数（从 request.js）
      payload = dashscopeModule.payload;
      if (!payload) {
        throw new Error('dashscope 模块未导出 payload 函数');
      }
    } catch (error) {
      console.error('dashscope 导入失败:', error);
      return next(errorFormat(500, 'AI SDK未安装，请运行: npm install dashscope', [], 10013));
    }

    // 构建提示词
    const prompt = `你是一个专业的文学编辑和创作助手。请根据以下信息，对节点内容进行润色和扩写：

故事标题：${title}
${category ? `故事分类：${category}` : ''}

当前节点内容：
${content}

请对上述内容进行润色和扩写，要求：
1. 保持原有的故事情节和风格
2. 增强文字的表现力和感染力
3. 适当扩展细节，使内容更加丰富生动
4. 确保语言流畅自然
5. 保持与故事整体的连贯性

请直接返回润色和扩写后的内容，不要添加任何额外的说明或标记。`;

    console.log('调用qwen-max模型进行文本润色和扩写...');
    console.log('提示词长度:', prompt.length);

    // 调用qwen-max模型
    const GENERATION_URL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation";
    
    const requestData = {
      model: 'qwen-max',
      input: {
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      },
      parameters: {
        temperature: 0.7,
        max_tokens: 2000
      }
    };

    const response = await payload(GENERATION_URL, requestData, DASHSCOPE_API_KEY);

    console.log('========== DashScope API 响应 ==========');
    console.log('响应类型:', typeof response);
    console.log('响应是否为 null/undefined:', response === null || response === undefined);
    if (response) {
      console.log('响应键:', Object.keys(response));
      console.log('完整响应:', JSON.stringify(response, null, 2));
    } else {
      console.log('响应为空');
    }
    console.log('==========================================');

    // 检查响应状态（DashScope API 可能返回 code 字段表示错误）
    if (response && response.code) {
      const errorMsg = response.message || response.msg || '未知错误';
      console.error('qwen-max模型调用失败:', response);
      return next(errorFormat(500, 'AI服务调用失败: ' + errorMsg, [], 10013));
    }

    // DashScope API 响应格式可能是：
    // 1. { output: { choices: [{ message: { content: "..." } }] } }
    // 2. { output: { text: "..." } }
    // 3. { choices: [{ message: { content: "..." } }] }
    // 4. { text: "..." }
    let polishedContent = null;
    
    try {
      // 尝试多种可能的响应格式
      if (response && response.output) {
        if (response.output.choices && Array.isArray(response.output.choices) && response.output.choices.length > 0) {
          const choice = response.output.choices[0];
          if (choice.message && choice.message.content) {
            polishedContent = choice.message.content;
            console.log('✓ 从 response.output.choices[0].message.content 提取内容');
          } else if (choice.text) {
            polishedContent = choice.text;
            console.log('✓ 从 response.output.choices[0].text 提取内容');
          }
        } else if (response.output.text) {
          polishedContent = response.output.text;
          console.log('✓ 从 response.output.text 提取内容');
        }
      } else if (response && response.choices && Array.isArray(response.choices) && response.choices.length > 0) {
        const choice = response.choices[0];
        if (choice.message && choice.message.content) {
          polishedContent = choice.message.content;
          console.log('✓ 从 response.choices[0].message.content 提取内容');
        } else if (choice.text) {
          polishedContent = choice.text;
          console.log('✓ 从 response.choices[0].text 提取内容');
        }
      } else if (response && response.text) {
        polishedContent = response.text;
        console.log('✓ 从 response.text 提取内容');
      } else if (typeof response === 'string') {
        polishedContent = response;
        console.log('✓ 响应本身就是字符串');
      }
    } catch (error) {
      console.error('提取内容时出错:', error);
    }

    if (!polishedContent) {
      console.error('========== 无法提取内容 ==========');
      console.error('响应结构:', JSON.stringify(response, null, 2));
      console.error('尝试访问的路径:');
      console.error('  - response.output?.choices?.[0]?.message?.content:', response?.output?.choices?.[0]?.message?.content);
      console.error('  - response.output?.choices?.[0]?.text:', response?.output?.choices?.[0]?.text);
      console.error('  - response.output?.text:', response?.output?.text);
      console.error('  - response.choices?.[0]?.message?.content:', response?.choices?.[0]?.message?.content);
      console.error('  - response.choices?.[0]?.text:', response?.choices?.[0]?.text);
      console.error('  - response.text:', response?.text);
      console.error('===================================');
      return next(errorFormat(500, 'AI服务返回数据格式错误，无法提取生成内容。请查看后端日志获取详细信息。', [], 10013));
    }

    console.log('AI润色和扩写完成，生成内容长度:', polishedContent.length);

    res.status(200).json({
      success: true,
      message: 'AI润色和扩写成功',
      data: {
        content: polishedContent.trim()
      }
    });
  } catch (error) {
    console.error('AI润色和扩写失败:', error);
    console.error('错误堆栈:', error.stack);
    
    // 如果是模块未找到错误，提供更友好的提示
    if (error.code === 'MODULE_NOT_FOUND' && error.message.includes('dashscope')) {
      return next(errorFormat(500, 'AI SDK未安装，请运行: npm install dashscope', [], 10013));
    }
    
    return next(errorFormat(500, 'AI服务调用失败: ' + error.message, [], 10013));
  }
});

module.exports = router;
