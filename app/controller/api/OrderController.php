<?php
/**
 * 启灵同城服务系统 - 客户端订单控制器
 * 负责回收单创建、用户订单列表查询、状态详情与取消
 */

namespace App\Controller\Api;

use App\Controller\Controller;
use App\Common\Request;
use App\Service\AuthService;
use App\Service\OrderService;
use App\Model\OrderModel;
use App\Model\InspectionModel;
use App\Helper\Str;

class OrderController extends Controller
{
    private $authService;
    private $orderService;
    private $orderModel;
    private $inspectionModel;

    public function __construct()
    {
        $this->authService = new AuthService();
        $this->orderService = new OrderService();
        $this->orderModel = new OrderModel();
        $this->inspectionModel = new InspectionModel();
    }

    private function getAuthedUser(): array
    {
        $token = (string)Request::get('token', Request::post('token', ''));
        if (empty($token)) {
            $this->error('用户尚未登录，请先登录', 401);
        }
        $user = $this->authService->checkUserToken($token);
        if (!$user) {
            $this->error('登录态已失效，请重新登录', 401);
        }
        return $user;
    }

    /**
     * 提交回收订单 (支持上门/到店/邮寄，支持自动免密建单注册)
     */
    public function create(): void
    {
        $deviceId = Request::postInt('service_id', Request::postInt('device_id', 0));
        $itemIds = Request::post('item_ids', []);
        $fulfillmentType = (string)Request::post('fulfillment_type', 'home');
        $mailSubType = trim((string)Request::post('mail_sub_type', ''));
        $bizType = (string)Request::post('biz_type', 'recycle');
        $contact = Request::post('contact', []);
        if (!is_array($contact)) {
            $contact = [];
        }
        $contact['biz_type'] = $bizType;

        // 兼容支持生活服务单扁平参数传递
        if (empty($contact['name']) && Request::post('contact_name')) {
            $contact['name'] = trim((string)Request::post('contact_name'));
        }
        if (empty($contact['mobile']) && Request::post('contact_mobile')) {
            $contact['mobile'] = trim((string)Request::post('contact_mobile'));
        }
        if (empty($contact['address']) && Request::post('contact_address')) {
            $contact['address'] = trim((string)Request::post('contact_address'));
        }
        if (empty($contact['appointment_time']) && Request::post('appointment_time')) {
            $contact['appointment_time'] = trim((string)Request::post('appointment_time'));
        }
        if (empty($contact['user_remark']) && Request::post('user_remark')) {
            $contact['user_remark'] = trim((string)Request::post('user_remark'));
        }

        if (!empty($mailSubType)) {
            $contact['mail_sub_type'] = $mailSubType;
        }

        // 支持生活服务规格 ID
        if (Request::post('spec_id')) {
            $contact['spec_id'] = Request::postInt('spec_id', 0);
        }

        // 支持行业自定义表单字段
        if (Request::post('custom_fields')) {
            $contact['custom_fields'] = Request::post('custom_fields');
        }

        // 提取并校验收款结算方式 (仅限回收业务：平台需向客户发放回收款)
        $payoutType = (string)Request::post('payout_type', $contact['payout_type'] ?? 'alipay');
        $payoutName = trim((string)Request::post('payout_name', $contact['payout_name'] ?? ''));
        $payoutAccount = trim((string)Request::post('payout_account', $contact['payout_account'] ?? ''));
        $payoutBank = trim((string)Request::post('payout_bank', $contact['payout_bank'] ?? ''));

        if ($bizType === 'recycle' && in_array($payoutType, ['alipay', 'bank', 'wechat'], true) && empty($payoutAccount)) {
            $typeLabels = ['alipay' => '支付宝', 'bank' => '银行卡', 'wechat' => '微信'];
            $this->error('请填写您的' . ($typeLabels[$payoutType] ?? '收款') . '账号，以便核定后为您打款');
        }

        $contact['payout_type'] = $payoutType;
        $contact['payout_name'] = $payoutName;
        $contact['payout_account'] = $payoutAccount;
        $contact['payout_bank'] = $payoutBank;

        // 提取门店自送网点字段
        $contact['store_id'] = (int)Request::post('store_id', $contact['store_id'] ?? 0);
        $contact['store_name'] = trim((string)Request::post('store_name', $contact['store_name'] ?? ''));

        if ($deviceId <= 0) {
            $this->error('机型参数错误');
        }
        if (empty($contact['name']) || empty($contact['mobile'])) {
            $this->error('请填写完整的联系人姓名与手机号');
        }

        $token = (string)Request::get('token', Request::post('token', ''));
        $user = null;
        if (!empty($token)) {
            $user = $this->authService->checkUserToken($token);
        }
        $newToken = null;
        if (!$user) {
            // 校验平台是否允许免登录游客直接填手机号下单
            if (!$this->authService->isConfigEnabled('user_order_guest_enabled', true)) {
                $this->error('平台已开启会员交易保护，请先登录账号后再提交订单', 401);
            }

            $mobile = trim((string)($contact['mobile'] ?? ''));
            if (!preg_match('/^1[3-9]\d{9}$/', $mobile)) {
                $this->error('请填写正确的11位联系电话');
            }
            $authRes = $this->authService->loginOrRegisterByMobile($mobile, (string)($contact['name'] ?? ''));
            if ($authRes['code'] !== 200) {
                $this->error($authRes['msg'], $authRes['code']);
            }
            $user = $authRes['data']['userinfo'];
            $newToken = $authRes['data']['token'];
        }

        $appraisalMode = (string)Request::post('appraisal_mode', 'custom');
        $quickTierId = trim((string)Request::post('quick_tier_id', ''));
        $userCouponId = Request::postInt('user_coupon_id', (int)($contact['user_coupon_id'] ?? 0));

        // 在线支付与金额参数支持
        if (Request::post('pay_type')) {
            $contact['pay_type'] = (string)Request::post('pay_type');
        }
        if (Request::post('pay_price') !== null) {
            $contact['pay_price'] = (float)Request::post('pay_price');
        }

        $res = $this->orderService->createOrder((int)$user['id'], $deviceId, (array)$itemIds, $fulfillmentType, $contact, $appraisalMode, $quickTierId, $mailSubType, $userCouponId, $bizType);
        if ($res['code'] === 200) {
            if ($newToken) {
                $res['data']['token'] = $newToken;
                $res['data']['userinfo'] = $user;
            }
            $this->success($res['data'], $res['msg']);
        } else {
            $this->error($res['msg'], $res['code']);
        }
    }

