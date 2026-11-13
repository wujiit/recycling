<?php
/**
 * 启灵同城服务系统 - 顺丰速运开放平台对接服务
 * 支持自动预约上门取件、生成运单号、运费与路由状态推送处理
 */

namespace App\Service;

use App\Model\Database;

class SfExpressService
{
    /** @var Database */
    private $db;
    /** @var string */
    private $p;

    /** 顺丰官方网关地址 */
    public const SANDBOX_GATEWAY = 'https://sfapi-sbox.sf-express.com/std/service';
    public const PROD_GATEWAY    = 'https://bspgw.sf-express.com/std/service';

    /** 顺丰下订单服务码 */
    public const SERVICE_CODE = 'EXP_RECE_CREATE_ORDER';

    /** 顺丰清单运费推送服务码 */
    public const SERVICE_CODE_FEE_PUSH = 'EXP_RECE_WAYBILLS_FEE_PUSH';

    /** 顺丰路由推送服务码 (速运类API) */
    public const SERVICE_CODE_ROUTE_PUSH = 'RoutePushService';

    /** 顺丰订单状态推送服务码 (速运类API) */
    public const SERVICE_CODE_ORDER_STATE_PUSH = 'PushOrderState';

    /** 配置项 */
    private $enabled = false;
    private $env = 'sandbox'; // sandbox | prod
    private $partnerId = '';
    private $checkWord = '';
    private $monthlyCard = '';
    private $payMethod = 2; // 1: 寄方付, 2: 收方付(到付), 3: 第三方付
    private $expressTypeId = 2; // 1: 顺丰特快, 2: 顺丰标快
    private $isDocall = 1; // 1: 要求收派员上门收件, 0: 仅生成电子面单
    private $signType = 'simple'; // simple: 简易MD5 (顺丰开放平台应用创建默认: msgData+timestamp+checkWord) | standard: 标准MD5 (msgData+checkWord)

    /** 平台/仓库默认收件地址信息 */
    private $receiveContact = '';
    private $receiveMobile = '';
    private $receiveProvince = '';
    private $receiveCity = '';
    private $receiveDistrict = '';
    private $receiveAddress = '';

    public function __construct()
    {
        $this->db = Database::getInstance();
        $this->p = $this->db->getPrefix();
        $this->loadConfigs();
    }

    /**
     * 从 sys_config 载入顺丰速运配置
     */
    public function loadConfigs(): void
    {
        try {
            $sql = "SELECT `config_key`, `config_value` FROM `{$this->p}sys_config` 
                    WHERE `config_key` IN (
                        'sf_enabled',
                        'sf_env',
                        'sf_partner_id',
                        'sf_check_word',
                        'sf_sign_type',
                        'sf_monthly_card',
                        'sf_pay_method',
                        'sf_express_type',
                        'sf_is_docall',
                        'sf_receive_contact',
                        'sf_receive_mobile',
                        'sf_receive_province',
                        'sf_receive_city',
                        'sf_receive_district',
                        'sf_receive_address',
                        'service_tel',
                        'site_name'
                    )";
            $rows = $this->db->fetchAll($sql);
            $cfgs = [];
            foreach ($rows as $r) {
                $cfgs[$r['config_key']] = $r['config_value'];
            }

            $this->enabled = !empty($cfgs['sf_enabled']) && $cfgs['sf_enabled'] === '1';
            $this->env = (!empty($cfgs['sf_env']) && in_array($cfgs['sf_env'], ['sandbox', 'prod'], true)) 
                ? $cfgs['sf_env'] 
                : 'sandbox';
            $this->partnerId = trim((string)($cfgs['sf_partner_id'] ?? ''));
            $this->checkWord = trim((string)($cfgs['sf_check_word'] ?? ''));
            $this->signType = (!empty($cfgs['sf_sign_type']) && in_array($cfgs['sf_sign_type'], ['simple', 'standard'], true))
                ? $cfgs['sf_sign_type']
                : 'simple';
            $this->monthlyCard = trim((string)($cfgs['sf_monthly_card'] ?? ''));
            $this->payMethod = isset($cfgs['sf_pay_method']) ? (int)$cfgs['sf_pay_method'] : 2;
            $this->expressTypeId = isset($cfgs['sf_express_type']) ? (int)$cfgs['sf_express_type'] : 2;
            $this->isDocall = isset($cfgs['sf_is_docall']) ? (int)$cfgs['sf_is_docall'] : 1;

            $this->receiveContact = trim((string)($cfgs['sf_receive_contact'] ?? '平台质检收件中心'));
            $this->receiveMobile = trim((string)($cfgs['sf_receive_mobile'] ?? ($cfgs['service_tel'] ?? '')));
            $this->receiveProvince = trim((string)($cfgs['sf_receive_province'] ?? ''));
            $this->receiveCity = trim((string)($cfgs['sf_receive_city'] ?? ''));
            $this->receiveDistrict = trim((string)($cfgs['sf_receive_district'] ?? ''));
            $this->receiveAddress = trim((string)($cfgs['sf_receive_address'] ?? ''));
        } catch (\Throwable $e) {
            // 静默容灾
        }
    }

    /**
     * 是否启用顺丰速运接口
     */
    public function isEnabled(): bool
    {
        return $this->enabled;
    }

    /**
     * 是否已配置必要参数
     */
    public function isConfigured(): bool
    {
        return !empty($this->partnerId) && !empty($this->checkWord);
    }

    /**
     * 获取当前生效的顺丰网关接口 URL
     */
    public function getGatewayUrl(): string
    {
        return $this->env === 'prod' ? self::PROD_GATEWAY : self::SANDBOX_GATEWAY;
    }

    /**
     * 生成顺丰接口数字签名
     * 1. 简易 MD5 模式 (顺丰开放平台应用创建默认选择): Base64(MD5(msgData + timestamp + checkWord, true))
     * 2. 标准 MD5 模式 (传统旧版算法): Base64(MD5(msgData + checkWord, true))
     * 注意: md5 必须传 true 输出 16 字节原始二进制，再经过 Base64 编码为 24 字符
     */
    public function generateDigest(string $msgData, string $timestamp, string $checkWord, string $signType = 'simple'): string
    {
        $rawStr = ($signType === 'standard') 
            ? ($msgData . $checkWord) 
            : ($msgData . $timestamp . $checkWord);
        return base64_encode(md5($rawStr, true));
    }

