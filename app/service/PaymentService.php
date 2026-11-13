<?php
/**
 * 启灵同城生活服务系统 - 统一在线支付收银台服务
 * 支持：
 * 1. 微信支付官方 API v3 (小程序/JSAPI、PC扫码 Native、手机H5)
 * 2. 支付宝官方 OpenAPI (当面付扫码 precreate、手机网页 wap.pay)
 * 3. 本地/沙箱开发环境一键极速模拟支付通道
 * 4. 异步回调安全验签、AES-256-GCM 解密与订单状态原子流转
 * 编码：UTF-8 无 BOM
 */

namespace App\Service;

use App\Model\Database;
use App\Model\OrderModel;
use App\Helper\Str;
use App\Common\Request;

class PaymentService
{
    /** @var Database */
    private $db;
    /** @var string */
    private $p;
    /** @var OrderModel */
    private $orderModel;

    /** 微信支付网关 */
    public const WECHAT_GATEWAY = 'https://api.mch.weixin.qq.com';
    /** 支付宝生产与沙箱网关 */
    public const ALIPAY_PROD_GATEWAY = 'https://openapi.alipay.com/gateway.do';
    public const ALIPAY_SANDBOX_GATEWAY = 'https://openapi-sandbox.dl.alipaydev.com/gateway.do';

    /** 微信支付配置 */
    private $wechatEnabled = false;
    private $wechatAppId = '';
    private $wechatMchId = '';
    private $wechatV3Key = '';
    private $wechatCertSerialNo = '';
    private $wechatPrivateKey = '';
    private $wechatPlatformPublicKey = '';
    private $wechatNotifyUrl = '';

    /** 支付宝配置 */
    private $alipayEnabled = false;
    private $alipayAppId = '';
    private $alipayPrivateKey = '';
    private $alipayPublicKey = '';
    private $alipayAppCert = '';
    private $alipayPublicCert = '';
    private $alipayRootCert = '';
    private $alipaySignType = 'cert';
    private $alipayNotifyUrl = '';

    /** 开发调试极速通道配置 */
    private $devMockEnabled = false;

    public function __construct()
    {
        $this->db = Database::getInstance();
        $this->p = $this->db->getPrefix();
        $this->orderModel = new OrderModel();
        $this->loadConfigs();
    }