    /**
     * 免密根据手机号查询回收/生活服务订单进度 (Web端查单极速入口，严格执行 PII 隐私脱敏)
     */
    public function queryByMobile(): void
    {
        $mobile = trim((string)Request::get('mobile', Request::post('mobile', '')));
        $bizType = (string)Request::get('biz_type', Request::post('biz_type', 'all'));
        if (!preg_match('/^1[3-9]\d{9}$/', $mobile)) {
            $this->error('请输入正确的11位手机号码');
        }
        $orders = $this->orderModel->getOrdersByMobile($mobile, 20, $bizType);

        // 规范 40: 免密公共查询数据脱敏中间层 (PII Data Normalizer)
        foreach ($orders as &$order) {
            $order['contact_name'] = Str::maskName($order['contact_name'] ?? '');
            $order['contact_mobile'] = Str::maskMobile($order['contact_mobile'] ?? '');
            $order['contact_address'] = Str::maskAddress($order['contact_address'] ?? '');
            $order['payout_name'] = Str::maskName($order['payout_name'] ?? '');
            $order['payout_account'] = Str::maskAccount($order['payout_account'] ?? '');
            if (!empty($order['technician_mobile'])) {
                $order['technician_mobile'] = Str::maskMobile($order['technician_mobile']);
            }
            $order['status_text'] = OrderService::getStatusText($order['status'] ?? '', $order['biz_type'] ?? 'recycle');
        }
        unset($order);

        $this->success($orders, '查询订单进度成功');
    }

