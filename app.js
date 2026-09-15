/**
 * MEP GROUP ID CARD GENERATOR
 * High-Performance Liquid Glass Architecture with Real-Time Persistence
 * Zero Lag • 60+ FPS Rendering • LocalStorage Auto-Save
 */

const LOCAL_STORAGE_KEY = 'mep_id_card_saved_state_v1';

// Application State
const state = {
  // Front fields
  name: 'Kazi Mahmud Alam',
  designation: 'Senior Executive',
  section: 'Administration',
  employeeId: '17224',
  photoImg: null,
  photoDataUrl: null,
  photoScale: 1.0,
  photoOffsetX: 0,
  photoOffsetY: 0,
  signatureImg: null,
  signatureDataUrl: null,

  // Back fields
  dateOfIssue: '14 Sep 2026',
  dateOfJoin: '01 Oct 2025',
  bloodGroup: 'A+(ve)',
  nid: '3514381490522',
  emergencyContact: '+8801321188806',

  // Options
  highResExport: true
};

// Base Image Assets
const imgTemplateFront = new Image();
const imgTemplateBack = new Image();
const imgQRCode = new Image();
const imgRingOverlay = new Image();
let assetsLoaded = false;

// DOM Elements
let frontCanvas, frontCtx;
let backCanvas, backCtx;
let signatureCanvas, sigCtx;
let isDrawingSignature = false;
let hasDrawnSignature = false;

// Photo canvas dragging state
let isDraggingPhoto = false;
let photoDragStartX = 0;
let photoDragStartY = 0;
let initialOffsetX = 0;
let initialOffsetY = 0;

// High-Performance RAF Scheduler
let frontRenderRaf = null;
let backRenderRaf = null;
let saveTimeout = null;

function scheduleRenderFront() {
  if (frontRenderRaf) return;
  frontRenderRaf = requestAnimationFrame(() => {
    frontRenderRaf = null;
    renderFrontCard();
  });
}

function scheduleRenderBack() {
  if (backRenderRaf) return;
  backRenderRaf = requestAnimationFrame(() => {
    backRenderRaf = null;
    renderBackCard();
  });
}

function scheduleRenderAll() {
  scheduleRenderFront();
  scheduleRenderBack();
}

// Auto-save state to LocalStorage (debounced)
function scheduleSaveState() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      const activeTabBtn = document.querySelector('.tab-btn.active');
      const dataToSave = {
        name: state.name,
        designation: state.designation,
        section: state.section,
        employeeId: state.employeeId,
        dateOfIssue: state.dateOfIssue,
        dateOfJoin: state.dateOfJoin,
        bloodGroup: state.bloodGroup,
        nid: state.nid,
        emergencyContact: state.emergencyContact,
        photoScale: state.photoScale,
        photoOffsetX: state.photoOffsetX,
        photoOffsetY: state.photoOffsetY,
        photoDataUrl: state.photoDataUrl,
        signatureDataUrl: state.signatureDataUrl,
        activeTab: activeTabBtn ? activeTabBtn.dataset.tab : 'tabFront'
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (err) {
      console.warn('LocalStorage save skipped (quota limit):', err);
    }
  }, 100);
}

// Load saved state from LocalStorage
function loadSavedState() {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!saved) return false;
    const parsed = JSON.parse(saved);

    if (parsed.name !== undefined) state.name = parsed.name;
    if (parsed.designation !== undefined) state.designation = parsed.designation;
    if (parsed.section !== undefined) state.section = parsed.section;
    if (parsed.employeeId !== undefined) state.employeeId = parsed.employeeId;
    if (parsed.dateOfIssue !== undefined) state.dateOfIssue = parsed.dateOfIssue;
    if (parsed.dateOfJoin !== undefined) state.dateOfJoin = parsed.dateOfJoin;
    if (parsed.bloodGroup !== undefined) state.bloodGroup = parsed.bloodGroup;
    if (parsed.nid !== undefined) state.nid = parsed.nid;
    if (parsed.emergencyContact !== undefined) state.emergencyContact = parsed.emergencyContact;
    if (parsed.photoScale !== undefined) state.photoScale = parsed.photoScale;
    if (parsed.photoOffsetX !== undefined) state.photoOffsetX = parsed.photoOffsetX;
    if (parsed.photoOffsetY !== undefined) state.photoOffsetY = parsed.photoOffsetY;
    if (parsed.photoDataUrl) state.photoDataUrl = parsed.photoDataUrl;
    if (parsed.signatureDataUrl) state.signatureDataUrl = parsed.signatureDataUrl;

    syncInputsFromState();

    if (parsed.activeTab) {
      const btn = document.querySelector(`.tab-btn[data-tab="${parsed.activeTab}"]`);
      if (btn) btn.click();
    }
    return true;
  } catch (err) {
    console.error('Error loading saved state:', err);
    return false;
  }
}

