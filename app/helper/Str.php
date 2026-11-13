<?php
/**
 * 启灵同城服务系统 - 多字节字符串处理工具
 * 统一采用 mb_* 系列函数处理中文字符
 */

namespace App\Helper;

class Str
{
    /**
     * 安全中文字符截取
     */
    public static function substr(string $string, int $start, ?int $length = null, string $encoding = 'UTF-8'): string
    {
        return mb_substr($string, $start, $length, $encoding);
    }

    /**
     * 获取中文字符串长度
     */
    public static function length(string $string, string $encoding = 'UTF-8'): int
    {
        return mb_strlen($string, $encoding);
    }

    /**
     * 生成高安全随机字符串
     */
    public static function random(int $length = 16): string
    {
        return bin2hex(random_bytes((int)ceil($length / 2)));
    }

    /**
     * 生成唯一业务单号（如回收订单号、打款流水号）
     */
    public static function generateSn(string $prefix = 'RC'): string
    {
        return $prefix . date('YmdHis') . str_pad((string)random_int(1000, 9999), 4, '0', STR_PAD_LEFT);
    }

    /**
     * 姓名/联系人敏感脱敏 (张三 => 张*, 诸葛孔明 => 诸**明)
     */
    public static function maskName(string $name): string
    {
        $name = trim($name);
        $len = mb_strlen($name, 'UTF-8');
        if ($len <= 0) {
            return '';
        }
        if ($len === 1) {
            return '*';
        }
        if ($len === 2) {
            return mb_substr($name, 0, 1, 'UTF-8') . '*';
        }
        return mb_substr($name, 0, 1, 'UTF-8') . str_repeat('*', $len - 2) . mb_substr($name, -1, 1, 'UTF-8');
    }

    /**
     * 手机号码脱敏 (13812345678 => 138****5678)
     */
    public static function maskMobile(string $mobile): string
    {
        $mobile = trim($mobile);
        if (preg_match('/^1[3-9]\d{9}$/', $mobile)) {
            return substr($mobile, 0, 3) . '****' . substr($mobile, 7);
        }
        $len = strlen($mobile);
        if ($len <= 4) {
            return str_repeat('*', $len);
        }
        return substr($mobile, 0, 2) . '****' . substr($mobile, -2);
    }

    /**
     * 结算账号脱敏 (银行卡保留前后4位，邮箱/手机号针对性脱敏)
     */
    public static function maskAccount(string $account): string
    {
        $account = trim($account);
        if (empty($account)) {
            return '';
        }
        // 邮箱格式 (如 user@gmail.com => u***r@gmail.com)
        if (filter_var($account, FILTER_VALIDATE_EMAIL)) {
            [$prefix, $domain] = explode('@', $account, 2);
            $pLen = strlen($prefix);
            if ($pLen <= 2) {
                $maskedPrefix = substr($prefix, 0, 1) . '***';
            } else {
                $maskedPrefix = substr($prefix, 0, 1) . '***' . substr($prefix, -1);
            }
            return $maskedPrefix . '@' . $domain;
        }
        // 11 位手机号格式 (支付宝常用)
        if (preg_match('/^1[3-9]\d{9}$/', $account)) {
            return substr($account, 0, 3) . '****' . substr($account, 7);
        }
        // 银行卡/大额账号格式 (>= 12 位纯数字或字母)
        $len = strlen($account);
        if ($len >= 12) {
            return substr($account, 0, 4) . '******' . substr($account, -4);
        }
        if ($len > 4) {
            return substr($account, 0, 2) . '****' . substr($account, -2);
        }
        return '****';
    }

    /**
     * 地址敏感信息脱敏 (保留前段省市区，遮蔽后段具体门牌小区)
     */
    public static function maskAddress(string $address): string
    {
        $address = trim($address);
        $len = mb_strlen($address, 'UTF-8');
        if ($len <= 6) {
            return $address;
        }
        // 保留前 6~8 个字 (省市区县)，其余替换为 ******
        $keep = min(8, (int)floor($len * 0.4));
        return mb_substr($address, 0, $keep, 'UTF-8') . '******';
    }
}
