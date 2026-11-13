/**
 * 启灵同城服务系统 - 线下服务门店与网点管理视图
 * 包含线下回收门店的增删改查、营业状态与默认门店维护
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

    let cachedStoreList = [];

    async function renderStoresView(container) {
        if (!container) return;

        container.innerHTML = `
            <div class="card" style="padding:0;overflow:hidden;border-radius:12px;">
                <!-- 顶部导航与操作栏 -->
                <div style="padding:18px 24px;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
                    <div>
                        <h3 style="font-size:16px;font-weight:700;color:#0f172a;margin:0;">线下门店与网点管理</h3>
                        <div style="font-size:12px;color:#64748b;margin-top:2px;">管理线下回收门店与服务网点，支持设置营业时间、服务电话与交通指引</div>
                    </div>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <button type="button" class="btn btn-primary" id="btn-add-store" style="height:36px;padding:0 16px;font-size:13px;display:flex;align-items:center;gap:6px;">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                            新增服务门店
                        </button>
                    </div>
                </div>

                <div style="padding:20px 24px;">
                    <!-- 数据概览卡片 -->
                    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:16px;margin-bottom:20px;">
                        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 18px;">
                            <div style="font-size:12px;color:#64748b;">网点总数</div>
                            <div style="font-size:24px;font-weight:800;color:#1e58ff;margin-top:4px;" id="stat-total-stores">-</div>
                        </div>
                        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 18px;">
                            <div style="font-size:12px;color:#64748b;">营业中网点</div>
                            <div style="font-size:24px;font-weight:800;color:#10b981;margin-top:4px;" id="stat-active-stores">-</div>
                        </div>
                        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 18px;">
                            <div style="font-size:12px;color:#64748b;">暂停营业网点</div>
                            <div style="font-size:24px;font-weight:800;color:#f59e0b;margin-top:4px;" id="stat-inactive-stores">-</div>
                        </div>
                        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 18px;">
                            <div style="font-size:12px;color:#64748b;">默认推荐门店</div>
                            <div style="font-size:15px;font-weight:700;color:#0f172a;margin-top:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" id="stat-default-store">-</div>
                        </div>
                    </div>

                    <!-- 搜索与筛选工具栏 -->
                    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
                        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                            <div style="position:relative;width:260px;">
                                <input type="text" id="store-search-keyword" class="form-control" placeholder="搜索门店名称 / 地址 / 电话..." style="height:36px;padding-right:32px;font-size:13px;">
                                <span style="position:absolute;right:10px;top:9px;color:#94a3b8;">
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                                </span>
                            </div>
                            <select id="store-status-filter" class="form-control" style="width:140px;height:36px;font-size:13px;">
                                <option value="all">全部营业状态</option>
                                <option value="1">营业中</option>
                                <option value="0">暂停营业</option>
                            </select>
                            <button type="button" class="btn btn-secondary" id="btn-refresh-stores" style="height:36px;padding:0 14px;font-size:13px;">刷新</button>
                        </div>
                        <div style="font-size:12px;color:#64748b;">
                            共 <span id="store-count-badge" style="font-weight:700;color:#1e58ff;">0</span> 家服务门店
                        </div>
                    </div>

                    <!-- 门店列表数据容器 -->
                    <div id="store-table-container">
                        <div style="text-align:center;padding:40px;color:#94a3b8;">正在加载服务门店列表...</div>
                    </div>
                </div>
            </div>
        `;

        // 绑定事件
        document.getElementById('btn-add-store')?.addEventListener('click', () => openStoreModal());
        document.getElementById('btn-refresh-stores')?.addEventListener('click', () => loadStores());
        document.getElementById('store-status-filter')?.addEventListener('change', () => loadStores());

        let searchDebounce = null;
        document.getElementById('store-search-keyword')?.addEventListener('input', () => {
            clearTimeout(searchDebounce);
            searchDebounce = setTimeout(() => {
                loadStores();
            }, 300);
        });

        // 初始加载
        await loadStores();
    }

    /**
     * 加载门店列表与统计数据
     */
    async function loadStores() {
        const keyword = document.getElementById('store-search-keyword')?.value.trim() || '';
        const status = document.getElementById('store-status-filter')?.value || 'all';
        const container = document.getElementById('store-table-container');

        if (container) {
            container.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;">正在更新门店数据...</div>';
        }

        const res = await api.get(`/admin/store/list&keyword=${encodeURIComponent(keyword)}&status=${encodeURIComponent(status)}`);
        if (!res || res.code !== 200) {
            if (container) {
                const errTip = (res && res.msg) ? escapeHtml(res.msg) : '服务暂未响应，请检查服务连接';
                container.innerHTML = `
                    <div style="text-align:center;padding:40px;color:#ef4444;">
                        <div style="font-weight:600;margin-bottom:6px;">加载门店数据未成功</div>
                        <div style="font-size:12px;color:#94a3b8;margin-bottom:14px;">${errTip}</div>
                        <button type="button" class="btn btn-secondary" onclick="window.loadStores()" style="font-size:12px;padding:5px 14px;">重新加载</button>
                    </div>
                `;
            }
            return;
        }

        const stores = res.data || [];
        cachedStoreList = stores;

        // 更新统计项
        const total = stores.length;
        const activeCount = stores.filter(s => Number(s.status) === 1).length;
        const inactiveCount = total - activeCount;
        const defaultStore = stores.find(s => Number(s.is_default) === 1);

        const elTotal = document.getElementById('stat-total-stores');
        const elActive = document.getElementById('stat-active-stores');
        const elInactive = document.getElementById('stat-inactive-stores');
        const elDefault = document.getElementById('stat-default-store');
        const elBadge = document.getElementById('store-count-badge');

        if (elTotal) elTotal.innerText = total;
        if (elActive) elActive.innerText = activeCount;
        if (elInactive) elInactive.innerText = inactiveCount;
        if (elDefault) elDefault.innerText = defaultStore ? defaultStore.name : '未设置默认';
        if (elBadge) elBadge.innerText = total;

        if (stores.length === 0) {
            if (container) {
                container.innerHTML = `
                    <div style="text-align:center;padding:50px 20px;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:10px;">
                        <div style="width:48px;height:48px;background:#e2e8f0;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 12px auto;color:#64748b;">
                            <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z"/></svg>
                        </div>
                        <h4 style="font-size:15px;color:#1e293b;margin-bottom:6px;">暂无符合条件的服务门店</h4>
                        <p style="font-size:13px;color:#64748b;margin-bottom:16px;">您可点击上方按钮添加第一家线下服务网点，方便客户到店验机回收</p>
                        <button type="button" class="btn btn-primary" onclick="window.openStoreModal()" style="font-size:13px;">立即添加门店</button>
                    </div>
                `;
            }
            return;
        }

        let rowsHtml = '';
        stores.forEach(s => {
            const isDef = Number(s.is_default) === 1;
            const isActive = Number(s.status) === 1;

            const defaultBadge = isDef
                ? `<span style="background:#dbeafe;color:#1e40af;font-size:11px;padding:2px 8px;border-radius:4px;font-weight:600;margin-left:6px;display:inline-flex;align-items:center;gap:3px;"><svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>默认推荐</span>`
                : '';

            const statusBadge = isActive
                ? `<span style="background:#dcfce7;color:#15803d;font-size:12px;padding:3px 10px;border-radius:999px;font-weight:600;display:inline-block;">● 营业中</span>`
                : `<span style="background:#f1f5f9;color:#64748b;font-size:12px;padding:3px 10px;border-radius:999px;font-weight:600;display:inline-block;">○ 暂停营业</span>`;

            rowsHtml += `
                <tr style="border-bottom:1px solid #f1f5f9;transition:background .15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                    <td style="padding:14px 16px;">
                        <div style="font-weight:700;color:#0f172a;font-size:14px;display:flex;align-items:center;">
                            ${escapeHtml(s.name)}
                            ${defaultBadge}
                        </div>
                        <div style="font-size:12px;color:#64748b;margin-top:4px;display:flex;align-items:center;gap:4px;">
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="#94a3b8"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                            ${escapeHtml(s.address)}
                        </div>
                        ${s.traffic_guide ? `<div style="font-size:11px;color:#3b82f6;margin-top:2px;">🚗 路线：${escapeHtml(s.traffic_guide)}</div>` : ''}
                    </td>
                    <td style="padding:14px 16px;white-space:nowrap;">
                        <div style="font-size:13px;font-weight:600;color:#1e293b;">${escapeHtml(s.phone)}</div>
                        <div style="font-size:12px;color:#64748b;margin-top:2px;">${escapeHtml(s.business_hours || '未填营业时间')}</div>
                    </td>
                    <td style="padding:14px 16px;text-align:center;white-space:nowrap;">
                        <span style="font-size:13px;color:#475569;font-weight:600;">${Number(s.sort || 0)}</span>
                    </td>
                    <td style="padding:14px 16px;text-align:center;white-space:nowrap;">
                        <div style="cursor:pointer;" onclick="window.toggleStoreStatus(${s.id})" title="点击切换营业状态">
                            ${statusBadge}
                        </div>
                    </td>
                    <td style="padding:14px 16px;text-align:right;white-space:nowrap;">
                        <div style="display:inline-flex;gap:6px;align-items:center;">
                            ${!isDef ? `<button type="button" class="btn btn-secondary" style="height:30px;padding:0 10px;font-size:12px;" onclick="window.setDefaultStore(${s.id})">设为默认</button>` : ''}
                            <button type="button" class="btn btn-secondary" style="height:30px;padding:0 10px;font-size:12px;color:#1e58ff;" onclick="window.editStore(${s.id})">编辑</button>
                            <button type="button" class="btn btn-secondary" style="height:30px;padding:0 10px;font-size:12px;color:#ef4444;" onclick="window.deleteStore(${s.id}, '${escapeHtml(s.name)}')">删除</button>
                        </div>
                    </td>
                </tr>
            `;
        });

        if (container) {
            container.innerHTML = `
                <div style="overflow-x:auto;border:1px solid #e2e8f0;border-radius:8px;">
                    <table class="table" style="width:100%;border-collapse:collapse;text-align:left;">
                        <thead>
                            <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:12px;color:#64748b;">
                                <th style="padding:12px 16px;">门店名称与地址</th>
                                <th style="padding:12px 16px;">联系方式与时间</th>
                                <th style="padding:12px 16px;text-align:center;">排序权重</th>
                                <th style="padding:12px 16px;text-align:center;">营业状态</th>
                                <th style="padding:12px 16px;text-align:right;">管理操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>
                </div>
            `;
        }
    }

    /**
     * 门店新增/编辑弹窗
     */
    function openStoreModal(store = null) {
        const isEdit = store && store.id;
        const s = store || {
            id: 0,
            name: '',
            phone: '',
            address: '',
            business_hours: '周一至周日 09:00 - 21:00',
            traffic_guide: '',
            sort: 100,
            status: 1,
            is_default: 0
        };

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-box" style="width:560px;max-width:92%;background:#fff;border-radius:12px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);overflow:hidden;">
                <div class="modal-header" style="padding:16px 20px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;">
                    <h3 style="font-size:15px;font-weight:700;color:#0f172a;margin:0;">${isEdit ? '编辑服务门店' : '新增服务门店'}</h3>
                    <button type="button" class="btn-close" style="background:none;border:none;font-size:18px;cursor:pointer;color:#94a3b8;" onclick="this.closest('.modal-overlay').remove()">✕</button>
                </div>
                <form id="form-store-modal" style="padding:20px;">
                    <input type="hidden" id="modal-store-id" value="${s.id || 0}">

                    <div class="login-form-group" style="margin-bottom:14px;">
                        <label style="font-size:13px;font-weight:600;color:#334155;margin-bottom:6px;display:block;">门店/网点名称 <span style="color:#ef4444;">*</span></label>
                        <input type="text" id="modal-store-name" class="form-control" value="${escapeHtml(s.name)}" placeholder="例如：启灵官方回收旗舰总店、XX科技城服务点" required style="width:100%;height:38px;">
                    </div>

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
                        <div class="login-form-group">
                            <label style="font-size:13px;font-weight:600;color:#334155;margin-bottom:6px;display:block;">联系电话 / 手机 <span style="color:#ef4444;">*</span></label>
                            <input type="text" id="modal-store-phone" class="form-control" value="${escapeHtml(s.phone)}" placeholder="例如：400-800-8888 或手机号" required style="width:100%;height:38px;">
                        </div>
                        <div class="login-form-group">
                            <label style="font-size:13px;font-weight:600;color:#334155;margin-bottom:6px;display:block;">营业时间</label>
                            <input type="text" id="modal-store-hours" class="form-control" value="${escapeHtml(s.business_hours)}" placeholder="例如：周一至周日 09:00 - 21:00" style="width:100%;height:38px;">
                        </div>
                    </div>

                    <div class="login-form-group" style="margin-bottom:14px;">
                        <label style="font-size:13px;font-weight:600;color:#334155;margin-bottom:6px;display:block;">详细地址 (省市区门牌) <span style="color:#ef4444;">*</span></label>
                        <input type="text" id="modal-store-address" class="form-control" value="${escapeHtml(s.address)}" placeholder="例如：高新技术产业开发区科技大道88号综合大厦1楼" required style="width:100%;height:38px;">
                    </div>

                    <div class="login-form-group" style="margin-bottom:14px;">
                        <label style="font-size:13px;font-weight:600;color:#334155;margin-bottom:6px;display:block;">交通指引 / 到店提示 (选填)</label>
                        <textarea id="modal-store-traffic" class="form-control" rows="2" placeholder="例如：地铁2号线XX站B出口向东200米；自驾前往提供专属临时停车位" style="width:100%;resize:vertical;">${escapeHtml(s.traffic_guide || '')}</textarea>
                    </div>

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
                        <div class="login-form-group">
                            <label style="font-size:13px;font-weight:600;color:#334155;margin-bottom:6px;display:block;">排序权重 (数值越大越靠前)</label>
                            <input type="number" id="modal-store-sort" class="form-control" value="${s.sort || 100}" style="width:100%;height:38px;">
                        </div>
                        <div class="login-form-group">
                            <label style="font-size:13px;font-weight:600;color:#334155;margin-bottom:6px;display:block;">营业状态</label>
                            <select id="modal-store-status" class="form-control" style="width:100%;height:38px;">
                                <option value="1" ${Number(s.status) === 1 ? 'selected' : ''}>营业中</option>
                                <option value="0" ${Number(s.status) === 0 ? 'selected' : ''}>暂停营业</option>
                            </select>
                        </div>
                    </div>

                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;margin-bottom:18px;">
                        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;font-weight:600;color:#1e293b;margin:0;">
                            <input type="checkbox" id="modal-store-default" ${Number(s.is_default) === 1 ? 'checked' : ''} style="width:16px;height:16px;accent-color:#1e58ff;">
                            设为平台默认推荐门店
                        </label>
                        <div style="font-size:12px;color:#64748b;margin-top:4px;padding-left:24px;">若开启，用户在回收下单切换为“线下门店自送”时将默认选中此网点；若系统仅有一家门店，系统也会自动锁定该网点。</div>
                    </div>

                    <div class="modal-footer" style="display:flex;justify-content:flex-end;gap:10px;padding-top:14px;border-top:1px solid #e2e8f0;">
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">取消</button>
                        <button type="submit" class="btn btn-primary" id="btn-save-store-submit" style="padding:0 20px;">${isEdit ? '保存修改' : '立即添加'}</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('#form-store-modal')?.addEventListener('submit', async function(e) {
            e.preventDefault();
            const submitBtn = document.getElementById('btn-save-store-submit');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerText = '正在保存...';
            }

            const payload = {
                id: parseInt(document.getElementById('modal-store-id')?.value || 0),
                name: document.getElementById('modal-store-name')?.value.trim() || '',
                phone: document.getElementById('modal-store-phone')?.value.trim() || '',
                address: document.getElementById('modal-store-address')?.value.trim() || '',
                business_hours: document.getElementById('modal-store-hours')?.value.trim() || '',
                traffic_guide: document.getElementById('modal-store-traffic')?.value.trim() || '',
                sort: parseInt(document.getElementById('modal-store-sort')?.value || 100),
                status: parseInt(document.getElementById('modal-store-status')?.value || 1),
                is_default: document.getElementById('modal-store-default')?.checked ? 1 : 0
            };

            const res = await api.post('/admin/store/save', payload);
            if (res && res.code === 200) {
                SysUI.toast(res.msg || '门店信息已保存', 'success');
                modal.remove();
                await loadStores();
            } else {
                SysUI.toast(res ? res.msg : '保存门店失败', 'error');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerText = isEdit ? '保存修改' : '立即添加';
                }
            }
        });
    }

    /**
     * 编辑指定门店
     */
    window.editStore = function(id) {
        const store = cachedStoreList.find(x => Number(x.id) === Number(id));
        if (store) {
            openStoreModal(store);
        }
    };

    /**
     * 切换门店营业状态
     */
    window.toggleStoreStatus = async function(id) {
        const res = await api.post('/admin/store/toggleStatus', { id: id });
        if (res && res.code === 200) {
            SysUI.toast('营业状态已切换', 'success');
            await loadStores();
        } else {
            SysUI.toast(res ? res.msg : '操作失败', 'error');
        }
    };

    /**
     * 设为默认门店
     */
    window.setDefaultStore = async function(id) {
        const res = await api.post('/admin/store/setDefault', { id: id });
        if (res && res.code === 200) {
            SysUI.toast('已将该门店设为默认推荐门店', 'success');
            await loadStores();
        } else {
            SysUI.toast(res ? res.msg : '操作失败', 'error');
        }
    };

    /**
     * 删除指定门店
     */
    window.deleteStore = async function(id, name) {
        const confirmed = await SysUI.confirm(`确认删除门店【${name}】吗？\n删除后不可恢复，请确认是否有客户正在往该网点交投。`, {
            title: '删除门店确认',
            type: 'error',
            confirmText: '确认删除'
        });
        if (!confirmed) return;

        const res = await api.post('/admin/store/delete', { id: id });
        if (res && res.code === 200) {
            SysUI.toast('门店已成功删除', 'success');
            await loadStores();
        } else {
            SysUI.toast(res ? res.msg : '删除失败', 'error');
        }
    };

    window.openStoreModal = openStoreModal;
    window.renderStoresView = renderStoresView;
    window.loadStores = loadStores;

})(window);
