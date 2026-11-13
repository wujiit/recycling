<?php
/**
 * 客户端估价接口控制器
 * 负责客户端估价、品类机型查询与平台基础信息接口
 */

namespace App\Controller\Api;

use App\Controller\Controller;
use App\Common\Request;
use App\Model\DeviceModel;
use App\Service\PricingService;

class AppraisalController extends Controller
{
    private $deviceModel;
    private $pricingService;

    public function __construct()
    {
        $this->deviceModel = new DeviceModel();
        $this->pricingService = new PricingService();
    }

    /**
     * 获取当前平台生效的行业业务模板与全套系统自定义参数 (SEO、品牌、Logo、备案等)
     */
    public function getPlatformInfo(): void
    {
        // 关键性能优化：首页高频配置聚合接口实施短时双模缓存 (提速数十倍，防并发压垮数据库)
        $cache = \App\Service\CacheService::getInstance();
        $cacheKey = 'platform_info:appraisal';
        $cached = $cache->get($cacheKey);
        if (is_array($cached) && isset($cached['footer_articles']) && isset($cached['notices'])) {
            $this->success($cached, '获取平台配置成功');
            return;
        }

        $svc = new \App\Service\TemplateService();
        $scenario = $svc->getCurrentIndustryScenario();
        $meta = $svc->getCurrentTemplateMeta();
        $themeStyle = $svc->getCurrentThemeStyle();

        // 深度读取全套系统自定义参数 (优先复用 sys_config:all 高速缓存)
        $configs = $cache->get('sys_config:all');
        if (!is_array($configs)) {
            $db = \App\Model\Database::getInstance();
            $p = $db->getPrefix();
            $rows = $db->fetchAll("SELECT `config_key`, `config_value` FROM `{$p}sys_config`");
            $configs = [];
            foreach ($rows as $row) {
                $configs[$row['config_key']] = $row['config_value'];
            }
            $cache->set('sys_config:all', $configs, 3600);
        }

        // 优先根据后台自定义配置或行业模板获取品牌简称，避免长名称截断
        $defaultSiteName = !empty($scenario['site_name']) ? $scenario['site_name'] : $meta['site_name'];
        if (!empty($configs['brand_name']) && trim($configs['brand_name']) !== '') {
            $brandName = trim($configs['brand_name']);
        } else {
            $rawName = !empty($configs['site_name']) ? trim($configs['site_name']) : $defaultSiteName;
            if (mb_strpos($rawName, '·') !== false) {
                $parts = explode('·', $rawName);
                $brandName = trim($parts[0]);
            } elseif (mb_strpos($rawName, '-') !== false) {
                $parts = explode('-', $rawName);
                $brandName = trim($parts[0]);
            } else {
                $brandName = $rawName;
            }
            if (empty($brandName)) {
                $brandName = '启灵同城服务';
            }
        }

        $merged = array_merge(
            $meta,
            [
                'industry_template'               => $svc->getCurrentTemplateKey(),
                'industry_scenario'               => $scenario['key'] ?? 'city_life',
                'scenario_name'                   => $scenario['name'] ?? '同城生活',
                'scenario_badge'                  => $scenario['badge'] ?? '',
                'feature_toggles'                 => $scenario['feature_toggles'] ?? [],
                'module_recycle_enabled'          => (string)($scenario['feature_toggles']['module_recycle_enabled'] ?? '1'),
                'module_service_enabled'          => (string)($scenario['feature_toggles']['module_service_enabled'] ?? '1'),
                'module_technician_pool_enabled'  => (string)($scenario['feature_toggles']['module_technician_pool_enabled'] ?? '1'),
                'module_express_enabled'          => (string)($scenario['feature_toggles']['module_express_enabled'] ?? '1'),
                'terminology'                     => $scenario['terminology'] ?? [],
                'market_boards'                   => $svc->getIndustryMarketBoards(),
            ],
            $this->buildPlatformBrandConfigs($configs, $meta, $themeStyle, $brandName, $scenario),
            $this->buildPlatformHeroConfigs($configs, $meta, $scenario),
            $this->buildPlatformFulfillmentConfigs($configs),
            $this->buildPlatformFooterConfigs($configs),
            $this->buildPlatformMarketingAndProcessConfigs($configs, $scenario),
            $this->buildMiniappCustomConfigs($configs, $scenario, $meta)
        );

        // 缓存 10 分钟 (后台修改配置或导航时自动清除)
        $cache->set($cacheKey, $merged, 600);
        $this->success($merged, '获取平台配置成功');
    }

    private function buildPlatformBrandConfigs(array $configs, array $meta, array $themeStyle, string $brandName, array $scenario = []): array
    {
        $defaultSiteName = !empty($scenario['site_name']) ? $scenario['site_name'] : $meta['site_name'];
        $defaultSlogan   = !empty($scenario['slogan']) ? $scenario['slogan'] : $meta['slogan'];
        $defaultDesc     = !empty($scenario['desc']) ? $scenario['desc'] : $meta['desc'];
        $primaryColor    = !empty($scenario['theme_color']) ? $scenario['theme_color'] : $themeStyle['primary'];

        return [
            'theme_style'    => !empty($scenario['theme_style']) ? $scenario['theme_style'] : $themeStyle['key'],
            'theme_name'     => $themeStyle['name'],
            'theme_primary'  => $primaryColor,
            'theme_hover'    => $themeStyle['primary_hover'],
            'theme_light'    => $themeStyle['primary_light'],
            'theme_accent'   => $themeStyle['accent'],
            'theme_gradient' => "linear-gradient(135deg, {$primaryColor} 0%, #3b82f6 100%)",
            'theme_color'    => $primaryColor,
            'brand_name'     => $brandName,
            'site_logo'      => !empty($configs['site_logo']) ? $configs['site_logo'] : '/uploads/default/site_logo.svg',
            'site_favicon'   => !empty($configs['site_favicon']) ? $configs['site_favicon'] : '/uploads/default/site_favicon.svg',
            'site_name'      => !empty($configs['site_name']) ? $configs['site_name'] : $defaultSiteName,
            'site_slogan'    => !empty($configs['site_slogan']) ? $configs['site_slogan'] : $defaultSlogan,
            'service_tel'    => !empty($configs['service_tel']) ? $configs['service_tel'] : '400-800-8888',
            'service_wechat' => $configs['service_wechat'] ?? '',
            'service_qr'     => $configs['service_qr'] ?? '',
            'icp_beian'      => $configs['icp_beian'] ?? '京ICP备20260001号',
            'gong_an_beian'  => $configs['gong_an_beian'] ?? '',
            'gong_an_icon'   => !empty($configs['gong_an_icon']) ? $configs['gong_an_icon'] : '/uploads/default/police_badge.svg',
            'gong_an_url'    => $configs['gong_an_url'] ?? '',
            'copyright'      => !empty($configs['copyright']) ? $configs['copyright'] : '© 2026 启灵智能同城综合服务平台 · 保留所有权利',
            'seo_title'       => !empty($configs['seo_title']) ? $configs['seo_title'] : ($defaultSiteName . ' · ' . $defaultSlogan),
            'seo_keywords'    => !empty($configs['seo_keywords']) ? $configs['seo_keywords'] : '上门服务,同城便民,宠物伴宠,家政保洁,二手回收,极速上门',
            'seo_description' => !empty($configs['seo_description']) ? $configs['seo_description'] : $defaultDesc,
        ];
    }

