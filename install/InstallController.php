<?php
/**
 * 启灵独立回收系统 - 图形化一键安装向导核心后端
 * 职责：环境检测、数据库/Redis 异步连通测试、分批建表、写配置与上锁
 * 规范：严格参数化、安全文件写入、双重备份、异常捕获
 * 编码：UTF-8 无 BOM
 */

namespace Install;

class InstallController
{
    private $lockFile;
    private $baseDir;

    public function __construct()
    {
        // 向上层级自适应查找包含 app 和 config 的项目根目录
        $dir = __DIR__;
        $found = false;
        for ($i = 0; $i < 4; $i++) {
            if (is_dir($dir . '/app') && is_dir($dir . '/config')) {
                $this->baseDir = $dir;
                $found = true;
                break;
            }
            $parent = dirname($dir);
            if ($parent === $dir) {
                break;
            }
            $dir = $parent;
        }

        if (!$found) {
            $this->baseDir = dirname(__DIR__, 2);
        }

        $this->lockFile = $this->baseDir . DIRECTORY_SEPARATOR . 'install' . DIRECTORY_SEPARATOR . 'install.lock';
    }

    public function getBaseDir(): string
    {
        return $this->baseDir;
    }

    /**
     * 检查是否已安装
     */
    public function isInstalled(): bool
    {
        return is_file($this->baseDir . DIRECTORY_SEPARATOR . 'install' . DIRECTORY_SEPARATOR . 'install.lock')
            || is_file($this->baseDir . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'install' . DIRECTORY_SEPARATOR . 'install.lock')
            || is_file(__DIR__ . DIRECTORY_SEPARATOR . 'install.lock');
    }

    /**
     * 检测当前已保存的数据库配置是否连通有效
     */
    public function checkCurrentDbConnection(): bool
    {
        $configFile = $this->baseDir . DIRECTORY_SEPARATOR . 'config' . DIRECTORY_SEPARATOR . 'database.php';
        $runtimeFile = $this->baseDir . DIRECTORY_SEPARATOR . 'runtime' . DIRECTORY_SEPARATOR . 'database.php';

        $config = null;
        if (is_file($configFile)) {
            $data = include $configFile;
            if (is_array($data)) {
                $config = $data;
            }
        }
        if ((!is_array($config) || empty($config['username']) || empty($config['database'])) && is_file($runtimeFile)) {
            $runtimeData = include $runtimeFile;
            if (is_array($runtimeData)) {
                $config = $runtimeData;
            }
        }

        if (!is_array($config) || empty($config['username']) || empty($config['database'])) {
            return false;
        }

        try {
            $dsn = sprintf(
                'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
                $config['host'] ?? '127.0.0.1',
                (int)($config['port'] ?? 3306),
                $config['database'] ?? ''
            );
            $pdo = new \PDO($dsn, $config['username'], $config['password'] ?? '', [
                \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
                \PDO::ATTR_TIMEOUT => 2
            ]);
            return true;
        } catch (\Throwable $e) {
            return false;
        }
    }

