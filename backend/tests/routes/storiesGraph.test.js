const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const Story = require('../../models/Story');
const StorySection = require('../../models/StorySection');
const User = require('../../models/User');
const { errorFormat } = require('../../utils/errorFormat');

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

describe('故事图谱API测试', () => {
  let testUser;
  let testStory;
  let testSections = [];

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

    // 创建测试章节
    const section1 = await StorySection.create({
      story: testStory._id,
      title: '章节1',
      content: '章节1内容',
      type: 'text',
      temporaryId: 'temp-1',
      visualPosition: { x: 100, y: 100 },
      options: [{
        text: '选项1',
        targetTemporaryId: 'temp-2'
      }]
    });

    const section2 = await StorySection.create({
      story: testStory._id,
      title: '章节2',
      content: '章节2内容',
      type: 'text',
      temporaryId: 'temp-2',
      visualPosition: { x: 200, y: 200 }
    });

    testSections = [section1, section2];
  });

  describe('GET /api/v1/stories/:storyId/graph', () => {
    it('应该成功获取故事图谱数据', async () => {
      const response = await request(app)
        .get(`/api/v1/stories/${testStory._id}/graph`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('nodes');
      expect(response.body.data).toHaveProperty('connections');
      expect(response.body.data.nodes.length).toBe(2);
      expect(response.body.data.connections.length).toBe(1);
    });

    it('应该在故事不存在时返回404错误', async () => {
      const invalidId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/v1/stories/${invalidId}/graph`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('应该在ID格式无效时返回400错误', async () => {
      const response = await request(app)
        .get('/api/v1/stories/invalid-id/graph')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/stories/:storyId/graph', () => {
    it('应该成功批量更新故事图谱数据', async () => {
      const updateData = {
        nodes: [
          {
            id: testSections[0]._id.toString(),
            temporaryId: 'temp-1',
            title: '更新的章节1',
            visualPosition: { x: 150, y: 150 },
            content: '更新的内容',
            type: 'text'
          },
          {
            temporaryId: 'temp-3',
            title: '新章节',
            visualPosition: { x: 300, y: 300 },
            content: '新章节内容',
            type: 'text'
          }
        ],
        connections: [
          {
            id: 'conn-1',
            sourceId: testSections[0]._id.toString(),
            targetTemporaryId: 'temp-3',
            text: '新选项'
          }
        ]
      };

      const response = await request(app)
        .put(`/api/v1/stories/${testStory._id}/graph`)
        .send(updateData)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('nodes');
      expect(response.body.data).toHaveProperty('connections');
      
      // 验证更新结果
      const updatedStory = await Story.findById(testStory._id).populate('sections');
      expect(updatedStory.sections.length).toBe(3); // 原2个加上1个新的
    });

    it('应该在请求数据格式无效时返回400错误', async () => {
      const invalidData = {
        nodes: 'invalid',
        connections: []
      };

      const response = await request(app)
        .put(`/api/v1/stories/${testStory._id}/graph`)
        .send(invalidData)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('应该在用户不是故事作者时返回403错误', async () => {
      // 临时修改认证中间件
      jest.doMock('../../middleware/auth', () => ({
        __esModule: true,
        default: (req, res, next) => {
          req.user = {
            id: 'other-user-id',
            username: 'otheruser',
            email: 'other@example.com'
          };
          next();
        },
        checkPermission: () => (req, res, next) => next()
      }));

      const updateData = {
        nodes: [],
        connections: []
      };

      const response = await request(app)
        .put(`/api/v1/stories/${testStory._id}/graph`)
        .send(updateData)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);

      // 恢复原始模拟
      jest.resetModules();
    });
  });
});