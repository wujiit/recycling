<?php
/**
 * 启灵独立回收系统 - 管理后台管理员鉴权控制器
 * 规范：严格校验账号密码与管理 Token 签发
 * 编码：UTF-8 无 BOM
 */

namespace App\Controller\Admin;

use App\Controller\Controller;
use App\Common\Request;
use App\Service\AuthService;

class AuthController extends Controller
{
    private $authService;

    public function __construct()
    {
        $this->authService = new AuthService();
    }

    /**
     * 前台前置安全访问密钥校验 (未登录前校验)
     */
    public function verifyEntryKey(): void
    {
        // 1. 若当前携带了有效管理员 Token，直接放行已登录管理员
        $token = (string)Request::get('token', Request::post('token', ''));
        if (empty($token)) {
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
            if (!empty($authHeader) && preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
                $token = trim($matches[1]);
            }
        }
        if (!empty($token) && $this->authService->checkAdminToken($token)) {
            $this->success(['enabled' => true, 'valid' => true, 'authenticated' => true], '管理员已登录');
            return;
        }

        // 2. 检查系统是否启用了后台访问密钥
        $secret = $this->authService->getAdminEntrySecret();
        if ($secret === '') {
            $this->success(['enabled' => false, 'valid' => true], '系统未启用入口安全访问密钥');
            return;
        }

        // 3. 防爆破安全频率限制 (单 IP 连续探测失败 10 次锁定 15 分钟)
        $clientIp = Request::ip();
        $cache = \App\Service\CacheService::getInstance();
        $failKey = 'adm_entry_fail_ip:' . md5($clientIp);
        $fails = (int)($cache->get($failKey) ?? 0);
        if ($fails >= 10) {
            $this->error('安全访问密钥尝试过于频繁，IP已被临时锁定15分钟', 429);
            return;
        }

        $entryKey = Request::header('X-Admin-Entry-Key', '');
        if (empty($entryKey)) {
            $entryKey = (string)Request::post('entry_key', Request::get('entry_key', ''));
        }
        if (empty($entryKey)) {
            $entryKey = (string)Request::get('key', Request::get('safe_key', Request::get('secret', '')));
        }

        if ($this->authService->verifyAdminEntrySecret($entryKey)) {
            $cache->delete($failKey);
            $this->success(['enabled' => true, 'valid' => true], '后台安全密钥验证通过');
        } else {
            $cache->set($failKey, $fails + 1, 900);
            // 伪装 404 返回，阻断未授权访问
            $this->error('页面不存在或已被移除', 404);
        }
    }

    /**
     * 管理员登录 (前置执行入口安全密钥验证)
     */
    public function login(): void
    {
        // 1. 若系统开启了后台访问密钥，必须携带匹配的密钥
        $entryKey = Request::header('X-Admin-Entry-Key', '');
        if (empty($entryKey)) {
            $entryKey = (string)Request::post('entry_key', Request::get('entry_key', ''));
        }
        if (empty($entryKey)) {
            $entryKey = (string)Request::get('key', Request::get('safe_key', Request::get('secret', '')));
        }

        if (!$this->authService->verifyAdminEntrySecret($entryKey)) {
            // 伪装 404 返回，使全网扫描器判定登录接口不存在
            $this->error('页面或请求接口不存在', 404);
            return;
        }

        $username = (string)Request::post('username', '');
        $password = (string)Request::post('password', '');

        if (empty($username) || empty($password)) {
            $this->error('管理员账号和密码不能为空');
        }

        $res = $this->authService->loginAdmin($username, $password);
        if ($res['code'] === 200) {
            $this->success($res['data'], $res['msg']);
        } else {
            $this->error($res['msg'], $res['code']);
        }
    }

    /**
     * 获取当前管理员信息
     */
    public function info(): void
    {
        $token = (string)Request::get('token', Request::post('token', ''));
        if (empty($token)) {
            $this->error('未提供凭证', 401);
        }

        $admin = $this->authService->checkAdminToken($token);
        if (!$admin) {
            $this->error('登录态已失效', 401);
        }

        $this->success($admin, '获取管理员信息成功');
    }

    /**
     * 变更管理员密码 (兼容路由)
     */
    public function changePassword(): void
    {
        $token = (string)Request::get('token', Request::post('token', ''));
        if (empty($token)) {
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
            if (!empty($authHeader) && preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
                $token = trim($matches[1]);
            }
        }
        $admin = $this->authService->checkAdminToken($token);
        if (!$admin) {
            $this->error('登录态已失效，请重新登录', 401);
        }
        $oldPassword = (string)Request::post('old_password', '');
        $newPassword = (string)Request::post('new_password', '');
        $res = $this->authService->changeAdminPassword((int)$admin['id'], $oldPassword, $newPassword);
        if ($res['code'] === 200) {
            $this->success(null, $res['msg']);
        } else {
            $this->error($res['msg'], $res['code']);
        }
    }
}

