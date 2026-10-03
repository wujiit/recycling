/**
 * 启灵回收系统 - 前台品类商品与在线估价模块
 * 包含品类导航、品牌联动、商品列表瀑布流、在线估价器、质检评估问答打分与搜索交互
 */
(function(window) {
    'use strict';

    const HomeApp = window.HomeApp || {};
    const state = HomeApp.state || {};
    const api = HomeApp.api || {};
    const SysUI = HomeApp.SysUI || window.SysUI;
    const escapeHtml = HomeApp.escapeHtml || window.escapeHtml || function(s) { return s; };
    const updateAppraisalCouponBadge = window.updateAppraisalCouponBadge || function() {};
    const renderFulfillmentCards = window.renderFulfillmentCards || function() {};
    const renderPayoutCards = window.renderPayoutCards || function() {};
    const renderOrderCoupons = window.renderOrderCoupons || function() {};

            // 2. 加载分类列表与前台自定义多级导航菜单
            async function loadCategories() {
                // 1. 同步加载商品底层品类库 (估价与品牌联动所需)
                const catRes = await api.request('/api/appraisal/getCategories');
                if (catRes && catRes.code === 200) {
                    state.categories = catRes.data || [];
                }

                // 2. 加载网站前台自定义多级导航菜单配置 (优先从平台全局信息读取，否则单独接口拉取)
                let menus = [];
                if (state.platformMeta && Array.isArray(state.platformMeta.nav_menus) && state.platformMeta.nav_menus.length > 0) {
                    menus = state.platformMeta.nav_menus;
                } else {
                    const menuRes = await api.request('/api/appraisal/getNavMenus');
                    if (menuRes && menuRes.code === 200 && Array.isArray(menuRes.data)) {
                        menus = menuRes.data;
                    }
                }

                // 3. 兜底保护：若尚未配置菜单且品类库存在，动态构建默认菜单树
                if (!menus || menus.length === 0) {
                    menus = [
                        { id: 'cat-0', title: '全部行业品类', type: 'category', target_id: 0, url: '', target: '_self', icon: '🏷️', badge: '', status: 1, children: [] }
                    ];
                    (state.categories || []).forEach(c => {
                        menus.push({
                            id: 'cat-' + c.id,
                            title: c.name,
                            type: 'category',
                            target_id: c.id,
                            url: '',
                            target: '_self',
                            icon: c.icon || '📦',
                            badge: '',
                            status: 1,
                            children: []
                        });
                    });
                }

                renderNavMenus(menus);
            }

            // 渲染前台多级导航菜单 (自适应智能收纳与防挤压机制)
            let cachedActiveMenus = [];
            let cachedOverflowMenus = [];

            function renderNavMenus(menus) {
                const box = document.getElementById('nav-categories-box');
                if (!box) return;

                const activeMenus = (menus || []).filter(item => item && item.status !== 0);
                const MAX_VISIBLE = 5;
                let visibleMenus = activeMenus;
                let overflowMenus = [];

                // 一级菜单数量超出 5 个时，智能折叠第 5 项及后续项为「更多分类 ▾」
                if (activeMenus.length > MAX_VISIBLE) {
                    visibleMenus = activeMenus.slice(0, 4);
                    overflowMenus = activeMenus.slice(4);
                }
                cachedActiveMenus = activeMenus;
                cachedOverflowMenus = overflowMenus;

                let html = '';

                // 1. 渲染常规显示的一级菜单项
                visibleMenus.forEach(item => {
                    const children = (item.children || []).filter(ch => ch.status !== 0);
                    const hasChildren = children.length > 0;
                    const isCat = item.type === 'category';
                    const targetId = isCat ? (parseInt(item.target_id) || 0) : null;
                    const isActive = isCat && state.currentCat === targetId;
                    const href = (item.type === 'link' && item.url) ? escapeHtml(item.url) : 'javascript:void(0)';
                    const targetAttr = (item.type === 'link' && item.target === '_blank') ? 'target="_blank" rel="noopener noreferrer"' : '';

                    html += `<div class="nav-menu-item-wrap ${hasChildren ? 'has-dropdown' : ''}" data-menu-id="${escapeHtml(String(item.id))}">`;
                    html += `
                        <a href="${href}" class="nav-cat-item ${isActive ? 'active' : ''}" 
                           data-type="${escapeHtml(item.type || 'category')}" 
                           data-cat="${targetId !== null ? targetId : ''}" 
                           ${targetAttr}>
                            <span class="nav-cat-text">${escapeHtml(item.title || '')}</span>
                            ${item.badge ? `<span class="nav-menu-badge">${escapeHtml(item.badge)}</span>` : ''}
                            ${hasChildren ? `
                                <svg class="nav-dropdown-arrow" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="6 9 12 15 18 9"/>
                                </svg>
                            ` : ''}
                        </a>
                    `;

                    // 渲染二级下拉子菜单
                    if (hasChildren) {
                        html += '<div class="nav-dropdown-menu">';
                        children.forEach(sub => {
                            const isSubCat = sub.type === 'category';
                            const subTargetId = isSubCat ? (parseInt(sub.target_id) || 0) : null;
                            const isSubActive = isSubCat && state.currentCat === subTargetId;
                            const subHref = (sub.type === 'link' && sub.url) ? escapeHtml(sub.url) : 'javascript:void(0)';
                            const subTargetAttr = (sub.type === 'link' && sub.target === '_blank') ? 'target="_blank" rel="noopener noreferrer"' : '';

                            html += `
                                <a href="${subHref}" class="nav-dropdown-item ${isSubActive ? 'active' : ''}" 
                                   data-type="${escapeHtml(sub.type || 'category')}" 
                                   data-cat="${subTargetId !== null ? subTargetId : ''}" 
                                   ${subTargetAttr}>
                                    <span class="nav-dropdown-item-left">
                                        <span>${escapeHtml(sub.title || '')}</span>
                                    </span>
                                    ${sub.badge ? `<span class="nav-menu-badge" style="transform:scale(0.85);">${escapeHtml(sub.badge)}</span>` : ''}
                                </a>
                            `;
                        });
                        html += '</div>';
                    }

                    html += '</div>';
                });

                // 2. 超出项智能聚合为「更多分类 ▾」动态下拉浮层
                if (overflowMenus.length > 0) {
                    // 判断当前选中的品类是否属于折叠项或其子项
                    let isMoreActive = false;
                    overflowMenus.forEach(m => {
                        if (m.type === 'category' && parseInt(m.target_id) === state.currentCat) {
                            isMoreActive = true;
                        }
                        (m.children || []).forEach(sub => {
                            if (sub.type === 'category' && parseInt(sub.target_id) === state.currentCat) {
                                isMoreActive = true;
                            }
                        });
                    });

                    html += `
                        <div class="nav-menu-item-wrap has-dropdown nav-more-wrap" data-menu-id="__more__">
                            <a href="javascript:void(0)" class="nav-cat-item nav-more-btn ${isMoreActive ? 'active' : ''}" data-type="more">
                                <span class="nav-cat-text">更多分类</span>
                                <span class="nav-menu-badge" style="background:#64748b; font-size:9px; padding:1px 5px; opacity:0.85;">${overflowMenus.length}</span>
                                <svg class="nav-dropdown-arrow" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="6 9 12 15 18 9"/>
                                </svg>
                            </a>
                            <div class="nav-dropdown-menu">
                    `;

                    overflowMenus.forEach(m => {
                        const isCat = m.type === 'category';
                        const targetId = isCat ? (parseInt(m.target_id) || 0) : null;
                        const isActive = isCat && state.currentCat === targetId;
                        const href = (m.type === 'link' && m.url) ? escapeHtml(m.url) : 'javascript:void(0)';
                        const targetAttr = (m.type === 'link' && m.target === '_blank') ? 'target="_blank" rel="noopener noreferrer"' : '';
                        const children = (m.children || []).filter(ch => ch.status !== 0);

                        html += `
                            <a href="${href}" class="nav-dropdown-item ${isActive ? 'active' : ''}" 
                               data-type="${escapeHtml(m.type || 'category')}" 
                               data-cat="${targetId !== null ? targetId : ''}" 
                               ${targetAttr}>
                                <span class="nav-dropdown-item-left">
                                    <span style="${children.length > 0 ? 'font-weight:600;' : ''}">${escapeHtml(m.title || '')}</span>
                                </span>
                                ${m.badge ? `<span class="nav-menu-badge" style="transform:scale(0.85);">${escapeHtml(m.badge)}</span>` : ''}
                            </a>
                        `;

                        // 超出项中若有二级子项，以内缩引导线优雅排布
                        children.forEach(sub => {
                            const isSubCat = sub.type === 'category';
                            const subTargetId = isSubCat ? (parseInt(sub.target_id) || 0) : null;
                            const isSubActive = isSubCat && state.currentCat === subTargetId;
                            const subHref = (sub.type === 'link' && sub.url) ? escapeHtml(sub.url) : 'javascript:void(0)';
                            const subTargetAttr = (sub.type === 'link' && sub.target === '_blank') ? 'target="_blank" rel="noopener noreferrer"' : '';

                            html += `
                                <a href="${subHref}" class="nav-dropdown-item nav-dropdown-sub-item ${isSubActive ? 'active' : ''}" 
                                   data-type="${escapeHtml(sub.type || 'category')}" 
                                   data-cat="${subTargetId !== null ? subTargetId : ''}" 
                                   ${subTargetAttr}
                                   style="padding-left: 20px; font-size: 12.5px; opacity: 0.9;">
                                    <span class="nav-dropdown-item-left">
                                        <span style="color: #94a3b8; font-size: 11px; margin-right: 4px;">↳</span>
                                        <span>${escapeHtml(sub.title || '')}</span>
                                    </span>
                                    ${sub.badge ? `<span class="nav-menu-badge" style="transform:scale(0.8);">${escapeHtml(sub.badge)}</span>` : ''}
                                </a>
                            `;
                        });
                    });

                    html += `
                            </div>
                        </div>
                    `;
                }

                box.innerHTML = html;
                bindNavMenuEvents(box);
            }

            // 移动端专用：打开品类子菜单 / 折叠更多分类快捷半屏抽屉
            window.openNavSubmenuModal = function(item, isMore = false) {
                const modal = document.getElementById('modal-nav-submenu');
                const titleEl = document.getElementById('nav-submenu-drawer-title');
                const descEl = document.getElementById('nav-submenu-drawer-desc');
                const iconEl = document.getElementById('nav-submenu-drawer-icon');
                const bodyEl = document.getElementById('nav-submenu-drawer-body');
                if (!modal || !bodyEl) return;

                if (isMore) {
                    if (iconEl) iconEl.innerText = '📁';
                    if (titleEl) titleEl.innerText = '全部分类与更多服务';
                    if (descEl) descEl.innerText = '覆盖全品类回收大项，点击即可一键切换';

                    const overflowItems = Array.isArray(item) ? item : cachedOverflowMenus;
                    let moreHtml = '';

                    overflowItems.forEach(m => {
                        const mChildren = (m.children || []).filter(c => c && c.status !== 0);
                        const isCat = m.type === 'category';
                        const targetId = isCat ? (parseInt(m.target_id) || 0) : null;
                        const isCurrentActive = isCat && state.currentCat === targetId;

                        moreHtml += `
                            <div class="nav-drawer-more-group">
                                <div class="nav-drawer-more-title" data-type="${escapeHtml(m.type || 'category')}" data-cat="${targetId !== null ? targetId : ''}" data-url="${escapeHtml(m.url || '')}" data-target="${escapeHtml(m.target || '_self')}">
                                    <span style="display:flex;align-items:center;gap:6px;">
                                        <span style="${isCurrentActive ? 'color:var(--primary);font-weight:700;' : ''}">${escapeHtml(m.title || '')}</span>
                                        ${m.badge ? `<span class="chip-badge" style="position:static;display:inline-block;margin-left:4px;">${escapeHtml(m.badge)}</span>` : ''}
                                    </span>
                                    <span style="font-size:12px;color:var(--primary);font-weight:500;">查看全部 →</span>
                                </div>
                        `;

                        if (mChildren.length > 0) {
                            moreHtml += '<div class="nav-drawer-grid">';
                            mChildren.forEach(sub => {
                                const isSubCat = sub.type === 'category';
                                const subTargetId = isSubCat ? (parseInt(sub.target_id) || 0) : null;
                                const isSubActive = isSubCat && state.currentCat === subTargetId;
                                moreHtml += `
                                    <div class="nav-drawer-chip ${isSubActive ? 'active' : ''}" 
                                         data-type="${escapeHtml(sub.type || 'category')}" 
                                         data-cat="${subTargetId !== null ? subTargetId : ''}"
                                         data-sub-title="${escapeHtml(sub.title || '')}"
                                         data-url="${escapeHtml(sub.url || '')}" 
                                         data-target="${escapeHtml(sub.target || '_self')}">
                                        <span>${escapeHtml(sub.title || '')}</span>
                                        ${sub.badge ? `<span class="chip-badge">${escapeHtml(sub.badge)}</span>` : ''}
                                    </div>
                                `;
                            });
                            moreHtml += '</div>';
                        }
                        moreHtml += '</div>';
                    });

                    bodyEl.innerHTML = moreHtml;
                } else {
                    const children = (item.children || []).filter(c => c && c.status !== 0);
                    const isCat = item.type === 'category';
                    const targetId = isCat ? (parseInt(item.target_id) || 0) : null;

                    if (iconEl) iconEl.innerText = item.icon || '📱';
                    if (titleEl) titleEl.innerText = item.title || '品类导航';
                    if (descEl) descEl.innerText = '点击查看全部商品或挑选品牌规格';

                    let singleHtml = '';

                    // 1. 顶部全量品类直达大按钮
                    if (isCat) {
                        singleHtml += `
                            <div class="nav-drawer-primary-btn" data-type="category" data-cat="${targetId}">
                                <span style="display:flex;align-items:center;gap:6px;">
                                    <span>查看全部 ${escapeHtml(item.title || '')}</span>
                                    ${item.badge ? `<span class="chip-badge" style="position:static;display:inline-block;">${escapeHtml(item.badge)}</span>` : ''}
                                </span>
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                            </div>
                        `;
                    }

                    // 2. 二级子分类 / 品牌规格卡片网格
                    if (children.length > 0) {
                        singleHtml += `
                            <div style="margin-top:16px;">
                                <div class="nav-drawer-section-label">
                                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h7"/></svg>
                                    精选品牌 / 子分类
                                </div>
                                <div class="nav-drawer-grid">
                        `;

                        children.forEach(sub => {
                            const isSubCat = sub.type === 'category';
                            const subTargetId = isSubCat ? (parseInt(sub.target_id) || 0) : null;
                            const isSubActive = isSubCat && state.currentCat === subTargetId;
                            singleHtml += `
                                <div class="nav-drawer-chip ${isSubActive ? 'active' : ''}" 
                                     data-type="${escapeHtml(sub.type || 'category')}" 
                                     data-cat="${subTargetId !== null ? subTargetId : ''}"
                                     data-sub-title="${escapeHtml(sub.title || '')}"
                                     data-url="${escapeHtml(sub.url || '')}" 
                                     data-target="${escapeHtml(sub.target || '_self')}">
                                    <span>${escapeHtml(sub.title || '')}</span>
                                    ${sub.badge ? `<span class="chip-badge">${escapeHtml(sub.badge)}</span>` : ''}
                                </div>
                            `;
                        });

                        singleHtml += `
                                </div>
                            </div>
                        `;
                    }

                    bodyEl.innerHTML = singleHtml;
                }

                // 统一监听抽屉内部所有项的触控选择
                bodyEl.querySelectorAll('[data-type]').forEach(el => {
                    el.addEventListener('click', function(e) {
                        const type = this.getAttribute('data-type');
                        const catId = this.getAttribute('data-cat');
                        const subTitle = this.getAttribute('data-sub-title') || '';
                        const url = this.getAttribute('data-url');
                        const target = this.getAttribute('data-target') || '_self';

                        if (type === 'link' && url) {
                            if (target === '_blank') {
                                window.open(url, '_blank');
                            } else {
                                window.location.href = url;
                            }
                            window.closeNavSubmenuModal();
                            return;
                        }

                        if (type === 'category' && catId !== null && catId !== '') {
                            e.preventDefault();
                            const targetCat = parseInt(catId || 0);

                            // 同步顶部横滑导航激活态
                            const catContainer = document.getElementById('nav-categories-box');
                            if (catContainer) {
                                catContainer.querySelectorAll('.nav-cat-item').forEach(i => i.classList.remove('active'));
                                const matchedNav = catContainer.querySelector(`.nav-cat-item[data-cat="${targetCat}"]`);
                                if (matchedNav) {
                                    matchedNav.classList.add('active');
                                }
                            }

                            state.currentCat = targetCat;
                            window.closeNavSubmenuModal();

                            // 如果用户点击的是具体子项名称，且品牌列表中存在该名称，联动激活品牌筛选
                            loadBrands(subTitle).then(() => {
                                loadDevices();
                            });

                            // 平滑下滚定位到商品展示区
                            const listSection = document.getElementById('current-list-title');
                            if (listSection) {
                                setTimeout(() => {
                                    listSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }, 150);
                            }
                        }
                    });
                });

                modal.style.display = 'flex';
            };

            window.closeNavSubmenuModal = function() {
                const modal = document.getElementById('modal-nav-submenu');
                if (modal) modal.style.display = 'none';
            };

            // 绑定导航与子菜单交互逻辑 (PC 悬浮 + 移动端底部半屏抽屉自适应)
            function bindNavMenuEvents(container) {
                // 1. 含有子菜单或“更多分类”的菜单项：移动端点击唤起原生抽屉，PC 端展开悬浮层
                container.querySelectorAll('.nav-menu-item-wrap.has-dropdown').forEach(wrap => {
                    const parentBtn = wrap.querySelector('.nav-cat-item');
                    const menuId = wrap.getAttribute('data-menu-id');
                    if (!parentBtn) return;

                    parentBtn.addEventListener('click', function(e) {
                        const isMobile = window.innerWidth <= 768;
                        if (isMobile) {
                            e.preventDefault();
                            e.stopPropagation();
                            if (menuId === '__more__') {
                                window.openNavSubmenuModal(cachedOverflowMenus, true);
                            } else {
                                const matchedItem = cachedActiveMenus.find(m => String(m.id) === String(menuId));
                                if (matchedItem) {
                                    window.openNavSubmenuModal(matchedItem, false);
                                }
                            }
                            return;
                        }

                        // PC 端点击行为
                        const dataType = this.getAttribute('data-type');
                        const href = this.getAttribute('href');
                        if (dataType === 'more' || (dataType === 'link' && (!href || href === 'javascript:void(0)'))) {
                            e.preventDefault();
                            wrap.classList.toggle('open');
                        } else if (dataType === 'category') {
                            const catVal = this.getAttribute('data-cat');
                            if (catVal !== null && catVal !== '') {
                                e.preventDefault();
                                container.querySelectorAll('.nav-cat-item, .nav-dropdown-item').forEach(i => i.classList.remove('active'));
                                this.classList.add('active');
                                state.currentCat = parseInt(catVal || 0);
                                loadBrands('').then(() => {
                                    loadDevices();
                                });
                            }
                        }
                    });
                });

                // 2. 无下拉子菜单的普通一级菜单 (如“全部行业品类”)
                container.querySelectorAll('.nav-menu-item-wrap:not(.has-dropdown) .nav-cat-item[data-type="category"]').forEach(el => {
                    el.addEventListener('click', function(e) {
                        const catVal = this.getAttribute('data-cat');
                        if (catVal === null || catVal === '') return;
                        e.preventDefault();

                        container.querySelectorAll('.nav-cat-item, .nav-dropdown-item').forEach(i => i.classList.remove('active'));
                        this.classList.add('active');

                        state.currentCat = parseInt(catVal || 0);
                        loadBrands('').then(() => {
                            loadDevices();
                        });

                        if (window.scrollY > 300) {
                            const listSection = document.getElementById('current-list-title');
                            if (listSection) {
                                listSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                        }
                    });
                });

                // 3. PC 悬浮下拉菜单内部项点击监听
                container.querySelectorAll('.nav-dropdown-menu .nav-dropdown-item').forEach(el => {
                    el.addEventListener('click', function(e) {
                        const type = this.getAttribute('data-type');
                        const catVal = this.getAttribute('data-cat');
                        const subTitle = (this.querySelector('.nav-dropdown-item-left span') || this).textContent.trim();

                        if (type === 'category' && catVal !== null && catVal !== '') {
                            e.preventDefault();
                            container.querySelectorAll('.nav-cat-item, .nav-dropdown-item').forEach(i => i.classList.remove('active'));
                            this.classList.add('active');

                            const parentWrap = this.closest('.nav-menu-item-wrap');
                            if (parentWrap) {
                                const parentNav = parentWrap.querySelector('.nav-cat-item');
                                if (parentNav && parentNav !== this) {
                                    parentNav.classList.add('active');
                                }
                                parentWrap.classList.remove('open');
                            }

                            state.currentCat = parseInt(catVal || 0);
                            loadBrands(subTitle).then(() => {
                                loadDevices();
                            });

                            if (window.scrollY > 300) {
                                const listSection = document.getElementById('current-list-title');
                                if (listSection) {
                                    listSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }
                            }
                        }
                    });
                });
            }

            // 全局点击监听：点击菜单外部收起 PC 端展开的下拉浮层；点击遮罩关闭移动端抽屉
            document.addEventListener('click', function(e) {
                if (!e.target.closest('#nav-categories-box')) {
                    document.querySelectorAll('#nav-categories-box .nav-menu-item-wrap.open').forEach(w => {
                        w.classList.remove('open');
                    });
                }
                const modal = document.getElementById('modal-nav-submenu');
                if (modal && e.target === modal) {
                    window.closeNavSubmenuModal();
                }
            });

            // 3. 加载品牌列表 (支持按子菜单标题联动自动匹配高亮)
            async function loadBrands(targetBrandName = '') {
                const res = await api.request(`/api/appraisal/getBrands&category_id=${state.currentCat || 1}`);
                if (res && res.code === 200) {
                    state.brands = res.data || [];
                    const box = document.getElementById('brand-pills-box');
                    if (!box) return;

                    let matchedBrandId = 0;
                    if (targetBrandName) {
                        const cleanTarget = targetBrandName.trim().toLowerCase();
                        const match = state.brands.find(b => b.name && b.name.trim().toLowerCase() === cleanTarget);
                        if (match) {
                            matchedBrandId = match.id;
                        }
                    }

                    state.currentBrand = matchedBrandId;

                    let html = `<span class="brand-pill ${matchedBrandId === 0 ? 'active' : ''}" data-brand="0">全部品牌</span>`;
                    state.brands.forEach(b => {
                        const isActive = b.id === matchedBrandId;
                        html += `<span class="brand-pill ${isActive ? 'active' : ''}" data-brand="${b.id}">${escapeHtml(b.name)}</span>`;
                    });
                    box.innerHTML = html;

                    box.querySelectorAll('.brand-pill').forEach(el => {
                        el.addEventListener('click', function() {
                            box.querySelectorAll('.brand-pill').forEach(i => i.classList.remove('active'));
                            this.classList.add('active');
                            state.currentBrand = parseInt(this.getAttribute('data-brand') || 0);
                            loadDevices();
                        });
                    });
                }
            }

            // 4. 加载商品列表
            async function loadDevices() {
                const grid = document.getElementById('devices-grid-box');
                grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted);">正在加载商品列表中...</div>';

                const res = await api.request(`/api/appraisal/searchDevices&category_id=${state.currentCat}&brand_id=${state.currentBrand}&keyword=${encodeURIComponent(state.keyword)}&page=1`);
                if (res && res.code === 200) {
                    state.devices = res.data.list || [];
                    document.getElementById('device-count-tag').innerText = `共 ${res.data.total || 0} 款商品`;

                    if (state.devices.length === 0) {
                        grid.innerHTML = `
                            <div class="empty-state-card">
                                <div class="empty-icon-wrap">
                                    <svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="#94a3b8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                                </div>
                                <div class="empty-title">当前分类暂无商品</div>
                                <div class="empty-desc">该分类暂无商品，您可以查看其他分类或直接在上方搜索商品型号。</div>
                                <div class="empty-actions">
                                    <button class="btn btn-primary" onclick="window.returnHome(event)" style="height:42px;padding:0 24px;border-radius:10px;">
                                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                                        查看全部分类商品
                                    </button>
                                </div>
                            </div>
                        `;
                        return;
                    }

                    let html = '';
                    state.devices.forEach(d => {
                        const img = d.cover_img || '/uploads/default/dev_default.svg';
                        const unit = d.unit || '台';
                        html += `
                            <div class="device-card" onclick="window.startAppraisal(${d.id})">
                                ${d.is_hot ? '<span class="device-tag"><svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor" style="margin-right:2px;vertical-align:-1px;"><path d="M12 23c6.075 0 11-4.925 11-11C23 5.4 18.667 1.5 12 1 12 7 9 9 9 9s-3-2-3-4C3 8 2 10.5 2 12c0 6.075 4.925 11 10 11z"/></svg>热门回收</span>' : ''}
                                <div class="device-img-wrap">
                                    <img src="${escapeHtml(img)}" class="device-img" alt="${escapeHtml(d.name)}" onerror="this.src='/uploads/default/dev_default.svg'">
                                </div>
                                <div>
                                    <div class="device-name" title="${escapeHtml(d.name)}">${escapeHtml(d.name)}</div>
                                    <div class="device-price-label">基础回收价</div>
                                    <div class="device-price-num">¥ ${escapeHtml(d.guide_price)} <span style="font-size:12px;font-weight:normal;color:var(--text-muted);">/${escapeHtml(unit)}</span></div>
                                </div>
                                <button class="btn-evaluate">立即在线估价 →</button>
                            </div>
                        `;
                    });
                    grid.innerHTML = html;
                }
            }

            // 5. 启动互动估价面板 (支持极速成色与专业精准自测双模式)
            window.startAppraisal = async function(deviceId) {
                const device = state.devices.find(d => d.id == deviceId);
                if (!device) return;

                state.activeDevice = device;
                state.selectedItemIds = {};
                state.appraisalMode = 'quick';
                state.quickTierId = 'tier_95';
                state.calculatedPrice = parseFloat(device.guide_price);

                const unit = device.unit || '台';
                document.getElementById('eval-name').innerText = device.name;
                document.getElementById('eval-guide-price').innerText = `¥ ${device.guide_price} / ${unit}`;
                document.getElementById('eval-calc-price').innerText = `¥ ${device.guide_price}`;
                document.getElementById('eval-img').src = device.cover_img || '/uploads/default/dev_default.svg';

                // 重置双模式 Tab
                const tabQuick = document.getElementById('tab-mode-quick');
                const tabPro = document.getElementById('tab-mode-pro');
                if (tabQuick) tabQuick.classList.add('active');
                if (tabPro) tabPro.classList.remove('active');
                const quickBox = document.getElementById('eval-quick-container');
                const proBox = document.getElementById('eval-pro-container');
                if (quickBox) quickBox.style.display = 'block';
                if (proBox) proBox.style.display = 'none';

                const qBox = document.getElementById('eval-questions-container');
                qBox.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-muted);">正在加载专业质检评估标准...</div>';

                document.getElementById('modal-appraisal').style.display = 'flex';

                const res = await api.request(`/api/appraisal/getMatrix&device_id=${deviceId}`);
                let questions = [];
                if (res && res.code === 200 && res.data) {
                    state.matrix = res.data;
                    questions = res.data.question_tree || res.data.questions || [];
                    state.quickTiers = res.data.quick_tiers || [];
                }

                if (!state.quickTiers || state.quickTiers.length === 0) {
                    const gp = parseFloat(device.guide_price) || 0;
                    const floor = gp <= 50 ? Math.min(gp, Math.max(1, Math.round(gp * 0.05))) : Math.min(gp, Math.max(10, Math.round(gp * 0.05)));
                    state.quickTiers = [
                        { id: 'tier_99', name: '99新 · 几乎全新', badge: '成色极佳', desc: '机身完好无痕迹，功能全正常，屏幕显示完美', estimate_price: Math.max(floor, Math.round(gp * 0.93)) },
                        { id: 'tier_95', name: '95新 · 轻微使用', badge: '主流推荐', desc: '屏幕完好无裂痕，机身有极细微正常使用痕迹，功能完好', estimate_price: Math.max(floor, Math.round(gp * 0.82)) },
                        { id: 'tier_85', name: '85新 · 正常磨损', badge: '常见成色', desc: '机身有轻微磕碰或掉漆，屏幕有轻微细划痕但显示正常', estimate_price: Math.max(floor, Math.round(gp * 0.68)) },
                        { id: 'tier_70', name: '7成新 · 较多磕碰', badge: '外观瑕疵', desc: '机身有较多磕碰或凹陷，屏幕划痕较重但触摸功能完好', estimate_price: Math.max(floor, Math.round(gp * 0.48)) },
                        { id: 'tier_broken', name: '重损 · 碎屏/不开机', badge: '残值回收', desc: '屏幕碎裂/无法开机/严重进水变形/核心零部件故障', estimate_price: floor }
                    ];
                }

                if (questions.length === 0) {
                    // 通用高保真质检题目兜底
                    questions = [
                        {
                            id: 1, title: '外观品质与成色状况', sub_title: '观察商品整体品相、磨损氧化或瑕疵程度',
                            items: [
                                { id: 1, name: '特优品质 / 近乎全新 / 零杂质', deduct_value: 0 },
                                { id: 2, name: '正常使用 / 轻微痕迹 / 少量杂质', deduct_value: -150 },
                                { id: 3, name: '明显磨损 / 磕碰变形 / 中度杂质', deduct_value: -400 }
                            ]
                        },
                        {
                            id: 2, title: '核心规格与参数指标', sub_title: '铭牌规格、容量、材质纯度或车型配置',
                            items: [
                                { id: 4, name: '主流高规格 (大容量/高纯度)', deduct_value: 0 },
                                { id: 5, name: '标准标准规格参数', deduct_value: -200 },
                                { id: 6, name: '基础入门规格', deduct_value: -500 }
                            ]
                        },
                        {
                            id: 3, title: '功能运转与拆修史', sub_title: '核心部件性能与历史维修整备情况',
                            items: [
                                { id: 7, name: '原装完好 / 运转完全正常', deduct_value: 0 },
                                { id: 8, name: '正常维护过 / 局部小修', deduct_value: -200 },
                                { id: 9, name: '大修故障 / 需大宗整备', deduct_value: -800 }
                            ]
                        }
                    ];
                    state.matrix = { questions, quick_tiers: state.quickTiers };
                }

                renderQuickTiers();
                renderQuestions(questions);
            };

            // 渲染极速估价 5 档成色卡片
            function renderQuickTiers() {
                const box = document.getElementById('quick-tiers-box');
                if (!box) return;
                const tiers = state.quickTiers || [];
                let html = '';

                tiers.forEach(t => {
                    const isSelected = (t.id === state.quickTierId);
                    if (isSelected && state.appraisalMode === 'quick') {
                        state.calculatedPrice = t.estimate_price;
                        const calcEl = document.getElementById('eval-calc-price');
                        if (calcEl) calcEl.innerText = `¥ ${t.estimate_price}`;
                        updateAppraisalCouponBadge(t.estimate_price);
                    }

                    html += `
                        <div class="quick-tier-card ${isSelected ? 'selected' : ''}" onclick="window.selectQuickTier('${t.id}')">
                            <div class="quick-tier-left">
                                <div class="quick-tier-header">
                                    <span class="quick-tier-name">${escapeHtml(t.name)}</span>
                                    <span class="quick-tier-badge">${escapeHtml(t.badge || '成色参考')}</span>
                                </div>
                                <div class="quick-tier-desc">${escapeHtml(t.desc || '')}</div>
                            </div>
                            <div class="quick-tier-right">
                                <div class="quick-tier-price">¥ ${escapeHtml(t.estimate_price)}</div>
                                <div class="quick-tier-radio"></div>
                            </div>
                        </div>
                    `;
                });

                box.innerHTML = html;
            }

            // 切换估价模式 (极速 vs 专业)
            window.switchAppraisalMode = function(mode) {
                state.appraisalMode = mode;
                const tabQuick = document.getElementById('tab-mode-quick');
                const tabPro = document.getElementById('tab-mode-pro');
                const quickBox = document.getElementById('eval-quick-container');
                const proBox = document.getElementById('eval-pro-container');

                if (mode === 'quick') {
                    if (tabQuick) tabQuick.classList.add('active');
                    if (tabPro) tabPro.classList.remove('active');
                    if (quickBox) quickBox.style.display = 'block';
                    if (proBox) proBox.style.display = 'none';

                    const activeTier = (state.quickTiers || []).find(t => t.id === state.quickTierId) || (state.quickTiers && state.quickTiers[0]);
                    if (activeTier) {
                        state.calculatedPrice = activeTier.estimate_price;
                        const calcEl = document.getElementById('eval-calc-price');
                        if (calcEl) calcEl.innerText = `¥ ${activeTier.estimate_price}`;
                        updateAppraisalCouponBadge(activeTier.estimate_price);
                    }
                } else {
                    if (tabPro) tabPro.classList.add('active');
                    if (tabQuick) tabQuick.classList.remove('active');
                    if (proBox) proBox.style.display = 'block';
                    if (quickBox) quickBox.style.display = 'none';
                    recalculatePrice();
                }
            };

            // 选中极速成色档位
            window.selectQuickTier = function(tierId) {
                state.quickTierId = tierId;
                const activeTier = (state.quickTiers || []).find(t => t.id === tierId);
                if (activeTier) {
                    state.calculatedPrice = activeTier.estimate_price;
                    const calcEl = document.getElementById('eval-calc-price');
                    if (calcEl) calcEl.innerText = `¥ ${activeTier.estimate_price}`;
                    updateAppraisalCouponBadge(activeTier.estimate_price);
                }
                renderQuickTiers();
            };

            function renderQuestions(questions) {
                const qBox = document.getElementById('eval-questions-container');
                let html = '';

                questions.forEach(q => {
                    const items = q.items || [];
                    if (items.length > 0 && !state.selectedItemIds[q.id]) {
                        state.selectedItemIds[q.id] = items[0].id;
                    }

                    let optionsHtml = '';
                    items.forEach(it => {
                        const isSelected = state.selectedItemIds[q.id] === it.id;
                        const hasImg = it.image && it.image.trim() !== '';
                        const imgThumb = hasImg ? `
                            <div class="opt-ref-thumb" onclick="event.stopPropagation(); window.showRefImagePreview('${escapeHtml(it.image)}', '${escapeHtml(it.name)}', '${escapeHtml(it.desc_text || '')}')" title="点击查看质检参考图例">
                                <img src="${escapeHtml(it.image)}" alt="图例" onerror="this.parentElement.style.display='none'">
                                <span class="opt-ref-tip"><svg viewBox="0 0 24 24" width="9" height="9" fill="currentColor" style="margin-right:2px;vertical-align:-1px;"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>参考图例</span>
                            </div>
                        ` : '';

                        optionsHtml += `
                            <div class="eval-option-item ${isSelected ? 'selected' : ''} ${hasImg ? 'has-img' : ''}" 
                                 onclick="window.selectOption(${q.id}, ${it.id})">
                                ${imgThumb}
                                <div class="opt-text-wrap">
                                    <div class="opt-name">${escapeHtml(it.name)}</div>
                                    ${it.desc_text ? `<div class="opt-desc">${escapeHtml(it.desc_text)}</div>` : ''}
                                </div>
                            </div>
                        `;
                    });

                    html += `
                        <div class="eval-q-group">
                            <div class="eval-q-title">${escapeHtml(q.title)}</div>
                            <div class="eval-q-sub">${escapeHtml(q.sub_title || '')}</div>
                            <div class="eval-options-grid">${optionsHtml}</div>
                        </div>
                    `;
                });

                qBox.innerHTML = html;
                if (state.appraisalMode === 'pro') {
                    recalculatePrice();
                }
            }

            window.showRefImagePreview = function(imgUrl, name, desc) {
                const modal = document.getElementById('modal-ref-image');
                if (!modal) return;
                document.getElementById('ref-modal-title').innerText = `${name || '质检标准图例'}`;
                document.getElementById('ref-modal-desc').innerText = desc || '请参照标准图例判断商品成色';
                document.getElementById('ref-modal-img').src = imgUrl;
                modal.style.display = 'flex';
            };

            window.closeRefImageModal = function() {
                const modal = document.getElementById('modal-ref-image');
                if (modal) modal.style.display = 'none';
            };

            window.selectOption = function(qId, itemId) {
                state.selectedItemIds[qId] = itemId;
                const questions = state.matrix.question_tree || state.matrix.questions || [];
                renderQuestions(questions);
            };

            async function recalculatePrice() {
                if (state.appraisalMode === 'quick') {
                    const activeTier = (state.quickTiers || []).find(t => t.id === state.quickTierId);
                    if (activeTier) {
                        state.calculatedPrice = activeTier.estimate_price;
                        const calcEl = document.getElementById('eval-calc-price');
                        if (calcEl) calcEl.innerText = `¥ ${activeTier.estimate_price}`;
                        updateAppraisalCouponBadge(activeTier.estimate_price);
                    }
                    return;
                }
                const itemIds = Object.values(state.selectedItemIds);
                const res = await api.request('/api/appraisal/calculate', 'POST', {
                    device_id: state.activeDevice.id,
                    mode: 'custom',
                    item_ids: itemIds
                });
                if (res && res.code === 200 && res.data) {
                    state.calculatedPrice = res.data.estimate_price;
                    document.getElementById('eval-calc-price').innerText = `¥ ${res.data.estimate_price}`;
                    updateAppraisalCouponBadge(res.data.estimate_price);
                }
            }

            window.closeAppraisalModal = function() {
                document.getElementById('modal-appraisal').style.display = 'none';
            };

            window.closeOrderModal = function() {
                document.getElementById('modal-order').style.display = 'none';
            };

            // 跳转到下单
            document.getElementById('btn-proceed-order')?.addEventListener('click', function() {
                const meta = state.platformMeta || {};
                // 若未开启免登录下单且当前未登录，提示先登录
                if (meta.user_order_guest_enabled === false && !state.userToken) {
                    SysUI.toast('平台已开启会员交易安全保护，请先登录账号', 'info');
                    window.openAuthModal('login');
                    return;
                }

                closeAppraisalModal();

                const nameEl = document.getElementById('order-dev-name');
                if (nameEl && state.activeDevice) {
                    if (state.appraisalMode === 'quick') {
                        const activeTier = (state.quickTiers || []).find(t => t.id === state.quickTierId);
                        const tierName = activeTier ? activeTier.name : '标准成色';
                        nameEl.innerText = `${state.activeDevice.name} (${tierName})`;
                    } else {
                        nameEl.innerText = `${state.activeDevice.name} (专业精准自检)`;
                    }
                }
                const priceEl = document.getElementById('order-est-price');
                if (priceEl) priceEl.innerText = '¥ ' + state.calculatedPrice;
                if (state.userMobile) {
                    const mobileEl = document.getElementById('order-mobile');
                    if (mobileEl) mobileEl.value = state.userMobile;
                }

                // 若已登录，自动带入联系人姓名、常用地址与常用收款方式
                if (state.userInfo) {
                    const nameInput = document.getElementById('order-name');
                    if (nameInput && !nameInput.value && (state.userInfo.realname || state.userInfo.nickname)) {
                        nameInput.value = state.userInfo.realname || state.userInfo.nickname;
                    }
                    const addrInput = document.getElementById('order-address');
                    if (addrInput && !addrInput.value && state.userInfo.default_address) {
                        addrInput.value = state.userInfo.default_address;
                    }
                    if (state.userInfo.default_payout_type) {
                        state.currentPayout = state.userInfo.default_payout_type;
                    }
                }

                renderFulfillmentCards();
                renderPayoutCards();
                renderOrderCoupons(state.calculatedPrice);

                // 回填收款字段
                if (state.userInfo) {
                    const pName = document.getElementById('payout-name');
                    const pAccount = document.getElementById('payout-account');
                    const pBank = document.getElementById('payout-bank');
                    if (pName && state.userInfo.default_payout_name) pName.value = state.userInfo.default_payout_name;
                    if (pAccount && state.userInfo.default_payout_account) pAccount.value = state.userInfo.default_payout_account;
                    if (pBank && state.userInfo.default_payout_bank) pBank.value = state.userInfo.default_payout_bank;
                }

                const modalOrder = document.getElementById('modal-order');
                if (modalOrder) modalOrder.style.display = 'flex';
            });


    // 搜索、回到首页与 FAQ 折叠交互
            // 搜索
            let searchTimeout = null;
            document.getElementById('main-search-input')?.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                const val = e.target.value.trim();
                searchTimeout = setTimeout(() => {
                    state.keyword = val;
                    loadDevices();
                }, 300);
            });
            document.getElementById('main-search-input')?.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    clearTimeout(searchTimeout);
                    state.keyword = e.target.value.trim();
                    loadDevices();
                }
            });
            document.getElementById('btn-main-search')?.addEventListener('click', () => {
                state.keyword = document.getElementById('main-search-input')?.value.trim() || '';
                loadDevices();
            });

            // 回到首页核心方法：重置分类、品牌、搜索词，恢复展示全部品类行情并平滑回顶
            window.returnHome = function(e) {
                if (e && e.preventDefault) e.preventDefault();
                // 1. 关闭任何可能处于打开状态的弹窗
                const modals = document.querySelectorAll('.modal-overlay');
                modals.forEach(m => m.style.display = 'none');
                // 2. 清空搜索栏输入与关键词
                const searchInput = document.getElementById('main-search-input');
                if (searchInput) searchInput.value = '';
                state.keyword = '';
                // 3. 重置选中的品类与品牌为全部 (0)
                state.currentCat = 0;
                state.currentBrand = 0;
                // 4. 重置顶部导航的高亮状态 (主菜单与二级子菜单)
                const catBox = document.getElementById('nav-categories-box');
                if (catBox) {
                    catBox.querySelectorAll('.nav-cat-item, .nav-dropdown-item').forEach(el => {
                        if (el.getAttribute('data-cat') === '0') {
                            el.classList.add('active');
                        } else {
                            el.classList.remove('active');
                        }
                    });
                }
                // 5. 重新加载对应品牌与商品列表
                loadBrands();
                loadDevices();
                // 6. 平滑滚动到页面顶部
                window.scrollTo({ top: 0, behavior: 'smooth' });
            };

            // 热门标签快捷搜索
            window.quickSearch = function(kw) {
                const input = document.getElementById('main-search-input');
                if (input) input.value = kw;
                state.keyword = kw;
                loadDevices();
                const target = document.getElementById('current-list-title');
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            };

            // 常见问答展开折叠交互
            window.toggleFaq = function(item) {
                if (!item) return;
                const wasActive = item.classList.contains('active');
                document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
                if (!wasActive) {
                    item.classList.add('active');
                }
            };


    // 挂载商品与估价模块核心方法到全局
    window.loadCategories = loadCategories;
    window.renderNavMenus = renderNavMenus;
    window.bindNavMenuEvents = bindNavMenuEvents;
    window.loadBrands = loadBrands;
    window.loadDevices = loadDevices;
    window.startAppraisal = startAppraisal;
    window.switchAppraisalMode = switchAppraisalMode;
    window.selectQuickTier = selectQuickTier;
    window.selectOption = selectOption;
    window.recalculatePrice = recalculatePrice;
    window.showRefImagePreview = showRefImagePreview;
    window.closeRefImageModal = closeRefImageModal;
    window.closeAppraisalModal = closeAppraisalModal;
    window.closeOrderModal = closeOrderModal;
    window.returnHome = returnHome;
    window.quickSearch = quickSearch;
    window.toggleFaq = toggleFaq;
})(window);
