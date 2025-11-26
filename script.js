// Elements
const drop = document.getElementById('drop');
const fileInput = document.getElementById('fileInput');
const groupsList = document.getElementById('groupsList');
const framesList = document.getElementById('framesList');
const fpsInput = document.getElementById('fps');
const canvas = document.getElementById('canvas');
const canvasContainer = document.getElementById('canvasContainer');
const ctx = canvas.getContext('2d');
const playPauseBtn = document.getElementById('playPause');
const frameIndexEl = document.getElementById('frameIndex');
const clearAllBtn = document.getElementById('clearAll');
const emptyHint = document.getElementById('emptyHint');
const stepBackBtn = document.getElementById('stepBack');
const stepForwardBtn = document.getElementById('stepForward');
const loopGroupCheckbox = document.getElementById('loopGroup');
const autoSwitchGroupCheckbox = document.getElementById('autoSwitchGroup');
const bgRadios = document.getElementsByName('bgType');
const bgColorPicker = document.getElementById('bgColorPicker');
const addGroupBtn = document.getElementById('addGroupBtn');
const newGroupName = document.getElementById('newGroupName');

ctx.imageSmoothingEnabled = false;

// State
let groups = [];
let selectedGroupId = null;
let playing = false;
let intervalTimer = null;
let activeFrameIndex = 0;
let bgSettings = { isTransparent: false, color: '#000000' };

// Utils
function uid(prefix='g'){ return prefix + Date.now() + Math.floor(Math.random()*1000); }
function fileNameWithoutExt(name){ return name.replace(/\.[^/.]+$/, ""); }

// -------------------- Group & Frames --------------------
function createGroup(name='Group'){ 
  const g = { id: uid('g'), name: name || 'Group', frames: [] };
  groups.push(g);
  selectGroup(g.id);
  return g;
}

function deleteGroup(id){
  const idx = groups.findIndex(g=>g.id===id);
  if(idx>=0){
    groups[idx].frames.forEach(f => URL.revokeObjectURL(f.url));
    groups.splice(idx,1);
    selectedGroupId = (groups[0] && groups[0].id) || null;
    renderGroupsList();
    renderFrames();
  }
}

function selectGroup(id){
  selectedGroupId = id;
  activeFrameIndex = 0;
  renderGroupsList();
  renderFrames();
  drawPreview();
}

function addFilesToGroup(groupId, fileList){
  const g = groups.find(x=>x.id===groupId);
  if(!g) return;
  const arr = Array.from(fileList).filter(f=>f.type.startsWith('image'));
  if(arr.length===0) return;

  arr.forEach(f=>{
    const url = URL.createObjectURL(f);
    const name = fileNameWithoutExt(f.name);
    const img = new Image();
    img.onload = () => { 
      g.frames.push({ name, url, image: img, fileName: f.name });
      renderFrames();
      drawPreview();
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.decoding = "sync";
    img.src = url;
  });
}

function removeFrame(groupId, idx){
  const g = groups.find(x=>x.id===groupId);
  if(!g || !g.frames[idx]) return;
  URL.revokeObjectURL(g.frames[idx].url);
  g.frames.splice(idx,1);
  renderFrames();
  drawPreview();
}

function clearAll(){
  groups.forEach(g => g.frames.forEach(f=>URL.revokeObjectURL(f.url)));
  groups = [];
  selectedGroupId = null;
  stop();
  renderGroupsList();
  renderFrames();
  drawPreview();
}

// -------------------- Render Groups --------------------
function renderGroupsList() {
  groupsList.innerHTML = '';
  groups.forEach((g, idx) => {
    const el = document.createElement('div');
    el.className = 'group-item' + (g.id === selectedGroupId ? ' active' : '');
    el.dataset.index = idx;

    el.innerHTML = `
      <input type="text" class="rename" value="${g.name}">
      <button class="remove small" title="Delete group">✕</button>
    `;

    el.addEventListener('click', (e) => {
      if(e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON'){
        selectGroup(g.id);
      }
    });

    // rename inline
    const input = el.querySelector('.rename');
    input.addEventListener('change', () => {
      g.name = input.value.trim() || g.name;
      renderGroupsList();
    });
    input.addEventListener('keydown', (e) => { if(e.key === 'Enter') input.blur(); });

    // delete group
    el.querySelector('.remove').addEventListener('click', (e)=>{
      e.stopPropagation();
      if(confirm(`Delete group "${g.name}" and all its frames?`)){
        deleteGroup(g.id);
      }
    });

    groupsList.appendChild(el);
  });
}

// -------------------- Render Frames --------------------
function renderFrames(){
  framesList.innerHTML = '';
  const g = groups.find(x=>x.id===selectedGroupId);
  if(!g){
    framesList.style.display='none';
    emptyHint.style.display='block';
    return;
  }
  framesList.style.display='flex';
  emptyHint.style.display = g.frames.length ===0 ? 'block':'none';

  g.frames.forEach((f, idx)=>{
    const el = document.createElement('div');
    el.className='frame';
    el.dataset.index = idx;
    el.innerHTML = `
      <img class="thumb" src="${f.url}">
      <div style="flex:1">
        <div style="font-size:13px">${f.name}</div>
        <div class="muted" style="font-size:12px">${f.fileName}</div>
      </div>
      <div class="controls">
        <button class="remove small">✕</button>
      </div>
    `;
    el.querySelector('.remove').onclick = e => { e.stopPropagation(); removeFrame(g.id, idx); };
    framesList.appendChild(el);
  });
}

// -------------------- Preview --------------------
function drawPreview(){
  const g = groups.find(x => x.id === selectedGroupId);
  const cw = canvasContainer.clientWidth;
  const ch = canvasContainer.clientHeight;

  canvas.width = cw;
  canvas.height = ch;

  ctx.clearRect(0,0,cw,ch);

  if(!g || g.frames.length===0){
    frameIndexEl.textContent = '0 / 0';
    emptyHint.style.display = 'block';
    return;
  }

  emptyHint.style.display = 'none';
  if(activeFrameIndex >= g.frames.length) activeFrameIndex = g.frames.length-1;

  const img = g.frames[activeFrameIndex].image;
  if(!img) return;

  const nw = img.naturalWidth;
  const nh = img.naturalHeight;

  // Scale giữ tỉ lệ, tối đa vừa container
  const scale = Math.min(cw / nw, ch / nh);

  const w = Math.round(nw * scale);
  const h = Math.round(nh * scale);

  // Center canvas
  const x = Math.round((cw - w) / 2);
  const y = Math.round((ch - h) / 2);

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, nw, nh, x, y, w, h);

  frameIndexEl.textContent = `${activeFrameIndex+1}/${g.frames.length} — ${g.name}`;
}


