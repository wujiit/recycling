<?php
/**
 * 质检报告数据模型
 * 负责质检报告的保存、查询与差价明细处理
 */

namespace App\Model;

class InspectionModel
{
    private $db;
    private $p;

    public function __construct()
    {
        $this->db = Database::getInstance();
        $this->p = $this->db->getPrefix();
    }

    /**
     * 保存或更新质检报告
     */
    public function saveReport(array $data): bool
    {
        $sql = "INSERT INTO `{$this->p}rc_order_inspection` (
                    `order_id`, `inspector_id`, `imei`, `real_photos`, `diff_items`, `inspection_price`, `inspector_remark`, `created_at`
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    `inspector_id` = VALUES(`inspector_id`),
                    `imei` = VALUES(`imei`),
                    `real_photos` = VALUES(`real_photos`),
                    `diff_items` = VALUES(`diff_items`),
                    `inspection_price` = VALUES(`inspection_price`),
                    `inspector_remark` = VALUES(`inspector_remark`)";

        try {
            $this->db->execute($sql, [
                $data['order_id'],
                $data['inspector_id'] ?? 1,
                $data['imei'] ?? '',
                is_array($data['real_photos']) ? json_encode($data['real_photos'], JSON_UNESCAPED_UNICODE) : ($data['real_photos'] ?? '[]'),
                is_array($data['diff_items']) ? json_encode($data['diff_items'], JSON_UNESCAPED_UNICODE) : ($data['diff_items'] ?? '[]'),
                $data['inspection_price'] ?? 0.00,
                $data['inspector_remark'] ?? '',
                time()
            ]);
            return true;
        } catch (\Throwable $e) {
            return false;
        }
    }

    /**
     * 根据订单 ID 获取质检报告
     */
    public function getByOrderId(int $orderId): ?array
    {
        $sql = "SELECT * FROM `{$this->p}rc_order_inspection` WHERE `order_id` = ? LIMIT 1";
        $report = $this->db->fetchOne($sql, [$orderId]);
        if (!$report) {
            return null;
        }

        // 解析 JSON 数据
        $report['real_photos'] = json_decode($report['real_photos'] ?: '[]', true);
        $report['diff_items'] = json_decode($report['diff_items'] ?: '[]', true);

        return $report;
    }
}
