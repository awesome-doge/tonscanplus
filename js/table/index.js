const url = "https://raw.githubusercontent.com/menschee/tonscanplus/main/data.json"

// fetch(url).then((response) => response.text()).then( text => {
//     let json = JSON.parse(text.replace(/,[\n\s]+}/gm, "\n}"))
//     Object.keys(json).map(key => {
//         addRow(json, key)
//     })
// })
function loadGithub(){
    const url = "https://raw.githubusercontent.com/menschee/tonscanplus/main/data.json"

    fetch(url).then((response) => response.text()).then( text => {
        const json = JSON.parse(text.replace(/,[\n\s]+}/gm, "\n}"))
        Object.keys(json).forEach(async key => {
            const currentAddress = await chrome.storage.local.get(key);
            if(Object.keys(currentAddress).length === 0) {
                const data = {}
                data[key] = {name: json[key], type: "github"}
                chrome.storage.local.set(data);
            }
        })
    })
}

async function saveData(e){
    const text = $("#select")
    const input = $("#selected_input")
    const currentValue = input.val()
    const data = {}
    if(text.data().address !== undefined){
        const dataStorage = await chrome.storage.local.get(text.data().address)
        if(currentValue.trim() === "") {
            chrome.storage.local.remove(text.data().address);
        }

        data[text.data().address] = {}
        data[text.data().address].name = currentValue
        data[text.data().address].type = dataStorage[text.data().address].type
    } else if(text.data().name !== undefined ) {
        const dataStorage = await chrome.storage.local.get(text.text())
        if(currentValue.trim() === "") {
            chrome.storage.local.remove(text.text());
        }
        else{
            data[currentValue] = {}
            data[currentValue].name = text.data().name
            data[currentValue].type = dataStorage[text.text()].type
            chrome.storage.local.remove(text.text());
        }
       
    }
    chrome.storage.local.set(data);
    input.remove()
    $(e.target).remove()
    $("#select").css("display", "").attr("id", "")
    getJson()
}

function editTd(e){
    if($("#ton-addr__users tbody input").length === 0){
        const currentElement = $(e.target)
        const button = $("<button>ok</button>")
        const input = $(`<input id="selected_input" type="text" value="${currentElement.text()}" style="width: 80%">`)
        
        button.click(saveData)

        currentElement.parent().append(input)
        currentElement.parent().append(button)
        
        currentElement.attr("id", "select")
        currentElement.css("display", "none")
    }
}

async function createTd({
    dataSetName="address",
    dataSetValue="",
    style={},
    data, 
    click=editTd
} = {}){

    const newTd =  $("<td></td>")
    const newDiv =  $(`<div data-${ dataSetName }="${ dataSetValue }">${ data }</div>`)

    newTd.css({ textAlign: "center"})
    newDiv.css(style)
    newTd.append(newDiv)
    newTd.children().click(click)

    return newTd
}

async function addRow(json, key){
    const newRow = $("<tr></tr>")
    const element = $("#ton-addr__users tbody")

    newRow.append(await createTd({ dataSetValue: key, data: json[key].name , style: { "min-width": "50px", "min-height": "20px" } }))
    newRow.append(await createTd({ dataSetName:"name", dataSetValue: json[key].name, data: key }))
    newRow.append(await createTd({ dataSetName:"name", dataSetValue: key.name, data: json[key].type, click: ()=>""}))

    element.append(newRow)
}

async function getJson(){
    const address = await chrome.storage.local.get(null)
    const element = $("#ton-addr__users tbody tr")
    element.remove()
    
    let filtered = Object.keys(address).filter( f => f !== "state")
    if(Object.keys(filtered).length === 0) { 
        await loadGithub() 
        await getJson()
    }

    filteredLocal = filtered.filter( addr => address[addr].type === "local" )
    filteredGithub = filtered.filter( addr => address[addr].type === "github" )
    
    filteredLocal.forEach( async key => await addRow(address, key) )
    filteredGithub.forEach( async key => await addRow(address, key) )
}
getJson()

let addresses = [];
const ITEMS_PER_PAGE = 10;
let currentPage = 1;
let selectedItems = new Set();

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
    await loadAddresses();
    setupEventListeners();
});

// 載入地址
async function loadAddresses() {
    const storage = await browser.storage.local.get(null);
    addresses = Object.entries(storage)
        .filter(([key, value]) => value.type !== undefined)
        .map(([address, data]) => ({
            address,
            name: data.name,
            type: data.type
        }))
        .sort((a, b) => {
            // 首先按類型排序（local 優先）
            if (a.type === 'local' && b.type !== 'local') return -1;
            if (a.type !== 'local' && b.type === 'local') return 1;
            
            // 如果類型相同，則按名稱字母順序排序
            const nameA = a.name.toLowerCase();
            const nameB = b.name.toLowerCase();
            
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;
            
            // 如果名稱相同，則按地址排序
            const addressA = a.address.toLowerCase();
            const addressB = b.address.toLowerCase();
            
            return addressA.localeCompare(addressB);
        });
    
    renderTable();
}