// -------------------- Playback --------------------
function play(){
  const g = groups.find(x=>x.id===selectedGroupId);
  if(!g || g.frames.length===0) return alert('No frames to play');
  stop();
  playing=true; playPauseBtn.textContent='Pause';
  const fps = Math.max(1,Number(fpsInput.value)||12);
  const interval = 1000/fps;
  intervalTimer = setInterval(()=>{ stepForward(); drawPreview(); }, interval);
}
function stop(){ playing=false; playPauseBtn.textContent='Play'; if(intervalTimer){ clearInterval(intervalTimer); intervalTimer=null; } }
function stepBack(){ const g = groups.find(x=>x.id===selectedGroupId); if(!g||!g.frames.length) return; activeFrameIndex--; if(activeFrameIndex<0) activeFrameIndex=(loopGroupCheckbox.checked?g.frames.length-1:0); drawPreview(); }
function stepForward(){
  const g = groups.find(x => x.id === selectedGroupId);
  if(!g || !g.frames.length) return;

  activeFrameIndex++;

  if(activeFrameIndex >= g.frames.length){
    if(loopGroupCheckbox.checked){
      // Loop trong group
      activeFrameIndex = 0;
    } else if(autoSwitchGroupCheckbox.checked){
      // Chuyển sang group kế tiếp theo vòng tròn
      const currentIdx = groups.findIndex(gr => gr.id === selectedGroupId);
      const nextIdx = (currentIdx + 1) % groups.length; // vòng tròn
      selectGroup(groups[nextIdx].id);
      return; // drawPreview được gọi trong selectGroup
    } else {
      // Không loop, giữ frame cuối
      activeFrameIndex = g.frames.length - 1;
    }
  }

  drawPreview();
}


// -------------------- Background --------------------
function updateBackgroundState(){
  let isTrans = !Array.from(bgRadios).some(r=>r.checked && r.value==='color');
  bgSettings.isTransparent=isTrans;
  bgSettings.color=bgColorPicker.value;
  if(isTrans){ canvasContainer.classList.add('checkerboard'); canvasContainer.style.backgroundColor=''; }
  else { canvasContainer.classList.remove('checkerboard'); canvasContainer.style.backgroundColor=bgSettings.color; }
}
bgRadios.forEach(r=>r.addEventListener('change',updateBackgroundState));
bgColorPicker.addEventListener('input',updateBackgroundState);
updateBackgroundState();

// -------------------- Event Listeners --------------------
addGroupBtn.addEventListener('click', ()=>{
  const name=(newGroupName.value||'').trim()||`Group ${groups.length+1}`;
  createGroup(name);
  newGroupName.value='';
});

sortBtn.addEventListener('click', ()=>{
  const g=groups.find(x=>x.id===selectedGroupId); if(!g) return;
  g.frames.sort((a,b)=>a.name.localeCompare(b.name));
  renderFrames();
});

