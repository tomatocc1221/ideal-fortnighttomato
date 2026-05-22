/* ========================================
   今日说法足球俱乐部 — 交互脚本
   ======================================== */

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

function saveImage(storeName, key, dataUrl) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const blob = dataUrlToBlob(dataUrl);
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const keyField = { playerAvatars: "playerNumber", carouselPhotos: "slideIndex", galleryPhotos: "key" }[storeName];
      const record = { [keyField]: key, data: blob };
      store.put(record);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
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

function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(",");
  const mime = parts[0].match(/:(.*?);/)[1];
  const bytes = atob(parts[1]);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
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

function savePlayerOverride(playerNumber, field, value) {
  const overrides = JSON.parse(localStorage.getItem("jrsf_players") || "{}");
  if (!overrides[playerNumber]) overrides[playerNumber] = {};
  overrides[playerNumber][field] = value;
  localStorage.setItem("jrsf_players", JSON.stringify(overrides));
}

function saveSlideOverride(slideIndex, field, value) {
  const overrides = JSON.parse(localStorage.getItem("jrsf_slides") || "{}");
  if (!overrides[slideIndex]) overrides[slideIndex] = {};
  overrides[slideIndex][field] = value;
  localStorage.setItem("jrsf_slides", JSON.stringify(overrides));
}

function saveAlbumPhotoOverride(albumTitle, photoIndex, field, value) {
  const overrides = JSON.parse(localStorage.getItem("jrsf_albums") || "{}");
  const key = albumTitle + "||" + photoIndex;
  if (!overrides[key]) overrides[key] = {};
  overrides[key][field] = value;
  localStorage.setItem("jrsf_albums", JSON.stringify(overrides));
}

/* ========================================
   Default Data
   ======================================== */
