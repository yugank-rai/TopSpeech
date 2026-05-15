// ── STATE ──────────────────────────────────────────────────
const TOTAL_CARDS = 5;
let currentCard = 1;
let xp = 0;
let lives = 3;
let mistakes = 0;
let confidenceData = {};
let selectedWord = null;
let cardReady = false;
let breathingActive = false;
let breathTimer = null;
let playTimers = {};
let currentLesson = 'r-sound';

// ── HELPERS ───────────────────────────────────────────────
function $(id) { return document.getElementById(id); }

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => {
    if (!s.classList.contains('active')) return;
    s.classList.remove('active');
    s.classList.add('exit');
    setTimeout(() => s.classList.remove('exit'), 350);
  });
  setTimeout(() => {
    const el = $(id);
    if (el) el.classList.add('active');
  }, 100);
}

// ── NAVIGATION ───────────────────────────────────────────
function showHome() { showScreen('homeScreen'); }
function showProfile() { showScreen('profileScreen'); }
function showSettings() { showScreen('settingsScreen'); }
function showAchievements() { showScreen('achievementsScreen'); }

// ── HUD / PROGRESS ───────────────────────────────────────
function setProgress(step) {
  const pct = (step / TOTAL_CARDS) * 100;
  const el = $('progressFill');
  if (el) el.style.width = pct + '%';
  if (el) el.classList.add('animating');
  setTimeout(() => { if (el) el.classList.remove('animating'); }, 700);
}

function addXP(amount) {
  xp += amount;
  const el = $('xpCounter');
  if (el) el.textContent = xp;
  if (el) { el.style.transform = 'scale(1.4)'; el.style.color = 'var(--gold)'; }
  setTimeout(() => { if (el) { el.style.transform = ''; el.style.color = ''; } }, 300);
}

function loseHeart() {
  lives--;
  const heart = $('h' + (lives + 1));
  if (heart) {
    heart.classList.add('lost','pulse');
    setTimeout(() => heart.classList.remove('pulse'), 400);
  }
  mistakes++;
}

function setCheckReady(ready) {
  cardReady = ready;
  const btn = $('checkBtn');
  if (!btn) return;
  if (ready) { btn.classList.add('ready'); btn.textContent = 'Check ✓'; }
  else { btn.classList.remove('ready'); btn.textContent = 'Check'; }
}

// ── START / LAUNCH FLOW ───────────────────────────────────
function showStartScreen(lessonType) {
  currentLesson = lessonType || 'r-sound';
  updateStartScreenDetails();
  showScreen('startScreen');
}

function launchLesson() {
  showScreen('lessonScreen');
  setTimeout(() => { showCard(1); setProgress(0); }, 200);
}

function startLesson(lessonType) {
  showStartScreen(lessonType);
}

function updateStartScreenDetails() {
  const title = currentLesson === 'th-sound'
    ? 'Ready to practice your TH sound?'
    : 'Ready to practice your R sound?';
  const subtitle = currentLesson === 'th-sound'
    ? 'A 4-minute lesson to sharpen your TH pronunciation.'
    : 'A 5-minute daily lesson, just for you. Your streak is on the line!';
  const previewTitle = currentLesson === 'th-sound'
    ? 'Day 2 · TH Precision'
    : 'Day 8 · Rhotacism Flow';
  const previewMeta = currentLesson === 'th-sound'
    ? '4 exercises · ~4 min'
    : '5 exercises · ~5 min';
  const previewBadge = currentLesson === 'th-sound' ? 'Continue' : 'NEW';

  if ($('startTitle')) $('startTitle').textContent = title;
  if ($('startSubtitle')) $('startSubtitle').textContent = subtitle;
  if ($('lessonPreviewTitle')) $('lessonPreviewTitle').textContent = previewTitle;
  if ($('lessonPreviewMeta')) $('lessonPreviewMeta').textContent = previewMeta;
  if ($('lessonPreviewBadge')) $('lessonPreviewBadge').textContent = previewBadge;
}

