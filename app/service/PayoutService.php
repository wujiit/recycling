<?php
/**
 * 启灵回收系统 - 资金打款与商家转账服务
 * 支持微信商家转账、支付宝转账、银行卡转账及大额安全审核
 */

namespace App\Service;

use App\Model\Database;
use App\Model\OrderModel;
use App\Model\PayoutModel;
use App\Model\UserModel;
use App\Helper\Str;

class PayoutService
{
    private $orderModel;
    private $payoutModel;
    private $userModel;

    public function __construct()
    {
        $this->orderModel = new OrderModel();
        $this->payoutModel = new PayoutModel();
        $this->userModel = new UserModel();
    }

    /**
     * 执行打款放款 (支持分布式单据互斥锁与大额双重安全审批)
     *
     * @param int $orderId 订单ID
     * @param string $channel 打款渠道: wechat(微信零钱), alipay(支付宝转账), bank(银行卡), cash(现金), offline(线下对公)
     * @param int $operatorId 操作财务管理员ID
     * @param string $securityPassword 财务安全支付密码 (大额放款二次核验必填)
     */
    public function executePayout(int $orderId, string $channel = 'wechat', int $operatorId = 1, string $securityPassword = ''): array
    {
        // 1. 分布式单据互斥锁：基于订单ID加锁，防并发重复出资
        $lockKey = 'payout:order:' . $orderId;
        $cache = CacheService::getInstance();
        $lockToken = $cache->acquireLock($lockKey, 30);
        if ($lockToken === null) {
            return ['code' => 429, 'msg' => '当前订单放款出资正在处理中，请勿重复发起！'];
        }

        try {
            $order = $this->orderModel->findById($orderId);
            if (!$order) {
                return ['code' => 404, 'msg' => '订单不存在'];
            }

            if ($order['status'] === 'paid') {
                return ['code' => 400, 'msg' => '该订单款项已成功出资结清，严禁重复打款！'];
            }

            // 只有 completed / inspecting 状态允许打款
            if (!in_array($order['status'], ['completed', 'inspecting'], true)) {
                return ['code' => 400, 'msg' => '当前订单状态不允许放款'];
            }

            // 幂等防重锁：严格检查是否已有正在处理或已成功的放款单
            if ($this->payoutModel->hasActivePayout($orderId)) {
                return ['code' => 400, 'msg' => '该订单已有正在处理或已完成的打款记录，严防重复出资！'];
            }

            $amount = (float)$order['final_price'];
            if ($amount <= 0) {
                return ['code' => 400, 'msg' => '打款金额必须大于 0 元'];
            }

            // 2. 大额打款双重安全审批与风控核验 (安全支付密码核验)
            $secCheck = $this->verifyLargePayoutSecurity($amount, $securityPassword, $operatorId);
            if (!$secCheck['success']) {
                return $secCheck;
            }

            // 生成唯一商户单号
            $outBillNo = Str::generateSn('RC_PAY_');

            // 记录流水为处理中
            $this->payoutModel->createLog([
                'order_id'    => $orderId,
                'out_bill_no' => $outBillNo,
                'channel'     => $channel,
                'amount'      => $amount
            ]);

            if ($channel === 'alipay') {
                // 支付宝官方商家转账出资
                $payeeAccount = trim((string)($order['payout_account'] ?? ''));
                if (empty($payeeAccount)) {
                    $payeeAccount = trim((string)($order['contact_mobile'] ?? ''));
                }
                if (empty($payeeAccount)) {
                    $this->payoutModel->updateResult($outBillNo, 'fail', '', '客户未指定真实支付宝收款账号或手机号');
                    return ['code' => 400, 'msg' => '未获取到客户真实支付宝收款账号（手机号或邮箱），无法发起转账'];
                }

                $payeeName = trim((string)($order['payout_name'] ?? ''));
                if (empty($payeeName)) {
                    $payeeName = trim((string)($order['contact_name'] ?? ''));
                }
                if (empty($payeeName)) {
                    $this->payoutModel->updateResult($outBillNo, 'fail', '', '客户未填写真实姓名');
                    return ['code' => 400, 'msg' => '订单缺少收款人真实姓名，支付宝强制要求强实名一致性核验，无法出资'];
                }

                $alipayService = new AlipayService();
                $orderTitle = '二手回收款项结算-' . ($order['order_sn'] ?? '');
                $remark = '二手回收放款';

                $alipayRes = $alipayService->transfer($outBillNo, $amount, $payeeAccount, $payeeName, $orderTitle, $remark);
                $finalBillNo = $alipayRes['out_biz_no'] ?? $outBillNo;
                if ($finalBillNo !== $outBillNo) {
                    $this->payoutModel->updateOutBillNo($outBillNo, $finalBillNo);
                }

                if ($alipayRes['success']) {
                    $this->payoutModel->updateResult($finalBillNo, 'success', $alipayRes['order_id'] ?? '');
                    $this->orderModel->updateStatus($orderId, 'paid');
                    $this->orderModel->updatePayoutAudit($orderId, 'approved', $operatorId, '支付宝转账出资完成');
                    return [
                        'code' => 200,
                        'msg'  => $alipayRes['msg'] ?? '支付宝商家转账成功，资金已实时到账客户账户',
                        'data' => [
                            'out_bill_no'       => $finalBillNo,
                            'order_id'          => $alipayRes['order_id'] ?? '',
                            'pay_fund_order_id' => $alipayRes['pay_fund_order_id'] ?? ''
                        ]
                    ];
                } else {
                    $this->payoutModel->updateResult($finalBillNo, 'fail', '', $alipayRes['msg'] ?? '出资失败');
                    return ['code' => 400, 'msg' => $alipayRes['msg'] ?? '支付宝商家转账出资失败'];
                }
            }

            if (in_array($channel, ['offline', 'bank', 'cash'], true)) {
                $channelLabels = [
                    'bank'    => '银行卡网银转账',
                    'cash'    => '现场现金结清',
                    'offline' => '线下对公/人工转账'
                ];
                $label = $channelLabels[$channel] ?? '人工放款';
                $this->payoutModel->updateResult($outBillNo, 'success', strtoupper($channel) . '_' . date('YmdHis'));
                $this->orderModel->updateStatus($orderId, 'paid');
                $this->orderModel->updatePayoutAudit($orderId, 'approved', $operatorId, "{$label}放款出资完成");
                return ['code' => 200, 'msg' => "【{$label}】已确认放款出资完成，订单已结清归档", 'data' => ['out_bill_no' => $outBillNo]];
            }

            // 微信商家转账到零钱 (官方 APIv3 升级版标准接口)
            if ($channel === 'wechat') {
                $openid = '';
                $rawAccount = trim((string)($order['payout_account'] ?? ''));
                if (!empty($rawAccount) && preg_match('/^[a-zA-Z0-9_\-]{20,40}$/', $rawAccount)) {
                    $openid = $rawAccount;
                }
                if (empty($openid) && !empty($order['user_id'])) {
                    $user = $this->userModel->findById((int)$order['user_id']);
                    if ($user && !empty($user['openid'])) {
                        $openid = trim((string)$user['openid']);
                    }
                }

                if (empty($openid)) {
                    $this->payoutModel->updateResult($outBillNo, 'fail', '', '客户未提供有效微信 OpenID');
                    return ['code' => 400, 'msg' => '客户未绑定微信 OpenID 或未填写收款 OpenID，无法自动向微信零钱打款出资，请核对或使用线下/银行转账方式'];
                }

                $payeeName = trim((string)($order['payout_name'] ?? ''));
                if (empty($payeeName)) {
                    $payeeName = trim((string)($order['contact_name'] ?? ''));
                }

                $wechatService = new WechatTransferService();
                $remark = '回收款结算-' . ($order['order_sn'] ?? '');
                $deviceName = (string)($order['device_name'] ?? '数码回收');

                $wechatRes = $wechatService->transfer($outBillNo, $amount, $openid, $payeeName, $remark, $deviceName);
                if ($wechatRes['success']) {
                    $this->payoutModel->updateResult($outBillNo, 'success', $wechatRes['transfer_bill_no'] ?? '');
                    $this->orderModel->updateStatus($orderId, 'paid');
                    $this->orderModel->updatePayoutAudit($orderId, 'approved', $operatorId, '微信商家转账出资完成');
                    return [
                        'code' => 200,
                        'msg'  => $wechatRes['msg'] ?? '微信商家转账成功，资金已实时到账用户微信零钱',
                        'data' => [
                            'out_bill_no'      => $outBillNo,
                            'transfer_bill_no' => $wechatRes['transfer_bill_no'] ?? '',
                            'status'           => $wechatRes['status'] ?? 'SUCCESS',
                            'package_info'     => $wechatRes['package_info'] ?? ''
                        ]
                    ];
                } else {
                    $this->payoutModel->updateResult($outBillNo, 'fail', '', $wechatRes['msg'] ?? '出资失败');
                    return ['code' => 400, 'msg' => $wechatRes['msg'] ?? '微信商家转账出资失败'];
                }
            }

            return ['code' => 400, 'msg' => '不支持的放款渠道类型'];
        } finally {
            if ($lockToken !== null) {
                $cache->releaseLock($lockKey, $lockToken);
            }
        }
    }

