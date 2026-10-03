<?php
/**
 * 启灵独立回收系统 - Redis 独立隔离与文件缓存双模驱动
 * 核心特性：
 * 1. 严格实现多网站同服共用 Redis 的命名空间隔离（指定独立 DB 序号 + 强制业务前缀包装）
 * 2. 严禁执行 flushdb/flushall，清理缓存仅安全 SCAN 清理所属前缀键，保障同服务器其他系统 100% 安全
 * 3. 具备 Redis 异常/未开启时的自动静默降级（Fallback 至本地文件缓存），业务永不中断
 * 编码：UTF-8 无 BOM
 */

namespace App\Service;

class CacheService
{
    private static $instance = null;
    private $redis = null;
    private $useRedis = false;
    private $prefix = 'sys_recycle:';
    private $fileCacheDir;

    private function __construct()
    {
        $this->fileCacheDir = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'runtime' . DIRECTORY_SEPARATOR . 'cache' . DIRECTORY_SEPARATOR;
        if (!is_dir($this->fileCacheDir)) {
            @mkdir($this->fileCacheDir, 0755, true);
        }

        $this->initRedis();
    }

    public static function getInstance(): self
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * 初始化 Redis 客户端连接
     */
    private function initRedis(): void
    {
        $configFile = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'config' . DIRECTORY_SEPARATOR . 'redis.php';
        if (!is_file($configFile)) {
            return;
        }

        $config = require $configFile;
        if (empty($config['enable']) || !class_exists('\Redis')) {
            return;
        }

        try {
            $redis = new \Redis();
            $connected = $redis->connect(
                $config['host'] ?? '127.0.0.1',
                (int)($config['port'] ?? 6379),
                (float)($config['timeout'] ?? 2.0)
            );

            if ($connected) {
                if (!empty($config['password'])) {
                    $redis->auth($config['password']);
                }

                // 切换至本系统专用独立 DB 库号（默认指定 DB 2，与其它网站 DB 0 隔离）
                $dbIndex = (int)($config['db_index'] ?? 2);
                $redis->select($dbIndex);

                $this->prefix = !empty($config['prefix']) ? rtrim($config['prefix'], ':') . ':' : 'sys_recycle:';
                $this->redis = $redis;
                $this->useRedis = true;
            }
        } catch (\Throwable $e) {
            // Redis 异常时静默降级为文件缓存，记录本地日志
            $this->useRedis = false;
            $this->redis = null;
        }
    }

    /**
     * 热重载 Redis 配置并重建连接
     */
    public function reloadConfig(): void
    {
        if ($this->redis) {
            try {
                @$this->redis->close();
            } catch (\Throwable $e) {
                // 静默忽略关闭句柄异常
            }
        }
        $this->redis = null;
        $this->useRedis = false;
        $this->initRedis();
    }

    /**
     * 包装安全键名（附加隔离前缀）
     */
    private function wrapKey(string $key): string
    {
        return $this->prefix . $key;
    }

    /**
     * 读取缓存
     */
    public function get(string $key, $default = null)
    {
        $safeKey = $this->wrapKey($key);

        if ($this->useRedis && $this->redis) {
            try {
                $val = $this->redis->get($safeKey);
                if ($val === false) {
                    return $default;
                }
                return unserialize($val);
            } catch (\Throwable $e) {
                // 读取失败降级为文件缓存
            }
        }

        return $this->getFileCache($safeKey, $default);
    }

    /**
     * 设置缓存
     *
     * @param string $key 键名
     * @param mixed $value 缓存值
     * @param int $ttl 有效期（秒），默认 1 小时
     */
    public function set(string $key, $value, int $ttl = 3600): bool
    {
        $safeKey = $this->wrapKey($key);

        if ($this->useRedis && $this->redis) {
            try {
                $serialized = serialize($value);
                if ($ttl > 0) {
                    return (bool)$this->redis->setex($safeKey, $ttl, $serialized);
                }
                return (bool)$this->redis->set($safeKey, $serialized);
            } catch (\Throwable $e) {
                // 写入失败降级为文件缓存
            }
        }

        return $this->setFileCache($safeKey, $value, $ttl);
    }

