<?php
/**
 * 启灵同城生活服务 - 师傅/服务人员数据模型
 * 负责师傅档案、资质认证、状态流转、接单工单大厅与抢单原子事务
 * 编码：UTF-8 无 BOM
 */

namespace App\Model;

use App\Service\CacheService;

class TechnicianModel
{
    /** @var Database */
    private $db;
    /** @var string */
    private $p;
    /** @var bool */
    private static $tablesChecked = false;

    public function __construct()
    {
        $this->db = Database::getInstance();
        $this->p = $this->db->getPrefix();
        $this->ensureTables();
    }

    /**
     * 自动检测并初始化师傅数据表与索引
     */
    private function ensureTables(): void
    {
        if (self::$tablesChecked) {
            return;
        }
        $cache = CacheService::getInstance();
        if ($cache->get('schema_ensured:technician_v1')) {
            self::$tablesChecked = true;
            return;
        }
        self::$tablesChecked = true;

        try {
            $sql = "CREATE TABLE IF NOT EXISTS `{$this->p}rc_technician` (
                `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '师傅ID',
                `user_id` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '绑定的前台会员用户ID',
                `name` varchar(64) NOT NULL DEFAULT '' COMMENT '师傅实名姓名',
                `mobile` varchar(20) NOT NULL DEFAULT '' COMMENT '师傅联系手机号',
                `avatar` varchar(255) NOT NULL DEFAULT '/uploads/default/avatar_default.svg' COMMENT '师傅实名头像URL',
                `id_card` varchar(32) NOT NULL DEFAULT '' COMMENT '身份证号码',
                `service_types` varchar(255) NOT NULL DEFAULT 'service,errand' COMMENT '承接业务类型逗号分隔',
                `service_categories` varchar(255) NOT NULL DEFAULT '' COMMENT '承接服务分类ID列表逗号分隔',
                `city_name` varchar(64) NOT NULL DEFAULT '深圳市' COMMENT '常驻服务城市',
                `district_name` varchar(128) NOT NULL DEFAULT '全城服务' COMMENT '主要服务区域/商圈',
                `star_rating` decimal(3,2) NOT NULL DEFAULT 5.00 COMMENT '星级信誉评分',
                `order_count` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '累计完工单数',
                `deposit_balance` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT '履约保证金金额',
                `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT '认证审核状态: 0-待审核, 1-已认证在职, 2-已冻结/未通过',
                `is_online` tinyint(1) NOT NULL DEFAULT 1 COMMENT '接单开工状态: 1-出车接单中, 0-收工休息中',
                `audit_remark` varchar(255) NOT NULL DEFAULT '' COMMENT '审核备注/驳回说明',
                `created_at` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '入驻时间',
                `updated_at` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '更新时间',
                PRIMARY KEY (`id`),
                KEY `idx_user_id` (`user_id`),
                KEY `idx_mobile` (`mobile`),
                KEY `idx_status_online` (`status`, `is_online`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='同城生活服务师傅/技师档案表'";
            $this->db->execute($sql);

            // 自动检测并补齐初始种子师傅
            $techCount = $this->db->fetchOne("SELECT COUNT(*) as `c` FROM `{$this->p}rc_technician`");
            if ((int)($techCount['c'] ?? 0) === 0) {
                $now = time();
                $seedSql = "INSERT INTO `{$this->p}rc_technician` (
                    `id`, `user_id`, `name`, `mobile`, `avatar`, `id_card`, `service_types`, `service_categories`,
                    `city_name`, `district_name`, `star_rating`, `order_count`, `deposit_balance`,
                    `status`, `is_online`, `audit_remark`, `created_at`, `updated_at`
                ) VALUES (1, 1, '张建国 (金牌师傅)', '13800138000', '/uploads/default/avatar_default.svg', '440301198501010000', 'service,errand,recycle', '1,2,3,4,5', '深圳市', '南山区,福田区,宝安区', 5.00, 156, 1000.00, 1, 1, '官方自营特约金牌认证师傅', ?, ?)";
                $this->db->execute($seedSql, [$now, $now]);
            }

            $cache->set('schema_ensured:technician_v1', 1, 86400 * 30);
        } catch (\Throwable $e) {
            // 静默容灾
        }
    }

    /**
     * 根据主键 ID 获取师傅档案
     */
    public function findById(int $id): ?array
    {
        $sql = "SELECT * FROM `{$this->p}rc_technician` WHERE `id` = ? LIMIT 1";
        return $this->db->fetchOne($sql, [$id]);
    }

    /**
     * 根据关联的用户 ID 或手机号获取师傅档案
     */
    public function findByUser(int $userId, string $mobile = ''): ?array
    {
        if ($userId > 0) {
            $sql = "SELECT * FROM `{$this->p}rc_technician` WHERE `user_id` = ? LIMIT 1";
            $res = $this->db->fetchOne($sql, [$userId]);
            if ($res) {
                return $res;
            }
        }

        if (!empty($mobile)) {
            $sql = "SELECT * FROM `{$this->p}rc_technician` WHERE `mobile` = ? LIMIT 1";
            return $this->db->fetchOne($sql, [$mobile]);
        }

        return null;
    }

