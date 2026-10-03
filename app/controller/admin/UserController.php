<?php
/**
 * 启灵独立回收系统 - 后台回收客户管理控制器
 * 规范：支持客户多维检索、封禁拉黑与订单统揽
 * 编码：UTF-8 无 BOM
 */

namespace App\Controller\Admin;

use App\Controller\Admin\AdminBaseController;
use App\Common\Request;
use App\Model\Database;

class UserController extends AdminBaseController
{
    private $db;

    public function __construct()
    {
        parent::__construct();
        $this->db = Database::getInstance();
    }

    /**
     * 回收客户列表
     */
    public function list(): void
    {
        $p = $this->db->getPrefix();
        $keyword = (string)Request::get('keyword', '');
        $page = Request::getInt('page', 1);
        $pageSize = Request::getInt('page_size', 15);

        $conditions = ["1=1"];
        $params = [];

        if (!empty($keyword)) {
            $conditions[] = "(`u`.`mobile` LIKE ? OR `u`.`nickname` LIKE ?)";
            $like = '%' . $keyword . '%';
            $params[] = $like;
            $params[] = $like;
        }

        $deregisterStatus = (string)Request::get('deregister_status', '');
        if (!empty($deregisterStatus) && in_array($deregisterStatus, ['pending', 'rejected', 'none'], true)) {
            $conditions[] = "`u`.`deregister_status` = ?";
            $params[] = $deregisterStatus;
        }

        $whereSql = implode(' AND ', $conditions);
        $offset = max(0, ($page - 1) * $pageSize);

        $countSql = "SELECT COUNT(*) as `total` FROM `{$p}rc_user` `u` WHERE {$whereSql}";
        $totalRow = $this->db->fetchOne($countSql, $params);
        $total = (int)($totalRow['total'] ?? 0);

        $pendingDeregisterCount = (int)($this->db->fetchOne("SELECT COUNT(*) as c FROM `{$p}rc_user` WHERE `deregister_status` = 'pending'")['c'] ?? 0);

        $sql = "SELECT `u`.*, 
                       (SELECT COUNT(*) FROM `{$p}rc_order` `o` WHERE `o`.`user_id` = `u`.`id`) AS `order_count`,
                       (SELECT COUNT(*) FROM `{$p}rc_order` `o` WHERE `o`.`user_id` = `u`.`id` AND `o`.`status` IN ('pending_send', 'in_transit', 'received', 'inspecting', 'price_confirming')) AS `active_order_count`,
                       (SELECT SUM(`final_price`) FROM `{$p}rc_order` `o` WHERE `o`.`user_id` = `u`.`id` AND `o`.`status` = 'completed') AS `total_turnover`
                FROM `{$p}rc_user` `u` 
                WHERE {$whereSql} 
                ORDER BY `u`.`id` DESC 
                LIMIT {$offset}, {$pageSize}";
        $list = $this->db->fetchAll($sql, $params);

        $missingIps = [];
        foreach ($list as $item) {
            if (empty($item['register_location']) && !empty($item['register_ip'])) {
                $missingIps[$item['register_ip']] = true;
            }
            if (empty($item['last_login_location']) && !empty($item['last_login_ip'])) {
                $missingIps[$item['last_login_ip']] = true;
            }
        }
        $ipMap = [];
        if (!empty($missingIps)) {
            $ipMap = \App\Service\IpService::getInstance()->batchResolve(array_keys($missingIps));
        }

        foreach ($list as &$item) {
            $item['has_password'] = (!empty($item['password_hash'])) ? 1 : 0;
            unset($item['password_hash']);
            if (empty($item['risk_tag'])) {
                $item['risk_tag'] = 'normal';
            }
            if (empty($item['deregister_status'])) {
                $item['deregister_status'] = 'none';
            }
            if (empty($item['register_location']) && !empty($item['register_ip'])) {
                $item['register_location'] = $ipMap[$item['register_ip']] ?? '';
            }
            if (empty($item['last_login_location']) && !empty($item['last_login_ip'])) {
                $item['last_login_location'] = $ipMap[$item['last_login_ip']] ?? '';
            }
        }
        unset($item);

        $this->success([
            'list'                     => $list,
            'total'                    => $total,
            'page'                     => $page,
            'page_size'                => $pageSize,
            'pending_deregister_count' => $pendingDeregisterCount
        ], '获取用户列表成功');
    }

