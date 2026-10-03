<?php
/**
 * 启灵独立回收系统 - 管理后台控制器抽象基类
 * 规范：统一拦截未授权请求，严格执行管理 Token 鉴权中间层
 * 编码：UTF-8 无 BOM
 */

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Controller\Controller;
use App\Common\Request;
use App\Common\Response;
use App\Service\AuthService;

abstract class AdminBaseController extends Controller
{
    /**
     * 当前登录管理员信息
     * @var array|null
     */
    protected $admin = null;

    /**
     * 鉴权服务实例
     * @var AuthService
     */
    protected $authService;

    public function __construct()
    {
        $this->authService = new AuthService();
        $this->checkAdminAuth();
    }

    /**
     * 统一管理后台权限校验中间层
     */
    protected function checkAdminAuth(): void
    {
        // 1. 尝试从 Query 参数或 Body 中读取 Token
        $token = (string)Request::get('token', Request::post('token', ''));

        // 2. 尝试从 HTTP 请求头 Authorization: Bearer <token> 中读取
        if (empty($token)) {
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
            if (!empty($authHeader) && preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
                $token = trim($matches[1]);
            }
        }

        if (empty($token)) {
            Response::error('管理凭证不存在，请重新登录', 401);
        }

        $admin = $this->authService->checkAdminToken($token);
        if (!$admin || empty($admin['id'])) {
            Response::error('管理员登录态已失效，请重新登录', 401);
        }

        $this->admin = $admin;
    }

    /**
     * 获取当前管理员 ID
     */
    protected function getAdminId(): int
    {
        return (int)($this->admin['id'] ?? 1);
    }
}
