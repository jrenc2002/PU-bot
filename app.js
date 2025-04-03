// 活动机器人类，用于处理登录和报名
class ActivityBot {
    constructor(userData) {
        this.login_url = "https://apis.pocketuni.net/uc/user/login";
        this.activity_url = "https://apis.pocketuni.net/apis/activity/join";
        this.info_url = "https://apis.pocketuni.net/apis/activity/info";
        this.userData = userData;
        this.curToken = "";
        this.flag = {};
        this.debug = false;

        // HTTP头信息
        this.HEADERS_LOGIN = {
            "User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.87 Safari/537.36",
            "Content-Type": "application/json",
            "Accept": "application/json, text/plain, */*"
        };

        this.HEADERS_ACTIVITY = {
            "User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.87 Safari/537.36",
            "Content-Type": "application/json",
            "Accept": "application/json, text/plain, */*"
        };

        this.HEADERS_ACTIVITY_INFO = {
            "User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.87 Safari/537.36",
            "Content-Type": "application/json",
            "Accept": "application/json, text/plain, */*"
        };
    }

    // 记录日志到UI
    log(message, type = 'info') {
        const logContainer = document.getElementById('log-container');
        if (logContainer) {
            const logEntry = document.createElement('div');
            logEntry.className = `log-entry ${type}`;
            const time = new Date().toLocaleTimeString();
            logEntry.textContent = `[${time}] [${this.userData.userName}] ${message}`;
            logContainer.appendChild(logEntry);
            logContainer.scrollTop = logContainer.scrollHeight;
        }
        console.log(`[${this.userData.userName}] ${message}`);
    }

