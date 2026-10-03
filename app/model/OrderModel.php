<?php
/**
 * 订单数据模型
 * 负责回收订单的创建、状态流转、详情管理与查询
 */

namespace App\Model;

class OrderModel
{
    private $db;
    private $p;
    private static $columnsChecked = false;

    public function __construct()
    {
        $this->db = Database::getInstance();
        $this->p = $this->db->getPrefix();
        $this->ensureColumns();
    }

    /**
     * 自动检测并动态补齐收款渠道关键字段 (自愈式向下兼容)
     */
    private function ensureColumns(): void
    {
        if (self::$columnsChecked) {
            return;
        }
        $cache = \App\Service\CacheService::getInstance();
        if ($cache->get('schema_ensured:order_v1')) {
            self::$columnsChecked = true;
            return;
        }
        self::$columnsChecked = true;

        try {
            $cols = $this->db->fetchAll("SHOW COLUMNS FROM `{$this->p}rc_order` LIKE 'payout_account'");
            if (empty($cols)) {
                @$this->db->execute("ALTER TABLE `{$this->p}rc_order` ADD COLUMN `payout_name` varchar(64) NOT NULL DEFAULT '' COMMENT '客户收款人实名' AFTER `payout_type`");
                @$this->db->execute("ALTER TABLE `{$this->p}rc_order` ADD COLUMN `payout_account` varchar(128) NOT NULL DEFAULT '' COMMENT '客户收款账号' AFTER `payout_name`");
                @$this->db->execute("ALTER TABLE `{$this->p}rc_order` ADD COLUMN `payout_bank` varchar(128) NOT NULL DEFAULT '' COMMENT '收款开户银行' AFTER `payout_account`");
            }
            $negoCols = $this->db->fetchAll("SHOW COLUMNS FROM `{$this->p}rc_order` LIKE 'subsidy_amount'");
            if (empty($negoCols)) {
                @$this->db->execute("ALTER TABLE `{$this->p}rc_order` ADD COLUMN `subsidy_amount` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT '客服协商补贴金额' AFTER `final_price`");
                @$this->db->execute("ALTER TABLE `{$this->p}rc_order` ADD COLUMN `negotiation_remark` varchar(255) NOT NULL DEFAULT '' COMMENT '客服协商留言' AFTER `subsidy_amount`");
                @$this->db->execute("ALTER TABLE `{$this->p}rc_order` ADD COLUMN `negotiation_status` varchar(32) NOT NULL DEFAULT 'none' COMMENT '协商状态: none, pending, accepted, rejected' AFTER `negotiation_remark`");
                @$this->db->execute("ALTER TABLE `{$this->p}rc_order` ADD COLUMN `appraisal_mode` varchar(32) NOT NULL DEFAULT 'custom' COMMENT '估价模式: quick, custom' AFTER `negotiation_status`");
                @$this->db->execute("ALTER TABLE `{$this->p}rc_order` ADD COLUMN `quick_tier_name` varchar(64) NOT NULL DEFAULT '' COMMENT '极速成色档位' AFTER `appraisal_mode`");
            }
            $storeCols = $this->db->fetchAll("SHOW COLUMNS FROM `{$this->p}rc_order` LIKE 'store_id'");
            if (empty($storeCols)) {
                @$this->db->execute("ALTER TABLE `{$this->p}rc_order` ADD COLUMN `store_id` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '自提/到店回收门店ID' AFTER `fulfillment_type`");
                @$this->db->execute("ALTER TABLE `{$this->p}rc_order` ADD COLUMN `store_name` varchar(128) NOT NULL DEFAULT '' COMMENT '所选门店名称' AFTER `store_id`");
            }
            $mailSubCols = $this->db->fetchAll("SHOW COLUMNS FROM `{$this->p}rc_order` LIKE 'mail_sub_type'");
            if (empty($mailSubCols)) {
                @$this->db->execute("ALTER TABLE `{$this->p}rc_order` ADD COLUMN `mail_sub_type` varchar(32) NOT NULL DEFAULT '' COMMENT '邮寄子模式: sf_pickup-顺丰上门取件, self_delivery-自行寄送' AFTER `fulfillment_type`");
            }
            $sfCols = $this->db->fetchAll("SHOW COLUMNS FROM `{$this->p}rc_order` LIKE 'shipping_fee'");
            if (empty($sfCols)) {
                @$this->db->execute("ALTER TABLE `{$this->p}rc_order` ADD COLUMN `shipping_fee` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '顺丰速运实扣运费金额' AFTER `refund_express_sn`");
                @$this->db->execute("ALTER TABLE `{$this->p}rc_order` ADD COLUMN `shipping_weight` decimal(8,2) NOT NULL DEFAULT '0.00' COMMENT '顺丰计费重量(kg)' AFTER `shipping_fee`");
                @$this->db->execute("ALTER TABLE `{$this->p}rc_order` ADD COLUMN `shipping_real_weight` decimal(8,2) NOT NULL DEFAULT '0.00' COMMENT '顺丰实际重量(kg)' AFTER `shipping_weight`");
                @$this->db->execute("ALTER TABLE `{$this->p}rc_order` ADD COLUMN `shipping_fee_detail` text NULL COMMENT '顺丰运费明细JSON快照' AFTER `shipping_real_weight`");
            }
            $routeCols = $this->db->fetchAll("SHOW COLUMNS FROM `{$this->p}rc_order` LIKE 'shipping_routes'");
            if (empty($routeCols)) {
                @$this->db->execute("ALTER TABLE `{$this->p}rc_order` ADD COLUMN `shipping_routes` longtext NULL COMMENT '顺丰速运物流路由轨迹节点列表JSON快照' AFTER `shipping_fee_detail`");
            }
            $courierCols = $this->db->fetchAll("SHOW COLUMNS FROM `{$this->p}rc_order` LIKE 'shipping_courier_phone'");
            if (empty($courierCols)) {
                @$this->db->execute("ALTER TABLE `{$this->p}rc_order` ADD COLUMN `shipping_courier_phone` varchar(32) NOT NULL DEFAULT '' COMMENT '顺丰取件收派员联系手机号' AFTER `shipping_routes`");
                @$this->db->execute("ALTER TABLE `{$this->p}rc_order` ADD COLUMN `shipping_courier_name` varchar(64) NOT NULL DEFAULT '' COMMENT '顺丰取件收派员工号/姓名' AFTER `shipping_courier_phone`");
                @$this->db->execute("ALTER TABLE `{$this->p}rc_order` ADD COLUMN `shipping_dispatch_status` varchar(128) NOT NULL DEFAULT '' COMMENT '顺丰订单调度最新状态描述' AFTER `shipping_courier_name`");
            }

            $auditCols = $this->db->fetchAll("SHOW COLUMNS FROM `{$this->p}rc_order` LIKE 'payout_audit_status'");
            if (empty($auditCols)) {
                @$this->db->execute("ALTER TABLE `{$this->p}rc_order` ADD COLUMN `payout_audit_status` varchar(32) NOT NULL DEFAULT 'none' COMMENT '大额打款审核状态: none-常规免审, approved-已终审通过' AFTER `payout_bank`");
                @$this->db->execute("ALTER TABLE `{$this->p}rc_order` ADD COLUMN `payout_audit_remark` varchar(255) NOT NULL DEFAULT '' COMMENT '大额审批备注' AFTER `payout_audit_status`");
                @$this->db->execute("ALTER TABLE `{$this->p}rc_order` ADD COLUMN `payout_audit_time` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '大额审批时间' AFTER `payout_audit_remark`");
                @$this->db->execute("ALTER TABLE `{$this->p}rc_order` ADD COLUMN `payout_audit_admin_id` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '审批管理员ID' AFTER `payout_audit_time`");
            }

            // 自动检测并补齐高频查询关键索引 (消除全表扫描，提速 10~50 倍)
            $existingIndexes = $this->db->fetchAll("SHOW INDEX FROM `{$this->p}rc_order`");
            $indexNames = array_column($existingIndexes, 'Key_name');
            if (!in_array('idx_contact_mobile', $indexNames, true)) {
                @$this->db->execute("ALTER TABLE `{$this->p}rc_order` ADD INDEX `idx_contact_mobile` (`contact_mobile`)");
            }
            if (!in_array('idx_express_sn', $indexNames, true)) {
                @$this->db->execute("ALTER TABLE `{$this->p}rc_order` ADD INDEX `idx_express_sn` (`express_sn`)");
            }
            if (!in_array('idx_user_status', $indexNames, true)) {
                @$this->db->execute("ALTER TABLE `{$this->p}rc_order` ADD INDEX `idx_user_status` (`user_id`, `status`)");
            }
            if (!in_array('idx_created_at', $indexNames, true)) {
                @$this->db->execute("ALTER TABLE `{$this->p}rc_order` ADD INDEX `idx_created_at` (`created_at`)");
            }

            $cache->set('schema_ensured:order_v1', 1, 86400 * 30);
        } catch (\Throwable $e) {
            // 静默容灾
        }
    }

