/* ========================================
   管理后台逻辑 — 今日说法足球俱乐部
   ======================================== */

// ===== 登录 Session 管理 =====
const ADMIN_SESSION_MAX_AGE = 24 * 60 * 60 * 1000; // 24 小时过期

function isAdminSessionValid() {
  const token = sessionStorage.getItem('admin_token');
  const ts = parseInt(sessionStorage.getItem('admin_token_ts') || '0', 10);
  return token && (Date.now() - ts < ADMIN_SESSION_MAX_AGE);
}

function clearAdminSession() {
  sessionStorage.removeItem('admin_token');
  sessionStorage.removeItem('admin_token_ts');
}

// ===== 登录 =====
document.getElementById('loginBtn').addEventListener('click', async () => {
  const pwd = document.getElementById('loginPwd').value;
  const result = await API.adminLogin(pwd);
  if (result.error) {
    document.getElementById('loginError').textContent = result.error;
  } else {
    sessionStorage.setItem('admin_token', result.token);
    sessionStorage.setItem('admin_token_ts', Date.now());
    document.getElementById('adminLogin').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    initAdmin();
  }
});

document.getElementById('loginPwd').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('loginBtn').click();
});


// 自动登录（24h 内有效）
if (isAdminSessionValid()) {
  document.getElementById('adminLogin').style.display = 'none';
  document.getElementById('adminPanel').style.display = 'block';
  initAdmin();
} else {
  clearAdminSession();
}

// ===== Tab 切换 =====
document.querySelectorAll('.admin-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    if (tab.dataset.tab === 'matches') loadMatches();
    if (tab.dataset.tab === 'registrations') loadRegTab();
    if (tab.dataset.tab === 'stats') loadStats();
    if (tab.dataset.tab === 'results') loadResultsTab();
  });
});

// ===== 主入口 =====
async function initAdmin() {
  loadPlayers();
  loadMatches();
}

// ============================================================
//  队员管理
// ============================================================
let allPlayers = [];

async function loadPlayers() {
  showTableSkeleton(document.getElementById('playerTbody'), 5, 5);
  allPlayers = await API.getPlayers();
  renderPlayerTable();
}