    /**
     * 获取我的订单列表 (支持按业务板块与状态过滤)
     */
    public function list(): void
    {
        $user = $this->getAuthedUser();
        $status = Request::get('status', 'all');
        $bizType = (string)Request::get('biz_type', 'all');
        $page = Request::getInt('page', 1);

        $orders = $this->orderModel->getUserOrders((int)$user['id'], $status, $page, 10, $bizType);
        foreach ($orders as &$order) {
            $order['status_text'] = OrderService::getStatusText($order['status'] ?? '', $order['biz_type'] ?? 'recycle');
        }
        unset($order);
        $this->success($orders, '获取订单成功');
    }

    /**
     * 查看订单详情 (包含质检报告与通用业务状态解析)
     */
    public function detail(): void
    {
        $user = $this->getAuthedUser();
        $orderSn = (string)Request::get('order_sn', '');
        if (empty($orderSn)) {
            $this->error('订单号不能为空');
        }

        $order = $this->orderModel->findBySn($orderSn);
        if (!$order || (int)$order['user_id'] !== (int)$user['id']) {
            $this->error('订单不存在', 404);
        }

        $order['status_text'] = OrderService::getStatusText($order['status'] ?? '', $order['biz_type'] ?? 'recycle');

        // 若处于质检后状态，附带质检报告
        $inspection = null;
        if (in_array($order['status'], ['price_confirming', 'completed', 'refunded'], true)) {
            $inspection = $this->inspectionModel->getByOrderId((int)$order['id']);
        }
        $order['inspection_report'] = $inspection;

        $this->success($order, '获取订单详情成功');
    }

    /**
     * 用户填写/修改寄件快递单号 (支持已登录会员与免密查单用户)
     */
    public function submitExpress(): void
    {
        $orderId = Request::postInt('order_id', 0);
        $orderSn = trim((string)Request::post('order_sn', ''));
        $mobile = trim((string)Request::post('mobile', ''));
        $company = trim((string)Request::post('express_company', '顺丰速运'));
        $sn = trim((string)Request::post('express_sn', ''));

        $userId = 0;
        try {
            $token = (string)Request::get('token', Request::post('token', ''));
            if (!empty($token)) {
                $user = $this->authService->checkUserToken($token);
                if ($user && !empty($user['id'])) {
                    $userId = (int)$user['id'];
                }
            }
        } catch (\Throwable $e) {}

        $res = $this->orderService->submitExpress($orderId, $userId, $company, $sn, $orderSn, $mobile);
        if ($res['code'] === 200) {
            $this->success(null, $res['msg']);
        } else {
            $this->error($res['msg'], $res['code']);
        }
    }

    /**
     * 用户确认质检价/接受协商补贴 或 申请退货寄回
     */
    public function confirmPrice(): void
    {
        $orderId = Request::postInt('order_id', 0);
        $orderSn = trim((string)Request::post('order_sn', ''));
        $mobile = trim((string)Request::post('mobile', ''));
        $decision = (string)Request::post('decision', 'agree'); // agree 或 reject

        // 尝试获取登录会员ID，未登录则依靠手机号或单号鉴权
        $userId = 0;
        try {
            $user = $this->getAuthedUser();
            if ($user && !empty($user['id'])) {
                $userId = (int)$user['id'];
            }
        } catch (\Throwable $e) {}

        $res = $this->orderService->userDecision($orderId, $userId, $decision, $orderSn, $mobile);
        if ($res['code'] === 200) {
            $this->success($res['data'] ?? null, $res['msg']);
        } else {
            $this->error($res['msg'], $res['code']);
        }
    }
}
