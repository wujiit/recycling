<?php
/**
 * 启灵回收系统 - 控制器基类
 * 提供标准 JSON 响应输出封装
 */

namespace App\Controller;

use App\Common\Response;

abstract class Controller
{
    /**
     * 快捷成功响应
     */
    protected function success($data = null, string $msg = '操作成功', int $code = 200): void
    {
        Response::success($data, $msg, $code);
    }

    /**
     * 快捷错误响应
     */
    protected function error(string $msg = '操作失败', int $code = 400, $data = null): void
    {
        Response::error($msg, $code, $data);
    }
}
