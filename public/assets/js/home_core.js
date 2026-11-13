/**
 * 启灵同城服务系统 - 前台核心底座模块
 * 包含全局状态管理、API通信客户端、XSS转义工具与UI弹窗组件
 */
(function(window) {
    'use strict';

    window.HomeApp = window.HomeApp || {};

            let savedUserInfo = null;
            try {
                savedUserInfo = JSON.parse(localStorage.getItem('ql_user_info') || 'null');
            } catch (e) {}

            const state = {
                currentCat: 0,
                currentBrand: 0,
                keyword: '',
                platformMeta: {},
                categories: [],
                brands: [],
                devices: [],
                activeDevice: null,
                matrix: null,
                selectedItemIds: {},
                calculatedPrice: 0,
                appraisalMode: 'quick',
                quickTierId: 'tier_95',
                quickTiers: [],
                currentFulfillment: 'home',
                mailSubType: 'sf_pickup',
                currentPayout: 'alipay',
                selectedStoreId: 0,
                selectedStoreName: '',
                storeList: [],
                availableCoupons: [],
                userCoupons: [],
                selectedUserCouponId: 0,
                selectedCouponAddPrice: 0.00,
                userToken: localStorage.getItem('ql_user_token') || '',
                userMobile: localStorage.getItem('ql_user_mobile') || '',
                userInfo: savedUserInfo
            };

            const api = {
                async request(endpoint, method = 'GET', data = null) {
                    let url = `index.php?s=${endpoint}`;
                    if (state.userToken) {
                        url += `&token=${encodeURIComponent(state.userToken)}`;
                    }
                    const options = {
                        method,
                        headers: { 'Content-Type': 'application/json' }
                    };
                    if (state.userToken) {
                        options.headers['Authorization'] = 'Bearer ' + state.userToken;
                    }
                    if (data && (method === 'POST' || method === 'PUT')) {
                        options.body = JSON.stringify(data);
                    }
                    try {
                        const res = await fetch(url, options);
                        const json = await res.json();
                        if (json && json.code === 401) {
                            state.userToken = '';
                            state.userInfo = null;
                            localStorage.removeItem('ql_user_token');
                            localStorage.removeItem('ql_user_info');
                            if (typeof renderUserNav === 'function') {
                                renderUserNav();
                            }
                        }
                        return json;
                    } catch (e) {
                        console.error('API Error:', e);
                        return null;
                    }
                }
            };

            function escapeHtml(str) {
                if (str === null || str === undefined) return '';
                return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            }

            // ==========================================
            // 前台系统专属高质感弹窗与轻量提示组件 (SysUI)
            // 彻底告别浏览器原生 alert / confirm
            // ==========================================
            const SysUI = (function() {
                function getToastContainer() {
                    let container = document.getElementById('sys-toast-container');
                    if (!container) {
                        container = document.createElement('div');
                        container.id = 'sys-toast-container';
                        container.className = 'sys-toast-container';
                        document.body.appendChild(container);
                    }
                    return container;
                }

                function toast(message, type = 'info', duration = 2500) {
                    if (!message) return;
                    const container = getToastContainer();
                    const item = document.createElement('div');
                    item.className = `sys-toast-item sys-toast-${type}`;

                    const icons = {
                        success: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`,
                        error: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
                        warning: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
                        info: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
                    };

                    item.innerHTML = `
                        <span class="sys-toast-icon">${icons[type] || icons.info}</span>
                        <span class="sys-toast-text">${escapeHtml(message)}</span>
                    `;
                    container.appendChild(item);

                    setTimeout(() => {
                        item.classList.add('sys-toast-leave');
                        setTimeout(() => {
                            if (item.parentNode) item.parentNode.removeChild(item);
                        }, 220);
                    }, duration);
                }

                function alert(message, options = {}) {
                    return new Promise((resolve) => {
                        const title = options.title || '系统提示';
                        const type = options.type || 'info';
                        const confirmText = options.confirmText || '我知道了';

                        const modal = document.createElement('div');
                        modal.className = 'sys-dialog-overlay';

                        const icons = {
                            success: `<div class="sys-dialog-icon sys-icon-success"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></div>`,
                            error: `<div class="sys-dialog-icon sys-icon-error"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div>`,
                            warning: `<div class="sys-dialog-icon sys-icon-warning"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>`,
                            info: `<div class="sys-dialog-icon sys-icon-info"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></div>`
                        };

                        modal.innerHTML = `
                            <div class="sys-dialog-box">
                                ${icons[type] || icons.info}
                                <div class="sys-dialog-title">${escapeHtml(title)}</div>
                                <div class="sys-dialog-content">${escapeHtml(message)}</div>
                                <div class="sys-dialog-footer">
                                    <button type="button" class="sys-dialog-btn sys-btn-primary" id="sys-alert-confirm">${escapeHtml(confirmText)}</button>
                                </div>
                            </div>
                        `;
                        document.body.appendChild(modal);

                        const confirmBtn = modal.querySelector('#sys-alert-confirm');
                        confirmBtn?.focus();

                        let resolved = false;
                        const close = () => {
                            if (resolved) return;
                            resolved = true;
                            modal.classList.add('sys-dialog-leave');
                            setTimeout(() => {
                                if (modal.parentNode) modal.parentNode.removeChild(modal);
                            }, 200);
                            resolve();
                        };

                        confirmBtn?.addEventListener('click', close);
                        modal.addEventListener('click', (e) => {
                            if (e.target === modal) close();
                        });
                    });
                }

                function confirm(message, options = {}) {
                    return new Promise((resolve) => {
                        const title = options.title || '操作确认';
                        const type = options.type || 'warning';
                        const confirmText = options.confirmText || '确定';
                        const cancelText = options.cancelText || '取消';

                        const modal = document.createElement('div');
                        modal.className = 'sys-dialog-overlay';

                        const icons = {
                            warning: `<div class="sys-dialog-icon sys-icon-warning"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>`,
                            error: `<div class="sys-dialog-icon sys-icon-error"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div>`,
                            info: `<div class="sys-dialog-icon sys-icon-info"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></div>`
                        };

                        modal.innerHTML = `
                            <div class="sys-dialog-box">
                                ${icons[type] || icons.warning}
                                <div class="sys-dialog-title">${escapeHtml(title)}</div>
                                <div class="sys-dialog-content">${escapeHtml(message)}</div>
                                <div class="sys-dialog-footer">
                                    <button type="button" class="sys-dialog-btn sys-btn-secondary" id="sys-confirm-cancel">${escapeHtml(cancelText)}</button>
                                    <button type="button" class="sys-dialog-btn sys-btn-primary" id="sys-confirm-ok">${escapeHtml(confirmText)}</button>
                                </div>
                            </div>
                        `;
                        document.body.appendChild(modal);

                        const okBtn = modal.querySelector('#sys-confirm-ok');
                        const cancelBtn = modal.querySelector('#sys-confirm-cancel');
                        okBtn?.focus();

                        let resolved = false;
                        const close = (result) => {
                            if (resolved) return;
                            resolved = true;
                            modal.classList.add('sys-dialog-leave');
                            setTimeout(() => {
                                if (modal.parentNode) modal.parentNode.removeChild(modal);
                            }, 200);
                            resolve(result);
                        };

                        okBtn?.addEventListener('click', () => close(true));
                        cancelBtn?.addEventListener('click', () => close(false));
                        modal.addEventListener('click', (e) => {
                            if (e.target === modal) close(false);
                        });
                    });
                }

                return { toast, alert, confirm };
            })();

            // 全局覆写原生 alert，杜绝浏览器默认样式
            window.alert = function(msg) {
                SysUI.toast(String(msg), 'warning');
            };
            window.SysUI = SysUI;


    function getStatusBadge(status) {
        const map = {
            'pending_send': '<span class="badge badge-warning">待交付/待拖运</span>',
            'in_transit': '<span class="badge badge-info">运输中</span>',
            'received': '<span class="badge badge-info">已到达/待验收</span>',
            'inspecting': '<span class="badge badge-warning">质检复核中</span>',
            'price_confirming': '<span class="badge badge-warning">差价协商中</span>',
            'completed': '<span class="badge badge-success">已成交/待打款</span>',
            'paid': '<span class="badge badge-success" style="background:#dcfce7;color:#15803d;font-weight:600;">款项已结清</span>',
            'refunded': '<span class="badge badge-danger">已退回/已返还</span>',
            'cancelled': '<span class="badge badge-gray">已取消</span>',
        };
        return map[status] || `<span class="badge badge-gray">${escapeHtml(status)}</span>`;
    }

    // 挂载全局与模块命名空间
    window.escapeHtml = escapeHtml;
    window.getStatusBadge = getStatusBadge;
    window.apiFetch = function(endpoint, method = 'GET', data = null) {
        return api.request(endpoint, method, data);
    };
    window.HomeApp.state = state;
    window.HomeApp.api = api;
    window.HomeApp.apiFetch = window.apiFetch;
    window.HomeApp.SysUI = SysUI;
    window.HomeApp.escapeHtml = escapeHtml;
    window.HomeApp.getStatusBadge = getStatusBadge;
})(window);
