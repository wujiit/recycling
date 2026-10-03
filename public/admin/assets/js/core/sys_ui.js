/**
 * 启灵回收系统 - 前端交互提示与弹窗组件 (SysUI)
 * 职责：告别浏览器丑陋的 alert/confirm/prompt，提供现代高质感交互反馈
 * 编码：UTF-8 无 BOM
 */
(function (window) {
    'use strict';

    const SysUI = (function () {
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
                info: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#1e58ff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
            };

            const esc = window.escapeHtml || ((s) => s);
            item.innerHTML = `
                <span class="sys-toast-icon">${icons[type] || icons.info}</span>
                <span class="sys-toast-text">${esc(message)}</span>
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
                    info: `<div class="sys-dialog-icon sys-icon-info"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#1e58ff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></div>`
                };

                const esc = window.escapeHtml || ((s) => s);
                modal.innerHTML = `
                    <div class="sys-dialog-box">
                        ${icons[type] || icons.info}
                        <div class="sys-dialog-title">${esc(title)}</div>
                        <div class="sys-dialog-content">${esc(message)}</div>
                        <div class="sys-dialog-footer">
                            <button type="button" class="sys-dialog-btn sys-btn-primary" id="sys-alert-confirm">${esc(confirmText)}</button>
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
                const isDanger = options.isDanger || (type === 'error');

                const modal = document.createElement('div');
                modal.className = 'sys-dialog-overlay';

                const icons = {
                    warning: `<div class="sys-dialog-icon sys-icon-warning"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>`,
                    error: `<div class="sys-dialog-icon sys-icon-error"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div>`,
                    info: `<div class="sys-dialog-icon sys-icon-info"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#1e58ff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></div>`
                };

                const esc = window.escapeHtml || ((s) => s);
                modal.innerHTML = `
                    <div class="sys-dialog-box">
                        ${icons[type] || icons.warning}
                        <div class="sys-dialog-title">${esc(title)}</div>
                        <div class="sys-dialog-content">${esc(message)}</div>
                        <div class="sys-dialog-footer">
                            <button type="button" class="sys-dialog-btn sys-btn-secondary" id="sys-confirm-cancel">${esc(cancelText)}</button>
                            <button type="button" class="sys-dialog-btn ${isDanger ? 'sys-btn-danger' : 'sys-btn-primary'}" id="sys-confirm-ok">${esc(confirmText)}</button>
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

        function prompt(message, defaultValue = '', options = {}) {
            return new Promise((resolve) => {
                const title = options.title || '输入内容';
                const placeholder = options.placeholder || '请输入...';
                const confirmText = options.confirmText || '确定';
                const cancelText = options.cancelText || '取消';

                const modal = document.createElement('div');
                modal.className = 'sys-dialog-overlay';

                const esc = window.escapeHtml || ((s) => s);
                modal.innerHTML = `
                    <div class="sys-dialog-box">
                        <div class="sys-dialog-icon sys-icon-info">
                            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#1e58ff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                            </svg>
                        </div>
                        <div class="sys-dialog-title">${esc(title)}</div>
                        <div class="sys-dialog-content" style="margin-bottom:12px;">${esc(message)}</div>
                        <div style="margin-bottom:18px;">
                            <input type="text" id="sys-prompt-input" class="form-control" value="${esc(defaultValue)}" placeholder="${esc(placeholder)}" style="width:100%;height:38px;padding:0 12px;border:1px solid #cbd5e1;border-radius:6px;font-size:14px;box-sizing:border-box;">
                        </div>
                        <div class="sys-dialog-footer">
                            <button type="button" class="sys-dialog-btn sys-btn-secondary" id="sys-prompt-cancel">${esc(cancelText)}</button>
                            <button type="button" class="sys-dialog-btn sys-btn-primary" id="sys-prompt-ok">${esc(confirmText)}</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);

                const inputEl = modal.querySelector('#sys-prompt-input');
                const okBtn = modal.querySelector('#sys-prompt-ok');
                const cancelBtn = modal.querySelector('#sys-prompt-cancel');
                inputEl?.focus();
                inputEl?.select();

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

                okBtn?.addEventListener('click', () => close(inputEl?.value || ''));
                cancelBtn?.addEventListener('click', () => close(null));
                inputEl?.addEventListener('keyup', (e) => {
                    if (e.key === 'Enter') close(inputEl?.value || '');
                    if (e.key === 'Escape') close(null);
                });
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) close(null);
                });
            });
        }

        return { toast, alert, confirm, prompt };
    })();

    // 全局安全覆写原生 alert，杜绝浏览器默认死板弹窗
    window.alert = function (msg) {
        SysUI.toast(String(msg), 'warning');
    };
    window.SysUI = SysUI;
})(window);
