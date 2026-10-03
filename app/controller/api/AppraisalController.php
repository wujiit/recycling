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
        if (is_array($cached) && isset($cached['footer_articles'])) {
            $this->success($cached, '获取平台配置成功');
            return;
        }

        $svc = new \App\Service\TemplateService();
        $meta = $svc->getCurrentTemplateMeta();
        $themeStyle = $svc->getCurrentThemeStyle();

        // 深度读取全套系统自定义参数 (优先复用 sys_config:all 高速缓存)
        $configs = $cache->get('sys_config:all');
        if (!is_array($configs)) {
            $db = \App\Model\Database::getInstance();
            $p = $db->getPrefix();
            $sql = "SELECT `config_key`, `config_value` FROM `{$p}sys_config`";
            $rows = $db->fetchAll($sql);
            $configs = [];
            foreach ($rows as $row) {
                $configs[$row['config_key']] = $row['config_value'];
            }
            $cache->set('sys_config:all', $configs, 3600);
        }

        // 品牌简称：用于左上角干净、小巧、现代的展示，推荐 2-6 个字，杜绝超长口号
        $brandName = !empty($configs['brand_name']) ? trim($configs['brand_name']) : (!empty($configs['site_name']) ? mb_substr(trim($configs['site_name']), 0, 8) : '启灵回收');

        // 小程序端专属独立分类专区 (与 PC/网页移动端解耦)
        $miniappCategories = [];
        if (!empty($configs['miniapp_custom_categories'])) {
            $miniappCategories = json_decode($configs['miniapp_custom_categories'], true) ?: [];
        }
        if (empty($miniappCategories) || !is_array($miniappCategories)) {
            // 默认从后端分类中提取小程序精简别名 (如 "摄影器材" -> "摄影", "二手手机" -> "手机")
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

        $merged = array_merge($meta, [
            // 全站视觉主题风格模版参数 (科技蓝、生态绿、日落橙、尊贵金、极简青、极客黑等)
            'theme_style'    => $themeStyle['key'],
            'theme_name'     => $themeStyle['name'],
            'theme_primary'  => $themeStyle['primary'],
            'theme_hover'    => $themeStyle['primary_hover'],
            'theme_light'    => $themeStyle['primary_light'],
            'theme_accent'   => $themeStyle['accent'],
            'theme_gradient' => $themeStyle['primary_gradient'],
            'theme_color'    => $themeStyle['primary'], // 优先使用当前选中的主题风格色

            // 自定义品牌与Logo
            'brand_name'      => $brandName,
            'site_logo'       => !empty($configs['site_logo']) ? $configs['site_logo'] : '/uploads/default/site_logo.svg',
            'site_favicon'    => !empty($configs['site_favicon']) ? $configs['site_favicon'] : '/uploads/default/site_favicon.svg',
            'site_name'       => !empty($configs['site_name']) ? $configs['site_name'] : $meta['site_name'],
            'service_tel'     => !empty($configs['service_tel']) ? $configs['service_tel'] : '400-800-8888',
            'service_wechat'  => $configs['service_wechat'] ?? '',
            'service_qr'      => $configs['service_qr'] ?? '',
            'icp_beian'       => $configs['icp_beian'] ?? '京ICP备20260001号',
            'gong_an_beian'   => $configs['gong_an_beian'] ?? '',
            'gong_an_icon'    => !empty($configs['gong_an_icon']) ? $configs['gong_an_icon'] : '/uploads/default/police_badge.svg',
            'gong_an_url'     => $configs['gong_an_url'] ?? '',
            'copyright'       => !empty($configs['copyright']) ? $configs['copyright'] : '© 2026 启灵智能回收服务平台 · 保留所有权利',

            // SEO 搜索引擎优化专属配置
            'seo_title'       => !empty($configs['seo_title']) ? $configs['seo_title'] : ($meta['site_name'] . ' · ' . $meta['slogan']),
            'seo_keywords'    => !empty($configs['seo_keywords']) ? $configs['seo_keywords'] : '二手回收,手机数码回收,废旧金属,再生资源,二手车回收,名表黄金回收,家电回收',
            'seo_description' => !empty($configs['seo_description']) ? $configs['seo_description'] : $meta['desc'],

            // 首页首屏与多模式装修配置 (双首屏引擎与全数据驱动)
            'hero_mode'                     => !empty($configs['hero_mode']) ? $configs['hero_mode'] : 'search',
            'hero_badge_enabled'            => ($configs['hero_badge_enabled'] ?? '1') !== '0',
            'hero_badge_text'               => !empty($configs['hero_badge_text']) ? $configs['hero_badge_text'] : '官方自营 · 顺丰免费上门 · 10秒快速估价 · 秒级放款到账',
            'hero_title'                    => !empty($configs['hero_title']) ? $configs['hero_title'] : (!empty($configs['banner_title']) ? $configs['banner_title'] : $meta['site_name']),
            'hero_subtitle'                 => !empty($configs['hero_subtitle']) ? $configs['hero_subtitle'] : (!empty($configs['banner_subtitle']) ? $configs['banner_subtitle'] : $meta['slogan']),
            'hero_search_btn_text'          => !empty($configs['hero_search_btn_text']) ? $configs['hero_search_btn_text'] : '立即估价',
            'hero_hot_tags'                 => !empty($configs['hero_hot_tags']) ? (json_decode($configs['hero_hot_tags'], true) ?: []) : [
                ['label' => 'iPhone 15 Pro', 'keyword' => 'iPhone 15 Pro'],
                ['label' => 'Mate 60 Pro', 'keyword' => 'Mate 60 Pro'],
                ['label' => '小米 14', 'keyword' => '小米14'],
                ['label' => 'MacBook Pro', 'keyword' => 'MacBook'],
                ['label' => 'iPad Pro', 'keyword' => 'iPad']
            ],
            'hero_metrics'                  => !empty($configs['hero_metrics']) ? (json_decode($configs['hero_metrics'], true) ?: []) : [
                ['icon' => 'bag', 'val' => '120万+', 'lbl' => '累计完成回收'],
                ['icon' => 'clock', 'val' => '10秒', 'lbl' => '快速精准估价'],
                ['icon' => 'truck', 'val' => '0元', 'lbl' => '顺丰双向保价包邮'],
                ['icon' => 'shield', 'val' => '100%', 'lbl' => '隐私安全清除']
            ],
            'hero_banner_autoplay'          => !empty($configs['hero_banner_autoplay']) ? max(2, (int)$configs['hero_banner_autoplay']) : 4,
            'hero_banner_floating_estimate' => ($configs['hero_banner_floating_estimate'] ?? '1') !== '0',

            // 首页有效 Banner 列表 (仅获取已启用的轮播图)
            'banners'                       => (new \App\Model\BannerModel())->getAllBanners(true),

            // 向下兼容既有字段
            'banner_title'                  => !empty($configs['hero_title']) ? $configs['hero_title'] : (!empty($configs['banner_title']) ? $configs['banner_title'] : $meta['site_name']),
            'banner_subtitle'               => !empty($configs['hero_subtitle']) ? $configs['hero_subtitle'] : (!empty($configs['banner_subtitle']) ? $configs['banner_subtitle'] : $meta['slogan']),
            'price_lock_days'               => !empty($configs['price_lock_days']) ? (int)$configs['price_lock_days'] : 7,

            // 首页实时动态跑马灯广播配置
            'ticker_enabled'  => ($configs['ticker_enabled'] ?? '1') !== '0',
            'ticker_tag'      => !empty($configs['ticker_tag']) ? $configs['ticker_tag'] : '实时动态',
            'ticker_interval' => !empty($configs['ticker_interval']) ? max(2, (int)$configs['ticker_interval']) : 4,
            'ticker_messages' => $configs['ticker_messages'] ?? '',

            // 回收履约交割方式自定义 (开关、显示名称、副标题说明)
            'recycle_home_enabled'  => ($configs['recycle_home_enabled'] ?? '1') !== '0',
            'recycle_home_name'     => !empty($configs['recycle_home_name']) ? $configs['recycle_home_name'] : '预约免费上门',
            'recycle_home_desc'     => !empty($configs['recycle_home_desc']) ? $configs['recycle_home_desc'] : '专业人员免费上门，当面验货核验',
            'recycle_mail_enabled'  => ($configs['recycle_mail_enabled'] ?? '1') !== '0',
            'recycle_mail_name'     => (!empty($configs['recycle_mail_name']) && $configs['recycle_mail_name'] !== '全国顺丰包邮' && $configs['recycle_mail_name'] !== '全国快递包邮') ? $configs['recycle_mail_name'] : '快速寄送',
            'recycle_mail_desc'     => !empty($configs['recycle_mail_desc']) ? $configs['recycle_mail_desc'] : '快递小哥上门取件，快速寄出验机结算',
            'recycle_store_enabled' => ($configs['recycle_store_enabled'] ?? '1') !== '0',
            'recycle_store_name'    => !empty($configs['recycle_store_name']) ? $configs['recycle_store_name'] : '线下门店自送',
            'recycle_store_desc'    => !empty($configs['recycle_store_desc']) ? $configs['recycle_store_desc'] : '前往就近服务门店交接，现场秒级结清',

            // 顺丰速运与快递回收配置 (支持付款方式、运费展示标签与运费补贴规则自定义)
            'sf_enabled'            => ($configs['sf_enabled'] ?? '0') === '1',
            'sf_pay_method'         => !empty($configs['sf_pay_method']) ? (string)$configs['sf_pay_method'] : '2',
            'sf_freight_tag'        => !empty($configs['sf_freight_tag']) ? trim($configs['sf_freight_tag']) : '运费补贴·推荐',
            'sf_freight_rule'       => !empty($configs['sf_freight_rule']) ? trim($configs['sf_freight_rule']) : '',
            'sf_receive_contact'    => !empty($configs['sf_receive_contact']) ? $configs['sf_receive_contact'] : '平台质检收件中心',
            'sf_receive_mobile'     => !empty($configs['sf_receive_mobile']) ? $configs['sf_receive_mobile'] : (!empty($configs['service_tel']) ? $configs['service_tel'] : '400-800-8888'),
            'sf_receive_address'    => trim(($configs['sf_receive_province'] ?? '') . ($configs['sf_receive_city'] ?? '') . ($configs['sf_receive_district'] ?? '') . ($configs['sf_receive_address'] ?? '')) ?: '平台回收质检中心',

            // 客户收款渠道自定义 (干净通俗文案，杜绝括号内秒结/小字干扰)
            'payout_alipay_enabled' => ($configs['payout_alipay_enabled'] ?? '1') !== '0',
            'payout_alipay_title'   => !empty($configs['payout_alipay_title']) ? trim(preg_replace('/\s*[\(（].*?[\)）]/u', '', $configs['payout_alipay_title'])) : '支付宝',
            'payout_bank_enabled'   => ($configs['payout_bank_enabled'] ?? '1') !== '0',
            'payout_bank_title'     => !empty($configs['payout_bank_title']) ? trim(preg_replace('/\s*[\(（].*?[\)）]/u', '', $configs['payout_bank_title'])) : '银行卡转账',
            'payout_wechat_enabled' => ($configs['payout_wechat_enabled'] ?? '1') !== '0',
            'payout_wechat_title'   => !empty($configs['payout_wechat_title']) ? trim(preg_replace('/\s*[\(（].*?[\)）]/u', '', $configs['payout_wechat_title'])) : '微信零钱',
            'payout_cash_enabled'   => ($configs['payout_cash_enabled'] ?? '1') !== '0',
            'payout_cash_title'     => !empty($configs['payout_cash_title']) ? trim(preg_replace('/\s*[\(（].*?[\)）]/u', '', $configs['payout_cash_title'])) : '现场现金',

            // 用户认证与注册方式高度自定义开关
            'user_auth_password_enabled' => ($configs['user_auth_password_enabled'] ?? '1') !== '0',
            'user_register_enabled'      => ($configs['user_register_enabled'] ?? '1') !== '0',
            'user_auth_fast_enabled'     => ($configs['user_auth_fast_enabled'] ?? '1') !== '0',
            'user_auth_wechat_enabled'   => ($configs['user_auth_wechat_enabled'] ?? '1') !== '0',
            'user_order_guest_enabled'   => ($configs['user_order_guest_enabled'] ?? '1') !== '0',
            'user_require_realname'      => ($configs['user_require_realname'] ?? '0') === '1',

            // 前台自定义多级导航菜单树
            'nav_menus'                  => (new \App\Service\MenuService())->getMenus(true),

            // 底部大屏 Mega Footer 配置与客服二维码
            'footer_desc'                => !empty($configs['footer_desc']) ? $configs['footer_desc'] : '官方直营全品类回收服务平台。价格公开透明，顺丰免费上门取件，专业质检快速放款，数据安全清除保障，打造安全可靠的循环回收服务。',
            'footer_trust_tags'          => !empty($configs['footer_trust_tags']) ? $configs['footer_trust_tags'] : '顺丰速运合作, 绿色循环回收, 数据安全清除',
            'footer_service_tel'         => !empty($configs['footer_service_tel']) ? $configs['footer_service_tel'] : (!empty($configs['service_tel']) ? $configs['service_tel'] : '400-800-8888'),
            'footer_service_time'        => !empty($configs['footer_service_time']) ? $configs['footer_service_time'] : '周一至周日 9:00 - 21:00 (节假日无休)',
            'footer_service_email'       => !empty($configs['footer_service_email']) ? $configs['footer_service_email'] : 'service@qilingrecycle.com',
            'footer_address'             => !empty($configs['footer_address']) ? $configs['footer_address'] : '深圳市南山区高新南一道科兴科学园B座质检收发中心',
            'footer_qrcode_wechat'       => !empty($configs['footer_qrcode_wechat']) ? $configs['footer_qrcode_wechat'] : '/uploads/default/site_logo.svg',
            'footer_qrcode_wechat_title' => !empty($configs['footer_qrcode_wechat_title']) ? $configs['footer_qrcode_wechat_title'] : '微信扫码 · 专属客服 1对1',
            'footer_qrcode_mp'           => !empty($configs['footer_qrcode_mp']) ? $configs['footer_qrcode_mp'] : '',
            'footer_qrcode_mp_title'     => !empty($configs['footer_qrcode_mp_title']) ? $configs['footer_qrcode_mp_title'] : '官方公众号 · 获取最新行情',
            'footer_articles'            => (new \App\Model\ArticleModel())->getFooterArticlesGrouped(),

            // 加价券营销与前台展示控制 (支持各区域高度自定义开关)
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

            // 小程序与移动端专属全链路装修配置
            'miniapp_theme_color'            => !empty($configs['miniapp_theme_color']) ? $configs['miniapp_theme_color'] : '#1e58ff',
            'miniapp_nav_title'              => !empty($configs['miniapp_nav_title']) ? $configs['miniapp_nav_title'] : '启灵专业数码回收',
            'miniapp_nav_bg'                 => !empty($configs['miniapp_nav_bg']) ? $configs['miniapp_nav_bg'] : 'gradient',
            'miniapp_card_radius'            => !empty($configs['miniapp_card_radius']) ? (int)$configs['miniapp_card_radius'] : 20,
            'miniapp_search_placeholder'     => !empty($configs['miniapp_search_placeholder']) ? $configs['miniapp_search_placeholder'] : '搜索你想卖的手机 / 平板 / 电脑型号',
            'miniapp_hero_enabled'           => ($configs['miniapp_hero_enabled'] ?? '1') !== '0',
            'miniapp_hero_gradient'          => !empty($configs['miniapp_hero_gradient']) ? $configs['miniapp_hero_gradient'] : 'blue',
            'miniapp_hero_tag'               => !empty($configs['miniapp_hero_tag']) ? $configs['miniapp_hero_tag'] : '启灵高价回收 · 官方验机',
            'miniapp_hero_title'             => !empty($configs['miniapp_hero_title']) ? $configs['miniapp_hero_title'] : '旧机别放着，立即变现',
            'miniapp_hero_subtitle'          => !empty($configs['miniapp_hero_subtitle']) ? $configs['miniapp_hero_subtitle'] : '顺丰包邮 · 隐私深度清除 · 质检一致当天打款',
            'miniapp_category_title'         => !empty($configs['miniapp_category_title']) ? $configs['miniapp_category_title'] : '全品类数码回收',
            'miniapp_category_limit'         => !empty($configs['miniapp_category_limit']) ? (int)$configs['miniapp_category_limit'] : 10,
            'miniapp_category_cols'          => !empty($configs['miniapp_category_cols']) ? (int)$configs['miniapp_category_cols'] : 5,
            'miniapp_category_enabled'       => ($configs['miniapp_category_enabled'] ?? '1') !== '0',
            'miniapp_guarantee_1'            => !empty($configs['miniapp_guarantee_1']) ? $configs['miniapp_guarantee_1'] : '隐私彻底清除',
            'miniapp_guarantee_2'            => !empty($configs['miniapp_guarantee_2']) ? $configs['miniapp_guarantee_2'] : '顺丰双向包邮',
            'miniapp_guarantee_3'            => !empty($configs['miniapp_guarantee_3']) ? $configs['miniapp_guarantee_3'] : '验机极速放款',
            'miniapp_guarantee_4'            => !empty($configs['miniapp_guarantee_4']) ? $configs['miniapp_guarantee_4'] : '7天估价锁定',
            'miniapp_guarantee_enabled'      => ($configs['miniapp_guarantee_enabled'] ?? '1') !== '0',
            'miniapp_process_enabled'        => ($configs['miniapp_process_enabled'] ?? '1') !== '0',
            'miniapp_process_title'          => !empty($configs['miniapp_process_title']) ? $configs['miniapp_process_title'] : '简单三步 · 轻松变现',
            'miniapp_step_1_title'           => !empty($configs['miniapp_step_1_title']) ? $configs['miniapp_step_1_title'] : '在线估价',
            'miniapp_step_1_desc'            => !empty($configs['miniapp_step_1_desc']) ? $configs['miniapp_step_1_desc'] : '30秒选项测机',
            'miniapp_step_2_title'           => !empty($configs['miniapp_step_2_title']) ? $configs['miniapp_step_2_title'] : '顺丰寄件/上门',
            'miniapp_step_2_desc'            => !empty($configs['miniapp_step_2_desc']) ? $configs['miniapp_step_2_desc'] : '全程包邮免密',
            'miniapp_step_3_title'           => !empty($configs['miniapp_step_3_title']) ? $configs['miniapp_step_3_title'] : '验机打款',
            'miniapp_step_3_desc'            => !empty($configs['miniapp_step_3_desc']) ? $configs['miniapp_step_3_desc'] : '直达微信零钱',
            'miniapp_hot_title'              => !empty($configs['miniapp_hot_title']) ? $configs['miniapp_hot_title'] : '大家都在卖 · 热门回收机型',
            'miniapp_hot_limit'              => !empty($configs['miniapp_hot_limit']) ? (int)$configs['miniapp_hot_limit'] : 5,
            'miniapp_coupon_sec_title'       => !empty($configs['miniapp_coupon_sec_title']) ? $configs['miniapp_coupon_sec_title'] : '回收加价补贴专区',
            'miniapp_coupon_sec_tag'         => !empty($configs['miniapp_coupon_sec_tag']) ? $configs['miniapp_coupon_sec_tag'] : '最高立补 ¥300',
            'miniapp_tab_home_name'          => !empty($configs['miniapp_tab_home_name']) ? $configs['miniapp_tab_home_name'] : '首页',
            'miniapp_tab_estimate_name'      => !empty($configs['miniapp_tab_estimate_name']) ? $configs['miniapp_tab_estimate_name'] : '估价回收',
            'miniapp_tab_order_name'         => !empty($configs['miniapp_tab_order_name']) ? $configs['miniapp_tab_order_name'] : '订单明细',
            'miniapp_tab_user_name'          => !empty($configs['miniapp_tab_user_name']) ? $configs['miniapp_tab_user_name'] : '我的',
            'miniapp_service_tel_title'      => !empty($configs['miniapp_service_tel_title']) ? $configs['miniapp_service_tel_title'] : '官方客服热线',
            'miniapp_service_tel'            => !empty($configs['miniapp_service_tel']) ? $configs['miniapp_service_tel'] : (!empty($configs['service_tel']) ? $configs['service_tel'] : '400-800-8888'),
            'miniapp_service_hours'          => !empty($configs['miniapp_service_hours']) ? $configs['miniapp_service_hours'] : '周一至周日 09:00 - 21:00',
            'miniapp_privacy_title'          => !empty($configs['miniapp_privacy_title']) ? $configs['miniapp_privacy_title'] : '隐私清除保障说明',
            'miniapp_privacy_content'        => !empty($configs['miniapp_privacy_content']) ? $configs['miniapp_privacy_content'] : '平台采用专业数据擦除技术，对设备存储介质进行全盘覆写清除，出具《隐私数据清除报告》，杜绝个人数据残留，保障您的个人隐私安全。',
            'miniapp_about_title'            => !empty($configs['miniapp_about_title']) ? $configs['miniapp_about_title'] : '关于启灵回收',
            'miniapp_about_content'          => !empty($configs['miniapp_about_content']) ? $configs['miniapp_about_content'] : '启灵回收是官方直营的数字化全品类二手回收服务平台，深耕绿色循环经济。通过自动化质检流水线与专业估价模型，为广大用户提供高价、安全、便捷、透明的一站式闲置变现服务。',
            'miniapp_custom_categories'      => $miniappCategories,

            // 首页常见问题解答 (FAQ) 可视化配置
            'home_faq_enabled'               => ($configs['home_faq_enabled'] ?? '1') !== '0',
            'home_faq_title'                 => !empty($configs['home_faq_title']) ? $configs['home_faq_title'] : '回收常见问题解答',
            'home_faq_subtitle'              => !empty($configs['home_faq_subtitle']) ? $configs['home_faq_subtitle'] : '解答您的疑惑，让每一笔回收都透明安心',
            'home_faq_list'                  => !empty($configs['home_faq_list']) && is_array(json_decode($configs['home_faq_list'], true)) 
                ? json_decode($configs['home_faq_list'], true) 
                : [
                    ['q' => 'Q1. 提交估价后的价格会随意变动吗？', 'a' => '我们承诺 7 天价格锁定保障！在您提交订单后的7天内，只要实际质检情况与您提交的评估描述一致，我们将 100% 按照预估价格全额放款，绝不坐地降价。'],
                    ['q' => 'Q2. 寄送顺丰快递的运费由谁承担？', 'a' => '全场所有品类均享受【顺丰包邮】服务！顺丰小哥上门取件时直接选择“到付”即可，往返运费均由平台全额承担，您不需要掏一分钱。'],
                    ['q' => 'Q3. 设备里的照片和个人隐私会被泄露吗？', 'a' => '请完全放心！平台质检入库后将对设备进行专业数据清除，确保所有照片、账号、聊天记录安全清除不残留！'],
                    ['q' => 'Q4. 质检复核后如果我不认可最终成交价怎么办？', 'a' => '我们充分尊重用户的自主选择权！若您对质检复核金额不满意，可在会员中心一键点击“拒绝成交”，我们将通过顺丰包邮将原机原封退还给您，退运保价运费由平台承担，无需您付费！']
                ],

            // 首页 3 步极速回收服务流程可视化配置
            'home_process_enabled'           => ($configs['home_process_enabled'] ?? '1') !== '0',
            'home_process_title'             => !empty($configs['home_process_title']) ? $configs['home_process_title'] : '简单3步 · 闲置极速变现',
            'home_process_subtitle'          => !empty($configs['home_process_subtitle']) ? $configs['home_process_subtitle'] : '顺丰免费上门 / 官方专业质检 / 确认后秒级极速放款',
            'home_process_step1_title'       => !empty($configs['home_process_step1_title']) ? $configs['home_process_step1_title'] : '在线智能精准估价',
            'home_process_step1_desc'        => !empty($configs['home_process_step1_desc']) ? $configs['home_process_step1_desc'] : '快速勾选机况成色，系统自动匹配最新市场行情价，满意后再提交。',
            'home_process_step2_title'       => !empty($configs['home_process_step2_title']) ? $configs['home_process_step2_title'] : '顺丰免费上门 · 包邮',
            'home_process_step2_desc'        => !empty($configs['home_process_step2_desc']) ? $configs['home_process_step2_desc'] : '顺丰小哥免费上门当面装箱封签，全国往返双向包邮且全程保价，您无需支付任何运费。',
            'home_process_step3_title'       => !empty($configs['home_process_step3_title']) ? $configs['home_process_step3_title'] : '官方质检 · 秒级放款',
            'home_process_step3_desc'        => !empty($configs['home_process_step3_desc']) ? $configs['home_process_step3_desc'] : '全程无死角高清监控录像验机，绝不恶意压价；确认价格后，微信或支付宝秒级直达账户。',
        ]);

        // 缓存 10 分钟 (后台修改配置或导航时自动清除)
        $cache->set($cacheKey, $merged, 600);

        $this->success($merged, '获取平台配置成功');
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

