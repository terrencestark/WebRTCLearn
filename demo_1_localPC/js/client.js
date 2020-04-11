'use strict';

//// commom part
function trace(text) {
  text = text.trim();
  const now = (window.performance.now() / 1000).toFixed(3);
  console.log(now, text);
}

function setSessionDescriptionError(error) {
  trace(`Failed to create session description: ${error.toString()}.`);
}

//// publisher part
let socket_pub = io('http://127.0.0.1:8401');

// MediaStream设置
const mediaStreamConstraints = {
  video: true,
};
// SDP设置.
const offerOptions = {
  offerToReceiveVideo: 1,
};
// 变量声明
const localVideo = document.getElementById('localVideo');
let localStream;
let localPeerConnection;

// [1] Pub start 获取本地媒体.
function pubStartAction() {
  pubStartButton.disabled = true;
  navigator.mediaDevices.getUserMedia(mediaStreamConstraints)
    .then(gotLocalMediaStream).catch(handleLocalMediaStreamError);
  trace('Requesting local stream.');
}

// 发布端显示获取的媒体.
function gotLocalMediaStream(mediaStream) {
  localVideo.srcObject = mediaStream;
  localStream = mediaStream;
  trace('Received local stream.');
  callButton.disabled = false;  // Enable call button.
}
// 错误处理
function handleLocalMediaStreamError(error) {
  trace(`navigator.getUserMedia error: ${error.toString()}.`);
}

// [3] publisher 发起连接
function callAction() {
  callButton.disabled = true;
  hangupButton.disabled = false;

  trace('Starting call.');

  // Get local media stream tracks.
  const videoTracks = localStream.getVideoTracks();
  const audioTracks = localStream.getAudioTracks();
  if (videoTracks.length > 0) {
    trace(`Using video device: ${videoTracks[0].label}.`);
  }
  if (audioTracks.length > 0) {
    trace(`Using audio device: ${audioTracks[0].label}.`);
  }

  const servers = null;  // Allows for RTC server configuration.

  // Create peer connections and add behavior.
  localPeerConnection = new RTCPeerConnection(servers);
  trace('Created local peer connection object localPeerConnection.');

  localPeerConnection.addEventListener('icecandidate', pubHandleConnection);
  localPeerConnection.addEventListener(
    'iceconnectionstatechange', pubHandleConnectionChange);
  
  // Add local stream to connection and create offer to connect.
  localPeerConnection.addStream(localStream);
  trace('Added local stream to localPeerConnection.');

  // 先设置收到SDP answer的回调
  socket_pub.on('sdp msg', (description)=>{
    localPeerConnection.setRemoteDescription(description)
      .then(()=>{
        trace('pub set remote sdp success.');
      }).catch(()=>{
        trace('pub set remote sdp failed.');
      })
  });
  // 设置收到candidate回调
  socket_pub.on('candidate msg', (iceCandidate)=>{
    const newIceCandidate = new RTCIceCandidate(iceCandidate);
    localPeerConnection.addIceCandidate(newIceCandidate)
      .then(()=>{
        trace('pub add candidate success.');
      }).catch(()=>{
        trace('pub add candidate failed.');
      });
  })

  // 建立offer、设置并发送
  trace('localPeerConnection createOffer start.');
  localPeerConnection.createOffer(offerOptions)
    .then((description)=>{
      // 本地设置SDP
      localPeerConnection.setLocalDescription(description)
      .then(() => {
        trace('pub set local sdp success.');
      }).catch(()=>{
        trace('pub set local sdp failed.');
      });
      // 发送SDP
      socket_pub.emit('sdp msg', {'id':'pub', 'sdp':description});
    }).catch(setSessionDescriptionError);
}

// Connects with new peer candidate.
function pubHandleConnection(event) {
  const peerConnection = event.target;
  const iceCandidate = event.candidate;

  if (iceCandidate) {
    // pub生成一个candidate，需要发送到peer，让对方添加到candidate pool
    socket_pub.emit('candidate msg', {'id':'pub', 'candidate':iceCandidate});
  }
}

function pubHandleConnectionChange(event){
  const peerConnection = event.target;
  trace('ICE state change event: ', event);
}

//// subscriber part
let socket_sub = io('http://127.0.0.1:8401');

const remoteVideo = document.getElementById('remoteVideo');
let remoteStream;
let remotePeerConnection;

function gotRemoteMediaStream(event) {
  const mediaStream = event.stream;
  remoteVideo.srcObject = mediaStream;
  remoteStream = mediaStream;
  trace('Remote peer connection received remote stream.');
}

function subHandleConnection(event){
  const peerConnection = event.target;
  const iceCandidate = event.candidate;

  if (iceCandidate) {
    // pub生成一个candidate，需要发送到peer，让对方添加到candidate pool
    socket_sub.emit('candidate msg', {'id':'pub', 'candidate':iceCandidate});
  }

}
function subHandleConnectionChange(event){
  const peerConnection = event.target;
  console.log('ICE state change event: ', event);
}
function subStartAction() {
  substartButton.disabled = true;
  callButton.disabled = false;
  remotePeerConnection = new RTCPeerConnection(null);
  trace('Created remote peer connection object remotePeerConnection.');

  remotePeerConnection.addEventListener('icecandidate', subHandleConnection);
  remotePeerConnection.addEventListener(
    'iceconnectionstatechange', subHandleConnectionChange);
  remotePeerConnection.addEventListener('addstream', gotRemoteMediaStream);
  // candidate回调
  socket_sub.on('candidate msg', (iceCandidate)=>{
    const newIceCandidate = new RTCIceCandidate(iceCandidate);
    localPeerConnection.addIceCandidate(newIceCandidate)
      .then(()=>{
        trace('sub add candidate success.');
      }).catch(()=>{
        trace('sub add candidate failed.');
      });
  });
  socket_sub.on('sdp msg', (description)=>{
    trace('remotePeerConnection setRemoteDescription start.');
    // sub 设置remote SDP
    remotePeerConnection.setRemoteDescription(description)
      .then(() => {
        trace('sub set remote sdp success.');
      }).catch(()=>{
        trace('sub set remote sdp failed.');
      });
    // sub 建立answer
    trace('remotePeerConnection createAnswer start.');
    remotePeerConnection.createAnswer()
      .then((description)=>{
        // sub 设置local SDP
        remotePeerConnection.setLocalDescription(description)
          .then(()=>{
            trace('sub set local sdp success.');
          }).catch(()=>{
            trace('sub set local sdp failed.')
          })
        // sub 发送Answer
        socket_sub.emit('sdp msg', {'id':'sub', 'sdp':description});
      }).catch(setSessionDescriptionError);
  })
}

// dom
const pubstartButton = document.getElementById('pubStartButton');
const substartButton = document.getElementById('subStartButton');
const callButton = document.getElementById('callButton');
const hangupButton = document.getElementById('hangupButton');
// Add click event handlers for buttons.
pubstartButton.addEventListener('click', pubStartAction);
substartButton.addEventListener('click', subStartAction);
callButton.addEventListener('click', callAction);
hangupButton.addEventListener('click', hangupAction);

function hangupAction() {
  localPeerConnection.close();
  remotePeerConnection.close();
  localPeerConnection = null;
  remotePeerConnection = null;
  hangupButton.disabled = true;
  callButton.disabled = true;
  substartButton.disabled = false;
  trace('Ending call.');
}