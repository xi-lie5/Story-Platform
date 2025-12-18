### 删除功能范围
1. **statistics字段**：删除节点中的浏览量和阅读时间统计字段
2. **incrementViewCount()方法**：删除增加浏览量的实例方法
3. **updateAvgReadTime()方法**：删除更新平均阅读时间的实例方法
4. **复制节点时的statistics初始化**：删除复制节点时的统计数据初始化

### 删除步骤
1. 删除`StoryNode.js`中第93-102行的`statistics`字段定义
2. 删除第152-156行的`incrementViewCount()`方法
3. 删除第159-165行的`updateAvgReadTime()`方法
4. 删除第578-581行复制节点时的`statistics`初始化代码

### 影响评估
- 只删除了未使用的统计功能
- 不影响故事节点的核心功能
- 不影响其他文件
- 简化了数据结构和代码