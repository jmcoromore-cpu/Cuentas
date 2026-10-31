'use strict';

/* =========================================================
   Cuentas — control personal de gastos, ingresos e inversiones
   Los datos se guardan en este dispositivo (localStorage).
   ========================================================= */

const KEY = 'cuentas.v1';
const CATS = ['Comida', 'Transporte', 'Ocio', 'Casa', 'Compras', 'Salud', 'Otros'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const INI = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const ORIGEN = { cuenta: 'Cuenta', efectivo: 'Efectivo' };
const TIPOS = {
  gasto:     { nombre: 'Gasto',     icon: 'gasto' },
  ingreso:   { nombre: 'Ingreso',   icon: 'ingreso' },
  inversion: { nombre: 'Inversión', icon: 'inversion' },
  traspaso:  { nombre: 'Traspaso',  icon: 'traspaso' },
};

const ICON = {
  prev: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
  next: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>',
  close: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  cuenta: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/></svg>',
  efectivo: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="2" y="7" width="20" height="11" rx="2"/><circle cx="12" cy="12.5" r="2.5"/></svg>',
  gasto: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>',
  ingreso: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
  inversion: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>',
  traspaso: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 8h14l-3-3M20 16H6l3 3"/></svg>',
  cal: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
};

/* ---------------- Datos ---------------- */

function cargar() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && Array.isArray(d.movs)) {
      return { movs: d.movs, inicial: Object.assign({ cuenta: 0, efectivo: 0 }, d.inicial) };
    }
  } catch (e) { /* datos dañados: empezamos de cero */ }
  return { movs: [], inicial: { cuenta: 0, efectivo: 0 } };
}
const db = cargar();
function guardar() {
  try { localStorage.setItem(KEY, JSON.stringify(db)); }
  catch (e) { aviso('No se ha podido guardar en este dispositivo'); }
}

/* ---------------- Utilidades ---------------- */

const pad = n => String(n).padStart(2, '0');
const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const aFecha = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const r2 = n => Math.round(n * 100) / 100;

let fmtEur;
try { fmtEur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', useGrouping: 'always' }); }
catch (e) { fmtEur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }); }
const eur = n => fmtEur.format(Math.abs(n) < 0.005 ? 0 : n);
const eurSigno = n => (n > 0.004 ? '+' : n < -0.004 ? '−' : '') + fmtEur.format(Math.abs(n));
const eurCorto = n => eur(n).replace(/\s?€/, '');

const fmtDia = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
const fmtDiaLargo = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });
function etiquetaDia(s) {
  const h = aFecha(hoy());
  const d = aFecha(s);
  const diff = Math.round((h - d) / 86400000);
  const base = fmtDia.format(d).replace(/\./g, '');
  if (diff === 0) return 'Hoy · ' + base;
  if (diff === 1) return 'Ayer · ' + base;
  return base;
}

function parseCantidad(s) {
  let t = String(s || '').trim().replace(/\s|€/g, '');
  if (!t) return NaN;
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  const n = Number(t);
  return Number.isFinite(n) ? r2(n) : NaN;
}

function movsDe(y, m) {
  const pre = m == null ? `${y}-` : `${y}-${pad(m + 1)}-`;
  return db.movs.filter(x => x.fecha.startsWith(pre));
}

function totales(movs) {
  const z = () => ({ ing: 0, gas: 0, inv: 0 });
  const t = { efectivo: z(), cuenta: z() };
  for (const m of movs) {
    const o = t[m.origen];
    if (!o) continue;
    if (m.tipo === 'ingreso') o.ing += m.cantidad;
    else if (m.tipo === 'gasto') o.gas += m.cantidad;
    else if (m.tipo === 'inversion') o.inv += m.cantidad;
  }
  t.total = {
    ing: t.efectivo.ing + t.cuenta.ing,
    gas: t.efectivo.gas + t.cuenta.gas,
    inv: t.efectivo.inv + t.cuenta.inv,
  };
  return t;
}

function saldos() {
  const s = { cuenta: Number(db.inicial.cuenta) || 0, efectivo: Number(db.inicial.efectivo) || 0 };
  for (const m of db.movs) {
    if (m.tipo === 'ingreso') s[m.origen] += m.cantidad;
    else if (m.tipo === 'gasto' || m.tipo === 'inversion') s[m.origen] -= m.cantidad;
    else if (m.tipo === 'traspaso') { s[m.origen] -= m.cantidad; s[m.destino] += m.cantidad; }
  }
  return s;
}

