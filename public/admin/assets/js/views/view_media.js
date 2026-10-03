/**
 * 启灵回收系统 - 本地图片库与素材中心视图
 * 职责：图片资源统计看板、按目录筛选检索、本地上传、大图预览、直复制链接与安全删除
 * 编码：UTF-8 无 BOM
 */
(function (window) {
    'use strict';

    const SysUI = window.SysUI;
    const api = window.adminApi || window.api;
    const state = window.adminState || window.state;
    const escapeHtml = window.escapeHtml || function(s) { return s; };
    const formatTime = window.formatTime;
    async function renderMediaView(container) {
        let mediaState = {
            page: 1,
            limit: 24,
            source: 'all',
            keyword: ''
        };

        container.innerHTML = `
            <div class="card" style="padding:20px;">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
                    <div>
                        <h3 style="font-size:16px;font-weight:700;color:#0f172a;margin:0 0 4px 0;">图片库</h3>
                        <p style="font-size:12px;color:#64748b;margin:0;">管理系统内置图例与上传图片资源，支持快速搜索、在线预览、复制链接与上传删除</p>
                    </div>
                    <div style="display:flex;gap:8px;">
                        <input type="file" id="media-view-file-input" accept="image/*" style="display:none;">
                        <button type="button" class="btn btn-primary" id="btn-media-view-upload" style="display:flex;align-items:center;gap:6px;">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/></svg>
                            上传图片
                        </button>
                        <button type="button" class="btn btn-secondary" id="btn-media-view-refresh" style="display:flex;align-items:center;gap:6px;">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
                            刷新
                        </button>
                    </div>
                </div>

                <!-- 统计大屏 -->
                <div class="stat-grid">
                    <div class="stat-card" style="padding:16px;">
                        <div class="stat-icon stat-blue"><svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg></div>
                        <div>
                            <div class="stat-num" id="stat-media-total">-</div>
                            <div class="stat-label">总图片数</div>
                        </div>
                    </div>
                    <div class="stat-card" style="padding:16px;">
                        <div class="stat-icon stat-green"><svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></div>
                        <div>
                            <div class="stat-num" id="stat-media-default">-</div>
                            <div class="stat-label">系统预设图片</div>
                        </div>
                    </div>
                    <div class="stat-card" style="padding:16px;">
                        <div class="stat-icon stat-orange"><svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/></svg></div>
                        <div>
                            <div class="stat-num" id="stat-media-uploads">-</div>
                            <div class="stat-label">用户与自主上传</div>
                        </div>
                    </div>
                    <div class="stat-card" style="padding:16px;">
                        <div class="stat-icon stat-purple"><svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M2 20h20v-4H2v4zm2-3h2v2H4v-2zM2 4v4h20V4H2zm4 3H4V5h2v2zm-4 7h20v-4H2v4zm2-3h2v2H4v-2z"/></svg></div>
                        <div>
                            <div class="stat-num" id="stat-media-bytes">-</div>
                            <div class="stat-label">存储空间占用</div>
                        </div>
                    </div>
                </div>

                <!-- 检索与筛选栏 -->
                <div style="background:#f8fafc;padding:12px 16px;border-radius:8px;border:1px solid #e2e8f0;display:flex;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
                    <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:240px;">
                        <input type="text" id="media-search-input" class="form-control" style="height:36px;" placeholder="按图片名称搜索...">
                        <button type="button" class="btn btn-secondary" id="btn-media-search" style="height:36px;white-space:nowrap;">搜索</button>
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span style="font-size:13px;color:#64748b;white-space:nowrap;">来源分类:</span>
                        <select id="media-filter-source" class="form-control" style="height:36px;font-size:13px;width:auto;">
                            <option value="all">全部图片资源</option>
                            <option value="default">系统预设图例</option>
                            <option value="uploads">用户与自主上传</option>
                        </select>
                    </div>
                </div>

                <!-- 图片网格容器 -->
                <div id="media-grid-box" style="min-height:280px;position:relative;">
                    <div style="text-align:center;padding:40px;color:#94a3b8;">正在加载图片库...</div>
                </div>

                <!-- 分页控制栏 -->
                <div id="media-pagination-box" style="display:flex;justify-content:space-between;align-items:center;margin-top:20px;padding-top:16px;border-top:1px solid #f1f5f9;font-size:13px;color:#64748b;">
                </div>
            </div>
        `;

        async function loadMediaData() {
            const gridBox = document.getElementById('media-grid-box');
            const pageBox = document.getElementById('media-pagination-box');
            if (!gridBox) return;

            gridBox.innerHTML = '<div style="text-align:center;padding:50px;color:#94a3b8;">正在载入素材库资源...</div>';

            const query = `page=${mediaState.page}&limit=${mediaState.limit}&source=${encodeURIComponent(mediaState.source)}&keyword=${encodeURIComponent(mediaState.keyword)}`;
            const res = await api.get(`/admin/media/list&${query}`);

            if (!res || res.code !== 200 || !res.data) {
                gridBox.innerHTML = '<div style="text-align:center;padding:40px;color:#ef4444;">载入图片库失败，请稍后刷新重试</div>';
                return;
            }

            const { list, total, page, limit, total_pages, stats } = res.data;

            // 更新统计
            if (stats) {
                const totalEl = document.getElementById('stat-media-total');
                const defEl = document.getElementById('stat-media-default');
                const upEl = document.getElementById('stat-media-uploads');
                const byteEl = document.getElementById('stat-media-bytes');
                if (totalEl) totalEl.innerText = stats.total_count || 0;
                if (defEl) defEl.innerText = stats.default_count || 0;
                if (upEl) upEl.innerText = stats.upload_count || 0;
                if (byteEl) byteEl.innerText = stats.total_bytes_formatted || '0 B';
            }

            if (!list || list.length === 0) {
                gridBox.innerHTML = `
                    <div style="text-align:center;padding:60px 20px;color:#94a3b8;">
                        <svg viewBox="0 0 24 24" width="48" height="48" fill="#cbd5e1" style="margin-bottom:12px;"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
                        <div style="font-size:14px;color:#64748b;">未找到符合条件的图片素材</div>
                        <div style="font-size:12px;margin-top:4px;">可尝试更换搜索词或点击右上角上传新图片</div>
                    </div>
                `;
                if (pageBox) pageBox.innerHTML = '';
                return;
            }

            let cardsHtml = '';
            list.forEach(item => {
                const isDefault = item.source === 'default';
                const tagClass = isDefault ? 'tag-default' : 'tag-upload';
                const tagText = isDefault ? '系统预设' : '自主上传';

                cardsHtml += `
                    <div class="media-card">
                        <div class="media-thumb-wrap" onclick="window.openImagePreview('${escapeHtml(item.url)}')">
                            <span class="media-badge-tag ${tagClass}">${tagText}</span>
                            <img src="${escapeHtml(item.url)}" class="media-thumb-img" alt="${escapeHtml(item.name)}" loading="lazy">
                        </div>
                        <div class="media-info">
                            <div>
                                <div class="media-filename" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>
                                <div class="media-meta-line">
                                    <span>${escapeHtml(item.dimension || '-')}</span>
                                    <span>${escapeHtml(item.size_formatted)}</span>
                                </div>
                                <div class="media-meta-line" style="color:#94a3b8;font-size:10px;">
                                    ${escapeHtml(item.mtime_formatted)}
                                </div>
                            </div>
                            <div class="media-actions-bar">
                                <button type="button" class="media-btn-act" title="复制图片链接" onclick="window.copyToClipboard('${escapeHtml(item.url)}')">
                                    复制
                                </button>
                                <button type="button" class="media-btn-act" title="查看大图预览" onclick="window.openImagePreview('${escapeHtml(item.url)}')">
                                    大图
                                </button>
                                ${isDefault ? `
                                    <span class="media-btn-act" style="opacity:0.4;cursor:not-allowed;" title="系统预设图片受保护不可删除">
                                        保护
                                    </span>
                                ` : `
                                    <button type="button" class="media-btn-act media-btn-del" onclick="window.deleteMediaFile('${escapeHtml(item.path)}')">
                                        删除
                                    </button>
                                `}
                            </div>
                        </div>
                    </div>
                `;
            });

            gridBox.innerHTML = `<div class="media-grid">${cardsHtml}</div>`;

            // 分页
            if (pageBox) {
                pageBox.innerHTML = `
                    <div>共 <strong>${total}</strong> 张图片，第 <strong>${page}</strong> / <strong>${total_pages || 1}</strong> 页</div>
                    <div style="display:flex;gap:6px;">
                        <button type="button" class="btn btn-secondary" style="height:30px;padding:0 10px;font-size:12px;" ${page <= 1 ? 'disabled' : ''} id="btn-media-prev">上一页</button>
                        <button type="button" class="btn btn-secondary" style="height:30px;padding:0 10px;font-size:12px;" ${page >= total_pages ? 'disabled' : ''} id="btn-media-next">下一页</button>
                    </div>
                `;

                document.getElementById('btn-media-prev')?.addEventListener('click', () => {
                    if (mediaState.page > 1) {
                        mediaState.page--;
                        loadMediaData();
                    }
                });
                document.getElementById('btn-media-next')?.addEventListener('click', () => {
                    if (mediaState.page < total_pages) {
                        mediaState.page++;
                        loadMediaData();
                    }
                });
            }
        }

        // 绑定搜索与筛选事件
        document.getElementById('btn-media-search')?.addEventListener('click', () => {
            mediaState.keyword = document.getElementById('media-search-input')?.value.trim() || '';
            mediaState.page = 1;
            loadMediaData();
        });

        document.getElementById('media-search-input')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                mediaState.keyword = e.target.value.trim();
                mediaState.page = 1;
                loadMediaData();
            }
        });

        document.getElementById('media-filter-source')?.addEventListener('change', function() {
            mediaState.source = this.value;
            mediaState.page = 1;
            loadMediaData();
        });

        document.getElementById('btn-media-view-refresh')?.addEventListener('click', loadMediaData);

        // 绑定上传文件
        const uploadFileBtn = document.getElementById('btn-media-view-upload');
        const uploadFileInput = document.getElementById('media-view-file-input');

        uploadFileBtn?.addEventListener('click', () => uploadFileInput?.click());

        uploadFileInput?.addEventListener('change', async function() {
            const file = this.files?.[0];
            if (!file) return;
            const formData = new FormData();
            formData.append('file', file);
            SysUI.toast('正在上传图片...', 'info');
            try {
                const res = await api.upload('/admin/upload/image', formData);
                if (res && res.code === 200) {
                    SysUI.toast('图片上传成功！', 'success');
                    uploadFileInput.value = '';
                    mediaState.page = 1;
                    loadMediaData();
                } else {
                    SysUI.toast(res ? res.msg : '上传失败', 'error');
                }
            } catch(e) {
                SysUI.toast('上传失败，请稍后重试', 'error');
            }
        });

        loadMediaData();
    }

    window.renderMediaView = renderMediaView;
})(window);
