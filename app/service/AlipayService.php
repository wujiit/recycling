<?php
/**
 * 启灵同城服务系统 - 支付宝商家转账服务 (OpenAPI 标准版)
 * 支持单笔转账 (alipay.fund.trans.uni.transfer)、转账状态查询与账户余额查询
 */

namespace App\Service;

use App\Model\Database;
use App\Helper\Str;

class AlipayService
{
    /** @var Database */
    private $db;
    /** @var string */
    private $p;

    /** 生产网关与沙箱网关 */
    public const PROD_GATEWAY = 'https://openapi.alipay.com/gateway.do';
    public const SANDBOX_GATEWAY = 'https://openapi-sandbox.dl.alipaydev.com/gateway.do';

    /** 配置项 */
    private $enabled = false;
    private $isSandbox = false;
    private $signMode = 'cert'; // 'cert' 证书模式(官方强制推荐) 或 'normal' 普通公钥模式
    private $appId = '';
    private $privateKey = '';
    private $appCertContent = '';         // 应用公钥证书 (appCertPublicKey_*.crt)
    private $alipayPublicCertContent = ''; // 支付宝公钥证书 (alipayCertPublicKey_RSA2.crt)
    private $alipayRootCertContent = '';   // 支付宝根证书 (alipayRootCert.crt)
    private $publicKey = '';               // 兼容普通模式支付宝公钥
    private $orderTitlePrefix = '二手回收款项结算';
    private $transferSceneName = '二手回收';       // 支付宝 2026 合规转账业务场景 (必填: 二手回收 / 业务结算 等)
    private $transferSceneInfoType = '';          // 选填: 自定义场景信息类型 (默认自动使用 {$transferSceneName}说明)
    private $reportGoodsName = '二手闲置设备';     // 统一合规报备商品名 (防范前台特殊字符/敏感词被拒)

    /** 证书序列号运行时缓存 */
    private $appCertSN = '';
    private $alipayRootCertSN = '';

    public function __construct(array $runtimeConfigs = [])
    {
        $this->db = Database::getInstance();
        $this->p = $this->db->getPrefix();
        $this->loadConfigs($runtimeConfigs);
    }

    /**
     * 从 sys_config 载入支付宝配置 (支持证书与普通公钥双模及运行时动态传参)
     */
    private function loadConfigs(array $runtimeConfigs = []): void
    {
        try {
            $sql = "SELECT `config_key`, `config_value` FROM `{$this->p}sys_config` 
                    WHERE `config_key` IN (
                        'alipay_enabled', 
                        'alipay_sandbox', 
                        'alipay_sign_type',
                        'alipay_appid', 
                        'alipay_private_key', 
                        'alipay_app_cert',
                        'alipay_public_cert',
                        'alipay_root_cert',
                        'alipay_public_key', 
                        'alipay_order_title_prefix',
                        'alipay_transfer_scene_name',
                        'alipay_transfer_scene_info_type',
                        'alipay_report_goods_name'
                    )";
            $rows = $this->db->fetchAll($sql);
            $cfgs = [];
            foreach ($rows as $r) {
                $cfgs[$r['config_key']] = $r['config_value'];
            }

            // 合并运行时传入的配置 (优先于数据库)
            if (!empty($runtimeConfigs)) {
                foreach ($runtimeConfigs as $k => $v) {
                    if ($v !== null && $v !== '') {
                        $cfgs[$k] = $v;
                    }
                }
            }

            $this->enabled = !empty($cfgs['alipay_enabled']) && $cfgs['alipay_enabled'] !== '0';
            $this->isSandbox = false; // 正式商业运营强制锁定官方生产网关，彻底避免误开沙箱导致打款停摆
            $this->signMode = !empty($cfgs['alipay_sign_type']) ? trim((string)$cfgs['alipay_sign_type']) : 'cert';
            $this->appId = trim((string)($cfgs['alipay_appid'] ?? ''));
            $this->privateKey = trim((string)($cfgs['alipay_private_key'] ?? ''));
            $this->appCertContent = trim((string)($cfgs['alipay_app_cert'] ?? ''));
            $this->alipayPublicCertContent = trim((string)($cfgs['alipay_public_cert'] ?? ''));
            $this->alipayRootCertContent = trim((string)($cfgs['alipay_root_cert'] ?? ''));
            $this->publicKey = trim((string)($cfgs['alipay_public_key'] ?? ''));

            // 智能自适应识别：若在旧版 public_key 中贴了证书，自动作为支付宝公钥证书并开启证书模式
            if (empty($this->alipayPublicCertContent) && strpos($this->publicKey, 'BEGIN CERTIFICATE') !== false) {
                $this->alipayPublicCertContent = $this->publicKey;
                $this->signMode = 'cert';
            }
            if (!empty($this->appCertContent)) {
                $this->signMode = 'cert';
            }

            if (!empty($cfgs['alipay_order_title_prefix'])) {
                $this->orderTitlePrefix = trim((string)$cfgs['alipay_order_title_prefix']);
            }
            if (!empty($cfgs['alipay_transfer_scene_name'])) {
                $this->transferSceneName = trim((string)$cfgs['alipay_transfer_scene_name']);
            }
            if (!empty($cfgs['alipay_transfer_scene_info_type'])) {
                $this->transferSceneInfoType = trim((string)$cfgs['alipay_transfer_scene_info_type']);
            }
            if (!empty($cfgs['alipay_report_goods_name'])) {
                $this->reportGoodsName = trim((string)$cfgs['alipay_report_goods_name']);
            }
        } catch (\Throwable $e) {
            // 静默容灾
        }
    }

