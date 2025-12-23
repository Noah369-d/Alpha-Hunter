/**
 * Web Worker - 技术指标计算引擎
 * 在后台线程计算密集型指标，避免阻塞主线程
 */

// 内联TA库 (Worker无法import外部模块)
const TA = {
    EMA: (data, period) => {
        const k = 2 / (period + 1);
        const res = [data[0]];
        for (let i = 1; i < data.length; i++) {
            res.push(data[i] * k + res[i - 1] * (1 - k));
        }
        return res;
    },

    SMA: (data, period) => {
        const res = [];
        for (let i = 0; i < data.length; i++) {
            if (i < period - 1) {
                res.push(data[i]);
                continue;
            }
            let sum = 0;
            for (let j = 0; j < period; j++) {
                sum += data[i - j];
            }
            res.push(sum / period);
        }
        return res;
    },

    HHV: (data, period) => {
        const res = [];
        for (let i = 0; i < data.length; i++) {
            const start = Math.max(0, i - period + 1);
            res.push(Math.max(...data.slice(start, i + 1)));
        }
        return res;
    },

    LLV: (data, period) => {
        const res = [];
        for (let i = 0; i < data.length; i++) {
            const start = Math.max(0, i - period + 1);
            res.push(Math.min(...data.slice(start, i + 1)));
        }
        return res;
    },

    REF: (arr, n) => {
        const res = new Array(n).fill(arr[0]);
        for (let i = n; i < arr.length; i++) {
            res.push(arr[i - n]);
        }
        return res;
    },

    BARSLAST: (arr) => {
        const res = [];
        let last = -1;
        for (let i = 0; i < arr.length; i++) {
            if (arr[i]) last = i;
            res.push(last === -1 ? 0 : i - last);
        }
        return res;
    },

    RSI: (data, period) => {
        const rsi = [];
        const gains = [];
        const losses = [];

        for (let i = 1; i < data.length; i++) {
            const diff = data[i] - data[i - 1];
            gains.push(diff > 0 ? diff : 0);
            losses.push(diff < 0 ? -diff : 0);
        }

        for (let i = 0; i < data.length; i++) {
            if (i < period) {
                rsi.push(50);
                continue;
            }
            const avgGain = gains.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
            const avgLoss = losses.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
            const rs = avgGain / (avgLoss || 1);
            rsi.push(100 - (100 / (1 + rs)));
        }
        return rsi;
    },

    ATR: (highs, lows, closes, period) => {
        const trs = [];
        for (let i = 1; i < highs.length; i++) {
            const tr = Math.max(
                highs[i] - lows[i],
                Math.abs(highs[i] - closes[i - 1]),
                Math.abs(lows[i] - closes[i - 1])
            );
            trs.push(tr);
        }

        const res = [];
        for (let i = 0; i < trs.length; i++) {
            if (i < period) {
                res.push(trs[i]);
                continue;
            }
            let sum = 0;
            for (let j = 0; j < period; j++) {
                sum += trs[i - j];
            }
            res.push(sum / period);
        }
        return res;
    },

    T3: (data, period, v = 0.7) => {
        const e1 = TA.EMA(data, period);
        const e2 = TA.EMA(e1, period);
        const e3 = TA.EMA(e2, period);
        const e4 = TA.EMA(e3, period);
        const e5 = TA.EMA(e4, period);
        const e6 = TA.EMA(e5, period);

        const c1 = -v * v * v;
        const c2 = 3 * v * v + 3 * v * v * v;
        const c3 = -6 * v * v - 3 * v - 3 * v * v * v;
        const c4 = 1 + 3 * v + v * v * v + 3 * v * v;

        return e1.map((_, i) => c1 * e6[i] + c2 * e5[i] + c3 * e4[i] + c4 * e3[i]);
    }
};

/**
 * 计算机构猎手(Holo)策略指标
 */
