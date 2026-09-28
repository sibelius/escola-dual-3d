import * as THREE from 'three';
import { mat } from './world.js';

const SKINS = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac', '#a86b3c'];
const HAIRS = ['#2b1a0e', '#4a2c14', '#0d0d0d', '#b5651d', '#e6c36a', '#6b3e1f'];
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function makeHuman(o = {}) {
  const {
    skin = pick(SKINS), hair = pick(HAIRS), shirt = '#ffffff', pants = '#0a3d91', shoes = '#222',
    scale = 1, kid = false, hairStyle = pick(['short', 'long', 'pony', 'curly']), skirt = false,
    backpack = null, glasses = false, lanyard = false, apron = null, cap = null, trim = '#0a3d91',
  } = o;
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const box = (w, h, d, m, x, y, z, parent = body) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(m)); b.position.set(x, y, z); b.castShadow = true; parent.add(b); return b; };

  const legL = new THREE.Group(), legR = new THREE.Group();
  legL.position.set(-0.11, 0.88, 0); legR.position.set(0.11, 0.88, 0); body.add(legL, legR);
  for (const leg of [legL, legR]) { box(0.17, 0.78, 0.2, skirt ? skin : pants, 0, -0.39, 0, leg); box(0.19, 0.1, 0.3, shoes, 0, -0.83, 0.04, leg); }
  if (skirt) box(0.44, 0.3, 0.3, pants, 0, 0.8, 0);
  box(0.46, 0.62, 0.26, shirt, 0, 1.2, 0);
  box(0.47, 0.08, 0.27, trim, 0, 1.46, 0);
  if (apron) box(0.4, 0.7, 0.02, apron, 0, 1.08, 0.14);
  if (lanyard) { box(0.04, 0.35, 0.02, '#0a3d91', 0, 1.3, 0.14); box(0.12, 0.16, 0.02, '#fff', 0, 1.1, 0.145); }
  if (backpack) box(0.36, 0.45, 0.18, backpack, 0, 1.2, -0.22);
  const armL = new THREE.Group(), armR = new THREE.Group();
  armL.position.set(-0.3, 1.46, 0); armR.position.set(0.3, 1.46, 0); body.add(armL, armR);
  for (const arm of [armL, armR]) { box(0.13, 0.36, 0.15, shirt, 0, -0.16, 0, arm); box(0.11, 0.26, 0.12, skin, 0, -0.46, 0, arm); }

  const head = new THREE.Group(); head.position.set(0, 1.66, 0); body.add(head);
  if (kid) head.scale.setScalar(1.35);
  box(0.1, 0.1, 0.1, skin, 0, -0.07, 0, head);
  const face = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.32, 0.3), mat(skin)); face.position.y = 0.1; face.castShadow = true; head.add(face);
  box(0.05, 0.05, 0.02, '#1a1a1a', -0.07, 0.13, 0.155, head); box(0.05, 0.05, 0.02, '#1a1a1a', 0.07, 0.13, 0.155, head);
  box(0.1, 0.025, 0.02, '#a33', 0, 0.02, 0.155, head);
  if (glasses) { box(0.28, 0.03, 0.02, '#111', 0, 0.14, 0.165, head); }
  box(0.32, 0.1, 0.32, hair, 0, 0.29, 0, head);
  if (hairStyle === 'long') { box(0.32, 0.38, 0.08, hair, 0, 0.1, -0.15, head); box(0.06, 0.3, 0.3, hair, -0.16, 0.14, 0, head); box(0.06, 0.3, 0.3, hair, 0.16, 0.14, 0, head); }
  else if (hairStyle === 'pony') { box(0.32, 0.2, 0.06, hair, 0, 0.2, -0.16, head); box(0.1, 0.28, 0.1, hair, 0, 0.05, -0.23, head); }
  else if (hairStyle === 'curly') { for (let k = 0; k < 6; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), mat(hair)); s.position.set(Math.cos(k) * 0.14, 0.3, Math.sin(k) * 0.14 - 0.02); head.add(s); } }
  else { box(0.32, 0.12, 0.06, hair, 0, 0.22, -0.15, head); }
  if (cap) { box(0.34, 0.1, 0.34, cap, 0, 0.33, 0, head); box(0.3, 0.03, 0.18, cap, 0, 0.29, 0.22, head); }

  root.scale.setScalar(scale);
  root.userData = { legL, legR, armL, armR, head, body, phase: Math.random() * 6, height: 1.85 * scale * (kid ? 1.08 : 1) };
  return root;
}

