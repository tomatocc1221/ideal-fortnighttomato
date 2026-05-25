/* ========================================
   MVP 投票系统 — 今日说法足球俱乐部
   金球奖积分制：第一名3分、第二名2分、第三名1分
   ======================================== */

let _voteMatch = null;
let _votePlayer = null;
let _voteConfirmed = [];
let _voteExisting = [];

// ===== Overlay open/close =====
document.getElementById('voteClose').addEventListener('click', closeVotePanel);
document.getElementById('voteOverlay').addEventListener('click', function (e) {
  if (e.target === this) closeVotePanel();
});
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && document.getElementById('voteOverlay').classList.contains('open')) {
    closeVotePanel();
  }
});

function closeVotePanel() {
  document.getElementById('voteOverlay').classList.remove('open');
  document.body.style.overflow = '';
  _voteMatch = null;
  _votePlayer = null;
  _voteConfirmed = [];
  _voteExisting = [];
  resetVoteAuth();
}

function resetVoteAuth() {
  document.getElementById('voteAuth').style.display = '';
  document.getElementById('voteCandidates').style.display = 'none';
  document.getElementById('voteResult').style.display = 'none';
  document.getElementById('voteError').textContent = '';
  document.getElementById('votePin').value = '';
}

// ===== Open panel =====
async function openVotePanel(match) {
  _voteMatch = match;
  resetVoteAuth();
  document.getElementById('votePlayerName').value = '';

  // 渲染比赛信息
  document.getElementById('voteMatch').innerHTML =
    '<div class="vote-match-teams">' + (match.home_team || match.home || '今日说法') + ' vs ' + (match.away_team || match.away) + '</div>' +
    '<div class="vote-match-meta">' + (match.date || '') + '  ' + (match.venue || '') + '</div>';

  // 加载球员列表到下拉框
  var playerSelect = document.getElementById('votePlayerName');
  playerSelect.innerHTML = '<option value="">选择你的姓名</option>';
  try {
    var players = await API.getPlayers();
    players.sort(function (a, b) { return a.number - b.number; });
    players.forEach(function (p) {
      playerSelect.innerHTML += '<option value="' + p.name + '">' + p.name + ' (' + p.number + '号)</option>';
    });
  } catch (e) {
    document.getElementById('voteError').textContent = '加载球员列表失败';
    document.getElementById('voteVerifyBtn').disabled = true;
  }

  // 加载本场正选 + 已有投票
  try {
    var regs = await API.getRegistrations(match.id);
    _voteConfirmed = regs.filter(function (r) { return r.status === 'confirmed'; });
    _voteExisting = await API.getVotes(match.id);
  } catch (e) {
    document.getElementById('voteError').textContent = '加载投票数据失败';
  }

  if (_voteConfirmed.length <= 1) {
    document.getElementById('voteError').textContent = '本场比赛正选队员不足2人，无法投票（至少需要投票人和被投票人各一人）';
    document.getElementById('voteVerifyBtn').disabled = true;
  } else {
    document.getElementById('voteVerifyBtn').disabled = false;
  }

  document.getElementById('voteOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

// ===== Verify =====
document.getElementById('voteVerifyBtn').addEventListener('click', handleVoteVerify);
document.getElementById('votePin').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') handleVoteVerify();
});

async function handleVoteVerify() {
  var name = document.getElementById('votePlayerName').value;
  var pin = document.getElementById('votePin').value;
  var errEl = document.getElementById('voteError');
  errEl.textContent = '';

  if (!name) { errEl.textContent = '请选择你的姓名'; return; }
  if (!pin) { errEl.textContent = '请输入个人密码'; return; }

  var result = await API.verifyPlayer(name, pin);
  if (result.error) { errEl.textContent = result.error; return; }

  _votePlayer = result;

  // 检查是否正选
  var isConfirmed = _voteConfirmed.some(function (r) {
    return r.player_name === _votePlayer.name;
  });
  if (!isConfirmed) {
    errEl.textContent = '你不是本场正选队员，无法投票';
    _votePlayer = null;
    return;
  }

  // 检查是否已投票（该投票人已有任何记录）
  var existing = _voteExisting.filter(function (v) {
    return v.voter_name === _votePlayer.name;
  });
  if (existing.length > 0) {
    var picks = existing.sort(function (a, b) { return a.rank - b.rank; });
    var lines = picks.map(function (v) {
      var rankLabel = v.rank === 1 ? '第1名' : v.rank === 2 ? '第2名' : '第3名';
      return rankLabel + '：' + v.candidate_name + ' (' + v.candidate_number + '号)';
    }).join('<br>');
    document.getElementById('voteAuth').style.display = 'none';
    document.getElementById('voteCandidates').style.display = 'none';
    document.getElementById('voteResult').style.display = '';
    document.getElementById('voteResultText').innerHTML = '你已投票：<br><br>' + lines;
    return;
  }

  showRankedVoting();
}