function topCategorias(movs, origen, n = 2) {
  const acc = {};
  for (const m of movs) if (m.tipo === 'gasto' && m.origen === origen) acc[m.cat || 'Otros'] = (acc[m.cat || 'Otros'] || 0) + m.cantidad;
  return Object.entries(acc).sort((a, b) => b[1] - a[1]).slice(0, n);
}

function aviso(txt) {
  const el = document.getElementById('toast');
  el.textContent = txt;
  el.classList.add('show');
  clearTimeout(aviso.t);
  aviso.t = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ---------------- Estado de la interfaz ---------------- */

const ahora = new Date();
const ui = {
  vista: 'inicio',
  mes: { y: ahora.getFullYear(), m: ahora.getMonth() },
  res: { modo: 'mes', y: ahora.getFullYear(), m: ahora.getMonth() },
  form: null,
};

function moverMes(obj, delta) {
  let m = obj.m + delta, y = obj.y;
  if (m < 0) { m = 11; y--; }
  if (m > 11) { m = 0; y++; }
  obj.m = m; obj.y = y;
}

/* ---------------- Vistas ---------------- */

function render() {
  const app = document.getElementById('app');
  if (ui.vista === 'inicio') app.innerHTML = vInicio();
  else if (ui.vista === 'resumen') app.innerHTML = ui.res.modo === 'mes' ? vResumenMes() : vResumenAnio();
  else app.innerHTML = vAjustes();
  document.querySelectorAll('.tabbar button').forEach(b => b.classList.toggle('on', b.dataset.v === ui.vista));
  document.getElementById('fab').hidden = ui.vista !== 'inicio';
}

function subtitulo(m) {
  if (m.tipo === 'gasto') return `${m.cat || 'Otros'} · ${ORIGEN[m.origen]}`;
  if (m.tipo === 'traspaso') return `Traspaso · ${ORIGEN[m.origen]} → ${ORIGEN[m.destino]}`;
  return `${TIPOS[m.tipo].nombre} · ${ORIGEN[m.origen]}`;
}
function importe(m) {
  if (m.tipo === 'gasto') return '−' + eur(m.cantidad);
  if (m.tipo === 'ingreso') return '+' + eur(m.cantidad);
  return eur(m.cantidad);
}
function filaMov(m) {
  return `<button class="mov" data-a="editar" data-v="${m.id}">
    <span class="mov-ic ${m.tipo}">${ICON[m.tipo]}</span>
    <span class="mov-tx"><span class="mov-t">${esc(m.desc || TIPOS[m.tipo].nombre)}</span><span class="mov-s">${esc(subtitulo(m))}</span></span>
    <span class="mov-n ${m.tipo}">${importe(m)}</span>
  </button>`;
}

function vInicio() {
  const { y, m } = ui.mes;
  const movs = movsDe(y, m).slice().sort((a, b) => (b.fecha.localeCompare(a.fecha)) || (b.creado || 0) - (a.creado || 0));
  const t = totales(movs);
  const s = saldos();

  let lista = '';
  let dia = null;
  for (const x of movs) {
    if (x.fecha !== dia) { dia = x.fecha; lista += `<div class="day">${etiquetaDia(dia)}</div>`; }
    lista += filaMov(x);
  }
  if (!movs.length) lista = `<div class="empty">No hay movimientos en ${MESES[m]}.<br>Pulsa <b>+</b> para añadir el primero.</div>`;

  return `
  <div class="top">
    <button class="iconbtn" data-a="mes-prev" aria-label="Mes anterior">${ICON.prev}</button>
    <h2>${MESES[m]} ${y}</h2>
    <button class="iconbtn" data-a="mes-next" aria-label="Mes siguiente">${ICON.next}</button>
  </div>

  <section class="card-dark">
    <div class="stack-4">
      <div class="lbl">Saldo disponible</div>
      <div class="big">${eur(s.cuenta + s.efectivo)}</div>
    </div>
    <div class="grid2">
      <div class="tile"><div class="lbl" style="display:flex;gap:6px;align-items:center">${ICON.cuenta}Cuenta</div><div class="v">${eur(s.cuenta)}</div></div>
      <div class="tile"><div class="lbl" style="display:flex;gap:6px;align-items:center">${ICON.efectivo}Efectivo</div><div class="v">${eur(s.efectivo)}</div></div>
    </div>
  </section>

  <div class="grid3">
    <div class="tile-w"><div class="lbl">Ingresos</div><div class="v c-green">+${eurCorto(t.total.ing)}</div></div>
    <div class="tile-w"><div class="lbl">Gastos</div><div class="v c-orange">−${eurCorto(t.total.gas)}</div></div>
    <div class="tile-w"><div class="lbl">Invertido</div><div class="v c-indigo">${eurCorto(t.total.inv)}</div></div>
  </div>

  <div class="section-h">Movimientos</div>
  <div class="list">${lista}</div>`;
}

/* ---- piezas del resumen ---- */

function barra(lbl, valor, max, color) {
  const pct = max > 0 ? Math.max(valor > 0 ? 2 : 0, Math.round(valor / max * 100)) : 0;
  return `<div class="bar"><div class="lbl">${lbl}</div><div class="track"><div class="fill" style="width:${pct}%;background:${color}"></div></div><div class="num">${eurCorto(valor)}</div></div>`;
}

function selectorModo() {
  return `<div class="seg" role="tablist">
    <button class="${ui.res.modo === 'mes' ? 'on' : ''}" data-a="res-modo" data-v="mes">Mes</button>
    <button class="${ui.res.modo === 'anio' ? 'on' : ''}" data-a="res-modo" data-v="anio">Año</button>
  </div>`;
}

function bloqueCuenta(clave, t, extra) {
  const ahorro = t.ing - t.gas;
  const max = Math.max(t.ing, t.gas, t.inv);
  const etiqueta = ahorro < -0.004 ? 'Pérdida' : 'Ahorro';
  return `<section class="card">
    <div class="kicker">${ICON[clave]}${ORIGEN[clave].toUpperCase()}</div>
    <div class="stack-4">
      <div class="lbl">${etiqueta} ${extra.periodo}</div>
      <div class="big ${ahorro < -0.004 ? 'c-orange' : 'c-green'}">${eurSigno(ahorro)}</div>
    </div>
    <div class="grid2">
      <div class="tile"><div class="lbl">Ingresos</div><div class="v c-green">${eur(t.ing)}</div></div>
      <div class="tile"><div class="lbl">Gastos</div><div class="v c-orange">${eur(t.gas)}</div></div>
    </div>
    ${extra.grafico}
    ${extra.pie}
  </section>`;
}

function vResumenMes() {
  const { y, m } = ui.res;
  const movs = movsDe(y, m);
  const t = totales(movs);
  const p = { y, m }; moverMes(p, -1);
  const tp = totales(movsDe(p.y, p.m));
  const ahorro = t.total.ing - t.total.gas;
  const dif = ahorro - (tp.total.ing - tp.total.gas);
  const max = Math.max(t.total.ing, t.total.gas, t.total.inv);
  const pctEf = t.total.gas > 0 ? Math.round(t.efectivo.gas / t.total.gas * 100) : 0;
  const hayPrevio = tp.total.ing > 0 || tp.total.gas > 0;

  const pieCats = clave => {
    const top = topCategorias(movs, clave);
    return top.length ? `<div class="note">Donde más: ${top.map(([c, v]) => `${esc(c)} ${eur(v)}`).join(' · ')}</div>` : '';
  };
  const barrasDe = (x) => {
    const mx = Math.max(x.ing, x.gas, x.inv);
    return `<div class="bars">${barra('Ingresos', x.ing, mx, 'var(--green-bar)')}${barra('Gastos', x.gas, mx, 'var(--orange-bar)')}${x.inv > 0 ? barra('Invertido', x.inv, mx, 'var(--indigo-bar)') : ''}</div>`;
  };

  return `
  <h1 class="page-title">Resumen</h1>
  ${selectorModo()}
  <div class="periodo">
    <button class="iconbtn" data-a="res-prev" aria-label="Mes anterior">${ICON.prev}</button>
    <h3>${MESES[m]} ${y}</h3>
    <button class="iconbtn" data-a="res-next" aria-label="Mes siguiente">${ICON.next}</button>
  </div>

  <section class="card-dark">
    <div class="kicker">TOTAL</div>
    <div class="stack-4">
      <div class="lbl">${ahorro < -0.004 ? 'Pérdida' : 'Ahorro'} del mes</div>
      <div class="huge ${ahorro < -0.004 ? 'c-peach' : 'c-mint'}">${eurSigno(ahorro)}</div>
      ${hayPrevio ? `<div class="note">${dif >= 0 ? eurSigno(dif) + ' más' : eur(Math.abs(dif)) + ' menos'} que en ${MESES[p.m]}</div>` : ''}
    </div>
    <div class="grid2">
      <div class="tile"><div class="lbl">Ingresos</div><div class="v">${eur(t.total.ing)}</div></div>
      <div class="tile"><div class="lbl">Gastos</div><div class="v">${eur(t.total.gas)}</div></div>
    </div>
    <div class="bars">
      ${barra('Ingresos', t.total.ing, max, 'var(--mint)')}
      ${barra('Gastos', t.total.gas, max, 'var(--peach)')}
      ${barra('Invertido', t.total.inv, max, 'var(--lavender)')}
    </div>
    <div class="tile row-between"><div class="lbl">Invertido ${eur(t.total.inv)} · Libre tras invertir</div><div class="v" style="font-size:16px">${eur(ahorro - t.total.inv)}</div></div>
    ${t.total.gas > 0 ? `<div class="stack-4" style="gap:8px">
      <div class="lbl" style="font-size:12px">¿De dónde has gastado?</div>
      <div class="split"><i style="width:${pctEf}%;background:var(--yellow)"></i><i style="width:${100 - pctEf}%;background:var(--sky)"></i></div>
      <div class="row-between" style="font-size:12px"><span><span class="dot" style="background:var(--yellow)"></span>Efectivo ${pctEf} % · ${eur(t.efectivo.gas)}</span><span><span class="dot" style="background:var(--sky)"></span>Cuenta ${100 - pctEf} %</span></div>
    </div>` : ''}
  </section>

  ${bloqueCuenta('efectivo', t.efectivo, { periodo: 'del mes', grafico: barrasDe(t.efectivo), pie: pieCats('efectivo') })}
  ${bloqueCuenta('cuenta', t.cuenta, { periodo: 'del mes', grafico: barrasDe(t.cuenta), pie: pieCats('cuenta') })}`;
}

function graficoPM(vals, hl) {
  const max = Math.max(1, ...vals.map(Math.abs));
  const hayPos = vals.some(v => v > 0.004), hayNeg = vals.some(v => v < -0.004);
  // Si solo hay positivos (o solo negativos) usamos toda la altura en un lado
  const altoUp = hayPos && hayNeg ? 50 : hayPos ? 90 : 0;
  const altoDn = hayPos && hayNeg ? 50 : hayNeg ? 90 : 0;
  return `<div class="pm">${vals.map((v, i) => {
    const escala = v > 0 ? altoUp : altoDn;
    const h = Math.abs(v) < 0.005 ? 0 : Math.max(2, Math.round(Math.abs(v) / max * escala));
    return `<div class="pm-c${i === hl ? ' hl' : ''}" title="${MESES[i]}: ${eurSigno(v)}">
      <div class="pm-up" style="height:${altoUp}px">${v > 0 ? `<i class="pos" style="height:${h}px"></i>` : ''}</div>
      <div class="pm-axis"></div>
      <div class="pm-dn" style="height:${altoDn}px">${v < 0 ? `<i class="neg" style="height:${h}px"></i>` : ''}</div>
      <span>${INI[i]}</span></div>`;
  }).join('')}</div>`;
}

function vResumenAnio() {
  const y = ui.res.y;
  const meses = MESES.map((_, i) => totales(movsDe(y, i)));
  const t = totales(movsDe(y));
  const ahorro = t.total.ing - t.total.gas;
  const conDatos = meses.map((x, i) => ({ i, a: x.total.ing - x.total.gas, ok: x.total.ing > 0 || x.total.gas > 0 })).filter(x => x.ok);
  const media = conDatos.length ? ahorro / conDatos.length : 0;
  const mejor = conDatos.slice().sort((a, b) => b.a - a.a)[0];
  const peor = conDatos.slice().sort((a, b) => a.a - b.a)[0];
  const hl = y === ahora.getFullYear() ? ahora.getMonth() : -1;
  const maxG = Math.max(1, ...meses.map(x => Math.max(x.total.ing, x.total.gas)));
  const alto = v => (v > 0 ? Math.max(2, Math.round(v / maxG * 120)) : 0);
  const rango = conDatos.length ? `${MESES[conDatos[0].i].slice(0, 3)}–${MESES[conDatos[conDatos.length - 1].i].slice(0, 3)}` : '';

  const grafico = `<div class="stack-4" style="gap:8px">
    <div class="legend" style="color:var(--dark-muted)"><span><span class="dot" style="background:var(--mint)"></span>Ingresos</span><span><span class="dot" style="background:var(--peach)"></span>Gastos</span></div>
    <div class="gchart">${meses.map((x, i) => `<div class="gcol${i === hl ? ' hl' : ''}" title="${MESES[i]}: +${eurCorto(x.total.ing)} / −${eurCorto(x.total.gas)}">
      <div class="gbars"><i style="height:${alto(x.total.ing)}px;background:var(--mint)"></i><i style="height:${alto(x.total.gas)}px;background:var(--peach)"></i></div>
      <span>${INI[i]}</span></div>`).join('')}</div>
  </div>`;

  const bloqueAnual = clave => bloqueCuenta(clave, t[clave], {
    periodo: 'acumulado',
    grafico: `<div class="note">Ahorro o pérdida de cada mes</div>${graficoPM(meses.map(x => x[clave].ing - x[clave].gas), hl)}`,
    pie: '',
  });

  return `
  <h1 class="page-title">Resumen</h1>
  ${selectorModo()}
  <div class="periodo">
    <button class="iconbtn" data-a="res-prev" aria-label="Año anterior">${ICON.prev}</button>
    <h3>${y}${rango ? ' · ' + rango : ''}</h3>
    <button class="iconbtn" data-a="res-next" aria-label="Año siguiente">${ICON.next}</button>
  </div>

  <section class="card-dark">
    <div class="kicker">TOTAL DEL AÑO</div>
    <div class="stack-4">
      <div class="lbl">${ahorro < -0.004 ? 'Pérdida' : 'Ahorro'} acumulado</div>
      <div class="huge ${ahorro < -0.004 ? 'c-peach' : 'c-mint'}">${eurSigno(ahorro)}</div>
      ${conDatos.length ? `<div class="note">Media de ${eurSigno(media)} al mes</div>` : ''}
    </div>
    <div class="grid2">
      <div class="tile"><div class="lbl">Ingresos</div><div class="v">${eur(t.total.ing)}</div></div>
      <div class="tile"><div class="lbl">Gastos</div><div class="v">${eur(t.total.gas)}</div></div>
    </div>
    ${grafico}
    ${conDatos.length ? `<div class="grid2">
      <div class="tile"><div class="lbl">Mejor mes</div><div class="v" style="font-size:14px;text-transform:capitalize">${MESES[mejor.i]} · ${eurSigno(mejor.a)}</div></div>
      <div class="tile"><div class="lbl">Peor mes</div><div class="v" style="font-size:14px;text-transform:capitalize">${MESES[peor.i]} · ${eurSigno(peor.a)}</div></div>
    </div>` : ''}
    <div class="tile row-between"><div class="lbl">Invertido ${eur(t.total.inv)} · Libre tras invertir</div><div class="v" style="font-size:16px">${eur(ahorro - t.total.inv)}</div></div>
  </section>

  ${bloqueAnual('efectivo')}
  ${bloqueAnual('cuenta')}`;
}

function vAjustes() {
  return `
  <h1 class="page-title">Ajustes</h1>
  <div class="settings">
    <section class="card" style="margin-top:0">
      <h3>Saldo inicial</h3>
      <div class="note">Lo que tenías antes de empezar a usar la app. Sirve para que el saldo disponible sea real.</div>
      <div class="grid2">
        <div class="field"><label for="ini-cuenta">Cuenta (€)</label><input class="input" id="ini-cuenta" inputmode="decimal" value="${db.inicial.cuenta ? String(db.inicial.cuenta).replace('.', ',') : ''}" placeholder="0,00"></div>
        <div class="field"><label for="ini-efectivo">Efectivo (€)</label><input class="input" id="ini-efectivo" inputmode="decimal" value="${db.inicial.efectivo ? String(db.inicial.efectivo).replace('.', ',') : ''}" placeholder="0,00"></div>
      </div>
      <button class="primary" data-a="guardar-inicial">Guardar saldo inicial</button>
    </section>

    <section class="card">
      <h3>Copia de seguridad</h3>
      <div class="note">Tus datos solo están guardados en este móvil y este navegador. Haz una copia de vez en cuando y guárdala en la nube.</div>
      <button class="secondary" data-a="exportar">Descargar copia (.json)</button>
      <button class="secondary" data-a="importar">Restaurar una copia</button>
      <button class="secondary" data-a="csv">Exportar a Excel (.csv)</button>
    </section>

    <section class="card">
      <h3>Zona peligrosa</h3>
      <button class="danger" data-a="borrar-todo">Borrar todos los datos</button>
      <div class="note">Cuentas · ${db.movs.length} movimientos guardados</div>
    </section>
  </div>`;
}

/* ---------------- Hoja de nuevo / editar movimiento ---------------- */

function sugerencias(tipo) {
  const acc = new Map();
  for (const m of db.movs) {
    if (m.tipo !== tipo || !m.desc) continue;
    const k = m.desc.trim().toLowerCase();
    const e = acc.get(k) || { n: 0, ult: 0, m };
    e.n++;
    if ((m.creado || 0) >= e.ult) { e.ult = m.creado || 0; e.m = m; }
    acc.set(k, e);
  }
  return [...acc.values()].sort((a, b) => b.n - a.n || b.ult - a.ult).slice(0, 4).map(e => e.m);
}

function abrirForm(mov) {
  ui.form = mov
    ? { id: mov.id, tipo: mov.tipo, cantidad: String(mov.cantidad).replace('.', ','), desc: mov.desc || '', origen: mov.origen, cat: mov.cat || 'Otros', fecha: mov.fecha }
    : { id: null, tipo: 'gasto', cantidad: '', desc: '', origen: 'efectivo', cat: 'Comida', fecha: hoy() };
  renderForm();
  const w = document.getElementById('sheet');
  w.hidden = false;
  document.body.style.overflow = 'hidden';
  if (!mov) setTimeout(() => document.getElementById('f-cant')?.focus(), 250);
}
function cerrarForm() {
  ui.form = null;
  const w = document.getElementById('sheet');
  w.hidden = true;
  w.innerHTML = '';
  document.body.style.overflow = '';
}
function leerForm() {
  if (!ui.form) return;
  const c = document.getElementById('f-cant'), d = document.getElementById('f-desc'), f = document.getElementById('f-fecha');
  if (c) ui.form.cantidad = c.value;
  if (d) ui.form.desc = d.value;
  if (f && f.value) ui.form.fecha = f.value;
}

function renderForm() {
  const f = ui.form;
  const colores = { gasto: 'var(--orange)', ingreso: 'var(--green)', inversion: 'var(--indigo)', traspaso: 'var(--soft)' };
  const textoBoton = { gasto: 'Guardar gasto', ingreso: 'Guardar ingreso', inversion: 'Guardar inversión', traspaso: 'Guardar traspaso' };
  const descPh = { gasto: 'Ej. Desayuno', ingreso: 'Ej. Nómina', inversion: 'Ej. Fondo indexado', traspaso: 'Ej. Sacar del cajero' };
  const sugs = sugerencias(f.tipo);
  const fechaTxt = (f.fecha === hoy() ? 'Hoy, ' : '') + fmtDiaLargo.format(aFecha(f.fecha)).replace(/\./g, '');

  let origenHtml;
  if (f.tipo === 'traspaso') {
    origenHtml = `<div class="field"><div class="flabel">¿Hacia dónde mueves el dinero?</div>
      <div class="opts">
        <button class="opt ${f.origen === 'cuenta' ? 'on' : ''}" data-a="f-origen" data-v="cuenta">Cuenta → Efectivo</button>
        <button class="opt ${f.origen === 'efectivo' ? 'on' : ''}" data-a="f-origen" data-v="efectivo">Efectivo → Cuenta</button>
      </div>
      <div class="note">No cuenta como gasto ni como ingreso: solo mueve tu dinero de sitio.</div></div>`;
  } else {
    const preg = { gasto: '¿De dónde sale?', ingreso: '¿Dónde entra?', inversion: '¿De dónde sale?' }[f.tipo];
    origenHtml = `<div class="field"><div class="flabel">${preg}</div>
      <div class="opts">
        <button class="opt ${f.origen === 'efectivo' ? 'on' : ''}" data-a="f-origen" data-v="efectivo">${ICON.efectivo}Efectivo</button>
        <button class="opt ${f.origen === 'cuenta' ? 'on' : ''}" data-a="f-origen" data-v="cuenta">${ICON.cuenta}Cuenta</button>
      </div>
      ${f.tipo === 'inversion' ? '<div class="note">Resta de tu saldo, pero no cuenta como gasto.</div>' : ''}</div>`;
  }

  document.getElementById('sheet').innerHTML = `
  <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-t">
    <div class="top">
      <button class="iconbtn" data-a="cerrar" aria-label="Cerrar">${ICON.close}</button>
      <h2 id="sheet-t" style="text-transform:none">${f.id ? 'Editar movimiento' : 'Nuevo movimiento'}</h2>
      <div style="width:44px"></div>
    </div>

    <div class="seg tipo">
      ${Object.entries(TIPOS).map(([k, v]) => `<button class="${f.tipo === k ? 'on ' + k : ''}" data-a="f-tipo" data-v="${k}">${v.nombre}</button>`).join('')}
    </div>

    <div class="amount">
      <label for="f-cant" class="lbl">Cantidad</label>
      <div class="amount-row" style="color:${colores[f.tipo]}">
        <input id="f-cant" inputmode="decimal" autocomplete="off" placeholder="0,00" value="${esc(f.cantidad)}" style="color:${colores[f.tipo]}">
        <span class="eur">€</span>
      </div>
    </div>

    <div class="form">
      <div class="field">
        <label for="f-desc">Descripción</label>
        <input class="input" id="f-desc" autocomplete="off" maxlength="60" placeholder="${descPh[f.tipo]}" value="${esc(f.desc)}">
        ${sugs.length ? `<div class="chips">${sugs.map(s => `<button class="chip sug" data-a="f-sug" data-v="${s.id}">${esc(s.desc)} · ${eurCorto(s.cantidad)}</button>`).join('')}</div>` : ''}
      </div>

      ${origenHtml}

      ${f.tipo === 'gasto' ? `<div class="field"><div class="flabel">Categoría</div>
        <div class="chips">${CATS.map(c => `<button class="chip ${f.cat === c ? 'on' : ''}" data-a="f-cat" data-v="${c}">${c}</button>`).join('')}</div></div>` : ''}

      <div class="field">
        <label for="f-fecha">Fecha</label>
        <div style="position:relative">
          <div class="input" style="display:flex;align-items:center;gap:10px;pointer-events:none">${ICON.cal}<span style="flex:1;font-weight:600;text-transform:capitalize">${fechaTxt}</span><span class="c-green" style="font-size:13px;font-weight:700">Cambiar</span></div>
          <input id="f-fecha" type="date" value="${f.fecha}" aria-label="Cambiar fecha" style="position:absolute;inset:0;opacity:0;width:100%;height:100%;cursor:pointer">
        </div>
      </div>

      <button class="primary" data-a="f-guardar">${textoBoton[f.tipo]}</button>
      ${f.id ? '<button class="danger" data-a="f-eliminar">Eliminar movimiento</button>' : ''}
    </div>
  </div>`;
}

function guardarForm() {
  leerForm();
  const f = ui.form;
  const cantidad = parseCantidad(f.cantidad);
  if (!(cantidad > 0)) { aviso('Escribe una cantidad mayor que 0'); document.getElementById('f-cant')?.focus(); return; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.fecha)) { aviso('La fecha no es válida'); return; }
  const mov = {
    id: f.id || uid(),
    tipo: f.tipo,
    cantidad,
    desc: f.desc.trim(),
    origen: f.origen,
    fecha: f.fecha,
    creado: Date.now(),
  };
  if (f.tipo === 'gasto') mov.cat = f.cat;
  if (f.tipo === 'traspaso') mov.destino = f.origen === 'cuenta' ? 'efectivo' : 'cuenta';
  if (f.id) {
    const i = db.movs.findIndex(x => x.id === f.id);
    if (i >= 0) { mov.creado = db.movs[i].creado || mov.creado; db.movs[i] = mov; }
  } else {
    db.movs.push(mov);
  }
  guardar();
  // Mostrar el mes del movimiento guardado
  const d = aFecha(mov.fecha);
  ui.mes = { y: d.getFullYear(), m: d.getMonth() };
  cerrarForm();
  render();
  aviso(f.id ? 'Movimiento actualizado' : 'Guardado');
}