    /**
     * 删除单条缓存
     */
    public function delete(string $key): bool
    {
        $safeKey = $this->wrapKey($key);

        if ($this->useRedis && $this->redis) {
            try {
                $this->redis->del($safeKey);
            } catch (\Throwable $e) {
            }
        }

        return $this->deleteFileCache($safeKey);
    }

    /**
     * 获取分布式互斥锁 (支持 Redis SET NX EX 与本地文件锁双模容灾降级)
     * 防止高并发重复处理与并发重入
     *
     * @param string $key 锁标识键名 (如 'sf_fee:SF123', 'payout:1001')
     * @param int $ttl 锁持有时长（秒），默认 10 秒
     * @return string|null 成功加锁返回防伪随机 Token，加锁失败返回 null
     */
    public function acquireLock(string $key, int $ttl = 10): ?string
    {
        $safeKey = $this->wrapKey('lock:' . ltrim($key, ':'));
        $token = bin2hex(random_bytes(16));

        if ($this->useRedis && $this->redis) {
            try {
                // Redis 原生原子 SET key token NX EX ttl
                $res = $this->redis->set($safeKey, $token, ['NX', 'EX' => $ttl > 0 ? $ttl : 10]);
                if ($res) {
                    return $token;
                }
                return null;
            } catch (\Throwable $e) {
                // Redis 异常降级为文件锁
            }
        }

        return $this->acquireFileLock($safeKey, $token, $ttl) ? $token : null;
    }

    /**
     * 释放分布式互斥锁
     * 只有加锁者持有的有效 token 才能安全释放锁，严防误删他人新获取的锁
     *
     * @param string $key 锁标识键名
     * @param string $token 加锁时返回的防伪 Token
     * @return bool 是否成功释放
     */
    public function releaseLock(string $key, string $token): bool
    {
        if (empty($token)) {
            return false;
        }

        $safeKey = $this->wrapKey('lock:' . ltrim($key, ':'));

        if ($this->useRedis && $this->redis) {
            try {
                // 使用 Lua 脚本确保读取比对与删除的原子性
                $lua = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";
                return (bool)$this->redis->eval($lua, [$safeKey, $token], 1);
            } catch (\Throwable $e) {
                try {
                    $curr = $this->redis->get($safeKey);
                    if ($curr === $token) {
                        return (bool)$this->redis->del($safeKey);
                    }
                } catch (\Throwable $t) {}
            }
        }

        return $this->releaseFileLock($safeKey, $token);
    }

    /**
     * 判断当前资源是否处于锁定状态
     */
    public function isLocked(string $key): bool
    {
        $safeKey = $this->wrapKey('lock:' . ltrim($key, ':'));

        if ($this->useRedis && $this->redis) {
            try {
                return (bool)$this->redis->exists($safeKey);
            } catch (\Throwable $e) {}
        }

        $file = $this->fileCacheDir . md5($safeKey) . '.lock';
        if (!is_file($file)) {
            return false;
        }
        $content = @file_get_contents($file);
        if ($content === false || strlen($content) < 10) {
            return false;
        }
        $expire = (int)substr($content, 0, 10);
        if ($expire < time()) {
            @unlink($file);
            return false;
        }
        return true;
    }

    /**
     * 安全清理系统缓存
     * 注意：严格禁止执行 flushdb 或 flushall，仅使用 SCAN 批量删除自身前缀缓存！
     */
    public function clear(): bool
    {
        if ($this->useRedis && $this->redis) {
            try {
                $pattern = $this->prefix . '*';
                $iterator = null;
                while ($keys = $this->redis->scan($iterator, $pattern, 100)) {
                    if (!empty($keys)) {
                        $this->redis->del($keys);
                    }
                }
            } catch (\Throwable $e) {
            }
        }

        // 清理文件缓存
        $files = glob($this->fileCacheDir . '*');
        if (is_array($files)) {
            foreach ($files as $file) {
                if (is_file($file)) {
                    @unlink($file);
                }
            }
        }

        return true;
    }