    /**
     * 预览支付宝转账 OpenAPI 标准请求报文 (基于真实订单数据)
     */
    public function previewAlipayPayout(int $orderId): array
    {
        $order = $this->orderModel->findById($orderId);
        if (!$order) {
            return ['code' => 404, 'msg' => '订单不存在', 'data' => null];
        }

        $amount = (float)$order['final_price'];
        $payeeAccount = trim((string)($order['payout_account'] ?? ''));
        if (empty($payeeAccount)) {
            $payeeAccount = trim((string)($order['contact_mobile'] ?? ''));
        }

        $payeeName = trim((string)($order['payout_name'] ?? ''));
        if (empty($payeeName)) {
            $payeeName = trim((string)($order['contact_name'] ?? ''));
        }

        $simulatedBillNo = Str::generateSn('RC_PAY_');
        $orderTitle = '二手回收款项结算-' . ($order['order_sn'] ?? '');
        $remark = '回收设备:' . ($order['device_name'] ?? '数码回收');

        $alipayService = new AlipayService();
        $preview = $alipayService->previewTransferPayload(
            $simulatedBillNo,
            $amount,
            $payeeAccount,
            $payeeName,
            $orderTitle,
            $remark
        );

        $preview['order_info'] = [
            'order_id'       => $order['id'],
            'order_sn'       => $order['order_sn'],
            'device_name'    => $order['device_name'],
            'final_price'    => $order['final_price'],
            'contact_name'   => $order['contact_name'],
            'contact_mobile' => $order['contact_mobile'],
            'payout_name'    => $order['payout_name'],
            'payout_account' => $order['payout_account'],
        ];

        return ['code' => 200, 'msg' => '获取支付宝转账报文预览成功', 'data' => $preview];
    }