    /**
     * 保存/更新师傅档案
     */
    public function save(array $data): int
    {
        $id = (int)($data['id'] ?? 0);
        $userId = (int)($data['user_id'] ?? 0);
        $name = trim((string)($data['name'] ?? ''));
        $mobile = trim((string)($data['mobile'] ?? ''));
        $avatar = trim((string)($data['avatar'] ?? '/uploads/default/avatar_default.svg'));
        $idCard = trim((string)($data['id_card'] ?? ''));
        $serviceTypes = trim((string)($data['service_types'] ?? 'service,errand'));
        $serviceCategories = trim((string)($data['service_categories'] ?? ''));
        $cityName = trim((string)($data['city_name'] ?? '深圳市'));
        $districtName = trim((string)($data['district_name'] ?? '全城服务'));
        $starRating = isset($data['star_rating']) ? (float)$data['star_rating'] : 5.00;
        $orderCount = isset($data['order_count']) ? (int)$data['order_count'] : 0;
        $depositBalance = isset($data['deposit_balance']) ? (float)$data['deposit_balance'] : 0.00;
        $status = isset($data['status']) ? (int)$data['status'] : 1;
        $isOnline = isset($data['is_online']) ? (int)$data['is_online'] : 1;
        $auditRemark = trim((string)($data['audit_remark'] ?? ''));
        $now = time();

        if ($id > 0) {
            $sql = "UPDATE `{$this->p}rc_technician` SET
                    `user_id` = ?, `name` = ?, `mobile` = ?, `avatar` = ?, `id_card` = ?,
                    `service_types` = ?, `service_categories` = ?, `city_name` = ?, `district_name` = ?,
                    `star_rating` = ?, `order_count` = ?, `deposit_balance` = ?,
                    `status` = ?, `is_online` = ?, `audit_remark` = ?, `updated_at` = ?
                    WHERE `id` = ?";
            $this->db->execute($sql, [
                $userId, $name, $mobile, $avatar, $idCard,
                $serviceTypes, $serviceCategories, $cityName, $districtName,
                $starRating, $orderCount, $depositBalance,
                $status, $isOnline, $auditRemark, $now, $id
            ]);
            return $id;
        } else {
            $sql = "INSERT INTO `{$this->p}rc_technician` (
                    `user_id`, `name`, `mobile`, `avatar`, `id_card`,
                    `service_types`, `service_categories`, `city_name`, `district_name`,
                    `star_rating`, `order_count`, `deposit_balance`,
                    `status`, `is_online`, `audit_remark`, `created_at`, `updated_at`
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            $this->db->execute($sql, [
                $userId, $name, $mobile, $avatar, $idCard,
                $serviceTypes, $serviceCategories, $cityName, $districtName,
                $starRating, $orderCount, $depositBalance,
                $status, $isOnline, $auditRemark, $now, $now
            ]);
            return (int)$this->db->lastInsertId();
        }
    }

    /**
     * 切换师傅出车/收工接单状态
     */
    public function updateOnlineStatus(int $id, int $isOnline): bool
    {
        $sql = "UPDATE `{$this->p}rc_technician` SET `is_online` = ?, `updated_at` = ? WHERE `id` = ?";
        return $this->db->execute($sql, [$isOnline, time(), $id]) > 0;
    }

    /**
     * 师傅完工时递增其完成单数
     */
    public function incrementOrderCount(int $id): bool
    {
        $sql = "UPDATE `{$this->p}rc_technician` SET `order_count` = `order_count` + 1, `updated_at` = ? WHERE `id` = ?";
        return $this->db->execute($sql, [time(), $id]) > 0;
    }

    /**
     * 师傅端工单大厅：查询当前待接单/可抢单公共工单池
     */
    public function getDispatchPool(int $page = 1, int $pageSize = 15): array
    {
        $offset = max(0, ($page - 1) * $pageSize);

        // 待接单条件：处于 pending_dispatch 且尚未分配师傅 (technician_id = 0) 且已支付或线下付款
        $whereSql = "`status` = 'pending_dispatch' AND `technician_id` = 0 AND (`pay_status` = 1 OR `pay_type` = 'offline')";

        $countSql = "SELECT COUNT(*) as `total` FROM `{$this->p}rc_order` WHERE {$whereSql}";
        $totalRow = $this->db->fetchOne($countSql);
        $total = (int)($totalRow['total'] ?? 0);

        $sql = "SELECT `id`, `order_sn`, `biz_type`, `device_id`, `device_name`, `estimate_price`, `pay_price`, `pay_type`, 
                       `fulfillment_type`, `contact_name`, `contact_mobile`, `contact_address`, `appointment_time`, `user_remark`, `custom_fields`, `created_at`
                FROM `{$this->p}rc_order`
                WHERE {$whereSql}
                ORDER BY `id` DESC
                LIMIT {$offset}, {$pageSize}";
        $list = $this->db->fetchAll($sql);

        return [
            'list'      => $list,
            'total'     => $total,
            'page'      => $page,
            'page_size' => $pageSize
        ];
    }

