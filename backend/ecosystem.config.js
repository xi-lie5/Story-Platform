// 用于测试连接池连接数的PM2文件
module.exports = {
  apps : [{
    name   : "story-api",
    script : "./server.js",
    instances : "max", // 开启多进程集群模式
    exec_mode : "cluster",
    env: {
      NODE_ENV: "development",
      DB_POOL_SIZE: 50 // 默认值
    },
    // 测试配置 A：小连接池
    env_low: {
      DB_POOL_SIZE: 10
    },
    // 测试配置 B：大连接池
    env_high: {
      DB_POOL_SIZE: 200
    }
  }]
}