    /**
     * 获取当前生效网关地址 (固定官方生产网关)
     */
    public function getGatewayUrl(): string
    {
        return self::PROD_GATEWAY;
    }

    /**
     * 判断是否处于证书模式
     */
    public function isCertMode(): bool
    {
        return $this->signMode === 'cert' || !empty($this->appCertContent) || strpos($this->alipayPublicCertContent, 'BEGIN CERTIFICATE') !== false;
    }

    /**
     * 检查是否已配置必要参数
     */
    public function isConfigured(): bool
    {
        if (empty($this->appId) || empty($this->privateKey)) {
            return false;
        }
        if ($this->isCertMode()) {
            return !empty($this->appCertContent);
        }
        return true;
    }

    /**
     * 是否处于沙箱/模拟测试模式
     */
    public function isSandbox(): bool
    {
        return $this->isSandbox;
    }

    /**
     * 构建支付宝单笔转账的 biz_content 标准载荷
     * 接口: alipay.fund.trans.uni.transfer
     *
     * @param string $outBizNo 商户唯一放款单据号
     * @param float $amount 放款金额(元)
     * @param string $payeeAccount 收款方支付宝账号(手机号或邮箱)
     * @param string $payeeName 收款方真实姓名(强实名核验)
     * @param string $orderTitle 标题
     * @param string $remark 备注
     * @return array
     */
    /**
     * 构建支付宝单笔转账的 biz_content 标准载荷
     * 接口: alipay.fund.trans.uni.transfer
     *
     * @param string $outBizNo 商户唯一放款单据号
     * @param float $amount 放款金额(元)
     * @param string $payeeAccount 收款方支付宝账号(手机号或邮箱)
     * @param string $payeeName 收款方真实姓名(强实名核验)
     * @param string $orderTitle 标题
     * @param string $remark 备注
     * @param string|null $overrideInfoType 覆盖指定场景上报类型
     * @return array
     */
    public function buildTransferBizContent(
        string $outBizNo,
        float $amount,
        string $payeeAccount,
        string $payeeName = '',
        string $orderTitle = '',
        string $remark = '',
        ?string $overrideInfoType = null
    ): array {
        $finalTitle = !empty($orderTitle) ? $orderTitle : $this->orderTitlePrefix;
        if (Str::length($finalTitle) > 30) {
            $finalTitle = Str::substr($finalTitle, 0, 30);
        }

        $cleanAccount = trim($payeeAccount);
        // 智能判断收款方账号标识类型: 2088开头的16位纯数字为 ALIPAY_USER_ID，否则为 ALIPAY_LOGON_ID (手机或邮箱)
        $identityType = 'ALIPAY_LOGON_ID';
        if (preg_match('/^2088\d{12}$/', $cleanAccount)) {
            $identityType = 'ALIPAY_USER_ID';
        }

        $sceneName = !empty($this->transferSceneName) ? $this->transferSceneName : '二手回收';

        // 确定用于向支付宝报备的合规商品品名 (info_content)：
        // 核心安全原则：绝不能把前台花样繁多、包含特殊字符、卡贴、渠道、私制或未知敏感词的具体商品名称裸露直接上报给支付宝支付网关！
        // 必须使用统一合规、经过金融风控认可的通用业务名称（优先使用系统配置的 reportGoodsName，默认“二手闲置设备”）
        // 避免因商品标题特殊字符或超长导致转账失败
        $itemDesc = !empty($this->reportGoodsName) ? $this->reportGoodsName : '二手闲置设备';

        // 确定合规上报类型 info_type:
        // 1. 若显式传入 overrideInfoType (如自动探测中)，优先使用
        // 2. 否则若系统配置了 transferSceneInfoType，使用配置值
        // 3. 否则在“二手回收”场景下，官方标准固定值为“回收商品名称”
        // 4. 其他场景默认使用“{场景名}说明”
        if ($overrideInfoType !== null && $overrideInfoType !== '') {
            $effectiveInfoType = $overrideInfoType;
        } elseif (!empty($this->transferSceneInfoType)) {
            $effectiveInfoType = $this->transferSceneInfoType;
        } elseif ($sceneName === '二手回收') {
            $effectiveInfoType = '回收商品名称';
        } else {
            $effectiveInfoType = $sceneName . '说明';
        }

        $reportInfos = [
            [
                'info_type'    => $effectiveInfoType,
                'info_content' => Str::substr($itemDesc, 0, 50),
            ]
        ];

        $bizContent = [
            'out_biz_no'                  => $outBizNo,
            'trans_amount'                => sprintf('%.2f', $amount),
            'product_code'                => 'TRANS_ACCOUNT_NO_PWD', // 单笔无密转账到支付宝账户标准产品码
            'biz_scene'                   => 'DIRECT_TRANSFER',      // 业务场景: 单笔无密转账
            'order_title'                 => $finalTitle,
            'transfer_scene_name'         => $sceneName,              // 支付宝 2026 合规要求必传场景名称
            'transfer_scene_report_infos' => $reportInfos,            // 支付宝 2026 合规要求必传场景补充信息
            'payee_info'                  => [
                'identity'      => $cleanAccount,
                'identity_type' => $identityType,
            ],
            'remark'                      => !empty($remark) ? Str::substr($remark, 0, 50) : '二手回收放款'
        ];

        // 强实名核验: 只要提供了户名，严格写入触发支付宝实名核验，杜绝输错账号
        if (!empty($payeeName)) {
            $bizContent['payee_info']['name'] = trim($payeeName);
        }

        return $bizContent;
    }

