#!/usr/bin/env node

// AI 命令行测试工具
// 功能：通过控制台接收用户输入，调用大模型API并输出响应结果

const readline = require('readline');
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../.env') });

// 创建命令行接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'AI> '
});

// 大模型API配置
const AI_CONFIG = {
  // 从环境变量获取配置
  BASE_URL: process.env.MODELSCOPE_API_BASE_URL || 'https://modelscope.cn/api/v1/models',
  MODEL_ID: process.env.MODELSCOPE_MODEL_ID || 'qwen-7b-chat',
  TOKEN: process.env.MODELSCOPE_TOKEN,
  // 默认参数配置
  DEFAULT_PARAMS: {
    temperature: 0.7,
    max_new_tokens: 500,
    top_p: 0.9
  }
};

/**
 * 调用大模型API
 * @param {string} userInput - 用户输入的文本内容
 * @returns {Promise<string>} - API返回的响应结果
 */
async function callAIAPI(userInput) {
  // 验证API配置
  if (!AI_CONFIG.TOKEN) {
    throw new Error('错误：请在.env文件中配置MODELSCOPE_TOKEN');
  }
  
  try {
    // 构造API请求URL
    const apiUrl = `${AI_CONFIG.BASE_URL}/${AI_CONFIG.MODEL_ID}/inference`;
    
    // 构造请求体
    const requestBody = {
      input: {
        messages: [
          {
            role: 'system',
            content: '你是一位专业的AI助手，擅长回答各种问题并生成高质量的内容。'
          },
          {
            role: 'user',
            content: userInput
          }
        ]
      },
      parameters: {
        ...AI_CONFIG.DEFAULT_PARAMS
      }
    };
    
    // 发送API请求
    const response = await axios.post(apiUrl, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_CONFIG.TOKEN}`
      },
      timeout: 30000 // 30秒超时
    });
    
    // 解析API响应
    const output = response.data.output;
    
    // 提取响应内容（兼容不同模型的输出格式）
    let aiResponse;
    if (output && typeof output === 'object') {
      if (output.content) {
        aiResponse = output.content;
      } else if (Array.isArray(output) && output.length > 0 && output[0].content) {
        aiResponse = output[0].content;
      } else {
        aiResponse = JSON.stringify(output, null, 2);
      }
    } else if (typeof output === 'string') {
      aiResponse = output;
    } else {
      aiResponse = String(output);
    }
    
    return aiResponse.trim();
    
  } catch (error) {
    // 处理不同类型的错误
    if (error.code === 'ECONNABORTED') {
      throw new Error('错误：API请求超时，请检查网络连接或稍后重试');
    } else if (error.response) {
      // API返回错误状态码
      const errorMsg = error.response.data?.error || error.response.data?.message || 'API调用失败';
      throw new Error(`错误：${error.response.status} ${errorMsg}`);
    } else if (error.request) {
      // 请求发送成功但未收到响应
      throw new Error('错误：未收到API响应，请检查网络连接');
    } else {
      // 其他错误
      throw new Error(`错误：${error.message}`);
    }
  }
}

/**
 * 格式化输出内容
 * @param {string} content - 需要格式化的内容
 * @returns {string} - 格式化后的内容
 */
function formatOutput(content) {
  return `\n=== AI 响应 ===\n${content}\n=== 响应结束 ===`;
}

/**
 * 主函数
 */
async function main() {
  console.log('\n欢迎使用AI命令行测试工具！');
  console.log('输入 "exit" 或 "quit" 退出程序');
  console.log('输入 "help" 查看帮助信息\n');
  
  // 显示提示符
  rl.prompt();
  
  // 监听用户输入
  rl.on('line', async (line) => {
    const input = line.trim();
    
    // 处理特殊命令
    if (input === 'exit' || input === 'quit') {
      console.log('\n感谢使用AI命令行测试工具，再见！');
      rl.close();
      return;
    } else if (input === 'help') {
      showHelp();
      rl.prompt();
      return;
    } else if (input === '') {
      rl.prompt();
      return;
    }
    
    try {
      // 显示加载提示
      process.stdout.write('\n正在请求AI服务...');
      
      // 调用AI API
      const response = await callAIAPI(input);
      
      // 清除加载提示
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      
      // 格式化并输出响应
      console.log(formatOutput(response));
      
    } catch (error) {
      // 清除加载提示
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      
      // 输出错误信息
      console.error(`\n❌ ${error.message}`);
    }
    
    // 重新显示提示符
    rl.prompt();
  });
  
  // 监听程序关闭
  rl.on('close', () => {
    console.log('\n程序已退出');
    process.exit(0);
  });
}

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log('\n=== 帮助信息 ===');
  console.log('输入任意文本内容，AI将为您生成响应');
  console.log('特殊命令：');
  console.log('  help    - 显示帮助信息');
  console.log('  exit/quit - 退出程序');
  console.log('');
  console.log('配置说明：');
  console.log('  在.env文件中配置以下参数：');
  console.log('  - MODELSCOPE_TOKEN: 魔搭社区API密钥');
  console.log('  - MODELSCOPE_MODEL_ID: 模型ID（默认：qwen-7b-chat）');
  console.log('  - MODELSCOPE_API_BASE_URL: API基础URL（默认：https://modelscope.cn/api/v1/models）');
}

// 启动程序
main().catch((error) => {
  console.error(`❌ 程序启动失败：${error.message}`);
  process.exit(1);
});
