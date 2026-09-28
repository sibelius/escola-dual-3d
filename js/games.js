// Mini-games em overlay. Cada função retorna uma Promise com o resultado.
const overlay = document.getElementById('overlay');
const box = document.getElementById('overlay-box');
const shuffle = (a) => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(v => v[1]);

function open(html) { box.innerHTML = html; overlay.classList.remove('hidden'); }
export function closeOverlay() { overlay.classList.add('hidden'); box.innerHTML = ''; }
export const overlayOpen = () => !overlay.classList.contains('hidden');

const Q_EM = [
  ['Qual a derivada de x²?', ['2x', 'x', 'x²/2', '2']],
  ['What is the capital of Australia?', ['Canberra', 'Sydney', 'Melbourne', 'Perth']],
  ['Quem escreveu "Dom Casmurro"?', ['Machado de Assis', 'José de Alencar', 'Clarice Lispector', 'Jorge Amado']],
  ['Um carro anda 100 m em 20 s. Velocidade média?', ['5 m/s', '2 m/s', '20 m/s', '120 m/s']],
  ['Em que ano foi a Independência do Brasil?', ['1822', '1500', '1889', '1922']],
  ['Past tense of "to go"?', ['went', 'goed', 'gone', 'goes']],
  ['√144 = ?', ['12', '14', '72', '11']],
  ['Qual a capital de Santa Catarina?', ['Florianópolis', 'Blumenau', 'Joinville', 'Itajaí']],
  ['The mitochondria is the ___ of the cell.', ['powerhouse', 'brain', 'wall', 'skin']],
  ['Fórmula química da água?', ['H₂O', 'CO₂', 'O₂', 'NaCl']],
  ['log₁₀(1000) = ?', ['3', '10', '100', '30']],
  ['Which is a prime number?', ['17', '21', '27', '33']],
];
const Q_KID = [
  ['🟥 What color is this?', ['Red', 'Blue', 'Green', 'Yellow']],
  ['🐶 Como se diz "cachorro" em inglês?', ['Dog', 'Cat', 'Bird', 'Fish']],
  ['🍎🍎🍎 How many apples?', ['Three', 'Two', 'Five', 'One']],
  ['🟦 What color is this?', ['Blue', 'Red', 'Pink', 'Black']],
  ['☀️ Como se diz "sol" em inglês?', ['Sun', 'Moon', 'Star', 'Rain']],
  ['🐱 What animal is this?', ['Cat', 'Dog', 'Cow', 'Duck']],
];
const Q_AULA = [
  ['Aluno: "Profe, o que é aceleração?"', ['Variação da velocidade no tempo', 'Distância percorrida', 'A massa do corpo', 'Um tipo de energia']],
  ['Aluno: "Qual a unidade de força no SI?"', ['Newton (N)', 'Joule (J)', 'Watt (W)', 'Pascal (Pa)']],
  ['Student: "How do you say \'gravidade\' in English?"', ['Gravity', 'Gravy', 'Gravitas', 'Grave']],
  ['Aluno: "F = m · a é qual lei de Newton?"', ['Segunda', 'Primeira', 'Terceira', 'Quarta']],
  ['Aluno: "Velocidade da luz é aproximadamente..."', ['300.000 km/s', '340 m/s', '1.000 km/h', '9,8 m/s²']],
];

