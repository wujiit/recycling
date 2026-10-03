<?php
/**
 * 启灵独立回收系统 - 客户端加价补贴券控制器
 * 职责：用户领券中心、我的卡包、估价自动匹配最优加价券、下单验券
 * 编码：UTF-8 无 BOM
 */

declare(strict_types=1);

namespace App\Controller\Api;

use App\Controller\Controller;
use App\Common\Request;
use App\Service\AuthService;
use App\Service\CouponService;
use App\Model\CouponModel;
use App\Model\DeviceModel;

class CouponController extends Controller
{
    private $authService;
    private $couponService;
    private $couponModel;

    public function __construct()
    {
        $this->authService = new AuthService();
        $this->couponService = new CouponService();
        $this->couponModel = new CouponModel();
    }

    /**
     * 提取当前登录用户 (可选/静默)
     */
    private function tryGetUserId(): int
    {
        $token = (string)Request::get('token', Request::post('token', ''));
        if (empty($token)) {
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
            if (!empty($authHeader) && preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
                $token = trim($matches[1]);
            }
        }
        if (!empty($token)) {
            $user = $this->authService->checkUserToken($token);
            if ($user && !empty($user['id'])) {
                return (int)$user['id'];
            }
        }
        return 0;
    }

    /**
     * 强制校验已登录用户
     */
    private function getAuthedUser(): array
    {
        $userId = $this->tryGetUserId();
        if ($userId <= 0) {
            $this->error('请先登录后再操作', 401);
        }
        return ['id' => $userId];
    }

    /**
     * 领券中心：获取全场可供用户自主领取的加价券列表
     */
    public function getAvailableCoupons(): void
    {
        $userId = $this->tryGetUserId();
        $list = $this->couponModel->getPublicActiveCoupons($userId);
        $this->success($list, '获取领券中心列表成功');
    }

    /**
     * 路由别名：available
     */
    public function available(): void
    {
        $this->getAvailableCoupons();
    }

    /**
     * 用户领取加价券
     */
    public function receive(): void
    {
        $user = $this->getAuthedUser();
        $couponId = Request::postInt('coupon_id', Request::getInt('coupon_id', 0));
        if ($couponId <= 0) {
            $this->error('加价券ID不能为空');
        }

        $res = $this->couponModel->receiveCoupon((int)$user['id'], $couponId);
        if ($res['code'] === 200) {
            $this->success($res['data'], $res['msg']);
        } else {
            $this->error($res['msg'], $res['code']);
        }
    }

    /**
     * 我的卡券包列表 (支持查看未使用、已使用、已过期)
     */
    public function myCoupons(): void
    {
        $user = $this->getAuthedUser();
        $status = (string)Request::get('status', 'unused');
        $estimatePrice = (float)Request::get('estimate_price', 0.0);
        $categoryId = Request::getInt('category_id', 0);

        $coupons = $this->couponModel->getUserCoupons((int)$user['id'], $status, $estimatePrice, $categoryId);
        $this->success($coupons, '获取我的卡券包成功');
    }

    /**
     * 智能匹配推荐当前最优加价券
     * (在估价大屏上实时高亮呈现：预估加价金额与叠加后的最高到手价)
     */
    public function matchBest(): void
    {
        $estimatePrice = (float)Request::post('estimate_price', Request::get('estimate_price', 0.0));
        $deviceId = Request::postInt('device_id', Request::getInt('device_id', 0));
        $categoryId = Request::postInt('category_id', Request::getInt('category_id', 0));

        if ($deviceId > 0 && $categoryId <= 0) {
            $deviceModel = new DeviceModel();
            $device = $deviceModel->getDeviceById($deviceId);
            if ($device && !empty($device['category_id'])) {
                $categoryId = (int)$device['category_id'];
            }
        }

        $userId = $this->tryGetUserId();
        $best = null;
        if ($userId > 0 && $estimatePrice > 0) {
            $best = $this->couponService->matchBestCoupon($userId, $estimatePrice, $categoryId);
        }

        // 若用户未登录或未领券，从公开发行池中匹配推荐一张最适合该估价的加价券（展示“新人立领券满额加XX元”以促成新客注册）
        $candidatePublic = null;
        if (!$best && $estimatePrice > 0) {
            $publicCoupons = $this->couponModel->getPublicActiveCoupons(0);
            foreach ($publicCoupons as $pc) {
                $minP = (float)$pc['min_estimate_price'];
                $catId = (int)$pc['category_id'];
                if ($estimatePrice >= $minP && ($catId === 0 || $catId === $categoryId)) {
                    $calcAdd = $this->couponService->calculateAddPrice($pc, $estimatePrice);
                    if ($calcAdd > 0) {
                        $pc['calculated_add_price'] = $calcAdd;
                        if ($candidatePublic === null || $calcAdd > $candidatePublic['calculated_add_price']) {
                            $candidatePublic = $pc;
                        }
                    }
                }
            }
        }

        $calcAddPrice = $best ? (float)$best['calculated_add_price'] : ($candidatePublic ? (float)$candidatePublic['calculated_add_price'] : 0.00);
        $totalEstimated = round($estimatePrice + $calcAddPrice, 2);

        $this->success([
            'base_estimate_price'  => $estimatePrice,
            'coupon_add_price'     => $calcAddPrice,
            'total_estimate_price' => $totalEstimated,
            'matched_user_coupon'  => $best,
            'suggested_public'     => $candidatePublic,
            'has_coupon'           => $best !== null,
            // 兼容 MiniApp 历史别名
            'matched'              => $best !== null,
            'coupon'               => $best,
            'add_price'            => $calcAddPrice,
        ], '加价券智能匹配核算完成');
    }
}