export function animateHuman(h, speed, dt, pose = 'stand') {
  const u = h.userData;
  u.phase += dt * (4 + speed * 1.6);
  if (pose === 'sit') {
    u.legL.rotation.x = u.legR.rotation.x = -Math.PI / 2; u.body.position.y = -0.42;
    u.armL.rotation.x = u.armR.rotation.x = -0.6; return;
  }
  u.body.position.y = 0;
  if (pose === 'cheer') { u.armL.rotation.x = u.armR.rotation.x = -2.8 + Math.sin(u.phase * 2) * 0.3; u.legL.rotation.x = u.legR.rotation.x = 0; return; }
  if (pose === 'talk') { u.armR.rotation.x = -0.9 + Math.sin(u.phase * 1.5) * 0.4; u.armL.rotation.x = 0; u.legL.rotation.x = u.legR.rotation.x = 0; u.head.rotation.x = Math.sin(u.phase) * 0.08; return; }
  if (pose === 'ride') { u.legL.rotation.x = 0; u.legR.rotation.x = -0.3; u.armL.rotation.x = u.armR.rotation.x = -1.1; return; }
  if (pose === 'air') { u.legL.rotation.x = -0.6; u.legR.rotation.x = 0.3; u.armL.rotation.x = u.armR.rotation.x = -2.2; return; }
  const amp = Math.min(1, speed / 4) * 0.8;
  const s = Math.sin(u.phase);
  u.legL.rotation.x = s * amp; u.legR.rotation.x = -s * amp;
  u.armL.rotation.x = -s * amp * 0.9; u.armR.rotation.x = s * amp * 0.9;
  u.body.position.y = Math.abs(Math.cos(u.phase)) * 0.05 * amp;
  u.head.rotation.x = 0;
}

// ---------- NPCs ----------
const NAMES_KID = ['Theo', 'Helena', 'Gael', 'Alice', 'Bento', 'Maitê', 'Noah', 'Cecília', 'Ravi', 'Aurora', 'Joaquim', 'Lis'];
const NAMES_TEEN = ['Rafa', 'Duda', 'Gui', 'Bia', 'Leo', 'Manu', 'Caio', 'Júlia', 'Enzo', 'Lari', 'Davi', 'Sofia', 'Pietro', 'Valentina'];
const NAMES_ADULT = ['Profª Carla', 'Prof. Marcos', 'Mr. John', 'Profª Juliana', 'Prof. Rodrigo', 'Ms. Emily'];

export const LINES = {
  kid: ['Quer brincar de pega-pega?', 'Hello! My name is {n}!', 'Eu perdi um dente! 🦷', 'Hoje tem massinha!', 'Vamos no escorregador?', 'Minha mãe fez bolo!'],
  teen: ['Viu a prova de física? 😵', 'Bora um pebolim no recreio?', 'ENEM tá chegando...', 'Did you finish the IB essay?', 'Tem pão de queijo na cantina hoje!', 'Partiu quadra depois da aula?'],
  adult: ['Bom dia! Good morning!', 'Não corra no corredor!', 'Já fez a lição de casa?', 'Reunião às 16h, não esqueçam.', 'Que dia lindo em Floripa!'],
  staff: ['Bom dia, meu anjo!', 'Cuidado que o chão tá molhado.', 'O pão de queijo saiu agora!', 'Portão abre às 7h30.'],
};

