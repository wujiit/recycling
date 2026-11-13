<?php
/**
 * 启灵同城服务系统 - 加价券核心业务服务
 * 包含加价券匹配、补贴金额试算、新用户发券与订单核销
 */

declare(strict_types=1);

namespace App\Service;

use App\Model\CouponModel;

class CouponService
{
    private $couponModel;

    public function __construct()
    {
        $this->couponModel = new CouponModel();
    }

    /**
     * 为当前机型及预估价智能匹配全场最优可用的加价券
     * (转转/爱回收同款：全自动帮用户选省心最高补贴券)
     */
    public function matchBestCoupon(int $userId, float $estimatePrice, int $categoryId = 0): ?array
    {
        if ($userId <= 0 || $estimatePrice <= 0) {
            return null;
        }

        $coupons = $this->couponModel->getUserCoupons($userId, 'unused', $estimatePrice, $categoryId);
        if (empty($coupons)) {
            return null;
        }

        // 寻找满足条件且加价补贴金额最大的券
        $best = null;
        foreach ($coupons as $c) {
            if ($c['is_usable'] && $c['calculated_add_price'] > 0) {
                if ($best === null || $c['calculated_add_price'] > $best['calculated_add_price']) {
                    $best = $c;
                }
            }
        }

        return $best;
    }

    /**
     * 试算某张指定加价券在特定估价下的具体补贴金额
     */
    public function calculateAddPrice(array $coupon, float $estimatePrice): float
    {
        if ($estimatePrice <= 0) return 0.00;

        $minPrice = (float)($coupon['min_estimate_price'] ?? 0.00);
        if ($minPrice > 0 && $estimatePrice < $minPrice) {
            return 0.00;
        }

        $type = $coupon['type'] ?? 'fixed';
        $amount = (float)($coupon['amount'] ?? 0.00);
        $maxAmount = (float)($coupon['max_amount'] ?? 0.00);

        if ($type === 'percent') {
            $add = round(($estimatePrice * $amount) / 100, 2);
            if ($maxAmount > 0 && $add > $maxAmount) {
                $add = $maxAmount;
            }
            return $add;
        }

        return $amount;
    }

    /**
     * 校验用户指定的加价券是否合法可用，并返回核算的加价补贴金额
     */
    public function validateAndApply(int $userCouponId, int $userId, float $estimatePrice, int $categoryId = 0): array
    {
        if ($userCouponId <= 0) {
            return ['code' => 200, 'data' => ['add_price' => 0.00, 'coupon' => null]];
        }

        $coupons = $this->couponModel->getUserCoupons($userId, 'unused', $estimatePrice, $categoryId);
        $target = null;
        foreach ($coupons as $c) {
            if ((int)$c['id'] === $userCouponId) {
                $target = $c;
                break;
            }
        }

        if (!$target) {
            return ['code' => 400, 'msg' => '所选加价券不存在或已被使用'];
        }

        if (!$target['is_usable']) {
            return ['code' => 400, 'msg' => '加价券不可用：' . ($target['unusable_reason'] ?: '未达生效门槛')];
        }

        $addPrice = $this->calculateAddPrice($target, $estimatePrice);

        return [
            'code' => 200,
            'msg'  => '加价券校验通过',
            'data' => [
                'user_coupon_id' => $userCouponId,
                'coupon_id'      => (int)$target['coupon_id'],
                'title'          => $target['title'],
                'add_price'      => $addPrice,
                'coupon'         => $target
            ]
        ];
    }

    /**
     * 新用户注册/首次登录自动发放新人加价礼包
     */
    public function grantAutoCoupons(int $userId): int
    {
        if ($userId <= 0) return 0;
        return $this->couponModel->grantAutoCoupons($userId);
    }
}
