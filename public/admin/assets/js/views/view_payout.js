/**
 * 启灵回收系统 - 财务放款结算中心视图
 * 包含已成交回收单款项审核、收款人与账户核验与出资放款处理
 */
(function (window) {
    'use strict';

    const SysUI = window.SysUI;
    const api = window.adminApi || window.api;
    const state = window.adminState || window.state;
    const escapeHtml = window.escapeHtml || function(s) { return s; };
    const formatTime = window.formatTime;
    const getStatusBadge = window.getStatusBadge;

    function reloadPayout() {
        if (typeof window.loadTabContent === 'function') {
            window.loadTabContent('payout');
        } else {
            const box = document.getElementById('tab-content');
            if (box && typeof window.renderPayoutView === 'function') {
                window.renderPayoutView(box);
            }
        }
    }

    async function renderPayoutView(container) {
        container.innerHTML = `
            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
                <div>
                    <div style="font-weight:700;color:#0f172a;font-size:16px;">
                        财务放款
                    </div>
                    <div style="font-size:12px;color:#64748b;margin-top:4px;">
                        审核质检验收完成的回收订单，向客户支付回收款项。
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                    <div id="payout-balance-quick-tag" style="background:#f8fafc;border:1px solid #e2e8f0;padding:6px 12px;border-radius:6px;font-size:12px;color:#0f172a;">
                        支付宝余额: <strong style="color:#10b981;font-family:monospace;" id="payout-balance-val">查询中...</strong>
                    </div>
                    <div id="payout-balance-wechat-tag" style="background:#f8fafc;border:1px solid #e2e8f0;padding:6px 12px;border-radius:6px;font-size:12px;color:#0f172a;">
                        微信商户余额: <strong style="color:#10b981;font-family:monospace;" id="payout-wechat-balance-val">查询中...</strong>
                    </div>
                    <button class="btn btn-outline" id="btn-quick-check-alipay-balance" style="height:32px;padding:0 12px;font-size:12px;background:#fff;">
                        🔄 刷新余额
                    </button>
                </div>
            </div>

            <div class="card">
                <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;">
                    <div class="card-title">待放款订单</div>
                </div>
                <div id="payout-table-box" style="margin-top:16px;">加载待打款单据中...</div>
            </div>
        `;

        // 绑定顶部出资余额快速刷新 (同时查询支付宝与微信支付商户专户可用余额)
        const balanceValEl = document.getElementById('payout-balance-val');
        const wechatBalanceValEl = document.getElementById('payout-wechat-balance-val');

        const queryQuickBalance = async () => {
            if (balanceValEl) {
                balanceValEl.innerText = '查询中...';
                balanceValEl.style.color = '#0284c7';
            }
            if (wechatBalanceValEl) {
                wechatBalanceValEl.innerText = '查询中...';
                wechatBalanceValEl.style.color = '#0284c7';
            }

            // 查询支付宝余额
            try {
                const bRes = await api.get('/admin/payout/queryBalance');
                if (bRes && bRes.code === 200 && bRes.data) {
                    if (bRes.data.success) {
                        if (balanceValEl) {
                            balanceValEl.innerText = `¥ ${bRes.data.available_amount || '0.00'}`;
                            balanceValEl.style.color = '#10b981';
                            balanceValEl.title = `支付宝资金专户真实可用余额（冻结: ¥${bRes.data.freeze_amount || '0.00'}）`;
                        }
                    } else {
                        if (balanceValEl) {
                            balanceValEl.innerText = '未配置';
                            balanceValEl.style.color = '#94a3b8';
                            balanceValEl.title = bRes.data.msg || '请前往【系统设置】填写真实商户私钥与 AppID';
                        }
                    }
                } else {
                    if (balanceValEl) {
                        balanceValEl.innerText = '查询失败';
                        balanceValEl.style.color = '#ef4444';
                    }
                }
            } catch (e) {
                if (balanceValEl) {
                    balanceValEl.innerText = '网络异常';
                    balanceValEl.style.color = '#ef4444';
                }
            }

            // 查询微信商户余额
            try {
                const wRes = await api.get('/admin/payout/queryWechatBalance');
                if (wRes && wRes.code === 200 && wRes.data) {
                    if (wRes.data.success) {
                        if (wechatBalanceValEl) {
                            wechatBalanceValEl.innerText = `¥ ${wRes.data.available_amount || '0.00'}`;
                            wechatBalanceValEl.style.color = '#10b981';
                            wechatBalanceValEl.title = `微信支付商户资金账户可用余额（待结算: ¥${wRes.data.freeze_amount || '0.00'}）`;
                        }
                    } else {
                        if (wechatBalanceValEl) {
                            wechatBalanceValEl.innerText = '未配置';
                            wechatBalanceValEl.style.color = '#94a3b8';
                            wechatBalanceValEl.title = wRes.data.msg || '请前往【系统设置】配置微信商户号、证书与私钥';
                        }
                    }
                } else {
                    if (wechatBalanceValEl) {
                        wechatBalanceValEl.innerText = '查询失败';
                        wechatBalanceValEl.style.color = '#ef4444';
                    }
                }
            } catch (e) {
                if (wechatBalanceValEl) {
                    wechatBalanceValEl.innerText = '网络异常';
                    wechatBalanceValEl.style.color = '#ef4444';
                }
            }
        };
        document.getElementById('btn-quick-check-alipay-balance')?.addEventListener('click', queryQuickBalance);
        queryQuickBalance();

        // 获取大额打款双重安全审批策略
        let securityPolicy = { double_approval_enabled: true, audit_threshold: 1000.0, has_password_set: true };
        try {
            const secRes = await api.get('/admin/payout/getSecurityPolicy');
            if (secRes && secRes.code === 200 && secRes.data) {
                securityPolicy = secRes.data;
                window._payoutSecurityPolicy = securityPolicy;
            }
        } catch (e) {}

        const res = await api.get('/admin/order/list&status=completed&page=1&page_size=50');
        if (res && res.code === 200) {
            const list = res.data.list || [];
            if (list.length === 0) {
                document.getElementById('payout-table-box').innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;">暂无待放款订单</div>';
                return;
            }

            const payoutBadgeMap = {
                'alipay': '<span class="badge badge-alipay">支付宝</span>',
                'bank': '<span class="badge badge-bank">银行转账</span>',
                'wechat': '<span class="badge badge-wechat">微信钱包</span>',
                'cash': '<span class="badge badge-cash">现金结清</span>'
            };

            let rows = '';
            list.forEach(o => {
                const pBadge = payoutBadgeMap[o.payout_type] || `<span class="badge badge-gray">${escapeHtml(o.payout_type || '未指定')}</span>`;
                const accountHtml = o.payout_account ? `
                    <div style="font-size:12px;margin-top:2px;">
                        <span style="font-family:monospace;color:#0284c7;font-weight:600;">${escapeHtml(o.payout_account)}</span>
                        <button class="btn btn-secondary" style="height:20px;padding:0 6px;font-size:11px;margin-left:4px;" onclick="window.copyToClipboard('${escapeHtml(o.payout_account)}')">复制</button>
                    </div>
                ` : '<div style="color:#94a3b8;font-size:12px;">当面核验交付</div>';
                const nameHtml = o.payout_name ? `<div style="font-size:12px;color:#475569;">户名: <strong>${escapeHtml(o.payout_name)}</strong></div>` : '';
                const bankHtml = o.payout_bank ? `<div style="font-size:11px;color:#64748b;">${escapeHtml(o.payout_bank)}</div>` : '';

                const couponAddPrice = parseFloat(o.coupon_add_price || 0);
                const couponBadge = couponAddPrice > 0 ? `<br><span class="badge" style="background:#fef2f2;color:#dc2626;border:1px solid #fecaca;font-size:10px;margin-top:2px;">🎟️ 含券补贴 +¥${escapeHtml(o.coupon_add_price)}</span>` : '';

                const numFinal = parseFloat(o.final_price || 0);
                const isLargeAmount = numFinal >= (securityPolicy.audit_threshold || 1000) && securityPolicy.double_approval_enabled;
                const largeBadge = isLargeAmount ? `<br><span class="badge" style="background:#fffbeb;color:#b45309;border:1px solid #fde68a;font-size:10px;margin-top:2px;">🛡️ 大额风控单</span>` : '';

                rows += `<tr>
                    <td><strong>${escapeHtml(o.order_sn)}</strong></td>
                    <td>${escapeHtml(o.device_name)}</td>
                    <td><strong style="color:#10b981;font-size:16px;">¥ ${escapeHtml(o.final_price)}</strong>${couponBadge}${largeBadge}</td>
                    <td>${escapeHtml(o.contact_name)}<br><small style="color:#64748b;">${escapeHtml(o.contact_mobile)}</small></td>
                    <td>
                        <div style="margin-bottom:2px;">${pBadge}</div>
                        ${nameHtml}
                        ${bankHtml}
                        ${accountHtml}
                    </td>
                    <td>${getStatusBadge(o.status)}</td>
                    <td>${formatTime(o.created_at)}</td>
                    <td>
                        <button class="btn btn-success" style="height:32px;padding:0 16px;font-size:13px;font-weight:600;" onclick="window.doPayout(${o.id}, '${escapeHtml(o.final_price)}', '${escapeHtml(o.order_sn)}', '${escapeHtml(o.payout_type || 'alipay')}', '${escapeHtml(o.payout_name || o.contact_name || '')}', '${escapeHtml(o.payout_account || '')}', '${escapeHtml(o.payout_bank || '')}')">
                            放款
                        </button>
                    </td>
                </tr>`;
            });

            document.getElementById('payout-table-box').innerHTML = `
                <table class="data-table">
                    <thead>
                        <tr><th>订单号</th><th>回收商品</th><th>成交金额</th><th>客户信息</th><th>收款方式/账户</th><th>状态</th><th>下单时间</th><th>操作</th></tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            `;
        }
    }

    /**
     * 审核放款弹窗 (集成大额双重安全审批与独立财务密码二次核验)
     */
    window.doPayout = async function (orderId, amount, orderSn, payoutType, payoutName, payoutAccount, payoutBank) {
        const numAmount = parseFloat(amount || '0');
        const policy = window._payoutSecurityPolicy || { double_approval_enabled: true, audit_threshold: 1000.0, has_password_set: true };
        const isLargeAmount = policy.double_approval_enabled && (numAmount >= (policy.audit_threshold || 1000.0));

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-card" style="max-width:500px;">
                <div class="modal-header">
                    <span>放款审核 - ${escapeHtml(orderSn || '')}</span>
                    <span style="cursor:pointer;font-size:18px;" onclick="this.closest('.modal-overlay').remove()">✕</span>
                </div>
                <div class="modal-body" style="font-size:13px;line-height:1.6;">
                    ${isLargeAmount ? `
                        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;margin-bottom:14px;display:flex;align-items:center;gap:10px;">
                            <span style="font-size:20px;">🛡️</span>
                            <div style="font-size:12px;color:#92400e;line-height:1.4;">
                                <strong>大额出资安全审批风控：</strong>本单成交金额已达大额风控线 (≥ ¥${escapeHtml(String(policy.audit_threshold || 1000))})，出资前必须验证独立财务安全支付密码！
                            </div>
                        </div>
                    ` : ''}

                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;">
                        <span style="color:#64748b;">放款金额:</span>
                        <strong style="color:#10b981;font-size:22px;font-family:monospace;">¥ ${escapeHtml(amount)}</strong>
                    </div>

                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin-bottom:14px;">
                        <div style="font-weight:700;color:#0f172a;margin-bottom:6px;">收款信息:</div>
                        <div>收款人: <strong style="color:#0f172a;">${escapeHtml(payoutName || '客户本人')}</strong></div>
                        ${payoutBank ? `<div>开户行: <strong>${escapeHtml(payoutBank)}</strong></div>` : ''}
                        ${payoutAccount ? `
                            <div style="display:flex;align-items:center;gap:8px;margin-top:4px;">
                                <span>收款账号: <strong style="color:#0284c7;font-family:monospace;font-size:14px;">${escapeHtml(payoutAccount)}</strong></span>
                                <button class="btn btn-secondary" style="height:22px;padding:0 6px;font-size:11px;" onclick="window.copyToClipboard('${escapeHtml(payoutAccount)}')">复制</button>
                            </div>
                        ` : '<div style="color:#64748b;">现场交付或未填账号</div>'}
                    </div>

                    <div class="login-form-group" style="margin-bottom:14px;">
                        <label style="font-weight:600;display:block;margin-bottom:6px;">选择放款渠道:</label>
                        <select id="modal-payout-channel" class="form-control" style="width:100%;height:38px;">
                            <option value="alipay" ${payoutType === 'alipay' ? 'selected' : ''}>支付宝转账 (官方单笔转账)</option>
                            <option value="wechat" ${payoutType === 'wechat' ? 'selected' : ''}>微信转账 (官方商家转账到零钱)</option>
                            <option value="bank" ${payoutType === 'bank' ? 'selected' : ''}>银行卡转账</option>
                            <option value="cash" ${payoutType === 'cash' ? 'selected' : ''}>现场现金结清</option>
                            <option value="offline">其他线下结算</option>
                        </select>
                        <div id="modal-channel-tip" style="font-size:12px;color:#64748b;margin-top:8px;padding:8px 12px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0;line-height:1.5;"></div>
                    </div>

                    <!-- 独立财务安全支付密码核验框 -->
                    <div class="login-form-group" id="group-modal-sec-pwd" style="margin-bottom:14px;${isLargeAmount ? '' : 'display:none;'}">
                        <label style="font-weight:600;display:block;margin-bottom:6px;color:#0f172a;">
                            财务安全支付密码 <span style="color:#ef4444;">*</span>:
                        </label>
                        <div style="position:relative;">
                            <input type="password" id="modal-payout-sec-password" class="form-control" placeholder="请输入财务安全支付密码" autocomplete="new-password" style="width:100%;height:38px;padding-right:64px;">
                            <button type="button" id="btn-modal-toggle-sec-pwd" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:12px;color:#64748b;">👁️ 显示</button>
                        </div>
                        <div style="font-size:11px;color:#64748b;margin-top:4px;">采用高强度哈希加盐比对，由超级管理员在【系统设置 ➔ 收款方式】中设定</div>
                    </div>
                </div>
                <div class="modal-footer" style="display:flex;justify-content:space-between;align-items:center;">
                    <button class="btn btn-outline" id="btn-preview-payout-payload" style="height:36px;padding:0 12px;font-size:12px;">
                        🔍 预览接口报文
                    </button>
                    <div style="display:flex;gap:10px;">
                        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">取消</button>
                        <button class="btn btn-success" id="btn-confirm-exec-payout" style="height:36px;padding:0 22px;font-size:13px;font-weight:600;">
                            确认放款
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const channelSelect = modal.querySelector('#modal-payout-channel');
        const channelTip = modal.querySelector('#modal-channel-tip');
        const confirmBtn = modal.querySelector('#btn-confirm-exec-payout');
        const previewBtn = modal.querySelector('#btn-preview-payout-payload');
        const secPwdInput = modal.querySelector('#modal-payout-sec-password');
        const btnToggleSecPwd = modal.querySelector('#btn-modal-toggle-sec-pwd');

        // 密码明文切换
        btnToggleSecPwd?.addEventListener('click', function() {
            if (!secPwdInput) return;
            if (secPwdInput.type === 'password') {
                secPwdInput.type = 'text';
                this.innerText = '🔒 隐藏';
            } else {
                secPwdInput.type = 'password';
                this.innerText = '👁️ 显示';
            }
        });

        const updateChannelTip = () => {
            const ch = channelSelect?.value || 'alipay';
            if (ch === 'alipay') {
                channelTip.innerHTML = '<strong>支付宝商家转账：</strong>通过支付宝 OpenAPI 网关直连出资，款项实时入账客户支付宝（须实名一致）。';
                channelTip.style.color = '#0284c7';
            } else if (ch === 'wechat') {
                channelTip.innerHTML = '<strong>微信商家转账：</strong>通过微信支付 APIv3 升级版直连转账，出资入账微信零钱（优先使用填写的收款账号，或读取用户绑定的微信 OpenID，单笔最低 0.30 元）。';
                channelTip.style.color = '#16a34a';
            } else {
                channelTip.innerHTML = '<strong>人工放款：</strong>由财务线下通过对公账户、网银或现金直接支付给客户，点击确认后仅记录出资流水并归档订单。';
                channelTip.style.color = '#64748b';
            }
        };
        channelSelect?.addEventListener('change', updateChannelTip);
        updateChannelTip();

        // 预览转账接口真实报文
        previewBtn?.addEventListener('click', async function() {
            const ch = channelSelect?.value || 'alipay';
            const endpoint = ch === 'wechat' ? '/admin/payout/previewWechat' : '/admin/payout/preview';
            this.disabled = true;
            this.innerText = '加载中...';
            try {
                const pRes = await api.get(endpoint + '?order_id=' + orderId);
                this.disabled = false;
                this.innerText = '🔍 预览接口报文';
                if (pRes && pRes.code === 200 && pRes.data) {
                    const prevModal = document.createElement('div');
                    prevModal.className = 'modal-overlay';
                    prevModal.style.zIndex = '10001';
                    prevModal.innerHTML = `
                        <div class="modal-card" style="max-width:680px;max-height:85vh;display:flex;flex-direction:column;">
                            <div class="modal-header">
                                <span>${ch === 'wechat' ? '微信支付 APIv3' : '支付宝 OpenAPI'} 商家转账标准报文预览</span>
                                <span style="cursor:pointer;font-size:18px;" onclick="this.closest('.modal-overlay').remove()">✕</span>
                            </div>
                            <div class="modal-body" style="overflow-y:auto;flex:1;font-size:12px;">
                                <div style="background:#f8fafc;padding:10px 12px;border-radius:6px;margin-bottom:12px;border:1px solid #e2e8f0;">
                                    <div><strong>接口名称：</strong><code>${escapeHtml(pRes.data.api_name || '')}</code></div>
                                    <div style="margin-top:4px;"><strong>网关地址：</strong><code>${escapeHtml(pRes.data.gateway_url || '')}</code></div>
                                </div>
                                <div style="font-weight:700;color:#0f172a;margin-bottom:6px;">完整请求载荷 (JSON):</div>
                                <pre style="background:#0f172a;color:#f8fafc;padding:12px;border-radius:6px;overflow-x:auto;font-family:monospace;font-size:12px;max-height:360px;">${escapeHtml(JSON.stringify(pRes.data.request_payload || pRes.data.biz_content || pRes.data, null, 2))}</pre>
                            </div>
                            <div class="modal-footer" style="display:flex;justify-content:flex-end;">
                                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">关闭</button>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(prevModal);
                } else {
                    SysUI.toast(pRes ? pRes.msg : '获取报文预览失败', 'error');
                }
            } catch (err) {
                this.disabled = false;
                this.innerText = '🔍 预览接口报文';
                SysUI.toast('网络异常，获取预览失败', 'error');
            }
        });

        confirmBtn?.addEventListener('click', async function () {
            const channel = channelSelect?.value || 'alipay';
            const btn = this;
            const secPassword = secPwdInput ? secPwdInput.value.trim() : '';

            if (channel === 'alipay' && !payoutAccount) {
                SysUI.toast('该订单未填写客户支付宝账号，无法发起支付宝转账', 'warning');
                return;
            }
            if (channel === 'alipay' && !payoutName) {
                SysUI.toast('该订单未填写收款人姓名，无法发起支付宝转账', 'warning');
                return;
            }
            if (channel === 'wechat' && numAmount < 0.30) {
                SysUI.toast('微信支付官方规定商家转账单笔出资金额不得低于 0.30 元', 'warning');
                return;
            }
            if (channel === 'wechat' && numAmount >= 2000.0 && !payoutName) {
                SysUI.toast('单笔金额大于等于 2000 元，微信官方要求必须填写真实姓名以进行强实名核验', 'warning');
                return;
            }

            // 大额出资前端前置校验
            if (isLargeAmount && !secPassword) {
                SysUI.toast('该笔订单触发大额出资安全审批，请输入财务安全支付密码', 'warning');
                secPwdInput?.focus();
                return;
            }

            btn.disabled = true;
            btn.innerText = '正在放款...';

            const res = await api.post('/admin/payout/execute', {
                order_id: orderId,
                channel: channel,
                security_password: secPassword
            });
            btn.disabled = false;
            btn.innerText = '确认放款';

            if (res && res.code === 200) {
                SysUI.toast(res.msg || '放款成功已完成记账', 'success');
                modal.remove();
                reloadPayout();
            } else {
                SysUI.toast(res ? res.msg : '放款打款失败', 'error');
                // 若后端返回需要安全密码，确保密码框显示并聚焦
                if (res && res.data && res.data.require_security_pwd) {
                    const secGroup = modal.querySelector('#group-modal-sec-pwd');
                    if (secGroup) {
                        secGroup.style.display = 'block';
                    }
                    secPwdInput?.focus();
                }
            }
        });
    };

    window.renderPayoutView = renderPayoutView;
})(window);
