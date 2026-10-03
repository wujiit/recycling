/**
 * 启灵回收系统 - 业务模板与视觉主题管理视图
 * 包含全站视觉配色风格切换、行业业务模板装载与预览
 */
(function (window) {
    'use strict';

    const SysUI = window.SysUI;
    const api = window.adminApi || window.api;
    const state = window.adminState || window.state;
    const escapeHtml = window.escapeHtml || function(s) { return s; };

    // 当前视图激活的子选项卡 (theme: 视觉主题风格, industry: 行业业务数据)
    let currentSubTab = 'theme';

    async function renderTemplatesView(container) {
        if (!container) return;
        container.innerHTML = '<div class="card" style="padding:40px;text-align:center;color:#64748b;">正在加载主题风格与业务模板配置...</div>';

        const curApi = window.adminApi || window.api;
        
        // 并行拉取主题风格与行业业务模板数据
        const [themeRes, tplRes] = await Promise.all([
            curApi.get('/admin/config/getThemeStyles'),
            curApi.get('/admin/config/getTemplates')
        ]);

        if (!themeRes || themeRes.code !== 200 || !tplRes || tplRes.code !== 200) {
            container.innerHTML = '<div class="card" style="padding:30px;text-align:center;color:#ef4444;">获取模板或主题配置失败，请检查网络与服务状态</div>';
            return;
        }

        const themeData = themeRes.data || {};
        const curTheme = themeData.current || {};
        const themeList = themeData.list || [];

        const tplData = tplRes.data || {};
        const curTplKey = tplData.current || 'universal';
        const tplList = tplData.list || [];

        // 1. 渲染视觉主题风格卡片列表
        let themeCardsHtml = '';
        themeList.forEach(t => {
            const isCur = curTheme.key === t.key;
            const borderStyle = isCur
                ? `border: 2px solid ${t.primary}; box-shadow: 0 8px 24px ${t.primary}25; background: #ffffff;`
                : 'border: 1px solid #e2e8f0; background: #ffffff;';

            const actionBtn = isCur
                ? `<button class="btn" style="background:${t.primary};color:#fff;cursor:default;width:100%;height:38px;font-weight:700;border:none;" disabled>✔ 当前全站生效中</button>`
                : `<button class="btn btn-primary" style="width:100%;height:38px;background:${t.primary};border-color:${t.primary};" onclick="window.switchThemeStyle('${t.key}', '${escapeHtml(t.name)}')">一键应用此主题风格</button>`;

            // 色彩微缩调色板圆点
            let dotsHtml = '';
            (t.preview_colors || [t.primary]).forEach(c => {
                dotsHtml += `<span style="display:inline-block;width:16px;height:16px;border-radius:50%;background:${c};border:1px solid rgba(0,0,0,0.08);" title="${c}"></span>`;
            });

            themeCardsHtml += `
                <div class="card" style="padding:22px;border-radius:12px;${borderStyle};display:flex;flex-direction:column;justify-content:space-between;transition:all 0.2s;">
                    <div>
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
                            <div style="display:flex;align-items:center;gap:8px;">
                                <div style="width:36px;height:36px;border-radius:8px;background:${t.primary_gradient};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:16px;box-shadow:0 3px 8px ${t.primary}30;">
                                    🎨
                                </div>
                                <div>
                                    <h4 style="margin:0;font-size:16px;font-weight:700;color:#0f172a;">${escapeHtml(t.name)}</h4>
                                    <div style="font-size:11px;color:${t.primary};font-weight:600;margin-top:2px;">${escapeHtml(t.badge_text)}</div>
                                </div>
                            </div>
                            ${isCur ? `<span class="badge" style="background:#dcfce7;color:#15803d;font-size:11px;padding:3px 8px;font-weight:bold;">已生效</span>` : ''}
                        </div>

                        <p style="font-size:12px;color:#64748b;line-height:1.6;margin-bottom:12px;min-height:38px;">${escapeHtml(t.desc)}</p>

                        <!-- 调色板与配色速览 -->
                        <div style="background:#f8fafc;padding:10px 12px;border-radius:8px;margin-bottom:14px;border:1px solid #f1f5f9;">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                                <span style="font-size:11px;color:#64748b;font-weight:600;">主题色板：</span>
                                <div style="display:flex;gap:6px;">${dotsHtml}</div>
                            </div>
                            <div style="font-size:11px;color:#475569;">
                                <strong>适用场景：</strong>${escapeHtml(t.recommend_for)}
                            </div>
                        </div>

                        <!-- 迷你 UI 组件实景模拟预览 -->
                        <div style="border:1px dashed #cbd5e1;border-radius:8px;padding:10px;margin-bottom:16px;background:${t.primary_light};">
                            <div style="font-size:10px;color:#64748b;margin-bottom:6px;font-weight:600;">前台视觉效果模拟预览：</div>
                            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                                <button type="button" style="background:${t.primary_gradient};color:#fff;border:none;border-radius:6px;padding:4px 10px;font-size:11px;font-weight:bold;cursor:default;">
                                    立即免费估价
                                </button>
                                <span style="background:#fff;color:${t.primary};border:1px solid ${t.primary};border-radius:4px;padding:2px 8px;font-size:10px;font-weight:bold;">
                                    高价回收
                                </span>
                                <span style="font-size:13px;font-weight:800;color:${t.primary};">
                                    ￥8,999
                                </span>
                            </div>
                        </div>
                    </div>

                    <div style="display:flex;gap:8px;margin-top:14px;align-items:center;">
                        <button type="button" class="btn btn-outline btn-preview-theme" data-key="${t.key}" style="flex:1;height:38px;border-color:#cbd5e1;color:#1e293b;font-weight:600;display:inline-flex;align-items:center;justify-content:center;gap:4px;font-size:12px;">
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                            实景预览
                        </button>
                        <div style="flex:1.4;">
                            ${actionBtn}
                        </div>
                    </div>
                </div>
            `;
        });

        // 2. 渲染行业业务品类数据卡片列表
        let tplCardsHtml = '';
        tplList.forEach(t => {
            const isCur = t.key === curTplKey;
            const borderStyle = isCur ? `border: 2px solid ${t.theme_color}; box-shadow: 0 4px 16px rgba(0,0,0,0.08); background: #fafafa;` : 'border: 1px solid #e2e8f0;';
            const actionBtn = isCur
                ? `<button class="btn" style="background:${t.theme_color};color:#fff;cursor:default;width:100%;height:38px;font-weight:700;border:none;white-space:nowrap;" disabled>✓ 当前运营中</button>`
                : `<button class="btn btn-outline" style="width:100%;height:38px;border-color:#cbd5e1;color:#1e293b;white-space:nowrap;" onclick="window.switchIndustryTemplate('${t.key}', '${escapeHtml(t.name)}')">切换模式</button>`;

            const tplIcons = {
                universal: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="${t.theme_color}" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`,
                scrap: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="${t.theme_color}" stroke-width="2"><path d="M7 19H4.8a2 2 0 0 1-1.6-.9 2 2 0 0 1 0-1.8L7.2 9.5"></path><path d="M11 19h8.2a2 2 0 0 0 1.6-.9 2 2 0 0 0 0-1.8L17 10"></path><path d="M12 3a2 2 0 0 0-1.6.9L7.5 9h9l-2.9-5.1A2 2 0 0 0 12 3z"></path></svg>`,
                auto: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="${t.theme_color}" stroke-width="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>`,
                digital: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="${t.theme_color}" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>`,
                luxury: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="${t.theme_color}" stroke-width="2"><polygon points="6 3 18 3 22 9 12 22 2 9 6 3"></polygon></svg>`,
                appliance: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="${t.theme_color}" stroke-width="2"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>`
            };
            const iconSvg = tplIcons[t.key] || tplIcons.universal;

            tplCardsHtml += `
                <div class="card" style="padding:22px;border-radius:12px;${borderStyle};display:flex;flex-direction:column;justify-content:space-between;">
                    <div>
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
                            <div style="display:flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:10px;background:#f8fafc;">${iconSvg}</div>
                            ${isCur ? `<span class="badge" style="background:#dcfce7;color:#15803d;font-size:12px;padding:3px 8px;font-weight:bold;">运营中模式</span>` : ''}
                        </div>
                        <h3 style="font-size:16px;font-weight:700;color:#0f172a;margin-bottom:4px;">${escapeHtml(t.name)}</h3>
                        <p style="font-size:12px;color:#1e58ff;font-weight:600;margin-bottom:8px;">${escapeHtml(t.slogan)}</p>
                        <p style="font-size:12px;color:#64748b;line-height:1.5;margin-bottom:12px;">${escapeHtml(t.desc)}</p>
                        <div style="background:#f1f5f9;padding:8px 12px;border-radius:6px;font-size:12px;margin-bottom:14px;">
                            <div><strong>行业计价单位：</strong> ${escapeHtml(t.default_unit)}</div>
                        </div>
                    </div>
                    <div style="display:flex;gap:8px;margin-top:14px;align-items:center;">
                        <button type="button" class="btn btn-outline btn-preview-industry" data-key="${t.key}" style="flex:1;height:38px;border-color:#cbd5e1;color:#1e293b;font-weight:600;display:inline-flex;align-items:center;justify-content:center;gap:4px;font-size:12px;white-space:nowrap;">
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                            详情预览
                        </button>
                        <div style="flex:1;">
                            ${actionBtn}
                        </div>
                    </div>
                </div>
            `;
        });

        // 3. 构建视图主结构（选项卡切换）
        container.innerHTML = `
            <div class="card" style="margin-bottom:20px;padding:0;overflow:hidden;">
                <!-- 顶部说明条与前台效果直达入口 -->
                <div style="padding:18px 24px;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
                    <div>
                        <h3 style="font-size:16px;font-weight:700;color:#0f172a;margin:0;">
                            主题风格与行业模式
                        </h3>
                        <div style="font-size:12px;color:#64748b;margin-top:2px;">
                            切换前台配色主题或行业回收商品库
                        </div>
                    </div>
                    <div style="display:flex;gap:10px;">
                        <a href="/" target="_blank" class="btn btn-outline" style="border-color:#3b82f6;color:#2563eb;text-decoration:none;display:inline-flex;align-items:center;">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="margin-right:6px;"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
                            访问前台查看效果
                        </a>
                    </div>
                </div>

                <!-- 二级切换选项卡 -->
                <div style="padding:16px 24px;border-bottom:1px solid #e2e8f0;background:#ffffff;display:flex;gap:12px;">
                    <button type="button" id="tab-btn-theme" class="btn ${currentSubTab === 'theme' ? 'btn-primary' : 'btn-outline'}" style="font-weight:600;padding:8px 18px;">
                        🎨 视觉主题风格
                    </button>
                    <button type="button" id="tab-btn-industry" class="btn ${currentSubTab === 'industry' ? 'btn-primary' : 'btn-outline'}" style="font-weight:600;padding:8px 18px;">
                        🏢 行业业务模式
                    </button>
                </div>
            </div>

            <!-- 面板 1: 视觉主题风格外观模版 -->
            <div id="panel-theme-styles" style="display:${currentSubTab === 'theme' ? 'block' : 'none'};">
                <!-- 预置主题风格卡片网格 -->
                <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));gap:20px;margin-bottom:24px;">
                    ${themeCardsHtml}
                </div>

                <!-- 自定义品牌个性化配色 -->
                <div class="card" style="padding:22px;border-radius:12px;background:#ffffff;border:1px solid #e2e8f0;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                        <div>
                            <h4 style="margin:0;font-size:15px;font-weight:700;color:#0f172a;">自定义品牌色</h4>
                            <div style="font-size:12px;color:#64748b;margin-top:2px;">若上述主题无法满足需求，可在此自定义专属主色调</div>
                        </div>
                        ${curTheme.key === 'custom' ? '<span class="badge badge-success">当前正在使用自定义配色</span>' : ''}
                    </div>

                    <form id="form-custom-theme" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:16px;align-items:flex-end;">
                        <div>
                            <label style="display:block;font-size:12px;font-weight:600;color:#334155;margin-bottom:6px;">主色调</label>
                            <div style="display:flex;gap:8px;align-items:center;">
                                <input type="color" id="custom-picker-primary" value="${curTheme.primary || '#1e58ff'}" style="width:40px;height:36px;border:1px solid #cbd5e1;border-radius:6px;cursor:pointer;padding:2px;">
                                <input type="text" id="custom-text-primary" class="form-control" value="${curTheme.primary || '#1e58ff'}" placeholder="#1e58ff" style="flex:1;height:36px;font-family:monospace;font-size:13px;">
                            </div>
                        </div>

                        <div>
                            <label style="display:block;font-size:12px;font-weight:600;color:#334155;margin-bottom:6px;">悬停色</label>
                            <div style="display:flex;gap:8px;align-items:center;">
                                <input type="color" id="custom-picker-hover" value="${curTheme.primary_hover || '#1645cf'}" style="width:40px;height:36px;border:1px solid #cbd5e1;border-radius:6px;cursor:pointer;padding:2px;">
                                <input type="text" id="custom-text-hover" class="form-control" value="${curTheme.primary_hover || '#1645cf'}" placeholder="#1645cf" style="flex:1;height:36px;font-family:monospace;font-size:13px;">
                            </div>
                        </div>

                        <div>
                            <label style="display:block;font-size:12px;font-weight:600;color:#334155;margin-bottom:6px;">浅色背景</label>
                            <div style="display:flex;gap:8px;align-items:center;">
                                <input type="color" id="custom-picker-light" value="${curTheme.primary_light || '#eef3ff'}" style="width:40px;height:36px;border:1px solid #cbd5e1;border-radius:6px;cursor:pointer;padding:2px;">
                                <input type="text" id="custom-text-light" class="form-control" value="${curTheme.primary_light || '#eef3ff'}" placeholder="#eef3ff" style="flex:1;height:36px;font-family:monospace;font-size:13px;">
                            </div>
                        </div>

                        <div>
                            <button type="submit" class="btn btn-primary" style="height:36px;width:100%;font-weight:600;">
                                应用自定义配色
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- 面板 2: 行业业务品类数据模版 -->
            <div id="panel-industry-templates" style="display:${currentSubTab === 'industry' ? 'block' : 'none'};">
                <div style="font-size:13px;color:#64748b;margin-bottom:16px;">
                    选择行业模式将自动装载对应行业的商品类目与估价规则。
                </div>

                <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));gap:20px;">
                    ${tplCardsHtml}
                </div>
            </div>
        `;

        // 绑定二级 Tab 切换事件
        document.getElementById('tab-btn-theme')?.addEventListener('click', function () {
            currentSubTab = 'theme';
            const panelTheme = document.getElementById('panel-theme-styles');
            const panelIndustry = document.getElementById('panel-industry-templates');
            const btnTheme = document.getElementById('tab-btn-theme');
            const btnIndustry = document.getElementById('tab-btn-industry');
            if (panelTheme) panelTheme.style.display = 'block';
            if (panelIndustry) panelIndustry.style.display = 'none';
            btnTheme?.classList.add('btn-primary');
            btnTheme?.classList.remove('btn-outline');
            btnIndustry?.classList.remove('btn-primary');
            btnIndustry?.classList.add('btn-outline');
        });

        document.getElementById('tab-btn-industry')?.addEventListener('click', function () {
            currentSubTab = 'industry';
            const panelTheme = document.getElementById('panel-theme-styles');
            const panelIndustry = document.getElementById('panel-industry-templates');
            const btnTheme = document.getElementById('tab-btn-theme');
            const btnIndustry = document.getElementById('tab-btn-industry');
            if (panelTheme) panelTheme.style.display = 'none';
            if (panelIndustry) panelIndustry.style.display = 'block';
            btnIndustry?.classList.add('btn-primary');
            btnIndustry?.classList.remove('btn-outline');
            btnTheme?.classList.remove('btn-primary');
            btnTheme?.classList.add('btn-outline');
        });

        // 取色器联动
        const pickPrimary = document.getElementById('custom-picker-primary');
        const textPrimary = document.getElementById('custom-text-primary');
        pickPrimary?.addEventListener('input', (e) => { if (textPrimary) textPrimary.value = e.target.value; });
        textPrimary?.addEventListener('input', (e) => { if (pickPrimary && /^#[0-9a-fA-F]{6}$/.test(e.target.value)) pickPrimary.value = e.target.value; });

        const pickHover = document.getElementById('custom-picker-hover');
        const textHover = document.getElementById('custom-text-hover');
        pickHover?.addEventListener('input', (e) => { if (textHover) textHover.value = e.target.value; });
        textHover?.addEventListener('input', (e) => { if (pickHover && /^#[0-9a-fA-F]{6}$/.test(e.target.value)) pickHover.value = e.target.value; });

        const pickLight = document.getElementById('custom-picker-light');
        const textLight = document.getElementById('custom-text-light');
        pickLight?.addEventListener('input', (e) => { if (textLight) textLight.value = e.target.value; });
        textLight?.addEventListener('input', (e) => { if (pickLight && /^#[0-9a-fA-F]{6}$/.test(e.target.value)) pickLight.value = e.target.value; });

        // 自定义配色表单提交
        document.getElementById('form-custom-theme')?.addEventListener('submit', async function (e) {
            e.preventDefault();
            const primary = document.getElementById('custom-text-primary')?.value.trim() || '#1e58ff';
            const hover = document.getElementById('custom-text-hover')?.value.trim() || primary;
            const light = document.getElementById('custom-text-light')?.value.trim() || '#f8fafc';

            const curApi = window.adminApi || window.api;
            const res = await curApi.post('/admin/config/switchThemeStyle', {
                theme_key: 'custom',
                custom_colors: { primary, hover, light }
            });

            if (res && res.code === 200) {
                SysUI.toast(res.msg || '自定义配色已应用！', 'success');
                renderTemplatesView(container);
            } else {
                SysUI.toast(res ? res.msg : '保存自定义配色失败', 'error');
            }
        });

        // 绑定视觉主题风格预览按钮
        container.querySelectorAll('.btn-preview-theme').forEach(btn => {
            btn.addEventListener('click', function () {
                const key = this.getAttribute('data-key');
                openThemePreviewModal(key, themeList);
            });
        });

        // 绑定行业业务模式预览按钮
        container.querySelectorAll('.btn-preview-industry').forEach(btn => {
            btn.addEventListener('click', function () {
                const key = this.getAttribute('data-key');
                openIndustryPreviewModal(key, tplList);
            });
        });
    }

    /**
     * 打开全功能主题风格实景预览弹窗 (支持 PC 桌面端与微信小程序端实时切换，支持弹窗内无缝横向比对所有主题)
     */
    function openThemePreviewModal(initialKey, themeList) {
        let activeKey = initialKey;
        let activeDevice = 'pc'; // 'pc' 或 'mobile'

        let modal = document.getElementById('modal-theme-preview');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modal-theme-preview';
            modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,0.7);backdrop-filter:blur(5px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';
            document.body.appendChild(modal);
        }
        modal.style.display = 'flex';

        function renderModalContent() {
            const theme = themeList.find(t => t.key === activeKey) || themeList[0] || {};
            const primary = theme.primary || '#1e58ff';
            const primaryGradient = theme.primary_gradient || `linear-gradient(135deg, ${primary} 0%, #3b82f6 100%)`;
            const primaryLight = theme.primary_light || '#f8fafc';
            const accent = theme.accent || '#10b981';

            // 顶部各主题无缝切换药丸按键
            const themePillsHtml = themeList.map(t => {
                const isActive = t.key === activeKey;
                const border = isActive ? `2px solid ${t.primary}` : '1px solid #cbd5e1';
                const bg = isActive ? '#ffffff' : '#f8fafc';
                const shadow = isActive ? `0 2px 8px ${t.primary}30` : 'none';
                return `
                    <button type="button" class="btn-theme-pill-select" data-key="${t.key}" style="border:${border};background:${bg};box-shadow:${shadow};border-radius:20px;padding:4px 12px;font-size:12px;display:inline-flex;align-items:center;gap:6px;cursor:pointer;transition:all 0.15s;font-weight:${isActive ? '700' : '500'};color:${isActive ? '#0f172a' : '#475569'};">
                        <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${t.primary};"></span>
                        ${escapeHtml(t.name)}
                        ${isActive ? `<span style="font-size:10px;color:${t.primary};font-weight:bold;">(正在预览)</span>` : ''}
                    </button>
                `;
            }).join('');

            // 画布内容：PC 桌面端 or 移动端/小程序
            let canvasHtml = '';
            if (activeDevice === 'pc') {
                canvasHtml = `
                    <div style="width:100%;max-width:960px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #cbd5e1;box-shadow:0 20px 40px -15px rgba(0,0,0,0.15);overflow:hidden;display:flex;flex-direction:column;">
                        <!-- 浏览器模拟顶栏 -->
                        <div style="background:#f1f5f9;padding:8px 14px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;gap:12px;">
                            <div style="display:flex;gap:6px;">
                                <span style="width:10px;height:10px;border-radius:50%;background:#ef4444;display:inline-block;"></span>
                                <span style="width:10px;height:10px;border-radius:50%;background:#f59e0b;display:inline-block;"></span>
                                <span style="width:10px;height:10px;border-radius:50%;background:#10b981;display:inline-block;"></span>
                            </div>
                            <div style="flex:1;max-width:540px;background:#ffffff;border:1px solid #cbd5e1;border-radius:6px;padding:3px 12px;font-size:11px;color:#64748b;display:flex;align-items:center;gap:6px;">
                                <span style="color:#10b981;">🔒</span>
                                <span>https://recovery.system.com/?preview_theme=<b>${escapeHtml(theme.key)}</b></span>
                            </div>
                            <span style="font-size:11px;color:#94a3b8;margin-left:auto;">💻 PC 桌面端 (1200宽屏视图)</span>
                        </div>

                        <!-- 浏览器内容区 -->
                        <div style="padding:0;max-height:500px;overflow-y:auto;background:#ffffff;">
                            <!-- 模拟顶栏导航 -->
                            <div style="padding:12px 24px;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center;">
                                <div style="display:flex;align-items:center;gap:8px;">
                                    <div style="width:28px;height:28px;border-radius:6px;background:${primaryGradient};display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;font-weight:bold;">♻</div>
                                    <span style="font-size:15px;font-weight:800;color:#0f172a;">启灵回收官方自营</span>
                                </div>
                                <div style="display:flex;gap:18px;font-size:12px;font-weight:600;color:#475569;align-items:center;">
                                    <span style="color:${primary};border-bottom:2px solid ${primary};padding-bottom:2px;">首页</span>
                                    <span>数码回收</span>
                                    <span>废旧物资</span>
                                    <span>名表黄金</span>
                                    <span>大家电拆旧</span>
                                    <span>顺丰免费上门</span>
                                </div>
                                <div>
                                    <button type="button" style="background:${primary};color:#fff;border:none;border-radius:6px;padding:5px 14px;font-size:11px;font-weight:bold;cursor:default;">
                                        登录 / 估价清单
                                    </button>
                                </div>
                            </div>

                            <!-- 模拟首屏 Hero 区域 -->
                            <div style="background:${primaryGradient};padding:32px 24px;text-align:center;color:#ffffff;">
                                <div style="display:inline-block;background:rgba(255,255,255,0.22);backdrop-filter:blur(6px);padding:3px 12px;border-radius:20px;font-size:11px;font-weight:600;margin-bottom:12px;border:1px solid rgba(255,255,255,0.3);">
                                    ✨ 官方自营 · 顺丰免费上门 · 10秒快速估价 · 秒级放款到账
                                </div>
                                <h2 style="font-size:24px;font-weight:900;margin:0 0 8px 0;letter-spacing:0.5px;">高价回收 · 10秒快速精准估价</h2>
                                <p style="font-size:12px;opacity:0.9;margin:0 0 20px 0;">全品类回收 · 顺丰免费上门包邮 · 个人隐私安全保障</p>
                                
                                <!-- 模拟搜索栏 -->
                                <div style="max-width:520px;margin:0 auto 12px auto;display:flex;background:#ffffff;border-radius:8px;padding:4px;box-shadow:0 8px 20px rgba(0,0,0,0.12);">
                                    <input type="text" placeholder="请输入要回收的物品型号，如 iPhone 15 Pro、特级紫铜、空调..." style="flex:1;border:none;outline:none;padding:8px 12px;font-size:12px;color:#1e293b;" readonly value="iPhone 15 Pro Max">
                                    <button type="button" style="background:${primary};color:#ffffff;border:none;border-radius:6px;padding:0 20px;font-size:12px;font-weight:700;cursor:default;">
                                        立即估价
                                    </button>
                                </div>

                                <!-- 热门标签 -->
                                <div style="display:flex;justify-content:center;gap:6px;flex-wrap:wrap;">
                                    <span style="font-size:11px;opacity:0.85;">热门搜索：</span>
                                    <span style="background:rgba(255,255,255,0.25);border-radius:4px;padding:2px 8px;font-size:10px;">iPhone 15 Pro</span>
                                    <span style="background:rgba(255,255,255,0.25);border-radius:4px;padding:2px 8px;font-size:10px;">Mate 60 Pro</span>
                                    <span style="background:rgba(255,255,255,0.25);border-radius:4px;padding:2px 8px;font-size:10px;">1#特级紫铜线</span>
                                    <span style="background:rgba(255,255,255,0.25);border-radius:4px;padding:2px 8px;font-size:10px;">足金999按克回收</span>
                                </div>
                            </div>

                            <!-- 信任指标栏 -->
                            <div style="background:#f8fafc;padding:12px 24px;border-bottom:1px solid #e2e8f0;display:grid;grid-template-columns:repeat(4, 1fr);gap:12px;text-align:center;">
                                <div><div style="font-size:14px;font-weight:800;color:${primary};">120万+</div><div style="font-size:10px;color:#64748b;">累计完成回收</div></div>
                                <div><div style="font-size:14px;font-weight:800;color:${primary};">10秒</div><div style="font-size:10px;color:#64748b;">快速精准估价</div></div>
                                <div><div style="font-size:14px;font-weight:800;color:${primary};">0元</div><div style="font-size:10px;color:#64748b;">顺丰双向包邮</div></div>
                                <div><div style="font-size:14px;font-weight:800;color:${primary};">100%</div><div style="font-size:10px;color:#64748b;">隐私安全清除</div></div>
                            </div>

                            <!-- 品类卡片与商品模拟 -->
                            <div style="padding:20px 24px;">
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                                    <div style="font-size:14px;font-weight:700;color:#0f172a;">精选热门回收机型</div>
                                    <div style="display:flex;gap:6px;">
                                        <span style="background:${primary};color:#fff;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:bold;">手机数码</span>
                                        <span style="background:#f1f5f9;color:#64748b;padding:2px 10px;border-radius:12px;font-size:11px;">废旧物资</span>
                                        <span style="background:#f1f5f9;color:#64748b;padding:2px 10px;border-radius:12px;font-size:11px;">名表奢侈品</span>
                                    </div>
                                </div>

                                <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:14px;">
                                    <div style="border:1px solid #e2e8f0;border-radius:8px;padding:12px;background:#ffffff;display:flex;gap:12px;align-items:center;">
                                        <div style="width:44px;height:44px;border-radius:6px;background:${primaryLight};display:flex;align-items:center;justify-content:center;font-size:22px;">📱</div>
                                        <div style="flex:1;">
                                            <div style="font-size:12px;font-weight:700;color:#0f172a;">iPhone 15 Pro Max</div>
                                            <div style="font-size:10px;color:#64748b;">最高回收指导价</div>
                                            <div style="font-size:13px;font-weight:800;color:${primary};">¥6,800.00</div>
                                        </div>
                                        <button type="button" style="background:${primary};color:#fff;border:none;border-radius:4px;padding:4px 8px;font-size:11px;font-weight:bold;">测算</button>
                                    </div>

                                    <div style="border:1px solid #e2e8f0;border-radius:8px;padding:12px;background:#ffffff;display:flex;gap:12px;align-items:center;">
                                        <div style="width:44px;height:44px;border-radius:6px;background:${primaryLight};display:flex;align-items:center;justify-content:center;font-size:22px;">⚡</div>
                                        <div style="flex:1;">
                                            <div style="font-size:12px;font-weight:700;color:#0f172a;">1# 特级光亮紫铜线</div>
                                            <div style="font-size:10px;color:#64748b;">今日实时牌价</div>
                                            <div style="font-size:13px;font-weight:800;color:${primary};">¥69.50 <span style="font-size:10px;color:#64748b;font-weight:normal;">/公斤</span></div>
                                        </div>
                                        <button type="button" style="background:${primary};color:#fff;border:none;border-radius:4px;padding:4px 8px;font-size:11px;font-weight:bold;">交投</button>
                                    </div>

                                    <div style="border:1px solid #e2e8f0;border-radius:8px;padding:12px;background:#ffffff;display:flex;gap:12px;align-items:center;">
                                        <div style="width:44px;height:44px;border-radius:6px;background:${primaryLight};display:flex;align-items:center;justify-content:center;font-size:22px;">⌚</div>
                                        <div style="flex:1;">
                                            <div style="font-size:12px;font-weight:700;color:#0f172a;">劳力士 潜航者黑水鬼</div>
                                            <div style="font-size:10px;color:#64748b;">中检双核 实时结算</div>
                                            <div style="font-size:13px;font-weight:800;color:${primary};">¥72,000.00</div>
                                        </div>
                                        <button type="button" style="background:${primary};color:#fff;border:none;border-radius:4px;padding:4px 8px;font-size:11px;font-weight:bold;">鉴定</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                // 移动端 / 微信小程序实景预览 (375px 真实手机比例)
                canvasHtml = `
                    <div style="width:340px;margin:0 auto;background:#ffffff;border-radius:36px;border:8px solid #1e293b;box-shadow:0 25px 50px -12px rgba(0,0,0,0.35);overflow:hidden;display:flex;flex-direction:column;position:relative;">
                        <!-- 手机摄像头与听筒刘海模拟 -->
                        <div style="background:#1e293b;height:18px;display:flex;justify-content:center;align-items:center;">
                            <span style="width:40px;height:4px;background:#334155;border-radius:2px;display:inline-block;"></span>
                        </div>

                        <!-- 微信小程序顶栏与胶囊按键模拟 -->
                        <div style="background:#ffffff;padding:8px 12px;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center;">
                            <span style="font-size:11px;color:#0f172a;font-weight:700;">9:41 · 5G</span>
                            <span style="font-size:12px;font-weight:800;color:#0f172a;">启灵回收小程序</span>
                            <!-- 小程序右上角胶囊按键 -->
                            <div style="border:1px solid #e2e8f0;border-radius:12px;padding:2px 8px;font-size:10px;color:#64748b;display:flex;gap:6px;align-items:center;background:#f8fafc;">
                                <span>•••</span>
                                <span style="color:#cbd5e1;">|</span>
                                <span>⭕</span>
                            </div>
                        </div>

                        <!-- 手机屏幕滚动内容 -->
                        <div style="max-height:460px;overflow-y:auto;background:#f8fafc;padding-bottom:52px;">
                            <!-- 小程序 Banner 卡片 -->
                            <div style="padding:10px;">
                                <div style="background:${primaryGradient};border-radius:12px;padding:16px 14px;color:#ffffff;box-shadow:0 6px 16px ${primary}30;">
                                    <div style="font-size:10px;background:rgba(255,255,255,0.22);display:inline-block;padding:2px 6px;border-radius:4px;margin-bottom:6px;">官方直营 · 顺丰包邮</div>
                                    <div style="font-size:16px;font-weight:900;margin-bottom:4px;">全品类数字化回收</div>
                                    <div style="font-size:11px;opacity:0.9;margin-bottom:12px;">算法秒测算 · 上门即刻到账</div>
                                    <button type="button" style="background:#ffffff;color:${primary};border:none;border-radius:16px;padding:4px 12px;font-size:11px;font-weight:800;">10秒快速测算 ›</button>
                                </div>
                            </div>

                            <!-- 4 格金刚区金刚位快捷导航 -->
                            <div style="margin:0 10px 10px 10px;background:#ffffff;border-radius:10px;padding:12px 6px;display:grid;grid-template-columns:repeat(4, 1fr);gap:6px;text-align:center;">
                                <div>
                                    <div style="width:36px;height:36px;border-radius:50%;background:${primaryLight};color:${primary};margin:0 auto 4px auto;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:bold;">📱</div>
                                    <div style="font-size:11px;color:#1e293b;font-weight:600;">快速估价</div>
                                </div>
                                <div>
                                    <div style="width:36px;height:36px;border-radius:50%;background:${primaryLight};color:${primary};margin:0 auto 4px auto;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:bold;">🚚</div>
                                    <div style="font-size:11px;color:#1e293b;font-weight:600;">顺丰上门</div>
                                </div>
                                <div>
                                    <div style="width:36px;height:36px;border-radius:50%;background:${primaryLight};color:${primary};margin:0 auto 4px auto;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:bold;">🎟️</div>
                                    <div style="font-size:11px;color:#1e293b;font-weight:600;">加价券包</div>
                                </div>
                                <div>
                                    <div style="width:36px;height:36px;border-radius:50%;background:${primaryLight};color:${primary};margin:0 auto 4px auto;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:bold;">📋</div>
                                    <div style="font-size:11px;color:#1e293b;font-weight:600;">查单进度</div>
                                </div>
                            </div>

                            <!-- 热门估价机型列表 -->
                            <div style="padding:0 10px;">
                                <div style="font-size:12px;font-weight:700;color:#0f172a;margin-bottom:8px;display:flex;justify-content:space-between;">
                                    <span>高频热门回收款</span>
                                    <span style="font-size:11px;color:${primary};">全部品类 ›</span>
                                </div>

                                <div style="background:#ffffff;border-radius:8px;padding:10px;margin-bottom:8px;display:flex;align-items:center;gap:10px;border:1px solid #f1f5f9;">
                                    <div style="width:40px;height:40px;border-radius:6px;background:${primaryLight};display:flex;align-items:center;justify-content:center;font-size:20px;">📱</div>
                                    <div style="flex:1;">
                                        <div style="font-size:12px;font-weight:700;color:#0f172a;">iPhone 15 Pro Max</div>
                                        <div style="font-size:10px;color:#94a3b8;">最高估价</div>
                                        <div style="font-size:13px;font-weight:800;color:${primary};">¥6,800.00</div>
                                    </div>
                                    <button type="button" style="background:${primary};color:#fff;border:none;border-radius:12px;padding:4px 10px;font-size:10px;font-weight:bold;">去估价</button>
                                </div>

                                <div style="background:#ffffff;border-radius:8px;padding:10px;display:flex;align-items:center;gap:10px;border:1px solid #f1f5f9;">
                                    <div style="width:40px;height:40px;border-radius:6px;background:${primaryLight};display:flex;align-items:center;justify-content:center;font-size:20px;">⚡</div>
                                    <div style="flex:1;">
                                        <div style="font-size:12px;font-weight:700;color:#0f172a;">1# 特级光亮紫铜线</div>
                                        <div style="font-size:10px;color:#94a3b8;">今日实时牌价</div>
                                        <div style="font-size:13px;font-weight:800;color:${primary};">¥69.50 / 公斤</div>
                                    </div>
                                    <button type="button" style="background:${primary};color:#fff;border:none;border-radius:12px;padding:4px 10px;font-size:10px;font-weight:bold;">去过磅</button>
                                </div>
                            </div>
                        </div>

                        <!-- 微信小程序底部固定 TabBar -->
                        <div style="position:absolute;bottom:0;left:0;right:0;height:48px;background:#ffffff;border-top:1px solid #e2e8f0;display:grid;grid-template-columns:repeat(4, 1fr);align-items:center;text-align:center;font-size:10px;">
                            <div style="color:${primary};font-weight:700;">
                                <div style="font-size:14px;line-height:1;">🏠</div>
                                <div>首页</div>
                            </div>
                            <div style="color:#94a3b8;">
                                <div style="font-size:14px;line-height:1;">📁</div>
                                <div>品类</div>
                            </div>
                            <div style="color:#94a3b8;">
                                <div style="font-size:14px;line-height:1;">📋</div>
                                <div>订单</div>
                            </div>
                            <div style="color:#94a3b8;">
                                <div style="font-size:14px;line-height:1;">👤</div>
                                <div>我的</div>
                            </div>
                        </div>
                    </div>
                `;
            }

            modal.innerHTML = `
                <div style="background:#ffffff;border-radius:16px;width:100%;max-width:1020px;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 25px 60px -15px rgba(0,0,0,0.3);overflow:hidden;">
                    <!-- 弹窗顶栏 -->
                    <div style="padding:14px 20px;border-bottom:1px solid #e2e8f0;background:#f8fafc;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                        <div style="display:flex;align-items:center;gap:10px;">
                            <span style="font-size:16px;font-weight:800;color:#0f172a;">🎨 视觉主题风格实景预览</span>
                            <span class="badge" style="background:${primaryLight};color:${primary};border:1px solid ${primary};font-size:11px;padding:2px 8px;font-weight:bold;">
                                ${escapeHtml(theme.name)} · ${escapeHtml(theme.badge_text || '')}
                            </span>
                        </div>

                        <!-- 切换端 (PC vs 小程序) -->
                        <div style="display:flex;background:#e2e8f0;border-radius:8px;padding:3px;gap:2px;">
                            <button type="button" id="btn-device-pc" class="btn" style="height:30px;padding:0 12px;font-size:12px;font-weight:600;border:none;border-radius:6px;${activeDevice === 'pc' ? 'background:#ffffff;color:#0f172a;box-shadow:0 1px 3px rgba(0,0,0,0.1);' : 'background:transparent;color:#64748b;'}">
                                💻 PC 桌面端
                            </button>
                            <button type="button" id="btn-device-mobile" class="btn" style="height:30px;padding:0 12px;font-size:12px;font-weight:600;border:none;border-radius:6px;${activeDevice === 'mobile' ? 'background:#ffffff;color:#0f172a;box-shadow:0 1px 3px rgba(0,0,0,0.1);' : 'background:transparent;color:#64748b;'}">
                                📱 手机 / 微信小程序端
                            </button>
                        </div>

                        <!-- 右侧操作 -->
                        <div style="display:flex;align-items:center;gap:8px;">
                            <a href="/?preview_theme=${escapeHtml(theme.key)}" target="_blank" class="btn btn-outline" style="height:32px;font-size:12px;border-color:#cbd5e1;color:#2563eb;text-decoration:none;display:inline-flex;align-items:center;gap:4px;">
                                <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
                                新窗口实景体验
                            </a>
                            <button type="button" id="btn-close-theme-modal" style="background:none;border:none;font-size:22px;line-height:1;color:#94a3b8;cursor:pointer;padding:4px;">&times;</button>
                        </div>
                    </div>

                    <!-- 主题快速切换栏 (支持在弹窗内无缝横向比对所有主题) -->
                    <div style="padding:10px 20px;background:#ffffff;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:8px;overflow-x:auto;">
                        <span style="font-size:11px;color:#64748b;font-weight:bold;white-space:nowrap;">快速切换主题预览：</span>
                        <div style="display:flex;gap:8px;flex-wrap:nowrap;">
                            ${themePillsHtml}
                        </div>
                    </div>

                    <!-- 核心画布区域 -->
                    <div style="flex:1;overflow-y:auto;padding:20px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;">
                        ${canvasHtml}
                    </div>

                    <!-- 弹窗底栏 -->
                    <div style="padding:12px 20px;border-top:1px solid #e2e8f0;background:#f8fafc;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                        <div style="font-size:12px;color:#64748b;">
                            <strong>适用场景：</strong>${escapeHtml(theme.recommend_for || '-')}
                        </div>
                        <div style="display:flex;gap:10px;">
                            <button type="button" class="btn btn-secondary" id="btn-cancel-theme-prev" style="height:36px;padding:0 18px;font-size:13px;">关闭预览</button>
                            <button type="button" class="btn" id="btn-apply-theme-now" style="height:36px;padding:0 20px;font-size:13px;font-weight:700;background:${primary};color:#ffffff;border:none;">
                                一键全站应用此主题风格
                            </button>
                        </div>
                    </div>
                </div>
            `;

            // 重新绑定弹窗内部交互事件
            modal.querySelector('#btn-close-theme-modal')?.addEventListener('click', () => { modal.style.display = 'none'; });
            modal.querySelector('#btn-cancel-theme-prev')?.addEventListener('click', () => { modal.style.display = 'none'; });

            modal.querySelector('#btn-device-pc')?.addEventListener('click', () => {
                activeDevice = 'pc';
                renderModalContent();
            });
            modal.querySelector('#btn-device-mobile')?.addEventListener('click', () => {
                activeDevice = 'mobile';
                renderModalContent();
            });

            // 切换不同主题
            modal.querySelectorAll('.btn-theme-pill-select').forEach(btn => {
                btn.addEventListener('click', function () {
                    activeKey = this.getAttribute('data-key');
                    renderModalContent();
                });
            });

            // 一键应用按钮
            modal.querySelector('#btn-apply-theme-now')?.addEventListener('click', () => {
                modal.style.display = 'none';
                switchThemeStyle(theme.key, theme.name);
            });
        }

        renderModalContent();
    }

    /**
     * 打开行业模式详情与预览弹窗 (含预置分类、参考机型价格、行业特性与模块展示)
     */
    function openIndustryPreviewModal(initialKey, tplList) {
        let activeKey = initialKey;

        let modal = document.getElementById('modal-industry-preview');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modal-industry-preview';
            modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,0.7);backdrop-filter:blur(5px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';
            document.body.appendChild(modal);
        }
        modal.style.display = 'flex';

        function renderModalContent() {
            const tpl = tplList.find(t => t.key === activeKey) || tplList[0] || {};
            const themeColor = tpl.theme_color || '#1e58ff';

            // 顶部各行业快速切换
            const industryPillsHtml = tplList.map(t => {
                const isActive = t.key === activeKey;
                const border = isActive ? `2px solid ${t.theme_color}` : '1px solid #cbd5e1';
                const bg = isActive ? '#ffffff' : '#f8fafc';
                const shadow = isActive ? `0 2px 8px ${t.theme_color}30` : 'none';
                return `
                    <button type="button" class="btn-tpl-pill-select" data-key="${t.key}" style="border:${border};background:${bg};box-shadow:${shadow};border-radius:20px;padding:4px 12px;font-size:12px;display:inline-flex;align-items:center;gap:6px;cursor:pointer;transition:all 0.15s;font-weight:${isActive ? '700' : '500'};color:${isActive ? '#0f172a' : '#475569'};">
                        <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${t.theme_color};"></span>
                        ${escapeHtml(t.name)}
                        ${isActive ? `<span style="font-size:10px;color:${t.theme_color};font-weight:bold;">(正在预览)</span>` : ''}
                    </button>
                `;
            }).join('');

            // 4大专属特性卡片
            const featuresHtml = (tpl.preview_features || []).map((feat, idx) => `
                <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;display:flex;gap:10px;align-items:center;">
                    <div style="width:28px;height:28px;border-radius:6px;background:${themeColor}15;color:${themeColor};display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:bold;flex-shrink:0;">
                        ${idx + 1}
                    </div>
                    <div style="font-size:12px;font-weight:600;color:#1e293b;line-height:1.4;">
                        ${escapeHtml(feat)}
                    </div>
                </div>
            `).join('');

            // 预置 5 大品类标签
            const catsHtml = (tpl.preview_categories || []).map(cat => `
                <span style="display:inline-flex;align-items:center;gap:4px;background:#f1f5f9;color:#334155;border-radius:6px;padding:4px 10px;font-size:12px;font-weight:600;border:1px solid #e2e8f0;">
                    <span style="color:${themeColor};">✔</span> ${escapeHtml(cat)}
                </span>
            `).join('');

            // 预置机型卡片
            const devicesHtml = (tpl.preview_devices || []).map(dev => `
                <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:10px;display:flex;gap:10px;align-items:center;">
                    <img src="${escapeHtml(dev.img || '/uploads/default/dev_default.svg')}" style="width:40px;height:40px;object-fit:contain;border-radius:6px;background:#f8fafc;padding:2px;" onerror="this.src='/uploads/default/dev_default.svg'">
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:12px;font-weight:700;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(dev.name)}</div>
                        <div style="font-size:11px;color:#64748b;margin-top:2px;">
                            预置参考价：<strong style="color:${themeColor};font-size:13px;">${escapeHtml(dev.price)}</strong> / ${escapeHtml(dev.unit || tpl.default_unit)}
                        </div>
                    </div>
                </div>
            `).join('');

            // 预置估价核心维度题库
            const questionsHtml = (tpl.preview_questions || []).map((q, idx) => `
                <div style="display:inline-flex;align-items:center;gap:6px;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:6px;padding:4px 10px;font-size:11px;color:#475569;">
                    <span style="font-weight:bold;color:${themeColor};">维度${idx + 1}:</span>
                    <span>${escapeHtml(q)}</span>
                </div>
            `).join('');

            // 行业独占前台特色专区实景模拟
            let exclusiveSectionHtml = '';
            if (tpl.key === 'scrap') {
                exclusiveSectionHtml = `
                    <div style="border:1px solid #10b98140;background:#ecfdf5;border-radius:10px;padding:14px;margin-bottom:16px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                            <div style="display:flex;align-items:center;gap:6px;">
                                <span style="font-size:16px;">📊</span>
                                <span style="font-size:13px;font-weight:800;color:#065f46;">【废品再生独占】今日废旧物资行情大看板实景模拟</span>
                            </div>
                            <span style="font-size:11px;color:#059669;font-weight:600;">实时行情跟踪 · 上门精准过磅</span>
                        </div>
                        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:10px;">
                            <div style="background:#ffffff;border-radius:6px;padding:8px 12px;border:1px solid #a7f3d0;">
                                <div style="font-size:11px;color:#64748b;">1# 特级光亮紫铜线</div>
                                <div style="font-size:15px;font-weight:800;color:#059669;margin-top:2px;">¥69.50 <span style="font-size:10px;color:#64748b;">/ 公斤</span> <span style="font-size:11px;color:#dc2626;">▲ +0.80</span></div>
                            </div>
                            <div style="background:#ffffff;border-radius:6px;padding:8px 12px;border:1px solid #a7f3d0;">
                                <div style="font-size:11px;color:#64748b;">断桥铝合金门窗型材</div>
                                <div style="font-size:15px;font-weight:800;color:#059669;margin-top:2px;">¥18.50 <span style="font-size:10px;color:#64748b;">/ 公斤</span> <span style="font-size:11px;color:#dc2626;">▲ +0.20</span></div>
                            </div>
                            <div style="background:#ffffff;border-radius:6px;padding:8px 12px;border:1px solid #a7f3d0;">
                                <div style="font-size:11px;color:#64748b;">工业特级重废钢 (≥6mm)</div>
                                <div style="font-size:15px;font-weight:800;color:#059669;margin-top:2px;">¥2,920.00 <span style="font-size:10px;color:#64748b;">/ 吨</span> <span style="font-size:11px;color:#64748b;">- 持平</span></div>
                            </div>
                            <div style="background:#ffffff;border-radius:6px;padding:8px 12px;border:1px solid #a7f3d0;">
                                <div style="font-size:11px;color:#64748b;">汽车免维护铅酸电瓶</div>
                                <div style="font-size:15px;font-weight:800;color:#059669;margin-top:2px;">¥9.80 <span style="font-size:10px;color:#64748b;">/ 公斤</span> <span style="font-size:11px;color:#16a34a;">▼ -0.10</span></div>
                            </div>
                        </div>
                    </div>
                `;
            } else if (tpl.key === 'luxury') {
                exclusiveSectionHtml = `
                    <div style="border:1px solid #d9770640;background:#fffbeb;border-radius:10px;padding:14px;margin-bottom:16px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                            <div style="display:flex;align-items:center;gap:6px;">
                                <span style="font-size:16px;">💎</span>
                                <span style="font-size:13px;font-weight:800;color:#92400e;">【奢侈品黄金独占】国际金价实时折算与名表专区实景模拟</span>
                            </div>
                            <span style="font-size:11px;color:#b45309;font-weight:600;">足金999按克变现 · 中检双核保价</span>
                        </div>
                        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:10px;">
                            <div style="background:#ffffff;border-radius:6px;padding:8px 12px;border:1px solid #fde68a;">
                                <div style="font-size:11px;color:#64748b;">足金999.9投资金条/饰金</div>
                                <div style="font-size:15px;font-weight:800;color:#d97706;margin-top:2px;">¥585.00 <span style="font-size:10px;color:#64748b;">/ 克 (按日随盘)</span></div>
                            </div>
                            <div style="background:#ffffff;border-radius:6px;padding:8px 12px;border:1px solid #fde68a;">
                                <div style="font-size:11px;color:#64748b;">瑞士高级名表 (劳力士/欧米茄)</div>
                                <div style="font-size:15px;font-weight:800;color:#d97706;margin-top:2px;">中检双核 · 顺丰专员密封保价</div>
                            </div>
                            <div style="background:#ffffff;border-radius:6px;padding:8px 12px;border:1px solid #fde68a;">
                                <div style="font-size:11px;color:#64748b;">大牌箱包 (爱马仕/香奈儿)</div>
                                <div style="font-size:15px;font-weight:800;color:#d97706;margin-top:2px;">五金皮质光学检测 · 大额当面付</div>
                            </div>
                        </div>
                    </div>
                `;
            } else if (tpl.key === 'auto') {
                exclusiveSectionHtml = `
                    <div style="border:1px solid #ea580c40;background:#fff7ed;border-radius:10px;padding:14px;margin-bottom:16px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                            <div style="display:flex;align-items:center;gap:6px;">
                                <span style="font-size:16px;">🚗</span>
                                <span style="font-size:13px;font-weight:800;color:#9a3412;">【二手汽车独占】0元上门验车 · 全程免费拖车与合规过户通道</span>
                            </div>
                            <span style="font-size:11px;color:#ea580c;font-weight:600;">过户免责代办 · 报废补贴代申领</span>
                        </div>
                        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:10px;">
                            <div style="background:#ffffff;border-radius:6px;padding:8px 12px;border:1px solid #fed7aa;">
                                <div style="font-size:11px;color:#64748b;">全城免费拖车</div>
                                <div style="font-size:14px;font-weight:800;color:#ea580c;margin-top:2px;">故障车/老旧车免费拖运</div>
                            </div>
                            <div style="background:#ffffff;border-radius:6px;padding:8px 12px;border:1px solid #fed7aa;">
                                <div style="font-size:11px;color:#64748b;">车管所合规过户</div>
                                <div style="font-size:14px;font-weight:800;color:#ea580c;margin-top:2px;">专人代办免责过户手续</div>
                            </div>
                            <div style="background:#ffffff;border-radius:6px;padding:8px 12px;border:1px solid #fed7aa;">
                                <div style="font-size:11px;color:#64748b;">报废车残值清算</div>
                                <div style="font-size:14px;font-weight:800;color:#ea580c;margin-top:2px;">正规拆解证明与残值秒结</div>
                            </div>
                        </div>
                    </div>
                `;
            } else if (tpl.key === 'appliance') {
                exclusiveSectionHtml = `
                    <div style="border:1px solid #0891b240;background:#ecfeff;border-radius:10px;padding:14px;margin-bottom:16px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                            <div style="display:flex;align-items:center;gap:6px;">
                                <span style="font-size:16px;">❄️</span>
                                <span style="font-size:13px;font-weight:800;color:#155e75;">【大家电拆旧独占】专业师傅免费上门拆机搬运专区</span>
                            </div>
                            <span style="font-size:11px;color:#0891b2;font-weight:600;">楼梯电梯免搬运费 · 通电验机即时放款</span>
                        </div>
                        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:10px;">
                            <div style="background:#ffffff;border-radius:6px;padding:8px 12px;border:1px solid #a5f3fc;">
                                <div style="font-size:11px;color:#64748b;">空调挂机/柜机免费拆机</div>
                                <div style="font-size:14px;font-weight:800;color:#0891b2;margin-top:2px;">高空作业与拆机费用全免</div>
                            </div>
                            <div style="background:#ffffff;border-radius:6px;padding:8px 12px;border:1px solid #a5f3fc;">
                                <div style="font-size:11px;color:#64748b;">冰箱/洗衣机搬运</div>
                                <div style="font-size:14px;font-weight:800;color:#0891b2;margin-top:2px;">自带搬运工具 无磕碰下楼</div>
                            </div>
                            <div style="background:#ffffff;border-radius:6px;padding:8px 12px;border:1px solid #a5f3fc;">
                                <div style="font-size:11px;color:#64748b;">现场通电快速清款</div>
                                <div style="font-size:14px;font-weight:800;color:#0891b2;margin-top:2px;">验机完毕现场微信/支付宝到账</div>
                            </div>
                        </div>
                    </div>
                `;
            } else if (tpl.key === 'digital') {
                exclusiveSectionHtml = `
                    <div style="border:1px solid #1e58ff40;background:#eff6ff;border-radius:10px;padding:14px;margin-bottom:16px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                            <div style="display:flex;align-items:center;gap:6px;">
                                <span style="font-size:16px;">📱</span>
                                <span style="font-size:13px;font-weight:800;color:#1e3a8a;">【数码3C独占】在线估价与数据安全清除</span>
                            </div>
                            <span style="font-size:11px;color:#2563eb;font-weight:600;">官方报价标准 · 顺丰免费上门包邮</span>
                        </div>
                        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:10px;">
                            <div style="background:#ffffff;border-radius:6px;padding:8px 12px;border:1px solid #bfdbfe;">
                                <div style="font-size:11px;color:#64748b;">隐私数据清除</div>
                                <div style="font-size:14px;font-weight:800;color:#1e58ff;margin-top:2px;">专业隐私清除保障</div>
                            </div>
                            <div style="background:#ffffff;border-radius:6px;padding:8px 12px;border:1px solid #bfdbfe;">
                                <div style="font-size:11px;color:#64748b;">顺丰双向保价包邮</div>
                                <div style="font-size:14px;font-weight:800;color:#1e58ff;margin-top:2px;">0元上门取件 全程保价险</div>
                            </div>
                            <div style="background:#ffffff;border-radius:6px;padding:8px 12px;border:1px solid #bfdbfe;">
                                <div style="font-size:11px;color:#64748b;">2小时极速验机放款</div>
                                <div style="font-size:14px;font-weight:800;color:#1e58ff;margin-top:2px;">拆包录像质检 秒级转账</div>
                            </div>
                        </div>
                    </div>
                `;
            }

            modal.innerHTML = `
                <div style="background:#ffffff;border-radius:16px;width:100%;max-width:960px;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 25px 60px -15px rgba(0,0,0,0.3);overflow:hidden;">
                    <!-- 顶栏 -->
                    <div style="padding:14px 20px;border-bottom:1px solid #e2e8f0;background:#f8fafc;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                        <div style="display:flex;align-items:center;gap:10px;">
                            <span style="font-size:16px;font-weight:800;color:#0f172a;">🏢 行业业务模式详情与预览</span>
                            <span class="badge" style="background:${themeColor}15;color:${themeColor};border:1px solid ${themeColor};font-size:11px;padding:2px 8px;font-weight:bold;">
                                ${escapeHtml(tpl.name)}
                            </span>
                        </div>

                        <div style="display:flex;align-items:center;gap:8px;">
                            <a href="/?preview_mode=${escapeHtml(tpl.key)}" target="_blank" class="btn btn-outline" style="height:32px;font-size:12px;border-color:#cbd5e1;color:#2563eb;text-decoration:none;display:inline-flex;align-items:center;gap:4px;">
                                <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
                                新窗口实景体验该模式
                            </a>
                            <button type="button" id="btn-close-industry-modal" style="background:none;border:none;font-size:22px;line-height:1;color:#94a3b8;cursor:pointer;padding:4px;">&times;</button>
                        </div>
                    </div>

                    <!-- 模式横向快速选择条 (支持在弹窗内无缝横向比对所有行业) -->
                    <div style="padding:10px 20px;background:#ffffff;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:8px;overflow-x:auto;">
                        <span style="font-size:11px;color:#64748b;font-weight:bold;white-space:nowrap;">快速切换模式预览：</span>
                        <div style="display:flex;gap:8px;flex-wrap:nowrap;">
                            ${industryPillsHtml}
                        </div>
                    </div>

                    <!-- 弹窗内容可滚动区 -->
                    <div style="flex:1;overflow-y:auto;padding:24px;background:#f8fafc;">
                        <!-- 模式基本信息看板 -->
                        <div style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;padding:20px;margin-bottom:16px;box-shadow:0 2px 8px rgba(0,0,0,0.02);">
                            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;flex-wrap:wrap;gap:10px;">
                                <div>
                                    <h3 style="margin:0 0 4px 0;font-size:18px;font-weight:800;color:#0f172a;">${escapeHtml(tpl.name)}</h3>
                                    <div style="font-size:13px;font-weight:600;color:${themeColor};">${escapeHtml(tpl.slogan || '')}</div>
                                </div>
                                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                                    <span style="background:#f1f5f9;padding:4px 10px;border-radius:6px;font-size:12px;color:#475569;">
                                        <strong>行业计价单位：</strong><span style="color:#0f172a;font-weight:bold;">${escapeHtml(tpl.default_unit || '件')}</span>
                                    </span>
                                    <span style="background:#f1f5f9;padding:4px 10px;border-radius:6px;font-size:12px;color:#475569;">
                                        <strong>默认推荐主题色：</strong><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${themeColor};vertical-align:middle;margin:0 2px;"></span>${themeColor}
                                    </span>
                                </div>
                            </div>
                            <p style="font-size:13px;color:#64748b;line-height:1.6;margin:0;">${escapeHtml(tpl.desc || '')}</p>
                        </div>

                        <!-- 行业核心专有特性 -->
                        <div style="margin-bottom:16px;">
                            <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:8px;">🎯 行业专属业务能力与特色</div>
                            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:10px;">
                                ${featuresHtml}
                            </div>
                        </div>

                        <!-- 行业独占前台特色专区实景模拟 -->
                        ${exclusiveSectionHtml}

                        <!-- 预置 5 大分类与精选机型库速览 -->
                        <div style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;padding:16px;margin-bottom:16px;">
                            <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:10px;">📦 预置行业分类 (一键装载 5 大标准品类)</div>
                            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;">
                                ${catsHtml}
                            </div>

                            <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:10px;">🏷️ 常见回收机型与参考价</div>
                            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:10px;">
                                ${devicesHtml}
                            </div>
                        </div>

                        <!-- 质检与估价核心维度 -->
                        <div style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;padding:16px;">
                            <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:8px;">🔍 常见质检评估选项</div>
                            <div style="display:flex;flex-wrap:wrap;gap:8px;">
                                ${questionsHtml}
                            </div>
                        </div>
                    </div>

                    <!-- 弹窗底栏 -->
                    <div style="padding:12px 20px;border-top:1px solid #e2e8f0;background:#f8fafc;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                        <div style="font-size:12px;color:#d97706;display:flex;align-items:center;gap:6px;">
                            <span>⚠️</span>
                            <span>切换业务模式将装载对应行业的商品类目与估价规则，不影响既有历史订单记录。</span>
                        </div>
                        <div style="display:flex;gap:10px;">
                            <button type="button" class="btn btn-secondary" id="btn-cancel-industry-prev" style="height:36px;padding:0 18px;font-size:13px;">关闭预览</button>
                            <button type="button" class="btn" id="btn-apply-industry-now" style="height:36px;padding:0 20px;font-size:13px;font-weight:700;background:${themeColor};color:#ffffff;border:none;">
                                立即切换模式
                            </button>
                        </div>
                    </div>
                </div>
            `;

            modal.querySelector('#btn-close-industry-modal')?.addEventListener('click', () => { modal.style.display = 'none'; });
            modal.querySelector('#btn-cancel-industry-prev')?.addEventListener('click', () => { modal.style.display = 'none'; });

            modal.querySelectorAll('.btn-tpl-pill-select').forEach(btn => {
                btn.addEventListener('click', function () {
                    activeKey = this.getAttribute('data-key');
                    renderModalContent();
                });
            });

            modal.querySelector('#btn-apply-industry-now')?.addEventListener('click', () => {
                modal.style.display = 'none';
                switchIndustryTemplate(tpl.key, tpl.name);
            });
        }

        renderModalContent();
    }

    // 切换视觉主题风格
    async function switchThemeStyle(themeKey, themeName) {
        const confirmed = await SysUI.confirm(`确认将前台主题风格切换为【${themeName}】吗？`, {
            title: '切换主题确认',
            type: 'info',
            confirmText: '立即应用',
            isDanger: false
        });
        if (!confirmed) return;

        const curApi = window.adminApi || window.api;
        const res = await curApi.post('/admin/config/switchThemeStyle', { theme_key: themeKey });
        if (res && res.code === 200) {
            SysUI.toast(res.msg || '主题风格切换成功！', 'success');
            const contentBox = document.getElementById('tab-content') || document.getElementById('admin-content-box') || document.querySelector('.admin-content');
            if (contentBox) {
                renderTemplatesView(contentBox);
            }
        } else {
            SysUI.toast(res ? res.msg : '切换主题失败', 'error');
        }
    }

    // 切换行业业务数据模板
    async function switchIndustryTemplate(templateKey, templateName) {
        const confirmed = await SysUI.confirm(`确认将平台业务模式切换为【${templateName}】吗？切换后将装载该行业的商品类目与估价规则。`, {
            title: '切换业务模式确认',
            type: 'warning',
            confirmText: '确认切换',
            isDanger: false
        });
        if (!confirmed) return;

        const curApi = window.adminApi || window.api;
        const curState = window.adminState || window.state;
        const res = await curApi.post('/admin/config/switchTemplate', { template: templateKey, init_data: true });
        if (res && res.code === 200) {
            SysUI.toast(res.msg, 'success');
            if (typeof window.preloadBaseData === 'function') {
                await window.preloadBaseData();
            }
            curState.currentTab = 'templates';
            if (typeof window.render === 'function') {
                window.render();
            }
        } else {
            SysUI.toast(res ? res.msg : '切换失败', 'error');
        }
    }

    window.renderTemplatesView = renderTemplatesView;
    window.switchThemeStyle = switchThemeStyle;
    window.switchIndustryTemplate = switchIndustryTemplate;
    window.openThemePreviewModal = openThemePreviewModal;
    window.openIndustryPreviewModal = openIndustryPreviewModal;
})(window);

