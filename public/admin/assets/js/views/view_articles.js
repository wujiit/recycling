/**
 * 启灵同城服务系统 - 文章与单页管理视图
 * 包含平台协议单页、帮助中心、回收指南与底部导航链接维护
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

    let cachedArticles = [];

    const CAT_LABELS = {
        'legal': { text: '法律条款', color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' },
        'about': { text: '关于平台', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
        'guide': { text: '回收指南', color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0' },
        'help':  { text: '帮助文档', color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' }
    };

    const COL_LABELS = {
        'guide': '回收指南列',
        'about': '关于平台列',
        'legal': '条款合规列'
    };

    async function renderArticlesView(container) {
        if (!container) return;

        container.innerHTML = `
            <div class="card" style="padding:0;overflow:hidden;border-radius:12px;">
                <!-- 顶部说明与操作栏 -->
                <div style="padding:18px 24px;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
                    <div>
                        <h3 style="font-size:16px;font-weight:700;color:#0f172a;margin:0;">文章与单页管理</h3>
                        <div style="font-size:12px;color:#64748b;margin-top:2px;">管理平台的免责声明、服务协议、关于我们与回收指南，直接关联前台大底部导航与独立链接</div>
                    </div>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <button type="button" class="btn btn-primary" id="btn-add-article" style="height:36px;padding:0 16px;font-size:13px;display:flex;align-items:center;gap:6px;">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                            新建文章/单页
                        </button>
                    </div>
                </div>

                <div style="padding:20px 24px;">
                    <!-- 数据概览统计条 -->
                    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:16px;margin-bottom:20px;">
                        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 18px;">
                            <div style="font-size:12px;color:#64748b;">文章单页总数</div>
                            <div style="font-size:24px;font-weight:800;color:#1e58ff;margin-top:4px;" id="stat-total-articles">-</div>
                        </div>
                        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 18px;">
                            <div style="font-size:12px;color:#64748b;">法律条款协议</div>
                            <div style="font-size:24px;font-weight:800;color:#8b5cf6;margin-top:4px;" id="stat-legal-articles">-</div>
                        </div>
                        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 18px;">
                            <div style="font-size:12px;color:#64748b;">回收服务指南</div>
                            <div style="font-size:24px;font-weight:800;color:#10b981;margin-top:4px;" id="stat-guide-articles">-</div>
                        </div>
                        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 18px;">
                            <div style="font-size:12px;color:#64748b;">底部导航展示中</div>
                            <div style="font-size:24px;font-weight:800;color:#0f172a;margin-top:4px;" id="stat-footer-articles">-</div>
                        </div>
                    </div>

                    <!-- 搜索与筛选工具栏 -->
                    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
                        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                            <div style="position:relative;width:260px;">
                                <input type="text" id="article-search-keyword" class="form-control" placeholder="搜索标题 / Slug / 摘要..." style="height:36px;padding-right:32px;font-size:13px;">
                                <span style="position:absolute;right:10px;top:9px;color:#94a3b8;">
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 14z"/></svg>
                                </span>
                            </div>
                            <select id="article-cat-filter" class="form-control" style="width:130px;height:36px;font-size:13px;">
                                <option value="all">全部分类</option>
                                <option value="legal">法律条款</option>
                                <option value="about">关于平台</option>
                                <option value="guide">回收指南</option>
                                <option value="help">帮助文档</option>
                            </select>
                            <select id="article-status-filter" class="form-control" style="width:120px;height:36px;font-size:13px;">
                                <option value="all">全部状态</option>
                                <option value="1">已发布</option>
                                <option value="0">草稿/下架</option>
                            </select>
                        </div>
                        <button type="button" class="btn btn-outline" id="btn-refresh-articles" style="height:36px;padding:0 14px;font-size:13px;display:flex;align-items:center;gap:6px;">
                            <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
                            刷新列表
                        </button>
                    </div>

                    <!-- 文章单页表格 -->
                    <div class="table-responsive" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
                        <table class="table" style="width:100%;margin:0;border-collapse:collapse;font-size:13px;">
                            <thead>
                                <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0;color:#64748b;text-align:left;">
                                    <th style="padding:12px 16px;width:60px;">ID</th>
                                    <th style="padding:12px 16px;">文章标题与标识 (Slug)</th>
                                    <th style="padding:12px 16px;width:110px;">所属分类</th>
                                    <th style="padding:12px 16px;width:140px;">底部展示状态</th>
                                    <th style="padding:12px 16px;width:80px;text-align:center;">排序</th>
                                    <th style="padding:12px 16px;width:90px;text-align:center;">浏览量</th>
                                    <th style="padding:12px 16px;width:90px;text-align:center;">状态</th>
                                    <th style="padding:12px 16px;width:170px;text-align:right;">操作</th>
                                </tr>
                            </thead>
                            <tbody id="article-table-body">
                                <tr>
                                    <td colspan="8" style="text-align:center;padding:36px;color:#94a3b8;">正在加载文章单页数据...</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- 文章编辑/新增模态弹窗 -->
            <div id="modal-article-edit" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,0.6);z-index:9999;align-items:center;justify-content:center;padding:20px;">
                <div style="background:#fff;border-radius:14px;width:100%;max-width:820px;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);overflow:hidden;">
                    <!-- 弹窗标题 -->
                    <div style="padding:16px 24px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;background:#f8fafc;">
                        <h4 id="article-modal-title" style="margin:0;font-size:16px;font-weight:700;color:#0f172a;">编辑文章/单页</h4>
                        <button type="button" id="btn-close-article-modal" style="background:none;border:none;font-size:20px;line-height:1;color:#94a3b8;cursor:pointer;padding:4px;">&times;</button>
                    </div>

                    <!-- 表单区域 (可滚动) -->
                    <form id="form-article-edit" style="flex:1;overflow-y:auto;padding:20px 24px;margin:0;">
                        <input type="hidden" id="edit-article-id" value="0">

                        <div style="display:grid;grid-template-columns:1.5fr 1fr;gap:16px;margin-bottom:14px;">
                            <div class="login-form-group" style="margin:0;">
                                <label style="font-size:13px;font-weight:600;">文章/单页标题 <span style="color:#ef4444;">*</span></label>
                                <input type="text" id="edit-article-title" class="form-control" placeholder="如: 免责声明 / 用户服务协议 / 关于我们" required>
                            </div>
                            <div class="login-form-group" style="margin:0;">
                                <label style="font-size:13px;font-weight:600;">英文别名/标识 (Slug) <span style="color:#ef4444;">*</span></label>
                                <input type="text" id="edit-article-slug" class="form-control" placeholder="如: disclaimer / about / guide" required style="font-family:monospace;">
                                <div style="font-size:11px;color:#64748b;margin-top:2px;">用于外部URL访问与弹窗调用 (如 page.html?slug=about)</div>
                            </div>
                        </div>

                        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:14px;">
                            <div class="login-form-group" style="margin:0;">
                                <label style="font-size:13px;font-weight:600;">所属分类</label>
                                <select id="edit-article-category" class="form-control">
                                    <option value="legal">法律条款 (用户协议/免责声明等)</option>
                                    <option value="about">关于平台 (公司简介/服务网点等)</option>
                                    <option value="guide">回收指南 (顺丰寄送/质检说明等)</option>
                                    <option value="help">帮助文档 (常见问题/新手必读等)</option>
                                </select>
                            </div>
                            <div class="login-form-group" style="margin:0;">
                                <label style="font-size:13px;font-weight:600;">底部导航列归属</label>
                                <select id="edit-article-footer-col" class="form-control">
                                    <option value="guide">回收指南列</option>
                                    <option value="about">关于平台列</option>
                                    <option value="legal">条款政策列</option>
                                </select>
                            </div>
                            <div class="login-form-group" style="margin:0;">
                                <label style="font-size:13px;font-weight:600;">排序权重 (数值越小越靠前)</label>
                                <input type="number" id="edit-article-sort" class="form-control" value="100">
                            </div>
                        </div>

                        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;">
                            <div>
                                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:600;font-size:13px;color:#0f172a;margin:0;">
                                    <input type="checkbox" id="edit-article-is-footer" value="1" style="width:16px;height:16px;">
                                    在前台底部 Mega Footer 导航中直接展示此链接
                                </label>
                                <div style="font-size:11px;color:#64748b;margin-top:2px;">开启后，用户在首页底部即可直接点击查看对应单页。</div>
                            </div>
                            <div>
                                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:600;font-size:13px;color:#0f172a;margin:0;">
                                    <input type="checkbox" id="edit-article-status" value="1" style="width:16px;height:16px;" checked>
                                    正式发布状态
                                </label>
                            </div>
                        </div>

                        <div class="login-form-group" style="margin-bottom:14px;">
                            <label style="font-size:13px;font-weight:600;">文章摘要说明 (SEO 与列表摘要)</label>
                            <input type="text" id="edit-article-summary" class="form-control" placeholder="简要阐述文章核心内容，建议 30-100 字">
                        </div>

                        <div class="login-form-group" style="margin-bottom:6px;">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                                <label style="font-size:13px;font-weight:600;margin:0;">文章正文 HTML / 富文本内容 <span style="color:#ef4444;">*</span></label>
                                <div style="display:flex;gap:6px;">
                                    <button type="button" class="btn btn-outline" id="btn-insert-h3" style="height:24px;padding:0 8px;font-size:11px;">+ 标题</button>
                                    <button type="button" class="btn btn-outline" id="btn-insert-p" style="height:24px;padding:0 8px;font-size:11px;">+ 段落</button>
                                    <button type="button" class="btn btn-outline" id="btn-insert-strong" style="height:24px;padding:0 8px;font-size:11px;">加粗</button>
                                </div>
                            </div>
                            <textarea id="edit-article-content" class="form-control" rows="12" style="font-family:monospace;font-size:12px;line-height:1.5;resize:vertical;" placeholder="支持输入正规 HTML 标签，如 <h3>小标题</h3> <p>段落内容...</p>"></textarea>
                        </div>
                    </form>

                    <!-- 弹窗底部操作栏 -->
                    <div style="padding:14px 24px;border-top:1px solid #e2e8f0;background:#f8fafc;display:flex;justify-content:flex-end;gap:10px;">
                        <button type="button" class="btn btn-secondary" id="btn-cancel-article-modal" style="height:36px;padding:0 18px;font-size:13px;">取消</button>
                        <button type="button" class="btn btn-primary" id="btn-save-article" style="height:36px;padding:0 22px;font-size:13px;font-weight:600;">保存文章/单页</button>
                    </div>
                </div>
            </div>

            <!-- 文章前台效果大屏即时预览弹窗 -->
            <div id="modal-article-preview" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,0.65);backdrop-filter:blur(4px);z-index:99999;align-items:center;justify-content:center;padding:20px;">
                <div style="background:#fff;border-radius:16px;width:100%;max-width:760px;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 25px 60px -15px rgba(0,0,0,0.3);overflow:hidden;">
                    <div style="padding:16px 24px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;background:#f8fafc;">
                        <span class="badge badge-info" id="prev-article-cat">预览效果</span>
                        <button type="button" id="btn-close-article-prev" style="background:none;border:none;font-size:20px;line-height:1;color:#94a3b8;cursor:pointer;padding:4px;">&times;</button>
                    </div>
                    <div style="flex:1;overflow-y:auto;padding:28px 36px;">
                        <h2 id="prev-article-title" style="font-size:22px;font-weight:800;color:#0f172a;margin-bottom:12px;line-height:1.3;">-</h2>
                        <div style="font-size:12px;color:#94a3b8;margin-bottom:20px;display:flex;gap:16px;padding-bottom:14px;border-bottom:1px solid #f1f5f9;">
                            <span>别名标识: <code id="prev-article-slug" style="color:#2563eb;">-</code></span>
                            <span id="prev-article-views">浏览 0 次</span>
                            <span id="prev-article-time">更新时间: -</span>
                        </div>
                        <div id="prev-article-body" style="font-size:14px;line-height:1.75;color:#334155;">-</div>
                    </div>
                    <div style="padding:12px 24px;border-top:1px solid #e2e8f0;background:#f8fafc;text-align:right;">
                        <button type="button" class="btn btn-secondary" id="btn-done-article-prev" style="height:34px;padding:0 18px;font-size:13px;">关闭预览</button>
                    </div>
                </div>
            </div>
        `;

        // 绑定事件
        bindArticleEvents(container);

        // 加载列表数据
        await loadArticlesList(container);
    }

    /**
     * 加载文章单页列表数据
     */
    async function loadArticlesList(container) {
        const tbody = container.querySelector('#article-table-body');
        if (!tbody) return;

        const keyword = container.querySelector('#article-search-keyword')?.value.trim() || '';
        const category = container.querySelector('#article-cat-filter')?.value || 'all';
        const status = container.querySelector('#article-status-filter')?.value || 'all';

        try {
            const query = `keyword=${encodeURIComponent(keyword)}&category=${encodeURIComponent(category)}&status=${encodeURIComponent(status)}`;
            const res = await api.get(`/admin/article/list?${query}`);
            if (res && res.code === 200 && Array.isArray(res.data)) {
                cachedArticles = res.data;
                renderArticlesTable(container, cachedArticles);
                updateStats(container, cachedArticles);
            } else {
                tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:32px;color:#ef4444;">${escapeHtml(res ? res.msg : '加载失败')}</td></tr>`;
            }
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:32px;color:#ef4444;">网络通信异常，请重试</td></tr>`;
        }
    }

    /**
     * 渲染表格数据
     */
    function renderArticlesTable(container, articles) {
        const tbody = container.querySelector('#article-table-body');
        if (!tbody) return;

        if (articles.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align:center;padding:48px;color:#94a3b8;">
                        <div style="font-size:32px;margin-bottom:8px;">📄</div>
                        暂无符合条件的文章或单页记录
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = articles.map(a => {
            const cat = CAT_LABELS[a.category] || { text: '其它', color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0' };
            const isFooterChecked = (parseInt(a.is_footer, 10) === 1) ? 'checked' : '';
            const statusBadge = (parseInt(a.status, 10) === 1)
                ? '<span class="badge" style="background:#ecfdf5;color:#10b981;border:1px solid #a7f3d0;font-size:11px;">已发布</span>'
                : '<span class="badge" style="background:#f1f5f9;color:#94a3b8;border:1px solid #e2e8f0;font-size:11px;">草稿/下架</span>';

            const colName = COL_LABELS[a.footer_column] || '默认列';

            return `
                <tr style="border-bottom:1px solid #f1f5f9;transition:background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                    <td style="padding:14px 16px;color:#64748b;font-weight:600;">${a.id}</td>
                    <td style="padding:14px 16px;">
                        <div style="font-weight:700;color:#0f172a;font-size:14px;">${escapeHtml(a.title)}</div>
                        <div style="display:flex;align-items:center;gap:6px;margin-top:4px;">
                            <code style="font-size:11px;background:#f1f5f9;padding:1px 6px;border-radius:4px;color:#2563eb;">slug: ${escapeHtml(a.slug)}</code>
                            <span style="font-size:11px;color:#94a3b8;">·</span>
                            <span style="font-size:11px;color:#64748b;">${escapeHtml(a.summary || '无摘要')}</span>
                        </div>
                    </td>
                    <td style="padding:14px 16px;">
                        <span class="badge" style="background:${cat.bg};color:${cat.color};border:1px solid ${cat.border};font-size:11px;">
                            ${cat.text}
                        </span>
                    </td>
                    <td style="padding:14px 16px;">
                        <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;margin:0;" title="点击切换是否在前台底部展示">
                            <input type="checkbox" class="chk-toggle-footer" data-id="${a.id}" ${isFooterChecked} style="width:15px;height:15px;">
                            <span style="font-size:12px;color:${isFooterChecked ? '#10b981' : '#94a3b8'};font-weight:600;">
                                ${isFooterChecked ? colName : '未展示'}
                            </span>
                        </label>
                    </td>
                    <td style="padding:14px 16px;text-align:center;color:#64748b;font-weight:600;">${a.sort_order}</td>
                    <td style="padding:14px 16px;text-align:center;color:#64748b;">${a.view_count || 0}</td>
                    <td style="padding:14px 16px;text-align:center;">${statusBadge}</td>
                    <td style="padding:14px 16px;text-align:right;">
                        <div style="display:inline-flex;gap:6px;align-items:center;">
                            <button type="button" class="btn btn-outline btn-sm btn-preview-article" data-id="${a.id}" style="height:28px;padding:0 8px;font-size:11px;">预览</button>
                            <button type="button" class="btn btn-secondary btn-sm btn-edit-article" data-id="${a.id}" style="height:28px;padding:0 10px;font-size:11px;">编辑</button>
                            <button type="button" class="btn btn-outline btn-sm btn-del-article" data-id="${a.id}" data-title="${escapeHtml(a.title)}" style="height:28px;padding:0 8px;font-size:11px;color:#ef4444;border-color:#fecdd3;">删除</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // 绑定行内按钮事件
        bindRowEvents(container);
    }

    /**
     * 绑定行内动作事件
     */
    function bindRowEvents(container) {
        // 预览按钮
        container.querySelectorAll('.btn-preview-article').forEach(btn => {
            btn.onclick = async function() {
                const id = parseInt(this.getAttribute('data-id'), 10);
                const art = cachedArticles.find(a => a.id === id);
                if (art && art.content) {
                    showPreviewModal(art);
                } else {
                    const res = await api.get(`/admin/article/detail?id=${id}`);
                    if (res && res.code === 200 && res.data) showPreviewModal(res.data);
                }
            };
        });

        // 编辑按钮
        container.querySelectorAll('.btn-edit-article').forEach(btn => {
            btn.onclick = async function() {
                const id = parseInt(this.getAttribute('data-id'), 10);
                const res = await api.get(`/admin/article/detail?id=${id}`);
                if (res && res.code === 200 && res.data) {
                    openEditModal(res.data);
                } else {
                    SysUI.toast(res && res.msg ? res.msg : '加载文章详情失败', 'error');
                }
            };
        });

        // 删除按钮
        container.querySelectorAll('.btn-del-article').forEach(btn => {
            btn.onclick = function() {
                const id = parseInt(this.getAttribute('data-id'), 10);
                const title = this.getAttribute('data-title');
                if (confirm(`确定要永久删除单页文章【${title}】吗？删除后前台底部关联链接将同步失效。`)) {
                    doDeleteArticle(id, container);
                }
            };
        });

        // 快速切换底部展示开关
        container.querySelectorAll('.chk-toggle-footer').forEach(chk => {
            chk.onchange = async function() {
                const id = parseInt(this.getAttribute('data-id'), 10);
                const isFooter = this.checked ? 1 : 0;
                try {
                    const res = await api.post('/admin/article/toggleFooter', { id, is_footer: isFooter });
                    if (res && res.code === 200) {
                        SysUI.toast(isFooter ? '已设为底部展示' : '已取消底部展示', 'success');
                        await loadArticlesList(container);
                    } else {
                        SysUI.toast(res ? res.msg : '更新失败', 'error');
                        this.checked = !this.checked;
                    }
                } catch (e) {
                    SysUI.toast('网络异常', 'error');
                    this.checked = !this.checked;
                }
            };
        });
    }

    /**
     * 更新统计栏数字
     */
    function updateStats(container, articles) {
        const total = articles.length;
        const notice = articles.filter(a => a.category === 'notice').length;
        const legal = articles.filter(a => a.category === 'legal').length;
        const guide = articles.filter(a => a.category === 'guide').length;
        const footer = articles.filter(a => parseInt(a.is_footer, 10) === 1 && parseInt(a.status, 10) === 1).length;

        const setVal = (id, val) => {
            const el = container.querySelector(id);
            if (el) el.innerText = val;
        };

        setVal('#stat-total-articles', total);
        setVal('#stat-legal-articles', legal);
        setVal('#stat-guide-articles', guide);
        setVal('#stat-footer-articles', footer);
    }

    /**
     * 绑定全局及筛选事件
     */
    function bindArticleEvents(container) {
        // 搜索框回车与输入防抖
        const searchInp = container.querySelector('#article-search-keyword');
        searchInp?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') loadArticlesList(container);
        });

        container.querySelector('#article-cat-filter')?.addEventListener('change', () => loadArticlesList(container));
        container.querySelector('#article-status-filter')?.addEventListener('change', () => loadArticlesList(container));
        container.querySelector('#btn-refresh-articles')?.addEventListener('click', () => loadArticlesList(container));

        // 新建按钮
        container.querySelector('#btn-add-article')?.addEventListener('click', () => {
            openEditModal(null);
        });

        // 弹窗关闭与取消
        const editModal = container.querySelector('#modal-article-edit');
        container.querySelector('#btn-close-article-modal')?.addEventListener('click', () => {
            if (editModal) editModal.style.display = 'none';
        });
        container.querySelector('#btn-cancel-article-modal')?.addEventListener('click', () => {
            if (editModal) editModal.style.display = 'none';
        });

        // 预览弹窗关闭
        const prevModal = container.querySelector('#modal-article-preview');
        container.querySelector('#btn-close-article-prev')?.addEventListener('click', () => {
            if (prevModal) prevModal.style.display = 'none';
        });
        container.querySelector('#btn-done-article-prev')?.addEventListener('click', () => {
            if (prevModal) prevModal.style.display = 'none';
        });

        // 正文快速插入快捷按键
        const contentArea = container.querySelector('#edit-article-content');
        container.querySelector('#btn-insert-h3')?.addEventListener('click', () => {
            insertTextAtCursor(contentArea, '<h3>小标题名称</h3>\n');
        });
        container.querySelector('#btn-insert-p')?.addEventListener('click', () => {
            insertTextAtCursor(contentArea, '<p>在此输入您的正文段落文字...</p>\n');
        });
        container.querySelector('#btn-insert-strong')?.addEventListener('click', () => {
            insertTextAtCursor(contentArea, '<strong>强调文字</strong>');
        });

        // 保存提交
        container.querySelector('#btn-save-article')?.addEventListener('click', async () => {
            await doSaveArticle(container);
        });
    }

    function insertTextAtCursor(textarea, text) {
        if (!textarea) return;
        const start = textarea.selectionStart || 0;
        const end = textarea.selectionEnd || 0;
        const val = textarea.value;
        textarea.value = val.substring(0, start) + text + val.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + text.length;
        textarea.focus();
    }

    /**
     * 打开编辑/新增模态弹窗
     */
    function openEditModal(article) {
        const modal = document.getElementById('modal-article-edit');
        if (!modal) return;

        const isEdit = article && article.id > 0;
        document.getElementById('article-modal-title').innerText = isEdit ? '编辑文章/单页内容' : '新建文章/单页';
        document.getElementById('edit-article-id').value = isEdit ? article.id : '0';
        document.getElementById('edit-article-title').value = isEdit ? article.title : '';
        document.getElementById('edit-article-slug').value = isEdit ? article.slug : '';
        document.getElementById('edit-article-category').value = isEdit ? article.category : 'guide';
        document.getElementById('edit-article-footer-col').value = isEdit ? (article.footer_column || 'guide') : 'guide';
        document.getElementById('edit-article-sort').value = isEdit ? article.sort_order : '100';
        document.getElementById('edit-article-summary').value = isEdit ? (article.summary || '') : '';
        document.getElementById('edit-article-content').value = isEdit ? (article.content || '') : '';
        document.getElementById('edit-article-is-footer').checked = isEdit ? (parseInt(article.is_footer, 10) === 1) : true;
        document.getElementById('edit-article-status').checked = isEdit ? (parseInt(article.status, 10) === 1) : true;

        modal.style.display = 'flex';
    }

    /**
     * 打开预览模态弹窗
     */
    function showPreviewModal(article) {
        const modal = document.getElementById('modal-article-preview');
        if (!modal) return;

        const cat = CAT_LABELS[article.category] || { text: '其它' };
        document.getElementById('prev-article-cat').innerText = cat.text;
        document.getElementById('prev-article-title').innerText = article.title;
        document.getElementById('prev-article-slug').innerText = article.slug;
        document.getElementById('prev-article-views').innerText = `浏览 ${article.view_count || 0} 次`;
        document.getElementById('prev-article-time').innerText = `更新时间: ${article.updated_at ? new Date(article.updated_at * 1000).toLocaleString() : '最近'}`;
        document.getElementById('prev-article-body').innerHTML = article.content || '<p style="color:#94a3b8;">暂无正文内容</p>';

        modal.style.display = 'flex';
    }

    /**
     * 执行保存
     */
    async function doSaveArticle(container) {
        const id = parseInt(document.getElementById('edit-article-id')?.value || '0', 10);
        const title = document.getElementById('edit-article-title')?.value.trim();
        const slug = document.getElementById('edit-article-slug')?.value.trim();
        const category = document.getElementById('edit-article-category')?.value;
        const footerColumn = document.getElementById('edit-article-footer-col')?.value;
        const sortOrder = parseInt(document.getElementById('edit-article-sort')?.value || '100', 10);
        const summary = document.getElementById('edit-article-summary')?.value.trim();
        const content = document.getElementById('edit-article-content')?.value;
        const isFooter = document.getElementById('edit-article-is-footer')?.checked ? 1 : 0;
        const status = document.getElementById('edit-article-status')?.checked ? 1 : 0;

        if (!title) {
            SysUI.toast('请输入文章标题', 'warning');
            return;
        }

        const payload = {
            id,
            title,
            slug,
            category,
            footer_column: footerColumn,
            sort_order: sortOrder,
            summary,
            content,
            is_footer: isFooter,
            status
        };

        const btnSave = document.getElementById('btn-save-article');
        if (btnSave) {
            btnSave.disabled = true;
            btnSave.innerText = '正在保存...';
        }

        try {
            const res = await api.post('/admin/article/save', payload);
            if (btnSave) {
                btnSave.disabled = false;
                btnSave.innerText = '保存文章/单页';
            }

            if (res && res.code === 200) {
                SysUI.toast('文章单页已成功保存！', 'success');
                const modal = document.getElementById('modal-article-edit');
                if (modal) modal.style.display = 'none';
                await loadArticlesList(container);
            } else {
                SysUI.toast(res ? res.msg : '保存失败', 'error');
            }
        } catch (e) {
            if (btnSave) {
                btnSave.disabled = false;
                btnSave.innerText = '保存文章/单页';
            }
            SysUI.toast('保存出现网络异常', 'error');
        }
    }

    /**
     * 执行删除
     */
    async function doDeleteArticle(id, container) {
        try {
            const res = await api.post('/admin/article/delete', { id });
            if (res && res.code === 200) {
                SysUI.toast('文章已成功删除', 'success');
                await loadArticlesList(container);
            } else {
                SysUI.toast(res ? res.msg : '删除失败', 'error');
            }
        } catch (e) {
            SysUI.toast('网络异常，删除失败', 'error');
        }
    }

    window.renderArticlesView = renderArticlesView;

})(window);