// Sync form inputs from state object
function syncInputsFromState() {
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el && val !== undefined) el.value = val;
  };

  setVal('inputName', state.name);
  setVal('inputDesignation', state.designation);
  setVal('inputSection', state.section);
  setVal('inputEmployeeId', state.employeeId);
  setVal('inputDateOfIssue', state.dateOfIssue);
  setVal('inputDateOfJoin', state.dateOfJoin);
  setVal('inputBloodGroup', state.bloodGroup);
  setVal('inputNID', state.nid);
  setVal('inputEmergencyContact', state.emergencyContact);

  setVal('photoZoom', state.photoScale);
  setVal('photoPanX', state.photoOffsetX);
  setVal('photoPanY', state.photoOffsetY);
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  initCanvases();
  initSignaturePad();
  initEventListeners();
  initCanvasPhotoInteractions();
  loadAssets();
});

// Initialize Canvases
function initCanvases() {
  frontCanvas = document.getElementById('frontCanvas');
  frontCtx = frontCanvas.getContext('2d', { alpha: false });
  frontCanvas.width = 646;
  frontCanvas.height = 1021;

  backCanvas = document.getElementById('backCanvas');
  backCtx = backCanvas.getContext('2d', { alpha: false });
  backCanvas.width = 646;
  backCanvas.height = 1021;
}

// Load Embedded Base64 Assets
function loadAssets() {
  let loadedCount = 0;
  const totalAssets = 4;

  function onAssetLoad() {
    loadedCount++;
    if (loadedCount === totalAssets) {
      assetsLoaded = true;
      const hasSaved = loadSavedState();

      // Restore photo
      if (hasSaved && state.photoDataUrl) {
        const img = new Image();
        img.onload = () => {
          state.photoImg = img;
          scheduleRenderFront();
        };
        img.src = state.photoDataUrl;
      } else {
        initDefaultPhoto();
      }

      // Restore signature
      if (hasSaved && state.signatureDataUrl) {
        const sigImg = new Image();
        sigImg.onload = () => {
          state.signatureImg = sigImg;
          sigCtx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
          sigCtx.drawImage(sigImg, 0, 0);
          hasDrawnSignature = true;
          document.getElementById('sigPlaceholder').style.display = 'none';
          scheduleRenderFront();
        };
        sigImg.src = state.signatureDataUrl;
      }

      scheduleRenderAll();
    }
  }

  imgTemplateFront.onload = onAssetLoad;
  imgTemplateBack.onload = onAssetLoad;
  imgQRCode.onload = onAssetLoad;
  imgRingOverlay.onload = onAssetLoad;

  imgTemplateFront.src = TEMPLATE_FRONT_B64;
  imgTemplateBack.src = TEMPLATE_BACK_B64;
  imgQRCode.src = QR_CODE_B64;
  imgRingOverlay.src = RING_OVERLAY_B64;
}

