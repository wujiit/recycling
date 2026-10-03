<?php
/**
 * 启灵回收系统 - IP 归属地与网络运营商解析服务
 * 提供单 IP 查询、批量解析与多级缓存机制
 */

namespace App\Service;

use App\Model\Database;

class IpService
{
    private static $instance = null;
    private $cache;
    private $apiKey = '';
    private $enabled = true;
    private const API_BASE_URL = 'https://api.jingxialai.com/api/ip';

    private function __construct()
    {
        $this->cache = CacheService::getInstance();
        $this->loadConfig();
    }

    public static function getInstance(): self
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * 读取灵简 IP 接口配置参数
     */
    public function loadConfig(): void
    {
        try {
            $db = Database::getInstance();
            $p = $db->getPrefix();
            $rows = $db->fetchAll("SELECT `config_key`, `config_value` FROM `{$p}sys_config` WHERE `config_key` IN ('lingjian_ip_api_key', 'lingjian_ip_enabled')");
            foreach ($rows as $r) {
                if ($r['config_key'] === 'lingjian_ip_api_key') {
                    $this->apiKey = trim((string)$r['config_value']);
                } elseif ($r['config_key'] === 'lingjian_ip_enabled') {
                    $this->enabled = $r['config_value'] !== '0';
                }
            }
        } catch (\Throwable $e) {
            // 静默安全捕获
        }
    }

    /**
     * 解析单个 IP 地址归属地与网络运营商
     * @param string $ip
     * @return array [
     *   'ip' => string,
     *   'location' => string (格式化友好文案，如：四川省成都市 [电信网络]),
     *   'country' => string,
     *   'province' => string,
     *   'city' => string,
     *   'district' => string,
     *   'isp' => string,
     *   'raw' => array
     * ]
     */
    public function resolve(string $ip): array
    {
        $ip = trim($ip);
        if (empty($ip)) {
            return [
                'ip'       => '',
                'location' => '未知IP',
                'country'  => '',
                'province' => '',
                'city'     => '',
                'district' => '',
                'isp'      => '',
                'raw'      => []
            ];
        }

        // 识别私有/内网/本地回环 IP，无需发起外部 HTTP 请求
        if ($this->isLocalOrPrivateIp($ip)) {
            $loc = ($ip === '127.0.0.1' || $ip === '::1') ? '本地开发环境' : '局域网内网地址';
            return [
                'ip'       => $ip,
                'location' => $loc,
                'country'  => '',
                'province' => '',
                'city'     => '',
                'district' => '',
                'isp'      => '局域网',
                'raw'      => ['ip' => $ip, 'city' => $loc]
            ];
        }

        // 优先读取缓存 (TTL: 30 天)
        $cacheKey = 'ip_geo:' . md5($ip);
        $cached = $this->cache->get($cacheKey);
        if ($cached && is_array($cached) && !empty($cached['location'])) {
            return $cached;
        }

        // 未开启或未配置 API Key
        if (!$this->enabled || empty($this->apiKey)) {
            return [
                'ip'       => $ip,
                'location' => '未配置IP密钥',
                'country'  => '',
                'province' => '',
                'city'     => '',
                'district' => '',
                'isp'      => '',
                'raw'      => []
            ];
        }

        // 发起第三方灵简官方 API 请求
        $result = $this->requestApi($ip, $this->apiKey);

        if ($result['code'] === 200 && !empty($result['data'])) {
            $data = $result['data'];
            $location = $this->formatLocation($data);
            $parsed = [
                'ip'       => $data['ip'] ?? $ip,
                'location' => $location,
                'country'  => $data['country'] ?? '',
                'province' => $data['province'] ?? '',
                'city'     => $data['city'] ?? '',
                'district' => $data['district'] ?? '',
                'isp'      => $data['isp'] ?? '',
                'raw'      => $data
            ];
            // 写入缓存 30 天 (2592000 秒)
            $this->cache->set($cacheKey, $parsed, 2592000);
            return $parsed;
        }

        // 请求失败兜底返回
        return [
            'ip'       => $ip,
            'location' => '归属地未知',
            'country'  => '',
            'province' => '',
            'city'     => '',
            'district' => '',
            'isp'      => '',
            'raw'      => $result['data'] ?? []
        ];
    }

    /**
     * 测试灵简 API Key 连通性
     */
    public function testKey(string $apiKey, string $testIp = '114.114.114.114'): array
    {
        $apiKey = trim($apiKey);
        if (empty($apiKey)) {
            return ['code' => 400, 'msg' => '请填写灵简 API Key 后再进行连通性测试', 'data' => null];
        }
        $testIp = trim($testIp) ?: '114.114.114.114';

        $res = $this->requestApi($testIp, $apiKey);
        if ($res['code'] === 200) {
            $formatted = $this->formatLocation($res['data']);
            return [
                'code' => 200,
                'msg'  => '灵简 IP 接口鉴权通过，网络连通正常！',
                'data' => array_merge($res['data'], ['formatted_location' => $formatted])
            ];
        }

        return [
            'code' => $res['code'],
            'msg'  => $res['msg'] ?? '灵简 IP 接口测试未通过，请检查 Key 与网络',
            'data' => $res['data'] ?? null
        ];
    }

