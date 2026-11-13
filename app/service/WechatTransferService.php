<?php
/**
 * 启灵同城服务系统 - 微信支付官方商家转账服务 (APIv3 标准接口)
 * 支持发起商家转账到零钱、转账单号查询与账户余额查询
 */

namespace App\Service;

use App\Model\Database;
use App\Helper\Str;

class WechatTransferService
{
    /** @var Database */
    private $db;
    /** @var string */
    private $p;

    /** 微信支付官方网关域名 */
    public const GATEWAY = 'https://api.mch.weixin.qq.com';

    /** 配置项 */
    private $enabled = false;
    private $appId = '';
    private $mchId = '';
    private $v3Key = '';
    private $certSerialNo = '';
    private $privateKey = '';
    private $platformPublicKey = '';
    private $platformCertSerialNo = '';
    private $transferSceneId = '';
    private $userRecvPerception = '二手回收货款';

    public function __construct()
    {
        $this->db = Database::getInstance();
        $this->p = $this->db->getPrefix();
        $this->loadConfigs();
    }

    /**
     * 从 sys_config 载入微信商户与转账配置
     */
    private function loadConfigs(): void
    {
        try {
            $sql = "SELECT `config_key`, `config_value` FROM `{$this->p}sys_config` 
                    WHERE `config_key` IN (
                        'wechat_transfer_enabled',
                        'wechat_appid',
                        'miniapp_appid',
                        'mch_id',
                        'mch_v3_key',
                        'wechat_cert_serial_no',
                        'wechat_private_key',
                        'wechat_platform_public_key',
                        'wechat_platform_cert_serial_no',
                        'wechat_transfer_scene_id',
                        'wechat_title_prefix'
                    )";
            $rows = $this->db->fetchAll($sql);
            $cfgs = [];
            foreach ($rows as $r) {
                $cfgs[$r['config_key']] = $r['config_value'];
            }

            $this->enabled = !empty($cfgs['wechat_transfer_enabled']) && $cfgs['wechat_transfer_enabled'] !== '0';
            
            // 优先使用专用 wechat_appid，回退至 miniapp_appid
            $this->appId = trim((string)($cfgs['wechat_appid'] ?? ($cfgs['miniapp_appid'] ?? '')));
            $this->mchId = trim((string)($cfgs['mch_id'] ?? ''));
            $this->v3Key = trim((string)($cfgs['mch_v3_key'] ?? ''));
            $this->certSerialNo = trim((string)($cfgs['wechat_cert_serial_no'] ?? ''));
            $this->privateKey = trim((string)($cfgs['wechat_private_key'] ?? ''));
            $this->platformPublicKey = trim((string)($cfgs['wechat_platform_public_key'] ?? ''));
            $this->platformCertSerialNo = trim((string)($cfgs['wechat_platform_cert_serial_no'] ?? ''));
            $this->transferSceneId = trim((string)($cfgs['wechat_transfer_scene_id'] ?? ''));
            
            if (!empty($cfgs['wechat_title_prefix'])) {
                $this->userRecvPerception = trim((string)$cfgs['wechat_title_prefix']);
            }
        } catch (\Throwable $e) {
            // 静默容灾
        }
    }

    /**
     * 检查是否已配置必要参数
     */
    public function isConfigured(): bool
    {
        return !empty($this->appId) && !empty($this->mchId) && !empty($this->certSerialNo) && !empty($this->privateKey);
    }

    /**
     * 是否启用微信转账
     */
    public function isEnabled(): bool
    {
        return $this->enabled;
    }