    /**
     * 变更用户状态 (正常 / 封禁)
     */
    public function updateStatus(): void
    {
        $id = Request::postInt('id', 0);
        $status = Request::postInt('status', 1);

        if ($id <= 0) {
            $this->error('用户 ID 不能为空');
        }

        $p = $this->db->getPrefix();
        $this->db->execute("UPDATE `{$p}rc_user` SET `status` = ?, `updated_at` = ? WHERE `id` = ?", [$status, time(), $id]);
        $this->success(null, '用户状态已更新');
    }

    /**
     * 管理员重置会员登录密码
     */
    public function resetPassword(): void
    {
        $id = Request::postInt('id', 0);
        $password = (string)Request::post('password', '');
        if ($id <= 0) {
            $this->error('用户 ID 不能为空');
        }
        if (mb_strlen($password) < 6) {
            $this->error('重置密码长度不得少于6位');
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);
        $p = $this->db->getPrefix();
        $this->db->execute("UPDATE `{$p}rc_user` SET `password_hash` = ?, `updated_at` = ? WHERE `id` = ?", [$hash, time(), $id]);
        $this->success(null, '用户密码已成功重置');
    }

    /**
     * 管理员后台手动录入/创建新用户
     */
    public function create(): void
    {
        $mobile = trim((string)Request::post('mobile', ''));
        $password = (string)Request::post('password', '');
        $nickname = trim((string)Request::post('nickname', ''));
        $realname = trim((string)Request::post('realname', ''));
        $payoutType = (string)Request::post('default_payout_type', 'alipay');
        $payoutName = trim((string)Request::post('default_payout_name', ''));
        $payoutAccount = trim((string)Request::post('default_payout_account', ''));
        $payoutBank = trim((string)Request::post('default_payout_bank', ''));

        if (!preg_match('/^1[3-9]\d{9}$/', $mobile)) {
            $this->error('请输入合法的11位手机号码');
        }
        if (mb_strlen($password) < 6) {
            $this->error('初始密码长度不得少于6位');
        }

        $p = $this->db->getPrefix();
        $exist = $this->db->fetchOne("SELECT `id` FROM `{$p}rc_user` WHERE `mobile` = ? LIMIT 1", [$mobile]);
        if ($exist) {
            $this->error('该手机号已在系统中存在，请勿重复创建');
        }

        $userModel = new \App\Model\UserModel();
        $userId = $userModel->create([
            'openid'                 => '',
            'unionid'                => '',
            'password_hash'          => password_hash($password, PASSWORD_DEFAULT),
            'mobile'                 => $mobile,
            'nickname'               => !empty($nickname) ? $nickname : ('客户' . mb_substr($mobile, -4)),
            'realname'               => $realname,
            'avatar'                 => '/uploads/default/avatar.png',
            'default_payout_type'    => $payoutType,
            'default_payout_name'    => $payoutName,
            'default_payout_account' => $payoutAccount,
            'default_payout_bank'    => $payoutBank,
            'register_ip'            => Request::ip(),
        ]);

        if ($userId <= 0) {
            $this->error('添加用户失败，请检查数据库');
        }

        $this->success(['id' => $userId], '客户账号已成功录入');
    }

    /**
     * 获取指定用户的回收订单明细列表
     */
    public function orders(): void
    {
        $userId = Request::getInt('user_id', 0);
        if ($userId <= 0) {
            $this->error('用户 ID 参数错误');
        }

        $p = $this->db->getPrefix();
        $sql = "SELECT `id`, `order_sn`, `device_name`, `estimate_price`, `final_price`, `fulfillment_type`, 
                       `payout_type`, `status`, `express_sn`, `created_at` 
                FROM `{$p}rc_order` 
                WHERE `user_id` = ? 
                ORDER BY `id` DESC LIMIT 50";
        $list = $this->db->fetchAll($sql, [$userId]);

        $this->success($list, '获取用户订单成功');
    }