    /**
     * 创建回收订单 (带初评快照与事务原子性保护)
     */
    public function createOrderWithSnapshot(array $orderData, array $snapshotItems): ?string
    {
        $this->db->beginTransaction();
        try {
            $now = time();
            $payoutType = !empty($orderData['payout_type']) ? (string)$orderData['payout_type'] : 'alipay';
            $payoutName = !empty($orderData['payout_name']) ? (string)$orderData['payout_name'] : '';
            $payoutAccount = !empty($orderData['payout_account']) ? (string)$orderData['payout_account'] : '';
            $payoutBank = !empty($orderData['payout_bank']) ? (string)$orderData['payout_bank'] : '';

            $storeId = (int)($orderData['store_id'] ?? 0);
            $storeName = trim((string)($orderData['store_name'] ?? ''));

            $userRemark = $orderData['user_remark'] ?? '';
            // 若包含收款账号信息，格式化追加至备注中双重保障
            if (!empty($payoutAccount)) {
                $typeLabels = ['alipay' => '支付宝', 'bank' => '银行卡', 'wechat' => '微信零钱', 'cash' => '现金结清'];
                $label = $typeLabels[$payoutType] ?? $payoutType;
                $payoutNote = sprintf("【收款方式: %s】姓名: %s | 账号: %s%s", $label, $payoutName ?: '-', $payoutAccount, $payoutBank ? " | 开户行: {$payoutBank}" : "");
                $userRemark = trim($userRemark . ' ' . $payoutNote);
            } elseif ($payoutType === 'cash') {
                $userRemark = trim($userRemark . ' 【收款方式: 现场现金结清】');
            }

            $appraisalMode = !empty($orderData['appraisal_mode']) ? (string)$orderData['appraisal_mode'] : 'custom';
            $quickTierName = !empty($orderData['quick_tier_name']) ? (string)$orderData['quick_tier_name'] : '';

            $mailSubType = !empty($orderData['mail_sub_type']) ? (string)$orderData['mail_sub_type'] : '';
            $couponId = (int)($orderData['coupon_id'] ?? 0);
            $userCouponId = (int)($orderData['user_coupon_id'] ?? 0);
            $couponAddPrice = (float)($orderData['coupon_add_price'] ?? 0.00);

            $orderSql = "INSERT INTO `{$this->p}rc_order` (
                `order_sn`, `user_id`, `device_id`, `device_name`, `estimate_price`, `final_price`,
                `coupon_id`, `user_coupon_id`, `coupon_add_price`,
                `fulfillment_type`, `mail_sub_type`, `store_id`, `store_name`, `payout_type`, `payout_name`, `payout_account`, `payout_bank`,
                `appraisal_mode`, `quick_tier_name`,
                `status`, `contact_name`, `contact_mobile`, `contact_address`,
                `appointment_time`, `user_remark`, `created_at`, `updated_at`
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_send', ?, ?, ?, ?, ?, ?, ?)";

            $this->db->execute($orderSql, [
                $orderData['order_sn'],
                $orderData['user_id'],
                $orderData['device_id'],
                $orderData['device_name'],
                $orderData['estimate_price'],
                $orderData['estimate_price'], // 初评成交价默认与预估相同
                $couponId,
                $userCouponId,
                $couponAddPrice,
                $orderData['fulfillment_type'],
                $mailSubType,
                $storeId,
                $storeName,
                $payoutType,
                $payoutName,
                $payoutAccount,
                $payoutBank,
                $appraisalMode,
                $quickTierName,
                $orderData['contact_name'],
                $orderData['contact_mobile'],
                $orderData['contact_address'] ?? '',
                $orderData['appointment_time'] ?? '',
                $userRemark,
                $now,
                $now
            ]);

            $orderId = (int)$this->db->lastInsertId();

            // 批量插入初评选项快照
            if (!empty($snapshotItems)) {
                $rows = [];
                $params = [];
                foreach ($snapshotItems as $item) {
                    $rows[] = "(?, ?, ?, ?, ?, ?)";
                    $params[] = $orderId;
                    $params[] = $item['question_id'] ?? 0;
                    $params[] = $item['question_title'] ?? '';
                    $params[] = $item['id'] ?? 0;
                    $params[] = $item['name'] ?? '';
                    $params[] = $item['deduct_amount'] ?? 0.00;
                }
                $detailSql = "INSERT INTO `{$this->p}rc_order_detail` 
                              (`order_id`, `question_id`, `question_title`, `item_id`, `item_name`, `deduct_amount`) 
                              VALUES " . implode(', ', $rows);
                $this->db->execute($detailSql, $params);
            }

            $this->db->commit();
            return $orderData['order_sn'];
        } catch (\Throwable $e) {
            $this->db->rollBack();
            return null;
        }
    }

