/* ========================================
   管理端比赛照片上传 — 今日说法足球俱乐部
   ======================================== */

var _uploadedPhotos = []; // { file, fullBlob, thumbBlob, width, height, status, storagePath, thumbPath, dbId, label }

// ===== 文件选择处理 =====
document.addEventListener('DOMContentLoaded', function () {
  var fileInput = document.getElementById('photoFileInput');
  var uploadArea = document.getElementById('photoUploadArea');

  if (!fileInput || !uploadArea) return;

  // Click to browse
  uploadArea.addEventListener('click', function () { fileInput.click(); });

  fileInput.addEventListener('change', function () {
    if (fileInput.files.length) handlePhotoFiles(Array.from(fileInput.files));
    fileInput.value = '';
  });

  // Drag & drop
  uploadArea.addEventListener('dragover', function (e) {
    e.preventDefault();
    uploadArea.classList.add('dragover');
  });
  uploadArea.addEventListener('dragleave', function () {
    uploadArea.classList.remove('dragover');
  });
  uploadArea.addEventListener('drop', function (e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    if (e.dataTransfer.files.length) handlePhotoFiles(Array.from(e.dataTransfer.files));
  });
});

function updatePhotoCount() {
  var countEl = document.getElementById('resultPhotoCount');
  if (!countEl) return;
  var existing = _uploadedPhotos.filter(function (p) { return p.status !== 'deleted'; });
  if (existing.length) {
    countEl.textContent = '(' + existing.length + ' 张)';
  } else {
    countEl.textContent = '';
  }
}

async function handlePhotoFiles(files) {
  var MAX_PHOTOS = 20;
  var active = _uploadedPhotos.filter(function (p) { return p.status !== 'deleted'; });
  var available = MAX_PHOTOS - active.length;
  if (available <= 0) {
    showToast('最多上传 ' + MAX_PHOTOS + ' 张照片', 'error');
    return;
  }
  files = files.slice(0, available).filter(function (f) { return f.type.match(/^image\//); });
  if (!files.length) return;

  var bar = document.getElementById('photoProgressBar');
  var fill = document.getElementById('photoProgressFill');
  var text = document.getElementById('photoProgressText');
  bar.style.display = 'block';

  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    text.textContent = '压缩中: ' + file.name;
    fill.style.width = (i / files.length * 50) + '%';

    try {
      var compressed = await compressMatchPhoto(file);
      _uploadedPhotos.push({
        file: file,
        fullBlob: compressed.full.blob,
        thumbBlob: compressed.thumb.blob,
        width: compressed.full.w,
        height: compressed.full.h,
        status: 'pending',
        storagePath: null,
        thumbPath: null,
        dbId: null,
        label: ''
      });
      renderPhotoPreview();
    } catch (err) {
      showToast('压缩失败: ' + file.name + ' — ' + err.message, 'error');
    }
  }

  bar.style.display = 'none';
  text.textContent = '';
  renderPhotoPreview();
  updatePhotoCount();
}

// ===== 预览网格 =====
function renderPhotoPreview() {
  var grid = document.getElementById('photoPreviewGrid');
  if (!grid) return;

  var active = _uploadedPhotos.filter(function (p) { return p.status !== 'deleted'; });
  grid.innerHTML = active.map(function (p, displayIdx) {
    var realIdx = _uploadedPhotos.indexOf(p);
    var url = (p.status === 'pending' || p.status === 'uploading') ? URL.createObjectURL(p.thumbBlob) : '';
    var hasImg = url || (p.thumbPath && p.status === 'done');
    var statusLabel = '';
    if (p.status === 'uploading') statusLabel = '<span class="photo-preview-badge">上传中...</span>';
    else if (p.status === 'done') statusLabel = '<span class="photo-preview-badge photo-preview-badge--ok">OK</span>';
    else if (p.status === 'error') statusLabel = '<span class="photo-preview-badge photo-preview-badge--err">失败</span>';

    var imgHTML = '';
    if (p.status === 'done' && p.thumbPath) {
      // For saved photos, construct the public URL
      var publicThumb = sb.storage.publicUrl('match-photos', p.thumbPath);
      imgHTML = '<img src="' + publicThumb + '" alt="" loading="lazy">';
    } else if (url) {
      imgHTML = '<img src="' + url + '" alt="">';
    } else {
      imgHTML = '<span class="photo-preview-placeholder"></span>';
    }

    return '<div class="photo-preview-item">' +
      '<div class="photo-preview-img">' + imgHTML + statusLabel + '</div>' +
      '<button class="photo-preview-del" data-idx="' + realIdx + '">&times;</button>' +
    '</div>';
  }).join('');

  // Delete handlers
  grid.querySelectorAll('.photo-preview-del').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var idx = parseInt(btn.dataset.idx);
      var p = _uploadedPhotos[idx];
      if (!p) return;
      if (p.status === 'done' && p.dbId) {
        showConfirm('删除这张照片？（将从服务器永久删除）').then(function (ok) {
          if (ok) deletePhoto(p, idx);
        });
      } else {
        _uploadedPhotos.splice(idx, 1);
        renderPhotoPreview();
        updatePhotoCount();
      }
    });
  });
}

