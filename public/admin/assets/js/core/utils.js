/**
 * 启灵回收系统 - 前端通用工具模块
 * 职责：XSS 安全转义、时间格式化、剪贴板复制等底层工具
 * 编码：UTF-8 无 BOM
 */
(function (window) {
    'use strict';

    /**
     * XSS 安全转义防护
     * @param {*} str 原始字符串
     * @returns {string} 转义后安全 HTML
     */
    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * 格式化 UNIX 时间戳
     * @param {number|string} ts 秒级时间戳
     * @returns {string} 格式化日期时间
     */
    function formatTime(ts) {
        if (!ts) return '-';
        const d = new Date(ts * 1000);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }

    /**
     * 复制文本到系统剪贴板
     * @param {string} text 要复制的文本
     */
    function copyToClipboard(text) {
        if (!text) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                if (window.SysUI) window.SysUI.toast('已成功复制到剪贴板！', 'success');
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
                if (window.SysUI) window.SysUI.toast('已成功复制到剪贴板！', 'success');
            } catch (e) {
                if (window.SysUI) window.SysUI.toast('复制失败，请手动选择复制', 'warning');
            }
            document.body.removeChild(ta);
        }
    }

    window.escapeHtml = escapeHtml;
    window.formatTime = formatTime;
    window.copyToClipboard = copyToClipboard;
})(window);
