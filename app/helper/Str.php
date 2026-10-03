<?php
/**
 * 启灵回收系统 - 多字节字符串处理工具
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
}