    /**
     * 根据业务单号查找订单详情 (包含初评快照)
     */
    public function findBySn(string $orderSn): ?array
    {
        $sql = "SELECT * FROM `{$this->p}rc_order` WHERE `order_sn` = ? LIMIT 1";
        $order = $this->db->fetchOne($sql, [$orderSn]);
        if (!$order) {
            return null;
        }

        // 获取快照项
        $detailSql = "SELECT * FROM `{$this->p}rc_order_detail` WHERE `order_id` = ?";
        $order['details'] = $this->db->fetchAll($detailSql, [$order['id']]);

        return $order;
    }

    /**
     * 根据主键 ID 查找订单
     */
    public function findById(int $id): ?array
    {
        $sql = "SELECT * FROM `{$this->p}rc_order` WHERE `id` = ? LIMIT 1";
        $order = $this->db->fetchOne($sql, [$id]);
        if (!$order) {
            return null;
        }
        $detailSql = "SELECT * FROM `{$this->p}rc_order_detail` WHERE `order_id` = ?";
        $order['details'] = $this->db->fetchAll($detailSql, [$id]);
        return $order;
    }

    /**
     * 更新订单状态与物流信息
     */
    public function updateStatus(int $id, string $status, array $extra = []): bool
    {
        $fields = ["`status` = ?", "`updated_at` = ?"];
        $params = [$status, time()];

        if (isset($extra['express_sn'])) {
            $fields[] = "`express_sn` = ?";
            $params[] = $extra['express_sn'];
        }
        if (isset($extra['express_company'])) {
            $fields[] = "`express_company` = ?";
            $params[] = $extra['express_company'];
        }
        if (isset($extra['final_price'])) {
            $fields[] = "`final_price` = ?";
            $params[] = $extra['final_price'];
        }
        if (isset($extra['refund_express_sn'])) {
            $fields[] = "`refund_express_sn` = ?";
            $params[] = $extra['refund_express_sn'];
        }
        if (isset($extra['payout_type'])) {
            $fields[] = "`payout_type` = ?";
            $params[] = $extra['payout_type'];
        }
        if (isset($extra['payout_name'])) {
            $fields[] = "`payout_name` = ?";
            $params[] = $extra['payout_name'];
        }
        if (isset($extra['payout_account'])) {
            $fields[] = "`payout_account` = ?";
            $params[] = $extra['payout_account'];
        }
        if (isset($extra['payout_bank'])) {
            $fields[] = "`payout_bank` = ?";
            $params[] = $extra['payout_bank'];
        }
        if (isset($extra['user_remark'])) {
            $fields[] = "`user_remark` = ?";
            $params[] = $extra['user_remark'];
        }
        if (isset($extra['subsidy_amount'])) {
            $fields[] = "`subsidy_amount` = ?";
            $params[] = $extra['subsidy_amount'];
        }
        if (isset($extra['negotiation_remark'])) {
            $fields[] = "`negotiation_remark` = ?";
            $params[] = $extra['negotiation_remark'];
        }
        if (isset($extra['negotiation_status'])) {
            $fields[] = "`negotiation_status` = ?";
            $params[] = $extra['negotiation_status'];
        }

        $params[] = $id;
        $sql = "UPDATE `{$this->p}rc_order` SET " . implode(', ', $fields) . " WHERE `id` = ?";
        $affected = $this->db->execute($sql, $params);
        if ($affected > 0) {
            // 联动加价券生命周期
            if (in_array($status, ['cancelled', 'refunded'], true)) {
                try {
                    (new \App\Model\CouponModel())->releaseCoupon($id);
                } catch (\Throwable $e) {}
            } elseif ($status === 'completed') {
                try {
                    (new \App\Model\CouponModel())->settleCoupon($id);
                } catch (\Throwable $e) {}
            }
            return true;
        }
        return false;
    }

