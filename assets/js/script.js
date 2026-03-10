const state = {
    // 面板切换状态
    currentXdPanelType: 'xd', // 'xd' 或 'xy'
    currentXynPanelType: 'xyn', // 'xyn' 或 'xdn'
    // 时间标签选中索引
    activeXdTabIndex: -1, // 记录当前选中的时间标签索引，-1=未初始化
    activeXynTabIndex: -1, // 记录当前选中的时间标签索引，-1=未初始化
    // 存储最新链接
    systemHrefs: {}
}

const panelStateConfigs = {
    xd: {
        tabsId: 'xd-tabs',
        panelId: 'xd-panel',
        switchBtnId: 'switchXdPanelBtn',
        copyBtnId: 'xdBtn',
        toastContainer: 'xd-toast',
        panelTypeKey: 'currentXdPanelType',
        activeIndexKey: 'activeXdTabIndex',
        typeA: 'xd',
        typeB: 'xy'
    },
    xyn: {
        tabsId: 'xyn-tabs',
        panelId: 'xyn-panel',
        switchBtnId: 'switchXynPanelBtn',
        copyBtnId: 'xynBtn',
        toastContainer: 'xyn-toast',
        panelTypeKey: 'currentXynPanelType',
        activeIndexKey: 'activeXynTabIndex',
        typeA: 'xyn',
        typeB: 'xdn'
    }
};


// 获取系统链接（只请求一次）
async function fetchSystemHrefs() {
    try {
        const resp = await fetch('/config/hyperlink.json');
        if (!resp.ok) throw new Error('接口请求失败');
        state.systemHrefs = await resp.json();
    } catch (err) {
        console.error('获取系统链接失败', err);
        state.systemHrefs = {};
    }
}

