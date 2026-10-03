/**
 * 启灵回收系统 - 系统设置交互与辅助事件处理器
 * 负责测试打款、余额查询、顺丰连通性测试、接口报文预览与证书上传等事件绑定
 */
(function(window) {
    'use strict';
    const SysUI = window.SysUI;
    const api = window.adminApi || window.api;
    const escapeHtml = window.escapeHtml || function(s) { return s; };

    window.bindSettingsAuxHandlers = function(container) {
        // 密钥密码框显示 / 隐藏切换
        const btnToggleSettingsKey = document.getElementById('btn-toggle-settings-ip-key');
        btnToggleSettingsKey?.addEventListener('click', function() {
            const keyInput = document.getElementById('cfg-lingjian-ip-api-key');
            if (!keyInput) return;
            if (keyInput.type === 'password') {
                keyInput.type = 'text';
                this.innerText = '🔒 隐藏';
            } else {
                keyInput.type = 'password';
                this.innerText = '👁️ 查看';
            }
        });

        // 绑定灵简 IP 连通性测试按钮
        document.getElementById('btn-test-lingjian-api')?.addEventListener('click', async function() {
            const key = document.getElementById('cfg-lingjian-ip-api-key')?.value.trim();
            const testIp = document.getElementById('test-lingjian-ip')?.value.trim() || '114.114.114.114';
            const resBox = document.getElementById('lingjian-test-result-box');
            if (!key) {
                SysUI.toast('请先输入灵简 API Key 再发起测试', 'warning');
                return;
            }
            this.disabled = true;
            this.innerText = '测试中...';
            if (resBox) {
                resBox.style.display = 'block';
                resBox.innerHTML = '<div style="color:#64748b;">正在向灵简接口发起实时查询探测 (IP: ' + escapeHtml(testIp) + ')...</div>';
            }

            const res = await api.post('/admin/config/testIpApi', { api_key: key, ip: testIp });
            this.disabled = false;
            this.innerText = '🚀 发起连通性测试';

            if (res && res.code === 200 && res.data) {
                const d = res.data;
                SysUI.toast('接口连通测试成功！', 'success');
                if (resBox) {
                    resBox.innerHTML = `
                        <div style="color:#10b981;font-weight:700;margin-bottom:8px;">✅ 测试通过：${escapeHtml(res.msg)}</div>
                        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:8px;font-size:12px;">
                            <div><strong>查询 IP：</strong><code>${escapeHtml(d.ip || testIp)}</code></div>
                            <div><strong>格式化归属：</strong><span class="badge badge-info">${escapeHtml(d.formatted_location || '-')}</span></div>
                            <div><strong>国家/代码：</strong>${escapeHtml(d.country || '-')} (${escapeHtml(d.country_code || '-')})</div>
                            <div><strong>省份城市：</strong>${escapeHtml(d.province || '-')} ${escapeHtml(d.city || '-')}</div>
                            <div><strong>区县代码：</strong>${escapeHtml(d.district || '-')} [${escapeHtml(d.admin_code || '-')}]</div>
                            <div><strong>运营商：</strong><span class="badge badge-success">${escapeHtml(d.isp || '-')}</span></div>
                            <div><strong>所属机构：</strong>${escapeHtml(d.organization || '-')}</div>
                            <div><strong>大洲/大区：</strong>${escapeHtml(d.continent || '-')} · ${escapeHtml(d.region || '-')}</div>
                            <div><strong>时区：</strong>${escapeHtml(d.timezone || '-')}</div>
                            <div><strong>应用场景：</strong>${escapeHtml(d.network_type || '-')}</div>
                        </div>
                    `;
                }
            } else {
                SysUI.toast(res ? res.msg : '测试未通过', 'error');
                if (resBox) {
                    resBox.innerHTML = `
                        <div style="color:#ef4444;font-weight:700;">❌ 接口测试未通过：${escapeHtml(res ? res.msg : '未知错误')}</div>
                        <div style="color:#64748b;font-size:12px;margin-top:4px;">排查建议：请核对 X-API-Key 是否有效、IP 是否合法，或登录灵简平台确认白名单与接口配额。</div>
                    `;
                }
            }
        });

        // 支付宝商户私钥明文 / 密文查看切换
        document.getElementById('btn-toggle-alipay-privkey')?.addEventListener('click', function() {
            const privKeyInp = document.getElementById('cfg-alipay-private-key');
            if (!privKeyInp) return;
            if (privKeyInp.style.webkitTextSecurity === 'disc' || privKeyInp.dataset.masked === '1') {
                privKeyInp.style.webkitTextSecurity = 'none';
                privKeyInp.dataset.masked = '0';
                this.innerText = '🔒 隐藏密文';
            } else {
                privKeyInp.style.webkitTextSecurity = 'disc';
                privKeyInp.dataset.masked = '1';
                this.innerText = '👁️ 切换明文/密文';
            }
        });

        // 支付宝加签模式切换 (证书模式 / 普通公钥模式)
        document.getElementById('cfg-alipay-sign-type')?.addEventListener('change', function() {
            const certWrap = document.getElementById('alipay-cert-fields-wrap');
            const normWrap = document.getElementById('alipay-normal-fields-wrap');
            if (!certWrap || !normWrap) return;
            if (this.value === 'cert') {
                certWrap.style.display = 'block';
                normWrap.style.display = 'none';
            } else {
                certWrap.style.display = 'none';
                normWrap.style.display = 'block';
            }
        });

        // 绑定支付宝账户余额查询 (支持读取当前表单入参即时验证与验签诊断)
        document.getElementById('btn-test-alipay-balance')?.addEventListener('click', async function() {
            const resBox = document.getElementById('alipay-balance-result-box');
            this.disabled = true;
            this.innerText = '正在查询余额...';
            if (resBox) {
                resBox.style.display = 'block';
                resBox.innerHTML = '<div style="color:#0284c7;">正在向支付宝网关发起资金专户余额查询与验签测试...</div>';
            }

            try {
                const payload = {
                    app_id: document.getElementById('cfg-alipay-appid')?.value.trim() || '',
                    sign_type: document.getElementById('cfg-alipay-sign-type')?.value || 'cert',
                    private_key: document.getElementById('cfg-alipay-private-key')?.value.trim() || '',
                    app_cert: document.getElementById('cfg-alipay-app-cert')?.value.trim() || '',
                    public_cert: document.getElementById('cfg-alipay-public-cert')?.value.trim() || '',
                    root_cert: document.getElementById('cfg-alipay-root-cert')?.value.trim() || '',
                    public_key: document.getElementById('cfg-alipay-public-key')?.value.trim() || '',
                    is_sandbox: 0
                };

                const res = await api.post('/admin/payout/queryBalance', payload);
                this.disabled = false;
                this.innerText = '💰 查询账户余额';

                if (res && res.code === 200 && res.data) {
                    const d = res.data;
                    if (d.success) {
                        SysUI.toast('支付宝连通测试成功，账户可用余额查询正常！', 'success');
                        if (resBox) {
                            resBox.innerHTML = `
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                                    <strong style="color:#0f172a;font-size:14px;">✅ 支付宝接口连通正常 · 专户资产状态</strong>
                                    <span style="font-size:12px;color:#166534;font-weight:600;">${escapeHtml(d.msg || '')}</span>
                                </div>
                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;background:#fff;padding:12px 14px;border-radius:6px;border:1px solid #bbf7d0;">
                                    <div>
                                        <div style="font-size:12px;color:#64748b;">商家资金专户可用余额:</div>
                                        <div style="font-size:24px;font-weight:700;color:#10b981;font-family:monospace;margin-top:2px;">
                                            ¥ ${escapeHtml(d.available_amount || '0.00')} 元
                                        </div>
                                    </div>
                                    <div>
                                        <div style="font-size:12px;color:#64748b;">冻结资金:</div>
                                        <div style="font-size:24px;font-weight:700;color:#64748b;font-family:monospace;margin-top:2px;">
                                            ¥ ${escapeHtml(d.freeze_amount || '0.00')} 元
                                        </div>
                                    </div>
                                </div>
                            `;
                        }
                    } else {
                        SysUI.toast(d.msg || '查询失败', 'error');
                        if (resBox) {
                            resBox.innerHTML = `
                                <div style="color:#ef4444;font-weight:700;margin-bottom:4px;">❌ 支付宝接口连通或验签未通过</div>
                                <div style="color:#334155;font-size:13px;line-height:1.6;background:#fef2f2;padding:10px 14px;border-radius:6px;border:1px solid #fecaca;">
                                    ${escapeHtml(d.msg || '请检查 AppID 与私钥配置是否正确')}
                                </div>
                            `;
                        }
                    }
                } else {
                    SysUI.toast(res ? res.msg : '查询失败', 'error');
                    if (resBox) {
                        resBox.innerHTML = `
                            <div style="color:#ef4444;font-weight:700;margin-bottom:4px;">❌ 支付宝网关响应异常</div>
                            <div style="color:#64748b;font-size:12px;">${escapeHtml(res ? res.msg : '网络通信异常')}</div>
                        `;
                    }
                }
            } catch (err) {
                this.disabled = false;
                this.innerText = '💰 查询账户余额';
                SysUI.toast('网络通信异常，请检查网关配置', 'error');
            }
        });

        // 绑定在线小额真实打款测试
        document.getElementById('btn-exec-test-payout')?.addEventListener('click', async function() {
            const accountInp = document.getElementById('test-payout-account');
            const nameInp = document.getElementById('test-payout-name');
            const amountInp = document.getElementById('test-payout-amount');
            const remarkInp = document.getElementById('test-payout-remark');
            const resBox = document.getElementById('alipay-test-payout-result-box');

            const account = accountInp?.value.trim() || '';
            const name = nameInp?.value.trim() || '';
            const amount = parseFloat(amountInp?.value || '0.10');
            const remark = remarkInp?.value.trim() || '二手设备回收结算';

            if (!account) {
                SysUI.toast('请输入测试收款支付宝账号', 'warning');
                accountInp?.focus();
                return;
            }
            if (!name) {
                SysUI.toast('请输入收款人真实姓名', 'warning');
                nameInp?.focus();
                return;
            }
            if (isNaN(amount) || amount <= 0 || amount > 100) {
                SysUI.toast('测试金额必须在 0.01 ~ 100 元之间', 'warning');
                amountInp?.focus();
                return;
            }

            const confirmMsg = `即将向【${name} (${account})】发起测试打款 ¥${amount.toFixed(2)} 元。\n确认发起测试？`;
            if (!window.confirm(confirmMsg)) {
                return;
            }

            const btn = this;
            btn.disabled = true;
            btn.innerText = '正在发起打款...';
            if (resBox) {
                resBox.style.display = 'block';
                resBox.style.background = '#f0f9ff';
                resBox.style.border = '1px solid #bae6fd';
                resBox.innerHTML = '<div style="color:#0284c7;">正在请求打款接口，请稍候...</div>';
            }

            try {
                const scene = document.getElementById('cfg-alipay-transfer-scene')?.value || '二手回收';
                const infoType = document.getElementById('cfg-alipay-transfer-info-type')?.value?.trim() || '';
                const res = await api.post('/admin/payout/testTransfer', { account, name, amount, remark, transfer_scene_name: scene, transfer_scene_info_type: infoType });
                btn.disabled = false;
                btn.innerText = '发起测试打款';

                if (res && res.code === 200 && res.data) {
                    const d = res.data;
                    SysUI.toast('测试打款成功，款项已到账', 'success');
                    if (resBox) {
                        resBox.style.background = '#f0fdf4';
                        resBox.style.border = '1px solid #bbf7d0';
                        resBox.innerHTML = `
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                                <strong style="color:#166534;font-size:14px;">✅ 测试打款成功，款项已到账</strong>
                                <span style="font-size:12px;color:#15803d;">时间: ${escapeHtml(d.trans_date || '')}</span>
                            </div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:12px;">
                                <div><strong>出资金额：</strong><span style="color:#16a34a;font-weight:700;font-size:16px;">¥ ${escapeHtml(d.amount)} 元</span></div>
                                <div><strong>收款人：</strong>${escapeHtml(d.payee_name)}</div>
                                <div><strong>收款账号：</strong><code>${escapeHtml(d.payee_account)}</code></div>
                                <div><strong>流水号：</strong><code>${escapeHtml(d.out_bill_no)}</code></div>
                            </div>
                        `;
                    }
                } else {
                    SysUI.toast(res ? res.msg : '测试打款失败', 'error');
                    if (resBox) {
                        resBox.style.background = '#fef2f2';
                        resBox.style.border = '1px solid #fecaca';
                        resBox.innerHTML = `
                            <div style="color:#991b1b;font-weight:700;margin-bottom:6px;">❌ 打款未成功</div>
                            <div style="color:#dc2626;font-size:13px;margin-bottom:6px;">${escapeHtml(res ? res.msg : '未知错误')}</div>
                            <div style="font-size:12px;color:#64748b;">提示：请核对收款账号、姓名及账户余额是否正常。</div>
                        `;
                    }
                }
            } catch (err) {
                btn.disabled = false;
                btn.innerText = '发起测试打款';
                SysUI.toast('网络通信异常，请检查配置', 'error');
            }
        });

        // 微信商户私钥明文 / 密文查看切换
        document.getElementById('btn-toggle-wechat-privkey')?.addEventListener('click', function() {
            const privKeyInp = document.getElementById('cfg-wx-private-key');
            if (!privKeyInp) return;
            if (privKeyInp.style.webkitTextSecurity === 'disc' || privKeyInp.dataset.masked === '1') {
                privKeyInp.style.webkitTextSecurity = 'none';
                privKeyInp.dataset.masked = '0';
                this.innerText = '🔒 隐藏密文';
            } else {
                privKeyInp.style.webkitTextSecurity = 'disc';
                privKeyInp.dataset.masked = '1';
                this.innerText = '👁️ 切换明文/密文';
            }
        });

        // 绑定微信商户账户余额查询
        document.getElementById('btn-test-wechat-balance')?.addEventListener('click', async function() {
            const resBox = document.getElementById('wechat-balance-result-box');
            this.disabled = true;
            this.innerText = '正在查询余额...';
            if (resBox) {
                resBox.style.display = 'block';
                resBox.innerHTML = '<div style="color:#0284c7;">正在查询微信支付商户资金账户可用余额...</div>';
            }

            try {
                const res = await api.get('/admin/payout/queryWechatBalance');
                this.disabled = false;
                this.innerText = '💰 查询账户余额';

                if (res && res.code === 200 && res.data) {
                    const d = res.data;
                    if (d.success) {
                        SysUI.toast('微信商户余额查询成功', 'success');
                        if (resBox) {
                            resBox.innerHTML = `
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                                    <strong style="color:#0f172a;font-size:14px;">微信商户账户资产状态 (${escapeHtml(d.account_type || '基本账户')})</strong>
                                    <span style="font-size:12px;color:#166534;">${escapeHtml(d.msg || '')}</span>
                                </div>
                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;background:#f8fafc;padding:12px 14px;border-radius:6px;border:1px solid #e2e8f0;">
                                    <div>
                                        <div style="font-size:12px;color:#64748b;">可用出资金额:</div>
                                        <div style="font-size:22px;font-weight:700;color:#10b981;font-family:monospace;margin-top:2px;">
                                            ¥ ${escapeHtml(d.available_amount || '0.00')} 元
                                        </div>
                                    </div>
                                    <div>
                                        <div style="font-size:12px;color:#64748b;">待结算/在途金额:</div>
                                        <div style="font-size:22px;font-weight:700;color:#64748b;font-family:monospace;margin-top:2px;">
                                            ¥ ${escapeHtml(d.freeze_amount || '0.00')} 元
                                        </div>
                                    </div>
                                </div>
                            `;
                        }
                    } else {
                        SysUI.toast(d.msg || '查询失败', 'error');
                        if (resBox) {
                            resBox.innerHTML = `
                                <div style="color:#ef4444;font-weight:700;">❌ 余额查询未成功</div>
                                <div style="color:#64748b;font-size:12px;margin-top:4px;">${escapeHtml(d.msg || '请检查商户号、证书序列号与私钥配置是否正确')}</div>
                            `;
                        }
                    }
                } else {
                    SysUI.toast(res ? res.msg : '查询失败', 'error');
                    if (resBox) {
                        resBox.innerHTML = `
                            <div style="color:#ef4444;font-weight:700;">❌ 余额查询未成功</div>
                            <div style="color:#64748b;font-size:12px;margin-top:4px;">${escapeHtml(res ? res.msg : '网络通信异常')}</div>
                        `;
                    }
                }
            } catch (err) {
                this.disabled = false;
                this.innerText = '💰 查询账户余额';
                SysUI.toast('网络通信异常，请检查微信支付商户配置', 'error');
            }
        });

        // 绑定微信在线小额真实打款测试
        document.getElementById('btn-exec-test-wechat-payout')?.addEventListener('click', async function() {
            const openidInp = document.getElementById('test-wechat-openid');
            const nameInp = document.getElementById('test-wechat-name');
            const amountInp = document.getElementById('test-wechat-amount');
            const remarkInp = document.getElementById('test-wechat-remark');
            const resBox = document.getElementById('wechat-test-payout-result-box');

            const openid = openidInp?.value.trim() || '';
            const name = nameInp?.value.trim() || '';
            const amount = parseFloat(amountInp?.value || '0.30');
            const remark = remarkInp?.value.trim() || '微信转账测试';

            if (!openid) {
                SysUI.toast('请输入测试收款人微信 OpenID', 'warning');
                openidInp?.focus();
                return;
            }
            if (isNaN(amount) || amount < 0.30 || amount > 100) {
                SysUI.toast('微信商家转账单笔出资金额必须在 0.30 ~ 100 元之间', 'warning');
                amountInp?.focus();
                return;
            }

            const confirmMsg = `即将向微信用户 [${openid}] 发起真实测试打款 ¥${amount.toFixed(2)} 元。\n确认发起测试？`;
            if (!window.confirm(confirmMsg)) {
                return;
            }

            const btn = this;
            btn.disabled = true;
            btn.innerText = '正在发起打款...';
            if (resBox) {
                resBox.style.display = 'block';
                resBox.style.background = '#f0f9ff';
                resBox.style.border = '1px solid #bae6fd';
                resBox.innerHTML = '<div style="color:#0284c7;">正在请求微信支付转账接口，请稍候...</div>';
            }

            try {
                const res = await api.post('/admin/payout/testWechatTransfer', { openid, name, amount, remark });
                btn.disabled = false;
                btn.innerText = '发起微信测试打款';

                if (res && res.code === 200 && res.data) {
                    const d = res.data;
                    SysUI.toast('微信转账已受理或已到账', 'success');
                    if (resBox) {
                        resBox.style.background = '#f0fdf4';
                        resBox.style.border = '1px solid #bbf7d0';
                        resBox.innerHTML = `
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                                <strong style="color:#166534;font-size:14px;">✅ 微信转账处理完成 (状态: ${escapeHtml(d.status || 'SUCCESS')})</strong>
                                <span style="font-size:12px;color:#15803d;">时间: ${escapeHtml(d.trans_date || '')}</span>
                            </div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:12px;">
                                <div><strong>出资金额：</strong><span style="color:#16a34a;font-weight:700;font-size:16px;">¥ ${escapeHtml(d.amount)} 元</span></div>
                                <div><strong>收款人OpenID：</strong><code>${escapeHtml(d.openid)}</code></div>
                                <div><strong>商户单号：</strong><code>${escapeHtml(d.out_bill_no)}</code></div>
                                <div><strong>微信转账单号：</strong><code>${escapeHtml(d.transfer_bill_no || '处理中')}</code></div>
                            </div>
                        `;
                    }
                } else {
                    SysUI.toast(res ? res.msg : '微信测试打款失败', 'error');
                    if (resBox) {
                        resBox.style.background = '#fef2f2';
                        resBox.style.border = '1px solid #fecaca';
                        resBox.innerHTML = `
                            <div style="color:#991b1b;font-weight:700;margin-bottom:6px;">❌ 微信打款未成功</div>
                            <div style="color:#dc2626;font-size:13px;margin-bottom:6px;">${escapeHtml(res ? res.msg : '未知错误')}</div>
                            <div style="font-size:12px;color:#64748b;">排查建议：请核对商户号、API证书序列号与私钥是否有效，微信商户余额是否充足。</div>
                        `;
                    }
                }
            } catch (err) {
                btn.disabled = false;
                btn.innerText = '发起微信测试打款';
                SysUI.toast('网络通信异常，请检查配置', 'error');
            }
        });

        // 顺丰速运 CheckWord 密码明文 / 密文切换
        document.getElementById('btn-toggle-sf-checkword')?.addEventListener('click', function() {
            const wordInp = document.getElementById('cfg-sf-check-word');
            if (!wordInp) return;
            if (wordInp.type === 'password') {
                wordInp.type = 'text';
                this.innerText = '🔒 隐藏';
            } else {
                wordInp.type = 'password';
                this.innerText = '👁️ 查看';
            }
        });

        // 绑定顺丰速运连通性自动化诊断测试
        document.getElementById('btn-test-sf-express')?.addEventListener('click', async function() {
            const partnerId = document.getElementById('cfg-sf-partner-id')?.value.trim() || '';
            const checkWord = document.getElementById('cfg-sf-check-word')?.value.trim() || '';
            const signType = document.getElementById('cfg-sf-sign-type')?.value || 'simple';
            const env = document.getElementById('cfg-sf-env')?.value || 'sandbox';
            const monthlyCard = document.getElementById('cfg-sf-monthly-card')?.value.trim() || '';
            const resBox = document.getElementById('sf-test-result-box');

            if (!partnerId) {
                SysUI.toast('请先输入顺丰顾客编码(partnerID)后再发起测试', 'warning');
                document.getElementById('cfg-sf-partner-id')?.focus();
                return;
            }
            if (!checkWord) {
                SysUI.toast('请先输入顺丰接口校验码(checkWord)后再发起测试', 'warning');
                document.getElementById('cfg-sf-check-word')?.focus();
                return;
            }

            const btn = this;
            btn.disabled = true;
            btn.innerText = '正在向顺丰开放平台发起诊断探测...';
            if (resBox) {
                resBox.style.display = 'block';
                resBox.style.background = '#f0f9ff';
                resBox.style.border = '1px solid #bae6fd';
                resBox.innerHTML = '<div style="color:#0284c7;">正在构建顺丰 ' + escapeHtml(signType === 'simple' ? '简易MD5(含时间戳)' : '标准MD5') + ' 摘要签名并请求顺丰网关 (' + escapeHtml(env === 'prod' ? '生产正式环境' : '沙箱联调') + ')...</div>';
            }

            try {
                const res = await api.post('/admin/config/testSfExpress', {
                    sf_partner_id: partnerId,
                    sf_check_word: checkWord,
                    sf_sign_type: signType,
                    sf_env: env,
                    sf_monthly_card: monthlyCard
                });
                btn.disabled = false;
                btn.innerText = '⚡ 发起顺丰接口连通性测试';

                if (res && res.code === 200 && res.data) {
                    const d = res.data;
                    // 若后端自适应调整了签名算法，自动同步页面下拉框
                    if (d.applied_sign_type) {
                        const sel = document.getElementById('cfg-sf-sign-type');
                        if (sel && sel.value !== d.applied_sign_type) {
                            sel.value = d.applied_sign_type;
                        }
                    }
                    SysUI.toast('顺丰速运接口连通测试成功！', 'success');
                    if (resBox) {
                        resBox.style.background = '#f0fdf4';
                        resBox.style.border = '1px solid #bbf7d0';
                        resBox.innerHTML = `
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                                <strong style="color:#166534;font-size:14px;">✅ 顺丰开放平台握手成功 (代码: ${escapeHtml(d.apiResultCode || 'A1000')})</strong>
                                <span class="badge badge-success">${escapeHtml(d.env === 'prod' ? '生产正式网关' : '沙箱联调网关')}</span>
                            </div>
                            <div style="font-size:13px;color:#15803d;margin-bottom:6px;">${escapeHtml(res.msg)}</div>
                            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:6px;font-size:12px;color:#475569;background:#fff;padding:8px 12px;border-radius:6px;border:1px solid #dcfce7;">
                                <div><strong>网关地址：</strong><code>${escapeHtml(d.gateway || '')}</code></div>
                                <div><strong>测试运单号：</strong><span style="color:#16a34a;font-weight:700;">${escapeHtml(d.test_waybill_no || '联调通过')}</span></div>
                            </div>
                        `;
                    }
                } else {
                    SysUI.toast(res ? res.msg : '顺丰测试未通过', 'error');
                    if (resBox) {
                        resBox.style.background = '#fef2f2';
                        resBox.style.border = '1px solid #fecaca';
                        const errDetail = res?.data?.errorMsg || res?.data?.apiErrorMsg || res?.msg || '未知错误';
                        resBox.innerHTML = `
                            <div style="color:#991b1b;font-weight:700;margin-bottom:4px;">❌ 顺丰接口响应未通过</div>
                            <div style="color:#dc2626;font-size:13px;margin-bottom:6px;">${escapeHtml(errDetail)}</div>
                            <div style="font-size:12px;color:#64748b;">
                                排查建议：1. 核对 partnerID 与 checkWord 拼写与空格；2. 若在生产环境，请确认是否已在顺丰丰桥完成接口授权与月结卡号绑定；3. 沙箱测试需使用顺丰沙箱专用联调账号。
                            </div>
                        `;
                    }
                }
            } catch (err) {
                btn.disabled = false;
                btn.innerText = '⚡ 发起顺丰接口连通性测试';
                SysUI.toast('网络通信异常，请检查配置', 'error');
            }
        });

        // 顺丰主动推送回调地址动态填充与一键复制绑定 (三大接口精简版)
        const origin = window.location.origin;
        const feePushUrl = `${origin}/index.php?s=/api/sf/feePush`;
        const routePushUrl = `${origin}/index.php?s=/api/sf/routePush`;
        const orderStatePushUrl = `${origin}/index.php?s=/api/sf/orderStatePush`;

        const inpPrimary = document.getElementById('sf-push-callback-url-primary');
        if (inpPrimary) inpPrimary.value = feePushUrl;

        const inpRoutePrimary = document.getElementById('sf-route-callback-url-primary');
        if (inpRoutePrimary) inpRoutePrimary.value = routePushUrl;

        const inpStatePrimary = document.getElementById('sf-state-callback-url-primary');
        if (inpStatePrimary) inpStatePrimary.value = orderStatePushUrl;

        const copyCallbackUrl = function(text, label) {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(() => {
                    SysUI.toast(`已复制${label}！请粘贴至顺丰开放平台的【沙箱环境地址】与【生产环境地址】输入框中`, 'success');
                }).catch(() => {
                    fallbackCopy(text);
                });
            } else {
                fallbackCopy(text);
            }
        };

        const fallbackCopy = function(text) {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            try {
                document.execCommand('copy');
                SysUI.toast('已复制回调地址到剪贴板！', 'success');
            } catch (e) {
                SysUI.toast('复制失败，请手动选中文本框复制', 'warning');
            }
            document.body.removeChild(ta);
        };

        document.getElementById('btn-copy-sf-callback-primary')?.addEventListener('click', function() {
            copyCallbackUrl(feePushUrl, '运费推送回调地址');
        });

        document.getElementById('btn-copy-sf-route-primary')?.addEventListener('click', function() {
            copyCallbackUrl(routePushUrl, '路由推送回调地址');
        });

        document.getElementById('btn-copy-sf-state-primary')?.addEventListener('click', function() {
            copyCallbackUrl(orderStatePushUrl, '订单状态推送回调地址');
        });

        // ==========================================
        // 管理后台安全入口密钥相关交互处理
        // ==========================================
        const secretInp = document.getElementById('cfg-admin-entry-secret');
        const secretUrlBox = document.getElementById('admin-secret-url-box');
        const secretUrlInp = document.getElementById('admin-secret-url-input');

        const updateSecretUrlPreview = function() {
            if (!secretInp) return;
            const val = secretInp.value.trim();
            if (val) {
                if (secretUrlBox) secretUrlBox.style.display = 'block';
                if (secretUrlInp) {
                    const origin = window.location.origin;
                    let path = window.location.pathname;
                    if (!path.endsWith('/')) {
                        const lastSlash = path.lastIndexOf('/');
                        path = lastSlash !== -1 ? path.substring(0, lastSlash + 1) : '/admin/';
                    }
                    secretUrlInp.value = `${origin}${path}?entry_key=${encodeURIComponent(val)}`;
                }
            } else {
                if (secretUrlBox) secretUrlBox.style.display = 'none';
                if (secretUrlInp) secretUrlInp.value = '';
            }
        };

        secretInp?.addEventListener('input', updateSecretUrlPreview);

        // 随机生成 8 位安全密钥
        document.getElementById('btn-gen-admin-secret')?.addEventListener('click', function() {
            const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
            let res = 's_';
            for (let i = 0; i < 6; i++) {
                res += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            if (secretInp) {
                secretInp.value = res;
                updateSecretUrlPreview();
                SysUI.toast('已生成访问密钥，点击保存配置后生效', 'info');
            }
        });

        // 清空密钥
        document.getElementById('btn-clear-admin-secret')?.addEventListener('click', function() {
            if (secretInp) {
                secretInp.value = '';
                updateSecretUrlPreview();
                SysUI.toast('已清空密钥，保存后恢复默认直接访问', 'warning');
            }
        });

        // 复制专属直达链接
        document.getElementById('btn-copy-admin-secret-url')?.addEventListener('click', function() {
            if (!secretUrlInp || !secretUrlInp.value) {
                SysUI.toast('请先设置安全访问密钥', 'warning');
                return;
            }
            const url = secretUrlInp.value;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(url).then(() => {
                    SysUI.toast('后台访问链接已复制到剪贴板，请妥善保存', 'success');
                }).catch(() => {
                    fallbackCopy(url);
                });
            } else {
                fallbackCopy(url);
            }
        });

        // -------------------------------------------------------------------------
        // 商业正版授权与官方授权中心联动交互绑定
        // -------------------------------------------------------------------------
        let cachedDomainToCopy = '';

        const updateLicenseStatusUi = function(d) {
            if (!d) return;

            cachedDomainToCopy = d.clean_domain || d.current_domain || '';
            const domainEl = document.getElementById('lic-current-domain');
            if (domainEl) {
                domainEl.innerText = cachedDomainToCopy || '-';
            }

            const serverUrlInp = document.getElementById('cfg-license-server-url');
            if (serverUrlInp && !serverUrlInp.value) {
                serverUrlInp.value = d.server_url || '';
            }

            const keyInp = document.getElementById('cfg-license-key');
            if (keyInp && !keyInp.value) {
                keyInp.value = d.license_key || '';
            }

            const verEl = document.getElementById('lic-system-version');
            if (verEl && d.system_version) {
                verEl.innerText = 'v' + d.system_version;
            }

            const lastCheckEl = document.getElementById('lic-last-check-text');
            if (lastCheckEl) {
                if (d.status === 'valid') {
                    lastCheckEl.innerHTML = '<span style="color:#16a34a;font-weight:700;">永久正版授权</span><div style="font-size:11px;color:#64748b;margin-top:2px;">本地离线持久保障 (核验: ' + escapeHtml(d.last_check_time || '已验证') + ')</div>';
                } else if (d.status === 'local_dev') {
                    lastCheckEl.innerHTML = '<span style="color:#0284c7;font-weight:700;">本地开发环境</span><div style="font-size:11px;color:#64748b;margin-top:2px;">免授权直接放行</div>';
                } else {
                    lastCheckEl.innerHTML = '<span style="color:#dc2626;font-weight:700;">尚未激活授权</span><div style="font-size:11px;color:#64748b;margin-top:2px;">请输入授权码激活</div>';
                }
            }

            const banner = document.getElementById('lic-status-banner');
            const iconEl = document.getElementById('lic-status-icon');
            const titleEl = document.getElementById('lic-status-title');
            const descEl = document.getElementById('lic-status-desc');
            const badgeWrap = document.getElementById('lic-status-badge-wrap');

            if (!banner || !iconEl || !titleEl || !descEl || !badgeWrap) return;

            const st = d.status;

            if (st === 'valid') {
                banner.style.background = '#f0fdf4';
                banner.style.borderColor = '#bbf7d0';
                iconEl.style.background = '#dcfce7';
                iconEl.innerText = '🛡️';
                titleEl.innerText = '正版商业授权生效中 (永久有效)';
                titleEl.style.color = '#15803d';
                descEl.innerText = '当前运行域名已通过官方授权核验，本地永久正版凭证已生效。即便官方验证节点未来遇到维护或断网，系统亦永久稳定运行。';
                badgeWrap.innerHTML = '<span class="badge" style="background:#16a34a;color:#fff;font-size:12px;padding:4px 12px;border-radius:12px;">✓ 永久授权</span>';
            } else if (st === 'local_dev') {
                banner.style.background = '#f0f9ff';
                banner.style.borderColor = '#bae6fd';
                iconEl.style.background = '#e0f2fe';
                iconEl.innerText = '💻';
                titleEl.innerText = '本地 / 局域网开发环境 (免授权)';
                titleEl.style.color = '#0369a1';
                descEl.innerText = '检测到当前运行在本地测试或私有局域网环境，系统自动免除正版授权核验限制。';
                badgeWrap.innerHTML = '<span class="badge" style="background:#0284c7;color:#fff;font-size:12px;padding:4px 12px;border-radius:12px;">本地环境</span>';
            } else if (st === 'invalid_domain') {
                banner.style.background = '#fef2f2';
                banner.style.borderColor = '#fecaca';
                iconEl.style.background = '#fee2e2';
                iconEl.innerText = '❌';
                titleEl.innerText = '授权域名不符';
                titleEl.style.color = '#b91c1c';
                descEl.innerText = '当前域名 (' + escapeHtml(d.clean_domain || d.current_domain) + ') 尚未在官方授权中心【我的授权】中添加绑定，请前往绑定后点击刷新复核。';
                badgeWrap.innerHTML = '<span class="badge" style="background:#dc2626;color:#fff;font-size:12px;padding:4px 12px;border-radius:12px;">域名未绑定</span>';
            } else if (st === 'invalid_key') {
                banner.style.background = '#fef2f2';
                banner.style.borderColor = '#fecaca';
                iconEl.style.background = '#fee2e2';
                iconEl.innerText = '❌';
                titleEl.innerText = '授权密钥 (License Key) 无效';
                titleEl.style.color = '#b91c1c';
                descEl.innerText = '官方授权服务未检索到此 License Key，请检查密钥是否正确，或登录授权中心核实订单状态。';
                badgeWrap.innerHTML = '<span class="badge" style="background:#dc2626;color:#fff;font-size:12px;padding:4px 12px;border-radius:12px;">无效密钥</span>';
            } else if (st === 'order_disabled') {
                banner.style.background = '#fef2f2';
                banner.style.borderColor = '#fecaca';
                iconEl.style.background = '#fee2e2';
                iconEl.innerText = '⛔';
                titleEl.innerText = '授权订单已被禁用';
                titleEl.style.color = '#b91c1c';
                descEl.innerText = '对应的授权订单已被服务商停用，请联系官方授权售后服务协助排查。';
                badgeWrap.innerHTML = '<span class="badge" style="background:#dc2626;color:#fff;font-size:12px;padding:4px 12px;border-radius:12px;">已停用</span>';
            } else {
                banner.style.background = '#f8fafc';
                banner.style.borderColor = '#e2e8f0';
                iconEl.style.background = '#f1f5f9';
                iconEl.innerText = '🔑';
                titleEl.innerText = '系统尚未配置正版商业授权';
                titleEl.style.color = '#334155';
                descEl.innerText = '请在下方填写正版授权密钥 (License Key)，并点击【保存并联网激活授权】。';
                badgeWrap.innerHTML = '<span class="badge" style="background:#94a3b8;color:#fff;font-size:12px;padding:4px 12px;border-radius:12px;">未配置</span>';
            }

            // 同步顶部导航栏正版标识 (如果存在)
            const headerBadge = document.getElementById('header-license-badge');
            if (headerBadge) {
                headerBadge.style.display = 'inline-block';
                if (st === 'valid') {
                    headerBadge.style.background = '#dcfce7';
                    headerBadge.style.color = '#15803d';
                    headerBadge.innerText = '● 正版授权';
                    headerBadge.title = '系统已成功激活官方正版授权 (永久有效)';
                } else if (st === 'local_dev') {
                    headerBadge.style.background = '#e0f2fe';
                    headerBadge.style.color = '#0369a1';
                    headerBadge.innerText = '● 本地开发';
                    headerBadge.title = '本地调试环境免授权';
                } else {
                    headerBadge.style.background = '#fee2e2';
                    headerBadge.style.color = '#b91c1c';
                    headerBadge.innerText = '● 未授权 (点击配置)';
                    headerBadge.title = '尚未激活商业正版授权，点击前往配置';
                }
            }
        };

        const loadLicenseInfo = async function() {
            try {
                const res = await api.get('/admin/license/getInfo');
                if (res && res.code === 200 && res.data) {
                    updateLicenseStatusUi(res.data);
                }
            } catch (e) {
                console.error('获取授权信息异常:', e);
            }
        };

        // 页面初始化时载入授权数据
        loadLicenseInfo();

        // 一键复制运行域名
        document.getElementById('btn-copy-lic-domain')?.addEventListener('click', function() {
            const domain = cachedDomainToCopy || document.getElementById('lic-current-domain')?.innerText.trim() || '';
            if (!domain || domain === '检测中...') {
                SysUI.toast('域名尚未加载完成，请稍候', 'warning');
                return;
            }
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(domain).then(() => {
                    SysUI.toast('已复制域名 [' + domain + ']！请前往官方授权中心绑定', 'success');
                }).catch(() => {
                    fallbackCopy(domain);
                    SysUI.toast('已复制域名 [' + domain + ']！', 'success');
                });
            } else {
                fallbackCopy(domain);
                SysUI.toast('已复制域名 [' + domain + ']！', 'success');
            }
        });

        // 切换授权码查看明文 / 密文
        document.getElementById('btn-toggle-license-key')?.addEventListener('click', function() {
            const keyInp = document.getElementById('cfg-license-key');
            if (!keyInp) return;
            if (keyInp.type === 'password') {
                keyInp.type = 'text';
                this.innerText = '🔒 隐藏查看';
            } else {
                keyInp.type = 'password';
                this.innerText = '👁️ 切换查看';
            }
        });

        // 保存配置并立即联网激活
        document.getElementById('btn-save-license')?.addEventListener('click', async function() {
            const serverUrl = document.getElementById('cfg-license-server-url')?.value.trim() || 'https://www.jingxialai.com';
            const licenseKey = document.getElementById('cfg-license-key')?.value.trim() || '';

            if (!licenseKey) {
                SysUI.toast('请先填写正版授权密钥 (License Key)', 'warning');
                document.getElementById('cfg-license-key')?.focus();
                return;
            }

            const btn = this;
            const originalHtml = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '正在联网核验...';

            SysUI.toast('正在向授权中心发起实时核验...', 'info');

            try {
                const res = await api.post('/admin/license/saveAndVerify', {
                    server_url: serverUrl,
                    license_key: licenseKey
                });

                btn.disabled = false;
                btn.innerHTML = originalHtml;

                if (res && res.code === 200) {
                    SysUI.toast(res.msg || '正版授权验证通过！感谢支持正版。', 'success');
                    await loadLicenseInfo();
                } else {
                    SysUI.toast(res ? res.msg : '联网授权验证未通过', 'error');
                    await loadLicenseInfo();
                }
            } catch (err) {
                btn.disabled = false;
                btn.innerHTML = originalHtml;
                SysUI.toast('请求授权服务器异常，请检查网络或服务端配置', 'error');
            }
        });

        // 刷新复核授权状态
        document.getElementById('btn-recheck-license')?.addEventListener('click', async function() {
            const btn = this;
            const originalHtml = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '正在复核...';

            SysUI.toast('正在刷新授权状态...', 'info');

            try {
                const res = await api.post('/admin/license/recheck');

                btn.disabled = false;
                btn.innerHTML = originalHtml;

                if (res && res.code === 200) {
                    SysUI.toast(res.msg || '授权核验通过！', 'success');
                    await loadLicenseInfo();
                } else {
                    SysUI.toast(res ? res.msg : '授权复核未通过', 'error');
                    await loadLicenseInfo();
                }
            } catch (err) {
                btn.disabled = false;
                btn.innerHTML = originalHtml;
                SysUI.toast('复核请求异常，请稍后重试', 'error');
            }
        });
    };
})(window);