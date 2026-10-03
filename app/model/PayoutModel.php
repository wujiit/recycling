<?php
/**
 * 资金打款流水模型
 * 负责打款流水的记录、状态追踪与查询
 */

namespace App\Model;

class PayoutModel
{
    private $db;
    private $p;

    public function __construct()
    {
        $this->db = Database::getInstance();
        $this->p = $this->db->getPrefix();
    }

    /**
     * 校验该订单是否已有正在处理或已成功的打款单，杜绝重复打款
     */
    public function hasActivePayout(int $orderId): bool
    {
        $sql = "SELECT `id` FROM `{$this->p}rc_payout_log` 
                WHERE `order_id` = ? AND `status` IN ('processing', 'success') LIMIT 1";
        return $this->db->fetchOne($sql, [$orderId]) !== null;
    }

    /**
     * 创建打款流水记录
     */
    public function createLog(array $data): int
    {
        $sql = "INSERT INTO `{$this->p}rc_payout_log` 
                (`order_id`, `out_bill_no`, `channel`, `amount`, `status`, `transaction_id`, `err_msg`, `created_at`) 
                VALUES (?, ?, ?, ?, 'processing', '', '', ?)";
        $this->db->execute($sql, [
            $data['order_id'],
            $data['out_bill_no'],
            $data['channel'] ?? 'wechat',
            $data['amount'],
            time()
        ]);
        return (int)$this->db->lastInsertId();
    }

    /**
     * 更新打款结果
     */
    public function updateResult(string $outBillNo, string $status, string $transactionId = '', string $errMsg = ''): bool
    {
        $sql = "UPDATE `{$this->p}rc_payout_log` 
                SET `status` = ?, `transaction_id` = ?, `err_msg` = ? 
                WHERE `out_bill_no` = ?";
        return $this->db->execute($sql, [$status, $transactionId, $errMsg, $outBillNo]) > 0;
    }

    /**
     * 更新流水号 (用于候选探测自适应变更流水号场景)
     */
    public function updateOutBillNo(string $oldBillNo, string $newBillNo): bool
    {
        $sql = "UPDATE `{$this->p}rc_payout_log` SET `out_bill_no` = ? WHERE `out_bill_no` = ?";
        return $this->db->execute($sql, [$newBillNo, $oldBillNo]) > 0;
    }

    /**
     * 根据订单 ID 获取最新打款流水
     */
    public function getByOrderId(int $orderId): ?array
    {
        $sql = "SELECT * FROM `{$this->p}rc_payout_log` WHERE `order_id` = ? ORDER BY `id` DESC LIMIT 1";
        return $this->db->fetchOne($sql, [$orderId]);
    }
}