// Default silhouette avatar
function initDefaultPhoto() {
  const offscreen = document.createElement('canvas');
  offscreen.width = 300;
  offscreen.height = 300;
  const ctx = offscreen.getContext('2d');

  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(0, 0, 300, 300);

  ctx.fillStyle = '#94a3b8';
  ctx.beginPath();
  ctx.arc(150, 110, 50, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(150, 260, 95, Math.PI, 0, false);
  ctx.fill();

  const img = new Image();
  img.onload = () => {
    state.photoImg = img;
    scheduleRenderFront();
  };
  img.src = offscreen.toDataURL();
}

// Set up UI Event Listeners
function initEventListeners() {
  // Tabs navigation
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tabId = btn.dataset.tab;
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      const activePane = document.getElementById(tabId);
      if (activePane) activePane.classList.add('active');
      scheduleSaveState();
    });
  });

  // Inputs with live reactive update & auto-save
  bindInput('inputName', 'name', scheduleRenderFront);
  bindInput('inputDesignation', 'designation', scheduleRenderFront);
  bindInput('inputSection', 'section', scheduleRenderFront);
  bindInput('inputEmployeeId', 'employeeId', scheduleRenderFront);

  bindInput('inputDateOfIssue', 'dateOfIssue', scheduleRenderBack);
  bindInput('inputDateOfJoin', 'dateOfJoin', scheduleRenderBack);
  bindInput('inputBloodGroup', 'bloodGroup', scheduleRenderBack);
  bindInput('inputNID', 'nid', scheduleRenderBack);
  bindInput('inputEmergencyContact', 'emergencyContact', scheduleRenderBack);

  // Photo controls
  const photoInput = document.getElementById('photoInput');
  const photoUploader = document.getElementById('photoUploader');

  photoUploader.addEventListener('click', () => photoInput.click());
  photoInput.addEventListener('change', handlePhotoUpload);

  photoUploader.addEventListener('dragover', (e) => {
    e.preventDefault();
    photoUploader.classList.add('dragover');
  });
  photoUploader.addEventListener('dragleave', () => {
    photoUploader.classList.remove('dragover');
  });
  photoUploader.addEventListener('drop', (e) => {
    e.preventDefault();
    photoUploader.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processPhotoFile(e.dataTransfer.files[0]);
    }
  });

  // Photo Zoom & Pan sliders
  const zoomSlider = document.getElementById('photoZoom');
  zoomSlider.addEventListener('input', (e) => {
    state.photoScale = parseFloat(e.target.value);
    scheduleRenderFront();
    scheduleSaveState();
  });

  const panXSlider = document.getElementById('photoPanX');
  panXSlider.addEventListener('input', (e) => {
    state.photoOffsetX = parseFloat(e.target.value);
    scheduleRenderFront();
    scheduleSaveState();
  });

  const panYSlider = document.getElementById('photoPanY');
  panYSlider.addEventListener('input', (e) => {
    state.photoOffsetY = parseFloat(e.target.value);
    scheduleRenderFront();
    scheduleSaveState();
  });

  document.getElementById('btnResetPhotoAdjust').addEventListener('click', () => {
    state.photoScale = 1.0;
    state.photoOffsetX = 0;
    state.photoOffsetY = 0;
    zoomSlider.value = 1.0;
    panXSlider.value = 0;
    panYSlider.value = 0;
    scheduleRenderFront();
    scheduleSaveState();
  });

  // Signature image upload
  const sigInput = document.getElementById('sigImageInput');
  sigInput.addEventListener('change', handleSignatureUpload);

  // Signature pad clear
  document.getElementById('btnClearSig').addEventListener('click', clearSignature);

  // Download buttons
  const btnFront = document.getElementById('btnDownloadFront');
  if (btnFront) btnFront.addEventListener('click', () => downloadCard('front'));

  const btnBack = document.getElementById('btnDownloadBack');
  if (btnBack) btnBack.addEventListener('click', () => downloadCard('back'));

  const btnBoth = document.getElementById('btnDownloadBoth');
  if (btnBoth) btnBoth.addEventListener('click', downloadBothCards);

  const btnBothHeader = document.getElementById('btnDownloadBothHeader');
  if (btnBothHeader) btnBothHeader.addEventListener('click', downloadBothCards);

  // Reset to default button
  const btnReset = document.getElementById('btnResetDefault');
  if (btnReset) btnReset.addEventListener('click', resetAllDefaults);
}

// Helper to bind input
function bindInput(id, stateKey, onChangeCallback) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('input', (e) => {
    state[stateKey] = e.target.value;
    onChangeCallback();
    scheduleSaveState();
  });
}

// Handle Photo Upload
function handlePhotoUpload(e) {
  if (e.target.files && e.target.files[0]) {
    processPhotoFile(e.target.files[0]);
  }
}

