<?php
/**
 * 启灵回收系统 - 鉴权与用户会话服务
 * 提供管理员与前台会员 Token 签发、安全验证与用户信息管理
 */

namespace App\Service;

use App\Model\Database;
use App\Model\UserModel;
use App\Helper\Str;

class AuthService
{
    private $userModel;
    private $cache;

    public function __construct()
    {
        $this->userModel = new UserModel();
        $this->cache = CacheService::getInstance();
    }

    /**
     * 获取管理后台安全访问密钥 (空字符串表示未开启保护)
     */
    public function getAdminEntrySecret(): string
    {
        try {
            $cached = $this->cache->get('sys_config:all');
            if (is_array($cached) && isset($cached['admin_entry_secret'])) {
                return trim((string)$cached['admin_entry_secret']);
            }
            $db = Database::getInstance();
            $p = $db->getPrefix();
            $row = $db->fetchOne("SELECT `config_value` FROM `{$p}sys_config` WHERE `config_key` = 'admin_entry_secret' LIMIT 1");
            return trim((string)($row['config_value'] ?? ''));
        } catch (\Throwable $e) {
            return '';
        }
    }

    /**
     * 校验客户端提交的安全访问密钥
     */
    public function verifyAdminEntrySecret(?string $providedKey): bool
    {
        $secret = $this->getAdminEntrySecret();
        if ($secret === '') {
            // 未设置访问密钥，全局开放
            return true;
        }
        if (empty($providedKey)) {
            return false;
        }
        return hash_equals($secret, trim($providedKey));
    }

    /**
     * 管理后台账号密码登录 (增加 IP 与账号防爆破高阶防护)
     */
    public function loginAdmin(string $username, string $password): array
    {
        $clientIp = \App\Common\Request::ip();
        $ipFailKey = 'adm_login_fail_ip:' . md5($clientIp);
        $userFailKey = 'adm_login_fail_user:' . md5($username);

        $ipFails = (int)($this->cache->get($ipFailKey) ?? 0);
        $userFails = (int)($this->cache->get($userFailKey) ?? 0);
        if ($ipFails >= 5 || $userFails >= 5) {
            return ['code' => 429, 'msg' => '连续登录失败次数过多，该IP及账号已被临时安全锁定15分钟，请稍后再试'];
        }

        $db = Database::getInstance();
        $p = $db->getPrefix();
        $sql = "SELECT `id`, `username`, `password_hash`, `realname`, `role`, `status` 
                FROM `{$p}sys_admin` WHERE `username` = ? LIMIT 1";
        $admin = $db->fetchOne($sql, [$username]);

        if (!$admin || !password_verify($password, $admin['password_hash'])) {
            $newFails = max($ipFails, $userFails) + 1;
            $this->cache->set($ipFailKey, $ipFails + 1, 900);
            $this->cache->set($userFailKey, $userFails + 1, 900);
            $remain = max(0, 5 - $newFails);
            if ($remain > 0) {
                return ['code' => 400, 'msg' => "管理员账号或密码错误，您还剩 {$remain} 次尝试机会"];
            } else {
                return ['code' => 429, 'msg' => '连续密码错误已达5次，该IP及账号已被临时锁定15分钟'];
            }
        }

        if ((int)$admin['status'] !== 1) {
            return ['code' => 400, 'msg' => '账号已被停用，请联系主管'];
        }

        // 登录成功，清理防爆破计数器
        $this->cache->delete($ipFailKey);
        $this->cache->delete($userFailKey);

        // 更新最后登录记录
        $updateSql = "UPDATE `{$p}sys_admin` SET `last_login_time` = ?, `last_login_ip` = ? WHERE `id` = ?";
        $db->execute($updateSql, [time(), $clientIp, $admin['id']]);

        // 签发管理员 Token
        $token = 'adm_' . Str::random(32);
        $payload = [
            'id'       => (int)$admin['id'],
            'username' => $admin['username'],
            'realname' => $admin['realname'],
            'role'     => $admin['role'],
        ];
        // 缓存 24 小时
        $this->cache->set('admin_token:' . $token, $payload, 86400);

        // 记录管理员登录安全审计日志
        $this->logAdminAction((int)$admin['id'], 'login', '管理员后台登录成功', $clientIp);

        return [
            'code' => 200,
            'msg'  => '登录成功',
            'data' => [
                'token'    => $token,
                'userinfo' => $payload
            ]
        ];
    }

