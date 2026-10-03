/**
 * 启灵回收系统 - 系统参数设置与控制台视图
 * 包含品牌备案、SEO、运营横幅、履约方式、结算渠道与支付接口等配置
 */
(function (window) {
    'use strict';

    const SysUI = window.SysUI;
    const api = window.adminApi || window.api;
    const escapeHtml = window.escapeHtml || function(s) { return s; };

    async function renderSettingsView(container) {
        if (!container) return;

        container.innerHTML = `
            <div class="card" style="padding:0;overflow:hidden;">
                <!-- 顶部说明条 -->
                <div style="padding:18px 24px;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;">
                    <div>
                        <h3 style="font-size:16px;font-weight:700;color:#0f172a;">系统设置</h3>
                        <div style="font-size:12px;color:#64748b;margin-top:2px;">配置站点基础信息、SEO、履约方式与支付接口参数</div>
                    </div>
                </div>

                <div style="padding:20px 24px;">
                    <!-- 二级分类选项卡导航 (Sub-tabs) -->
                    <div class="settings-tabs-header" id="settings-sub-tabs">
                        <button type="button" class="settings-tab-btn active" data-target="panel-brand">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                            基础设置
                        </button>
                        <button type="button" class="settings-tab-btn" data-target="panel-seo">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                            SEO 设置
                        </button>
                        <button type="button" class="settings-tab-btn" data-target="panel-banner">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h10v2H7zm0-3h10v2H7zm0 6h7v2H7z"/></svg>
                            横幅与动态
                        </button>
                        <button type="button" class="settings-tab-btn" data-target="panel-fulfillment">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
                            回收方式
                        </button>
                        <button type="button" class="settings-tab-btn" data-target="panel-payout">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/></svg>
                            收款方式
                        </button>
                        <button type="button" class="settings-tab-btn" data-target="panel-wechat">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12.65 15.67c.33.06.66.1 1 .1 3.76 0 6.81-2.6 6.81-5.81 0-3.21-3.05-5.81-6.81-5.81-3.76 0-6.81 2.6-6.81 5.81 0 1.83 1.01 3.47 2.61 4.54l-.65 1.98 2.29-1.14c.48.16 1.01.27 1.56.33z"/></svg>
                            支付接口
                        </button>
                        <button type="button" class="settings-tab-btn" data-target="panel-sf">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
                            顺丰速运
                        </button>
                        <button type="button" class="settings-tab-btn" data-target="panel-userauth">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                            用户与登录
                        </button>
                        <button type="button" class="settings-tab-btn" data-target="panel-ip">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                            IP 解析
                        </button>
                        <button type="button" class="settings-tab-btn" data-target="panel-footer">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M4 4h16v12H4V4zm0 14h16v2H4v-2zm2-10h4v2H6V8zm0 3h8v2H6v-2zm10-3h2v5h-2V8z"/></svg>
                            底部与客服
                        </button>
                        <button type="button" class="settings-tab-btn" data-target="panel-license">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>
                            商业正版授权
                        </button>
                    </div>

                    <form id="settings-form">
                        ${typeof window.getSettingsBasePanelsHtml === "function" ? window.getSettingsBasePanelsHtml() : ""}
                        ${typeof window.getSettingsBizPanelsHtml === "function" ? window.getSettingsBizPanelsHtml() : ""}
                        <!-- 统一底部保存栏 -->
                        <div style="margin-top:28px;padding-top:20px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;align-items:center;gap:12px;">
                            <button type="button" class="btn btn-secondary" onclick="window.renderSettingsView(document.getElementById('tab-content'))">重置改动</button>
                            <button type="submit" class="btn btn-primary" style="height:42px;padding:0 28px;font-size:14px;font-weight:600;">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="margin-right:6px;"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>
                                保存全部系统配置
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        // 绑定二级分类 Tab 选项卡无感即时切换
        const subTabs = container.querySelectorAll('#settings-sub-tabs .settings-tab-btn');
        subTabs.forEach(btn => {
            btn.addEventListener('click', function() {
                subTabs.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                const targetId = this.getAttribute('data-target');
                container.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
                const targetPanel = container.querySelector('#' + targetId);
                if (targetPanel) {
                    targetPanel.classList.add('active');
                }
            });
        });

        // 绑定直达首页装修中心按钮
        container.querySelector('#btn-goto-decoration')?.addEventListener('click', function() {
            const menuDecoration = document.querySelector('.menu-item[data-tab="decoration"]');
            if (menuDecoration) {
                menuDecoration.click();
            }
        });

        const res = await api.get('/admin/config/getConfigs');
        if (res && res.code === 200) {
            const cfgs = res.data || {};
            document.getElementById('cfg-site-name').value = cfgs['site_name'] || '启灵通用回收系统';
            document.getElementById('cfg-brand-name').value = cfgs['brand_name'] || '启灵回收';
            document.getElementById('cfg-site-logo').value = cfgs['site_logo'] || '/uploads/default/site_logo.svg';
            document.getElementById('cfg-logo-preview').src = cfgs['site_logo'] || '/uploads/default/site_logo.svg';
            document.getElementById('cfg-site-favicon').value = cfgs['site_favicon'] || '/uploads/default/site_favicon.svg';
            document.getElementById('cfg-favicon-preview').src = cfgs['site_favicon'] || '/uploads/default/site_favicon.svg';
            document.getElementById('cfg-gongan-icon').value = cfgs['gong_an_icon'] || '/uploads/default/police_badge.svg';
            document.getElementById('cfg-gongan-icon-preview').src = cfgs['gong_an_icon'] || '/uploads/default/police_badge.svg';
            document.getElementById('cfg-service-tel').value = cfgs['service_tel'] || '400-800-8888';
            document.getElementById('cfg-copyright').value = cfgs['copyright'] || '© 2026 启灵智能回收系统 · 保留所有权利';
            document.getElementById('cfg-icp-beian').value = cfgs['icp_beian'] || '京ICP备20260001号-1';
            document.getElementById('cfg-gongan-beian').value = cfgs['gong_an_beian'] || '';
            document.getElementById('cfg-gongan-url').value = cfgs['gong_an_url'] || '';

            document.getElementById('cfg-seo-title').value = cfgs['seo_title'] || '启灵全行业数字化回收平台 · 手机数码/废品金属/汽车家电高价上门回收';
            document.getElementById('cfg-seo-keywords').value = cfgs['seo_keywords'] || '二手回收,手机数码回收,废旧金属,再生资源,二手车回收,名表黄金回收,家电回收';
            document.getElementById('cfg-seo-description').value = cfgs['seo_description'] || '专业全品类回收服务平台，提供手机数码、废旧物资、二手汽车、名表黄金及家电回收服务，透明质检当面极速放款。';

            document.getElementById('cfg-banner-title').value = cfgs['banner_title'] || '全品类高价回收 · 免费上门';
            document.getElementById('cfg-banner-subtitle').value = cfgs['banner_subtitle'] || '智能算法精准核价 · 官方透明质检 · 确认后秒级极速放款';
            document.getElementById('cfg-lock-days').value = cfgs['price_lock_days'] || 7;

            // 首页实时动态跑马播报设置
            const tickerCheck = document.getElementById('cfg-ticker-enabled');
            if (tickerCheck) tickerCheck.checked = (cfgs['ticker_enabled'] ?? '1') !== '0';
            const tickerTag = document.getElementById('cfg-ticker-tag');
            if (tickerTag) tickerTag.value = cfgs['ticker_tag'] || '实时动态';
            const tickerInterval = document.getElementById('cfg-ticker-interval');
            if (tickerInterval) tickerInterval.value = cfgs['ticker_interval'] || 4;
            const tickerMsg = document.getElementById('cfg-ticker-messages');
            if (tickerMsg) {
                tickerMsg.value = (cfgs['ticker_messages'] !== undefined && cfgs['ticker_messages'] !== null && cfgs['ticker_messages'] !== '') 
                    ? cfgs['ticker_messages'] 
                    : [
                        '刚刚 [138****6821] 成功回收 iPhone 15 Pro Max · 极速放款 ¥5,800 到账',
                        '1分钟前 [186****9012] 预约快速寄送 · 华为 Mate 60 Pro',
                        '3分钟前 [159****3341] 确认专业质检结果 · 微信零钱极速到账 ¥4,200',
                        '4分钟前 [131****8809] 提交高价回收订单 · MacBook Pro 16寸 M3 Max',
                        '6分钟前 [177****5520] 预约线下门店自送 · 小米 14 Ultra (现场秒结)',
                        '8分钟前 [180****2267] 质检合格 · 支付宝打款 ¥3,650 极速到账'
                    ].join('\n');
            }

            // 履约交割方式自定义
            const homeCheck = document.getElementById('cfg-recycle-home-enabled');
            if (homeCheck) homeCheck.checked = cfgs['recycle_home_enabled'] !== '0';
            const homeName = document.getElementById('cfg-recycle-home-name');
            if (homeName) homeName.value = cfgs['recycle_home_name'] || '预约免费上门';
            const homeDesc = document.getElementById('cfg-recycle-home-desc');
            if (homeDesc) homeDesc.value = cfgs['recycle_home_desc'] || '专业人员免费上门，当面核验结算';

            const mailCheck = document.getElementById('cfg-recycle-mail-enabled');
            if (mailCheck) mailCheck.checked = cfgs['recycle_mail_enabled'] !== '0';
            const mailName = document.getElementById('cfg-recycle-mail-name');
            if (mailName) mailName.value = (cfgs['recycle_mail_name'] === '全国快递包邮' || cfgs['recycle_mail_name'] === '全国顺丰包邮') ? '快速寄送' : (cfgs['recycle_mail_name'] || '快速寄送');
            const mailDesc = document.getElementById('cfg-recycle-mail-desc');
            if (mailDesc) mailDesc.value = cfgs['recycle_mail_desc'] || '快递小哥上门取件，快速寄出验机结算';

            const storeCheck = document.getElementById('cfg-recycle-store-enabled');
            if (storeCheck) storeCheck.checked = cfgs['recycle_store_enabled'] !== '0';
            const storeName = document.getElementById('cfg-recycle-store-name');
            if (storeName) storeName.value = (cfgs['recycle_store_name'] === '线下门店/网点自送') ? '线下门店自送' : (cfgs['recycle_store_name'] || '线下门店自送');
            const storeDesc = document.getElementById('cfg-recycle-store-desc');
            if (storeDesc) storeDesc.value = cfgs['recycle_store_desc'] || '前往就近服务门店交接，现场秒级结清';

            // 结算收款渠道自定义
            const alipayCheck = document.getElementById('cfg-payout-alipay-enabled');
            if (alipayCheck) alipayCheck.checked = cfgs['payout_alipay_enabled'] !== '0';
            const alipayTitle = document.getElementById('cfg-payout-alipay-title');
            if (alipayTitle) alipayTitle.value = cfgs['payout_alipay_title'] || '支付宝';

            const bankCheck = document.getElementById('cfg-payout-bank-enabled');
            if (bankCheck) bankCheck.checked = cfgs['payout_bank_enabled'] !== '0';
            const bankTitle = document.getElementById('cfg-payout-bank-title');
            if (bankTitle) bankTitle.value = cfgs['payout_bank_title'] || '银行卡转账';

            const wechatCheck = document.getElementById('cfg-payout-wechat-enabled');
            if (wechatCheck) wechatCheck.checked = cfgs['payout_wechat_enabled'] !== '0';
            const wechatTitle = document.getElementById('cfg-payout-wechat-title');
            if (wechatTitle) wechatTitle.value = cfgs['payout_wechat_title'] || '微信钱包';

            const cashCheck = document.getElementById('cfg-payout-cash-enabled');
            if (cashCheck) cashCheck.checked = cfgs['payout_cash_enabled'] !== '0';
            const cashTitle = document.getElementById('cfg-payout-cash-title');
            if (cashTitle) cashTitle.value = cfgs['payout_cash_title'] || '现场现金结清';

            // 大额放款出资双重安全审批与风控回显
            const doubleApprovalCheck = document.getElementById('cfg-payout-double-approval-enabled');
            if (doubleApprovalCheck) doubleApprovalCheck.checked = (cfgs['payout_double_approval_enabled'] ?? '1') !== '0';
            const thresholdInp = document.getElementById('cfg-payout-audit-threshold');
            if (thresholdInp) thresholdInp.value = cfgs['payout_audit_threshold'] || '1000.00';
            const pwdStatusBadge = document.getElementById('cfg-payout-pwd-status');
            if (pwdStatusBadge) {
                if (cfgs['payout_security_password_set'] === '1') {
                    pwdStatusBadge.className = 'badge badge-success';
                    pwdStatusBadge.innerText = '✓ 已设置密码';
                    pwdStatusBadge.title = '财务安全支付密码已就绪';
                } else {
                    pwdStatusBadge.className = 'badge badge-warning';
                    pwdStatusBadge.innerText = '⚠️ 未设置密码';
                    pwdStatusBadge.title = '尚未设置财务安全支付密码，大额放款将拦截提示';
                }
            }

            // 支付宝官方商家转账参数回显 (公钥证书模式与普通模式)
            const alipayEnabledCheck = document.getElementById('cfg-alipay-enabled');
            if (alipayEnabledCheck) alipayEnabledCheck.checked = cfgs['alipay_enabled'] !== '0';
            const alipaySignTypeInp = document.getElementById('cfg-alipay-sign-type');
            if (alipaySignTypeInp) {
                alipaySignTypeInp.value = cfgs['alipay_sign_type'] || 'cert';
                const certWrap = document.getElementById('alipay-cert-fields-wrap');
                const normWrap = document.getElementById('alipay-normal-fields-wrap');
                if (certWrap && normWrap) {
                    if (alipaySignTypeInp.value === 'cert') {
                        certWrap.style.display = 'block';
                        normWrap.style.display = 'none';
                    } else {
                        certWrap.style.display = 'none';
                        normWrap.style.display = 'block';
                    }
                }
            }
            const alipayAppIdInp = document.getElementById('cfg-alipay-appid');
            if (alipayAppIdInp) alipayAppIdInp.value = cfgs['alipay_appid'] || '';
            const alipayTitlePrefixInp = document.getElementById('cfg-alipay-title-prefix');
            if (alipayTitlePrefixInp) alipayTitlePrefixInp.value = cfgs['alipay_order_title_prefix'] || '二手回收款项结算';
            const alipayTransferSceneInp = document.getElementById('cfg-alipay-transfer-scene');
            if (alipayTransferSceneInp) alipayTransferSceneInp.value = cfgs['alipay_transfer_scene_name'] || '二手回收';
            const alipayTransferInfoTypeInp = document.getElementById('cfg-alipay-transfer-info-type');
            if (alipayTransferInfoTypeInp) alipayTransferInfoTypeInp.value = cfgs['alipay_transfer_scene_info_type'] || '';
            const alipayReportGoodsInp = document.getElementById('cfg-alipay-report-goods-name');
            if (alipayReportGoodsInp) alipayReportGoodsInp.value = cfgs['alipay_report_goods_name'] || '二手闲置设备';
            const alipayPrivKeyInp = document.getElementById('cfg-alipay-private-key');
            if (alipayPrivKeyInp) alipayPrivKeyInp.value = cfgs['alipay_private_key'] || '';
            const alipayAppCertInp = document.getElementById('cfg-alipay-app-cert');
            if (alipayAppCertInp) alipayAppCertInp.value = cfgs['alipay_app_cert'] || '';
            const alipayPublicCertInp = document.getElementById('cfg-alipay-public-cert');
            if (alipayPublicCertInp) alipayPublicCertInp.value = cfgs['alipay_public_cert'] || '';
            const alipayRootCertInp = document.getElementById('cfg-alipay-root-cert');
            if (alipayRootCertInp) alipayRootCertInp.value = cfgs['alipay_root_cert'] || '';
            const alipayPubKeyInp = document.getElementById('cfg-alipay-public-key');
            if (alipayPubKeyInp) alipayPubKeyInp.value = cfgs['alipay_public_key'] || '';

            // 微信官方商家转账参数回显 (APIv3 升级版)
            const wxEnabledCheck = document.getElementById('cfg-wechat-transfer-enabled');
            if (wxEnabledCheck) wxEnabledCheck.checked = cfgs['wechat_transfer_enabled'] !== '0';
            const wxAppIdInp = document.getElementById('cfg-wx-appid');
            if (wxAppIdInp) wxAppIdInp.value = cfgs['wechat_appid'] || cfgs['miniapp_appid'] || '';
            const wxSecretInp = document.getElementById('cfg-wx-secret');
            if (wxSecretInp) wxSecretInp.value = cfgs['miniapp_secret'] || '';
            const wxMchIdInp = document.getElementById('cfg-wx-mchid');
            if (wxMchIdInp) wxMchIdInp.value = cfgs['mch_id'] || '';
            const wxV3KeyInp = document.getElementById('cfg-wx-v3key');
            if (wxV3KeyInp) wxV3KeyInp.value = cfgs['mch_v3_key'] || '';
            const wxCertSerialInp = document.getElementById('cfg-wx-cert-serial-no');
            if (wxCertSerialInp) wxCertSerialInp.value = cfgs['wechat_cert_serial_no'] || '';
            const wxSceneIdInp = document.getElementById('cfg-wx-scene-id');
            if (wxSceneIdInp) wxSceneIdInp.value = cfgs['wechat_transfer_scene_id'] || '';
            const wxTitlePrefixInp = document.getElementById('cfg-wx-title-prefix');
            if (wxTitlePrefixInp) wxTitlePrefixInp.value = cfgs['wechat_title_prefix'] || '二手回收货款';
            const wxPrivKeyInp = document.getElementById('cfg-wx-private-key');
            if (wxPrivKeyInp) wxPrivKeyInp.value = cfgs['wechat_private_key'] || '';
            const wxPubKeyInp = document.getElementById('cfg-wx-platform-public-key');
            if (wxPubKeyInp) wxPubKeyInp.value = cfgs['wechat_platform_public_key'] || '';
            const wxPlatCertSerialInp = document.getElementById('cfg-wx-platform-cert-serial-no');
            if (wxPlatCertSerialInp) wxPlatCertSerialInp.value = cfgs['wechat_platform_cert_serial_no'] || '';

            // 顺丰速运配置回显
            const sfEnabledCheck = document.getElementById('cfg-sf-enabled');
            if (sfEnabledCheck) sfEnabledCheck.checked = cfgs['sf_enabled'] === '1';
            const sfEnvSelect = document.getElementById('cfg-sf-env');
            if (sfEnvSelect) sfEnvSelect.value = cfgs['sf_env'] || 'sandbox';
            const sfPartnerIdInp = document.getElementById('cfg-sf-partner-id');
            if (sfPartnerIdInp) sfPartnerIdInp.value = cfgs['sf_partner_id'] || '';
            const sfCheckWordInp = document.getElementById('cfg-sf-check-word');
            if (sfCheckWordInp) sfCheckWordInp.value = cfgs['sf_check_word'] || '';
            const sfSignTypeSelect = document.getElementById('cfg-sf-sign-type');
            if (sfSignTypeSelect) sfSignTypeSelect.value = cfgs['sf_sign_type'] || 'simple';
            const sfMonthlyCardInp = document.getElementById('cfg-sf-monthly-card');
            if (sfMonthlyCardInp) sfMonthlyCardInp.value = cfgs['sf_monthly_card'] || '';
            const sfPayMethodSelect = document.getElementById('cfg-sf-pay-method');
            if (sfPayMethodSelect) sfPayMethodSelect.value = cfgs['sf_pay_method'] || '2';
            const sfFreightTagInp = document.getElementById('cfg-sf-freight-tag');
            if (sfFreightTagInp) sfFreightTagInp.value = cfgs['sf_freight_tag'] || '运费补贴·推荐';
            const sfFreightRuleInp = document.getElementById('cfg-sf-freight-rule');
            if (sfFreightRuleInp) sfFreightRuleInp.value = cfgs['sf_freight_rule'] || '';
            const sfExpressTypeSelect = document.getElementById('cfg-sf-express-type');
            if (sfExpressTypeSelect) sfExpressTypeSelect.value = cfgs['sf_express_type'] || '2';
            const sfIsDocallSelect = document.getElementById('cfg-sf-is-docall');
            if (sfIsDocallSelect) sfIsDocallSelect.value = cfgs['sf_is_docall'] || '1';

            const sfRecvContactInp = document.getElementById('cfg-sf-receive-contact');
            if (sfRecvContactInp) sfRecvContactInp.value = cfgs['sf_receive_contact'] || '启灵回收质检中心';
            const sfRecvMobileInp = document.getElementById('cfg-sf-receive-mobile');
            if (sfRecvMobileInp) sfRecvMobileInp.value = cfgs['sf_receive_mobile'] || cfgs['service_tel'] || '';
            const sfRecvProvInp = document.getElementById('cfg-sf-receive-province');
            if (sfRecvProvInp) sfRecvProvInp.value = cfgs['sf_receive_province'] || '广东省';
            const sfRecvCityInp = document.getElementById('cfg-sf-receive-city');
            if (sfRecvCityInp) sfRecvCityInp.value = cfgs['sf_receive_city'] || '深圳市';
            const sfRecvDistInp = document.getElementById('cfg-sf-receive-district');
            if (sfRecvDistInp) sfRecvDistInp.value = cfgs['sf_receive_district'] || '南山区';
            const sfRecvAddrInp = document.getElementById('cfg-sf-receive-address');
            if (sfRecvAddrInp) sfRecvAddrInp.value = cfgs['sf_receive_address'] || '粤海街道高新南一道科兴科学园B座302室质检收发部';

            // 用户认证与注册开关回显
            const setCheck = (id, val, def = true) => {
                const el = document.getElementById(id);
                if (el) el.checked = (val !== undefined) ? (val !== '0') : def;
            };
            setCheck('cfg-settings-user-auth-fast', cfgs['user_auth_fast_enabled'], true);
            setCheck('cfg-settings-user-auth-password', cfgs['user_auth_password_enabled'], true);
            setCheck('cfg-settings-user-register-enabled', cfgs['user_register_enabled'], true);
            setCheck('cfg-settings-user-auth-wechat', cfgs['user_auth_wechat_enabled'], true);
            setCheck('cfg-settings-user-order-guest', cfgs['user_order_guest_enabled'], true);
            setCheck('cfg-settings-user-require-realname', cfgs['user_require_realname'], false);

            // 后台安全入口访问密钥回显与直达链接预览触发
            const adminEntrySecretInp = document.getElementById('cfg-admin-entry-secret');
            if (adminEntrySecretInp) {
                adminEntrySecretInp.value = cfgs['admin_entry_secret'] || '';
                adminEntrySecretInp.dispatchEvent(new Event('input'));
            }

            // 灵简 IP 归属地配置回显
            setCheck('cfg-lingjian-ip-enabled', cfgs['lingjian_ip_enabled'], true);
            const ipKeyInp = document.getElementById('cfg-lingjian-ip-api-key');
            if (ipKeyInp) ipKeyInp.value = cfgs['lingjian_ip_api_key'] || '';

            // 底部与客服联系方式回显
            const footerDescInp = document.getElementById('cfg-footer-desc');
            if (footerDescInp) footerDescInp.value = cfgs['footer_desc'] || '官方直营全品类回收服务平台。价格公开透明，顺丰免费上门取件，专业质检快速放款，数据安全清除保障，打造安全可靠的循环回收服务。';
            const footerTagsInp = document.getElementById('cfg-footer-trust-tags');
            if (footerTagsInp) footerTagsInp.value = cfgs['footer_trust_tags'] !== undefined ? cfgs['footer_trust_tags'] : '顺丰速运合作, 绿色循环回收, 数据安全清除';
            const footerTelInp = document.getElementById('cfg-footer-service-tel');
            if (footerTelInp) footerTelInp.value = cfgs['footer_service_tel'] || cfgs['service_tel'] || '400-800-8888';
            const footerTimeInp = document.getElementById('cfg-footer-service-time');
            if (footerTimeInp) footerTimeInp.value = cfgs['footer_service_time'] || '周一至周日 09:00 - 21:00 (节假日不休)';
            const footerEmailInp = document.getElementById('cfg-footer-service-email');
            if (footerEmailInp) footerEmailInp.value = cfgs['footer_service_email'] || 'service@qilingrecycle.com';
            const footerAddrInp = document.getElementById('cfg-footer-address');
            if (footerAddrInp) footerAddrInp.value = cfgs['footer_address'] || '深圳市南山区粤海街道高新南一道科兴科学园B座302室';

            const qrWxInp = document.getElementById('cfg-footer-qrcode-wechat');
            const qrWxPrev = document.getElementById('cfg-footer-qr-wechat-preview');
            if (qrWxInp) qrWxInp.value = cfgs['footer_qrcode_wechat'] || '';
            if (qrWxPrev) qrWxPrev.src = cfgs['footer_qrcode_wechat'] || '/uploads/default/site_logo.svg';

            const qrWxTitleInp = document.getElementById('cfg-footer-qrcode-wechat-title');
            if (qrWxTitleInp) qrWxTitleInp.value = cfgs['footer_qrcode_wechat_title'] || '微信扫码 · 专属客服 1对1';

            const qrMpInp = document.getElementById('cfg-footer-qrcode-mp');
            const qrMpPrev = document.getElementById('cfg-footer-qr-mp-preview');
            if (qrMpInp) qrMpInp.value = cfgs['footer_qrcode_mp'] || '';
            if (qrMpPrev) qrMpPrev.src = cfgs['footer_qrcode_mp'] || '/uploads/default/site_logo.svg';

            const qrMpTitleInp = document.getElementById('cfg-footer-qrcode-mp-title');
            if (qrMpTitleInp) qrMpTitleInp.value = cfgs['footer_qrcode_mp_title'] || '关注官方公众号 · 获取最新行情';
        }

        // 统一图片输入与即时预览辅助绑定
        function bindImagePreviewSync(inputId, previewId, fallbackUrl) {
            const inputEl = document.getElementById(inputId);
            const previewEl = document.getElementById(previewId);
            if (!inputEl || !previewEl) return;
            const sync = () => {
                previewEl.src = inputEl.value.trim() || fallbackUrl;
            };
            inputEl.addEventListener('input', sync);
            inputEl.addEventListener('change', sync);
            inputEl.addEventListener('paste', () => setTimeout(sync, 50));
        }

        bindImagePreviewSync('cfg-site-logo', 'cfg-logo-preview', '/uploads/default/site_logo.svg');
        bindImagePreviewSync('cfg-site-favicon', 'cfg-favicon-preview', '/uploads/default/site_favicon.svg');
        bindImagePreviewSync('cfg-gongan-icon', 'cfg-gongan-icon-preview', '/uploads/default/police_badge.svg');

        // Logo 本地上传
        document.getElementById('cfg-logo-file')?.addEventListener('change', async function() {
            const file = this.files?.[0];
            if (!file) return;
            const formData = new FormData();
            formData.append('file', file);
            SysUI.toast('正在上传站点 Logo...', 'info');
            try {
                const uploadRes = await api.upload('/admin/upload/image', formData);
                if (uploadRes && uploadRes.code === 200 && uploadRes.data?.url) {
                    document.getElementById('cfg-site-logo').value = uploadRes.data.url;
                    document.getElementById('cfg-logo-preview').src = uploadRes.data.url;
                    SysUI.toast('站点 Logo 上传成功！', 'success');
                } else {
                    SysUI.toast(uploadRes ? uploadRes.msg : '上传失败', 'error');
                }
            } catch(e) {
                SysUI.toast('上传出现网络异常', 'error');
            }
        });

        // Logo 恢复默认
        document.getElementById('btn-reset-logo')?.addEventListener('click', function() {
            document.getElementById('cfg-site-logo').value = '/uploads/default/site_logo.svg';
            document.getElementById('cfg-logo-preview').src = '/uploads/default/site_logo.svg';
        });

        // Logo 从图库选择
        document.getElementById('btn-pick-logo')?.addEventListener('click', () => {
            window.openMediaLibraryModal({
                title: '选择站点 Logo 图标',
                onSelect: (url) => {
                    const inp = document.getElementById('cfg-site-logo');
                    const prev = document.getElementById('cfg-logo-preview');
                    if (inp) inp.value = url;
                    if (prev) prev.src = url;
                }
            });
        });

        // Favicon 本地上传
        document.getElementById('cfg-favicon-file')?.addEventListener('change', async function() {
            const file = this.files?.[0];
            if (!file) return;
            const formData = new FormData();
            formData.append('file', file);
            SysUI.toast('正在上传 Favicon...', 'info');
            try {
                const uploadRes = await api.upload('/admin/upload/image', formData);
                if (uploadRes && uploadRes.code === 200 && uploadRes.data?.url) {
                    document.getElementById('cfg-site-favicon').value = uploadRes.data.url;
                    document.getElementById('cfg-favicon-preview').src = uploadRes.data.url;
                    SysUI.toast('Favicon 图标上传成功！', 'success');
                } else {
                    SysUI.toast(uploadRes ? uploadRes.msg : '上传失败', 'error');
                }
            } catch(e) {
                SysUI.toast('上传出现网络异常', 'error');
            }
        });

        // Favicon 恢复默认
        document.getElementById('btn-reset-favicon')?.addEventListener('click', function() {
            document.getElementById('cfg-site-favicon').value = '/uploads/default/site_favicon.svg';
            document.getElementById('cfg-favicon-preview').src = '/uploads/default/site_favicon.svg';
        });

        // Favicon 从图库选择
        document.getElementById('btn-pick-favicon')?.addEventListener('click', () => {
            window.openMediaLibraryModal({
                title: '选择浏览器 Favicon 图标',
                onSelect: (url) => {
                    const inp = document.getElementById('cfg-site-favicon');
                    const prev = document.getElementById('cfg-favicon-preview');
                    if (inp) inp.value = url;
                    if (prev) prev.src = url;
                }
            });
        });

        // 公安备案图标 本地上传
        document.getElementById('cfg-gongan-icon-file')?.addEventListener('change', async function() {
            const file = this.files?.[0];
            if (!file) return;
            const formData = new FormData();
            formData.append('file', file);
            SysUI.toast('正在上传公安网安备案图标...', 'info');
            try {
                const uploadRes = await api.upload('/admin/upload/image', formData);
                if (uploadRes && uploadRes.code === 200 && uploadRes.data?.url) {
                    document.getElementById('cfg-gongan-icon').value = uploadRes.data.url;
                    document.getElementById('cfg-gongan-icon-preview').src = uploadRes.data.url;
                    SysUI.toast('公安备案图标上传成功！', 'success');
                } else {
                    SysUI.toast(uploadRes ? uploadRes.msg : '上传失败', 'error');
                }
            } catch(e) {
                SysUI.toast('上传出现网络异常', 'error');
            }
        });

        // 公安备案图标 恢复默认
        document.getElementById('btn-reset-gongan-icon')?.addEventListener('click', function() {
            document.getElementById('cfg-gongan-icon').value = '/uploads/default/police_badge.svg';
            document.getElementById('cfg-gongan-icon-preview').src = '/uploads/default/police_badge.svg';
        });

        // 公安备案图标 从图库选择
        document.getElementById('btn-pick-gongan-icon')?.addEventListener('click', () => {
            window.openMediaLibraryModal({
                title: '选择全国公安网安备案图标',
                onSelect: (url) => {
                    const inp = document.getElementById('cfg-gongan-icon');
                    const prev = document.getElementById('cfg-gongan-icon-preview');
                    if (inp) inp.value = url;
                    if (prev) prev.src = url;
                }
            });
        });

        // 底部二维码实时同步预览
        bindImagePreviewSync('cfg-footer-qrcode-wechat', 'cfg-footer-qr-wechat-preview', '/uploads/default/site_logo.svg');
        bindImagePreviewSync('cfg-footer-qrcode-mp', 'cfg-footer-qr-mp-preview', '/uploads/default/site_logo.svg');

        // 客服微信二维码本地上传
        document.getElementById('cfg-footer-qr-wechat-file')?.addEventListener('change', async function() {
            const file = this.files?.[0];
            if (!file) return;
            const formData = new FormData();
            formData.append('file', file);
            SysUI.toast('正在上传专属客服微信二维码...', 'info');
            try {
                const uploadRes = await api.upload('/admin/upload/image', formData);
                if (uploadRes && uploadRes.code === 200 && uploadRes.data?.url) {
                    const inp = document.getElementById('cfg-footer-qrcode-wechat');
                    const prev = document.getElementById('cfg-footer-qr-wechat-preview');
                    if (inp) inp.value = uploadRes.data.url;
                    if (prev) prev.src = uploadRes.data.url;
                    SysUI.toast('专属客服微信二维码上传成功！', 'success');
                } else {
                    SysUI.toast(uploadRes ? uploadRes.msg : '上传失败', 'error');
                }
            } catch(e) {
                SysUI.toast('上传出现网络异常', 'error');
            }
        });

        // 客服微信二维码图库选择
        document.getElementById('btn-pick-qr-wechat')?.addEventListener('click', () => {
            window.openMediaLibraryModal({
                title: '选择专属客服微信二维码',
                onSelect: (url) => {
                    const inp = document.getElementById('cfg-footer-qrcode-wechat');
                    const prev = document.getElementById('cfg-footer-qr-wechat-preview');
                    if (inp) inp.value = url;
                    if (prev) prev.src = url;
                }
            });
        });

        // 官方公众号二维码本地上传
        document.getElementById('cfg-footer-qr-mp-file')?.addEventListener('change', async function() {
            const file = this.files?.[0];
            if (!file) return;
            const formData = new FormData();
            formData.append('file', file);
            SysUI.toast('正在上传官方公众号二维码...', 'info');
            try {
                const uploadRes = await api.upload('/admin/upload/image', formData);
                if (uploadRes && uploadRes.code === 200 && uploadRes.data?.url) {
                    const inp = document.getElementById('cfg-footer-qrcode-mp');
                    const prev = document.getElementById('cfg-footer-qr-mp-preview');
                    if (inp) inp.value = uploadRes.data.url;
                    if (prev) prev.src = uploadRes.data.url;
                    SysUI.toast('官方公众号二维码上传成功！', 'success');
                } else {
                    SysUI.toast(uploadRes ? uploadRes.msg : '上传失败', 'error');
                }
            } catch(e) {
                SysUI.toast('上传出现网络异常', 'error');
            }
        });

        // 官方公众号二维码图库选择
        document.getElementById('btn-pick-qr-mp')?.addEventListener('click', () => {
            window.openMediaLibraryModal({
                title: '选择官方公众号/小程序二维码',
                onSelect: (url) => {
                    const inp = document.getElementById('cfg-footer-qrcode-mp');
                    const prev = document.getElementById('cfg-footer-qr-mp-preview');
                    if (inp) inp.value = url;
                    if (prev) prev.src = url;
                }
            });
        });

        // 财务安全支付密码明文切换
        document.getElementById('btn-toggle-payout-pwd')?.addEventListener('click', function() {
            const pwdInp = document.getElementById('cfg-payout-security-password');
            if (!pwdInp) return;
            if (pwdInp.type === 'password') {
                pwdInp.type = 'text';
                this.innerText = '🔒 隐藏';
            } else {
                pwdInp.type = 'password';
                this.innerText = '👁️ 显示';
            }
        });

        // 表单保存
        document.getElementById('settings-form')?.addEventListener('submit', async function (e) {
            e.preventDefault();
            const payload = {
                configs: {
                    site_name: document.getElementById('cfg-site-name')?.value.trim(),
                    brand_name: document.getElementById('cfg-brand-name')?.value.trim(),
                    site_logo: document.getElementById('cfg-site-logo')?.value.trim(),
                    site_favicon: document.getElementById('cfg-site-favicon')?.value.trim(),
                    gong_an_icon: document.getElementById('cfg-gongan-icon')?.value.trim(),
                    service_tel: document.getElementById('cfg-service-tel')?.value.trim(),
                    copyright: document.getElementById('cfg-copyright')?.value.trim(),
                    icp_beian: document.getElementById('cfg-icp-beian')?.value.trim(),
                    gong_an_beian: document.getElementById('cfg-gongan-beian')?.value.trim(),
                    gong_an_url: document.getElementById('cfg-gongan-url')?.value.trim(),

                    seo_title: document.getElementById('cfg-seo-title')?.value.trim(),
                    seo_keywords: document.getElementById('cfg-seo-keywords')?.value.trim(),
                    seo_description: document.getElementById('cfg-seo-description')?.value.trim(),

                    banner_title: document.getElementById('cfg-banner-title')?.value.trim(),
                    banner_subtitle: document.getElementById('cfg-banner-subtitle')?.value.trim(),
                    price_lock_days: parseInt(document.getElementById('cfg-lock-days')?.value || 7),

                    ticker_enabled: document.getElementById('cfg-ticker-enabled')?.checked ? '1' : '0',
                    ticker_tag: document.getElementById('cfg-ticker-tag')?.value.trim() || '实时动态',
                    ticker_interval: parseInt(document.getElementById('cfg-ticker-interval')?.value || 4),
                    ticker_messages: document.getElementById('cfg-ticker-messages')?.value.trim() || '',

                    recycle_home_enabled: document.getElementById('cfg-recycle-home-enabled')?.checked ? '1' : '0',
                    recycle_home_name: document.getElementById('cfg-recycle-home-name')?.value.trim() || '预约免费上门',
                    recycle_home_desc: document.getElementById('cfg-recycle-home-desc')?.value.trim() || '',
                    recycle_mail_enabled: document.getElementById('cfg-recycle-mail-enabled')?.checked ? '1' : '0',
                    recycle_mail_name: document.getElementById('cfg-recycle-mail-name')?.value.trim() || '快速寄送',
                    recycle_mail_desc: document.getElementById('cfg-recycle-mail-desc')?.value.trim() || '',
                    recycle_store_enabled: document.getElementById('cfg-recycle-store-enabled')?.checked ? '1' : '0',
                    recycle_store_name: document.getElementById('cfg-recycle-store-name')?.value.trim() || '线下门店自送',
                    recycle_store_desc: document.getElementById('cfg-recycle-store-desc')?.value.trim() || '',

                    payout_alipay_enabled: document.getElementById('cfg-payout-alipay-enabled')?.checked ? '1' : '0',
                    payout_alipay_title: document.getElementById('cfg-payout-alipay-title')?.value.trim() || '支付宝',
                    payout_bank_enabled: document.getElementById('cfg-payout-bank-enabled')?.checked ? '1' : '0',
                    payout_bank_title: document.getElementById('cfg-payout-bank-title')?.value.trim() || '银行卡转账',
                    payout_wechat_enabled: document.getElementById('cfg-payout-wechat-enabled')?.checked ? '1' : '0',
                    payout_wechat_title: document.getElementById('cfg-payout-wechat-title')?.value.trim() || '微信钱包',
                    payout_cash_enabled: document.getElementById('cfg-payout-cash-enabled')?.checked ? '1' : '0',
                    payout_cash_title: document.getElementById('cfg-payout-cash-title')?.value.trim() || '现场现金结清',

                    payout_double_approval_enabled: document.getElementById('cfg-payout-double-approval-enabled')?.checked ? '1' : '0',
                    payout_audit_threshold: parseFloat(document.getElementById('cfg-payout-audit-threshold')?.value || '1000'),
                    payout_security_password: document.getElementById('cfg-payout-security-password')?.value?.trim() || '',

                    alipay_enabled: document.getElementById('cfg-alipay-enabled')?.checked ? '1' : '0',
                    alipay_sandbox: '0',
                    alipay_sign_type: document.getElementById('cfg-alipay-sign-type')?.value || 'cert',
                    alipay_appid: document.getElementById('cfg-alipay-appid')?.value.trim() || '',
                    alipay_order_title_prefix: document.getElementById('cfg-alipay-title-prefix')?.value.trim() || '二手回收款项结算',
                    alipay_transfer_scene_name: document.getElementById('cfg-alipay-transfer-scene')?.value || '二手回收',
                    alipay_transfer_scene_info_type: document.getElementById('cfg-alipay-transfer-info-type')?.value?.trim() || '',
                    alipay_report_goods_name: document.getElementById('cfg-alipay-report-goods-name')?.value?.trim() || '二手闲置设备',
                    alipay_private_key: document.getElementById('cfg-alipay-private-key')?.value.trim() || '',
                    alipay_app_cert: document.getElementById('cfg-alipay-app-cert')?.value.trim() || '',
                    alipay_public_cert: document.getElementById('cfg-alipay-public-cert')?.value.trim() || '',
                    alipay_root_cert: document.getElementById('cfg-alipay-root-cert')?.value.trim() || '',
                    alipay_public_key: document.getElementById('cfg-alipay-public-key')?.value.trim() || '',

                    wechat_transfer_enabled: document.getElementById('cfg-wechat-transfer-enabled')?.checked ? '1' : '0',
                    wechat_appid: document.getElementById('cfg-wx-appid')?.value.trim() || '',
                    miniapp_appid: document.getElementById('cfg-wx-appid')?.value.trim() || '',
                    miniapp_secret: document.getElementById('cfg-wx-secret')?.value.trim() || '',
                    mch_id: document.getElementById('cfg-wx-mchid')?.value.trim() || '',
                    mch_v3_key: document.getElementById('cfg-wx-v3key')?.value.trim() || '',
                    wechat_cert_serial_no: document.getElementById('cfg-wx-cert-serial-no')?.value.trim() || '',
                    wechat_transfer_scene_id: document.getElementById('cfg-wx-scene-id')?.value.trim() || '',
                    wechat_title_prefix: document.getElementById('cfg-wx-title-prefix')?.value.trim() || '二手回收货款',
                    wechat_private_key: document.getElementById('cfg-wx-private-key')?.value.trim() || '',
                    wechat_platform_public_key: document.getElementById('cfg-wx-platform-public-key')?.value.trim() || '',
                    wechat_platform_cert_serial_no: document.getElementById('cfg-wx-platform-cert-serial-no')?.value.trim() || '',

                    user_auth_fast_enabled: document.getElementById('cfg-settings-user-auth-fast')?.checked ? '1' : '0',
                    user_auth_password_enabled: document.getElementById('cfg-settings-user-auth-password')?.checked ? '1' : '0',
                    user_register_enabled: document.getElementById('cfg-settings-user-register-enabled')?.checked ? '1' : '0',
                    user_auth_wechat_enabled: document.getElementById('cfg-settings-user-auth-wechat')?.checked ? '1' : '0',
                    user_order_guest_enabled: document.getElementById('cfg-settings-user-order-guest')?.checked ? '1' : '0',
                    user_require_realname: document.getElementById('cfg-settings-user-require-realname')?.checked ? '1' : '0',

                    admin_entry_secret: document.getElementById('cfg-admin-entry-secret')?.value.trim() || '',

                    lingjian_ip_enabled: document.getElementById('cfg-lingjian-ip-enabled')?.checked ? '1' : '0',
                    lingjian_ip_api_key: document.getElementById('cfg-lingjian-ip-api-key')?.value.trim() || '',

                    sf_enabled: document.getElementById('cfg-sf-enabled')?.checked ? '1' : '0',
                    sf_env: document.getElementById('cfg-sf-env')?.value || 'sandbox',
                    sf_partner_id: document.getElementById('cfg-sf-partner-id')?.value.trim() || '',
                    sf_check_word: document.getElementById('cfg-sf-check-word')?.value.trim() || '',
                    sf_sign_type: document.getElementById('cfg-sf-sign-type')?.value || 'simple',
                    sf_monthly_card: document.getElementById('cfg-sf-monthly-card')?.value.trim() || '',
                    sf_pay_method: document.getElementById('cfg-sf-pay-method')?.value || '2',
                    sf_freight_tag: document.getElementById('cfg-sf-freight-tag')?.value.trim() || '运费补贴·推荐',
                    sf_freight_rule: document.getElementById('cfg-sf-freight-rule')?.value.trim() || '',
                    sf_express_type: document.getElementById('cfg-sf-express-type')?.value || '2',
                    sf_is_docall: document.getElementById('cfg-sf-is-docall')?.value || '1',
                    sf_receive_contact: document.getElementById('cfg-sf-receive-contact')?.value.trim() || '',
                    sf_receive_mobile: document.getElementById('cfg-sf-receive-mobile')?.value.trim() || '',
                    sf_receive_province: document.getElementById('cfg-sf-receive-province')?.value.trim() || '',
                    sf_receive_city: document.getElementById('cfg-sf-receive-city')?.value.trim() || '',
                    sf_receive_district: document.getElementById('cfg-sf-receive-district')?.value.trim() || '',
                    sf_receive_address: document.getElementById('cfg-sf-receive-address')?.value.trim() || '',

                    footer_desc: document.getElementById('cfg-footer-desc')?.value.trim() || '',
                    footer_trust_tags: document.getElementById('cfg-footer-trust-tags')?.value.trim() !== undefined ? document.getElementById('cfg-footer-trust-tags')?.value.trim() : '',
                    footer_service_tel: document.getElementById('cfg-footer-service-tel')?.value.trim() || '',
                    footer_service_time: document.getElementById('cfg-footer-service-time')?.value.trim() || '',
                    footer_service_email: document.getElementById('cfg-footer-service-email')?.value.trim() || '',
                    footer_address: document.getElementById('cfg-footer-address')?.value.trim() || '',
                    footer_qrcode_wechat: document.getElementById('cfg-footer-qrcode-wechat')?.value.trim() || '',
                    footer_qrcode_wechat_title: document.getElementById('cfg-footer-qrcode-wechat-title')?.value.trim() || '',
                    footer_qrcode_mp: document.getElementById('cfg-footer-qrcode-mp')?.value.trim() || '',
                    footer_qrcode_mp_title: document.getElementById('cfg-footer-qrcode-mp-title')?.value.trim() || '',
                }
            };
            const saveRes = await api.post('/admin/config/saveConfigs', payload);
            if (saveRes && saveRes.code === 200) {
                // 同步更新当前浏览器本地保存的安全密钥，防止当前管理员误锁
                const newAdminSecret = document.getElementById('cfg-admin-entry-secret')?.value.trim() || '';
                if (newAdminSecret) {
                    localStorage.setItem('ql_admin_entry_key', newAdminSecret);
                } else {
                    localStorage.removeItem('ql_admin_entry_key');
                }
                SysUI.toast('系统配置已成功保存！', 'success');
            } else {
                SysUI.toast(saveRes ? saveRes.msg : '保存失败', 'error');
            }
        });

        // 绑定辅助操作事件 (打款测试/余额查询/顺丰联调/证书上传/密钥切换等解耦至 settings_handlers.js)
        if (typeof window.bindSettingsAuxHandlers === "function") {
            window.bindSettingsAuxHandlers(container);
        }
    }

    window.renderSettingsView = renderSettingsView;
})(window);
