import * as THREE from 'three';
import { buildWorld, colliders, stations, interiors, pois, seats, roadPaths, trashSpots, world, makeCar, mat, hitsCollider } from './world.js';
import { makeHuman, animateHuman, spawnNPCs, LINES, pick } from './people.js';
import * as G from './games.js';

// ---------- papéis / personagens ----------
const ROLES = {
  infantil: {
    name: 'Lulu', emo: '🧒', serie: '1º ano · Educação Infantil (5 anos)',
    look: { kid: true, scale: 0.6, shirt: '#ffd23f', pants: '#0a3d91', hairStyle: 'pony', backpack: '#e63946', hair: '#4a2c14' },
    walk: 3.3, run: 6, jump: 5, cam: 4.6, money: 6,
    intro: 'Você é a <b>Lulu</b>, do 1º ano do Infantil! A mamãe te deixou no portão. Corra para a sala antes do sinal das 08:00, brinque, faça amigos e conte piadas!',
    missions: [
      { id: 'aula', icon: '🏫', text: 'Chegar na sala do 1º ano antes do sinal (08:00)', type: 'reach', target: 'sala_inf', deadline: 480 },
      { id: 'rodinha', icon: '🎵', text: 'Participar da rodinha em inglês', type: 'act', target: 'rodinha', game: 'quizKid' },
      { id: 'lanche', icon: '🧀', text: 'Comer o lanche na cantina', type: 'act', target: 'cantina_balcao', game: 'snack' },
      { id: 'escorregador', icon: '🛝', text: 'Descer no escorregador do parquinho', type: 'act', target: 'escorregador', game: 'slide' },
      { id: 'amigos', icon: '🤝', text: 'Fazer 3 amigos (E para conversar)', type: 'count', key: 'talks', goal: 3 },
      { id: 'piada', icon: '😂', text: 'Fazer a turma rir com uma piada (J)', type: 'count', key: 'jokes', goal: 1 },
    ],
  },
  medio: {
    name: 'Pedro', emo: '🧑‍🎓', serie: '3º ano · Ensino Médio (17 anos)',
    look: { scale: 1, shirt: '#ffffff', pants: '#1b263b', hairStyle: 'curly', backpack: '#222', hair: '#0d0d0d' },
    walk: 4.2, run: 7.8, jump: 5.6, cam: 6.5, money: 12,
    intro: 'Você é o <b>Pedro</b>, do 3º ano do Médio. Ano de ENEM e IB! Chegue antes das 08:00, tire nota alta na prova, domine o pebolim e vire a pessoa mais popular da escola.',
    missions: [
      { id: 'aula', icon: '🏫', text: 'Chegar na sala do 3º EM antes das 08:00', type: 'reach', target: 'sala_em', deadline: 480 },
      { id: 'prova', icon: '📝', text: 'Tirar nota alta na prova (≥ 8) — sua carteira', type: 'act', target: 'sala_em_carteira', game: 'quizEM' },
      { id: 'pebolim', icon: '⚽', text: 'Vencer uma partida de pebolim no pátio', type: 'act', target: 'pebolim', game: 'foosball' },
      { id: 'lanche', icon: '🧀', text: 'Comer o lanche na cantina', type: 'act', target: 'cantina_balcao', game: 'snack' },
      { id: 'popular', icon: '⭐', text: 'Ser popular (popularidade ≥ 80)', type: 'stat', key: 'pop', goal: 80 },
      { id: 'piadas', icon: '😂', text: 'Contar 3 piadas que façam rir (J)', type: 'count', key: 'jokes', goal: 3 },
      { id: 'gol', icon: '🥅', text: 'Bônus: fazer um gol na quadra', type: 'count', key: 'goals', goal: 1 },
    ],
  },
  professora: {
    name: 'Profª Ana', emo: '👩‍🏫', serie: 'Professora de Física · 3º EM',
    look: { scale: 1.02, shirt: '#6d597a', pants: '#222', lanyard: true, glasses: true, hairStyle: 'long', hair: '#6b3e1f', trim: '#1b263b' },
    walk: 4, run: 7, jump: 5, cam: 6.5, money: 20,
    intro: 'Você é a <b>Profª Ana</b>, de Física. Pegue seu café na sala dos professores, chegue na sala do 3º EM antes das 08:00, dê uma aula incrível e corrija as provas!',
    missions: [
      { id: 'cafe', icon: '☕', text: 'Tomar um café na Sala dos Professores', type: 'act', target: 'cafe', game: 'coffee' },
      { id: 'aula', icon: '🏫', text: 'Chegar na sala do 3º EM antes das 08:00', type: 'reach', target: 'sala_em', deadline: 480 },
      { id: 'lousa', icon: '👩‍🏫', text: 'Dar a aula na lousa', type: 'act', target: 'sala_em_lousa', game: 'quizAula' },
      { id: 'provas', icon: '✏️', text: 'Corrigir as provas (Sala dos Professores)', type: 'act', target: 'provas', game: 'grading' },
      { id: 'lanche', icon: '🥪', text: 'Comer um lanche na cantina', type: 'act', target: 'cantina_balcao', game: 'snack' },
      { id: 'popular', icon: '⭐', text: 'Ser querida pelos alunos (popularidade ≥ 60)', type: 'stat', key: 'pop', goal: 60 },
      { id: 'piada', icon: '😂', text: 'Contar uma piada de física (J)', type: 'count', key: 'jokes', goal: 1 },
    ],
  },
  zelador: {
    name: 'Seu Zé', emo: '🧹', serie: 'Zelador · 22 anos de Dual',
    look: { scale: 1.03, shirt: '#2a9d8f', pants: '#264653', cap: '#264653', hairStyle: 'short', hair: '#9a9a9a', skin: '#c68642' },
    walk: 3.8, run: 6.5, jump: 4.5, cam: 6.5, money: 15,
    intro: 'Você é o <b>Seu Zé</b>, o zelador mais querido da Dual. Varra a quadra antes da Educação Física das 08:00, recolha o lixo, conserte o pebolim e espalhe alegria!',
    missions: [
      { id: 'quadra', icon: '🧹', text: 'Varrer a quadra antes das 08:00 (segure E)', type: 'act', target: 'quadra', hold: 4, holdText: 'Varrendo a quadra', deadline: 480 },
      { id: 'lixo', icon: '🗑️', text: 'Recolher o lixo do campus', type: 'count', key: 'trash', goal: 10 },
      { id: 'pebolim', icon: '🔧', text: 'Consertar o pebolim do pátio (segure E)', type: 'act', target: 'pebolim', hold: 5, holdText: 'Apertando os parafusos' },
      { id: 'lanche', icon: '☕', text: 'Tomar um café com pão de queijo', type: 'act', target: 'cantina_balcao', game: 'snack' },
      { id: 'piadas', icon: '😂', text: 'Contar 2 piadas que façam rir (J)', type: 'count', key: 'jokes', goal: 2 },
      { id: 'popular', icon: '⭐', text: 'Popularidade ≥ 50', type: 'stat', key: 'pop', goal: 50 },
    ],
  },
};

