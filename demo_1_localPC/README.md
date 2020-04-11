# 内容简介
Demo内容包括：
* 本地媒体获取`getUserMedia()`
* Node.js with Socket.io的信令服务器，转发SDP与candidate内容，完成协与PeerConnection的连接建立
* RTCPeerConnection的使用：建立连接与获取媒体

发布与订阅在一个页面完成。

# 运行

1. `node server.js`
2. open index.html in browser
3. publisher start, subscriber start
4. call

# 其它
`npm install --save socketio`