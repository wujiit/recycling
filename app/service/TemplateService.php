<?php
/**
 * 启灵同城服务系统 - 多行业业务模板引擎服务
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
            $this->upgradeDeviceIcons();
            $this->upgradeBannerAndHeroConfigs();

            // 成功执行一次后写入 30 天缓存标记，杜绝高频只读请求下的重复写锁与探测
            CacheService::getInstance()->set('sys_schema_upgraded_v3', 1, 86400 * 30);
        } catch (\Throwable $e) {
            // 静默容错
        }
    }

    /**
     * 获取支持的行业业务模板元信息
     */

    private function upgradeDeviceIcons(): void
    {
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
    }

    private function upgradeBannerAndHeroConfigs(): void
    {
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

        // 检查并初始化文章单页数据表
        $checkArticle = $this->db->fetchOne("SHOW TABLES LIKE '{$this->p}rc_article'");
        if (!$checkArticle) {
            try {
                new \App\Model\ArticleModel();
            } catch (\Throwable $e) {
                // 忽略错误
            }
        }

        // 检查并初始化优惠券数据表
        $checkCoupon = $this->db->fetchOne("SHOW TABLES LIKE '{$this->p}rc_coupon'");
        if (!$checkCoupon) {
            try {
                new \App\Model\CouponModel();
            } catch (\Throwable $e) {
                // 忽略错误
            }
        }

        // 检查并补齐首屏基础配置
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
    }

    public function getTemplateList(): array
    {
        return [
            $this->buildUniversalTemplateDef(),
            $this->buildScrapTemplateDef(),
            $this->buildAutoTemplateDef(),
            $this->buildDigitalTemplateDef(),
            $this->buildLuxuryTemplateDef(),
            $this->buildApplianceTemplateDef(),
        ];
    }

    private function buildUniversalTemplateDef(): array
    {
        return [
            'key'         => 'universal',
            'name'        => '综合全品类大平台模式',
            'icon'        => 'universal',
            'theme_color' => '#1e58ff',
            'site_name'   => '启灵同城服务平台',
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
        ];
    }

    private function buildScrapTemplateDef(): array
    {
        return [
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
                ['name' => '工业特级重废钢 (厚度≥6mm)', 'price' => '¥2,920.00', '吨' => '吨', 'unit' => '吨', 'img' => '/uploads/default/scrap_steel.svg'],
                ['name' => '汽车启动铅酸免维护电瓶', 'price' => '¥9.80', 'unit' => '公斤', 'img' => '/uploads/default/scrap_battery.svg'],
                ['name' => '纯一级纸箱纸板 (无水分)', 'price' => '¥1,480.00', 'unit' => '吨', 'img' => '/uploads/default/scrap_paper.svg']
            ],
            'preview_features' => ['今日再生资源挂牌指导价行情大看板', '专业电子地磅上门过磅称重', '散料打包与大宗批量阶梯加价补贴', '现场现金/对公转账秒结'],
            'preview_questions' => ['含杂质率与纯净度评估', '存放形态与托盘捆扎状态', '交投预估规模与整车补贴']
        ];
    }

    private function buildAutoTemplateDef(): array
    {
        return [
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
        ];
    }

    private function buildDigitalTemplateDef(): array
    {
        return [
            'key'         => 'digital',
            'name'        => '数码 3C 精品回收模式',
            'icon'        => 'digital',
            'theme_color' => '#2563eb',
            'site_name'   => '启灵数码 · 专业二手手机数码回收平台',
            'slogan'      => '闲置手机电脑平板高价回收 · 顺丰免费上门包邮 · 验机极速到账',
            'desc'        => '专注手机、笔记本、平板电脑、单反相机与智能穿戴，在线评估成色快速报价。',
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
        ];
    }

    private function buildLuxuryTemplateDef(): array
    {
        return [
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
        ];
    }

    private function buildApplianceTemplateDef(): array
    {
        return [
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

        // 自动同步写入小程序端全套行业自适应配置 (导航标题、色彩、首屏文案、保障、流程与单位)
        $miniappDefaults = $this->getMiniappDefaultsForTemplate($templateKey, $target);
        foreach ($miniappDefaults as $mKey => $mVal) {
            $mSql = "INSERT INTO `{$this->p}sys_config` (`group_name`, `config_key`, `config_value`, `remark`, `updated_at`) 
                    VALUES ('wechat', ?, ?, '行业模板小程序同步配置', ?) 
                    ON DUPLICATE KEY UPDATE `config_value` = VALUES(`config_value`), `updated_at` = VALUES(`updated_at`)";
            $this->db->execute($mSql, [$mKey, (string)$mVal, $now]);
        }
        // 清理小程序自定义品类缓存，让小程序展示新模板注入的真实品类
        $this->db->execute("UPDATE `{$this->p}sys_config` SET `config_value` = '' WHERE `config_key` = 'miniapp_custom_categories'");

        // 2. 若选择重新装载行业数据
        if ($initData) {
            $this->seedIndustryData($templateKey);
        }

        // 清理缓存 (保护用户/管理员登录 Token)
        try {
            $cache = CacheService::getInstance();
            if (method_exists($cache, 'clearTemplateCache')) {
                $cache->clearTemplateCache();
            } else {
                $cache->clear(true);
            }
        } catch (\Throwable $ce) {}

        return [
            'code' => 200,
            'msg'  => '行业模板已切换为【' . $target['name'] . '】，预置库已同步更新！',
            'data' => $target
        ];
    }

    /**
     * 依据当前生效的行业模板或行业场景，一键同步小程序全套装修配置
     */
    public function syncMiniappToCurrentTemplate(): array
    {
        $currentKey = $this->getCurrentTemplateKey();
        $target = $this->getCurrentTemplateMeta();
        $now = time();

        $miniappDefaults = $this->getMiniappDefaultsForTemplate($currentKey, $target);
        foreach ($miniappDefaults as $mKey => $mVal) {
            $sql = "INSERT INTO `{$this->p}sys_config` (`group_name`, `config_key`, `config_value`, `remark`, `updated_at`) 
                    VALUES ('wechat', ?, ?, '行业模板小程序同步配置', ?) 
                    ON DUPLICATE KEY UPDATE `config_value` = VALUES(`config_value`), `updated_at` = VALUES(`updated_at`)";
            $this->db->execute($sql, [$mKey, (string)$mVal, $now]);
        }
        $this->db->execute("UPDATE `{$this->p}sys_config` SET `config_value` = '' WHERE `config_key` = 'miniapp_custom_categories'");

        try {
            $cache = CacheService::getInstance();
            if (method_exists($cache, 'clearTemplateCache')) {
                $cache->clearTemplateCache();
            } else {
                $cache->clear(true);
            }
        } catch (\Throwable $ce) {}

        return [
            'code' => 200,
            'msg'  => '已成功将小程序端装修同步为【' . $target['name'] . '】专属风格！',
            'data' => $miniappDefaults
        ];
    }

    /**
     * 获取指定行业模板对应的小程序默认装修配置
     */
    public function getMiniappDefaultsForTemplate(string $key, array $target = []): array
    {
        switch ($key) {
            case 'scrap':
                return [
                    'miniapp_theme_color'            => '#10b981',
                    'miniapp_nav_title'              => '启灵再生 · 废品物资回收',
                    'miniapp_nav_bg'                 => 'gradient',
                    'miniapp_search_placeholder'     => '搜索废铜 / 废铝 / 废铁 / 动力电池 / 废纸板...',
                    'miniapp_hero_tag'               => '上门过磅 · 现金秒结',
                    'miniapp_hero_title'             => '废旧物资再生 · 绿色循环倡导',
                    'miniapp_hero_subtitle'          => '废铜废铝废钢 · 电线电缆 · 动力电池 · 上门过磅结算',
                    'miniapp_category_title'         => '废旧物资与再生品类',
                    'miniapp_hot_title'              => '今日主营大宗物资回收',
                    'miniapp_guarantee_1'            => '专业电子地磅',
                    'miniapp_guarantee_2'            => '免费上门拆运',
                    'miniapp_guarantee_3'            => '大宗阶梯加价',
                    'miniapp_guarantee_4'            => '现场现金秒结',
                    'miniapp_process_title'          => '简单三步 · 上门过磅变现',
                    'miniapp_step_1_title'           => '查行情选品类',
                    'miniapp_step_1_desc'            => '查看实时指导牌价',
                    'miniapp_step_2_title'           => '专车上门过磅',
                    'miniapp_step_2_desc'            => '专业拆装清运',
                    'miniapp_step_3_title'           => '现场称重结算',
                    'miniapp_step_3_desc'            => '现金对公秒到账',
                    'miniapp_tab_home_name'          => '首页',
                    'miniapp_tab_estimate_name'      => '物资回收',
                    'miniapp_tab_order_name'         => '回收订单',
                    'miniapp_tab_user_name'          => '我的',
                    'miniapp_coupon_sec_title'       => '大宗批量加价补贴专区',
                    'miniapp_coupon_sec_tag'         => '阶梯加价',
                    'miniapp_privacy_title'          => '计量公正与资金安全保障',
                    'miniapp_privacy_content'        => '平台所有上门车辆均配备经过国家质监局检定的高精度电子地磅与便携秤，支持当面校秤。称重结算后款项现场秒结，对公对私均可即时打款。',
                    'miniapp_about_title'            => '关于启灵再生资源回收',
                    'miniapp_about_content'          => '启灵再生资源回收网专注废旧金属、工业物资、电线电缆与废纸板的回收与绿色循环再生，致力于为工厂企业与居民提供正规、高效、高价的回收服务。'
                ];
            case 'auto':
                return [
                    'miniapp_theme_color'            => '#ea580c',
                    'miniapp_nav_title'              => '启灵收车 · 二手车与报废车',
                    'miniapp_nav_bg'                 => 'gradient',
                    'miniapp_search_placeholder'     => '搜索车型，如：丰田卡罗拉 / 特斯拉 / 报废车补贴...',
                    'miniapp_hero_tag'               => '免费上门拖车 · 当天过户',
                    'miniapp_hero_title'             => '全国二手车与报废车高价回收',
                    'miniapp_hero_subtitle'          => '全国免费上门验车拖车 · 当天过户 · 当面结清全款',
                    'miniapp_category_title'         => '车辆回收与报废拆解品类',
                    'miniapp_hot_title'              => '热门回收与报废车型',
                    'miniapp_guarantee_1'            => '全国免费拖车',
                    'miniapp_guarantee_2'            => '当天合法过户',
                    'miniapp_guarantee_3'            => '正规拆解残值',
                    'miniapp_guarantee_4'            => '验车合格结清',
                    'miniapp_process_title'          => '简单三步 · 车辆高效变现',
                    'miniapp_step_1_title'           => '快速在线估车',
                    'miniapp_step_1_desc'            => '输入车型年限里程',
                    'miniapp_step_2_title'           => '免费上门验车',
                    'miniapp_step_2_desc'            => '专人专车上门拖运',
                    'miniapp_step_3_title'           => '签约过户打款',
                    'miniapp_step_3_desc'            => '全款即刻到账',
                    'miniapp_tab_home_name'          => '首页',
                    'miniapp_tab_estimate_name'      => '在线估车',
                    'miniapp_tab_order_name'         => '收车订单',
                    'miniapp_tab_user_name'          => '我的',
                    'miniapp_coupon_sec_title'       => '二手车成交补贴券专区',
                    'miniapp_coupon_sec_tag'         => '最高补贴¥1000',
                    'miniapp_privacy_title'          => '车辆合法过户与权益保障',
                    'miniapp_privacy_content'        => '平台承诺所有收车业务均签订正规二手车买卖合同或报废拆解协议，当天办结过户手续或出具车管所正规注销证明，彻底免除原车主的后顾之忧。',
                    'miniapp_about_title'            => '关于启灵收车',
                    'miniapp_about_content'          => '启灵收车是正规资质的二手车与机动车报废综合服务平台，服务覆盖乘用车、新能源车、商用车与老旧机动车残值置换。'
                ];
            case 'luxury':
                return [
                    'miniapp_theme_color'            => '#d97706',
                    'miniapp_nav_title'              => '启灵名品 · 奢侈品名表黄金',
                    'miniapp_nav_bg'                 => 'gradient',
                    'miniapp_search_placeholder'     => '搜索名表 / 黄金首饰 / 大牌包袋 / 钻石珠宝...',
                    'miniapp_hero_tag'               => '中检权威鉴定 · 实时金价',
                    'miniapp_hero_title'             => '名表黄金奢侈品 · 尊享高额变现',
                    'miniapp_hero_subtitle'          => '足金999按日实时结算 · 瑞士名表大牌箱包 · 顺丰保价密封',
                    'miniapp_category_title'         => '名品鉴定与高额变现品类',
                    'miniapp_hot_title'              => '热门名表与黄金珠宝变现',
                    'miniapp_guarantee_1'            => '中检双重复核',
                    'miniapp_guarantee_2'            => '国际金价联动',
                    'miniapp_guarantee_3'            => '顺丰保价密封',
                    'miniapp_guarantee_4'            => '大额即刻放款',
                    'miniapp_process_title'          => '简单三步 · 尊享高额变现',
                    'miniapp_step_1_title'           => '在线估价测金',
                    'miniapp_step_1_desc'            => '实时国际牌价换算',
                    'miniapp_step_2_title'           => '保价寄件/到店',
                    'miniapp_step_2_desc'            => '专人保价密封箱',
                    'miniapp_step_3_title'           => '中检复核放款',
                    'miniapp_step_3_desc'            => '大额网银即刻到账',
                    'miniapp_tab_home_name'          => '首页',
                    'miniapp_tab_estimate_name'      => '名品估价',
                    'miniapp_tab_order_name'         => '变现订单',
                    'miniapp_tab_user_name'          => '我的',
                    'miniapp_coupon_sec_title'       => '名品变现尊享加价礼券',
                    'miniapp_coupon_sec_tag'         => '大额加价',
                    'miniapp_privacy_title'          => '中检权威鉴定与密封押运保障',
                    'miniapp_privacy_content'        => '平台拥有资深中检奢侈品鉴定师团队，配备无损贵金属光谱仪与显微仪器。所有邮寄品均采用顺丰全额保价与防伪一次性密封箱，全程高清无死角拆封监控。',
                    'miniapp_about_title'            => '关于启灵名品',
                    'miniapp_about_content'          => '启灵名品深耕名表、珠宝黄金与奢侈品箱包回收、典当与流转，以透明牌价与严谨鉴定赢得客户信赖。'
                ];
            case 'appliance':
                return [
                    'miniapp_theme_color'            => '#0891b2',
                    'miniapp_nav_title'              => '启灵家电 · 废旧大家电拆旧',
                    'miniapp_nav_bg'                 => 'gradient',
                    'miniapp_search_placeholder'     => '搜索空调 / 冰箱 / 洗衣机 / 电视机拆旧...',
                    'miniapp_hero_tag'               => '免费拆装搬运 · 免楼层费',
                    'miniapp_hero_title'             => '废旧大家电 · 专业上门拆旧',
                    'miniapp_hero_subtitle'          => '家用商用空调·冰箱洗衣机·电视机·免费上门拆机搬运',
                    'miniapp_category_title'         => '大家电回收品类',
                    'miniapp_hot_title'              => '热门拆旧大家电品类',
                    'miniapp_guarantee_1'            => '专业工具拆装',
                    'miniapp_guarantee_2'            => '免楼层搬运费',
                    'miniapp_guarantee_3'            => '现场通电验机',
                    'miniapp_guarantee_4'            => '现金当面结清',
                    'miniapp_process_title'          => '简单三步 · 轻松拆旧换新',
                    'miniapp_step_1_title'           => '在线预约登记',
                    'miniapp_step_1_desc'            => '选家电预约时段',
                    'miniapp_step_2_title'           => '师傅上门拆机',
                    'miniapp_step_2_desc'            => '专业工具防磕碰',
                    'miniapp_step_3_title'           => '现场验机付款',
                    'miniapp_step_3_desc'            => '当面结清全额款项',
                    'miniapp_tab_home_name'          => '首页',
                    'miniapp_tab_estimate_name'      => '家电拆旧',
                    'miniapp_tab_order_name'         => '拆旧订单',
                    'miniapp_tab_user_name'          => '我的',
                    'miniapp_coupon_sec_title'       => '家电拆旧以旧换新补贴',
                    'miniapp_coupon_sec_tag'         => '限时立补',
                    'miniapp_privacy_title'          => '安全拆机与墙体防护承诺',
                    'miniapp_privacy_content'        => '专业拆装师傅均具备高空与电工持证资质，拆装作业铺设防尘保护垫，确保墙面、地板与窗台不受损坏，拆完现场清理整洁。',
                    'miniapp_about_title'            => '关于启灵家电拆旧',
                    'miniapp_about_content'          => '启灵家电拆旧网专注家用与商用空调、冰箱、洗衣机、电视机等大件家电的安全拆卸、搬运与绿色循环再制造。'
                ];
            case 'digital':
                return [
                    'miniapp_theme_color'            => '#2563eb',
                    'miniapp_nav_title'              => '启灵数码 · 专业二手手机数码',
                    'miniapp_nav_bg'                 => 'gradient',
                    'miniapp_search_placeholder'     => '搜索你想卖的手机 / 平板 / 电脑型号...',
                    'miniapp_hero_tag'               => '官方报价 · 顺丰免费包邮',
                    'miniapp_hero_title'             => '专业二手手机数码 · 高价变现',
                    'miniapp_hero_subtitle'          => '闲置手机电脑平板高价回收 · 顺丰免费上门包邮 · 极速验机到账',
                    'miniapp_category_title'         => '全品类数码回收',
                    'miniapp_hot_title'              => '大家都在卖 · 热门回收机型',
                    'miniapp_guarantee_1'            => '隐私深度清除',
                    'miniapp_guarantee_2'            => '顺丰双向包邮',
                    'miniapp_guarantee_3'            => '官方严苛验机',
                    'miniapp_guarantee_4'            => '当天极速打款',
                    'miniapp_process_title'          => '简单三步 · 轻松变现',
                    'miniapp_step_1_title'           => '在线选项估价',
                    'miniapp_step_1_desc'            => '30秒快速测机',
                    'miniapp_step_2_title'           => '顺丰上门包邮',
                    'miniapp_step_2_desc'            => '双向保价免密',
                    'miniapp_step_3_title'           => '验机确认打款',
                    'miniapp_step_3_desc'            => '直达微信零钱',
                    'miniapp_tab_home_name'          => '首页',
                    'miniapp_tab_estimate_name'      => '估价回收',
                    'miniapp_tab_order_name'         => '订单明细',
                    'miniapp_tab_user_name'          => '我的',
                    'miniapp_coupon_sec_title'       => '数码回收加价补贴专区',
                    'miniapp_coupon_sec_tag'         => '最高立补 ¥300',
                    'miniapp_privacy_title'          => '隐私数据清除安全保障',
                    'miniapp_privacy_content'        => '平台采用专业数据擦除技术，对设备存储介质进行全盘覆写清除，出具《隐私数据清除报告》，杜绝个人数据残留，保障您的个人隐私安全。',
                    'miniapp_about_title'            => '关于启灵数码',
                    'miniapp_about_content'          => '启灵数码是官方直营的数字化全品类二手回收服务平台，深耕绿色循环经济。通过自动化质检流水线与专业估价模型，为广大用户提供高价、安全、便捷、透明的一站式闲置变现服务。'
                ];
            case 'universal':
            default:
                return [
                    'miniapp_theme_color'            => '#1e58ff',
                    'miniapp_nav_title'              => '启灵同城服务 · 全品类综合平台',
                    'miniapp_nav_bg'                 => 'gradient',
                    'miniapp_search_placeholder'     => '搜索数码 / 废品物资 / 二手车 / 奢侈品 / 家电...',
                    'miniapp_hero_tag'               => '全品类高价回收 · 官方直营',
                    'miniapp_hero_title'             => '启灵全品类同城服务与高价回收',
                    'miniapp_hero_subtitle'          => '涵盖数码·废旧物资·汽车·奢侈品·家电的一站式高价回收平台',
                    'miniapp_category_title'         => '全品类回收与服务',
                    'miniapp_hot_title'              => '热门回收与精选服务推荐',
                    'miniapp_guarantee_1'            => '官方标准估价',
                    'miniapp_guarantee_2'            => '全渠道履约上门',
                    'miniapp_guarantee_3'            => '隐私彻底清除',
                    'miniapp_guarantee_4'            => '秒级安全放款',
                    'miniapp_process_title'          => '简单三步 · 轻松履约变现',
                    'miniapp_step_1_title'           => '在线快捷估价',
                    'miniapp_step_1_desc'            => '多品类自由选',
                    'miniapp_step_2_title'           => '顺丰/上门/到店',
                    'miniapp_step_2_desc'            => '全渠道便捷交割',
                    'miniapp_step_3_title'           => '验收极速打款',
                    'miniapp_step_3_desc'            => '资金秒级直达',
                    'miniapp_tab_home_name'          => '首页',
                    'miniapp_tab_estimate_name'      => '业务分类',
                    'miniapp_tab_order_name'         => '我的订单',
                    'miniapp_tab_user_name'          => '个人中心',
                    'miniapp_coupon_sec_title'       => '平台新人补贴专区',
                    'miniapp_coupon_sec_tag'         => '限时礼券',
                    'miniapp_privacy_title'          => '全流程服务质保与隐私保障',
                    'miniapp_privacy_content'        => '启灵同城综合服务平台实行100%实名制与资质核验，数码设备专业擦除隐私，上门服务由官方全流程质保，保障每位用户的合法权益。',
                    'miniapp_about_title'            => '关于启灵同城服务',
                    'miniapp_about_content'          => '启灵同城服务是集二手高价回收、废旧物资循环、家政便民与上门维修于一体的综合数字化便民服务平台。'
                ];
        }
    }

    /**
     * 获取行业特色行情大看板数据 (废品行情、国际金价、二手车评估卡片)
     */
    public function getIndustryMarketBoards(string $templateKey = ''): array
    {
        if (empty($templateKey)) {
            $templateKey = $this->getCurrentTemplateKey();
        }
        if ($templateKey === 'scrap') {
            return [
                'type'     => 'scrap',
                'title'    => '今日再生资源挂牌指导价行情看板',
                'subtitle' => '实时行情更新 · 专业电子地磅 · 现场现金/对公秒结',
                'badge'    => '实时行情',
                'btn_text' => '呼叫师傅上门过磅称重',
                'items'    => [
                    ['name' => '光亮紫铜线 (纯度≥99.9%)', 'price' => '68.50', 'unit' => '公斤', 'trend' => 'up', 'diff' => '+0.80', 'color' => '#ef4444'],
                    ['name' => '6063 铝合金型材', 'price' => '18.20', 'unit' => '公斤', 'trend' => 'flat', 'diff' => '走势平稳', 'color' => '#10b981'],
                    ['name' => '统包一级废纸板', 'price' => '1,450', 'unit' => '吨', 'trend' => 'down', 'diff' => '-20.0', 'color' => '#3b82f6'],
                    ['name' => '动力铅酸蓄电池', 'price' => '8.80', 'unit' => '公斤', 'trend' => 'up', 'diff' => '+0.30', 'color' => '#f59e0b'],
                    ['name' => '工业特级重废钢 (≥6mm)', 'price' => '2,920', 'unit' => '吨', 'trend' => 'up', 'diff' => '+15.0', 'color' => '#6366f1'],
                ]
            ];
        } elseif ($templateKey === 'luxury') {
            return [
                'type'     => 'luxury',
                'title'    => '今日贵金属国际行情折算牌价',
                'subtitle' => '权威中检质检师双重复核 · 顺丰全额保价密封箱 · 克重秒级结算',
                'badge'    => '中检权威背书',
                'btn_text' => '实时金价折算',
                'items'    => [
                    ['name' => '足金 999.9 回收价', 'price' => '585.50', 'unit' => '克', 'trend' => 'up', 'diff' => '按日国际联动', 'color' => '#d97706'],
                    ['name' => '18K 黄金 / 玫瑰金', 'price' => '422.00', 'unit' => '克', 'trend' => 'up', 'diff' => '光谱仪精准测定', 'color' => '#b45309'],
                    ['name' => 'Pt950 铂金首饰', 'price' => '238.00', 'unit' => '克', 'trend' => 'flat', 'diff' => '纯度无损测定', 'color' => '#475569'],
                    ['name' => '瑞士名表大牌专柜', 'price' => '4 - 8 折', 'unit' => '公价', 'trend' => 'up', 'diff' => '劳力士/欧米茄专收', 'color' => '#d97706'],
                ]
            ];
        } elseif ($templateKey === 'auto') {
            return [
                'type'     => 'auto',
                'title'    => '全国二手车与报废车高价回收专区',
                'subtitle' => '全国免费上门验车拖车 · 当天合法过户 · 报废车拆解补贴申领',
                'badge'    => '全国免费拖车',
                'btn_text' => '快速在线估车',
                'items'    => [
                    ['name' => '家用燃油乘用车', 'price' => '高出市场 10%', 'unit' => '行情', 'trend' => 'up', 'diff' => '当天合法过户', 'color' => '#ea580c'],
                    ['name' => '新能源纯电/混动', 'price' => '电池专项评估', 'unit' => '残值', 'trend' => 'up', 'diff' => '上门安全拖运', 'color' => '#10b981'],
                    ['name' => '机动车报废拆解', 'price' => '最高¥3,500', 'unit' => '辆', 'trend' => 'up', 'diff' => '申领国家残值补贴', 'color' => '#ef4444'],
                ]
            ];
        }
        return [];
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

            switch ($key) {
                case 'scrap':
                    $this->seedScrapData($p, $now);
                    break;
                case 'auto':
                    $this->seedAutoData($p, $now);
                    break;
                case 'digital':
                    $this->seedDigitalData($p, $now);
                    break;
                case 'luxury':
                    $this->seedLuxuryData($p, $now);
                    break;
                case 'appliance':
                    $this->seedApplianceData($p, $now);
                    break;
                default:
                    $this->seedDefaultData($p, $now);
                    break;
            }

            $this->db->commit();
        } catch (\Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    private function seedScrapData(string $p, int $now): void
    {
                // =============== 废品再生资源专属数据 ===============
                $cats = [
                    [1, '废铜线缆', '/uploads/cat_copper.png', '公斤', 100],
                    [2, '废铝合金', '/uploads/cat_aluminum.png', '公斤', 90],
                    [3, '废铁废钢', '/uploads/cat_steel.png', '吨', 80],
                    [4, '铅酸电瓶', '/uploads/cat_battery.png', '公斤', 70],
                    [5, '废旧纸板', '/uploads/cat_paper.png', '吨', 60]
                ];
                $this->batchInsert("{$p}rc_category", ['id', 'name', 'icon', 'unit', 'sort', 'is_show', 'created_at'], array_map(function($c) use ($now) {
                    return [$c[0], $c[1], $c[2], $c[3], $c[4], 1, $now];
                }, $cats));

                $brands = [
                    [1, 1, '国标特级纯料', 'G', 100],
                    [2, 1, '工业漆包拆机料', 'G', 90],
                    [3, 2, '断桥门窗原厂料', 'D', 80],
                    [4, 3, '重废打包统料', 'Z', 70],
                    [5, 4, '汽车专用电瓶', 'Q', 60],
                    [6, 5, '一级超市黄板纸', 'Y', 50]
                ];
                $this->batchInsert("{$p}rc_brand", ['id', 'category_id', 'name', 'first_letter', 'sort', 'created_at'], array_map(function($b) use ($now) {
                    return [$b[0], $b[1], $b[2], $b[3], $b[4], $now];
                }, $brands));

                $devices = [
                    [1, 1, 1, '1# 特级光亮紫铜线 (纯度≥99.9%)', '/uploads/default/scrap_copper.svg', 69.50, '公斤', 100, 1],
                    [2, 1, 2, '2# 电机马达铜 / 漆包线铜', '/uploads/default/scrap_copper.svg', 63.80, '公斤', 90, 1],
                    [3, 1, 1, '黄铜铜水嘴 / 水暖阀门件', '/uploads/default/scrap_copper.svg', 42.50, '公斤', 80, 0],
                    [4, 2, 3, '纯铝合金断桥门窗型材料', '/uploads/default/scrap_aluminum.svg', 18.50, '公斤', 95, 1],
                    [5, 3, 4, '工业特级重废钢 (厚度≥6mm)', '/uploads/default/scrap_steel.svg', 2920.00, '吨', 85, 1],
                    [6, 4, 5, '汽车启动铅酸免维护电瓶', '/uploads/default/scrap_battery.svg', 9.80, '公斤', 90, 1],
                    [7, 5, 6, '纯一级纸箱纸板 (无水分)', '/uploads/default/scrap_paper.svg', 1480.00, '吨', 75, 1]
                ];
                $this->batchInsert("{$p}rc_device", ['id', 'category_id', 'brand_id', 'name', 'cover_img', 'guide_price', 'unit', 'sort', 'is_hot', 'status', 'created_at', 'updated_at'], array_map(function($d) use ($now) {
                    return [$d[0], $d[1], $d[2], $d[3], $d[4], $d[5], $d[6], $d[7], $d[8], 1, $now, $now];
                }, $devices));

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
    }

    private function seedAutoData(string $p, int $now): void
    {
                // =============== 二手汽车与报废车专属数据 ===============
                $cats = [
                    [1, '燃油轿车', '/uploads/cat_sedan.png', '万元/辆', 100],
                    [2, '新能源车', '/uploads/cat_ev.png', '万元/辆', 90],
                    [3, '报废汽车', '/uploads/cat_scrap_car.png', '元/辆', 80],
                    [4, 'SUV商务', '/uploads/cat_suv.png', '万元/辆', 70],
                    [5, '货车微面', '/uploads/cat_truck.png', '万元/辆', 60]
                ];
                $this->batchInsert("{$p}rc_category", ['id', 'name', 'icon', 'unit', 'sort', 'is_show', 'created_at'], array_map(function($c) use ($now) {
                    return [$c[0], $c[1], $c[2], $c[3], $c[4], 1, $now];
                }, $cats));

                $brands = [
                    [1, 1, '丰田 Toyota', 'T', 100],
                    [2, 1, '大众 Volkswagen', 'D', 90],
                    [3, 2, '特斯拉 Tesla', 'T', 95],
                    [4, 2, '比亚迪 BYD', 'B', 90],
                    [5, 1, '宝马 BMW', 'B', 85],
                    [6, 3, '全国各品牌报废车', 'B', 80]
                ];
                $this->batchInsert("{$p}rc_brand", ['id', 'category_id', 'name', 'first_letter', 'sort', 'created_at'], array_map(function($b) use ($now) {
                    return [$b[0], $b[1], $b[2], $b[3], $b[4], $now];
                }, $brands));

                $devices = [
                    [1, 1, 1, '丰田 卡罗拉 1.2T CVT 精英版', '/uploads/default/car_corolla.svg', 62000.00, '元/辆', 100, 1],
                    [2, 2, 3, '特斯拉 Model 3 标准续航升级版', '/uploads/default/car_tesla.svg', 128000.00, '元/辆', 95, 1],
                    [3, 2, 4, '比亚迪 宋PLUS DM-i 110KM', '/uploads/default/car_tesla.svg', 98000.00, '元/辆', 90, 1],
                    [4, 1, 5, '宝马 5系 530Li 领先型 豪华版', '/uploads/default/car_corolla.svg', 225000.00, '元/辆', 85, 1],
                    [5, 3, 6, '小型家用客车整车报废拆解补贴', '/uploads/default/car_scrap.svg', 3200.00, '元/辆', 90, 1],
                    [6, 3, 6, '大型柴油黄标货车报废拆解', '/uploads/default/car_scrap.svg', 6800.00, '元/辆', 80, 0]
                ];
                $this->batchInsert("{$p}rc_device", ['id', 'category_id', 'brand_id', 'name', 'cover_img', 'guide_price', 'unit', 'sort', 'is_hot', 'status', 'created_at', 'updated_at'], array_map(function($d) use ($now) {
                    return [$d[0], $d[1], $d[2], $d[3], $d[4], $d[5], $d[6], $d[7], $d[8], 1, $now, $now];
                }, $devices));

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
    }

    private function seedDigitalData(string $p, int $now): void
    {
                // =============== 数码 3C 精品回收专属数据 ===============
                $cats = [
                    [1, '智能手机', '/uploads/cat_phone.png', '台', 100],
                    [2, '笔记本', '/uploads/cat_laptop.png', '台', 90],
                    [3, '平板电脑', '/uploads/cat_tablet.png', '台', 80],
                    [4, '摄影摄像', '/uploads/cat_camera.png', '台', 70],
                    [5, '智能穿戴', '/uploads/cat_watch.png', '件', 60]
                ];
                $this->batchInsert("{$p}rc_category", ['id', 'name', 'icon', 'unit', 'sort', 'is_show', 'created_at'], array_map(function($c) use ($now) {
                    return [$c[0], $c[1], $c[2], $c[3], $c[4], 1, $now];
                }, $cats));

                $brands = [
                    [1, 1, 'Apple / 苹果', 'A', 100],
                    [2, 1, 'HUAWEI / 华为', 'H', 95],
                    [3, 1, 'Xiaomi / 小米', 'X', 90],
                    [4, 2, 'Apple Mac', 'A', 95],
                    [5, 2, 'Lenovo / 联想', 'L', 85],
                    [6, 4, 'Sony / 索尼', 'S', 90]
                ];
                $this->batchInsert("{$p}rc_brand", ['id', 'category_id', 'name', 'first_letter', 'sort', 'created_at'], array_map(function($b) use ($now) {
                    return [$b[0], $b[1], $b[2], $b[3], $b[4], $now];
                }, $brands));

                $devices = [
                    [1, 1, 1, 'iPhone 15 Pro Max', '/uploads/default/phone_15promax.svg', 6800.00, '台', 100, 1],
                    [2, 1, 2, 'HUAWEI Mate 60 Pro', '/uploads/default/phone_mate60.svg', 5200.00, '台', 95, 1],
                    [3, 1, 3, '小米 14 Ultra', '/uploads/default/phone_mi14.svg', 4800.00, '台', 90, 1],
                    [4, 2, 4, 'MacBook Pro 16寸 M3 Max', '/uploads/default/macbook_pro.svg', 16500.00, '台', 95, 1],
                    [5, 3, 1, 'iPad Pro 12.9寸 M2芯片', '/uploads/default/ipad_pro.svg', 5600.00, '台', 90, 1],
                    [6, 4, 6, '索尼 Alpha 7M4 全画幅机身', '/uploads/default/sony_a7m4.svg', 11500.00, '台', 85, 1]
                ];
                $this->batchInsert("{$p}rc_device", ['id', 'category_id', 'brand_id', 'name', 'cover_img', 'guide_price', 'unit', 'sort', 'is_hot', 'status', 'created_at', 'updated_at'], array_map(function($d) use ($now) {
                    return [$d[0], $d[1], $d[2], $d[3], $d[4], $d[5], $d[6], $d[7], $d[8], 1, $now, $now];
                }, $devices));

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
    }

    private function seedLuxuryData(string $p, int $now): void
    {
                // =============== 奢侈品名表黄金专属数据 ===============
                $cats = [
                    [1, '瑞士名表', '/uploads/cat_watch.png', '件', 100],
                    [2, '黄金首饰', '/uploads/cat_gold.png', '克', 90],
                    [3, '名牌箱包', '/uploads/cat_bag.png', '件', 80],
                    [4, '珠宝首饰', '/uploads/cat_jewelry.png', '件', 70]
                ];
                $this->batchInsert("{$p}rc_category", ['id', 'name', 'icon', 'unit', 'sort', 'is_show', 'created_at'], array_map(function($c) use ($now) {
                    return [$c[0], $c[1], $c[2], $c[3], $c[4], 1, $now];
                }, $cats));

                $brands = [
                    [1, 1, '劳力士 Rolex', 'L', 100],
                    [2, 1, '欧米茄 Omega', 'O', 90],
                    [3, 2, '足金999 / 投资条', 'Z', 100],
                    [4, 3, '爱马仕 Hermès', 'A', 95],
                    [5, 3, '香奈儿 Chanel', 'X', 90]
                ];
                $this->batchInsert("{$p}rc_brand", ['id', 'category_id', 'name', 'first_letter', 'sort', 'created_at'], array_map(function($b) use ($now) {
                    return [$b[0], $b[1], $b[2], $b[3], $b[4], $now];
                }, $brands));

                $devices = [
                    [1, 1, 1, '劳力士 潜航者型黑水鬼 126610LN', '/uploads/default/watch_rolex.svg', 78500.00, '件', 100, 1],
                    [2, 1, 2, '欧米茄 海马系列300米 潜水表', '/uploads/default/watch_rolex.svg', 24500.00, '件', 90, 1],
                    [3, 2, 3, '足金999黄金饰品 / 投资金条', '/uploads/default/luxury_gold.svg', 578.00, '克', 100, 1],
                    [4, 3, 4, '爱马仕 经典Birkin 30手袋', '/uploads/default/dev_default.svg', 95000.00, '件', 95, 1],
                    [5, 3, 5, '香奈儿 Classic Flap 中号黑金', '/uploads/default/dev_default.svg', 42000.00, '件', 90, 1]
                ];
                $this->batchInsert("{$p}rc_device", ['id', 'category_id', 'brand_id', 'name', 'cover_img', 'guide_price', 'unit', 'sort', 'is_hot', 'status', 'created_at', 'updated_at'], array_map(function($d) use ($now) {
                    return [$d[0], $d[1], $d[2], $d[3], $d[4], $d[5], $d[6], $d[7], $d[8], 1, $now, $now];
                }, $devices));

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
    }

    private function seedApplianceData(string $p, int $now): void
    {
                // =============== 二手大家电专属数据 ===============
                $cats = [
                    [1, '冷暖空调', '/uploads/cat_ac.png', '台', 100],
                    [2, '冰箱冰柜', '/uploads/cat_fridge.png', '台', 90],
                    [3, '洗衣机', '/uploads/cat_washer.png', '台', 80],
                    [4, '液晶电视', '/uploads/cat_tv.png', '台', 70]
                ];
                $this->batchInsert("{$p}rc_category", ['id', 'name', 'icon', 'unit', 'sort', 'is_show', 'created_at'], array_map(function($c) use ($now) {
                    return [$c[0], $c[1], $c[2], $c[3], $c[4], 1, $now];
                }, $cats));

                $brands = [
                    [1, 1, '格力 GREE', 'G', 100],
                    [2, 1, '美的 Midea', 'M', 90],
                    [3, 2, '海尔 Haier', 'H', 95],
                    [4, 3, '小天鹅 LittleSwan', 'X', 90],
                    [5, 4, '索尼 SONY', 'S', 90]
                ];
                $this->batchInsert("{$p}rc_brand", ['id', 'category_id', 'name', 'first_letter', 'sort', 'created_at'], array_map(function($b) use ($now) {
                    return [$b[0], $b[1], $b[2], $b[3], $b[4], $now];
                }, $brands));

                $devices = [
                    [1, 1, 1, '格力 1.5匹 变频冷暖挂机空调', '/uploads/default/appliance_ac.svg', 750.00, '台', 100, 1],
                    [2, 1, 2, '美的 3匹 舒适星圆柱立式柜机', '/uploads/default/appliance_ac.svg', 1450.00, '台', 90, 1],
                    [3, 2, 3, '海尔 530升 双开门变频风冷冰箱', '/uploads/default/appliance_fridge.svg', 680.00, '台', 95, 1],
                    [4, 3, 4, '小天鹅 10公斤 水魔方滚筒洗衣机', '/uploads/default/appliance_washer.svg', 520.00, '台', 90, 1],
                    [5, 4, 5, '索尼 75英寸 4K超高清智能电视', '/uploads/default/appliance_tv.svg', 1200.00, '台', 90, 1]
                ];
                $this->batchInsert("{$p}rc_device", ['id', 'category_id', 'brand_id', 'name', 'cover_img', 'guide_price', 'unit', 'sort', 'is_hot', 'status', 'created_at', 'updated_at'], array_map(function($d) use ($now) {
                    return [$d[0], $d[1], $d[2], $d[3], $d[4], $d[5], $d[6], $d[7], $d[8], 1, $now, $now];
                }, $devices));

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
    }

    private function seedDefaultData(string $p, int $now): void
    {
                // =============== 综合全品类大平台模式 (聚合各大类) ===============
                $cats = [
                    [1, '手机数码', '/uploads/cat_phone.png', '台', 100],
                    [2, '废旧物资', '/uploads/cat_copper.png', '公斤', 90],
                    [3, '二手汽车', '/uploads/cat_car.png', '辆', 80],
                    [4, '名表黄金', '/uploads/cat_luxury.png', '件', 70],
                    [5, '二手家电', '/uploads/cat_appliance.png', '台', 60]
                ];
                $this->batchInsert("{$p}rc_category", ['id', 'name', 'icon', 'unit', 'sort', 'is_show', 'created_at'], array_map(function($c) use ($now) {
                    return [$c[0], $c[1], $c[2], $c[3], $c[4], 1, $now];
                }, $cats));

                $brands = [
                    [1, 1, 'Apple / 苹果', 'A', 100],
                    [2, 1, 'HUAWEI / 华为', 'H', 90],
                    [3, 2, '特级工业废铜', 'G', 85],
                    [4, 2, '纯废铝合金型材', 'L', 80],
                    [5, 3, '乘用燃油轿车', 'C', 75],
                    [6, 4, '劳力士 / 瑞士名表', 'L', 70],
                    [7, 5, '格力 / 美的空调', 'G', 65]
                ];
                $this->batchInsert("{$p}rc_brand", ['id', 'category_id', 'name', 'first_letter', 'sort', 'created_at'], array_map(function($b) use ($now) {
                    return [$b[0], $b[1], $b[2], $b[3], $b[4], $now];
                }, $brands));

                $devices = [
                    [1, 1, 1, 'iPhone 15 Pro Max', '/uploads/default/phone_15promax.svg', 6800.00, '台', 100, 1],
                    [2, 1, 2, 'HUAWEI Mate 60 Pro', '/uploads/default/phone_mate60.svg', 5200.00, '台', 95, 1],
                    [3, 2, 3, '1# 特级光亮紫铜线 (无杂质)', '/uploads/default/scrap_copper.svg', 69.50, '公斤', 90, 1],
                    [4, 2, 4, '纯断桥铝合金门窗料', '/uploads/default/scrap_aluminum.svg', 18.50, '公斤', 85, 1],
                    [5, 3, 5, '丰田 卡罗拉 1.2T 精英版', '/uploads/default/car_corolla.svg', 62000.00, '辆', 80, 1],
                    [6, 4, 6, '劳力士 潜航者型黑水鬼', '/uploads/default/watch_rolex.svg', 78000.00, '件', 75, 1],
                    [7, 5, 7, '格力 1.5匹变频冷暖挂机', '/uploads/default/appliance_ac.svg', 650.00, '台', 70, 1]
                ];
                $this->batchInsert("{$p}rc_device", ['id', 'category_id', 'brand_id', 'name', 'cover_img', 'guide_price', 'unit', 'sort', 'is_hot', 'status', 'created_at', 'updated_at'], array_map(function($d) use ($now) {
                    return [$d[0], $d[1], $d[2], $d[3], $d[4], $d[5], $d[6], $d[7], $d[8], 1, $now, $now];
                }, $devices));

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

    /**
     * 获取系统内置的全套视觉主题风格模版列表
     */
    public function getThemeStyleList(): array
    {
        $defs = [
            ['tech_blue', '科技数码蓝', '数码/手机首选', '手机数码 · 笔记本电脑 · 摄影摄像 · 智能硬件', '经典深邃科技蓝，凸显数码智能科技与官方透明验机公信力，是专业手机与数码3C回收的首选标配。', '#1e58ff', '#1645cf', '#eef3ff', 'linear-gradient(135deg, #1e58ff 0%, #3b82f6 100%)', '#10b981', ['#1e58ff', '#3b82f6', '#eef3ff', '#10b981']],
            ['eco_green', '生态环保绿', '废品再生首选', '废旧金属 · 铜铝不锈钢 · 电线电缆 · 废纸电瓶', '自然生机生态绿，传递绿色低碳、变废为宝与循环经济环保理念，特别契合废品回收、再生资源与旧物资行业。', '#10b981', '#059669', '#ecfdf5', 'linear-gradient(135deg, #059669 0%, #10b981 100%)', '#f59e0b', ['#10b981', '#059669', '#ecfdf5', '#f59e0b']],
            ['sunset_orange', '活力日落橙', '二手车/机械首选', '二手汽车 · 机动车报废 · 工业机械 · 动力设备', '朝气蓬勃、热情高效的工业活力橙，彰显全速上门验车拖车与现金秒付的极速履约信赖。', '#ea580c', '#c2410c', '#fff7ed', 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)', '#2563eb', ['#ea580c', '#f97316', '#fff7ed', '#2563eb']],
            ['luxury_gold', '尊贵奢品金', '名表黄金首选', '瑞士名表 · 大牌箱包 · 黄金珠宝 · 奢侈品典当', '沉稳尊贵黑金与琥珀金调性，传递殿堂级奢华品质、权威严谨质检与私密保价回收体验。', '#d97706', '#b45309', '#fef3c7', 'linear-gradient(135deg, #b45309 0%, #d97706 100%)', '#0f172a', ['#d97706', '#b45309', '#fef3c7', '#0f172a']],
            ['cyan_fresh', '清爽极简青', '家电拆旧首选', '二手大家电 · 现代家居 · 拆机搬运 · 全品类大平台', '透亮清爽的大师青蓝，兼具现代简约与安心信赖服务感，尤其适合空调洗衣机等大家电拆旧以旧换新。', '#0891b2', '#0e7490', '#ecfeff', 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)', '#10b981', ['#0891b2', '#06b6d4', '#ecfeff', '#10b981']],
            ['cyber_dark', '极客机甲黑', '潮玩电竞首选', '潮玩手办 · 游戏主机 · 极客显卡 · 年轻数码', '酷炫深邃的机甲电光蓝紫，专为年轻潮流与高阶电竞极客量身定制，呈现赛博前卫的视觉冲击力。', '#6366f1', '#4f46e5', '#eef2ff', 'linear-gradient(135deg, #4f46e5 0%, #818cf8 100%)', '#ec4899', ['#6366f1', '#4f46e5', '#eef2ff', '#ec4899']]
        ];

        return array_map(function ($t) {
            return [
                'key'              => $t[0],
                'name'             => $t[1],
                'badge_text'       => $t[2],
                'recommend_for'    => $t[3],
                'desc'             => $t[4],
                'primary'          => $t[5],
                'primary_hover'    => $t[6],
                'primary_light'    => $t[7],
                'primary_gradient' => $t[8],
                'accent'           => $t[9],
                'preview_colors'   => $t[10],
            ];
        }, $defs);
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

            try {
            $cache = CacheService::getInstance();
            if (method_exists($cache, 'clearTemplateCache')) {
                $cache->clearTemplateCache();
            } else {
                $cache->clear(true);
            }
        } catch (\Throwable $ce) {}
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

        // 清理缓存 (保护登录会话)
        try {
            $cache = CacheService::getInstance();
            if (method_exists($cache, 'clearTemplateCache')) {
                $cache->clearTemplateCache();
            } else {
                $cache->clear(true);
            }
        } catch (\Throwable $ce) {}

        return [
            'code' => 200,
            'msg'  => '全站主题风格已成功切换为【' . $target['name'] . '】，前台已实时生效！',
            'data' => $target
        ];
    }
    /**
     * 批量执行多行数据插入，杜绝在循环中单行 INSERT 的 N+1 数据库开销
     *
     * @param string $table 完整表名 (包含前缀)
     * @param array $columns 列名数组
     * @param array $rows 二维数据行数组
     * @return void
     */

    /**
     * 获取行业预设模板列表
     */
    public function getIndustryScenarios(): array
    {
        return [
            [
                'key'         => 'pet_service',
                'name'        => '上门宠物与伴宠服务',
                'badge'       => '萌宠生活',
                'icon'        => '🐶',
                'theme_color' => '#f97316',
                'theme_style' => 'sunset_orange',
                'site_name'   => '启灵宠爱 · 专属伴宠服务平台',
                'slogan'      => '专业上门遛狗 · 猫咪喂养护理 · 持证宠托师 · 24小时随叫随约',
                'desc'        => '专为宠物店、伴宠工作室与独立宠托师设计，提供上门喂猫、遛狗、洗护与轻医疗护理。',
                'feature_toggles' => [
                    'module_service_enabled'         => '1',
                    'module_recycle_enabled'         => '0',
                    'module_technician_pool_enabled' => '1',
                    'module_coupon_enabled'          => '0',
                    'module_express_enabled'         => '0'
                ],
                'terminology' => [
                    'role_worker_name'           => '金牌宠托师',
                    'worker_station_name'        => '宠托师接单中心',
                    'worker_grab_btn_text'       => '接单伴宠',
                    'worker_finish_voucher_tip'  => '请上传现场喂食铲屎、遛狗轨迹与门锁复位照'
                ],
                'hero_badge_text'          => '官方认证 · 持证宠托师 · 全程录像打卡 · 百万安全保障',
                'hero_title'               => '专业上门伴宠 · 24小时随叫随约',
                'hero_subtitle'            => '专业持证宠托师 · 上门喂猫遛狗 · 洗护驱虫 · 全程GPS轨迹录像打卡',
                'hero_search_btn_text'     => '搜索伴宠服务',
                'hero_search_placeholder'  => '输入爱宠需求，如：上门遛狗, 猫咪喂食, 宠物洗护, 驱虫护理...',
                'hero_hot_tags'            => [
                    ['label' => '狗狗户外遛弯', 'keyword' => '遛狗'],
                    ['label' => '猫咪上门喂食', 'keyword' => '喂食'],
                    ['label' => '宠物温水洗护', 'keyword' => '洗护'],
                    ['label' => '体外体内驱虫', 'keyword' => '驱虫'],
                    ['label' => '伴宠互动陪玩', 'keyword' => '伴宠']
                ],
                'hero_metrics'             => [
                    ['icon' => 'shield', 'val' => '100%', 'lbl' => '实名持证宠托师'],
                    ['icon' => 'clock', 'val' => '准时', 'lbl' => '预约准时到达'],
                    ['icon' => 'bag', 'val' => '全程', 'lbl' => 'GPS轨迹与录像'],
                    ['icon' => 'truck', 'val' => '100万', 'lbl' => '爱宠人身意外险']
                ],
                'guarantees'               => [
                    ['title' => '实名持证宠托师', 'desc' => '严选背景核验，经过专业宠物护理实操考核，持证上门服务', 'icon' => 'shield'],
                    ['title' => '准时到达保障', 'desc' => '按预约时段准时到达，进出家门拍照打卡，安全可靠透明', 'icon' => 'clock'],
                    ['title' => '全程GPS与录像', 'desc' => '户外遛弯全程GPS记录轨迹，上门喂食高清视频实时回传', 'icon' => 'bag'],
                    ['title' => '百万安全保险', 'desc' => '平台赠送爱宠百万级意外责任险，全程无忧托付', 'icon' => 'medal']
                ],
                'home_process'             => [
                    'title'    => '简单3步 · 极速上门伴宠',
                    'subtitle' => '在线选项目预约 / 持证宠托师准时上门 / 完工打卡安全保障',
                    'step1'    => ['title' => '在线预约选项目', 'desc' => '选择爱宠种类与所需服务，预约期望上门时间，标准透明定价。'],
                    'step2'    => ['title' => '持证宠托师准时上门', 'desc' => '实名认证宠托师携带专业工具准时到达，双手消毒换鞋套，全程打卡存证。'],
                    'step3'    => ['title' => '完工打卡 · 售后保障', 'desc' => '遛狗全程GPS轨迹记录，喂猫洗水碗换粮，录制视频回传主人，核销无忧。']
                ],
                'home_faq'                 => [
                    'title'    => '上门伴宠常见问题解答',
                    'subtitle' => '解答您的疑惑，让每一次上门伴宠都安心透明',
                    'list'     => [
                        ['q' => 'Q1. 上门宠托师是实名认证专业的吗？', 'a' => '是的！平台所有宠托师均经过严格实名认证、背景核查与专业宠物护理培训，持证上岗。'],
                        ['q' => 'Q2. 遛狗过程中的安全如何保障？', 'a' => '宠托师上门统一佩戴安全双保险防爆冲牵引绳，全程开启手机 GPS 运动轨迹记录，并赠送平台百万级宠物意外安全险。'],
                        ['q' => 'Q3. 猫咪喂食会拍照和视频反馈吗？', 'a' => '专人进门双手消毒，清洗水粮碗、铲猫砂消毒，陪猫咪互动梳毛，全程录制高清小视频实时回传给主人。'],
                        ['q' => 'Q4. 家里钥匙或密码锁安全怎么保证？', 'a' => '宠托师进出家门均在平台打卡存证，进门拍照门锁状态，服务结束后确认门窗锁闭并拍摄复位照片。']
                    ]
                ],
                'miniapp'                  => [
                    'nav_title'          => '启灵宠爱 · 专业伴宠服务',
                    'search_placeholder' => '搜索上门遛狗 / 猫咪喂食 / 宠物洗护...',
                    'hero_tag'           => '官方认证 · 持证宠托师',
                    'hero_title'         => '专业上门伴宠 · 科学喂养',
                    'hero_subtitle'      => '上门喂猫遛狗 · 洗护驱虫 · 持证上岗 · 全程打卡',
                    'guarantees'         => ['实名持证宠托师', '预约准时到达', '全程轨迹与录像', '百万安全险'],
                    'process'            => [
                        'title'   => '简单三步 · 极速伴宠到家',
                        'step1_t' => '选项目预约',
                        'step1_d' => '标准透明定价',
                        'step2_t' => '宠托师准时上门',
                        'step2_d' => '消毒工具齐全',
                        'step3_t' => '录像打卡核销',
                        'step3_d' => '全程视频回传'
                    ]
                ],
                'custom_fields' => [
                    [
                        'key'         => 'pet_type',
                        'label'       => '宠物种类',
                        'type'        => 'radio',
                        'options'     => ['猫咪', '狗狗', '异宠/鸟类兔子'],
                        'placeholder' => '',
                        'required'    => 1
                    ],
                    [
                        'key'         => 'pet_size',
                        'label'       => '宠物体型',
                        'type'        => 'select',
                        'options'     => ['小型犬/猫咪 (<10kg)', '中型犬 (10-25kg)', '大型犬 (>25kg)'],
                        'placeholder' => '请选择宠物体型',
                        'required'    => 1
                    ],
                    [
                        'key'         => 'key_access',
                        'label'       => '钥匙/门禁交接方式',
                        'type'        => 'text',
                        'options'     => [],
                        'placeholder' => '例：智能密码锁 886622 / 门口地垫下 / 物业管家代管',
                        'required'    => 1
                    ],
                    [
                        'key'         => 'emergency_phone',
                        'label'       => '紧急备用联络电话',
                        'type'        => 'text',
                        'options'     => [],
                        'placeholder' => '留守家人或紧急联系人电话',
                        'required'    => 0
                    ]
                ]
            ],
            [
                'key'         => 'housekeeping',
                'name'        => '家政保洁与家电清洗',
                'badge'       => '清新洁净',
                'icon'        => '🧹',
                'theme_color' => '#10b981',
                'theme_style' => 'eco_green',
                'site_name'   => '启灵家政 · 深度清洁与家电洗护',
                'slogan'      => '140℃高温蒸汽深度杀菌 · 持证保洁工程师 · 标准透明定价',
                'desc'        => '专注日常保洁、新房开荒、变频空调拆洗、油烟机高温清洗、管道疏通与地暖清洗。',
                'feature_toggles' => [
                    'module_service_enabled'         => '1',
                    'module_recycle_enabled'         => '0',
                    'module_technician_pool_enabled' => '1',
                    'module_coupon_enabled'          => '0',
                    'module_express_enabled'         => '0'
                ],
                'terminology' => [
                    'role_worker_name'           => '持证保洁师',
                    'worker_station_name'        => '保洁工程师接单中心',
                    'worker_grab_btn_text'       => '接单保洁',
                    'worker_finish_voucher_tip'  => '请上传作业现场前后对比照与验收核销表'
                ],
                'hero_badge_text'          => '实名认证 · 准时上门 · 进口专业药剂消杀 · 不满意免费重做',
                'hero_title'               => '专业家政保洁 · 家电深度清洗',
                'hero_subtitle'            => '140℃高温蒸汽深度杀菌 · 持证保洁工程师 · 标准透明定价 · 售后无忧',
                'hero_search_btn_text'     => '搜索保洁项目',
                'hero_search_placeholder'  => '输入保洁项目，如：日常保洁, 油烟机清洗, 空调深度清洗...',
                'hero_hot_tags'            => [
                    ['label' => '日常家庭保洁', 'keyword' => '日常保洁'],
                    ['label' => '油烟机深度拆洗', 'keyword' => '油烟机'],
                    ['label' => '空调免拆消杀', 'keyword' => '空调'],
                    ['label' => '全屋深度开荒', 'keyword' => '开荒'],
                    ['label' => '玻璃高温消杀', 'keyword' => '擦玻璃']
                ],
                'hero_metrics'             => [
                    ['icon' => 'shield', 'val' => '100%', 'lbl' => '持证保洁工程师'],
                    ['icon' => 'clock', 'val' => '准时', 'lbl' => '准点上门服务'],
                    ['icon' => 'bag', 'val' => '透明', 'lbl' => '明码公道标价'],
                    ['icon' => 'medal', 'val' => '重做', 'lbl' => '不满意免费返工']
                ],
                'guarantees'               => [
                    ['title' => '持证保洁工程师', 'desc' => '严选背景考核，经过专业清洗设备与药剂规范实操培训', 'icon' => 'shield'],
                    ['title' => '准点准时上门', 'desc' => '严格履约准时到达，自带全套设备与专业消杀环保药剂', 'icon' => 'clock'],
                    ['title' => '标准透明标价', 'desc' => '统一明码实价，服务过程杜绝乱加价或推销隐形收费', 'icon' => 'bag'],
                    ['title' => '不满意免费重做', 'desc' => '现场深度对比验收，若清洁未达标当场免费返工重做', 'icon' => 'medal']
                ],
                'home_process'             => [
                    'title'    => '简单3步 · 极速焕新到家',
                    'subtitle' => '在线按需下单 / 专业师傅携带工具准时上门 / 验收满意后核销',
                    'step1'    => ['title' => '在线选择服务项目', 'desc' => '根据户型面积或清洗家电品类挑选对应规格，预约期望服务时段。'],
                    'step2'    => ['title' => '持证工程师专业上门', 'desc' => '自带专业清洁消杀设备与环保耗材准时到家，标准化作业流程。'],
                    'step3'    => ['title' => '当面验收 · 售后保障', 'desc' => '现场深度对比验收，满意后再核销，提供7天专属售后保障。']
                ],
                'home_faq'                 => [
                    'title'    => '家政保洁常见问题解答',
                    'subtitle' => '解答您的疑惑，让每一次到家清洁都透明安心',
                    'list'     => [
                        ['q' => 'Q1. 保洁师傅会自带清洁工具和清洁剂吗？', 'a' => '是的！师傅自带整套保洁工具与环保清洁剂，您无需提前准备任何材料。'],
                        ['q' => 'Q2. 家电清洗会拆机深度清洗吗？', 'a' => '会的！油烟机、空调均采用专业拆卸与高温蒸汽消杀，深度清除风轮内部油污积灰。'],
                        ['q' => 'Q3. 如果清洁效果不满意怎么办？', 'a' => '平台承诺【不满意免费重做】！验收不满意可现场指出立即返工，保障您的权益。']
                    ]
                ],
                'miniapp'                  => [
                    'nav_title'          => '启灵洁家 · 专业家政与家电清洗',
                    'search_placeholder' => '搜索日常保洁 / 油烟机清洗 / 空调清洗...',
                    'hero_tag'           => '高温蒸汽杀菌 · 持证上岗',
                    'hero_title'         => '专业家政保洁 · 家电清洗',
                    'hero_subtitle'      => '140℃高温蒸汽深度杀菌 · 持证上岗 · 不满意重做',
                    'guarantees'         => ['持证保洁工程师', '准时上门履约', '专业设备耗材', '不满意免费重做'],
                    'process'            => [
                        'title'   => '简单三步 · 极速清洁到家',
                        'step1_t' => '选项目下单',
                        'step1_d' => '规格面积透明',
                        'step2_t' => '工程师上门',
                        'step2_d' => '专业设备消杀',
                        'step3_t' => '验收后再核销',
                        'step3_d' => '7天售后质保'
                    ]
                ],
                'custom_fields' => [
                    [
                        'key'         => 'house_area',
                        'label'       => '房屋建筑面积 (㎡)',
                        'type'        => 'number',
                        'options'     => [],
                        'placeholder' => '例：89',
                        'required'    => 1
                    ],
                    [
                        'key'         => 'house_layout',
                        'label'       => '户型结构',
                        'type'        => 'select',
                        'options'     => ['一室一厅', '两室一厅/两室两厅', '三室两厅', '四室及以上/复式别墅'],
                        'placeholder' => '请选择户型结构',
                        'required'    => 1
                    ]
                ]
            ],
            [
                'key'         => 'home_repair',
                'name'        => '家庭维修与安装快修',
                'badge'       => '工匠速修',
                'icon'        => '🛠️',
                'theme_color' => '#ea580c',
                'theme_style' => 'sunset_orange',
                'site_name'   => '启灵快修 · 家庭水电维修与安装',
                'slogan'      => '30分钟极速上门 · 准时准点 · 严选专业师傅 · 质保90天',
                'desc'        => '专注水电电路故障检修、门窗锁具安装、卫浴龙头花洒更换、家具拆装与漏水排查。',
                'feature_toggles' => [
                    'module_service_enabled'         => '1',
                    'module_recycle_enabled'         => '0',
                    'module_technician_pool_enabled' => '1',
                    'module_coupon_enabled'          => '0',
                    'module_express_enabled'         => '0'
                ],
                'terminology' => [
                    'role_worker_name'           => '特约维修工程师',
                    'worker_station_name'        => '师傅抢单维修中心',
                    'worker_grab_btn_text'       => '立即抢修',
                    'worker_finish_voucher_tip'  => '请上传故障排查点与修复通电/通水正常凭证照片'
                ],
                'hero_badge_text'          => '持证特约技师 · 明码标价 · 90天超长质保 · 报修无忧',
                'hero_title'               => '社区家庭维修 · 专业安装快修',
                'hero_subtitle'            => '30分钟极速上门 · 准时准点 · 严选专业特聘 · 质保90天',
                'hero_search_btn_text'     => '搜索快修报修',
                'hero_search_placeholder'  => '输入维修需求，如：水管漏水, 马桶疏通, 跳闸断电, 门锁更换...',
                'hero_hot_tags'            => [
                    ['label' => '管道马桶疏通', 'keyword' => '疏通'],
                    ['label' => '电路跳闸排查', 'keyword' => '电路'],
                    ['label' => '水龙头角阀更换', 'keyword' => '水龙头'],
                    ['label' => '门窗五金开锁', 'keyword' => '门锁']
                ],
                'hero_metrics'             => [
                    ['icon' => 'shield', 'val' => '100%', 'lbl' => '实名持证师傅'],
                    ['icon' => 'clock', 'val' => '30分', 'lbl' => '极速响应上门'],
                    ['icon' => 'bag', 'val' => '透明', 'lbl' => '工单明码实价'],
                    ['icon' => 'medal', 'val' => '90天', 'lbl' => '官方超长质保']
                ],
                'guarantees'               => [
                    ['title' => '持证特约技师', 'desc' => '严选水电五金专业技师，实名认证，持电工特种作业证上岗', 'icon' => 'shield'],
                    ['title' => '30分钟极速上门', 'desc' => '系统智能派单就近师傅，准时准点到达，急修快修不用等', 'icon' => 'clock'],
                    ['title' => '工单明码标价', 'desc' => '现场检测先出示电子工单价格，经客户确认同意后再施工', 'icon' => 'bag'],
                    ['title' => '官方质保90天', 'desc' => '更换配件享官方90天质保，质保期内非人为故障免费上门', 'icon' => 'medal']
                ],
                'home_process'             => [
                    'title'    => '简单3步 · 极速快修到家',
                    'subtitle' => '一键报修下单 / 30分钟极速上门排查 / 修复核销质保90天',
                    'step1'    => ['title' => '一键在线报修', 'desc' => '选择维修类目，描述故障现象，系统自动匹配就近特约维修师傅。'],
                    'step2'    => ['title' => '急速响应上门检测', 'desc' => '师傅携带专业检测工具准时上门，先精准检测试机，公开透明报价。'],
                    'step3'    => ['title' => '精工修复 · 质保90天', 'desc' => '严格按照施工规范修复并清理现场，开具电子工单，享全方位售后质保。']
                ],
                'home_faq'                 => [
                    'title'    => '家庭快修常见问题解答',
                    'subtitle' => '解答您的疑惑，让每一次维修都明码标价无隐形消费',
                    'list'     => [
                        ['q' => 'Q1. 师傅上门会有乱收费、坐地起价吗？', 'a' => '绝无隐形消费！平台实行统一标准标价，师傅检测后需当面出示工单报价，经您确认后再开始施工。'],
                        ['q' => 'Q2. 维修更换的配件有质保吗？', 'a' => '所有官方更换的全新配件均享有平台 90 天超长售后质保，质保期内非人为损坏免费上门重换。']
                    ]
                ],
                'miniapp'                  => [
                    'nav_title'          => '启灵鲁班 · 社区急修与家庭维保',
                    'search_placeholder' => '搜索水管漏水 / 马桶疏通 / 电路排查...',
                    'hero_tag'           => '社区快修 · 30分极速上门',
                    'hero_title'         => '专业家庭维修 · 极速快修',
                    'hero_subtitle'      => '管道疏通 · 水电电路 · 门窗五金 · 质保90天',
                    'guarantees'         => ['实名特约技师', '30分极速上门', '工单明码标价', '官方质保90天'],
                    'process'            => [
                        'title'   => '简单三步 · 极速上门维修',
                        'step1_t' => '在线一键报修',
                        'step1_d' => '师傅就近派单',
                        'step2_t' => '精准排查报价',
                        'step2_d' => '同意后再动工',
                        'step3_t' => '完工质保90天',
                        'step3_d' => '无隐形收费'
                    ]
                ],
                'custom_fields' => [
                    [
                        'key'         => 'fault_desc',
                        'label'       => '故障现象简述',
                        'type'        => 'text',
                        'options'     => [],
                        'placeholder' => '如：厨房水龙头漏水、总闸跳闸推不上去、防盗门锁芯卡死',
                        'required'    => 1
                    ],
                    [
                        'key'         => 'need_parts',
                        'label'       => '配件材料提供方式',
                        'type'        => 'radio',
                        'options'     => ['师傅代买配件 (凭小票实报实销)', '用户已自备配件', '无需更换任何配件材料'],
                        'placeholder' => '',
                        'required'    => 1
                    ]
                ]
            ],
            [
                'key'         => 'digital_recycle',
                'name'        => '数码 3C 闲置高价回收',
                'badge'       => '科技变现',
                'icon'        => '📱',
                'theme_color' => '#1e58ff',
                'theme_style' => 'tech_blue',
                'site_name'   => '启灵数码 · 专业二手手机数码回收平台',
                'slogan'      => '官方报价标准 · 顺丰免费上门包邮 · 隐私深度清除 · 质检一致秒放款',
                'desc'        => '专注手机、平板、笔记本、数码相机与二手穿戴设备高价估价变现，全自动化顺丰取件。',
                'feature_toggles' => [
                    'module_service_enabled'         => '0',
                    'module_recycle_enabled'         => '1',
                    'module_technician_pool_enabled' => '0',
                    'module_coupon_enabled'          => '1',
                    'module_express_enabled'         => '1'
                ],
                'terminology' => [
                    'role_worker_name'           => '专业质检工程师',
                    'worker_station_name'        => '质检验收工作台',
                    'worker_grab_btn_text'       => '领单质检',
                    'worker_finish_voucher_tip'  => '请上传设备IMEI序列号实物图与质检复核清单'
                ],
                'hero_badge_text'          => '官方自营 · 顺丰免费上门 · 10秒快速估价 · 秒级放款到账',
                'hero_title'               => '全品类高价回收 · 10秒快速估价',
                'hero_subtitle'            => '官方标准透明报价 · 顺丰免费上门包邮 · 个人隐私安全清除',
                'hero_search_btn_text'     => '立即估价',
                'hero_search_placeholder'  => '输入您要回收的商品或型号，如：iPhone 15 Pro, Mate 60, 小米14, 联想电脑...',
                'hero_hot_tags'            => [
                    ['label' => 'iPhone 15 Pro', 'keyword' => 'iPhone 15 Pro'],
                    ['label' => 'Mate 60 Pro', 'keyword' => 'Mate 60 Pro'],
                    ['label' => '小米 14', 'keyword' => '小米14'],
                    ['label' => 'MacBook Pro', 'keyword' => 'MacBook'],
                    ['label' => 'iPad Pro', 'keyword' => 'iPad']
                ],
                'hero_metrics'             => [
                    ['icon' => 'bag', 'val' => '120万+', 'lbl' => '累计完成回收'],
                    ['icon' => 'clock', 'val' => '10秒', 'lbl' => '快速精准估价'],
                    ['icon' => 'truck', 'val' => '0元', 'lbl' => '顺丰双向保价包邮'],
                    ['icon' => 'shield', 'val' => '100%', 'lbl' => '隐私安全清除']
                ],
                'guarantees'               => [
                    ['title' => '顺丰免费上门 / 全程包邮', 'desc' => '专业顺丰小哥免费上门，专人过磅拖运或快递打包，全程双向保价0费用', 'icon' => 'truck'],
                    ['title' => '官方透明质检 · 绝无压价', 'desc' => '全程高清录像监控专业拆机核验，如实描述即享预估全款，杜绝虚报与恶意扣减', 'icon' => 'shield'],
                    ['title' => '个人数据清除 · 隐私保障', 'desc' => '采用专业数据清除技术对设备进行全面清理，确保个人信息不残留', 'icon' => 'lock'],
                    ['title' => '秒级极速放款 · 资金直达', 'desc' => '质检结果双方确认一致后，系统秒级自动放款，微信零钱或支付宝即刻到账', 'icon' => 'clock']
                ],
                'home_process'             => [
                    'title'    => '简单3步 · 闲置极速变现',
                    'subtitle' => '顺丰免费上门 / 官方专业质检 / 确认后秒级极速放款',
                    'step1'    => ['title' => '在线智能精准估价', 'desc' => '快速勾选机况成色，系统自动匹配最新市场行情价，满意后再提交。'],
                    'step2'    => ['title' => '顺丰免费上门 · 包邮', 'desc' => '顺丰小哥免费上门当面装箱封签，全国往返双向包邮且全程保价，您无需支付任何运费。'],
                    'step3'    => ['title' => '官方质检 · 秒级放款', 'desc' => '全程无死角高清监控录像验机，绝不恶意压价；确认价格后，微信或支付宝秒级直达账户。']
                ],
                'home_faq'                 => [
                    'title'    => '回收常见问题解答',
                    'subtitle' => '解答您的疑惑，让每一笔回收都透明安心',
                    'list'     => [
                        ['q' => 'Q1. 提交估价后的价格会随意变动吗？', 'a' => '我们承诺 7 天价格锁定保障！在您提交订单后的7天内，只要实际质检情况与您提交的评估描述一致，我们将 100% 按照预估价格全额放款，绝不坐地降价。'],
                        ['q' => 'Q2. 寄送顺丰快递的运费由谁承担？', 'a' => '全场所有品类均享受【顺丰包邮】服务！顺丰小哥上门取件时直接选择“到付”即可，往返运费均由平台全额承担，您不需要掏一分钱。'],
                        ['q' => 'Q3. 设备里的照片和个人隐私会被泄露吗？', 'a' => '请完全放心！平台质检入库后将对设备进行专业数据清除，确保所有照片、账号、聊天记录安全清除不残留！'],
                        ['q' => 'Q4. 质检复核后如果我不认可最终成交价怎么办？', 'a' => '我们充分尊重用户的自主选择权！若您对质检复核金额不满意，可在会员中心一键点击“拒绝成交”，我们将通过顺丰包邮将原机原封退还给您，退运保价运费由平台承担，无需您付费！']
                    ]
                ],
                'miniapp'                  => [
                    'nav_title'          => '启灵专业数码回收',
                    'search_placeholder' => '搜索你想卖的手机 / 平板 / 电脑型号',
                    'hero_tag'           => '启灵高价回收 · 官方验机',
                    'hero_title'         => '旧机别放着，立即变现',
                    'hero_subtitle'      => '顺丰包邮 · 隐私深度清除 · 质检一致当天打款',
                    'guarantees'         => ['隐私彻底清除', '顺丰双向包邮', '验机极速放款', '7天估价锁定'],
                    'process'            => [
                        'title'   => '简单三步 · 轻松变现',
                        'step1_t' => '在线估价',
                        'step1_d' => '30秒选项测机',
                        'step2_t' => '顺丰寄件/上门',
                        'step2_d' => '全程包邮免密',
                        'step3_t' => '验机打款',
                        'step3_d' => '直达微信零钱'
                    ]
                ],
                'custom_fields' => []
            ],
            [
                'key'         => 'city_life',
                'name'        => '同城便民综合平台',
                'badge'       => '旗舰全能',
                'icon'        => '🏙️',
                'theme_color' => '#1e58ff',
                'theme_style' => 'tech_blue',
                'site_name'   => '启灵同城 · 综合生活便民服务平台',
                'slogan'      => '涵盖闲置数码变现 · 家政保洁清洗 · 上门维修 · 伴宠跑腿的一站式便民平台',
                'desc'        => '聚合闲置变现与全套上门生活服务，适合打造区域本地综合生活门户。',
                'feature_toggles' => [
                    'module_service_enabled'         => '1',
                    'module_recycle_enabled'         => '1',
                    'module_technician_pool_enabled' => '1',
                    'module_coupon_enabled'          => '1',
                    'module_express_enabled'         => '1'
                ],
                'terminology' => [
                    'role_worker_name'           => '特约认证师傅',
                    'worker_station_name'        => '师傅接单中心',
                    'worker_grab_btn_text'       => '立即抢单',
                    'worker_finish_voucher_tip'  => '请上传现场完工验收核销凭证照片'
                ],
                'hero_badge_text'          => '官方实名认证 · 顺丰免费包邮 · 准时到达 · 平台全程兜底质保',
                'hero_title'               => '同城便民综合平台',
                'hero_subtitle'            => '涵盖闲置数码变现 · 家政保洁清洗 · 上门维修 · 伴宠跑腿的一站式便民平台',
                'hero_search_btn_text'     => '全站搜索',
                'hero_search_placeholder'  => '输入您需要的到家服务或回收变现品类...',
                'hero_hot_tags'            => [
                    ['label' => 'iPhone 15 Pro', 'keyword' => 'iPhone 15 Pro'],
                    ['label' => '狗狗户外遛弯', 'keyword' => '遛狗'],
                    ['label' => '空调深度清洗', 'keyword' => '空调'],
                    ['label' => '电路跳闸检修', 'keyword' => '电路'],
                    ['label' => 'Mate 60 Pro', 'keyword' => 'Mate 60 Pro']
                ],
                'hero_metrics'             => [
                    ['icon' => 'shield', 'val' => '100%', 'lbl' => '师傅实名认证'],
                    ['icon' => 'clock', 'val' => '准时', 'lbl' => '准时极速上门'],
                    ['icon' => 'truck', 'val' => '包邮', 'lbl' => '顺丰双向免费'],
                    ['icon' => 'medal', 'val' => '质保', 'lbl' => '平台全程保障']
                ],
                'guarantees'               => [
                    ['title' => '顺丰免费包邮 / 免费上门', 'desc' => '数码回收顺丰全额包邮，到家便民服务特约师傅准时上门', 'icon' => 'truck'],
                    ['title' => '实名严选认证 · 专业考核', 'desc' => '所有质检工程师与到家技师均通过身份背景核查与实操考核', 'icon' => 'shield'],
                    ['title' => '价格透明公开 · 绝无加价', 'desc' => '回收标准算法报价，到家服务统一工单明码实价，杜绝乱收费', 'icon' => 'bag'],
                    ['title' => '官方平台保障 · 售后无忧', 'desc' => '回收质检一致秒放款，到家服务享官方售后保障与返工保障', 'icon' => 'medal']
                ],
                'home_process'             => [
                    'title'    => '同城综合便民 · 一站式全流程保障',
                    'subtitle' => '线上极速预约 · 专业特约上门 · 标准透明定价 · 售后无忧保障',
                    'step1'    => ['title' => '挑选所需服务或回收', 'desc' => '无论是数码回收变现，还是保洁清洗、上门维修、伴宠跑腿，一键随心预约。'],
                    'step2'    => ['title' => '准时上门交付核验', 'desc' => '顺丰小哥免费上门包邮取件，或特约实名师傅准时到达当面交付。'],
                    'step3'    => ['title' => '官方放款 / 核销质保', 'desc' => '质检确认秒级到账微信支付宝，上门服务当面核销享平台全流程售后兜底。']
                ],
                'home_faq'                 => [
                    'title'    => '同城便民服务常见问题解答',
                    'subtitle' => '解答您的疑惑，让每一笔服务与回收都透明安心',
                    'list'     => [
                        ['q' => 'Q1. 平台涵盖哪些到家服务与变现业务？', 'a' => '涵盖二手手机数码高价回收变现，以及专业保洁清洗、家庭维修、上门伴宠等全套到家生活服务。'],
                        ['q' => 'Q2. 到家服务的师傅是正规实名的吗？', 'a' => '是的！所有上门服务的工程师均经过严格实名背景审查、专业技能认证考核，并佩戴工牌工具准时上门。'],
                        ['q' => 'Q3. 回收变现的运费由谁承担？', 'a' => '全场所有品类均享受【顺丰包邮】服务！顺丰小哥上门取件时选择到付即可，往返运费均由平台承担。']
                    ]
                ],
                'miniapp'                  => [
                    'nav_title'          => '启灵同城 · 综合生活便民',
                    'search_placeholder' => '搜索你想卖的手机型号，或搜索保洁/维修/宠托服务',
                    'hero_tag'           => '闲置变现 · 便民生活',
                    'hero_title'         => '同城便民生活服务平台',
                    'hero_subtitle'      => '涵盖闲置数码变现 · 家政保洁清洗 · 上门维修 · 伴宠跑腿',
                    'guarantees'         => ['师傅实名认证', '顺丰双向包邮', '准时上门履约', '平台全程质保'],
                    'process'            => [
                        'title'   => '简单三步 · 便民全流程',
                        'step1_t' => '挑选服务/估价',
                        'step1_d' => '在线明码实价',
                        'step2_t' => '上门取件/履约',
                        'step2_d' => '顺丰或师傅上门',
                        'step3_t' => '放款打款/核销',
                        'step3_d' => '平台售后无忧'
                    ]
                ],
                'custom_fields' => [
                    // 1. 宠物服务专属字段
                    [
                        'key'           => 'pet_type',
                        'label'         => '宠物种类',
                        'type'          => 'radio',
                        'category_type' => 'pet',
                        'options'       => ['猫咪', '狗狗', '异宠/鸟类兔类'],
                        'placeholder'   => '',
                        'required'      => 0
                    ],
                    [
                        'key'           => 'pet_breed',
                        'label'         => '宠物品种 / 昵称',
                        'type'          => 'text',
                        'category_type' => 'pet',
                        'options'       => [],
                        'placeholder'   => '如：柯基 / 金毛 / 英短 / 兔子 (选填)',
                        'required'      => 0
                    ],
                    [
                        'key'           => 'pet_habits',
                        'label'         => '爱宠性情与特殊嘱咐',
                        'type'          => 'text',
                        'category_type' => 'pet',
                        'options'       => [],
                        'placeholder'   => '如：较胆小怕生、有护食倾向、喜欢飞盘等 (选填)',
                        'required'      => 0
                    ],
                    // 2. 家政保洁清洗专属字段
                    [
                        'key'           => 'house_area',
                        'label'         => '房屋建筑面积 (㎡)',
                        'type'          => 'number',
                        'category_type' => 'cleaning',
                        'options'       => [],
                        'placeholder'   => '如：89 (日常保洁/开荒选填)',
                        'required'      => 0
                    ],
                    [
                        'key'           => 'house_layout',
                        'label'         => '户型结构',
                        'type'          => 'select',
                        'category_type' => 'cleaning',
                        'options'       => ['一室一厅', '两室一厅/两室两厅', '三室两厅', '四室及以上/复式别墅'],
                        'placeholder'   => '请选择户型结构',
                        'required'      => 0
                    ],
                    // 3. 家庭维修快修专属字段
                    [
                        'key'           => 'fault_desc',
                        'label'         => '故障现象简述',
                        'type'          => 'text',
                        'category_type' => 'repair',
                        'options'       => [],
                        'placeholder'   => '如：厨房龙头漏水、总闸跳闸、门锁卡死 (维修报修必填)',
                        'required'      => 0
                    ],
                    [
                        'key'           => 'need_parts',
                        'label'         => '配件材料提供方式',
                        'type'          => 'radio',
                        'category_type' => 'repair',
                        'options'       => ['师傅代买配件 (凭小票实报实销)', '用户已自备配件', '无需更换任何配件材料'],
                        'placeholder'   => '',
                        'required'      => 0
                    ],
                    // 4. 同城到家通用关键字段
                    [
                        'key'           => 'service_special_notes',
                        'label'         => '上门特殊提醒与门禁说明',
                        'type'          => 'text',
                        'category_type' => 'common',
                        'options'       => [],
                        'placeholder'   => '如：智能密码锁 886622 / 门口地垫下 / 家有老人轻声',
                        'required'      => 0
                    ]
                ]
            ]
        ];
    }

    /**
     * 获取当前生效的行业模板完整配置 (合并自定义配置)
     */
    public function getCurrentIndustryScenario(): array
    {
        $sql = "SELECT `config_key`, `config_value` FROM `{$this->p}sys_config`";
        $rows = $this->db->fetchAll($sql);
        $configs = [];
        foreach ($rows as $r) {
            $configs[$r['config_key']] = $r['config_value'];
        }

        $allScenarios = $this->getIndustryScenarios();
        $scenarioMap = [];
        foreach ($allScenarios as $sc) {
            $scenarioMap[$sc['key']] = $sc;
        }

        $curKey = !empty($configs['industry_scenario']) ? $configs['industry_scenario'] : 'city_life';
        $base = $scenarioMap[$curKey] ?? $scenarioMap['city_life'];

        // 合并自定义功能开关
        $featureToggles = $base['feature_toggles'];
        foreach ($featureToggles as $k => $v) {
            if (isset($configs[$k])) {
                $featureToggles[$k] = (string)$configs[$k];
            }
        }

        // 合并自定义角色称谓
        $terminology = $base['terminology'];
        foreach ($terminology as $k => $v) {
            if (!empty($configs[$k])) {
                $terminology[$k] = (string)$configs[$k];
            }
        }

        // 合并自定义预约表单字段
        $customFields = $base['custom_fields'];
        if (!empty($configs['industry_custom_fields'])) {
            $decoded = json_decode($configs['industry_custom_fields'], true);
            if (is_array($decoded)) {
                $customFields = $decoded;
            }
        }

        // 彻底剔除废弃的旧演示字段（如已淘汰的 tools_supplied 工具准备方式）
        $customFields = array_values(array_filter($customFields, function ($f) {
            $k = is_array($f) ? ($f['key'] ?? '') : '';
            return $k !== 'tools_supplied';
        }));

        return [
            'key'             => $curKey,
            'name'            => $base['name'],
            'badge'           => $base['badge'],
            'icon'            => $base['icon'],
            'theme_color'     => $configs['theme_primary_color'] ?? $base['theme_color'],
            'site_name'       => $configs['site_name'] ?? $base['site_name'],
            'slogan'          => $configs['site_slogan'] ?? $base['slogan'],
            'desc'            => $base['desc'],
            'feature_toggles' => $featureToggles,
            'terminology'     => $terminology,
            'custom_fields'   => $customFields,
            'hero_badge_text' => $configs['hero_badge_text'] ?? $base['hero_badge_text'] ?? '',
            'hero_title'      => $configs['hero_title'] ?? $base['hero_title'] ?? $base['site_name'],
            'hero_subtitle'   => $configs['hero_subtitle'] ?? $base['hero_subtitle'] ?? $base['slogan'],
            'hero_search_btn_text'    => $configs['hero_search_btn_text'] ?? $base['hero_search_btn_text'] ?? '搜索',
            'hero_search_placeholder' => $configs['hero_search_placeholder'] ?? $base['hero_search_placeholder'] ?? '',
            'hero_hot_tags'   => !empty($configs['hero_hot_tags']) ? (json_decode($configs['hero_hot_tags'], true) ?: ($base['hero_hot_tags'] ?? [])) : ($base['hero_hot_tags'] ?? []),
            'hero_metrics'    => !empty($configs['hero_metrics']) ? (json_decode($configs['hero_metrics'], true) ?: ($base['hero_metrics'] ?? [])) : ($base['hero_metrics'] ?? []),
            'guarantees'      => !empty($configs['industry_guarantees']) ? (json_decode($configs['industry_guarantees'], true) ?: ($base['guarantees'] ?? [])) : ($base['guarantees'] ?? []),
            'home_process'    => $base['home_process'] ?? [],
            'home_faq'        => $base['home_faq'] ?? [],
            'miniapp'         => $base['miniapp'] ?? []
        ];
    }

    /**
     * 套用指定行业模板与预设数据
     */
    public function applyIndustryScenario(string $scenarioKey, bool $seedData = true): array
    {
        try {
            $all = $this->getIndustryScenarios();
            $target = null;
            foreach ($all as $item) {
                if ($item['key'] === $scenarioKey) {
                    $target = $item;
                    break;
                }
            }

            if (!$target) {
                return ['code' => 400, 'msg' => '未知的行业场景预设: ' . $scenarioKey];
            }

            $now = time();
            $p = $this->p;

            // 1. 保存行业主场景标记与全面场景数据驱动配置
            $derivedBrand = !empty($target['brand_name']) ? $target['brand_name'] : '';
            if (empty($derivedBrand)) {
                if (mb_strpos($target['site_name'], '·') !== false) {
                    $parts = explode('·', $target['site_name']);
                    $derivedBrand = trim($parts[0]);
                } else {
                    $derivedBrand = $target['site_name'];
                }
            }

            $configsToSave = [
                'industry_scenario'        => $scenarioKey,
                'site_name'                => $target['site_name'],
                'brand_name'               => $derivedBrand ?: '启灵同城服务',
                'site_slogan'              => $target['slogan'],
                'theme_style'              => $target['theme_style'],
                'theme_primary_color'      => $target['theme_color'],
                'industry_custom_fields'   => json_encode($target['custom_fields'], JSON_UNESCAPED_UNICODE),

                // 首屏 Hero 配置
                'hero_badge_text'          => $target['hero_badge_text'] ?? '',
                'hero_title'               => $target['hero_title'] ?? $target['site_name'],
                'hero_subtitle'            => $target['hero_subtitle'] ?? $target['slogan'],
                'hero_search_btn_text'     => $target['hero_search_btn_text'] ?? '搜索',
                'hero_search_placeholder'  => $target['hero_search_placeholder'] ?? '',
                'hero_hot_tags'            => json_encode($target['hero_hot_tags'] ?? [], JSON_UNESCAPED_UNICODE),
                'hero_metrics'             => json_encode($target['hero_metrics'] ?? [], JSON_UNESCAPED_UNICODE),

                // 流程配置
                'home_process_title'       => $target['home_process']['title'] ?? '',
                'home_process_subtitle'    => $target['home_process']['subtitle'] ?? '',
                'home_process_step1_title' => $target['home_process']['step1']['title'] ?? '',
                'home_process_step1_desc'  => $target['home_process']['step1']['desc'] ?? '',
                'home_process_step2_title' => $target['home_process']['step2']['title'] ?? '',
                'home_process_step2_desc'  => $target['home_process']['step2']['desc'] ?? '',
                'home_process_step3_title' => $target['home_process']['step3']['title'] ?? '',
                'home_process_step3_desc'  => $target['home_process']['step3']['desc'] ?? '',

                // FAQ 配置
                'home_faq_title'           => $target['home_faq']['title'] ?? '',
                'home_faq_subtitle'        => $target['home_faq']['subtitle'] ?? '',
                'home_faq_list'            => json_encode($target['home_faq']['list'] ?? [], JSON_UNESCAPED_UNICODE),

                // 信任保障配置
                'industry_guarantees'      => json_encode($target['guarantees'] ?? [], JSON_UNESCAPED_UNICODE),

                // 小程序专属配置
                'miniapp_theme_color'        => $target['theme_color'],
                'miniapp_nav_title'          => $target['miniapp']['nav_title'] ?? $target['site_name'],
                'miniapp_search_placeholder' => $target['miniapp']['search_placeholder'] ?? '',
                'miniapp_hero_tag'           => $target['miniapp']['hero_tag'] ?? '',
                'miniapp_hero_title'         => $target['miniapp']['hero_title'] ?? '',
                'miniapp_hero_subtitle'      => $target['miniapp']['hero_subtitle'] ?? '',
                'miniapp_guarantee_1'        => $target['miniapp']['guarantees'][0] ?? '',
                'miniapp_guarantee_2'        => $target['miniapp']['guarantees'][1] ?? '',
                'miniapp_guarantee_3'        => $target['miniapp']['guarantees'][2] ?? '',
                'miniapp_guarantee_4'        => $target['miniapp']['guarantees'][3] ?? '',
                'miniapp_process_title'      => $target['miniapp']['process']['title'] ?? '',
                'miniapp_step_1_title'       => $target['miniapp']['process']['step1_t'] ?? '',
                'miniapp_step_1_desc'        => $target['miniapp']['process']['step1_d'] ?? '',
                'miniapp_step_2_title'       => $target['miniapp']['process']['step2_t'] ?? '',
                'miniapp_step_2_desc'        => $target['miniapp']['process']['step2_d'] ?? '',
                'miniapp_step_3_title'       => $target['miniapp']['process']['step3_t'] ?? '',
                'miniapp_step_3_desc'        => $target['miniapp']['process']['step3_d'] ?? '',
                'miniapp_category_title'     => $target['miniapp']['category_title'] ?? (($target['feature_toggles']['module_recycle_enabled'] ?? '1') === '1' ? '全品类高价回收' : '精选服务分类'),
                'miniapp_hot_title'          => $target['miniapp']['hot_title'] ?? (($target['feature_toggles']['module_recycle_enabled'] ?? '1') === '1' ? '热门回收机型推荐' : '精选热门服务推荐'),
                'miniapp_custom_categories'  => '',
            ];

            // 写入功能开关
            foreach ($target['feature_toggles'] as $k => $v) {
                $configsToSave[$k] = (string)$v;
            }

            // 写入角色与称谓文案
            foreach ($target['terminology'] as $k => $v) {
                $configsToSave[$k] = (string)$v;
            }

            $this->db->beginTransaction();
            try {
                foreach ($configsToSave as $k => $v) {
                    $sql = "INSERT INTO `{$p}sys_config` (`group_name`, `config_key`, `config_value`, `updated_at`) 
                            VALUES ('system', ?, ?, ?) 
                            ON DUPLICATE KEY UPDATE `config_value` = VALUES(`config_value`), `updated_at` = VALUES(`updated_at`)";
                    $this->db->execute($sql, [$k, (string)$v, $now]);
                }

                // 2. 写入该行业预设示范数据
                if ($seedData) {
                    $this->seedScenarioData($scenarioKey);
                }

                $this->db->commit();
            } catch (\Throwable $e) {
                $this->db->rollBack();
                return [
                    'code' => 500,
                    'msg'  => '套用行业方案失败: ' . $e->getMessage()
                ];
            }

            try {
                $cache = CacheService::getInstance();
                if (method_exists($cache, 'clearTemplateCache')) {
                    $cache->clearTemplateCache();
                } elseif (method_exists($cache, 'clear')) {
                    $cache->clear(true);
                }
            } catch (\Throwable $ce) {
                // 安全忽略缓存清理异常
            }

            $currentData = [];
            try {
                $currentData = $this->getCurrentIndustryScenario();
            } catch (\Throwable $ge) {
                $currentData = ['key' => $scenarioKey, 'name' => $target['name']];
            }

            return [
                'code' => 200,
                'msg'  => '已成功套用【' . $target['name'] . '】行业模板！',
                'data' => $currentData
            ];
        } catch (\Throwable $fatal) {
            return [
                'code' => 500,
                'msg'  => '套用执行异常: ' . $fatal->getMessage() . ' (' . basename($fatal->getFile()) . ':' . $fatal->getLine() . ')'
            ];
        }
    }

    /**
     * 保存业务功能开关、称谓文案与自定义表单字段
     */
    public function saveDynamicBlocks(array $toggles, array $terminology, array $customFields): array
    {
        $now = time();
        $p = $this->p;

        // 保存开关
        foreach ($toggles as $k => $v) {
            $sql = "INSERT INTO `{$p}sys_config` (`group_name`, `config_key`, `config_value`, `updated_at`) 
                    VALUES ('system', ?, ?, ?) 
                    ON DUPLICATE KEY UPDATE `config_value` = VALUES(`config_value`), `updated_at` = VALUES(`updated_at`)";
            $this->db->execute($sql, [$k, (string)$v, $now]);
        }

        // 保存文案
        foreach ($terminology as $k => $v) {
            $sql = "INSERT INTO `{$p}sys_config` (`group_name`, `config_key`, `config_value`, `updated_at`) 
                    VALUES ('system', ?, ?, ?) 
                    ON DUPLICATE KEY UPDATE `config_value` = VALUES(`config_value`), `updated_at` = VALUES(`updated_at`)";
            $this->db->execute($sql, [$k, (string)$v, $now]);
        }

        // 保存动态表单自定义字段 JSON
        $fieldsJson = json_encode($customFields, JSON_UNESCAPED_UNICODE);
        $sql = "INSERT INTO `{$p}sys_config` (`group_name`, `config_key`, `config_value`, `updated_at`) 
                VALUES ('system', 'industry_custom_fields', ?, ?) 
                ON DUPLICATE KEY UPDATE `config_value` = VALUES(`config_value`), `updated_at` = VALUES(`updated_at`)";
        $this->db->execute($sql, [$fieldsJson, $now]);

        try {
            $cache = CacheService::getInstance();
            if (method_exists($cache, 'clearTemplateCache')) {
                $cache->clearTemplateCache();
            } else {
                $cache->clear(true);
            }
        } catch (\Throwable $ce) {}

        return [
            'code' => 200,
            'msg'  => '业务配置已成功保存！',
            'data' => $this->getCurrentIndustryScenario()
        ];
    }

    /**
     * 写入行业专属示范数据包
     */
    private function seedScenarioData(string $key): void
    {
        $p = $this->p;
        $now = time();

        if ($key === 'pet_service') {
            // 清理旧服务数据并注入宠物专属数据
            $this->db->execute("DELETE FROM `{$p}rc_service_spec`");
            $this->db->execute("DELETE FROM `{$p}rc_service_item`");
            $this->db->execute("DELETE FROM `{$p}rc_service_category`");

            // 分类
            $this->db->execute("INSERT INTO `{$p}rc_service_category` (`id`, `biz_type`, `name`, `icon`, `sort`, `is_show`, `created_at`, `updated_at`) VALUES
                (1, 'service', '上门遛狗伴宠', '🐕', 100, 1, {$now}, {$now}),
                (2, 'service', '猫咪上门喂食', '🐱', 90, 1, {$now}, {$now}),
                (3, 'service', '宠物洗护美容', '🛁', 80, 1, {$now}, {$now}),
                (4, 'service', '驱虫与日常护理', '🩺', 70, 1, {$now}, {$now})");

            // 项目
            $this->db->execute("INSERT INTO `{$p}rc_service_item` (`id`, `category_id`, `biz_type`, `title`, `sub_title`, `cover_image`, `price`, `original_price`, `price_unit`, `pricing_type`, `service_duration`, `guarantee_tags`, `notice_tips`, `content_detail`, `sales_count`, `is_hot`, `sort`, `status`, `created_at`, `updated_at`) VALUES
                (1, 1, 'service', '狗狗专属户外遛弯服务', '专业佩戴牵引绳 · 户外散步30-60分钟 · GPS轨迹打卡', '/uploads/default/pet_walk.svg', 35.00, 45.00, '次', 'spec', 45, '持证宠托师,GPS轨迹打卡,安全防暴冲,意外险保障', '请自备牵引绳、拾便袋与水壶；如有护食、攻击倾向请提前告知。', '<p>专业持证宠托师上门，佩戴安全双保险牵引绳，全程记录运动轨迹与排便拍照。</p>', 128, 1, 100, 1, {$now}, {$now}),
                (2, 2, 'service', '猫咪无应激上门喂食护理', '更换粮水 · 清理猫砂消毒 · 陪玩梳毛互动15分钟', '/uploads/default/pet_cat.svg', 40.00, 50.00, '次', 'spec', 30, '实名宠托师,视频回传,全套消毒,无应激护理', '请将猫粮、罐头、冻干及猫砂放置于显眼处，并提供钥匙或智能锁密码。', '<p>专人进门穿鞋套消毒双手，清洗粮碗水碗，换新鲜水粮，铲除猫砂盆，观察猫咪精神状态并录视频回传主人。</p>', 215, 1, 90, 1, {$now}, {$now}),
                (3, 3, 'service', '上门宠物温水洗护烘干', '自带专业折叠浴盆 · 进口低敏沐浴露 · 负离子吹水烘干', '/uploads/default/pet_bath.svg', 98.00, 128.00, '次', 'spec', 60, '专业工具自带,低敏香波,轻柔吹水,无应激洗护', '服务需家里提供温水与电源，洗护前请确保宠物已接种狂犬疫苗。', '<p>免去去宠物店交叉感染与应激风险，师傅自带全套工具上门，洗剪吹一体化服务。</p>', 86, 0, 80, 1, {$now}, {$now}),
                (4, 4, 'service', '宠物全身体内外驱虫护理', '拜耳/大宠爱正品驱虫药 · 称重定量 · 观察用药反应', '/uploads/default/pet_care.svg', 68.00, 88.00, '次', 'fixed', 20, '正品保证,精准用量,观察反应,健康指导', '用药后请保持局部干燥，48小时内请勿洗澡。', '<p>由资深宠托师核对宠物月龄与体重，严格按克数使用正品驱虫滴剂与内驱药片。</p>', 94, 0, 70, 1, {$now}, {$now})");

            // 规格
            $this->db->execute("INSERT INTO `{$p}rc_service_spec` (`id`, `service_id`, `spec_name`, `spec_price`, `spec_unit`, `spec_desc`, `sort`, `is_default`, `status`, `created_at`) VALUES
                (1, 1, '小型犬 (体型<10kg / 散步30分钟)', 35.00, '次', '如柯基、泰迪、比熊', 100, 1, 1, {$now}),
                (2, 1, '中型犬 (体型10-25kg / 散步45分钟)', 50.00, '次', '如柴犬、边牧、萨摩耶', 90, 0, 1, {$now}),
                (3, 1, '大型犬 (体型>25kg / 散步60分钟)', 70.00, '次', '如金毛、拉布拉多、阿拉斯加', 80, 0, 1, {$now}),
                (4, 2, '单猫家庭 (标准护理20分钟)', 40.00, '次', '适合1只猫咪家庭', 100, 1, 1, {$now}),
                (5, 2, '多猫家庭 (2-3只猫 / 深度护理35分钟)', 60.00, '次', '适合2-3只猫咪深度喂食与铲砂', 90, 0, 1, {$now})");
        } elseif ($key === 'housekeeping') {
            $this->db->execute("DELETE FROM `{$p}rc_service_spec`");
            $this->db->execute("DELETE FROM `{$p}rc_service_item`");
            $this->db->execute("DELETE FROM `{$p}rc_service_category`");

            $this->db->execute("INSERT INTO `{$p}rc_service_category` (`id`, `biz_type`, `name`, `icon`, `sort`, `is_show`, `created_at`, `updated_at`) VALUES
                (1, 'service', '家电深度清洗', '❄️', 100, 1, {$now}, {$now}),
                (2, 'service', '全屋日常保洁', '🧹', 90, 1, {$now}, {$now}),
                (3, 'service', '厨房卫浴蒸汽消杀', '🍳', 80, 1, {$now}, {$now}),
                (4, 'service', '管道疏通排污', '🪠', 70, 1, {$now}, {$now})");

            $this->db->execute("INSERT INTO `{$p}rc_service_item` (`id`, `category_id`, `biz_type`, `title`, `sub_title`, `cover_image`, `price`, `original_price`, `price_unit`, `pricing_type`, `service_duration`, `guarantee_tags`, `notice_tips`, `content_detail`, `sales_count`, `is_hot`, `sort`, `status`, `created_at`, `updated_at`) VALUES
                (1, 1, 'service', '变频挂机空调高温深度拆洗', '拆卸面罩滤网 · 蒸发器140℃高温蒸汽灭菌 · 环保抑菌防霉', '/uploads/default/appliance_ac.svg', 89.00, 119.00, '台', 'spec', 60, '140℃高温灭菌,深度除垢,试机验收,无二次污染', '清洗前请确保空调能正常通电开启；服务需自备水电源。', '<p>专业清洗设备高温高压脉冲冲洗，深层消除冷凝水霉斑与军团菌。</p>', 342, 1, 100, 1, {$now}, {$now}),
                (2, 1, 'service', '油烟机全拆深度高温蒸洗', '纳米级去油污剂 · 强力软化重油垢 · 高温蒸汽冲洗风轮', '/uploads/default/service_hood.svg', 129.00, 169.00, '台', 'spec', 90, '官方认证师傅,不满意重洗,损坏包赔,无隐形收费', '请确保现场水电畅通；若油烟机年久老化严重无法正常拆装，师傅现场告知并协商免拆清洗方案。', '<p>全方位清理集油盒、导油槽与风轮积碳，彻底恢复强劲排烟吸力。</p>', 268, 1, 90, 1, {$now}, {$now}),
                (3, 2, 'service', '全屋日常精细保洁 (按时计费)', '客厅卧室卫生间全覆盖 · 分区毛巾作业 · 垃圾顺手带走', '/uploads/default/service_clean.svg', 45.00, 60.00, '小时', 'spec', 120, '实名认证阿姨,全套专业工具,迟到必赔,清洁不满意免单', '最低2小时起约；玻璃外窗高空作业不在日常保洁范围内。', '<p>严选持证阿姨，自带标准工具箱，全屋除尘、擦拭家具、地面吸尘拖洗。</p>', 510, 1, 80, 1, {$now}, {$now}),
                (4, 4, 'service', '家庭管道强力疏通', '电动钢丝疏通机 · 高压管道气炮 · 通顺后测试流水', '/uploads/default/service_pipe.svg', 80.00, 120.00, '次', 'fixed', 45, '急速上门,明码标价,修不好不收钱,质保90天', '基础费包含30分钟内常规机械疏通；疏通后当面通水试验；不通不收费。', '<p>马桶、地漏、厨房洗菜盆下水管道堵塞极速疏通，通好为止。</p>', 156, 0, 70, 1, {$now}, {$now})");

            $this->db->execute("INSERT INTO `{$p}rc_service_spec` (`id`, `service_id`, `spec_name`, `spec_price`, `spec_unit`, `spec_desc`, `sort`, `is_default`, `status`, `created_at`) VALUES
                (1, 1, '单台挂机空调深度清洗 (1-1.5匹)', 89.00, '台', '适合常规壁挂空调', 100, 1, 1, {$now}),
                (2, 1, '单台圆柱柜机深度清洗 (2-3匹)', 129.00, '台', '适合客厅大型柜机', 90, 0, 1, {$now}),
                (3, 1, '两台挂机优惠特惠套餐', 158.00, '台', '两居室超值套餐', 80, 0, 1, {$now}),
                (4, 3, '2小时基础单间/小户型保洁', 90.00, '次', '适合 50㎡ 以下居室', 100, 1, 1, {$now}),
                (5, 3, '3小时两室标准保洁', 135.00, '次', '适合 50-80㎡ 居室', 90, 0, 1, {$now}),
                (6, 3, '4小时大三室深度大扫除', 180.00, '次', '适合 80-120㎡ 居室', 80, 0, 1, {$now})");
        } elseif ($key === 'home_repair') {
            $this->db->execute("DELETE FROM `{$p}rc_service_spec`");
            $this->db->execute("DELETE FROM `{$p}rc_service_item`");
            $this->db->execute("DELETE FROM `{$p}rc_service_category`");

            $this->db->execute("INSERT INTO `{$p}rc_service_category` (`id`, `biz_type`, `name`, `icon`, `sort`, `is_show`, `created_at`, `updated_at`) VALUES
                (1, 'service', '水电电路检修', '⚡', 100, 1, {$now}, {$now}),
                (2, 'service', '门窗与锁具安装', '🔑', 90, 1, {$now}, {$now}),
                (3, 'service', '龙头卫浴洁具更换', '🚿', 80, 1, {$now}, {$now}),
                (4, 'service', '家具组装与打孔拆装', '🔨', 70, 1, {$now}, {$now})");

            $this->db->execute("INSERT INTO `{$p}rc_service_item` (`id`, `category_id`, `biz_type`, `title`, `sub_title`, `cover_image`, `price`, `original_price`, `price_unit`, `pricing_type`, `service_duration`, `guarantee_tags`, `notice_tips`, `content_detail`, `sales_count`, `is_hot`, `sort`, `status`, `created_at`, `updated_at`) VALUES
                (1, 1, 'service', '家庭电路跳闸与短路故障排查', '专业万用表摇表排查 · 快速定位短路点 · 修复恢复通电', '/uploads/default/dev_default.svg', 60.00, 80.00, '次', 'spec', 45, '持证电工,专业仪器排查,修不好不收钱,质保90天', '上门费包含初级故障排查；如需更换空开或重新穿线，材料费另计。', '<p>持证电工上门，分路排查漏保跳闸、零火线接反与插座无电。</p>', 189, 1, 100, 1, {$now}, {$now}),
                (2, 2, 'service', '防盗门锁体更换与超C级锁芯升级', '全铜超C级锁芯 · 防暴力开启 · 适配各类防盗门', '/uploads/default/dev_default.svg', 120.00, 160.00, '套', 'spec', 45, '超C级全铜防盗,防暴力破拆,当面试锁验收,质保1年', '师傅上门须核验业主身份证明方可作业。', '<p>防盗门卡死、钥匙拔不出、锁舌失灵快速上门更换新锁体。</p>', 230, 1, 90, 1, {$now}, {$now}),
                (3, 3, 'service', '面盆/厨房冷热龙头混水阀更换', '自带管钳生料带 · 防漏水密封缠绕 · 通水打压测试', '/uploads/default/dev_default.svg', 50.00, 70.00, '个', 'fixed', 30, '防漏质保,自带专业工具,通水试压,明码标价', '用户可自备心仪龙头，也可由师傅代买配件。', '<p>拆卸老旧生锈角阀、软管与混水龙头，安装新洁具并做好防水密封。</p>', 145, 0, 80, 1, {$now}, {$now})");

            $this->db->execute("INSERT INTO `{$p}rc_service_spec` (`id`, `service_id`, `spec_name`, `spec_price`, `spec_unit`, `spec_desc`, `sort`, `is_default`, `status`, `created_at`) VALUES
                (1, 1, '基础电路跳闸排查修复', 60.00, '次', '排查跳闸短路故障点', 100, 1, 1, {$now}),
                (2, 1, '单极/双极空气开关/漏电保护器更换 (含工时配件)', 95.00, '次', '含国标品牌空开配件', 90, 0, 1, {$now}),
                (3, 2, '用户自备锁芯师傅人工上门更换', 80.00, '套', '客户自备锁具上门安装', 100, 1, 1, {$now}),
                (4, 2, '全包套餐：超C级防盗锁芯 + 上门换锁', 158.00, '套', '含超C级叶片锁芯与师傅工时', 90, 0, 1, {$now})");
        } elseif ($key === 'digital_recycle') {
            // 纯数码回收：清理旧回收表并注入数码库
            $this->db->execute("DELETE FROM `{$p}rc_device`");
            $this->db->execute("DELETE FROM `{$p}rc_brand`");
            $this->db->execute("DELETE FROM `{$p}rc_category`");
            $this->db->execute("DELETE FROM `{$p}rc_question_item`");
            $this->db->execute("DELETE FROM `{$p}rc_question`");
            $this->seedDigitalData($p, $now);
        } else {
            // city_life 同城便民综合生活服务平台模式：同时聚合三大到家生活服务 + 数码3C闲置回收
            // 1. 清理并装载数码3C精品回收演示库 (杜绝废铁烂铜与报废车)
            $this->db->execute("DELETE FROM `{$p}rc_device`");
            $this->db->execute("DELETE FROM `{$p}rc_brand`");
            $this->db->execute("DELETE FROM `{$p}rc_category`");
            $this->db->execute("DELETE FROM `{$p}rc_question_item`");
            $this->db->execute("DELETE FROM `{$p}rc_question`");
            $this->seedDigitalData($p, $now);

            // 2. 清理并重装三大到家生活服务专属标准库 (上门宠物、家政保洁、家庭维修)
            $this->db->execute("DELETE FROM `{$p}rc_service_spec`");
            $this->db->execute("DELETE FROM `{$p}rc_service_item`");
            $this->db->execute("DELETE FROM `{$p}rc_service_category`");

            // 注入用户专属认同的 3 大生活服务核心行业分类
            $serviceCategories = [
                [1, 'service', '上门宠物与伴宠服务', '🐕', 100, 1, $now, $now],
                [2, 'service', '家政保洁与家电清洗', '🧹', 90, 1, $now, $now],
                [3, 'service', '家庭维修与安装快修', '🛠️', 80, 1, $now, $now]
            ];
            $this->batchInsert("{$p}rc_service_category", ['id', 'biz_type', 'name', 'icon', 'sort', 'is_show', 'created_at', 'updated_at'], $serviceCategories);

            // 注入三大行业全覆盖的标准精选服务项目 (状态全部为 active 上架)
            $serviceItems = [
                // 行业 1: 上门宠物与伴宠服务
                [1, 1, 'service', '狗狗专属户外散步遛弯服务', '专业佩戴牵引绳 · 户外散步30-60分钟 · GPS轨迹打卡', '/uploads/default/service_dog.svg', 35.00, 45.00, '次', 'spec', 45, '持证宠托师,GPS轨迹打卡,安全防暴冲,爱宠意外险', '请自备牵引绳、拾便袋与水壶；如有护食、攻击倾向请提前告知并备好安全嘴套。', '<p>专业持证宠托师上门，佩戴安全双保险牵引绳，全程记录运动轨迹与排便拍照，实时回传主人。</p>', 328, 1, 100, 1, $now, $now],
                [2, 1, 'service', '猫咪无应激上门喂食护理', '更换新鲜水粮 · 清洗粮碗水碗 · 猫砂清理除臭消毒 · 陪玩梳毛', '/uploads/default/pet_cat.svg', 40.00, 50.00, '次', 'spec', 30, '实名宠托师,高清视频回传,全套消毒,无应激护理', '请将猫粮、罐头、冻干及猫砂放置于显眼处，并提供钥匙或智能门锁密码。', '<p>专人进门双手消毒穿鞋套，清洗餐具，按量添加粮水，清理猫砂盆，观察猫咪健康状态并录制视频回传。</p>', 265, 1, 95, 1, $now, $now],
                [3, 1, 'service', '宠物上门温水洗护烘干', '自带专业折叠浴盆 · 进口低敏沐浴露 · 负离子吹水烘干', '/uploads/default/pet_bath.svg', 98.00, 128.00, '次', 'spec', 60, '自带全套工具,低敏香波,轻柔吹水,免去到店应激', '服务需家里提供温水与电源，洗护前请确保爱宠已接种狂犬疫苗。', '<p>免去带爱宠去宠物店交叉感染与路途应激风险，资深宠托师上门自带工具洗护美容。</p>', 156, 0, 90, 1, $now, $now],
                // 行业 2: 家政保洁与家电清洗
                [4, 2, 'service', '油烟机全拆深度高温蒸洗', '140℃高温蒸气灭菌 · 纳米级去重油垢 · 风轮深度清洁 · 试机验收', '/uploads/default/service_hood.svg', 129.00, 169.00, '台', 'spec', 90, '官方认证师傅,不满意重洗,损坏包赔,无隐形收费', '请确保现场水电畅通；若油烟机年久老化严重无法正常拆装，师傅现场告知并协商免拆清洗方案。', '<p>专业师傅携带专业高压高温蒸汽机上门，全方位分解陈年油垢，高温杀菌除味，彻底恢复强劲排烟吸力。</p>', 582, 1, 100, 1, $now, $now],
                [5, 2, 'service', '变频挂机空调高温深度拆洗', '拆卸面罩滤网 · 蒸发器140℃高温蒸汽灭菌 · 环保抑菌防霉', '/uploads/default/appliance_ac.svg', 89.00, 119.00, '台', 'spec', 60, '140℃高温灭菌,深度除垢,试机验收,无二次污染', '清洗前请确保空调能正常通电开启；服务需自备水电源。', '<p>专业清洗设备高温高压脉冲冲洗，深层消除冷凝水霉斑与军团菌，送风清新更省电。</p>', 430, 1, 95, 1, $now, $now],
                [6, 2, 'service', '全屋日常精细保洁 (4小时整屋)', '全屋分区专布专用 · 边角除尘 · 厨房卫浴深度清洁 · 垃圾带走', '/uploads/default/service_clean.svg', 169.00, 219.00, '次', 'spec', 240, '实名认证阿姨,全套专业工具,迟到必赔,清洁不满意免单', '服务范围不含室外外墙高空擦窗、古董字画及拆洗重度油污电器；请预先妥善保管贵重首饰现金。', '<p>标准4小时保洁服务，涵盖客餐厅、卧室、厨房表面油污擦拭、卫生间水垢除菌及地面深度清拖。</p>', 612, 1, 90, 1, $now, $now],
                // 行业 3: 家庭维修与安装快修
                [7, 3, 'service', '家庭电路跳闸与短路故障排查', '专业万用表摇表排查 · 快速定位短路点 · 修复恢复通电', '/uploads/default/service_circuit.svg', 60.00, 80.00, '次', 'spec', 45, '持证电工,专业仪器排查,修不好不收钱,质保90天', '上门费包含初级故障排查；如需更换空开或重新穿线，材料费另计。', '<p>持证电工上门，分路排查漏保跳闸、零火线接反与插座无电，修不好不收费，官方质保90天。</p>', 289, 1, 100, 1, $now, $now],
                [8, 3, 'service', '家庭管道强力疏通/漏水排障', '专业疏通机/内窥镜排障 · 快速上门 · 疏通不成功不收费', '/uploads/default/service_pipe.svg', 88.00, 120.00, '次', 'fixed', 45, '急速上门,明码标价,修不好不收钱,质保90天', '基础费包含30分钟内常规机械疏通；疏通后当面通水试验；不通不收费。', '<p>解决地漏返水、马桶堵塞、下水道不畅等突发状况，专业机械设备高效通畅。</p>', 345, 1, 95, 1, $now, $now],
                [9, 3, 'service', '防盗门锁体更换与超C级锁芯升级', '全铜超C级锁芯 · 防暴力开启 · 适配各类防盗门', '/uploads/default/service_lock.svg', 120.00, 160.00, '套', 'spec', 45, '超C级全铜防盗,防暴力破拆,当面试锁验收,质保1年', '师傅上门须核验业主身份证明方可作业。', '<p>防盗门卡死、钥匙拔不出、锁舌失灵快速上门更换新锁体与超C级锁芯。</p>', 198, 0, 90, 1, $now, $now]
            ];
            $itemCols = ['id', 'category_id', 'biz_type', 'title', 'sub_title', 'cover_image', 'price', 'original_price', 'price_unit', 'pricing_type', 'service_duration', 'guarantee_tags', 'notice_tips', 'content_detail', 'sales_count', 'is_hot', 'sort', 'status', 'created_at', 'updated_at'];
            $this->batchInsert("{$p}rc_service_item", $itemCols, $serviceItems);

            // 注入三大行业专属多规格阶梯价格
            $serviceSpecs = [
                // 狗狗散步规格
                [1, 1, '小型犬遛狗 (体型<10kg / 散步30分钟)', 35.00, '次', '如柯基、泰迪、比熊、雪纳瑞', 10, 1, 1, $now],
                [2, 1, '中型犬遛狗 (体型10-25kg / 散步45分钟)', 50.00, '次', '如柴犬、边牧、萨摩耶、哈士奇', 9, 0, 1, $now],
                [3, 1, '大型犬遛狗 (体型>25kg / 散步60分钟)', 70.00, '次', '如金毛、拉布拉多、阿拉斯加、巨贵', 8, 0, 1, $now],
                // 猫咪喂食规格
                [4, 2, '单猫家庭 (标准护理20分钟)', 40.00, '次', '适合1只猫咪家庭', 10, 1, 1, $now],
                [5, 2, '多猫家庭 (2-3只猫 / 深度护理35分钟)', 60.00, '次', '适合2-3只猫咪深度喂食与铲砂', 9, 0, 1, $now],
                // 宠物洗护规格
                [6, 3, '小型犬/猫咪温水洗护 (<10kg)', 98.00, '次', '含洗护、吹水烘干、修脚毛趾甲', 10, 1, 1, $now],
                [7, 3, '中大型犬温水洗护 (>10kg)', 148.00, '次', '含全套去污顺毛与烘干吹水', 9, 0, 1, $now],
                // 油烟机规格
                [8, 4, '侧吸式/中式油烟机全拆清洗 (1台)', 129.00, '台', '适合常规侧吸或老式中式油烟机', 10, 1, 1, $now],
                [9, 4, '欧式/顶吸式油烟机全拆清洗 (1台)', 149.00, '台', '适合常规T型、塔型顶吸油烟机', 9, 0, 1, $now],
                [10, 4, '集成灶深度拆洗 (1台)', 199.00, '台', '包含下排风道、集油盒与灶台全套清洗', 8, 0, 1, $now],
                // 空调规格
                [11, 5, '单台挂机空调深度清洗 (1-1.5匹)', 89.00, '台', '适合常规壁挂空调', 10, 1, 1, $now],
                [12, 5, '单台圆柱柜机深度清洗 (2-3匹)', 129.00, '台', '适合客厅大型柜机', 9, 0, 1, $now],
                [13, 5, '两台挂机空调特惠套餐', 158.00, '台', '两居室超值套餐', 8, 0, 1, $now],
                // 保洁规格
                [14, 6, '2小时基础保洁 (中小户型/局部)', 99.00, '次', '适合 50㎡ 以下或局部区域保洁', 10, 0, 1, $now],
                [15, 6, '3小时深度保洁 (两居室标准)', 139.00, '次', '适合 50-80㎡ 居室整屋擦拭打扫', 9, 0, 1, $now],
                [16, 6, '4小时整屋深度大扫除 (三居室推荐)', 169.00, '次', '适合 80-120㎡ 居室全屋深度保洁', 8, 1, 1, $now],
                // 电路维修规格
                [17, 7, '基础电路跳闸排查修复', 60.00, '次', '排查跳闸短路故障点', 10, 1, 1, $now],
                [18, 7, '单极/双极空气开关更换 (含工时配件)', 95.00, '次', '含国标品牌空开配件', 9, 0, 1, $now],
                // 门锁规格
                [19, 9, '用户自备锁芯师傅人工上门更换', 80.00, '套', '客户自备锁具上门安装', 10, 1, 1, $now],
                [20, 9, '全包套餐：超C级防盗锁芯 + 上门换锁', 158.00, '套', '含超C级叶片锁芯与师傅工时', 9, 0, 1, $now]
            ];
            $specCols = ['id', 'service_id', 'spec_name', 'spec_price', 'spec_unit', 'spec_desc', 'sort', 'is_default', 'status', 'created_at'];
            $this->batchInsert("{$p}rc_service_spec", $specCols, $serviceSpecs);
        }
    }

    protected function batchInsert(string $table, array $columns, array $rows): void
    {
        if (empty($rows)) {
            return;
        }
        $colSql = '`' . implode('`, `', $columns) . '`';
        $rowPlaceholder = '(' . implode(', ', array_fill(0, count($columns), '?')) . ')';
        $placeholdersSql = implode(', ', array_fill(0, count($rows), $rowPlaceholder));

        $flatParams = [];
        foreach ($rows as $row) {
            foreach ($row as $val) {
                $flatParams[] = $val;
            }
        }

        $sql = "INSERT INTO `{$table}` ({$colSql}) VALUES {$placeholdersSql}";
        $this->db->execute($sql, $flatParams);
    }

}
