/**
 * 启灵同城服务系统 - 首页装修管理视图
 * 包含首屏展示模式、标语副标、热门搜索词、服务保障卡片与轮播Banner广告维护
 */
(function (window) {
    'use strict';

    const SysUI = window.SysUI;
    const api = window.adminApi || window.api;
    const state = window.adminState || window.state;
    const escapeHtml = window.escapeHtml || function(s) { return s || ''; };

    async function renderDecorationView(container) {
        if (!container) return;
        container.innerHTML = '<div class="card" style="padding:40px;text-align:center;color:#64748b;">正在加载首页装修数据...</div>';

        // 异步并发拉取系统配置、Banner 列表与商品品类
        const [cfgRes, bannerRes, catRes] = await Promise.all([
            api.get('/admin/config/getConfigs'),
            api.get('/admin/banner/list'),
            api.get('/admin/device/categories')
        ]);

        const cfgs = (cfgRes && cfgRes.code === 200 && cfgRes.data) ? cfgRes.data : {};
        let banners = (bannerRes && bannerRes.code === 200 && Array.isArray(bannerRes.data)) ? bannerRes.data : [];
        const deviceCategories = (catRes && catRes.code === 200 && Array.isArray(catRes.data)) ? catRes.data : [];

        // 解析 Hot Tags
        let hotTags = [];
        try {
            if (cfgs['hero_hot_tags']) {
                hotTags = JSON.parse(cfgs['hero_hot_tags']);
            }
        } catch (e) {
            hotTags = [];
        }
        if (!Array.isArray(hotTags) || hotTags.length === 0) {
            hotTags = [
                { label: 'iPhone 15 Pro', keyword: 'iPhone 15 Pro' },
                { label: 'Mate 60 Pro', keyword: 'Mate 60 Pro' },
                { label: '小米 14', keyword: '小米14' },
                { label: 'MacBook Pro', keyword: 'MacBook' },
                { label: 'iPad Pro', keyword: 'iPad' }
            ];
        }

        // 解析 Metrics
        let metrics = [];
        try {
            if (cfgs['hero_metrics']) {
                metrics = JSON.parse(cfgs['hero_metrics']);
            }
        } catch (e) {
            metrics = [];
        }
        if (!Array.isArray(metrics) || metrics.length === 0) {
            metrics = [
                { icon: 'bag', val: '120万+', lbl: '累计完成回收' },
                { icon: 'clock', val: '10秒', lbl: '快速精准估价' },
                { icon: 'truck', val: '0元', lbl: '顺丰双向保价包邮' },
                { icon: 'shield', val: '100%', lbl: '隐私安全清除' }
            ];
        }

        // 解析 FAQ 问答列表
        let faqs = [];
        try {
            if (cfgs['home_faq_list']) {
                faqs = JSON.parse(cfgs['home_faq_list']);
            }
        } catch (e) {
            faqs = [];
        }
        if (!Array.isArray(faqs) || faqs.length === 0) {
            faqs = [
                {
                    q: '回收款项多久到账？',
                    a: '平台收到机器并在专业质检工程师验机完成后的 2 小时内，系统将自动发起转账，资金将实时极速打入您的微信钱包、支付宝或银行账户，零手续费。'
                },
                {
                    q: '寄送过程中的顺丰快递费由谁承担？',
                    a: '全场双向包邮！您在线预约后顺丰小哥将免费上门取件并附带专业防震包装。若最终因质检成色差异未达成交易，退回运费亦由平台全额承担。'
                },
                {
                    q: '手机里的私人照片和聊天记录会被泄露吗？',
                    a: '绝不泄露！我们执行严格的《DoD 5220.22-M》国际军工级多重数据擦除与覆写标准，即便使用专业级数据恢复工具也无法还原，全面筑牢您的个人隐私安全。'
                },
                {
                    q: '验机后的最终价格与估价不一致怎么办？',
                    a: '若质检结果与您自主勾选的选项存在出入，工程师会第一时间出具图文并茂的《专业质检报告》供您查阅并重新报价。若您不满意新报价，支持一键退货且免退回运费。'
                }
            ];
        }

        let currentHeroMode = cfgs['hero_mode'] || 'search';

        container.innerHTML = `
            <!-- 顶部标题与保存操作栏 -->
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:14px;">
                <div>
                    <h2 style="font-size:18px;font-weight:700;color:#0f172a;margin:0;">首页装修</h2>
                    <div style="font-size:13px;color:#64748b;margin-top:4px;">自定义前台首屏交互模式、搜索推荐词、核心保障指标及轮播大图</div>
                </div>
                <div style="display:flex;align-items:center;gap:10px;">
                    <a href="../../index.html" target="_blank" class="btn btn-outline" style="font-size:13px;display:inline-flex;align-items:center;gap:6px;text-decoration:none;">
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                        预览前台首页
                    </a>
                    <button type="button" class="btn btn-primary" id="btn-save-all-decoration" style="font-size:13px;font-weight:600;display:inline-flex;align-items:center;gap:6px;">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>
                        保存全部装修配置
                    </button>
                </div>
            </div>

            <div class="card" style="padding:22px;">
                <!-- 导航二级选项卡 -->
                <div class="settings-tabs-header" id="dec-sub-tabs" style="margin-bottom:22px;">
                    <button type="button" class="settings-tab-btn active" data-target="dec-panel-mode">
                        首屏模式与标语
                    </button>
                    <button type="button" class="settings-tab-btn" data-target="dec-panel-tags">
                        热门搜索词 (<span id="dec-tags-count">${hotTags.length}</span>)
                    </button>
                    <button type="button" class="settings-tab-btn" data-target="dec-panel-metrics">
                        服务保障指标 (<span id="dec-metrics-count">${metrics.length}</span>)
                    </button>
                    <button type="button" class="settings-tab-btn" data-target="dec-panel-banners">
                        轮播大图 Banner (<span id="banner-count-text">${banners.length}</span>)
                    </button>
                    <button type="button" class="settings-tab-btn" data-target="dec-panel-faq">
                        常见问题解答 FAQ (<span id="dec-faq-count">${faqs.length}</span>)
                    </button>
                    <button type="button" class="settings-tab-btn" data-target="dec-panel-process">
                        服务流程 (3步)
                    </button>
                    <button type="button" class="settings-tab-btn" data-target="dec-panel-miniapp">
                        📱 小程序与移动端装修
                    </button>
                </div>

                <!-- ============================================== -->
                <!-- 子面板 1: 首屏展示模式与核心标语 -->
                <!-- ============================================== -->
                <div class="settings-panel active" id="dec-panel-mode">
                    <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:14px;display:flex;align-items:center;gap:6px;">
                        <span>首屏交互模式选择</span>
                    </div>

                    <!-- 模式选择卡片网格 -->
                    <div class="mode-select-grid">
                        <!-- 模式 A -->
                        <div class="mode-select-card ${currentHeroMode === 'search' ? 'active' : ''}" id="mode-card-search" onclick="window.selectHeroMode('search')">
                            <div>
                                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                                    <div style="display:flex;align-items:center;gap:8px;">
                                        <span class="badge" style="background:#eff6ff;color:#1d4ed8;font-size:11px;font-weight:700;padding:3px 8px;">模式 A</span>
                                        <strong style="font-size:15px;color:#0f172a;">极速搜索流</strong>
                                    </div>
                                    <span class="badge" style="background:#dcfce7;color:#15803d;font-size:11px;padding:3px 8px;font-weight:600;display:${currentHeroMode === 'search' ? 'inline-block' : 'none'};" id="badge-active-search">当前选用</span>
                                </div>
                                <p style="color:#64748b;font-size:12px;line-height:1.6;margin-bottom:12px;">
                                    居中大搜索框为核心驱动，搭配热门型号与信任指标背书。极速测算转化率高，推荐数码 3C、二手车等精准型号搜索业务。
                                </p>
                            </div>

                            <!-- 拟真前台小微缩预览 -->
                            <div class="mode-preview-box">
                                <div style="text-align:center;margin-bottom:8px;">
                                    <span style="display:inline-block;padding:2px 10px;background:#e2e8f0;border-radius:20px;font-size:10px;color:#475569;font-weight:600;">
                                        官方自营 · 顺丰免费上门 · 10秒快速估价
                                    </span>
                                </div>
                                <div style="background:#ffffff;border:1.5px solid #1e58ff;border-radius:24px;padding:4px 6px 4px 14px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 2px 8px rgba(30,88,255,0.08);max-width:320px;margin:0 auto 10px;">
                                    <span style="font-size:11px;color:#94a3b8;display:flex;align-items:center;gap:6px;">
                                        <svg viewBox="0 0 24 24" width="13" height="13" fill="#94a3b8"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                                        输入手机、数码或型号...
                                    </span>
                                    <span style="background:#1e58ff;color:#fff;border-radius:20px;padding:4px 10px;font-size:10px;font-weight:600;">
                                        立即估价
                                    </span>
                                </div>
                                <div style="display:flex;justify-content:center;gap:12px;font-size:10px;color:#64748b;flex-wrap:wrap;">
                                    <span>👜 累计120万+</span>
                                    <span>⏱️ 10秒测算</span>
                                    <span>🚚 顺丰包邮</span>
                                    <span>🛡️ 隐私销毁</span>
                                </div>
                            </div>
                        </div>

                        <!-- 模式 B -->
                        <div class="mode-select-card ${currentHeroMode === 'banner' ? 'active' : ''}" id="mode-card-banner" onclick="window.selectHeroMode('banner')">
                            <div>
                                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                                    <div style="display:flex;align-items:center;gap:8px;">
                                        <span class="badge" style="background:#fef3c7;color:#b45309;font-size:11px;font-weight:700;padding:3px 8px;">模式 B</span>
                                        <strong style="font-size:15px;color:#0f172a;">品牌画卷轮播流</strong>
                                    </div>
                                    <span class="badge" style="background:#dcfce7;color:#15803d;font-size:11px;padding:3px 8px;font-weight:600;display:${currentHeroMode === 'banner' ? 'inline-block' : 'none'};" id="badge-active-banner">当前选用</span>
                                </div>
                                <p style="color:#64748b;font-size:12px;line-height:1.6;margin-bottom:12px;">
                                    宽屏大幅商业轮播画卷，无缝嵌入极速悬浮估价卡。兼顾品牌视觉质感与便捷测算，推荐综合全品类、废品物资或强调品牌活动。
                                </p>
                            </div>

                            <!-- 拟真前台小微缩预览 -->
                            <div class="mode-preview-box">
                                <div style="background:linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);border-radius:8px;padding:12px 14px;color:#fff;position:relative;overflow:hidden;margin-bottom:8px;">
                                    <div style="font-size:10px;color:#93c5fd;font-weight:600;margin-bottom:2px;">官方保障 · 品牌直营</div>
                                    <div style="font-size:12px;font-weight:700;margin-bottom:4px;">全品类高价回收 · 顺丰免费上门</div>
                                    <div style="display:flex;justify-content:space-between;align-items:center;">
                                        <span style="font-size:9px;background:rgba(255,255,255,0.2);padding:2px 8px;border-radius:4px;">立即查看</span>
                                        <span style="font-size:8px;color:#cbd5e1;letter-spacing:2px;">● ○ ○</span>
                                    </div>
                                </div>
                                <div style="background:#ffffff;border:1px solid #bfdbfe;border-radius:8px;padding:8px 12px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 4px 10px rgba(0,0,0,0.04);">
                                    <span style="font-size:10px;color:#1e40af;font-weight:600;display:flex;align-items:center;gap:4px;">
                                        ⚡ 快速估价：
                                        <span style="color:#94a3b8;font-weight:normal;">输入型号...</span>
                                    </span>
                                    <span style="background:#2563eb;color:#fff;border-radius:4px;padding:2px 8px;font-size:9px;">测算</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <input type="hidden" id="dec-hero-mode" value="${currentHeroMode}">

                    <hr style="margin:24px 0;border:none;border-top:1px solid #f1f5f9;">

                    <!-- 首屏核心文案自定义 -->
                    <div style="margin-bottom:24px;">
                        <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:14px;">
                            首屏标语与文字配置
                        </div>

                        <!-- 官方保障背书小徽章 -->
                        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin-bottom:16px;">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                                <label style="font-size:13px;font-weight:700;color:#1e293b;display:flex;align-items:center;gap:6px;margin:0;">
                                    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#10b981;"></span>
                                    顶部保障背书小徽章
                                </label>
                                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;font-weight:600;color:#475569;margin:0;">
                                    <input type="checkbox" id="dec-badge-enabled" ${(cfgs['hero_badge_enabled'] ?? '1') !== '0' ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer;">
                                    开启徽章展示
                                </label>
                            </div>
                            <input type="text" id="dec-badge-text" class="form-control" value="${escapeHtml(cfgs['hero_badge_text'] || '官方自营 · 顺丰免费上门 · 10秒快速估价 · 秒级放款到账')}" placeholder="输入小徽章宣传标语">
                        </div>

                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
                            <div class="login-form-group">
                                <label style="font-size:13px;font-weight:600;color:#1e293b;">首屏核心大标题</label>
                                <input type="text" id="dec-hero-title" class="form-control" value="${escapeHtml(cfgs['hero_title'] || cfgs['banner_title'] || '全品类高价回收 · 10秒快速估价')}" placeholder="例如: 全品类高价回收 · 10秒快速估价">
                            </div>
                            <div class="login-form-group">
                                <label style="font-size:13px;font-weight:600;color:#1e293b;">搜索按钮文字</label>
                                <input type="text" id="dec-hero-btn-text" class="form-control" value="${escapeHtml(cfgs['hero_search_btn_text'] || '立即估价')}" placeholder="例如: 立即估价 / 快速测算 / 上门回收">
                            </div>
                        </div>

                        <div class="login-form-group" style="margin-bottom:0;">
                            <label style="font-size:13px;font-weight:600;color:#1e293b;">副标题与服务利益点说明</label>
                            <input type="text" id="dec-hero-subtitle" class="form-control" value="${escapeHtml(cfgs['hero_subtitle'] || cfgs['banner_subtitle'] || '官方标准透明报价 · 顺丰免费上门包邮 · 个人隐私安全清除')}" placeholder="例如: 官方标准透明报价 · 顺丰免费上门包邮 · 个人隐私安全清除">
                        </div>
                    </div>

                    <!-- Banner 轮播模式扩展设置 -->
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
                        <div style="font-size:13px;font-weight:700;color:#1e293b;margin-bottom:12px;">
                            轮播模式专属设置（模式 B 生效）
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                            <div class="login-form-group" style="margin:0;">
                                <label style="font-size:12px;color:#64748b;">自动轮播切换间隔 (秒)</label>
                                <input type="number" id="dec-banner-autoplay" class="form-control" min="2" max="15" value="${cfgs['hero_banner_autoplay'] || 4}">
                            </div>
                            <div class="login-form-group" style="margin:0;display:flex;align-items:center;">
                                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;font-weight:600;color:#334155;margin-top:18px;">
                                    <input type="checkbox" id="dec-banner-floating" ${(cfgs['hero_banner_floating_estimate'] ?? '1') !== '0' ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer;">
                                    在轮播图下方嵌入悬浮快速估价卡
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ============================================== -->
                <!-- 子面板 2: 热门搜索标签管理 (Hot Chips) -->
                <!-- ============================================== -->
                <div class="settings-panel" id="dec-panel-tags">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
                        <div>
                            <strong style="color:#0f172a;font-size:14px;">热门搜索推荐词</strong>
                            <p style="font-size:12px;color:#64748b;margin-top:2px;">展示在搜索框下方的热门机型或品类标签，用户点击可一键填入并触发快速估价搜索。</p>
                        </div>
                        <div style="display:flex;gap:8px;">
                            <button type="button" class="btn btn-outline" id="btn-reset-default-tags" style="font-size:12px;">恢复推荐默认</button>
                            <button type="button" class="btn btn-primary" id="btn-add-hot-tag" style="font-size:12px;">+ 添加搜索词</button>
                        </div>
                    </div>

                    <!-- 动态热词列表 -->
                    <div id="dec-hot-tags-list" style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px;">
                        <!-- 动态渲染热词条目 -->
                    </div>
                </div>

                <!-- ============================================== -->
                <!-- 子面板 3: 核心承诺与信任指标 (Metrics Grid) -->
                <!-- ============================================== -->
                <div class="settings-panel" id="dec-panel-metrics">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
                        <div>
                            <strong style="color:#0f172a;font-size:14px;">服务保障指标卡片</strong>
                            <p style="font-size:12px;color:#64748b;margin-top:2px;">首屏底部的核心背书数据墙，展现回收规模、测算效率、运费政策与安全隐私保障（建议 4~6 项）。</p>
                        </div>
                        <button type="button" class="btn btn-primary" id="btn-add-metric-card" style="font-size:12px;">+ 添加保障指标</button>
                    </div>

                    <div id="dec-metrics-list" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:16px;margin-bottom:20px;">
                        <!-- 动态渲染指标卡片 -->
                    </div>
                </div>

                <!-- ============================================== -->
                <!-- 子面板 4: 首页轮播 Banner 广告管理 -->
                <!-- ============================================== -->
                <div class="settings-panel" id="dec-panel-banners">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
                        <div>
                            <strong style="color:#0f172a;font-size:14px;">轮播大图 Banner 画卷 (共 <span id="banner-count-text-panel">${banners.length}</span> 条)</strong>
                            <p style="font-size:12px;color:#64748b;margin-top:2px;">支持 PC 宽屏（建议 1920x500 或 1200x500）与手机移动端独立切片图自适应。</p>
                        </div>
                        <button type="button" class="btn btn-primary" id="btn-open-create-banner" style="font-size:13px;font-weight:600;display:inline-flex;align-items:center;gap:6px;">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                            新增轮播大图
                        </button>
                    </div>

                    <div id="dec-banners-container" style="display:flex;flex-direction:column;gap:14px;margin-bottom:20px;">
                        <!-- 动态渲染 Banner 列表 -->
                    </div>
                </div>

                <!-- ============================================== -->
                <!-- 子面板 5: 小程序与移动端全套个性化装修 -->
                <!-- ============================================== -->
                <div class="settings-panel" id="dec-panel-miniapp">
                    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:16px 20px;margin-bottom:24px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
                        <div>
                            <div style="font-weight:700;color:#1e40af;font-size:14px;display:flex;align-items:center;gap:6px;">
                                <span>📱 微信小程序与移动 H5 端专属装修</span>
                                <span class="badge" style="background:#2563eb;color:#fff;font-size:11px;padding:2px 8px;border-radius:12px;">实时同步</span>
                            </div>
                            <div style="font-size:12px;color:#3b82f6;margin-top:4px;">
                                在此自定义小程序端首页 Banner 标语、品类专区、四大保障服务、底部原生 TabBar 菜单文案及客服平台说明。
                            </div>
                        </div>
                        <button type="button" class="btn btn-primary btn-save-miniapp-quick" style="font-size:13px;font-weight:600;">
                            保存小程序与移动端配置
                        </button>
                    </div>

                    <!-- 区块 1: 首页 Hero 标语 -->
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px 20px;margin-bottom:20px;">
                        <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:14px;display:flex;align-items:center;gap:8px;">
                            <span style="width:4px;height:16px;background:#1e58ff;border-radius:2px;display:inline-block;"></span>
                            <span>首页宣传大标语 (Hero Card)</span>
                        </div>
                        <div class="login-form-group">
                            <label style="font-weight:600;font-size:13px;">顶部宣传小徽标 (Tag)</label>
                            <input type="text" id="miniapp-hero-tag" class="form-control" value="${escapeHtml(cfgs['miniapp_hero_tag'] || '启灵高价回收 · 官方验机')}" placeholder="如: 启灵高价回收 · 官方验机">
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:12px;">
                            <div class="login-form-group">
                                <label style="font-weight:600;font-size:13px;">核心宣传大标题 (Title)</label>
                                <input type="text" id="miniapp-hero-title" class="form-control" value="${escapeHtml(cfgs['miniapp_hero_title'] || '旧机别放着，立即变现')}" placeholder="如: 旧机别放着，立即变现">
                            </div>
                            <div class="login-form-group">
                                <label style="font-weight:600;font-size:13px;">副标题与承诺短语 (Subtitle)</label>
                                <input type="text" id="miniapp-hero-subtitle" class="form-control" value="${escapeHtml(cfgs['miniapp_hero_subtitle'] || '顺丰包邮 · 隐私深度清除 · 质检一致当天打款')}" placeholder="如: 顺丰包邮 · 隐私深度清除 · 质检一致当天打款">
                            </div>
                        </div>
                    </div>

                    <!-- 区块 2: 品类专区设置 -->
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px 20px;margin-bottom:20px;">
                        <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:14px;display:flex;align-items:center;gap:8px;">
                            <span style="width:4px;height:16px;background:#10b981;border-radius:2px;display:inline-block;"></span>
                            <span>首页分类专区设置 (Category Section)</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:20px;margin-bottom:14px;">
                            <label style="display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:600;cursor:pointer;">
                                <input type="checkbox" id="miniapp-category-enabled" ${cfgs['miniapp_category_enabled'] !== '0' ? 'checked' : ''} style="width:16px;height:16px;accent-color:#10b981;">
                                在首页启用品类展示专区
                            </label>
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                            <div class="login-form-group">
                                <label style="font-weight:600;font-size:13px;">品类区域大标题</label>
                                <input type="text" id="miniapp-category-title" class="form-control" value="${escapeHtml(cfgs['miniapp_category_title'] || '全品类数码回收')}" placeholder="如: 全品类数码回收">
                            </div>
                            <div class="login-form-group">
                                <label style="font-weight:600;font-size:13px;">首页最多展示品类数量</label>
                                <input type="number" id="miniapp-category-limit" class="form-control" value="${escapeHtml(cfgs['miniapp_category_limit'] || '10')}" min="2" max="20">
                            </div>
                        </div>
                    </div>

                    <!-- 区块 3: 核心服务保障 -->
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px 20px;margin-bottom:20px;">
                        <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:14px;display:flex;align-items:center;gap:8px;">
                            <span style="width:4px;height:16px;background:#f59e0b;border-radius:2px;display:inline-block;"></span>
                            <span>四大核心服务保障 (Service Guarantee)</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:20px;margin-bottom:14px;">
                            <label style="display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:600;cursor:pointer;">
                                <input type="checkbox" id="miniapp-guarantee-enabled" ${cfgs['miniapp_guarantee_enabled'] !== '0' ? 'checked' : ''} style="width:16px;height:16px;accent-color:#f59e0b;">
                                首页启用核心服务保障栏
                            </label>
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
                            <div class="login-form-group">
                                <label style="font-weight:600;font-size:13px;">保障项一文案</label>
                                <input type="text" id="miniapp-guarantee-1" class="form-control" value="${escapeHtml(cfgs['miniapp_guarantee_1'] || '隐私彻底清除')}" placeholder="如: 隐私彻底清除">
                            </div>
                            <div class="login-form-group">
                                <label style="font-weight:600;font-size:13px;">保障项二文案</label>
                                <input type="text" id="miniapp-guarantee-2" class="form-control" value="${escapeHtml(cfgs['miniapp_guarantee_2'] || '顺丰双向包邮')}" placeholder="如: 顺丰双向包邮">
                            </div>
                            <div class="login-form-group">
                                <label style="font-weight:600;font-size:13px;">保障项三文案</label>
                                <input type="text" id="miniapp-guarantee-3" class="form-control" value="${escapeHtml(cfgs['miniapp_guarantee_3'] || '验机极速放款')}" placeholder="如: 验机极速放款">
                            </div>
                            <div class="login-form-group">
                                <label style="font-weight:600;font-size:13px;">保障项四文案</label>
                                <input type="text" id="miniapp-guarantee-4" class="form-control" value="${escapeHtml(cfgs['miniapp_guarantee_4'] || '7天估价锁定')}" placeholder="如: 7天估价锁定">
                            </div>
                        </div>
                    </div>

                    <!-- 区块 4: 底部原生 TabBar 导航文案 -->
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px 20px;margin-bottom:20px;">
                        <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:14px;display:flex;align-items:center;gap:8px;">
                            <span style="width:4px;height:16px;background:#8b5cf6;border-radius:2px;display:inline-block;"></span>
                            <span>底部原生 TabBar 菜单文案自定义</span>
                        </div>
                        <p style="font-size:12px;color:#64748b;margin-bottom:14px;">已由系统配置精美高清矢量图标，在此可自定义 4 个底部导航栏的显示名称。</p>
                        <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:14px;">
                            <div class="login-form-group">
                                <label style="font-weight:600;font-size:13px;">Tab 1 (首页)</label>
                                <input type="text" id="miniapp-tab-home-name" class="form-control" value="${escapeHtml(cfgs['miniapp_tab_home_name'] || '首页')}" placeholder="默认: 首页">
                            </div>
                            <div class="login-form-group">
                                <label style="font-weight:600;font-size:13px;">Tab 2 (估价分类)</label>
                                <input type="text" id="miniapp-tab-estimate-name" class="form-control" value="${escapeHtml(cfgs['miniapp_tab_estimate_name'] || '估价回收')}" placeholder="默认: 估价回收">
                            </div>
                            <div class="login-form-group">
                                <label style="font-weight:600;font-size:13px;">Tab 3 (订单列表)</label>
                                <input type="text" id="miniapp-tab-order-name" class="form-control" value="${escapeHtml(cfgs['miniapp_tab_order_name'] || '订单明细')}" placeholder="默认: 订单明细">
                            </div>
                            <div class="login-form-group">
                                <label style="font-weight:600;font-size:13px;">Tab 4 (个人中心)</label>
                                <input type="text" id="miniapp-tab-user-name" class="form-control" value="${escapeHtml(cfgs['miniapp_tab_user_name'] || '我的')}" placeholder="默认: 我的">
                            </div>
                        </div>
                    </div>

                    <!-- 区块 5: 客服电话与平台说明 -->
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px 20px;margin-bottom:20px;">
                        <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:14px;display:flex;align-items:center;gap:8px;">
                            <span style="width:4px;height:16px;background:#06b6d4;border-radius:2px;display:inline-block;"></span>
                            <span>客服服务与平台说明弹窗配置</span>
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
                            <div class="login-form-group">
                                <label style="font-weight:600;font-size:13px;">客服联系项名称</label>
                                <input type="text" id="miniapp-service-tel-title" class="form-control" value="${escapeHtml(cfgs['miniapp_service_tel_title'] || '官方客服热线')}" placeholder="如: 官方客服热线">
                            </div>
                            <div class="login-form-group">
                                <label style="font-weight:600;font-size:13px;">客服热线电话号码</label>
                                <input type="text" id="miniapp-service-tel" class="form-control" value="${escapeHtml(cfgs['miniapp_service_tel'] || cfgs['service_tel'] || '400-800-8888')}" placeholder="如: 400-800-8888">
                            </div>
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                            <div class="login-form-group">
                                <label style="font-weight:600;font-size:13px;">隐私保障弹窗说明标题</label>
                                <input type="text" id="miniapp-privacy-title" class="form-control" value="${escapeHtml(cfgs['miniapp_privacy_title'] || '隐私安全彻底清除保障')}" placeholder="如: 隐私安全彻底清除保障">
                                <label style="font-weight:600;font-size:13px;margin-top:10px;display:block;">隐私保障详细说明内容</label>
                                <textarea id="miniapp-privacy-content" class="form-control" rows="3" placeholder="请输入隐私清除流程与安全背书说明">${escapeHtml(cfgs['miniapp_privacy_content'] || '平台收到设备后，工程师将使用专业数据清除技术对设备进行全面清理，杜绝任何个人隐私泄露隐患。')}</textarea>
                            </div>
                            <div class="login-form-group">
                                <label style="font-weight:600;font-size:13px;">关于我们弹窗标题</label>
                                <input type="text" id="miniapp-about-title" class="form-control" value="${escapeHtml(cfgs['miniapp_about_title'] || '关于启灵同城服务')}" placeholder="如: 关于启灵同城服务">
                                <label style="font-weight:600;font-size:13px;margin-top:10px;display:block;">关于我们介绍内容</label>
                                <textarea id="miniapp-about-content" class="form-control" rows="3" placeholder="请输入平台简介或企业使命">${escapeHtml(cfgs['miniapp_about_content'] || '高价回收 · 顺丰包邮 · 极速质检 · 款项极速到账。')}</textarea>
                            </div>
                        </div>
                    </div>

                    <div style="text-align:right;">
                        <button type="button" class="btn btn-primary btn-save-miniapp-quick" style="padding:10px 24px;font-size:14px;font-weight:600;">
                            保存小程序与移动端配置
                        </button>
                    </div>
                </div>

                <!-- ============================================== -->
                <!-- 子面板 5: 首页底部常见问题解答 FAQ -->
                <!-- ============================================== -->
                <div class="settings-panel" id="dec-panel-faq">
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px 20px;margin-bottom:20px;">
                        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
                            <div>
                                <h3 style="font-size:15px;font-weight:700;color:#0f172a;margin:0 0 4px 0;">首页底部 FAQ 问答模块配置</h3>
                                <p style="font-size:12px;color:#64748b;margin:0;">官网首页底部展示的高频常见问题与官方解答，解答客户顾虑，提升信任感与下单转化率。</p>
                            </div>
                            <div style="display:flex;align-items:center;gap:10px;">
                                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:600;font-size:13px;color:#1e293b;">
                                    <input type="checkbox" id="dec-faq-enabled" style="width:18px;height:18px;" ${cfgs['home_faq_enabled'] === '0' ? '' : 'checked'}>
                                    启用首页底部 FAQ 模块展示
                                </label>
                            </div>
                        </div>

                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                            <div>
                                <label style="font-size:12px;font-weight:600;color:#334155;margin-bottom:6px;display:block;">模块大标题</label>
                                <input type="text" class="form-control" id="dec-faq-title" value="${escapeHtml(cfgs['home_faq_title'] || '回收常见问题解答')}" placeholder="例如: 回收常见问题解答">
                            </div>
                            <div>
                                <label style="font-size:12px;font-weight:600;color:#334155;margin-bottom:6px;display:block;">模块副标题说明</label>
                                <input type="text" class="form-control" id="dec-faq-subtitle" value="${escapeHtml(cfgs['home_faq_subtitle'] || '快速了解寄件、验机、放款及隐私安全的每一处贴心细节')}" placeholder="例如: 快速了解寄件、验机、放款及隐私安全的每一处贴心细节">
                            </div>
                        </div>
                    </div>

                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                        <div style="font-size:14px;font-weight:700;color:#0f172a;">
                            问答条目列表 (<span id="dec-faq-count-panel">${faqs.length}</span>/12)
                        </div>
                        <button type="button" class="btn btn-outline" id="btn-add-faq-item" style="font-size:12px;display:inline-flex;align-items:center;gap:6px;">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                            添加问答条目
                        </button>
                    </div>

                    <div id="dec-faq-list" style="display:flex;flex-direction:column;gap:14px;margin-bottom:20px;">
                        <!-- 动态渲染 FAQ 问答列表 -->
                    </div>

                    <div style="text-align:right;">
                        <button type="button" class="btn btn-primary btn-save-faq-quick" style="padding:10px 24px;font-size:14px;font-weight:600;">
                            保存 FAQ 常见问答配置
                        </button>
                    </div>
                </div>

                <!-- ============================================== -->
                <!-- 子面板 6: 首页 3 步极速回收服务流程 -->
                <!-- ============================================== -->
                <div class="settings-panel" id="dec-panel-process">
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px 20px;margin-bottom:20px;">
                        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
                            <div>
                                <h3 style="font-size:15px;font-weight:700;color:#0f172a;margin:0 0 4px 0;">首页 3 步极速回收服务流程模块</h3>
                                <p style="font-size:12px;color:#64748b;margin:0;">在官网首页向用户清晰展示核心交割服务链路（估价、寄件/上门、质检放款），支持任意自定义文案与启停控制。</p>
                            </div>
                            <div style="display:flex;align-items:center;gap:10px;">
                                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:600;font-size:13px;color:#1e293b;">
                                    <input type="checkbox" id="dec-process-enabled" style="width:18px;height:18px;" ${cfgs['home_process_enabled'] === '0' ? '' : 'checked'}>
                                    启用首页 3 步流程展示
                                </label>
                            </div>
                        </div>

                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                            <div>
                                <label style="font-size:12px;font-weight:600;color:#334155;margin-bottom:6px;display:block;">流程大标题</label>
                                <input type="text" class="form-control" id="dec-process-title" value="${escapeHtml(cfgs['home_process_title'] || '简单3步 · 闲置极速变现')}" placeholder="例如: 简单3步 · 闲置极速变现">
                            </div>
                            <div>
                                <label style="font-size:12px;font-weight:600;color:#334155;margin-bottom:6px;display:block;">流程副标题说明</label>
                                <input type="text" class="form-control" id="dec-process-subtitle" value="${escapeHtml(cfgs['home_process_subtitle'] || '顺丰免费上门 / 官方专业质检 / 确认后秒级极速放款')}" placeholder="例如: 顺丰免费上门 / 官方专业质检 / 确认后秒级极速放款">
                            </div>
                        </div>
                    </div>

                    <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:14px;">
                        3 个服务步骤详情自定义
                    </div>

                    <div style="display:flex;flex-direction:column;gap:14px;margin-bottom:20px;">
                        <!-- 步骤 01 -->
                        <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
                            <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                                <span style="display:inline-block;padding:2px 8px;border-radius:4px;background:#eff6ff;color:#2563eb;font-size:12px;font-weight:700;">步骤 01</span>
                                <strong style="font-size:13px;color:#1e293b;">第一步：在线估价</strong>
                            </div>
                            <div style="display:grid;grid-template-columns:1fr 2fr;gap:14px;">
                                <div>
                                    <label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">步骤标题:</label>
                                    <input type="text" class="form-control" id="dec-step1-title" value="${escapeHtml(cfgs['home_process_step1_title'] || '在线智能精准估价')}" placeholder="如: 在线智能精准估价">
                                </div>
                                <div>
                                    <label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">步骤说明内容:</label>
                                    <input type="text" class="form-control" id="dec-step1-desc" value="${escapeHtml(cfgs['home_process_step1_desc'] || '快速勾选机况成色，系统自动匹配最新市场行情价，满意后再提交。')}" placeholder="请输入步骤说明文案">
                                </div>
                            </div>
                        </div>

                        <!-- 步骤 02 -->
                        <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
                            <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                                <span style="display:inline-block;padding:2px 8px;border-radius:4px;background:#f0f9ff;color:#0284c7;font-size:12px;font-weight:700;">步骤 02</span>
                                <strong style="font-size:13px;color:#1e293b;">第二步：履约交付</strong>
                            </div>
                            <div style="display:grid;grid-template-columns:1fr 2fr;gap:14px;">
                                <div>
                                    <label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">步骤标题:</label>
                                    <input type="text" class="form-control" id="dec-step2-title" value="${escapeHtml(cfgs['home_process_step2_title'] || '顺丰免费上门 · 包邮')}" placeholder="如: 顺丰免费上门 · 包邮">
                                </div>
                                <div>
                                    <label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">步骤说明内容:</label>
                                    <input type="text" class="form-control" id="dec-step2-desc" value="${escapeHtml(cfgs['home_process_step2_desc'] || '顺丰小哥免费上门当面装箱封签，全国往返双向包邮且全程保价，您无需支付任何运费。')}" placeholder="请输入步骤说明文案">
                                </div>
                            </div>
                        </div>

                        <!-- 步骤 03 -->
                        <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
                            <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                                <span style="display:inline-block;padding:2px 8px;border-radius:4px;background:#ecfdf5;color:#10b981;font-size:12px;font-weight:700;">步骤 03</span>
                                <strong style="font-size:13px;color:#1e293b;">第三步：验机放款</strong>
                            </div>
                            <div style="display:grid;grid-template-columns:1fr 2fr;gap:14px;">
                                <div>
                                    <label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">步骤标题:</label>
                                    <input type="text" class="form-control" id="dec-step3-title" value="${escapeHtml(cfgs['home_process_step3_title'] || '官方质检 · 秒级放款')}" placeholder="如: 官方质检 · 秒级放款">
                                </div>
                                <div>
                                    <label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">步骤说明内容:</label>
                                    <input type="text" class="form-control" id="dec-step3-desc" value="${escapeHtml(cfgs['home_process_step3_desc'] || '全程无死角高清监控录像验机，绝不恶意压价；确认价格后，微信或支付宝秒级直达账户。')}" placeholder="请输入步骤说明文案">
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style="text-align:right;">
                        <button type="button" class="btn btn-primary btn-save-process-quick" style="padding:10px 24px;font-size:14px;font-weight:600;">
                            保存 3 步服务流程配置
                        </button>
                    </div>
                </div>
            </div>
        `;

        // ==========================================
        // 绑定二级分类 Tab 选项卡切换
        // ==========================================
        const subTabs = container.querySelectorAll('#dec-sub-tabs .settings-tab-btn');
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

        // 首屏展示模式切换响应
        window.selectHeroMode = function(mode) {
            const modeInp = document.getElementById('dec-hero-mode');
            if (modeInp) modeInp.value = mode;
            const cardSearch = document.getElementById('mode-card-search');
            const cardBanner = document.getElementById('mode-card-banner');
            const badgeSearch = document.getElementById('badge-active-search');
            const badgeBanner = document.getElementById('badge-active-banner');

            if (mode === 'search') {
                cardSearch?.classList.add('active');
                cardBanner?.classList.remove('active');
                if (badgeSearch) badgeSearch.style.display = 'inline-block';
                if (badgeBanner) badgeBanner.style.display = 'none';
            } else {
                cardBanner?.classList.add('active');
                cardSearch?.classList.remove('active');
                if (badgeBanner) badgeBanner.style.display = 'inline-block';
                if (badgeSearch) badgeSearch.style.display = 'none';
            }
        };

        // ==========================================
        // 渲染与操作热门搜索标签 (Hot Chips)
        // ==========================================
        function renderHotTagsList() {
            const wrap = document.getElementById('dec-hot-tags-list');
            const tagsCount = document.getElementById('dec-tags-count');
            if (tagsCount) tagsCount.innerText = hotTags.length;
            if (!wrap) return;

            if (hotTags.length === 0) {
                wrap.innerHTML = '<div style="padding:24px;text-align:center;color:#94a3b8;background:#f8fafc;border-radius:8px;">暂无热门搜索词，点击上方按钮新增</div>';
                return;
            }

            wrap.innerHTML = hotTags.map((tag, idx) => `
                <div style="display:flex;align-items:center;gap:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;">
                    <span style="font-size:12px;font-weight:700;color:#94a3b8;width:24px;">#${idx + 1}</span>
                    <div style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                        <div>
                            <input type="text" class="form-control hot-tag-label-input" data-idx="${idx}" value="${escapeHtml(tag.label)}" placeholder="前台显示标签 (如: iPhone 15 Pro)">
                        </div>
                        <div>
                            <input type="text" class="form-control hot-tag-keyword-input" data-idx="${idx}" value="${escapeHtml(tag.keyword)}" placeholder="触发搜索关键词 (如: iPhone 15 Pro)">
                        </div>
                    </div>
                    <div style="display:flex;gap:6px;">
                        <button type="button" class="btn btn-sm btn-outline btn-tag-up" data-idx="${idx}" ${idx === 0 ? 'disabled' : ''}>↑</button>
                        <button type="button" class="btn btn-sm btn-outline btn-tag-down" data-idx="${idx}" ${idx === hotTags.length - 1 ? 'disabled' : ''}>↓</button>
                        <button type="button" class="btn btn-sm btn-danger btn-tag-del" data-idx="${idx}">删除</button>
                    </div>
                </div>
            `).join('');

            // 监听输入修改
            wrap.querySelectorAll('.hot-tag-label-input').forEach(inp => {
                inp.addEventListener('input', function() {
                    const i = parseInt(this.getAttribute('data-idx'), 10);
                    if (hotTags[i]) hotTags[i].label = this.value.trim();
                });
            });
            wrap.querySelectorAll('.hot-tag-keyword-input').forEach(inp => {
                inp.addEventListener('input', function() {
                    const i = parseInt(this.getAttribute('data-idx'), 10);
                    if (hotTags[i]) hotTags[i].keyword = this.value.trim();
                });
            });

            // 移动与删除
            wrap.querySelectorAll('.btn-tag-up').forEach(btn => {
                btn.addEventListener('click', function() {
                    const i = parseInt(this.getAttribute('data-idx'), 10);
                    if (i > 0) {
                        const temp = hotTags[i];
                        hotTags[i] = hotTags[i - 1];
                        hotTags[i - 1] = temp;
                        renderHotTagsList();
                    }
                });
            });
            wrap.querySelectorAll('.btn-tag-down').forEach(btn => {
                btn.addEventListener('click', function() {
                    const i = parseInt(this.getAttribute('data-idx'), 10);
                    if (i < hotTags.length - 1) {
                        const temp = hotTags[i];
                        hotTags[i] = hotTags[i + 1];
                        hotTags[i + 1] = temp;
                        renderHotTagsList();
                    }
                });
            });
            wrap.querySelectorAll('.btn-tag-del').forEach(btn => {
                btn.addEventListener('click', function() {
                    const i = parseInt(this.getAttribute('data-idx'), 10);
                    hotTags.splice(i, 1);
                    renderHotTagsList();
                });
            });
        }

        renderHotTagsList();

        document.getElementById('btn-add-hot-tag')?.addEventListener('click', () => {
            hotTags.push({ label: '新搜索热词', keyword: '搜索词' });
            renderHotTagsList();
        });

        document.getElementById('btn-reset-default-tags')?.addEventListener('click', () => {
            hotTags = [
                { label: 'iPhone 15 Pro', keyword: 'iPhone 15 Pro' },
                { label: 'Mate 60 Pro', keyword: 'Mate 60 Pro' },
                { label: '小米 14', keyword: '小米14' },
                { label: 'MacBook Pro', keyword: 'MacBook' },
                { label: 'iPad Pro', keyword: 'iPad' }
            ];
            renderHotTagsList();
            SysUI.toast('已重置为系统默认推荐标签', 'info');
        });

        // ==========================================
        // 渲染与操作核心保障指标 (Metrics Grid)
        // ==========================================
        function renderMetricsList() {
            const wrap = document.getElementById('dec-metrics-list');
            const metricsCount = document.getElementById('dec-metrics-count');
            if (metricsCount) metricsCount.innerText = metrics.length;
            if (!wrap) return;

            wrap.innerHTML = metrics.map((m, idx) => `
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                        <span style="font-size:13px;font-weight:700;color:#1e58ff;">保障指标 #${idx + 1}</span>
                        ${metrics.length > 2 ? `<button type="button" class="btn btn-sm btn-danger btn-metric-del" data-idx="${idx}" style="padding:2px 8px;font-size:11px;">移除</button>` : ''}
                    </div>
                    <div style="display:grid;grid-template-columns:110px 1fr;gap:12px;margin-bottom:10px;">
                        <div>
                            <label style="font-size:11px;color:#64748b;display:block;margin-bottom:4px;">图标类型</label>
                            <select class="form-control metric-icon-select" data-idx="${idx}" style="font-size:12px;height:36px;">
                                <option value="bag" ${m.icon === 'bag' ? 'selected' : ''}>👜 累计回收</option>
                                <option value="clock" ${m.icon === 'clock' ? 'selected' : ''}>⏱️ 智能核价</option>
                                <option value="truck" ${m.icon === 'truck' ? 'selected' : ''}>🚚 顺丰物流</option>
                                <option value="shield" ${m.icon === 'shield' ? 'selected' : ''}>🛡️ 隐私销毁</option>
                                <option value="lightning" ${m.icon === 'lightning' ? 'selected' : ''}>⚡ 秒级到账</option>
                                <option value="medal" ${m.icon === 'medal' ? 'selected' : ''}>🏅 官方认证</option>
                            </select>
                        </div>
                        <div>
                            <label style="font-size:11px;color:#64748b;display:block;margin-bottom:4px;">核心数值 (高亮大字)</label>
                            <input type="text" class="form-control metric-val-input" data-idx="${idx}" value="${escapeHtml(m.val)}" placeholder="如: 120万+ / 10秒 / 0元 / 100%">
                        </div>
                    </div>
                    <div>
                        <label style="font-size:11px;color:#64748b;display:block;margin-bottom:4px;">指标说明文案</label>
                        <input type="text" class="form-control metric-lbl-input" data-idx="${idx}" value="${escapeHtml(m.lbl)}" placeholder="如: 累计完成回收 / 快速精准估价">
                    </div>
                </div>
            `).join('');

            wrap.querySelectorAll('.metric-icon-select').forEach(sel => {
                sel.addEventListener('change', function() {
                    const i = parseInt(this.getAttribute('data-idx'), 10);
                    if (metrics[i]) metrics[i].icon = this.value;
                });
            });
            wrap.querySelectorAll('.metric-val-input').forEach(inp => {
                inp.addEventListener('input', function() {
                    const i = parseInt(this.getAttribute('data-idx'), 10);
                    if (metrics[i]) metrics[i].val = this.value.trim();
                });
            });
            wrap.querySelectorAll('.metric-lbl-input').forEach(inp => {
                inp.addEventListener('input', function() {
                    const i = parseInt(this.getAttribute('data-idx'), 10);
                    if (metrics[i]) metrics[i].lbl = this.value.trim();
                });
            });
            wrap.querySelectorAll('.btn-metric-del').forEach(btn => {
                btn.addEventListener('click', function() {
                    const i = parseInt(this.getAttribute('data-idx'), 10);
                    metrics.splice(i, 1);
                    renderMetricsList();
                });
            });
        }

        renderMetricsList();

        document.getElementById('btn-add-metric-card')?.addEventListener('click', () => {
            if (metrics.length >= 6) {
                SysUI.toast('核心承诺指标最多支持配置 6 个', 'warning');
                return;
            }
            metrics.push({ icon: 'medal', val: '99.9%', lbl: '客户好评满意度' });
            renderMetricsList();
        });

        // ==========================================
        // 渲染首页轮播 Banner 列表与操作
        // ==========================================
        function renderBannersList() {
            const wrap = document.getElementById('dec-banners-container');
            const countText = document.getElementById('banner-count-text');
            const countTextPanel = document.getElementById('banner-count-text-panel');
            if (countText) countText.innerText = banners.length;
            if (countTextPanel) countTextPanel.innerText = banners.length;
            if (!wrap) return;

            if (banners.length === 0) {
                wrap.innerHTML = `
                    <div style="padding:40px;text-align:center;color:#94a3b8;background:#f8fafc;border-radius:10px;border:1px dashed #cbd5e1;">
                        <p style="font-size:14px;margin-bottom:12px;">暂无轮播大图 Banner</p>
                        <button type="button" class="btn btn-primary" onclick="document.getElementById('btn-open-create-banner').click()">立即创建第一张 Banner</button>
                    </div>
                `;
                return;
            }

            wrap.innerHTML = banners.map(b => {
                const isEnabled = (parseInt(b.status, 10) === 1);
                let webJumpDesc = '🌐 网页端: ';
                if (b.link_type === 'category') {
                    const matchedCat = deviceCategories.find(c => String(c.id) === String(b.link_value));
                    webJumpDesc += `分类 (${matchedCat ? matchedCat.name : 'ID ' + (b.link_value || '全部')})`;
                } else if (b.link_type === 'device') {
                    webJumpDesc += `商品详情 (ID: ${b.link_value})`;
                } else if (b.link_type === 'action') {
                    let actName = b.link_value;
                    if (b.link_value === 'appointment') actName = '预约上门';
                    else if (b.link_value === 'coupon') actName = '领券中心';
                    else if (b.link_value === 'order') actName = '预约下单';
                    webJumpDesc += `动作 (${actName})`;
                } else if (b.link_type === 'url') {
                    webJumpDesc += `外部网址 (${b.link_value})`;
                } else {
                    webJumpDesc += '不跳转 (纯展示)';
                }

                let miniappJumpDesc = '📱 小程序: ';
                if (b.link_miniapp) {
                    miniappJumpDesc += `专属 [${b.link_miniapp}]`;
                } else {
                    if (b.link_type === 'category') {
                        const matchedCat = deviceCategories.find(c => String(c.id) === String(b.link_value));
                        miniappJumpDesc += `分类 (${matchedCat ? matchedCat.name : 'ID ' + (b.link_value || '全部')})`;
                    } else if (b.link_type === 'device') {
                        miniappJumpDesc += `机型估价页 (ID: ${b.link_value})`;
                    } else if (b.link_type === 'action') {
                        let actName = b.link_value;
                        if (b.link_value === 'appointment' || b.link_value === 'order') actName = '预约下单Tab';
                        else if (b.link_value === 'coupon') actName = '领券中心';
                        miniappJumpDesc += `动作 (${actName})`;
                    } else if (b.link_type === 'url') {
                        miniappJumpDesc += `外链 (弹窗提示并复制)`;
                    } else {
                        miniappJumpDesc += '不跳转 (纯展示)';
                    }
                }

                return `
                    <div class="banner-item-card" data-id="${b.id}">
                        <div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap;">
                            <!-- 缩略图预览 -->
                            <div style="width:180px;height:80px;border-radius:8px;overflow:hidden;background:#0f172a;flex-shrink:0;border:1px solid #cbd5e1;position:relative;">
                                <img src="${escapeHtml(b.image_pc || '/uploads/default/banner_digital.svg')}" style="width:100%;height:100%;object-fit:cover;" alt="Banner预览">
                                ${b.badge ? `<span style="position:absolute;top:6px;left:6px;background:rgba(0,0,0,0.7);color:#fff;font-size:10px;padding:2px 6px;border-radius:4px;">${escapeHtml(b.badge)}</span>` : ''}
                            </div>

                            <!-- 图文信息 -->
                            <div style="flex:1;min-width:240px;">
                                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
                                    <h4 style="font-size:15px;color:#0f172a;font-weight:700;margin:0;">${escapeHtml(b.title)}</h4>
                                    <span class="badge" style="background:#e0e7ff;color:#3730a3;font-size:11px;">排序: ${b.sort_order}</span>
                                    <span class="badge" style="background:${isEnabled ? '#dcfce7' : '#fee2e2'};color:${isEnabled ? '#15803d' : '#b91c1c'};font-size:11px;">
                                        ${isEnabled ? '已启用' : '已停用'}
                                    </span>
                                </div>
                                <div style="font-size:12px;color:#64748b;margin-bottom:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                                    ${escapeHtml(b.subtitle || '暂无副标题说明')}
                                </div>
                                <div style="font-size:11px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
                                    <span style="color:#64748b;">行动按钮: <strong style="color:#0f172a;">${escapeHtml(b.btn_text || '立即查看')}</strong></span>
                                    <span class="badge" style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;font-size:11px;padding:2px 8px;border-radius:4px;">${escapeHtml(webJumpDesc)}</span>
                                    <span class="badge" style="background:${b.link_miniapp ? '#ecfdf5' : '#f8fafc'};color:${b.link_miniapp ? '#047857' : '#475569'};border:1px solid ${b.link_miniapp ? '#a7f3d0' : '#e2e8f0'};font-size:11px;padding:2px 8px;border-radius:4px;">${escapeHtml(miniappJumpDesc)}</span>
                                </div>
                            </div>

                            <!-- 操作按钮组 -->
                            <div style="display:flex;gap:8px;align-items:center;">
                                <button type="button" class="btn btn-sm ${isEnabled ? 'btn-secondary' : 'btn-outline'} btn-toggle-banner" data-id="${b.id}" style="font-size:12px;">
                                    ${isEnabled ? '停用' : '启用'}
                                </button>
                                <button type="button" class="btn btn-sm btn-primary btn-edit-banner" data-id="${b.id}" style="font-size:12px;">
                                    编辑
                                </button>
                                <button type="button" class="btn btn-sm btn-danger btn-del-banner" data-id="${b.id}" style="font-size:12px;">
                                    删除
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            // 绑定启停
            wrap.querySelectorAll('.btn-toggle-banner').forEach(btn => {
                btn.addEventListener('click', async function() {
                    const id = parseInt(this.getAttribute('data-id'), 10);
                    const res = await api.post('/admin/banner/toggleStatus', { id });
                    if (res && res.code === 200) {
                        SysUI.toast('Banner状态切换成功', 'success');
                        const freshRes = await api.get('/admin/banner/list');
                        if (freshRes && freshRes.code === 200) {
                            banners = freshRes.data || [];
                            renderBannersList();
                        }
                    } else {
                        SysUI.toast(res ? res.msg : '切换失败', 'error');
                    }
                });
            });

            // 绑定编辑
            wrap.querySelectorAll('.btn-edit-banner').forEach(btn => {
                btn.addEventListener('click', function() {
                    const id = parseInt(this.getAttribute('data-id'), 10);
                    const item = banners.find(x => parseInt(x.id, 10) === id);
                    if (item) {
                        openBannerModal(item);
                    }
                });
            });

            // 绑定删除
            wrap.querySelectorAll('.btn-del-banner').forEach(btn => {
                btn.addEventListener('click', async function() {
                    const id = parseInt(this.getAttribute('data-id'), 10);
                    const confirmed = await SysUI.confirm('确定要删除此条轮播 Banner 吗？删除后前台将不再展示。', {
                        title: '删除确认',
                        confirmText: '确认删除',
                        isDanger: true
                    });
                    if (confirmed) {
                        const res = await api.post('/admin/banner/delete', { id });
                        if (res && res.code === 200) {
                            SysUI.toast('Banner已成功删除', 'success');
                            banners = banners.filter(x => parseInt(x.id, 10) !== id);
                            renderBannersList();
                        } else {
                            SysUI.toast(res ? res.msg : '删除失败', 'error');
                        }
                    }
                });
            });
        }

        renderBannersList();

        document.getElementById('btn-open-create-banner')?.addEventListener('click', () => {
            openBannerModal(null);
        });

        // ==========================================
        // Banner 编辑与新增模态框
        // ==========================================
        function openBannerModal(banner) {
            const isEdit = !!banner;
            const b = banner || {
                id: 0,
                title: '',
                subtitle: '',
                badge: '',
                image_pc: '/uploads/default/banner_digital.svg',
                image_m: '',
                link_type: 'none',
                link_value: '',
                link_miniapp: '',
                btn_text: '立即估价',
                sort_order: 100,
                status: 1
            };

            const modalHtml = `
                <div class="modal-overlay" id="modal-banner-wrap" style="z-index:9999;">
                    <div class="modal-card" style="max-width:720px;width:95%;">
                        <div class="modal-header">
                            <h3 style="margin:0;font-size:16px;font-weight:700;color:#0f172a;">${isEdit ? '编辑轮播 Banner' : '新增轮播 Banner'}</h3>
                            <button type="button" class="btn-close" id="btn-close-banner-modal" style="background:none;border:none;font-size:18px;cursor:pointer;color:#94a3b8;padding:4px 8px;">✕</button>
                        </div>
                        <div class="modal-body" style="padding:20px 24px;max-height:78vh;overflow-y:auto;">
                            <form id="form-banner-edit">
                                <input type="hidden" id="banner-id" value="${b.id}">

                                <div class="login-form-group">
                                    <label style="font-weight:600;"><span style="color:#ef4444;">*</span> 主宣传大标题</label>
                                    <input type="text" id="banner-title" class="form-control" value="${escapeHtml(b.title)}" placeholder="例如: 全品类高价回收 · 官方直营更放心" required>
                                </div>

                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:12px;">
                                    <div class="login-form-group">
                                        <label style="font-weight:600;">活动宣传小角标 (如: 官方保障 / 限时加价)</label>
                                        <input type="text" id="banner-badge" class="form-control" value="${escapeHtml(b.badge || '')}" placeholder="例如: 官方直营 / 限时补贴">
                                    </div>
                                    <div class="login-form-group">
                                        <label style="font-weight:600;">行动按钮文字</label>
                                        <input type="text" id="banner-btn-text" class="form-control" value="${escapeHtml(b.btn_text || '立即估价')}" placeholder="例如: 立即估价 / 呼叫上门 / 查看活动">
                                    </div>
                                </div>

                                <div class="login-form-group" style="margin-top:12px;">
                                    <label style="font-weight:600;">副标题与说明文案</label>
                                    <input type="text" id="banner-subtitle" class="form-control" value="${escapeHtml(b.subtitle || '')}" placeholder="例如: 官方标准透明报价 · 顺丰免费上门包邮 · 个人隐私安全清除">
                                </div>

                                <!-- PC端宽幅大图 -->
                                <div class="login-form-group" style="margin-top:14px;">
                                    <label style="font-weight:600;"><span style="color:#ef4444;">*</span> PC 端宽幅 Banner 图 (建议尺寸 1920x500 或 1200x500)</label>
                                    <div style="display:flex;align-items:center;gap:12px;background:#f8fafc;padding:12px;border:1px solid #e2e8f0;border-radius:8px;">
                                        <img id="banner-pc-preview" src="${escapeHtml(b.image_pc || '/uploads/default/banner_digital.svg')}" style="width:140px;height:58px;object-fit:cover;border-radius:6px;border:1px solid #cbd5e1;background:#fff;" alt="PC端预览">
                                        <div style="flex:1;display:flex;gap:8px;align-items:center;">
                                            <input type="text" id="banner-img-pc" class="form-control" style="font-size:12px;height:38px;" value="${escapeHtml(b.image_pc || '')}" placeholder="直接填写图片链接或点击右侧上传" required>
                                            <button type="button" class="btn btn-outline" id="btn-pick-banner-pc" style="height:38px;padding:0 14px;font-size:12px;white-space:nowrap;">从图库选</button>
                                            <label class="btn btn-secondary" style="height:38px;padding:0 14px;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;white-space:nowrap;margin:0;">
                                                上传
                                                <input type="file" id="banner-pc-file" accept="image/*" style="display:none;">
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <!-- 移动端手机图 -->
                                <div class="login-form-group" style="margin-top:14px;">
                                    <label style="font-weight:600;">移动端/手机切片图 (可选，未填时自动自适应使用 PC 图)</label>
                                    <div style="display:flex;align-items:center;gap:12px;background:#f8fafc;padding:12px;border:1px solid #e2e8f0;border-radius:8px;">
                                        <input type="text" id="banner-img-m" class="form-control" style="font-size:12px;height:38px;" value="${escapeHtml(b.image_m || '')}" placeholder="手机端专用竖版图URL (可选，建议 750x400)">
                                        <button type="button" class="btn btn-outline" id="btn-pick-banner-m" style="height:38px;padding:0 14px;font-size:12px;white-space:nowrap;">从图库选</button>
                                        <label class="btn btn-secondary" style="height:38px;padding:0 14px;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;white-space:nowrap;margin:0;">
                                            上传
                                             <input type="file" id="banner-m-file" accept="image/*" style="display:none;">
                                        </label>
                                    </div>
                                </div>

                                <!-- 双端跳转机制说明提示卡片 -->
                                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #3b82f6;border-radius:6px;padding:12px 14px;margin-top:16px;">
                                    <div style="font-weight:700;font-size:13px;color:#1e293b;margin-bottom:6px;display:flex;align-items:center;gap:6px;">
                                        <span>💡</span> 网页端 (PC/H5) 与微信小程序端跳转机制区别说明
                                    </div>
                                    <div style="font-size:12px;color:#475569;line-height:1.6;">
                                        <div>• <strong>🌐 网页端 (Web/PC/H5)</strong>：遵循下方的【通用跳转类型】与【目标值】，可定位分类、弹出估价或新开窗口打开外部网页。</div>
                                        <div>• <strong>📱 微信小程序端 (Mini Program)</strong>：优先执行【小程序端专属跳转】；若留空则自动智能适配通用跳转。注意：微信小程序受微信官方白名单机制限制，无法直接任意跳转未加业务域名的外部普通网页。</div>
                                    </div>
                                </div>

                                <!-- 通用跳转配置 -->
                                <div style="margin-top:14px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:14px;">
                                    <div style="font-weight:700;font-size:13px;color:#0f172a;margin-bottom:10px;display:flex;align-items:center;gap:6px;">
                                        <span style="color:#2563eb;">🌐</span> 基础通用跳转配置 (网页端核心 / 小程序智能兜底)
                                    </div>
                                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
                                        <div class="login-form-group">
                                            <label style="font-weight:600;">点击跳转类型</label>
                                            <select id="banner-link-type" class="form-control">
                                                <option value="none" ${b.link_type === 'none' ? 'selected' : ''}>纯展示 (双端均不跳转)</option>
                                                <option value="category" ${b.link_type === 'category' ? 'selected' : ''}>跳转到指定品类</option>
                                                <option value="device" ${b.link_type === 'device' ? 'selected' : ''}>直达特定机型详情</option>
                                                <option value="action" ${b.link_type === 'action' ? 'selected' : ''}>触发平台预置动作 (如预约/领券)</option>
                                                <option value="url" ${b.link_type === 'url' ? 'selected' : ''}>外部网页链接</option>
                                            </select>
                                        </div>
                                        <div class="login-form-group">
                                            <label style="font-weight:600;">跳转目标值</label>
                                            <input type="text" id="banner-link-value" class="form-control" value="${escapeHtml(b.link_value || '')}" placeholder="如分类ID/机型ID/动作标识/网址">
                                        </div>
                                    </div>
                                    <!-- 动态提示与快捷选择标签 -->
                                    <div id="banner-link-helper" style="margin-top:10px;font-size:12px;color:#64748b;line-height:1.5;"></div>
                                </div>

                                <!-- 小程序端专属跳转独立配置 -->
                                <div style="margin-top:14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px;">
                                    <div style="font-weight:700;font-size:13px;color:#166534;margin-bottom:6px;display:flex;align-items:center;gap:6px;">
                                        <span>📱</span> 微信小程序端专属跳转页面/行为 (可选独立配置)
                                    </div>
                                    <div style="font-size:12px;color:#15803d;margin-bottom:10px;line-height:1.5;">
                                        当网页端与小程序端需要不同的去向时在此配置（例如网页端跳外链宣传页，小程序端跳内部领券中心）。若留空，小程序将自动按上面的通用规则智能跳转。
                                    </div>
                                    <div class="login-form-group">
                                        <label style="font-weight:600;color:#166534;">小程序专属路径或动作</label>
                                        <input type="text" id="banner-link-miniapp" class="form-control" value="${escapeHtml(b.link_miniapp || '')}" placeholder="例如: /pages/coupon/index?tab=market 或 /pages/category/index">
                                    </div>
                                    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;align-items:center;">
                                        <span style="font-size:11px;color:#15803d;font-weight:600;">常用页面一键填入:</span>
                                        <button type="button" class="btn-miniapp-chip" data-path="/pages/index/index" style="background:#fff;border:1px solid #86efac;padding:3px 8px;border-radius:4px;font-size:11px;cursor:pointer;color:#15803d;">首页</button>
                                        <button type="button" class="btn-miniapp-chip" data-path="/pages/category/index" style="background:#fff;border:1px solid #86efac;padding:3px 8px;border-radius:4px;font-size:11px;cursor:pointer;color:#15803d;">全品类</button>
                                        <button type="button" class="btn-miniapp-chip" data-path="/pages/coupon/index?tab=market" style="background:#fff;border:1px solid #86efac;padding:3px 8px;border-radius:4px;font-size:11px;cursor:pointer;color:#15803d;">领券中心</button>
                                        <button type="button" class="btn-miniapp-chip" data-path="/pages/order/index" style="background:#fff;border:1px solid #86efac;padding:3px 8px;border-radius:4px;font-size:11px;cursor:pointer;color:#15803d;">预约下单</button>
                                        <button type="button" class="btn-miniapp-chip" data-path="/pages/order_list/index" style="background:#fff;border:1px solid #86efac;padding:3px 8px;border-radius:4px;font-size:11px;cursor:pointer;color:#15803d;">订单列表</button>
                                        <button type="button" class="btn-miniapp-chip" data-path="/pages/user/index" style="background:#fff;border:1px solid #86efac;padding:3px 8px;border-radius:4px;font-size:11px;cursor:pointer;color:#15803d;">个人中心</button>
                                        <button type="button" class="btn-miniapp-chip-clear" style="background:#fff;border:1px solid #fca5a5;padding:3px 8px;border-radius:4px;font-size:11px;cursor:pointer;color:#b91c1c;">清空(跟随通用)</button>
                                    </div>
                                </div>

                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px;">
                                    <div class="login-form-group">
                                        <label style="font-weight:600;">排序权重 (数值越小越靠前)</label>
                                        <input type="number" id="banner-sort-order" class="form-control" value="${b.sort_order || 100}">
                                    </div>
                                    <div class="login-form-group">
                                        <label style="font-weight:600;">发布状态</label>
                                        <select id="banner-status" class="form-control">
                                            <option value="1" ${parseInt(b.status, 10) === 1 ? 'selected' : ''}>立即启用展示</option>
                                            <option value="0" ${parseInt(b.status, 10) === 0 ? 'selected' : ''}>暂停下线</option>
                                        </select>
                                    </div>
                                </div>

                                <div style="margin-top:24px;display:flex;justify-content:flex-end;gap:12px;">
                                    <button type="button" class="btn btn-secondary" id="btn-cancel-banner-modal">取消</button>
                                    <button type="submit" class="btn btn-primary" id="btn-submit-banner">保存 Banner</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);
            const modalEl = document.getElementById('modal-banner-wrap');

            const closeModal = () => modalEl?.remove();
            document.getElementById('btn-close-banner-modal')?.addEventListener('click', closeModal);
            document.getElementById('btn-cancel-banner-modal')?.addEventListener('click', closeModal);

            // PC 图库选择
            document.getElementById('btn-pick-banner-pc')?.addEventListener('click', () => {
                if (typeof window.openMediaLibraryModal === 'function') {
                    window.openMediaLibraryModal({
                        title: '为 Banner 选择 PC 端大图',
                        onSelect: (url) => {
                            const inp = document.getElementById('banner-img-pc');
                            const prev = document.getElementById('banner-pc-preview');
                            if (inp) inp.value = url;
                            if (prev) prev.src = url;
                        }
                    });
                } else {
                    SysUI.toast('媒体库模块未就绪', 'warning');
                }
            });

            // 移动端图库选择
            document.getElementById('btn-pick-banner-m')?.addEventListener('click', () => {
                if (typeof window.openMediaLibraryModal === 'function') {
                    window.openMediaLibraryModal({
                        title: '为 Banner 选择移动端专用图',
                        onSelect: (url) => {
                            const inp = document.getElementById('banner-img-m');
                            if (inp) inp.value = url;
                        }
                    });
                } else {
                    SysUI.toast('媒体库模块未就绪', 'warning');
                }
            });

            // PC 本地直传
            document.getElementById('banner-pc-file')?.addEventListener('change', async function() {
                if (!this.files || this.files.length === 0) return;
                const fd = new FormData();
                fd.append('file', this.files[0]);
                SysUI.toast('正在上传图片...', 'info');
                const res = await api.upload('/admin/upload/image', fd);
                if (res && res.code === 200 && res.data && res.data.url) {
                    const inp = document.getElementById('banner-img-pc');
                    const prev = document.getElementById('banner-pc-preview');
                    if (inp) inp.value = res.data.url;
                    if (prev) prev.src = res.data.url;
                    SysUI.toast('PC端大图上传成功', 'success');
                } else {
                    SysUI.toast(res ? res.msg : '上传失败', 'error');
                }
            });

            // 移动端本地直传
            document.getElementById('banner-m-file')?.addEventListener('change', async function() {
                if (!this.files || this.files.length === 0) return;
                const fd = new FormData();
                fd.append('file', this.files[0]);
                SysUI.toast('正在上传移动端图片...', 'info');
                const res = await api.upload('/admin/upload/image', fd);
                if (res && res.code === 200 && res.data && res.data.url) {
                    const inp = document.getElementById('banner-img-m');
                    if (inp) inp.value = res.data.url;
                    SysUI.toast('移动端图片上传成功', 'success');
                } else {
                    SysUI.toast(res ? res.msg : '上传失败', 'error');
                }
            });

            // 联动通用跳转辅助提示与快速选择标签
            function updateLinkHelper() {
                const helperEl = document.getElementById('banner-link-helper');
                const valInput = document.getElementById('banner-link-value');
                const type = document.getElementById('banner-link-type')?.value || 'none';
                if (!helperEl) return;

                if (type === 'none') {
                    helperEl.innerHTML = '<span style="color:#64748b;">🖼️ 纯大图视觉展示，用户点击网页端或小程序端 Banner 均不触发任何页面跳转。</span>';
                    if (valInput) valInput.placeholder = '无需填写目标值';
                } else if (type === 'category') {
                    let catChipsHtml = '';
                    if (deviceCategories && deviceCategories.length > 0) {
                        catChipsHtml = `
                            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;align-items:center;">
                                <span style="font-size:11px;color:#334155;font-weight:600;">点击快速填入分类:</span>
                                ${deviceCategories.map(c => `
                                    <button type="button" class="btn-cat-chip" data-id="${c.id}" style="background:#f1f5f9;border:1px solid #cbd5e1;padding:2px 7px;border-radius:4px;font-size:11px;cursor:pointer;color:#334155;">
                                        ${escapeHtml(c.name)} (ID: ${c.id})
                                    </button>
                                `).join('')}
                            </div>
                        `;
                    }
                    helperEl.innerHTML = `
                        <div style="color:#2563eb;">
                            📌 <strong>分类跳转</strong>：网页端点击后平滑滚动至对应分类；微信小程序端将切换至分类 Tab 并定位选中该分类。
                        </div>
                        ${catChipsHtml}
                    `;
                    if (valInput) valInput.placeholder = '请填写分类ID（例如 1）';

                    helperEl.querySelectorAll('.btn-cat-chip').forEach(btn => {
                        btn.addEventListener('click', function() {
                            if (valInput) valInput.value = this.getAttribute('data-id');
                        });
                    });
                } else if (type === 'device') {
                    helperEl.innerHTML = `
                        <div style="color:#2563eb;">
                            📌 <strong>机型直达</strong>：网页端点击后直接弹出该商品的极速估价窗口；微信小程序端将直接进入该机型的选项测算作答页。
                        </div>
                        <div style="color:#64748b;font-size:11px;margin-top:4px;">
                            请在目标值中填写机型的数字 ID（可在【机型管理】中查看各商品 ID）。
                        </div>
                    `;
                    if (valInput) valInput.placeholder = '请填写机型ID（例如 101）';
                } else if (type === 'action') {
                    helperEl.innerHTML = `
                        <div style="color:#2563eb;">
                            📌 <strong>触发动作</strong>：触发平台内置的快捷功能。请点击下方快捷标签填入动作标识：
                        </div>
                        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;align-items:center;">
                            <button type="button" class="btn-action-chip" data-act="appointment" style="background:#f1f5f9;border:1px solid #cbd5e1;padding:2px 7px;border-radius:4px;font-size:11px;cursor:pointer;color:#334155;">
                                📅 预约上门回收 (appointment)
                            </button>
                            <button type="button" class="btn-action-chip" data-act="coupon" style="background:#f1f5f9;border:1px solid #cbd5e1;padding:2px 7px;border-radius:4px;font-size:11px;cursor:pointer;color:#334155;">
                                🎫 领券中心 (coupon)
                            </button>
                            <button type="button" class="btn-action-chip" data-act="order" style="background:#f1f5f9;border:1px solid #cbd5e1;padding:2px 7px;border-radius:4px;font-size:11px;cursor:pointer;color:#334155;">
                                📋 预约下单页 (order)
                            </button>
                        </div>
                    `;
                    if (valInput) valInput.placeholder = '例如: appointment 或 coupon';

                    helperEl.querySelectorAll('.btn-action-chip').forEach(btn => {
                        btn.addEventListener('click', function() {
                            if (valInput) valInput.value = this.getAttribute('data-act');
                        });
                    });
                } else if (type === 'url') {
                    helperEl.innerHTML = `
                        <div style="color:#2563eb;">
                            📌 <strong>外部网页链接</strong>：网页端将在浏览器新窗口直接打开该网址。
                        </div>
                        <div style="color:#b45309;font-size:11px;margin-top:4px;line-height:1.5;">
                            ⚠️ <strong>小程序端注意</strong>：由于微信小程序官方安全规范限制，未配置业务域名的外部普通网址无法在小程序内直接打开。当用户在小程序端点击时，系统将弹出贴心提示框并支持用户一键复制该网址至剪贴板；若需让小程序跳转到特定页面，请在下方的【小程序端专属跳转】中单独指定原生页面路径。
                        </div>
                    `;
                    if (valInput) valInput.placeholder = '例如: https://www.example.com/activity';
                }
            }

            document.getElementById('banner-link-type')?.addEventListener('change', updateLinkHelper);
            updateLinkHelper();

            // 小程序专属路径快捷标签填入
            modalEl.querySelectorAll('.btn-miniapp-chip').forEach(btn => {
                btn.addEventListener('click', function() {
                    const inp = document.getElementById('banner-link-miniapp');
                    if (inp) inp.value = this.getAttribute('data-path');
                });
            });
            modalEl.querySelector('.btn-miniapp-chip-clear')?.addEventListener('click', function() {
                const inp = document.getElementById('banner-link-miniapp');
                if (inp) inp.value = '';
            });

            // 提交保存 Banner
            document.getElementById('form-banner-edit')?.addEventListener('submit', async function(e) {
                e.preventDefault();
                const savePayload = {
                    id: parseInt(document.getElementById('banner-id')?.value, 10) || 0,
                    title: document.getElementById('banner-title')?.value.trim() || '',
                    subtitle: document.getElementById('banner-subtitle')?.value.trim() || '',
                    badge: document.getElementById('banner-badge')?.value.trim() || '',
                    image_pc: document.getElementById('banner-img-pc')?.value.trim() || '',
                    image_m: document.getElementById('banner-img-m')?.value.trim() || '',
                    link_type: document.getElementById('banner-link-type')?.value || 'none',
                    link_value: document.getElementById('banner-link-value')?.value.trim() || '',
                    link_miniapp: document.getElementById('banner-link-miniapp')?.value.trim() || '',
                    btn_text: document.getElementById('banner-btn-text')?.value.trim() || '立即估价',
                    sort_order: parseInt(document.getElementById('banner-sort-order')?.value, 10) || 100,
                    status: parseInt(document.getElementById('banner-status')?.value, 10) || 1
                };

                const subBtn = document.getElementById('btn-submit-banner');
                if (subBtn) subBtn.disabled = true;

                const res = await api.post('/admin/banner/save', savePayload);
                if (subBtn) subBtn.disabled = false;

                if (res && res.code === 200) {
                    SysUI.toast('Banner 保存成功', 'success');
                    closeModal();
                    // 重新拉取列表刷新
                    const freshRes = await api.get('/admin/banner/list');
                    if (freshRes && freshRes.code === 200) {
                        banners = freshRes.data || [];
                        renderBannersList();
                    }
                } else {
                    SysUI.toast(res ? res.msg : '保存失败', 'error');
                }
            });
        }

        // ==========================================
        // 渲染首页常见问题 FAQ 列表与操作
        // ==========================================
        function renderFaqList() {
            const wrap = document.getElementById('dec-faq-list');
            const countBadge = document.getElementById('dec-faq-count');
            const countPanel = document.getElementById('dec-faq-count-panel');
            if (countBadge) countBadge.innerText = faqs.length;
            if (countPanel) countPanel.innerText = faqs.length;
            if (!wrap) return;

            if (faqs.length === 0) {
                wrap.innerHTML = '<div style="padding:30px;text-align:center;color:#94a3b8;background:#f8fafc;border-radius:8px;border:1px dashed #cbd5e1;">暂无问答条目，请点击上方“添加问答条目”新增</div>';
                return;
            }

            wrap.innerHTML = faqs.map((item, idx) => `
                <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                        <span style="font-size:13px;font-weight:700;color:#1e293b;display:flex;align-items:center;gap:6px;">
                            <span style="display:inline-block;width:22px;height:22px;line-height:22px;text-align:center;background:#eff6ff;color:#2563eb;border-radius:50%;font-size:12px;font-weight:700;">${idx + 1}</span>
                            问答条目 #${idx + 1}
                        </span>
                        <div style="display:flex;gap:6px;">
                            <button type="button" class="btn btn-sm btn-outline btn-faq-up" data-idx="${idx}" ${idx === 0 ? 'disabled' : ''} title="上移">↑</button>
                            <button type="button" class="btn btn-sm btn-outline btn-faq-down" data-idx="${idx}" ${idx === faqs.length - 1 ? 'disabled' : ''} title="下移">↓</button>
                            <button type="button" class="btn btn-sm btn-danger btn-faq-del" data-idx="${idx}">删除</button>
                        </div>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:10px;">
                        <div>
                            <label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">提问标题 (Q):</label>
                            <input type="text" class="form-control faq-q-input" data-idx="${idx}" value="${escapeHtml(item.q || '')}" placeholder="例如: 回收款项多久到账？">
                        </div>
                        <div>
                            <label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">解答内容 (A):</label>
                            <textarea class="form-control faq-a-input" data-idx="${idx}" rows="2" placeholder="请输入详尽友好的解答内容...">${escapeHtml(item.a || '')}</textarea>
                        </div>
                    </div>
                </div>
            `).join('');

            wrap.querySelectorAll('.faq-q-input').forEach(inp => {
                inp.addEventListener('input', function() {
                    const i = parseInt(this.getAttribute('data-idx'), 10);
                    if (faqs[i]) faqs[i].q = this.value.trim();
                });
            });
            wrap.querySelectorAll('.faq-a-input').forEach(inp => {
                inp.addEventListener('input', function() {
                    const i = parseInt(this.getAttribute('data-idx'), 10);
                    if (faqs[i]) faqs[i].a = this.value.trim();
                });
            });
            wrap.querySelectorAll('.btn-faq-up').forEach(btn => {
                btn.addEventListener('click', function() {
                    const i = parseInt(this.getAttribute('data-idx'), 10);
                    if (i > 0) {
                        const temp = faqs[i];
                        faqs[i] = faqs[i - 1];
                        faqs[i - 1] = temp;
                        renderFaqList();
                    }
                });
            });
            wrap.querySelectorAll('.btn-faq-down').forEach(btn => {
                btn.addEventListener('click', function() {
                    const i = parseInt(this.getAttribute('data-idx'), 10);
                    if (i < faqs.length - 1) {
                        const temp = faqs[i];
                        faqs[i] = faqs[i + 1];
                        faqs[i + 1] = temp;
                        renderFaqList();
                    }
                });
            });
            wrap.querySelectorAll('.btn-faq-del').forEach(btn => {
                btn.addEventListener('click', function() {
                    const i = parseInt(this.getAttribute('data-idx'), 10);
                    faqs.splice(i, 1);
                    renderFaqList();
                });
            });
        }

        renderFaqList();

        document.getElementById('btn-add-faq-item')?.addEventListener('click', () => {
            if (faqs.length >= 12) {
                SysUI.toast('FAQ 问答条目最多支持配置 12 条', 'warning');
                return;
            }
            faqs.push({
                q: '新常见问题',
                a: '请在此输入该问题的详细答复内容。'
            });
            renderFaqList();
        });

        // ==========================================
        // 全局保存全部首屏与小程序装修配置
        // ==========================================
        async function saveAllDecorationConfigs(sourceBtn) {
            const btn = sourceBtn || document.getElementById('btn-save-all-decoration');
            const originalText = btn ? btn.innerText : '保存全部装修配置';
            if (btn) {
                btn.disabled = true;
                btn.innerText = '正在保存配置...';
            }

            const payloadConfigs = {
                'hero_mode': document.getElementById('dec-hero-mode')?.value || 'search',
                'hero_badge_enabled': document.getElementById('dec-badge-enabled')?.checked ? '1' : '0',
                'hero_badge_text': document.getElementById('dec-badge-text')?.value.trim() || '',
                'hero_title': document.getElementById('dec-hero-title')?.value.trim() || '',
                'hero_subtitle': document.getElementById('dec-hero-subtitle')?.value.trim() || '',
                'hero_search_btn_text': document.getElementById('dec-hero-btn-text')?.value.trim() || '立即估价',
                'hero_banner_autoplay': document.getElementById('dec-banner-autoplay')?.value || '4',
                'hero_banner_floating_estimate': document.getElementById('dec-banner-floating')?.checked ? '1' : '0',
                'hero_hot_tags': JSON.stringify(hotTags),
                'hero_metrics': JSON.stringify(metrics),
                // 平滑兼容老字段
                'banner_title': document.getElementById('dec-hero-title')?.value.trim() || '',
                'banner_subtitle': document.getElementById('dec-hero-subtitle')?.value.trim() || '',

                // 首页常见问题解答 FAQ
                'home_faq_enabled': document.getElementById('dec-faq-enabled')?.checked ? '1' : '0',
                'home_faq_title': document.getElementById('dec-faq-title')?.value.trim() || '回收常见问题解答',
                'home_faq_subtitle': document.getElementById('dec-faq-subtitle')?.value.trim() || '',
                'home_faq_list': JSON.stringify(faqs),

                // 首页 3 步极速回收服务流程
                'home_process_enabled': document.getElementById('dec-process-enabled')?.checked ? '1' : '0',
                'home_process_title': document.getElementById('dec-process-title')?.value.trim() || '简单3步 · 闲置极速变现',
                'home_process_subtitle': document.getElementById('dec-process-subtitle')?.value.trim() || '顺丰免费上门 / 官方专业质检 / 确认后秒级极速放款',
                'home_process_step1_title': document.getElementById('dec-step1-title')?.value.trim() || '在线智能精准估价',
                'home_process_step1_desc': document.getElementById('dec-step1-desc')?.value.trim() || '',
                'home_process_step2_title': document.getElementById('dec-step2-title')?.value.trim() || '顺丰免费上门 · 包邮',
                'home_process_step2_desc': document.getElementById('dec-step2-desc')?.value.trim() || '',
                'home_process_step3_title': document.getElementById('dec-step3-title')?.value.trim() || '官方质检 · 秒级放款',
                'home_process_step3_desc': document.getElementById('dec-step3-desc')?.value.trim() || '',

                // 📱 小程序与移动端装修配置
                'miniapp_hero_tag': document.getElementById('miniapp-hero-tag')?.value.trim() || '',
                'miniapp_hero_title': document.getElementById('miniapp-hero-title')?.value.trim() || '',
                'miniapp_hero_subtitle': document.getElementById('miniapp-hero-subtitle')?.value.trim() || '',
                'miniapp_category_enabled': document.getElementById('miniapp-category-enabled')?.checked ? '1' : '0',
                'miniapp_category_title': document.getElementById('miniapp-category-title')?.value.trim() || '全品类数码回收',
                'miniapp_category_limit': document.getElementById('miniapp-category-limit')?.value.trim() || '10',
                'miniapp_guarantee_enabled': document.getElementById('miniapp-guarantee-enabled')?.checked ? '1' : '0',
                'miniapp_guarantee_1': document.getElementById('miniapp-guarantee-1')?.value.trim() || '隐私彻底清除',
                'miniapp_guarantee_2': document.getElementById('miniapp-guarantee-2')?.value.trim() || '顺丰双向包邮',
                'miniapp_guarantee_3': document.getElementById('miniapp-guarantee-3')?.value.trim() || '验机极速放款',
                'miniapp_guarantee_4': document.getElementById('miniapp-guarantee-4')?.value.trim() || '7天估价锁定',
                'miniapp_tab_home_name': document.getElementById('miniapp-tab-home-name')?.value.trim() || '首页',
                'miniapp_tab_estimate_name': document.getElementById('miniapp-tab-estimate-name')?.value.trim() || '估价回收',
                'miniapp_tab_order_name': document.getElementById('miniapp-tab-order-name')?.value.trim() || '订单明细',
                'miniapp_tab_user_name': document.getElementById('miniapp-tab-user-name')?.value.trim() || '我的',
                'miniapp_service_tel_title': document.getElementById('miniapp-service-tel-title')?.value.trim() || '官方客服热线',
                'miniapp_service_tel': document.getElementById('miniapp-service-tel')?.value.trim() || '400-800-8888',
                'miniapp_privacy_title': document.getElementById('miniapp-privacy-title')?.value.trim() || '隐私安全彻底清除保障',
                'miniapp_privacy_content': document.getElementById('miniapp-privacy-content')?.value.trim() || '',
                'miniapp_about_title': document.getElementById('miniapp-about-title')?.value.trim() || '关于启灵同城服务',
                'miniapp_about_content': document.getElementById('miniapp-about-content')?.value.trim() || ''
            };

            const res = await api.post('/admin/config/saveConfigs', { configs: payloadConfigs });
            if (btn) {
                btn.disabled = false;
                btn.innerText = originalText;
            }

            if (res && res.code === 200) {
                SysUI.toast('全套装修配置保存成功！Web与小程序端已即时同步生效', 'success');
            } else {
                SysUI.toast(res ? res.msg : '保存失败，请检查网络或参数', 'error');
            }
        }

        document.getElementById('btn-save-all-decoration')?.addEventListener('click', function() {
            saveAllDecorationConfigs(this);
        });

        container.querySelectorAll('.btn-save-miniapp-quick').forEach(btn => {
            btn.addEventListener('click', function() {
                saveAllDecorationConfigs(this);
            });
        });

        container.querySelectorAll('.btn-save-faq-quick').forEach(btn => {
            btn.addEventListener('click', function() {
                saveAllDecorationConfigs(this);
            });
        });

        container.querySelectorAll('.btn-save-process-quick').forEach(btn => {
            btn.addEventListener('click', function() {
                saveAllDecorationConfigs(this);
            });
        });
    }

    window.renderDecorationView = renderDecorationView;

})(window);
