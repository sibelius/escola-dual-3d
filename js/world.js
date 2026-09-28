import * as THREE from 'three';
import { SCALE, LOT, BUILDINGS, ROADS } from './osm.js';

const S = SCALE;
export const P = ([x, z]) => [x * S, z * S];

export const colliders = []; // OBB {cx,cz,hx,hz,a,y0,y1}
export const stations = {};  // id -> {x,z,r,label}
export const interiors = []; // {frame,hx,hz,upper}
export const pois = [];      // pontos de passeio para NPCs
export const seats = [];     // lugares de alunos sentados
export const roadPaths = {};
export const trashSpots = [];
export const world = {};

// ---------- helpers ----------
const matCache = {};
export function mat(color, opts = {}) {
  const k = color + JSON.stringify(opts);
  if (!matCache[k]) matCache[k] = new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...opts });
  return matCache[k];
}

export function textTexture(lines, { w = 512, h = 128, bg = '#0a3d91', fg = '#fff', font = 'bold 56px Trebuchet MS', align = 'center', border = null } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
  if (border) { g.strokeStyle = border; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10); }
  g.fillStyle = fg; g.font = font; g.textAlign = align; g.textBaseline = 'middle';
  const arr = Array.isArray(lines) ? lines : [lines];
  const lh = h / (arr.length + 0.4);
  arr.forEach((t, i) => g.fillText(t, align === 'center' ? w / 2 : 24, lh * (i + 0.7)));
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}

function facadeTexture(repeatU) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#f4f6f8'; g.fillRect(0, 0, 256, 128);
  g.fillStyle = '#6fa8dc'; g.fillRect(18, 30, 220, 62);
  g.fillStyle = '#9cc7ee'; g.fillRect(18, 30, 220, 12);
  g.fillStyle = '#f4f6f8'; for (let x = 18; x < 240; x += 55) g.fillRect(x + 50, 30, 5, 62);
  g.fillStyle = '#0a3d91'; g.fillRect(0, 112, 256, 8); g.fillRect(0, 0, 10, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping; t.repeat.set(repeatU, 1);
  return t;
}

export class Frame {
  constructor(cx, cz, a, parent) {
    this.cx = cx; this.cz = cz; this.a = a;
    this.g = new THREE.Group(); this.g.position.set(cx, 0, cz); this.g.rotation.y = -a; parent.add(this.g);
  }
  world(u, v) { const c = Math.cos(this.a), s = Math.sin(this.a); return [this.cx + u * c - v * s, this.cz + u * s + v * c]; }
  local(x, z) { const c = Math.cos(this.a), s = Math.sin(this.a), dx = x - this.cx, dz = z - this.cz; return [dx * c + dz * s, -dx * s + dz * c]; }
  box(u, v, w, d, h, y, material, { collide = false, parent = this.g, rot = 0, cast = true } = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.position.set(u, y + h / 2, v); m.rotation.y = -rot; m.castShadow = cast; m.receiveShadow = true; parent.add(m);
    if (collide) { const [x, z] = this.world(u, v); colliders.push({ cx: x, cz: z, hx: w / 2, hz: d / 2, a: this.a + rot, y0: y, y1: y + h }); }
    return m;
  }
  cyl(u, v, r, h, y, material, { collide = false, parent = this.g, seg = 12 } = {}) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), material);
    m.position.set(u, y + h / 2, v); m.castShadow = true; m.receiveShadow = true; parent.add(m);
    if (collide) { const [x, z] = this.world(u, v); colliders.push({ cx: x, cz: z, hx: r, hz: r, a: 0, y0: y, y1: y + h }); }
    return m;
  }
  plane(u, v, w, h, y, tex, rotY = 0, parent = this.g) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }));
    m.position.set(u, y, v); m.rotation.y = rotY; parent.add(m); return m;
  }
  station(id, u, v, r, label) { const [x, z] = this.world(u, v); stations[id] = { id, x, z, r, label }; return stations[id]; }
}

