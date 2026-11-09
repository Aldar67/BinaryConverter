'use strict';

// Вся математика и проверка ответов — на сервере (NumberSystems.Core).
// Клиент рисует доску, анимирует шаги и собирает действия пользователя.

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  const { dataset, ...rest } = props;
  Object.assign(node, rest);
  if (dataset) Object.assign(node.dataset, dataset);
  node.append(...children);
  return node;
}

const sup = (n) => el('sup', { textContent: n });
const sub = (n) => el('sub', { textContent: n });

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = (ms) => new Promise((r) => setTimeout(r, reduceMotion ? 0 : ms));

async function api(path, body) {
  const response = await fetch(path, body === undefined ? undefined : {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw data ?? { message: 'Сервер не ответил. Проверьте ввод.' };
  return data;
}

const check = (kind, number, radix, index, answer) =>
  api('/api/check', { kind, number, radix, index, answer });

// ───────────── Общие элементы панели ─────────────

function buildRadixChips(prefix, selected, onChange) {
  const box = $(`#${prefix}-radix`);
  for (let r = 2; r <= 16; r++) {
    const id = `${prefix}-radix-${r}`;
    const input = el('input', { type: 'radio', name: `${prefix}-radix`, id, value: r, checked: r === selected, className: 'sr-only' });
    input.addEventListener('change', onChange);
    box.append(input, el('label', { htmlFor: id, textContent: r }));
  }
}

const radixOf = (prefix) => Number($(`input[name="${prefix}-radix"]:checked`).value);
const setRadix = (prefix, radix) => { $(`#${prefix}-radix-${radix}`).checked = true; };

function showError(prefix, error, input) {
  const box = $(`#${prefix}-error`);
  box.replaceChildren(error.message ?? 'Неизвестная ошибка');

  // Подсвечиваем недопустимую цифру прямо в записи числа.
  if (Number.isInteger(error.position)) {
    const s = input.trim().toUpperCase();
    const p = error.position;
    box.append(el('br'), el('code', {}, s.slice(0, p), el('mark', { textContent: s[p] }), s.slice(p + 1)));
  }
  box.hidden = false;
  $(`#${prefix}-number`).setAttribute('aria-invalid', 'true');
  $(`#${prefix}-board`).classList.add('stale');
}

function clearError(prefix) {
  $(`#${prefix}-error`).hidden = true;
  $(`#${prefix}-number`).removeAttribute('aria-invalid');
  $(`#${prefix}-board`).classList.remove('stale');
}

function setFeedback(prefix, ok, ...content) {
  const box = $(`#${prefix}-feedback`);
  box.className = `feedback ${ok === null ? '' : ok ? 'ok' : 'bad'}`;
  box.replaceChildren(...content);
}

function shake(node) {
  if (!reduceMotion) node.animate(
    [{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(0)' }],
    { duration: 280 });
}

function countTo(node, from, to, ms = 550) {
  if (reduceMotion || from === to) { node.textContent = to; return Promise.resolve(); }
  return new Promise((resolve) => {
    const t0 = performance.now();
    const frame = (t) => {
      const k = Math.min(1, (t - t0) / ms);
      node.textContent = Math.round(from + (to - from) * (1 - (1 - k) ** 3));
      if (k < 1) requestAnimationFrame(frame); else resolve();
    };
    requestAnimationFrame(frame);
  });
}

// Цвет разряда связывает карточку, её вклад и отрезок сумматора.
const segColor = (i) => `var(--seg-${(i % 6) + 1})`;

// ───────────── Задача 1: из системы с основанием b в десятичную ─────────────

const to = { data: null, known: new Map(), selected: null, summed: false, busy: false };
const termAt = (position) => to.data.terms.find((t) => t.position === position);
const colAt = (position) => $(`#to-tiles .tile-col[data-position="${position}"]`);

async function loadTo() {
  const number = $('#to-number').value;
  const radix = radixOf('to');
  $('#to-radix-label').textContent = radix;
  clearError('to');
  try {
    renderTo(await api(`/api/to-decimal?number=${encodeURIComponent(number)}&radix=${radix}`));
  } catch (error) {
    showError('to', error, number);
  }
}

function renderTo(data) {
  Object.assign(to, { data, known: new Map(), selected: null, summed: false, busy: false });
  const tiles = $('#to-tiles');
  tiles.style.setProperty('--n', data.terms.length);

  tiles.replaceChildren(...data.terms.map((t, i) => {
    const tile = el('button', { type: 'button', className: 'tile', ariaLabel: `Разряд ${t.position}, цифра ${t.symbol}` },
      el('span', { className: 'tile-digit', textContent: t.symbol }),
      el('span', { className: 'tile-value', textContent: t.digitValue >= 10 ? `= ${t.digitValue}` : '' }));
    tile.addEventListener('click', () => selectTerm(t.position));

    const col = el('div', { className: 'tile-col', dataset: { position: t.position } },
      el('span', { className: 'pos', textContent: `разряд ${t.position}` }),
      tile,
      el('span', { className: 'weight' }, String(data.radix), sup(t.position)),
      el('span', { className: 'weight-value', textContent: `= ${t.weight}` }),
      el('span', { className: 'contrib', textContent: '?' }));
    col.style.setProperty('--seg', segColor(i));
    col.style.setProperty('--delay', `${i * 70}ms`);
    return col;
  }));

  $('#to-bar').replaceChildren(...data.terms.map((t, i) => {
    const seg = el('span', { className: 'seg', dataset: { position: t.position } });
    seg.style.setProperty('--seg', segColor(i));
    return seg;
  }));

  $('#to-formula').replaceChildren(...data.terms.flatMap((t, i) => {
    const term = el('span', { className: 'term', dataset: { position: t.position } }, `${t.digitValue}·${data.radix}`, sup(t.position));
    term.style.setProperty('--seg', segColor(i));
    return [i ? ' + ' : '', term];
  }));

  $('#to-counter').textContent = '0';
  $('#to-statement').replaceChildren(data.digits, sub(data.radix),
    el('span', { className: 'eq', textContent: '=' }), el('span', { className: 'unknown', textContent: '?' }), sub(10));

  $('#to-progress').replaceChildren(...data.terms.map((t) =>
    el('li', { textContent: t.symbol, title: `Разряд ${t.position}`, dataset: { position: t.position } })));

  $('#to-sum').disabled = false;
  $('#to-sum').textContent = 'Сложить вклады';
  setFeedback('to', null);
  updateToProgress();
  selectTerm(data.terms[0].position, { focus: false });
}

function selectTerm(position, { focus = true, keepFeedback = false } = {}) {
  if (to.busy) return;
  to.selected = position;
  const t = termAt(position);
  const done = to.known.has(position);

  $$('#to-tiles .tile-col').forEach((c) => c.classList.toggle('selected', Number(c.dataset.position) === position));
  $$('#to-progress li').forEach((li) => li.classList.toggle('current', Number(li.dataset.position) === position));

  $('#to-prompt-title').textContent = `Найдите вклад разряда ${position}`;
  $('#to-prompt-eq').replaceChildren(t.symbol, ' · ', String(to.data.radix), sup(position), ' = ',
    done ? el('span', { className: 'val', textContent: t.contribution }) : el('span', { className: 'q', textContent: '?' }));

  $('#to-ask').hidden = done;
  $('#to-ask-show').hidden = done;
  $('#to-ask-input').value = '';
  if (!keepFeedback) setFeedback('to', null);
  if (focus && !done) $('#to-ask-input').focus({ preventScroll: true });
}

function revealContribution(t) {
  const cell = $('.contrib', colAt(t.position));
  if (cell.classList.contains('known')) return;
  cell.textContent = t.contribution;
  cell.classList.add('known');
}

function updateToProgress() {
  for (const li of $$('#to-progress li')) {
    const state = to.known.get(Number(li.dataset.position));
    li.classList.toggle('solved', state === 'solved');
    li.classList.toggle('revealed', state === 'revealed');
  }
  for (const [position, state] of to.known) colAt(position).classList.toggle('solved', state === 'solved');
  $('#to-count').textContent = `${to.known.size} / ${to.data.terms.length}`;
}

async function answerContribution(reveal) {
  const t = termAt(to.selected);
  const answer = reveal ? '' : $('#to-ask-input').value;
  const result = await check('DigitContribution', to.data.digits, to.data.radix, t.position, answer);

  if (!result.correct && !reveal) {
    setFeedback('to', false, 'Пока неверно. ', result.hint);
    shake($('#to-ask-input'));
    return;
  }

  to.known.set(t.position, result.correct ? 'solved' : 'revealed');
  revealContribution(t);
  updateToProgress();
  selectTerm(t.position, { keepFeedback: true });
  setFeedback('to', result.correct ? true : null, result.correct ? 'Верно! ' : 'Решение: ', result.explanation);

  const next = to.data.terms.find((x) => !to.known.has(x.position));
  if (next) {
    await wait(1100);
    if (to.selected === t.position) selectTerm(next.position, { keepFeedback: true });
  } else {
    setFeedback('to', true, 'Все вклады найдены. Теперь сложите их.');
  }
}

async function sumContributions() {
  if (to.busy || to.summed) return;
  to.busy = true;
  $('#to-sum').disabled = true;

  const { data } = to;
  const counter = $('#to-counter');
  let previous = 0;

  for (const t of data.terms) {
    $$('#to-tiles .tile-col').forEach((c) => c.classList.toggle('current', Number(c.dataset.position) === t.position));
    revealContribution(t);

    const seg = $(`#to-bar .seg[data-position="${t.position}"]`);
    const share = data.value ? t.contribution / data.value : 0;
    seg.style.width = `${share * 100}%`;
    if (share > 0.07) seg.textContent = t.contribution;
    $(`#to-formula .term[data-position="${t.position}"]`).classList.add('on');

    await countTo(counter, previous, t.runningSum);
    previous = t.runningSum;
    await wait(250);
  }

  $$('#to-tiles .tile-col').forEach((c) => c.classList.remove('current'));
  $('#to-statement .unknown').replaceWith(el('span', { className: 'solved', textContent: data.value }));
  to.busy = false;
  to.summed = true;
  $('#to-sum').textContent = 'Вклады сложены';
}

// ───────────── Задача 2: из десятичной в систему с основанием b ─────────────

const from = { data: null, answered: 0, picked: [], assembling: false, busy: false };

async function loadFrom() {
  const number = $('#from-number').value;
  const radix = radixOf('from');
  clearError('from');
  try {
    renderFrom(await api(`/api/from-decimal?number=${encodeURIComponent(number)}&radix=${radix}`));
  } catch (error) {
    showError('from', error, number);
  }
}

function renderFrom(data) {
  Object.assign(from, { data, answered: 0, picked: [], assembling: false, busy: false });
  const n = data.steps.length;
  const ladder = $('#from-ladder');
  ladder.replaceChildren();
  ladder.classList.remove('assembling');
  ladder.style.setProperty('--fs', `${n <= 4 ? 44 : n <= 6 ? 34 : n <= 9 ? 26 : 20}px`);
  ladder.style.setProperty('--cols', n + 1);
  ladder.style.setProperty('--rows', n + 2);

  $('#from-statement').replaceChildren(String(data.value), sub(10),
    el('span', { className: 'eq', textContent: '=' }), el('span', { className: 'unknown', textContent: '?' }), sub(data.radix));
  $('#from-slots').replaceChildren(...data.steps.map(() => el('span', { className: 'slot' })));
  $('#from-progress').replaceChildren(...data.steps.map((s) => el('li', { textContent: s.index + 1 })));
  $$('#from-assemble button').forEach((b) => { b.disabled = false; });

  setFeedback('from', null);
  drawLadder();
  showRemainderTask();
}

// Уголок: шаг i занимает строки i…i+2 и столбцы i…i+1.
// Частное шага i стоит под делителем и одновременно служит делимым шага i+1.
function drawLadder() {
  const { data, answered } = from;
  const ladder = $('#from-ladder');
  const before = new Set($$('.lc', ladder).map((c) => c.dataset.key));
  const cells = [];

  const at = (node, key, row, col) => {
    node.dataset.key = key;
    node.style.gridRow = row + 1;
    node.style.gridColumn = col + 1;
    cells.push(node);
  };

  data.steps.forEach((s, i) => {
    if (i > answered) return;
    const done = i < answered;

    if (i === 0) at(el('span', { className: 'lc dividend', textContent: s.dividend }), 'd', 0, 0);
    at(el('span', { className: 'lc divisor', textContent: s.divisor }), `v${i}`, i, i + 1);
    at(el('span', { className: `lc quotient${s.quotient === 0 ? ' final' : ''}`, textContent: s.quotient }), `q${i}`, i + 1, i + 1);

    if (done) at(el('span', { className: 'lc product', textContent: `−${s.divisor * s.quotient}` }), `p${i}`, i + 1, i);

    const rem = el('button', {
      type: 'button',
      className: `lc rem ${done ? 'done' : 'pending'}`,
      textContent: done ? s.remainderSymbol : '?',
      title: done ? `Остаток ${s.remainder}` : 'Остаток ещё не найден',
      dataset: { index: i },
    });
    if (done) rem.addEventListener('click', () => pickRemainder(i));
    at(rem, `r${i}${done ? '' : '?'}`, i + 2, i);
  });

  for (const c of cells) if (!before.has(c.dataset.key)) c.classList.add('enter');
  ladder.replaceChildren(...cells);
}

function showRemainderTask({ keepFeedback = false } = {}) {
  const { data, answered } = from;
  const n = data.steps.length;

  $$('#from-progress li').forEach((li, i) => {
    li.classList.toggle('solved', i < answered);
    li.classList.toggle('current', i === answered);
  });
  $('#from-count').textContent = `${answered} / ${n}`;
  if (!keepFeedback) setFeedback('from', null);

  if (answered >= n) {
    startAssembly();
    return;
  }

  const s = data.steps[answered];
  $('#from-ask').hidden = false;
  $('#from-assemble').hidden = true;
  $('#from-prompt-title').textContent = `Деление ${answered + 1} из ${n}: найдите остаток`;
  $('#from-prompt-eq').replaceChildren(`${s.dividend} : ${s.divisor} = ${s.quotient}`,
    el('span', { className: 'rest', textContent: ', остаток ' }), el('span', { className: 'q', textContent: '?' }));
  $('#from-ask-input').value = '';
  if (answered > 0) $('#from-ask-input').focus({ preventScroll: true });
}

async function answerRemainder(reveal) {
  const index = from.answered;
  const answer = reveal ? '' : $('#from-ask-input').value;
  const result = await check('NextRemainder', String(from.data.value), from.data.radix, index, answer);

  if (!result.correct && !reveal) {
    setFeedback('from', false, 'Пока неверно. ', result.hint);
    shake($('#from-ask-input'));
    return;
  }

  from.answered++;
  drawLadder();
  setFeedback('from', result.correct ? true : null, result.correct ? 'Верно! ' : 'Решение: ', result.explanation);
  showRemainderTask({ keepFeedback: true });
}

function startAssembly() {
  from.assembling = true;
  $('#from-ladder').classList.add('assembling');
  $('#from-ask').hidden = true;
  $('#from-assemble').hidden = false;
  const zero = from.data.value === 0 ? ' Для нуля деление одно, и запись — просто 0.' : '';
  setFeedback('from', true, `Частное стало 0 — деления закончены.${zero}`);
}

const remAt = (i) => $(`#from-ladder .rem[data-index="${i}"]`);

async function pickRemainder(i) {
  if (!from.assembling || from.picked.includes(i)) return;
  from.picked.push(i);
  const source = remAt(i);
  const slot = $$('#from-slots .slot')[from.picked.length - 1];
  source.classList.add('used');
  await fly(source, slot, from.data.steps[i].remainderSymbol);
}

// Остаток «перелетает» с доски в ячейку записи.
async function fly(source, target, text) {
  target.textContent = text;
  target.classList.add('filled');
  if (reduceMotion) return;

  const a = source.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const ghost = el('span', { className: 'ghost-chip', textContent: text });
  Object.assign(ghost.style, {
    left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, height: `${a.height}px`,
    fontSize: getComputedStyle(source).fontSize,
  });
  document.body.append(ghost);
  target.style.visibility = 'hidden';

  await ghost.animate([
    { transform: 'translate(0, 0) scale(1)', borderRadius: '50%' },
    { transform: `translate(${b.left - a.left}px, ${b.top - a.top}px) scale(${b.width / a.width}, ${b.height / a.height})`, borderRadius: '14px' },
  ], { duration: 480, easing: 'cubic-bezier(.2,.8,.2,1)' }).finished;

  ghost.remove();
  target.style.visibility = '';
}

function resetAssembly() {
  from.picked = [];
  $$('#from-slots .slot').forEach((s) => { s.textContent = ''; s.classList.remove('filled'); });
  $$('#from-ladder .rem').forEach((r) => r.classList.remove('used'));
  setFeedback('from', null);
}

async function checkOrder() {
  if (from.busy) return;
  const answer = from.picked.map((i) => from.data.steps[i].remainderSymbol).join('');
  if (!answer) {
    setFeedback('from', false, 'Сначала нажмите на остатки на доске.');
    return;
  }
  const result = await check('DigitOrder', String(from.data.value), from.data.radix, 0, answer);
  if (result.correct) finishFrom(result);
  else {
    setFeedback('from', false, 'Порядок неверный. ', result.hint);
    shake($('#from-slots'));
  }
}

async function showOrder() {
  if (from.busy) return;
  from.busy = true;
  $$('#from-assemble button').forEach((b) => { b.disabled = true; });
  resetAssembly();
  drawReadArrow();

  for (let i = from.data.steps.length - 1; i >= 0; i--) {
    await pickRemainder(i);
    await wait(120);
  }
  finishFrom(await check('DigitOrder', String(from.data.value), from.data.radix, 0, ''));
  from.busy = false;
}

// Стрелка от последнего остатка к первому: так читается запись числа.
function drawReadArrow() {
  const ladder = $('#from-ladder');
  $('.read-arrow', ladder)?.remove();
  const n = from.data.steps.length;
  if (n < 2) return;

  // Остатки лежат по диагонали, а числа уголка — выше и правее неё.
  // Дуга выгибается в пустой угол слева снизу и ничего не перечёркивает.
  const box = ladder.getBoundingClientRect();
  const last = remAt(n - 1).getBoundingClientRect();
  const first = remAt(0).getBoundingClientRect();
  const sx = last.left - box.left - 10, sy = last.top - box.top + last.height / 2;
  const ex = first.left - box.left + first.width / 2, ey = first.bottom - box.top + 10;
  const cx = ex, cy = sy;

  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'read-arrow');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(ns, 'path');
  const angle = Math.atan2(ey - cy, ex - cx);
  const head = (da) => `${ex - 13 * Math.cos(angle + da)},${ey - 13 * Math.sin(angle + da)}`;
  path.setAttribute('d', `M${sx},${sy} Q${cx},${cy} ${ex},${ey} M${head(0.5)} L${ex},${ey} L${head(-0.5)}`);
  svg.append(path);
  ladder.append(svg);

  if (!reduceMotion) {
    const length = path.getTotalLength();
    path.style.strokeDasharray = length;
    path.animate([{ strokeDashoffset: length }, { strokeDashoffset: 0 }], { duration: 700, easing: 'ease-out' });
  }
}

function finishFrom(result) {
  from.assembling = false;
  const { data } = from;
  $('#from-ladder').classList.remove('assembling');
  if (!$('#from-ladder .read-arrow')) drawReadArrow();

  // Номер цифры в записи: последний остаток — первая цифра.
  data.steps.forEach((s, i) => {
    const rem = remAt(i);
    $('.badge', rem)?.remove();
    rem.append(el('span', { className: 'badge', textContent: data.steps.length - i }));
  });

  $('#from-statement .unknown')?.replaceWith(el('span', { className: 'solved', textContent: data.digits }));
  $$('#from-assemble button').forEach((b) => { b.disabled = true; });
  setFeedback('from', result.correct ? true : null, result.correct ? 'Верно! ' : '', result.explanation);
}

// ───────────── Общее ─────────────

async function loadRandom(prefix, direction, load) {
  const exercise = await api(`/api/exercise?direction=${direction}`);
  $(`#${prefix}-number`).value = exercise.number;
  setRadix(prefix, exercise.radix);
  load();
}

function switchTab(name) {
  $$('[role="tab"]').forEach((t) => t.setAttribute('aria-selected', t.dataset.tab === name));
  $$('[role="tabpanel"]').forEach((p) => { p.hidden = p.id !== name; });
}

buildRadixChips('to', 16, loadTo);
buildRadixChips('from', 16, loadFrom);

$$('[role="tab"]').forEach((t) => t.addEventListener('click', () => switchTab(t.dataset.tab)));

$('#to-form').addEventListener('submit', (e) => { e.preventDefault(); loadTo(); });
$('#to-random').addEventListener('click', () => loadRandom('to', 'ToDecimal', loadTo));
$('#to-ask').addEventListener('submit', (e) => { e.preventDefault(); answerContribution(false); });
$('#to-ask-show').addEventListener('click', () => answerContribution(true));
$('#to-sum').addEventListener('click', sumContributions);

$('#from-form').addEventListener('submit', (e) => { e.preventDefault(); loadFrom(); });
$('#from-random').addEventListener('click', () => loadRandom('from', 'FromDecimal', loadFrom));
$('#from-ask-form').addEventListener('submit', (e) => { e.preventDefault(); answerRemainder(false); });
$('#from-ask-show').addEventListener('click', () => answerRemainder(true));
$('#from-check').addEventListener('click', checkOrder);
$('#from-reset').addEventListener('click', resetAssembly);
$('#from-show').addEventListener('click', showOrder);

loadTo();
loadFrom();
