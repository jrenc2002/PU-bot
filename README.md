# 请不要盈利,不要把时间浪费在这个上面，你的人生还很长，贩卖它并不能让你发财。期望消除信息差，让每个人都可以抢的上PU，不要因为PU而无法顺利毕业。
# 本项目持续到24年4月3日可用。

# PU口袋校园活动报名机器人 

这是一个将原Python版本转换成纯JavaScript Web应用的版本，无需安装任何环境即可运行。

## 功能特点

- 多用户管理：可以添加、删除多个用户账号
- 活动报名：支持添加多个活动ID进行报名
- 定时功能：根据活动开始时间自动计时，准时发送报名请求
- 并发报名：使用多个并发请求提高报名成功率
- 本地存储：用户数据和活动ID存储在浏览器本地，保护隐私

## 使用方法

### 直接运行

1. 将`index.html`和`app.js`文件下载到同一个文件夹中
2. 直接在浏览器中打开`index.html`文件即可使用

## 使用步骤

1. **添加用户**：
   - 点击"添加用户"按钮
   - 输入用户名和密码
   - 输入学校名称并搜索
   - 从列表中选择正确的学校
   - 点击"保存"

2. **添加活动**：
   - 在活动ID输入框中输入活动ID
   - 点击"添加活动"按钮

3. **开始报名**：
   - 确认已添加用户和活动
   - 点击"开始报名"按钮
   - 报名过程和结果将显示在日志区域

## 数据安全

- 所有数据仅存储在浏览器本地，不会上传到任何服务器
- 可随时通过浏览器的开发者工具清除本地存储数据

## 注意事项

- 此工具仅用于学习和研究目的
- 请勿过度频繁地发送请求，以免对服务器造成压力
- 使用多账号同时报名可能导致被系统识别为异常行为
- 活动ID必须为数字，程序会自动将其转换为整数类型

---

使用中有任何问题或建议，欢迎提出，可以给个Star。  

# 思路源于[@pu-signupbot-main](https://github.com/RedForestLonvor/PU-SignUpBot)