    /**
     * 1. 运行环境与目录权限检测
     */
    public function checkEnvironment(): array
    {
        $phpVersion = PHP_VERSION;
        $phpOk = version_compare($phpVersion, '7.4.0', '>=');

        $extensions = [
            'pdo'       => ['name' => 'PDO 数据驱动', 'required' => true, 'installed' => extension_loaded('pdo')],
            'pdo_mysql' => ['name' => 'PDO_MySQL 扩展', 'required' => true, 'installed' => extension_loaded('pdo_mysql')],
            'curl'      => ['name' => 'cURL 网络请求', 'required' => true, 'installed' => extension_loaded('curl')],
            'mbstring'  => ['name' => 'Mbstring 多字节', 'required' => true, 'installed' => extension_loaded('mbstring')],
            'openssl'   => ['name' => 'OpenSSL 加密', 'required' => true, 'installed' => extension_loaded('openssl')],
            'gd'        => ['name' => 'GD 图像处理库', 'required' => true, 'installed' => extension_loaded('gd')],
            'redis'     => ['name' => 'Redis 缓存扩展', 'required' => false, 'installed' => extension_loaded('redis')],
        ];

        // 尝试自动创建目录与赋权
        foreach (['runtime', 'config', 'public' . DIRECTORY_SEPARATOR . 'uploads'] as $relDir) {
            $fullDir = $this->baseDir . DIRECTORY_SEPARATOR . $relDir;
            if (!is_dir($fullDir)) {
                @mkdir($fullDir, 0777, true);
            }
            @chmod($fullDir, 0777);
        }

        $dbConfigFile = $this->baseDir . DIRECTORY_SEPARATOR . 'config' . DIRECTORY_SEPARATOR . 'database.php';
        if (is_file($dbConfigFile)) {
            @chmod($dbConfigFile, 0666);
        }

        $dirs = [
            'runtime' => [
                'path' => $this->baseDir . DIRECTORY_SEPARATOR . 'runtime',
                'name' => '运行缓存目录 (runtime/)',
                'writable' => is_writable($this->baseDir . DIRECTORY_SEPARATOR . 'runtime')
            ],
            'config' => [
                'path' => $this->baseDir . DIRECTORY_SEPARATOR . 'config',
                'name' => '系统配置目录 (config/)',
                'writable' => is_writable($this->baseDir . DIRECTORY_SEPARATOR . 'config')
            ],
            'database_file' => [
                'path' => $dbConfigFile,
                'name' => '数据库配置文件 (config/database.php)',
                'writable' => !is_file($dbConfigFile) || is_writable($dbConfigFile) || is_writable($this->baseDir . DIRECTORY_SEPARATOR . 'config')
            ],
            'uploads' => [
                'path' => $this->baseDir . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'uploads',
                'name' => '附件上传目录 (public/uploads/)',
                'writable' => is_writable($this->baseDir . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'uploads')
            ],
        ];

        // 综合判断是否能继续安装
        $allPassed = $phpOk;
        foreach ($extensions as $ext) {
            if ($ext['required'] && !$ext['installed']) {
                $allPassed = false;
                break;
            }
        }
        foreach ($dirs as $dir) {
            if (!$dir['writable']) {
                $allPassed = false;
                break;
            }
        }

        return [
            'php_version' => $phpVersion,
            'php_ok'      => $phpOk,
            'extensions'  => $extensions,
            'dirs'        => $dirs,
            'all_passed'  => $allPassed
        ];
    }

    /**
     * 2. 数据库异步连通性测试
     */
    public function testDatabase(array $db): array
    {
        $host = trim($db['host'] ?? '127.0.0.1');
        $port = (int)($db['port'] ?? 3306);
        $user = trim($db['user'] ?? ($db['username'] ?? ''));
        $pass = trim($db['password'] ?? '');
        $name = trim($db['database'] ?? '');

        if (empty($user)) {
            return ['code' => 400, 'msg' => '数据库用户名不能为空'];
        }

        try {
            // 先连 MySQL 服务器（不指定 DB），测试账号密码是否正确
            $dsnNoDb = sprintf('mysql:host=%s;port=%d;charset=utf8mb4', $host, $port);
            $pdo = new \PDO($dsnNoDb, $user, $pass, [
                \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
                \PDO::ATTR_TIMEOUT => 3
            ]);

            // 测试数据库是否存在，若不存在尝试自动创建
            if (!empty($name)) {
                $stmt = $pdo->query("SHOW DATABASES LIKE " . $pdo->quote($name));
                if ($stmt->fetch() === false) {
                    $pdo->exec(sprintf("CREATE DATABASE IF NOT EXISTS `%s` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci", $name));
                }
            }

            return ['code' => 200, 'msg' => '数据库连通测试成功！数据库已就绪'];
        } catch (\PDOException $e) {
            return ['code' => 400, 'msg' => '数据库连接失败: ' . $e->getMessage()];
        }
    }

