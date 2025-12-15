// Lightweight port of Alpha Hunter core algorithms for reuse in Vue views and tests
export const ALGO = {
  SMA: (arr, n, m = 1) => {
    const out = [];
    let y = arr[0];
    out.push(y);
    for (let i = 1; i < arr.length; i++) {
      y = (arr[i] * m + y * (n - m)) / n;
      out.push(y);
    }
    return out;
  },
  EMA: (arr, n) => {
    const k = 2 / (n + 1);
    const out = [];
    let y = arr[0];
    out.push(y);
    for (let i = 1; i < arr.length; i++) {
      y = arr[i] * k + y * (1 - k);
      out.push(y);
    }
    return out;
  },
  HHV: (arr, n) => arr.map((_, i) => Math.max(...arr.slice(Math.max(0, i - n + 1), i + 1))),
  LLV: (arr, n) => arr.map((_, i) => Math.min(...arr.slice(Math.max(0, i - n + 1), i + 1))),
  REF: (arr, n) => {
    const out = new Array(Math.min(n, arr.length)).fill(arr[0]);
    for (let i = n; i < arr.length; i++) out.push(arr[i - n]);
    return out;
  }
};

export function calculateRS_Standard(stock, benchMap) {
  const period = Math.min(250, stock.close.length - 1);
  const len = stock.close.length;
  const idxNow = len - 1;
  const idxStart = Math.max(0, len - 1 - period);
  const sRet = stock.close[idxNow] / stock.close[idxStart];
  const dNow = stock.dates[idxNow];
  const dStart = stock.dates[idxStart];
  const bNow = benchMap[dNow];
  const bStart = benchMap[dStart];
  let rsValue = 100;
  if (bNow && bStart && bStart !== 0) rsValue = (sRet / (bNow / bStart)) * 100;
  return { rsStrength: rsValue, changePct: (sRet - 1) * 100, price: stock.close[idxNow] };
}

// simpler sniper calculation focusing on producing mainMoney, lights, signals arrays
export function calculateSniper(data) {
  const { high, low, close } = data;
  const len = close.length;
  const HH_LEN = Math.min(250, len);

  const varH = ALGO.EMA(ALGO.HHV(high, HH_LEN), 21);
  const lc = ALGO.REF(close, 1);
  const smaAbs = ALGO.SMA(low.map((l, i) => Math.abs(l - lc[i])), 5, 1);
  const smaMax = ALGO.SMA(low.map((l, i) => Math.max(l - lc[i], 0)), 5, 1);
  const varReact = smaAbs.map((v, i) => (smaMax[i] === 0 ? 0 : (v / smaMax[i]) * 100));
  const fundFlow = ALGO.EMA(close.map((c, i) => (c * 1.3 < varH[i] ? varReact[i] * 10 : varReact[i] / 10)), 3);

  const llv30 = ALGO.LLV(low, 30);
  const hhv30 = ALGO.HHV(fundFlow, 30);
  const rawMoney = ALGO.EMA(low.map((l, i) => (l <= llv30[i] ? (fundFlow[i] + hhv30[i] * 2) / 2 : 0)), 3).map(v => v / 10);
  const mainMoney = ALGO.EMA(rawMoney, 3);
  const refMoney = ALGO.REF(mainMoney, 1);

  const accel = mainMoney.map((v, i) => v > refMoney[i]);
  const decel = mainMoney.map((v, i) => v <= refMoney[i]);
  const refAccel = ALGO.REF(accel, 1);

  const llv9 = ALGO.LLV(low, 9);
  const hhv9 = ALGO.HHV(high, 9);
  const rsv = close.map((c, i) => (hhv9[i] - llv9[i] === 0 ? 0 : (c - llv9[i]) / (hhv9[i] - llv9[i]) * 100));
  const K = ALGO.SMA(rsv, 3, 1);
  const D = ALGO.SMA(K, 3, 1);
  const J = K.map((k, i) => 3 * k - 2 * D[i]);

  const lights = new Array(len).fill(0);
  const signals = new Array(len).fill(0);
  for (let i = 20; i < len; i++) {
    if (refAccel[i] && decel[i] && (J[i] < 20 || mainMoney[i] > 0.5)) signals[i] = 1;
    if (signals[i]) lights[i] = 3; else if (accel[i]) lights[i] = 1; else lights[i] = 2;
  }
  return { mainMoney, lights, signals };
}

export default { ALGO, calculateRS_Standard, calculateSniper };