    /**
     * 构建微信支付商家转账 APIv3 请求载荷
     * 接口: POST /v3/fund-app/mch-transfer/transfer-bills
     *
     * @param string $outBillNo 商户唯一转账单号 (RC_PAY_xxx)
     * @param float $amount 转账金额 (元)
     * @param string $openid 收款用户微信 OpenID
     * @param string $payeeName 收款人真实姓名 (金额>=2000强制要求)
     * @param string $remark 转账备注
     * @param string $deviceName 回收物品名称
     * @return array
     */
    public function buildTransferPayload(
        string $outBillNo,
        float $amount,
        string $openid,
        string $payeeName = '',
        string $remark = '',
        string $deviceName = ''
    ): array {
        $amountInCents = (int)round($amount * 100);

        $finalRemark = !empty($remark) ? Str::substr($remark, 0, 32) : '回收货款结算';
        $perception = !empty($this->userRecvPerception) ? Str::substr($this->userRecvPerception, 0, 32) : '二手回收货款';

        $payload = [
            'appid'                => $this->appId,
            'out_bill_no'          => $outBillNo,
            'openid'               => $openid,
            'transfer_amount'      => $amountInCents,
            'transfer_remark'      => $finalRemark,
            'user_recv_perception' => $perception,
        ];

        // 转账场景ID (商户平台申请的二手回收场景ID)
        if (!empty($this->transferSceneId)) {
            $payload['transfer_scene_id'] = $this->transferSceneId;
        }

        // 转账场景报备信息 (二手回收商品明细)
        if (!empty($deviceName)) {
            $payload['transfer_scene_report_infos'] = [
                [
                    'info_type'    => '回收商品名称',
                    'info_content' => Str::substr($deviceName, 0, 128)
                ]
            ];
        }

        // 强实名核验与敏感字段加密：
        // 微信官方规则：单笔金额 >= 2000 元必须传入姓名并使用平台公钥/证书加密；< 2000 元选填
        if (!empty($payeeName) && !empty($this->platformPublicKey)) {
            $encryptedName = $this->encryptUserName($payeeName);
            if (!empty($encryptedName)) {
                $payload['user_name'] = $encryptedName;
            }
        }

        return $payload;
    }

    /**
     * 生成接口请求报文预览数据 (基于真实订单收款人、真实金额与真实业务数据)
     */
    public function previewTransferPayload(
        string $outBillNo,
        float $amount,
        string $openid,
        string $payeeName = '',
        string $remark = '',
        string $deviceName = ''
    ): array {
        $payload = $this->buildTransferPayload($outBillNo, $amount, $openid, $payeeName, $remark, $deviceName);
        $urlPath = '/v3/fund-app/mch-transfer/transfer-bills';
        $authHeader = $this->buildAuthHeader('POST', $urlPath, json_encode($payload, JSON_UNESCAPED_UNICODE));

        return [
            'api_name'          => 'POST /v3/fund-app/mch-transfer/transfer-bills',
            'api_desc'          => '微信支付商家转账到零钱 (升级版标准接口)',
            'doc_url'           => 'https://pay.weixin.qq.com/doc/v3/merchant/4012711988',
            'gateway_url'       => self::GATEWAY . $urlPath,
            'is_configured'     => $this->isConfigured(),
            'http_method'       => 'POST',
            'content_type'      => 'application/json;charset=utf-8',
            'headers'           => [
                'Authorization'    => $authHeader,
                'Wechatpay-Serial' => $this->platformCertSerialNo ?: '[如配置平台证书将传递此标头]',
            ],
            'request_payload'   => $payload,
            'expected_response' => [
                'out_bill_no'      => $outBillNo,
                'transfer_bill_no' => '[微信支付网关实时返回单号]',
                'create_time'      => date('c'),
                'state'            => 'SUCCESS',
                'package_info'     => '[用户确认模式下返回拉起凭证]'
            ],
            'note' => '说明：此为微信支付升级版官方商家转账 APIv3 标准协议结构，真实转账由微信支付网关实时受理出资'
        ];
    }

