'use strict';
/* =====================================================================
   Diagramas de técnica — Plan Futbol
   Tres tipos:
   - Figura (k): poses clave de una figura articulada, vista de lado o de frente.
     Cada pose se define con ángulos absolutos por segmento y se puede animar.
   - Cancha (map): croquis visto desde arriba con conos, recorridos y medidas.
   - Intervalos (tl): bloques de tiempo e intensidad.
   ===================================================================== */
(function(){
const SEG = {tr:32, nk:5, hr:6.5, ua:15, fa:14, th:20, sh:20, ft:7};
const W = 130, H = 120, G = 110;               // marco de cada pose y línea del piso
const INK = '#14231A', FAR = '#9FB4A6', BIB = '#FF7A1F', PITCH = '#17643A';
const rad = d => d * Math.PI / 180;
const down = (p, a, L) => [p[0] + Math.sin(rad(a)) * L, p[1] + Math.cos(rad(a)) * L];   // 0 = hacia abajo, + = hacia el frente
const upv = a => [Math.sin(rad(a)), -Math.cos(rad(a))];                                  // 0 = hacia arriba, + = hacia el frente
const r1 = n => Math.round(n * 10) / 10;
let uidN = 0;

/* ---------- Cinemática ---------- */
function fk(q){
  const hip = [0, 0], tv = upv(q.t || 0);
  const neck = [tv[0] * SEG.tr, tv[1] * SEG.tr];
  const sh = [tv[0] * (SEG.tr - 3), tv[1] * (SEG.tr - 3)];
  const hv = upv(q.hd == null ? (q.t || 0) : q.hd);
  const head = [neck[0] + hv[0] * (SEG.nk + SEG.hr), neck[1] + hv[1] * (SEG.nk + SEG.hr)];
  const arm = a => { const e = down(sh, a[0], SEG.ua); return [sh, e, down(e, a[1], SEG.fa)]; };
  const leg = l => {
    const f = l[3] == null ? 1 : l[3];
    const k0 = down(hip, l[0], SEG.th), k = [k0[0], hip[1] + (k0[1] - hip[1]) * f];
    const a0 = down(k, l[1], SEG.sh), an = [a0[0], k[1] + (a0[1] - k[1]) * f];
    return [hip, k, an, down(an, l[2] == null ? 90 : l[2], SEG.ft)];
  };
  const A1 = arm(q.a1 || [8, 15]), A2 = arm(q.a2 || [-8, -2]);
  const L1 = leg(q.l1 || [2, 0, 90]), L2 = leg(q.l2 || [-2, 0, 90]);
  const pts = [[head, SEG.hr], [neck, 5], [hip, 5], [A1[1], 1.5], [A1[2], 1.5], [A2[1], 1.5], [A2[2], 1.5],
    [L1[1], 2], [L1[2], 1.5], [L1[3], 1.5], [L2[1], 2], [L2[2], 1.5], [L2[3], 1.5]];
  const low = Math.max(...pts.map(([p, o]) => p[1] + o));
  const dx = q.x == null ? 60 : q.x, dy = G - (q.air || 0) - low;
  const T = p => [r1(p[0] + dx), r1(p[1] + dy)];
  return {hip:T(hip), neck:T(neck), sh:T(sh), head:T(head), a1:A1.map(T), a2:A2.map(T), l1:L1.map(T), l2:L2.map(T),
    tv, sp:q.sp || 0, hold:q.hold, front:!!q.front, lite:q.lite || []};
}
function jointPt(F, at){
  const m = {hip:F.hip, neck:F.neck, head:F.head, el1:F.a1[1], ha1:F.a1[2], el2:F.a2[1], ha2:F.a2[2],
    kn1:F.l1[1], an1:F.l1[2], to1:F.l1[3], kn2:F.l2[1], an2:F.l2[2], to2:F.l2[3]};
  return m[at] || F.hip;
}

/* ---------- Dibujo de la figura ---------- */
const poly = (pts, c, w) => `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
function figure(F){
  const near = INK, far = F.front ? INK : FAR;
  const col = k => F.lite.includes(k) ? FAR : (k.endsWith('2') ? far : near);
  let s = '';
  s += poly(F.a2, col('a2'), 4) + poly(F.l2, col('l2'), 4.4);
  if (F.sp){
    const mx = (F.hip[0] + F.neck[0]) / 2, my = (F.hip[1] + F.neck[1]) / 2;
    const px = F.tv[1], py = -F.tv[0];
    s += `<path d="M${F.hip.join(',')} Q${r1(mx + px * F.sp * 2)},${r1(my + py * F.sp * 2)} ${F.neck.join(',')}" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`;
  } else s += poly([F.hip, F.neck], INK, 5);
  s += `<circle cx="${F.head[0]}" cy="${F.head[1]}" r="${SEG.hr}" fill="${INK}"/>`;
  s += poly(F.l1, col('l1'), 4.6) + poly(F.a1, col('a1'), 4.2);
  if (F.hold === 'db'){ const h = F.a1[2]; s += `<rect x="${r1(h[0] - 5)}" y="${r1(h[1] - 3.5)}" width="10" height="7" rx="1.5" fill="#56685D"/>`; }
  if (F.hold === 'ball'){ const h = F.a1[2]; s += ball(h[0], h[1], 5); }
  return s;
}
function ball(x, y, r){
  return `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r}" fill="#fff" stroke="${INK}" stroke-width="1.6"/><circle cx="${r1(x)}" cy="${r1(y)}" r="${r * .38}" fill="${INK}"/>`;
}

