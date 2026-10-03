/**
 * 启灵回收系统 - 回收订单全生命周期管理视图
 * 职责：订单查询、状态流转、详情弹窗、质检快捷跳转、删除与数据导出
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

    function reloadOrders() {
        if (typeof window.loadTabContent === 'function') {
            window.loadTabContent('orders');
        } else {
            const box = document.getElementById('tab-content');
            if (box && typeof window.renderOrdersView === 'function') {
                window.renderOrdersView(box);
            }
        }
    }
    async function renderOrdersView(container) {
        container.innerHTML = `
            <div class="card">
                <div class="toolbar" style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;">
                    <input type="text" class="form-control" id="order-kw" placeholder="搜索单号 / 手机号 / 物流单号" style="width:240px;">
                    <select class="form-control" id="order-status-filter" style="width:160px;">
                        <option value="all">全部订单状态</option>
                        <option value="pending_send">待发货/待寄出</option>
                        <option value="in_transit">物流运输中</option>
                        <option value="received">已签收/待质检</option>
                        <option value="inspecting">质检复核中</option>
                        <option value="price_confirming">差价协商中</option>
                        <option value="completed">已成交/待打款</option>
                        <option value="paid">已放款/款项已结清</option>
                        <option value="refunded">已退货/已返还</option>
                        <option value="cancelled">已取消</option>
                    </select>
                    <select class="form-control" id="order-fulfillment-filter" style="width:150px;">
                        <option value="all">全部回收方式</option>
                        <option value="mail">快速寄送</option>
                        <option value="store">门店到访</option>
                        <option value="home">上门回收</option>
                    </select>
                    <button class="btn btn-primary" id="btn-search-orders">筛选</button>
                </div>
                <div id="orders-table-box" style="margin-top:16px;">加载订单中...</div>
            </div>
        `;

        async function loadOrders() {
            const kw = document.getElementById('order-kw')?.value.trim() || '';
            const status = document.getElementById('order-status-filter')?.value || 'all';
            const fulfillment = document.getElementById('order-fulfillment-filter')?.value || 'all';

            const res = await api.get(`/admin/order/list&keyword=${encodeURIComponent(kw)}&status=${encodeURIComponent(status)}&fulfillment_type=${encodeURIComponent(fulfillment)}&page=1&page_size=50`);
            if (res && res.code === 200) {
                const list = res.data.list || [];
                if (list.length === 0) {
                    document.getElementById('orders-table-box').innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;">暂无订单数据</div>';
                    return;
                }

                let rows = '';
                const fulfillmentBadgeMap = {
                    'home': '<span class="badge badge-home">预约上门</span>',
                    'mail': '<span class="badge badge-mail">快速寄送</span>',
                    'store': '<span class="badge badge-store">门店自送</span>'
                };
                const payoutBadgeMap = {
                    'alipay': '<span class="badge badge-alipay">支付宝</span>',
                    'bank': '<span class="badge badge-bank">银行转账</span>',
                    'wechat': '<span class="badge badge-wechat">微信钱包</span>',
                    'cash': '<span class="badge badge-cash">现金结清</span>'
                };

                list.forEach(o => {
                    const expressText = o.express_sn ? `<br><small style="color:#64748b;">${escapeHtml(o.express_company || '顺丰速运')}: ${escapeHtml(o.express_sn)}</small>` : '';
                    const fBadge = fulfillmentBadgeMap[o.fulfillment_type] || `<span class="badge badge-gray">${escapeHtml(o.fulfillment_type || '-')}</span>`;
                    let mailSubBadge = '';
                    if (o.fulfillment_type === 'mail') {
                        mailSubBadge = o.mail_sub_type === 'self_delivery'
                            ? '<br><span class="badge" style="background:#f1f5f9;color:#475569;font-size:10px;margin-top:2px;">自行寄送</span>'
                            : '<br><span class="badge" style="background:#e0f2fe;color:#0369a1;font-size:10px;margin-top:2px;">顺丰上门</span>';
                    }
                    const storeText = (o.fulfillment_type === 'store' && o.store_name) ? `<br><small style="color:#2563eb;font-weight:600;">🏬 ${escapeHtml(o.store_name)}</small>` : '';
                    const pBadge = payoutBadgeMap[o.payout_type] || `<span class="badge badge-gray">${escapeHtml(o.payout_type || '未指定')}</span>`;
                    const pAccount = o.payout_account ? `<br><small style="color:#0284c7;font-family:monospace;font-weight:600;" title="收款账户">${escapeHtml(o.payout_account)}</small>` : '';
                    const subsidyBadge = parseFloat(o.subsidy_amount || 0) > 0 
                        ? `<br><span class="badge" style="background:#ffedd5;color:#c2410c;font-size:10px;margin-top:2px;">🎁 补贴 ¥${escapeHtml(o.subsidy_amount)}</span>` 
                        : '';
                    const couponBadge = parseFloat(o.coupon_add_price || 0) > 0
                        ? `<br><span class="badge" style="background:#fef2f2;color:#dc2626;border:1px solid #fecaca;font-size:10px;margin-top:2px;">🎟️ 券加价 +¥${escapeHtml(o.coupon_add_price)}</span>`
                        : '';
                    const shippingFeeBadge = parseFloat(o.shipping_fee || 0) > 0 
                        ? `<br><span class="badge" style="background:#fdf4ff;color:#a21caf;border:1px solid #f0abfc;font-size:10px;margin-top:2px;">📦 顺丰运费 ¥${escapeHtml(o.shipping_fee)} (${escapeHtml(o.shipping_real_weight || o.shipping_weight || '0.00')}kg)</span>` 
                        : '';
                    const isConfirming = o.status === 'price_confirming';

                    rows += `<tr>
                        <td><strong>${escapeHtml(o.order_sn)}</strong>${expressText}${shippingFeeBadge}</td>
                        <td><strong>${escapeHtml(o.device_name)}</strong></td>
                        <td>${fBadge}${mailSubBadge}${storeText}</td>
                        <td>${pBadge}${pAccount}</td>
                        <td>¥ ${escapeHtml(o.estimate_price)}</td>
                        <td><strong style="color:#10b981;">¥ ${escapeHtml(o.final_price || o.estimate_price)}</strong>${subsidyBadge}${couponBadge}</td>
                        <td>${getStatusBadge(o.status)}</td>
                        <td>${escapeHtml(o.contact_name)}<br><small style="color:#64748b;">${escapeHtml(o.contact_mobile)}</small></td>
                        <td>${formatTime(o.created_at)}</td>
                        <td>
                            <div style="display:flex;gap:6px;flex-wrap:wrap;">
                                <button class="btn btn-secondary" style="height:28px;padding:0 8px;font-size:12px;" onclick="window.viewOrderDetail(${o.id})">详情</button>
                                ${isConfirming ? `
                                    <button class="btn" style="height:28px;padding:0 8px;font-size:12px;background:#ea580c;color:#fff;font-weight:600;" onclick="window.openNegotiationModal(${o.id}, '${escapeHtml(o.order_sn)}', '${escapeHtml(o.estimate_price)}', '${escapeHtml(o.final_price || o.estimate_price)}', '${escapeHtml(o.subsidy_amount || 0)}', '${escapeHtml(o.negotiation_remark || '')}')">协商还价</button>
                                ` : ''}
                                <button class="btn btn-primary" style="height:28px;padding:0 8px;font-size:12px;" onclick="window.openStatusModal(${o.id}, '${escapeHtml(o.order_sn)}', '${escapeHtml(o.status)}', '${escapeHtml(o.express_sn || '')}', '${escapeHtml(o.refund_express_sn || '')}', '${escapeHtml(o.express_company || '顺丰速运')}')">流转</button>
                                <button class="btn btn-warning" style="height:28px;padding:0 8px;font-size:12px;background:#f59e0b;color:#fff;" onclick="window.jumpToInspection('${escapeHtml(o.order_sn)}')">质检</button>
                                <button class="btn btn-danger" style="height:28px;padding:0 8px;font-size:12px;background:#ef4444;color:#fff;" onclick="window.deleteOrder(${o.id})">删除</button>
                            </div>
                        </td>
                    </tr>`;
                });

                document.getElementById('orders-table-box').innerHTML = `
                    <table class="data-table">
                        <thead>
                            <tr><th>订单号/物流</th><th>商品名称</th><th>回收方式</th><th>收款渠道与账户</th><th>预估价</th><th>最终成交价</th><th>当前状态</th><th>联系人</th><th>下单时间</th><th>操作</th></tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                `;
            }
        }

        document.getElementById('btn-search-orders')?.addEventListener('click', loadOrders);
        loadOrders();
    }

    // 复制剪贴板通用函数
    window.copyToClipboard = function (text) {
        if (!text) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                SysUI.toast('账号已成功复制到剪贴板！', 'success');
            }).catch(() => {
                fallbackCopy(text);
            });
        } else {
            fallbackCopy(text);
        }
        function fallbackCopy(str) {
            const ta = document.createElement('textarea');
            ta.value = str;
            document.body.appendChild(ta);
            ta.select();
            try {
                document.execCommand('copy');
                SysUI.toast('账号已成功复制到剪贴板！', 'success');
            } catch(e) {
                SysUI.toast('复制失败，请手动选择复制', 'warning');
            }
            document.body.removeChild(ta);
        }
    };

    // 查看订单详情弹窗
    window.viewOrderDetail = async function (id) {
        const res = await api.get(`/admin/order/detail&id=${id}`);
        if (!res || res.code !== 200) return;
        const o = res.data;

        let detailsHtml = '';
        (o.details || []).forEach(d => {
            detailsHtml += `<div style="padding:4px 0;">• <strong>${escapeHtml(d.question_title)}:</strong> ${escapeHtml(d.item_name)} <span style="color:#dc2626;font-size:12px;">(${d.deduct_amount < 0 ? d.deduct_amount + '元' : '无扣减'})</span></div>`;
        });

        let inspectionHtml = '';
        if (o.inspection) {
            inspectionHtml = `
                <div style="background:#f8fafc;padding:12px;border-radius:8px;margin-top:10px;border-left:3px solid #10b981;">
                    <p style="font-weight:600;color:#0f172a;">质检验收结果:</p>
                    <p>设备序列号/编号: <strong>${escapeHtml(o.inspection.imei)}</strong></p>
                    <p>质检最终成交价: <strong style="color:#10b981;font-size:16px;">¥ ${escapeHtml(o.inspection.inspection_price)}</strong></p>
                    <p>质检备注: ${escapeHtml(o.inspection.inspector_remark || '无特殊说明')}</p>
                </div>
            `;
        }

        let payoutInfoHtml = '';
        const payoutBadgeMap = {
            'alipay': '<span class="badge badge-alipay">支付宝收款</span>',
            'bank': '<span class="badge badge-bank">银行转账</span>',
            'wechat': '<span class="badge badge-wechat">微信钱包</span>',
            'cash': '<span class="badge badge-cash">现场现金结清</span>'
        };
        const pBadge = payoutBadgeMap[o.payout_type] || `<span class="badge badge-gray">${escapeHtml(o.payout_type || '未指定结算渠道')}</span>`;
        if (o.payout_type || o.payout_account) {
            payoutInfoHtml = `
                <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:12px 14px;margin:12px 0;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                        <strong style="color:#0369a1;font-size:13px;display:flex;align-items:center;gap:6px;">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
                            客户收款账户
                        </strong>
                        ${pBadge}
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;color:#334155;">
                        <div><strong>认证姓名:</strong> ${escapeHtml(o.payout_name || o.contact_name || '-')}</div>
                        <div><strong>开户机构:</strong> ${escapeHtml(o.payout_bank || (o.payout_type === 'alipay' ? '支付宝' : (o.payout_type === 'wechat' ? '微信支付' : '-')))}</div>
                    </div>
                    ${o.payout_account ? `
                        <div style="margin-top:8px;padding-top:8px;border-top:1px dashed #bae6fd;display:flex;justify-content:space-between;align-items:center;">
                            <span>收款账号: <strong style="font-family:monospace;font-size:14px;color:#0284c7;">${escapeHtml(o.payout_account)}</strong></span>
                            <button class="btn btn-secondary" style="height:24px;padding:0 8px;font-size:12px;" onclick="window.copyToClipboard('${escapeHtml(o.payout_account)}')">复制账号</button>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        let appraisalModeHtml = o.appraisal_mode === 'quick' 
            ? `<span class="badge" style="background:#fef3c7;color:#b45309;font-weight:600;">⚡ 极速估价 (${escapeHtml(o.quick_tier_name || '标准档')})</span>`
            : `<span class="badge" style="background:#e0f2fe;color:#0369a1;font-weight:600;">🔬 专业精准自检</span>`;

        let negotiationHtml = '';
        if (parseFloat(o.subsidy_amount) > 0 || o.negotiation_status) {
            const statusMap = {
                'pending': '<span class="badge badge-warning" style="background:#ea580c;color:#fff;">待用户确认</span>',
                'accepted': '<span class="badge badge-success">用户已接受补贴成交</span>',
                'rejected': '<span class="badge badge-danger">用户已拒绝</span>'
            };
            const nBadge = statusMap[o.negotiation_status] || '<span class="badge badge-gray">协商处理中</span>';
            negotiationHtml = `
                <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:12px 14px;margin:12px 0;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                        <strong style="color:#c2410c;font-size:13px;display:flex;align-items:center;gap:6px;">
                            🎁 差价协商与客服专享补贴
                        </strong>
                        ${nBadge}
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;color:#334155;">
                        <div><strong>专享补贴加价:</strong> <span style="color:#ea580c;font-weight:bold;font-size:15px;">+¥ ${escapeHtml(o.subsidy_amount || 0)}</span></div>
                        <div><strong>协商后总成交价:</strong> <span style="color:#10b981;font-weight:bold;font-size:15px;">¥ ${escapeHtml(o.final_price || o.estimate_price)}</span></div>
                    </div>
                    <div style="margin-top:6px;font-size:12px;color:#7c2d12;">
                        <strong>客服协商寄语:</strong> ${escapeHtml(o.negotiation_remark || '暂无留言说明')}
                    </div>
                </div>
            `;
        }

        let sfShippingHtml = '';
        const shippingFeeNum = parseFloat(o.shipping_fee) || 0;
        const shippingWeightNum = parseFloat(o.shipping_weight) || 0;
        const shippingRealWeightNum = parseFloat(o.shipping_real_weight) || 0;
        if (shippingFeeNum > 0 || shippingWeightNum > 0 || shippingRealWeightNum > 0 || (o.express_company === '顺丰速运' && o.express_sn) || o.shipping_courier_phone || o.shipping_dispatch_status) {
            let feeDetailList = [];
            if (o.shipping_fee_detail) {
                try {
                    const parsed = typeof o.shipping_fee_detail === 'string' ? JSON.parse(o.shipping_fee_detail) : o.shipping_fee_detail;
                    if (Array.isArray(parsed)) feeDetailList = parsed;
                } catch(e) {}
            }
            let feeDetailRows = '';
            feeDetailList.forEach(f => {
                feeDetailRows += `<div>• ${escapeHtml(f.feeTypeName || '运费项')}: <strong>¥${escapeHtml(f.feeAmt || '0.00')}</strong></div>`;
            });

            const finalPriceNum = parseFloat(o.final_price || o.estimate_price) || 0;
            const netAmount = Math.max(0, finalPriceNum - shippingFeeNum);

            // 解析顺丰增量路由轨迹时间轴
            let routeList = [];
            if (o.shipping_routes) {
                try {
                    const parsedR = typeof o.shipping_routes === 'string' ? JSON.parse(o.shipping_routes) : o.shipping_routes;
                    if (Array.isArray(parsedR)) routeList = parsedR;
                } catch(e) {}
            }
            let routeTimelineHtml = '';
            if (routeList.length > 0) {
                let itemsHtml = '';
                routeList.slice(0, 10).forEach((r, idx) => {
                    const isLatest = idx === 0;
                    itemsHtml += `
                        <div style="display:flex;gap:10px;font-size:12px;margin-bottom:6px;line-height:1.4;">
                            <span style="color:#64748b;font-family:monospace;white-space:nowrap;">${escapeHtml(r.acceptTime || '')}</span>
                            <span style="color:${isLatest ? '#16a34a;font-weight:700;' : '#475569;'}">${escapeHtml(r.remark || '')} ${r.acceptAddress ? `<small style="color:#94a3b8;">(${escapeHtml(r.acceptAddress)})</small>` : ''}</span>
                        </div>
                    `;
                });
                routeTimelineHtml = `
                    <div style="margin-top:10px;padding-top:8px;border-top:1px dashed #f5d0fe;">
                        <div style="font-size:12px;font-weight:700;color:#86198f;margin-bottom:6px;display:flex;align-items:center;gap:4px;">
                            <span>🚚</span> 顺丰实时物流轨迹动态 (${routeList.length} 个节点)
                        </div>
                        <div style="background:#fff;padding:8px 12px;border-radius:6px;border:1px solid #f5d0fe;max-height:160px;overflow-y:auto;">
                            ${itemsHtml}
                        </div>
                    </div>
                `;
            }

            let courierInfoHtml = '';
            if (o.shipping_courier_phone || o.shipping_dispatch_status) {
                courierInfoHtml = `
                    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:8px 10px;margin-bottom:8px;font-size:12px;color:#1e40af;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">
                        <div>
                            <span>🛵 取件快递员: <strong>${escapeHtml(o.shipping_courier_phone || '顺丰派员中')}</strong></span>
                            ${o.shipping_courier_name ? `<span style="color:#64748b;margin-left:6px;">(工号: ${escapeHtml(o.shipping_courier_name)})</span>` : ''}
                        </div>
                        <div>
                            <span class="badge" style="background:#dbeafe;color:#1d4ed8;">${escapeHtml(o.shipping_dispatch_status || '调度成功')}</span>
                        </div>
                    </div>
                `;
            }

            sfShippingHtml = `
                <div style="background:#fdf4ff;border:1px solid #f0abfc;border-radius:8px;padding:12px 14px;margin:12px 0;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                        <strong style="color:#86198f;font-size:13px;display:flex;align-items:center;gap:6px;">
                            <span>📦</span> 顺丰速运称重、运费与物流轨迹 (速运API)
                        </strong>
                        <span class="badge" style="background:#fae8ff;color:#a21caf;font-weight:700;">${shippingFeeNum > 0 ? '顺丰推送已核算' : (routeList.length > 0 ? '物流实时更新中' : '等待顺丰推送')}</span>
                    </div>
                    ${courierInfoHtml}
                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;font-size:12px;background:#fff;padding:8px 10px;border-radius:6px;border:1px solid #f5d0fe;margin-bottom:8px;">
                        <div>实际称重: <strong style="color:#0f172a;">${shippingRealWeightNum.toFixed(2)} kg</strong></div>
                        <div>计费重量: <strong style="color:#0f172a;">${shippingWeightNum.toFixed(2)} kg</strong></div>
                        <div>实扣运费: <strong style="color:#c026d3;font-size:14px;">¥ ${shippingFeeNum.toFixed(2)}</strong></div>
                    </div>
                    ${feeDetailRows ? `
                        <div style="font-size:11px;color:#701a75;margin-bottom:6px;display:flex;gap:12px;flex-wrap:wrap;">
                            ${feeDetailRows}
                        </div>
                    ` : ''}
                    <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#86198f;border-top:1px dashed #f5d0fe;padding-top:6px;">
                        <span>成交出账: ¥${finalPriceNum.toFixed(2)} - 顺丰运费: ¥${shippingFeeNum.toFixed(2)}</span>
                        <span><strong>综合收支实计:</strong> <strong style="color:#16a34a;font-size:13px;">¥ ${netAmount.toFixed(2)}</strong></span>
                    </div>
                    ${routeTimelineHtml}
                </div>
            `;
        }

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-card" style="max-width:650px;">
                <div class="modal-header">
                    <span>订单详情 - ${escapeHtml(o.order_sn)}</span>
                    <span style="cursor:pointer;font-size:18px;" onclick="this.closest('.modal-overlay').remove()">✕</span>
                </div>
                <div class="modal-body" style="font-size:13px;line-height:1.8;">
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
                        <div><strong>回收商品:</strong> ${escapeHtml(o.device_name)}</div>
                        <div><strong>回收方式:</strong> ${o.fulfillment_type === 'mail' ? ('快速寄送 (' + (o.mail_sub_type === 'self_delivery' ? '自行寄送' : '顺丰上门取件') + ')') : (o.fulfillment_type === 'store' ? ('线下门店自送' + (o.store_name ? ` (网点: ${escapeHtml(o.store_name)})` : '')) : '预约免费上门')}</div>
                        <div><strong>评估模式:</strong> ${appraisalModeHtml}</div>
                        <div><strong>预估金额:</strong> <span style="color:#1e58ff;font-weight:bold;">¥ ${escapeHtml(o.estimate_price)}</span></div>
                        <div><strong>加价补贴券:</strong> ${parseFloat(o.coupon_add_price || 0) > 0 ? `<span style="color:#dc2626;font-weight:bold;">+¥ ${escapeHtml(o.coupon_add_price)} (已享现金加码)</span>` : '<span style="color:#94a3b8;">未使用</span>'}</div>
                        <div><strong>最终成交价:</strong> <span style="color:#10b981;font-weight:bold;">¥ ${escapeHtml(o.final_price || o.estimate_price)}</span></div>
                        <div><strong>联系人:</strong> ${escapeHtml(o.contact_name)} (${escapeHtml(o.contact_mobile)})</div>
                    </div>
                    ${payoutInfoHtml}
                    ${negotiationHtml}
                    ${sfShippingHtml}
                    ${o.fulfillment_type === 'store' ? `<p><strong>服务网点:</strong> <span style="color:#2563eb;font-weight:700;">🏬 ${escapeHtml(o.store_name || '官方推荐服务网点')}</span></p>` : `<p><strong>取件/收货地址:</strong> ${escapeHtml(o.contact_address || '未提供详细地址')}</p>`}
                    <p><strong>预约时间:</strong> ${escapeHtml(o.appointment_time || '即刻处理')}</p>
                    <div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
                        <strong>物流/寄送单号:</strong>
                        <span>${escapeHtml(o.express_company || '顺丰速运')}</span>
                        <code style="font-size:14px;color:#0284c7;font-weight:700;">${escapeHtml(o.express_sn || '暂未生成')}</code>
                        ${o.express_sn ? `
                            <button class="btn btn-secondary" style="height:24px;padding:0 8px;font-size:11px;" onclick="window.copyToClipboard('${escapeHtml(o.express_sn)}')">复制单号</button>
                        ` : ''}
                        ${o.fulfillment_type === 'mail' ? `
                            <button class="btn btn-primary" style="height:26px;padding:0 10px;font-size:12px;background:#0284c7;border-color:#0284c7;" onclick="window.callSfExpress(${o.id})">
                                ${o.express_sn ? '🔄 重新呼叫顺丰' : '📦 呼叫顺丰上门揽件'}
                            </button>
                        ` : ''}
                    </div>
                    <p><strong>退货返还物流:</strong> ${escapeHtml(o.refund_express_sn || '无')}</p>
                    <p><strong>订单留言:</strong> ${escapeHtml(o.user_remark || '无')}</p>
                    <hr style="margin:12px 0;border:none;border-top:1px dashed #e2e8f0;">
                    <p style="font-weight:600;margin-bottom:6px;">用户评估选项明细:</p>
                    ${detailsHtml || '<div style="color:#94a3b8;">无选项数据</div>'}
                    ${inspectionHtml}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">关闭</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    };

    // 差价协商与专享补贴弹窗 (客服还价)
    window.openNegotiationModal = function (orderId, orderSn, estimatePrice, currentFinalPrice, currentSubsidy, currentRemark) {
        const estNum = parseFloat(estimatePrice) || 0;
        const curFinalNum = parseFloat(currentFinalPrice) || 0;
        const curSubNum = parseFloat(currentSubsidy) || 0;
        const baseInspectPrice = Math.max(0, curFinalNum - (curSubNum > 0 ? curSubNum : 0));

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-card" style="max-width:540px;">
                <div class="modal-header">
                    <span style="display:flex;align-items:center;gap:8px;">
                        <span style="font-size:18px;">🎁</span> 差价协商与专享补贴 - ${escapeHtml(orderSn)}
                    </span>
                    <span style="cursor:pointer;font-size:18px;" onclick="this.closest('.modal-overlay').remove()">✕</span>
                </div>
                <div class="modal-body" style="font-size:13px;line-height:1.6;">
                    <div style="background:#f8fafc;padding:12px;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:14px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center;">
                        <div>
                            <div style="color:#64748b;font-size:12px;">用户初评预估价</div>
                            <div style="font-weight:bold;color:#1e58ff;font-size:15px;margin-top:2px;">¥ ${estNum.toFixed(2)}</div>
                        </div>
                        <div>
                            <div style="color:#64748b;font-size:12px;">质检核定原价</div>
                            <div style="font-weight:bold;color:#475569;font-size:15px;margin-top:2px;">¥ ${baseInspectPrice.toFixed(2)}</div>
                        </div>
                        <div>
                            <div style="color:#64748b;font-size:12px;">质检差价</div>
                            <div style="font-weight:bold;color:#dc2626;font-size:15px;margin-top:2px;">-¥ ${(estNum - baseInspectPrice > 0 ? (estNum - baseInspectPrice).toFixed(2) : '0.00')}</div>
                        </div>
                    </div>

                    <div class="login-form-group" style="margin-bottom:12px;">
                        <label style="font-weight:600;display:flex;justify-content:space-between;align-items:center;">
                            <span>专享加价补贴金额 (元)</span>
                            <span style="color:#64748b;font-size:12px;font-weight:normal;">快捷加价:</span>
                        </label>
                        <div style="display:flex;gap:6px;margin-bottom:8px;">
                            <button type="button" class="btn btn-secondary quick-sub-btn" data-val="30" style="padding:3px 10px;font-size:12px;">+30元</button>
                            <button type="button" class="btn btn-secondary quick-sub-btn" data-val="50" style="padding:3px 10px;font-size:12px;">+50元</button>
                            <button type="button" class="btn btn-secondary quick-sub-btn" data-val="100" style="padding:3px 10px;font-size:12px;">+100元</button>
                            <button type="button" class="btn btn-secondary quick-sub-btn" data-val="200" style="padding:3px 10px;font-size:12px;">+200元</button>
                        </div>
                        <input type="number" id="modal-subsidy-amount" class="form-control" min="0" step="1" value="${curSubNum > 0 ? curSubNum : 50}" placeholder="请输入协商加价补贴金额" style="font-size:16px;font-weight:bold;color:#ea580c;">
                    </div>

                    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:10px 14px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;">
                        <span style="color:#9a3412;font-size:13px;">补贴后用户到手最终成交价：</span>
                        <strong id="modal-projected-price" style="color:#ea580c;font-size:18px;">¥ ${(baseInspectPrice + (curSubNum > 0 ? curSubNum : 50)).toFixed(2)}</strong>
                    </div>

                    <div class="login-form-group">
                        <label style="font-weight:600;display:flex;justify-content:space-between;align-items:center;">
                            <span>客服协商留言 / 挽单寄语</span>
                            <span style="color:#64748b;font-size:12px;font-weight:normal;">快捷填入说明模板</span>
                        </label>
                        <div style="display:flex;gap:6px;margin-bottom:6px;flex-wrap:wrap;">
                            <button type="button" class="btn btn-secondary template-btn" data-tmpl="尊敬的客户您好，经质检工程师复核，由于机器有轻微使用痕迹产生微小差价。为感谢您的信任与支持，特为您申请专享补贴红包，诚意为您加价结算，期待与您达成愉快合作！" style="padding:2px 8px;font-size:11px;">模版: 质检轻微痕迹补贴</button>
                            <button type="button" class="btn btn-secondary template-btn" data-tmpl="尊敬的客户，为您申请了本店特别关怀补贴，请您核对确认，我们将优先为您极速放款到账。" style="padding:2px 8px;font-size:11px;">模版: 特别关怀极速放款</button>
                        </div>
                        <textarea id="modal-subsidy-remark" class="form-control" rows="3" placeholder="例如：经质检复核存在轻微划痕，特为您申请加价补贴红包，请您查收确认！" style="resize:vertical;">${escapeHtml(currentRemark || '尊敬的客户您好，经质检复核成色与初评稍有出入。为感谢您的信任，特为您申请专享补贴红包加价成交，敬请核对查收！')}</textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">取消</button>
                    <button class="btn btn-primary" id="btn-submit-negotiation" style="background:#ea580c;border-color:#ea580c;">确认发送还价方案</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const subInput = modal.querySelector('#modal-subsidy-amount');
        const projPriceEl = modal.querySelector('#modal-projected-price');
        const remarkInput = modal.querySelector('#modal-subsidy-remark');

        function updateProjected() {
            const s = parseFloat(subInput.value) || 0;
            projPriceEl.textContent = '¥ ' + (baseInspectPrice + s).toFixed(2);
        }

        subInput?.addEventListener('input', updateProjected);

        modal.querySelectorAll('.quick-sub-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                subInput.value = btn.getAttribute('data-val');
                updateProjected();
            });
        });

        modal.querySelectorAll('.template-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                remarkInput.value = btn.getAttribute('data-tmpl');
            });
        });

        modal.querySelector('#btn-submit-negotiation')?.addEventListener('click', async function () {
            const subsidyAmount = parseFloat(subInput.value) || 0;
            const remark = remarkInput.value.trim();

            if (subsidyAmount <= 0) {
                SysUI.toast('请输入有效的加价补贴金额（大于0元）', 'warning');
                return;
            }

            const btn = this;
            btn.disabled = true;
            btn.textContent = '提交中...';

            const res = await api.post('/admin/order/proposeNegotiation', {
                order_id: orderId,
                subsidy_amount: subsidyAmount,
                remark: remark
            });

            if (res && res.code === 200) {
                SysUI.toast('差价协商补贴已成功发布！用户查单时即可看到协商红包', 'success');
                modal.remove();
                const searchBtn = document.getElementById('btn-search-orders');
                if (searchBtn) searchBtn.click();
            } else {
                SysUI.toast(res ? res.msg : '协商提交失败', 'error');
                btn.disabled = false;
                btn.textContent = '确认发送还价方案';
            }
        });
    };

    // 订单状态流转与单号录入弹窗
    window.openStatusModal = function (orderId, orderSn, currentStatus, currentSn, currentRefundSn, currentCompany) {
        const defaultCompany = currentCompany || '顺丰速运';
        const companies = ['顺丰速运', '京东快递', '中通快递', '圆通速递', '韵达快递', '极兔速递', '申通快递', '德邦快递', '中国邮政EMS', '其他快递'];
        let companyOptions = '';
        companies.forEach(c => {
            companyOptions += `<option value="${escapeHtml(c)}" ${defaultCompany === c ? 'selected' : ''}>${escapeHtml(c)}</option>`;
        });

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-card" style="max-width:500px;">
                <div class="modal-header">
                    <span>修改订单状态 - ${escapeHtml(orderSn)}</span>
                    <span style="cursor:pointer;" onclick="this.closest('.modal-overlay').remove()">✕</span>
                </div>
                <div class="modal-body">
                    <div class="login-form-group">
                        <label>更新当前订单状态</label>
                        <select id="modal-order-status" class="form-control" style="width:100%;">
                            <option value="pending_send" ${currentStatus === 'pending_send' ? 'selected' : ''}>待发货/待寄出</option>
                            <option value="in_transit" ${currentStatus === 'in_transit' ? 'selected' : ''}>物流运输中</option>
                            <option value="received" ${currentStatus === 'received' ? 'selected' : ''}>已签收 / 待质检</option>
                            <option value="inspecting" ${currentStatus === 'inspecting' ? 'selected' : ''}>质检复核中</option>
                            <option value="price_confirming" ${currentStatus === 'price_confirming' ? 'selected' : ''}>差价协商中</option>
                            <option value="completed" ${currentStatus === 'completed' ? 'selected' : ''}>已成交 / 待打款</option>
                            <option value="paid" ${currentStatus === 'paid' ? 'selected' : ''}>已放款 / 款项已结清</option>
                            <option value="refunded" ${currentStatus === 'refunded' ? 'selected' : ''}>已退货 / 返还用户</option>
                            <option value="cancelled" ${currentStatus === 'cancelled' ? 'selected' : ''}>订单已取消</option>
                        </select>
                    </div>
                    <div class="login-form-group">
                        <label>寄件快递公司</label>
                        <select id="modal-express-company" class="form-control" style="width:100%;">
                            ${companyOptions}
                        </select>
                    </div>
                    <div class="login-form-group">
                        <label style="display:flex;justify-content:space-between;align-items:center;">
                            <span>寄件物流单号</span>
                            <button type="button" class="btn btn-outline" style="height:22px;padding:0 8px;font-size:11px;color:#0284c7;border-color:#bae6fd;" onclick="window.callSfExpress(${orderId}, function(sn){ const el = document.getElementById('modal-express-sn'); if(el) el.value = sn; })">⚡ 顺丰一键下单</button>
                        </label>
                        <input type="text" id="modal-express-sn" class="form-control" value="${escapeHtml(currentSn)}" placeholder="例如: SF1234567890">
                    </div>
                    <div class="login-form-group">
                        <label>退货返还物流单号 (协商不一致退回时填写)</label>
                        <input type="text" id="modal-refund-sn" class="form-control" value="${escapeHtml(currentRefundSn)}" placeholder="退货返还单号">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">取消</button>
                    <button class="btn btn-primary" id="btn-save-order-status">保存修改</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('#btn-save-order-status')?.addEventListener('click', async function () {
            const newStatus = document.getElementById('modal-order-status')?.value;
            const expressCompany = document.getElementById('modal-express-company')?.value;
            const expressSn = document.getElementById('modal-express-sn')?.value.trim();
            const refundSn = document.getElementById('modal-refund-sn')?.value.trim();

            const res = await api.post('/admin/order/updateStatus', {
                id: orderId,
                status: newStatus,
                express_company: expressCompany,
                express_sn: expressSn,
                refund_express_sn: refundSn
            });

            if (res && res.code === 200) {
                SysUI.toast('订单状态更新成功！', 'success');
                modal.remove();
                reloadOrders();
            } else {
                SysUI.toast(res ? res.msg : '更新失败', 'error');
            }
        });
    };

    // 管理员针对订单一键呼叫顺丰速运揽件并生成官方运单号
    window.callSfExpress = async function (orderId, onSuccess) {
        const confirmed = await SysUI.confirm('即将向顺丰速运官方开放平台发起预约揽件请求，并自动生成运单号。\n\n确认现在呼叫顺丰速运？', {
            title: '呼叫顺丰速运上门揽件',
            type: 'info',
            confirmText: '确认呼叫'
        });
        if (!confirmed) return;

        SysUI.toast('正在请求顺丰开放平台下单接口，请稍候...', 'info');
        try {
            const res = await api.post('/admin/order/callSfExpress', { order_id: orderId });
            if (res && res.code === 200 && res.data) {
                const sn = res.data.waybill_no || '';
                SysUI.toast('顺丰速运下单成功！运单号：' + sn, 'success');
                if (typeof onSuccess === 'function') {
                    onSuccess(sn);
                }
                reloadOrders();
                // 若当前有打开的详情弹窗，关闭并重新载入详情
                const openDetailModal = document.querySelector('.modal-card .modal-header');
                if (openDetailModal && openDetailModal.textContent.includes('订单详情')) {
                    document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
                    window.viewOrderDetail(orderId);
                }
            } else {
                SysUI.toast(res ? res.msg : '顺丰下单未成功', 'error');
            }
        } catch (e) {
            SysUI.toast('网络通信异常，请检查顺丰接口参数配置', 'error');
        }
    };

    // 删除订单
    window.deleteOrder = async function (id) {
        const confirmed = await SysUI.confirm('确认删除该订单记录吗？删除后不可恢复。', {
            title: '删除订单',
            type: 'error',
            confirmText: '确认删除'
        });
        if (!confirmed) return;
        const res = await api.post('/admin/order/delete', { id });
        if (res && res.code === 200) {
            SysUI.toast('订单已删除', 'success');
            reloadOrders();
        } else {
            SysUI.toast(res ? res.msg : '删除失败', 'error');
        }
    };

    // 直通质检工作台
    window.jumpToInspection = function (orderSn) {
        if (typeof window.navigateToTab === 'function') {
            window.navigateToTab('inspection');
        } else if (typeof window.render === 'function') {
            state.currentTab = 'inspection';
            window.render();
        }
        setTimeout(() => {
            const input = document.getElementById('inspect-search-input');
            if (input) {
                input.value = orderSn;
                document.getElementById('btn-inspect-search')?.click();
            }
        }, 150);
    };

    // ==========================================

    window.renderOrdersView = renderOrdersView;
})(window);
