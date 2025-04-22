import { getParams, getWSConnect } from "./utils/spark";

let questionInput = document.querySelector("#question");
let sendMsgBtn = document.querySelector("#btn");
let result = document.querySelector("#result");

let chatHistoryList = [];

// 点击发送信息按钮
sendMsgBtn.addEventListener('click', (e) => {
    sendMsg();
});

// 输入完信息点击enter发送信息
questionInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
        sendMsg();
    }
});

// 发送消息
const sendMsg = async () => {
    sendMsgBtn.style.display = 'none';
    let answer = ""; // 回答

    // 获取输入框中的内容
    let inputVal = questionInput.value;
    questionInput.value = "请稍等...";

    // 拼接问题描述（仅用于发送给模型，不显示给用户）
    let preface = `客户的问题是：${inputVal}。请按以下类别选择最适合的分类: 1、重置密码 2、硬件维修 3、网络问题 4、系统软件问题 5、医院转科问题 6、UK或U盾问题 7、五定药品类 8、CA签名问题 9、互联网挂号问题 10、其他问题 `;

    let questionToSend = preface + inputVal;

    // 仅将用户输入的问题添加到聊天记录中（不包括引导部分）
    chatHistoryList.push({ role: 'user', content: inputVal });
    const params = getParams(chatHistoryList);

    // 每次发送问题都是一个新的websocket请求
    const connect = await getWSConnect();
    console.log("发送消息");

    connect.send(JSON.stringify(params));
    
    connect.addEventListener('message', (event) => {
        let data = JSON.parse(event.data);
        if (data.header.code !== 0) {
            console.log("出错了", data.header.code, ":", data.header.message);
            // 出错了"手动关闭连接"
            connect.close();
        }
        if (data.header.code === 0) {
            // 对话已经完成
            if (data.payload.choices.text && data.header.status === 2) {
                answer += data.payload.choices.text[0].content;
                chatHistoryList.push({
                    role: 'assistant',
                    content: answer,
                });
                answer = "";
                addMsgToTextarea(chatHistoryList);
                setTimeout(() => {
                    // "对话完成，手动关闭连接"
                    connect.close();
                }, 1000);
                sendMsgBtn.style.display = 'block';
                questionInput.value = "继续聊天";
            } else {
                answer += data.payload.choices.text[0].content;
            }
        }
    });

    connect.addEventListener('close', (event) => {
        console.log('聊天完成关闭', event);
        // 对话完成后socket会关闭，将聊天记录换行处理
        // 清空输入框
        questionInput.value = '';
    });
}

/** 将信息添加到textare中
    在textarea中不支持HTML标签。
    不能使用
    <br>标签进行换行。
    也不能使用\r\n这样的转义字符。

    要使Textarea中的内容换行，可以使用&#13;或者&#10;来进行换行。
    &#13;表示回车符；&#10;表示换行符；
*/
const addMsgToTextarea = (chatHistoryList) => {
    console.log(chatHistoryList);
    // 清空当前内容
    result.innerHTML = '';
    // 循环遍历聊天记录并渲染
    chatHistoryList.forEach(item => {
        // 创建一个新的 div 元素来显示每条聊天记录
        let messageDiv = document.createElement('div');

        // 根据角色决定样式，用户和助手的消息可以有不同的显示风格
        if (item.role === 'user') {
            messageDiv.classList.add('user-message');
        } else if (item.role === 'assistant') {
            messageDiv.classList.add('assistant-message');
        }

        // 设置消息内容
        messageDiv.innerHTML = item.content;

        // 将新的消息元素添加到 result 容器中
        result.appendChild(messageDiv);
    });
}
