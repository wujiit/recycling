<?php
/**
 * 启灵独立回收系统 - 顺丰速运开放平台路由推送直达入口 (零伪静态依赖)
 * 对应接口：RoutePushService (路由推送接口-速运类API)
 * 供顺丰开放平台后台直接填入回调地址，提供 100% 免伪静态的秒级网络测试连通与增量路由推送
 * 编码：UTF-8 无 BOM
 */

declare(strict_types=1);

define('ROOT_PATH', dirname(__DIR__));
define('APP_PATH', ROOT_PATH . DIRECTORY_SEPARATOR . 'app');

// 引入原生自动加载器
require_once APP_PATH . DIRECTORY_SEPARATOR . 'common' . DIRECTORY_SEPARATOR . 'Autoloader.php';
\App\Common\Autoloader::register();

// 分发至顺丰路由推送控制器动作
$controller = new \App\Controller\Api\SfController();
$controller->routePush();