export function quiz({ title, sub, bank, n = 5, pass = 8 }) {
  return new Promise(resolve => {
    const qs = shuffle(bank).slice(0, n);
    let i = 0, right = 0;
    const render = () => {
      if (i >= qs.length) {
        const nota = Math.round((right / qs.length) * 10);
        open(`<h2>${title}</h2><p style="font-size:22px">Nota: <b>${nota}</b>/10 ${nota >= pass ? '🎉' : '😬'}</p><p>${nota >= pass ? 'Mandou muito bem!' : 'Quase! Estude mais e tente de novo.'}</p><div class="opts"><button id="q-ok">Continuar</button></div>`);
        document.getElementById('q-ok').onclick = () => { closeOverlay(); resolve({ nota, pass: nota >= pass }); };
        return;
      }
      const [q, answers] = qs[i];
      const opts = shuffle(answers.map((a, k) => ({ a, ok: k === 0 })));
      open(`<h2>${title}</h2><div class="meta">${sub} · questão ${i + 1}/${qs.length} · teclas 1-4</div><p style="font-size:19px">${q}</p><div class="opts">${opts.map((o, k) => `<button data-k="${k}">${k + 1}) ${o.a}</button>`).join('')}</div>`);
      const btns = [...box.querySelectorAll('button')];
      const choose = (k) => {
        if (btns[0].disabled) return;
        btns.forEach((b, j) => { b.disabled = true; if (opts[j].ok) b.classList.add('ok'); else if (j === k) b.classList.add('bad'); });
        if (opts[k].ok) right++;
        setTimeout(() => { i++; render(); }, 650);
      };
      btns.forEach((b, k) => b.onclick = () => choose(k));
      box.onkey = (e) => { const k = parseInt(e.key) - 1; if (k >= 0 && k < 4) choose(k); };
    };
    render();
  });
}
window.addEventListener('keydown', e => { if (overlayOpen() && box.onkey) box.onkey(e); });

export const quizEM = () => quiz({ title: '📝 Prova Bimestral', sub: '3º ano · Matemática, Física, Linguagens', bank: Q_EM });
export const quizKid = () => quiz({ title: '🎵 Rodinha: Hello Song!', sub: 'Tia Paula pergunta em inglês', bank: Q_KID, n: 3, pass: 6 });
export const quizAula = () => quiz({ title: '👩‍🏫 Aula de Física', sub: 'Responda às dúvidas da turma', bank: Q_AULA, n: 4, pass: 7 });

export function snack(money) {
  return new Promise(resolve => {
    const items = [['🧀 Pão de queijo', 4, 35], ['🧃 Suco de laranja', 3, 20], ['🍌 Fruta', 2, 25], ['🥪 Sanduíche natural', 6, 55]];
    open(`<h2>🍽️ Cantina Dual</h2><div class="meta">Dona Célia: "O que vai ser hoje, meu anjo?" · Você tem R$ ${money}</div><div class="opts">${items.map(([n, p, f], k) => `<button data-k="${k}" ${p > money ? 'disabled style="opacity:.4"' : ''}>${k + 1}) ${n} — R$ ${p} <span class="meta">(+${f} saciedade)</span></button>`).join('')}<button data-k="x">Agora não</button></div>`);
    const done = (k) => { closeOverlay(); resolve(k === 'x' ? null : { name: items[k][0], price: items[k][1], food: items[k][2] }); };
    box.querySelectorAll('button').forEach(b => b.onclick = () => done(b.dataset.k === 'x' ? 'x' : +b.dataset.k));
    box.onkey = (e) => { const k = parseInt(e.key) - 1; if (items[k] && items[k][1] <= money) done(k); if (e.key === 'Escape') done('x'); };
  });
}

export function grading() {
  return new Promise(resolve => {
    const items = shuffle([
      ['7 × 8 = 56', true], ['√81 = 8', false], ['H₂O é água', true], ['"She go to school" está correto', false],
      ['A Terra gira em torno do Sol', true], ['1 km = 100 m', false], ['Florianópolis é uma ilha (em grande parte)', true], ['Triângulo tem 4 lados', false],
    ]).slice(0, 6);
    let i = 0, right = 0;
    const render = () => {
      if (i >= items.length) {
        open(`<h2>📚 Provas corrigidas!</h2><p>Você corrigiu ${right}/${items.length} questões certinho.</p><div class="opts"><button id="g-ok">Continuar</button></div>`);
        document.getElementById('g-ok').onclick = () => { closeOverlay(); resolve({ pass: right >= 4, right }); };
        return;
      }
      const [q, ok] = items[i];
      open(`<h2>✏️ Corrigir provas</h2><div class="meta">Resposta do aluno ${i + 1}/${items.length} · C = certo, X = errado</div><p style="font-size:20px">"${q}"</p><div class="opts"><button data-v="1">✅ Certo (C)</button><button data-v="0">❌ Errado (X)</button></div>`);
      const pickV = (v) => { if (v === ok) right++; i++; render(); };
      box.querySelectorAll('button').forEach(b => b.onclick = () => pickV(b.dataset.v === '1'));
      box.onkey = (e) => { if (e.key.toLowerCase() === 'c') pickV(true); if (e.key.toLowerCase() === 'x') pickV(false); };
    };
    render();
  });
}