/* ---------- Objetos de la escena ---------- */
function prop(p, F, id){
  const at = p.at ? jointPt(F, p.at) : null;
  const X = at ? at[0] + (p.dx || 0) : p.x, Y = at ? at[1] + (p.dy || 0) : p.y;
  switch (p.t){
    case 'box': return `<rect x="${p.x}" y="${G - p.h}" width="${p.w}" height="${p.h}" rx="2" fill="#E9D7BC" stroke="#9C7B55" stroke-width="1.5"/>`;
    case 'bench': { const top = G - p.h;
      return `<rect x="${p.x}" y="${top}" width="${p.w}" height="5" rx="1.5" fill="#8A6A48"/><rect x="${p.x + 3}" y="${top + 5}" width="3" height="${p.h - 5}" fill="#8A6A48"/><rect x="${p.x + p.w - 6}" y="${top + 5}" width="3" height="${p.h - 5}" fill="#8A6A48"/>`; }
    case 'step': return `<rect x="${p.x}" y="${G - p.h}" width="${p.w}" height="${p.h}" rx="1.5" fill="#C9D3CC" stroke="#8FA295" stroke-width="1.2"/>`;
    case 'wall': return `<rect x="${p.x}" y="${p.y || 8}" width="${p.w || 7}" height="${G - (p.y || 8)}" fill="#D3DCD5" stroke="#9FB0A4" stroke-width="1"/>`;
    case 'board': return `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="#F1F5F2" stroke="#B9C7BD" stroke-width="1"/>`;
    case 'mark': return `<line x1="${r1(X - 7)}" y1="${r1(Y)}" x2="${r1(X + 7)}" y2="${r1(Y)}" stroke="${p.c || BIB}" stroke-width="2.5" stroke-linecap="round"/>`;
    case 'cone': { const x = X, b = G; return `<path d="M${x - 5},${b} L${x},${b - 11} L${x + 5},${b} Z" fill="${BIB}"/><rect x="${x - 6.5}" y="${b - 1.5}" width="13" height="2" fill="${BIB}"/>`; }
    case 'hurdle': { const x = p.x, h = p.h || 11; return `<line x1="${x - 6}" y1="${G}" x2="${x - 6}" y2="${G - h}" stroke="#8FA295" stroke-width="2"/><line x1="${x + 6}" y1="${G}" x2="${x + 6}" y2="${G - h}" stroke="#8FA295" stroke-width="2"/><line x1="${x - 8}" y1="${G - h}" x2="${x + 8}" y2="${G - h}" stroke="${BIB}" stroke-width="3" stroke-linecap="round"/>`; }
    case 'line': return `<rect x="${p.x - 1.5}" y="${G - 1}" width="3" height="4" fill="#fff" stroke="#8FA295" stroke-width=".8"/><text x="${p.x}" y="${G + 9}" font-size="7" text-anchor="middle" fill="#5F6F65">línea</text>`;
    case 'ball': return ball(X, Y, p.r || 5);
    case 'anchor': return `<rect x="${r1(X - 7)}" y="${r1(Y - 9)}" width="14" height="7" rx="2" fill="#8A6A48"/>`;
    case 'arr': return `<path d="${p.d}" fill="none" stroke="${p.c || BIB}" stroke-width="2.2" stroke-linecap="round" ${p.dash ? 'stroke-dasharray="4 3"' : ''} marker-end="url(#ah${id})" ${p.both ? `marker-start="url(#ahs${id})"` : ''}/>`;
    case 'arc': { const [ax, ay] = p.a, [bx, by] = p.b, cx = (ax + bx) / 2, cy = Math.min(ay, by) - (p.h || 20);
      return `<path d="M${ax},${ay} Q${cx},${cy} ${bx},${by}" fill="none" stroke="${p.c || BIB}" stroke-width="2" stroke-dasharray="4 3" stroke-linecap="round" marker-end="url(#ah${id})"/>`; }
    case 'ok': return `<g transform="translate(${p.x},${p.y})"><circle r="8" fill="${PITCH}"/><path d="M-4 0.5 L-1 3.5 L4.5 -3" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></g>`;
    case 'no': return `<g transform="translate(${p.x},${p.y})"><circle r="8" fill="#C8202F"/><path d="M-3.5 -3.5 L3.5 3.5 M3.5 -3.5 L-3.5 3.5" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></g>`;
    case 'txt': return `<text x="${X}" y="${Y}" font-size="${p.s || 8}" text-anchor="${p.a || 'middle'}" fill="${p.c || '#3B4D42'}" font-weight="700">${p.v}</text>`;
    default: return '';
  }
}
const defs = id => `<defs><marker id="ah${id}" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="${BIB}"/></marker><marker id="ahs${id}" viewBox="0 0 10 10" refX="3" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M10,0 L0,5 L10,10 z" fill="${BIB}"/></marker></defs>`;

function frameSVG(d, q, extra, label){
  const id = ++uidN, F = fk(q);
  const props = (d.props || []).concat(extra || []);
  const back = props.filter(p => ['box','bench','step','wall','board','hurdle','line','cone'].includes(p.t));
  const front = props.filter(p => !back.includes(p));
  const top = d.top || 0;
  return `<svg viewBox="0 ${top} ${W} ${H - top}" role="img" aria-label="${label || ''}">${defs(id)}
    <line x1="0" y1="${G}" x2="${W}" y2="${G}" stroke="#B5C4B9" stroke-width="2"/>
    ${back.map(p => prop(p, F, id)).join('')}${figure(F)}${front.map(p => prop(p, F, id)).join('')}</svg>`;
}

/* ---------- Interpolación para la animación ---------- */
function lerpQ(a, b, u){
  const L = (x, y, dflt) => { x = x == null ? dflt : x; y = y == null ? dflt : y; return x + (y - x) * u; };
  const LA = (x, y, dflt) => { x = x || dflt; y = y || dflt; return x.map((v, i) => v == null ? v : L(v, y[i], v)); };
  return {x:L(a.x, b.x, 60), air:L(a.air, b.air, 0), t:L(a.t, b.t, 0), hd:(a.hd == null && b.hd == null) ? null : L(a.hd == null ? a.t || 0 : a.hd, b.hd == null ? b.t || 0 : b.hd, 0),
    sp:L(a.sp, b.sp, 0), a1:LA(a.a1, b.a1, [8,15]), a2:LA(a.a2, b.a2, [-8,-2]), l1:LA(a.l1, b.l1, [2,0,90]), l2:LA(a.l2, b.l2, [-2,0,90]),
    front:a.front, lite:a.lite, hold:a.hold};
}
const ease = u => u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;

/* ---------- Cancha vista desde arriba ---------- */
function mapSVG(m){
  const id = ++uidN, w = m.w || 260, h = m.h || 110;
  const style = {run:`stroke="${BIB}" stroke-width="3"`, jog:'stroke="#5F6F65" stroke-width="2" stroke-dasharray="5 4"',
    ball:`stroke="${INK}" stroke-width="2.2" stroke-dasharray="1 4.5"`, back:'stroke="#5F6F65" stroke-width="2" stroke-dasharray="2 3"', pass:'stroke="#2F6FB5" stroke-width="2" stroke-dasharray="6 3"'};
  const mk = {run:'ah', jog:'ahg', ball:'ahk', back:'ahg', pass:'ahb'};
  let s = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${m.label || 'Croquis del ejercicio'}"><defs>
    <marker id="ah${id}" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="${BIB}"/></marker>
    <marker id="ahg${id}" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#5F6F65"/></marker>
    <marker id="ahk${id}" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="${INK}"/></marker>
    <marker id="ahb${id}" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#2F6FB5"/></marker></defs>
    <rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="10" fill="#E2EFE5" stroke="#C6D8CB"/>`;
  (m.lines || []).forEach(l => { s += `<line x1="${l[0]}" y1="${l[1]}" x2="${l[2]}" y2="${l[3]}" stroke="#fff" stroke-width="2.5"/>`; });
  if (m.goal){ const g = m.goal; s += `<rect x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" fill="none" stroke="#fff" stroke-width="3"/>`; }
  (m.dims || []).forEach(d => {
    const [x1, y1] = d.a, [x2, y2] = d.b;
    s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#7E9284" stroke-width="1"/><line x1="${x1}" y1="${y1 - 4}" x2="${x1}" y2="${y1 + 4}" stroke="#7E9284"/><line x1="${x2}" y1="${y2 - 4}" x2="${x2}" y2="${y2 + 4}" stroke="#7E9284"/>
      <text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 4}" font-size="9" text-anchor="middle" fill="#3B4D42" font-weight="700">${d.t}</text>`;
  });
  (m.paths || []).forEach(p => {
    const k = p.k || 'run';
    const d = p.q ? `M${p.p[0].join(',')} Q${p.q.join(',')} ${p.p[1].join(',')}` : 'M' + p.p.map(x => x.join(',')).join(' L');
    s += `<path d="${d}" fill="none" ${style[k]} stroke-linecap="round" stroke-linejoin="round" marker-end="url(#${mk[k]}${id})"/>`;
  });
  (m.cones || []).forEach(c => { s += `<circle cx="${c[0]}" cy="${c[1]}" r="4.5" fill="${BIB}" stroke="#fff" stroke-width="1.5"/>`; });
  (m.balls || []).forEach(b => { s += ball(b[0], b[1], 4.5); });
  (m.pl || []).forEach(p => {
    const fill = p.c === 'mate' ? '#fff' : (p.c === 'gk' ? '#2F6FB5' : PITCH), tc = p.c === 'mate' ? INK : '#fff';
    s += `<circle cx="${p.x}" cy="${p.y}" r="8" fill="${fill}" stroke="${p.c === 'mate' ? INK : '#fff'}" stroke-width="1.5"/><text x="${p.x}" y="${p.y + 3.2}" font-size="8.5" text-anchor="middle" fill="${tc}" font-weight="700">${p.t || ''}</text>`;
  });
  (m.txt || []).forEach(t => { s += `<text x="${t[0]}" y="${t[1]}" font-size="${t[3] || 9}" text-anchor="${t[4] || 'middle'}" fill="#3B4D42" font-weight="700">${t[2]}</text>`; });
  return s + '</svg>';
}
function mapLegend(m){
  const used = new Set((m.paths || []).map(p => p.k || 'run'));
  const L = {run:['run','Sprint'], jog:['jog','Trote o caminando'], ball:['ball','Con balón'], back:['back','Hacia atrás'], pass:['pass','Pase']};
  const items = Object.keys(L).filter(k => used.has(k)).map(k => `<span><i class="lg-${k}"></i>${L[k][1]}</span>`);
  if ((m.pl || []).some(p => !p.c || p.c === 'me')) items.unshift('<span><i class="lg-me"></i>Tú</span>');
  if ((m.pl || []).some(p => p.c === 'mate')) items.push('<span><i class="lg-mate"></i>Compañero</span>');
  if ((m.cones || []).length) items.push('<span><i class="lg-cone"></i>Cono</span>');
  return items.join('');
}

