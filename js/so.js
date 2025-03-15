let src
let elementsSortNormal
let elementsSort
let newPage
let intervalIds
let customElements
let customEvents

function init(){
    src = browser.runtime.getURL("config.js");
    elementsSortNormal = []
    elementsSort = []
    newPage = false
    intervalIds = []
    customElements = new Set()
    customEvents = []
}

function fire(){
    import(src).then(({ deepCopyConfig }) => {
        const config = deepCopyConfig()
        const objColors = {
            green: { back: config.green, text: config.greenLight},
            red: { back: config.red, text: config.redLight },
            gray: { back: config.gray, text: config.white }
        }

        // 一次性設置樣式
        const styleForCustomName = document.createElement('style')
        customElements.add(styleForCustomName)
        styleForCustomName.classList.add('custom__style__for__custom_name')
        styleForCustomName.innerHTML = ` .custom__name:before { color: ${config.yellow}; }`
        document.querySelector('.tx-history-wrap')?.prepend(styleForCustomName)

        // 使用 MutationObserver 替代輪詢
        const observer = new MutationObserver((mutations) => {
            browser.storage.local.get(['state']).then(storage => {
                if (storage.state !== "on") return;
                
                const elements = document.querySelectorAll("[data-loopa]:not(.processed)");
                if (elements.length === 0) return;

                const addresses = Array.from(elements).map(element => 
                    element.dataset.loopa + element.dataset.poopa
                );

                // 標記已處理的元素
                elements.forEach(el => el.classList.add('processed'));

                browser.storage.local.get(addresses).then(storageData => {
                    elements.forEach(element => {
                        const tonAddress = element.dataset.loopa + element.dataset.poopa;
                        const current = storageData[tonAddress];
                        if(current !== undefined){
                            element.classList.add('custom__name')
                            element.dataset.loopa = current.name
                            element.dataset.poopa = `(${replacer(tonAddress)})`
                        }
                    });
                });
            });
        });

        // 觀察 DOM 變化
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        customElements.add({ remove: () => observer.disconnect() });

        const ALL = () =>{ 
            console.debug('create ALL')
            const ALL = new Action(objColors.gray, "ALL")
            ALL.setNext(new Action(objColors.red, "OUT"))
            .setNext(new Action(objColors.green, "IN"))
            .setNext(ALL)
            return ALL
        }

        let current = ALL()
        const action = function () { 
            console.debug('action')
            if (!newPage) current = current.next;
            const style = document.querySelector(".custom__css")
            if(style === null) {
                const styleElement = document.createElement("style")
                customElements.add(styleElement)
                styleElement.className = "custom__css"
                styleElement.innerHTML = ` .custom__parent__${current.text === "OUT" ? 'in': 'out'} { display: none }`
                document.querySelector('head').appendChild(styleElement)
            } else{
                if (current.text === "ALL"){ document.querySelector(".custom__css").remove() } 
                else { style.innerHTML = `.custom__parent__${current.text === "OUT" ? 'in': 'out'} { display: none } ` }
            }
            setButton()
        }

        function setButton({ object=current } = {}){
            console.debug('setButton')
            browser.storage.local.get('state', ({ state }) => {
                if(state !== 'on') return;

                document.querySelector(".tx-history-wrap thead th:nth-child(4)").innerHTML = `
                    <button id="custom__button" class="tx-table__badge" style="background: ${object.color.back}; color: ${object.color.text}">${object.text}</button>
                `
                custom__button.onclick = action
                customElements.add(custom__button)
            })
        }

        function createBtnSort({ defaultDirection = config.direction } = {}){
            console.debug('createBtnSort')
            browser.storage.local.get('state', ({ state }) => {
                if(state !== 'on') return;
                
                const genBtnSort = {}

                const custom__sort__arrow = document.querySelector(".custom__sort__arrow")
                custom__sort__arrow !== null && custom__sort__arrow.remove();

                genBtnSort[config.so.enum.UP] =  {
                    element: function(withContainer=true){ 
                        const container = createContainer()
                        const element = createElementBtnSort({ color: config.grayLight, transform:"rotate(-180deg)" })

                        container.appendChild(element)

                        return withContainer ? container : element
                    },
                    next: config.so.enum.DOWN
                }

                genBtnSort[config.so.enum.DOWN] = {
                    element: function(withContainer=true){ 
                        const container = createContainer()
                        const element = createElementBtnSort({ color: config.grayLight, transform: "rotate(0)", mt: withContainer && "13px" })

                        container.appendChild(element)

                        return withContainer ? container : element
                    },
                    next: config.so.enum.ALL
                }

                genBtnSort[config.so.enum.ALL] =  {
                    element: function(){ 
                        const container = createContainer()
                        container.appendChild(genBtnSort[config.so.enum.UP].element(false))
                        container.appendChild(genBtnSort[config.so.enum.DOWN].element(false))

                        return container
                    },
                    next: config.so.enum.UP
                }
                
                const btnSort = genBtnSort[defaultDirection].element()

                document.querySelector('th:nth-child(6)').style.display = 'flex'
                document.querySelector('th:nth-child(6)').appendChild(btnSort)

                btnSort.onclick = function(){ 
                    config.direction = genBtnSort[defaultDirection].next
                    createBtnSort()
                    sorting()
                }
                customElements.add(btnSort)
            })
        }

        function sorting(){
            console.debug('sorting')
            browser.storage.local.get('state', ({ state }) => {
                if(state !== 'on') return;

                if(config.direction !== config.so.enum.ALL){
                    elementsSort.sort((a, b)=> {
                                if(config.direction === config.so.enum.UP) return parseFloat(a.dataset.value)-parseFloat(b.dataset.value) 
                                else return parseFloat(b.dataset.value)-parseFloat(a.dataset.value)
                            }).forEach(currentNode => {
                                currentNode && currentNode.parentNode && currentNode.parentNode.appendChild(currentNode)
                            })
                } else {
                    elementsSortNormal.forEach(currentNode => {
                        currentNode && currentNode.parentNode && currentNode.parentNode.appendChild(currentNode)
                    })
                }
            })
        }

        function loadAllData(){
            console.debug('loadAllData')
            browser.storage.local.get('state').then(({ state }) => {
                if(state !== 'on') return;

                // 首次加載：立即點擊加載按鈕
                const loadMoreButton = document.querySelector('.mugen-scroll__button');
                if (!loadMoreButton) return;

                // 立即執行一次加載
                const initialLoad = () => {
                    loadMoreButton.click();
                    setButton();
                    createBtnSort();
                };
                initialLoad();

                // 設置觀察者用於後續的滾動加載
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            loadMoreButton.click();
                        }
                    });
                }, { threshold: 0.5 });

                observer.observe(loadMoreButton);
                customElements.add({ remove: () => observer.disconnect() });

                // 減少輪詢間隔
                const intId2 = setInterval(addActionFromClickAddress, 1000);
                const intId3 = setInterval(classAdd, 2000);
                intervalIds.push(intId2, intId3);
            });
        }

        // 立即執行初始化
        loadAllData();
        
        // 同時保留頁面加載完成後的初始化
        window.addEventListener('load', () => {
            setTimeout(loadAllData, 500);
        });

        addEvent('custom__event__need_sort', sorting);
    })
}

