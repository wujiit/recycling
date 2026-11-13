/**
 * 启灵同城服务系统 - 系统设置基础视图组件
 * 提供基础品牌、SEO、宣传横幅、用户认证与IP模块的HTML模板
 */
(function(window) {
    'use strict';
    window.getSettingsBasePanelsHtml = function() {
        return `
                        <!-- 1. 基础品牌与备案面板 -->
                        <div class="settings-panel active" id="panel-brand">
                                                    <!-- 1. 品牌形象与标识自定义 -->
                        <div style="margin-bottom:28px;">
                            <div style="font-size:14px;font-weight:700;color:#1e58ff;margin-bottom:14px;display:flex;align-items:center;gap:6px;">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                                1. 平台品牌、标识与备案自定义
                            </div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                                <div class="login-form-group">
                                    <label>平台站点全称 (Title/页脚显示)</label>
                                    <input type="text" id="cfg-site-name" class="form-control" placeholder="如: 启灵同城服务">
                                </div>
                                <div class="login-form-group">
                                    <label>品牌简称 (前台导航栏左上角精简展示，建议2-6字)</label>
                                    <input type="text" id="cfg-brand-name" class="form-control" placeholder="如: 启灵同城服务">
                                </div>
                            </div>

                            <!-- 平台 Logo 自定义 (支持直接输入外部图片链接或本地上传) -->
                            <div class="login-form-group" style="margin-top:8px;">
                                <label>网站主 Logo (支持直接填写外部图片链接或点击右侧本地上传)</label>
                                <div style="display:flex;align-items:center;gap:14px;background:#f8fafc;padding:12px 16px;border:1px solid #e2e8f0;border-radius:8px;">
                                    <img id="cfg-logo-preview" src="/uploads/default/site_logo.svg" style="height:38px;max-width:140px;object-fit:contain;background:#fff;border-radius:6px;border:1px solid #cbd5e1;padding:4px;" alt="Logo预览">
                                    <div style="flex:1;display:flex;gap:8px;align-items:center;">
                                        <input type="text" id="cfg-site-logo" class="form-control" placeholder="直接填写外部图片链接 (http/https) 或点击右侧本地上传" value="/uploads/default/site_logo.svg">
                                        <button type="button" class="btn btn-outline" id="btn-pick-logo" style="height:36px;padding:0 12px;font-size:12px;white-space:nowrap;">从图库选择</button>
                                        <label class="btn btn-secondary" style="height:36px;padding:0 14px;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;white-space:nowrap;margin:0;">
                                            本地上传
                                            <input type="file" id="cfg-logo-file" accept="image/*" style="display:none;">
                                        </label>
                                        <button type="button" class="btn btn-outline" id="btn-reset-logo" style="height:36px;padding:0 10px;font-size:12px;white-space:nowrap;">默认Logo</button>
                                    </div>
                                </div>
                            </div>

                            <!-- 浏览器 Favicon 自定义 (支持直接输入外部链接或本地上传) -->
                            <div class="login-form-group" style="margin-top:12px;">
                                <label>浏览器标签图标 Favicon (支持直接填写外部链接或点击右侧本地上传)</label>
                                <div style="display:flex;align-items:center;gap:14px;background:#f8fafc;padding:12px 16px;border:1px solid #e2e8f0;border-radius:8px;">
                                    <img id="cfg-favicon-preview" src="/uploads/default/site_favicon.svg" style="width:32px;height:32px;object-fit:contain;background:#fff;border-radius:6px;border:1px solid #cbd5e1;padding:4px;" alt="Favicon预览">
                                    <div style="flex:1;display:flex;gap:8px;align-items:center;">
                                        <input type="text" id="cfg-site-favicon" class="form-control" placeholder="直接填写外部 Favicon 链接 (http/https) 或点击右侧本地上传" value="/uploads/default/site_favicon.svg">
                                        <button type="button" class="btn btn-outline" id="btn-pick-favicon" style="height:36px;padding:0 12px;font-size:12px;white-space:nowrap;">从图库选择</button>
                                        <label class="btn btn-secondary" style="height:36px;padding:0 14px;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;white-space:nowrap;margin:0;">
                                            本地上传
                                            <input type="file" id="cfg-favicon-file" accept="image/*" style="display:none;">
                                        </label>
                                        <button type="button" class="btn btn-outline" id="btn-reset-favicon" style="height:36px;padding:0 10px;font-size:12px;white-space:nowrap;">默认图标</button>
                                    </div>
                                </div>
                            </div>

                            <!-- 全国公安网安备案图标自定义 -->
                            <div class="login-form-group" style="margin-top:12px;">
                                <label>全国公安网安备案国徽图标 (支持直接填写外部链接或点击右侧本地上传)</label>
                                <div style="display:flex;align-items:center;gap:14px;background:#f8fafc;padding:12px 16px;border:1px solid #e2e8f0;border-radius:8px;">
                                    <img id="cfg-gongan-icon-preview" src="/uploads/default/police_badge.svg" style="width:32px;height:32px;object-fit:contain;background:#fff;border-radius:6px;border:1px solid #cbd5e1;padding:3px;" alt="公安图标预览">
                                    <div style="flex:1;display:flex;gap:8px;align-items:center;">
                                        <input type="text" id="cfg-gongan-icon" class="form-control" placeholder="直接填写外部公安图标链接 (http/https) 或点击右侧本地上传" value="/uploads/default/police_badge.svg">
                                        <button type="button" class="btn btn-outline" id="btn-pick-gongan-icon" style="height:36px;padding:0 12px;font-size:12px;white-space:nowrap;">从图库选择</button>
                                        <label class="btn btn-secondary" style="height:36px;padding:0 14px;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;white-space:nowrap;margin:0;">
                                            本地上传
                                            <input type="file" id="cfg-gongan-icon-file" accept="image/*" style="display:none;">
                                        </label>
                                        <button type="button" class="btn btn-outline" id="btn-reset-gongan-icon" style="height:36px;padding:0 10px;font-size:12px;white-space:nowrap;">默认徽标</button>
                                    </div>
                                </div>
                            </div>

                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:12px;">
                                <div class="login-form-group">
                                    <label>工业与信息化部 ICP 备案号</label>
                                    <input type="text" id="cfg-icp-beian" class="form-control" placeholder="例如: 京ICP备20260001号-1">
                                </div>
                                <div class="login-form-group">
                                    <label>全国公安网安备案号 (如: 京公网安备 11010802000001号)</label>
                                    <input type="text" id="cfg-gongan-beian" class="form-control" placeholder="例如: 京公网安备 11010802000001号">
                                </div>
                            </div>

                            <div class="login-form-group" style="margin-top:4px;">
                                <label>公安网安备案系统查询跳转网址 (可选，点击前台公安备案文字或徽标跳转)</label>
                                <input type="text" id="cfg-gongan-url" class="form-control" placeholder="例如: http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=11010802000001">
                            </div>

                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:12px;">
                                <div class="login-form-group">
                                    <label>全国客服热线电话</label>
                                    <input type="text" id="cfg-service-tel" class="form-control" placeholder="例如: 400-800-8888">
                                </div>
                                <div class="login-form-group">
                                    <label>网站底部版权署名说明</label>
                                    <input type="text" id="cfg-copyright" class="form-control" placeholder="例如: © 2026 启灵智能回收平台 · 保留所有权利">
                                </div>
                            </div>
                        </div>

                        <hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0;">

                        </div>

                        <!-- 2. SEO 搜索引擎收录优化面板 -->
                        <div class="settings-panel" id="panel-seo">
                                                    <!-- 2. SEO 搜索引擎优化深度配置 -->
                        <div style="margin-bottom:28px;">
                            <div style="font-size:14px;font-weight:700;color:#0891b2;margin-bottom:14px;display:flex;align-items:center;gap:6px;">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                                2. SEO 搜索引擎优化与收录设置 (Meta 标签)
                            </div>
                            <div class="login-form-group">
                                <label>首页 SEO 网页标题 (Title，利于百度/谷歌/微信分享收录)</label>
                                <input type="text" id="cfg-seo-title" class="form-control" placeholder="例如: 启灵全行业数字化回收平台 · 手机数码/废品金属/汽车家电高价上门回收">
                            </div>
                            <div class="login-form-group" style="margin-top:12px;">
                                <label>搜索引擎关键词 (Meta Keywords，以半角逗号分隔)</label>
                                <input type="text" id="cfg-seo-keywords" class="form-control" placeholder="例如: 二手回收,手机数码回收,废旧金属,再生资源,二手车回收,名表黄金回收,家电回收">
                            </div>
                            <div class="login-form-group" style="margin-top:12px;">
                                <label>网站页面描述说明 (Meta Description，建议 80-150 字)</label>
                                <textarea id="cfg-seo-description" class="form-control" rows="4" style="width:100%;min-height:95px;box-sizing:border-box;" placeholder="清晰描述平台的服务特色、质检标准与放款保障，将在搜索引擎搜索结果摘要中展示..."></textarea>
                            </div>
                        </div>

                        <hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0;">

                        </div>

                        <!-- 3. 宣传横幅与运营控制面板 -->
                        <div class="settings-panel" id="panel-banner">
                            <!-- 首页装修中心直达引导卡片 -->
                            <div style="background:linear-gradient(135deg, #eff6ff, #dbeafe);border:1px solid #bfdbfe;border-radius:10px;padding:16px 20px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
                                <div>
                                    <div style="font-weight:700;color:#1e40af;font-size:14px;margin-bottom:4px;display:flex;align-items:center;gap:6px;">
                                        <span>🎨 首页装修中心已就绪</span>
                                        <span class="badge" style="background:#2563eb;color:#fff;font-size:11px;">全新功能</span>
                                    </div>
                                    <div style="font-size:12px;color:#3b82f6;">支持双首屏模式（极速搜索流 vs 品牌轮播大图流）、热门搜索词、平台承诺指标及多端 Banner 画卷可视化自由配置。</div>
                                </div>
                                <button type="button" class="btn btn-primary" id="btn-goto-decoration" style="font-size:13px;padding:8px 18px;white-space:nowrap;font-weight:600;">前往首页装修 →</button>
                            </div>

                            <!-- 3. 首页宣传横幅与业务运营 -->
                        <div style="margin-bottom:28px;">
                            <div style="font-size:14px;font-weight:700;color:#10b981;margin-bottom:14px;display:flex;align-items:center;gap:6px;">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
                                3. 首页宣传横幅与核心运营参数
                            </div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                                <div class="login-form-group">
                                    <label>首页横幅宣传大标题 (Banner Title)</label>
                                    <input type="text" id="cfg-banner-title" class="form-control" placeholder="如: 全品类高价回收 · 免费上门">
                                </div>
                                <div class="login-form-group">
                                    <label>报价锁定期限 (保价天数)</label>
                                    <input type="number" id="cfg-lock-days" class="form-control" placeholder="默认 7 天">
                                </div>
                            </div>
                            <div class="login-form-group" style="margin-top:12px;">
                                <label>首页横幅副标题与运营口号 (Banner Subtitle)</label>
                                <input type="text" id="cfg-banner-subtitle" class="form-control" placeholder="如: 智能算法精准核价 · 官方透明质检 · 确认后秒级极速放款">
                            </div>
                        </div>

                        <hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0;">

                        <!-- 3.1 首页实时动态跑马播报设置 -->
                        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px;">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                                <strong style="color:#0f172a;font-size:14px;display:flex;align-items:center;gap:6px;">
                                    <span class="badge" style="background:#fee2e2;color:#ef4444;font-size:11px;">● 实时播报</span> 首页实时动态滚动栏管理
                                </strong>
                                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;font-weight:600;">
                                    <input type="checkbox" id="cfg-ticker-enabled" value="1"> 开启首页实时动态
                                </label>
                            </div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
                                <div class="login-form-group" style="margin:0;">
                                    <label style="font-size:12px;">播报标签文字 (前台红点标签)</label>
                                    <input type="text" id="cfg-ticker-tag" class="form-control" placeholder="如: 实时动态 / 最新回收 / 交易动态">
                                </div>
                                <div class="login-form-group" style="margin:0;">
                                    <label style="font-size:12px;">轮播滚动切换间隔 (秒)</label>
                                    <input type="number" id="cfg-ticker-interval" class="form-control" min="2" max="30" placeholder="默认 4 秒">
                                </div>
                            </div>
                            <div class="login-form-group" style="margin:0;">
                                <label style="font-size:12px;display:flex;justify-content:space-between;">
                                    <span>滚动播报内容列表 (每行一条)</span>
                                    <span style="color:#94a3b8;font-weight:normal;">可自定义修改，清空则展示系统默认动态</span>
                                </label>
                                <textarea id="cfg-ticker-messages" class="form-control" rows="6" style="resize:vertical;font-size:12px;line-height:1.6;" placeholder="每行一条，例如：
刚刚 [138****6821] 成功回收 iPhone 15 Pro Max · 极速放款 ¥5,800 到账
1分钟前 [186****9012] 预约快速寄送 · 华为 Mate 60 Pro
3分钟前 [159****3341] 确认专业质检结果 · 微信零钱极速到账 ¥4,200
4分钟前 [131****8809] 提交高价回收订单 · MacBook Pro 16寸 M3 Max"></textarea>
                            </div>
                        </div>

                        </div>

                        <!-- 8. 用户认证与注册方式 -->
                        <div class="settings-panel" id="panel-userauth">
                            <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:14px;">
                                8. 登录与注册设置
                            </div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                                <div style="background:#f8fafc;padding:16px;border:1px solid #e2e8f0;border-radius:10px;">
                                    <label style="display:flex;align-items:center;gap:10px;font-weight:700;cursor:pointer;">
                                        <input type="checkbox" id="cfg-settings-user-auth-password" style="width:18px;height:18px;">
                                        <span>允许账号密码登录</span>
                                    </label>
                                    <div style="font-size:12px;color:#64748b;margin-top:6px;padding-left:28px;">支持用户通过手机号与密码登录。</div>
                                </div>
                                <div style="background:#f8fafc;padding:16px;border:1px solid #e2e8f0;border-radius:10px;">
                                    <label style="display:flex;align-items:center;gap:10px;font-weight:700;cursor:pointer;">
                                        <input type="checkbox" id="cfg-settings-user-register-enabled" style="width:18px;height:18px;">
                                        <span>开放新用户自主注册</span>
                                    </label>
                                    <div style="font-size:12px;color:#64748b;margin-top:6px;padding-left:28px;">允许新访客在前台注册新账号。</div>
                                </div>
                                <div style="background:#f8fafc;padding:16px;border:1px solid #e2e8f0;border-radius:10px;">
                                    <label style="display:flex;align-items:center;gap:10px;font-weight:700;cursor:pointer;">
                                        <input type="checkbox" id="cfg-settings-user-auth-wechat" style="width:18px;height:18px;">
                                        <span>允许微信一键授权登录</span>
                                    </label>
                                    <div style="font-size:12px;color:#64748b;margin-top:6px;padding-left:28px;">在微信端支持快捷授权登录。</div>
                                </div>
                                <div style="background:#f8fafc;padding:16px;border:1px solid #e2e8f0;border-radius:10px;">
                                    <label style="display:flex;align-items:center;gap:10px;font-weight:700;cursor:pointer;">
                                        <input type="checkbox" id="cfg-settings-user-order-guest" style="width:18px;height:18px;">
                                        <span>允许免登录直接提交订单</span>
                                    </label>
                                    <div style="font-size:12px;color:#64748b;margin-top:6px;padding-left:28px;">开启后访客无需登录即可提交回收单。</div>
                                </div>
                                <div style="background:#f8fafc;padding:16px;border:1px solid #e2e8f0;border-radius:10px;">
                                    <label style="display:flex;align-items:center;gap:10px;font-weight:700;cursor:pointer;">
                                        <input type="checkbox" id="cfg-settings-user-require-realname" style="width:18px;height:18px;">
                                        <span>下单时需填写真实姓名</span>
                                    </label>
                                    <div style="font-size:12px;color:#64748b;margin-top:6px;padding-left:28px;">提交回收订单时强制核验姓名。</div>
                                </div>
                            </div>

                            <!-- 管理后台安全入口与访问密钥设置 -->
                            <div style="margin-top:28px;padding-top:24px;border-top:1px dashed #e2e8f0;">
                                <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:6px;display:flex;align-items:center;gap:8px;">
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="#1e58ff"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
                                    8.1 后台安全访问密钥设置
                                </div>
                                <div style="font-size:12px;color:#64748b;margin-bottom:16px;">
                                    可设置后台安全访问密钥。开启后，直接访问 <code>/admin/</code> 将返回 404 页面，需通过带密钥的专属链接访问后台。
                                </div>

                                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px;">
                                    <div class="login-form-group" style="margin-bottom:14px;">
                                        <label style="font-weight:600;display:flex;align-items:center;justify-content:space-between;">
                                            <span>后台安全访问密钥 (Entry Key)</span>
                                            <span style="font-size:12px;font-weight:normal;color:#64748b;">留空则不开启密钥验证，保持默认访问</span>
                                        </label>
                                        <div style="display:flex;gap:10px;align-items:center;margin-top:6px;">
                                            <input type="text" id="cfg-admin-entry-secret" class="form-control" placeholder="建议输入6位以上字母+数字组合，例如: ql_safe888" style="font-family:monospace;font-size:14px;">
                                            <button type="button" class="btn btn-outline" id="btn-gen-admin-secret" style="white-space:nowrap;height:38px;padding:0 14px;font-size:13px;">🎲 随机生成</button>
                                            <button type="button" class="btn btn-outline" id="btn-clear-admin-secret" style="white-space:nowrap;height:38px;padding:0 14px;font-size:13px;color:#ef4444;">清空关闭</button>
                                        </div>
                                    </div>

                                    <!-- 专属直达地址动态预览与复制 -->
                                    <div id="admin-secret-url-box" style="background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:14px;margin-top:12px;display:none;">
                                        <div style="font-size:12px;font-weight:600;color:#334155;margin-bottom:6px;display:flex;align-items:center;gap:6px;">
                                            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#10b981;"></span>
                                            后台安全直达访问链接：
                                        </div>
                                        <div style="display:flex;align-items:center;gap:8px;">
                                            <input type="text" id="admin-secret-url-input" class="form-control" readonly style="background:#f1f5f9;color:#0f172a;font-family:monospace;font-size:13px;height:36px;cursor:text;">
                                            <button type="button" class="btn btn-primary" id="btn-copy-admin-secret-url" style="white-space:nowrap;height:36px;padding:0 16px;font-size:13px;">📋 复制直达链接</button>
                                        </div>
                                        <div style="font-size:12px;color:#0284c7;margin-top:8px;line-height:1.5;">
                                            💡 提示：设置后请妥善保存该链接。未带访问密钥访问 <code>/admin/</code> 将无法打开后台页面。
                                        </div>
                                    </div>

                                    <!-- 忘记密钥处理方式 -->
                                    <div style="margin-top:14px;background:#fefce8;border:1px solid #fef08a;border-radius:8px;padding:12px 14px;font-size:12px;color:#854d0e;line-height:1.6;">
                                        <strong>💡 忘记密钥处理方式：</strong><br>
                                        若管理员不慎遗忘安全访问密钥，可通过数据库管理工具打开 <code>sys_config</code> 数据表，将 <code>admin_entry_secret</code> 字段的值清空，即可恢复默认直接访问。
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 8. IP 归属地与网络运营商解析 -->
                        <div class="settings-panel" id="panel-ip">
                            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin-bottom:20px;">
                                <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:4px;">IP 归属地解析设置</div>
                                <div style="font-size:12px;color:#64748b;margin-bottom:16px;">配置 IP 查询接口，用于自动解析用户注册与登录的地理位置及运营商。</div>
                                
                                <div style="margin-bottom:16px;">
                                    <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;">
                                        <input type="checkbox" id="cfg-lingjian-ip-enabled" style="width:18px;height:18px;margin-top:2px;">
                                        <div>
                                            <div style="font-size:14px;font-weight:700;color:#0f172a;">启用灵简 IP 归属地解析服务</div>
                                            <div style="font-size:12px;color:#64748b;margin-top:2px;">勾选开启后，系统将在前后台自动解析展示注册与登录 IP 的省市区县与网络运营商。</div>
                                        </div>
                                    </label>
                                </div>

                                <div class="login-form-group">
                                    <label>灵简 API 密钥 (X-API-Key) <span style="color:#ef4444;">*</span></label>
                                    <div style="display:flex;gap:8px;max-width:540px;">
                                        <input type="password" id="cfg-lingjian-ip-api-key" class="form-control" placeholder="请填入在灵简平台获取的 API Key，格式如: ip_live_xxxxxxxxxxxxxxxx">
                                        <button type="button" class="btn btn-outline" id="btn-toggle-settings-ip-key" style="padding:0 12px;font-size:12px;white-space:nowrap;">👁️ 查看</button>
                                    </div>
                                    <div style="font-size:12px;color:#64748b;margin-top:4px;">密钥仅保存在您的服务器数据库配置表中，请求通过服务端加密传输至灵简官方接口。</div>
                                </div>
                            </div>

                            <!-- 接口连通性在线测试卡片 -->
                            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:20px;">
                                <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:4px;">2. 接口连通性与解析结果在线测试</div>
                                <div style="font-size:12px;color:#64748b;margin-bottom:14px;">在保存配置前后，可随时测试当前 API Key 的有效性及网络连通状态</div>

                                <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:14px;">
                                    <input type="text" id="test-lingjian-ip" class="form-control" value="114.114.114.114" placeholder="输入要测试查询的 IP 地址" style="width:240px;">
                                    <button type="button" class="btn btn-primary" id="btn-test-lingjian-api" style="height:36px;padding:0 18px;background:#1e58ff;">
                                        🚀 发起连通性测试
                                    </button>
                                </div>

                                <div id="lingjian-test-result-box" style="display:none;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 18px;font-size:13px;line-height:1.6;">
                                    <!-- 动态渲染测试结果 -->
                                </div>
                            </div>
                        </div>

                        <!-- 10. 底部 Mega Footer 与客服配置面板 -->
                        <div class="settings-panel" id="panel-footer">
                            <!-- 1. 客服联系方式与服务时间 -->
                            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin-bottom:20px;">
                                <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:4px;display:flex;align-items:center;gap:6px;">
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20 15.5c-1.25 0-2.45-.2-3.57-.57-.35-.11-.74-.03-1.02.24l-2.2 2.2c-2.83-1.44-5.15-3.75-6.59-6.59l2.2-2.21c.28-.26.36-.65.25-1C8.7 6.45 8.5 5.25 8.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-1-1zM19 12h2c0-4.97-4.03-9-9-9v2c3.87 0 7 3.13 7 7zm-4 0h2c0-2.76-2.24-5-5-5v2c1.66 0 3 1.34 3 3z"/></svg>
                                    1. 客服触点与工作时间设置
                                </div>
                                <div style="font-size:12px;color:#64748b;margin-bottom:16px;">配置前台底部展示的客服电话、在线时段、企业邮箱与地址</div>

                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                                    <div class="login-form-group">
                                        <label>底部客服电话 (支持多号码或400热线)</label>
                                        <input type="text" id="cfg-footer-service-tel" class="form-control" placeholder="如: 400-800-8888 或 0755-88888888">
                                    </div>
                                    <div class="login-form-group">
                                        <label>客服在线时间 (前台展示的服务时段说明)</label>
                                        <input type="text" id="cfg-footer-service-time" class="form-control" placeholder="如: 周一至周日 9:00 - 21:00 (节假日无休)">
                                    </div>
                                </div>

                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:12px;">
                                    <div class="login-form-group">
                                        <label>企业客服 / 商务合作邮箱</label>
                                        <input type="text" id="cfg-footer-service-email" class="form-control" placeholder="如: service@qilingrecycle.com">
                                    </div>
                                    <div class="login-form-group">
                                        <label>总部 / 寄件质检收发中心详细地址</label>
                                        <input type="text" id="cfg-footer-address" class="form-control" placeholder="如: 深圳市南山区高新南一道科兴科学园B座质检收发中心">
                                    </div>
                                </div>

                                <div class="login-form-group" style="margin-top:12px;">
                                    <label>底部品牌愿景口号 / 平台介绍 (展示在底部左侧第一列)</label>
                                    <textarea id="cfg-footer-desc" class="form-control" rows="3" style="font-size:12px;line-height:1.6;" placeholder="如: 官方直营全品类回收服务平台。价格公开透明，顺丰免费上门取件，专业质检快速放款，数据安全清除保障，打造安全可靠的循环回收服务。"></textarea>
                                </div>
                                <div class="login-form-group" style="margin-top:12px;">
                                    <label>底部信任背书认证标签 (展示在品牌介绍下方，支持自定义多个，用中文/英文逗号隔开)</label>
                                    <input type="text" id="cfg-footer-trust-tags" class="form-control" placeholder="如: 顺丰速运合作, 绿色循环回收, 数据安全清除">
                                    <div style="font-size:11px;color:#64748b;margin-top:4px;">可填写平台的资质荣誉、物流合作伙伴或安全认证，前台将展示对应的背书徽标</div>
                                </div>
                            </div>

                            <!-- 2. 二维码配置与上传 (客服微信码与官方公众号码) -->
                            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:20px;">
                                <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:4px;display:flex;align-items:center;gap:6px;">
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3 3h8v8H3zm2 2v4h4V5zm8-2h8v8h-8zm2 2v4h4V5zM3 13h8v8H3zm2 2v4h4v-4zm13-2h3v2h-3zm-3 2h2v2h-2zm3 3h3v3h-3zm-2-1h2v2h-2zm-3-2h2v2h-2zm5-2h2v2h-2z"/></svg>
                                    2. 官方客服微信码与公众号二维码自定义
                                </div>
                                <div style="font-size:12px;color:#64748b;margin-bottom:16px;">用户在前台底部可直接扫码添加专属客服，沉淀私域流量</div>

                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
                                    <!-- 客服微信二维码 -->
                                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
                                        <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:10px;">💬 专属客服微信二维码</div>
                                        <div style="display:flex;align-items:center;gap:14px;margin-bottom:12px;">
                                            <img id="cfg-footer-qr-wechat-preview" src="/uploads/default/site_logo.svg" style="width:72px;height:72px;object-fit:contain;background:#fff;border-radius:8px;border:1px solid #cbd5e1;padding:4px;" alt="微信码预览">
                                            <div style="flex:1;">
                                                <input type="text" id="cfg-footer-qrcode-wechat" class="form-control" placeholder="填入图片URL或本地上传" value="" style="font-size:12px;margin-bottom:6px;">
                                                <div style="display:flex;gap:6px;">
                                                    <button type="button" class="btn btn-outline" id="btn-pick-qr-wechat" style="height:30px;padding:0 10px;font-size:11px;">图库选择</button>
                                                    <label class="btn btn-secondary" style="height:30px;line-height:28px;padding:0 12px;font-size:11px;cursor:pointer;margin:0;">
                                                        本地上传
                                                        <input type="file" id="cfg-footer-qr-wechat-file" accept="image/*" style="display:none;">
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="login-form-group" style="margin:0;">
                                            <label style="font-size:11px;color:#64748b;">二维码下方提示语</label>
                                            <input type="text" id="cfg-footer-qrcode-wechat-title" class="form-control" placeholder="如: 微信扫码 · 专属客服 1对1" value="微信扫码 · 专属客服 1对1">
                                        </div>
                                    </div>

                                    <!-- 官方公众号 / 小程序二维码 -->
                                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
                                        <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:10px;">📢 官方公众号 / 小程序二维码 (选填)</div>
                                        <div style="display:flex;align-items:center;gap:14px;margin-bottom:12px;">
                                            <img id="cfg-footer-qr-mp-preview" src="/uploads/default/site_logo.svg" style="width:72px;height:72px;object-fit:contain;background:#fff;border-radius:8px;border:1px solid #cbd5e1;padding:4px;" alt="公众号码预览">
                                            <div style="flex:1;">
                                                <input type="text" id="cfg-footer-qrcode-mp" class="form-control" placeholder="填入图片URL或本地上传" value="" style="font-size:12px;margin-bottom:6px;">
                                                <div style="display:flex;gap:6px;">
                                                    <button type="button" class="btn btn-outline" id="btn-pick-qr-mp" style="height:30px;padding:0 10px;font-size:11px;">图库选择</button>
                                                    <label class="btn btn-secondary" style="height:30px;line-height:28px;padding:0 12px;font-size:11px;cursor:pointer;margin:0;">
                                                        本地上传
                                                        <input type="file" id="cfg-footer-qr-mp-file" accept="image/*" style="display:none;">
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="login-form-group" style="margin:0;">
                                            <label style="font-size:11px;color:#64748b;">二维码下方提示语</label>
                                            <input type="text" id="cfg-footer-qrcode-mp-title" class="form-control" placeholder="如: 关注官方公众号 · 获取最新行情" value="关注官方公众号 · 获取最新行情">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
`;
    };
})(window);