/* ---------- Línea de tiempo de intervalos ---------- */
function tlSVG(t){
  const w = 280, base = 70, total = t.b.reduce((a, b) => a + b.d, 0), sx = (w - 20) / total;
  const crowd = t.b.filter(b => b.l).length > 5;
  let x = 10, li = 0, s = `<svg viewBox="0 0 ${w} ${crowd ? 112 : 100}" role="img" aria-label="${t.label || 'Intervalos'}">`;
  t.b.forEach(b => {
    const bw = b.d * sx, hh = b.lv === 3 ? 52 : b.lv === 2 ? 34 : 16;
    const fill = b.lv === 3 ? BIB : b.lv === 2 ? '#F6B07A' : '#C3D3C8';
    s += `<rect x="${r1(x + 1)}" y="${base - hh}" width="${r1(bw - 2)}" height="${hh}" rx="3" fill="${fill}"/>`;
    if (b.l){ const yy = base + 12 + (crowd && li % 2 ? 11 : 0); li++;
      s += `<text x="${r1(x + bw / 2)}" y="${yy}" font-size="8.5" text-anchor="middle" fill="#3B4D42" font-weight="700">${b.l}</text>`; }
    if (b.top) s += `<text x="${r1(x + bw / 2)}" y="${base - hh - 4}" font-size="8" text-anchor="middle" fill="#3B4D42">${b.top}</text>`;
    x += bw;
  });
  s += `<line x1="8" y1="${base}" x2="${w - 8}" y2="${base}" stroke="#7E9284" stroke-width="1"/>`;
  if (t.foot) s += `<text x="${w / 2}" y="${crowd ? 108 : 96}" font-size="9" text-anchor="middle" fill="#5F6F65">${t.foot}</text>`;
  return s + '</svg>';
}

/* =====================================================================
   POSES BASE (vista de lado, mirando a la derecha)
   t tronco · a1/a2 brazo cercano/lejano [brazo, antebrazo]
   l1/l2 pierna cercana/lejana [muslo, espinilla, pie]
   Ángulos: 0 = vertical, positivo = hacia el frente.
   ===================================================================== */
const o = (b, e) => Object.assign({}, b, e);
const P = {
  stand:{t:0, a1:[8,15], a2:[-8,-2], l1:[2,0,90], l2:[-2,0,90]},
  toes:{t:0, a1:[8,15], a2:[-8,-2], l1:[1,0,28], l2:[-1,0,28]},
  armsUpToes:{t:0, a1:[172,176], a2:[166,172], l1:[1,0,28], l2:[-1,0,28]},
  load:{t:42, a1:[-80,-62], a2:[-86,-68], l1:[72,-35,90], l2:[68,-38,90]},
  athl:{t:28, a1:[20,55], a2:[14,50], l1:[48,-28,90], l2:[44,-30,90]},
  land:{t:34, a1:[60,88], a2:[54,84], l1:[64,-32,90], l2:[60,-34,90]},
  air:{air:24, t:4, a1:[165,172], a2:[160,168], l1:[10,-4,32], l2:[6,-8,32]},
  fly:{air:18, t:22, a1:[150,165], a2:[144,160], l1:[58,-24,60], l2:[52,-30,60]},
  acc1:{t:45, a1:[-70,10], a2:[70,150], l1:[80,20,110], l2:[-30,-45,20]},
  acc2:{t:45, a1:[70,150], a2:[-70,10], l1:[-30,-45,20], l2:[80,20,110]},
  run:{t:10, a1:[-45,40], a2:[50,140], l1:[70,-5,100], l2:[-25,-40,30]},
  gobUp:{t:0, a1:[22,162], a2:[16,160], l1:[3,0,90], l2:[-3,0,90], hold:'db'},
  gobDn:{t:38, a1:[24,164], a2:[18,162], l1:[100,-42,90], l2:[96,-44,90], hold:'db'}
};
const FV = {   // vista de frente: + = hacia la derecha del dibujo
  stand:{front:true, t:0, a1:[-12,-6], a2:[12,6], l1:[-4,0,-90], l2:[4,0,90]},
  gk:{front:true, t:0, a1:[-38,168], a2:[38,-168], l1:[-14,6,-90,.86], l2:[14,-6,90,.86]}
};

/* =====================================================================
   DIAGRAMAS POR EJERCICIO
   ===================================================================== */
