/**
 * 启灵回收系统 - 本地图库通用组件与弹窗拾取器
 * 职责：全局大图预览、图库素材拾取弹窗、素材删除联动
 * 编码：UTF-8 无 BOM
 */
(function (window) {
    'use strict';

    const SysUI = window.SysUI;
    const api = window.adminApi || window.api;
    const state = window.adminState || window.state;
    const escapeHtml = window.escapeHtml || function(s) { return s; };

    /**
     * 全局大图预览弹窗
     * @param {string} url 图片链接
     */
    function openImagePreview(url) {
        if (!url) return;
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.zIndex = '100010';
        modal.innerHTML = `
            <div style="max-width:90vw;max-height:92vh;display:flex;flex-direction:column;align-items:center;position:relative;">
                <div style="align-self:flex-end;margin-bottom:8px;">
                    <button type="button" class="btn btn-secondary" style="background:rgba(15,23,42,0.75);color:#fff;border:none;border-radius:20px;padding:6px 16px;cursor:pointer;font-size:12px;display:flex;align-items:center;gap:4px;" id="btn-close-preview">
                        ✕ 关闭大图
                    </button>
                </div>
                <div style="background:#fff;border-radius:10px;padding:8px;box-shadow:0 12px 36px rgba(0,0,0,0.3);max-width:90vw;max-height:78vh;display:flex;align-items:center;justify-content:center;overflow:hidden;">
                    <img src="${escapeHtml(url)}" style="max-width:85vw;max-height:72vh;object-fit:contain;border-radius:6px;" alt="大图预览">
                </div>
                <div style="margin-top:10px;color:#fff;font-size:12px;background:rgba(15,23,42,0.75);padding:5px 16px;border-radius:20px;max-width:80vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                    ${escapeHtml(url)}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.querySelector('#btn-close-preview')?.addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    /**
     * 全局图库选择器弹窗 (可在任何模块中复用唤起)
     * @param {object} options 选项：onSelect 回调, title 弹窗标题
     */
    function openMediaLibraryModal(options = {}) {
        const onSelect = typeof options.onSelect === 'function' ? options.onSelect : () => {};
        const title = options.title || '从本地图库选择图片';

        let modalState = {
            page: 1,
            limit: 18,
            source: 'all',
            keyword: ''
        };

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.zIndex = String(options.zIndex || 100050);
        modal.innerHTML = `
            <div class="modal-card" style="max-width:940px;width:92vw;max-height:90vh;display:flex;flex-direction:column;">
                <div class="modal-header">
                    <span style="font-weight:700;display:flex;align-items:center;gap:8px;">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
                        ${escapeHtml(title)}
                    </span>
                    <span style="cursor:pointer;font-size:18px;" id="btn-modal-picker-close">✕</span>
                </div>
                <div style="padding:14px 20px;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                    <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:240px;">
                        <input type="text" id="picker-search-kw" class="form-control" style="height:34px;font-size:12px;" placeholder="输入文件名检索素材...">
                        <button type="button" class="btn btn-secondary" id="btn-picker-search" style="height:34px;padding:0 12px;font-size:12px;white-space:nowrap;">搜索</button>
                    </div>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <select id="picker-filter-source" class="form-control" style="height:34px;font-size:12px;width:auto;">
                            <option value="all">全部素材</option>
                            <option value="default">系统预设图例 (/uploads/default/)</option>
                            <option value="uploads">自主与用户上传 (/uploads/YYYYMM/)</option>
                        </select>
                        <label class="btn btn-primary" style="height:34px;padding:0 12px;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;white-space:nowrap;margin:0;">
                            上传新图片
                            <input type="file" id="picker-upload-file" accept="image/*" style="display:none;">
                        </label>
                    </div>
                </div>
                <div class="modal-body" style="flex:1;overflow-y:auto;padding:16px;" id="picker-grid-box">
                    <div style="text-align:center;padding:50px;color:#94a3b8;">正在载入图库资源...</div>
                </div>
                <div class="modal-footer" style="display:flex;justify-content:space-between;align-items:center;padding:12px 20px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
                    <div id="picker-page-info">共 0 张图片</div>
                    <div style="display:flex;gap:6px;" id="picker-page-actions">
                        <button type="button" class="btn btn-secondary" style="height:30px;padding:0 10px;font-size:12px;" id="btn-picker-prev" disabled>上一页</button>
                        <button type="button" class="btn btn-secondary" style="height:30px;padding:0 10px;font-size:12px;" id="btn-picker-next" disabled>下一页</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('#btn-modal-picker-close')?.addEventListener('click', () => modal.remove());

        async function fetchPickerData() {
            const gridBox = modal.querySelector('#picker-grid-box');
            const pageInfo = modal.querySelector('#picker-page-info');
            const prevBtn = modal.querySelector('#btn-picker-prev');
            const nextBtn = modal.querySelector('#btn-picker-next');
            if (!gridBox) return;

            gridBox.innerHTML = '<div style="text-align:center;padding:50px;color:#94a3b8;">正在加载...</div>';

            const curApi = window.adminApi || window.api;
            const query = `page=${modalState.page}&limit=${modalState.limit}&source=${encodeURIComponent(modalState.source)}&keyword=${encodeURIComponent(modalState.keyword)}`;
            const res = await curApi.get(`/admin/media/list&${query}`);

            if (!res || res.code !== 200 || !res.data) {
                gridBox.innerHTML = '<div style="text-align:center;padding:40px;color:#ef4444;">图库载入失败，请重试</div>';
                return;
            }

            const { list, total, page, limit, total_pages } = res.data;

            if (pageInfo) pageInfo.innerText = `共 ${total} 张图片，第 ${page} / ${total_pages || 1} 页`;
            if (prevBtn) prevBtn.disabled = page <= 1;
            if (nextBtn) nextBtn.disabled = page >= total_pages;

            if (!list || list.length === 0) {
                gridBox.innerHTML = '<div style="text-align:center;padding:60px 0;color:#94a3b8;">未检索到相关图片素材，可点击右上角上传新图片</div>';
                return;
            }

            let cardsHtml = '';
            list.forEach(item => {
                const isDefault = item.source === 'default';
                const tagClass = isDefault ? 'tag-default' : 'tag-upload';
                const tagText = isDefault ? '内置' : '上传';
                cardsHtml += `
                    <div class="media-card" style="cursor:pointer;" data-url="${escapeHtml(item.url)}" title="点击选用此图: ${escapeHtml(item.name)}">
                        <div class="media-thumb-wrap" style="height:115px;">
                            <span class="media-badge-tag ${tagClass}">${tagText}</span>
                            <img src="${escapeHtml(item.url)}" class="media-thumb-img" alt="${escapeHtml(item.name)}" loading="lazy">
                        </div>
                        <div class="media-info" style="padding:8px 10px;">
                            <div class="media-filename" style="font-size:12px;">${escapeHtml(item.name)}</div>
                            <div class="media-meta-line" style="margin-top:2px;">
                                <span>${escapeHtml(item.dimension || '-')}</span>
                                <span>${escapeHtml(item.size_formatted)}</span>
                            </div>
                            <button type="button" class="btn btn-primary btn-sm btn-pick-this" style="width:100%;margin-top:6px;height:26px;font-size:11px;padding:0;" data-url="${escapeHtml(item.url)}">
                                选用此图
                            </button>
                        </div>
                    </div>
                `;
            });

            gridBox.innerHTML = `<div class="media-grid" style="grid-template-columns:repeat(auto-fill, minmax(155px, 1fr));gap:12px;margin-top:0;">${cardsHtml}</div>`;

            // 绑定点击选用事件
            gridBox.querySelectorAll('.media-card').forEach(card => {
                card.addEventListener('click', function(e) {
                    const url = this.getAttribute('data-url');
                    if (url) {
                        onSelect(url);
                        SysUI.toast('已成功选用图片！', 'success');
                        modal.remove();
                    }
                });
            });
        }

        // 绑定搜索与筛选
        modal.querySelector('#btn-picker-search')?.addEventListener('click', () => {
            modalState.keyword = modal.querySelector('#picker-search-kw')?.value.trim() || '';
            modalState.page = 1;
            fetchPickerData();
        });

        modal.querySelector('#picker-search-kw')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                modalState.keyword = e.target.value.trim();
                modalState.page = 1;
                fetchPickerData();
            }
        });

        modal.querySelector('#picker-filter-source')?.addEventListener('change', function() {
            modalState.source = this.value;
            modalState.page = 1;
            fetchPickerData();
        });

        // 翻页
        modal.querySelector('#btn-picker-prev')?.addEventListener('click', () => {
            if (modalState.page > 1) {
                modalState.page--;
                fetchPickerData();
            }
        });

        modal.querySelector('#btn-picker-next')?.addEventListener('click', () => {
            modalState.page++;
            fetchPickerData();
        });

        // 弹窗内直传并选用
        modal.querySelector('#picker-upload-file')?.addEventListener('change', async function() {
            const file = this.files?.[0];
            if (!file) return;
            const formData = new FormData();
            formData.append('file', file);
            SysUI.toast('正在上传新图片...', 'info');
            try {
                const curApi = window.adminApi || window.api;
                const uploadRes = await curApi.upload('/admin/upload/image', formData);
                if (uploadRes && uploadRes.code === 200 && uploadRes.data?.url) {
                    const uploadedUrl = uploadRes.data.url;
                    SysUI.toast('上传成功并已自动选用！', 'success');
                    onSelect(uploadedUrl);
                    modal.remove();
                } else {
                    SysUI.toast(uploadRes ? uploadRes.msg : '上传失败', 'error');
                }
            } catch(e) {
                SysUI.toast('上传图片发生网络异常', 'error');
            }
        });

        fetchPickerData();
    }

    /**
     * 全局删除本地图片
     * @param {string} filePath 文件相对路径
     */
    async function deleteMediaFile(filePath) {
        if (!filePath) return;
        const confirmed = await SysUI.confirm('确认彻底删除该图片吗？删除后相关引用此图片的页面将无法正常展示。', {
            title: '删除图片确认',
            type: 'error',
            confirmText: '彻底删除'
        });
        if (!confirmed) return;
        const curApi = window.adminApi || window.api;
        const curState = window.adminState || window.state;
        const res = await curApi.post('/admin/media/delete', { path: filePath });
        if (res && res.code === 200) {
            SysUI.toast(res.msg || '图片已彻底删除', 'success');
            // 如果在图库视图，刷新图库
            if (curState.currentTab === 'media' && typeof window.renderMediaView === 'function') {
                const box = document.getElementById('tab-content');
                if (box) window.renderMediaView(box);
            }
        } else {
            SysUI.toast(res ? res.msg : '删除失败', 'error');
        }
    }

    window.openImagePreview = openImagePreview;
    window.openMediaLibraryModal = openMediaLibraryModal;
    window.deleteMediaFile = deleteMediaFile;
})(window);