    /**
     * 载入系统配置与支付密钥
     */
    private function loadConfigs(): void
    {
        try {
            $sql = "SELECT `config_key`, `config_value` FROM `{$this->p}sys_config` 
                    WHERE `config_key` IN (
                        'wechat_pay_enabled', 'wechat_pay_appid', 'wechat_appid', 'miniapp_appid',
                        'wechat_pay_mchid', 'mch_id', 'wechat_pay_v3_key', 'mch_v3_key',
                        'wechat_pay_cert_serial_no', 'wechat_cert_serial_no',
                        'wechat_pay_private_key', 'wechat_private_key',
                        'wechat_pay_platform_public_key', 'wechat_platform_public_key', 'wechat_pay_notify_url',
                        'alipay_pay_enabled', 'alipay_pay_appid', 'alipay_appid',
                        'alipay_pay_private_key', 'alipay_private_key',
                        'alipay_pay_public_key', 'alipay_public_key',
                        'alipay_pay_app_cert', 'alipay_app_cert',
                        'alipay_pay_public_cert', 'alipay_public_cert',
                        'alipay_pay_root_cert', 'alipay_root_cert',
                        'alipay_pay_sign_type', 'alipay_sign_type', 'alipay_pay_notify_url',
                        'pay_dev_mock_enabled'
                    )";
            $rows = $this->db->fetchAll($sql);
            $cfgs = [];
            foreach ($rows as $r) {
                $cfgs[$r['config_key']] = $r['config_value'];
            }

            // 微信支付 (优先使用专用的 wechat_pay_*，无则回退至通用商户配置)
            $this->wechatEnabled = !empty($cfgs['wechat_pay_enabled']) && $cfgs['wechat_pay_enabled'] !== '0';
            $this->wechatAppId = trim((string)($cfgs['wechat_pay_appid'] ?? ($cfgs['wechat_appid'] ?? ($cfgs['miniapp_appid'] ?? ''))));
            $this->wechatMchId = trim((string)($cfgs['wechat_pay_mchid'] ?? ($cfgs['mch_id'] ?? '')));
            $this->wechatV3Key = trim((string)($cfgs['wechat_pay_v3_key'] ?? ($cfgs['mch_v3_key'] ?? '')));
            $this->wechatCertSerialNo = trim((string)($cfgs['wechat_pay_cert_serial_no'] ?? ($cfgs['wechat_cert_serial_no'] ?? '')));
            $this->wechatPrivateKey = trim((string)($cfgs['wechat_pay_private_key'] ?? ($cfgs['wechat_private_key'] ?? '')));
            $this->wechatPlatformPublicKey = trim((string)($cfgs['wechat_pay_platform_public_key'] ?? ($cfgs['wechat_platform_public_key'] ?? '')));
            $this->wechatNotifyUrl = trim((string)($cfgs['wechat_pay_notify_url'] ?? ''));

            // 支付宝支付 (优先使用专用的 alipay_pay_*，无则回退至通用商户配置)
            $this->alipayEnabled = !empty($cfgs['alipay_pay_enabled']) && $cfgs['alipay_pay_enabled'] !== '0';
            $this->alipayAppId = trim((string)($cfgs['alipay_pay_appid'] ?? ($cfgs['alipay_appid'] ?? '')));
            $this->alipayPrivateKey = trim((string)($cfgs['alipay_pay_private_key'] ?? ($cfgs['alipay_private_key'] ?? '')));
            $this->alipayPublicKey = trim((string)($cfgs['alipay_pay_public_key'] ?? ($cfgs['alipay_public_key'] ?? '')));
            $this->alipayAppCert = trim((string)($cfgs['alipay_pay_app_cert'] ?? ($cfgs['alipay_app_cert'] ?? '')));
            $this->alipayPublicCert = trim((string)($cfgs['alipay_pay_public_cert'] ?? ($cfgs['alipay_public_cert'] ?? '')));
            $this->alipayRootCert = trim((string)($cfgs['alipay_pay_root_cert'] ?? ($cfgs['alipay_root_cert'] ?? '')));
            $this->alipaySignType = !empty($cfgs['alipay_pay_sign_type']) ? trim((string)$cfgs['alipay_pay_sign_type']) : (!empty($cfgs['alipay_sign_type']) ? trim((string)$cfgs['alipay_sign_type']) : 'cert');
            $this->alipayNotifyUrl = trim((string)($cfgs['alipay_pay_notify_url'] ?? ''));

            // 开发/调试极速模拟通道
            $mockVal = trim((string)($cfgs['pay_dev_mock_enabled'] ?? '0'));
            $this->devMockEnabled = ($mockVal === '1') || LicenseService::getInstance()->isLocalDevDomain();
        } catch (\Throwable $e) {
            // 静默容灾
        }
    }

    /**
     * 判断当前是否允许测试环境模拟支付
     */
    public function isDevMockEnabled(): bool
    {
        return $this->devMockEnabled;
    }

