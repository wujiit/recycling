/**
 * 启灵同城服务系统 - 数据库状态与健康体检视图
 * 包含数据表存储引擎与容量查看、核心表字段完整性检查与优化
 */
(function (window) {
    'use strict';

    const SysUI = window.SysUI;
    const api = window.adminApi || window.api;
    const escapeHtml = window.escapeHtml || function(s) { return s; };

    // ==========================================
    // 业务功能与数据表归属全景图谱元数据
    // ==========================================
    const FEATURE_GROUPS = [
        {
            key: 'config',
            title: '系统全局控制与界面装修',
            badge: '全局与装修',
            icon: '⚙️',
            themeColor: '#2563eb',
            themeBg: '#eff6ff',
            borderColor: '#bfdbfe',
            desc: '负责全系统参数存储、首页装修配置、导航路由以及接口配置。',
            tables: [
                {
                    table: 'sys_config',
                    name: '系统全局配置与行业参数表',
                    features: [
                        '首页底部 FAQ 常见问答模块 (问答列表 home_faq_list、主副标题与启停控制)',
                        '首页 3 步极速服务流程自定义 (大标题、副标题、3个步骤的标题与详细说明 home_process_*)',
                        '首页首屏模式切换 (极速搜索流 / 品牌画卷轮播流 hero_mode)',
                        '热门搜索词 (Hot Tags) 与核心服务保障指标 (Metrics)',
                        '前台多级树形自定义导航菜单 (site_nav_menu)',
                        '微信小程序与移动端专属装修 (主题色、标语、关于我们、隐私说明)',
                        '第三方支付/短信 API 凭据 (微信商户密钥/证书、短信网关等)',
                        '财务资金结算二级独立安全出纳密码哈希 (防越权打款保护)'
                    ],
                    storageDesc: '系统参数表，支持 Redis 与文件缓存。'
                }
            ]
        },
        {
            key: 'catalog',
            title: '回收品类与机型行情模型',
            badge: '品类与行情',
            icon: '📱',
            themeColor: '#0284c7',
            themeBg: '#f0f9ff',
            borderColor: '#bae6fd',
            desc: '覆盖全行业业务大类、品牌规格、具体商品机型库与基准回收指导价。',
            tables: [
                {
                    table: 'rc_category',
                    name: '回收行业大类主表',
                    features: [
                        '多行业业务品类 (手机数码、废旧物资、二奢名表、贵金属、新能源电池等)',
                        '行业计量单位定义 (台、公斤、吨、克、件、辆等)',
                        '品类前台展示状态与多端导航联动'
                    ],
                    storageDesc: '品类基础主数据，支撑全平台跨行业模板切换。'
                },
                {
                    table: 'rc_brand',
                    name: '品牌与规格划分表',
                    features: [
                        '品类下属品牌 (苹果 Apple、华为 Huawei、小米、劳力士等)',
                        'A-Z 拼音首字母快速检索索引',
                        '品牌 LOGO 图标与规格分类'
                    ],
                    storageDesc: '二级品牌归属维度表，带拼音索引优化。'
                },
                {
                    table: 'rc_device',
                    name: '回收商品与机型行情库',
                    features: [
                        '具体商品与型号全称 (如 iPhone 15 Pro Max)',
                        '官方基准指导回收底价 (全网行情估价算法基准)',
                        '商品封面图展示、是否首页热门推荐 (is_hot)',
                        '上下架状态控制 (status)'
                    ],
                    storageDesc: '高频读写行情表，复合索引覆盖搜索与品类筛选。'
                }
            ]
        },
        {
            key: 'appraisal',
            title: '质检评估维度与成色选项',
            badge: '评估与成色',
            icon: '📋',
            themeColor: '#7c3aed',
            themeBg: '#f5f3ff',
            borderColor: '#ddd6fe',
            desc: '设置质检评估选项与成色扣减规则，支持用户在线快速估价。',
            tables: [
                {
                    table: 'rc_question',
                    name: '质检评估维度题目表',
                    features: [
                        '评估维度题目 (存储容量、机身外观、屏幕显示、功能状态等)',
                        '支持品类通用题目 或 单个机型专属定制题目 (device_id 关联联动)',
                        '答题步骤排版与引导权重'
                    ],
                    storageDesc: '题目维度表，支撑动态多步骤估价问卷。'
                },
                {
                    table: 'rc_question_item',
                    name: '质检成色扣减选项表',
                    features: [
                        '具体成色选项 (完好无划痕、微小划痕、严重磕碰碎裂等)',
                        '固定金额扣减 (fixed) 或 百分比加减规则',
                        '成色参考实拍图示 (image)，前台直观参照，避免争端'
                    ],
                    storageDesc: '选项金额明细表，前台秒级计算总预估回收价。'
                }
            ]
        },
        {
            key: 'order',
            title: '业务订单、履约交割与网点',
            badge: '订单与履约',
            icon: '📦',
            themeColor: '#d97706',
            themeBg: '#fffbeb',
            borderColor: '#fde68a',
            desc: '订单全生命周期流转、履约方式交付、初评证据固化与线下网点。',
            tables: [
                {
                    table: 'rc_order',
                    name: '回收业务订单主表',
                    features: [
                        '全站唯一订单号管理 (order_sn)',
                        '预估回收价、加价券补贴金额与最终质检成交价',
                        '三种履约交付模式: 顺丰包邮寄件 (mail)、上门回收 (home)、到店自送 (store)',
                        '顺丰快递寄件单号与退货单号记录',
                        '订单状态机流转 (待寄出 -> 质检中 -> 待确认 -> 已打款 -> 已完成/已退货)'
                    ],
                    storageDesc: '核心交易大表，状态与单号带唯一索引，事务一致性保证。'
                },
                {
                    table: 'rc_order_detail',
                    name: '用户初评问答快照表',
                    features: [
                        '下单时用户自主勾选的所有题目与成色选项快照',
                        '记录下单当时计算的每项扣减金额数值',
                        '作为质检复核比对与争议调解的原始客观凭证'
                    ],
                    storageDesc: '与订单主表 1:N 级联关联，纯历史快照数据。'
                },
                {
                    table: 'rc_store',
                    name: '线下门店与交投网点表',
                    features: [
                        '直营门店与合作代收网点基础信息',
                        '门店地址、电话、营业时间与乘车自驾交通路线指引',
                        '支持“到店自送”模式下的就近网点选择'
                    ],
                    storageDesc: '地理位置与交割服务网点主数据。'
                }
            ]
        },
        {
            key: 'inspection',
            title: '专业验机质检与复核报告',
            badge: '验机质检',
            icon: '🔍',
            themeColor: '#059669',
            themeBg: '#ecfdf5',
            borderColor: '#a7f3d0',
            desc: '质检工程师工作台、设备唯一序列号、差异对比与图文质检报告出具。',
            tables: [
                {
                    table: 'rc_order_inspection',
                    name: '专业质检复核报告表',
                    features: [
                        '质检员管理员账号绑定与验机工单记录',
                        '设备唯一硬件识别码: 真机 IMEI 码 / 序列号 SN',
                        '真机实拍高清照片图集 (real_photos JSON 存储)',
                        '质检成色与用户初评选项差异比对明细 (diff_items JSON 存储)',
                        '出具图文并茂的《专业质检报告》，供客户查验或一键顺丰退货'
                    ],
                    storageDesc: '与订单 1:1 强绑定，保障交易透明公正。'
                }
            ]
        },
        {
            key: 'payout',
            title: '财务打款出纳与资金结算',
            badge: '财务打款',
            icon: '💰',
            themeColor: '#16a34a',
            themeBg: '#f0fdf4',
            borderColor: '#bbf7d0',
            desc: '记录向用户的每一笔回收资金放款支出，具备高并发幂等防重保障。',
            tables: [
                {
                    table: 'rc_payout_log',
                    name: '资金结算打款安全流水表',
                    features: [
                        '商户唯一打款单据号 (out_bill_no，防并发重复打款幂等保护)',
                        '多渠道打款路由 (微信商家转账到零钱、银行卡转账、线下对公汇款)',
                        '第三方支付平台单号 (transaction_id)',
                        '打款状态跟踪 (转账中、成功放款、失败原因报警回执)'
                    ],
                    storageDesc: '财务核心审计大表，高精度金额 decimal，唯一单号防重锁。'
                }
            ]
        },
        {
            key: 'marketing',
            title: '营销加价券、商业广告与单页',
            badge: '营销广告',
            icon: '🎁',
            themeColor: '#c026d3',
            themeBg: '#fdf4ff',
            borderColor: '#f5d0fe',
            desc: '驱动加价补贴券营销玩法、首页轮播 Banner 广告及法规政策单页展示。',
            tables: [
                {
                    table: 'rc_coupon',
                    name: '回收加价补贴券模板表',
                    features: [
                        '加价补贴券规则 (固定现金加价或比例加价)',
                        '新用户首次登录自动发券规则、限定品类与生效天数设置',
                        '发行总量、已领取量与已核销统计'
                    ],
                    storageDesc: '营销规则库主表。'
                },
                {
                    table: 'rc_user_coupon',
                    name: '用户卡券资产卡包表',
                    features: [
                        '用户个人卡包资产 (未使用、已锁定、已核销、已过期)',
                        '下单绑定加价与锁定状态控制 (防重复用券)',
                        '结算时的实际加价补贴金额 (actual_add_price) 记录'
                    ],
                    storageDesc: '用户资产流水表，记录营销补贴实际支出。'
                },
                {
                    table: 'rc_banner',
                    name: '首页商业轮播大图 Banner 表',
                    features: [
                        'PC 宽屏商业画卷大图与移动端自适应 Banner 图片',
                        '跳转动作路由 (跳指定品类、机型、领券中心、下单页或外部活动链接)',
                        '活动角标与 CTA 按钮文案自定义'
                    ],
                    storageDesc: '首屏视觉广告库，支持多端自适应展示。'
                },
                {
                    table: 'rc_article',
                    name: '帮助中心与法律条款文章表',
                    features: [
                        '官方服务指南、常见答疑与关于我们',
                        '法律合规单页: 《用户协议》、《隐私政策》、《免责声明》',
                        '底部大屏 Mega Footer 自动栏目聚合展示'
                    ],
                    storageDesc: 'HTML 富文本存储，支持 SEO 英文 slug 友好别名。'
                }
            ]
        },
        {
            key: 'user',
            title: '用户会员与管理安全权限',
            badge: '用户权限',
            icon: '👥',
            themeColor: '#475569',
            themeBg: '#f8fafc',
            borderColor: '#cbd5e1',
            desc: '交投客户会员身份、微信快捷授权与后台管理员 RBAC 权限分配。',
            tables: [
                {
                    table: 'rc_user',
                    name: '回收客户与交投会员表',
                    features: [
                        '交投客户基本资料: 手机号码、用户昵称、个人头像',
                        '微信生态账号绑定: 微信 openid 与 unionid',
                        '会员账号正常或封禁状态控制'
                    ],
                    storageDesc: '前端客户主数据表。'
                },
                {
                    table: 'sys_admin',
                    name: '系统管理员与权限账户表',
                    features: [
                        '管理后台登录用户名与密码哈希 (Bcrypt 动态盐值)',
                        'RBAC 角色权限体系 (超级管理员 admin、质检审核员 inspector、财务出纳 finance)',
                        '安全审计: 管理员最后登录时间与最后登录 IP 记录'
                    ],
                    storageDesc: '后台安全核心表，用户名唯一索引。'
                },
                {
                    table: 'sys_admin_log',
                    name: '管理员操作审计与安全日志表',
                    features: [
                        '管理后台敏感操作全程审计 (登录、配置修改、审核质检、状态更新)',
                        '安全溯源记录: 操作人账号、具体行为、操作IP及客户端浏览器 UA',
                        '事后故障排查与合规审计留痕'
                    ],
                    storageDesc: '时间倒序追加日志表，支持快速检索与安全追溯。'
                }
            ]
        },
        {
            key: 'service',
            title: '同城到家生活服务与师傅抢单体系',
            badge: '生活服务',
            icon: '🛠️',
            themeColor: '#ea580c',
            themeBg: '#fff7ed',
            borderColor: '#fed7aa',
            desc: '支撑上门伴宠、家政保洁、家庭维修等高频到家服务，涵盖多规格阶梯定价与师傅抢单流转。',
            tables: [
                {
                    table: 'rc_service_category',
                    name: '同城生活服务分类表',
                    features: [
                        '三大专属生活品类 (上门宠物与伴宠、家政保洁与家电清洗、家庭维修与安装快修)',
                        '所属大板块类型 (service-上门到家, errand-同城跑腿)',
                        '品类专属 Emoji 图标与前台排序权重'
                    ],
                    storageDesc: '到家服务类目主数据表，支撑多行业独立切换与前台横向筛选。'
                },
                {
                    table: 'rc_service_item',
                    name: '生活服务核心项目表',
                    features: [
                        '9款精选服务项目 (遛狗、喂猫、洗宠、油烟机、空调、日常保洁、电路、管道、锁芯)',
                        '起步展示基准价与划线市场原价',
                        '官方保障标签 (如持证宠托师、140℃高温灭菌、修不好不收钱)',
                        '服务须知与多图相册'
                    ],
                    storageDesc: '服务项目基础大表，独立于回收商品表，支持按行业分类检索。'
                },
                {
                    table: 'rc_service_spec',
                    name: '服务多规格与阶梯定价表',
                    features: [
                        '多规格明码标价细则 (如小型犬/中型犬/大型犬遛狗、1匹/2匹空调、2/3/4小时保洁套餐)',
                        '规格独立单价 (spec_price) 与计价单位 (spec_unit)',
                        '默认选中规格设置 (is_default) 与适用场景说明'
                    ],
                    storageDesc: '阶梯定价核心表，驱动弹窗规格点选与订单金额严密核算。'
                },
                {
                    table: 'rc_technician',
                    name: '服务师傅与技师抢单池表',
                    features: [
                        '自营与入驻师傅实名档案 (真实姓名、手机号、身份证、健康证)',
                        '服务工种技能认证 (保洁阿姨、电工师傅、开锁锁匠、持证宠托师)',
                        '在线接单/休息状态切换、地理位置坐标与服务半径',
                        '累计完成单量、客户评分好评率与服务质保金'
                    ],
                    storageDesc: '师傅信息与派单核销数据表。'
                }
            ]
        }
    ];

    async function renderDatabaseView(container) {
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div>
                        <div class="card-title">数据库维护</div>
                        <div style="font-size:12px;color:#64748b;margin-top:4px;">查看数据表运行状态及存储占用</div>
                    </div>
                    <div style="display:flex;gap:10px;">
                        <button class="btn btn-outline" id="btn-db-refresh">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="margin-right:6px;"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0020 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 004 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>
                            刷新
                        </button>
                        <button class="btn btn-primary" id="btn-db-repair">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="margin-right:6px;"><path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/></svg>
                            检查并修复表结构
                        </button>
                        <button class="btn btn-success" id="btn-db-optimize">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="margin-right:6px;"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>
                            优化数据表
                        </button>
                    </div>
                </div>

                <div id="db-health-content">
                    <div style="text-align:center;padding:40px;color:#64748b;">正在深度自检数据库运行状态...</div>
                </div>
            </div>
        `;

        async function loadData() {
            const content = document.getElementById('db-health-content');
            if (!content) return;

            const res = await api.get('/admin/system/dbHealth');
            if (!res || res.code !== 200 || !res.data) {
                content.innerHTML = '<div style="text-align:center;padding:30px;color:#ef4444;">获取数据库健康状态失败，请检查网络</div>';
                return;
            }

            const d = res.data;
            const scoreColor = d.health_score >= 90 ? '#10b981' : (d.health_score >= 70 ? '#f59e0b' : '#ef4444');
            const scoreLabel = d.health_score >= 90 ? '健康极佳' : (d.health_score >= 70 ? '存在隐患' : '亟待修复');

            let checksHtml = '';
            (d.schema_checks || []).forEach(chk => {
                checksHtml += `
                    <tr>
                        <td style="font-weight:600;">${escapeHtml(chk.title)}</td>
                        <td><code>${escapeHtml(chk.table)}.${escapeHtml(chk.column)}</code></td>
                        <td style="color:#64748b;font-size:12px;">${escapeHtml(chk.desc)}</td>
                        <td>
                            ${chk.passed 
                                ? '<span class="badge badge-success">正常 (已具备)</span>' 
                                : '<span class="badge badge-danger">缺失 (需修复)</span>'}
                        </td>
                    </tr>
                `;
            });

            let tablesHtml = '';
            (d.tables || []).forEach(t => {
                tablesHtml += `
                    <tr>
                        <td style="font-weight:600;"><code>${escapeHtml(t.table_name)}</code></td>
                        <td style="color:#475569;">${escapeHtml(t.comment)}</td>
                        <td><span class="badge badge-info">${escapeHtml(t.engine)}</span></td>
                        <td style="font-weight:600;">${Number(t.rows).toLocaleString()}</td>
                        <td>${escapeHtml(t.data_size)}</td>
                        <td>${escapeHtml(t.index_size)}</td>
                        <td style="font-weight:600;color:#1e58ff;">${escapeHtml(t.total_size)}</td>
                        <td style="font-size:12px;color:#64748b;">${escapeHtml(t.collation)}</td>
                    </tr>
                `;
            });

            // 组装业务功能与数据表归属全景板块 HTML
            let featureCardsHtml = FEATURE_GROUPS.map(g => {
                const tablesHtmlGroup = g.tables.map(tbl => {
                    const tStat = (d.tables || []).find(t => t.short_name === tbl.table || t.table_name === (d.table_prefix + tbl.table));
                    const rowCount = tStat ? Number(tStat.rows).toLocaleString() : '0';
                    const totalSize = tStat ? tStat.total_size : '0 KB';
                    return `
                        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;margin-top:10px;">
                            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:6px;">
                                <div style="display:flex;align-items:center;gap:6px;">
                                    <code style="font-weight:700;color:${g.themeColor};background:#ffffff;padding:2px 7px;border-radius:4px;border:1px solid #cbd5e1;font-size:12px;">${escapeHtml(d.table_prefix + tbl.table)}</code>
                                    <strong style="font-size:13px;color:#1e293b;">${escapeHtml(tbl.name)}</strong>
                                </div>
                                <span style="font-size:11px;color:#475569;background:#ffffff;padding:2px 8px;border-radius:12px;border:1px solid #e2e8f0;display:inline-flex;align-items:center;gap:4px;">
                                    <span>📊</span> 记录: <strong style="color:#0f172a;">${rowCount}</strong> 行 · 容量: <strong style="color:${g.themeColor};">${escapeHtml(totalSize)}</strong>
                                </span>
                            </div>
                            
                            <div style="margin-bottom:8px;">
                                <div style="font-size:12px;font-weight:700;color:#334155;margin-bottom:5px;display:flex;align-items:center;gap:4px;">
                                    <span>📌 承载的具体功能与业务场景：</span>
                                </div>
                                <ul style="margin:0;padding-left:18px;font-size:12px;color:#475569;line-height:1.65;">
                                    ${tbl.features.map(f => `<li>${escapeHtml(f)}</li>`).join('')}
                                </ul>
                            </div>
                            
                            <div style="font-size:11px;color:#64748b;background:#ffffff;padding:6px 10px;border-radius:6px;border:1px dashed #cbd5e1;">
                                <strong style="color:#475569;">底层数据模型：</strong>${escapeHtml(tbl.storageDesc)}
                            </div>
                        </div>
                    `;
                }).join('');

                return `
                    <div class="feature-group-card" data-cat="${g.key}" style="background:#ffffff;border:1.5px solid ${g.borderColor};border-radius:10px;padding:18px;box-shadow:0 1px 3px rgba(0,0,0,0.02);display:flex;flex-direction:column;justify-content:space-between;">
                        <div>
                            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:8px;">
                                <div style="display:flex;align-items:center;gap:8px;">
                                    <span style="font-size:20px;">${g.icon}</span>
                                    <strong style="font-size:15px;color:#0f172a;">${escapeHtml(g.title)}</strong>
                                </div>
                                <span class="badge" style="background:${g.themeBg};color:${g.themeColor};font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;border:1px solid ${g.borderColor};">
                                    ${escapeHtml(g.badge)}
                                </span>
                            </div>
                            <p style="font-size:12px;color:#64748b;line-height:1.5;margin:0 0 6px 0;">${escapeHtml(g.desc)}</p>
                            ${tablesHtmlGroup}
                        </div>
                    </div>
                `;
            }).join('');

            content.innerHTML = `
                <!-- 概览指标卡片 -->
                <div class="stat-grid">
                    <div class="stat-card">
                        <div class="stat-icon stat-blue">
                            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 2C6.48 2 2 4.02 2 6.5v11C2 19.98 6.48 22 12 22s10-2.02 10-4.5v-11C22 4.02 17.52 2 12 2zm0 2c4.42 0 8 1.57 8 2.5S16.42 9 12 9s-8-1.57-8-2.5S7.58 4 12 4zm0 16c-4.42 0-8-1.57-8-2.5V17c1.78 1.25 4.7 2 8 2s6.22-.75 8-2v.5c0 .93-3.58 2.5-8 2.5zm0-4.5c-4.42 0-8-1.57-8-2.5V12.5c1.78 1.25 4.7 2 8 2s6.22-.75 8-2v.5c0 .93-3.58 2.5-8 2.5zm0-4.5c-4.42 0-8-1.57-8-2.5V8c1.78 1.25 4.7 2 8 2s6.22-.75 8-2v.5c0 .93-3.58 2.5-8 2.5z"/></svg>
                        </div>
                        <div>
                            <div class="stat-num" style="font-size:18px;">${escapeHtml(d.mysql_version)}</div>
                            <div class="stat-label">MySQL 版本 / 库: ${escapeHtml(d.database_name)}</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon stat-purple">
                            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z"/></svg>
                        </div>
                        <div>
                            <div class="stat-num" style="font-size:20px;">${d.table_count} 表 / ${Number(d.total_rows).toLocaleString()} 行</div>
                            <div class="stat-label">系统业务总数据表与记录条数</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon stat-amber">
                            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg>
                        </div>
                        <div>
                            <div class="stat-num" style="font-size:20px;">${escapeHtml(d.total_size_human)}</div>
                            <div class="stat-label">总占用 (数据: ${escapeHtml(d.data_size_human)} | 索引: ${escapeHtml(d.index_size_human)})</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon" style="background:#ecfdf5;color:${scoreColor};">
                            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                        </div>
                        <div>
                            <div class="stat-num" style="font-size:20px;color:${scoreColor};">${d.health_score} 分 · ${scoreLabel}</div>
                            <div class="stat-label">连接延迟: ${d.latency_ms} ms · 字符集: ${escapeHtml(d.charset)}</div>
                        </div>
                    </div>
                </div>

                <!-- 核心业务字段检查 -->
                <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin-bottom:24px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                        <h4 style="font-size:15px;font-weight:700;color:#0f172a;">核心业务字段检查</h4>
                        <span style="font-size:12px;color:#64748b;">检查系统核心表与关键字段是否完整</span>
                    </div>
                    <table class="table" style="margin-bottom:0;">
                        <thead>
                            <tr>
                                <th>检查项目</th>
                                <th>数据表与字段</th>
                                <th>说明</th>
                                <th>状态</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${checksHtml}
                        </tbody>
                    </table>
                </div>

                <!-- 业务功能与数据表归属全景图解 (全新板块) -->
                <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:22px;margin-bottom:24px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
                        <div>
                            <div style="display:flex;align-items:center;gap:8px;">
                                <span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:8px;background:#eff6ff;color:#2563eb;font-size:15px;">🗺️</span>
                                <h3 style="font-size:16px;font-weight:700;color:#0f172a;margin:0;">系统业务功能与数据表归属全景图</h3>
                            </div>
                            <div style="font-size:13px;color:#64748b;margin-top:4px;">
                                深度解析前后台各项业务功能具体依赖哪些数据表，包含存储形态、核心业务场景及各表的实时运行指标。
                            </div>
                        </div>
                        <div style="width:100%;max-width:320px;">
                            <input type="text" id="db-feature-search" class="form-control" placeholder="🔍 快速搜索功能关键词或表名..." style="font-size:12px;padding:8px 12px;">
                        </div>
                    </div>

                    <!-- 分类快捷筛选标签 Chips -->
                    <div id="db-feature-chips" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px;padding-bottom:14px;border-bottom:1px dashed #e2e8f0;">
                        <button type="button" class="btn btn-sm btn-primary chip-filter-btn" data-cat="all">全部模块 (9大板块 · 22张表)</button>
                        <button type="button" class="btn btn-sm btn-outline chip-filter-btn" data-cat="service">🛠️ 生活服务与师傅</button>
                        <button type="button" class="btn btn-sm btn-outline chip-filter-btn" data-cat="config">⚙️ 全局与装修</button>
                        <button type="button" class="btn btn-sm btn-outline chip-filter-btn" data-cat="catalog">📱 品类与行情</button>
                        <button type="button" class="btn btn-sm btn-outline chip-filter-btn" data-cat="appraisal">📋 估价与成色</button>
                        <button type="button" class="btn btn-sm btn-outline chip-filter-btn" data-cat="order">📦 订单与履约</button>
                        <button type="button" class="btn btn-sm btn-outline chip-filter-btn" data-cat="inspection">🔍 验机与质检</button>
                        <button type="button" class="btn btn-sm btn-outline chip-filter-btn" data-cat="payout">💰 财务与打款</button>
                        <button type="button" class="btn btn-sm btn-outline chip-filter-btn" data-cat="marketing">🎁 营销与广告</button>
                        <button type="button" class="btn btn-sm btn-outline chip-filter-btn" data-cat="user">👥 客户与权限</button>
                    </div>

                    <!-- 功能板块卡片流 -->
                    <div id="db-feature-cards-grid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(360px, 1fr));gap:16px;">
                        ${featureCardsHtml}
                    </div>
                </div>

                <!-- 物理存储底层明细 (DBA技术视图，支持展开/收起) -->
                <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:20px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:10px;">
                        <div>
                            <h4 style="font-size:15px;font-weight:700;color:#0f172a;margin:0;">底层物理存储与引擎明细 (共 ${d.table_count} 张物理表)</h4>
                            <div style="font-size:12px;color:#64748b;margin-top:2px;">全局表前缀：<code>${escapeHtml(d.table_prefix)}</code> · 包含底层存储引擎、物理数据/索引容量与排序规则</div>
                        </div>
                        <button type="button" class="btn btn-sm btn-outline" id="btn-toggle-raw-tables" style="font-size:12px;">
                            收起底层物理表格
                        </button>
                    </div>
                    <div id="raw-tables-wrap" style="display:block;">
                        <table class="table" style="margin-bottom:0;">
                            <thead>
                                <tr>
                                    <th>数据表</th>
                                    <th>说明</th>
                                    <th>引擎</th>
                                    <th>记录数</th>
                                    <th>数据大小</th>
                                    <th>索引大小</th>
                                    <th>总大小</th>
                                    <th>字符集/排序</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tablesHtml}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

            // 搜索过滤与分类筛选交互
            let currentFilterCat = 'all';
            let currentSearchTerm = '';

            function applyFeatureFilters() {
                const cards = content.querySelectorAll('.feature-group-card');
                cards.forEach(card => {
                    const cat = card.getAttribute('data-cat');
                    const text = card.innerText.toLowerCase();
                    const catMatch = (currentFilterCat === 'all' || cat === currentFilterCat);
                    const searchMatch = (!currentSearchTerm || text.includes(currentSearchTerm));
                    if (catMatch && searchMatch) {
                        card.style.display = 'flex';
                    } else {
                        card.style.display = 'none';
                    }
                });
            }

            const searchInp = document.getElementById('db-feature-search');
            searchInp?.addEventListener('input', function() {
                currentSearchTerm = this.value.trim().toLowerCase();
                applyFeatureFilters();
            });

            content.querySelectorAll('.chip-filter-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    content.querySelectorAll('.chip-filter-btn').forEach(b => {
                        b.classList.remove('btn-primary');
                        b.classList.add('btn-outline');
                    });
                    this.classList.remove('btn-outline');
                    this.classList.add('btn-primary');
                    currentFilterCat = this.getAttribute('data-cat');
                    applyFeatureFilters();
                });
            });

            // 折叠/展开底层物理表格
            const btnToggleRaw = document.getElementById('btn-toggle-raw-tables');
            const rawWrap = document.getElementById('raw-tables-wrap');
            btnToggleRaw?.addEventListener('click', function() {
                if (rawWrap.style.display === 'none') {
                    rawWrap.style.display = 'block';
                    this.innerText = '收起底层物理表格';
                } else {
                    rawWrap.style.display = 'none';
                    this.innerText = '展开底层物理表格';
                }
            });
        }

        document.getElementById('btn-db-refresh')?.addEventListener('click', loadData);

        document.getElementById('btn-db-repair')?.addEventListener('click', async function () {
            const confirmed = await SysUI.confirm('确认执行数据表结构深度体检与热修复吗？系统将自动补齐所有缺失字段与数据表，不影响任何既有数据。', {
                title: '数据库体检与修复确认',
                type: 'warning',
                confirmText: '立即体检修复',
                isDanger: false
            });
            if (!confirmed) return;
            const btn = this;
            btn.disabled = true;
            btn.innerText = '正在热修复结构...';
            const res = await api.post('/admin/system/dbRepair', {});
            btn.disabled = false;
            btn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="margin-right:6px;"><path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/></svg>一键体检与字段修复`;
            if (res && res.code === 200) {
                await SysUI.alert(res.data?.message || res.msg || '数据表结构修复成功！系统所有核心字段与约束均已就绪。', {
                    title: '数据库结构体检修复完成',
                    type: 'success',
                    confirmText: '我知道了'
                });
                loadData();
            } else {
                SysUI.toast(res ? res.msg : '修复失败', 'error');
            }
        });

        document.getElementById('btn-db-optimize')?.addEventListener('click', async function () {
            const confirmed = await SysUI.confirm('确认对所有业务数据表执行碎片整理与 OPTIMIZE 优化吗？', {
                title: '数据表碎片优化确认',
                type: 'info',
                confirmText: '开始优化',
                isDanger: false
            });
            if (!confirmed) return;
            const btn = this;
            btn.disabled = true;
            btn.innerText = '正在优化表空间...';
            const res = await api.post('/admin/system/dbOptimize', {});
            btn.disabled = false;
            btn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="margin-right:6px;"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>一键优化表碎片`;
            if (res && res.code === 200) {
                SysUI.toast(`表空间碎片整理已完成！已优化 ${res.data?.optimized_count || 0} 张数据表。`, 'success');
                loadData();
            } else {
                SysUI.toast(res ? res.msg : '优化失败', 'error');
            }
        });

        loadData();
    }

    // ==========================================

    window.renderDatabaseView = renderDatabaseView;
})(window);
