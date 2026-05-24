/* ========================================
   今日说法足球俱乐部 — 交互脚本
   ======================================== */

/* ========================================
   Constants
   ======================================== */
const DB_NAME = "jinrishuofa";
const STORE = { PLAYERS: "playerAvatars", CAROUSEL: "carouselPhotos", GALLERY: "galleryPhotos" };
const LS_KEY = { PLAYERS: "jrsf_players", SLIDES: "jrsf_slides", ALBUMS: "jrsf_albums" };
const PATH = { AVATAR: "images/players/", GALLERY: "images/gallery/" };
const TIMING = { CAROUSEL: 3500, SCROLL_THRESHOLD: 60, ACTIVE_OFFSET: 120, COUNTUP: 1200, SWIPE: 50, REVEAL_STAGGER: 0.07, REVEAL_GROUP: 5 };
const CSS = { OPEN: "open", ACTIVE: "active", SCROLLED: "scrolled", FLIPPED: "flipped", VISIBLE: "visible" };
const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ========================================
   Utilities
   ======================================== */
function rafThrottle(fn) {
  let ticking = false;
  return function () {
    if (!ticking) {
      requestAnimationFrame(() => { fn(); ticking = false; });
      ticking = true;
    }
  };
}

function closeOnBackdrop(overlayElement, closeFn) {
  overlayElement.addEventListener("click", (e) => {
    if (e.target === overlayElement) closeFn();
  });
}