    /**
     * 获取缓存运行状态与性能统计数据
     * 支持 Redis 独立库隔离状态监控与本地文件降级缓存体检
     */
    public function getStats(): array
    {
        $stats = [
            'mode'              => $this->useRedis ? 'redis' : 'file',
            'driver_label'      => $this->useRedis ? 'Redis (独立库隔离双模驱动)' : '本地文件缓存 (容灾原子降级)',
            'is_redis'          => $this->useRedis,
            'prefix'            => $this->prefix,
            'file_dir'          => $this->fileCacheDir,
            'file_dir_writable' => is_writable($this->fileCacheDir),
            'timestamp'         => time(),
        ];

        // 统计本地降级文件缓存情况
        $fileCount = 0;
        $fileSize = 0;
        $files = glob($this->fileCacheDir . '*.cache');
        if (is_array($files)) {
            $fileCount = count($files);
            foreach ($files as $f) {
                $fileSize += (int)@filesize($f);
            }
        }
        $stats['file_cache_count'] = $fileCount;
        $stats['file_cache_size']  = round($fileSize / 1024, 2) . ' KB';
        $stats['file_cache_bytes'] = $fileSize;

        // 读取配置中 DB 序号与前缀
        $configFile = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'config' . DIRECTORY_SEPARATOR . 'redis.php';
        $dbIndex = 6;
        if (is_file($configFile)) {
            $c = require $configFile;
            $dbIndex = (int)($c['db_index'] ?? 6);
        }
        $stats['redis_db_index'] = $dbIndex;

        if ($this->useRedis && $this->redis) {
            try {
                $info = $this->redis->info();
                $stats['redis_version']     = $info['redis_version'] ?? '未知';
                $stats['redis_uptime_days'] = (int)($info['uptime_in_days'] ?? 0);
                $stats['redis_clients']     = (int)($info['connected_clients'] ?? 0);
                $stats['redis_used_memory'] = $info['used_memory_human'] ?? '0B';
                $stats['redis_peak_memory'] = $info['used_memory_peak_human'] ?? '0B';

                $hits = (int)($info['keyspace_hits'] ?? 0);
                $misses = (int)($info['keyspace_misses'] ?? 0);
                $totalLookups = $hits + $misses;
                $hitRate = $totalLookups > 0 ? round(($hits / $totalLookups) * 100, 2) : 100.0;
                $stats['redis_hits']     = $hits;
                $stats['redis_misses']   = $misses;
                $stats['redis_hit_rate'] = $hitRate . '%';

                // 安全非阻塞 SCAN 统计本系统专属隔离前缀的 Key 数量与样本
                $pattern = $this->prefix . '*';
                $iterator = null;
                $prefixKeyCount = 0;
                $sampleKeys = [];
                $scanLoops = 0;
                while ($keys = $this->redis->scan($iterator, $pattern, 100)) {
                    if (!empty($keys)) {
                        $prefixKeyCount += count($keys);
                        foreach ($keys as $k) {
                            if (count($sampleKeys) < 10) {
                                $sampleKeys[] = $k;
                            }
                        }
                    }
                    $scanLoops++;
                    if ($scanLoops >= 20) break;
                }
                $stats['system_key_count'] = $prefixKeyCount;
                $stats['sample_keys']      = $sampleKeys;
            } catch (\Throwable $e) {
                $stats['redis_error'] = $e->getMessage();
            }
        }

        return $stats;
    }

    /**
     * 获取当前 Redis 详细配置参数
     */
    public function getRedisConfig(): array
    {
        $configFile = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'config' . DIRECTORY_SEPARATOR . 'redis.php';
        $default = [
            'enable'        => true,
            'host'          => '127.0.0.1',
            'port'          => 6379,
            'password'      => '',
            'db_index'      => 6,
            'prefix'        => 'sys_recycle:',
            'timeout'       => 2.0,
            'has_extension' => extension_loaded('redis'),
            'is_connected'  => $this->useRedis,
        ];

        if (is_file($configFile)) {
            $cfg = require $configFile;
            if (is_array($cfg)) {
                $default['enable'] = !empty($cfg['enable']);
                $default['host'] = (string)($cfg['host'] ?? '127.0.0.1');
                $default['port'] = (int)($cfg['port'] ?? 6379);
                $default['password'] = (string)($cfg['password'] ?? '');
                $default['db_index'] = (int)($cfg['db_index'] ?? 6);
                $default['prefix'] = (string)($cfg['prefix'] ?? 'sys_recycle:');
                $default['timeout'] = (float)($cfg['timeout'] ?? 2.0);
            }
        }

        return $default;
    }