clearAllBtn.addEventListener('click', ()=>{ if(confirm('Clear all groups and frames?')) clearAll(); });

playPauseBtn.addEventListener('click', ()=>{ if(playing) stop(); else play(); });
fpsInput.addEventListener('change', ()=>{ if(playing){ stop(); play(); } });
stepBackBtn.addEventListener('click', stepBack);
stepForwardBtn.addEventListener('click', stepForward);

['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev,e=>{ e.preventDefault(); drop.classList.add('dragover'); }));
['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{ e.preventDefault(); drop.classList.remove('dragover'); }));
drop.addEventListener('drop', e=>{ if(selectedGroupId) addFilesToGroup(selectedGroupId,e.dataTransfer.files); });
fileInput.addEventListener('change', e=>{ if(selectedGroupId) addFilesToGroup(selectedGroupId,e.target.files); fileInput.value=''; });

// -------------------- Sortable --------------------
new Sortable(framesList,{ animation:150, ghostClass:'sortable-ghost', onEnd(evt){ const g=groups.find(x=>x.id===selectedGroupId); if(!g) return; const moved=g.frames.splice(evt.oldIndex,1)[0]; g.frames.splice(evt.newIndex,0,moved); drawPreview(); }});
new Sortable(groupsList,{ animation:150, ghostClass:'sortable-ghost', onEnd(evt){ const moved=groups.splice(evt.oldIndex,1)[0]; groups.splice(evt.newIndex,0,moved); renderGroupsList(); }});

// -------------------- Init --------------------
createGroup('Idle');
createGroup('Run');
drawPreview();
window.addEventListener('resize', drawPreview);


// -------------------- Export GIF Modal --------------------

const exportGifModal = document.getElementById('exportGifModal');
const openExportModalBtn = document.getElementById('openExportModalBtn');
const cancelGifExport = document.getElementById('cancelGifExport');
const confirmGifExport = document.getElementById('confirmGifExport');
const gifScale = document.getElementById('gifScale');
const gifFps = document.getElementById('gifFps');
const gifBgColor = document.getElementById('gifBgColor');
const gifBgRadios = document.getElementsByName('gifBg');

openExportModalBtn.addEventListener('click', () => {
  exportGifModal.classList.add('active');
  // load default values từ UI hiện tại
  gifFps.value = fpsInput.value || 12;
  gifScale.value = 10;
  const useBg = bgSettings.isTransparent ? 'trans' : 'color';
  Array.from(gifBgRadios).forEach(r => r.checked = r.value === useBg);
  gifBgColor.value = bgSettings.color;
});

cancelGifExport.addEventListener('click', () => exportGifModal.classList.remove('active'));

confirmGifExport.addEventListener('click', () => {
  const g = groups.find(x => x.id === selectedGroupId);
  if(!g || g.frames.length === 0) {
    alert('No frames to export!');
    return;
  }

  const scale = Math.max(1, Math.min(10, Number(gifScale.value) || 1));
  const fps = Math.max(1, Number(gifFps.value) || 12);
  const useBg = Array.from(gifBgRadios).some(r => r.checked && r.value === 'color');
  const bgColor = gifBgColor.value;

  const frames = g.frames.map(f => f.image);

  exportGIF(frames, { fps, scale, useBg, bgColor });
  exportGifModal.classList.remove('active');
});

const exportSpriteModal = document.getElementById('exportSpriteModal');
const openSpriteModalBtn = document.getElementById('exportSpriteBtn');
const cancelSpriteExport = document.getElementById('cancelSpriteExport');
const confirmSpriteExport = document.getElementById('confirmSpriteExport');
const spriteScale = document.getElementById('spriteScale');
const spriteBgColor = document.getElementById('spriteBgColor');
const spriteBgRadios = document.getElementsByName('spriteBg');

openSpriteModalBtn.addEventListener('click', () => {
  exportSpriteModal.classList.add('active');
  spriteScale.value = 1;
  Array.from(spriteBgRadios).forEach(r => r.checked = r.value === 'trans');
  spriteBgColor.value = '#000000';
});

// Hủy modal
cancelSpriteExport.addEventListener('click', () => exportSpriteModal.classList.remove('active'));

// Xác nhận export
confirmSpriteExport.addEventListener('click', () => {
  if(groups.length === 0 || groups.every(g => g.frames.length === 0)){
    alert('No frames to export!');
    return;
  }

  const scale = Math.max(1, Math.min(10, Number(spriteScale.value) || 1));
  const useBg = Array.from(spriteBgRadios).some(r => r.checked && r.value === 'color');
  const bgColor = spriteBgColor.value;

  // Chuẩn bị dữ liệu: mỗi group là một mảng frames
  const listsOfFiles = groups.map(g => g.frames.map(f => f.image));

  exportSpriteSheet(listsOfFiles, { scale, useBg, bgColor });
  exportSpriteModal.classList.remove('active');
});