    /**
     * 执行微信支付商家转账出资 (100% 真实请求微信支付官方 APIv3 网关)
     *
     * @param string $outBillNo 商户唯一转账单号
     * @param float $amount 转账金额 (来自订单真实核定金额)
     * @param string $openid 收款用户微信 OpenID
     * @param string $payeeName 收款人真实姓名
     * @param string $remark 转账备注
     * @param string $deviceName 回收物品名称
     * @return array ['success' => bool, 'transfer_bill_no' => string, 'state' => string, 'msg' => string, 'raw' => array]
     */
    public function transfer(
        string $outBillNo,
        float $amount,
        string $openid,
        string $payeeName = '',
        string $remark = '',
        string $deviceName = ''
    ): array {
        // 参数前置校验
        if ($amount < 0.30) {
            return ['success' => false, 'transfer_bill_no' => '', 'msg' => '微信支付官方规定商家转账单笔出资金额不得低于 0.30 元'];
        }
        if (empty($openid)) {
            return ['success' => false, 'transfer_bill_no' => '', 'msg' => '未获取到客户真实微信 OpenID，无法向微信零钱发起转账'];
        }
        if ($amount >= 2000.0 && empty($payeeName)) {
            return ['success' => false, 'transfer_bill_no' => '', 'msg' => '单笔金额大于等于 2000 元，微信官方要求必须填写真实姓名以进行强实名核验'];
        }
        if ($amount >= 2000.0 && empty($this->platformPublicKey)) {
            return ['success' => false, 'transfer_bill_no' => '', 'msg' => '单笔金额大于等于 2000 元，微信强制要求平台公钥加密姓名，请先在系统设置中配置微信支付平台证书/公钥'];
        }

        // 校验商户凭据配置
        if (!$this->isConfigured()) {
            return [
                'success'           => false,
                'transfer_bill_no'  => '',
                'msg'               => '未完整配置微信商户号 (MchId)、AppID、证书序列号或商户 API 私钥，请前往【系统设置】配置真实参数'
            ];
        }

        $payload = $this->buildTransferPayload($outBillNo, $amount, $openid, $payeeName, $remark, $deviceName);
        $jsonBody = json_encode($payload, JSON_UNESCAPED_UNICODE);
        $urlPath = '/v3/fund-app/mch-transfer/transfer-bills';

        $res = $this->executeHttp('POST', $urlPath, $jsonBody);
        if (!$res['success']) {
            return ['success' => false, 'transfer_bill_no' => '', 'msg' => '微信支付网关通信失败: ' . $res['msg']];
        }

        $body = $res['data'];
        $httpCode = $res['http_code'];

        // 成功受理 (200 或 202)
        if (in_array($httpCode, [200, 202], true) && is_array($body)) {
            $state = (string)($body['state'] ?? 'ACCEPTED');
            $transferBillNo = (string)($body['transfer_bill_no'] ?? '');

            if ($state === 'SUCCESS') {
                return [
                    'success'          => true,
                    'status'           => 'SUCCESS',
                    'transfer_bill_no' => $transferBillNo,
                    'msg'              => '微信商家转账成功，款项已实时入账客户微信零钱',
                    'raw'              => $body
                ];
            }

            // 处理中 / 受理成功 / 待用户确认 (ACCEPTED, PROCESSING, WAIT_USER_CONFIRM)
            if (in_array($state, ['ACCEPTED', 'PROCESSING', 'WAIT_USER_CONFIRM'], true)) {
                // 主动反查一次单据真实终态
                $queryRes = $this->queryTransfer($outBillNo);
                if ($queryRes['success'] && $queryRes['status'] === 'SUCCESS') {
                    return [
                        'success'          => true,
                        'status'           => 'SUCCESS',
                        'transfer_bill_no' => $queryRes['transfer_bill_no'] ?: $transferBillNo,
                        'msg'              => '微信商家转账已处理完毕并实时入账',
                        'raw'              => $queryRes['raw'] ?? $body
                    ];
                }

                $msgMap = [
                    'ACCEPTED'          => '微信转账请求已受理，正在处理出资',
                    'PROCESSING'        => '微信支付正在出资处理中，系统将持续追踪状态',
                    'WAIT_USER_CONFIRM' => '微信转账单已生成，等待客户在微信端确认收款'
                ];
                return [
                    'success'          => true,
                    'status'           => $state,
                    'transfer_bill_no' => $transferBillNo,
                    'package_info'     => (string)($body['package_info'] ?? ''),
                    'msg'              => $msgMap[$state] ?? '微信商家转账受理成功',
                    'raw'              => $body
                ];
            }

            // 明确失败状态
            $failReason = (string)($body['fail_reason'] ?? '转账未成功');
            return [
                'success'          => false,
                'status'           => 'FAIL',
                'transfer_bill_no' => $transferBillNo,
                'msg'              => "微信转账未成功: {$failReason}",
                'raw'              => $body
            ];
        }

        // 业务或网关报错解析 (4xx / 5xx)
        $errCode = (string)($body['code'] ?? ('HTTP_' . $httpCode));
        $errMsg = (string)($body['message'] ?? ($body['detail']['issue'] ?? '微信支付接口请求失败'));
        return [
            'success'          => false,
            'status'           => 'FAIL',
            'transfer_bill_no' => '',
            'err_code'         => $errCode,
            'msg'              => "微信转账失败 [{$errCode}]: {$errMsg}",
            'raw'              => $body
        ];
    }

