/**
 * 启灵回收系统 - 回收加价券营销管理视图
 * 包含加价券模板维护、补贴策略配置与用户领券核销明细查看
 */
(function (window) {
    'use strict';

    const SysUI = window.SysUI;
    const api = window.adminApi || window.api;
    const escapeHtml = window.escapeHtml || function (s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

    let currentSubTab = 'templates'; // 'templates' | 'logs'
    let templatePage = 1;
    let logPage = 1;

    async function renderCouponsView(container) {
        if (!container) return;

        container.innerHTML = `
            <div class="card" style="padding:0;overflow:hidden;">
                <!-- 顶部大标题与副标题 -->
                <div style="padding:18px 24px;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
                    <div>
                        <div style="display:flex;align-items:center;gap:8px;">
                            <h3 style="font-size:16px;font-weight:700;color:#0f172a;margin:0;">回收加价补贴券</h3>
                            <span class="badge" style="background:#fef3c7;color:#92400e;font-size:11px;">转转/爱回收同款加价模型</span>
                        </div>
                        <div style="font-size:12px;color:#64748b;margin-top:2px;">回收平台核心促单利器：通过发放“加价现金补贴券”，刺激用户从犹豫到果断下单，提升 GMV 转化率</div>
                    </div>
                    <div style="display:flex;gap:10px;">
                        <button type="button" class="btn btn-outline" id="btn-manual-grant" style="height:38px;padding:0 14px;font-size:13px;">🎁 定向赠券给用户</button>
                        <button type="button" class="btn btn-primary" id="btn-create-coupon" style="height:38px;padding:0 16px;font-size:13px;font-weight:600;">+ 新建加价补贴券</button>
                    </div>
                </div>

                <!-- 核心经营数据指标卡片 -->
                <div style="padding:20px 24px 0 24px;">
                    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:14px;" id="coupon-stats-container">
                        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
                            <div style="font-size:12px;color:#64748b;display:flex;align-items:center;gap:6px;">
                                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#1e58ff;"></span>
                                运行中加价券
                            </div>
                            <div style="font-size:24px;font-weight:700;color:#0f172a;margin-top:6px;" id="stat-active-templates">-</div>
                            <div style="font-size:11px;color:#94a3b8;margin-top:2px;">当前上架生效模板</div>
                        </div>
                        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
                            <div style="font-size:12px;color:#64748b;display:flex;align-items:center;gap:6px;">
                                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#10b981;"></span>
                                累计发放张数
                            </div>
                            <div style="font-size:24px;font-weight:700;color:#0f172a;margin-top:6px;" id="stat-total-granted">-</div>
                            <div style="font-size:11px;color:#94a3b8;margin-top:2px;">含新人赠送与主动领取</div>
                        </div>
                        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
                            <div style="font-size:12px;color:#64748b;display:flex;align-items:center;gap:6px;">
                                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#f59e0b;"></span>
                                累计核销促单
                            </div>
                            <div style="font-size:24px;font-weight:700;color:#0f172a;margin-top:6px;" id="stat-total-used">-</div>
                            <div style="font-size:11px;color:#94a3b8;margin-top:2px;">随成交订单成功抵扣打款</div>
                        </div>
                        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
                            <div style="font-size:12px;color:#64748b;display:flex;align-items:center;gap:6px;">
                                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ef4444;"></span>
                                累计补贴总额
                            </div>
                            <div style="font-size:24px;font-weight:700;color:#ef4444;margin-top:6px;" id="stat-total-subsidy">¥0.00</div>
                            <div style="font-size:11px;color:#94a3b8;margin-top:2px;">实发加价现金补贴</div>
                        </div>
                    </div>
                </div>

                <!-- 二级切换选项卡 -->
                <div style="padding:16px 24px 0 24px;">
                    <div class="settings-tabs-header" style="margin-bottom:16px;border-bottom:1px solid #e2e8f0;display:flex;gap:10px;">
                        <button type="button" class="settings-tab-btn ${currentSubTab === 'templates' ? 'active' : ''}" id="tab-btn-templates">
                            🎟️ 加价券模板管理
                        </button>
                        <button type="button" class="settings-tab-btn ${currentSubTab === 'logs' ? 'active' : ''}" id="tab-btn-logs">
                            📋 用户领券与核销流水
                        </button>
                        <button type="button" class="settings-tab-btn ${currentSubTab === 'display' ? 'active' : ''}" id="tab-btn-display">
                            ⚙️ 前台营销展示与开关配置
                        </button>
                    </div>
                </div>

                <!-- 主体内容承载区 -->
                <div style="padding:0 24px 24px 24px;" id="coupon-content-area">
                    <!-- 动态注入当前子选项卡内容 -->
                </div>
            </div>
        `;

        // 绑定二级 Tab 切换
        document.getElementById('tab-btn-templates')?.addEventListener('click', function () {
            currentSubTab = 'templates';
            renderCouponsView(container);
        });
        document.getElementById('tab-btn-logs')?.addEventListener('click', function () {
            currentSubTab = 'logs';
            renderCouponsView(container);
        });
        document.getElementById('tab-btn-display')?.addEventListener('click', function () {
            currentSubTab = 'display';
            renderCouponsView(container);
        });

        // 绑定头部操作按钮
        document.getElementById('btn-create-coupon')?.addEventListener('click', () => openCouponModal(null));
        document.getElementById('btn-manual-grant')?.addEventListener('click', openGrantModal);

        // 加载综合指标统计
        loadCouponStats();

        // 渲染具体子面板
        const contentBox = document.getElementById('coupon-content-area');
        if (currentSubTab === 'templates') {
            renderTemplatesSubView(contentBox);
        } else if (currentSubTab === 'logs') {
            renderLogsSubView(contentBox);
        } else if (currentSubTab === 'display') {
            renderDisplaySettingsSubView(contentBox);
        }
    }

    /**
     * 加载综合统计指标
     */
    async function loadCouponStats() {
        const res = await api.get('/admin/coupon/stats');
        if (res && res.code === 200 && res.data) {
            const d = res.data;
            const el1 = document.getElementById('stat-active-templates');
            const el2 = document.getElementById('stat-total-granted');
            const el3 = document.getElementById('stat-total-used');
            const el4 = document.getElementById('stat-total-subsidy');
            if (el1) el1.innerText = String(d.active_templates ?? 0);
            if (el2) el2.innerText = String(d.total_granted ?? 0);
            if (el3) el3.innerText = `${d.total_used ?? 0} (${d.conversion_rate ?? 0}%)`;
            if (el4) el4.innerText = `¥${Number(d.total_subsidy ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
        }
    }

    /**
     * 子视图 1：加价券模板列表管理
     */
    async function renderTemplatesSubView(container) {
        if (!container) return;

        container.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:10px;">
                <div style="display:flex;align-items:center;gap:10px;">
                    <input type="text" id="tpl-search-kw" class="form-control" placeholder="搜索券名称或利益点..." style="width:220px;height:36px;font-size:13px;">
                    <select id="tpl-filter-type" class="form-control" style="width:130px;height:36px;font-size:13px;">
                        <option value="">全部加价类型</option>
                        <option value="fixed">固定金额加价</option>
                        <option value="percent">百分比比例加价</option>
                    </select>
                    <select id="tpl-filter-status" class="form-control" style="width:110px;height:36px;font-size:13px;">
                        <option value="">全部状态</option>
                        <option value="1">启用中</option>
                        <option value="0">已下架</option>
                    </select>
                    <button type="button" class="btn btn-secondary" id="btn-tpl-search" style="height:36px;padding:0 14px;font-size:13px;">🔍 查询</button>
                </div>
                <div style="font-size:12px;color:#64748b;">支持无门槛立加、阶梯满额立加与浮动百分比加价</div>
            </div>

            <div class="table-responsive" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
                <table class="table" style="width:100%;border-collapse:collapse;margin:0;">
                    <thead style="background:#f8fafc;border-bottom:1px solid #e2e8f0;">
                        <tr>
                            <th style="padding:12px 16px;text-align:left;font-size:12px;color:#475569;">券名称 / 营销副标题</th>
                            <th style="padding:12px 14px;text-align:left;font-size:12px;color:#475569;">加价规则与补贴力度</th>
                            <th style="padding:12px 14px;text-align:left;font-size:12px;color:#475569;">使用门槛与限定</th>
                            <th style="padding:12px 14px;text-align:left;font-size:12px;color:#475569;">发放模式</th>
                            <th style="padding:12px 14px;text-align:center;font-size:12px;color:#475569;">已领 / 已核销</th>
                            <th style="padding:12px 14px;text-align:center;font-size:12px;color:#475569;">状态</th>
                            <th style="padding:12px 16px;text-align:right;font-size:12px;color:#475569;">管理操作</th>
                        </tr>
                    </thead>
                    <tbody id="tpl-table-body">
                        <tr><td colspan="7" style="text-align:center;padding:32px;color:#94a3b8;">正在加载加价券数据...</td></tr>
                    </tbody>
                </table>
            </div>
            <div id="tpl-pagination" style="display:flex;justify-content:flex-end;align-items:center;gap:8px;margin-top:14px;"></div>
        `;

        document.getElementById('btn-tpl-search')?.addEventListener('click', () => loadTemplates(1));
        document.getElementById('tpl-search-kw')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') loadTemplates(1); });
        document.getElementById('tpl-filter-type')?.addEventListener('change', () => loadTemplates(1));
        document.getElementById('tpl-filter-status')?.addEventListener('change', () => loadTemplates(1));

        loadTemplates(1);
    }

    /**
     * 加载券模板列表数据
     */
    async function loadTemplates(page = 1) {
        templatePage = page;
        const kw = document.getElementById('tpl-search-kw')?.value.trim() || '';
        const type = document.getElementById('tpl-filter-type')?.value || '';
        const status = document.getElementById('tpl-filter-status')?.value || '';

        const res = await api.get('/admin/coupon/list', { keyword: kw, type, status, page, page_size: 10 });
        const tbody = document.getElementById('tpl-table-body');
        if (!tbody) return;

        if (!res || res.code !== 200 || !res.data || !res.data.list || res.data.list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:36px;color:#94a3b8;">暂无符合条件的加价券，可点击右上角创建一张</td></tr>`;
            return;
        }

        let html = '';
        res.data.list.forEach(item => {
            const isPercent = item.type === 'percent';
            const valueBadge = isPercent
                ? `<span style="font-size:14px;font-weight:700;color:#ef4444;">+${item.amount}%</span>`
                : `<span style="font-size:15px;font-weight:700;color:#ef4444;">+¥${Number(item.amount).toFixed(2)}</span>`;
            
            const minPriceText = Number(item.min_estimate_price) > 0
                ? `满 ¥${Number(item.min_estimate_price).toFixed(2)} 可用`
                : `<span style="color:#10b981;font-weight:600;">无门槛直接立加</span>`;
            
            const capText = isPercent && Number(item.max_amount) > 0 ? ` (封顶 ¥${Number(item.max_amount).toFixed(2)})` : '';
            const catText = item.category_name ? `<span class="badge badge-info">${escapeHtml(item.category_name)}专享</span>` : `<span class="badge" style="background:#f1f5f9;color:#475569;">全品类通用</span>`;
            
            const autoBadge = Number(item.is_auto_grant) === 1
                ? `<span class="badge" style="background:#fee2e2;color:#b91c1c;font-weight:600;">🎁 新客注册自动赠送</span>`
                : `<span class="badge" style="background:#f1f5f9;color:#64748b;">领券中心主动领取</span>`;

            const statusBadge = Number(item.status) === 1
                ? `<span class="badge badge-success">正常启用</span>`
                : `<span class="badge badge-gray">已下架</span>`;

            html += `
                <tr style="border-bottom:1px solid #f1f5f9;">
                    <td style="padding:14px 16px;">
                        <div style="font-weight:700;color:#0f172a;font-size:14px;">${escapeHtml(item.title)}</div>
                        <div style="font-size:12px;color:#64748b;margin-top:2px;">${escapeHtml(item.sub_title || '无补充描述')}</div>
                    </td>
                    <td style="padding:14px;">
                        <div style="display:flex;align-items:baseline;gap:6px;">
                            ${valueBadge}
                            <span style="font-size:12px;color:#64748b;">${capText}</span>
                        </div>
                        <div style="font-size:11px;color:#94a3b8;margin-top:2px;">领券后 ${item.valid_days} 天内有效</div>
                    </td>
                    <td style="padding:14px;">
                        <div style="font-size:13px;color:#334155;">${minPriceText}</div>
                        <div style="margin-top:4px;">${catText}</div>
                    </td>
                    <td style="padding:14px;">
                        <div>${autoBadge}</div>
                        <div style="font-size:11px;color:#94a3b8;margin-top:4px;">发行量: ${Number(item.total_count) > 0 ? item.total_count + ' 张' : '不限量'}</div>
                    </td>
                    <td style="padding:14px;text-align:center;">
                        <div style="font-size:14px;font-weight:700;color:#0f172a;">${item.received_count} <span style="font-size:12px;font-weight:normal;color:#94a3b8;">/</span> <span style="color:#10b981;">${item.used_count}</span></div>
                        <div style="font-size:11px;color:#94a3b8;">领 / 用</div>
                    </td>
                    <td style="padding:14px;text-align:center;">
                        ${statusBadge}
                    </td>
                    <td style="padding:14px 16px;text-align:right;">
                        <div style="display:inline-flex;gap:6px;">
                            <button type="button" class="btn btn-outline btn-edit-coupon" data-id="${item.id}" style="height:30px;padding:0 10px;font-size:12px;">编辑</button>
                            <button type="button" class="btn btn-outline btn-toggle-coupon" data-id="${item.id}" data-status="${item.status}" style="height:30px;padding:0 10px;font-size:12px;">${Number(item.status) === 1 ? '下架' : '上架'}</button>
                            <button type="button" class="btn btn-outline btn-del-coupon" data-id="${item.id}" style="height:30px;padding:0 8px;font-size:12px;color:#ef4444;">删除</button>
                        </div>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;

        // 绑定行内按钮事件
        tbody.querySelectorAll('.btn-edit-coupon').forEach(b => {
            b.addEventListener('click', async function () {
                const id = parseInt(this.getAttribute('data-id'), 10);
                const res = await api.get('/admin/coupon/detail', { id });
                if (res && res.code === 200 && res.data) {
                    openCouponModal(res.data);
                } else {
                    SysUI.toast('获取券详情失败', 'error');
                }
            });
        });

        tbody.querySelectorAll('.btn-toggle-coupon').forEach(b => {
            b.addEventListener('click', async function () {
                const id = parseInt(this.getAttribute('data-id'), 10);
                const curStatus = parseInt(this.getAttribute('data-status'), 10);
                const targetStatus = curStatus === 1 ? 0 : 1;
                const res = await api.post('/admin/coupon/toggleStatus', { id, status: targetStatus });
                if (res && res.code === 200) {
                    SysUI.toast(res.msg, 'success');
                    loadTemplates(templatePage);
                    loadCouponStats();
                } else {
                    SysUI.toast(res ? res.msg : '操作失败', 'error');
                }
            });
        });

        tbody.querySelectorAll('.btn-del-coupon').forEach(b => {
            b.addEventListener('click', async function () {
                const id = parseInt(this.getAttribute('data-id'), 10);
                const confirmed = await SysUI.confirm('确定要删除该加价券模板吗？已发放给用户的卡券不受影响。', {
                    title: '确认删除加价券',
                    isDanger: true,
                    confirmText: '确定删除'
                });
                if (confirmed) {
                    const res = await api.post('/admin/coupon/delete', { id });
                    if (res && res.code === 200) {
                        SysUI.toast('加价券模板已删除', 'success');
                        loadTemplates(templatePage);
                        loadCouponStats();
                    } else {
                        SysUI.toast(res ? res.msg : '删除失败', 'error');
                    }
                }
            });
        });

        // 渲染分页器
        renderPagination(document.getElementById('tpl-pagination'), res.data.total, res.data.page, res.data.page_size, (p) => loadTemplates(p));
    }

    /**
     * 子视图 2：用户领券与核销流水大屏
     */
    async function renderLogsSubView(container) {
        if (!container) return;

        container.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:10px;">
                <div style="display:flex;align-items:center;gap:10px;">
                    <input type="text" id="log-search-kw" class="form-control" placeholder="搜索用户手机号/订单号/券名..." style="width:240px;height:36px;font-size:13px;">
                    <select id="log-filter-status" class="form-control" style="width:130px;height:36px;font-size:13px;">
                        <option value="">全部使用状态</option>
                        <option value="unused">未使用 (卡包中)</option>
                        <option value="locked">已锁定 (待质检)</option>
                        <option value="used">已核销 (已打款)</option>
                        <option value="expired">已过期失效</option>
                    </select>
                    <button type="button" class="btn btn-secondary" id="btn-log-search" style="height:36px;padding:0 14px;font-size:13px;">🔍 筛选流水</button>
                </div>
                <div style="font-size:12px;color:#64748b;">实时追踪全平台用户卡包与加价核销生命周期</div>
            </div>

            <div class="table-responsive" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
                <table class="table" style="width:100%;border-collapse:collapse;margin:0;">
                    <thead style="background:#f8fafc;border-bottom:1px solid #e2e8f0;">
                        <tr>
                            <th style="padding:12px 16px;text-align:left;font-size:12px;color:#475569;">用户 / 手机号</th>
                            <th style="padding:12px 14px;text-align:left;font-size:12px;color:#475569;">加价券面额与门槛</th>
                            <th style="padding:12px 14px;text-align:left;font-size:12px;color:#475569;">有效期区间</th>
                            <th style="padding:12px 14px;text-align:center;font-size:12px;color:#475569;">卡券状态</th>
                            <th style="padding:12px 14px;text-align:left;font-size:12px;color:#475569;">绑定订单号</th>
                            <th style="padding:12px 16px;text-align:right;font-size:12px;color:#475569;">实际加价补贴</th>
                        </tr>
                    </thead>
                    <tbody id="log-table-body">
                        <tr><td colspan="6" style="text-align:center;padding:32px;color:#94a3b8;">正在加载卡券流水...</td></tr>
                    </tbody>
                </table>
            </div>
            <div id="log-pagination" style="display:flex;justify-content:flex-end;align-items:center;gap:8px;margin-top:14px;"></div>
        `;

        document.getElementById('btn-log-search')?.addEventListener('click', () => loadLogs(1));
        document.getElementById('log-search-kw')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') loadLogs(1); });
        document.getElementById('log-filter-status')?.addEventListener('change', () => loadLogs(1));

        loadLogs(1);
    }

    /**
     * 加载卡券流水数据
     */
    async function loadLogs(page = 1) {
        logPage = page;
        const kw = document.getElementById('log-search-kw')?.value.trim() || '';
        const status = document.getElementById('log-filter-status')?.value || '';

        const res = await api.get('/admin/coupon/userCoupons', { keyword: kw, status, page, page_size: 10 });
        const tbody = document.getElementById('log-table-body');
        if (!tbody) return;

        if (!res || res.code !== 200 || !res.data || !res.data.list || res.data.list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:36px;color:#94a3b8;">暂无符合条件的卡券流水明细</td></tr>`;
            return;
        }

        let html = '';
        res.data.list.forEach(item => {
            let statusBadge = '';
            if (item.status === 'unused') {
                statusBadge = '<span class="badge badge-info">未使用(在卡包)</span>';
            } else if (item.status === 'locked') {
                statusBadge = '<span class="badge badge-warning" style="background:#fed7aa;color:#9a3412;">订单锁定(待核验)</span>';
            } else if (item.status === 'used') {
                statusBadge = '<span class="badge badge-success">已成交核销</span>';
            } else {
                statusBadge = '<span class="badge badge-gray">已过期失效</span>';
            }

            const startTimeStr = item.start_time ? new Date(item.start_time * 1000).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-';
            const endTimeStr = item.end_time ? new Date(item.end_time * 1000).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-';
            const actualAdd = Number(item.actual_add_price) > 0 ? `<span style="font-weight:700;color:#10b981;">+¥${Number(item.actual_add_price).toFixed(2)}</span>` : '<span style="color:#94a3b8;">-</span>';

            html += `
                <tr style="border-bottom:1px solid #f1f5f9;">
                    <td style="padding:14px 16px;">
                        <div style="font-weight:600;color:#0f172a;">${escapeHtml(item.nickname || '回收用户')}</div>
                        <div style="font-size:12px;color:#64748b;font-family:monospace;">${escapeHtml(item.mobile || '未绑定手机')}</div>
                    </td>
                    <td style="padding:14px;">
                        <div style="font-weight:600;color:#0f172a;">${escapeHtml(item.title)}</div>
                        <div style="font-size:12px;color:#64748b;">
                            ${item.type === 'percent' ? `加价 ${item.amount}%` : `面额 ¥${Number(item.amount).toFixed(2)}`} · 满 ¥${Number(item.min_estimate_price).toFixed(2)} 可用
                        </div>
                    </td>
                    <td style="padding:14px;font-size:12px;color:#64748b;">
                        <div>${startTimeStr} 至</div>
                        <div>${endTimeStr}</div>
                    </td>
                    <td style="padding:14px;text-align:center;">
                        ${statusBadge}
                    </td>
                    <td style="padding:14px;">
                        ${item.order_sn ? `<a href="javascript:;" style="font-family:monospace;font-size:12px;color:#1e58ff;text-decoration:none;">${escapeHtml(item.order_sn)}</a>` : '<span style="color:#94a3b8;font-size:12px;">尚未绑定订单</span>'}
                    </td>
                    <td style="padding:14px 16px;text-align:right;">
                        ${actualAdd}
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;

        renderPagination(document.getElementById('log-pagination'), res.data.total, res.data.page, res.data.page_size, (p) => loadLogs(p));
    }

    /**
     * 打开新建/编辑加价券弹窗
     */
    function openCouponModal(coupon = null) {
        const isEdit = coupon !== null && coupon.id > 0;
        const categories = window.state ? (window.state.categories || []) : [];

        let catOptions = '<option value="0">全部品类通用</option>';
        categories.forEach(cat => {
            const selected = coupon && parseInt(coupon.category_id, 10) === parseInt(cat.id, 10) ? 'selected' : '';
            catOptions += `<option value="${cat.id}" ${selected}>${escapeHtml(cat.name)}</option>`;
        });

        const modalHtml = `
            <div id="coupon-modal-backdrop" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;">
                <div style="background:#fff;border-radius:12px;width:100%;max-width:580px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1),0 10px 10px -5px rgba(0,0,0,0.04);overflow:hidden;">
                    <div style="padding:18px 24px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;">
                        <h4 style="font-size:16px;font-weight:700;color:#0f172a;margin:0;">${isEdit ? '编辑加价补贴券' : '新建回收加价补贴券'}</h4>
                        <button type="button" id="btn-close-modal" style="background:none;border:none;font-size:20px;color:#94a3b8;cursor:pointer;">&times;</button>
                    </div>
                    <form id="coupon-edit-form" style="padding:20px 24px;max-height:80vh;overflow-y:auto;">
                        <input type="hidden" name="id" value="${coupon ? coupon.id : 0}">
                        
                        <div class="login-form-group" style="margin-bottom:14px;">
                            <label style="font-weight:600;">加价券名称 *</label>
                            <input type="text" name="title" class="form-control" placeholder="如: 新人首单翻倍券 / 数码满1000加80" value="${coupon ? escapeHtml(coupon.title) : ''}" required>
                        </div>

                        <div class="login-form-group" style="margin-bottom:14px;">
                            <label style="font-weight:600;">营销副标题 / 利益点描述</label>
                            <input type="text" name="sub_title" class="form-control" placeholder="如: 官方现金直补，质检合格随订单立结" value="${coupon ? escapeHtml(coupon.sub_title) : ''}">
                        </div>

                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
                            <div class="login-form-group">
                                <label style="font-weight:600;">加价计算方式 *</label>
                                <select name="type" id="modal-coupon-type" class="form-control" required>
                                    <option value="fixed" ${coupon && coupon.type === 'fixed' ? 'selected' : ''}>固定金额补贴 (元)</option>
                                    <option value="percent" ${coupon && coupon.type === 'percent' ? 'selected' : ''}>百分比比例补贴 (%)</option>
                                </select>
                            </div>
                            <div class="login-form-group">
                                <label style="font-weight:600;" id="lbl-coupon-amount">加价补贴数值 (元) *</label>
                                <input type="number" step="0.01" min="0.01" name="amount" class="form-control" placeholder="如: 80.00" value="${coupon ? coupon.amount : ''}" required>
                            </div>
                        </div>

                        <div id="modal-max-amount-row" style="margin-bottom:14px;display:${coupon && coupon.type === 'percent' ? 'block' : 'none'};">
                            <div class="login-form-group">
                                <label style="font-weight:600;">单笔最高封顶补贴上限 (元，0 为不限封顶)</label>
                                <input type="number" step="0.01" min="0" name="max_amount" class="form-control" placeholder="如: 150.00" value="${coupon ? coupon.max_amount : '0.00'}">
                            </div>
                        </div>

                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
                            <div class="login-form-group">
                                <label style="font-weight:600;">最低生效估价门槛 (元，0 为无门槛)</label>
                                <input type="number" step="0.01" min="0" name="min_estimate_price" class="form-control" placeholder="如: 1000.00" value="${coupon ? coupon.min_estimate_price : '0.00'}">
                            </div>
                            <div class="login-form-group">
                                <label style="font-weight:600;">适用回收品类</label>
                                <select name="category_id" class="form-control">
                                    ${catOptions}
                                </select>
                            </div>
                        </div>

                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
                            <div class="login-form-group">
                                <label style="font-weight:600;">领取后有效天数 (天) *</label>
                                <input type="number" min="1" name="valid_days" class="form-control" placeholder="如: 7" value="${coupon ? coupon.valid_days : '7'}" required>
                            </div>
                            <div class="login-form-group">
                                <label style="font-weight:600;">计划发行总量 (0 为不限量)</label>
                                <input type="number" min="0" name="total_count" class="form-control" placeholder="如: 500" value="${coupon ? coupon.total_count : '0'}">
                            </div>
                        </div>

                        <div style="background:#f8fafc;padding:14px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:14px;">
                            <label style="display:flex;align-items:center;gap:10px;font-weight:600;cursor:pointer;">
                                <input type="checkbox" name="is_auto_grant" value="1" ${coupon && Number(coupon.is_auto_grant) === 1 ? 'checked' : ''} style="width:18px;height:18px;">
                                <span>🎁 新用户注册或首次登录自动发放至卡包</span>
                            </label>
                            <div style="font-size:12px;color:#64748b;margin-top:4px;padding-left:28px;">勾选后，新访客在前台微信快捷登录或手机号注册时，系统自动注入该券破冰促单。</div>
                        </div>

                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
                            <div class="login-form-group">
                                <label style="font-weight:600;">排序权重 (越大越前)</label>
                                <input type="number" name="sort" class="form-control" value="${coupon ? coupon.sort : '0'}">
                            </div>
                            <div class="login-form-group">
                                <label style="font-weight:600;">上架状态</label>
                                <select name="status" class="form-control">
                                    <option value="1" ${!coupon || Number(coupon.status) === 1 ? 'selected' : ''}>立即上架启用</option>
                                    <option value="0" ${coupon && Number(coupon.status) === 0 ? 'selected' : ''}>暂存下架</option>
                                </select>
                            </div>
                        </div>

                        <div style="margin-top:20px;display:flex;justify-content:flex-end;gap:10px;">
                            <button type="button" class="btn btn-secondary" id="btn-cancel-modal">取消</button>
                            <button type="submit" class="btn btn-primary" id="btn-submit-coupon" style="padding:0 24px;">保存加价券</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        const wrap = document.createElement('div');
        wrap.innerHTML = modalHtml;
        document.body.appendChild(wrap);

        const closeModal = () => { wrap.remove(); };
        document.getElementById('btn-close-modal')?.addEventListener('click', closeModal);
        document.getElementById('btn-cancel-modal')?.addEventListener('click', closeModal);

        // 联动切换加价方式
        const typeSelect = document.getElementById('modal-coupon-type');
        const maxRow = document.getElementById('modal-max-amount-row');
        const amountLabel = document.getElementById('lbl-coupon-amount');
        typeSelect?.addEventListener('change', function () {
            if (this.value === 'percent') {
                if (maxRow) maxRow.style.display = 'block';
                if (amountLabel) amountLabel.innerText = '加价补贴比例 (%) *';
            } else {
                if (maxRow) maxRow.style.display = 'none';
                if (amountLabel) amountLabel.innerText = '加价补贴金额 (元) *';
            }
        });

        // 提交表单
        document.getElementById('coupon-edit-form')?.addEventListener('submit', async function (e) {
            e.preventDefault();
            const fd = new FormData(this);
            const payload = {
                id: parseInt(fd.get('id') || '0', 10),
                title: fd.get('title'),
                sub_title: fd.get('sub_title'),
                type: fd.get('type'),
                amount: fd.get('amount'),
                max_amount: fd.get('max_amount') || '0.00',
                min_estimate_price: fd.get('min_estimate_price') || '0.00',
                category_id: parseInt(fd.get('category_id') || '0', 10),
                valid_days: parseInt(fd.get('valid_days') || '7', 10),
                total_count: parseInt(fd.get('total_count') || '0', 10),
                is_auto_grant: fd.get('is_auto_grant') === '1' ? 1 : 0,
                sort: parseInt(fd.get('sort') || '0', 10),
                status: parseInt(fd.get('status') || '1', 10)
            };

            const submitBtn = document.getElementById('btn-submit-coupon');
            if (submitBtn) submitBtn.disabled = true;

            const res = await api.post('/admin/coupon/save', payload);
            if (submitBtn) submitBtn.disabled = false;

            if (res && res.code === 200) {
                SysUI.toast('加价补贴券已成功保存！', 'success');
                closeModal();
                loadTemplates(templatePage);
                loadCouponStats();
            } else {
                SysUI.toast(res ? res.msg : '保存失败', 'error');
            }
        });
    }

    /**
     * 打开定向发放加价券给用户弹窗
     */
    async function openGrantModal() {
        const tplRes = await api.get('/admin/coupon/list', { status: 1, page: 1, page_size: 100 });
        const list = (tplRes && tplRes.code === 200 && tplRes.data) ? tplRes.data.list : [];
        if (!list || list.length === 0) {
            SysUI.toast('暂无可用的加价券，请先新建并启用加价券', 'warning');
            return;
        }

        let options = '';
        list.forEach(c => {
            options += `<option value="${c.id}">${escapeHtml(c.title)} (满 ¥${Number(c.min_estimate_price).toFixed(2)} ${c.type === 'percent' ? '加' + c.amount + '%' : '加¥' + Number(c.amount).toFixed(2)})</option>`;
        });

        const modalHtml = `
            <div id="grant-modal-backdrop" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;">
                <div style="background:#fff;border-radius:12px;width:100%;max-width:480px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1);overflow:hidden;">
                    <div style="padding:18px 24px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;">
                        <h4 style="font-size:16px;font-weight:700;color:#0f172a;margin:0;">定向发放加价券给用户</h4>
                        <button type="button" id="btn-close-grant-modal" style="background:none;border:none;font-size:20px;color:#94a3b8;cursor:pointer;">&times;</button>
                    </div>
                    <form id="grant-form" style="padding:20px 24px;">
                        <div class="login-form-group" style="margin-bottom:14px;">
                            <label style="font-weight:600;">目标用户 ID *</label>
                            <input type="number" id="grant-user-id" class="form-control" placeholder="请输入会员用户主键 ID (在用户管理中查看)" required>
                        </div>
                        <div class="login-form-group" style="margin-bottom:16px;">
                            <label style="font-weight:600;">选择要发放的加价券 *</label>
                            <select id="grant-coupon-id" class="form-control" required>
                                ${options}
                            </select>
                        </div>
                        <div style="display:flex;justify-content:flex-end;gap:10px;">
                            <button type="button" class="btn btn-secondary" id="btn-cancel-grant">取消</button>
                            <button type="submit" class="btn btn-primary" id="btn-submit-grant" style="padding:0 20px;">立即发券到卡包</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        const wrap = document.createElement('div');
        wrap.innerHTML = modalHtml;
        document.body.appendChild(wrap);

        const closeModal = () => { wrap.remove(); };
        document.getElementById('btn-close-grant-modal')?.addEventListener('click', closeModal);
        document.getElementById('btn-cancel-grant')?.addEventListener('click', closeModal);

        document.getElementById('grant-form')?.addEventListener('submit', async function (e) {
            e.preventDefault();
            const userId = parseInt(document.getElementById('grant-user-id')?.value || '0', 10);
            const couponId = parseInt(document.getElementById('grant-coupon-id')?.value || '0', 10);

            if (userId <= 0 || couponId <= 0) {
                SysUI.toast('用户ID和加价券不能为空', 'warning');
                return;
            }

            const btn = document.getElementById('btn-submit-grant');
            if (btn) btn.disabled = true;

            const res = await api.post('/admin/coupon/grantToUser', { user_id: userId, coupon_id: couponId });
            if (btn) btn.disabled = false;

            if (res && res.code === 200) {
                SysUI.toast('加价券已成功送达用户卡包！', 'success');
                closeModal();
                loadCouponStats();
            } else {
                SysUI.toast(res ? res.msg : '发放失败', 'error');
            }
        });
    }

    /**
     * 渲染前台营销展示与开关配置子面板
     */
    async function renderDisplaySettingsSubView(container) {
        if (!container) return;
        container.innerHTML = '<div style="padding:40px;text-align:center;color:#64748b;">正在加载前台展示配置...</div>';

        const res = await api.get('/admin/coupon/getDisplaySettings');
        const s = (res && res.code === 200 && res.data) ? res.data : {
            coupon_system_enabled: true,
            coupon_nav_entry_enabled: true,
            coupon_home_showcase_enabled: true,
            coupon_float_widget_enabled: true,
            coupon_float_title: '加价补贴券',
            coupon_float_subtitle: '最高立加¥300',
            coupon_float_bottom_offset: 145,
            coupon_eval_badge_enabled: true,
            coupon_order_select_enabled: true,
            miniapp_coupon_section_enabled: true,
            miniapp_coupon_float_enabled: true,
            miniapp_coupon_eval_enabled: true
        };

        container.innerHTML = `
            <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:24px;">
                <form id="coupon-display-settings-form">
                    <!-- 1. 全局体系总开关 -->
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px;margin-bottom:24px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
                            <div>
                                <div style="font-size:15px;font-weight:700;color:#0f172a;display:flex;align-items:center;gap:8px;">
                                    <span>🌐</span> 加价券全站营销总开关
                                    <span class="badge" style="background:#dbeafe;color:#1e40af;font-size:11px;">全局总控</span>
                                </div>
                                <div style="font-size:12px;color:#64748b;margin-top:4px;">关闭后，官网与小程序全渠道立即停用并彻底隐藏所有加价券专区、领券入口、估价浮标与结算核销模块</div>
                            </div>
                            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:14px;font-weight:700;color:#0f172a;">
                                <input type="checkbox" id="cfg-coupon-system-enabled" ${s.coupon_system_enabled ? 'checked' : ''} style="width:18px;height:18px;cursor:pointer;">
                                启用加价券体系
                            </label>
                        </div>
                    </div>

                    <!-- 2. 官方 Web 官网展示区域设置 -->
                    <div style="margin-bottom:28px;">
                        <div style="font-size:14px;font-weight:700;color:#1e58ff;margin-bottom:14px;display:flex;align-items:center;gap:6px;">
                            <span>💻</span> 官方 Web 官网各展示区域开关 (PC / 移动端 H5)
                        </div>

                        <div style="display:flex;flex-direction:column;gap:14px;">
                            <!-- 区域 1: 顶部主导航入口 -->
                            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;">
                                <div style="display:flex;justify-content:space-between;align-items:center;">
                                    <div>
                                        <div style="font-size:13px;font-weight:700;color:#0f172a;">1. 顶部主导航栏「领加价券」入口按钮</div>
                                        <div style="font-size:12px;color:#64748b;margin-top:2px;">在官网顶部导航右上角展示高光营销按钮，点击即可直达领券与卡包中心</div>
                                    </div>
                                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;font-weight:600;">
                                        <input type="checkbox" id="cfg-coupon-nav-entry-enabled" ${s.coupon_nav_entry_enabled ? 'checked' : ''}> 开启展示
                                    </label>
                                </div>
                            </div>

                            <!-- 区域 2: 首页核心专区横幅 -->
                            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;">
                                <div style="display:flex;justify-content:space-between;align-items:center;">
                                    <div>
                                        <div style="font-size:13px;font-weight:700;color:#0f172a;">2. 首页核心「回收加价补贴专区」横幅展位</div>
                                        <div style="font-size:12px;color:#64748b;margin-top:2px;">在首页主轮播图下方展示卡券票据式立体卡片专区，访客可一键点击领取</div>
                                    </div>
                                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;font-weight:600;">
                                        <input type="checkbox" id="cfg-coupon-home-showcase-enabled" ${s.coupon_home_showcase_enabled ? 'checked' : ''}> 开启展示
                                    </label>
                                </div>
                            </div>

                            <!-- 区域 3: 右下角悬浮挂件与防遮挡定制 -->
                            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;">
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                                    <div>
                                        <div style="font-size:13px;font-weight:700;color:#0f172a;">3. 右下角常驻「悬浮补贴福利挂件」与位置定制</div>
                                        <div style="font-size:12px;color:#64748b;margin-top:2px;">在官网右下角常驻微动效红包胶囊挂件，点击直接弹出加价券领取大屏</div>
                                    </div>
                                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;font-weight:600;">
                                        <input type="checkbox" id="cfg-coupon-float-widget-enabled" ${s.coupon_float_widget_enabled ? 'checked' : ''}> 开启挂件
                                    </label>
                                </div>
                                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;background:#ffffff;border:1px dashed #cbd5e1;border-radius:6px;padding:12px;">
                                    <div class="login-form-group" style="margin:0;">
                                        <label style="font-size:12px;color:#475569;">挂件主标语</label>
                                        <input type="text" id="cfg-coupon-float-title" class="form-control" value="${escapeHtml(s.coupon_float_title || '加价补贴券')}" placeholder="如: 加价补贴券">
                                    </div>
                                    <div class="login-form-group" style="margin:0;">
                                        <label style="font-size:12px;color:#475569;">挂件副标题 / 补贴金额</label>
                                        <input type="text" id="cfg-coupon-float-subtitle" class="form-control" value="${escapeHtml(s.coupon_float_subtitle || '最高立加¥300')}" placeholder="如: 最高立加¥300">
                                    </div>
                                    <div class="login-form-group" style="margin:0;">
                                        <label style="font-size:12px;color:#475569;">
                                            垂直底边距 (px)
                                            <span style="color:#ef4444;font-size:11px;" title="避开回到顶部与客服按钮">*防遮挡调节</span>
                                        </label>
                                        <input type="number" id="cfg-coupon-float-bottom-offset" class="form-control" value="${parseInt(s.coupon_float_bottom_offset, 10) || 145}" min="20" max="600" step="5" placeholder="推荐 145">
                                    </div>
                                </div>
                                <div style="font-size:11px;color:#94a3b8;margin-top:8px;">
                                    💡 提示：若页面右下角有【回到顶部】或【查单/在线客服】图标，将底边距设为 145px ~ 180px 即可完美向上错开，彻底避免元素重叠。
                                </div>
                            </div>

                            <!-- 区域 4: 机型估价大屏动态加价浮标 -->
                            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;">
                                <div style="display:flex;justify-content:space-between;align-items:center;">
                                    <div>
                                        <div style="font-size:13px;font-weight:700;color:#0f172a;">4. 估价大屏实时「叠加补贴加价浮标」</div>
                                        <div style="font-size:12px;color:#64748b;margin-top:2px;">在评估机型并得出预估价时，动态浮现加价券增额与最高到手价（如：🧧 补贴券加价 +¥50）</div>
                                    </div>
                                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;font-weight:600;">
                                        <input type="checkbox" id="cfg-coupon-eval-badge-enabled" ${s.coupon_eval_badge_enabled ? 'checked' : ''}> 开启展示
                                    </label>
                                </div>
                            </div>

                            <!-- 区域 5: 下单结算页卡券抵扣选择器 -->
                            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;">
                                <div style="display:flex;justify-content:space-between;align-items:center;">
                                    <div>
                                        <div style="font-size:13px;font-weight:700;color:#0f172a;">5. 下单结算页「加价券智能抵扣选择」</div>
                                        <div style="font-size:12px;color:#64748b;margin-top:2px;">在提交订单弹窗内，自动为用户匹配最高补贴券并允许用户自选手头卡券进行核销</div>
                                    </div>
                                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;font-weight:600;">
                                        <input type="checkbox" id="cfg-coupon-order-select-enabled" ${s.coupon_order_select_enabled ? 'checked' : ''}> 开启核销
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 3. 微信小程序端展示区域设置 -->
                    <div style="margin-bottom:28px;">
                        <div style="font-size:14px;font-weight:700;color:#10b981;margin-bottom:14px;display:flex;align-items:center;gap:6px;">
                            <span>📱</span> 微信小程序端展示区域开关
                        </div>

                        <div style="display:flex;flex-direction:column;gap:14px;">
                            <!-- 小程序区域 1: 首页横向滚动专区 -->
                            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;">
                                <div style="display:flex;justify-content:space-between;align-items:center;">
                                    <div>
                                        <div style="font-size:13px;font-weight:700;color:#0f172a;">1. 小程序首页「横向滚动加价专区」</div>
                                        <div style="font-size:12px;color:#64748b;margin-top:2px;">在小程序端首页搜索框/分类下方横向展示加价券卡片滑块</div>
                                    </div>
                                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;font-weight:600;">
                                        <input type="checkbox" id="cfg-miniapp-coupon-section-enabled" ${s.miniapp_coupon_section_enabled ? 'checked' : ''}> 开启展示
                                    </label>
                                </div>
                            </div>

                            <!-- 小程序区域 2: 首页悬浮挂件 -->
                            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;">
                                <div style="display:flex;justify-content:space-between;align-items:center;">
                                    <div>
                                        <div style="font-size:13px;font-weight:700;color:#0f172a;">2. 小程序首页右下角「悬浮补贴入口」</div>
                                        <div style="font-size:12px;color:#64748b;margin-top:2px;">在小程序首页右下角展示带有动效的“🎁 领¥300补贴”快捷悬浮入口</div>
                                    </div>
                                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;font-weight:600;">
                                        <input type="checkbox" id="cfg-miniapp-coupon-float-enabled" ${s.miniapp_coupon_float_enabled ? 'checked' : ''}> 开启入口
                                    </label>
                                </div>
                            </div>

                            <!-- 小程序区域 3: 答题估价底栏加价浮标 -->
                            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;">
                                <div style="display:flex;justify-content:space-between;align-items:center;">
                                    <div>
                                        <div style="font-size:13px;font-weight:700;color:#0f172a;">3. 小程序答题估价底栏「叠加补贴浮标」</div>
                                        <div style="font-size:12px;color:#64748b;margin-top:2px;">在答题算价底栏实时呈现“补贴券+¥XX | 最高到手 ¥XXXX”</div>
                                    </div>
                                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;font-weight:600;">
                                        <input type="checkbox" id="cfg-miniapp-coupon-eval-enabled" ${s.miniapp_coupon_eval_enabled ? 'checked' : ''}> 开启浮标
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 保存操作栏 -->
                    <div style="margin-top:28px;padding-top:20px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;align-items:center;gap:12px;">
                        <button type="button" class="btn btn-secondary" id="btn-reset-coupon-display">重置改动</button>
                        <button type="submit" class="btn btn-primary" id="btn-save-coupon-display" style="height:42px;padding:0 28px;font-size:14px;font-weight:600;display:inline-flex;align-items:center;gap:6px;">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>
                            保存前台展示与开关配置
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.getElementById('btn-reset-coupon-display')?.addEventListener('click', () => {
            renderDisplaySettingsSubView(container);
        });

        document.getElementById('coupon-display-settings-form')?.addEventListener('submit', async function(e) {
            e.preventDefault();
            const btn = document.getElementById('btn-save-coupon-display');
            if (btn) btn.disabled = true;

            const payload = {
                settings: {
                    coupon_system_enabled: document.getElementById('cfg-coupon-system-enabled')?.checked ? '1' : '0',
                    coupon_nav_entry_enabled: document.getElementById('cfg-coupon-nav-entry-enabled')?.checked ? '1' : '0',
                    coupon_home_showcase_enabled: document.getElementById('cfg-coupon-home-showcase-enabled')?.checked ? '1' : '0',
                    coupon_float_widget_enabled: document.getElementById('cfg-coupon-float-widget-enabled')?.checked ? '1' : '0',
                    coupon_float_title: document.getElementById('cfg-coupon-float-title')?.value.trim() || '加价补贴券',
                    coupon_float_subtitle: document.getElementById('cfg-coupon-float-subtitle')?.value.trim() || '最高立加¥300',
                    coupon_float_bottom_offset: parseInt(document.getElementById('cfg-coupon-float-bottom-offset')?.value || '145', 10),
                    coupon_eval_badge_enabled: document.getElementById('cfg-coupon-eval-badge-enabled')?.checked ? '1' : '0',
                    coupon_order_select_enabled: document.getElementById('cfg-coupon-order-select-enabled')?.checked ? '1' : '0',
                    miniapp_coupon_section_enabled: document.getElementById('cfg-miniapp-coupon-section-enabled')?.checked ? '1' : '0',
                    miniapp_coupon_float_enabled: document.getElementById('cfg-miniapp-coupon-float-enabled')?.checked ? '1' : '0',
                    miniapp_coupon_eval_enabled: document.getElementById('cfg-miniapp-coupon-eval-enabled')?.checked ? '1' : '0'
                }
            };

            const saveRes = await api.post('/admin/coupon/saveDisplaySettings', payload);
            if (btn) btn.disabled = false;

            if (saveRes && saveRes.code === 200) {
                SysUI.toast('加价券前台展示与开关配置已保存生效！', 'success');
            } else {
                SysUI.toast(saveRes ? saveRes.msg : '保存失败', 'error');
            }
        });
    }

    /**
     * 通用分页渲染组件
     */
    function renderPagination(container, total, currentPage, pageSize, onPageChange) {
        if (!container) return;
        const totalPages = Math.ceil(total / pageSize);
        if (totalPages <= 1) {
            container.innerHTML = `<span style="font-size:12px;color:#94a3b8;">共 ${total} 条记录</span>`;
            return;
        }

        let html = `<span style="font-size:12px;color:#64748b;margin-right:8px;">共 ${total} 条 · 第 ${currentPage}/${totalPages} 页</span>`;
        if (currentPage > 1) {
            html += `<button type="button" class="btn btn-outline btn-page" data-page="${currentPage - 1}" style="height:28px;padding:0 8px;font-size:12px;">上一页</button>`;
        }
        if (currentPage < totalPages) {
            html += `<button type="button" class="btn btn-outline btn-page" data-page="${currentPage + 1}" style="height:28px;padding:0 8px;font-size:12px;">下一页</button>`;
        }

        container.innerHTML = html;
        container.querySelectorAll('.btn-page').forEach(b => {
            b.addEventListener('click', function () {
                const p = parseInt(this.getAttribute('data-page'), 10);
                if (typeof onPageChange === 'function') onPageChange(p);
            });
        });
    }

    window.renderCouponsView = renderCouponsView;
})(window);