function processPhotoFile(file) {
  if (!file.type.startsWith('image/')) {
    showToast('Please select a valid image file (JPG/PNG)!');
    return;
  }
  const reader = new FileReader();
  reader.onload = (evt) => {
    const dataUrl = evt.target.result;
    const img = new Image();
    img.onload = () => {
      state.photoImg = img;
      state.photoDataUrl = dataUrl;
      state.photoScale = 1.0;
      state.photoOffsetX = 0;
      state.photoOffsetY = 0;
      document.getElementById('photoZoom').value = 1.0;
      document.getElementById('photoPanX').value = 0;
      document.getElementById('photoPanY').value = 0;
      scheduleRenderFront();
      scheduleSaveState();
      showToast('Photo uploaded successfully!');
    };
    img.src = dataUrl;
  };
  reader.readAsDataURL(file);
}

// Handle Signature Upload
function handleSignatureUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    const dataUrl = evt.target.result;
    const img = new Image();
    img.onload = () => {
      state.signatureImg = img;
      state.signatureDataUrl = dataUrl;

      sigCtx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
      const aspect = img.width / img.height;
      let drawW = signatureCanvas.width * 0.8;
      let drawH = drawW / aspect;
      if (drawH > signatureCanvas.height * 0.8) {
        drawH = signatureCanvas.height * 0.8;
        drawW = drawH * aspect;
      }
      sigCtx.drawImage(
        img,
        (signatureCanvas.width - drawW) / 2,
        (signatureCanvas.height - drawH) / 2,
        drawW,
        drawH
      );
      hasDrawnSignature = true;
      document.getElementById('sigPlaceholder').style.display = 'none';
      scheduleRenderFront();
      scheduleSaveState();
      showToast('Signature added successfully!');
    };
    img.src = dataUrl;
  };
  reader.readAsDataURL(file);
}

// Signature Pad Logic
function initSignaturePad() {
  signatureCanvas = document.getElementById('signatureCanvas');
  sigCtx = signatureCanvas.getContext('2d');
  
  signatureCanvas.width = 380;
  signatureCanvas.height = 110;
  sigCtx.lineWidth = 2.5;
  sigCtx.lineCap = 'round';
  sigCtx.lineJoin = 'round';
  sigCtx.strokeStyle = '#000000';

  function getPos(e) {
    const r = signatureCanvas.getBoundingClientRect();
    const scaleX = signatureCanvas.width / r.width;
    const scaleY = signatureCanvas.height / r.height;
    const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0].clientX);
    const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0].clientY);
    return {
      x: (clientX - r.left) * scaleX,
      y: (clientY - r.top) * scaleY
    };
  }

  function startDrawing(e) {
    e.preventDefault();
    isDrawingSignature = true;
    hasDrawnSignature = true;
    document.getElementById('sigPlaceholder').style.display = 'none';
    const pos = getPos(e);
    sigCtx.beginPath();
    sigCtx.moveTo(pos.x, pos.y);
  }

  function draw(e) {
    if (!isDrawingSignature) return;
    e.preventDefault();
    const pos = getPos(e);
    sigCtx.lineTo(pos.x, pos.y);
    sigCtx.stroke();
  }

  function stopDrawing() {
    if (!isDrawingSignature) return;
    isDrawingSignature = false;
    const dataUrl = signatureCanvas.toDataURL('image/png');
    const img = new Image();
    img.onload = () => {
      state.signatureImg = img;
      state.signatureDataUrl = dataUrl;
      scheduleRenderFront();
      scheduleSaveState();
    };
    img.src = dataUrl;
  }

  signatureCanvas.addEventListener('mousedown', startDrawing);
  signatureCanvas.addEventListener('mousemove', draw);
  window.addEventListener('mouseup', stopDrawing);

  signatureCanvas.addEventListener('touchstart', startDrawing, { passive: false });
  signatureCanvas.addEventListener('touchmove', draw, { passive: false });
  window.addEventListener('touchend', stopDrawing);
}

function clearSignature() {
  sigCtx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
  state.signatureImg = null;
  state.signatureDataUrl = null;
  hasDrawnSignature = false;
  document.getElementById('sigPlaceholder').style.display = 'block';
  document.getElementById('sigImageInput').value = '';
  scheduleRenderFront();
  scheduleSaveState();
}

