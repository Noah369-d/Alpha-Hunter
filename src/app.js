/**
 * 主应用逻辑 - 模块化版本
 * 使用 Web Worker 进行计算优化
 */

import { storage } from './utils/storage.js';
import { errorHandler, AppError, ErrorType, ErrorLevel } from './utils/errorHandler.js';
import { 
    normalizeSymbol, 
    getMarketType, 
    getMarketClass,
    getRangeForPeriod,
    getPeriodName
} from './utils/helpers.js';
import { fetchBatchStockData, fetchNews, resampleTo4H } from './utils/api.js';

// 股票列表预设
const STOCK_LISTS = {
    'SPY': 'NVDA,AAPL,MSFT,AMZN,META,GOOGL,TSLA,AMD,AVGO,LLY,JPM,V,UNH,XOM',
    'HSI': '0700.HK,9988.HK,3690.HK,1299.HK,0941.HK,0939.HK,0005.HK,0883.HK,1398.HK,3988.HK,0020.HK,9618.HK,1810.HK,2020.HK,0388.HK,1211.HK,2269.HK,0001.HK,0011.HK,0003.HK,2318.HK,0016.HK,0027.HK,0066.HK,0101.HK,0175.HK',
    'CSI': '600519.SS,300750.SZ,601318.SS,600036.SS,000858.SZ,000333.SZ,601888.SS'
};