    /**
     * 获取用户总体统计指标 (看板数据)
     */
    public function statistics(): void
    {
        $p = $this->db->getPrefix();
        $sql = "SELECT 
                    COUNT(*) as total_users,
                    SUM(CASE WHEN `status` = 1 THEN 1 ELSE 0 END) as active_users,
                    SUM(CASE WHEN `status` = 0 THEN 1 ELSE 0 END) as banned_users
                FROM `{$p}rc_user`";
        $userStats = $this->db->fetchOne($sql);

        $orderSql = "SELECT 
                        COUNT(*) as total_completed_orders,
                        COALESCE(SUM(`final_price`), 0) as total_turnover
                     FROM `{$p}rc_order` WHERE `status` = 'completed'";
        $orderStats = $this->db->fetchOne($orderSql);

        $pendingDeregisterCount = (int)($this->db->fetchOne("SELECT COUNT(*) as c FROM `{$p}rc_user` WHERE `deregister_status` = 'pending'")['c'] ?? 0);

        $this->success([
            'total_users'              => (int)($userStats['total_users'] ?? 0),
            'active_users'             => (int)($userStats['active_users'] ?? 0),
            'banned_users'             => (int)($userStats['banned_users'] ?? 0),
            'pending_deregister_count' => $pendingDeregisterCount,
            'total_completed_orders'   => (int)($orderStats['total_completed_orders'] ?? 0),
            'total_turnover'           => number_format((float)($orderStats['total_turnover'] ?? 0), 2, '.', '')
        ], '获取用户看板统计成功');
    }

    /**
     * 变更回收用户风控评级标签
     */
    public function updateRisk(): void
    {
        $id = Request::postInt('id', 0);
        $riskTag = trim((string)Request::post('risk_tag', 'normal'));
        if ($id <= 0) {
            $this->error('用户 ID 不能为空');
        }

        $p = $this->db->getPrefix();
        // 自愈添加 risk_tag 字段
        try {
            $this->db->execute("ALTER TABLE `{$p}rc_user` ADD COLUMN `risk_tag` VARCHAR(32) NOT NULL DEFAULT 'normal' COMMENT '风控标签: normal正常, trusted优质, dispute争议, fraud欺诈预警'");
        } catch (\Throwable $e) {
            // 已存在则静默忽略
        }

        $this->db->execute("UPDATE `{$p}rc_user` SET `risk_tag` = ?, `updated_at` = ? WHERE `id` = ?", [$riskTag, time(), $id]);
        $this->success(['risk_tag' => $riskTag], '用户风控标签已更新');
    }

    /**
     * 强制踢出前台用户 (吊销其所有活跃会话凭据)
     */
    public function kick(): void
    {
        $id = Request::postInt('id', 0);
        if ($id <= 0) {
            $this->error('用户 ID 不能为空');
        }
        $this->authService->kickUser($id);
        $this->success(null, '已成功吊销该用户所有在途登录凭据并强制下线');
    }