// ── CARDS ─────────────────────────────────────────────────
function showCard(n) {
  document.querySelectorAll('.exercise-card').forEach(c => c.classList.remove('active','exit'));
  const card = $('card' + n);
  if (!card) return;
  card.classList.add('active');
  currentCard = n;
  setCheckReady(false);
  hideFeedback();

  // adapt card 2 for TH lesson
  if (currentLesson === 'th-sound' && n === 2) {
    const wo = $('wordOptions');
    if (wo) wo.innerHTML = `
      <button class="word-option" onclick="selectWord(this,'wrong')">Fink</button>
      <button class="word-option" onclick="selectWord(this,'correct')">Think</button>
      <button class="word-option" onclick="selectWord(this,'wrong')">Sink</button>
      <button class="word-option" onclick="selectWord(this,'wrong')">Link</button>
    `;
    const c2 = $('card2');
    if (c2) {
      const titleEl = c2.querySelector('.card-title');
      const promptEl = c2.querySelector('.select-prompt');
      if (titleEl) titleEl.textContent = 'Which word has the correct TH sound?';
      if (promptEl) promptEl.innerHTML = 'Find the word where the <em>TH</em> is said correctly at the start';
    }
  }

  if (n === 3) {
    setCheckReady(true);
    const btn = $('checkBtn'); if (btn) { btn.textContent = 'Continue →'; btn.classList.add('ready'); }
  }
}

function nextCard() {
  hideFeedback();
  if (currentCard >= TOTAL_CARDS) { showComplete(); return; }
  const cur = $('card' + currentCard);
  if (cur) { cur.classList.remove('active'); cur.classList.add('exit'); }
  setTimeout(() => { if (cur) cur.classList.remove('exit'); showCard(currentCard + 1); setProgress(currentCard); }, 320);
}

