/**
 * 启灵同城服务系统 - 行业模板与业务设置
 * 包含：
 * 1. 行业模板切换 (宠物、家政、维修、数码回收、同城综合等预设一键切换)
 * 2. 业务功能与表单设置 (功能开关、角色称谓自定义、预约表单自定义字段)
 * 3. 视觉主题风格卡片与调色板
 * 编码：UTF-8 无 BOM
 */
(function (window) {
    'use strict';

    const SysUI = window.SysUI;
    const api = window.adminApi || window.api;
    const state = window.adminState || window.state;
    const escapeHtml = window.escapeHtml || function(s) { 
        if (s === null || s === undefined) return '';
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    };

    // 当前激活的子选项卡 (scenarios: 行业模板, blocks: 业务功能与表单, theme: 视觉主题风格)
    let currentSubTab = 'scenarios';
    let currentScenarioData = null;
    let localCustomFields = [];

    async function renderTemplatesView(container) {
        if (!container) return;
        container.innerHTML = '<div class="card" style="padding:40px;text-align:center;color:#64748b;">正在载入行业模板与设置...</div>';

        const curApi = window.adminApi || window.api;

        // 并行拉取行业场景方案、主题风格与基础配置
        const [scenarioRes, themeRes] = await Promise.all([
            curApi.get('/admin/config/getIndustryScenarios'),
            curApi.get('/admin/config/getThemeStyles')
        ]);

        if (!scenarioRes || scenarioRes.code !== 200) {
            container.innerHTML = '<div class="card" style="padding:30px;text-align:center;color:#ef4444;">获取行业场景方案失败，请检查网络或后端接口</div>';
            return;
        }

        const scData = scenarioRes.data || {};
        currentScenarioData = scData;
        const curScenario = scData.current || {};
        const scenariosList = scData.scenarios || [];
        localCustomFields = JSON.parse(JSON.stringify(curScenario.custom_fields || []));

        const themeData = (themeRes && themeRes.data) || {};
        const curTheme = themeData.current || {};
        const themeList = themeData.list || [];

        // 1. 构建 Tab 1: 行业模板切换卡片
        let scenariosCardsHtml = '';
        scenariosList.forEach(sc => {
            const isCur = curScenario.key === sc.key;
            const borderStyle = isCur
                ? `border: 2px solid ${sc.theme_color}; box-shadow: 0 8px 24px ${sc.theme_color}25; background: #ffffff;`
                : 'border: 1px solid #e2e8f0; background: #ffffff;';

            // 功能矩阵概览标签
            const ft = sc.feature_toggles || {};
            const ftTags = [
                ft.module_service_enabled === '1' ? '<span class="badge" style="background:#dcfce7;color:#15803d;">上门服务: 开启</span>' : '<span class="badge" style="background:#fee2e2;color:#b91c1c;">上门服务: 关闭</span>',
                ft.module_recycle_enabled === '1' ? '<span class="badge" style="background:#e0f2fe;color:#0369a1;">闲置回收: 开启</span>' : '<span class="badge" style="background:#f1f5f9;color:#64748b;">闲置回收: 隐藏</span>',
                ft.module_technician_pool_enabled === '1' ? '<span class="badge" style="background:#f3e8ff;color:#7e22ce;">自营技师作业端: 开启</span>' : ''
            ].filter(Boolean).join(' ');

            // 专属称谓标签
            const term = sc.terminology || {};
            const workerName = term.role_worker_name || '特约师傅';

            // 动态表单字段数量与示例
            const cFields = sc.custom_fields || [];
            const fieldsCount = cFields.length;
            const fieldsPreview = cFields.slice(0, 3).map(f => f.label).join('、') + (fieldsCount > 3 ? '等' : '');

            const actionBtn = isCur
                ? `<button class="btn" style="background:${sc.theme_color};color:#fff;cursor:default;width:100%;height:38px;font-weight:700;border:none;" disabled>✔ 当前全站运行中</button>`
                : `<button class="btn btn-primary" style="width:100%;height:38px;background:${sc.theme_color};border-color:${sc.theme_color};font-weight:600;" onclick="window.confirmApplyScenario('${sc.key}', '${escapeHtml(sc.name)}')">一键套用此行业方案</button>`;

            scenariosCardsHtml += `
                <div class="card" style="padding:22px;border-radius:14px;${borderStyle};display:flex;flex-direction:column;justify-content:space-between;transition:all 0.2s;">
                    <div>
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;gap:8px;">
                            <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0;">
                                <div style="width:42px;height:42px;min-width:42px;border-radius:10px;background:${sc.theme_color}18;display:flex;align-items:center;justify-content:center;font-size:22px;">
                                    ${sc.icon || '🚀'}
                                </div>
                                <div style="min-width:0;flex:1;">
                                    <h4 style="margin:0;font-size:15px;font-weight:800;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${escapeHtml(sc.name)}">${escapeHtml(sc.name)}</h4>
                                    <div style="font-size:11px;color:${sc.theme_color};font-weight:600;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(sc.slogan)}</div>
                                </div>
                            </div>
                            <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
                                <span class="badge" style="background:${sc.theme_color}18;color:${sc.theme_color};font-size:11px;padding:2px 7px;font-weight:700;border-radius:4px;">${escapeHtml(sc.badge)}</span>
                                ${isCur ? '<span class="badge badge-success" style="padding:2px 7px;font-size:11px;font-weight:bold;border-radius:4px;">已生效</span>' : ''}
                            </div>
                        </div>

                        <p style="font-size:12px;color:#64748b;line-height:1.6;margin-bottom:14px;min-height:36px;">${escapeHtml(sc.desc)}</p>

                        <!-- 行业特征看板 -->
                        <div style="background:#f8fafc;padding:12px 14px;border-radius:8px;margin-bottom:14px;border:1px solid #f1f5f9;font-size:12px;display:flex;flex-direction:column;gap:6px;">
                            <div><strong>师傅/履约称谓：</strong> <span style="color:#0f172a;font-weight:700;">${escapeHtml(workerName)}</span> (${escapeHtml(term.worker_station_name || '工作台')})</div>
                            <div><strong>功能矩阵开关：</strong> ${ftTags}</div>
                            <div><strong>预约表单字段：</strong> <span style="color:#4f46e5;font-weight:600;">${fieldsCount} 个自定义字段</span> (${escapeHtml(fieldsPreview || '通用字段')})</div>
                        </div>
                    </div>

                    <div style="display:flex;gap:8px;margin-top:12px;align-items:center;">
                        <button type="button" class="btn btn-outline" style="flex:1;height:38px;border-color:#cbd5e1;color:#1e293b;font-weight:600;font-size:12px;" onclick="window.previewScenarioModal('${sc.key}')">
                            架构详情
                        </button>
                        <div style="flex:1.6;">
                            ${actionBtn}
                        </div>
                    </div>
                </div>
            `;
        });

        // 2. 构建 Tab 2: 业务功能与表单设置 HTML
        const curToggles = curScenario.feature_toggles || {};
        const curTerm = curScenario.terminology || {};

        // 3. 构建 Tab 3: 主题风格卡片 HTML
        let themeCardsHtml = '';
        themeList.forEach(t => {
            const isCur = curTheme.key === t.key;
            const borderStyle = isCur
                ? `border: 2px solid ${t.primary}; box-shadow: 0 8px 24px ${t.primary}25; background: #ffffff;`
                : 'border: 1px solid #e2e8f0; background: #ffffff;';

            const actionBtn = isCur
                ? `<button class="btn" style="background:${t.primary};color:#fff;cursor:default;width:100%;height:38px;font-weight:700;border:none;" disabled>✔ 当前全站生效中</button>`
                : `<button class="btn btn-primary" style="width:100%;height:38px;background:${t.primary};border-color:${t.primary};" onclick="window.switchThemeStyle('${t.key}', '${escapeHtml(t.name)}')">应用此主题色</button>`;

            let dotsHtml = '';
            (t.preview_colors || [t.primary]).forEach(c => {
                dotsHtml += `<span style="display:inline-block;width:16px;height:16px;border-radius:50%;background:${c};border:1px solid rgba(0,0,0,0.08);" title="${c}"></span>`;
            });

            themeCardsHtml += `
                <div class="card" style="padding:20px;border-radius:12px;${borderStyle};display:flex;flex-direction:column;justify-content:space-between;">
                    <div>
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                            <div style="display:flex;align-items:center;gap:8px;">
                                <div style="width:36px;height:36px;border-radius:8px;background:${t.primary_gradient};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:16px;">
                                    🎨
                                </div>
                                <div>
                                    <h4 style="margin:0;font-size:15px;font-weight:700;color:#0f172a;">${escapeHtml(t.name)}</h4>
                                    <div style="font-size:11px;color:${t.primary};font-weight:600;">${escapeHtml(t.badge_text || '')}</div>
                                </div>
                            </div>
                            ${isCur ? '<span class="badge badge-success">生效中</span>' : ''}
                        </div>
                        <p style="font-size:12px;color:#64748b;line-height:1.5;margin-bottom:12px;">${escapeHtml(t.desc)}</p>
                        <div style="display:flex;justify-content:space-between;align-items:center;background:#f8fafc;padding:8px 12px;border-radius:6px;margin-bottom:14px;">
                            <span style="font-size:11px;color:#64748b;font-weight:600;">色彩调色板:</span>
                            <div style="display:flex;gap:6px;">${dotsHtml}</div>
                        </div>
                    </div>
                    ${actionBtn}
                </div>
            `;
        });

        // 渲染主框架
        container.innerHTML = `
            <div class="card" style="margin-bottom:20px;padding:0;overflow:hidden;">
                <!-- 顶部说明条 -->
                <div style="padding:18px 24px;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
                    <div>
                        <h3 style="font-size:17px;font-weight:800;color:#0f172a;margin:0;display:flex;align-items:center;gap:8px;">
                            <span>🏢</span> 行业模板与业务设置
                        </h3>
                        <div style="font-size:12px;color:#64748b;margin-top:3px;">
                            支持一键切换上门宠物、家政保洁、家庭维修、闲置回收与同城综合服务，并可自由配置业务功能开关与预约表单字段
                        </div>
                    </div>
                    <div style="display:flex;gap:10px;">
                        <a href="/" target="_blank" class="btn btn-outline" style="border-color:#3b82f6;color:#2563eb;text-decoration:none;display:inline-flex;align-items:center;">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="margin-right:6px;"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
                            访问前台实景体验
                        </a>
                    </div>
                </div>

                <!-- 三级切换选项卡 -->
                <div style="padding:14px 24px;border-bottom:1px solid #e2e8f0;background:#ffffff;display:flex;gap:12px;flex-wrap:wrap;">
                    <button type="button" id="tab-btn-scenarios" class="btn ${currentSubTab === 'scenarios' ? 'btn-primary' : 'btn-outline'}" style="font-weight:700;padding:8px 18px;">
                        🚀 行业模板切换
                    </button>
                    <button type="button" id="tab-btn-blocks" class="btn ${currentSubTab === 'blocks' ? 'btn-primary' : 'btn-outline'}" style="font-weight:700;padding:8px 18px;">
                        ⚙️ 业务功能与表单设置
                    </button>
                    <button type="button" id="tab-btn-theme" class="btn ${currentSubTab === 'theme' ? 'btn-primary' : 'btn-outline'}" style="font-weight:700;padding:8px 18px;">
                        🎨 视觉主题与品牌色卡
                    </button>
                </div>
            </div>

            <!-- 面板 1: 行业模板切换 -->
            <div id="panel-scenarios" style="display:${currentSubTab === 'scenarios' ? 'block' : 'none'};">
                <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(340px, 1fr));gap:20px;margin-bottom:24px;">
                    ${scenariosCardsHtml}
                </div>
            </div>

            <!-- 面板 2: 业务功能与表单设置 (功能开关、称谓定义、预约表单自定义字段) -->
            <div id="panel-blocks" style="display:${currentSubTab === 'blocks' ? 'block' : 'none'};">
                <form id="form-dynamic-blocks" onsubmit="return false;">
                    <!-- 模块 1: 业务功能开关 -->
                    <div class="card" style="padding:22px;border-radius:12px;margin-bottom:20px;background:#fff;border:1px solid #e2e8f0;">
                        <div style="border-bottom:1px solid #f1f5f9;padding-bottom:12px;margin-bottom:16px;">
                            <h4 style="margin:0;font-size:15px;font-weight:800;color:#0f172a;display:flex;align-items:center;gap:6px;">
                                <span>🎛️</span> 业务功能开关
                            </h4>
                            <div style="font-size:12px;color:#64748b;margin-top:2px;">控制前台与移动端各业务模块的启用或隐藏（例如做纯服务时隐藏闲置回收）</div>
                        </div>

                        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:16px;">
                            <label style="display:flex;align-items:center;gap:10px;background:#f8fafc;padding:12px 14px;border-radius:8px;border:1px solid #e2e8f0;cursor:pointer;">
                                <input type="checkbox" id="toggle-service" ${curToggles.module_service_enabled === '1' ? 'checked' : ''} style="width:18px;height:18px;">
                                <div>
                                    <div style="font-weight:700;font-size:13px;color:#0f172a;">上门生活服务与在线预约</div>
                                    <div style="font-size:11px;color:#64748b;">支持到家服务类目展示、多规格与支付</div>
                                </div>
                            </label>

                            <label style="display:flex;align-items:center;gap:10px;background:#f8fafc;padding:12px 14px;border-radius:8px;border:1px solid #e2e8f0;cursor:pointer;">
                                <input type="checkbox" id="toggle-recycle" ${curToggles.module_recycle_enabled === '1' ? 'checked' : ''} style="width:18px;height:18px;">
                                <div>
                                    <div style="font-weight:700;font-size:13px;color:#0f172a;">二手闲置回收与质检估价</div>
                                    <div style="font-size:11px;color:#64748b;">支持全自动问卷估价、质检与放款</div>
                                </div>
                            </label>

                            <label style="display:flex;align-items:center;gap:10px;background:#f8fafc;padding:12px 14px;border-radius:8px;border:1px solid #e2e8f0;cursor:pointer;">
                                <input type="checkbox" id="toggle-tech-pool" ${curToggles.module_technician_pool_enabled === '1' ? 'checked' : ''} style="width:18px;height:18px;">
                                <div>
                                    <div style="font-weight:700;font-size:13px;color:#0f172a;">自营技师作业台与派工调度</div>
                                    <div style="font-size:11px;color:#64748b;">开启自营技师移动作业端、工单指派与现场完工打卡</div>
                                </div>
                            </label>

                            <label style="display:flex;align-items:center;gap:10px;background:#f8fafc;padding:12px 14px;border-radius:8px;border:1px solid #e2e8f0;cursor:pointer;">
                                <input type="checkbox" id="toggle-coupon" ${curToggles.module_coupon_enabled === '1' ? 'checked' : ''} style="width:18px;height:18px;">
                                <div>
                                    <div style="font-weight:700;font-size:13px;color:#0f172a;">营销优惠券与促销立减</div>
                                    <div style="font-size:11px;color:#64748b;">支持服务预约立减券与现金补贴券</div>
                                </div>
                            </label>

                            <label style="display:flex;align-items:center;gap:10px;background:#f8fafc;padding:12px 14px;border-radius:8px;border:1px solid #e2e8f0;cursor:pointer;">
                                <input type="checkbox" id="toggle-express" ${curToggles.module_express_enabled === '1' ? 'checked' : ''} style="width:18px;height:18px;">
                                <div>
                                    <div style="font-weight:700;font-size:13px;color:#0f172a;">顺丰速运一键寄件与轨迹</div>
                                    <div style="font-size:11px;color:#64748b;">对接顺丰开放平台API寄件与路由</div>
                                </div>
                            </label>
                        </div>
                    </div>

                    <!-- 模块 2: 角色称谓与关键文案 -->
                    <div class="card" style="padding:22px;border-radius:12px;margin-bottom:20px;background:#fff;border:1px solid #e2e8f0;">
                        <div style="border-bottom:1px solid #f1f5f9;padding-bottom:12px;margin-bottom:16px;">
                            <h4 style="margin:0;font-size:15px;font-weight:800;color:#0f172a;display:flex;align-items:center;gap:6px;">
                                <span>🏷️</span> 角色称谓与提示文案
                            </h4>
                            <div style="font-size:12px;color:#64748b;margin-top:2px;">全局替换师傅称谓、工作台名称与核销提示，消除写死文案</div>
                        </div>

                        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:16px;">
                            <div>
                                <label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:6px;">师傅/履约者专属称谓</label>
                                <input type="text" id="term-role-worker-name" class="form-control" value="${escapeHtml(curTerm.role_worker_name || '特约认证师傅')}" placeholder="例: 金牌宠托师 / 持证保洁师 / 维修技师" style="height:38px;">
                            </div>
                            <div>
                                <label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:6px;">移动工作台标题名称</label>
                                <input type="text" id="term-worker-station-name" class="form-control" value="${escapeHtml(curTerm.worker_station_name || '师傅接单中心')}" placeholder="例: 宠托师接单中心 / 保洁师工作台" style="height:38px;">
                            </div>
                            <div>
                                <label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:6px;">抢单按钮文案</label>
                                <input type="text" id="term-worker-grab-btn-text" class="form-control" value="${escapeHtml(curTerm.worker_grab_btn_text || '立即抢单')}" placeholder="例: 立即接单接宠 / 立即抢单" style="height:38px;">
                            </div>
                            <div>
                                <label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:6px;">平台站点主名称</label>
                                <input type="text" id="term-site-name" class="form-control" value="${escapeHtml(curScenario.site_name || '')}" placeholder="例: 启灵同城 · 专属伴宠服务" style="height:38px;">
                            </div>
                            <div style="grid-column: 1 / -1;">
                                <label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:6px;">完工核销拍照提示语</label>
                                <input type="text" id="term-finish-voucher-tip" class="form-control" value="${escapeHtml(curTerm.worker_finish_voucher_tip || '请上传现场完工验收核销凭证照片')}" placeholder="例: 请上传带宠运动轨迹图或喂食猫砂验收视频 / 请上传清洁前后对比照片" style="height:38px;">
                            </div>
                        </div>
                    </div>

                    <!-- 模块 3: 预约表单自定义字段 -->
                    <div class="card" style="padding:22px;border-radius:12px;margin-bottom:24px;background:#fff;border:1px solid #e2e8f0;">
                        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #f1f5f9;padding-bottom:12px;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
                            <div>
                                <h4 style="margin:0;font-size:15px;font-weight:800;color:#0f172a;display:flex;align-items:center;gap:6px;">
                                    <span>🧩</span> 预约表单自定义字段
                                </h4>
                                <div style="font-size:12px;color:#64748b;margin-top:2px;">
                                    为该行业自由配置客户预约时填写的定制字段（单选、下拉、文本、数字、开关），自动渲染至小程序与PC端
                                </div>
                            </div>
                            <button type="button" class="btn btn-outline" style="border-color:#4f46e5;color:#4f46e5;font-weight:700;font-size:12px;display:inline-flex;align-items:center;gap:4px;" onclick="window.addDynamicFormField()">
                                + 添加新表单字段
                            </button>
                        </div>

                        <!-- 动态表单字段表格 -->
                        <div style="overflow-x:auto;">
                            <table class="table" style="width:100%;font-size:12px;border-collapse:collapse;" id="table-custom-fields">
                                <thead>
                                    <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0;text-align:left;">
                                        <th style="padding:10px 12px;width:150px;">字段显示名称 (Label)</th>
                                        <th style="padding:10px 12px;width:140px;">字段英文标识 (Key)</th>
                                        <th style="padding:10px 12px;width:120px;">控件类型</th>
                                        <th style="padding:10px 12px;width:150px;">适用业务范围</th>
                                        <th style="padding:10px 12px;">选项列表 (逗号分隔，供单选/下拉)</th>
                                        <th style="padding:10px 12px;width:130px;">占位提示 (Placeholder)</th>
                                        <th style="padding:10px 12px;width:70px;text-align:center;">必填?</th>
                                        <th style="padding:10px 12px;width:80px;text-align:center;">操作</th>
                                    </tr>
                                </thead>
                                <tbody id="tbody-custom-fields">
                                    <!-- 动态渲染各字段行 -->
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- 底部保存悬浮栏 -->
                    <div style="position:sticky;bottom:20px;background:#ffffff;padding:16px 24px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.12);border:1px solid #cbd5e1;display:flex;justify-content:space-between;align-items:center;z-index:99;">
                        <div style="font-size:13px;color:#64748b;">
                            微调后的开关、文案与表单配置将立即生效于前台与移动工作台。
                        </div>
                        <button type="button" class="btn btn-primary" id="btn-save-blocks-all" style="height:40px;padding:0 28px;font-weight:700;font-size:14px;background:#1e58ff;" onclick="window.saveDynamicBlocksAll()">
                            保存业务设置
                        </button>
                    </div>
                </form>
            </div>

            <!-- 面板 3: 视觉主题风格与调色板 -->
            <div id="panel-theme-styles" style="display:${currentSubTab === 'theme' ? 'block' : 'none'};">
                <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));gap:20px;margin-bottom:24px;">
                    ${themeCardsHtml}
                </div>

                <!-- 自定义品牌个性化配色 -->
                <div class="card" style="padding:22px;border-radius:12px;background:#ffffff;border:1px solid #e2e8f0;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                        <div>
                            <h4 style="margin:0;font-size:15px;font-weight:700;color:#0f172a;">自定义品牌主色调</h4>
                            <div style="font-size:12px;color:#64748b;margin-top:2px;">若上述调色板无法满足需求，可在此自定义专属 Hex 色号</div>
                        </div>
                    </div>

                    <form id="form-custom-theme" style="display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap;max-width:480px;margin-top:6px;">
                        <div style="width:240px;">
                            <label style="display:block;font-size:12px;font-weight:600;color:#334155;margin-bottom:6px;">主色调 Hex 代码</label>
                            <div style="display:flex;gap:8px;align-items:center;">
                                <input type="color" id="custom-picker-primary" value="${curTheme.primary || '#1e58ff'}" style="width:36px;height:36px;border:1px solid #cbd5e1;border-radius:6px;cursor:pointer;padding:2px;">
                                <input type="text" id="custom-text-primary" class="form-control" value="${curTheme.primary || '#1e58ff'}" placeholder="#1e58ff" style="flex:1;height:36px;font-family:monospace;font-size:13px;">
                            </div>
                        </div>

                        <div>
                            <button type="submit" class="btn btn-primary" style="height:36px;padding:0 22px;font-weight:600;background:#1e58ff;border-color:#1e58ff;white-space:nowrap;">
                                应用自定义主色
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        // 绑定 Tab 切换按钮
        const bindTab = (btnId, panelId, tabKey) => {
            document.getElementById(btnId)?.addEventListener('click', () => {
                currentSubTab = tabKey;
                ['scenarios', 'blocks', 'theme'].forEach(k => {
                    const p = document.getElementById('panel-' + (k === 'theme' ? 'theme-styles' : k));
                    const b = document.getElementById('tab-btn-' + k);
                    if (p) p.style.display = (k === tabKey) ? 'block' : 'none';
                    if (b) {
                        if (k === tabKey) {
                            b.classList.add('btn-primary');
                            b.classList.remove('btn-outline');
                        } else {
                            b.classList.remove('btn-primary');
                            b.classList.add('btn-outline');
                        }
                    }
                });
            });
        };
        bindTab('tab-btn-scenarios', 'panel-scenarios', 'scenarios');
        bindTab('tab-btn-blocks', 'panel-blocks', 'blocks');
        bindTab('tab-btn-theme', 'panel-theme-styles', 'theme');

        // 渲染动态表单行
        renderCustomFieldsRows();

        // 取色器联动
        const pickPrimary = document.getElementById('custom-picker-primary');
        const textPrimary = document.getElementById('custom-text-primary');
        pickPrimary?.addEventListener('input', (e) => { if (textPrimary) textPrimary.value = e.target.value; });
        textPrimary?.addEventListener('input', (e) => { if (pickPrimary && /^#[0-9a-fA-F]{6}$/.test(e.target.value)) pickPrimary.value = e.target.value; });

        // 自定义色提交
        document.getElementById('form-custom-theme')?.addEventListener('submit', async function (e) {
            e.preventDefault();
            const primary = document.getElementById('custom-text-primary')?.value.trim() || '#1e58ff';
            const curApi = window.adminApi || window.api;
            const res = await curApi.post('/admin/config/switchThemeStyle', {
                theme_key: 'custom',
                custom_colors: { primary, hover: primary, light: '#f8fafc' }
            });
            if (res && res.code === 200) {
                SysUI.toast('自定义品牌色已生效！', 'success');
                renderTemplatesView(container);
            } else {
                SysUI.toast((res && res.msg) || '保存失败', 'error');
            }
        });
    }

    /**
     * 渲染动态表单字段表格行
     */
    function renderCustomFieldsRows() {
        const tbody = document.getElementById('tbody-custom-fields');
        if (!tbody) return;

        if (localCustomFields.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:24px;color:#94a3b8;">暂未配置动态表单字段，点击右上角【+ 添加新表单字段】开始设计</td></tr>';
            return;
        }

        let html = '';
        localCustomFields.forEach((f, idx) => {
            const optsStr = Array.isArray(f.options) ? f.options.join(', ') : (f.options || '');
            const catType = f.category_type || 'common';
            html += `
                <tr style="border-bottom:1px solid #f1f5f9;">
                    <td style="padding:8px 10px;">
                        <input type="text" class="form-control cf-input-label" data-idx="${idx}" value="${escapeHtml(f.label)}" placeholder="如: 故障现象简述" style="height:32px;font-size:12px;">
                    </td>
                    <td style="padding:8px 10px;">
                        <input type="text" class="form-control cf-input-key" data-idx="${idx}" value="${escapeHtml(f.key)}" placeholder="如: fault_desc" style="height:32px;font-size:12px;font-family:monospace;">
                    </td>
                    <td style="padding:8px 10px;">
                        <select class="form-control cf-select-type" data-idx="${idx}" style="height:32px;font-size:12px;">
                            <option value="text" ${f.type === 'text' ? 'selected' : ''}>文本输入</option>
                            <option value="number" ${f.type === 'number' ? 'selected' : ''}>数字输入</option>
                            <option value="radio" ${f.type === 'radio' ? 'selected' : ''}>单选按钮组</option>
                            <option value="select" ${f.type === 'select' ? 'selected' : ''}>下拉选择框</option>
                            <option value="switch" ${f.type === 'switch' ? 'selected' : ''}>是否开关</option>
                        </select>
                    </td>
                    <td style="padding:8px 10px;">
                        <select class="form-control cf-select-cattype" data-idx="${idx}" style="height:32px;font-size:12px;font-weight:600;color:#0369a1;">
                            <option value="common" ${catType === 'common' ? 'selected' : ''}>🌐 通用 (所有服务)</option>
                            <option value="pet" ${catType === 'pet' ? 'selected' : ''}>🐕 仅上门伴宠</option>
                            <option value="cleaning" ${catType === 'cleaning' ? 'selected' : ''}>🧹 仅家政保洁</option>
                            <option value="repair" ${catType === 'repair' ? 'selected' : ''}>🛠️ 仅家庭维修</option>
                            <option value="cleaning_or_repair" ${catType === 'cleaning_or_repair' ? 'selected' : ''}>🧹+🛠️ 保洁与维修</option>
                        </select>
                    </td>
                    <td style="padding:8px 10px;">
                        <input type="text" class="form-control cf-input-options" data-idx="${idx}" value="${escapeHtml(optsStr)}" placeholder="例: 师傅代买配件, 用户自备配件 (逗号分隔)" style="height:32px;font-size:12px;">
                    </td>
                    <td style="padding:8px 10px;">
                        <input type="text" class="form-control cf-input-placeholder" data-idx="${idx}" value="${escapeHtml(f.placeholder || '')}" placeholder="例: 请输入故障说明" style="height:32px;font-size:12px;">
                    </td>
                    <td style="padding:8px 10px;text-align:center;">
                        <input type="checkbox" class="cf-check-required" data-idx="${idx}" ${parseInt(f.required || 0) === 1 ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer;">
                    </td>
                    <td style="padding:8px 10px;text-align:center;white-space:nowrap;">
                        <button type="button" class="btn btn-outline" style="height:26px;padding:0 6px;font-size:11px;color:#dc2626;border-color:#fca5a5;" onclick="window.removeDynamicFormField(${idx})">删除</button>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;

        // 监听输入并实时更新 localCustomFields 数据
        tbody.querySelectorAll('.cf-input-label').forEach(el => {
            el.addEventListener('input', e => {
                const i = parseInt(e.target.getAttribute('data-idx'));
                if (localCustomFields[i]) localCustomFields[i].label = e.target.value.trim();
            });
        });
        tbody.querySelectorAll('.cf-input-key').forEach(el => {
            el.addEventListener('input', e => {
                const i = parseInt(e.target.getAttribute('data-idx'));
                if (localCustomFields[i]) localCustomFields[i].key = e.target.value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
            });
        });
        tbody.querySelectorAll('.cf-select-type').forEach(el => {
            el.addEventListener('change', e => {
                const i = parseInt(e.target.getAttribute('data-idx'));
                if (localCustomFields[i]) localCustomFields[i].type = e.target.value;
            });
        });
        tbody.querySelectorAll('.cf-select-cattype').forEach(el => {
            el.addEventListener('change', e => {
                const i = parseInt(e.target.getAttribute('data-idx'));
                if (localCustomFields[i]) localCustomFields[i].category_type = e.target.value;
            });
        });
        tbody.querySelectorAll('.cf-input-options').forEach(el => {
            el.addEventListener('input', e => {
                const i = parseInt(e.target.getAttribute('data-idx'));
                if (localCustomFields[i]) {
                    const raw = e.target.value;
                    localCustomFields[i].options = raw.split(/[,，]/).map(s => s.trim()).filter(Boolean);
                }
            });
        });
        tbody.querySelectorAll('.cf-input-placeholder').forEach(el => {
            el.addEventListener('input', e => {
                const i = parseInt(e.target.getAttribute('data-idx'));
                if (localCustomFields[i]) localCustomFields[i].placeholder = e.target.value.trim();
            });
        });
        tbody.querySelectorAll('.cf-check-required').forEach(el => {
            el.addEventListener('change', e => {
                const i = parseInt(e.target.getAttribute('data-idx'));
                if (localCustomFields[i]) localCustomFields[i].required = e.target.checked ? 1 : 0;
            });
        });
    }

    /**
     * 添加新动态表单字段
     */
    window.addDynamicFormField = function () {
        const newKey = 'field_' + (localCustomFields.length + 1);
        localCustomFields.push({
            key: newKey,
            label: '新自定义字段',
            type: 'text',
            options: [],
            placeholder: '',
            required: 0
        });
        renderCustomFieldsRows();
    };

    /**
     * 删除动态表单字段
     */
    window.removeDynamicFormField = function (idx) {
        localCustomFields.splice(idx, 1);
        renderCustomFieldsRows();
    };

    /**
     * 一键保存业务设置 (开关、文案、动态表单)
     */
    window.saveDynamicBlocksAll = async function () {
        const btn = document.getElementById('btn-save-blocks-all');
        if (btn) {
            btn.disabled = true;
            btn.innerText = '正在保存设置...';
        }

        // 收集开关
        const toggles = {
            module_service_enabled: document.getElementById('toggle-service')?.checked ? '1' : '0',
            module_recycle_enabled: document.getElementById('toggle-recycle')?.checked ? '1' : '0',
            module_technician_pool_enabled: document.getElementById('toggle-tech-pool')?.checked ? '1' : '0',
            module_coupon_enabled: document.getElementById('toggle-coupon')?.checked ? '1' : '0',
            module_express_enabled: document.getElementById('toggle-express')?.checked ? '1' : '0'
        };

        // 收集称谓与文案
        const terminology = {
            role_worker_name: document.getElementById('term-role-worker-name')?.value.trim() || '特约认证师傅',
            worker_station_name: document.getElementById('term-worker-station-name')?.value.trim() || '师傅接单中心',
            worker_grab_btn_text: document.getElementById('term-worker-grab-btn-text')?.value.trim() || '立即抢单',
            worker_finish_voucher_tip: document.getElementById('term-finish-voucher-tip')?.value.trim() || '请上传现场完工验收核销凭证照片'
        };

        const siteName = document.getElementById('term-site-name')?.value.trim();

        // 校验动态字段
        for (let i = 0; i < localCustomFields.length; i++) {
            const f = localCustomFields[i];
            if (!f.label || !f.key) {
                SysUI.toast(`第 ${i + 1} 个表单字段的显示名称与键名不能为空`, 'warning');
                if (btn) {
                    btn.disabled = false;
                    btn.innerText = '保存业务设置';
                }
                return;
            }
        }

        const curApi = window.adminApi || window.api;
        const res = await curApi.post('/admin/config/saveDynamicBlocks', {
            toggles: toggles,
            terminology: terminology,
            custom_fields: localCustomFields
        });

        if (siteName) {
            await curApi.post('/admin/config/saveConfigs', {
                configs: { site_name: siteName }
            });
        }

        if (btn) {
            btn.disabled = false;
            btn.innerText = '保存业务设置';
        }

        if (res && res.code === 200) {
            SysUI.toast(res.msg || '设置已成功保存！', 'success');
            const contentBox = document.getElementById('tab-content') || document.getElementById('admin-content-box');
            if (contentBox) {
                renderTemplatesView(contentBox);
            }
        } else {
            SysUI.toast((res && res.msg) || '保存失败', 'error');
        }
    };

    /**
     * 确认并套用行业场景方案弹窗
     */
    window.confirmApplyScenario = function (scenarioKey, scenarioName) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-card" style="max-width:520px;">
                <div class="modal-header">
                    <span>套用【${escapeHtml(scenarioName)}】行业方案</span>
                    <span style="cursor:pointer;" onclick="this.closest('.modal-overlay').remove()">✕</span>
                </div>
                <div class="modal-body" style="font-size:13px;line-height:1.7;">
                    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px;margin-bottom:14px;color:#1e40af;">
                        💡 <strong>模板切换说明：</strong><br>
                        系统将切换为该行业的预设配置，包括视觉主色调、功能开关、称谓文案与专属预约表单字段。
                    </div>

                    <label style="display:flex;align-items:center;gap:8px;background:#f8fafc;padding:12px;border-radius:8px;border:1px solid #e2e8f0;cursor:pointer;">
                        <input type="checkbox" id="chk-seed-data" checked style="width:18px;height:18px;">
                        <div>
                            <strong style="color:#0f172a;">同时导入该行业示范数据</strong>
                            <div style="font-size:11px;color:#64748b;">自动生成对应行业的标准分类、精选服务项目与规格定价</div>
                        </div>
                    </label>
                </div>
                <div class="modal-footer" style="display:flex;justify-content:flex-end;gap:10px;">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">取消</button>
                    <button class="btn btn-primary" id="btn-do-apply-scenario" style="background:#1e58ff;">确认立即套用</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('#btn-do-apply-scenario')?.addEventListener('click', async function () {
            const seedData = modal.querySelector('#chk-seed-data')?.checked ? true : false;
            this.disabled = true;
            this.innerText = '正在应用行业模板...';

            const curApi = window.adminApi || window.api;
            const res = await curApi.post('/admin/config/applyIndustryScenario', {
                scenario_key: scenarioKey,
                seed_data: seedData
            });

            modal.remove();

            if (res && res.code === 200) {
                SysUI.toast(res.msg || '行业模板套用成功！', 'success');
                const contentBox = document.getElementById('tab-content') || document.getElementById('admin-content-box');
                if (contentBox) {
                    renderTemplatesView(contentBox);
                }
            } else {
                SysUI.toast((res && res.msg) || '套用失败', 'error');
            }
        });
    };

    /**
     * 行业模板详情预览弹窗
     */
    window.previewScenarioModal = function (scenarioKey) {
        if (!currentScenarioData || !Array.isArray(currentScenarioData.scenarios)) return;
        const target = currentScenarioData.scenarios.find(s => s.key === scenarioKey);
        if (!target) return;

        const ft = target.feature_toggles || {};
        const term = target.terminology || {};
        const cFields = target.custom_fields || [];

        const fieldsHtml = cFields.length === 0 ? '<div style="color:#94a3b8;">无自定义字段</div>' : cFields.map(f => `
            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:8px 10px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <strong style="color:#0f172a;">${escapeHtml(f.label)}</strong>
                    <span style="font-family:monospace;color:#64748b;font-size:11px;margin-left:6px;">(${escapeHtml(f.key)})</span>
                    ${f.required ? '<span style="color:#ef4444;font-size:11px;margin-left:4px;">*必填</span>' : ''}
                </div>
                <div style="font-size:11px;color:#4f46e5;font-weight:600;">
                    类型: ${escapeHtml(f.type)} ${f.options && f.options.length ? ('[' + f.options.join('/') + ']') : ''}
                </div>
            </div>
        `).join('');

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-card" style="max-width:640px;">
                <div class="modal-header">
                    <span>${target.icon || '🚀'} 【${escapeHtml(target.name)}】方案详情</span>
                    <span style="cursor:pointer;" onclick="this.closest('.modal-overlay').remove()">✕</span>
                </div>
                <div class="modal-body" style="font-size:13px;line-height:1.7;max-height:70vh;overflow-y:auto;">
                    <!-- 基本信息 -->
                    <div style="background:${target.theme_color}10;border:1px solid ${target.theme_color}30;border-radius:8px;padding:12px;margin-bottom:14px;">
                        <div style="font-weight:700;color:${target.theme_color};font-size:14px;">${escapeHtml(target.name)} · ${escapeHtml(target.badge)}</div>
                        <div style="font-size:12px;color:#475569;margin-top:2px;">${escapeHtml(target.desc)}</div>
                    </div>

                    <!-- 角色称谓 -->
                    <div style="margin-bottom:14px;">
                        <strong style="display:block;margin-bottom:6px;color:#0f172a;">🏷️ 行业角色与称谓规范:</strong>
                        <div style="background:#f8fafc;padding:10px 12px;border-radius:6px;border:1px solid #e2e8f0;font-size:12px;display:grid;grid-template-columns:1fr 1fr;gap:6px;">
                            <div>履约人员称谓: <strong>${escapeHtml(term.role_worker_name || '-')}</strong></div>
                            <div>工作台标题: <strong>${escapeHtml(term.worker_station_name || '-')}</strong></div>
                            <div>抢单按键文案: <strong>${escapeHtml(term.worker_grab_btn_text || '-')}</strong></div>
                            <div>完工验收提示: <strong>${escapeHtml(term.worker_finish_voucher_tip || '-')}</strong></div>
                        </div>
                    </div>

                    <!-- 动态表单字段 -->
                    <div style="margin-bottom:14px;">
                        <strong style="display:block;margin-bottom:6px;color:#0f172a;">🧩 预约表单自定义字段 (${cFields.length} 个字段):</strong>
                        <div style="background:#f8fafc;padding:10px;border-radius:8px;border:1px solid #e2e8f0;">
                            ${fieldsHtml}
                        </div>
                    </div>
                </div>
                <div class="modal-footer" style="display:flex;justify-content:flex-end;gap:10px;">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">关闭</button>
                    <button class="btn btn-primary" style="background:${target.theme_color};" onclick="this.closest('.modal-overlay').remove(); window.confirmApplyScenario('${target.key}', '${escapeHtml(target.name)}')">立即套用此方案</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    };

    // 切换视觉主题风格
    async function switchThemeStyle(themeKey, themeName) {
        const confirmed = await SysUI.confirm(`确认将全站视觉主题主色切换为【${themeName}】吗？`, {
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
            const contentBox = document.getElementById('tab-content') || document.getElementById('admin-content-box');
            if (contentBox) {
                renderTemplatesView(contentBox);
            }
        } else {
            SysUI.toast(res ? res.msg : '切换主题失败', 'error');
        }
    }

    window.renderTemplatesView = renderTemplatesView;
    window.switchThemeStyle = switchThemeStyle;
})(window);