    /**
     * 获取收银台展示信息
     */
    public function getCashierInfo(string $orderSn): array
    {
        $order = $this->orderModel->findBySn($orderSn);
        if (!$order) {
            return ['code' => 404, 'msg' => '订单不存在'];
        }

        $payPrice = (float)($order['pay_price'] ?? 0.00);
        $payStatus = (int)($order['pay_status'] ?? 0);
        $canPay = ($payStatus === 0 && $payPrice > 0.00 && in_array($order['status'], ['pending_pay', 'pending_dispatch'], true));

        // 检测可用支付渠道 (仅支持微信与支付宝官方收款及沙箱模拟)
        $channels = [];

        // 1. 微信支付官方渠道
        $wechatConfigured = !empty($this->wechatMchId) && !empty($this->wechatPrivateKey) && !empty($this->wechatV3Key);
        if ($this->wechatEnabled && ($wechatConfigured || $this->isDevMockEnabled())) {
            $channels[] = [
                'key'     => 'wechat',
                'channel' => 'wechat',
                'name'    => '微信支付',
                'title'   => '微信支付',
                'desc'    => '微信官方安全支付，支持小程序与快捷收单',
                'enabled' => true,
                'icon'    => 'wechat'
            ];
        }

        // 2. 支付宝官方渠道
        $alipayConfigured = !empty($this->alipayAppId) && !empty($this->alipayPrivateKey);
        if ($this->alipayEnabled && ($alipayConfigured || $this->isDevMockEnabled())) {
            $channels[] = [
                'key'     => 'alipay',
                'channel' => 'alipay',
                'name'    => '支付宝',
                'title'   => '支付宝',
                'desc'    => '支付宝官方安全支付，支持当面付与手机支付',
                'enabled' => true,
                'icon'    => 'alipay'
            ];
        }

        // 3. 沙箱开发模拟快捷通道 (仅开发测试专享)
        if ($this->isDevMockEnabled()) {
            $channels[] = [
                'key'     => 'mock',
                'channel' => 'mock',
                'name'    => '模拟支付',
                'title'   => '极速模拟支付 (测试专享)',
                'desc'    => '开发调试免密极速通道',
                'enabled' => true,
                'icon'    => 'flask'
            ];
        }

        return [
            'code' => 200,
            'data' => [
                'order_sn'       => $order['order_sn'],
                'biz_type'       => $order['biz_type'] ?? 'recycle',
                'device_name'    => $order['device_name'] ?? '同城生活服务',
                'pay_price'      => $payPrice,
                'pay_status'     => $payStatus,
                'pay_type'       => $order['pay_type'] ?? 'none',
                'pay_time'       => (int)($order['pay_time'] ?? 0),
                'status'         => $order['status'],
                'status_text'    => OrderService::getStatusText($order['status'], $order['biz_type'] ?? 'recycle'),
                'can_pay'        => $canPay,
                'channels'       => $channels
            ]
        ];
    }

    /**
     * 创建支付订单 (根据业务类型、支付渠道与交互场景生成支付凭据)
     */
    public function createPayment(string $orderSn, string $channel, string $payMode = 'miniapp', array $params = []): array
    {
        $order = $this->orderModel->findBySn($orderSn);
        if (!$order) {
            return ['code' => 404, 'msg' => '订单不存在'];
        }

        if ((int)$order['pay_status'] === 1) {
            return ['code' => 400, 'msg' => '该订单已支付完成，请勿重复支付'];
        }

        $payPrice = (float)($order['pay_price'] ?? 0.00);

        // 若实付金额为 0，视为无需在线扣费，直接核销完成支付态
        if ($payPrice <= 0.00) {
            $this->markOrderPaid($order, 'free', 'FREE_PASS_' . time());
            return [
                'code' => 200,
                'msg'  => '订单费用为0，已自动确认完成！',
                'data' => [
                    'order_sn'   => $orderSn,
                    'paid'       => true,
                    'pay_status' => 1
                ]
            ];
        }

        // 开发极速模拟支付通道
        if ($channel === 'mock') {
            if (!$this->isDevMockEnabled()) {
                return ['code' => 403, 'msg' => '生产正式环境已关闭模拟支付通道'];
            }
            $mockTradeNo = 'MOCK_' . date('YmdHis') . '_' . Str::random(8);
            $this->markOrderPaid($order, 'mock', $mockTradeNo);
            return [
                'code' => 200,
                'msg'  => '开发模拟支付成功！',
                'data' => [
                    'order_sn'     => $orderSn,
                    'paid'         => true,
                    'pay_status'   => 1,
                    'pay_trade_no' => $mockTradeNo
                ]
            ];
        }

        // 微信支付
        if ($channel === 'wechat') {
            return $this->createWechatPayment($order, $payMode, $params);
        }

        // 支付宝支付
        if ($channel === 'alipay') {
            return $this->createAlipayPayment($order, $payMode, $params);
        }

        return ['code' => 400, 'msg' => '不支持的支付渠道: ' . $channel];
    }