// ---------- render ----------
const container = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
container.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#9fd3ff');
scene.fog = new THREE.Fog('#bfe3ff', 180, 900);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 2500);
scene.add(new THREE.HemisphereLight('#dff1ff', '#5a7a3a', 1.2));
const sun = new THREE.DirectionalLight('#fff4dd', 2.2);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 300 });
sun.shadow.bias = -0.0005;
scene.add(sun, sun.target);
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });

buildWorld(scene);
for (const c of colliders) c.br = Math.hypot(c.hx, c.hz);

// ---------- estado ----------
const S = {
  role: null, running: false, time: 460, pop: 20, fome: 60, money: 10, nota: null,
  talks: 0, jokes: 0, goals: 0, trash: 0, missions: [], bellRang: false, ended: false, coffeeT: 0,
};
const player = { x: world.spawn.x, z: world.spawn.z, y: 0, vy: 0, heading: 0, speed: 0, mesh: null, radius: 0.35, onGround: true, kx: 0, kz: 0, riding: false, pose: 'stand', bubble: null, bubbleT: 0, busy: null };
let npcs = [];
let camYaw = 0, camPitch = 0.42, camDist = 6.5;
const keys = {};

// ---------- áudio ----------
let actx = null;
function beep(freq, dur = 0.15, type = 'sine', vol = 0.15, delay = 0) {
  if (!actx) return;
  const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + delay;
  o.type = type; o.frequency.value = freq; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur);
}
const sfx = {
  bell: () => { for (let k = 0; k < 3; k++) { beep(784, 0.5, 'triangle', 0.2, k * 0.9); beep(659, 0.6, 'triangle', 0.2, k * 0.9 + 0.45); } },
  win: () => [523, 659, 784, 1046].forEach((f, k) => beep(f, 0.25, 'square', 0.08, k * 0.1)),
  fail: () => [400, 300, 200].forEach((f, k) => beep(f, 0.3, 'sawtooth', 0.07, k * 0.15)),
  pick: () => { beep(880, 0.08, 'square', 0.06); beep(1320, 0.1, 'square', 0.06, 0.06); },
  honk: () => { beep(415, 0.25, 'square', 0.08); beep(349, 0.25, 'square', 0.08); },
  laugh: () => [700, 600, 700, 600, 500].forEach((f, k) => beep(f, 0.09, 'triangle', 0.07, k * 0.11)),
  kick: () => beep(120, 0.12, 'square', 0.12),
};

// ---------- colisão ----------
function resolve(ent, nx, nz, r, y) {
  let x = nx, z = nz, ground = 0;
  for (const c of colliders) {
    const dx = x - c.cx, dz = z - c.cz;
    if (Math.abs(dx) > c.br + r || Math.abs(dz) > c.br + r) continue;
    const co = Math.cos(c.a), si = Math.sin(c.a);
    let lx = dx * co + dz * si, lz = -dx * si + dz * co;
    const qx = Math.max(-c.hx, Math.min(c.hx, lx)), qz = Math.max(-c.hz, Math.min(c.hz, lz));
    const ex = lx - qx, ez = lz - qz, d = Math.hypot(ex, ez);
    if (d >= r) continue;
    if (y >= c.y1 - 0.4) { ground = Math.max(ground, c.y1); continue; }
    if (d > 1e-5) { lx = qx + (ex / d) * r; lz = qz + (ez / d) * r; }
    else { const px = c.hx - Math.abs(lx), pz = c.hz - Math.abs(lz); if (px < pz) lx = Math.sign(lx || 1) * (c.hx + r); else lz = Math.sign(lz || 1) * (c.hz + r); }
    x = c.cx + lx * co - lz * si; z = c.cz + lx * si + lz * co;
  }
  ent.x = x; ent.z = z; return ground;
}
const npcMove = (n, x, z) => resolve(n, x, z, n.radius, 0);

// ---------- objetos dinâmicos ----------
const ball = { x: world.ballStart.x, z: world.ballStart.z, y: 0.22, vx: 0, vy: 0, vz: 0, lastPlayer: false, resetT: 0 };
{
  const c = document.createElement('canvas'); c.width = 64; c.height = 32; const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, 64, 32); g.fillStyle = '#111'; for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(k * 12 + 4, (k % 2) * 16 + 8, 5, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c);
  ball.mesh = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), new THREE.MeshStandardMaterial({ map: t })); ball.mesh.castShadow = true; scene.add(ball.mesh);
}

const scooter = new THREE.Group();
{
  const deck = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.9), mat('#e63946')); deck.position.y = 0.12; scooter.add(deck);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.95, 6), mat('#ccc')); stem.position.set(0, 0.6, 0.42); stem.rotation.x = -0.15; scooter.add(stem);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 6), mat('#111')); bar.rotation.z = Math.PI / 2; bar.position.set(0, 1.06, 0.5); scooter.add(bar);
  for (const z of [-0.4, 0.42]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 10), mat('#111')); w.rotation.z = Math.PI / 2; w.position.set(0, 0.08, z); scooter.add(w); }
  scooter.traverse(o => o.castShadow = true);
  scooter.position.set(world.scooterSpot.x, 0, world.scooterSpot.z); scene.add(scooter);
}

