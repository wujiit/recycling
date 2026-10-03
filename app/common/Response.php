<?php
/**
 * 统一 API JSON 响应封装
 * 输出统一结构 {"code", "msg", "data"} 并设置 JSON 响应头
 */

namespace App\Common;

class Response
{
    /**
     * 成功响应
     *
     * @param mixed $data 业务数据
     * @param string $msg 友好提示语
     * @param int $code 业务状态码
     */
    public static function success($data = null, string $msg = '操作成功', int $code = 200): void
    {
        self::json($code, $msg, $data);
    }

    /**
     * 失败响应
     *
     * @param string $msg 错误提示信息
     * @param int $code 错误状态码
     * @param mixed $data 附加数据
     */
    public static function error(string $msg = '操作失败', int $code = 400, $data = null): void
    {
        self::json($code, $msg, $data);
    }

    /**
     * 底层通用 JSON 输出方法
     *
     * @param int $code 状态码
     * @param string $msg 提示消息
     * @param mixed $data 数据载体
     * @param int $httpStatus HTTP 状态码
     */
    public static function json(int $code, string $msg, $data = null, int $httpStatus = 200): void
    {
        if (!headers_sent()) {
            http_response_code($httpStatus);
            header('Content-Type: application/json; charset=utf-8');
            header('X-Content-Type-Options: nosniff');
        }

        $payload = [
            'code' => $code,
            'msg'  => $msg,
            'data' => $data ?? new \stdClass()
        ];

        echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
}
