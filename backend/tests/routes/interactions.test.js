const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const Story = require('../../models/Story');
const User = require('../../models/User');
const UserStoryFavorite = require('../../models/UserStoryFavorite');
const UserStoryRating = require('../../models/UserStoryRating');

// 模拟用户认证
let mockUserId = 'test-user-id';

jest.mock('../../middleware/auth', () => ({
  __esModule: true,
  default: (req, res, next) => {
    req.user = {
      id: mockUserId,
      username: 'testuser',
      email: 'test@example.com'
    };
    next();
  },
  checkPermission: () => (req, res, next) => next()
}));

describe('用户交互API测试', () => {
  let testUser;
  let testStory;

  beforeEach(async () => {
    // 创建测试用户
    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });

    // 创建测试分类
    const testCategory = await mongoose.connection.db.collection('categories').insertOne({
      name: '测试分类',
      description: '测试分类描述',
      storyCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // 创建测试故事
    testStory = await Story.create({
      title: '测试故事',
      description: '测试故事描述',
      coverImage: '/cover/test.jpg',
      author: testUser._id,
      category: testCategory.insertedId,
      isPublic: true
    });
  });

  describe('收藏功能', () => {
    describe('POST /api/v1/interactions/favorites/:storyId', () => {
      it('应该成功添加收藏', async () => {
        // 设置正确的用户ID
        mockUserId = testUser._id.toString();
        
        const response = await request(app)
          .post(`/api/v1/interactions/stories/${testStory._id}/favorite`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        
        // 验证数据库中存在收藏记录
        const favorite = await UserStoryFavorite.findOne({
          userId: testUser._id,
          storyId: testStory._id
        });
        expect(favorite).not.toBeNull();
      });

      it('应该在重复收藏时返回错误', async () => {
        // 设置正确的用户ID
        mockUserId = testUser._id.toString();
        
        // 先添加收藏
        await UserStoryFavorite.create({
          userId: testUser._id,
          storyId: testStory._id
        });

        // 再次尝试收藏
        const response = await request(app)
          .post(`/api/v1/interactions/stories/${testStory._id}/favorite`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });

    describe('DELETE /api/v1/interactions/favorites/:storyId', () => {
      it('应该成功取消收藏', async () => {
        // 设置正确的用户ID
        mockUserId = testUser._id.toString();
        
        // 先添加收藏
        await UserStoryFavorite.create({
          userId: testUser._id,
          storyId: testStory._id
        });

        // 取消收藏
        const response = await request(app)
          .delete(`/api/v1/interactions/stories/${testStory._id}/favorite`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        
        // 验证收藏记录已被删除
        const favorite = await UserStoryFavorite.findOne({
          userId: testUser._id,
          storyId: testStory._id
        });
        expect(favorite).toBeNull();
      });

      it('应该在没有收藏记录时返回错误', async () => {
        // 设置正确的用户ID
        mockUserId = testUser._id.toString();
        
        const response = await request(app)
          .delete(`/api/v1/interactions/stories/${testStory._id}/favorite`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/v1/interactions/favorites/status/:storyId', () => {
      it('应该返回正确的收藏状态', async () => {
        // 设置正确的用户ID
        mockUserId = testUser._id.toString();
        
        // 先添加收藏
        await UserStoryFavorite.create({
          userId: testUser._id,
          storyId: testStory._id
        });

        const response = await request(app)
          .get(`/api/v1/interactions/stories/${testStory._id}/favorite/status`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.isFavorited).toBe(true);
      });

      it('应该在未收藏时返回正确状态', async () => {
        // 设置正确的用户ID
        mockUserId = testUser._id.toString();
        
        const response = await request(app)
          .get(`/api/v1/interactions/stories/${testStory._id}/favorite/status`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.isFavorited).toBe(false);
      });
    });
  });

  describe('评分功能', () => {
    describe('POST /api/v1/interactions/ratings/:storyId', () => {
      it('应该成功提交评分', async () => {
        // 设置正确的用户ID
        mockUserId = testUser._id.toString();
        
        const ratingData = {
          rating: 5,
          comment: '很棒的故事！'
        };

        const response = await request(app)
          .post(`/api/v1/interactions/stories/${testStory._id}/rate`)
          .send(ratingData)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        
        // 验证数据库中存在评分记录
        const rating = await UserStoryRating.findOne({
          userId: testUser._id,
          storyId: testStory._id
        });
        expect(rating).not.toBeNull();
        expect(rating.rating).toBe(5);
      });

      it('应该在评分值无效时返回错误', async () => {
        // 设置正确的用户ID
        mockUserId = testUser._id.toString();
        
        const invalidRatingData = {
          rating: 6, // 超出1-5范围
          comment: '测试评论'
        };

        const response = await request(app)
          .post(`/api/v1/interactions/stories/${testStory._id}/rate`)
          .send(invalidRatingData)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      it('应该成功更新已有评分', async () => {
        // 设置正确的用户ID
        mockUserId = testUser._id.toString();
        
        // 先添加一个评分
        await UserStoryRating.create({
          userId: testUser._id,
          storyId: testStory._id,
          rating: 3,
          comment: '一般般'
        });

        // 更新评分
        const updateData = {
          rating: 4,
          comment: '更新后的评论'
        };

        const response = await request(app)
          .post(`/api/v1/interactions/stories/${testStory._id}/rate`)
          .send(updateData);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('评分成功');
        
        // 验证评分已更新
        const updatedRating = await UserStoryRating.findOne({
          userId: testUser._id,
          storyId: testStory._id
        });
        expect(updatedRating.rating).toBe(4);
        expect(updatedRating.comment).toBe('更新后的评论');
      });
    });

    describe('GET /api/v1/interactions/ratings/:storyId', () => {
      it('应该返回故事的评分详情', async () => {
          mockUserId = testUser._id.toString();
          
          // 添加一些评分 - 分别创建以避免数组问题
          await UserStoryRating.create({
            userId: testUser._id,
            storyId: testStory._id,
            rating: 5,
            comment: '很棒'
          });
          
          await UserStoryRating.create({
            userId: new mongoose.Types.ObjectId(),
            storyId: testStory._id,
            rating: 4,
            comment: '不错'
          });

          const response = await request(app)
            .get(`/api/v1/interactions/stories/${testStory._id}/rating`);

          console.log('=== 测试调试信息 ===');
          console.log('响应状态:', response.status);
          console.log('响应体:', JSON.stringify(response.body, null, 2));
          console.log('响应text:', response.text);
          console.log('响应error:', response.error);
          console.log('响应headers:', response.headers);
          console.log('===================');

          if (response.status !== 200) {
            console.log('错误响应状态:', response.status);
            console.log('错误响应体:', JSON.stringify(response.body, null, 2));
            console.log('错误响应text:', response.text);
            console.log('错误响应error:', response.error);
          }
          
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
          expect(response.body.data).toHaveProperty('averageRating');
          expect(response.body.data).toHaveProperty('ratingCount');
          expect(response.body.data).toHaveProperty('recentRatings');
          expect(response.body.data.recentRatings.length).toBe(2);
        });
    });
  });
});