/* ========================================
   报名系统 — 今日说法足球俱乐部
   ======================================== */

let _regMatch = null;
let _regPlayer = null;
let _regList = [];

// ===== Overlay open/close =====
document.getElementById('regClose').addEventListener('click', closeRegPanel);
document.getElementById('regOverlay').addEventListener('click', function (e) {
  if (e.target === this) closeRegPanel();
});

function closeRegPanel() {
  document.getElementById('regOverlay').classList.remove('open');
  document.body.style.overflow = '';
  _regMatch = null;
  _regPlayer = null;
  _regList = [];
  resetRegAuth();
}

function resetRegAuth() {
  document.getElementById('regAuth').style.display = 'block';
  document.getElementById('regActions').style.display = 'none';
  document.getElementById('regError').textContent = '';
  document.getElementById('regPin').value = '';
  document.getElementById('regPlayerName').value = '';
  document.getElementById('regCancelForm').style.display = 'none';
}

async function openRegPanel(match) {
  _regMatch = match;
  _regPlayer = null;
  _regList = [];
  resetRegAuth();

  // 比赛信息
  document.getElementById('regMatch').innerHTML = `
    <div class="reg-match-teams">${match.home_team || '今日说法'} vs ${match.away_team}</div>
    <div class="reg-match-meta">${(match.date || '').replace(/-/g, '.')} · ${match.time || '14:40'} · ${match.venue || ''} ${match.jersey ? '· ' + match.jersey : ''}</div>
  `;

  // 费用展示
  const feeEl = document.getElementById('regFee');
  if (match.fee && match.fee > 0) {
    feeEl.style.display = 'block';
    feeEl.innerHTML = `<span>场地费：${match.fee} 元</span><span class="reg-fee-per" id="regFeePer"></span>`;
  } else {
    feeEl.style.display = 'none';
  }

  // 加载队员列表
  const players = await API.getPlayers();
  const sel = document.getElementById('regPlayerName');
  sel.innerHTML = '<option value="">选择你的姓名</option>' +
    players.map(p => `<option value="${p.name}">${p.name} (${p.number}号)</option>`).join('');

  // 加载报名数据
  await refreshRegList();

  document.getElementById('regOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

// ===== 身份验证 =====
document.getElementById('regVerifyBtn').addEventListener('click', async () => {
  const name = document.getElementById('regPlayerName').value;
  const pin = document.getElementById('regPin').value;
  if (!name) return showRegError('请选择你的姓名');
  if (!pin) return showRegError('请输入个人密码');

  const result = await API.verifyPlayer(name, pin);
  if (result.error) return showRegError(result.error);

  _regPlayer = result;
  document.getElementById('regAuth').style.display = 'none';
  document.getElementById('regError').textContent = '';
  updateRegActions();
});

document.getElementById('regPin').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') document.getElementById('regVerifyBtn').click();
});

function showRegError(msg) {
  document.getElementById('regError').textContent = msg;
}