    /**
     * 发起微信支付 (API v3)
     */
    private function createWechatPayment(array $order, string $payMode, array $params): array
    {
        if (empty($this->wechatMchId) || empty($this->wechatPrivateKey) || empty($this->wechatV3Key)) {
            // 若商户号尚未配置，且处于开发/演示模式，友好指引或降级模拟
            if ($this->isDevMockEnabled()) {
                return [
                    'code' => 200,
                    'msg'  => '【开发环境提示】后台微信商户号尚未配置，已为您自动切换至测试免密收银',
                    'data' => [
                        'order_sn'     => $order['order_sn'],
                        'is_mock'      => true,
                        'pay_mode'     => $payMode,
                        'message'      => '请在开发完成后于后台「系统设置 - 微信商户」填入真实 mch_id 与私钥'
                    ]
                ];
            }
            return ['code' => 400, 'msg' => '微信支付商户号或证书尚未配置完整，请联系管理员'];
        }

        $orderSn = $order['order_sn'];
        $amountCents = (int)round((float)$order['pay_price'] * 100);
        $description = mb_substr('启灵同城-' . ($order['device_name'] ?: '生活服务'), 0, 40);
        $notifyUrl = $this->getWechatNotifyUrl();

        // 模式 1: 小程序/JSAPI 支付
        if ($payMode === 'miniapp' || $payMode === 'jsapi') {
            $openid = trim((string)($params['openid'] ?? ''));
            if (empty($openid)) {
                // 尝试从登录用户资料中查找关联 openid
                if (!empty($order['user_id'])) {
                    $user = $this->db->fetchOne("SELECT `openid` FROM `{$this->p}rc_user` WHERE `id` = ? LIMIT 1", [(int)$order['user_id']]);
                    if ($user && !empty($user['openid'])) {
                        $openid = $user['openid'];
                    }
                }
            }

            if (empty($openid)) {
                return ['code' => 400, 'msg' => '发起小程序/公众号支付需要提供用户的 openid'];
            }

            $payload = [
                'appid'        => $this->wechatAppId,
                'mchid'        => $this->wechatMchId,
                'description'  => $description,
                'out_trade_no' => $orderSn,
                'notify_url'   => $notifyUrl,
                'amount'       => [
                    'total'    => $amountCents,
                    'currency' => 'CNY'
                ],
                'payer'        => [
                    'openid'   => $openid
                ]
            ];

            $res = $this->callWechatV3('POST', '/v3/pay/transactions/jsapi', $payload);
            if ($res['code'] !== 200 || empty($res['data']['prepay_id'])) {
                return ['code' => 500, 'msg' => '微信下单失败: ' . ($res['msg'] ?? '未知错误')];
            }

            $prepayId = $res['data']['prepay_id'];
            $timeStamp = (string)time();
            $nonceStr = Str::random(32);
            $package = 'prepay_id=' . $prepayId;

            // 组装小程序调起支付签名 (paySign)
            $paySignMessage = $this->wechatAppId . "\n" . $timeStamp . "\n" . $nonceStr . "\n" . $package . "\n";
            $paySign = $this->signRsa($paySignMessage, $this->wechatPrivateKey);

            return [
                'code' => 200,
                'msg'  => '微信支付预下单成功',
                'data' => [
                    'order_sn'    => $orderSn,
                    'channel'     => 'wechat',
                    'pay_mode'    => $payMode,
                    'pay_params'  => [
                        'appId'     => $this->wechatAppId,
                        'timeStamp' => $timeStamp,
                        'nonceStr'  => $nonceStr,
                        'package'   => $package,
                        'signType'  => 'RSA',
                        'paySign'   => $paySign
                    ]
                ]
            ];
        }

        // 模式 2: PC 扫码 Native 支付
        if ($payMode === 'native' || $payMode === 'qrcode') {
            $payload = [
                'appid'        => $this->wechatAppId,
                'mchid'        => $this->wechatMchId,
                'description'  => $description,
                'out_trade_no' => $orderSn,
                'notify_url'   => $notifyUrl,
                'amount'       => [
                    'total'    => $amountCents,
                    'currency' => 'CNY'
                ]
            ];

            $res = $this->callWechatV3('POST', '/v3/pay/transactions/native', $payload);
            if ($res['code'] !== 200 || empty($res['data']['code_url'])) {
                return ['code' => 500, 'msg' => '微信生成扫码链接失败: ' . ($res['msg'] ?? '未知错误')];
            }

            return [
                'code' => 200,
                'msg'  => '二维码生成成功',
                'data' => [
                    'order_sn'  => $orderSn,
                    'channel'   => 'wechat',
                    'pay_mode'  => 'native',
                    'code_url'  => $res['data']['code_url']
                ]
            ];
        }

        // 模式 3: 手机浏览器 H5 支付
        if ($payMode === 'h5') {
            $clientIp = Request::ip();
            $payload = [
                'appid'        => $this->wechatAppId,
                'mchid'        => $this->wechatMchId,
                'description'  => $description,
                'out_trade_no' => $orderSn,
                'notify_url'   => $notifyUrl,
                'amount'       => [
                    'total'    => $amountCents,
                    'currency' => 'CNY'
                ],
                'scene_info'   => [
                    'payer_client_ip' => $clientIp ?: '127.0.0.1',
                    'h5_info' => [
                        'type' => 'Wap'
                    ]
                ]
            ];

            $res = $this->callWechatV3('POST', '/v3/pay/transactions/h5', $payload);
            if ($res['code'] !== 200 || empty($res['data']['h5_url'])) {
                return ['code' => 500, 'msg' => '微信生成H5支付链接失败: ' . ($res['msg'] ?? '未知错误')];
            }

            return [
                'code' => 200,
                'msg'  => 'H5链接获取成功',
                'data' => [
                    'order_sn' => $orderSn,
                    'channel'  => 'wechat',
                    'pay_mode' => 'h5',
                    'h5_url'   => $res['data']['h5_url']
                ]
            ];
        }

        return ['code' => 400, 'msg' => '不支持的微信支付场景: ' . $payMode];
    }

