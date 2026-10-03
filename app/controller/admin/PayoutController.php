<?php
/**
 * 启灵独立回收系统 - 后台资金放款打款控制器
 * 规范：严格防范重复转账，支持支付宝官方商家转账、微信转账与线下对公标记
 * 编码：UTF-8 无 BOM
 */

namespace App\Controller\Admin;

use App\Controller\Admin\AdminBaseController;
use App\Common\Request;
use App\Service\PayoutService;

class PayoutController extends AdminBaseController
{
    private $payoutService;

    public function __construct()
    {
        parent::__construct();
        $this->payoutService = new PayoutService();
    }

    /**
     * 审核放款打款 (支持支付宝/微信商家转账出资，含分布式锁与大额双重安全审批)
     */
    public function execute(): void
    {
        $orderId = Request::postInt('order_id', 0);
        $channel = (string)Request::post('channel', 'alipay');
        $securityPassword = (string)Request::post('security_password', '');

        if ($orderId <= 0) {
            $this->error('订单 ID 不能为空');
        }

        $res = $this->payoutService->executePayout($orderId, $channel, $this->getAdminId(), $securityPassword);
        if ($res['code'] === 200) {
            $this->success($res['data'] ?? null, $res['msg']);
        } else {
            $this->error(
                $res['msg'],
                $res['code'],
                !empty($res['require_security_pwd']) ? ['require_security_pwd' => true] : null
            );
        }
    }

    /**
     * 获取大额放款出资双重审批风控策略 (脱敏返回)
     */
    public function getSecurityPolicy(): void
    {
        $policy = $this->payoutService->getPayoutSecurityPolicy();
        $this->success($policy, '获取出资安全策略成功');
    }

    /**
     * 预览支付宝转账 OpenAPI 标准请求报文与参数
     */
    public function preview(): void
    {
        $orderId = Request::postInt('order_id', 0);
        if ($orderId <= 0) {
            $orderId = (int)Request::get('order_id', 0);
        }

        if ($orderId <= 0) {
            $this->error('请指定需要预览转账报文的订单 ID');
        }

        $res = $this->payoutService->previewAlipayPayout($orderId);
        if ($res['code'] === 200) {
            $this->success($res['data'], $res['msg']);
        } else {
            $this->error($res['msg'], $res['code']);
        }
    }

    /**
     * 查询企业支付宝资金账户可用余额与网关连通性 (支持即时测试入参)
     */
    public function queryBalance(): void
    {
        $customConfigs = [];
        $appId = trim((string)Request::post('app_id', ''));
        if (!empty($appId)) {
            $customConfigs = [
                'alipay_appid'       => $appId,
                'alipay_private_key' => trim((string)Request::post('private_key', '')),
                'alipay_app_cert'    => trim((string)Request::post('app_cert', '')),
                'alipay_public_cert' => trim((string)Request::post('public_cert', '')),
                'alipay_root_cert'   => trim((string)Request::post('root_cert', '')),
                'alipay_public_key'  => trim((string)Request::post('public_key', '')),
                'alipay_sign_type'   => trim((string)Request::post('sign_type', 'cert')),
                'alipay_sandbox'     => Request::postInt('is_sandbox', 0),
            ];
        }

        $res = $this->payoutService->queryAlipayAccountBalance($customConfigs);
        if ($res['code'] === 200) {
            $this->success($res['data'], $res['msg']);
        } else {
            $this->error($res['msg'], $res['code']);
        }
    }

    /**
     * 支付宝官方商家转账连通性小额真实打款测试
     */
    public function testTransfer(): void
    {
        $account = trim((string)Request::post('account', ''));
        $name = trim((string)Request::post('name', ''));
        $amount = (float)Request::post('amount', 0.1);
        $remark = trim((string)Request::post('remark', '二手设备回收款'));
        $sceneName = trim((string)Request::post('transfer_scene_name', ''));
        $infoType = trim((string)Request::post('transfer_scene_info_type', ''));

        if (empty($account)) {
            $this->error('测试收款支付宝账号不能为空');
        }
        if (empty($name)) {
            $this->error('测试收款人真实姓名不能为空（支付宝强制强实名核验）');
        }
        if ($amount <= 0 || $amount > 100) {
            $this->error('测试打款金额必须在 0.01 ~ 100 元之间，建议填写 0.1 元');
        }

        $res = $this->payoutService->testAlipayPayout($account, $name, $amount, $remark, $this->getAdminId(), $sceneName, $infoType);
        if ($res['code'] === 200) {
            $this->success($res['data'] ?? null, $res['msg']);
        } else {
            $this->error($res['msg'], $res['code'], $res['data'] ?? null);
        }
    }

    /**
     * 预览微信商家转账 APIv3 标准请求报文与参数
     */
    public function previewWechat(): void
    {
        $orderId = Request::postInt('order_id', 0);
        if ($orderId <= 0) {
            $orderId = (int)Request::get('order_id', 0);
        }

        if ($orderId <= 0) {
            $this->error('请指定需要预览转账报文的订单 ID');
        }

        $res = $this->payoutService->previewWechatPayout($orderId);
        if ($res['code'] === 200) {
            $this->success($res['data'], $res['msg']);
        } else {
            $this->error($res['msg'], $res['code']);
        }
    }

    /**
     * 查询企业微信支付资金专户可用余额与网关连通性
     */
    public function queryWechatBalance(): void
    {
        $accountType = trim((string)Request::get('account_type', 'BASIC'));
        $res = $this->payoutService->queryWechatAccountBalance($accountType);
        if ($res['code'] === 200) {
            $this->success($res['data'], $res['msg']);
        } else {
            $this->error($res['msg'], $res['code']);
        }
    }

    /**
     * 微信支付官方商家转账连通性小额真实打款测试
     */
    public function testWechatTransfer(): void
    {
        $openid = trim((string)Request::post('openid', ''));
        $name = trim((string)Request::post('name', ''));
        $amount = (float)Request::post('amount', 0.3);
        $remark = trim((string)Request::post('remark', '微信商家转账联调测试'));

        if (empty($openid)) {
            $this->error('测试收款用户微信 OpenID 不能为空');
        }
        if ($amount < 0.30 || $amount > 100) {
            $this->error('测试打款金额必须在 0.30 ~ 100 元之间（微信官方限制单笔最低 0.30 元），建议填写 0.30 元');
        }

        $res = $this->payoutService->testWechatPayout($openid, $name, $amount, $remark, $this->getAdminId());
        if ($res['code'] === 200) {
            $this->success($res['data'] ?? null, $res['msg']);
        } else {
            $this->error($res['msg'], $res['code'], $res['data'] ?? null);
        }
    }
}
