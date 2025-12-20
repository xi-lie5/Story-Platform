const express = require('express');
const router = express.Router();
const { generateAIResponse } = require('../aiService/aiService');

// 定义 POST 请求接口
router.post('/generate-story', async (req, res) => {
  try {
    // 1. 从前端请求体中解构数据
    const { title, description, style, category, userInput } = req.body;

    // 2. 简单的输入校验
    if (!userInput) {
      return res.status(400).json({ error: "请输入需要 AI 处理的内容" });
    }

    // 3. 调用你之前写好的 AI 服务函数
    const result = await generateAIResponse({
      title,
      description,
      style,
      category,
      userInput
    });

    // 4. 将 AI 生成的结果返回给前端
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error("路由处理错误:", error);
    res.status(500).json({
      success: false,
      message: "AI 生成失败，请稍后再试",
      error: error.message
    });
  }
});

module.exports = router;