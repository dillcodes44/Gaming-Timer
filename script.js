// ── State ──
let timerInterval = null;
let totalSeconds = 0;
let remainingSeconds = 0;
let isPaused = false;
let sessionStartTime = null;
let isDark = true;
let currentGame = "";
let currentIntention = "";
let pendingSession = null; // holds session data while reflection modal is open

// Load sessions from localStorage on startup
let sessions = JSON.parse(localStorage.getItem("sessions") || "[]");

// ── Game Selector ──

function handleGameDropdown() {
  let dropdown = document.getElementById("game-dropdown");
  let customInput = document.getElementById("game-custom-input");

  if (dropdown.value === "custom") {
    // Show text field for custom game name
    customInput.classList.remove("hidden");
    customInput.focus();
  } else {
    customInput.classList.add("hidden");
  }
}

function getSelectedGame() {
  let dropdown = document.getElementById("game-dropdown");
  let customInput = document.getElementById("game-custom-input");

  if (dropdown.value === "custom") {
    return customInput.value.trim() || "Unknown Game";
  }
  return dropdown.value || "Unknown Game";
}

// ── Intention Modal ──

function startTimer() {
  let hours = parseInt(document.getElementById("hours-input").value) || 0;
  let minutes = parseInt(document.getElementById("minutes-input").value) || 0;

  // Convert input to total seconds
  totalSeconds = (hours * 3600) + (minutes * 60);

  if (totalSeconds <= 0) {
    alert("Please enter a time greater than 0.");
    return;
  }

  currentGame = getSelectedGame();

  // Show pre-session intention modal before starting
  document.getElementById("intention-modal").classList.remove("hidden");
}

function selectIntention(intention) {
  // Save chosen intention and close modal, then actually start the countdown
  currentIntention = intention;
  document.getElementById("intention-modal").classList.add("hidden");
  beginCountdown();
}

function beginCountdown() {
  remainingSeconds = totalSeconds;
  sessionStartTime = new Date();
  isPaused = false;

  // Show game name above the countdown
  document.getElementById("countdown-game-name").textContent = currentGame;

  // Swap input UI for countdown UI
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

      // Warn when under 5 minutes
      if (remainingSeconds <= 300 && remainingSeconds > 0) {
        document.getElementById("warning-banner").classList.remove("hidden");
        document.getElementById("countdown-time").classList.add("warning");
      }

      // Switch to danger color under 1 minute
      if (remainingSeconds <= 60) {
        document.getElementById("countdown-time").classList.remove("warning");
        document.getElementById("countdown-time").classList.add("danger");
      }

      // Timer finished — open reflection modal
      if (remainingSeconds <= 0) {
        clearInterval(timerInterval);
        document.getElementById("countdown-label").textContent = "Session Complete!";
        preparePendingSession();
        showReflectionModal();
        resetTimerUI();
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
  // Restore input fields and hide all countdown/timer UI
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

  // Hide and reset the progress bar
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
  // Shrink fill width proportionally to time remaining
  let percent = totalSeconds > 0 ? (remainingSeconds / totalSeconds) * 100 : 0;
  let fill = document.getElementById("progress-bar-fill");
  fill.style.width = percent + "%";

  // Mirror warning/danger color states
  fill.classList.remove("warning", "danger");
  if (remainingSeconds <= 60) {
    fill.classList.add("danger");
  } else if (remainingSeconds <= 300) {
    fill.classList.add("warning");
  }
}

// ── Reflection Modal ──

function preparePendingSession() {
  // Store session data so we can save it after mood is chosen
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
  // Attach mood to pending session and save everything
  if (pendingSession) {
    pendingSession.mood = emoji + " " + label;
    sessions.push(pendingSession);
    saveSessionsToStorage();
    updateLogDisplay();
    updateLibraryDisplay();
    pendingSession = null;
  }
  document.getElementById("reflection-modal").classList.add("hidden");
}

// ── Session Log ──

function updateLogDisplay() {
  let logList = document.getElementById("log-list");
  let logEmpty = document.getElementById("log-empty");

  document.getElementById("total-sessions").textContent = sessions.length;

  // Sum all session durations for the total
  let totalMins = sessions.reduce(function(sum, s) { return sum + s.duration; }, 0);
  document.getElementById("total-time").textContent = totalMins;

  if (sessions.length === 0) {
    logEmpty.classList.remove("hidden");
    logList.querySelectorAll(".log-item").forEach(function(item) { item.remove(); });
    return;
  }

  logEmpty.classList.add("hidden");
  logList.innerHTML = "";

  // Show newest sessions first
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

  // Aggregate stats per game
  let gameMap = {};
  sessions.forEach(function(s) {
    if (!gameMap[s.game]) {
      gameMap[s.game] = { sessions: 0, totalMins: 0, lastPlayed: s.date };
    }
    gameMap[s.game].sessions++;
    gameMap[s.game].totalMins += s.duration;
    // Keep the most recent date
    if (s.date > gameMap[s.game].lastPlayed) {
      gameMap[s.game].lastPlayed = s.date;
    }
  });

  // Check if weekly play exceeds 15 hours (900 mins) for wellness nudge
  let oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  let weekMins = sessions
    .filter(function(s) { return s.date >= oneWeekAgo; })
    .reduce(function(sum, s) { return sum + s.duration; }, 0);

  nudge.classList.toggle("hidden", weekMins < 900);

  // Sort games by total time played descending
  let games = Object.entries(gameMap).sort(function(a, b) {
    return b[1].totalMins - a[1].totalMins;
  });

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
  let moonIcon = document.getElementById("moon-icon");
  let sunIcon = document.getElementById("sun-icon");

  // Swap theme attribute and icon visibility
  if (isDark) {
    html.setAttribute("data-theme", "dark");
    moonIcon.classList.remove("hidden");
    sunIcon.classList.add("hidden");
  } else {
    html.setAttribute("data-theme", "light");
    sunIcon.classList.remove("hidden");
    moonIcon.classList.add("hidden");
  }
}

// ── Section Navigation ──

function showSection(name) {
  let sections = ["timer", "log", "library"];

  sections.forEach(function(s) {
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

// Render log and library from stored data on page load
updateLogDisplay();
updateLibraryDisplay();