    /**
     * 组装并签名标准 OpenAPI 公共入参
     *
     * @param string $method 接口名称
     * @param array $bizContent 业务参数
     * @return array 包含完整请求参数与签名
     */
    public function buildSignedRequest(string $method, array $bizContent): array
    {
        $params = [
            'app_id'      => $this->appId,
            'method'      => $method,
            'format'      => 'JSON',
            'charset'     => 'utf-8',
            'sign_type'   => 'RSA2',
            'timestamp'   => date('Y-m-d H:i:s'),
            'version'     => '1.0',
            'biz_content' => json_encode($bizContent, JSON_UNESCAPED_UNICODE)
        ];

        // 证书模式下注入证书序列号 (app_cert_sn 与 alipay_root_cert_sn 必须参与字典序签名)
        if ($this->isCertMode()) {
            $appCertSN = $this->getAppCertSN();
            if (!empty($appCertSN)) {
                $params['app_cert_sn'] = $appCertSN;
            }
            $rootCertSN = $this->getRootCertSN();
            if (!empty($rootCertSN)) {
                $params['alipay_root_cert_sn'] = $rootCertSN;
            }
        }

        // 真实签名生成 (按字典序参与 RSA2 签名)
        if (!empty($this->privateKey)) {
            $params['sign'] = $this->generateSign($params, $this->privateKey);
        } else {
            $params['sign'] = '[请在系统设置中配置商户应用私钥以生成真实RSA2签名]';
        }

        return $params;
    }

    /**
     * 生成接口入参报文预览数据 (基于订单真实收款人、真实金额与真实参数)
     */
    public function previewTransferPayload(
        string $outBizNo,
        float $amount,
        string $payeeAccount,
        string $payeeName = '',
        string $orderTitle = '',
        string $remark = ''
    ): array {
        $bizContent = $this->buildTransferBizContent($outBizNo, $amount, $payeeAccount, $payeeName, $orderTitle, $remark);
        $fullParams = $this->buildSignedRequest('alipay.fund.trans.uni.transfer', $bizContent);

        return [
            'api_name'          => 'alipay.fund.trans.uni.transfer',
            'api_desc'          => '支付宝单笔转账接口 (商家转账到支付宝账户)',
            'doc_url'           => 'https://opendocs.alipay.com/open/62987723_alipay.fund.trans.uni.transfer',
            'gateway_url'       => $this->getGatewayUrl(),
            'is_sandbox'        => $this->isSandbox,
            'is_configured'     => $this->isConfigured(),
            'http_method'       => 'POST',
            'content_type'      => 'application/x-www-form-urlencoded;charset=utf-8',
            'common_params'     => [
                'app_id'    => $fullParams['app_id'] ?: '[未配置AppID]',
                'method'    => $fullParams['method'],
                'format'    => $fullParams['format'],
                'charset'   => $fullParams['charset'],
                'sign_type' => $fullParams['sign_type'],
                'timestamp' => $fullParams['timestamp'],
                'version'   => $fullParams['version'],
            ],
            'biz_content'       => $bizContent,
            'biz_content_json'  => $fullParams['biz_content'],
            'sign'              => $fullParams['sign'],
            'full_request_form' => $fullParams,
            'expected_response' => [
                'alipay_fund_trans_uni_transfer_response' => [
                    'code'              => '10000',
                    'msg'               => 'Success',
                    'out_biz_no'        => $outBizNo,
                    'order_id'          => '[支付宝网关实时返回单据号]',
                    'pay_fund_order_id' => '[支付宝网关实时返回资金流水号]',
                    'status'            => 'SUCCESS',
                    'trans_date'        => date('Y-m-d H:i:s')
                ],
                'note' => '说明：此为支付宝官方 OpenAPI 标准成功响应报文结构规范，真实转账时由支付宝网关实时返回单号'
            ]
        ];
    }

