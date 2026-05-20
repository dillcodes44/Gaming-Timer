// ── State ──
let timerInterval = null;
let totalSeconds = 0;
let remainingSeconds = 0;
let isPaused = false;
let sessionStartTime = null;
let isDark = true;
let currentGame = "";
let currentIntention = "";
let pendingSession = null;

// Load sessions and preferences from localStorage
let sessions = JSON.parse(localStorage.getItem("sessions") || "[]");
let preferences = JSON.parse(localStorage.getItem("preferences") || '{"sound":"chime","volume":70,"scheme":"purple"}');

// ── Color Schemes ──

const COLOR_SCHEMES = {
  purple: { accent: "#6c63ff", hover: "#5a52e0" },
  blue:   { accent: "#3b82f6", hover: "#2563eb" },
  green:  { accent: "#22c55e", hover: "#16a34a" },
  red:    { accent: "#ef4444", hover: "#dc2626" },
  orange: { accent: "#f97316", hover: "#ea6a0a" },
  pink:   { accent: "#ec4899", hover: "#db2777" }
};

function selectScheme(name) {
  preferences.scheme = name;
  savePreferences();
  applyScheme(name);
  updateSchemeSwatches(name);
}

function applyScheme(name) {
  let scheme = COLOR_SCHEMES[name] || COLOR_SCHEMES.purple;
  let root = document.documentElement;
  root.style.setProperty("--accent", scheme.accent);
  root.style.setProperty("--accent-hover", scheme.hover);
  root.style.setProperty("--swatch-ring", scheme.accent);
  root.setAttribute("data-scheme", name);
}

function updateSchemeSwatches(activeName) {
  document.querySelectorAll(".swatch").forEach(function(swatch) {
    swatch.classList.toggle("selected", swatch.dataset.scheme === activeName);
  });
}

// ── Web Audio Context ──

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

// ── Sound Engine ──

function playChime(volume) {
  // Soft meditation bell — three sine tones fading out
  let ctx = getAudioContext();
  let vol = (volume / 100) * 0.6;
  [[523.25, 0], [659.25, 0.3], [783.99, 0.6]].forEach(function(note) {
    let osc = ctx.createOscillator();
    let gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = note[0];
    gain.gain.setValueAtTime(0, ctx.currentTime + note[1]);
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + note[1] + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + note[1] + 2.5);
    osc.start(ctx.currentTime + note[1]);
    osc.stop(ctx.currentTime + note[1] + 2.5);
  });
}

function playGameSound(volume) {
  // Achievement unlock — ascending arpeggio
  let ctx = getAudioContext();
  let vol = (volume / 100) * 0.5;
  [[392, 0], [523.25, 0.12], [659.25, 0.24], [783.99, 0.36], [1046.5, 0.48]].forEach(function(note) {
    let osc = ctx.createOscillator();
    let gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "square";
    osc.frequency.value = note[0];
    gain.gain.setValueAtTime(0, ctx.currentTime + note[1]);
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + note[1] + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + note[1] + 0.4);
    osc.start(ctx.currentTime + note[1]);
    osc.stop(ctx.currentTime + note[1] + 0.4);
  });
}

function playEndSound() {
  if (preferences.sound === "chime") playChime(preferences.volume);
  else if (preferences.sound === "game") playGameSound(preferences.volume);
}

function previewSound(type) {
  if (type === "chime") playChime(preferences.volume);
  else if (type === "game") playGameSound(preferences.volume);
}

// ── Settings ──

function selectSound(type) {
  preferences.sound = type;
  savePreferences();
  updateSettingsUI();
}

function updateVolume(value) {
  preferences.volume = parseInt(value);
  document.getElementById("volume-value").textContent = value + "%";
  savePreferences();
}

function savePreferences() {
  localStorage.setItem("preferences", JSON.stringify(preferences));
}

function updateSettingsUI() {
  ["chime", "game", "none"].forEach(function(type) {
    let el = document.getElementById("sound-opt-" + type);
    if (el) el.classList.toggle("selected", preferences.sound === type);
  });
  document.getElementById("volume-group").classList.toggle("hidden", preferences.sound === "none");
  document.getElementById("volume-slider").value = preferences.volume;
  document.getElementById("volume-value").textContent = preferences.volume + "%";
  updateSchemeSwatches(preferences.scheme);
}

// ── Game Selector ──

function handleGameDropdown() {
  let dropdown = document.getElementById("game-dropdown");
  let customInput = document.getElementById("game-custom-input");
  if (dropdown.value === "custom") {
    customInput.classList.remove("hidden");
    customInput.focus();
  } else {
    customInput.classList.add("hidden");
  }
}

function getSelectedGame() {
  let dropdown = document.getElementById("game-dropdown");
  let customInput = document.getElementById("game-custom-input");
  if (dropdown.value === "custom") return customInput.value.trim() || "Unknown Game";
  return dropdown.value || "Unknown Game";
}

// ── Timer ──