    /**
     * 发起支付宝支付 (当面付预下单扫码 / 手机网站支付)
     */
    private function createAlipayPayment(array $order, string $payMode, array $params): array
    {
        if (empty($this->alipayAppId) || empty($this->alipayPrivateKey)) {
            if ($this->isDevMockEnabled()) {
                return [
                    'code' => 200,
                    'msg'  => '【开发环境提示】后台支付宝商户参数尚未配置，已为您自动切换至测试免密收银',
                    'data' => [
                        'order_sn'     => $order['order_sn'],
                        'is_mock'      => true,
                        'pay_mode'     => $payMode,
                        'message'      => '请在开发完成后于后台「系统设置 - 支付宝」填入真实 AppID 与密钥'
                    ]
                ];
            }
            return ['code' => 400, 'msg' => '支付宝 AppID 或私钥尚未配置完整'];
        }

        $orderSn = $order['order_sn'];
        $amount = number_format((float)$order['pay_price'], 2, '.', '');
        $subject = mb_substr('启灵同城-' . ($order['device_name'] ?: '生活服务'), 0, 40);
        $notifyUrl = $this->getAlipayNotifyUrl();

        $alipayService = new AlipayService();

        // 模式 1: 当面付预下单二维码 (PC端扫码)
        if ($payMode === 'native' || $payMode === 'precreate' || $payMode === 'qrcode') {
            $bizContent = [
                'out_trade_no' => $orderSn,
                'total_amount' => $amount,
                'subject'      => $subject
            ];

            $req = $alipayService->buildSignedRequest('alipay.trade.precreate', $bizContent);
            $req['notify_url'] = $notifyUrl;

            $gateway = $alipayService->getGatewayUrl();
            $res = $this->httpPostForm($gateway, $req);
            $json = json_decode($res, true);
            $resp = $json['alipay_trade_precreate_response'] ?? null;

            if (!$resp || ($resp['code'] ?? '') !== '10000' || empty($resp['qr_code'])) {
                $err = $resp['sub_msg'] ?? ($resp['msg'] ?? '支付宝扫码下单失败');
                return ['code' => 500, 'msg' => $err];
            }

            return [
                'code' => 200,
                'msg'  => '支付宝预下单成功',
                'data' => [
                    'order_sn' => $orderSn,
                    'channel'  => 'alipay',
                    'pay_mode' => 'precreate',
                    'qr_code'  => $resp['qr_code']
                ]
            ];
        }

        // 模式 2: 手机网页 WAP 支付
        if ($payMode === 'wap' || $payMode === 'page') {
            $bizContent = [
                'out_trade_no' => $orderSn,
                'total_amount' => $amount,
                'subject'      => $subject,
                'product_code' => 'QUICK_WAP_WAY'
            ];

            $req = $alipayService->buildSignedRequest('alipay.trade.wap.pay', $bizContent);
            $req['notify_url'] = $notifyUrl;
            if (!empty($params['return_url'])) {
                $req['return_url'] = $params['return_url'];
            }

            $gateway = $alipayService->getGatewayUrl();
            $payUrl = $gateway . '?' . http_build_query($req);

            return [
                'code' => 200,
                'msg'  => '支付宝跳转链接已生成',
                'data' => [
                    'order_sn' => $orderSn,
                    'channel'  => 'alipay',
                    'pay_mode' => 'wap',
                    'pay_url'  => $payUrl
                ]
            ];
        }

        return ['code' => 400, 'msg' => '不支持的支付宝支付场景: ' . $payMode];
    }

