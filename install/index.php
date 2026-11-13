<?php
/**
 * 启灵独立回收系统 - 图形化一键安装向导入口
 * 编码：UTF-8 无 BOM
 */

ini_set('display_errors', '1');
error_reporting(E_ALL);

// 注册致命错误捕获器，杜绝 500 白屏
register_shutdown_function(function() {
    $err = error_get_last();
    if ($err && in_array($err['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        if (!headers_sent()) {
            header('Content-Type: text/html; charset=utf-8');
            http_response_code(200);
        }
        echo '<div style="margin:50px auto;max-width:800px;padding:30px;background:#fff5f5;border:1px solid #feb2b2;border-radius:8px;font-family:sans-serif;">';
        echo '<h2 style="color:#c53030;margin-top:0;">⚠️ 安装程序检测到运行异常</h2>';
        echo '<p style="color:#4a5568;font-size:15px;"><strong>错误原因：</strong>' . htmlspecialchars($err['message']) . '</p>';
        echo '<p style="color:#718096;font-size:13px;"><strong>出错文件：</strong>' . htmlspecialchars($err['file']) . ' 第 ' . $err['line'] . ' 行</p>';
        echo '</div>';
    }
});

define('IN_INSTALL', true);

try {
    require_once __DIR__ . '/InstallController.php';

    $installer = new \Install\InstallController();

    // 检查安装锁与数据库连通状态
    $step = (int)($_GET['step'] ?? 1);
    $dbOk = $installer->checkCurrentDbConnection();
    $isInstalled = $installer->isInstalled();

    // 1. 处理 Ajax 异步请求
    $act = $_GET['act'] ?? '';
    if (!empty($act)) {
        header('Content-Type: application/json; charset=utf-8');

        // 安全硬屏障：系统已安装时，严格阻断重装、写库与探测操作
        if ($isInstalled) {
            echo json_encode(['code' => 403, 'msg' => '系统已安装受保护，严禁执行安装、配置重写或探测操作！如需维护请先从服务器手动删除 install.lock 文件'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $rawInput = file_get_contents('php://input');
        $payload = json_decode($rawInput, true) ?: [];

        switch ($act) {
            case 'test_db':
                $res = $installer->testDatabase($payload);
                echo json_encode($res, JSON_UNESCAPED_UNICODE);
                exit;

            case 'test_redis':
                $res = $installer->testRedis($payload);
                echo json_encode($res, JSON_UNESCAPED_UNICODE);
                exit;

            case 'save_db_only':
                $res = $installer->saveDatabaseOnly($payload);
                echo json_encode($res, JSON_UNESCAPED_UNICODE);
                exit;

            case 'do_install':
                $res = $installer->executeInstall($payload);
                echo json_encode($res, JSON_UNESCAPED_UNICODE);
                exit;

            default:
                echo json_encode(['code' => 400, 'msg' => '未知操作'], JSON_UNESCAPED_UNICODE);
                exit;
        }
    }

    // 2. 安装锁硬屏障：只要物理存在 install.lock，无论当前数据库状态如何，一律拦截外部安装界面
    if ($isInstalled && $step !== 4) {
        $statusTitle = $dbOk ? '系统运行正常 (已锁定保护)' : '系统已锁定保护 (数据库连接断开)';
        $statusColor = $dbOk ? '#27ae60' : '#e53e3e';
        $statusDesc = $dbOk 
            ? '数据库与环境运行正常，系统已受 <code>install.lock</code> 物理保护。'
            : '检测到数据库连接异常，请登录服务器检查 <code>config/database.php</code> 配置。系统当前处于 <code>install.lock</code> 物理保护锁定状态，外部安装入口已完全关闭。';
        $btnHtml = $dbOk 
            ? '<a href="/admin/" class="btn btn-primary">直接进入后台管理</a>'
            : '<a href="/install/index.php" class="btn btn-primary" style="background:#4a5568;">刷新重试</a>';

        echo '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><title>系统已安装</title><link rel="stylesheet" href="assets/install.css"></head><body>'
            . '<div class="install-container" style="margin-top:60px; text-align:center; padding:50px 30px;">'
            . '<h2 style="color:' . $statusColor . '; margin-bottom:12px;">' . $statusTitle . '</h2>'
            . '<p style="color:#718096; margin-bottom:24px;">' . $statusDesc . '</p>'
            . '<div style="display:flex; justify-content:center; gap:16px;">'
            . $btnHtml
            . '</div>'
            . '</div></body></html>';
        exit;
    }

    // 3. 视图渲染
    require_once __DIR__ . '/views/header.php';

    if ($step === 1) {
        $env = $installer->checkEnvironment();
        require_once __DIR__ . '/views/step1.php';
    } elseif ($step === 2) {
        require_once __DIR__ . '/views/step2.php';
    } elseif ($step === 4) {
        require_once __DIR__ . '/views/step4.php';
    } else {
        $env = $installer->checkEnvironment();
        require_once __DIR__ . '/views/step1.php';
    }

    require_once __DIR__ . '/views/footer.php';
} catch (\Throwable $e) {
    if (!headers_sent()) {
        header('Content-Type: text/html; charset=utf-8');
        http_response_code(200);
    }
    echo '<div style="margin:50px auto;max-width:800px;padding:30px;background:#fff5f5;border:1px solid #feb2b2;border-radius:8px;font-family:sans-serif;">';
    echo '<h2 style="color:#c53030;margin-top:0;">⚠️ 安装向导运行捕获到异常</h2>';
    echo '<p style="color:#4a5568;font-size:15px;"><strong>异常说明：</strong>' . htmlspecialchars($e->getMessage()) . '</p>';
    echo '<p style="color:#718096;font-size:13px;"><strong>所在文件：</strong>' . htmlspecialchars($e->getFile()) . ' 第 ' . $e->getLine() . ' 行</p>';
    echo '</div>';
    exit;
}