    /**
     * 执行支付宝单笔转账出资 (100% 真实请求官方网关)
     *
     * @param string $outBizNo 商户唯一放款单号
     * @param float $amount 金额 (来自订单真实核定金额)
     * @param string $payeeAccount 收款支付宝账号 (来自用户真实填写)
     * @param string $payeeName 收款人真实姓名 (来自用户真实填写)
     * @param string $orderTitle 标题
     * @param string $remark 备注
     * @return array ['success' => bool, 'order_id' => string, 'msg' => string, 'raw' => array]
     */
    public function transfer(
        string $outBizNo,
        float $amount,
        string $payeeAccount,
        string $payeeName = '',
        string $orderTitle = '',
        string $remark = ''
    ): array {
        // 参数真实性严格前置校验
        if ($amount <= 0) {
            return ['success' => false, 'order_id' => '', 'out_biz_no' => $outBizNo, 'msg' => '转账出资金额必须大于 0 元'];
        }
        if (empty($payeeAccount)) {
            return ['success' => false, 'order_id' => '', 'out_biz_no' => $outBizNo, 'msg' => '客户真实支付宝收款账号为空，无法发起转账'];
        }
        if (empty($payeeName)) {
            return ['success' => false, 'order_id' => '', 'out_biz_no' => $outBizNo, 'msg' => '收款人真实姓名为空，支付宝强制要求强实名一致性校验，无法出资'];
        }

        // 校验商户凭据是否真实配置
        if (!$this->isConfigured()) {
            return [
                'success'    => false,
                'order_id'   => '',
                'out_biz_no' => $outBizNo,
                'msg'        => '未配置支付宝开放平台 AppID 或商户应用私钥，无法向支付宝网关发起真实转账出资，请前往【系统设置】填写真实参数'
            ];
        }

        $bizContent = $this->buildTransferBizContent($outBizNo, $amount, $payeeAccount, $payeeName, $orderTitle, $remark);
        $params = $this->buildSignedRequest('alipay.fund.trans.uni.transfer', $bizContent);

        // 真实向支付宝 OpenAPI 网关发起请求
        $res = $this->executeHttp($this->getGatewayUrl(), $params);

        if (!$res['success']) {
            return ['success' => false, 'order_id' => '', 'out_biz_no' => $outBizNo, 'msg' => '支付宝网关通信失败: ' . $res['msg']];
        }

        $responseKey = 'alipay_fund_trans_uni_transfer_response';
        $body = $res['data'][$responseKey] ?? null;
        if (!$body || !is_array($body)) {
            return ['success' => false, 'order_id' => '', 'out_biz_no' => $outBizNo, 'msg' => '支付宝网关响应异常，未解析到标准数据'];
        }

        $code = (string)($body['code'] ?? '');
        $status = (string)($body['status'] ?? '');
        $orderId = (string)($body['order_id'] ?? '');
        $actualBizNo = $outBizNo;
        $subCode = (string)($body['sub_code'] ?? $code);

        // 针对 TRANSFER_SCENE_REPORT_INFO_ILLEGAL 自动尝试备选场景类型
        if ($subCode === 'TRANSFER_SCENE_REPORT_INFO_ILLEGAL' && empty($this->transferSceneInfoType)) {
            $probeResult = $this->probeSceneReportCandidates($outBizNo, $amount, $payeeAccount, $payeeName, $orderTitle, $remark, $responseKey);
            if ($probeResult !== null) {
                $body = $probeResult['body'];
                $code = $probeResult['code'];
                $status = $probeResult['status'];
                $orderId = $probeResult['order_id'];
                $actualBizNo = $probeResult['actual_biz_no'];
                $subCode = $probeResult['sub_code'];
            }
        }

        // 10000 且 SUCCESS 表示真实到账
        if ($code === '10000' && $status === 'SUCCESS') {
            if (empty($this->transferSceneInfoType)) {
                $this->saveSuccessfulInfoType('回收商品名称');
            }
            return [
                'success'           => true,
                'out_biz_no'        => $actualBizNo,
                'order_id'          => $orderId,
                'pay_fund_order_id' => (string)($body['pay_fund_order_id'] ?? ''),
                'status'            => 'SUCCESS',
                'msg'               => '支付宝转账成功，款项已真实到账客户支付宝账户',
                'raw'               => $body
            ];
        }

        // 处理中状态 (DEALING): 自动反查一次
        if ($code === '10000' && $status === 'DEALING') {
            $queryRes = $this->queryTransfer($actualBizNo, $orderId);
            if ($queryRes['success'] && $queryRes['status'] === 'SUCCESS') {
                return [
                    'success'           => true,
                    'out_biz_no'        => $actualBizNo,
                    'order_id'          => $orderId,
                    'pay_fund_order_id' => (string)($queryRes['raw']['pay_fund_order_id'] ?? ''),
                    'status'            => 'SUCCESS',
                    'msg'               => '转账处理完毕并已成功入账客户账户',
                    'raw'               => $queryRes['raw'] ?? $body
                ];
            }
            return [
                'success'    => true,
                'out_biz_no' => $actualBizNo,
                'order_id'   => $orderId,
                'status'     => 'DEALING',
                'msg'        => '支付宝转账正在处理中 (DEALING)，系统将自动跟踪单据状态',
                'raw'        => $body
            ];
        }

        // 真实失败信息透传与智能排查指引
        $subCode = $body['sub_code'] ?? $code;
        $subMsg = $this->enrichSubErrorMsg($subCode, $body['sub_msg'] ?? ($body['msg'] ?? '转账被支付宝网关拒绝'));
        return [
            'success'    => false,
            'out_biz_no' => $actualBizNo,
            'order_id'   => $orderId,
            'status'     => 'FAIL',
            'sub_code'   => $subCode,
            'msg'        => "支付宝出资失败 [{$subCode}]: {$subMsg}",
            'raw'        => $body
        ];
    }