function renderPlayerTable() {
  const tbody = document.getElementById('playerTbody');
  if (!allPlayers.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-row">暂无队员，请添加</td></tr>';
    return;
  }
  tbody.innerHTML = allPlayers.map(p => `
    <tr>
      <td>${p.number}</td>
      <td>${p.name}</td>
      <td>${p.role === 'admin' ? '管理员' : '队员'}</td>
      <td>••••</td>
      <td>
        <button class="btn btn-sm btn-edit" data-id="${p.id}">编辑</button>
        <button class="btn btn-sm btn-del" data-id="${p.id}">删除</button>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => editPlayer(btn.dataset.id));
  });
  tbody.querySelectorAll('.btn-del').forEach(btn => {
    btn.addEventListener('click', () => deletePlayer(btn.dataset.id));
  });
}

function editPlayer(id) {
  const p = allPlayers.find(pl => pl.id === id);
  if (!p) return;
  document.getElementById('pfId').value = p.id;
  document.getElementById('pfName').value = p.name;
  document.getElementById('pfNumber').value = p.number;
  document.getElementById('pfPin').value = '';
  document.getElementById('pfPin').placeholder = '留空则不修改密码';
  document.getElementById('playerFormTitle').textContent = '编辑队员';
  document.getElementById('playerCancelBtn').style.display = 'inline-block';
}

function resetPlayerForm() {
  document.getElementById('pfId').value = '';
  document.getElementById('pfName').value = '';
  document.getElementById('pfNumber').value = '';
  document.getElementById('pfPin').value = '';
  document.getElementById('pfPin').placeholder = '个人密码';
  document.getElementById('playerFormTitle').textContent = '添加队员';
  document.getElementById('playerCancelBtn').style.display = 'none';
}

document.getElementById('playerSaveBtn').addEventListener('click', async function () {
  const btn = this;
  if (btn.disabled) return;
  const form = document.getElementById('tab-players');
  clearFieldErrors(form);
  const id = document.getElementById('pfId').value;
  const nameEl = document.getElementById('pfName');
  const numEl = document.getElementById('pfNumber');
  const pinEl = document.getElementById('pfPin');
  const name = nameEl.value.trim();
  const number = parseInt(numEl.value);
  const pin = pinEl.value;

  if (!name || !Number.isFinite(number)) {
    if (!name) showFieldError(nameEl, '请填写姓名');
    if (!Number.isFinite(number)) showFieldError(numEl, '请填写号码');
    return;
  }
  if (!id && !pin) { showFieldError(pinEl, '请设置个人密码'); return; }

  btn.disabled = true;
  try {
    const data = { name, number };
    if (pin) data.pin = pin;

    let saved;
    if (id) {
      saved = await API.updatePlayer(id, data);
      const idx = allPlayers.findIndex(p => p.id === id);
      if (idx !== -1) allPlayers[idx] = saved;
    } else {
      saved = await API.addPlayer(data);
      allPlayers.push(saved);
      allPlayers.sort((a, b) => a.number - b.number);
    }

    resetPlayerForm();
    renderPlayerTable();
  } catch (e) {
    showToast('保存失败：' + e.message, 'error');
  } finally {
    btn.disabled = false;
  }
});

document.getElementById('playerCancelBtn').addEventListener('click', resetPlayerForm);

async function deletePlayer(id) {
  if (!await showConfirm('确定删除这名队员？')) return;
  try {
    await API.deletePlayer(id);
    allPlayers = allPlayers.filter(p => p.id !== id);
    renderPlayerTable();
  } catch (e) {
    showToast('删除失败：' + e.message, 'error');
  }
}

// ============================================================
//  比赛管理
// ============================================================
let allMatches = [];

async function loadMatches() {
  showTableSkeleton(document.getElementById('matchTbody'), 4, 5);
  allMatches = await API.getMatches();
  renderMatchTable();
  updateMatchSelect();
}

function calcRegWindow(dateStr, timeStr) {
  const d = new Date(dateStr + 'T' + (timeStr || '14:40') + ':00');
  const open = new Date(d);
  open.setDate(open.getDate() - 4);
  open.setHours(21, 0, 0, 0);
  const close = new Date(d.getTime() - 8 * 60 * 60 * 1000);
  return { open, close };
}

function fmtDT(d) {
  if (typeof d === 'string') return d.replace('T', ' ').slice(0, 16).replace(/-/g, '.');
  const pad = n => String(n).padStart(2, '0');
  return d.getFullYear() + '.' + pad(d.getMonth() + 1) + '.' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

function renderMatchTable() {
  const tbody = document.getElementById('matchTbody');
  if (!allMatches.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-row">暂无比赛</td></tr>';
    return;
  }
  tbody.innerHTML = allMatches.map(m => `
    <tr>
      <td>${(m.date || '').replace(/-/g, '.')} ${m.time || ''}</td>
      <td>${m.home_team || '今日说法'} vs ${m.away_team} ${m.jersey ? '(' + m.jersey + ')' : ''}</td>
      <td>${fmtDT(m.reg_open_at)} ~ ${fmtDT(m.reg_close_at)}</td>
      <td>
        <button class="btn btn-sm btn-edit" data-id="${m.id}">编辑</button>
        <button class="btn btn-sm btn-del" data-id="${m.id}">删除</button>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => editMatch(btn.dataset.id));
  });
  tbody.querySelectorAll('.btn-del').forEach(btn => {
    btn.addEventListener('click', () => deleteMatch(btn.dataset.id));
  });
}

function editMatch(id) {
  const m = allMatches.find(mt => mt.id === id);
  if (!m) return;

  document.getElementById('mfId').value = m.id;
  document.getElementById('mfDate').value = m.date;
  document.getElementById('mfTime').value = m.time;
  document.getElementById('mfAway').value = m.away_team;
  document.getElementById('mfVenue').value = m.venue || '';
  document.getElementById('mfJersey').value = m.jersey || '蓝色';
  document.getElementById('mfJerseyColor').value = m.jersey_color || '#4a90d9';
  document.getElementById('matchFormTitle').textContent = '编辑比赛';
  document.getElementById('matchCancelBtn').style.display = 'inline-block';
}