    private function buildPlatformHeroConfigs(array $configs, array $meta, array $scenario = []): array
    {
        $scKey = $scenario['key'] ?? 'city_life';
        $isRecycleEnabled = ($scenario['feature_toggles']['module_recycle_enabled'] ?? '1') === '1';
        $isServiceEnabled = ($scenario['feature_toggles']['module_service_enabled'] ?? '1') === '1';

        // 默认自适应文案
        $defaultTitle = !empty($scenario['site_name']) ? $scenario['site_name'] : $meta['site_name'];
        $defaultSub   = !empty($scenario['slogan']) ? $scenario['slogan'] : $meta['slogan'];
        $defaultBadge = '官方实名认证 · 准时准点到达 · 价格公开透明 · 平台全程质保';
        $defaultBtnText = '全站搜索';
        $defaultPlaceholder = '输入您需要的服务项目或回收品类...';
        $defaultHotTags = [
            ['label' => '热门推荐', 'keyword' => '热门']
        ];
        $defaultMetrics = [
            ['icon' => 'shield', 'val' => '100%+', 'lbl' => '实名认证考核'],
            ['icon' => 'clock', 'val' => '30分', 'lbl' => '极速快速响应'],
            ['icon' => 'bag', 'val' => '标准', 'lbl' => '明码公道标价'],
            ['icon' => 'truck', 'val' => '售后', 'lbl' => '平台质保保障']
        ];

        if ($scKey === 'pet_service') {
            $defaultTitle = '专业上门伴宠 · 24小时随叫随约';
            $defaultSub   = '专业持证宠托师 · 上门喂猫遛狗 · 洗护驱虫 · 全程GPS轨迹录像打卡';
            $defaultBadge = '官方认证 · 持证宠托师 · 全程录像打卡 · 百万安全保障';
            $defaultBtnText = '搜索伴宠服务';
            $defaultPlaceholder = '输入爱宠需求，如：上门遛狗, 猫咪喂食, 宠物洗护, 驱虫护理...';
            $defaultHotTags = [
                ['label' => '狗狗户外遛弯', 'keyword' => '遛狗'],
                ['label' => '猫咪上门喂食', 'keyword' => '喂食'],
                ['label' => '宠物温水洗护', 'keyword' => '洗护'],
                ['label' => '体外体内驱虫', 'keyword' => '驱虫'],
                ['label' => '伴宠互动陪玩', 'keyword' => '伴宠']
            ];
            $defaultMetrics = [
                ['icon' => 'shield', 'val' => '100%', 'lbl' => '实名持证宠托师'],
                ['icon' => 'clock', 'val' => '准时', 'lbl' => '预约准时到达'],
                ['icon' => 'bag', 'val' => '全程', 'lbl' => 'GPS轨迹与录像'],
                ['icon' => 'truck', 'val' => '100万', 'lbl' => '爱宠人身意外险']
            ];
        } elseif ($scKey === 'housekeeping' || $scKey === 'home_cleaning') {
            $defaultTitle = '专业家政保洁 · 家电深度清洗';
            $defaultSub   = '140℃高温蒸汽深度杀菌 · 持证保洁工程师 · 标准透明定价';
            $defaultBadge = '实名认证 · 准时上门 · 进口专业药剂消杀 · 不满意免费重做';
            $defaultBtnText = '搜索保洁项目';
            $defaultPlaceholder = '输入保洁项目，如：日常家庭保洁, 油烟机清洗, 空调深度清洗...';
            $defaultHotTags = [
                ['label' => '日常家庭保洁', 'keyword' => '日常保洁'],
                ['label' => '油烟机深度拆洗', 'keyword' => '油烟机'],
                ['label' => '空调免拆消杀', 'keyword' => '空调清洗'],
                ['label' => '全屋深度开荒', 'keyword' => '开荒保洁'],
                ['label' => '玻璃高温消杀', 'keyword' => '擦玻璃']
            ];
            $defaultMetrics = [
                ['icon' => 'shield', 'val' => '100%', 'lbl' => '持证保洁工程师'],
                ['icon' => 'clock', 'val' => '准时', 'lbl' => '准点上门服务'],
                ['icon' => 'bag', 'val' => '透明', 'lbl' => '明码公道标价'],
                ['icon' => 'medal', 'val' => '重做', 'lbl' => '不满意免费返工']
            ];
        } elseif ($scKey === 'home_repair') {
            $defaultTitle = '社区家庭维修 · 专业安装快修';
            $defaultSub   = '30分钟极速上门 · 准时准点 · 严选专业特聘 · 质保90天';
            $defaultBadge = '持证特约技师 · 明码标价 · 90天超长质保 · 报修无忧';
            $defaultBtnText = '搜索快修报修';
            $defaultPlaceholder = '输入报修项目，如：水管漏水, 马桶疏通, 电路检修, 门窗五金...';
            $defaultHotTags = [
                ['label' => '水管漏水维修', 'keyword' => '漏水'],
                ['label' => '马桶下水疏通', 'keyword' => '疏通'],
                ['label' => '电路跳闸排查', 'keyword' => '电路'],
                ['label' => '水龙头角阀更换', 'keyword' => '水龙头'],
                ['label' => '门窗五金开锁', 'keyword' => '门窗']
            ];
            $defaultMetrics = [
                ['icon' => 'shield', 'val' => '100%', 'lbl' => '实名持证师傅'],
                ['icon' => 'clock', 'val' => '30分', 'lbl' => '极速响应上门'],
                ['icon' => 'bag', 'val' => '透明', 'lbl' => '工单明码实价'],
                ['icon' => 'medal', 'val' => '90天', 'lbl' => '官方超长质保']
            ];
        } elseif ($scKey === 'digital_recycle' || (!$isServiceEnabled && $isRecycleEnabled)) {
            $defaultTitle = '全品类高价回收 · 10秒快速估价';
            $defaultSub   = '官方标准透明报价 · 顺丰免费上门包邮 · 个人隐私安全清除';
            $defaultBadge = '官方自营 · 顺丰免费上门 · 10秒快速估价 · 秒级放款到账';
            $defaultBtnText = '立即估价';
            $defaultPlaceholder = '输入您要回收的商品或型号，如：iPhone 15 Pro, Mate 60, 小米14, 联想电脑...';
            $defaultHotTags = [
                ['label' => 'iPhone 15 Pro', 'keyword' => 'iPhone 15 Pro'],
                ['label' => 'Mate 60 Pro', 'keyword' => 'Mate 60 Pro'],
                ['label' => '小米 14', 'keyword' => '小米14'],
                ['label' => 'MacBook Pro', 'keyword' => 'MacBook'],
                ['label' => 'iPad Pro', 'keyword' => 'iPad']
            ];
            $defaultMetrics = [
                ['icon' => 'bag', 'val' => '120万+', 'lbl' => '累计完成回收'],
                ['icon' => 'clock', 'val' => '10秒', 'lbl' => '快速精准估价'],
                ['icon' => 'truck', 'val' => '0元', 'lbl' => '顺丰双向保价包邮'],
                ['icon' => 'shield', 'val' => '100%', 'lbl' => '隐私安全清除']
            ];
        }

        // 纯服务场景下若配置仍为回收默认文案，自动适配为当前服务的标题与指标
        $rawHeroTitle = !empty($configs['hero_title']) ? $configs['hero_title'] : (!empty($configs['banner_title']) ? $configs['banner_title'] : '');
        $finalHeroTitle = $rawHeroTitle;
        if (empty($finalHeroTitle) || (!$isRecycleEnabled && mb_strpos($finalHeroTitle, '回收') !== false)) {
            $finalHeroTitle = $defaultTitle;
        }

        $rawHeroSub = !empty($configs['hero_subtitle']) ? $configs['hero_subtitle'] : (!empty($configs['banner_subtitle']) ? $configs['banner_subtitle'] : '');
        $finalHeroSub = $rawHeroSub;
        if (empty($finalHeroSub) || (!$isRecycleEnabled && mb_strpos($finalHeroSub, '回收') !== false)) {
            $finalHeroSub = $defaultSub;
        }

        $finalSearchPlaceholder = !empty($configs['hero_search_placeholder']) ? $configs['hero_search_placeholder'] : $defaultPlaceholder;
        if (!$isRecycleEnabled && mb_strpos($finalSearchPlaceholder, '回收') !== false) {
            $finalSearchPlaceholder = $defaultPlaceholder;
        }

        $finalSearchBtnText = !empty($configs['hero_search_btn_text']) ? $configs['hero_search_btn_text'] : $defaultBtnText;
        if (!$isRecycleEnabled && mb_strpos($finalSearchBtnText, '估价') !== false) {
            $finalSearchBtnText = $defaultBtnText;
        }

        $rawHotTags = !empty($configs['hero_hot_tags']) ? json_decode($configs['hero_hot_tags'], true) : null;
        $finalHotTags = (is_array($rawHotTags) && count($rawHotTags) > 0) ? $rawHotTags : $defaultHotTags;
        if (!$isRecycleEnabled && isset($finalHotTags[0]['keyword']) && mb_strpos($finalHotTags[0]['keyword'], 'iPhone') !== false) {
            $finalHotTags = $defaultHotTags;
        }

        $rawMetrics = !empty($configs['hero_metrics']) ? json_decode($configs['hero_metrics'], true) : null;
        $finalMetrics = (is_array($rawMetrics) && count($rawMetrics) > 0) ? $rawMetrics : $defaultMetrics;
        if (!$isRecycleEnabled && isset($finalMetrics[0]['lbl']) && mb_strpos($finalMetrics[0]['lbl'], '回收') !== false) {
            $finalMetrics = $defaultMetrics;
        }

        return [
            'hero_mode'                     => !empty($configs['hero_mode']) ? $configs['hero_mode'] : 'search',
            'hero_badge_enabled'            => ($configs['hero_badge_enabled'] ?? '1') !== '0',
            'hero_badge_text'               => !empty($configs['hero_badge_text']) ? $configs['hero_badge_text'] : $defaultBadge,
            'hero_title'                    => $finalHeroTitle,
            'hero_subtitle'                 => $finalHeroSub,
            'hero_search_btn_text'          => $finalSearchBtnText,
            'hero_search_placeholder'       => $finalSearchPlaceholder,
            'hero_hot_tags'                 => $finalHotTags,
            'hero_metrics'                  => $finalMetrics,
            'hero_banner_autoplay'          => !empty($configs['hero_banner_autoplay']) ? max(2, (int)$configs['hero_banner_autoplay']) : 4,
            'hero_banner_floating_estimate' => ($configs['hero_banner_floating_estimate'] ?? '1') !== '0',
            'banners'                       => (new \App\Model\BannerModel())->getAllBanners(true),
            'banner_title'                  => $finalHeroTitle,
            'banner_subtitle'               => $finalHeroSub,
            'price_lock_days'               => !empty($configs['price_lock_days']) ? (int)$configs['price_lock_days'] : 7,
            'ticker_enabled'  => ($configs['ticker_enabled'] ?? '1') !== '0',
            'ticker_tag'      => !empty($configs['ticker_tag']) ? $configs['ticker_tag'] : '实时动态',
            'ticker_interval' => !empty($configs['ticker_interval']) ? max(2, (int)$configs['ticker_interval']) : 4,
            'ticker_messages' => $configs['ticker_messages'] ?? '',
        ];
    }

