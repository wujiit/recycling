<?php
/**
 * 启灵独立回收系统 - 管理后台回收加价券控制器
 * 职责：加价券模板 CRUD、营销规则维护、发放与核销流水大屏
 * 编码：UTF-8 无 BOM
 */

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Controller\Admin\AdminBaseController;
use App\Common\Request;
use App\Model\CouponModel;

class CouponController extends AdminBaseController
{
    private $couponModel;

    public function __construct()
    {
        parent::__construct();
        $this->couponModel = new CouponModel();
    }

    /**
     * 加价券模板列表
     */
    public function list(): void
    {
        $keyword = (string)Request::get('keyword', '');
        $status = Request::get('status', '');
        $type = (string)Request::get('type', '');
        $page = Request::getInt('page', 1);
        $pageSize = Request::getInt('page_size', 15);

        $filter = [
            'keyword' => $keyword,
            'status'  => $status,
            'type'    => $type
        ];

        $res = $this->couponModel->getCouponList($filter, $page, $pageSize);
        $this->success($res, '获取加价券列表成功');
    }

    /**
     * 获取加价券详情
     */
    public function detail(): void
    {
        $id = Request::getInt('id', 0);
        if ($id <= 0) {
            $this->error('参数错误: 券ID不能为空');
        }

        $coupon = $this->couponModel->getCouponById($id);
        if (!$coupon) {
            $this->error('加价券不存在', 404);
        }

        $this->success($coupon, '获取加价券详情成功');
    }

    /**
     * 保存/更新加价券
     */
    public function save(): void
    {
        $data = Request::post();
        if (empty($data['title'])) {
            $this->error('加价券名称不能为空');
        }
        $amount = (float)($data['amount'] ?? 0);
        if ($amount <= 0) {
            $this->error('加价值必须大于0');
        }

        $id = $this->couponModel->saveCoupon($data);
        $this->success(['id' => $id], '加价券已保存更新');
    }

    /**
     * 删除加价券
     */
    public function delete(): void
    {
        $id = Request::getInt('id', Request::postInt('id', 0));
        if ($id <= 0) {
            $this->error('参数错误');
        }

        $res = $this->couponModel->deleteCoupon($id);
        if ($res) {
            $this->success(null, '加价券已成功删除');
        } else {
            $this->error('删除失败，请稍后重试');
        }
    }

    /**
     * 启用/停用加价券
     */
    public function toggleStatus(): void
    {
        $id = Request::getInt('id', Request::postInt('id', 0));
        $status = Request::getInt('status', Request::postInt('status', 1));
        if ($id <= 0) {
            $this->error('参数错误');
        }

        $this->couponModel->toggleStatus($id, $status);
        $this->success(null, $status === 1 ? '加价券已上架启用' : '加价券已下架停用');
    }

    /**
     * 用户领券与核销流水大屏
     */
    public function userCoupons(): void
    {
        $keyword = (string)Request::get('keyword', '');
        $status = (string)Request::get('status', '');
        $page = Request::getInt('page', 1);
        $pageSize = Request::getInt('page_size', 15);

        $filter = [
            'keyword' => $keyword,
            'status'  => $status
        ];

        $res = $this->couponModel->getUserCouponLogs($filter, $page, $pageSize);
        $this->success($res, '获取用户卡券流水成功');
    }

    /**
     * 综合营销指标统计
     */
    public function stats(): void
    {
        $stats = $this->couponModel->getCouponStats();
        $this->success($stats, '获取加价补贴统计成功');
    }

    /**
     * 管理员主动向指定用户定向发放加价券
     */
    public function grantToUser(): void
    {
        $userId = Request::postInt('user_id', 0);
        $couponId = Request::postInt('coupon_id', 0);

        if ($userId <= 0 || $couponId <= 0) {
            $this->error('用户ID和加价券ID均不能为空');
        }

        $res = $this->couponModel->receiveCoupon($userId, $couponId);
        if ($res['code'] === 200) {
            $this->success($res['data'], '加价券已成功发放到用户卡包');
        } else {
            $this->error($res['msg'], $res['code']);
        }
    }

    /**
     * 获取加价券前台展示与开关配置
     */
    public function getDisplaySettings(): void
    {
        $db = \App\Model\Database::getInstance();
        $p = $db->getPrefix();
        $sql = "SELECT `config_key`, `config_value` FROM `{$p}sys_config` WHERE `config_key` LIKE 'coupon_%' OR `config_key` LIKE 'miniapp_coupon_%'";
        $rows = $db->fetchAll($sql);
        $configs = [];
        foreach ($rows as $r) {
            $configs[$r['config_key']] = $r['config_value'];
        }

        $settings = [
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

        $this->success($settings, '获取加价券前台展示开关配置成功');
    }

    /**
     * 保存加价券前台展示与开关配置
     */
    public function saveDisplaySettings(): void
    {
        $settings = Request::post('settings', []);
        if (!is_array($settings)) {
            $this->error('配置数据格式错误');
        }

        $db = \App\Model\Database::getInstance();
        $p = $db->getPrefix();
        $sql = "INSERT INTO `{$p}sys_config` (`group_name`, `config_key`, `config_value`, `updated_at`) 
                VALUES ('coupon', ?, ?, ?) 
                ON DUPLICATE KEY UPDATE `config_value` = VALUES(`config_value`), `updated_at` = VALUES(`updated_at`)";

        $now = time();
        foreach ($settings as $k => $v) {
            $key = trim((string)$k);
            if (!empty($key) && (strpos($key, 'coupon_') === 0 || strpos($key, 'miniapp_coupon_') === 0)) {
                $valStr = is_bool($v) ? ($v ? '1' : '0') : (string)$v;
                $db->execute($sql, [$key, $valStr, $now]);
            }
        }

        // 立即清除配置与平台信息缓存
        $cache = \App\Service\CacheService::getInstance();
        $cache->delete('sys_config:all');
        $cache->delete('platform_info:appraisal');

        $this->success(null, '加价券前台展示与开关配置已保存生效');
    }
}
