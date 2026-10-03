/**
 * 启灵回收系统 - 系统设置业务交割与支付物流组件
 * 提供回收履约方式、收款结算渠道、微信支付参数与顺丰速运参数的HTML模板
 */
(function(window) {
    'use strict';
    window.getSettingsBizPanelsHtml = function() {
        return `
                        <!-- 4. 回收履约服务方式面板 -->
                        <div class="settings-panel" id="panel-fulfillment">
                                                    <!-- 4. 回收履约服务方式高度自定义 -->
                        <div style="margin-bottom:28px;">
                            <div style="font-size:14px;font-weight:700;color:#6366f1;margin-bottom:14px;display:flex;align-items:center;gap:6px;">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
                                4. 回收履约服务方式高度自定义 (全国包邮 / 预约上门 / 门店网点)
                            </div>
                            
                            <!-- 模式 1: 预约免费上门 -->
                            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin-bottom:12px;">
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                                    <strong style="color:#0f172a;font-size:13px;display:flex;align-items:center;gap:6px;">
                                        <span class="badge badge-home">上门模式</span> 预约免费上门服务
                                    </strong>
                                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;font-weight:600;">
                                        <input type="checkbox" id="cfg-recycle-home-enabled" value="1"> 开启此履约方式
                                    </label>
                                </div>
                                <div style="display:grid;grid-template-columns:1fr 1.6fr;gap:12px;">
                                    <div class="login-form-group" style="margin:0;">
                                        <label style="font-size:12px;">前台展示标题</label>
                                        <input type="text" id="cfg-recycle-home-name" class="form-control" placeholder="如: 预约免费上门 / 上门拖车 / 师傅上门拆机">
                                    </div>
                                    <div class="login-form-group" style="margin:0;">
                                        <label style="font-size:12px;">前台副标题 / 服务说明</label>
                                        <input type="text" id="cfg-recycle-home-desc" class="form-control" placeholder="如: 专业人员上门，当面验货/过磅/拖车，免收上门费">
                                    </div>
                                </div>
                            </div>

                            <!-- 模式 2: 快速寄送 -->
                            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin-bottom:12px;">
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                                    <strong style="color:#0f172a;font-size:13px;display:flex;align-items:center;gap:6px;">
                                        <span class="badge badge-mail">寄送模式</span> 快速寄送服务
                                    </strong>
                                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;font-weight:600;">
                                        <input type="checkbox" id="cfg-recycle-mail-enabled" value="1"> 开启此履约方式
                                    </label>
                                </div>
                                <div style="display:grid;grid-template-columns:1fr 1.6fr;gap:12px;">
                                    <div class="login-form-group" style="margin:0;">
                                        <label style="font-size:12px;">前台展示标题</label>
                                        <input type="text" id="cfg-recycle-mail-name" class="form-control" placeholder="如: 快速寄送 / 顺丰快速寄送">
                                    </div>
                                    <div class="login-form-group" style="margin:0;">
                                        <label style="font-size:12px;">前台副标题 / 服务说明</label>
                                        <input type="text" id="cfg-recycle-mail-desc" class="form-control" placeholder="如: 快递小哥上门取件，快速寄出验机结算">
                                    </div>
                                </div>
                            </div>

                            <!-- 模式 3: 线下门店自送 -->
                            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;">
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                                    <strong style="color:#0f172a;font-size:13px;display:flex;align-items:center;gap:6px;">
                                        <span class="badge badge-store">到店模式</span> 线下门店自送服务
                                    </strong>
                                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;font-weight:600;">
                                        <input type="checkbox" id="cfg-recycle-store-enabled" value="1"> 开启此履约方式
                                    </label>
                                </div>
                                <div style="display:grid;grid-template-columns:1fr 1.6fr;gap:12px;">
                                    <div class="login-form-group" style="margin:0;">
                                        <label style="font-size:12px;">前台展示标题</label>
                                        <input type="text" id="cfg-recycle-store-name" class="form-control" placeholder="如: 线下门店自送 / 网点交接">
                                    </div>
                                    <div class="login-form-group" style="margin:0;">
                                        <label style="font-size:12px;">前台副标题 / 服务说明</label>
                                        <input type="text" id="cfg-recycle-store-desc" class="form-control" placeholder="如: 前往就近服务门店交接，现场秒级结清">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0;">

                        </div>

                        <!-- 5. 客户收款结算渠道面板 -->
                        <div class="settings-panel" id="panel-payout">
                                                    <!-- 5. 客户收款结算渠道高度自定义 -->
                        <div style="margin-bottom:28px;">
                            <div style="font-size:14px;font-weight:700;color:#8b5cf6;margin-bottom:14px;display:flex;align-items:center;gap:6px;">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
                                5. 客户收款结算渠道自定义 (支付宝 / 银行卡 / 微信 / 现金)
                            </div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
                                <!-- 渠道 1: 支付宝 -->
                                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;">
                                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                                        <span class="badge badge-alipay">支付宝收款</span>
                                        <label style="font-size:13px;display:flex;align-items:center;gap:4px;cursor:pointer;">
                                            <input type="checkbox" id="cfg-payout-alipay-enabled" value="1"> 允许用户自选
                                        </label>
                                    </div>
                                    <div class="login-form-group" style="margin:0;">
                                        <label style="font-size:12px;">前台展示名称</label>
                                        <input type="text" id="cfg-payout-alipay-title" class="form-control" placeholder="如: 支付宝 (秒级到账)">
                                    </div>
                                </div>

                                <!-- 渠道 2: 银行卡转账 -->
                                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;">
                                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                                        <span class="badge badge-bank">银行卡转账</span>
                                        <label style="font-size:13px;display:flex;align-items:center;gap:4px;cursor:pointer;">
                                            <input type="checkbox" id="cfg-payout-bank-enabled" value="1"> 允许用户自选
                                        </label>
                                    </div>
                                    <div class="login-form-group" style="margin:0;">
                                        <label style="font-size:12px;">前台展示名称</label>
                                        <input type="text" id="cfg-payout-bank-title" class="form-control" placeholder="如: 银行卡转账 (对公/个人)">
                                    </div>
                                </div>

                                <!-- 渠道 3: 微信钱包 -->
                                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;">
                                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                                        <span class="badge badge-wechat">微信钱包打款</span>
                                        <label style="font-size:13px;display:flex;align-items:center;gap:4px;cursor:pointer;">
                                            <input type="checkbox" id="cfg-payout-wechat-enabled" value="1"> 允许用户自选
                                        </label>
                                    </div>
                                    <div class="login-form-group" style="margin:0;">
                                        <label style="font-size:12px;">前台展示名称</label>
                                        <input type="text" id="cfg-payout-wechat-title" class="form-control" placeholder="如: 微信零钱 (商家转账)">
                                    </div>
                                </div>

                                <!-- 渠道 4: 现场现金结清 -->
                                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;">
                                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                                        <span class="badge badge-cash">现场现金结清</span>
                                        <label style="font-size:13px;display:flex;align-items:center;gap:4px;cursor:pointer;">
                                            <input type="checkbox" id="cfg-payout-cash-enabled" value="1"> 允许用户自选
                                        </label>
                                    </div>
                                    <div class="login-form-group" style="margin:0;">
                                        <label style="font-size:12px;">前台展示名称</label>
                                        <input type="text" id="cfg-payout-cash-title" class="form-control" placeholder="如: 现场现金结清 (当面验货秒结)">
                                    </div>
                                </div>
                            </div>

                            <!-- 大额放款出资双重安全审批与风控设置 -->
                            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:18px 20px;margin-top:20px;">
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:10px;">
                                    <div>
                                        <div style="font-size:14px;font-weight:700;color:#0f172a;display:flex;align-items:center;gap:6px;">
                                            <svg viewBox="0 0 24 24" width="18" height="18" fill="#f59e0b"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
                                            大额打款双重安全审批与风控设置
                                        </div>
                                        <div style="font-size:12px;color:#64748b;margin-top:3px;">
                                            对达到阈值的超额单据强制开启“双重安全核验与独立财务支付密码校验”，杜绝误操作与出资越权风险。
                                        </div>
                                    </div>
                                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;font-weight:700;color:#0f172a;">
                                        <input type="checkbox" id="cfg-payout-double-approval-enabled" value="1" style="width:16px;height:16px;">
                                        开启大额双重审批
                                    </label>
                                </div>

                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                                    <div class="login-form-group" style="margin:0;">
                                        <label style="font-size:12px;font-weight:600;color:#334155;">大额审批触发阈值 (元)</label>
                                        <input type="number" id="cfg-payout-audit-threshold" class="form-control" placeholder="默认 1000.00" min="1" step="0.01">
                                        <small style="color:#64748b;font-size:11px;display:block;margin-top:4px;">当订单成交放款金额大于或等于此金额时，强制触发安全二次核验</small>
                                    </div>
                                    <div class="login-form-group" style="margin:0;">
                                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                                            <label style="font-size:12px;font-weight:600;color:#334155;">独立财务安全支付密码</label>
                                            <span id="cfg-payout-pwd-status" class="badge badge-gray" style="font-size:11px;">检测中</span>
                                        </div>
                                        <div style="position:relative;">
                                            <input type="password" id="cfg-payout-security-password" class="form-control" placeholder="若留空则保持原密码不改动" autocomplete="new-password">
                                            <button type="button" id="btn-toggle-payout-pwd" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:12px;color:#64748b;">👁️ 显示</button>
                                        </div>
                                        <small style="color:#64748b;font-size:11px;display:block;margin-top:4px;">采用高强度哈希加盐存储，与管理员登录密码隔离，出资核验时比对</small>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0;">

                        </div>

                        <!-- 6. 支付宝与微信商户转账打款配置 -->
                        <div class="settings-panel" id="panel-wechat">
                            <!-- 6.1 支付宝转账配置 -->
                            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin-bottom:20px;">
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
                                    <div>
                                        <div style="font-size:14px;font-weight:700;color:#0f172a;">1. 支付宝转账配置</div>
                                        <div style="font-size:12px;color:#64748b;margin-top:2px;">配置商户 AppID 与密钥，用于向客户支付宝账户发放回收款。</div>
                                    </div>
                                    <div>
                                        <button type="button" class="btn btn-outline" id="btn-test-alipay-balance" style="height:32px;padding:0 14px;font-size:12px;">
                                            💰 查询账户余额
                                        </button>
                                    </div>
                                </div>

                                <!-- 实时余额反馈展示盒 -->
                                <div id="alipay-balance-result-box" style="display:none;margin-bottom:16px;padding:12px 16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;font-size:13px;"></div>

                                <div style="background:#f8fafc;padding:14px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:16px;">
                                    <label style="display:flex;align-items:center;gap:10px;font-weight:700;cursor:pointer;">
                                        <input type="checkbox" id="cfg-alipay-enabled" style="width:18px;height:18px;">
                                        <span>启用支付宝转账放款</span>
                                    </label>
                                    <div style="font-size:12px;color:#64748b;margin-top:4px;padding-left:28px;">开启后可在【财务放款】中心向客户直接转账出资（100% 走官方正式网关，支持公钥证书与小额真实测试）。</div>
                                </div>

                                <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:12px;color:#1e40af;line-height:1.6;">
                                    <strong>📌 支付宝转账配置指引（证书模式）：</strong><br>
                                    1. 支付宝单笔转账到支付宝账户（单笔转账出资）强制要求使用【公钥证书模式】；<br>
                                    2. <strong>商户应用私钥</strong>：请填写支付宝开放平台开发助手生成 CSR 时配套生成的 <code>应用私钥RSA2048-敏感数据，请妥善保管.txt</code> 中的全部私钥；<br>
                                    3. <strong>应用公钥证书与支付宝公钥证书</strong>：用记事本打开开放平台下载的 <code>appCertPublicKey_*.crt</code> 与 <code>alipayCertPublicKey_RSA2.crt</code>，复制全部文本粘贴到对应框中。
                                </div>

                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
                                    <div class="login-form-group" style="margin:0;">
                                        <label>加签模式 (接口验签方式) <span style="color:#ef4444;">*</span></label>
                                        <select id="cfg-alipay-sign-type" class="form-control" style="font-weight:600;">
                                            <option value="cert">公钥证书模式 (官方推荐 / 资金转账必备)</option>
                                            <option value="normal">普通公钥模式 (仅用于普通支付接口)</option>
                                        </select>
                                    </div>
                                    <div class="login-form-group" style="margin:0;">
                                        <label>支付宝应用 AppID <span style="color:#ef4444;">*</span></label>
                                        <input type="text" id="cfg-alipay-appid" class="form-control" placeholder="例如: 2021000000000000">
                                    </div>
                                </div>

                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
                                    <div class="login-form-group" style="margin:0;">
                                        <label>出资账单标题</label>
                                        <input type="text" id="cfg-alipay-title-prefix" class="form-control" placeholder="例如: 二手回收款项结算">
                                        <small style="color:#64748b;margin-top:4px;display:block;">显示在客户支付宝账单明细中（建议10字内）</small>
                                    </div>
                                    <div class="login-form-group" style="margin:0;">
                                        <label>转账业务场景 (transfer_scene_name) <span style="color:#ef4444;">*</span></label>
                                        <select id="cfg-alipay-transfer-scene" class="form-control" style="font-weight:600;">
                                            <option value="二手回收">二手回收 (官方标准场景 / 推荐)</option>
                                            <option value="业务结算">业务结算 (通用商户出资结算)</option>
                                            <option value="企业退款">企业退款</option>
                                            <option value="佣金报酬">佣金报酬</option>
                                            <option value="现金营销">现金营销</option>
                                        </select>
                                        <small style="color:#0284c7;margin-top:4px;display:block;">💡 支付宝2026合规必填。须与【支付宝商家平台 b.alipay.com -> 资金管理 -> 转账场景】一致。</small>
                                    </div>
                                </div>

                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
                                    <div class="login-form-group" style="margin:0;">
                                        <label>转账上报通用商品名称 (info_content) <span style="color:#10b981;font-weight:600;">(安全隔离)</span></label>
                                        <input type="text" id="cfg-alipay-report-goods-name" class="form-control" value="二手闲置设备" placeholder="例如: 二手闲置设备 / 数码电子设备">
                                        <small style="color:#64748b;margin-top:4px;display:block;">向支付宝上报的统一合规品名。使用通用词可完全杜绝因前台具体商品标题超长或未知敏感词被网关拦截。</small>
                                    </div>
                                    <div class="login-form-group" style="margin:0;">
                                        <label>场景上报信息类型 (info_type) <span style="color:#64748b;font-weight:normal;">(选填，高级配置)</span></label>
                                        <input type="text" id="cfg-alipay-transfer-info-type" class="form-control" placeholder="留空时系统智能匹配（“二手回收”默认按官方标准上报【回收商品名称】）">
                                        <small style="color:#64748b;margin-top:4px;display:block;">留空即可。系统默认按官方接口要求上报“回收商品名称”，并支持智能匹配。</small>
                                    </div>
                                </div>

                                <div class="login-form-group" style="margin-bottom:16px;">
                                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                                        <label style="margin:0;">商户应用私钥 (Private Key) <span style="color:#ef4444;">*</span></label>
                                        <button type="button" class="btn btn-outline" id="btn-toggle-alipay-privkey" style="height:26px;padding:0 8px;font-size:11px;">👁️ 切换明文/密文</button>
                                    </div>
                                    <textarea id="cfg-alipay-private-key" class="form-control" rows="4" style="font-family:monospace;font-size:12px;" placeholder="请粘贴【应用私钥RSA2048-敏感数据，请妥善保管.txt】中的内容（以 -----BEGIN RSA PRIVATE KEY----- 或纯Base64开头）"></textarea>
                                    <small style="color:#64748b;margin-top:4px;display:block;">⚠️ 必须与生成 CSR 时配套的应用私钥严格一致，否则支付宝网关将报“验签出错/私钥与公钥不匹配”。</small>
                                </div>

                                <!-- 证书模式区域 -->
                                <div id="alipay-cert-fields-wrap">
                                    <div class="login-form-group" style="margin-bottom:16px;">
                                        <label>应用公钥证书 (appCertPublicKey_*.crt) <span style="color:#ef4444;">*</span></label>
                                        <textarea id="cfg-alipay-app-cert" class="form-control" rows="4" style="font-family:monospace;font-size:12px;" placeholder="用记事本打开 appCertPublicKey_xxxx.crt 复制全部内容粘贴到此处（以 -----BEGIN CERTIFICATE----- 开头）"></textarea>
                                        <small style="color:#64748b;margin-top:4px;display:block;">在支付宝开放平台应用【接口加签方式】上传 CSR 后下载的“应用公钥证书”。用于生成 app_cert_sn。</small>
                                    </div>

                                    <div class="login-form-group" style="margin-bottom:16px;">
                                        <label>支付宝公钥证书 (alipayCertPublicKey_RSA2.crt) <span style="color:#ef4444;">*</span></label>
                                        <textarea id="cfg-alipay-public-cert" class="form-control" rows="4" style="font-family:monospace;font-size:12px;" placeholder="用记事本打开 alipayCertPublicKey_RSA2.crt 复制全部内容粘贴到此处（以 -----BEGIN CERTIFICATE----- 开头）"></textarea>
                                        <small style="color:#64748b;margin-top:4px;display:block;">在支付宝开放平台应用【接口加签方式】下载的“支付宝公钥证书”。用于验证支付宝网关返回数据的签名。</small>
                                    </div>

                                    <div class="login-form-group" style="margin:0;">
                                        <label>支付宝根证书 (alipayRootCert.crt) <span style="color:#64748b;font-weight:normal;">(选填)</span></label>
                                        <textarea id="cfg-alipay-root-cert" class="form-control" rows="3" style="font-family:monospace;font-size:12px;" placeholder="用记事本打开 alipayRootCert.crt 复制全部内容粘贴到此处（选填，系统已默认内置官方标准根证书 SN 自动兜底）"></textarea>
                                        <small style="color:#64748b;margin-top:4px;display:block;">在支付宝开放平台下载的“支付宝根证书”。若不填写，系统将自动使用官方标准根证书序列号兜底。</small>
                                    </div>
                                </div>

                                <!-- 普通公钥模式区域 -->
                                <div id="alipay-normal-fields-wrap" style="display:none;">
                                    <div class="login-form-group" style="margin:0;">
                                        <label>支付宝公钥 (Public Key) <span style="color:#ef4444;">*</span></label>
                                        <textarea id="cfg-alipay-public-key" class="form-control" rows="3" style="font-family:monospace;font-size:12px;" placeholder="请粘贴支付宝开放平台提供的普通支付宝公钥（非证书）"></textarea>
                                        <small style="color:#ef4444;margin-top:4px;display:block;">⚠️ 注意：普通公钥模式不支持支付宝转账出资接口，仅可用于普通电脑网站或手机网站支付。</small>
                                    </div>
                                </div>
                            </div>

                            <!-- 6.2 支付宝在线打款测试 -->
                            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin-bottom:20px;">
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:8px;">
                                    <div style="font-size:14px;font-weight:700;color:#0f172a;">
                                        2. 支付宝转账测试
                                    </div>
                                    <span style="font-size:12px;color:#64748b;">输入账号测试转账连通性</span>
                                </div>
                                <div style="font-size:12px;color:#64748b;margin-bottom:16px;">
                                    保存上方密钥配置后，可输入测试账号发起小额真实转账（建议 0.10 元）。
                                </div>

                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
                                    <div class="login-form-group" style="margin:0;">
                                        <label>测试收款支付宝账号 <span style="color:#ef4444;">*</span></label>
                                        <input type="text" id="test-payout-account" class="form-control" placeholder="手机号、邮箱或 2088UID">
                                        <small style="color:#64748b;margin-top:4px;display:block;">支持输入支付宝绑定的手机号、登录邮箱，或 2088 开头的支付宝 UID</small>
                                    </div>
                                    <div class="login-form-group" style="margin:0;">
                                        <label>收款人真实姓名 <span style="color:#ef4444;">*</span></label>
                                        <input type="text" id="test-payout-name" class="form-control" placeholder="如: 张三 (须与该支付宝实名一致)">
                                        <small style="color:#ef4444;margin-top:4px;display:block;">⚠️ 必须与该支付宝账号绑定的【身份证法定中文姓名】100%一致，不能填昵称或别名！</small>
                                    </div>
                                </div>

                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px;">
                                    <div class="login-form-group" style="margin:0;">
                                        <label>测试金额 (元) <span style="color:#ef4444;">*</span></label>
                                        <input type="number" id="test-payout-amount" class="form-control" value="0.10" step="0.01" min="0.01" max="100.00">
                                        <small style="color:#64748b;margin-top:4px;display:block;">建议输入 0.10 元</small>
                                    </div>
                                    <div class="login-form-group" style="margin:0;">
                                        <label>转账备注 (回收物品说明)</label>
                                        <input type="text" id="test-payout-remark" class="form-control" value="二手设备回收结算" placeholder="可随意填写，如：笔记本电脑、黄金饰品、数码相机等">
                                        <small style="color:#64748b;margin-top:4px;display:block;">支持任意回收行业品类。真实业务中将自动读取订单中的实际物品名称。</small>
                                    </div>
                                </div>

                                <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
                                    <button type="button" class="btn btn-success" id="btn-exec-test-payout" style="height:36px;padding:0 20px;font-size:13px;font-weight:600;background:#10b981;border-color:#10b981;">
                                        发起测试打款
                                    </button>
                                </div>

                                <!-- 测试打款结果反馈展示盒 -->
                                <div id="alipay-test-payout-result-box" style="display:none;margin-top:14px;border-radius:8px;padding:14px 18px;font-size:13px;line-height:1.6;"></div>
                            </div>

                            <!-- 6.3 微信支付与商家转账配置 (APIv3 升级版) -->
                            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin-bottom:20px;">
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
                                    <div>
                                        <div style="font-size:14px;font-weight:700;color:#0f172a;">3. 微信支付与商家转账配置 (APIv3 升级版)</div>
                                        <div style="font-size:12px;color:#64748b;margin-top:2px;">配置商户号、API 证书与私钥，用于向客户微信零钱发放回收款。</div>
                                    </div>
                                    <div>
                                        <button type="button" class="btn btn-outline" id="btn-test-wechat-balance" style="height:32px;padding:0 14px;font-size:12px;">
                                            💰 查询账户余额
                                        </button>
                                    </div>
                                </div>

                                <!-- 微信实时余额反馈展示盒 -->
                                <div id="wechat-balance-result-box" style="display:none;margin-bottom:16px;padding:12px 16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;font-size:13px;"></div>

                                <div style="background:#f8fafc;padding:14px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:16px;">
                                    <label style="display:flex;align-items:center;gap:10px;font-weight:700;cursor:pointer;">
                                        <input type="checkbox" id="cfg-wechat-transfer-enabled" style="width:18px;height:18px;">
                                        <span>启用微信商家转账放款</span>
                                    </label>
                                    <div style="font-size:12px;color:#64748b;margin-top:4px;padding-left:28px;">开启后可在【财务放款】中心向客户微信零钱发起商家转账出资。</div>
                                </div>

                                <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:12px;color:#1e40af;line-height:1.6;">
                                    💡 <strong>核心区分说明</strong>：微信小程序前端所需的 AppID、AppSecret 密钥、授权登录与基础策略，已统一整合至左侧主菜单 <strong>【小程序装修 -> ⚙️ 开发与基础设置】</strong> 中集中设置。本区域仅用于配置商户出资结算相关的商户号 (MchId) 与 APIv3 证书私钥。若商户号绑定的小程序正是此小程序，下方 AppID 会自动同步复用。
                                </div>

                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
                                    <div class="login-form-group" style="margin:0;">
                                        <label>微信小程序/应用 AppID <span style="color:#ef4444;">*</span></label>
                                        <input type="text" id="cfg-wx-appid" class="form-control" placeholder="如: wx1234567890abcdef">
                                    </div>
                                    <div class="login-form-group" style="margin:0;">
                                        <label>微信小程序 AppSecret</label>
                                        <input type="password" id="cfg-wx-secret" class="form-control" placeholder="填写小程序密钥 (用于换取OpenID)">
                                    </div>
                                </div>

                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
                                    <div class="login-form-group" style="margin:0;">
                                        <label>微信支付商户号 (MchId) <span style="color:#ef4444;">*</span></label>
                                        <input type="text" id="cfg-wx-mchid" class="form-control" placeholder="例如: 1600000000">
                                    </div>
                                    <div class="login-form-group" style="margin:0;">
                                        <label>商户 APIv3 密钥 (32位) <span style="color:#ef4444;">*</span></label>
                                        <input type="password" id="cfg-wx-v3key" class="form-control" placeholder="32位商户 APIv3 密钥">
                                    </div>
                                </div>

                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
                                    <div class="login-form-group" style="margin:0;">
                                        <label>商户 API 证书序列号 <span style="color:#ef4444;">*</span></label>
                                        <input type="text" id="cfg-wx-cert-serial-no" class="form-control" placeholder="例如: 3775B6A45ACDCE70538E477F2CC0A3FC38F40173">
                                        <small style="color:#64748b;margin-top:4px;display:block;">在微信商户平台【API安全-管理API证书】查看40位证书序列号</small>
                                    </div>
                                    <div class="login-form-group" style="margin:0;">
                                        <label>转账场景 ID (选填)</label>
                                        <input type="text" id="cfg-wx-scene-id" class="form-control" placeholder="例如: 1001 (商户平台申请的二手回收场景ID)">
                                        <small style="color:#64748b;margin-top:4px;display:block;">如微信商户号申请了专属回收转账场景请填写</small>
                                    </div>
                                </div>

                                <div class="login-form-group" style="margin-bottom:16px;">
                                    <label>用户收款感知 / 账单备注前缀</label>
                                    <input type="text" id="cfg-wx-title-prefix" class="form-control" placeholder="默认: 二手回收货款">
                                    <small style="color:#64748b;margin-top:4px;display:block;">展示在客户微信支付到账通知中 (建议8字内)</small>
                                </div>

                                <div class="login-form-group" style="margin-bottom:16px;">
                                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                                        <label style="margin:0;">商户 API 私钥 (apiclient_key.pem) <span style="color:#ef4444;">*</span></label>
                                        <button type="button" class="btn btn-outline" id="btn-toggle-wechat-privkey" style="height:26px;padding:0 8px;font-size:11px;">👁️ 切换明文/密文</button>
                                    </div>
                                    <textarea id="cfg-wx-private-key" class="form-control" rows="4" style="font-family:monospace;font-size:12px;" placeholder="请粘贴 apiclient_key.pem 文件内容 (以 -----BEGIN PRIVATE KEY----- 开头)"></textarea>
                                </div>

                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:0;">
                                    <div class="login-form-group" style="margin:0;">
                                        <label>微信支付平台公钥/证书 (用于敏感信息加密)</label>
                                        <textarea id="cfg-wx-platform-public-key" class="form-control" rows="3" style="font-family:monospace;font-size:12px;" placeholder="单笔转账金额大于等于2000元时强制要求配置，粘贴平台证书或微信支付公钥"></textarea>
                                    </div>
                                    <div class="login-form-group" style="margin:0;">
                                        <label>微信支付平台证书序列号 / 公钥ID</label>
                                        <input type="text" id="cfg-wx-platform-cert-serial-no" class="form-control" placeholder="配置平台证书时对应的证书序列号">
                                        <small style="color:#64748b;margin-top:4px;display:block;">用于请求头 Wechatpay-Serial 传递</small>
                                    </div>
                                </div>
                            </div>

                            <!-- 6.4 微信商家转账在线测试 -->
                            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin-bottom:20px;">
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:8px;">
                                    <div style="font-size:14px;font-weight:700;color:#0f172a;">
                                        4. 微信商家转账测试
                                    </div>
                                    <span style="font-size:12px;color:#64748b;">输入微信 OpenID 测试转账连通性</span>
                                </div>
                                <div style="font-size:12px;color:#64748b;margin-bottom:16px;">
                                    保存上方密钥配置后，可输入测试 OpenID 发起小额真实转账（微信限制单笔出资最低 0.30 元）。
                                </div>

                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
                                    <div class="login-form-group" style="margin:0;">
                                        <label>测试收款人微信 OpenID <span style="color:#ef4444;">*</span></label>
                                        <input type="text" id="test-wechat-openid" class="form-control" placeholder="例如: oUpF8uMuAJO_M2pxb1Q9zNjWeS6o">
                                    </div>
                                    <div class="login-form-group" style="margin:0;">
                                        <label>收款人真实姓名 (选填，金额>=2000元必填)</label>
                                        <input type="text" id="test-wechat-name" class="form-control" placeholder="与收款微信号实名一致的姓名">
                                    </div>
                                </div>

                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px;">
                                    <div class="login-form-group" style="margin:0;">
                                        <label>测试金额 (元) <span style="color:#ef4444;">*</span></label>
                                        <input type="number" id="test-wechat-amount" class="form-control" value="0.30" step="0.01" min="0.30" max="100.00">
                                        <small style="color:#64748b;margin-top:4px;display:block;">微信单笔最低限制为 0.30 元</small>
                                    </div>
                                    <div class="login-form-group" style="margin:0;">
                                        <label>转账备注</label>
                                        <input type="text" id="test-wechat-remark" class="form-control" value="微信商家转账测试">
                                    </div>
                                </div>

                                <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
                                    <button type="button" class="btn btn-success" id="btn-exec-test-wechat-payout" style="height:36px;padding:0 20px;font-size:13px;font-weight:600;background:#10b981;border-color:#10b981;">
                                        发起微信测试打款
                                    </button>
                                </div>

                                <!-- 微信测试打款结果反馈展示盒 -->
                                <div id="wechat-test-payout-result-box" style="display:none;margin-top:14px;border-radius:8px;padding:14px 18px;font-size:13px;line-height:1.6;"></div>
                            </div>

                            <hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0;">
                        </div>

                        <!-- 7. 顺丰速运开放平台对接面板 (EXP_RECE_CREATE_ORDER 标准) -->
                        <div class="settings-panel" id="panel-sf">
                            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin-bottom:20px;">
                                <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
                                    <div>
                                        <div style="font-size:15px;font-weight:700;color:#0f172a;display:flex;align-items:center;gap:8px;">
                                            <span style="font-size:18px;">📦</span> 顺丰速运开放平台对接设置 (下订单接口 EXP_RECE_CREATE_ORDER)
                                        </div>
                                        <div style="font-size:12px;color:#64748b;margin-top:4px;">
                                            对接顺丰开放平台官方下订单标准接口，支持用户选择【快速寄送】时自动通知顺丰小哥上门取件并回填真实单号。
                                        </div>
                                    </div>
                                    <span class="badge" style="background:#f1f5f9;color:#475569;font-size:11px;padding:4px 8px;">官方协议标准 Base64-MD5 验签</span>
                                </div>

                                <!-- 独立总开关与环境控制 -->
                                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:20px;">
                                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:center;">
                                        <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;margin:0;">
                                            <input type="checkbox" id="cfg-sf-enabled" style="width:20px;height:20px;margin-top:2px;">
                                            <div>
                                                <div style="font-size:14px;font-weight:700;color:#0f172a;">启用顺丰速运自动下单与揽件服务</div>
                                                <div style="font-size:12px;color:#64748b;margin-top:2px;">
                                                    默认关闭。开启后寄件模式将自动请求顺丰接口；关闭或未配置时平滑降级，绝不影响用户正常下单。
                                                </div>
                                            </div>
                                        </label>
                                        <div class="login-form-group" style="margin:0;">
                                            <label style="font-size:13px;font-weight:600;">运行环境模式</label>
                                            <select id="cfg-sf-env" class="form-control">
                                                <option value="sandbox">沙箱联调测试环境 (sfapi-sbox.sf-express.com)</option>
                                                <option value="prod">正式生产商业环境 (bspgw.sf-express.com)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <!-- 顺丰开放平台凭据 -->
                                <div style="font-size:14px;font-weight:700;color:#1e58ff;margin-bottom:14px;">
                                    1. 顺丰速运开发者凭证 (丰桥 / 开放平台分配)
                                </div>
                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
                                    <div class="login-form-group">
                                        <label>顾客编码 (partnerID) <span style="color:#ef4444;">*</span></label>
                                        <input type="text" id="cfg-sf-partner-id" class="form-control" placeholder="如: YzXXXXXXXXXX (在顺丰开放平台基本信息中查看)">
                                        <small style="color:#64748b;margin-top:4px;display:block;">即顺丰开放平台分配的合作伙伴或月结客户专属编码</small>
                                    </div>
                                    <div class="login-form-group">
                                        <label>接口校验码 (checkWord) <span style="color:#ef4444;">*</span></label>
                                        <div style="display:flex;gap:8px;">
                                            <input type="password" id="cfg-sf-check-word" class="form-control" placeholder="顺丰接口校验码，用于生成 MD5 摘要签名">
                                            <button type="button" class="btn btn-outline" id="btn-toggle-sf-checkword" style="padding:0 12px;font-size:12px;white-space:nowrap;">👁️ 查看</button>
                                        </div>
                                        <small style="color:#64748b;margin-top:4px;display:block;">安全保存在本地服务端，严防泄露</small>
                                    </div>
                                </div>

                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
                                    <div class="login-form-group">
                                        <label>应用签名加密方式 (signType) <span style="color:#ef4444;">*</span></label>
                                        <select id="cfg-sf-sign-type" class="form-control">
                                            <option value="simple">简易 MD5 模式 (推荐，顺丰开放平台应用创建默认选择此项，含时间戳验签)</option>
                                            <option value="standard">标准 MD5 模式 (传统旧版接口，不含时间戳)</option>
                                        </select>
                                        <small style="color:#64748b;margin-top:4px;display:block;">若在顺丰控制台选择【简易MD5】，请务必选择此项 (系统支持智能自适应探测)</small>
                                    </div>
                                    <div class="login-form-group">
                                        <label>顺丰月结卡号 (monthlyCard)</label>
                                        <input type="text" id="cfg-sf-monthly-card" class="form-control" placeholder="10位顺丰月结卡号 (如: 7551234567)">
                                        <small style="color:#64748b;margin-top:4px;display:block;">平台在顺丰开通的企业月结卡号，填入后顺丰按【收方月结】统一记账扣款</small>
                                    </div>
                                </div>

                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
                                    <div class="login-form-group">
                                        <label>顺丰运费付款方式 (payMethod) <span style="color:#ef4444;">*</span></label>
                                        <select id="cfg-sf-pay-method" class="form-control">
                                            <option value="2">2 - 收方付 (推荐：配置月结卡号自动为【收方月结】，未配月结为【到付现结】)</option>
                                            <option value="1">1 - 寄方付 (寄件人现场自付，适合小平台采用【寄付+成交补贴】模式)</option>
                                            <option value="3">3 - 第三方付 (由指定第三方月结卡号结算)</option>
                                        </select>
                                        <small style="color:#64748b;margin-top:4px;display:block;">回收寄件方是普通客户（无顺丰账号），平台是收方。若配置了月结卡号，选“收方付”顺丰会自动按<b>【收方月结】</b>记账扣费；未配月结则为仓库签收到付。</small>
                                    </div>
                                    <div class="login-form-group">
                                        <label>快递产品类别 (expressTypeId)</label>
                                        <select id="cfg-sf-express-type" class="form-control">
                                            <option value="2">2 - 顺丰标快 (推荐，经济高效)</option>
                                            <option value="1">1 - 顺丰特快 (次日高时效)</option>
                                        </select>
                                        <small style="color:#64748b;margin-top:4px;display:block;">顺丰运力服务等级</small>
                                    </div>
                                </div>

                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
                                    <div class="login-form-group">
                                        <label>是否通知顺丰收派员上门收件 (isDocall)</label>
                                        <select id="cfg-sf-is-docall" class="form-control">
                                            <option value="1">1 - 要求收派员上门收件揽件 (推荐，小哥上门取机)</option>
                                            <option value="0">0 - 仅生成电子运单与面单号，不通知上门</option>
                                        </select>
                                        <small style="color:#64748b;margin-top:4px;display:block;">是否触发顺丰小哥上门揽件指令</small>
                                    </div>
                                    <div class="login-form-group">
                                        <label>前台顺丰卡片展示标签 (建议6字内)</label>
                                        <input type="text" id="cfg-sf-freight-tag" class="form-control" placeholder="如: 运费补贴·推荐 或 顺丰上门·推荐">
                                        <small style="color:#64748b;margin-top:4px;display:block;">显示在用户下单选择顺丰卡片右上角的徽章，默认: 运费补贴·推荐</small>
                                    </div>
                                </div>

                                <div class="login-form-group" style="margin-bottom:20px;">
                                    <label>平台运费补贴与寄送规则说明 (展示在前台订单弹窗与说明弹窗中)</label>
                                    <textarea id="cfg-sf-freight-rule" class="form-control" rows="5" placeholder="请填写您平台的运费承担与补贴细则，例如：&#10;1. 订单质检成交后，平台承担运费或补贴最高25元；&#10;2. 自行寄送用户录入单号同样享受补贴；&#10;3. 若机器存在仿冒山寨、有密码无法解锁或拒绝差价退回，往返运费需用户自理。"></textarea>
                                    <small style="color:#64748b;margin-top:4px;display:block;">商户可自由配置运费规则与补贴上限，避免大平台全包模式下的恶意刷单与退运亏损</small>
                                </div>

                                <!-- 平台仓库收件地址 (收件方 contactType=2) -->
                                <div style="font-size:14px;font-weight:700;color:#1e58ff;margin-bottom:14px;display:flex;align-items:center;gap:6px;">
                                    <span>🏬</span> 2. 平台回收质检仓库收件信息 (快件送达目的地)
                                </div>
                                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:20px;">
                                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:12px;">
                                        <div class="login-form-group" style="margin:0;">
                                            <label>仓库收件人姓名 <span style="color:#ef4444;">*</span></label>
                                            <input type="text" id="cfg-sf-receive-contact" class="form-control" placeholder="如: 启灵回收质检中心">
                                        </div>
                                        <div class="login-form-group" style="margin:0;">
                                            <label>仓库联系电话/固话 <span style="color:#ef4444;">*</span></label>
                                            <input type="text" id="cfg-sf-receive-mobile" class="form-control" placeholder="如: 400-800-8888 或 手机号">
                                        </div>
                                    </div>
                                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px;">
                                        <div class="login-form-group" style="margin:0;">
                                            <label>所在省份</label>
                                            <input type="text" id="cfg-sf-receive-province" class="form-control" placeholder="如: 广东省">
                                        </div>
                                        <div class="login-form-group" style="margin:0;">
                                            <label>所在城市</label>
                                            <input type="text" id="cfg-sf-receive-city" class="form-control" placeholder="如: 深圳市">
                                        </div>
                                        <div class="login-form-group" style="margin:0;">
                                            <label>所在区/县</label>
                                            <input type="text" id="cfg-sf-receive-district" class="form-control" placeholder="如: 南山区">
                                        </div>
                                    </div>
                                    <div class="login-form-group" style="margin:0;">
                                        <label>详细收件地址 <span style="color:#ef4444;">*</span></label>
                                        <input type="text" id="cfg-sf-receive-address" class="form-control" placeholder="如: 粤海街道高新南一道科兴科学园B座302室质检收发部">
                                    </div>
                                </div>

                                <!-- 顺丰连通性在线测试卡片 -->
                                <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px;">
                                    <div style="font-size:14px;font-weight:700;color:#0369a1;margin-bottom:4px;">
                                        3. 顺丰速运接口连通性自动化诊断
                                    </div>
                                    <div style="font-size:12px;color:#0284c7;margin-bottom:10px;">
                                        在保存或联调前，可点击下方按钮直接向顺丰网关发起探测试算，验证顾客编码与校验码是否握手成功。
                                    </div>
                                    <div style="font-size:12px;color:#0369a1;background:#e0f2fe;border:1px dashed #7dd3fc;border-radius:6px;padding:8px 12px;margin-bottom:12px;display:flex;align-items:center;gap:6px;">
                                        <span>🛡️</span>
                                        <span><strong>安全无忧说明：</strong>此测试仅用于验证接口握手与 MD5 签名算法有效性，已强制硬编码 <code>isDocall: 0</code>（顺丰官方不通知小哥上门取件），且顺丰仅在实际交件称重后才会计费，测试过程<strong>绝不会通知快递员上门</strong>，也<strong>绝不会产生任何扣费</strong>，请放心测试。</span>
                                    </div>
                                    <button type="button" class="btn btn-primary" id="btn-test-sf-express" style="height:36px;padding:0 18px;background:#0284c7;border-color:#0284c7;">
                                        ⚡ 发起顺丰接口连通性测试
                                    </button>
                                    <div id="sf-test-result-box" style="display:none;margin-top:12px;background:#fff;border:1px solid #bae6fd;border-radius:6px;padding:12px 16px;font-size:13px;line-height:1.6;"></div>
                                </div>

                                <!-- 4. 顺丰速运主动推送回调配置 (整合精简版) -->
                                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-top:20px;">
                                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:8px;">
                                        <div style="font-size:14px;font-weight:700;color:#0f172a;display:flex;align-items:center;gap:6px;">
                                            <span>🔔</span>
                                            <span>4. 顺丰速运主动推送回调配置 (官方联调上线必填)</span>
                                        </div>
                                        <span style="font-size:11px;background:#e0f2fe;color:#0369a1;padding:2px 8px;border-radius:4px;font-weight:600;">推送方式务必选择 JSON</span>
                                    </div>
                                    <div style="font-size:12px;color:#64748b;margin-bottom:14px;line-height:1.5;">
                                        顺丰控制台添加推送权限或联调时，直接复制下方推荐地址分别粘贴到【沙箱环境地址】与【生产环境地址】，点击【网络测试】即可秒级绿灯通过。
                                    </div>

                                    <div style="display:flex;flex-direction:column;gap:12px;">
                                        <!-- 清单运费推送 -->
                                        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:10px 12px;">
                                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                                                <div style="font-size:12px;font-weight:700;color:#334155;display:flex;align-items:center;gap:4px;">
                                                    <span style="color:#86198f;">●</span> 清单运费推送接口 <span style="font-size:11px;color:#94a3b8;font-weight:normal;">(EXP_RECE_WAYBILLS_FEE_PUSH)</span>
                                                </div>
                                                <span style="font-size:11px;color:#64748b;">称重与实收运费自动对账</span>
                                            </div>
                                            <div style="display:flex;gap:8px;align-items:center;">
                                                <input type="text" id="sf-push-callback-url-primary" class="form-control" readonly style="background:#f8fafc;font-family:monospace;font-size:12px;color:#0f172a;" value="">
                                                <button type="button" class="btn btn-secondary" id="btn-copy-sf-callback-primary" style="height:34px;padding:0 14px;font-size:12px;white-space:nowrap;background:#a855f7;border-color:#a855f7;color:#fff;">
                                                    📋 复制地址
                                                </button>
                                            </div>
                                        </div>

                                        <!-- 运单路由推送 -->
                                        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:10px 12px;">
                                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                                                <div style="font-size:12px;font-weight:700;color:#334155;display:flex;align-items:center;gap:4px;">
                                                    <span style="color:#16a34a;">●</span> 运单路由推送接口 <span style="font-size:11px;color:#94a3b8;font-weight:normal;">(RoutePushService)</span>
                                                </div>
                                                <span style="font-size:11px;color:#64748b;">实时增量轨迹·签收自动推进为已收货</span>
                                            </div>
                                            <div style="display:flex;gap:8px;align-items:center;">
                                                <input type="text" id="sf-route-callback-url-primary" class="form-control" readonly style="background:#f8fafc;font-family:monospace;font-size:12px;color:#0f172a;" value="">
                                                <button type="button" class="btn btn-secondary" id="btn-copy-sf-route-primary" style="height:34px;padding:0 14px;font-size:12px;white-space:nowrap;background:#16a34a;border-color:#16a34a;color:#fff;">
                                                    📋 复制地址
                                                </button>
                                            </div>
                                        </div>

                                        <!-- 订单状态推送 -->
                                        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:10px 12px;">
                                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                                                <div style="font-size:12px;font-weight:700;color:#334155;display:flex;align-items:center;gap:4px;">
                                                    <span style="color:#2563eb;">●</span> 订单状态推送接口 <span style="font-size:11px;color:#94a3b8;font-weight:normal;">(PushOrderState)</span>
                                                </div>
                                                <span style="font-size:11px;color:#64748b;">快递员电话/工号同步·取件自动推进为运输中</span>
                                            </div>
                                            <div style="display:flex;gap:8px;align-items:center;">
                                                <input type="text" id="sf-state-callback-url-primary" class="form-control" readonly style="background:#f8fafc;font-family:monospace;font-size:12px;color:#0f172a;" value="">
                                                <button type="button" class="btn btn-secondary" id="btn-copy-sf-state-primary" style="height:34px;padding:0 14px;font-size:12px;white-space:nowrap;background:#2563eb;border-color:#2563eb;color:#fff;">
                                                    📋 复制地址
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 11. 商业正版授权管理面板 -->
                        <div class="settings-panel" id="panel-license">
                            <div style="margin-bottom:28px;">
                                <div style="font-size:14px;font-weight:700;color:#1e58ff;margin-bottom:14px;display:flex;align-items:center;gap:6px;">
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>
                                    11. 官方正版商业授权管理
                                </div>

                                <!-- 状态指示卡片 (动态渲染) -->
                                <div id="lic-status-banner" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px 20px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;gap:16px;">
                                    <div style="display:flex;align-items:center;gap:14px;">
                                        <div id="lic-status-icon" style="width:44px;height:44px;border-radius:10px;background:#e2e8f0;display:flex;align-items:center;justify-content:center;font-size:22px;color:#64748b;flex-shrink:0;">
                                            🛡️
                                        </div>
                                        <div>
                                            <div id="lic-status-title" style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:3px;">
                                                正在获取授权状态...
                                            </div>
                                            <div id="lic-status-desc" style="font-size:12px;color:#64748b;">
                                                系统正在与官方授权中心核验授权凭证，请稍候
                                            </div>
                                        </div>
                                    </div>
                                    <div id="lic-status-badge-wrap">
                                        <span class="badge" id="lic-status-badge" style="background:#f1f5f9;color:#64748b;font-size:12px;padding:4px 12px;">检测中</span>
                                    </div>
                                </div>

                                <!-- 4项关键参数指标看板 -->
                                <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:12px;margin-bottom:24px;">
                                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;">
                                        <div style="font-size:11px;color:#64748b;margin-bottom:4px;display:flex;justify-content:space-between;align-items:center;">
                                            <span>当前运行域名</span>
                                            <button type="button" id="btn-copy-lic-domain" style="background:none;border:none;color:#1e58ff;cursor:pointer;font-size:11px;padding:0;font-weight:600;" title="复制此域名并在授权中心绑定">复制</button>
                                        </div>
                                        <div id="lic-current-domain" style="font-size:14px;font-weight:700;color:#0f172a;word-break:break-all;font-family:monospace;">
                                            检测中...
                                        </div>
                                    </div>
                                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;">
                                        <div style="font-size:11px;color:#64748b;margin-bottom:4px;">官方授权验证节点</div>
                                        <div style="font-size:13px;font-weight:700;color:#0f172a;font-family:monospace;display:flex;align-items:center;gap:4px;">
                                            https://www.jingxialai.com
                                        </div>
                                    </div>
                                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;">
                                        <div style="font-size:11px;color:#64748b;margin-bottom:4px;">系统发行版本</div>
                                        <div id="lic-system-version" style="font-size:14px;font-weight:700;color:#0f172a;font-family:monospace;">
                                            v1.0.0
                                        </div>
                                    </div>
                                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;">
                                        <div style="font-size:11px;color:#64748b;margin-bottom:4px;">授权状态 / 运行模式</div>
                                        <div id="lic-last-check-text" style="font-size:12px;font-weight:600;color:#334155;line-height:1.4;">
                                            -
                                        </div>
                                    </div>
                                </div>

                                <!-- 授权输入与配置主体 -->
                                <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:20px;">
                                    <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:16px;">
                                        正版商业授权激活
                                    </div>

                                    <!-- 授权服务端地址直接隐藏内置，无需用户手动输入 -->
                                    <input type="hidden" id="cfg-license-server-url" value="https://www.jingxialai.com">

                                    <div class="login-form-group">
                                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                                            <label style="font-size:13px;font-weight:600;margin:0;">
                                                正版商业授权密钥 (License Key)
                                                <span style="font-size:12px;color:#94a3b8;font-weight:normal;">(在官方授权中心购买获取的 QL 开头正版密钥)</span>
                                            </label>
                                            <button type="button" class="btn btn-outline" id="btn-toggle-license-key" style="height:26px;padding:0 8px;font-size:11px;">👁️ 切换查看</button>
                                        </div>
                                        <input type="text" id="cfg-license-key" class="form-control" placeholder="请输入官方授权密钥 (如: QL8f92a10c7e84920b...)" style="font-family:monospace;letter-spacing:1px;">
                                    </div>

                                    <!-- 操作按钮栏 -->
                                    <div style="display:flex;gap:12px;align-items:center;margin-top:20px;padding-top:16px;border-top:1px dashed #e2e8f0;">
                                        <button type="button" class="btn btn-primary" id="btn-save-license" style="height:38px;padding:0 22px;font-size:13px;font-weight:600;display:inline-flex;align-items:center;gap:6px;">
                                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>
                                            保存并联网激活授权
                                        </button>
                                        <button type="button" class="btn btn-secondary" id="btn-recheck-license" style="height:38px;padding:0 18px;font-size:13px;display:inline-flex;align-items:center;gap:6px;">
                                            <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
                                            刷新复核授权状态
                                        </button>
                                    </div>
                                </div>

                                <!-- 授权使用引导与技术特性 -->
                                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 18px;font-size:12px;color:#64748b;line-height:1.7;">
                                    <div style="font-weight:700;color:#334155;margin-bottom:6px;font-size:13px;">💡 快速授权使用指引</div>
                                    <div>1. <strong>获取授权</strong>：在官方授权中心购买并获取订单，系统自动生成以 <code style="color:#0f172a;background:#e2e8f0;padding:1px 4px;border-radius:3px;">QL</code> 开头的正版 License Key。</div>
                                    <div>2. <strong>绑定域名</strong>：点击上方“当前运行域名”右侧的【复制】按钮，前往官方授权中心【我的授权】页面，将域名添加至授权绑定位中。</div>
                                    <div>3. <strong>在线激活</strong>：在上方输入您的正版 License Key，点击【保存并联网激活授权】即可完成系统授权。</div>
                                    <div style="margin-top:6px;padding-top:6px;border-top:1px dashed #cbd5e1;">
                                        <strong>🛡️ 一次激活·永久有效保障机制</strong>：
                                        系统内置本地正版防篡改加密凭证。只要首次联网激活通过，正版授权即在本地持久生效。即便官方验证节点未来遇到网络波动、临时维护或离线，您的回收系统依然永久稳定运行，绝不中断任何业务流程与资金放款。
                                    </div>
                                </div>
                            </div>
                        </div>

`;
    };
})(window);