export class NPC {
  constructor(kind, name, mesh, x, z, opts = {}) {
    Object.assign(this, { kind, name, mesh, x, z, y: 0, heading: Math.random() * 6, speed: 0, state: 'idle', timer: Math.random() * 4, target: null, talked: false, pose: 'stand', bubble: null, bubbleT: 0, radius: 0.35 * (opts.kid ? 0.7 : 1) });
    this.static = !!opts.static; this.kidOnly = !!opts.kid; this.walkSpeed = opts.kid ? 2.0 + Math.random() * 1.5 : 1.3 + Math.random() * 0.7;
    if (opts.sit) { this.state = 'sit'; this.pose = 'sit'; this.static = true; this.heading = opts.face; }
    if (opts.face !== undefined) this.heading = opts.face;
    this.lastPos = { x, z }; this.stuckT = 0;
  }
  say(text, t = 3) { this.bubble = text; this.bubbleT = t; }
  update(dt, pois, move, player) {
    if (this.bubbleT > 0) this.bubbleT -= dt; else this.bubble = null;
    const dP = Math.hypot(player.x - this.x, player.z - this.z);
    if (this.state === 'sit' || this.static) {
      if (this.bubbleT > 0 && this.state !== 'sit') this.pose = 'talk';
      else if (this.state !== 'sit') this.pose = this.cheerT > 0 ? 'cheer' : 'stand';
      if (this.cheerT > 0) this.cheerT -= dt;
      if (dP < 4 && this.state !== 'sit') this.heading = Math.atan2(player.x - this.x, player.z - this.z);
    } else if (this.state === 'idle') {
      this.speed = 0; this.timer -= dt;
      this.pose = this.cheerT > 0 ? 'cheer' : this.bubbleT > 0 ? 'talk' : 'stand';
      if (this.cheerT > 0) this.cheerT -= dt;
      if (dP < 3) this.heading = Math.atan2(player.x - this.x, player.z - this.z);
      if (this.timer <= 0 && dP > 2.5) {
        const opts = pois.filter(p => this.kidOnly ? p.kids || Math.random() < 0.25 : !p.kids || Math.random() < 0.2);
        const p = pick(opts.length ? opts : pois);
        this.target = { x: p.x + (Math.random() - 0.5) * 5, z: p.z + (Math.random() - 0.5) * 5 };
        this.state = 'walk'; this.stuckT = 0;
      }
    } else if (this.state === 'walk') {
      const dx = this.target.x - this.x, dz = this.target.z - this.z, d = Math.hypot(dx, dz);
      if (d < 1 || this.stuckT > 1.5) { this.state = 'idle'; this.timer = 2 + Math.random() * 7; this.speed = 0; }
      else {
        const want = Math.atan2(dx, dz);
        let diff = ((want - this.heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        this.heading += diff * Math.min(1, dt * 6);
        this.speed = this.walkSpeed;
        const ox = this.x, oz = this.z;
        move(this, this.x + Math.sin(this.heading) * this.speed * dt, this.z + Math.cos(this.heading) * this.speed * dt);
        const moved = Math.hypot(this.x - ox, this.z - oz);
        if (moved < this.speed * dt * 0.3) { this.stuckT += dt; this.heading += dt * 3; } else this.stuckT = Math.max(0, this.stuckT - dt);
        this.pose = 'stand';
      }
    }
    this.mesh.position.set(this.x, this.y, this.z);
    this.mesh.rotation.y = this.heading;
    animateHuman(this.mesh, this.state === 'walk' ? this.speed : 0, dt, this.pose);
  }
}

export function spawnNPCs(scene, { pois, seats, stations }, skipKind) {
  const npcs = [];
  const add = (kind, name, meshOpts, x, z, opts = {}) => {
    const m = makeHuman(meshOpts); scene.add(m);
    const n = new NPC(kind, name, m, x, z, opts); npcs.push(n); return n;
  };
  const kidLook = () => ({ kid: true, scale: 0.6, shirt: pick(['#ffffff', '#ffd23f', '#9cc7ee']), pants: '#0a3d91', backpack: pick(['#e63946', '#ffbe0b', '#8338ec', '#2a9d8f']) });
  const teenLook = () => ({ scale: 0.97, shirt: pick(['#ffffff', '#ffffff', '#0a3d91']), pants: pick(['#1b263b', '#0a3d91', '#3a3a3a']), trim: pick(['#0a3d91', '#ffd23f']), backpack: Math.random() < 0.5 ? pick(['#222', '#6c757d', '#c1121f']) : null, skirt: Math.random() < 0.2 });
  const adultLook = () => ({ scale: 1.02, shirt: pick(['#e76f51', '#2a9d8f', '#6d597a', '#f4a261', '#264653']), pants: pick(['#222', '#3d405b', '#5e503f']), lanyard: true, glasses: Math.random() < 0.4, trim: '#1b263b' });

  const inf = pois.filter(p => p.kids);
  const out = pois.filter(p => !p.kids);
  NAMES_KID.slice(0, 9).forEach((n, i) => { const p = inf[i % inf.length]; add('kid', n, kidLook(), p.x + Math.random() * 4 - 2, p.z + Math.random() * 4 - 2, { kid: true }); });
  NAMES_TEEN.slice(0, 12).forEach((n, i) => { const p = out[i % out.length]; add('teen', n, teenLook(), p.x + Math.random() * 4 - 2, p.z + Math.random() * 4 - 2); });
  NAMES_ADULT.slice(0, 3).forEach((n, i) => { const p = out[(i * 3) % out.length]; add('adult', n, adultLook(), p.x + 1, p.z + 1); });

  // alunos sentados nas salas
  const names = [...NAMES_TEEN].reverse();
  seats.filter(s => s.room === 'sala_em').slice(0, 9).forEach((s, i) => { if (s.idx === 3) return; add('teen', names[i % names.length], teenLook(), s.x, s.z, { sit: true, face: s.face }); });
  seats.filter(s => s.room === 'sala_7').slice(0, 8).forEach((s, i) => add('teen', NAMES_KID[(i + 3) % NAMES_KID.length], { ...teenLook(), scale: 0.8 }, s.x, s.z, { sit: true, face: s.face }));
  seats.filter(s => s.room === 'sala_inf').forEach((s, i) => add('kid', NAMES_KID[(i + 9) % NAMES_KID.length], kidLook(), s.x, s.z, { sit: true, face: s.face, kid: true }));
  seats.filter(s => s.room === 'cantina').slice(0, 3).forEach((s, i) => add('teen', NAMES_TEEN[(i + 12) % NAMES_TEEN.length], teenLook(), s.x, s.z, { sit: true, face: s.face }));

  // funcionários fixos
  const st = stations;
  const cant = add('staff', 'Dona Célia (cantina)', { shirt: '#ffffff', pants: '#555', apron: '#e63946', cap: '#e63946', hairStyle: 'short' }, 0, 0, { static: true });
  cant.x = st.cantina_staff.x; cant.z = st.cantina_staff.z;
  if (skipKind !== 'professora') { const p = add('adult', 'Profª Ana (Física)', { shirt: '#6d597a', pants: '#222', lanyard: true, glasses: true, hairStyle: 'long' }, st.sala_em_lousa.x, st.sala_em_lousa.z, { static: true }); }
  if (skipKind !== 'zelador') { const z = add('staff', 'Seu Zé (zelador)', { shirt: '#2a9d8f', pants: '#264653', cap: '#264653' }, st.quadra.x + 6, st.quadra.z + 2); }
  const inf2 = add('adult', 'Tia Paula (Infantil)', { shirt: '#ffbe0b', pants: '#3d405b', lanyard: true, hairStyle: 'curly' }, st.rodinha.x + 1.5, st.rodinha.z, { static: true });
  return npcs;
}

