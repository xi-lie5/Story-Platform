const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const Story = require('../../models/Story');
const User = require('../../models/User');
const UserStoryFavorite = require('../../models/UserStoryFavorite');
const UserStoryRating = require('../../models/UserStoryRating');

// 模拟用户认证
jest.mock('../../middleware/auth', () => ({
  __esModule: true,
  default: (req, res, next) => {
    req.user = {
      id: 'test-user-id',
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

    // 创建测试故事
    testStory = await Story.create({
      title: '测试故事',
      description: '测试故事描述',
      coverImage: '/cover/test.jpg',
      author: testUser._id,
      isPublic: true
    });
  });

  describe('收藏功能', () => {
    describe('POST /api/v1/interactions/favorites/:storyId', () => {
      it('应该成功添加收藏', async () => {
        const response = await request(app)
          .post(`/api/v1/interactions/favorites/${testStory._id}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        
        // 验证数据库中存在收藏记录
        const favorite = await UserStoryFavorite.findOne({
          user: testUser._id,
          story: testStory._id
        });
        expect(favorite).not.toBeNull();
      });

      it('应该在重复收藏时返回错误', async () => {
        // 先添加一次收藏
        await UserStoryFavorite.create({
          user: testUser._id,
          story: testStory._id
        });

        // 再次尝试收藏
        const response = await request(app)
          .post(`/api/v1/interactions/favorites/${testStory._id}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });

    describe('DELETE /api/v1/interactions/favorites/:storyId', () => {
      it('应该成功取消收藏', async () => {
        // 先添加收藏
        await UserStoryFavorite.create({
          user: testUser._id,
          story: testStory._id
        });

        // 取消收藏
        const response = await request(app)
          .delete(`/api/v1/interactions/favorites/${testStory._id}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        
        // 验证收藏记录已被删除
        const favorite = await UserStoryFavorite.findOne({
          user: testUser._id,
          story: testStory._id
        });
        expect(favorite).toBeNull();
      });

      it('应该在没有收藏记录时返回错误', async () => {
        const response = await request(app)
          .delete(`/api/v1/interactions/favorites/${testStory._id}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/v1/interactions/favorites/status/:storyId', () => {
      it('应该返回正确的收藏状态', async () => {
        // 先添加收藏
        await UserStoryFavorite.create({
          user: testUser._id,
          story: testStory._id
        });

        const response = await request(app)
          .get(`/api/v1/interactions/favorites/status/${testStory._id}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.isFavorited).toBe(true);
      });

      it('应该在未收藏时返回正确状态', async () => {
        const response = await request(app)
          .get(`/api/v1/interactions/favorites/status/${testStory._id}`)
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
        const ratingData = {
          rating: 5,
          comment: '很棒的故事！'
        };

        const response = await request(app)
          .post(`/api/v1/interactions/ratings/${testStory._id}`)
          .send(ratingData)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        
        // 验证数据库中存在评分记录
        const rating = await UserStoryRating.findOne({
          user: testUser._id,
          story: testStory._id
        });
        expect(rating).not.toBeNull();
        expect(rating.rating).toBe(5);
      });

      it('应该在评分值无效时返回错误', async () => {
        const invalidRatingData = {
          rating: 6, // 超出1-5范围
          comment: '测试评论'
        };

        const response = await request(app)
          .post(`/api/v1/interactions/ratings/${testStory._id}`)
          .send(invalidRatingData)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      it('应该成功更新已有评分', async () => {
        // 先添加一个评分
        await UserStoryRating.create({
          user: testUser._id,
          story: testStory._id,
          rating: 3,
          comment: '一般般'
        });

        // 更新评分
        const updateData = {
          rating: 4,
          comment: '更新后的评论'
        };

        const response = await request(app)
          .post(`/api/v1/interactions/ratings/${testStory._id}`)
          .send(updateData)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        
        // 验证评分已更新
        const updatedRating = await UserStoryRating.findOne({
          user: testUser._id,
          story: testStory._id
        });
        expect(updatedRating.rating).toBe(4);
      });
    });

    describe('GET /api/v1/interactions/ratings/:storyId', () => {
      it('应该返回故事的评分详情', async () => {
        // 添加一些评分
        await UserStoryRating.create([
          {
            user: testUser._id,
            story: testStory._id,
            rating: 5,
            comment: '很棒'
          },
          {
            user: new mongoose.Types.ObjectId(),
            story: testStory._id,
            rating: 4,
            comment: '不错'
          }
        ]);

        const response = await request(app)
          .get(`/api/v1/interactions/ratings/${testStory._id}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('averageRating');
        expect(response.body.data).toHaveProperty('ratings');
        expect(response.body.data.ratings.length).toBe(2);
      });
    });
  });
});