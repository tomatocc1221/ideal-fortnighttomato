/* ========================================
   管理后台逻辑 — 今日说法足球俱乐部
   ======================================== */

// ===== 登录 =====
document.getElementById('loginBtn').addEventListener('click', async () => {
  const pwd = document.getElementById('loginPwd').value;
  const result = await API.adminLogin(pwd);
  if (result.error) {
    document.getElementById('loginError').textContent = result.error;
  } else {
    sessionStorage.setItem('admin_token', result.token);
    document.getElementById('adminLogin').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    initAdmin();
  }
});

document.getElementById('loginPwd').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('loginBtn').click();
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  sessionStorage.removeItem('admin_token');
  location.reload();
});

// 自动登录
if (sessionStorage.getItem('admin_token')) {
  document.getElementById('adminLogin').style.display = 'none';
  document.getElementById('adminPanel').style.display = 'block';
  initAdmin();
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

document.getElementById('playerSaveBtn').addEventListener('click', async () => {
  const id = document.getElementById('pfId').value;
  const name = document.getElementById('pfName').value.trim();
  const number = parseInt(document.getElementById('pfNumber').value);
  const pin = document.getElementById('pfPin').value;

  if (!name || !Number.isFinite(number)) return alert('请填写姓名和号码');

  const data = { name, number };
  if (pin) data.pin = pin;

  if (id) {
    await API.updatePlayer(id, data);
  } else {
    if (!pin) return alert('请设置个人密码');
    await API.addPlayer(data);
  }

  resetPlayerForm();
  loadPlayers();
});

document.getElementById('playerCancelBtn').addEventListener('click', resetPlayerForm);

async function deletePlayer(id) {
  if (!confirm('确定删除这名队员？')) return;
  await API.deletePlayer(id);
  loadPlayers();
}

// ============================================================
//  比赛管理
// ============================================================
let allMatches = [];

async function loadMatches() {
  allMatches = await API.getMatches();
  renderMatchTable();
  updateMatchSelect();
  updateVenueSelect();
}

function updateVenueSelect() {
  const venues = [...new Set(allMatches.map(m => m.venue).filter(Boolean))];
  const sel = document.getElementById('mfVenue');
  sel.innerHTML = '';
  venues.forEach(v => { const o = document.createElement('option'); o.value = v; o.textContent = v; sel.appendChild(o); });
  const addNew = document.createElement('option');
  addNew.value = '__new__'; addNew.textContent = '+ 添加新场地';
  sel.appendChild(addNew);
}

function calcRegWindow(dateStr, timeStr) {
  const d = new Date(dateStr + 'T' + (timeStr || '14:40') + ':00');
  const open = new Date(d);
  open.setDate(open.getDate() - 3);
  open.setHours(21, 0, 0, 0);
  const close = new Date(d);
  close.setDate(close.getDate() - 2);
  close.setHours(12, 0, 0, 0);
  return { open, close };
}

function fmtDT(d) {
  if (typeof d === 'string') return d.replace('T', ' ').slice(0, 16);
  const pad = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

function renderMatchTable() {
  const tbody = document.getElementById('matchTbody');
  if (!allMatches.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-row">暂无比赛</td></tr>';
    return;
  }
  tbody.innerHTML = allMatches.map(m => `
    <tr>
      <td>${m.date} ${m.time || ''}</td>
      <td>vs ${m.away_team} ${m.jersey ? '(' + m.jersey + ')' : ''}</td>
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

  const venueSel = document.getElementById('mfVenue');
  // 如果当前场地不在选项中，插入到"添加新场地"之前
  if (m.venue && ![...venueSel.options].some(o => o.value === m.venue)) {
    const opt = document.createElement('option');
    opt.value = m.venue; opt.textContent = m.venue;
    venueSel.insertBefore(opt, venueSel.lastElementChild);
  }

  document.getElementById('mfId').value = m.id;
  document.getElementById('mfDate').value = m.date;
  document.getElementById('mfTime').value = m.time;
  document.getElementById('mfAway').value = m.away_team;
  venueSel.value = m.venue || '';
  document.getElementById('mfVenueNew').style.display = 'none';
  document.getElementById('mfVenueNew').value = '';
  document.getElementById('mfJersey').value = m.jersey || '蓝色';
  document.getElementById('mfJerseyColor').value = m.jersey_color || '#4a90d9';
  document.getElementById('mfFee').value = m.fee || '';
  document.getElementById('matchFormTitle').textContent = '编辑比赛';
  document.getElementById('matchCancelBtn').style.display = 'inline-block';
}

function resetMatchForm() {
  document.getElementById('mfId').value = '';
  document.getElementById('mfDate').value = '';
  document.getElementById('mfTime').value = '14:40';
  document.getElementById('mfAway').value = '';
  document.getElementById('mfVenue').value = '';
  document.getElementById('mfVenueNew').style.display = 'none';
  document.getElementById('mfVenueNew').value = '';
  document.getElementById('mfJersey').value = '蓝色';
  document.getElementById('mfJerseyColor').value = '#4a90d9';
  document.getElementById('mfFee').value = '';
  document.getElementById('matchFormTitle').textContent = '创建比赛';
  document.getElementById('matchCancelBtn').style.display = 'none';
}

document.getElementById('matchSaveBtn').addEventListener('click', async () => {
  const id = document.getElementById('mfId').value;
  const date = document.getElementById('mfDate').value;
  const time = document.getElementById('mfTime').value;
  const away = document.getElementById('mfAway').value.trim();
  const venueSel = document.getElementById('mfVenue');
  let venue = venueSel.value;
  if (venue === '__new__') {
    venue = document.getElementById('mfVenueNew').value.trim();
  }
  const jersey = document.getElementById('mfJersey').value;
  const jerseyColor = jersey === '粉色' ? '#e91e63' : '#4a90d9';
  document.getElementById('mfJerseyColor').value = jerseyColor;

  if (!date || !away) return alert('请填写日期和对手');

  const { open, close } = calcRegWindow(date, time);

  const fee = parseFloat(document.getElementById('mfFee').value) || 0;

  const data = {
    date, time,
    away_team: away,
    venue,
    jersey,
    jersey_color: jerseyColor,
    fee: fee || null,
    reg_open_at: open.toISOString(),
    reg_close_at: close.toISOString()
  };

  if (id) {
    await API.updateMatch(id, data);
  } else {
    await API.addMatch(data);
  }

  resetMatchForm();
  loadMatches();
});

document.getElementById('matchCancelBtn').addEventListener('click', resetMatchForm);

document.getElementById('mfVenue').addEventListener('change', function () {
  const newInput = document.getElementById('mfVenueNew');
  if (this.value === '__new__') {
    newInput.style.display = 'inline-block';
    newInput.focus();
  } else {
    newInput.style.display = 'none';
    newInput.value = '';
  }
});

async function deleteMatch(id) {
  if (!confirm('确定删除这场比赛？相关报名记录也会删除。')) return;
  await API.deleteMatch(id);
  loadMatches();
}

// ============================================================
//  报名记录
// ============================================================
function updateMatchSelect() {
  const sel = document.getElementById('regMatchSelect');
  sel.innerHTML = '<option value="">— 选择比赛 —</option>' +
    allMatches.map(m => `<option value="${m.id}">${m.date} vs ${m.away_team}</option>`).join('');
}

document.getElementById('regMatchSelect').addEventListener('change', function () {
  loadRegistrations(this.value);
});

async function loadRegTab() {
  updateMatchSelect();
  const sel = document.getElementById('regMatchSelect');
  if (sel.value) loadRegistrations(sel.value);
}

async function loadRegistrations(matchId) {
  const tbody = document.getElementById('regTbody');
  const count = document.getElementById('regCount');
  if (!matchId) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-row">请选择比赛</td></tr>';
    count.textContent = '';
    return;
  }

  const list = await API.getRegistrations(matchId);
  const confirmed = list.filter(r => r.status === 'confirmed');
  const waitlist = list.filter(r => r.status === 'waitlist');
  const cancelled = list.filter(r => r.status === 'cancelled');

  count.textContent = `(正选${confirmed.length}/14 + 候补${waitlist.length}/4)`;

  // 检测连续缺席：按队员分组，检查最近连续 cancelled
  const allRegs = await API.getRegistrations();
  allMatches = await API.getMatches();
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
      <td>${new Date(r.registered_at).toLocaleString('zh-CN', {month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'})}</td>
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
  if (!confirm(`确定${action}？`)) return;
  await API.updateRegistration(id, { status: newStatus });
  loadRegistrations(document.getElementById('regMatchSelect').value);
}

async function deleteReg(id, matchId) {
  if (!confirm('确定删除这条报名记录？')) return;
  await API.deleteRegistration(id);
  loadRegistrations(matchId);
}

// ============================================================
//  出勤统计
// ============================================================
async function loadStats() {
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

  const sel = document.getElementById('resultMatchSelect');
  if (_allResultMatches.length === 0) {
    sel.innerHTML = '<option value="">-- 暂无已结束的比赛 --</option>';
  } else {
    sel.innerHTML = '<option value="">-- 选择已结束的比赛 --</option>' +
      _allResultMatches.map((m, i) => {
        const hasResult = m.home_score !== undefined && m.home_score !== null && m.home_score !== '';
        const label = `${m.date} vs ${m.away_team}${hasResult ? ' (已录入)' : ''}${m._source === 'static' ? ' [待迁移]' : ''}`;
        return `<option value="${i}">${label}</option>`;
      }).join('');
  }
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
  _selectedResultMatch = null;
}

function loadResultForm(m) {
  document.getElementById('rfHomeScore').value = m.home_score ?? '';
  document.getElementById('rfAwayScore').value = m.away_score ?? '';
  updateResultPreview();
  renderScorerRows(m.scorers || []);
  renderAssisterRows(m.assisters || []);
  document.getElementById('resultFormSection').style.display = 'block';
  document.getElementById('resultScorersSection').style.display = 'block';
  document.getElementById('resultAssistersSection').style.display = 'block';
  document.getElementById('resultSaveSection').style.display = 'block';
}

function updateResultPreview() {
  const h = parseInt(document.getElementById('rfHomeScore').value);
  const a = parseInt(document.getElementById('rfAwayScore').value);
  const el = document.getElementById('rfResultPreview');
  if (isNaN(h) || isNaN(a)) { el.textContent = '请输入比分'; return; }
  if (h > a) el.textContent = '胜';
  else if (h === a) el.textContent = '平';
  else el.textContent = '负';
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

document.getElementById('resultSaveBtn').addEventListener('click', async () => {
  if (!_selectedResultMatch) return;
  const h = parseInt(document.getElementById('rfHomeScore').value);
  const a = parseInt(document.getElementById('rfAwayScore').value);
  if (isNaN(h) || isNaN(a)) return alert('请输入比分');

  let result;
  if (h > a) result = 'win';
  else if (h === a) result = 'draw';
  else result = 'loss';

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

  // 静态 fixtures 的比赛需要先创建到 db.json
  if (_selectedResultMatch._source === 'static') {
    const created = await API.addMatch({
      date: _selectedResultMatch.date,
      time: _selectedResultMatch.time,
      home_team: _selectedResultMatch.home_team,
      away_team: _selectedResultMatch.away_team,
      venue: _selectedResultMatch.venue,
      jersey: _selectedResultMatch.jersey,
      jersey_color: _selectedResultMatch.jersey_color,
      ...data
    });
    alert('赛果已保存！（比赛已从静态数据迁移至数据库）');
    _selectedResultMatch = null;
    loadResultsTab();
    hideResultForm();
    return;
  }

  await API.updateMatch(_selectedResultMatch.id, data);
  alert('赛果已保存！');
  loadResultsTab();
});

document.getElementById('resultClearBtn').addEventListener('click', async () => {
  if (!_selectedResultMatch) return;
  if (_selectedResultMatch._source === 'static') {
    alert('静态数据中的比赛尚未迁移，无需清除');
    return;
  }
  if (!confirm('确定清除这场比赛的所有赛果数据？')) return;
  await API.updateMatch(_selectedResultMatch.id, {
    home_score: null, away_score: null, result: '', scorers: [], assisters: []
  });
  alert('赛果已清除！');
  loadResultsTab();
  hideResultForm();
});
