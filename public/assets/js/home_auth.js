/**
 * 启灵同城服务系统 - 前台会员认证与用户中心模块
 * 包含用户登录注册、个人资料、收款方式、账号注销与订单追踪
 */
(function(window) {
    'use strict';

    const HomeApp = window.HomeApp || {};
    const state = HomeApp.state || {};
    const api = HomeApp.api || {};
    const SysUI = HomeApp.SysUI || window.SysUI;
    const escapeHtml = HomeApp.escapeHtml || window.escapeHtml || function(s) { return s; };
    const getStatusBadge = HomeApp.getStatusBadge || window.getStatusBadge || function(s) { return s; };

            function renderUserNav() {
                const box = document.getElementById('nav-user-box');
                if (!box) return;

                if (!state.userToken || !state.userInfo) {
                    box.innerHTML = `
                        <button class="btn btn-outline" id="btn-open-auth">
                            <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" style="margin-right:6px;"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                            登录 / 注册
                        </button>
                    `;
                    document.getElementById('btn-open-auth')?.addEventListener('click', () => {
                        window.openAuthModal('login');
                    });
                    return;
                }

                const u = state.userInfo;
                const showName = u.nickname || u.mobile || '会员中心';
                const avatarLetter = (u.nickname ? u.nickname.trim().substring(0, 1) : (u.mobile ? u.mobile.substring(7) : '用')).toUpperCase();

                box.innerHTML = `
                    <div class="user-pill-wrap" id="user-pill-wrap">
                        <div class="user-pill" id="user-pill-btn">
                            <div class="user-avatar-circle">${escapeHtml(avatarLetter)}</div>
                            <span style="max-width:96px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(showName)}</span>
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
                        </div>
                        <div class="user-dropdown-menu" id="user-dropdown-menu">
                            <div class="user-menu-header">
                                <div style="font-weight:700;font-size:13px;color:var(--text-main);">${escapeHtml(u.nickname || '启灵会员')}</div>
                                <div style="font-size:11px;color:var(--text-muted);font-family:monospace;">${escapeHtml(u.mobile || '')}</div>
                            </div>
                            <div class="user-menu-item" onclick="window.openUserCenter('overview')">
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>
                                <span>个人中心总览</span>
                            </div>
                            <div class="user-menu-item" onclick="window.openUserCenter('orders')">
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>
                                <span>我的回收订单</span>
                            </div>
                            <div class="user-menu-item" onclick="window.openUserCenter('payout')">
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
                                <span>常用收款账户</span>
                            </div>
                            <div class="user-menu-item" onclick="window.openUserCenter('address')">
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                                <span>常用地址</span>
                            </div>
                            <div class="user-menu-divider"></div>
                            <div class="user-menu-item user-menu-logout" onclick="window.doUserLogout()">
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg>
                                <span>退出登录</span>
                            </div>
                        </div>
                    </div>
                `;

                document.getElementById('user-pill-btn')?.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const menu = document.getElementById('user-dropdown-menu');
                    menu?.classList.toggle('show');
                });
            }

            // 点击页面空白处关闭下拉菜单
            document.addEventListener('click', () => {
                document.getElementById('user-dropdown-menu')?.classList.remove('show');
            });

            async function refreshUserProfile() {
                if (!state.userToken) return;
                const res = await api.request('/api/user/profile');
                if (res && res.code === 200) {
                    state.userInfo = res.data;
                    state.userMobile = res.data.mobile || state.userMobile;
                    localStorage.setItem('ql_user_info', JSON.stringify(res.data));
                    localStorage.setItem('ql_user_mobile', state.userMobile);
                    renderUserNav();
                }
                loadUserCoupons();
            }

                        window.openAuthModal = function(preferredTab = 'login') {
                const meta = state.platformMeta || {};
                const passwordEnabled = meta.user_auth_password_enabled !== false;
                const registerEnabled = meta.user_register_enabled !== false;

                // 动态控制各 Tab 按钮显隐
                const tabLogin = document.getElementById('tab-auth-login');
                const tabRegister = document.getElementById('tab-auth-register');

                if (tabLogin) tabLogin.style.display = passwordEnabled ? 'block' : 'none';
                if (tabRegister) tabRegister.style.display = registerEnabled ? 'block' : 'none';

                let activeTab = preferredTab === 'register' ? 'register' : 'login';
                if (activeTab === 'login' && !passwordEnabled) {
                    activeTab = registerEnabled ? 'register' : '';
                }
                if (activeTab === 'register' && !registerEnabled) {
                    activeTab = passwordEnabled ? 'login' : '';
                }

                if (!activeTab) {
                    SysUI.toast('系统当前暂未开放用户登录/注册通道', 'warning');
                    return;
                }

                window.switchAuthTab(activeTab);
                document.getElementById('modal-user-auth').style.display = 'flex';
            };

            window.switchAuthTab = function(tab) {
                const tabs = ['login', 'register'];
                tabs.forEach(t => {
                    const btn = document.getElementById('tab-auth-' + t);
                    const form = document.getElementById('form-auth-' + t);
                    if (t === tab) {
                        if (btn) {
                            btn.style.background = '#fff';
                            btn.style.color = 'var(--primary)';
                            btn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                        }
                        if (form) form.style.display = 'block';
                    } else {
                        if (btn) {
                            btn.style.background = 'transparent';
                            btn.style.color = '#64748b';
                            btn.style.boxShadow = 'none';
                        }
                        if (form) form.style.display = 'none';
                    }
                });
            };

            // 监听表单：账号登录
            document.getElementById('form-auth-login')?.addEventListener('submit', async function(e) {
                e.preventDefault();
                const m = document.getElementById('auth-login-mobile')?.value.trim();
                const p = document.getElementById('auth-login-password')?.value;
                const btn = document.getElementById('btn-submit-login');
                btn.innerText = '登录验证中...';

                const res = await api.request('/api/user/login', 'POST', { mobile: m, password: p });
                btn.innerText = '立即登录';
                if (res && res.code === 200) {
                    state.userToken = res.data.token;
                    state.userInfo = res.data.userinfo;
                    state.userMobile = res.data.userinfo.mobile || m;
                    localStorage.setItem('ql_user_token', state.userToken);
                    localStorage.setItem('ql_user_info', JSON.stringify(state.userInfo));
                    localStorage.setItem('ql_user_mobile', state.userMobile);
                    document.getElementById('modal-user-auth').style.display = 'none';
                    renderUserNav();
                    SysUI.toast('登录成功！欢迎回来', 'success');
                    applyUserDefaultToForm();
                } else {
                    SysUI.toast(res ? res.msg : '登录失败，请检查账号密码', 'error');
                }
            });

            // 监听表单：注册新账号
            document.getElementById('form-auth-register')?.addEventListener('submit', async function(e) {
                e.preventDefault();
                const m = document.getElementById('auth-reg-mobile')?.value.trim();
                const p = document.getElementById('auth-reg-password')?.value;
                const nick = document.getElementById('auth-reg-nickname')?.value.trim();
                const btn = document.getElementById('btn-submit-register');
                btn.innerText = '注册提交中...';

                const res = await api.request('/api/user/register', 'POST', { mobile: m, password: p, nickname: nick });
                btn.innerText = '立即注册并登录';
                if (res && res.code === 200) {
                    state.userToken = res.data.token;
                    state.userInfo = res.data.userinfo;
                    state.userMobile = res.data.userinfo.mobile || m;
                    localStorage.setItem('ql_user_token', state.userToken);
                    localStorage.setItem('ql_user_info', JSON.stringify(state.userInfo));
                    localStorage.setItem('ql_user_mobile', state.userMobile);
                    document.getElementById('modal-user-auth').style.display = 'none';
                    renderUserNav();
                    SysUI.toast('注册成功！已为您自动登录', 'success');
                    applyUserDefaultToForm();
                } else {
                    SysUI.toast(res ? res.msg : '注册失败', 'error');
                }
            });

            // 自动将用户预设信息带入正在填写的估价/履约表单
            function applyUserDefaultToForm() {
                if (!state.userInfo) return;
                const u = state.userInfo;
                const nameInp = document.getElementById('contact-name');
                const mobileInp = document.getElementById('contact-mobile');
                const addrInp = document.getElementById('contact-address');
                if (nameInp && !nameInp.value) nameInp.value = u.realname || u.nickname || '';
                if (mobileInp && !mobileInp.value) mobileInp.value = u.mobile || state.userMobile || '';
                if (addrInp && !addrInp.value && u.default_address) addrInp.value = u.default_address;

                if (u.default_payout_type && typeof window.selectPayout === 'function') {
                    window.selectPayout(u.default_payout_type);
                    setTimeout(() => {
                        const pName = document.getElementById('payout-name');
                        const pAcc = document.getElementById('payout-account');
                        const pBank = document.getElementById('payout-bank');
                        if (pName && u.default_payout_name) pName.value = u.default_payout_name;
                        if (pAcc && u.default_payout_account) pAcc.value = u.default_payout_account;
                        if (pBank && u.default_payout_bank) pBank.value = u.default_payout_bank;
                    }, 50);
                }
            }

            // 打开个人中心工作台
            window.openUserCenter = async function(tab = 'overview') {
                if (!state.userToken) {
                    window.openAuthModal('login');
                    return;
                }
                document.getElementById('user-dropdown-menu')?.classList.remove('show');
                document.getElementById('modal-user-center').style.display = 'flex';
                window.switchUcTab(tab);
                await refreshUserProfile();
                syncUcFormData();
            };

            function syncUcFormData() {
                if (!state.userInfo) return;
                const u = state.userInfo;
                const nameShow = u.nickname || u.mobile || '启灵会员';
                document.getElementById('uc-header-name').innerText = nameShow;
                document.getElementById('uc-header-mobile').innerText = u.mobile ? `绑定手机：${u.mobile}` : '微信授权账号';
                document.getElementById('uc-header-avatar').innerText = (u.nickname ? u.nickname.trim().substring(0, 1) : '用').toUpperCase();

                // 资料
                document.getElementById('uc-profile-nickname').value = u.nickname || '';
                document.getElementById('uc-profile-realname').value = u.realname || '';

                // 统计看板
                if (u.order_stats) {
                    document.getElementById('uc-stat-pending').innerText = u.order_stats.pending_send_count || 0;
                    document.getElementById('uc-stat-inspecting').innerText = u.order_stats.inspecting_count || 0;
                    document.getElementById('uc-stat-confirming').innerText = u.order_stats.price_confirming_count || 0;
                    document.getElementById('uc-stat-income').innerText = `¥ ${u.order_stats.total_income || '0.00'}`;
                }

                // 常用收款预设
                const pType = u.default_payout_type || 'alipay';
                const radios = document.getElementsByName('uc-payout-type');
                radios.forEach(r => { r.checked = (r.value === pType); });
                window.onUcPayoutTypeChange(pType);
                document.getElementById('uc-payout-name').value = u.default_payout_name || '';
                document.getElementById('uc-payout-account').value = u.default_payout_account || '';
                document.getElementById('uc-payout-bank').value = u.default_payout_bank || '';

                // 常用地址
                document.getElementById('uc-default-address').value = u.default_address || '';

                // 同步注销申请状态
                syncDeregisterPanel();
            }

            window.switchUcTab = function(tab) {
                const tabs = ['overview', 'orders', 'coupons', 'payout', 'address', 'security', 'deregister'];
                tabs.forEach(t => {
                    const btn = document.getElementById('uc-tab-' + t);
                    const panel = document.getElementById('uc-panel-' + t);
                    if (t === tab) {
                        btn?.classList.add('active');
                        if (panel) panel.style.display = 'block';
                    } else {
                        btn?.classList.remove('active');
                        if (panel) panel.style.display = 'none';
                    }
                });

                if (tab === 'orders') {
                    window.loadUcOrders();
                } else if (tab === 'coupons') {
                    window.loadUcCoupons();
                } else if (tab === 'deregister') {
                    syncDeregisterPanel();
                }
            };

            window.onUcPayoutTypeChange = function(type) {
                const inputs = document.getElementById('uc-payout-inputs');
                const bankBox = document.getElementById('uc-payout-bank-box');
                if (type === 'cash') {
                    if (inputs) inputs.style.display = 'none';
                } else {
                    if (inputs) inputs.style.display = 'block';
                    if (bankBox) bankBox.style.display = (type === 'bank') ? 'block' : 'none';
                }
            };

            window.saveBasicProfile = async function() {
                const nick = document.getElementById('uc-profile-nickname').value.trim();
                const real = document.getElementById('uc-profile-realname').value.trim();
                const res = await api.request('/api/user/updateProfile', 'POST', { nickname: nick, realname: real });
                if (res && res.code === 200) {
                    SysUI.toast('个人资料已成功保存', 'success');
                    await refreshUserProfile();
                } else {
                    SysUI.toast(res ? res.msg : '保存失败', 'error');
                }
            };

            window.saveDefaultPayout = async function() {
                let pType = 'alipay';
                const radios = document.getElementsByName('uc-payout-type');
                radios.forEach(r => { if (r.checked) pType = r.value; });

                const pName = document.getElementById('uc-payout-name').value.trim();
                const pAcc = document.getElementById('uc-payout-account').value.trim();
                const pBank = document.getElementById('uc-payout-bank').value.trim();

                const res = await api.request('/api/user/savePayoutConfig', 'POST', {
                    default_payout_type: pType,
                    default_payout_name: pName,
                    default_payout_account: pAcc,
                    default_payout_bank: pBank
                });
                if (res && res.code === 200) {
                    SysUI.toast('常用收款账户已保存！下单时将自动填入', 'success');
                    await refreshUserProfile();
                } else {
                    SysUI.toast(res ? res.msg : '保存收款设置失败', 'error');
                }
            };

            window.saveDefaultAddress = async function() {
                const addr = document.getElementById('uc-default-address').value.trim();
                const res = await api.request('/api/user/saveAddress', 'POST', { default_address: addr });
                if (res && res.code === 200) {
                    SysUI.toast('常用地址已保存', 'success');
                    await refreshUserProfile();
                } else {
                    SysUI.toast(res ? res.msg : '保存失败', 'error');
                }
            };

            window.saveNewPassword = async function() {
                const oldPwd = document.getElementById('uc-old-pwd').value;
                const newPwd = document.getElementById('uc-new-pwd').value;
                const confirmPwd = document.getElementById('uc-confirm-pwd').value;
                if (!newPwd || newPwd.length < 6) {
                    SysUI.toast('新密码长度不能少于6位', 'warning');
                    return;
                }
                if (newPwd !== confirmPwd) {
                    SysUI.toast('两次输入的新密码不一致', 'warning');
                    return;
                }

                const res = await api.request('/api/user/changePassword', 'POST', {
                    old_password: oldPwd,
                    new_password: newPwd
                });
                if (res && res.code === 200) {
                    SysUI.toast('密码已成功修改！', 'success');
                    document.getElementById('uc-old-pwd').value = '';
                    document.getElementById('uc-new-pwd').value = '';
                    document.getElementById('uc-confirm-pwd').value = '';
                } else {
                    SysUI.toast(res ? res.msg : '修改密码失败', 'error');
                }
            };

            // 同步账号注销申请面板视图
            function syncDeregisterPanel() {
                const u = state.userInfo;
                if (!u) return;

                const pendingBox = document.getElementById('uc-deregister-pending-box');
                const rejectedBox = document.getElementById('uc-deregister-rejected-box');
                const formBox = document.getElementById('uc-deregister-form-box');

                if (!pendingBox || !rejectedBox || !formBox) return;

                const status = u.deregister_status || 'none';
                if (status === 'pending') {
                    pendingBox.style.display = 'block';
                    rejectedBox.style.display = 'none';
                    formBox.style.display = 'none';
                    const timeEl = document.getElementById('uc-deregister-pending-time');
                    const reasonEl = document.getElementById('uc-deregister-pending-reason');
                    if (timeEl) timeEl.innerText = u.deregister_apply_time || '--';
                    if (reasonEl) reasonEl.innerText = u.deregister_reason || '自愿申请注销';
                } else if (status === 'rejected') {
                    pendingBox.style.display = 'none';
                    rejectedBox.style.display = 'block';
                    formBox.style.display = 'block';
                    const rejectReasonEl = document.getElementById('uc-deregister-rejected-reason');
                    if (rejectReasonEl) rejectReasonEl.innerText = u.deregister_reject_reason || '经审核不符合注销条件';
                } else {
                    pendingBox.style.display = 'none';
                    rejectedBox.style.display = 'none';
                    formBox.style.display = 'block';
                }
            }

            window.onDeregisterReasonSelect = function(val) {
                const box = document.getElementById('uc-deregister-reason-custom-box');
                if (box) box.style.display = (val === 'other') ? 'block' : 'none';
            };

            window.submitDeregisterApply = async function() {
                const agree = document.getElementById('uc-deregister-agree');
                if (agree && !agree.checked) {
                    SysUI.toast('请先阅读并勾选同意注销须知', 'warning');
                    return;
                }

                const sel = document.getElementById('uc-deregister-reason-select');
                let reason = sel ? sel.value : '';
                if (reason === 'other') {
                    reason = (document.getElementById('uc-deregister-custom-reason')?.value || '').trim();
                    if (!reason) {
                        SysUI.toast('请填写具体的注销原因说明', 'warning');
                        return;
                    }
                }

                if (!confirm('提交后将由平台管理员人工核验。确认要申请注销当前账号吗？')) {
                    return;
                }

                const res = await api.request('/api/user/applyDeregister', 'POST', { reason: reason });
                if (res && res.code === 200) {
                    SysUI.toast('注销申请已提交，等待平台管理员审核', 'success');
                    await refreshUserProfile();
                    syncDeregisterPanel();
                } else {
                    SysUI.toast(res ? res.msg : '提交申请失败，请稍后重试', 'error');
                }
            };

            window.cancelDeregisterApply = async function() {
                if (!confirm('确认要撤回本次账号注销申请吗？')) {
                    return;
                }

                const res = await api.request('/api/user/cancelDeregister', 'POST');
                if (res && res.code === 200) {
                    SysUI.toast('已成功撤回注销申请', 'success');
                    await refreshUserProfile();
                    syncDeregisterPanel();
                } else {
                    SysUI.toast(res ? res.msg : '撤回失败，请稍后重试', 'error');
                }
            };


            window.loadUcOrders = async function() {
                const box = document.getElementById('uc-orders-list-box');
                if (!box) return;
                box.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-muted);">正在加载您的回收订单记录...</div>';

                const res = await api.request('/api/order/list&status=all&page=1');
                if (res && res.code === 200) {
                    const list = res.data || [];
                    if (list.length === 0) {
                        box.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);">暂无回收订单，快去首页发起一笔高价估价吧！</div>';
                        return;
                    }

                    let html = '';
                    list.forEach(o => {
                        const fulfillmentMap = { 'home': '预约免费上门', 'mail': '快速寄送', 'store': '线下门店自送' };
                        const payoutMap = { 'alipay': '支付宝', 'bank': '银行转账', 'wechat': '微信钱包', 'cash': '现场现金' };
                        let fText = fulfillmentMap[o.fulfillment_type] || o.fulfillment_type;
                        if (o.fulfillment_type === 'mail') {
                            if (o.mail_sub_type === 'sf_pickup') {
                                fText += ' · <span class="badge" style="background:#e0f2fe;color:#0369a1;font-size:11px;padding:2px 6px;">顺丰上门取件</span>';
                            } else if (o.mail_sub_type === 'self_delivery') {
                                fText += ' · <span class="badge" style="background:#f1f5f9;color:#475569;font-size:11px;padding:2px 6px;">自行寄送</span>';
                            }
                        }
                        const pText = payoutMap[o.payout_type] || o.payout_type;
                        const pDetail = o.payout_account ? ` (${escapeHtml(o.payout_account)})` : '';
                        const expressText = o.express_sn 
                            ? `<div style="font-size:12px;color:var(--text-muted);margin-top:4px;">寄件物流：<strong style="color:var(--text-main);">${escapeHtml(o.express_company || '快递')}</strong> · 运单号：<strong style="font-family:monospace;color:var(--primary);">${escapeHtml(o.express_sn)}</strong></div>` 
                            : '';

                        let actionBtn = '';
                        let negotiationCard = '';
                        const subAmount = parseFloat(o.subsidy_amount) || 0;

                        // 邮寄模式下支持填写或修改快递单号
                        if (o.fulfillment_type === 'mail' && (o.status === 'pending_send' || o.status === 'in_transit')) {
                            if (o.express_sn) {
                                actionBtn = `<button class="btn btn-outline" style="height:28px;padding:0 10px;font-size:12px;" onclick="window.openExpressModal(${o.id}, '${escapeHtml(o.order_sn)}', '${escapeHtml(o.contact_mobile || '')}', '${escapeHtml(o.express_company || '顺丰速运')}', '${escapeHtml(o.express_sn)}')">修改单号</button>`;
                            } else {
                                actionBtn = `<button class="btn btn-primary" style="height:28px;padding:0 12px;font-size:12px;" onclick="window.openExpressModal(${o.id}, '${escapeHtml(o.order_sn)}', '${escapeHtml(o.contact_mobile || '')}', '', '')">填写快递单号</button>`;
                            }
                        } else if (o.status === 'price_confirming') {
                            if (subAmount > 0 || o.negotiation_status) {
                                let statusTag = '';
                                let btns = '';
                                if (o.negotiation_status === 'accepted') {
                                    statusTag = '<span class="negotiation-rp-badge" style="background:#15803d;">已达成一致</span>';
                                    btns = '<div style="font-size:12px;color:#15803d;font-weight:600;">✓ 您已接受专享补贴方案，财务正加急安排打款放款</div>';
                                } else if (o.negotiation_status === 'rejected') {
                                    statusTag = '<span class="negotiation-rp-badge" style="background:#64748b;">已申请退回</span>';
                                    btns = '<div style="font-size:12px;color:#64748b;">您已选择退回设备，商品将通过原渠道返还</div>';
                                } else {
                                    statusTag = '<span class="negotiation-rp-badge">待您决策</span>';
                                    btns = `
                                        <div class="negotiation-rp-actions" style="margin-top:8px;">
                                            <button class="btn btn-primary" style="height:32px;padding:0 14px;font-size:12px;background:#ea580c;border-color:#ea580c;flex:1;" onclick="window.confirmOrderPrice(${o.id}, 'agree', '${escapeHtml(o.order_sn)}', '${escapeHtml(o.contact_mobile || '')}')">
                                                接受补贴并成交 (¥${escapeHtml(o.final_price || o.estimate_price)})
                                            </button>
                                            <button class="btn btn-outline" style="height:32px;padding:0 12px;font-size:12px;border-color:#cbd5e1;color:#64748b;" onclick="window.confirmOrderPrice(${o.id}, 'reject', '${escapeHtml(o.order_sn)}', '${escapeHtml(o.contact_mobile)}')">
                                                拒绝退回
                                            </button>
                                        </div>
                                    `;
                                }
                                negotiationCard = `
                                    <div class="negotiation-redpacket-card">
                                        <div class="negotiation-rp-header">
                                            <span class="negotiation-rp-title">
                                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.65-.5-.65C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1h-2.22l.74-.99c.35-.46.88-.01 1.48-.01zm-6 0c.6 0 1.13.55 1.48 1.01l.74.99H9c-.55 0-1-.45-1-1s.45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76V14h2V8.76L15.38 12 17 10.83 14.92 8H20v6z"/></svg>
                                                客服专享成交补贴红包
                                            </span>
                                            ${statusTag}
                                        </div>
                                        <div class="negotiation-rp-body">
                                            <div>
                                                <span style="font-size:12px;color:#9a3412;">专享加价补贴：</span>
                                                <span class="negotiation-rp-amount">+¥ ${subAmount.toFixed(2)}</span>
                                            </div>
                                            <div style="font-size:13px;color:#7c2d12;">
                                                最终打款成交价：<strong style="font-size:16px;color:#ea580c;">¥ ${escapeHtml(o.final_price || o.estimate_price)}</strong>
                                            </div>
                                        </div>
                                        ${o.negotiation_remark ? `<div class="negotiation-rp-remark"><strong>客服寄语：</strong>${escapeHtml(o.negotiation_remark)}</div>` : ''}
                                        ${btns}
                                    </div>
                                `;
                            } else {
                                actionBtn = `<button class="btn btn-success" style="height:28px;padding:0 12px;font-size:12px;" onclick="window.confirmOrderPrice(${o.id}, 'agree', '${escapeHtml(o.order_sn)}', '${escapeHtml(o.contact_mobile)}')">同意质检价放款</button>
                                             <button class="btn btn-outline" style="height:28px;padding:0 12px;font-size:12px;margin-left:6px;" onclick="window.confirmOrderPrice(${o.id}, 'reject', '${escapeHtml(o.order_sn)}', '${escapeHtml(o.contact_mobile)}')">拒绝退回</button>`;
                            }
                        }

                        const modeBadge = o.appraisal_mode === 'quick'
                            ? `<span style="font-size:11px;background:#fef3c7;color:#b45309;padding:1px 6px;border-radius:4px;margin-left:6px;">${escapeHtml(o.quick_tier_name || '极速成色')}</span>`
                            : `<span style="font-size:11px;background:#e0f2fe;color:#0369a1;padding:1px 6px;border-radius:4px;margin-left:6px;">专业精评</span>`;

                        html += `
                            <div style="background:#f8fafc;border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:12px;">
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                                    <strong style="font-size:14px;color:var(--text-main);">${escapeHtml(o.device_name)}${modeBadge}</strong>
                                    ${getStatusBadge(o.status)}
                                </div>
                                <div style="font-size:12px;color:var(--text-muted);line-height:1.6;">
                                    <div>订单单号：<strong style="font-family:monospace;color:var(--text-main);">${escapeHtml(o.order_sn)}</strong></div>
                                    <div>预估回收价：<strong style="color:var(--primary);font-size:14px;">¥ ${escapeHtml(o.estimate_price)}</strong> ${o.final_price ? `(质检核定成交: <strong style="color:var(--accent);">¥ ${escapeHtml(o.final_price)}</strong>)` : ''}</div>
                                    <div>履约方式：${fText}${o.fulfillment_type === 'store' && o.store_name ? ` (网点: ${escapeHtml(o.store_name)})` : ''} · 收款方式：${escapeHtml(pText)}${pDetail}</div>
                                    ${expressText}
                                </div>
                                ${negotiationCard}
                                ${actionBtn ? `<div style="margin-top:10px;display:flex;justify-content:flex-end;">${actionBtn}</div>` : ''}
                            </div>
                        `;
                    });
                    box.innerHTML = html;
                } else {
                    box.innerHTML = '<div style="text-align:center;padding:30px;color:var(--danger);">加载订单记录失败</div>';
                }
            };

            // 打开填写/修改寄件物流单号弹窗
            window.openExpressModal = function(orderId, orderSn, mobile, currentCompany, currentSn) {
                const idEl = document.getElementById('express-modal-order-id');
                const snEl = document.getElementById('express-modal-order-sn');
                const mobEl = document.getElementById('express-modal-mobile');
                const displaySnEl = document.getElementById('express-modal-sn-display');
                const compEl = document.getElementById('express-company-select');
                const inputEl = document.getElementById('express-sn-input');
                const titleEl = document.getElementById('express-modal-title');
                const receiveBox = document.getElementById('express-modal-receive-info');

                if (idEl) idEl.value = orderId || '';
                if (snEl) snEl.value = orderSn || '';
                if (mobEl) mobEl.value = mobile || state.userMobile || '';
                if (displaySnEl) displaySnEl.innerText = orderSn || ('ID: ' + orderId);
                if (compEl) compEl.value = currentCompany || '顺丰速运';
                if (inputEl) inputEl.value = currentSn || '';
                if (titleEl) titleEl.innerText = currentSn ? '修改寄件快递单号' : '填写寄件快递单号';

                if (receiveBox) {
                    const meta = state.platformMeta || {};
                    const contact = meta.sf_receive_contact || '平台质检仓';
                    const phone = meta.sf_receive_mobile || meta.service_tel || '官方客服专线';
                    const address = meta.sf_receive_address || '请联系在线客服获取质检仓收件地址';
                    receiveBox.innerHTML = `
                        <div>收件人：<strong>${escapeHtml(contact)}</strong> (收)</div>
                        <div>联系电话：<strong style="font-family:monospace;">${escapeHtml(phone)}</strong></div>
                        <div>收件地址：<span>${escapeHtml(address)}</span></div>
                    `;
                }

                const modal = document.getElementById('modal-express-input');
                if (modal) modal.style.display = 'flex';
            };

            window.closeExpressModal = function() {
                const modal = document.getElementById('modal-express-input');
                if (modal) modal.style.display = 'none';
            };

            window.promptExpress = function(orderId, orderSn, mobile, currentCompany, currentSn) {
                window.openExpressModal(orderId, orderSn, mobile, currentCompany, currentSn);
            };

            // 绑定提交快递单号事件
            document.getElementById('btn-submit-express-sn')?.addEventListener('click', async function() {
                const orderId = document.getElementById('express-modal-order-id')?.value;
                const orderSn = document.getElementById('express-modal-order-sn')?.value;
                const mobile = document.getElementById('express-modal-mobile')?.value;
                const expressCompany = document.getElementById('express-company-select')?.value;
                const expressSn = document.getElementById('express-sn-input')?.value.trim();

                if (!expressSn) {
                    SysUI.toast('请输入寄件快递运单号', 'warning');
                    return;
                }

                const btn = this;
                btn.disabled = true;
                btn.innerText = '正在提交...';

                const res = await api.request('/api/order/submitExpress', 'POST', {
                    order_id: orderId ? parseInt(orderId, 10) : 0,
                    order_sn: orderSn || '',
                    mobile: mobile || state.userMobile || '',
                    express_company: expressCompany,
                    express_sn: expressSn
                });

                btn.disabled = false;
                btn.innerText = '确认提交单号';

                if (res && res.code === 200) {
                    SysUI.toast('寄件单号提交成功！', 'success');
                    window.closeExpressModal();
                    if (typeof window.loadUcOrders === 'function') {
                        window.loadUcOrders();
                    }
                    const queryBtn = document.getElementById('btn-do-query-mobile');
                    const ordersModal = document.getElementById('modal-my-orders');
                    if (queryBtn && ordersModal && ordersModal.style.display !== 'none') {
                        queryBtn.click();
                    }
                } else {
                    SysUI.toast(res ? res.msg : '提交失败，请重试', 'error');
                }
            });

            window.confirmOrderPrice = async function(orderId, decision, orderSn = '', mobile = '') {
                const tip = decision === 'agree' ? '确认同意该价格方案并申请立即结清放款吗？' : '确认拒绝该价格并申请原路退回设备吗？';
                if (!confirm(tip)) return;
                const res = await api.request('/api/order/confirmPrice', 'POST', {
                    order_id: orderId,
                    decision: decision,
                    order_sn: orderSn,
                    mobile: mobile
                });
                if (res && res.code === 200) {
                    SysUI.toast(decision === 'agree' ? '已确认同意方案，系统已安排极速放款！' : '已申请退回，商品将原路返还', 'success');
                    if (typeof window.loadUcOrders === 'function') {
                        window.loadUcOrders();
                    }
                    const queryBtn = document.getElementById('btn-do-query-mobile');
                    if (queryBtn) {
                        queryBtn.click();
                    }
                    await refreshUserProfile();
                } else {
                    SysUI.toast(res ? res.msg : '操作失败', 'error');
                }
            };

            window.doUserLogout = async function() {
                await api.request('/api/user/logout', 'POST');
                state.userToken = '';
                state.userInfo = null;
                localStorage.removeItem('ql_user_token');
                localStorage.removeItem('ql_user_info');
                document.getElementById('modal-user-center').style.display = 'none';
                renderUserNav();
                SysUI.toast('已安全退出登录', 'info');
            };

    // 游客手机号快捷查单监听
            document.getElementById('btn-do-query-mobile')?.addEventListener('click', async function() {
                const mobile = document.getElementById('query-mobile-input')?.value.trim();
                if (!/^1[3-9]\d{9}$/.test(mobile)) {
                    SysUI.toast('请输入正确的11位手机号码', 'warning');
                    return;
                }

                const resultBox = document.getElementById('my-orders-result-box');
                resultBox.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-muted);">正在查询您的订单记录...</div>';

                const res = await api.request(`/api/order/queryByMobile&mobile=${encodeURIComponent(mobile)}`);
                if (res && res.code === 200) {
                    const list = res.data || [];
                    if (list.length === 0) {
                        resultBox.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-muted);">未查询到该手机号的回收订单记录</div>';
                        return;
                    }

                    let html = '';
                    list.forEach(o => {
                        const fulfillmentMap = { 'home': '预约免费上门', 'mail': '快速寄送', 'store': '线下门店自送' };
                        const payoutMap = { 'alipay': '支付宝', 'bank': '银行转账', 'wechat': '微信钱包', 'cash': '现场现金' };
                        let fText = fulfillmentMap[o.fulfillment_type] || o.fulfillment_type || '上门核验';
                        if (o.fulfillment_type === 'mail') {
                            if (o.mail_sub_type === 'sf_pickup') {
                                fText += ' · <span class="badge" style="background:#e0f2fe;color:#0369a1;font-size:11px;padding:2px 6px;">顺丰上门取件</span>';
                            } else if (o.mail_sub_type === 'self_delivery') {
                                fText += ' · <span class="badge" style="background:#f1f5f9;color:#475569;font-size:11px;padding:2px 6px;">自行寄送</span>';
                            }
                        }
                        const pText = payoutMap[o.payout_type] || o.payout_type || '线上结算';
                        const payoutDetail = o.payout_account ? ` (${escapeHtml(o.payout_account)})` : '';
                        const expressInfo = o.express_sn 
                            ? `<div style="font-size:12px;color:var(--text-muted);margin-top:4px;">寄件物流：<strong style="color:var(--text-main);">${escapeHtml(o.express_company || '快递')}</strong> · 运单号: <strong style="font-family:monospace;color:var(--primary);">${escapeHtml(o.express_sn)}</strong></div>` 
                            : '';

                        const modeBadge = o.appraisal_mode === 'quick'
                            ? `<span style="font-size:11px;background:#fef3c7;color:#b45309;padding:1px 6px;border-radius:4px;margin-left:6px;">${escapeHtml(o.quick_tier_name || '极速成色')}</span>`
                            : `<span style="font-size:11px;background:#e0f2fe;color:#0369a1;padding:1px 6px;border-radius:4px;margin-left:6px;">专业精评</span>`;

                        let actionBtn = '';
                        let negotiationCard = '';
                        const subAmount = parseFloat(o.subsidy_amount) || 0;

                        // 邮寄模式下支持录入/修改快递单号
                        if (o.fulfillment_type === 'mail' && (o.status === 'pending_send' || o.status === 'in_transit')) {
                            if (o.express_sn) {
                                actionBtn = `<button class="btn btn-outline" style="height:28px;padding:0 10px;font-size:12px;" onclick="window.openExpressModal(${o.id}, '${escapeHtml(o.order_sn)}', '${escapeHtml(o.contact_mobile || mobile)}', '${escapeHtml(o.express_company || '顺丰速运')}', '${escapeHtml(o.express_sn)}')">修改单号</button>`;
                            } else {
                                actionBtn = `<button class="btn btn-primary" style="height:28px;padding:0 12px;font-size:12px;" onclick="window.openExpressModal(${o.id}, '${escapeHtml(o.order_sn)}', '${escapeHtml(o.contact_mobile || mobile)}', '', '')">填写快递单号</button>`;
                            }
                        } else if (o.status === 'price_confirming') {
                            if (subAmount > 0 || o.negotiation_status) {
                                let statusTag = '';
                                let btns = '';
                                if (o.negotiation_status === 'accepted') {
                                    statusTag = '<span class="negotiation-rp-badge" style="background:#15803d;">已达成一致</span>';
                                    btns = '<div style="font-size:12px;color:#15803d;font-weight:600;">✓ 您已接受专享加价方案，系统正在为您极速放款</div>';
                                } else if (o.negotiation_status === 'rejected') {
                                    statusTag = '<span class="negotiation-rp-badge" style="background:#64748b;">已申请退回</span>';
                                    btns = '<div style="font-size:12px;color:#64748b;">您已选择退回设备，商品将通过原渠道返还</div>';
                                } else {
                                    statusTag = '<span class="negotiation-rp-badge">待您确认</span>';
                                    btns = `
                                        <div class="negotiation-rp-actions" style="margin-top:8px;">
                                            <button class="btn btn-primary" style="height:32px;padding:0 14px;font-size:12px;background:#ea580c;border-color:#ea580c;flex:1;" onclick="window.confirmOrderPrice(${o.id}, 'agree', '${escapeHtml(o.order_sn)}', '${escapeHtml(o.contact_mobile || '')}')">
                                                接受补贴并成交 (¥${escapeHtml(o.final_price || o.estimate_price)})
                                            </button>
                                            <button class="btn btn-outline" style="height:32px;padding:0 12px;font-size:12px;border-color:#cbd5e1;color:#64748b;" onclick="window.confirmOrderPrice(${o.id}, 'reject', '${escapeHtml(o.order_sn)}', '${escapeHtml(o.contact_mobile)}')">
                                                拒绝退回
                                            </button>
                                        </div>
                                    `;
                                }
                                negotiationCard = `
                                    <div class="negotiation-redpacket-card">
                                        <div class="negotiation-rp-header">
                                            <span class="negotiation-rp-title">
                                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.65-.5-.65C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1h-2.22l.74-.99c.35-.46.88-.01 1.48-.01zm-6 0c.6 0 1.13.55 1.48 1.01l.74.99H9c-.55 0-1-.45-1-1s.45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76V14h2V8.76L15.38 12 17 10.83 14.92 8H20v6z"/></svg>
                                                客服专享成交补贴红包
                                            </span>
                                            ${statusTag}
                                        </div>
                                        <div class="negotiation-rp-body">
                                            <div>
                                                <span style="font-size:12px;color:#9a3412;">专享加价补贴：</span>
                                                <span class="negotiation-rp-amount">+¥ ${subAmount.toFixed(2)}</span>
                                            </div>
                                            <div style="font-size:13px;color:#7c2d12;">
                                                最终打款成交价：<strong style="font-size:16px;color:#ea580c;">¥ ${escapeHtml(o.final_price || o.estimate_price)}</strong>
                                            </div>
                                        </div>
                                        ${o.negotiation_remark ? `<div class="negotiation-rp-remark"><strong>客服寄语：</strong>${escapeHtml(o.negotiation_remark)}</div>` : ''}
                                        ${btns}
                                    </div>
                                `;
                            } else {
                                actionBtn = `<button class="btn btn-success" style="height:28px;padding:0 12px;font-size:12px;" onclick="window.confirmOrderPrice(${o.id}, 'agree', '${escapeHtml(o.order_sn)}', '${escapeHtml(o.contact_mobile)}')">同意质检价放款</button>
                                             <button class="btn btn-outline" style="height:28px;padding:0 12px;font-size:12px;margin-left:6px;" onclick="window.confirmOrderPrice(${o.id}, 'reject', '${escapeHtml(o.order_sn)}', '${escapeHtml(o.contact_mobile)}')">拒绝退回</button>`;
                            }
                        }

                        html += `
                            <div style="background:#f8fafc;border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:12px;">
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                                    <strong style="font-size:14px;">${escapeHtml(o.device_name)}${modeBadge}</strong>
                                    ${getStatusBadge(o.status)}
                                </div>
                                <div style="font-size:12px;color:var(--text-muted);line-height:1.6;">
                                    <div>业务单号：${escapeHtml(o.order_sn)}</div>
                                    <div>预估金额：<strong style="color:var(--primary);font-size:14px;">¥ ${escapeHtml(o.estimate_price)}</strong> ${o.final_price ? `(最终核定成交: <strong style="color:var(--accent);">¥ ${escapeHtml(o.final_price)}</strong>)` : ''}</div>
                                    <div>回收方式：<span style="color:var(--text-main);font-weight:600;">${fText}</span> · 结算收款：<span style="color:var(--text-main);font-weight:600;">${escapeHtml(pText)}</span>${payoutDetail}</div>
                                    ${expressInfo}
                                </div>
                                ${negotiationCard}
                                ${actionBtn ? `<div style="margin-top:10px;display:flex;justify-content:flex-end;">${actionBtn}</div>` : ''}
                            </div>
                        `;
                    });
                    resultBox.innerHTML = html;
                } else {
                    resultBox.innerHTML = '<div style="text-align:center;padding:30px;color:var(--danger);">查询失败，请检查手机号</div>';
                }
            });


    // 挂载用户模块核心方法到全局
    window.renderUserNav = renderUserNav;
    window.refreshUserProfile = refreshUserProfile;
    window.applyUserDefaultToForm = applyUserDefaultToForm;
    window.syncUcFormData = syncUcFormData;
    window.openAuthModal = openAuthModal;
    window.switchAuthTab = switchAuthTab;
    window.openUserCenter = openUserCenter;
    window.switchUcTab = switchUcTab;
    window.saveBasicProfile = saveBasicProfile;
    window.saveDefaultPayout = saveDefaultPayout;
    window.saveDefaultAddress = saveDefaultAddress;
    window.saveNewPassword = saveNewPassword;
    window.onUcPayoutTypeChange = onUcPayoutTypeChange;
    window.syncDeregisterPanel = syncDeregisterPanel;
    window.onDeregisterReasonSelect = onDeregisterReasonSelect;
    window.submitDeregisterApply = submitDeregisterApply;
    window.cancelDeregisterApply = cancelDeregisterApply;
    window.loadUcOrders = loadUcOrders;
    window.openExpressModal = openExpressModal;
    window.closeExpressModal = closeExpressModal;
    window.promptExpress = promptExpress;
    window.confirmOrderPrice = confirmOrderPrice;
    window.doUserLogout = doUserLogout;
})(window);
