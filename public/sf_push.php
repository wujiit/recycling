<?php
/**
 * 启灵独立回收系统 - 顺丰速运开放平台运费推送直达入口 (零伪静态依赖)
 * 对应接口：EXP_RECE_WAYBILLS_FEE_PUSH (清单运费推送接口)
 * 供顺丰开放平台后台直接填入回调地址，提供 100% 免伪静态的秒级网络测试连通与推送支持
 * 编码：UTF-8 无 BOM
 */

declare(strict_types=1);

define('ROOT_PATH', dirname(__DIR__));
define('APP_PATH', ROOT_PATH . DIRECTORY_SEPARATOR . 'app');

// 引入原生自动加载器
require_once APP_PATH . DIRECTORY_SEPARATOR . 'common' . DIRECTORY_SEPARATOR . 'Autoloader.php';
\App\Common\Autoloader::register();

// 智能分发至顺丰三大推送接口：运费推送、路由推送或订单状态推送
$controller = new \App\Controller\Api\SfController();
$raw = (string)@file_get_contents('php://input');
if (stripos($raw, 'orderState') !== false || stripos($raw, 'PushOrderState') !== false) {
    $controller->orderStatePush();
} elseif (stripos($raw, 'WaybillRoute') !== false || stripos($raw, 'RoutePushService') !== false) {
    $controller->routePush();
} else {
    $controller->feePush();
}
