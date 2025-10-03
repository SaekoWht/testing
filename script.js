let mediaRecorder;
let recordedChunks = [];
let stream;
let startTime;
let timerInterval;
let cameras = [];

const webcam = document.getElementById('webcam');
const playBtn = document.getElementById('playBtn');
const pauseBtn = document.getElementById('pauseBtn');
const stopBtn = document.getElementById('stopBtn');
const saveBtn = document.getElementById('saveBtn');
const timestamp = document.getElementById('timestamp');
const cameraSelect = document.getElementById('cameraSelect');

async function getCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        cameras = devices.filter(device => device.kind === 'videoinput');
        
        cameraSelect.innerHTML = '<option value="">Select Camera</option>';
        cameras.forEach((camera, index) => {
            const option = document.createElement('option');
            option.value = camera.deviceId;
            option.textContent = camera.label || `Camera ${index + 1}`;
            cameraSelect.appendChild(option);
        });
        
        if (cameras.length > 0) {
            cameraSelect.value = cameras[0].deviceId;
        }
    } catch (err) {
        console.error('Error getting cameras:', err);
    }
}

async function initWebcam(deviceId = null) {
    try {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        
        const constraints = {
            video: { width: 1280, height: 720 },
            audio: true
        };
        
        if (deviceId) {
            constraints.video.deviceId = { exact: deviceId };
        }
        
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        webcam.srcObject = stream;
    } catch (err) {
        alert('Error accessing webcam: ' + err.message);
    }
}

function updateTimer() {
    const elapsed = Date.now() - startTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    timestamp.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

playBtn.addEventListener('click', () => {
    if (!stream) {
        initWebcam();
        return;
    }
    
    recordedChunks = [];
    const options = { mimeType: 'video/mp4' };
    if (!MediaRecorder.isTypeSupported('video/mp4')) {
        options.mimeType = 'video/webm';
    }
    mediaRecorder = new MediaRecorder(stream, options);
    
    mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.push(e.data);
    };
    
    mediaRecorder.start();
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 1000);
    webcam.classList.add('recording');
});

pauseBtn.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.pause();
        clearInterval(timerInterval);
    } else if (mediaRecorder && mediaRecorder.state === 'paused') {
        mediaRecorder.resume();
        timerInterval = setInterval(updateTimer, 1000);
    }
});

stopBtn.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        clearInterval(timerInterval);
        webcam.classList.remove('recording');
    }
});

saveBtn.addEventListener('click', async () => {
    const name = document.getElementById('nameInput').value.trim();
    const dob = document.getElementById('dobInput').value.trim();
    const gender = document.getElementById('genderInput').value;
    const date = document.getElementById('dateInput').value.trim();
    const phone = document.getElementById('phoneInput').value.trim();
    
    if (!name || !dob || !gender || !date || !phone) {
        alert('Please fill all fields before saving!');
        return;
    }
    
    if (recordedChunks.length === 0) {
        alert('No recording to save');
        return;
    }
    
    if (window.electronAPI) {
        const folderPath = await window.electronAPI.selectDirectory();
        if (!folderPath) return;
        
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const buffer = await blob.arrayBuffer();
        const fileName = `${name}_${date.replace(/\//g, '-')}_recording.mp4`;
        
        const userData = `Name: ${name}\nDate of Birth: ${dob}\nGender: ${gender}\nDate: ${date}\nPhone: ${phone}`;
        
        const result = await window.electronAPI.saveFile({
            folderPath,
            fileName,
            buffer,
            userData
        });
        
        if (result.success) {
            alert('Recording and data saved successfully!');
        } else {
            alert('Error saving file: ' + result.error);
        }
    } else {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${name}_${date.replace(/\//g, '-')}_recording.mp4`;
        a.click();
        URL.revokeObjectURL(url);
        alert('Recording saved to Downloads!');
    }
});

cameraSelect.addEventListener('change', () => {
    if (cameraSelect.value) {
        initWebcam(cameraSelect.value);
    }
});

// Set default date to today
document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('dateInput').value = new Date().toLocaleDateString();
    await getCameras();
    if (cameras.length > 0) {
        initWebcam(cameras[0].deviceId);
    }
});