    /**
     * 校验管理员 Token
     */
    public function checkAdminToken(string $token): ?array
    {
        if (empty($token)) {
            return null;
        }
        return $this->cache->get('admin_token:' . $token);
    }

    /**
     * 读取系统参数开关 (默认返回 true)
     */
    public function isConfigEnabled(string $configKey, bool $default = true): bool
    {
        try {
            $db = Database::getInstance();
            $p = $db->getPrefix();
            $row = $db->fetchOne("SELECT `config_value` FROM `{$p}sys_config` WHERE `config_key` = ? LIMIT 1", [$configKey]);
            if ($row && isset($row['config_value'])) {
                return $row['config_value'] !== '0';
            }
        } catch (\Throwable $e) {}
        return $default;
    }

    /**
     * 前台微信小程序用户静默登录 / 自动注册 (支持与 Web 端手机号历史账号自动打通同步)
     */
    public function loginOrRegisterByWechat(string $openid, string $unionid = '', array $userInfo = []): array
    {
        if (!$this->isConfigEnabled('user_auth_wechat_enabled', true)) {
            return ['code' => 403, 'msg' => '系统未开启微信快捷登录，请使用其他方式'];
        }

        $clientIp = \App\Common\Request::ip();
        $user = $this->userModel->findByOpenid($openid);
        $mobile = trim((string)($userInfo['mobile'] ?? ''));

        if (!$user) {
            // 若前端携带了手机号，优先查找系统是否已有该手机号的 Web 历史账号
            if (!empty($mobile) && preg_match('/^1[3-9]\d{9}$/', $mobile)) {
                $existUser = $this->userModel->findByMobile($mobile);
                if ($existUser) {
                    // 直接将微信 openid 关联到已有 Web 账号，打通双端数据！
                    $updateFields = [
                        'openid'  => $openid,
                        'unionid' => !empty($unionid) ? $unionid : ($existUser['unionid'] ?? '')
                    ];
                    if (empty($existUser['avatar']) && !empty($userInfo['avatar'])) {
                        $updateFields['avatar'] = $userInfo['avatar'];
                    }
                    if ((empty($existUser['nickname']) || $existUser['nickname'] === '新用户' || $existUser['nickname'] === '微信用户') && !empty($userInfo['nickname'])) {
                        $updateFields['nickname'] = $userInfo['nickname'];
                    }
                    $this->userModel->update((int)$existUser['id'], $updateFields);
                    $user = $this->userModel->findById((int)$existUser['id']);
                }
            }

            // 若无匹配历史账号，创建新的微信会员
            if (!$user) {
                $userId = $this->userModel->create([
                    'openid'      => $openid,
                    'unionid'     => $unionid,
                    'mobile'      => $mobile,
                    'nickname'    => $userInfo['nickname'] ?? '微信用户',
                    'avatar'      => $userInfo['avatar'] ?? '',
                    'register_ip' => $clientIp
                ]);
                $user = $this->userModel->findById($userId);
                // 自动注入新人加价券大礼包 (转转/闲鱼同款裂变促单机制)
                try {
                    (new CouponService())->grantAutoCoupons($userId);
                } catch (\Throwable $e) {}
            }
        } else {
            // 已存在用户：若此次授权携带了手机号，且原账号手机号为空
            if (!empty($mobile) && preg_match('/^1[3-9]\d{9}$/', $mobile) && empty($user['mobile'])) {
                $mergeRes = $this->bindOrMergeUserPhone((int)$user['id'], $mobile, $userInfo);
                if ($mergeRes['code'] === 200 && !empty($mergeRes['data']['user'])) {
                    $user = $mergeRes['data']['user'];
                }
            }
        }

        if ((int)$user['status'] !== 1) {
            return ['code' => 403, 'msg' => '您的账号已被限制登录'];
        }

        // 记录登录时间与 IP
        $this->userModel->recordLogin((int)$user['id'], $clientIp);

        // 签发会员 Token (有效期 30 天)
        $token = 'usr_' . Str::random(32);
        $this->cache->set('user_token:' . $token, $user, 86400 * 30);

        return [
            'code' => 200,
            'msg'  => '登录成功',
            'data' => [
                'token'    => $token,
                'userinfo' => $user
            ]
        ];
    }

