/**
 * 启灵同城服务系统 - 质检评估题目与选项管理视图
 * 职责：各行业质检评估问卷维护、图例上传、选项扣减规则配置
 * 编码：UTF-8 无 BOM
 */
(function (window) {
    'use strict';

    const SysUI = window.SysUI;
    const api = window.adminApi || window.api;
    const state = window.adminState || window.state;
    const escapeHtml = window.escapeHtml || function(s) { return s; };

    function reloadQuestions() {
        if (typeof window.loadTabContent === 'function') {
            window.loadTabContent('questions');
        } else {
            const box = document.getElementById('tab-content');
            if (box && typeof window.renderQuestionsView === 'function') {
                window.renderQuestionsView(box);
            }
        }
    }
    let cachedQuestionList = [];
    async function renderQuestionsView(container) {
        let catOptions = `<option value="all">全部品类</option><option value="0">通用题库</option>`;
        state.categories.forEach(c => {
            catOptions += `<option value="${c.id}">${escapeHtml(c.name)}</option>`;
        });

        container.innerHTML = `
            <div class="card" style="margin-bottom:20px;">
                <div class="toolbar" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <label style="font-weight:600;font-size:13px;">所属品类：</label>
                        <select class="form-control" id="question-cat-filter" style="width:200px;">
                            ${catOptions}
                        </select>
                        <button class="btn btn-secondary" id="btn-refresh-questions">刷新</button>
                    </div>
                    <div>
                        <button class="btn btn-primary" onclick="window.openQuestionModal()">+ 新增题目</button>
                    </div>
                </div>
            </div>

            <div id="questions-container-box">
                <div class="card" style="text-align:center;padding:40px;color:#94a3b8;">正在加载评估题目与选项设置...</div>
            </div>
        `;

        async function loadQuestions() {
            const catId = document.getElementById('question-cat-filter')?.value || 'all';
            const box = document.getElementById('questions-container-box');
            if (box) {
                box.innerHTML = '<div class="card" style="text-align:center;padding:40px;color:#94a3b8;">正在加载评估题目与选项设置...</div>';
            }

            const res = await api.get(`/admin/question/list&category_id=${catId}`);
            if (!res || res.code !== 200) {
                if (box) box.innerHTML = '<div class="card" style="text-align:center;padding:40px;color:#ef4444;">加载题目失败</div>';
                return;
            }

            cachedQuestionList = res.data.list || [];
            if (cachedQuestionList.length === 0) {
                box.innerHTML = `
                    <div class="card" style="text-align:center;padding:60px 20px;">
                        <div class="stat-icon stat-blue" style="margin:0 auto 12px auto;width:48px;height:48px;"><svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg></div>
                        <h4 style="color:#0f172a;margin-bottom:6px;">该品类暂未配置独立评估题目</h4>
                        <p style="color:#64748b;font-size:13px;margin-bottom:16px;">您可点击上方【+ 新增评估题目】为此行业创建专属的质检问答项，或选择其他品类。</p>
                        <button class="btn btn-primary" onclick="window.openQuestionModal()">立即创建第一道评估题</button>
                    </div>
                `;
                return;
            }

            let cardsHtml = '';
            cachedQuestionList.forEach((q, idx) => {
                const items = q.items || [];
                let itemsRows = '';
                if (items.length === 0) {
                    itemsRows = `<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:20px;">该题目尚未添加选项，请点击上方【添加选项】</td></tr>`;
                } else {
                    items.forEach(it => {
                        const hasImg = it.image && it.image.trim() !== '';
                        const imgHtml = hasImg
                            ? `<div style="display:flex;align-items:center;gap:6px;cursor:pointer;" onclick="window.previewImage('${escapeHtml(it.image)}', '${escapeHtml(it.name)}')">
                                   <img src="${escapeHtml(it.image)}" style="width:42px;height:42px;border-radius:6px;object-fit:cover;border:1px solid #cbd5e1;">
                                   <span style="font-size:11px;color:#1e58ff;">查看大图</span>
                               </div>`
                            : `<span style="color:#cbd5e1;font-size:12px;">无参考图</span>`;

                        const deductText = it.deduct_type === 'ratio'
                            ? `<span style="color:#dc2626;font-weight:600;">扣减 ${Math.abs(parseFloat(it.deduct_value))}%</span>`
                            : (parseFloat(it.deduct_value) < 0
                                ? `<span style="color:#dc2626;font-weight:600;">¥ ${it.deduct_value}</span>`
                                : (parseFloat(it.deduct_value) > 0 ? `<span style="color:#10b981;font-weight:600;">+¥ ${it.deduct_value}</span>` : `<span style="color:#64748b;">¥ 0.00 (无扣减)</span>`));

                        const faultBadge = Number(it.is_fault) === 1
                            ? `<span class="badge badge-danger">瑕疵项</span>`
                            : `<span class="badge badge-success">正常项</span>`;

                        itemsRows += `
                            <tr>
                                <td style="width:110px;">${imgHtml}</td>
                                <td>
                                    <strong>${escapeHtml(it.name)}</strong>
                                    ${it.desc_text ? `<div style="font-size:12px;color:#64748b;margin-top:2px;">${escapeHtml(it.desc_text)}</div>` : ''}
                                </td>
                                <td>${deductText}</td>
                                <td>${faultBadge}</td>
                                <td>${it.sort || 0}</td>
                                <td>
                                    <div style="display:flex;gap:6px;">
                                        <button class="btn btn-sm btn-secondary" onclick="window.editItem(${q.id}, '${escapeHtml(q.title)}', ${it.id})">编辑</button>
                                        <button class="btn btn-sm btn-danger" onclick="window.deleteItem(${it.id})">删除</button>
                                    </div>
                                </td>
                            </tr>
                        `;
                    });
                }

                cardsHtml += `
                    <div class="card" style="margin-bottom:20px;padding:0;overflow:hidden;border:1px solid #e2e8f0;">
                        <div style="background:#f8fafc;padding:14px 20px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                            <div style="display:flex;align-items:center;gap:10px;">
                                <span class="badge" style="background:#e0e7ff;color:#3730a3;font-weight:600;">${escapeHtml(q.category_name || '通用')}</span>
                                <h3 style="font-size:16px;font-weight:700;color:#0f172a;margin:0;">${idx + 1}. ${escapeHtml(q.title)}</h3>
                                ${q.sub_title ? `<span style="font-size:13px;color:#64748b;">(${escapeHtml(q.sub_title)})</span>` : ''}
                                <span class="badge badge-gray" style="font-size:11px;">${q.type === 'checkbox' ? '多选' : '单选'}</span>
                                <span style="font-size:12px;color:#94a3b8;">排序: ${q.sort}</span>
                            </div>
                            <div style="display:flex;gap:8px;">
                                <button class="btn btn-sm btn-primary" onclick="window.openItemModal(${q.id}, '${escapeHtml(q.title)}')">+ 添加选项</button>
                                <button class="btn btn-sm btn-secondary" onclick="window.editQuestion(${q.id})">修改题目</button>
                                <button class="btn btn-sm btn-danger" onclick="window.deleteQuestion(${q.id})">删除题目</button>
                            </div>
                        </div>
                        <div style="padding:0;">
                            <table class="data-table" style="margin:0;">
                                <thead>
                                    <tr>
                                        <th>参考示意图例</th>
                                        <th>选项名称与质检标准说明</th>
                                        <th>预估扣减规则</th>
                                        <th>成色属性</th>
                                        <th>排序权重</th>
                                        <th>操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${itemsRows}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            });

            box.innerHTML = cardsHtml;
        }

        document.getElementById('question-cat-filter')?.addEventListener('change', loadQuestions);
        document.getElementById('btn-refresh-questions')?.addEventListener('click', loadQuestions);
        loadQuestions();
    }

    // 题目弹窗：新增或修改
    window.openQuestionModal = function (qData = null) {
        const isEdit = !!(qData && qData.id);
        const item = qData || {
            id: 0,
            category_id: 0,
            title: '',
            sub_title: '',
            type: 'radio',
            is_required: 1,
            sort: 50
        };

        let catOptions = `<option value="0" ${item.category_id == 0 ? 'selected' : ''}>全行业通用标准</option>`;
        state.categories.forEach(c => {
            catOptions += `<option value="${c.id}" ${item.category_id == c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`;
        });

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-card" style="max-width:560px;">
                <div class="modal-header">
                    <span>${isEdit ? '修改评估题目' : '新增评估题目'}</span>
                    <span style="cursor:pointer;font-size:18px;" onclick="this.closest('.modal-overlay').remove()">✕</span>
                </div>
                <form id="form-q-modal" class="modal-body" style="font-size:13px;">
                    <div class="login-form-group">
                        <label>所属行业/品类</label>
                        <select id="modal-q-cat" class="form-control" style="width:100%;">
                            ${catOptions}
                        </select>
                        <small style="color:#64748b;">如选“全行业通用标准”，则无论切换到哪个行业均会显示该题目</small>
                    </div>
                    <div class="login-form-group">
                        <label>题目标题 (例如: 屏幕外观与显示成色、车况年份里程、含杂率)</label>
                        <input type="text" id="modal-q-title" class="form-control" value="${escapeHtml(item.title)}" placeholder="请输入题目标题" required>
                    </div>
                    <div class="login-form-group">
                        <label>引导提示副标题</label>
                        <input type="text" id="modal-q-sub" class="form-control" value="${escapeHtml(item.sub_title)}" placeholder="如：在强光下熄屏观察屏幕划痕及亮屏显示">
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                        <div class="login-form-group">
                            <label>题目类型</label>
                            <select id="modal-q-type" class="form-control">
                                <option value="radio" ${item.type === 'radio' ? 'selected' : ''}>单选题 (每题选一项)</option>
                                <option value="checkbox" ${item.type === 'checkbox' ? 'selected' : ''}>多选题 (可勾选多项瑕疵)</option>
                            </select>
                        </div>
                        <div class="login-form-group">
                            <label>排序权重 (数字越大越靠前)</label>
                            <input type="number" id="modal-q-sort" class="form-control" value="${item.sort || 50}">
                        </div>
                    </div>
                    <div class="modal-footer" style="padding:16px 0 0;margin-top:16px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:10px;">
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">取消</button>
                        <button type="submit" class="btn btn-primary">${isEdit ? '保存题目变更' : '立即创建题目'}</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('#form-q-modal').addEventListener('submit', async function (e) {
            e.preventDefault();
            const payload = {
                id: item.id || 0,
                category_id: parseInt(document.getElementById('modal-q-cat')?.value || 0),
                title: document.getElementById('modal-q-title')?.value.trim(),
                sub_title: document.getElementById('modal-q-sub')?.value.trim(),
                type: document.getElementById('modal-q-type')?.value || 'radio',
                is_required: 1,
                sort: parseInt(document.getElementById('modal-q-sort')?.value || 0)
            };

            const res = await api.post('/admin/question/saveQuestion', payload);
            if (res && res.code === 200) {
                SysUI.toast('评估题目保存成功！', 'success');
                modal.remove();
                reloadQuestions();
            } else {
                SysUI.toast(res ? res.msg : '保存失败', 'error');
            }
        });
    };

    window.editQuestion = function (qId) {
        const q = cachedQuestionList.find(x => x.id == qId);
        if (q) {
            window.openQuestionModal(q);
        }
    };

    window.deleteQuestion = async function (qId) {
        const confirmed = await SysUI.confirm('确认删除该评估题目吗？\n警告：删除后该题目下的所有选项细项也会被同步删除！', {
            title: '删除题目确认',
            type: 'error',
            confirmText: '彻底删除'
        });
        if (!confirmed) return;
        const res = await api.post('/admin/question/deleteQuestion', { id: qId });
        if (res && res.code === 200) {
            SysUI.toast('题目及选项已成功删除！', 'success');
            reloadQuestions();
        } else {
            SysUI.toast(res ? res.msg : '删除失败', 'error');
        }
    };

    // 选项弹窗：新增或修改（重点：支持上传参考示意图）
    window.openItemModal = function (questionId, questionTitle, itemData = null) {
        const isEdit = !!(itemData && itemData.id);
        const item = itemData || {
            id: 0,
            question_id: questionId,
            name: '',
            desc_text: '',
            image: '',
            deduct_type: 'fixed',
            deduct_value: 0.00,
            is_fault: 0,
            sort: 50
        };

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-card" style="max-width:600px;">
                <div class="modal-header">
                    <span>${isEdit ? '编辑选项与参考图' : '添加选项'} · 【${escapeHtml(questionTitle)}】</span>
                    <span style="cursor:pointer;font-size:18px;" onclick="this.closest('.modal-overlay').remove()">✕</span>
                </div>
                <form id="form-item-modal" class="modal-body" style="font-size:13px;">
                    <div class="login-form-group">
                        <label>选项文案 (如: 完美无划痕 / 亮屏纯净无斑 或 边缘有明显磕碰凹陷)</label>
                        <input type="text" id="modal-item-name" class="form-control" value="${escapeHtml(item.name)}" placeholder="请输入选项名称" required>
                    </div>

                    <!-- 重点：参考示意图上传与预览 -->
                    <div class="login-form-group" style="background:#f8fafc;padding:12px;border-radius:8px;border:1px solid #e2e8f0;">
                        <label style="font-weight:700;color:#1e293b;display:block;margin-bottom:6px;">选项参考示意图例 (前台直观展示给用户)</label>
                        <div style="display:flex;align-items:center;gap:16px;">
                            <div id="modal-item-preview-box" style="width:72px;height:72px;border:1px dashed #cbd5e1;border-radius:8px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#fff;flex-shrink:0;cursor:pointer;">
                                <img src="${item.image || ''}" style="width:100%;height:100%;object-fit:cover;${item.image ? '' : 'display:none;'}" id="modal-item-preview-img">
                                <span style="font-size:24px;color:#94a3b8;${item.image ? 'display:none;' : ''}" id="modal-item-preview-empty"><svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M12 12m-3.2 0a3.2 3.2 0 1 0 6.4 0 3.2 3.2 0 1 0-6.4 0zM9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg></span>
                            </div>
                            <div style="flex:1;">
                                <div style="display:flex;gap:8px;margin-bottom:8px;">
                                    <input type="file" id="modal-item-file-input" accept="image/*" style="display:none;">
                                    <button type="button" class="btn btn-sm btn-info" id="btn-trigger-upload-item">选择本地图片上传</button>
                                    <button type="button" class="btn btn-sm btn-outline" id="btn-pick-library-item">从图库选择</button>
                                    <button type="button" class="btn btn-sm btn-secondary" id="btn-clear-upload-item">清空图片</button>
                                </div>
                                <input type="text" id="modal-item-img-url" class="form-control" style="font-size:12px;" value="${escapeHtml(item.image || '')}" placeholder="直接填写外部图片链接 (http/https) 或点击上方选择本地上传">
                                <small style="color:#64748b;display:block;margin-top:4px;">支持直接填写外部图片 URL 或本地上传 (JPG/PNG/WEBP/GIF/SVG)，供用户答题时点击查看标准图解</small>
                            </div>
                        </div>
                    </div>

                    <div class="login-form-group">
                        <label>质检标准详细补充说明 (可选)</label>
                        <input type="text" id="modal-item-desc" class="form-control" value="${escapeHtml(item.desc_text)}" placeholder="如：在强光熄屏观察下，屏幕完全无反光细纹或发丝划痕">
                    </div>

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                        <div class="login-form-group">
                            <label>预估扣减模式</label>
                            <select id="modal-item-deduct-type" class="form-control">
                                <option value="fixed" ${item.deduct_type === 'fixed' ? 'selected' : ''}>固定金额 (元)</option>
                                <option value="ratio" ${item.deduct_type === 'ratio' ? 'selected' : ''}>比例扣减 (百分比 %)</option>
                            </select>
                        </div>
                        <div class="login-form-group">
                            <label>扣减数值 (填负数或0，如 -150)</label>
                            <input type="number" step="0.01" id="modal-item-deduct-val" class="form-control" value="${item.deduct_value || 0}">
                            <small style="color:#64748b;">如正常无瑕疵项填 0；瑕疵扣除 150 元填 -150</small>
                        </div>
                    </div>

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                        <div class="login-form-group">
                            <label>是否属于成色瑕疵/故障项</label>
                            <select id="modal-item-fault" class="form-control">
                                <option value="0" ${Number(item.is_fault) === 0 ? 'selected' : ''}>否 (正常/优良成色)</option>
                                <option value="1" ${Number(item.is_fault) === 1 ? 'selected' : ''}>是 (属于瑕疵/磨损/损坏项)</option>
                            </select>
                        </div>
                        <div class="login-form-group">
                            <label>排序权重 (数字越大越靠前)</label>
                            <input type="number" id="modal-item-sort" class="form-control" value="${item.sort || 50}">
                        </div>
                    </div>

                    <div class="modal-footer" style="padding:16px 0 0;margin-top:16px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:10px;">
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">取消</button>
                        <button type="submit" class="btn btn-primary">${isEdit ? '保存选项变更' : '立即添加该选项'}</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);

        // 绑定图片本地上传事件
        const fileInput = modal.querySelector('#modal-item-file-input');
        const uploadBtn = modal.querySelector('#btn-trigger-upload-item');
        const pickLibBtn = modal.querySelector('#btn-pick-library-item');
        const clearBtn = modal.querySelector('#btn-clear-upload-item');
        const urlInput = modal.querySelector('#modal-item-img-url');
        const previewImg = modal.querySelector('#modal-item-preview-img');
        const previewEmpty = modal.querySelector('#modal-item-preview-empty');

        uploadBtn?.addEventListener('click', () => fileInput?.click());

        pickLibBtn?.addEventListener('click', () => {
            window.openMediaLibraryModal({
                title: '为选项选择示意图',
                onSelect: (url) => {
                    if (urlInput) urlInput.value = url;
                    if (previewImg) {
                        previewImg.src = url;
                        previewImg.style.display = 'block';
                    }
                    if (previewEmpty) previewEmpty.style.display = 'none';
                }
            });
        });

        fileInput.addEventListener('change', async function () {
            if (!this.files || this.files.length === 0) return;
            const file = this.files[0];
            const fd = new FormData();
            fd.append('file', file);

            uploadBtn.disabled = true;
            uploadBtn.innerText = '正在上传中...';

            const res = await api.upload('/admin/upload/image', fd);
            uploadBtn.disabled = false;
            uploadBtn.innerText = '选择本地图片上传';

            if (res && res.code === 200 && res.data && res.data.url) {
                urlInput.value = res.data.url;
                previewImg.src = res.data.url;
                previewImg.style.display = 'block';
                previewEmpty.style.display = 'none';
            } else {
                SysUI.toast(res ? res.msg : '图片上传失败', 'error');
            }
        });

        clearBtn.addEventListener('click', () => {
            urlInput.value = '';
            previewImg.src = '';
            previewImg.style.display = 'none';
            previewEmpty.style.display = 'block';
            fileInput.value = '';
        });

        urlInput.addEventListener('input', function () {
            const val = this.value.trim();
            if (val) {
                previewImg.src = val;
                previewImg.style.display = 'block';
                previewEmpty.style.display = 'none';
            } else {
                previewImg.src = '';
                previewImg.style.display = 'none';
                previewEmpty.style.display = 'block';
            }
        });

        modal.querySelector('#form-item-modal').addEventListener('submit', async function (e) {
            e.preventDefault();
            const payload = {
                id: item.id || 0,
                question_id: questionId,
                name: document.getElementById('modal-item-name')?.value.trim(),
                desc_text: document.getElementById('modal-item-desc')?.value.trim(),
                image: document.getElementById('modal-item-img-url')?.value.trim(),
                deduct_type: document.getElementById('modal-item-deduct-type')?.value || 'fixed',
                deduct_value: parseFloat(document.getElementById('modal-item-deduct-val')?.value || 0),
                is_fault: parseInt(document.getElementById('modal-item-fault')?.value || 0),
                sort: parseInt(document.getElementById('modal-item-sort')?.value || 0)
            };

            const res = await api.post('/admin/question/saveItem', payload);
            if (res && res.code === 200) {
                SysUI.toast('选项及参考图例已保存！', 'success');
                modal.remove();
                reloadQuestions();
            } else {
                SysUI.toast(res ? res.msg : '保存失败', 'error');
            }
        });
    };

    window.editItem = function (qId, qTitle, itemId) {
        const q = cachedQuestionList.find(x => x.id == qId);
        if (!q) return;
        const it = (q.items || []).find(x => x.id == itemId);
        if (it) {
            window.openItemModal(qId, qTitle, it);
        }
    };

    window.deleteItem = async function (itemId) {
        const confirmed = await SysUI.confirm('确认删除该选项细项吗？', {
            title: '删除选项确认',
            type: 'error',
            confirmText: '确认删除'
        });
        if (!confirmed) return;
        const res = await api.post('/admin/question/deleteItem', { id: itemId });
        if (res && res.code === 200) {
            SysUI.toast('选项已成功删除！', 'success');
            reloadQuestions();
        } else {
            SysUI.toast(res ? res.msg : '删除失败', 'error');
        }
    };

    // 大图预览弹窗
    window.previewImage = function (url, title = '参考示意图例') {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-card" style="max-width:540px;text-align:center;padding:20px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                    <strong style="font-size:15px;">${escapeHtml(title)} · 质检图例</strong>
                    <span style="cursor:pointer;font-size:18px;" onclick="this.closest('.modal-overlay').remove()">✕</span>
                </div>
                <div style="max-height:75vh;overflow:hidden;border-radius:8px;background:#000;">
                    <img src="${escapeHtml(url)}" style="max-width:100%;max-height:70vh;object-fit:contain;display:block;margin:0 auto;">
                </div>
                <button class="btn btn-secondary" style="margin-top:14px;width:100%;" onclick="this.closest('.modal-overlay').remove()">关闭预览</button>
            </div>
        `;
        document.body.appendChild(modal);
    };


    window.renderQuestionsView = renderQuestionsView;
})(window);
