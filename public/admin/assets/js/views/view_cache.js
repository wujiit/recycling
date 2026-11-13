/**
 * 启灵同城服务系统 - 缓存性能与统计监控视图
 * 职责：Redis 独立库隔离运行监控、本地文件原子降级统计、内存占用分析与一键安全清空
 * 编码：UTF-8 无 BOM
 */
(function (window) {
    'use strict';

    const SysUI = window.SysUI;
    const api = window.adminApi || window.api;
    const escapeHtml = window.escapeHtml || function(s) { return s; };
    // ==========================================
    async function renderCacheView(container) {
        container.innerHTML = `
            <style>
                @keyframes ql-spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
            <div class="card">
                <div class="card-header">
                    <div>
                        <div class="card-title">缓存管理</div>
                        <div style="font-size:12px;color:#64748b;margin-top:4px;">查看系统缓存运行状态与内存占用 <span id="cache-last-updated" style="margin-left:8px;font-size:12px;color:#0ea5e9;font-weight:500;"></span></div>
                    </div>
                    <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
                        <button class="btn btn-primary" id="btn-cache-config" style="background:#4f46e5;border-color:#4338ca;">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="margin-right:6px;"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
                            Redis 配置
                        </button>
                        <button class="btn btn-outline" id="btn-cache-refresh">
                            <svg class="refresh-icon" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="margin-right:6px;"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0020 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 004 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>
                            <span class="refresh-text">刷新</span>
                        </button>
                        <button class="btn btn-danger" id="btn-cache-clear">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="margin-right:6px;"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                            清空缓存
                        </button>
                    </div>
                </div>

                <div id="cache-stats-content">
                    <div style="text-align:center;padding:40px;color:#64748b;">正在加载缓存统计数据...</div>
                </div>
            </div>

            <!-- Redis 参数配置模态框 -->
            <div id="modal-redis-config" class="modal-overlay" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:1000;align-items:center;justify-content:center;">
                <div class="modal-card" style="background:#fff;border-radius:12px;max-width:560px;width:92%;max-height:90vh;overflow-y:auto;padding:24px;box-shadow:0 10px 25px rgba(0,0,0,0.15);">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;border-bottom:1px solid #f1f5f9;padding-bottom:12px;">
                        <div>
                            <h4 style="margin:0;font-size:16px;font-weight:700;color:#0f172a;">⚙️ Redis 配置</h4>
                            <div style="font-size:12px;color:#64748b;margin-top:2px;">修改 Redis 连接参数与数据库号</div>
                        </div>
                        <span style="cursor:pointer;font-size:22px;color:#94a3b8;line-height:1;" id="btn-close-redis-modal">&times;</span>
                    </div>

                    <form id="form-redis-config">
                        <div style="background:#f8fafc;padding:12px 14px;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:14px;">
                            <label style="display:flex;align-items:center;gap:10px;cursor:pointer;margin:0;font-weight:600;font-size:13px;color:#1e293b;">
                                <input type="checkbox" id="cfg-redis-enable" value="1" style="width:16px;height:16px;cursor:pointer;">
                                <span>启用 Redis 缓存服务 (未启用或连接异常时自动降级为文件缓存)</span>
                            </label>
                        </div>

                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                            <div>
                                <label style="display:block;font-size:12px;font-weight:600;color:#334155;margin-bottom:5px;">Redis 主机 (Host)</label>
                                <input type="text" id="cfg-redis-host" class="form-control" placeholder="127.0.0.1" value="127.0.0.1" style="width:100%;height:36px;padding:6px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:13px;">
                            </div>
                            <div>
                                <label style="display:block;font-size:12px;font-weight:600;color:#334155;margin-bottom:5px;">端口号 (Port)</label>
                                <input type="number" id="cfg-redis-port" class="form-control" placeholder="6379" value="6379" min="1" max="65535" style="width:100%;height:36px;padding:6px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:13px;">
                            </div>
                        </div>

                        <div style="margin-bottom:12px;">
                            <label style="display:block;font-size:12px;font-weight:600;color:#334155;margin-bottom:5px;">Redis 认证密码 (无密码留空)</label>
                            <input type="password" id="cfg-redis-pass" class="form-control" placeholder="若无密码请留空" style="width:100%;height:36px;padding:6px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:13px;">
                        </div>

                        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 14px;margin-bottom:12px;">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                                <label style="font-size:13px;font-weight:700;color:#1d4ed8;margin:0;">Redis 数据库号 (0-15)</label>
                                <span style="font-size:11px;color:#2563eb;">推荐使用 0 至 15 任意编号</span>
                            </div>
                            <div style="display:flex;gap:10px;align-items:center;margin-bottom:8px;">
                                <input type="number" id="cfg-redis-db" class="form-control" style="width:110px;font-weight:700;font-size:16px;text-align:center;height:36px;border:1px solid #93c5fd;border-radius:6px;" min="0" max="15" value="6">
                                <span style="font-size:12px;color:#64748b;">支持 0 至 15 任意编号</span>
                            </div>
                            <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
                                <span style="font-size:12px;color:#64748b;margin-right:2px;">快捷选择:</span>
                                <button type="button" class="btn btn-outline btn-sm btn-quick-db" data-db="0" style="padding:2px 8px;font-size:11px;height:24px;line-height:20px;">DB 0</button>
                                <button type="button" class="btn btn-outline btn-sm btn-quick-db" data-db="1" style="padding:2px 8px;font-size:11px;height:24px;line-height:20px;">DB 1</button>
                                <button type="button" class="btn btn-outline btn-sm btn-quick-db" data-db="2" style="padding:2px 8px;font-size:11px;height:24px;line-height:20px;">DB 2</button>
                                <button type="button" class="btn btn-outline btn-sm btn-quick-db" data-db="3" style="padding:2px 8px;font-size:11px;height:24px;line-height:20px;">DB 3</button>
                                <button type="button" class="btn btn-outline btn-sm btn-quick-db" data-db="5" style="padding:2px 8px;font-size:11px;height:24px;line-height:20px;">DB 5</button>
                                <button type="button" class="btn btn-primary btn-sm btn-quick-db" data-db="6" style="padding:2px 8px;font-size:11px;height:24px;line-height:20px;background:#2563eb;border-color:#2563eb;">DB 6</button>
                                <button type="button" class="btn btn-outline btn-sm btn-quick-db" data-db="8" style="padding:2px 8px;font-size:11px;height:24px;line-height:20px;">DB 8</button>
                            </div>
                        </div>

                        <div style="display:grid;grid-template-columns:2fr 1fr;gap:12px;margin-bottom:12px;">
                            <div>
                                <label style="display:block;font-size:12px;font-weight:600;color:#334155;margin-bottom:5px;">缓存前缀</label>
                                <input type="text" id="cfg-redis-prefix" class="form-control" placeholder="sys_recycle:" value="sys_recycle:" style="width:100%;height:36px;padding:6px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:13px;">
                                <div style="font-size:11px;color:#64748b;margin-top:3px;">避免与其他系统缓存冲突</div>
                            </div>
                            <div>
                                <label style="display:block;font-size:12px;font-weight:600;color:#334155;margin-bottom:5px;">超时时间 (秒)</label>
                                <input type="number" id="cfg-redis-timeout" class="form-control" placeholder="2.0" value="2.0" step="0.5" min="0.5" max="10" style="width:100%;height:36px;padding:6px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:13px;">
                            </div>
                        </div>

                        <!-- 连通性测试状态反馈框 -->
                        <div id="redis-test-status" style="display:none;margin-bottom:14px;padding:10px 12px;border-radius:6px;font-size:12px;line-height:1.5;"></div>

                        <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid #f1f5f9;padding-top:14px;margin-top:8px;">
                            <button type="button" class="btn btn-outline" id="btn-test-redis-conn" style="border-color:#3b82f6;color:#2563eb;">
                                测试连接
                            </button>
                            <div style="display:flex;gap:10px;">
                                <button type="button" class="btn btn-secondary" id="btn-cancel-redis-modal">取消</button>
                                <button type="submit" class="btn btn-primary" id="btn-save-redis-config">保存配置</button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        `;

        async function loadData(isManual = false) {
            const content = document.getElementById('cache-stats-content');
            if (!content) return;

            const refreshBtn = document.getElementById('btn-cache-refresh');
            const refreshIcon = refreshBtn?.querySelector('.refresh-icon');
            const refreshText = refreshBtn?.querySelector('.refresh-text');

            if (isManual && refreshBtn) {
                refreshBtn.disabled = true;
                if (refreshIcon) refreshIcon.style.animation = 'ql-spin 0.7s linear infinite';
                if (refreshText) refreshText.innerText = '刷新中...';
            }

            try {
                const res = await api.get('/admin/system/cacheStats', { _t: Date.now() });
                if (!res || res.code !== 200 || !res.data) {
                    content.innerHTML = '<div style="text-align:center;padding:30px;color:#ef4444;">获取缓存统计失败，请检查服务</div>';
                    if (isManual && window.SysUI) {
                        window.SysUI.toast(res ? res.msg : '获取缓存统计失败', 'error');
                    }
                    return;
                }

                const d = res.data;
                const isRedis = d.is_redis;

                // 更新最后刷新时间显示
                const lastUpdatedEl = document.getElementById('cache-last-updated');
                if (lastUpdatedEl) {
                    const now = new Date();
                    const timeStr = [now.getHours(), now.getMinutes(), now.getSeconds()].map(n => String(n).padStart(2, '0')).join(':');
                    lastUpdatedEl.innerText = `(已更新于 ${timeStr})`;
                }

                let sampleKeysHtml = '';
                if (d.sample_keys && d.sample_keys.length > 0) {
                    d.sample_keys.forEach(k => {
                        sampleKeysHtml += `<tr><td><code>${escapeHtml(k)}</code></td><td><span class="badge badge-success">生效中</span></td></tr>`;
                    });
                } else {
                    sampleKeysHtml = '<tr><td colspan="2" style="text-align:center;color:#64748b;padding:16px;">暂无专属前缀活跃键</td></tr>';
                }

                content.innerHTML = `
                <!-- 统计指标网格 -->
                <div class="stat-grid">
                    <div class="stat-card">
                        <div class="stat-icon ${isRedis ? 'stat-blue' : 'stat-amber'}">
                            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M13 2.05v3.03c3.39.49 6 3.39 6 6.92 0 .9-.18 1.75-.48 2.54l2.6 1.53c.56-1.24.88-2.62.88-4.07 0-5.18-3.95-9.45-9-9.92zM12 19c-3.87 0-7-3.13-7-7 0-3.53 2.61-6.43 6-6.92V2.05c-5.06.47-9 4.75-9 9.95 0 5.52 4.47 10 9.99 10 3.31 0 6.24-1.61 8.01-4.09l-2.49-1.46C16.27 17.84 14.28 19 12 19zm1-7V7l-5 7h4v5l5-7h-4z"/></svg>
                        </div>
                        <div>
                            <div class="stat-num" style="font-size:16px;">${escapeHtml(d.driver_label)}</div>
                            <div class="stat-label">缓存驱动</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon stat-purple">
                            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                        </div>
                        <div>
                            <div class="stat-num" style="font-size:20px;">数据库 DB ${d.redis_db_index !== undefined ? d.redis_db_index : 6}</div>
                            <div class="stat-label">缓存前缀: <code>${escapeHtml(d.prefix)}</code> <span style="margin-left:6px;color:#2563eb;font-size:11px;cursor:pointer;" onclick="document.getElementById('btn-cache-config')?.click()">[配置]</span></div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon stat-green">
                            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg>
                        </div>
                        <div>
                            <div class="stat-num" style="font-size:20px;">${escapeHtml(d.redis_used_memory || d.file_cache_size)}</div>
                            <div class="stat-label">内存占用 (峰值: ${escapeHtml(d.redis_peak_memory || d.file_cache_size)})</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon stat-blue">
                            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                        </div>
                        <div>
                            <div class="stat-num" style="font-size:20px;">${escapeHtml(d.redis_hit_rate || '100%')}</div>
                            <div class="stat-label">命中: ${Number(d.redis_hits || 0).toLocaleString()} | 缺失: ${Number(d.redis_misses || 0).toLocaleString()}</div>
                        </div>
                    </div>
                </div>

                <div style="grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;display:grid;">
                    <!-- Redis 服务详情 -->
                    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:20px;">
                        <h4 style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:12px;">Redis 运行状态</h4>
                        <div style="font-size:13px;line-height:2.2;">
                            <div style="display:flex;justify-content:space-between;border-bottom:1px solid #f8fafc;padding:4px 0;">
                                <span style="color:#64748b;">Redis 版本：</span>
                                <strong>${escapeHtml(d.redis_version || '未连接')}</strong>
                            </div>
                            <div style="display:flex;justify-content:space-between;border-bottom:1px solid #f8fafc;padding:4px 0;">
                                <span style="color:#64748b;">数据隔离：</span>
                                <span class="badge badge-success">独立数据库 + 系统前缀</span>
                            </div>
                            <div style="display:flex;justify-content:space-between;border-bottom:1px solid #f8fafc;padding:4px 0;">
                                <span style="color:#64748b;">系统缓存键数：</span>
                                <strong style="color:#1e58ff;">${d.system_key_count !== undefined ? d.system_key_count + ' 个' : '由文件缓存托管'}</strong>
                            </div>
                            <div style="display:flex;justify-content:space-between;border-bottom:1px solid #f8fafc;padding:4px 0;">
                                <span style="color:#64748b;">清理保护：</span>
                                <span class="badge badge-info">仅清理系统自身缓存</span>
                            </div>
                            <div style="display:flex;justify-content:space-between;padding:4px 0;">
                                <span style="color:#64748b;">客户端连接数：</span>
                                <strong>${d.redis_clients || 1} 个并发连接</strong>
                            </div>
                        </div>
                    </div>

                    <!-- 本地文件缓存 -->
                    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:20px;">
                        <h4 style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:12px;">本地文件缓存</h4>
                        <div style="font-size:13px;line-height:2.2;">
                            <div style="display:flex;justify-content:space-between;border-bottom:1px solid #f8fafc;padding:4px 0;">
                                <span style="color:#64748b;">缓存存储路径：</span>
                                <code style="font-size:11px;">runtime/cache/</code>
                            </div>
                            <div style="display:flex;justify-content:space-between;border-bottom:1px solid #f8fafc;padding:4px 0;">
                                <span style="color:#64748b;">目录权限：</span>
                                <span>${d.file_dir_writable ? '<span class="badge badge-success">正常可写</span>' : '<span class="badge badge-danger">权限不足</span>'}</span>
                            </div>
                            <div style="display:flex;justify-content:space-between;border-bottom:1px solid #f8fafc;padding:4px 0;">
                                <span style="color:#64748b;">缓存文件数量：</span>
                                <strong>${d.file_cache_count || 0} 个文件</strong>
                            </div>
                            <div style="display:flex;justify-content:space-between;border-bottom:1px solid #f8fafc;padding:4px 0;">
                                <span style="color:#64748b;">磁盘空间占用：</span>
                                <strong>${escapeHtml(d.file_cache_size || '0 KB')}</strong>
                            </div>
                            <div style="display:flex;justify-content:space-between;padding:4px 0;">
                                <span style="color:#64748b;">备用方案：</span>
                                <span class="badge badge-success">自动降级为文件缓存</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 采样缓存键列表 -->
                <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:20px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                        <h4 style="font-size:15px;font-weight:700;color:#0f172a;">当前缓存键采样</h4>
                        <span style="font-size:12px;color:#64748b;">展示系统当前正在使用的部分缓存数据</span>
                    </div>
                    <table class="table" style="margin-bottom:0;">
                        <thead>
                            <tr>
                                <th>缓存键名称</th>
                                <th style="width:120px;">状态</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sampleKeysHtml}
                        </tbody>
                    </table>
                </div>
            `;

            if (isManual && window.SysUI) {
                window.SysUI.toast('缓存监控与性能统计已更新！', 'success');
            }
        } catch (err) {
            console.error('刷新缓存数据异常:', err);
            if (isManual && window.SysUI) {
                window.SysUI.toast('刷新异常: ' + (err.message || '网络连接失败'), 'error');
            }
        } finally {
            if (isManual && refreshBtn) {
                refreshBtn.disabled = false;
                if (refreshIcon) refreshIcon.style.animation = '';
                if (refreshText) refreshText.innerText = '刷新';
            }
        }
    }

    document.getElementById('btn-cache-refresh')?.addEventListener('click', function() {
        loadData(true);
    });

        document.getElementById('btn-cache-clear')?.addEventListener('click', async function () {
            const confirmed = await SysUI.confirm('安全确认：将安全清理本回收系统的所有前缀缓存与本地文件缓存，绝不影响同服务器其他系统。确认继续？', {
                title: '清理缓存确认',
                type: 'warning',
                confirmText: '立即清空',
                isDanger: true
            });
            if (!confirmed) return;
            const btn = this;
            btn.disabled = true;
            btn.innerText = '正在安全清空...';
            const res = await api.post('/admin/system/clearCache', {});
            btn.disabled = false;
            btn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="margin-right:6px;"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>一键安全清空系统缓存`;
            if (res && res.code === 200) {
                SysUI.toast(res.msg || '缓存已安全重置清理！', 'success');
                loadData();
            } else {
                SysUI.toast(res ? res.msg : '清理失败', 'error');
            }
        });

        // ==================== Redis 配置弹窗交互逻辑 ====================
        const modalRedis = document.getElementById('modal-redis-config');
        const formRedis = document.getElementById('form-redis-config');
        const statusBox = document.getElementById('redis-test-status');

        function closeRedisModal() {
            if (modalRedis) modalRedis.style.display = 'none';
            if (statusBox) {
                statusBox.style.display = 'none';
                statusBox.innerText = '';
            }
        }

        document.getElementById('btn-close-redis-modal')?.addEventListener('click', closeRedisModal);
        document.getElementById('btn-cancel-redis-modal')?.addEventListener('click', closeRedisModal);
        modalRedis?.addEventListener('click', function (e) {
            if (e.target === modalRedis) closeRedisModal();
        });

        // 快捷库号按钮
        document.querySelectorAll('.btn-quick-db').forEach(btn => {
            btn.addEventListener('click', function () {
                const dbVal = this.getAttribute('data-db');
                const dbInput = document.getElementById('cfg-redis-db');
                if (dbInput) dbInput.value = dbVal;

                document.querySelectorAll('.btn-quick-db').forEach(b => {
                    b.classList.remove('btn-primary');
                    b.classList.add('btn-outline');
                    b.style.background = '';
                    b.style.borderColor = '';
                });
                this.classList.remove('btn-outline');
                this.classList.add('btn-primary');
                this.style.background = '#2563eb';
                this.style.borderColor = '#2563eb';
            });
        });

        // 点击顶部“配置 Redis / 切换独立库”按钮
        document.getElementById('btn-cache-config')?.addEventListener('click', async function () {
            if (!modalRedis) return;
            const btn = this;
            btn.disabled = true;

            const res = await api.get('/admin/system/getRedisConfig');
            btn.disabled = false;

            if (res && res.code === 200 && res.data) {
                const cfg = res.data;
                const enableEl = document.getElementById('cfg-redis-enable');
                const hostEl = document.getElementById('cfg-redis-host');
                const portEl = document.getElementById('cfg-redis-port');
                const passEl = document.getElementById('cfg-redis-pass');
                const dbEl = document.getElementById('cfg-redis-db');
                const prefixEl = document.getElementById('cfg-redis-prefix');
                const timeoutEl = document.getElementById('cfg-redis-timeout');

                if (enableEl) enableEl.checked = !!cfg.enable;
                if (hostEl) hostEl.value = cfg.host || '127.0.0.1';
                if (portEl) portEl.value = cfg.port || 6379;
                if (passEl) passEl.value = cfg.password || '';
                if (dbEl) dbEl.value = cfg.db_index !== undefined ? cfg.db_index : 6;
                if (prefixEl) prefixEl.value = cfg.prefix || 'sys_recycle:';
                if (timeoutEl) timeoutEl.value = cfg.timeout || 2.0;

                // 高亮当前库号快捷按钮
                document.querySelectorAll('.btn-quick-db').forEach(b => {
                    if (b.getAttribute('data-db') == String(cfg.db_index)) {
                        b.classList.remove('btn-outline');
                        b.classList.add('btn-primary');
                        b.style.background = '#2563eb';
                        b.style.borderColor = '#2563eb';
                    } else {
                        b.classList.remove('btn-primary');
                        b.classList.add('btn-outline');
                        b.style.background = '';
                        b.style.borderColor = '';
                    }
                });
            }

            if (statusBox) {
                statusBox.style.display = 'none';
                statusBox.innerText = '';
            }

            modalRedis.style.display = 'flex';
        });

        // 测试 Redis 连接连通性
        document.getElementById('btn-test-redis-conn')?.addEventListener('click', async function () {
            const btn = this;
            const host = document.getElementById('cfg-redis-host')?.value.trim() || '127.0.0.1';
            const port = parseInt(document.getElementById('cfg-redis-port')?.value || '6379', 10);
            const password = document.getElementById('cfg-redis-pass')?.value || '';
            const dbIndex = parseInt(document.getElementById('cfg-redis-db')?.value || '0', 10);
            const prefix = document.getElementById('cfg-redis-prefix')?.value.trim() || 'sys_recycle:';
            const timeout = parseFloat(document.getElementById('cfg-redis-timeout')?.value || '2.0');

            btn.disabled = true;
            btn.innerText = '正在测试连接...';

            if (statusBox) {
                statusBox.style.display = 'block';
                statusBox.style.background = '#f8fafc';
                statusBox.style.border = '1px solid #cbd5e1';
                statusBox.style.color = '#334155';
                statusBox.innerText = '正在向 Redis 服务端发起握手测试并尝试选择 DB ' + dbIndex + '...';
            }

            const res = await api.post('/admin/system/testRedis', {
                host, port, password, db_index: dbIndex, prefix, timeout
            });

            btn.disabled = false;
            btn.innerText = '⚡ 测试连接与 DB 库';

            if (statusBox) {
                if (res && res.code === 200) {
                    statusBox.style.background = '#ecfdf5';
                    statusBox.style.border = '1px solid #86efac';
                    statusBox.style.color = '#15803d';
                    statusBox.innerHTML = `<strong>✔ 测试成功：</strong>${escapeHtml(res.msg || 'Redis 连通正常，专属独立 DB 库切换通过！')}`;
                } else {
                    statusBox.style.background = '#fef2f2';
                    statusBox.style.border = '1px solid #fecaca';
                    statusBox.style.color = '#b91c1c';
                    statusBox.innerHTML = `<strong>✖ 测试未通过：</strong>${escapeHtml(res ? res.msg : '连接被拒绝或超时')}`;
                }
            }
        });

        // 提交保存 Redis 配置
        formRedis?.addEventListener('submit', async function (e) {
            e.preventDefault();
            const submitBtn = document.getElementById('btn-save-redis-config');
            const enable = document.getElementById('cfg-redis-enable')?.checked ? 1 : 0;
            const host = document.getElementById('cfg-redis-host')?.value.trim() || '127.0.0.1';
            const port = parseInt(document.getElementById('cfg-redis-port')?.value || '6379', 10);
            const password = document.getElementById('cfg-redis-pass')?.value || '';
            const dbIndex = parseInt(document.getElementById('cfg-redis-db')?.value || '0', 10);
            const prefix = document.getElementById('cfg-redis-prefix')?.value.trim() || 'sys_recycle:';
            const timeout = parseFloat(document.getElementById('cfg-redis-timeout')?.value || '2.0');

            if (port < 1 || port > 65535) {
                SysUI.toast('请输入有效的端口号 (1-65535)', 'error');
                return;
            }
            if (dbIndex < 0 || dbIndex > 15) {
                SysUI.toast('Redis 专属 DB 库号必须在 0 到 15 之间', 'error');
                return;
            }

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerText = '正在保存并切换...';
            }

            const res = await api.post('/admin/system/saveRedisConfig', {
                enable, host, port, password, db_index: dbIndex, prefix, timeout
            });

            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerText = '保存并应用';
            }

            if (res && res.code === 200) {
                SysUI.toast(res.msg || 'Redis 配置已成功保存，系统已切换至新独立库！', 'success');
                closeRedisModal();
                loadData();
            } else {
                if (statusBox) {
                    statusBox.style.display = 'block';
                    statusBox.style.background = '#fef2f2';
                    statusBox.style.border = '1px solid #fecaca';
                    statusBox.style.color = '#b91c1c';
                    statusBox.innerHTML = `<strong>保存失败：</strong>${escapeHtml(res ? res.msg : '无法写入配置')}`;
                } else {
                    SysUI.toast(res ? res.msg : '保存配置失败', 'error');
                }
            }
        });

        loadData();
    }

    // ==========================================

    window.renderCacheView = renderCacheView;
})(window);