const D = {
  pogos:{k:[
    {q:o(P.toes,{x:62}), c:'Piernas casi rectas, sobre la parte delantera del pie'},
    {q:o(P.toes,{x:62, air:10, l1:[3,-3,22], l2:[-1,-5,22], a1:[14,24], a2:[-12,-6]}), c:'Rebota desde el tobillo, con contacto corto', p:[{t:'arr', d:'M100 104 L100 84', both:true}]}]},

  snapdown:{top:-6, k:[
    {q:o(P.armsUpToes,{x:60}), c:'De puntas, con los brazos arriba'},
    {q:o(P.land,{x:60, a1:[-45,-30], a2:[-52,-38]}), c:'Baja los brazos de golpe y frena en media sentadilla 2 s', p:[{t:'txt', x:104, y:56, v:'rodilla', s:7},{t:'txt', x:104, y:64, v:'sobre el pie', s:7}]}]},

  box_jump:{top:-26, props:[{t:'box', x:86, w:34, h:24}], k:[
    {q:o(P.load,{x:36}), c:'Carga: cadera atrás y brazos atrás'},
    {q:o(P.air,{x:72, air:32}), c:'Despega con los brazos', p:[{t:'arc', a:[44,74], b:[94,62], h:24}]},
    {q:o(P.athl,{x:96, air:24}), c:'Cae suave arriba, en la misma postura. Baja caminando.'}]},

  broad_pausa:{top:-10, k:[
    {q:o(P.load,{x:26}), c:'Carga con los brazos atrás'},
    {q:o(P.fly,{x:60}), c:'Salta lejos y un poco hacia arriba', p:[{t:'arc', a:[30,84], b:[92,84], h:34}]},
    {q:o(P.land,{x:84}), c:'Cae y congela 2 s: rodillas en línea con los pies'}]},

  triple:{top:-8, k:[
    {q:o(P.fly,{x:28, air:12}), c:'Primer salto'},
    {q:o(P.athl,{x:62, t:32, a1:[-40,-30], a2:[-46,-36]}), c:'Contacto corto y sale el siguiente', p:[{t:'arc', a:[14,96], b:[46,96], h:14},{t:'arc', a:[70,96], b:[104,96], h:14}]},
    {q:o(P.land,{x:84}), c:'Al tercero, congela la caída'}]},

  skater_pausa:{top:-12, k:[
    {q:{front:true, x:40, t:-6, a1:[-30,-20], a2:[-25,-55], l1:[-2,4,-90,.86], l2:[10,-40,-90,.8], lite:['l2']}, c:'Sobre la pierna izquierda, cadera atrás'},
    {q:{front:true, x:66, air:12, t:4, a1:[-55,-70], a2:[55,70], l1:[-22,-14,-90], l2:[24,14,90]}, c:'Empuja de lado', p:[{t:'arr', d:'M42 -4 L90 -4'}]},
    {q:{front:true, x:92, t:6, a1:[30,20], a2:[25,55], l1:[-10,40,90,.8], l2:[2,-4,90,.86], lite:['l1']}, c:'Cae en la otra pierna y congela 2 s', p:[{t:'txt', x:46, y:66, v:'rodilla', s:7},{t:'txt', x:46, y:74, v:'sobre el pie', s:7}]}]},

  hop_1p:{top:-8, k:[
    {q:o(P.athl,{x:30, l2:[25,-75,-10]}), c:'Sobre una pierna, cadera atrás'},
    {q:o(P.fly,{x:60, air:14, l2:[30,-70,-10]}), c:'Salto corto hacia adelante', p:[{t:'arc', a:[36,86], b:[90,86], h:22}]},
    {q:o(P.land,{x:84, l2:[30,-78,-10]}), c:'Cae en la misma pierna y congela 2 s'}]},

  vallas:{top:-4, props:[{t:'hurdle', x:50},{t:'hurdle', x:100}], k:[
    {q:o(P.athl,{x:24}), c:'Pies juntos detrás de la valla'},
    {q:o(P.air,{x:50, air:16, a1:[60,95], a2:[52,90], l1:[34,-30,40], l2:[30,-34,40]}), c:'Salta con los tobillos y los brazos'},
    {q:o(P.athl,{x:76, t:22}), c:'Toca el piso lo menos posible y sigue', p:[{t:'arc', a:[30,96], b:[70,96], h:30}]}]},

  linea_lat:{props:[{t:'line', x:65}], k:[
    {q:o(FV.stand,{x:50, l1:[-3,0,-90], l2:[3,0,90]}), c:'Pies juntos a un lado de la línea'},
    {q:o(FV.stand,{x:65, air:7, l1:[-3,0,-90], l2:[3,0,90], a1:[-24,-14], a2:[24,14]}), c:'Salto corto de lado', p:[{t:'arr', d:'M48 30 L82 30', both:true}]},
    {q:o(FV.stand,{x:80, l1:[-3,0,-90], l2:[3,0,90]}), c:'Del otro lado, y regresa rápido'}]},

  power_skip:{top:-10, k:[
    {q:{x:60, air:12, t:8, a1:[-38,25], a2:[165,170], l1:[88,0,100], l2:[-12,-14,30]}, c:'Rodilla arriba y el brazo contrario al cielo'},
    {q:{x:60, air:12, t:8, a1:[165,170], a2:[-38,25], l1:[-12,-14,30], l2:[88,0,100]}, c:'Cambia de lado: busca altura, no velocidad'}]},

  arrancada10:{k:[
    {q:o(P.acc1,{x:40}), c:'Cuerpo inclinado y pasos cortos'},
    {q:o(P.acc2,{x:82}), c:'Empuja el piso hacia atrás, brazos fuertes', p:[{t:'arr', d:'M20 24 L112 24'}]}]},

  desacel:{k:[
    {q:o(P.run,{x:30}), c:'Sprint de 10 m'},
    {q:{x:66, t:-4, a1:[40,75], a2:[-25,15], l1:[58,22,90], l2:[12,-62,40]}, c:'Frena: cadera abajo, pies por delante'},
    {q:o(P.athl,{x:92}), c:'Congela 2 s en postura atlética'}]},

  skipA:{k:[
    {q:{x:60, t:0, a1:[-40,45], a2:[50,140], l1:[90,0,100], l2:[0,0,35]}, c:'Rodilla a la altura de la cadera, punta del pie arriba'},
    {q:{x:60, t:0, a1:[50,140], a2:[-40,45], l1:[0,0,35], l2:[90,0,100]}, c:'Pisa debajo de la cadera y cambia rápido'}]},

  sentadilla:{k:[
    {q:o(P.gobUp,{x:56}), c:'De pie, peso al pecho'},
    {q:o(P.gobDn,{x:48}), c:'Baja con la espalda neutra, rodillas siguiendo los pies', p:[{t:'arr', d:'M104 40 L104 74', dash:true}]},
    {q:o(P.gobUp,{x:56}), c:'Sube rápido, con intención', p:[{t:'arr', d:'M104 74 L104 40', dash:true}]}]},

  rdl1p:{k:[
    {q:{x:52, t:0, a1:[2,2], a2:[-6,-4], l1:[4,-2,90], l2:[-10,-22,40], hold:'db'}, c:'Sobre una pierna, rodilla un poco doblada'},
    {q:{x:44, t:80, hd:82, a1:[0,0], a2:[4,2], l1:[18,-8,90], l2:[-96,-96,0], hold:'db'}, c:'Inclina el tronco y la otra pierna va atrás como una sola pieza'}]},

  hip_thrust:{props:[{t:'bench', x:24, w:28, h:18}], k:[
    {q:{x:70, t:-55, hd:-60, a1:[-40,-90], a2:[-44,-92], l1:[125,8,90], l2:[123,6,90]}, c:'Espalda alta en la banca, cadera abajo'},
    {q:{x:76, t:-92, hd:-80, a1:[-40,-90], a2:[-44,-92], l1:[92,0,90], l2:[90,-2,90]}, c:'Sube hasta alinear rodillas, cadera y hombros; pausa 2 s', p:[{t:'arr', d:'M70 98 L70 80'}]}]},

  talones1p:{props:[{t:'step', x:53, w:50, h:10}], k:[
    {q:{x:50, air:5, t:0, a1:[8,15], a2:[-8,-2], l1:[0,0,120], l2:[22,-62,60]}, c:'Talón por debajo del escalón'},
    {q:{x:50, air:8.5, t:0, a1:[8,15], a2:[-8,-2], l1:[0,0,30], l2:[22,-62,60]}, c:'Sube lo más alto que puedas y baja lento', p:[{t:'arr', d:'M36 104 L36 88', both:true}]}]},

  nordico:{props:[], k:[
    {q:{x:40, t:0, a1:[30,160], a2:[26,158], l1:[0,-90,-170], l2:[0,-90,-170]}, c:'De rodillas, cuerpo recto y glúteo apretado', p:[{t:'anchor', at:'an1', dy:0}]},
    {q:{x:53, t:40, a1:[40,150], a2:[36,148], l1:[-40,-90,-170], l2:[-40,-90,-170]}, c:'Déjate caer lo más lento posible', p:[{t:'anchor', at:'an1', dy:0}]},
    {q:{x:60, t:75, a1:[80,60], a2:[76,56], l1:[-75,-90,-170], l2:[-75,-90,-170]}, c:'Al final, frena con las manos y empuja para volver', p:[{t:'anchor', at:'an1', dy:0}]}]},

  copenhague:{props:[{t:'bench', x:18, w:30, h:24}], k:[
    {q:{x:75, t:70, hd:72, a1:[0,90], a2:[-118,-118], l1:[-117,-117,-160], l2:[-90,-90,-170]}, c:'De lado sobre el codo, pierna de arriba en la banca'},
    {q:{x:73, t:96, hd:94, a1:[0,90], a2:[-82,-82], l1:[-96,-96,-160], l2:[-99,-99,-170]}, c:'Sube la cadera: cuerpo en línea, la pierna de abajo sube a tocar la banca', p:[{t:'arr', d:'M64 104 L64 88'}]}]},

  deadbug:{k:[
    {q:{x:66, t:-90, hd:-90, a1:[180,180], a2:[178,178], l1:[180,90,160], l2:[178,88,160]}, c:'Boca arriba, brazos al techo y rodillas a 90°'},
    {q:{x:66, t:-90, hd:-90, a1:[-95,-92], a2:[178,178], l1:[180,90,160], l2:[100,96,150]}, c:'Estira un brazo y la pierna contraria, lento. La espalda baja no se despega.'}]},

  plancha_lat:{k:[
    {q:{x:62, t:77, hd:78, a1:[0,90], a2:[-150,-120], l1:[-77,-77,-160], l2:[-79,-79,-160]}, c:'Bien: cadera alta, cuerpo en línea', p:[{t:'ok', x:112, y:22}]},
    {q:{x:62, t:60, hd:66, a1:[0,90], a2:[-150,-120], l1:[-85,-85,-160], l2:[-87,-87,-160]}, c:'Mal: la cadera se cae', p:[{t:'no', x:112, y:22}]}]},

  wgs:{k:[
    {q:{x:58, t:70, hd:60, a1:[10,0], a2:[14,4], l1:[85,-5,90], l2:[-62,-70,20]}, c:'Paso largo y las dos manos por dentro del pie'},
    {q:{x:58, t:62, hd:40, a1:[180,180], a2:[12,2], l1:[85,-5,90], l2:[-62,-70,20]}, c:'Gira el pecho y sube el brazo al cielo'}]},

  tobillo_pared:{props:[{t:'wall', x:98}], k:[
    {q:{x:80, t:6, a1:[40,140], a2:[34,138], l1:[10,5,90], l2:[-25,-25,30]}, c:'Pie a 10 cm de la pared, talón en el piso'},
    {q:{x:82, t:8, a1:[40,140], a2:[34,138], l1:[45,-35,90], l2:[-22,-30,30]}, c:'Lleva la rodilla a tocar la pared sin levantar el talón', p:[{t:'arr', d:'M86 64 L94 64'}]}]},

  flexor:{k:[
    {q:{x:50, t:0, a1:[0,0], a2:[2,2], l1:[-20,-90,-90], l2:[85,0,90]}, c:'Rodilla de atrás en el piso, tronco recto'},
    {q:{x:55, t:-4, a1:[178,180], a2:[4,4], l1:[-30,-90,-90], l2:[84,-15,90]}, c:'Aprieta el glúteo, lleva la cadera al frente y sube el brazo'}]},

  puente:{k:[
    {q:{x:66, t:-90, hd:-90, a1:[95,92], a2:[95,92], l1:[135,45,90], l2:[133,43,90]}, c:'Boca arriba, pies a la altura de la cadera'},
    {q:{x:66, t:-115, hd:-95, a1:[100,95], a2:[100,95], l1:[95,0,90], l2:[93,-2,90]}, c:'Sube con los talones hasta alinear rodilla, cadera y hombro', p:[{t:'arr', d:'M62 104 L62 86'}]}]},

  gato:{k:[
    {q:{x:46, t:75, hd:150, sp:7, a1:[0,0], a2:[2,2], l1:[0,-90,-90], l2:[2,-90,-90]}, c:'Redondea la espalda mirando al ombligo'},
    {q:{x:46, t:75, hd:60, sp:-6, a1:[0,0], a2:[2,2], l1:[0,-90,-90], l2:[2,-90,-90]}, c:'Arquea mirando al frente, lento'}]},

  tt_cmj:{top:-26, props:[{t:'board', x:38, y:-20, w:44, h:70}], k:[
    {q:{x:58, t:0, a1:[178,180], a2:[-8,-2], l1:[2,0,90], l2:[-2,0,90]}, c:'De lado a la pared: estira el brazo y marca tu alcance', p:[{t:'mark', at:'ha1'}]},
    {q:{x:58, air:22, t:2, a1:[178,180], a2:[-20,-10], l1:[8,-6,30], l2:[4,-10,30]}, c:'Salta con contramovimiento y marca lo más alto', p:[{t:'mark', at:'ha1'},{t:'mark', x:58.5, y:10.5, c:'#8FA295'},{t:'txt', x:100, y:0, v:'tu salto', s:7}]}]},

  p_por_mie:{k:[
    {q:o(FV.gk,{x:38}), c:'Postura de portero, peso adelante'},
    {q:{front:true, x:72, air:14, t:62, hd:62, a1:[118,118], a2:[124,124], l1:[-40,-36,-90], l2:[-20,-18,90]}, c:'Empuja con la pierna contraria y vuela de lado', p:[{t:'arr', d:'M40 104 L96 104'}]},
    {q:o(FV.gk,{x:96}), c:'Cae en los pies (o en caída lateral con colchoneta)'}]},

  p_cen_mie:{top:-26, k:[
    {q:o(P.run,{x:28}), c:'Tres pasos de carrera'},
    {q:{x:64, air:20, t:6, a1:[160,170], a2:[150,166], l1:[82,0,100], l2:[-6,-10,30]}, c:'Despega con una pierna, rodilla arriba y brazos', p:[{t:'ball', x:74, y:8, r:5}]},
    {q:o(P.athl,{x:98}), c:'Cae con los dos pies, suave'}]},

  p_del_mie:{top:-24, k:[
    {q:o(P.air,{x:42}), c:'Salto vertical a dos pies, como a cabecear', p:[{t:'ball', x:50, y:6, r:5}]},
    {q:o(P.acc1,{x:88}), c:'Al caer, arranca 5 m', p:[{t:'arr', d:'M70 24 L118 24'}]}]},

  /* --------- Croquis de cancha --------- */
  drill505:{map:{cones:[[50,60],[130,60],[210,60]], lines:[[50,40,50,80],[210,40,210,80]],
    paths:[{p:[[130,52],[204,52]]},{p:[[206,64],[56,64]]},{p:[[56,76],[124,76]]}],
    dims:[{a:[50,96],b:[130,96],t:'5 m'},{a:[130,96],b:[210,96],t:'5 m'}], pl:[{x:130,y:30,t:'Tú'}],
    txt:[[130,16,'Sale del cono del centro'],[230,63,'1',9],[30,67,'2',9],[146,80,'3',9]]}},

  zigzag:{map:{cones:[[30,30],[80,80],[130,30],[180,80],[230,30]],
    paths:[{p:[[18,30],[30,34],[80,76],[130,34],[180,76],[226,36]]}], pl:[{x:16,y:56,t:'Tú'}],
    dims:[{a:[30,100],b:[80,100],t:'5 m'}], txt:[[130,16,'Ataca cada cono bajando la cadera']]}},

  sprint20:{map:{cones:[[30,40],[30,70],[230,40],[230,70]], lines:[[30,40,30,70],[230,40,230,70]],
    paths:[{p:[[42,55],[222,55]]}], pl:[{x:22,y:55,t:'Tú'}], dims:[{a:[30,92],b:[230,92],t:'20 m'}],
    txt:[[30,26,'Salida de pie'],[230,26,'Meta']]}},

  tt_30:{map:{cones:[[24,40],[24,70],[244,40],[244,70]], lines:[[24,40,24,70],[244,40,244,70]],
    paths:[{p:[[36,55],[236,55]]}], pl:[{x:16,y:55,t:'Tú'},{x:252,y:20,t:'⏱',c:'mate'}], dims:[{a:[24,92],b:[244,92],t:'30 m'}],
    txt:[[24,26,'Salida'],[214,24,'Cronometra']], w:270}},

  sprint_lanz:{map:{w:270, cones:[[15,40],[15,70],[95,40],[95,70],[255,40],[255,70]], lines:[[95,40,95,70],[255,40,255,70]],
    paths:[{p:[[22,55],[88,55]], k:'jog'},{p:[[100,55],[248,55]]}], dims:[{a:[15,92],b:[95,92],t:'10 m acelera'},{a:[95,92],b:[255,92],t:'20 m al máximo'}],
    pl:[{x:12,y:22,t:'Tú'}], txt:[[175,30,'Relaja cara y hombros']]}},

  acel_suave:{map:{cones:[[30,55],[230,55]], paths:[{p:[[40,55],[100,55]], k:'jog'},{p:[[104,55],[160,55]]},{p:[[164,55],[222,55]]}],
    pl:[{x:20,y:30,t:'Tú'}], dims:[{a:[30,90],b:[230,90],t:'20 m'}], txt:[[70,44,'60%'],[132,44,'75%'],[194,44,'85–90%']]}},

  reaccion:{map:{cones:[[60,30],[200,30],[60,82],[200,82]],
    paths:[{p:[[120,30],[80,30]], k:'jog'},{p:[[140,30],[180,30]], k:'jog'},{p:[[120,82],[80,82]]},{p:[[140,82],[180,82]]}],
    pl:[{x:130,y:30,t:'G',c:'mate'},{x:130,y:82,t:'Tú'}], dims:[{a:[60,104],b:[200,104],t:'5 m'}],
    txt:[[130,56,'Él se mueve, tú lo copias 5 s']]}},

  linea_map:null,

  p_por_jue:{map:{goal:{x:90,y:4,w:80,h:8}, lines:[[60,4,60,50],[200,4,200,50],[60,50,200,50]],
    paths:[{p:[[118,34],[84,34]], k:'jog'},{p:[[142,34],[176,34]], k:'jog'},{p:[[130,44],[130,74]], k:'jog'},{p:[[130,26],[130,16]], k:'jog'}],
    pl:[{x:130,y:34,t:'P',c:'gk'},{x:130,y:96,t:'C',c:'mate'}], txt:[[200,90,'Señala la dirección'],[200,100,'10 s por repetición']]}},

  p_por_vie:{map:{goal:{x:90,y:4,w:80,h:8}, lines:[[60,4,60,50],[200,4,200,50],[60,50,200,50]],
    paths:[{p:[[130,20],[160,40]], k:'pass'},{p:[[130,46],[154,48]]}],
    pl:[{x:130,y:56,t:'P',c:'gk'},{x:130,y:20,t:'C',c:'mate'}], balls:[[164,42]], txt:[[130,88,'El compañero suelta o lanza el balón a un lado'],[130,100,'Reacciona en cuanto lo veas']]}},

  p_cen_jue:{map:{cones:[[200,55],[160,55]], paths:[{p:[[196,55],[166,55]], k:'back'},{p:[[160,60],[150,76],[40,82]]}],
    pl:[{x:212,y:55,t:'Tú'}], dims:[{a:[160,40],b:[200,40],t:'5 m'},{a:[40,100],b:[160,100],t:'15 m'}],
    txt:[[128,16,'Atrás 5 m, abre la cadera y sprint']]}},

  p_cen_vie:{map:{cones:[[60,40],[200,40]], paths:[{p:[[124,24],[70,36]], k:'jog'},{p:[[124,70],[70,48]]}],
    pl:[{x:130,y:22,t:'A',c:'mate'},{x:130,y:74,t:'Tú'}], txt:[[130,96,'El atacante sale a un cono; tú llegas antes'],[60,26,'5 m'],[200,26,'5 m']]}},

  p_lat_mie:{map:{paths:[{p:[[30,70],[60,40]], k:'jog'},{p:[[60,40],[90,70]], k:'jog'},{p:[[94,66],[226,66]]}],
    cones:[[96,82],[226,82]], pl:[{x:22,y:80,t:'Tú'}], dims:[{a:[96,100],b:[226,100],t:'10 m'}], txt:[[60,26,'Patinador con pausa'],[160,50,'Arranca']]}},

  p_lat_jue:{map:{cones:[[30,40],[30,70],[230,40],[230,70]],
    paths:[{p:[[40,48],[222,48]]},{p:[[222,62],[40,62]], k:'jog'}], pl:[{x:22,y:55,t:'Tú'}],
    dims:[{a:[30,92],b:[230,92],t:'30 m'}], txt:[[130,24,'6 sprints, 20 s de descanso entre cada uno'],[130,78,'regresa trotando']]}},

  p_lat_vie:{map:{lines:[[10,10,250,10],[250,10,250,100],[190,10,190,64],[190,64,250,64]],
    paths:[{p:[[24,26],[230,26]], k:'ball'},{p:[[232,30],[214,52]], k:'pass'}], pl:[{x:18,y:26,t:'Tú'}],
    dims:[{a:[24,90],b:[230,90],t:'30 m por la banda'}], txt:[[218,80,'área'],[120,46,'conduce al máximo y centra']]}},

  p_med_mie:{map:{paths:[{q:[90,30], p:[[70,56],[96,52]], k:'jog'},{p:[[100,56],[220,56]]}],
    pl:[{x:70,y:56,t:'Tú'}], cones:[[220,72]], dims:[{a:[100,92],b:[220,92],t:'10 m'}], txt:[[70,30,'De espaldas'],[160,40,'Gira y arranca']]}},

  p_med_jue:{map:{paths:[{p:[[40,56],[110,56]], k:'pass'},{p:[[126,52],[150,30]], k:'ball'},{p:[[152,30],[230,30]], k:'ball'}],
    pl:[{x:30,y:56,t:'C',c:'mate'},{x:120,y:56,t:'Tú'}], balls:[[40,56]], dims:[{a:[150,90],b:[230,90],t:'10 m'}],
    txt:[[92,82,'Mira por encima de los dos hombros'],[190,20,'control orientado y sal']]}},

  p_ext_mie:{map:{cones:[[60,90],[100,70],[130,46],[150,24]], paths:[{q:[150,96], p:[[30,90],[200,20]]}],
    pl:[{x:22,y:92,t:'Tú'}], txt:[[190,80,'Inclínate hacia'],[190,92,'adentro de la curva']]}},

  p_ext_jue:{map:{cones:[[120,56]], paths:[{p:[[30,56],[110,56]], k:'ball'},{p:[[112,52],[160,22]], k:'ball'},{p:[[166,20],[230,20]]}],
    pl:[{x:22,y:56,t:'Tú'}], txt:[[120,82,'Amaga a 2 m del cono'],[200,40,'acelera 10 m']]}},

  p_ext_vie:{map:{paths:[{p:[[170,56],[192,40]], k:'jog'},{p:[[162,60],[68,76]]}], pl:[{x:170,y:56,t:'Tú'}],
    cones:[[60,80]], dims:[{a:[60,100],b:[162,100],t:'10 m'}], txt:[[212,32,'amago'],[100,40,'arranca al lado contrario']]}},

  p_del_jue:{map:{paths:[{p:[[130,70],[130,50]], k:'jog'},{p:[[134,46],[212,18]]},{q:[150,96], p:[[40,74],[206,30]], k:'pass'}],
    pl:[{x:130,y:78,t:'Tú'},{x:30,y:70,t:'C',c:'mate'}], balls:[[40,70]], txt:[[96,40,'amaga recibir'],[210,40,'arranca 10 m'],[210,52,'en diagonal']]}},

  p_del_vie:{map:{goal:{x:226,y:30,w:10,h:50}, paths:[{p:[[40,55],[136,55]]},{p:[[146,55],[222,46]], k:'pass'}],
    pl:[{x:30,y:55,t:'Tú'}], balls:[[142,55]], dims:[{a:[40,92],b:[136,92],t:'10 m'}], txt:[[180,30,'remata']]}},

  p_med_vie:{tl:{b:[{d:10,lv:1,l:'10 s trote'},{d:5,lv:3,l:'5 s'},{d:10,lv:1},{d:5,lv:3},{d:10,lv:1},{d:5,lv:3},{d:10,lv:1},{d:5,lv:3}],
    foot:'1 serie = 4 cambios seguidos. 2 min de descanso entre series.'}},

  /* --------- Intervalos --------- */
  hiit4x4:{tl:{b:[{d:4,lv:3,l:'4 min',top:'muy duro'},{d:3,lv:1,l:'3 min',top:'trote'},{d:4,lv:3,l:'4 min'},{d:3,lv:1,l:'3 min'},{d:4,lv:3,l:'4 min'},{d:3,lv:1,l:'3 min'},{d:4,lv:3,l:'4 min'}],
    foot:'Muy duro = solo puedes decir 2 o 3 palabras. Total: 25 minutos.'}},
  comp:{tl:{b:[{d:3,lv:3,l:'3 min'},{d:2,lv:1,l:'2 min'},{d:3,lv:3,l:'3 min'},{d:2,lv:1,l:'2 min'},{d:3,lv:3,l:'3 min'},{d:2,lv:1},{d:.5,lv:3},{d:1,lv:1},{d:.5,lv:3},{d:1,lv:1},{d:.5,lv:3},{d:1,lv:1},{d:.5,lv:3},{d:1,lv:1},{d:.5,lv:3},{d:1,lv:1},{d:.5,lv:3}],
    foot:'3 × 3 min duros, luego 6 sprints de 20 m con 1 min de descanso.'}},
  calent_partido:{tl:{b:[{d:3,lv:1,l:'Trote y cadera',top:'3 min'},{d:3,lv:2,l:'Estocadas, saltos',top:'3 min'},{d:3,lv:1,l:'Balón',top:'3 min'},{d:2,lv:3,l:'Aceleraciones',top:'2 min'}],
    foot:'Termina 5 minutos antes de empezar el partido.'}},
  calent:{tl:{b:[{d:2,lv:1,l:'Trote',top:'2 min'},{d:1.5,lv:1,l:'Cadera'},{d:1.5,lv:2,l:'Lateral'},{d:1.5,lv:2,l:'Skipping'},{d:1.5,lv:1,l:'Balanceos'},{d:1.5,lv:2,l:'Estocadas'},{d:1.5,lv:3,l:'Progresivos'}],
    foot:'8 a 10 minutos, ida y vuelta en 15 a 20 m.'}}
};
D.skater_reac = {k:D.skater_pausa.k.map((f, i) => o(f, {c:['Cae sobre una pierna','Rebota de inmediato al otro lado','Contacto corto, sin pausa'][i]}))};
D.tt_505 = D.drill505;
delete D.linea_map;

