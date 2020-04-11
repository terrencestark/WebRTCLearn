var httpServer = require('http').createServer();
var io = require('socket.io')(httpServer);
httpServer.listen(8401);

console.log('server start at 8401.')

io.on('connection',  (socket)=>{
  let roomName = 'room test';
  console.log(`client [${socket.id}] connected to server!`);
  console.log('join in: ' + roomName)
  socket.join(roomName);
  
  socket.on('disconnect', ()=>{
    console.log(`client [${socket.id}] disconnect`);
  });
  
  // SDP消息转发
  socket.on('sdp msg', (obj) => {
    console.log('get sdp form:' + obj.id);
    console.log('send sdp msg to room');
    socket.to(roomName).emit('sdp msg', obj.sdp);
  })

  // candidate消息竹筏
  socket.on('candidate msg', (obj) => {
    console.log('get candidate form:' + obj.id);
    console.log('send candidate msg to room');
    socket.to(roomName).emit('candidate msg', obj.candidate);
  })
});