export function pointInPoly(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

export function hitsCollider(x, z, pad = 0) {
  for (const c of colliders) {
    const co = Math.cos(c.a), si = Math.sin(c.a), dx = x - c.cx, dz = z - c.cz;
    const lx = dx * co + dz * si, lz = -dx * si + dz * co;
    if (Math.abs(lx) < c.hx + pad && Math.abs(lz) < c.hz + pad) return true;
  }
  return false;
}

function rectFrame(pts, parent) {
  let p = pts.map(P);
  const calc = () => {
    const e1 = [p[1][0] - p[0][0], p[1][1] - p[0][1]], e2 = [p[2][0] - p[1][0], p[2][1] - p[1][1]];
    return { e1, e2, a: Math.atan2(e1[1], e1[0]) };
  };
  let { e1, e2, a } = calc();
  if (e2[0] * -Math.sin(a) + e2[1] * Math.cos(a) < 0) { p = [p[0], p[3], p[2], p[1]]; ({ e1, e2, a } = calc()); }
  if (Math.hypot(...e2) > Math.hypot(...e1)) { p = [p[1], p[2], p[3], p[0]]; ({ e1, e2, a } = calc()); }
  const cx = p.reduce((s, q) => s + q[0], 0) / 4, cz = p.reduce((s, q) => s + q[1], 0) / 4;
  return { f: new Frame(cx, cz, a, parent), L: Math.hypot(...e1), W: Math.hypot(...e2) };
}

// ---------- Construção ----------
const FLOOR_H = 3.4, WALL_T = 0.3;

function makeBuilding(scene, { pts, floors, rooms, target, label }) {
  const { f, L, W } = rectFrame(pts, scene);
  const [, tv] = f.local(...target);
  const ds = tv >= 0 ? 1 : -1; // lado das portas
  const wall = mat('#f6f7f9'), trim = mat('#0a3d91'), glass = mat('#7fb6e8', { roughness: 0.2, metalness: 0.3 });
  const floorMat = mat('#e9e4da');

  f.box(0, 0, L, W, 0.04, -0.02, floorMat, { cast: false });

  // paredes externas
  const vDoor = ds * (W / 2 - WALL_T / 2), vBack = -vDoor;
  const bounds = rooms.map(r => [-L / 2 + r.from * L, -L / 2 + r.to * L]);
  const doors = bounds.map(([a, b]) => (a + b) / 2);
  // parede das portas com vãos
  let cur = -L / 2;
  for (const du of doors) {
    f.box((cur + du - 1.3) / 2, vDoor, du - 1.3 - cur, WALL_T, FLOOR_H, 0, wall, { collide: true });
    f.box(du, vDoor, 2.6, WALL_T, FLOOR_H - 2.6, 2.6, trim);
    cur = du + 1.3;
  }
  f.box((cur + L / 2) / 2, vDoor, L / 2 - cur, WALL_T, FLOOR_H, 0, wall, { collide: true });
  f.box(0, vBack, L, WALL_T, FLOOR_H, 0, wall, { collide: true });
  f.box(-L / 2 + WALL_T / 2, 0, WALL_T, W, FLOOR_H, 0, wall, { collide: true });
  f.box(L / 2 - WALL_T / 2, 0, WALL_T, W, FLOOR_H, 0, wall, { collide: true });
  // janelas decorativas externas
  for (let u = -L / 2 + 2.5; u < L / 2 - 2; u += 4) f.box(u, vBack - ds * 0.18, 2.6, 0.06, 1.3, 1.2, glass, { cast: false });
  for (const du of doors) {
    for (const off of [-3.4, 3.4]) if (Math.abs(du + off) < L / 2 - 1.5) f.box(du + off, vDoor + ds * 0.18, 2.2, 0.06, 1.3, 1.2, glass, { cast: false });
  }
  // divisórias internas com passagem
  bounds.slice(1).forEach(([a]) => {
    const gapV = -ds * (W / 2 - 2.2);
    const v0 = -W / 2, v1 = W / 2;
    const g0 = gapV - 0.9, g1 = gapV + 0.9;
    f.box(a, (v0 + g0) / 2, WALL_T, g0 - v0, FLOOR_H, 0, wall, { collide: true });
    f.box(a, (g1 + v1) / 2, WALL_T, v1 - g1, FLOOR_H, 0, wall, { collide: true });
  });

  // andares superiores (somem quando você entra)
  const upper = new THREE.Group(); f.g.add(upper);
  f.box(0, 0, L + 0.4, W + 0.4, 0.35, FLOOR_H, mat('#dfe3e8'), { parent: upper });
  const facade = new THREE.MeshStandardMaterial({ map: facadeTexture(Math.round(L / 5)), roughness: 0.6 });
  const facadeSide = new THREE.MeshStandardMaterial({ map: facadeTexture(Math.round(W / 5)), roughness: 0.6 });
  for (let i = 1; i < floors; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(L, FLOOR_H, W), [facadeSide, facadeSide, mat('#ddd'), mat('#ddd'), facade, facade]);
    m.position.set(0, FLOOR_H * i + FLOOR_H / 2 + 0.35, 0); m.castShadow = true; m.receiveShadow = true; upper.add(m);
  }
  const top = FLOOR_H * floors + 0.35;
  f.box(0, 0, L + 0.6, W + 0.6, 0.5, top - (floors === 1 ? 0 : 0), mat('#c9ced6'), { parent: upper });
  f.box(0, 0, L + 0.6, 0.6, 0.8, top, trim, { parent: upper });
  // placa DUAL na fachada
  const logo = textTexture(['DUAL'], { w: 512, h: 160, bg: '#0a3d91', font: 'bold 120px Arial Black' });
  f.plane(L * 0.28, ds * (W / 2 + 0.25), 7, 2.2, top - 1.4, logo, ds > 0 ? 0 : Math.PI, upper);
  if (label) {
    const lt = textTexture([label], { w: 1024, h: 128, bg: '#ffffff', fg: '#0a3d91', font: 'bold 64px Trebuchet MS' });
    f.plane(-L * 0.15, ds * (W / 2 + 0.25), 12, 1.5, top - 1.4, lt, ds > 0 ? 0 : Math.PI, upper);
  }

  interiors.push({ frame: f, hx: L / 2, hz: W / 2, upper });

  // cômodos
  rooms.forEach((r, i) => {
    const [a, b] = bounds[i];
    const room = { f, u0: a, u1: b, uc: (a + b) / 2, w: b - a, W, ds, id: r.id, name: r.name };
    // placa sobre a porta
    const t = textTexture([r.name], { w: 512, h: 96, font: 'bold 44px Trebuchet MS' });
    f.plane(room.uc, ds * (W / 2 + 0.02), 3.6, 0.7, 3.0, t, ds > 0 ? 0 : Math.PI);
    f.station(r.id, room.uc, 0, Math.min(room.w, W) / 2 - 1, r.name);
    const [dx, dz] = f.world(room.uc, ds * (W / 2 + 3));
    pois.push({ x: dx, z: dz, name: r.name });
    ROOM_BUILDERS[r.type]?.(room);
  });
  return { f, L, W, ds };
}