    /**
     * 客服发起差价在线协商还价与专享补贴
     */
    public function proposeNegotiation(int $orderId, float $subsidyAmount, string $remark): bool
    {
        $sql = "UPDATE `{$this->p}rc_order` 
                SET `subsidy_amount` = ?, `negotiation_remark` = ?, `negotiation_status` = 'pending', `updated_at` = ? 
                WHERE `id` = ?";
        return $this->db->execute($sql, [$subsidyAmount, $remark, time(), $orderId]) > 0;
    }

    /**
     * 用户端获取我的回收订单列表
     */
    public function getUserOrders(int $userId, ?string $status, int $page = 1, int $pageSize = 10): array
    {
        $where = ["`user_id` = ?"];
        $params = [$userId];

        if (!empty($status) && $status !== 'all') {
            $where[] = "`status` = ?";
            $params[] = $status;
        }

        $whereSql = implode(' AND ', $where);
        $offset = max(0, ($page - 1) * $pageSize);

        $sql = "SELECT `id`, `order_sn`, `device_name`, `estimate_price`, `final_price`, 
                       `subsidy_amount`, `negotiation_remark`, `negotiation_status`, `appraisal_mode`, `quick_tier_name`,
                       `fulfillment_type`, `mail_sub_type`, `store_id`, `store_name`, `payout_type`, `payout_name`, `payout_account`, `payout_bank`, 
                       `status`, `express_company`, `express_sn`, `contact_mobile`, `created_at`
                FROM `{$this->p}rc_order`
                WHERE {$whereSql}
                ORDER BY `id` DESC
                LIMIT {$offset}, {$pageSize}";
        return $this->db->fetchAll($sql, $params);
    }