// carros circulando (acesso é rua sem saída: fazem retorno)
const route = [...roadPaths.acesso, ...roadPaths.salvatina.slice(0, 22).reverse().slice(1)];
const cum = [0]; for (let i = 1; i < route.length; i++) cum.push(cum[i - 1] + Math.hypot(route[i][0] - route[i - 1][0], route[i][1] - route[i - 1][1]));
const routeLen = cum[cum.length - 1];
function routeAt(s) {
  s = Math.max(0, Math.min(routeLen - 0.01, s)); let i = 1; while (cum[i] < s) i++;
  const t = (s - cum[i - 1]) / (cum[i] - cum[i - 1]), a = route[i - 1], b = route[i];
  return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, an: Math.atan2(b[1] - a[1], b[0] - a[0]) };
}
const cars = ['#c1121f', '#ffffff', '#1e6fe0', '#ffbe0b', '#222'].map((col, k) => {
  const m = makeCar(col); scene.add(m);
  return { mesh: m, s: (k / 5) * routeLen, dir: k % 2 ? 1 : -1, v: 9 + k, vmax: 9 + k, honkT: 0, x: 0, z: 0, fx: 1, fz: 0, turnT: 0 };
});

const trashMeshes = [];
function spawnTrash() {
  trashSpots.forEach((p, k) => {
    const m = k % 3 === 0 ? new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.2, 8), mat('#c1121f', { metalness: 0.6, roughness: 0.3 }))
      : new THREE.Mesh(new THREE.IcosahedronGeometry(0.14, 0), mat(k % 2 ? '#f5f5f5' : '#c9a36b', { flatShading: true }));
    m.position.set(p.x, 0.15, p.z); m.castShadow = true; scene.add(m);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.55, 20), new THREE.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(p.x, 0.05, p.z); scene.add(ring);
    trashMeshes.push({ m, ring, x: p.x, z: p.z, got: false });
  });
}

// marcadores de missão
const markers = {};
function markerFor(id, color = '#ffd23f') {
  const g = new THREE.Group();
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1.6, 24, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }));
  cyl.position.y = 0.8; g.add(cyl);
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.7, 4), new THREE.MeshBasicMaterial({ color }));
  arrow.rotation.x = Math.PI; arrow.position.y = 3; g.add(arrow);
  g.userData.arrow = arrow; scene.add(g); markers[id] = g; return g;
}