    /**
     * 绑定或自动合并用户手机号 (打通 PC/H5 网页端与微信小程序端跨端资产)
     * 
     * 核心业务场景：
     * 1. 手机号未被任何用户绑定：直接更新当前微信账号的 mobile。
     * 2. 手机号已被当前账号绑定：直接返回当前账号。
     * 3. 手机号已在网页端存在历史账号：
     *    - 开启数据库事务 (保证事务原子性)
     *    - 将当前临时微信账号的 openid、unionid、头像、昵称无缝合并到网页端主账号
     *    - 迁移临时账号产生的所有订单 (rc_order.user_id) 至主账号 (100% 资产不丢失)
     *    - 迁移临时账号获得的所有加价券 (rc_user_coupon.user_id) 至主账号
     *    - 注销清理临时微信账号 (清空 openid 避免唯一冲突，状态设为 0)
     *    - 提交事务，会话平滑切换为主账号，向前端返回合并后的主账号全景数据
     */
    public function bindOrMergeUserPhone(int $currentUserId, string $mobile, array $extra = []): array
    {
        if ($currentUserId <= 0) {
            return ['code' => 401, 'msg' => '请先登录'];
        }
        $mobile = trim($mobile);
        if (!preg_match('/^1[3-9]\d{9}$/', $mobile)) {
            return ['code' => 400, 'msg' => '手机号码格式不正确，请输入11位大陆手机号'];
        }

        $currentUser = $this->userModel->findById($currentUserId);
        if (!$currentUser) {
            return ['code' => 404, 'msg' => '当前账号不存在或已被移除'];
        }

        // 检索系统中是否已有该手机号的用户 (如先前在 PC/H5 网页端注册过)
        $existingUser = $this->userModel->findByMobile($mobile);

        // 分支 1：系统尚无此手机号，直接绑定到当前用户
        if (!$existingUser) {
            $this->userModel->update($currentUserId, ['mobile' => $mobile]);
            $fresh = $this->userModel->findById($currentUserId);
            $fresh['order_stats'] = $this->userModel->getUserOrderStatistics($currentUserId);
            return [
                'code' => 200,
                'msg'  => '手机号绑定成功',
                'data' => [
                    'user'      => $fresh,
                    'is_merged' => false
                ]
            ];
        }

        // 分支 2：该手机号就是当前账号本身
        if ((int)$existingUser['id'] === $currentUserId) {
            $fresh = $this->userModel->findById($currentUserId);
            $fresh['order_stats'] = $this->userModel->getUserOrderStatistics($currentUserId);
            return [
                'code' => 200,
                'msg'  => '该手机号已是当前账号绑定号码',
                'data' => [
                    'user'      => $fresh,
                    'is_merged' => false
                ]
            ];
        }

        // 分支 3：该手机号已被其他账号（如网页端注册的历史老账号）绑定 -> 触发跨端账号全量合并打通！
        $mainUserId = (int)$existingUser['id'];
        $tempUserId = $currentUserId;

        $db = Database::getInstance();
        $p = $db->getPrefix();

        $db->beginTransaction();
        try {
            // 1. 微信身份凭据与基础资料合并到主账号
            $mainUpdate = [
                'openid'  => !empty($currentUser['openid']) ? $currentUser['openid'] : $existingUser['openid'],
                'unionid' => !empty($currentUser['unionid']) ? $currentUser['unionid'] : ($existingUser['unionid'] ?? ''),
            ];
            // 若主账号缺少头像，合并微信头像
            if (empty($existingUser['avatar']) && !empty($currentUser['avatar'])) {
                $mainUpdate['avatar'] = $currentUser['avatar'];
            }
            // 若主账号昵称是默认值，合并微信昵称
            if ((empty($existingUser['nickname']) || $existingUser['nickname'] === '新用户' || $existingUser['nickname'] === '微信用户') && !empty($currentUser['nickname'])) {
                $mainUpdate['nickname'] = $currentUser['nickname'];
            }
            // 若主账号缺少常用收款预设，临时账号已设置，合并补充
            if (empty($existingUser['default_payout_account']) && !empty($currentUser['default_payout_account'])) {
                $mainUpdate['default_payout_type']    = $currentUser['default_payout_type'];
                $mainUpdate['default_payout_name']    = $currentUser['default_payout_name'];
                $mainUpdate['default_payout_account'] = $currentUser['default_payout_account'];
                $mainUpdate['default_payout_bank']    = $currentUser['default_payout_bank'];
            }
            // 若主账号缺少常用地址预设，临时账号已设置，合并补充
            if (empty($existingUser['default_address']) && !empty($currentUser['default_address'])) {
                $mainUpdate['default_address'] = $currentUser['default_address'];
            }
            $this->userModel->update($mainUserId, $mainUpdate);

            // 2. 跨表原子性迁移：将临时微信账号下的全部订单归属转移至主账号
            $db->execute("UPDATE `{$p}rc_order` SET `user_id` = ? WHERE `user_id` = ?", [$mainUserId, $tempUserId]);

            // 3. 跨表原子性迁移：将临时微信账号下的全部加价券归属转移至主账号
            $db->execute("UPDATE `{$p}rc_user_coupon` SET `user_id` = ? WHERE `user_id` = ?", [$mainUserId, $tempUserId]);

            // 4. 注销清理临时微信账号：置空 openid, unionid 与手机号，避免后续索引冲突；标记状态为已合并停用
            $db->execute("UPDATE `{$p}rc_user` SET `openid` = '', `unionid` = '', `mobile` = '', `status` = 0, `nickname` = '已合并注销账号', `updated_at` = ? WHERE `id` = ?", [time(), $tempUserId]);

            $db->commit();
        } catch (\Throwable $e) {
            $db->rollBack();
            return [
                'code' => 500,
                'msg'  => '账号同步合并处理失败，请稍后重试: ' . $e->getMessage()
            ];
        }

        // 重新拉取合并后的主账号最新全景数据
        $fresh = $this->userModel->findById($mainUserId);
        $fresh['order_stats'] = $this->userModel->getUserOrderStatistics($mainUserId);

        return [
            'code' => 200,
            'msg'  => '已成功绑定手机号，并自动同步合并您在网页端的历史订单与资产数据',
            'data' => [
                'user'         => $fresh,
                'is_merged'    => true,
                'main_user_id' => $mainUserId
            ]
        ];
    }