function addEvent(name, callback){
    window.addEventListener(name, callback)
    customEvents.push({ name, callback })
}

function removeEvent({ name, callback, all=false }={}){
    if(all){
        customEvents.forEach(customEvent => window.removeEventListener(customEvent.name, customEvent.callback))
        customEvents.length = 0
    } else {
        window.removeEventListener(name, callback)
    }
}

class Action{
    constructor(color,text,next){
        console.debug('Action init')
        this.color = color
        this.text = text
        this.next = next
    }
    setNext(e){
        this.next = e
        return e
    }
}

function classAdd(){
    browser.storage.local.get('state').then(({ state }) => {
        if(state !== 'on') return;
        
        const newElements = document.querySelectorAll(`tbody tr:not(.custom__row)`);
        if(newElements.length === 0) return;

        const batchOperations = [];
        newElements.forEach(e => {
            e.classList.add("custom__row");
            const elOut = e.querySelector('.tx-table__badge--out');
            const elIn = e.querySelector('.tx-table__badge--in');

            if (elOut) e.classList.add('custom__parent__out');
            else if (elIn) e.classList.add('custom__parent__in');

            if (e.parentNode) {
                const value = calculateValue(e);
                if (value !== null) {
                    e.parentNode.dataset.value = value;
                    if (!elementsSortNormal.includes(e.parentNode)) {
                        elementsSortNormal.push(e.parentNode);
                    }
                    if (!elementsSort.includes(e.parentNode)) {
                        elementsSort.push(e.parentNode);
                    }
                }
            }
        });

        if (newElements.length > 0) {
            window.dispatchEvent(new Event("custom__event__need_sort"));
        }
    });
}

