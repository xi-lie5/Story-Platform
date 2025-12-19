// aiService/testAi.js
const { generateAIResponse } = require('./aiService.js');

async function testAI() {
  console.log('📡 正在调用专业作家 AI ...');

  const storyContext = {
    title: "夜总会",
    description: "讲述一个色情擦边故事",
    style: "可爱",
    category: "可爱",
    userInput: "露骨"
  };

  try {
    const reply = await generateAIResponse(storyContext);
    console.log('\n--- 🖋️ AI 创作片段 ---\n');
    console.log(reply);
    console.log('\n--------------------');
  } catch (error) {
    console.error('❌ 测试失败：', error.message);
  }
}

testAI();