function resetMatchForm() {
  document.getElementById('mfId').value = '';
  document.getElementById('mfDate').value = '';
  document.getElementById('mfTime').value = '14:40';
  document.getElementById('mfAway').value = '';
  document.getElementById('mfVenue').value = '';
  document.getElementById('mfJersey').value = '蓝色';
  document.getElementById('mfJerseyColor').value = '#4a90d9';
  document.getElementById('matchFormTitle').textContent = '创建比赛';
  document.getElementById('matchCancelBtn').style.display = 'none';
}


// ===== 一键修复截止时间 =====
document.getElementById('fixRegCloseBtn').addEventListener('click', async function () {
  const btn = this;
  const msg = document.getElementById('fixRegCloseMsg');
  if (btn.disabled) return;
  btn.disabled = true;
  msg.textContent = '更新中...';
  msg.style.color = 'var(--text-dim)';
  let updated = 0;
  try {
    for (const m of allMatches) {
      const { close } = calcRegWindow(m.date, m.time);
      const newClose = close.toISOString();
      if (m.reg_close_at !== newClose) {
        await API.updateMatch(m.id, { reg_close_at: newClose });
        m.reg_close_at = newClose;
        updated++;
      }
    }
    if (updated > 0) renderMatchTable();
    msg.textContent = '已更新 ' + updated + ' 场比赛！';
    msg.style.color = '#4caf50';
  } catch (e) {
    msg.textContent = '更新失败：' + e.message;
    msg.style.color = '#f44336';
  } finally {
    btn.disabled = false;
  }
});