const lousaTex = (txt) => textTexture(txt, { w: 1024, h: 384, bg: '#1f4d3a', fg: '#f4f4e8', font: '52px Comic Sans MS', border: '#8a5a2b' });

const ROOM_BUILDERS = {
  sala(r) {
    const { f, uc, w, W, ds, id } = r;
    const back = -ds * (W / 2 - 0.35);
    const lines = id === 'sala_em' ? ['Physics — 3rd year', 'v = Δs / Δt', 'ENEM is coming! 💪'] : ['Math — 7º ano', '2x + 4 = 10  →  x = ?', 'Homework: p. 42'];
    f.plane(uc, back, 6, 2.2, 1.9, lousaTex(lines), ds > 0 ? 0 : Math.PI);
    f.box(uc + w / 2 - 2.2, back + ds * 1.6, 1.8, 0.9, 0.78, 0, mat('#7a5230'), { collide: true });
    const desk = mat('#d9b98c'), chair = mat('#1e6fe0');
    let n = 0;
    for (let row = 0; row < 3; row++) for (let col = -2; col <= 2; col++) {
      const u = uc + col * 2.3, v = back + ds * (4 + row * 2.4);
      if (Math.abs(u - uc) > w / 2 - 1) continue;
      f.box(u, v, 1.1, 0.65, 0.76, 0, desk, { collide: true });
      f.box(u, v + ds * 0.7, 0.5, 0.5, 0.45, 0, chair);
      const [x, z] = f.world(u, v + ds * 0.72);
      seats.push({ x, z, room: id, face: ds > 0 ? Math.PI - f.a : -f.a, idx: n++ });
    }
    f.station(id + '_carteira', uc + 2.3, back + ds * 4.7, 1.3, 'sua carteira');
    f.station(id + '_lousa', uc, back + ds * 1.2, 1.5, 'lousa');
  },
  professores(r) {
    const { f, uc, w, W, ds, id } = r;
    f.box(uc, 0, w * 0.5, 2.2, 0.78, 0, mat('#8b5e3c'), { collide: true });
    for (let k = -2; k <= 2; k++) { f.box(uc + k * 1.3, 1.6, 0.5, 0.5, 0.45, 0, mat('#333')); f.box(uc + k * 1.3, -1.6, 0.5, 0.5, 0.45, 0, mat('#333')); }
    const back = -ds * (W / 2 - 0.6);
    f.box(uc + w / 2 - 1.5, back, 1.2, 0.8, 1.0, 0, mat('#444'), { collide: true });
    f.box(uc + w / 2 - 1.5, back, 0.5, 0.5, 0.5, 1.0, mat('#b22222'));
    f.station('cafe', uc + w / 2 - 1.5, back + ds * 1.3, 1.4, 'máquina de café');
    f.box(uc - w / 2 + 2, back + ds * 0.5, 3.2, 1.0, 0.8, 0, mat('#3d5a80'), { collide: true });
    f.plane(uc, back + ds * 0.3 - ds * 0.05, 4, 1.3, 2.0, textTexture(['Sala dos Professores', 'Reunião IB: 16h'], { w: 512, h: 170, bg: '#fff8dc', fg: '#333', font: 'bold 36px Trebuchet MS' }), ds > 0 ? 0 : Math.PI);
    f.station('provas', uc, ds * 1.6, 1.4, 'pilha de provas');
    f.box(uc, 0, 0.6, 0.45, 0.25, 0.78, mat('#fffef0'));
  },
  cantina(r) {
    const { f, uc, w, W, ds } = r;
    const back = -ds * (W / 2 - 1.8);
    f.station('cantina_staff', uc, -ds * (W / 2 - 0.7), 0.5, '');
    f.box(uc, back, w * 0.6, 1.2, 1.05, 0, mat('#0a3d91'), { collide: true });
    f.box(uc, back, w * 0.6, 1.3, 0.08, 1.05, mat('#dcdcdc'));
    const foods = ['#f2c14e', '#e76f51', '#90be6d', '#f4a261', '#ffffff', '#c1121f'];
    for (let k = 0; k < 10; k++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), mat(foods[k % foods.length]));
      m.position.set(uc - w * 0.27 + k * (w * 0.06), 1.25, back); f.g.add(m);
    }
    f.plane(uc, -ds * (W / 2 - 0.2), 6, 2, 2.4, textTexture(['CANTINA DUAL', 'Pão de queijo R$4 · Suco R$3', 'Fruta R$2 · Sanduíche R$6'], { w: 1024, h: 340, bg: '#ffd23f', fg: '#0a3d91', font: 'bold 56px Trebuchet MS' }), ds > 0 ? 0 : Math.PI);
    f.station('cantina_balcao', uc, back + ds * 1.5, 1.8, 'balcão da cantina');
    for (let row = 0; row < 2; row++) for (let col = -1; col <= 1; col++) {
      const u = uc + col * 6, v = ds * (0.5 + row * 3.4);
      f.box(u, v, 3.2, 1.1, 0.75, 0, mat('#f5f0e6'), { collide: true });
      f.box(u, v - 0.95, 3.2, 0.4, 0.45, 0, mat('#1e6fe0'), { collide: true });
      f.box(u, v + 0.95, 3.2, 0.4, 0.45, 0, mat('#1e6fe0'), { collide: true });
      const [x, z] = f.world(u, v - 0.95); seats.push({ x, z, room: 'cantina', face: -f.a, idx: row * 3 + col });
    }
  },
  infantil(r) {
    const { f, uc, w, W, ds, id } = r;
    const rug = new THREE.Mesh(new THREE.CircleGeometry(2.6, 32), mat('#ff9f1c')); rug.rotation.x = -Math.PI / 2; rug.position.set(uc - 2, 0.03, 0); f.g.add(rug);
    const cols = ['#e63946', '#2a9d8f', '#f4a261', '#8338ec', '#ffbe0b'];
    for (let k = 0; k < 4; k++) {
      const u = uc + 3 + (k % 2) * 3, v = -1.8 + Math.floor(k / 2) * 3.6;
      f.box(u, v, 1.6, 1.2, 0.5, 0, mat(cols[k]), { collide: true });
      for (const o of [-1, 1]) f.box(u + o * 1.1, v, 0.35, 0.35, 0.28, 0, mat(cols[(k + 2) % 5]));
    }
    for (let k = 0; k < 14; k++) f.box(uc - 2 + Math.sin(k * 2.1) * 1.8, Math.cos(k * 1.3) * 1.8, 0.3, 0.3, 0.3, (k % 3) * 0.3, mat(cols[k % 5]));
    f.plane(uc, -ds * (W / 2 - 0.2), 6, 1.4, 1.8, textTexture(['A B C D E F G', 'Hello! Olá! 🌈'], { w: 1024, h: 240, bg: '#fff', fg: '#e63946', font: 'bold 70px Comic Sans MS' }), ds > 0 ? 0 : Math.PI);
    f.station('rodinha', uc - 2, 0, 1.8, 'rodinha');
    f.station(id + '_carteira', uc + 3, -1.8, 1.4, 'sua mesinha');
    const [rx, rz] = f.world(uc - 2, 0);
    [[-2, -2.0], [-0.3, 1.2], [-3.8, 1.0]].forEach(([du, dv], k) => { const [x, z] = f.world(uc + du, dv); seats.push({ x, z, room: id, face: Math.atan2(rx - x, rz - z), idx: k, kid: true }); });
  },
  biblioteca(r) {
    const { f, uc, w, W, ds } = r;
    const back = -ds * (W / 2 - 0.6);
    const bookCols = ['#c1121f', '#1e6fe0', '#2a9d8f', '#ffbe0b', '#6a4c93', '#f77f00'];
    for (let s = -2; s <= 2; s++) {
      const u = uc + s * 2.6;
      f.box(u, back, 2.2, 0.6, 2.4, 0, mat('#6b4423'), { collide: true });
      for (let sh = 0; sh < 4; sh++) for (let b = 0; b < 8; b++) f.box(u - 0.95 + b * 0.27, back + ds * 0.2, 0.2, 0.3, 0.42, 0.15 + sh * 0.58, mat(bookCols[(b + sh + s + 12) % 6]), { cast: false });
    }
    for (const k of [-1, 1]) f.box(uc + k * 3.2, ds * 2.5, 2.6, 1.3, 0.75, 0, mat('#d9b98c'), { collide: true });
    f.station('livros', uc, back + ds * 1.5, 1.6, 'estante de livros');
  },
};

