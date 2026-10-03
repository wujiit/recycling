<?php
/**
 * 启灵独立回收系统 - 订单全生命周期业务服务
 * 职责：三合一履约下单、初评快照保存、物流单号录入、差价协商确认
 * 编码：UTF-8 无 BOM
 */

namespace App\Service;

use App\Model\OrderModel;
use App\Model\DeviceModel;
use App\Helper\Str;
use App\Service\SfExpressService;

class OrderService
{
    private $orderModel;
    private $pricingService;
    private $deviceModel;

    public function __construct()
    {
        $this->orderModel = new OrderModel();
        $this->pricingService = new PricingService();
        $this->deviceModel = new DeviceModel();
    }

    /**
     * 用户端提交回收订单 (支持加价补贴券叠加与锁券)
     */
    public function createOrder(int $userId, int $deviceId, array $selectedItemIds, string $fulfillmentType, array $contact, string $appraisalMode = 'custom', string $quickTierId = '', string $mailSubType = '', int $userCouponId = 0): array
    {
        $device = $this->deviceModel->getDeviceById($deviceId);
        if (!$device) {
            return ['code' => 400, 'msg' => '评估机型不存在'];
        }

        // 验证履约模式有效性
        if (!in_array($fulfillmentType, ['mail', 'store', 'home'], true)) {
            return ['code' => 400, 'msg' => '不支持的履约回收模式'];
        }

        // 邮寄子模式处理 (顺丰上门取件 sf_pickup vs 自行寄送 self_delivery)
        if ($fulfillmentType === 'mail') {
            if (empty($mailSubType)) {
                $mailSubType = trim((string)($contact['mail_sub_type'] ?? ''));
            }
            if (empty($mailSubType)) {
                $sfCheck = new SfExpressService();
                $mailSubType = ($sfCheck->isEnabled() && $sfCheck->isConfigured()) ? 'sf_pickup' : 'self_delivery';
            }
        } else {
            $mailSubType = '';
        }

        $quickTierName = '';
        if ($appraisalMode === 'quick' && !empty($quickTierId)) {
            // 极速模式：重新服务端核算成色档位价格 (防前端篡改)
            $priceRes = $this->pricingService->calculateQuickTierPrice($deviceId, $quickTierId);
            if ($priceRes['code'] !== 200) {
                return $priceRes;
            }
            $estimatePrice = $priceRes['data']['estimate_price'];
            $snapshotItems = $priceRes['data']['breakdown'];
            $quickTierName = $priceRes['data']['quick_tier']['name'] ?? '标准成色';
        } else {
            // 专业精准细测模式：重新服务端核算预估价 (防止前端传篡改的价格参数)
            $priceRes = $this->pricingService->calculateEstimatePrice($deviceId, $selectedItemIds);
            if ($priceRes['code'] !== 200) {
                return $priceRes;
            }
            $estimatePrice = $priceRes['data']['estimate_price'];
            $snapshotItems = $priceRes['data']['breakdown'];
        }

        // 生成高唯一性订单号
        $orderSn = Str::generateSn('RC');

        // 提取客户指定的收款方式与账号
        $payoutType = (string)($contact['payout_type'] ?? 'alipay');
        $payoutName = (string)($contact['payout_name'] ?? '');
        $payoutAccount = (string)($contact['payout_account'] ?? '');
        $payoutBank = (string)($contact['payout_bank'] ?? '');

        // 提取门店自送信息并自动关联保障
        $storeId = (int)($contact['store_id'] ?? 0);
        $storeName = trim((string)($contact['store_name'] ?? ''));
        if ($fulfillmentType === 'store') {
            $storeModel = new \App\Model\StoreModel();
            if ($storeId > 0 && empty($storeName)) {
                $store = $storeModel->getStoreById($storeId);
                if ($store) {
                    $storeName = $store['name'];
                }
            } elseif ($storeId <= 0) {
                $defaultStore = $storeModel->getDefaultStore();
                if ($defaultStore) {
                    $storeId = (int)$defaultStore['id'];
                    $storeName = $defaultStore['name'];
                }
            }
        }

        if ($userCouponId <= 0 && !empty($contact['user_coupon_id'])) {
            $userCouponId = (int)$contact['user_coupon_id'];
        }

        // 校验并核算加价券补贴金额 (服务端严密核验防篡改)
        $couponId = 0;
        $couponAddPrice = 0.00;
        if ($userCouponId > 0 && $userId > 0) {
            $couponService = new CouponService();
            $couponRes = $couponService->validateAndApply($userCouponId, $userId, (float)$estimatePrice, (int)$device['category_id']);
            if ($couponRes['code'] !== 200) {
                return $couponRes;
            }
            $couponId = (int)$couponRes['data']['coupon_id'];
            $couponAddPrice = (float)$couponRes['data']['add_price'];
        }

        $orderData = [
            'order_sn'         => $orderSn,
            'user_id'          => $userId,
            'device_id'        => $deviceId,
            'device_name'      => $device['name'],
            'estimate_price'   => $estimatePrice,
            'coupon_id'        => $couponId,
            'user_coupon_id'   => $userCouponId,
            'coupon_add_price' => $couponAddPrice,
            'appraisal_mode'   => $appraisalMode,
            'quick_tier_name'  => $quickTierName,
            'fulfillment_type' => $fulfillmentType,
            'mail_sub_type'    => $mailSubType,
            'store_id'         => $storeId,
            'store_name'       => $storeName,
            'payout_type'      => $payoutType,
            'payout_name'      => $payoutName,
            'payout_account'   => $payoutAccount,
            'payout_bank'      => $payoutBank,
            'contact_name'     => $contact['name'] ?? '',
            'contact_mobile'   => $contact['mobile'] ?? '',
            'contact_address'  => $contact['address'] ?? '',
            'appointment_time' => $contact['appointment_time'] ?? '',
            'user_remark'      => $contact['remark'] ?? '',
        ];

        $createdSn = $this->orderModel->createOrderWithSnapshot($orderData, $snapshotItems);
        if (!$createdSn) {
            return ['code' => 500, 'msg' => '订单创建失败，请稍后重试'];
        }

        // 订单创建成功，原子锁定加价券 (绑定当前订单号)
        if ($userCouponId > 0 && $userId > 0) {
            $createdOrder = $this->orderModel->findBySn($orderSn);
            if ($createdOrder) {
                (new \App\Model\CouponModel())->lockCoupon($userCouponId, $userId, (int)$createdOrder['id'], $orderSn, $couponAddPrice);
            }
        }

        // 联动顺丰速运接口：仅当模式为寄送且用户选择【顺丰上门取件】(sf_pickup) 且顺丰开启时，才自动预约顺丰揽件
        $sfWaybillNo = '';
        if ($fulfillmentType === 'mail' && $mailSubType === 'sf_pickup') {
            try {
                $sfService = new SfExpressService();
                if ($sfService->isEnabled() && $sfService->isConfigured()) {
                    $sfRes = $sfService->createOrder($orderData);
                    if ($sfRes['code'] === 200 && !empty($sfRes['data']['waybill_no'])) {
                        $sfWaybillNo = (string)$sfRes['data']['waybill_no'];
                        $orderRow = $this->orderModel->findBySn($orderSn);
                        if ($orderRow && !empty($orderRow['id'])) {
                            $this->orderModel->updateStatus((int)$orderRow['id'], 'pending_send', [
                                'express_company' => '顺丰速运',
                                'express_sn'      => $sfWaybillNo
                            ]);
                        }
                    }
                }
            } catch (\Throwable $e) {
                // 顺丰通信异常降级处理，保证回收订单正常创建
            }
        }

        return [
            'code' => 200,
            'msg'  => '下单成功',
            'data' => [
                'order_sn'             => $orderSn,
                'estimate_price'       => $estimatePrice,
                'coupon_add_price'     => $couponAddPrice,
                'total_estimate_price' => round($estimatePrice + $couponAddPrice, 2),
                'status'               => 'pending_send',
                'fulfillment_type'     => $fulfillmentType,
                'mail_sub_type'        => $mailSubType,
                'express_company'      => $sfWaybillNo ? '顺丰速运' : '',
                'express_sn'           => $sfWaybillNo
            ]
        ];
    }