    private function buildPlatformFulfillmentConfigs(array $configs): array
    {
        return [
            'recycle_home_enabled'  => ($configs['recycle_home_enabled'] ?? '1') !== '0',
            'recycle_home_name'     => !empty($configs['recycle_home_name']) ? $configs['recycle_home_name'] : '预约免费上门',
            'recycle_home_desc'     => !empty($configs['recycle_home_desc']) ? $configs['recycle_home_desc'] : '专业人员免费上门，当面验货核验',
            'recycle_mail_enabled'  => ($configs['recycle_mail_enabled'] ?? '1') !== '0',
            'recycle_mail_name'     => (!empty($configs['recycle_mail_name']) && $configs['recycle_mail_name'] !== '全国顺丰包邮' && $configs['recycle_mail_name'] !== '全国快递包邮') ? $configs['recycle_mail_name'] : '快速寄送',
            'recycle_mail_desc'     => !empty($configs['recycle_mail_desc']) ? $configs['recycle_mail_desc'] : '快递小哥上门取件，快速寄出验机结算',
            'recycle_store_enabled' => ($configs['recycle_store_enabled'] ?? '1') !== '0',
            'recycle_store_name'    => !empty($configs['recycle_store_name']) ? $configs['recycle_store_name'] : '线下门店自送',
            'recycle_store_desc'    => !empty($configs['recycle_store_desc']) ? $configs['recycle_store_desc'] : '前往就近服务门店交接，现场秒级结清',
            'sf_enabled'            => ($configs['sf_enabled'] ?? '0') === '1',
            'sf_pay_method'         => !empty($configs['sf_pay_method']) ? (string)$configs['sf_pay_method'] : '2',
            'sf_freight_tag'        => !empty($configs['sf_freight_tag']) ? trim($configs['sf_freight_tag']) : '运费补贴·推荐',
            'sf_freight_rule'       => !empty($configs['sf_freight_rule']) ? trim($configs['sf_freight_rule']) : '',
            'sf_receive_contact'    => !empty($configs['sf_receive_contact']) ? $configs['sf_receive_contact'] : '平台质检收件中心',
            'sf_receive_mobile'     => !empty($configs['sf_receive_mobile']) ? $configs['sf_receive_mobile'] : (!empty($configs['service_tel']) ? $configs['service_tel'] : '400-800-8888'),
            'sf_receive_address'    => trim(($configs['sf_receive_province'] ?? '') . ($configs['sf_receive_city'] ?? '') . ($configs['sf_receive_district'] ?? '') . ($configs['sf_receive_address'] ?? '')) ?: '平台回收质检中心',
            'payout_alipay_enabled' => ($configs['payout_alipay_enabled'] ?? '1') !== '0',
            'payout_alipay_title'   => !empty($configs['payout_alipay_title']) ? trim(preg_replace('/\s*[\(（].*?[\)）]/u', '', $configs['payout_alipay_title'])) : '支付宝',
            'payout_bank_enabled'   => ($configs['payout_bank_enabled'] ?? '1') !== '0',
            'payout_bank_title'     => !empty($configs['payout_bank_title']) ? trim(preg_replace('/\s*[\(（].*?[\)）]/u', '', $configs['payout_bank_title'])) : '银行卡转账',
            'payout_wechat_enabled' => ($configs['payout_wechat_enabled'] ?? '1') !== '0',
            'payout_wechat_title'   => !empty($configs['payout_wechat_title']) ? trim(preg_replace('/\s*[\(（].*?[\)）]/u', '', $configs['payout_wechat_title'])) : '微信零钱',
            'payout_cash_enabled'   => ($configs['payout_cash_enabled'] ?? '1') !== '0',
            'payout_cash_title'     => !empty($configs['payout_cash_title']) ? trim(preg_replace('/\s*[\(（].*?[\)）]/u', '', $configs['payout_cash_title'])) : '现场现金',
            'user_auth_password_enabled' => ($configs['user_auth_password_enabled'] ?? '1') !== '0',
            'user_register_enabled'      => ($configs['user_register_enabled'] ?? '1') !== '0',
            'user_auth_fast_enabled'     => ($configs['user_auth_fast_enabled'] ?? '1') !== '0',
            'user_auth_wechat_enabled'   => ($configs['user_auth_wechat_enabled'] ?? '1') !== '0',
            'user_order_guest_enabled'   => ($configs['user_order_guest_enabled'] ?? '1') !== '0',
            'user_require_realname'      => ($configs['user_require_realname'] ?? '0') === '1',
            'nav_menus'                  => (new \App\Service\MenuService())->getMenus(true),
        ];
    }

    private function buildPlatformFooterConfigs(array $configs): array
    {
        return [
            'footer_desc'                => !empty($configs['footer_desc']) ? $configs['footer_desc'] : '官方直营全场景同城数字化便民服务平台。标准透明定价，实名严选考核，平台全程担保，售后质保无忧，打造安心贴心的美好生活新体验。',
            'footer_trust_tags'          => !empty($configs['footer_trust_tags']) ? $configs['footer_trust_tags'] : '实名严格认证, 准时准点履约, 标准透明定价, 平台质保无忧',
            'footer_service_tel'         => !empty($configs['footer_service_tel']) ? $configs['footer_service_tel'] : (!empty($configs['service_tel']) ? $configs['service_tel'] : '400-800-8888'),
            'footer_service_time'        => !empty($configs['footer_service_time']) ? $configs['footer_service_time'] : '周一至周日 9:00 - 21:00 (节假日无休)',
            'footer_service_email'       => !empty($configs['footer_service_email']) ? $configs['footer_service_email'] : 'service@qilingrecycle.com',
            'footer_address'             => !empty($configs['footer_address']) ? $configs['footer_address'] : '深圳市南山区高新南一道科兴科学园B座质检收发中心',
            'footer_qrcode_wechat'       => !empty($configs['footer_qrcode_wechat']) ? $configs['footer_qrcode_wechat'] : '/uploads/default/site_logo.svg',
            'footer_qrcode_wechat_title' => !empty($configs['footer_qrcode_wechat_title']) ? $configs['footer_qrcode_wechat_title'] : '微信扫码 · 专属客服 1对1',
            'footer_qrcode_mp'           => !empty($configs['footer_qrcode_mp']) ? $configs['footer_qrcode_mp'] : '',
            'footer_qrcode_mp_title'     => !empty($configs['footer_qrcode_mp_title']) ? $configs['footer_qrcode_mp_title'] : '官方公众号 · 获取最新行情与优惠',
            'footer_articles'            => (new \App\Model\ArticleModel())->getFooterArticlesGrouped(),
            'notices'                    => (new \App\Model\ArticleModel())->getNotices(10),
            'coupon_system_enabled'          => ($configs['coupon_system_enabled'] ?? '1') !== '0',
            'coupon_nav_entry_enabled'       => ($configs['coupon_nav_entry_enabled'] ?? '1') !== '0',
            'coupon_home_showcase_enabled'   => ($configs['coupon_home_showcase_enabled'] ?? '1') !== '0',
            'coupon_float_widget_enabled'    => ($configs['coupon_float_widget_enabled'] ?? '1') !== '0',
            'coupon_float_title'             => !empty($configs['coupon_float_title']) ? $configs['coupon_float_title'] : '加价补贴券',
            'coupon_float_subtitle'          => !empty($configs['coupon_float_subtitle']) ? $configs['coupon_float_subtitle'] : '最高立加¥300',
            'coupon_float_bottom_offset'     => !empty($configs['coupon_float_bottom_offset']) ? (int)$configs['coupon_float_bottom_offset'] : 145,
            'coupon_eval_badge_enabled'      => ($configs['coupon_eval_badge_enabled'] ?? '1') !== '0',
            'coupon_order_select_enabled'    => ($configs['coupon_order_select_enabled'] ?? '1') !== '0',
            'miniapp_coupon_section_enabled' => ($configs['miniapp_coupon_section_enabled'] ?? '1') !== '0',
            'miniapp_coupon_float_enabled'   => ($configs['miniapp_coupon_float_enabled'] ?? '1') !== '0',
            'miniapp_coupon_eval_enabled'    => ($configs['miniapp_coupon_eval_enabled'] ?? '1') !== '0',
        ];
    }

