<?php
/**
 * 启灵同城服务系统 - 文章与单页内容数据模型
 * 负责平台单页、条款协议与帮助指南的数据维护
 */

declare(strict_types=1);

namespace App\Model;

class ArticleModel
{
    private $db;
    private $p;
    private static $tableChecked = false;

    public function __construct()
    {
        $this->db = Database::getInstance();
        $this->p = $this->db->getPrefix();
        $this->ensureTable();
    }

    /**
     * 初始化检测文章单页数据表并预置条款数据
     */
    private function ensureTable(): void
    {
        if (self::$tableChecked) {
            return;
        }
        $cache = \App\Service\CacheService::getInstance();
        if ($cache->get('schema_ensured:article_v1')) {
            self::$tableChecked = true;
            return;
        }
        self::$tableChecked = true;

        try {
            $tables = $this->db->fetchAll("SHOW TABLES LIKE '{$this->p}rc_article'");
            if (empty($tables)) {
                $sql = "CREATE TABLE IF NOT EXISTS `{$this->p}rc_article` (
                    `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '文章ID',
                    `title` varchar(128) NOT NULL DEFAULT '' COMMENT '文章/单页标题',
                    `slug` varchar(64) NOT NULL DEFAULT '' COMMENT '英文别名/唯一标识(如 about, disclaimer, agreement, privacy)',
                    `category` varchar(32) NOT NULL DEFAULT 'guide' COMMENT '分类: legal(法律条款), about(关于平台), guide(回收指南), help(帮助中心)',
                    `summary` varchar(255) NOT NULL DEFAULT '' COMMENT '摘要简述',
                    `content` mediumtext COMMENT '富文本正文HTML',
                    `cover_image` varchar(255) NOT NULL DEFAULT '' COMMENT '封面图URL(可选)',
                    `is_footer` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否在底部展示: 1-是, 0-否',
                    `footer_column` varchar(32) NOT NULL DEFAULT 'guide' COMMENT '底部展示列: guide(回收指南), about(关于平台), legal(条款政策)',
                    `sort_order` int(11) NOT NULL DEFAULT 100 COMMENT '排序权重(越小越靠前)',
                    `view_count` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '阅读浏览量',
                    `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT '状态: 1-已发布, 0-草稿/隐藏',
                    `created_at` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '创建时间',
                    `updated_at` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '更新时间',
                    PRIMARY KEY (`id`),
                    UNIQUE KEY `idx_slug` (`slug`),
                    KEY `idx_cat_status` (`category`, `status`, `sort_order`),
                    KEY `idx_footer` (`is_footer`, `footer_column`, `sort_order`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文章与单页内容管理表'";
                $this->db->execute($sql);

                // 预置 6 篇官方高水准开箱即用核心协议与指南
                $now = time();
                $articles = $this->getDefaultSeedArticles();
                foreach ($articles as $art) {
                    $insertSql = "INSERT INTO `{$this->p}rc_article` 
                        (`title`, `slug`, `category`, `summary`, `content`, `is_footer`, `footer_column`, `sort_order`, `status`, `created_at`, `updated_at`) VALUES 
                        (:title, :slug, :category, :summary, :content, :is_footer, :footer_column, :sort_order, 1, {$now}, {$now})";
                    $this->db->execute($insertSql, [
                        ':title'         => $art['title'],
                        ':slug'          => $art['slug'],
                        ':category'      => $art['category'],
                        ':summary'       => $art['summary'],
                        ':content'       => $art['content'],
                        ':is_footer'     => $art['is_footer'],
                        ':footer_column' => $art['footer_column'],
                        ':sort_order'    => $art['sort_order'],
                    ]);
                }
            }

            // 确保官方公告初始化数据就绪 (若尚无公告则自动植入开箱即用官方公告)
            $noticeCount = (int)$this->db->fetchColumn("SELECT COUNT(*) FROM `{$this->p}rc_article` WHERE `category` = 'notice'");
            if ($noticeCount === 0) {
                $now = time();
                $defaultNotices = [
                    [
                        'title'      => '🎉 启灵同城服务与专业数码回收双通道正式上线运营',
                        'slug'       => 'notice-launch-welcome',
                        'category'   => 'notice',
                        'summary'    => '开启同城上门生活服务与专业数码回收双通道，实名持证师傅准时上门，官方权威质检验机当天极速打款。',
                        'content'    => '<p>尊敬的广大用户与合作伙伴：</p><p>为了给广大客户提供更加透明、高效、安心的一站式便民与闲置物资流转服务，<strong>启灵同城生活服务综合平台</strong>已正式上线！</p><p>平台业务涵盖：</p><ul><li><strong>专业数码物资回收</strong>：手机、平板、笔记本、摄影器材、黄金珠宝与大家电，支持顺丰免费上门包邮取件与官方验机秒级打款。</li><li><strong>同城便民上门生活服务</strong>：深度保洁、家电拆洗、管道疏通、开锁换锁及同城跑腿帮办。</li></ul><p>平台所有服务人员均经过严格实名背景核验与技能考核，全流程价格透明无隐形加价。感谢您的信赖与支持！</p>',
                        'sort_order' => 10,
                    ],
                    [
                        'title'      => '📢 关于服务人员佩戴统一工牌与严禁私下交易的安全提醒公告',
                        'slug'       => 'notice-safety-standard',
                        'category'   => 'notice',
                        'summary'    => '为保障客户人身与财产安全，平台师傅上门均需出示实名工牌，严禁任何形式的脱离平台私下交易。',
                        'content'    => '<p>尊敬的客户：</p><p>为保障您的合法权益与人身财产安全，平台提醒您：</p><ol><li>平台师傅上门前均已由系统派单分配，请在师傅到达时核对订单详情中的师傅姓名与联系电话。</li><li>平台严禁师傅索取额外小费或引导用户脱离平台进行私下转账，一切服务与核销请以系统平台订单为准。</li><li>若遇到任何服务纠纷或异常情况，请随时致电平台客服或在用户中心提交反馈。</li></ol>',
                        'sort_order' => 20,
                    ]
                ];
                foreach ($defaultNotices as $n) {
                    $this->db->execute(
                        "INSERT INTO `{$this->p}rc_article` (`title`, `slug`, `category`, `summary`, `content`, `is_footer`, `footer_column`, `sort_order`, `status`, `created_at`, `updated_at`) VALUES (:title, :slug, :category, :summary, :content, 0, 'guide', :sort_order, 1, {$now}, {$now})",
                        [
                            ':title'      => $n['title'],
                            ':slug'       => $n['slug'],
                            ':category'   => $n['category'],
                            ':summary'    => $n['summary'],
                            ':content'    => $n['content'],
                            ':sort_order' => $n['sort_order'],
                        ]
                    );
                }
            }
            $cache->set('schema_ensured:article_v1', 1, 86400 * 30);
        } catch (\Throwable $e) {
            // 静默安全捕获
        }
    }

    /**
     * 获取系统预置的 6 篇核心条款协议与官方指南
     */
    private function getDefaultSeedArticles(): array
    {
        return [
                    [
                        'title'         => '免责声明',
                        'slug'          => 'disclaimer',
                        'category'      => 'legal',
                        'summary'       => '关于回收市场行情波动、物品权属合法性核验、山寨防盗机与物流不可抗力免责条款说明。',
                        'is_footer'     => 1,
                        'footer_column' => 'legal',
                        'sort_order'    => 10,
                        'content'       => '<h3>一、 物品来源合法性与权属承诺</h3>
<p>用户在启灵同城服务平台提交任何二手设备或闲置物资回收订单前，必须保证交售物品拥有完整、合法的处分权与所有权，严禁交售任何通过盗窃、抢劫、诈骗、走私等非法途径获取的赃物。若经质检或公安机关核查属于涉案物品，平台有权直接扣押设备、冻结订单并移交司法机关追究刑事责任。</p>

<h3>二、 回收价格与市场行情波动免责</h3>
<p>二手回收行业价格受上游元器件行情、供应链变动及市场供需影响。平台系统估价基于智能估价算法与用户当前自选属性即时生成，且提供最长7天的保价锁定期。若因用户在保价期外寄出、实际机况与勾选严重不符（如存在进水、暗病、非原装拆修或扩容等情况），质检工程师将出具权威复检报告并给出复检报价。若用户不同意二次报价，可随时申请原件无条件退回（顺丰包邮退回或按平台规则执行）。</p>

<h3>三、 山寨高仿与防盗网络锁机</h3>
<p>对于存在“山寨机”、“高仿假货”、“激活锁/查找锁未退出”、“有运营商合约监管锁/企业配置锁”的设备，由于无法进行正常系统抹除与合法流转，平台将无法受理回收，相关往返运费需由寄件方全额自行承担。</p>

<h3>四、 物流承运与不可抗力</h3>
<p>平台指定顺丰速运为寄送回收履约方，所有寄送快件均享受全程物流保价服务。因自然灾害、突发交通管制、极端恶劣天气等不可抗力因素造成的物流时效延迟，平台与物流承运方将协助积极协调，但不承担超出快件保价范围之外的间接损失。</p>'
                    ],
                    [
                        'title'         => '用户服务协议',
                        'slug'          => 'agreement',
                        'category'      => 'legal',
                        'summary'       => '启灵同城服务平台与交售用户之间的权利义务、订单生成、履约交割与货款结算约定。',
                        'is_footer'     => 1,
                        'footer_column' => 'legal',
                        'sort_order'    => 20,
                        'content'       => '<h3>一、 协议生效与适用范围</h3>
<p>欢迎使用启灵同城服务平台。当您勾选本协议并点击“提交订单”或“立即估价”时，即表示您已充分阅读、理解并自愿接受本协议全部条款约束。</p>

<h3>二、 预约交割与履约方式</h3>
<p>1. <strong>免费上门服务</strong>：在已开通上门覆盖的城市区域，官方质检工程师将按照您预约的时间准时上门，当面验机过磅、现场出具报告并秒级放款结清。</p>
<p>2. <strong>顺丰快速寄送</strong>：下单后系统自动为您预约顺丰小哥上门取件，顺丰运费按平台补贴政策统一结算，运单轨迹实时同步更新。</p>
<p>3. <strong>线下门店自送</strong>：您亦可携带物品前往本平台直营或合作门店交投，现场人工验货立等结算。</p>

<h3>三、 质检与结算规则</h3>
<p>平台承诺收货后24小时内由专业质检中心完成全方位复核。质检过程全程录像存证，确保公正透明。复检结果与初评一致的，系统立即通过您指定的收款方式（支付宝/微信/银行卡）极速打款；若存在成色差异，经您在用户中心确认后打款。</p>'
                    ],
                    [
                        'title'         => '隐私保护政策',
                        'slug'          => 'privacy',
                        'category'      => 'legal',
                        'summary'       => '平台严格遵守法律法规，采用专业底层数据清除技术保障用户隐私安全。',
                        'is_footer'     => 1,
                        'footer_column' => 'legal',
                        'sort_order'    => 30,
                        'content'       => '<h3>一、 个人隐私数据清除保障</h3>
<p>启灵同城服务高度重视用户的个人隐私与数据安全。所有成交入库的手机、平板、电脑等存储设备，均采用专业数据清除技术进行全盘覆写清除，确保照片、聊天记录、账号密码等个人信息彻底清除，杜绝数据泄露风险。</p>

<h3>二、 个人信息收集与最小化原则</h3>
<p>我们仅收集您在下单时必要的基础信息（如姓名、联系电话、取件地址与收款账号），用于物流预约与货款自动结算。我们承诺不会将您的个人隐私信息向任何第三方商业机构或广告商出售、转让或出租。</p>'
                    ],
                    [
                        'title'         => '关于我们',
                        'slug'          => 'about',
                        'category'      => 'about',
                        'summary'       => '启灵同城服务平台介绍，绿色循环倡导者与官方直营承诺。',
                        'is_footer'     => 1,
                        'footer_column' => 'about',
                        'sort_order'    => 10,
                        'content'       => '<h3>平台简介</h3>
<p>启灵同城服务是国内领先的全品类数字化循环经济回收服务平台，业务涵盖智能手机、数码3C、废旧金属、家电重货、再生资源与奢侈名表黄金等多个行业品类。平台以“让闲置变资产，让绿色成习惯”为企业使命，通过自研的智能估价算法、透明质检体系与极速秒级放款链路，为广大个人用户和企业客户提供专业、安心、高价的回收服务。</p>

<h3>核心服务保障</h3>
<p>1. <strong>官方直营质检</strong>：杜绝中间商层层压价，自主运营标准化质检中心与工程师团队；</p>
<p>2. <strong>全国顺丰包邮</strong>：携手顺丰速运深度 API 直连，上门取件、全程保价、运费补贴；</p>
<p>3. <strong>隐私安全保障</strong>：专业数据清除，确保个人信息不残留；</p>
<p>4. <strong>确认极速放款</strong>：质检确认无误后，微信零钱/支付宝/银行卡自动秒级放款到账。</p>'
                    ],
                    [
                        'title'         => '顺丰包邮与寄送指南',
                        'slug'          => 'sf-guide',
                        'category'      => 'guide',
                        'summary'       => '顺丰快速寄送交割全流程说明：小哥上门取件、设备安全打包与运费补贴规则。',
                        'is_footer'     => 1,
                        'footer_column' => 'guide',
                        'sort_order'    => 10,
                        'content'       => '<h3>一、 顺丰小哥上门取件流程</h3>
<p>1. <strong>在线下单预约</strong>：在前台选择“快速寄送”提交订单后，系统将自动通过顺丰丰桥 API 将订单指派给您所在辖区的顺丰小哥；</p>
<p>2. <strong>小哥联系取件</strong>：顺丰小哥将在半小时内与您电话确认上门取件时间；</p>
<p>3. <strong>专用包装密封</strong>：小哥将自带顺丰专业防震气泡袋与安全封条，现场完成称重密封封箱。</p>

<h3>二、 寄送前的重要准备工作</h3>
<p>1. <strong>退出账号密码与锁机码</strong>：请务必退出 Apple ID / 华为账号 / 小米账号 / 锁屏密码；</p>
<p>2. <strong>自行备份重要资料</strong>：平台质检入库后将对设备进行专业数据清除，请提前在电脑或云端做好重要数据备份；</p>
<p>3. <strong>原装配件随箱附赠</strong>：若有原装包装盒、充电器等配件，请一并随箱寄出以获得更高质检溢价。</p>'
                    ],
                    [
                        'title'         => '质检评级与放款细则',
                        'slug'          => 'quality-payout',
                        'category'      => 'guide',
                        'summary'       => '全透明质检定级标准、无拆修判定与确认后极速秒级放款到账机制。',
                        'is_footer'     => 1,
                        'footer_column' => 'guide',
                        'sort_order'    => 20,
                        'content'       => '<h3>一、 专业质检流程与录像存证</h3>
<p>仓库收货签收后，由质检中心在专业防静电无尘工作台进行全面功能测试，开箱验机与检测全程高清录像存证。检测范围包括但不限于：屏幕显示触控、电池健康寿命、摄像头变焦防抖、主板芯片有无进水受潮、外壳边框划痕磕碰等40余项精密检测指标。</p>

<h3>二、 秒级极速放款规则</h3>
<p>1. 复检机况与用户初评一致的，系统自动秒级打款；</p>
<p>2. 若成色存在轻微出入，工程师出具包含实拍高清图文的质检报告，并在用户个人中心推送协商确认；</p>
<p>3. 用户点击【确认成交】后，资金通过支付宝单笔转账或微信支付商家转账即刻到达您的个人钱包。</p>'
                    ]
                ];
    }

    /**
     * 获取文章单页列表 (支持后台全量与前台已发布过滤)
     */
    public function getAllArticles(bool $activeOnly = false, string $keyword = '', string $category = ''): array
    {
        $where = [];
        $params = [];

        if ($activeOnly) {
            $where[] = "`status` = 1";
        }

        if ($category !== '' && $category !== 'all') {
            $where[] = "`category` = :category";
            $params[':category'] = $category;
        }

        if ($keyword !== '') {
            $where[] = "(`title` LIKE :kw OR `slug` LIKE :kw OR `summary` LIKE :kw)";
            $params[':kw'] = '%' . $keyword . '%';
        }

        $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';
        $sql = "SELECT `id`, `title`, `slug`, `category`, `summary`, `cover_image`, `is_footer`, `footer_column`, `sort_order`, `view_count`, `status`, `created_at`, `updated_at`
                FROM `{$this->p}rc_article`
                {$whereClause}
                ORDER BY `sort_order` ASC, `id` ASC";

        return $this->db->fetchAll($sql, $params);
    }

    /**
     * 获取单篇文章详情 (通过 ID)
     */
    public function getArticleById(int $id): ?array
    {
        $sql = "SELECT * FROM `{$this->p}rc_article` WHERE `id` = :id LIMIT 1";
        $row = $this->db->fetchOne($sql, [':id' => $id]);
        return $row ?: null;
    }

    /**
     * 获取单篇文章详情 (通过 Slug)
     */
    public function getArticleBySlug(string $slug): ?array
    {
        $sql = "SELECT * FROM `{$this->p}rc_article` WHERE `slug` = :slug LIMIT 1";
        $row = $this->db->fetchOne($sql, [':slug' => $slug]);
        return $row ?: null;
    }

    /**
     * 获取底部按列分组展示的文章清单 (前台专用)
     */
    public function getFooterArticlesGrouped(): array
    {
        $sql = "SELECT `id`, `title`, `slug`, `category`, `footer_column`, `sort_order`
                FROM `{$this->p}rc_article`
                WHERE `status` = 1 AND `is_footer` = 1
                ORDER BY `sort_order` ASC, `id` ASC";
        $rows = $this->db->fetchAll($sql);

        $grouped = [
            'guide' => [],
            'about' => [],
            'legal' => [],
            'all'   => [],
        ];

        foreach ($rows as $r) {
            $item = [
                'id'         => (int)$r['id'],
                'title'      => $r['title'],
                'slug'       => $r['slug'],
                'category'   => $r['category'],
                'sort_order' => (int)$r['sort_order'],
            ];
            $col = $r['footer_column'] ?: 'guide';
            if (!isset($grouped[$col])) {
                $grouped[$col] = [];
            }
            $grouped[$col][] = $item;
            $grouped['all'][] = $item;
        }

        return $grouped;
    }

    /**
     * 获取最新官方有效公告列表 (用于前台广播跑马灯与小程序轮播)
     */
    public function getNotices(int $limit = 10): array
    {
        $limit = max(1, min(50, $limit));
        $sql = "SELECT `id`, `title`, `slug`, `category`, `summary`, `content`, `view_count`, `created_at`
                FROM `{$this->p}rc_article`
                WHERE `category` = 'notice' AND `status` = 1
                ORDER BY `sort_order` ASC, `id` DESC
                LIMIT {$limit}";
        $rows = $this->db->fetchAll($sql);
        return $rows ?: [];
    }

    /**
     * 保存文章 (新增或更新)
     */
    public function saveArticle(array $data): int
    {
        $id = (int)($data['id'] ?? 0);
        $title = trim($data['title'] ?? '');
        $slug = trim($data['slug'] ?? '');
        $category = trim($data['category'] ?? 'guide');
        $summary = trim($data['summary'] ?? '');
        $content = $data['content'] ?? '';
        $coverImage = trim($data['cover_image'] ?? '');
        $isFooter = (int)($data['is_footer'] ?? 1);
        $footerColumn = trim($data['footer_column'] ?? 'guide');
        $sortOrder = (int)($data['sort_order'] ?? 100);
        $status = (int)($data['status'] ?? 1);
        $now = time();

        if ($slug === '') {
            $slug = 'art_' . time() . '_' . mt_rand(100, 999);
        }

        if ($id > 0) {
            $sql = "UPDATE `{$this->p}rc_article` SET 
                `title` = :title,
                `slug` = :slug,
                `category` = :category,
                `summary` = :summary,
                `content` = :content,
                `cover_image` = :cover_image,
                `is_footer` = :is_footer,
                `footer_column` = :footer_column,
                `sort_order` = :sort_order,
                `status` = :status,
                `updated_at` = :updated_at
                WHERE `id` = :id";
            $this->db->execute($sql, [
                ':title'         => $title,
                ':slug'          => $slug,
                ':category'      => $category,
                ':summary'       => $summary,
                ':content'       => $content,
                ':cover_image'   => $coverImage,
                ':is_footer'     => $isFooter,
                ':footer_column' => $footerColumn,
                ':sort_order'    => $sortOrder,
                ':status'        => $status,
                ':updated_at'    => $now,
                ':id'            => $id,
            ]);
            return $id;
        } else {
            $sql = "INSERT INTO `{$this->p}rc_article` 
                (`title`, `slug`, `category`, `summary`, `content`, `cover_image`, `is_footer`, `footer_column`, `sort_order`, `view_count`, `status`, `created_at`, `updated_at`) VALUES 
                (:title, :slug, :category, :summary, :content, :cover_image, :is_footer, :footer_column, :sort_order, 0, :status, :created_at, :updated_at)";
            $this->db->execute($sql, [
                ':title'         => $title,
                ':slug'          => $slug,
                ':category'      => $category,
                ':summary'       => $summary,
                ':content'       => $content,
                ':cover_image'   => $coverImage,
                ':is_footer'     => $isFooter,
                ':footer_column' => $footerColumn,
                ':sort_order'    => $sortOrder,
                ':status'        => $status,
                ':created_at'    => $now,
                ':updated_at'    => $now,
            ]);
            return (int)$this->db->lastInsertId();
        }
    }

    /**
     * 删除文章
     */
    public function deleteArticle(int $id): bool
    {
        $sql = "DELETE FROM `{$this->p}rc_article` WHERE `id` = :id";
        return $this->db->execute($sql, [':id' => $id]) > 0;
    }

    /**
     * 浏览量自增
     */
    public function incrementViewCount(int $id): void
    {
        $sql = "UPDATE `{$this->p}rc_article` SET `view_count` = `view_count` + 1 WHERE `id` = :id";
        $this->db->execute($sql, [':id' => $id]);
    }
}