// ── INTERACTION: PLAY / TTS / FALLBACK ────────────────────
function togglePlay(id) {
  console.log('togglePlay called for', id);
  const btn = $('playBtn' + id);
  const icon = $('playIcon' + id);
  const wave = $('waveform' + id);
  const hint = $('playHint' + id);

  const card = $('card' + id);
  let textToSpeak = '';
  if (card) {
    const tEl = card.querySelector('.listen-word');
    if (tEl) textToSpeak = tEl.innerText.replace(/\n/g,' ').replace(/"/g,'');
  }

  function startVisual() { if (btn) btn.classList.add('playing'); if (wave) wave.classList.add('active'); if (icon) icon.textContent = '⏸'; if (hint) hint.textContent = 'Playing...'; }
  function stopVisual() { if (btn) btn.classList.remove('playing'); if (wave) wave.classList.remove('active'); if (icon) icon.textContent = '▶'; if (hint) hint.textContent = 'Tap again to replay'; setCheckReady(true); }

  if ('speechSynthesis' in window && textToSpeak) {
    initAudio();
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(textToSpeak);
    u.rate = 0.95;
    startVisual();
    u.onend = () => { stopVisual(); };
    u.onerror = () => { stopVisual(); try { playBeep(600); } catch(e){} };
    window.speechSynthesis.speak(u);
    return;
  }

  // fallback visual + beep
  startVisual();
  clearTimeout(playTimers[id]);
  try { initAudio(); playBeep(600); } catch (e) { console.warn('beep failed', e); }
  playTimers[id] = setTimeout(() => { stopVisual(); }, 2200);
}

// ── INTERACTION: SELECTIONS / CONFIDENCE ──────────────────
function selectWord(el, type) {
  if (selectedWord) return;
  selectedWord = type;
  el.classList.add('selected');
  setCheckReady(true);
  el.dataset.answerType = type;
}

function setConfidence(cardNum, level) {
  confidenceData[cardNum] = level;
  ['low','mid','high'].forEach(l => { const b = $('conf' + cardNum + '-' + l); if (b) b.className = 'conf-btn'; });
  const sel = $('conf' + cardNum + '-' + level); if (sel) sel.classList.add('selected-' + level);
  const fill = $('confFill' + cardNum); const emoji = $('confEmoji' + cardNum);
  if (level === 'low') { if (fill) fill.style.width='25%'; if (fill) fill.style.background='var(--coral)'; if (emoji) emoji.textContent='😰'; }
  else if (level === 'mid') { if (fill) fill.style.width='60%'; if (fill) fill.style.background='var(--gold)'; if (emoji) emoji.textContent='🙂'; }
  else { if (fill) fill.style.width='100%'; if (fill) fill.style.background='var(--sage)'; if (emoji) emoji.textContent='😄'; }
}

function checkAnswer() {
  if (!cardReady) return;
  if (currentCard === 2) {
    const isCorrect = selectedWord === 'correct';
    document.querySelectorAll('.word-option').forEach(btn => {
      if (btn.dataset.answerType === 'correct') btn.classList.add('correct');
      else if (btn.classList.contains('selected')) btn.classList.add('wrong');
    });
    if (isCorrect) { showFeedback(true, "That's right! 🎉", currentLesson==='th-sound' ? "Think has the TH sound." : "Rabbit starts with a clean R sound."); addXP(10); }
    else { showFeedback(false, "Not quite 😅", currentLesson==='th-sound' ? "Try listening for the TH sound." : "'Rabbit' has the correct R."); loseHeart(); }
  } else if (currentCard === 3) {
    showFeedback(true, "Mouth position noted! 👏", "Awareness is key."); addXP(8);
  } else {
    showFeedback(true, "Great effort! ✨", "Keep practicing!"); addXP(10);
  }
}

function showFeedback(isCorrect, title, subtitle) {
  const bar = $('feedbackBar'); if (!bar) return;
  bar.className = 'feedback-bar ' + (isCorrect ? 'correct' : 'wrong');
  if ($('feedbackTitle')) $('feedbackTitle').textContent = title;
  if ($('feedbackSubtitle')) $('feedbackSubtitle').textContent = subtitle;
  if ($('feedbackIcon')) $('feedbackIcon').textContent = isCorrect ? '✓' : '✕';
  bar.classList.add('show');
  setProgress(currentCard - 0.5);
}
function hideFeedback() { const b = $('feedbackBar'); if (b) b.classList.remove('show'); }

function selectMouthCue(el, emoji, label) { document.querySelectorAll('.mouth-cue').forEach(c => c.classList.remove('active')); el.classList.add('active'); if ($('mirrorEmoji')) $('mirrorEmoji').textContent = emoji; setCheckReady(true); }

// ── BREATHING ─────────────────────────────────────────────
let breathPhase = 0;
const breathPhases = [ {text:'Breathe In',duration:4000,scale:'expand'}, {text:'Hold',duration:2000,scale:'hold'}, {text:'Breathe Out',duration:4000,scale:'contract'} ];

function startBreathing() {
  if (breathingActive) return;
  breathingActive = true;
  console.log('startBreathing called');
  const ring = $('breathRing'); if (ring) ring.style.opacity = '1';
  runBreathPhase(0, 2);
}

function runBreathPhase(phaseIdx, remainingCycles) {
  if (remainingCycles <= 0 && phaseIdx === 0) {
    if ($('breathText')) $('breathText').textContent = 'Well done!';
    if ($('breathCounter')) $('breathCounter').textContent = '🌟';
    if ($('breathInner')) $('breathInner').className = 'breath-inner';
    if ($('breathRing')) $('breathRing').style.opacity = '0';
    setCheckReady(true);
    breathingActive = false;
    addXP(5);
    return;
  }
  const phase = breathPhases[phaseIdx];
  if ($('breathText')) $('breathText').textContent = phase.text;
  if ($('breathInner')) $('breathInner').className = 'breath-inner ' + phase.scale;

  let secs = Math.round(phase.duration / 1000);
  if ($('breathCounter')) $('breathCounter').textContent = secs;
  const countInterval = setInterval(() => {
    secs--; if ($('breathCounter')) $('breathCounter').textContent = secs > 0 ? secs : '';
    if (secs <= 0) clearInterval(countInterval);
  }, 1000);

  breathTimer = setTimeout(() => {
    const nextPhase = (phaseIdx + 1) % breathPhases.length;
    const cycles = nextPhase === 0 ? remainingCycles - 1 : remainingCycles;
    runBreathPhase(nextPhase, cycles);
  }, phase.duration);
}

// ── COMPLETE / XP / CONFETTI ──────────────────────────────
function showComplete() {
  setProgress(TOTAL_CARDS);
  setTimeout(() => {
    showScreen('completeScreen');
    spawnConfetti();
    const levels = Object.values(confidenceData);
    const score = (levels.filter(l => l === 'high').length * 2) + (levels.filter(l => l === 'mid').length);
    const confEl = $('confidenceStat'); if (confEl) {
      const val = confEl.querySelector('.c-stat-val'); if (val) val.textContent = score >= 4 ? '😄' : '🙂';
    }
    if ($('accuracyStat')) $('accuracyStat').textContent = Math.round(((TOTAL_CARDS - mistakes) / TOTAL_CARDS) * 100) + '%';
    animateXP();
    setTimeout(() => { if (mistakes === 0) showNotification('Perfect Lesson!', 'Flawless execution', '🏆'); else if (xp >= 40) showNotification('Great Progress!', '+'+xp+' XP earned', '⭐'); }, 1000);
  }, 500);
}

function animateXP() {
  let count = 0; const target = xp;
  const interval = setInterval(() => { count = Math.min(count + Math.ceil(target/20), target); if ($('finalXP')) $('finalXP').textContent = '+' + count; if (count >= target) clearInterval(interval); }, 50);
}

function spawnConfetti() {
  const colors = ['#FF6B5A','#E8A830','#5B8A72','#8B7BC8','#4A90D9'];
  const field = $('confettiField'); if (!field) return;
  for (let i=0;i<50;i++){ const piece = document.createElement('div'); piece.className='confetti-piece'; piece.style.left = Math.random()*100 + '%'; piece.style.background = colors[Math.floor(Math.random()*colors.length)]; piece.style.animationDelay = (Math.random()*1.5)+'s'; field.appendChild(piece); }
}

// ── AUDIO FALLBACKS / NOTIFICATIONS ───────────────────────
function playBeep(duration = 600) {
  try {
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const ctx = window._audioCtx || new C(); if (!window._audioCtx) window._audioCtx = ctx;
    const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = 'sine'; o.frequency.value = 520; o.connect(g); g.connect(ctx.destination); g.gain.value = 0.0001; o.start(); g.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration/1000); setTimeout(()=>{ try{ o.stop(); }catch(e){} }, duration+50);
  } catch(e){ console.warn('playBeep error', e); }
}