    /**
     * 校验前台会员 Token (含会话强制下线校验)
     */
    public function checkUserToken(string $token): ?array
    {
        if (empty($token)) {
            return null;
        }
        $user = $this->cache->get('user_token:' . $token);
        if (!$user) {
            return null;
        }
        $userId = (int)($user['id'] ?? 0);
        // 检查该会员是否被管理员执行过安全吊销强制下线
        if ($userId > 0 && $this->cache->get('user_kicked:' . $userId)) {
            $this->cache->delete('user_token:' . $token);
            return null;
        }
        return $user;
    }

    /**
     * 管理员吊销会员凭据并强制下线
     */
    public function kickUser(int $userId): bool
    {
        if ($userId <= 0) {
            return false;
        }
        // 标记 24 小时下线阻断
        $this->cache->set('user_kicked:' . $userId, time(), 86400);
        return true;
    }

    /**
     * 前台手机号免密极速登录 / 自动注册 (适配 Web 页面与 H5)
     */
    public function loginOrRegisterByMobile(string $mobile, string $nickname = ''): array
    {
        if (!$this->isConfigEnabled('user_auth_fast_enabled', true)) {
            return ['code' => 403, 'msg' => '系统未开启免密快捷登录，请使用账号密码登录'];
        }

        $clientIp = \App\Common\Request::ip();
        $user = $this->userModel->findByMobile($mobile);
        if (!$user) {
            $userId = $this->userModel->create([
                'openid'      => '',
                'unionid'     => '',
                'mobile'      => $mobile,
                'nickname'    => !empty($nickname) ? $nickname : ('用户' . mb_substr($mobile, -4)),
                'avatar'      => '/uploads/default/avatar.png',
                'register_ip' => $clientIp
            ]);
            $user = $this->userModel->findById($userId);
            // 自动注入新人加价券大礼包 (转转/闲鱼同款裂变促单机制)
            try {
                (new CouponService())->grantAutoCoupons($userId);
            } catch (\Throwable $e) {}
        }

        if ((int)$user['status'] !== 1) {
            return ['code' => 403, 'msg' => '您的账号已被限制使用'];
        }

        // 记录登录时间与 IP
        $this->userModel->recordLogin((int)$user['id'], $clientIp);

        // 签发会员 Token (有效期 30 天)
        $token = 'usr_' . Str::random(32);
        $this->cache->set('user_token:' . $token, $user, 86400 * 30);

        return [
            'code' => 200,
            'msg'  => '登录成功',
            'data' => [
                'token'    => $token,
                'userinfo' => $user
            ]
        ];
    }

