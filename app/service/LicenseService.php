<?php
/**
 * 正版授权验证服务
 * 负责与远程 WordPress 授权系统 (qilingverify) 联动校验、本地缓存与容灾宽限期管理
 */

declare(strict_types=1);

namespace App\Service;

use App\Model\Database;
use App\Service\CacheService;

class LicenseService
{
    private static $instance = null;
    private $db;
    private $p;
    private $cache;

    // 官方内置默认授权服务根地址
    const DEFAULT_SERVER_URL = 'https://www.jingxialai.com';
    // 系统发布版本号
    const SYSTEM_VERSION = '1.0.0';
    // 产品标识，与 qilingverify 插件对齐
    const PRODUCT_SLUG = 'qilingrecycle';
    // 本地缓存有效期 (12小时)
    const CACHE_TTL = 43200;
    // 本地数据防篡改加盐
    const SIGN_SALT = 'QL_RECYCLE_LIC_SALT_#8899';

    private function __construct()
    {
        $this->db = Database::getInstance();
        $this->p = $this->db->getPrefix();
        $this->cache = CacheService::getInstance();
    }

    public static function getInstance(): self
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * 读取授权相关配置项
     */
    public function getConfig(string $key, string $default = ''): string
    {
        $sql = "SELECT `config_value` FROM `{$this->p}sys_config` WHERE `config_key` = ? LIMIT 1";
        $row = $this->db->fetchOne($sql, [$key]);
        return isset($row['config_value']) ? (string)$row['config_value'] : $default;
    }

    /**
     * 保存授权相关配置项
     */
    public function setConfig(string $key, string $value): void
    {
        $now = time();
        $sql = "INSERT INTO `{$this->p}sys_config` (`group_name`, `config_key`, `config_value`, `updated_at`) 
                VALUES ('license', ?, ?, ?) 
                ON DUPLICATE KEY UPDATE `config_value` = VALUES(`config_value`), `updated_at` = VALUES(`updated_at`)";
        $this->db->execute($sql, [$key, $value, $now]);
    }

    /**
     * 获取当前服务运行的域名
     */
    public function getCurrentDomain(): string
    {
        $host = $_SERVER['HTTP_HOST'] ?? ($_SERVER['SERVER_NAME'] ?? 'localhost');
        return trim((string)$host);
    }

    /**
     * 规范化域名 (严格对齐 qilingverify 服务端的 normalize_domain)
     */
    public function normalizeDomain(string $url): string
    {
        // 去除协议
        $url = preg_replace('#^https?://#i', '', $url);
        // 去除 www.
        $url = preg_replace('#^www\.#i', '', $url);
        // 去除路径
        $parts = explode('/', $url);
        $url = $parts[0] ?? '';
        // 去除端口
        $parts = explode(':', $url);
        $url = $parts[0] ?? '';
        return strtolower(trim((string)$url));
    }

    /**
     * 判断是否为本地局域网开发测试环境
     */
    public function isLocalDevDomain(string $domain): bool
    {
        $clean = $this->normalizeDomain($domain);
        if (empty($clean)) {
            return false;
        }

        if (in_array($clean, ['localhost', '127.0.0.1', '::1'], true)) {
            return true;
        }

        // 局域网 IP
        if (filter_var($clean, FILTER_VALIDATE_IP)) {
            if (
                preg_match('/^10\./', $clean) ||
                preg_match('/^192\.168\./', $clean) ||
                preg_match('/^172\.(1[6-9]|2[0-9]|3[0-1])\./', $clean)
            ) {
                return true;
            }
        }

        // 常见本地测试顶级域
        if (preg_match('/\.(test|local|localhost|internal)$/i', $clean)) {
            return true;
        }

        return false;
    }

    /**
     * 校验本地正版激活凭据与防篡改签名 (一次激活，永久有效)
     */
    public function isLocalTokenValid(): bool
    {
        $status = $this->getConfig('license_status', '');
        if ($status !== 'valid') {
            return false;
        }

        $licenseKey = $this->getConfig('license_key', '');
        $verifiedAt = $this->getConfig('license_verified_at', '');
        $token = $this->getConfig('license_token', '');
        $cleanDomain = $this->normalizeDomain($this->getCurrentDomain());

        if (empty($licenseKey) || empty($verifiedAt) || empty($token) || empty($cleanDomain)) {
            return false;
        }

        $expected = hash_hmac('sha256', $licenseKey . '|' . $cleanDomain . '|' . $verifiedAt, self::SIGN_SALT);
        return hash_equals($expected, $token);
    }

