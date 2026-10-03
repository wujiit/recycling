/**
 * 启灵回收系统 - 前台主入口
 * 包含行业模板加载、特色板块（废品行情/金价换算）、页脚与Banner轮播初始化
 */
(function(window) {
    'use strict';

    const HomeApp = window.HomeApp || {};
    const state = HomeApp.state || {};
    const api = HomeApp.api || {};
    const SysUI = HomeApp.SysUI || window.SysUI;
    const escapeHtml = HomeApp.escapeHtml || window.escapeHtml || function(s) { return s; };

            // 1. 初始化平台行业模板配置
            async function initPlatformTemplate() {
                const res = await api.request('/api/appraisal/getPlatformInfo');
                if (res && res.code === 200 && res.data) {
                    state.platformMeta = res.data;
                    applyTemplateStyles(res.data);
                }
            }

            function applyTemplateStyles(meta) {
                // 1. SEO 标题与 Meta 信息深度绑定
                const pageTitle = meta.seo_title || `${meta.site_name || '启灵回收'} · ${meta.slogan || '全品类回收服务平台'}`;
                document.getElementById('page-title').innerText = pageTitle;

                const metaKeywords = document.getElementById('page-keywords');
                if (metaKeywords && meta.seo_keywords) {
                    metaKeywords.setAttribute('content', meta.seo_keywords);
                }
                const metaDesc = document.getElementById('page-description');
                if (metaDesc && (meta.seo_description || meta.slogan)) {
                    metaDesc.setAttribute('content', meta.seo_description || meta.slogan);
                }
                const favEl = document.getElementById('page-favicon');
                if (favEl && meta.site_favicon) {
                    favEl.setAttribute('href', meta.site_favicon);
                }

                // 2. 品牌与 Logo 定制 (杜绝长文本挤占导航栏，优先展示精巧 Logo 与短品牌名)
                const brandName = meta.brand_name || (meta.site_name ? meta.site_name.split('·')[0].trim() : '启灵回收');
                const brandTextEl = document.getElementById('brand-text');
                if (brandTextEl) brandTextEl.innerText = brandName;

                const brandLogoImg = document.getElementById('brand-logo-img');
                const brandIcon = document.getElementById('brand-icon');
                if (meta.site_logo && brandLogoImg) {
                    brandLogoImg.src = meta.site_logo;
                    brandLogoImg.style.display = 'block';
                    if (brandIcon) brandIcon.style.display = 'none';
                } else if (brandIcon) {
                    if (brandLogoImg) brandLogoImg.style.display = 'none';
                    brandIcon.style.display = 'flex';
                    brandIcon.innerText = brandName ? brandName.charAt(0) : '启';
                }

                // 3. 首页首屏与双模式（极速搜索 vs 品牌画卷轮播 Banner）全面数据驱动初始化
                initHeroAndCarousel(meta);

                // 3.1 实时动态播报栏按后台配置初始化
                initLiveTicker();

                // 3.2 行业专属特色板块初始化 (废品行情看板 / 贵金属牌价)
                renderIndustryFeatureSection(meta);

                // 4. 商业级全功能大底座 (Mega Footer) 渲染与条款链接注入
                renderMegaFooter(meta);

                // 4.1 首页常见问题解答 (FAQ) 动态渲染
                renderHomeFaq(meta);

                // 4.2 首页 3 步极速回收服务流程动态渲染
                renderHomeProcess(meta);

                // 支持免改数据库的即时 URL 参数前台实景预览模式 (?preview_theme=... & ?preview_mode=...)
                const urlParams = new URLSearchParams(window.location.search);
                const previewThemeKey = urlParams.get('preview_theme');
                const previewModeKey = urlParams.get('preview_mode');

                const themePresetMap = {
                    tech_blue: { name: '科技数码蓝', primary: '#1e58ff', hover: '#1645cf', light: '#eef3ff', accent: '#10b981', gradient: 'linear-gradient(135deg, #1e58ff 0%, #3b82f6 100%)' },
                    eco_green: { name: '生态环保绿', primary: '#10b981', hover: '#059669', light: '#ecfdf5', accent: '#f59e0b', gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' },
                    sunset_orange: { name: '活力日落橙', primary: '#ea580c', hover: '#c2410c', light: '#fff7ed', accent: '#2563eb', gradient: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)' },
                    luxury_gold: { name: '尊贵奢品金', primary: '#d97706', hover: '#b45309', light: '#fef3c7', accent: '#0f172a', gradient: 'linear-gradient(135deg, #b45309 0%, #d97706 100%)' },
                    cyan_fresh: { name: '清爽极简青', primary: '#0891b2', hover: '#0e7490', light: '#ecfeff', accent: '#10b981', gradient: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)' },
                    cyber_dark: { name: '极客机甲黑', primary: '#6366f1', hover: '#4f46e5', light: '#eef2ff', accent: '#ec4899', gradient: 'linear-gradient(135deg, #4f46e5 0%, #818cf8 100%)' }
                };

                let activePreviewTheme = null;
                if (previewThemeKey && themePresetMap[previewThemeKey]) {
                    activePreviewTheme = themePresetMap[previewThemeKey];
                }

                if (previewModeKey) {
                    meta.key = previewModeKey;
                    if (previewModeKey === 'scrap') {
                        meta.hero_title = '废旧物资再生 · 绿色循环倡导者';
                        meta.hero_subtitle = '废铜废铝废钢 · 电线电缆 · 动力电池 · 上门过磅结算';
                    } else if (previewModeKey === 'auto') {
                        meta.hero_title = '全国二手车与报废车高价回收网';
                        meta.hero_subtitle = '免费上门验车拖车 · 当天合法过户 · 当面结清全款';
                    } else if (previewModeKey === 'luxury') {
                        meta.hero_title = '奢侈品名表名包黄金高价变现';
                        meta.hero_subtitle = '瑞士名表 · 大牌箱包 · 黄金首饰 · 权威质检 · 现金到账';
                    } else if (previewModeKey === 'appliance') {
                        meta.hero_title = '二手大家电上门拆卸回收网';
                        meta.hero_subtitle = '空调冰箱洗衣机电视 · 师傅免费上门拆装搬运 · 以旧换新';
                    }
                    // 重新执行行业专属板块渲染
                    renderIndustryFeatureSection(meta);
                }

                // 5. 动态注入全站视觉主题风格体系 (科技蓝、生态绿、日落橙、尊贵金、极简青等)
                const primaryColor = (activePreviewTheme ? activePreviewTheme.primary : null) || meta.theme_primary || meta.theme_color || '#1e58ff';
                const hoverColor = (activePreviewTheme ? activePreviewTheme.hover : null) || meta.theme_hover || '#1645cf';
                const lightColor = (activePreviewTheme ? activePreviewTheme.light : null) || meta.theme_light || '#eef3ff';
                const accentColor = (activePreviewTheme ? activePreviewTheme.accent : null) || meta.theme_accent || '#10b981';
                const gradient = (activePreviewTheme ? activePreviewTheme.gradient : null) || meta.theme_gradient || `linear-gradient(135deg, ${primaryColor} 0%, #3b82f6 100%)`;

                document.documentElement.style.setProperty('--primary', primaryColor);
                document.documentElement.style.setProperty('--primary-hover', hoverColor);
                document.documentElement.style.setProperty('--primary-light', lightColor);
                document.documentElement.style.setProperty('--accent', accentColor);
                document.documentElement.style.setProperty('--primary-gradient', gradient);

                // 动态计算 Hex 对应的 rgba 发光阴影
                if (/^#([A-Fa-f0-9]{6})$/.test(primaryColor)) {
                    const r = parseInt(primaryColor.slice(1, 3), 16);
                    const g = parseInt(primaryColor.slice(3, 5), 16);
                    const b = parseInt(primaryColor.slice(5, 7), 16);
                    document.documentElement.style.setProperty('--primary-shadow', `rgba(${r}, ${g}, ${b}, 0.28)`);
                }

                // 若处于临时预览模式，顶部浮动高质感预览提示条
                if (activePreviewTheme || previewModeKey) {
                    renderPreviewBannerNotification(activePreviewTheme, previewModeKey);
                }

                // 定制搜索提示文案
                const searchInput = document.getElementById('main-search-input');
                if (searchInput) {
                    if (meta.key === 'scrap') {
                        searchInput.placeholder = '输入废旧物资种类，如：光亮紫铜线、黄铜阀门、铝合金门窗、铅酸电瓶、废纸箱...';
                    } else if (meta.key === 'auto') {
                        searchInput.placeholder = '输入车型名称，如：丰田卡罗拉、特斯拉Model 3、比亚迪宋、报废面包车...';
                    } else if (meta.key === 'digital') {
                        searchInput.placeholder = '输入数码型号，如：iPhone 15 Pro, Mate 60, 小米14, 联想电脑...';
                    } else if (meta.key === 'luxury') {
                        searchInput.placeholder = '输入奢品名表/黄金名称，如：劳力士黑水鬼、欧米茄、爱马仕铂金包、足金999...';
                    } else if (meta.key === 'appliance') {
                        searchInput.placeholder = '输入家电型号，如：格力空调挂机、美的立柜空调、海尔双门冰箱、小天鹅滚筒...';
                    } else {
                        searchInput.placeholder = '输入数码、废品金属、车型、名表黄金或家电型号搜索实时行情...';
                    }
                }

                // 预渲染履约模式与收款方式
                renderFulfillmentCards();
                renderPayoutCards();

                // 响应加价券营销与前台各区域展示开关 (高度自定义配置)
                applyCouponDisplayConfigs(meta);
            }

            // ==========================================
            // 渲染前台免改库即时实景预览悬浮提示条
            // ==========================================
            function renderPreviewBannerNotification(theme, modeKey) {
                if (document.getElementById('ql-preview-bar')) return;
                const bar = document.createElement('div');
                bar.id = 'ql-preview-bar';
                bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:linear-gradient(90deg, #0f172a 0%, #1e293b 100%);color:#ffffff;padding:9px 20px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 4px 16px rgba(0,0,0,0.3);font-size:13px;flex-wrap:wrap;gap:10px;border-bottom:2px solid #3b82f6;';

                let text = '<strong>前台实景效果即时预览中</strong>：';
                if (theme) text += `主题配色【<span style="color:#60a5fa;font-weight:700;">${escapeHtml(theme.name)}</span>】 `;
                if (modeKey) text += `业务模式【<span style="color:#34d399;font-weight:700;">${escapeHtml(modeKey)}</span>】 `;
                text += '<span style="font-size:11px;color:#94a3b8;margin-left:4px;">(当前为免修改数据库的安全临时体验)</span>';

                bar.innerHTML = `
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;background:#3b82f6;color:#fff;font-size:13px;">👁️</span>
                        <div>${text}</div>
                    </div>
                    <div style="display:flex;gap:10px;align-items:center;">
                        <a href="/admin.html" style="background:#2563eb;color:#fff;padding:4px 14px;border-radius:6px;text-decoration:none;font-size:12px;font-weight:600;display:inline-flex;align-items:center;gap:4px;">
                            返回后台应用
                        </a>
                        <a href="/" style="background:#334155;color:#e2e8f0;padding:4px 12px;border-radius:6px;text-decoration:none;font-size:12px;">
                            退出预览
                        </a>
                    </div>
                `;
                document.body.prepend(bar);
                document.body.style.paddingTop = '46px';
            }

            // ==========================================
            // 响应加价券营销与前台各区域展示开关 (高度自定义配置)
            // ==========================================
            function applyCouponDisplayConfigs(meta) {
                if (!meta) return;

                const sysEnabled = meta.coupon_system_enabled !== false;
                const navEnabled = sysEnabled && (meta.coupon_nav_entry_enabled !== false);
                const showcaseEnabled = sysEnabled && (meta.coupon_home_showcase_enabled !== false);
                const floatEnabled = sysEnabled && (meta.coupon_float_widget_enabled !== false);

                // 1. 顶部主导航栏「领加价券」入口按钮
                const navBtn = document.getElementById('btn-open-coupons');
                if (navBtn) {
                    navBtn.style.display = navEnabled ? 'inline-flex' : 'none';
                }

                // 2. 首页核心「回收加价补贴专区」横幅展位
                const showcaseBar = document.getElementById('coupon-showcase-bar');
                if (showcaseBar) {
                    showcaseBar.style.display = (showcaseEnabled && state.availableCoupons && state.availableCoupons.length > 0) ? 'block' : 'none';
                }

                // 3. 页面右下角「悬浮补贴福利挂件」与位置定制
                const floatWidget = document.getElementById('floating-coupon-widget');
                if (floatWidget) {
                    if (floatEnabled) {
                        floatWidget.style.display = 'flex';
                        // 动态设置悬浮挂件垂直底边距（防遮挡回到顶部/在线客服按钮）
                        const bottomOffset = parseInt(meta.coupon_float_bottom_offset, 10) || 145;
                        floatWidget.style.bottom = bottomOffset + 'px';

                        // 动态定制标语
                        const titEl = floatWidget.querySelector('.floating-coupon-tit');
                        if (titEl && meta.coupon_float_title) {
                            titEl.innerText = meta.coupon_float_title;
                        }
                        const subEl = floatWidget.querySelector('.floating-coupon-sub');
                        if (subEl && meta.coupon_float_subtitle) {
                            subEl.innerText = meta.coupon_float_subtitle;
                        }
                    } else {
                        floatWidget.style.display = 'none';
                    }
                }
            }

            // ==========================================
            // 商业级 Mega Footer 渲染
            // ==========================================
            function renderMegaFooter(meta) {
                if (!meta) return;

                // 1. 品牌愿景与口号
                const brandName = meta.brand_name || meta.site_name || '启灵回收';
                const megaBrandName = document.getElementById('mega-brand-name');
                if (megaBrandName) megaBrandName.innerText = brandName;

                const megaBrandLogo = document.getElementById('mega-brand-logo');
                if (megaBrandLogo && meta.site_logo) {
                    megaBrandLogo.src = meta.site_logo;
                }

                const megaDesc = document.getElementById('mega-footer-desc');
                if (megaDesc && meta.footer_desc) {
                    megaDesc.innerText = meta.footer_desc;
                }

                // 1.1 动态信任背书认证标签 (支持后台自定义)
                const trustTagsContainer = document.getElementById('mega-trust-tags');
                if (trustTagsContainer) {
                    const rawTags = (meta.footer_trust_tags !== undefined && meta.footer_trust_tags !== null)
                        ? String(meta.footer_trust_tags).trim()
                        : '顺丰速运合作, 绿色循环回收, 数据安全清除';
                    if (rawTags) {
                        const tagList = rawTags.split(/[,，\n\r]+/).map(t => t.trim()).filter(Boolean);
                        if (tagList.length > 0) {
                            const icons = [
                                '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>',
                                '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>',
                                '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>',
                                '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 10h2v4h-2zm0 6h2v2h-2z"/></svg>'
                            ];
                            trustTagsContainer.innerHTML = tagList.map((tagText, idx) => {
                                const icon = icons[idx % icons.length];
                                return `<span class="footer-trust-tag">${icon}${escapeHtml(tagText)}</span>`;
                            }).join('');
                            trustTagsContainer.style.display = 'flex';
                        } else {
                            trustTagsContainer.style.display = 'none';
                        }
                    } else {
                        trustTagsContainer.style.display = 'none';
                    }
                }

                // 2. 动态服务与条款列表注入 (统一单列规整呈现，杜绝伪5栏畸形排版)
                function renderFooterArticlesList(articles) {
                    if (!articles) return;
                    let allArticles = [];
                    if (Array.isArray(articles.all) && articles.all.length > 0) {
                        allArticles = [...articles.all];
                    } else if (Array.isArray(articles)) {
                        allArticles = [...articles];
                    } else if (typeof articles === 'object') {
                        const pool = [
                            ...(articles.guide || []),
                            ...(articles.about || []),
                            ...(articles.legal || [])
                        ];
                        const seen = new Set();
                        for (const item of pool) {
                            const key = item.slug || item.id;
                            if (key && !seen.has(key)) {
                                seen.add(key);
                                allArticles.push(item);
                            }
                        }
                    }

                    // 统一按 sort_order 升序排序
                    allArticles.sort((a, b) => (parseInt(a.sort_order, 10) || 100) - (parseInt(b.sort_order, 10) || 100));

                    const allLinksList = document.getElementById('mega-links-all');
                    if (allLinksList) {
                        if (allArticles.length > 0) {
                            allLinksList.innerHTML = allArticles.map(item => {
                                const hotBadge = item.is_hot ? ' <span class="footer-link-hot">推荐</span>' : '';
                                const identifier = item.slug || item.id;
                                return `<li><a class="footer-link" onclick="window.openArticleModal('${escapeHtml(identifier)}')">${escapeHtml(item.title)}${hotBadge}</a></li>`;
                            }).join('');
                        } else {
                            allLinksList.innerHTML = '';
                        }
                    }

                    // 兼容旧模板中的独立容器
                    const guideList = document.getElementById('mega-links-guide');
                    if (guideList) {
                        if (Array.isArray(articles.guide) && articles.guide.length > 0) {
                            guideList.innerHTML = articles.guide.map(item => {
                                const hotBadge = item.is_hot ? ' <span class="footer-link-hot">推荐</span>' : '';
                                const identifier = item.slug || item.id;
                                return `<li><a class="footer-link" onclick="window.openArticleModal('${escapeHtml(identifier)}')">${escapeHtml(item.title)}${hotBadge}</a></li>`;
                            }).join('');
                        } else {
                            guideList.innerHTML = '';
                        }
                    }

                    const aboutList = document.getElementById('mega-links-about');
                    if (aboutList) {
                        if (Array.isArray(articles.about) && articles.about.length > 0) {
                            aboutList.innerHTML = articles.about.map(item => {
                                const hotBadge = item.is_hot ? ' <span class="footer-link-hot">必看</span>' : '';
                                const identifier = item.slug || item.id;
                                return `<li><a class="footer-link" onclick="window.openArticleModal('${escapeHtml(identifier)}')">${escapeHtml(item.title)}${hotBadge}</a></li>`;
                            }).join('');
                        } else {
                            aboutList.innerHTML = '';
                        }
                    }
                }

                if (meta.footer_articles !== undefined) {
                    renderFooterArticlesList(meta.footer_articles);
                } else {
                    // 若当前平台元数据缓存中无 footer_articles，主动拉取真实已发布条款并无缝覆盖渲染
                    api.request('/api/article/footer').then(res => {
                        if (res && res.code === 200 && res.data) {
                            meta.footer_articles = res.data;
                            renderFooterArticlesList(res.data);
                        }
                    }).catch(() => {});
                }

                // 3. 客服联系方式
                const tel = meta.footer_service_tel || meta.service_tel || '400-800-8888';
                const megaTel = document.getElementById('mega-footer-tel');
                if (megaTel) megaTel.innerText = tel;

                const time = meta.footer_service_time || '周一至周日 09:00 - 21:00 (节假日不休)';
                const megaTime = document.getElementById('mega-footer-time');
                if (megaTime) megaTime.innerText = time;

                const email = meta.footer_service_email || 'service@qilingrecycle.com';
                const megaEmail = document.getElementById('mega-footer-email');
                if (megaEmail) megaEmail.innerText = email;

                const addr = meta.footer_address || '深圳市南山区高新南一道科兴科学园B座302室';
                const megaAddr = document.getElementById('mega-footer-address');
                if (megaAddr) megaAddr.innerText = addr;

                // 4. 二维码卡片与自适应单双码排版
                const qrContainer = document.getElementById('mega-footer-qr-container');
                const qrWechatImg = document.getElementById('mega-qr-wechat-img');
                const qrWechatTitle = document.getElementById('mega-qr-wechat-title');
                if (qrWechatImg && meta.footer_qrcode_wechat) {
                    qrWechatImg.src = meta.footer_qrcode_wechat;
                }
                if (qrWechatTitle && meta.footer_qrcode_wechat_title) {
                    qrWechatTitle.innerText = meta.footer_qrcode_wechat_title;
                }

                const qrMpBox = document.getElementById('mega-qr-mp-box');
                const qrMpImg = document.getElementById('mega-qr-mp-img');
                const qrMpTitle = document.getElementById('mega-qr-mp-title');
                const hasMp = !!(meta.footer_qrcode_mp && String(meta.footer_qrcode_mp).trim());

                if (hasMp) {
                    if (qrMpImg) qrMpImg.src = meta.footer_qrcode_mp;
                    if (qrMpTitle && meta.footer_qrcode_mp_title) {
                        qrMpTitle.innerText = meta.footer_qrcode_mp_title;
                    }
                    if (qrMpBox) qrMpBox.style.display = 'block';
                    if (qrContainer) {
                        qrContainer.classList.remove('single-qr');
                        qrContainer.classList.add('double-qr');
                    }
                } else {
                    if (qrMpBox) qrMpBox.style.display = 'none';
                    if (qrContainer) {
                        qrContainer.classList.remove('double-qr');
                        qrContainer.classList.add('single-qr');
                    }
                }

                // 5. 底栏版权与网安备案条
                const copyright = meta.copyright || '© 2026 启灵智能回收数字化平台 · 保留所有权利';
                const copyEl = document.getElementById('footer-service-tel');
                if (copyEl) copyEl.innerText = copyright;

                const footerFilings = document.getElementById('footer-filings');
                if (footerFilings) {
                    const icpUrl = meta.icp_url || 'https://beian.miit.gov.cn/';
                    const icp = meta.icp_beian ? `<a href="${escapeHtml(icpUrl)}" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:none;transition:color 0.2s;cursor:pointer;" onmouseover="this.style.color='var(--primary, #1e58ff)'" onmouseout="this.style.color='inherit'">${escapeHtml(meta.icp_beian)}</a>` : '';
                    let gongan = '';
                    if (meta.gong_an_beian) {
                        const iconHtml = `<img src="${escapeHtml(meta.gong_an_icon || '/uploads/default/police_badge.svg')}" style="width:16px;height:16px;object-fit:contain;vertical-align:-2px;margin-right:4px;" alt="公安备案">`;
                        if (meta.gong_an_url) {
                            gongan = `<a href="${escapeHtml(meta.gong_an_url)}" target="_blank" rel="noopener noreferrer" style="margin-left:14px;color:inherit;text-decoration:none;display:inline-flex;align-items:center;transition:color 0.2s;" onmouseover="this.style.color='var(--primary, #1e58ff)'" onmouseout="this.style.color='inherit'">${iconHtml}<span>${escapeHtml(meta.gong_an_beian)}</span></a>`;
                        } else {
                            gongan = `<span style="margin-left:14px;display:inline-flex;align-items:center;">${iconHtml}<span>${escapeHtml(meta.gong_an_beian)}</span></span>`;
                        }
                    }
                    footerFilings.innerHTML = (icp || gongan) ? `${icp}${gongan}` : '';
                }
            }

            // ==========================================
            // ==========================================
            // 首页常见问题解答 (FAQ) 动态数据渲染
            // ==========================================
            function renderHomeFaq(meta) {
                if (!meta) return;
                const faqSection = document.getElementById('home-faq-section');
                if (!faqSection) return;

                // 1. 启停控制
                if (meta.home_faq_enabled === false || meta.home_faq_enabled === '0' || meta.home_faq_enabled === 0) {
                    faqSection.style.display = 'none';
                    return;
                }
                faqSection.style.display = 'block';

                // 2. 标题与副标题
                const titleEl = document.getElementById('home-faq-title');
                if (titleEl && meta.home_faq_title) {
                    titleEl.innerText = meta.home_faq_title;
                }
                const subEl = document.getElementById('home-faq-subtitle');
                if (subEl && meta.home_faq_subtitle) {
                    subEl.innerText = meta.home_faq_subtitle;
                }

                // 3. 动态渲染 FAQ 列表
                const gridEl = document.getElementById('home-faq-grid');
                if (gridEl && Array.isArray(meta.home_faq_list) && meta.home_faq_list.length > 0) {
                    let html = '';
                    meta.home_faq_list.forEach((item, idx) => {
                        const qText = item.q || '';
                        const aText = item.a || '';
                        if (!qText && !aText) return;
                        html += `
                            <div class="faq-item" onclick="window.toggleFaq(this)">
                                <div class="faq-q">
                                    <span>${escapeHtml(qText)}</span>
                                    <span class="faq-arrow">▼</span>
                                </div>
                                <div class="faq-a">${escapeHtml(aText)}</div>
                            </div>
                        `;
                    });
                    if (html) {
                        gridEl.innerHTML = html;
                    }
                }
            }

            // ==========================================
            // 首页 3 步极速回收服务流程动态数据渲染
            // ==========================================
            function renderHomeProcess(meta) {
                if (!meta) return;
                const sec = document.getElementById('home-process-section');
                if (!sec) return;

                if (meta.home_process_enabled === false || meta.home_process_enabled === '0' || meta.home_process_enabled === 0) {
                    sec.style.display = 'none';
                    return;
                }
                sec.style.display = 'block';

                if (meta.home_process_title) {
                    const titleEl = document.getElementById('home-process-title');
                    if (titleEl) titleEl.innerText = meta.home_process_title;
                }
                if (meta.home_process_subtitle) {
                    const subEl = document.getElementById('home-process-subtitle');
                    if (subEl) subEl.innerText = meta.home_process_subtitle;
                }
                if (meta.home_process_step1_title) {
                    const s1t = document.getElementById('home-step1-title');
                    if (s1t) s1t.innerText = meta.home_process_step1_title;
                }
                if (meta.home_process_step1_desc) {
                    const s1d = document.getElementById('home-step1-desc');
                    if (s1d) s1d.innerText = meta.home_process_step1_desc;
                }
                if (meta.home_process_step2_title) {
                    const s2t = document.getElementById('home-step2-title');
                    if (s2t) s2t.innerText = meta.home_process_step2_title;
                }
                if (meta.home_process_step2_desc) {
                    const s2d = document.getElementById('home-step2-desc');
                    if (s2d) s2d.innerText = meta.home_process_step2_desc;
                }
                if (meta.home_process_step3_title) {
                    const s3t = document.getElementById('home-step3-title');
                    if (s3t) s3t.innerText = meta.home_process_step3_title;
                }
                if (meta.home_process_step3_desc) {
                    const s3d = document.getElementById('home-step3-desc');
                    if (s3d) s3d.innerText = meta.home_process_step3_desc;
                }
            }

            // 前台文章/条款极速阅读弹窗 (Article Reader Modal)
            // ==========================================
            async function openArticleModal(slugOrId) {
                const modal = document.getElementById('modal-article-reader');
                if (!modal) return;

                const titleEl = document.getElementById('article-reader-title');
                const catEl = document.getElementById('article-reader-category');
                const timeEl = document.getElementById('article-reader-time');
                const viewsEl = document.getElementById('article-reader-views');
                const newtabEl = document.getElementById('article-reader-newtab');
                const contentEl = document.getElementById('article-reader-content');

                modal.style.display = 'flex';
                document.body.style.overflow = 'hidden';

                if (titleEl) titleEl.innerText = '正在加载文章...';
                if (contentEl) {
                    contentEl.innerHTML = `
                        <div style="text-align:center;padding:40px;color:var(--text-light, #94a3b8);">
                            <div class="loading-spinner"></div>
                            <p style="margin-top:12px;">正在加载内容...</p>
                        </div>
                    `;
                }

                try {
                    let targetSlugOrId = slugOrId;
                    if (targetSlugOrId === 'about-us') targetSlugOrId = 'about';
                    if (targetSlugOrId === 'inspection-rules') targetSlugOrId = 'quality-payout';
                    const query = (typeof targetSlugOrId === 'number' || /^\d+$/.test(targetSlugOrId)) 
                        ? `&id=${encodeURIComponent(targetSlugOrId)}` 
                        : `&slug=${encodeURIComponent(targetSlugOrId)}`;
                    const res = await api.request('/api/article/detail' + query);
                    if (res && res.code === 200 && res.data) {
                        const art = res.data;
                        if (titleEl) titleEl.innerText = art.title || '文章详情';
                        const catMap = {
                            'guide': '回收指南',
                            'about': '关于平台',
                            'legal': '法律条款',
                            'help': '帮助中心',
                            'notice': '官方公告'
                        };
                        if (catEl) catEl.innerText = catMap[art.category] || '文章单页';
                        let dateStr = '最近';
                        const ts = art.updated_at || art.created_at;
                        if (ts) {
                            if (typeof ts === 'number') {
                                dateStr = new Date(ts * 1000).toLocaleDateString();
                            } else if (typeof ts === 'string') {
                                dateStr = ts.substring(0, 10);
                            }
                        }
                        if (timeEl) timeEl.innerText = `更新：${dateStr}`;
                        if (viewsEl) viewsEl.innerText = `阅读：${art.view_count || 1}`;
                        if (newtabEl) {
                            newtabEl.href = `/page.html?slug=${encodeURIComponent(art.slug || art.id)}`;
                        }
                        if (contentEl) {
                            contentEl.innerHTML = art.content || '<p style="color:#94a3b8;">暂无内容</p>';
                        }
                    } else {
                        if (contentEl) {
                            contentEl.innerHTML = `<div style="text-align:center;padding:40px;color:#ef4444;">${escapeHtml(res ? res.msg : '文章未找到或已下架')}</div>`;
                        }
                    }
                } catch (e) {
                    if (contentEl) {
                        contentEl.innerHTML = `<div style="text-align:center;padding:40px;color:#ef4444;">网络连接出现异常，请稍后重试</div>`;
                    }
                }
            }

            function closeArticleModal() {
                const modal = document.getElementById('modal-article-reader');
                if (modal) {
                    modal.style.display = 'none';
                    document.body.style.overflow = '';
                }
            }

            window.openArticleModal = openArticleModal;
            window.closeArticleModal = closeArticleModal;


            // 实时回收交易动态广播轮播 (支持后台开关与自定义内容)
            function initLiveTicker() {
                const meta = state.platformMeta || {};
                const tickerBar = document.querySelector('.live-ticker-bar');
                if (!tickerBar) return;

                // 若后台设置关闭实时动态，则完全隐藏该跑马播报栏
                if (meta.ticker_enabled === false || meta.ticker_enabled === '0') {
                    tickerBar.style.display = 'none';
                    return;
                }
                tickerBar.style.display = 'block';

                const tagEl = document.querySelector('.ticker-tag span:last-child');
                if (tagEl && meta.ticker_tag) {
                    tagEl.innerText = meta.ticker_tag;
                }

                const tickerEl = document.getElementById('live-ticker-text');
                if (!tickerEl) return;

                let dynamicMessages = [];
                if (meta.ticker_messages && typeof meta.ticker_messages === 'string' && meta.ticker_messages.trim().length > 0) {
                    dynamicMessages = meta.ticker_messages
                        .split('\n')
                        .map(s => s.trim())
                        .filter(s => s.length > 0);
                }

                if (dynamicMessages.length === 0) {
                    dynamicMessages = [
                        '刚刚 [138****6821] 成功回收 iPhone 15 Pro Max · 极速放款 ¥5,800 到账',
                        '1分钟前 [186****9012] 预约快速寄送 · 华为 Mate 60 Pro',
                        '3分钟前 [159****3341] 确认专业质检结果 · 微信零钱极速到账 ¥4,200',
                        '4分钟前 [131****8809] 提交高价回收订单 · MacBook Pro 16寸 M3 Max',
                        '6分钟前 [177****5520] 预约线下门店自送 · 小米 14 Ultra (现场秒结)',
                        '8分钟前 [180****2267] 质检合格 · 支付宝打款 ¥3,650 极速到账'
                    ];
                }

                tickerEl.innerText = dynamicMessages[0];
                let tickerIdx = 0;
                const intervalMs = Math.max(2000, (meta.ticker_interval ? Number(meta.ticker_interval) : 4) * 1000);

                if (window.__liveTickerTimer) {
                    clearInterval(window.__liveTickerTimer);
                }

                window.__liveTickerTimer = setInterval(() => {
                    tickerIdx = (tickerIdx + 1) % dynamicMessages.length;
                    tickerEl.style.opacity = '0';
                    setTimeout(() => {
                        tickerEl.innerText = dynamicMessages[tickerIdx];
                        tickerEl.style.opacity = '1';
                    }, 300);
                }, intervalMs);
            }

            // ==========================================
            // 首屏与双模式（极速搜索流 vs 品牌画卷轮播流）数据驱动初始化
            // ==========================================
            let __heroCarouselTimer = null;
            let __heroCurrentSlide = 0;

            function initHeroAndCarousel(meta) {
                if (!meta) meta = {};

                // 1. 官方保障背书小徽章
                const badgeWrap = document.getElementById('hero-badge-wrap');
                const badgeText = document.getElementById('hero-badge-text');
                if (badgeWrap) {
                    badgeWrap.style.display = (meta.hero_badge_enabled === false || meta.hero_badge_enabled === '0') ? 'none' : 'flex';
                }
                if (badgeText && meta.hero_badge_text) {
                    badgeText.innerText = meta.hero_badge_text;
                }

                // 2. 首屏核心大标题与利益点副标
                const heroTitle = meta.hero_title || meta.banner_title || meta.site_name || '全品类高价回收 · 10秒快速估价';
                const heroSub = meta.hero_subtitle || meta.banner_subtitle || meta.slogan || '官方报价标准 · 顺丰免费上门 · 隐私安全保障';
                const heroTitleEl = document.getElementById('hero-title');
                if (heroTitleEl) heroTitleEl.innerText = heroTitle;
                const heroSubEl = document.getElementById('hero-subtitle');
                if (heroSubEl) heroSubEl.innerText = heroSub;

                // 3. 主搜索按钮文案
                const btnSearchText = document.getElementById('btn-main-search-text');
                if (btnSearchText && meta.hero_search_btn_text) {
                    btnSearchText.innerText = meta.hero_search_btn_text;
                }

                // 4. 热门搜索标签动态装载 (Hot Chips)
                const hotTagsWrap = document.getElementById('hero-hot-tags');
                if (hotTagsWrap) {
                    let tags = meta.hero_hot_tags;
                    if (typeof tags === 'string') {
                        try { tags = JSON.parse(tags); } catch(e) { tags = null; }
                    }
                    if (!Array.isArray(tags) || tags.length === 0) {
                        tags = [
                            { label: 'iPhone 15 Pro', keyword: 'iPhone 15 Pro' },
                            { label: 'Mate 60 Pro', keyword: 'Mate 60 Pro' },
                            { label: '小米 14', keyword: '小米14' },
                            { label: 'MacBook Pro', keyword: 'MacBook' },
                            { label: 'iPad Pro', keyword: 'iPad' }
                        ];
                    }
                    let tagsHtml = `<span class="hot-label"><svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" style="vertical-align:-1px;margin-right:2px;"><path d="M12 23c6.075 0 11-4.925 11-11C23 5.4 18.667 1.5 12 1 12 7 9 9 9 9s-3-2-3-4C3 8 2 10.5 2 12c0 6.075 4.925 11 10 11z"/></svg>热门搜索：</span>`;
                    tags.forEach(t => {
                        const lbl = escapeHtml(t.label || t.keyword || '');
                        const kw = escapeHtml(t.keyword || t.label || '');
                        tagsHtml += `<span class="hot-chip" onclick="window.quickSearch('${kw}')">${lbl}</span>`;
                    });
                    hotTagsWrap.innerHTML = tagsHtml;
                }

                // 5. 核心承诺与信任指标 (Metrics Grid)
                const metricsWrap = document.getElementById('hero-metrics-grid');
                if (metricsWrap) {
                    let metrics = meta.hero_metrics;
                    if (typeof metrics === 'string') {
                        try { metrics = JSON.parse(metrics); } catch(e) { metrics = null; }
                    }
                    if (!Array.isArray(metrics) || metrics.length === 0) {
                        metrics = [
                            { icon: 'bag', val: '120万+', lbl: '累计完成回收' },
                            { icon: 'clock', val: '10秒', lbl: '快速精准估价' },
                            { icon: 'truck', val: '0元', lbl: '顺丰双向保价包邮' },
                            { icon: 'shield', val: '100%', lbl: '隐私安全清除' }
                        ];
                    }

                    const iconMap = {
                        bag: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="vertical-align:-2px;margin-right:4px;"><path d="M19 6h-2V4c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v2H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-8-2h2v2h-2V4zm8 16H5V8h14v12z"/></svg>`,
                        clock: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="vertical-align:-2px;margin-right:4px;"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>`,
                        truck: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="vertical-align:-2px;margin-right:4px;"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>`,
                        shield: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="vertical-align:-2px;margin-right:4px;"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>`,
                        lightning: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="vertical-align:-2px;margin-right:4px;"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>`,
                        medal: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="vertical-align:-2px;margin-right:4px;"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`
                    };

                    metricsWrap.innerHTML = metrics.map(item => `
                        <div class="hero-metric-item">
                            <div class="hero-metric-val">${(iconMap[item.icon] || '')}${escapeHtml(item.val || '')}</div>
                            <div class="hero-metric-lbl">${escapeHtml(item.lbl || '')}</div>
                        </div>
                    `).join('');
                    metricsWrap.style.gridTemplateColumns = `repeat(${Math.min(metrics.length, 6)}, 1fr)`;
                }

                // 6. 首屏双模式判定 (Mode A: 极速搜索 vs Mode B: 品牌画卷轮播 Banner)
                const heroBannerEl = document.getElementById('hero-banner');
                const searchContainer = document.getElementById('hero-search-container');
                const carouselWrapper = document.getElementById('hero-carousel-wrapper');
                const floatingContainer = document.getElementById('hero-floating-container');
                const searchWrap = document.getElementById('main-search-wrap');

                const isBannerMode = (meta.hero_mode === 'banner') && Array.isArray(meta.banners) && meta.banners.length > 0;

                if (isBannerMode) {
                    heroBannerEl?.classList.add('mode-banner');
                    if (searchContainer) searchContainer.style.display = 'none';
                    if (carouselWrapper) {
                        carouselWrapper.style.display = 'block';
                        setupBannerCarousel(carouselWrapper, meta.banners, meta.hero_banner_autoplay || 4);
                    }

                    // 悬浮快速估价卡片 (完全融合于大图内部)
                    const hasFloatingCard = (meta.hero_banner_floating_estimate !== false && meta.hero_banner_floating_estimate !== '0');
                    carouselWrapper?.classList.toggle('has-floating-card', hasFloatingCard);
                    heroBannerEl?.classList.toggle('has-floating-card', hasFloatingCard);

                    if (hasFloatingCard) {
                        if (floatingContainer) {
                            floatingContainer.style.display = 'block';
                            if (floatingContainer.children.length === 0) {
                                floatingContainer.innerHTML = `
                                    <div class="floating-estimate-card">
                                        <div style="font-size:15px;font-weight:700;color:var(--text-main);margin-bottom:12px;display:flex;align-items:center;gap:6px;">
                                            <span style="color:var(--primary, #1e58ff);">⚡</span> 快速搜索估价 · 上门寄送秒结算
                                        </div>
                                        <div id="floating-search-placeholder"></div>
                                        <div id="floating-metrics-placeholder"></div>
                                    </div>
                                `;
                            }
                            const searchPlaceholder = document.getElementById('floating-search-placeholder');
                            const metricsPlaceholder = document.getElementById('floating-metrics-placeholder');
                            if (searchWrap && searchPlaceholder && searchWrap.parentElement !== searchPlaceholder) {
                                searchPlaceholder.appendChild(searchWrap);
                            }
                            if (metricsWrap && metricsPlaceholder && metricsWrap.parentElement !== metricsPlaceholder) {
                                metricsPlaceholder.appendChild(metricsWrap);
                            }
                        }
                    } else if (floatingContainer) {
                        floatingContainer.style.display = 'none';
                    }
                } else {
                    // 模式 A: 极速搜索模式
                    heroBannerEl?.classList.remove('mode-banner');
                    heroBannerEl?.classList.remove('has-floating-card');
                    carouselWrapper?.classList.remove('has-floating-card');
                    if (carouselWrapper) carouselWrapper.style.display = 'none';
                    if (floatingContainer) floatingContainer.style.display = 'none';
                    if (searchContainer) {
                        searchContainer.style.display = 'block';
                        // 确保 searchWrap 和 metricsWrap 处于 searchContainer 中
                        if (searchWrap && searchWrap.parentElement !== searchContainer) {
                            const heroSub = document.getElementById('hero-subtitle');
                            if (heroSub && heroSub.nextSibling) {
                                searchContainer.insertBefore(searchWrap, heroSub.nextSibling);
                            } else {
                                searchContainer.appendChild(searchWrap);
                            }
                        }
                        if (metricsWrap && metricsWrap.parentElement !== searchContainer) {
                            searchContainer.appendChild(metricsWrap);
                        }
                    }
                }
            }

            // 轮播组件驱动核心
            function setupBannerCarousel(wrapper, banners, autoplaySec) {
                const track = document.getElementById('banner-carousel-track');
                const indicators = document.getElementById('carousel-indicators');
                const prevBtn = document.getElementById('carousel-prev-btn');
                const nextBtn = document.getElementById('carousel-next-btn');

                if (!track || !banners || banners.length === 0) return;

                // 渲染幻灯片
                track.innerHTML = banners.map(b => {
                    const pcImg = escapeHtml(b.image_pc || '/uploads/default/banner_digital.svg');
                    const mImg = escapeHtml(b.image_m || pcImg);
                    const linkType = escapeHtml(b.link_type || 'none');
                    const linkVal = escapeHtml(b.link_value || '');
                    const btnText = escapeHtml(b.btn_text || '立即估价');

                    return `
                        <div class="banner-slide">
                            <picture>
                                <source media="(max-width: 768px)" srcset="${mImg}">
                                <img src="${pcImg}" class="banner-slide-bg" alt="${escapeHtml(b.title)}">
                            </picture>
                            <div class="banner-slide-overlay"></div>
                            <div class="banner-slide-content">
                                ${b.badge ? `<div class="banner-badge-tag">${escapeHtml(b.badge)}</div>` : ''}
                                <h2 class="banner-slide-title">${escapeHtml(b.title)}</h2>
                                ${b.subtitle ? `<p class="banner-slide-sub">${escapeHtml(b.subtitle)}</p>` : ''}
                                <button type="button" class="banner-slide-btn" onclick="window.handleBannerClick('${linkType}', '${linkVal}')">
                                    <span>${btnText}</span>
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                                </button>
                            </div>
                        </div>
                    `;
                }).join('');

                // 渲染胶囊指示器
                if (indicators) {
                    indicators.innerHTML = banners.map((_, i) => `<span class="carousel-dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>`).join('');
                    indicators.querySelectorAll('.carousel-dot').forEach(dot => {
                        dot.addEventListener('click', function() {
                            const idx = parseInt(this.getAttribute('data-index'), 10);
                            goToSlide(idx);
                        });
                    });
                }

                __heroCurrentSlide = 0;
                goToSlide(0);

                function goToSlide(idx) {
                    if (idx < 0) idx = banners.length - 1;
                    if (idx >= banners.length) idx = 0;
                    __heroCurrentSlide = idx;
                    track.style.transform = `translateX(-${idx * 100}%)`;

                    indicators?.querySelectorAll('.carousel-dot').forEach((d, i) => {
                        d.classList.toggle('active', i === idx);
                    });
                }

                // 左右箭头
                if (prevBtn) prevBtn.onclick = () => goToSlide(__heroCurrentSlide - 1);
                if (nextBtn) nextBtn.onclick = () => goToSlide(__heroCurrentSlide + 1);

                // 自动播放与悬停暂停
                if (__heroCarouselTimer) clearInterval(__heroCarouselTimer);
                const intervalMs = Math.max(2, parseInt(autoplaySec, 10) || 4) * 1000;

                const startTimer = () => {
                    if (__heroCarouselTimer) clearInterval(__heroCarouselTimer);
                    __heroCarouselTimer = setInterval(() => {
                        goToSlide(__heroCurrentSlide + 1);
                    }, intervalMs);
                };

                startTimer();

                wrapper.onmouseenter = () => { if (__heroCarouselTimer) clearInterval(__heroCarouselTimer); };
                wrapper.onmouseleave = () => startTimer();

                // 移动端 Touch 滑动手势
                let touchStartX = 0;
                let touchEndX = 0;
                wrapper.ontouchstart = (e) => {
                    touchStartX = e.changedTouches[0].screenX;
                    if (__heroCarouselTimer) clearInterval(__heroCarouselTimer);
                };
                wrapper.ontouchend = (e) => {
                    touchEndX = e.changedTouches[0].screenX;
                    const diff = touchStartX - touchEndX;
                    if (Math.abs(diff) > 40) {
                        if (diff > 0) goToSlide(__heroCurrentSlide + 1);
                        else goToSlide(__heroCurrentSlide - 1);
                    }
                    startTimer();
                };
            }

            // Banner 点击动作分发
            window.handleBannerClick = function(type, val) {
                if (type === 'none') {
                    return;
                } else if (type === 'category') {
                    const catId = parseInt(val, 10);
                    if (catId > 0) {
                        state.currentCat = catId;
                        if (typeof loadBrands === 'function') loadBrands();
                        if (typeof loadDevices === 'function') loadDevices();
                        const deviceSec = document.getElementById('device-list-container');
                        if (deviceSec) deviceSec.scrollIntoView({ behavior: 'smooth' });
                    }
                } else if (type === 'device') {
                    const devId = parseInt(val, 10);
                    if (devId > 0 && typeof openAppraisal === 'function') {
                        openAppraisal(devId);
                    } else if (val) {
                        window.quickSearch(val);
                    }
                } else if (type === 'action') {
                    if (val === 'appointment' || val === 'order') {
                        const homeTab = document.querySelector('[data-mode="home"]');
                        if (homeTab) homeTab.click();
                        const modeSection = document.getElementById('recycle-modes-section');
                        if (modeSection) modeSection.scrollIntoView({ behavior: 'smooth' });
                        else SysUI.toast('请在下方选择【预约上门】填写回收地址与联系方式', 'info');
                    } else if (val === 'coupon') {
                        const couponEntry = document.getElementById('btn-header-coupon') || document.querySelector('.floating-coupon-widget');
                        if (couponEntry) couponEntry.click();
                        else SysUI.toast('加价补贴券可在页面右下角悬浮卡券入口或个人中心查看', 'info');
                    }
                } else if (type === 'url' && val) {
                    window.open(val, '_blank');
                }
            };

            // ==========================================
            // 六大行业专属特色业务板块渲染 (废品大宗行情走势 / 贵金属实时金价等)
            // ==========================================
            function renderIndustryFeatureSection(meta) {
                const container = document.getElementById('industry-feature-container');
                if (!container) return;

                if (!meta || !meta.key) {
                    container.style.display = 'none';
                    return;
                }

                if (meta.key === 'scrap') {
                    // 废品与再生资源模式：今日再生资源挂牌指导价行情大看板
                    container.style.display = 'block';
                    container.innerHTML = `
                        <div class="container" style="margin-top:20px;margin-bottom:20px;">
                            <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:20px 24px;box-shadow:0 4px 16px rgba(0,0,0,0.04);">
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
                                    <div style="display:flex;align-items:center;gap:8px;">
                                        <span style="display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:8px;background:#ecfdf5;color:#10b981;">
                                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/></svg>
                                        </span>
                                        <div>
                                            <strong style="font-size:16px;color:#0f172a;">📊 今日再生资源挂牌指导价行情看板</strong>
                                            <div style="font-size:11px;color:#94a3b8;margin-top:2px;">实时行情更新 · 专业电子地磅 · 当面现金/转账秒结</div>
                                        </div>
                                    </div>
                                    <button type="button" class="btn btn-sm btn-primary" onclick="const h = document.querySelector('[data-mode=home]'); if (h) h.click(); document.getElementById('recycle-modes-section')?.scrollIntoView({behavior:'smooth'});" style="font-size:13px;font-weight:600;padding:8px 18px;border-radius:8px;display:inline-flex;align-items:center;gap:6px;">
                                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
                                        呼叫师傅上门过磅称重
                                    </button>
                                </div>
                                <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(170px, 1fr));gap:12px;">
                                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;">
                                        <div style="font-size:12px;color:#64748b;margin-bottom:4px;">🔴 光亮紫铜线</div>
                                        <div style="font-size:20px;font-weight:800;color:#0f172a;">¥68.50 <span style="font-size:12px;font-weight:normal;color:#94a3b8;">/ 公斤</span></div>
                                        <div style="font-size:11px;color:#ef4444;margin-top:2px;">↑ 较昨日 +0.80</div>
                                    </div>
                                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;">
                                        <div style="font-size:12px;color:#64748b;margin-bottom:4px;">🔵 6063 铝合金</div>
                                        <div style="font-size:20px;font-weight:800;color:#0f172a;">¥18.20 <span style="font-size:12px;font-weight:normal;color:#94a3b8;">/ 公斤</span></div>
                                        <div style="font-size:11px;color:#10b981;margin-top:2px;">→ 走势平稳</div>
                                    </div>
                                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;">
                                        <div style="font-size:12px;color:#64748b;margin-bottom:4px;">🟢 统包废纸板</div>
                                        <div style="font-size:20px;font-weight:800;color:#0f172a;">¥1,450 <span style="font-size:12px;font-weight:normal;color:#94a3b8;">/ 吨</span></div>
                                        <div style="font-size:11px;color:#3b82f6;margin-top:2px;">↓ 较昨日 -20.0</div>
                                    </div>
                                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;">
                                        <div style="font-size:12px;color:#64748b;margin-bottom:4px;">🟡 动力铅酸电瓶</div>
                                        <div style="font-size:20px;font-weight:800;color:#0f172a;">¥8.80 <span style="font-size:12px;font-weight:normal;color:#94a3b8;">/ 公斤</span></div>
                                        <div style="font-size:11px;color:#ef4444;margin-top:2px;">↑ 较昨日 +0.30</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                } else if (meta.key === 'luxury') {
                    // 奢侈品名表黄金模式：今日国际金价折算大牌
                    container.style.display = 'block';
                    container.innerHTML = `
                        <div class="container" style="margin-top:20px;margin-bottom:20px;">
                            <div style="background:#ffffff;border:1px solid #fef3c7;border-radius:14px;padding:20px 24px;box-shadow:0 4px 16px rgba(217,119,6,0.06);">
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
                                    <div style="display:flex;align-items:center;gap:8px;">
                                        <span style="display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:8px;background:#fef3c7;color:#d97706;">
                                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                                        </span>
                                        <div>
                                            <strong style="font-size:16px;color:#0f172a;">💎 今日贵金属国际行情折算牌价</strong>
                                            <div style="font-size:11px;color:#94a3b8;margin-top:2px;">权威中检质检师双重复核 · 顺丰全额保价密封箱 · 克重秒级结算</div>
                                        </div>
                                    </div>
                                    <span class="badge" style="background:#fef3c7;color:#b45309;font-size:12px;padding:5px 12px;">中检权威背书</span>
                                </div>
                                <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(170px, 1fr));gap:12px;">
                                    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px 14px;">
                                        <div style="font-size:12px;color:#92400e;margin-bottom:4px;">✨ 足金 999.9 回收价</div>
                                        <div style="font-size:20px;font-weight:800;color:#b45309;">¥585.50 <span style="font-size:12px;font-weight:normal;color:#92400e;">/ 克</span></div>
                                        <div style="font-size:11px;color:#b45309;margin-top:2px;">国际行情联动实时换算</div>
                                    </div>
                                    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px 14px;">
                                        <div style="font-size:12px;color:#92400e;margin-bottom:4px;">🌟 18K 黄金 / 玫瑰金</div>
                                        <div style="font-size:20px;font-weight:800;color:#b45309;">¥422.00 <span style="font-size:12px;font-weight:normal;color:#92400e;">/ 克</span></div>
                                        <div style="font-size:11px;color:#b45309;margin-top:2px;">无损光谱仪精准成色测定</div>
                                    </div>
                                    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px 14px;">
                                        <div style="font-size:12px;color:#92400e;margin-bottom:4px;">⌚ 瑞士名表大牌专柜</div>
                                        <div style="font-size:20px;font-weight:800;color:#b45309;">公价 4 - 8 折 <span style="font-size:12px;font-weight:normal;color:#92400e;">高额变现</span></div>
                                        <div style="font-size:11px;color:#b45309;margin-top:2px;">劳力士/欧米茄/江诗丹顿专收</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    container.style.display = 'none';
                    container.innerHTML = '';
                }
            }


    // 首次默认执行跑马播报
    initLiveTicker();

    // 右侧快捷浮动按钮回顶监听
    window.addEventListener('scroll', () => {
        const btnTop = document.getElementById('btn-float-top');
        if (btnTop) {
            btnTop.style.display = window.scrollY > 320 ? 'flex' : 'none';
        }
    });

    // 全站异步启动主流程
    async function bootstrap() {
        if (typeof window.renderUserNav === 'function') {
            window.renderUserNav();
        }
        if (state.userToken && typeof window.refreshUserProfile === 'function') {
            window.refreshUserProfile();
        }
        await initPlatformTemplate();
        if (typeof window.loadCategories === 'function') {
            await window.loadCategories();
        }
        if (typeof window.loadBrands === 'function') {
            await window.loadBrands();
        }
        if (typeof window.loadDevices === 'function') {
            await window.loadDevices();
        }
        if (typeof window.loadCouponsShowcase === 'function') {
            await window.loadCouponsShowcase();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }

    // 导出主入口方法
    window.initPlatformTemplate = initPlatformTemplate;
    window.applyTemplateStyles = applyTemplateStyles;
    window.renderPreviewBannerNotification = renderPreviewBannerNotification;
    window.renderMegaFooter = renderMegaFooter;
    window.openArticleModal = openArticleModal;
    window.closeArticleModal = closeArticleModal;
    window.handleBannerClick = handleBannerClick;
})(window);