    private function buildPlatformMarketingAndProcessConfigs(array $configs, array $scenario = []): array
    {
        $scKey = $scenario['key'] ?? 'city_life';
        $isRecycleEnabled = ($scenario['feature_toggles']['module_recycle_enabled'] ?? '1') === '1';
        $isServiceEnabled = ($scenario['feature_toggles']['module_service_enabled'] ?? '1') === '1';

        $pTitle = '简单3步 · 闲置极速变现';
        $pSub = '顺丰免费上门 / 官方专业质检 / 确认后秒级极速放款';
        $pS1T = '在线智能精准估价';
        $pS1D = '快速勾选机况成色，系统自动匹配最新市场行情价，满意后再提交。';
        $pS2T = '顺丰免费上门 · 包邮';
        $pS2D = '顺丰小哥免费上门当面装箱封签，全国往返双向包邮且全程保价，您无需支付任何运费。';
        $pS3T = '官方质检 · 秒级放款';
        $pS3D = '全程无死角高清监控录像验机，绝不恶意压价；确认价格后，微信或支付宝秒级直达账户。';

        $faqTitle = '回收常见问题解答';
        $faqSub = '解答您的疑惑，让每一笔回收都透明安心';
        $faqList = [
            ['q' => 'Q1. 提交估价后的价格会随意变动吗？', 'a' => '我们承诺 7 天价格锁定保障！在您提交订单后的7天内，只要实际质检情况与您提交的评估描述一致，我们将 100% 按照预估价格全额放款，绝不坐地降价。'],
            ['q' => 'Q2. 寄送顺丰快递的运费由谁承担？', 'a' => '全场所有品类均享受【顺丰包邮】服务！顺丰小哥上门取件时直接选择“到付”即可，往返运费均由平台全额承担，您不需要掏一分钱。'],
            ['q' => 'Q3. 设备里的照片和个人隐私会被泄露吗？', 'a' => '请完全放心！平台质检入库后将对设备进行专业数据清除，确保所有照片、账号、聊天记录安全清除不残留！'],
            ['q' => 'Q4. 质检复核后如果我不认可最终成交价怎么办？', 'a' => '我们充分尊重用户的自主选择权！若您对质检复核金额不满意，可在会员中心一键点击“拒绝成交”，我们将通过顺丰包邮将原机原封退还给您，退运保价运费由平台承担，无需您付费！']
        ];

        $guarantees = [
            ['title' => '顺丰免费上门 / 全程包邮', 'desc' => '专业顺丰小哥免费上门，专人过磅拖运或快递打包，全程双向保价0费用', 'icon' => 'truck'],
            ['title' => '官方透明质检 · 绝无压价', 'desc' => '全程高清录像监控专业拆机核验，如实描述即享预估全款，杜绝虚报与恶意扣减', 'icon' => 'shield'],
            ['title' => '个人数据清除 · 隐私保障', 'desc' => '采用专业数据清除技术对设备进行全面清理，确保个人信息不残留', 'icon' => 'lock'],
            ['title' => '秒级极速放款 · 资金直达', 'desc' => '质检结果双方确认一致后，系统秒级自动放款，微信零钱或支付宝即刻到账', 'icon' => 'clock']
        ];

        if ($scKey === 'pet_service') {
            $pTitle = '简单3步 · 极速上门伴宠';
            $pSub = '在线选项目预约 / 持证宠托师准时上门 / 完工打卡安全保障';
            $pS1T = '在线预约选项目';
            $pS1D = '选择爱宠种类与所需服务，预约期望上门时间，标准透明定价。';
            $pS2T = '持证宠托师准时上门';
            $pS2D = '实名认证宠托师携带专业工具准时到达，双手消毒换鞋套，全程打卡存证。';
            $pS3T = '完工打卡 · 售后保障';
            $pS3D = '遛狗全程GPS轨迹记录，喂猫洗水碗换粮，录制视频回传主人，核销无忧。';

            $faqTitle = '上门伴宠常见问题解答';
            $faqSub = '解答您的疑惑，让每一次上门伴宠都安心透明';
            $faqList = [
                ['q' => 'Q1. 上门宠托师是实名认证专业的吗？', 'a' => '是的！平台所有宠托师均经过严格实名认证、背景核查与专业宠物护理培训，持证上岗。'],
                ['q' => 'Q2. 遛狗过程中的安全如何保障？', 'a' => '宠托师上门统一佩戴安全双保险防爆冲牵引绳，全程开启手机 GPS 运动轨迹记录，并赠送平台百万级宠物意外安全险。'],
                ['q' => 'Q3. 猫咪喂食会拍照和视频反馈吗？', 'a' => '专人进门双手消毒，清洗水粮碗、铲猫砂消毒，陪猫咪互动梳毛，全程录制高清小视频实时回传给主人。'],
                ['q' => 'Q4. 家里钥匙或密码锁安全怎么保证？', 'a' => '宠托师进出家门均在平台打卡存证，进门拍照门锁状态，服务结束后确认门窗锁闭并拍摄复位照片。']
            ];

            $guarantees = [
                ['title' => '实名持证宠托师', 'desc' => '严选背景核验，经过专业宠物护理实操考核，持证上门服务', 'icon' => 'shield'],
                ['title' => '准时到达保障', 'desc' => '按预约时段准时到达，进出家门拍照打卡，安全可靠透明', 'icon' => 'clock'],
                ['title' => '全程GPS与录像', 'desc' => '户外遛弯全程GPS记录轨迹，上门喂食高清视频实时回传', 'icon' => 'bag'],
                ['title' => '百万安全保险', 'desc' => '平台赠送爱宠百万级意外责任险，全程无忧托付', 'icon' => 'medal']
            ];
        } elseif ($scKey === 'housekeeping' || $scKey === 'home_cleaning') {
            $pTitle = '简单3步 · 极速焕新到家';
            $pSub = '在线按需下单 / 专业师傅携带工具准时上门 / 验收满意后核销';
            $pS1T = '在线选择服务项目';
            $pS1D = '根据户型面积或清洗家电品类挑选对应规格，预约期望服务时段。';
            $pS2T = '持证工程师专业上门';
            $pS2D = '自带专业清洁消杀设备与环保耗材准时到家，标准化作业流程。';
            $pS3T = '当面验收 · 售后保障';
            $pS3D = '现场深度对比验收，满意后再核销，提供7天专属售后保障。';

            $faqTitle = '家政保洁常见问题解答';
            $faqSub = '解答您的疑惑，让每一次到家清洁都透明安心';
            $faqList = [
                ['q' => 'Q1. 保洁师傅会自带清洁工具和清洁剂吗？', 'a' => '是的！师傅自带整套保洁工具与环保清洁剂，您无需提前准备任何材料。'],
                ['q' => 'Q2. 家电清洗会拆机深度清洗吗？', 'a' => '会的！油烟机、空调均采用专业拆卸与高温蒸汽消杀，深度清除风轮内部油污积灰。'],
                ['q' => 'Q3. 如果清洁效果不满意怎么办？', 'a' => '平台承诺【不满意免费重做】！验收不满意可现场指出立即返工，保障您的权益。']
            ];

            $guarantees = [
                ['title' => '持证保洁工程师', 'desc' => '严选背景考核，经过专业清洗设备与药剂规范实操培训', 'icon' => 'shield'],
                ['title' => '准点准时上门', 'desc' => '严格履约准时到达，自带全套设备与专业消杀环保药剂', 'icon' => 'clock'],
                ['title' => '标准透明标价', 'desc' => '统一明码实价，服务过程杜绝乱加价或推销隐形收费', 'icon' => 'bag'],
                ['title' => '不满意免费重做', 'desc' => '现场深度对比验收，若清洁未达标当场免费返工重做', 'icon' => 'medal']
            ];
        } elseif ($scKey === 'home_repair') {
            $pTitle = '简单3步 · 极速快修到家';
            $pSub = '一键报修下单 / 30分钟极速上门排查 / 修复核销质保90天';
            $pS1T = '一键在线报修';
            $pS1D = '选择维修类目，描述故障现象，系统自动匹配就近特约维修师傅。';
            $pS2T = '急速响应上门检测';
            $pS2D = '师傅携带专业检测工具准时上门，先精准检测试机，公开透明报价。';
            $pS3T = '精工修复 · 质保90天';
            $pS3D = '严格按照施工规范修复并清理现场，开具电子工单，享全方位售后质保。';

            $faqTitle = '家庭快修常见问题解答';
            $faqSub = '解答您的疑惑，让每一次维修都明码标价无隐形消费';
            $faqList = [
                ['q' => 'Q1. 师傅上门会有乱收费、坐地起价吗？', 'a' => '绝无隐形消费！平台实行统一标准标价，师傅检测后需当面出示工单报价，经您确认后再开始施工。'],
                ['q' => 'Q2. 维修更换的配件有质保吗？', 'a' => '所有官方更换的全新配件均享有平台 90 天超长售后质保，质保期内非人为损坏免费上门重换。']
            ];

            $guarantees = [
                ['title' => '持证特约技师', 'desc' => '严选水电五金专业技师，实名认证，持电工特种作业证上岗', 'icon' => 'shield'],
                ['title' => '30分钟极速上门', 'desc' => '系统智能派单就近师傅，准时准点到达，急修快修不用等', 'icon' => 'clock'],
                ['title' => '工单明码标价', 'desc' => '现场检测先出示电子工单价格，经客户确认同意后再施工', 'icon' => 'bag'],
                ['title' => '官方质保90天', 'desc' => '更换配件享官方90天质保，质保期内非人为故障免费上门', 'icon' => 'medal']
            ];
        } elseif ($isServiceEnabled && $isRecycleEnabled) {
            $pTitle = '同城综合便民 · 一站式全流程保障';
            $pSub = '线上极速预约 · 专业特约上门 · 标准透明定价 · 售后无忧保障';
            $pS1T = '挑选所需服务或回收';
            $pS1D = '无论是数码回收变现，还是保洁清洗、上门维修、伴宠跑腿，一键随心预约。';
            $pS2T = '准时上门交付核验';
            $pS2D = '顺丰小哥免费上门包邮取件，或特约实名师傅准时到达当面交付。';
            $pS3T = '官方放款 / 核销质保';
            $pS3D = '质检确认秒级到账微信支付宝，上门服务当面核销享平台全流程售后兜底。';

            $faqTitle = '同城便民服务常见问题解答';
            $faqSub = '解答您的疑惑，让每一笔服务与回收都透明安心';
            $faqList = [
                ['q' => 'Q1. 平台涵盖哪些到家服务与变现业务？', 'a' => '涵盖二手手机数码高价回收变现，以及专业保洁清洗、家庭维修、上门伴宠等全套到家生活服务。'],
                ['q' => 'Q2. 到家服务的师傅是正规实名的吗？', 'a' => '是的！所有上门服务的工程师均经过严格实名背景审查、专业技能认证考核，并佩戴工牌工具准时上门。'],
                ['q' => 'Q3. 回收变现的运费由谁承担？', 'a' => '全场所有品类均享受【顺丰包邮】服务！顺丰小哥上门取件时选择到付即可，往返运费均由平台承担。']
            ];

            $guarantees = [
                ['title' => '顺丰免费包邮 / 免费上门', 'desc' => '数码回收顺丰全额包邮，到家便民服务特约师傅准时上门', 'icon' => 'truck'],
                ['title' => '实名严选认证 · 专业考核', 'desc' => '所有质检工程师与到家技师均通过身份背景核查与实操考核', 'icon' => 'shield'],
                ['title' => '价格透明公开 · 绝无加价', 'desc' => '回收标准算法报价，到家服务统一工单明码实价，杜绝乱收费', 'icon' => 'bag'],
                ['title' => '官方平台保障 · 售后无忧', 'desc' => '回收质检一致秒放款，到家服务享官方售后保障与返工保障', 'icon' => 'medal']
            ];
        }

        // 智能防错：如当前是纯服务场景，但配置项残留旧回收流程标题，强制使用当前行业自适应文案
        $finalProcessTitle = !empty($configs['home_process_title']) ? $configs['home_process_title'] : $pTitle;
        if (!$isRecycleEnabled && mb_strpos($finalProcessTitle, '回收') !== false) {
            $finalProcessTitle = $pTitle;
        }

        $finalProcessSub = !empty($configs['home_process_subtitle']) ? $configs['home_process_subtitle'] : $pSub;
        if (!$isRecycleEnabled && mb_strpos($finalProcessSub, '顺丰') !== false) {
            $finalProcessSub = $pSub;
        }

        $finalS1T = !empty($configs['home_process_step1_title']) ? $configs['home_process_step1_title'] : $pS1T;
        if (!$isRecycleEnabled && mb_strpos($finalS1T, '估价') !== false) $finalS1T = $pS1T;

        $finalS1D = !empty($configs['home_process_step1_desc']) ? $configs['home_process_step1_desc'] : $pS1D;
        if (!$isRecycleEnabled && mb_strpos($finalS1D, '机况') !== false) $finalS1D = $pS1D;

        $finalS2T = !empty($configs['home_process_step2_title']) ? $configs['home_process_step2_title'] : $pS2T;
        if (!$isRecycleEnabled && mb_strpos($finalS2T, '顺丰') !== false) $finalS2T = $pS2T;

        $finalS2D = !empty($configs['home_process_step2_desc']) ? $configs['home_process_step2_desc'] : $pS2D;
        if (!$isRecycleEnabled && mb_strpos($finalS2D, '包邮') !== false) $finalS2D = $pS2D;

        $finalS3T = !empty($configs['home_process_step3_title']) ? $configs['home_process_step3_title'] : $pS3T;
        if (!$isRecycleEnabled && mb_strpos($finalS3T, '放款') !== false) $finalS3T = $pS3T;

        $finalS3D = !empty($configs['home_process_step3_desc']) ? $configs['home_process_step3_desc'] : $pS3D;
        if (!$isRecycleEnabled && mb_strpos($finalS3D, '放款') !== false) $finalS3D = $pS3D;

        $finalFaqTitle = !empty($configs['home_faq_title']) ? $configs['home_faq_title'] : $faqTitle;
        if (!$isRecycleEnabled && mb_strpos($finalFaqTitle, '回收') !== false) {
            $finalFaqTitle = $faqTitle;
        }

        $finalFaqSub = !empty($configs['home_faq_subtitle']) ? $configs['home_faq_subtitle'] : $faqSub;
        if (!$isRecycleEnabled && mb_strpos($finalFaqSub, '回收') !== false) {
            $finalFaqSub = $faqSub;
        }

        $customFaqList = !empty($configs['home_faq_list']) && is_array(json_decode($configs['home_faq_list'], true)) ? json_decode($configs['home_faq_list'], true) : null;
        $finalFaqList = ($customFaqList && count($customFaqList) > 0) ? $customFaqList : $faqList;
        if (!$isRecycleEnabled && isset($finalFaqList[0]['q']) && mb_strpos($finalFaqList[0]['q'], '估价') !== false) {
            $finalFaqList = $faqList;
        }

        $customGuarantees = !empty($configs['industry_guarantees']) && is_array(json_decode($configs['industry_guarantees'], true)) ? json_decode($configs['industry_guarantees'], true) : null;
        $finalGuarantees = ($customGuarantees && count($customGuarantees) > 0) ? $customGuarantees : $guarantees;
        if (!$isRecycleEnabled && isset($finalGuarantees[0]['title']) && mb_strpos($finalGuarantees[0]['title'], '顺丰') !== false) {
            $finalGuarantees = $guarantees;
        }

        return [
            'home_faq_enabled'               => ($configs['home_faq_enabled'] ?? '1') !== '0',
            'home_faq_title'                 => $finalFaqTitle,
            'home_faq_subtitle'              => $finalFaqSub,
            'home_faq_list'                  => $finalFaqList,
            'home_process_enabled'           => ($configs['home_process_enabled'] ?? '1') !== '0',
            'home_process_title'             => $finalProcessTitle,
            'home_process_subtitle'          => $finalProcessSub,
            'home_process_step1_title'       => $finalS1T,
            'home_process_step1_desc'        => $finalS1D,
            'home_process_step2_title'       => $finalS2T,
            'home_process_step2_desc'        => $finalS2D,
            'home_process_step3_title'       => $finalS3T,
            'home_process_step3_desc'        => $finalS3D,
            'trust_cards'                    => $finalGuarantees,
        ];
    }