function calculateHoloIndicators(data) {
    const closes = data.map(d => d.c);
    const highs = data.map(d => d.h);
    const lows = data.map(d => d.l);
    const vols = data.map(d => d.v);

    // 快慢轨道
    const A_SH = TA.EMA(highs, 24);
    const B_SH = TA.EMA(lows, 23);
    const A_LG = TA.EMA(highs, 90);
    const B_LG = TA.EMA(lows, 89);

    // 资金流计算
    const VAR_H = TA.EMA(TA.HHV(highs, 250), 21);
    const LC = TA.REF(closes, 1);

    const fundFlowRaw = closes.map((c, i) => {
        const abs = Math.abs(lows[i] - LC[i]);
        const max = Math.max(lows[i] - LC[i], 0);
        const v = max === 0 ? 0 : (abs / max * 10);
        return (c * 1.3 < VAR_H[i]) ? v : v / 10;
    });

    const FUND_FLOW = TA.EMA(fundFlowRaw, 3);
    const llvLow30 = TA.LLV(lows, 30);
    const hhvFund30 = TA.HHV(FUND_FLOW, 30);

    const rawMoneyInput = lows.map((l, i) =>
        (l <= llvLow30[i]) ? (FUND_FLOW[i] + hhvFund30[i] * 2) / 2 : 0
    );

    const MAIN_MONEY = TA.EMA(TA.EMA(rawMoneyInput, 3).map(v => v / 10), 5);
    const refMainMoney = TA.REF(MAIN_MONEY, 1);
    const IS_YELLOW = MAIN_MONEY.map((v, i) => v > refMainMoney[i]);
    const llvLow5 = TA.LLV(lows, 5);
    const ACTUAL_BUY = MAIN_MONEY.map((v, i) =>
        v > 5 && v > refMainMoney[i] && lows[i] < llvLow5[i - 5]
    );

    // MACD
    const ema12 = TA.EMA(closes, 12);
    const ema26 = TA.EMA(closes, 26);
    const DIFF = ema12.map((v, i) => v - ema26[i]);
    const DEA = TA.EMA(DIFF, 9);
    const MACD = DIFF.map((v, i) => (v - DEA[i]) * 2);

    return {
        A_SH, B_SH, A_LG, B_LG,
        MAIN_MONEY, IS_YELLOW, ACTUAL_BUY,
        DIFF, DEA, MACD
    };
}

/**
 * 计算外包线(Envelope)策略指标
 */
function calculateEnvelopeIndicators(data) {
    const closes = data.map(d => d.c);
    const highs = data.map(d => d.h);
    const lows = data.map(d => d.l);

    const atr = TA.ATR(highs, lows, closes, 14);
    const ma20 = TA.SMA(closes, 20);
    const upper = ma20.map((m, i) => m + (atr[i] || 0) * 1.5);
    const lower = ma20.map((m, i) => m - (atr[i] || 0) * 1.5);
    const rsi = TA.RSI(closes, 14);

    return { ma20, upper, lower, rsi, atr };
}

/**
 * 计算T3策略指标
 */
function calculateT3Indicators(data) {
    const closes = data.map(d => d.c);
    const t3 = TA.T3(closes, 20);
    const rsi = TA.RSI(closes, 14);

    const ema12 = TA.EMA(closes, 12);
    const ema26 = TA.EMA(closes, 26);
    const diff = ema12.map((v, i) => v - ema26[i]);

    return { t3, rsi, diff };
}

/**
 * 计算CRT策略指标
 */
function calculateCRTIndicators(data) {
    const closes = data.map(d => d.c);
    const rsi = TA.RSI(closes, 14);

    return { rsi };
}

/**
 * 生成交易信号
 */
