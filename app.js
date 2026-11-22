'use strict';

const $ = (id) => document.getElementById(id);
const STORAGE_KEY = 'wichteln-setup';

/* ---------- Link-Kodierung (Verschleierung, damit der Name nicht lesbar in der URL steht) ---------- */
const XOR_KEY = new TextEncoder().encode('Fröhliche Weihnachten & frohes Wichteln!');

function encode(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let bin = '';
  bytes.forEach((b, i) => { bin += String.fromCharCode(b ^ XOR_KEY[i % XOR_KEY.length]); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decode(str) {
  try {
    const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(bin, (c, i) => c.charCodeAt(0) ^ XOR_KEY[i % XOR_KEY.length]);
    const data = JSON.parse(new TextDecoder().decode(bytes));
    return data && typeof data.g === 'string' && typeof data.r === 'string' ? data : null;
  } catch {
    return null;
  }
}

/* ---------- Zufall & Auslosung ---------- */
function randInt(n) {
  // Gleichverteilte Zufallszahl 0..n-1 mit kryptographischem Zufall (ohne Modulo-Bias)
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / n) * n;
  do { crypto.getRandomValues(buf); } while (buf[0] >= limit);
  return buf[0] % n;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function drawPairs(names, exclusions) {
  const banned = new Set();
  exclusions.forEach(([a, b]) => { banned.add(a + '\n' + b); banned.add(b + '\n' + a); });

  // So lange neu mischen, bis niemand sich selbst oder einen Ausschluss zieht.
  for (let attempt = 0; attempt < 100000; attempt++) {
    const receivers = shuffle(names);
    const ok = names.every((g, i) => g !== receivers[i] && !banned.has(g + '\n' + receivers[i]));
    if (ok) return names.map((g, i) => ({ g, r: receivers[i] }));
  }
  return null;
}

/* ---------- Organisator-Ansicht ---------- */
const state = loadState();

function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (s && Array.isArray(s.names) && Array.isArray(s.exclusions)) return s;
  } catch { /* ignore */ }
  return { title: '', names: [], exclusions: [] };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function chip(text, onRemove) {
  const li = document.createElement('li');
  const span = document.createElement('span');
  span.textContent = text;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = '×';
  btn.title = 'Entfernen';
  btn.addEventListener('click', onRemove);
  li.append(span, btn);
  return li;
}

function renderSetup() {
  $('title').value = state.title;

  const names = $('names');
  names.replaceChildren(...state.names.map((n) => chip(n, () => removeName(n))));

  const exList = $('exclusions');
  exList.replaceChildren(...state.exclusions.map(([a, b], i) => chip(`${a} & ${b}`, () => {
    state.exclusions.splice(i, 1);
    changed();
  })));

  for (const sel of [$('exA'), $('exB')]) {
    const prev = sel.value;
    sel.replaceChildren(...state.names.map((n) => new Option(n, n)));
    if (state.names.includes(prev)) sel.value = prev;
  }
  if ($('exA').value === $('exB').value && state.names.length > 1) {
    $('exB').value = state.names.find((n) => n !== $('exA').value);
  }
  $('exForm').querySelectorAll('select, button').forEach((el) => { el.disabled = state.names.length < 2; });
}

function changed() {
  saveState();
  renderSetup();
  $('result').hidden = true; // alte Links sind nach Änderungen nicht mehr gültig
  $('error').textContent = '';
}

function removeName(name) {
  state.names = state.names.filter((n) => n !== name);
  state.exclusions = state.exclusions.filter(([a, b]) => a !== name && b !== name);
  changed();
}

function showError(msg) {
  $('error').textContent = msg;
}

function personalLink(pair) {
  const base = location.origin + location.pathname;
  return base + '#' + encode({ t: state.title, g: pair.g, r: pair.r });
}

function shareText(name, url) {
  return `🎄 Hallo ${name}! Hier ist dein persönlicher Wichtel-Link (nicht weitergeben!): ${url}`;
}

async function copy(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.append(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  const old = btn.textContent;
  btn.textContent = '✔ Kopiert';
  setTimeout(() => { btn.textContent = old; }, 1500);
}

function renderLinks(pairs) {
  const list = $('links');
  const sorted = [...pairs].sort((a, b) => a.g.localeCompare(b.g, 'de'));
  list.replaceChildren(...sorted.map((pair) => {
    const url = personalLink(pair);
    const li = document.createElement('li');
    const name = document.createElement('strong');
    name.textContent = pair.g;

    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn';
    copyBtn.type = 'button';
    copyBtn.textContent = 'Kopieren';
    copyBtn.addEventListener('click', () => copy(url, copyBtn));
    li.append(name, copyBtn);

    if (navigator.share) {
      const shareBtn = document.createElement('button');
      shareBtn.className = 'btn';
      shareBtn.type = 'button';
      shareBtn.textContent = 'Teilen';
      shareBtn.addEventListener('click', () => {
        navigator.share({ title: 'Wichteln 🎄', text: shareText(pair.g, url) }).catch(() => {});
      });
      li.append(shareBtn);
    }
    return li;
  }));

  $('copyAll').onclick = () => copy(sorted.map((p) => shareText(p.g, personalLink(p))).join('\n\n'), $('copyAll'));
  $('result').hidden = false;
  $('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function initSetup() {
  $('setup').hidden = false;
  renderSetup();

  $('title').addEventListener('input', (e) => {
    state.title = e.target.value.trim();
    saveState();
    $('result').hidden = true;
  });

  $('addForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('nameInput').value.trim().replace(/\s+/g, ' ');
    if (!name) return;
    if (state.names.some((n) => n.toLowerCase() === name.toLowerCase())) {
      showError(`„${name}“ ist schon dabei.`);
      return;
    }
    state.names.push(name);
    $('nameInput').value = '';
    changed();
    $('nameInput').focus();
  });

  $('exForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const a = $('exA').value;
    const b = $('exB').value;
    if (!a || !b || a === b) {
      showError('Bitte zwei verschiedene Personen wählen.');
      return;
    }
    const exists = state.exclusions.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
    if (!exists) state.exclusions.push([a, b]);
    changed();
  });

  $('drawBtn').addEventListener('click', () => {
    if (state.names.length < 3) {
      showError('Bitte mindestens 3 Personen eintragen.');
      return;
    }
    const pairs = drawPairs(state.names, state.exclusions);
    if (!pairs) {
      showError('Mit diesen Ausschlüssen ist keine Auslosung möglich. Bitte Ausschlüsse reduzieren.');
      return;
    }
    $('error').textContent = '';
    renderLinks(pairs);
  });
}

/* ---------- Teilnehmer-Ansicht ---------- */
function confetti() {
  const box = $('confetti');
  const colors = ['#d4af37', '#f3d77a', '#b3122e', '#ffffff', '#1f7a55'];
  for (let i = 0; i < 140; i++) {
    const piece = document.createElement('i');
    piece.style.left = Math.random() * 100 + 'vw';
    piece.style.background = colors[i % colors.length];
    piece.style.animationDuration = 2.5 + Math.random() * 2.5 + 's';
    piece.style.animationDelay = Math.random() * 0.8 + 's';
    piece.style.setProperty('--drift', Math.random() * 240 - 120 + 'px');
    piece.style.setProperty('--rot', Math.random() * 900 + 'deg');
    box.append(piece);
  }
  setTimeout(() => box.replaceChildren(), 6500);
}

function initReveal(data) {
  $('reveal').hidden = false;
  $('hello').textContent = `Hallo ${data.g}!`;
  if (data.t) $('eventTitle').textContent = data.t;
  $('receiver').textContent = data.r;
  document.title = `Wichteln – ${data.g} 🎄`;

  $('openBtn').addEventListener('click', () => {
    const gift = $('gift');
    $('openBtn').hidden = true;
    gift.classList.remove('idle');
    gift.classList.add('shake');
    setTimeout(() => {
      gift.classList.remove('shake');
      gift.classList.add('open');
    }, 900);
    setTimeout(() => {
      confetti();
      $('afterHint').hidden = false;
    }, 1700);
  }, { once: true });
}

/* ---------- Schnee ---------- */
function snow() {
  const box = $('snow');
  const count = window.innerWidth < 600 ? 35 : 70;
  for (let i = 0; i < count; i++) {
    const flake = document.createElement('span');
    const size = 2 + Math.random() * 6;
    const duration = 8 + Math.random() * 12;
    flake.style.width = flake.style.height = size + 'px';
    flake.style.left = Math.random() * 100 + 'vw';
    flake.style.opacity = 0.3 + Math.random() * 0.6;
    if (size > 5) flake.style.filter = 'blur(1px)';
    flake.style.animationDuration = duration + 's';
    flake.style.animationDelay = -Math.random() * duration + 's';
    flake.style.setProperty('--x', Math.random() * 80 - 40 + 'px');
    box.append(flake);
  }
}

/* ---------- Lichterkette am oberen Rahmen ---------- */
function garland() {
  document.querySelectorAll('.frame:not([hidden])').forEach((frame) => {
    let g = frame.querySelector('.garland');
    if (!g) {
      g = document.createElement('div');
      g.className = 'garland';
      g.setAttribute('aria-hidden', 'true');
      frame.prepend(g);
    }
    const inset = 22, y0 = 7, sag = 24;
    const width = frame.clientWidth;
    const swags = width < 480 ? 2 : 3;
    const seg = (width - inset * 2) / swags;
    const perSwag = 6;
    const colors = ['warm', 'red', 'gold'];

    let path = `M${inset} ${y0}`;
    let bulbs = '';
    let k = 0;
    let hooks = '';
    for (let i = 0; i <= swags; i++) hooks += `<circle cx="${inset + seg * i}" cy="${y0}" r="3.2" fill="url(#hookGold)" stroke="#6e5313" stroke-width=".8"/>`;
    for (let i = 0; i < swags; i++) {
      const x0 = inset + seg * i;
      path += ` Q${x0 + seg / 2} ${y0 + sag * 2} ${x0 + seg} ${y0}`;
      for (let j = 1; j < perSwag; j++) {
        const t = j / perSwag;
        const x = x0 + seg * t;
        const y = y0 + 4 * t * (1 - t) * sag;
        bulbs += `<span class="bulb ${colors[k % 3]}" style="left:${x}px;top:${y}px;animation-delay:${-((k * 0.73) % 3)}s"></span>`;
        k++;
      }
    }
    g.innerHTML = `<svg width="${width}" height="${y0 + sag + 4}"><path d="${path}" fill="none" stroke="#1b2a20" stroke-width="2" stroke-linecap="round"/><path d="${path}" fill="none" stroke="rgba(255,255,255,.12)" stroke-width=".8" transform="translate(0,-.6)"/><defs><radialGradient id="hookGold" cx=".35" cy=".3"><stop offset="0" stop-color="#fff3c4"/><stop offset="1" stop-color="#a8841f"/></radialGradient></defs>${hooks}</svg>${bulbs}`;
  });
}

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(garland, 150);
});

/* ---------- Start ---------- */
snow();
const hash = location.hash.slice(1);
if (hash) {
  const data = decode(hash);
  if (data) initReveal(data);
  else $('invalid').hidden = false;
} else {
  initSetup();
}
garland();
