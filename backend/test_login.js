async function testLogin() {
  try {
    console.log('正在测试登录API...');
    
    const response = await fetch('http://localhost:5000/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'user@gmail.com',
        password: 'user123456'
      })
    });
    
    const data = await response.json();
    console.log('响应状态:', response.status);
    console.log('响应数据:', JSON.stringify(data, null, 2));
    
    if (response.ok && data.success) {
      console.log('登录成功！');
      console.log('用户信息:', {
        userId: data.data.userId,
        username: data.data.username,
        email: data.data.email
      });
    } else {
      console.log('登录失败:', data.message);
    }
    
  } catch (error) {
    console.error('测试登录时出错:', error);
  }
}

testLogin();