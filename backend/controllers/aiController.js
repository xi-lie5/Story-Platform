const aiService = require('../services/aiService');

/**
 * AI辅助故事生成控制器
 */
class AIController {
  /**
   * 生成故事内容
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async generateContent(req, res) {
    try {
      const { context, prompt, style, length } = req.body;
      
      // 参数验证
      if (!context || !prompt) {
        return res.status(400).json({
          success: false,
          message: '上下文和提示信息不能为空'
        });
      }

      const generatedContent = await aiService.generateStoryContent({
        context,
        prompt,
        style,
        length
      });

      res.json({
        success: true,
        message: '内容生成成功',
        data: {
          content: generatedContent
        }
      });
    } catch (error) {
      console.error('生成内容失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '内容生成失败'
      });
    }
  }

  /**
   * 生成角色对话
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async generateCharacterDialogue(req, res) {
    try {
      const { characters, style, context, prompt } = req.body;
      
      // 参数验证
      if (!characters || !context || !prompt) {
        return res.status(400).json({
          success: false,
          message: '角色列表、上下文和提示信息不能为空'
        });
      }

      const generatedDialogue = await aiService.generateCharacterDialogue({
        characters,
        style,
        context,
        prompt
      });

      res.json({
        success: true,
        message: '对话生成成功',
        data: {
          dialogue: generatedDialogue
        }
      });
    } catch (error) {
      console.error('生成对话失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '对话生成失败'
      });
    }
  }

  /**
   * 生成故事分支建议
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async generateBranchSuggestions(req, res) {
    try {
      const { currentContent, style, count } = req.body;
      
      // 参数验证
      if (!currentContent) {
        return res.status(400).json({
          success: false,
          message: '当前故事内容不能为空'
        });
      }

      const suggestions = await aiService.generateBranchSuggestions({
        currentContent,
        style,
        count: parseInt(count) || 3
      });

      res.json({
        success: true,
        message: '分支建议生成成功',
        data: {
          branches: suggestions
        }
      });
    } catch (error) {
      console.error('生成分支建议失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '分支建议生成失败'
      });
    }
  }

  /**
   * 转换故事风格
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async convertStyle(req, res) {
    try {
      const { content, targetStyle } = req.body;
      
      // 参数验证
      if (!content || !targetStyle) {
        return res.status(400).json({
          success: false,
          message: '内容和目标风格不能为空'
        });
      }

      const convertedContent = await aiService.convertStoryStyle({
        content,
        targetStyle
      });

      res.json({
        success: true,
        message: '风格转换成功',
        data: {
          content: convertedContent
        }
      });
    } catch (error) {
      console.error('转换风格失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '风格转换失败'
      });
    }
  }

  /**
   * 基于故事节点生成内容
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async generateNodeContent(req, res) {
    try {
      const { storyId, currentNode, prompt, style } = req.body;
      
      // 参数验证
      if (!storyId || !currentNode || !prompt) {
        return res.status(400).json({
          success: false,
          message: '故事ID、当前节点和提示信息不能为空'
        });
      }

      // 构建上下文
      const context = `当前故事节点: ${currentNode.title}\n当前内容: ${currentNode.content}`;

      const generatedContent = await aiService.generateStoryContent({
        context,
        prompt,
        style
      });

      res.json({
        success: true,
        message: '节点内容生成成功',
        data: {
          content: generatedContent
        }
      });
    } catch (error) {
      console.error('生成节点内容失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '节点内容生成失败'
      });
    }
  }
}

module.exports = new AIController();