    /**
     * 用户填报/修改寄出物流单号 (邮寄回收模式，支持会员与免密手机号核验)
     */
    public function submitExpress(int $orderId, int $userId, string $company, string $sn, string $orderSn = '', string $mobile = ''): array
    {
        $order = null;
        if ($orderId > 0) {
            $order = $this->orderModel->findById($orderId);
        } elseif (!empty($orderSn)) {
            $order = $this->orderModel->findBySn($orderSn);
        }

        if (!$order) {
            return ['code' => 404, 'msg' => '订单不存在'];
        }

        // 安全身份鉴权：已登录用户核验 user_id，游客查单核验手机号
        if ($userId > 0) {
            if ((int)$order['user_id'] !== $userId) {
                return ['code' => 403, 'msg' => '无权操作此订单'];
            }
        } elseif (!empty($mobile)) {
            if ($order['contact_mobile'] !== $mobile) {
                return ['code' => 403, 'msg' => '手机号码核验不一致，无法操作'];
            }
        } else {
            return ['code' => 401, 'msg' => '请先登录或核验手机号'];
        }

        // 允许在待寄出(pending_send)与运输中(in_transit)录入或修改单号，若已签收/质检中/已完成则锁定
        if (!in_array($order['status'], ['pending_send', 'in_transit'], true)) {
            return ['code' => 400, 'msg' => '当前订单已签收或已进入质检流程，不可修改寄件单号'];
        }

        $cleanSn = trim($sn);
        if (empty($cleanSn)) {
            return ['code' => 400, 'msg' => '快递单号不能为空'];
        }

        $cleanCompany = trim($company);
        if (empty($cleanCompany)) {
            $cleanCompany = '顺丰速运';
        }

        $ok = $this->orderModel->updateStatus((int)$order['id'], 'in_transit', [
            'express_company' => $cleanCompany,
            'express_sn'      => $cleanSn
        ]);

        return $ok ? ['code' => 200, 'msg' => '快递单号已提交更新，平台正在追踪物流'] : ['code' => 500, 'msg' => '提交失败，请稍后重试'];
    }

