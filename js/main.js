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
const TIMING = { CAROUSEL: 3500, SCROLL_THRESHOLD: 60, ACTIVE_OFFSET: 120, COUNTUP: 1200, SWIPE: 50, REVEAL_STAGGER: 0.04, REVEAL_GROUP: 5 };
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
    <text fill="#d4a843" font-size="22" text-anchor="middle" x="${w/2}" y="${fy}" font-weight="600">${title}</text>
    <text fill="#888" font-size="16" text-anchor="middle" x="${w/2}" y="${sy}">${subtitle}</text>
  </svg>`;
}

// 单一全局 Escape 处理器（避免每个 overlay 各注册一个 document keydown 监听）
(function () {
  var handlers = [];
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !handlers.length) return;
    for (var i = handlers.length - 1; i >= 0; i--) {
      if (handlers[i].el.classList.contains('open')) {
        handlers[i].fn();
        break;
      }
    }
  });
  window.registerEscape = function (el, fn) {
    handlers.push({ el: el, fn: fn });
  };
})();

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
    var img = new Image();
    img.onload = function () { resolve(this._src); };
    img.onerror = function () {
      if (this._src.endsWith('.webp')) {
        var fallback = new Image();
        fallback._src = 'images/players/' + number + '.jpg';
        fallback.onload = function () { resolve(this._src); };
        fallback.onerror = function () { resolve(null); };
        fallback.src = fallback._src;
      } else {
        resolve(null);
      }
    };
    img._src = 'images/players/' + number + '.webp';
    img.src = img._src;
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
   Unified IntersectionObserver (合并 5 → 1)
   ======================================== */
var _ioCallbacks = [];
var _io = new IntersectionObserver(function(entries) {
  entries.forEach(function(entry) {
    for (var i = 0; i < _ioCallbacks.length; i++) {
      var cb = _ioCallbacks[i];
      if (cb.el === entry.target) {
        cb.fn(entry.isIntersecting, entry);
        break;
      }
    }
  });
});
function registerVisibility(el, fn) {
  _ioCallbacks.push({ el: el, fn: fn });
  _io.observe(el);
  return function() { // 返回取消监听函数
    _io.unobserve(el);
    for (var i = _ioCallbacks.length - 1; i >= 0; i--) {
      if (_ioCallbacks[i].el === el) { _ioCallbacks.splice(i, 1); break; }
    }
  };
}

/* ========================================
   Main Init
   ======================================== */
function loadScript(src) {
  return new Promise(function(resolve, reject) {
    var s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = function() { reject(new Error("Failed to load " + src)); };
    document.head.appendChild(s);
  });
}

function ensureOpenRegPanel(match) {
  if (window.openRegPanel) window.openRegPanel(match);
}

function ensureOpenVotePanel(match) {
  var p = window.openVotePanel
    ? Promise.resolve()
    : loadScript("js/voting.js").catch(function() {});
  p.then(function() {
    if (window.openVotePanel) window.openVotePanel(match);
  });
}

document.addEventListener("DOMContentLoaded", function () {
  initNav();
  initLightbox();
  initHeroParticles();
  initPageFlags();
  initPlayerDetail();
  initCountUp();
  initBackToTop();

  initTacticsBoard();
  initScrollReveal();

  // Render immediately with static data, then enrich from API in background
  loadAllOverridesAndMerge();

  // 监听其他标签页的数据更新（管理员保存赛果后自动刷新战报）
  window.addEventListener('storage', function (e) {
    if (e.key === 'jrsf_lastResultUpdate' && e.newValue) {
      renderFixtures().then(function () { loadMVPs(); });
    }
  });

  // 用户切回标签页时兜底刷新战报
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) {
      renderFixtures().then(function () { loadMVPs(); });
    }
  });
});

/* ========================================
   Data Merge & Render Orchestrator
   ======================================== */
async function loadAllOverridesAndMerge() {
  var overrides = loadOverrides();
  var players = getDefaultPlayers();

  var photosPromise = API.getAllPhotosGrouped().catch(function (e) {
    console.warn('[Gallery] 比赛照片获取失败:', e.message);
    return {};
  });

  var mergedPlayers = players.map(function (p) {
    var ov = overrides.players[p.number] || {};
    var merged = Object.assign({}, p);
    if (ov.role) merged.role = ov.role;
    if (ov.bio) merged.bio = ov.bio;
    if (ov.height) merged.height = ov.height;
    if (ov.weight) merged.weight = ov.weight;
    if (ov.strengths) merged.strengths = ov.strengths;
    return merged;
  });

  var defaultSlides = getDefaultSlides();
  var mergedSlides = defaultSlides.map(function (s, i) {
    var ov = overrides.slides[i] || {};
    return Object.assign({}, s, { label: ov.label != null ? ov.label : s.label });
  });

  var defaultAlbums = getDefaultAlbums();
  var mergedAlbums = defaultAlbums.map(function (a) {
    var mergedPhotos = a.photos.map(function (p, i) {
      var key = a.title + "||" + i;
      var ov = overrides.albums[key] || {};
      return Object.assign({}, p, { label: ov.label != null ? ov.label : p.label });
    });
    return Object.assign({}, a, { photos: mergedPhotos });
  });

  // === IMMEDIATE RENDER (sync, before any await) ===
  renderRoster(mergedPlayers);
  renderFixtures();       // renders from cache+API, startCountdown+DOM inside
  initCarousel(mergedSlides);
  initGalleryOverlay(mergedAlbums);
  window.__players = mergedPlayers;

  // === 拉取 Supabase 比赛照片，融入统一「比赛瞬间」相册 ===
  var allMatchPhotos = [];
  var grouped = await photosPromise;
  var matchAlbums = Object.values(grouped);
    matchAlbums.sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
    matchAlbums.forEach(function (album) {
	      var groupTitle = (album.home_team || '今日说法') + ' vs ' + (album.away_team || '') ;
 	      var groupMeta = (album.date || '').replace(/-/g, '.');
	      if (album.venue) groupMeta += ' · ' + album.venue;
      album.photos.forEach(function (p) {
        allMatchPhotos.push({
          label: groupTitle,
          _imageUrl: p.fullUrl,
          _thumbUrl: p.thumbUrl,
          _groupLabel: groupTitle,
	          _groupMeta: groupMeta,
          _matchPhotoId: p.id
        });
      });
    });

  if (allMatchPhotos.length) {
    // 找到或创建「比赛瞬间」相册
    var matchAlbum = mergedAlbums.find(function (a) { return a.title === '比赛瞬间'; });
    if (!matchAlbum) {
      matchAlbum = { title: '比赛瞬间', date: '', photos: [], _hasGroups: true };
      mergedAlbums.unshift(matchAlbum);
    }
    matchAlbum._hasGroups = true;
    // 把比赛照片追加到该相册
    allMatchPhotos.forEach(function (p) { matchAlbum.photos.push(p); });

    // IndexedDB 缓存缩略图
    allMatchPhotos.forEach(function (p) {
      var cacheKey = 'match_' + p._matchPhotoId + '_thumb';
      loadImage(STORE.GALLERY, cacheKey).then(function (cachedUrl) {
        if (!cachedUrl && p._thumbUrl) {
          fetch(p._thumbUrl).then(function (r) { return r.blob(); }).then(function (blob) {
            return openDB().then(function (db) {
              return new Promise(function (resolve) {
                var tx = db.transaction(STORE.GALLERY, 'readwrite');
                tx.objectStore(STORE.GALLERY).put({ key: cacheKey, data: blob });
                tx.oncomplete = resolve;
              });
            });
          }).catch(function () {});
        }
      }).catch(function () {});
    });
  }

  // === 轮播：用全部真实照片，随机排列 ===
  var carouselPool = [];
  mergedSlides.forEach(function (s) { if (s._imageUrl) carouselPool.push(s); });
  allMatchPhotos.forEach(function (p) { carouselPool.push({ label: p.label, _imageUrl: p._imageUrl, _thumbUrl: p._thumbUrl }); });

  var shuffledSlides = [];
  if (carouselPool.length) {
    // Fisher-Yates 打乱后取前 5
    var pool = carouselPool.slice();
    for (var ci = pool.length - 1; ci > 0; ci--) {
      var cj = Math.floor(Math.random() * (ci + 1));
      var ct = pool[ci]; pool[ci] = pool[cj]; pool[cj] = ct;
    }
    shuffledSlides = pool.slice(0, 5);
  }

  var playerImagePromises = mergedPlayers.map(function (p) {
    return checkFileAvatar(p.number).then(function (fileUrl) {
      if (fileUrl) { p._avatarUrl = fileUrl; return; }
      return loadImage("playerAvatars", p.number).then(function (url) { if (url) p._avatarUrl = url; });
    });
  });
  var slideImagePromises = shuffledSlides.map(function (s, i) {
    return loadImage("carouselPhotos", i).then(function (url) { if (url) s._imageUrl = url; });
  });
  var albumImagePromises = [];
  mergedAlbums.forEach(function (a) {
    a.photos.forEach(function (p, i) {
      var key = a.title + "||" + i;
      albumImagePromises.push(
        loadImage("galleryPhotos", key).then(function (url) { if (url) p._imageUrl = url; })
      );
    });
  });

  // Refresh carousel/gallery immediately — don't wait for IndexedDB
  if (shuffledSlides.length) initCarousel(shuffledSlides);
  if (mergedAlbums) initGalleryOverlay(mergedAlbums);

  // IndexedDB caching in background (fire-and-forget)
  Promise.all(playerImagePromises.concat(slideImagePromises).concat(albumImagePromises)).catch(function () {});

  // Fetch votes (fixtures already handled by renderFixtures() in sync section)
  var allVotes = await API.getVotes().catch(function () { return []; });
  window.__allVotes = allVotes;
  loadMVPs(allVotes);

  // Ballon d'Or 计分
  var matchPoints = {};
  allVotes.forEach(function (v) {
    var mid = String(v.match_id);
    if (!matchPoints[mid]) matchPoints[mid] = {};
    var pts = v.rank === 1 ? 3 : v.rank === 2 ? 2 : 1;
    matchPoints[mid][v.candidate_name] = (matchPoints[mid][v.candidate_name] || 0) + pts;
  });
  var mvpCounts = {};
  Object.values(matchPoints).forEach(function (pts) {
    var sorted = Object.entries(pts).sort(function (a, b) { return b[1] - a[1]; });
    if (sorted.length) mvpCounts[sorted[0][0]] = (mvpCounts[sorted[0][0]] || 0) + 1;
  });
  window.__mvpCounts = mvpCounts;

  // === 球员整活统计 ===
  var playerStats = await API.getPlayerStats().catch(function () { return {}; });
  window.__playerStats = playerStats;
  if (window.__players) {
    window.__players.forEach(function (p) {
      var s = playerStats[p.name] || { goals: 0, assists: 0, apps: 0, leaves: 0, mvpWins: 0 };
      p._goals = s.goals || 0;
      p._assists = s.assists || 0;
      p._apps = s.apps || 0;
      p._leaves = s.leaves || 0;
      p._mvpWins = s.mvpWins || 0;
      // OVR
      var totalMatches = Math.max(p._apps + p._leaves, 1);
      var attendance = p._apps / totalMatches;
      p._ovr = Math.min(99, Math.max(45, Math.round(40 + p._mvpWins * 8 + p._goals * 3 + p._assists * 2 + attendance * 5 * 10)));
      // 身价
      p._value = Math.max(1000, Math.min(20000, 5000 + p._mvpWins * 3000 + p._goals * 800 + p._assists * 400 - p._leaves * 1500));
      // 出勤率
      p._attendance = attendance;
      if (attendance >= 0.9) p._cardClass = 'card-gold';
      else if (attendance >= 0.7) p._cardClass = 'card-normal';
      else if (attendance >= 0.5) p._cardClass = 'card-worn';
      else p._cardClass = 'card-broken';
    });
    renderRoster(window.__players);
  }
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
    var origIndex = players.indexOf(p);
    var cardClass = p._cardClass || '';
    var ovr = p._ovr != null ? p._ovr : '--';
    var ovrColor = ovr === '--' ? 'ovr-loading' : ovr >= 90 ? 'ovr-green' : ovr >= 80 ? 'ovr-blue' : ovr >= 70 ? 'ovr-gold' : ovr >= 60 ? 'ovr-red' : 'ovr-gray';
    var value = p._value != null ? '¥' + (p._value / 1000).toFixed(1) + 'k' : '';
    var valueLabel = value ? '<span class="player-value">💰 ' + value + '</span>' : '';

    html +=
      '<div class="player-card ' + cardClass + (p.captain ? ' captain' : '') + '" data-player-index="' + origIndex + '" data-player-number="' + p.number + '" onclick="flipCard(this)">' +
        '<div class="player-card-inner">' +
          '<div class="player-card-front">' +
            valueLabel +
            '<div class="player-ovr ' + ovrColor + '">' + ovr + '</div>' +
            '<div class="player-avatar">' +
              (p._avatarUrl
                ? '<img src="' + p._avatarUrl + '" alt="' + p.name + '" decoding="sync">'
                : '<span class="player-avatar-initial">' + p.name[0] + '</span>') +
            '</div>' +
            '<div class="player-number">' + p.number + '</div>' +
            '<div class="player-name">' + p.name + '</div>' +
            '<div class="player-role ' + getPositionGroup(p.role) + '">' + p.role + '</div>' +
          '</div>' +
          '<div class="player-card-back">' +
            '<div class="player-back-name">' + p.name + ' · ' + p.number + '号</div>' +
            '<div class="player-back-bio">' + (p.bio || '场上位置：' + p.role) + '</div>' +
            '<button class="player-back-btn" onclick="event.stopPropagation(); openPlayerDetail(' + origIndex + ')">查看详情</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  });

  document.getElementById("rosterGrid").innerHTML = html;

  if (!playersOverride) {
    window.__players = players;
  }
}

/* === Fixtures === */
// Shared DOM render logic (used by both immediate and async paths)
function _renderFixturesDOM(results, upcoming, now) {
  var statusText = { win: "胜", draw: "平", loss: "负" };
  var statusClass = { win: "win", draw: "draw", loss: "loss" };

  var resultsEl = document.getElementById("resultsList");
  if (resultsEl) {
    var visible = results.slice(0, 3);
    if (visible.length) {
      resultsEl.innerHTML = visible.map(function (m) {
        var d = "";
        var hasG = m.scorers && m.scorers.length > 0;
        var hasA = m.assisters && m.assisters.length > 0;
        if (hasG || hasA) {
          d = '<div class="fixture-detail">';
          if (hasG) {
            d += '<span class="fixture-goals"><span class="fixture-goal-dot"></span>';
            d += m.scorers.map(function (p) { return p.name + '(' + p.num + ')' + (p.goals > 1 ? '×' + p.goals : ''); }).join("  ");
            d += '</span>';
          }
          if (hasA) {
            d += '<span class="fixture-assists"><span class="fixture-assist-badge">A</span>';
            d += m.assisters.map(function (p) { return p.name + '(' + p.num + ')' + (p.assists > 1 ? '×' + p.assists : ''); }).join("  ");
            d += '</span>';
          }
          d += '</div>';
        }
        var hasVoteOpen = m.vote_deadline && new Date(m.vote_deadline) > new Date();
        var extraBadge = '';
        if (hasVoteOpen && m.matchId) {
          extraBadge = '<span class="vote-open-btn" data-vote-match=\'' + JSON.stringify({id:m.matchId,home_team:m.home,away_team:m.away,date:m.date,venue:m.venue,time:m.time}).replace(/'/g,"&#39;") + '\'>MVP投票</span>';
        } else {
          extraBadge = '<span class="mvp-area" data-match-id="' + (m.matchId || '') + '" style="display:none"></span>';
        }
        return '<div class="fixture-item"><div class="fixture-item-main"><span class="fixture-date">' + m.date + '</span><span class="fixture-teams">' + m.home + ' vs ' + m.away + '</span><span class="fixture-score ' + statusClass[m.result] + '">' + m.score + ' ' + statusText[m.result] + '</span>' + extraBadge + '</div>' + d + '</div>';
      }).join("");
    } else {
      resultsEl.innerHTML = '<div class="fixture-empty">暂无比赛记录</div>';
    }
    var viewAll = document.getElementById("resultsViewAll");
    if (viewAll) {
      viewAll.style.display = "block";
      viewAll.innerHTML = '<a href="fixtures.html" class="view-all-link">查看全部战绩（' + results.length + ' 场） →</a>';
    }
  }

  var upcomingEl = document.getElementById("upcomingList");
  if (upcomingEl) {
    var filtered = upcoming.filter(function (m) {
      if (!m || !m.date) return false;
      var t = new Date(m.date.replace(/\./g, "-") + "T" + (m.time || "14:40") + ":00");
      if (isNaN(t.getTime())) return false;
      return now < new Date(t.getTime() + MATCH_DURATION_HOURS * 60 * 60 * 1000);
    });
    if (filtered.length === 0) {
      upcomingEl.innerHTML = '<div class="fixture-empty">暂无即将开赛的比赛</div>';
    } else {
      upcomingEl.innerHTML = filtered.slice(0, 3).map(function (m) {
        var b = m.jersey ? '<span class="fixture-jersey" style="background:' + m.jerseyColor + ';color:#fff">' + m.jersey + '</span>' : "";
        return '<div class="fixture-item"><div class="fixture-item-main"><span class="fixture-date">' + m.date + '</span><span class="fixture-teams">' + m.home + ' vs ' + m.away + ' ' + b + '</span></div><div class="fixture-meta">' + (m.time || '') + ' · ' + (m.venue || '') + '</div></div>';
      }).join("");
    }
    window.__upcoming = filtered;
  }
}

async function renderFixtures() {
  var staticData = window.__fixturesData || { results: [], upcoming: [] };

  // === IMMEDIATE: render from cache/static (sync, no network) ===
  try {
    var cached = null;
    try { cached = JSON.parse(localStorage.getItem('jrsf_fixtures_cache')); } catch (e) {}
    var src = (cached && ((cached.results && cached.results.length) || (cached.upcoming && cached.upcoming.length))) ? cached : staticData;
    var results = (src.results || []).slice();
    var upcoming = (src.upcoming || []).slice();
    _renderFixturesDOM(results, upcoming, new Date());
    startCountdown();
  } catch (e) {
    // Fallback: render empty fixtures on any error
    var el1 = document.getElementById('resultsList');
    if (el1) el1.innerHTML = '<div class="fixture-empty">暂无比赛记录</div>';
    var el2 = document.getElementById('upcomingList');
    if (el2) el2.innerHTML = '<div class="fixture-empty">暂无即将开赛的比赛</div>';
  }

  // === ASYNC: fetch from API and update ===
  var apiResults = [], apiMatches = [];
  try {
    var both = await Promise.all([
      API.getResults().catch(function () { return []; }),
      API.getMatches().catch(function () { return []; })
    ]);
    apiResults = both[0];
    apiMatches = both[1];
  } catch (e) { /* 降级 */ }

  // --- 合并赛果 ---
  if (apiResults.length) {
    var apiMap = new Map();
    apiResults.forEach(function (m) {
      var score = m.home_score + ':' + m.away_score;
      var scorers = (m.scorers || []).map(function (s) { return { name: s.name, num: s.number || s.num, goals: s.goals || 1 }; });
      var assisters = (m.assisters || []).map(function (s) { return { name: s.name, num: s.number || s.num, assists: s.assists || 1 }; });
      var key = m.date.replace(/-/g, '.') + '|' + m.away_team;
      apiMap.set(key, {
        date: m.date.replace(/-/g, '.'),
        home: m.home_team || '今日说法',
        away: m.away_team,
        score: score,
        result: m.result,
        scorers: scorers,
        assisters: assisters,
        matchId: m.id,
        vote_deadline: m.vote_deadline,
        time: m.time,
        venue: m.venue
      });
    });
    results = results.filter(function (r) { return !apiMap.has(r.date + '|' + r.away); });
    var extra = [];
    apiMap.forEach(function (v, k) {
      var exists = staticData.results.some(function (r) { return (r.date + '|' + r.away) === k; });
      if (exists) { results.unshift(v); } else { extra.push(v); }
    });
    results = extra.reverse().concat(results);
    results.sort(function (a, b) { return new Date(b.date.replace(/\./g, '-')) - new Date(a.date.replace(/\./g, '-')); });
  }

  // --- 合并即将开赛（从 API 中没有比分的比赛提取） ---
  var now = new Date();
  apiMatches.forEach(function (m) {
    if (m.home_score != null) return; // 有比分 = 已结束，跳过
    var dateStr = (m.date || '').replace(/-/g, '.');
    var exists = upcoming.some(function (u) {
      return u.date === dateStr && u.away === m.away_team;
    });
    if (exists) return;
    var t = new Date((m.date || '') + 'T' + (m.time || '14:40') + ':00');
    if (now >= new Date(t.getTime() + MATCH_DURATION_HOURS * 60 * 60 * 1000)) return; // 已结束
    upcoming.push({
      date: dateStr,
      home: m.home_team || '今日说法',
      away: m.away_team,
      time: m.time || '14:40',
      venue: m.venue || '',
      jersey: m.jersey || '',
      jerseyColor: m.jersey_color || '',
      _apiMatch: m
    });
  });
  upcoming.sort(function (a, b) {
    return new Date(a.date.replace(/\./g, '-')) - new Date(b.date.replace(/\./g, '-'));
  });

  // Cache for instant display on next refresh
  try { localStorage.setItem('jrsf_fixtures_cache', JSON.stringify({ results: results, upcoming: upcoming })); } catch (e) {}

  // Re-render with fresh API data
  _renderFixturesDOM(results, upcoming, new Date());
  startCountdown();
}

/* === MVP 投票入口（委托点击） === */
document.addEventListener('click', function (e) {
  var btn = e.target.closest('.vote-open-btn');
  if (!btn) return;
  var match;
  try { match = JSON.parse(btn.getAttribute('data-vote-match')); } catch (_) { return; }
  ensureOpenVotePanel(match);
});

/* === MVP 结果展示 === */
async function loadMVPs(prefetchedVotes) {
  var allVotes = prefetchedVotes || window.__allVotes || [];
  // 没有预取数据时自己拉取
  if (!prefetchedVotes && !window.__allVotes) {
    try { allVotes = await API.getVotes(); } catch (e) { return; }
  }
  // 按 match_id 分组
  var byMatch = {};
  allVotes.forEach(function (v) {
    var mid = String(v.match_id);
    if (!byMatch[mid]) byMatch[mid] = [];
    byMatch[mid].push(v);
  });

  var items = document.querySelectorAll('#resultsList .mvp-area');
  for (var i = 0; i < items.length; i++) {
    var el = items[i];
    var matchId = el.getAttribute('data-match-id');
    if (!matchId) continue;
    var votes = byMatch[matchId];
    if (!votes || !votes.length) continue;
    var points = {};
    votes.forEach(function (v) {
      var pts = v.rank === 1 ? 3 : v.rank === 2 ? 2 : 1;
      points[v.candidate_name] = (points[v.candidate_name] || 0) + pts;
    });
    var sorted = Object.entries(points).sort(function (a, b) { return b[1] - a[1]; });
    if (!sorted.length) continue;
    var mvpName = sorted[0][0];
    // 构建前三名悬停提示（仅公布前三名票数）
    var topThree = sorted.slice(0, 3).map(function (entry, idx) {
      var medal = idx === 0 ? '金' : idx === 1 ? '银' : '铜';
      return medal + ':' + entry[0] + '(' + entry[1] + '分)';
    }).join('  ');
    el.style.display = '';
    el.outerHTML = '<span class="mvp-badge mvp-badge--result" title="' + topThree.replace(/"/g, '&quot;') + '"><span class="mvp-crown">★</span> MVP: ' + mvpName + '</span>';
  }
}

/* === Registration count refresh (for real-time update after close) === */
async function refreshMainRegButton(matchId) {
  if (!matchId) return;
  try {
    var list = await API.getRegistrations(matchId);
    var n = list.filter(function (r) { return r.status === 'confirmed'; }).length;
    var btn = document.querySelector('[data-reg-match="' + matchId + '"]');
    if (btn) btn.innerHTML = '<span class="reg-icon"></span>✋ 立即报名 (' + n + '/13)';
  } catch (e) { /* 静默降级 */ }
}
window.refreshMainRegButton = refreshMainRegButton;

/* === Flush scroll-reveal: instantly show in-viewport elements === */
function flushScrollReveal() {
  if (REDUCED_MOTION) return;
  var targets = document.querySelectorAll('.player-card-front, .stat-item, .fixture-item');
  targets.forEach(function (el) {
    var rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0 && el.style.opacity === '0') {
      el.style.transition = 'none';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          el.style.transition = '';
        });
      });
    }
  });
}
window.flushScrollReveal = flushScrollReveal;

/* === Lightbox (shared) === */
function initLightbox() {
  const lb = document.getElementById("lightbox");
  const close = document.getElementById("lightboxClose");
  close.addEventListener("click", () => lb.classList.remove("open"));
  closeOnBackdrop(lb, () => lb.classList.remove("open"));
  registerEscape(lb, () => lb.classList.remove("open"));
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

/* === Hero Particles (ambient gold dust) === */
function initHeroParticles() {
  const canvas = document.getElementById("heroParticles");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const hero = canvas.parentElement;
  const dpr = window.devicePixelRatio || 1;

  const particles = [];
  const count = 22;

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
  registerVisibility(hero, function(isVisible) {
    if (isVisible) {
      if (paused) { paused = false; draw(); }
    } else {
      paused = true;
    }
  });
}

/* === Full-Page Flag Drift Background === */
function initPageFlags() {
  if (REDUCED_MOTION) return;
  var container = document.getElementById('pageFlags');
  if (!container) return;

  var FLAG_SIZE = 42;
  var FLAG_COUNT = 22;
  var flagCodes = ['cn','br','ar','de','fr','es','it','nl','pt','jp','kr','us','mx','ca','hr','uy','co','sn','ma','gh','ng','be','dk','ch','rs','se','pl','au','sa','ir'];
  var flagImgs = {};
  var flags = [];
  var w = window.innerWidth;
  var h = window.innerHeight;

  // Load SVG cartoon flags
  var loadedCount = 0;
  flagCodes.forEach(function (code) {
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () {
      flagImgs[code] = img;
      loadedCount++;
      if (loadedCount >= 3 && flags.length === 0) spawnFlags();
    };
    img.onerror = function () { loadedCount++; };
    img.src = 'images/flags/' + code + '.png';
  });

  function createFlagEl(code) {
    var img = flagImgs[code];
    var el = document.createElement('img');
    el.src = img.src;
    el.crossOrigin = 'anonymous';
    el.alt = '';
    el.className = 'loaded';
    el.width = FLAG_SIZE;
    el.height = Math.round(FLAG_SIZE * 0.75);
    container.appendChild(el);
    return el;
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function spawnFlags() {
    var loaded = Object.keys(flagImgs);
    var pool = shuffle(loaded.slice());
    while (flags.length < FLAG_COUNT) {
      var code = pool[flags.length % pool.length];
      var el = createFlagEl(code);
      flags.push({
        el: el,
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.35 - 0.08,
        rot: (Math.random() - 0.5) * 20,
        rotV: (Math.random() - 0.5) * 0.15,
        alpha: 0.3 + Math.random() * 0.2,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  var animId;
  var paused = false;

  function update() {
    if (paused) return;
    // Lazy spawn as images load
    if (flags.length < FLAG_COUNT && Object.keys(flagImgs).length >= 3) {
      spawnFlags();
    }

    // Update positions
    flags.forEach(function (f) {
      f.x += f.vx;
      f.y += f.vy;
      f.rot += f.rotV;
      f.phase += 0.012;
    });

    // Collision detection
    var minDist = FLAG_SIZE * 0.9;
    for (var i = 0; i < flags.length; i++) {
      for (var j = i + 1; j < flags.length; j++) {
        var a = flags[i], b = flags[j];
        var dx = b.x - a.x, dy = b.y - a.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist && dist > 0.01) {
          var nx = dx / dist, ny = dy / dist;
          var overlap = minDist - dist;
          a.x -= nx * overlap * 0.5;
          a.y -= ny * overlap * 0.5;
          b.x += nx * overlap * 0.5;
          b.y += ny * overlap * 0.5;
          // Swap velocities along collision axis
          var relVx = a.vx - b.vx, relVy = a.vy - b.vy;
          var relVn = relVx * nx + relVy * ny;
          if (relVn > 0) {
            a.vx -= relVn * nx;
            a.vy -= relVn * ny;
            b.vx += relVn * nx;
            b.vy += relVn * ny;
          }
        }
      }
    }

    // Apply bounds + render
    var margin = FLAG_SIZE + 20;
    flags.forEach(function (f) {
      var alpha = f.alpha + 0.08 * Math.sin(f.phase);
      if (f.x > w + margin) f.x = -margin;
      if (f.x < -margin) f.x = w + margin;
      if (f.y > h + margin) f.y = -margin;
      if (f.y < -margin) f.y = h + margin;

      f.el.style.transform = 'translate(' + f.x.toFixed(1) + 'px,' + f.y.toFixed(1) + 'px) rotate(' + f.rot.toFixed(1) + 'deg)';
      f.el.style.opacity = alpha;
    });

    animId = requestAnimationFrame(update);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      paused = true;
      if (animId) { cancelAnimationFrame(animId); animId = null; }
    } else {
      paused = false;
      animId = requestAnimationFrame(update);
    }
  });

  function onResize() {
    w = window.innerWidth;
    h = window.innerHeight;
  }
  window.addEventListener('resize', rafThrottle(onResize));

  animId = requestAnimationFrame(update);
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

  track.innerHTML = slides.map(function (s, i) {
    var displayUrl = s._thumbUrl || s._imageUrl;
    return '<div class="carousel-slide" data-index="' + i + '"' + (s._imageUrl ? ' data-full="' + s._imageUrl + '"' : '') + '>' +
      (displayUrl
        ? '<img class="carousel-slide-img" src="' + (i === 0 ? displayUrl : 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7') + '" data-src="' + (i === 0 ? '' : displayUrl) + '" alt="' + s.label + '" decoding="async"' + (i === 0 ? ' fetchpriority="high"' : ' loading="lazy"') + ' onerror="this.parentElement.innerHTML=\'<span class=\\\'carousel-slide-placeholder\\\'>\'+this.alt+\'</span>\'">'
        : '<span class="carousel-slide-placeholder">' + s.label + '</span>') +
    '</div>';
  }).join("");

	// 延迟加载非首张轮播图：首屏只加载第1张，其余在切换时按需加载
	var lazyLoaded = {};
	function loadCarouselSlide(idx) {
		if (lazyLoaded[idx]) return;
		var img = track.querySelector('.carousel-slide[data-index="' + idx + '"] .carousel-slide-img');
		if (img && img.dataset.src) {
			img.src = img.dataset.src;
			img.removeAttribute('data-src');
			lazyLoaded[idx] = true;
		}
	}
	// 首屏后立即预加载第2张
	if (slides.length > 1) setTimeout(function () { loadCarouselSlide(1); }, 100);

  dots.innerHTML = slides.map((_, i) =>
    `<button class="carousel-dot${i === 0 ? " active" : ""}" data-index="${i}" aria-label="第${i + 1}张"></button>`
  ).join("");

  function goTo(index) {
    current = ((index % slides.length) + slides.length) % slides.length;
    track.style.transform = `translateX(-${current * 100}%)`;
    dots.querySelectorAll(".carousel-dot").forEach((d, i) => {
      d.classList.toggle("active", i === current);
    });
    // 按需加载当前及下一张
    loadCarouselSlide(current);
    loadCarouselSlide((current + 1) % slides.length);
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

  // Pause when not visible (节约 CPU)
  registerVisibility(carousel, function(isVisible) {
    if (isVisible) { startTimer(); } else { stopTimer(); }
  });
}

/* === Tactics Board === */
function initTacticsBoard() {
  var canvas = document.getElementById("tacticsCanvas");
  if (!canvas) return;
  var board = canvas.parentElement;
  var dpr = window.devicePixelRatio || 1;

  var FORMATION_331 = [
    { row: 0, col: 0, rows: 4, cols: 1, label: "CK" },
    { row: 1, col: 0, rows: 4, cols: 3, label: "DF" },
    { row: 1, col: 1, rows: 4, cols: 3, label: "DF" },
    { row: 1, col: 2, rows: 4, cols: 3, label: "DF" },
    { row: 2, col: 0, rows: 4, cols: 3, label: "MF" },
    { row: 2, col: 1, rows: 4, cols: 3, label: "MF" },
    { row: 2, col: 2, rows: 4, cols: 3, label: "MF" },
    { row: 3, col: 0, rows: 4, cols: 1, label: "FW" },
  ];

  var posColors = {
    "CK": "#fb923c",
    "DF": "#60a5fa",
    "MF": "#4ade80",
    "FW": "#f87171"
  };

  function draw() {
    var w = board.clientWidth;
    var h = w * 0.7;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    canvas.width = w * dpr;
    canvas.height = h * dpr;

    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    var pad = w * 0.035;
    var px = pad, py = pad;
    var pw = w - pad * 2, ph = h - pad * 2;
    var halfX = px + pw / 2;
    var gold = "#d4a843";

    var pitchGrad = ctx.createLinearGradient(0, py, 0, py + ph);
    pitchGrad.addColorStop(0, "#1a5c1a");
    pitchGrad.addColorStop(0.5, "#226622");
    pitchGrad.addColorStop(1, "#1a5c1a");
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 8);
    ctx.clip();
    ctx.fillStyle = pitchGrad;
    ctx.fillRect(px, py, pw, ph);

    var stripes = 18;
    var stripeH = ph / stripes;
    for (var i = 0; i < stripes; i++) {
      ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.015)" : "rgba(0,0,0,0.02)";
      ctx.fillRect(px, py + i * stripeH, pw, stripeH);
    }
    ctx.restore();

    ctx.strokeStyle = "rgba(212,168,67,0.4)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 8);
    ctx.stroke();

    ctx.strokeStyle = "rgba(212,168,67,0.12)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.roundRect(px + 4, py + 4, pw - 8, ph - 8, 6);
    ctx.stroke();

    var lineColor = "rgba(255,255,255,0.16)";

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(px, py + ph);
    ctx.lineTo(px + pw, py + ph);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(halfX, py + ph, ph * 0.12, Math.PI, 0);
    ctx.stroke();

    ctx.fillStyle = gold;
    ctx.beginPath();
    ctx.arc(halfX, py + ph, 2.5, 0, Math.PI * 2);
    ctx.fill();

    var paW = pw * 0.38, paH = ph * 0.22;
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(halfX - paW / 2, py, paW, paH);

    ctx.strokeRect(halfX - pw * 0.09, py, pw * 0.18, ph * 0.09);

    ctx.fillStyle = lineColor;
    ctx.beginPath();
    ctx.arc(halfX, py + paH - ph * 0.06, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(halfX, py + paH, ph * 0.07, Math.PI, 0);
    ctx.stroke();

    var cr = pw * 0.022;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(px, py, cr, 0, Math.PI / 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(px + pw, py, cr, Math.PI / 2, Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.arc(px + pw, py + ph, cr, Math.PI, Math.PI * 1.5); ctx.stroke();
    ctx.beginPath(); ctx.arc(px, py + ph, cr, Math.PI * 1.5, Math.PI * 2); ctx.stroke();

    var goalW = pw * 0.15;
    var goalH = ph * 0.025;
    ctx.strokeStyle = "rgba(212,168,67,0.5)";
    ctx.lineWidth = 2;
    ctx.strokeRect(halfX - goalW / 2, py - 1, goalW, goalH);
    ctx.fillStyle = "rgba(212,168,67,0.06)";
    ctx.fillRect(halfX - goalW / 2, py, goalW, goalH);

    var marginX = pw * 0.12;
    var fieldTop = py + ph * 0.1;
    var fieldHeight = ph * 0.73;
    var dotR = Math.max(14, pw * 0.035);

    FORMATION_331.forEach(function (pos, i) {
      var cx = pos.cols === 1
        ? halfX
        : px + marginX + (pos.col / (pos.cols - 1)) * (pw - marginX * 2);
      var cy = fieldTop + (pos.row / (pos.rows - 1)) * fieldHeight;
      var color = posColors[pos.label] || gold;

      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = "rgba(13,13,13,0.85)";
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.arc(cx, cy, dotR - 4, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.font = "bold " + Math.max(12, dotR * 0.85) + "px \"Impact\", \"Arial Black\", sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(pos.label, cx, cy);

    });
  }

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
    content.innerHTML = albums.map(a => {
      var photosHTML = '';
      if (a._hasGroups) {
        // 按 _groupLabel 分组渲染，组间插入标题行
        var lastGroup = '';
        a.photos.forEach(function (p, i) {
          if (p._groupLabel && p._groupLabel !== lastGroup) {
	            lastGroup = p._groupLabel;
 	            lastGroupMeta = p._groupMeta || '';
 	            photosHTML += '<div class="gallery-subgroup-title">' + lastGroup + '</div>' + (lastGroupMeta ? '<div class="gallery-subgroup-meta">' + lastGroupMeta + '</div>' : '') ;
          }
          photosHTML += '<div class="gallery-photo" data-album="' + a.title + '" data-idx="' + i + '" data-full="' + (p._imageUrl || '') + '">' +
            (p._thumbUrl || p._imageUrl
              ? '<img src="' + (p._thumbUrl || p._imageUrl) + '" alt="' + p.label + '" loading="lazy" decoding="async">'
              : '<svg class="gallery-photo-camera" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="5" width="20" height="15" rx="2"/><circle cx="12" cy="13" r="3"/><path d="M8 5V3h8v2"/></svg>') +
            '</div>';
        });
      } else {
        photosHTML = a.photos.map((p, i) => `
          <div class="gallery-photo" data-album="${a.title}" data-idx="${i}" data-full="${p._imageUrl || ''}">
            ${p._thumbUrl || p._imageUrl
              ? `<img src="${p._thumbUrl || p._imageUrl}" alt="${p.label}" loading="lazy" decoding="async">`
              : `<svg class="gallery-photo-camera" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="5" width="20" height="15" rx="2"/><circle cx="12" cy="13" r="3"/><path d="M8 5V3h8v2"/></svg>`}
          </div>
        `).join("");
      }
      return '<div class="gallery-album">' +
        '<div class="gallery-album-header">' +
          '<div class="gallery-album-title">' + a.title + '</div>' +
          (a.date ? '<div class="gallery-album-date">' + a.date + '</div>' : '') +
        '</div>' +
        '<div class="gallery-album-grid">' + photosHTML + '</div>' +
      '</div>';
    }).join("");
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
  registerEscape(overlay, close);

  // Photo click → lightbox
  content.addEventListener("click", (e) => {
    const photo = e.target.closest(".gallery-photo");
    if (!photo) return;
    var fullSrc = photo.dataset.full;
    if (fullSrc) {
      openLightbox(fullSrc);
      return;
    }
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
  registerEscape(overlay, closePlayerDetail);
}

function openPlayerDetail(index) {
  var p = window.__players[index];
  if (!p || !__pd) return;
  var el = __pd;

  el.avatar.className = "player-detail-avatar";
  if (p._avatarUrl) {
    el.avatar.innerHTML = '<img src="' + p._avatarUrl + '" alt="' + p.name + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%">';
  } else {
    el.avatar.innerHTML = '<span class="player-detail-avatar-initial">' + p.name[0] + '</span>';
  }

  el.number.textContent = p.number;
  el.name.textContent = p.name;
  el.role.textContent = p.role;
  el.role.className = 'player-detail-role ' + getPositionGroup(p.role);
  el.bio.textContent = p.bio;

  var mvpCount = (window.__mvpCounts && window.__mvpCounts[p.name]) || 0;
  var g = p._goals || 0, a = p._assists || 0, apps = p._apps || 0, lv = p._leaves || 0;
  el.info.innerHTML =
    '<div class="player-info-item"><div class="player-info-value">' + (p.age != null ? p.age : '—') + '</div><div class="player-info-label">年龄</div></div>' +
    '<div class="player-info-item"><div class="player-info-value">' + p.number + '</div><div class="player-info-label">号码</div></div>' +
    '<div class="player-info-item"><div class="player-info-value">' + p.joinYear + '</div><div class="player-info-label">入队</div></div>' +
    '<div class="player-info-item"><div class="player-info-value mvp-count">' + mvpCount + '</div><div class="player-info-label">MVP</div></div>';

  el.strengths.innerHTML = p.strengths.map(function (s) { return '<span class="player-strength-tag">' + s + '</span>'; }).join('');

  // Stats summary row (17-B)
  var statsRow = document.getElementById('playerStatsRow');
  if (statsRow) {
    if (g + a + apps > 0) {
      statsRow.innerHTML =
        '<div class="player-stat-item"><div class="player-stat-num">' + g + '</div><div class="player-stat-label">⚽进球</div></div>' +
        '<div class="player-stat-item"><div class="player-stat-num">' + a + '</div><div class="player-stat-label">🅰助攻</div></div>' +
        '<div class="player-stat-item"><div class="player-stat-num">' + mvpCount + '</div><div class="player-stat-label">⭐MVP</div></div>' +
        '<div class="player-stat-item"><div class="player-stat-num">' + apps + '</div><div class="player-stat-label">👟出场</div></div>' +
        (lv > 0 ? '<div class="player-stat-item"><div class="player-stat-num" style="color:#c0392b">' + lv + '</div><div class="player-stat-label">😴请假</div></div>' : '');
    } else {
      statsRow.innerHTML = '<div style="color:var(--text-faint);font-size:0.78rem;padding:8px">暂无数据</div>';
    }
  }

  // Timeline (17-A) — load async
  var timeline = document.getElementById('playerTimeline');
  if (timeline) {
    timeline.innerHTML = '<div style="color:var(--text-faint);font-size:0.72rem;text-align:center;padding:8px">加载中...</div>';
    API.getPlayerHistory(p.name).then(function (events) {
      if (!events.length) {
        timeline.innerHTML = '<div style="color:var(--text-faint);font-size:0.72rem;text-align:center;padding:8px">暂无记录</div>';
        return;
      }
      timeline.innerHTML = events.slice(0, 12).map(function (e) {
        return '<div class="player-timeline-event"><div class="player-timeline-dot ' + e.type + '"></div><span class="player-timeline-date">' + e.date + '</span><span class="player-timeline-text">' + e.text + '</span><span class="player-timeline-detail">' + (e.detail || '') + '</span></div>';
      }).join('');
    }).catch(function () {
      timeline.innerHTML = '<div style="color:var(--text-faint);font-size:0.72rem;text-align:center;padding:8px">加载失败</div>';
    });
  }

  // Transfer joke button (20-D)
  var tfBtn = document.getElementById('playerTransferBtn');
  if (tfBtn) {
    var val = p._value ? '¥' + (p._value / 1000).toFixed(1) + 'k' : '暂无估价';
    tfBtn.style.display = 'block';
    tfBtn.textContent = '💰 当前身价 ' + val + ' — 挂牌出售';
    tfBtn.onclick = function () {
      showToast('转会失败：队长拒绝放人 🤚', 'error');
    };
  }

  el.overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
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
  targets.forEach((el, i) => {
    el.style.opacity = "0";
    el.style.transform = "translateY(24px)";
    el.style.transition = "opacity 0.3s ease, transform 0.3s ease";
    el.style.transitionDelay = (i % TIMING.REVEAL_GROUP) * TIMING.REVEAL_STAGGER + "s";
    registerVisibility(el, function(isVisible) {
      if (isVisible) {
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
      }
    });
  });
}

/* === Count-Up Animation === */
function initCountUp() {
  const targets = document.querySelectorAll(".stat-number");
  if (!targets.length) return;

  targets.forEach(function(el) {
    var unreg = registerVisibility(el, function(isVisible) {
      if (!isVisible) return;
      var raw = el.textContent.trim();
      var match = raw.match(/^(\d+)(\+?)$/);
      if (!match) { unreg(); return; }
      var end = parseInt(match[1], 10);
      var suffix = match[2];
      if (REDUCED_MOTION) { el.textContent = end + suffix; unreg(); return; }
      var start = 0;
      var duration = TIMING.COUNTUP;
      var startTime = performance.now();

      function step(now) {
        var elapsed = now - startTime;
        var progress = Math.min(elapsed / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        var current = Math.floor(start + (end - start) * eased);
        el.textContent = current + suffix;
        if (progress < 1) {
          requestAnimationFrame(step);
        }
      }

      requestAnimationFrame(step);
      unreg();
    });
  });
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

function renderCountdownRegBtn(m) {
  var regEl = document.getElementById("countdownReg");
  if (!regEl) return;
  var match = m._apiMatch || m;

  // Clear previous reg countdown timer
  if (renderCountdownRegBtn._timerId) { clearInterval(renderCountdownRegBtn._timerId); renderCountdownRegBtn._timerId = null; }

  if (!match.id || !match.reg_open_at || !match.reg_close_at) {
    regEl.innerHTML = '';
    return;
  }

  var now = new Date();
  var regOpen = new Date(match.reg_open_at);
  var regClose = new Date(match.reg_close_at);

  function regTick() {
    var n = new Date();
    if (n >= regOpen) {
      // Transition to open state
      clearInterval(renderCountdownRegBtn._timerId);
      renderCountdownRegBtn._timerId = null;
      renderCountdownRegBtn(m);
      return;
    }

    var diff = regOpen - n;
    var days = Math.floor(diff / (1000 * 60 * 60 * 24));
    var hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    var minutes = Math.floor((diff / (1000 * 60)) % 60);
    var seconds = Math.floor((diff / 1000) % 60);

    var btn = regEl.querySelector('button');
    if (btn) {
      if (days > 0) {
        btn.innerHTML = '<span class="reg-icon"></span>距报名 ' + days + '天' + String(hours).padStart(2, '0') + '时' + String(minutes).padStart(2, '0') + '分' + String(seconds).padStart(2, '0') + '秒';
      } else {
        btn.innerHTML = '<span class="reg-icon"></span>距报名 ' + String(hours).padStart(2, '0') + '时' + String(minutes).padStart(2, '0') + '分' + String(seconds).padStart(2, '0') + '秒';
      }
    }
  }

  if (now < regOpen) {
    regEl.innerHTML = '<button class="countdown-reg-btn upcoming" data-reg-match="' + (match.id || '') + '" disabled><span class="reg-icon"></span>报名未开启</button>';
    regTick();
    renderCountdownRegBtn._timerId = setInterval(regTick, 1000);
    return;
  }

  if (now >= regOpen && now <= regClose) {
    regEl.innerHTML = '<button class="countdown-reg-btn open" data-reg-match="' + (match.id || '') + '"><span class="reg-icon"></span>✋ 立即报名</button>';
    regEl.querySelector('button').addEventListener('click', function () { ensureOpenRegPanel(match); });

    // 拉取报名人数
    if (match.id) {
      API.getRegistrations(match.id).then(function (list) {
        var n = list.filter(function (r) { return r.status === 'confirmed'; }).length;
        var btn = regEl.querySelector('button');
        if (btn) {
          btn.innerHTML = '<span class="reg-icon"></span>✋ 立即报名 (' + n + '/13)';
        }
        var twoHBefore = new Date(regClose.getTime() - 2 * 60 * 60 * 1000);
        if (now >= twoHBefore && n < 13) {
          var warnEl = document.createElement('div');
          warnEl.className = 'countdown-reg-warning';
          warnEl.textContent = '距截止不足2小时，仅' + n + '人报名';
          regEl.appendChild(warnEl);
        }
      }).catch(function () {});
    }
    return;
  }

  // 已截止
  regEl.innerHTML = '<button class="countdown-reg-btn closed" data-reg-match="' + (match.id || '') + '" disabled><span class="reg-icon"></span>报名已截止</button>';
}

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
    timer.innerHTML = '<span class="countdown-ended">等待新赛程</span>';
    var regEl0 = document.getElementById("countdownReg");
    if (regEl0) regEl0.innerHTML = '';
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
    const jerseyHTML = m.jersey ? '<span class="countdown-jersey" style="background:' + m.jerseyColor + ';color:#fff">' + m.jersey + '球衣</span>' : "";
    matchEl.innerHTML = '<div class="countdown-teams"><span>' + m.home + '</span><span class="countdown-vs">vs</span><span>' + m.away + '</span></div><div class="countdown-meta">' + m.date.replace(/-/g, '.').replace(/\./, "年").replace(/\./, "月") + '日 ' + wd + ' · ' + timeStr + '</div><div class="countdown-venue">' + (m.venue || '') + ' ' + jerseyHTML + '</div>';
  }

  // --- 渲染倒计时报名按钮 ---
  renderCountdownRegBtn(m);

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
  if (startCountdown._unregVisibility) { startCountdown._unregVisibility(); startCountdown._unregVisibility = null; }

  tick();
  startCountdown._timerId = setInterval(tick, 1000);

  const bar = document.getElementById("countdownBar");
  if (bar) {
    startCountdown._unregVisibility = registerVisibility(bar, function(isVisible) {
      if (isVisible) {
        if (!startCountdown._timerId) { tick(); startCountdown._timerId = setInterval(tick, 1000); }
      } else {
        clearInterval(startCountdown._timerId);
        startCountdown._timerId = null;
      }
    });
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

