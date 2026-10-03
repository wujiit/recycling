/**
 * 启灵回收系统 - 回收品类与商品库视图
 * 职责：各行业品类归属管理、商品价格阶梯维护、参考图例配置、品牌字典管理
 * 编码：UTF-8 无 BOM
 */
(function (window) {
    'use strict';

    const SysUI = window.SysUI;
    const api = window.adminApi || window.api;
    const state = window.adminState || window.state;
    const escapeHtml = window.escapeHtml || function(s) { return s; };

    function reloadDevices() {
        if (typeof window.loadTabContent === 'function') {
            window.loadTabContent('devices');
        } else {
            const box = document.getElementById('tab-content');
            if (box && typeof window.renderDevicesView === 'function') {
                window.renderDevicesView(box);
            }
        }
    }
    async function renderDevicesView(container) {
        container.innerHTML = `
            <div class="card">
                <div class="toolbar" style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;">
                    <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;">
                        <input type="text" class="form-control" id="device-kw" placeholder="搜索商品或品类" style="width:200px;">
                        <select class="form-control" id="device-cat-filter" style="width:150px;">
                            <option value="0">全部分类</option>
                            ${state.categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
                        </select>
                        <select class="form-control" id="device-brand-filter" style="width:140px;">
                            <option value="0">全部品牌</option>
                            ${state.brands.map(b => `<option value="${b.id}">${escapeHtml(b.name)}</option>`).join('')}
                        </select>
                        <button class="btn btn-primary" id="btn-device-search">搜索</button>
                    </div>
                    <div style="display:flex;gap:10px;">
                        <button class="btn btn-success" id="btn-add-device" style="background:#10b981;color:#fff;">新增商品</button>
                        <button class="btn btn-primary" id="btn-category-manage" style="background:#1e58ff;color:#fff;">品类管理</button>
                        <button class="btn btn-secondary" id="btn-brand-manage">品牌管理</button>
                        <button class="btn btn-warning" id="btn-batch-adjust" style="background:#f59e0b;color:#fff;">批量调价</button>
                    </div>
                </div>
                <div id="device-table-box" style="margin-top:16px;">加载商品列表中...</div>
            </div>
        `;

        async function loadDevices() {
            const kw = document.getElementById('device-kw')?.value.trim() || '';
            const catId = document.getElementById('device-cat-filter')?.value || 0;
            const brandId = document.getElementById('device-brand-filter')?.value || 0;

            const res = await api.get(`/admin/device/list&keyword=${encodeURIComponent(kw)}&category_id=${catId}&brand_id=${brandId}&status=all&page=1&page_size=50`);
            if (res && res.code === 200) {
                const list = res.data.list || [];
                state.devices = list;

                if (list.length === 0) {
                    document.getElementById('device-table-box').innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;">暂无商品数据，点击右上角【新增商品】</div>';
                    return;
                }

                let rows = '';
                list.forEach(d => {
                    const statusText = Number(d.status) === 1 ? '<span class="badge badge-success">正常开放</span>' : '<span class="badge badge-danger">已下架</span>';
                    const hotText = Number(d.is_hot) === 1 ? '<span class="badge badge-warning">推荐</span>' : '<span class="badge badge-gray">常规</span>';
                    const unit = d.unit || '台';

                    rows += `<tr>
                        <td><img src="${escapeHtml(d.cover_img || '/uploads/default/dev_default.svg')}" class="table-thumb" alt="商品图片" onerror="this.src='/uploads/default/dev_default.svg'"></td>
                        <td><strong>${escapeHtml(d.name)}</strong></td>
                        <td>${escapeHtml(d.category_name || '-')}</td>
                        <td>${escapeHtml(d.brand_name || '-')}</td>
                        <td><strong style="color:#1e58ff;font-size:15px;">¥ ${escapeHtml(d.guide_price)}</strong></td>
                        <td><span class="badge badge-info" style="font-size:12px;">/${escapeHtml(unit)}</span></td>
                        <td>${hotText}</td>
                        <td>${statusText}</td>
                        <td>${d.sort || 0}</td>
                        <td>
                            <div style="display:flex;gap:6px;">
                                <button class="btn btn-secondary" style="height:28px;padding:0 10px;font-size:12px;" onclick="window.openDeviceModal(${d.id})">编辑</button>
                                <button class="btn btn-danger" style="height:28px;padding:0 10px;font-size:12px;background:#ef4444;color:#fff;" onclick="window.deleteDevice(${d.id})">删除</button>
                            </div>
                        </td>
                    </tr>`;
                });

                document.getElementById('device-table-box').innerHTML = `
                    <table class="data-table">
                        <thead>
                            <tr><th style="width:70px;">图片</th><th>商品名称</th><th>所属分类</th><th>品牌</th><th>基础回收价</th><th>单位</th><th>推荐</th><th>状态</th><th>排序</th><th>操作</th></tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                `;
            }
        }

        document.getElementById('btn-device-search')?.addEventListener('click', loadDevices);
        document.getElementById('btn-add-device')?.addEventListener('click', () => window.openDeviceModal(0));
        document.getElementById('btn-category-manage')?.addEventListener('click', () => window.openCategoryManageModal());
        document.getElementById('btn-brand-manage')?.addEventListener('click', () => window.openBrandManageModal());

        document.getElementById('btn-batch-adjust')?.addEventListener('click', async function () {
            const val = await SysUI.prompt('请输入商品批量调整金额 (如输入 50 表示全线上浮50元，输入 -50 表示下调50元):', '50', {
                title: '批量调整基础回收价',
                confirmText: '立即调整'
            });
            if (val !== null && val.trim() !== '') {
                const num = parseFloat(val);
                if (isNaN(num)) {
                    SysUI.toast('请输入合法的数字', 'warning');
                    return;
                }
                const res = await api.post('/admin/device/batchAdjust', { mode: 'amount', value: num });
                if (res && res.code === 200) {
                    SysUI.toast(res.msg, 'success');
                    loadDevices();
                } else {
                    SysUI.toast('调价失败', 'error');
                }
            }
        });

        loadDevices();
    }

    // 新增/编辑商品弹窗
    window.openDeviceModal = function (deviceId) {
        const item = state.devices.find(d => d.id == deviceId) || {
            id: 0,
            name: '',
            category_id: state.categories[0]?.id || 1,
            brand_id: state.brands[0]?.id || 1,
            guide_price: '100.00',
            unit: '台',
            cover_img: '/uploads/default/dev_default.svg',
            sort: 50,
            is_hot: 1,
            status: 1
        };

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-card" style="max-width:620px;">
                <div class="modal-header">
                    <span>${deviceId > 0 ? '编辑商品' : '新增商品'}</span>
                    <span style="cursor:pointer;" onclick="this.closest('.modal-overlay').remove()">✕</span>
                </div>
                <div class="modal-body">
                    <div class="login-form-group">
                        <label>商品名称 (如: 特级光亮紫铜线 / iPhone 15 Pro / 丰田卡罗拉 / 格力空调)</label>
                        <input type="text" id="dev-name" class="form-control" value="${escapeHtml(item.name)}" placeholder="请输入商品名称或型号" required>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                        <div class="login-form-group">
                            <label>所属分类</label>
                            <select id="dev-cat" class="form-control" style="width:100%;">
                                ${state.categories.map(c => `<option value="${c.id}" ${c.id == item.category_id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
                            </select>
                        </div>
                        <div class="login-form-group">
                            <label>所属品牌 / 规格</label>
                            <select id="dev-brand" class="form-control" style="width:100%;">
                                ${state.brands.map(b => `<option value="${b.id}" ${b.id == item.brand_id ? 'selected' : ''}>${escapeHtml(b.name)}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                        <div class="login-form-group">
                            <label>基础回收价 (元)</label>
                            <input type="number" step="0.01" id="dev-price" class="form-control" value="${escapeHtml(item.guide_price)}" placeholder="例如: 68.50">
                        </div>
                        <div class="login-form-group">
                            <label>计价单位 (例如: 台、公斤、吨、万元/辆、元/辆、克、件)</label>
                            <input type="text" id="dev-unit" class="form-control" value="${escapeHtml(item.unit || '台')}" placeholder="台 / 公斤 / 吨 / 辆">
                        </div>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                        <div class="login-form-group">
                            <label>排序权重 (数字越大越靠前)</label>
                            <input type="number" id="dev-sort" class="form-control" value="${item.sort || 0}">
                        </div>
                        <div class="login-form-group">
                            <label>是否热门推荐</label>
                            <select id="dev-hot" class="form-control" style="width:100%;">
                                <option value="1" ${item.is_hot == 1 ? 'selected' : ''}>推荐商品</option>
                                <option value="0" ${item.is_hot == 0 ? 'selected' : ''}>普通商品</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="login-form-group">
                        <label>商品图片 (前后台同步展示)</label>
                        <div style="display:flex;align-items:center;gap:14px;background:#f8fafc;padding:12px;border:1px solid #e2e8f0;border-radius:8px;">
                            <img id="dev-preview-img" src="${escapeHtml(item.cover_img || '/uploads/default/dev_default.svg')}" style="width:62px;height:62px;object-fit:contain;background:#fff;border-radius:6px;border:1px solid #cbd5e1;padding:4px;flex-shrink:0;" alt="预览" onerror="this.src='/uploads/default/dev_default.svg'">
                            <div style="flex:1;min-width:0;">
                                <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
                                    <input type="text" id="dev-img" class="form-control" value="${escapeHtml(item.cover_img || '/uploads/default/dev_default.svg')}" placeholder="输入图片链接或从右侧本地上传/图库选择">
                                    <button type="button" class="btn btn-outline" id="btn-pick-dev-media" style="height:36px;padding:0 12px;font-size:12px;white-space:nowrap;">从图库选择</button>
                                    <label class="btn btn-secondary" style="height:36px;padding:0 12px;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;white-space:nowrap;margin:0;">
                                        本地上传
                                        <input type="file" id="dev-img-file" accept="image/*" style="display:none;">
                                    </label>
                                </div>
                                <div style="display:flex;align-items:center;gap:8px;">
                                    <span style="font-size:12px;color:#64748b;white-space:nowrap;">快速选用预设图例:</span>
                                    <select id="dev-img-preset" class="form-control" style="font-size:12px;height:32px;padding:0 8px;flex:1;">
                                        <option value="">-- 选择内置预设图片 --</option>
                                        <optgroup label="3C 数码电子">
                                            <option value="/uploads/default/phone_15promax.svg">iPhone 15 Pro Max</option>
                                            <option value="/uploads/default/phone_mate60.svg">华为 Mate 60 Pro</option>
                                            <option value="/uploads/default/phone_mi14.svg">小米 14 Ultra</option>
                                            <option value="/uploads/default/macbook_pro.svg">苹果 MacBook Pro</option>
                                            <option value="/uploads/default/ipad_pro.svg">苹果 iPad Pro</option>
                                            <option value="/uploads/default/sony_a7m4.svg">索尼微单数码相机</option>
                                        </optgroup>
                                        <optgroup label="废旧物资 / 金属再生">
                                            <option value="/uploads/default/scrap_copper.svg">特级光亮紫铜线</option>
                                            <option value="/uploads/default/scrap_aluminum.svg">铝合金材料 / 生铝废料</option>
                                            <option value="/uploads/default/scrap_steel.svg">重废工业钢铁</option>
                                            <option value="/uploads/default/scrap_battery.svg">废铅酸动力电池</option>
                                            <option value="/uploads/default/scrap_paper.svg">高档打包废纸箱</option>
                                        </optgroup>
                                        <optgroup label="二手汽车 / 报废车辆">
                                            <option value="/uploads/default/car_corolla.svg">家用燃油轿车 (丰田卡罗拉/日产轩逸)</option>
                                            <option value="/uploads/default/car_tesla.svg">新能源纯电汽车 (特斯拉/比亚迪)</option>
                                            <option value="/uploads/default/car_scrap.svg">老旧货车 / 报废拆解车辆</option>
                                        </optgroup>
                                        <optgroup label="名表珠宝 / 奢侈品">
                                            <option value="/uploads/default/watch_rolex.svg">劳力士 / 瑞士高端机械腕表</option>
                                            <option value="/uploads/default/luxury_gold.svg">足金999 / 黄金投资饰品</option>
                                        </optgroup>
                                        <optgroup label="全屋大家电">
                                            <option value="/uploads/default/appliance_ac.svg">家用变频冷暖挂机/立柜空调</option>
                                            <option value="/uploads/default/appliance_fridge.svg">双门多门大容量风冷冰箱</option>
                                            <option value="/uploads/default/appliance_washer.svg">全自动滚筒洗烘一体机</option>
                                            <option value="/uploads/default/appliance_tv.svg">超高清 4K 智能液晶电视</option>
                                        </optgroup>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="login-form-group">
                        <label>上架状态</label>
                        <select id="dev-status" class="form-control" style="width:100%;">
                            <option value="1" ${item.status == 1 ? 'selected' : ''}>正常开放回收</option>
                            <option value="0" ${item.status == 0 ? 'selected' : ''}>下架暂停回收</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">取消</button>
                    <button class="btn btn-primary" id="btn-save-device">保存商品</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // 绑定预设图例切换
        modal.querySelector('#dev-img-preset')?.addEventListener('change', function() {
            if (this.value) {
                const imgInput = modal.querySelector('#dev-img');
                const previewImg = modal.querySelector('#dev-preview-img');
                if (imgInput) imgInput.value = this.value;
                if (previewImg) previewImg.src = this.value;
            }
        });

        // 绑定手动输入/粘贴外部URL即时预览
        const syncDevPreview = function() {
            const previewImg = modal.querySelector('#dev-preview-img');
            if (previewImg) previewImg.src = this.value.trim() || '/uploads/default/dev_default.svg';
        };
        const devImgInput = modal.querySelector('#dev-img');
        devImgInput?.addEventListener('input', syncDevPreview);
        devImgInput?.addEventListener('change', syncDevPreview);
        devImgInput?.addEventListener('paste', function() {
            setTimeout(syncDevPreview.bind(this), 50);
        });

        // 绑定从图库选择
        modal.querySelector('#btn-pick-dev-media')?.addEventListener('click', () => {
            window.openMediaLibraryModal({
                title: '选择商品图片',
                onSelect: (url) => {
                    const imgInput = modal.querySelector('#dev-img');
                    const previewImg = modal.querySelector('#dev-preview-img');
                    if (imgInput) imgInput.value = url;
                    if (previewImg) previewImg.src = url;
                }
            });
        });

        // 绑定本地图片上传
        modal.querySelector('#dev-img-file')?.addEventListener('change', async function() {
            const file = this.files?.[0];
            if (!file) return;
            const formData = new FormData();
            formData.append('file', file);
            SysUI.toast('正在上传图片...', 'info');
            try {
                const res = await api.upload('/admin/upload/image', formData);
                if (res && res.code === 200 && res.data?.url) {
                    const imgInput = modal.querySelector('#dev-img');
                    const previewImg = modal.querySelector('#dev-preview-img');
                    if (imgInput) imgInput.value = res.data.url;
                    if (previewImg) previewImg.src = res.data.url;
                    SysUI.toast('商品图片上传成功！', 'success');
                } else {
                    SysUI.toast(res ? res.msg : '上传失败', 'error');
                }
            } catch(e) {
                SysUI.toast('上传失败，请重试', 'error');
            }
        });

        modal.querySelector('#btn-save-device')?.addEventListener('click', async function () {
            const name = document.getElementById('dev-name')?.value.trim();
            const category_id = parseInt(document.getElementById('dev-cat')?.value || 1);
            const brand_id = parseInt(document.getElementById('dev-brand')?.value || 1);
            const guide_price = parseFloat(document.getElementById('dev-price')?.value || 0);
            const unit = document.getElementById('dev-unit')?.value.trim() || '台';
            const cover_img = document.getElementById('dev-img')?.value.trim() || '/uploads/default/dev_default.svg';
            const sort = parseInt(document.getElementById('dev-sort')?.value || 0);
            const is_hot = parseInt(document.getElementById('dev-hot')?.value || 0);
            const status = parseInt(document.getElementById('dev-status')?.value || 1);

            if (!name) {
                SysUI.toast('商品名称不能为空', 'warning');
                return;
            }
            if (guide_price <= 0) {
                SysUI.toast('基础回收价必须大于 0 元', 'warning');
                return;
            }

            const res = await api.post('/admin/device/save', {
                id: deviceId,
                name,
                category_id,
                brand_id,
                guide_price,
                unit,
                cover_img,
                sort,
                is_hot,
                status
            });

            if (res && res.code === 200) {
                SysUI.toast('商品保存成功！', 'success');
                modal.remove();
                reloadDevices();
            } else {
                SysUI.toast(res ? res.msg : '保存失败', 'error');
            }
        });
    };

    // 删除商品
    window.deleteDevice = async function (id) {
        const confirmed = await SysUI.confirm('确认删除该商品吗？删除后不可恢复。', {
            title: '删除商品',
            type: 'error',
            confirmText: '确认删除'
        });
        if (!confirmed) return;
        const res = await api.post('/admin/device/delete', { id });
        if (res && res.code === 200) {
            SysUI.toast('商品已删除！', 'success');
            reloadDevices();
        } else {
            SysUI.toast(res ? res.msg : '删除失败', 'error');
        }
    };

    // 品牌与规格管理弹窗
    window.openBrandManageModal = async function () {
        const brandRes = await api.get('/admin/device/brands');
        const brands = brandRes?.data || [];

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-card" style="max-width:680px;">
                <div class="modal-header">
                    <span>回收品牌 / 规格组管理</span>
                    <span style="cursor:pointer;" onclick="this.closest('.modal-overlay').remove()">✕</span>
                </div>
                <div class="modal-body">
                    <div style="display:flex;gap:10px;margin-bottom:16px;background:#f8fafc;padding:12px;border-radius:8px;">
                        <input type="text" id="new-brand-name" class="form-control" placeholder="新增品牌/规格名称 (如: 特级料/丰田/苹果)" style="flex:1;">
                        <select id="new-brand-cat" class="form-control" style="width:150px;">
                            ${state.categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
                        </select>
                        <input type="text" id="new-brand-letter" class="form-control" placeholder="首字母" style="width:70px;">
                        <button class="btn btn-primary" id="btn-add-new-brand">添加规格</button>
                    </div>

                    <table class="data-table">
                        <thead>
                            <tr><th>ID</th><th>名称</th><th>所属品类</th><th>首字母</th><th>操作</th></tr>
                        </thead>
                        <tbody>
                            ${brands.map(b => `
                                <tr>
                                    <td>${b.id}</td>
                                    <td><strong>${escapeHtml(b.name)}</strong></td>
                                    <td>${escapeHtml(b.category_name || '-')}</td>
                                    <td>${escapeHtml(b.first_letter || 'A')}</td>
                                    <td>
                                        <button class="btn btn-danger" style="height:26px;padding:0 8px;font-size:12px;background:#ef4444;color:#fff;" onclick="window.deleteBrand(${b.id})">删除</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">关闭</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('#btn-add-new-brand')?.addEventListener('click', async function () {
            const name = document.getElementById('new-brand-name')?.value.trim();
            const category_id = parseInt(document.getElementById('new-brand-cat')?.value || 1);
            const first_letter = document.getElementById('new-brand-letter')?.value.trim() || 'A';

            if (!name) {
                SysUI.toast('请输入名称', 'warning');
                return;
            }

            const res = await api.post('/admin/device/saveBrand', { name, category_id, first_letter, sort: 50 });
            if (res && res.code === 200) {
                SysUI.toast('品牌添加成功！', 'success');
                modal.remove();
                await preloadBaseData();
                window.openBrandManageModal();
            } else {
                SysUI.toast(res ? res.msg : '添加失败', 'error');
            }
        });
    };

    window.deleteBrand = async function (id) {
        const confirmed = await SysUI.confirm('确认删除该品牌/规格吗？', {
            title: '删除品牌确认',
            type: 'error',
            confirmText: '确认删除'
        });
        if (!confirmed) return;
        const res = await api.post('/admin/device/deleteBrand', { id });
        if (res && res.code === 200) {
            SysUI.toast('品牌已成功删除！', 'success');
            document.querySelector('.modal-overlay')?.remove();
            await preloadBaseData();
            window.openBrandManageModal();
        } else {
            SysUI.toast(res ? res.msg : '删除失败', 'error');
        }
    };

    // 品类分类管理弹窗 (支持自定义品类增删改查、计价单位与排序)
    window.openCategoryManageModal = async function () {
        const catRes = await api.get('/admin/device/categories');
        const categories = (catRes && catRes.code === 200 && Array.isArray(catRes.data)) ? catRes.data : (state.categories || []);

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-card" style="max-width:960px;width:92vw;">
                <div class="modal-header">
                    <span>🏷️ 回收品类管理 (自定义设置品类名称、计价单位与排序)</span>
                    <span style="cursor:pointer;" onclick="this.closest('.modal-overlay').remove()">✕</span>
                </div>
                <div class="modal-body">
                    <div style="font-size:12px;color:#1e40af;margin-bottom:14px;background:#eff6ff;padding:10px 14px;border-radius:8px;border:1px solid #bfdbfe;line-height:1.6;">
                        💡 <strong>温馨提示</strong>：在此可自由添加、重命名或调整各行业品类。品类名称将同步在 <strong>PC商城前台、H5移动端、微信小程序</strong> 的分类导航中展示。推荐设置 <strong>2~4 个汉字</strong>（如“智能手机”、“摄影摄像”、“智能穿戴”），可保证移动端/小程序界面获得最佳居中排版视觉。
                    </div>

                    <!-- 新增/编辑表单 -->
                    <div id="cat-form-box" style="display:flex;gap:12px;margin-bottom:16px;background:#f8fafc;padding:16px;border-radius:8px;border:1px solid #e2e8f0;align-items:flex-end;flex-wrap:wrap;">
                        <input type="hidden" id="edit-cat-id" value="0">
                        <div style="flex:1.5;min-width:160px;">
                            <label style="font-size:12px;color:#475569;font-weight:600;display:block;margin-bottom:6px;">品类名称 <span style="color:#ef4444;">*</span></label>
                            <input type="text" id="cat-name-input" class="form-control" placeholder="品类名称 (如: 智能手机/黄金首饰)" style="width:100%;height:38px;">
                        </div>
                        <div style="width:120px;">
                            <label style="font-size:12px;color:#475569;font-weight:600;display:block;margin-bottom:6px;">计价单位</label>
                            <input type="text" id="cat-unit-input" class="form-control" placeholder="台 / 公斤 / 克" value="台" style="width:100%;height:38px;">
                        </div>
                        <div style="width:100px;">
                            <label style="font-size:12px;color:#475569;font-weight:600;display:block;margin-bottom:6px;">排序权重</label>
                            <input type="number" id="cat-sort-input" class="form-control" placeholder="权重" value="50" style="width:100%;height:38px;">
                        </div>
                        <div style="width:110px;">
                            <label style="font-size:12px;color:#475569;font-weight:600;display:block;margin-bottom:6px;">前台状态</label>
                            <select id="cat-show-input" class="form-control" style="width:100%;height:38px;">
                                <option value="1">显示</option>
                                <option value="0">隐藏</option>
                            </select>
                        </div>
                        <div style="display:flex;gap:8px;">
                            <button class="btn btn-primary" id="btn-save-cat" style="height:38px;padding:0 20px;font-weight:600;white-space:nowrap;">添加品类</button>
                            <button class="btn btn-secondary" id="btn-cancel-edit-cat" style="height:38px;padding:0 14px;display:none;white-space:nowrap;">取消</button>
                        </div>
                    </div>

                    <div style="max-height:460px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:8px;">
                        <table class="data-table" style="margin:0;width:100%;">
                            <thead>
                                <tr>
                                    <th style="width:60px;text-align:center;">ID</th>
                                    <th>品类名称</th>
                                    <th style="width:100px;text-align:center;">默认单位</th>
                                    <th style="width:100px;text-align:center;">关联商品</th>
                                    <th style="width:80px;text-align:center;">排序</th>
                                    <th style="width:80px;text-align:center;">状态</th>
                                    <th style="width:160px;text-align:center;">操作</th>
                                </tr>
                            </thead>
                            <tbody id="cat-table-tbody">
                                ${categories.length === 0 ? '<tr><td colspan="7" style="text-align:center;padding:30px;color:#94a3b8;">暂无品类数据</td></tr>' : categories.map(c => `
                                    <tr>
                                        <td style="text-align:center;">${c.id}</td>
                                        <td><strong style="color:#0f172a;font-size:14px;">${escapeHtml(c.name)}</strong></td>
                                        <td style="text-align:center;"><span class="badge" style="background:#f1f5f9;color:#475569;">${escapeHtml(c.unit || '台')}</span></td>
                                        <td style="text-align:center;"><span class="badge" style="background:${(c.device_count || 0) > 0 ? '#eff6ff;color:#1e58ff' : '#f1f5f9;color:#94a3b8'};">${c.device_count || 0} 件</span></td>
                                        <td style="text-align:center;">${c.sort || 0}</td>
                                        <td style="text-align:center;">${Number(c.is_show) === 1 ? '<span class="badge badge-success">显示</span>' : '<span class="badge badge-gray">隐藏</span>'}</td>
                                        <td style="text-align:center;">
                                            <div style="display:flex;gap:8px;justify-content:center;align-items:center;">
                                                <button class="btn btn-secondary btn-edit-cat-row" style="height:28px;padding:0 12px;font-size:12px;white-space:nowrap;display:inline-flex;align-items:center;" 
                                                    data-id="${c.id}" 
                                                    data-name="${escapeHtml(c.name)}" 
                                                    data-unit="${escapeHtml(c.unit || '台')}" 
                                                    data-sort="${c.sort || 0}" 
                                                    data-show="${c.is_show !== undefined ? c.is_show : 1}">编辑</button>
                                                <button class="btn btn-danger" style="height:28px;padding:0 12px;font-size:12px;background:#ef4444;color:#fff;white-space:nowrap;display:inline-flex;align-items:center;" 
                                                    onclick="window.deleteCategory(${c.id}, '${escapeHtml(c.name)}', ${c.device_count || 0})">删除</button>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">关闭</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const editIdInput = modal.querySelector('#edit-cat-id');
        const nameInput = modal.querySelector('#cat-name-input');
        const unitInput = modal.querySelector('#cat-unit-input');
        const sortInput = modal.querySelector('#cat-sort-input');
        const showInput = modal.querySelector('#cat-show-input');
        const saveBtn = modal.querySelector('#btn-save-cat');
        const cancelBtn = modal.querySelector('#btn-cancel-edit-cat');

        // 绑定行编辑
        modal.querySelectorAll('.btn-edit-cat-row').forEach(btn => {
            btn.addEventListener('click', function () {
                editIdInput.value = this.getAttribute('data-id');
                nameInput.value = this.getAttribute('data-name');
                unitInput.value = this.getAttribute('data-unit');
                sortInput.value = this.getAttribute('data-sort');
                showInput.value = this.getAttribute('data-show');
                saveBtn.innerText = '保存修改';
                cancelBtn.style.display = 'inline-block';
                nameInput.focus();
            });
        });

        // 取消编辑
        cancelBtn?.addEventListener('click', function () {
            editIdInput.value = '0';
            nameInput.value = '';
            unitInput.value = '台';
            sortInput.value = '50';
            showInput.value = '1';
            saveBtn.innerText = '添加品类';
            cancelBtn.style.display = 'none';
        });

        // 提交保存品类
        saveBtn?.addEventListener('click', async function () {
            const id = parseInt(editIdInput.value || 0);
            const name = nameInput.value.trim();
            const unit = unitInput.value.trim() || '台';
            const sort = parseInt(sortInput.value || 50);
            const is_show = parseInt(showInput.value || 1);

            if (!name) {
                SysUI.toast('品类名称不能为空', 'warning');
                nameInput.focus();
                return;
            }

            const res = await api.post('/admin/device/saveCategory', { id, name, unit, sort, is_show });
            if (res && res.code === 200) {
                SysUI.toast(id > 0 ? '品类修改成功！' : '品类添加成功！', 'success');
                modal.remove();
                if (typeof preloadBaseData === 'function') {
                    await preloadBaseData();
                }
                const catFilter = document.getElementById('device-cat-filter');
                if (catFilter && state.categories) {
                    const curVal = catFilter.value;
                    catFilter.innerHTML = '<option value="0">全部分类</option>' + 
                        state.categories.map(c => `<option value="${c.id}" ${c.id == curVal ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('');
                }
                window.openCategoryManageModal();
            } else {
                SysUI.toast(res ? res.msg : '保存失败', 'error');
            }
        });
    };

    window.deleteCategory = async function (id, name, deviceCount) {
        if (deviceCount > 0) {
            SysUI.toast(`【${name}】下仍有 ${deviceCount} 件商品关联，请先将商品移至其他品类或删除后再删除品类`, 'error');
            return;
        }
        const confirmed = await SysUI.confirm(`确认删除品类【${name}】吗？删除后不可恢复。`, {
            title: '删除品类确认',
            type: 'error',
            confirmText: '确认删除'
        });
        if (!confirmed) return;
        const res = await api.post('/admin/device/deleteCategory', { id });
        if (res && res.code === 200) {
            SysUI.toast('品类已成功删除！', 'success');
            document.querySelector('.modal-overlay')?.remove();
            if (typeof preloadBaseData === 'function') {
                await preloadBaseData();
            }
            const catFilter = document.getElementById('device-cat-filter');
            if (catFilter && state.categories) {
                catFilter.innerHTML = '<option value="0">全部分类</option>' + 
                    state.categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
            }
            window.openCategoryManageModal();
        } else {
            SysUI.toast(res ? res.msg : '删除失败', 'error');
        }
    };

    // ==========================================
    // 6. 回收客户会员管理视图
    // ==========================================

    window.renderDevicesView = renderDevicesView;
})(window);