    private function buildMiniappCustomConfigs(array $configs, array $scenario = [], array $meta = []): array
    {
        $scKey = $scenario['key'] ?? 'city_life';
        $tplKey = $meta['key'] ?? 'universal';
        $themeColor = !empty($scenario['theme_color']) ? $scenario['theme_color'] : (!empty($configs['miniapp_theme_color']) ? $configs['miniapp_theme_color'] : ($meta['theme_color'] ?? '#1e58ff'));
        $defaultNavTitle = !empty($scenario['site_name']) ? $scenario['site_name'] : ($meta['site_name'] ?? '启灵同城服务');
        $defaultSearchPlaceholder = '搜索您需要的服务或项目';
        $defaultHeroTitle = $defaultNavTitle;
        $defaultHeroSub = !empty($scenario['slogan']) ? $scenario['slogan'] : ($meta['slogan'] ?? '准时到达 · 规范标准 · 售后保障');
        $defaultHeroTag = '官方自营 · 品质服务';

        $defaultG1 = '实名认证考核';
        $defaultG2 = '准时准点到达';
        $defaultG3 = '工单明码标价';
        $defaultG4 = '平台全程质保';

        $defaultPTitle = '简单三步 · 便民全流程';
        $defaultS1T = '挑选所需服务';
        $defaultS1D = '明码透明标价';
        $defaultS2T = '准时上门履约';
        $defaultS2D = '专业规范作业';
        $defaultS3T = '验收核销质保';
        $defaultS3D = '平台售后无忧';

        $defaultCatTitle = '精选分类推荐';
        $defaultHotTitle = '精选热门项目';

        if ($scKey === 'pet_service') {
            $defaultNavTitle = '启灵宠爱 · 专业伴宠服务';
            $defaultSearchPlaceholder = '搜索上门遛狗 / 猫咪喂食 / 宠物洗护...';
            $defaultHeroTag = '官方认证 · 持证宠托师';
            $defaultHeroTitle = '专业上门伴宠 · 科学喂养';
            $defaultHeroSub = '上门喂猫遛狗 · 洗护驱虫 · 持证上岗 · 全程打卡';
            $defaultG1 = '实名持证宠托师';
            $defaultG2 = '预约准时到达';
            $defaultG3 = '全程轨迹与录像';
            $defaultG4 = '百万安全险';
            $defaultPTitle = '简单三步 · 极速伴宠到家';
            $defaultS1T = '选项目预约';
            $defaultS1D = '标准透明定价';
            $defaultS2T = '宠托师准时上门';
            $defaultS2D = '消毒工具齐全';
            $defaultS3T = '录像打卡核销';
            $defaultS3D = '全程视频回传';
            $defaultCatTitle = '伴宠服务精选分类';
            $defaultHotTitle = '热门上门伴宠项目';
        } elseif ($scKey === 'housekeeping' || $scKey === 'home_cleaning') {
            $defaultNavTitle = '启灵洁家 · 专业家政与家电清洗';
            $defaultSearchPlaceholder = '搜索日常保洁 / 油烟机清洗 / 空调清洗...';
            $defaultHeroTag = '高温蒸汽杀菌 · 持证上岗';
            $defaultHeroTitle = '专业家政保洁 · 家电清洗';
            $defaultHeroSub = '140℃高温蒸汽深度杀菌 · 持证上岗 · 不满意重做';
            $defaultG1 = '持证保洁工程师';
            $defaultG2 = '准时上门履约';
            $defaultG3 = '专业设备耗材';
            $defaultG4 = '不满意免费重做';
            $defaultPTitle = '简单三步 · 极速清洁到家';
            $defaultS1T = '选项目下单';
            $defaultS1D = '规格面积透明';
            $defaultS2T = '工程师上门';
            $defaultS2D = '专业设备消杀';
            $defaultS3T = '验收后再核销';
            $defaultS3D = '7天售后质保';
            $defaultCatTitle = '家政保洁精选分类';
            $defaultHotTitle = '热门到家清洁清洗';
        } elseif ($scKey === 'home_repair') {
            $defaultNavTitle = '启灵鲁班 · 社区急修与家庭维保';
            $defaultSearchPlaceholder = '搜索水管漏水 / 马桶疏通 / 电路排查...';
            $defaultHeroTag = '社区快修 · 30分极速上门';
            $defaultHeroTitle = '专业家庭维修 · 极速快修';
            $defaultHeroSub = '管道疏通 · 水电电路 · 门窗五金 · 质保90天';
            $defaultG1 = '实名特约技师';
            $defaultG2 = '30分极速上门';
            $defaultG3 = '工单明码标价';
            $defaultG4 = '官方质保90天';
            $defaultPTitle = '简单三步 · 极速上门维修';
            $defaultS1T = '在线一键报修';
            $defaultS1D = '师傅就近派单';
            $defaultS2T = '精准排查报价';
            $defaultS2D = '同意后再动工';
            $defaultS3T = '完工质保90天';
            $defaultS3D = '无隐形收费';
            $defaultCatTitle = '家庭维修报修分类';
            $defaultHotTitle = '热门急修与安装项目';
        } elseif ($scKey === 'digital_recycle' || $tplKey === 'digital') {
            $defaultNavTitle = '启灵专业数码回收';
            $defaultSearchPlaceholder = '搜索你想卖的手机 / 平板 / 电脑型号...';
            $defaultHeroTag = '启灵高价回收 · 官方验机';
            $defaultHeroTitle = '旧机别放着，立即变现';
            $defaultHeroSub = '顺丰包邮 · 隐私深度清除 · 质检一致当天打款';
            $defaultG1 = '隐私彻底清除';
            $defaultG2 = '顺丰双向包邮';
            $defaultG3 = '验机极速放款';
            $defaultG4 = '7天估价锁定';
            $defaultPTitle = '简单三步 · 轻松变现';
            $defaultS1T = '在线估价';
            $defaultS1D = '30秒选项测机';
            $defaultS2T = '顺丰寄件/上门';
            $defaultS2D = '全程包邮免密';
            $defaultS3T = '验机打款';
            $defaultS3D = '直达微信零钱';
            $defaultCatTitle = '全品类数码回收';
            $defaultHotTitle = '大家都在卖 · 热门回收机型';
        } elseif ($tplKey === 'scrap') {
            $defaultNavTitle = '启灵再生 · 废品物资回收';
            $defaultSearchPlaceholder = '搜索废铜 / 废铝 / 废铁 / 动力电池 / 废纸板...';
            $defaultHeroTag = '上门过磅 · 现金秒结';
            $defaultHeroTitle = '废旧物资再生 · 绿色循环倡导';
            $defaultHeroSub = '废铜废铝废钢 · 电线电缆 · 动力电池 · 上门过磅结算';
            $defaultG1 = '专业电子地磅';
            $defaultG2 = '免费上门拆运';
            $defaultG3 = '大宗阶梯加价';
            $defaultG4 = '现场现金秒结';
            $defaultPTitle = '简单三步 · 上门过磅变现';
            $defaultS1T = '查行情选品类';
            $defaultS1D = '查看实时指导牌价';
            $defaultS2T = '专车上门过磅';
            $defaultS2D = '专业拆装清运';
            $defaultS3T = '现场称重结算';
            $defaultS3D = '现金对公秒到账';
            $defaultCatTitle = '废旧物资与再生品类';
            $defaultHotTitle = '今日主营大宗物资回收';
        } elseif ($tplKey === 'auto') {
            $defaultNavTitle = '启灵收车 · 二手车与报废车';
            $defaultSearchPlaceholder = '搜索车型，如：丰田卡罗拉 / 特斯拉 / 报废车补贴...';
            $defaultHeroTag = '免费上门拖车 · 当天过户';
            $defaultHeroTitle = '全国二手车与报废车高价回收';
            $defaultHeroSub = '全国免费上门验车拖车 · 当天过户 · 当面结清全款';
            $defaultG1 = '全国免费拖车';
            $defaultG2 = '当天合法过户';
            $defaultG3 = '正规拆解残值';
            $defaultG4 = '验车合格结清';
            $defaultPTitle = '简单三步 · 车辆高效变现';
            $defaultS1T = '快速在线估车';
            $defaultS1D = '输入车型年限里程';
            $defaultS2T = '免费上门验车';
            $defaultS2D = '专人专车上门拖运';
            $defaultS3T = '签约过户打款';
            $defaultS3D = '全款即刻到账';
            $defaultCatTitle = '车辆回收与报废拆解品类';
            $defaultHotTitle = '热门回收与报废车型';
        } elseif ($tplKey === 'luxury') {
            $defaultNavTitle = '启灵名品 · 奢侈品名表黄金';
            $defaultSearchPlaceholder = '搜索名表 / 黄金首饰 / 大牌包袋 / 钻石珠宝...';
            $defaultHeroTag = '中检权威鉴定 · 实时金价';
            $defaultHeroTitle = '名表黄金奢侈品 · 尊享高额变现';
            $defaultHeroSub = '足金999按日实时结算 · 瑞士名表大牌箱包 · 顺丰保价密封';
            $defaultG1 = '中检双重复核';
            $defaultG2 = '国际金价联动';
            $defaultG3 = '顺丰保价密封';
            $defaultG4 = '大额即刻放款';
            $defaultPTitle = '简单三步 · 尊享高额变现';
            $defaultS1T = '在线估价测金';
            $defaultS1D = '实时国际牌价换算';
            $defaultS2T = '保价寄件/到店';
            $defaultS2D = '专人保价密封箱';
            $defaultS3T = '中检复核放款';
            $defaultS3D = '大额网银即刻到账';
            $defaultCatTitle = '名品鉴定与高额变现品类';
            $defaultHotTitle = '热门名表与黄金珠宝变现';
        } elseif ($tplKey === 'appliance') {
            $defaultNavTitle = '启灵家电 · 废旧大家电拆旧';
            $defaultSearchPlaceholder = '搜索空调 / 冰箱 / 洗衣机 / 电视机拆旧...';
            $defaultHeroTag = '免费拆装搬运 · 免楼层费';
            $defaultHeroTitle = '废旧大家电 · 专业上门拆旧';
            $defaultHeroSub = '家用商用空调·冰箱洗衣机·电视机·免费上门拆机搬运';
            $defaultG1 = '专业工具拆装';
            $defaultG2 = '免楼层搬运费';
            $defaultG3 = '现场通电验机';
            $defaultG4 = '现金当面结清';
            $defaultPTitle = '简单三步 · 轻松拆旧换新';
            $defaultS1T = '在线预约登记';
            $defaultS1D = '选家电预约时段';
            $defaultS2T = '师傅上门拆机';
            $defaultS2D = '专业工具防磕碰';
            $defaultS3T = '现场验机付款';
            $defaultS3D = '当面结清全额款项';
            $defaultCatTitle = '大家电回收品类';
            $defaultHotTitle = '热门拆旧大家电品类';
        }

        $miniappCategories = [];
        if (!empty($configs['miniapp_custom_categories'])) {
            $miniappCategories = json_decode($configs['miniapp_custom_categories'], true) ?: [];
        }
        if (empty($miniappCategories) || !is_array($miniappCategories)) {
            $dbCategories = $this->deviceModel->getCategoryList(true);
            $miniappCategories = [];
            foreach ($dbCategories as $dc) {
                $rawName = $dc['name'] ?? '';
                $cleanName = preg_replace('/器材|电脑|数码|设备|智能|二手|回收/u', '', $rawName);
                if (mb_strlen($cleanName) < 2) {
                    $cleanName = mb_substr($rawName, 0, 4);
                }
                $miniappCategories[] = [
                    'id'         => (string)$dc['id'],
                    'name'       => $cleanName ?: $rawName,
                    'cat_id'     => (int)$dc['id'],
                    'badge'      => '',
                    'icon'       => $dc['icon'] ?? '',
                    'link_type'  => 'category',
                    'link_value' => (string)$dc['id'],
                    'status'     => 1,
                    'sort'       => (int)($dc['sort'] ?? 0)
                ];
            }
        }

        $isRecycleEnabled = ($scenario['feature_toggles']['module_recycle_enabled'] ?? '1') === '1';

        $finalHeroTag = !empty($configs['miniapp_hero_tag']) ? $configs['miniapp_hero_tag'] : $defaultHeroTag;
        if (!$isRecycleEnabled && mb_strpos($finalHeroTag, '回收') !== false) $finalHeroTag = $defaultHeroTag;

        $finalHeroTitle = !empty($configs['miniapp_hero_title']) ? $configs['miniapp_hero_title'] : $defaultHeroTitle;
        if (!$isRecycleEnabled && mb_strpos($finalHeroTitle, '旧机') !== false) $finalHeroTitle = $defaultHeroTitle;

        $finalHeroSub = !empty($configs['miniapp_hero_subtitle']) ? $configs['miniapp_hero_subtitle'] : $defaultHeroSub;
        if (!$isRecycleEnabled && mb_strpos($finalHeroSub, '顺丰') !== false) $finalHeroSub = $defaultHeroSub;

        $finalPlaceholder = !empty($configs['miniapp_search_placeholder']) ? $configs['miniapp_search_placeholder'] : $defaultSearchPlaceholder;
        if (!$isRecycleEnabled && mb_strpos($finalPlaceholder, '手机') !== false) $finalPlaceholder = $defaultSearchPlaceholder;

        $finalG1 = !empty($configs['miniapp_guarantee_1']) ? $configs['miniapp_guarantee_1'] : $defaultG1;
        if (!$isRecycleEnabled && mb_strpos($finalG1, '隐私') !== false) $finalG1 = $defaultG1;

        $finalG2 = !empty($configs['miniapp_guarantee_2']) ? $configs['miniapp_guarantee_2'] : $defaultG2;
        if (!$isRecycleEnabled && mb_strpos($finalG2, '顺丰') !== false) $finalG2 = $defaultG2;

        $finalG3 = !empty($configs['miniapp_guarantee_3']) ? $configs['miniapp_guarantee_3'] : $defaultG3;
        if (!$isRecycleEnabled && mb_strpos($finalG3, '验机') !== false) $finalG3 = $defaultG3;

        $finalG4 = !empty($configs['miniapp_guarantee_4']) ? $configs['miniapp_guarantee_4'] : $defaultG4;
        if (!$isRecycleEnabled && mb_strpos($finalG4, '估价') !== false) $finalG4 = $defaultG4;

        $finalPTitle = !empty($configs['miniapp_process_title']) ? $configs['miniapp_process_title'] : $defaultPTitle;
        if (!$isRecycleEnabled && mb_strpos($finalPTitle, '变现') !== false) $finalPTitle = $defaultPTitle;

        $finalS1T = !empty($configs['miniapp_step_1_title']) ? $configs['miniapp_step_1_title'] : $defaultS1T;
        if (!$isRecycleEnabled && mb_strpos($finalS1T, '估价') !== false) $finalS1T = $defaultS1T;

        $finalS1D = !empty($configs['miniapp_step_1_desc']) ? $configs['miniapp_step_1_desc'] : $defaultS1D;
        if (!$isRecycleEnabled && mb_strpos($finalS1D, '测机') !== false) $finalS1D = $defaultS1D;

        $finalS2T = !empty($configs['miniapp_step_2_title']) ? $configs['miniapp_step_2_title'] : $defaultS2T;
        if (!$isRecycleEnabled && mb_strpos($finalS2T, '顺丰') !== false) $finalS2T = $defaultS2T;

        $finalS2D = !empty($configs['miniapp_step_2_desc']) ? $configs['miniapp_step_2_desc'] : $defaultS2D;
        if (!$isRecycleEnabled && mb_strpos($finalS2D, '免密') !== false) $finalS2D = $defaultS2D;

        $finalS3T = !empty($configs['miniapp_step_3_title']) ? $configs['miniapp_step_3_title'] : $defaultS3T;
        if (!$isRecycleEnabled && mb_strpos($finalS3T, '打款') !== false) $finalS3T = $defaultS3T;

        $finalS3D = !empty($configs['miniapp_step_3_desc']) ? $configs['miniapp_step_3_desc'] : $defaultS3D;
        if (!$isRecycleEnabled && mb_strpos($finalS3D, '微信') !== false) $finalS3D = $defaultS3D;

        return [
            'miniapp_theme_color'            => $themeColor,
            'miniapp_nav_title'              => !empty($configs['miniapp_nav_title']) ? $configs['miniapp_nav_title'] : $defaultNavTitle,
            'miniapp_nav_bg'                 => !empty($configs['miniapp_nav_bg']) ? $configs['miniapp_nav_bg'] : 'gradient',
            'miniapp_card_radius'            => !empty($configs['miniapp_card_radius']) ? (int)$configs['miniapp_card_radius'] : 20,
            'miniapp_search_placeholder'     => $finalPlaceholder,
            'miniapp_hero_enabled'           => ($configs['miniapp_hero_enabled'] ?? '1') !== '0',
            'miniapp_hero_gradient'          => !empty($configs['miniapp_hero_gradient']) ? $configs['miniapp_hero_gradient'] : 'blue',
            'miniapp_hero_tag'               => $finalHeroTag,
            'miniapp_hero_title'             => $finalHeroTitle,
            'miniapp_hero_subtitle'          => $finalHeroSub,
            'miniapp_category_title'         => !empty($configs['miniapp_category_title']) ? $configs['miniapp_category_title'] : $defaultCatTitle,
            'miniapp_category_limit'         => !empty($configs['miniapp_category_limit']) ? (int)$configs['miniapp_category_limit'] : 10,
            'miniapp_category_cols'          => !empty($configs['miniapp_category_cols']) ? (int)$configs['miniapp_category_cols'] : 5,
            'miniapp_category_enabled'       => ($configs['miniapp_category_enabled'] ?? '1') !== '0',
            'miniapp_guarantee_1'            => $finalG1,
            'miniapp_guarantee_2'            => $finalG2,
            'miniapp_guarantee_3'            => $finalG3,
            'miniapp_guarantee_4'            => $finalG4,
            'miniapp_guarantees'             => [$finalG1, $finalG2, $finalG3, $finalG4],
            'miniapp_guarantee_enabled'      => ($configs['miniapp_guarantee_enabled'] ?? '1') !== '0',
            'miniapp_process_enabled'        => ($configs['miniapp_process_enabled'] ?? '1') !== '0',
            'miniapp_process_title'          => $finalPTitle,
            'miniapp_step_1_title'           => $finalS1T,
            'miniapp_step_1_desc'            => $finalS1D,
            'miniapp_step_2_title'           => $finalS2T,
            'miniapp_step_2_desc'            => $finalS2D,
            'miniapp_step_3_title'           => $finalS3T,
            'miniapp_step_3_desc'            => $finalS3D,
            'miniapp_hot_title'              => !empty($configs['miniapp_hot_title']) ? $configs['miniapp_hot_title'] : $defaultHotTitle,
            'miniapp_hot_limit'              => !empty($configs['miniapp_hot_limit']) ? (int)$configs['miniapp_hot_limit'] : 5,
            'miniapp_coupon_sec_title'       => !empty($configs['miniapp_coupon_sec_title']) ? $configs['miniapp_coupon_sec_title'] : '回收加价补贴专区',
            'miniapp_coupon_sec_tag'         => !empty($configs['miniapp_coupon_sec_tag']) ? $configs['miniapp_coupon_sec_tag'] : '最高立补 ¥300',
            'miniapp_tab_home_name'          => !empty($configs['miniapp_tab_home_name']) ? $configs['miniapp_tab_home_name'] : '首页',
            'miniapp_tab_estimate_name'      => !empty($configs['miniapp_tab_estimate_name']) ? $configs['miniapp_tab_estimate_name'] : ($isRecycleEnabled ? '估价回收' : '预约服务'),
            'miniapp_tab_order_name'         => !empty($configs['miniapp_tab_order_name']) ? $configs['miniapp_tab_order_name'] : ($isRecycleEnabled ? '订单明细' : '预约单'),
            'miniapp_tab_user_name'          => !empty($configs['miniapp_tab_user_name']) ? $configs['miniapp_tab_user_name'] : '我的',
            'miniapp_service_tel_title'      => !empty($configs['miniapp_service_tel_title']) ? $configs['miniapp_service_tel_title'] : '官方客服热线',
            'miniapp_service_tel'            => !empty($configs['miniapp_service_tel']) ? $configs['miniapp_service_tel'] : (!empty($configs['service_tel']) ? $configs['service_tel'] : '400-800-8888'),
            'miniapp_service_hours'          => !empty($configs['miniapp_service_hours']) ? $configs['miniapp_service_hours'] : '周一至周日 09:00 - 21:00',
            'miniapp_privacy_title'          => !empty($configs['miniapp_privacy_title']) ? $configs['miniapp_privacy_title'] : '服务保障说明',
            'miniapp_privacy_content'        => !empty($configs['miniapp_privacy_content']) ? $configs['miniapp_privacy_content'] : '平台严选特约工程师与服务人员，实名资质审查，全程规范化服务与标准明码标价，提供专属售后保障体系，保障您的各项权益。',
            'miniapp_about_title'            => !empty($configs['miniapp_about_title']) ? $configs['miniapp_about_title'] : ('关于' . $defaultNavTitle),
            'miniapp_about_content'          => !empty($configs['miniapp_about_content']) ? $configs['miniapp_about_content'] : ($defaultNavTitle . '是官方直营的数字化全场景服务平台。通过标准化管理体系与专业服务人员，为广大用户提供透明、安全、便捷、贴心的一站式到家服务。'),
            'miniapp_custom_categories'      => $miniappCategories,
        ];
    }