    // 登录并获取Token
    async login() {
        try {
            const response = await fetch(this.login_url, {
                method: 'POST',
                headers: this.HEADERS_LOGIN,
                body: JSON.stringify(this.userData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.curToken = data.data?.token;

            if (this.curToken) {
                this.log(`获取的Token: ${this.curToken}`, 'success');
                return this.curToken;
            } else {
                throw new Error("Token获取失败");
            }
        } catch (error) {
            this.log(`登录失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
            return null;
        }
    }

    // 获取活动开始时间
    async getJoinStartTime(activityId) {
        if (this.debug) {
            return new Date(Date.now() + 15000); // debug模式下15秒后开始
        }

        try {
            const headers = { ...this.HEADERS_ACTIVITY_INFO };
            headers["Authorization"] = `Bearer ${this.curToken}:${this.userData.sid}`;

            // 将活动ID转换为整数类型
            const numericActivityId = parseInt(activityId, 10);
            
            const response = await fetch(this.info_url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ id: numericActivityId })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const joinStartTimeStr = data.data?.baseInfo?.joinStartTime;
            
            this.log(`活动开始时间: ${joinStartTimeStr}`);
            
            if (joinStartTimeStr) {
                return new Date(joinStartTimeStr);
            }
            return null;
        } catch (error) {
            this.log(`获取活动信息失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
            return null;
        }
    }

    // 报名活动
    async signup(activityId) {
        // 尝试登录最多5次
        let cnt = 0;
        while (cnt < 5) {
            cnt++;
            this.curToken = await this.login() || "";
            if (this.curToken) break;
        }

        if (!this.curToken) {
            this.log("无法获取有效的Token, 报名中止", 'error');
            return;
        }

        // 将活动ID转换为整数
        const numericActivityId = parseInt(activityId, 10);
        const data = { activityId: numericActivityId };

        // 获取活动开始时间
        const startTime = await this.getJoinStartTime(activityId);
        if (!startTime) {
            this.log("未能获取活动开始时间", 'error');
            return;
        }

        // 计算距离开始的时间
        let timeToStart = (startTime.getTime() - Date.now()) / 1000;
        
        // 如果距离开始时间小于60秒，立即重新登录
        if (timeToStart <= 60) {
            while (true) {
                this.curToken = await this.login() || "";
                if (this.curToken) break;
            }
        } else {
            // 如果距离开始时间大于60秒，等待到开始前60秒
            this.log(`距离报名开始还有 ${timeToStart.toFixed(0)} 秒，将在开始前 60 秒重新登录`);
            await new Promise(resolve => setTimeout(resolve, (timeToStart - 60) * 1000));
        }

        // 重新计算距离开始的时间
        timeToStart = (startTime.getTime() - Date.now()) / 1000;
        
        // 如果还有剩余时间，继续等待
        if (timeToStart > 0) {
            this.log(`距离报名开始还有 ${timeToStart.toFixed(0)} 秒，准备就绪`);
            await new Promise(resolve => setTimeout(resolve, timeToStart * 1000));
        }

        // 开始报名，发送多个并发请求
        this.log(`开始发送报名请求`, 'info');
        
        // 定义发送报名请求的函数
        const sendRequest = async () => {
            if (this.flag[activityId]) return;
            
            try {
                const headers = { ...this.HEADERS_ACTIVITY };
                headers["Authorization"] = `Bearer ${this.curToken}:${this.userData.sid}`;
                
                const response = await fetch(this.activity_url, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(data)
                });
                
                if (response.ok) {
                    const responseText = await response.text();
                    this.log(`请求成功,活动: ${activityId}, 响应: ${responseText}`, 'success');
                    
                    if (responseText.includes('报名成功') || responseText.includes('请勿重复操作')) {
                        this.flag[activityId] = true;
                    }
                } else {
                    this.log(`报名尝试失败: ${response.status} ${response.statusText}`, 'error');
                }
            } catch (error) {
                this.log(`报名过程中出错: ${error instanceof Error ? error.message : String(error)}`, 'error');
            }
        };

        // 第一波3个请求
        const promises1 = [];
        for (let i = 0; i < 3; i++) {
            promises1.push(sendRequest());
        }
        await Promise.all(promises1);

        // 第二波10个请求，每秒1个，如果成功则停止
        for (let i = 0; i < 10; i++) {
            if (this.flag[activityId]) break;
            await sendRequest();
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // 第三波60个请求，每秒1个，如果成功则停止
        for (let i = 0; i < 60; i++) {
            if (this.flag[activityId]) break;
            await sendRequest();
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        if (this.flag[activityId]) {
            this.log(`活动 ${activityId} 报名成功!`, 'success');
        } else {
            this.log(`活动 ${activityId} 报名可能失败，请手动检查`, 'warning');
        }
    }
}

// 用户数据管理类
class UserDataManager {
    constructor() {
        this.userData = [];
        this.localStorageKey = 'puSignupUserData';
        this.loadUserData();
    }

    // 从localStorage加载用户数据
    loadUserData() {
        const savedData = localStorage.getItem(this.localStorageKey);
        if (savedData) {
            try {
                this.userData = JSON.parse(savedData);
                this.updateUserTable();
            } catch (error) {
                console.error("加载用户数据失败:", error);
                this.userData = [];
            }
        }
    }

    // 保存用户数据到localStorage
    saveUserData() {
        localStorage.setItem(this.localStorageKey, JSON.stringify(this.userData));
        this.updateUserTable();
    }

    // 获取所有用户数据
    getUserData() {
        return this.userData;
    }

    // 添加新用户
    addUser(user) {
        this.userData.push(user);
        this.saveUserData();
        logToUI(`添加用户 ${user.userName} 成功`, 'success');
    }

    // 删除用户
    deleteUser(index) {
        if (index >= 0 && index < this.userData.length) {
            const userName = this.userData[index].userName;
            this.userData.splice(index, 1);
            this.saveUserData();
            logToUI(`删除用户 ${userName} 成功`, 'success');
        }
    }

    // 更新用户表格
    updateUserTable() {
        const userList = document.getElementById('user-list');
        if (!userList) return;

        userList.innerHTML = '';
        
        this.userData.forEach((user, index) => {
            const row = document.createElement('tr');
            
            // 用户名单元格
            const nameCell = document.createElement('td');
            nameCell.textContent = user.userName;
            row.appendChild(nameCell);
            
            // 学校单元格
            const schoolCell = document.createElement('td');
            schoolCell.textContent = user.sid.toString();
            row.appendChild(schoolCell);
            
            // 操作单元格
            const actionCell = document.createElement('td');
            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete';
            deleteButton.textContent = '删除';
            deleteButton.addEventListener('click', () => this.deleteUser(index));
            actionCell.appendChild(deleteButton);
            row.appendChild(actionCell);
            
            userList.appendChild(row);
        });
    }

    // 获取学校列表
    async getSchoolList() {
        try {
            const response = await fetch('https://pocketuni.net/index.php?app=api&mod=Sitelist&act=getSchools', {
                method: 'GET',
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.87 Safari/537.36",
                    "Content-Type": "application/json",
                    "Accept": "application/json, text/plain, */*"
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            logToUI(`获取学校列表失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
            return [];
        }
    }

    // 查找匹配的学校
    findSchools(schoolList, schoolName) {
        return schoolList.filter(school => school.name.includes(schoolName));
    }
}

// 活动管理类
class ActivityManager {
    constructor() {
        this.activities = [];
        this.localStorageKey = 'puSignupActivities';
        this.loadActivities();
    }

    // 从localStorage加载活动ID
    loadActivities() {
        const savedData = localStorage.getItem(this.localStorageKey);
        if (savedData) {
            try {
                this.activities = JSON.parse(savedData);
                this.updateActivityList();
            } catch (error) {
                console.error("加载活动数据失败:", error);
                this.activities = [];
            }
        }
    }

    // 保存活动ID到localStorage
    saveActivities() {
        localStorage.setItem(this.localStorageKey, JSON.stringify(this.activities));
    }

    // 添加活动
    addActivity(activityId) {
        if (!this.activities.includes(activityId)) {
            this.activities.push(activityId);
            this.saveActivities();
            this.updateActivityList();
            logToUI(`添加活动 ${activityId} 成功`, 'success');
        } else {
            logToUI(`活动 ${activityId} 已存在`, 'warning');
        }
    }

    // 删除活动
    deleteActivity(activityId) {
        const index = this.activities.indexOf(activityId);
        if (index !== -1) {
            this.activities.splice(index, 1);
            this.saveActivities();
            this.updateActivityList();
            logToUI(`删除活动 ${activityId} 成功`, 'success');
        }
    }

    // 获取所有活动
    getActivities() {
        return this.activities;
    }

    // 更新活动列表
    updateActivityList() {
        const activityList = document.getElementById('activity-list');
        if (!activityList) return;

        activityList.innerHTML = '';
        
        this.activities.forEach(activityId => {
            const listItem = document.createElement('li');
            listItem.style.display = 'flex';
            listItem.style.justifyContent = 'space-between';
            listItem.style.alignItems = 'center';
            listItem.style.marginBottom = '5px';
            
            const activityText = document.createElement('span');
            activityText.textContent = activityId;
            listItem.appendChild(activityText);
            
            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete';
            deleteButton.textContent = '删除';
            deleteButton.style.padding = '3px 8px';
            deleteButton.addEventListener('click', () => this.deleteActivity(activityId));
            listItem.appendChild(deleteButton);
            
            activityList.appendChild(listItem);
        });
    }
}

// 记录日志到UI
function logToUI(message, type = 'info') {
    const logContainer = document.getElementById('log-container');
    if (logContainer) {
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        const time = new Date().toLocaleTimeString();
        logEntry.textContent = `[${time}] ${message}`;
        logContainer.appendChild(logEntry);
        logContainer.scrollTop = logContainer.scrollHeight;
    }
    console.log(message);
}

// 开始报名
async function startSignup(userManager, activityManager) {
    const users = userManager.getUserData();
    const activities = activityManager.getActivities();
    
    if (users.length === 0) {
        logToUI('无用户数据，请先添加用户！', 'error');
        return;
    }
    
    if (activities.length === 0) {
        logToUI('未添加活动ID，请先添加活动！', 'error');
        return;
    }
    
    logToUI('开始报名流程...', 'info');
    
    // 为每个用户创建机器人
    for (const user of users) {
        // 为每个活动创建报名任务
        for (const activityId of activities) {
            const bot = new ActivityBot(user);
            // 将报名任务设置为异步任务，不阻塞主线程
            setTimeout(() => {
                bot.signup(activityId);
            }, 0);
        }
    }
}

// 主函数
document.addEventListener('DOMContentLoaded', () => {
    const userManager = new UserDataManager();
    const activityManager = new ActivityManager();
    
    // 添加用户按钮事件
    const addUserBtn = document.getElementById('add-user-btn');
    if (addUserBtn) {
        addUserBtn.addEventListener('click', () => {
            const addUserForm = document.getElementById('add-user-form');
            if (addUserForm) {
                addUserForm.style.display = 'block';
            }
        });
    }
    
    // 取消添加用户事件
    const cancelUserBtn = document.getElementById('cancel-user-btn');
    if (cancelUserBtn) {
        cancelUserBtn.addEventListener('click', () => {
            const addUserForm = document.getElementById('add-user-form');
            if (addUserForm) {
                addUserForm.style.display = 'none';
            }
        });
    }
    
    // 搜索学校事件
    const searchSchoolBtn = document.getElementById('search-school-btn');
    if (searchSchoolBtn) {
        searchSchoolBtn.addEventListener('click', async () => {
            const schoolInput = document.getElementById('school-input');
            const schoolName = schoolInput?.value?.trim();
            
            if (!schoolName) {
                logToUI('请输入学校名称', 'warning');
                return;
            }
            
            logToUI('正在搜索学校...', 'info');
            const schools = await userManager.getSchoolList();
            const matchingSchools = userManager.findSchools(schools, schoolName);
            
            if (matchingSchools.length === 0) {
                logToUI('未找到匹配的学校', 'error');
                return;
            }
            
            const schoolSelect = document.getElementById('school-select');
            const schoolSelectGroup = document.getElementById('school-select-group');
            
            if (schoolSelect && schoolSelectGroup) {
                schoolSelect.innerHTML = '';
                
                matchingSchools.forEach(school => {
                    const option = document.createElement('option');
                    option.value = school.go_id;
                    option.textContent = school.name;
                    schoolSelect.appendChild(option);
                });
                
                schoolSelectGroup.style.display = 'block';
                logToUI(`找到 ${matchingSchools.length} 所匹配的学校`, 'success');
            }
        });
    }
    
    // 保存用户事件
    const saveUserBtn = document.getElementById('save-user-btn');
    if (saveUserBtn) {
        saveUserBtn.addEventListener('click', () => {
            const usernameInput = document.getElementById('username-input');
            const passwordInput = document.getElementById('password-input');
            const schoolSelect = document.getElementById('school-select');
            
            const username = usernameInput?.value?.trim();
            const password = passwordInput?.value?.trim();
            const sid = schoolSelect?.value;
            
            if (!username || !password || !sid) {
                logToUI('请填写完整的用户信息', 'warning');
                return;
            }
            
            const newUser = {
                userName: username,
                password: password,
                sid: Number(sid),
                device: 'pc'
            };
            
            userManager.addUser(newUser);
            
            // 重置表单
            usernameInput.value = '';
            passwordInput.value = '';
            
            const addUserForm = document.getElementById('add-user-form');
            const schoolSelectGroup = document.getElementById('school-select-group');
            
            if (addUserForm) {
                addUserForm.style.display = 'none';
            }
            
            if (schoolSelectGroup) {
                schoolSelectGroup.style.display = 'none';
            }
        });
    }
    
    // 添加活动事件
    const addActivityBtn = document.getElementById('add-activity-btn');
    if (addActivityBtn) {
        addActivityBtn.addEventListener('click', () => {
            const activityInput = document.getElementById('activity-id-input');
            const activityId = activityInput?.value?.trim();
            
            if (!activityId) {
                logToUI('请输入活动ID', 'warning');
                return;
            }
            
            activityManager.addActivity(activityId);
            activityInput.value = '';
        });
    }
    
    // 开始报名事件
    const startSignupBtn = document.getElementById('start-signup-btn');
    if (startSignupBtn) {
        startSignupBtn.addEventListener('click', () => {
            startSignup(userManager, activityManager);
        });
    }
    
    // 清空日志事件
    const clearLogBtn = document.getElementById('clear-log-btn');
    if (clearLogBtn) {
        clearLogBtn.addEventListener('click', () => {
            const logContainer = document.getElementById('log-container');
            if (logContainer) {
                logContainer.innerHTML = '';
                logToUI('日志已清空', 'info');
            }
        });
    }
}); 