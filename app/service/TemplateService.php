<?php
/**
 * 启灵回收系统 - 多行业业务模板引擎服务
 * 支持全品类综合平台、数码3C、废品再生资源、二手汽车、奢侈品名表与二手大家电模板装载
 */

namespace App\Service;

use App\Model\Database;

class TemplateService
{
    private $db;
    private $p;
    private static $schemaUpgradedChecked = false;

    public function __construct()
    {
        $this->db = Database::getInstance();
        $this->p = $this->db->getPrefix();
        $this->ensureSchemaUpgraded();
    }

    /**
     * 自动热更新数据表结构以支持多模板扩展与核心业务字段
     * 优化：增加静态与持久缓存双重屏障，避免前台每个只读请求重复打满数据库写锁
     *
     * @param bool $force 是否强制重新检测与更新图例
     */
    public function ensureSchemaUpgraded(bool $force = false): void
    {
        if (!$force) {
            if (self::$schemaUpgradedChecked) {
                return;
            }
            $cache = CacheService::getInstance();
            if ($cache->get('sys_schema_upgraded_v3')) {
                self::$schemaUpgradedChecked = true;
                return;
            }
        }
        self::$schemaUpgradedChecked = true;
        try {
            $colDevice = $this->db->fetchOne("SHOW COLUMNS FROM `{$this->p}rc_device` LIKE 'unit'");
            if (!$colDevice) {
                $this->db->execute("ALTER TABLE `{$this->p}rc_device` ADD COLUMN `unit` VARCHAR(32) NOT NULL DEFAULT '台' COMMENT '计价单位'");
            }
            $colCat = $this->db->fetchOne("SHOW COLUMNS FROM `{$this->p}rc_category` LIKE 'unit'");
            if (!$colCat) {
                $this->db->execute("ALTER TABLE `{$this->p}rc_category` ADD COLUMN `unit` VARCHAR(32) NOT NULL DEFAULT '台' COMMENT '品类默认单位'");
            }
            $colQDev = $this->db->fetchOne("SHOW COLUMNS FROM `{$this->p}rc_question` LIKE 'device_id'");
            if (!$colQDev) {
                $this->db->execute("ALTER TABLE `{$this->p}rc_question` ADD COLUMN `device_id` INT(11) UNSIGNED NOT NULL DEFAULT '0' COMMENT '机型或物品ID(0为品类通用)' AFTER `category_id`");
            }
            $colItemImg = $this->db->fetchOne("SHOW COLUMNS FROM `{$this->p}rc_question_item` LIKE 'image'");
            if (!$colItemImg) {
                $this->db->execute("ALTER TABLE `{$this->p}rc_question_item` ADD COLUMN `image` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '选项参考示例图URL' AFTER `desc_text`");
            }
            // 履约交割与结算放款字段兼容升级
            $colFulfill = $this->db->fetchOne("SHOW COLUMNS FROM `{$this->p}rc_order` LIKE 'fulfillment_type'");
            if (!$colFulfill) {
                $this->db->execute("ALTER TABLE `{$this->p}rc_order` ADD COLUMN `fulfillment_type` VARCHAR(32) NOT NULL DEFAULT 'mail' COMMENT '履约模式: mail-邮寄, store-到店, home-上门' AFTER `final_price`");
            }
            $colPayout = $this->db->fetchOne("SHOW COLUMNS FROM `{$this->p}rc_order` LIKE 'payout_type'");
            if (!$colPayout) {
                $this->db->execute("ALTER TABLE `{$this->p}rc_order` ADD COLUMN `payout_type` VARCHAR(32) NOT NULL DEFAULT 'wechat' COMMENT '结算放款方式: wechat-微信, offline-线下对公' AFTER `fulfillment_type`");
            }
            // 机型展示缩略图字段与图例初始化
            $colCover = $this->db->fetchOne("SHOW COLUMNS FROM `{$this->p}rc_device` LIKE 'cover_img'");
            if (!$colCover) {
                $this->db->execute("ALTER TABLE `{$this->p}rc_device` ADD COLUMN `cover_img` VARCHAR(255) NOT NULL DEFAULT '/uploads/default/dev_default.svg' COMMENT '物品展示缩略图' AFTER `name`");
            }
            // 自动为已有空图的历史机型补充专属图例
            $this->db->execute("UPDATE `{$this->p}rc_device` SET `cover_img` = '/uploads/default/phone_15promax.svg' WHERE (`cover_img` = '' OR `cover_img` LIKE '%dev_default.png%') AND `name` LIKE '%iPhone%'");
            $this->db->execute("UPDATE `{$this->p}rc_device` SET `cover_img` = '/uploads/default/phone_mate60.svg' WHERE (`cover_img` = '' OR `cover_img` LIKE '%dev_default.png%') AND `name` LIKE '%Mate%'");
            $this->db->execute("UPDATE `{$this->p}rc_device` SET `cover_img` = '/uploads/default/phone_mi14.svg' WHERE (`cover_img` = '' OR `cover_img` LIKE '%dev_default.png%') AND (`name` LIKE '%小米%' OR `name` LIKE '%Xiaomi%')");
            $this->db->execute("UPDATE `{$this->p}rc_device` SET `cover_img` = '/uploads/default/macbook_pro.svg' WHERE (`cover_img` = '' OR `cover_img` LIKE '%dev_default.png%') AND (`name` LIKE '%MacBook%' OR `name` LIKE '%电脑%')");
            $this->db->execute("UPDATE `{$this->p}rc_device` SET `cover_img` = '/uploads/default/ipad_pro.svg' WHERE (`cover_img` = '' OR `cover_img` LIKE '%dev_default.png%') AND `name` LIKE '%iPad%'");
            $this->db->execute("UPDATE `{$this->p}rc_device` SET `cover_img` = '/uploads/default/sony_a7m4.svg' WHERE (`cover_img` = '' OR `cover_img` LIKE '%dev_default.png%') AND (`name` LIKE '%索尼%' OR `name` LIKE '%相机%')");
            $this->db->execute("UPDATE `{$this->p}rc_device` SET `cover_img` = '/uploads/default/scrap_copper.svg' WHERE (`cover_img` = '' OR `cover_img` LIKE '%dev_default.png%') AND `name` LIKE '%铜%'");
            $this->db->execute("UPDATE `{$this->p}rc_device` SET `cover_img` = '/uploads/default/scrap_aluminum.svg' WHERE (`cover_img` = '' OR `cover_img` LIKE '%dev_default.png%') AND `name` LIKE '%铝%'");
            $this->db->execute("UPDATE `{$this->p}rc_device` SET `cover_img` = '/uploads/default/scrap_steel.svg' WHERE (`cover_img` = '' OR `cover_img` LIKE '%dev_default.png%') AND `name` LIKE '%钢%'");
            $this->db->execute("UPDATE `{$this->p}rc_device` SET `cover_img` = '/uploads/default/scrap_battery.svg' WHERE (`cover_img` = '' OR `cover_img` LIKE '%dev_default.png%') AND `name` LIKE '%电瓶%'");
            $this->db->execute("UPDATE `{$this->p}rc_device` SET `cover_img` = '/uploads/default/scrap_paper.svg' WHERE (`cover_img` = '' OR `cover_img` LIKE '%dev_default.png%') AND `name` LIKE '%纸%'");
            $this->db->execute("UPDATE `{$this->p}rc_device` SET `cover_img` = '/uploads/default/car_corolla.svg' WHERE (`cover_img` = '' OR `cover_img` LIKE '%dev_default.png%') AND (`name` LIKE '%卡罗拉%' OR `name` LIKE '%宝马%')");
            $this->db->execute("UPDATE `{$this->p}rc_device` SET `cover_img` = '/uploads/default/car_tesla.svg' WHERE (`cover_img` = '' OR `cover_img` LIKE '%dev_default.png%') AND (`name` LIKE '%特斯拉%' OR `name` LIKE '%比亚迪%')");
            $this->db->execute("UPDATE `{$this->p}rc_device` SET `cover_img` = '/uploads/default/car_scrap.svg' WHERE (`cover_img` = '' OR `cover_img` LIKE '%dev_default.png%') AND `name` LIKE '%报废%'");
            $this->db->execute("UPDATE `{$this->p}rc_device` SET `cover_img` = '/uploads/default/watch_rolex.svg' WHERE (`cover_img` = '' OR `cover_img` LIKE '%dev_default.png%') AND (`name` LIKE '%劳力士%' OR `name` LIKE '%表%')");
            $this->db->execute("UPDATE `{$this->p}rc_device` SET `cover_img` = '/uploads/default/luxury_gold.svg' WHERE (`cover_img` = '' OR `cover_img` LIKE '%dev_default.png%') AND `name` LIKE '%金%'");
            $this->db->execute("UPDATE `{$this->p}rc_device` SET `cover_img` = '/uploads/default/appliance_ac.svg' WHERE (`cover_img` = '' OR `cover_img` LIKE '%dev_default.png%') AND `name` LIKE '%空调%'");
            $this->db->execute("UPDATE `{$this->p}rc_device` SET `cover_img` = '/uploads/default/appliance_fridge.svg' WHERE (`cover_img` = '' OR `cover_img` LIKE '%dev_default.png%') AND `name` LIKE '%冰箱%'");
            $this->db->execute("UPDATE `{$this->p}rc_device` SET `cover_img` = '/uploads/default/appliance_washer.svg' WHERE (`cover_img` = '' OR `cover_img` LIKE '%dev_default.png%') AND `name` LIKE '%洗衣机%'");
            $this->db->execute("UPDATE `{$this->p}rc_device` SET `cover_img` = '/uploads/default/appliance_tv.svg' WHERE (`cover_img` = '' OR `cover_img` LIKE '%dev_default.png%') AND `name` LIKE '%电视%'");
            $this->db->execute("UPDATE `{$this->p}rc_device` SET `cover_img` = '/uploads/default/dev_default.svg' WHERE `cover_img` = '' OR `cover_img` LIKE '%dev_default.png%'");

            // 首页轮播 Banner 广告表自动热升级
            $checkBanner = $this->db->fetchOne("SHOW TABLES LIKE '{$this->p}rc_banner'");
            if (!$checkBanner) {
                $this->db->execute("CREATE TABLE IF NOT EXISTS `{$this->p}rc_banner` (
                  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Banner ID',
                  `title` varchar(128) NOT NULL DEFAULT '' COMMENT 'Banner大标题',
                  `subtitle` varchar(255) NOT NULL DEFAULT '' COMMENT 'Banner副标题/描述',
                  `badge` varchar(64) NOT NULL DEFAULT '' COMMENT '活动小角标',
                  `image_pc` varchar(255) NOT NULL DEFAULT '' COMMENT 'PC端宽屏画卷图URL',
                  `image_m` varchar(255) NOT NULL DEFAULT '' COMMENT '移动端图URL',
                  `link_type` varchar(32) NOT NULL DEFAULT 'none' COMMENT '跳转类型: category, device, action, url, none',
                  `link_value` varchar(255) NOT NULL DEFAULT '' COMMENT '跳转目标值',
                  `link_miniapp` varchar(255) NOT NULL DEFAULT '' COMMENT '小程序端专属页面路径/行为(可选)',
                  `btn_text` varchar(64) NOT NULL DEFAULT '立即查看' COMMENT 'CTA按钮文案',
                  `sort_order` int(11) NOT NULL DEFAULT '100' COMMENT '排序权重',
                  `status` tinyint(1) NOT NULL DEFAULT '1' COMMENT '状态: 1-启用, 0-禁用',
                  `created_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '创建时间',
                  `updated_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '更新时间',
                  PRIMARY KEY (`id`),
                  KEY `idx_status_sort` (`status`, `sort_order`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='首页轮播Banner广告表'");

                $nowTime = time();
                $this->db->execute("INSERT INTO `{$this->p}rc_banner` (`title`, `subtitle`, `badge`, `image_pc`, `image_m`, `link_type`, `link_value`, `link_miniapp`, `btn_text`, `sort_order`, `status`, `created_at`, `updated_at`) VALUES 
                ('全品类高价回收 · 官方直营更放心', '官方报价标准 · 顺丰免费上门 · 隐私安全保障', '官方保障', '/uploads/default/banner_digital.svg', '/uploads/default/banner_digital.svg', 'category', '1', '/pages/category/index', '立即估价', 10, 1, {$nowTime}, {$nowTime}),
                ('废旧物资再生 · 绿色循环倡导者', '废铜废铝废钢 · 电缆电线 · 动力电池 · 上门过磅结算', '环保再生', '/uploads/default/banner_scrap.svg', '/uploads/default/banner_scrap.svg', 'action', 'appointment', '/pages/order/index', '一键呼叫上门', 20, 1, {$nowTime}, {$nowTime}),
                ('名表黄金奢侈品 · 权威鉴定高额变现', '足金999按日实时结算 · 瑞士名表大牌箱包 · 顺丰保价密封', '尊享质检', '/uploads/default/banner_luxury.svg', '/uploads/default/banner_luxury.svg', 'category', '4', '/pages/category/index', '实时金价换算', 30, 1, {$nowTime}, {$nowTime})");
            }

            // 文章单页与条款政策表自动热升级自愈
            $checkArticle = $this->db->fetchOne("SHOW TABLES LIKE '{$this->p}rc_article'");
            if (!$checkArticle) {
                try {
                    new \App\Model\ArticleModel();
                } catch (\Throwable $e) {
                    // 静默容错
                }
            }

            // 回收加价补贴券与用户卡包营销表自动热升级自愈
            $checkCoupon = $this->db->fetchOne("SHOW TABLES LIKE '{$this->p}rc_coupon'");
            if (!$checkCoupon) {
                try {
                    new \App\Model\CouponModel();
                } catch (\Throwable $e) {
                    // 静默容错
                }
            }

            // 首屏全量配置默认自愈
            $defaultHeroConfigs = [
                'hero_mode'                     => 'search',
                'hero_badge_enabled'            => '1',
                'hero_badge_text'               => '官方自营 · 顺丰免费上门 · 10秒快速估价 · 秒级放款到账',
                'hero_title'                    => '全品类高价回收 · 10秒快速估价',
                'hero_subtitle'                 => '官方报价标准 · 顺丰免费上门 · 隐私安全保障',
                'hero_search_btn_text'          => '立即估价',
                'hero_hot_tags'                 => json_encode([
                    ['label' => 'iPhone 15 Pro', 'keyword' => 'iPhone 15 Pro'],
                    ['label' => 'Mate 60 Pro', 'keyword' => 'Mate 60 Pro'],
                    ['label' => '小米 14', 'keyword' => '小米14'],
                    ['label' => 'MacBook Pro', 'keyword' => 'MacBook'],
                    ['label' => 'iPad Pro', 'keyword' => 'iPad']
                ], JSON_UNESCAPED_UNICODE),
                'hero_metrics'                  => json_encode([
                    ['icon' => 'bag', 'val' => '120万+', 'lbl' => '累计完成回收'],
                    ['icon' => 'clock', 'val' => '10秒', 'lbl' => '快速精准估价'],
                    ['icon' => 'truck', 'val' => '0元', 'lbl' => '顺丰双向保价包邮'],
                    ['icon' => 'shield', 'val' => '100%', 'lbl' => '隐私安全清除']
                ], JSON_UNESCAPED_UNICODE),
                'hero_banner_autoplay'          => '4',
                'hero_banner_floating_estimate' => '1',
            ];

            $nowHero = time();
            foreach ($defaultHeroConfigs as $hKey => $hVal) {
                $hasKey = $this->db->fetchOne("SELECT `id` FROM `{$this->p}sys_config` WHERE `config_key` = ?", [$hKey]);
                if (!$hasKey) {
                    $this->db->execute("INSERT INTO `{$this->p}sys_config` (`group_name`, `config_key`, `config_value`, `remark`, `updated_at`) VALUES ('system', ?, ?, '首页首屏自定义参数', ?)", [$hKey, $hVal, $nowHero]);
                }
            }

            // 成功执行一次后写入 30 天缓存标记，杜绝高频只读请求下的重复写锁与探测
            CacheService::getInstance()->set('sys_schema_upgraded_v3', 1, 86400 * 30);
        } catch (\Throwable $e) {
            // 静默容错
        }
    }

    /**
     * 获取支持的行业业务模板元信息
     */
    public function getTemplateList(): array
    {
        return [
            [
                'key'         => 'universal',
                'name'        => '综合全品类大平台模式',
                'icon'        => 'universal',
                'theme_color' => '#1e58ff',
                'site_name'   => '启灵通用回收服务平台',
                'slogan'      => '涵盖数码·废旧物资·汽车·奢侈品·家电的一站式高价回收平台',
                'desc'        => '适合大型集团或综合回收平台，聚合所有业务板块，用户可在前台多品类自由切换。',
                'default_unit'=> '台/件/公斤/辆',
                'fulfillments'=> ['mail' => '顺丰包邮/物流专线', 'store' => '线下门店/交投站', 'home' => '上门拆运/过磅拖车'],
                'preview_categories' => ['二手手机数码', '废旧金属与物资', '二手汽车与报废车', '奢侈品名表黄金', '二手大家电'],
                'preview_devices' => [
                    ['name' => 'iPhone 15 Pro Max', 'price' => '¥6,800.00', 'unit' => '台', 'img' => '/uploads/default/phone_15promax.svg'],
                    ['name' => '1# 特级光亮紫铜线', 'price' => '¥69.50', 'unit' => '公斤', 'img' => '/uploads/default/scrap_copper.svg'],
                    ['name' => '劳力士 潜航者型 黑水鬼', 'price' => '¥72,000.00', 'unit' => '件', 'img' => '/uploads/default/watch_rolex.svg'],
                    ['name' => '格力 1.5匹变频冷暖空调', 'price' => '¥850.00', 'unit' => '台', 'img' => '/uploads/default/appliance_ac.svg']
                ],
                'preview_features' => ['多行业品类自由切换导航', '综合搜索与快速精准估价', '顺丰包邮/专员上门/到店交割全渠道履约', '隐私数据清除与快速放款结算'],
                'preview_questions' => ['商品基础成色与版本', '功能运作与核心部件状态', '外观瑕疵与屏幕/机身成色', '履约交割方式确认']
            ],
            [
                'key'         => 'scrap',
                'name'        => '废品与再生资源回收模式',
                'icon'        => 'scrap',
                'theme_color' => '#10b981',
                'site_name'   => '启灵废品物资与再生资源回收网',
                'slogan'      => '废铜废铝废钢·电线电缆·电瓶纸板·上门过磅·现金秒结',
                'desc'        => '专注废旧金属、工业废料、电线电缆、动力蓄电池与废纸板，按公斤或吨称重计价结算。',
                'default_unit'=> '公斤/吨',
                'fulfillments'=> ['home' => '专业车辆上门过磅', 'store' => '自送到收购站/网点'],
                'preview_categories' => ['废铜金属与铜缆', '废铝合金与型材', '废铁废钢物资', '废旧铅酸蓄电池', '废旧纸板与工业纸'],
                'preview_devices' => [
                    ['name' => '1# 特级光亮紫铜线 (纯度≥99.9%)', 'price' => '¥69.50', 'unit' => '公斤', 'img' => '/uploads/default/scrap_copper.svg'],
                    ['name' => '纯铝合金断桥门窗型材料', 'price' => '¥18.50', 'unit' => '公斤', 'img' => '/uploads/default/scrap_aluminum.svg'],
                    ['name' => '工业特级重废钢 (厚度≥6mm)', 'price' => '¥2,920.00', 'unit' => '吨', 'img' => '/uploads/default/scrap_steel.svg'],
                    ['name' => '汽车启动铅酸免维护电瓶', 'price' => '¥9.80', 'unit' => '公斤', 'img' => '/uploads/default/scrap_battery.svg'],
                    ['name' => '纯一级纸箱纸板 (无水分)', 'price' => '¥1,480.00', 'unit' => '吨', 'img' => '/uploads/default/scrap_paper.svg']
                ],
                'preview_features' => ['今日再生资源挂牌指导价行情大看板', '专业电子地磅上门过磅称重', '散料打包与大宗批量阶梯加价补贴', '现场现金/对公转账秒结'],
                'preview_questions' => ['含杂质率与纯净度评估', '存放形态与托盘捆扎状态', '交投预估规模与整车补贴']
            ],
            [
                'key'         => 'auto',
                'name'        => '二手汽车与机动车报废模式',
                'icon'        => 'auto',
                'theme_color' => '#ea580c',
                'site_name'   => '启灵收车 · 二手车与报废车高价回收网',
                'slogan'      => '全国免费上门验车拖车 · 当天过户 · 当面结清全款',
                'desc'        => '专注家用燃油乘用车、新能源电动汽车、国三/国四报废车拆解申领残值补贴与营运客货车回收。',
                'default_unit'=> '万元/辆',
                'fulfillments'=> ['home' => '全国免费上门拖车', 'store' => '开到指定门店交付'],
                'preview_categories' => ['燃油家用轿车', '新能源纯电/混动车', '报废汽车拆解残值', 'SUV / 商务MPV', '商用微面 / 货车'],
                'preview_devices' => [
                    ['name' => '丰田 卡罗拉 1.2T CVT 精英版', 'price' => '¥62,000.00', 'unit' => '元/辆', 'img' => '/uploads/default/car_corolla.svg'],
                    ['name' => '特斯拉 Model 3 标准续航版', 'price' => '¥128,000.00', 'unit' => '元/辆', 'img' => '/uploads/default/car_tesla.svg'],
                    ['name' => '比亚迪 宋PLUS DM-i 110KM', 'price' => '¥98,000.00', 'unit' => '元/辆', 'img' => '/uploads/default/car_tesla.svg'],
                    ['name' => '小型家用客车整车报废拆解补贴', 'price' => '¥3,200.00', 'unit' => '元/辆', 'img' => '/uploads/default/car_scrap.svg']
                ],
                'preview_features' => ['全国免费上门验车拖车', '当天合法过户免除后顾之忧', '报废汽车正规拆解残值补贴申领', '验车合格当面结清全款'],
                'preview_questions' => ['车辆年份与表显真实里程', '骨架结构与历史事故切割排查', '水浸泡水及火烧痕迹排查', '证件手续与过户配合需求']
            ],
            [
                'key'         => 'digital',
                'name'        => '数码 3C 精品回收模式',
                'icon'        => 'digital',
                'theme_color' => '#2563eb',
                'site_name'   => '启灵数码 · 专业二手手机数码回收平台',
                'slogan'      => '闲置手机电脑平板高价回收 · 顺丰免费上门包邮 · 极速验机到账',
                'desc'        => '专注手机、笔记本、平板电脑、单反相机与智能穿戴，多维度成色算法精准估价。',
                'default_unit'=> '台',
                'fulfillments'=> ['mail' => '顺丰免费上门包邮', 'store' => '全国线下直营门店'],
                'preview_categories' => ['智能手机', '笔记本电脑', '平板电脑', '数码摄影摄像', '智能穿戴 / 耳机'],
                'preview_devices' => [
                    ['name' => 'iPhone 15 Pro Max', 'price' => '¥6,800.00', 'unit' => '台', 'img' => '/uploads/default/phone_15promax.svg'],
                    ['name' => '华为 Mate 60 Pro', 'price' => '¥5,200.00', 'unit' => '台', 'img' => '/uploads/default/phone_mate60.svg'],
                    ['name' => '小米 14 Ultra', 'price' => '¥4,600.00', 'unit' => '台', 'img' => '/uploads/default/phone_mi14.svg'],
                    ['name' => 'MacBook Pro 16英寸 M3 Max', 'price' => '¥18,500.00', 'unit' => '台', 'img' => '/uploads/default/macbook_pro.svg'],
                    ['name' => 'iPad Pro 11英寸 M4', 'price' => '¥6,100.00', 'unit' => '台', 'img' => '/uploads/default/ipad_pro.svg']
                ],
                'preview_features' => ['快速精准在线估价', '顺丰免费上门包邮', '隐私数据安全清除保障', '专业质检当天打款至微信/支付宝'],
                'preview_questions' => ['购买渠道与存储内存配置', '边框外壳与后盖成色成色', '屏幕显示与触控功能测试', '电池健康度与拆修历史']
            ],
            [
                'key'         => 'luxury',
                'name'        => '奢侈品名表黄金回收模式',
                'icon'        => 'luxury',
                'theme_color' => '#d97706',
                'site_name'   => '启灵名品 · 奢侈品名表名包黄金高价变现',
                'slogan'      => '瑞士名表·大牌箱包·黄金首饰·钻石珠宝·权威鉴定·现金结算',
                'desc'        => '专注劳力士/欧米茄名表、爱马仕/香奈儿包袋、足金999黄金克重计价与高档珠宝典当回收。',
                'default_unit'=> '件/克',
                'fulfillments'=> ['home' => '高级专员保价上门', 'store' => '专柜VIP到店鉴定'],
                'preview_categories' => ['瑞士高级名表', '大牌专柜箱包', '足金黄金首饰', '钻石翡翠珠宝', '大牌配饰腰带'],
                'preview_devices' => [
                    ['name' => '劳力士 潜航者型 黑水鬼', 'price' => '¥72,000.00', 'unit' => '件', 'img' => '/uploads/default/watch_rolex.svg'],
                    ['name' => '欧米茄 海马系列 300米潜水表', 'price' => '¥28,500.00', 'unit' => '件', 'img' => '/uploads/default/watch_rolex.svg'],
                    ['name' => '足金999.9投资金条/饰品 (实时按克换算)', 'price' => '¥585.00', 'unit' => '克', 'img' => '/uploads/default/luxury_gold.svg'],
                    ['name' => '爱马仕 Birkin 铂金包 30', 'price' => '¥85,000.00', 'unit' => '件', 'img' => '/uploads/default/luxury_gold.svg']
                ],
                'preview_features' => ['今日国际贵金属金价实时折算大看板', '资深中检奢侈品鉴定师双重复核', '顺丰专人保价押运密封箱', '极速大额当面/网银对公即时放款'],
                'preview_questions' => ['保卡、原装包装盒与发票齐全度', '表壳走时振幅与机芯打磨状态', '黄金纯度与克重损耗精密测算', '皮质包浆折痕与五金氧化成色']
            ],
            [
                'key'         => 'appliance',
                'name'        => '二手大家电拆旧回收模式',
                'icon'        => 'appliance',
                'theme_color' => '#0891b2',
                'site_name'   => '启灵家电 · 废旧大家电上门拆卸回收网',
                'slogan'      => '家用商用空调·冰箱洗衣机·电视机·免费上门拆机搬运',
                'desc'        => '专注空调、冰箱、滚筒洗衣机、液晶电视等大件家电，师傅免费上门拆装搬运、以旧换新。',
                'default_unit'=> '台',
                'fulfillments'=> ['home' => '专业师傅上门拆机搬运', 'store' => '送至家电集散站'],
                'preview_categories' => ['家用/商用空调', '双门/多门冰箱', '滚筒/波轮洗衣机', '液晶大屏电视', '厨房烟灶热水器'],
                'preview_devices' => [
                    ['name' => '格力 1.5匹变频冷暖空调挂机', 'price' => '¥850.00', 'unit' => '台', 'img' => '/uploads/default/appliance_ac.svg'],
                    ['name' => '美的 3匹变频立柜式客厅空调', 'price' => '¥1,600.00', 'unit' => '台', 'img' => '/uploads/default/appliance_ac.svg'],
                    ['name' => '海尔 500升双门风冷无霜冰箱', 'price' => '¥680.00', 'unit' => '台', 'img' => '/uploads/default/appliance_fridge.svg'],
                    ['name' => '小天鹅 10公斤变频滚筒洗衣机', 'price' => '¥550.00', 'unit' => '台', 'img' => '/uploads/default/appliance_washer.svg']
                ],
                'preview_features' => ['专业师傅免费上门拆装拆卸', '自带专业工具与搬运工具', '电梯/楼梯搬运免搬运费', '现场通电验机秒付现金'],
                'preview_questions' => ['品牌与匹数/容量规格', '制冷制热与通电运转状态', '外观面板凹陷与生锈程度', '楼层是否有电梯与高空作业环境']
            ]
        ];
    }

    /**
     * 获取当前生效的行业模板 Key
     */
    public function getCurrentTemplateKey(): string
    {
        $sql = "SELECT `config_value` FROM `{$this->p}sys_config` WHERE `config_key` = 'industry_template' LIMIT 1";
        $row = $this->db->fetchOne($sql);
        return !empty($row['config_value']) ? $row['config_value'] : 'universal';
    }

    /**
     * 获取当前模板完整配置与前端呈现元信息
     */
    public function getCurrentTemplateMeta(): array
    {
        $key = $this->getCurrentTemplateKey();
        $list = $this->getTemplateList();
        foreach ($list as $tpl) {
            if ($tpl['key'] === $key) {
                return $tpl;
            }
        }
        return $list[0];
    }

    /**
     * 切换业务模板并装载行业标准预置库 (分类、机型、参考价与质检问答)
     */
    public function switchTemplate(string $templateKey, bool $initData = true): array
    {
        $all = $this->getTemplateList();
        $target = null;
        foreach ($all as $item) {
            if ($item['key'] === $templateKey) {
                $target = $item;
                break;
            }
        }

        if (!$target) {
            return ['code' => 400, 'msg' => '未知的行业模板类型: ' . $templateKey];
        }

        $now = time();

        // 1. 保存当前模板设置
        $saveSql = "INSERT INTO `{$this->p}sys_config` (`group_name`, `config_key`, `config_value`, `remark`, `updated_at`) 
                    VALUES ('system', 'industry_template', ?, '当前行业业务模板', ?) 
                    ON DUPLICATE KEY UPDATE `config_value` = VALUES(`config_value`), `updated_at` = VALUES(`updated_at`)";
        $this->db->execute($saveSql, [$templateKey, $now]);

        // 同步更新站点名称
        $titleSql = "UPDATE `{$this->p}sys_config` SET `config_value` = ?, `updated_at` = ? WHERE `config_key` = 'site_name'";
        $this->db->execute($titleSql, [$target['site_name'], $now]);

        // 2. 若选择重新装载行业数据
        if ($initData) {
            $this->seedIndustryData($templateKey);
        }

        // 清理缓存
        CacheService::getInstance()->clear();

        return [
            'code' => 200,
            'msg'  => '行业模板已切换为【' . $target['name'] . '】，预置库已同步更新！',
            'data' => $target
        ];
    }

    /**
     * 写入各行业专属品类、机型与评估规则
     */
    private function seedIndustryData(string $key): void
    {
        $this->db->beginTransaction();
        try {
            $p = $this->p;
            $now = time();

            // 清理旧机型与品类（保留用户订单）
            $this->db->execute("DELETE FROM `{$p}rc_device`");
            $this->db->execute("DELETE FROM `{$p}rc_brand`");
            $this->db->execute("DELETE FROM `{$p}rc_category`");
            $this->db->execute("DELETE FROM `{$p}rc_question_item`");
            $this->db->execute("DELETE FROM `{$p}rc_question`");

            if ($key === 'scrap') {
                // =============== 废品再生资源专属数据 ===============
                $cats = [
                    [1, '废铜线缆', '/uploads/cat_copper.png', '公斤', 100],
                    [2, '废铝合金', '/uploads/cat_aluminum.png', '公斤', 90],
                    [3, '废铁废钢', '/uploads/cat_steel.png', '吨', 80],
                    [4, '铅酸电瓶', '/uploads/cat_battery.png', '公斤', 70],
                    [5, '废旧纸板', '/uploads/cat_paper.png', '吨', 60]
                ];
                foreach ($cats as $c) {
                    $this->db->execute("INSERT INTO `{$p}rc_category` (`id`, `name`, `icon`, `unit`, `sort`, `is_show`, `created_at`) VALUES (?, ?, ?, ?, ?, 1, ?)", [$c[0], $c[1], $c[2], $c[3], $c[4], $now]);
                }

                $brands = [
                    [1, 1, '国标特级纯料', 'G', 100],
                    [2, 1, '工业漆包拆机料', 'G', 90],
                    [3, 2, '断桥门窗原厂料', 'D', 80],
                    [4, 3, '重废打包统料', 'Z', 70],
                    [5, 4, '汽车专用电瓶', 'Q', 60],
                    [6, 5, '一级超市黄板纸', 'Y', 50]
                ];
                foreach ($brands as $b) {
                    $this->db->execute("INSERT INTO `{$p}rc_brand` (`id`, `category_id`, `name`, `first_letter`, `sort`, `created_at`) VALUES (?, ?, ?, ?, ?, ?)", [$b[0], $b[1], $b[2], $b[3], $b[4], $now]);
                }

                $devices = [
                    [1, 1, 1, '1# 特级光亮紫铜线 (纯度≥99.9%)', '/uploads/default/scrap_copper.svg', 69.50, '公斤', 100, 1],
                    [2, 1, 2, '2# 电机马达铜 / 漆包线铜', '/uploads/default/scrap_copper.svg', 63.80, '公斤', 90, 1],
                    [3, 1, 1, '黄铜铜水嘴 / 水暖阀门件', '/uploads/default/scrap_copper.svg', 42.50, '公斤', 80, 0],
                    [4, 2, 3, '纯铝合金断桥门窗型材料', '/uploads/default/scrap_aluminum.svg', 18.50, '公斤', 95, 1],
                    [5, 3, 4, '工业特级重废钢 (厚度≥6mm)', '/uploads/default/scrap_steel.svg', 2920.00, '吨', 85, 1],
                    [6, 4, 5, '汽车启动铅酸免维护电瓶', '/uploads/default/scrap_battery.svg', 9.80, '公斤', 90, 1],
                    [7, 5, 6, '纯一级纸箱纸板 (无水分)', '/uploads/default/scrap_paper.svg', 1480.00, '吨', 75, 1]
                ];
                foreach ($devices as $d) {
                    $this->db->execute("INSERT INTO `{$p}rc_device` (`id`, `category_id`, `brand_id`, `name`, `cover_img`, `guide_price`, `unit`, `sort`, `is_hot`, `status`, `created_at`, `updated_at`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)", [$d[0], $d[1], $d[2], $d[3], $d[4], $d[5], $d[6], $d[7], $d[8], $now, $now]);
                }

                // 废品估价问答
                $this->db->execute("INSERT INTO `{$p}rc_question` (`id`, `category_id`, `title`, `sub_title`, `sort`, `created_at`) VALUES 
                    (1, 0, '含杂质率与纯净度', '观察表面附着物、塑料、油脂或非金属杂质', 100, ?),
                    (2, 0, '存放形态与捆扎', '物资打包状态影响装车与物流运费', 90, ?),
                    (3, 0, '交投预估规模', '量大享有大宗上门加价补贴', 80, ?)", [$now, $now, $now]);

                $this->db->execute("INSERT INTO `{$p}rc_question_item` (`question_id`, `name`, `deduct_type`, `deduct_value`, `sort`, `created_at`) VALUES 
                    (1, '特优纯料 / 零杂质 (100%纯度)', 'fixed', 0.00, 100, ?),
                    (1, '轻微附着杂质 (杂质率约2%)', 'fixed', -1.50, 90, ?),
                    (1, '表面有明显杂物/氧化 (杂质约5%)', 'fixed', -4.00, 80, ?),
                    (2, '整齐成捆 / 托盘打包', 'fixed', 0.00, 100, ?),
                    (2, '散料堆放 (需人工捡拾装车)', 'fixed', -1.00, 90, ?),
                    (3, '大宗批量 (≥1吨或整车)', 'fixed', 2.00, 100, ?),
                    (3, '中量回收 (200公斤-1吨)', 'fixed', 0.00, 90, ?),
                    (3, '零星散批 (<200公斤)', 'fixed', -1.00, 80, ?)", [$now, $now, $now, $now, $now, $now, $now, $now]);

            } elseif ($key === 'auto') {
                // =============== 二手汽车与报废车专属数据 ===============
                $cats = [
                    [1, '燃油轿车', '/uploads/cat_sedan.png', '万元/辆', 100],
                    [2, '新能源车', '/uploads/cat_ev.png', '万元/辆', 90],
                    [3, '报废汽车', '/uploads/cat_scrap_car.png', '元/辆', 80],
                    [4, 'SUV商务', '/uploads/cat_suv.png', '万元/辆', 70],
                    [5, '货车微面', '/uploads/cat_truck.png', '万元/辆', 60]
                ];
                foreach ($cats as $c) {
                    $this->db->execute("INSERT INTO `{$p}rc_category` (`id`, `name`, `icon`, `unit`, `sort`, `is_show`, `created_at`) VALUES (?, ?, ?, ?, ?, 1, ?)", [$c[0], $c[1], $c[2], $c[3], $c[4], $now]);
                }

                $brands = [
                    [1, 1, '丰田 Toyota', 'T', 100],
                    [2, 1, '大众 Volkswagen', 'D', 90],
                    [3, 2, '特斯拉 Tesla', 'T', 95],
                    [4, 2, '比亚迪 BYD', 'B', 90],
                    [5, 1, '宝马 BMW', 'B', 85],
                    [6, 3, '全国各品牌报废车', 'B', 80]
                ];
                foreach ($brands as $b) {
                    $this->db->execute("INSERT INTO `{$p}rc_brand` (`id`, `category_id`, `name`, `first_letter`, `sort`, `created_at`) VALUES (?, ?, ?, ?, ?, ?)", [$b[0], $b[1], $b[2], $b[3], $b[4], $now]);
                }

                $devices = [
                    [1, 1, 1, '丰田 卡罗拉 1.2T CVT 精英版', '/uploads/default/car_corolla.svg', 62000.00, '元/辆', 100, 1],
                    [2, 2, 3, '特斯拉 Model 3 标准续航升级版', '/uploads/default/car_tesla.svg', 128000.00, '元/辆', 95, 1],
                    [3, 2, 4, '比亚迪 宋PLUS DM-i 110KM', '/uploads/default/car_tesla.svg', 98000.00, '元/辆', 90, 1],
                    [4, 1, 5, '宝马 5系 530Li 领先型 豪华版', '/uploads/default/car_corolla.svg', 225000.00, '元/辆', 85, 1],
                    [5, 3, 6, '小型家用客车整车报废拆解补贴', '/uploads/default/car_scrap.svg', 3200.00, '元/辆', 90, 1],
                    [6, 3, 6, '大型柴油黄标货车报废拆解', '/uploads/default/car_scrap.svg', 6800.00, '元/辆', 80, 0]
                ];
                foreach ($devices as $d) {
                    $this->db->execute("INSERT INTO `{$p}rc_device` (`id`, `category_id`, `brand_id`, `name`, `cover_img`, `guide_price`, `unit`, `sort`, `is_hot`, `status`, `created_at`, `updated_at`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)", [$d[0], $d[1], $d[2], $d[3], $d[4], $d[5], $d[6], $d[7], $d[8], $now, $now]);
                }

                // 汽车估价问答
                $this->db->execute("INSERT INTO `{$p}rc_question` (`id`, `category_id`, `title`, `sub_title`, `sort`, `created_at`) VALUES 
                    (1, 0, '车辆年份与表显里程', '参考仪表盘真实里程与机动车登记证书', 100, ?),
                    (2, 0, '骨架结构与历史事故', '排除重大结构件切割、火烧事故', 90, ?),
                    (3, 0, '水浸泡水排查', '地毯底盘发动机舱是否有泥沙锈蚀', 80, ?),
                    (4, 0, '证件手续与过户需求', '登记证、行驶证、购车发票状态', 70, ?)", [$now, $now, $now, $now]);

                $this->db->execute("INSERT INTO `{$p}rc_question_item` (`question_id`, `name`, `deduct_type`, `deduct_value`, `sort`, `created_at`) VALUES 
                    (1, '准新车 (3万公里以内/1年内)', 'fixed', 0.00, 100, ?),
                    (1, '成色良好 (3-6万公里)', 'fixed', -5000.00, 90, ?),
                    (1, '正常家用代步 (6-10万公里)', 'fixed', -12000.00, 80, ?),
                    (1, '高里程车辆 (10万公里以上)', 'fixed', -22000.00, 70, ?),
                    (2, '原版原漆 / 无任何结构件事故', 'fixed', 0.00, 100, ?),
                    (2, '轻微剐蹭喷漆 / 覆盖件无伤', 'fixed', -2000.00, 90, ?),
                    (2, '局部钣金维修 / 骨架完好', 'fixed', -5000.00, 80, ?),
                    (3, '无任何泡水涉水痕迹', 'fixed', 0.00, 100, ?),
                    (3, '轻微积水未超底盘底板', 'fixed', -3000.00, 90, ?),
                    (3, '严重水淹车 (淹过中控台)', 'fixed', -30000.00, 80, ?),
                    (4, '产证行驶证齐全 / 随时配合过户', 'fixed', 0.00, 100, ?),
                    (4, '车辆办理报废销户 / 残值结算', 'fixed', 0.00, 90, ?)", [$now, $now, $now, $now, $now, $now, $now, $now, $now, $now, $now, $now]);

            } elseif ($key === 'digital') {
                // =============== 数码 3C 精品回收专属数据 ===============
                $cats = [
                    [1, '智能手机', '/uploads/cat_phone.png', '台', 100],
                    [2, '笔记本', '/uploads/cat_laptop.png', '台', 90],
                    [3, '平板电脑', '/uploads/cat_tablet.png', '台', 80],
                    [4, '摄影摄像', '/uploads/cat_camera.png', '台', 70],
                    [5, '智能穿戴', '/uploads/cat_watch.png', '件', 60]
                ];
                foreach ($cats as $c) {
                    $this->db->execute("INSERT INTO `{$p}rc_category` (`id`, `name`, `icon`, `unit`, `sort`, `is_show`, `created_at`) VALUES (?, ?, ?, ?, ?, 1, ?)", [$c[0], $c[1], $c[2], $c[3], $c[4], $now]);
                }

                $brands = [
                    [1, 1, 'Apple / 苹果', 'A', 100],
                    [2, 1, 'HUAWEI / 华为', 'H', 95],
                    [3, 1, 'Xiaomi / 小米', 'X', 90],
                    [4, 2, 'Apple Mac', 'A', 95],
                    [5, 2, 'Lenovo / 联想', 'L', 85],
                    [6, 4, 'Sony / 索尼', 'S', 90]
                ];
                foreach ($brands as $b) {
                    $this->db->execute("INSERT INTO `{$p}rc_brand` (`id`, `category_id`, `name`, `first_letter`, `sort`, `created_at`) VALUES (?, ?, ?, ?, ?, ?)", [$b[0], $b[1], $b[2], $b[3], $b[4], $now]);
                }

                $devices = [
                    [1, 1, 1, 'iPhone 15 Pro Max', '/uploads/default/phone_15promax.svg', 6800.00, '台', 100, 1],
                    [2, 1, 2, 'HUAWEI Mate 60 Pro', '/uploads/default/phone_mate60.svg', 5200.00, '台', 95, 1],
                    [3, 1, 3, '小米 14 Ultra', '/uploads/default/phone_mi14.svg', 4800.00, '台', 90, 1],
                    [4, 2, 4, 'MacBook Pro 16寸 M3 Max', '/uploads/default/macbook_pro.svg', 16500.00, '台', 95, 1],
                    [5, 3, 1, 'iPad Pro 12.9寸 M2芯片', '/uploads/default/ipad_pro.svg', 5600.00, '台', 90, 1],
                    [6, 4, 6, '索尼 Alpha 7M4 全画幅机身', '/uploads/default/sony_a7m4.svg', 11500.00, '台', 85, 1]
                ];
                foreach ($devices as $d) {
                    $this->db->execute("INSERT INTO `{$p}rc_device` (`id`, `category_id`, `brand_id`, `name`, `cover_img`, `guide_price`, `unit`, `sort`, `is_hot`, `status`, `created_at`, `updated_at`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)", [$d[0], $d[1], $d[2], $d[3], $d[4], $d[5], $d[6], $d[7], $d[8], $now, $now]);
                }

                // 数码估价问答
                $this->db->execute("INSERT INTO `{$p}rc_question` (`id`, `category_id`, `title`, `sub_title`, `sort`, `created_at`) VALUES 
                    (1, 0, '屏幕外观与显示成色', '在强光下熄屏观察屏幕划痕及亮屏显示', 100, ?),
                    (2, 0, '机身外壳与边框成色', '检查四周边框及后盖是否有磨损掉漆磕碰', 90, ?),
                    (3, 0, '存储容量与规格配置', '设置-通用-关于本机中核对存储规格', 80, ?),
                    (4, 0, '拆修史与功能完好度', 'FaceID/指纹/相机/无线网络是否全部正常', 70, ?)", [$now, $now, $now, $now]);

                $this->db->execute("INSERT INTO `{$p}rc_question_item` (`question_id`, `name`, `deduct_type`, `deduct_value`, `sort`, `created_at`) VALUES 
                    (1, '完美无划痕 / 亮屏纯净无斑', 'fixed', 0.00, 100, ?),
                    (1, '细微使用痕迹 (无裂痕破损)', 'fixed', -150.00, 90, ?),
                    (1, '明显划痕 / 涂层脱落', 'fixed', -350.00, 80, ?),
                    (1, '屏幕碎裂 / 漏液有黑斑绿线', 'fixed', -900.00, 70, ?),
                    (2, '充新完美 / 零磕碰掉漆', 'fixed', 0.00, 100, ?),
                    (2, '轻微日常氧化磨损痕迹', 'fixed', -100.00, 90, ?),
                    (2, '边缘有明显磕碰凹陷', 'fixed', -300.00, 80, ?),
                    (3, '顶配大容量 (512G / 1TB / 2TB)', 'fixed', 0.00, 100, ?),
                    (3, '主流适中容量 (256GB)', 'fixed', -400.00, 90, ?),
                    (3, '基础入门容量 (128GB / 64GB)', 'fixed', -800.00, 80, ?),
                    (4, '纯原装无拆无修 / 全部功能正常', 'fixed', 0.00, 100, ?),
                    (4, '官方直营售后换过原装电池/屏幕', 'fixed', -200.00, 90, ?),
                    (4, '第三方维修过 / 局部小功能失灵', 'fixed', -600.00, 80, ?)", [$now, $now, $now, $now, $now, $now, $now, $now, $now, $now, $now, $now, $now]);

            } elseif ($key === 'luxury') {
                // =============== 奢侈品名表黄金专属数据 ===============
                $cats = [
                    [1, '瑞士名表', '/uploads/cat_watch.png', '件', 100],
                    [2, '黄金首饰', '/uploads/cat_gold.png', '克', 90],
                    [3, '名牌箱包', '/uploads/cat_bag.png', '件', 80],
                    [4, '珠宝首饰', '/uploads/cat_jewelry.png', '件', 70]
                ];
                foreach ($cats as $c) {
                    $this->db->execute("INSERT INTO `{$p}rc_category` (`id`, `name`, `icon`, `unit`, `sort`, `is_show`, `created_at`) VALUES (?, ?, ?, ?, ?, 1, ?)", [$c[0], $c[1], $c[2], $c[3], $c[4], $now]);
                }

                $brands = [
                    [1, 1, '劳力士 Rolex', 'L', 100],
                    [2, 1, '欧米茄 Omega', 'O', 90],
                    [3, 2, '足金999 / 投资条', 'Z', 100],
                    [4, 3, '爱马仕 Hermès', 'A', 95],
                    [5, 3, '香奈儿 Chanel', 'X', 90]
                ];
                foreach ($brands as $b) {
                    $this->db->execute("INSERT INTO `{$p}rc_brand` (`id`, `category_id`, `name`, `first_letter`, `sort`, `created_at`) VALUES (?, ?, ?, ?, ?, ?)", [$b[0], $b[1], $b[2], $b[3], $b[4], $now]);
                }

                $devices = [
                    [1, 1, 1, '劳力士 潜航者型黑水鬼 126610LN', '/uploads/default/watch_rolex.svg', 78500.00, '件', 100, 1],
                    [2, 1, 2, '欧米茄 海马系列300米 潜水表', '/uploads/default/watch_rolex.svg', 24500.00, '件', 90, 1],
                    [3, 2, 3, '足金999黄金饰品 / 投资金条', '/uploads/default/luxury_gold.svg', 578.00, '克', 100, 1],
                    [4, 3, 4, '爱马仕 经典Birkin 30手袋', '/uploads/default/dev_default.svg', 95000.00, '件', 95, 1],
                    [5, 3, 5, '香奈儿 Classic Flap 中号黑金', '/uploads/default/dev_default.svg', 42000.00, '件', 90, 1]
                ];
                foreach ($devices as $d) {
                    $this->db->execute("INSERT INTO `{$p}rc_device` (`id`, `category_id`, `brand_id`, `name`, `cover_img`, `guide_price`, `unit`, `sort`, `is_hot`, `status`, `created_at`, `updated_at`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)", [$d[0], $d[1], $d[2], $d[3], $d[4], $d[5], $d[6], $d[7], $d[8], $now, $now]);
                }

                // 奢侈品问答
                $this->db->execute("INSERT INTO `{$p}rc_question` (`id`, `category_id`, `title`, `sub_title`, `sort`, `created_at`) VALUES 
                    (1, 0, '附件凭证与全套包装', '原厂保卡、发票、说明书、防尘袋与表盒状态', 100, ?),
                    (2, 0, '品相成色与磨损等级', '包身五金、皮质或表壳表镜划痕氧化情况', 90, ?),
                    (3, 0, '走时精度与维护史', '机芯是否原装开盖、走时日差是否在公差内', 80, ?)", [$now, $now, $now]);

                $this->db->execute("INSERT INTO `{$p}rc_question_item` (`question_id`, `name`, `deduct_type`, `deduct_value`, `sort`, `created_at`) VALUES 
                    (1, '全套附件齐全 (保卡/原盒/发票/防尘袋)', 'fixed', 0.00, 100, ?),
                    (1, '有保卡但缺发票或盒子', 'fixed', -1200.00, 90, ?),
                    (1, '单表/单包无任何附件', 'fixed', -3500.00, 80, ?),
                    (2, '99新未使用品 / 极微存放痕迹', 'fixed', 0.00, 100, ?),
                    (2, '95新正常成色 / 轻微正常佩戴细痕', 'fixed', -1500.00, 90, ?),
                    (2, '90新中度成色 / 五金磨损氧化或皮质变形', 'fixed', -4500.00, 80, ?),
                    (3, '机芯原装走时精准 / 零拆修', 'fixed', 0.00, 100, ?),
                    (3, '走时偏快偏慢 / 需常规洗油保养', 'fixed', -1000.00, 90, ?),
                    (3, '曾经外店拆修 / 更换过非原装零件', 'fixed', -8000.00, 80, ?)", [$now, $now, $now, $now, $now, $now, $now, $now, $now]);

            } elseif ($key === 'appliance') {
                // =============== 二手大家电专属数据 ===============
                $cats = [
                    [1, '冷暖空调', '/uploads/cat_ac.png', '台', 100],
                    [2, '冰箱冰柜', '/uploads/cat_fridge.png', '台', 90],
                    [3, '洗衣机', '/uploads/cat_washer.png', '台', 80],
                    [4, '液晶电视', '/uploads/cat_tv.png', '台', 70]
                ];
                foreach ($cats as $c) {
                    $this->db->execute("INSERT INTO `{$p}rc_category` (`id`, `name`, `icon`, `unit`, `sort`, `is_show`, `created_at`) VALUES (?, ?, ?, ?, ?, 1, ?)", [$c[0], $c[1], $c[2], $c[3], $c[4], $now]);
                }

                $brands = [
                    [1, 1, '格力 GREE', 'G', 100],
                    [2, 1, '美的 Midea', 'M', 90],
                    [3, 2, '海尔 Haier', 'H', 95],
                    [4, 3, '小天鹅 LittleSwan', 'X', 90],
                    [5, 4, '索尼 SONY', 'S', 90]
                ];
                foreach ($brands as $b) {
                    $this->db->execute("INSERT INTO `{$p}rc_brand` (`id`, `category_id`, `name`, `first_letter`, `sort`, `created_at`) VALUES (?, ?, ?, ?, ?, ?)", [$b[0], $b[1], $b[2], $b[3], $b[4], $now]);
                }

                $devices = [
                    [1, 1, 1, '格力 1.5匹 变频冷暖挂机空调', '/uploads/default/appliance_ac.svg', 750.00, '台', 100, 1],
                    [2, 1, 2, '美的 3匹 舒适星圆柱立式柜机', '/uploads/default/appliance_ac.svg', 1450.00, '台', 90, 1],
                    [3, 2, 3, '海尔 530升 双开门变频风冷冰箱', '/uploads/default/appliance_fridge.svg', 680.00, '台', 95, 1],
                    [4, 3, 4, '小天鹅 10公斤 水魔方滚筒洗衣机', '/uploads/default/appliance_washer.svg', 520.00, '台', 90, 1],
                    [5, 4, 5, '索尼 75英寸 4K超高清智能电视', '/uploads/default/appliance_tv.svg', 1200.00, '台', 90, 1]
                ];
                foreach ($devices as $d) {
                    $this->db->execute("INSERT INTO `{$p}rc_device` (`id`, `category_id`, `brand_id`, `name`, `cover_img`, `guide_price`, `unit`, `sort`, `is_hot`, `status`, `created_at`, `updated_at`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)", [$d[0], $d[1], $d[2], $d[3], $d[4], $d[5], $d[6], $d[7], $d[8], $now, $now]);
                }

                // 大家电估价问答
                $this->db->execute("INSERT INTO `{$p}rc_question` (`id`, `category_id`, `title`, `sub_title`, `sort`, `created_at`) VALUES 
                    (1, 0, '核心运转与制冷性能', '压缩机/电机运转声音，制冷或烘干功能', 100, ?),
                    (2, 0, '机身成色与面板外观', '面板是否有泛黄、磕碰裂痕、生锈氧化', 90, ?),
                    (3, 0, '拆装搬运环境与楼层', '是否需要师傅携带专业工具高空/步梯拆运', 80, ?)", [$now, $now, $now]);

                $this->db->execute("INSERT INTO `{$p}rc_question_item` (`question_id`, `name`, `deduct_type`, `deduct_value`, `sort`, `created_at`) VALUES 
                    (1, '运转完全正常 / 制冷强劲安静', 'fixed', 0.00, 100, ?),
                    (1, '轻微噪音运转正常 (不影响使用)', 'fixed', -60.00, 90, ?),
                    (1, '核心故障不运转 / 仅通电不制冷', 'fixed', -250.00, 80, ?),
                    (2, '外观完好整洁 / 零破损泛黄', 'fixed', 0.00, 100, ?),
                    (2, '正常年限使用痕迹 (轻微变色)', 'fixed', -40.00, 90, ?),
                    (2, '外壳有凹坑破损或局部生锈', 'fixed', -100.00, 80, ?),
                    (3, '已自行拆卸置于一楼或有电梯', 'fixed', 0.00, 100, ?),
                    (3, '电梯房需上门拆机并搬运', 'fixed', -50.00, 90, ?),
                    (3, '高层步梯房需上门拆装搬运', 'fixed', -100.00, 80, ?)", [$now, $now, $now, $now, $now, $now, $now, $now, $now]);

            } else {
                // =============== 综合全品类大平台模式 (聚合各大类) ===============
                $cats = [
                    [1, '手机数码', '/uploads/cat_phone.png', '台', 100],
                    [2, '废旧物资', '/uploads/cat_copper.png', '公斤', 90],
                    [3, '二手汽车', '/uploads/cat_car.png', '辆', 80],
                    [4, '名表黄金', '/uploads/cat_luxury.png', '件', 70],
                    [5, '二手家电', '/uploads/cat_appliance.png', '台', 60]
                ];
                foreach ($cats as $c) {
                    $this->db->execute("INSERT INTO `{$p}rc_category` (`id`, `name`, `icon`, `unit`, `sort`, `is_show`, `created_at`) VALUES (?, ?, ?, ?, ?, 1, ?)", [$c[0], $c[1], $c[2], $c[3], $c[4], $now]);
                }

                $brands = [
                    [1, 1, 'Apple / 苹果', 'A', 100],
                    [2, 1, 'HUAWEI / 华为', 'H', 90],
                    [3, 2, '特级工业废铜', 'G', 85],
                    [4, 2, '纯废铝合金型材', 'L', 80],
                    [5, 3, '乘用燃油轿车', 'C', 75],
                    [6, 4, '劳力士 / 瑞士名表', 'L', 70],
                    [7, 5, '格力 / 美的空调', 'G', 65]
                ];
                foreach ($brands as $b) {
                    $this->db->execute("INSERT INTO `{$p}rc_brand` (`id`, `category_id`, `name`, `first_letter`, `sort`, `created_at`) VALUES (?, ?, ?, ?, ?, ?)", [$b[0], $b[1], $b[2], $b[3], $b[4], $now]);
                }

                $devices = [
                    [1, 1, 1, 'iPhone 15 Pro Max', '/uploads/default/phone_15promax.svg', 6800.00, '台', 100, 1],
                    [2, 1, 2, 'HUAWEI Mate 60 Pro', '/uploads/default/phone_mate60.svg', 5200.00, '台', 95, 1],
                    [3, 2, 3, '1# 特级光亮紫铜线 (无杂质)', '/uploads/default/scrap_copper.svg', 69.50, '公斤', 90, 1],
                    [4, 2, 4, '纯断桥铝合金门窗料', '/uploads/default/scrap_aluminum.svg', 18.50, '公斤', 85, 1],
                    [5, 3, 5, '丰田 卡罗拉 1.2T 精英版', '/uploads/default/car_corolla.svg', 62000.00, '辆', 80, 1],
                    [6, 4, 6, '劳力士 潜航者型黑水鬼', '/uploads/default/watch_rolex.svg', 78000.00, '件', 75, 1],
                    [7, 5, 7, '格力 1.5匹变频冷暖挂机', '/uploads/default/appliance_ac.svg', 650.00, '台', 70, 1]
                ];
                foreach ($devices as $d) {
                    $this->db->execute("INSERT INTO `{$p}rc_device` (`id`, `category_id`, `brand_id`, `name`, `cover_img`, `guide_price`, `unit`, `sort`, `is_hot`, `status`, `created_at`, `updated_at`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)", [$d[0], $d[1], $d[2], $d[3], $d[4], $d[5], $d[6], $d[7], $d[8], $now, $now]);
                }

                // 综合问答
                $this->db->execute("INSERT INTO `{$p}rc_question` (`id`, `category_id`, `title`, `sub_title`, `sort`, `created_at`) VALUES 
                    (1, 0, '外观与成色状况', '观察物品整体品相、磨损或瑕疵程度', 100, ?),
                    (2, 0, '主要规格参数/容量/型号', '核对具体铭牌、容量或材质成色', 90, ?),
                    (3, 0, '拆修与性能状态', '核心功能与内部部件是否原装完好', 80, ?)", [$now, $now, $now]);

                $this->db->execute("INSERT INTO `{$p}rc_question_item` (`question_id`, `name`, `deduct_type`, `deduct_value`, `sort`, `created_at`) VALUES 
                    (1, '充新 / 特优无瑕疵 (完美状态)', 'fixed', 0.00, 100, ?),
                    (1, '轻微正常使用痕迹', 'fixed', -150.00, 90, ?),
                    (1, '明显磨损 / 磕碰掉漆 / 轻度瑕疵', 'fixed', -400.00, 80, ?),
                    (2, '顶配主流高规格 (大容量/高纯度)', 'fixed', 0.00, 100, ?),
                    (2, '标准标准规格参数', 'fixed', -300.00, 90, ?),
                    (2, '基础入门规格', 'fixed', -600.00, 80, ?),
                    (3, '全原装完好 / 功能全部正常', 'fixed', 0.00, 100, ?),
                    (3, '官方售后维护过 / 运转良好', 'fixed', -200.00, 90, ?),
                    (3, '第三方维修过 / 局部故障', 'fixed', -500.00, 80, ?)", [$now, $now, $now, $now, $now, $now, $now, $now, $now]);
            }

            $this->db->commit();
        } catch (\Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    /**
     * 获取系统内置的全套视觉主题风格模版列表
     */
    public function getThemeStyleList(): array
    {
        return [
            [
                'key'              => 'tech_blue',
                'name'             => '科技数码蓝',
                'badge_text'       => '数码/手机首选',
                'recommend_for'    => '手机数码 · 笔记本电脑 · 摄影摄像 · 智能硬件',
                'desc'             => '经典深邃科技蓝，凸显数码智能科技与官方透明验机公信力，是专业手机与数码3C回收的首选标配。',
                'primary'          => '#1e58ff',
                'primary_hover'    => '#1645cf',
                'primary_light'    => '#eef3ff',
                'primary_gradient' => 'linear-gradient(135deg, #1e58ff 0%, #3b82f6 100%)',
                'accent'           => '#10b981',
                'preview_colors'   => ['#1e58ff', '#3b82f6', '#eef3ff', '#10b981']
            ],
            [
                'key'              => 'eco_green',
                'name'             => '生态环保绿',
                'badge_text'       => '废品再生首选',
                'recommend_for'    => '废旧金属 · 铜铝不锈钢 · 电线电缆 · 废纸电瓶',
                'desc'             => '自然生机生态绿，传递绿色低碳、变废为宝与循环经济环保理念，特别契合废品回收、再生资源与旧物资行业。',
                'primary'          => '#10b981',
                'primary_hover'    => '#059669',
                'primary_light'    => '#ecfdf5',
                'primary_gradient' => 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                'accent'           => '#f59e0b',
                'preview_colors'   => ['#10b981', '#059669', '#ecfdf5', '#f59e0b']
            ],
            [
                'key'              => 'sunset_orange',
                'name'             => '活力日落橙',
                'badge_text'       => '二手车/机械首选',
                'recommend_for'    => '二手汽车 · 机动车报废 · 工业机械 · 动力设备',
                'desc'             => '朝气蓬勃、热情高效的工业活力橙，彰显全速上门验车拖车与现金秒付的极速履约信赖。',
                'primary'          => '#ea580c',
                'primary_hover'    => '#c2410c',
                'primary_light'    => '#fff7ed',
                'primary_gradient' => 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
                'accent'           => '#2563eb',
                'preview_colors'   => ['#ea580c', '#f97316', '#fff7ed', '#2563eb']
            ],
            [
                'key'              => 'luxury_gold',
                'name'             => '尊贵奢品金',
                'badge_text'       => '名表黄金首选',
                'recommend_for'    => '瑞士名表 · 大牌箱包 · 黄金珠宝 · 奢侈品典当',
                'desc'             => '沉稳尊贵黑金与琥珀金调性，传递殿堂级奢华品质、权威严谨质检与私密保价回收体验。',
                'primary'          => '#d97706',
                'primary_hover'    => '#b45309',
                'primary_light'    => '#fef3c7',
                'primary_gradient' => 'linear-gradient(135deg, #b45309 0%, #d97706 100%)',
                'accent'           => '#0f172a',
                'preview_colors'   => ['#d97706', '#b45309', '#fef3c7', '#0f172a']
            ],
            [
                'key'              => 'cyan_fresh',
                'name'             => '清爽极简青',
                'badge_text'       => '家电拆旧首选',
                'recommend_for'    => '二手大家电 · 现代家居 · 拆机搬运 · 全品类大平台',
                'desc'             => '透亮清爽的大师青蓝，兼具现代简约与安心信赖服务感，尤其适合空调洗衣机等大家电拆旧以旧换新。',
                'primary'          => '#0891b2',
                'primary_hover'    => '#0e7490',
                'primary_light'    => '#ecfeff',
                'primary_gradient' => 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
                'accent'           => '#10b981',
                'preview_colors'   => ['#0891b2', '#06b6d4', '#ecfeff', '#10b981']
            ],
            [
                'key'              => 'cyber_dark',
                'name'             => '极客机甲黑',
                'badge_text'       => '潮玩电竞首选',
                'recommend_for'    => '潮玩手办 · 游戏主机 · 极客显卡 · 年轻数码',
                'desc'             => '酷炫深邃的机甲电光蓝紫，专为年轻潮流与高阶电竞极客量身定制，呈现赛博前卫的视觉冲击力。',
                'primary'          => '#6366f1',
                'primary_hover'    => '#4f46e5',
                'primary_light'    => '#eef2ff',
                'primary_gradient' => 'linear-gradient(135deg, #4f46e5 0%, #818cf8 100%)',
                'accent'           => '#ec4899',
                'preview_colors'   => ['#6366f1', '#4f46e5', '#eef2ff', '#ec4899']
            ]
        ];
    }

    /**
     * 获取当前生效的视觉主题风格配置
     */
    public function getCurrentThemeStyle(): array
    {
        $sql = "SELECT `config_key`, `config_value` FROM `{$this->p}sys_config` WHERE `config_key` IN ('theme_style', 'theme_primary_color', 'theme_hover_color', 'theme_light_color', 'theme_accent_color', 'theme_gradient', 'industry_template')";
        $rows = $this->db->fetchAll($sql);
        $configs = [];
        foreach ($rows as $r) {
            $configs[$r['config_key']] = $r['config_value'];
        }

        $list = $this->getThemeStyleList();
        $themeMap = [];
        foreach ($list as $item) {
            $themeMap[$item['key']] = $item;
        }

        // 默认按当前行业业务模板自动推荐初始风格
        $industry = $configs['industry_template'] ?? 'universal';
        $defaultKey = 'tech_blue';
        if ($industry === 'scrap') {
            $defaultKey = 'eco_green';
        } elseif ($industry === 'auto') {
            $defaultKey = 'sunset_orange';
        } elseif ($industry === 'luxury') {
            $defaultKey = 'luxury_gold';
        } elseif ($industry === 'appliance') {
            $defaultKey = 'cyan_fresh';
        }

        $currentKey = !empty($configs['theme_style']) ? $configs['theme_style'] : $defaultKey;

        // 若为自定义配色
        if ($currentKey === 'custom') {
            $customPrimary = !empty($configs['theme_primary_color']) ? $configs['theme_primary_color'] : '#1e58ff';
            return [
                'key'              => 'custom',
                'name'             => '个性化自定义色',
                'badge_text'       => '企业定制',
                'recommend_for'    => '企业特定品牌 VI 定制',
                'desc'             => '由管理员自由指定的主题主色调与专属渐变体系。',
                'primary'          => $customPrimary,
                'primary_hover'    => !empty($configs['theme_hover_color']) ? $configs['theme_hover_color'] : $customPrimary,
                'primary_light'    => !empty($configs['theme_light_color']) ? $configs['theme_light_color'] : '#f8fafc',
                'primary_gradient' => !empty($configs['theme_gradient']) ? $configs['theme_gradient'] : "linear-gradient(135deg, {$customPrimary} 0%, #3b82f6 100%)",
                'accent'           => !empty($configs['theme_accent_color']) ? $configs['theme_accent_color'] : '#10b981',
                'preview_colors'   => [$customPrimary, '#3b82f6', '#f8fafc', '#10b981']
            ];
        }

        return $themeMap[$currentKey] ?? $themeMap['tech_blue'];
    }

    /**
     * 切换全站视觉主题风格模版 (无损换肤，绝不改动任何业务品类与订单数据)
     */
    public function switchThemeStyle(string $themeKey, array $customColors = []): array
    {
        $list = $this->getThemeStyleList();
        $target = null;
        foreach ($list as $item) {
            if ($item['key'] === $themeKey) {
                $target = $item;
                break;
            }
        }

        $now = time();
        $p = $this->p;

        if ($themeKey === 'custom') {
            $primary = !empty($customColors['primary']) ? trim($customColors['primary']) : '#1e58ff';
            $hover = !empty($customColors['hover']) ? trim($customColors['hover']) : $primary;
            $light = !empty($customColors['light']) ? trim($customColors['light']) : '#f8fafc';
            $accent = !empty($customColors['accent']) ? trim($customColors['accent']) : '#10b981';
            $gradient = !empty($customColors['gradient']) ? trim($customColors['gradient']) : "linear-gradient(135deg, {$primary} 0%, #3b82f6 100%)";

            $configsToSave = [
                'theme_style'         => 'custom',
                'theme_primary_color' => $primary,
                'theme_hover_color'   => $hover,
                'theme_light_color'   => $light,
                'theme_accent_color'  => $accent,
                'theme_gradient'      => $gradient,
            ];
            foreach ($configsToSave as $k => $v) {
                $sql = "INSERT INTO `{$p}sys_config` (`group_name`, `config_key`, `config_value`, `updated_at`) 
                        VALUES ('system', ?, ?, ?) 
                        ON DUPLICATE KEY UPDATE `config_value` = VALUES(`config_value`), `updated_at` = VALUES(`updated_at`)";
                $this->db->execute($sql, [$k, $v, $now]);
            }

            CacheService::getInstance()->clear();
            return [
                'code' => 200,
                'msg'  => '个性化自定义主题风格已成功保存并即时生效！',
                'data' => $this->getCurrentThemeStyle()
            ];
        }

        if (!$target) {
            return ['code' => 400, 'msg' => '未知的主题风格类型: ' . $themeKey];
        }

        // 保存内置主题设置
        $sql = "INSERT INTO `{$p}sys_config` (`group_name`, `config_key`, `config_value`, `updated_at`) 
                VALUES ('system', 'theme_style', ?, ?) 
                ON DUPLICATE KEY UPDATE `config_value` = VALUES(`config_value`), `updated_at` = VALUES(`updated_at`)";
        $this->db->execute($sql, [$themeKey, $now]);

        // 清理缓存
        CacheService::getInstance()->clear();

        return [
            'code' => 200,
            'msg'  => '全站主题风格已成功切换为【' . $target['name'] . '】，前台已实时生效！',
            'data' => $target
        ];
    }
}