function getDefaultPlayers() {
  return [
    { number: 1,  name: "叶乙茏", role: "门将",    captain: false, avatar: "🧤", height: "—", weight: "—", joinYear: "2025", strengths: ["门将"],      bio: "" },
    { number: 2,  name: "曾松",   role: "待定",    captain: false, avatar: "⚽", height: "—", weight: "—", joinYear: "2025", strengths: ["待补充"],    bio: "" },
    { number: 4,  name: "李云龙", role: "待定",    captain: false, avatar: "⚽", height: "—", weight: "—", joinYear: "2025", strengths: ["待补充"],    bio: "" },
    { number: 6,  name: "周照航", role: "待定",    captain: false, avatar: "⚽", height: "—", weight: "—", joinYear: "2025", strengths: ["待补充"],    bio: "" },
    { number: 7,  name: "刘畅",   role: "待定",    captain: false, avatar: "⚽", height: "—", weight: "—", joinYear: "2025", strengths: ["待补充"],    bio: "" },
    { number: 8,  name: "王绪坤", role: "待定",    captain: false, avatar: "⚽", height: "—", weight: "—", joinYear: "2025", strengths: ["待补充"],    bio: "" },
    { number: 9,  name: "张浩宇", role: "待定",    captain: false, avatar: "⚽", height: "—", weight: "—", joinYear: "2025", strengths: ["待补充"],    bio: "" },
    { number: 10, name: "向润杰", role: "待定",    captain: false, avatar: "⚽", height: "—", weight: "—", joinYear: "2025", strengths: ["待补充"],    bio: "" },
    { number: 11, name: "张平",   role: "待定",    captain: false, avatar: "⚽", height: "—", weight: "—", joinYear: "2025", strengths: ["待补充"],    bio: "" },
    { number: 13, name: "胡纪轩", role: "待定",    captain: false, avatar: "⚽", height: "—", weight: "—", joinYear: "2025", strengths: ["待补充"],    bio: "" },
    { number: 14, name: "古培杰", role: "待定",    captain: false, avatar: "⚽", height: "—", weight: "—", joinYear: "2025", strengths: ["待补充"],    bio: "" },
    { number: 15, name: "洪源",   role: "待定",    captain: false, avatar: "⚽", height: "—", weight: "—", joinYear: "2025", strengths: ["待补充"],    bio: "" },
    { number: 17, name: "骆浩睿", role: "待定",    captain: false, avatar: "⚽", height: "—", weight: "—", joinYear: "2025", strengths: ["待补充"],    bio: "" },
    { number: 81, name: "唐文",   role: "待定",    captain: false, avatar: "⚽", height: "—", weight: "—", joinYear: "2025", strengths: ["待补充"],    bio: "" },
    { number: 19, name: "蔡超",   role: "待定",    captain: false, avatar: "⚽", height: "—", weight: "—", joinYear: "2025", strengths: ["待补充"],    bio: "" },
    { number: 21, name: "唐程伟", role: "教练",    captain: false, avatar: "📋", height: "—", weight: "—", joinYear: "2025", strengths: ["战术指导"],  bio: "球队教练，负责战术安排和临场指挥。" },
    { number: 22, name: "李泽",   role: "领队 · 队长", captain: true,  avatar: "⭐", height: "—", weight: "—", joinYear: "2025", strengths: ["组织协调"], bio: "球队领队兼队长，负责球队日常管理和场上指挥。" },
    { number: 24, name: "巫名扬", role: "待定",    captain: false, avatar: "⚽", height: "—", weight: "—", joinYear: "2025", strengths: ["待补充"],    bio: "" },
    { number: 25, name: "陈奎羽", role: "待定",    captain: false, avatar: "⚽", height: "—", weight: "—", joinYear: "2025", strengths: ["待补充"],    bio: "" },
    { number: 26, name: "李毓庭", role: "待定",    captain: false, avatar: "⚽", height: "—", weight: "—", joinYear: "2025", strengths: ["待补充"],    bio: "" },
    { number: 30, name: "刘宇航", role: "待定",    captain: false, avatar: "⚽", height: "—", weight: "—", joinYear: "2025", strengths: ["待补充"],    bio: "" },
    { number: 69, name: "向桐玮", role: "待定",    captain: false, avatar: "⚽", height: "—", weight: "—", joinYear: "2025", strengths: ["待补充"],    bio: "" },
    { number: 77, name: "田佳鹭", role: "待定",    captain: false, avatar: "⚽", height: "—", weight: "—", joinYear: "2025", strengths: ["待补充"],    bio: "" },
    { number: 82, name: "游胡鑫", role: "待定",    captain: false, avatar: "⚽", height: "—", weight: "—", joinYear: "2025", strengths: ["待补充"],    bio: "" },
    { number: 99, name: "范有为", role: "门将",    captain: false, avatar: "🧤", height: "—", weight: "—", joinYear: "2025", strengths: ["门将"],      bio: "" },
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
  initTacticsBoard();
  initPlayerDetail();
  initScrollReveal();
  initCountUp();
  initBackToTop();

  // Load overrides from storage and render with merged data
  await loadAllOverridesAndMerge();
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
    return { ...s, label: ov.label || s.label };
  });

  // Merge album/photo text overrides
  const defaultAlbums = getDefaultAlbums();
  const mergedAlbums = defaultAlbums.map(a => {
    const mergedPhotos = a.photos.map((p, i) => {
      const key = a.title + "||" + i;
      const ov = overrides.albums[key] || {};
      return { ...p, label: ov.label || p.label };
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
  const links = menu.querySelectorAll(".nav-link");

  toggle.addEventListener("click", () => {
    toggle.classList.toggle("open");
    menu.classList.toggle("open");
  });

  links.forEach(link => {
    link.addEventListener("click", () => {
      toggle.classList.remove("open");
      menu.classList.remove("open");
    });
  });

  let ticking = false;
  window.addEventListener("scroll", () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const scrolled = window.scrollY > 60;
        nav.classList.toggle("scrolled", scrolled);
        updateActiveLink();
        ticking = false;
      });
      ticking = true;
    }
  });
}