    /**
     * 获取授权概览信息 (供后台管理展示)
     */
    public function getLicenseInfo(): array
    {
        $serverUrl = $this->getConfig('license_server_url', self::DEFAULT_SERVER_URL);
        if (empty($serverUrl)) {
            $serverUrl = self::DEFAULT_SERVER_URL;
        }
        $licenseKey = $this->getConfig('license_key', '');
        $status = $this->getConfig('license_status', 'unauthorized');
        $lastCheck = (int)$this->getConfig('license_last_check', '0');
        $currentDomain = $this->getCurrentDomain();
        $cleanDomain = $this->normalizeDomain($currentDomain);
        $isLocalDev = $this->isLocalDevDomain($currentDomain);
        $isLocalValid = $this->isLocalTokenValid();

        // 状态文字映射
        $statusMap = [
            'valid'          => '已正版授权 (永久有效)',
            'unauthorized'   => '未配置授权码',
            'invalid_key'    => '授权码无效',
            'invalid_domain' => '授权域名不符',
            'order_disabled' => '授权订单已被禁用',
            'network_error'  => '官方验证节点暂时离线',
            'local_dev'      => '本地调试环境免授权'
        ];

        // 脱敏授权码
        $maskedKey = '';
        if (!empty($licenseKey)) {
            $len = strlen($licenseKey);
            if ($len > 8) {
                $maskedKey = substr($licenseKey, 0, 4) . '****' . substr($licenseKey, -4);
            } else {
                $maskedKey = '****';
            }
        }

        $isAuthorized = false;

        if ($isLocalDev) {
            $isAuthorized = true;
            $displayStatus = 'local_dev';
        } elseif ($isLocalValid || $status === 'valid') {
            $isAuthorized = true;
            $displayStatus = 'valid';
        } else {
            $displayStatus = $status;
        }

        return [
            'server_url'       => $serverUrl,
            'license_key'      => $maskedKey,
            'has_key'          => !empty($licenseKey),
            'current_domain'   => $currentDomain,
            'clean_domain'     => $cleanDomain,
            'is_local_dev'     => $isLocalDev,
            'status'           => $displayStatus,
            'status_text'      => $statusMap[$displayStatus] ?? '未配置授权码',
            'last_check_time'  => $lastCheck > 0 ? date('Y-m-d H:i:s', $lastCheck) : '从未验证',
            'validity_mode'    => '永久正版有效 · 本地离线持久保障',
            'is_authorized'    => $isAuthorized,
            'system_version'   => self::SYSTEM_VERSION,
        ];
    }

    /**
     * 发起在线联网正版验证
     *
     * @param string|null $inputKey 授权密钥 (若为 null 则取保存的配置)
     * @param string|null $inputServerUrl 授权服务器地址 (若为 null 则取保存的配置)
     * @return array
     */
    public function verifyOnline(?string $inputKey = null, ?string $inputServerUrl = null): array
    {
        $serverUrl = $inputServerUrl !== null && trim($inputServerUrl) !== '' ? trim($inputServerUrl) : $this->getConfig('license_server_url', self::DEFAULT_SERVER_URL);
        if (empty($serverUrl)) {
            $serverUrl = self::DEFAULT_SERVER_URL;
        }
        $licenseKey = $inputKey !== null ? trim($inputKey) : $this->getConfig('license_key', '');

        // 去除末尾斜杠
        $serverUrl = rtrim($serverUrl, '/');

        if (empty($licenseKey)) {
            $this->setConfig('license_status', 'unauthorized');
            return [
                'code' => 400,
                'msg'  => '请先填写正版授权密钥 (License Key)',
                'data' => ['status' => 'unauthorized']
            ];
        }

        $currentDomain = $this->getCurrentDomain();
        $cleanDomain = $this->normalizeDomain($currentDomain);
        $now = time();

        // 组装 qilingverify REST API 请求地址
        $apiEndpoint = $serverUrl . '/wp-json/qiling-verify/v1/check';

        $payload = [
            'domain'  => $cleanDomain,
            'key'     => $licenseKey,
            'version' => self::SYSTEM_VERSION,
            'product' => self::PRODUCT_SLUG,
        ];

        // 发起 HTTP 请求 (显式连接 3s，读取 5s)
        $response = $this->executeHttp($apiEndpoint, $payload);

        if (!$response['success']) {
            // 容灾保障：如果本地此前已成功激活，哪怕远程授权服务器打不开或维护，系统也永久正常运行！
            if ($this->isLocalTokenValid()) {
                return [
                    'code' => 200,
                    'msg'  => '官方验证节点暂时网络离线，本地正版授权保持有效运行，业务正常运作中。',
                    'data' => [
                        'status' => 'valid',
                        'domain' => $cleanDomain
                    ]
                ];
            } else {
                return [
                    'code' => 500,
                    'msg'  => '首次激活需连接官方授权服务，当前连接失败: ' . $response['error'] . '，请检查服务器网络。',
                    'data' => ['status' => 'network_error']
                ];
            }
        }

        $resJson = json_decode($response['body'], true);
        if (!is_array($resJson)) {
            if ($this->isLocalTokenValid()) {
                return [
                    'code' => 200,
                    'msg'  => '官方授权服务端响应异常，本地正版授权保持有效运行，业务正常运作中。',
                    'data' => [
                        'status' => 'valid',
                        'domain' => $cleanDomain
                    ]
                ];
            }
            return [
                'code' => 500,
                'msg'  => '授权服务端响应格式错误',
                'data' => ['status' => 'network_error']
            ];
        }

        // qilingverify 标准成功结构: {"code": "success", "data": {"status": "valid"}}
        $respStatus = $resJson['data']['status'] ?? ($resJson['status'] ?? 'invalid');

        if ($respStatus === 'valid') {
            // 验证通过：写入永久正版凭证
            $this->setConfig('license_status', 'valid');
            $this->setConfig('license_last_check', (string)$now);
            $this->setConfig('license_verified_at', (string)$now);

            // 本地防篡改 HMAC 凭证 (绑定 密钥 + 域名 + 激活时间戳)
            $sign = hash_hmac('sha256', $licenseKey . '|' . $cleanDomain . '|' . $now, self::SIGN_SALT);
            $this->setConfig('license_token', $sign);

            // 写入本地缓存 (12小时)
            $this->cache->set('sys_license:status', 'valid', self::CACHE_TTL);

            return [
                'code' => 200,
                'msg'  => '正版商业授权验证通过！系统已完成永久激活。',
                'data' => [
                    'status'          => 'valid',
                    'domain'          => $cleanDomain,
                    'last_check_time' => date('Y-m-d H:i:s', $now),
                ]
            ];
        } else {
            // 只有远程服务器明确返回 invalid 时才置为失效
            $this->setConfig('license_status', 'invalid');
            $this->setConfig('license_token', '');
            $this->cache->delete('sys_license:status');

            return [
                'code' => 400,
                'msg'  => '正版授权验证未通过：授权码无效或当前域名未绑定至此授权订单',
                'data' => [
                    'status' => 'invalid',
                    'domain' => $cleanDomain
                ]
            ];
        }
    }

