/* ========================================
   今日说法 — 共享 UI 组件（Toast + Confirm + Skeleton）
   所有页面均引用此文件
   ======================================== */

// === Toast ===
let _toastTimer = 0;
function showToast(message, type) {
  type = type || 'info'; // success | error | info
  const colors = {
    success: { bg: '#1a3a1a', border: '#2d8a2d', icon: '✓' },
    error: { bg: '#3a1a1a', border: '#8a2d2d', icon: '✗' },
    info: { bg: '#1a2a3a', border: '#2d5a8a', icon: 'ℹ' }
  };
  const c = colors[type] || colors.info;
  const el = document.createElement('div');
  el.className = 'jrsf-toast';
  el.innerHTML = `<span class="jrsf-toast-icon">${c.icon}</span>${message}`;
  el.style.cssText = `background:${c.bg};border:1px solid ${c.border}`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, 2500);
}

// === Confirm 对话框 ===
function showConfirm(message) {
  return new Promise(function (resolve) {
    var overlay = document.createElement('div');
    overlay.className = 'jrsf-confirm-overlay';
    overlay.innerHTML =
      '<div class="jrsf-confirm-box">' +
      '<p class="jrsf-confirm-msg">' + message + '</p>' +
      '<div class="jrsf-confirm-btns">' +
      '<button class="btn btn-cancel jrsf-confirm-no">取消</button>' +
      '<button class="btn btn-gold jrsf-confirm-yes">确定</button>' +
      '</div></div>';
    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add('show'); });

    function cleanup(result) {
      overlay.classList.remove('show');
      setTimeout(function () { overlay.remove(); }, 200);
      resolve(result);
    }

    overlay.querySelector('.jrsf-confirm-yes').addEventListener('click', function () { cleanup(true); });
    overlay.querySelector('.jrsf-confirm-no').addEventListener('click', function () { cleanup(false); });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) cleanup(false);
    });
    document.addEventListener('keydown', function handler(e) {
      if (e.key === 'Escape') { document.removeEventListener('keydown', handler); cleanup(false); }
    });
  });
}

// === 骨架屏 ===
function showSkeleton(container, html) {
  if (!container) return;
  container.setAttribute('data-orig-html', container.innerHTML);
  container.innerHTML = html;
}
function hideSkeleton(container) {
  if (!container) return;
  var orig = container.getAttribute('data-orig-html');
  if (orig) container.innerHTML = orig;
}

// 表格骨架（columns 个 td，rows 行）
function showTableSkeleton(tbody, columns, rows) {
  if (!tbody) return;
  columns = columns || 5; rows = rows || 5;
  var html = '';
  for (var r = 0; r < rows; r++) {
    html += '<tr class="jrsf-skeleton-row">';
    for (var c = 0; c < columns; c++) {
      var w = c < 2 ? 'jrsf-skeleton-sm' : 'jrsf-skeleton-md';
      html += '<td><div class="jrsf-skeleton-cell ' + w + '"></div></td>';
    }
    html += '</tr>';
  }
  showSkeleton(tbody, html);
}
function hideTableSkeleton(tbody) {
  hideSkeleton(tbody);
}

// === 表单验证 ===
function clearFieldErrors(formEl) {
  formEl.querySelectorAll('.field-error').forEach(function (e) { e.classList.remove('show'); });
  formEl.querySelectorAll('.input.has-error').forEach(function (e) { e.classList.remove('has-error'); });
}
function showFieldError(input, msg) {
  input.classList.add('has-error');
  var errEl = input.parentElement.querySelector('.field-error');
  if (!errEl) {
    errEl = document.createElement('span');
    errEl.className = 'field-error';
    input.parentElement.appendChild(errEl);
  }
  errEl.textContent = msg;
  errEl.classList.add('show');
}
function validateRequired(input, msg) {
  if (!input.value.trim()) { showFieldError(input, msg); return false; }
  return true;
}

// === 网络状态感知 ===
(function initNetworkStatus() {
  var banner = document.createElement('div');
  banner.className = 'jrsf-offline-banner';
  banner.textContent = '当前处于离线状态，部分功能不可用';
  document.body.appendChild(banner);

  function setOffline(offline) {
    if (offline) {
      banner.classList.add('show');
    } else {
      banner.classList.remove('show');
      showToast('网络已恢复', 'success');
    }
  }

  window.addEventListener('online', function () { setOffline(false); });
  window.addEventListener('offline', function () { setOffline(true); });
  if (!navigator.onLine) setOffline(true);
})();