function updateActiveLink() {
  const sections = document.querySelectorAll("section[id], footer[id]");
  const links = document.querySelectorAll(".nav-link");
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
function renderRoster(playersOverride) {
  const players = playersOverride || getDefaultPlayers();

  const grid = document.getElementById("rosterGrid");
  grid.innerHTML = players.map((p, i) => `
    <div class="player-card${p.captain ? " captain" : ""}" data-player-index="${i}" data-player-number="${p.number}" onclick="flipCard(this)">
      <div class="player-card-inner">
        <div class="player-card-front">
          <div class="player-avatar edit-image-zone" data-edit-image="player" data-edit-key="${p.number}">
            ${p._avatarUrl
              ? `<img src="${p._avatarUrl}" alt="${p.name}">`
              : p.avatar}
            <span class="edit-indicator edit-indicator-camera" title="更换照片">📷</span>
          </div>
          <div class="player-number">${p.number}</div>
          <div class="player-name">${p.name}</div>
          <div class="player-role">${p.role}</div>
          ${p.captain ? '<span class="player-badge">CAPTAIN</span>' : ""}
        </div>
        <div class="player-card-back">
          <div class="player-back-name">${p.name} · ${p.number}号</div>
          <div class="player-back-bio">${p.bio || "场上位置：" + p.role}</div>
          <button class="player-back-btn" onclick="event.stopPropagation(); openPlayerDetail(${i})">查看详情</button>
        </div>
      </div>
    </div>
  `).join("");

  if (!playersOverride) {
    window.__players = players;
  }
}

/* === Fixtures === */
function renderFixtures() {
  const results = [
    { date: "2024.12.08", home: "今日说法", away: "老男孩FC",   score: "3:1", result: "win",
      scorers: [{name:"李泽",num:22},{name:"向润杰",num:10},{name:"张浩宇",num:9}],
      assisters: [{name:"向润杰",num:10},{name:"刘畅",num:7}] },
    { date: "2024.11.24", home: "铁狼队",   away: "今日说法", score: "2:2", result: "draw",
      scorers: [{name:"古培杰",num:14},{name:"唐文",num:81}],
      assisters: [{name:"李泽",num:22}] },
    { date: "2024.11.10", home: "今日说法", away: "蓝月亮",     score: "0:1", result: "loss",
      scorers: [], assisters: [] },
    { date: "2024.10.27", home: "东风FC",   away: "今日说法", score: "1:4", result: "win",
      scorers: [{name:"张浩宇",num:9},{name:"向润杰",num:10},{name:"刘畅",num:7},{name:"李泽",num:22}],
      assisters: [{name:"张浩宇",num:9},{name:"古培杰",num:14}] },
    { date: "2024.10.13", home: "今日说法", away: "雄狮联盟",   score: "2:0", result: "win",
      scorers: [{name:"向润杰",num:10},{name:"张浩宇",num:9}],
      assisters: [] },
  ];

  const upcoming = [
    { date: "2024.12.22", home: "绿茵竞技", away: "今日说法" },
    { date: "2025.01.05", home: "今日说法", away: "飓风青年" },
    { date: "2025.01.19", home: "飞鹰FC",   away: "今日说法" },
  ];

  const statusText = { win: "胜", draw: "平", loss: "负" };
  const statusClass = { win: "win", draw: "draw", loss: "loss" };

  document.getElementById("resultsList").innerHTML = results.map(m => {
    const hasGoals = m.scorers && m.scorers.length > 0;
    const hasAssists = m.assisters && m.assisters.length > 0;
    const detailHTML = (hasGoals || hasAssists) ? `
      <div class="fixture-detail">
        ${hasGoals ? `<span class="fixture-goals">⚽ 进球：${m.scorers.map(p => `${p.name}(${p.num})`).join("  ")}</span>` : ""}
        ${hasAssists ? `<span class="fixture-assists">🅰 助攻：${m.assisters.map(p => `${p.name}(${p.num})`).join("  ")}</span>` : ""}
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
  }).join("");

  window.__upcoming = upcoming;

  document.getElementById("upcomingList").innerHTML = upcoming.map(m => `
    <div class="fixture-item">
      <span class="fixture-date">${m.date}</span>
      <span class="fixture-teams">${m.home} vs ${m.away}</span>
      <span class="fixture-upcoming">即将开赛</span>
    </div>
  `).join("");

  startCountdown();
}

/* === Lightbox (shared) === */
function initLightbox() {
  const lb = document.getElementById("lightbox");
  const close = document.getElementById("lightboxClose");
  close.addEventListener("click", () => lb.classList.remove("open"));
  lb.addEventListener("click", (e) => {
    if (e.target === lb) lb.classList.remove("open");
  });
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

      const gradient = ctx.createRadialGradient(px, py, 0, px, py, p.r * 3);
      gradient.addColorStop(0, `hsla(${hue}, 65%, 75%, ${alpha})`);
      gradient.addColorStop(0.5, `hsla(${hue}, 55%, 60%, ${alpha * 0.4})`);
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.fill();
    });

    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener("resize", resize);
  requestAnimationFrame(draw);
}

/* === Carousel === */
function initCarousel(slidesOverride) {
  const slides = slidesOverride || getDefaultSlides();

  const track = document.getElementById("carouselTrack");
  const dots = document.getElementById("carouselDots");
  const prev = document.getElementById("carouselPrev");
  const next = document.getElementById("carouselNext");

  let current = 0;
  let timer;

  track.innerHTML = slides.map((s, i) => `
    <div class="carousel-slide edit-image-zone" data-index="${i}" data-edit-image="slide" data-edit-key="${i}">
      ${s._imageUrl
        ? `<img class="carousel-slide-img" src="${s._imageUrl}" alt="${s.label}">`
        : `<span class="carousel-slide-icon">${s.icon}</span>`}
      <span class="carousel-slide-label">${s.label}</span>
      <span class="edit-indicator edit-indicator-camera" title="更换照片">📷</span>
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

  // Lightbox on click (only in normal mode)
  track.addEventListener("click", (e) => {
    if (document.body.classList.contains("edit-mode")) return;
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
          <text fill="#c9a961" font-size="100" text-anchor="middle" x="400" y="280">${s.icon}</text>
          <text fill="#555" font-size="22" text-anchor="middle" x="400" y="340">今日说法 · ${s.label}</text>
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

  function getPlayerName(number) {
    const players = window.__players;
    if (!players) return "";
    const p = players.find(p => p.number === number);
    return p ? p.name : "";
  }

  function draw() {
    const w = board.clientWidth;
    const h = w * (4 / 3);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    canvas.width = w * dpr;
    canvas.height = h * dpr;

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const lineColor = "rgba(255,255,255,0.18)";
    const gold = "#c9a961";
    const px = 10, py = 10;
    const pw = w - 20, ph = h - 20;
    const halfX = px + pw / 2;

    // Pitch background with rounded corners
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 8);
    ctx.clip();

    // Base green
    ctx.fillStyle = "#1a3a1a";
    ctx.fillRect(px, py, pw, ph);

    // Lawn stripes — alternating green bands
    const stripeH = ph / 28;
    for (let i = 0; i < 28; i++) {
      ctx.fillStyle = i % 2 === 0 ? "#1a3a1a" : "#1d3d1d";
      ctx.fillRect(px, py + i * stripeH, pw, stripeH + 1);
    }

    ctx.restore();

    // Border
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 8);
    ctx.stroke();

    // Halfway line
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(halfX, py);
    ctx.lineTo(halfX, py + ph);
    ctx.stroke();

    // Center circle
    ctx.beginPath();
    ctx.arc(halfX, py + ph * 0.75, ph * 0.12, 0, Math.PI * 2);
    ctx.stroke();

    // Center spot
    ctx.fillStyle = lineColor;
    ctx.beginPath();
    ctx.arc(halfX, py + ph * 0.75, 3, 0, Math.PI * 2);
    ctx.fill();

    // Penalty areas
    const paW = pw * 0.35, paH = ph * 0.22;
    ctx.strokeRect(halfX - paW / 2, py, paW, paH);
    ctx.strokeRect(halfX - paW / 2, py + ph - paH, paW, paH);

    // Goal areas
    const gaW = pw * 0.18, gaH = ph * 0.08;
    ctx.strokeRect(halfX - gaW / 2, py, gaW, gaH);
    ctx.strokeRect(halfX - gaW / 2, py + ph - gaH, gaW, gaH);

    // Goals
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(halfX - pw * 0.06, py - 2, pw * 0.12, 2);
    ctx.fillRect(halfX - pw * 0.06, py + ph, pw * 0.12, 2);

    // D at top of penalty area
    const arcR = ph * 0.08;
    ctx.beginPath();
    ctx.arc(halfX, py + paH, arcR, Math.PI, 0);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(halfX, py + ph - paH, arcR, 0, Math.PI);
    ctx.stroke();

    // Player positions
    const formation = formations[currentFormation];
    const marginX = pw * 0.08, marginTop = ph * 0.18;
    const fieldH = ph * 0.55;
    const fieldY = py + marginTop;
    const dotR = Math.max(14, pw * 0.04);

    formation.positions.forEach(p => {
      const cx = p.cols === 1
        ? halfX
        : px + marginX + (p.col / (p.cols - 1)) * (pw - marginX * 2);
      const cy = fieldY + (p.row / (p.rows - 1)) * fieldH;

      // Player circle
      ctx.fillStyle = "#1a1a1a";
      ctx.strokeStyle = gold;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Number
      ctx.fillStyle = gold;
      ctx.font = `bold ${Math.max(10, dotR * 1.1)}px -apple-system, "PingFang SC", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.number, cx, cy);

      // Name below circle
      const playerName = getPlayerName(p.number);
      if (playerName) {
        ctx.fillStyle = "rgba(201, 169, 97, 0.7)";
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
  window.addEventListener("resize", draw);
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
            <div class="gallery-photo edit-image-zone" data-album="${a.title}" data-idx="${i}" data-edit-image="album" data-edit-key="${a.title}||${i}">
              ${p._imageUrl
                ? `<img src="${p._imageUrl}" alt="${p.label}">`
                : `<span>${p.icon}</span>`}
              <span class="gallery-photo-label">${p.label}</span>
              <span class="edit-indicator edit-indicator-camera" title="更换照片">📷</span>
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
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("open")) {
      close();
    }
  });

  // Photo click → lightbox (only in normal mode)
  content.addEventListener("click", (e) => {
    if (document.body.classList.contains("edit-mode")) return;
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
          <text fill="#c9a961" font-size="120" text-anchor="middle" x="400" y="300">${p.icon}</text>
          <text fill="#eee" font-size="24" text-anchor="middle" x="400" y="370">${album}</text>
          <text fill="#777" font-size="18" text-anchor="middle" x="400" y="400">${p.label}</text>
        </svg>`
      );
    }
  });
}

/* === Player Detail Overlay === */
function initPlayerDetail() {
  const overlay = document.getElementById("playerOverlay");
  const backBtn = document.getElementById("playerBack");

  backBtn.addEventListener("click", closePlayerDetail);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closePlayerDetail();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("open")) {
      closePlayerDetail();
    }
  });
}

