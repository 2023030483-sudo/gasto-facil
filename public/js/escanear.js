import { ANALYZE_FUNCTION_PATH } from './config.js';
import { setActiveNav, setTicketData } from './common.js';

const video = document.getElementById('videoEl');
const canvas = document.getElementById('canvasEl');
const previewCard = document.getElementById('previewCard');
const previewImg = document.getElementById('previewImg');
const previewFileName = document.getElementById('previewFileName');
const btnCapture = document.getElementById('btnCapture');
const btnRemove = document.getElementById('btnRemove');
const btnAnalyze = document.getElementById('btnAnalyze');
const loadingOverlay = document.getElementById('loadingOverlay');
const fileInput = document.getElementById('fileInput');
let capturedBlob = null;

async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    video.srcObject = stream;
  } catch (e) {
    console.log('Cámara no disponible:', e.message);
  }
}

function showPreview(src, name) {
  previewImg.src = src;
  previewFileName.textContent = name;
  previewCard.style.display = 'flex';
  btnAnalyze.style.display = 'flex';
}

btnCapture.addEventListener('click', () => {
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
  canvas.toBlob(blob => {
    if (!blob) return;
    capturedBlob = blob;
    showPreview(URL.createObjectURL(blob), 'captura_ticket.jpg');
  }, 'image/jpeg', 0.9);
});

fileInput.addEventListener('change', event => {
  const file = event.target.files[0];
  if (!file) return;
  capturedBlob = file;
  showPreview(URL.createObjectURL(file), file.name);
});

btnRemove.addEventListener('click', () => {
  capturedBlob = null;
  previewCard.style.display = 'none';
  btnAnalyze.style.display = 'none';
  fileInput.value = '';
});

btnAnalyze.addEventListener('click', async () => {
  if (!capturedBlob) return;
  loadingOverlay.style.display = 'flex';
  btnAnalyze.disabled = true;

  try {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target.result;
      const response = await fetch(ANALYZE_FUNCTION_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 })
      });
      const data = await response.json();
      if (data.ok) {
        setTicketData(data.datos);
        window.location.href = '/escanear/confirmar/';
      } else {
        alert('Error al analizar: ' + (data.error || 'Intenta de nuevo'));
        loadingOverlay.style.display = 'none';
        btnAnalyze.disabled = false;
      }
    };
    reader.readAsDataURL(capturedBlob);
  } catch (err) {
    alert('Error de red: ' + err.message);
    loadingOverlay.style.display = 'none';
    btnAnalyze.disabled = false;
  }
});

function load() {
  setActiveNav('escanear');
  startCamera();
}

window.addEventListener('DOMContentLoaded', load);