    /**
     * 获取前台自定义多级导航菜单
     */
    public function getNavMenus(): void
    {
        $svc = new \App\Service\MenuService();
        $this->success($svc->getMenus(true), '获取前台导航菜单成功');
    }

    /**
     * 获取全商品品类 (支持 Redis/文件双模高速缓存)
     */
    public function getCategories(): void
    {
        $cache = \App\Service\CacheService::getInstance();
        $cacheKey = 'appraisal:categories:show';
        $categories = $cache->get($cacheKey);
        if (!is_array($categories)) {
            $categories = $this->deviceModel->getCategoryList(true);
            $cache->set($cacheKey, $categories, 1800);
        }
        $this->success($categories, '获取品类成功');
    }

    /**
     * 根据品类获取品牌列表 (支持 Redis/文件双模高速缓存)
     */
    public function getBrands(): void
    {
        $catId = Request::getInt('category_id', 1);
        $cache = \App\Service\CacheService::getInstance();
        $cacheKey = 'appraisal:brands:' . $catId;
        $brands = $cache->get($cacheKey);
        if (!is_array($brands)) {
            $brands = $this->deviceModel->getBrandsByCategory($catId);
            $cache->set($cacheKey, $brands, 1800);
        }
        $this->success($brands, '获取品牌成功');
    }