    /**
     * 获取指定场景的合规上报类型有序候选清单
     */

    /**
     * 当首选场景被支付宝网关拒绝时，自动尝试商户可用的候选场景类型
     */
    private function probeSceneReportCandidates(
        string $outBizNo,
        float $amount,
        string $payeeAccount,
        string $payeeName,
        string $orderTitle,
        string $remark,
        string $responseKey
    ): ?array {
        $candidates = $this->getSceneReportCandidates($this->transferSceneName ?: '二手回收');
        foreach ($candidates as $idx => $candidateType) {
            if ($candidateType === '回收商品名称') {
                continue;
            }
            $probeBizNo = Str::substr($outBizNo, 0, 54) . '_c' . ($idx + 1);
            $probeBizContent = $this->buildTransferBizContent($probeBizNo, $amount, $payeeAccount, $payeeName, $orderTitle, $remark, $candidateType);
            $probeParams = $this->buildSignedRequest('alipay.fund.trans.uni.transfer', $probeBizContent);
            $probeRes = $this->executeHttp($this->getGatewayUrl(), $probeParams);
            if (!$probeRes['success'] || !isset($probeRes['data'][$responseKey])) {
                continue;
            }
            $probeBody = $probeRes['data'][$responseKey];
            $probeCode = (string)($probeBody['code'] ?? '');
            $probeStatus = (string)($probeBody['status'] ?? '');
            if ($probeCode === '10000' && ($probeStatus === 'SUCCESS' || $probeStatus === 'DEALING')) {
                $this->saveSuccessfulInfoType($candidateType);
                return [
                    'body'          => $probeBody,
                    'code'          => $probeCode,
                    'status'        => $probeStatus,
                    'order_id'      => (string)($probeBody['order_id'] ?? ''),
                    'actual_biz_no' => $probeBizNo,
                    'sub_code'      => (string)($probeBody['sub_code'] ?? $probeCode)
                ];
            }
            $probeSubCode = (string)($probeBody['sub_code'] ?? $probeCode);
            if ($probeSubCode !== 'TRANSFER_SCENE_REPORT_INFO_ILLEGAL') {
                return [
                    'body'          => $probeBody,
                    'code'          => $probeCode,
                    'status'        => $probeStatus,
                    'order_id'      => (string)($probeBody['order_id'] ?? ''),
                    'actual_biz_no' => $probeBizNo,
                    'sub_code'      => $probeSubCode
                ];
            }
        }
        return null;
    }

