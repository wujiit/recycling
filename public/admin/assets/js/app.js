/**
 * 启灵回收系统 - PC 后台单页调度应用
 * 包含路由分发、菜单切换、用户鉴权与视图生命周期管理
 */
(function (window) {
    'use strict';

    const state = window.adminState || window.state;
    const api = window.adminApi || window.api;
    const SysUI = window.SysUI;
    const escapeHtml = window.escapeHtml || function(s) { return s; };

    /**
     * 基础数据预加载
     */
    async function preloadBaseData() {
        if (!state.token) return;
        const tplRes = await api.get('/admin/config/getTemplates');
        if (tplRes && tplRes.code === 200) {
            state.currentTemplate = tplRes.data.current;
            state.templateMeta = tplRes.data.meta || {};
        }
        const catRes = await api.get('/admin/device/categories');
        if (catRes && catRes.code === 200) {
            state.categories = catRes.data || [];
        }
        const brandRes = await api.get('/admin/device/brands');
        if (brandRes && brandRes.code === 200) {
            state.brands = brandRes.data || [];
        }
    }

    /**
     * 404 伪装视图渲染 (防扫描与防爆破隐蔽)
     */
    function renderForbiddenDisguise(container) {
        document.title = '404 Not Found';
        container.innerHTML = `
            <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#334155;text-align:center;padding:24px;">
                <div style="font-size:88px;font-weight:900;color:#cbd5e1;line-height:1;margin-bottom:12px;letter-spacing:-2px;">404</div>
                <h1 style="font-size:22px;font-weight:700;color:#0f172a;margin:0 0 10px 0;">404 Not Found</h1>
                <p style="font-size:14px;color:#64748b;max-width:440px;line-height:1.6;margin:0 0 24px 0;">很抱歉，您所访问的页面不存在或已被移除。</p>
                <div style="display:flex;gap:12px;align-items:center;">
                    <a href="/" style="display:inline-flex;align-items:center;gap:6px;background:#1e58ff;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:600;box-shadow:0 4px 12px rgba(30,88,255,0.25);">返回商城首页</a>
                </div>
            </div>
        `;
    }

    /**
     * 页面渲染调度器
     */
    async function render() {
        const app = document.getElementById('app');
        if (!app) return;

        if (!state.token) {
            // 未登录状态：前置安全访问密钥校验
            const entryKey = localStorage.getItem('ql_admin_entry_key') || '';
            const verifyRes = await api.post('/admin/auth/verifyEntryKey', { entry_key: entryKey });
            if (!verifyRes || verifyRes.code !== 200 || !verifyRes.data || verifyRes.data.valid !== true) {
                renderForbiddenDisguise(app);
                return;
            }
            document.title = '启灵回收 · 管理后台';
            renderLogin(app);
            return;
        }

        document.title = '启灵回收 · 管理后台';
        renderMainLayout(app);
    }

    /**
     * 渲染登录视图
     */
    function renderLogin(container) {
        container.innerHTML = `
            <div class="login-wrap">
                <div class="login-card">
                    <div class="login-logo">
                        <div style="width:48px;height:48px;background:#1e58ff;color:#fff;border-radius:12px;margin:0 auto;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:bold;">启</div>
                        <h2>启灵回收管理系统</h2>
                        <p style="color:#64748b;font-size:13px;margin-top:4px;">回收业务综合管理后台</p>
                    </div>
                    <form id="login-form">
                        <div class="login-form-group">
                            <label>管理员账号</label>
                            <input type="text" id="login-username" value="admin" placeholder="请输入管理员账号" required>
                        </div>
                        <div class="login-form-group">
                            <label>登录密码</label>
                            <input type="password" id="login-password" placeholder="请输入登录密码" required>
                        </div>
                        <button type="submit" class="btn-login" id="btn-login">立即进入工作台</button>
                    </form>
                </div>
            </div>
        `;

        document.getElementById('login-form')?.addEventListener('submit', async function (e) {
            e.preventDefault();
            const u = document.getElementById('login-username')?.value.trim();
            const p = document.getElementById('login-password')?.value;
            const btn = document.getElementById('btn-login');
            if (btn) btn.innerText = '登录验证中...';

            const entryKey = localStorage.getItem('ql_admin_entry_key') || '';
            const res = await api.post('/admin/auth/login', { username: u, password: p, entry_key: entryKey });
            if (res && res.code === 200) {
                state.token = res.data.token;
                state.admin = res.data.userinfo;
                localStorage.setItem('ql_admin_token', state.token);
                localStorage.setItem('ql_admin_info', JSON.stringify(state.admin));
                state.currentTab = 'dashboard';
                await preloadBaseData();
                await render();
            } else if (res && res.code === 404) {
                // 安全密钥校验未通过，伪装为 404
                const app = document.getElementById('app');
                if (app) renderForbiddenDisguise(app);
            } else {
                SysUI.toast(res ? res.msg : '登录失败，请检查账号密码', 'error');
                if (btn) btn.innerText = '立即进入工作台';
            }
        });
    }

    /**
     * 渲染主工作台框架
     */
    function renderMainLayout(container) {
        const tabs = [
            { id: 'dashboard', name: '数据概览', icon: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z' },
            { id: 'templates', name: '主题风格', icon: 'M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 19.4c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.9-1.9C9.31 19.57 10.6 20 12 20c4.97 0 9-4.03 9-9s-4.03-9-9-9zm0 15c-1.25 0-2.42-.36-3.41-.98l-.24-.15-2.06 2.06.69-.69-.69.69 1.37-1.37-.15-.24C6.86 15.42 6.5 14.25 6.5 13c0-3.03 2.47-5.5 5.5-5.5s5.5 2.47 5.5 5.5-2.47 5.5-5.5 5.5z' },
            { id: 'decoration', name: '首页装修', icon: 'M4 4h7V2H4c-1.1 0-2 .9-2 2v7h2V4zm6 9l-4 5h12l-3-4-2.03 2.71L10 13zm7-4.5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5.67 1.5 1.5 1.5 1.5-.67 1.5-1.5zM20 2h-7v2h7v7h2V4c0-1.1-.9-2-2-2zm0 18h-7v2h7c1.1 0 2-.9 2-2v-7h-2v7zM4 13H2v7c0 1.1.9 2 2 2h7v-2H4v-7z' },
            { id: 'miniapp', name: '小程序装修', icon: 'M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z' },
            { id: 'devices', name: '品类与商品', icon: 'M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z' },
            { id: 'questions', name: '估价设置', icon: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z' },
            { id: 'media', name: '图库管理', icon: 'M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z' },
            { id: 'stores', name: '门店管理', icon: 'M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z' },
            { id: 'articles', name: '文章单页', icon: 'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z' },
            { id: 'orders', name: '订单管理', icon: 'M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z' },
            { id: 'inspection', name: '质检验收', icon: 'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z' },
            { id: 'users', name: '用户管理', icon: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z' },
            { id: 'payout', name: '财务放款', icon: 'M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z' },
            { id: 'coupons', name: '加价补贴券', icon: 'M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4c-1.1 0-2 .9-2 2s.9 2 2 2v4H4v-4c1.1 0 2-.9 2-2s-.9-2-2-2V6h16v2z' },
            { id: 'settings', name: '系统设置', icon: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z' },
            { id: 'menu', name: '导航菜单', icon: 'M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z' },
            { id: 'database', name: '数据库维护', icon: 'M12 2C6.48 2 2 4.02 2 6.5v11C2 19.98 6.48 22 12 22s10-2.02 10-4.5v-11C22 4.02 17.52 2 12 2zm0 2c4.42 0 8 1.57 8 2.5S16.42 9 12 9s-8-1.57-8-2.5S7.58 4 12 4zm0 16c-4.42 0-8-1.57-8-2.5V17c1.78 1.25 4.7 2 8 2s6.22-.75 8-2v.5c0 .93-3.58 2.5-8 2.5zm0-4.5c-4.42 0-8-1.57-8-2.5V12.5c1.78 1.25 4.7 2 8 2s6.22-.75 8-2v.5c0 .93-3.58 2.5-8 2.5zm0-4.5c-4.42 0-8-1.57-8-2.5V8c1.78 1.25 4.7 2 8 2s6.22-.75 8-2v.5c0 .93-3.58 2.5-8 2.5z' },
            { id: 'cache', name: '缓存管理', icon: 'M13 2.05v3.03c3.39.49 6 3.39 6 6.92 0 .9-.18 1.75-.48 2.54l2.6 1.53c.56-1.24.88-2.62.88-4.07 0-5.18-3.95-9.45-9-9.92zM12 19c-3.87 0-7-3.13-7-7 0-3.53 2.61-6.43 6-6.92V2.05c-5.06.47-9 4.75-9 9.95 0 5.52 4.47 10 9.99 10 3.31 0 6.24-1.61 8.01-4.09l-2.49-1.46C16.27 17.84 14.28 19 12 19zm1-7V7l-5 7h4v5l5-7h-4z' },
        ];

        let menuHtml = '';
        tabs.forEach(t => {
            const activeClass = state.currentTab === t.id ? 'active' : '';
            menuHtml += `<div class="menu-item ${activeClass}" data-tab="${t.id}">
                <span class="menu-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="${t.icon}"/></svg></span>
                <span>${t.name}</span>
            </div>`;
        });

        const activeTplName = state.templateMeta.name || '通用模式';

        container.innerHTML = `
            <div class="app-wrapper">
                <aside class="app-sidebar">
                    <div class="sidebar-brand">
                        <div class="logo-icon">启</div>
                        <div>
                            <div style="font-size:15px;">启灵回收系统</div>
                            <div style="font-size:11px;color:#94a3b8;font-weight:normal;">管理后台</div>
                        </div>
                    </div>
                    <nav class="sidebar-menu">
                        ${menuHtml}
                    </nav>
                </aside>
                <div class="app-main">
                    <header class="app-header">
                        <div style="display:flex;align-items:center;gap:12px;">
                            <div class="header-title">${tabs.find(t => t.id === state.currentTab)?.name || ''}</div>
                            <span class="badge" style="background:#e0e7ff;color:#3730a3;font-size:12px;padding:3px 10px;">当前模式：${escapeHtml(activeTplName)}</span>
                            <span id="header-license-badge" style="cursor:pointer;font-size:12px;padding:3px 10px;border-radius:12px;display:none;"></span>
                        </div>
                        <div class="header-user" style="display:flex;align-items:center;gap:14px;">
                            <a href="../../index.html" target="_blank" style="font-size:13px;color:#1e58ff;text-decoration:none;font-weight:600;display:flex;align-items:center;gap:4px;"><svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>访问前台</a>
                            <span class="user-badge" id="btn-admin-profile" style="cursor:pointer;" title="管理员设置">${escapeHtml(state.admin.realname || '管理员')} (${escapeHtml(state.admin.role || 'admin')})</span>
                            <button class="btn-logout" id="btn-logout">退出</button>
                        </div>
                    </header>
                    <main class="content-body" id="tab-content">
                        <!-- 动态载入具体视图 -->
                    </main>
                </div>
            </div>
        `;

        // 绑定顶部授权徽章点击直达正版授权配置
        const licBadge = document.getElementById('header-license-badge');
        if (licBadge) {
            licBadge.addEventListener('click', function() {
                state.currentTab = 'settings';
                render();
                setTimeout(() => {
                    const btnLic = document.querySelector('button[data-target="panel-license"]');
                    if (btnLic) btnLic.click();
                }, 60);
            });
            // 异步刷新顶部授权徽章状态
            api.get('/admin/license/getInfo').then(res => {
                if (!licBadge || !res || res.code !== 200 || !res.data) return;
                const st = res.data.status;
                licBadge.style.display = 'inline-block';
                if (st === 'valid') {
                    licBadge.style.background = '#dcfce7';
                    licBadge.style.color = '#15803d';
                    licBadge.innerText = '● 正版授权';
                    licBadge.title = '系统已成功激活官方正版商业授权 (永久有效)';
                } else if (st === 'local_dev') {
                    licBadge.style.background = '#e0f2fe';
                    licBadge.style.color = '#0369a1';
                    licBadge.innerText = '● 本地开发';
                    licBadge.title = '本地调试环境免授权';
                } else {
                    licBadge.style.background = '#fee2e2';
                    licBadge.style.color = '#b91c1c';
                    licBadge.innerText = '● 未授权 (点击配置)';
                    licBadge.title = '尚未激活商业正版授权，点击前往配置';
                }
            }).catch(() => {});
        }

        // 绑定管理员右上角徽章点击直达管理员设置
        document.getElementById('btn-admin-profile')?.addEventListener('click', function () {
            state.currentTab = 'users';
            state.usersActiveTab = 'admin';
            render();
        });

        // 绑定菜单切换
        document.querySelectorAll('.menu-item').forEach(el => {
            el.addEventListener('click', function () {
                const targetTab = this.getAttribute('data-tab');
                if (targetTab && state.currentTab !== targetTab) {
                    state.currentTab = targetTab;
                    render();
                }
            });
        });

        // 绑定退出
        document.getElementById('btn-logout')?.addEventListener('click', async function () {
            const confirmed = await SysUI.confirm('确认退出系统吗？', {
                title: '退出确认',
                type: 'warning',
                confirmText: '退出登录',
                isDanger: false
            });
            if (confirmed) {
                state.token = '';
                localStorage.removeItem('ql_admin_token');
                render();
            }
        });

        // 加载当前 Tab 内容
        loadTabContent(state.currentTab);
    }

    /**
     * 根据 Tab 加载具体视图内容
     */
    function loadTabContent(tab) {
        const contentBox = document.getElementById('tab-content');
        if (!contentBox) return;

        switch (tab) {
            case 'dashboard':
                if (typeof window.renderDashboardView === 'function') {
                    window.renderDashboardView(contentBox);
                }
                break;
            case 'templates':
                if (typeof window.renderTemplatesView === 'function') {
                    window.renderTemplatesView(contentBox);
                }
                break;
            case 'decoration':
                if (typeof window.renderDecorationView === 'function') {
                    window.renderDecorationView(contentBox);
                }
                break;
            case 'miniapp':
                if (typeof window.renderMiniappDecorationView === 'function') {
                    window.renderMiniappDecorationView(contentBox);
                }
                break;
            case 'questions':
                if (typeof window.renderQuestionsView === 'function') {
                    window.renderQuestionsView(contentBox);
                }
                break;
            case 'orders':
                if (typeof window.renderOrdersView === 'function') {
                    window.renderOrdersView(contentBox);
                }
                break;
            case 'inspection':
                if (typeof window.renderInspectionView === 'function') {
                    window.renderInspectionView(contentBox);
                }
                break;
            case 'devices':
                if (typeof window.renderDevicesView === 'function') {
                    window.renderDevicesView(contentBox);
                }
                break;
            case 'media':
                if (typeof window.renderMediaView === 'function') {
                    window.renderMediaView(contentBox);
                }
                break;
            case 'stores':
                if (typeof window.renderStoresView === 'function') {
                    window.renderStoresView(contentBox);
                }
                break;
            case 'articles':
                if (typeof window.renderArticlesView === 'function') {
                    window.renderArticlesView(contentBox);
                }
                break;
            case 'users':
                if (typeof window.renderUsersView === 'function') {
                    window.renderUsersView(contentBox);
                }
                break;
            case 'payout':
                if (typeof window.renderPayoutView === 'function') {
                    window.renderPayoutView(contentBox);
                }
                break;
            case 'coupons':
                if (typeof window.renderCouponsView === 'function') {
                    window.renderCouponsView(contentBox);
                }
                break;
            case 'database':
                if (typeof window.renderDatabaseView === 'function') {
                    window.renderDatabaseView(contentBox);
                }
                break;
            case 'cache':
                if (typeof window.renderCacheView === 'function') {
                    window.renderCacheView(contentBox);
                }
                break;
            case 'settings':
                if (typeof window.renderSettingsView === 'function') {
                    window.renderSettingsView(contentBox);
                }
                break;
            case 'menu':
                if (typeof window.renderMenuView === 'function') {
                    window.renderMenuView(contentBox);
                }
                break;
            default:
                contentBox.innerHTML = '<div class="card">模块准备就绪</div>';
        }
    }

    /**
     * 跨模块全局导航函数
     */
    window.navigateToTab = function (tab) {
        state.currentTab = tab;
        render();
    };

    window.loadTabContent = loadTabContent;
    window.render = render;
    window.renderLogin = renderLogin;
    window.renderMainLayout = renderMainLayout;
    window.preloadBaseData = preloadBaseData;

    /**
     * 启动初始渲染 (安全访问密钥解析与加载)
     */
    async function bootstrap() {
        // 1. 优先提取并解析 URL 地址栏中的安全访问密钥参数 (支持 entry_key, key, safe_key, secret)
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const queryEntryKey = urlParams.get('entry_key') || urlParams.get('key') || urlParams.get('safe_key') || urlParams.get('secret') || '';
            if (queryEntryKey) {
                localStorage.setItem('ql_admin_entry_key', queryEntryKey);
                // 清除地址栏参数，防止分享/浏览器历史外泄
                urlParams.delete('entry_key');
                urlParams.delete('key');
                urlParams.delete('safe_key');
                urlParams.delete('secret');
                const cleanSearch = urlParams.toString() ? '?' + urlParams.toString() : '';
                window.history.replaceState({}, document.title, window.location.pathname + cleanSearch + window.location.hash);
            }
        } catch (e) {
            console.error('解析入口密钥参数异常:', e);
        }

        // 2. 执行前置渲染与鉴权状态检测
        await render();
        if (state.token) {
            try {
                await preloadBaseData();
                await render();
            } catch (err) {
                console.error('基础配置预加载异常:', err);
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }
})(window);
