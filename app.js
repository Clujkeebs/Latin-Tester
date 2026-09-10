/* ============================================================
   Vocābulārium — Cambridge Latin Course vocabulary tester
   Plain browser JavaScript. No build step, no accounts,
   no network: everything runs in the page.
   ============================================================ */
(function () {
  "use strict";

  var VOCAB = (window.VOCAB || []).slice();

  var LENGTHS = [10, 25, 50, 100];
  var CHOICE_COUNT = 4;          // one answer + three distractors
  var MAX_STAGE = 12;
  var MAX_CUSTOM = 400;

  var CONFIG_KEY = "clc-vocab-config-v1";
  var THEME_KEY = "clc-vocab-theme-v1";

  var DEFAULT_CONFIG = {
    direction: "la-en",
    format: "flashcard",
    scopeMode: "cumulative",
    stage: 3,
    length: 25,
    custom: 30,
    timerOn: false,
    timerSecs: 15
  };

  /* ---------- tiny helpers ---------- */

  function esc(s) {
    return String(s === null || s === undefined ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function shuffle(list) {
    var out = list.slice();
    for (var i = out.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = out[i]; out[i] = out[j]; out[j] = tmp;
    }
    return out;
  }

  function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }

  function readStore(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }
  function writeStore(key, value) {
    try { window.localStorage.setItem(key, value); } catch (e) { /* private mode */ }
  }

  /* ---------- theme ---------- */

  var THEMES = ["auto", "light", "dark"];
  var theme = "auto";

  var ICONS = {
    auto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4v16" /><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none"/></svg>',
    light: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4"/></svg>',
    dark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.2A8.2 8.2 0 0 1 9.8 4 8.4 8.4 0 1 0 20 14.2z"/></svg>'
  };
  var THEME_LABEL = { auto: "Auto", light: "Light", dark: "Dark" };

  function applyTheme() {
    var root = document.documentElement;
    if (theme === "auto") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
    var btn = document.getElementById("theme-toggle");
    if (btn) {
      btn.innerHTML = ICONS[theme] + "<span>" + THEME_LABEL[theme] + "</span>";
      btn.setAttribute("aria-label", "Theme: " + THEME_LABEL[theme] + ". Click to change.");
      btn.setAttribute("title", "Theme: " + THEME_LABEL[theme]);
    }
  }

  function initTheme() {
    var saved = readStore(THEME_KEY);
    theme = THEMES.indexOf(saved) >= 0 ? saved : "auto";
    applyTheme();
  }

  function cycleTheme() {
    theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    writeStore(THEME_KEY, theme);
    applyTheme();
  }

  /* ---------- answer normalisation ---------- */

  // Strip macrons and other diacritics: ātrium === atrium === Ātrium.
  function deaccent(s) {
    return String(s === null || s === undefined ? "" : s)
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  // Fold case, punctuation and leading articles so "the dog" === "dog".
  function norm(s) {
    var t = deaccent(s).toLowerCase().trim();
    t = t.replace(/[!?.,;:'"()\-–—/]/g, " ").replace(/\s+/g, " ").trim();
    t = t.replace(/^(to the |to a |to an |the |a |an |to )/, "");
    return t.trim();
  }

  // Every spelling that should count for one gloss:
  // "cup (often for wine)" -> "cup often for wine" and "cup"
  // "slave-girl"           -> "slave girl" and "slavegirl"
  function variantsOf(text) {
    var raw = String(text || "");
    var out = [];
    function add(v) {
      var n = norm(v);
      if (n && out.indexOf(n) < 0) out.push(n);
    }
    add(raw);
    add(raw.replace(/\([^)]*\)/g, " "));          // drop parentheticals
    add(deaccent(raw).replace(/[-–—]/g, ""));     // slave-girl -> slavegirl
    raw.split(/[;/]|,\s|!\s+/).forEach(function (part) {
      if (part.trim()) { add(part); add(part.replace(/\([^)]*\)/g, " ")); }
    });
    return out;
  }

  function glossOf(entry) { return entry.english.join(", "); }

  function acceptedFor(q) {
    var e = q.entry;
    var out = [];
    function push(list) {
      list.forEach(function (v) { if (out.indexOf(v) < 0) out.push(v); });
    }
    if (q.dir === "en-la") {
      push(variantsOf(e.latin));
      if (e.perfect) push(variantsOf(e.perfect));   // accepted, never required
    } else {
      e.english.forEach(function (m) { push(variantsOf(m)); });
    }
    return out;
  }

  function isCorrect(text, q) {
    var g = norm(text);
    if (!g) return false;
    return acceptedFor(q).indexOf(g) >= 0;
  }

  /* ---------- distractors ---------- */

  function wordType(e) {
    if (e.perfect) return "verb";
    var g = e.english[0] || "";
    if (/^(is |are |was |goes|does|has|says)/.test(g) || /^\w+s\b/.test(g)) return "verb";
    if (/ly$/.test(g) || /^(at once|again|now|then|today|soon|often|always|nearly|in vain|at last)/.test(g)) return "adverb";
    if (/^(the |a |an )?\w+$/.test(g) && /(us|a|um|or|er|is|ō|o|x|s)$/.test(deaccent(e.latin))) return "noun";
    return "other";
  }

  // Prefer distractors of the same word type, then anything else in scope,
  // then the whole book so multiple choice always has enough options.
  function pickDistractors(entry, pool, dir, want) {
    var key = function (e) { return dir === "en-la" ? e.latin : glossOf(e); };
    var seen = {};
    seen[norm(key(entry))] = true;
    var picks = [];

    function take(list) {
      shuffle(list).forEach(function (e) {
        if (picks.length >= want) return;
        var k = key(e);
        var n = norm(k);
        if (!n || seen[n]) return;
        seen[n] = true;
        picks.push(k);
      });
    }

    var type = wordType(entry);
    take(pool.filter(function (e) { return e !== entry && wordType(e) === type; }));
    if (picks.length < want) take(pool.filter(function (e) { return e !== entry; }));
    if (picks.length < want) take(VOCAB.filter(function (e) { return e !== entry; }));
    return picks;
  }

  /* ---------- state ---------- */

  function loadConfig() {
    var saved = null;
    try { saved = JSON.parse(readStore(CONFIG_KEY) || "null"); } catch (e) { saved = null; }
    var c = {};
    Object.keys(DEFAULT_CONFIG).forEach(function (k) { c[k] = DEFAULT_CONFIG[k]; });
    if (saved && typeof saved === "object") {
      Object.keys(DEFAULT_CONFIG).forEach(function (k) {
        if (saved[k] !== undefined && saved[k] !== null) c[k] = saved[k];
      });
    }
    // Repair anything a stale or hand-edited save could break.
    if (["la-en", "en-la", "mixed"].indexOf(c.direction) < 0) c.direction = DEFAULT_CONFIG.direction;
    if (["flashcard", "choice", "type"].indexOf(c.format) < 0) c.format = DEFAULT_CONFIG.format;
    if (["single", "cumulative"].indexOf(c.scopeMode) < 0) c.scopeMode = DEFAULT_CONFIG.scopeMode;
    c.stage = clamp(parseInt(c.stage, 10) || DEFAULT_CONFIG.stage, 1, MAX_STAGE);
    if (c.length !== "custom" && LENGTHS.indexOf(c.length) < 0) c.length = DEFAULT_CONFIG.length;
    c.custom = clamp(parseInt(c.custom, 10) || DEFAULT_CONFIG.custom, 1, MAX_CUSTOM);
    c.timerOn = !!c.timerOn;
    c.timerSecs = clamp(parseInt(c.timerSecs, 10) || DEFAULT_CONFIG.timerSecs, 5, 30);
    return c;
  }

  var state = {
    screen: "setup",
    config: loadConfig(),
    queue: [],
    idx: 0,
    results: [],
    answered: false,
    flipped: false,
    given: null,
    wasCorrect: false,
    timedOut: false,
    timeLeft: 0,
    startedAt: 0,
    elapsed: 0,
    filter: "all",
    capNote: ""
  };

  function setConfig(key, value) {
    state.config[key] = value;
    writeStore(CONFIG_KEY, JSON.stringify(state.config));
    render();
  }

  function poolFor(c) {
    return VOCAB.filter(function (e) {
      return c.scopeMode === "single" ? e.stage === c.stage : e.stage <= c.stage;
    });
  }

  function wantedLength(c) {
    return c.length === "custom" ? clamp(parseInt(c.custom, 10) || 1, 1, MAX_CUSTOM) : c.length;
  }

  /* ---------- session build ---------- */

  function buildQueue(entries, c) {
    var pool = poolFor(c);
    if (pool.length < 2) pool = VOCAB;
    return shuffle(entries).map(function (entry) {
      var dir = c.direction === "mixed"
        ? (Math.random() < 0.5 ? "la-en" : "en-la")
        : c.direction;
      var q = {
        entry: entry,
        dir: dir,
        prompt: dir === "la-en" ? entry.latin : glossOf(entry),
        answer: dir === "la-en" ? glossOf(entry) : entry.latin
      };
      if (c.format === "choice") {
        var distractors = pickDistractors(entry, pool, dir, CHOICE_COUNT - 1);
        var options = shuffle([q.answer].concat(distractors));
        q.options = options;
        q.answerIndex = options.indexOf(q.answer);
      }
      return q;
    });
  }

  function startSession(entries, note) {
    var c = state.config;
    state.screen = "session";
    state.queue = buildQueue(entries, c);
    state.idx = 0;
    state.results = [];
    state.answered = false;
    state.flipped = false;
    state.given = null;
    state.wasCorrect = false;
    state.timedOut = false;
    state.timeLeft = c.timerSecs;
    state.startedAt = Date.now();
    state.capNote = note || "";
    render();
  }

  function beginFromSetup() {
    var c = state.config;
    var pool = poolFor(c);
    if (!pool.length) return;
    var want = wantedLength(c);
    var n = Math.min(want, pool.length);
    var note = n < want ? "Only " + n + " words in this scope — session shortened." : "";
    startSession(shuffle(pool).slice(0, n), note);
  }

  /* ---------- answering ---------- */

  function record(correct, given, timedOut) {
    if (state.answered) return;
    var q = state.queue[state.idx];
    if (!q) return;
    state.results.push({ q: q, given: given, correct: !!correct, timedOut: !!timedOut });
    state.answered = true;
    state.wasCorrect = !!correct;
    state.given = given;
    state.timedOut = !!timedOut;
    state.flipped = true;
    render();
  }

  function chooseOption(i) {
    var q = state.queue[state.idx];
    if (state.answered || !q || !q.options) return;
    record(i === q.answerIndex, q.options[i], false);
  }

  function submitTyped() {
    var q = state.queue[state.idx];
    if (state.answered || !q) return;
    var input = document.getElementById("type-input");
    var typed = input ? input.value : "";
    if (!typed.trim()) { if (input) input.focus(); return; }
    record(isCorrect(typed, q), typed.trim(), false);
  }

  function gradeFlash(ok) { record(ok, null, false); }

  function timeUp() {
    if (!state.answered) record(false, null, true);
  }

  function nextQuestion() {
    var idx = state.idx + 1;
    if (idx >= state.queue.length) {
      finishSession();
      return;
    }
    state.idx = idx;
    state.answered = false;
    state.flipped = false;
    state.given = null;
    state.wasCorrect = false;
    state.timedOut = false;
    state.timeLeft = state.config.timerSecs;
    render();
  }

  function finishSession() {
    state.screen = "review";
    state.elapsed = Math.max(0, Math.round((Date.now() - state.startedAt) / 1000));
    state.filter = "all";
    render();
  }

  /* ---------- markup builders ---------- */

  function pill(action, value, label, active) {
    return '<button type="button" class="pill" data-action="' + action + '" data-value="' +
      esc(value) + '" aria-pressed="' + (active ? "true" : "false") + '">' + esc(label) + "</button>";
  }

  function group(title, note, body) {
    return '<section class="group">' +
      '<div class="group-head"><h2>' + esc(title) + "</h2>" +
      (note ? '<div class="group-note">' + esc(note) + "</div>" : "") +
      "</div>" + body + "</section>";
  }

  function setupHTML() {
    var c = state.config;
    var pool = poolFor(c);
    var want = wantedLength(c);
    var n = Math.min(want, pool.length);

    var direction = '<div class="options">' +
      pill("direction", "la-en", "Latin → English", c.direction === "la-en") +
      pill("direction", "en-la", "English → Latin", c.direction === "en-la") +
      pill("direction", "mixed", "Mixed", c.direction === "mixed") + "</div>";

    var format = '<div class="options">' +
      pill("format", "flashcard", "Flashcard", c.format === "flashcard") +
      pill("format", "choice", "Multiple choice", c.format === "choice") +
      pill("format", "type", "Type it", c.format === "type") + "</div>";

    var stages = "";
    for (var st = 1; st <= MAX_STAGE; st++) {
      stages += '<button type="button" class="stage-pill" data-action="stage" data-value="' + st +
        '" aria-label="Stage ' + st + '" aria-pressed="' + (c.stage === st ? "true" : "false") + '">' + st + "</button>";
    }
    var scope = '<div class="options">' +
      pill("scopeMode", "single", "This stage only", c.scopeMode === "single") +
      pill("scopeMode", "cumulative", "Everything up to it", c.scopeMode === "cumulative") +
      '</div><div class="stage-grid">' + stages + "</div>";

    var lengthOpts = LENGTHS.map(function (l) {
      return pill("length", String(l), String(l), c.length === l);
    }).join("") + pill("length", "custom", "Custom", c.length === "custom");
    var length = '<div class="options">' + lengthOpts + "</div>" +
      (c.length === "custom"
        ? '<div class="field-inline"><input id="custom-length" class="num-input" type="number" inputmode="numeric" min="1" max="' +
          MAX_CUSTOM + '" value="' + esc(c.custom) + '" aria-label="Custom number of questions"></div>'
        : "");

    var timer = '<div class="options">' +
      pill("timerOn", "off", "Off", !c.timerOn) +
      pill("timerOn", "on", "Per question", c.timerOn) + "</div>" +
      (c.timerOn
        ? '<div class="range-row"><input id="timer-secs" type="range" min="5" max="30" step="1" value="' +
          c.timerSecs + '" aria-label="Seconds per question"><div class="range-value">' + c.timerSecs + "s</div></div>"
        : "");

    var summary = n + " question" + (n === 1 ? "" : "s") + " · " +
      (c.scopeMode === "single" ? "Stage " + c.stage : "Stages 1–" + c.stage) +
      (c.timerOn ? " · " + c.timerSecs + "s each" : "");

    return '<main class="screen">' +
      '<header class="masthead">' +
        '<div class="masthead-rule"></div>' +
        '<div class="masthead-meta"><span class="left">Cambridge Latin Course</span><span class="right">I – XII</span></div>' +
        "<h1>Vocābulārium</h1>" +
        '<p class="tagline">Pick how you want to practise, then begin.</p>' +
      "</header>" +
      group("Direction", "", direction) +
      group("Format", "", format) +
      group("Scope", pool.length + " words", scope) +
      group("Length", n < want ? "capped at " + n : "", length) +
      group("Timer", "", timer) +
      '<div class="start-block">' +
        '<button type="button" class="btn-primary" data-action="start">Begin session</button>' +
        '<div class="summary">' + esc(summary) + "</div>" +
      "</div>" +
      '<p class="foot">' + VOCAB.length + " words · nothing to sign up for · your settings stay on this device</p>" +
      "</main>";
  }

  function sessionHTML() {
    var c = state.config;
    var s = state;
    var q = s.queue[s.idx];
    if (!q) return "";

    var done = s.results.length;
    var right = s.results.filter(function (r) { return r.correct; }).length;
    var latinPrompt = q.dir === "la-en";
    var meanings = q.entry.english || [];
    var isFlash = c.format === "flashcard";
    var showFeedback = s.answered && (!isFlash || s.timedOut);
    var progress = s.queue.length ? (s.idx / s.queue.length) * 100 : 0;
    var low = c.timerOn && s.timeLeft <= 5;

    var head = '<div class="session-bar">' +
      '<div class="session-meta">' +
        '<button type="button" class="link-btn" data-action="quit">← End</button>' +
        "<span>" + (s.idx + 1) + " of " + s.queue.length + "</span>" +
        '<span class="right"><span>' + (done ? Math.round((right / done) * 100) + "%" : "—") + "</span>" +
        (c.timerOn ? '<span id="timer" class="timer' + (low ? " low" : "") + '">' +
          Math.max(0, Math.ceil(s.timeLeft)) + "s</span>" : "") +
        "</span>" +
      "</div>" +
      '<div class="progress" role="progressbar" aria-label="Session progress" aria-valuemin="0" aria-valuemax="' +
        s.queue.length + '" aria-valuenow="' + s.idx + '">' +
        '<div class="progress-fill" style="width:' + progress + '%"></div>' +
      "</div></div>";

    var card = '<div class="prompt-card">' +
      '<div class="prompt-label">' +
        (q.entry.stage ? "Stage " + q.entry.stage + " · " : "") +
        (latinPrompt ? "Latin → English" : "English → Latin") +
      "</div>" +
      '<div class="prompt-word' + (latinPrompt ? "" : " gloss") + '">' + esc(q.prompt) + "</div>" +
      (isFlash && s.flipped && q.entry.perfect
        ? '<div class="perfect-hint">perfect: ' + esc(q.entry.perfect) + "</div>" : "") +
      (isFlash && s.flipped
        ? '<div class="flip-answer">' + esc(q.answer) + "</div>" : "") +
      "</div>";

    var body = "";
    if (c.format === "choice") {
      var opts = (q.options || []).map(function (opt, i) {
        var cls = "choice";
        if (s.answered) {
          if (i === q.answerIndex) cls += " right";
          else if (s.given === opt) cls += " wrong";
          else cls += " dim";
        }
        return '<button type="button" class="' + cls + '" data-action="choose" data-value="' + i + '"' +
          (s.answered ? " disabled" : "") + '><span class="num">' + (i + 1) +
          '</span><span class="text">' + esc(opt) + "</span></button>";
      }).join("");
      body = '<div class="choices" role="group" aria-label="Answer choices">' + opts + "</div>";
    } else if (c.format === "type") {
      body = '<form class="type-form" id="type-form">' +
        '<input id="type-input" class="type-input" type="text" autocapitalize="off" autocorrect="off" ' +
        'autocomplete="off" spellcheck="false" enterkeyhint="go" aria-label="Your answer" placeholder="' +
        (latinPrompt ? "English meaning" : "Latin word") + '"' + (s.answered ? " disabled" : "") + ">" +
        (s.answered ? "" : '<button type="submit" class="btn-check">Check</button>') +
        "</form>";
    } else if (!s.answered) {
      body = '<div class="flash-actions">' +
        (s.flipped
          ? '<div class="grade-row">' +
              '<button type="button" class="btn-missed" data-action="missed">Missed it</button>' +
              '<button type="button" class="btn-got" data-action="got">Got it</button>' +
            "</div>"
          : '<button type="button" class="btn-flip" data-action="flip">Show answer</button>') +
        "</div>";
    }

    var feedback = "";
    if (showFeedback) {
      var ok = s.wasCorrect;
      feedback = '<div class="feedback ' + (ok ? "ok" : "bad") + '" role="status" aria-live="polite">' +
        '<div class="feedback-head"><span class="mark">' + (ok ? "✓" : "✕") + "</span>" +
        '<span class="feedback-title">' + (ok ? "Correct" : s.timedOut ? "Time up" : "Not quite") + "</span></div>" +
        (!ok && s.given ? '<div class="feedback-given">You wrote <b>' + esc(s.given) + "</b></div>" : "") +
        '<div class="feedback-answer">' + esc(q.answer) + "</div>" +
        (latinPrompt && meanings.length > 1
          ? '<div class="feedback-extra">Also accepted: ' + esc(meanings.join(" · ")) + "</div>" : "") +
        (q.entry.perfect && !latinPrompt
          ? '<div class="feedback-extra">Perfect: ' + esc(q.entry.perfect) + "</div>" : "") +
        '<button type="button" class="btn-next" data-action="next">' +
          (s.idx + 1 >= s.queue.length ? "See results" : "Continue") + "</button>" +
      "</div>";
    }

    var hint = c.format === "choice"
      ? "1 – " + (q.options ? q.options.length : CHOICE_COUNT) + " to answer · Enter to continue"
      : c.format === "flashcard"
        ? "Space to flip · 1 got it · 2 missed it"
        : "Enter to check, then Enter to continue";

    return '<main class="screen session">' + head +
      '<section class="play">' + card + body + feedback + "</section>" +
      '<p class="keyhint">' + esc(hint) + "</p>" +
      (state.capNote ? '<p class="keyhint">' + esc(state.capNote) + "</p>" : "") +
      "</main>";
  }

  function reviewHTML() {
    var s = state;
    var total = s.results.length;
    var right = s.results.filter(function (r) { return r.correct; }).length;
    var missed = s.results.filter(function (r) { return !r.correct; });
    var mins = Math.floor(s.elapsed / 60);
    var secs = s.elapsed % 60;

    var shown = s.results.filter(function (r) {
      return s.filter === "all" || (s.filter === "correct" ? r.correct : !r.correct);
    });

    var rows = shown.map(function (r) {
      var detail = r.correct
        ? r.q.answer
        : (r.timedOut ? "timed out · " : r.given ? "you: " + r.given + " · " : "") + r.q.answer;
      return '<div class="row"><div class="row-mark ' + (r.correct ? "ok" : "bad") + '">' +
        (r.correct ? "✓" : "✕") + "</div>" +
        '<div class="row-body"><div class="row-prompt">' + esc(r.q.prompt) + "</div>" +
        '<div class="row-detail">' + esc(detail) + "</div></div></div>";
    }).join("");

    if (!rows) rows = '<div class="rows-empty">Nothing here.</div>';

    var filters = '<div class="filters">' +
      pill("filter", "all", "All " + total, s.filter === "all") +
      pill("filter", "correct", "Correct " + right, s.filter === "correct") +
      pill("filter", "missed", "Missed " + missed.length, s.filter === "missed") + "</div>";

    return '<main class="screen">' +
      '<header class="review-head">' +
        '<div class="review-kicker">Session complete</div>' +
        '<div class="review-score">' + right + " / " + total + "</div>" +
        '<div class="review-line">' + (total ? Math.round((right / total) * 100) : 0) + "% · " +
          (mins ? mins + "m " : "") + secs + "s</div>" +
      "</header>" + filters +
      '<div class="rows"><div class="rows-scroll">' + rows + "</div></div>" +
      '<div class="review-actions">' +
        (missed.length
          ? '<button type="button" class="btn-primary" data-action="retry">Retry ' + missed.length +
            " missed word" + (missed.length === 1 ? "" : "s") + "</button>"
          : "") +
        '<button type="button" class="btn-secondary" data-action="new">New session</button>' +
      "</div></main>";
  }

  /* ---------- render ---------- */

  var app = null;
  var rendering = false;

  function render() {
    if (!app || rendering) return;
    // Re-entrancy guard: blurring below can fire `change`, which calls back in
    // here. The outer render wins — it redraws from the state that call left.
    rendering = true;
    try {
      // Take focus off any field we are about to replace. Without this the
      // blur handler mutates the DOM while innerHTML is removing it, and
      // the browser throws mid-render.
      var active = document.activeElement;
      if (active && active !== document.body && app.contains(active) &&
          typeof active.blur === "function") {
        active.blur();
      }

      app.innerHTML = state.screen === "setup" ? setupHTML()
        : state.screen === "session" ? sessionHTML()
        : reviewHTML();

      if (state.screen === "session" && state.config.format === "type" && !state.answered) {
        var input = document.getElementById("type-input");
        if (input) input.focus();
      }
      if (state.screen === "session" && state.answered) {
        var next = app.querySelector('[data-action="next"]');
        if (next) next.focus();
      }
    } finally {
      rendering = false;
    }
  }

  /* ---------- events ---------- */

  function onClick(ev) {
    var btn = ev.target.closest ? ev.target.closest("[data-action]") : null;
    if (!btn) return;
    var action = btn.getAttribute("data-action");
    var value = btn.getAttribute("data-value");

    switch (action) {
      case "theme": cycleTheme(); break;
      case "direction":
      case "format":
      case "scopeMode": setConfig(action, value); break;
      case "stage": setConfig("stage", parseInt(value, 10)); break;
      case "length": setConfig("length", value === "custom" ? "custom" : parseInt(value, 10)); break;
      case "timerOn": setConfig("timerOn", value === "on"); break;
      case "start": beginFromSetup(); break;
      case "choose": chooseOption(parseInt(value, 10)); break;
      case "flip": state.flipped = true; render(); break;
      case "got": gradeFlash(true); setTimeout(nextQuestion, 200); break;
      case "missed": gradeFlash(false); setTimeout(nextQuestion, 200); break;
      case "next": nextQuestion(); break;
      case "quit": finishSession(); break;
      case "filter": state.filter = value; render(); break;
      case "retry":
        startSession(state.results.filter(function (r) { return !r.correct; })
          .map(function (r) { return r.q.entry; }), "");
        break;
      case "new": state.screen = "setup"; render(); break;
    }
  }

  function onSubmit(ev) {
    if (ev.target && ev.target.id === "type-form") {
      ev.preventDefault();
      submitTyped();
    }
  }

  function onInputChange(ev) {
    var el = ev.target;
    if (el.id === "custom-length") {
      var v = clamp(parseInt(el.value, 10) || 1, 1, MAX_CUSTOM);
      setConfig("custom", v);
    } else if (el.id === "timer-secs") {
      setConfig("timerSecs", parseInt(el.value, 10));
    }
  }

  function onLiveRange(ev) {
    // Keep the "15s" label in step with the slider while dragging.
    if (ev.target.id === "timer-secs") {
      var label = document.querySelector(".range-value");
      if (label) label.textContent = ev.target.value + "s";
    }
  }

  function onKey(ev) {
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    if (state.screen !== "session") return;
    var s = state;
    var format = s.config.format;
    var typing = document.activeElement && document.activeElement.id === "type-input";

    if (ev.key === "Enter" && s.answered) {
      ev.preventDefault();
      if (format !== "flashcard" || s.timedOut) nextQuestion();
      return;
    }
    if (typing) return;

    if (format === "flashcard" && !s.answered) {
      if (ev.code === "Space" || ev.key === " ") {
        ev.preventDefault();
        if (!s.flipped) { state.flipped = true; render(); }
      } else if (s.flipped && (ev.key === "1" || ev.key === "2")) {
        ev.preventDefault();
        gradeFlash(ev.key === "1");
        setTimeout(nextQuestion, 200);
      }
    } else if (format === "choice" && !s.answered) {
      var q = s.queue[s.idx];
      var n = parseInt(ev.key, 10);
      if (q && q.options && n >= 1 && n <= q.options.length) {
        ev.preventDefault();
        chooseOption(n - 1);
      }
    }
  }

  /* ---------- timer ---------- */

  function tick() {
    var s = state;
    if (s.screen !== "session" || !s.config.timerOn || s.answered) return;
    s.timeLeft -= 0.25;
    if (s.timeLeft <= 0) {
      s.timeLeft = 0;
      timeUp();
      return;
    }
    var el = document.getElementById("timer");
    if (el) {
      el.textContent = Math.max(0, Math.ceil(s.timeLeft)) + "s";
      el.classList.toggle("low", s.timeLeft <= 5);
    }
  }

  /* ---------- boot ---------- */

  function init() {
    app = document.getElementById("app");
    initTheme();
    document.addEventListener("click", onClick);
    document.addEventListener("submit", onSubmit);
    document.addEventListener("change", onInputChange);
    document.addEventListener("input", onLiveRange);
    window.addEventListener("keydown", onKey);
    setInterval(tick, 250);
    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  // Exposed for the smoke tests only.
  window.__vocab = {
    norm: norm, isCorrect: isCorrect, variantsOf: variantsOf,
    acceptedFor: acceptedFor, pickDistractors: pickDistractors, state: state
  };
})();