function startTimer() {
  let hours = parseInt(document.getElementById("hours-input").value) || 0;
  let minutes = parseInt(document.getElementById("minutes-input").value) || 0;
  totalSeconds = (hours * 3600) + (minutes * 60);

  if (totalSeconds <= 0) {
    alert("Please enter a time greater than 0.");
    return;
  }

  currentGame = getSelectedGame();
  // Show intention prompt first
  document.getElementById("intention-modal").classList.remove("hidden");
}

function selectIntention(intention) {
  currentIntention = intention;
  document.getElementById("intention-modal").classList.add("hidden");
  beginCountdown();
}

function beginCountdown() {
  remainingSeconds = totalSeconds;
  sessionStartTime = new Date();
  isPaused = false;

  document.getElementById("countdown-game-name").textContent = currentGame;
  document.getElementById("game-selector").classList.add("hidden");
  document.getElementById("time-inputs").classList.add("hidden");
  document.getElementById("countdown-display").classList.remove("hidden");
  document.getElementById("start-btn").classList.add("hidden");
  document.getElementById("pause-btn").classList.remove("hidden");
  document.getElementById("reset-btn").classList.remove("hidden");
  document.getElementById("progress-bar-container").classList.remove("hidden");

  updateCountdownDisplay();
  updateProgressBar();

  timerInterval = setInterval(function() {
    if (!isPaused) {
      remainingSeconds--;
      updateCountdownDisplay();
      updateProgressBar();

      if (remainingSeconds <= 300 && remainingSeconds > 0) {
        document.getElementById("warning-banner").classList.remove("hidden");
        document.getElementById("countdown-time").classList.add("warning");
      }

      if (remainingSeconds <= 60) {
        document.getElementById("countdown-time").classList.remove("warning");
        document.getElementById("countdown-time").classList.add("danger");
      }

      if (remainingSeconds <= 0) {
        clearInterval(timerInterval);
        // Play sound, build session, show reflection modal
        // NOTE: resetTimerUI is NOT called here — it runs after mood is selected
        playEndSound();
        preparePendingSession();
        showReflectionModal();
      }
    }
  }, 1000);
}

// ── Pause / Reset ──

function pauseTimer() {
  isPaused = !isPaused;
  document.getElementById("pause-btn").textContent = isPaused ? "Resume" : "Pause";
}

function resetTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  remainingSeconds = 0;
  isPaused = false;
  resetTimerUI();
}

function resetTimerUI() {
  // Restore all input fields, hide countdown
  document.getElementById("game-selector").classList.remove("hidden");
  document.getElementById("time-inputs").classList.remove("hidden");
  document.getElementById("countdown-display").classList.add("hidden");
  document.getElementById("warning-banner").classList.add("hidden");
  document.getElementById("start-btn").classList.remove("hidden");
  document.getElementById("pause-btn").classList.add("hidden");
  document.getElementById("reset-btn").classList.add("hidden");
  document.getElementById("pause-btn").textContent = "Pause";
  document.getElementById("countdown-time").classList.remove("warning", "danger");
  document.getElementById("countdown-label").textContent = "Time Remaining";
  document.getElementById("hours-input").value = "";
  document.getElementById("minutes-input").value = "";
  document.getElementById("game-dropdown").value = "";
  document.getElementById("game-custom-input").classList.add("hidden");
  document.getElementById("game-custom-input").value = "";
  document.getElementById("progress-bar-container").classList.add("hidden");
  document.getElementById("progress-bar-fill").style.width = "100%";
}

// ── Countdown Display ──

function updateCountdownDisplay() {
  let h = Math.floor(remainingSeconds / 3600);
  let m = Math.floor((remainingSeconds % 3600) / 60);
  let s = remainingSeconds % 60;
  document.getElementById("countdown-time").textContent =
    String(h).padStart(2, "0") + ":" +
    String(m).padStart(2, "0") + ":" +
    String(s).padStart(2, "0");
}

// ── Progress Bar ──

function updateProgressBar() {
  let percent = totalSeconds > 0 ? (remainingSeconds / totalSeconds) * 100 : 0;
  let fill = document.getElementById("progress-bar-fill");
  fill.style.width = percent + "%";
  fill.classList.remove("warning", "danger");
  if (remainingSeconds <= 60) fill.classList.add("danger");
  else if (remainingSeconds <= 300) fill.classList.add("warning");
}

// ── Reflection Modal ──

function preparePendingSession() {
  let playedSeconds = totalSeconds - remainingSeconds;
  let playedMinutes = Math.round(playedSeconds / 60);
  let timeString = sessionStartTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  let dateString = sessionStartTime.toLocaleDateString([], { month: 'short', day: 'numeric' });

  pendingSession = {
    game: currentGame,
    duration: playedMinutes,
    startedAt: dateString + " at " + timeString,
    date: sessionStartTime.toISOString(),
    intention: currentIntention,
    mood: ""
  };
}

function showReflectionModal() {
  document.getElementById("reflection-modal").classList.remove("hidden");
}