    /**
     * 师傅抢单原子操作 (基于行级乐观锁排他防并发冲突)
     */
    public function grabOrder(int $orderId, int $technicianId, string $technicianName, string $technicianMobile): bool
    {
        $now = time();
        $sql = "UPDATE `{$this->p}rc_order` 
                SET `technician_id` = ?, `technician_name` = ?, `technician_mobile` = ?, `status` = 'dispatched', `updated_at` = ?
                WHERE `id` = ? AND `status` = 'pending_dispatch' AND `technician_id` = 0";
        return $this->db->execute($sql, [$technicianId, $technicianName, $technicianMobile, $now, $orderId]) > 0;
    }

    /**
     * 师傅工作台：查询归属于指定师傅的工单列表
     */
    public function getTechnicianOrders(int $technicianId, string $statusGroup = 'all', int $page = 1, int $pageSize = 15): array
    {
        $offset = max(0, ($page - 1) * $pageSize);
        $conditions = ["`technician_id` = ?"];
        $params = [$technicianId];

        if ($statusGroup === 'todo') {
            // 待上门服务
            $conditions[] = "`status` = 'dispatched'";
        } elseif ($statusGroup === 'doing') {
            // 作业服务中
            $conditions[] = "`status` = 'in_service'";
        } elseif ($statusGroup === 'done') {
            // 已完工核销
            $conditions[] = "`status` = 'completed'";
        }

        $whereSql = implode(' AND ', $conditions);

        $countSql = "SELECT COUNT(*) as `total` FROM `{$this->p}rc_order` WHERE {$whereSql}";
        $totalRow = $this->db->fetchOne($countSql, $params);
        $total = (int)($totalRow['total'] ?? 0);

        $sql = "SELECT `id`, `order_sn`, `biz_type`, `device_id`, `device_name`, `estimate_price`, `pay_price`, `pay_status`, `pay_type`, 
                       `fulfillment_type`, `status`, `contact_name`, `contact_mobile`, `contact_address`, `appointment_time`, 
                       `service_start_time`, `service_finish_time`, `service_images`, `user_remark`, `custom_fields`, `created_at`
                FROM `{$this->p}rc_order`
                WHERE {$whereSql}
                ORDER BY `id` DESC
                LIMIT {$offset}, {$pageSize}";
        $list = $this->db->fetchAll($sql, $params);

        return [
            'list'      => $list,
            'total'     => $total,
            'page'      => $page,
            'page_size' => $pageSize
        ];
    }

    /**
     * 后台多维检索师傅列表
     */
    public function searchTechnicians(array $filter = [], int $page = 1, int $pageSize = 15): array
    {
        $conditions = ["1=1"];
        $params = [];

        if (isset($filter['status']) && $filter['status'] !== '' && $filter['status'] !== 'all') {
            $conditions[] = "`status` = ?";
            $params[] = (int)$filter['status'];
        }
        if (isset($filter['is_online']) && $filter['is_online'] !== '' && $filter['is_online'] !== 'all') {
            $conditions[] = "`is_online` = ?";
            $params[] = (int)$filter['is_online'];
        }
        if (!empty($filter['city_name'])) {
            $conditions[] = "`city_name` = ?";
            $params[] = trim((string)$filter['city_name']);
        }
        if (!empty($filter['keyword'])) {
            $conditions[] = "(`name` LIKE ? OR `mobile` LIKE ?)";
            $like = '%' . trim((string)$filter['keyword']) . '%';
            $params[] = $like;
            $params[] = $like;
        }

        $whereSql = implode(' AND ', $conditions);
        $offset = max(0, ($page - 1) * $pageSize);

        $countSql = "SELECT COUNT(*) as `total` FROM `{$this->p}rc_technician` WHERE {$whereSql}";
        $totalRow = $this->db->fetchOne($countSql, $params);
        $total = (int)($totalRow['total'] ?? 0);

        $sql = "SELECT * FROM `{$this->p}rc_technician` WHERE {$whereSql} ORDER BY `id` DESC LIMIT {$offset}, {$pageSize}";
        $list = $this->db->fetchAll($sql, $params);

        return [
            'list'      => $list,
            'total'     => $total,
            'page'      => $page,
            'page_size' => $pageSize
        ];
    }

    /**
     * 删除师傅档案 (已接单有未完成业务的师傅阻止删除)
     */
    public function delete(int $id, ?string &$errorMsg = null): bool
    {
        $activeOrders = $this->db->fetchOne(
            "SELECT COUNT(*) as `c` FROM `{$this->p}rc_order` WHERE `technician_id` = ? AND `status` IN ('dispatched', 'in_service')",
            [$id]
        );
        if ((int)($activeOrders['c'] ?? 0) > 0) {
            $errorMsg = '该师傅名下有正在履约执行中的工单，无法删除档案';
            return false;
        }

        return $this->db->execute("DELETE FROM `{$this->p}rc_technician` WHERE `id` = ?", [$id]) > 0;
    }
}