    /**
     * 预览微信商家转账 APIv3 标准请求报文 (基于真实订单数据)
     */
    public function previewWechatPayout(int $orderId): array
    {
        $order = $this->orderModel->findById($orderId);
        if (!$order) {
            return ['code' => 404, 'msg' => '订单不存在', 'data' => null];
        }

        $amount = (float)$order['final_price'];
        $openid = '';
        $rawAccount = trim((string)($order['payout_account'] ?? ''));
        if (!empty($rawAccount) && preg_match('/^[a-zA-Z0-9_\-]{20,40}$/', $rawAccount)) {
            $openid = $rawAccount;
        }
        if (empty($openid) && !empty($order['user_id'])) {
            $user = $this->userModel->findById((int)$order['user_id']);
            if ($user && !empty($user['openid'])) {
                $openid = trim((string)$user['openid']);
            }
        }

        $payeeName = trim((string)($order['payout_name'] ?? ''));
        if (empty($payeeName)) {
            $payeeName = trim((string)($order['contact_name'] ?? ''));
        }

        $simulatedBillNo = Str::generateSn('RC_PAY_');
        $remark = '回收款结算-' . ($order['order_sn'] ?? '');
        $deviceName = (string)($order['device_name'] ?? '数码回收');

        $wechatService = new WechatTransferService();
        $preview = $wechatService->previewTransferPayload(
            $simulatedBillNo,
            $amount,
            $openid ?: '[客户微信OpenID]',
            $payeeName,
            $remark,
            $deviceName
        );

        $preview['order_info'] = [
            'order_id'        => $order['id'],
            'order_sn'        => $order['order_sn'],
            'device_name'     => $order['device_name'],
            'final_price'     => $order['final_price'],
            'contact_name'    => $order['contact_name'],
            'contact_mobile'  => $order['contact_mobile'],
            'payout_name'     => $order['payout_name'],
            'payout_account'  => $order['payout_account'],
            'resolved_openid' => $openid ?: '未获取到有效OpenID'
        ];

        return ['code' => 200, 'msg' => '获取微信转账报文预览成功', 'data' => $preview];
    }