    /**
     * 前台会员手机号 + 密码注册
     */
    public function registerUser(string $mobile, string $password, string $nickname = '', string $realname = ''): array
    {
        if (!$this->isConfigEnabled('user_register_enabled', true)) {
            return ['code' => 403, 'msg' => '系统当前暂未开放公开注册，请联系客服'];
        }

        $mobile = trim($mobile);
        if (!preg_match('/^1[3-9]\d{9}$/', $mobile)) {
            return ['code' => 400, 'msg' => '请输入有效的11位手机号码'];
        }
        if (mb_strlen($password) < 6) {
            return ['code' => 400, 'msg' => '登录密码长度不得少于6位'];
        }

        // 检查手机号是否已存在
        $exist = $this->userModel->findByMobile($mobile);
        if ($exist) {
            // 如果已存在且没有密码（免密注册过的用户），自动绑定密码并登录
            $existFull = $this->userModel->findByMobile($mobile, true);
            if (empty($existFull['password_hash'])) {
                $hash = password_hash($password, PASSWORD_DEFAULT);
                $this->userModel->update((int)$exist['id'], [
                    'password_hash' => $hash,
                    'realname'      => !empty($realname) ? $realname : ($exist['realname'] ?? '')
                ]);
                return $this->loginUser($mobile, $password);
            }
            return ['code' => 400, 'msg' => '该手机号已注册，请直接登录'];
        }

        $clientIp = \App\Common\Request::ip();
        $hash = password_hash($password, PASSWORD_DEFAULT);
        $userId = $this->userModel->create([
            'openid'        => '',
            'unionid'       => '',
            'password_hash' => $hash,
            'mobile'        => $mobile,
            'nickname'      => !empty($nickname) ? trim($nickname) : ('用户' . mb_substr($mobile, -4)),
            'realname'      => trim($realname),
            'avatar'        => '/uploads/default/avatar.png',
            'register_ip'   => $clientIp
        ]);

        if ($userId <= 0) {
            return ['code' => 500, 'msg' => '注册账号失败，请稍后重试'];
        }

        // 记录登录时间与 IP
        $this->userModel->recordLogin($userId, $clientIp);

        $user = $this->userModel->findById($userId);
        $token = 'usr_' . Str::random(32);
        $this->cache->set('user_token:' . $token, $user, 86400 * 30);

        return [
            'code' => 200,
            'msg'  => '注册成功并已为您自动登录',
            'data' => [
                'token'    => $token,
                'userinfo' => $user
            ]
        ];
    }