    /**
     * 快速检查当前系统授权有效性 (多级性能防御：进程级静态内存 -> Redis高速缓存 -> 本地防篡改比对)
     * 性能保证：日常请求 0 远程网络调用，亚毫秒级内存命中，对系统并发与吞吐量零损耗
     */
    public function checkStatus(bool $forceOnline = false): bool
    {
        // 1. PHP 进程/单次生命周期静态缓存 (单次请求 0.00001 秒级极速复用)
        static $staticAuth = null;
        if ($staticAuth !== null && !$forceOnline) {
            return $staticAuth;
        }

        // 2. 本地测试开发环境直接放行
        if ($this->isLocalDevDomain($this->getCurrentDomain())) {
            return $staticAuth = true;
        }

        // 3. 高速 Redis / 内存缓存 (亚毫秒级命中，避免重复查库)
        if (!$forceOnline) {
            $cached = $this->cache->get('sys_license:status');
            if ($cached === 'valid') {
                return $staticAuth = true;
            }
        }

        // 4. 检查本地正版激活凭据 (一次激活，永久有效)
        if ($this->isLocalTokenValid()) {
            // 写入本地 Redis 高速缓存 (12小时)，后续高并发请求直接内存秒读
            $this->cache->set('sys_license:status', 'valid', self::CACHE_TTL);
            return $staticAuth = true;
        }

        return $staticAuth = false;
    }

    /**
     * 是否处于正版受权状态
     */
    public function isAuthorized(): bool
    {
        return $this->checkStatus(false);
    }

    /**
     * 执行底层 cURL HTTP POST 请求 (显式连接 3s，读取 5s)
     */
    private function executeHttp(string $url, array $params): array
    {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($params));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 3);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        curl_setopt($ch, CURLOPT_USERAGENT, 'QilingRecycleClient/' . self::SYSTEM_VERSION);

        $body = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $errno = curl_errno($ch);
        $error = curl_error($ch);
        curl_close($ch);

        if ($errno !== 0) {
            return [
                'success' => false,
                'error'   => $error ?: ('cURL Error #' . $errno),
                'body'    => ''
            ];
        }

        if ($httpCode >= 400) {
            return [
                'success' => false,
                'error'   => 'HTTP状态码: ' . $httpCode . '，内容: ' . mb_substr((string)$body, 0, 100),
                'body'    => (string)$body
            ];
        }

        return [
            'success' => true,
            'error'   => '',
            'body'    => (string)$body
        ];
    }
}
