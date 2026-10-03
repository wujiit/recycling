<?php
/**
 * 启灵独立回收系统 - 系统管理员管理与账号安全控制器
 * 规范：统一继承 AdminBaseController 鉴权中间层，杜绝越权与弱口令
 * 编码：UTF-8 无 BOM
 */

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Controller\Admin\AdminBaseController;
use App\Common\Request;
use App\Model\Database;

class AdminController extends AdminBaseController
{
    /**
     * 获取当前登录管理员的个人安全档案
     */
    public function profile(): void
    {
        $adminId = (int)($this->admin['id'] ?? 0);
        $db = Database::getInstance();
        $p = $db->getPrefix();
        $row = $db->fetchOne("SELECT `id`, `username`, `realname`, `role`, `status`, `last_login_time`, `last_login_ip`, `created_at`, `updated_at` 
                              FROM `{$p}sys_admin` WHERE `id` = ? LIMIT 1", [$adminId]);
        if (!$row) {
            $this->error('管理员账号不存在或已被删除', 404);
        }
        $this->success($row, '获取管理员档案成功');
    }

    /**
     * 当前管理员修改自身密码 (严格核验原密码)
     */
    public function changePassword(): void
    {
        $adminId = (int)($this->admin['id'] ?? 0);
        $oldPassword = (string)Request::post('old_password', '');
        $newPassword = (string)Request::post('new_password', '');

        if (empty($oldPassword)) {
            $this->error('请输入当前正在使用的原登录密码');
        }
        if (mb_strlen($newPassword) < 6) {
            $this->error('新密码长度不能少于6位字符');
        }

        $res = $this->authService->changeAdminPassword($adminId, $oldPassword, $newPassword);
        if ($res['code'] === 200) {
            $this->success(null, $res['msg']);
        } else {
            $this->error($res['msg'], $res['code']);
        }
    }

    /**
     * 当前管理员修改自身个人资料 (真实姓名)
     */
    public function updateProfile(): void
    {
        $adminId = (int)($this->admin['id'] ?? 0);
        $realname = trim((string)Request::post('realname', ''));
        if (empty($realname)) {
            $this->error('管理员姓名不能为空');
        }

        $res = $this->authService->updateAdminProfile($adminId, $realname);
        if ($res['code'] === 200) {
            $this->success($res['data'], $res['msg']);
        } else {
            $this->error($res['msg'], $res['code']);
        }
    }

    /**
     * 获取全系统管理员列表 (支持权限协作)
     */
    public function list(): void
    {
        $list = $this->authService->getAdminList();
        $this->success(['list' => $list, 'total' => count($list)], '获取管理员列表成功');
    }

    /**
     * 创建新增系统管理员账号
     */
    public function create(): void
    {
        $username = trim((string)Request::post('username', ''));
        $password = (string)Request::post('password', '');
        $realname = trim((string)Request::post('realname', ''));
        $role = trim((string)Request::post('role', 'admin'));
        $currentAdminId = (int)($this->admin['id'] ?? 0);

        if (empty($username)) {
            $this->error('管理员账号不能为空');
        }
        if (!preg_match('/^[a-zA-Z0-9_\-\.]{3,32}$/', $username)) {
            $this->error('管理员账号仅支持3-32位英文、数字、下划线');
        }
        if (mb_strlen($password) < 6) {
            $this->error('初始登录密码不得少于6位');
        }

        $res = $this->authService->createAdmin($username, $password, $realname, $role, $currentAdminId);
        if ($res['code'] === 200) {
            $this->success($res['data'], $res['msg']);
        } else {
            $this->error($res['msg'], $res['code']);
        }
    }

    /**
     * 启用/停用管理员账号
     */
    public function updateStatus(): void
    {
        $id = Request::postInt('id', 0);
        $status = Request::postInt('status', 1);
        $currentAdminId = (int)($this->admin['id'] ?? 0);

        if ($id <= 0) {
            $this->error('管理员 ID 不能为空');
        }

        $res = $this->authService->updateAdminStatus($id, $status, $currentAdminId);
        if ($res['code'] === 200) {
            $this->success(null, $res['msg']);
        } else {
            $this->error($res['msg'], $res['code']);
        }
    }

    /**
     * 重置指定管理员账号密码
     */
    public function resetPassword(): void
    {
        $id = Request::postInt('id', 0);
        $password = (string)Request::post('password', '');
        $currentAdminId = (int)($this->admin['id'] ?? 0);

        if ($id <= 0) {
            $this->error('管理员 ID 不能为空');
        }
        if (mb_strlen($password) < 6) {
            $this->error('重置密码长度不得少于6位');
        }

        $res = $this->authService->resetAdminPassword($id, $password, $currentAdminId);
        if ($res['code'] === 200) {
            $this->success(null, $res['msg']);
        } else {
            $this->error($res['msg'], $res['code']);
        }
    }

    /**
     * 删除指定管理员账号
     */
    public function delete(): void
    {
        $id = Request::postInt('id', 0);
        $currentAdminId = (int)($this->admin['id'] ?? 0);

        if ($id <= 0) {
            $this->error('管理员 ID 不能为空');
        }

        $res = $this->authService->deleteAdmin($id, $currentAdminId);
        if ($res['code'] === 200) {
            $this->success(null, $res['msg']);
        } else {
            $this->error($res['msg'], $res['code']);
        }
    }

    /**
     * 获取管理员安全操作审计日志
     */
    public function loginLogs(): void
    {
        $logs = $this->authService->getAdminLogs(30);
        $this->success(['list' => $logs], '获取安全日志成功');
    }
}
