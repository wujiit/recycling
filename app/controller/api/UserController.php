<?php
/**
 * 启灵同城服务系统 - 客户端用户控制器
 * 处理微信小程序授权登录、手机号绑定与用户信息管理
 */

namespace App\Controller\Api;

use App\Controller\Controller;
use App\Common\Request;
use App\Service\AuthService;
use App\Service\WechatService;

class UserController extends Controller
{
    private $authService;
    private $wechatService;
    private $userModel;

    public function __construct()
    {
        $this->authService = new AuthService();
        $this->wechatService = new WechatService();
        $this->userModel = new \App\Model\UserModel();
    }

    /**
     * 获取当前已登录的会员对象
     */
    private function getAuthedUser(): array
    {
        $token = '';
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
        if (!empty($header) && preg_match('/Bearer\s+(\S+)/i', $header, $matches)) {
            $token = $matches[1];
        }
        if (empty($token)) {
            $token = (string)Request::get('token', Request::post('token', ''));
        }

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
     * 前台会员手机号 + 密码注册
     */
    public function register(): void
    {
        $mobile = trim((string)Request::post('mobile', ''));
        $password = (string)Request::post('password', '');
        $nickname = trim((string)Request::post('nickname', ''));
        $realname = trim((string)Request::post('realname', ''));

        $res = $this->authService->registerUser($mobile, $password, $nickname, $realname);
        if ($res['code'] === 200) {
            $this->success($res['data'], $res['msg']);
        } else {
            $this->error($res['msg'], $res['code']);
        }
    }

    /**
     * 前台会员手机号 + 密码登录
     */
    public function login(): void
    {
        $mobile = trim((string)Request::post('mobile', ''));
        $password = (string)Request::post('password', '');

        $res = $this->authService->loginUser($mobile, $password);
        if ($res['code'] === 200) {
            $this->success($res['data'], $res['msg']);
        } else {
            $this->error($res['msg'], $res['code']);
        }
    }

    /**
     * Web/H5 手机号免密快捷登录（已永久下线并禁用）
     */
    public function phoneLogin(): void
    {
        $this->error('免密快捷登录功能已停用，请使用账号密码登录', 403);
    }

    /**
     * 微信小程序登录凭证授权换取 Token
     */
    public function wechatLogin(): void
    {
        $code = (string)Request::post('code', '');
        $userInfo = Request::post('user_info', []);
        $phoneCode = (string)Request::post('phone_code', '');

        if (empty($code)) {
            $this->error('授权 Code 不能为空');
        }

        $sessionRes = $this->wechatService->code2session($code);
        if ($sessionRes['code'] !== 200) {
            $this->error($sessionRes['msg'], $sessionRes['code']);
        }

        $openid = $sessionRes['data']['openid'];
        $unionid = $sessionRes['data']['unionid'] ?? '';

        // 若同时传递了微信原生手机号授权 code，一并解析并绑定
        if (!empty($phoneCode)) {
            $phoneRes = $this->wechatService->getUserPhoneNumber($phoneCode);
            if ($phoneRes['code'] === 200 && !empty($phoneRes['data']['phone'])) {
                if (!is_array($userInfo)) {
                    $userInfo = [];
                }
                $userInfo['mobile'] = $phoneRes['data']['phone'];
            }
        }

        $loginRes = $this->authService->loginOrRegisterByWechat($openid, $unionid, (array)$userInfo);
        if ($loginRes['code'] === 200) {
            $this->success($loginRes['data'], '登录成功');
        } else {
            $this->error($loginRes['msg'], $loginRes['code']);
        }
    }

    /**
     * 会员退出登录
     */
    public function logout(): void
    {
        $token = '';
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (!empty($header) && preg_match('/Bearer\s+(\S+)/i', $header, $matches)) {
            $token = $matches[1];
        }
        if (empty($token)) {
            $token = (string)Request::get('token', Request::post('token', ''));
        }
        $this->authService->logoutUser($token);
        $this->success(null, '已安全退出登录');
    }

    /**
     * 获取会员中心个人资料 (包含订单概览与常用预设)
     */
    public function profile(): void
    {
        $user = $this->getAuthedUser();
        // 实时从数据库拉取最新信息
        $fresh = $this->userModel->findById((int)$user['id']);
        if (!$fresh) {
            $this->error('用户不存在或已被删除', 404);
        }

        // 订单状态统计
        $stats = $this->userModel->getUserOrderStatistics((int)$user['id']);
        $fresh['order_stats'] = $stats;

        $this->success($fresh, '获取用户信息成功');
    }

    /**
     * 修改会员基础资料 (昵称、真实姓名、头像)
     */
    public function updateProfile(): void
    {
        $user = $this->getAuthedUser();
        $nickname = trim((string)Request::post('nickname', ''));
        $realname = trim((string)Request::post('realname', ''));
        $avatar = trim((string)Request::post('avatar', ''));

        $data = [];
        if (!empty($nickname)) {
            $data['nickname'] = mb_substr($nickname, 0, 32);
        }
        if ($realname !== '') {
            $data['realname'] = mb_substr($realname, 0, 32);
        }
        if (!empty($avatar)) {
            $data['avatar'] = $avatar;
        }

        if (empty($data)) {
            $this->error('未提供需要更新的资料项');
        }

        $this->userModel->update((int)$user['id'], $data);
        $updatedUser = $this->userModel->findById((int)$user['id']);
        $this->success($updatedUser, '个人资料已更新');
    }

    /**
     * 修改登录密码
     */
    public function changePassword(): void
    {
        $user = $this->getAuthedUser();
        $oldPassword = (string)Request::post('old_password', '');
        $newPassword = (string)Request::post('new_password', '');

        $res = $this->authService->changePassword((int)$user['id'], $oldPassword, $newPassword);
        if ($res['code'] === 200) {
            $this->success(null, $res['msg']);
        } else {
            $this->error($res['msg'], $res['code']);
        }
    }

    /**
     * 设置常用收款方式 (下单自动填充)
     */
    public function savePayoutConfig(): void
    {
        $user = $this->getAuthedUser();
        $payoutType = (string)Request::post('default_payout_type', 'alipay');
        $payoutName = trim((string)Request::post('default_payout_name', ''));
        $payoutAccount = trim((string)Request::post('default_payout_account', ''));
        $payoutBank = trim((string)Request::post('default_payout_bank', ''));

        if (!in_array($payoutType, ['alipay', 'wechat', 'bank', 'cash'], true)) {
            $this->error('不支持的收款方式');
        }

        if ($payoutType !== 'cash' && empty($payoutAccount)) {
            $this->error('收款账号不能为空');
        }

        $this->userModel->update((int)$user['id'], [
            'default_payout_type'    => $payoutType,
            'default_payout_name'    => $payoutName,
            'default_payout_account' => $payoutAccount,
            'default_payout_bank'    => $payoutBank,
        ]);

        $this->success(null, '常用收款方式设置成功');
    }

    /**
     * 设置常用详细地址
     */
    public function saveAddress(): void
    {
        $user = $this->getAuthedUser();
        $address = trim((string)Request::post('default_address', ''));

        $this->userModel->update((int)$user['id'], [
            'default_address' => $address
        ]);

        $this->success(null, '常用地址已保存');
    }

    /**
     * 微信小程序获取并绑定手机号 (支持合并网页历史账号与订单)
     */
    public function bindWechatPhone(): void
    {
        $user = $this->getAuthedUser();
        $code = trim((string)Request::post('code', ''));
        if (empty($code)) {
            $this->error('手机号授权凭据 Code 不能为空');
        }

        $phoneRes = $this->wechatService->getUserPhoneNumber($code);
        if ($phoneRes['code'] !== 200) {
            $this->error($phoneRes['msg'], $phoneRes['code']);
        }

        $mobile = trim((string)($phoneRes['data']['phone'] ?? ''));
        if (!preg_match('/^1[3-9]\d{9}$/', $mobile)) {
            $this->error('获取到的手机号格式不正确，请重新授权');
        }

        // 调用统一的绑定与跨端账号合并服务
        $res = $this->authService->bindOrMergeUserPhone((int)$user['id'], $mobile);
        if ($res['code'] !== 200) {
            $this->error($res['msg'], $res['code']);
        }

        $fresh = $res['data']['user'];

        // 同步刷新 Token 会话缓存 (若发生了账号合并，当前会话自动无缝切换为主账号)
        $token = (string)Request::get('token', Request::post('token', ''));
        if (empty($token)) {
            $header = $_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
            if (!empty($header) && preg_match('/Bearer\s+(\S+)/i', $header, $matches)) {
                $token = $matches[1];
            }
        }
        if (!empty($token)) {
            \App\Service\CacheService::getInstance()->set('user_token:' . $token, $fresh, 86400 * 30);
        }

        $this->success($fresh, $res['msg']);
    }

    /**
     * 手动输入绑定手机号 (支持 Web / H5 环境与账号合并)
     */
    public function bindPhone(): void
    {
        $user = $this->getAuthedUser();
        $mobile = trim((string)Request::post('mobile', ''));
        if (!preg_match('/^1[3-9]\d{9}$/', $mobile)) {
            $this->error('请输入正确的11位手机号码');
        }

        // 调用统一的绑定与账号合并服务
        $res = $this->authService->bindOrMergeUserPhone((int)$user['id'], $mobile);
        if ($res['code'] !== 200) {
            $this->error($res['msg'], $res['code']);
        }

        $fresh = $res['data']['user'];

        $token = (string)Request::get('token', Request::post('token', ''));
        if (empty($token)) {
            $header = $_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
            if (!empty($header) && preg_match('/Bearer\s+(\S+)/i', $header, $matches)) {
                $token = $matches[1];
            }
        }
        if (!empty($token)) {
            \App\Service\CacheService::getInstance()->set('user_token:' . $token, $fresh, 86400 * 30);
        }

        $this->success($fresh, $res['msg']);
    }

    /**
     * 微信小程序端：解除微信绑定 / 撤销微信关联
     * 合规场景：微信端用户自主撤销对当前小程序的授权关联与绑定
     */
    public function unbindWechat(): void
    {
        $user = $this->getAuthedUser();
        $userId = (int)$user['id'];

        // 清除当前账号的微信 openid 与 unionid
        $this->userModel->update($userId, [
            'openid'  => '',
            'unionid' => ''
        ]);

        // 获取当前 Token 并注销该微信会话
        $token = (string)Request::get('token', Request::post('token', ''));
        if (empty($token)) {
            $header = $_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
            if (!empty($header) && preg_match('/Bearer\s+(\S+)/i', $header, $matches)) {
                $token = $matches[1];
            }
        }
        if (!empty($token)) {
            $this->authService->logoutUser($token);
        }

        $this->success(null, '已成功解除微信绑定与授权关联');
    }

    /**
     * 网页端：提交账号注销申请 (个人信息保护合规)
     */
    public function applyDeregister(): void
    {
        $user = $this->getAuthedUser();
        $userId = (int)$user['id'];

        // 1. 前置合规检测：是否尚有进行中的在途履约订单
        if ($this->userModel->hasActiveOrders($userId)) {
            $this->error('您当前尚有正在履约中的回收订单，请待交易完结并打款后再申请注销');
        }

        // 2. 检查当前是否已在审核中
        $fresh = $this->userModel->findById($userId);
        if (($fresh['deregister_status'] ?? 'none') === 'pending') {
            $this->error('您的账号注销申请已在审核中，请耐心等待管理员审核');
        }

        $reason = trim((string)Request::post('reason', '不再使用该平台业务'));
        if (empty($reason)) {
            $reason = '自愿申请注销';
        }
        $reason = mb_substr($reason, 0, 200);

        // 3. 记录注销申请状态
        $this->userModel->update($userId, [
            'deregister_status'        => 'pending',
            'deregister_reason'        => $reason,
            'deregister_apply_time'    => time(),
            'deregister_reject_reason' => ''
        ]);

        $fresh = $this->userModel->findById($userId);
        $fresh['order_stats'] = $this->userModel->getUserOrderStatistics($userId);

        $this->success($fresh, '注销申请已成功提交，平台管理员将在1-3个工作日内完成审核');
    }

    /**
     * 网页端：撤回账号注销申请
     */
    public function cancelDeregister(): void
    {
        $user = $this->getAuthedUser();
        $userId = (int)$user['id'];

        $fresh = $this->userModel->findById($userId);
        if (($fresh['deregister_status'] ?? 'none') !== 'pending') {
            $this->error('当前没有正在审核中的注销申请');
        }

        $this->userModel->update($userId, [
            'deregister_status'     => 'none',
            'deregister_reason'     => '',
            'deregister_apply_time' => 0
        ]);

        $fresh = $this->userModel->findById($userId);
        $fresh['order_stats'] = $this->userModel->getUserOrderStatistics($userId);

        $this->success($fresh, '已成功撤回注销申请，账号恢复正常使用');
    }
}