    /**
     * 3. Redis 异步连通性测试 (多网站共用隔离验证)
     */
    public function testRedis(array $redis): array
    {
        if (!extension_loaded('redis')) {
            return ['code' => 200, 'msg' => '提示: PHP 未安装 Redis 扩展，系统将自动降级为文件缓存运行'];
        }

        $host = trim($redis['host'] ?? '127.0.0.1');
        $port = (int)($redis['port'] ?? 6379);
        $auth = trim($redis['password'] ?? '');
        $dbIndex = (int)($redis['db_index'] ?? 2);

        try {
            $client = new \Redis();
            $connected = $client->connect($host, $port, 2.0);
            if (!$connected) {
                return ['code' => 400, 'msg' => '无法连接 Redis 服务器，请检查 IP 与端口'];
            }

            if (!empty($auth)) {
                if (!$client->auth($auth)) {
                    return ['code' => 400, 'msg' => 'Redis 认证密码错误'];
                }
            }

            $client->select($dbIndex);
            return ['code' => 200, 'msg' => sprintf('Redis 连通测试成功！已绑定专属 DB %d 隔离空间', $dbIndex)];
        } catch (\Throwable $e) {
            return ['code' => 400, 'msg' => 'Redis 测试异常: ' . $e->getMessage()];
        }
    }

    /**
     * 3.1 仅保存/修复数据库配置并验证连通性（不重复建表，保留已有数据）
     */
    public function saveDatabaseOnly(array $params): array
    {
        if ($this->isInstalled()) {
            return ['code' => 403, 'msg' => '系统已安装受保护，禁止任意重写数据库配置。如需重配请先手动删除服务器上的 install.lock 文件'];
        }

        $db = $params['db'] ?? [];
        $host = trim($db['host'] ?? '127.0.0.1');
        $port = (int)($db['port'] ?? 3306);
        $user = trim($db['user'] ?? ($db['username'] ?? ''));
        $pass = (string)($db['password'] ?? '');
        $name = trim($db['database'] ?? '');
        $prefix = !empty($db['prefix']) ? rtrim($db['prefix'], '_') . '_' : 'ql_';

        if (empty($user) || empty($name)) {
            return ['code' => 400, 'msg' => '数据库用户名和数据库名不能为空'];
        }

        // 验证真实连通性
        try {
            $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $host, $port, $name);
            $pdo = new \PDO($dsn, $user, $pass, [
                \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
                \PDO::ATTR_TIMEOUT => 3
            ]);
        } catch (\PDOException $e) {
            return ['code' => 400, 'msg' => '数据库连接失败: ' . $e->getMessage()];
        }

        // 写入 config/database.php 与 runtime/database.php
        try {
            $this->writeDatabaseConfig([
                'host'     => $host,
                'port'     => $port,
                'user'     => $user,
                'username' => $user,
                'password' => $pass,
                'database' => $name,
            ], $prefix);
        } catch (\Throwable $e) {
            return ['code' => 500, 'msg' => $e->getMessage()];
        }

        // 同步写入 Redis 独立多网站隔离配置
        if (!empty($params['redis']) && is_array($params['redis'])) {
            try {
                $this->writeRedisConfig($params['redis']);
            } catch (\Throwable $e) {
                // 静默容灾
            }
        }

        // 写入锁文件
        $this->writeLockFile();