/* ---------------- Ajustes: copias ---------------- */

function descargar(nombre, contenido, tipo) {
  const blob = new Blob([contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportarCSV() {
  const num = n => String(n).replace('.', ',');
  const q = s => `"${String(s || '').replace(/"/g, '""')}"`;
  const filas = [['Fecha', 'Tipo', 'Descripción', 'Categoría', 'Origen', 'Destino', 'Cantidad'].join(';')];
  for (const m of db.movs.slice().sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    filas.push([m.fecha, TIPOS[m.tipo].nombre, q(m.desc), m.cat || '', ORIGEN[m.origen], m.destino ? ORIGEN[m.destino] : '', num(m.cantidad)].join(';'));
  }
  descargar(`cuentas-${hoy()}.csv`, '﻿' + filas.join('\r\n'), 'text/csv;charset=utf-8');
}
function importarArchivo(file) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(r.result);
      if (!d || !Array.isArray(d.movs)) throw new Error();
      const validos = d.movs.filter(m => m && TIPOS[m.tipo] && ORIGEN[m.origen] && typeof m.cantidad === 'number' && /^\d{4}-\d{2}-\d{2}$/.test(m.fecha));
      if (!confirm(`Se van a reemplazar tus datos actuales por ${validos.length} movimientos de la copia. ¿Continuar?`)) return;
      db.movs = validos.map(m => Object.assign({ id: uid() }, m));
      db.inicial = Object.assign({ cuenta: 0, efectivo: 0 }, d.inicial);
      guardar(); render(); aviso('Copia restaurada');
    } catch (e) { aviso('Ese archivo no es una copia válida'); }
  };
  r.readAsText(file);
}