// ---------- UI ----------
const $ = (id) => document.getElementById(id);
function toast(title, sub = '', color = '#ffd23f', ms = 2600) {
  const t = $('toast'); t.innerHTML = `${title}${sub ? `<small>${sub}</small>` : ''}`; t.style.color = color; t.classList.add('show');
  clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), ms);
}
const fmtTime = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`;
function renderMissions() {
  $('role-name').textContent = `${ROLES[S.role].emo} ${ROLES[S.role].name} — Missões`;
  $('mission-list').innerHTML = S.missions.map(m => {
    let extra = '';
    if (m.type === 'count' && !m.done) extra = ` <b>(${Math.min(S[m.key], m.goal)}/${m.goal})</b>`;
    if (m.type === 'stat' && !m.done) extra = ` <b>(${Math.floor(S[m.key])})</b>`;
    return `<li class="${m.done ? 'done' : m.failed ? 'fail' : ''}"><span class="ic">${m.done ? '✅' : m.failed ? '❌' : m.icon}</span><span>${m.text}${extra}</span></li>`;
  }).join('');
}
function updateHud() {
  const c = $('clock'); c.textContent = fmtTime(S.time);
  c.classList.toggle('late', S.time >= 475 && S.time < 480);
  $('bar-pop').style.width = `${S.pop}%`; $('bar-fome').style.width = `${S.fome}%`;
  $('nota').textContent = S.nota === null ? '—' : S.nota; $('money').textContent = `R$ ${S.money}`;
}
function addPop(v, why) { S.pop = Math.max(0, Math.min(100, S.pop + v)); if (why) toast(v > 0 ? `+${v} popularidade` : `${v} popularidade`, why, v > 0 ? '#6fe07a' : '#ff6b6b', 1500); }

function complete(m) {
  if (m.done || m.failed) return;
  m.done = true; sfx.win();
  toast('MISSÃO CUMPRIDA!', `${m.icon} ${m.text}`, '#ffd23f', 3000);
  if (markers[m.id]) { scene.remove(markers[m.id]); delete markers[m.id]; }
  renderMissions(); checkEnd();
}
function fail(m, why) {
  if (m.done || m.failed) return;
  m.failed = true; sfx.fail(); toast('ATRASADO! 😱', why, '#ff5a5a', 3500);
  if (markers[m.id]) { scene.remove(markers[m.id]); delete markers[m.id]; }
  addPop(-8); renderMissions(); checkEnd();
}
function checkEnd() {
  if (S.ended) return;
  if (S.missions.every(m => m.done || m.failed)) { S.ended = true; setTimeout(summary, 1600); }
}
async function summary(timeUp = false) {
  const done = S.missions.filter(m => m.done).length, total = S.missions.length;
  const stars = '⭐'.repeat(Math.max(1, Math.round((done / total) * 5)));
  const r = ROLES[S.role];
  $('overlay-box').innerHTML = `<h2>${timeUp ? '🔔 Fim do período!' : '🎉 Dia completo!'}</h2>
    <p style="font-size:30px;margin:4px 0">${stars}</p>
    <p>${r.emo} <b>${r.name}</b> cumpriu <b>${done}/${total}</b> missões às ${fmtTime(S.time)}.</p>
    <p>⭐ Popularidade: <b>${Math.floor(S.pop)}</b> · 📝 Nota: <b>${S.nota ?? '—'}</b> · 😂 Piadas: <b>${S.jokes}</b> · 🤝 Amigos: <b>${S.talks}</b></p>
    <div class="opts"><button id="s-again">🔁 Jogar com outro personagem</button><button id="s-cont">🚶 Continuar explorando a escola</button></div>`;
  $('overlay').classList.remove('hidden');
  $('s-again').onclick = () => location.reload();
  $('s-cont').onclick = () => G.closeOverlay();
}

// balões de fala
const bubbleEls = new Map();
function bubbleEl(key, cls) {
  let el = bubbleEls.get(key);
  if (!el) { el = document.createElement('div'); el.className = cls; $('bubbles').appendChild(el); bubbleEls.set(key, el); }
  return el;
}
const v3 = new THREE.Vector3();
function project(x, y, z) { v3.set(x, y, z).project(camera); return v3.z < 1 ? [(v3.x + 1) / 2 * innerWidth, (1 - v3.y) / 2 * innerHeight] : null; }
function updateBubbles() {
  const seen = new Set();
  const show = (key, cls, text, x, y, z) => {
    const p = project(x, y, z); if (!p) return;
    const el = bubbleEl(key, cls); if (el.textContent !== text) el.textContent = text;
    el.style.left = p[0] + 'px'; el.style.top = p[1] + 'px'; el.style.display = ''; seen.add(key);
  };
  for (const n of npcs) {
    const d = Math.hypot(n.x - player.x, n.z - player.z); if (d > 16) continue;
    const h = n.mesh.userData.height + (n.pose === 'sit' ? -0.4 : 0);
    if (n.bubble) show(n, 'bubble', n.bubble, n.x, h + 0.35, n.z);
    else if (d < 9) show(n, 'nametag', n.name + (n.talked ? ' 💙' : ''), n.x, h + 0.15, n.z);
  }
  if (player.bubble && player.bubbleT > 0) show('player', 'bubble', player.bubble, player.x, player.y + player.mesh.userData.height + 0.35, player.z);
  for (const [k, el] of bubbleEls) if (!seen.has(k)) el.style.display = 'none';
}

// minimapa
const mm = $('minimap').getContext('2d');
function drawMinimap() {
  const R = 110, sc = 1.0, rot = camYaw - Math.PI, co = Math.cos(rot), si = Math.sin(rot);
  const tm = (x, z) => { const dx = (x - player.x) * sc, dz = (z - player.z) * sc; return [R + dx * co - dz * si, R + dx * si + dz * co]; };
  mm.save(); mm.clearRect(0, 0, 220, 220);
  mm.beginPath(); mm.arc(R, R, R, 0, 7); mm.clip();
  mm.fillStyle = '#4f7d45'; mm.fillRect(0, 0, 220, 220);
  const poly = (pts, fill, stroke, lw = 1) => { mm.beginPath(); pts.forEach((p, i) => { const [a, b] = tm(p[0], p[1]); i ? mm.lineTo(a, b) : mm.moveTo(a, b); }); if (fill) { mm.closePath(); mm.fillStyle = fill; mm.fill(); } if (stroke) { mm.strokeStyle = stroke; mm.lineWidth = lw; mm.stroke(); } };
  poly(world.lot, '#d8d2c4');
  for (const p of Object.values(roadPaths)) { mm.lineCap = 'round'; mm.lineJoin = 'round'; poly(p, null, '#2e2e33', 7 * sc); }
  const rect = (f, hx, hz, fill) => poly([f.world(-hx, -hz), f.world(hx, -hz), f.world(hx, hz), f.world(-hx, hz)], fill);
  const ct = world.court; rect(ct.f, ct.L / 2, ct.W / 2, '#e76f51');
  for (const it of interiors) rect(it.frame, it.hx, it.hz, '#1e6fe0');
  mm.fillStyle = 'rgba(255,255,255,.8)'; for (const n of npcs) { const [a, b] = tm(n.x, n.z); mm.fillRect(a - 1.5, b - 1.5, 3, 3); }
  for (const c of cars) { const [a, b] = tm(c.x, c.z); mm.fillStyle = '#ff4'; mm.fillRect(a - 2.5, b - 2.5, 5, 5); }
  if (S.role === 'zelador') for (const t of trashMeshes) if (!t.got) { const [a, b] = tm(t.x, t.z); mm.fillStyle = '#9f9'; mm.beginPath(); mm.arc(a, b, 3, 0, 7); mm.fill(); }
  mm.restore();
  // marcadores (presos na borda estilo GTA)
  for (const m of S.missions) {
    if (m.done || m.failed || !m.target) continue;
    const st = stations[m.target]; let [a, b] = tm(st.x, st.z);
    const dx = a - R, dy = b - R, d = Math.hypot(dx, dy);
    if (d > R - 8) { a = R + dx / d * (R - 8); b = R + dy / d * (R - 8); }
    mm.fillStyle = m.deadline ? '#ff5a5a' : '#ffd23f'; mm.strokeStyle = '#000'; mm.lineWidth = 2;
    mm.beginPath(); mm.arc(a, b, 6, 0, 7); mm.fill(); mm.stroke();
  }
  // norte
  const [nx, ny] = (() => { const [a, b] = tm(player.x, player.z - 1000); const dx = a - R, dy = b - R, d = Math.hypot(dx, dy); return [R + dx / d * (R - 12), R + dy / d * (R - 12)]; })();
  mm.fillStyle = '#fff'; mm.font = 'bold 14px sans-serif'; mm.textAlign = 'center'; mm.textBaseline = 'middle'; mm.fillText('N', nx, ny);
  // jogador
  const hr = player.heading, fx = Math.sin(hr), fz = Math.cos(hr);
  const [ax, ay] = tm(player.x + fx * 7, player.z + fz * 7), [bx, by] = tm(player.x - fx * 4 + fz * 4, player.z - fz * 4 - fx * 4), [cx, cy] = tm(player.x - fx * 4 - fz * 4, player.z - fz * 4 + fx * 4);
  mm.fillStyle = '#fff'; mm.strokeStyle = '#000'; mm.beginPath(); mm.moveTo(ax, ay); mm.lineTo(bx, by); mm.lineTo(cx, cy); mm.closePath(); mm.fill(); mm.stroke();
}

// ---------- menu ----------
function buildMenu() {
  $('roles').innerHTML = Object.entries(ROLES).map(([k, r]) => `<button class="role" data-k="${k}"><div class="emo">${r.emo}</div><h4>${r.name}</h4><div class="serie">${r.serie}</div><ul>${r.missions.slice(0, 4).map(m => `<li>${m.text}</li>`).join('')}</ul></button>`).join('');
  document.querySelectorAll('.role').forEach(b => b.onclick = () => start(b.dataset.k));
}
buildMenu();

async function start(roleKey) {
  if (!actx) try { actx = new AudioContext(); } catch { }
  const r = ROLES[roleKey];
  S.role = roleKey; S.money = r.money;
  S.missions = r.missions.map(m => ({ ...m, done: false, failed: false, progress: 0 }));
  if (roleKey === 'zelador') { S.missions.find(m => m.id === 'lixo').goal = trashSpots.length; spawnTrash(); }
  player.mesh = makeHuman(r.look); scene.add(player.mesh);
  player.radius = r.look.kid ? 0.25 : 0.35;
  camDist = r.cam;
  // começa no portão, olhando para a escola
  player.heading = Math.atan2(world.gate.x - player.x, world.gate.z - player.z); camYaw = player.heading;
  npcs = spawnNPCs(scene, { pois, seats, stations }, roleKey);
  for (const m of S.missions) if (m.target) markerFor(m.id, m.deadline ? '#ff5a5a' : '#ffd23f');
  $('menu').classList.add('hidden'); $('hud').classList.remove('hidden');
  renderMissions(); updateHud();
  await G.message(`${r.emo} ${r.name}`, `<p>${r.intro}</p><p class="meta">🖱️ Clique na tela para girar a câmera com o mouse · WASD mover · Shift correr · Espaço pular · E interagir/conversar · J piada · F patinete</p>`, 'Bora! 🚀');
  S.running = true;
}

// ---------- input ----------
addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase(); keys[k] = true;
  if (G.overlayOpen() || !S.running) return;
  if (k === ' ') e.preventDefault();
  if (k === 'e' && !e.repeat) interact();
  if (k === 'j' && !e.repeat) tellJoke();
  if (k === 'f' && !e.repeat) toggleScooter();
  if (k === 'm' && !e.repeat) { if (confirm('Trocar de personagem? O dia recomeça.')) location.reload(); }
});
addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
renderer.domElement.addEventListener('click', () => { if (S.running && !G.overlayOpen()) renderer.domElement.requestPointerLock?.(); });
addEventListener('mousemove', (e) => {
  if (document.pointerLockElement !== renderer.domElement) return;
  camYaw -= e.movementX * 0.0028; camPitch = Math.max(0.05, Math.min(1.3, camPitch + e.movementY * 0.0022));
});
addEventListener('wheel', (e) => { camDist = Math.max(2.5, Math.min(16, camDist + Math.sign(e.deltaY) * 0.6)); });

// ---------- interação ----------
function nearestNPC(maxD = 2.4) {
  let best = null, bd = maxD;
  for (const n of npcs) { const d = Math.hypot(n.x - player.x, n.z - player.z); if (d < bd) { bd = d; best = n; } }
  return best;
}
function activeStationMission() {
  for (const m of S.missions) {
    if (m.type !== 'act' || m.done || m.failed) continue;
    const st = stations[m.target]; if (Math.hypot(st.x - player.x, st.z - player.z) < st.r + 0.6) return m;
  }
  // lanche extra mesmo depois da missão
  const c = stations.cantina_balcao; if (Math.hypot(c.x - player.x, c.z - player.z) < c.r + 0.6) return { id: 'snack-extra', game: 'snack', text: 'Comprar mais um lanche' };
  return null;
}
function playerSay(t, s = 2.5) { player.bubble = t; player.bubbleT = s; }

async function interact() {
  const m = activeStationMission();
  if (m && !m.hold) return runGame(m);
  if (m && m.hold) return; // segurar E é tratado no loop
  const n = nearestNPC();
  if (n) {
    n.heading = Math.atan2(player.x - n.x, player.z - n.z);
    const line = pick(LINES[n.kind] || LINES.teen).replace('{n}', n.name);
    playerSay(pick(['Oi, ' + n.name.split(' ')[0] + '!', 'E aí, tudo bem?', 'Hello!', 'Bom dia!']));
    setTimeout(() => n.say(line, 3.5), 500);
    if (!n.talked) { n.talked = true; S.talks++; addPop(5, `Nova amizade: ${n.name}`); renderMissions(); checkCounts(); }
    return;
  }
}

async function runGame(m) {
  S.running = false; document.exitPointerLock?.();
  const st = stations[m.target] || stations.cantina_balcao;
  let r;
  switch (m.game) {
    case 'quizEM': player.pose = 'sit'; r = await G.quizEM(); S.nota = r.nota; if (r.pass) { addPop(6); complete(m); } else toast('Nota ' + r.nota + '... 😬', 'Estude na biblioteca e tente de novo!', '#ff8a8a'); break;
    case 'quizKid': r = await G.quizKid(); addPop(4); if (r.pass) complete(m); else toast('Quase!', 'Tente a rodinha de novo', '#ff8a8a'); break;
    case 'quizAula': r = await G.quizAula(); if (r.pass) { addPop(12, 'A turma adorou a aula!'); complete(m); } else toast('Hmm...', 'A turma ficou confusa. Tente de novo!', '#ff8a8a'); break;
    case 'grading': r = await G.grading(); if (r.pass) complete(m); else toast('Muitos erros na correção!', 'Revise de novo', '#ff8a8a'); break;
    case 'snack': {
      r = await G.snack(S.money);
      if (r) { S.money -= r.price; S.fome = Math.min(100, S.fome + r.food); playerSay('Nham nham! ' + r.name.split(' ')[0]); sfx.pick(); const lm = S.missions.find(x => x.id === 'lanche'); if (lm) complete(lm); }
      break;
    }
    case 'foosball': {
      const opp = nearestNPC(8)?.name?.split(' ')[0] || pick(['Rafa', 'Gui', 'Duda']);
      r = await G.foosball(opp);
      if (r.win) { addPop(12, 'Campeão do pebolim!'); complete(m); } else addPop(2);
      break;
    }
    case 'coffee': await G.message('☕ Cafezinho', '<p>Você tomou um café coado fresquinho. Energia lá em cima! (corre mais rápido por 1 minuto)</p>'); S.coffeeT = 60; complete(m); break;
    case 'slide': S.running = true; slideAnim(m); return;
  }
  player.pose = 'stand';
  S.running = true;
}

function slideAnim(m) {
  const pf = world.playFrame;
  player.busy = { t: 0, m, from: pf.world(-3, 0), to: pf.world(1.2, 0) };
  player.heading = Math.atan2(player.busy.to[0] - player.busy.from[0], player.busy.to[1] - player.busy.from[1]);
  playerSay('Uhuuul! 🛝', 2);
}

let jokeCd = 0;
function tellJoke() {
  if (jokeCd > 0) return;
  const listeners = npcs.filter(n => Math.hypot(n.x - player.x, n.z - player.z) < 9);
  if (!listeners.length) { toast('Ninguém por perto...', 'Chegue perto de alguém para contar piada', '#fff', 1800); return; }
  jokeCd = 6;
  const [q, a] = pick(G.JOKES);
  playerSay(q, 2.4);
  listeners.forEach(n => n.heading = Math.atan2(player.x - n.x, player.z - n.z));
  setTimeout(() => playerSay(a, 2.6), 2300);
  setTimeout(() => {
    const ok = Math.random() < 0.55 + S.pop / 250;
    if (ok) {
      sfx.laugh();
      listeners.forEach(n => { n.say(pick(['KKKKKKK 😂', 'HAHAHA 🤣', 'Muito boa! 😆', 'LOL 😂', 'kkkk para 😭']), 3); n.cheerT = 1.5; });
      S.jokes++; addPop(Math.min(12, 4 + listeners.length * 2), `${listeners.length} pessoa(s) riram!`); renderMissions(); checkCounts();
    } else {
      listeners.forEach(n => n.say(pick(['...', 'Hã? 🤨', '🦗🦗🦗', 'Essa foi fraca 😅', 'Não entendi']), 2.5));
      addPop(-2, 'Ninguém riu...');
    }
  }, 4700);
}

function toggleScooter() {
  if (player.riding) { player.riding = false; scooter.position.set(player.x + Math.cos(player.heading) * 0.6, 0, player.z - Math.sin(player.heading) * 0.6); toast('🛴 Desceu do patinete', '', '#fff', 1000); return; }
  if (Math.hypot(scooter.position.x - player.x, scooter.position.z - player.z) < 2.5) { player.riding = true; toast('🛴 Patinete!', 'F para descer', '#fff', 1400); }
}

function checkCounts() {
  for (const m of S.missions) {
    if (m.done || m.failed) continue;
    if (m.type === 'count' && S[m.key] >= m.goal) complete(m);
    if (m.type === 'stat' && S[m.key] >= m.goal) complete(m);
  }
}

// ---------- loop ----------
const clock = new THREE.Clock();
let menuT = 0, hudT = 0;
function insideBuilding(x, z) {
  for (const it of interiors) { const [u, v] = it.frame.local(x, z); if (Math.abs(u) < it.hx && Math.abs(v) < it.hz) return it; }
  return null;
}

function update(dt) {
  const r = ROLES[S.role];
  // tempo
  S.time += dt * 0.5;
  S.fome = Math.max(0, S.fome - dt * 0.18);
  if (S.coffeeT > 0) S.coffeeT -= dt;
  if (!S.bellRang && S.time >= 480) { S.bellRang = true; sfx.bell(); toast('🔔 TRRRIM! 08:00', 'O sinal tocou — começou a aula!', '#fff', 3000); }
  if (!S.recreio && S.time >= 570) { S.recreio = true; sfx.bell(); toast('🔔 Recreio!', 'Hora do lanche e do pebolim', '#fff', 3000); }
  if (!S.ended && S.time >= 750) { S.ended = true; summary(true); }
  for (const m of S.missions) if (m.deadline && !m.done && !m.failed && S.time > m.deadline) fail(m, m.id === 'aula' ? 'A professora anotou na agenda...' : 'Passou do horário!');

  // movimento
  let ix = 0, iz = 0;
  if (keys['w']) iz += 1; if (keys['s']) iz -= 1; if (keys['a']) ix -= 1; if (keys['d']) ix += 1;
  if (keys['arrowleft']) camYaw += dt * 2.2; if (keys['arrowright']) camYaw -= dt * 2.2;
  if (keys['arrowup']) iz += 1; if (keys['arrowdown']) iz -= 1;
  const fwd = [Math.sin(camYaw), Math.cos(camYaw)], right = [-Math.cos(camYaw), Math.sin(camYaw)];
  let mx = fwd[0] * iz + right[0] * ix, mz = fwd[1] * iz + right[1] * ix; const ml = Math.hypot(mx, mz);
  let target = 0;
  if (ml > 0) {
    mx /= ml; mz /= ml;
    target = player.riding ? 11 : (keys['shift'] ? r.run : r.walk);
    if (S.coffeeT > 0) target *= 1.25;
    if (S.fome < 12) target *= 0.75;
    const want = Math.atan2(mx, mz); let diff = ((want - player.heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    player.heading += diff * Math.min(1, dt * (player.riding ? 6 : 12));
  }
  player.speed += (target - player.speed) * Math.min(1, dt * (player.riding ? 2.5 : 10));
  if (player.busy) { // escorregador
    const b = player.busy; b.t += dt; const st = stations.escorregador;
    const k = Math.min(1, b.t / 1.6);
    const e = Math.min(1, k * 1.6), s = Math.max(0, (k - 0.35) / 0.65);
    player.x = b.from[0] + (b.to[0] - b.from[0]) * s; player.z = b.from[1] + (b.to[1] - b.from[1]) * s;
    player.y = k < 0.35 ? 2.9 * e : 2.9 * (1 - s); player.pose = k < 0.35 ? 'stand' : 'air';
    if (k >= 1) { player.busy = null; player.pose = 'stand'; addPop(3); complete(b.m); }
  } else {
    const mvx = player.riding ? Math.sin(player.heading) : (ml > 0 ? mx : Math.sin(player.heading));
    const mvz = player.riding ? Math.cos(player.heading) : (ml > 0 ? mz : Math.cos(player.heading));
    const nx = player.x + (mvx * player.speed + player.kx) * dt, nz = player.z + (mvz * player.speed + player.kz) * dt;
    player.kx *= Math.pow(0.05, dt); player.kz *= Math.pow(0.05, dt);
    const ground = resolve(player, nx, nz, player.radius, player.y);
    if (keys[' '] && player.onGround) { player.vy = r.jump; player.onGround = false; }
    player.vy -= 15 * dt; player.y += player.vy * dt;
    if (player.y <= ground) { player.y = ground; player.vy = 0; player.onGround = true; } else if (player.y > ground + 0.05) player.onGround = false;
    player.pose = player.riding ? 'ride' : !player.onGround ? 'air' : 'stand';
  }
  player.mesh.position.set(player.x, player.y + (player.riding ? 0.15 : 0), player.z);
  player.mesh.rotation.y = player.heading;
  animateHuman(player.mesh, player.riding ? 0 : player.speed, dt, player.pose);
  if (player.riding) { scooter.position.set(player.x, player.y, player.z); scooter.rotation.y = player.heading; }
  if (player.bubbleT > 0) player.bubbleT -= dt;
  if (jokeCd > 0) jokeCd -= dt;

  // missões "reach" e "hold"
  let prompt = null;
  for (const m of S.missions) {
    if (m.done || m.failed || !m.target) continue;
    const st = stations[m.target]; const d = Math.hypot(st.x - player.x, st.z - player.z);
    if (m.type === 'reach' && d < st.r) complete(m);
    if (m.hold && d < st.r + 0.6) {
      if (keys['e']) { m.progress += dt; player.pose = 'talk'; } else m.progress = Math.max(0, m.progress - dt * 0.5);
      prompt = `<span class="kbd">E</span> segure: ${m.holdText}… <div class="progress"><i style="width:${Math.min(100, m.progress / m.hold * 100)}%"></i></div>`;
      if (m.progress >= m.hold) { complete(m); addPop(5, 'Todo mundo agradece, Seu Zé!'); }
    }
  }
  checkCounts();
  if (!prompt) {
    const am = activeStationMission();
    if (am) prompt = `<span class="kbd">E</span> ${am.text}`;
    else {
      const n = nearestNPC();
      if (n) prompt = `<span class="kbd">E</span> conversar com ${n.name} · <span class="kbd">J</span> contar piada`;
      else if (!player.riding && Math.hypot(scooter.position.x - player.x, scooter.position.z - player.z) < 2.5) prompt = `<span class="kbd">F</span> subir no patinete 🛴`;
    }
  }
  const pe = $('prompt'); if (prompt) { if (pe.innerHTML !== prompt) pe.innerHTML = prompt; pe.classList.remove('hidden'); } else pe.classList.add('hidden');

  // lixo
  for (const t of trashMeshes) {
    if (t.got) continue;
    t.m.rotation.y += dt * 2; t.ring.scale.setScalar(1 + Math.sin(performance.now() / 200) * 0.1);
    if (Math.hypot(t.x - player.x, t.z - player.z) < 1.3) { t.got = true; scene.remove(t.m, t.ring); S.trash++; sfx.pick(); toast(`🗑️ ${S.trash}/${trashSpots.length}`, 'Lixo recolhido!', '#6fe07a', 1000); renderMissions(); }
  }

  // NPCs
  for (const n of npcs) n.update(dt, pois, npcMove, player);
  // empurra NPCs para longe do jogador
  for (const n of npcs) {
    if (n.static) continue;
    const dx = n.x - player.x, dz = n.z - player.z, d = Math.hypot(dx, dz), min = n.radius + player.radius + 0.1;
    if (d < min && d > 0.001) { const [ox, oz] = [player.x, player.z]; resolve(player, player.x - dx / d * (min - d), player.z - dz / d * (min - d), player.radius, player.y); }
  }
  for (const n of npcs) if (n.static || n.state === 'sit') { const dx = player.x - n.x, dz = player.z - n.z, d = Math.hypot(dx, dz), min = n.radius + player.radius; if (d < min && d > 0.001) { player.x = n.x + dx / d * min; player.z = n.z + dz / d * min; } }

  updateBall(dt);
  updateCars(dt);

  // marcadores
  const t = performance.now() / 1000;
  for (const m of S.missions) {
    const mk = markers[m.id]; if (!mk) continue; const st = stations[m.target];
    mk.position.set(st.x, 0, st.z); mk.scale.set(st.r * 0.7, 1, st.r * 0.7);
    mk.userData.arrow.position.y = 2.8 + Math.sin(t * 3) * 0.25; mk.userData.arrow.rotation.y = t * 2;
    mk.userData.arrow.scale.set(1 / (st.r * 0.7), 1, 1 / (st.r * 0.7));
  }
  for (const s of world.swings) s.rotation.x = Math.sin(t * 1.8 + s.position.x) * 0.5;

  hudT -= dt; if (hudT <= 0) { hudT = 0.2; updateHud(); renderMissions(); }
}

function updateBall(dt) {
  const b = ball;
  if (b.resetT > 0) { b.resetT -= dt; if (b.resetT <= 0) { Object.assign(b, { x: world.ballStart.x, z: world.ballStart.z, y: 1.5, vx: 0, vz: 0, vy: 0 }); } }
  const kickers = [player, ...npcs.filter(n => !n.static && n.state === 'walk')];
  for (const k of kickers) {
    const dx = b.x - k.x, dz = b.z - k.z, d = Math.hypot(dx, dz);
    if (d < (k.radius || 0.35) + 0.3 && b.y < 0.8 && (k.y ?? 0) < 0.6) {
      const isP = k === player, sp = isP ? Math.max(4, player.speed * 1.7) : 4;
      b.vx = dx / d * sp; b.vz = dz / d * sp; b.vy = isP && keys['shift'] ? 3.5 : 1.8; b.lastPlayer = isP; if (isP) sfx.kick();
    }
  }
  b.vy -= 12 * dt;
  const nx = b.x + b.vx * dt, nz = b.z + b.vz * dt;
  if (hitsCollider(nx, nz, 0.2) && b.y < 2) { b.vx *= -0.6; b.vz *= -0.6; } else { b.x = nx; b.z = nz; }
  b.y += b.vy * dt; if (b.y < 0.22) { b.y = 0.22; b.vy = Math.abs(b.vy) > 1 ? -b.vy * 0.5 : 0; b.vx *= Math.pow(0.4, dt); b.vz *= Math.pow(0.4, dt); }
  b.mesh.position.set(b.x, b.y, b.z); b.mesh.rotation.x += b.vz * dt / 0.22; b.mesh.rotation.z -= b.vx * dt / 0.22;
  // gol?
  const ct = world.court, [u, v] = ct.f.local(b.x, b.z);
  if (b.resetT <= 0 && Math.abs(u) > ct.L / 2 - 1.5 && Math.abs(u) < ct.L / 2 + 0.3 && Math.abs(v) < 1.5 && b.y < 2) {
    b.resetT = 2.5;
    if (b.lastPlayer) { S.goals++; addPop(8, 'Golaço!'); toast('⚽ GOOOOOL!', 'A galera vibra!', '#ffd23f', 2500); sfx.win(); npcs.forEach(n => { if (Math.hypot(n.x - b.x, n.z - b.z) < 30) { n.cheerT = 2; n.say(pick(['GOOOL!', 'Uhuuu!', 'Que golaço! 🔥']), 2); } }); checkCounts(); }
  }
}

function updateCars(dt) {
  for (const c of cars) {
    // freia se tiver gente na frente
    const pos = routeAt(c.s);
    const an = pos.an + (c.dir < 0 ? Math.PI : 0), fx = Math.cos(an), fz = Math.sin(an);
    const lane = 1.8, x = pos.x - fz * lane, z = pos.z + fx * lane;
    const dx = player.x - x, dz = player.z - z, ahead = dx * fx + dz * fz, side = Math.abs(-dx * fz + dz * fx);
    let want = c.vmax;
    if (ahead > 0 && ahead < 9 && side < 2.2 && player.y < 2) { want = 0; if (c.honkT <= 0 && Math.hypot(dx, dz) < 12) { sfx.honk(); c.honkT = 3; } }
    for (const o of cars) if (o !== c && o.dir === c.dir && (o.s - c.s) * c.dir > 0 && (o.s - c.s) * c.dir < 10) want = 0;
    c.honkT -= dt;
    c.v += (want - c.v) * Math.min(1, dt * (want < c.v ? 4 : 1));
    c.s += c.v * c.dir * dt;
    if (c.s <= 0.5 || c.s >= routeLen - 0.5) { c.dir *= -1; c.s = Math.max(0.6, Math.min(routeLen - 0.6, c.s)); }
    c.x = x; c.z = z; c.fx = fx; c.fz = fz;
    c.mesh.position.set(x, 0, z);
    const tgtRot = -an; let diff = ((tgtRot - c.mesh.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    c.mesh.rotation.y += diff * Math.min(1, dt * 5);
    if (ahead > -2.3 && ahead < 2.3 && side < 1.2 && player.y < 1.5 && c.v > 2) {
      player.kx = fx * c.v * 1.2; player.kz = fz * c.v * 1.2; player.vy = 5; player.onGround = false;
      if (!c.hitT || c.hitT < performance.now()) { c.hitT = performance.now() + 2000; toast('🚗 Cuidado com o carro!', 'Olhe para os dois lados!', '#ff5a5a', 1800); addPop(-3); sfx.honk(); }
    }
  }
}

function updateCamera(dt) {
  const inside = insideBuilding(player.x, player.z);
  for (const it of interiors) it.upper.visible = it !== inside;
  const pitch = inside ? Math.max(camPitch, 0.95) : camPitch;
  const dist = inside ? Math.min(camDist, 6) : camDist;
  const h = player.mesh.userData.height * 0.8;
  const tx = player.x, ty = player.y + h, tz = player.z;
  const cx = tx - Math.sin(camYaw) * Math.cos(pitch) * dist, cy = ty + Math.sin(pitch) * dist, cz = tz - Math.cos(camYaw) * Math.cos(pitch) * dist;
  const camIn = insideBuilding(cx, cz); if (camIn && camIn !== inside) camIn.upper.visible = false;
  camera.position.lerp(new THREE.Vector3(cx, Math.max(0.4, cy), cz), Math.min(1, dt * 10));
  camera.lookAt(tx, ty, tz);
  sun.position.set(player.x + 60, 110, player.z + 30); sun.target.position.set(player.x, 0, player.z);
}

function loop() {
  const dt = Math.min(0.05, clock.getDelta());
  if (S.running && !G.overlayOpen()) { update(dt); updateCamera(dt); updateBubbles(); drawMinimap(); }
  else if (!S.role) {
    // câmera cinematográfica no menu
    menuT += dt * 0.08;
    const lf = world.lotFrame;
    camera.position.set(Math.cos(menuT) * 150, 70, Math.sin(menuT) * 110); camera.lookAt(0, 0, 0);
    sun.position.set(60, 110, 30); sun.target.position.set(0, 0, 0);
    sun.shadow.camera.left = -160; sun.shadow.camera.right = 160; sun.shadow.camera.top = 160; sun.shadow.camera.bottom = -160; sun.shadow.camera.updateProjectionMatrix();
    updateCars(dt);
  }
  if (S.role && sun.shadow.camera.right !== 70) { Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70 }); sun.shadow.camera.updateProjectionMatrix(); }
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
loop();
window.__dual = { S, player, stations, world, npcs: () => npcs };
