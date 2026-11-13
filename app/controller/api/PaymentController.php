<?php
/**
 * 启灵同城生活服务系统 - 统一收银台与在线支付控制器
 * 负责收银台信息查询、发起支付预下单、订单支付轮询与第三方异步回调
 * 编码：UTF-8 无 BOM
 */

namespace App\Controller\Api;

use App\Controller\Controller;
use App\Common\Request;
use App\Common\Response;
use App\Service\PaymentService;

class PaymentController extends Controller
{
    private $paymentService;

    public function __construct()
    {
        $this->paymentService = new PaymentService();
    }

    /**
     * 获取订单收银台详情
     * GET /api/payment/cashier?order_sn=SVxxxx
     */
    public function cashier(): void
    {
        $orderSn = trim((string)Request::get('order_sn', Request::post('order_sn', '')));
        if (empty($orderSn)) {
            $this->error('订单号不能为空');
        }

        $res = $this->paymentService->getCashierInfo($orderSn);
        if ($res['code'] === 200) {
            $this->success($res['data'], '获取收银台信息成功');
        } else {
            $this->error($res['msg'], $res['code']);
        }
    }

    /**
     * 发起支付预下单
     * POST /api/payment/create
     * 参数：
     * - order_sn: 订单号
     * - channel: wechat / alipay / mock
     * - pay_mode: miniapp / jsapi / native / h5 / wap
     * - openid: 微信小程序/公众号支付必填
     * - return_url: 支付完成后同步返回页面地址 (选填)
     */
    public function create(): void
    {
        $orderSn = trim((string)Request::post('order_sn', Request::get('order_sn', '')));
        $channel = trim((string)Request::post('channel', Request::post('pay_type', Request::get('channel', 'wechat'))));
        $payMode = trim((string)Request::post('pay_mode', Request::get('pay_mode', 'miniapp')));
        $openid = trim((string)Request::post('openid', ''));
        $returnUrl = trim((string)Request::post('return_url', ''));

        if (empty($orderSn)) {
            $this->error('订单号不能为空');
        }

        $params = [
            'openid'     => $openid,
            'return_url' => $returnUrl
        ];

        $res = $this->paymentService->createPayment($orderSn, $channel, $payMode, $params);
        if ($res['code'] === 200) {
            $this->success($res['data'] ?? null, $res['msg']);
        } else {
            $this->error($res['msg'], $res['code']);
        }
    }

    /**
     * 轮询核验订单支付状态
     * GET /api/payment/check?order_sn=SVxxxx
     */
    public function check(): void
    {
        $orderSn = trim((string)Request::get('order_sn', Request::post('order_sn', '')));
        if (empty($orderSn)) {
            $this->error('订单号不能为空');
        }

        $res = $this->paymentService->checkPaymentStatus($orderSn);
        if ($res['code'] === 200) {
            $this->success($res['data'], '查询支付状态成功');
        } else {
            $this->error($res['msg'], $res['code']);
        }
    }

    /**
     * 开发/沙箱环境快速模拟支付
     * POST /api/payment/mockPay
     */
    public function mockPay(): void
    {
        $orderSn = trim((string)Request::post('order_sn', Request::get('order_sn', '')));
        if (empty($orderSn)) {
            $this->error('订单号不能为空');
        }

        if (!$this->paymentService->isDevMockEnabled()) {
            $this->error('当前环境已禁止使用模拟支付', 403);
        }

        $res = $this->paymentService->createPayment($orderSn, 'mock');
        if ($res['code'] === 200) {
            $this->success($res['data'] ?? null, $res['msg']);
        } else {
            $this->error($res['msg'], $res['code']);
        }
    }

    /**
     * 微信支付官方 API v3 异步通知回调
     * POST /api/payment/notifyWechat
     */
    public function notifyWechat(): void
    {
        $rawBody = (string)file_get_contents('php://input');
        $headers = function_exists('getallheaders') ? getallheaders() : [];

        $res = $this->paymentService->handleWechatNotify($rawBody, $headers);

        if (!headers_sent()) {
            header('Content-Type: application/json; charset=utf-8');
            http_response_code($res['code'] === 200 ? 200 : 400);
        }

        if ($res['code'] === 200) {
            echo json_encode(['code' => 'SUCCESS', 'message' => '成功'], JSON_UNESCAPED_UNICODE);
        } else {
            echo json_encode(['code' => 'FAIL', 'message' => $res['msg'] ?? '失败'], JSON_UNESCAPED_UNICODE);
        }
        exit;
    }

    /**
     * 支付宝官方异步通知回调
     * POST /api/payment/notifyAlipay
     */
    public function notifyAlipay(): void
    {
        $postData = !empty($_POST) ? $_POST : [];
        if (empty($postData)) {
            $raw = (string)file_get_contents('php://input');
            parse_str($raw, $postData);
        }

        $result = $this->paymentService->handleAlipayNotify($postData);

        if (!headers_sent()) {
            header('Content-Type: text/plain; charset=utf-8');
        }
        echo $result;
        exit;
    }
}