function selectMood(emoji, label) {
  // Save mood, log session, close modal, THEN reset the timer UI
  if (pendingSession) {
    pendingSession.mood = emoji + " " + label;
    sessions.push(pendingSession);
    saveSessionsToStorage();
    updateLogDisplay();
    updateLibraryDisplay();
    pendingSession = null;
  }
  document.getElementById("reflection-modal").classList.add("hidden");
  resetTimerUI();
}

// ── Session Log ──

function updateLogDisplay() {
  let logList = document.getElementById("log-list");
  let logEmpty = document.getElementById("log-empty");

  document.getElementById("total-sessions").textContent = sessions.length;
  let totalMins = sessions.reduce(function(sum, s) { return sum + s.duration; }, 0);
  document.getElementById("total-time").textContent = totalMins;

  if (sessions.length === 0) {
    logEmpty.classList.remove("hidden");
    logList.querySelectorAll(".log-item").forEach(function(item) { item.remove(); });
    return;
  }

  logEmpty.classList.add("hidden");
  logList.innerHTML = "";

  sessions.slice().reverse().forEach(function(session, index) {
    let item = document.createElement("div");
    item.classList.add("log-item");
    item.innerHTML =
      '<div class="log-item-left">' +
        '<div class="log-item-duration">🎮 ' + session.duration + ' min — <strong>' + session.game + '</strong></div>' +
        '<div class="log-item-time">Started ' + session.startedAt + (session.intention ? ' · ' + session.intention : '') + '</div>' +
        (session.mood ? '<div class="log-item-mood">' + session.mood + '</div>' : '') +
      '</div>' +
      '<div class="log-item-badge">Session ' + (sessions.length - index) + '</div>';
    logList.appendChild(item);
  });
}

function clearLog() {
  sessions = [];
  saveSessionsToStorage();
  updateLogDisplay();
  updateLibraryDisplay();
}

// ── Game Library ──

function updateLibraryDisplay() {
  let grid = document.getElementById("library-grid");
  let empty = document.getElementById("library-empty");
  let nudge = document.getElementById("wellness-nudge");

  if (sessions.length === 0) {
    grid.innerHTML = "";
    grid.appendChild(empty);
    empty.classList.remove("hidden");
    nudge.classList.add("hidden");
    return;
  }

  let gameMap = {};
  sessions.forEach(function(s) {
    if (!gameMap[s.game]) gameMap[s.game] = { sessions: 0, totalMins: 0, lastPlayed: s.date };
    gameMap[s.game].sessions++;
    gameMap[s.game].totalMins += s.duration;
    if (s.date > gameMap[s.game].lastPlayed) gameMap[s.game].lastPlayed = s.date;
  });

  let oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  let weekMins = sessions
    .filter(function(s) { return s.date >= oneWeekAgo; })
    .reduce(function(sum, s) { return sum + s.duration; }, 0);
  nudge.classList.toggle("hidden", weekMins < 900);

  let games = Object.entries(gameMap).sort(function(a, b) { return b[1].totalMins - a[1].totalMins; });

  empty.classList.add("hidden");
  grid.innerHTML = "";

  games.forEach(function(entry) {
    let name = entry[0];
    let data = entry[1];
    let hours = Math.floor(data.totalMins / 60);
    let mins = data.totalMins % 60;
    let timeLabel = hours > 0 ? hours + "h " + mins + "m" : mins + "m";
    let lastDate = new Date(data.lastPlayed).toLocaleDateString([], { month: 'short', day: 'numeric' });

    let card = document.createElement("div");
    card.classList.add("library-game-card");
    card.innerHTML =
      '<div class="library-game-icon">🎮</div>' +
      '<div class="library-game-info">' +
        '<div class="library-game-name">' + name + '</div>' +
        '<div class="library-game-meta">' + data.sessions + ' session' + (data.sessions !== 1 ? 's' : '') + ' · Last played ' + lastDate + '</div>' +
      '</div>' +
      '<div class="library-game-time">' + timeLabel + '</div>';
    grid.appendChild(card);
  });
}

// ── localStorage ──

function saveSessionsToStorage() {
  localStorage.setItem("sessions", JSON.stringify(sessions));
}

// ── Theme Toggle ──

function toggleTheme() {
  isDark = !isDark;
  let html = document.documentElement;
  if (isDark) {
    html.setAttribute("data-theme", "dark");
    document.getElementById("moon-icon").classList.remove("hidden");
    document.getElementById("sun-icon").classList.add("hidden");
  } else {
    html.setAttribute("data-theme", "light");
    document.getElementById("sun-icon").classList.remove("hidden");
    document.getElementById("moon-icon").classList.add("hidden");
  }
}

// ── Section Navigation ──

function showSection(name) {
  ["timer", "log", "library", "settings"].forEach(function(s) {
    let section = document.getElementById(s + "-section");
    let btn = document.getElementById("nav-" + s);
    if (s === name) {
      section.classList.remove("hidden");
      section.classList.add("active");
      btn.classList.add("active");
    } else {
      section.classList.add("hidden");
      section.classList.remove("active");
      btn.classList.remove("active");
    }
  });
}

// ── Init ──
applyScheme(preferences.scheme || "purple");
updateLogDisplay();
updateLibraryDisplay();
updateSettingsUI();