    /**
     * 动态测试指定参数的 Redis 连通性与独立库切换
     */
    public function testRedisConnection(array $params): array
    {
        if (!extension_loaded('redis')) {
            return [
                'code' => 400,
                'msg'  => '检测到当前环境未启用 PHP Redis 扩展，系统将自动使用本地文件缓存'
            ];
        }

        $host = trim((string)($params['host'] ?? '127.0.0.1'));
        $port = (int)($params['port'] ?? 6379);
        $password = (string)($params['password'] ?? '');
        $dbIndex = (int)($params['db_index'] ?? 0);
        $timeout = (float)($params['timeout'] ?? 2.0);
        if ($timeout <= 0) $timeout = 2.0;

        if ($port < 1 || $port > 65535) {
            return ['code' => 400, 'msg' => 'Redis 端口号无效，应在 1-65535 范围内'];
        }
        if ($dbIndex < 0 || $dbIndex > 15) {
            return ['code' => 400, 'msg' => 'Redis DB 库号无效，专属库必须在 0 到 15 之间'];
        }

        try {
            $client = new \Redis();
            $connected = @$client->connect($host, $port, $timeout);
            if (!$connected) {
                return ['code' => 400, 'msg' => "无法连接至 Redis 服务 ({$host}:{$port})，请核对主机地址与端口"];
            }

            if (!empty($password)) {
                $authOk = @$client->auth($password);
                if (!$authOk) {
                    return ['code' => 400, 'msg' => 'Redis 密码认证失败，请核对连接密码'];
                }
            }

            $selected = @$client->select($dbIndex);
            if (!$selected) {
                return ['code' => 400, 'msg' => "无法切换到独立库 DB {$dbIndex}，请检查服务端 databases 配置"];
            }

            @$client->ping();
            @$client->close();

            return [
                'code' => 200,
                'msg'  => "Redis 连接测试成功！已成功连接并选中独立 DB {$dbIndex} 专属空间"
            ];
        } catch (\Throwable $e) {
            $errMsg = $e->getMessage();
            if (stripos($errMsg, 'auth') !== false) {
                return ['code' => 400, 'msg' => 'Redis 密码验证失败，请确认密码是否正确'];
            }
            return ['code' => 400, 'msg' => 'Redis 连接异常: ' . $errMsg];
        }
    }

