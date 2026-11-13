/**
 * 启灵同城服务系统 - 前端 API 请求客户端模块
 * 职责：封装与后端的 JSON API 请求、文件上传、Token 校验与鉴权失效处理
 * 编码：UTF-8 无 BOM
 */
(function (window) {
    'use strict';

    const api = {
        baseUrl: '../index.php',

        /**
         * 发起标准 API 请求
         */
        async request(endpoint, method = 'GET', data = null) {
            const token = window.state ? window.state.token : (localStorage.getItem('ql_admin_token') || '');
            
            // 规范化 URL 路由与参数拆分：
            // 若 endpoint 中包含 '?'（如 /admin/store/list?keyword=xxx），将问号后的参数剥离为标准 '&' 键值对，
            // 杜绝产生双问号导致服务端路由变量 $s 误将参数识别为 Action 方法名
            let cleanEndpoint = endpoint;
            let extraQuery = '';
            const qIdx = endpoint.indexOf('?');
            const ampIdx = endpoint.indexOf('&');
            if (qIdx !== -1) {
                cleanEndpoint = endpoint.substring(0, qIdx);
                extraQuery = '&' + endpoint.substring(qIdx + 1);
            } else if (ampIdx !== -1) {
                cleanEndpoint = endpoint.substring(0, ampIdx);
                extraQuery = '&' + endpoint.substring(ampIdx + 1);
            }

            let url = `${this.baseUrl}?s=${cleanEndpoint}${extraQuery}&token=${encodeURIComponent(token)}`;
            const options = {
                method,
                headers: { 'Content-Type': 'application/json' }
            };
            if (token) {
                options.headers['Authorization'] = 'Bearer ' + token;
            }
            const entryKey = localStorage.getItem('ql_admin_entry_key') || '';
            if (entryKey) {
                options.headers['X-Admin-Entry-Key'] = entryKey;
            }

            if (data && (method === 'POST' || method === 'PUT')) {
                options.body = JSON.stringify(data);
            }

            try {
                const res = await fetch(url, options);
                const json = await res.json();

                if (json.code === 401) {
                    if (window.state) window.state.token = '';
                    localStorage.removeItem('ql_admin_token');
                    if (typeof window.render === 'function') {
                        window.render();
                    }
                    return null;
                }
                return json;
            } catch (err) {
                console.error('API 请求异常:', err);
                if (window.SysUI) {
                    window.SysUI.toast('网络开小差了，请检查服务端连接', 'error');
                }
                return null;
            }
        },

        get(endpoint, params = null) {
            let targetUrl = endpoint;
            if (params && typeof params === 'object') {
                const queryParts = [];
                for (const [k, v] of Object.entries(params)) {
                    if (v !== undefined && v !== null) {
                        queryParts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
                    }
                }
                if (queryParts.length > 0) {
                    const sep = targetUrl.includes('?') ? '&' : (targetUrl.includes('&') ? '&' : '?');
                    targetUrl += sep + queryParts.join('&');
                }
            }
            return this.request(targetUrl, 'GET');
        },

        post(endpoint, data) {
            return this.request(endpoint, 'POST', data);
        },

        /**
         * 表单/图片文件上传
         */
        async upload(endpoint, formData) {
            const token = window.state ? window.state.token : (localStorage.getItem('ql_admin_token') || '');
            let rawEndpoint = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
            let cleanEndpoint = rawEndpoint;
            let extraQuery = '';
            const qIdx = rawEndpoint.indexOf('?');
            if (qIdx !== -1) {
                cleanEndpoint = rawEndpoint.substring(0, qIdx);
                extraQuery = '&' + rawEndpoint.substring(qIdx + 1);
            }
            let url = `${this.baseUrl}?s=${cleanEndpoint}${extraQuery}&token=${encodeURIComponent(token)}`;
            const headers = {};
            if (token) {
                headers['Authorization'] = 'Bearer ' + token;
            }
            const entryKey = localStorage.getItem('ql_admin_entry_key') || '';
            if (entryKey) {
                headers['X-Admin-Entry-Key'] = entryKey;
            }

            try {
                const res = await fetch(url, {
                    method: 'POST',
                    headers,
                    body: formData
                });
                return await res.json();
            } catch (err) {
                console.error('上传网络异常:', err);
                if (window.SysUI) {
                    window.SysUI.toast('上传文件出现网络异常，请重试', 'error');
                }
                return null;
            }
        }
    };

    window.api = api;
})(window);
