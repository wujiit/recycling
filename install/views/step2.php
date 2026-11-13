<?php
/**
 * 启灵独立回收系统 - 安装向导第 2 步：数据库、Redis 隔离空间与管理员配置
 * 编码：UTF-8 无 BOM
 */
if (!defined('IN_INSTALL')) exit('Access Denied');

$curConfig = [];
if (isset($installer)) {
    $curConfigFile = $installer->getBaseDir() . DIRECTORY_SEPARATOR . 'config' . DIRECTORY_SEPARATOR . 'database.php';
    $curRuntimeFile = $installer->getBaseDir() . DIRECTORY_SEPARATOR . 'runtime' . DIRECTORY_SEPARATOR . 'database.php';
    if (is_file($curConfigFile)) {
        $loaded = include $curConfigFile;
        if (is_array($loaded)) {
            $curConfig = $loaded;
        }
    }
    if ((empty($curConfig) || empty($curConfig['database'])) && is_file($curRuntimeFile)) {
        $loadedRuntime = include $curRuntimeFile;
        if (is_array($loadedRuntime)) {
            $curConfig = $loadedRuntime;
        }
    }
}
$dbHost = !empty($curConfig['host']) ? $curConfig['host'] : '127.0.0.1';
$dbPort = !empty($curConfig['port']) ? (string)$curConfig['port'] : '3306';
$dbUser = !empty($curConfig['username']) ? $curConfig['username'] : 'root';
$dbName = !empty($curConfig['database']) ? $curConfig['database'] : '';
$dbPrefix = !empty($curConfig['prefix']) ? $curConfig['prefix'] : 'ql_';
?>
<div id="install-config-box">
    <form id="form-install">
        <!-- 1. 数据库配置 -->
        <div class="section-title">1. MySQL 数据库连接配置</div>
        <div class="form-row">
            <div class="form-col form-group">
                <label class="form-label" for="db_host">数据库服务器地址</label>
                <input type="text" class="form-input" id="db_host" value="<?= htmlspecialchars($dbHost) ?>" required>
                <div class="form-tip">通常为 127.0.0.1 或 localhost</div>
            </div>
            <div class="form-col form-group">
                <label class="form-label" for="db_port">端口号</label>
                <input type="number" class="form-input" id="db_port" value="<?= htmlspecialchars($dbPort) ?>" required>
            </div>
        </div>

        <div class="form-row">
            <div class="form-col form-group">
                <label class="form-label" for="db_user">数据库用户名</label>
                <input type="text" class="form-input" id="db_user" value="<?= htmlspecialchars($dbUser) ?>" placeholder="root 或数据库用户名" required>
            </div>
            <div class="form-col form-group">
                <label class="form-label" for="db_pass">数据库密码</label>
                <input type="password" class="form-input" id="db_pass" placeholder="请输入数据库访问密码" required>
                <div class="form-tip">填写正确的 MySQL 密码，安装向导将全自动写入配置文件</div>
            </div>
        </div>

        <div class="form-row">
            <div class="form-col form-group">
                <label class="form-label" for="db_name">数据库名称</label>
                <input type="text" class="form-input" id="db_name" value="<?= htmlspecialchars($dbName) ?>" placeholder="例如: huishou 或 qiling_recycle" required>
                <div class="form-tip">若数据库不存在，向导将自动尝试建库</div>
            </div>
            <div class="form-col form-group">
                <label class="form-label" for="db_prefix">数据表前缀</label>
                <input type="text" class="form-input" id="db_prefix" value="<?= htmlspecialchars($dbPrefix) ?>" required>
                <div class="form-tip">建议保持默认 ql_，便于识别回收系统表</div>
            </div>
        </div>

        <div style="margin-bottom: 25px;">
            <button type="button" class="btn btn-outline" id="btn-test-db">⚡ 测试数据库连通性</button>
            <div id="db-test-result" class="test-result"></div>
        </div>

        <!-- 2. Redis 多网站共用与独立隔离配置 -->
        <div class="section-title">2. Redis 缓存与独立隔离配置 (单服务器多站点专属)</div>
        <div class="form-group" style="margin-bottom: 12px;">
            <label style="display: flex; align-items: center; font-size: 14px; cursor: pointer;">
                <input type="checkbox" id="redis_enable" value="1" checked style="margin-right: 8px; width: 16px; height: 16px;">
                <span>启用 Redis 高性能缓存 (若未开启或发生故障，系统将自动平滑降级为文件缓存)</span>
            </label>
        </div>

        <div class="form-row">
            <div class="form-col form-group">
                <label class="form-label" for="redis_host">Redis 服务器</label>
                <input type="text" class="form-input" id="redis_host" value="127.0.0.1">
            </div>
            <div class="form-col form-group">
                <label class="form-label" for="redis_port">端口</label>
                <input type="number" class="form-input" id="redis_port" value="6379">
            </div>
            <div class="form-col form-group">
                <label class="form-label" for="redis_pass">密码 (若无则留空)</label>
                <input type="password" class="form-input" id="redis_pass" placeholder="无密码请留空">
            </div>
        </div>

        <div class="form-row">
            <div class="form-col form-group">
                <label class="form-label" for="redis_db">专用隔离 DB 库号 (0-15)</label>
                <input type="number" class="form-input" id="redis_db" value="6" min="0" max="15">
                <div class="form-tip">指定独立库（如 DB 6），与服务器上其他网站的 DB 0 / 1 / 2 等物理隔离</div>
            </div>
            <div class="form-col form-group">
                <label class="form-label" for="redis_prefix">强制业务隔离前缀</label>
                <input type="text" class="form-input" id="redis_prefix" value="sys_recycle:">
                <div class="form-tip">所有 Key 均带此前缀，清空缓存仅清理本前缀，绝不误伤同服其他网站</div>
            </div>
        </div>

        <div style="margin-bottom: 25px;">
            <button type="button" class="btn btn-outline" id="btn-test-redis">⚡ 测试 Redis 隔离库连接</button>
            <div id="redis-test-result" class="test-result"></div>
        </div>

        <!-- 3. 管理员与系统基础信息 -->
        <div class="section-title">3. 超级管理员与系统信息设置</div>
        <div class="form-row">
            <div class="form-col form-group">
                <label class="form-label" for="app_name">系统平台名称</label>
                <input type="text" class="form-input" id="app_name" value="启灵同城服务" required>
            </div>
            <div class="form-col form-group">
                <label class="form-label" for="admin_realname">管理员称谓</label>
                <input type="text" class="form-input" id="admin_realname" value="超级管理员" required>
            </div>
        </div>

        <div class="form-row">
            <div class="form-col form-group">
                <label class="form-label" for="admin_user">管理后台登录账号</label>
                <input type="text" class="form-input" id="admin_user" value="admin" required>
            </div>
            <div class="form-col form-group">
                <label class="form-label" for="admin_pass">登录密码</label>
                <input type="text" class="form-input" id="admin_pass" value="123456" placeholder="请设置强密码(不少于6位)" required>
                <div class="form-tip">默认初始为 123456，建议修改为更安全的密码</div>
            </div>
        </div>

        <div class="btn-group" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
            <a href="index.php?step=1" class="btn btn-secondary">← 返回上一步</a>
            <div style="display:flex; gap:12px; flex-wrap:wrap;">
                <button type="button" class="btn btn-outline" id="btn-save-db-only" style="background:#f0fdf4; border-color:#86efac; color:#166534; font-weight:700;">
                    仅保存数据库配置并直达后台
                </button>
                <button type="submit" class="btn btn-primary" id="btn-submit-install">
                    开始一键初始化安装 (建表+管理员)
                </button>
            </div>
        </div>
    </form>
</div>

<!-- 进度条加载卡片 (提交后显示) -->
<div id="install-progress-box" style="display: none;">
    <div class="progress-container">
        <h3 style="font-size: 18px; margin-bottom: 8px;">系统正在自动化建表与注入数据</h3>
        <p style="font-size: 13px; color: #718096;">正在写入专表、注入行业问答模板并生成配置文件，请勿关闭页面...</p>
        <div class="progress-bar">
            <div class="progress-fill" id="progress-fill"></div>
        </div>
        <div class="progress-status" id="progress-status">准备就绪...</div>
        <div id="btn-retry-box" style="display:none; margin-top: 20px;">
            <button type="button" class="btn btn-secondary" onclick="window.location.reload();">返回检查并重试</button>
        </div>
    </div>
</div>
