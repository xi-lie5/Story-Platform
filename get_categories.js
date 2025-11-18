// Node.js 18+ 内置fetch，无需额外导入

// 获取分类列表
async function getCategories() {
  console.log('📋 正在获取分类列表...');
  try {
    const response = await fetch('http://localhost:5000/api/v1/categories', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    if (result.success) {
      console.log('✅ 分类列表获取成功:');
      result.data.forEach((cat, index) => {
        console.log(`${index + 1}. ${cat.name} (ID: ${cat._id})`);
      });
      return result.data;
    } else {
      console.error('❌ 获取分类失败:', result.message);
      return [];
    }
  } catch (error) {
    console.error('❌ 获取分类错误:', error.message);
    return [];
  }
}

getCategories();