    /**
     * 处理微信支付官方 API v3 异步通知回调
     */
    public function handleWechatNotify(string $rawBody, array $headers): array
    {
        if (empty($rawBody)) {
            return ['code' => 400, 'msg' => '通知内容为空'];
        }

        $data = json_decode($rawBody, true);
        if (!$data || empty($data['resource'])) {
            return ['code' => 400, 'msg' => '无效的微信通知结构'];
        }

        // 解密 resource.ciphertext (AES-256-GCM)
        $res = $data['resource'];
        $ciphertext = $res['ciphertext'] ?? '';
        $nonce = $res['nonce'] ?? '';
        $associatedData = $res['associated_data'] ?? '';

        if (empty($this->wechatV3Key)) {
            return ['code' => 500, 'msg' => '后台未配置微信 APIv3 Key，无法解密回调通知'];
        }

        $plaintext = $this->decryptAesGcm($ciphertext, $this->wechatV3Key, $nonce, $associatedData);
        if (!$plaintext) {
            return ['code' => 400, 'msg' => '微信回调报文 AES-GCM 解密失败'];
        }

        $notifyObj = json_decode($plaintext, true);
        if (!$notifyObj) {
            return ['code' => 400, 'msg' => '解密后 JSON 格式错误'];
        }

        $tradeState = $notifyObj['trade_state'] ?? '';
        $orderSn = (string)($notifyObj['out_trade_no'] ?? '');
        $transactionId = (string)($notifyObj['transaction_id'] ?? '');

        if ($tradeState === 'SUCCESS' && !empty($orderSn)) {
            $order = $this->orderModel->findBySn($orderSn);
            if ($order && (int)$order['pay_status'] === 0) {
                $this->markOrderPaid($order, 'wechat', $transactionId);
            }
        }

        return ['code' => 200, 'msg' => '处理成功'];
    }

    /**
     * 处理支付宝官方异步通知回调
     */
    public function handleAlipayNotify(array $postParams): string
    {
        if (empty($postParams) || empty($postParams['sign'])) {
            return 'failure';
        }

        // 验证签名
        $verifyOk = $this->verifyAlipaySign($postParams);
        if (!$verifyOk) {
            return 'failure';
        }

        $tradeStatus = (string)($postParams['trade_status'] ?? '');
        $orderSn = (string)($postParams['out_trade_no'] ?? '');
        $tradeNo = (string)($postParams['trade_no'] ?? '');

        if (in_array($tradeStatus, ['TRADE_SUCCESS', 'TRADE_FINISHED'], true) && !empty($orderSn)) {
            $order = $this->orderModel->findBySn($orderSn);
            if ($order && (int)$order['pay_status'] === 0) {
                $this->markOrderPaid($order, 'alipay', $tradeNo);
            }
        }

        return 'success';
    }