// 可复用的标签渲染函数（支持切换面板时更新）
function renderTabs({panelId, tabsId, activeIndexKey, timeBlocks}) {
    // 通过id获取时间标签容器
    const tabsContainer = document.getElementById(tabsId);
    if (!tabsContainer) return;
    // 清空旧内容
    tabsContainer.innerHTML = '';
    // 如果只有一个时间块，隐藏时间标签容器
    if (!timeBlocks || timeBlocks.length <= 1) {
        tabsContainer.style.display = 'none';
        return;
    }

    // 显示标签容器并渲染当前tab对应的折扣数据
    tabsContainer.style.display = '';
    timeBlocks.forEach((block, index) => {
        const tab = document.createElement('div');
        tab.className = 'rebate-tab';
        tab.textContent = block.time;
        tab.dataset.time = block.time;
        tab.addEventListener('click', () => {
            // 记录当前点击的索引
            state[activeIndexKey] = index;
            // 通过id获取当前面板的slide容器list（折扣数据面板）
            const rebateSlides = document.querySelectorAll(`#${panelId} .rebate-slide`);
            const rebateSlide = rebateSlides[index];
            if (rebateSlide) {
                const rebateContainer = document.querySelector(`#${panelId} .rebate-slides`);
                if (rebateContainer) {
                    rebateContainer.scrollTo({
                        left: rebateSlide.offsetLeft,
                        behavior: 'smooth'
                    });
                } else {
                    rebateSlide.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            }
            // 高亮显示点击的时间标签
            tabsContainer.querySelectorAll('.rebate-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
        });
        tabsContainer.appendChild(tab);
    });

    // 重新绑定滚动监听（先移除旧监听，避免重复）
    const rebateContainer = document.querySelector(`#${panelId} .rebate-slides`);
    if (!rebateContainer) return;
    // 移除旧监听
    if (rebateContainer._tabScrollHandler) {
        rebateContainer.removeEventListener(
            'scroll',
            rebateContainer._tabScrollHandler
        );
    }

    // 定义滚动监听函数并挂载在容器上
    rebateContainer._tabScrollHandler = (function () {
        let tOut;
        return () => {
            if (tOut) clearTimeout(tOut);
            tOut = setTimeout(() => {
                const slides = rebateContainer.querySelectorAll('.rebate-slide');
                if (!slides.length) return;
                const center = rebateContainer.scrollLeft + rebateContainer.clientWidth / 2;
                let bestIdx = 0;
                let bestDist = Infinity;
                slides.forEach((s, i) => {
                    const sCenter = s.offsetLeft + s.offsetWidth / 2;
                    const d = Math.abs(sCenter - center);
                    if (d < bestDist) {
                        bestDist = d;
                        bestIdx = i;
                    }
                });
                const tabs = tabsContainer.querySelectorAll('.rebate-tab');
                tabs.forEach(t => t.classList.remove('active'));
                if (tabs[bestIdx]) {
                    tabs[bestIdx].classList.add('active');
                    // 滚动时更新选中索引
                    state[activeIndexKey] = bestIdx;
                }
            }, 50);
        };
    })();

    // 绑定新的滚动监听
    rebateContainer.addEventListener(
        'scroll',
        rebateContainer._tabScrollHandler
    );

    // 默认选中时间块（首次选最后一个，切换后选记录的索引）
    setTimeout(() => {
        const tabs = tabsContainer.querySelectorAll('.rebate-tab');
        // 首次初始化：选最后一个并记录索引
        if (state[activeIndexKey] === -1) {
            state[activeIndexKey] = tabs.length - 1;
        }
        const targetTab = tabs[state[activeIndexKey]] || tabs[tabs.length - 1];
        if (targetTab) targetTab.click();
    }, 120);
}

function renderPanelHeader(panelId, switchId, btnId, titleText, links = [], stateKey, btnTexts) {
    const panel = document.getElementById(panelId);
    if (!panel) return;

    let header = panel.querySelector('.rebate-header');
    // 不存在 → 创建
    if (!header) {
        header = document.createElement('div');
        header.className = 'rebate-header';

        const title = document.createElement('h2');
        title.className = 'rebate-title';

        const titleSpan = document.createElement('span');
        titleSpan.className = 'panel-title-text';

        const switchContainer = document.createElement('div');
        switchContainer.className = 'switch-panel-container';
        switchContainer.id = switchId;
        const switchBtn = document.createElement('button');
        switchBtn.className = 'switch-btn';
        switchBtn.id = btnId;
        switchContainer.appendChild(switchBtn);

        title.appendChild(titleSpan);
        title.appendChild(switchContainer);
        header.appendChild(title);

        panel.insertBefore(header, panel.firstChild);
    }

    // 更新标题
    const title = header.querySelector('.rebate-title');
    const titleSpan = header.querySelector('.panel-title-text');
    const switchContainer = header.querySelector(`#${switchId}`);
    const switchBtn = header.querySelector(`#${btnId}`);

    titleSpan.textContent = titleText;

    // 删除旧链接
    title.querySelectorAll('a').forEach(a => a.remove());
    // 渲染新链接
    links.forEach(link => {
        const a = document.createElement('a');
        a.href = link.href;
        a.target = '_blank';
        a.textContent = link.text;
        title.insertBefore(a, switchContainer);
    });
    // 更新按钮文字
    if (btnTexts && stateKey) {
        switchBtn.textContent = state[stateKey] === btnTexts.a ? btnTexts.textA : btnTexts.textB;
    }
}

function initPanelSwitch({
                             panelId,
                             switchBtnId,
                             panelTypeKey,
                             tabsId,
                             activeIndexKey,
                             typeA,
                             typeB,
                             renderA,
                             renderB,
                             copyBtnId,
                             copyTexts
                         }) {
    const panel = document.getElementById(panelId);
    if (!panel) return;

    // 事件委托，避免重复绑定
    panel.addEventListener('click', (e) => {
        if (!e.target.matches(`#${switchBtnId}`)) return;
        const copyBtn = document.getElementById(copyBtnId);
        const slides = panel.querySelector('.rebate-slides');
        if (state[panelTypeKey] === typeA) {
            state[panelTypeKey] = typeB;
            slides.innerHTML = '';
            renderB();
            if (copyBtn && copyTexts) copyBtn.textContent = copyTexts.textB;
        } else {
            state[panelTypeKey] = typeA;
            slides.innerHTML = '';
            renderA();
            if (copyBtn && copyTexts) copyBtn.textContent = copyTexts.textA;
        }

        slides.scrollLeft = 0;
        // 根据记录的索引选中对应标签
        const tabsContainer = document.getElementById(tabsId);
        if (tabsContainer) {
            const tabs = tabsContainer.querySelectorAll('.rebate-tab');
            const targetIndex = state[activeIndexKey] >= 0 ? state[activeIndexKey] : tabs.length - 1;
            if (tabs[targetIndex]) tabs[targetIndex].click();
        }
    });
}

function renderCards({panelId, panelTypeKey, panelTypeValue, timeBlocks, groups, tooltips = {}}) {
    if (state[panelTypeKey] !== panelTypeValue) return;
    const panel = document.getElementById(panelId);
    const container = panel.querySelector('.rebate-slides');
    // 清空容器
    container.innerHTML = '';
    if (!timeBlocks || timeBlocks.length === 0) {
        container.innerHTML = '<p>暂无报价</p>';
        return;
    }

    // 存储每个渠道上一次的折扣值（方便调色）
    const lastDiscountByChannel = {};
    // ⭐ 新增
    const fragment = document.createDocumentFragment();
    // 渲染折扣slide
    timeBlocks.forEach((block, index) => {
        // {"普通": { channel: "普通", discount: 0.91 }, "加速": { channel: "加速", discount: 0.915 }, ... }
        const rateMap = Object.fromEntries(
            block.rates.map(i => [i.channel, i])
        );
        // 创建时间块面板
        const slide = document.createElement('div');
        slide.className = 'rebate-slide';
        slide.dataset.time = block.time;
        // 渠道分组进行渲染
        Object.values(groups).forEach(groupInfo => {
            const group = document.createElement('div');
            group.className = 'rebate-group';
            // 渠道标签
            const label = document.createElement('span');
            label.className = 'channel-label';
            label.textContent = groupInfo.label;
            group.appendChild(label);
            // 渠道列表
            const list = document.createElement('div');
            list.className = 'channel-list';
            // 渲染标签当中每个渠道（渠道列表）
            groupInfo.channels.forEach(channelName => {
                const item = rateMap[channelName];
                if (!item) {
                    lastDiscountByChannel[channelName] = undefined;
                    return;
                }
                // 颜色判定（默认黑色 涨价红色 降价绿色）
                let color = 'black';
                if (index > 0) {
                    const last = lastDiscountByChannel[channelName];
                    if (last !== undefined) {
                        if (item.discount > last) color = 'red';
                        else if (item.discount < last) color = 'green';
                    }
                }
                const row = document.createElement('div');
                row.className = 'channel-item';
                const name = document.createElement('span');
                name.className = 'channel-name';
                name.textContent = channelName;
                if (tooltips[channelName]) {
                    row.setAttribute('data-tooltip', tooltips[channelName]);
                }
                const dis = document.createElement('span');
                dis.className = 'channel-discount';
                dis.textContent = item.discount;
                dis.style.color = color;
                row.appendChild(name);
                row.appendChild(dis);
                list.appendChild(row);
                // 更新当前渠道的lastDiscount
                lastDiscountByChannel[channelName] = item.discount;
            });
            group.appendChild(list);
            slide.appendChild(group);
        });
        fragment.appendChild(slide);
    });
    container.appendChild(fragment);
}

async function initCopyButton({
                                  copyBtnId,
                                  panelTypeKey,
                                  panelTypeValue,
                                  templateData,
                                  apiType,
                                  profitParam,
                                  dateParam,
                                  toastContainer
                              }) {
    const copyBtn = document.getElementById(copyBtnId);
    if (!copyBtn) return;

    // 预请求接口文本
    let apiText = '';
    if (apiType) {
        const queryParams = new URLSearchParams();
        queryParams.set('type', apiType);
        if (profitParam) queryParams.set('profit', profitParam);
        if (dateParam) queryParams.set('date', dateParam);
        const apiUrl = `/api/jsCode?${queryParams.toString()}`;
        try {
            apiText = await fetch(apiUrl).then(r => r.text());
        } catch (err) {
            console.error('接口请求失败:', err);
        }
    }

    copyBtn.addEventListener('click', () => {
        const isTemplate = state[panelTypeKey] === panelTypeValue;
        const textToCopy = isTemplate ? templateData : apiText;
        if (!textToCopy) {
            showToast('无可用费率数据', true, toastContainer);
            return;
        }
        navigator.clipboard.writeText(textToCopy)
            .then(() => showToast(isTemplate ? '费率模板已复制到剪贴板' : '费率代码已复制到剪贴板', false, toastContainer))
            .catch(err => {
                showToast('复制失败，请手动复制', true, toastContainer);
                console.error('复制失败:', err);
            });
    });
}

// ========== 小刀 ==========
function renderXdCards(timeBlocks) {
    // 渠道太多，按组分好
    const groups = {
        qianbao: {
            label: '钱包整百',
            channels: ["渠道A", "渠道B", "渠道C", "渠道D", "渠道E", "渠道F", "渠道H（低价）", "Z1000"]
        },
        teshu: {
            label: '钱包特殊',
            channels: ["渠道TA", "渠道TB"]
        },
        weixin: {
            label: '微信点券',
            channels: ["渠道VA", "VB微信10起", "VC微信50", "VD100", "VE200"]
        }
    };

    renderPanelHeader(
        "xd-panel",
        "switchXdPanelContainer",
        "switchXdPanelBtn",
        "小刀",
        [
            {href: state.systemHrefs.xdWeb, text: "网页入口"},
            {href: state.systemHrefs.xdClient, text: state.systemHrefs.xdClient}
        ],
        "currentXdPanelType",
        {
            a: "xd",
            textA: "★ 切换为星悦",
            textB: "⭐ 切换为小刀"
        }
    );

    renderCards({
        panelId: "xd-panel",
        panelTypeKey: "currentXdPanelType",
        panelTypeValue: "xd",
        timeBlocks,
        groups,
        tooltips: {
            "渠道A": "100-2000整百",
            "渠道B": "100-2000整百",
            "渠道C": "100-2000整百",
            "渠道D": "100-2000整百",
            "渠道E": "100-2000整百",
            "渠道F": "100-2000整百",
            "渠道H（低价）": "100-2000整百",
            "Z1000": "固定1000的快速通道",
            "渠道TA": "328/348/648固定",
            "渠道TB": "328/348/648固定",
            "渠道VA": "100-2000整百",
            "VB微信10起": "10/20/30居多",
            "VC微信50": "50为主",
            "VD100": "100为主",
            "VE200": "100-2000整百"
        }
    });
}

// ========== 星悦 ==========
function renderXyCards(timeBlocks) {
    // 渠道太多，按组分好
    const groups = {
        qianbao: {
            label: '钱包整百',
            channels: ["普通", "加速", "超速", "极速", "秒拉", "钱包直拉"]
        },
        teshu: {
            label: '钱包特殊',
            channels: ["超怪", "怪额"]
        },
        weixin: {
            label: '微信点券',
            channels: ["微信速额", "微信点额", "微信小额", "微信固额", "微信通额"]
        },
        qb: {
            label: '微信Q币',
            channels: ["微信单端", "扫码通额", "扫码固额", "扫码小额"]
        }
    };

    renderPanelHeader(
        "xd-panel",
        "switchXdPanelContainer",
        "switchXdPanelBtn",
        "星悦",
        [
            {href: state.systemHrefs.xyWeb, text: "网页入口"}
        ],
        "currentXdPanelType",
        {
            a: "xd",
            textA: "★ 切换为星悦",
            textB: "⭐ 切换为小刀"
        }
    );

    renderCards({
        panelId: "xd-panel",
        panelTypeKey: "currentXdPanelType",
        panelTypeValue: "xy",
        timeBlocks,
        groups
    });
}

// ========== 新的星悦 ==========
function renderXynCards(timeBlocks) {
    // 渠道太多，按组分好
    const groups = {
        zidong: {
            label: '自动点券',
            channels: ["微信通额", "微信速额", "微信固额", "微信小额", "微信点额", "钱包直拉"]
        },
        qb: {
            label: '微信Q币',
            channels: ["微信单端", "扫码通额", "扫码固额", "扫码小额"]
        },
        tuoguan: {
            label: '钱包托管',
            channels: ["普通", "加速", "超速", "极速", "秒拉", "超怪", "怪额"]
        }
    };

    renderPanelHeader(
        "xyn-panel",
        "switchXynPanelContainer",
        "switchXynPanelBtn",
        "新星悦",
        [
            {href: state.systemHrefs.xyWeb, text: "网页入口"},
            {href: state.systemHrefs.xyClient, text: "Win版客户端"},
            {href: state.systemHrefs.xyChajian, text: "产码插件"},
            {href: state.systemHrefs.xyZhuabao, text: "抓包工具"}
        ],
        "currentXynPanelType",
        {
            a: "xyn",
            textA: "★ 切换为新小刀",
            textB: "⭐ 切换为新星悦"
        }
    );

    renderCards({
        panelId: "xyn-panel",
        panelTypeKey: "currentXynPanelType",
        panelTypeValue: "xyn",
        timeBlocks,
        groups,
        tooltips: {
            "微信点额": "10-99随机",
            "微信小额": "30-99随机",
            "微信固额": "30/50/100固定",
            "微信通额": "100-1000整百",
            "微信速额": "200-1000整百",
            "钱包直拉": "100-2000整百",
            "微信单端": "只能挂Q币的通道",
            "扫码通额": "可以挂点券以及Q币"
        }
    });
}

// ========== 新的小刀 ==========
function renderXdnCards(timeBlocks) {
    // 渠道太多，按组分好
    const groups = {
        qianbao: {
            label: '钱包点券',
            channels: ["钱包普通", "钱包加速", "钱包超速", "钱包极速", "钱包直拉", "钱包秒拉", "钱包低价", "钱包超怪", "钱包怪额"]
        },
        weixin: {
            label: '微信点券',
            channels: ["微信通额", "微信大额", "微信速额", "微信固额", "微信小额", "微信点额"]
        }
    };

    renderPanelHeader(
        "xyn-panel",
        "switchXynPanelContainer",
        "switchXynPanelBtn",
        "新小刀",
        [
            {href: state.systemHrefs.xdnWeb, text: "网页入口"},
            {href: state.systemHrefs.xdnClient, text: state.systemHrefs.xdnClient}
        ],
        "currentXynPanelType",
        {
            a: "xyn",
            textA: "★ 切换为新小刀",
            textB: "⭐ 切换为新星悦"
        }
    );

    renderCards({
        panelId: "xyn-panel",
        panelTypeKey: "currentXynPanelType",
        panelTypeValue: "xdn",
        timeBlocks,
        groups
    });
}

// ========== GBO ==========
function renderGbo(gbo) {
    const container = document.getElementById('gboChannelList');
    container.innerHTML = '';
    // 校验数据是否存在
    if (!gbo || typeof gbo !== 'object' || Object.keys(gbo).length === 0) {
        container.innerHTML = '<p>暂无报价</p>';
        return;
    }
    const channels = Object.keys(gbo);
    // 渲染每个渠道项
    channels.forEach(channel => {
        const {price, paths} = gbo[channel];
        const channelItem = document.createElement('div');
        channelItem.className = 'channel-item';
        // 悬停提示使用 paths 数组（换行分隔）
        channelItem.setAttribute('data-tooltip', paths.join('\n'));
        // 显示渠道名和价格
        const nameSpan = document.createElement('span');
        nameSpan.className = 'channel-name';
        nameSpan.textContent = channel;

        const discountSpan = document.createElement('span');
        discountSpan.className = 'channel-discount';
        discountSpan.textContent = price;

        channelItem.appendChild(nameSpan);
        channelItem.appendChild(discountSpan);
        container.appendChild(channelItem);
    });
}

// 显示错误信息
function showError(message) {
    const container = document.getElementById('xdContainer');
    container.innerHTML = `
        <div class="error">
            <p>${message}</p>
            <p>请确保服务正常运行</p>
            <button class="refresh-btn" onclick="location.reload()">刷新页面</button>
        </div>
    `;
}

// 显示通知提示
function showToast(message, isError = false, containerId = 'xd-toast') {
    const notification = document.getElementById(containerId);
    if (!notification) return;
    notification.textContent = message;
    notification.className = 'toast';
    if (isError) notification.classList.add('error');
    notification.classList.add('show');
    setTimeout(() => notification.classList.remove('show'), 3000);
}

// === 检测“明天”的折扣文件是否存在，存在则在右上角创建红色“明”FAB ===
async function checkAndCreateTomorrowFab(baseDate) {
    const tomorrowStr = new Date(baseDate.getTime() + 1 * 24 * 3600_000).toISOString().slice(0, 10);
    let tomorrowDiscountUrl = '/api/discount';
    const qParam = new URLSearchParams();
    qParam.set('date', tomorrowStr);
    tomorrowDiscountUrl += `?${qParam.toString()}`;
    const respD = await (await fetch(tomorrowDiscountUrl)).json();

    if (Object.keys(respD.xy).length > 0) {
        const div = document.createElement('div');
        div.className = 'fab-top-right';
        div.id = 'fabTopRight';

        const a = document.createElement('a');
        a.className = 'fab fab-red';
        a.id = 'fabTomorrow';
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.href = `/?date=${respD.date}`;
        a.textContent = '明';

        div.appendChild(a);
        document.body.appendChild(div); // 或指定容器
    }
}

// 主数据加载逻辑
async function loadData() {
    await fetchSystemHrefs();
    try {
        const params = new URLSearchParams(window.location.search);
        const profitParam = params.get('profit');
        const dateParam = params.get('date');
        // 构建请求 URL
        let discountUrl = '/api/discount';
        const queryParams = new URLSearchParams();
        if (profitParam) queryParams.set('profit', profitParam);
        if (dateParam) queryParams.set('date', dateParam);
        const queryString = queryParams.toString();
        if (queryString) discountUrl += `?${queryString}`;
        // 请求
        const discountResp = await fetch(discountUrl);
        if (!discountResp.ok) throw new Error('折扣数据接口请求失败');
        const discountData = await discountResp.json();

        if (discountData.error) throw new Error(discountData.error);

        // 设置昨日费率链接
        const baseDate = dateParam ? new Date(dateParam) : new Date(Date.now() + 8 * 3600_000);
        const yesterdayStr = new Date(baseDate.getTime() - 1 * 24 * 3600_000).toISOString().slice(0, 10);
        document.getElementById('yesterday').href = `${window.location.origin}/?date=${yesterdayStr}`;

        if (!dateParam) {
            checkAndCreateTomorrowFab(baseDate);
        }

        // 动态设置费率展示标题
        if (discountData.date) {
            const rateTitleEl = document.getElementById('rate-title');
            if (rateTitleEl) {
                rateTitleEl.textContent = `${discountData.date} 费率展示`;
            }
        }

        // 渲染小刀数据
        const xdTimeBlocks = Object.entries(discountData.xd || {})
            .filter(([key]) => key !== 'template')
            .map(([time, channels]) => ({
                time,
                rates: Object.entries(channels).map(([channel, discount]) => ({channel, discount}))
            }));
        // 渲染星悦数据
        const xyTimeBlocks = Object.entries(discountData.xy || {})
            .map(([time, channels]) => ({
                time,
                rates: Object.entries(channels).map(([channel, discount]) => ({channel, discount}))
            }));
        // 渲染新星悦数据
        const xynTimeBlocks = Object.entries(discountData.xyn || {})
            .map(([time, channels]) => ({
                time,
                rates: Object.entries(channels).map(([channel, discount]) => ({channel, discount}))
            }));
        // 渲染新小刀数据
        const xdnTimeBlocks = Object.entries(discountData.xdn || {})
            .map(([time, channels]) => ({
                time,
                rates: Object.entries(channels).map(([channel, discount]) => ({channel, discount}))
            }));
        // 存储数据供切换使用
        window.discountData = {
            xdTimeBlocks,
            xyTimeBlocks,
            xdTemplate: discountData.xd?.template,
            xdnTimeBlocks,
            xynTimeBlocks,
            xdnTemplate: discountData.xdn?.template
        };

        const xdConfig = panelStateConfigs.xd;
        // 初始化面板切换按钮
        initPanelSwitch({
            ...xdConfig,
            renderA: () => renderXdCards(window.discountData.xdTimeBlocks),
            renderB: () => renderXyCards(window.discountData.xyTimeBlocks),
            copyTexts: {
                textA: '复制费率模板',
                textB: '复制费率代码'
            }
        });
        // 首次渲染小刀
        state.currentXdPanelType = 'xd';
        renderXdCards(xdTimeBlocks);
        renderTabs({
            ...xdConfig,
            timeBlocks: xdTimeBlocks
        });
        await initCopyButton({
            ...xdConfig,
            panelTypeValue: 'xd',
            templateData: discountData.xd?.template,
            apiType: 'xy',
            profitParam,
            dateParam
        });

        const xynConfig = panelStateConfigs.xyn;
        // 初始化面板切换按钮
        initPanelSwitch({
            ...xynConfig,
            renderA: () => renderXynCards(window.discountData.xynTimeBlocks),
            renderB: () => renderXdnCards(window.discountData.xdnTimeBlocks),
            copyTexts: {
                textA: '复制费率模板',
                textB: '复制费率代码'
            }
        });
        // 首次渲染新星悦
        renderXynCards(xynTimeBlocks);
        renderTabs({
            ...xynConfig,
            timeBlocks: xynTimeBlocks
        });
        await initCopyButton({
            ...xynConfig,
            panelTypeValue: 'xdn',
            templateData: discountData.xdn?.template,
            apiType: 'xyn',
            profitParam,
            dateParam,
        });

        // 渲染gbo数据
        renderGbo(discountData.gbo || {});
    } catch (error) {
        showError('数据加载失败: ' + error.message);
    }
}

// 页面加载时执行
loadData();