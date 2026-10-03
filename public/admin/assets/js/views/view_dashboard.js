/**
 * 启灵回收系统 - 数据仪表盘视图
 * 职责：展示系统关键指标看板（订单总量、待质检验收、成交放款额、在售商品数）及最新动态
 * 编码：UTF-8 无 BOM
 */
(function (window) {
    'use strict';

    const api = window.adminApi || window.api;
    const escapeHtml = window.escapeHtml || function(s) { return s; };
    const getStatusBadge = window.getStatusBadge;
    const formatTime = window.formatTime;

    async function renderDashboardView(container) {
        if (!container) return;
        container.innerHTML = `
            <div class="stat-grid">
                <div class="stat-card">
                    <div class="stat-icon stat-blue"><svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg></div>
                    <div>
                        <div class="stat-num" id="stat-total-orders">-</div>
                        <div class="stat-label">累计回收订单量</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon stat-amber"><svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg></div>
                    <div>
                        <div class="stat-num" id="stat-pending-inspect">-</div>
                        <div class="stat-label">待质检验收单</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon stat-green"><svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg></div>
                    <div>
                        <div class="stat-num" id="stat-total-payout">-</div>
                        <div class="stat-label">累计成交放款额</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon stat-purple"><svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"/></svg></div>
                    <div>
                        <div class="stat-num" id="stat-active-devices">-</div>
                        <div class="stat-label">在售商品数</div>
                    </div>
                </div>
            </div>

            <div class="card" style="margin-top:20px;">
                <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;">
                    <div class="card-title">最新待处理订单</div>
                    <button class="btn btn-secondary" onclick="window.navigateToTab('orders')">进入订单管理全部列表 →</button>
                </div>
                <div id="dash-orders-table">正在加载最新订单...</div>
            </div>
        `;

        const curApi = window.adminApi || window.api;
        const res = await curApi.get('/admin/order/list&page=1&page_size=10');
        if (res && res.code === 200) {
            const list = res.data.list || [];
            const elTotalOrders = document.getElementById('stat-total-orders');
            const elPendingInspect = document.getElementById('stat-pending-inspect');
            const elTotalPayout = document.getElementById('stat-total-payout');
            const elActiveDevices = document.getElementById('stat-active-devices');
            const elTable = document.getElementById('dash-orders-table');

            if (elTotalOrders) elTotalOrders.innerText = res.data.total || 0;
            if (elPendingInspect) elPendingInspect.innerText = list.filter(o => o.status === 'received' || o.status === 'inspecting' || o.status === 'pending_send').length;
            if (elTotalPayout) elTotalPayout.innerText = '¥ ' + list.filter(o => o.status === 'completed').reduce((acc, cur) => acc + parseFloat(cur.final_price || 0), 0).toFixed(2);

            const devRes = await curApi.get('/admin/device/list&page=1&page_size=1');
            if (elActiveDevices) elActiveDevices.innerText = (devRes?.data?.total || 0) + ' 款商品';

            if (!elTable) return;
            if (list.length === 0) {
                elTable.innerHTML = '<div style="color:#94a3b8;padding:30px;text-align:center;">暂无回收订单</div>';
            } else {
                let rows = '';
                list.slice(0, 5).forEach(o => {
                    rows += `<tr>
                        <td><strong>${escapeHtml(o.order_sn)}</strong></td>
                        <td>${escapeHtml(o.device_name)}</td>
                        <td><strong style="color:#1e58ff;">¥ ${escapeHtml(o.estimate_price)}</strong></td>
                        <td>${escapeHtml(o.contact_name)} (${escapeHtml(o.contact_mobile)})</td>
                        <td>${getStatusBadge(o.status)}</td>
                        <td>${formatTime(o.created_at)}</td>
                        <td>
                            <button class="btn btn-secondary" style="height:28px;padding:0 10px;font-size:12px;" onclick="window.viewOrderDetail(${o.id})">详情</button>
                        </td>
                    </tr>`;
                });
                elTable.innerHTML = `
                    <table class="data-table">
                        <thead>
                            <tr><th>订单号</th><th>商品名称</th><th>预估价格</th><th>客户联系人</th><th>状态</th><th>下单时间</th><th>操作</th></tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                `;
            }
        }
    }

    window.renderDashboardView = renderDashboardView;
})(window);
