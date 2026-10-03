/**
 * 启灵回收系统 - 小程序装修与移动端可视化配置
 * 包含小程序首页轮播、品类导航、服务保障、回收流程与个人中心配置
 */
(function (window) {
    'use strict';

    const SysUI = window.SysUI;
    const api = window.adminApi || window.api;
    const escapeHtml = window.escapeHtml || function (s) {
        if (!s) return '';
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };

    // 默认配置兜底基准
    const DEFAULT_CONFIGS = {
        miniapp_appid: '',
        miniapp_secret: '',
        miniapp_app_name: '启灵回收',
        miniapp_original_id: '',
        miniapp_wx_login_enabled: '1',
        miniapp_wx_phone_enabled: '1',
        miniapp_guest_appraisal: '1',
        miniapp_theme_color: '#1e58ff',
        miniapp_nav_title: '启灵专业数码回收',
        miniapp_nav_bg: 'gradient',
        miniapp_card_radius: '20',
        miniapp_search_placeholder: '搜索你想卖的手机 / 平板 / 电脑型号',
        miniapp_hero_enabled: '1',
        miniapp_hero_gradient: 'blue',
        miniapp_hero_tag: '启灵高价回收 · 官方验机',
        miniapp_hero_title: '旧机别放着，立即变现',
        miniapp_hero_subtitle: '顺丰包邮 · 隐私深度清除 · 质检一致当天打款',
        miniapp_category_enabled: '1',
        miniapp_category_title: '全品类数码回收',
        miniapp_category_limit: '10',
        miniapp_category_cols: '5',
        miniapp_guarantee_enabled: '1',
        miniapp_guarantee_1: '隐私彻底清除',
        miniapp_guarantee_2: '顺丰双向包邮',
        miniapp_guarantee_3: '验机极速放款',
        miniapp_guarantee_4: '7天估价锁定',
        miniapp_process_enabled: '1',
        miniapp_process_title: '简单三步 · 轻松变现',
        miniapp_step_1_title: '在线估价',
        miniapp_step_1_desc: '30秒选项测机',
        miniapp_step_2_title: '顺丰寄件/上门',
        miniapp_step_2_desc: '全程包邮免密',
        miniapp_step_3_title: '验机打款',
        miniapp_step_3_desc: '直达微信零钱',
        miniapp_hot_title: '大家都在卖 · 热门回收机型',
        miniapp_hot_limit: '5',
        miniapp_coupon_section_enabled: '1',
        miniapp_coupon_sec_title: '回收加价补贴专区',
        miniapp_coupon_sec_tag: '最高立补 ¥300',
        miniapp_coupon_float_enabled: '1',
        coupon_float_subtitle: '领¥300补贴',
        miniapp_tab_home_name: '首页',
        miniapp_tab_estimate_name: '估价回收',
        miniapp_tab_order_name: '订单明细',
        miniapp_tab_user_name: '我的',
        miniapp_service_tel_title: '官方客服热线',
        miniapp_service_tel: '400-800-8888',
        miniapp_service_hours: '周一至周日 09:00 - 21:00',
        miniapp_privacy_title: '隐私清除保障说明',
        miniapp_privacy_content: '平台采用专业数据擦除技术，对设备存储介质进行全盘覆写清除，出具《隐私数据清除报告》，杜绝个人数据残留，保障您的个人隐私安全。',
        miniapp_about_title: '关于启灵回收',
        miniapp_about_content: '启灵回收是官方直营的数字化全品类二手回收服务平台，深耕绿色循环经济。通过自动化质检流水线与专业估价模型，为广大用户提供高价、安全、便捷、透明的一站式闲置变现服务。'
    };

    // 官方精选分类图标素材库 (高清矢量 SVG / PNG，按通用行业大类归类)
    const PRESET_CAT_ICONS = [
        {
            group: '数码 3C & 智能设备',
            icons: [
                { name: '智能手机', path: '/uploads/default/phone_15promax.svg' },
                { name: '折叠屏手机', path: '/uploads/default/phone_mate60.svg' },
                { name: '拍照手机', path: '/uploads/default/phone_mi14.svg' },
                { name: '笔记本电脑', path: '/uploads/default/macbook_pro.svg' },
                { name: '平板电脑', path: '/uploads/default/ipad_pro.svg' },
                { name: '数码相机', path: '/uploads/default/sony_a7m4.svg' },
                { name: '智能手表', path: '/uploads/default/watch_rolex.svg' },
                { name: '通用数码', path: '/uploads/default/dev_default.svg' }
            ]
        },
        {
            group: '奢侈品与出行',
            icons: [
                { name: '黄金珠宝', path: '/uploads/default/luxury_gold.svg' },
                { name: '新能源汽车', path: '/uploads/default/car_tesla.svg' },
                { name: '燃油二手车', path: '/uploads/default/car_corolla.svg' }
            ]
        },
        {
            group: '大家电与生活电器',
            icons: [
                { name: '家用空调', path: '/uploads/default/appliance_ac.svg' },
                { name: '家用冰箱', path: '/uploads/default/appliance_fridge.svg' },
                { name: '液晶电视', path: '/uploads/default/appliance_tv.svg' },
                { name: '洗衣机', path: '/uploads/default/appliance_washer.svg' }
            ]
        },
        {
            group: '再生资源与工业废品',
            icons: [
                { name: '废旧电瓶', path: '/uploads/default/scrap_battery.svg' },
                { name: '废铜', path: '/uploads/default/scrap_copper.svg' },
                { name: '废铝', path: '/uploads/default/scrap_aluminum.svg' },
                { name: '废钢废铁', path: '/uploads/default/scrap_steel.svg' },
                { name: '废纸箱', path: '/uploads/default/scrap_paper.svg' }
            ]
        }
    ];

    // 智能推断匹配分类图标
    function guessCatIcon(name, existingIcon) {
        if (existingIcon && String(existingIcon).trim()) {
            return String(existingIcon).trim();
        }
        const n = String(name || '').toLowerCase();
        if (n.includes('手机') || n.includes('iphone') || n.includes('华为') || n.includes('苹果') || n.includes('小米') || n.includes('移动') || n.includes('phone')) {
            return '/uploads/default/phone_15promax.svg';
        }
        if (n.includes('电脑') || n.includes('笔记本') || n.includes('macbook') || n.includes('主机') || n.includes('pc') || n.includes('台式')) {
            return '/uploads/default/macbook_pro.svg';
        }
        if (n.includes('平板') || n.includes('ipad') || n.includes('pad')) {
            return '/uploads/default/ipad_pro.svg';
        }
        if (n.includes('摄影') || n.includes('摄像') || n.includes('相机') || n.includes('微单') || n.includes('单反') || n.includes('镜头') || n.includes('索尼')) {
            return '/uploads/default/sony_a7m4.svg';
        }
        if (n.includes('表') || n.includes('穿戴') || n.includes('耳机') || n.includes('手环') || n.includes('watch') || n.includes('腕表')) {
            return '/uploads/default/watch_rolex.svg';
        }
        if (n.includes('金') || n.includes('珠宝') || n.includes('奢侈') || n.includes('首饰') || n.includes('包')) {
            return '/uploads/default/luxury_gold.svg';
        }
        if (n.includes('车') || n.includes('汽车') || n.includes('出行')) {
            return '/uploads/default/car_tesla.svg';
        }
        if (n.includes('空调')) {
            return '/uploads/default/appliance_ac.svg';
        }
        if (n.includes('冰箱')) {
            return '/uploads/default/appliance_fridge.svg';
        }
        if (n.includes('电视')) {
            return '/uploads/default/appliance_tv.svg';
        }
        if (n.includes('洗衣机') || n.includes('洗')) {
            return '/uploads/default/appliance_washer.svg';
        }
        if (n.includes('电瓶') || n.includes('电池')) {
            return '/uploads/default/scrap_battery.svg';
        }
        if (n.includes('铜') || n.includes('铝') || n.includes('铁') || n.includes('钢') || n.includes('金属') || n.includes('纸') || n.includes('废')) {
            return '/uploads/default/scrap_copper.svg';
        }
        return '/uploads/default/dev_default.svg';
    }

    async function renderMiniappDecorationView(container) {
        if (!container) return;
        container.innerHTML = '<div class="card" style="padding:40px;text-align:center;color:#64748b;">正在载入小程序装修系统...</div>';

        // 拉取后端最新系统配置与分类
        const [configRes, catRes] = await Promise.all([
            api.get('/admin/config/getConfigs'),
            api.get('/admin/device/categories')
        ]);
        const rawConfigs = (configRes && configRes.code === 200 && configRes.data) ? configRes.data : {};
        const systemCategories = (catRes && catRes.code === 200 && Array.isArray(catRes.data)) ? catRes.data : [];
        const cfgs = Object.assign({}, DEFAULT_CONFIGS, rawConfigs);

        // 小程序端专属独立分类数据列表 (与 PC/网页端解耦)
        let miniappCategoriesList = [];
        if (rawConfigs.miniapp_custom_categories) {
            try {
                miniappCategoriesList = JSON.parse(rawConfigs.miniapp_custom_categories);
            } catch (e) {
                miniappCategoriesList = [];
            }
        }
        if (!Array.isArray(miniappCategoriesList) || miniappCategoriesList.length === 0) {
            // 自动从系统品类生成推荐的小程序专属独立精简别名 (如 "摄影器材" -> "摄影", "二手手机" -> "手机")
            miniappCategoriesList = systemCategories.map((sc, idx) => {
                const rawName = sc.name || '';
                let clean = rawName.replace(/器材|电脑|数码|设备|智能|二手|回收/g, '');
                if (clean.length < 2) clean = rawName.substring(0, 4);
                return {
                    id: String(sc.id || (idx + 1)),
                    name: clean || rawName,
                    cat_id: sc.id || 0,
                    badge: idx === 0 ? '高价' : (idx === 3 ? '热' : ''),
                    icon: guessCatIcon(clean || rawName, sc.icon || ''),
                    link_type: 'category',
                    link_value: String(sc.id || ''),
                    status: 1,
                    sort: idx + 1
                };
            });
            if (miniappCategoriesList.length === 0) {
                miniappCategoriesList = [
                    { id: '1', name: '手机', cat_id: 1, badge: '高价', icon: '/uploads/default/phone_15promax.svg', link_type: 'category', link_value: '1', status: 1, sort: 1 },
                    { id: '2', name: '平板', cat_id: 2, badge: '', icon: '/uploads/default/ipad_pro.svg', link_type: 'category', link_value: '2', status: 1, sort: 2 },
                    { id: '3', name: '电脑', cat_id: 3, badge: '', icon: '/uploads/default/macbook_pro.svg', link_type: 'category', link_value: '3', status: 1, sort: 3 },
                    { id: '4', name: '摄影', cat_id: 4, badge: '热', icon: '/uploads/default/sony_a7m4.svg', link_type: 'category', link_value: '4', status: 1, sort: 4 },
                    { id: '5', name: '手表', cat_id: 5, badge: '', icon: '/uploads/default/watch_rolex.svg', link_type: 'category', link_value: '5', status: 1, sort: 5 }
                ];
            }
        } else {
            // 已有配置如无图标，自动补全匹配图标
            miniappCategoriesList.forEach(item => {
                if (!item.icon) {
                    item.icon = guessCatIcon(item.name || '', '');
                }
            });
        }

        // 当前模拟器展示的页面类型 (home: 首页, user: 个人中心)
        let simActivePage = 'home';

        container.innerHTML = `
            <!-- 顶部标题与全局操作栏 -->
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:14px;">
                <div>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <h2 style="font-size:18px;font-weight:700;color:#0f172a;margin:0;">小程序与移动端装修</h2>
                        <span class="badge" style="background:#dcfce7;color:#15803d;font-size:11px;font-weight:600;padding:2px 8px;border-radius:12px;">实时双端同步</span>
                        <span class="badge" style="background:#eff6ff;color:#2563eb;font-size:11px;font-weight:600;padding:2px 8px;border-radius:12px;">所见即所得</span>
                    </div>
                    <div style="font-size:13px;color:#64748b;margin-top:4px;">可视化定制微信小程序及手机 H5 端的视觉主题、首屏大卡、全品类专区、服务保障、底部原生导航及弹窗文案</div>
                </div>
                <div style="display:flex;align-items:center;gap:10px;">
                    <button type="button" class="btn btn-outline" id="btn-reset-miniapp-defaults" style="font-size:13px;display:inline-flex;align-items:center;gap:6px;">
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
                        恢复推荐默认值
                    </button>
                    <button type="button" class="btn btn-primary" id="btn-save-miniapp-all" style="font-size:13px;font-weight:600;display:inline-flex;align-items:center;gap:6px;padding:9px 20px;">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>
                        保存全部装修并发布
                    </button>
                </div>
            </div>

            <!-- 主工作区：左侧配置面板 + 右侧手机模拟器 -->
            <div style="display:grid;grid-template-columns:minmax(500px, 1fr) 390px;gap:24px;align-items:start;">
                
                <!-- ============================================== -->
                <!-- 左侧：全能分类配置面板 -->
                <!-- ============================================== -->
                <div class="card" style="padding:22px;">
                    <!-- 导航子选项卡 -->
                    <div class="settings-tabs-header" id="miniapp-sub-tabs" style="margin-bottom:22px;display:flex;flex-wrap:wrap;gap:6px;">
                        <button type="button" class="settings-tab-btn active" data-target="m-panel-basic">
                            ⚙️ 开发与基础设置
                        </button>
                        <button type="button" class="settings-tab-btn" data-target="m-panel-theme">
                            🎨 主题与顶栏
                        </button>
                        <button type="button" class="settings-tab-btn" data-target="m-panel-hero">
                            🚀 首页与首屏
                        </button>
                        <button type="button" class="settings-tab-btn" data-target="m-panel-category">
                            🗂️ 首页分类
                        </button>
                        <button type="button" class="settings-tab-btn" data-target="m-panel-guarantee">
                            🛡️ 服务保障
                        </button>
                        <button type="button" class="settings-tab-btn" data-target="m-panel-process">
                            🔄 流程与爆款
                        </button>
                        <button type="button" class="settings-tab-btn" data-target="m-panel-coupon">
                            🎟️ 加价券与营销
                        </button>
                        <button type="button" class="settings-tab-btn" data-target="m-panel-user">
                            👤 底部导航与说明
                        </button>
                    </div>

                    <form id="form-miniapp-decoration">
                        <!-- 子面板 0: 小程序开发与基础设置 -->
                        <div class="settings-panel active" id="m-panel-basic">
                            <!-- 架构定位与业务说明卡片 -->
                            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:16px 18px;margin-bottom:20px;line-height:1.6;">
                                <div style="display:flex;align-items:center;gap:8px;font-weight:700;color:#1e40af;font-size:14px;margin-bottom:6px;">
                                    <span>💡</span>
                                    <span>微信小程序独立开发与配置中心</span>
                                </div>
                                <div style="font-size:12px;color:#1e3a8a;">
                                    <strong>业务边界与架构说明</strong>：
                                    <ul style="margin:6px 0 0 16px;padding:0;">
                                        <li>本面板是<b>微信小程序端专属的统一配置控制中心</b>。负责微信小程序的前端发布、编译构建、微信授权一键登录 (换取 OpenID)、获取用户手机号及服务通知订阅消息。</li>
                                        <li><b>财务出资转账商户号 (MchId)</b>、APIv3 证书与私钥属于支付打款层，独立在【系统设置 -> 支付与转账】中统一管理。若微信商户号绑定的是此小程序，系统会自动继承并复用本处的 AppID。</li>
                                    </ul>
                                </div>
                            </div>

                            <!-- 1. 核心微信公众平台凭证 -->
                            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px;margin-bottom:20px;">
                                <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:14px;display:flex;align-items:center;gap:8px;">
                                    <span style="width:4px;height:16px;background:#1e58ff;border-radius:2px;display:inline-block;"></span>
                                    <span>微信公众平台开发凭证 (必填)</span>
                                </div>

                                <div class="login-form-group" style="margin-bottom:16px;">
                                    <label style="font-weight:600;font-size:13px;display:flex;justify-content:space-between;align-items:center;">
                                        <span>小程序 AppID (开发者ID) <span style="color:#ef4444;">*</span></span>
                                        <span style="font-size:12px;color:#64748b;font-weight:normal;">通常以 <code>wx</code> 开头，共18位</span>
                                    </label>
                                    <input type="text" id="cfg-miniapp-appid" class="form-control" value="${escapeHtml(cfgs.miniapp_appid || cfgs.wechat_appid || '')}" placeholder="如: wx1234567890abcdef" style="font-family:monospace;font-size:13px;font-weight:600;">
                                    <small style="color:#64748b;margin-top:4px;display:block;">在【微信公众平台 mp.weixin.qq.com -> 开发 -> 开发管理 -> 开发设置】中查看</small>
                                </div>

                                <div class="login-form-group" style="margin-bottom:16px;">
                                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                                        <label style="font-weight:600;font-size:13px;margin:0;">小程序 AppSecret (开发者密钥) <span style="color:#ef4444;">*</span></label>
                                        <button type="button" class="btn btn-outline" id="btn-toggle-miniapp-secret" style="height:26px;padding:0 8px;font-size:11px;cursor:pointer;">👁️ 切换明文/密文</button>
                                    </div>
                                    <input type="password" id="cfg-miniapp-secret" class="form-control" value="${escapeHtml(cfgs.miniapp_secret || cfgs.wechat_appsecret || '')}" placeholder="填写32位的小程序 AppSecret" style="font-family:monospace;font-size:13px;">
                                    <small style="color:#64748b;margin-top:4px;display:block;">小程序后端换取 OpenID、获取授权手机号及发送通知必填。平台安全脱敏存储，严禁向前端外露。</small>
                                </div>

                                <!-- 凭据连通性实时测试工具 -->
                                <div style="display:flex;align-items:center;gap:12px;margin-top:16px;flex-wrap:wrap;">
                                    <button type="button" class="btn btn-outline" id="btn-test-wechat-cred" style="height:34px;padding:0 16px;font-size:13px;font-weight:600;color:#1e58ff;border-color:#bfdbfe;background:#eff6ff;cursor:pointer;">
                                        ⚡ 测试微信凭据连通性
                                    </button>
                                    <span style="font-size:12px;color:#64748b;">实时握手微信公众平台接口验证 AppID 与 Secret 是否有效</span>
                                </div>

                                <!-- 测试结果动态反馈区域 -->
                                <div id="wechat-cred-test-result" style="display:none;margin-top:12px;padding:12px 16px;border-radius:8px;font-size:13px;line-height:1.5;border:1px solid #cbd5e1;"></div>
                            </div>

                            <!-- 2. 小程序主体与基础标识 -->
                            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px;margin-bottom:20px;">
                                <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:14px;display:flex;align-items:center;gap:8px;">
                                    <span style="width:4px;height:16px;background:#10b981;border-radius:2px;display:inline-block;"></span>
                                    <span>小程序应用信息与主体标识</span>
                                </div>

                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                                    <div class="login-form-group">
                                        <label style="font-weight:600;font-size:13px;">小程序应用名称</label>
                                        <input type="text" id="cfg-miniapp-app-name" class="form-control" value="${escapeHtml(cfgs.miniapp_app_name || cfgs.brand_name || '启灵回收')}" placeholder="如: 启灵回收">
                                        <small style="color:#64748b;margin-top:4px;display:block;">显示在小程序转发卡片与授权窗口的主体名</small>
                                    </div>
                                    <div class="login-form-group">
                                        <label style="font-weight:600;font-size:13px;">小程序原始 ID (gh_ 开头，选填)</label>
                                        <input type="text" id="cfg-miniapp-original-id" class="form-control" value="${escapeHtml(cfgs.miniapp_original_id || '')}" placeholder="如: gh_1234567890ab">
                                        <small style="color:#64748b;margin-top:4px;display:block;">用于外部 H5 或公众号关联跳转小程序</small>
                                    </div>
                                </div>
                            </div>

                            <!-- 3. 用户登录与业务体验策略 -->
                            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px;">
                                <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:14px;display:flex;align-items:center;gap:8px;">
                                    <span style="width:4px;height:16px;background:#8b5cf6;border-radius:2px;display:inline-block;"></span>
                                    <span>用户登录与回收体验策略</span>
                                </div>

                                <div style="display:flex;flex-direction:column;gap:12px;">
                                    <label style="display:flex;align-items:center;gap:10px;font-size:13px;font-weight:600;cursor:pointer;">
                                        <input type="checkbox" id="cfg-miniapp-wx-login-enabled" ${cfgs.miniapp_wx_login_enabled !== '0' ? 'checked' : ''} style="width:16px;height:16px;accent-color:#1e58ff;">
                                        <span>开启微信一键授权静默登录 (推荐)</span>
                                    </label>
                                    <p style="margin:0 0 0 26px;font-size:12px;color:#64748b;">用户首次进入小程序自动关联微信账号，极简无感知登录，大幅提升转化率。</p>

                                    <label style="display:flex;align-items:center;gap:10px;font-size:13px;font-weight:600;cursor:pointer;margin-top:6px;">
                                        <input type="checkbox" id="cfg-miniapp-wx-phone-enabled" ${cfgs.miniapp_wx_phone_enabled !== '0' ? 'checked' : ''} style="width:16px;height:16px;accent-color:#1e58ff;">
                                        <span>开启微信手机号快速验证组件</span>
                                    </label>
                                    <p style="margin:0 0 0 26px;font-size:12px;color:#64748b;">下单或绑定时调用微信原生获取手机号弹窗，免用户手动输入短信验证码。</p>

                                    <label style="display:flex;align-items:center;gap:10px;font-size:13px;font-weight:600;cursor:pointer;margin-top:6px;">
                                        <input type="checkbox" id="cfg-miniapp-guest-appraisal" ${cfgs.miniapp_guest_appraisal !== '0' ? 'checked' : ''} style="width:16px;height:16px;accent-color:#1e58ff;">
                                        <span>允许游客免登录在线测机估价</span>
                                    </label>
                                    <p style="margin:0 0 0 26px;font-size:12px;color:#64748b;">用户无需提前登录即可直接测机看报价，仅在最后一步提交订单或预约顺丰取件时要求登录。</p>
                                </div>
                            </div>
                        </div>

                        <!-- 子面板 1: 视觉主题与顶栏 -->
                        <div class="settings-panel" id="m-panel-theme">
                            <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:14px;display:flex;align-items:center;gap:8px;">
                                <span style="width:4px;height:16px;background:#1e58ff;border-radius:2px;display:inline-block;"></span>
                                <span>品牌主色调与色彩体系</span>
                            </div>
                            <p style="font-size:12px;color:#64748b;margin-bottom:14px;">主色调将贯穿小程序端顶栏按钮、价格高亮、估价主行动按钮与状态指示徽章。</p>
                            
                            <!-- 预置色盘快速选择 -->
                            <div style="display:flex;gap:12px;align-items:center;margin-bottom:16px;flex-wrap:wrap;">
                                <div class="theme-color-pill ${cfgs.miniapp_theme_color === '#1e58ff' ? 'active' : ''}" data-color="#1e58ff" style="background:#1e58ff;width:34px;height:34px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;box-shadow:0 2px 6px rgba(30,88,255,0.3);">✓</div>
                                <div class="theme-color-pill ${cfgs.miniapp_theme_color === '#059669' ? 'active' : ''}" data-color="#059669" style="background:#059669;width:34px;height:34px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;box-shadow:0 2px 6px rgba(5,150,105,0.3);">✓</div>
                                <div class="theme-color-pill ${cfgs.miniapp_theme_color === '#ea580c' ? 'active' : ''}" data-color="#ea580c" style="background:#ea580c;width:34px;height:34px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;box-shadow:0 2px 6px rgba(234,88,12,0.3);">✓</div>
                                <div class="theme-color-pill ${cfgs.miniapp_theme_color === '#7c3aed' ? 'active' : ''}" data-color="#7c3aed" style="background:#7c3aed;width:34px;height:34px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;box-shadow:0 2px 6px rgba(124,58,237,0.3);">✓</div>
                                <div class="theme-color-pill ${cfgs.miniapp_theme_color === '#0f172a' ? 'active' : ''}" data-color="#0f172a" style="background:#0f172a;width:34px;height:34px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;box-shadow:0 2px 6px rgba(15,23,42,0.3);">✓</div>
                                <div class="theme-color-pill ${cfgs.miniapp_theme_color === '#dc2626' ? 'active' : ''}" data-color="#dc2626" style="background:#dc2626;width:34px;height:34px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;box-shadow:0 2px 6px rgba(220,38,38,0.3);">✓</div>
                                <div style="display:flex;align-items:center;gap:8px;margin-left:8px;">
                                    <span style="font-size:12px;color:#64748b;">自定义色值:</span>
                                    <input type="color" id="cfg-theme-color-picker" value="${cfgs.miniapp_theme_color || '#1e58ff'}" style="width:36px;height:34px;padding:0;border:none;border-radius:6px;cursor:pointer;">
                                    <input type="text" id="cfg-miniapp-theme-color" class="form-control" style="width:100px;font-size:12px;text-transform:uppercase;" value="${escapeHtml(cfgs.miniapp_theme_color || '#1e58ff')}">
                                </div>
                            </div>

                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px;">
                                <div class="login-form-group">
                                    <label style="font-weight:600;font-size:13px;">顶部导航标题文案</label>
                                    <input type="text" id="cfg-miniapp-nav-title" class="form-control" value="${escapeHtml(cfgs.miniapp_nav_title || '启灵专业数码回收')}" placeholder="如: 启灵专业数码回收">
                                </div>
                                <div class="login-form-group">
                                    <label style="font-weight:600;font-size:13px;">顶栏背景模式</label>
                                    <select id="cfg-miniapp-nav-bg" class="form-control">
                                        <option value="gradient" ${cfgs.miniapp_nav_bg === 'gradient' ? 'selected' : ''}>品牌主题色沉浸渐变</option>
                                        <option value="light" ${cfgs.miniapp_nav_bg === 'light' ? 'selected' : ''}>纯净素白极简风</option>
                                    </select>
                                </div>
                            </div>

                            <div class="login-form-group" style="margin-top:14px;">
                                <label style="font-weight:600;font-size:13px;">容器与卡片圆角偏好</label>
                                <select id="cfg-miniapp-card-radius" class="form-control">
                                    <option value="20" ${String(cfgs.miniapp_card_radius) === '20' ? 'selected' : ''}>圆润亲和风格 (20rpx，推荐)</option>
                                    <option value="12" ${String(cfgs.miniapp_card_radius) === '12' ? 'selected' : ''}>现代规整风格 (12rpx)</option>
                                    <option value="4" ${String(cfgs.miniapp_card_radius) === '4' ? 'selected' : ''}>极简硬朗方角 (4rpx)</option>
                                </select>
                            </div>
                        </div>

                        <!-- 子面板 2: 首页与首屏 -->
                        <div class="settings-panel" id="m-panel-hero">
                            <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:14px;display:flex;align-items:center;gap:8px;">
                                <span style="width:4px;height:16px;background:#1e58ff;border-radius:2px;display:inline-block;"></span>
                                <span>首页搜索引导栏</span>
                            </div>
                            <div class="login-form-group">
                                <label style="font-weight:600;font-size:13px;">搜索框占位提示词 (Placeholder)</label>
                                <input type="text" id="cfg-miniapp-search-placeholder" class="form-control" value="${escapeHtml(cfgs.miniapp_search_placeholder || '搜索你想卖的手机 / 平板 / 电脑型号')}" placeholder="输入搜索框引导文案">
                            </div>

                            <div style="font-size:14px;font-weight:700;color:#0f172a;margin:20px 0 14px;display:flex;align-items:center;gap:8px;">
                                <span style="width:4px;height:16px;background:#1e58ff;border-radius:2px;display:inline-block;"></span>
                                <span>首屏宣传大卡 (Hero Banner)</span>
                            </div>
                            <div style="display:flex;align-items:center;gap:20px;margin-bottom:14px;">
                                <label style="display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:600;cursor:pointer;">
                                    <input type="checkbox" id="cfg-miniapp-hero-enabled" ${cfgs.miniapp_hero_enabled !== '0' ? 'checked' : ''} style="width:16px;height:16px;accent-color:#1e58ff;">
                                    在首页展示首屏宣传大卡
                                </label>
                            </div>

                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                                <div class="login-form-group">
                                    <label style="font-weight:600;font-size:13px;">卡片顶部标签 (Tag)</label>
                                    <input type="text" id="cfg-miniapp-hero-tag" class="form-control" value="${escapeHtml(cfgs.miniapp_hero_tag || '启灵高价回收 · 官方验机')}" placeholder="如: 启灵高价回收 · 官方验机">
                                </div>
                                <div class="login-form-group">
                                    <label style="font-weight:600;font-size:13px;">卡片背景渐变风格</label>
                                    <select id="cfg-miniapp-hero-gradient" class="form-control">
                                        <option value="blue" ${cfgs.miniapp_hero_gradient === 'blue' ? 'selected' : ''}>经典科技蓝 (推荐)</option>
                                        <option value="dark" ${cfgs.miniapp_hero_gradient === 'dark' ? 'selected' : ''}>黑曜石沉浸质感</option>
                                        <option value="sunset" ${cfgs.miniapp_hero_gradient === 'sunset' ? 'selected' : ''}>活力暖橙日落</option>
                                        <option value="cyan" ${cfgs.miniapp_hero_gradient === 'cyan' ? 'selected' : ''}>极客青翠微光</option>
                                    </select>
                                </div>
                            </div>

                            <div class="login-form-group" style="margin-top:14px;">
                                <label style="font-weight:600;font-size:13px;">核心宣传主标题 (Title)</label>
                                <input type="text" id="cfg-miniapp-hero-title" class="form-control" value="${escapeHtml(cfgs.miniapp_hero_title || '旧机别放着，立即变现')}" placeholder="如: 旧机别放着，立即变现">
                            </div>
                            <div class="login-form-group" style="margin-top:14px;">
                                <label style="font-weight:600;font-size:13px;">副标题与官方保障短语 (Subtitle)</label>
                                <input type="text" id="cfg-miniapp-hero-subtitle" class="form-control" value="${escapeHtml(cfgs.miniapp_hero_subtitle || '顺丰包邮 · 隐私深度清除 · 质检一致当天打款')}" placeholder="如: 顺丰包邮 · 隐私深度清除 · 质检一致当天打款">
                            </div>
                        </div>

                        <!-- 子面板 3: 首页分类设置 -->
                        <div class="settings-panel" id="m-panel-category">
                            <!-- 基础展示控制卡片 -->
                            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 18px;margin-bottom:20px;">
                                <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:12px;display:flex;align-items:center;gap:8px;">
                                    <span style="width:4px;height:16px;background:#10b981;border-radius:2px;display:inline-block;"></span>
                                    <span>首页分类专区控制</span>
                                </div>
                                <div style="display:flex;align-items:center;gap:20px;margin-bottom:12px;">
                                    <label style="display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:600;cursor:pointer;">
                                        <input type="checkbox" id="cfg-miniapp-category-enabled" ${cfgs.miniapp_category_enabled !== '0' ? 'checked' : ''} style="width:16px;height:16px;accent-color:#10b981;">
                                        在首页展示分类专区
                                    </label>
                                </div>
                                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;">
                                    <div class="login-form-group">
                                        <label style="font-weight:600;font-size:12px;color:#475569;">专区主标题</label>
                                        <input type="text" id="cfg-miniapp-category-title" class="form-control" value="${escapeHtml(cfgs.miniapp_category_title || '全品类数码回收')}" placeholder="如: 全品类数码回收" style="height:34px;font-size:12px;">
                                    </div>
                                    <div class="login-form-group">
                                        <label style="font-weight:600;font-size:12px;color:#475569;">每行展示列数</label>
                                        <select id="cfg-miniapp-category-cols" class="form-control" style="height:34px;font-size:12px;">
                                            <option value="5" ${String(cfgs.miniapp_category_cols) === '5' ? 'selected' : ''}>标准 5 列 (推荐)</option>
                                            <option value="4" ${String(cfgs.miniapp_category_cols) === '4' ? 'selected' : ''}>宽幅 4 列</option>
                                        </select>
                                    </div>
                                    <div class="login-form-group">
                                        <label style="font-weight:600;font-size:12px;color:#475569;">首页最多显示数量</label>
                                        <input type="number" id="cfg-miniapp-category-limit" class="form-control" value="${escapeHtml(cfgs.miniapp_category_limit || '10')}" min="2" max="30" placeholder="默认 10 个" style="height:34px;font-size:12px;">
                                    </div>
                                </div>
                            </div>

                            <!-- 小程序分类列表管理 -->
                            <div>
                                <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:12px;flex-wrap:wrap;gap:10px;">
                                    <div>
                                        <div style="font-size:14px;font-weight:700;color:#0f172a;display:flex;align-items:center;gap:8px;">
                                            <span style="width:4px;height:16px;background:#10b981;border-radius:2px;display:inline-block;"></span>
                                            <span>小程序分类设置</span>
                                        </div>
                                        <div style="font-size:12px;color:#64748b;margin-top:4px;">
                                            自定义小程序首页分类列表。支持独立设定分类名称、图标、营销角标与点击跳转动作。
                                        </div>
                                    </div>
                                    <div style="display:flex;gap:8px;">
                                        <button type="button" class="btn btn-sm btn-outline" id="btn-sync-system-cats" style="font-size:12px;display:inline-flex;align-items:center;gap:4px;padding:6px 12px;">
                                            🔄 智能生成别名
                                        </button>
                                        <button type="button" class="btn btn-sm btn-primary" id="btn-add-miniapp-cat" style="font-size:12px;display:inline-flex;align-items:center;gap:4px;padding:6px 14px;">
                                            + 新增分类
                                        </button>
                                    </div>
                                </div>

                                <div style="overflow-x:auto;border:1px solid #e2e8f0;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,0.02);background:#fff;">
                                    <table style="width:100%;border-collapse:collapse;font-size:12px;text-align:left;">
                                        <thead>
                                            <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0;color:#475569;font-weight:600;">
                                                <th style="padding:10px 6px;text-align:center;width:44px;">排序</th>
                                                <th style="padding:10px 8px;text-align:center;width:68px;">图标</th>
                                                <th style="padding:10px 10px;min-width:110px;">分类名称</th>
                                                <th style="padding:10px 10px;min-width:150px;">关联系统品类</th>
                                                <th style="padding:10px 8px;text-align:center;width:80px;">角标</th>
                                                <th style="padding:10px 10px;min-width:170px;">点击动作</th>
                                                <th style="padding:10px 6px;text-align:center;width:55px;">显示</th>
                                                <th style="padding:10px 6px;text-align:center;width:48px;">操作</th>
                                            </tr>
                                        </thead>
                                        <tbody id="miniapp-cat-table-body">
                                            <!-- 由 renderMiniappCategoriesTable() 动态渲染 -->
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <!-- 子面板 4: 核心服务保障 -->
                        <div class="settings-panel" id="m-panel-guarantee">
                            <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:14px;display:flex;align-items:center;gap:8px;">
                                <span style="width:4px;height:16px;background:#f59e0b;border-radius:2px;display:inline-block;"></span>
                                <span>核心服务保障 (Service Guarantee)</span>
                            </div>
                            <div style="display:flex;align-items:center;gap:20px;margin-bottom:14px;">
                                <label style="display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:600;cursor:pointer;">
                                    <input type="checkbox" id="cfg-miniapp-guarantee-enabled" ${cfgs.miniapp_guarantee_enabled !== '0' ? 'checked' : ''} style="width:16px;height:16px;accent-color:#f59e0b;">
                                    在首页展示核心保障横条
                                </label>
                            </div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
                                <div class="login-form-group">
                                    <label style="font-weight:600;font-size:13px;">保障项一文案</label>
                                    <input type="text" id="cfg-miniapp-guarantee-1" class="form-control" value="${escapeHtml(cfgs.miniapp_guarantee_1 || '隐私彻底清除')}" placeholder="如: 隐私彻底清除">
                                </div>
                                <div class="login-form-group">
                                    <label style="font-weight:600;font-size:13px;">保障项二文案</label>
                                    <input type="text" id="cfg-miniapp-guarantee-2" class="form-control" value="${escapeHtml(cfgs.miniapp_guarantee_2 || '顺丰双向包邮')}" placeholder="如: 顺丰双向包邮">
                                </div>
                                <div class="login-form-group">
                                    <label style="font-weight:600;font-size:13px;">保障项三文案</label>
                                    <input type="text" id="cfg-miniapp-guarantee-3" class="form-control" value="${escapeHtml(cfgs.miniapp_guarantee_3 || '验机极速放款')}" placeholder="如: 验机极速放款">
                                </div>
                                <div class="login-form-group">
                                    <label style="font-weight:600;font-size:13px;">保障项四文案</label>
                                    <input type="text" id="cfg-miniapp-guarantee-4" class="form-control" value="${escapeHtml(cfgs.miniapp_guarantee_4 || '7天估价锁定')}" placeholder="如: 7天估价锁定">
                                </div>
                            </div>
                        </div>

                        <!-- 子面板 5: 流程与爆款 -->
                        <div class="settings-panel" id="m-panel-process">
                            <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:14px;display:flex;align-items:center;gap:8px;">
                                <span style="width:4px;height:16px;background:#8b5cf6;border-radius:2px;display:inline-block;"></span>
                                <span>简单三步回收流程 (Process Steps)</span>
                            </div>
                            <div style="display:flex;align-items:center;gap:20px;margin-bottom:14px;">
                                <label style="display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:600;cursor:pointer;">
                                    <input type="checkbox" id="cfg-miniapp-process-enabled" ${cfgs.miniapp_process_enabled !== '0' ? 'checked' : ''} style="width:16px;height:16px;accent-color:#8b5cf6;">
                                    在首页展示三步回收流程卡片
                                </label>
                            </div>
                            <div class="login-form-group" style="margin-bottom:14px;">
                                <label style="font-weight:600;font-size:13px;">流程区域总标题</label>
                                <input type="text" id="cfg-miniapp-process-title" class="form-control" value="${escapeHtml(cfgs.miniapp_process_title || '简单三步 · 轻松变现')}" placeholder="如: 简单三步 · 轻松变现">
                            </div>
                            <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:12px;">
                                <div style="background:#f8fafc;padding:12px;border:1px solid #e2e8f0;border-radius:8px;">
                                    <strong style="font-size:12px;color:#1e293b;display:block;margin-bottom:6px;">步骤 1</strong>
                                    <input type="text" id="cfg-miniapp-step-1-title" class="form-control" style="font-size:12px;margin-bottom:6px;" value="${escapeHtml(cfgs.miniapp_step_1_title || '在线估价')}" placeholder="主标题">
                                    <input type="text" id="cfg-miniapp-step-1-desc" class="form-control" style="font-size:11px;" value="${escapeHtml(cfgs.miniapp_step_1_desc || '30秒选项测机')}" placeholder="副说明">
                                </div>
                                <div style="background:#f8fafc;padding:12px;border:1px solid #e2e8f0;border-radius:8px;">
                                    <strong style="font-size:12px;color:#1e293b;display:block;margin-bottom:6px;">步骤 2</strong>
                                    <input type="text" id="cfg-miniapp-step-2-title" class="form-control" style="font-size:12px;margin-bottom:6px;" value="${escapeHtml(cfgs.miniapp_step_2_title || '顺丰寄件/上门')}" placeholder="主标题">
                                    <input type="text" id="cfg-miniapp-step-2-desc" class="form-control" style="font-size:11px;" value="${escapeHtml(cfgs.miniapp_step_2_desc || '全程包邮免密')}" placeholder="副说明">
                                </div>
                                <div style="background:#f8fafc;padding:12px;border:1px solid #e2e8f0;border-radius:8px;">
                                    <strong style="font-size:12px;color:#1e293b;display:block;margin-bottom:6px;">步骤 3</strong>
                                    <input type="text" id="cfg-miniapp-step-3-title" class="form-control" style="font-size:12px;margin-bottom:6px;" value="${escapeHtml(cfgs.miniapp_step_3_title || '验机打款')}" placeholder="主标题">
                                    <input type="text" id="cfg-miniapp-step-3-desc" class="form-control" style="font-size:11px;" value="${escapeHtml(cfgs.miniapp_step_3_desc || '直达微信零钱')}" placeholder="副说明">
                                </div>
                            </div>

                            <div style="font-size:14px;font-weight:700;color:#0f172a;margin:20px 0 14px;display:flex;align-items:center;gap:8px;">
                                <span style="width:4px;height:16px;background:#8b5cf6;border-radius:2px;display:inline-block;"></span>
                                <span>热门回收爆款机型推荐 (Hot Devices)</span>
                            </div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                                <div class="login-form-group">
                                    <label style="font-weight:600;font-size:13px;">爆款专区标题</label>
                                    <input type="text" id="cfg-miniapp-hot-title" class="form-control" value="${escapeHtml(cfgs.miniapp_hot_title || '大家都在卖 · 热门回收机型')}" placeholder="如: 大家都在卖 · 热门回收机型">
                                </div>
                                <div class="login-form-group">
                                    <label style="font-weight:600;font-size:13px;">首页推荐展示数量</label>
                                    <input type="number" id="cfg-miniapp-hot-limit" class="form-control" value="${escapeHtml(cfgs.miniapp_hot_limit || '5')}" min="1" max="20" placeholder="默认展示 5 部">
                                </div>
                            </div>
                        </div>

                        <!-- 子面板 6: 加价券与营销 -->
                        <div class="settings-panel" id="m-panel-coupon">
                            <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:14px;display:flex;align-items:center;gap:8px;">
                                <span style="width:4px;height:16px;background:#ea580c;border-radius:2px;display:inline-block;"></span>
                                <span>限时加价补贴专区 (对标转转/闲鱼加价补贴)</span>
                            </div>
                            <div style="display:flex;align-items:center;gap:20px;margin-bottom:14px;">
                                <label style="display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:600;cursor:pointer;">
                                    <input type="checkbox" id="cfg-miniapp-coupon-section-enabled" ${cfgs.miniapp_coupon_section_enabled !== '0' ? 'checked' : ''} style="width:16px;height:16px;accent-color:#ea580c;">
                                    在首页展示横滑加价补贴专区
                                </label>
                            </div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                                <div class="login-form-group">
                                    <label style="font-weight:600;font-size:13px;">专区主标题</label>
                                    <input type="text" id="cfg-miniapp-coupon-sec-title" class="form-control" value="${escapeHtml(cfgs.miniapp_coupon_sec_title || '回收加价补贴专区')}" placeholder="如: 回收加价补贴专区">
                                </div>
                                <div class="login-form-group">
                                    <label style="font-weight:600;font-size:13px;">右上角高亮标签</label>
                                    <input type="text" id="cfg-miniapp-coupon-sec-tag" class="form-control" value="${escapeHtml(cfgs.miniapp_coupon_sec_tag || '最高立补 ¥300')}" placeholder="如: 最高立补 ¥300">
                                </div>
                            </div>

                            <div style="font-size:14px;font-weight:700;color:#0f172a;margin:20px 0 14px;display:flex;align-items:center;gap:8px;">
                                <span style="width:4px;height:16px;background:#ea580c;border-radius:2px;display:inline-block;"></span>
                                <span>首页右下角悬浮领券入口</span>
                            </div>
                            <div style="display:flex;align-items:center;gap:20px;margin-bottom:14px;">
                                <label style="display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:600;cursor:pointer;">
                                    <input type="checkbox" id="cfg-miniapp-coupon-float-enabled" ${cfgs.miniapp_coupon_float_enabled !== '0' ? 'checked' : ''} style="width:16px;height:16px;accent-color:#ea580c;">
                                    在首页右下角展示常驻领券浮标
                                </label>
                            </div>
                            <div class="login-form-group">
                                <label style="font-weight:600;font-size:13px;">浮标按钮主文案</label>
                                <input type="text" id="cfg-coupon-float-subtitle" class="form-control" value="${escapeHtml(cfgs.coupon_float_subtitle || '领¥300补贴')}" placeholder="如: 领¥300补贴">
                            </div>
                        </div>

                        <!-- 子面板 7: 底部导航与个人中心 -->
                        <div class="settings-panel" id="m-panel-user">
                            <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:14px;display:flex;align-items:center;gap:8px;">
                                <span style="width:4px;height:16px;background:#06b6d4;border-radius:2px;display:inline-block;"></span>
                                <span>底部原生 TabBar 导航名称自定义</span>
                            </div>
                            <p style="font-size:12px;color:#64748b;margin-bottom:14px;">已由系统配置精美高清矢量图标，在此可自定义 4 个底部导航栏的显示名称。</p>
                            <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:12px;margin-bottom:20px;">
                                <div class="login-form-group">
                                    <label style="font-weight:600;font-size:12px;">Tab 1 (首页)</label>
                                    <input type="text" id="cfg-miniapp-tab-home-name" class="form-control" value="${escapeHtml(cfgs.miniapp_tab_home_name || '首页')}">
                                </div>
                                <div class="login-form-group">
                                    <label style="font-weight:600;font-size:12px;">Tab 2 (估价)</label>
                                    <input type="text" id="cfg-miniapp-tab-estimate-name" class="form-control" value="${escapeHtml(cfgs.miniapp_tab_estimate_name || '估价回收')}">
                                </div>
                                <div class="login-form-group">
                                    <label style="font-weight:600;font-size:12px;">Tab 3 (订单)</label>
                                    <input type="text" id="cfg-miniapp-tab-order-name" class="form-control" value="${escapeHtml(cfgs.miniapp_tab_order_name || '订单明细')}">
                                </div>
                                <div class="login-form-group">
                                    <label style="font-weight:600;font-size:12px;">Tab 4 (我的)</label>
                                    <input type="text" id="cfg-miniapp-tab-user-name" class="form-control" value="${escapeHtml(cfgs.miniapp_tab_user_name || '我的')}">
                                </div>
                            </div>

                            <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:14px;display:flex;align-items:center;gap:8px;">
                                <span style="width:4px;height:16px;background:#06b6d4;border-radius:2px;display:inline-block;"></span>
                                <span>客服热线与平台说明弹窗配置</span>
                            </div>
                            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px;">
                                <div class="login-form-group">
                                    <label style="font-weight:600;font-size:12px;">客服项标题</label>
                                    <input type="text" id="cfg-miniapp-service-tel-title" class="form-control" value="${escapeHtml(cfgs.miniapp_service_tel_title || '官方客服热线')}">
                                </div>
                                <div class="login-form-group">
                                    <label style="font-weight:600;font-size:12px;">客服电话号码</label>
                                    <input type="text" id="cfg-miniapp-service-tel" class="form-control" value="${escapeHtml(cfgs.miniapp_service_tel || '400-800-8888')}">
                                </div>
                                <div class="login-form-group">
                                    <label style="font-weight:600;font-size:12px;">在线服务时段</label>
                                    <input type="text" id="cfg-miniapp-service-hours" class="form-control" value="${escapeHtml(cfgs.miniapp_service_hours || '周一至周日 09:00 - 21:00')}">
                                </div>
                            </div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
                                <div class="login-form-group">
                                    <label style="font-weight:600;font-size:12px;">隐私保障弹窗说明标题</label>
                                    <input type="text" id="cfg-miniapp-privacy-title" class="form-control" value="${escapeHtml(cfgs.miniapp_privacy_title || '隐私深度清除保障说明')}" style="margin-bottom:6px;">
                                    <label style="font-weight:600;font-size:12px;">详细保障说明内容</label>
                                    <textarea id="cfg-miniapp-privacy-content" class="form-control" rows="3">${escapeHtml(cfgs.miniapp_privacy_content || '')}</textarea>
                                </div>
                                <div class="login-form-group">
                                    <label style="font-weight:600;font-size:12px;">关于我们弹窗标题</label>
                                    <input type="text" id="cfg-miniapp-about-title" class="form-control" value="${escapeHtml(cfgs.miniapp_about_title || '关于启灵回收')}" style="margin-bottom:6px;">
                                    <label style="font-weight:600;font-size:12px;">平台简介与企业使命</label>
                                    <textarea id="cfg-miniapp-about-content" class="form-control" rows="3">${escapeHtml(cfgs.miniapp_about_content || '')}</textarea>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                <!-- ============================================== -->
                <!-- 右侧：高保真手机交互模拟器 (Live Phone Simulator) -->
                <!-- ============================================== -->
                <div style="position:sticky;top:20px;">
                    <!-- 模拟器顶部切换条 -->
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;background:#f8fafc;padding:6px 10px;border-radius:8px;border:1px solid #e2e8f0;">
                        <span style="font-size:12px;font-weight:700;color:#475569;">📱 手机端动态视口</span>
                        <div style="display:flex;gap:4px;">
                            <button type="button" class="btn btn-sm ${simActivePage === 'home' ? 'btn-primary' : 'btn-outline'}" id="btn-sim-page-home" style="font-size:11px;padding:3px 10px;">首页</button>
                            <button type="button" class="btn btn-sm ${simActivePage === 'user' ? 'btn-primary' : 'btn-outline'}" id="btn-sim-page-user" style="font-size:11px;padding:3px 10px;">个人中心</button>
                        </div>
                    </div>

                    <!-- 拟真 iPhone 机身容器 -->
                    <div class="iphone-shell" style="width:360px;height:720px;background:#0f172a;border-radius:44px;padding:12px;box-shadow:0 25px 60px -15px rgba(0,0,0,0.35), 0 0 0 1px #1e293b;position:relative;margin:0 auto;box-sizing:border-box;">
                        <!-- 手机边框反光线条与侧键感 -->
                        <div style="position:absolute;top:100px;left:-3px;width:3px;height:40px;background:#334155;border-radius:2px 0 0 2px;"></div>
                        <div style="position:absolute;top:160px;left:-3px;width:3px;height:40px;background:#334155;border-radius:2px 0 0 2px;"></div>
                        <div style="position:absolute;top:120px;right:-3px;width:3px;height:55px;background:#334155;border-radius:0 2px 2px 0;"></div>

                        <!-- 屏幕主体 -->
                        <div class="iphone-screen" style="width:100%;height:100%;background:#f8fafc;border-radius:34px;overflow:hidden;display:flex;flex-direction:column;position:relative;">
                            
                            <!-- 手机灵动岛与状态栏 -->
                            <div class="iphone-statusbar" style="height:38px;background:${cfgs.miniapp_nav_bg === 'light' ? '#ffffff' : (cfgs.miniapp_theme_color || '#1e58ff')};display:flex;align-items:center;justify-content:space-between;padding:0 18px;color:${cfgs.miniapp_nav_bg === 'light' ? '#0f172a' : '#ffffff'};font-size:11px;font-weight:600;flex-shrink:0;transition:all 0.2s;">
                                <span>09:41</span>
                                <!-- 灵动岛药丸 -->
                                <div style="width:80px;height:18px;background:#000000;border-radius:10px;margin-top:2px;"></div>
                                <div style="display:flex;gap:4px;align-items:center;">
                                    <span>5G</span>
                                    <span style="border:1px solid currentColor;border-radius:3px;padding:0 3px;font-size:9px;">100%</span>
                                </div>
                            </div>

                            <!-- 微信小程序顶栏与胶囊按钮 -->
                            <div class="iphone-miniapp-header" style="height:44px;background:${cfgs.miniapp_nav_bg === 'light' ? '#ffffff' : (cfgs.miniapp_theme_color || '#1e58ff')};color:${cfgs.miniapp_nav_bg === 'light' ? '#0f172a' : '#ffffff'};display:flex;align-items:center;justify-content:space-between;padding:0 14px;flex-shrink:0;border-bottom:${cfgs.miniapp_nav_bg === 'light' ? '1px solid #e2e8f0' : 'none'};transition:all 0.2s;">
                                <div id="sim-header-title" style="font-size:14px;font-weight:700;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                                    ${escapeHtml(cfgs.miniapp_nav_title || '启灵专业数码回收')}
                                </div>
                                <!-- 微信胶囊按钮 -->
                                <div style="display:flex;align-items:center;gap:8px;background:rgba(0,0,0,0.15);padding:3px 10px;border-radius:16px;border:1px solid rgba(255,255,255,0.2);font-size:11px;">
                                    <span>•••</span>
                                    <span style="opacity:0.4;">|</span>
                                    <span>○</span>
                                </div>
                            </div>

                            <!-- 手机可滚动页面内容区 -->
                            <div class="iphone-scroll-body" id="sim-scroll-body" style="flex:1;overflow-y:auto;overflow-x:hidden;padding-bottom:10px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">
                                <!-- 动态由 JS 渲染首页或个人中心 -->
                            </div>

                            <!-- 手机原生底部 TabBar 模拟 -->
                            <div class="iphone-tabbar" style="height:56px;background:#ffffff;border-top:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-around;flex-shrink:0;box-shadow:0 -2px 10px rgba(0,0,0,0.03);">
                                <div class="sim-tab-item active" data-tab="home" style="display:flex;flex-direction:column;align-items:center;cursor:pointer;flex:1;">
                                    <div style="font-size:16px;line-height:1;color:${cfgs.miniapp_theme_color || '#1e58ff'};">⌂</div>
                                    <span id="sim-tab-home-text" style="font-size:10px;margin-top:2px;font-weight:700;color:${cfgs.miniapp_theme_color || '#1e58ff'};">${escapeHtml(cfgs.miniapp_tab_home_name || '首页')}</span>
                                </div>
                                <div class="sim-tab-item" data-tab="estimate" style="display:flex;flex-direction:column;align-items:center;cursor:pointer;flex:1;">
                                    <div style="font-size:16px;line-height:1;color:#94a3b8;">▦</div>
                                    <span id="sim-tab-estimate-text" style="font-size:10px;margin-top:2px;color:#64748b;">${escapeHtml(cfgs.miniapp_tab_estimate_name || '估价回收')}</span>
                                </div>
                                <div class="sim-tab-item" data-tab="order" style="display:flex;flex-direction:column;align-items:center;cursor:pointer;flex:1;">
                                    <div style="font-size:16px;line-height:1;color:#94a3b8;">▤</div>
                                    <span id="sim-tab-order-text" style="font-size:10px;margin-top:2px;color:#64748b;">${escapeHtml(cfgs.miniapp_tab_order_name || '订单明细')}</span>
                                </div>
                                <div class="sim-tab-item" data-tab="user" style="display:flex;flex-direction:column;align-items:center;cursor:pointer;flex:1;">
                                    <div style="font-size:16px;line-height:1;color:#94a3b8;">👤</div>
                                    <span id="sim-tab-user-text" style="font-size:10px;margin-top:2px;color:#64748b;">${escapeHtml(cfgs.miniapp_tab_user_name || '我的')}</span>
                                </div>
                            </div>

                            <!-- 底部 Home Indicator 小黑条 -->
                            <div style="height:14px;background:#ffffff;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                                <div style="width:110px;height:4px;background:#cbd5e1;border-radius:2px;"></div>
                            </div>

                        </div>
                    </div>
                </div>

            </div>
        `;

        // ==============================================
        // 绑定子选项卡切换逻辑
        // ==============================================
        const subTabs = container.querySelectorAll('#miniapp-sub-tabs .settings-tab-btn');
        subTabs.forEach(btn => {
            btn.addEventListener('click', function () {
                subTabs.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                const targetId = this.getAttribute('data-target');
                container.querySelectorAll('#form-miniapp-decoration .settings-panel').forEach(p => p.classList.remove('active'));
                const targetPanel = container.querySelector('#' + targetId);
                if (targetPanel) {
                    targetPanel.classList.add('active');
                }
            });
        });

        // ==============================================
        // 色盘点击快速切换
        // ==============================================
        container.querySelectorAll('.theme-color-pill').forEach(pill => {
            pill.addEventListener('click', function () {
                const color = this.getAttribute('data-color');
                const inpColor = document.getElementById('cfg-miniapp-theme-color');
                const inpPicker = document.getElementById('cfg-theme-color-picker');
                if (inpColor) inpColor.value = color;
                if (inpPicker) inpPicker.value = color;
                container.querySelectorAll('.theme-color-pill').forEach(p => p.classList.remove('active'));
                this.classList.add('active');
                triggerSimulatorSync();
            });
        });

        document.getElementById('cfg-theme-color-picker')?.addEventListener('input', function () {
            const inpColor = document.getElementById('cfg-miniapp-theme-color');
            if (inpColor) inpColor.value = this.value;
            triggerSimulatorSync();
        });

        document.getElementById('cfg-miniapp-theme-color')?.addEventListener('input', function () {
            const inpPicker = document.getElementById('cfg-theme-color-picker');
            if (inpPicker && /^#[0-9A-Fa-f]{6}$/.test(this.value.trim())) {
                inpPicker.value = this.value.trim();
            }
            triggerSimulatorSync();
        });

        // ==============================================
        // 模拟器动态渲染引擎 (Live Preview Engine)
        // ==============================================
        function renderSimulator() {
            const themeColor = document.getElementById('cfg-miniapp-theme-color')?.value.trim() || '#1e58ff';
            const navTitle = document.getElementById('cfg-miniapp-nav-title')?.value.trim() || '启灵专业数码回收';
            const navBg = document.getElementById('cfg-miniapp-nav-bg')?.value || 'gradient';
            const cardRadius = (document.getElementById('cfg-miniapp-card-radius')?.value || '20') + 'px';

            // 同步顶栏外观
            const statusBar = container.querySelector('.iphone-statusbar');
            const header = container.querySelector('.iphone-miniapp-header');
            const headerTitle = container.querySelector('#sim-header-title');
            if (statusBar && header) {
                if (navBg === 'light') {
                    statusBar.style.background = '#ffffff';
                    statusBar.style.color = '#0f172a';
                    header.style.background = '#ffffff';
                    header.style.color = '#0f172a';
                    header.style.borderBottom = '1px solid #e2e8f0';
                } else {
                    statusBar.style.background = themeColor;
                    statusBar.style.color = '#ffffff';
                    header.style.background = themeColor;
                    header.style.color = '#ffffff';
                    header.style.borderBottom = 'none';
                }
            }
            if (headerTitle) headerTitle.innerText = navTitle;

            // 同步 TabBar 文字
            const tabHome = document.getElementById('sim-tab-home-text');
            const tabEst = document.getElementById('sim-tab-estimate-text');
            const tabOrd = document.getElementById('sim-tab-order-text');
            const tabUsr = document.getElementById('sim-tab-user-text');
            if (tabHome) tabHome.innerText = document.getElementById('cfg-miniapp-tab-home-name')?.value.trim() || '首页';
            if (tabEst) tabEst.innerText = document.getElementById('cfg-miniapp-tab-estimate-name')?.value.trim() || '估价回收';
            if (tabOrd) tabOrd.innerText = document.getElementById('cfg-miniapp-tab-order-name')?.value.trim() || '订单明细';
            if (tabUsr) tabUsr.innerText = document.getElementById('cfg-miniapp-tab-user-name')?.value.trim() || '我的';

            const scrollBody = document.getElementById('sim-scroll-body');
            if (!scrollBody) return;

            if (simActivePage === 'home') {
                // ==========================================
                // 渲染【首页】高保真手机画面
                // ==========================================
                const searchPlaceholder = document.getElementById('cfg-miniapp-search-placeholder')?.value.trim() || '搜索你想卖的手机 / 平板 / 电脑型号';
                const heroEnabled = document.getElementById('cfg-miniapp-hero-enabled')?.checked;
                const heroTag = document.getElementById('cfg-miniapp-hero-tag')?.value.trim() || '启灵高价回收 · 官方验机';
                const heroTitle = document.getElementById('cfg-miniapp-hero-title')?.value.trim() || '旧机别放着，立即变现';
                const heroSub = document.getElementById('cfg-miniapp-hero-subtitle')?.value.trim() || '顺丰包邮 · 隐私深度清除 · 质检一致当天打款';
                const heroGrad = document.getElementById('cfg-miniapp-hero-gradient')?.value || 'blue';

                let heroBgStyle = `background:linear-gradient(135deg, ${themeColor} 0%, #003cd6 100%);`;
                if (heroGrad === 'dark') heroBgStyle = 'background:linear-gradient(135deg, #1e293b 0%, #0f172a 100%);';
                else if (heroGrad === 'sunset') heroBgStyle = 'background:linear-gradient(135deg, #f97316 0%, #ea580c 100%);';
                else if (heroGrad === 'cyan') heroBgStyle = 'background:linear-gradient(135deg, #0284c7 0%, #0d9488 100%);';

                const catEnabled = document.getElementById('cfg-miniapp-category-enabled')?.checked;
                const catTitle = document.getElementById('cfg-miniapp-category-title')?.value.trim() || '全品类数码回收';
                const catCols = document.getElementById('cfg-miniapp-category-cols')?.value || '5';

                const gEnabled = document.getElementById('cfg-miniapp-guarantee-enabled')?.checked;
                const g1 = document.getElementById('cfg-miniapp-guarantee-1')?.value.trim() || '隐私彻底清除';
                const g2 = document.getElementById('cfg-miniapp-guarantee-2')?.value.trim() || '顺丰双向包邮';
                const g3 = document.getElementById('cfg-miniapp-guarantee-3')?.value.trim() || '验机极速放款';
                const g4 = document.getElementById('cfg-miniapp-guarantee-4')?.value.trim() || '7天估价锁定';

                const cpSecEnabled = document.getElementById('cfg-miniapp-coupon-section-enabled')?.checked;
                const cpSecTitle = document.getElementById('cfg-miniapp-coupon-sec-title')?.value.trim() || '回收加价补贴专区';
                const cpSecTag = document.getElementById('cfg-miniapp-coupon-sec-tag')?.value.trim() || '最高立补 ¥300';
                const cpFloatEnabled = document.getElementById('cfg-miniapp-coupon-float-enabled')?.checked;
                const cpFloatTxt = document.getElementById('cfg-coupon-float-subtitle')?.value.trim() || '领¥300补贴';

                const procEnabled = document.getElementById('cfg-miniapp-process-enabled')?.checked;
                const procTitle = document.getElementById('cfg-miniapp-process-title')?.value.trim() || '简单三步 · 轻松变现';
                const s1Title = document.getElementById('cfg-miniapp-step-1-title')?.value.trim() || '在线估价';
                const s1Desc = document.getElementById('cfg-miniapp-step-1-desc')?.value.trim() || '30秒选项测机';
                const s2Title = document.getElementById('cfg-miniapp-step-2-title')?.value.trim() || '顺丰寄件/上门';
                const s2Desc = document.getElementById('cfg-miniapp-step-2-desc')?.value.trim() || '全程包邮免密';
                const s3Title = document.getElementById('cfg-miniapp-step-3-title')?.value.trim() || '验机打款';
                const s3Desc = document.getElementById('cfg-miniapp-step-3-desc')?.value.trim() || '直达微信零钱';

                const hotTitle = document.getElementById('cfg-miniapp-hot-title')?.value.trim() || '大家都在卖 · 热门回收机型';

                scrollBody.innerHTML = `
                    <!-- 顶部搜索框 -->
                    <div style="background:${navBg === 'light' ? '#f1f5f9' : themeColor};padding:8px 12px 16px;transition:background 0.2s;">
                        <div style="background:#ffffff;height:36px;border-radius:18px;display:flex;align-items:center;padding:0 14px;box-shadow:0 2px 6px rgba(0,0,0,0.06);">
                            <span style="font-size:15px;color:#94a3b8;margin-right:8px;font-weight:300;">⌕</span>
                            <span style="color:#94a3b8;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(searchPlaceholder)}</span>
                        </div>
                    </div>

                    <!-- 首屏 Hero 卡片 -->
                    ${heroEnabled ? `
                        <div style="margin:-8px 12px 10px;${heroBgStyle}border-radius:${cardRadius};padding:14px 16px;color:#fff;box-shadow:0 4px 14px rgba(30,88,255,0.2);">
                            <div style="font-size:9px;background:rgba(255,255,255,0.25);display:inline-block;padding:2px 8px;border-radius:10px;margin-bottom:6px;font-weight:600;">
                                ${escapeHtml(heroTag)}
                            </div>
                            <div style="font-size:16px;font-weight:800;margin-bottom:4px;letter-spacing:-0.2px;">
                                ${escapeHtml(heroTitle)}
                            </div>
                            <div style="font-size:10px;opacity:0.9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                                ${escapeHtml(heroSub)}
                            </div>
                        </div>
                    ` : ''}

                    <!-- 加价补贴专区 -->
                    ${cpSecEnabled ? `
                        <div style="margin:0 12px 10px;background:linear-gradient(180deg,#fff7ed 0%,#ffffff 100%);border:1px solid #fed7aa;border-radius:${cardRadius};padding:10px 12px;">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                                <div style="display:flex;align-items:center;gap:6px;">
                                    <span style="width:6px;height:6px;background:#ea580c;border-radius:50%;"></span>
                                    <strong style="font-size:12px;color:#9a3412;">${escapeHtml(cpSecTitle)}</strong>
                                    <span style="background:linear-gradient(135deg,#f97316 0%,#ea580c 100%);color:#fff;font-size:9px;font-weight:700;padding:1px 6px;border-radius:6px;">${escapeHtml(cpSecTag)}</span>
                                </div>
                                <span style="font-size:10px;color:#ea580c;font-weight:600;">领券中心 ></span>
                            </div>
                            <div style="display:flex;gap:8px;overflow-x:hidden;">
                                <div style="background:#fff;border:1px solid #fdba74;border-radius:8px;display:flex;align-items:center;padding:6px 8px;font-size:10px;flex-shrink:0;">
                                    <strong style="color:#ea580c;font-size:14px;margin-right:6px;">+¥80</strong>
                                    <div>
                                        <div style="font-weight:700;color:#1e293b;font-size:10px;">手机加价券</div>
                                        <div style="font-size:8px;color:#ea580c;">满1000可用</div>
                                    </div>
                                </div>
                                <div style="background:#fff;border:1px solid #fdba74;border-radius:8px;display:flex;align-items:center;padding:6px 8px;font-size:10px;flex-shrink:0;">
                                    <strong style="color:#ea580c;font-size:14px;margin-right:6px;">+¥150</strong>
                                    <div>
                                        <div style="font-weight:700;color:#1e293b;font-size:10px;">平板笔记本券</div>
                                        <div style="font-size:8px;color:#ea580c;">满2000可用</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ` : ''}

                    <!-- 核心服务保障 -->
                    ${gEnabled ? `
                        <div style="display:flex;justify-content:space-between;background:#ffffff;margin:0 12px 10px;padding:9px 12px;border-radius:${cardRadius};box-shadow:0 1px 4px rgba(0,0,0,0.02);">
                            <div style="display:flex;align-items:center;gap:4px;font-size:9px;color:#475569;">
                                <span style="width:14px;height:14px;background:#eff6ff;color:${themeColor};border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:bold;font-size:8px;">✓</span>
                                <span>${escapeHtml(g1)}</span>
                            </div>
                            <div style="display:flex;align-items:center;gap:4px;font-size:9px;color:#475569;">
                                <span style="width:14px;height:14px;background:#eff6ff;color:${themeColor};border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:bold;font-size:8px;">✓</span>
                                <span>${escapeHtml(g2)}</span>
                            </div>
                            <div style="display:flex;align-items:center;gap:4px;font-size:9px;color:#475569;">
                                <span style="width:14px;height:14px;background:#eff6ff;color:${themeColor};border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:bold;font-size:8px;">✓</span>
                                <span>${escapeHtml(g3)}</span>
                            </div>
                            <div style="display:flex;align-items:center;gap:4px;font-size:9px;color:#475569;">
                                <span style="width:14px;height:14px;background:#eff6ff;color:${themeColor};border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:bold;font-size:8px;">✓</span>
                                <span>${escapeHtml(g4)}</span>
                            </div>
                        </div>
                    ` : ''}

                    <!-- 首页分类导航 (实时由小程序专属独立分类列表驱动) -->
                    ${catEnabled ? `
                        <div style="background:#ffffff;margin:0 12px 10px;padding:12px;border-radius:${cardRadius};box-shadow:0 1px 4px rgba(0,0,0,0.02);">
                            <div style="font-size:12px;font-weight:800;color:#0f172a;margin-bottom:10px;">${escapeHtml(catTitle)}</div>
                            <div style="display:grid;grid-template-columns:repeat(${catCols === '4' ? '4' : '5'}, 1fr);gap:10px;text-align:center;">
                                ${(() => {
                                    const limit = parseInt(document.getElementById('cfg-miniapp-category-limit')?.value || '10', 10);
                                    const activeCats = miniappCategoriesList.filter(c => c.status !== 0).slice(0, limit);
                                    if (activeCats.length === 0) {
                                        return `<div style="grid-column:1/-1;font-size:11px;color:#94a3b8;padding:10px 0;">暂无可展示的小程序分类</div>`;
                                    }
                                    const colorList = ['#eff6ff', '#eef2ff', '#f0fdf4', '#fef3c7', '#fdf2f8', '#ecfeff', '#fff7ed', '#f5f3ff'];
                                    const textColorList = [themeColor, '#4f46e5', '#16a34a', '#d97706', '#db2777', '#0891b2', '#ea580c', '#7c3aed'];

                                    return activeCats.map((cat, i) => {
                                        const bg = colorList[i % colorList.length];
                                        const tc = textColorList[i % textColorList.length];
                                        const abbr = cat.name ? cat.name.substring(0, 2) : '机';
                                        const catIcon = cat.icon || guessCatIcon(cat.name, '');
                                        return `
                                            <div style="display:flex;flex-direction:column;align-items:center;">
                                                <div style="position:relative;width:38px;height:38px;border-radius:12px;background:${bg};margin:0 auto 4px;display:flex;align-items:center;justify-content:center;">
                                                    ${cat.badge ? `
                                                        <span style="position:absolute;top:-5px;right:-7px;background:linear-gradient(135deg,#ff4d4f 0%,#fa541c 100%);color:#fff;font-size:8px;font-weight:700;padding:1px 4px;border-radius:6px;line-height:1;box-shadow:0 1px 3px rgba(250,84,28,0.35);z-index:2;">${escapeHtml(cat.badge)}</span>
                                                    ` : ''}
                                                    ${catIcon ? `
                                                        <img src="${escapeHtml(catIcon)}" style="width:24px;height:24px;object-fit:contain;" alt="${escapeHtml(cat.name)}" onerror="this.style.display='none';this.nextElementSibling.style.display='inline';">
                                                        <span style="display:none;font-size:11px;font-weight:bold;color:${tc};">${escapeHtml(abbr)}</span>
                                                    ` : `
                                                        <span style="font-size:11px;font-weight:bold;color:${tc};">${escapeHtml(abbr)}</span>
                                                    `}
                                                </div>
                                                <span style="font-size:10px;color:#334155;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:54px;display:block;">${escapeHtml(cat.name)}</span>
                                            </div>
                                        `;
                                    }).join('');
                                })()}
                            </div>
                        </div>
                    ` : ''}

                    <!-- 热门回收机型推荐 -->
                    <div style="background:#ffffff;margin:0 12px 10px;padding:12px;border-radius:${cardRadius};box-shadow:0 1px 4px rgba(0,0,0,0.02);">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                            <strong style="font-size:12px;color:#0f172a;">${escapeHtml(hotTitle)}</strong>
                            <span style="font-size:10px;color:#94a3b8;">更多 ></span>
                        </div>
                        <div style="display:flex;align-items:center;padding:8px 0;border-bottom:1px solid #f1f5f9;">
                            <div style="width:38px;height:38px;background:#f1f5f9;border-radius:8px;margin-right:10px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#64748b;font-weight:bold;">iPhone</div>
                            <div style="flex:1;">
                                <div style="font-size:11px;font-weight:700;color:#0f172a;">iPhone 15 Pro Max</div>
                                <div style="font-size:10px;color:#ef4444;font-weight:bold;margin-top:2px;">最高预估: ¥6,800</div>
                            </div>
                            <span style="background:${themeColor};color:#fff;border-radius:12px;padding:3px 10px;font-size:9px;font-weight:600;">测一测</span>
                        </div>
                        <div style="display:flex;align-items:center;padding:8px 0;">
                            <div style="width:38px;height:38px;background:#f1f5f9;border-radius:8px;margin-right:10px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#64748b;font-weight:bold;">Mate</div>
                            <div style="flex:1;">
                                <div style="font-size:11px;font-weight:700;color:#0f172a;">Huawei Mate 60 Pro</div>
                                <div style="font-size:10px;color:#ef4444;font-weight:bold;margin-top:2px;">最高预估: ¥5,200</div>
                            </div>
                            <span style="background:${themeColor};color:#fff;border-radius:12px;padding:3px 10px;font-size:9px;font-weight:600;">测一测</span>
                        </div>
                    </div>

                    <!-- 回收流程三步卡片 -->
                    ${procEnabled ? `
                        <div style="background:#ffffff;margin:0 12px 10px;padding:12px;border-radius:${cardRadius};box-shadow:0 1px 4px rgba(0,0,0,0.02);">
                            <div style="font-size:12px;font-weight:800;color:#0f172a;text-align:center;margin-bottom:12px;">${escapeHtml(procTitle)}</div>
                            <div style="display:flex;align-items:center;justify-content:space-around;font-size:9px;">
                                <div style="text-align:center;">
                                    <div style="width:24px;height:24px;background:#eff6ff;color:${themeColor};border-radius:50%;margin:0 auto 4px;display:flex;align-items:center;justify-content:center;font-weight:bold;">1</div>
                                    <strong style="color:#0f172a;display:block;">${escapeHtml(s1Title)}</strong>
                                    <span style="color:#94a3b8;font-size:8px;">${escapeHtml(s1Desc)}</span>
                                </div>
                                <span style="color:#cbd5e1;">→</span>
                                <div style="text-align:center;">
                                    <div style="width:24px;height:24px;background:#eff6ff;color:${themeColor};border-radius:50%;margin:0 auto 4px;display:flex;align-items:center;justify-content:center;font-weight:bold;">2</div>
                                    <strong style="color:#0f172a;display:block;">${escapeHtml(s2Title)}</strong>
                                    <span style="color:#94a3b8;font-size:8px;">${escapeHtml(s2Desc)}</span>
                                </div>
                                <span style="color:#cbd5e1;">→</span>
                                <div style="text-align:center;">
                                    <div style="width:24px;height:24px;background:#eff6ff;color:${themeColor};border-radius:50%;margin:0 auto 4px;display:flex;align-items:center;justify-content:center;font-weight:bold;">3</div>
                                    <strong style="color:#0f172a;display:block;">${escapeHtml(s3Title)}</strong>
                                    <span style="color:#94a3b8;font-size:8px;">${escapeHtml(s3Desc)}</span>
                                </div>
                            </div>
                        </div>
                    ` : ''}

                    <!-- 悬浮领券按钮 (固定预览示意) -->
                    ${cpFloatEnabled ? `
                        <div style="text-align:right;margin:0 14px 4px;">
                            <span style="display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg,#ff4d4f 0%,#fa541c 100%);color:#fff;font-size:10px;font-weight:700;padding:5px 12px;border-radius:20px;box-shadow:0 3px 10px rgba(250,84,28,0.3);">
                                <span style="background:rgba(255,255,255,0.25);border-radius:4px;padding:1px 4px;font-size:8px;">券</span>
                                <span>${escapeHtml(cpFloatTxt)}</span>
                            </span>
                        </div>
                    ` : ''}
                `;
            } else {
                // ==========================================
                // 渲染【个人中心】高保真手机画面
                // ==========================================
                const serviceTelTitle = document.getElementById('cfg-miniapp-service-tel-title')?.value.trim() || '官方客服热线';
                const serviceTel = document.getElementById('cfg-miniapp-service-tel')?.value.trim() || '400-800-8888';
                const privacyTitle = document.getElementById('cfg-miniapp-privacy-title')?.value.trim() || '隐私深度清除保障说明';
                const aboutTitle = document.getElementById('cfg-miniapp-about-title')?.value.trim() || '关于启灵回收';

                scrollBody.innerHTML = `
                    <!-- 个人资料背景卡 -->
                    <div style="background:linear-gradient(135deg, ${themeColor} 0%, #003cd6 100%);padding:18px 16px 14px;color:#fff;border-bottom-left-radius:18px;border-bottom-right-radius:18px;margin-bottom:12px;">
                        <div style="display:flex;align-items:center;gap:12px;">
                            <div style="width:44px;height:44px;border-radius:50%;background:#ffffff;display:flex;align-items:center;justify-content:center;color:${themeColor};font-size:18px;font-weight:bold;">客</div>
                            <div style="flex:1;">
                                <div style="font-size:14px;font-weight:700;">启灵认证会员</div>
                                <div style="font-size:10px;opacity:0.85;margin-top:2px;">138****8888 · 已实名绑定</div>
                            </div>
                        </div>
                        <!-- 资产看板 -->
                        <div style="display:flex;justify-content:space-around;background:rgba(255,255,255,0.15);border-radius:10px;padding:10px 4px;margin-top:14px;text-align:center;">
                            <div>
                                <strong style="font-size:14px;display:block;">3</strong>
                                <span style="font-size:9px;opacity:0.85;">累计订单</span>
                            </div>
                            <div>
                                <strong style="font-size:14px;display:block;">¥ 8,420</strong>
                                <span style="font-size:9px;opacity:0.85;">已结算款项</span>
                            </div>
                            <div>
                                <strong style="font-size:14px;display:block;">1</strong>
                                <span style="font-size:9px;opacity:0.85;">质检中</span>
                            </div>
                            <div>
                                <strong style="font-size:14px;color:#fecdd3;display:block;">2 张</strong>
                                <span style="font-size:9px;opacity:0.85;">加价补贴券</span>
                            </div>
                        </div>
                    </div>

                    <!-- 订单快捷入口分类 (微章图标) -->
                    <div style="background:#ffffff;margin:0 12px 10px;padding:12px;border-radius:${cardRadius};box-shadow:0 1px 4px rgba(0,0,0,0.02);">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                            <strong style="font-size:12px;color:#0f172a;">我的回收订单</strong>
                            <span style="font-size:10px;color:#94a3b8;">全部 ></span>
                        </div>
                        <div style="display:flex;justify-content:space-around;text-align:center;">
                            <div>
                                <div style="width:34px;height:34px;border-radius:10px;background:#eff6ff;color:#2563eb;margin:0 auto 4px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;">寄</div>
                                <span style="font-size:10px;color:#475569;">待寄出</span>
                            </div>
                            <div>
                                <div style="width:34px;height:34px;border-radius:10px;background:#eef2ff;color:#4f46e5;margin:0 auto 4px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;">检</div>
                                <span style="font-size:10px;color:#475569;">待质检</span>
                            </div>
                            <div>
                                <div style="width:34px;height:34px;border-radius:10px;background:#fffbeb;color:#d97706;margin:0 auto 4px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;">核</div>
                                <span style="font-size:10px;color:#475569;">待确认差价</span>
                            </div>
                            <div>
                                <div style="width:34px;height:34px;border-radius:10px;background:#ecfdf5;color:#059669;margin:0 auto 4px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;">款</div>
                                <span style="font-size:10px;color:#475569;">已打款</span>
                            </div>
                        </div>
                    </div>

                    <!-- 常用服务与说明列表 -->
                    <div style="background:#ffffff;margin:0 12px 10px;padding:6px 12px;border-radius:${cardRadius};box-shadow:0 1px 4px rgba(0,0,0,0.02);">
                        <div style="display:flex;align-items:center;padding:10px 0;border-bottom:1px solid #f8fafc;">
                            <span style="width:26px;height:26px;border-radius:6px;background:#ffe4e6;color:#e11d48;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;margin-right:10px;">券</span>
                            <span style="font-size:11px;color:#1e293b;flex:1;font-weight:500;">我的加价券包</span>
                            <span style="font-size:10px;color:#e11d48;font-weight:600;margin-right:6px;">2 张可用</span>
                            <span style="color:#cbd5e1;font-size:12px;">›</span>
                        </div>
                        <div style="display:flex;align-items:center;padding:10px 0;border-bottom:1px solid #f8fafc;">
                            <span style="width:26px;height:26px;border-radius:6px;background:#eff6ff;color:#2563eb;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;margin-right:10px;">卡</span>
                            <span style="font-size:11px;color:#1e293b;flex:1;font-weight:500;">常用收款账户</span>
                            <span style="font-size:10px;color:#94a3b8;margin-right:6px;">支付宝</span>
                            <span style="color:#cbd5e1;font-size:12px;">›</span>
                        </div>
                        <div style="display:flex;align-items:center;padding:10px 0;border-bottom:1px solid #f8fafc;">
                            <span style="width:26px;height:26px;border-radius:6px;background:#fef3c7;color:#d97706;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;margin-right:10px;">机</span>
                            <span style="font-size:11px;color:#1e293b;flex:1;font-weight:500;">绑定手机号</span>
                            <span style="font-size:10px;color:#059669;background:#ecfdf5;padding:1px 6px;border-radius:8px;font-weight:600;margin-right:6px;">138****8888</span>
                            <span style="color:#cbd5e1;font-size:12px;">›</span>
                        </div>
                        <div style="display:flex;align-items:center;padding:10px 0;border-bottom:1px solid #f8fafc;">
                            <span style="width:26px;height:26px;border-radius:6px;background:#cffafe;color:#0891b2;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;margin-right:10px;">话</span>
                            <span style="font-size:11px;color:#1e293b;flex:1;font-weight:500;">${escapeHtml(serviceTelTitle)}</span>
                            <!-- 胶囊电话按钮 -->
                            <div style="display:flex;align-items:center;gap:4px;background:#eff6ff;border:1px solid #bfdbfe;padding:2px 8px;border-radius:12px;">
                                <span style="font-size:10px;color:${themeColor};font-weight:700;">${escapeHtml(serviceTel)}</span>
                                <span style="background:${themeColor};color:#fff;font-size:8px;padding:1px 4px;border-radius:6px;">拨打</span>
                            </div>
                        </div>
                        <div style="display:flex;align-items:center;padding:10px 0;border-bottom:1px solid #f8fafc;">
                            <span style="width:26px;height:26px;border-radius:6px;background:#e0e7ff;color:#4338ca;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;margin-right:10px;">保</span>
                            <span style="font-size:11px;color:#1e293b;flex:1;font-weight:500;">${escapeHtml(privacyTitle)}</span>
                            <span style="color:#cbd5e1;font-size:12px;">›</span>
                        </div>
                        <div style="display:flex;align-items:center;padding:10px 0;">
                            <span style="width:26px;height:26px;border-radius:6px;background:#ccfbf1;color:#0f766e;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;margin-right:10px;">述</span>
                            <span style="font-size:11px;color:#1e293b;flex:1;font-weight:500;">${escapeHtml(aboutTitle)}</span>
                            <span style="color:#cbd5e1;font-size:12px;">›</span>
                        </div>
                    </div>
                `;
            }
        }

        // ==============================================
        // 小程序端专属独立分类表格渲染与操作绑定
        // ==============================================
        // ==============================================
        // 小程序端专属分类图标拾取器弹窗
        // ==============================================
        function openCatIconPickerModal(catIdx) {
            const cat = miniappCategoriesList[catIdx];
            if (!cat) return;

            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.style.zIndex = '100020';

            const curIcon = cat.icon || guessCatIcon(cat.name, '');

            const groupsHtml = PRESET_CAT_ICONS.map(grp => {
                const iconCards = grp.icons.map(ic => {
                    const isSelected = (curIcon === ic.path);
                    return `
                        <div class="preset-icon-card" data-path="${escapeHtml(ic.path)}" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px 6px;border:1px solid ${isSelected ? '#1e58ff' : '#e2e8f0'};background:${isSelected ? '#eff6ff' : '#ffffff'};border-radius:10px;cursor:pointer;transition:all 0.15s;text-align:center;">
                            <div style="width:38px;height:38px;display:flex;align-items:center;justify-content:center;margin-bottom:6px;">
                                <img src="${escapeHtml(ic.path)}" style="width:34px;height:34px;object-fit:contain;" alt="${escapeHtml(ic.name)}">
                            </div>
                            <span style="font-size:11px;color:${isSelected ? '#1e58ff' : '#334155'};font-weight:${isSelected ? '700' : '500'};line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:90px;">${escapeHtml(ic.name)}</span>
                        </div>
                    `;
                }).join('');

                return `
                    <div style="margin-bottom:16px;">
                        <div style="font-size:12px;font-weight:700;color:#475569;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
                            <span style="width:3px;height:12px;background:#1e58ff;border-radius:2px;display:inline-block;"></span>
                            <span>${escapeHtml(grp.group)}</span>
                        </div>
                        <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(95px, 1fr));gap:8px;">
                            ${iconCards}
                        </div>
                    </div>
                `;
            }).join('');

            modal.innerHTML = `
                <div class="modal-card" style="max-width:680px;width:92vw;max-height:88vh;display:flex;flex-direction:column;border-radius:14px;overflow:hidden;background:#fff;box-shadow:0 20px 45px rgba(0,0,0,0.2);">
                    <div class="modal-header" style="display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid #f1f5f9;background:#f8fafc;">
                        <span style="font-weight:700;font-size:15px;color:#0f172a;display:flex;align-items:center;gap:8px;">
                            <span>设置分类图标</span>
                            <span style="font-size:12px;font-weight:600;background:#eff6ff;color:#1e58ff;padding:2px 8px;border-radius:10px;">「${escapeHtml(cat.name || '未命名')}」</span>
                        </span>
                        <span style="cursor:pointer;font-size:18px;color:#94a3b8;line-height:1;" id="btn-close-cat-icon-modal">✕</span>
                    </div>

                    <!-- 当前选中与自定义设置区 -->
                    <div style="padding:14px 18px;background:#ffffff;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
                        <div id="modal-icon-preview-box" style="width:44px;height:44px;border-radius:8px;background:#f8fafc;border:1.5px solid #cbd5e1;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;">
                            <img id="modal-icon-preview-img" src="${curIcon ? escapeHtml(curIcon) : ''}" style="width:30px;height:30px;object-fit:contain;${curIcon ? '' : 'display:none;'}" alt="" onerror="this.style.display='none'; document.getElementById('modal-icon-preview-placeholder')?.style.removeProperty('display');">
                            <span id="modal-icon-preview-placeholder" style="font-size:11px;color:#94a3b8;font-weight:600;${curIcon ? 'display:none;' : ''}">无</span>
                        </div>
                        <div style="flex:1;min-width:220px;">
                            <div style="font-size:11px;font-weight:600;color:#64748b;margin-bottom:4px;">自定义图标链接或服务器路径</div>
                            <div style="display:flex;gap:6px;">
                                <input type="text" id="modal-cat-icon-input" class="form-control" value="${escapeHtml(cat.icon || '')}" placeholder="如 /uploads/default/phone_15promax.svg 或 https://..." style="font-size:12px;height:32px;padding:4px 8px;">
                                <button type="button" class="btn btn-sm btn-primary" id="btn-apply-custom-icon" style="font-size:12px;white-space:nowrap;padding:0 12px;height:32px;">确定</button>
                            </div>
                        </div>
                        <div style="display:flex;gap:6px;">
                            <label class="btn btn-sm btn-outline" style="font-size:12px;padding:0 10px;height:32px;display:inline-flex;align-items:center;gap:4px;margin:0;cursor:pointer;white-space:nowrap;">
                                本地上传
                                <input type="file" id="modal-upload-cat-icon" accept="image/*" style="display:none;">
                            </label>
                            <button type="button" class="btn btn-sm btn-outline" id="btn-open-sys-medialib" style="font-size:12px;padding:0 10px;height:32px;white-space:nowrap;">
                                系统图库
                            </button>
                            <button type="button" class="btn btn-sm btn-outline" id="btn-clear-cat-icon" style="font-size:12px;padding:0 10px;height:32px;color:#ef4444;border-color:#fecaca;" title="清空当前图标">
                                清空
                            </button>
                        </div>
                    </div>

                    <!-- 预设官方矢量图库 -->
                    <div style="flex:1;overflow-y:auto;padding:16px 18px;max-height:50vh;">
                        <div style="font-size:11px;color:#64748b;margin-bottom:12px;background:#f8fafc;padding:6px 10px;border-radius:6px;border:1px solid #f1f5f9;">
                            点击下方任意分类图标，即刻选用并同步生效到手机小程序与右侧模拟器。
                        </div>
                        ${groupsHtml}
                    </div>

                    <div class="modal-footer" style="padding:10px 18px;background:#f8fafc;border-top:1px solid #f1f5f9;display:flex;justify-content:flex-end;">
                        <button type="button" class="btn btn-sm btn-secondary" id="btn-done-cat-icon-modal" style="font-size:12px;padding:5px 16px;">完成</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const closeModal = () => modal.remove();
            modal.querySelector('#btn-close-cat-icon-modal')?.addEventListener('click', closeModal);
            modal.querySelector('#btn-done-cat-icon-modal')?.addEventListener('click', closeModal);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal();
            });

            const selectIcon = (path) => {
                cat.icon = path;
                renderMiniappCategoriesTable();
                triggerSimulatorSync();
                SysUI.toast('分类图标已设置并实时生效', 'success');
                closeModal();
            };

            modal.querySelectorAll('.preset-icon-card').forEach(card => {
                card.addEventListener('click', function () {
                    const p = this.getAttribute('data-path');
                    if (p) selectIcon(p);
                });
            });

            modal.querySelector('#btn-apply-custom-icon')?.addEventListener('click', () => {
                const val = modal.querySelector('#modal-cat-icon-input')?.value.trim();
                selectIcon(val || '');
            });

            modal.querySelector('#btn-clear-cat-icon')?.addEventListener('click', () => {
                selectIcon('');
            });

            modal.querySelector('#btn-open-sys-medialib')?.addEventListener('click', () => {
                if (typeof window.openMediaLibraryModal === 'function') {
                    window.openMediaLibraryModal({
                        zIndex: 100050,
                        title: `为分类「${cat.name}」选择图标`,
                        onSelect: (url) => {
                            selectIcon(url);
                        }
                    });
                } else {
                    SysUI.toast('系统图库组件未就绪', 'error');
                }
            });

            modal.querySelector('#modal-upload-cat-icon')?.addEventListener('change', async function () {
                const file = this.files?.[0];
                if (!file) return;
                const fd = new FormData();
                fd.append('file', file);
                SysUI.toast('正在上传图标...', 'info');
                try {
                    const curApi = window.adminApi || window.api;
                    const res = await curApi.upload('/admin/upload/image', fd);
                    if (res && res.code === 200 && res.data?.url) {
                        selectIcon(res.data.url);
                    } else {
                        SysUI.toast(res ? res.msg : '上传失败', 'error');
                    }
                } catch (e) {
                    SysUI.toast('上传异常，请检查网络', 'error');
                }
            });
        }

        // ==============================================
        // 小程序端专属分类表格渲染与操作绑定
        // ==============================================
        function renderMiniappCategoriesTable() {
            const tableBox = document.getElementById('miniapp-cat-table-body');
            if (!tableBox) return;

            if (miniappCategoriesList.length === 0) {
                tableBox.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#94a3b8;padding:28px 0;font-size:13px;">暂无专属分类，点击上方「新增分类」或「智能生成别名」即可添加</td></tr>`;
                return;
            }

            tableBox.innerHTML = miniappCategoriesList.map((item, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === miniappCategoriesList.length - 1;

                const catOptions = systemCategories.map(sc => {
                    const sel = (String(sc.id) === String(item.cat_id)) ? 'selected' : '';
                    return `<option value="${sc.id}" ${sel}>[ID:${sc.id}] ${escapeHtml(sc.name)}</option>`;
                }).join('');

                const currentIcon = item.icon || guessCatIcon(item.name, '');
                const linkType = item.link_type || 'category';

                return `
                    <tr data-index="${idx}" style="border-bottom:1px solid #f1f5f9;background:${item.status !== 0 ? '#ffffff' : '#f8fafc'};transition:background 0.15s;">
                        <!-- 1. 排序 -->
                        <td style="padding:10px 4px;text-align:center;vertical-align:middle;">
                            <div style="display:flex;flex-direction:column;gap:1px;align-items:center;">
                                <button type="button" class="btn-cat-up" data-index="${idx}" ${isFirst ? 'disabled' : ''} style="border:none;background:none;cursor:${isFirst ? 'not-allowed' : 'pointer'};color:${isFirst ? '#cbd5e1' : '#64748b'};padding:0;line-height:1;font-size:10px;" title="上移">▲</button>
                                <span style="font-size:11px;color:#64748b;font-weight:700;">${idx + 1}</span>
                                <button type="button" class="btn-cat-down" data-index="${idx}" ${isLast ? 'disabled' : ''} style="border:none;background:none;cursor:${isLast ? 'not-allowed' : 'pointer'};color:${isLast ? '#cbd5e1' : '#64748b'};padding:0;line-height:1;font-size:10px;" title="下移">▼</button>
                            </div>
                        </td>

                        <!-- 2. 图标 (交互式卡片) -->
                        <td style="padding:10px 6px;text-align:center;vertical-align:middle;">
                            <div class="m-cat-icon-thumb" data-index="${idx}" title="点击更换图标" style="width:40px;height:40px;border-radius:10px;background:#f8fafc;border:1.5px solid #e2e8f0;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;overflow:hidden;position:relative;margin:0 auto;box-shadow:0 1px 2px rgba(0,0,0,0.03);transition:all 0.2s;">
                                ${currentIcon ? `<img src="${escapeHtml(currentIcon)}" style="width:26px;height:26px;object-fit:contain;" alt="icon" onerror="this.src='/uploads/default/dev_default.svg';">` : `<span style="font-size:16px;color:#94a3b8;">🖼</span>`}
                            </div>
                            <div class="m-cat-icon-btn-text" data-index="${idx}" style="font-size:10px;color:#2563eb;cursor:pointer;margin-top:2px;font-weight:600;line-height:1;">更换</div>
                        </td>

                        <!-- 3. 分类名称 -->
                        <td style="padding:10px 8px;vertical-align:middle;">
                            <input type="text" class="form-control m-cat-field" data-index="${idx}" data-field="name" value="${escapeHtml(item.name || '')}" placeholder="如: 手机" style="font-size:13px;font-weight:600;height:34px;padding:4px 10px;border-radius:6px;border:1px solid #cbd5e1;width:100%;box-sizing:border-box;">
                        </td>

                        <!-- 4. 关联系统品类 -->
                        <td style="padding:10px 8px;vertical-align:middle;">
                            <select class="form-control m-cat-field m-cat-cat-id" data-index="${idx}" data-field="cat_id" style="font-size:12px;height:34px;padding:4px 8px;border-radius:6px;border:1px solid #cbd5e1;width:100%;box-sizing:border-box;">
                                <option value="0" ${item.cat_id == 0 ? 'selected' : ''}>【不绑定 / 独立运营】</option>
                                ${catOptions}
                            </select>
                        </td>

                        <!-- 5. 角标提示 -->
                        <td style="padding:10px 6px;text-align:center;vertical-align:middle;">
                            <input type="text" class="form-control m-cat-field" data-index="${idx}" data-field="badge" value="${escapeHtml(item.badge || '')}" placeholder="选填" maxlength="4" style="font-size:11px;height:34px;text-align:center;padding:4px 6px;border-radius:6px;border:1px solid #cbd5e1;width:100%;box-sizing:border-box;">
                        </td>

                        <!-- 6. 跳转动作 (智能合并与动态目标) -->
                        <td style="padding:10px 8px;vertical-align:middle;">
                            <div style="display:flex;flex-direction:column;gap:4px;">
                                <select class="form-control m-cat-field m-cat-link-type" data-index="${idx}" data-field="link_type" style="font-size:12px;height:32px;padding:3px 8px;border-radius:6px;border:1px solid #cbd5e1;width:100%;box-sizing:border-box;">
                                    <option value="category" ${linkType === 'category' ? 'selected' : ''}>跳转分类页 (默认)</option>
                                    <option value="device" ${linkType === 'device' ? 'selected' : ''}>直达机型估价</option>
                                    <option value="coupon" ${linkType === 'coupon' ? 'selected' : ''}>直达领券专区</option>
                                    <option value="custom" ${linkType === 'custom' ? 'selected' : ''}>自定义页面路径</option>
                                </select>
                                ${linkType === 'category' ? `
                                    <div style="font-size:11px;color:#16a34a;display:flex;align-items:center;gap:3px;padding:1px 2px;">
                                        <span>✓ 自动联动所选品类</span>
                                    </div>
                                ` : (linkType === 'coupon' ? `
                                    <div style="font-size:11px;color:#ea580c;display:flex;align-items:center;gap:3px;padding:1px 2px;">
                                        <span>🎟️ 直达加价券专区</span>
                                    </div>
                                ` : `
                                    <input type="text" class="form-control m-cat-field" data-index="${idx}" data-field="link_value" value="${escapeHtml(item.link_value || '')}" placeholder="${linkType === 'device' ? '请输入机型ID (如 102)' : '请输入页面路径 (如 /pages/...)'}" style="font-size:11px;height:28px;padding:2px 8px;border-radius:5px;border:1px solid #cbd5e1;width:100%;box-sizing:border-box;">
                                `)}
                            </div>
                        </td>

                        <!-- 7. 显示开关 -->
                        <td style="padding:10px 4px;text-align:center;vertical-align:middle;">
                            <label style="cursor:pointer;display:inline-flex;align-items:center;justify-content:center;margin:0;">
                                <input type="checkbox" class="m-cat-status-chk" data-index="${idx}" ${item.status !== 0 ? 'checked' : ''} style="width:18px;height:18px;accent-color:#10b981;cursor:pointer;">
                            </label>
                        </td>

                        <!-- 8. 操作 -->
                        <td style="padding:10px 4px;text-align:center;vertical-align:middle;">
                            <button type="button" class="btn-del-cat" data-index="${idx}" title="删除此分类" style="border:1px solid #fecaca;background:#fff5f5;color:#ef4444;width:28px;height:28px;border-radius:6px;cursor:pointer;font-size:12px;display:inline-flex;align-items:center;justify-content:center;transition:all 0.15s;">✕</button>
                        </td>
                    </tr>
                `;
            }).join('');

            // 监听输入
            tableBox.querySelectorAll('.m-cat-field').forEach(input => {
                input.addEventListener('input', function () {
                    const idx = parseInt(this.getAttribute('data-index'), 10);
                    const field = this.getAttribute('data-field');
                    if (miniappCategoriesList[idx]) {
                        miniappCategoriesList[idx][field] = this.value.trim();
                        triggerSimulatorSync();
                    }
                });
                input.addEventListener('change', function () {
                    const idx = parseInt(this.getAttribute('data-index'), 10);
                    const field = this.getAttribute('data-field');
                    if (miniappCategoriesList[idx]) {
                        miniappCategoriesList[idx][field] = this.value.trim();
                        // 联动逻辑：如果修改了品类绑定，且跳转类型是分类，则自动同步 link_value
                        if (field === 'cat_id' && (!miniappCategoriesList[idx].link_type || miniappCategoriesList[idx].link_type === 'category')) {
                            miniappCategoriesList[idx].link_value = this.value.trim();
                        }
                        // 如果修改了跳转类型，刷新局部渲染展示相应输入框/提示
                        if (field === 'link_type') {
                            if (this.value === 'category') {
                                miniappCategoriesList[idx].link_value = String(miniappCategoriesList[idx].cat_id || '');
                            }
                            renderMiniappCategoriesTable();
                        }
                        triggerSimulatorSync();
                    }
                });
            });

            // 监听启用状态
            tableBox.querySelectorAll('.m-cat-status-chk').forEach(chk => {
                chk.addEventListener('change', function () {
                    const idx = parseInt(this.getAttribute('data-index'), 10);
                    if (miniappCategoriesList[idx]) {
                        miniappCategoriesList[idx].status = this.checked ? 1 : 0;
                        renderMiniappCategoriesTable();
                        triggerSimulatorSync();
                    }
                });
            });

            // 移动排序
            tableBox.querySelectorAll('.btn-cat-up').forEach(btn => {
                btn.addEventListener('click', function () {
                    const idx = parseInt(this.getAttribute('data-index'), 10);
                    if (idx > 0) {
                        const temp = miniappCategoriesList[idx];
                        miniappCategoriesList[idx] = miniappCategoriesList[idx - 1];
                        miniappCategoriesList[idx - 1] = temp;
                        renderMiniappCategoriesTable();
                        triggerSimulatorSync();
                    }
                });
            });

            tableBox.querySelectorAll('.btn-cat-down').forEach(btn => {
                btn.addEventListener('click', function () {
                    const idx = parseInt(this.getAttribute('data-index'), 10);
                    if (idx < miniappCategoriesList.length - 1) {
                        const temp = miniappCategoriesList[idx];
                        miniappCategoriesList[idx] = miniappCategoriesList[idx + 1];
                        miniappCategoriesList[idx + 1] = temp;
                        renderMiniappCategoriesTable();
                        triggerSimulatorSync();
                    }
                });
            });

            // 图标点击与更换
            tableBox.querySelectorAll('.m-cat-icon-thumb, .m-cat-icon-btn-text').forEach(btn => {
                btn.addEventListener('click', function () {
                    const idx = parseInt(this.getAttribute('data-index'), 10);
                    openCatIconPickerModal(idx);
                });
            });

            // 删除
            tableBox.querySelectorAll('.btn-del-cat').forEach(btn => {
                btn.addEventListener('click', function () {
                    const idx = parseInt(this.getAttribute('data-index'), 10);
                    if (miniappCategoriesList[idx]) {
                        miniappCategoriesList.splice(idx, 1);
                        renderMiniappCategoriesTable();
                        triggerSimulatorSync();
                    }
                });
            });
        }

        // 新增专属分类按钮
        document.getElementById('btn-add-miniapp-cat')?.addEventListener('click', () => {
            const newId = String(Date.now()).slice(-4);
            miniappCategoriesList.push({
                id: newId,
                name: '新品类',
                cat_id: 0,
                badge: '',
                icon: guessCatIcon('新品类', ''),
                link_type: 'category',
                link_value: '',
                status: 1,
                sort: miniappCategoriesList.length + 1
            });
            renderMiniappCategoriesTable();
            triggerSimulatorSync();
        });

        // 从系统分类同步生成别名
        document.getElementById('btn-sync-system-cats')?.addEventListener('click', async () => {
            const confirmed = await SysUI.confirm('确定要根据系统分类重新生成小程序分类别名吗？当前未保存的配置将被替换为提取出的精简名称。', {
                title: '同步确认',
                type: 'info'
            });
            if (confirmed) {
                miniappCategoriesList = systemCategories.map((sc, idx) => {
                    const rawName = sc.name || '';
                    let clean = rawName.replace(/器材|电脑|数码|设备|智能|二手|回收/g, '');
                    if (clean.length < 2) clean = rawName.substring(0, 4);
                    return {
                        id: String(sc.id || (idx + 1)),
                        name: clean || rawName,
                        cat_id: sc.id || 0,
                        badge: idx === 0 ? '高价' : (idx === 3 ? '热' : ''),
                        icon: guessCatIcon(clean || rawName, sc.icon || ''),
                        link_type: 'category',
                        link_value: String(sc.id || ''),
                        status: 1,
                        sort: idx + 1
                    };
                });
                renderMiniappCategoriesTable();
                triggerSimulatorSync();
                SysUI.toast('已成功生成小程序分类快捷名称', 'success');
            }
        });

        // 初始渲染独立分类表格
        renderMiniappCategoriesTable();

        // 显隐 AppSecret 切换
        document.getElementById('btn-toggle-miniapp-secret')?.addEventListener('click', function () {
            const inp = document.getElementById('cfg-miniapp-secret');
            if (inp) {
                inp.type = inp.type === 'password' ? 'text' : 'password';
            }
        });

        // 连通性测试按钮 (实时握手微信公众平台 API)
        document.getElementById('btn-test-wechat-cred')?.addEventListener('click', async function () {
            const btn = this;
            const appId = document.getElementById('cfg-miniapp-appid')?.value.trim() || '';
            const secret = document.getElementById('cfg-miniapp-secret')?.value.trim() || '';
            const resultBox = document.getElementById('wechat-cred-test-result');

            if (!appId || !secret) {
                SysUI.toast('请先填写小程序 AppID 与 AppSecret', 'warning');
                return;
            }

            btn.disabled = true;
            btn.innerHTML = '<span style="display:inline-block;width:12px;height:12px;border:2px solid #1e58ff;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;margin-right:6px;vertical-align:middle;"></span> 正在连接微信公众平台测试...';
            if (resultBox) {
                resultBox.style.display = 'block';
                resultBox.style.background = '#f8fafc';
                resultBox.style.borderColor = '#cbd5e1';
                resultBox.style.color = '#475569';
                resultBox.innerHTML = '正在发起微信接口握手通信验证，请稍候...';
            }

            try {
                const res = await api.post('/admin/config/testWechatCredentials', {
                    appid: appId,
                    secret: secret
                });
                btn.disabled = false;
                btn.innerHTML = '⚡ 测试微信凭据连通性';

                if (resultBox) {
                    if (res && res.code === 200) {
                        resultBox.style.display = 'block';
                        resultBox.style.background = '#f0fdf4';
                        resultBox.style.borderColor = '#86efac';
                        resultBox.style.color = '#15803d';
                        resultBox.innerHTML = `<strong>✅ 连通验证成功：</strong>${escapeHtml(res.msg || '微信公众平台开发凭证验证通过！接口联通正常。')}`;
                        SysUI.toast('微信小程序凭据联通正常！', 'success');
                    } else {
                        resultBox.style.display = 'block';
                        resultBox.style.background = '#fef2f2';
                        resultBox.style.borderColor = '#fca5a5';
                        resultBox.style.color = '#b91c1c';
                        resultBox.innerHTML = `<strong>❌ 验证未通过：</strong>${escapeHtml(res ? res.msg : '请求失败，请检查参数')}`;
                        SysUI.toast(res ? res.msg : '微信凭据验证失败', 'error');
                    }
                }
            } catch (e) {
                btn.disabled = false;
                btn.innerHTML = '⚡ 测试微信凭据连通性';
                if (resultBox) {
                    resultBox.style.display = 'block';
                    resultBox.style.background = '#fef2f2';
                    resultBox.style.borderColor = '#fca5a5';
                    resultBox.style.color = '#b91c1c';
                    resultBox.innerHTML = `<strong>❌ 请求异常：</strong>无法连接服务器接口，请稍后重试`;
                }
            }
        });

        // 防抖触发模拟器同步
        let syncTimer = null;
        function triggerSimulatorSync() {
            if (syncTimer) clearTimeout(syncTimer);
            syncTimer = setTimeout(renderSimulator, 40);
        }

        // 监听所有输入与下拉变动，即时反映到右侧模拟器
        container.querySelectorAll('#form-miniapp-decoration input, #form-miniapp-decoration select, #form-miniapp-decoration textarea').forEach(el => {
            el.addEventListener('input', triggerSimulatorSync);
            el.addEventListener('change', triggerSimulatorSync);
        });

        // 切换模拟器视图 (首页 vs 个人中心)
        document.getElementById('btn-sim-page-home')?.addEventListener('click', () => {
            simActivePage = 'home';
            document.getElementById('btn-sim-page-home').className = 'btn btn-sm btn-primary';
            document.getElementById('btn-sim-page-user').className = 'btn btn-sm btn-outline';
            renderSimulator();
        });

        document.getElementById('btn-sim-page-user')?.addEventListener('click', () => {
            simActivePage = 'user';
            document.getElementById('btn-sim-page-user').className = 'btn btn-sm btn-primary';
            document.getElementById('btn-sim-page-home').className = 'btn btn-sm btn-outline';
            renderSimulator();
        });

        // 模拟器底部 TabBar 点击交互
        container.querySelectorAll('.sim-tab-item').forEach(item => {
            item.addEventListener('click', function () {
                const tab = this.getAttribute('data-tab');
                if (tab === 'user') {
                    document.getElementById('btn-sim-page-user')?.click();
                } else {
                    document.getElementById('btn-sim-page-home')?.click();
                }
            });
        });

        // ==============================================
        // 恢复推荐默认值
        // ==============================================
        document.getElementById('btn-reset-miniapp-defaults')?.addEventListener('click', async () => {
            const confirmed = await SysUI.confirm('确定要恢复小程序全套推荐装修默认值吗？当前未保存的配置将被覆盖。', {
                title: '恢复默认值确认',
                type: 'warning'
            });
            if (confirmed) {
                for (const [key, val] of Object.entries(DEFAULT_CONFIGS)) {
                    // 安全保护：恢复装修默认值时不清除已配置的微信开发凭据与主体标识
                    if (key === 'miniapp_appid' || key === 'miniapp_secret' || key === 'miniapp_original_id') {
                        continue;
                    }
                    const el = document.getElementById('cfg-' + key.replace(/_/g, '-'));
                    if (el) {
                        if (el.type === 'checkbox') {
                            el.checked = (val !== '0');
                        } else {
                            el.value = val;
                        }
                    }
                }
                const inpPicker = document.getElementById('cfg-theme-color-picker');
                if (inpPicker) inpPicker.value = DEFAULT_CONFIGS.miniapp_theme_color;

                // 恢复默认独立分类
                miniappCategoriesList = systemCategories.map((sc, idx) => {
                    const rawName = sc.name || '';
                    let clean = rawName.replace(/器材|电脑|数码|设备|智能|二手|回收/g, '');
                    if (clean.length < 2) clean = rawName.substring(0, 4);
                    return {
                        id: String(sc.id || (idx + 1)),
                        name: clean || rawName,
                        cat_id: sc.id || 0,
                        badge: idx === 0 ? '高价' : (idx === 3 ? '热' : ''),
                        icon: guessCatIcon(clean || rawName, sc.icon || ''),
                        link_type: 'category',
                        link_value: String(sc.id || ''),
                        status: 1,
                        sort: idx + 1
                    };
                });
                renderMiniappCategoriesTable();
                SysUI.toast('已重置为官方推荐默认装修参数', 'info');
                renderSimulator();
            }
        });

        // ==============================================
        // 保存全部小程序装修配置并生效
        // ==============================================
        document.getElementById('btn-save-miniapp-all')?.addEventListener('click', async function () {
            const btn = this;
            btn.disabled = true;
            btn.innerText = '正在保存并发布...';

            const payload = {
                miniapp_appid: document.getElementById('cfg-miniapp-appid')?.value.trim() || '',
                miniapp_secret: document.getElementById('cfg-miniapp-secret')?.value.trim() || '',
                miniapp_app_name: document.getElementById('cfg-miniapp-app-name')?.value.trim() || '启灵回收',
                miniapp_original_id: document.getElementById('cfg-miniapp-original-id')?.value.trim() || '',
                miniapp_wx_login_enabled: document.getElementById('cfg-miniapp-wx-login-enabled')?.checked ? '1' : '0',
                miniapp_wx_phone_enabled: document.getElementById('cfg-miniapp-wx-phone-enabled')?.checked ? '1' : '0',
                miniapp_guest_appraisal: document.getElementById('cfg-miniapp-guest-appraisal')?.checked ? '1' : '0',
                wechat_appid: document.getElementById('cfg-miniapp-appid')?.value.trim() || '',
                miniapp_theme_color: document.getElementById('cfg-miniapp-theme-color')?.value.trim() || '#1e58ff',
                miniapp_nav_title: document.getElementById('cfg-miniapp-nav-title')?.value.trim() || '启灵专业数码回收',
                miniapp_nav_bg: document.getElementById('cfg-miniapp-nav-bg')?.value || 'gradient',
                miniapp_card_radius: document.getElementById('cfg-miniapp-card-radius')?.value || '20',
                miniapp_search_placeholder: document.getElementById('cfg-miniapp-search-placeholder')?.value.trim() || '搜索你想卖的手机 / 平板 / 电脑型号',
                miniapp_hero_enabled: document.getElementById('cfg-miniapp-hero-enabled')?.checked ? '1' : '0',
                miniapp_hero_gradient: document.getElementById('cfg-miniapp-hero-gradient')?.value || 'blue',
                miniapp_hero_tag: document.getElementById('cfg-miniapp-hero-tag')?.value.trim() || '启灵高价回收 · 官方验机',
                miniapp_hero_title: document.getElementById('cfg-miniapp-hero-title')?.value.trim() || '旧机别放着，立即变现',
                miniapp_hero_subtitle: document.getElementById('cfg-miniapp-hero-subtitle')?.value.trim() || '顺丰包邮 · 隐私深度清除 · 质检一致当天打款',
                miniapp_category_enabled: document.getElementById('cfg-miniapp-category-enabled')?.checked ? '1' : '0',
                miniapp_category_title: document.getElementById('cfg-miniapp-category-title')?.value.trim() || '全品类数码回收',
                miniapp_category_limit: document.getElementById('cfg-miniapp-category-limit')?.value.trim() || '10',
                miniapp_category_cols: document.getElementById('cfg-miniapp-category-cols')?.value || '5',
                miniapp_guarantee_enabled: document.getElementById('cfg-miniapp-guarantee-enabled')?.checked ? '1' : '0',
                miniapp_guarantee_1: document.getElementById('cfg-miniapp-guarantee-1')?.value.trim() || '隐私彻底清除',
                miniapp_guarantee_2: document.getElementById('cfg-miniapp-guarantee-2')?.value.trim() || '顺丰双向包邮',
                miniapp_guarantee_3: document.getElementById('cfg-miniapp-guarantee-3')?.value.trim() || '验机极速放款',
                miniapp_guarantee_4: document.getElementById('cfg-miniapp-guarantee-4')?.value.trim() || '7天估价锁定',
                miniapp_process_enabled: document.getElementById('cfg-miniapp-process-enabled')?.checked ? '1' : '0',
                miniapp_process_title: document.getElementById('cfg-miniapp-process-title')?.value.trim() || '简单三步 · 轻松变现',
                miniapp_step_1_title: document.getElementById('cfg-miniapp-step-1-title')?.value.trim() || '在线估价',
                miniapp_step_1_desc: document.getElementById('cfg-miniapp-step-1-desc')?.value.trim() || '30秒选项测机',
                miniapp_step_2_title: document.getElementById('cfg-miniapp-step-2-title')?.value.trim() || '顺丰寄件/上门',
                miniapp_step_2_desc: document.getElementById('cfg-miniapp-step-2-desc')?.value.trim() || '全程包邮免密',
                miniapp_step_3_title: document.getElementById('cfg-miniapp-step-3-title')?.value.trim() || '验机打款',
                miniapp_step_3_desc: document.getElementById('cfg-miniapp-step-3-desc')?.value.trim() || '直达微信零钱',
                miniapp_hot_title: document.getElementById('cfg-miniapp-hot-title')?.value.trim() || '大家都在卖 · 热门回收机型',
                miniapp_hot_limit: document.getElementById('cfg-miniapp-hot-limit')?.value.trim() || '5',
                miniapp_coupon_section_enabled: document.getElementById('cfg-miniapp-coupon-section-enabled')?.checked ? '1' : '0',
                miniapp_coupon_sec_title: document.getElementById('cfg-miniapp-coupon-sec-title')?.value.trim() || '回收加价补贴专区',
                miniapp_coupon_sec_tag: document.getElementById('cfg-miniapp-coupon-sec-tag')?.value.trim() || '最高立补 ¥300',
                miniapp_coupon_float_enabled: document.getElementById('cfg-miniapp-coupon-float-enabled')?.checked ? '1' : '0',
                coupon_float_subtitle: document.getElementById('cfg-coupon-float-subtitle')?.value.trim() || '领¥300补贴',
                miniapp_tab_home_name: document.getElementById('cfg-miniapp-tab-home-name')?.value.trim() || '首页',
                miniapp_tab_estimate_name: document.getElementById('cfg-miniapp-tab-estimate-name')?.value.trim() || '估价回收',
                miniapp_tab_order_name: document.getElementById('cfg-miniapp-tab-order-name')?.value.trim() || '订单明细',
                miniapp_tab_user_name: document.getElementById('cfg-miniapp-tab-user-name')?.value.trim() || '我的',
                miniapp_service_tel_title: document.getElementById('cfg-miniapp-service-tel-title')?.value.trim() || '官方客服热线',
                miniapp_service_tel: document.getElementById('cfg-miniapp-service-tel')?.value.trim() || '400-800-8888',
                miniapp_service_hours: document.getElementById('cfg-miniapp-service-hours')?.value.trim() || '周一至周日 09:00 - 21:00',
                miniapp_privacy_title: document.getElementById('cfg-miniapp-privacy-title')?.value.trim() || '隐私深度清除保障说明',
                miniapp_privacy_content: document.getElementById('cfg-miniapp-privacy-content')?.value.trim() || '',
                miniapp_about_title: document.getElementById('cfg-miniapp-about-title')?.value.trim() || '关于启灵回收',
                miniapp_about_content: document.getElementById('cfg-miniapp-about-content')?.value.trim() || '',
                miniapp_custom_categories: JSON.stringify(miniappCategoriesList)
            };

            const saveRes = await api.post('/admin/config/saveConfigs', { configs: payload });
            btn.disabled = false;
            btn.innerText = '保存全部装修并发布';

            if (saveRes && saveRes.code === 200) {
                SysUI.toast('小程序与移动端全套装修配置保存成功！双端已即时同步生效', 'success');
            } else {
                SysUI.toast(saveRes ? saveRes.msg : '保存失败，请检查网络或参数', 'error');
            }
        });

        // 初始渲染右侧模拟器
        renderSimulator();
    }

    window.renderMiniappDecorationView = renderMiniappDecorationView;

})(window);