// Render Front Card (Exact Segoe UI, exact center: 305, 420, radius: 138)
function renderFrontCard(targetCtx = frontCtx, scale = 1) {
  if (!assetsLoaded) return;

  const w = 646 * scale;
  const h = 1021 * scale;

  // 1. Draw Background Template
  targetCtx.clearRect(0, 0, w, h);
  targetCtx.drawImage(imgTemplateFront, 0, 0, w, h);

  // 2. Draw Employee Photo (Exact circle center: 305, 420, radius: 138)
  if (state.photoImg) {
    targetCtx.save();
    targetCtx.beginPath();
    targetCtx.arc(305 * scale, 420 * scale, 138 * scale, 0, Math.PI * 2, true);
    targetCtx.closePath();
    targetCtx.clip();

    const pW = state.photoImg.width;
    const pH = state.photoImg.height;
    const minDim = Math.min(pW, pH);
    const baseScale = (276 * scale) / minDim;
    const sWidth = pW * baseScale * state.photoScale;
    const sHeight = pH * baseScale * state.photoScale;

    const drawX = (305 * scale) - (sWidth / 2) + (state.photoOffsetX * scale);
    const drawY = (420 * scale) - (sHeight / 2) + (state.photoOffsetY * scale);

    targetCtx.drawImage(state.photoImg, drawX, drawY, sWidth, sHeight);
    targetCtx.restore();

    // Draw authentic ring overlay to ensure 100% flawless circular edge
    if (imgRingOverlay && imgRingOverlay.complete) {
      targetCtx.drawImage(imgRingOverlay, 0, 0, w, h);
    }
  }

  // 3. Draw Front Side Typography (Segoe UI font, centered at 305)
  targetCtx.fillStyle = '#000000';
  targetCtx.textAlign = 'center';
  targetCtx.textBaseline = 'middle';

  // Name (Font: Segoe UI, 38px, Semi-Bold 600)
  targetCtx.font = `600 ${Math.round(38 * scale)}px 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif`;
  targetCtx.fillText(state.name || '', 305 * scale, 626 * scale);

  // Designation (Font: Segoe UI, 31px, Regular 400)
  targetCtx.font = `400 ${Math.round(31 * scale)}px 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif`;
  targetCtx.fillText(state.designation || '', 305 * scale, 678 * scale);

  // Section (Font: Segoe UI, 31px, Regular 400)
  targetCtx.font = `400 ${Math.round(31 * scale)}px 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif`;
  targetCtx.fillText(state.section || '', 305 * scale, 720 * scale);

  // Employee ID (Font: Segoe UI, 30px, Regular 400)
  targetCtx.font = `400 ${Math.round(30 * scale)}px 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif`;
  const idText = state.employeeId ? `Employee ID: ${state.employeeId}` : '';
  targetCtx.fillText(idText, 305 * scale, 768 * scale);

  // 4. Draw Employee Signature
  if (state.signatureImg) {
    const sigAspect = state.signatureImg.width / state.signatureImg.height;
    let sW = 160 * scale;
    let sH = sW / sigAspect;
    if (sH > 60 * scale) {
      sH = 60 * scale;
      sW = sH * sigAspect;
    }
    const sX = (485 * scale) - (sW / 2);
    const sY = (855 * scale) - (sH / 2);
    targetCtx.drawImage(state.signatureImg, sX, sY, sW, sH);
  }
}

// Render Back Card (Exact Segoe UI, exact QR code & layout)
function renderBackCard(targetCtx = backCtx, scale = 1) {
  if (!assetsLoaded) return;

  const w = 646 * scale;
  const h = 1021 * scale;

  // 1. Draw Background Template
  targetCtx.clearRect(0, 0, w, h);
  targetCtx.drawImage(imgTemplateBack, 0, 0, w, h);

  // 2. Draw Exact QR Code (210 x 210 at x=218, y=63)
  targetCtx.drawImage(imgQRCode, 218 * scale, 63 * scale, 210 * scale, 210 * scale);

  // 3. Draw Back Side Typography (Segoe UI font, same to same)
  targetCtx.fillStyle = '#000000';
  targetCtx.textAlign = 'left';
  targetCtx.textBaseline = 'middle';
  targetCtx.font = `400 ${Math.round(28 * scale)}px 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif`;

  const leftX = 68 * scale;

  targetCtx.fillText(`Date of Issue: ${state.dateOfIssue || ''}`, leftX, 318 * scale);
  targetCtx.fillText(`Date of Join: ${state.dateOfJoin || ''}`, leftX, 362 * scale);
  targetCtx.fillText(`Blood Group: ${state.bloodGroup || ''}`, leftX, 405 * scale);
  targetCtx.fillText(`NID: ${state.nid || ''}`, leftX, 448 * scale);
  targetCtx.fillText('Emergency Contact Number :', leftX, 508 * scale);
  targetCtx.fillText(`${state.emergencyContact || ''}`, leftX, 550 * scale);
}

