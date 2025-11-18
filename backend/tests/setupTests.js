const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config({
  path: '../.env.test'
});

let mongoServer;

// 测试前设置
beforeAll(async () => {
  // 确保先断开现有连接
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  
  // 创建内存MongoDB实例
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
});

// 每个测试后清理
afterEach(async () => {
  // 清理所有集合数据
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// 测试后关闭连接
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// 模拟请求和响应对象
global.mockRequest = (params = {}, body = {}, headers = {}, user = null) => ({
  params,
  body,
  headers,
  user,
  query: {}
});

global.mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res;
};

global.mockNext = jest.fn();