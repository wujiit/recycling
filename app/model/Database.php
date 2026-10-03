<?php
/**
 * PDO 数据库驱动封装
 * 提供连接单例、参数化预处理查询与事务支持
 */

namespace App\Model;

class Database
{
    private static $instance = null;
    private $pdo = null;
    private $prefix = 'ql_';

    private function __construct()
    {
        $baseDir = dirname(__DIR__, 2);
        $configFile = $baseDir . DIRECTORY_SEPARATOR . 'config' . DIRECTORY_SEPARATOR . 'database.php';
        $runtimeConfigFile = $baseDir . DIRECTORY_SEPARATOR . 'runtime' . DIRECTORY_SEPARATOR . 'database.php';

        $config = null;
        if (is_file($configFile)) {
            $data = include $configFile;
            if (is_array($data)) {
                $config = $data;
            }
        }

        // 如果主配置文件未配置或账号/库名为空，自动尝试读取 runtime 中的安装备份配置
        if ((!is_array($config) || empty($config['username']) || empty($config['database'])) && is_file($runtimeConfigFile)) {
            $runtimeData = include $runtimeConfigFile;
            if (is_array($runtimeData)) {
                $config = $runtimeData;
            }
        }

        if (!is_array($config) || empty($config['username']) || empty($config['database'])) {
            throw new \RuntimeException('数据库尚未配置，请先运行一键安装向导: /install/index.php');
        }

        $this->prefix = $config['prefix'] ?? 'ql_';

        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=%s',
            $config['host'] ?? '127.0.0.1',
            (int)($config['port'] ?? 3306),
            $config['database'] ?? '',
            $config['charset'] ?? 'utf8mb4'
        );

        $options = [
            \PDO::ATTR_ERRMODE            => \PDO::ERRMODE_EXCEPTION,
            \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
            \PDO::ATTR_EMULATE_PREPARES   => false, // 禁用模拟预处理，启用真正底层预处理
            \PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
        ];

        try {
            $this->pdo = new \PDO($dsn, $config['username'] ?? '', $config['password'] ?? '', $options);
        } catch (\PDOException $e) {
            // 容灾自愈：若主配置连接失败且存在 runtime 安装备份，尝试使用备份配置连通并自动回写修复
            if (is_file($runtimeConfigFile)) {
                $backupData = include $runtimeConfigFile;
                $backupConfig = is_array($backupData) ? $backupData : [];
                if (!empty($backupConfig['username']) && !empty($backupConfig['database'])) {
                    try {
                        $dsnBackup = sprintf(
                            'mysql:host=%s;port=%d;dbname=%s;charset=%s',
                            $backupConfig['host'] ?? '127.0.0.1',
                            (int)($backupConfig['port'] ?? 3306),
                            $backupConfig['database'] ?? '',
                            $backupConfig['charset'] ?? 'utf8mb4'
                        );
                        $this->pdo = new \PDO($dsnBackup, $backupConfig['username'] ?? '', $backupConfig['password'] ?? '', $options);
                        $this->prefix = $backupConfig['prefix'] ?? 'ql_';

                        // 备份连通成功，尝试将正确配置回写至主配置文件
                        $healCode = "<?php\n// 自动自愈回写的数据库配置\nreturn [\n"
                            . "    'host'     => " . var_export($backupConfig['host'] ?? '127.0.0.1', true) . ",\n"
                            . "    'port'     => " . (int)($backupConfig['port'] ?? 3306) . ",\n"
                            . "    'database' => " . var_export($backupConfig['database'], true) . ",\n"
                            . "    'username' => " . var_export($backupConfig['username'], true) . ",\n"
                            . "    'password' => " . var_export($backupConfig['password'] ?? '', true) . ",\n"
                            . "    'prefix'   => " . var_export($backupConfig['prefix'] ?? 'ql_', true) . ",\n"
                            . "    'charset'  => 'utf8mb4',\n"
                            . "];\n";
                        @file_put_contents($configFile, $healCode);
                        return;
                    } catch (\Throwable $backupErr) {
                        // 备份也连不上，抛出原始异常
                    }
                }
            }

            // 输出清晰的数据库连接异常诊断信息
            throw new \RuntimeException('数据库连接失败: ' . $e->getMessage());
        }
    }

    public static function getInstance(): self
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getPdo(): \PDO
    {
        return $this->pdo;
    }

    public function getPrefix(): string
    {
        return $this->prefix;
    }

    /**
     * 执行参数化预处理查询并获取单条记录
     */
    public function fetchOne(string $sql, array $params = []): ?array
    {
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $result = $stmt->fetch();
        return $result !== false ? $result : null;
    }

    /**
     * 兼容快捷单行查询别名
     */
    public function fetch(string $sql, array $params = []): ?array
    {
        return $this->fetchOne($sql, $params);
    }

    /**
     * 执行参数化预处理查询并获取全部记录
     */
    public function fetchAll(string $sql, array $params = []): array
    {
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    /**
     * 执行参数化预处理（INSERT / UPDATE / DELETE）
     */
    public function execute(string $sql, array $params = []): int
    {
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->rowCount();
    }

    /**
     * 获取最后自增插入 ID
     */
    public function lastInsertId(): string
    {
        return $this->pdo->lastInsertId();
    }

    /**
     * 开启事务
     */
    public function beginTransaction(): bool
    {
        return $this->pdo->beginTransaction();
    }

    /**
     * 提交事务
     */
    public function commit(): bool
    {
        return $this->pdo->commit();
    }

    /**
     * 回滚事务
     */
    public function rollBack(): bool
    {
        if ($this->pdo->inTransaction()) {
            return $this->pdo->rollBack();
        }
        return false;
    }
}