function svgPlaceholder(title, subtitle, w, h, fy, sy) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect fill="#1a1a1a" width="${w}" height="${h}"/>
    <text fill="#cfae5a" font-size="22" text-anchor="middle" x="${w/2}" y="${fy}" font-weight="600">${title}</text>
    <text fill="#888" font-size="16" text-anchor="middle" x="${w/2}" y="${sy}">${subtitle}</text>
  </svg>`;
}

function closeOnEscape(overlayElement, closeFn) {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlayElement.classList.contains("open")) {
      closeFn();
    }
  });
}

/* ========================================
   Storage Layer — IndexedDB + localStorage
   ======================================== */
function openDB() {
  if (openDB._promise) return openDB._promise;
  openDB._promise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      [STORE.PLAYERS, STORE.CAROUSEL, STORE.GALLERY].forEach(name => {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: name === STORE.GALLERY ? "key" : name === STORE.PLAYERS ? "playerNumber" : "slideIndex" });
      });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { openDB._promise = null; reject(req.error); };
    req.onblocked = () => { openDB._promise = null; reject(new Error("IndexedDB blocked")); };
  });
  return openDB._promise;
}

const _blobURLs = new Set();
function revokeBlobURL(url) {
  if (url && url.startsWith("blob:")) { _blobURLs.add(url); }
}
function revokeAllBlobURLs() {
  _blobURLs.forEach(url => URL.revokeObjectURL(url));
  _blobURLs.clear();
}

function loadImage(storeName, key) {
  return openDB().then(db => {
    return new Promise((resolve) => {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => {
        if (req.result && req.result.data) {
          const url = URL.createObjectURL(req.result.data);
          revokeBlobURL(url);
          resolve(url);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  }).catch(() => null);
}

function checkFileAvatar(number) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve("images/players/" + number + ".jpg");
    img.onerror = () => resolve(null);
    img.src = "images/players/" + number + ".jpg";
  });
}


function loadOverrides() {
  try {
    const players = JSON.parse(localStorage.getItem("jrsf_players") || "{}");
    const slides = JSON.parse(localStorage.getItem("jrsf_slides") || "{}");
    const albums = JSON.parse(localStorage.getItem("jrsf_albums") || "{}");
    return { players, slides, albums };
  } catch (e) {
    return { players: {}, slides: {}, albums: {} };
  }
}


/* ========================================
   Default Data
   ======================================== */
function getDefaultPlayers() {
  return [
    { number: 1,  name: "叶乙茏", role: "GK",       avatar: "🧤", age: 24, joinYear: "2025", strengths: ["门将", "反应快", "出击果断"],    bio: "" },
    { number: 1,  name: "陈政忠", role: "GK",       avatar: "🧤", age: 27, joinYear: "2025", strengths: ["门将", "稳定", "经验丰富"],      bio: "" },
    { number: 2,  name: "曾松",   role: "LM",       avatar: "⚙️", age: 23, joinYear: "2025", strengths: ["左前卫", "传中精准", "耐力好"],   bio: "" },
    { number: 4,  name: "李云龙", role: "CB",       avatar: "🛡️", age: 26, joinYear: "2025", strengths: ["中后卫", "头球", "抢断"],         bio: "" },
    { number: 6,  name: "周照航", role: "RB",       avatar: "🛡️", age: 24, joinYear: "2025", strengths: ["右后卫", "速度", "回追"],         bio: "" },
    { number: 7,  name: "刘畅",   role: "AM",       avatar: "⚙️", age: 26, joinYear: "2025", strengths: ["攻击型中场", "传球", "远射"],     bio: "" },
    { number: 8,  name: "王绪坤", role: "AM",       avatar: "⚙️", age: 26, joinYear: "2025", strengths: ["攻击型中场", "盘带", "前插"],     bio: "" },
    { number: 9,  name: "张浩宇", role: "DM / LB",  avatar: "⚙️", age: 26, joinYear: "2025", strengths: ["防守型中场", "拦截", "覆盖面大"], bio: "" },
    { number: 10, name: "向润杰", role: "SS",       avatar: "🎯", age: 27, joinYear: "2025", strengths: ["影子前锋", "跑位", "终结"],       bio: "" },
    { number: 11, name: "张平",   role: "LM",       avatar: "⚙️", age: 28, joinYear: "2025", strengths: ["左前卫", "经验", "传中"],         bio: "" },
    { number: 13, name: "胡纪轩", role: "CB",       avatar: "🛡️", age: 26, joinYear: "2025", strengths: ["中后卫", "对抗", "卡位"],         bio: "" },
    { number: 14, name: "古培杰", role: "LIB",      avatar: "🛡️", age: 24, joinYear: "2025", strengths: ["自由人", "出球", "阅读比赛"],     bio: "" },
    { number: 0,  name: "胡鑫",   role: "DM",       avatar: "⚙️", age: 26, joinYear: "2025", strengths: ["防守型中场", "拦截", "跑动"],       bio: "" },
    { number: 15, name: "洪源",   role: "DM",       avatar: "⚙️", age: 25, joinYear: "2025", strengths: ["防守型中场", "扫荡", "体能"],     bio: "" },
    { number: 17, name: "骆浩睿", role: "RW / LW",  avatar: "🎯", age: 23, joinYear: "2025", strengths: ["边锋", "突破", "速度"],           bio: "" },
    { number: 18, name: "唐文",   role: "CM",       avatar: "⚙️", age: 25, joinYear: "2025", strengths: ["中前卫", "组织", "短传"],         bio: "" },
    { number: 19, name: "蔡超",   role: "LB / RB / CB", avatar: "🛡️", age: 27, joinYear: "2025", strengths: ["全能后卫", "万金油", "防守意识"], bio: "" },
    { number: 21, name: "唐程伟", role: "教练",     avatar: "📋", age: 26, joinYear: "2025", strengths: ["战术指导", "临场指挥"],             bio: "球队教练，负责战术安排和临场指挥。" },
    { number: 22, name: "李泽",   role: "CB",       avatar: "⭐", age: 27, joinYear: "2025", strengths: ["队长", "中后卫", "组织防线"],     bio: "球队领队兼队长，负责球队日常管理和场上指挥。" },
    { number: 24, name: "巫名扬", role: "DM",       avatar: "⚙️", age: 21, joinYear: "2025", strengths: ["防守型中场", "拼抢", "年轻活力"], bio: "" },
    { number: 25, name: "陈奎羽", role: "CF",       avatar: "🎯", age: 26, joinYear: "2025", strengths: ["中锋", "支点", "头球"],           bio: "" },
    { number: 26, name: "李毓庭", role: "OMF",      avatar: "⚙️", age: 25, joinYear: "2025", strengths: ["前腰", "创造力", "关键传球"],     bio: "" },
    { number: 30, name: "刘宇航", role: "RW / LW",  avatar: "🎯", age: 25, joinYear: "2025", strengths: ["边锋", "盘带", "内切"],           bio: "" },
    { number: 69, name: "向桐玮", role: "RW / LW",  avatar: "🎯", age: 25, joinYear: "2025", strengths: ["边锋", "速度", "突破"],           bio: "" },
    { number: 77, name: "田佳鹭", role: "OMF",      avatar: "⚙️", age: 25, joinYear: "2025", strengths: ["前腰", "技术", "远射"],           bio: "" },
    { number: 82, name: "游胡鑫", role: "CM",       avatar: "⚙️", age: 26, joinYear: "2025", strengths: ["中前卫", "控球", "调度"],         bio: "" },
    { number: 99, name: "范有为", role: "GK",       avatar: "🧤", age: 24, joinYear: "2025", strengths: ["门将", "扑救", "选位"],           bio: "" },
  ];
}

function getDefaultSlides() {
  const photos = window.__galleryData || [];
  if (photos.length > 0) {
    return photos.map(p => ({
      label: p.label,
      _imageUrl: "images/gallery/" + p.file
    }));
  }
  // 无照片时显示占位
  return [
    { icon: "⚽", label: "首场比赛" },
    { icon: "🏟️", label: "主场作战" },
    { icon: "🏃", label: "赛前热身" },
    { icon: "🎯", label: "精准射门" },
    { icon: "🔥", label: "激烈对抗" },
    { icon: "🏆", label: "赛后合影" },
    { icon: "📸", label: "精彩花絮" },
  ];
}

function getDefaultAlbums() {
  const photos = window.__galleryData || [];
  // 按相册分组真实照片
  const albumMap = {};
  photos.forEach(p => {
    if (!albumMap[p.album]) albumMap[p.album] = [];
    albumMap[p.album].push({ label: p.label, _imageUrl: "images/gallery/" + p.file });
  });
  // 已有的相册日期信息
  const knownAlbums = {
    "今日说法 vs 老男孩FC": "2024.12.08 · 溉澜溪体育公园",
    "今日说法 vs 雄狮联盟": "2024.10.13 · 溉澜溪体育公园",
    "队内训练": "2024.11.03 · 溉澜溪体育公园",
  };
  const result = [];
  // 先处理有真实照片的相册
  Object.keys(albumMap).forEach(title => {
    result.push({ title, date: knownAlbums[title] || "", photos: albumMap[title] });
  });
  // 补充只有占位符的已知相册（未上传照片的）
  Object.keys(knownAlbums).forEach(title => {
    if (!albumMap[title]) {
      result.push({ title, date: knownAlbums[title], photos: [] });
    }
  });
  // 如果没有任何相册数据，放入默认占位
  if (result.length === 0) {
    result.push(
      { title: "今日说法 vs 老男孩FC", date: "2024.12.08 · 溉澜溪体育公园", photos: [] },
      { title: "今日说法 vs 雄狮联盟", date: "2024.10.13 · 溉澜溪体育公园", photos: [] },
      { title: "队内训练",     date: "2024.11.03 · 溉澜溪体育公园", photos: [] },
    );
  }
  return result;
}

/* ========================================
   Main Init
   ======================================== */
document.addEventListener("DOMContentLoaded", async () => {
  initNav();
  initLightbox();
  initHeroParticles();
  initPlayerDetail();
  initCountUp();
  initBackToTop();

  // Load overrides from storage and render with merged data
  await loadAllOverridesAndMerge();
  initScrollReveal();
  initTacticsBoard();
  initRegButtons();
});

/* ========================================
   Data Merge & Render Orchestrator
   ======================================== */
async function loadAllOverridesAndMerge() {
  const overrides = loadOverrides();
  const players = getDefaultPlayers();

  // Merge player text overrides
  const mergedPlayers = players.map(p => {
    const ov = overrides.players[p.number] || {};
    const merged = { ...p };
    if (ov.role) merged.role = ov.role;
    if (ov.bio) merged.bio = ov.bio;
    if (ov.height) merged.height = ov.height;
    if (ov.weight) merged.weight = ov.weight;
    if (ov.strengths) merged.strengths = ov.strengths;
    return merged;
  });

  // Merge slide text overrides
  const defaultSlides = getDefaultSlides();
  const mergedSlides = defaultSlides.map((s, i) => {
    const ov = overrides.slides[i] || {};
    return { ...s, label: ov.label ?? s.label };
  });

  // Merge album/photo text overrides
  const defaultAlbums = getDefaultAlbums();
  const mergedAlbums = defaultAlbums.map(a => {
    const mergedPhotos = a.photos.map((p, i) => {
      const key = a.title + "||" + i;
      const ov = overrides.albums[key] || {};
      return { ...p, label: ov.label ?? p.label };
    });
    return { ...a, photos: mergedPhotos };
  });

  // Load images: file-based avatars first, then IndexedDB fallback
  const playerImagePromises = mergedPlayers.map(p =>
    checkFileAvatar(p.number).then(fileUrl => {
      if (fileUrl) { p._avatarUrl = fileUrl; return; }
      return loadImage("playerAvatars", p.number).then(url => { if (url) p._avatarUrl = url; });
    })
  );
  const slideImagePromises = mergedSlides.map((s, i) =>
    loadImage("carouselPhotos", i).then(url => { if (url) s._imageUrl = url; })
  );
  const albumImagePromises = [];
  mergedAlbums.forEach(a => {
    a.photos.forEach((p, i) => {
      const key = a.title + "||" + i;
      albumImagePromises.push(
        loadImage("galleryPhotos", key).then(url => { if (url) p._imageUrl = url; })
      );
    });
  });

  try {
    await Promise.all([
      ...playerImagePromises,
      ...slideImagePromises,
      ...albumImagePromises,
    ]);
  } catch (e) {
    // IndexedDB 整体失败时静默降级，渲染照常进行
  }

  // Render with merged data
  renderRoster(mergedPlayers);
  await renderFixtures();
  initCarousel(mergedSlides);
  initGalleryOverlay(mergedAlbums);

  window.__players = mergedPlayers;
}

/* === Navigation === */
function initNav() {
  const nav = document.getElementById("nav");
  const toggle = document.getElementById("navToggle");
  const menu = document.getElementById("navMenu");
  if (!nav || !toggle || !menu) return;
  const links = menu.querySelectorAll(".nav-link");

  toggle.addEventListener("click", () => {
    const isOpen = toggle.classList.toggle("open");
    menu.classList.toggle("open");
    toggle.setAttribute("aria-expanded", isOpen);
  });

  links.forEach(link => {
    link.addEventListener("click", () => {
      toggle.classList.remove("open");
      menu.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });

  window.addEventListener("scroll", rafThrottle(() => {
    const scrolled = window.scrollY > 60;
    nav.classList.toggle("scrolled", scrolled);
    updateActiveLink();
  }));
}

function updateActiveLink() {
  if (!updateActiveLink._sections) {
    updateActiveLink._sections = document.querySelectorAll("section[id], footer[id]");
    updateActiveLink._navLinks = document.querySelectorAll(".nav-link");
  }
  const sections = updateActiveLink._sections;
  const links = updateActiveLink._navLinks;
  let current = "";

  sections.forEach(sec => {
    const top = sec.offsetTop - 120;
    if (window.scrollY >= top) {
      current = sec.getAttribute("id");
    }
  });

  links.forEach(link => {
    link.classList.toggle("active", link.getAttribute("href") === "#" + current);
  });
}

/* === Roster === */
function getPositionGroup(role) {
  if (!role) return "";
  const first = role.split("/")[0].trim().toUpperCase();
  if (["SS","CF","RW","LW","ST"].includes(first)) return "role-fw";
  if (["AM","DM","CM","OMF","LM","RM"].includes(first)) return "role-mf";
  if (["GK"].includes(first)) return "role-gk";
  if (["CB","RB","LB","LIB","SW"].includes(first)) return "role-df";
  return "";
}

function getGroupOrder(role) {
  const g = getPositionGroup(role);
  if (g === "") return 0;   // coach first
  if (g === "role-gk") return 1;
  if (g === "role-df") return 2;
  if (g === "role-mf") return 3;
  if (g === "role-fw") return 4;
  return 5;
}

const GROUP_LABELS = { "": "教练", "role-gk": "门将", "role-df": "后场", "role-mf": "中场", "role-fw": "前场" };

function renderRoster(playersOverride) {
  const players = playersOverride || getDefaultPlayers();

  // Sort by position group, then by number
  const sorted = [...players].sort((a, b) => {
    const ga = getGroupOrder(a.role);
    const gb = getGroupOrder(b.role);
    if (ga !== gb) return ga - gb;
    return a.number - b.number;
  });

  // Build groups
  let html = "", lastGroup = "";
  sorted.forEach((p, i) => {
    const g = getPositionGroup(p.role);
    if (g !== lastGroup) {
      html += `<div class="roster-group-title ${g}"><span class="group-dot"></span>${GROUP_LABELS[g] || ""}</div>`;
      lastGroup = g;
    }
    const origIndex = players.indexOf(p);
    html += `
      <div class="player-card${p.captain ? " captain" : ""}" data-player-index="${origIndex}" data-player-number="${p.number}" onclick="flipCard(this)">
        <div class="player-card-inner">
          <div class="player-card-front">
            <div class="player-avatar">
              ${p._avatarUrl
                ? `<img src="${p._avatarUrl}" alt="${p.name}">`
                : `<span class="player-avatar-initial">${p.name[0]}</span>`}
            </div>
            <div class="player-number">${p.number}</div>
            <div class="player-name">${p.name}</div>
            <div class="player-role ${getPositionGroup(p.role)}">${p.role}</div>
          </div>
          <div class="player-card-back">
            <div class="player-back-name">${p.name} · ${p.number}号</div>
            <div class="player-back-bio">${p.bio || "场上位置：" + p.role}</div>
            <button class="player-back-btn" onclick="event.stopPropagation(); openPlayerDetail(${origIndex})">查看详情</button>
          </div>
        </div>
      </div>`;
  });

  document.getElementById("rosterGrid").innerHTML = html;

  if (!playersOverride) {
    window.__players = players;
  }
}

/* === Fixtures === */
async function renderFixtures() {
  const data = window.__fixturesData || { results: [], upcoming: [] };
  let results = data.results || [];
  const upcoming = data.upcoming || [];

  // 从 API 拉取赛果并合并（API 赛果优先于静态数据）
  try {
    const apiResults = await API.getResults();
    if (apiResults.length) {
      const apiMap = new Map();
      apiResults.forEach(m => {
        const score = m.home_score + ':' + m.away_score;
        const scorers = (m.scorers || []).map(s => ({ name: s.name, num: s.number || s.num }));
        const assisters = (m.assisters || []).map(s => ({ name: s.name, num: s.number || s.num }));
        const key = m.date + '|' + m.away_team;
        apiMap.set(key, {
          date: m.date.replace(/-/g, '.'),
          home: m.home_team || '今日说法',
          away: m.away_team,
          score,
          result: m.result,
          scorers,
          assisters
        });
      });
      // API 赛果覆盖或追加
      results = results.filter(r => !apiMap.has(r.date + '|' + r.away));
      const extra = [];
      apiMap.forEach((v, k) => {
        const exists = data.results.some(r => (r.date + '|' + r.away) === k);
        if (exists) {
          results.unshift(v);
        } else {
          extra.push(v);
        }
      });
      results = [...extra.reverse(), ...results];
    }
  } catch (e) { /* API 不可用时降级到纯静态数据 */ }

  const statusText = { win: "胜", draw: "平", loss: "负" };
  const statusClass = { win: "win", draw: "draw", loss: "loss" };

  // === 最新战报（3场 + 链接到独立页面） ===
  const resultsEl = document.getElementById("resultsList");
  if (resultsEl) {
    const visible = results.slice(0, 3);
    if (visible.length) {
      const renderItem = m => {
        const hasGoals = m.scorers && m.scorers.length > 0;
        const hasAssists = m.assisters && m.assisters.length > 0;
        const detailHTML = (hasGoals || hasAssists) ? `
          <div class="fixture-detail">
            ${hasGoals ? `<span class="fixture-goals"><span class="fixture-goal-dot"></span>${m.scorers.map(p => `${p.name}(${p.num})`).join("  ")}</span>` : ""}
            ${hasAssists ? `<span class="fixture-assists"><span class="fixture-assist-badge">A</span>${m.assisters.map(p => `${p.name}(${p.num})`).join("  ")}</span>` : ""}
          </div>` : "";
        return `
        <div class="fixture-item">
          <div class="fixture-item-main">
            <span class="fixture-date">${m.date}</span>
            <span class="fixture-teams">${m.home} vs ${m.away}</span>
            <span class="fixture-score ${statusClass[m.result]}">${m.score} ${statusText[m.result]}</span>
          </div>
          ${detailHTML}
        </div>`;
      };
      resultsEl.innerHTML = visible.map(renderItem).join("");
    } else {
      resultsEl.innerHTML = '<div class="fixture-empty">暂无比赛记录</div>';
    }

    const viewAll = document.getElementById("resultsViewAll");
    if (viewAll) {
      viewAll.style.display = "block";
      viewAll.innerHTML = `<a href="fixtures.html" class="view-all-link">查看全部战绩（${results.length} 场） →</a>`;
    }
  }

  // === 即将开赛 ===
  const upcomingEl = document.getElementById("upcomingList");
  let upcomingFiltered = upcoming; // 默认值，防止块作用域问题
  if (upcomingEl) {
    const now = new Date();
    upcomingFiltered = upcoming.filter(m => {
      if (!m || !m.date) return false;
      const startTime = new Date(m.date.replace(/\./g, "-") + "T" + (m.time || "14:40") + ":00");
      if (isNaN(startTime.getTime())) return false;
      const endTime = new Date(startTime.getTime() + MATCH_DURATION_HOURS * 60 * 60 * 1000);
      return now < endTime; // 比赛未结束才显示
    });

    if (upcomingFiltered.length === 0) {
      upcomingEl.innerHTML = '<div class="fixture-empty">暂无即将开赛的比赛</div>';
    } else {
      upcomingEl.innerHTML = upcomingFiltered.slice(0, 3).map((m, i) => {
        const jerseyBadge = m.jersey ? `<span class="fixture-jersey" style="background:${m.jerseyColor};color:#fff">${m.jersey}</span>` : "";
        return `
    <div class="fixture-item" data-upcoming-idx="${i}">
      <div class="fixture-item-main">
        <span class="fixture-date">${m.date}</span>
        <span class="fixture-teams">${m.home} vs ${m.away} ${jerseyBadge}</span>
        <span class="reg-entry-btn upcoming" data-reg-idx="${i}">—</span>
      </div>
      <div class="fixture-meta">${m.time || ""} · ${m.venue || ""}</div>
      <div class="reg-entry-warning" data-warn-idx="${i}" style="display:none"></div>
    </div>
    `}).join("");
    }
  }

  // 存储过滤后的 upcoming，供 countdown 和 reg buttons 使用
  window.__upcoming = upcomingFiltered;

  startCountdown();
}

/* === Registration Buttons === */
async function initRegButtons() {
  const upcoming = window.__upcoming || [];

  let apiMatches = [];
  try { apiMatches = await API.getMatches(); } catch (e) { /* API unavailable */ }

  const now = new Date();

  // 找出 API 中有但静态数据中没有的 upcoming 比赛（排除已结束的）
  const staticKeys = new Set(upcoming.map(m => m.date.replace(/\./g, '-') + '|' + m.away));
  const extraMatches = apiMatches.filter(m => {
    if (staticKeys.has(m.date + '|' + m.away_team)) return false;
    const matchStart = new Date(m.date + 'T' + (m.time || '14:40') + ':00');
    const matchEnd = new Date(matchStart.getTime() + MATCH_DURATION_HOURS * 60 * 60 * 1000);
    return now < matchEnd;
  });

  // 将额外的 API 比赛追加到 upcoming 列表
  if (extraMatches.length > 0) {
    const upcomingEl = document.getElementById('upcomingList');
    const baseCount = upcoming.length;
    const extraHTML = extraMatches.map((m, i) => {
      const jerseyBadge = m.jersey ? `<span class="fixture-jersey" style="background:${m.jersey_color};color:#fff">${m.jersey}</span>` : '';
      const idx = baseCount + i;
      return `
    <div class="fixture-item" data-upcoming-idx="${idx}">
      <div class="fixture-item-main">
        <span class="fixture-date">${(m.date || '').replace(/-/g, '.')}</span>
        <span class="fixture-teams">${m.home_team || '今日说法'} vs ${m.away_team} ${jerseyBadge}</span>
        <span class="reg-entry-btn upcoming" data-reg-idx="${idx}">—</span>
      </div>
      <div class="fixture-meta">${m.time || ''} · ${m.venue || ''}</div>
      <div class="reg-entry-warning" data-warn-idx="${idx}" style="display:none"></div>
    </div>`;
    }).join('');
    upcomingEl.insertAdjacentHTML('beforeend', extraHTML);
    // 扩展 upcoming 数组以便后续处理
    extraMatches.forEach(m => {
      upcoming.push({
        date: m.date, time: m.time, home: m.home_team || '今日说法', away: m.away_team,
        venue: m.venue, jersey: m.jersey, jerseyColor: m.jersey_color,
        _apiMatch: m
      });
    });
  }

  if (!upcoming.length) return;

  upcoming.forEach((m, i) => {
    const btn = document.querySelector(`[data-reg-idx="${i}"]`);
    const warn = document.querySelector(`[data-warn-idx="${i}"]`);
    if (!btn) return;

    // 使用已有的 API 匹配或静态数据中的 API 匹配
    const apiMatch = m._apiMatch || apiMatches.find(am => am.date === m.date && am.away_team === m.away);
    const match = apiMatch || m;

    if (!match.reg_open_at || !match.reg_close_at) {
      btn.textContent = '—';
      btn.className = 'reg-entry-btn closed';
      return;
    }

    const regOpen = new Date(match.reg_open_at);
    const regClose = new Date(match.reg_close_at);

    if (now < regOpen) {
      btn.textContent = '未开启';
      btn.className = 'reg-entry-btn upcoming';
    } else if (now >= regOpen && now <= regClose) {
      btn.className = 'reg-entry-btn open';
      btn.style.cursor = 'pointer';
      if (match.id) {
        API.getRegistrations(match.id).then(list => {
          const n = list.filter(r => r.status === 'confirmed').length;
          btn.textContent = `报名中 (${n}/14)`;
          const twoHBefore = new Date(regClose.getTime() - 2 * 60 * 60 * 1000);
          if (now >= twoHBefore && n < 14 && warn) {
            warn.style.display = 'block';
            warn.textContent = `距截止不足2小时，仅${n}人报名`;
          }
        }).catch(() => { btn.textContent = '报名中'; });
      } else {
        btn.textContent = '报名中';
      }
      btn.addEventListener('click', () => {
        if (match.id) window.openRegPanel(match);
      });
    } else {
      btn.textContent = '已截止';
      btn.className = 'reg-entry-btn closed';
    }
  });
}

/* === Lightbox (shared) === */
function initLightbox() {
  const lb = document.getElementById("lightbox");
  const close = document.getElementById("lightboxClose");
  close.addEventListener("click", () => lb.classList.remove("open"));
  closeOnBackdrop(lb, () => lb.classList.remove("open"));
  closeOnEscape(lb, () => lb.classList.remove("open"));
}

function openLightbox(content) {
  const img = document.getElementById("lightboxImg");
  if (typeof content === "string" && !content.startsWith("<")) {
    img.src = content;
    img.style.maxWidth = "90vw";
    img.style.maxHeight = "85vh";
  } else {
    img.src = `data:image/svg+xml,${encodeURIComponent(content)}`;
    img.style.maxWidth = "";
    img.style.maxHeight = "";
  }
  document.getElementById("lightbox").classList.add("open");
}

/* === Hero Particles === */
function initHeroParticles() {
  const canvas = document.getElementById("heroParticles");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const hero = canvas.parentElement;
  const dpr = window.devicePixelRatio || 1;

  const particles = [];
  const count = 45;

  function resize() {
    canvas.width = hero.offsetWidth * dpr;
    canvas.height = hero.offsetHeight * dpr;
    canvas.style.width = hero.offsetWidth + "px";
    canvas.style.height = hero.offsetHeight + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random(),
      y: Math.random(),
      r: 0.6 + Math.random() * 2.2,
      speed: 0.003 + Math.random() * 0.012,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: (Math.random() - 0.5) * 0.02,
      wobbleAmp: 0.3 + Math.random() * 0.7,
      alpha: 0.08 + Math.random() * 0.25,
      alphaPulse: Math.random() * Math.PI * 2,
      hueShift: Math.random() * 0.3 - 0.15
    });
  }

  function draw() {
    const w = hero.offsetWidth;
    const h = hero.offsetHeight;

    ctx.clearRect(0, 0, w, h);

    particles.forEach(p => {
      p.y -= p.speed;
      p.wobble += p.wobbleSpeed;
      p.alphaPulse += 0.015;

      if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); }

      const px = (p.x + Math.sin(p.wobble) * p.wobbleAmp / w) * w;
      const py = p.y * h;

      const alpha = p.alpha * (0.7 + 0.3 * Math.sin(p.alphaPulse));
      const hue = 38 + p.hueShift * 15;

      ctx.beginPath();
      ctx.arc(px, py, p.r, 0, Math.PI * 2);
      ctx.shadowBlur = p.r * 3;
      ctx.shadowColor = `hsla(${hue}, 65%, 75%, ${alpha})`;
      ctx.fillStyle = `hsla(${hue}, 65%, 75%, ${alpha})`;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    if (!paused) requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener("resize", rafThrottle(resize));

  let paused = false;
  const heroObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      if (paused) { paused = false; draw(); }
    } else {
      paused = true;
    }
  }, { threshold: 0 });
  heroObserver.observe(hero);
}

/* === Carousel === */
function initCarousel(slidesOverride) {
  const slides = slidesOverride || getDefaultSlides();

  const track = document.getElementById("carouselTrack");
  const dots = document.getElementById("carouselDots");
  const prev = document.getElementById("carouselPrev");
  const next = document.getElementById("carouselNext");
  if (!track || !dots || !prev || !next) return;

  let current = 0;
  let timer;

  // 预加载首张图片
  if (slides.length > 0 && slides[0]._imageUrl) {
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = slides[0]._imageUrl;
    document.head.appendChild(link);
  }

  track.innerHTML = slides.map((s, i) => `
    <div class="carousel-slide" data-index="${i}">
      ${s._imageUrl
        ? `<img class="carousel-slide-img" src="${s._imageUrl}" alt="${s.label}" decoding="async"${i === 0 ? ' fetchpriority="high"' : ""}>`
        : `<span class="carousel-slide-placeholder">${s.label}</span>`}
    </div>
  `).join("");

  dots.innerHTML = slides.map((_, i) =>
    `<button class="carousel-dot${i === 0 ? " active" : ""}" data-index="${i}" aria-label="第${i + 1}张"></button>`
  ).join("");

  function goTo(index) {
    current = ((index % slides.length) + slides.length) % slides.length;
    track.style.transform = `translateX(-${current * 100}%)`;
    dots.querySelectorAll(".carousel-dot").forEach((d, i) => {
      d.classList.toggle("active", i === current);
    });
  }

  function nextSlide() { goTo(current + 1); }
  function prevSlide() { goTo(current - 1); }

  function startTimer() {
    stopTimer();
    if (!REDUCED_MOTION) timer = setInterval(nextSlide, TIMING.CAROUSEL);
  }
  function stopTimer() { clearInterval(timer); }

  prev.addEventListener("click", () => { prevSlide(); startTimer(); });
  next.addEventListener("click", () => { nextSlide(); startTimer(); });

  dots.addEventListener("click", (e) => {
    const dot = e.target.closest(".carousel-dot");
    if (!dot) return;
    goTo(parseInt(dot.dataset.index, 10));
    startTimer();
  });

  // Touch swipe
  let touchStartX = 0;
  track.addEventListener("touchstart", (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener("touchend", (e) => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? nextSlide() : prevSlide();
      startTimer();
    }
  });

  // Lightbox on click
  track.addEventListener("click", (e) => {
    const slide = e.target.closest(".carousel-slide");
    if (!slide) return;
    const idx = parseInt(slide.dataset.index, 10);
    const s = slides[idx];
    if (s._imageUrl) {
      openLightbox(s._imageUrl);
    } else {
      openLightbox(svgPlaceholder("今日说法", s.label, 800, 500, 270, 310));
    }
  });

  startTimer();

  // Pause on hover
  const carousel = document.getElementById("carousel");
  carousel.addEventListener("mouseenter", stopTimer);
  carousel.addEventListener("mouseleave", startTimer);
}

/* === Tactics Board === */
function initTacticsBoard() {
  const canvas = document.getElementById("tacticsCanvas");
  if (!canvas) return;
  const board = canvas.parentElement;
  const dpr = window.devicePixelRatio || 1;

  const formations = {
    "322": {
      name: "3-2-2",
      positions: [
        { row: 0, col: 0, rows: 4, cols: 1, number: 1 },
        { row: 1, col: 0, rows: 4, cols: 3, number: 4 },
        { row: 1, col: 1, rows: 4, cols: 3, number: 6 },
        { row: 1, col: 2, rows: 4, cols: 3, number: 14 },
        { row: 2, col: 0, rows: 4, cols: 2, number: 8 },
        { row: 2, col: 1, rows: 4, cols: 2, number: 22 },
        { row: 3, col: 0, rows: 4, cols: 2, number: 7 },
        { row: 3, col: 1, rows: 4, cols: 2, number: 9 },
      ]
    },
    "232": {
      name: "2-3-2",
      positions: [
        { row: 0, col: 0, rows: 4, cols: 1, number: 1 },
        { row: 1, col: 0, rows: 4, cols: 2, number: 4 },
        { row: 1, col: 1, rows: 4, cols: 2, number: 14 },
        { row: 2, col: 0, rows: 4, cols: 3, number: 6 },
        { row: 2, col: 1, rows: 4, cols: 3, number: 8 },
        { row: 2, col: 2, rows: 4, cols: 3, number: 22 },
        { row: 3, col: 0, rows: 4, cols: 2, number: 7 },
        { row: 3, col: 1, rows: 4, cols: 2, number: 9 },
      ]
    },
    "331": {
      name: "3-3-1",
      positions: [
        { row: 0, col: 0, rows: 4, cols: 1, number: 1 },
        { row: 1, col: 0, rows: 4, cols: 3, number: 4 },
        { row: 1, col: 1, rows: 4, cols: 3, number: 6 },
        { row: 1, col: 2, rows: 4, cols: 3, number: 14 },
        { row: 2, col: 0, rows: 4, cols: 3, number: 8 },
        { row: 2, col: 1, rows: 4, cols: 3, number: 22 },
        { row: 2, col: 2, rows: 4, cols: 3, number: 10 },
        { row: 3, col: 0, rows: 4, cols: 1, number: 9 },
      ]
    },
  };

  let currentFormation = "322";

  let playerMap = null;
  function getPlayerMap() {
    if (playerMap) return playerMap;
    const players = window.__players;
    if (!players) return null;
    playerMap = new Map(players.map(p => [p.number, p]));
    return playerMap;
  }

  function getPlayerField(number, field) {
    const map = getPlayerMap();
    if (!map) return "";
    const p = map.get(number);
    return p ? (p[field] || "") : "";
  }

  function draw() {
    const w = board.clientWidth;
    const h = w * 0.7;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    canvas.width = w * dpr;
    canvas.height = h * dpr;

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const lineColor = "rgba(255,255,255,0.25)";
    const gold = "#cfae5a";
    const pad = w * 0.03;
    const px = pad, py = pad;
    const pw = w - pad * 2, ph = h - pad * 2;
    const halfX = px + pw / 2;

    // Pitch background
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 6);
    ctx.clip();

    ctx.fillStyle = "#2a5c2a";
    ctx.fillRect(px, py, pw, ph);

    // Lawn stripes — horizontal bands simulating mowing pattern
    const stripes = 16;
    const stripeH = ph / stripes;
    for (let i = 0; i < stripes; i++) {
      ctx.fillStyle = i % 2 === 0 ? "#2a5c2a" : "#2f6330";
      ctx.fillRect(px, py + i * stripeH, pw, stripeH + 1);
    }

    ctx.restore();

    // Pitch border
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 6);
    ctx.stroke();

    // Halfway line — bottom edge
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px, py + ph);
    ctx.lineTo(px + pw, py + ph);
    ctx.stroke();

    // Center arc — semicircle from halfway line upward
    const centerArcR = ph * 0.14;
    ctx.beginPath();
    ctx.arc(halfX, py + ph, centerArcR, Math.PI, 0);
    ctx.stroke();

    // Center spot
    ctx.fillStyle = lineColor;
    ctx.beginPath();
    ctx.arc(halfX, py + ph, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Penalty area (attacking end, top)
    const paW = pw * 0.4, paH = ph * 0.25;
    ctx.strokeRect(halfX - paW / 2, py, paW, paH);

    // Goal area
    const gaW = pw * 0.2, gaH = ph * 0.1;
    ctx.strokeRect(halfX - gaW / 2, py, gaW, gaH);

    // Penalty spot
    const penY = py + paH - ph * 0.07;
    ctx.fillStyle = lineColor;
    ctx.beginPath();
    ctx.arc(halfX, penY, 2, 0, Math.PI * 2);
    ctx.fill();

    // Penalty arc (D)
    const arcR = ph * 0.08;
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(halfX, py + paH, arcR, Math.PI, 0);
    ctx.stroke();

    // Corner arcs — all curving inside the pitch
    const cr = pw * 0.025;
    ctx.lineWidth = 1.5;
    // top-left
    ctx.beginPath(); ctx.arc(px, py, cr, 0, Math.PI / 2); ctx.stroke();
    // top-right
    ctx.beginPath(); ctx.arc(px + pw, py, cr, Math.PI / 2, Math.PI); ctx.stroke();
    // bottom-right
    ctx.beginPath(); ctx.arc(px + pw, py + ph, cr, Math.PI, Math.PI * 1.5); ctx.stroke();
    // bottom-left
    ctx.beginPath(); ctx.arc(px, py + ph, cr, Math.PI * 1.5, Math.PI * 2); ctx.stroke();

    // Goal
    const goalW = pw * 0.16;
    const goalH = ph * 0.03;
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 3;
    ctx.strokeRect(halfX - goalW / 2, py - 1, goalW, goalH);

    // Goal net hint
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.fillRect(halfX - goalW / 2, py, goalW, goalH);

    // Player positions
    const formation = formations[currentFormation];
    const marginX = pw * 0.1;
    const fieldTop = py + ph * 0.1;
    const fieldHeight = ph * 0.75;
    const dotR = Math.max(13, pw * 0.035);

    formation.positions.forEach(p => {
      const cx = p.cols === 1
        ? halfX
        : px + marginX + (p.col / (p.cols - 1)) * (pw - marginX * 2);
      const cy = fieldTop + (p.row / (p.rows - 1)) * fieldHeight;

      // Player circle — fill by position group
      const role = getPlayerField(p.number, "role");
      const g = getPositionGroup(role);
      const posColor = g === "role-fw" ? "#f87171" : g === "role-mf" ? "#4ade80" : g === "role-df" ? "#60a5fa" : g === "role-gk" ? "#fb923c" : gold;
      ctx.fillStyle = posColor + "22";
      ctx.strokeStyle = posColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Number
      ctx.fillStyle = posColor;
      ctx.font = `bold ${Math.max(10, dotR * 1.1)}px -apple-system, "PingFang SC", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.number, cx, cy);

      // Name
      const playerName = getPlayerField(p.number, "name");
      if (playerName) {
        ctx.fillStyle = posColor + "99";
        ctx.font = `${Math.max(8, dotR * 0.65)}px -apple-system, "PingFang SC", sans-serif`;
        ctx.fillText(playerName, cx, cy + dotR + 12);
      }
    });
  }

  // Formation switcher
  document.querySelectorAll(".tactics-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tactics-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentFormation = btn.dataset.formation;
      draw();
    });
  });

  draw();
  window.addEventListener("resize", rafThrottle(draw));
}