function openPlayerDetail(index) {
  const p = window.__players[index];
  if (!p) return;

  const avatarEl = document.getElementById("playerDetailAvatar");
  avatarEl.className = "player-detail-avatar edit-image-zone";
  avatarEl.dataset.editImage = "player";
  avatarEl.dataset.editKey = p.number;
  if (p._avatarUrl) {
    avatarEl.innerHTML = `<img src="${p._avatarUrl}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
  } else {
    avatarEl.textContent = p.avatar;
  }
  // Add camera indicator
  if (!avatarEl.querySelector(".edit-indicator")) {
    const indicator = document.createElement("span");
    indicator.className = "edit-indicator edit-indicator-camera";
    indicator.title = "更换照片";
    indicator.textContent = "📷";
    avatarEl.appendChild(indicator);
  }

  document.getElementById("playerDetailNumber").textContent = p.number;
  document.getElementById("playerDetailName").textContent = p.name;

  document.getElementById("playerDetailRole").textContent = p.role;
  document.getElementById("playerDetailBio").textContent = p.bio;

  document.getElementById("playerDetailInfo").innerHTML = `
    <div class="player-info-item">
      <div class="player-info-value">${p.height}</div>
      <div class="player-info-label">身高</div>
    </div>
    <div class="player-info-item">
      <div class="player-info-value">${p.weight}</div>
      <div class="player-info-label">体重</div>
    </div>
    <div class="player-info-item">
      <div class="player-info-value">${p.joinYear}</div>
      <div class="player-info-label">入队</div>
    </div>
  `;

  document.getElementById("playerDetailStrengths").innerHTML = p.strengths.map(s =>
    `<span class="player-strength-tag">${s}</span>`
  ).join("");

  document.getElementById("playerOverlay").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closePlayerDetail() {
  document.getElementById("playerOverlay").classList.remove("open");
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
      if (!match) return;
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

  let ticking = false;
  window.addEventListener("scroll", () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        btn.classList.toggle("visible", window.scrollY > window.innerHeight);
        ticking = false;
      });
      ticking = true;
    }
  });

  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

/* === Countdown Timer === */
function startCountdown() {
  const upcoming = window.__upcoming;
  if (!upcoming || !upcoming.length) return;

  const firstMatch = upcoming[0];
  const targetDate = new Date(firstMatch.date.replace(/\./g, "-") + "T15:00:00");

  const timer = document.getElementById("countdownTimer");
  if (!timer) return;

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
      <span><em>${days}</em> 天</span>
      <span><em>${String(hours).padStart(2, "0")}</em> 时</span>
      <span><em>${String(minutes).padStart(2, "0")}</em> 分</span>
      <span><em>${String(seconds).padStart(2, "0")}</em> 秒</span>
    `;
  }

  tick();
  setInterval(tick, 1000);
}