    /**
     * 根据支付宝网关错误码补充友好的排查指导建议
     */
    private function enrichSubErrorMsg(string $subCode, string $subMsg): string
    {
        if ($subCode === 'TRANSFER_SCENE_NAME_BLANK' || $subCode === 'TRANSFER_SCENE_ILLEGAL' || $subCode === 'TRANSFER_SCENE_NAME_ILLEGAL') {
            $subMsg .= ' (排查建议：转账场景名称与商户后台不匹配。请登录【支付宝商家平台 b.alipay.com -> 资金管理 -> 转账场景】，查看您已生效的场景名称。若您已申明为“业务结算”，请在系统设置中将场景切换为“业务结算”再测试；若需使用“二手回收”，请在商家平台点击申明/新增“二手回收”)';
        } elseif (stripos($subMsg, 'transfer_scene_report_infos') !== false || $subCode === 'TRANSFER_SCENE_REPORT_INFO_ILLEGAL') {
            $subMsg .= ' (排查建议：转账场景上报信息有误。系统已自动按官方“二手回收”规范组装【回收商品名称】。若您在支付宝商家平台申明了其他场景或有特殊配置，请在【系统设置】切换对应场景或填写自定义场景上报类型)';
        } elseif ($subCode === 'PAYEE_NOT_EXIST') {
            $subMsg .= ' (排查建议：1. 确认该手机号/邮箱已开通支付宝且已完成实名认证；2. 填写的收款人姓名必须与支付宝App中绑定的【身份证法定中文姓名】100%一致，不能填昵称或错别字)';
        } elseif (stripos($subMsg, '验签出错') !== false || stripos($subMsg, '签名私钥与应用公钥是否匹配') !== false) {
            $subMsg .= ' (排查建议：开放平台应用为【公钥证书模式】，请确保已在【系统设置】粘贴应用公钥证书 appCertPublicKey.crt 与支付宝公钥证书，且应用私钥与证书配套)';
        }
        return $subMsg;
    }

    private function getSceneReportCandidates(string $sceneName): array
    {
        if ($sceneName === '二手回收') {
            return [
                '回收商品名称',        // 官方标准规范 (Ping++ / 开放平台统一标准)
                '向用户支付物品回收款', // 商家后台申明用途文案
                '二手回收',           // 场景名直传
                '二手回收说明',       // 通用说明格式
                '回收物品名称',       // 备用文本
            ];
        }
        return [
            $sceneName . '说明',
            $sceneName
        ];
    }

    /**
     * 当探测到可用的场景上报信息类型成功打款后，将该类型持久化至 sys_config
     */
    private function saveSuccessfulInfoType(string $infoType): void
    {
        try {
            $sql = "INSERT INTO `{$this->p}sys_config` (`group_name`, `config_key`, `config_value`, `updated_at`) 
                    VALUES ('payout', 'alipay_transfer_scene_info_type', ?, ?) 
                    ON DUPLICATE KEY UPDATE `config_value` = VALUES(`config_value`), `updated_at` = VALUES(`updated_at`)";
            $this->db->execute($sql, [$infoType, time()]);
            $this->transferSceneInfoType = $infoType;
            if (class_exists('\\App\\Service\\CacheService')) {
                \App\Service\CacheService::getInstance()->delete('sys_config:all');
            }
        } catch (\Throwable $e) {
            // 静默容灾
        }
    }

    /**
     * 查询转账业务单据真实状态
     * 接口: alipay.fund.trans.common.query
     */
    public function queryTransfer(string $outBizNo, string $orderId = ''): array
    {
        if (!$this->isConfigured()) {
            return [
                'success' => false,
                'status'  => 'UNKNOWN',
                'msg'     => '未配置支付宝商户凭据，无法向网关查询单据状态'
            ];
        }

        $bizContent = [
            'product_code' => 'TRANS_ACCOUNT_NO_PWD',
            'biz_scene'    => 'DIRECT_TRANSFER',
            'out_biz_no'   => $outBizNo
        ];
        if (!empty($orderId)) {
            $bizContent['order_id'] = $orderId;
        }

        $params = $this->buildSignedRequest('alipay.fund.trans.common.query', $bizContent);
        $res = $this->executeHttp($this->getGatewayUrl(), $params);

        if (!$res['success']) {
            return ['success' => false, 'status' => 'UNKNOWN', 'msg' => $res['msg']];
        }

        $body = $res['data']['alipay_fund_trans_common_query_response'] ?? [];
        $code = (string)($body['code'] ?? '');
        $status = (string)($body['status'] ?? '');

        if ($code === '10000') {
            return [
                'success'  => true,
                'status'   => $status,
                'order_id' => (string)($body['order_id'] ?? ''),
                'msg'      => '单据状态: ' . $status,
                'raw'      => $body
            ];
        }

        return [
            'success' => false,
            'status'  => 'FAIL',
            'msg'     => $body['sub_msg'] ?? ($body['msg'] ?? '单据查询失败'),
            'raw'     => $body
        ];
    }

