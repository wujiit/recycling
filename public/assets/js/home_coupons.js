/**
 * 启灵同城服务系统 - 前台加价券营销模块
 * 包含卡包加载、领券专区、领券中心弹窗、估价加价计算与下单选券抵扣
 */
(function(window) {
    'use strict';

    const HomeApp = window.HomeApp || {};
    const state = HomeApp.state || {};
    const api = HomeApp.api || {};
    const SysUI = HomeApp.SysUI || window.SysUI;
    const escapeHtml = HomeApp.escapeHtml || window.escapeHtml || function(s) { return s; };

    let selectOrderCoupon = function(userCouponId, addPrice, bPrice) {};

            // 加载用户卡券列表
            async function loadUserCoupons() {
                if (!state.userToken) {
                    state.userCoupons = [];
                    const statEl = document.getElementById('uc-stat-coupons');
                    if (statEl) statEl.innerText = '0';
                    const countBadge = document.getElementById('coupon-tab-count');
                    if (countBadge) countBadge.style.display = 'none';
                    return;
                }
                const res = await api.request('/api/coupon/myCoupons&status=unused');
                if (res && res.code === 200) {
                    state.userCoupons = res.data || [];
                    const statEl = document.getElementById('uc-stat-coupons');
                    if (statEl) statEl.innerText = state.userCoupons.length;
                    const countBadge = document.getElementById('coupon-tab-count');
                    if (countBadge) {
                        countBadge.innerText = state.userCoupons.length;
                        countBadge.style.display = state.userCoupons.length > 0 ? 'inline-flex' : 'none';
                    }
                }
            }

            // 渲染用户中心卡包列表
            async function loadUcCoupons() {
                const box = document.getElementById('uc-coupons-list-box');
                if (!box) return;
                box.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-muted);">正在加载您的加价券包...</div>';

                const res = await api.request('/api/coupon/myCoupons&status=all');
                if (res && res.code === 200) {
                    const list = res.data || [];
                    if (list.length === 0) {
                        box.innerHTML = `
                            <div style="text-align:center;padding:40px 20px;color:var(--text-muted);">
                                <div style="display:flex;justify-content:center;margin-bottom:8px;"><svg viewBox="0 0 24 24" width="36" height="36" fill="#ea580c"><path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/></svg></div>
                                <div>暂无加价补贴券</div>
                                <p style="font-size:12px;margin:8px 0 16px;">快去领券中心领取专属加价券，下单直接多卖现金！</p>
                                <button class="btn btn-primary" style="height:34px;padding:0 18px;font-size:13px;" onclick="window.openCouponCenterModal('market')">前往领券中心</button>
                            </div>
                        `;
                        return;
                    }

                    let html = '<div class="coupon-dialog-list">';
                    list.forEach(c => {
                        const isPercent = (c.type === 'percent');
                        const amountStr = isPercent ? (c.amount + '%') : ('¥ ' + parseInt(c.amount));
                        const statusMap = {
                            'unused': '<span class="badge badge-success">未使用 (可抵用)</span>',
                            'locked': '<span class="badge badge-info">订单锁定质检中</span>',
                            'used': '<span class="badge badge-gray">已成功核销补贴</span>',
                            'expired': '<span class="badge badge-danger">已过期</span>'
                        };
                        const statusBadge = statusMap[c.status] || c.status;
                        const minP = parseFloat(c.min_estimate_price);
                        const minText = minP > 0 ? `满 ¥${minP} 起可用` : '全品类无门槛通用';
                        const expireText = c.end_time_text ? `有效期至：${escapeHtml(c.end_time_text)}` : '';
                        const orderText = c.order_sn ? `<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">绑定订单：${escapeHtml(c.order_sn)} (实际补贴 +¥${escapeHtml(c.actual_add_price)})</div>` : '';

                        html += `
                            <div class="coupon-dialog-item" style="border-color:${c.status === 'unused' ? '#fed7aa' : '#e2e8f0'};">
                                <div class="cdi-left" style="background:${c.status === 'unused' ? 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)' : '#f8fafc'};">
                                    <div class="cdi-amount" style="color:${c.status === 'unused' ? '#ea580c' : '#94a3b8'};">${amountStr}</div>
                                    <div class="cdi-threshold">${escapeHtml(minText)}</div>
                                </div>
                                <div class="cdi-right">
                                    <div class="cdi-info">
                                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                                            <span class="cdi-title">${escapeHtml(c.title)}</span>
                                            ${statusBadge}
                                        </div>
                                        <div class="cdi-expire">${escapeHtml(expireText)}</div>
                                        ${orderText}
                                    </div>
                                    ${c.status === 'unused' ? `<button class="btn btn-primary" style="height:32px;padding:0 14px;font-size:12px;" onclick="document.getElementById('modal-user-center').style.display='none';window.scrollTo({top:0,behavior:'smooth'});">立即去估价</button>` : ''}
                                </div>
                            </div>
                        `;
                    });
                    html += '</div>';
                    box.innerHTML = html;
                } else {
                    box.innerHTML = '<div style="text-align:center;padding:30px;color:#ef4444;">加载卡包失败，请重试</div>';
                }
            };

            // 首页专区与领券中心加载
            async function loadCouponsShowcase() {
                const res = await api.request('/api/coupon/getAvailableCoupons');
                if (res && res.code === 200) {
                    state.availableCoupons = res.data || [];
                    renderCouponsShowcase(state.availableCoupons);
                }
                if (state.platformMeta && typeof window.applyCouponDisplayConfigs === 'function') {
                    window.applyCouponDisplayConfigs(state.platformMeta);
                }
            }

            function renderCouponsShowcase(list) {
                const grid = document.getElementById('coupon-showcase-grid');
                if (!grid) return;
                const showcaseBar = document.getElementById('coupon-showcase-bar');
                const showcaseEnabled = state.platformMeta ? (state.platformMeta.coupon_system_enabled !== false && state.platformMeta.coupon_home_showcase_enabled !== false) : true;
                if (!showcaseEnabled || !list || list.length === 0) {
                    if (showcaseBar) showcaseBar.style.display = 'none';
                    return;
                }
                if (showcaseBar) showcaseBar.style.display = 'block';

                let html = '';
                list.forEach(c => {
                    const isPercent = (c.type === 'percent');
                    const amountNum = isPercent ? parseFloat(c.amount) : parseInt(c.amount);
                    const symbol = isPercent ? '' : '+¥';
                    const unit = isPercent ? '%' : '';
                    const typeLabel = isPercent ? '比例加价' : '现金补贴';
                    const minPrice = parseFloat(c.min_estimate_price);
                    const minText = minPrice > 0 ? `满 ¥${minPrice} 可用` : '全品类无门槛';
                    const isClaimed = !!c.has_received;
                    const btnText = isClaimed ? '✓ 已领取' : '立即领取';
                    const btnClass = isClaimed ? 'claimed' : '';

                    html += `
                        <div class="coupon-card-mini">
                            <div class="coupon-mini-left">
                                <div class="coupon-mini-price">
                                    <span class="coupon-mini-symbol">${symbol}</span>
                                    <span class="coupon-mini-num">${amountNum}</span>
                                    <span class="coupon-mini-symbol">${unit}</span>
                                    <span class="coupon-mini-type">${typeLabel}</span>
                                </div>
                                <div class="coupon-mini-title">${escapeHtml(c.title)}</div>
                                <div class="coupon-mini-rule">${escapeHtml(minText)} · ${escapeHtml(c.sub_title || '回收立享现金加价')}</div>
                            </div>
                            <button class="coupon-mini-btn ${btnClass}" onclick="window.claimCoupon(${c.id}, event)" ${isClaimed ? 'disabled' : ''}>
                                ${btnText}
                            </button>
                        </div>
                    `;
                });
                grid.innerHTML = html;
            }

            // 用户领取加价券
            async function claimCoupon(couponId, event) {
                if (event) event.stopPropagation();
                if (!state.userToken) {
                    SysUI.toast('请先登录后再领取加价补贴券', 'info');
                    window.openAuthModal('login');
                    return;
                }
                const res = await api.request('/api/coupon/receive', 'POST', { coupon_id: couponId });
                if (res && res.code === 200) {
                    SysUI.toast(res.msg || '领取成功！已存入您的卡包，估价下单自动享受加价补贴！', 'success');
                    await loadCouponsShowcase();
                    await loadUserCoupons();
                    const modalCenter = document.getElementById('modal-coupon-center');
                    if (modalCenter && modalCenter.style.display !== 'none') {
                        renderCouponModalMarket();
                    }
                } else {
                    SysUI.toast(res ? res.msg : '领取失败', 'error');
                }
            }

            // 领券中心弹窗控制
            function openCouponCenterModal(defaultTab = 'market') {
                const modal = document.getElementById('modal-coupon-center');
                if (!modal) return;
                modal.style.display = 'flex';
                window.switchCouponModalTab(defaultTab);
            }

            function closeCouponCenterModal() {
                const modal = document.getElementById('modal-coupon-center');
                if (modal) modal.style.display = 'none';
            }

            function switchCouponModalTab(tab) {
                const tabMarket = document.getElementById('tab-coupon-market');
                const tabMine = document.getElementById('tab-coupon-mine');
                if (tab === 'market') {
                    tabMarket?.classList.add('active');
                    tabMine?.classList.remove('active');
                    renderCouponModalMarket();
                } else {
                    tabMine?.classList.add('active');
                    tabMarket?.classList.remove('active');
                    renderCouponModalMine();
                }
            }

            function renderCouponModalMarket() {
                const body = document.getElementById('coupon-modal-body');
                if (!body) return;
                const list = state.availableCoupons || [];
                if (list.length === 0) {
                    body.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);">暂无可领加价券</div>';
                    return;
                }
                let html = '<div class="coupon-dialog-list">';
                list.forEach(c => {
                    const isPercent = (c.type === 'percent');
                    const amountStr = isPercent ? (c.amount + '%') : ('+¥ ' + parseInt(c.amount));
                    const minP = parseFloat(c.min_estimate_price);
                    const minText = minP > 0 ? `满 ¥${minP} 可用` : '全品类无门槛';
                    const isClaimed = !!c.has_received;
                    const btnText = isClaimed ? '✓ 已领取' : '立即领取';
                    const btnClass = isClaimed ? 'claimed' : '';

                    html += `
                        <div class="coupon-dialog-item">
                            <div class="cdi-left">
                                <div class="cdi-amount">${amountStr}</div>
                                <div class="cdi-threshold">${escapeHtml(minText)}</div>
                            </div>
                            <div class="cdi-right">
                                <div class="cdi-info">
                                    <div class="cdi-title">${escapeHtml(c.title)}</div>
                                    <div class="cdi-sub">${escapeHtml(c.sub_title || '立享现金加价补贴')}</div>
                                    <div class="cdi-expire">领取后 ${c.valid_days || 7} 天内有效 · 下单自动核销打款</div>
                                </div>
                                <button class="cdi-action-btn ${btnClass}" onclick="window.claimCoupon(${c.id}, event)" ${isClaimed ? 'disabled' : ''}>
                                    ${btnText}
                                </button>
                            </div>
                        </div>
                    `;
                });
                html += '</div>';
                body.innerHTML = html;
            }

            async function renderCouponModalMine() {
                const body = document.getElementById('coupon-modal-body');
                if (!body) return;
                if (!state.userToken) {
                    body.innerHTML = `
                        <div style="text-align:center;padding:40px 20px;color:var(--text-muted);">
                            <div style="display:flex;justify-content:center;margin-bottom:8px;"><svg viewBox="0 0 24 24" width="36" height="36" fill="#64748b"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg></div>
                            <div style="font-size:15px;font-weight:700;color:var(--text-main);margin-bottom:6px;">请先登录查看您的加价券包</div>
                            <p style="font-size:12px;margin-bottom:16px;">登录后可查看卡包中已领取、待使用及已核销的加价券资产</p>
                            <button class="btn btn-primary" onclick="window.closeCouponCenterModal();window.openAuthModal('login');">立即登录 / 注册</button>
                        </div>
                    `;
                    return;
                }
                body.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-muted);">正在加载您的卡券包...</div>';
                const res = await api.request('/api/coupon/myCoupons&status=all');
                if (res && res.code === 200) {
                    const list = res.data || [];
                    if (list.length === 0) {
                        body.innerHTML = `
                            <div style="text-align:center;padding:40px 20px;color:var(--text-muted);">
                                <div style="display:flex;justify-content:center;margin-bottom:8px;"><svg viewBox="0 0 24 24" width="36" height="36" fill="#94a3b8"><path d="M22 10V6c0-1.11-.9-2-2-2H4c-1.1 0-1.99.89-1.99 2v4c1.1 0 1.99.9 1.99 2s-.89 2-2 2v4c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-4c-1.1 0-2-.9-2-2s.9-2 2-2zm-9 7.5h-2v-2h2v2zm0-4.5h-2v-2h2v2zm0-4.5h-2v-2h2v2z"/></svg></div>
                                <div>您的卡包空空如也</div>
                                <p style="font-size:12px;margin:8px 0 16px;">先去领券中心免费领取加价券，估价下单多卖钱！</p>
                                <button class="btn btn-primary" onclick="window.switchCouponModalTab('market')">去领券中心</button>
                            </div>
                        `;
                        return;
                    }
                    let html = '<div class="coupon-dialog-list">';
                    list.forEach(c => {
                        const isPercent = (c.type === 'percent');
                        const amountStr = isPercent ? (c.amount + '%') : ('¥ ' + parseInt(c.amount));
                        const statusMap = {
                            'unused': '<span class="badge badge-success">未使用 (可抵用)</span>',
                            'locked': '<span class="badge badge-info">订单锁定中</span>',
                            'used': '<span class="badge badge-gray">已核销打款</span>',
                            'expired': '<span class="badge badge-danger">已过期</span>'
                        };
                        const statusBadge = statusMap[c.status] || c.status;
                        const minP = parseFloat(c.min_estimate_price);
                        const minText = minP > 0 ? `满 ¥${minP} 可用` : '无门槛通用';

                        html += `
                            <div class="coupon-dialog-item" style="border-color:${c.status === 'unused' ? '#fed7aa' : '#e2e8f0'};">
                                <div class="cdi-left" style="background:${c.status === 'unused' ? 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)' : '#f8fafc'};">
                                    <div class="cdi-amount" style="color:${c.status === 'unused' ? '#ea580c' : '#94a3b8'};">${amountStr}</div>
                                    <div class="cdi-threshold">${escapeHtml(minText)}</div>
                                </div>
                                <div class="cdi-right">
                                    <div class="cdi-info">
                                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                                            <span class="cdi-title">${escapeHtml(c.title)}</span>
                                            ${statusBadge}
                                        </div>
                                        <div class="cdi-expire">${escapeHtml(c.end_time_text ? '有效期至：' + c.end_time_text : '')}</div>
                                        ${c.order_sn ? `<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">订单：${escapeHtml(c.order_sn)} (补贴 +¥${escapeHtml(c.actual_add_price)})</div>` : ''}
                                    </div>
                                    ${c.status === 'unused' ? `<button class="btn btn-primary" style="height:32px;padding:0 14px;font-size:12px;" onclick="window.closeCouponCenterModal();window.scrollTo({top:0,behavior:'smooth'});">去估价用券</button>` : ''}
                                </div>
                            </div>
                        `;
                    });
                    html += '</div>';
                    body.innerHTML = html;
                } else {
                    body.innerHTML = '<div style="text-align:center;padding:30px;color:#ef4444;">加载卡券失败</div>';
                }
            }

            // 估价弹窗中加价券动态匹配提示
            function updateAppraisalCouponBadge(calcPrice) {
                const badge = document.getElementById('eval-coupon-badge');
                if (!badge) return;
                const sysEnabled = state.platformMeta ? (state.platformMeta.coupon_system_enabled !== false) : true;
                const evalEnabled = state.platformMeta ? (state.platformMeta.coupon_eval_badge_enabled !== false) : true;
                if (!sysEnabled || !evalEnabled) {
                    badge.style.display = 'none';
                    return;
                }
                const p = parseFloat(calcPrice) || 0;
                if (p <= 0) {
                    badge.style.display = 'none';
                    return;
                }

                const catId = state.activeDevice ? parseInt(state.activeDevice.category_id || 0) : 0;
                let bestAdd = 0;

                // 优先从已领取的卡券中匹配
                if (state.userCoupons && state.userCoupons.length > 0) {
                    state.userCoupons.forEach(c => {
                        if (c.status === 'unused') {
                            const minP = parseFloat(c.min_estimate_price);
                            const cCatId = parseInt(c.category_id || 0);
                            if (p >= minP && (cCatId === 0 || cCatId === catId)) {
                                let add = 0;
                                if (c.type === 'percent') {
                                    add = p * (parseFloat(c.amount) / 100);
                                    const maxP = parseFloat(c.max_amount);
                                    if (maxP > 0 && add > maxP) add = maxP;
                                } else {
                                    add = parseFloat(c.amount);
                                }
                                if (add > bestAdd) {
                                    bestAdd = add;
                                }
                            }
                        }
                    });
                }

                // 未领或未登录时，从平台公开发行券中推荐
                if (bestAdd <= 0 && state.availableCoupons && state.availableCoupons.length > 0) {
                    state.availableCoupons.forEach(c => {
                        const minP = parseFloat(c.min_estimate_price);
                        const cCatId = parseInt(c.category_id || 0);
                        if (p >= minP && (cCatId === 0 || cCatId === catId)) {
                            let add = 0;
                            if (c.type === 'percent') {
                                add = p * (parseFloat(c.amount) / 100);
                                const maxP = parseFloat(c.max_amount);
                                if (maxP > 0 && add > maxP) add = maxP;
                            } else {
                                add = parseFloat(c.amount);
                            }
                            if (add > bestAdd) {
                                bestAdd = add;
                            }
                        }
                    });
                }

                if (bestAdd > 0) {
                    const totalP = (p + bestAdd).toFixed(2);
                    badge.innerHTML = `加价补贴 +¥${bestAdd.toFixed(2)}，预计最高到手 ¥${totalP}`;
                    badge.style.display = 'inline-flex';
                } else {
                    badge.style.display = 'none';
                }
            }

            // 下单模态框中动态渲染可用加价券
            async function renderOrderCoupons(calcPrice) {
                const group = document.getElementById('order-coupon-group');
                const box = document.getElementById('order-coupon-box');
                const benefitTip = document.getElementById('order-coupon-benefit-tip');
                const priceSummaryTip = document.getElementById('order-coupon-summary-tip');
                const estPriceEl = document.getElementById('order-est-price');
                if (!box) return;

                const sysEnabled = state.platformMeta ? (state.platformMeta.coupon_system_enabled !== false) : true;
                const orderCouponEnabled = state.platformMeta ? (state.platformMeta.coupon_order_select_enabled !== false) : true;
                if (!sysEnabled || !orderCouponEnabled) {
                    if (group) group.style.display = 'none';
                    state.selectedUserCouponId = 0;
                    state.selectedCouponAddPrice = 0.00;
                    if (priceSummaryTip) priceSummaryTip.style.display = 'none';
                    return;
                }
                if (group) group.style.display = 'block';

                const basePrice = parseFloat(calcPrice) || 0;
                state.selectedUserCouponId = 0;
                state.selectedCouponAddPrice = 0.00;

                // 若未登录，展示引导领取推荐
                if (!state.userToken) {
                    box.innerHTML = `
                        <div class="order-coupon-card" onclick="window.openAuthModal('login')" style="background:#fff7ed;border-color:#fdba74;">
                            <div class="order-coupon-info">
                                <span class="order-coupon-tag">登录立享</span>
                                <span class="order-coupon-name">登录账号可领取回收加价补贴券，立享现金加价</span>
                            </div>
                            <span style="color:#ea580c;font-size:12px;font-weight:700;">去登录领券 ></span>
                        </div>
                    `;
                    if (benefitTip) benefitTip.innerText = '登录即享加价补贴';
                    if (priceSummaryTip) priceSummaryTip.style.display = 'none';
                    if (estPriceEl) estPriceEl.innerText = `¥ ${basePrice.toFixed(2)}`;
                    return;
                }

                // 已登录，拉取或刷新可用卡券
                box.innerHTML = '<div style="font-size:12px;color:var(--text-muted);padding:8px 0;">正在匹配适用的加价券...</div>';
                const catId = state.activeDevice ? parseInt(state.activeDevice.category_id || 0) : 0;
                const res = await api.request(`/api/coupon/myCoupons&status=unused&estimate_price=${basePrice}&category_id=${catId}`);
                const coupons = (res && res.code === 200) ? (res.data || []) : [];

                if (coupons.length === 0) {
                    box.innerHTML = `
                        <div class="order-coupon-card" onclick="window.openCouponCenterModal('market')" style="background:#fffaf5;border-color:#fed7aa;">
                            <div class="order-coupon-info">
                                <span class="order-coupon-tag" style="background:#f97316;">免费领券</span>
                                <span class="order-coupon-name">当前卡包暂无可抵用加价券，点击即刻免费领券加价</span>
                            </div>
                            <span style="color:#ea580c;font-size:12px;font-weight:700;">去领券 ></span>
                        </div>
                    `;
                    if (benefitTip) benefitTip.innerText = '未匹配到加价券';
                    if (priceSummaryTip) priceSummaryTip.style.display = 'none';
                    if (estPriceEl) estPriceEl.innerText = `¥ ${basePrice.toFixed(2)}`;
                    return;
                }

                // 筛选出补贴额度最高的券作为默认勾选
                let bestCoupon = null;
                let maxAdd = 0;
                coupons.forEach(c => {
                    let add = 0;
                    if (c.type === 'percent') {
                        add = basePrice * (parseFloat(c.amount) / 100);
                        const maxP = parseFloat(c.max_amount);
                        if (maxP > 0 && add > maxP) add = maxP;
                    } else {
                        add = parseFloat(c.amount);
                    }
                    c.calc_add = Math.round(add * 100) / 100;
                    if (c.calc_add > maxAdd) {
                        maxAdd = c.calc_add;
                        bestCoupon = c;
                    }
                });

                if (bestCoupon) {
                    state.selectedUserCouponId = bestCoupon.id;
                    state.selectedCouponAddPrice = bestCoupon.calc_add;
                }

                updateOrderPriceDisplay(basePrice);

                function renderCouponOptions() {
                    let html = '';
                    coupons.forEach(c => {
                        const isSelected = (state.selectedUserCouponId === c.id);
                        html += `
                            <div class="order-coupon-card ${isSelected ? 'selected' : ''}" onclick="window.selectOrderCoupon(${c.id}, ${c.calc_add}, ${basePrice})">
                                <div class="order-coupon-info">
                                    <span class="order-coupon-tag">${c.type === 'percent' ? '比例加价' : '现金补贴'}</span>
                                    <div>
                                        <div class="order-coupon-name">${escapeHtml(c.title)}</div>
                                        <div style="font-size:11px;color:#94a3b8;margin-top:2px;">满¥${escapeHtml(c.min_estimate_price)}可用</div>
                                    </div>
                                </div>
                                <div class="order-coupon-gain">+¥${c.calc_add.toFixed(2)} 现金补贴</div>
                            </div>
                        `;
                    });

                    // 暂不使用选项
                    const noSelected = (state.selectedUserCouponId === 0);
                    html += `
                        <div class="order-coupon-card ${noSelected ? 'selected' : ''}" onclick="window.selectOrderCoupon(0, 0, ${basePrice})">
                            <div class="order-coupon-info">
                                <span class="order-coupon-name" style="color:#64748b;">暂不使用加价券</span>
                            </div>
                            <span style="font-size:12px;color:#94a3b8;">不享受加价</span>
                        </div>
                    `;
                    box.innerHTML = html;
                }

                selectOrderCoupon = function(userCouponId, addPrice, bPrice) {
                    state.selectedUserCouponId = userCouponId;
                    state.selectedCouponAddPrice = addPrice;
                    updateOrderPriceDisplay(bPrice);
                    renderCouponOptions();
                };
                window.selectOrderCoupon = selectOrderCoupon;

                function updateOrderPriceDisplay(bPrice) {
                    const totalP = (bPrice + state.selectedCouponAddPrice).toFixed(2);
                    if (estPriceEl) estPriceEl.innerText = `¥ ${totalP}`;
                    if (priceSummaryTip) {
                        if (state.selectedCouponAddPrice > 0) {
                            priceSummaryTip.innerText = `(含加价券现金补贴 +¥${state.selectedCouponAddPrice.toFixed(2)})`;
                            priceSummaryTip.style.display = 'block';
                            if (benefitTip) benefitTip.innerText = `已享受加价补贴 +¥${state.selectedCouponAddPrice.toFixed(2)}`;
                        } else {
                            priceSummaryTip.style.display = 'none';
                            if (benefitTip) benefitTip.innerText = '未选择加价券';
                        }
                    }
                }

                renderCouponOptions();
            }


    // 挂载券包营销模块核心方法到全局
    window.loadUserCoupons = loadUserCoupons;
    window.loadCouponsShowcase = loadCouponsShowcase;
    window.renderCouponsShowcase = renderCouponsShowcase;
    window.claimCoupon = claimCoupon;
    window.openCouponCenterModal = openCouponCenterModal;
    window.closeCouponCenterModal = closeCouponCenterModal;
    window.switchCouponModalTab = switchCouponModalTab;
    window.updateAppraisalCouponBadge = updateAppraisalCouponBadge;
    window.renderOrderCoupons = renderOrderCoupons;
    window.selectOrderCoupon = selectOrderCoupon;
    window.loadUcCoupons = loadUcCoupons;
})(window);
