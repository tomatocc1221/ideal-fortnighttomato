/* ========================================
   今日说法足球俱乐部 — 交互脚本
   ======================================== */

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
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("jinrishuofa", 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("playerAvatars")) {
        db.createObjectStore("playerAvatars", { keyPath: "playerNumber" });
      }
      if (!db.objectStoreNames.contains("carouselPhotos")) {
        db.createObjectStore("carouselPhotos", { keyPath: "slideIndex" });
      }
      if (!db.objectStoreNames.contains("galleryPhotos")) {
        db.createObjectStore("galleryPhotos", { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}


function loadImage(storeName, key) {
  return openDB().then(db => {
    return new Promise((resolve) => {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => {
        db.close();
        if (req.result && req.result.data) {
          const url = URL.createObjectURL(req.result.data);
          resolve(url);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => { db.close(); resolve(null); };
    });
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
  return [
    {
      title: "今日说法 vs 老男孩FC",
      date: "2024.12.08 · 溉澜溪体育公园",
      photos: [
        { icon: "📸", label: "赛前合影" },
        { icon: "🏃", label: "赛前热身" },
        { icon: "⚽", label: "开球" },
        { icon: "🎯", label: "精彩射门" },
        { icon: "🔥", label: "庆祝进球" },
        { icon: "🤝", label: "赛后握手" },
      ]
    },
    {
      title: "今日说法 vs 雄狮联盟",
      date: "2024.10.13 · 溉澜溪体育公园",
      photos: [
        { icon: "📸", label: "全队合影" },
        { icon: "🎯", label: "任意球" },
        { icon: "⚽", label: "进球瞬间" },
        { icon: "🏆", label: "赛后总结" },
      ]
    },
    {
      title: "队内训练",
      date: "2024.11.03 · 溉澜溪体育公园",
      photos: [
        { icon: "🏃", label: "体能训练" },
        { icon: "⚽", label: "分组对抗" },
        { icon: "🎯", label: "射门练习" },
        { icon: "🧤", label: "门将特训" },
        { icon: "📋", label: "战术讲解" },
      ]
    },
  ];
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

  // Load images from IndexedDB in parallel
  const playerImagePromises = mergedPlayers.map(p =>
    loadImage("playerAvatars", p.number).then(url => { if (url) p._avatarUrl = url; })
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

  await Promise.all([
    ...playerImagePromises,
    ...slideImagePromises,
    ...albumImagePromises,
  ]);

  // Render with merged data
  renderRoster(mergedPlayers);
  renderFixtures();
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
function renderFixtures() {
  const data = window.__fixturesData || { results: [], upcoming: [] };
  const results = data.results || [];
  const upcoming = data.upcoming || [];

  const statusText = { win: "胜", draw: "平", loss: "负" };
  const statusClass = { win: "win", draw: "draw", loss: "loss" };

  const resultsEl = document.getElementById("resultsList");
  if (!resultsEl) return;

  const MAX_VISIBLE = 5;
  const visibleResults = results.slice(0, MAX_VISIBLE);
  const hiddenResults = results.slice(MAX_VISIBLE);

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

  let html = visibleResults.map(renderItem).join("");

  if (hiddenResults.length > 0) {
    html += `
    <div class="results-hidden" id="resultsHidden" style="display:none;">
      ${hiddenResults.map(renderItem).join("")}
    </div>
    <button class="results-toggle" id="resultsToggle">
      查看全部战绩（${results.length} 场）
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
    </button>`;
  }

  resultsEl.innerHTML = html;

  if (hiddenResults.length > 0) {
    const toggle = document.getElementById("resultsToggle");
    const hidden = document.getElementById("resultsHidden");
    const arrow = toggle.querySelector("svg");
    toggle.addEventListener("click", () => {
      const isOpen = hidden.style.display !== "none";
      hidden.style.display = isOpen ? "none" : "block";
      toggle.innerHTML = isOpen
        ? `查看全部战绩（${results.length} 场） <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>`
        : `收起战绩 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transform:rotate(180deg)"><path d="M6 9l6 6 6-6"/></svg>`;
    });
  }

  window.__upcoming = upcoming;

  const upcomingEl = document.getElementById("upcomingList");
  if (upcomingEl) {
    upcomingEl.innerHTML = upcoming.map(m => {
      const jerseyBadge = m.jersey ? `<span class="fixture-jersey" style="background:${m.jerseyColor};color:#fff">${m.jersey}色</span>` : "";
      return `
    <div class="fixture-item">
      <div class="fixture-item-main">
        <span class="fixture-date">${m.date}</span>
        <span class="fixture-teams">${m.home} vs ${m.away} ${jerseyBadge}</span>
        <span class="fixture-upcoming">即将开赛</span>
      </div>
      <div class="fixture-meta">${m.time || ""} · ${m.venue || ""}</div>
    </div>
    `}).join("");
  }

  startCountdown();
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
  if (typeof content === "string" && (content.startsWith("blob:") || content.startsWith("data:image"))) {
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

  track.innerHTML = slides.map((s, i) => `
    <div class="carousel-slide" data-index="${i}">
      ${s._imageUrl
        ? `<img class="carousel-slide-img" src="${s._imageUrl}" alt="${s.label}">`
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
    timer = setInterval(nextSlide, 3500);
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
      openLightbox(
        `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
          <rect fill="#1a1a1a" width="800" height="500"/>
          <text fill="#cfae5a" font-size="28" text-anchor="middle" x="400" y="270" font-weight="600">今日说法</text>
          <text fill="#888" font-size="18" text-anchor="middle" x="400" y="310">${s.label}</text>
        </svg>`
      );
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

  function getPlayerName(number) {
    const map = getPlayerMap();
    if (!map) return "";
    const p = map.get(number);
    return p ? p.name : "";
  }

  function getPlayerRole(number) {
    const map = getPlayerMap();
    if (!map) return "";
    const p = map.get(number);
    return p ? p.role : "";
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
      const role = getPlayerRole(p.number);
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
      const playerName = getPlayerName(p.number);
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
                ? `<img src="${p._imageUrl}" alt="${p.label}">`
                : `<svg class="gallery-photo-camera" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="5" width="20" height="15" rx="2"/><circle cx="12" cy="13" r="3"/><path d="M8 5V3h8v2"/></svg>`}
              <span class="gallery-photo-label">${p.label}</span>
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
      openLightbox(
        `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
          <rect fill="#1a1a1a" width="800" height="600"/>
          <text fill="#cfae5a" font-size="22" text-anchor="middle" x="400" y="280" font-weight="600">${album}</text>
          <text fill="#888" font-size="16" text-anchor="middle" x="400" y="315">${p.label}</text>
        </svg>`
      );
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

  document.querySelectorAll(
    ".player-card-front, .stat-item, .fixture-item, .carousel-slide"
  ).forEach((el, i) => {
    el.style.opacity = "0";
    el.style.transform = "translateY(24px)";
    el.style.transition = "opacity 0.5s ease, transform 0.5s ease";
    el.style.transitionDelay = (i % 5) * 0.07 + "s";
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
      let start = 0;
      const duration = 1200;
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
function startCountdown() {
  const upcoming = window.__upcoming;
  if (!upcoming || !upcoming.length) return;

  const m = upcoming[0];
  if (!m || !m.date) return;
  const timeStr = m.time || "14:40";
  const dateStr = m.date.replace(/\./g, "-") + "T" + timeStr + ":00";
  const targetDate = new Date(dateStr);
  if (isNaN(targetDate.getTime())) return;

  const timer = document.getElementById("countdownTimer");
  const matchEl = document.getElementById("countdownMatch");
  if (!timer) return;

  if (matchEl) {
    const d = new Date(targetDate);
    const weekdays = ["周日","周一","周二","周三","周四","周五","周六"];
    const wd = weekdays[d.getDay()];
    const jerseyHTML = m.jersey ? `<span class="countdown-jersey" style="background:${m.jerseyColor};color:#fff">${m.jersey}色球衣</span>` : "";
    matchEl.innerHTML = `
      <div class="countdown-teams"><span>${m.home}</span><span class="countdown-vs">vs</span><span>${m.away}</span></div>
      <div class="countdown-meta">${m.date.replace(/\./, "年").replace(/\./, "月")}日 ${wd} · ${timeStr}</div>
      <div class="countdown-venue">${m.venue || ""} ${jerseyHTML}</div>
    `;
  }

  function tick() {
    const now = new Date();
    const diff = targetDate - now;

    if (diff <= 0) {
      timer.innerHTML = `<span class="countdown-ended">比赛进行中</span>`;
      return;
    }

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

  tick();
  let countdownId = setInterval(tick, 1000);

  const bar = document.getElementById("countdownBar");
  if (bar) {
    new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        if (!countdownId) { tick(); countdownId = setInterval(tick, 1000); }
      } else {
        clearInterval(countdownId);
        countdownId = null;
      }
    }, { threshold: 0 }).observe(bar);
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