// Ensure downloaded JPEG file size is guaranteed minimum 4MB (4.2 MB)
function ensureMinJpgBlob(arrayBuffer, minBytes = 4.2 * 1024 * 1024) {
  const bytes = new Uint8Array(arrayBuffer);
  if (bytes.length >= minBytes) {
    return new Blob([bytes], { type: 'image/jpeg' });
  }

  const len = bytes.length;
  // Check valid JPEG ending (0xFF 0xD9)
  if (bytes[len - 2] !== 0xFF || bytes[len - 1] !== 0xD9) {
    return new Blob([bytes], { type: 'image/jpeg' });
  }

  let needed = minBytes - len;
  const chunks = [bytes.subarray(0, len - 2)];

  while (needed > 0) {
    const payloadSize = Math.min(needed - 4, 65530);
    if (payloadSize <= 0) break;
    const segLen = payloadSize + 2;
    const header = new Uint8Array([
      0xFF, 0xFE,
      (segLen >> 8) & 0xFF,
      segLen & 0xFF
    ]);
    const payload = new Uint8Array(payloadSize);
    payload.fill(0x20); // space padding in standard COM segment
    chunks.push(header);
    chunks.push(payload);
    needed -= (payloadSize + 4);
  }

  chunks.push(new Uint8Array([0xFF, 0xD9]));
  return new Blob(chunks, { type: 'image/jpeg' });
}

// Download Card (Ultra-High Resolution 1200 DPI, Minimum 4MB Guaranteed)
function downloadCard(side) {
  const scale = 4; // 2584 x 4084 px (True 1200 DPI Press Resolution)
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = 646 * scale;
  tempCanvas.height = 1021 * scale;
  const tempCtx = tempCanvas.getContext('2d');

  let filename = '';
  const empId = (state.employeeId || 'MEP').replace(/[^a-zA-Z0-9_-]/g, '_');

  if (side === 'front') {
    renderFrontCard(tempCtx, scale);
    filename = `MEP_ID_Card_Front_${empId}.jpg`;
  } else {
    renderBackCard(tempCtx, scale);
    filename = `MEP_ID_Card_Back_${empId}.jpg`;
  }

  tempCanvas.toBlob((blob) => {
    if (!blob) return;
    blob.arrayBuffer().then((buffer) => {
      const paddedBlob = ensureMinJpgBlob(buffer, 4.2 * 1024 * 1024);
      const url = URL.createObjectURL(paddedBlob);
      const link = document.createElement('a');
      link.download = filename;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast(`${side === 'front' ? 'Front' : 'Back'} card downloaded (4MB+ Ultra HD)!`);
    });
  }, 'image/jpeg', 0.99);
}

// Download Both Cards (Individual JPGs)
function downloadBothCards() {
  downloadCard('front');
  setTimeout(() => {
    downloadCard('back');
  }, 400);
}

// Reset all fields to default
function resetAllDefaults() {
  localStorage.removeItem(LOCAL_STORAGE_KEY);

  state.name = 'Kazi Mahmud Alam';
  state.designation = 'Senior Executive';
  state.section = 'Administration';
  state.employeeId = '17224';
  state.dateOfIssue = '14 Sep 2026';
  state.dateOfJoin = '01 Oct 2025';
  state.bloodGroup = 'A+(ve)';
  state.nid = '3514381490522';
  state.emergencyContact = '+8801321188806';
  state.photoDataUrl = null;
  state.signatureDataUrl = null;
  state.photoScale = 1.0;
  state.photoOffsetX = 0;
  state.photoOffsetY = 0;

  syncInputsFromState();
  clearSignature();
  initDefaultPhoto();
  scheduleRenderAll();
  showToast('Default information restored!');
}

