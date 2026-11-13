<?php
/**
 * 回收加价券数据模型
 * 负责加价券模板库、用户领券、订单核销流水与状态流转
 */

declare(strict_types=1);

namespace App\Model;

use App\Model\Database;

class CouponModel
{
    private $db;
    private $prefix;

    public function __construct()
    {
        $this->db = Database::getInstance();
        $this->prefix = $this->db->getPrefix();
        $this->ensureSchema();
    }

    /**
     * 自动检测并初始化优惠券数据表
     */
    private function ensureSchema(): void
    {
        static $checked = false;
        if ($checked) return;
        $cache = \App\Service\CacheService::getInstance();
        if ($cache->get('schema_ensured:coupon_v1')) {
            $checked = true;
            return;
        }
        $checked = true;

        $p = $this->prefix;

        // 1. 加价券模板主表
        $sqlCoupon = "CREATE TABLE IF NOT EXISTS `{$p}rc_coupon` (
            `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '券模板ID',
            `title` varchar(128) NOT NULL DEFAULT '' COMMENT '券名称/标题',
            `sub_title` varchar(255) NOT NULL DEFAULT '' COMMENT '副标题/营销利益点',
            `type` enum('fixed','percent') NOT NULL DEFAULT 'fixed' COMMENT '加价类型: fixed-固定金额(元), percent-百分比(%)',
            `amount` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '加价值 (固定金额或百分比数值)',
            `max_amount` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '百分比加价时的单笔最高封顶上限(0不封顶)',
            `min_estimate_price` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '最低估价生效门槛(元, 0为无门槛)',
            `category_id` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '限定品类ID(0为全品类通用)',
            `valid_days` int(11) NOT NULL DEFAULT '7' COMMENT '领取后有效天数',
            `total_count` int(11) NOT NULL DEFAULT '0' COMMENT '发行总量(0为不限量)',
            `received_count` int(11) NOT NULL DEFAULT '0' COMMENT '已领取总张数',
            `used_count` int(11) NOT NULL DEFAULT '0' COMMENT '已核销总张数',
            `is_auto_grant` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否新用户注册/首次登录自动发放: 1-是, 0-否',
            `status` tinyint(1) NOT NULL DEFAULT '1' COMMENT '状态: 1-启用, 0-停用',
            `sort` int(11) NOT NULL DEFAULT '0' COMMENT '排序权重(越大越前)',
            `created_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '创建时间',
            `updated_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '更新时间',
            PRIMARY KEY (`id`),
            KEY `idx_status_sort` (`status`, `sort`),
            KEY `idx_auto_grant` (`is_auto_grant`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='回收加价补贴券模板表';";
        $this->db->execute($sqlCoupon);

        // 2. 用户领券卡包明细表
        $sqlUserCoupon = "CREATE TABLE IF NOT EXISTS `{$p}rc_user_coupon` (
            `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '卡券ID',
            `user_id` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '会员用户ID',
            `coupon_id` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '券模板ID',
            `title` varchar(128) NOT NULL DEFAULT '' COMMENT '券标题快照',
            `type` enum('fixed','percent') NOT NULL DEFAULT 'fixed' COMMENT '加价类型快照',
            `amount` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '加价值快照',
            `max_amount` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '封顶额快照',
            `min_estimate_price` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '门槛金额快照',
            `category_id` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '限定品类快照',
            `start_time` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '生效时间戳',
            `end_time` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '过期失效时间戳',
            `status` enum('unused','locked','used','expired') NOT NULL DEFAULT 'unused' COMMENT '状态: unused-未使用, locked-订单锁定待质检, used-已核销, expired-已过期',
            `order_id` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '绑定的订单ID',
            `order_sn` varchar(32) NOT NULL DEFAULT '' COMMENT '绑定的订单号',
            `actual_add_price` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '最终实际补贴加价金额',
            `used_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '核销打款时间',
            `created_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '领取时间',
            PRIMARY KEY (`id`),
            KEY `idx_user_status` (`user_id`, `status`),
            KEY `idx_coupon_id` (`coupon_id`),
            KEY `idx_order_id` (`order_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户加价补贴券卡包表';";
        $this->db->execute($sqlUserCoupon);
        $delCol = $this->db->fetchOne("SHOW COLUMNS FROM `{$p}rc_coupon` LIKE 'deleted_at'");
        if (!$delCol) {
            @$this->db->execute("ALTER TABLE `{$p}rc_coupon` ADD COLUMN `deleted_at` timestamp NULL DEFAULT NULL COMMENT '软删除时间戳' AFTER `updated_at`");
        }

        // 3. 检查并为订单主表添加加价券补贴字段
        try {
            $colCheck = $this->db->fetchOne("SHOW COLUMNS FROM `{$p}rc_order` LIKE 'coupon_id'");
            if (!$colCheck) {
                $this->db->execute("ALTER TABLE `{$p}rc_order` 
                    ADD COLUMN `coupon_id` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '绑定的加价券模板ID' AFTER `final_price`,
                    ADD COLUMN `user_coupon_id` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '绑定的用户卡券ID' AFTER `coupon_id`,
                    ADD COLUMN `coupon_add_price` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '加价券补贴金额' AFTER `user_coupon_id`;");
            }
        } catch (\Throwable $e) {}

        // 4. 若券模板为空，注入主流开箱即用行业标杆种子数据 (转转/爱回收同款加价模型)
        $cnt = (int)($this->db->fetchOne("SELECT COUNT(*) AS c FROM `{$p}rc_coupon`")['c'] ?? 0);
        if ($cnt === 0) {
            $now = time();
            $seeds = [
                ['新人首单极速加价礼包', '首单立享加价补贴，全品类无门槛通用', 'fixed', 15.00, 0.00, 50.00, 0, 14, 1, 1, 100],
                ['数码高价回收翻倍券', '数码手机专属，满1000立加60元', 'fixed', 60.00, 0.00, 1000.00, 1, 7, 1, 1, 90],
                ['大额回收尊享补贴券', '全场满3000立加180元现金', 'fixed', 180.00, 0.00, 3000.00, 0, 7, 0, 1, 80],
                ['黄金奢品专享增值券', '高客单回收加价3%，最高补贴300元', 'percent', 3.00, 300.00, 2000.00, 0, 15, 0, 1, 70],
            ];
            $insertSql = "INSERT INTO `{$p}rc_coupon` 
                (`title`, `sub_title`, `type`, `amount`, `max_amount`, `min_estimate_price`, `category_id`, `valid_days`, `is_auto_grant`, `status`, `sort`, `created_at`, `updated_at`) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            foreach ($seeds as $s) {
                $this->db->execute($insertSql, [
                    $s[0], $s[1], $s[2], $s[3], $s[4], $s[5], $s[6], $s[7], $s[8], $s[9], $s[10], $now, $now
                ]);
            }
        }
        $cache->set('schema_ensured:coupon_v1', 1, 86400 * 30);
    }

    /**
     * 获取管理后台加价券列表
     */
    public function getCouponList(array $filter = [], int $page = 1, int $pageSize = 15): array
    {
        $p = $this->prefix;
        $where = ['1=1'];
        $params = [];

        if (!empty($filter['keyword'])) {
            $where[] = "(`title` LIKE ? OR `sub_title` LIKE ?)";
            $params[] = '%' . $filter['keyword'] . '%';
            $params[] = '%' . $filter['keyword'] . '%';
        }
        if (isset($filter['status']) && $filter['status'] !== '') {
            $where[] = "`status` = ?";
            $params[] = (int)$filter['status'];
        }
        if (isset($filter['type']) && $filter['type'] !== '') {
            $where[] = "`type` = ?";
            $params[] = $filter['type'];
        }

        $whereClause = implode(' AND ', $where);
        $countSql = "SELECT COUNT(*) AS c FROM `{$p}rc_coupon` WHERE {$whereClause}";
        $total = (int)($this->db->fetchOne($countSql, $params)['c'] ?? 0);

        $offset = max(0, ($page - 1) * $pageSize);
        $sql = "SELECT c.*, cat.`name` AS category_name 
                FROM `{$p}rc_coupon` c 
                LEFT JOIN `{$p}rc_category` cat ON c.`category_id` = cat.`id`
                WHERE {$whereClause} 
                ORDER BY c.`sort` DESC, c.`id` DESC 
                LIMIT {$offset}, {$pageSize}";
        $list = $this->db->fetchAll($sql, $params);

        return [
            'total'     => $total,
            'page'      => $page,
            'page_size' => $pageSize,
            'list'      => $list
        ];
    }

    /**
     * 获取加价券详情
     */
    public function getCouponById(int $id): ?array
    {
        $p = $this->prefix;
        return $this->db->fetchOne("SELECT * FROM `{$p}rc_coupon` WHERE `id` = ? LIMIT 1", [$id]);
    }

    /**
     * 保存加价券 (新增或编辑)
     */
    public function saveCoupon(array $data): int
    {
        $p = $this->prefix;
        $now = time();
        $id = (int)($data['id'] ?? 0);

        $title = trim((string)($data['title'] ?? ''));
        $subTitle = trim((string)($data['sub_title'] ?? ''));
        $type = in_array($data['type'] ?? '', ['fixed', 'percent'], true) ? $data['type'] : 'fixed';
        $amount = (float)($data['amount'] ?? 0.00);
        $maxAmount = (float)($data['max_amount'] ?? 0.00);
        $minEstimatePrice = (float)($data['min_estimate_price'] ?? 0.00);
        $categoryId = (int)($data['category_id'] ?? 0);
        $validDays = max(1, (int)($data['valid_days'] ?? 7));
        $totalCount = max(0, (int)($data['total_count'] ?? 0));
        $isAutoGrant = (int)($data['is_auto_grant'] ?? 0) === 1 ? 1 : 0;
        $status = (int)($data['status'] ?? 1) === 1 ? 1 : 0;
        $sort = (int)($data['sort'] ?? 0);

        if ($id > 0) {
            $sql = "UPDATE `{$p}rc_coupon` SET 
                `title` = ?, `sub_title` = ?, `type` = ?, `amount` = ?, `max_amount` = ?,
                `min_estimate_price` = ?, `category_id` = ?, `valid_days` = ?, `total_count` = ?,
                `is_auto_grant` = ?, `status` = ?, `sort` = ?, `updated_at` = ?
                WHERE `id` = ?";
            $this->db->execute($sql, [
                $title, $subTitle, $type, $amount, $maxAmount,
                $minEstimatePrice, $categoryId, $validDays, $totalCount,
                $isAutoGrant, $status, $sort, $now, $id
            ]);
            return $id;
        } else {
            $sql = "INSERT INTO `{$p}rc_coupon` 
                (`title`, `sub_title`, `type`, `amount`, `max_amount`, `min_estimate_price`, `category_id`, `valid_days`, `total_count`, `is_auto_grant`, `status`, `sort`, `created_at`, `updated_at`) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            $this->db->execute($sql, [
                $title, $subTitle, $type, $amount, $maxAmount,
                $minEstimatePrice, $categoryId, $validDays, $totalCount,
                $isAutoGrant, $status, $sort, $now, $now
            ]);
            return (int)$this->db->lastInsertId();
        }
    }

    /**
     * 删除加价券模板
     */
    public function deleteCoupon(int $id): bool
    {
        $p = $this->prefix;
        // 核心资产软删除保护
        return (bool)$this->db->execute("UPDATE `{$p}rc_coupon` SET `deleted_at` = ?, `status` = 0 WHERE `id` = ?", [date('Y-m-d H:i:s'), $id]);
    }

    /**
     * 切换加价券启用状态
     */
    public function toggleStatus(int $id, int $status): bool
    {
        $p = $this->prefix;
        return $this->db->execute("UPDATE `{$p}rc_coupon` SET `status` = ?, `updated_at` = ? WHERE `id` = ?", [
            $status, time(), $id
        ]);
    }

    /**
     * 获取全平台可供用户自主领取的加价券列表
     */
    public function getPublicActiveCoupons(int $userId = 0): array
    {
        $p = $this->prefix;
        $sql = "SELECT c.*, cat.`name` AS category_name 
                FROM `{$p}rc_coupon` c 
                LEFT JOIN `{$p}rc_category` cat ON c.`category_id` = cat.`id`
                WHERE c.`status` = 1 AND (c.`total_count` = 0 OR c.`received_count` < c.`total_count`)
                ORDER BY c.`sort` DESC, c.`id` DESC";
        $list = $this->db->fetchAll($sql);

        // 如果传入了用户 ID，标记该用户是否已经领取过
        if ($userId > 0 && !empty($list)) {
            $receivedMap = [];
            $ucRows = $this->db->fetchAll("SELECT `coupon_id`, COUNT(*) AS cnt FROM `{$p}rc_user_coupon` WHERE `user_id` = ? GROUP BY `coupon_id`", [$userId]);
            foreach ($ucRows as $r) {
                $receivedMap[(int)$r['coupon_id']] = (int)$r['cnt'];
            }
            foreach ($list as &$item) {
                $cid = (int)$item['id'];
                $item['has_received'] = isset($receivedMap[$cid]) && $receivedMap[$cid] > 0;
            }
            unset($item);
        }

        return $list;
    }

    /**
     * 用户领取加价券 (分布式互斥防刷锁 + 条件原子更新库存)
     */
    public function receiveCoupon(int $userId, int $couponId): array
    {
        $p = $this->prefix;
        $coupon = $this->getCouponById($couponId);
        if (!$coupon || (int)$coupon['status'] !== 1) {
            return ['code' => 400, 'msg' => '加价券不存在或已下架'];
        }

        // 1. 分布式单据互斥锁：基于用户ID与券ID加锁，防高并发重复领取
        $cache = \App\Service\CacheService::getInstance();
        $lockKey = "receive_coupon:{$userId}:{$couponId}";
        $lockToken = $cache->acquireLock($lockKey, 5);
        if ($lockToken === null) {
            return ['code' => 429, 'msg' => '领券处理中，请勿频繁点击！'];
        }

        try {
            // 2. 校验同张券单用户限领 1 张（防止恶意刷券）
            $existing = $this->db->fetchOne("SELECT `id` FROM `{$p}rc_user_coupon` WHERE `user_id` = ? AND `coupon_id` = ? AND `status` IN ('unused', 'locked') LIMIT 1", [
                $userId, $couponId
            ]);
            if ($existing) {
                return ['code' => 400, 'msg' => '您已经拥有该加价券，请先在订单中使用'];
            }

            // 3. 条件原子递增库存 (乐观防超发)：仅当总量为0(无限制)或当前已领量小于发行总量时允许递增
            if ((int)$coupon['total_count'] > 0) {
                $stockSql = "UPDATE `{$p}rc_coupon` SET `received_count` = `received_count` + 1 
                             WHERE `id` = ? AND `received_count` < `total_count`";
                $affected = $this->db->execute($stockSql, [$couponId]);
                if ($affected <= 0) {
                    return ['code' => 400, 'msg' => '手慢了，该加价券已被抢光'];
                }
            } else {
                $this->db->execute("UPDATE `{$p}rc_coupon` SET `received_count` = `received_count` + 1 WHERE `id` = ?", [$couponId]);
            }

            $now = time();
            $endTime = $now + max(1, (int)$coupon['valid_days']) * 86400;

            $sql = "INSERT INTO `{$p}rc_user_coupon` 
                (`user_id`, `coupon_id`, `title`, `type`, `amount`, `max_amount`, `min_estimate_price`, `category_id`, `start_time`, `end_time`, `status`, `created_at`) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unused', ?)";
            
            try {
                $this->db->execute($sql, [
                    $userId, $couponId, $coupon['title'], $coupon['type'], $coupon['amount'],
                    $coupon['max_amount'], $coupon['min_estimate_price'], $coupon['category_id'],
                    $now, $endTime, $now
                ]);
                $userCouponId = (int)$this->db->lastInsertId();
            } catch (\Throwable $e) {
                // 若插入异常，原子回退已递增的库存
                if ((int)$coupon['total_count'] > 0) {
                    $this->db->execute("UPDATE `{$p}rc_coupon` SET `received_count` = GREATEST(0, `received_count` - 1) WHERE `id` = ?", [$couponId]);
                }
                throw $e;
            }

            return [
                'code' => 200,
                'msg'  => '加价券领取成功',
                'data' => [
                    'user_coupon_id' => $userCouponId,
                    'title'          => $coupon['title'],
                    'amount'         => $coupon['amount'],
                    'type'           => $coupon['type'],
                    'end_time'       => $endTime,
                ]
            ];
        } finally {
            $cache->releaseLock($lockKey, $lockToken);
        }
    }

    /**
     * 新用户注册/首次登录自动发放新手专享加价大礼包
     */
    public function grantAutoCoupons(int $userId): int
    {
        $p = $this->prefix;
        $sql = "SELECT * FROM `{$p}rc_coupon` WHERE `status` = 1 AND `is_auto_grant` = 1";
        $autoCoupons = $this->db->fetchAll($sql);
        if (empty($autoCoupons)) return 0;

        // 批量预取当前用户已拥有的加价券ID，消除循环中的 N+1 冗余查询
        $cids = array_map(function($c) { return (int)$c['id']; }, $autoCoupons);
        $existingMap = [];
        if (!empty($cids)) {
            $inPlaceholders = implode(',', array_fill(0, count($cids), '?'));
            $params = array_merge([$userId], $cids);
            $existingRows = $this->db->fetchAll(
                "SELECT `coupon_id` FROM `{$p}rc_user_coupon` WHERE `user_id` = ? AND `coupon_id` IN ({$inPlaceholders})",
                $params
            );
            foreach ($existingRows as $row) {
                $existingMap[(int)$row['coupon_id']] = true;
            }
        }

        $grantedCount = 0;
        foreach ($autoCoupons as $coupon) {
            $cid = (int)$coupon['id'];
            if (!isset($existingMap[$cid])) {
                $now = time();
                $endTime = $now + max(1, (int)$coupon['valid_days']) * 86400;
                $sqlInsert = "INSERT INTO `{$p}rc_user_coupon` 
                    (`user_id`, `coupon_id`, `title`, `type`, `amount`, `max_amount`, `min_estimate_price`, `category_id`, `start_time`, `end_time`, `status`, `created_at`) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unused', ?)";
                $this->db->execute($sqlInsert, [
                    $userId, $cid, $coupon['title'], $coupon['type'], $coupon['amount'],
                    $coupon['max_amount'], $coupon['min_estimate_price'], $coupon['category_id'],
                    $now, $endTime, $now
                ]);
                $this->db->execute("UPDATE `{$p}rc_coupon` SET `received_count` = `received_count` + 1 WHERE `id` = ?", [$cid]);
                $grantedCount++;
            }
        }
        return $grantedCount;
    }

    /**
     * 获取用户卡包中的加价券列表 (支持动态计算可用性与加价补贴金额)
     */
    public function getUserCoupons(int $userId, string $status = 'unused', float $estimatePrice = 0.0, int $categoryId = 0): array
    {
        $p = $this->prefix;
        $now = time();

        // 惰性更新：将已超过 end_time 且仍为 unused 的券标记为 expired
        $this->db->execute("UPDATE `{$p}rc_user_coupon` SET `status` = 'expired' WHERE `user_id` = ? AND `status` = 'unused' AND `end_time` < ?", [
            $userId, $now
        ]);

        $where = ["`user_id` = ?"];
        $params = [$userId];

        if (!empty($status)) {
            $where[] = "`status` = ?";
            $params[] = $status;
        }

        $whereClause = implode(' AND ', $where);
        $sql = "SELECT uc.*, cat.`name` AS category_name 
                FROM `{$p}rc_user_coupon` uc
                LEFT JOIN `{$p}rc_category` cat ON uc.`category_id` = cat.`id`
                WHERE {$whereClause}
                ORDER BY uc.`id` DESC";
        $list = $this->db->fetchAll($sql, $params);

        // 如果传入了估价金额，智能试算每张加价券的可用性与具体补贴金额
        foreach ($list as &$item) {
            $item['amount'] = (float)$item['amount'];
            $item['min_estimate_price'] = (float)$item['min_estimate_price'];
            $item['max_amount'] = (float)$item['max_amount'];
            $item['category_id'] = (int)$item['category_id'];
            $item['is_usable'] = true;
            $item['unusable_reason'] = '';
            $item['calculated_add_price'] = 0.00;

            if ($item['status'] !== 'unused') {
                $item['is_usable'] = false;
                $item['unusable_reason'] = $item['status'] === 'used' ? '已在订单中使用' : ($item['status'] === 'locked' ? '订单处理中已锁定' : '已过期');
            } elseif ($estimatePrice > 0) {
                if ($estimatePrice < $item['min_estimate_price']) {
                    $item['is_usable'] = false;
                    $item['unusable_reason'] = "满 ¥" . number_format($item['min_estimate_price'], 2) . " 可用 (当前估价 ¥" . number_format($estimatePrice, 2) . ")";
                } elseif ($item['category_id'] > 0 && $categoryId > 0 && $item['category_id'] !== $categoryId) {
                    $item['is_usable'] = false;
                    $item['unusable_reason'] = '限指定品类回收使用';
                }
            }

            // 计算该券在当前估价下的实际加价补贴金额
            if ($item['is_usable'] && $estimatePrice > 0) {
                if ($item['type'] === 'percent') {
                    $calc = round(($estimatePrice * $item['amount']) / 100, 2);
                    if ($item['max_amount'] > 0 && $calc > $item['max_amount']) {
                        $calc = $item['max_amount'];
                    }
                    $item['calculated_add_price'] = $calc;
                } else {
                    $item['calculated_add_price'] = $item['amount'];
                }
            }
        }
        unset($item);

        // 如果是用于下单选择，按可用状态和加价金额从大到小智能排序
        if ($estimatePrice > 0) {
            usort($list, function ($a, $b) {
                if ($a['is_usable'] === $b['is_usable']) {
                    return $b['calculated_add_price'] <=> $a['calculated_add_price'];
                }
                return $a['is_usable'] ? -1 : 1;
            });
        }

        return $list;
    }

    /**
     * 锁定加价券 (下单提交时调用)
     */
    public function lockCoupon(int $userCouponId, int $userId, int $orderId, string $orderSn, float $actualAddPrice): bool
    {
        $p = $this->prefix;
        $sql = "UPDATE `{$p}rc_user_coupon` SET 
            `status` = 'locked', `order_id` = ?, `order_sn` = ?, `actual_add_price` = ?
            WHERE `id` = ? AND `user_id` = ? AND `status` = 'unused'";
        return $this->db->execute($sql, [$orderId, $orderSn, $actualAddPrice, $userCouponId, $userId]);
    }

    /**
     * 释放加价券 (订单取消/退货时归还)
     */
    public function releaseCoupon(int $orderId): bool
    {
        $p = $this->prefix;
        $sql = "UPDATE `{$p}rc_user_coupon` SET 
            `status` = 'unused', `order_id` = 0, `order_sn` = '', `actual_add_price` = 0.00
            WHERE `order_id` = ? AND `status` = 'locked'";
        return $this->db->execute($sql, [$orderId]);
    }

    /**
     * 核销加价券 (打款成功完成交易时调用)
     */
    public function settleCoupon(int $orderId, float $finalAddPrice = 0.00): bool
    {
        $p = $this->prefix;
        $now = time();
        $uc = $this->db->fetchOne("SELECT `id`, `coupon_id`, `actual_add_price` FROM `{$p}rc_user_coupon` WHERE `order_id` = ? LIMIT 1", [$orderId]);
        if (!$uc) return false;

        $actual = $finalAddPrice > 0 ? $finalAddPrice : (float)$uc['actual_add_price'];
        $sql = "UPDATE `{$p}rc_user_coupon` SET 
            `status` = 'used', `actual_add_price` = ?, `used_at` = ?
            WHERE `id` = ?";
        $res = $this->db->execute($sql, [$actual, $now, (int)$uc['id']]);

        // 递增已核销使用计数
        $this->db->execute("UPDATE `{$p}rc_coupon` SET `used_count` = `used_count` + 1 WHERE `id` = ?", [(int)$uc['coupon_id']]);

        return $res;
    }

    /**
     * 获取全平台领券与核销流水明细 (运营大屏)
     */
    public function getUserCouponLogs(array $filter = [], int $page = 1, int $pageSize = 15): array
    {
        $p = $this->prefix;
        $where = ['1=1'];
        $params = [];

        if (!empty($filter['keyword'])) {
            $where[] = "(uc.`title` LIKE ? OR uc.`order_sn` LIKE ? OR u.`nickname` LIKE ? OR u.`mobile` LIKE ?)";
            $params[] = '%' . $filter['keyword'] . '%';
            $params[] = '%' . $filter['keyword'] . '%';
            $params[] = '%' . $filter['keyword'] . '%';
            $params[] = '%' . $filter['keyword'] . '%';
        }
        if (!empty($filter['status'])) {
            $where[] = "uc.`status` = ?";
            $params[] = $filter['status'];
        }

        $whereClause = implode(' AND ', $where);
        $total = (int)($this->db->fetchOne("SELECT COUNT(*) AS c FROM `{$p}rc_user_coupon` uc LEFT JOIN `{$p}rc_user` u ON uc.`user_id` = u.`id` WHERE {$whereClause}", $params)['c'] ?? 0);

        $offset = max(0, ($page - 1) * $pageSize);
        $sql = "SELECT uc.*, u.`nickname`, u.`mobile` 
                FROM `{$p}rc_user_coupon` uc 
                LEFT JOIN `{$p}rc_user` u ON uc.`user_id` = u.`id`
                WHERE {$whereClause} 
                ORDER BY uc.`id` DESC 
                LIMIT {$offset}, {$pageSize}";
        $list = $this->db->fetchAll($sql, $params);

        return [
            'total'     => $total,
            'page'      => $page,
            'page_size' => $pageSize,
            'list'      => $list
        ];
    }

    /**
     * 获取加价补贴营销综合指标统计
     */
    public function getCouponStats(): array
    {
        $p = $this->prefix;
        $activeTemplates = (int)($this->db->fetchOne("SELECT COUNT(*) AS c FROM `{$p}rc_coupon` WHERE `status` = 1")['c'] ?? 0);
        $totalGranted = (int)($this->db->fetchOne("SELECT COUNT(*) AS c FROM `{$p}rc_user_coupon`")['c'] ?? 0);
        $totalUsed = (int)($this->db->fetchOne("SELECT COUNT(*) AS c FROM `{$p}rc_user_coupon` WHERE `status` = 'used'")['c'] ?? 0);
        $totalSubsidy = (float)($this->db->fetchOne("SELECT SUM(`actual_add_price`) AS s FROM `{$p}rc_user_coupon` WHERE `status` = 'used'")['s'] ?? 0.00);

        return [
            'active_templates' => $activeTemplates,
            'total_granted'    => $totalGranted,
            'total_used'       => $totalUsed,
            'total_subsidy'    => round($totalSubsidy, 2),
            'conversion_rate'  => $totalGranted > 0 ? round(($totalUsed / $totalGranted) * 100, 1) : 0.0
        ];
    }
}
