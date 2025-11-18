const http = require('http');

// 测试禁用用户登录
function testDisabledUserLogin() {
  const postData = JSON.stringify({
    email: 'testuser2@example.com',
    password: 'password123'
  });

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    console.log(`状态码: ${res.statusCode}`);
    console.log(`响应头:`, res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log('响应内容:', response);
        
        if (res.statusCode === 403 && response.message && response.message.includes('禁用')) {
          console.log('✅ 测试通过：禁用用户被正确拒绝登录');
        } else {
          console.log('❌ 测试失败：禁用用户未被正确拒绝');
        }
      } catch (e) {
        console.log('响应解析失败:', data);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`请求遇到问题: ${e.message}`);
  });

  req.write(postData);
  req.end();
}

console.log('测试禁用用户登录功能...');
testDisabledUserLogin();