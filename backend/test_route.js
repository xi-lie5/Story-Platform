const http = require('http');

async function testRoute() {
  try {
    // 测试storyNodes测试路由
    console.log('=== 测试storyNodes测试路由 ===');
    const testResponse = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/v1/storyNodes/test',
        method: 'GET'
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, data }));
      });
      req.on('error', reject);
      req.end();
    });
    console.log('测试路由状态码:', testResponse.statusCode);
    console.log('测试路由响应:', testResponse.data);

    // 测试节点路由
    console.log('\n=== 测试节点路由 ===');
    const nodeResponse = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/v1/storyNodes/nodes/test123',
        method: 'GET'
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, data }));
      });
      req.on('error', reject);
      req.end();
    });
    console.log('节点路由状态码:', nodeResponse.statusCode);
    console.log('节点路由响应:', nodeResponse.data);
    
  } catch (error) {
    console.error('请求失败:', error.message);
  }
}

testRoute();