    /**
     * 根据手机号码查询用户的回收订单 (支持前台免密查单)
     */
    public function getOrdersByMobile(string $mobile, int $limit = 20): array
    {
        $sql = "SELECT `id`, `order_sn`, `device_name`, `estimate_price`, `final_price`, 
                       `subsidy_amount`, `negotiation_remark`, `negotiation_status`, `appraisal_mode`, `quick_tier_name`,
                       `fulfillment_type`, `mail_sub_type`, `store_id`, `store_name`, `payout_type`, `payout_name`, `payout_account`, `payout_bank`, 
                       `status`, `express_company`, `express_sn`, 
                       `refund_express_sn`, `contact_name`, `contact_mobile`, `contact_address`, `created_at`
                FROM `{$this->p}rc_order`
                WHERE `contact_mobile` = ?
                ORDER BY `id` DESC
                LIMIT {$limit}";
        $orders = $this->db->fetchAll($sql, [$mobile]);
        if (empty($orders)) {
            return [];
        }

        // 批量查询订单选项快照
        $orderIds = array_column($orders, 'id');
        $placeholders = implode(',', array_fill(0, count($orderIds), '?'));
        $detailSql = "SELECT `order_id`, `question_title`, `item_name`, `deduct_amount` 
                      FROM `{$this->p}rc_order_detail` 
                      WHERE `order_id` IN ({$placeholders})";
        $allDetails = $this->db->fetchAll($detailSql, $orderIds);

        $detailsGrouped = [];
        foreach ($allDetails as $d) {
            $oid = (int)$d['order_id'];
            $detailsGrouped[$oid][] = [
                'question_title' => $d['question_title'],
                'item_name'      => $d['item_name'],
                'deduct_amount'  => $d['deduct_amount']
            ];
        }

        foreach ($orders as &$order) {
            $oid = (int)$order['id'];
            $order['details'] = $detailsGrouped[$oid] ?? [];
        }
        unset($order);
        return $orders;
    }

    /**
     * 更新大额打款审核信息
     */
    public function updatePayoutAudit(int $orderId, string $status, int $adminId, string $remark = ''): bool
    {
        $sql = "UPDATE `{$this->p}rc_order` 
                SET `payout_audit_status` = ?, `payout_audit_admin_id` = ?, `payout_audit_remark` = ?, `payout_audit_time` = ?, `updated_at` = ? 
                WHERE `id` = ? LIMIT 1";
        $now = time();
        return $this->db->execute($sql, [$status, $adminId, $remark, $now, $now, $orderId]) > 0;
    }
}