/* ---------------- Eventos ---------------- */

document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]');
  if (!el) {
    if (e.target.id === 'sheet') cerrarForm(); // clic fuera de la hoja
    return;
  }
  const a = el.dataset.a, v = el.dataset.v;
  switch (a) {
    case 'nav': ui.vista = v; render(); window.scrollTo(0, 0); break;
    case 'mes-prev': moverMes(ui.mes, -1); render(); break;
    case 'mes-next': moverMes(ui.mes, 1); render(); break;
    case 'res-modo': ui.res.modo = v; render(); break;
    case 'res-prev': ui.res.modo === 'mes' ? moverMes(ui.res, -1) : ui.res.y--; render(); break;
    case 'res-next': ui.res.modo === 'mes' ? moverMes(ui.res, 1) : ui.res.y++; render(); break;
    case 'nuevo': abrirForm(null); break;
    case 'editar': abrirForm(db.movs.find(x => x.id === v)); break;
    case 'cerrar': cerrarForm(); break;
    case 'f-tipo':
      leerForm();
      ui.form.tipo = v;
      if (v === 'traspaso' && ui.form.origen !== 'cuenta' && !ui.form.id) ui.form.origen = 'cuenta';
      if (v === 'ingreso' && !ui.form.id && ui.form.origen === 'efectivo' && !ui.form.cantidad) ui.form.origen = 'cuenta';
      renderForm(); break;
    case 'f-origen': leerForm(); ui.form.origen = v; renderForm(); break;
    case 'f-cat': leerForm(); ui.form.cat = v; renderForm(); break;
    case 'f-sug': {
      leerForm();
      const s = db.movs.find(x => x.id === v);
      if (s) Object.assign(ui.form, { desc: s.desc, cantidad: String(s.cantidad).replace('.', ','), origen: s.origen, cat: s.cat || ui.form.cat });
      renderForm(); break;
    }
    case 'f-guardar': guardarForm(); break;
    case 'f-eliminar':
      if (confirm('¿Eliminar este movimiento?')) {
        db.movs = db.movs.filter(x => x.id !== ui.form.id);
        guardar(); cerrarForm(); render(); aviso('Movimiento eliminado');
      }
      break;
    case 'guardar-inicial': {
      const c = parseCantidad(document.getElementById('ini-cuenta').value || '0');
      const ef = parseCantidad(document.getElementById('ini-efectivo').value || '0');
      if (!Number.isFinite(c) || !Number.isFinite(ef)) { aviso('Revisa las cantidades'); break; }
      db.inicial = { cuenta: c, efectivo: ef };
      guardar(); render(); aviso('Saldo inicial guardado');
      break;
    }
    case 'exportar': descargar(`cuentas-copia-${hoy()}.json`, JSON.stringify(db, null, 1), 'application/json'); break;
    case 'importar': document.getElementById('file').click(); break;
    case 'csv': exportarCSV(); break;
    case 'borrar-todo':
      if (confirm('Se borrarán TODOS tus movimientos de este dispositivo. ¿Seguro?') && confirm('Última confirmación: esta acción no se puede deshacer.')) {
        db.movs = []; db.inicial = { cuenta: 0, efectivo: 0 };
        guardar(); render(); aviso('Datos borrados');
      }
      break;
  }
});

// Al cambiar la fecha, actualizar el texto visible
document.addEventListener('change', e => {
  if (e.target.id === 'f-fecha') { leerForm(); renderForm(); }
  if (e.target.id === 'file' && e.target.files[0]) { importarArchivo(e.target.files[0]); e.target.value = ''; }
});

// Enter en el formulario = guardar
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && ui.form && (e.target.id === 'f-cant' || e.target.id === 'f-desc')) { e.preventDefault(); guardarForm(); }
  if (e.key === 'Escape' && ui.form) cerrarForm();
});

render();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
