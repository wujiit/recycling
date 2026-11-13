/**
 * 启灵同城服务系统 - 前台多级导航菜单管理视图
 * 包含多级分类导航、跳转链接配置、徽章标记与状态启停维护
 */
(function (window) {
    'use strict';

    const SysUI = window.SysUI;
    const api = window.adminApi || window.api;
    const escapeHtml = window.escapeHtml || function (s) {
        if (!s) return '';
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };

    let menuTree = [];
    let categoryOptions = [];
    let editingItem = null;
    let editingParentId = 0;

    async function renderMenuView(container) {
        if (!container) return;

        container.innerHTML = `
            <div class="card" style="padding:0;overflow:hidden;border-radius:12px;">
                <!-- 顶部说明条与操作栏 -->
                <div style="padding:18px 24px;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
                    <div>
                        <h3 style="font-size:16px;font-weight:700;color:#0f172a;margin:0;">
                            导航菜单
                        </h3>
                        <div style="font-size:12px;color:#64748b;margin-top:3px;">
                            配置前台导航菜单及跳转链接
                        </div>
                    </div>
                    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
                        <button type="button" class="btn btn-outline" id="btn-reset-default-menus" style="height:36px;padding:0 14px;font-size:13px;">
                            恢复默认
                        </button>
                        <button type="button" class="btn btn-outline" id="btn-add-main-menu" style="height:36px;padding:0 14px;font-size:13px;color:#1e58ff;border-color:#93c5fd;">
                            ＋ 添加一级菜单
                        </button>
                        <button type="button" class="btn btn-primary" id="btn-save-all-menus" style="height:36px;padding:0 20px;font-size:13px;font-weight:700;background:#1e58ff;">
                            保存菜单
                        </button>
                    </div>
                </div>

                <!-- 核心工作区 -->
                <div style="padding:22px 24px;">
                    <!-- 菜单树容器 -->
                    <div id="menu-tree-container" style="display:flex;flex-direction:column;gap:12px;">
                        <div style="text-align:center;padding:50px;color:#94a3b8;">正在加载前台导航菜单数据...</div>
                    </div>
                </div>
            </div>

            <!-- 模态框：添加 / 编辑菜单项 -->
            <div id="modal-menu-edit" class="modal-overlay" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:1100;align-items:center;justify-content:center;">
                <div class="modal-card" style="background:#fff;border-radius:12px;max-width:540px;width:92%;max-height:85vh;overflow-y:auto;padding:24px;box-shadow:0 12px 30px rgba(0,0,0,0.15);">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;border-bottom:1px solid #f1f5f9;padding-bottom:12px;">
                        <h4 style="margin:0;font-size:16px;font-weight:700;" id="menu-modal-title">添加导航菜单项</h4>
                        <span style="cursor:pointer;font-size:18px;color:#94a3b8;" onclick="document.getElementById('modal-menu-edit').style.display='none'">✕</span>
                    </div>

                    <form id="form-menu-edit">
                        <div style="margin-bottom:14px;">
                            <label style="display:block;font-size:12px;color:#475569;margin-bottom:4px;font-weight:600;">菜单显示名称 <span style="color:#ef4444;">*</span></label>
                            <input type="text" id="m-inp-title" class="form-control" placeholder="如: 智能手机、数码科技、关于我们" required>
                        </div>

                        <div style="margin-bottom:14px;">
                            <label style="display:block;font-size:12px;color:#475569;margin-bottom:4px;font-weight:600;">上级所属层级</label>
                            <select id="m-inp-parent" class="form-control">
                                <option value="0">作为一级主菜单 (顶层平铺导航)</option>
                            </select>
                            <div style="font-size:11px;color:#94a3b8;margin-top:3px;">若选择某一级主菜单，则该项将作为其二级下拉子菜单展示。</div>
                        </div>

                        <div style="margin-bottom:14px;">
                            <label style="display:block;font-size:12px;color:#475569;margin-bottom:4px;font-weight:600;">菜单跳转类型</label>
                            <div style="display:flex;gap:18px;margin-top:6px;">
                                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;">
                                    <input type="radio" name="m-inp-type" value="category" checked>
                                    <span>回收品类</span>
                                </label>
                                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;">
                                    <input type="radio" name="m-inp-type" value="link">
                                    <span>自定义链接</span>
                                </label>
                            </div>
                        </div>

                        <!-- 品类选择区 -->
                        <div id="m-wrap-category" style="margin-bottom:14px;">
                            <label style="display:block;font-size:12px;color:#475569;margin-bottom:4px;font-weight:600;">关联品类</label>
                            <select id="m-inp-category" class="form-control">
                                <option value="0">全部分类</option>
                            </select>
                        </div>

                        <!-- 链接输入区 -->
                        <div id="m-wrap-link" style="margin-bottom:14px;display:none;">
                            <label style="display:block;font-size:12px;color:#475569;margin-bottom:4px;font-weight:600;">跳转链接地址 <span style="color:#ef4444;">*</span></label>
                            <input type="text" id="m-inp-url" class="form-control" placeholder="如: /orders.html 或 https://...">
                        </div>

                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
                            <div>
                                <label style="display:block;font-size:12px;color:#475569;margin-bottom:4px;font-weight:600;">打开方式</label>
                                <select id="m-inp-target" class="form-control">
                                    <option value="_self">当前窗口</option>
                                    <option value="_blank">新窗口</option>
                                </select>
                            </div>
                            <div>
                                <label style="display:block;font-size:12px;color:#475569;margin-bottom:4px;font-weight:600;">显示状态</label>
                                <select id="m-inp-status" class="form-control">
                                    <option value="1">正常显示</option>
                                    <option value="0">暂不显示</option>
                                </select>
                            </div>
                        </div>

                        <div style="margin-bottom:18px;">
                            <label style="display:block;font-size:12px;color:#475569;margin-bottom:4px;font-weight:600;">角标文字（选填）</label>
                            <input type="text" id="m-inp-badge" class="form-control" placeholder="如: HOT, NEW">
                        </div>

                        <div style="display:flex;justify-content:flex-end;gap:10px;padding-top:14px;border-top:1px solid #f1f5f9;">
                            <button type="button" class="btn btn-outline" onclick="document.getElementById('modal-menu-edit').style.display='none'">取消</button>
                            <button type="submit" class="btn btn-primary" style="height:36px;padding:0 22px;">确定</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        // 绑定事件
        document.getElementById('btn-add-main-menu')?.addEventListener('click', () => {
            openMenuModal(null, 0);
        });

        document.getElementById('btn-reset-default-menus')?.addEventListener('click', async () => {
            const confirmed = await SysUI.confirm('确认重置前台导航菜单为品类库默认结构吗？当前自定义改动将被重置。', {
                title: '重置菜单确认',
                type: 'warning',
                confirmText: '确认重置'
            });
            if (!confirmed) return;

            const res = await api.post('/admin/menu/reset', {});
            if (res && res.code === 200) {
                SysUI.toast('已成功重置为默认品类导航结构！', 'success');
                loadMenuList();
            } else {
                SysUI.toast(res ? res.msg : '重置失败', 'error');
            }
        });

        document.getElementById('btn-save-all-menus')?.addEventListener('click', async function () {
            const btn = this;
            btn.disabled = true;
            btn.innerText = '正在保存发布...';

            const res = await api.post('/admin/menu/save', { menus: menuTree });
            btn.disabled = false;
            btn.innerText = '💾 保存并发布前台菜单';

            if (res && res.code === 200) {
                SysUI.toast('前台自定义多级导航菜单已成功保存并实时发布！', 'success');
                loadMenuList();
            } else {
                SysUI.toast(res ? res.msg : '保存失败', 'error');
            }
        });

        // 联动类型单选切换
        const radioTypes = document.querySelectorAll('input[name="m-inp-type"]');
        radioTypes.forEach(r => {
            r.addEventListener('change', function () {
                const isCat = this.value === 'category';
                const wrapCat = document.getElementById('m-wrap-category');
                const wrapLink = document.getElementById('m-wrap-link');
                if (wrapCat) wrapCat.style.display = isCat ? 'block' : 'none';
                if (wrapLink) wrapLink.style.display = isCat ? 'none' : 'block';
            });
        });

        // 提交菜单表单
        document.getElementById('form-menu-edit')?.addEventListener('submit', function (e) {
            e.preventDefault();
            const title = document.getElementById('m-inp-title')?.value.trim();
            const parentId = parseInt(document.getElementById('m-inp-parent')?.value || 0);
            const type = document.querySelector('input[name="m-inp-type"]:checked')?.value || 'category';
            const categoryId = parseInt(document.getElementById('m-inp-category')?.value || 0);
            const url = document.getElementById('m-inp-url')?.value.trim();
            const target = document.getElementById('m-inp-target')?.value || '_self';
            const badge = document.getElementById('m-inp-badge')?.value.trim();
            const status = parseInt(document.getElementById('m-inp-status')?.value || 1);

            if (!title) {
                SysUI.toast('请填写菜单显示名称', 'warning');
                return;
            }
            if (type === 'link' && !url) {
                SysUI.toast('请填写跳转链接网址', 'warning');
                return;
            }

            if (editingItem) {
                // 编辑既有项
                editingItem.title = title;
                editingItem.type = type;
                editingItem.target_id = type === 'category' ? categoryId : 0;
                editingItem.url = type === 'link' ? url : '';
                editingItem.target = target;
                editingItem.icon = '';
                editingItem.badge = badge;
                editingItem.status = status;

                // 判断是否变更了 parent 层级
                if (editingParentId !== parentId) {
                    removeMenuItemById(editingItem.id);
                    if (parentId === 0) {
                        editingItem.children = editingItem.children || [];
                        menuTree.push(editingItem);
                    } else {
                        const parent = findMenuItemById(parentId);
                        if (parent) {
                            parent.children = parent.children || [];
                            delete editingItem.children;
                            parent.children.push(editingItem);
                        } else {
                            menuTree.push(editingItem);
                        }
                    }
                }
                SysUI.toast('菜单项已更新', 'success');
            } else {
                // 新增项
                const newItem = {
                    id: Date.now(),
                    title,
                    type,
                    target_id: type === 'category' ? categoryId : 0,
                    url: type === 'link' ? url : '',
                    target,
                    icon: '',
                    badge,
                    sort: 99,
                    status,
                    children: []
                };

                if (parentId === 0) {
                    menuTree.push(newItem);
                } else {
                    const parent = findMenuItemById(parentId);
                    if (parent) {
                        parent.children = parent.children || [];
                        delete newItem.children;
                        parent.children.push(newItem);
                    } else {
                        menuTree.push(newItem);
                    }
                }
                SysUI.toast('新菜单项已成功添加', 'success');
            }

            document.getElementById('modal-menu-edit').style.display = 'none';
            renderMenuTree();
        });

        loadMenuList();
    }

    // 从服务端加载菜单数据
    async function loadMenuList() {
        const box = document.getElementById('menu-tree-container');
        if (box) {
            box.innerHTML = '<div style="text-align:center;padding:50px;color:#94a3b8;"><div style="font-size:24px;margin-bottom:8px;">⏳</div>正在加载导航菜单数据...</div>';
        }

        const res = await api.get('/admin/menu/list');
        if (!box) return;

        if (res && res.code === 200 && res.data) {
            menuTree = res.data.menus || [];
            categoryOptions = res.data.categories || [];
            renderMenuTree();
        } else {
            const errMsg = res ? res.msg : '网络开小差了，请检查服务端连接';
            box.innerHTML = `
                <div style="text-align:center;padding:48px 20px;background:#fef2f2;border:1px dashed #fca5a5;border-radius:10px;">
                    <div style="font-size:32px;margin-bottom:8px;">⚠️</div>
                    <div style="font-size:14px;font-weight:700;color:#b91c1c;margin-bottom:6px;">未能成功获取导航菜单数据</div>
                    <div style="font-size:12px;color:#7f1d1d;margin-bottom:16px;">${escapeHtml(errMsg)}</div>
                    <div style="display:flex;gap:10px;justify-content:center;">
                        <button type="button" class="btn btn-outline" id="btn-retry-load-menu" style="height:34px;font-size:12.5px;">
                            🔄 重新加载
                        </button>
                        <button type="button" class="btn btn-primary" id="btn-err-reset-default" style="height:34px;font-size:12.5px;background:#1e58ff;">
                            🌱 一键初始化品类默认菜单
                        </button>
                    </div>
                </div>
            `;
            document.getElementById('btn-retry-load-menu')?.addEventListener('click', loadMenuList);
            document.getElementById('btn-err-reset-default')?.addEventListener('click', resetDefaultMenus);
        }
    }

    // 渲染可视化树形菜单列表
    function renderMenuTree() {
        const box = document.getElementById('menu-tree-container');
        if (!box) return;

        if (!menuTree || menuTree.length === 0) {
            box.innerHTML = `
                <div style="text-align:center;padding:50px 20px;background:#f8fafc;border:2px dashed #cbd5e1;border-radius:10px;">
                    <div style="font-size:36px;margin-bottom:10px;">📋</div>
                    <div style="font-size:15px;font-weight:700;color:#334155;">暂无导航菜单</div>
                    <div style="font-size:12px;color:#64748b;margin-top:6px;margin-bottom:18px;">可点击下方按钮生成默认菜单或添加新菜单</div>
                    <div style="display:flex;gap:12px;justify-content:center;">
                        <button type="button" class="btn btn-primary" id="btn-empty-reset-default" style="height:36px;font-size:13px;background:#1e58ff;">
                            生成默认菜单
                        </button>
                        <button type="button" class="btn btn-outline" id="btn-empty-add-menu" style="height:36px;font-size:13px;">
                            ＋ 添加一级菜单
                        </button>
                    </div>
                </div>
            `;
            document.getElementById('btn-empty-reset-default')?.addEventListener('click', resetDefaultMenus);
            document.getElementById('btn-empty-add-menu')?.addEventListener('click', () => openEditModal(null, 0));
            return;
        }

        let html = '';
        menuTree.forEach((main, mIdx) => {
            const hasSub = main.children && main.children.length > 0;
            const statusTag = Number(main.status) === 1
                ? '<span class="badge badge-success" style="font-size:11px;">显示中</span>'
                : '<span class="badge" style="background:#cbd5e1;color:#475569;font-size:11px;">已隐藏</span>';

            const typeTag = main.type === 'category'
                ? `<span class="badge badge-info" style="font-size:11px;">品类: ${getCategoryName(main.target_id)}</span>`
                : `<span class="badge" style="background:#fef3c7;color:#92400e;font-size:11px;">外链: ${escapeHtml(main.url || '-')}</span>`;

            const badgeTag = main.badge
                ? `<span class="badge badge-danger" style="font-size:10px;font-weight:800;">${escapeHtml(main.badge)}</span>`
                : '';

            const targetTag = main.target === '_blank'
                ? '<span style="font-size:11px;color:#64748b;">[新窗口 ↗]</span>'
                : '';

            // 二级子菜单列表
            let subHtml = '';
            if (hasSub) {
                main.children.forEach((sub, sIdx) => {
                    const subStatusTag = Number(sub.status) === 1
                        ? '<span class="badge badge-success" style="font-size:10px;">显示</span>'
                        : '<span class="badge" style="font-size:10px;background:#cbd5e1;color:#475569;">隐藏</span>';

                    const subTypeTag = sub.type === 'category'
                        ? `<span class="badge badge-info" style="font-size:10px;">品类: ${getCategoryName(sub.target_id)}</span>`
                        : `<span class="badge" style="font-size:10px;background:#fef3c7;color:#92400e;">链接: ${escapeHtml(sub.url || '-')}</span>`;

                    const subBadgeTag = sub.badge
                        ? `<span class="badge badge-danger" style="font-size:9px;font-weight:800;">${escapeHtml(sub.badge)}</span>`
                        : '';

                    subHtml += `
                        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;margin-top:8px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 1px 2px rgba(0,0,0,0.02);">
                            <div style="display:flex;align-items:center;gap:10px;">
                                <span style="color:#94a3b8;font-size:14px;">↳</span>
                                <strong style="font-size:13.5px;color:#0f172a;">${escapeHtml(sub.title)}</strong>
                                ${subBadgeTag}
                                ${subTypeTag}
                                ${subStatusTag}
                                ${sub.target === '_blank' ? '<span style="font-size:10px;color:#94a3b8;">[新窗口]</span>' : ''}
                            </div>
                            <div style="display:flex;align-items:center;gap:6px;">
                                <button type="button" class="btn btn-outline" style="height:24px;padding:0 6px;font-size:11px;" onclick="window.moveSubMenuItem(${mIdx}, ${sIdx}, -1)" ${sIdx === 0 ? 'disabled' : ''}>▲ 上移</button>
                                <button type="button" class="btn btn-outline" style="height:24px;padding:0 6px;font-size:11px;" onclick="window.moveSubMenuItem(${mIdx}, ${sIdx}, 1)" ${sIdx === main.children.length - 1 ? 'disabled' : ''}>▼ 下移</button>
                                <button type="button" class="btn btn-secondary" style="height:24px;padding:0 8px;font-size:11px;" onclick="window.editMenuItemById(${sub.id}, ${main.id})">编辑</button>
                                <button type="button" class="btn btn-danger" style="height:24px;padding:0 8px;font-size:11px;background:#ef4444;color:#fff;" onclick="window.deleteMenuItem(${sub.id})">删除</button>
                            </div>
                        </div>
                    `;
                });
            }

            html += `
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 18px;">
                    <!-- 主菜单条 -->
                    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                        <div style="display:flex;align-items:center;gap:10px;">
                            <strong style="font-size:15px;color:#0f172a;">${escapeHtml(main.title)}</strong>
                            ${badgeTag}
                            ${typeTag}
                            ${targetTag}
                            ${statusTag}
                            ${hasSub ? `<span class="badge" style="background:#e0f2fe;color:#0369a1;font-size:11px;">含 ${main.children.length} 个子菜单 ▾</span>` : ''}
                        </div>
                        <div style="display:flex;align-items:center;gap:6px;">
                            <button type="button" class="btn btn-outline" style="height:28px;padding:0 10px;font-size:12px;color:#10b981;border-color:#a7f3d0;" onclick="window.addSubMenuToParent(${main.id})">＋ 添加子菜单</button>
                            <button type="button" class="btn btn-outline" style="height:28px;padding:0 8px;font-size:12px;" onclick="window.moveMainMenu(${mIdx}, -1)" ${mIdx === 0 ? 'disabled' : ''}>▲ 上移</button>
                            <button type="button" class="btn btn-outline" style="height:28px;padding:0 8px;font-size:12px;" onclick="window.moveMainMenu(${mIdx}, 1)" ${mIdx === menuTree.length - 1 ? 'disabled' : ''}>▼ 下移</button>
                            <button type="button" class="btn btn-secondary" style="height:28px;padding:0 10px;font-size:12px;" onclick="window.editMenuItemById(${main.id}, 0)">编辑</button>
                            <button type="button" class="btn btn-danger" style="height:28px;padding:0 10px;font-size:12px;background:#ef4444;color:#fff;" onclick="window.deleteMenuItem(${main.id})">删除</button>
                        </div>
                    </div>

                    <!-- 子菜单容器 -->
                    ${hasSub ? `<div style="margin-left:24px;padding-left:14px;border-left:2px dashed #cbd5e1;margin-top:10px;">${subHtml}</div>` : ''}
                </div>
            `;
        });

        box.innerHTML = html;
    }

    // 根据品类 ID 获取友好名称
    function getCategoryName(catId) {
        if (!catId || Number(catId) === 0) return '全部品类';
        const found = categoryOptions.find(c => Number(c.id) === Number(catId));
        return found ? found.name : `品类#${catId}`;
    }

    // 打开菜单新增/编辑模态框
    function openMenuModal(item, parentId = 0) {
        editingItem = item;
        editingParentId = parentId;

        const modal = document.getElementById('modal-menu-edit');
        const titleEl = document.getElementById('menu-modal-title');
        const parentSelect = document.getElementById('m-inp-parent');
        const catSelect = document.getElementById('m-inp-category');
        if (!modal) return;

        // 填充父级选择下拉框
        let parentOpts = '<option value="0">作为一级主菜单 (顶层平铺导航)</option>';
        menuTree.forEach(m => {
            if (item && m.id === item.id) return; // 避免自引用
            parentOpts += `<option value="${m.id}" ${parentId === m.id ? 'selected' : ''}>↳ 挂在【${escapeHtml(m.title)}】之下作为子菜单</option>`;
        });
        if (parentSelect) parentSelect.innerHTML = parentOpts;

        // 填充品类选择下拉框
        let catOpts = '<option value="0">全部分类 (查看所有商品)</option>';
        categoryOptions.forEach(c => {
            catOpts += `<option value="${c.id}">${escapeHtml(c.name)}</option>`;
        });
        if (catSelect) catSelect.innerHTML = catOpts;

        if (item) {
            if (titleEl) titleEl.innerText = `编辑菜单项【${item.title}】`;
            document.getElementById('m-inp-title').value = item.title || '';
            document.getElementById('m-inp-url').value = item.url || '';
            document.getElementById('m-inp-target').value = item.target || '_self';
            document.getElementById('m-inp-badge').value = item.badge || '';
            document.getElementById('m-inp-status').value = (item.status !== undefined) ? item.status : 1;

            if (parentSelect) parentSelect.value = parentId;

            const isCat = item.type === 'category';
            const rCat = document.querySelector('input[name="m-inp-type"][value="category"]');
            const rLink = document.querySelector('input[name="m-inp-type"][value="link"]');
            if (isCat && rCat) rCat.checked = true;
            if (!isCat && rLink) rLink.checked = true;

            const wrapCat = document.getElementById('m-wrap-category');
            const wrapLink = document.getElementById('m-wrap-link');
            if (wrapCat) wrapCat.style.display = isCat ? 'block' : 'none';
            if (wrapLink) wrapLink.style.display = isCat ? 'none' : 'block';

            if (catSelect) catSelect.value = item.target_id || 0;
        } else {
            if (titleEl) titleEl.innerText = parentId === 0 ? '添加一级主菜单项' : '添加二级下拉子菜单项';
            document.getElementById('form-menu-edit')?.reset();
            if (parentSelect) parentSelect.value = parentId;

            const wrapCat = document.getElementById('m-wrap-category');
            const wrapLink = document.getElementById('m-wrap-link');
            if (wrapCat) wrapCat.style.display = 'block';
            if (wrapLink) wrapLink.style.display = 'none';
        }

        modal.style.display = 'flex';
    }

    // 全局方法挂载
    window.addSubMenuToParent = function (parentId) {
        openMenuModal(null, parentId);
    };

    window.editMenuItemById = function (id, parentId) {
        const item = findMenuItemById(id);
        if (item) {
            openMenuModal(item, parentId);
        }
    };

    window.deleteMenuItem = async function (id) {
        const confirmed = await SysUI.confirm('确认删除该菜单项吗？若该项包含子菜单也将一并移除。', {
            title: '删除菜单确认',
            type: 'warning',
            confirmText: '确认删除'
        });
        if (!confirmed) return;

        removeMenuItemById(id);
        SysUI.toast('菜单项已移除，别忘了点击右上角保存发布！', 'info');
        renderMenuTree();
    };

    window.moveMainMenu = function (idx, direction) {
        const target = idx + direction;
        if (target < 0 || target >= menuTree.length) return;
        const temp = menuTree[idx];
        menuTree[idx] = menuTree[target];
        menuTree[target] = temp;
        renderMenuTree();
    };

    window.moveSubMenuItem = function (mainIdx, subIdx, direction) {
        const list = menuTree[mainIdx]?.children;
        if (!list) return;
        const target = subIdx + direction;
        if (target < 0 || target >= list.length) return;
        const temp = list[subIdx];
        list[subIdx] = list[target];
        list[target] = temp;
        renderMenuTree();
    };

    // 辅助树查找与删除
    function findMenuItemById(id) {
        for (const m of menuTree) {
            if (m.id === id) return m;
            if (m.children && m.children.length > 0) {
                for (const sub of m.children) {
                    if (sub.id === id) return sub;
                }
            }
        }
        return null;
    }

    function removeMenuItemById(id) {
        menuTree = menuTree.filter(m => {
            if (m.id === id) return false;
            if (m.children && m.children.length > 0) {
                m.children = m.children.filter(sub => sub.id !== id);
            }
            return true;
        });
    }

    window.renderMenuView = renderMenuView;
})(window);
