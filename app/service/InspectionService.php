<?php
/**
 * 启灵独立回收系统 - 质检工作台服务
 * 职责：验机复核比对、差异项高亮提取、生成专业质检报告、触发差价协商
 * 编码：UTF-8 无 BOM
 */

namespace App\Service;

use App\Model\OrderModel;
use App\Model\InspectionModel;
use App\Model\QuestionModel;

class InspectionService
{
    private $orderModel;
    private $inspectionModel;
    private $pricingService;
    private $questionModel;

    public function __construct()
    {
        $this->orderModel = new OrderModel();
        $this->inspectionModel = new InspectionModel();
        $this->pricingService = new PricingService();
        $this->questionModel = new QuestionModel();
    }

    /**
     * 质检员提交验机复核结果
     */
    public function submitInspection(int $orderId, int $inspectorId, string $imei, array $realPhotos, array $actualItemIds, string $remark, float $manualPrice = 0.0): array
    {
        $order = $this->orderModel->findById($orderId);
        if (!$order) {
            return ['code' => 404, 'msg' => '订单不存在'];
        }

        $deviceId = (int)$order['device_id'];
        $estimatePrice = (float)$order['estimate_price'];

        if ($manualPrice > 0) {
            $inspectionPrice = round($manualPrice, 2);
            $diffItems = [];
        } else {
            // 重新依质检实际项计算价格
            $calcRes = $this->pricingService->calculateEstimatePrice($deviceId, $actualItemIds);
            if ($calcRes['code'] !== 200) {
                return $calcRes;
            }

            $inspectionPrice = (float)$calcRes['data']['estimate_price'];
            $actualItems = $calcRes['data']['breakdown'];

            // 提取与用户初评的差异明细
            $diffItems = $this->extractDifferences($order['details'] ?? [], $actualItems);
        }

        // 保存质检报告
        $saved = $this->inspectionModel->saveReport([
            'order_id'         => $orderId,
            'inspector_id'     => $inspectorId,
            'imei'             => trim($imei),
            'real_photos'      => $realPhotos,
            'diff_items'       => $diffItems,
            'inspection_price' => $inspectionPrice,
            'inspector_remark' => trim($remark)
        ]);

        if (!$saved) {
            return ['code' => 500, 'msg' => '质检报告保存失败'];
        }

        // 状态流转判断：若质检价与初评价完全一致，直接进入成交放款；若存在差价，进入差价协商中
        $isMatched = abs($inspectionPrice - $estimatePrice) < 0.01;
        $newStatus = $isMatched ? 'completed' : 'price_confirming';

        $this->orderModel->updateStatus($orderId, $newStatus, [
            'final_price' => $inspectionPrice
        ]);

        return [
            'code' => 200,
            'msg'  => $isMatched ? '质检完成，成色一致，可直接打款' : '质检完成，已生成差异报告等待客户确认',
            'data' => [
                'order_id'         => $orderId,
                'estimate_price'   => $estimatePrice,
                'inspection_price' => $inspectionPrice,
                'diff_count'       => count($diffItems),
                'status'           => $newStatus
            ]
        ];
    }

    /**
     * 比对初评快照与实检项，提取出差异项 (初评 vs 实测)
     */
    private function extractDifferences(array $initialDetails, array $actualItems): array
    {
        $initialMap = [];
        foreach ($initialDetails as $init) {
            $qid = (int)$init['question_id'];
            $initialMap[$qid] = $init['item_name'];
        }

        $diffs = [];
        foreach ($actualItems as $act) {
            $qid = (int)$act['question_id'];
            $initName = $initialMap[$qid] ?? '未选';
            $actName = $act['name'];

            if ($initName !== $actName) {
                $diffs[] = [
                    'question_title' => $act['question_title'],
                    'initial_choice' => $initName,
                    'actual_choice'  => $actName,
                    'deduct_amount'  => $act['deduct_amount']
                ];
            }
        }
        return $diffs;
    }
}
