// ==================== SABİTLER VE YAPILANDIRMALAR ====================
const COLORS = [
  { name: 'Kırmızı',  hex: '#e74c3c', light: '#ff6b6b' },
  { name: 'Mavi',     hex: '#3498db', light: '#74b9ff' },
  { name: 'Yeşil',    hex: '#27ae60', light: '#55efc4' },
  { name: 'Turuncu',  hex: '#e67e22', light: '#fdcb6e' },
  { name: 'Mor',      hex: '#9b59b6', light: '#a29bfe' },
  { name: 'Pembe',    hex: '#e91e8c', light: '#fd79a8' },
  { name: 'Cyan',     hex: '#00bcd4', light: '#81ecec' },
  { name: 'Sarı',     hex: '#f1c40f', light: '#ffeaa7' },
];

const SPEECHES = {
  select: ["Güzel seçim!", "Evet bu!", "Hmm...", "Bakalım..."],
  pour:   ["Döküyorum!", "Mükemmel!", "Oldu bir!", "Süper!"],
  match:  ["Harika! ✨", "Bravo!", "Tam isabet!"],
  fail:   ["Oraya sığmaz!", "Yanlış renk!", "Olmaz!", "Dikkat!"],
  hint:   ["İşte ipucu!", "Bak buraya!"],
};

const LEVEL_CONFIG = [
  { tubes: 4, colors: 2, empty: 1, maxHeight: 4 },
  { tubes: 5, colors: 3, empty: 1, maxHeight: 4 },
  { tubes: 6, colors: 4, empty: 2, maxHeight: 4 },
  { tubes: 7, colors: 5, empty: 2, maxHeight: 4 },
  { tubes: 8, colors: 6, empty: 2, maxHeight: 4 },
];

let state = {
  tubes: [],
  selected: -1,
  level: 0,
  score: 0,
  moves: 0,
  history: [],
  maxH: 4
};

// ==================== GÖRSEL EFEKT FONKSİYONLARI ====================
function speak(arr) {
  document.getElementById('speech').textContent = arr[Math.floor(Math.random() * arr.length)];
}

function crowHappy() {
  const crow = document.getElementById('crowSvg');
  crow.classList.add('happy');
  setTimeout(() => crow.classList.remove('happy'), 1500);
}

// ==================== OYUN MANTIĞI VE KURULUMU ====================
function buildTubes(cfg) {
  const { tubes, colors, empty, maxHeight } = cfg;
  let layers = [];
  
  // Renk katmanlarını oluştur
  for (let c = 0; c < colors; c++) {
    for (let i = 0; i < maxHeight; i++) layers.push(c);
  }
  
  // Karıştır (Fisher-Yates Shuffle)
  for (let i = layers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [layers[i], layers[j]] = [layers[j], layers[i]];
  }
  
  let result = [];
  for (let t = 0; t < tubes - empty; t++) result.push(layers.splice(0, maxHeight));
  for (let e = 0; e < empty; e++) result.push([]);
  return result;
}

function newGame() {
  const cfg = LEVEL_CONFIG[Math.min(state.level, LEVEL_CONFIG.length - 1)];
  state.tubes = buildTubes(cfg);
  state.selected = -1; 
  state.moves = 0; 
  state.history = [];
  state.maxH = cfg.maxHeight;
  
  document.getElementById('winOverlay').classList.remove('show');
  document.getElementById('loseOverlay').classList.remove('show');
  document.getElementById('levelText').textContent = `Bölüm ${state.level + 1}`;
  
  updateScoreUI();
  speak(["Yeni oyun!", "Tüpleri doldur!", "Hadi!"]);
  render();
}

function nextLevel() {
  state.level++;
  newGame();
}

// ==================== HAMLE VE KONTROL MEKANİZMALARI ====================
function topColor(tube) {
  return tube.length > 0 ? tube[tube.length - 1] : -1;
}

function canPour(from, to) {
  if (from === to) return false;
  if (state.tubes[from].length === 0) return false;
  if (state.tubes[to].length >= state.maxH) return false;
  
  const tc = topColor(state.tubes[to]);
  return tc === -1 || tc === topColor(state.tubes[from]);
}

function pour(from, to) {
  state.history.push({ tubes: state.tubes.map(t => [...t]), selected: state.selected });
  const color = topColor(state.tubes[from]);
  while (state.tubes[from].length > 0 && topColor(state.tubes[from]) === color && state.tubes[to].length < state.maxH) {
    state.tubes[to].push(state.tubes[from].pop());
  }
  state.moves++;
  speak(SPEECHES.pour);
  checkComplete(to);
}