    /**
     * 真实查询企业支付宝资金账户资产可用余额
     * 接口: alipay.fund.account.query
     */
    public function queryAccountBalance(string $accountType = 'ACCTRANS_ACCOUNT'): array
    {
        if (!$this->isConfigured()) {
            return [
                'success'          => false,
                'available_amount' => '0.00',
                'freeze_amount'    => '0.00',
                'msg'              => '未配置支付宝商户 AppID 或应用私钥，无法查询真实资金余额，请在系统设置中配置真实凭据'
            ];
        }

        $bizContent = [
            'account_type' => $accountType // ACCTRANS_ACCOUNT: 商家资金专户; ALIPAYACCOUNT: 支付宝余额户
        ];

        $params = $this->buildSignedRequest('alipay.fund.account.query', $bizContent);
        $res = $this->executeHttp($this->getGatewayUrl(), $params);

        if (!$res['success']) {
            return [
                'success'          => false,
                'available_amount' => '0.00',
                'freeze_amount'    => '0.00',
                'msg'              => '网关通信失败: ' . $res['msg']
            ];
        }

        $body = $res['data']['alipay_fund_account_query_response'] ?? [];
        $code = (string)($body['code'] ?? '');

        if ($code === '10000') {
            return [
                'success'          => true,
                'available_amount' => (string)($body['available_amount'] ?? '0.00'),
                'freeze_amount'    => (string)($body['freeze_amount'] ?? '0.00'),
                'msg'              => '支付宝商户账户真实余额查询成功'
            ];
        }

        $errMsg = $body['sub_msg'] ?? ($body['msg'] ?? '余额查询失败');
        if (stripos($errMsg, '验签出错') !== false || stripos($errMsg, '签名私钥与应用公钥是否匹配') !== false) {
            $errMsg .= ' (排查建议：开放平台应用为【公钥证书模式】，请确保已在【系统设置】粘贴应用公钥证书 appCertPublicKey.crt 与支付宝公钥证书，且商户应用私钥为配套私钥)';
        }

        return [
            'success'          => false,
            'available_amount' => '0.00',
            'freeze_amount'    => '0.00',
            'msg'              => $errMsg
        ];
    }

    /**
     * 生成 RSA2 (SHA256withRSA) 标准签名
     */
    private function generateSign(array $params, string $privateKey): string
    {
        ksort($params);
        $pairs = [];
        foreach ($params as $k => $v) {
            if ($k !== 'sign' && $v !== '' && $v !== null) {
                $pairs[] = "{$k}={$v}";
            }
        }
        $stringToBeSigned = implode('&', $pairs);

        $pem = $this->formatPrivateKey($privateKey);
        $pkey = openssl_pkey_get_private($pem);
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
        openssl_sign($stringToBeSigned, $signature, $pkey, OPENSSL_ALGO_SHA256);
        if (is_resource($pkey)) {
            openssl_free_key($pkey);
        }

        return base64_encode($signature);
    }