// ---------- Quadra, pátio, parquinho ----------
function courtTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 560; const g = c.getContext('2d');
  g.fillStyle = '#1e6fe0'; g.fillRect(0, 0, 1024, 560);
  g.fillStyle = '#e76f51'; g.fillRect(60, 60, 904, 440);
  g.strokeStyle = '#fff'; g.lineWidth = 8; g.strokeRect(60, 60, 904, 440);
  g.beginPath(); g.moveTo(512, 60); g.lineTo(512, 500); g.stroke();
  g.beginPath(); g.arc(512, 280, 70, 0, Math.PI * 2); g.stroke();
  g.strokeRect(60, 170, 110, 220); g.strokeRect(854, 170, 110, 220);
  g.fillStyle = 'rgba(255,255,255,.85)'; g.font = 'bold 60px Arial Black'; g.textAlign = 'center'; g.fillText('DUAL', 512, 300);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function makeCourt(scene, cx, cz, a) {
  const f = new Frame(cx, cz, a, scene);
  const L = 30, W = 17;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(L, W), new THREE.MeshStandardMaterial({ map: courtTexture(), roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.03; floor.receiveShadow = true; f.g.add(floor);
  const white = mat('#ffffff');
  for (const s of [-1, 1]) {
    const u = s * (L / 2 - 1.5);
    f.cyl(u, -1.6, 0.08, 2.1, 0, white, { collide: true }); f.cyl(u, 1.6, 0.08, 2.1, 0, white, { collide: true });
    f.box(u, 0, 0.16, 3.36, 0.16, 2.1, white);
    const net = f.box(u + s * 0.6, 0, 1.2, 3.2, 2.0, 0, new THREE.MeshStandardMaterial({ color: '#fff', transparent: true, opacity: 0.25 }));
    net.castShadow = false;
    // tabela de basquete
    f.cyl(s * (L / 2 + 0.6), 0, 0.12, 3.9, 0, mat('#555'), { collide: true });
    f.box(s * (L / 2 + 0.3), 0, 0.1, 1.8, 1.1, 3.4, white);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.03, 6, 16), mat('#ff6b00')); ring.rotation.x = Math.PI / 2; ring.position.set(s * (L / 2 - 0.1), 3.05, 0); f.g.add(ring);
  }
  // arquibancada
  for (let k = 0; k < 3; k++) f.box(0, -(W / 2 + 1 + k * 0.8), L * 0.6, 0.8, 0.45 * (k + 1), 0, mat(k % 2 ? '#0a3d91' : '#dfe3e8'), { collide: true });
  f.station('quadra', 0, 0, 6, 'quadra');
  const [bx, bz] = f.world(3, 0); world.ballStart = { x: bx, z: bz };
  world.court = { f, L, W };
  for (const [u, v] of [[-8, 4], [8, -4], [0, W / 2 - 1]]) { const [x, z] = f.world(u, v); pois.push({ x, z, name: 'quadra' }); }
  return f;
}