    /**
     * 原子将订单更新为已支付状态并触发业务流转 (从 pending_pay 推进到 pending_dispatch 待派单)
     */
    public function markOrderPaid(array $order, string $channel, string $tradeNo): bool
    {
        $id = (int)$order['id'];
        $now = time();
        $targetStatus = ($order['biz_type'] === 'service' || $order['biz_type'] === 'errand') ? 'pending_dispatch' : $order['status'];

        $sql = "UPDATE `{$this->p}rc_order` 
                SET `pay_status` = 1, `pay_type` = ?, `pay_time` = ?, `pay_trade_no` = ?, `status` = ?, `updated_at` = ?
                WHERE `id` = ? AND `pay_status` = 0";

        $affected = $this->db->execute($sql, [$channel, $now, $tradeNo, $targetStatus, $now, $id]);
        return $affected > 0;
    }

    /**
     * 轮询查询或向上游主动核验订单支付状态
     */
    public function checkPaymentStatus(string $orderSn): array
    {
        $order = $this->orderModel->findBySn($orderSn);
        if (!$order) {
            return ['code' => 404, 'msg' => '订单不存在'];
        }

        $payStatus = (int)($order['pay_status'] ?? 0);
        return [
            'code' => 200,
            'data' => [
                'order_sn'     => $order['order_sn'],
                'paid'         => ($payStatus === 1),
                'pay_status'   => $payStatus,
                'pay_type'     => $order['pay_type'] ?? 'none',
                'pay_price'    => (float)($order['pay_price'] ?? 0.00),
                'pay_time'     => (int)($order['pay_time'] ?? 0),
                'pay_trade_no' => $order['pay_trade_no'] ?? '',
                'status'       => $order['status'],
                'status_text'  => OrderService::getStatusText($order['status'], $order['biz_type'] ?? 'recycle')
            ]
        ];
    }