    /**
     * 前台会员账号/手机号 + 密码登录
     */
    public function loginUser(string $mobile, string $password): array
    {
        if (!$this->isConfigEnabled('user_auth_password_enabled', true)) {
            return ['code' => 403, 'msg' => '系统未开启账号密码登录功能'];
        }

        $mobile = trim($mobile);
        if (empty($mobile) || empty($password)) {
            return ['code' => 400, 'msg' => '手机号与密码不能为空'];
        }

        $user = $this->userModel->findByMobile($mobile, true);
        if (!$user) {
            return ['code' => 400, 'msg' => '该手机号尚未注册，请先注册'];
        }

        if ((int)$user['status'] !== 1) {
            return ['code' => 403, 'msg' => '该账号已被限制使用，请联系客服'];
        }

        // 密码校验
        if (empty($user['password_hash']) || !password_verify($password, $user['password_hash'])) {
            return ['code' => 400, 'msg' => '账号或密码不正确，请重新输入'];
        }

        // 记录登录时间与 IP
        $this->userModel->recordLogin((int)$user['id'], \App\Common\Request::ip());

        // 安全过滤掉 password_hash 返回
        unset($user['password_hash']);

        $token = 'usr_' . Str::random(32);
        $this->cache->set('user_token:' . $token, $user, 86400 * 30);

        return [
            'code' => 200,
            'msg'  => '登录成功',
            'data' => [
                'token'    => $token,
                'userinfo' => $user
            ]
        ];
    }

    /**
     * 修改会员登录密码
     */
    public function changePassword(int $userId, string $oldPassword, string $newPassword): array
    {
        if (mb_strlen($newPassword) < 6) {
            return ['code' => 400, 'msg' => '新密码长度不得少于6位'];
        }

        $db = Database::getInstance();
        $p = $db->getPrefix();
        $row = $db->fetchOne("SELECT `password_hash` FROM `{$p}rc_user` WHERE `id` = ? LIMIT 1", [$userId]);
        if (!$row) {
            return ['code' => 404, 'msg' => '用户不存在'];
        }

        // 若原密码存在，必须核验旧密码
        if (!empty($row['password_hash'])) {
            if (empty($oldPassword) || !password_verify($oldPassword, $row['password_hash'])) {
                return ['code' => 400, 'msg' => '原密码输入错误，无法完成修改'];
            }
        }

        $newHash = password_hash($newPassword, PASSWORD_DEFAULT);
        $this->userModel->update($userId, ['password_hash' => $newHash]);

        return ['code' => 200, 'msg' => '密码已成功修改'];
    }

    /**
     * 前台会员退出登录
     */
    public function logoutUser(string $token): void
    {
        if (!empty($token)) {
            $this->cache->delete('user_token:' . $token);
        }
    }