function foosball(f, u, v, rot = 0) {
  const t = new THREE.Group(); t.position.set(u, 0, v); t.rotation.y = rot; f.g.add(t);
  const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; t.add(o); return o; };
  add(new THREE.BoxGeometry(1.5, 0.3, 0.85), mat('#5c3a1e'), 0, 0.85, 0);
  add(new THREE.BoxGeometry(1.4, 0.02, 0.75), mat('#2d8a3e'), 0, 1.0, 0);
  for (const s of [-1, 1]) for (const z of [-0.3, 0.3]) add(new THREE.BoxGeometry(0.1, 0.7, 0.1), mat('#3b2412'), s * 0.65, 0.35, z);
  for (let k = 0; k < 6; k++) {
    const x = -0.6 + k * 0.24;
    const rod = add(new THREE.CylinderGeometry(0.015, 0.015, 1.3, 6), mat('#ccc'), x, 1.08, 0); rod.rotation.x = Math.PI / 2;
    for (let p = -1; p <= 1; p++) add(new THREE.BoxGeometry(0.04, 0.12, 0.05), mat(k % 2 ? '#1e6fe0' : '#e63946'), x, 1.05, p * 0.22);
  }
  const [x, z] = f.world(u, v); colliders.push({ cx: x, cz: z, hx: 0.75, hz: 0.45, a: f.a + rot, y0: 0, y1: 1.0 });
  return t;
}

function makePatio(scene, cx, cz, a) {
  const f = new Frame(cx, cz, a, scene);
  const L = 16, W = 11;
  f.box(0, 0, L, W, 0.05, 0, mat('#b8b2a7'), { cast: false });
  for (const s of [-1, 1]) for (const t of [-1, 1]) f.cyl(s * (L / 2 - 0.4), t * (W / 2 - 0.4), 0.18, 4.2, 0, mat('#0a3d91'), { collide: true });
  const roof = f.box(0, 0, L + 1, W + 1, 0.15, 4.2, new THREE.MeshStandardMaterial({ color: '#cfe6ff', transparent: true, opacity: 0.55 }));
  roof.castShadow = false;
  world.patioRoof = roof;
  foosball(f, -3.5, -2, 0); foosball(f, -3.5, 2, 0);
  f.station('pebolim', -3.5, -2, 1.8, 'mesa de pebolim');
  // ping-pong
  f.box(4, 0, 2.7, 1.5, 0.76, 0, mat('#1a5e9a'), { collide: true });
  f.box(4, 0, 0.03, 1.6, 0.16, 0.76, mat('#fff'));
  for (const s of [-1, 1]) f.box(s * 6.5, 0, 0.5, 3, 0.45, 0, mat('#8b5e3c'), { collide: true });
  for (const [u, v] of [[0, 3], [2, -3], [-6, 0]]) { const [x, z] = f.world(u, v); pois.push({ x, z, name: 'pátio' }); }
  return f;
}

