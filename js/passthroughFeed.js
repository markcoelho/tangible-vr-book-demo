// script.js 
setTimeout(() => {
    const arjsVideo = document.getElementById('arjs-video');
    if (arjsVideo?.srcObject) {
        const arFeed = document.getElementById('arjs_feed');
        arFeed.srcObject = arjsVideo.srcObject;
        arFeed.setAttribute('src', '#arjs-video');
    }
}, 3000);

//aux function to get timestamps
function getTimestamp() {
    const now = new Date();
    return `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
}