/* === Gallery Overlay === */
function initGalleryOverlay(albumsOverride) {
  const albums = albumsOverride || getDefaultAlbums();
  const overlay = document.getElementById("galleryOverlay");
  const content = document.getElementById("galleryOverlayContent");
  const backBtn = document.getElementById("galleryOverlayBack");

  function render() {
    content.innerHTML = albums.map(a => `
      <div class="gallery-album">
        <div class="gallery-album-header">
          <div class="gallery-album-title">${a.title}</div>
          <div class="gallery-album-date">${a.date}</div>
        </div>
        <div class="gallery-album-grid">
          ${a.photos.map((p, i) => `
            <div class="gallery-photo" data-album="${a.title}" data-idx="${i}">
              ${p._imageUrl
                ? `<img src="${p._imageUrl}" alt="${p.label}" loading="lazy" decoding="async">`
                : `<svg class="gallery-photo-camera" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="5" width="20" height="15" rx="2"/><circle cx="12" cy="13" r="3"/><path d="M8 5V3h8v2"/></svg>`}
            </div>
          `).join("")}
        </div>
      </div>
    `).join("");
  }

  function open() {
    render();
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function close() {
    overlay.classList.remove("open");
    document.body.style.overflow = "";
  }

  // Intercept nav link
  const galleryLink = document.querySelector('.nav-link[href="#gallery"]');
  if (galleryLink) {
    galleryLink.addEventListener("click", (e) => {
      e.preventDefault();
      open();
    });
  }

  backBtn.addEventListener("click", close);
  closeOnBackdrop(overlay, close);
  closeOnEscape(overlay, close);

  // Photo click → lightbox
  content.addEventListener("click", (e) => {
    const photo = e.target.closest(".gallery-photo");
    if (!photo) return;
    const album = photo.dataset.album;
    const idx = parseInt(photo.dataset.idx, 10);
    const albumData = albums.find(a => a.title === album);
    if (!albumData) return;
    const p = albumData.photos[idx];
    if (p._imageUrl) {
      openLightbox(p._imageUrl);
    } else {
      openLightbox(svgPlaceholder(album, p.label, 800, 600, 280, 315));
    }
  });
}

/* === Player Detail Overlay === */
let __pd = null;
function initPlayerDetail() {
  const overlay = document.getElementById("playerOverlay");
  const backBtn = document.getElementById("playerBack");

  __pd = {
    overlay,
    avatar: document.getElementById("playerDetailAvatar"),
    number: document.getElementById("playerDetailNumber"),
    name: document.getElementById("playerDetailName"),
    role: document.getElementById("playerDetailRole"),
    bio: document.getElementById("playerDetailBio"),
    info: document.getElementById("playerDetailInfo"),
    strengths: document.getElementById("playerDetailStrengths"),
  };

  backBtn.addEventListener("click", closePlayerDetail);
  closeOnBackdrop(overlay, closePlayerDetail);
  closeOnEscape(overlay, closePlayerDetail);
}

function openPlayerDetail(index) {
  const p = window.__players[index];
  if (!p || !__pd) return;
  const el = __pd;

  el.avatar.className = "player-detail-avatar";
  if (p._avatarUrl) {
    el.avatar.innerHTML = `<img src="${p._avatarUrl}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
  } else {
    el.avatar.innerHTML = `<span class="player-detail-avatar-initial">${p.name[0]}</span>`;
  }

  el.number.textContent = p.number;
  el.name.textContent = p.name;
  el.role.textContent = p.role;
  el.role.className = "player-detail-role " + getPositionGroup(p.role);
  el.bio.textContent = p.bio;

  el.info.innerHTML = `
    <div class="player-info-item">
      <div class="player-info-value">${p.age ?? "—"}</div>
      <div class="player-info-label">年龄</div>
    </div>
    <div class="player-info-item">
      <div class="player-info-value">${p.number}</div>
      <div class="player-info-label">号码</div>
    </div>
    <div class="player-info-item">
      <div class="player-info-value">${p.joinYear}</div>
      <div class="player-info-label">入队</div>
    </div>
  `;

  el.strengths.innerHTML = p.strengths.map(s =>
    `<span class="player-strength-tag">${s}</span>`
  ).join("");

  el.overlay.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closePlayerDetail() {
  if (!__pd) return;
  __pd.overlay.classList.remove("open");
  document.body.style.overflow = "";
  document.querySelectorAll(".player-card.flipped").forEach(c => c.classList.remove("flipped"));
}

/* === Scroll Reveal === */
function initScrollReveal() {
  const targets = document.querySelectorAll(
    ".player-card-front, .stat-item, .fixture-item"
  );
  if (REDUCED_MOTION) {
    targets.forEach(el => { el.style.opacity = "1"; el.style.transform = "none"; });
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = "1";
          entry.target.style.transform = "translateY(0)";
        }
      });
    },
    { threshold: 0.1 }
  );
  targets.forEach((el, i) => {
    el.style.opacity = "0";
    el.style.transform = "translateY(24px)";
    el.style.transition = "opacity 0.5s ease, transform 0.5s ease";
    el.style.transitionDelay = (i % TIMING.REVEAL_GROUP) * TIMING.REVEAL_STAGGER + "s";
    observer.observe(el);
  });
}

/* === Count-Up Animation === */
function initCountUp() {
  const targets = document.querySelectorAll(".stat-number");
  if (!targets.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const raw = el.textContent.trim();
      const match = raw.match(/^(\d+)(\+?)$/);
      if (!match) { observer.unobserve(el); return; }
      const end = parseInt(match[1], 10);
      const suffix = match[2];
      if (REDUCED_MOTION) { el.textContent = end + suffix; observer.unobserve(el); return; }
      let start = 0;
      const duration = TIMING.COUNTUP;
      const startTime = performance.now();

      function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(start + (end - start) * eased);
        el.textContent = current + suffix;
        if (progress < 1) {
          requestAnimationFrame(step);
        }
      }

      requestAnimationFrame(step);
      observer.unobserve(el);
    });
  }, { threshold: 0.5 });

  targets.forEach(el => observer.observe(el));
}

/* === Back to Top === */
function initBackToTop() {
  const btn = document.getElementById("backToTop");

  window.addEventListener("scroll", rafThrottle(() => {
    btn.classList.toggle("visible", window.scrollY > window.innerHeight);
  }));

  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

/* === Countdown Timer === */
const MATCH_DURATION_HOURS = 2; // 每场比赛2小时

function startCountdown() {
  const upcoming = window.__upcoming;
  if (!upcoming || !upcoming.length) return;

  const now = new Date();

  // 找到第一场未结束的比赛（开始时间+2小时后才算结束）
  let matchIndex = -1;
  for (let i = 0; i < upcoming.length; i++) {
    const m = upcoming[i];
    if (!m || !m.date) continue;
    const timeStr = m.time || "14:40";
    const startDate = new Date(m.date.replace(/\./g, "-") + "T" + timeStr + ":00");
    if (isNaN(startDate.getTime())) continue;
    const endDate = new Date(startDate.getTime() + MATCH_DURATION_HOURS * 60 * 60 * 1000);
    if (now < endDate) {
      matchIndex = i;
      break;
    }
  }

  const timer = document.getElementById("countdownTimer");
  const matchEl = document.getElementById("countdownMatch");
  if (!timer) return;

  // 所有比赛都已结束
  if (matchIndex === -1) {
    if (matchEl) matchEl.innerHTML = '<div class="countdown-teams"><span>—</span><span class="countdown-vs">vs</span><span>—</span></div><div class="countdown-meta">暂无比赛</div>';
    timer.innerHTML = `<span class="countdown-ended">等待新赛程</span>`;
    return;
  }

  const m = upcoming[matchIndex];
  const timeStr = m.time || "14:40";
  const targetDate = new Date(m.date.replace(/\./g, "-") + "T" + timeStr + ":00");
  const endDate = new Date(targetDate.getTime() + MATCH_DURATION_HOURS * 60 * 60 * 1000);

  if (matchEl) {
    const d = new Date(targetDate);
    const weekdays = ["周日","周一","周二","周三","周四","周五","周六"];
    const wd = weekdays[d.getDay()];
    const jerseyHTML = m.jersey ? `<span class="countdown-jersey" style="background:${m.jerseyColor};color:#fff">${m.jersey}球衣</span>` : "";
    matchEl.innerHTML = `
      <div class="countdown-teams"><span>${m.home}</span><span class="countdown-vs">vs</span><span>${m.away}</span></div>
      <div class="countdown-meta">${m.date.replace(/-/g, '.').replace(/\./, "年").replace(/\./, "月")}日 ${wd} · ${timeStr}</div>
      <div class="countdown-venue">${m.venue || ""} ${jerseyHTML}</div>
    `;
  }

  function tick() {
    const now = new Date();
    const diff = targetDate - now;

    // 比赛进行中（开始时间已过但未到结束时间）
    if (diff <= 0 && now < endDate) {
      const remaining = endDate - now;
      const rHours = Math.floor(remaining / (1000 * 60 * 60));
      const rMinutes = Math.floor((remaining / (1000 * 60)) % 60);
      const rSeconds = Math.floor((remaining / 1000) % 60);
      const timeStr = rHours > 0
        ? `${rHours}时${String(rMinutes).padStart(2, "0")}分${String(rSeconds).padStart(2, "0")}秒`
        : `${rMinutes}分${String(rSeconds).padStart(2, "0")}秒`;
      timer.innerHTML = `
        <span class="countdown-live">比赛进行中</span>
        <span class="countdown-remaining">剩余 ${timeStr}</span>
      `;
      return;
    }

    // 比赛已结束，切换到下一场
    if (now >= endDate) {
      startCountdown();
      return;
    }

    // 比赛未开始，倒计时
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    timer.innerHTML = `
      <span><em>${days}</em><small>天</small></span>
      <span><em>${String(hours).padStart(2, "0")}</em><small>时</small></span>
      <span><em>${String(minutes).padStart(2, "0")}</em><small>分</small></span>
      <span><em>${String(seconds).padStart(2, "0")}</em><small>秒</small></span>
    `;
  }

  // Clear previous timer and observer before creating new ones
  if (startCountdown._timerId) { clearInterval(startCountdown._timerId); startCountdown._timerId = null; }
  if (startCountdown._observer) { startCountdown._observer.disconnect(); startCountdown._observer = null; }

  tick();
  startCountdown._timerId = setInterval(tick, 1000);

  const bar = document.getElementById("countdownBar");
  if (bar) {
    startCountdown._observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        if (!startCountdown._timerId) { tick(); startCountdown._timerId = setInterval(tick, 1000); }
      } else {
        clearInterval(startCountdown._timerId);
        startCountdown._timerId = null;
      }
    }, { threshold: 0 });
    startCountdown._observer.observe(bar);
  }
}

/* === Card Flip === */
function flipCard(card) {
  const wasFlipped = card.classList.contains("flipped");
  document.querySelectorAll(".player-card.flipped").forEach(c => c.classList.remove("flipped"));
  if (!wasFlipped) {
    card.classList.add("flipped");
  }
}