function calculateValue(row) {
    try {
        const valueText = row.querySelector('td:nth-child(6) div')?.innerText;
        if (!valueText) return null;

        const isEnglish = navigator.language === 'en';
        const cleanText = valueText.replaceAll(/\s|TON/gi, '');
        
        if (isEnglish) {
            const parts = cleanText.split('.');
            return parts.length > 1 ? parseFloat(parts.join('.')) : parseInt(parts[0]);
        } else {
            const parts = cleanText.split(',');
            return parts.length > 1 ? parseFloat(parts.join('.')) : parseInt(parts[0]);
        }
    } catch {
        return null;
    }
}

function addActionFromClickAddress(){
    try{
        browser.storage.local.get('state', ({ state }) => {
            if(state !== 'on') return;
            const elements = document.querySelectorAll(".address-link.clickable:not(.custom__click)")
            elements.forEach(e => {
                e.classList.add('custom__click')
                e.onclick = (e) => {
                    if(!e.ctrlKey && !e.shiftKey && !e.altKey){
                        clearApp()
                        init()
                        fire()
                    }
                }
            })
        })
    } catch {}
}

function replacer(text, size={max:10,start: 5,end: 5}){
    if(text.length > size.max){ return text.slice(0,size.start)+'...'+text.slice(text.length-size.end) }
    return text
}

function createElementBtnSort({
    color, 
    transform, 
    mt
}={}){
    console.debug('createElementBtnSort')
    const btnSort = document.createElement("div")
    customElements.add(btnSort)
    btnSort.style.width=0
    btnSort.style.height=0
    btnSort.style.fontSize=0
    btnSort.style.lineHeight=0
    btnSort.style.float="left"
    btnSort.style.borderLeft="10px solid transparent"
    btnSort.style.borderRight="10px solid transparent"
    btnSort.style.borderTop="10px solid " + color
    btnSort.style.marginTop=mt === undefined || !mt ? "4px": mt
    btnSort.style.transform=transform
    return btnSort
}

function createContainer(className="custom__sort__arrow"){
    console.debug('createContainer')
    const container = document.createElement('div')
    customElements.add(container)
    container.className = className
    container.style.width = '20px'
    container.style.height = '25px'
    return container
}

function throttle(call, timeout) {
    let timer = null

    return function perform(...args) {
        if (timer) return

        timer = setTimeout(() => {
            call(...args)

            clearTimeout(timer)
            timer = null
        }, timeout)
    }
}

function clearApp(){
    removeEvent({ all: true })
    intervalIds.forEach(intId => clearInterval(intId) )
    customElements.forEach(el => el && el.remove() )
}

init("First init")
fire()