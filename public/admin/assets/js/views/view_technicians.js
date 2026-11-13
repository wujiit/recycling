/**
 * 启灵同城服务系统 - 自营服务人员与技师名录管理视图
 * 职责：管理本店全自营技师/服务人员（支持店长自己或店内员工直接录入手机号），无需第三方入驻审核与平台抽成
 * 编码：UTF-8 无 BOM
 */
(function (window) {
    'use strict';

    const SysUI = window.SysUI;
    const api = window.adminApi || window.api;
    const escapeHtml = window.escapeHtml || function (s) { return s == null ? '' : String(s); };
    const formatTime = window.formatTime || function (t) { return t || '-'; };

    const SERVICE_TYPE_NAMES = {
        'cleaning': '上门保洁',
        'appliance': '家电清洗',
        'repair': '家庭维修',
        'pipe': '管道疏通',
        'pet_walk': '上门遛狗/伴宠',
        'errand': '帮办跑腿'
    };

    async function renderTechniciansView(container) {
        container.innerHTML = `
            <div class="card" style="padding: 20px;">
                <div class="toolbar" style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;border-bottom:1px solid #e2e8f0;padding-bottom:14px;margin-bottom:16px;">
                    <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;">
                        <input type="text" class="form-control" id="tech-kw" placeholder="搜索技师/员工姓名或手机号" style="width:220px;">
                        <select class="form-control" id="tech-status-filter" style="width:140px;">
                            <option value="">全部在职状态</option>
                            <option value="active" selected>在职 (正常可派工)</option>
                            <option value="disabled">暂停排班/离职</option>
                        </select>
                        <select class="form-control" id="tech-online-filter" style="width:130px;">
                            <option value="">全部作业状态</option>
                            <option value="1">🟢 正在接单中</option>
                            <option value="0">⚪ 休息离线</option>
                        </select>
                        <button class="btn btn-primary" id="btn-tech-search">筛选</button>
                    </div>
                    <div style="display:flex;gap:10px;">
                        <button class="btn btn-success" id="btn-add-technician" style="background:#10b981;color:#fff;font-weight:700;">+ 添加技师/员工</button>
                    </div>
                </div>

                <div id="technicians-table-box">加载技师名录中...</div>
            </div>
        `;

        document.getElementById('btn-tech-search')?.addEventListener('click', loadTechniciansData);
        document.getElementById('btn-add-technician')?.addEventListener('click', () => openTechnicianModal());
        loadTechniciansData();
    }

    async function loadTechniciansData() {
        const tableBox = document.getElementById('technicians-table-box');
        if (!tableBox) return;

        const kw = document.getElementById('tech-kw')?.value.trim() || '';
        const status = document.getElementById('tech-status-filter')?.value || '';
        const isOnline = document.getElementById('tech-online-filter')?.value || '';

        const res = await api.get(`/admin/technician/list&keyword=${encodeURIComponent(kw)}&status=${encodeURIComponent(status)}&is_online=${encodeURIComponent(isOnline)}&page=1&page_size=50`);
        if (!res || res.code !== 200) {
            tableBox.innerHTML = '<div style="text-align:center;padding:30px;color:#ef4444;">加载自营技师名录失败</div>';
            return;
        }

        const list = res.data.list || [];
        if (list.length === 0) {
            tableBox.innerHTML = `
                <div style="text-align:center;padding:40px;color:#94a3b8;">
                    暂无店内自营技师或员工档案，点击右上角【+ 添加店内自营技师/员工】录入
                </div>
            `;
            return;
        }

        let rows = '';
        list.forEach(t => {
            const onlineBadge = t.is_online 
                ? '<span class="badge" style="background:#dcfce7;color:#15803d;">🟢 在岗作业中</span>' 
                : '<span class="badge" style="background:#f1f5f9;color:#64748b;">⚪ 休息</span>';
            
            const statusBadge = (t.status === 'active' || t.status === 1)
                ? '<span class="badge" style="background:#dcfce7;color:#15803d;font-weight:600;">正常</span>'
                : '<span class="badge" style="background:#f1f5f9;color:#64748b;">暂停</span>';

            const types = (t.service_types || []).map(k => `<span class="badge" style="background:#f8fafc;color:#475569;border:1px solid #cbd5e1;font-size:11px;margin:1px;">${escapeHtml(SERVICE_TYPE_NAMES[k] || k)}</span>`).join(' ');

            rows += `<tr>
                <td style="font-weight:700;">#${t.id}</td>
                <td>
                    <div style="font-weight:700;color:#0f172a;font-size:14px;">${escapeHtml(t.realname)}</div>
                    <div style="font-size:12px;color:#64748b;margin-top:2px;">备注: ${escapeHtml(t.notes || '自营服务人员')}</div>
                </td>
                <td>
                    <strong style="color:#0284c7;font-family:monospace;font-size:14px;">${escapeHtml(t.mobile)}</strong>
                    
                </td>
                <td style="max-width:220px;">${types || '<span style="color:#94a3b8;font-size:12px;">全部服务类别</span>'}</td>
                <td>${onlineBadge}</td>
                <td>${statusBadge}</td>
                <td>
                    <div>累计履约: <strong style="color:#0f172a;">${t.total_orders || 0}</strong> 单</div>
                    <div style="font-size:12px;color:#ea580c;margin-top:2px;">⭐ ${parseFloat(t.rating || 5.0).toFixed(1)} 满意度</div>
                </td>
                <td style="font-size:12px;color:#64748b;">${formatTime(t.created_at)}</td>
                <td>
                    <div style="display:flex;gap:6px;flex-wrap:wrap;">
                        <button class="btn btn-secondary" style="height:28px;padding:0 10px;font-size:12px;" onclick="window.editTechnician(${t.id})">编辑</button>
                        <button class="btn btn-danger" style="height:28px;padding:0 8px;font-size:12px;background:#ef4444;color:#fff;" onclick="window.deleteTechnician(${t.id})">删除</button>
                    </div>
                </td>
            </tr>`;
        });

        tableBox.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr><th>ID</th><th>技师/员工姓名</th><th>登录联系手机号</th><th>负责服务工种</th><th>作业状态</th><th>在职状态</th><th>履约成单</th><th>录入时间</th><th>操作</th></tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        `;
    }

    /**
     * 录入 / 编辑店内自营技师模态框
     */
    async function openTechnicianModal(techId = 0) {
        let tech = {
            id: 0,
            realname: '',
            mobile: '',
            id_card: '',
            service_types: ['cleaning', 'appliance', 'repair', 'pet_walk'],
            status: 'active',
            notes: ''
        };

        if (techId > 0) {
            const res = await api.get(`/admin/technician/detail&id=${techId}`);
            if (res && res.code === 200 && res.data) {
                tech = res.data;
            } else {
                SysUI.toast('获取技师档案失败', 'error');
                return;
            }
        }

        const allTypes = [
            { key: 'pet_walk', label: '上门遛狗/伴宠喂食' },
            { key: 'cleaning', label: '日常保洁/深度清洁' },
            { key: 'appliance', label: '家电拆洗/高温消杀' },
            { key: 'repair', label: '家庭维修/水电急修' },
            { key: 'pipe', label: '管道疏通/排污疏通' },
            { key: 'errand', label: '同城跑腿/急办急送' }
        ];

        const checkboxesHtml = allTypes.map(t => {
            const checked = (tech.service_types || []).includes(t.key) ? 'checked' : '';
            return `
                <label style="display:inline-flex;align-items:center;gap:4px;margin-right:12px;margin-bottom:6px;font-size:13px;cursor:pointer;">
                    <input type="checkbox" name="tech_service_types" value="${t.key}" ${checked}>
                    <span>${t.label}</span>
                </label>
            `;
        }).join('');

        const modalHtml = `
            <div id="tech-modal" class="modal-overlay" style="display:flex;align-items:center;justify-content:center;">
                <div class="modal-card" style="width:560px;max-width:92vw;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1);">
                    <div class="modal-header" style="padding:16px 20px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;background:#f8fafc;">
                        <h3 style="margin:0;font-size:16px;font-weight:700;color:#0f172a;">${techId > 0 ? '编辑技师档案' : '添加技师/员工'}</h3>
                        <span class="modal-close-btn" style="cursor:pointer;font-size:20px;color:#64748b;" onclick="document.getElementById('tech-modal').remove()">✕</span>
                    </div>
                    <div class="modal-body" style="padding:20px;max-height:80vh;overflow-y:auto;">


                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
                            <div>
                                <label class="form-label" style="display:block;margin-bottom:6px;font-weight:600;font-size:13px;">姓名 / 称呼 <span style="color:#ef4444;">*</span></label>
                                <input type="text" class="form-control" id="f-tech-name" value="${escapeHtml(tech.realname)}" placeholder="例：张师傅 (或店长自己)" required>
                            </div>
                            <div>
                                <label class="form-label" style="display:block;margin-bottom:6px;font-weight:600;font-size:13px;">手机号 (工作台登录) <span style="color:#ef4444;">*</span></label>
                                <input type="text" class="form-control" id="f-tech-mobile" value="${escapeHtml(tech.mobile)}" placeholder="11位手机号" required>
                            </div>
                        </div>

                        <div style="margin-bottom:14px;">
                            <label class="form-label" style="display:block;margin-bottom:6px;font-weight:600;font-size:13px;">负责服务类别 <span style="color:#ef4444;">*</span></label>
                            <div style="padding:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;display:flex;flex-wrap:wrap;">
                                ${checkboxesHtml}
                            </div>
                        </div>

                        <div style="margin-bottom:14px;">
                            <label class="form-label" style="display:block;margin-bottom:6px;font-weight:600;font-size:13px;">在职与排班状态</label>
                            <select class="form-control" id="f-tech-status" style="width:100%;height:38px;">
                                <option value="active" ${tech.status === 'active' || tech.status === 1 ? 'selected' : ''}>正常 (在职)</option>
                                <option value="disabled" ${tech.status === 'disabled' || tech.status === 0 ? 'selected' : ''}>暂停接单</option>
                            </select>
                        </div>

                        <div style="margin-bottom:14px;">
                            <label class="form-label" style="display:block;margin-bottom:6px;font-weight:600;font-size:13px;">角色备注说明</label>
                            <input type="text" class="form-control" id="f-tech-notes" value="${escapeHtml(tech.notes || '')}" placeholder="例：本店店长兼总技师、金牌全职宠托师等">
                        </div>
                    </div>
                    <div class="modal-footer" style="padding:14px 20px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:10px;background:#f8fafc;">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('tech-modal').remove()">取消</button>
                        <button type="button" class="btn btn-primary" id="btn-save-tech" style="background:#1e58ff;">保存技师档案</button>
                    </div>
                </div>
            </div>
        `;

        const oldModal = document.getElementById('tech-modal');
        if (oldModal) oldModal.remove();
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        document.getElementById('btn-save-tech')?.addEventListener('click', async () => {
            const realname = document.getElementById('f-tech-name')?.value.trim();
            const mobile = document.getElementById('f-tech-mobile')?.value.trim();
            if (!realname || !mobile) {
                SysUI.toast('请填写技师姓名与手机号', 'warning');
                return;
            }

            const checkedTypes = [];
            document.querySelectorAll('input[name="tech_service_types"]:checked').forEach(cb => {
                checkedTypes.push(cb.value);
            });

            const payload = {
                id: techId,
                realname: realname,
                mobile: mobile,
                id_card: '',
                service_types: checkedTypes,
                commission_rate: 100, // 自营门店模式无需平台抽成
                status: document.getElementById('f-tech-status')?.value || 'active',
                notes: document.getElementById('f-tech-notes')?.value.trim() || ''
            };

            const res = await api.post('/admin/technician/save', payload);
            if (res && res.code === 200) {
                SysUI.toast('自营技师保存成功！', 'success');
                document.getElementById('tech-modal')?.remove();
                loadTechniciansData();
            } else {
                SysUI.toast(res ? res.msg : '保存失败', 'error');
            }
        });
    }

    // 全局方法挂载
    window.renderTechniciansView = renderTechniciansView;
    window.editTechnician = id => openTechnicianModal(id);

    window.deleteTechnician = async function (id) {
        const ok = await SysUI.confirm('确定要删除此自营技师档案吗？', {
            title: '删除技师确认',
            type: 'danger',
            confirmText: '确认删除',
            isDanger: true
        });
        if (ok) {
            const res = await api.post('/admin/technician/delete', { id });
            if (res && res.code === 200) {
                SysUI.toast('技师档案已删除', 'success');
                loadTechniciansData();
            } else {
                SysUI.toast(res ? res.msg : '删除失败', 'error');
            }
        }
    };

})(window);