// 設置事件監聽器
function setupEventListeners() {
    // 搜索功能
    document.getElementById('searchInput').addEventListener('input', (e) => {
        currentPage = 1;
        renderTable(e.target.value);
    });

    // 全選功能
    document.getElementById('selectAll').addEventListener('change', (e) => {
        const checkboxes = document.querySelectorAll('tbody input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = e.target.checked;
            const addressId = checkbox.getAttribute('data-address');
            if (e.target.checked) {
                selectedItems.add(addressId);
            } else {
                selectedItems.delete(addressId);
            }
        });
        updateBulkActionButtons();
    });

    // 批量刪除
    document.getElementById('deleteSelected').addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete the selected addresses?')) {
            for (const address of selectedItems) {
                await browser.storage.local.remove(address);
            }
            selectedItems.clear();
            await loadAddresses();
            updateBulkActionButtons();
        }
    });

    // 批量導出
    document.getElementById('exportSelected').addEventListener('click', () => {
        const selectedAddresses = addresses.filter(addr => 
            selectedItems.has(addr.address)
        );
        
        const blob = new Blob(
            [JSON.stringify(selectedAddresses, null, 2)], 
            { type: 'application/json' }
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ton_addresses.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // 匯入地址
    document.getElementById('importAddresses').addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const importedAddresses = JSON.parse(text);

                if (!Array.isArray(importedAddresses)) {
                    throw new Error('無效的檔案格式');
                }

                const importData = {};
                for (const addr of importedAddresses) {
                    if (!addr.address || !addr.name) {
                        throw new Error('地址資料格式不正確');
                    }
                    importData[addr.address] = {
                        name: addr.name,
                        type: addr.type || 'local'
                    };
                }

                await browser.storage.local.set(importData);
                await loadAddresses();
                alert('匯入成功！');
            } catch (error) {
                alert('匯入失敗：' + error.message);
            }
        };
        input.click();
    });

    // 新增地址
    document.getElementById('saveAddress').addEventListener('click', async () => {
        const name = document.getElementById('nameInput').value;
        const address = document.getElementById('addressInput').value;
        const type = document.getElementById('typeInput').value;

        if (!name || !address) {
            alert('Please fill in all required fields');
            return;
        }

        await browser.storage.local.set({
            [address]: { name, type }
        });

        document.getElementById('addAddressForm').reset();
        bootstrap.Modal.getInstance(document.getElementById('addAddressModal')).hide();
        await loadAddresses();
    });
}

// 渲染表格
function renderTable(searchTerm = '') {
    const tbody = document.getElementById('addressTableBody');
    tbody.innerHTML = '';

    let filteredAddresses = addresses;
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredAddresses = addresses.filter(addr => 
            addr.name.toLowerCase().includes(term) || 
            addr.address.toLowerCase().includes(term)
        );
    }

    filteredAddresses.forEach(addr => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="checkbox-wrapper">
                    <input type="checkbox" data-address="${addr.address}" 
                           ${selectedItems.has(addr.address) ? 'checked' : ''}>
                </div>
            </td>
            <td class="editable" data-field="name" data-address="${addr.address}">${addr.name}</td>
            <td>${addr.address}</td>
            <td>${getTypeLabel(addr.type)}</td>
            <td>
                <button class="btn btn-action delete-btn" data-address="${addr.address}">
                    <i class='bx bx-trash'></i>
                </button>
            </td>
        `;

        // 添加事件監聽器
        tr.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
            if (e.target.checked) {
                selectedItems.add(addr.address);
            } else {
                selectedItems.delete(addr.address);
            }
            updateBulkActionButtons();
        });

        // 添加直接編輯功能
        const nameCell = tr.querySelector('.editable');
        nameCell.addEventListener('click', () => {
            const currentName = nameCell.textContent;
            const input = document.createElement('input');
            input.type = 'text';
            input.value = currentName;
            input.className = 'form-control';
            input.style.width = '100%';
            input.style.padding = '4px 8px';
            input.style.backgroundColor = '#333';
            input.style.border = '1px solid var(--border-color)';
            input.style.color = 'var(--text-color)';
            input.style.borderRadius = '4px';

            const saveEdit = async () => {
                const newName = input.value.trim();
                if (newName && newName !== currentName) {
                    await browser.storage.local.set({
                        [addr.address]: { 
                            name: newName, 
                            type: addr.type 
                        }
                    });
                    nameCell.textContent = newName;
                    await loadAddresses(); // 重新載入以更新排序
                }
                nameCell.style.display = '';
                input.remove();
            };

            input.addEventListener('blur', saveEdit);
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    saveEdit();
                }
            });

            nameCell.style.display = 'none';
            nameCell.parentNode.insertBefore(input, nameCell);
            input.focus();
        });

        tr.querySelector('.delete-btn').addEventListener('click', async () => {
            if (confirm('確定要刪除這個地址嗎？')) {
                await browser.storage.local.remove(addr.address);
                await loadAddresses();
            }
        });

        tbody.appendChild(tr);
    });

    updateBulkActionButtons();
}

// 獲取類型標籤
function getTypeLabel(type) {
    const types = {
        'personal': 'Personal',
        'business': 'Business',
        'other': 'Other'
    };
    return types[type] || type;
}

// 編輯地址
async function editAddress(addr) {
    const newName = prompt('Enter new name:', addr.name);
    if (newName && newName !== addr.name) {
        await browser.storage.local.set({
            [addr.address]: { 
                name: newName, 
                type: addr.type 
            }
        });
        await loadAddresses();
    }
}

// 更新批量操作按鈕狀態
function updateBulkActionButtons() {
    const hasSelection = selectedItems.size > 0;
    document.getElementById('deleteSelected').disabled = !hasSelection;
    document.getElementById('exportSelected').disabled = !hasSelection;
}