    /**
     * 搜索回收机型
     */
    public function searchDevices(): void
    {
        $catId = Request::getInt('category_id', 0) ?: null;
        $brandId = Request::getInt('brand_id', 0) ?: null;
        $keyword = (string)Request::get('keyword', '');
        $page = Request::getInt('page', 1);

        $res = $this->deviceModel->searchDevices($catId, $brandId, $keyword, $page, 20);
        $this->success($res, '搜索成功');
    }

    /**
     * 获取指定机型的完整问答估价树 (支持 Redis 缓存)
     */
    public function getMatrix(): void
    {
        $deviceId = Request::getInt('device_id', 0);
        if ($deviceId <= 0) {
            $this->error('请指定有效机型ID');
        }

        $matrix = $this->pricingService->getDeviceAppraisalMatrix($deviceId);
        if (!$matrix) {
            $this->error('机型不存在或已下架');
        }

        $this->success($matrix, '获取评估问答成功');
    }

    /**
     * 实时计算预估回收价 (支持极速成色档与专业精准细测双模式)
     */
    public function calculate(): void
    {
        $deviceId = Request::postInt('device_id', 0);
        $mode = (string)Request::post('mode', 'custom');
        $tierId = (string)Request::post('tier_id', '');

        if ($deviceId <= 0) {
            $this->error('机型参数错误');
        }

        if ($mode === 'quick' && !empty($tierId)) {
            $res = $this->pricingService->calculateQuickTierPrice($deviceId, $tierId);
        } else {
            $itemIds = Request::post('item_ids', []);
            if (!is_array($itemIds)) {
                $itemIds = [];
            }
            $res = $this->pricingService->calculateEstimatePrice($deviceId, $itemIds);
        }

        if ($res['code'] === 200) {
            $this->success($res['data'], '估价计算成功');
        } else {
            $this->error($res['msg'], $res['code']);
        }
    }

    /**
     * 获取前台轮播 Banner 列表 (支持 Redis/文件双模高速缓存)
     */
    public function getBanners(): void
    {
        $cache = \App\Service\CacheService::getInstance();
        $cacheKey = 'appraisal:banners:all';
        $list = $cache->get($cacheKey);
        if (!is_array($list)) {
            $bannerModel = new \App\Model\BannerModel();
            $list = $bannerModel->getAllBanners(true);
            $cache->set($cacheKey, $list, 1800);
        }
        $this->success($list, '获取Banner列表成功');
    }
}