export function message(title, html, btn = 'Ok') {
  return new Promise(resolve => {
    open(`<h2>${title}</h2>${html}<div class="opts"><button id="m-ok">${btn}</button></div>`);
    document.getElementById('m-ok').onclick = () => { closeOverlay(); resolve(); };
    box.onkey = (e) => { if (e.key === 'Enter' || e.key === 'Escape' || e.key === 'e') { closeOverlay(); resolve(); } };
  });
}

// ---------- Pebolim ----------
export function foosball(opponent = 'Rafa') {
  return new Promise(resolve => {
    open(`<h2>⚽ Pebolim vs ${opponent}</h2><div class="meta">W/S ou mouse movem seus bonecos (azuis) · Espaço = chute forte · primeiro a 3 gols</div><canvas id="fb" width="520" height="300"></canvas><div id="fb-score" style="text-align:center;font-size:22px;font-weight:bold">0 × 0</div>`);
    const cv = document.getElementById('fb'), g = cv.getContext('2d');
    const W = 520, H = 300, GOAL = [105, 195];
    const ball = { x: W / 2, y: H / 2, vx: 0, vy: 0 };
    let score = [0, 0], me = H / 2, ai = H / 2, kick = 0, keys = {}, last = performance.now(), wait = 0.8, running = true;
    const myRods = [{ x: 45, n: 1, sp: 0 }, { x: 205, n: 2, sp: 110 }, { x: 365, n: 3, sp: 85 }];
    const aiRods = [{ x: 475, n: 1, sp: 0 }, { x: 315, n: 2, sp: 110 }, { x: 155, n: 3, sp: 85 }];
    const men = (r, off) => { const half = (r.n - 1) / 2 * r.sp; off = Math.max(18 + half, Math.min(H - 18 - half, off)); return Array.from({ length: r.n }, (_, k) => off + (k - (r.n - 1) / 2) * r.sp); };
    const reset = (dir) => { ball.x = W / 2; ball.y = H / 2; ball.vx = dir * 120; ball.vy = (Math.random() - 0.5) * 160; wait = 0.8; };
    reset(Math.random() < 0.5 ? 1 : -1);
    const kd = (e) => { keys[e.key.toLowerCase()] = true; if (e.key === ' ') { kick = 0.25; e.preventDefault(); } };
    const ku = (e) => { keys[e.key.toLowerCase()] = false; };
    const mm = (e) => { const r = cv.getBoundingClientRect(); me = (e.clientY - r.top) * (H / r.height); };
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku); cv.addEventListener('mousemove', mm);
    const hit = (rods, off, dir, strong) => {
      for (const r of rods) for (const y of men(r, off)) {
        if (Math.abs(ball.x - r.x) < 11 && Math.abs(ball.y - y) < 16) {
          const sp = Math.max(260, Math.abs(ball.vx) * 1.05) * (strong ? 1.8 : 1);
          ball.vx = dir * Math.min(sp, 760); ball.vy += (ball.y - y) * 14 + (Math.random() - 0.5) * 60;
          ball.x = r.x + dir * 12;
        }
      }
    };
    const step = (t) => {
      if (!running || !document.getElementById('fb')) { running = false; window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); return; }
      const dt = Math.min(0.033, (t - last) / 1000); last = t;
      if (keys['w'] || keys['arrowup']) me -= 330 * dt;
      if (keys['s'] || keys['arrowdown']) me += 330 * dt;
      me = Math.max(40, Math.min(H - 40, me));
      const aiSpeed = 190 + score[0] * 30;
      const tgt = ball.y + (Math.sin(t / 400) * 20);
      ai += Math.max(-aiSpeed * dt, Math.min(aiSpeed * dt, tgt - ai)); ai = Math.max(40, Math.min(H - 40, ai));
      if (kick > 0) kick -= dt;
      if (wait > 0) wait -= dt; else {
        ball.x += ball.vx * dt; ball.y += ball.vy * dt;
        ball.vx *= 0.997; ball.vy *= 0.99;
        if (Math.abs(ball.vx) < 40) ball.vx = Math.sign(ball.vx || 1) * 40;
        if (ball.y < 12 || ball.y > H - 12) { ball.vy *= -1; ball.y = Math.max(12, Math.min(H - 12, ball.y)); }
        hit(myRods, me, 1, kick > 0);
        hit(aiRods, ai, -1, Math.random() < 0.1);
        if (ball.x < 14 || ball.x > W - 14) {
          if (ball.y > GOAL[0] && ball.y < GOAL[1]) {
            if (ball.x > W / 2) score[0]++; else score[1]++;
            document.getElementById('fb-score').textContent = `${score[0]} × ${score[1]}`;
            if (score[0] >= 3 || score[1] >= 3) return finish();
            reset(ball.x > W / 2 ? -1 : 1);
          } else { ball.vx *= -1; ball.x = Math.max(14, Math.min(W - 14, ball.x)); }
        }
      }
      // desenho
      g.fillStyle = '#2d8a3e'; g.fillRect(0, 0, W, H);
      g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 3; g.strokeRect(8, 8, W - 16, H - 16);
      g.beginPath(); g.moveTo(W / 2, 8); g.lineTo(W / 2, H - 8); g.stroke(); g.beginPath(); g.arc(W / 2, H / 2, 40, 0, 7); g.stroke();
      g.fillStyle = '#ddd'; g.fillRect(0, GOAL[0], 8, GOAL[1] - GOAL[0]); g.fillRect(W - 8, GOAL[0], 8, GOAL[1] - GOAL[0]);
      const drawRods = (rods, off, col) => rods.forEach(r => {
        g.fillStyle = '#bbb'; g.fillRect(r.x - 2, 0, 4, H);
        men(r, off).forEach(y => { g.fillStyle = col; g.fillRect(r.x - 8, y - 14, 16, 28); g.fillStyle = '#f1c27d'; g.beginPath(); g.arc(r.x, y - 8, 5, 0, 7); g.fill(); });
      });
      drawRods(myRods, me, kick > 0 ? '#5fa8ff' : '#1e6fe0'); drawRods(aiRods, ai, '#e63946');
      g.fillStyle = '#fff'; g.beginPath(); g.arc(ball.x, ball.y, 8, 0, 7); g.fill();
      requestAnimationFrame(step);
    };
    const finish = () => {
      running = false; window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku);
      const win = score[0] > score[1];
      setTimeout(() => {
        open(`<h2>${win ? '🏆 Você venceu!' : '😅 Perdeu dessa vez'}</h2><p style="font-size:22px">${score[0]} × ${score[1]} contra ${opponent}</p><div class="opts"><button id="fb-ok">Continuar</button></div>`);
        document.getElementById('fb-ok').onclick = () => { closeOverlay(); resolve({ win, score }); };
      }, 300);
    };
    box.onkey = null;
    requestAnimationFrame(step);
  });
}

export const JOKES = [
  ['Por que o livro de matemática estava triste?', 'Porque tinha muitos problemas! 📘'],
  ['O que o zero disse para o oito?', 'Que cinto bonito! 0️⃣8️⃣'],
  ['Por que o jacaré tirou o filho da escola?', 'Porque ele RÉPTIL de ano! 🐊'],
  ['O que a vaca foi fazer no espaço?', 'Visitar a Via Láctea! 🐄🚀'],
  ['Why did the student eat his homework?', 'Because the teacher said it was a piece of cake! 🍰'],
  ['O que o tomate foi fazer no banco?', 'Tirar extrato! 🍅'],
  ['Qual é o animal mais antigo?', 'A zebra, porque é em preto e branco! 🦓'],
  ['Por que a plantinha não foi atendida?', 'Porque só tinha médico de plantão! 🌱'],
  ['O que é um pontinho amarelo no céu?', 'Um yellowcóptero! 🚁'],
  ['What do you call a fish with no eyes?', 'A fsh! 🐟'],
  ['Por que o esqueleto não foi à festa?', 'Porque ele não tinha corpo pra isso! 💀'],
  ['Qual o prato preferido do professor de física?', 'Pão de queijo com massa... e aceleração! 🧀'],
];