    /**
     * 查询企业支付宝资金专户可用余额
     */
    public function queryAlipayAccountBalance(array $customConfigs = []): array
    {
        $alipayService = new AlipayService($customConfigs);
        $res = $alipayService->queryAccountBalance('ACCTRANS_ACCOUNT');
        return [
            'code' => 200,
            'msg'  => $res['msg'] ?? '查询成功',
            'data' => $res
        ];
    }

    /**
     * 查询企业微信支付资金专户可用余额
     */
    public function queryWechatAccountBalance(string $accountType = 'BASIC'): array
    {
        $wechatService = new WechatTransferService();
        $res = $wechatService->queryAccountBalance($accountType);
        return [
            'code' => 200,
            'msg'  => $res['msg'] ?? '查询成功',
            'data' => $res
        ];
    }

    /**
     * 发起支付宝商家转账在线小额真实测试打款
     *
     * @param string $account 收款支付宝账号
     * @param string $name 收款人真实姓名
     * @param float $amount 打款金额
     * @param string $remark 备注
     * @param int $operatorId 操作员管理员ID
     * @param string $sceneName 转账场景名称 (支持实时测试覆盖)
     * @param string $infoType 场景上报信息类型 (选填，支持实时测试覆盖)
     * @return array
     */
    public function testAlipayPayout(
        string $account,
        string $name,
        float $amount,
        string $remark = '二手设备回收款',
        int $operatorId = 1,
        string $sceneName = '',
        string $infoType = ''
    ): array {
        $runtimeConfigs = [];
        if (!empty($sceneName)) {
            $runtimeConfigs['alipay_transfer_scene_name'] = $sceneName;
        }
        if (!empty($infoType)) {
            $runtimeConfigs['alipay_transfer_scene_info_type'] = $infoType;
        }
        $alipayService = new AlipayService($runtimeConfigs);
        if (!$alipayService->isConfigured()) {
            return [
                'code' => 400,
                'msg'  => '请先在上方填写真实有效的支付宝开放平台 AppID 与应用私钥并保存配置后再测试打款'
            ];
        }

        if ($amount <= 0 || $amount > 100) {
            return [
                'code' => 400,
                'msg'  => '测试打款金额必须在 0.01 ~ 100 元之间'
            ];
        }

        $outBillNo = Str::generateSn('TEST_PAY_');
        $orderTitle = '二手回收款项结算-' . date('mdHis');
        $cleanRemark = !empty($remark) ? trim(str_replace(['测试', '打款测试', '放款测试'], '', $remark)) : '二手回收商品结算';
        if (empty($cleanRemark)) {
            $cleanRemark = '二手回收商品结算';
        }

        $alipayRes = $alipayService->transfer($outBillNo, $amount, $account, $name, $orderTitle, $cleanRemark);
        $finalBillNo = $alipayRes['out_biz_no'] ?? $outBillNo;
        if ($alipayRes['success']) {
            return [
                'code' => 200,
                'msg'  => '支付宝真实测试打款成功！资金已实时转入指定支付宝账户',
                'data' => [
                    'out_bill_no'       => $finalBillNo,
                    'order_id'          => $alipayRes['order_id'] ?? '',
                    'pay_fund_order_id' => $alipayRes['pay_fund_order_id'] ?? '',
                    'amount'            => sprintf('%.2f', $amount),
                    'payee_account'     => $account,
                    'payee_name'        => $name,
                    'trans_date'        => date('Y-m-d H:i:s'),
                    'raw'               => $alipayRes['raw'] ?? []
                ]
            ];
        } else {
            return [
                'code' => 400,
                'msg'  => $alipayRes['msg'] ?? '支付宝测试打款出资失败',
                'data' => [
                    'out_bill_no' => $finalBillNo,
                    'raw'         => $alipayRes['raw'] ?? []
                ]
            ];
        }
    }