function makePlayground(scene, cx, cz, a) {
  const f = new Frame(cx, cz, a, scene);
  world.playFrame = f;
  const floor = new THREE.Mesh(new THREE.CircleGeometry(9, 40), mat('#43aa8b')); floor.rotation.x = -Math.PI / 2; floor.position.y = 0.03; floor.receiveShadow = true; f.g.add(floor);
  const sand = new THREE.Mesh(new THREE.CircleGeometry(2.2, 24), mat('#f2d49b')); sand.rotation.x = -Math.PI / 2; sand.position.set(4, 0.05, 3); f.g.add(sand);
  // escorregador
  f.box(-3, 0, 1.6, 1.6, 0.12, 1.8, mat('#ffbe0b'));
  for (const s of [-1, 1]) for (const t of [-1, 1]) f.cyl(-3 + s * 0.75, t * 0.75, 0.07, 2.8, 0, mat('#e63946'), { collide: true });
  f.box(-3, 0, 1.8, 1.8, 0.1, 2.8, mat('#e63946'));
  const slide = f.box(-0.8, 0, 3.2, 0.9, 0.08, 0.9, mat('#1e6fe0')); slide.rotation.z = -0.5;
  for (let k = 0; k < 5; k++) f.box(-4.1, 0, 0.12, 0.8, 0.06, 0.35 * k, mat('#ffffff'));
  f.station('escorregador', -3, 1.6, 1.8, 'escorregador');
  // balanço
  for (const s of [-1, 1]) { const p = f.box(2 + s * 2, -4, 0.12, 0.12, 2.5, 0, mat('#8338ec'), { collide: true }); }
  f.box(2, -4, 4.2, 0.12, 0.12, 2.5, mat('#8338ec'));
  world.swings = [];
  for (const s of [-1, 1]) {
    const g = new THREE.Group(); g.position.set(2 + s * 0.8, 2.5, -4); f.g.add(g);
    const ropeM = mat('#444');
    for (const o of [-0.22, 0.22]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.9, 0.03), ropeM); r.position.set(o, -0.95, 0); g.add(r); }
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.3), mat('#ffbe0b')); seat.position.y = -1.9; g.add(seat);
    world.swings.push(g);
  }
  for (const [u, v] of [[4, 3], [0, -2], [-5, 3]]) { const [x, z] = f.world(u, v); pois.push({ x, z, name: 'parquinho', kids: true }); }
  return f;
}

// ---------- vizinhança ----------
export function makeCar(color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.8, 1.8), mat(color, { roughness: 0.4, metalness: 0.4 })); body.position.y = 0.7; body.castShadow = true; g.add(body);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 1.6), mat('#9cc7ee', { roughness: 0.1, metalness: 0.5 })); cab.position.set(-0.2, 1.4, 0); cab.castShadow = true; g.add(cab);
  const wm = mat('#111');
  for (const x of [-1.35, 1.35]) for (const z of [-0.9, 0.9]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.25, 12), wm); w.rotation.x = Math.PI / 2; w.position.set(x, 0.36, z); g.add(w); }
  for (const z of [-0.6, 0.6]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.15, 0.3), mat('#fff8c0', { emissive: '#fff8c0', emissiveIntensity: 0.6 })); l.position.set(2.11, 0.8, z); g.add(l); }
  return g;
}

function ribbon(scene, pts, width, color, y = 0.02) {
  const pos = [], idx = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
    const nx = -dz / l * width / 2, nz = dx / l * width / 2;
    pos.push(pts[i][0] + nx, y, pts[i][1] + nz, pts[i][0] - nx, y, pts[i][1] - nz);
    if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); }
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat(color, { side: THREE.DoubleSide })); m.receiveShadow = true; scene.add(m); return m;
}

function tree(scene, x, z, s = 1) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const t = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * s, 0.25 * s, 2.4 * s, 7), mat('#6b4423')); t.position.y = 1.2 * s; t.castShadow = true; g.add(t);
  const greens = ['#2d6a4f', '#40916c', '#52b788', '#1b4332'];
  for (let k = 0; k < 3; k++) {
    const c = new THREE.Mesh(new THREE.IcosahedronGeometry((1.4 - k * 0.2) * s, 0), mat(greens[(Math.abs(Math.round(x * 7 + z * 3)) + k) % 4], { flatShading: true }));
    c.position.set(Math.sin(k * 2) * 0.5 * s, (2.6 + k * 0.7) * s, Math.cos(k * 2) * 0.5 * s); c.castShadow = true; g.add(c);
  }
  scene.add(g);
  colliders.push({ cx: x, cz: z, hx: 0.3 * s, hz: 0.3 * s, a: 0, y0: 0, y1: 5 });
}

function fence(scene, lot, gate) {
  const post = mat('#0a3d91'), panel = new THREE.MeshStandardMaterial({ color: '#dfe7f2', transparent: true, opacity: 0.35, side: THREE.DoubleSide });
  for (let i = 0; i < lot.length; i++) {
    const a = lot[i], b = lot[(i + 1) % lot.length];
    const segs = (i === gate.edge) ? [[a, gate.p0], [gate.p1, b]] : [[a, b]];
    for (const [p, q] of segs) {
      const dx = q[0] - p[0], dz = q[1] - p[1], l = Math.hypot(dx, dz), an = Math.atan2(dz, dx);
      const cx = (p[0] + q[0]) / 2, cz = (p[1] + q[1]) / 2;
      const m = new THREE.Mesh(new THREE.BoxGeometry(l, 2.0, 0.05), panel); m.position.set(cx, 1.0, cz); m.rotation.y = -an; scene.add(m);
      const top = new THREE.Mesh(new THREE.BoxGeometry(l, 0.1, 0.1), post); top.position.set(cx, 2.05, cz); top.rotation.y = -an; scene.add(top);
      for (let t = 0; t <= l; t += 3) { const pm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.1, 0.12), post); pm.position.set(p[0] + dx * t / l, 1.05, p[1] + dz * t / l); pm.castShadow = true; scene.add(pm); }
      colliders.push({ cx, cz, hx: l / 2, hz: 0.2, a: an, y0: 0, y1: 2.1 });
    }
  }
}