    /**
     * 客服针对质检差价发起在线协商还价与专享补贴红包
     */
    public function proposeNegotiation(int $orderId, float $subsidyAmount, string $remark, int $adminId = 1): array
    {
        $order = $this->orderModel->findById($orderId);
        if (!$order) {
            return ['code' => 404, 'msg' => '订单不存在'];
        }

        if ($order['status'] !== 'price_confirming') {
            return ['code' => 400, 'msg' => '只有处于差价协商中的订单才可以发起协商补贴'];
        }

        if ($subsidyAmount < 0) {
            return ['code' => 400, 'msg' => '协商补贴金额不能为负数'];
        }

        $cleanRemark = trim($remark);
        if (empty($cleanRemark)) {
            $cleanRemark = "针对质检轻微成色差异，平台特为您向主管申请了 ¥{$subsidyAmount} 专享协商红包！";
        }

        $ok = $this->orderModel->proposeNegotiation($orderId, $subsidyAmount, $cleanRemark);
        if ($ok) {
            $proposedPrice = round((float)$order['final_price'] + $subsidyAmount, 2);
            (new AuthService())->logAdminAction($adminId, 'propose_negotiation', "为订单 [{$order['order_sn']}] 发起协商补贴 ¥{$subsidyAmount}，最终建议价 ¥{$proposedPrice}，留言: {$cleanRemark}");
            return [
                'code' => 200,
                'msg'  => '协商方案已成功发起，等待用户在线确认！',
                'data' => [
                    'order_id'       => $orderId,
                    'subsidy_amount' => $subsidyAmount,
                    'remark'         => $cleanRemark,
                    'proposed_price' => $proposedPrice
                ]
            ];
        }

        return ['code' => 500, 'msg' => '发起协商方案失败，请稍后重试'];
    }