    /**
     * 管理员自改密码 (严格校验原密码)
     */
    public function changeAdminPassword(int $adminId, string $oldPassword, string $newPassword): array
    {
        if ($adminId <= 0) {
            return ['code' => 400, 'msg' => '管理员参数错误'];
        }
        if (mb_strlen($newPassword) < 6) {
            return ['code' => 400, 'msg' => '新密码长度不得少于6位'];
        }

        $db = Database::getInstance();
        $p = $db->getPrefix();
        $admin = $db->fetchOne("SELECT `id`, `username`, `password_hash` FROM `{$p}sys_admin` WHERE `id` = ? LIMIT 1", [$adminId]);
        if (!$admin) {
            return ['code' => 404, 'msg' => '管理员账号不存在'];
        }

        if (!password_verify($oldPassword, $admin['password_hash'])) {
            return ['code' => 400, 'msg' => '原登录密码不正确，请核对后重试'];
        }

        $newHash = password_hash($newPassword, PASSWORD_DEFAULT);
        $db->execute("UPDATE `{$p}sys_admin` SET `password_hash` = ?, `updated_at` = ? WHERE `id` = ?", [$newHash, time(), $adminId]);

        $this->logAdminAction($adminId, 'change_password', '修改个人登录密码', $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1');

        return ['code' => 200, 'msg' => '登录密码已成功修改，请妥善保管新密码'];
    }

    /**
     * 更新管理员个人基本信息 (真实姓名)
     */
    public function updateAdminProfile(int $adminId, string $realname): array
    {
        if ($adminId <= 0) {
            return ['code' => 400, 'msg' => '管理员参数错误'];
        }
        $db = Database::getInstance();
        $p = $db->getPrefix();
        $db->execute("UPDATE `{$p}sys_admin` SET `realname` = ?, `updated_at` = ? WHERE `id` = ?", [$realname, time(), $adminId]);

        $this->logAdminAction($adminId, 'update_profile', '更新个人真实姓名为：' . $realname, $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1');

        return ['code' => 200, 'msg' => '个人资料已更新', 'data' => ['realname' => $realname]];
    }

    /**
     * 获取全系统管理员列表
     */
    public function getAdminList(): array
    {
        $db = Database::getInstance();
        $p = $db->getPrefix();
        $sql = "SELECT `id`, `username`, `realname`, `role`, `status`, `last_login_time`, `last_login_ip`, `created_at` 
                FROM `{$p}sys_admin` ORDER BY `id` ASC";
        return $db->fetchAll($sql) ?: [];
    }

    /**
     * 创建新增系统管理员账号
     */
    public function createAdmin(string $username, string $password, string $realname, string $role, int $currentAdminId): array
    {
        $db = Database::getInstance();
        $p = $db->getPrefix();

        $exist = $db->fetchOne("SELECT `id` FROM `{$p}sys_admin` WHERE `username` = ? LIMIT 1", [$username]);
        if ($exist) {
            return ['code' => 400, 'msg' => '该管理员登录账号已存在，不能重复添加'];
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);
        $time = time();
        $db->execute("INSERT INTO `{$p}sys_admin` (`username`, `password_hash`, `salt`, `realname`, `role`, `status`, `created_at`, `updated_at`) 
                      VALUES (?, ?, '', ?, ?, 1, ?, ?)", [$username, $hash, $realname, $role, $time, $time]);
        $newId = (int)$db->lastInsertId();

        $this->logAdminAction($currentAdminId, 'create_admin', "添加新管理员：{$username}（{$realname}，角色：{$role}）", $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1');

        return ['code' => 200, 'msg' => '新管理员账号创建成功', 'data' => ['id' => $newId]];
    }

    /**
     * 变更管理员启禁用状态
     */
    public function updateAdminStatus(int $id, int $status, int $currentAdminId): array
    {
        if ($id === $currentAdminId) {
            return ['code' => 400, 'msg' => '禁止停用当前登录的管理员自身账号'];
        }

        $db = Database::getInstance();
        $p = $db->getPrefix();
        $db->execute("UPDATE `{$p}sys_admin` SET `status` = ?, `updated_at` = ? WHERE `id` = ?", [$status, time(), $id]);

        $statusText = $status === 1 ? '启用' : '停用';
        $this->logAdminAction($currentAdminId, 'update_admin_status', "{$statusText}管理员账号 [ID: {$id}]", $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1');

        return ['code' => 200, 'msg' => "管理员账号已成功{$statusText}"];
    }

    /**
     * 重置指定管理员密码
     */
    public function resetAdminPassword(int $id, string $password, int $currentAdminId): array
    {
        $db = Database::getInstance();
        $p = $db->getPrefix();
        $hash = password_hash($password, PASSWORD_DEFAULT);
        $db->execute("UPDATE `{$p}sys_admin` SET `password_hash` = ?, `updated_at` = ? WHERE `id` = ?", [$hash, time(), $id]);

        $this->logAdminAction($currentAdminId, 'reset_admin_password', "重置管理员 [ID: {$id}] 的登录密码", $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1');

        return ['code' => 200, 'msg' => '已成功重置该管理员的登录密码'];
    }

    /**
     * 删除管理员账号
     */
    public function deleteAdmin(int $id, int $currentAdminId): array
    {
        if ($id === $currentAdminId) {
            return ['code' => 400, 'msg' => '禁止删除当前正在登录的管理员自身账号'];
        }

        $db = Database::getInstance();
        $p = $db->getPrefix();
        $countRow = $db->fetchOne("SELECT COUNT(*) as `total` FROM `{$p}sys_admin`");
        if ((int)($countRow['total'] ?? 0) <= 1) {
            return ['code' => 400, 'msg' => '系统中至少需要保留一个管理员账号，不能全部删除'];
        }

        $target = $db->fetchOne("SELECT `username` FROM `{$p}sys_admin` WHERE `id` = ? LIMIT 1", [$id]);
        $targetName = $target['username'] ?? "ID: {$id}";

        $db->execute("DELETE FROM `{$p}sys_admin` WHERE `id` = ?", [$id]);

        $this->logAdminAction($currentAdminId, 'delete_admin', "删除管理员账号：{$targetName}", $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1');

        return ['code' => 200, 'msg' => '管理员账号已成功删除'];
    }

    /**
     * 写入管理员操作审计日志
     */
    public function logAdminAction(int $adminId, string $action, string $detail, string $ip = ''): void
    {
        try {
            $db = Database::getInstance();
            $p = $db->getPrefix();

            // 自愈检测表结构
            $db->execute("CREATE TABLE IF NOT EXISTS `{$p}sys_admin_log` (
                `id` bigint unsigned NOT NULL AUTO_INCREMENT,
                `admin_id` int unsigned NOT NULL DEFAULT 0,
                `admin_name` varchar(64) NOT NULL DEFAULT '',
                `action` varchar(64) NOT NULL DEFAULT '',
                `detail` varchar(255) NOT NULL DEFAULT '',
                `ip` varchar(45) NOT NULL DEFAULT '',
                `user_agent` varchar(255) NOT NULL DEFAULT '',
                `created_at` int unsigned NOT NULL DEFAULT 0,
                PRIMARY KEY (`id`),
                KEY `idx_admin_id` (`admin_id`),
                KEY `idx_created` (`created_at`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

            $adminName = '系统';
            if ($adminId > 0) {
                $row = $db->fetchOne("SELECT `username`, `realname` FROM `{$p}sys_admin` WHERE `id` = ? LIMIT 1", [$adminId]);
                if ($row) {
                    $adminName = !empty($row['realname']) ? $row['realname'] : $row['username'];
                }
            }

            $ua = mb_substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 250);
            $clientIp = !empty($ip) ? $ip : ($_SERVER['REMOTE_ADDR'] ?? '127.0.0.1');

            $db->execute("INSERT INTO `{$p}sys_admin_log` (`admin_id`, `admin_name`, `action`, `detail`, `ip`, `user_agent`, `created_at`) 
                          VALUES (?, ?, ?, ?, ?, ?, ?)", [
                $adminId,
                $adminName,
                $action,
                $detail,
                $clientIp,
                $ua,
                time()
            ]);
        } catch (\Throwable $e) {
            // 静默安全捕获
        }
    }

    /**
     * 读取管理员安全审计日志
     */
    public function getAdminLogs(int $limit = 30): array
    {
        try {
            $db = Database::getInstance();
            $p = $db->getPrefix();
            // 自愈确保表存在
            $db->execute("CREATE TABLE IF NOT EXISTS `{$p}sys_admin_log` (
                `id` bigint unsigned NOT NULL AUTO_INCREMENT,
                `admin_id` int unsigned NOT NULL DEFAULT 0,
                `admin_name` varchar(64) NOT NULL DEFAULT '',
                `action` varchar(64) NOT NULL DEFAULT '',
                `detail` varchar(255) NOT NULL DEFAULT '',
                `ip` varchar(45) NOT NULL DEFAULT '',
                `user_agent` varchar(255) NOT NULL DEFAULT '',
                `created_at` int unsigned NOT NULL DEFAULT 0,
                PRIMARY KEY (`id`),
                KEY `idx_admin_id` (`admin_id`),
                KEY `idx_created` (`created_at`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

            $sql = "SELECT `id`, `admin_id`, `admin_name`, `action`, `detail`, `ip`, `user_agent`, `created_at` 
                    FROM `{$p}sys_admin_log` ORDER BY `id` DESC LIMIT {$limit}";
            return $db->fetchAll($sql) ?: [];
        } catch (\Throwable $e) {
            return [];
        }
    }
}