function makeNeighborhood(scene, lot) {
  const rnd = mulberry(7);
  const cols = ['#f1e3d3', '#e9c46a', '#f4a261', '#a8dadc', '#e5e5e5', '#ffd6a5', '#cdb4db'];
  const near = (x, z) => Object.values(roadPaths).some(path => path.some(([px, pz]) => Math.hypot(px - x, pz - z) < 16));
  let placed = 0;
  for (let tries = 0; tries < 900 && placed < 120; tries++) {
    const ang = rnd() * Math.PI * 2, d = 60 + rnd() * 260;
    const x = Math.cos(ang) * d * 1.3, z = Math.sin(ang) * d;
    if (pointInPoly(x, z, lot) || near(x, z) || hitsCollider(x, z, 10)) continue;
    const tall = rnd() < 0.18, w = tall ? 16 + rnd() * 8 : 8 + rnd() * 8, dpt = tall ? 14 + rnd() * 6 : 7 + rnd() * 6;
    const h = tall ? 20 + rnd() * 20 : 3.5 + Math.floor(rnd() * 2) * 3;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, dpt), tall ? new THREE.MeshStandardMaterial({ map: facadeTexture(3), roughness: 0.7 }) : mat(cols[Math.floor(rnd() * cols.length)]));
    const an = rnd() * Math.PI;
    m.position.set(x, h / 2, z); m.rotation.y = -an; m.castShadow = true; m.receiveShadow = true; scene.add(m);
    if (!tall) { const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, dpt) * 0.72, 2.2, 4), mat('#b5523b', { flatShading: true })); roof.position.set(x, h + 1.1, z); roof.rotation.y = -an + Math.PI / 4; roof.scale.set(w / Math.max(w, dpt), 1, dpt / Math.max(w, dpt)); scene.add(roof); }
    colliders.push({ cx: x, cz: z, hx: w / 2, hz: dpt / 2, a: an, y0: 0, y1: h });
    placed++;
  }
  for (let k = 0; k < 140; k++) {
    const ang = rnd() * Math.PI * 2, d = 40 + rnd() * 300, x = Math.cos(ang) * d * 1.3, z = Math.sin(ang) * d;
    if (pointInPoly(x, z, lot) || near(x, z) || hitsCollider(x, z, 2)) continue;
    tree(scene, x, z, 0.9 + rnd() * 0.8);
  }
  // morros de Floripa ao fundo
  for (let k = 0; k < 14; k++) {
    const ang = (k / 14) * Math.PI * 2 + rnd() * 0.3, d = 700 + rnd() * 300;
    const m = new THREE.Mesh(new THREE.SphereGeometry(180 + rnd() * 160, 16, 10), mat(k % 2 ? '#3a7d44' : '#2f6b3a', { flatShading: true }));
    m.scale.y = 0.35 + rnd() * 0.3; m.position.set(Math.cos(ang) * d, -20, Math.sin(ang) * d); scene.add(m);
  }
}