        return ['code' => 200, 'msg' => '数据库配置已成功保存！正在进入后台...'];
    }

    /**
     * 4. 执行一键安装（导入 SQL、写配置文件、生成锁）
     */
    public function executeInstall(array $params): array
    {
        $canInstall = !$this->isInstalled();
        if (!$canInstall) {
            return ['code' => 403, 'msg' => '系统已经安装完毕，严防重复出资与数据被覆写！如需重装请先手动删除服务器上的 install.lock 文件'];
        }

        $db = $params['db'] ?? [];
        $redis = $params['redis'] ?? [];
        $admin = $params['admin'] ?? [];

        $dbHost = trim($db['host'] ?? '127.0.0.1');
        $dbPort = (int)($db['port'] ?? 3306);
        $dbUser = trim($db['user'] ?? ($db['username'] ?? ''));
        $dbPass = (string)($db['password'] ?? '');
        $dbName = trim($db['database'] ?? '');
        $prefix = !empty($db['prefix']) ? rtrim($db['prefix'], '_') . '_' : 'ql_';

        // 基础参数校验
        if (empty($dbUser) || empty($dbName)) {
            return ['code' => 400, 'msg' => '请填写完整的数据库用户名和数据库名'];
        }
        if (empty($admin['username']) || empty($admin['password'])) {
            return ['code' => 400, 'msg' => '管理员账号和密码不能为空'];
        }
        if (strlen($admin['password']) < 6) {
            return ['code' => 400, 'msg' => '管理员密码长度不得少于 6 位'];
        }

        // 1. 连接数据库 (支持目标库不存在时自动建立)
        try {
            $pdo = null;
            $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $dbHost, $dbPort, $dbName);
            try {
                $pdo = new \PDO($dsn, $dbUser, $dbPass, [
                    \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
                    \PDO::ATTR_TIMEOUT => 5
                ]);
            } catch (\PDOException $eDb) {
                // 若指定数据库连接失败，尝试不带 dbname 连接 MySQL 并自动建库
                $dsnNoDb = sprintf('mysql:host=%s;port=%d;charset=utf8mb4', $dbHost, $dbPort);
                $pdoServer = new \PDO($dsnNoDb, $dbUser, $dbPass, [
                    \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
                    \PDO::ATTR_TIMEOUT => 5
                ]);
                $pdoServer->exec(sprintf("CREATE DATABASE IF NOT EXISTS `%s` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci", $dbName));
                // 建库后重新连接
                $pdo = new \PDO($dsn, $dbUser, $dbPass, [
                    \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
                    \PDO::ATTR_TIMEOUT => 5
                ]);
            }
        } catch (\PDOException $e) {
            return ['code' => 400, 'msg' => '无法连接或创建目标数据库: ' . $e->getMessage()];
        }

        // 2. 读取并分块执行 SQL
        $sqlFile = __DIR__ . DIRECTORY_SEPARATOR . 'sql' . DIRECTORY_SEPARATOR . 'install.sql';
        if (!is_file($sqlFile)) {
            $sqlFile = $this->baseDir . DIRECTORY_SEPARATOR . 'install' . DIRECTORY_SEPARATOR . 'sql' . DIRECTORY_SEPARATOR . 'install.sql';
        }
        if (!is_file($sqlFile)) {
            $sqlFile = $this->baseDir . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'install' . DIRECTORY_SEPARATOR . 'sql' . DIRECTORY_SEPARATOR . 'install.sql';
        }
        if (!is_file($sqlFile)) {
            return ['code' => 400, 'msg' => 'install.sql 初始化脚本不存在'];
        }

        $sqlContent = file_get_contents($sqlFile);
        $sqlContent = str_replace('__PREFIX__', $prefix, $sqlContent);

        // 规范化换行符（兼容 Windows CRLF / Linux LF）
        $sqlContent = str_replace(["\r\n", "\r"], "\n", $sqlContent);

        // 逐行解析，精准剥离注释，确保每条语句（CREATE/INSERT/DROP）完整分块执行
        $lines = explode("\n", $sqlContent);
        $statements = [];
        $currentStmt = '';

        foreach ($lines as $line) {
            $trimmedLine = trim($line);
            // 过滤纯单行注释和空行
            if ($trimmedLine === '' || strncmp($trimmedLine, '--', 2) === 0 || strncmp($trimmedLine, '#', 1) === 0) {
                continue;
            }
            $currentStmt .= $line . "\n";
            // 判断当前语句是否以分号结尾
            if (substr(rtrim($trimmedLine), -1) === ';') {
                $cleanSql = trim($currentStmt);
                if (!empty($cleanSql)) {
                    $statements[] = $cleanSql;
                }
                $currentStmt = '';
            }
        }
        if (!empty(trim($currentStmt))) {
            $statements[] = trim($currentStmt);
        }

        try {
            foreach ($statements as $stmt) {
                if (!empty($stmt)) {
                    $pdo->exec($stmt);
                }
            }

            // 3. 写入超级管理员密码
            $passwordHash = password_hash($admin['password'], PASSWORD_BCRYPT);
            $salt = bin2hex(random_bytes(8));
            $now = time();

            $adminSql = sprintf(
                "INSERT INTO `%ssys_admin` (`username`, `password_hash`, `salt`, `realname`, `role`, `status`, `created_at`, `updated_at`) VALUES (?, ?, ?, ?, 'admin', 1, ?, ?) ON DUPLICATE KEY UPDATE `password_hash` = VALUES(`password_hash`), `updated_at` = VALUES(`updated_at`)",
                $prefix
            );
            $adminStmt = $pdo->prepare($adminSql);
            $adminStmt->execute([
                $admin['username'],
                $passwordHash,
                $salt,
                !empty($admin['realname']) ? $admin['realname'] : '超级管理员',
                $now,
                $now
            ]);

            // 4. 生成 config/database.php 与 runtime/database.php
            $this->writeDatabaseConfig([
                'host'     => $dbHost,
                'port'     => $dbPort,
                'user'     => $dbUser,
                'username' => $dbUser,
                'password' => $dbPass,
                'database' => $dbName,
            ], $prefix);

            // 5. 生成 config/redis.php
            $this->writeRedisConfig($redis);

            // 6. 生成 config/app.php
            $this->writeAppConfig($params['app'] ?? []);

            // 7. 写入安全锁文件 install.lock
            $this->writeLockFile();

            return ['code' => 200, 'msg' => '系统安装成功！'];
        } catch (\Throwable $e) {
            return ['code' => 500, 'msg' => '安装过程中断: ' . $e->getMessage()];
        }
    }

    /**
     * 写入数据库配置（主配置 + runtime 备份双重写入与破冰提权）
     */
    public function writeDatabaseConfig(array $db, string $prefix): void
    {
        $configDir = $this->baseDir . DIRECTORY_SEPARATOR . 'config';
        if (!is_dir($configDir)) {
            @mkdir($configDir, 0777, true);
        }
        @chmod($configDir, 0777);

        $host = trim($db['host'] ?? '127.0.0.1');
        $port = (int)($db['port'] ?? 3306);
        $user = trim($db['user'] ?? ($db['username'] ?? 'root'));
        $pass = (string)($db['password'] ?? '');
        $database = trim($db['database'] ?? '');

        $code = "<?php\n// 自动生成的数据库配置 (由安装向导自动写入，请勿手工篡改)\nreturn [\n"
            . "    'host'     => " . var_export($host, true) . ",\n"
            . "    'port'     => " . $port . ",\n"
            . "    'database' => " . var_export($database, true) . ",\n"
            . "    'username' => " . var_export($user, true) . ",\n"
            . "    'password' => " . var_export($pass, true) . ",\n"
            . "    'prefix'   => " . var_export($prefix, true) . ",\n"
            . "    'charset'  => 'utf8mb4',\n"
            . "];\n";

        $targetFile = $configDir . DIRECTORY_SEPARATOR . 'database.php';

        // 权限破冰：若文件存在但只读，尝试修改权限或强制删除后重建
        if (is_file($targetFile)) {
            @chmod($targetFile, 0666);
            if (!is_writable($targetFile) && is_writable($configDir)) {
                @unlink($targetFile);
            }
        }

        $written = @file_put_contents($targetFile, $code, LOCK_EX);
        if ($written === false) {
            $written = @file_put_contents($targetFile, $code);
        }

        // 双重备份：同步写入 runtime/database.php 防止生产权限问题导致主配置丢失
        $runtimeDir = $this->baseDir . DIRECTORY_SEPARATOR . 'runtime';
        if (!is_dir($runtimeDir)) {
            @mkdir($runtimeDir, 0777, true);
        }
        @chmod($runtimeDir, 0777);
        $runtimeTarget = $runtimeDir . DIRECTORY_SEPARATOR . 'database.php';
        @file_put_contents($runtimeTarget, $code);

        // 强校验：写入结果检查
        if ($written === false || !is_file($targetFile) || filesize($targetFile) < 10) {
            // 如果 runtime 写入成功，尝试复制过去
            if (is_file($runtimeTarget) && @copy($runtimeTarget, $targetFile)) {
                return;
            }
            throw new \RuntimeException(
                "数据库配置文件写入失败！\n目标路径: {$targetFile}\n"
                . "原因: Web 服务器用户(www)对 config 目录无写入权限。\n"
                . "请在服务器执行: chown -R www:www " . $this->baseDir . "/config && chmod -R 777 " . $this->baseDir . "/config"
            );
        }
    }

    /**
     * 写入 Redis 配置
     */
    public function writeRedisConfig(array $redis): void
    {
        $configDir = $this->baseDir . DIRECTORY_SEPARATOR . 'config';
        if (!is_dir($configDir)) {
            @mkdir($configDir, 0777, true);
        }
        $targetFile = $configDir . DIRECTORY_SEPARATOR . 'redis.php';

        $enable = !empty($redis['enable']) && extension_loaded('redis');
        $code = "<?php\n// 自动生成的 Redis 独立隔离配置\nreturn [\n"
            . "    'enable'   => " . ($enable ? 'true' : 'false') . ",\n"
            . "    'host'     => " . var_export($redis['host'] ?? '127.0.0.1', true) . ",\n"
            . "    'port'     => " . (int)($redis['port'] ?? 6379) . ",\n"
            . "    'password' => " . var_export($redis['password'] ?? '', true) . ",\n"
            . "    'db_index' => " . (int)($redis['db_index'] ?? 2) . ",\n"
            . "    'prefix'   => " . var_export(!empty($redis['prefix']) ? $redis['prefix'] : 'sys_recycle:', true) . ",\n"
            . "    'timeout'  => 2.0,\n"
            . "];\n";

        if (is_file($targetFile)) {
            @chmod($targetFile, 0666);
            if (!is_writable($targetFile) && is_writable($configDir)) {
                @unlink($targetFile);
            }
        }

        @file_put_contents($targetFile, $code, LOCK_EX);
    }

    /**
     * 写入应用全局配置
     */
    public function writeAppConfig(array $app): void
    {
        $configDir = $this->baseDir . DIRECTORY_SEPARATOR . 'config';
        if (!is_dir($configDir)) {
            @mkdir($configDir, 0777, true);
        }
        $targetFile = $configDir . DIRECTORY_SEPARATOR . 'app.php';

        $code = "<?php\n// 自动生成的应用全局配置\nreturn [\n"
            . "    'app_name' => " . var_export(!empty($app['name']) ? $app['name'] : '启灵同城服务', true) . ",\n"
            . "    'app_key'  => " . var_export(bin2hex(random_bytes(16)), true) . ",\n"
            . "    'debug'    => false,\n"
            . "    'timezone' => 'Asia/Shanghai',\n"
            . "];\n";

        if (is_file($targetFile)) {
            @chmod($targetFile, 0666);
            if (!is_writable($targetFile) && is_writable($configDir)) {
                @unlink($targetFile);
            }
        }

        @file_put_contents($targetFile, $code, LOCK_EX);
    }

    /**
     * 写入安全锁文件
     */
    public function writeLockFile(): void
    {
        $lockContent = json_encode([
            'installed_at' => date('Y-m-d H:i:s'),
            'version'      => '1.0.0',
            'lock_hash'    => hash('sha256', uniqid('recycle_', true))
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        $lockDirs = [
            $this->baseDir . DIRECTORY_SEPARATOR . 'install',
            $this->baseDir . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'install',
            __DIR__
        ];

        foreach ($lockDirs as $dir) {
            if (is_dir($dir)) {
                @chmod($dir, 0777);
                $lockPath = $dir . DIRECTORY_SEPARATOR . 'install.lock';
                if (is_file($lockPath)) {
                    @chmod($lockPath, 0666);
                }
                @file_put_contents($lockPath, $lockContent, LOCK_EX);
            }
        }
    }
}