document.getElementById('matchSaveBtn').addEventListener('click', async function () {
  const btn = this;
  if (btn.disabled) return;
  const form = document.getElementById('tab-matches');
  clearFieldErrors(form);
  const id = document.getElementById('mfId').value;
  const dateEl = document.getElementById('mfDate');
  const awayEl = document.getElementById('mfAway');
  const date = dateEl.value;
  const time = document.getElementById('mfTime').value;
  const away = awayEl.value.trim();
  const venue = document.getElementById('mfVenue').value.trim();
  const jersey = document.getElementById('mfJersey').value;
  const jerseyColor = jersey === '粉色' ? '#e91e63' : '#4a90d9';
  document.getElementById('mfJerseyColor').value = jerseyColor;

  if (!date || !away) {
    if (!date) showFieldError(dateEl, '请选择日期');
    if (!away) showFieldError(awayEl, '请填写对手队名');
    return;
  }

  btn.disabled = true;
  try {

    const { open, close } = calcRegWindow(date, time);
    const data = {
      date, time,
      away_team: away,
      venue,
      jersey,
      jersey_color: jerseyColor,
      reg_open_at: open.toISOString(),
      reg_close_at: close.toISOString()
    };

    let saved;
    if (id) {
      saved = await API.updateMatch(id, data);
      const idx = allMatches.findIndex(m => m.id === id);
      if (idx !== -1) allMatches[idx] = saved;
    } else {
      saved = await API.addMatch(data);
      allMatches.push(saved);
      allMatches.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    resetMatchForm();
    renderMatchTable();
    updateMatchSelect();
  } catch (e) {
    showToast('保存失败：' + e.message, 'error');
  } finally {
    btn.disabled = false;
  }
});

document.getElementById('matchCancelBtn').addEventListener('click', resetMatchForm);

async function deleteMatch(id) {
  if (!await showConfirm('确定删除这场比赛？相关报名记录也会删除。')) return;
  try {
    await API.deleteMatch(id);
    allMatches = allMatches.filter(m => m.id !== id);
    renderMatchTable();
    updateMatchSelect();
  } catch (e) {
    showToast('删除失败：' + e.message, 'error');
  }
}

// ============================================================
//  报名记录
// ============================================================
function updateMatchSelect() {
  const sel = document.getElementById('regMatchSelect');
  sel.innerHTML = '<option value="">— 选择比赛 —</option>' +
    allMatches.map(m => `<option value="${m.id}">${(m.date || '').replace(/-/g, '.')} ${m.home_team || '今日说法'} vs ${m.away_team}</option>`).join('');
}

document.getElementById('regMatchSelect').addEventListener('change', function () {
  loadRegistrations(this.value);
});

async function loadRegTab() {
  updateMatchSelect();
  const sel = document.getElementById('regMatchSelect');
  if (sel.value) loadRegistrations(sel.value);
}

// 全局报名缓存（避免每次切换比赛都全量拉取）
var _allRegsCache = null;
var _allRegsCacheTime = 0;
var _allMatchesCache = null;
var _allMatchesCacheTime = 0;
var CACHE_TTL = 60000; // 60秒内复用缓存

async function loadRegistrations(matchId) {
  var tbody = document.getElementById('regTbody');
  var count = document.getElementById('regCount');
  if (!matchId) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-row">请选择比赛</td></tr>';
    count.textContent = '';
    return;
  }

  showTableSkeleton(tbody, 6, 5);
  var list = await API.getRegistrations(matchId);
  var confirmed = list.filter(function (r) { return r.status === 'confirmed'; });
  var waitlist = list.filter(function (r) { return r.status === 'waitlist'; });
  var cancelled = list.filter(function (r) { return r.status === 'cancelled'; });

  count.textContent = '(正选' + confirmed.length + '/13 + 候补' + waitlist.length + '/4)';

  // 检测连续缺席：按队员分组，检查最近连续 cancelled（60s 缓存避免频繁全量查询）
  var now = Date.now();
  if (!_allRegsCache || now - _allRegsCacheTime > CACHE_TTL) {
    _allRegsCache = await API.getRegistrations();
    _allRegsCacheTime = now;
  }
  if (!_allMatchesCache || now - _allMatchesCacheTime > CACHE_TTL) {
    _allMatchesCache = await API.getMatches();
    _allMatchesCacheTime = now;
  }
  var allRegs = _allRegsCache;
  allMatches = _allMatchesCache;
  const matchDateMap = new Map(allMatches.map(m => [m.id, m.date]));
  const playerHistory = {};
  allRegs.forEach(r => {
    if (!playerHistory[r.player_name]) playerHistory[r.player_name] = [];
    playerHistory[r.player_name].push({ matchId: r.match_id, date: matchDateMap.get(r.match_id) || '', status: r.status });
  });
  const warnedPlayers = new Set();
  Object.entries(playerHistory).forEach(([name, regs]) => {
    regs.sort((a, b) => new Date(b.date) - new Date(a.date));
    let streak = 0;
    for (const r of regs) {
      if (r.status === 'cancelled') streak++;
      else break;
    }
    if (streak >= 2) warnedPlayers.add(name);
  });

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-row">暂无报名</td></tr>';
    return;
  }

  tbody.innerHTML = list.sort((a, b) => new Date(a.registered_at) - new Date(b.registered_at)).map((r, i) => {
    const statusLabel = r.status === 'confirmed' ? '正选' : r.status === 'waitlist' ? '候补' : '请假';
    const statusClass = r.status === 'confirmed' ? 'status-confirmed' : r.status === 'waitlist' ? 'status-waitlist' : 'status-cancelled';
    const reason = r.cancel_reason ? `<br><small>原因: ${r.cancel_reason}</small>` : '';
    const warnClass = warnedPlayers.has(r.player_name) ? ' warn-absence' : '';
    return `
    <tr class="${warnClass}">
      <td>${i + 1}</td>
      <td>${r.player_name}</td>
      <td>${r.player_number}</td>
      <td><span class="${statusClass}">${statusLabel}</span>${reason}</td>
      <td>${fmtDT(r.registered_at)}</td>
      <td>
        <button class="btn btn-sm btn-edit" data-id="${r.id}" data-status="${r.status}">调整</button>
        <button class="btn btn-sm btn-del" data-id="${r.id}">删除</button>
      </td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => adjustReg(btn.dataset.id, btn.dataset.status));
  });
  tbody.querySelectorAll('.btn-del').forEach(btn => {
    btn.addEventListener('click', () => deleteReg(btn.dataset.id, matchId));
  });
}

async function adjustReg(id, currentStatus) {
  const newStatus = currentStatus === 'confirmed' ? 'waitlist' : currentStatus === 'waitlist' ? 'cancelled' : 'confirmed';
  const action = currentStatus === 'confirmed' ? '移到候补' : currentStatus === 'waitlist' ? '取消报名' : '恢复正选';
  if (!await showConfirm('确定' + action + '？')) return;
  await API.updateRegistration(id, { status: newStatus });
  _allRegsCache = null; // 清除缓存
  loadRegistrations(document.getElementById('regMatchSelect').value);
}

async function deleteReg(id, matchId) {
  if (!await showConfirm('确定删除这条报名记录？')) return;
  await API.deleteRegistration(id);
  _allRegsCache = null;
  loadRegistrations(matchId);
}

// ============================================================
//  出勤统计
// ============================================================
async function loadStats() {
  showTableSkeleton(document.getElementById('statsTbody'), 7, 5);
  const stats = await API.getStats();
  const tbody = document.getElementById('statsTbody');
  if (!stats.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-row">暂无数据</td></tr>';
    return;
  }
  tbody.innerHTML = stats.map(s => {
    let rateColor = s.rate >= 80 ? 'var(--role-mf)' : s.rate >= 50 ? 'var(--gold)' : 'var(--loss)';
    return `
    <tr>
      <td>${s.number}</td>
      <td>${s.name}</td>
      <td>${s.total}</td>
      <td style="color:var(--role-mf)">${s.confirmed}</td>
      <td>${s.waitlist}</td>
      <td style="color:var(--loss)">${s.cancelled}</td>
      <td style="color:${rateColor};font-weight:600">${s.rate}%</td>
    </tr>`;
  }).join('');
}

// ============================================================
//  赛后录入
// ============================================================
let _selectedResultMatch = null;
let _allResultMatches = []; // 合并后的比赛列表（API + 静态fixtures）

async function loadResultsTab() {
  // 加载期间禁用下拉菜单，防止操作陈旧数据
  var sel = document.getElementById('resultMatchSelect');
  sel.disabled = true;

  allMatches = await API.getMatches();
  allPlayers = await API.getPlayers();
  const now = new Date();
  const MATCH_MS = 2 * 60 * 60 * 1000;

  // 收集 API 中已结束的比赛
  const apiEnded = allMatches
    .filter(m => {
      const startTime = new Date(m.date + 'T' + (m.time || '14:40') + ':00');
      return new Date(startTime.getTime() + MATCH_MS) <= now;
    })
    .map(m => ({ ...m, _source: 'api' }));

  // 收集静态 fixtures 中已结束的比赛（排除 API 中已存在的）
  const apiKeys = new Set(allMatches.map(m => m.date + '|' + m.away_team));
  const staticData = window.__fixturesData;
  const staticEnded = [];
  if (staticData && staticData.upcoming) {
    staticData.upcoming.forEach(m => {
      const normDate = m.date.replace(/\./g, '-');
      const startTime = new Date(normDate + 'T' + (m.time || '14:40') + ':00');
      if (isNaN(startTime.getTime())) return;
      if (new Date(startTime.getTime() + MATCH_MS) > now) return;
      if (apiKeys.has(normDate + '|' + m.away)) return;
      staticEnded.push({
        _source: 'static',
        date: normDate,
        time: m.time || '14:40',
        home_team: m.home || '今日说法',
        away_team: m.away,
        venue: m.venue || '',
        jersey: m.jersey || '',
        jersey_color: m.jerseyColor || '',
        home_score: null,
        away_score: null,
        result: '',
        scorers: [],
        assisters: []
      });
    });
  }

  _allResultMatches = [...apiEnded, ...staticEnded];

  if (_allResultMatches.length === 0) {
    sel.innerHTML = '<option value="">-- 暂无已结束的比赛 --</option>';
  } else {
    sel.innerHTML = '<option value="">-- 选择已结束的比赛 --</option>' +
      _allResultMatches.map((m, i) => {
        const hasResult = m.home_score !== undefined && m.home_score !== null && m.home_score !== '';
        const label = `${(m.date || '').replace(/-/g, '.')} ${m.home_team || '今日说法'} vs ${m.away_team}${hasResult ? ' (已录入)' : ''}${m._source === 'static' ? ' [待迁移]' : ''}`;
        return `<option value="${i}">${label}</option>`;
      }).join('');
  }

  // 重置表单 + 恢复下拉菜单
  hideResultForm();
  sel.disabled = false;
}

document.getElementById('resultMatchSelect').addEventListener('change', function () {
  const idx = parseInt(this.value);
  if (isNaN(idx)) {
    hideResultForm();
    return;
  }
  _selectedResultMatch = _allResultMatches[idx];
  loadResultForm(_selectedResultMatch);
});

function hideResultForm() {
  document.getElementById('resultFormSection').style.display = 'none';
  document.getElementById('resultScorersSection').style.display = 'none';
  document.getElementById('resultAssistersSection').style.display = 'none';
  document.getElementById('resultSaveSection').style.display = 'none';
  var photoSection = document.getElementById('resultPhotosSection');
  if (photoSection) photoSection.style.display = 'none';
  _selectedResultMatch = null;
}

function loadResultForm(m) {
  document.getElementById('rfHomeScore').value = m.home_score != null ? m.home_score : '';
  document.getElementById('rfAwayScore').value = m.away_score != null ? m.away_score : '';
  updateResultPreview();
  renderScorerRows(m.scorers || []);
  renderAssisterRows(m.assisters || []);
  document.getElementById('resultFormSection').style.display = 'block';
  document.getElementById('resultScorersSection').style.display = 'block';
  document.getElementById('resultAssistersSection').style.display = 'block';
  document.getElementById('resultSaveSection').style.display = 'block';
  // 显示照片区域（仅当比赛已存入数据库时）
  var photoSection = document.getElementById('resultPhotosSection');
  if (photoSection) {
    if (m.id) {
      photoSection.style.display = 'block';
      if (typeof loadMatchPhotos === 'function') loadMatchPhotos(m.id);
    } else {
      photoSection.style.display = 'none';
    }
  }
}

function computeOurResult(match, homeScore, awayScore) {
  const weAreHome = (match.home_team || match.home) === "今日说法";
  const ourScore = weAreHome ? homeScore : awayScore;
  const theirScore = weAreHome ? awayScore : homeScore;
  if (ourScore > theirScore) return { result: "win", label: "胜" };
  if (ourScore === theirScore) return { result: "draw", label: "平" };
  return { result: "loss", label: "负" };
}

function updateResultPreview() {
  const h = parseInt(document.getElementById("rfHomeScore").value);
  const a = parseInt(document.getElementById("rfAwayScore").value);
  const el = document.getElementById("rfResultPreview");
  if (isNaN(h) || isNaN(a)) { el.textContent = "请输入比分"; return; }
  if (!_selectedResultMatch) { el.textContent = h > a ? "胜" : h === a ? "平" : "负"; return; }
  el.textContent = computeOurResult(_selectedResultMatch, h, a).label;
}

document.getElementById('rfHomeScore').addEventListener('input', updateResultPreview);
document.getElementById('rfAwayScore').addEventListener('input', updateResultPreview);

function createPlayerRow(label, containerId) {
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:6px';
  const sel = document.createElement('select');
  sel.className = 'input';
  sel.style.flex = '1';
  sel.innerHTML = '<option value="">选择队员</option>' +
    allPlayers.map(p => `<option value="${p.name}:${p.number}">${p.name} (${p.number}号)</option>`).join('');
  const countInput = document.createElement('input');
  countInput.type = 'number';
  countInput.className = 'input input-sm';
  countInput.value = 1;
  countInput.min = 1;
  countInput.style.width = '60px';
  countInput.title = label + '数';
  const delBtn = document.createElement('button');
  delBtn.className = 'btn btn-sm btn-del';
  delBtn.textContent = '×';
  delBtn.style.marginLeft = '0';
  delBtn.addEventListener('click', () => row.remove());
  row.appendChild(sel);
  row.appendChild(countInput);
  row.appendChild(delBtn);
  document.getElementById(containerId).appendChild(row);
}

function renderScorerRows(scorers) {
  const container = document.getElementById('scorerRows');
  container.innerHTML = '';
  if (scorers.length) {
    scorers.forEach(s => {
      createPlayerRow('进球', 'scorerRows');
      const rows = container.querySelectorAll('div');
      const row = rows[rows.length - 1];
      row.querySelector('select').value = s.name + ':' + s.num;
      row.querySelector('input').value = s.goals || 1;
    });
  }
}

function renderAssisterRows(assisters) {
  const container = document.getElementById('assisterRows');
  container.innerHTML = '';
  if (assisters.length) {
    assisters.forEach(s => {
      createPlayerRow('助攻', 'assisterRows');
      const rows = container.querySelectorAll('div');
      const row = rows[rows.length - 1];
      row.querySelector('select').value = s.name + ':' + s.num;
      row.querySelector('input').value = s.assists || 1;
    });
  }
}

document.getElementById('addScorerBtn').addEventListener('click', () => createPlayerRow('进球', 'scorerRows'));
document.getElementById('addAssisterBtn').addEventListener('click', () => createPlayerRow('助攻', 'assisterRows'));

document.getElementById('resultSaveBtn').addEventListener('click', async function () {
  const btn = this;
  if (btn.disabled) return;
  const form = document.getElementById('tab-results');
  clearFieldErrors(form);
  const hEl = document.getElementById('rfHomeScore');
  const aEl = document.getElementById('rfAwayScore');
  const h = parseInt(hEl.value);
  const a = parseInt(aEl.value);
  if (isNaN(h)) { showFieldError(hEl, '请输入主队进球'); return; }
  if (isNaN(a)) { showFieldError(aEl, '请输入客队进球'); return; }

  btn.disabled = true;
  try {
    const { result } = computeOurResult(_selectedResultMatch, h, a);

    function collectRows(containerId, field) {
      const rows = document.getElementById(containerId).querySelectorAll('div');
      const items = [];
      rows.forEach(row => {
        const sel = row.querySelector('select').value;
        const count = parseInt(row.querySelector('input').value) || 1;
        if (!sel) return;
        const [name, num] = sel.split(':');
        items.push({ name, num: parseInt(num), [field]: count });
      });
      return items;
    }

    const data = {
      home_score: h,
      away_score: a,
      result: result,
      scorers: collectRows('scorerRows', 'goals'),
      assisters: collectRows('assisterRows', 'assists')
    };

    // 静态 fixtures 的比赛需先同步到 Supabase
    let savedMatchId;
    if (_selectedResultMatch._source === 'static') {
      // 静态比赛缺少 reg_open_at/reg_close_at，用比赛时间作为默认值（已结束，不影响功能）
      var matchDate = _selectedResultMatch.date;
      var matchTime = _selectedResultMatch.time || '14:40';
      var matchStart = matchDate + 'T' + matchTime + ':00+08:00';
      const created = await API.addMatch({
        date: matchDate,
        time: matchTime,
        home_team: _selectedResultMatch.home_team,
        away_team: _selectedResultMatch.away_team,
        venue: _selectedResultMatch.venue,
        jersey: _selectedResultMatch.jersey,
        jersey_color: _selectedResultMatch.jersey_color,
        reg_open_at: matchStart,
        reg_close_at: matchStart,
        ...data
      });
      savedMatchId = created.id;
      showToast('赛果已保存！（比赛已从静态数据迁移至数据库）', 'success');
    } else {
      savedMatchId = _selectedResultMatch.id;
      await API.updateMatch(savedMatchId, data);
      showToast('赛果已保存！', 'success');
    }

    // 首次保存时开启 24h MVP 投票窗口（后续修改不重置计时）
    if (!_selectedResultMatch.vote_deadline) {
      try {
        const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        await API.updateMatch(savedMatchId, { vote_deadline: deadline });
      } catch (e) { console.warn('设置投票截止时间失败:', e.message); }
    }

    // 通知其他页面刷新战报
    localStorage.setItem('jrsf_lastResultUpdate', Date.now());

    // 上传待处理的比赛照片
    if (savedMatchId && typeof uploadPendingPhotos === 'function') {
      await uploadPendingPhotos(savedMatchId);
    }

    _selectedResultMatch = null;
    loadResultsTab();
    hideResultForm();
  } catch (e) {
    showToast('保存失败：' + (e.message || '网络错误'), 'error');
  } finally {
    btn.disabled = false;
  }
});

document.getElementById('resultClearBtn').addEventListener('click', async function () {
  const btn = this;
  if (btn.disabled) return;
  if (!_selectedResultMatch) return;
  if (_selectedResultMatch._source === 'static') {
    showToast('静态数据中的比赛尚未迁移，无需清除', 'info');
    return;
  }
  if (!await showConfirm('确定清除这场比赛的所有赛果数据？')) return;
  btn.disabled = true;
  try {
    await API.updateMatch(_selectedResultMatch.id, {
      home_score: null, away_score: null, result: '', scorers: [], assisters: []
    });
    showToast('赛果已清除！', 'success');
    localStorage.setItem('jrsf_lastResultUpdate', Date.now());
    loadResultsTab();
    hideResultForm();
  } catch (e) {
    showToast('清除失败：' + (e.message || '网络错误'), 'error');
  } finally {
    btn.disabled = false;
  }
});
