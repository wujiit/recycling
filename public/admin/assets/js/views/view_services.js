/**
 * 启灵同城服务系统 - 同城生活服务与跑腿品类项目视图
 * 职责：服务品类维护、服务项目管理、多规格阶梯价格配置与图例说明
 * 编码：UTF-8 无 BOM
 */
(function (window) {
    'use strict';

    const SysUI = window.SysUI;
    const api = window.adminApi || window.api;
    const state = window.adminState || window.state;
    const escapeHtml = window.escapeHtml || function (s) { return s == null ? '' : String(s); };

    let currentSubTab = 'items'; // 'items' | 'categories' | 'fields'
    let cachedCategories = [];
    let localBookingFields = [];

    async function loadCategoryOptions() {
        const res = await api.get('/admin/service/categoryList');
        if (res && res.code === 200) {
            cachedCategories = res.data || [];
        }
        return cachedCategories;
    }

    async function renderServicesView(container) {
        await loadCategoryOptions();

        let headerActionBtn = '';
        if (currentSubTab === 'items') {
            headerActionBtn = '<button class="btn btn-success" id="btn-add-service-item" style="background:#10b981;color:#fff;">+ 新增服务项目</button>';
        } else if (currentSubTab === 'categories') {
            headerActionBtn = '<button class="btn btn-success" id="btn-add-service-category" style="background:#10b981;color:#fff;">+ 新增服务品类</button>';
        } else if (currentSubTab === 'fields') {
            headerActionBtn = '<button class="btn btn-primary" id="btn-add-booking-field" style="background:#1e58ff;color:#fff;">+ 添加预约表单字段</button>';
        }

        container.innerHTML = `
            <div class="card" style="padding: 20px;">
                <!-- 顶部子标签切换 -->
                <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e2e8f0;padding-bottom:14px;margin-bottom:18px;flex-wrap:wrap;gap:10px;">
                    <div style="display:flex;gap:10px;flex-wrap:wrap;">
                        <button class="btn ${currentSubTab === 'items' ? 'btn-primary' : 'btn-secondary'}" id="subtab-services-items" style="font-weight:600;">
                            🛠️ 服务项目与规格
                        </button>
                        <button class="btn ${currentSubTab === 'categories' ? 'btn-primary' : 'btn-secondary'}" id="subtab-services-categories" style="font-weight:600;">
                            📂 服务品类管理
                        </button>
                        <button class="btn ${currentSubTab === 'fields' ? 'btn-primary' : 'btn-secondary'}" id="subtab-services-fields" style="font-weight:600;">
                            🧩 预约表单定制 (行业字段设置)
                        </button>
                    </div>
                    <div id="services-header-actions">
                        ${headerActionBtn}
                    </div>
                </div>

                <!-- 视图容器 -->
                <div id="services-subview-content"></div>
            </div>
        `;

        document.getElementById('subtab-services-items')?.addEventListener('click', () => {
            currentSubTab = 'items';
            renderServicesView(container);
        });

        document.getElementById('subtab-services-categories')?.addEventListener('click', () => {
            currentSubTab = 'categories';
            renderServicesView(container);
        });

        document.getElementById('subtab-services-fields')?.addEventListener('click', () => {
            currentSubTab = 'fields';
            renderServicesView(container);
        });

        if (currentSubTab === 'items') {
            document.getElementById('btn-add-service-item')?.addEventListener('click', () => openItemModal());
            renderItemsList();
        } else if (currentSubTab === 'categories') {
            document.getElementById('btn-add-service-category')?.addEventListener('click', () => openCategoryModal());
            renderCategoriesList();
        } else if (currentSubTab === 'fields') {
            renderBookingFieldsManager();
        }
    }

    /**
     * 渲染服务项目列表
     */
    async function renderItemsList() {
        const box = document.getElementById('services-subview-content');
        if (!box) return;

        box.innerHTML = `
            <div class="toolbar" style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:16px;">
                <input type="text" class="form-control" id="item-search-kw" placeholder="搜索服务名称 / 关键字" style="width:220px;">
                <select class="form-control" id="item-cat-filter" style="width:160px;">
                    <option value="0">全部分类</option>
                    ${cachedCategories.map(c => `<option value="${c.id}">${escapeHtml(c.name)} (${c.biz_type === 'errand' ? '跑腿' : '服务'})</option>`).join('')}
                </select>
                <select class="form-control" id="item-biz-filter" style="width:140px;">
                    <option value="">全部业务</option>
                    <option value="service">同城服务</option>
                    <option value="errand">同城跑腿</option>
                </select>
                <select class="form-control" id="item-status-filter" style="width:120px;">
                    <option value="">全部状态</option>
                    <option value="active">上架中</option>
                    <option value="inactive">已下架</option>
                </select>
                <button class="btn btn-primary" id="btn-item-search">筛选</button>
            </div>
            <div id="services-items-table-box">加载中...</div>
        `;

        document.getElementById('btn-item-search')?.addEventListener('click', loadItemsData);
        loadItemsData();
    }

    async function loadItemsData() {
        const tableBox = document.getElementById('services-items-table-box');
        if (!tableBox) return;

        const kw = document.getElementById('item-search-kw')?.value.trim() || '';
        const catId = document.getElementById('item-cat-filter')?.value || 0;
        const bizType = document.getElementById('item-biz-filter')?.value || '';
        const status = document.getElementById('item-status-filter')?.value || '';

        const res = await api.get('/admin/service/itemList', {
            keyword: kw,
            category_id: catId,
            biz_type: bizType,
            status: status,
            page: 1,
            page_size: 50
        });
        if (!res || res.code !== 200) {
            tableBox.innerHTML = '<div style="text-align:center;padding:30px;color:#ef4444;">加载服务项目列表失败</div>';
            return;
        }

        const list = res.data.list || [];
        if (list.length === 0) {
            tableBox.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;">暂无符合条件的生活服务项目</div>';
            return;
        }

        let rows = '';
        list.forEach(item => {
            const cover = item.cover_image 
                ? `<img src="${escapeHtml(item.cover_image)}" style="width:48px;height:48px;border-radius:8px;object-fit:cover;border:1px solid #e2e8f0;" onerror="this.onerror=null; this.src='/uploads/default/service_clean.svg'">` 
                : '<div style="width:48px;height:48px;background:#f1f5f9;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:20px;">🛠️</div>';
            const bizBadge = item.biz_type === 'errand'
                ? '<span class="badge" style="background:#e0f2fe;color:#0369a1;">同城跑腿</span>'
                : '<span class="badge" style="background:#fef3c7;color:#92400e;">同城生活</span>';
            const isUp = (item.status == 1 || item.status === 'active');
            const statusBadge = isUp
                ? '<span class="badge" style="background:#dcfce7;color:#15803d;">上架销售中</span>'
                : '<span class="badge" style="background:#f1f5f9;color:#64748b;">已下架</span>';
            const hotBadge = (item.is_hot == 1 || item.is_hot === true) ? '<span class="badge" style="background:#fee2e2;color:#b91c1c;margin-left:4px;">🔥 推荐</span>' : '';
            const priceVal = item.price || item.base_price || '0.00';
            const unitVal = item.price_unit || item.unit || '次';
            const sortVal = item.sort !== undefined ? item.sort : (item.sort_order || 0);

            rows += `<tr>
                <td style="width:60px;">${cover}</td>
                <td>
                    <div style="font-weight:700;color:#0f172a;font-size:14px;">${escapeHtml(item.title)}${hotBadge}</div>
                    <div style="font-size:12px;color:#64748b;margin-top:2px;">${escapeHtml(item.sub_title || '暂无副标题')}</div>
                </td>
                <td>
                    <div>${escapeHtml(item.category_name || '-')}</div>
                    <div style="margin-top:4px;">${bizBadge}</div>
                </td>
                <td>
                    <div style="font-weight:700;color:#ea580c;font-size:15px;">¥ ${escapeHtml(priceVal)} <span style="font-size:12px;color:#64748b;font-weight:normal;">/ ${escapeHtml(unitVal)}</span></div>
                    <div style="font-size:12px;color:#0284c7;cursor:pointer;margin-top:2px;" onclick="window.openSpecManageModal(${item.id}, '${escapeHtml(item.title)}')">规格(${item.specs_count || 0}) ✎</div>
                </td>
                <td>${item.sales_count || 0}</td>
                <td>${statusBadge}</td>
                <td>${sortVal}</td>
                <td>
                    <div style="display:flex;gap:6px;flex-wrap:wrap;">
                        <button class="btn btn-secondary" style="height:28px;padding:0 8px;font-size:12px;" onclick="window.editServiceItem(${item.id})">编辑</button>
                        <button class="btn btn-secondary" style="height:28px;padding:0 8px;font-size:12px;" onclick="window.openSpecManageModal(${item.id}, '${escapeHtml(item.title)}')">规格</button>
                        <button class="btn" style="height:28px;padding:0 8px;font-size:12px;background:${isUp ? '#64748b' : '#10b981'};color:#fff;" onclick="window.toggleServiceItemStatus(${item.id}, '${isUp ? 'inactive' : 'active'}')">${isUp ? '下架' : '上架'}</button>
                        <button class="btn btn-danger" style="height:28px;padding:0 8px;font-size:12px;background:#ef4444;color:#fff;" onclick="window.deleteServiceItem(${item.id})">删除</button>
                    </div>
                </td>
            </tr>`;
        });

        tableBox.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr><th>封面</th><th>服务名称</th><th>所属品类/业务</th><th>起步价/规格</th><th>已销</th><th>状态</th><th>排序</th><th>操作</th></tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        `;
    }

    /**
     * 渲染品类列表
     */
    async function renderCategoriesList() {
        const box = document.getElementById('services-subview-content');
        if (!box) return;

        box.innerHTML = '<div id="services-cats-table-box">加载品类中...</div>';
        const cats = await loadCategoryOptions();

        if (cats.length === 0) {
            document.getElementById('services-cats-table-box').innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;">暂无服务品类</div>';
            return;
        }

        let rows = '';
        cats.forEach(c => {
            const bizBadge = c.biz_type === 'errand'
                ? '<span class="badge" style="background:#e0f2fe;color:#0369a1;">跑腿业务</span>'
                : '<span class="badge" style="background:#fef3c7;color:#92400e;">生活服务</span>';
            const statusBadge = c.status === 'active'
                ? '<span class="badge" style="background:#dcfce7;color:#15803d;">启用</span>'
                : '<span class="badge" style="background:#f1f5f9;color:#64748b;">禁用</span>';

            rows += `<tr>
                <td style="font-weight:700;">#${c.id}</td>
                <td><span style="font-size:20px;">${escapeHtml(c.icon || '🛠️')}</span></td>
                <td><strong style="font-size:14px;color:#0f172a;">${escapeHtml(c.name)}</strong></td>
                <td>${bizBadge}</td>
                <td>${c.sort_order || 0}</td>
                <td>${statusBadge}</td>
                <td>
                    <div style="display:flex;gap:6px;">
                        <button class="btn btn-secondary" style="height:28px;padding:0 8px;font-size:12px;" onclick="window.editServiceCategory(${c.id})">编辑</button>
                        <button class="btn btn-danger" style="height:28px;padding:0 8px;font-size:12px;background:#ef4444;color:#fff;" onclick="window.deleteServiceCategory(${c.id})">删除</button>
                    </div>
                </td>
            </tr>`;
        });

        document.getElementById('services-cats-table-box').innerHTML = `
            <table class="data-table">
                <thead>
                    <tr><th>ID</th><th>图标</th><th>品类名称</th><th>业务模式</th><th>排序</th><th>状态</th><th>操作</th></tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        `;
    }

    /**
     * 新增/编辑服务项目弹窗
     */
    async function openItemModal(itemId = 0) {
        let item = {
            id: 0,
            category_id: cachedCategories[0]?.id || 0,
            biz_type: 'service',
            title: '',
            sub_title: '',
            cover_image: '',
            price: 0,
            base_price: 0,
            original_price: 0,
            price_unit: '次',
            unit: '次',
            service_duration: 60,
            guarantee_tags: '',
            is_hot: 0,
            sort: 0,
            sort_order: 0,
            status: 1,
            notice_tips: '',
            instructions: '',
            content_detail: '',
            content: '',
            specs: []
        };

        if (itemId > 0) {
            const res = await api.get(`/admin/service/getItem?id=${itemId}`);
            if (res && res.code === 200 && res.data) {
                item = res.data;
            } else {
                SysUI.toast('获取服务项目详情失败', 'error');
                return;
            }
        }

        const priceVal = item.price !== undefined ? item.price : (item.base_price || 0);
        const opriceVal = item.original_price || 0;
        const unitVal = item.price_unit || item.unit || '次';
        const sortVal = item.sort !== undefined ? item.sort : (item.sort_order || 0);
        const isUp = (item.status == 1 || item.status === 'active' || item.status === undefined);

        const modalHtml = `
            <div id="service-item-modal" class="modal-overlay" style="display:flex;align-items:center;justify-content:center;z-index:1150;">
                <div class="modal-card" style="width:780px;max-width:95vw;max-height:90vh;display:flex;flex-direction:column;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 25px 30px -5px rgba(0,0,0,0.15);">
                    <div class="modal-header" style="padding:16px 22px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;background:#f8fafc;">
                        <h3 style="margin:0;font-size:16px;font-weight:700;color:#0f172a;">${itemId > 0 ? '🛠️ 编辑服务项目' : '✨ 新增服务项目'}</h3>
                        <span class="modal-close-btn" style="cursor:pointer;font-size:20px;color:#64748b;" onclick="document.getElementById('service-item-modal').remove()">✕</span>
                    </div>
                    <div class="modal-body" style="padding:22px;overflow-y:auto;flex:1;">
                        <form id="service-item-form">
                            <div style="display:grid;grid-template-columns:1.2fr 1fr;gap:14px;margin-bottom:14px;">
                                <div>
                                    <label class="form-label" style="display:block;margin-bottom:6px;font-weight:600;font-size:13px;color:#334155;">服务名称 <span style="color:#ef4444;">*</span></label>
                                    <input type="text" class="form-control" id="f-item-title" value="${escapeHtml(item.title)}" placeholder="例：狗狗专属户外散步遛弯服务 / 油烟机全拆深度高温蒸洗" required>
                                </div>
                                <div>
                                    <label class="form-label" style="display:block;margin-bottom:6px;font-weight:600;font-size:13px;color:#334155;">所属品类 <span style="color:#ef4444;">*</span></label>
                                    <select class="form-control" id="f-item-cat">
                                        ${cachedCategories.map(c => `<option value="${c.id}" ${item.category_id == c.id ? 'selected' : ''}>${escapeHtml(c.name)} (${c.biz_type === 'errand' ? '跑腿' : '生活'})</option>`).join('')}
                                    </select>
                                </div>
                            </div>

                            <div style="display:grid;grid-template-columns:1.2fr 1fr;gap:14px;margin-bottom:14px;">
                                <div>
                                    <label class="form-label" style="display:block;margin-bottom:6px;font-weight:600;font-size:13px;color:#334155;">副标题 / 核心卖点简述</label>
                                    <input type="text" class="form-control" id="f-item-subtitle" value="${escapeHtml(item.sub_title)}" placeholder="例：专业佩戴牵引绳 · 户外散步30-60分钟 · GPS轨迹打卡">
                                </div>
                                <div>
                                    <label class="form-label" style="display:block;margin-bottom:6px;font-weight:600;font-size:13px;color:#334155;">业务模式</label>
                                    <select class="form-control" id="f-item-biz">
                                        <option value="service" ${item.biz_type === 'service' ? 'selected' : ''}>同城生活服务 (上门作业/师傅派单)</option>
                                        <option value="errand" ${item.biz_type === 'errand' ? 'selected' : ''}>同城跑腿 (帮买帮送/即时配送)</option>
                                    </select>
                                </div>
                            </div>

                            <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;margin-bottom:14px;">
                                <div>
                                    <label class="form-label" style="display:block;margin-bottom:6px;font-weight:600;font-size:13px;color:#334155;">起步基准价 (¥) <span style="color:#ef4444;">*</span></label>
                                    <input type="number" step="0.01" class="form-control" id="f-item-price" value="${priceVal}" required style="color:#ea580c;font-weight:bold;">
                                </div>
                                <div>
                                    <label class="form-label" style="display:block;margin-bottom:6px;font-weight:600;font-size:13px;color:#334155;">划线原价 (¥)</label>
                                    <input type="number" step="0.01" class="form-control" id="f-item-oprice" value="${opriceVal}">
                                </div>
                                <div>
                                    <label class="form-label" style="display:block;margin-bottom:6px;font-weight:600;font-size:13px;color:#334155;">计价单位</label>
                                    <input type="text" class="form-control" id="f-item-unit" value="${escapeHtml(unitVal)}" placeholder="次、台、小时、套">
                                </div>
                                <div>
                                    <label class="form-label" style="display:block;margin-bottom:6px;font-weight:600;font-size:13px;color:#334155;">预计时长(分钟)</label>
                                    <input type="number" class="form-control" id="f-item-duration" value="${item.service_duration || 60}">
                                </div>
                            </div>

                            <div style="margin-bottom:14px;">
                                <label class="form-label" style="display:block;margin-bottom:6px;font-weight:600;font-size:13px;color:#334155;">封面图 URL (支持矢量SVG与常规图片)</label>
                                <div style="display:flex;gap:8px;">
                                    <input type="text" class="form-control" id="f-item-cover" value="${escapeHtml(item.cover_image)}" placeholder="/uploads/default/... 或 http://...">
                                    <button type="button" class="btn btn-secondary" id="btn-pick-cover">图库选择</button>
                                </div>
                            </div>

                            <div style="margin-bottom:14px;">
                                <label class="form-label" style="display:block;margin-bottom:6px;font-weight:600;font-size:13px;color:#334155;">服务保障标签 (英文逗号分隔)</label>
                                <input type="text" class="form-control" id="f-item-tags" value="${escapeHtml(item.guarantee_tags || '')}" placeholder="例：持证宠托师,GPS轨迹打卡,安全防暴冲,爱宠意外险">
                            </div>

                            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:14px;">
                                <div>
                                    <label class="form-label" style="display:block;margin-bottom:6px;font-weight:600;font-size:13px;color:#334155;">排序权重 (越大越靠前)</label>
                                    <input type="number" class="form-control" id="f-item-sort" value="${sortVal}">
                                </div>
                                <div>
                                    <label class="form-label" style="display:block;margin-bottom:6px;font-weight:600;font-size:13px;color:#334155;">是否推荐至首页爆款</label>
                                    <select class="form-control" id="f-item-hot">
                                        <option value="0" ${item.is_hot ? '' : 'selected'}>普通展示</option>
                                        <option value="1" ${item.is_hot ? 'selected' : ''}>🔥 设为首页精选爆款</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="form-label" style="display:block;margin-bottom:6px;font-weight:600;font-size:13px;color:#334155;">上架销售状态</label>
                                    <select class="form-control" id="f-item-status">
                                        <option value="1" ${isUp ? 'selected' : ''}>上架销售中</option>
                                        <option value="0" ${!isUp ? 'selected' : ''}>下架暂不接单</option>
                                    </select>
                                </div>
                            </div>

                            <div style="margin-bottom:14px;">
                                <label class="form-label" style="display:block;margin-bottom:6px;font-weight:600;font-size:13px;color:#334155;">预约须知 / 客户准备提醒</label>
                                <textarea class="form-control" id="f-item-tips" style="height:65px;" placeholder="例：请自备牵引绳、拾便袋；如有护食、攻击倾向请提前告知并备好安全嘴套。">${escapeHtml(item.notice_tips || item.instructions || '')}</textarea>
                            </div>

                            <div style="margin-bottom:14px;">
                                <label class="form-label" style="display:block;margin-bottom:6px;font-weight:600;font-size:13px;color:#334155;">服务详细说明 / 作业标准 (支持HTML富文本)</label>
                                <textarea class="form-control" id="f-item-content" style="height:80px;" placeholder="详细描述服务包含工具、作业标准规范、验收流程等">${escapeHtml(item.content_detail || item.content || '')}</textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer" style="padding:14px 22px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:10px;background:#f8fafc;">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('service-item-modal').remove()">取消</button>
                        <button type="button" class="btn btn-primary" id="btn-save-service-item" style="background:#1e58ff;border-color:#1e58ff;">保存项目信息</button>
                    </div>
                </div>
            </div>
        `;

        const existingModal = document.getElementById('service-item-modal');
        if (existingModal) existingModal.remove();
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // 绑定图库选择
        document.getElementById('btn-pick-cover')?.addEventListener('click', () => {
            if (typeof window.openMediaLibrary === 'function') {
                window.openMediaLibrary(url => {
                    const input = document.getElementById('f-item-cover');
                    if (input) input.value = url;
                });
            } else {
                SysUI.toast('可直接粘贴图片或 SVG 矢量图相对地址', 'info');
            }
        });

        // 提交表单保存
        document.getElementById('btn-save-service-item')?.addEventListener('click', async () => {
            const title = document.getElementById('f-item-title')?.value.trim();
            if (!title) {
                SysUI.toast('请输入服务名称', 'warning');
                return;
            }

            const pVal = parseFloat(document.getElementById('f-item-price')?.value || 0);
            const opVal = parseFloat(document.getElementById('f-item-oprice')?.value || 0);
            const uVal = document.getElementById('f-item-unit')?.value.trim() || '次';
            const sVal = parseInt(document.getElementById('f-item-sort')?.value || 0);
            const stVal = parseInt(document.getElementById('f-item-status')?.value || 1);
            const tipsVal = document.getElementById('f-item-tips')?.value.trim() || '';
            const contentVal = document.getElementById('f-item-content')?.value.trim() || '';

            const payload = {
                id: itemId,
                category_id: parseInt(document.getElementById('f-item-cat')?.value || 0),
                biz_type: document.getElementById('f-item-biz')?.value || 'service',
                title: title,
                sub_title: document.getElementById('f-item-subtitle')?.value.trim() || '',
                cover_image: document.getElementById('f-item-cover')?.value.trim() || '',
                price: pVal,
                original_price: opVal,
                price_unit: uVal,
                service_duration: parseInt(document.getElementById('f-item-duration')?.value || 60),
                guarantee_tags: document.getElementById('f-item-tags')?.value.trim() || '',
                sort: sVal,
                is_hot: parseInt(document.getElementById('f-item-hot')?.value || 0),
                status: stVal,
                notice_tips: tipsVal,
                content_detail: contentVal,
                // 别名冗余兼容
                base_price: pVal,
                unit: uVal,
                sort_order: sVal,
                instructions: tipsVal,
                content: contentVal
            };

            const res = await api.post('/admin/service/saveItem', payload);
            if (res && res.code === 200) {
                SysUI.toast('服务项目保存成功！', 'success');
                document.getElementById('service-item-modal')?.remove();
                loadItemsData();
            } else {
                SysUI.toast(res ? res.msg : '保存失败', 'error');
            }
        });
    }

    /**
     * 服务规格管理弹窗 (Dynamic Specs)
     */
    async function openSpecManageModal(itemId, itemTitle) {
        // 请求后台规格列表 (精准使用 service_id 与 item_id 双参互通)
        const res = await api.get(`/admin/service/specList?service_id=${itemId}&item_id=${itemId}`);
        let specs = (res && res.code === 200 && Array.isArray(res.data)) ? res.data : [];

        function renderSpecRows() {
            if (specs.length === 0) {
                return '<tr><td colspan="6" style="text-align:center;padding:28px;color:#94a3b8;font-size:13px;">暂未配置规格，点击右上角“+ 添加规格行”维护服务多规格与阶梯价格</td></tr>';
            }
            return specs.map((s, idx) => {
                const spPrice = (s.spec_price !== undefined) ? s.spec_price : (s.price !== undefined ? s.price : 0);
                const spUnit = s.spec_unit || s.unit || '次';
                const spDesc = s.spec_desc || s.desc || '';
                const isDef = (s.is_default == 1 || s.is_default === true);

                return `
                <tr data-idx="${idx}">
                    <td>
                        <input type="text" class="form-control spec-input-name" value="${escapeHtml(s.spec_name)}" placeholder="规格名，如: 小型犬遛狗 (散步30分钟)" style="font-size:13px;" required>
                    </td>
                    <td style="width:130px;">
                        <div style="display:flex;align-items:center;">
                            <span style="font-size:12px;color:#64748b;margin-right:4px;">¥</span>
                            <input type="number" step="0.01" class="form-control spec-input-price" value="${spPrice}" style="font-size:13px;color:#ea580c;font-weight:bold;">
                        </div>
                    </td>
                    <td style="width:90px;">
                        <input type="text" class="form-control spec-input-unit" value="${escapeHtml(spUnit)}" placeholder="次/台/小时" style="font-size:12px;">
                    </td>
                    <td>
                        <input type="text" class="form-control spec-input-desc" value="${escapeHtml(spDesc)}" placeholder="规格适用说明，如: 适合10kg以内小型犬" style="font-size:12px;">
                    </td>
                    <td style="width:80px;text-align:center;">
                        <input type="radio" name="spec-default-radio" class="spec-radio-default" ${isDef ? 'checked' : ''} onchange="window.onSpecDefaultChange(${idx})">
                    </td>
                    <td style="width:60px;text-align:center;">
                        <button type="button" class="btn btn-danger" style="height:26px;padding:0 8px;font-size:12px;" onclick="window.removeSpecRow(${idx})">✕</button>
                    </td>
                </tr>
            `;
            }).join('');
        }

        const modalHtml = `
            <div id="service-spec-modal" class="modal-overlay" style="display:flex;align-items:center;justify-content:center;z-index:1150;">
                <div class="modal-card" style="width:840px;max-width:95vw;max-height:85vh;display:flex;flex-direction:column;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 25px 30px -5px rgba(0,0,0,0.15);">
                    <div class="modal-header" style="padding:16px 22px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;background:#f8fafc;">
                        <div>
                            <h3 style="margin:0;font-size:16px;font-weight:700;color:#0f172a;">维护服务多规格阶梯与价格</h3>
                            <div style="font-size:12px;color:#64748b;margin-top:2px;">所属服务项目：<strong style="color:#0284c7;">${escapeHtml(itemTitle)}</strong></div>
                        </div>
                        <span class="modal-close-btn" style="cursor:pointer;font-size:20px;color:#64748b;" onclick="document.getElementById('service-spec-modal').remove()">✕</span>
                    </div>
                    <div class="modal-body" style="padding:22px;overflow-y:auto;flex:1;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                            <span style="font-size:13px;color:#475569;">支持针对面积、数量、宠物体型、服务时长等配置多规格与独立定价：</span>
                            <button type="button" class="btn btn-secondary" id="btn-add-spec-row" style="font-size:12px;padding:5px 14px;font-weight:600;">+ 添加规格行</button>
                        </div>
                        <table class="data-table" style="width:100%;">
                            <thead>
                                <tr>
                                    <th>规格名称 / 型号 <span style="color:#ef4444;">*</span></th>
                                    <th>销售价格(¥) <span style="color:#ef4444;">*</span></th>
                                    <th>单位</th>
                                    <th>规格说明 / 适用范围</th>
                                    <th style="text-align:center;">默认选中</th>
                                    <th style="text-align:center;">删除</th>
                                </tr>
                            </thead>
                            <tbody id="spec-table-body">
                                ${renderSpecRows()}
                            </tbody>
                        </table>
                    </div>
                    <div class="modal-footer" style="padding:14px 22px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:10px;background:#f8fafc;">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('service-spec-modal').remove()">关闭</button>
                        <button type="button" class="btn btn-primary" id="btn-save-specs-all" style="background:#1e58ff;border-color:#1e58ff;">保存规格列表</button>
                    </div>
                </div>
            </div>
        `;

        const oldModal = document.getElementById('service-spec-modal');
        if (oldModal) oldModal.remove();
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        window.removeSpecRow = function (idx) {
            collectCurrentSpecs();
            specs.splice(idx, 1);
            if (specs.length > 0 && !specs.some(s => s.is_default)) {
                specs[0].is_default = 1;
            }
            document.getElementById('spec-table-body').innerHTML = renderSpecRows();
        };

        window.onSpecDefaultChange = function (idx) {
            specs.forEach((s, i) => s.is_default = (i === idx ? 1 : 0));
        };

        function collectCurrentSpecs() {
            const trs = document.querySelectorAll('#spec-table-body tr[data-idx]');
            trs.forEach(tr => {
                const i = parseInt(tr.getAttribute('data-idx'));
                if (specs[i]) {
                    const nameVal = tr.querySelector('.spec-input-name')?.value.trim() || '';
                    const priceVal = parseFloat(tr.querySelector('.spec-input-price')?.value || 0);
                    const unitVal = tr.querySelector('.spec-input-unit')?.value.trim() || '次';
                    const descVal = tr.querySelector('.spec-input-desc')?.value.trim() || '';

                    specs[i].spec_name = nameVal;
                    specs[i].spec_price = priceVal;
                    specs[i].price = priceVal;
                    specs[i].spec_unit = unitVal;
                    specs[i].unit = unitVal;
                    specs[i].spec_desc = descVal;
                    specs[i].desc = descVal;
                    specs[i].sort = (specs.length - i) * 10;
                }
            });
        }

        document.getElementById('btn-add-spec-row')?.addEventListener('click', () => {
            collectCurrentSpecs();
            specs.push({
                id: 0,
                spec_name: '',
                spec_price: 0,
                price: 0,
                spec_unit: '次',
                unit: '次',
                spec_desc: '',
                desc: '',
                sort: 10,
                is_default: specs.length === 0 ? 1 : 0
            });
            document.getElementById('spec-table-body').innerHTML = renderSpecRows();
        });

        document.getElementById('btn-save-specs-all')?.addEventListener('click', async () => {
            collectCurrentSpecs();
            const validSpecs = specs.filter(s => s.spec_name.length > 0);
            if (validSpecs.length === 0) {
                SysUI.toast('请至少保留一个有效规格名称', 'warning');
                return;
            }

            // 确保至少有一个默认选中规格
            if (!validSpecs.some(s => s.is_default)) {
                validSpecs[0].is_default = 1;
            }

            const res = await api.post('/admin/service/syncSpecs', {
                service_id: itemId,
                item_id: itemId,
                specs: validSpecs
            });

            if (res && res.code === 200) {
                SysUI.toast('规格更新成功！', 'success');
                document.getElementById('service-spec-modal')?.remove();
                loadItemsData();
            } else {
                SysUI.toast(res ? res.msg : '保存规格失败', 'error');
            }
        });
    }

    /**
     * 新增/编辑品类弹窗
     */
    function openCategoryModal(catId = 0) {
        const cat = cachedCategories.find(c => c.id == catId) || {
            id: 0,
            name: '',
            biz_type: 'service',
            icon: '🛠️',
            sort: 0,
            sort_order: 0,
            is_show: 1,
            status: 'active'
        };

        const sortVal = cat.sort !== undefined ? cat.sort : (cat.sort_order || 0);
        const isUp = (cat.is_show == 1 || cat.status === 'active' || cat.status === undefined);

        const modalHtml = `
            <div id="service-cat-modal" class="modal-overlay" style="display:flex;align-items:center;justify-content:center;z-index:1150;">
                <div class="modal-card" style="width:520px;max-width:92vw;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 25px 30px -5px rgba(0,0,0,0.15);">
                    <div class="modal-header" style="padding:16px 20px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;background:#f8fafc;">
                        <h3 style="margin:0;font-size:16px;font-weight:700;color:#0f172a;">${catId > 0 ? '📂 编辑服务品类' : '✨ 新增服务品类'}</h3>
                        <span class="modal-close-btn" style="cursor:pointer;font-size:20px;color:#64748b;" onclick="document.getElementById('service-cat-modal').remove()">✕</span>
                    </div>
                    <div class="modal-body" style="padding:22px;">
                        <div style="margin-bottom:14px;">
                            <label class="form-label" style="display:block;margin-bottom:6px;font-weight:600;font-size:13px;color:#334155;">品类名称 <span style="color:#ef4444;">*</span></label>
                            <input type="text" class="form-control" id="f-cat-name" value="${escapeHtml(cat.name)}" placeholder="例：上门伴宠与看护、家政保洁与家电清洗、家庭快修" required>
                        </div>
                        <div style="margin-bottom:14px;">
                            <label class="form-label" style="display:block;margin-bottom:6px;font-weight:600;font-size:13px;color:#334155;">品类 Emoji 图标 / 图标字符</label>
                            <input type="text" class="form-control" id="f-cat-icon" value="${escapeHtml(cat.icon || '🛠️')}" placeholder="例：🐕、🧹、🛠️、🏃、❄️">
                        </div>
                        <div style="margin-bottom:14px;">
                            <label class="form-label" style="display:block;margin-bottom:6px;font-weight:600;font-size:13px;color:#334155;">所属业务模式</label>
                            <select class="form-control" id="f-cat-biz">
                                <option value="service" ${cat.biz_type === 'service' ? 'selected' : ''}>同城生活服务 (保洁/维修/清洗/遛狗/搬运)</option>
                                <option value="errand" ${cat.biz_type === 'errand' ? 'selected' : ''}>帮办跑腿 (代买/代送/代排队)</option>
                            </select>
                        </div>
                        <div style="margin-bottom:14px;">
                            <label class="form-label" style="display:block;margin-bottom:6px;font-weight:600;font-size:13px;color:#334155;">排序权重 (越大越靠前)</label>
                            <input type="number" class="form-control" id="f-cat-sort" value="${sortVal}">
                        </div>
                        <div style="margin-bottom:14px;">
                            <label class="form-label" style="display:block;margin-bottom:6px;font-weight:600;font-size:13px;color:#334155;">状态</label>
                            <select class="form-control" id="f-cat-status">
                                <option value="1" ${isUp ? 'selected' : ''}>正常启用</option>
                                <option value="0" ${!isUp ? 'selected' : ''}>暂停禁用</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer" style="padding:14px 20px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:10px;background:#f8fafc;">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('service-cat-modal').remove()">取消</button>
                        <button type="button" class="btn btn-primary" id="btn-save-service-cat" style="background:#1e58ff;border-color:#1e58ff;">保存品类</button>
                    </div>
                </div>
            </div>
        `;

        const oldModal = document.getElementById('service-cat-modal');
        if (oldModal) oldModal.remove();
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        document.getElementById('btn-save-service-cat')?.addEventListener('click', async () => {
            const name = document.getElementById('f-cat-name')?.value.trim();
            if (!name) {
                SysUI.toast('请输入品类名称', 'warning');
                return;
            }

            const sVal = parseInt(document.getElementById('f-cat-sort')?.value || 0);
            const stVal = parseInt(document.getElementById('f-cat-status')?.value || 1);

            const payload = {
                id: catId,
                name: name,
                icon: document.getElementById('f-cat-icon')?.value.trim() || '🛠️',
                biz_type: document.getElementById('f-cat-biz')?.value || 'service',
                sort: sVal,
                sort_order: sVal,
                is_show: stVal,
                status: stVal === 1 ? 'active' : 'inactive'
            };

            const res = await api.post('/admin/service/saveCategory', payload);
            if (res && res.code === 200) {
                SysUI.toast('品类保存成功！', 'success');
                document.getElementById('service-cat-modal')?.remove();
                await loadCategoryOptions();
                renderCategoriesList();
            } else {
                SysUI.toast(res ? res.msg : '保存品类失败', 'error');
            }
        });
    }

    /**
     * 渲染生活服务在线预约表单字段管理器
     */
    async function renderBookingFieldsManager() {
        const box = document.getElementById('services-subview-content');
        if (!box) return;

        box.innerHTML = '<div style="text-align:center;padding:30px;color:#64748b;">正在加载预约表单配置...</div>';

        const res = await api.get('/admin/service/getBookingFields');
        localBookingFields = (res && res.code === 200 && Array.isArray(res.data)) ? res.data : [];

        function renderRows() {
            if (localBookingFields.length === 0) {
                return '<tr><td colspan="8" style="text-align:center;padding:30px;color:#94a3b8;">暂未配置专属预约表单字段，点击右上角【+ 添加预约表单字段】开始配置</td></tr>';
            }

            return localBookingFields.map((f, idx) => {
                const optsStr = Array.isArray(f.options) ? f.options.join(', ') : (f.options || '');
                const catType = f.category_type || 'common';
                const isReq = parseInt(f.required || 0) === 1;

                return `
                    <tr data-idx="${idx}" style="border-bottom:1px solid #f1f5f9;">
                        <td style="padding:10px;">
                            <input type="text" class="form-control bf-input-label" value="${escapeHtml(f.label)}" placeholder="如: 故障现象简述" style="font-size:13px;font-weight:600;" required>
                        </td>
                        <td style="padding:10px;width:150px;">
                            <input type="text" class="form-control bf-input-key" value="${escapeHtml(f.key)}" placeholder="如: fault_desc" style="font-size:12px;font-family:monospace;" required>
                        </td>
                        <td style="padding:10px;width:130px;">
                            <select class="form-control bf-select-type" style="font-size:12px;">
                                <option value="text" ${f.type === 'text' ? 'selected' : ''}>文本输入</option>
                                <option value="number" ${f.type === 'number' ? 'selected' : ''}>数字输入</option>
                                <option value="radio" ${f.type === 'radio' ? 'selected' : ''}>单选按钮组</option>
                                <option value="select" ${f.type === 'select' ? 'selected' : ''}>下拉选择框</option>
                                <option value="switch" ${f.type === 'switch' ? 'selected' : ''}>是否开关</option>
                            </select>
                        </td>
                        <td style="padding:10px;width:160px;">
                            <select class="form-control bf-select-cattype" style="font-size:12px;font-weight:600;color:#0369a1;">
                                <option value="common" ${catType === 'common' ? 'selected' : ''}>🌐 通用 (所有服务)</option>
                                <option value="pet" ${catType === 'pet' ? 'selected' : ''}>🐕 仅上门伴宠服务</option>
                                <option value="cleaning" ${catType === 'cleaning' ? 'selected' : ''}>🧹 仅家政保洁清洗</option>
                                <option value="repair" ${catType === 'repair' ? 'selected' : ''}>🛠️ 仅家庭维修快修</option>
                                <option value="cleaning_or_repair" ${catType === 'cleaning_or_repair' ? 'selected' : ''}>🧹+🛠️ 保洁与维修展示</option>
                            </select>
                        </td>
                        <td style="padding:10px;">
                            <input type="text" class="form-control bf-input-options" value="${escapeHtml(optsStr)}" placeholder="供单选/下拉使用，逗号分隔，如: 师傅代买配件, 用户自备配件" style="font-size:12px;">
                        </td>
                        <td style="padding:10px;width:160px;">
                            <input type="text" class="form-control bf-input-placeholder" value="${escapeHtml(f.placeholder || '')}" placeholder="输入框默认提示" style="font-size:12px;">
                        </td>
                        <td style="padding:10px;width:60px;text-align:center;">
                            <input type="checkbox" class="bf-check-required" ${isReq ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer;">
                        </td>
                        <td style="padding:10px;width:60px;text-align:center;">
                            <button type="button" class="btn btn-danger" style="height:26px;padding:0 8px;font-size:12px;" onclick="window.removeBookingFieldRow(${idx})">✕</button>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        box.innerHTML = `
            <div>
                <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px 16px;margin-bottom:16px;font-size:13px;line-height:1.7;color:#1e40af;">
                    💡 <strong>在线预约表单定制说明：</strong><br>
                    客户在前台点击“立即预约”时，弹窗除联系人、电话、地址与期望上门时间外，还会根据所选服务业务展示下述专属字段（如故障描述、配件提供方式、门禁说明）。<br>
                    <strong>如不需要某项提问（例如已淘汰的“工具准备方式”），直接点击右侧红色的“✕”删除并保存，前台将彻底不再展示！</strong>
                </div>

                <table class="data-table" style="width:100%;background:#fff;border-radius:8px;overflow:hidden;">
                    <thead>
                        <tr>
                            <th>字段显示名称 (Label) <span style="color:#ef4444;">*</span></th>
                            <th>英文标识 (Key) <span style="color:#ef4444;">*</span></th>
                            <th>控件类型</th>
                            <th>适用业务范围</th>
                            <th>单选/下拉选项 (英文逗号分隔)</th>
                            <th>占位提示语 (Placeholder)</th>
                            <th style="text-align:center;">必填</th>
                            <th style="text-align:center;">删除</th>
                        </tr>
                    </thead>
                    <tbody id="booking-fields-table-body">
                        ${renderRows()}
                    </tbody>
                </table>

                <div style="margin-top:16px;display:flex;justify-content:space-between;align-items:center;background:#f8fafc;padding:14px 18px;border-radius:10px;border:1px solid #e2e8f0;">
                    <div style="font-size:12px;color:#64748b;">支持自由增删字段与调整提示文案，保存后小程序与PC端立即同步生效。</div>
                    <button type="button" class="btn btn-primary" id="btn-save-booking-fields-all" style="height:38px;padding:0 24px;font-weight:700;background:#1e58ff;">
                        保存全部预约表单字段
                    </button>
                </div>
            </div>
        `;

        function collectRows() {
            const trs = document.querySelectorAll('#booking-fields-table-body tr[data-idx]');
            trs.forEach(tr => {
                const i = parseInt(tr.getAttribute('data-idx'));
                if (localBookingFields[i]) {
                    localBookingFields[i].label = tr.querySelector('.bf-input-label')?.value.trim() || '';
                    localBookingFields[i].key = tr.querySelector('.bf-input-key')?.value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_') || '';
                    localBookingFields[i].type = tr.querySelector('.bf-select-type')?.value || 'text';
                    localBookingFields[i].category_type = tr.querySelector('.bf-select-cattype')?.value || 'common';
                    const rawOpts = tr.querySelector('.bf-input-options')?.value || '';
                    localBookingFields[i].options = rawOpts.split(/[,，]/).map(s => s.trim()).filter(Boolean);
                    localBookingFields[i].placeholder = tr.querySelector('.bf-input-placeholder')?.value.trim() || '';
                    localBookingFields[i].required = tr.querySelector('.bf-check-required')?.checked ? 1 : 0;
                }
            });
        }

        window.removeBookingFieldRow = function (idx) {
            collectRows();
            localBookingFields.splice(idx, 1);
            document.getElementById('booking-fields-table-body').innerHTML = renderRows();
        };

        document.getElementById('btn-add-booking-field')?.addEventListener('click', () => {
            collectRows();
            localBookingFields.push({
                label: '',
                key: 'field_' + Math.floor(Math.random() * 900 + 100),
                type: 'text',
                category_type: 'common',
                options: [],
                placeholder: '',
                required: 0
            });
            document.getElementById('booking-fields-table-body').innerHTML = renderRows();
        });

        document.getElementById('btn-save-booking-fields-all')?.addEventListener('click', async () => {
            collectRows();
            for (let i = 0; i < localBookingFields.length; i++) {
                const f = localBookingFields[i];
                if (!f.label || !f.key) {
                    SysUI.toast(`第 ${i + 1} 项表单字段的显示名称与英文Key不能为空`, 'warning');
                    return;
                }
            }

            const res = await api.post('/admin/service/saveBookingFields', {
                custom_fields: localBookingFields
            });

            if (res && res.code === 200) {
                SysUI.toast('预约表单字段已成功保存并立即生效！', 'success');
                renderBookingFieldsManager();
            } else {
                SysUI.toast(res ? res.msg : '保存表单字段失败', 'error');
            }
        });
    }

    // 全局挂载动作
    window.renderServicesView = renderServicesView;
    window.editServiceItem = id => openItemModal(id);
    window.openSpecManageModal = (id, title) => openSpecManageModal(id, title);
    window.editServiceCategory = id => openCategoryModal(id);

    window.toggleServiceItemStatus = async function (id, targetStatus) {
        const res = await api.post('/admin/service/updateStatus', { id, status: targetStatus });
        if (res && res.code === 200) {
            SysUI.toast(`服务项目已成功${targetStatus === 'active' ? '上架' : '下架'}`, 'success');
            loadItemsData();
        } else {
            SysUI.toast(res ? res.msg : '操作失败', 'error');
        }
    };

    window.deleteServiceItem = async function (id) {
        const ok = await SysUI.confirm('确定要删除该服务项目吗？此操作不可撤销。', {
            title: '删除服务确认',
            type: 'danger',
            confirmText: '确认删除',
            isDanger: true
        });
        if (ok) {
            const res = await api.post('/admin/service/deleteItem', { id });
            if (res && res.code === 200) {
                SysUI.toast('服务项目已成功删除', 'success');
                loadItemsData();
            } else {
                SysUI.toast(res ? res.msg : '删除失败', 'error');
            }
        }
    };

    window.deleteServiceCategory = async function (id) {
        const ok = await SysUI.confirm('删除品类将级联检查该品类下的服务项目，确定继续吗？', {
            title: '删除品类确认',
            type: 'danger',
            confirmText: '确认删除',
            isDanger: true
        });
        if (ok) {
            const res = await api.post('/admin/service/deleteCategory', { id });
            if (res && res.code === 200) {
                SysUI.toast('品类已删除', 'success');
                await loadCategoryOptions();
                renderCategoriesList();
            } else {
                SysUI.toast(res ? res.msg : '删除品类失败', 'error');
            }
        }
    };

})(window);
