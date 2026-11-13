<?php
/**
 * Web 统一应用主入口与轻量路由调度器
 * 核心逻辑：
 * 1. 自动检测 install.lock，未安装则重定向至 /install/ 启动安装向导
 * 2. 已安装则启动自动加载，根据请求调度 Controller 与 Action
 * 3. 全局异常静默捕获，防止系统堆栈外露
 */

declare(strict_types=1);

// 定义应用根路径常量
define('ROOT_PATH', dirname(__DIR__));
define('APP_PATH', ROOT_PATH . DIRECTORY_SEPARATOR . 'app');

// 1. 一键安装感知检测：未安装直接重定向至向导
$lockFile = ROOT_PATH . DIRECTORY_SEPARATOR . 'install' . DIRECTORY_SEPARATOR . 'install.lock';
$publicLock = ROOT_PATH . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'install' . DIRECTORY_SEPARATOR . 'install.lock';
if (!is_file($lockFile) && !is_file($publicLock)) {
    $uri = $_SERVER['REQUEST_URI'] ?? '/';
    if (strpos($uri, '/install') === false) {
        header('Location: /install/index.php', true, 302);
        exit;
    }
}

// 2. 引入原生自动加载器 (零 Composer 依赖)
require_once APP_PATH . DIRECTORY_SEPARATOR . 'common' . DIRECTORY_SEPARATOR . 'Autoloader.php';
\App\Common\Autoloader::register();

use App\Common\Response;
use App\Common\Request;

// 注入 Trace-ID 响应头
if (!headers_sent()) {
    header('X-Trace-Id: ' . Request::traceId());
}

