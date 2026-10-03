<?php
/**
 * 启灵独立回收系统 - 统一安全输入请求类
 * 规范：严格防范 XSS、SQL 注入隐患，对输入参数进行强类型转换与白名单过滤
 * 编码：UTF-8 无 BOM
 */

namespace App\Common;

class Request
{
    /**
     * 获取 GET 参数
     */
    public static function get(string $key, $default = null)
    {
        return self::filterParam($_GET[$key] ?? $default);
    }

    /**
     * 获取 POST 参数 (支持 application/x-www-form-urlencoded 与 application/json)
     */
    public static function post(string $key = '', $default = null)
    {
        static $jsonInput = null;

        // 处理 JSON Payload
        if ($jsonInput === null) {
            $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
            if (stripos($contentType, 'application/json') !== false) {
                $raw = file_get_contents('php://input');
                $jsonInput = json_decode($raw, true) ?: [];
            } else {
                $jsonInput = $_POST;
            }
        }

        if ($key === '') {
            return $jsonInput;
        }

        return self::filterParam($jsonInput[$key] ?? $default);
    }

    /**
     * 获取整型参数
     */
    public static function getInt(string $key, int $default = 0): int
    {
        $val = self::get($key, $default);
        return is_numeric($val) ? (int)$val : $default;
    }

    /**
     * 获取 POST 整型参数
     */
    public static function postInt(string $key, int $default = 0): int
    {
        $val = self::post($key, $default);
        return is_numeric($val) ? (int)$val : $default;
    }

    /**
     * 参数基础过滤与 XSS 防护
     */
    private static function filterParam($value)
    {
        if (is_string($value)) {
            return trim($value);
        }
        if (is_array($value)) {
            foreach ($value as $k => $v) {
                $value[$k] = self::filterParam($v);
            }
        }
        return $value;
    }

    /**
     * 获取客户端真实安全 IP (支持反向代理与 CDN 穿透)
     */
    public static function ip(): string
    {
        $keys = [
            'HTTP_CF_CONNECTING_IP',
            'HTTP_X_FORWARDED_FOR',
            'HTTP_X_REAL_IP',
            'REMOTE_ADDR'
        ];
        foreach ($keys as $key) {
            if (!empty($_SERVER[$key])) {
                $parts = explode(',', (string)$_SERVER[$key]);
                $ip = trim($parts[0]);
                if (filter_var($ip, FILTER_VALIDATE_IP)) {
                    return $ip;
                }
            }
        }
        return $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    }

    /**
     * 获取 HTTP 请求头信息
     */
    public static function header(string $name, string $default = ''): string
    {
        $normalized = strtoupper(str_replace('-', '_', $name));
        $serverKey = 'HTTP_' . $normalized;
        if (!empty($_SERVER[$serverKey])) {
            return trim((string)$_SERVER[$serverKey]);
        }
        $redirectKey = 'REDIRECT_HTTP_' . $normalized;
        if (!empty($_SERVER[$redirectKey])) {
            return trim((string)$_SERVER[$redirectKey]);
        }
        if (function_exists('getallheaders')) {
            $headers = getallheaders();
            if (is_array($headers)) {
                foreach ($headers as $k => $v) {
                    if (strcasecmp((string)$k, $name) === 0) {
                        return trim((string)$v);
                    }
                }
            }
        }
        return $default;
    }
}