function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---------- montagem ----------
export function buildWorld(scene) {
  const lot = LOT.map(P);
  for (const [k, pts] of Object.entries(ROADS)) roadPaths[k] = pts.map(P);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), mat('#5f8f4e'));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

  const shape = new THREE.Shape(lot.map(([x, z]) => new THREE.Vector2(x, -z)));
  const lotMesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), mat('#c4bba8'));
  lotMesh.rotation.x = -Math.PI / 2; lotMesh.position.y = 0.01; lotMesh.receiveShadow = true; scene.add(lotMesh);

  ribbon(scene, roadPaths.salvatina, 8, '#3a3a3f');
  ribbon(scene, roadPaths.acesso, 7, '#3a3a3f');
  ribbon(scene, roadPaths.estacionamento, 6, '#44444a');
  ribbon(scene, roadPaths.fundos, 5, '#44444a');
  ribbon(scene, roadPaths.acesso.map(([x, z]) => [x, z]), 0.18, '#f5f5f5', 0.03);

  const aLot = Math.atan2(40.7, 109.3);
  const lotF = new Frame(0, 0, aLot, scene);
  world.lotFrame = lotF;

  const target = lotF.world(0, 30);
  makeBuilding(scene, {
    pts: BUILDINGS.A, floors: 3, target: lotF.world(10, 0), label: 'Fundamental II · Médio',
    rooms: [
      { id: 'sala_em', name: '3º Ano EM', type: 'sala', from: 0, to: 0.36 },
      { id: 'sala_7', name: '7º Ano', type: 'sala', from: 0.36, to: 0.7 },
      { id: 'sala_prof', name: 'Sala dos Professores', type: 'professores', from: 0.7, to: 1 },
    ],
  });
  makeBuilding(scene, { pts: BUILDINGS.B, floors: 1, target, label: null, rooms: [{ id: 'cantina', name: 'Cantina', type: 'cantina', from: 0, to: 1 }] });
  makeBuilding(scene, {
    pts: BUILDINGS.C, floors: 2, target, label: 'Early Years · Infantil',
    rooms: [
      { id: 'sala_inf', name: '1º Ano Infantil', type: 'infantil', from: 0, to: 0.55 },
      { id: 'biblioteca', name: 'Biblioteca', type: 'biblioteca', from: 0.55, to: 1 },
    ],
  });

  makeCourt(scene, ...lotF.world(-55, 4), aLot);
  makePatio(scene, ...lotF.world(30, 12), aLot);
  makePlayground(scene, ...lotF.world(111, 4), aLot);

  // portão principal (aresta sul do lote)
  const e = 6, a = lot[e], b = lot[7];
  const tt = (a[0] - (-20 * S)) / (a[0] - b[0]);
  const gx = a[0] + (b[0] - a[0]) * tt, gz = a[1] + (b[1] - a[1]) * tt;
  const el = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / el, uz = (b[1] - a[1]) / el;
  const gw = 4.5;
  fence(scene, lot, { edge: e, p0: [gx - ux * gw, gz - uz * gw], p1: [gx + ux * gw, gz + uz * gw] });
  const gF = new Frame(gx, gz, Math.atan2(uz, ux), scene);
  for (const s of [-1, 1]) gF.box(s * gw, 0, 0.6, 0.6, 4.2, 0, mat('#0a3d91'), { collide: true });
  gF.box(0, 0, gw * 2 + 0.6, 0.5, 1.0, 4.2, mat('#0a3d91'));
  const gs = textTexture(['ESCOLA DUAL'], { w: 1024, h: 110, bg: '#0a3d91', font: 'bold 80px Arial Black' });
  const outN = (() => { const [lx, lz] = gF.local(0, 0); const n = gF.world(0, 1); return pointInPoly(n[0], n[1], lot) ? -1 : 1; })();
  gF.plane(0, outN * 0.27, gw * 2, 0.95, 4.7, gs, outN > 0 ? 0 : Math.PI);
  gF.plane(0, -outN * 0.27, gw * 2, 0.95, 4.7, gs, outN > 0 ? Math.PI : 0);
  const [sx, sz] = gF.world(0, outN * 7);
  world.spawn = { x: sx, z: sz, face: Math.atan2(-outN * Math.cos(gF.a), outN * Math.sin(gF.a)) };
  const [kx, kz] = gF.world(3, outN * 4); world.scooterSpot = { x: kx, z: kz };
  const [ix, iz] = gF.world(0, -outN * 6); pois.push({ x: ix, z: iz, name: 'entrada' });

  // árvores e canteiros no lote
  const rnd = mulberry(3);
  for (let k = 0; k < 220; k++) {
    const u = -150 + rnd() * 300, v = (rnd() < 0.5 ? -1 : 1) * (18 + rnd() * 12);
    const [x, z] = lotF.world(u, v);
    if (!pointInPoly(x, z, lot) || hitsCollider(x, z, 3.5)) continue;
    let edgeD = Infinity; for (let i = 0; i < lot.length; i++) edgeD = Math.min(edgeD, segDist(x, z, lot[i], lot[(i + 1) % lot.length]));
    if (edgeD < 1.5 || Math.hypot(x - gx, z - gz) < 9) continue;
    tree(scene, x, z, 0.8 + rnd() * 0.5);
  }
  // lixo espalhado (missão do zelador)
  let tries = 0;
  while (trashSpots.length < 10 && tries++ < 500) {
    const u = -140 + rnd() * 270, v = -20 + rnd() * 40;
    const [x, z] = lotF.world(u, v);
    if (pointInPoly(x, z, lot) && !hitsCollider(x, z, 1.5) && !interiors.some(it => { const [lu, lv] = it.frame.local(x, z); return Math.abs(lu) < it.hx + 1 && Math.abs(lv) < it.hz + 1; })) trashSpots.push({ x, z });
  }

  // carros estacionados
  const ep = roadPaths.estacionamento;
  const carCols = ['#c1121f', '#ffffff', '#222', '#6c757d', '#1e6fe0', '#e9c46a'];
  for (let i = 1; i < ep.length - 1; i += 1) {
    const [x0, z0] = ep[i], [x1, z1] = ep[i + 1];
    const an = Math.atan2(z1 - z0, x1 - x0);
    const car = makeCar(carCols[i % carCols.length]);
    const nx = -Math.sin(an) * 4.5, nz = Math.cos(an) * 4.5;
    const cx = (x0 + x1) / 2 + nx, cz = (z0 + z1) / 2 + nz;
    if (pointInPoly(cx, cz, lot)) continue;
    car.position.set(cx, 0, cz); car.rotation.y = -an + Math.PI / 2; scene.add(car);
    colliders.push({ cx, cz, hx: 0.95, hz: 2.1, a: an, y0: 0, y1: 1.6 });
  }

  makeNeighborhood(scene, lot);
  world.lot = lot;
  world.gate = { x: gx, z: gz };
  return world;
}

function segDist(x, z, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz;
  let t = ((x - a[0]) * dx + (z - a[1]) * dz) / l2; t = Math.max(0, Math.min(1, t));
  return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz);
}