    /**
     * 查询微信商家转账单据真实状态
     * 接口: GET /v3/fund-app/mch-transfer/transfer-bills/out-bill-no/{out_bill_no}
     */
    public function queryTransfer(string $outBillNo): array
    {
        if (!$this->isConfigured()) {
            return [
                'success' => false,
                'status'  => 'UNKNOWN',
                'msg'     => '未配置微信支付商户凭据，无法向网关查询单据状态'
            ];
        }

        $urlPath = '/v3/fund-app/mch-transfer/transfer-bills/out-bill-no/' . rawurlencode($outBillNo);
        $res = $this->executeHttp('GET', $urlPath);

        if (!$res['success']) {
            return ['success' => false, 'status' => 'UNKNOWN', 'msg' => $res['msg']];
        }

        $body = $res['data'];
        $httpCode = $res['http_code'];

        if ($httpCode === 200 && is_array($body)) {
            $state = (string)($body['state'] ?? 'UNKNOWN');
            $transferBillNo = (string)($body['transfer_bill_no'] ?? '');
            return [
                'success'          => true,
                'status'           => $state,
                'transfer_bill_no' => $transferBillNo,
                'msg'              => '单据状态: ' . $state,
                'raw'              => $body
            ];
        }

        $errMsg = (string)($body['message'] ?? '单据查询失败');
        return [
            'success' => false,
            'status'  => 'FAIL',
            'msg'     => $errMsg,
            'raw'     => $body
        ];
    }

    /**
     * 真实查询企业微信支付资金专户可用余额
     * 接口: GET /v3/merchant/fund/balance/{account_type}
     *
     * @param string $accountType BASIC: 基本账户; OPERATION: 运营账户
     * @return array
     */
    public function queryAccountBalance(string $accountType = 'BASIC'): array
    {
        if (!$this->isConfigured()) {
            return [
                'success'          => false,
                'available_amount' => '0.00',
                'freeze_amount'    => '0.00',
                'msg'              => '未配置微信支付商户号、AppID 或证书私钥，无法查询真实资金余额，请在系统设置中配置'
            ];
        }

        $urlPath = '/v3/merchant/fund/balance/' . rawurlencode($accountType);
        $res = $this->executeHttp('GET', $urlPath);

        if (!$res['success']) {
            return [
                'success'          => false,
                'available_amount' => '0.00',
                'freeze_amount'    => '0.00',
                'msg'              => '微信支付网关通信失败: ' . $res['msg']
            ];
        }

        $body = $res['data'];
        $httpCode = $res['http_code'];

        if ($httpCode === 200 && is_array($body)) {
            // 微信支付余额接口返回金额单位为【分】
            $availCents = (int)($body['available_amount'] ?? 0);
            $pendingCents = (int)($body['pending_amount'] ?? 0);

            $availableYuan = sprintf('%.2f', $availCents / 100);
            $freezeYuan = sprintf('%.2f', $pendingCents / 100);

            return [
                'success'          => true,
                'available_amount' => $availableYuan,
                'freeze_amount'    => $freezeYuan,
                'account_type'     => (string)($body['account_type'] ?? $accountType),
                'msg'              => '微信支付商户账户真实余额查询成功',
                'raw'              => $body
            ];
        }

        $errMsg = (string)($body['message'] ?? '微信商户余额查询失败');
        return [
            'success'          => false,
            'available_amount' => '0.00',
            'freeze_amount'    => '0.00',
            'msg'              => $errMsg,
            'raw'              => $body
        ];
    }

    /**
     * 构建 APIv3 签名授权请求头
     * Authorization: WECHATPAY2-SHA256-RSA2048 mchid="...",nonce_str="...",signature="...",timestamp="...",serial_no="..."
     */
    private function buildAuthHeader(string $method, string $urlPath, string $body = ''): string
    {
        $timestamp = (string)time();
        $nonce = Str::random(32);
        
        // 待签名串格式: HTTP方法\nURL路径(含Query)\n时间戳\n随机串\n请求报文主体\n
        $signMessage = "{$method}\n{$urlPath}\n{$timestamp}\n{$nonce}\n{$body}\n";
        
        $signature = $this->generateSign($signMessage);

        return sprintf(
            'WECHATPAY2-SHA256-RSA2048 mchid="%s",nonce_str="%s",signature="%s",timestamp="%s",serial_no="%s"',
            $this->mchId,
            $nonce,
            $signature,
            $timestamp,
            $this->certSerialNo
        );
    }