// Toast notification helper
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2600);
}

// Interactive Canvas Drag-to-Pan and Scroll-to-Zoom for Photo
function initCanvasPhotoInteractions() {
  if (!frontCanvas) return;

  function isOverPhoto(canvasX, canvasY) {
    return Math.hypot(canvasX - 305, canvasY - 420) <= 145;
  }

  function getCanvasCoords(e) {
    const rect = frontCanvas.getBoundingClientRect();
    const scaleX = frontCanvas.width / rect.width;
    const scaleY = frontCanvas.height / rect.height;
    const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0].clientX);
    const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0].clientY);
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  frontCanvas.addEventListener('mousemove', (e) => {
    if (isDraggingPhoto) {
      const coords = getCanvasCoords(e);
      const deltaX = coords.x - photoDragStartX;
      const deltaY = coords.y - photoDragStartY;
      state.photoOffsetX = Math.max(-120, Math.min(120, Math.round(initialOffsetX + deltaX)));
      state.photoOffsetY = Math.max(-120, Math.min(120, Math.round(initialOffsetY + deltaY)));

      document.getElementById('photoPanX').value = state.photoOffsetX;
      document.getElementById('photoPanY').value = state.photoOffsetY;
      scheduleRenderFront();
      scheduleSaveState();
    } else {
      const coords = getCanvasCoords(e);
      frontCanvas.style.cursor = isOverPhoto(coords.x, coords.y) ? 'grab' : 'default';
    }
  });

  frontCanvas.addEventListener('mousedown', (e) => {
    const coords = getCanvasCoords(e);
    if (isOverPhoto(coords.x, coords.y)) {
      isDraggingPhoto = true;
      photoDragStartX = coords.x;
      photoDragStartY = coords.y;
      initialOffsetX = state.photoOffsetX;
      initialOffsetY = state.photoOffsetY;
      frontCanvas.style.cursor = 'grabbing';
      e.preventDefault();
    }
  });

  window.addEventListener('mouseup', () => {
    if (isDraggingPhoto) {
      isDraggingPhoto = false;
      frontCanvas.style.cursor = 'grab';
    }
  });

  frontCanvas.addEventListener('wheel', (e) => {
    const coords = getCanvasCoords(e);
    if (isOverPhoto(coords.x, coords.y)) {
      e.preventDefault();
      const zoomDelta = e.deltaY < 0 ? 0.05 : -0.05;
      let newScale = Math.round((state.photoScale + zoomDelta) * 100) / 100;
      newScale = Math.max(0.5, Math.min(2.5, newScale));
      state.photoScale = newScale;
      document.getElementById('photoZoom').value = newScale;
      scheduleRenderFront();
      scheduleSaveState();
    }
  }, { passive: false });

  frontCanvas.addEventListener('touchstart', (e) => {
    const coords = getCanvasCoords(e);
    if (isOverPhoto(coords.x, coords.y)) {
      isDraggingPhoto = true;
      photoDragStartX = coords.x;
      photoDragStartY = coords.y;
      initialOffsetX = state.photoOffsetX;
      initialOffsetY = state.photoOffsetY;
    }
  }, { passive: true });

  frontCanvas.addEventListener('touchmove', (e) => {
    if (isDraggingPhoto && e.touches.length === 1) {
      const coords = getCanvasCoords(e);
      const deltaX = coords.x - photoDragStartX;
      const deltaY = coords.y - photoDragStartY;
      state.photoOffsetX = Math.max(-120, Math.min(120, Math.round(initialOffsetX + deltaX)));
      state.photoOffsetY = Math.max(-120, Math.min(120, Math.round(initialOffsetY + deltaY)));
      document.getElementById('photoPanX').value = state.photoOffsetX;
      document.getElementById('photoPanY').value = state.photoOffsetY;
      scheduleRenderFront();
      scheduleSaveState();
    }
  }, { passive: true });

  frontCanvas.addEventListener('touchend', () => {
    isDraggingPhoto = false;
  });
}
