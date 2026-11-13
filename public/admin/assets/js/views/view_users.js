/**
 * 启灵同城服务系统 - 用户与安全管理视图
 * 包含会员数据维护、管理员账号协作、登录认证策略与注销审核
 */
(function (window) {
    'use strict';

    const SysUI = window.SysUI;
    const api = window.adminApi || window.api;
    const escapeHtml = window.escapeHtml || function(s) {
        if (!s) return '';
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };
    const formatTime = window.formatTime || function(ts) {
        if (!ts) return '-';
        const d = new Date(Number(ts) * 1000);
        return d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0') + ' ' +
            String(d.getHours()).padStart(2, '0') + ':' +
            String(d.getMinutes()).padStart(2, '0');
    };

    let currentSubTab = 'list'; // 'list' | 'admin' | 'settings'
    let isPrivacyMasked = true; // 手机号/银行卡默认脱敏保护

    async function renderUsersView(container) {
        if (!container) return;

        const adminState = window.adminState || window.state || {};
        const currentAdminId = Number(adminState.admin?.id || 1);

        container.innerHTML = `
            <div class="card" style="padding:0;overflow:hidden;border-radius:12px;">
                <!-- 顶部面包屑与三维选项卡 -->
                <div style="padding:18px 24px;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
                    <div>
                        <h3 style="font-size:16px;font-weight:700;color:#0f172a;margin:0;">用户管理</h3>
                        <div style="font-size:12px;color:#64748b;margin-top:2px;">管理客户档案、管理员账号及登录注册配置</div>
                    </div>
                    <!-- 子选项卡切换 -->
                    <div style="display:flex;background:#e2e8f0;border-radius:8px;padding:3px;gap:2px;">
                        <button type="button" id="tab-btn-user-list" class="btn" style="height:32px;font-size:12px;font-weight:600;padding:0 14px;border-radius:6px;background:#fff;color:#1e58ff;border:none;box-shadow:0 1px 2px rgba(0,0,0,0.05);cursor:pointer;">
                            👥 客户列表
                        </button>
                        <button type="button" id="tab-btn-user-deregister" class="btn" style="height:32px;font-size:12px;font-weight:600;padding:0 14px;border-radius:6px;background:transparent;color:#64748b;border:none;cursor:pointer;display:flex;align-items:center;gap:4px;">
                            🗑️ 注销审核 <span id="badge-deregister-count" style="display:none;background:#ef4444;color:#fff;font-size:10px;padding:1px 6px;border-radius:10px;font-weight:bold;">0</span>
                        </button>
                        <button type="button" id="tab-btn-admin-manage" class="btn" style="height:32px;font-size:12px;font-weight:600;padding:0 14px;border-radius:6px;background:transparent;color:#64748b;border:none;cursor:pointer;">
                            🛡️ 管理员设置
                        </button>
                        <button type="button" id="tab-btn-user-settings" class="btn" style="height:32px;font-size:12px;font-weight:600;padding:0 14px;border-radius:6px;background:transparent;color:#64748b;border:none;cursor:pointer;">
                            ⚙️ 注册与登录设置
                        </button>
                    </div>
                </div>

                <!-- ======================================================== -->
                <!-- 子面板 1：客户会员管理与风控 -->
                <!-- ======================================================== -->
                <div id="sub-panel-user-list" style="padding:20px 24px;">
                    <!-- 核心指标看板 -->
                    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:16px;margin-bottom:20px;">
                        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 18px;">
                            <div style="font-size:12px;color:#64748b;">注册会员总数</div>
                            <div style="font-size:24px;font-weight:800;color:#1e58ff;margin-top:4px;" id="stat-total-users">-</div>
                        </div>
                        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 18px;">
                            <div style="font-size:12px;color:#64748b;">正常客户</div>
                            <div style="font-size:24px;font-weight:800;color:#10b981;margin-top:4px;" id="stat-active-users">-</div>
                        </div>
                        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 18px;">
                            <div style="font-size:12px;color:#64748b;">已拉黑/受限客户</div>
                            <div style="font-size:24px;font-weight:800;color:#ef4444;margin-top:4px;" id="stat-banned-users">-</div>
                        </div>
                        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 18px;">
                            <div style="font-size:12px;color:#64748b;">累计回收成交订单</div>
                            <div style="font-size:24px;font-weight:800;color:#f59e0b;margin-top:4px;" id="stat-total-orders">-</div>
                        </div>
                        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 18px;">
                            <div style="font-size:12px;color:#64748b;">累计已发放回收款</div>
                            <div style="font-size:24px;font-weight:800;color:#0f172a;margin-top:4px;" id="stat-total-turnover">-</div>
                        </div>
                    </div>

                    <!-- 操作检索与安全脱敏工具栏 -->
                    <div class="toolbar" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
                        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
                            <input type="text" class="form-control" id="user-kw" placeholder="搜索手机号 / 昵称 / 姓名" style="width:230px;">
                            <select id="user-deregister-filter" class="form-control" style="width:130px;height:36px;font-size:12px;">
                                <option value="">全部状态客户</option>
                                <option value="pending">待注销审核</option>
                                <option value="rejected">注销已驳回</option>
                            </select>
                            <button class="btn btn-primary" id="btn-search-users" style="height:36px;padding:0 16px;">查询检索</button>
                            <button class="btn btn-outline" id="btn-reset-users" style="height:36px;padding:0 14px;">重置</button>
                            <!-- 隐私脱敏切换开关 -->
                            <button type="button" class="btn btn-outline" id="btn-toggle-mask" style="height:36px;padding:0 12px;display:flex;align-items:center;gap:6px;font-size:13px;">
                                <span id="mask-icon">👁️</span>
                                <span id="mask-status-text">显示明文号码</span>
                            </button>
                        </div>
                        <div>
                            <button class="btn btn-primary" id="btn-open-create-user" style="height:36px;padding:0 16px;background:#10b981;border-color:#10b981;">
                                ＋ 手动录入新客户
                            </button>
                        </div>
                    </div>

                    <!-- 客户会员表格容器 -->
                    <div id="users-table-box">加载客户列表中...</div>
                </div>

                <!-- ======================================================== -->
                <!-- 子面板：客户账号注销申请审核 (个人信息保护合规) -->
                <!-- ======================================================== -->
                <div id="sub-panel-user-deregister" style="padding:20px 24px;display:none;">
                    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:14px 18px;margin-bottom:20px;display:flex;align-items:flex-start;gap:12px;">
                        <div style="font-size:20px;">🛡️</div>
                        <div style="font-size:13px;color:#9a3412;line-height:1.6;">
                            <strong>客户注销合规说明：</strong>
                            根据国家《个人信息保护法》与工信部合规规范，平台向客户提供便捷的账户注销服务。前台客户提交注销申请后在此由管理员审核。
                            若客户<strong>尚有进行中的履约在途订单</strong>，系统将严密拦截防止误删；若无在途订单，管理员审核通过后将<strong>安全销户并抹除个人敏感隐私</strong>，历史成交记录将进行财税审计匿名化留痕。
                        </div>
                    </div>

                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                        <h4 style="margin:0;font-size:15px;font-weight:700;color:#0f172a;">待审核注销申请列表</h4>
                        <button class="btn btn-outline" id="btn-refresh-deregister-list" style="height:32px;padding:0 14px;font-size:12px;">刷新列表</button>
                    </div>

                    <div id="deregister-table-box">正在加载注销申请数据...</div>
                </div>

                <!-- ======================================================== -->
                <!-- 子面板 2：系统管理员与账号安全 (新核心功能) -->
                <!-- ======================================================== -->
                <div id="sub-panel-admin-manage" style="padding:20px 24px;display:none;">
                    <!-- 第一部分：当前登录管理员个人信息与修改密码卡片 -->
                    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(360px, 1fr));gap:20px;margin-bottom:24px;">
                        <!-- 个人安全资料卡片 -->
                        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
                            <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;padding-bottom:14px;border-bottom:1px solid #f1f5f9;">
                                <div style="width:48px;height:48px;border-radius:50%;background:#1e58ff;color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:bold;">
                                    管
                                </div>
                                <div style="flex:1;">
                                    <div style="font-size:16px;font-weight:700;color:#0f172a;display:flex;align-items:center;gap:8px;">
                                        <span id="adm-cur-username">${escapeHtml(adminState.admin?.username || 'admin')}</span>
                                        <span class="badge badge-info" id="adm-cur-role">${escapeHtml(adminState.admin?.role || 'admin')}</span>
                                    </div>
                                    <div style="font-size:12px;color:#64748b;margin-top:3px;">当前正在登录操作的平台管理凭据</div>
                                </div>
                            </div>

                            <form id="form-update-admin-profile">
                                <div style="margin-bottom:14px;">
                                    <label style="display:block;font-size:12px;color:#475569;margin-bottom:4px;font-weight:600;">管理员真实姓名</label>
                                    <div style="display:flex;gap:8px;">
                                        <input type="text" id="adm-my-realname" class="form-control" value="${escapeHtml(adminState.admin?.realname || '')}" placeholder="请填写真实姓名" required>
                                        <button type="submit" class="btn btn-outline" style="white-space:nowrap;padding:0 14px;">保存姓名</button>
                                    </div>
                                </div>
                            </form>

                            <div style="background:#f8fafc;border-radius:8px;padding:12px 14px;font-size:12px;color:#64748b;display:flex;flex-direction:column;gap:6px;">
                                <div><strong>当前账号状态：</strong><span class="badge badge-success">正常在线运行</span></div>
                                <div><strong>最近登录 IP：</strong><span id="adm-cur-ip">-</span></div>
                                <div><strong>最近登录时间：</strong><span id="adm-cur-time">-</span></div>
                            </div>
                        </div>

                        <!-- 修改个人登录密码卡片 -->
                        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
                            <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:4px;display:flex;align-items:center;gap:8px;">
                                <span>🔑 修改当前管理员登录密码</span>
                            </div>
                            <div style="font-size:12px;color:#64748b;margin-bottom:16px;">定期更换高强度登录密码可有效保障回收资金与客户隐私安全</div>

                            <form id="form-change-admin-pwd">
                                <div style="margin-bottom:12px;">
                                    <label style="display:block;font-size:12px;color:#475569;margin-bottom:4px;">原登录密码 <span style="color:#ef4444;">*</span></label>
                                    <input type="password" id="adm-pwd-old" class="form-control" placeholder="请输入当前旧密码核验身份" required>
                                </div>
                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                                    <div>
                                        <label style="display:block;font-size:12px;color:#475569;margin-bottom:4px;">新登录密码 <span style="color:#ef4444;">*</span></label>
                                        <input type="password" id="adm-pwd-new" class="form-control" placeholder="至少6位数字字母" required>
                                    </div>
                                    <div>
                                        <label style="display:block;font-size:12px;color:#475569;margin-bottom:4px;">确认新密码 <span style="color:#ef4444;">*</span></label>
                                        <input type="password" id="adm-pwd-confirm" class="form-control" placeholder="请再次输入新密码" required>
                                    </div>
                                </div>
                                <div style="display:flex;justify-content:flex-end;">
                                    <button type="submit" class="btn btn-primary" id="btn-submit-change-pwd" style="height:36px;padding:0 20px;">
                                        立即确认修改密码
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    <!-- 第二部分：平台管理员团队管理与权限列表 -->
                    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin-bottom:24px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
                            <div>
                                <h4 style="margin:0;font-size:15px;font-weight:700;color:#0f172a;">平台管理员</h4>
                                <div style="font-size:12px;color:#64748b;margin-top:2px;">添加和管理后台管理员账号</div>
                            </div>
                            <button class="btn btn-primary" id="btn-open-create-admin" style="height:34px;padding:0 16px;background:#1e58ff;">
                                ＋ 添加管理员
                            </button>
                        </div>

                        <!-- 管理员列表容器 -->
                        <div id="admins-table-box">正在加载平台管理员列表...</div>
                    </div>

                    <!-- 第三部分：管理员操作与安全登录审计日志 -->
                    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:20px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                            <div>
                                <h4 style="margin:0;font-size:15px;font-weight:700;color:#0f172a;">操作日志</h4>
                                <div style="font-size:12px;color:#64748b;margin-top:2px;">记录管理员登录与操作历史（最近 30 条）</div>
                            </div>
                            <button class="btn btn-outline" id="btn-refresh-admin-logs" style="height:30px;padding:0 12px;font-size:12px;">
                                刷新日志
                            </button>
                        </div>
                        <div id="admin-logs-box">正在加载操作日志...</div>
                    </div>
                </div>

                <!-- ======================================================== -->
                <!-- 子面板 3：用户注册与认证方式开关配置 -->
                <!-- ======================================================== -->
                <div id="sub-panel-user-settings" style="padding:20px 24px;display:none;">

                    <form id="form-user-auth-switches">
                        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:20px;">
                                </label>
                            </div>

                            <!-- 开关 2：账号密码登录 -->
                            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:18px;">
                                <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;">
                                    <input type="checkbox" id="cfg-user-auth-password" style="width:18px;height:18px;margin-top:2px;">
                                    <div>
                                        <div style="font-size:14px;font-weight:700;color:#0f172a;">允许账号密码登录</div>
                                        <div style="font-size:12px;color:#64748b;margin-top:4px;">支持客户通过注册手机号与密码登录，保护独立账户与订单隐私。</div>
                                    </div>
                                </label>
                            </div>

                            <!-- 开关 3：开放公开注册 -->
                            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:18px;">
                                <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;">
                                    <input type="checkbox" id="cfg-user-register-enabled" style="width:18px;height:18px;margin-top:2px;">
                                    <div>
                                        <div style="font-size:14px;font-weight:700;color:#0f172a;">开放新用户自主注册</div>
                                        <div style="font-size:12px;color:#64748b;margin-top:4px;">允许前台访客直接在线注册新账号。若不勾选，前台将隐藏“注册新账号”入口，仅允许管理员在后台录入客户。</div>
                                    </div>
                                </label>
                            </div>

                            <!-- 开关 4：微信一键授权登录 -->
                            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:18px;">
                                <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;">
                                    <input type="checkbox" id="cfg-user-auth-wechat" style="width:18px;height:18px;margin-top:2px;">
                                    <div>
                                        <div style="font-size:14px;font-weight:700;color:#0f172a;">允许微信一键授权登录 (小程序端)</div>
                                        <div style="font-size:12px;color:#64748b;margin-top:4px;">在微信小程序端支持一键静默授权微信用户身份登录，极速获取客户昵称与 OpenID。</div>
                                    </div>
                                </label>
                            </div>

                            <!-- 开关 5：免登录游客直接下单 -->
                            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:18px;">
                                <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;">
                                    <input type="checkbox" id="cfg-user-order-guest" style="width:18px;height:18px;margin-top:2px;">
                                    <div>
                                        <div style="font-size:14px;font-weight:700;color:#0f172a;">允许免登录直接提交回收单</div>
                                        <div style="font-size:12px;color:#64748b;margin-top:4px;">若勾选，普通访客在估价后只需填手机号即可直接下单；若不勾选，提交回收单前强制要求用户先登录账号。</div>
                                    </div>
                                </label>
                            </div>

                            <!-- 开关 6：下单强制实名认证姓名 -->
                            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:18px;">
                                <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;">
                                    <input type="checkbox" id="cfg-user-require-realname" style="width:18px;height:18px;margin-top:2px;">
                                    <div>
                                        <div style="font-size:14px;font-weight:700;color:#0f172a;">回收下单强制要求真实姓名</div>
                                        <div style="font-size:12px;color:#64748b;margin-top:4px;">配合二手公安监管与合规实名质检，强制要求订单联系人姓名必须为实名真实姓名。</div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <!-- IP 归属地解析配置卡片 -->
                        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin-top:20px;">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">
                                <div style="font-size:15px;font-weight:700;color:#0f172a;display:flex;align-items:center;gap:6px;">
                                    <span>🌐 IP 归属地解析设置</span>
                                </div>
                                <a href="https://api.jingxialai.com/" target="_blank" style="font-size:12px;color:#1e58ff;text-decoration:none;">获取 API Key ↗</a>
                            </div>
                            <div style="font-size:12px;color:#64748b;margin-bottom:16px;line-height:1.6;">
                                启用后，系统将自动解析用户注册及登录时的归属省市与网络运营商，方便后台管理与安全识别。
                            </div>

                            <div style="margin-bottom:14px;">
                                <label style="display:flex;align-items:center;gap:10px;font-weight:700;cursor:pointer;">
                                    <input type="checkbox" id="cfg-user-lingjian-enabled" style="width:18px;height:18px;">
                                    <span>开启 IP 归属地解析服务</span>
                                </label>
                            </div>

                            <div style="margin-bottom:16px;">
                                <label style="display:block;font-size:12px;color:#475569;margin-bottom:4px;font-weight:600;">API 密钥 (API Key) <span style="color:#ef4444;">*</span></label>
                                <div style="display:flex;gap:8px;max-width:540px;">
                                    <input type="password" id="cfg-user-lingjian-key" class="form-control" placeholder="请输入 API Key">
                                    <button type="button" class="btn btn-outline" id="btn-toggle-user-lingjian-key" style="padding:0 12px;font-size:12px;white-space:nowrap;">👁️ 查看</button>
                                </div>
                                <div style="font-size:11px;color:#94a3b8;margin-top:4px;">密钥格式一般为 ip_live_ 开头的安全 Token，保存在服务器受保护配置表中。</div>
                            </div>

                            <!-- 在线连通性测试工具 -->
                            <div style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:8px;padding:14px;max-width:680px;">
                                <div style="font-size:13px;font-weight:600;color:#334155;margin-bottom:8px;">🛠️ 在线 API 连通性探测测试</div>
                                <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
                                    <input type="text" id="test-user-ip-val" class="form-control" value="114.114.114.114" placeholder="输入测试 IP，如 114.114.114.114" style="width:200px;font-family:monospace;font-size:13px;">
                                    <button type="button" class="btn btn-outline" id="btn-run-user-ip-test" style="height:36px;padding:0 14px;font-size:13px;">
                                        🚀 立即探测测试连通性
                                    </button>
                                    <span id="ip-test-spinner" style="display:none;font-size:12px;color:#64748b;">正在请求灵简服务器...</span>
                                </div>
                                <div id="ip-test-result-box" style="margin-top:10px;font-size:12px;display:none;"></div>
                            </div>
                        </div>

                        <div style="margin-top:28px;padding-top:20px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;">
                            <button type="submit" class="btn btn-primary" id="btn-save-user-switches" style="height:40px;padding:0 28px;font-size:14px;font-weight:700;">
                                保存用户体系与认证开关配置
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- ========================================== -->
            <!-- 模态框 1：管理员手动录入新客户 -->
            <!-- ========================================== -->
            <div id="modal-create-user" class="modal-overlay" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:1000;align-items:center;justify-content:center;">
                <div class="modal-card" style="background:#fff;border-radius:12px;max-width:520px;width:90%;padding:24px;box-shadow:0 10px 25px rgba(0,0,0,0.15);">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                        <h4 style="margin:0;font-size:16px;font-weight:700;">手动录入新客户账号</h4>
                        <span style="cursor:pointer;font-size:18px;color:#94a3b8;" onclick="document.getElementById('modal-create-user').style.display='none'">✕</span>
                    </div>
                    <form id="form-create-user">
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                            <div>
                                <label style="display:block;font-size:12px;color:#475569;margin-bottom:4px;">手机号码 <span style="color:#ef4444;">*</span></label>
                                <input type="tel" id="cu-mobile" class="form-control" placeholder="11位手机号码" required>
                            </div>
                            <div>
                                <label style="display:block;font-size:12px;color:#475569;margin-bottom:4px;">初始登录密码 <span style="color:#ef4444;">*</span></label>
                                <input type="password" id="cu-password" class="form-control" placeholder="至少6位" required>
                            </div>
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                            <div>
                                <label style="display:block;font-size:12px;color:#475569;margin-bottom:4px;">用户昵称</label>
                                <input type="text" id="cu-nickname" class="form-control" placeholder="如：张先生">
                            </div>
                            <div>
                                <label style="display:block;font-size:12px;color:#475569;margin-bottom:4px;">真实姓名</label>
                                <input type="text" id="cu-realname" class="form-control" placeholder="实名认证姓名">
                            </div>
                        </div>
                        <div style="margin-bottom:12px;">
                            <label style="display:block;font-size:12px;color:#475569;margin-bottom:4px;">默认收款结算方式</label>
                            <select id="cu-payout-type" class="form-control">
                                <option value="alipay">支付宝</option>
                                <option value="bank">银行卡</option>
                                <option value="wechat">微信钱包</option>
                            </select>
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
                            <div>
                                <label style="display:block;font-size:12px;color:#475569;margin-bottom:4px;">收款人姓名</label>
                                <input type="text" id="cu-payout-name" class="form-control" placeholder="如：张三">
                            </div>
                            <div>
                                <label style="display:block;font-size:12px;color:#475569;margin-bottom:4px;">收款账号</label>
                                <input type="text" id="cu-payout-account" class="form-control" placeholder="支付宝号/卡号">
                            </div>
                        </div>
                        <div style="display:flex;justify-content:flex-end;gap:10px;">
                            <button type="button" class="btn btn-outline" onclick="document.getElementById('modal-create-user').style.display='none'">取消</button>
                            <button type="submit" class="btn btn-primary" id="btn-submit-create-user">确认录入</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- ========================================== -->
            <!-- 模态框 2：查看用户关联的回收订单列表 -->
            <!-- ========================================== -->
            <div id="modal-user-orders" class="modal-overlay" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:1000;align-items:center;justify-content:center;">
                <div class="modal-card" style="background:#fff;border-radius:12px;max-width:760px;width:92%;max-height:85vh;display:flex;flex-direction:column;padding:24px;box-shadow:0 10px 25px rgba(0,0,0,0.15);">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-bottom:1px solid #f1f5f9;padding-bottom:12px;">
                        <h4 style="margin:0;font-size:16px;font-weight:700;" id="user-orders-modal-title">客户历史回收订单</h4>
                        <span style="cursor:pointer;font-size:18px;color:#94a3b8;" onclick="document.getElementById('modal-user-orders').style.display='none'">✕</span>
                    </div>
                    <div id="user-orders-content-box" style="flex:1;overflow-y:auto;padding-right:6px;">
                        正在拉取订单记录...
                    </div>
                    <div style="text-align:right;margin-top:14px;padding-top:10px;border-top:1px solid #f1f5f9;">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-user-orders').style.display='none'">关闭窗口</button>
                    </div>
                </div>
            </div>

            <!-- ========================================== -->
            <!-- 模态框 3：添加新系统管理员账号 -->
            <!-- ========================================== -->
            <div id="modal-create-admin" class="modal-overlay" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:1000;align-items:center;justify-content:center;">
                <div class="modal-card" style="background:#fff;border-radius:12px;max-width:480px;width:90%;padding:24px;box-shadow:0 10px 25px rgba(0,0,0,0.15);">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                        <h4 style="margin:0;font-size:16px;font-weight:700;">添加新平台管理员账号</h4>
                        <span style="cursor:pointer;font-size:18px;color:#94a3b8;" onclick="document.getElementById('modal-create-admin').style.display='none'">✕</span>
                    </div>
                    <form id="form-create-admin">
                        <div style="margin-bottom:12px;">
                            <label style="display:block;font-size:12px;color:#475569;margin-bottom:4px;">登录账号 <span style="color:#ef4444;">*</span></label>
                            <input type="text" id="cadm-username" class="form-control" placeholder="英文、数字、下划线 (3-32位)" required>
                        </div>
                        <div style="margin-bottom:12px;">
                            <label style="display:block;font-size:12px;color:#475569;margin-bottom:4px;">初始密码 <span style="color:#ef4444;">*</span></label>
                            <input type="password" id="cadm-password" class="form-control" placeholder="至少6位" required>
                        </div>
                        <div style="margin-bottom:12px;">
                            <label style="display:block;font-size:12px;color:#475569;margin-bottom:4px;">管理员真实姓名 <span style="color:#ef4444;">*</span></label>
                            <input type="text" id="cadm-realname" class="form-control" placeholder="如：李主管" required>
                        </div>
                        <div style="margin-bottom:18px;">
                            <label style="display:block;font-size:12px;color:#475569;margin-bottom:4px;">系统角色权限</label>
                            <select id="cadm-role" class="form-control">
                                <option value="admin">超级管理员 (全部管理权限)</option>
                                <option value="inspector">质检主管 (专管质检核价)</option>
                                <option value="finance">财务核销 (专管款项发放)</option>
                                <option value="operator">客服运营 (专管订单沟通)</option>
                            </select>
                        </div>
                        <div style="display:flex;justify-content:flex-end;gap:10px;">
                            <button type="button" class="btn btn-outline" onclick="document.getElementById('modal-create-admin').style.display='none'">取消</button>
                            <button type="submit" class="btn btn-primary" id="btn-submit-create-admin">确认添加</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- ========================================== -->
            <!-- 模态框 4：重置管理员密码 -->
            <!-- ========================================== -->
            <div id="modal-reset-admin-pwd" class="modal-overlay" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:1000;align-items:center;justify-content:center;">
                <div class="modal-card" style="background:#fff;border-radius:12px;max-width:420px;width:90%;padding:24px;box-shadow:0 10px 25px rgba(0,0,0,0.15);">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                        <h4 style="margin:0;font-size:16px;font-weight:700;">重置管理员密码</h4>
                        <span style="cursor:pointer;font-size:18px;color:#94a3b8;" onclick="document.getElementById('modal-reset-admin-pwd').style.display='none'">✕</span>
                    </div>
                    <form id="form-reset-admin-pwd">
                        <input type="hidden" id="radm-target-id">
                        <div style="margin-bottom:14px;">
                            <div style="font-size:13px;color:#475569;margin-bottom:8px;">
                                正在为管理员【<strong id="radm-target-name" style="color:#1e58ff;">-</strong>】设定新的登录密码：
                            </div>
                            <input type="password" id="radm-new-pwd" class="form-control" placeholder="请输入新密码 (至少6位)" required>
                        </div>
                        <div style="display:flex;justify-content:flex-end;gap:10px;">
                            <button type="button" class="btn btn-outline" onclick="document.getElementById('modal-reset-admin-pwd').style.display='none'">取消</button>
                            <button type="submit" class="btn btn-primary" id="btn-submit-radm">确认重置</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- ========================================== -->
            <!-- 模态框 5：客户详情 -->
            <!-- ========================================== -->
            <div id="modal-user-detail" class="modal-overlay" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:1000;align-items:center;justify-content:center;">
                <div class="modal-card" style="background:#fff;border-radius:12px;max-width:640px;width:92%;max-height:85vh;overflow-y:auto;padding:24px;box-shadow:0 10px 25px rgba(0,0,0,0.15);">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;border-bottom:1px solid #f1f5f9;padding-bottom:12px;">
                        <h4 style="margin:0;font-size:16px;font-weight:700;" id="user-detail-title">客户详情</h4>
                        <span style="cursor:pointer;font-size:18px;color:#94a3b8;" onclick="document.getElementById('modal-user-detail').style.display='none'">✕</span>
                    </div>
                    <div id="user-detail-content-box">
                        <!-- 动态填充 -->
                    </div>
                    <div style="display:flex;justify-content:flex-end;margin-top:20px;padding-top:12px;border-top:1px solid #f1f5f9;gap:10px;">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-user-detail').style.display='none'">关闭窗口</button>
                    </div>
                </div>
            </div>
        `;

        // 绑定子 Tab 切换
        const btnList = document.getElementById('tab-btn-user-list');
        const btnDeregister = document.getElementById('tab-btn-user-deregister');
        const btnAdmin = document.getElementById('tab-btn-admin-manage');
        const btnSettings = document.getElementById('tab-btn-user-settings');
        const panelList = document.getElementById('sub-panel-user-list');
        const panelDeregister = document.getElementById('sub-panel-user-deregister');
        const panelAdmin = document.getElementById('sub-panel-admin-manage');
        const panelSettings = document.getElementById('sub-panel-user-settings');

        function updateDeregisterBadge(count) {
            const badge = document.getElementById('badge-deregister-count');
            if (!badge) return;
            const num = Number(count || 0);
            if (num > 0) {
                badge.style.display = 'inline-block';
                badge.textContent = String(num);
            } else {
                badge.style.display = 'none';
            }
        }

        async function loadDeregisterList() {
            const box = document.getElementById('deregister-table-box');
            if (!box) return;
            box.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;">正在加载注销申请数据...</div>';

            const res = await api.get('/admin/user/list&deregister_status=pending&page=1&page_size=50');
            if (res && res.code === 200) {
                const list = res.data.list || [];
                updateDeregisterBadge(res.data.pending_deregister_count !== undefined ? res.data.pending_deregister_count : list.length);

                if (list.length === 0) {
                    box.innerHTML = `
                        <div style="text-align:center;padding:60px 20px;background:#f8fafc;border-radius:10px;border:1px dashed #cbd5e1;">
                            <div style="font-size:36px;margin-bottom:10px;">🎉</div>
                            <div style="font-weight:700;font-size:15px;color:#0f172a;">当前暂无待审核的注销申请</div>
                            <div style="font-size:12px;color:#64748b;margin-top:4px;">所有客户注销请求均已合规审结。</div>
                        </div>
                    `;
                    return;
                }

                let rows = '';
                list.forEach(u => {
                    let mobileDisplay = u.mobile || '未绑定';
                    if (isPrivacyMasked && u.mobile && u.mobile.length === 11) {
                        mobileDisplay = u.mobile.substring(0, 3) + '****' + u.mobile.substring(7);
                    }
                    const activeCount = Number(u.active_order_count || 0);
                    const orderAlert = activeCount > 0 
                        ? `<span class="badge badge-danger" style="font-size:11px;">⚠️ 有 ${activeCount} 笔在途未结订单 (不可注销)</span>`
                        : `<span class="badge badge-success" style="font-size:11px;">✓ 无在途订单 (可安全注销)</span>`;

                    rows += `<tr>
                        <td><strong>${u.id}</strong></td>
                        <td>
                            <div style="font-weight:700;color:#0f172a;">${escapeHtml(u.nickname || '回收客户')}</div>
                            <div style="font-size:12px;color:#059669;margin-top:2px;">实名: ${escapeHtml(u.realname || '未认证')}</div>
                        </td>
                        <td><strong style="color:#1e58ff;font-family:monospace;">${escapeHtml(mobileDisplay)}</strong></td>
                        <td>
                            <div style="color:#b45309;font-weight:600;font-size:12px;">🕒 ${formatTime(u.deregister_apply_time)}</div>
                            <div style="color:#94a3b8;font-size:11px;margin-top:2px;">注册于: ${formatTime(u.created_at)}</div>
                        </td>
                        <td style="max-width:260px;">
                            <div style="background:#fef3c7;border:1px solid #fde68a;padding:6px 10px;border-radius:6px;font-size:12px;color:#92400e;line-height:1.5;">
                                ${escapeHtml(u.deregister_reason || '未填写具体原因')}
                            </div>
                        </td>
                        <td>
                            ${orderAlert}
                            <div style="font-size:11px;color:#64748b;margin-top:4px;">历史累计: ${u.order_count || 0} 笔订单</div>
                        </td>
                        <td style="white-space:nowrap;">
                            <button class="btn btn-danger" style="height:28px;padding:0 10px;font-size:12px;margin-right:6px;" onclick="window.confirmApproveDeregister(${u.id}, '${escapeHtml(u.nickname || u.mobile || '客户')}', ${activeCount})">
                                审核通过并删号
                            </button>
                            <button class="btn btn-outline" style="height:28px;padding:0 10px;font-size:12px;color:#d97706;border-color:#fde68a;" onclick="window.promptRejectDeregister(${u.id}, '${escapeHtml(u.nickname || u.mobile || '客户')}')">
                                驳回申请
                            </button>
                        </td>
                    </tr>`;
                });

                box.innerHTML = `
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th style="width:60px;">ID</th>
                                <th>客户信息</th>
                                <th>手机号码</th>
                                <th>申请时间</th>
                                <th>注销申请理由</th>
                                <th>履约订单核验</th>
                                <th style="width:200px;">审核操作</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                `;
            } else {
                box.innerHTML = '<div style="text-align:center;padding:40px;color:#ef4444;">加载注销申请数据失败，请重试</div>';
            }
        }
        window.loadDeregisterList = loadDeregisterList;

        function switchSubTab(target) {
            currentSubTab = target;
            const buttons = [btnList, btnDeregister, btnAdmin, btnSettings];
            const panels = [panelList, panelDeregister, panelAdmin, panelSettings];

            buttons.forEach(b => {
                if (!b) return;
                b.style.background = 'transparent';
                b.style.color = '#64748b';
                b.style.boxShadow = 'none';
            });
            panels.forEach(p => {
                if (!p) return;
                p.style.display = 'none';
            });

            if (target === 'list') {
                if (btnList) {
                    btnList.style.background = '#fff';
                    btnList.style.color = '#1e58ff';
                    btnList.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                }
                if (panelList) panelList.style.display = 'block';
                loadUsers();
                loadUserStats();
            } else if (target === 'deregister') {
                if (btnDeregister) {
                    btnDeregister.style.background = '#fff';
                    btnDeregister.style.color = '#1e58ff';
                    btnDeregister.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                }
                if (panelDeregister) panelDeregister.style.display = 'block';
                loadDeregisterList();
                loadUserStats();
            } else if (target === 'admin') {
                if (btnAdmin) {
                    btnAdmin.style.background = '#fff';
                    btnAdmin.style.color = '#1e58ff';
                    btnAdmin.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                }
                if (panelAdmin) panelAdmin.style.display = 'block';
                loadAdminProfile();
                loadAdminList();
                loadAdminLogs();
            } else {
                if (btnSettings) {
                    btnSettings.style.background = '#fff';
                    btnSettings.style.color = '#1e58ff';
                    btnSettings.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                }
                if (panelSettings) panelSettings.style.display = 'block';
                loadUserAuthSwitches();
            }
        }

        btnList?.addEventListener('click', () => switchSubTab('list'));
        btnDeregister?.addEventListener('click', () => switchSubTab('deregister'));
        btnAdmin?.addEventListener('click', () => switchSubTab('admin'));
        btnSettings?.addEventListener('click', () => switchSubTab('settings'));
        document.getElementById('btn-refresh-deregister-list')?.addEventListener('click', loadDeregisterList);

        // 脱敏开关事件 (支持手机号与 IP 隐私脱敏)
        const btnToggleMask = document.getElementById('btn-toggle-mask');
        btnToggleMask?.addEventListener('click', () => {
            isPrivacyMasked = !isPrivacyMasked;
            const textEl = document.getElementById('mask-status-text');
            const iconEl = document.getElementById('mask-icon');
            if (textEl) textEl.innerText = isPrivacyMasked ? '显示明文隐私' : '开启脱敏保护';
            if (iconEl) iconEl.innerText = isPrivacyMasked ? '👁️' : '🔒';
            loadUsers();
        });

        // IP 地址脱敏辅助函数
        function maskIp(ip) {
            if (!ip || ip === '-' || ip === '未知') return '-';
            if (!isPrivacyMasked) return ip;
            if (ip.includes('.')) {
                const parts = ip.split('.');
                if (parts.length === 4) return `${parts[0]}.${parts[1]}.*.*`;
            }
            if (ip.includes(':')) {
                const parts = ip.split(':');
                if (parts.length >= 2) return `${parts[0]}:${parts[1]}:*:*`;
            }
            return ip;
        }

        // ----------------------------------------------------
        // 1. 客户数据总览看板与用户列表
        // ----------------------------------------------------
        async function loadUserStats() {
            const res = await api.get('/admin/user/statistics');
            if (res && res.code === 200 && res.data) {
                const d = res.data;
                const elTotal = document.getElementById('stat-total-users');
                const elActive = document.getElementById('stat-active-users');
                const elBanned = document.getElementById('stat-banned-users');
                const elOrders = document.getElementById('stat-total-orders');
                const elTurnover = document.getElementById('stat-total-turnover');
                if (elTotal) elTotal.innerText = d.total_users || 0;
                if (elActive) elActive.innerText = d.active_users || 0;
                if (elBanned) elBanned.innerText = d.banned_users || 0;
                if (elOrders) elOrders.innerText = d.total_completed_orders || 0;
                if (elTurnover) elTurnover.innerText = '¥ ' + (d.total_turnover || '0.00');
                updateDeregisterBadge(d.pending_deregister_count);
            }
        }
        window.loadUserStats = loadUserStats;

        async function loadUsers() {
            const kw = document.getElementById('user-kw')?.value.trim() || '';
            const deregisterFilter = document.getElementById('user-deregister-filter')?.value || '';
            let url = `/admin/user/list&keyword=${encodeURIComponent(kw)}&page=1&page_size=50`;
            if (deregisterFilter) {
                url += `&deregister_status=${encodeURIComponent(deregisterFilter)}`;
            }
            const res = await api.get(url);
            const box = document.getElementById('users-table-box');
            if (!box) return;

            if (res && res.code === 200) {
                updateDeregisterBadge(res.data.pending_deregister_count);
                const list = res.data.list || [];
                window.currentUsersMap = {};

                if (list.length === 0) {
                    box.innerHTML = '<div style="text-align:center;padding:50px;color:#94a3b8;">未查询到匹配的客户会员档案</div>';
                    return;
                }

                let rows = '';
                list.forEach(u => {
                    window.currentUsersMap[u.id] = u;

                    const statusText = Number(u.status) === 1 
                        ? '<span class="badge badge-success">正常使用</span>' 
                        : '<span class="badge badge-danger">已限制登录</span>';

                    let deregisterBadge = '';
                    if (u.deregister_status === 'pending') {
                        deregisterBadge = '<div style="margin-top:3px;"><span class="badge" style="background:#fef3c7;color:#b45309;font-weight:700;font-size:11px;">⚠️ 申请注销中</span></div>';
                    } else if (u.deregister_status === 'rejected') {
                        deregisterBadge = '<div style="margin-top:3px;"><span class="badge" style="background:#f1f5f9;color:#64748b;font-size:11px;">注销已驳回</span></div>';
                    }

                    // 手机号脱敏
                    let mobileDisplay = u.mobile || '未绑定';
                    if (isPrivacyMasked && u.mobile && u.mobile.length === 11) {
                        mobileDisplay = u.mobile.substring(0, 3) + '****' + u.mobile.substring(7);
                    }

                    // 认证与安全特征
                    const pwdBadge = Number(u.has_password) === 1
                        ? '<span class="badge badge-success" style="font-size:11px;">已设密码</span>'
                        : '<span class="badge badge-warning" style="font-size:11px;">未设密码</span>';
                    const wxBadge = u.openid
                        ? '<span class="badge" style="background:#e0f2fe;color:#0369a1;font-size:11px;">微信</span>'
                        : '';
                    const authFlags = `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:4px;">${pwdBadge}${wxBadge}</div>`;

                    // 风控评级
                    const riskTag = u.risk_tag || 'normal';
                    const riskOptions = `
                        <select onchange="window.changeUserRiskTag(${u.id}, this.value)" style="font-size:12px;padding:2px 6px;border-radius:4px;border:1px solid #cbd5e1;background:#fff;">
                            <option value="normal" ${riskTag === 'normal' ? 'selected' : ''}>🟢 正常客户</option>
                            <option value="trusted" ${riskTag === 'trusted' ? 'selected' : ''}>⭐ 优质信用</option>
                            <option value="dispute" ${riskTag === 'dispute' ? 'selected' : ''}>⚠️ 高频争议</option>
                            <option value="fraud" ${riskTag === 'fraud' ? 'selected' : ''}>🚨 欺诈预警</option>
                        </select>
                    `;

                    // 实名信息
                    const realnameTxt = u.realname 
                        ? `<div style="font-size:12px;color:#059669;margin-top:2px;">实名: <strong>${escapeHtml(u.realname)}</strong></div>` 
                        : '<div style="color:#94a3b8;font-size:12px;margin-top:2px;">未认证实名</div>';

                    // 注册 IP 与归属地显示
                    const regIpDisp = maskIp(u.register_ip);
                    const regLocDisp = u.register_location || '未解析归属地';

                    // 登录 IP 与归属地显示
                    const loginIpDisp = maskIp(u.last_login_ip);
                    const loginLocDisp = u.last_login_location || (u.last_login_ip ? '未解析归属地' : '从未登录');

                    // 操作按钮
                    const detailBtn = `<button class="btn btn-outline" style="height:26px;padding:0 7px;font-size:12px;margin-right:4px;" onclick="window.viewUserDetail(${u.id})">详情</button>`;
                    const ordersBtn = `<button class="btn btn-outline" style="height:26px;padding:0 7px;font-size:12px;margin-right:4px;" onclick="window.viewUserOrders(${u.id}, '${escapeHtml(u.nickname || u.mobile || '客户')}')">订单</button>`;
                    const resetBtn = `<button class="btn btn-secondary" style="height:26px;padding:0 7px;font-size:12px;margin-right:4px;" onclick="window.resetUserPasswordPrompt(${u.id}, '${escapeHtml(u.nickname || u.mobile || '客户')}')">改密</button>`;
                    const kickBtn = `<button class="btn btn-outline" style="height:26px;padding:0 7px;font-size:12px;margin-right:4px;color:#d97706;border-color:#fde68a;" onclick="window.kickUserSession(${u.id}, '${escapeHtml(u.nickname || u.mobile || '客户')}')" title="吊销该用户所有在途 Token">下线</button>`;
                    const actionBtn = Number(u.status) === 1
                        ? `<button class="btn btn-danger" style="height:26px;padding:0 7px;font-size:12px;background:#ef4444;color:#fff;" onclick="window.toggleUserStatus(${u.id}, 0)">封禁</button>`
                        : `<button class="btn btn-success" style="height:26px;padding:0 7px;font-size:12px;background:#10b981;color:#fff;" onclick="window.toggleUserStatus(${u.id}, 1)">恢复</button>`;
                    const deleteBtn = `<button class="btn btn-outline" style="height:26px;padding:0 7px;font-size:12px;color:#ef4444;border-color:#fca5a5;margin-left:4px;" onclick="window.confirmDeleteUser(${u.id}, '${escapeHtml(u.nickname || u.mobile || '客户')}')" title="管理员手动删号并注销">删号</button>`;

                    rows += `<tr>
                        <td>${u.id}</td>
                        <td>
                            <strong>${escapeHtml(u.nickname || '回收客户')}</strong>
                            ${realnameTxt}
                        </td>
                        <td><strong style="color:#1e58ff;font-family:monospace;">${escapeHtml(mobileDisplay)}</strong></td>
                        <td>
                            <div style="font-family:monospace;font-size:12px;font-weight:700;color:#0f172a;">${escapeHtml(regIpDisp)}</div>
                            <div style="color:#059669;font-size:11px;margin-top:2px;display:flex;align-items:center;gap:3px;" title="${escapeHtml(u.register_location || '未解析归属地')}">
                                <span>📍</span><span style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(regLocDisp)}</span>
                            </div>
                            <div style="color:#94a3b8;font-size:11px;margin-top:2px;">🕒 ${formatTime(u.created_at)}</div>
                        </td>
                        <td>
                            <div style="font-family:monospace;font-size:12px;font-weight:700;color:#0f172a;">${escapeHtml(loginIpDisp)}</div>
                            <div style="color:#2563eb;font-size:11px;margin-top:2px;display:flex;align-items:center;gap:3px;" title="${escapeHtml(u.last_login_location || '未解析归属地')}">
                                <span>🌐</span><span style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(loginLocDisp)}</span>
                            </div>
                            <div style="color:#94a3b8;font-size:11px;margin-top:2px;">🕒 ${u.last_login_time ? formatTime(u.last_login_time) : '从未登录'}</div>
                        </td>
                        <td>
                            ${authFlags}
                            ${riskOptions}
                        </td>
                        <td>
                            <div><span class="badge badge-info">${u.order_count || 0} 单</span></div>
                            <div style="font-size:12px;font-weight:600;color:#0f172a;margin-top:3px;">¥ ${(parseFloat(u.total_turnover || 0)).toFixed(2)}</div>
                        </td>
                        <td>${statusText}${deregisterBadge}</td>
                        <td style="white-space:nowrap;">${detailBtn}${ordersBtn}${resetBtn}${kickBtn}${actionBtn}${deleteBtn}</td>
                    </tr>`;
                });

                box.innerHTML = `
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th style="width:50px;">ID</th>
                                <th>客户姓名</th>
                                <th>手机号</th>
                                <th>注册信息</th>
                                <th>登录信息</th>
                                <th>客户标签</th>
                                <th>累计回收</th>
                                <th>状态</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                `;
            } else {
                box.innerHTML = '<div style="text-align:center;padding:50px;color:#ef4444;">获取客户列表失败</div>';
            }
        }

        document.getElementById('btn-search-users')?.addEventListener('click', loadUsers);
        document.getElementById('user-deregister-filter')?.addEventListener('change', loadUsers);
        document.getElementById('btn-reset-users')?.addEventListener('click', () => {
            const kw = document.getElementById('user-kw');
            if (kw) kw.value = '';
            const flt = document.getElementById('user-deregister-filter');
            if (flt) flt.value = '';
            loadUsers();
        });

        // 打开新增客户弹窗
        document.getElementById('btn-open-create-user')?.addEventListener('click', () => {
            const modal = document.getElementById('modal-create-user');
            if (modal) {
                document.getElementById('form-create-user')?.reset();
                modal.style.display = 'flex';
            }
        });

        // 提交新建客户
        document.getElementById('form-create-user')?.addEventListener('submit', async function (e) {
            e.preventDefault();
            const mobile = document.getElementById('cu-mobile')?.value.trim();
            const password = document.getElementById('cu-password')?.value;
            const nickname = document.getElementById('cu-nickname')?.value.trim();
            const realname = document.getElementById('cu-realname')?.value.trim();
            const default_payout_type = document.getElementById('cu-payout-type')?.value;
            const default_payout_name = document.getElementById('cu-payout-name')?.value.trim();
            const default_payout_account = document.getElementById('cu-payout-account')?.value.trim();

            const btn = document.getElementById('btn-submit-create-user');
            if (btn) btn.disabled = true;

            const res = await api.post('/admin/user/create', {
                mobile, password, nickname, realname,
                default_payout_type, default_payout_name, default_payout_account
            });

            if (btn) btn.disabled = false;

            if (res && res.code === 200) {
                SysUI.toast('新客户账号已成功录入', 'success');
                document.getElementById('modal-create-user').style.display = 'none';
                loadUsers();
                loadUserStats();
            } else {
                SysUI.toast(res ? res.msg : '录入失败', 'error');
            }
        });

        // ----------------------------------------------------
        // 2. 系统管理员与账号安全逻辑
        // ----------------------------------------------------
        async function loadAdminProfile() {
            const res = await api.get('/admin/admin/profile');
            if (res && res.code === 200 && res.data) {
                const a = res.data;
                const elUser = document.getElementById('adm-cur-username');
                const elRole = document.getElementById('adm-cur-role');
                const elReal = document.getElementById('adm-my-realname');
                const elIp = document.getElementById('adm-cur-ip');
                const elTime = document.getElementById('adm-cur-time');
                if (elUser) elUser.innerText = a.username || 'admin';
                if (elRole) elRole.innerText = a.role === 'admin' ? '超级管理员' : a.role;
                if (elReal && !elReal.value) elReal.value = a.realname || '';
                if (elIp) elIp.innerText = a.last_login_ip || '127.0.0.1';
                if (elTime) elTime.innerText = formatTime(a.last_login_time);
            }
        }

        // 修改管理员自身姓名资料
        document.getElementById('form-update-admin-profile')?.addEventListener('submit', async function(e) {
            e.preventDefault();
            const realname = document.getElementById('adm-my-realname')?.value.trim();
            if (!realname) {
                SysUI.toast('姓名不能为空', 'warning');
                return;
            }
            const res = await api.post('/admin/admin/updateProfile', { realname });
            if (res && res.code === 200) {
                SysUI.toast('管理员姓名已成功更新！', 'success');
                if (adminState.admin) {
                    adminState.admin.realname = realname;
                    localStorage.setItem('ql_admin_info', JSON.stringify(adminState.admin));
                }
            } else {
                SysUI.toast(res ? res.msg : '更新失败', 'error');
            }
        });

        // 修改自身密码
        document.getElementById('form-change-admin-pwd')?.addEventListener('submit', async function(e) {
            e.preventDefault();
            const oldPassword = document.getElementById('adm-pwd-old')?.value;
            const newPassword = document.getElementById('adm-pwd-new')?.value;
            const confirmPwd = document.getElementById('adm-pwd-confirm')?.value;
            const btn = document.getElementById('btn-submit-change-pwd');

            if (!oldPassword) {
                SysUI.toast('请输入当前正在使用的原登录密码', 'warning');
                return;
            }
            if (!newPassword || newPassword.length < 6) {
                SysUI.toast('新密码长度不能少于6位字符', 'warning');
                return;
            }
            if (newPassword !== confirmPwd) {
                SysUI.toast('两次输入的新密码不一致，请仔细核对', 'warning');
                return;
            }

            if (btn) btn.disabled = true;
            const res = await api.post('/admin/admin/changePassword', {
                old_password: oldPassword,
                new_password: newPassword
            });
            if (btn) btn.disabled = false;

            if (res && res.code === 200) {
                SysUI.toast('密码已成功修改！请牢记您的新密码', 'success');
                document.getElementById('form-change-admin-pwd')?.reset();
                loadAdminLogs();
            } else {
                SysUI.toast(res ? res.msg : '密码修改失败', 'error');
            }
        });

        // 加载平台管理员成员列表
        async function loadAdminList() {
            const res = await api.get('/admin/admin/list');
            const box = document.getElementById('admins-table-box');
            if (!box) return;

            if (res && res.code === 200) {
                const list = res.data.list || [];
                if (list.length === 0) {
                    box.innerHTML = '<div style="text-align:center;padding:30px;color:#94a3b8;">暂无管理员账号数据</div>';
                    return;
                }

                let rows = '';
                list.forEach(adm => {
                    const isSelf = Number(adm.id) === currentAdminId;
                    const statusBadge = Number(adm.status) === 1
                        ? '<span class="badge badge-success">正常使用</span>'
                        : '<span class="badge badge-danger">已停用</span>';

                    const roleMap = {
                        'admin': '<span class="badge badge-info">超级管理员</span>',
                        'inspector': '<span class="badge badge-warning">质检主管</span>',
                        'finance': '<span class="badge" style="background:#fef3c7;color:#92400e;">财务放款</span>',
                        'operator': '<span class="badge" style="background:#e0f2fe;color:#0369a1;">客服运营</span>'
                    };
                    const roleBadge = roleMap[adm.role] || `<span class="badge">${escapeHtml(adm.role)}</span>`;

                    // 操作按钮
                    const resetBtn = `<button class="btn btn-outline" style="height:26px;padding:0 8px;font-size:12px;margin-right:6px;" onclick="window.openResetAdminPwd(${adm.id}, '${escapeHtml(adm.username)}')">重置密码</button>`;
                    
                    let toggleBtn = '';
                    let deleteBtn = '';

                    if (isSelf) {
                        toggleBtn = `<span style="font-size:12px;color:#94a3b8;margin-right:6px;">(当前账号)</span>`;
                    } else {
                        if (Number(adm.status) === 1) {
                            toggleBtn = `<button class="btn btn-danger" style="height:26px;padding:0 8px;font-size:12px;background:#ef4444;color:#fff;margin-right:6px;" onclick="window.toggleAdminStatus(${adm.id}, 0)">停用</button>`;
                        } else {
                            toggleBtn = `<button class="btn btn-success" style="height:26px;padding:0 8px;font-size:12px;background:#10b981;color:#fff;margin-right:6px;" onclick="window.toggleAdminStatus(${adm.id}, 1)">启用</button>`;
                        }
                        deleteBtn = `<button class="btn btn-outline" style="height:26px;padding:0 8px;font-size:12px;color:#ef4444;border-color:#fca5a5;" onclick="window.deleteAdminAccount(${adm.id}, '${escapeHtml(adm.username)}')">删除</button>`;
                    }

                    rows += `<tr>
                        <td>${adm.id}</td>
                        <td><strong>${escapeHtml(adm.username)}</strong> ${isSelf ? '<span class="badge badge-info" style="font-size:10px;">本人</span>' : ''}</td>
                        <td>${escapeHtml(adm.realname || '-')}</td>
                        <td>${roleBadge}</td>
                        <td>${statusBadge}</td>
                        <td style="font-size:12px;">${escapeHtml(adm.last_login_ip || '从未登录')}</td>
                        <td style="font-size:12px;color:#64748b;">${formatTime(adm.last_login_time)}</td>
                        <td style="white-space:nowrap;">${resetBtn}${toggleBtn}${deleteBtn}</td>
                    </tr>`;
                });

                box.innerHTML = `
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>管理员账号</th>
                                <th>真实姓名</th>
                                <th>角色权限</th>
                                <th>状态</th>
                                <th>最近登录 IP</th>
                                <th>最近登录时间</th>
                                <th>管理操作</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                `;
            } else {
                box.innerHTML = '<div style="text-align:center;padding:30px;color:#ef4444;">获取管理员列表失败</div>';
            }
        }

        // 打开添加管理员弹窗
        document.getElementById('btn-open-create-admin')?.addEventListener('click', () => {
            const modal = document.getElementById('modal-create-admin');
            if (modal) {
                document.getElementById('form-create-admin')?.reset();
                modal.style.display = 'flex';
            }
        });

        // 提交添加管理员
        document.getElementById('form-create-admin')?.addEventListener('submit', async function(e) {
            e.preventDefault();
            const username = document.getElementById('cadm-username')?.value.trim();
            const password = document.getElementById('cadm-password')?.value;
            const realname = document.getElementById('cadm-realname')?.value.trim();
            const role = document.getElementById('cadm-role')?.value;
            const btn = document.getElementById('btn-submit-create-admin');

            if (!username || !password || !realname) {
                SysUI.toast('请填写完整的管理员账号信息', 'warning');
                return;
            }

            if (btn) btn.disabled = true;
            const res = await api.post('/admin/admin/create', { username, password, realname, role });
            if (btn) btn.disabled = false;

            if (res && res.code === 200) {
                SysUI.toast('新管理员账号已成功创建！', 'success');
                document.getElementById('modal-create-admin').style.display = 'none';
                loadAdminList();
                loadAdminLogs();
            } else {
                SysUI.toast(res ? res.msg : '创建管理员失败', 'error');
            }
        });

        // 提交重置管理员密码
        document.getElementById('form-reset-admin-pwd')?.addEventListener('submit', async function(e) {
            e.preventDefault();
            const targetId = Number(document.getElementById('radm-target-id')?.value || 0);
            const password = document.getElementById('radm-new-pwd')?.value;
            const btn = document.getElementById('btn-submit-radm');

            if (!targetId || !password || password.length < 6) {
                SysUI.toast('新密码长度不得少于6位', 'warning');
                return;
            }

            if (btn) btn.disabled = true;
            const res = await api.post('/admin/admin/resetPassword', { id: targetId, password });
            if (btn) btn.disabled = false;

            if (res && res.code === 200) {
                SysUI.toast('管理员密码重置成功！', 'success');
                document.getElementById('modal-reset-admin-pwd').style.display = 'none';
                loadAdminLogs();
            } else {
                SysUI.toast(res ? res.msg : '重置失败', 'error');
            }
        });

        // 加载平台安全审计日志
        async function loadAdminLogs() {
            const res = await api.get('/admin/admin/loginLogs');
            const box = document.getElementById('admin-logs-box');
            if (!box) return;

            if (res && res.code === 200) {
                const list = res.data.list || [];
                if (list.length === 0) {
                    box.innerHTML = '<div style="text-align:center;padding:30px;color:#94a3b8;">暂无审计日志记录</div>';
                    return;
                }

                let rows = '';
                list.forEach(log => {
                    const actionMap = {
                        'login': '<span class="badge badge-info">系统登录</span>',
                        'change_password': '<span class="badge badge-warning">修改密码</span>',
                        'update_profile': '<span class="badge">修改姓名</span>',
                        'create_admin': '<span class="badge badge-success">添加管理员</span>',
                        'reset_admin_password': '<span class="badge badge-danger">重置密码</span>',
                        'update_admin_status': '<span class="badge badge-warning">状态启停</span>',
                        'delete_admin': '<span class="badge badge-danger">删除账号</span>'
                    };
                    const actionTag = actionMap[log.action] || `<span class="badge">${escapeHtml(log.action)}</span>`;

                    rows += `<tr>
                        <td>${log.id}</td>
                        <td><strong>${escapeHtml(log.admin_name || '系统')}</strong></td>
                        <td>${actionTag}</td>
                        <td>${escapeHtml(log.detail || '-')}</td>
                        <td style="font-family:monospace;font-size:12px;">${escapeHtml(log.ip || '-')}</td>
                        <td style="font-size:12px;color:#64748b;">${formatTime(log.created_at)}</td>
                    </tr>`;
                });

                box.innerHTML = `
                    <table class="data-table" style="font-size:12px;">
                        <thead>
                            <tr>
                                <th style="width:70px;">ID</th>
                                <th style="width:140px;">操作人</th>
                                <th style="width:110px;">动作事件</th>
                                <th>详细行为记录</th>
                                <th style="width:130px;">操作 IP</th>
                                <th style="width:160px;">操作时间</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                `;
            } else {
                box.innerHTML = '<div style="text-align:center;padding:30px;color:#ef4444;">获取安全审计日志失败</div>';
            }
        }

        document.getElementById('btn-refresh-admin-logs')?.addEventListener('click', loadAdminLogs);

        // ----------------------------------------------------
        // 3. 用户认证与注册方式高度自定义开关
        // ----------------------------------------------------
        async function loadUserAuthSwitches() {
            const res = await api.get('/admin/config/getConfigs');
            if (res && res.code === 200 && res.data) {
                const c = res.data;
                const setCheck = (id, val, def = true) => {
                    const el = document.getElementById(id);
                    if (el) el.checked = (val !== undefined) ? (val !== '0') : def;
                };

                                setCheck('cfg-user-auth-password', c.user_auth_password_enabled, true);
                setCheck('cfg-user-register-enabled', c.user_register_enabled, true);
                setCheck('cfg-user-auth-wechat', c.user_auth_wechat_enabled, true);
                setCheck('cfg-user-order-guest', c.user_order_guest_enabled, true);
                setCheck('cfg-user-require-realname', c.user_require_realname, false);

                // 灵简 IP 接口开关与密钥
                setCheck('cfg-user-lingjian-enabled', c.lingjian_ip_enabled, false);
                const keyInput = document.getElementById('cfg-user-lingjian-key');
                if (keyInput) keyInput.value = c.lingjian_ip_api_key || '';
            }
        }

        // 密钥密码框显示 / 隐藏切换
        const btnToggleKeyEye = document.getElementById('btn-toggle-user-lingjian-key');
        btnToggleKeyEye?.addEventListener('click', () => {
            const keyInput = document.getElementById('cfg-user-lingjian-key');
            if (!keyInput) return;
            if (keyInput.type === 'password') {
                keyInput.type = 'text';
                btnToggleKeyEye.innerText = '🔒 隐藏';
            } else {
                keyInput.type = 'password';
                btnToggleKeyEye.innerText = '👁️ 查看';
            }
        });

        // 灵简 IP 接口连通性在线测试
        const btnRunIpTest = document.getElementById('btn-run-user-ip-test');
        btnRunIpTest?.addEventListener('click', async () => {
            const testIp = document.getElementById('test-user-ip-val')?.value.trim() || '114.114.114.114';
            const apiKey = document.getElementById('cfg-user-lingjian-key')?.value.trim() || '';
            const spinner = document.getElementById('ip-test-spinner');
            const resBox = document.getElementById('ip-test-result-box');

            if (spinner) spinner.style.display = 'inline';
            if (btnRunIpTest) btnRunIpTest.disabled = true;
            if (resBox) {
                resBox.style.display = 'block';
                resBox.innerHTML = '<span style="color:#64748b;">正在连接灵简官方 API 接口 (https://api.jingxialai.com/api/ip)...</span>';
            }

            const res = await api.post('/admin/config/testIpApi', {
                api_key: apiKey,
                ip: testIp
            });

            if (spinner) spinner.style.display = 'none';
            if (btnRunIpTest) btnRunIpTest.disabled = false;

            if (res && res.code === 200) {
                const d = res.data || {};
                resBox.innerHTML = `
                    <div style="background:#f0fdf4;border:1px solid #86efac;color:#166534;padding:10px 14px;border-radius:6px;">
                        <div style="font-weight:700;">✅ 灵简 IP 接口连通正常！(响应延迟: ${d.latency_ms || 0}ms)</div>
                        <div style="margin-top:4px;"><strong>探测目标 IP：</strong>${escapeHtml(d.ip || testIp)}</div>
                        <div><strong>物理归属地：</strong>${escapeHtml(d.location_text || '-')}</div>
                        <div><strong>网络运营商：</strong>${escapeHtml(d.isp || d.organization || '-')}</div>
                    </div>
                `;
            } else {
                resBox.innerHTML = `
                    <div style="background:#fef2f2;border:1px solid #fecaca;color:#991b1b;padding:10px 14px;border-radius:6px;">
                        <div style="font-weight:700;">❌ 接口连通失败：${escapeHtml(res ? res.msg : '网络超时或鉴权未通过')}</div>
                        <div style="margin-top:2px;">请仔细核对您的灵简 API 密钥，或登录 <a href="https://api.jingxialai.com/" target="_blank" style="color:#2563eb;text-decoration:underline;">灵简控制台</a> 检查额度与状态。</div>
                    </div>
                `;
            }
        });

        // 保存高度自定义开关与灵简 IP 密钥
        document.getElementById('form-user-auth-switches')?.addEventListener('submit', async function (e) {
            e.preventDefault();
            const btn = document.getElementById('btn-save-user-switches');
            if (btn) btn.disabled = true;

            const configs = {
                user_auth_fast_enabled: '0',
                user_auth_password_enabled: document.getElementById('cfg-user-auth-password')?.checked ? '1' : '0',
                user_register_enabled: document.getElementById('cfg-user-register-enabled')?.checked ? '1' : '0',
                user_auth_wechat_enabled: document.getElementById('cfg-user-auth-wechat')?.checked ? '1' : '0',
                user_order_guest_enabled: document.getElementById('cfg-user-order-guest')?.checked ? '1' : '0',
                user_require_realname: document.getElementById('cfg-user-require-realname')?.checked ? '1' : '0',
                lingjian_ip_enabled: document.getElementById('cfg-user-lingjian-enabled')?.checked ? '1' : '0',
                lingjian_ip_api_key: document.getElementById('cfg-user-lingjian-key')?.value.trim() || ''
            };

            const res = await api.post('/admin/config/saveConfigs', { configs });
            if (btn) btn.disabled = false;

            if (res && res.code === 200) {
                SysUI.toast('用户认证策略与灵简 IP 接口配置已成功保存并实时生效！', 'success');
            } else {
                SysUI.toast(res ? res.msg : '保存失败', 'error');
            }
        });

        // 默认初始化或外部跳转判定
        if (adminState.usersActiveTab === 'admin') {
            adminState.usersActiveTab = null;
            switchSubTab('admin');
        } else {
            loadUsers();
            loadUserStats();
        }
    }

    // ==========================================
    // 全局挂载交互方法
    // ==========================================

    // 查看指定用户的关联回收订单明细
    window.viewUserOrders = async function(userId, userName) {
        const modal = document.getElementById('modal-user-orders');
        const titleEl = document.getElementById('user-orders-modal-title');
        const contentBox = document.getElementById('user-orders-content-box');
        if (!modal || !contentBox) return;

        titleEl.innerText = `客户【${userName}】的历史回收订单`;
        contentBox.innerHTML = '<div style="text-align:center;padding:30px;color:#94a3b8;">正在加载该客户的订单记录...</div>';
        modal.style.display = 'flex';

        const res = await api.get(`/admin/user/orders&user_id=${userId}`);
        if (res && res.code === 200) {
            const list = res.data || [];
            if (list.length === 0) {
                contentBox.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;">该客户当前暂无回收订单记录</div>';
                return;
            }

            let html = `
                <table class="data-table" style="font-size:12px;">
                    <thead>
                        <tr><th>订单号</th><th>商品名称</th><th>回收方式</th><th>预估价</th><th>最终成交价</th><th>状态</th><th>下单时间</th></tr>
                    </thead>
                    <tbody>
            `;
            const fMap = { 'home': '上门回收', 'mail': '快递邮寄', 'store': '门店到访' };
            const statusMap = {
                'pending_send': '<span class="badge badge-warning">待交付</span>',
                'in_transit': '<span class="badge badge-info">运输中</span>',
                'received': '<span class="badge badge-info">已收货</span>',
                'inspecting': '<span class="badge badge-info">质检中</span>',
                'price_confirming': '<span class="badge badge-danger">待确认差价</span>',
                'completed': '<span class="badge badge-success">已成交</span>',
                'refunded': '<span class="badge">已退回</span>',
                'cancelled': '<span class="badge">已取消</span>'
            };

            list.forEach(o => {
                html += `
                    <tr>
                        <td><strong>${escapeHtml(o.order_sn)}</strong></td>
                        <td>${escapeHtml(o.device_name)}</td>
                        <td>${fMap[o.fulfillment_type] || o.fulfillment_type}</td>
                        <td>¥ ${escapeHtml(o.estimate_price)}</td>
                        <td><strong>¥ ${o.final_price || '-'}</strong></td>
                        <td>${statusMap[o.status] || o.status}</td>
                        <td>${formatTime(o.created_at)}</td>
                    </tr>
                `;
            });
            html += '</tbody></table>';
            contentBox.innerHTML = html;
        } else {
            contentBox.innerHTML = '<div style="text-align:center;padding:30px;color:#ef4444;">获取客户订单记录失败</div>';
        }
    };

    // 重置前台会员密码
    window.resetUserPasswordPrompt = async function(userId, userName) {
        const newPwd = prompt(`请输入为客户【${userName}】设定的新登录密码 (至少6位)：`);
        if (!newPwd) return;
        if (newPwd.length < 6) {
            SysUI.toast('新密码长度不得少于6位', 'warning');
            return;
        }

        const res = await api.post('/admin/user/resetPassword', { id: userId, password: newPwd });
        if (res && res.code === 200) {
            SysUI.toast('该客户登录密码已成功重置！', 'success');
        } else {
            SysUI.toast(res ? res.msg : '密码重置失败', 'error');
        }
    };

    // 强制踢出前台用户会话 (Kick Session)
    window.kickUserSession = async function(userId, userName) {
        const confirmed = await SysUI.confirm(`确认强制下线客户【${userName}】吗？该操作将立即吊销其所有端活跃登录凭证。`, {
            title: '会话安全强制下线',
            type: 'warning',
            confirmText: '强制下线'
        });
        if (!confirmed) return;

        const res = await api.post('/admin/user/kick', { id: userId });
        if (res && res.code === 200) {
            SysUI.toast('已成功强制下线该客户的所有登录会话！', 'success');
        } else {
            SysUI.toast(res ? res.msg : '下线操作失败', 'error');
        }
    };

    // 变更客户风控标签
    window.changeUserRiskTag = async function(userId, riskTag) {
        const res = await api.post('/admin/user/updateRisk', { id: userId, risk_tag: riskTag });
        if (res && res.code === 200) {
            SysUI.toast('客户风控评级标签已更新', 'success');
        } else {
            SysUI.toast(res ? res.msg : '风控评级更新失败', 'error');
        }
    };

    // 封禁 / 解封客户
    window.toggleUserStatus = async function (userId, newStatus) {
        const msg = newStatus === 0 ? '确认将该客户拉入黑名单吗？封禁后将无法登录系统与提交回收订单。' : '确认恢复该客户正常使用权限吗？';
        const confirmed = await SysUI.confirm(msg, {
            title: '客户账号状态变更',
            type: newStatus === 0 ? 'warning' : 'info',
            confirmText: '确认变更'
        });
        if (!confirmed) return;
        const res = await api.post('/admin/user/updateStatus', { id: userId, status: newStatus });
        if (res && res.code === 200) {
            SysUI.toast('客户状态已更新！', 'success');
            if (typeof window.renderUsersView === 'function') {
                const box = document.getElementById('tab-content');
                if (box) window.renderUsersView(box);
            }
        } else {
            SysUI.toast(res ? res.msg : '操作失败', 'error');
        }
    };

    // 打开管理员重置密码弹窗
    window.openResetAdminPwd = function(adminId, adminName) {
        const modal = document.getElementById('modal-reset-admin-pwd');
        const idEl = document.getElementById('radm-target-id');
        const nameEl = document.getElementById('radm-target-name');
        const pwdEl = document.getElementById('radm-new-pwd');
        if (!modal) return;

        if (idEl) idEl.value = adminId;
        if (nameEl) nameEl.innerText = adminName;
        if (pwdEl) pwdEl.value = '';
        modal.style.display = 'flex';
    };

    // 停用 / 启用管理员账号
    window.toggleAdminStatus = async function(adminId, newStatus) {
        const actionText = newStatus === 1 ? '启用' : '停用';
        const confirmed = await SysUI.confirm(`确认${actionText}该管理员账号吗？停用后该人员将无法登录后台。`, {
            title: `${actionText}管理员确认`,
            type: newStatus === 1 ? 'info' : 'warning',
            confirmText: `确认${actionText}`
        });
        if (!confirmed) return;

        const res = await api.post('/admin/admin/updateStatus', { id: adminId, status: newStatus });
        if (res && res.code === 200) {
            SysUI.toast(`管理员账号已成功${actionText}！`, 'success');
            if (typeof window.renderUsersView === 'function') {
                const box = document.getElementById('tab-content');
                if (box) window.renderUsersView(box);
            }
        } else {
            SysUI.toast(res ? res.msg : '操作失败', 'error');
        }
    };

    // 删除管理员账号
    window.deleteAdminAccount = async function(adminId, adminName) {
        const confirmed = await SysUI.confirm(`严重警告：确认删除管理员【${adminName}】吗？删除后该管理凭据将被彻底注销！`, {
            title: '删除管理员账号警告',
            type: 'warning',
            isDanger: true,
            confirmText: '确认永久删除'
        });
        if (!confirmed) return;

        const res = await api.post('/admin/admin/delete', { id: adminId });
        if (res && res.code === 200) {
            SysUI.toast('管理员账号已成功删除！', 'success');
            if (typeof window.renderUsersView === 'function') {
                const box = document.getElementById('tab-content');
                if (box) window.renderUsersView(box);
            }
        } else {
            SysUI.toast(res ? res.msg : '删除失败', 'error');
        }
    };

    // 查看客户详细档案与 IP 网络画像
    window.viewUserDetail = function(userId) {
        const modal = document.getElementById('modal-user-detail');
        const box = document.getElementById('user-detail-content-box');
        const titleEl = document.getElementById('user-detail-title');
        if (!modal || !box) return;

        const u = (window.currentUsersMap && window.currentUsersMap[userId]) || null;
        if (!u) {
            SysUI.toast('未找到该客户的档案信息', 'error');
            return;
        }

        if (titleEl) titleEl.innerText = `客户【${escapeHtml(u.nickname || u.mobile || '客户')}】的档案与 IP 安全画像`;

        const statusBadge = Number(u.status) === 1
            ? '<span class="badge badge-success">正常使用</span>'
            : '<span class="badge badge-danger">已封禁限制</span>';

        const riskMap = {
            'normal': '<span class="badge badge-success">🟢 正常客户</span>',
            'trusted': '<span class="badge badge-info">⭐ 优质信用</span>',
            'dispute': '<span class="badge badge-warning">⚠️ 高频争议</span>',
            'fraud': '<span class="badge badge-danger">🚨 欺诈预警</span>'
        };
        const riskBadge = riskMap[u.risk_tag] || `<span class="badge">${escapeHtml(u.risk_tag || 'normal')}</span>`;

        const payoutMap = {
            'alipay': '支付宝',
            'bank': '银行卡转账',
            'wechat': '微信零钱'
        };

        box.innerHTML = `
            <!-- 基础身份卡片 -->
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin-bottom:16px;">
                <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:12px;display:flex;align-items:center;gap:6px;">
                    <span>👤 客户身份与账户基本信息</span>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:12px;">
                    <div><span style="color:#64748b;">客户 UID：</span><strong>${u.id}</strong></div>
                    <div><span style="color:#64748b;">账号状态：</span>${statusBadge}</div>
                    <div><span style="color:#64748b;">客户昵称：</span><strong>${escapeHtml(u.nickname || '-')}</strong></div>
                    <div><span style="color:#64748b;">实名认证：</span><strong>${escapeHtml(u.realname || '未认证实名')}</strong></div>
                    <div><span style="color:#64748b;">绑定手机：</span><strong style="color:#1e58ff;font-family:monospace;">${escapeHtml(u.mobile || '未绑定')}</strong></div>
                    <div><span style="color:#64748b;">风控标签：</span>${riskBadge}</div>
                    <div><span style="color:#64748b;">登录密码：</span>${Number(u.has_password) === 1 ? '<span class="badge badge-success">已设置独立密码</span>' : '<span class="badge badge-info">免密极速账户</span>'}</div>
                    <div><span style="color:#64748b;">微信授权：</span>${u.openid ? '<span class="badge badge-success">已绑定微信</span>' : '<span class="badge">未绑定微信</span>'}</div>
                </div>
            </div>

            <!-- 灵简 IP 归属地与网络痕迹卡片 -->
            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:16px;margin-bottom:16px;">
                <div style="font-size:13px;font-weight:700;color:#1e40af;margin-bottom:12px;display:flex;align-items:center;gap:6px;">
                    <span>🌐 灵简 IP 网络轨迹与地理运营商画像</span>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:12px;">
                    <div style="background:#fff;border:1px solid #dbeafe;border-radius:8px;padding:12px;">
                        <div style="font-weight:700;color:#1e40af;margin-bottom:6px;">📌 注册源 IP 与物理归属地</div>
                        <div style="margin-bottom:4px;"><span style="color:#64748b;">注册 IP：</span><code style="font-family:monospace;font-size:13px;font-weight:700;color:#0f172a;">${escapeHtml(u.register_ip || '-')}</code></div>
                        <div style="margin-bottom:4px;"><span style="color:#64748b;">归属位置：</span><strong style="color:#059669;">${escapeHtml(u.register_location || '未解析归属地')}</strong></div>
                        <div><span style="color:#64748b;">注册时间：</span>${formatTime(u.created_at)}</div>
                    </div>

                    <div style="background:#fff;border:1px solid #dbeafe;border-radius:8px;padding:12px;">
                        <div style="font-weight:700;color:#1e40af;margin-bottom:6px;">🚀 最近登录 IP 与物理归属地</div>
                        <div style="margin-bottom:4px;"><span style="color:#64748b;">登录 IP：</span><code style="font-family:monospace;font-size:13px;font-weight:700;color:#0f172a;">${escapeHtml(u.last_login_ip || '-')}</code></div>
                        <div style="margin-bottom:4px;"><span style="color:#64748b;">归属位置：</span><strong style="color:#2563eb;">${escapeHtml(u.last_login_location || (u.last_login_ip ? '未解析归属地' : '从未登录'))}</strong></div>
                        <div><span style="color:#64748b;">登录时间：</span>${u.last_login_time ? formatTime(u.last_login_time) : '从未登录'}</div>
                    </div>
                </div>
            </div>

            <!-- 财务结算与回收业务指标卡片 -->
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
                <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:12px;display:flex;align-items:center;gap:6px;">
                    <span>💰 默认收款结算账户与履约统计</span>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:12px;">
                    <div><span style="color:#64748b;">收款方式：</span><strong>${payoutMap[u.default_payout_type] || u.default_payout_type || '支付宝'}</strong></div>
                    <div><span style="color:#64748b;">收款人姓名：</span><strong>${escapeHtml(u.default_payout_name || '-')}</strong></div>
                    <div style="grid-column:span 2;"><span style="color:#64748b;">收款账号：</span><code style="font-family:monospace;font-size:13px;font-weight:700;">${escapeHtml(u.default_payout_account || '未配置')}</code></div>
                    <div><span style="color:#64748b;">累计回收订单：</span><span class="badge badge-info">${u.order_count || 0} 单</span></div>
                    <div><span style="color:#64748b;">累计发放款项：</span><strong style="color:#10b981;font-size:14px;">¥ ${(parseFloat(u.total_turnover || 0)).toFixed(2)}</strong></div>
                </div>
            </div>
        `;

        modal.style.display = 'flex';
    };

    // 审核通过并注销删号 (合规注销与数据脱敏)
    window.confirmApproveDeregister = async function(userId, userName, activeCount) {
        if (Number(activeCount) > 0) {
            SysUI.toast(`警告：该客户尚有 ${activeCount} 笔正在履约中的回收订单，不可直接注销删号！请先待订单完成放款。`, 'warning');
            return;
        }

        const confirmed = await SysUI.confirm(`严重警告：确认审核通过并注销删号客户【${userName}】吗？\n该操作将永久注销该账户、清空加价券并解除所有绑定凭据，此操作不可逆！`, {
            title: '合规注销删号确认',
            type: 'warning',
            isDanger: true,
            confirmText: '确认注销删号'
        });
        if (!confirmed) return;

        const res = await api.post('/admin/user/approveDeregister', { id: userId });
        if (res && res.code === 200) {
            SysUI.toast('已成功审核通过并注销删除该客户账号！', 'success');
            if (typeof window.loadDeregisterList === 'function') {
                window.loadDeregisterList();
            }
            if (typeof window.loadUserStats === 'function') {
                window.loadUserStats();
            }
        } else {
            SysUI.toast(res ? res.msg : '注销删号失败', 'error');
        }
    };

    // 驳回注销申请
    window.promptRejectDeregister = async function(userId, userName) {
        const reason = prompt(`请输入驳回客户【${userName}】注销申请的原因说明：`, '尚有相关业务未完结或不符合注销条件');
        if (reason === null) return;
        const trimReason = reason.trim() || '管理员审核未通过';

        const res = await api.post('/admin/user/rejectDeregister', { id: userId, reject_reason: trimReason });
        if (res && res.code === 200) {
            SysUI.toast('已成功驳回该客户的注销申请！', 'success');
            if (typeof window.loadDeregisterList === 'function') {
                window.loadDeregisterList();
            }
            if (typeof window.loadUserStats === 'function') {
                window.loadUserStats();
            }
        } else {
            SysUI.toast(res ? res.msg : '驳回操作失败', 'error');
        }
    };

    // 管理员常规客户列表直接删号
    window.confirmDeleteUser = async function(userId, userName) {
        const confirmed = await SysUI.confirm(`严重警告：确认手动删除并注销客户【${userName}】吗？\n删除后该客户将被彻底移除，历史订单将解除关联，不可恢复！`, {
            title: '手动删除客户账号警告',
            type: 'warning',
            isDanger: true,
            confirmText: '确认永久删除'
        });
        if (!confirmed) return;

        const res = await api.post('/admin/user/delete', { id: userId });
        if (res && res.code === 200) {
            SysUI.toast('客户账号已成功删除！', 'success');
            if (typeof window.renderUsersView === 'function') {
                const box = document.getElementById('tab-content');
                if (box) window.renderUsersView(box);
            }
        } else {
            SysUI.toast(res ? res.msg : '删除失败', 'error');
        }
    };

    window.renderUsersView = renderUsersView;
})(window);