// ===== 名单刷新 =====
async function refreshRegList() {
  if (!_regMatch) return;
  _regList = await API.getRegistrations(_regMatch.id);

  const confirmed = _regList.filter(r => r.status === 'confirmed');
  const waitlist = _regList.filter(r => r.status === 'waitlist');
  const cancelled = _regList.filter(r => r.status === 'cancelled');

  document.getElementById('regConfirmedCount').innerHTML = `<strong>${confirmed.length}</strong>/14`;
  document.getElementById('regWaitlistCount').innerHTML = `<strong>${waitlist.length}</strong>/4`;

  // 更新人均费用
  const feePer = document.getElementById('regFeePer');
  if (feePer && _regMatch.fee && _regMatch.fee > 0 && confirmed.length > 0) {
    feePer.textContent = `人均：${(_regMatch.fee / confirmed.length).toFixed(0)} 元`;
  } else if (feePer) {
    feePer.textContent = '';
  }

  const renderSlot = (r, idx) => `
    <div class="reg-slot">
      <span class="reg-slot-idx">${idx + 1}</span>
      <span class="reg-slot-name">${r.player_name}</span>
      <span class="reg-slot-num">#${r.player_number}</span>
    </div>`;

  document.getElementById('regConfirmedList').innerHTML =
    confirmed.length ? confirmed.map(renderSlot).join('') : '<div class="reg-empty">暂无正选队员</div>';

  document.getElementById('regWaitlistList').innerHTML =
    waitlist.length ? waitlist.map(renderSlot).join('') : '<div class="reg-empty">暂无候补队员</div>';

  const cancelledSection = document.getElementById('regCancelledSection');
  cancelledSection.style.display = 'block';
  if (cancelled.length) {
    document.getElementById('regCancelledList').innerHTML = cancelled.map(r => `
      <div class="reg-slot cancelled">
        <span class="reg-slot-status">✕</span>
        <span class="reg-slot-name">${r.player_name}</span>
        <span class="reg-slot-num">#${r.player_number}</span>
        <span class="reg-cancel-reason">${r.cancel_reason || '请假'}</span>
      </div>`).join('');
  } else {
    document.getElementById('regCancelledList').innerHTML = '<div class="reg-empty">暂无请假</div>';
  }

  if (_regPlayer) updateRegActions();
}
// ===== 报名操作区 =====
function updateRegActions() {
  const actions = document.getElementById('regActions');
  const status = document.getElementById('regCurrentStatus');
  const btns = document.getElementById('regActionBtns');
  const cancelForm = document.getElementById('regCancelForm');

  actions.style.display = 'block';
  cancelForm.style.display = 'none';

  if (!_regMatch || !_regPlayer) return;

  const now = new Date();
  const regOpen = new Date(_regMatch.reg_open_at);
  const regClose = new Date(_regMatch.reg_close_at);
  const myReg = _regList.find(r => r.player_name === _regPlayer.name);

  if (now < regOpen) {
    status.innerHTML = '<span class="reg-tag closed">报名未开启</span>';
    btns.innerHTML = '';
    return;
  }

  if (now > regClose) {
    status.innerHTML = '<span class="reg-tag closed">报名已截止</span>';
    btns.innerHTML = '';
    return;
  }

  // 报名窗口内
  if (myReg) {
    if (myReg.status === 'confirmed') {
      status.innerHTML = '<span class="reg-tag confirmed">已报名 · 正选</span>';
      btns.innerHTML = '<button class="btn btn-cancel reg-btn" id="regLeaveBtn">我要请假</button>';
      document.getElementById('regLeaveBtn').addEventListener('click', () => {
        cancelForm.style.display = 'flex';
      });
    } else if (myReg.status === 'waitlist') {
      status.innerHTML = '<span class="reg-tag waitlist">已报名 · 候补</span>';
      btns.innerHTML = '<button class="btn btn-cancel reg-btn" id="regLeaveBtn">我要请假</button>';
      document.getElementById('regLeaveBtn').addEventListener('click', () => {
        cancelForm.style.display = 'flex';
      });
    } else if (myReg.status === 'cancelled') {
      status.innerHTML = '<span class="reg-tag cancelled">已请假</span>';
      const confirmedCount = _regList.filter(r => r.status === 'confirmed').length;
      const maxPlayers = _regMatch.max_players || 14;
      const nextStatus = confirmedCount < maxPlayers ? '正选' : '候补';
      btns.innerHTML = `<button class="btn btn-gold reg-btn" id="regRejoinBtn">重新报名（${nextStatus}）</button>`;
      document.getElementById('regRejoinBtn').addEventListener('click', async () => {
        const newStatus = confirmedCount < maxPlayers ? 'confirmed' : 'waitlist';
        await API.updateRegistration(myReg.id, { status: newStatus, cancel_reason: '' });
        await refreshRegList();
      });
    }
  } else {
    const confirmedCount = _regList.filter(r => r.status === 'confirmed').length;
    const maxPlayers = _regMatch.max_players || 14;
    const statusText = confirmedCount < maxPlayers ? '正选' : '候补';
    status.innerHTML = '<span class="reg-tag open">报名开放中</span>';
    btns.innerHTML = `<button class="btn btn-gold reg-btn" id="regJoinBtn">立即报名（${statusText}）</button>`;
    document.getElementById('regJoinBtn').addEventListener('click', async () => {
      await API.addRegistration({
        match_id: _regMatch.id,
        player_name: _regPlayer.name,
        player_number: _regPlayer.number,
        status: confirmedCount < maxPlayers ? 'confirmed' : 'waitlist'
      });
      await refreshRegList();
    });
  }
}

// ===== 请假 =====
document.getElementById('regCancelBtn').addEventListener('click', async () => {
  const myReg = _regList.find(r => r.player_name === _regPlayer.name);
  if (!myReg) return;

  let reason = document.getElementById('regCancelReason').value;
  if (reason === '其他') {
    reason = document.getElementById('regCancelOther').value.trim();
    if (!reason) return alert('请填写请假原因');
  }

  await API.updateRegistration(myReg.id, {
    status: 'cancelled',
    cancel_reason: reason || '请假'
  });
  await refreshRegList();
});

document.getElementById('regCancelReason').addEventListener('change', function () {
  document.getElementById('regCancelOther').style.display = this.value === '其他' ? 'block' : 'none';
});

// ===== 暴露给 main.js =====
window.openRegPanel = openRegPanel;
