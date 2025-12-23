/**
 * API请求工具
 * 包含数据获取、错误处理、重试机制
 */

// CORS代理列表
const PROXIES = [
    'https://api.allorigins.win/get?url=',
    'https://corsproxy.io/?'
];

/**
 * 延迟函数
 * @param {number} ms - 毫秒数
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 带重试的fetch请求
 * @param {string} url - 请求URL
 * @param {Object} options - fetch选项
 * @param {number} retries - 重试次数
 * @param {number} currentProxyIdx - 当前代理索引
 * @returns {Promise<any>} 响应数据
 */
export async function fetchWithRetry(url, options = {}, retries = 2, currentProxyIdx = 0) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        const proxy = PROXIES[currentProxyIdx];
        const proxyUrl = proxy.includes('allorigins')
            ? proxy + encodeURIComponent(url)
            : proxy + url;

        try {
            const response = await fetch(proxyUrl, {
                ...options,
                signal: AbortSignal.timeout(15000) // 15秒超时
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const json = await response.json();
            // allorigins返回格式特殊处理
            const payload = json.contents ? JSON.parse(json.contents) : json;
            
            return payload;
        } catch (error) {
            console.warn(`Fetch attempt ${attempt + 1} failed:`, error.message);
            
            // 切换代理
            currentProxyIdx = (currentProxyIdx + 1) % PROXIES.length;
            
            // 最后一次尝试失败则抛出错误
            if (attempt === retries) {
                throw new Error(`Failed after ${retries + 1} attempts: ${error.message}`);
            }
            
            // 指数退避
            await sleep(500 * (attempt + 1));
        }
    }
}

/**
 * 获取股票数据
 * @param {string} symbol - 股票代码
 * @param {string} interval - 时间间隔 (15m, 60m, 1d, 1wk)
 * @param {string} range - 时间范围 (60d, 730d, 2y, 5y)
 * @returns {Promise<Object>} {symbol, name, data}
 */
export async function fetchStockData(symbol, interval, range) {
    try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}`;
        const payload = await fetchWithRetry(url);

        if (!payload.chart || !payload.chart.result || !payload.chart.result[0]) {
            throw new Error('Invalid response format');
        }

        const result = payload.chart.result[0];
        const meta = result.meta || {};
        const name = meta.shortName || meta.symbol || symbol;

        // 验证数据
        if (!result.timestamp || !result.indicators || !result.indicators.quote) {
            throw new Error('Missing required data fields');
        }

        const quotes = result.indicators.quote[0];
        const cleanData = [];

        // 清洗数据
        for (let i = 0; i < result.timestamp.length; i++) {
            if (quotes.close[i] != null) {
                cleanData.push({
                    t: result.timestamp[i],
                    o: quotes.open[i],
                    h: quotes.high[i],
                    l: quotes.low[i],
                    c: quotes.close[i],
                    v: quotes.volume[i] || 0
                });
            }
        }

        if (cleanData.length < 50) {
            throw new Error(`Insufficient data: only ${cleanData.length} points`);
        }

        return { symbol, name, data: cleanData };
    } catch (error) {
        console.error(`Failed to fetch ${symbol}:`, error.message);
        return null;
    }
}

/**
 * 批量获取股票数据
 * @param {string[]} symbols - 股票代码数组
 * @param {string} interval - 时间间隔
 * @param {string} range - 时间范围
 * @param {Function} onProgress - 进度回调
 * @param {number} batchSize - 批次大小
 * @returns {Promise<Object[]>} 股票数据数组
 */
export async function fetchBatchStockData(symbols, interval, range, onProgress, batchSize = 2) {
    const results = [];
    
    for (let i = 0; i < symbols.length; i += batchSize) {
        // 更新进度
        if (onProgress) {
            onProgress(Math.min(i, symbols.length), symbols.length);
        }

        const chunk = symbols.slice(i, i + batchSize);
        const promises = chunk.map(sym => fetchStockData(sym, interval, range));
        const batchResults = await Promise.all(promises);

        // 过滤null结果
        results.push(...batchResults.filter(r => r !== null));

        // 批次间延迟，避免请求过快
        if (i + batchSize < symbols.length) {
            await sleep(200);
        }
    }

    if (onProgress) {
        onProgress(symbols.length, symbols.length);
    }

    return results;
}

/**
 * 获取RSS新闻
 * @param {string} symbol - 股票代码
 * @param {number} limit - 新闻数量限制
 * @returns {Promise<Array>} 新闻列表
 */
export async function fetchNews(symbol, limit = 6) {
    try {
        const ticker = symbol.replace(/\.(HK|SS|SZ)$/, '');
        const rssUrl = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${ticker}&region=US&lang=en-US`;
        const proxyUrl = PROXIES[0] + encodeURIComponent(rssUrl);

        const response = await fetch(proxyUrl);
        const data = await response.json();

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(data.contents, "text/xml");
        const items = xmlDoc.querySelectorAll("item");

        const news = [];
        items.forEach((item, index) => {
            if (index < limit) {
                const title = item.querySelector("title")?.textContent || '';
                const link = item.querySelector("link")?.textContent || '';
                const pubDate = item.querySelector("pubDate")?.textContent || '';
                
                if (title && link) {
                    news.push({
                        title,
                        link,
                        time: new Date(pubDate).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                        })
                    });
                }
            }
        });

        // 翻译标题
        const translated = await Promise.all(
            news.map(async (n) => {
                const zhTitle = await translateText(n.title);
                return { ...n, title: zhTitle };
            })
        );

        return translated;
    } catch (error) {
        console.error('Failed to fetch news:', error);
        return [];
    }
}

/**
 * 翻译文本 (使用Google翻译API)
 * @param {string} text - 待翻译文本
 * @returns {Promise<string>} 翻译后的文本
 */
export async function translateText(text) {
    if (!text) return "";

    try {
        const apiUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t&q=${encodeURIComponent(text)}`;
        const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(apiUrl);

        const response = await fetch(proxyUrl);
        const data = await response.json();

        return data[0][0][0];
    } catch (error) {
        console.warn('Translation failed:', error);
        return text; // 翻译失败返回原文
    }
}

/**
 * 重采样为4小时K线
 * @param {Array} data - 1小时K线数据
 * @returns {Array} 4小时K线数据
 */
export function resampleTo4H(data) {
    const result = [];
    for (let i = 0; i < data.length; i += 4) {
        const chunk = data.slice(i, i + 4);
        if (chunk.length === 0) continue;

        result.push({
            t: chunk[0].t,
            o: chunk[0].o,
            h: Math.max(...chunk.map(d => d.h)),
            l: Math.min(...chunk.map(d => d.l)),
            c: chunk[chunk.length - 1].c,
            v: chunk.reduce((sum, d) => sum + d.v, 0)
        });
    }
    return result;
}
