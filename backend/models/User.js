const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  constructor(data = {}) {
    this.id = data.id;
    this.username = data.username;
    this.email = data.email;
    this.password = data.password;
    this.avatar = data.avatar || '/avatar/default.png';
    this.bio = data.bio || '这个人很懒，什么都没留下';
    this.role = data.role || 'user';
    this.isActive = data.is_active !== undefined ? data.is_active : true;
    this.is_active = this.isActive;
    this.tokenVersion = data.token_version || 1;
    this.token_version = this.tokenVersion;
    this.refreshToken = data.refresh_token;
    this.refresh_token = this.refreshToken;
    this.lastLogin = data.last_login;
    this.last_login = this.lastLogin;
    this.loginAttempts = data.login_attempts || 0;
    this.login_attempts = this.loginAttempts;
    this.lockUntil = data.lock_until;
    this.lock_until = this.lockUntil;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  /**
   * 创建用户
   * @param {Object} userData - 用户数据
   * @returns {Promise<User>} 创建的用户实例
   */
  static async create(userData) {
    const connection = await pool.getConnection();
    try {
      const { username, email, password, avatar, bio, role } = userData;

      // 验证必填字段
      if (!username || !email || !password) {
        throw new Error('用户名、邮箱和密码必填');
      }

      // 验证长度
      if (username.length < 3 || username.length > 30) {
        throw new Error('用户名长度必须在3-30个字符之间');
      }
      if (password.length < 8) {
        throw new Error('密码长度不能少于8位');
      }

      // 验证邮箱格式
      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(email)) {
        throw new Error('邮箱格式不正确');
      }

      // 验证角色
      const validRoles = ['user', 'editor', 'admin'];
      if (role && !validRoles.includes(role)) {
        throw new Error(`角色必须是: ${validRoles.join(', ')}`);
      }

      // 检查用户名是否已存在
      const [existingUsername] = await connection.execute(
        'SELECT id FROM users WHERE username = ?',
        [username.trim()]
      );
      if (existingUsername.length > 0) {
        throw new Error('用户名已存在');
      }

      // 检查邮箱是否已存在
      const [existingEmail] = await connection.execute(
        'SELECT id FROM users WHERE email = ?',
        [email.toLowerCase().trim()]
      );
      if (existingEmail.length > 0) {
        throw new Error('邮箱已存在');
      }

      // 加密密码
      const hashedPassword = await bcrypt.hash(password, 10);

      const [result] = await connection.execute(
        `INSERT INTO users (username, email, password, avatar, bio, role) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          username.trim(),
          email.toLowerCase().trim(),
          hashedPassword,
          avatar || '/avatar/default.png',
          bio || '这个人很懒，什么都没留下',
          role || 'user'
        ]
      );

      return await this.findById(result.insertId);
    } finally {
      connection.release();
    }
  }

  /**
   * 根据ID查找用户
   * @param {Number} id - 用户ID
   * @param {Object} options - 查询选项（includePassword）
   * @returns {Promise<User|null>} 用户实例或null
   */
  static async findById(id, options = {}) {
    const connection = await pool.getConnection();
    try {
      const [users] = await connection.execute(
        'SELECT * FROM users WHERE id = ?',
        [id]
      );
      if (users.length === 0) return null;
      const user = new User(users[0]);
      if (!options.includePassword) {
        delete user.password;
      }
      return user;
    } finally {
      connection.release();
    }
  }

  /**
   * 根据邮箱查找用户
   * @param {String} email - 邮箱
   * @param {Object} options - 查询选项（includePassword）
   * @returns {Promise<User|null>} 用户实例或null
   */
  static async findByEmail(email, options = {}) {
    const connection = await pool.getConnection();
    try {
      const [users] = await connection.execute(
        'SELECT * FROM users WHERE email = ?',
        [email.toLowerCase().trim()]
      );
      if (users.length === 0) return null;
      const user = new User(users[0]);
      if (!options.includePassword) {
        delete user.password;
      }
      return user;
    } finally {
      connection.release();
    }
  }

  /**
   * 根据用户名查找用户
   * @param {String} username - 用户名
   * @param {Object} options - 查询选项（includePassword）
   * @returns {Promise<User|null>} 用户实例或null
   */
  static async findByUsername(username, options = {}) {
    const connection = await pool.getConnection();
    try {
      const [users] = await connection.execute(
        'SELECT * FROM users WHERE username = ?',
        [username.trim()]
      );
      if (users.length === 0) return null;
      const user = new User(users[0]);
      if (!options.includePassword) {
        delete user.password;
      }
      return user;
    } finally {
      connection.release();
    }
  }

  /**
   * 检查用户是否存在
   * @param {Object} query - 查询条件 {username, email}
   * @returns {Promise<Boolean>} 是否存在
   */
  static async exists(query = {}) {
    const connection = await pool.getConnection();
    try {
      let sql = 'SELECT id FROM users WHERE 1=1';
      const params = [];

      if (query.username) {
        sql += ' AND username = ?';
        params.push(query.username.trim());
      }

      if (query.email) {
        sql += ' AND email = ?';
        params.push(query.email.toLowerCase().trim());
      }

      const [results] = await connection.execute(sql, params);
      return results.length > 0;
    } finally {
      connection.release();
    }
  }

  /**
   * 查找单个用户（支持多种查询条件）
   * @param {Object} query - 查询条件 {email, username, id}
   * @param {Object} options - 查询选项 {includePassword}
   * @returns {Promise<User|null>} 用户实例或null
   */
  static async findOne(query = {}, options = {}) {
    const connection = await pool.getConnection();
    try {
      let sql = 'SELECT * FROM users WHERE 1=1';
      const params = [];

      if (query.email) {
        sql += ' AND email = ?';
        params.push(query.email.toLowerCase().trim());
      }

      if (query.username) {
        sql += ' AND username = ?';
        params.push(query.username.trim());
      }

      if (query.id) {
        sql += ' AND id = ?';
        params.push(query.id);
      }

      sql += ' LIMIT 1';

      const [users] = await connection.execute(sql, params);
      if (users.length === 0) return null;
      
      const userData = users[0];
      // 确保密码字段正确映射（数据库可能是password，也可能是其他字段名）
      if (userData.password === undefined && userData.pwd !== undefined) {
        userData.password = userData.pwd;
      }
      
      const user = new User(userData);
      // 如果不需要密码，删除密码字段
      if (!options.includePassword) {
        delete user.password;
      } else {
        // 确保密码字段存在
        if (!user.password && userData.password) {
          user.password = userData.password;
        }
        console.log('findOne: 密码字段已加载，长度:', user.password ? user.password.length : 0);
      }
      return user;
    } finally {
      connection.release();
    }
  }

  /**
   * 验证密码
   * @param {String} password - 明文密码
   * @returns {Promise<Boolean>} 密码是否匹配
   */
  async matchPassword(password) {
    if (!this.password) {
      console.error('matchPassword: 用户密码未加载');
      throw new Error('用户密码未加载');
    }
    if (!password) {
      console.error('matchPassword: 输入的密码为空');
      return false;
    }
    console.log('matchPassword: 开始比较密码');
    console.log('matchPassword: 存储的密码哈希前10个字符:', this.password.substring(0, 10));
    const result = await bcrypt.compare(password, this.password);
    console.log('matchPassword: 密码比较结果:', result);
    return result;
  }

  /**
   * 保存用户（实例方法）
   * @returns {Promise<User>} 保存后的用户实例
   */
  async save() {
    const connection = await pool.getConnection();
    try {
      if (this.id) {
        // 更新现有用户
        const fields = [];
        const values = [];

        if (this.username !== undefined) {
          fields.push('username = ?');
          values.push(this.username.trim());
        }

        if (this.email !== undefined) {
          fields.push('email = ?');
          values.push(this.email.toLowerCase().trim());
        }

        if (this.password !== undefined) {
          // 检查密码是否已经是哈希值（bcrypt哈希以$2a$, $2b$, $2x$或$2y$开头）
          const isAlreadyHashed = typeof this.password === 'string' && 
                                   this.password.length === 60 && 
                                   /^\$2[abxy]\$/.test(this.password);
          
          if (isAlreadyHashed) {
            // 如果已经是哈希值，直接使用，不再次哈希
            console.log('save(): 密码已经是哈希值，跳过再次哈希');
            fields.push('password = ?');
            values.push(this.password);
          } else {
            // 如果是明文，进行加密
            console.log('save(): 密码是明文，进行哈希');
            const hashedPassword = await bcrypt.hash(this.password, 10);
            fields.push('password = ?');
            values.push(hashedPassword);
          }
        }

        if (this.avatar !== undefined) {
          fields.push('avatar = ?');
          values.push(this.avatar);
        }

        if (this.bio !== undefined) {
          fields.push('bio = ?');
          values.push(this.bio);
        }

        if (this.role !== undefined) {
          fields.push('role = ?');
          values.push(this.role);
        }

        if (this.isActive !== undefined) {
          fields.push('is_active = ?');
          values.push(this.isActive);
        }

        if (this.tokenVersion !== undefined) {
          fields.push('token_version = ?');
          values.push(this.tokenVersion);
        }

        if (this.refreshToken !== undefined && this.refreshToken !== null) {
          fields.push('refresh_token = ?');
          values.push(this.refreshToken);
        } else if (this.refreshToken === null) {
          // 如果refreshToken明确设置为null，也要更新数据库
          fields.push('refresh_token = NULL');
        }

        if (this.lastLogin !== undefined) {
          fields.push('last_login = ?');
          values.push(this.lastLogin);
        }

        if (this.loginAttempts !== undefined) {
          fields.push('login_attempts = ?');
          values.push(this.loginAttempts);
        }

        if (this.lockUntil !== undefined) {
          fields.push('lock_until = ?');
          values.push(this.lockUntil);
        }

        if (fields.length === 0) {
          return await User.findById(this.id);
        }

        values.push(this.id);

        await connection.execute(
          `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
          values
        );

        return await User.findById(this.id);
      } else {
        // 创建新用户
        return await User.create({
          username: this.username,
          email: this.email,
          password: this.password,
          avatar: this.avatar,
          bio: this.bio,
          role: this.role
        });
      }
    } finally {
      connection.release();
    }
  }

  /**
   * 重置密码
   * @param {String} newPassword - 新密码
   * @returns {Promise<Boolean>} 是否成功
   */
  async resetPassword(newPassword) {
    this.password = newPassword;
    this.tokenVersion = (this.tokenVersion || 1) + 1;
    await this.save();
    return true;
  }

  /**
   * 吊销所有令牌
   * @returns {Promise<Boolean>} 是否成功
   */
  async revokeAllTokens() {
    this.tokenVersion = (this.tokenVersion || 1) + 1;
    this.refreshToken = null;
    await this.save();
    return true;
  }

  /**
   * 检查账户是否被锁定
   * @returns {Boolean} 是否被锁定
   */
  isLocked() {
    return this.lockUntil && new Date(this.lockUntil) > new Date();
  }

  /**
   * 增加登录尝试次数
   * @returns {Promise<Boolean>} 是否成功
   */
  async incrementLoginAttempts() {
    const connection = await pool.getConnection();
    try {
      // 如果锁定时间已过期，重置尝试次数
      if (this.lockUntil && new Date(this.lockUntil) < new Date()) {
        this.loginAttempts = 1;
        this.lockUntil = null;
      } else {
        this.loginAttempts = (this.loginAttempts || 0) + 1;
      }

      // 如果尝试次数达到阈值，锁定账户
      if (this.loginAttempts >= 5) {
        const lockTime = new Date();
        lockTime.setMinutes(lockTime.getMinutes() + 30); // 锁定30分钟
        this.lockUntil = lockTime;
      }

      await this.save();
      return true;
    } finally {
      connection.release();
    }
  }

  /**
   * 重置登录尝试次数
   * @returns {Promise<Boolean>} 是否成功
   */
  async resetLoginAttempts() {
    // 使用直接SQL更新，避免save()方法误处理密码
    const connection = await pool.getConnection();
    try {
      await connection.execute(
        'UPDATE users SET login_attempts = 0, lock_until = NULL WHERE id = ?',
        [this.id]
      );
      this.loginAttempts = 0;
      this.lockUntil = null;
      return true;
    } finally {
      connection.release();
    }
  }

  /**
   * 记录登录时间
   * @returns {Promise<Boolean>} 是否成功
   */
  async recordLogin() {
    this.lastLogin = new Date();
    await this.resetLoginAttempts();
    return true;
  }

  /**
   * 转换为JSON（排除敏感信息）
   * @returns {Object} 用户对象
   */
  toJSON() {
    const userObject = { ...this };
    delete userObject.password;
    delete userObject.refreshToken;
    delete userObject.refresh_token;
    delete userObject.loginAttempts;
    delete userObject.login_attempts;
    delete userObject.lockUntil;
    delete userObject.lock_until;
    return userObject;
  }

  /**
   * 更新用户
   * @param {Number} id - 用户ID
   * @param {Object} updateData - 更新数据
   * @returns {Promise<User>} 更新后的用户实例
   */
  static async findByIdAndUpdate(id, updateData) {
    const connection = await pool.getConnection();
    try {
      // 检查用户是否存在
      const user = await this.findById(id);
      if (!user) {
        throw new Error('用户不存在');
      }

      // 构建更新字段
      const fields = [];
      const values = [];

      // 只更新提供的字段
      for (const key of Object.keys(updateData)) {
        if (updateData[key] !== undefined) {
          if (key === 'password') {
            // 密码需要特殊处理：加密（使用异步方法）
            const hashedPassword = await bcrypt.hash(updateData[key], 10);
            fields.push('password = ?');
            values.push(hashedPassword);
          } else if (key === 'refreshToken' || key === 'refresh_token') {
            // refreshToken 字段处理
            if (updateData[key] === null) {
              fields.push('refresh_token = NULL');
            } else {
              fields.push('refresh_token = ?');
              values.push(updateData[key]);
            }
          } else {
            // 其他字段直接映射
            const dbField = key === 'isActive' ? 'is_active' : 
                           key === 'tokenVersion' ? 'token_version' : 
                           key === 'lastLogin' ? 'last_login' : 
                           key === 'loginAttempts' ? 'login_attempts' : 
                           key === 'lockUntil' ? 'lock_until' : key;
            fields.push(`${dbField} = ?`);
            values.push(updateData[key]);
          }
        }
      }

      if (fields.length === 0) {
        return user;
      }

      values.push(id);
      const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
      console.log('findByIdAndUpdate SQL:', sql);
      console.log('findByIdAndUpdate 更新字段:', fields);
      console.log('findByIdAndUpdate 值数量:', values.length);
      
      await connection.execute(sql, values);
      
      console.log('findByIdAndUpdate: 更新完成，用户ID:', id);

      // 返回更新后的用户
      return await this.findById(id);
    } finally {
      connection.release();
    }
  }

  /**
   * 删除用户
   * @param {Number} id - 用户ID
   * @returns {Promise<Boolean>} 是否删除成功
   */
  static async findByIdAndDelete(id) {
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute(
        'DELETE FROM users WHERE id = ?',
        [id]
      );
      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  /**
   * 查找用户（支持多种查询条件）
   * @param {Object} query - 查询条件
   * @returns {Promise<Array>} 用户列表
   */
  static async find(query = {}) {
    const connection = await pool.getConnection();
    try {
      let sql = 'SELECT * FROM users WHERE 1=1';
      const params = [];

      if (query.role) {
        sql += ' AND role = ?';
        params.push(query.role);
      }

      if (query.isActive !== undefined) {
        sql += ' AND is_active = ?';
        params.push(query.isActive);
      }

      if (query.email) {
        sql += ' AND email = ?';
        params.push(query.email.toLowerCase().trim());
      }

      if (query.username) {
        sql += ' AND username = ?';
        params.push(query.username.trim());
      }

      // 排除指定ID的用户（用于排除当前管理员自己）
      if (query.excludeId) {
        sql += ' AND id != ?';
        params.push(query.excludeId);
      }

      // 处理搜索（用户名或邮箱）
      if (query.search) {
        sql += ' AND (username LIKE ? OR email LIKE ?)';
        const searchPattern = `%${query.search}%`;
        params.push(searchPattern, searchPattern);
      }

      sql += ' ORDER BY created_at DESC';

      // LIMIT 和 OFFSET 不能使用参数绑定，需要直接拼接（已通过parseInt验证，安全）
      if (query.limit) {
        const limitValue = parseInt(query.limit, 10);
        if (!isNaN(limitValue) && limitValue > 0) {
          sql += ` LIMIT ${limitValue}`;
        }
      }

      if (query.skip) {
        const skipValue = parseInt(query.skip, 10);
        if (!isNaN(skipValue) && skipValue >= 0) {
          sql += ` OFFSET ${skipValue}`;
        }
      }

      const [users] = await connection.execute(sql, params);
      return users.map(u => new User(u));
    } finally {
      connection.release();
    }
  }

  /**
   * 统计用户数量
   * @param {Object} query - 查询条件
   * @returns {Promise<Number>} 用户数量
   */
  static async countDocuments(query = {}) {
    const connection = await pool.getConnection();
    try {
      let sql = 'SELECT COUNT(*) as count FROM users WHERE 1=1';
      const params = [];

      if (query.role) {
        sql += ' AND role = ?';
        params.push(query.role);
      }

      // 排除指定角色（用于排除管理员）
      if (query.excludeRole) {
        sql += ' AND role != ?';
        params.push(query.excludeRole);
      }

      if (query.isActive !== undefined) {
        sql += ' AND is_active = ?';
        params.push(query.isActive);
      }

      // 排除指定ID的用户（用于排除当前管理员自己）
      if (query.excludeId) {
        sql += ' AND id != ?';
        params.push(query.excludeId);
      }

      // 处理搜索（用户名或邮箱）
      if (query.search) {
        sql += ' AND (username LIKE ? OR email LIKE ?)';
        const searchPattern = `%${query.search}%`;
        params.push(searchPattern, searchPattern);
      }

      const [result] = await connection.execute(sql, params);
      return result[0].count;
    } finally {
      connection.release();
    }
  }
}

module.exports = User;