/* ---------- Videos: búsqueda exacta en YouTube ---------- */
const V = {
  calent:['FIFA 11+ calentamiento parte 1 carrera','FIFA 11+ part 1 running exercises'],
  trote_z2:['trote zona 2 test del habla','zone 2 running talk test'],
  cadera_9090:['movilidad de cadera 90 90 tutorial','90 90 hip switch mobility tutorial'],
  wgs:['estocada con rotación torácica estiramiento',"world's greatest stretch tutorial"],
  tobillo_pared:['test rodilla a la pared movilidad de tobillo','knee to wall ankle dorsiflexion test'],
  flexor:['estiramiento flexor de cadera media rodilla','half kneeling hip flexor stretch'],
  puente:['puente de glúteo técnica correcta','glute bridge proper form'],
  gato:['ejercicio gato camello columna','cat cow exercise how to'],
  foam:['foam roller piernas rutina futbolistas','foam rolling legs routine soccer'],
  pogos:['pogo jumps técnica saltos de tobillo','pogo jumps technique'],
  snapdown:['snap down ejercicio aterrizaje','snap down drill landing mechanics'],
  box_jump:['salto al cajón técnica correcta principiantes','box jump technique for beginners'],
  broad_pausa:['salto horizontal con aterrizaje controlado','broad jump stick landing'],
  triple:['triple salto horizontal pies juntos','triple broad jump drill'],
  skater_pausa:['salto de patinador con pausa','skater jump stick landing'],
  skater_reac:['saltos de patinador reactivos','reactive skater bounds'],
  hop_1p:['salto a una pierna con aterrizaje controlado','single leg hop and stick'],
  vallas:['saltos mini vallas pies juntos','mini hurdle hops two feet'],
  linea_lat:['saltos laterales sobre línea pies rápidos','lateral line hops quick feet'],
  power_skip:['skip de potencia técnica','power skips technique'],
  arrancada10:['ejercicios de aceleración 10 metros futbol','acceleration drills soccer 10 meters'],
  drill505:['prueba 5-10-5 agilidad cómo se hace','5-10-5 pro agility shuttle how to'],
  desacel:['ejercicios de desaceleración futbol frenado','deceleration drill soccer'],
  zigzag:['zigzag conos cambios de dirección futbol','cone zig zag drill soccer'],
  skipA:['skipping A técnica de carrera','A skip drill sprint technique'],
  sprint20:['sprint 20 metros salida de pie técnica','20m sprint standing start technique'],
  sprint_lanz:['sprint lanzado velocidad máxima','flying sprint drill'],
  reaccion:['ejercicio espejo agilidad reactiva futbol','mirror drill reactive agility soccer'],
  acel_suave:['aceleraciones progresivas calentamiento','build up runs strides warm up'],
  hiit4x4:['intervalos 4x4 Helgerud futbol','4x4 interval training Helgerud soccer'],
  comp:['entrenamiento compensatorio suplentes futbol','compensatory training substitutes soccer'],
  sentadilla:['sentadilla goblet técnica correcta','goblet squat proper form'],
  rdl1p:['peso muerto rumano a una pierna técnica','single leg romanian deadlift form'],
  hip_thrust:['hip thrust técnica correcta','hip thrust proper form bench'],
  talones1p:['elevación de talones a una pierna en escalón','single leg calf raise on step'],
  nordico:['curl nórdico isquiotibiales progresión','nordic hamstring curl progression'],
  copenhague:['plancha copenhague aductores progresión','copenhagen adduction exercise progression'],
  deadbug:['dead bug ejercicio core técnica','dead bug exercise proper form'],
  plancha_lat:['plancha lateral técnica correcta','side plank proper form'],
  balon:['rondo 4 contra 1 calentamiento futbol','rondo 4v1 warm up soccer'],
  calent_partido:['FIFA 11+ calentamiento completo','FIFA 11+ full warm up program'],
  enfriamiento:['vuelta a la calma después del partido de futbol','post match cool down soccer'],
  tt_cmj:['prueba salto vertical en la pared cómo medir','vertical jump test wall reach'],
  tt_30:['prueba sprint 30 metros cómo medir','30 meter sprint test how to'],
  tt_505:['prueba 5-10-5 agilidad cómo se hace','5-10-5 pro agility shuttle how to'],
  p_por_mie:['ejercicio portero salto lateral explosivo','goalkeeper lateral jump power drill'],
  p_por_jue:['ejercicios desplazamientos portero reacción','goalkeeper footwork reaction drill'],
  p_por_vie:['ejercicio reflejos portero balón soltado','goalkeeper reaction drop ball drill'],
  p_cen_mie:['ejercicio salto de cabeceo defensa','heading jump drill defender'],
  p_cen_jue:['defensa carrera hacia atrás giro de cadera','defender backpedal hip turn sprint'],
  p_cen_vie:['duelo 1 contra 1 reacción defensa ejercicio','1v1 defending reaction drill soccer'],
  p_lat_mie:['salto patinador y sprint ejercicio','skater jump to sprint drill'],
  p_lat_jue:['sprints repetidos 6 x 30 metros futbol','repeated sprint ability 6 x 30m soccer'],
  p_lat_vie:['ejercicio sprint por banda y centro','wide player sprint and cross drill'],
  p_med_mie:['giro 180 grados y arrancada futbol','180 turn and sprint drill soccer'],
  p_med_jue:['perfilarse control orientado escanear ejercicio','scanning receiving half turned drill'],
  p_med_vie:['cambios de ritmo ejercicio futbol','change of pace drill soccer'],
  p_ext_mie:['carrera en curva extremo ejercicio','curved sprint drill winger'],
  p_ext_jue:['1 contra 1 extremo cambio de dirección','winger 1v1 change of direction drill'],
  p_ext_vie:['amago y arrancada ejercicio futbol','feint and sprint drill soccer'],
  p_del_mie:['salto de cabeceo y arrancada delantero','striker heading jump and sprint'],
  p_del_jue:['desmarque delantero amago y arrancada','striker check run off the ball drill'],
  p_del_vie:['arrancada y remate ejercicio delantero','sprint and finish drill striker']
};

