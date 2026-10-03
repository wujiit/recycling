/**
 * 启灵回收系统 - 前端全局状态与徽章模块
 * 职责：SPA 全局状态、用户登录态与单据状态徽章定义
 * 编码：UTF-8 无 BOM
 */
(function (window) {
    'use strict';

    // 全局响应式状态
    const state = {
        token: localStorage.getItem('ql_admin_token') || '',
        admin: JSON.parse(localStorage.getItem('ql_admin_info') || '{}'),
        currentTab: 'dashboard',
        currentTemplate: 'universal',
        templateMeta: {},
        categories: [],
        brands: [],
        devices: [],
        currentInspectionOrder: null
    };

    /**
     * 订单流转状态徽章转换
     * @param {string} status 状态码
     * @returns {string} 徽章 HTML
     */
    function getStatusBadge(status) {
        const map = {
            'pending_send': '<span class="badge badge-warning">待寄出/待到店/待拖运</span>',
            'in_transit': '<span class="badge badge-info">运输中</span>',
            'received': '<span class="badge badge-info" style="background:#dbeafe;color:#1e40af;">已签收/入库待检</span>',
            'inspecting': '<span class="badge badge-warning" style="background:#fef3c7;color:#92400e;">质检复核中</span>',
            'price_confirming': '<span class="badge badge-warning" style="background:#fed7aa;color:#9a3412;">差价协商中</span>',
            'completed': '<span class="badge badge-success">已成交/可打款</span>',
            'paid': '<span class="badge badge-success" style="background:#dcfce7;color:#15803d;font-weight:600;">已放款/款项已结清</span>',
            'refunded': '<span class="badge badge-danger">已退货/已返还</span>',
            'cancelled': '<span class="badge badge-gray">已取消</span>',
        };
        return map[status] || `<span class="badge badge-gray">${window.escapeHtml ? window.escapeHtml(status) : status}</span>`;
    }

    window.adminState = state;
    window.state = state; // 向下兼容
    window.getStatusBadge = getStatusBadge;
})(window);