export default {
    data() {
        return {
            // 基础状态
            inputSymbols: '',
            activeSymbols: [],
            period: '1d',
            currentStrategy: 'Holo',
            isDark: true,
            
            // 数据状态
            stocks: [],
            currentStock: null,
            loading: false,
            progress: '',
            
            // UI状态
            marketFilter: 'ALL',
            sortKey: null,
            sortOrder: 'desc',
            activeRightTab: 'sim',
            
            // 用户数据
            watchlist: [],
            sentimentMap: {},
            portfolio: [],
            
            // 交易数据
            trade: {
                entry: 0,
                qty: 100,
                sl: 0,
                tp: 0
            },
            
            // 资讯
            newsList: [],
            newsLoading: false,
            
            // 预警
            alertState: {
                triggered: false,
                type: '',
                message: ''
            },
            
            // 自动刷新
            autoRefreshTimer: null,
            autoRefreshCount: 900,
            
            // 图表相关
            chart: null,
            candleSeries: null,
            tradeLines: { entry: null, sl: null, tp: null },
            activeTool: 'cursor',
            drawings: [],
            trendLineSeries: [],
            
            // Worker
            worker: null,
            workerBusy: false,
            
            // 通知
            notifications: []
        };
    },

    computed: {
        periodName() {
            return getPeriodName(this.period);
        },

        sortedStocks() {
            let list = this.stocks;
            
            // 市场筛选
            if (this.marketFilter !== 'ALL') {
                list = list.filter(s => getMarketType(s.symbol) === this.marketFilter);
            }
            
            // 排序
            if (!this.sortKey) return list;
            
            return [...list].sort((a, b) => {
                let valA = a[this.sortKey];
                let valB = b[this.sortKey];
                
                if (typeof valA === 'string') {
                    valA = valA.toUpperCase();
                    valB = valB.toUpperCase();
                }
                
                return (valA < valB ? -1 : 1) * (this.sortOrder === 'asc' ? 1 : -1);
            });
        },

        totalAssetValue() {
            return this.portfolio.reduce((sum, p) => sum + p.marketVal, 0);
        }
    },

    created() {
        // 初始化错误处理
        errorHandler.setNotificationCallback((message) => {
            this.showNotification(message, 'error');
        });

        // 加载本地数据
        this.loadLocalData();

        // 初始化 Worker
        this.initWorker();
    },

    mounted() {
        // 设置初始主题
        document.body.setAttribute('data-theme', this.isDark ? 'dark' : 'light');
        
        // 启动自动刷新
        this.startAutoRefresh();
    },

    beforeUnmount() {
        // 清理定时器
        if (this.autoRefreshTimer) {
            clearInterval(this.autoRefreshTimer);
        }

        // 终止 Worker
        if (this.worker) {
            this.worker.terminate();
        }

        // 清理图表
        if (this.chart) {
            this.chart.remove();
        }
    },

    methods: {
        /**
         * 加载本地数据
         */
        loadLocalData() {
            try {
                this.watchlist = storage.getWatchlist();
                this.sentimentMap = storage.getSentimentMap();
                this.portfolio = storage.getPortfolio();
                this.isDark = storage.getTheme() === 'dark';
                this.currentStrategy = storage.getStrategy();
            } catch (error) {
                errorHandler.handle(new AppError(
                    'Failed to load local data',
                    ErrorType.STORAGE,
                    ErrorLevel.WARNING,
                    { error }
                ));
            }
        },

        /**
         * 初始化 Web Worker
         */
        initWorker() {
            try {
                this.worker = new Worker('./src/workers/indicator-worker.js');
                
                this.worker.onmessage = (e) => {
                    this.workerBusy = false;
                    
                    if (e.data.success) {
                        this.stocks.push(e.data.result);
                    } else {
                        console.error(`Worker error for ${e.data.symbol}:`, e.data.error);
                    }
                };

                this.worker.onerror = (error) => {
                    this.workerBusy = false;
                    errorHandler.handle(new AppError(
                        'Worker error',
                        ErrorType.CALCULATION,
                        ErrorLevel.ERROR,
                        { error }
                    ));
                };
            } catch (error) {
                console.warn('Worker not supported, falling back to main thread');
                this.worker = null;
            }
        },

        /**
         * 显示通知
         */
        showNotification(message, type = 'info', duration = 3000) {
            const id = Date.now();
            this.notifications.push({ id, message, type });

            setTimeout(() => {
                this.notifications = this.notifications.filter(n => n.id !== id);
            }, duration);
        },

        /**
         * 运行扫描器
         */
        async runScanner(keepSelection = false, useMemory = false) {
            const lastSelectedSymbol = this.currentStock ? this.currentStock.symbol : null;
            
            this.loading = true;
            this.progress = 'Init';
            this.stocks = [];

            try {
                // 获取股票代码列表
                let rawSymbols = [];
                if (useMemory && this.activeSymbols.length > 0) {
                    rawSymbols = this.activeSymbols;
                } else {
                    rawSymbols = this.inputSymbols
                        .split(',')
                        .map(s => s.trim())
                        .filter(s => s);
                    
                    if (rawSymbols.length > 0) {
                        this.activeSymbols = rawSymbols;
                    }
                }

                if (rawSymbols.length === 0) {
                    this.showNotification('请输入股票代码', 'warning');
                    return;
                }

                // 标准化代码
                const symbols = rawSymbols.map(s => normalizeSymbol(s));

                // 获取时间参数
                let interval = this.period;
                let range = getRangeForPeriod(interval);
                let is4H = false;

                if (interval === '4h') {
                    interval = '60m';
                    is4H = true;
                } else if (interval === '1h') {
                    interval = '60m';
                }

                // 批量获取数据
                const results = await fetchBatchStockData(
                    symbols,
                    interval,
                    range,
                    (current, total) => {
                        this.progress = `${current}/${total}`;
                    }
                );

                // 处理数据
                for (const result of results) {
                    let finalData = result.data;
                    
                    // 4小时重采样
                    if (is4H) {
                        finalData = resampleTo4H(finalData);
                    }

                    // 数据量检查
                    if (finalData.length < 50) {
                        console.warn(`${result.symbol}: insufficient data`);
                        continue;
                    }

                    // 使用 Worker 计算指标
                    if (this.worker) {
                        this.worker.postMessage({
                            type: 'calculate',
                            data: finalData,
                            strategy: this.currentStrategy,
                            symbol: result.symbol,
                            name: result.name
                        });
                    } else {
                        // 降级到主线程计算
                        // TODO: 实现主线程计算逻辑
                        console.warn('Worker not available, skipping calculation');
                    }
                }

                this.progress = 'Done';
                
                // 更新持仓价格
                this.updateAssetsPrices();

                // 恢复选择
                if (keepSelection && lastSelectedSymbol) {
                    const found = this.stocks.find(s => s.symbol === lastSelectedSymbol);
                    if (found) {
                        this.selectStock(found);
                    } else if (this.stocks.length > 0) {
                        this.selectStock(this.stocks[0]);
                    }
                } else if (this.stocks.length > 0 && !this.currentStock) {
                    this.selectStock(this.stocks[0]);
                }

                if (!useMemory && !keepSelection) {
                    this.inputSymbols = '';
                }

            } catch (error) {
                errorHandler.handle(new AppError(
                    'Scanner failed',
                    ErrorType.API,
                    ErrorLevel.ERROR,
                    { error }
                ));
            } finally {
                this.loading = false;
            }
        },

        /**
         * 选择股票
         */
        selectStock(stock) {
            this.currentStock = stock;
            this.resetTrade();
            this.fetchStockNews(stock.symbol);
            
            this.$nextTick(() => {
                this.initChart(stock);
            });
        },

        /**
         * 获取股票新闻
         */
        async fetchStockNews(symbol) {
            this.newsLoading = true;
            try {
                this.newsList = await fetchNews(symbol);
            } catch (error) {
                console.error('Failed to fetch news:', error);
            } finally {
                this.newsLoading = false;
            }
        },

        /**
         * 切换周期
         */
        changePeriod(p) {
            this.period = p;
            storage.setStrategy(this.currentStrategy);
            
            if (this.inputSymbols.trim()) {
                this.runScanner(true);
            } else if (this.activeSymbols.length > 0) {
                this.runScanner(true, true);
            }
        },

        /**
         * 切换策略
         */
        onStrategyChange() {
            storage.setStrategy(this.currentStrategy);
            if (this.currentStock) {
                this.initChart(this.currentStock);
            }
        },

        /**
         * 切换主题
         */
        toggleTheme() {
            this.isDark = !this.isDark;
            storage.setTheme(this.isDark ? 'dark' : 'light');
            
            // 更新body的data-theme属性
            document.body.setAttribute('data-theme', this.isDark ? 'dark' : 'light');
            
            if (this.chart) {
                this.chart.applyOptions(this.getChartOptions());
            }
        },

        /**
         * 获取图表配置
         */
        getChartOptions() {
            const textColor = this.isDark ? '#d1d4dc' : '#131722';
            const bgColor = this.isDark ? '#131722' : '#ffffff';
            const gridColor = this.isDark ? '#2a2e39' : '#e6e9f0';

            return {
                layout: {
                    background: { color: bgColor },
                    textColor
                },
                grid: {
                    vertLines: { color: gridColor },
                    horzLines: { color: gridColor }
                },
                timeScale: {
                    borderColor: gridColor,
                    timeVisible: true,
                    secondsVisible: false
                },
                rightPriceScale: {
                    borderColor: gridColor
                },
                crosshair: {
                    mode: LightweightCharts.CrosshairMode.Normal
                }
            };
        },

        /**
         * 启动自动刷新
         */
        startAutoRefresh() {
            if (this.autoRefreshTimer) {
                clearInterval(this.autoRefreshTimer);
            }
            
            this.autoRefreshTimer = setInterval(() => {
                this.autoRefreshCount--;
                if (this.autoRefreshCount <= 0) {
                    if (!this.loading && this.stocks.length > 0) {
                        this.inputSymbols = this.stocks.map(s => s.symbol).join(',');
                        this.runScanner(true);
                        this.inputSymbols = '';
                    }
                    this.autoRefreshCount = 900;
                }
            }, 1000);
        },

        /**
         * 初始化图表
         */
        initChart(stock) {
            if (!stock || !stock.data || stock.data.length === 0) {
                console.warn('No data for chart');
                return;
            }

            const container = document.getElementById('tv-chart-container');
            if (!container) {
                console.error('Chart container not found');
                return;
            }

            // 清理旧图表
            if (this.chart) {
                this.chart.remove();
                this.chart = null;
                this.candleSeries = null;
                this.trendLineSeries = [];
            }

            // 创建图表
            this.chart = LightweightCharts.createChart(container, {
                ...this.getChartOptions(),
                width: container.clientWidth,
                height: container.clientHeight,
                handleScroll: { mouseWheel: true, pressedMouseMove: true },
                handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true }
            });

            // 添加K线系列
            this.candleSeries = this.chart.addCandlestickSeries({
                upColor: '#089981',
                downColor: '#f23645',
                borderUpColor: '#089981',
                borderDownColor: '#f23645',
                wickUpColor: '#089981',
                wickDownColor: '#f23645'
            });

            // 设置K线数据
            const candleData = stock.data.map(d => ({
                time: d.time,
                open: d.open,
                high: d.high,
                low: d.low,
                close: d.close
            }));
            this.candleSeries.setData(candleData);

            // 添加指标线
            this.addIndicatorLines(stock);

            // 添加交易线
            this.updateTradeLines();

            // 自适应
            this.chart.timeScale().fitContent();

            // 添加点击事件
            this.setupChartInteraction();
        },

        /**
         * 添加指标线
         */
        addIndicatorLines(stock) {
            if (!stock.indicators || !this.chart) return;

            const ind = stock.indicators;

            // 根据策略添加不同的指标
            if (this.currentStrategy === 'Holo') {
                // 快轨上下轨 (蓝色)
                if (ind.A_SH && ind.A_SH.length > 0) {
                    const upperShort = this.chart.addLineSeries({
                        color: '#2962ff',
                        lineWidth: 1,
                        title: 'A_SH'
                    });
                    upperShort.setData(stock.data.map((d, i) => ({ time: d.time, value: ind.A_SH[i] })));
                }

                if (ind.B_SH && ind.B_SH.length > 0) {
                    const lowerShort = this.chart.addLineSeries({
                        color: '#2962ff',
                        lineWidth: 1,
                        title: 'B_SH'
                    });
                    lowerShort.setData(stock.data.map((d, i) => ({ time: d.time, value: ind.B_SH[i] })));
                }

                // 慢轨上下轨 (金色)
                if (ind.A_LG && ind.A_LG.length > 0) {
                    const upperLong = this.chart.addLineSeries({
                        color: '#fcc02e',
                        lineWidth: 1,
                        title: 'A_LG'
                    });
                    upperLong.setData(stock.data.map((d, i) => ({ time: d.time, value: ind.A_LG[i] })));
                }

                if (ind.B_LG && ind.B_LG.length > 0) {
                    const lowerLong = this.chart.addLineSeries({
                        color: '#fcc02e',
                        lineWidth: 1,
                        title: 'B_LG'
                    });
                    lowerLong.setData(stock.data.map((d, i) => ({ time: d.time, value: ind.B_LG[i] })));
                }
            } else if (this.currentStrategy === 'Envelope') {
                // 外包线
                if (ind.upperBand && ind.upperBand.length > 0) {
                    const upper = this.chart.addLineSeries({
                        color: '#b481ff',
                        lineWidth: 1,
                        title: 'Upper'
                    });
                    upper.setData(stock.data.map((d, i) => ({ time: d.time, value: ind.upperBand[i] })));
                }

                if (ind.sma && ind.sma.length > 0) {
                    const mid = this.chart.addLineSeries({
                        color: '#787b86',
                        lineWidth: 1,
                        title: 'SMA'
                    });
                    mid.setData(stock.data.map((d, i) => ({ time: d.time, value: ind.sma[i] })));
                }

                if (ind.lowerBand && ind.lowerBand.length > 0) {
                    const lower = this.chart.addLineSeries({
                        color: '#b481ff',
                        lineWidth: 1,
                        title: 'Lower'
                    });
                    lower.setData(stock.data.map((d, i) => ({ time: d.time, value: ind.lowerBand[i] })));
                }
            } else if (this.currentStrategy === 'T3') {
                // T3均线
                if (ind.t3 && ind.t3.length > 0) {
                    const t3Line = this.chart.addLineSeries({
                        color: '#2962ff',
                        lineWidth: 2,
                        title: 'T3'
                    });
                    t3Line.setData(stock.data.map((d, i) => ({ time: d.time, value: ind.t3[i] })));
                }
            }
        },

        /**
         * 更新交易线
         */
        updateTradeLines() {
            if (!this.chart || !this.currentStock) return;

            // 清除旧线
            Object.values(this.tradeLines).forEach(line => {
                if (line) {
                    this.chart.removePriceLine(line);
                }
            });
            this.tradeLines = { entry: null, sl: null, tp: null };

            // 添加新线
            if (this.trade.entry > 0) {
                this.tradeLines.entry = this.candleSeries.createPriceLine({
                    price: this.trade.entry,
                    color: '#2962ff',
                    lineWidth: 2,
                    lineStyle: LightweightCharts.LineStyle.Dashed,
                    axisLabelVisible: true,
                    title: 'Entry'
                });
            }

            if (this.trade.sl > 0) {
                this.tradeLines.sl = this.candleSeries.createPriceLine({
                    price: this.trade.sl,
                    color: '#f23645',
                    lineWidth: 2,
                    lineStyle: LightweightCharts.LineStyle.Solid,
                    axisLabelVisible: true,
                    title: 'SL'
                });
            }

            if (this.trade.tp > 0) {
                this.tradeLines.tp = this.candleSeries.createPriceLine({
                    price: this.trade.tp,
                    color: '#089981',
                    lineWidth: 2,
                    lineStyle: LightweightCharts.LineStyle.Solid,
                    axisLabelVisible: true,
                    title: 'TP'
                });
            }

            // 检查预警
            this.checkAlerts();
        },

        /**
         * 检查预警
         */
        checkAlerts() {
            if (!this.currentStock || !this.trade.entry) return;

            const price = this.currentStock.price;
            
            if (this.trade.sl > 0 && price <= this.trade.sl) {
                this.alertState = {
                    triggered: true,
                    type: 'SL',
                    message: `止损触发! 当前价: ${price.toFixed(2)} <= 止损: ${this.trade.sl.toFixed(2)}`
                };
            } else if (this.trade.tp > 0 && price >= this.trade.tp) {
                this.alertState = {
                    triggered: true,
                    type: 'TP',
                    message: `止盈触发! 当前价: ${price.toFixed(2)} >= 止盈: ${this.trade.tp.toFixed(2)}`
                };
            } else {
                this.alertState = {
                    triggered: false,
                    type: '',
                    message: ''
                };
            }
        },

        /**
         * 设置图表交互
         */
        setupChartInteraction() {
            if (!this.chart) return;

            let drawingStart = null;

            this.chart.subscribeClick((param) => {
                if (!param.point || !param.time) return;

                if (this.activeTool === 'hline') {
                    // 水平线
                    const price = this.candleSeries.coordinateToPrice(param.point.y);
                    const line = this.candleSeries.createPriceLine({
                        price: price,
                        color: '#787b86',
                        lineWidth: 1,
                        lineStyle: LightweightCharts.LineStyle.Dashed,
                        axisLabelVisible: true
                    });
                    this.drawings.push({ type: 'hline', line });
                } else if (this.activeTool === 'trend') {
                    // 趋势线 (简化实现)
                    if (!drawingStart) {
                        drawingStart = { time: param.time, price: this.candleSeries.coordinateToPrice(param.point.y) };
                    } else {
                        const endPrice = this.candleSeries.coordinateToPrice(param.point.y);
                        // 这里需要使用线性系列来绘制趋势线
                        const trendLine = this.chart.addLineSeries({
                            color: '#787b86',
                            lineWidth: 1,
                            lineStyle: LightweightCharts.LineStyle.Dashed
                        });
                        trendLine.setData([
                            { time: drawingStart.time, value: drawingStart.price },
                            { time: param.time, value: endPrice }
                        ]);
                        this.trendLineSeries.push(trendLine);
                        this.drawings.push({ type: 'trend', line: trendLine });
                        drawingStart = null;
                    }
                }
            });
        },

        /**
         * 设置绘图工具
         */
        setTool(tool) {
            this.activeTool = tool;
        },

        /**
         * 清除绘图
         */
        clearDrawings() {
            this.drawings.forEach(d => {
                if (d.type === 'hline' && d.line) {
                    this.candleSeries.removePriceLine(d.line);
                } else if (d.type === 'trend' && d.line) {
                    this.chart.removeSeries(d.line);
                }
            });
            this.drawings = [];
            this.trendLineSeries = [];
        },

        /**
         * 更新交易
         */
        updateTrade() {
            this.updateTradeLines();
        },

        /**
         * 添加到持仓
         */
        addToPortfolio() {
            if (!this.currentStock || !this.trade.entry || !this.trade.qty) {
                this.showNotification('请填写完整的交易信息', 'warning');
                return;
            }

            const existing = this.portfolio.find(p => p.symbol === this.currentStock.symbol);
            
            if (existing) {
                // 更新现有持仓
                const totalQty = existing.qty + this.trade.qty;
                const totalCost = (existing.avgCost * existing.qty) + (this.trade.entry * this.trade.qty);
                existing.avgCost = totalCost / totalQty;
                existing.qty = totalQty;
                existing.price = this.currentStock.price;
                existing.marketVal = existing.price * existing.qty;
                existing.plPercent = ((existing.price - existing.avgCost) / existing.avgCost * 100).toFixed(2);
            } else {
                // 新增持仓
                this.portfolio.push({
                    symbol: this.currentStock.symbol,
                    name: this.currentStock.name,
                    avgCost: this.trade.entry,
                    qty: this.trade.qty,
                    price: this.currentStock.price,
                    marketVal: this.currentStock.price * this.trade.qty,
                    plPercent: ((this.currentStock.price - this.trade.entry) / this.trade.entry * 100).toFixed(2),
                    weight: 0
                });
            }

            this.recalcPortfolio();
            this.showNotification(`已添加 ${this.currentStock.symbol} 到持仓`, 'success');
        },

        /**
         * 删除持仓
         */
        removeFromPortfolio(index) {
            this.portfolio.splice(index, 1);
            this.recalcPortfolio();
        },

        /**
         * 打开对比窗口
         */
        openComparisonWindow() {
            this.showNotification('对比功能开发中...', 'info');
        },

        /**
         * 重置交易
         */
        resetTrade() {
            this.trade = {
                entry: 0,
                qty: 100,
                sl: 0,
                tp: 0
            };
            this.alertState = {
                triggered: false,
                type: '',
                message: ''
            };
        },

        /**
         * 更新持仓价格
         */
        updateAssetsPrices() {
            if (this.portfolio.length === 0) return;
            
            let updated = false;
            this.portfolio.forEach(p => {
                const stockData = this.stocks.find(s => s.symbol === p.symbol);
                if (stockData) {
                    p.price = stockData.price;
                    p.marketVal = p.price * p.qty;
                    p.plPercent = ((p.price - p.avgCost) / p.avgCost * 100).toFixed(2);
                    updated = true;
                }
            });
            
            if (updated) {
                this.recalcPortfolio();
            }
        },

        /**
         * 重新计算持仓
         */
        recalcPortfolio() {
            const total = this.portfolio.reduce((s, p) => s + p.marketVal, 0);
            this.portfolio.forEach(p => {
                p.weight = total > 0 ? ((p.marketVal / total) * 100).toFixed(1) : 0;
            });
            storage.setPortfolio(this.portfolio);
        },

        /**
         * 排序
         */
        sortBy(key) {
            if (this.sortKey === key) {
                this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
            } else {
                this.sortKey = key;
                this.sortOrder = 'desc';
            }
        },

        /**
         * 获取排序图标
         */
        getSortIcon(key) {
            if (this.sortKey !== key) return '';
            return this.sortOrder === 'asc' ? '▲' : '▼';
        },

        /**
         * 切换自选
         */
        toggleWatchlist(symbol) {
            if (this.watchlist.includes(symbol)) {
                this.watchlist = this.watchlist.filter(s => s !== symbol);
            } else {
                this.watchlist.push(symbol);
            }
            storage.setWatchlist(this.watchlist);
        },

        /**
         * 是否在自选中
         */
        isWatchlisted(symbol) {
            return this.watchlist.includes(symbol);
        },

        /**
         * 加载自选列表
         */
        loadWatchlist() {
            if (this.watchlist.length > 0) {
                this.inputSymbols = this.watchlist.join(',');
                this.runScanner(false);
            }
        },

        /**
         * 加载预设列表
         */
        loadList(type) {
            const STOCK_LISTS = {
                'SPY': 'NVDA,AAPL,MSFT,AMZN,META,GOOGL,TSLA,AMD,AVGO,LLY,JPM,V,UNH,XOM',
                'HSI': '0700.HK,9988.HK,3690.HK,1299.HK,0941.HK,0939.HK,0005.HK,0883.HK',
                'CSI': '600519.SS,300750.SZ,601318.SS,600036.SS'
            };
            
            if (STOCK_LISTS[type]) {
                this.inputSymbols = STOCK_LISTS[type];
                this.runScanner(false);
            }
        },

        /**
         * 切换情绪
         */
        toggleSentiment(symbol) {
            const current = this.sentimentMap[symbol] || 0;
            const next = (current + 1) % 4;
            this.sentimentMap[symbol] = next;
            storage.setSentimentMap(this.sentimentMap);
        },

        /**
         * 获取情绪类名
         */
        getSentimentClass(symbol) {
            const s = this.sentimentMap[symbol];
            if (s === 1) return 'sent-bull';
            if (s === 2) return 'sent-bear';
            if (s === 3) return 'sent-flat';
            return 'sent-none';
        },

        /**
         * 文件上传处理
         */
        handleFileUpload(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target.result;
                const rawCodes = text.split(/[\r\n, ]+/).map(s => s.trim()).filter(s => s);
                
                if (rawCodes.length > 0) {
                    rawCodes.forEach(code => {
                        const normalized = normalizeSymbol(code);
                        if (!this.watchlist.includes(normalized)) {
                            this.watchlist.push(normalized);
                        }
                    });
                    storage.setWatchlist(this.watchlist);
                    this.inputSymbols = this.watchlist.join(',');
                    this.runScanner(false);
                }
            };
            reader.readAsText(file);
            e.target.value = '';
        }
    },

    template: `
        <div class="h-screen w-screen flex flex-col p-2 box-border select-none">
            <!-- 顶部工具栏 -->
            <div class="flex justify-between items-center mb-2 px-1 flex-none">
                <div class="flex items-center gap-4">
                    <h1 class="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                        HoloResonance <span class="text-xs text-[var(--text-sub)] font-normal">V10.0 模块化</span>
                    </h1>
                    
                    <div class="flex items-center gap-2 border-l border-[var(--border-color)] pl-3">
                        <span class="text-[10px] text-[var(--text-sub)]">STRAT:</span>
                        <select v-model="currentStrategy" @change="onStrategyChange" class="strategy-select">
                            <option value="Holo">机构猎手 (Main)</option>
                            <option value="CRT">CRT (Trap)</option>
                            <option value="Envelope">外包线 (Mean Rev)</option>
                            <option value="T3">T3+MACD</option>
                        </select>
                    </div>

                    <div class="flex bg-[var(--bg-panel)] rounded p-1 gap-1 border border-[var(--border-color)]">
                        <button v-for="p in ['15m','1h','4h','1d','1wk']" @click="changePeriod(p)" 
                            :class="['btn', 'px-2', 'py-1', 'text-[10px]', period===p?'btn-active':'btn-ghost']">{{ p.toUpperCase() }}</button>
                    </div>
                    
                    <div class="flex gap-2 text-xs ml-4 items-center">
                        <button @click="toggleTheme" class="btn btn-ghost" title="日/夜模式">{{ isDark ? '☀' : '🌙' }}</button>
                        <button @click="openComparisonWindow" class="btn btn-purple gap-1 shadow-lg shadow-purple-500/20 px-2 py-1">📊 对比</button>
                        <span class="text-[var(--border-color)]">|</span>
                        <button @click="loadWatchlist" class="text-yellow-400 font-bold border border-yellow-600/30 px-2 py-1 rounded hover:bg-yellow-500/10 transition">★ 自选</button>
                        <button @click="loadList('SPY')" class="text-blue-400 hover:text-blue-500 transition cursor-pointer">🇺🇸 SPY</button>
                        <button @click="loadList('HSI')" class="text-teal-400 hover:text-teal-500 transition cursor-pointer">🇭🇰 恒指</button>
                        <button @click="loadList('CSI')" class="text-red-400 hover:text-red-500 transition cursor-pointer">🇨🇳 沪深</button>
                    </div>
                </div>
                
                <div class="flex gap-2 items-center">
                    <input type="file" ref="fileInput" @change="handleFileUpload" class="hidden" accept=".txt,.csv">
                    <button @click="$refs.fileInput.click()" class="btn btn-ghost px-2 h-7" title="导入股票代码">📂</button>
                    <span v-if="autoRefreshCount > 0" class="text-[9px] text-[var(--text-sub)] font-mono w-8 text-right">{{ Math.floor(autoRefreshCount/60) }}m</span>
                    <input v-model="inputSymbols" @keyup.enter="runScanner(false)" type="text" class="input-dark w-40" placeholder="代码 (如: AAPL)...">
                    <button @click="runScanner(false)" :disabled="loading" class="btn btn-blue w-20 font-mono text-xs">
                        {{ loading ? progress : '扫描' }}
                    </button>
                </div>
            </div>

            <div class="flex flex-1 gap-2 overflow-hidden">
                <!-- 左侧：股票列表 -->
                <div class="w-80 flex flex-col gap-2 flex-none">
                    <div class="card flex-1 overflow-hidden flex flex-col">
                        <div class="p-2 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-panel)] flex-none h-9">
                            <span class="font-bold text-xs text-[var(--text-sub)]">列表 ({{ sortedStocks.length }})</span>
                            <div class="flex gap-1">
                                <span @click="marketFilter='ALL'" :class="['market-btn', marketFilter==='ALL'?'active':'']">ALL</span>
                                <span @click="marketFilter='US'" :class="['market-btn', marketFilter==='US'?'active':'']">US</span>
                                <span @click="marketFilter='HK'" :class="['market-btn', marketFilter==='HK'?'active':'']">HK</span>
                                <span @click="marketFilter='CN'" :class="['market-btn', marketFilter==='CN'?'active':'']">CN</span>
                            </div>
                        </div>
                        
                        <div class="stock-grid-header">
                            <div>研判</div>
                            <div class="sortable" @click="sortBy('symbol')">代码/名称 <span class="sort-icon">{{getSortIcon('symbol')}}</span></div>
                            <div class="sortable" @click="sortBy('change')">现价 <span class="sort-icon">{{getSortIcon('change')}}</span></div>
                            <div>趋势</div>
                            <div>信号</div>
                        </div>

                        <div class="overflow-y-auto flex-1 relative">
                            <div v-for="stock in sortedStocks" :key="stock.symbol" @click="selectStock(stock)"
                                :class="['stock-grid-row', currentStock?.symbol === stock.symbol ? 'active' : '']">
                                <div>
                                    <span @click.stop="toggleWatchlist(stock.symbol)" :class="['btn-star', isWatchlisted(stock.symbol) ? 'active' : '']">★</span>
                                    <span @click.stop="toggleSentiment(stock.symbol)" :class="['sentiment-btn', getSentimentClass(stock.symbol)]"></span>
                                </div>
                                <div>
                                    <div class="flex items-center">
                                        <span :class="['market-badge', getMarketClass(stock.symbol)]">{{ getMarketType(stock.symbol) }}</span>
                                        <span class="font-bold text-[var(--text-main)]">{{ stock.symbol }}</span>
                                    </div>
                                    <div class="text-[9px] text-[var(--text-sub)] truncate" style="max-width: 100px;" :title="stock.name">{{ stock.name }}</div>
                                </div>
                                <div class="text-right">
                                    <div :class="stock.change >= 0 ? 'text-up' : 'text-down'">{{ stock.price.toFixed(2) }}</div>
                                    <div :class="['text-[9px]', stock.change >= 0 ? 'text-up' : 'text-down']">{{ stock.change >= 0 ? '+' : ''}}{{ stock.change.toFixed(2) }}%</div>
                                </div>
                                <div class="text-center">
                                    <div v-if="currentStrategy==='Holo'" class="flex gap-1 justify-center">
                                        <span :class="['trend-pill', stock.trendShort==='Bull'?'trend-up':'trend-bear']">S</span>
                                        <span :class="['trend-pill', stock.trendLong==='Bull'?'trend-up':'trend-bear']">L</span>
                                    </div>
                                    <span v-else class="text-[9px] text-[var(--text-sub)]">{{ currentStrategy }}</span>
                                </div>
                                <div class="text-right">
                                    <span v-if="stock.activeSignal" class="signal-tag" :class="stock.activeSignalColor">{{ stock.activeSignal }}</span>
                                    <span v-else class="text-[var(--text-sub)]">-</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 中间：图表 -->
                <div class="flex-1 flex flex-col gap-2 min-w-0">
                    <div class="card flex-1 p-1 relative flex flex-col overflow-hidden group bg-[var(--bg-root)]">
                        <div class="drawing-tools opacity-0 group-hover:opacity-100 transition-opacity">
                            <div @click="setTool('cursor')" :class="['tool-btn', activeTool==='cursor'?'active':'']" title="浏览">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5v14"/></svg>
                            </div>
                            <div @click="setTool('hline')" :class="['tool-btn', activeTool==='hline'?'active':'']" title="水平线">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18"/></svg>
                            </div>
                            <div @click="setTool('trend')" :class="['tool-btn', activeTool==='trend'?'active':'']" title="趋势线">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="21" y1="21" x2="3" y2="3"/></svg>
                            </div>
                            <div class="tool-divider"></div>
                            <div @click="clearDrawings" class="tool-btn hover:text-red-500" title="清除绘图">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                            </div>
                        </div>
                        
                        <div id="tv-chart-container" class="w-full h-full cursor-crosshair"></div>
                        
                        <div v-if="currentStock" class="chart-legend">
                            <div class="flex items-center gap-2 text-xs font-mono text-[var(--text-sub)]">
                                <span class="text-[var(--text-main)] font-bold text-sm mr-1">{{ currentStock.name }}</span>
                                <span>[ {{ currentStrategy }} ]</span>
                                <span>Data: <span class="text-blue-400">{{ currentStock.lastUpdated }}</span></span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 底部功能区 -->
                    <div class="card h-52 flex overflow-hidden">
                        <!-- 1. 日志 -->
                        <div class="flex-1 flex flex-col border-r border-[var(--border-color)] min-w-[200px]">
                            <div class="px-3 py-2 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-root)]">
                                <span class="text-xs text-[var(--text-sub)] font-mono">SYSTEM LOG ({{ currentStrategy }})</span>
                                <span v-if="currentStock" :class="['font-bold text-xs', 'text-blue-signal']">{{ currentStock.logTitle || 'Analysis' }}</span>
                            </div>
                            <div class="flex-1 p-3 overflow-y-auto font-mono text-xs bg-[var(--bg-root)] space-y-2">
                                <div v-if="currentStock">
                                    <div v-if="alertState.triggered" class="mb-2 p-2 rounded border font-bold animate-pulse bg-red-900/50 border-red-500 text-red-400">⚠️ {{ alertState.message }}</div>
                                    
                                    <div class="text-[11px] leading-relaxed">
                                        <div class="text-[var(--text-sub)] mb-1 opacity-70">=== 周期: {{periodName}} 策略分析 ===</div>
                                        <div v-html="currentStock.logContent || '等待数据...'"></div>
                                    </div>
                                </div>
                                <div v-else class="text-[var(--text-sub)] h-full flex items-center justify-center opacity-50">等待指令...</div>
                            </div>
                        </div>

                        <!-- 2. 资讯 -->
                        <div class="flex-1 flex flex-col border-r border-[var(--border-color)] min-w-[180px] bg-[#161a25]">
                            <div class="px-3 py-2 border-b border-[var(--border-color)] bg-[var(--bg-root)] flex justify-between items-center">
                                <span class="text-xs text-[var(--text-sub)] font-mono">NEWS FEED</span>
                                <span v-if="newsLoading" class="text-[9px] text-blue-400 animate-pulse">更新中...</span>
                            </div>
                            <div class="flex-1 overflow-y-auto p-2 bg-[var(--bg-panel)]">
                                <div v-if="newsList.length > 0">
                                    <a v-for="(news, idx) in newsList" :key="idx" :href="news.link" target="_blank" class="news-link">
                                        <span class="news-title">{{ news.title }}</span>
                                        <span class="news-meta">{{ news.time }}</span>
                                    </a>
                                </div>
                                <div v-else class="text-center text-[var(--text-sub)] text-xs mt-4">{{ newsLoading ? '正在加载RSS...' : '暂无资讯' }}</div>
                            </div>
                        </div>

                        <!-- 3. SOP -->
                        <div class="w-48 bg-[var(--bg-panel)] border-r border-[var(--border-color)] p-2 flex flex-col flex-none overflow-y-auto">
                            <div class="font-bold text-[9px] text-[var(--text-sub)] mb-2 border-b border-[var(--border-color)] pb-1">SOP: {{currentStrategy}}</div>
                            <div class="space-y-2">
                                <div v-if="currentStrategy==='Holo'">
                                     <div class="sop-row"><div class="sop-icon text-resonance">共振</div><div class="sop-desc"><strong>现象:</strong> W底结构+资金共振<br><strong>操作:</strong> 确认支撑，重仓介入</div></div>
                                     <div class="sop-row"><div class="sop-icon text-super">爆点</div><div class="sop-desc"><strong>现象:</strong> 底背离+倍量确认<br><strong>操作:</strong> 右侧反转，激进追涨</div></div>
                                     <div class="sop-row"><div class="sop-icon text-up">买入</div><div class="sop-desc"><strong>现象:</strong> 机构吸筹结束<br><strong>操作:</strong> 分批建仓，防守下轨</div></div>
                                     <div class="sop-row"><div class="sop-icon text-blue-signal">持仓</div><div class="sop-desc"><strong>现象:</strong> 价格站稳蓝线上轨<br><strong>操作:</strong> 坚定持有，不破不走</div></div>
                                </div>
                                <div v-if="currentStrategy==='CRT'">
                                     <div class="sop-row"><div class="sop-icon text-down">空Trap</div><div class="sop-desc"><strong>现象:</strong> 假突破前高+RSI超买<br><strong>操作:</strong> 阴线确认后反手做空</div></div>
                                     <div class="sop-row"><div class="sop-icon text-up">多Trap</div><div class="sop-desc"><strong>现象:</strong> 假跌破前低+RSI超卖<br><strong>操作:</strong> 阳线确认后反手做多</div></div>
                                </div>
                                <div v-if="currentStrategy==='Envelope'">
                                     <div class="sop-row"><div class="sop-icon text-up">回归买</div><div class="sop-desc"><strong>现象:</strong> 跌破下轨+RSI<30<br><strong>操作:</strong> 左侧抄底，目标中轨</div></div>
                                     <div class="sop-row"><div class="sop-icon text-down">回归卖</div><div class="sop-desc"><strong>现象:</strong> 突破上轨+RSI>70<br><strong>操作:</strong> 乖离过大，止盈离场</div></div>
                                </div>
                                <div v-if="currentStrategy==='T3'">
                                     <div class="sop-row"><div class="sop-icon text-up">趋势多</div><div class="sop-desc"><strong>现象:</strong> 站上T3均线+MACD红<br><strong>操作:</strong> 顺势做多，均线防守</div></div>
                                     <div class="sop-row"><div class="sop-icon text-down">趋势空</div><div class="sop-desc"><strong>现象:</strong> 跌破T3均线+MACD绿<br><strong>操作:</strong> 顺势做空，反弹即卖</div></div>
                                </div>
                            </div>
                        </div>

                        <!-- 4. 资产管理 -->
                        <div class="w-[280px] flex flex-col bg-[var(--bg-panel)] flex-none">
                            <div class="flex border-b border-[var(--border-color)] bg-[var(--bg-root)]">
                                <div :class="['tab-btn', activeRightTab==='sim'?'active':'']" @click="activeRightTab='sim'">模拟(Sim)</div>
                                <div :class="['tab-btn', activeRightTab==='asset'?'active':'']" @click="activeRightTab='asset'">持仓(Assets)</div>
                            </div>
                            <div v-if="activeRightTab==='sim'" class="flex-1 p-2 flex flex-col gap-2 overflow-y-auto" :class="{'alert-tp': alertState.type==='TP', 'alert-sl': alertState.type==='SL'}">
                                <div class="grid grid-cols-2 gap-x-2 gap-y-3">
                                    <div><label class="trade-label">成本</label><input v-model.number="trade.entry" @input="updateTrade" type="number" class="input-dark text-blue-400" step="0.01"></div>
                                    <div><label class="trade-label">股数</label><input v-model.number="trade.qty" @input="updateTrade" type="number" class="input-dark"></div>
                                    <div><label class="trade-label text-green-500">止盈</label><input v-model.number="trade.tp" @input="updateTrade" type="number" class="input-dark text-up border-green-500/30" step="0.01"></div>
                                    <div><label class="trade-label text-red-500">止损</label><input v-model.number="trade.sl" @input="updateTrade" type="number" class="input-dark text-down border-red-500/30" step="0.01"></div>
                                </div>
                                <button @click="addToPortfolio" class="btn btn-blue w-full mt-auto mb-1">加入持仓组合</button>
                            </div>
                            <div v-if="activeRightTab==='asset'" class="flex-1 p-2 overflow-y-auto">
                                <div v-if="portfolio.length === 0" class="text-center text-xs text-[var(--text-sub)] mt-4">暂无持仓</div>
                                <div v-else>
                                    <div class="asset-row asset-header"><div>代码</div><div>盈亏%</div><div>市值</div><div>占比</div><div></div></div>
                                    <div v-for="(p, idx) in portfolio" :key="idx" class="asset-row">
                                        <div>
                                            <div class="font-bold">{{p.symbol}}</div>
                                            <div class="text-[8px] text-[var(--text-sub)]">成本: {{p.avgCost.toFixed(2)}}</div>
                                        </div>
                                        <div :class="parseFloat(p.plPercent) >= 0 ? 'text-up' : 'text-down'">{{p.plPercent}}%</div>
                                        <div>{{p.marketVal.toFixed(0)}}</div>
                                        <div>{{p.weight}}%</div>
                                        <div><button @click="removeFromPortfolio(idx)" class="text-red-500 text-xs">×</button></div>
                                    </div>
                                    <div class="mt-2 pt-2 border-t border-[var(--border-color)] text-xs">
                                        <div class="flex justify-between"><span>总市值:</span><span class="font-bold">{{totalAssetValue.toFixed(0)}}</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div v-for="notification in notifications" :key="notification.id" 
                 :class="['notification', notification.type]">
                {{ notification.message }}
            </div>
        </div>
    `
};