    /**
     * 发起微信支付商家转账在线小额真实测试打款
     *
     * @param string $openid 收款人微信 OpenID
     * @param string $name 收款人真实姓名 (金额>=2000强制要求)
     * @param float $amount 打款金额 (0.30 ~ 100元)
     * @param string $remark 转账备注
     * @param int $operatorId 操作员管理员ID
     * @return array
     */
    public function testWechatPayout(string $openid, string $name, float $amount, string $remark = '微信转账测试', int $operatorId = 1): array
    {
        $wechatService = new WechatTransferService();
        if (!$wechatService->isConfigured()) {
            return [
                'code' => 400,
                'msg'  => '请先在下方填写真实有效的微信商户号 (MchId)、AppID、证书序列号与商户 API 私钥并保存'
            ];
        }

        if ($amount < 0.30 || $amount > 100) {
            return [
                'code' => 400,
                'msg'  => '微信支付官方规定商家转账单笔出资金额不得低于 0.30 元，测试金额需在 0.30 ~ 100 元之间'
            ];
        }

        if (empty($openid)) {
            return [
                'code' => 400,
                'msg'  => '测试收款人微信 OpenID 不能为空'
            ];
        }

        $outBillNo = Str::generateSn('TEST_WX_');
        $wechatRes = $wechatService->transfer($outBillNo, $amount, $openid, $name, $remark, '系统连通性测试商品');

        if ($wechatRes['success']) {
            return [
                'code' => 200,
                'msg'  => '微信真实测试打款已成功受理或已到账！',
                'data' => [
                    'out_bill_no'      => $outBillNo,
                    'transfer_bill_no' => $wechatRes['transfer_bill_no'] ?? '',
                    'status'           => $wechatRes['status'] ?? 'SUCCESS',
                    'amount'           => sprintf('%.2f', $amount),
                    'openid'           => $openid,
                    'payee_name'       => $name,
                    'trans_date'       => date('Y-m-d H:i:s'),
                    'package_info'     => $wechatRes['package_info'] ?? '',
                    'raw'              => $wechatRes['raw'] ?? []
                ]
            ];
        } else {
            return [
                'code' => 400,
                'msg'  => $wechatRes['msg'] ?? '微信测试打款出资失败',
                'data' => [
                    'out_bill_no' => $outBillNo,
                    'raw'         => $wechatRes['raw'] ?? []
                ]
            ];
        }
    }

