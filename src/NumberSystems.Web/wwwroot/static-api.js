'use strict';

// Статический режим для GitHub Pages: там нет сервера, поэтому запросы /api/…
// обрабатываются прямо в браузере. Это JavaScript-копия алгоритмов из NumberSystems.Core
// (PositionalExpansion, DivisionChain, AnswerChecker, ExerciseGenerator) с теми же
// форматами ответов, поэтому app.js работает без изменений.
// На обычном сервере (dotnet run) файл ничего не делает: все расчёты выполняет C#.
// Принудительно включить: добавьте ?static к адресу.

(() => {
  const enabled = location.hostname.endsWith('github.io') || new URLSearchParams(location.search).has('static');
  if (!enabled) return;

  const MIN_RADIX = 2, MAX_RADIX = 16, MAX_VALUE = 4095, MAX_DIGITS = 12;
  const SYMBOLS = '0123456789ABCDEF';

  const fail = (code, message, position = null) => ({ ok: false, error: { code, message, position } });
  const ok = (value) => ({ ok: true, value });

  const allowed = (radix) => radix <= 10 ? `0–${SYMBOLS[radix - 1]}` : radix === 11 ? '0–9, A' : `0–9, A–${SYMBOLS[radix - 1]}`;
  const validateRadix = (radix) => (Number.isInteger(radix) && radix >= MIN_RADIX && radix <= MAX_RADIX) ? null
    : fail('RadixOutOfRange', `Основание должно быть от ${MIN_RADIX} до ${MAX_RADIX}, получено ${radix}.`);

  function toDecimal(input, radix) {
    const radixError = validateRadix(radix);
    if (radixError) return radixError;

    const digits = (input ?? '').trim().toUpperCase();
    if (digits.length === 0) return fail('EmptyInput', 'Введите число.');
    if (digits[0] === '-') return fail('NegativeNumber', 'Допустимы только неотрицательные целые числа.', 0);
    if (digits.length > MAX_DIGITS) return fail('TooManyDigits', `Слишком длинная запись: не больше ${MAX_DIGITS} цифр.`);

    const values = [];
    for (let i = 0; i < digits.length; i++) {
      const v = SYMBOLS.indexOf(digits[i]);
      if (v < 0 || v >= radix) {
        return fail('InvalidDigit', `Символ «${digits[i]}» недопустим в системе с основанием ${radix} (допустимы ${allowed(radix)}).`, i);
      }
      values.push(v);
    }

    const terms = [];
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      const position = digits.length - 1 - i;
      const weight = radix ** position;
      sum += values[i] * weight;
      if (sum > MAX_VALUE) return fail('ValueOutOfRange', `Число больше ${MAX_VALUE} в десятичной системе.`);
      terms.push({ position, symbol: digits[i], digitValue: values[i], weight, contribution: values[i] * weight, runningSum: sum });
    }
    return ok({ digits, radix, terms, value: sum });
  }

  function fromDecimalNumber(value, radix) {
    const radixError = validateRadix(radix);
    if (radixError) return radixError;
    if (value < 0 || value > MAX_VALUE) return fail('ValueOutOfRange', `Число должно быть от 0 до ${MAX_VALUE}.`);

    const steps = [];
    let dividend = value;
    do {
      const quotient = Math.floor(dividend / radix);
      const remainder = dividend % radix;
      steps.push({ index: steps.length, dividend, divisor: radix, quotient, remainder, remainderSymbol: SYMBOLS[remainder] });
      dividend = quotient;
    } while (dividend > 0);

    return ok({ value, radix, steps, digits: steps.map((s) => s.remainderSymbol).reverse().join('') });
  }

  function fromDecimal(input, radix) {
    const parsed = toDecimal(input, 10);
    return parsed.ok ? fromDecimalNumber(parsed.value.value, radix) : parsed;
  }

  // ───── Проверка ответов ─────
  const normalize = (answer) => (answer ?? '').trim().toUpperCase().replaceAll(' ', '');
  const parseInteger = (s) => /^[+-]?\d+$/.test(s) ? Number(s) : null;
  const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹', SUB = '₀₁₂₃₄₅₆₇₈₉';
  const mapDigits = (n, table) => [...String(n)].map((c) => table[c]).join('');

  function check({ kind, number, radix, index, answer }) {
    switch (kind) {
      case 'DigitContribution': {
        const expansion = toDecimal(number, radix);
        if (!expansion.ok) return expansion;
        const term = expansion.value.terms.find((t) => t.position === index);
        if (!term) return fail('IndexOutOfRange', `В числе нет разряда с номером ${index}.`);
        return ok({
          correct: parseInteger(normalize(answer)) === term.contribution,
          expected: String(term.contribution),
          hint: 'Вклад = значение цифры × основание в степени номера разряда (разряды нумеруются справа, с нуля).',
          explanation: `${term.symbol} · ${radix}${mapDigits(term.position, SUP)} = ${term.digitValue} · ${term.weight} = ${term.contribution}`,
        });
      }
      case 'NextRemainder': {
        const chain = fromDecimal(number, radix);
        if (!chain.ok) return chain;
        const { steps } = chain.value;
        if (index < 0 || index >= steps.length) {
          return fail('IndexOutOfRange', `Деления с номером ${index} нет: всего делений ${steps.length}.`);
        }
        const step = steps[index];
        const text = normalize(answer);
        return ok({
          correct: text === step.remainderSymbol || parseInteger(text) === step.remainder,
          expected: step.remainderSymbol,
          hint: `Сколько раз ${step.divisor} целиком помещается в ${step.dividend}? Вычтите это произведение — получится остаток.`,
          explanation: `${step.dividend} = ${step.divisor} · ${step.quotient} + ${step.remainder}` +
            (step.remainder >= 10 ? `, остаток ${step.remainder} записывается цифрой ${step.remainderSymbol}` : ''),
        });
      }
      case 'DigitOrder': {
        const chain = fromDecimal(number, radix);
        if (!chain.ok) return chain;
        const result = chain.value;
        return ok({
          correct: normalize(answer) === result.digits,
          expected: result.digits,
          hint: 'Первый полученный остаток — младшая (самая правая) цифра числа.',
          explanation: `Остатки по порядку получения: ${result.steps.map((s) => s.remainderSymbol).join(', ')}. ` +
            `Читаем их от последнего к первому: ${result.value}₁₀ = ${result.digits}${mapDigits(result.radix, SUB)}`,
        });
      }
      default:
        return fail('InvalidAnswer', 'Неизвестный тип задания.');
    }
  }

  // ───── Случайные задания ─────
  function exercise(direction) {
    let radix = MIN_RADIX + Math.floor(Math.random() * (MAX_RADIX - MIN_RADIX));
    if (radix >= 10) radix++;
    const value = Math.random() < 0.05 ? 0 : 1 + Math.floor(Math.random() * 1023);
    const number = direction === 'ToDecimal' ? fromDecimalNumber(value, radix).value.digits : String(value);
    return ok({ direction, number, radix });
  }

  // ───── Подмена fetch для адресов /api/… ─────
  const nativeFetch = window.fetch.bind(window);
  window.__nativeFetch = nativeFetch;

  const json = (result) => new Response(JSON.stringify(result.ok ? result.value : result.error), {
    status: result.ok ? 200 : 400,
    headers: { 'Content-Type': 'application/json' },
  });

  window.fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    const path = url.pathname.slice(url.pathname.lastIndexOf('/api/'));
    if (!path.startsWith('/api/')) return nativeFetch(input, init);

    const q = url.searchParams;
    switch (path) {
      case '/api/to-decimal': return json(toDecimal(q.get('number'), Number(q.get('radix'))));
      case '/api/from-decimal': return json(fromDecimal(q.get('number'), Number(q.get('radix'))));
      case '/api/exercise': return json(exercise(q.get('direction')));
      case '/api/check': return json(check(JSON.parse(init?.body ?? '{}')));
      default: return new Response('Not found', { status: 404 });
    }
  };
})();