/* === Card Flip === */
function flipCard(card) {
  const wasFlipped = card.classList.contains("flipped");
  document.querySelectorAll(".player-card.flipped").forEach(c => c.classList.remove("flipped"));
  if (!wasFlipped) {
    card.classList.add("flipped");
  }
}

/* ========================================
   Edit Mode
   ======================================== */
function initEditMode() {
  const toggle = document.getElementById("editToggle");
  const fileInput = document.getElementById("editFileInput");

  let editModeOn = false;
  let pendingImageTarget = null; // { type, key }

  // Toggle edit mode
  toggle.addEventListener("click", () => {
    editModeOn = !editModeOn;
    toggle.classList.toggle("active", editModeOn);
    document.body.classList.toggle("edit-mode", editModeOn);
  });

  // Delegate click for image zones (only in edit mode)
  document.addEventListener("click", (e) => {
    if (!editModeOn) return;

    const cameraIndicator = e.target.closest(".edit-indicator-camera");
    const imageZone = e.target.closest(".edit-image-zone");
    const target = cameraIndicator ? cameraIndicator.parentElement : imageZone;

    if (target && !e.target.closest("button")) {
      e.preventDefault();
      e.stopPropagation();
      const type = target.dataset.editImage;
      const key = type === "player" ? parseInt(target.dataset.editKey, 10) : target.dataset.editKey;
      pendingImageTarget = { type, key };
      fileInput.click();
    }
  });

  // File input change
  fileInput.addEventListener("change", () => {
    if (!pendingImageTarget || !fileInput.files.length) return;
    const file = fileInput.files[0];
    handleImageUpload(pendingImageTarget.type, pendingImageTarget.key, file);
    pendingImageTarget = null;
    fileInput.value = "";
  });
}