    /**
     * 微信 API v3 底层通用请求
     */
    private function callWechatV3(string $method, string $urlPath, array $body = []): array
    {
        $bodyStr = !empty($body) ? json_encode($body, JSON_UNESCAPED_UNICODE) : '';
        $timestamp = time();
        $nonce = Str::random(32);

        $signMessage = "{$method}\n{$urlPath}\n{$timestamp}\n{$nonce}\n{$bodyStr}\n";
        $signature = $this->signRsa($signMessage, $this->wechatPrivateKey);

        $authHeader = sprintf(
            'WECHATPAY2-SHA256-RSA2048 mchid="%s",nonce_str="%s",signature="%s",timestamp="%d",serial_no="%s"',
            $this->wechatMchId,
            $nonce,
            $signature,
            $timestamp,
            $this->wechatCertSerialNo
        );

        $url = self::WECHAT_GATEWAY . $urlPath;
        $headers = [
            'Content-Type: application/json',
            'Accept: application/json',
            'User-Agent: QiLing-City-Service/1.0',
            'Authorization: ' . $authHeader
        ];

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);

        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $bodyStr);
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr = curl_error($ch);
        curl_close($ch);

        if ($curlErr) {
            return ['code' => 500, 'msg' => '微信支付网络连接异常: ' . $curlErr];
        }

        $resJson = json_decode((string)$response, true);
        if ($httpCode >= 200 && $httpCode < 300) {
            return ['code' => 200, 'data' => $resJson];
        }

        $msg = $resJson['message'] ?? ($resJson['detail']['issue'] ?? "HTTP {$httpCode}");
        return ['code' => $httpCode, 'msg' => $msg, 'data' => $resJson];
    }

    /**
     * AES-256-GCM 解密微信回调密文
     */
    private function decryptAesGcm(string $ciphertext, string $key, string $nonce, string $associatedData = ''): ?string
    {
        $decoded = base64_decode($ciphertext);
        if (strlen($decoded) < 17) {
            return null;
        }

        // 最后 16 字节为 AuthTag
        $authTag = substr($decoded, -16);
        $cipherData = substr($decoded, 0, -16);

        $plaintext = openssl_decrypt(
            $cipherData,
            'aes-256-gcm',
            $key,
            OPENSSL_RAW_DATA,
            $nonce,
            $authTag,
            $associatedData
        );

        return $plaintext !== false ? $plaintext : null;
    }

    /**
     * 生成 RSA-SHA256 签名
     */
    private function signRsa(string $message, string $privateKey): string
    {
        $key = trim($privateKey);
        if (strpos($key, '-----BEGIN') === false) {
            $key = "-----BEGIN PRIVATE KEY-----\n" . wordwrap($key, 64, "\n", true) . "\n-----END PRIVATE KEY-----";
        }

        $pkey = openssl_pkey_get_private($key);
        if (!$pkey) {
            // 尝试 RSA PRIVATE KEY 备用头
            $clean = str_replace(["\r", "\n", "-----BEGIN PRIVATE KEY-----", "-----END PRIVATE KEY-----", "-----BEGIN RSA PRIVATE KEY-----", "-----END RSA PRIVATE KEY-----", " "], '', $privateKey);
            $pemRsa = "-----BEGIN RSA PRIVATE KEY-----\n" . wordwrap($clean, 64, "\n", true) . "\n-----END RSA PRIVATE KEY-----";
            $pkey = openssl_pkey_get_private($pemRsa);
        }

        if (!$pkey) {
            return '';
        }

        $signature = '';
        openssl_sign($message, $signature, $pkey, OPENSSL_ALGO_SHA256);
        return base64_encode($signature);
    }

    /**
     * 校验支付宝异步通知签名
     */
    private function verifyAlipaySign(array $params): bool
    {
        if (empty($params['sign'])) {
            return false;
        }

        $sign = base64_decode($params['sign']);
        ksort($params);
        $pairs = [];
        foreach ($params as $k => $v) {
            if ($k !== 'sign' && $k !== 'sign_type' && $v !== '' && $v !== null) {
                $pairs[] = "{$k}={$v}";
            }
        }
        $stringToBeSigned = implode('&', $pairs);

        $publicKey = !empty($this->alipayPublicCert) ? $this->alipayPublicCert : $this->alipayPublicKey;
        $key = trim($publicKey);
        if (strpos($key, '-----BEGIN') === false) {
            $key = "-----BEGIN PUBLIC KEY-----\n" . wordwrap($key, 64, "\n", true) . "\n-----END PUBLIC KEY-----";
        }

        $pubKey = openssl_pkey_get_public($key);
        if (!$pubKey) {
            return false;
        }

        $ok = openssl_verify($stringToBeSigned, $sign, $pubKey, OPENSSL_ALGO_SHA256);
        return $ok === 1;
    }

    /**
     * HTTP 表单提交
     */
    private function httpPostForm(string $url, array $params): string
    {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($params));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);

        $res = curl_exec($ch);
        curl_close($ch);
        return (string)$res;
    }

    /**
     * 解析微信异步回调通知 URL
     */
    private function getWechatNotifyUrl(): string
    {
        if (!empty($this->wechatNotifyUrl)) {
            return $this->wechatNotifyUrl;
        }
        $host = Request::host();
        $scheme = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? 'https' : 'http';
        return "{$scheme}://{$host}/api/payment/notifyWechat";
    }

    /**
     * 解析支付宝异步回调通知 URL
     */
    private function getAlipayNotifyUrl(): string
    {
        if (!empty($this->alipayNotifyUrl)) {
            return $this->alipayNotifyUrl;
        }
        $host = Request::host();
        $scheme = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? 'https' : 'http';
        return "{$scheme}://{$host}/api/payment/notifyAlipay";
    }
}
