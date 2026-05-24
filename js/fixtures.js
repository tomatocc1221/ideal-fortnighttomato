/* ========================================
   赛程战果独立页面 — 今日说法足球俱乐部
   ======================================== */

const PAGE_SIZE = 15;

const STATUS_TEXT = { win: "胜", draw: "平", loss: "负" };
const STATUS_CLASS = { win: "win", draw: "draw", loss: "loss" };

let _allResults = [];
let _allUpcoming = [];
let _currentSeason = "all";
let _currentPage = 1;

// ===== 入口 =====
document.addEventListener("DOMContentLoaded", () => {
  initNav();
  readURLParams();
  // 先用静态数据立即渲染，页面秒开
  loadFromStatic();
  bindEvents();
  // 后台拉取 API 数据，静默更新
  enrichFromAPI();
});

// ===== 移动端导航菜单 =====
function initNav() {
  const toggle = document.getElementById("navToggle");
  const menu = document.getElementById("navMenu");
  if (!toggle || !menu) return;

  toggle.addEventListener("click", () => {
    const isOpen = toggle.classList.toggle("open");
    menu.classList.toggle("open");
    toggle.setAttribute("aria-expanded", isOpen);
  });

  menu.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", () => {
      toggle.classList.remove("open");
      menu.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

function readURLParams() {
  const p = new URLSearchParams(location.search);
  _currentSeason = p.get("season") || "all";
  _currentPage = parseInt(p.get("page")) || 1;
}

function writeURLParams() {
  const p = new URLSearchParams();
  if (_currentSeason !== "all") p.set("season", _currentSeason);
  if (_currentPage > 1) p.set("page", _currentPage);
  const qs = p.toString();
  history.replaceState(null, "", qs ? "?" + qs : location.pathname);
}

// ===== 首屏：静态数据秒渲染 =====
function loadFromStatic() {
  const staticData = window.__fixturesData || { results: [], upcoming: [] };

  _allResults = (staticData.results || []).map(normalizeStaticMatch);
  _allResults.sort((a, b) => new Date(b.date + "T00:00:00") - new Date(a.date + "T00:00:00"));

  const now = new Date();
  _allUpcoming = (staticData.upcoming || []).map(normalizeStaticUpcoming).filter(m => {
    const t = new Date(m.date.replace(/\./g, "-") + "T" + (m.time || "14:40") + ":00");
    return now < new Date(t.getTime() + 2 * 60 * 60 * 1000);
  });
  _allUpcoming.sort((a, b) => new Date(a.date) - new Date(b.date));

  const seasons = extractSeasons(_allResults);
  renderSeasonFilter(seasons);
  document.getElementById("seasonFilter").value = _currentSeason;

  const filtered = filterBySeason(_allResults, _currentSeason);
  renderStats(filtered);
  renderResults(filtered);
  renderPager(filtered);
  renderUpcoming();
  writeURLParams();
}

// ===== 后台：API 数据静默更新 =====
async function enrichFromAPI() {
  const [apiResults, apiMatches] = await Promise.all([
    API.getResults().catch(() => []),
    API.getMatches().catch(() => [])
  ]);

  if (!apiResults.length && !apiMatches.length) return;

  // 合并 results
  const apiKeys = new Set(apiResults.map(m => m.date + "|" + m.away_team));
  const merged = apiResults.map(normalizeAPIMatch);

  _allResults.forEach(m => {
    const key = m.date + "|" + m.away;
    if (!apiKeys.has(key)) merged.push(m);
  });
  merged.sort((a, b) => new Date(b.date + "T00:00:00") - new Date(a.date + "T00:00:00"));

  // upcoming 补充 API 独有的比赛
  const now = new Date();
  apiMatches.forEach(m => {
    if (!m.home_score) {
      const exists = _allUpcoming.find(u => u.date === (m.date || "").replace(/-/g, ".") && u.away_team === m.away_team);
      if (!exists) {
        const nm = normalizeAPIMatch(m);
        const t = new Date(nm.date.replace(/\./g, "-") + "T" + (nm.time || "14:40") + ":00");
        if (now < new Date(t.getTime() + 2 * 60 * 60 * 1000)) {
          _allUpcoming.push(nm);
        }
      }
    }
  });
  _allUpcoming.sort((a, b) => new Date(a.date) - new Date(b.date));

  // 数据有变化则更新 UI
  if (merged.length === _allResults.length && !apiMatches.length) return;

  _allResults = merged;
  const seasons = extractSeasons(_allResults);
  renderSeasonFilter(seasons);
  document.getElementById("seasonFilter").value = _currentSeason;

  const filtered = filterBySeason(_allResults, _currentSeason);
  renderStats(filtered);
  renderResults(filtered);
  renderPager(filtered);
  renderUpcoming();
  writeURLParams();
}

function normalizeAPIMatch(m) {
  return {
    date: (m.date || "").replace(/-/g, "."),
    home: m.home_team || "今日说法",
    away: m.away_team,
    score: m.home_score != null ? m.home_score + ":" + m.away_score : "",
    result: m.result || "",
    scorers: (m.scorers || []).map(s => ({ name: s.name, num: s.number || s.num })),
    assisters: (m.assisters || []).map(s => ({ name: s.name, num: s.number || s.num })),
    time: m.time || "",
    venue: m.venue || "",
    jersey: m.jersey || "",
    jerseyColor: m.jersey_color || "",
    // 保留 API 字段
    _apiMatch: m
  };
}

function normalizeStaticMatch(m) {
  return {
    date: m.date,
    home: m.home || "今日说法",
    away: m.away,
    score: m.score || "",
    result: m.result || "",
    scorers: m.scorers || [],
    assisters: m.assisters || [],
    time: m.time || "",
    venue: m.venue || "",
    jersey: m.jersey || "",
    jerseyColor: m.jerseyColor || ""
  };
}

function normalizeStaticUpcoming(m) {
  return {
    date: m.date,
    home: m.home || "今日说法",
    away: m.away,
    time: m.time || "",
    venue: m.venue || "",
    jersey: m.jersey || "",
    jerseyColor: m.jerseyColor || ""
  };
}

// ===== 赛季提取 =====
function extractSeasons(results) {
  const years = new Set();
  results.forEach(m => {
    const y = m.date.slice(0, 4);
    if (y) years.add(y);
  });
  return Array.from(years).sort().reverse();
}

function filterBySeason(results, season) {
  if (season === "all") return results;
  return results.filter(m => m.date.startsWith(season));
}

// ===== 渲染函数 =====
function renderSeasonFilter(seasons) {
  const sel = document.getElementById("seasonFilter");
  sel.innerHTML = '<option value="all">全部赛季</option>' +
    seasons.map(s => `<option value="${s}">${s} 赛季</option>`).join("");
  sel.value = _currentSeason;
}

function renderStats(results) {
  const total = results.length;
  let wins = 0, draws = 0, losses = 0;
  results.forEach(m => {
    if (m.result === "win") wins++;
    else if (m.result === "draw") draws++;
    else if (m.result === "loss") losses++;
  });

  document.getElementById("fixturesStats").innerHTML = `
    <div class="stat-card"><div class="stat-num">${total}</div><div class="stat-label">总场次</div></div>
    <div class="stat-card win"><div class="stat-num">${wins}</div><div class="stat-label">胜</div></div>
    <div class="stat-card draw"><div class="stat-num">${draws}</div><div class="stat-label">平</div></div>
    <div class="stat-card loss"><div class="stat-num">${losses}</div><div class="stat-label">负</div></div>
  `;
}

function renderResults(results) {
  const el = document.getElementById("fixturesResults");
  const start = (_currentPage - 1) * PAGE_SIZE;
  const page = results.slice(start, start + PAGE_SIZE);

  if (!page.length) {
    el.innerHTML = '<div class="fixtures-empty">暂无比赛记录</div>';
    return;
  }

  el.innerHTML = page.map(m => {
    const scoreHTML = m.score
      ? `<span class="fixture-score ${STATUS_CLASS[m.result] || ''}">${m.score} ${STATUS_TEXT[m.result] || ''}</span>`
      : "";
    const scorersHTML = m.scorers && m.scorers.length
      ? `<span class="fixture-goals"><span class="fixture-goal-dot"></span>${m.scorers.map(s => s.name).join("  ")}</span>`
      : "";
    const assistersHTML = m.assisters && m.assisters.length
      ? `<span class="fixture-assists"><span class="fixture-assist-badge">A</span>${m.assisters.map(s => s.name).join("  ")}</span>`
      : "";
    const detailHTML = (scorersHTML || assistersHTML)
      ? `<div class="fixture-detail">${scorersHTML}${assistersHTML}</div>`
      : "";

    return `
      <div class="fixture-item">
        <div class="fixture-item-main">
          <span class="fixture-date">${m.date}</span>
          <span class="fixture-teams">${m.home} vs ${m.away}</span>
          ${scoreHTML}
        </div>
        ${detailHTML}
      </div>`;
  }).join("");
}

function renderPager(results) {
  const el = document.getElementById("fixturesPager");
  const totalPages = Math.ceil(results.length / PAGE_SIZE) || 1;

  if (totalPages <= 1) {
    el.innerHTML = "";
    return;
  }

  el.innerHTML = `
    <button class="pager-btn" id="pagerPrev" ${_currentPage <= 1 ? "disabled" : ""}>上一页</button>
    <span class="pager-info">${_currentPage} / ${totalPages}</span>
    <button class="pager-btn" id="pagerNext" ${_currentPage >= totalPages ? "disabled" : ""}>下一页</button>
  `;

  document.getElementById("pagerPrev").addEventListener("click", () => {
    if (_currentPage > 1) { _currentPage--; refresh(); }
  });
  document.getElementById("pagerNext").addEventListener("click", () => {
    if (_currentPage < totalPages) { _currentPage++; refresh(); }
  });
}

function renderUpcoming() {
  const el = document.getElementById("fixturesUpcoming");
  if (!_allUpcoming.length) {
    el.innerHTML = '<div class="fixtures-empty">暂无即将开赛的比赛</div>';
    return;
  }

  el.innerHTML = _allUpcoming.map(m => {
    const jerseyBadge = m.jersey
      ? `<span class="fixture-jersey" style="background:${m.jerseyColor};color:#fff">${m.jersey}</span>`
      : "";
    return `
      <div class="fixture-item">
        <div class="fixture-item-main">
          <span class="fixture-date">${m.date}</span>
          <span class="fixture-teams">${m.home} vs ${m.away} ${jerseyBadge}</span>
        </div>
        <div class="fixture-meta">${m.time || ""} · ${m.venue || ""}</div>
      </div>`;
  }).join("");
}

function refresh() {
  const filtered = filterBySeason(_allResults, _currentSeason);
  renderResults(filtered);
  renderPager(filtered);
  writeURLParams();
  document.getElementById("fixturesResults").scrollIntoView({ behavior: "smooth", block: "start" });
}

// ===== 事件绑定 =====
function bindEvents() {
  document.getElementById("seasonFilter").addEventListener("change", function () {
    _currentSeason = this.value;
    _currentPage = 1;
    refresh();
    const filtered = filterBySeason(_allResults, _currentSeason);
    renderStats(filtered);
  });
}