function handleImageUpload(type, key, file) {
  const reader = new FileReader();
  reader.onload = () => {
    // Resize with canvas for performance (max 400px width)
    const img = new Image();
    img.onload = () => {
      const maxW = 400;
      let w = img.width, h = img.height;
      if (w > maxW) { h = h * (maxW / w); w = maxW; }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

      // Save to IndexedDB
      const storeName = type === "player" ? "playerAvatars"
        : type === "slide" ? "carouselPhotos" : "galleryPhotos";

      saveImage(storeName, key, dataUrl).then(() => {
        // Update DOM immediately
        if (type === "player") {
          // Update avatar in player card
          const card = document.querySelector(`.player-avatar[data-edit-key="${key}"]`);
          if (card) {
            card.innerHTML = `<img src="${dataUrl}" alt="球员">`;
            // Restore camera indicator
            const indicator = document.createElement("span");
            indicator.className = "edit-indicator edit-indicator-camera";
            indicator.title = "更换照片";
            indicator.textContent = "📷";
            card.appendChild(indicator);
          }
          // Update in-memory
          const p = window.__players.find(p => p.number === key);
          if (p) p._avatarUrl = dataUrl;
        } else if (type === "slide") {
          const slide = document.querySelector(`.carousel-slide[data-edit-key="${key}"]`);
          if (slide) {
            const iconSpan = slide.querySelector(".carousel-slide-icon");
            if (iconSpan) iconSpan.remove();
            let imgEl = slide.querySelector(".carousel-slide-img");
            if (!imgEl) {
              imgEl = document.createElement("img");
              imgEl.className = "carousel-slide-img";
              slide.insertBefore(imgEl, slide.firstChild);
            }
            imgEl.src = dataUrl;
          }
        } else if (type === "album") {
          const photo = document.querySelector(`.gallery-photo[data-edit-key="${key}"]`);
          if (photo) {
            const emojiSpan = photo.querySelector("span:not(.gallery-photo-label):not(.edit-indicator)");
            if (emojiSpan) emojiSpan.remove();
            let imgEl = photo.querySelector("img");
            if (!imgEl) {
              imgEl = document.createElement("img");
              imgEl.alt = "";
              photo.insertBefore(imgEl, photo.firstChild);
            }
            imgEl.src = dataUrl;
          }
        }
        showToast();
      });
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function showToast() {
  const toast = document.getElementById("toast");
  toast.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 1800);
}