    /**
     * 校验顺丰开放平台服务端异步推送数字签名 (支持时序安全比较与双算法容灾)
     */
    public function verifyPushSignature(string $msgData, string $timestamp, string $incomingDigest): bool
    {
        if (empty($this->checkWord)) {
            return true;
        }

        if (empty($incomingDigest)) {
            return false;
        }

        // 优先根据当前配置的签名算法计算
        $expected = $this->generateDigest($msgData, $timestamp, $this->checkWord, $this->signType);
        if (hash_equals($expected, $incomingDigest)) {
            return true;
        }

        // 容灾回退：尝试另一种签名算法 (standard 与 simple 互备)
        $fallbackType = ($this->signType === 'simple') ? 'standard' : 'simple';
        $fallbackExpected = $this->generateDigest($msgData, $timestamp, $this->checkWord, $fallbackType);
        return hash_equals($fallbackExpected, $incomingDigest);
    }

    /**
     * 生成 32 位唯一 RequestID
     */
    private function generateRequestId(): string
    {
        return sprintf(
            '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }

    /**
     * 针对回收订单发起顺丰速运下订单预约揽件
     *
     * @param array $order 回收订单数据 (包含 order_sn, contact_name, contact_mobile, contact_address, device_name, appointment_time 等)
     * @return array ['code' => 200|400|500, 'msg' => string, 'data' => array|null]
     */
    public function createOrder(array $order): array
    {
        if (!$this->enabled) {
            return ['code' => 400, 'msg' => '顺丰速运接口未启用', 'data' => null];
        }

        if (!$this->isConfigured()) {
            return ['code' => 400, 'msg' => '顺丰顾客编码(partnerID)或校验码(checkWord)未配置', 'data' => null];
        }

        $orderSn = trim((string)($order['order_sn'] ?? ''));
        if (empty($orderSn)) {
            return ['code' => 400, 'msg' => '回收订单号不能为空', 'data' => null];
        }

        $senderMobile = trim((string)($order['contact_mobile'] ?? ''));
        $senderAddress = trim((string)($order['contact_address'] ?? ''));
        if (empty($senderMobile)) {
            return ['code' => 400, 'msg' => '寄件人联系电话不能为空', 'data' => null];
        }
        if (empty($senderAddress)) {
            return ['code' => 400, 'msg' => '寄件人详细地址不能为空', 'data' => null];
        }

        $msgDataArray = $this->buildCreateOrderMsgData($order);
        $msgDataJson = json_encode($msgDataArray, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $timestamp = (string)time();
        $digest = $this->generateDigest($msgDataJson, $timestamp, $this->checkWord, $this->signType);

        $params = [
            'partnerID'   => $this->partnerId,
            'requestID'   => $this->generateRequestId(),
            'serviceCode' => self::SERVICE_CODE_CREATE_ORDER,
            'timestamp'   => $timestamp,
            'msgDigest'   => $digest,
            'msgData'     => $msgDataJson
        ];

        $this->logInfo('发起顺丰速运下订单预约请求', [
            'order_sn'     => $orderSn,
            'service_code' => self::SERVICE_CODE_CREATE_ORDER,
            'gateway'      => $this->getGatewayUrl(),
            'sign_type'    => $this->signType,
            'payload'      => $msgDataArray
        ]);

        $res = $this->executeHttp($this->getGatewayUrl(), $params);
        if (!$res['success']) {
            $this->logError('顺丰下订单 HTTP 请求失败', ['order_sn' => $orderSn, 'error' => $res['error']]);
            return ['code' => 500, 'msg' => '请求顺丰速运网络失败: ' . $res['error'], 'data' => null];
        }

        $respData = json_decode($res['body'], true);
        if (!is_array($respData)) {
            $this->logError('解析顺丰下订单响应 JSON 失败', ['order_sn' => $orderSn, 'raw_body' => $res['body']]);
            return ['code' => 500, 'msg' => '解析顺丰速运返回结果失败', 'data' => ['raw' => $res['body']]];
        }

        return $this->parseCreateOrderResponse($respData, $orderSn);
    }

    /**
     * 构建顺丰下订单业务载荷 msgData
     */
    private function buildCreateOrderMsgData(array $order): array
    {
        $senderName = trim((string)($order['contact_name'] ?? '客户'));
        $senderMobile = trim((string)($order['contact_mobile'] ?? ''));
        $senderAddress = trim((string)($order['contact_address'] ?? ''));

        $receiverName = !empty($this->receiveContact) ? $this->receiveContact : '平台回收质检中心';
        $receiverMobile = !empty($this->receiveMobile) ? $this->receiveMobile : '4008008820';
        $receiverAddress = !empty($this->receiveAddress) ? $this->receiveAddress : '广东省深圳市南山区高新科技园回收质检中心';

        $contactInfoList = [
            ['contactType' => 1, 'contact' => $senderName, 'mobile' => $senderMobile, 'address' => $senderAddress],
            ['contactType' => 2, 'contact' => $receiverName, 'mobile' => $receiverMobile, 'province' => $this->receiveProvince ?: null, 'city' => $this->receiveCity ?: null, 'county' => $this->receiveDistrict ?: null, 'address' => $receiverAddress]
        ];

        $cargoName = !empty($order['device_name']) ? trim((string)$order['device_name']) : '二手电子设备';
        if (mb_strlen($cargoName) > 80) {
            $cargoName = mb_substr($cargoName, 0, 80);
        }

        $msgDataArray = [
            'orderId'         => trim((string)($order['order_sn'] ?? '')),
            'expressTypeId'   => (int)$this->expressTypeId,
            'payMethod'       => (int)$this->payMethod,
            'monthlyCard'     => $this->monthlyCard,
            'contactInfoList' => $contactInfoList,
            'cargoDetails'    => [['name' => $cargoName, 'count' => 1, 'unit' => '件']],
            'remark'          => '启灵同城服务业务快件，请验视包装并上门取件'
        ];

        if (!empty($order['appointment_time'])) {
            $aptTime = trim((string)$order['appointment_time']);
            if (strtotime($aptTime) !== false) {
                $msgDataArray['sendStartTm'] = $aptTime;
            }
        }
        return $msgDataArray;
    }

    /**
     * 解析顺丰下订单网关及业务响应
     */
    private function parseCreateOrderResponse(array $respData, string $orderSn): array
    {
        $apiResultCode = (string)($respData['apiResultCode'] ?? '');
        $apiErrorMsg = (string)($respData['apiErrorMsg'] ?? '');

        if ($apiResultCode !== 'A1000') {
            $this->logError('顺丰开放平台下订单网关拦截', ['order_sn' => $orderSn, 'apiResultCode' => $apiResultCode, 'apiErrorMsg' => $apiErrorMsg]);
            return [
                'code' => 400,
                'msg'  => !empty($apiErrorMsg) ? "顺丰下单失败: {$apiErrorMsg} ({$apiResultCode})" : "顺丰接口返回错误码 {$apiResultCode}",
                'data' => $respData
            ];
        }

        $innerData = [];
        if (!empty($respData['apiResultData'])) {
            $inner = $respData['apiResultData'];
            $innerData = is_string($inner) ? (json_decode($inner, true) ?: []) : (is_array($inner) ? $inner : []);
        }

        $bizSuccess = (bool)($innerData['success'] ?? false);
        $bizErrorCode = (string)($innerData['errorCode'] ?? '');
        $bizErrorMsg = (string)($innerData['errorMsg'] ?? '');
        $msgDataSub = $innerData['msgData'] ?? [];

        if (!$bizSuccess) {
            $this->logError('顺丰业务层下单失败', ['order_sn' => $orderSn, 'errorCode' => $bizErrorCode, 'errorMsg' => $bizErrorMsg]);
            return [
                'code' => 400,
                'msg'  => !empty($bizErrorMsg) ? "顺丰下单未受理: {$bizErrorMsg} ({$bizErrorCode})" : "顺丰业务处理未通过: {$bizErrorCode}",
                'data' => $innerData
            ];
        }

        $waybillNo = '';
        if (!empty($msgDataSub['waybillNoInfoList']) && is_array($msgDataSub['waybillNoInfoList'])) {
            $firstWaybill = $msgDataSub['waybillNoInfoList'][0] ?? [];
            $waybillNo = (string)($firstWaybill['waybillNo'] ?? '');
        }
        if (empty($waybillNo) && !empty($msgDataSub['waybillNo'])) {
            $waybillNo = (string)$msgDataSub['waybillNo'];
        }

        $this->logInfo('顺丰速运下订单成功并获得运单号', ['order_sn' => $orderSn, 'waybill_no' => $waybillNo, 'msgData' => $msgDataSub]);

        return [
            'code' => 200,
            'msg'  => '顺丰预约下单成功',
            'data' => ['waybill_no' => $waybillNo, 'order_sn' => $orderSn, 'return_extra' => $msgDataSub]
        ];
    }

    /**
     * 测试接口连通性 (供后台系统设置面板一键诊断使用)
     *
     * @param array $overrideConfigs 临时传入的新配置 (支持未保存前测试)
     * @return array
     */
    public function testConnection(array $overrideConfigs = []): array
    {
        $partnerId = trim((string)($overrideConfigs['sf_partner_id'] ?? $this->partnerId));
        $checkWord = trim((string)($overrideConfigs['sf_check_word'] ?? $this->checkWord));
        $env = (!empty($overrideConfigs['sf_env']) && in_array($overrideConfigs['sf_env'], ['sandbox', 'prod'], true)) 
            ? $overrideConfigs['sf_env'] 
            : $this->env;
        $signType = (!empty($overrideConfigs['sf_sign_type']) && in_array($overrideConfigs['sf_sign_type'], ['simple', 'standard'], true)) 
            ? $overrideConfigs['sf_sign_type'] 
            : $this->signType;
        $monthlyCard = trim((string)($overrideConfigs['sf_monthly_card'] ?? $this->monthlyCard));

        if (empty($partnerId) || empty($checkWord)) {
            return ['code' => 400, 'msg' => '请先填写顾客编码(partnerID)与校验码(checkWord)后再发起连通测试'];
        }

        $gateway = $env === 'prod' ? self::PROD_GATEWAY : self::SANDBOX_GATEWAY;
        $testData = $this->buildDiagnosticPayload($monthlyCard);
        $msgDataJson = json_encode($testData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $timestamp = (string)round(microtime(true) * 1000);
        $requestId = $this->generateRequestId();

        $appliedSignType = $signType;
        $msgDigest = $this->generateDigest($msgDataJson, $timestamp, $checkWord, $appliedSignType);

        $postData = [
            'partnerID'   => $partnerId,
            'requestID'   => $requestId,
            'serviceCode' => self::SERVICE_CODE,
            'timestamp'   => $timestamp,
            'msgDigest'   => $msgDigest,
            'msgData'     => $msgDataJson
        ];

        $probeRes = $this->probeConnectionWithSignFallback(
            $gateway, $postData, $msgDataJson, $timestamp, $checkWord, $appliedSignType
        );

        if (!$probeRes['success']) {
            return $probeRes['error_response'];
        }

        return $this->parseDiagnosticResult($probeRes['data'], $gateway, $env, $appliedSignType);
    }

    /**
     * 构建接口连通性诊断测试报文
     */
    private function buildDiagnosticPayload(string $monthlyCard): array
    {
        $testData = [
            'language'        => 'zh-CN',
            'orderId'         => 'TEST_DIAG_' . date('YmdHis') . '_' . mt_rand(100, 999),
            'isDocall'        => 0,
            'payMethod'       => 2,
            'expressTypeId'   => 2,
            'contactInfoList' => [
                [
                    'contactType' => 1,
                    'contact'     => '测试用户',
                    'mobile'      => '13800138000',
                    'address'     => '广东省深圳市南山区科技园测试路1号'
                ],
                [
                    'contactType' => 2,
                    'contact'     => '质检测试部',
                    'mobile'      => '13900139000',
                    'address'     => '广东省深圳市南山区高新科技园回收中心'
                ]
            ],
            'cargoDetails'    => [
                ['name' => '连通性测试设备', 'count' => 1]
            ],
            'remark'          => '后台顺丰接口连通性自动化诊断测试'
        ];

        if (!empty($monthlyCard)) {
            $testData['monthlyCard'] = $monthlyCard;
        }

        return $testData;
    }

    /**
     * 探测顺丰网关并自适应签名算法 (simple / standard 自动容灾降级尝试)
     */
    private function probeConnectionWithSignFallback(
        string $gateway, 
        array $postData, 
        string $msgDataJson, 
        string $timestamp, 
        string $checkWord, 
        string &$appliedSignType
    ): array {
        $httpRes = $this->executeHttp($gateway, $postData);
        if (!$httpRes['success']) {
            return [
                'success' => false,
                'error_response' => [
                    'code' => 500,
                    'msg'  => '连接顺丰网关异常：' . $httpRes['msg'],
                    'data' => ['gateway' => $gateway]
                ]
            ];
        }

        $respJson = $httpRes['data'];
        $apiResultCode = (string)($respJson['apiResultCode'] ?? '');
        $apiErrorMsg = (string)($respJson['apiErrorMsg'] ?? '');

        if ($apiResultCode !== 'A1000' && (strpos($apiErrorMsg, '签名') !== false || $apiResultCode === 'A1006')) {
            $fallbackSignType = ($appliedSignType === 'simple') ? 'standard' : 'simple';
            $fallbackDigest = $this->generateDigest($msgDataJson, $timestamp, $checkWord, $fallbackSignType);
            $postData['msgDigest'] = $fallbackDigest;

            $retryHttpRes = $this->executeHttp($gateway, $postData);
            if ($retryHttpRes['success'] && (($retryHttpRes['data']['apiResultCode'] ?? '') === 'A1000')) {
                $appliedSignType = $fallbackSignType;
                $respJson = $retryHttpRes['data'];
                $apiResultCode = 'A1000';
            }
        }

        if ($apiResultCode !== 'A1000') {
            return [
                'success' => false,
                'error_response' => [
                    'code' => 400,
                    'msg'  => '顺丰网关校验未通过：' . ($respJson['apiErrorMsg'] ?? '未知错误') . " (网关代码: {$apiResultCode})",
                    'data' => [
                        'gateway'           => $gateway,
                        'applied_sign_type' => $appliedSignType,
                        'apiResultCode'     => $apiResultCode,
                        'apiErrorMsg'       => $respJson['apiErrorMsg'] ?? '',
                        'apiResponseID'     => $respJson['apiResponseID'] ?? ''
                    ]
                ]
            ];
        }

        return ['success' => true, 'data' => $respJson];
    }

    /**
     * 格式化顺丰连通性测试诊断业务响应
     */
    private function parseDiagnosticResult(array $respJson, string $gateway, string $env, string $appliedSignType): array
    {
        $apiResultData = $respJson['apiResultData'] ?? null;
        if (is_string($apiResultData)) {
            $apiResultData = json_decode($apiResultData, true);
        }

        $success = !empty($apiResultData['success']);
        $errorCode = $apiResultData['errorCode'] ?? '';
        $errorMsg = $apiResultData['errorMsg'] ?? '';

        $testWaybillNo = '';
        if (!empty($apiResultData['msgData']['waybillNoInfoList'][0]['waybillNo'])) {
            $testWaybillNo = $apiResultData['msgData']['waybillNoInfoList'][0]['waybillNo'];
        }

        $signName = ($appliedSignType === 'simple') ? '简易 MD5 模式 (含时间戳)' : '标准 MD5 模式';
        if ($success) {
            return [
                'code' => 200,
                'msg'  => "顺丰速运接口连通测试成功！网关握手与凭证校验均正常（已自动适配【{$signName}】）。" . ($testWaybillNo ? " (生成测试单号: {$testWaybillNo})" : ''),
                'data' => [
                    'gateway'           => $gateway,
                    'env'               => $env,
                    'applied_sign_type' => $appliedSignType,
                    'test_waybill_no'   => $testWaybillNo,
                    'apiResultCode'     => $respJson['apiResultCode'] ?? 'A1000',
                    'apiResultData'     => $apiResultData
                ]
            ];
        }

        return [
            'code' => 400,
            'msg'  => '顺丰网关通信成功，但业务校验返回：' . ($errorMsg ?: '未通过') . ($errorCode ? " [{$errorCode}]" : ''),
            'data' => [
                'gateway'       => $gateway,
                'env'           => $env,
                'errorCode'     => $errorCode,
                'errorMsg'      => $errorMsg,
                'apiResultData' => $apiResultData
            ]
        ];
    }

    /**
     * 发起外部 HTTP cURL 请求
     */
    private function executeHttp(string $url, array $postParams): array
    {
        $ch = curl_init();
        try {
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postParams));
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 3); // 连接超时 3 秒
            curl_setopt($ch, CURLOPT_TIMEOUT, 8);         // 读取超时 8 秒
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/x-www-form-urlencoded;charset=UTF-8'
            ]);

            $raw = curl_exec($ch);
            if ($raw === false) {
                $err = curl_error($ch);
                return ['success' => false, 'msg' => 'cURL 网络连接失败: ' . $err, 'data' => null];
            }

            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            if ($httpCode !== 200) {
                return ['success' => false, 'msg' => "顺丰接口返回 HTTP 状态码: {$httpCode}", 'data' => null];
            }

            $json = json_decode($raw, true);
            if (!is_array($json)) {
                return ['success' => false, 'msg' => '顺丰网关返回非合规 JSON 报文', 'data' => null];
            }

            return ['success' => true, 'msg' => 'success', 'data' => $json];
        } catch (\Throwable $e) {
            return ['success' => false, 'msg' => 'HTTP 请求异常: ' . $e->getMessage(), 'data' => null];
        } finally {
            if (is_resource($ch) || (is_object($ch) && $ch instanceof \CurlHandle)) {
                curl_close($ch);
            }
        }
    }

    /**
     * 处理顺丰速运清单运费推送接口 (EXP_RECE_WAYBILLS_FEE_PUSH)
     * 支持顺丰开放平台控制台【网络测试】秒级绿灯通过，并支持解析快件实际重量和实扣运费记录至回收订单
     * 官方标准回执结构：{"code": 200, "partnerCode": "...", "service": "EXP_RECE_WAYBILLS_FEE_PUSH", "message": "success", "msgData": ""}
     *
     * @param array $params 请求参数 (支持 POST 表单或已解码 JSON 数组)
     * @param string $rawBody 原始请求体 (用于直接 JSON Payload 解析)
     * @return array 顺丰官方标准 JSON 结构
     */
    public function handleWaybillsFeePush(array $params = [], string $rawBody = ''): array
    {
        $incomingDigest = trim((string)($params['msgDigest'] ?? ''));
        $timestamp = trim((string)($params['timestamp'] ?? ''));
        $msgDataRaw = $params['msgData'] ?? null;
        if ($msgDataRaw === null && !empty($rawBody)) {
            $parsedBody = json_decode($rawBody, true);
            if (is_array($parsedBody)) {
                $incomingDigest = trim((string)($parsedBody['msgDigest'] ?? $incomingDigest));
                $timestamp = trim((string)($parsedBody['timestamp'] ?? $timestamp));
                $msgDataRaw = $parsedBody['msgData'] ?? null;
            }
        }
        $msgDataStr = is_string($msgDataRaw) ? $msgDataRaw : (is_array($msgDataRaw) ? json_encode($msgDataRaw, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : '');

        // 仅在包含业务数据且系统已配置校验码时强制验签 (放行顺丰控制台空探测网络测试)
        if (!empty($msgDataStr) && !empty($this->checkWord)) {
            if (!$this->verifyPushSignature($msgDataStr, $timestamp, $incomingDigest)) {
                $this->logInfo('顺丰运费推送数字签名校验未通过，已被安全拦截', [
                    'digest'    => $incomingDigest,
                    'timestamp' => $timestamp
                ]);
                return [
                    'code'        => 403,
                    'partnerCode' => $this->partnerId ?: 'SF_PARTNER',
                    'service'     => self::SERVICE_CODE_FEE_PUSH,
                    'message'     => 'Signature verification failed',
                    'msgData'     => ''
                ];
            }
        }

        list($effectivePartnerCode, $items) = $this->parseFeePushPayload($params, $rawBody);

        foreach ($items as $item) {
            $this->processSingleWaybillFee($item);
        }

        // 无论具体单据处理结果如何，均向顺丰服务端应答 HTTP 200 与官方成功 JSON，防止顺丰反复重试
        return [
            'code'        => 200,
            'partnerCode' => $effectivePartnerCode,
            'service'     => self::SERVICE_CODE_FEE_PUSH,
            'message'     => 'success',
            'msgData'     => ''
        ];
    }

    /**
     * 解析顺丰清单运费推送请求体与待处理清单项
     *
     * @param array $params 请求参数
     * @param string $rawBody 原始请求体
     * @return array [string $effectivePartnerCode, array $items]
     */
    protected function parseFeePushPayload(array $params = [], string $rawBody = ''): array
    {
        $partnerId = trim((string)($params['partnerID'] ?? ($params['partnerCode'] ?? '')));
        $serviceCode = trim((string)($params['serviceCode'] ?? ($params['service'] ?? self::SERVICE_CODE_FEE_PUSH)));
        $effectivePartnerCode = $partnerId ?: ($this->partnerId ?: 'SF_PARTNER');

        // 提取业务 msgData
        $msgDataRaw = $params['msgData'] ?? null;
        if ($msgDataRaw === null && !empty($rawBody)) {
            $parsedBody = json_decode($rawBody, true);
            if (is_array($parsedBody)) {
                $partnerId = trim((string)($parsedBody['partnerID'] ?? ($parsedBody['partnerCode'] ?? $partnerId)));
                $effectivePartnerCode = $partnerId ?: ($this->partnerId ?: 'SF_PARTNER');
                $msgDataRaw = $parsedBody['msgData'] ?? null;
            }
        }

        // 记录顺丰推送接入日志
        $this->logInfo('收到顺丰清单运费推送/网络测试请求', [
            'partnerID'   => $partnerId,
            'serviceCode' => $serviceCode,
            'hasMsgData'  => !empty($msgDataRaw)
        ]);

        if (empty($msgDataRaw)) {
            return [$effectivePartnerCode, []];
        }

        // 解析 msgData 内容 (可能为 JSON 字符串或已解码数组)
        $items = $msgDataRaw;
        if (is_string($items)) {
            $decoded = json_decode($items, true);
            if (is_array($decoded)) {
                $items = $decoded;
            }
        }

        if (!is_array($items) || empty($items)) {
            return [$effectivePartnerCode, []];
        }

        // 若 items 为关联数组 (单条推送)，将其规范化为二维数组
        if (isset($items['orderNo']) || isset($items['waybillNo'])) {
            $items = [$items];
        }

        return [$effectivePartnerCode, $items];
    }

    /**
     * 处理单条顺丰清单运费明细并落库更新
     *
     * @param array $item 单条清单推送项
     * @return void
     */
    protected function processSingleWaybillFee(array $item): void
    {
        if (!is_array($item)) {
            return;
        }

        $orderNo = trim((string)($item['orderNo'] ?? ''));
        $waybillNo = trim((string)($item['waybillNo'] ?? ''));
        $meterageWeight = isset($item['meterageWeightQty']) ? (float)$item['meterageWeightQty'] : 0.0;
        $realWeight = isset($item['realWeightQty']) ? (float)$item['realWeightQty'] : 0.0;
        $feeList = isset($item['feeList']) && is_array($item['feeList']) ? $item['feeList'] : [];

        // 计算该运单顺丰扣费合计金额与明细描述
        $totalFee = 0.0;
        $feeDetails = [];
        foreach ($feeList as $fee) {
            if (!is_array($fee)) continue;
            $feeAmt = isset($fee['feeAmt']) ? (float)$fee['feeAmt'] : 0.0;
            $totalFee += $feeAmt;
            $feeName = trim((string)($fee['feeTypeName'] ?? '运费项'));
            $feeDetails[] = sprintf('%s: ¥%.2f', $feeName, $feeAmt);
        }

        $feeSummary = sprintf(
            '【顺丰运费推送】实重: %.2fkg, 计费重: %.2fkg, 运费合计: ¥%.2f (%s)',
            $realWeight,
            $meterageWeight,
            $totalFee,
            !empty($feeDetails) ? implode('; ', $feeDetails) : '标准运费'
        );

        // 查找关联订单 (根据客户订单号或运单号匹配) 并加锁
        $lockKey = 'sf_fee:' . (!empty($waybillNo) ? $waybillNo : $orderNo);
        $cache = CacheService::getInstance();
        $lockToken = $cache->acquireLock($lockKey, 10);

        try {
            $orderRow = null;
            if (!empty($orderNo)) {
                $orderRow = $this->db->fetch(
                    "SELECT `id`, `order_sn`, `express_sn`, `status`, `user_remark`, `shipping_fee`, `shipping_real_weight`, `shipping_fee_detail` FROM `{$this->p}rc_order` WHERE `order_sn` = :order_sn LIMIT 1",
                    [':order_sn' => $orderNo]
                );
            }
            if (!$orderRow && !empty($waybillNo)) {
                $orderRow = $this->db->fetch(
                    "SELECT `id`, `order_sn`, `express_sn`, `status`, `user_remark`, `shipping_fee`, `shipping_real_weight`, `shipping_fee_detail` FROM `{$this->p}rc_order` WHERE `express_sn` = :waybill_no LIMIT 1",
                    [':waybill_no' => $waybillNo]
                );
            }

            if (!$orderRow) {
                $this->logInfo('收到顺丰运费推送但未匹配到本地订单 (可能是非本系统测试单或外部单号)', [
                    'orderNo'   => $orderNo,
                    'waybillNo' => $waybillNo,
                    'totalFee'  => $totalFee
                ]);
                return;
            }

            $orderId = (int)$orderRow['id'];
            $currentRemark = (string)($orderRow['user_remark'] ?? '');

            // 幂等防重放检查：若本单运费金额与实重已完全一致且运费明细已存在，且备注已追加，则平滑跳过重复更新
            if (
                abs((float)($orderRow['shipping_fee'] ?? 0) - (float)$totalFee) < 0.001 &&
                abs((float)($orderRow['shipping_real_weight'] ?? 0) - (float)$realWeight) < 0.001 &&
                !empty($orderRow['shipping_fee_detail']) &&
                strpos($currentRemark, '【顺丰运费推送】') !== false
            ) {
                $this->logInfo('顺丰运费推送已记录，触发幂等防重放跳过', [
                    'order_id'   => $orderId,
                    'waybill_no' => $waybillNo,
                    'total_fee'  => $totalFee
                ]);
                return;
            }

            // 持久化顺丰运费至订单
            $this->persistWaybillFeeToOrder($orderRow, $waybillNo, $totalFee, $realWeight, $meterageWeight, $feeList, $feeSummary);

            $this->logInfo('顺丰运费推送处理成功并匹配订单', [
                'order_id'    => $orderId,
                'order_sn'    => $orderRow['order_sn'],
                'waybill_no'  => $waybillNo,
                'total_fee'   => $totalFee,
                'real_weight' => $realWeight
            ]);
        } catch (\Throwable $e) {
            $this->logError('处理顺丰运费推送更新订单时异常', [
                'orderNo'   => $orderNo,
                'waybillNo' => $waybillNo,
                'error'     => $e->getMessage()
            ]);
        } finally {
            if ($lockToken !== null) {
                $cache->releaseLock($lockKey, $lockToken);
            }
        }
    }

    /**
     * 将解析后的顺丰实扣运费与快件重量持久化更新至回收订单
     */
    private function persistWaybillFeeToOrder(array $orderRow, string $waybillNo, float $totalFee, float $realWeight, float $meterageWeight, array $feeList, string $feeSummary): void
    {
        $orderId = (int)$orderRow['id'];
        $currentRemark = (string)($orderRow['user_remark'] ?? '');
        $updateFields = [];
        $updateParams = [':id' => $orderId, ':updated_at' => time()];

        if (strpos($currentRemark, '【顺丰运费推送】') === false) {
            $newRemark = trim($currentRemark . ' ' . $feeSummary);
            if (mb_strlen($newRemark, 'UTF-8') > 250) {
                $newRemark = mb_substr($newRemark, 0, 247, 'UTF-8') . '...';
            }
            $updateFields[] = "`user_remark` = :user_remark";
            $updateParams[':user_remark'] = $newRemark;
        }

        if (empty($orderRow['express_sn']) && !empty($waybillNo)) {
            $updateFields[] = "`express_sn` = :express_sn";
            $updateParams[':express_sn'] = $waybillNo;
            $updateFields[] = "`express_company` = '顺丰速运'";
        }

        $updateFields[] = "`shipping_fee` = :shipping_fee";
        $updateParams[':shipping_fee'] = $totalFee;
        $updateFields[] = "`shipping_weight` = :shipping_weight";
        $updateParams[':shipping_weight'] = $meterageWeight;
        $updateFields[] = "`shipping_real_weight` = :shipping_real_weight";
        $updateParams[':shipping_real_weight'] = $realWeight;
        $updateFields[] = "`shipping_fee_detail` = :shipping_fee_detail";
        $updateParams[':shipping_fee_detail'] = json_encode($feeList, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $currentStatus = (string)($orderRow['status'] ?? '');
        if ($currentStatus === 'pending_send') {
            $updateFields[] = "`status` = 'in_transit'";
        }

        if (!empty($updateFields)) {
            $updateFields[] = "`updated_at` = :updated_at";
            $setSql = implode(', ', $updateFields);
            $this->db->execute(
                "UPDATE `{$this->p}rc_order` SET {$setSql} WHERE `id` = :id LIMIT 1",
                $updateParams
            );
        }
    }


    /**
     * 处理顺丰速运增量路由推送接口 (RoutePushService - 速运类API)
     * 官方标准文档：路由推送接口-RoutePushService
     * 支持顺丰开放平台控制台【网络测试】秒级绿灯连通，并支持解析增量物流轨迹并自动推进订单流转
     * 官方 JSON 回执契约：{"return_code": "0000", "return_msg": "成功"}
     *
     * @param array $params 请求参数
     * @param string $rawBody 原始请求体 (application/json)
     * @return array 顺丰官方标准 JSON 结构
     */
    public function handleRoutePush(array $params = [], string $rawBody = ''): array
    {
        $payload = [];
        if (!empty($rawBody)) {
            $jsonDecoded = json_decode($rawBody, true);
            if (is_array($jsonDecoded)) {
                $payload = $jsonDecoded;
            }
        }
        if (empty($payload) && !empty($params)) {
            $payload = $params;
            if (!empty($params['content']) && is_string($params['content'])) {
                $cDecoded = json_decode($params['content'], true);
                if (is_array($cDecoded)) {
                    $payload = $cDecoded;
                }
            }
        }

        $this->logInfo('收到顺丰路由推送/网络测试请求', [
            'hasBody'    => !empty($payload['Body']),
            'raw_length' => strlen($rawBody)
        ]);

        $incomingDigest = trim((string)($params['msgDigest'] ?? ($payload['msgDigest'] ?? '')));
        $timestamp = trim((string)($params['timestamp'] ?? ($payload['timestamp'] ?? '')));
        $bodyData = $payload['Body'] ?? null;
        $bodyStr = is_string($bodyData) ? $bodyData : (is_array($bodyData) ? json_encode($bodyData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : '');

        if (!empty($bodyStr) && !empty($incomingDigest) && !empty($this->checkWord)) {
            if (!$this->verifyPushSignature($bodyStr, $timestamp, $incomingDigest)) {
                $this->logInfo('顺丰路由推送数字签名校验未通过，已被安全拦截');
                return ['return_code' => '4003', 'return_msg' => 'Signature verification failed'];
            }
        }

        $routeList = $payload['Body']['WaybillRoute'] ?? null;
        if (empty($routeList) || !is_array($routeList)) {
            return ['return_code' => '0000', 'return_msg' => '成功'];
        }

        if (isset($routeList['mailno']) || isset($routeList['orderid'])) {
            $routeList = [$routeList];
        }

        foreach ($routeList as $node) {
            $this->processSingleRouteNode($node);
        }

        return ['return_code' => '0000', 'return_msg' => '成功'];
    }

    /**
     * 处理单个顺丰路由节点并追加至回收订单轨迹
     */
    private function processSingleRouteNode(array $node): void
    {
        if (!is_array($node)) return;

        $mailno = trim((string)($node['mailno'] ?? ''));
        $orderid = trim((string)($node['orderid'] ?? ''));
        $acceptTime = trim((string)($node['acceptTime'] ?? date('Y-m-d H:i:s')));
        $acceptAddress = trim((string)($node['acceptAddress'] ?? ''));
        $remark = trim((string)($node['remark'] ?? ''));
        $opCode = trim((string)($node['opCode'] ?? ''));
        $nodeId = trim((string)($node['id'] ?? ''));

        if (empty($mailno) && empty($orderid)) {
            return;
        }

        $lockKey = 'sf_route:' . (!empty($mailno) ? $mailno : $orderid);
        $cache = CacheService::getInstance();
        $lockToken = $cache->acquireLock($lockKey, 10);

        try {
            $orderRow = null;
            if (!empty($orderid)) {
                $orderRow = $this->db->fetch(
                    "SELECT `id`, `order_sn`, `express_sn`, `status`, `shipping_routes` FROM `{$this->p}rc_order` WHERE `order_sn` = :order_sn LIMIT 1",
                    [':order_sn' => $orderid]
                );
            }
            if (!$orderRow && !empty($mailno)) {
                $orderRow = $this->db->fetch(
                    "SELECT `id`, `order_sn`, `express_sn`, `status`, `shipping_routes` FROM `{$this->p}rc_order` WHERE `express_sn` = :mailno LIMIT 1",
                    [':mailno' => $mailno]
                );
            }

            if (!$orderRow) {
                $this->logInfo('收到顺丰路由推送但未匹配到本地订单 (可能是外部测试件)', ['orderid' => $orderid, 'mailno' => $mailno]);
                return;
            }

            $orderId = (int)$orderRow['id'];
            $currentStatus = (string)($orderRow['status'] ?? '');

            $routes = [];
            if (!empty($orderRow['shipping_routes'])) {
                $decoded = json_decode($orderRow['shipping_routes'], true);
                if (is_array($decoded)) {
                    $routes = $decoded;
                }
            }

            $nodeFingerprint = md5($acceptTime . '|' . $opCode . '|' . $remark);
            $exists = false;
            foreach ($routes as $r) {
                if (md5(($r['acceptTime'] ?? '') . '|' . ($r['opCode'] ?? '') . '|' . ($r['remark'] ?? '')) === $nodeFingerprint) {
                    $exists = true;
                    break;
                }
            }

            if (!$exists) {
                $routes[] = [
                    'acceptTime'    => $acceptTime,
                    'acceptAddress' => $acceptAddress,
                    'remark'        => $remark,
                    'opCode'        => $opCode,
                    'id'            => $nodeId
                ];

                usort($routes, function($a, $b) {
                    return strcmp($a['acceptTime'] ?? '', $b['acceptTime'] ?? '');
                });

                $routesJson = json_encode($routes, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                $updateFields = ["`shipping_routes` = :routes", "`updated_at` = :updated_at"];
                $updateParams = [':routes' => $routesJson, ':updated_at' => time(), ':id' => $orderId];

                if (empty($orderRow['express_sn']) && !empty($mailno)) {
                    $updateFields[] = "`express_sn` = :express_sn";
                    $updateParams[':express_sn'] = $mailno;
                    $updateFields[] = "`express_company` = '顺丰速运'";
                }

                if ($opCode === '50' && $currentStatus === 'pending_send') {
                    $updateFields[] = "`status` = 'in_transit'";
                } elseif ($opCode === '80' && in_array($currentStatus, ['pending_send', 'in_transit'], true)) {
                    $updateFields[] = "`status` = 'in_transit'";
                }

                $setSql = implode(', ', $updateFields);
                $this->db->execute("UPDATE `{$this->p}rc_order` SET {$setSql} WHERE `id` = :id LIMIT 1", $updateParams);

                $this->logInfo('顺丰路由轨迹节点追加成功', ['order_id' => $orderId, 'order_sn' => $orderRow['order_sn'], 'mailno' => $mailno, 'opCode' => $opCode]);
            }
        } catch (\Throwable $e) {
            $this->logError('处理顺丰路由推送异常', ['orderid' => $orderid, 'mailno' => $mailno, 'error' => $e->getMessage()]);
        } finally {
            if ($lockToken !== null) {
                $cache->releaseLock($lockKey, $lockToken);
            }
        }
    }

    /**
     * 处理顺丰速运增量订单状态推送接口 (PushOrderState - 速运类API)
     * 官方标准文档：订单状态推送接口-PushOrderState
     * 支持顺丰开放平台控制台【网络测试】秒级绿灯连通，并支持接收顺丰小哥调度、工号、电话及取件状态更新
     * 官方 JSON 回执契约：{"success": "true", "code": "0", "msg": ""}
     *
     * @param array $params 请求参数
     * @param string $rawBody 原始请求体 (application/json)
     * @return array 顺丰官方标准 JSON 结构
     */
    public function handleOrderStatePush(array $params = [], string $rawBody = ''): array
    {
        $payload = [];
        if (!empty($rawBody)) {
            $jsonDecoded = json_decode($rawBody, true);
            if (is_array($jsonDecoded)) {
                $payload = $jsonDecoded;
            }
        }
        if (empty($payload) && !empty($params)) {
            $payload = $params;
            if (!empty($params['content']) && is_string($params['content'])) {
                $cDecoded = json_decode($params['content'], true);
                if (is_array($cDecoded)) {
                    $payload = $cDecoded;
                }
            }
        }

        $this->logInfo('收到顺丰订单状态推送/网络测试请求', [
            'hasOrderState' => !empty($payload['orderState']),
            'raw_length'    => strlen($rawBody)
        ]);

        $incomingDigest = trim((string)($params['msgDigest'] ?? ($payload['msgDigest'] ?? '')));
        $timestamp = trim((string)($params['timestamp'] ?? ($payload['timestamp'] ?? '')));
        $stateData = $payload['orderState'] ?? null;
        $stateStr = is_string($stateData) ? $stateData : (is_array($stateData) ? json_encode($stateData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : '');

        if (!empty($stateStr) && !empty($incomingDigest) && !empty($this->checkWord)) {
            if (!$this->verifyPushSignature($stateStr, $timestamp, $incomingDigest)) {
                $this->logInfo('顺丰订单状态推送数字签名校验未通过，已被安全拦截');
                return ['success' => 'false', 'code' => '403', 'msg' => 'Signature verification failed'];
            }
        }

        $stateList = $payload['orderState'] ?? null;
        if (empty($stateList) || !is_array($stateList)) {
            return ['success' => 'true', 'code' => '0', 'msg' => ''];
        }

        if (isset($stateList['orderNo']) || isset($stateList['waybillNo'])) {
            $stateList = [$stateList];
        }

        foreach ($stateList as $item) {
            $this->processSingleOrderStateItem($item);
        }

        return ['success' => 'true', 'code' => '0', 'msg' => ''];
    }

    /**
     * 处理单个顺丰订单状态节点 (如派单、接单、已揽件)
     */
    private function processSingleOrderStateItem(array $item): void
    {
        if (!is_array($item)) return;

        $orderNo = trim((string)($item['orderNo'] ?? ''));
        $waybillNo = trim((string)($item['waybillNo'] ?? ''));
        $stateCode = trim((string)($item['orderStateCode'] ?? ''));
        $stateDesc = trim((string)($item['orderStateDesc'] ?? ''));
        $empPhone = trim((string)($item['empPhone'] ?? ''));
        $empCode = trim((string)($item['empCode'] ?? ''));

        if (empty($orderNo) && empty($waybillNo)) {
            return;
        }

        $lockKey = 'sf_state:' . (!empty($waybillNo) ? $waybillNo : $orderNo);
        $cache = CacheService::getInstance();
        $lockToken = $cache->acquireLock($lockKey, 10);

        try {
            $orderRow = null;
            if (!empty($orderNo)) {
                $orderRow = $this->db->fetch(
                    "SELECT `id`, `order_sn`, `express_sn`, `status`, `shipping_courier_phone`, `shipping_courier_name`, `shipping_dispatch_status` FROM `{$this->p}rc_order` WHERE `order_sn` = :order_sn LIMIT 1",
                    [':order_sn' => $orderNo]
                );
            }
            if (!$orderRow && !empty($waybillNo)) {
                $orderRow = $this->db->fetch(
                    "SELECT `id`, `order_sn`, `express_sn`, `status`, `shipping_courier_phone`, `shipping_courier_name`, `shipping_dispatch_status` FROM `{$this->p}rc_order` WHERE `express_sn` = :waybill_no LIMIT 1",
                    [':waybill_no' => $waybillNo]
                );
            }

            if (!$orderRow) {
                $this->logInfo('收到顺丰订单状态推送但未匹配到本地订单', ['orderNo' => $orderNo, 'waybillNo' => $waybillNo]);
                return;
            }

            $orderId = (int)$orderRow['id'];
            $currentStatus = (string)($orderRow['status'] ?? '');
            $updateFields = [];
            $updateParams = [':id' => $orderId, ':updated_at' => time()];

            if (!empty($stateDesc)) {
                $updateFields[] = "`shipping_dispatch_status` = :dispatch_status";
                $updateParams[':dispatch_status'] = $stateDesc;
            }
            if (!empty($empPhone)) {
                $updateFields[] = "`shipping_courier_phone` = :emp_phone";
                $updateParams[':emp_phone'] = $empPhone;
            }
            if (!empty($empCode)) {
                $updateFields[] = "`shipping_courier_name` = :emp_code";
                $updateParams[':emp_code'] = "顺丰小哥({$empCode})";
            }
            if (empty($orderRow['express_sn']) && !empty($waybillNo)) {
                $updateFields[] = "`express_sn` = :express_sn";
                $updateParams[':express_sn'] = $waybillNo;
                $updateFields[] = "`express_company` = '顺丰速运'";
            }
            if (in_array($stateCode, ['30', '31', '33'], true) && $currentStatus === 'pending_send') {
                $updateFields[] = "`status` = 'in_transit'";
            }

            if (!empty($updateFields)) {
                $updateFields[] = "`updated_at` = :updated_at";
                $setSql = implode(', ', $updateFields);
                $this->db->execute("UPDATE `{$this->p}rc_order` SET {$setSql} WHERE `id` = :id LIMIT 1", $updateParams);
            }

            $this->logInfo('顺丰订单状态推送处理成功', ['order_id' => $orderId, 'order_sn' => $orderRow['order_sn'], 'stateCode' => $stateCode]);
        } catch (\Throwable $e) {
            $this->logError('处理顺丰订单状态推送异常', ['orderNo' => $orderNo, 'waybillNo' => $waybillNo, 'error' => $e->getMessage()]);
        } finally {
            if ($lockToken !== null) {
                $cache->releaseLock($lockKey, $lockToken);
            }
        }
    }

    /**
     * 记录顺丰业务正常运行日志
     */
    public function logInfo(string $title, array $context): void
    {
        try {
            $logDir = dirname(__DIR__, 2) . '/runtime/logs';
            if (!is_dir($logDir)) {
                @mkdir($logDir, 0755, true);
            }
            $file = $logDir . '/sf_express_' . date('Y-m-d') . '.log';
            $line = '[' . date('Y-m-d H:i:s') . '] [INFO] ' . $title . ' ' . json_encode($context, JSON_UNESCAPED_UNICODE) . "\n";
            @file_put_contents($file, $line, FILE_APPEND | LOCK_EX);
        } catch (\Throwable $t) {
            // 静默容错
        }
    }

    /**
     * 记录顺丰接口错误日志
     */
    private function logError(string $title, array $context): void
    {
        try {
            $logDir = dirname(__DIR__, 2) . '/runtime/logs';
            if (!is_dir($logDir)) {
                @mkdir($logDir, 0755, true);
            }
            $file = $logDir . '/sf_express_' . date('Y-m-d') . '.log';
            $line = '[' . date('Y-m-d H:i:s') . '] [ERROR] ' . $title . ' ' . json_encode($context, JSON_UNESCAPED_UNICODE) . "\n";
            @file_put_contents($file, $line, FILE_APPEND | LOCK_EX);
        } catch (\Throwable $t) {
            // 静默容错
        }
    }
}
