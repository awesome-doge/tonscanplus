const url = "https://raw.githubusercontent.com/menschee/tonscanplus/main/data.json"

// 添加緩存機制
const CACHE_KEY = 'tonscan_data_cache';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24小時的緩存

async function loadData() {
    // 檢查緩存
    const cachedData = await browser.storage.local.get(CACHE_KEY);
    if (cachedData[CACHE_KEY] && 
        cachedData[CACHE_KEY].timestamp && 
        (Date.now() - cachedData[CACHE_KEY].timestamp < CACHE_EXPIRY)) {
        return cachedData[CACHE_KEY].data;
    }

    // 如果沒有緩存或緩存過期，從服務器獲取數據
    try {
        const response = await fetch(url);
        const text = await response.text();
        const json = JSON.parse(text.replace(/,[\n\s]+}/gm, "\n}").replace(/\n\s+\n/gm, ',').replaceAll(/,+/gm, ','));
        
        // 更新緩存
        await browser.storage.local.set({
            [CACHE_KEY]: {
                data: json,
                timestamp: Date.now()
            }
        });
        
        return json;
    } catch (error) {
        console.error('Error loading data:', error);
        return {};
    }
}

// 使用新的加載機制
loadData().then(json => {
    Object.keys(json).forEach(async key => {
        const currentAddress = await browser.storage.local.get(key);
        if(Object.keys(currentAddress).length === 0) {
            const data = {}
            data[key] = {name: json[key], type: "github"}
            browser.storage.local.set(data);
        }
    });
});