    /**
     * 管理员审核通过并注销账号 (数据匿名化清理)
     */
    public function approveDeregister(): void
    {
        $id = Request::postInt('id', 0);
        if ($id <= 0) {
            $this->error('用户 ID 不能为空');
        }

        $p = $this->db->getPrefix();
        $user = $this->db->fetchOne("SELECT * FROM `{$p}rc_user` WHERE `id` = ? LIMIT 1", [$id]);
        if (!$user) {
            $this->error('该用户不存在或已被删除');
        }

        // 检查是否有在途进行中的回收订单
        $userModel = new \App\Model\UserModel();
        if ($userModel->hasActiveOrders($id)) {
            $this->error('该客户尚有进行中的履约回收订单未完结，暂无法注销删号，请待订单完结后再审核');
        }

        $this->db->beginTransaction();
        try {
            // 1. 清理客户加价券资产
            $this->db->execute("DELETE FROM `{$p}rc_user_coupon` WHERE `user_id` = ?", [$id]);

            // 2. 匿名化历史订单 (合规财税审计留痕流水，抹除与自然人关联)
            $this->db->execute("UPDATE `{$p}rc_order` SET `user_id` = 0 WHERE `user_id` = ?", [$id]);

            // 3. 吊销并强制踢出该用户所有在途会话
            $this->authService->kickUser($id);

            // 4. 物理删除该会员记录 (完成销户)
            $this->db->execute("DELETE FROM `{$p}rc_user` WHERE `id` = ? LIMIT 1", [$id]);

            // 5. 记录管理员安全审计日志
            $adminId = (int)($this->admin['id'] ?? 1);
            $this->authService->logAdminAction($adminId, 'approve_deregister', "管理员审核通过并注销删号：用户ID={$id}, 手机号={$user['mobile']}, 昵称={$user['nickname']}");

            $this->db->commit();
        } catch (\Throwable $e) {
            $this->db->rollBack();
            $this->error('注销删号执行失败，请稍后重试: ' . $e->getMessage());
        }

        $this->success(null, '已成功审核通过并注销删除该客户账号');
    }

    /**
     * 管理员驳回注销申请
     */
    public function rejectDeregister(): void
    {
        $id = Request::postInt('id', 0);
        $reason = trim((string)Request::post('reject_reason', ''));
        if ($id <= 0) {
            $this->error('用户 ID 不能为空');
        }
        if (empty($reason)) {
            $reason = '管理员审核不符合注销条件';
        }

        $p = $this->db->getPrefix();
        $user = $this->db->fetchOne("SELECT * FROM `{$p}rc_user` WHERE `id` = ? LIMIT 1", [$id]);
        if (!$user) {
            $this->error('用户不存在');
        }

        $this->db->execute("UPDATE `{$p}rc_user` SET `deregister_status` = 'rejected', `deregister_reject_reason` = ?, `updated_at` = ? WHERE `id` = ?", [
            $reason,
            time(),
            $id
        ]);

        $adminId = (int)($this->admin['id'] ?? 1);
        $this->authService->logAdminAction($adminId, 'reject_deregister', "管理员驳回用户注销申请：用户ID={$id}, 驳回原因: {$reason}");

        $this->success(null, '已成功驳回该注销申请');
    }

    /**
     * 管理员常规客户列表手动删号
     */
    public function delete(): void
    {
        $id = Request::postInt('id', 0);
        if ($id <= 0) {
            $this->error('用户 ID 不能为空');
        }

        $p = $this->db->getPrefix();
        $user = $this->db->fetchOne("SELECT * FROM `{$p}rc_user` WHERE `id` = ? LIMIT 1", [$id]);
        if (!$user) {
            $this->error('该用户不存在或已被删除');
        }

        $userModel = new \App\Model\UserModel();
        if ($userModel->hasActiveOrders($id)) {
            $this->error('该客户尚有进行中的履约回收订单未完结，暂无法直接删除');
        }

        $this->db->beginTransaction();
        try {
            $this->db->execute("DELETE FROM `{$p}rc_user_coupon` WHERE `user_id` = ?", [$id]);
            $this->db->execute("UPDATE `{$p}rc_order` SET `user_id` = 0 WHERE `user_id` = ?", [$id]);
            $this->authService->kickUser($id);
            $this->db->execute("DELETE FROM `{$p}rc_user` WHERE `id` = ? LIMIT 1", [$id]);

            $adminId = (int)($this->admin['id'] ?? 1);
            $this->authService->logAdminAction($adminId, 'delete_user', "管理员手动删除客户账号：用户ID={$id}, 手机号={$user['mobile']}");

            $this->db->commit();
        } catch (\Throwable $e) {
            $this->db->rollBack();
            $this->error('删除客户执行失败: ' . $e->getMessage());
        }

        $this->success(null, '客户账号已成功删除');
    }
}