    /**
     * 规范化私钥为标准 PEM 格式
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
     * 发起外部 HTTP cURL 请求
     */
    private function executeHttp(string $url, array $params): array
    {
        $ch = curl_init();
        try {
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($params));
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5); // 连接超时 5 秒
            curl_setopt($ch, CURLOPT_TIMEOUT, 15);        // 响应超时 15 秒
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/x-www-form-urlencoded;charset=utf-8'
            ]);

            $raw = curl_exec($ch);
            if ($raw === false) {
                $err = curl_error($ch);
                return ['success' => false, 'msg' => '网络通信异常: ' . $err, 'data' => null];
            }

            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            if ($httpCode !== 200) {
                return ['success' => false, 'msg' => "支付宝网关返回 HTTP 状态码: {$httpCode}", 'data' => null];
            }

            $json = json_decode($raw, true);
            if (!is_array($json)) {
                return ['success' => false, 'msg' => '网关返回非合规 JSON 响应', 'data' => null];
            }

            return ['success' => true, 'msg' => 'success', 'data' => $json];
        } catch (\Throwable $e) {
            return ['success' => false, 'msg' => '请求异常: ' . $e->getMessage(), 'data' => null];
        } finally {
            if (is_resource($ch) || (is_object($ch) && $ch instanceof \CurlHandle)) {
                curl_close($ch);
            }
        }
    }

    /**
     * 获取应用公钥证书序列号 (app_cert_sn)
     */
    public function getAppCertSN(): string
    {
        if (!empty($this->appCertSN)) {
            return $this->appCertSN;
        }
        if (empty($this->appCertContent)) {
            return '';
        }
        $this->appCertSN = $this->parseCertSN($this->appCertContent);
        return $this->appCertSN;
    }

    /**
     * 获取支付宝根证书序列号 (alipay_root_cert_sn)
     */
    public function getRootCertSN(): string
    {
        if (!empty($this->alipayRootCertSN)) {
            return $this->alipayRootCertSN;
        }
        if (!empty($this->alipayRootCertContent)) {
            $sn = $this->parseRootCertSN($this->alipayRootCertContent);
            if (!empty($sn)) {
                $this->alipayRootCertSN = $sn;
                return $this->alipayRootCertSN;
            }
        }
        // 官方标准默认根证书序列号兜底 (全国统一)
        $this->alipayRootCertSN = '687b59193f3f462dd5336e5abf83c5d8_02941eef3187dddf3d3b83462e1dfcf6';
        return $this->alipayRootCertSN;
    }

    /**
     * 从 X.509 证书内容中提取并计算 SN: md5(issuer + serialNumber)
     */
    private function parseCertSN(string $certContent): string
    {
        $certContent = trim($certContent);
        if (empty($certContent)) {
            return '';
        }
        $ssl = @openssl_x509_parse($certContent);
        if (!$ssl || empty($ssl['issuer'])) {
            return '';
        }

        $issuerStr = $this->formatCertIssuer($ssl['issuer']);
        $serialNumber = (string)($ssl['serialNumber'] ?? '');
        if (empty($serialNumber) && !empty($ssl['serialNumberHex'])) {
            $serialNumber = $this->hex2dec('0x' . $ssl['serialNumberHex']);
        } elseif (strpos($serialNumber, '0x') === 0 || strpos($serialNumber, '0X') === 0) {
            $serialNumber = $this->hex2dec($serialNumber);
        }

        if (empty($serialNumber)) {
            return '';
        }

        return md5($issuerStr . $serialNumber);
    }

    /**
     * 从根证书文件内容中提取并计算 RootCertSN (支持多个根证书节点)
     */
    private function parseRootCertSN(string $rootContent): string
    {
        $rootContent = trim($rootContent);
        if (empty($rootContent)) {
            return '';
        }

        $certs = explode('-----END CERTIFICATE-----', $rootContent);
        $snList = [];
        foreach ($certs as $cert) {
            $cert = trim($cert);
            if (empty($cert)) {
                continue;
            }
            $fullCert = $cert . "\n-----END CERTIFICATE-----";
            $ssl = @openssl_x509_parse($fullCert);
            if (!$ssl || empty($ssl['issuer'])) {
                continue;
            }

            $sigType = (string)($ssl['signatureTypeLN'] ?? ($ssl['signatureTypeSN'] ?? ''));
            // 筛选 RSA 签名证书片段
            if (empty($sigType) || stripos($sigType, 'RSA') !== false || stripos($sigType, 'md5') !== false || stripos($sigType, 'sha') !== false) {
                $issuerStr = $this->formatCertIssuer($ssl['issuer']);
                $serialNumber = (string)($ssl['serialNumber'] ?? '');
                if (empty($serialNumber) && !empty($ssl['serialNumberHex'])) {
                    $serialNumber = $this->hex2dec('0x' . $ssl['serialNumberHex']);
                } elseif (strpos($serialNumber, '0x') === 0 || strpos($serialNumber, '0X') === 0) {
                    $serialNumber = $this->hex2dec($serialNumber);
                }
                if (!empty($serialNumber)) {
                    $snList[] = md5($issuerStr . $serialNumber);
                }
            }
        }

        return !empty($snList) ? implode('_', $snList) : '';
    }

    /**
     * 将 openssl issuer 数组转为倒序字符串: key=val,key=val
     */
    private function formatCertIssuer(array $issuer): string
    {
        $reversed = array_reverse($issuer);
        $pairs = [];
        foreach ($reversed as $k => $v) {
            $pairs[] = "{$k}={$v}";
        }
        return implode(',', $pairs);
    }

    /**
     * 16 进制大数转换为 10 进制字符串 (双模支持: bcmath 或纯算法)
     */
    private function hex2dec(string $hex): string
    {
        $hex = strtolower(ltrim(trim($hex), '0x'));
        if (function_exists('bcmul') && function_exists('bcadd') && function_exists('bcpow')) {
            $dec = '0';
            $len = strlen($hex);
            for ($i = 0; $i < $len; $i++) {
                $current = (string)hexdec($hex[$i]);
                $pow = bcpow('16', (string)($len - $i - 1));
                $dec = bcadd($dec, bcmul($current, $pow));
            }
            return $dec;
        }

        // 纯字符数学算法兜底 (无 bcmath 扩展依赖)
        $dec = '0';
        $len = strlen($hex);
        for ($i = 0; $i < $len; $i++) {
            $dec = $this->strMultiplyAdd16($dec, hexdec($hex[$i]));
        }
        return $dec;
    }

    private function strMultiplyAdd16(string $numStr, int $add): string
    {
        $carry = $add;
        $result = '';
        for ($i = strlen($numStr) - 1; $i >= 0; $i--) {
            $digit = (int)$numStr[$i];
            $temp = $digit * 16 + $carry;
            $result = ($temp % 10) . $result;
            $carry = (int)($temp / 10);
        }
        while ($carry > 0) {
            $result = ($carry % 10) . $result;
            $carry = (int)($carry / 10);
        }
        return ltrim($result, '0') ?: '0';
    }
}