    /**
     * 执行底层 cURL 请求
     */
    private function requestApi(string $ip, string $apiKey): array
    {
        $url = self::API_BASE_URL . '?ip=' . urlencode($ip);
        $ch = curl_init();

        curl_setopt_array($ch, [
            CURLOPT_URL            => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_ENCODING       => '',
            CURLOPT_MAXREDIRS      => 5,
            CURLOPT_CONNECTTIMEOUT => 3, // 连接超时 3s
            CURLOPT_TIMEOUT        => 5, // 总超时 5s
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_HTTP_VERSION   => CURL_HTTP_VERSION_1_1,
            CURLOPT_CUSTOMREQUEST  => 'GET',
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
            CURLOPT_HTTPHEADER     => [
                'X-API-Key: ' . $apiKey,
                'Content-Type: application/json'
            ],
        ]);

        $response = curl_exec($ch);
        $err = curl_error($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch); // 释放 cURL 句柄

        if ($err) {
            return [
                'code' => 500,
                'msg'  => '连接灵简 API 超时或失败: ' . $err,
                'data' => null
            ];
        }

        $json = json_decode((string)$response, true);

        if ($httpCode === 200 && is_array($json)) {
            return [
                'code' => 200,
                'msg'  => '查询成功',
                'data' => $json
            ];
        }

        $errMsg = '查询失败(HTTP ' . $httpCode . ')';
        if (is_array($json) && !empty($json['message'])) {
            $errMsg = $json['message'];
        } elseif ($httpCode === 400) {
            $errMsg = 'IP 格式不合法，请检查传入的 IP 地址';
        } elseif ($httpCode === 401) {
            $errMsg = 'API Key 无效或未在允许的白名单中';
        } elseif ($httpCode === 429) {
            $errMsg = '接口调用频次过高或免费配额已耗尽';
        } elseif ($httpCode === 502) {
            $errMsg = '灵简上游服务暂时无响应，请稍后重试';
        }

        return [
            'code' => $httpCode ?: 500,
            'msg'  => $errMsg,
            'data' => $json
        ];
    }

    /**
     * 格式化友好归属地展示字符串
     */
    public function formatLocation(array $data): string
    {
        $country = trim((string)($data['country'] ?? ''));
        $province = trim((string)($data['province'] ?? ''));
        $city = trim((string)($data['city'] ?? ''));
        $district = trim((string)($data['district'] ?? ''));
        $isp = trim((string)($data['isp'] ?? ''));

        $parts = [];
        if ($country && $country !== '中国') {
            $parts[] = $country;
        }
        if ($province) {
            $parts[] = $province;
        }
        if ($city && $city !== $province) {
            $parts[] = $city;
        }
        if ($district) {
            $parts[] = $district;
        }

        $loc = implode('', $parts);
        if (empty($loc)) {
            $loc = $country ?: '未知归属地';
        }

        if (!empty($isp)) {
            $loc .= ' [' . $isp . ']';
        }

        return $loc;
    }

    /**
     * 判断是否为本地或私有内网 IP
     */
    private function isLocalOrPrivateIp(string $ip): bool
    {
        if ($ip === '127.0.0.1' || $ip === '::1' || $ip === 'localhost') {
            return true;
        }
        return !filter_var(
            $ip,
            FILTER_VALIDATE_IP,
            FILTER_FLAG_IPV4 | FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
        );
    }

    /**
     * 批量解析 IP 归属地 (优先命中缓存)
     * @param array $ips
     * @return array [ip => location_string]
     */
    public function batchResolve(array $ips): array
    {
        $result = [];
        $uniqueIps = array_unique(array_filter(array_map('trim', $ips)));
        $uncached = [];

        foreach ($uniqueIps as $ip) {
            if ($this->isLocalOrPrivateIp($ip)) {
                $result[$ip] = ($ip === '127.0.0.1' || $ip === '::1') ? '本地开发环境' : '局域网内网地址';
                continue;
            }
            $cacheKey = 'ip_geo:' . md5($ip);
            $cached = $this->cache->get($cacheKey);
            if ($cached && is_array($cached) && !empty($cached['location'])) {
                $result[$ip] = $cached['location'];
            } else {
                $uncached[] = $ip;
            }
        }

        // 若未开启或未填 API Key，直接标记
        if (!$this->enabled || empty($this->apiKey)) {
            foreach ($uncached as $ip) {
                $result[$ip] = '未配置IP密钥';
            }
            return $result;
        }

        // 对未命中缓存的 IP 进行受控解析 (单次最多解析 5 个，避免页面加载耗时过长)
        $limit = 5;
        $count = 0;
        foreach ($uncached as $ip) {
            if ($count < $limit) {
                $res = $this->resolve($ip);
                $result[$ip] = $res['location'] ?? '归属地未知';
                $count++;
            } else {
                $result[$ip] = '待解析';
            }
        }

        return $result;
    }
}

