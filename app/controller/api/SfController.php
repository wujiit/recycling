<?php
/**
 * 启灵回收系统 - 顺丰速运开放平台服务端异步回调推送控制器
 * 处理运费推送 (EXP_RECE_WAYBILLS_FEE_PUSH) 与路由推送
 */

declare(strict_types=1);

namespace App\Controller\Api;

use App\Controller\Controller;
use App\Service\SfExpressService;

class SfController extends Controller
{
    /** @var SfExpressService */
    private $sfService;

    public function __construct()
    {
        $this->sfService = new SfExpressService();
    }

    /**
     * 清单运费推送接口 (EXP_RECE_WAYBILLS_FEE_PUSH) 接收处理动作
     * 1. 顺丰开放平台控制台【网络测试】秒级绿灯连通应答
     * 2. 顺丰快递员揽件称重后自动接收实际运费与重量明细，安全记录并对齐至本地回收订单
     */
    public function feePush(): void
    {
        // 允许跨域预检与安全标头
        if (!headers_sent()) {
            header('Content-Type: application/json; charset=utf-8');
            header('X-Content-Type-Options: nosniff');
        }

        // 提取原始请求体及 POST/GET 参数
        $rawBody = (string)file_get_contents('php://input');
        $params = $_POST;

        // 若 $_POST 为空，尝试解析 JSON 请求体
        if (empty($params) && !empty($rawBody)) {
            $jsonParsed = json_decode($rawBody, true);
            if (is_array($jsonParsed)) {
                $params = $jsonParsed;
            }
        }

        // 若顺丰以 Query 形式探测（如健康检查）
        if (empty($params) && !empty($_GET)) {
            $params = $_GET;
        }

        try {
            $result = $this->sfService->handleWaybillsFeePush($params, $rawBody);
            http_response_code(200);
            echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            exit;
        } catch (\Throwable $e) {
            $this->sfService->logInfo('顺丰运费推送控制器捕获异常', [
                'error' => $e->getMessage()
            ]);
            http_response_code(200);
            echo json_encode([
                'code'        => 200,
                'partnerCode' => $params['partnerID'] ?? ($params['partnerCode'] ?? 'SF_PARTNER'),
                'service'     => 'EXP_RECE_WAYBILLS_FEE_PUSH',
                'message'     => 'success',
                'msgData'     => ''
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            exit;
        }
    }

    /**
     * 路由推送接口 (RoutePushService - 速运类API) 接收处理动作
     * 1. 顺丰开放平台控制台【网络测试】秒级绿灯连通应答
     * 2. 顺丰主动推送增量物流路由信息，系统自动解析并推进回收订单流转状态 (如揽收、运输中、已签收待质检)
     * 官方标准回执：{"return_code": "0000", "return_msg": "成功"}
     */
    public function routePush(): void
    {
        if (!headers_sent()) {
            header('Content-Type: application/json; charset=utf-8');
            header('X-Content-Type-Options: nosniff');
        }

        $rawBody = (string)file_get_contents('php://input');
        $params = $_POST;

        if (empty($params) && !empty($rawBody)) {
            $jsonParsed = json_decode($rawBody, true);
            if (is_array($jsonParsed)) {
                $params = $jsonParsed;
            }
        }

        if (empty($params) && !empty($_GET)) {
            $params = $_GET;
        }

        try {
            $result = $this->sfService->handleRoutePush($params, $rawBody);
            http_response_code(200);
            echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            exit;
        } catch (\Throwable $e) {
            $this->sfService->logInfo('顺丰路由推送控制器捕获异常', [
                'error' => $e->getMessage()
            ]);
            http_response_code(200);
            echo json_encode([
                'return_code' => '0000',
                'return_msg'  => '成功'
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            exit;
        }
    }

    /**
     * 订单状态推送接口 (PushOrderState - 速运类API) 接收处理动作
     * 1. 顺丰开放平台控制台【网络测试】秒级绿灯连通应答
     * 2. 顺丰主动推送预约上门订单调度状态 (如收派员接单、工号电话、取件完成)
     * 官方标准回执：{"success": "true", "code": "0", "msg": ""}
     */
    public function orderStatePush(): void
    {
        if (!headers_sent()) {
            header('Content-Type: application/json; charset=utf-8');
            header('X-Content-Type-Options: nosniff');
        }

        $rawBody = (string)file_get_contents('php://input');
        $params = $_POST;

        if (empty($params) && !empty($rawBody)) {
            $jsonParsed = json_decode($rawBody, true);
            if (is_array($jsonParsed)) {
                $params = $jsonParsed;
            }
        }

        if (empty($params) && !empty($_GET)) {
            $params = $_GET;
        }

        try {
            $result = $this->sfService->handleOrderStatePush($params, $rawBody);
            http_response_code(200);
            echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            exit;
        } catch (\Throwable $e) {
            $this->sfService->logInfo('顺丰订单状态推送控制器捕获异常', [
                'error' => $e->getMessage()
            ]);
            http_response_code(200);
            echo json_encode([
                'success' => 'true',
                'code'    => '0',
                'msg'     => ''
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            exit;
        }
    }
}
