<?php
/**
 * 启灵同城服务系统 - 鉴权与用户会话服务
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
     * 前台微信小程序用户静默登录 / 自动注册 (支持关联相同手机号的历史账号)
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
                    // 关联已有账号的微信 openid
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
                // 注册自动发放新手优惠券
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
     * 绑定或合并用户手机号 (同步网页端与小程序端账号资产)
     * 
     * 业务流程：
     * 1. 手机号未被任何用户绑定：直接更新当前账号的 mobile。
     * 2. 手机号已被当前账号绑定：直接返回当前账号。
     * 3. 手机号已被其他账号绑定：
     *    - 开启数据库事务
     *    - 将当前账号的 openid、unionid、头像、昵称合并到主账号
     *    - 迁移临时账号的订单与优惠券至主账号
     *    - 清理临时账号
     *    - 提交事务并切换为主账号
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

        // 分支 3：该手机号已被其他账号绑定 -> 合并账号数据
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
     * 前台手机号免密快捷登录（已永久停用）
     */
    public function loginOrRegisterByMobile(string $mobile, string $nickname = ''): array
    {
        return ['code' => 403, 'msg' => '免密快捷登录功能已停用，请使用账号密码登录'];
    }

    /**
     * 前台会员账号密码注册
     */
    public function registerUser(string $mobile, string $password, string $nickname = '', string $realname = ''): array
    {
        $mobile = trim($mobile);
        if (!preg_match('/^1[3-9]\d{9}$/', $mobile)) {
            return ['code' => 400, 'msg' => '请输入正确的11位手机号码'];
        }
        if (mb_strlen($password) < 6) {
            return ['code' => 400, 'msg' => '登录密码长度不得少于6位字符'];
        }

        $existing = $this->userModel->findByMobile($mobile, true);
        if ($existing) {
            if (!empty($existing['password_hash'])) {
                return ['code' => 400, 'msg' => '该手机号已注册，请直接使用密码登录'];
            }
            // 若之前通过微信静默绑定无密码，补充设置密码与资料
            $this->userModel->update((int)$existing['id'], [
                'password_hash' => password_hash($password, PASSWORD_BCRYPT),
                'nickname'      => !empty($nickname) ? $nickname : $existing['nickname'],
                'realname'      => !empty($realname) ? $realname : $existing['realname']
            ]);
            $user = $this->userModel->findById((int)$existing['id']);
        } else {
            $clientIp = \App\Common\Request::ip();
            $userId = $this->userModel->create([
                'openid'        => '',
                'unionid'       => '',
                'mobile'        => $mobile,
                'password_hash' => password_hash($password, PASSWORD_BCRYPT),
                'nickname'      => !empty($nickname) ? $nickname : ('用户' . mb_substr($mobile, -4)),
                'realname'      => $realname,
                'avatar'        => '/uploads/default/avatar.png',
                'register_ip'   => $clientIp
            ]);
            $user = $this->userModel->findById($userId);
            try {
                (new CouponService())->grantAutoCoupons($userId);
            } catch (\Throwable $e) {}
        }

        $token = 'usr_' . \App\Common\Str::random(32);
        unset($user['password_hash']);
        $this->cache->set('user_token:' . $token, $user, 86400 * 30);

        return [
            'code' => 200,
            'msg'  => '注册成功',
            'data' => [
                'token'    => $token,
                'userinfo' => $user
            ]
        ];
    }

    /**
     * 前台会员手机号 + 密码登录
     */
    public function loginUser(string $mobile, string $password): array
    {
        $mobile = trim($mobile);
        if (empty($mobile) || empty($password)) {
            return ['code' => 400, 'msg' => '手机号与密码不能为空'];
        }

        $user = $this->userModel->findByMobile($mobile, true);
        if (!$user) {
            return ['code' => 400, 'msg' => '账号或密码错误，请核对后再试'];
        }

        if (empty($user['password_hash']) || !password_verify($password, $user['password_hash'])) {
            return ['code' => 400, 'msg' => '账号或密码错误，请核对后再试'];
        }

        if ((int)$user['status'] !== 1) {
            return ['code' => 403, 'msg' => '该账号已被系统封禁，无法登录'];
        }

        $clientIp = \App\Common\Request::ip();
        $this->userModel->recordLogin((int)$user['id'], $clientIp);

        $token = 'usr_' . \App\Common\Str::random(32);
        unset($user['password_hash']);
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
     * 会员安全退出登录
     */
    public function logoutUser(string $token): bool
    {
        if (!empty($token)) {
            $this->cache->delete('user_token:' . $token);
        }
        return true;
    }

    /**
     * 会员修改自身密码
     */
    public function changePassword(int $userId, string $oldPassword, string $newPassword): array
    {
        if ($userId <= 0) {
            return ['code' => 401, 'msg' => '用户尚未登录'];
        }
        if (mb_strlen($newPassword) < 6) {
            return ['code' => 400, 'msg' => '新密码长度不得少于6位字符'];
        }

        $user = $this->db->fetchOne("SELECT `id`, `password_hash` FROM `{$this->p}rc_user` WHERE `id` = ? LIMIT 1", [$userId]);
        if (!$user) {
            return ['code' => 404, 'msg' => '用户不存在'];
        }

        // 若原先设置过密码，需校验原密码
        if (!empty($user['password_hash'])) {
            if (empty($oldPassword) || !password_verify($oldPassword, $user['password_hash'])) {
                return ['code' => 400, 'msg' => '原登录密码验证失败'];
            }
        }

        $newHash = password_hash($newPassword, PASSWORD_BCRYPT);
        $this->db->execute("UPDATE `{$this->p}rc_user` SET `password_hash` = ?, `updated_at` = ? WHERE `id` = ?", [$newHash, time(), $userId]);

        return ['code' => 200, 'msg' => '密码修改成功，请牢记新密码'];
    }

    /**
     * 管理员修改自身密码
     */
    public function changeAdminPassword(int $adminId, string $oldPassword, string $newPassword): array
    {
        if ($adminId <= 0) {
            return ['code' => 401, 'msg' => '管理员未登录'];
        }
        if (mb_strlen($newPassword) < 6) {
            return ['code' => 400, 'msg' => '新密码长度不得少于6位字符'];
        }

        $admin = $this->db->fetchOne("SELECT `id`, `password` FROM `{$this->p}sys_admin` WHERE `id` = ? LIMIT 1", [$adminId]);
        if (!$admin) {
            return ['code' => 404, 'msg' => '管理员不存在'];
        }

        if (!password_verify($oldPassword, $admin['password'])) {
            return ['code' => 400, 'msg' => '原管理员登录密码不正确'];
        }

        $newHash = password_hash($newPassword, PASSWORD_BCRYPT);
        $this->db->execute("UPDATE `{$this->p}sys_admin` SET `password` = ?, `updated_at` = ? WHERE `id` = ?", [$newHash, time(), $adminId]);
        $this->logAdminAction($adminId, 'change_password', '管理员修改自身登录密码');

        return ['code' => 200, 'msg' => '管理员密码修改成功'];
    }

    /**
     * 更新管理员个人真实姓名
     */
    public function updateAdminProfile(int $adminId, string $realname): array
    {
        $this->db->execute("UPDATE `{$this->p}sys_admin` SET `realname` = ?, `updated_at` = ? WHERE `id` = ?", [$realname, time(), $adminId]);
        $fresh = $this->db->fetchOne("SELECT `id`, `username`, `realname`, `role`, `status` FROM `{$this->p}sys_admin` WHERE `id` = ? LIMIT 1", [$adminId]);
        return ['code' => 200, 'msg' => '资料已更新', 'data' => $fresh];
    }

    /**
     * 获取系统管理员列表
     */
    public function getAdminList(): array
    {
        return $this->db->fetchAll("SELECT `id`, `username`, `realname`, `role`, `status`, `last_login_time`, `last_login_ip`, `created_at` FROM `{$this->p}sys_admin` ORDER BY `id` ASC");
    }

    /**
     * 创建系统管理员账号
     */
    public function createAdmin(string $username, string $password, string $realname, string $role, int $currentAdminId): array
    {
        $has = $this->db->fetchOne("SELECT `id` FROM `{$this->p}sys_admin` WHERE `username` = ? LIMIT 1", [$username]);
        if ($has) {
            return ['code' => 400, 'msg' => '管理员账号已被占用，请更换'];
        }

        $now = time();
        $hash = password_hash($password, PASSWORD_BCRYPT);
        $this->db->execute(
            "INSERT INTO `{$this->p}sys_admin` (`username`, `password`, `realname`, `role`, `status`, `created_at`, `updated_at`) VALUES (?, ?, ?, ?, 1, ?, ?)",
            [$username, $hash, $realname, $role, $now, $now]
        );
        $newId = (int)$this->db->lastInsertId();
        $this->logAdminAction($currentAdminId, 'create_admin', "创建管理员账号: {$username} (ID: {$newId})");

        return [
            'code' => 200,
            'msg'  => '管理员创建成功',
            'data' => [
                'id'       => $newId,
                'username' => $username,
                'realname' => $realname,
                'role'     => $role
            ]
        ];
    }

    /**
     * 启用/停用管理员账号
     */
    public function updateAdminStatus(int $id, int $status, int $currentAdminId): array
    {
        if ($id === 1) {
            return ['code' => 400, 'msg' => '超级管理员账号不可禁用'];
        }
        if ($id === $currentAdminId) {
            return ['code' => 400, 'msg' => '不可修改当前登录管理员自身的状态'];
        }
        $this->db->execute("UPDATE `{$this->p}sys_admin` SET `status` = ?, `updated_at` = ? WHERE `id` = ?", [$status, time(), $id]);
        $statusText = $status === 1 ? '启用' : '停用';
        $this->logAdminAction($currentAdminId, 'update_admin_status', "{$statusText}管理员 ID: {$id}");
        return ['code' => 200, 'msg' => "管理员账号已{$statusText}"];
    }

    /**
     * 重置管理员密码
     */
    public function resetAdminPassword(int $id, string $password, int $currentAdminId): array
    {
        $hash = password_hash($password, PASSWORD_BCRYPT);
        $this->db->execute("UPDATE `{$this->p}sys_admin` SET `password` = ?, `updated_at` = ? WHERE `id` = ?", [$hash, time(), $id]);
        $this->logAdminAction($currentAdminId, 'reset_admin_password', "重置管理员 ID: {$id} 的登录密码");
        return ['code' => 200, 'msg' => '管理员密码重置成功'];
    }

    /**
     * 删除管理员账号
     */
    public function deleteAdmin(int $id, int $currentAdminId): array
    {
        if ($id === 1) {
            return ['code' => 400, 'msg' => '超级管理员账号不可删除'];
        }
        if ($id === $currentAdminId) {
            return ['code' => 400, 'msg' => '不可删除当前登录账号自身'];
        }
        $this->db->execute("DELETE FROM `{$this->p}sys_admin` WHERE `id` = ?", [$id]);
        $this->logAdminAction($currentAdminId, 'delete_admin', "删除管理员账号 ID: {$id}");
        return ['code' => 200, 'msg' => '管理员已删除'];
    }

    /**
     * 写入管理员操作日志
     */
    public function logAdminAction(int $adminId, string $action, string $remark): void
    {
        try {
            $p = $this->p;
            $this->db->execute("CREATE TABLE IF NOT EXISTS `{$p}sys_admin_log` (
                `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
                `admin_id` int(11) unsigned NOT NULL DEFAULT '0',
                `action` varchar(64) NOT NULL DEFAULT '',
                `remark` varchar(255) NOT NULL DEFAULT '',
                `ip` varchar(45) NOT NULL DEFAULT '',
                `created_at` int(11) unsigned NOT NULL DEFAULT '0',
                PRIMARY KEY (`id`),
                KEY `idx_admin_time` (`admin_id`, `created_at`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理员操作审计日志'");

            $ip = \App\Common\Request::ip();
            $this->db->execute(
                "INSERT INTO `{$p}sys_admin_log` (`admin_id`, `action`, `remark`, `ip`, `created_at`) VALUES (?, ?, ?, ?, ?)",
                [$adminId, $action, mb_substr($remark, 0, 255), $ip, time()]
            );
        } catch (\Throwable $e) {}
    }

    /**
     * 获取管理员审计日志
     */
    public function getAdminLogs(int $limit = 30): array
    {
        try {
            $p = $this->p;
            $sql = "SELECT l.`id`, l.`admin_id`, l.`action`, l.`remark`, l.`ip`, l.`created_at`, a.`username`, a.`realname` 
                    FROM `{$p}sys_admin_log` l 
                    LEFT JOIN `{$p}sys_admin` a ON l.`admin_id` = a.`id` 
                    ORDER BY l.`id` DESC LIMIT ?";
            return $this->db->fetchAll($sql, [$limit]);
        } catch (\Throwable $e) {
            return [];
        }
    }
}
