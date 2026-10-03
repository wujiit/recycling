/**
 * 启灵回收系统 - 质检验收复核工作台视图
 * 职责：到货签收扫码、真机成色质检、扣减项复核、差异报价协商与成交确认
 * 编码：UTF-8 无 BOM
 */
(function (window) {
    'use strict';

    const SysUI = window.SysUI;
    const api = window.adminApi || window.api;
    const state = window.adminState || window.state;
    const escapeHtml = window.escapeHtml || function(s) { return s; };
    const formatTime = window.formatTime;
    const getStatusBadge = window.getStatusBadge;
    // ==========================================
    async function renderInspectionView(container) {
        container.innerHTML = `
            <div style="display:grid;grid-template-columns:320px 1fr;gap:20px;">
                <!-- 左栏：待质检列表 -->
                <div class="card" style="padding:16px;">
                    <div style="font-weight:700;font-size:15px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;">
                        <span>待质检订单</span>
                        <button class="btn btn-secondary" style="height:26px;padding:0 8px;font-size:12px;" id="btn-refresh-pending-inspect">刷新</button>
                    </div>
                    <div id="pending-inspect-list" style="max-height:650px;overflow-y:auto;">
                        <div style="color:#94a3b8;font-size:13px;">加载中...</div>
                    </div>
                </div>

                <!-- 右栏：质检核验操作核心区 -->
                <div>
                    <div class="card">
                        <div class="card-header">
                            <div class="card-title">质检验收</div>
                        </div>
                        <div class="toolbar" style="display:flex;gap:12px;">
                            <input type="text" class="form-control" id="inspect-search-input" placeholder="输入或扫描回收订单号" style="flex:1;">
                            <button class="btn btn-primary" id="btn-inspect-search">调取订单</button>
                        </div>
                    </div>

                    <div id="inspection-workbench-box" style="display:none;margin-top:16px;">
                        <div class="card">
                            <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;">
                                <div class="card-title" id="inspect-order-title">正在验收</div>
                                <div id="inspect-order-status"></div>
                            </div>

                            <div class="inspection-layout">
                                <!-- 左半区：客户提交申报 -->
                                <div class="compare-box">
                                    <div class="compare-title">用户评估申报明细</div>
                                    <div id="inspect-initial-details" style="font-size:13px;line-height:2;">加载中...</div>
                                    <div style="margin-top:16px;padding:10px;background:#eef2ff;border-radius:6px;font-weight:600;color:#1e58ff;">
                                        初始预估价格: <span id="inspect-initial-price" style="font-size:18px;">¥ 0.00</span>
                                    </div>
                                </div>

                                <!-- 右半区：质检复核录入 -->
                                <div class="compare-box">
                                    <div class="compare-title">质检核定与最终定价</div>
                                    <div class="form-group" style="margin-bottom:12px;">
                                        <label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px;">设备序列号 / 编号 (必填):</label>
                                        <input type="text" class="form-control" id="inspect-imei" placeholder="请输入商品序列号或唯一编号" style="width:100%;">
                                    </div>
                                    <div class="form-group" style="margin-bottom:12px;">
                                        <label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px;">质检最终成交价 (元):</label>
                                        <input type="number" step="0.01" class="form-control" id="inspect-final-price" placeholder="例如: 5200" style="width:100%;font-size:18px;font-weight:bold;color:#1e58ff;">
                                    </div>
                                    <div class="form-group" style="margin-bottom:14px;">
                                        <label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px;">质检备注说明:</label>
                                        <textarea class="form-control" id="inspect-remark" rows="3" placeholder="例如: 经检测，成色完好，各项功能正常。" style="width:100%;"></textarea>
                                    </div>
                                    <button class="btn btn-success" id="btn-submit-inspection" style="width:100%;height:44px;font-size:15px;font-weight:bold;">
                                        确认质检结果并定价
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 加载左侧待验机列表
        async function loadPendingInspectList() {
            const listBox = document.getElementById('pending-inspect-list');
            if (!listBox) return;
            const res = await api.get('/admin/order/list&status=received&page=1&page_size=30');
            const res2 = await api.get('/admin/order/list&status=pending_send&page=1&page_size=10');

            let orders = [];
            if (res && res.code === 200) orders = orders.concat(res.data.list || []);
            if (res2 && res2.code === 200) orders = orders.concat(res2.data.list || []);

            if (orders.length === 0) {
                listBox.innerHTML = '<div style="color:#94a3b8;font-size:13px;padding:20px 0;text-align:center;">暂无待质检订单</div>';
                return;
            }

            let html = '';
            orders.forEach(o => {
                html += `
                    <div style="padding:12px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:8px;cursor:pointer;transition:border-color 0.2s;" 
                         onmouseover="this.style.borderColor='#1e58ff'" onmouseout="this.style.borderColor='#e2e8f0'"
                         onclick="window.quickSelectOrder('${escapeHtml(o.order_sn)}')">
                        <div style="font-weight:600;font-size:13px;color:#0f172a;">${escapeHtml(o.device_name)}</div>
                        <div style="font-size:11px;color:#64748b;margin:4px 0;">单号: ${escapeHtml(o.order_sn)}</div>
                        <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;">
                            <span style="color:#1e58ff;font-weight:bold;">¥ ${escapeHtml(o.estimate_price)}</span>
                            ${getStatusBadge(o.status)}
                        </div>
                    </div>
                `;
            });
            listBox.innerHTML = html;
        }

        window.quickSelectOrder = function (sn) {
            const input = document.getElementById('inspect-search-input');
            if (input) {
                input.value = sn;
                document.getElementById('btn-inspect-search')?.click();
            }
        };

        document.getElementById('btn-refresh-pending-inspect')?.addEventListener('click', loadPendingInspectList);
        loadPendingInspectList();

        // 搜单调取
        document.getElementById('btn-inspect-search')?.addEventListener('click', async function () {
            const sn = document.getElementById('inspect-search-input')?.value.trim();
            if (!sn) {
                SysUI.toast('请先输入回收订单号', 'warning');
                return;
            }

            const res = await api.get(`/admin/order/list&keyword=${encodeURIComponent(sn)}`);
            if (res && res.code === 200 && res.data.list.length > 0) {
                const orderSummary = res.data.list[0];
                const detailRes = await api.get(`/admin/order/detail&id=${orderSummary.id}`);
                if (detailRes && detailRes.code === 200) {
                    showInspectionDetail(detailRes.data);
                }
            } else {
                SysUI.toast('未找到该单号，请核对是否输入正确', 'warning');
            }
        });

        // 提交质检报告
        document.getElementById('btn-submit-inspection')?.addEventListener('click', async function () {
            if (!state.currentInspectionOrder) return;
            const imei = document.getElementById('inspect-imei')?.value.trim();
            const remark = document.getElementById('inspect-remark')?.value.trim();
            const finalPrice = parseFloat(document.getElementById('inspect-final-price')?.value || 0);

            if (!imei) {
                SysUI.toast('请输入设备序列号或编号', 'warning');
                return;
            }
            if (finalPrice <= 0) {
                SysUI.toast('最终价格必须大于 0 元', 'warning');
                return;
            }

            const payload = {
                order_id: state.currentInspectionOrder.id,
                imei,
                remark,
                inspection_price: finalPrice,
                real_photos: [],
                actual_item_ids: []
            };

            const submitRes = await api.post('/admin/inspection/submit', payload);
            if (submitRes && submitRes.code === 200) {
                SysUI.toast(submitRes.msg, 'success');
                if (typeof window.navigateToTab === 'function') {
                    window.navigateToTab('orders');
                } else if (typeof window.render === 'function') {
                    state.currentTab = 'orders';
                    window.render();
                }
            } else {
                SysUI.toast(submitRes ? submitRes.msg : '提交失败', 'error');
            }
        });
    }

    function showInspectionDetail(order) {
        state.currentInspectionOrder = order;
        const box = document.getElementById('inspection-workbench-box');
        if (!box) return;
        box.style.display = 'block';

        document.getElementById('inspect-order-title').innerText = `正在验收：${order.device_name} (单号: ${order.order_sn})`;
        document.getElementById('inspect-order-status').innerHTML = getStatusBadge(order.status);
        const couponAdd = parseFloat(order.coupon_add_price || 0);
        if (couponAdd > 0) {
            document.getElementById('inspect-initial-price').innerHTML = `¥ ${order.estimate_price} <span style="font-size:12px;color:#dc2626;background:#fef2f2;border:1px solid #fecaca;border-radius:4px;padding:2px 6px;margin-left:6px;font-weight:normal;">含券补贴 +¥${couponAdd.toFixed(2)}</span>`;
        } else {
            document.getElementById('inspect-initial-price').innerText = `¥ ${order.estimate_price}`;
        }
        document.getElementById('inspect-final-price').value = order.final_price || order.estimate_price;

        if (order.inspection) {
            document.getElementById('inspect-imei').value = order.inspection.imei || '';
            document.getElementById('inspect-remark').value = order.inspection.inspector_remark || '';
        }

        let detailsHtml = '';
        if (order.details && order.details.length > 0) {
            order.details.forEach(d => {
                detailsHtml += `<div>• <strong>${escapeHtml(d.question_title)}:</strong> ${escapeHtml(d.item_name)}</div>`;
            });
        } else {
            detailsHtml = '<div style="color:#94a3b8;">暂无评估明细</div>';
        }

        const fMap = { 'home': '上门回收', 'mail': '快递邮寄', 'store': '门店到访' };
        const pMap = { 'alipay': '支付宝收款', 'bank': '银行转账', 'wechat': '微信支付', 'cash': '现金结清' };
        const payoutSummary = `
            <div style="margin-top:10px;padding:8px 10px;background:#fff;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;line-height:1.6;">
                <div><strong>回收方式:</strong> ${escapeHtml(fMap[order.fulfillment_type] || order.fulfillment_type || '-')}</div>
                <div><strong>收款方式:</strong> ${escapeHtml(pMap[order.payout_type] || order.payout_type || '-')}${order.payout_account ? ` (${escapeHtml(order.payout_account)})` : ''}</div>
            </div>
        `;

        document.getElementById('inspect-initial-details').innerHTML = detailsHtml + payoutSummary;
    }

    window.renderInspectionView = renderInspectionView;
})(window);