function generateSignals(data, indicators, strategy) {
    const lastIdx = data.length - 1;
    const closes = data.map(d => d.c);
    const lows = data.map(d => d.l);
    const vols = data.map(d => d.v);

    let signals = {};
    let activeSignal = '';
    let activeSignalColor = '';
    let action = '观望';
    let logContent = '';

    if (strategy === 'Holo') {
        const { A_SH, B_SH, A_LG, B_LG, MAIN_MONEY, IS_YELLOW, ACTUAL_BUY, MACD } = indicators;

        // 趋势判断
        const trendLong = closes[lastIdx] > B_LG[lastIdx] ? 'Bull' : 'Bear';
        const trendShort = closes[lastIdx] > B_SH[lastIdx] ? 'Bull' : 'Bear';

        // 信号检测
        signals.escape = MACD[lastIdx] < 0 && MACD[lastIdx - 1] >= 0;
        signals.breakUpShort = closes[lastIdx] > A_SH[lastIdx] && closes[lastIdx - 1] <= A_SH[lastIdx - 1];
        signals.breakDownShort = closes[lastIdx] < B_SH[lastIdx] && closes[lastIdx - 1] >= B_SH[lastIdx - 1];

        // 共振信号
        const barsLastBuy = TA.BARSLAST(ACTUAL_BUY);
        signals.horizontal = false;
        if (!ACTUAL_BUY[lastIdx]) {
            let prevBuyIdx = lastIdx - barsLastBuy[lastIdx];
            if (prevBuyIdx > 0 && prevBuyIdx < lastIdx - 5) {
                if (lows[lastIdx] >= lows[prevBuyIdx] * 0.95) {
                    signals.horizontal = true;
                }
            }
        }
        if (signals.horizontal && (IS_YELLOW[lastIdx] || MAIN_MONEY[lastIdx] > 0)) {
            if (closes[lastIdx] >= data[lastIdx].o) {
                signals.resonanceSignal = true;
            }
        }

        // 转折信号
        const low20 = TA.LLV(lows, 20);
        if (IS_YELLOW[lastIdx - 1] && MAIN_MONEY[lastIdx] > 0 && !IS_YELLOW[lastIdx] && lows[lastIdx] <= low20[lastIdx]) {
            signals.pivotSignal = true;
        }

        // 爆点信号
        const volMA5 = TA.SMA(vols, 5);
        const isVolumeSpike = vols[lastIdx] > volMA5[lastIdx] * 2;
        let isDivergence = false;
        if (lows[lastIdx] <= low20[lastIdx] && MACD[lastIdx] > Math.min(...MACD.slice(Math.max(0, lastIdx - 20), lastIdx))) {
            isDivergence = true;
        }
        const isSuppressed = closes[lastIdx] < B_SH[lastIdx];
        if (isDivergence && isVolumeSpike && !isSuppressed) {
            signals.superBottom = true;
        }

        // 确定主信号
        if (signals.resonanceSignal) {
            activeSignal = '★共振';
            activeSignalColor = 'bg-res';
            action = '共振买入';
        } else if (signals.superBottom) {
            activeSignal = '★爆点';
            activeSignalColor = 'bg-buy';
            action = '重仓爆点';
        } else if (signals.pivotSignal) {
            activeSignal = '★转折';
            activeSignalColor = 'bg-pivot';
            action = '极点转折';
        } else if (ACTUAL_BUY[lastIdx]) {
            activeSignal = '★买点';
            activeSignalColor = 'bg-buy';
            action = '买入';
        } else if (IS_YELLOW[lastIdx]) {
            activeSignal = '加速';
            activeSignalColor = 'bg-acc';
            action = '加速';
        } else if (signals.escape) {
            activeSignal = '逃跑';
            activeSignalColor = 'bg-sell';
            action = '逃跑';
        }

        logContent = `<div class="text-[10px] space-y-2">
            <div><b>【SOP触发：${action}】</b></div>
            ${action === '共振买入' ? '<div><b>环境:</b> 股价回踩W底颈线，主力资金逆势流入。<br><b>指令:</b> 市价建仓 40%。<br><b>风控:</b> 跌破昨日低点止损。</div>' : ''}
            ${action === '重仓爆点' ? '<div><b>环境:</b> MACD底背离+成交量倍量，空头力竭。<br><b>指令:</b> 激进买入 60%。<br><b>风控:</b> 跌破今日开盘价止损。</div>' : ''}
            ${action === '极点转折' ? '<div><b>环境:</b> 资金由黄转红，动能衰竭。<br><b>指令:</b> 左侧试错 20%。<br><b>风控:</b> 窄幅止损。</div>' : ''}
            ${action === '买入' ? '<div><b>环境:</b> 机构吸筹结束，量价配合。<br><b>指令:</b> 分批建仓。<br><b>风控:</b> 跌破通道下轨止损。</div>' : ''}
            ${action === '加速' ? '<div><b>环境:</b> 资金持续流入，沿快轨上行。<br><b>指令:</b> 坚定持有。<br><b>风控:</b> 不破蓝线不离场。</div>' : ''}
            ${action === '逃跑' ? '<div><b>环境:</b> 顶背离或有效破位。<br><b>指令:</b> 清仓离场。<br><b>风控:</b> 保护利润。</div>' : ''}
            ${action === '观望' ? '<div><b>环境:</b> 趋势不明或受压制。<br><b>指令:</b> 空仓等待。<br><b>风控:</b> 多看少动。</div>' : ''}
        </div>`;

        return { signals, activeSignal, activeSignalColor, action, logContent, trendLong, trendShort };
    }

    // 其他策略的信号生成逻辑...
    return { signals, activeSignal, activeSignalColor, action, logContent };
}

/**
 * 主消息处理
 */
self.onmessage = function(e) {
    const { type, data, strategy, symbol, name } = e.data;

    try {
        if (type === 'calculate') {
            // 计算指标
            let indicators;
            switch (strategy) {
                case 'Holo':
                    indicators = calculateHoloIndicators(data);
                    break;
                case 'Envelope':
                    indicators = calculateEnvelopeIndicators(data);
                    break;
                case 'T3':
                    indicators = calculateT3Indicators(data);
                    break;
                case 'CRT':
                    indicators = calculateCRTIndicators(data);
                    break;
                default:
                    indicators = calculateHoloIndicators(data);
            }

            // 生成信号
            const signalData = generateSignals(data, indicators, strategy);

            // 计算价格变化
            const closes = data.map(d => d.c);
            const lastIdx = closes.length - 1;
            const price = closes[lastIdx];
            const change = ((closes[lastIdx] - closes[lastIdx - 1]) / closes[lastIdx - 1]) * 100;

            // 返回结果
            self.postMessage({
                success: true,
                result: {
                    symbol,
                    name,
                    price,
                    change,
                    data,
                    indicators,
                    ...signalData,
                    lastUpdated: new Date(data[lastIdx].t * 1000).toLocaleString('zh-CN', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                }
            });
        }
    } catch (error) {
        self.postMessage({
            success: false,
            error: error.message,
            symbol
        });
    }
};
