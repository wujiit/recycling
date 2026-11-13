/**
 * 启灵同城服务系统 - 前台履约交付与下单结算模块
 * 包含履约方式切换（顺丰上门/邮寄自寄/门店自送）、顺丰上门预约时段、门店列表、收款账户配置与回收单提交
 */
(function(window) {
    'use strict';

    const HomeApp = window.HomeApp || {};
    const state = HomeApp.state || {};
    const api = HomeApp.api || {};
    const SysUI = HomeApp.SysUI || window.SysUI;
    const escapeHtml = HomeApp.escapeHtml || window.escapeHtml || function(s) { return s; };

            // ==========================================
            // 履约交割方式动态渲染与交互 (快速寄送/预约免费上门/线下门店自送)
            // ==========================================
            function renderFulfillmentCards() {
                const meta = state.platformMeta || {};
                const container = document.getElementById('mode-cards-container');
                if (!container) return;

                const modes = [];
                if (meta.recycle_home_enabled !== '0') {
                    modes.push({
                        id: 'home',
                        name: meta.recycle_home_name || '预约免费上门',
                        icon: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`
                    });
                }
                if (meta.recycle_mail_enabled !== '0') {
                    const mailName = (meta.recycle_mail_name === '全国快递包邮' || meta.recycle_mail_name === '全国顺丰包邮') 
                        ? '快速寄送' 
                        : (meta.recycle_mail_name || '快速寄送');
                    modes.push({
                        id: 'mail',
                        name: mailName,
                        icon: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>`
                    });
                }
                if (meta.recycle_store_enabled !== '0') {
                    const storeName = (meta.recycle_store_name === '线下门店/网点自送') 
                        ? '线下门店自送' 
                        : (meta.recycle_store_name || '线下门店自送');
                    modes.push({
                        id: 'store',
                        name: storeName,
                        icon: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`
                    });
                }

                if (modes.length === 0) {
                    modes.push({
                        id: 'home',
                        name: '预约免费上门',
                        icon: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>`
                    });
                }

                if (!modes.some(m => m.id === state.currentFulfillment)) {
                    state.currentFulfillment = modes[0].id;
                }

                let html = '';
                modes.forEach(m => {
                    const isActive = m.id === state.currentFulfillment;
                    html += `
                        <div class="mode-card ${isActive ? 'active' : ''}" data-mode="${m.id}" onclick="window.selectFulfillment('${m.id}')">
                            <div style="color:${isActive ? 'var(--primary)' : 'var(--text-muted)'}; display:flex; justify-content:center; align-items:center;">${m.icon}</div>
                            <h4 style="margin:4px 0 0;font-size:14px;font-weight:700;">${escapeHtml(m.name)}</h4>
                        </div>
                    `;
                });
                container.innerHTML = html;
                updateFulfillmentUI(state.currentFulfillment);
            }

            // 动态生成预约时间选项 (顺丰预约时间格式 YYYY-MM-DD HH:mm:ss)
            function populateAppointmentTimes(fulfillmentMode) {
                const timeSelect = document.getElementById('order-time');
                if (!timeSelect) return;

                const now = new Date();
                const pad = n => n < 10 ? '0' + n : n;
                const formatDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

                const todayStr = formatDate(now);
                const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000);
                const tomorrowStr = formatDate(tomorrow);
                const dayAfter = new Date(now.getTime() + 48 * 3600 * 1000);
                const dayAfterStr = formatDate(dayAfter);

                const currentHour = now.getHours();
                const options = [];

                if (currentHour < 18) {
                    const nextHour = currentHour + 1;
                    options.push({
                        val: `${todayStr} ${pad(nextHour)}:00:00`,
                        text: `今天 1小时内极速上门 (${pad(nextHour)}:00起)`
                    });
                }
                if (currentHour < 12) {
                    options.push({ val: `${todayStr} 14:00:00`, text: '今天 下午 (14:00-16:00)' });
                }
                if (currentHour < 16) {
                    options.push({ val: `${todayStr} 16:00:00`, text: '今天 傍晚 (16:00-18:00)' });
                }
                if (currentHour < 18) {
                    options.push({ val: `${todayStr} 18:00:00`, text: '今天 晚上 (18:00-20:00)' });
                }

                // 明天
                options.push({ val: `${tomorrowStr} 09:30:00`, text: '明天 上午 (09:00-11:00)' });
                options.push({ val: `${tomorrowStr} 14:00:00`, text: '明天 下午 (14:00-16:00)' });
                options.push({ val: `${tomorrowStr} 18:00:00`, text: '明天 傍晚 (16:00-18:00)' });

                // 后天
                options.push({ val: `${dayAfterStr} 10:00:00`, text: '后天 上午 (09:00-11:00)' });
                options.push({ val: `${dayAfterStr} 14:00:00`, text: '后天 下午 (14:00-16:00)' });

                let html = '';
                options.forEach((opt, idx) => {
                    html += `<option value="${escapeHtml(opt.val)}">${escapeHtml(opt.text)}</option>`;
                });
                timeSelect.innerHTML = html;
            }

            // ==========================================
            // 快递寄送二级子模式选择 (顺丰免费上门取件 vs 自行寄送)
            // ==========================================
            function renderMailSubCards() {
                const meta = state.platformMeta || {};
                const container = document.getElementById('mail-sub-cards-container');
                const tipEl = document.getElementById('mail-sub-tip');
                if (!container) return;

                const isSfEnabled = meta.sf_enabled === true || meta.sf_enabled === '1';

                const subModes = [];
                if (isSfEnabled) {
                    const sfTag = meta.sf_freight_tag || '运费补贴·推荐';
                    subModes.push({
                        id: 'sf_pickup',
                        name: '顺丰上门取件',
                        tag: sfTag,
                        tagColor: '#0284c7',
                        tagBg: '#e0f2fe',
                        icon: `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>`,
                        desc: '顺丰小哥上门取机，官方安全承运'
                    });
                }
                subModes.push({
                    id: 'self_delivery',
                    name: '自行寄送',
                    tag: isSfEnabled ? '任意快递' : '邮寄回收',
                    tagColor: '#15803d',
                    tagBg: '#dcfce7',
                    icon: `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58v.23z"/></svg>`,
                    desc: '自选快递寄出，享运费补贴政策'
                });

                if (!state.mailSubType || (state.mailSubType === 'sf_pickup' && !isSfEnabled)) {
                    state.mailSubType = isSfEnabled ? 'sf_pickup' : 'self_delivery';
                }

                if (tipEl) {
                    tipEl.innerText = isSfEnabled ? '支持代叫顺丰或自选快递' : '任意快递寄付，凭单号极速结算';
                }

                let html = '';
                subModes.forEach(m => {
                    const isActive = m.id === state.mailSubType;
                    html += `
                        <div class="mail-sub-card ${isActive ? 'active' : ''}" data-sub="${m.id}" onclick="window.selectMailSubType('${m.id}')">
                            <div style="color:${isActive ? 'var(--primary)' : 'var(--text-muted)'}; display:flex; align-items:center;">${m.icon}</div>
                            <div style="flex:1;">
                                <div style="display:flex;align-items:center;gap:6px;">
                                    <strong style="font-size:13px;color:var(--text-main);">${escapeHtml(m.name)}</strong>
                                    <span class="badge" style="font-size:10px;padding:1px 5px;background:${m.tagBg};color:${m.tagColor};">${escapeHtml(m.tag)}</span>
                                </div>
                                <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${escapeHtml(m.desc)}</div>
                            </div>
                        </div>
                    `;
                });
                container.innerHTML = html;
                window.applyMailSubUI(state.mailSubType);
            }

            window.selectMailSubType = function(subType) {
                state.mailSubType = subType;
                const cards = document.querySelectorAll('#mail-sub-cards-container .mail-sub-card');
                cards.forEach(c => {
                    const isActive = c.getAttribute('data-sub') === subType;
                    c.classList.toggle('active', isActive);
                    const icon = c.querySelector('div');
                    if (icon) icon.style.color = isActive ? 'var(--primary)' : 'var(--text-muted)';
                });
                window.applyMailSubUI(subType);
            };

            window.applyMailSubUI = function(subType) {
                const meta = state.platformMeta || {};
                const sfCard = document.getElementById('sf-pickup-info-card');
                const selfCard = document.getElementById('self-delivery-info-card');
                const addrLabel = document.getElementById('addr-label');
                const addrInput = document.getElementById('order-address');
                const addrGroup = document.getElementById('addr-group');
                const timeGroup = document.getElementById('time-group');
                const timeLabel = document.getElementById('time-label');

                if (subType === 'sf_pickup') {
                    if (sfCard) sfCard.style.display = 'block';
                    const sfTextEl = document.getElementById('sf-pickup-info-text');
                    if (sfTextEl) {
                        const payMethod = String(meta.sf_pay_method || '2');
                        let payDesc = '平台支持运费补贴政策';
                        if (payMethod === '2') {
                            payDesc = '平台仓库承担运费（到付/收方月结）';
                        } else if (payMethod === '1') {
                            payDesc = '寄件人现场自付，质检成交后按补贴政策随尾款发放';
                        } else {
                            payDesc = '平台支持运费补贴政策';
                        }
                        sfTextEl.innerHTML = `<svg viewBox="0 0 24 24" width="15" height="15" fill="#0284c7" style="vertical-align:middle;margin-right:4px;"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg><strong>顺丰官方上门：</strong>预约顺丰小哥上门取件。${payDesc}，小哥携带专业包装上门验机揽件。`;
                    }
                    if (selfCard) selfCard.style.display = 'none';
                    if (addrGroup) addrGroup.style.display = 'block';
                    if (addrLabel) addrLabel.innerText = '顺丰上门取件详细地址 (必填)';
                    if (addrInput) addrInput.placeholder = '请填写顺丰快递员上门取件的省市区街道门牌号';
                    if (timeGroup) timeGroup.style.display = 'block';
                    if (timeLabel) timeLabel.innerText = '期望顺丰上门时间';
                    populateAppointmentTimes('mail');
                } else {
                    if (sfCard) sfCard.style.display = 'none';
                    if (selfCard) {
                        selfCard.style.display = 'block';
                        const addrBox = document.getElementById('self-delivery-address-text');
                        if (addrBox) {
                            const c = meta.sf_receive_contact || '平台质检收件中心';
                            const m = meta.sf_receive_mobile || meta.service_tel || '400-800-8888';
                            const a = meta.sf_receive_address || '平台回收质检中心';
                            addrBox.innerHTML = `收件人：<strong>${escapeHtml(c)}</strong> &nbsp; 联系电话：<strong style="font-family:monospace;">${escapeHtml(m)}</strong><br>收件地址：<strong>${escapeHtml(a)}</strong>`;
                        }
                    }
                    if (addrGroup) addrGroup.style.display = 'block';
                    if (addrLabel) addrLabel.innerText = '您的设备退回/发货地址 (选填)';
                    if (addrInput) addrInput.placeholder = '若质检协商不一致退回时，将原路寄回此地址';
                    if (timeGroup) timeGroup.style.display = 'none';
                }
            };

            window.copyPlatformAddress = function() {
                const meta = state.platformMeta || {};
                const c = meta.sf_receive_contact || '平台质检收件中心';
                const m = meta.sf_receive_mobile || meta.service_tel || '400-800-8888';
                const a = meta.sf_receive_address || '平台回收质检中心';
                const text = `收件人: ${c}\n联系电话: ${m}\n收件地址: ${a}`;
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(text).then(() => {
                        SysUI.toast('平台收件中心地址已复制到剪贴板！', 'success');
                    }).catch(() => {
                        fallbackCopy(text);
                    });
                } else {
                    fallbackCopy(text);
                }
                function fallbackCopy(s) {
                    const ta = document.createElement('textarea');
                    ta.value = s;
                    document.body.appendChild(ta);
                    ta.select();
                    try {
                        document.execCommand('copy');
                        SysUI.toast('平台收件中心地址已复制到剪贴板！', 'success');
                    } catch(e) {
                        SysUI.toast('复制失败，请手动长按复制', 'warning');
                    }
                    document.body.removeChild(ta);
                }
            };

            window.showFreightRuleModal = function() {
                const modal = document.getElementById('modal-freight-rule');
                const box = document.getElementById('freight-rule-content-box');
                if (!modal || !box) return;
                const meta = state.platformMeta || {};
                const defaultRule = `【平台寄送与运费承担规则说明】

1. 顺丰上门取件：
   • 用户选择“顺丰上门取件”，系统将自动下发顺丰官方揽件预约，顺丰小哥将按约定时间携带专业包装上门验视取机。

2. 运费承担与补贴政策：
   • 订单经质检核验并最终达成一致成交的订单，平台承担寄件运费或按平台标准发放运费补贴（最高补贴25元，随最终回收款一并结清打款）；
   • 若用户选择“自行寄送”，寄出后请在【我的回收订单】中录入快递单号，订单成交同样享受运费补贴政策。

3. 运费自理特别说明：
   • 若寄送物品为山寨仿冒机、严重名不符实、已被锁死无法解绑账号密码，或质检后用户拒绝方案要求退回的，往返寄送运费需由用户自行承担。
   • 敬请在寄出前提前解绑账号、退出密码并核对成色。`;
                box.innerText = meta.sf_freight_rule && meta.sf_freight_rule.trim() ? meta.sf_freight_rule.trim() : defaultRule;
                modal.style.display = 'flex';
            };

            window.closeFreightRuleModal = function() {
                const modal = document.getElementById('modal-freight-rule');
                if (modal) modal.style.display = 'none';
            };

            function updateFulfillmentUI(mode) {
                const addrLabel = document.getElementById('addr-label');
                const addrInput = document.getElementById('order-address');
                const addrGroup = document.getElementById('addr-group');
                const storeGroup = document.getElementById('store-select-group');
                const timeGroup = document.getElementById('time-group');
                const timeLabel = document.getElementById('time-label');
                const mailSubGroup = document.getElementById('mail-sub-group');

                if (mode === 'home') {
                    if (mailSubGroup) mailSubGroup.style.display = 'none';
                    if (addrGroup) addrGroup.style.display = 'block';
                    if (storeGroup) storeGroup.style.display = 'none';
                    if (timeGroup) timeGroup.style.display = 'block';
                    if (addrLabel) addrLabel.innerText = '上门详细地址 (必填)';
                    if (addrInput) addrInput.placeholder = '省、市、区、街道及详细门牌号';
                    if (timeLabel) timeLabel.innerText = '期望上门时间';
                    populateAppointmentTimes('home');
                } else if (mode === 'mail') {
                    if (mailSubGroup) mailSubGroup.style.display = 'block';
                    if (storeGroup) storeGroup.style.display = 'none';
                    renderMailSubCards();
                } else if (mode === 'store') {
                    if (mailSubGroup) mailSubGroup.style.display = 'none';
                    if (addrGroup) addrGroup.style.display = 'none';
                    if (storeGroup) storeGroup.style.display = 'block';
                    if (timeGroup) timeGroup.style.display = 'block';
                    if (timeLabel) timeLabel.innerText = '预计到店时间';
                    loadStoreOptions();
                }
            }

            async function loadStoreOptions() {
                const container = document.getElementById('store-cards-container');
                const tipEl = document.getElementById('store-count-tip');
                if (!container) return;

                if (!state.storeList || state.storeList.length === 0) {
                    container.innerHTML = '<div style="text-align:center;padding:16px;color:var(--text-muted);font-size:12px;">正在加载就近服务门店...</div>';
                    const res = await api.request('/api/store/list');
                    if (res && res.code === 200 && Array.isArray(res.data)) {
                        state.storeList = res.data;
                    } else {
                        state.storeList = [];
                    }
                }

                const stores = state.storeList || [];
                if (tipEl) {
                    tipEl.innerText = stores.length > 0 ? (stores.length === 1 ? '官方服务门店' : `共 ${stores.length} 家门店可选`) : '';
                }

                if (stores.length === 0) {
                    container.innerHTML = `
                        <div style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:8px;padding:14px;text-align:center;font-size:12px;color:var(--text-muted);">
                            平台暂未设置线下门店，请选择【预约免费上门】或【快速寄送】
                        </div>
                    `;
                    state.selectedStoreId = 0;
                    state.selectedStoreName = '';
                    return;
                }

                // 若尚未选择有效门店，默认优先选择被设为默认的门店或第 1 家门店
                if (!state.selectedStoreId || !stores.some(s => Number(s.id) === Number(state.selectedStoreId))) {
                    const def = stores.find(s => Number(s.is_default) === 1) || stores[0];
                    state.selectedStoreId = Number(def.id);
                    state.selectedStoreName = def.name;
                }

                let html = '';
                stores.forEach(s => {
                    const isSelected = Number(s.id) === Number(state.selectedStoreId);
                    const isDef = Number(s.is_default) === 1;
                    const defTag = isDef ? `<span style="background:#dbeafe;color:#1e40af;font-size:10px;padding:1px 6px;border-radius:4px;font-weight:600;margin-left:6px;">推荐网点</span>` : '';
                    const radioIcon = isSelected 
                        ? `<svg viewBox="0 0 24 24" width="18" height="18" fill="var(--primary)"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6z"/></svg>`
                        : `<svg viewBox="0 0 24 24" width="18" height="18" fill="#cbd5e1"><circle cx="12" cy="12" r="9" fill="none" stroke="#cbd5e1" stroke-width="2"/></svg>`;

                    html += `
                        <div class="store-select-card ${isSelected ? 'active' : ''}" onclick="window.selectStore(${s.id}, '${escapeHtml(s.name)}')">
                            <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                                <div style="font-weight:700;font-size:13px;color:var(--text-main);display:flex;align-items:center;">
                                    ${escapeHtml(s.name)}
                                    ${defTag}
                                </div>
                                <div style="margin-left:8px;">${radioIcon}</div>
                            </div>
                            <div style="font-size:12px;color:var(--text-muted);margin-top:4px;line-height:1.4;">
                                <div>地址：${escapeHtml(s.address)}</div>
                                <div style="margin-top:2px;">电话：${escapeHtml(s.phone)} · 营业时间：${escapeHtml(s.business_hours || '09:00 - 21:00')}</div>
                                ${s.traffic_guide ? `<div style="color:#2563eb;margin-top:2px;font-size:11px;">交通指引：${escapeHtml(s.traffic_guide)}</div>` : ''}
                            </div>
                        </div>
                    `;
                });
                container.innerHTML = html;
            }

            window.selectStore = function(id, name) {
                state.selectedStoreId = Number(id);
                state.selectedStoreName = name;
                loadStoreOptions();
            };

            window.selectFulfillment = function(mode) {
                state.currentFulfillment = mode;
                const cards = document.querySelectorAll('#mode-cards-container .mode-card');
                cards.forEach(c => {
                    const isActive = c.getAttribute('data-mode') === mode;
                    if (isActive) {
                        c.classList.add('active');
                        const icon = c.querySelector('div');
                        if (icon) icon.style.color = 'var(--primary)';
                    } else {
                        c.classList.remove('active');
                        const icon = c.querySelector('div');
                        if (icon) icon.style.color = 'var(--text-muted)';
                    }
                });
                updateFulfillmentUI(mode);
            };

            // ==========================================
            // 客户收款结算方式动态渲染与交互 (支付宝/银行卡/微信/现金)
            // ==========================================
            function renderPayoutCards() {
                const meta = state.platformMeta || {};
                const container = document.getElementById('payout-cards-container');
                if (!container) return;

                function cleanTitle(t, fallback) {
                    if (!t) return fallback;
                    return t.replace(/\s*[\(（].*?[\)）]/g, '').trim() || fallback;
                }

                const channels = [];
                if (meta.payout_alipay_enabled !== '0') {
                    channels.push({
                        id: 'alipay',
                        name: cleanTitle(meta.payout_alipay_title, '支付宝'),
                        icon: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#1677ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
                    });
                }
                if (meta.payout_bank_enabled !== '0') {
                    channels.push({
                        id: 'bank',
                        name: cleanTitle(meta.payout_bank_title, '银行卡转账'),
                        icon: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#0ea5e9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>`
                    });
                }
                if (meta.payout_wechat_enabled !== '0') {
                    channels.push({
                        id: 'wechat',
                        name: cleanTitle(meta.payout_wechat_title, '微信零钱'),
                        icon: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#07c160" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`
                    });
                }
                if (meta.payout_cash_enabled !== '0') {
                    channels.push({
                        id: 'cash',
                        name: cleanTitle(meta.payout_cash_title, '现场现金'),
                        icon: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#eab308" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M15 9.5a2.5 2.5 0 0 0-5 0c0 2.5 5 1.5 5 4a2.5 2.5 0 0 1-5 0"/></svg>`
                    });
                }

                if (channels.length === 0) {
                    channels.push({
                        id: 'alipay',
                        name: '支付宝',
                        icon: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#1677ff" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/></svg>`
                    });
                }

                if (!channels.some(c => c.id === state.currentPayout)) {
                    state.currentPayout = channels[0].id;
                }

                let html = '';
                channels.forEach(c => {
                    const isActive = c.id === state.currentPayout;
                    html += `
                        <div class="payout-card ${isActive ? 'active' : ''}" data-type="${c.id}" onclick="window.selectPayout('${c.id}')">
                            ${c.icon}
                            <span class="payout-title">${escapeHtml(c.name)}</span>
                        </div>
                    `;
                });
                container.innerHTML = html;
                renderPayoutFields(state.currentPayout);
            }

            function renderPayoutFields(type) {
                const box = document.getElementById('payout-fields-box');
                if (!box) return;

                if (type === 'alipay') {
                    box.innerHTML = `
                        <div style="font-size:12px;font-weight:600;color:var(--text-main);margin-bottom:8px;display:flex;align-items:center;gap:4px;">
                            <span style="color:#1677ff;">●</span> 填写您的支付宝收款账号
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1.5fr;gap:10px;">
                            <div>
                                <label class="form-label" style="font-size:12px;">支付宝认证姓名 <span style="color:#ef4444;">*</span></label>
                                <input type="text" id="payout-name" class="form-input" style="height:38px;font-size:13px;" placeholder="真实姓名" required>
                            </div>
                            <div>
                                <label class="form-label" style="font-size:12px;">支付宝账号 <span style="color:#ef4444;">*</span></label>
                                <input type="text" id="payout-account" class="form-input" style="height:38px;font-size:13px;" placeholder="手机号或邮箱账号" required>
                            </div>
                        </div>
                    `;
                } else if (type === 'bank') {
                    box.innerHTML = `
                        <div style="font-size:12px;font-weight:600;color:var(--text-main);margin-bottom:8px;display:flex;align-items:center;gap:4px;">
                            <span style="color:#0ea5e9;">●</span> 填写您的银行卡转账账户
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px;">
                            <div>
                                <label class="form-label" style="font-size:12px;">开户人姓名 <span style="color:#ef4444;">*</span></label>
                                <input type="text" id="payout-name" class="form-input" style="height:38px;font-size:13px;" placeholder="银行开户姓名" required>
                            </div>
                            <div>
                                <label class="form-label" style="font-size:12px;">开户银行 <span style="color:#ef4444;">*</span></label>
                                <input type="text" id="payout-bank" class="form-input" style="height:38px;font-size:13px;" placeholder="如：招商银行、工商银行" required>
                            </div>
                        </div>
                        <div>
                            <label class="form-label" style="font-size:12px;">银行卡卡号 <span style="color:#ef4444;">*</span></label>
                            <input type="text" id="payout-account" class="form-input" style="height:38px;font-size:13px;" placeholder="输入16-19位银行储蓄卡或对公账号" required>
                        </div>
                    `;
                } else if (type === 'wechat') {
                    box.innerHTML = `
                        <div style="font-size:12px;font-weight:600;color:var(--text-main);margin-bottom:8px;display:flex;align-items:center;gap:4px;">
                            <span style="color:#07c160;">●</span> 填写您的微信打款账户
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1.5fr;gap:10px;">
                            <div>
                                <label class="form-label" style="font-size:12px;">微信认证姓名 <span style="color:#ef4444;">*</span></label>
                                <input type="text" id="payout-name" class="form-input" style="height:38px;font-size:13px;" placeholder="实名认证真实姓名" required>
                            </div>
                            <div>
                                <label class="form-label" style="font-size:12px;">微信号 / 绑卡手机号 <span style="color:#ef4444;">*</span></label>
                                <input type="text" id="payout-account" class="form-input" style="height:38px;font-size:13px;" placeholder="微信号或微信绑卡手机号" required>
                            </div>
                        </div>
                    `;
                } else if (type === 'cash') {
                    box.innerHTML = `
                        <div style="display:flex;align-items:center;gap:8px;color:#854d0e;background:#fefce8;padding:10px 14px;border-radius:6px;font-size:13px;line-height:1.5;">
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#eab308" stroke-width="2" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                            <div><strong>现金结清模式</strong>：质检复核确认后，业务人员将当面清点现金全额交付，无需预先填写银行账号。</div>
                        </div>
                    `;
                }
            }

            window.selectPayout = function(type) {
                state.currentPayout = type;
                const cards = document.querySelectorAll('#payout-cards-container .payout-card');
                cards.forEach(c => {
                    if (c.getAttribute('data-type') === type) {
                        c.classList.add('active');
                    } else {
                        c.classList.remove('active');
                    }
                });
                renderPayoutFields(type);
            };


    // 回收订单提交与成功弹窗处理
            // 提交订单
            document.getElementById('btn-submit-order')?.addEventListener('click', async function() {
                const meta = state.platformMeta || {};
                if (meta.user_order_guest_enabled === false && !state.userToken) {
                    SysUI.toast('请先登录账号后再确认提交订单', 'warning');
                    window.openAuthModal('login');
                    return;
                }

                const name = document.getElementById('order-name')?.value.trim();
                const mobile = document.getElementById('order-mobile')?.value.trim();
                const address = document.getElementById('order-address')?.value.trim() || '';
                const appointment_time = document.getElementById('order-time')?.value || '';
                const remark = document.getElementById('order-remark')?.value.trim() || '';

                if (!name) {
                    SysUI.toast('请填写联系人姓名', 'warning');
                    return;
                }
                if (meta.user_require_realname && name.length < 2) {
                    SysUI.toast('平台已开启实名认证，请填写真实姓名', 'warning');
                    return;
                }
                if (!/^1[3-9]\d{9}$/.test(mobile)) {
                    SysUI.toast('请填写正确的11位手机号码', 'warning');
                    return;
                }
                if (state.currentFulfillment === 'home' && !address) {
                    SysUI.toast('请填写详细地址以便安排工程师上门回收服务', 'warning');
                    return;
                }
                if (state.currentFulfillment === 'mail' && state.mailSubType === 'sf_pickup' && !address) {
                    SysUI.toast('请填写顺丰快递员上门取件的详细地址', 'warning');
                    return;
                }

                // 收款账户校验与收集
                let payoutName = '';
                let payoutAccount = '';
                let payoutBank = '';

                if (state.currentPayout === 'alipay') {
                    payoutName = document.getElementById('payout-name')?.value.trim() || '';
                    payoutAccount = document.getElementById('payout-account')?.value.trim() || '';
                    if (!payoutName) {
                        SysUI.toast('请填写支付宝认证真实姓名', 'warning');
                        return;
                    }
                    if (!payoutAccount) {
                        SysUI.toast('请填写支付宝收款账号', 'warning');
                        return;
                    }
                } else if (state.currentPayout === 'bank') {
                    payoutName = document.getElementById('payout-name')?.value.trim() || '';
                    payoutBank = document.getElementById('payout-bank')?.value.trim() || '';
                    payoutAccount = document.getElementById('payout-account')?.value.trim() || '';
                    if (!payoutName) {
                        SysUI.toast('请填写银行卡开户姓名', 'warning');
                        return;
                    }
                    if (!payoutBank) {
                        SysUI.toast('请填写开户银行名称', 'warning');
                        return;
                    }
                    if (!payoutAccount) {
                        SysUI.toast('请填写银行卡卡号', 'warning');
                        return;
                    }
                } else if (state.currentPayout === 'wechat') {
                    payoutName = document.getElementById('payout-name')?.value.trim() || '';
                    payoutAccount = document.getElementById('payout-account')?.value.trim() || '';
                    if (!payoutName) {
                        SysUI.toast('请填写微信认证真实姓名', 'warning');
                        return;
                    }
                    if (!payoutAccount) {
                        SysUI.toast('请填写微信号或微信绑卡手机号', 'warning');
                        return;
                    }
                }

                const btn = this;
                btn.disabled = true;
                btn.innerText = '正在生成回收单...';

                // 如果是线下门店自送模式，校验并绑定所选门店
                let storeId = 0;
                let storeName = '';
                if (state.currentFulfillment === 'store') {
                    if (state.selectedStoreId) {
                        storeId = state.selectedStoreId;
                        storeName = state.selectedStoreName;
                    } else if (state.storeList && state.storeList.length > 0) {
                        const def = state.storeList.find(s => Number(s.is_default) === 1) || state.storeList[0];
                        storeId = Number(def.id);
                        storeName = def.name;
                    }
                }

                const mailSubType = (state.currentFulfillment === 'mail') ? (state.mailSubType || 'sf_pickup') : '';
                const payload = {
                    device_id: state.activeDevice ? state.activeDevice.id : 0,
                    appraisal_mode: state.appraisalMode || 'quick',
                    quick_tier_id: state.appraisalMode === 'quick' ? state.quickTierId : '',
                    item_ids: state.appraisalMode === 'quick' ? [] : Object.values(state.selectedItemIds),
                    fulfillment_type: state.currentFulfillment,
                    mail_sub_type: mailSubType,
                    store_id: storeId,
                    store_name: storeName,
                    payout_type: state.currentPayout,
                    payout_name: payoutName,
                    payout_account: payoutAccount,
                    payout_bank: payoutBank,
                    user_coupon_id: state.selectedUserCouponId || 0,
                    contact: {
                        name,
                        mobile,
                        address: state.currentFulfillment === 'store' ? (storeName || address || '线下门店自送') : (state.currentFulfillment === 'mail' && mailSubType === 'self_delivery' && !address ? '自行寄送至平台质检中心' : address),
                        store_id: storeId,
                        store_name: storeName,
                        appointment_time,
                        mail_sub_type: mailSubType,
                        payout_type: state.currentPayout,
                        payout_name: payoutName,
                        payout_account: payoutAccount,
                        payout_bank: payoutBank,
                        user_coupon_id: state.selectedUserCouponId || 0,
                        remark
                    }
                };

                const res = await api.request('/api/order/create', 'POST', payload);
                btn.disabled = false;
                btn.innerText = '确认提交回收单';

                if (res && res.code === 200) {
                    state.userMobile = mobile;
                    localStorage.setItem('ql_user_mobile', mobile);
                    if (res.data.token) {
                        state.userToken = res.data.token;
                        localStorage.setItem('ql_user_token', res.data.token);
                        renderUserNav();
                        refreshUserProfile();
                    }

                    closeOrderModal();
                    const snEl = document.getElementById('success-sn');
                    if (snEl) snEl.innerText = res.data.order_sn;
                    const priceEl = document.getElementById('success-price');
                    if (priceEl) priceEl.innerText = '¥ ' + res.data.estimate_price;

                    const expRow = document.getElementById('success-express-row');
                    const expSn = document.getElementById('success-express-sn');
                    if (res.data.express_sn) {
                        if (expSn) expSn.innerText = res.data.express_sn;
                        if (expRow) {
                            expRow.innerHTML = `顺丰单号：<strong id="success-express-sn" style="color:#0284c7;font-family:monospace;font-size:14px;">${escapeHtml(res.data.express_sn)}</strong><span class="badge" style="background:#e0f2fe;color:#0369a1;font-size:11px;margin-left:6px;padding:2px 6px;">已预约顺丰小哥上门取件</span>`;
                            expRow.style.display = 'block';
                        }
                    } else if (res.data.mail_sub_type === 'self_delivery') {
                        if (expRow) {
                            expRow.innerHTML = `<div style="font-size:12px;color:#15803d;line-height:1.6;"><strong>您已选择自行寄送</strong>：请尽快寄出并在【我的订单】中录入快递单号，我们收到后将立即质检并结算。</div>`;
                            expRow.style.display = 'block';
                        }
                    } else if (expRow) {
                        expRow.style.display = 'none';
                    }

                    const modalSuccess = document.getElementById('modal-success');
                    if (modalSuccess) modalSuccess.style.display = 'flex';
                } else {
                    SysUI.toast(res ? res.msg : '下单失败，请稍后重试', 'error');
                }
            });

            // 查单
            document.getElementById('btn-open-orders')?.addEventListener('click', () => {
                if (state.userMobile) {
                    document.getElementById('query-mobile-input').value = state.userMobile;
                    document.getElementById('btn-do-query-mobile')?.click();
                }
                document.getElementById('modal-my-orders').style.display = 'flex';
            });

            document.getElementById('btn-success-check-orders')?.addEventListener('click', () => {
                document.getElementById('modal-success').style.display = 'none';
                document.getElementById('btn-open-orders')?.click();
            });


    // 挂载履约结算模块核心方法到全局
    window.renderFulfillmentCards = renderFulfillmentCards;
    window.selectFulfillment = selectFulfillment;
    window.updateFulfillmentUI = updateFulfillmentUI;
    window.selectMailSubType = selectMailSubType;
    window.applyMailSubUI = applyMailSubUI;
    window.copyPlatformAddress = copyPlatformAddress;
    window.showFreightRuleModal = showFreightRuleModal;
    window.closeFreightRuleModal = closeFreightRuleModal;
    window.loadStoreOptions = loadStoreOptions;
    window.selectStore = selectStore;
    window.renderPayoutCards = renderPayoutCards;
    window.renderPayoutFields = renderPayoutFields;
    window.selectPayout = selectPayout;
})(window);