// ===== Ranked voting UI =====
function showRankedVoting() {
  document.getElementById('voteAuth').style.display = 'none';
  document.getElementById('voteCandidates').style.display = '';

  var candidates = _voteConfirmed.filter(function (r) {
    return r.player_name !== _votePlayer.name;
  });

  if (candidates.length < 3) {
    document.getElementById('voteRankList').innerHTML =
      '<p style="color:var(--text-faint);text-align:center;padding:20px">可投票人数不足3人（除你之外仅有' + candidates.length + '人正选），无法完成三档排名投票</p>';
    return;
  }

  var optionHTML = '<option value="">-- 选择球员 --</option>' + candidates.map(function (c) {
    return '<option value="' + c.player_name + ':' + c.player_number + '">' + c.player_name + ' (' + c.player_number + '号)</option>';
  }).join('');

  var rankLabels = [
    { label: '第一名（3分）', cls: 'gold' },
    { label: '第二名（2分）', cls: 'silver' },
    { label: '第三名（1分）', cls: 'bronze' }
  ];

  var html = '';
  for (var i = 0; i < 3; i++) {
    html +=
      '<div class="vote-rank-row">' +
        '<span class="vote-rank-label ' + rankLabels[i].cls + '">' + rankLabels[i].label + '</span>' +
        '<select class="vote-rank-select" data-rank="' + (i + 1) + '">' + optionHTML + '</select>' +
      '</div>';
  }
  html += '<button class="vote-submit-btn" id="voteSubmitBtn" disabled>确认投票</button>';

  document.getElementById('voteRankList').innerHTML = html;

  // 联动：已选的球员在其他下拉框中禁用
  var selects = document.getElementById('voteRankList').querySelectorAll('.vote-rank-select');
  var submitBtn = document.getElementById('voteSubmitBtn');

  function updateDisabled() {
    var selected = [];
    selects.forEach(function (s) {
      if (s.value) selected.push(s.value);
    });
    selects.forEach(function (s) {
      var current = s.value;
      s.querySelectorAll('option').forEach(function (opt) {
        if (!opt.value) return; // 跳过占位option
        opt.disabled = selected.indexOf(opt.value) !== -1 && opt.value !== current;
      });
    });
    // 全部选完才能提交
    var allFilled = true;
    selects.forEach(function (s) { if (!s.value) allFilled = false; });
    submitBtn.disabled = !allFilled;
  }

  selects.forEach(function (s) {
    s.addEventListener('change', updateDisabled);
  });

  submitBtn.addEventListener('click', handleSubmitVotes);
}

// ===== Submit votes =====
async function handleSubmitVotes() {
  var selects = document.getElementById('voteRankList').querySelectorAll('.vote-rank-select');
  var votes = [];
  selects.forEach(function (s) {
    var rank = parseInt(s.getAttribute('data-rank'));
    var parts = s.value.split(':');
    votes.push({
      candidate_name: parts[0],
      candidate_number: parseInt(parts[1]),
      rank: rank
    });
  });

  var summary = votes.map(function (v) {
    return '第' + v.rank + '名：' + v.candidate_name + '（' + v.candidate_number + '号）';
  }).join('\n');

  var confirmed = await showConfirm('确认以下投票？\n\n' + summary + '\n\n投票后无法修改。');
  if (!confirmed) return;

  try {
    await API.castVote({
      match_id: _voteMatch.id,
      voter_name: _votePlayer.name,
      voter_number: _votePlayer.number,
      votes: votes
    });
    showToast('投票成功！', 'success');
    showVoteResult(votes);
  } catch (e) {
    showToast(e.message || '投票失败', 'error');
  }
}

// ===== Show result =====
function showVoteResult(votes) {
  document.getElementById('voteAuth').style.display = 'none';
  document.getElementById('voteCandidates').style.display = 'none';
  document.getElementById('voteResult').style.display = '';
  var lines = votes.map(function (v) {
    var rankLabel = v.rank === 1 ? '第1名（3分）' : v.rank === 2 ? '第2名（2分）' : '第3名（1分）';
    return rankLabel + '：<strong>' + v.candidate_name + '</strong>（' + v.candidate_number + '号）';
  }).join('<br>');
  document.getElementById('voteResultText').innerHTML = '投票成功！<br><br>' + lines;
}

// ===== Expose =====
window.openVotePanel = openVotePanel;
