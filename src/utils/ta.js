/**
 * 技术分析指标库 (Technical Analysis)
 * 包含常用技术指标计算函数
 */

export const TA = {
    /**
     * 指数移动平均线 (Exponential Moving Average)
     * @param {number[]} data - 价格数据
     * @param {number} period - 周期
     * @returns {number[]} EMA值数组
     */
    EMA: (data, period) => {
        const k = 2 / (period + 1);
        const res = [data[0]];
        for (let i = 1; i < data.length; i++) {
            res.push(data[i] * k + res[i - 1] * (1 - k));
        }
        return res;
    },

    /**
     * 简单移动平均线 (Simple Moving Average)
     * @param {number[]} data - 价格数据
     * @param {number} period - 周期
     * @returns {number[]} SMA值数组
     */
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

    /**
     * 移动平均线 (别名)
     */
    MA: function(data, period) {
        return this.SMA(data, period);
    },

    /**
     * 通达信SMA算法
     * @param {number[]} data - 价格数据
     * @param {number} n - 周期
     * @param {number} m - 权重
     * @returns {number[]} SMA值数组
     */
    SMA_TDX: (data, n, m) => {
        const res = [data[0]];
        for (let i = 1; i < data.length; i++) {
            res.push((data[i] * m + res[i - 1] * (n - m)) / n);
        }
        return res;
    },

    /**
     * 最高值 (Highest High Value)
     * @param {number[]} data - 价格数据
     * @param {number} period - 周期
     * @returns {number[]} 最高值数组
     */
    HHV: (data, period) => {
        const res = [];
        for (let i = 0; i < data.length; i++) {
            const start = Math.max(0, i - period + 1);
            res.push(Math.max(...data.slice(start, i + 1)));
        }
        return res;
    },

    /**
     * 最低值 (Lowest Low Value)
     * @param {number[]} data - 价格数据
     * @param {number} period - 周期
     * @returns {number[]} 最低值数组
     */
    LLV: (data, period) => {
        const res = [];
        for (let i = 0; i < data.length; i++) {
            const start = Math.max(0, i - period + 1);
            res.push(Math.min(...data.slice(start, i + 1)));
        }
        return res;
    },

    /**
     * 引用N周期前的数据
     * @param {number[]} arr - 数据数组
     * @param {number} n - 周期数
     * @returns {number[]} 引用后的数组
     */
    REF: (arr, n) => {
        const res = new Array(n).fill(arr[0]);
        for (let i = n; i < arr.length; i++) {
            res.push(arr[i - n]);
        }
        return res;
    },

    /**
     * 上次条件成立到当前的周期数
     * @param {boolean[]} arr - 条件数组
     * @returns {number[]} 周期数数组
     */
    BARSLAST: (arr) => {
        const res = [];
        let last = -1;
        for (let i = 0; i < arr.length; i++) {
            if (arr[i]) last = i;
            res.push(last === -1 ? 0 : i - last);
        }
        return res;
    },

    /**
     * 相对强弱指标 (Relative Strength Index)
     * @param {number[]} data - 价格数据
     * @param {number} period - 周期
     * @returns {number[]} RSI值数组
     */
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

    /**
     * 平均真实波幅 (Average True Range)
     * @param {number[]} highs - 最高价数组
     * @param {number[]} lows - 最低价数组
     * @param {number[]} closes - 收盘价数组
     * @param {number} period - 周期
     * @returns {number[]} ATR值数组
     */
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

    /**
     * T3移动平均线 (Tillson T3)
     * @param {number[]} data - 价格数据
     * @param {number} period - 周期
     * @param {number} v - 体积因子 (默认0.7)
     * @returns {number[]} T3值数组
     */
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
    },

    /**
     * MACD指标
     * @param {number[]} data - 价格数据
     * @param {number} fastPeriod - 快线周期 (默认12)
     * @param {number} slowPeriod - 慢线周期 (默认26)
     * @param {number} signalPeriod - 信号线周期 (默认9)
     * @returns {Object} {diff, dea, macd}
     */
    MACD: (data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) => {
        const ema12 = TA.EMA(data, fastPeriod);
        const ema26 = TA.EMA(data, slowPeriod);
        const diff = ema12.map((v, i) => v - ema26[i]);
        const dea = TA.EMA(diff, signalPeriod);
        const macd = diff.map((v, i) => (v - dea[i]) * 2);
        return { diff, dea, macd };
    }
};