    /**
     * 用户对质检差价报告或客服协商补贴做出决策 (同意成交 或 申请退货寄回)
     */
    public function userDecision(int $orderId, int $userId, string $decision, string $orderSn = '', string $mobile = ''): array
    {
        $order = null;
        if ($orderId > 0) {
            $order = $this->orderModel->findById($orderId);
        } elseif (!empty($orderSn)) {
            $order = $this->orderModel->findBySn($orderSn);
        }

        if (!$order) {
            return ['code' => 404, 'msg' => '订单不存在'];
        }

        // 身份核验：若提供 userId 或 mobile 则进行安全校验
        if ($userId > 0 && (int)$order['user_id'] !== $userId) {
            return ['code' => 403, 'msg' => '无权操作该订单'];
        }
        if (!empty($mobile) && $order['contact_mobile'] !== $mobile) {
            return ['code' => 403, 'msg' => '手机号码核验失败，无法操作该订单'];
        }

        if ($order['status'] !== 'price_confirming') {
            return ['code' => 400, 'msg' => '当前订单无需确认差价或已被确认'];
        }

        $orderId = (int)$order['id'];
        $subsidy = (float)($order['subsidy_amount'] ?? 0);
        $hasNegotiation = ($order['negotiation_status'] ?? 'none') === 'pending' && $subsidy > 0;

        if ($decision === 'agree') {
            $extra = [];
            $finalPrice = (float)$order['final_price'];
            if ($hasNegotiation) {
                // 如果用户接受客服协商补贴：最终成交价 = 质检判定价 + 专享补贴
                $finalPrice = round($finalPrice + $subsidy, 2);
                $extra['final_price'] = $finalPrice;
                $extra['negotiation_status'] = 'accepted';
            }

            // 用户同意成交 -> 状态流转为待打款
            $this->orderModel->updateStatus($orderId, 'completed', $extra);

            $msg = $hasNegotiation
                ? "您已同意协商方案并享受 ¥{$subsidy} 专享补贴，成交价已提升至 ¥{$finalPrice}，系统将安排为您打款！"
                : "您已确认质检价格，系统将安排为您打款！";

            return [
                'code' => 200,
                'msg'  => $msg,
                'data' => [
                    'order_id'    => $orderId,
                    'final_price' => $finalPrice
                ]
            ];
        } elseif ($decision === 'reject') {
            // 用户拒绝质检价/协商方案 -> 申请退货
            $extra = [];
            if ($hasNegotiation) {
                $extra['negotiation_status'] = 'rejected';
            }
            $this->orderModel->updateStatus($orderId, 'refunded', $extra);
            return ['code' => 200, 'msg' => '您已拒绝差价，平台将为您安排原机原路寄回'];
        }

        return ['code' => 400, 'msg' => '无效的操作指令'];
    }

    /**
     * 为已有回收订单调用顺丰速运生成面单并预约揽件 (支持后台管理一键触发或重试)
     */
    public function callSfExpress(int $orderId): array
    {
        $order = $this->orderModel->findById($orderId);
        if (!$order) {
            return ['code' => 404, 'msg' => '回收订单不存在'];
        }

        if ($order['fulfillment_type'] !== 'mail') {
            return ['code' => 400, 'msg' => '该订单非快速寄送履约模式，无需呼叫顺丰速运'];
        }

        $sfService = new SfExpressService();
        if (!$sfService->isEnabled()) {
            return ['code' => 400, 'msg' => '顺丰速运接口当前处于关闭状态，请先在【系统设置】中开启并配置顺丰参数'];
        }
        if (!$sfService->isConfigured()) {
            return ['code' => 400, 'msg' => '顺丰顾客编码(partnerID)或校验码(checkWord)未配置完整'];
        }

        $res = $sfService->createOrder($order);
        if ($res['code'] === 200 && !empty($res['data']['waybill_no'])) {
            $waybillNo = $res['data']['waybill_no'];
            $this->orderModel->updateStatus($orderId, $order['status'], [
                'express_company' => '顺丰速运',
                'express_sn'      => $waybillNo
            ]);
            return [
                'code' => 200,
                'msg'  => '顺丰速运下单揽件成功！单号：' . $waybillNo,
                'data' => [
                    'waybill_no'       => $waybillNo,
                    'express_company'  => '顺丰速运',
                    'route_label_info' => $res['data']['route_label_info'] ?? null
                ]
            ];
        }

        return [
            'code' => $res['code'] ?: 500,
            'msg'  => $res['msg'] ?: '顺丰速运下单失败',
            'data' => $res['data'] ?? null
        ];
    }
}