/* ---------- API pública ---------- */
function has(id){ const d = D[id]; return !!(d && (d.k || d.map || d.tl)); }
function strip(id){
  const d = D[id]; if (!has(id)) return '';
  if (d.map) return `<div class="dg-map">${mapSVG(d.map)}</div><div class="dg-legend">${mapLegend(d.map)}</div>`;
  if (d.tl) return `<div class="dg-map">${tlSVG(d.tl)}</div>`;
  return `<ol class="dg-strip">${d.k.map((f, i) => `<li><div class="dg-frame">${frameSVG(d, f.q, f.p, f.c)}</div><p><b>${i + 1}</b> ${f.c}</p></li>`).join('')}</ol>`;
}
function thumb(id){
  const d = D[id]; if (!has(id)) return '';
  if (d.map) return mapSVG(d.map);
  if (d.tl) return tlSVG(d.tl);
  const f = d.k[d.k.length > 2 ? 1 : d.k.length - 1];
  return frameSVG(d, f.q, f.p, '');
}
function canAnimate(id){ const d = D[id]; return !!(d && d.k && d.k.length > 1); }
function animate(el, id){
  const d = D[id]; if (!canAnimate(id)) return () => {};
  const keys = d.k.map(f => f.q), n = keys.length, seg = 650, hold = 450, per = seg + hold;
  let t0 = null, raf = 0, stop = false;
  const tick = ts => {
    if (stop || !el.isConnected) return;
    if (t0 == null) t0 = ts;
    const e = (ts - t0) % (per * n), i = Math.floor(e / per), r = e - i * per;
    const u = r < hold ? 0 : ease((r - hold) / seg);
    const q = i === n - 1 ? (u > 0 ? keys[0] : keys[i]) : lerpQ(keys[i], keys[i + 1], u);
    el.innerHTML = frameSVG(d, q, [], '');
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => { stop = true; cancelAnimationFrame(raf); };
}
function video(id){ return V[id] || null; }
function all(){ return Object.keys(D); }
window.DIAG = {has, strip, thumb, canAnimate, animate, video, all, _fk:fk};
})();