// ===== 删除照片 =====
async function deletePhoto(photo, idx) {
  try {
    if (photo.dbId) await API.deleteMatchPhoto(photo.dbId);
  } catch (e) { console.warn('删除照片DB记录失败:', e); }
  try {
    if (photo.storagePath) await sb.storage.remove('match-photos', photo.storagePath);
    if (photo.thumbPath) await sb.storage.remove('match-photos', photo.thumbPath);
  } catch (e) { console.warn('删除照片文件失败:', e); }
  _uploadedPhotos.splice(idx, 1);
  renderPhotoPreview();
  updatePhotoCount();
  showToast('照片已删除', 'success');
}

// ===== 加载已有照片 =====
async function loadMatchPhotos(matchId) {
  _uploadedPhotos = [];
  renderPhotoPreview();
  updatePhotoCount();

  try {
    var photos = await API.getMatchPhotos(matchId);
    photos.forEach(function (p) {
      _uploadedPhotos.push({
        file: null,
        fullBlob: null,
        thumbBlob: null,
        width: p.width,
        height: p.height,
        status: 'done',
        storagePath: p.storage_path,
        thumbPath: p.thumb_path,
        dbId: p.id,
        label: p.label || ''
      });
    });
    renderPhotoPreview();
    updatePhotoCount();
  } catch (e) {
    console.warn('加载已有照片失败:', e);
  }
}

// ===== 上传待处理照片 =====
async function uploadPendingPhotos(matchId) {
  var pending = _uploadedPhotos.filter(function (p) { return p.status === 'pending'; });
  if (!pending.length) return;

  var bar = document.getElementById('photoProgressBar');
  var fill = document.getElementById('photoProgressFill');
  var text = document.getElementById('photoProgressText');
  bar.style.display = 'block';

  for (var i = 0; i < pending.length; i++) {
    var p = pending[i];
    if (p.status !== 'pending') continue;

    var baseName = 'photo_' + Date.now() + '_' + i + '.webp';
    var fullPath = matchId + '/full_' + baseName;
    var thumbPath = matchId + '/thumb_' + baseName;

    text.textContent = '上传中 (' + (i + 1) + '/' + pending.length + ')';
    fill.style.width = (i / pending.length * 100) + '%';
    p.status = 'uploading';
    renderPhotoPreview();

    try {
      await Promise.all([
        sb.storage.upload('match-photos', fullPath, p.fullBlob),
        sb.storage.upload('match-photos', thumbPath, p.thumbBlob)
      ]);

      var record = await API.addMatchPhoto({
        match_id: matchId,
        storage_path: fullPath,
        thumb_path: thumbPath,
        sort_order: i,
        width: p.width,
        height: p.height,
        file_size: p.fullBlob.size
      });

      p.status = 'done';
      p.storagePath = fullPath;
      p.thumbPath = thumbPath;
      p.dbId = record.id;
    } catch (err) {
      p.status = 'error';
      console.error('照片上传失败:', err);
    }
    renderPhotoPreview();
  }

  bar.style.display = 'none';
  text.textContent = '';

  var doneCount = _uploadedPhotos.filter(function (p) { return p.status === 'done'; }).length;
  var errCount = _uploadedPhotos.filter(function (p) { return p.status === 'error'; }).length;
  if (errCount) {
    showToast('上传完成: ' + doneCount + ' 成功, ' + errCount + ' 失败', 'error');
  } else {
    showToast('照片上传完成 (' + doneCount + ' 张)', 'success');
  }
}

// 暴露给 admin.js 调用
window.uploadPendingPhotos = uploadPendingPhotos;
window.loadMatchPhotos = loadMatchPhotos;
