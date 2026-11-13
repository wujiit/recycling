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
    public const BIZ_RECYCLE = 'recycle';
    public const BIZ_SERVICE = 'service';
    public const BIZ_ERRAND  = 'errand';

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
     * 获取指定业务板块的状态字典
     */
    public static function getStatusDefinitions(string $bizType = self::BIZ_RECYCLE): array
    {
        switch ($bizType) {
            case self::BIZ_SERVICE:
                return [
                    'pending_pay'      => '待支付',
                    'pending_dispatch' => '待派单',
                    'dispatched'       => '已派单/待上门',
                    'in_service'       => '上门服务中',
                    'completed'        => '服务已完成',
                    'cancelled'        => '已取消',
                    'refunded'         => '已退款'
                ];
            case self::BIZ_ERRAND:
                return [
                    'pending_pay'      => '待支付',
                    'pending_dispatch' => '待骑手接单',
                    'dispatched'       => '已接单赶往中',
                    'in_service'       => '配送服务中',
                    'completed'        => '跑腿已送达',
                    'cancelled'        => '已取消',
                    'refunded'         => '已退款'
                ];
            case self::BIZ_RECYCLE:
            default:
                return [
                    'pending_send'     => '待寄出/待到店',
                    'in_transit'       => '物流运输中',
                    'received'         => '已签收待质检',
                    'inspecting'       => '质检复核中',
                    'price_confirming' => '差价协商中',
                    'completed'        => '已成交已放款',
                    'cancelled'        => '已取消',
                    'refunded'         => '已退货'
                ];
        }
    }

    /**
     * 获取状态中文友好展示文案
     */
    public static function getStatusText(string $status, string $bizType = self::BIZ_RECYCLE): string
    {
        $defs = self::getStatusDefinitions($bizType);
        return $defs[$status] ?? $status;
    }

    /**
     * 用户端提交综合服务/回收订单 (支持业务板块解耦、在线支付流向与加价券核验)
     */
    public function createOrder(int $userId, int $deviceId, array $selectedItemIds, string $fulfillmentType, array $contact, string $appraisalMode = 'custom', string $quickTierId = '', string $mailSubType = '', int $userCouponId = 0, string $bizType = self::BIZ_RECYCLE): array
    {
        // 业务板块与正向支付参数安全解耦 (优先读取 contact 中指定的覆盖配置)
        $bizType = !empty($contact['biz_type']) ? (string)$contact['biz_type'] : $bizType;
        $payType = (string)($contact['pay_type'] ?? 'none');

        // 验证履约模式有效性
        if (!in_array($fulfillmentType, ['mail', 'store', 'home'], true)) {
            return ['code' => 400, 'msg' => '不支持的履约服务模式'];
        }

        $couponId = 0;
        $couponAddPrice = 0.00;

        if ($bizType === self::BIZ_SERVICE || $bizType === self::BIZ_ERRAND) {
            // 同城生活服务板块：根据 service_id 检索服务项目与规格
            $serviceModel = new \App\Model\ServiceModel();
            $serviceItem = $serviceModel->getItemById($deviceId, true);
            if (!$serviceItem || (int)($serviceItem['status'] ?? 0) !== 1) {
                return ['code' => 400, 'msg' => '所选生活服务项目不存在或已下架'];
            }

            $deviceName = $serviceItem['title'];
            $selectedSpecId = (int)($contact['spec_id'] ?? 0);
            $servicePrice = (float)$serviceItem['price'];
            $specName = '';

            if (!empty($serviceItem['specs'])) {
                foreach ($serviceItem['specs'] as $sp) {
                    if ($selectedSpecId > 0 && (int)$sp['id'] === $selectedSpecId) {
                        $servicePrice = (float)$sp['spec_price'];
                        $specName = $sp['spec_name'];
                        break;
                    } elseif ($selectedSpecId <= 0 && !empty($sp['is_default'])) {
                        $servicePrice = (float)$sp['spec_price'];
                        $specName = $sp['spec_name'];
                        break;
                    }
                }
            }

            $estimatePrice = $servicePrice;
            $payPrice = (isset($contact['pay_price']) && (float)$contact['pay_price'] >= 0.00) 
                ? (float)$contact['pay_price'] 
                : $servicePrice;
            $quickTierName = $specName ?: ($serviceItem['price_unit'] ?? '次');
            $snapshotItems = [
                [
                    'question_id'    => 0,
                    'question_title' => '服务项目与规格',
                    'id'             => $serviceItem['id'],
                    'name'           => $serviceItem['title'] . ($specName ? " 【{$specName}】" : ""),
                    'deduct_amount'  => $servicePrice
                ]
            ];
            $mailSubType = '';
        } else {
            // 二手回收板块走机型库与问答初评
            $device = $this->deviceModel->getDeviceById($deviceId);
            if (!$device) {
                return ['code' => 400, 'msg' => '评估机型不存在'];
            }
            $deviceName = $device['name'];

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

            $pricingResult = $this->calculateOrderPricing($deviceId, $appraisalMode, $quickTierId, $selectedItemIds);
            if ($pricingResult['code'] !== 200) {
                return $pricingResult;
            }
            $estimatePrice = $pricingResult['estimate_price'];
            $snapshotItems = $pricingResult['snapshot_items'];
            $quickTierName = $pricingResult['quick_tier_name'];
            $payPrice = (float)($contact['pay_price'] ?? 0.00);

            if ($userCouponId <= 0 && !empty($contact['user_coupon_id'])) {
                $userCouponId = (int)$contact['user_coupon_id'];
            }

            // 校验并核算加价券补贴金额 (服务端严密核验防篡改)
            if ($userCouponId > 0 && $userId > 0) {
                $couponService = new CouponService();
                $couponRes = $couponService->validateAndApply($userCouponId, $userId, (float)$estimatePrice, (int)$device['category_id']);
                if ($couponRes['code'] !== 200) {
                    return $couponRes;
                }
                $couponId = (int)$couponRes['data']['coupon_id'];
                $couponAddPrice = (float)$couponRes['data']['add_price'];
            }
        }

        // 生成高唯一性订单号 (依据板块前缀区分: 回收 RC, 上门服务 SV, 跑腿 ER)
        $prefixMap = [self::BIZ_RECYCLE => 'RC', self::BIZ_SERVICE => 'SV', self::BIZ_ERRAND => 'ER'];
        $snPrefix = $prefixMap[$bizType] ?? 'RC';
        $orderSn = Str::generateSn($snPrefix);

        // 提取客户指定的收款方式与账号 (回收板块专享)
        $payoutType = (string)($contact['payout_type'] ?? 'alipay');
        $payoutName = (string)($contact['payout_name'] ?? '');
        $payoutAccount = (string)($contact['payout_account'] ?? '');
        $payoutBank = (string)($contact['payout_bank'] ?? '');

        // 提取门店自送信息并自动关联保障
        list($storeId, $storeName) = $this->resolveOrderStore($fulfillmentType, $contact);

        $orderData = [
            'order_sn'          => $orderSn,
            'biz_type'          => $bizType,
            'user_id'           => $userId,
            'device_id'         => $deviceId,
            'device_name'       => $deviceName,
            'estimate_price'    => $estimatePrice,
            'coupon_id'         => $couponId,
            'user_coupon_id'    => $userCouponId,
            'coupon_add_price'  => $couponAddPrice,
            'appraisal_mode'    => $appraisalMode,
            'quick_tier_name'   => $quickTierName,
            'fulfillment_type'  => $fulfillmentType,
            'mail_sub_type'     => $mailSubType,
            'store_id'          => $storeId,
            'store_name'        => $storeName,
            'payout_type'       => $payoutType,
            'payout_name'       => $payoutName,
            'payout_account'    => $payoutAccount,
            'payout_bank'       => $payoutBank,
            'pay_type'          => $payType,
            'pay_price'         => $payPrice,
            'technician_id'     => (int)($contact['technician_id'] ?? 0),
            'technician_name'   => trim((string)($contact['technician_name'] ?? '')),
            'technician_mobile' => trim((string)($contact['technician_mobile'] ?? '')),
            'contact_name'      => $contact['name'] ?? '',
            'contact_mobile'    => $contact['mobile'] ?? '',
            'contact_address'   => $contact['address'] ?? '',
            'appointment_time'  => $contact['appointment_time'] ?? '',
            'user_remark'       => $contact['remark'] ?? '',
            'custom_fields'     => $contact['custom_fields'] ?? null,
        ];

        $errorMsg = '';
        $createdSn = $this->orderModel->createOrderWithSnapshot($orderData, $snapshotItems, $errorMsg);
        if (!$createdSn) {
            return ['code' => 400, 'msg' => $errorMsg ?: '订单创建失败，请稍后重试'];
        }

        // 联动顺丰速运接口：仅限回收类邮寄揽件
        $sfWaybillNo = '';
        if ($bizType === self::BIZ_RECYCLE) {
            $sfWaybillNo = $this->dispatchSfPickupIfRequired($orderData, $orderSn, $fulfillmentType, $mailSubType);
        }

        $initialStatus = ($bizType === self::BIZ_SERVICE || $bizType === self::BIZ_ERRAND)
            ? ($payPrice > 0.00 && $payType !== 'offline' ? 'pending_pay' : 'pending_dispatch')
            : 'pending_send';

        return [
            'code' => 200,
            'msg'  => '下单成功',
            'data' => [
                'order_sn'             => $orderSn,
                'biz_type'             => $bizType,
                'estimate_price'       => $estimatePrice,
                'pay_price'            => $payPrice,
                'coupon_add_price'     => $couponAddPrice,
                'total_estimate_price' => round($estimatePrice + $couponAddPrice, 2),
                'status'               => $initialStatus,
                'status_text'          => self::getStatusText($initialStatus, $bizType),
                'fulfillment_type'     => $fulfillmentType,
                'mail_sub_type'        => $mailSubType,
                'express_company'      => $sfWaybillNo ? '顺丰速运' : '',
                'express_sn'           => $sfWaybillNo
            ]
        ];
    }

    /**
     * 服务端安全核算预估成交价格与初评快照 (防止前端篡改)
     */
    private function calculateOrderPricing(int $deviceId, string $appraisalMode, string $quickTierId, array $selectedItemIds): array
    {
        $quickTierName = '';
        if ($appraisalMode === 'quick' && !empty($quickTierId)) {
            $priceRes = $this->pricingService->calculateQuickTierPrice($deviceId, $quickTierId);
            if ($priceRes['code'] !== 200) {
                return $priceRes;
            }
            return [
                'code'            => 200,
                'estimate_price'  => $priceRes['data']['estimate_price'],
                'snapshot_items'  => $priceRes['data']['breakdown'],
                'quick_tier_name' => $priceRes['data']['quick_tier']['name'] ?? '标准成色'
            ];
        } else {
            $priceRes = $this->pricingService->calculateEstimatePrice($deviceId, $selectedItemIds);
            if ($priceRes['code'] !== 200) {
                return $priceRes;
            }
            return [
                'code'            => 200,
                'estimate_price'  => $priceRes['data']['estimate_price'],
                'snapshot_items'  => $priceRes['data']['breakdown'],
                'quick_tier_name' => ''
            ];
        }
    }

    /**
     * 门店自送模式下安全解析归属服务网点
     */
    private function resolveOrderStore(string $fulfillmentType, array $contact): array
    {
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
        return [$storeId, $storeName];
    }

    /**
     * 邮寄上门取件模式自动联动预约顺丰揽件
     */
    private function dispatchSfPickupIfRequired(array $orderData, string $orderSn, string $fulfillmentType, string $mailSubType): string
    {
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
        return $sfWaybillNo;
    }

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

        // 安全身份鉴权：已登录用户核验 user_id，免密查单必须提供完整准确的预留手机号
        if ($userId > 0) {
            if ((int)$order['user_id'] !== $userId) {
                return ['code' => 403, 'msg' => '无权操作此订单'];
            }
        } elseif (!empty($mobile)) {
            $isExactMatch = ($order['contact_mobile'] === $mobile);
            if (!$isExactMatch) {
                return ['code' => 403, 'msg' => '手机号码核验不一致，无法操作'];
            }
        } else {
            return ['code' => 401, 'msg' => '请先登录或输入下单预留的完整手机号进行验证'];
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

        // 身份严格核验：必须满足 (已登录且为订单所有者) 或 (输入下单预留的完整真实手机号)
        if ($userId > 0) {
            if ((int)$order['user_id'] !== $userId) {
                return ['code' => 403, 'msg' => '无权操作该订单'];
            }
        } elseif (!empty($mobile)) {
            $isExactMatch = ($order['contact_mobile'] === $mobile);
            if (!$isExactMatch) {
                return ['code' => 403, 'msg' => '手机号码核验失败，无法操作该订单'];
            }
        } else {
            return ['code' => 401, 'msg' => '请先登录或输入下单预留的完整手机号进行身份核验'];
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

    /**
     * 为上门生活服务/同城跑腿订单分配派发师傅/技术人员
     */
    public function dispatchTechnician(int $orderId, int $technicianId, string $technicianName, string $technicianMobile, int $adminId = 1): array
    {
        $order = $this->orderModel->findById($orderId);
        if (!$order) {
            return ['code' => 404, 'msg' => '订单不存在'];
        }

        if (in_array($order['status'], ['completed', 'cancelled', 'refunded'], true)) {
            return ['code' => 400, 'msg' => '当前订单状态不允许重新派单'];
        }

        $cleanName = trim($technicianName);
        $cleanMobile = trim($technicianMobile);
        if (empty($cleanName) || empty($cleanMobile)) {
            return ['code' => 400, 'msg' => '师傅姓名与联系电话不能为空'];
        }

        $ok = $this->orderModel->updateStatus($orderId, 'dispatched', [
            'technician_id'     => $technicianId,
            'technician_name'   => $cleanName,
            'technician_mobile' => $cleanMobile
        ]);

        if ($ok) {
            (new AuthService())->logAdminAction($adminId, 'dispatch_technician', "为订单 [{$order['order_sn']}] 分配师傅: {$cleanName} ({$cleanMobile})");
            return [
                'code' => 200,
                'msg'  => "派单成功，师傅 [{$cleanName}] 已指派！",
                'data' => [
                    'order_id'          => $orderId,
                    'status'            => 'dispatched',
                    'technician_id'     => $technicianId,
                    'technician_name'   => $cleanName,
                    'technician_mobile' => $cleanMobile
                ]
            ];
        }

        return ['code' => 500, 'msg' => '派单失败，请稍后重试'];
    }

    /**
     * 师傅开始上门作业服务
     */
    public function startService(int $orderId, int $technicianId = 0): array
    {
        $order = $this->orderModel->findById($orderId);
        if (!$order) {
            return ['code' => 404, 'msg' => '订单不存在'];
        }
        if ($order['status'] !== 'dispatched') {
            return ['code' => 400, 'msg' => '只有已派单状态的订单才能开始服务'];
        }

        $ok = $this->orderModel->updateStatus($orderId, 'in_service', [
            'service_start_time' => time()
        ]);

        return $ok ? ['code' => 200, 'msg' => '服务已正式开始，进入作业状态'] : ['code' => 500, 'msg' => '操作失败，请重试'];
    }

    /**
     * 服务完成核销与凭证归档
     */
    public function finishService(int $orderId, array $serviceImages = [], string $notes = '', int $adminId = 0): array
    {
        $order = $this->orderModel->findById($orderId);
        if (!$order) {
            return ['code' => 404, 'msg' => '订单不存在'];
        }
        if (!in_array($order['status'], ['dispatched', 'in_service'], true)) {
            return ['code' => 400, 'msg' => '当前订单状态不允许核销完工'];
        }

        $extra = [
            'service_finish_time' => time(),
            'service_images'      => $serviceImages
        ];
        if (!empty($notes)) {
            $extra['user_remark'] = trim(($order['user_remark'] ?? '') . ' 【完工备注: ' . $notes . '】');
        }

        $ok = $this->orderModel->updateStatus($orderId, 'completed', $extra);
        if ($ok) {
            if ($adminId > 0) {
                (new AuthService())->logAdminAction($adminId, 'finish_service', "核销完工订单 [{$order['order_sn']}]");
            }
            return ['code' => 200, 'msg' => '服务已完工核销并归档！'];
        }

        return ['code' => 500, 'msg' => '完工核销失败，请稍后重试'];
    }
}