// 3. 全局异常与错误静默捕获
register_shutdown_function(function() {
    $err = error_get_last();
    if ($err && in_array($err['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        // 记录本地日志
        $logDir = ROOT_PATH . DIRECTORY_SEPARATOR . 'runtime' . DIRECTORY_SEPARATOR . 'logs';
        if (!is_dir($logDir)) {
            @mkdir($logDir, 0755, true);
        }
        $logFile = $logDir . DIRECTORY_SEPARATOR . date('Y-m-d') . '.log';
        $logContent = sprintf("[%s] [Trace:%s] FATAL: %s in %s:%d\n\n", date('Y-m-d H:i:s'), Request::traceId(), $err['message'] ?? '', $err['file'] ?? '', $err['line'] ?? 0);
        @file_put_contents($logFile, $logContent, FILE_APPEND | LOCK_EX);

        if (!headers_sent()) {
            header('Content-Type: application/json; charset=utf-8');
            http_response_code(200);
        }
        echo json_encode([
            'code' => 500,
            'msg'  => '系统服务暂时繁忙，请稍后刷新重试',
            'data' => null
        ], JSON_UNESCAPED_UNICODE);
    }
});

set_exception_handler(function (\Throwable $e) {
    // 写入安全运行日志
    $logDir = ROOT_PATH . DIRECTORY_SEPARATOR . 'runtime' . DIRECTORY_SEPARATOR . 'logs';
    if (!is_dir($logDir)) {
        @mkdir($logDir, 0755, true);
    }
    $logFile = $logDir . DIRECTORY_SEPARATOR . date('Y-m-d') . '.log';
    $logContent = sprintf("[%s] [Trace:%s] %s in %s:%d\nStack Trace:\n%s\n\n", date('Y-m-d H:i:s'), Request::traceId(), $e->getMessage(), $e->getFile(), $e->getLine(), $e->getTraceAsString());
    @file_put_contents($logFile, $logContent, FILE_APPEND | LOCK_EX);

    Response::error('系统繁忙，请稍后重试', 500);
});

// 4. 解析轻量路由
// 支持 query 传参形式: ?module=api&controller=appraisal&action=calculate
// 或 path 形式: ?s=/api/appraisal/calculate
$s = (string)Request::get('s', '');
$module = (string)Request::get('module', '');
$controller = (string)Request::get('controller', '');
$action = (string)Request::get('action', '');

// 4.0 伪静态与 PATH_INFO 路由自适应探测 (兼容 Nginx try_files 及顺丰等第三方回调原生直达)
if (empty($s) && empty($module)) {
    $uriPath = '';
    if (!empty($_SERVER['PATH_INFO'])) {
        $uriPath = (string)$_SERVER['PATH_INFO'];
    } elseif (!empty($_SERVER['REQUEST_URI'])) {
        $reqParts = explode('?', (string)$_SERVER['REQUEST_URI'], 2);
        $uriPath = $reqParts[0] ?? '';
    }
    $uriPath = trim($uriPath, '/');
    if (preg_match('/^(api|admin)\//i', $uriPath)) {
        $s = '/' . $uriPath;
    }
}

if (!empty($s)) {
    // 若 $s 自身携带问号传参，剥离并将附加参数合并至 $_GET
    if (strpos($s, '?') !== false) {
        [$cleanS, $queryString] = explode('?', $s, 2);
        parse_str($queryString, $extraParams);
        foreach ($extraParams as $k => $v) {
            if (!isset($_GET[$k])) {
                $_GET[$k] = $v;
            }
        }
        $s = $cleanS;
    }
    $parts = array_values(array_filter(explode('/', trim($s, '/'))));
    $module = $parts[0] ?? 'api';
    $controller = $parts[1] ?? 'appraisal';
    $action = $parts[2] ?? 'getCategories';
}

// 4.1 根访问智能引导（已安装时，浏览器直接访问域名自动展示回收前台）
if (empty($s) && empty($module) && empty($controller) && empty($action)) {
    header('Location: /index.html', true, 302);
    exit;
}

$module = strtolower($module ?: 'api');
$controller = ucfirst(strtolower($controller ?: 'appraisal'));
$action = $action ?: 'index';

// 基础健康检查心跳
if ($module === 'api' && $controller === 'Ping') {
    Response::success([
        'system'     => '启灵独立二手回收系统',
        'version'    => '1.0.0',
        'status'     => 'online',
        'timestamp'  => time(),
        'redis_mode' => 'isolated_multitenant'
    ], '系统底层服务运行正常');
}

// 调度控制器
$class = sprintf("App\\Controller\\%s\\%sController", ucfirst($module), $controller);

if (!class_exists($class)) {
    Response::error("路由目标控制器不存在 [{$module}/{$controller}]", 404);
}

$instance = new $class();
if (!is_callable([$instance, $action])) {
    // 兼容短横线命名转驼峰命名 (如 apply-deregister => applyDeregister, unbind-wechat => unbindWechat)
    $camelAction = lcfirst(str_replace(' ', '', ucwords(str_replace('-', ' ', $action))));
    if (is_callable([$instance, $camelAction])) {
        $action = $camelAction;
    } else {
        Response::error("路由操作不存在或受保护 [{$action}]", 404);
    }
}

// 严禁调用魔术方法或私有/受保护的方法
if (strpos($action, '__') === 0 || !is_callable([$instance, $action])) {
    Response::error("路由操作非法或受保护 [{$action}]", 403);
}

// 4.2 商业正版授权守卫 (保护核心商业业务与资金放款链路)
// 本地及局域网开发环境与官方研发根域 (isLocalDevDomain) 自动放行
// 生产环境允许前台公开只读浏览 (商品目录、分类、生活服务、文章等)，未激活正版授权时严格管控商业下单与资金放款
$isProtectedOrderApi = (strtolower($module) === 'api' && strtolower($controller) === 'order' && in_array(strtolower($action), ['create'], true));
if ($isProtectedOrderApi) {
    $licenseService = \App\Service\LicenseService::getInstance();
    if (!$licenseService->checkStatus()) {
        Response::error('当前回收系统尚未激活正版授权，暂无法提交商业回收订单，请联系管理员配置商业授权码', 403, [
            'license_required' => true,
            'status'           => 'unauthorized'
        ]);
    }
}

// 管理后台关键资金与放款通道二次防护
if (strtolower($module) === 'admin' && in_array(strtolower($controller), ['payout'], true)) {
    $licenseService = \App\Service\LicenseService::getInstance();
    if (!$licenseService->checkStatus()) {
        Response::error('商业正版授权未生效，财务放款功能已锁定，请先前往【系统设置 - 商业正版授权】完成激活', 403, [
            'license_required' => true,
            'status'           => 'unauthorized'
        ]);
    }
}

// 执行控制器对应方法
$instance->$action();