    /**
     * 校验大额打款双重安全审批 (风控阈值与财务支付密码核验)
     * 防范误操作风险与防暴力破解
     *
     * @param float $amount 打款金额
     * @param string $inputPassword 输入的财务安全支付密码
     * @param int $operatorId 操作财务管理员ID
     * @return array
     */
    public function verifyLargePayoutSecurity(float $amount, string $inputPassword, int $operatorId = 1): array
    {
        $db = Database::getInstance();
        $p = $db->getPrefix();
        $rows = $db->fetchAll(
            "SELECT `config_key`, `config_value` FROM `{$p}sys_config` 
             WHERE `config_key` IN ('payout_double_approval_enabled', 'payout_audit_threshold', 'payout_security_password_hash')"
        );
        $cfgs = [];
        foreach ($rows as $r) {
            $cfgs[$r['config_key']] = $r['config_value'];
        }

        $enabled = ($cfgs['payout_double_approval_enabled'] ?? '1') !== '0';
        $threshold = (float)($cfgs['payout_audit_threshold'] ?? 1000.0);
        if ($threshold <= 0) {
            $threshold = 1000.0;
        }

        // 未开启大额双重审批或金额未达到大额阈值，直接放行
        if (!$enabled || $amount < $threshold) {
            return ['success' => true];
        }

        $pwdHash = (string)($cfgs['payout_security_password_hash'] ?? '');
        if (empty($pwdHash)) {
            return [
                'success'             => false,
                'code'                => 403,
                'msg'                 => '系统已开启大额出资双重审批，尚未设置【财务安全支付密码】！请管理员先前往【系统设置 ➔ 结算渠道】中完成支付密码设置后再放款。',
                'require_security_pwd' => true
            ];
        }

        // 防暴力破解：限制 15 分钟内连续输错不超过 5 次
        $cache = CacheService::getInstance();
        $failKey = 'payout_sec_pwd_fails:' . $operatorId;
        $failCount = (int)$cache->get($failKey, 0);
        if ($failCount >= 5) {
            return [
                'success'             => false,
                'code'                => 429,
                'msg'                 => '财务安全支付密码已连续错误达到 5 次，账户已被安全锁定 15 分钟！请稍后再试或联系超级管理员。',
                'require_security_pwd' => true
            ];
        }

        $inputPassword = trim($inputPassword);
        if ($inputPassword === '') {
            $formattedAmount = number_format($amount, 2);
            $formattedThreshold = number_format($threshold, 2);
            return [
                'success'             => false,
                'code'                => 403,
                'msg'                 => "本笔放款金额 (¥{$formattedAmount}) 达到大额出资风控阈值 (¥{$formattedThreshold})，必须输入【财务安全支付密码】完成二次核准授权！",
                'require_security_pwd' => true
            ];
        }

        if (!password_verify($inputPassword, $pwdHash)) {
            $failCount++;
            $cache->set($failKey, $failCount, 900); // 锁定15分钟
            $remaining = max(0, 5 - $failCount);
            return [
                'success'             => false,
                'code'                => 403,
                'msg'                 => "财务安全支付密码错误，二次授权失败！剩余尝试机会：{$remaining} 次",
                'require_security_pwd' => true
            ];
        }

        // 密码核验通过，清除失败计数
        $cache->delete($failKey);
        return ['success' => true];
    }

    /**
     * 获取大额放款安全审批策略配置 (安全脱敏，不泄漏哈希)
     */
    public function getPayoutSecurityPolicy(): array
    {
        $db = Database::getInstance();
        $p = $db->getPrefix();
        $rows = $db->fetchAll(
            "SELECT `config_key`, `config_value` FROM `{$p}sys_config` 
             WHERE `config_key` IN ('payout_double_approval_enabled', 'payout_audit_threshold', 'payout_security_password_hash')"
        );
        $cfgs = [];
        foreach ($rows as $r) {
            $cfgs[$r['config_key']] = $r['config_value'];
        }

        return [
            'double_approval_enabled' => ($cfgs['payout_double_approval_enabled'] ?? '1') !== '0',
            'audit_threshold'         => (float)($cfgs['payout_audit_threshold'] ?? 1000.0),
            'has_password_set'        => !empty($cfgs['payout_security_password_hash'])
        ];
    }
}