function initAudio() {
  try { const C = window.AudioContext || window.webkitAudioContext; if (!C) return; if (!window._audioInitListener) { if (!window._audioCtx) window._audioCtx = new C(); if (window._audioCtx.state === 'suspended' && typeof window._audioCtx.resume === 'function') window._audioCtx.resume().catch(()=>{}); window._audioInitListener = true; } } catch(e){ console.warn('initAudio failed', e); }
}

document.addEventListener('click', () => initAudio(), { once: true });

// attach breathing listeners if present
try {
  const bi = $('breathInner');
  if (bi) {
    bi.addEventListener('click', () => { console.log('breathInner clicked'); startBreathing(); });
    bi.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startBreathing(); } });
  }
} catch (e) { console.warn('breath listener attach failed', e); }

// ── NOTIFICATIONS / MODALS / RESTART ─────────────────────
function showNotification(title, message, icon='🎉') { const toast = $('notificationToast'); if (!toast) return; if ($('toastIcon')) $('toastIcon').textContent = icon; if ($('toastTitle')) $('toastTitle').textContent = title; if ($('toastMessage')) $('toastMessage').textContent = message; toast.classList.add('show'); setTimeout(()=>hideNotification(),4000); }
function hideNotification(){ const t=$('notificationToast'); if(t) t.classList.remove('show'); }
function showQuitModal(){ const m=$('quitModal'); if(m) m.classList.add('show'); }
function closeQuitModal(e){ if(!e || e.target === $('quitModal')){ const m=$('quitModal'); if(m) m.classList.remove('show'); } }
function quitLesson(){ const m=$('quitModal'); if(m) m.classList.remove('show'); setTimeout(()=>showHome(),200); }

function restartApp(){ currentCard=1; xp=0; lives=3; mistakes=0; confidenceData={}; selectedWord=null; cardReady=false; breathingActive=false; clearTimeout(breathTimer); if ($('xpCounter')) $('xpCounter').textContent='0'; if ($('progressFill')) $('progressFill').style.width='0%'; ['h1','h2','h3'].forEach(id=>{ const el=$(id); if(el) el.classList.remove('lost','pulse'); }); showHome(); }

// expose some helpers for debugging in console
window.__topspeech = { startBreathing, togglePlay, startLesson, launchLesson };
