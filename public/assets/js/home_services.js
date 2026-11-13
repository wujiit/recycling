/**
 * 启灵同城服务系统 - 客户端同城生活服务展示与预约预约流
 * 职责：服务品类筛选、服务项目列表展示、多规格预约弹窗、下单直通收银台
 * 编码：UTF-8 无 BOM
 */
(function (window) {
    'use strict';

    async function doApiRequest(endpoint, method = 'GET', data = null) {
        try {
            if (window.HomeApp && window.HomeApp.api && typeof window.HomeApp.api.request === 'function') {
                const res = await window.HomeApp.api.request(endpoint, method, data);
                if (res) return res;
            }
        } catch (err) {
            console.warn('[home_services] HomeApp.api.request failed, trying direct fetch:', err);
        }

        let url = `/index.php?s=${endpoint}`;
        const token = localStorage.getItem('ql_user_token');
        if (token && !url.includes('token=')) {
            url += (url.includes('?') ? '&' : '?') + `token=${encodeURIComponent(token)}`;
        }
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (token) options.headers['Authorization'] = 'Bearer ' + token;
        if (data && (method === 'POST' || method === 'PUT')) options.body = JSON.stringify(data);

        const resp = await fetch(url, options);
        return await resp.json();
    }

    let serviceCategories = [];
    let currentCategoryId = 0;
    let selectedSpec = null;
    let currentServiceDetail = null;
    let scenarioConfig = null;

    /**
     * 初始化生活服务板块
     */
    async function initLifeServices() {
        await loadScenarioConfig();
        await loadServiceCategories();
    }

    /**
     * 加载行业场景配置与自定义表单字段
     */
    async function loadScenarioConfig() {
        try {
            const res = await doApiRequest('/api/service/scenarioInfo');
            if (res && res.code === 200 && res.data) {
                scenarioConfig = res.data;
                window._scenarioConfig = res.data;

                // 若关闭了闲置回收模块，动态隐藏回收估价入口
                if (scenarioConfig.feature_toggles && scenarioConfig.feature_toggles.module_recycle_enabled === '0') {
                    const recycleEls = document.querySelectorAll('.nav-recycle, .appraisal-card, .recycle-hero-entry, [data-module="recycle"]');
                    recycleEls.forEach(el => el.style.display = 'none');
                }
            }
        } catch (e) {}
    }

    /**
     * 加载服务品类
     */
    async function loadServiceCategories() {
        try {
            const res = await doApiRequest('/api/service/categories');
            if (res && res.code === 200 && Array.isArray(res.data) && res.data.length > 0) {
                serviceCategories = res.data;
                renderNavCategoryPills();
                return;
            }
        } catch (e) {
            console.warn('[home_services] loadServiceCategories API failed, using fallback categories:', e);
        }

        // 默认保底三大生活服务核心品类 (上门伴宠、家政保洁、家庭维修)
        serviceCategories = [
            { id: 1, name: '上门宠物与伴宠服务', icon: '🐕' },
            { id: 2, name: '家政保洁与家电清洗', icon: '🧹' },
            { id: 3, name: '家庭维修与安装快修', icon: '🛠️' }
        ];
        renderNavCategoryPills();
    }

    /**
     * 渲染顶部与栏目品类 Pills
     */
    function renderNavCategoryPills() {
        const box = document.getElementById('service-category-pills');
        if (!box) return;

        let html = `<span class="service-cat-pill ${currentCategoryId === 0 ? 'active' : ''}" data-cat-id="0">全部生活服务</span>`;
        serviceCategories.forEach(c => {
            html += `<span class="service-cat-pill ${currentCategoryId === c.id ? 'active' : ''}" data-cat-id="${c.id}">
                ${c.icon ? `<span style="margin-right:5px;">${c.icon}</span>` : ''}${c.name}
            </span>`;
        });
        box.innerHTML = html;

        box.querySelectorAll('.service-cat-pill').forEach(el => {
            el.addEventListener('click', function () {
                box.querySelectorAll('.service-cat-pill').forEach(p => p.classList.remove('active'));
                this.classList.add('active');
                currentCategoryId = parseInt(this.getAttribute('data-cat-id') || 0);
                loadServiceItems(currentCategoryId);
            });
        });

        loadServiceItems(currentCategoryId);
    }

    /**
     * 加载生活服务项目列表
     */
    async function loadServiceItems(catId = 0) {
        const container = document.getElementById('service-items-grid');
        if (!container) return;

        container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#94a3b8;"><div class="loading-spinner"></div><p style="margin-top:12px;font-size:13px;">正在加载精选生活服务...</p></div>';

        try {
            const qs = catId > 0 ? `&category_id=${catId}` : '';
            const res = await doApiRequest(`/api/service/list${qs}`);
            if (!res || res.code !== 200 || !res.data) {
                container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:36px;color:#ef4444;">
                    <p style="font-weight:600;margin-bottom:8px;">加载服务失败：${(res && res.msg) || '连接超时'}</p>
                    <button class="btn btn-outline" style="font-size:12px;padding:5px 16px;border-radius:20px;" onclick="window.loadServiceItems(${catId})">点击重新加载</button>
                </div>`;
                return;
            }

            const items = res.data.list || [];
            if (items.length === 0) {
                container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:50px;color:#94a3b8;"><p style="font-size:14px;">该品类暂无在线服务项目</p></div>';
                return;
            }

            let html = '';
            items.forEach(item => {
                const cover = item.cover_image || '/uploads/default/service_clean.svg';
                const hotTag = item.is_hot ? '<span class="service-badge-hot">🔥 爆款推荐</span>' : '';
                const displayPrice = item.price || item.base_price || '0.00';
                const rawUnit = item.price_unit || item.unit || '次';
                const unitStr = ` / ${rawUnit} 起`;
                const sales = item.sales_count ? `<span style="font-size:11.5px;color:#94a3b8;font-weight:500;">已售 ${item.sales_count}</span>` : '';

                html += `
                    <div class="service-card" onclick="window.openServiceBookingModal(${item.id})">
                        <div class="service-card-img-wrap">
                            <img src="${cover}" alt="${item.title}" class="service-card-img" onerror="this.onerror=null; this.src='/uploads/default/service_clean.svg'">
                            ${hotTag}
                            <span class="service-cat-tag">${item.category_name || '生活服务'}</span>
                        </div>
                        <div class="service-card-body">
                            <h3 class="service-card-title">${item.title}</h3>
                            <p class="service-card-desc">${item.sub_title || '专业师傅上门 · 标准透明定价 · 售后无忧'}</p>
                            <div class="service-card-footer">
                                <div class="service-price-box">
                                    <span class="service-price-prefix">¥</span>
                                    <span class="service-price-val">${displayPrice}</span>
                                    <span class="service-price-unit">${unitStr}</span>
                                </div>
                                <div style="display:flex;align-items:center;gap:10px;">
                                    ${sales}
                                    <button class="service-book-btn" onclick="event.stopPropagation(); window.openServiceBookingModal(${item.id})">立即预约</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });

            container.innerHTML = html;
        } catch (e) {
            console.error('[home_services] loadServiceItems error:', e);
            container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:36px;color:#ef4444;">
                <p style="font-weight:600;margin-bottom:8px;">服务加载异常 (${e.message || '网络连接不稳定'})</p>
                <button class="btn btn-outline" style="font-size:12px;padding:5px 16px;border-radius:20px;" onclick="window.loadServiceItems(${catId})">点击刷新重试</button>
            </div>`;
        }
    }

    /**
     * 打开预约弹窗并选择服务规格
     */
    async function openServiceBookingModal(serviceId) {
        try {
            const res = await doApiRequest(`/api/service/detail&id=${serviceId}`);
            if (!res || res.code !== 200 || !res.data) {
                alert(res ? res.msg : '获取服务详情失败');
                return;
            }

            const item = res.data;
            currentServiceDetail = item;
            const specs = item.specs || [];
            selectedSpec = specs.find(s => s.is_default) || specs[0] || null;

            // 严谨计算单价与合计金额 (杜绝 undefined)
            function getSpecPrice(s, itm) {
                if (s) {
                    if (s.spec_price !== undefined && s.spec_price !== null && s.spec_price !== '') return s.spec_price;
                    if (s.price !== undefined && s.price !== null && s.price !== '') return s.price;
                }
                if (itm) {
                    if (itm.price !== undefined && itm.price !== null && itm.price !== '') return itm.price;
                    if (itm.base_price !== undefined && itm.base_price !== null && itm.base_price !== '') return itm.base_price;
                }
                return '0.00';
            }

            const currentPrice = getSpecPrice(selectedSpec, item);

            // 预填当前登录用户的姓名和手机号
            const userProfile = (window.Auth && window.Auth.getUser()) || {};
            const defaultName = userProfile.realname || userProfile.nickname || '';
            const defaultMobile = userProfile.mobile || '';

            // 生成明日上午10:00的标准默认预约时间
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(10, 0, 0, 0);
            const defaultTimeStr = tomorrow.toISOString().slice(0, 16);

            // 智能识别当前服务项目所属行业 (宠物 vs 保洁 vs 维修)
            const catId = parseInt(item.category_id || 0);
            const catName = (item.category_name || '').toLowerCase();
            const title = (item.title || '').toLowerCase();

            let targetIndustry = 'common';
            if (catId === 1 || catName.includes('宠') || title.includes('犬') || title.includes('猫') || title.includes('宠') || title.includes('遛')) {
                targetIndustry = 'pet';
            } else if (catId === 2 || catName.includes('保洁') || catName.includes('清洗') || title.includes('保洁') || title.includes('清洗') || title.includes('油烟') || title.includes('空调')) {
                targetIndustry = 'cleaning';
            } else if (catId === 3 || catName.includes('维修') || catName.includes('快修') || title.includes('电') || title.includes('水') || title.includes('锁') || title.includes('修') || title.includes('疏通')) {
                targetIndustry = 'repair';
            }

            // 动态生成行业专属表单字段 (严格按所属子品类过滤，坚决不串行！)
            let dynamicFieldsHtml = '';
            const allCustomFields = (scenarioConfig && Array.isArray(scenarioConfig.custom_fields)) ? scenarioConfig.custom_fields : [];
            const relevantFields = allCustomFields.filter(f => {
                // 如果当前项目已经配置了多规格(如小型犬/中型犬/大型犬等规格)，则不重复展示体型选择项，杜绝重复选择
                if (f.key === 'pet_size' && specs.length > 0) return false;
                // 彻底淘汰不必要的“工具准备方式”（师傅默认自备全套工具上门）
                if (f.key === 'tools_supplied') return false;

                const ct = f.category_type || f.industry_type || '';
                if (ct) {
                    if (ct === 'common') return true;
                    if (ct === targetIndustry) return true;
                    if (ct === 'cleaning_or_repair' && (targetIndustry === 'cleaning' || targetIndustry === 'repair')) return true;
                    return false;
                }
                const k = f.key || '';
                if (k.startsWith('pet_')) return targetIndustry === 'pet';
                if (k.startsWith('house_')) return targetIndustry === 'cleaning';
                if (k === 'fault_desc' || k === 'need_parts') return targetIndustry === 'repair';
                if (k === 'tools_supplied') return targetIndustry === 'cleaning' || targetIndustry === 'repair';
                return true;
            });

            if (relevantFields.length > 0) {
                let fieldsInside = '';
                relevantFields.forEach(f => {
                    const isReq = parseInt(f.required || 0) === 1;
                    const reqMark = isReq ? '<span style="color:#ef4444;">*</span>' : '';
                    const fieldId = 'cf_' + f.key;

                    if (f.type === 'radio' && Array.isArray(f.options)) {
                        const optsHtml = f.options.map((opt, i) => `
                            <label style="display:inline-flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;margin-right:12px;">
                                <input type="radio" name="custom_field_${f.key}" value="${opt}" ${i === 0 ? 'checked' : ''} class="dynamic-custom-field-radio" data-key="${f.key}" data-label="${f.label}" data-required="${f.required}">
                                <span>${opt}</span>
                            </label>
                        `).join('');
                        fieldsInside += `
                            <div style="margin-bottom:10px;">
                                <label style="display:block;margin-bottom:6px;font-weight:600;font-size:12px;color:#334155;">${f.label} ${reqMark}</label>
                                <div style="display:flex;flex-wrap:wrap;align-items:center;">${optsHtml}</div>
                            </div>
                        `;
                    } else if (f.type === 'select' && Array.isArray(f.options)) {
                        const optsHtml = f.options.map(opt => `<option value="${opt}">${opt}</option>`).join('');
                        fieldsInside += `
                            <div style="margin-bottom:10px;">
                                <label style="display:block;margin-bottom:6px;font-weight:600;font-size:12px;color:#334155;">${f.label} ${reqMark}</label>
                                <select id="${fieldId}" class="form-control form-input dynamic-custom-field-val" data-key="${f.key}" data-label="${f.label}" data-required="${f.required}" style="width:100%;height:36px;padding:0 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:13px;">
                                    <option value="">请选择${f.label}</option>
                                    ${optsHtml}
                                </select>
                            </div>
                        `;
                    } else if (f.type === 'switch') {
                        fieldsInside += `
                            <div style="margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;background:#fff;padding:8px 12px;border-radius:6px;border:1px solid #e2e8f0;">
                                <label style="font-weight:600;font-size:12px;color:#334155;">${f.label} ${reqMark}</label>
                                <input type="checkbox" id="${fieldId}" class="dynamic-custom-field-val" data-type="switch" data-key="${f.key}" data-label="${f.label}" data-required="${f.required}" style="width:18px;height:18px;cursor:pointer;">
                            </div>
                        `;
                    } else {
                        // text or number
                        const inputType = f.type === 'number' ? 'number' : 'text';
                        fieldsInside += `
                            <div style="margin-bottom:10px;">
                                <label style="display:block;margin-bottom:6px;font-weight:600;font-size:12px;color:#334155;">${f.label} ${reqMark}</label>
                                <input type="${inputType}" id="${fieldId}" class="form-control form-input dynamic-custom-field-val" data-key="${f.key}" data-label="${f.label}" data-required="${f.required}" placeholder="${f.placeholder || ('请输入' + f.label)}" style="width:100%;height:36px;padding:0 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:13px;">
                            </div>
                        `;
                    }
                });

                let sectionTitle = '行业专属预约信息';
                let sectionIcon = '🧩';
                if (targetIndustry === 'pet') {
                    sectionTitle = '爱宠专属档案与护理信息';
                    sectionIcon = '🐕';
                } else if (targetIndustry === 'cleaning') {
                    sectionTitle = '房屋户型与深度保洁说明';
                    sectionIcon = '🧹';
                } else if (targetIndustry === 'repair') {
                    sectionTitle = '故障排障与维修配件说明';
                    sectionIcon = '🛠️';
                }

                dynamicFieldsHtml = `
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;margin-bottom:14px;">
                        <div style="font-weight:700;font-size:12px;color:#475569;margin-bottom:10px;display:flex;align-items:center;gap:6px;">
                            <span>${sectionIcon}</span> ${sectionTitle}
                        </div>
                        ${fieldsInside}
                    </div>
                `;
            }

            let specsHtml = '';
            if (specs.length > 0) {
                specsHtml = `
                    <div style="margin-bottom:16px;">
                        <label class="form-label" style="font-weight:700;display:block;margin-bottom:8px;font-size:13px;color:#1e293b;">
                            选择服务规格 / 面积程度 <span style="color:#ef4444;">*</span>
                        </label>
                        <div class="service-specs-wrap" id="service-specs-wrap" style="display:flex;flex-wrap:wrap;gap:8px;">
                            ${specs.map((s, idx) => {
                                const spVal = getSpecPrice(s, item);
                                return `
                                    <div class="service-spec-pill ${(selectedSpec && selectedSpec.id === s.id) ? 'active' : ''}" data-spec-id="${s.id}" data-spec-price="${spVal}" onclick="window.onSelectServiceSpec(${s.id})">
                                        <span class="spec-name">${s.spec_name}</span>
                                        <span class="spec-price">¥${spVal}</span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            }

            const modalHtml = `
                <div id="modal-service-book" class="modal-overlay" style="display:flex;align-items:center;justify-content:center;z-index:1150;">
                    <div class="modal-card" style="max-width:540px;width:92%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1);">
                        <div class="modal-header" style="padding:16px 20px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;background:#f8fafc;">
                            <div style="display:flex;align-items:center;gap:8px;">
                                <span style="font-size:18px;">🛠️</span>
                                <span style="font-weight:700;font-size:16px;color:#0f172a;">在线预约同城服务</span>
                            </div>
                            <span class="modal-close-btn" style="cursor:pointer;font-size:18px;color:#64748b;" onclick="window.closeServiceBookingModal()">✕</span>
                        </div>
                        <div class="modal-body" style="padding:20px;max-height:75vh;overflow-y:auto;">
                            <!-- 服务简述卡片 -->
                            <div style="display:flex;gap:12px;background:#f1f5f9;border-radius:10px;padding:12px;margin-bottom:16px;">
                                <div style="width:54px;height:54px;border-radius:8px;background:#e2e8f0;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;">
                                    ${item.category_icon || '🛠️'}
                                </div>
                                <div>
                                    <h4 style="margin:0 0 4px 0;font-size:15px;color:#0f172a;font-weight:700;">${item.title}</h4>
                                    <div style="font-size:12px;color:#64748b;">${item.sub_title || '专业师傅携带专业工具上门'}</div>
                                    <div style="margin-top:4px;font-size:14px;color:#ea580c;font-weight:700;" id="book-modal-calc-price">
                                        ¥ <span id="book-calc-price-val">${currentPrice}</span>
                                    </div>
                                </div>
                            </div>

                            ${specsHtml}

                            <!-- 预约联系与上门信息 -->
                            <form id="service-book-form">
                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                                    <div>
                                        <label class="form-label" style="display:block;margin-bottom:6px;font-weight:600;font-size:12px;">联系人姓名 <span style="color:#ef4444;">*</span></label>
                                        <input type="text" class="form-control form-input" id="book-contact-name" value="${defaultName}" placeholder="您的姓名或称呼" required style="width:100%;height:38px;padding:0 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:13px;">
                                    </div>
                                    <div>
                                        <label class="form-label" style="display:block;margin-bottom:6px;font-weight:600;font-size:12px;">联系手机号 <span style="color:#ef4444;">*</span></label>
                                        <input type="text" class="form-control form-input" id="book-contact-mobile" value="${defaultMobile}" placeholder="用于接单师傅联系" required style="width:100%;height:38px;padding:0 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:13px;">
                                    </div>
                                </div>

                                <div style="margin-bottom:12px;">
                                    <label class="form-label" style="display:block;margin-bottom:6px;font-weight:600;font-size:12px;">上门服务详细地址 <span style="color:#ef4444;">*</span></label>
                                    <input type="text" class="form-control form-input" id="book-contact-address" placeholder="例：XX市XX区XX小区X号楼XX室" required style="width:100%;height:38px;padding:0 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:13px;">
                                </div>

                                <div style="margin-bottom:12px;">
                                    <label class="form-label" style="display:block;margin-bottom:6px;font-weight:600;font-size:12px;">期望上门时间 <span style="color:#ef4444;">*</span></label>
                                    <input type="datetime-local" class="form-control form-input" id="book-appointment-time" value="${defaultTimeStr}" required style="width:100%;height:38px;padding:0 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:13px;">
                                </div>

                                ${dynamicFieldsHtml}
                                <div style="margin-bottom:14px;">
                                    <label class="form-label" style="display:block;margin-bottom:6px;font-weight:600;font-size:12px;">特殊要求 / 服务备注</label>
                                    <textarea class="form-control form-input" id="book-user-remark" placeholder="如：家里有宠物、需要带梯子等" style="width:100%;height:60px;padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:13px;"></textarea>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer" style="padding:14px 20px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;background:#f8fafc;">
                            <div>
                                <span style="font-size:12px;color:#64748b;">合计金额：</span>
                                <strong style="font-size:18px;color:#ea580c;">¥ <span id="book-modal-total-val">${currentPrice}</span></strong>
                            </div>
                            <div style="display:flex;gap:10px;">
                                <button type="button" class="btn btn-secondary" onclick="window.closeServiceBookingModal()" style="height:38px;padding:0 16px;border-radius:8px;font-size:13px;">取消</button>
                                <button type="button" class="btn btn-primary" id="btn-submit-service-order" style="height:38px;padding:0 22px;background:#1e58ff;color:#fff;border-radius:8px;font-size:13px;font-weight:700;" onclick="window.submitServiceOrder()">立即预约并支付</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('modal-service-book')?.remove();
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        } catch (e) {
            alert('打开预约失败');
        }
    }

    /**
     * 切换选中规格
     */
    window.onSelectServiceSpec = function (specId) {
        if (!currentServiceDetail || !currentServiceDetail.specs) return;
        selectedSpec = currentServiceDetail.specs.find(s => s.id === specId);
        if (selectedSpec) {
            document.querySelectorAll('.service-spec-pill').forEach(el => el.classList.remove('active'));
            document.querySelector(`.service-spec-pill[data-spec-id="${specId}"]`)?.classList.add('active');
            const price = (selectedSpec.spec_price !== undefined && selectedSpec.spec_price !== null && selectedSpec.spec_price !== '') 
                ? selectedSpec.spec_price 
                : ((selectedSpec.price !== undefined && selectedSpec.price !== null) ? selectedSpec.price : '0.00');
            const valEl = document.getElementById('book-calc-price-val');
            const totEl = document.getElementById('book-modal-total-val');
            if (valEl) valEl.innerText = price;
            if (totEl) totEl.innerText = price;
        }
    };

    /**
     * 关闭预约弹窗
     */
    window.closeServiceBookingModal = function () {
        document.getElementById('modal-service-book')?.remove();
    };

    /**
     * 提交服务订单直达收银台
     */
    window.submitServiceOrder = async function () {
        const name = document.getElementById('book-contact-name')?.value.trim();
        const mobile = document.getElementById('book-contact-mobile')?.value.trim();
        const address = document.getElementById('book-contact-address')?.value.trim();
        const appointmentTime = document.getElementById('book-appointment-time')?.value.trim();
        const userRemark = document.getElementById('book-user-remark')?.value.trim();

        if (!name) {
            alert('请填写联系人姓名');
            return;
        }
        if (!mobile || !/^1\d{10}$/.test(mobile)) {
            alert('请填写正确的11位联系手机号');
            return;
        }
        if (!address) {
            alert('请填写上门服务的详细地址');
            return;
        }
        if (!appointmentTime) {
            alert('请选择期望的上门服务时间');
            return;
        }

        // 收集并校验专属表单自定义字段 (仅收集当前可见字段)
        const customFieldsResult = {};
        const fieldInputs = document.querySelectorAll('.dynamic-custom-field-val');
        for (const input of fieldInputs) {
            const label = input.getAttribute('data-label') || input.getAttribute('data-key');
            const isReq = parseInt(input.getAttribute('data-required') || 0) === 1;
            let val = '';
            if (input.getAttribute('data-type') === 'switch') {
                val = input.checked ? '是' : '否';
            } else {
                val = input.value.trim();
            }
            if (isReq && !val) {
                alert('请填写【' + label + '】');
                input.focus();
                return;
            }
            if (val) {
                customFieldsResult[label] = val;
            }
        }

        // 收集单选按钮
        const checkedRadios = document.querySelectorAll('.dynamic-custom-field-radio:checked');
        for (const r of checkedRadios) {
            const label = r.getAttribute('data-label') || r.getAttribute('data-key');
            const val = r.value.trim();
            if (val) {
                customFieldsResult[label] = val;
            }
        }

        const btn = document.getElementById('btn-submit-service-order');
        if (btn) {
            btn.disabled = true;
            btn.innerText = '正在生成订单...';
        }

        try {
            const specIdVal = selectedSpec ? selectedSpec.id : 0;
            const contactObj = {
                name: name,
                mobile: mobile,
                address: address,
                appointment_time: appointmentTime,
                user_remark: userRemark,
                spec_id: specIdVal,
                custom_fields: customFieldsResult
            };

            const payload = {
                biz_type: currentServiceDetail.biz_type || 'service',
                service_id: currentServiceDetail.id,
                device_id: currentServiceDetail.id,
                spec_id: specIdVal,
                contact_name: name,
                contact_mobile: mobile,
                contact_address: address,
                appointment_time: appointmentTime,
                user_remark: userRemark,
                custom_fields: customFieldsResult,
                contact: contactObj
            };

            const token = localStorage.getItem('ql_recycle_token') || localStorage.getItem('ql_user_token') || '';
            const sep = '/api/order/create'.includes('?') ? '&' : '?';
            const url = '/api/order/create' + sep + (token ? ('token=' + encodeURIComponent(token)) : '');

            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(payload)
            }).then(r => r.json());

            if (res && res.code === 200 && res.data) {
                const orderSn = res.data.order_sn;
                window.closeServiceBookingModal();
                // 直跳收银台结算
                window.location.href = '/cashier.html?order_sn=' + encodeURIComponent(orderSn);
            } else {
                alert(res ? res.msg : '预约下单失败，请重试');
                if (btn) {
                    btn.disabled = false;
                    btn.innerText = '立即预约并支付';
                }
            }
        } catch (e) {
            alert('网络异常，请稍候重试');
            if (btn) {
                btn.disabled = false;
                btn.innerText = '立即预约并支付';
            }
        }
    };

    /**
     * 客户端快速过滤搜索生活服务项目
     */
    function searchServices(keyword = '') {
        const kw = (keyword || '').trim().toLowerCase();
        const cards = document.querySelectorAll('#service-items-grid .service-card');
        if (!cards || cards.length === 0) return;
        cards.forEach(card => {
            const title = (card.querySelector('.service-card-title')?.innerText || '').toLowerCase();
            const desc = (card.querySelector('.service-card-desc')?.innerText || '').toLowerCase();
            const tag = (card.querySelector('.service-cat-tag')?.innerText || '').toLowerCase();
            if (!kw || title.includes(kw) || desc.includes(kw) || tag.includes(kw)) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        });
    }

    // 全局方法挂载
    window.openServiceBookingModal = openServiceBookingModal;
    window.initLifeServices = initLifeServices;
    window.loadServiceItems = loadServiceItems;
    window.searchServices = searchServices;

    /**
     * 快速定位并切换到指定生活服务品类
     */
    window.locateCityServiceCategory = function(targetCatId, catName = '') {
        const section = document.getElementById('section-life-services');
        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        const box = document.getElementById('service-category-pills');
        if (box) {
            let matchedPill = null;
            if (targetCatId) {
                matchedPill = box.querySelector(`.service-cat-pill[data-cat-id="${targetCatId}"]`);
            }
            if (!matchedPill && catName) {
                box.querySelectorAll('.service-cat-pill').forEach(p => {
                    if (p.textContent.includes(catName)) matchedPill = p;
                });
            }
            if (matchedPill) {
                box.querySelectorAll('.service-cat-pill').forEach(p => p.classList.remove('active'));
                matchedPill.classList.add('active');
                currentCategoryId = parseInt(matchedPill.getAttribute('data-cat-id') || 0);
                loadServiceItems(currentCategoryId);
            } else {
                loadServiceItems(targetCatId || 0);
            }
        }
    };

    /**
     * 快速定位到闲置回收专区
     */
    window.locateRecycleCatalog = function() {
        const section = document.getElementById('section-recycle-catalog');
        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // 当页面加载完成时自动初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLifeServices);
    } else {
        initLifeServices();
    }

})(window);