    /**
     * 保存并应用新的 Redis 配置 (包括修改专属独立库 DB 序号)
     */
    public function saveRedisConfig(array $params): array
    {
        $enable = !empty($params['enable']);
        $host = trim((string)($params['host'] ?? '127.0.0.1'));
        $port = (int)($params['port'] ?? 6379);
        $password = (string)($params['password'] ?? '');
        $dbIndex = (int)($params['db_index'] ?? 0);
        $prefix = trim((string)($params['prefix'] ?? 'sys_recycle:'));
        $timeout = (float)($params['timeout'] ?? 2.0);

        if ($port < 1 || $port > 65535) {
            return ['code' => 400, 'msg' => 'Redis 端口号无效，应在 1-65535 范围内'];
        }
        if ($dbIndex < 0 || $dbIndex > 15) {
            return ['code' => 400, 'msg' => 'Redis DB 库号无效，专属库必须在 0 到 15 之间'];
        }
        if (empty($prefix)) {
            $prefix = 'sys_recycle:';
        }
        if (substr($prefix, -1) !== ':') {
            $prefix .= ':';
        }
        if ($timeout <= 0) {
            $timeout = 2.0;
        }

        // 若启用 Redis 且扩展已安装，先预检真实连通性
        if ($enable && extension_loaded('redis')) {
            $testRes = $this->testRedisConnection([
                'host'      => $host,
                'port'      => $port,
                'password'  => $password,
                'db_index'  => $dbIndex,
                'timeout'   => $timeout,
            ]);
            if ($testRes['code'] !== 200) {
                return $testRes;
            }
        }

        $configDir = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'config';
        if (!is_dir($configDir)) {
            @mkdir($configDir, 0755, true);
        }
        $configFile = $configDir . DIRECTORY_SEPARATOR . 'redis.php';

        $code = "<?php\n"
            . "// Redis 独立多网站隔离缓存配置\n"
            . "return [\n"
            . "    'enable'   => " . ($enable ? 'true' : 'false') . ",\n"
            . "    'host'     => " . var_export($host, true) . ",\n"
            . "    'port'     => " . $port . ",\n"
            . "    'password' => " . var_export($password, true) . ",\n"
            . "    'db_index' => " . $dbIndex . ",\n"
            . "    'prefix'   => " . var_export($prefix, true) . ",\n"
            . "    'timeout'  => " . $timeout . ",\n"
            . "];\n";

        $saved = @file_put_contents($configFile, $code, LOCK_EX);
        if ($saved === false) {
            return ['code' => 500, 'msg' => '无法写入 config/redis.php 配置文件，请检查目录写权限'];
        }

        // 立即热重载
        $this->reloadConfig();

        return [
            'code' => 200,
            'msg'  => "Redis 配置已成功保存！当前已切换至独立 DB {$dbIndex} 专属库"
        ];
    }

    // ==================== 文件缓存降级私有实现 ====================

    private function getFilePath(string $safeKey): string
    {
        return $this->fileCacheDir . md5($safeKey) . '.cache';
    }

    private function getFileCache(string $safeKey, $default)
    {
        $file = $this->getFilePath($safeKey);
        if (!is_file($file)) {
            return $default;
        }

        $content = @file_get_contents($file);
        if ($content === false || strlen($content) < 10) {
            return $default;
        }

        $expire = (int)substr($content, 0, 10);
        if ($expire !== 0 && $expire < time()) {
            @unlink($file);
            return $default;
        }

        return unserialize(substr($content, 10));
    }

    private function setFileCache(string $safeKey, $value, int $ttl): bool
    {
        $file = $this->getFilePath($safeKey);
        $expire = $ttl > 0 ? (time() + $ttl) : 0;
        $content = sprintf('%010d', $expire) . serialize($value);
        return (bool)@file_put_contents($file, $content, LOCK_EX);
    }

    private function deleteFileCache(string $safeKey): bool
    {
        $file = $this->getFilePath($safeKey);
        if (is_file($file)) {
            return @unlink($file);
        }
        return true;
    }

    private function acquireFileLock(string $safeKey, string $token, int $ttl): bool
    {
        $file = $this->fileCacheDir . md5($safeKey) . '.lock';
        $now = time();
        $expire = $now + ($ttl > 0 ? $ttl : 10);

        // 如果锁文件存在，先检查是否已过期
        if (is_file($file)) {
            $content = @file_get_contents($file);
            if ($content !== false && strlen($content) >= 10) {
                $oldExpire = (int)substr($content, 0, 10);
                if ($oldExpire >= $now) {
                    return false; // 锁仍在租约期内，互斥失败
                }
            }
            @unlink($file); // 已过期，清理旧锁
        }

        // 以原子性独占创建模式尝试加锁
        $fp = @fopen($file, 'x');
        if ($fp === false) {
            return false;
        }

        $data = sprintf('%010d', $expire) . $token;
        @fwrite($fp, $data);
        @fclose($fp);
        return true;
    }

    private function releaseFileLock(string $safeKey, string $token): bool
    {
        $file = $this->fileCacheDir . md5($safeKey) . '.lock';
        if (!is_file($file)) {
            return true;
        }

        $content = @file_get_contents($file);
        if ($content === false) {
            return true;
        }

        $fileToken = substr($content, 10);
        if ($fileToken === $token) {
            return (bool)@unlink($file);
        }

        return false;
    }
}