    /**
     * 使用商户私钥生成 SHA256withRSA 标准签名
     */
    private function generateSign(string $message): string
    {
        if (empty($this->privateKey)) {
            return '';
        }

        $pem = $this->formatPrivateKey($this->privateKey);
        $pkey = openssl_pkey_get_private($pem);
        if (!$pkey) {
            $clean = str_replace(["\r", "\n", "-----BEGIN PRIVATE KEY-----", "-----END PRIVATE KEY-----", "-----BEGIN RSA PRIVATE KEY-----", "-----END RSA PRIVATE KEY-----", " "], '', $this->privateKey);
            $pemRsa = "-----BEGIN RSA PRIVATE KEY-----\n" . wordwrap($clean, 64, "\n", true) . "\n-----END RSA PRIVATE KEY-----";
            $pkey = openssl_pkey_get_private($pemRsa);
        }

        if (!$pkey) {
            return '';
        }

        $signature = '';
        openssl_sign($message, $signature, $pkey, OPENSSL_ALGO_SHA256);
        if (is_resource($pkey)) {
            openssl_free_key($pkey);
        }

        return base64_encode($signature);
    }

    /**
     * 敏感信息加密 (RSA-OAEP with SHA-1)
     * 针对转账金额 >= 2000 元用户的真实姓名进行平台证书/公钥加密
     */
    private function encryptUserName(string $plainText): string
    {
        if (empty($this->platformPublicKey) || empty($plainText)) {
            return '';
        }

        $pem = $this->formatPublicKey($this->platformPublicKey);
        $pubKey = openssl_pkey_get_public($pem);
        if (!$pubKey) {
            $clean = str_replace(["\r", "\n", "-----BEGIN PUBLIC KEY-----", "-----END PUBLIC KEY-----", "-----BEGIN CERTIFICATE-----", "-----END CERTIFICATE-----", " "], '', $this->platformPublicKey);
            $pemPub = "-----BEGIN PUBLIC KEY-----\n" . wordwrap($clean, 64, "\n", true) . "\n-----END PUBLIC KEY-----";
            $pubKey = openssl_pkey_get_public($pemPub);
        }

        if (!$pubKey) {
            return '';
        }

        $encrypted = '';
        $ok = openssl_public_encrypt($plainText, $encrypted, $pubKey, OPENSSL_PKCS1_OAEP_PADDING);
        if (is_resource($pubKey)) {
            openssl_free_key($pubKey);
        }

        return $ok ? base64_encode($encrypted) : '';
    }

    /**
     * 格式化私钥为标准 PEM 格式
     */
    private function formatPrivateKey(string $key): string
    {
        $key = trim($key);
        if (strpos($key, '-----BEGIN') !== false) {
            return $key;
        }
        return "-----BEGIN PRIVATE KEY-----\n" . wordwrap($key, 64, "\n", true) . "\n-----END PRIVATE KEY-----";
    }

    /**
     * 格式化平台公钥或证书为标准 PEM 格式
     */
    private function formatPublicKey(string $key): string
    {
        $key = trim($key);
        if (strpos($key, '-----BEGIN') !== false) {
            return $key;
        }
        return "-----BEGIN CERTIFICATE-----\n" . wordwrap($key, 64, "\n", true) . "\n-----END CERTIFICATE-----";
    }

    /**
     * 执行外部 HTTP 请求
     */
    private function executeHttp(string $method, string $urlPath, string $body = ''): array
    {
        $url = self::GATEWAY . $urlPath;
        $authHeader = $this->buildAuthHeader($method, $urlPath, $body);

        $headers = [
            'Accept: application/json',
            'Content-Type: application/json',
            'User-Agent: Lingjian-Recycle-System/1.0 (PHP)',
            'Authorization: ' . $authHeader,
        ];

        if (!empty($this->platformCertSerialNo)) {
            $headers[] = 'Wechatpay-Serial: ' . $this->platformCertSerialNo;
        }

        $ch = curl_init();
        try {
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
            if ($method === 'POST') {
                curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
            }
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5); // 连接超时 5 秒
            curl_setopt($ch, CURLOPT_TIMEOUT, 15);        // 响应超时 15 秒
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
            curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

            $raw = curl_exec($ch);
            if ($raw === false) {
                $err = curl_error($ch);
                return ['success' => false, 'http_code' => 0, 'msg' => '网络通信异常: ' . $err, 'data' => null];
            }

            $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $json = json_decode($raw, true);
            if (!is_array($json)) {
                $json = ['raw_text' => $raw];
            }

            return [
                'success'   => true,
                'http_code' => $httpCode,
                'msg'       => 'success',
                'data'      => $json
            ];
        } catch (\Throwable $e) {
            return ['success' => false, 'http_code' => 0, 'msg' => '请求异常: ' . $e->getMessage(), 'data' => null];
        } finally {
            if (is_resource($ch) || (is_object($ch) && $ch instanceof \CurlHandle)) {
                curl_close($ch);
            }
        }
    }
}