function selectTube(idx) {
  const els = document.querySelectorAll('.tube-outer');
  const currentTube = state.tubes[idx];
  const currentEl = els[idx];

  if (state.selected === -1) {
    // İlk seçim
    if (currentTube.length === 0) {
      // Boş tüpe dokunulursa sallansın
      addShakeEffect(currentEl);
      return;
    }
    state.selected = idx;
    speak(SPEECHES.select);
  } else {
    const sourceTube = state.tubes[state.selected];
    const sourceEl = els[state.selected];

    if (state.selected === idx) {
      // Aynı tüp tekrar seçilirse seçimi iptal et
      state.selected = -1;
    } else if (canPour(state.selected, idx)) {
      // Geçerli hamle
      pour(state.selected, idx);
      state.selected = -1;
    } else {
      // Geçersiz hamle - her iki tüpü sallatıyoruz
      speak(SPEECHES.fail);
      addShakeEffect(sourceEl);
      addShakeEffect(currentEl);
      
      // Boş tüpü seçtiğinde seçimi iptal et, aksi halde tüpü seç
      state.selected = currentTube.length > 0 ? idx : -1;
    }
  }
  render();
}

function addShakeEffect(element) {
  element.classList.remove('shake'); // Animasyonu sıfırla
  void element.offsetWidth; // Reflow trigger (animasyonun yeniden oynatılması için)
  element.classList.add('shake');
  setTimeout(() => element.classList.remove('shake'), 500);
}

// ==================== OYUN SONU VE YARDIMCILAR ====================
function checkComplete(ti) {
  const t = state.tubes[ti];
  if (t.length === state.maxH && t.every(c => c === t[0])) {
    state.score += 20; 
    speak(SPEECHES.match); 
    crowHappy();
  }
  updateScoreUI();
  if (isWin()) setTimeout(showWin, 500);
}

function isWin() {
  return state.tubes.every(t => t.length === 0 || (t.length === state.maxH && t.every(c => c === t[0])));
}

function showWin() {
  const stars = state.moves < 15 ? '⭐⭐⭐' : state.moves < 25 ? '⭐⭐' : '⭐';
  document.getElementById('winStars').textContent = stars;
  document.getElementById('winMsg').textContent = `${state.moves} hamlede tamamladın! 🦅`;
  document.getElementById('winOverlay').classList.add('show');
  
  state.score += 100; 
  updateScoreUI(); 
  crowHappy();
}

function undoMove() {
  if (state.history.length === 0) return;
  const prev = state.history.pop();
  state.tubes = prev.tubes; 
  state.selected = -1;
  state.moves = Math.max(0, state.moves - 1);
  
  updateScoreUI(); 
  render();
}

function showHint() {
  speak(SPEECHES.hint);
  const els = document.querySelectorAll('.tube-outer');
  for (let f = 0; f < state.tubes.length; f++) {
    for (let t = 0; t < state.tubes.length; t++) {
      if (canPour(f, t)) {
        els[f].classList.add('hint-glow');
        els[t].classList.add('hint-glow');
        setTimeout(() => {
          els[f].classList.remove('hint-glow');
          els[t].classList.remove('hint-glow');
        }, 1500);
        return;
      }
    }
  }
}

function updateScoreUI() {
  document.getElementById('scoreText').textContent = `Skor: ${state.score}`;
  document.getElementById('movesText').textContent = `Hamle: ${state.moves}`;
}

// ==================== ARAYÜZÜN ÇİZİLMESİ ====================
function render() {
  const area = document.getElementById('gameArea');
  area.innerHTML = '';
  const segH = 180 / state.maxH;
  state.tubes.forEach((tube, i) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'tube-wrapper';
    wrapper.onclick = () => selectTube(i);
    const cap = document.createElement('div');
    cap.className = 'tube-cap';
    wrapper.appendChild(cap);
    const outer = document.createElement('div');
    outer.className = 'tube-outer';
    if (state.selected === i) outer.classList.add('selected');
    for (let l = 0; l < tube.length; l++) {
      const col = COLORS[tube[l]];
      const seg = document.createElement('div');
      seg.style.cssText = `position:absolute;bottom:${l*segH}px;left:0;right:0;height:${segH}px;background:linear-gradient(to top,${col.hex},${col.light});border-radius:${l===0?'0 0 23px 23px':'0'}`;
      outer.appendChild(seg);
    }
    const label = document.createElement('div');
    label.className = 'tube-label';
    if (tube.length === state.maxH && tube.every(c => c === tube[0])) {
      label.textContent = '✓ ' + COLORS[tube[0]].name;
      label.style.color = COLORS[tube[0]].light;
    }
    wrapper.appendChild(outer);
    wrapper.appendChild(label);
    area.appendChild(wrapper);
  });
}

window.addEventListener('load', newGame);
