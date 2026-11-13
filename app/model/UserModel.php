<?php
/**
 * 前台会员数据模型
 * 负责前台会员账号、资料与登录状态管理
 */

namespace App\Model;

class UserModel
{
    private $db;
    private $table;
    private static $columnsChecked = false;

    public function __construct()
    {
        $this->db = Database::getInstance();
        $this->table = $this->db->getPrefix() . 'rc_user';
        $this->ensureColumns();
    }

    /**
     * 自动检测并补齐用户表字段
     */
    private function ensureColumns(): void
    {
        if (self::$columnsChecked) {
            return;
        }
        $cache = \App\Service\CacheService::getInstance();
        if ($cache->get('schema_ensured:user_v1')) {
            self::$columnsChecked = true;
            return;
        }
        self::$columnsChecked = true;

        try {
            $cols = $this->db->fetchAll("SHOW COLUMNS FROM `{$this->table}` LIKE 'password_hash'");
            if (empty($cols)) {
                @$this->db->execute("ALTER TABLE `{$this->table}` ADD COLUMN `password_hash` varchar(255) NOT NULL DEFAULT '' COMMENT '登录密码哈希' AFTER `unionid`");
                @$this->db->execute("ALTER TABLE `{$this->table}` ADD COLUMN `realname` varchar(64) NOT NULL DEFAULT '' COMMENT '真实姓名' AFTER `nickname`");
                @$this->db->execute("ALTER TABLE `{$this->table}` ADD COLUMN `default_payout_type` varchar(32) NOT NULL DEFAULT 'alipay' COMMENT '默认收款方式' AFTER `avatar`");
                @$this->db->execute("ALTER TABLE `{$this->table}` ADD COLUMN `default_payout_name` varchar(64) NOT NULL DEFAULT '' COMMENT '默认收款人姓名' AFTER `default_payout_type`");
                @$this->db->execute("ALTER TABLE `{$this->table}` ADD COLUMN `default_payout_account` varchar(128) NOT NULL DEFAULT '' COMMENT '默认收款账号' AFTER `default_payout_name`");
                @$this->db->execute("ALTER TABLE `{$this->table}` ADD COLUMN `default_payout_bank` varchar(128) NOT NULL DEFAULT '' COMMENT '默认收款银行' AFTER `default_payout_account`");
                @$this->db->execute("ALTER TABLE `{$this->table}` ADD COLUMN `default_address` varchar(255) NOT NULL DEFAULT '' COMMENT '默认详细地址' AFTER `default_payout_bank`");
                @$this->db->execute("ALTER TABLE `{$this->table}` ADD COLUMN `last_login_time` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '最后登录时间' AFTER `status`");
                @$this->db->execute("ALTER TABLE `{$this->table}` ADD COLUMN `last_login_ip` varchar(45) NOT NULL DEFAULT '' COMMENT '最后登录IP' AFTER `last_login_time`");
            }
            // 补齐注册与登录 IP 及归属地字段
            $ipCol = $this->db->fetchAll("SHOW COLUMNS FROM `{$this->table}` LIKE 'register_ip'");
            if (empty($ipCol)) {
                @$this->db->execute("ALTER TABLE `{$this->table}` ADD COLUMN `register_ip` varchar(45) NOT NULL DEFAULT '' COMMENT '注册IP' AFTER `default_address`");
                @$this->db->execute("ALTER TABLE `{$this->table}` ADD COLUMN `register_location` varchar(128) NOT NULL DEFAULT '' COMMENT '注册归属地' AFTER `register_ip`");
                @$this->db->execute("ALTER TABLE `{$this->table}` ADD COLUMN `last_login_location` varchar(128) NOT NULL DEFAULT '' COMMENT '登录归属地' AFTER `last_login_ip`");
            }
            // 补齐账号注销流程字段
            $deregisterCol = $this->db->fetchAll("SHOW COLUMNS FROM `{$this->table}` LIKE 'deregister_status'");
            if (empty($deregisterCol)) {
                @$this->db->execute("ALTER TABLE `{$this->table}` ADD COLUMN `deregister_status` varchar(32) NOT NULL DEFAULT 'none' COMMENT '注销状态: none无, pending审核中, rejected已驳回' AFTER `status`");
                @$this->db->execute("ALTER TABLE `{$this->table}` ADD COLUMN `deregister_reason` varchar(255) NOT NULL DEFAULT '' COMMENT '注销申请原因' AFTER `deregister_status`");
                @$this->db->execute("ALTER TABLE `{$this->table}` ADD COLUMN `deregister_apply_time` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '注销申请时间' AFTER `deregister_reason`");
                @$this->db->execute("ALTER TABLE `{$this->table}` ADD COLUMN `deregister_reject_reason` varchar(255) NOT NULL DEFAULT '' COMMENT '注销驳回原因' AFTER `deregister_apply_time`");
            }

            // 补齐软删除字段 deleted_at
            $delCol = $this->db->fetchAll("SHOW COLUMNS FROM `{$this->table}` LIKE 'deleted_at'");
            if (empty($delCol)) {
                @$this->db->execute("ALTER TABLE `{$this->table}` ADD COLUMN `deleted_at` timestamp NULL DEFAULT NULL COMMENT '软删除时间戳' AFTER `updated_at`");
            }

            $cache->set('schema_ensured:user_v1', 1, 86400 * 30);
        } catch (\Throwable $e) {
            // 忽略错误
        }
    }

    /**
     * 根据主键 ID 查找用户 (自动过滤敏感密码)
     */
    public function findById(int $id): ?array
    {
        $sql = "SELECT `id`, `openid`, `unionid`, `mobile`, `nickname`, `realname`, `avatar`, 
                       `default_payout_type`, `default_payout_name`, `default_payout_account`, 
                       `default_payout_bank`, `default_address`, `register_ip`, `register_location`,
                       `status`, `deregister_status`, `deregister_reason`, `deregister_apply_time`, `deregister_reject_reason`,
                       `created_at`, `last_login_time`, `last_login_ip`, `last_login_location` 
                FROM `{$this->table}` WHERE `id` = ? AND `deleted_at` IS NULL LIMIT 1";
        return $this->db->fetchOne($sql, [$id]);
    }

    /**
     * 根据微信 OpenID 查找用户
     */
    public function findByOpenid(string $openid): ?array
    {
        $sql = "SELECT `id`, `openid`, `unionid`, `mobile`, `nickname`, `realname`, `avatar`, 
                       `default_payout_type`, `default_payout_name`, `default_payout_account`, 
                       `default_payout_bank`, `default_address`, `register_ip`, `register_location`,
                       `status`, `deregister_status`, `deregister_reason`, `deregister_apply_time`, `deregister_reject_reason`,
                       `created_at`, `last_login_time`, `last_login_ip`, `last_login_location` 
                FROM `{$this->table}` WHERE `openid` = ? AND `deleted_at` IS NULL LIMIT 1";
        return $this->db->fetchOne($sql, [$openid]);
    }

    /**
     * 根据手机号查找用户
     */
    public function findByMobile(string $mobile, bool $includePassword = false): ?array
    {
        $pwdField = $includePassword ? ", `password_hash`" : "";
        $sql = "SELECT `id`, `openid`, `unionid`, `mobile`, `nickname`, `realname`, `avatar`, 
                       `default_payout_type`, `default_payout_name`, `default_payout_account`, 
                       `default_payout_bank`, `default_address`, `register_ip`, `register_location`,
                       `status`, `deregister_status`, `deregister_reason`, `deregister_apply_time`, `deregister_reject_reason`,
                       `created_at`, `last_login_time`, `last_login_ip`, `last_login_location`{$pwdField} 
                FROM `{$this->table}` WHERE `mobile` = ? AND `deleted_at` IS NULL LIMIT 1";
        return $this->db->fetchOne($sql, [$mobile]);
    }

    /**
     * 创建新用户 (自动记录注册 IP 与归属地)
     */
    public function create(array $data): int
    {
        $now = time();
        $registerIp = !empty($data['register_ip']) ? $data['register_ip'] : \App\Common\Request::ip();
        $registerLoc = $data['register_location'] ?? '';
        if (empty($registerLoc) && !empty($registerIp)) {
            $geo = \App\Service\IpService::getInstance()->resolve($registerIp);
            $registerLoc = $geo['location'] ?? '';
        }

        $sql = "INSERT INTO `{$this->table}` (
            `openid`, `unionid`, `password_hash`, `mobile`, `nickname`, `realname`, `avatar`, 
            `default_payout_type`, `default_payout_name`, `default_payout_account`, `default_payout_bank`, 
            `default_address`, `register_ip`, `register_location`, `last_login_time`, `last_login_ip`, `last_login_location`,
            `status`, `created_at`, `updated_at`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)";
        
        $this->db->execute($sql, [
            $data['openid'] ?? '',
            $data['unionid'] ?? '',
            $data['password_hash'] ?? '',
            $data['mobile'] ?? '',
            $data['nickname'] ?? '新用户',
            $data['realname'] ?? '',
            $data['avatar'] ?? '',
            $data['default_payout_type'] ?? 'alipay',
            $data['default_payout_name'] ?? '',
            $data['default_payout_account'] ?? '',
            $data['default_payout_bank'] ?? '',
            $data['default_address'] ?? '',
            $registerIp,
            $registerLoc,
            $now,
            $registerIp,
            $registerLoc,
            $now,
            $now
        ]);
        return (int)$this->db->lastInsertId();
    }

    /**
     * 更新用户信息
     */
    public function update(int $id, array $data): int
    {
        $allowed = [
            'openid', 'unionid', 'mobile', 'nickname', 'realname', 'avatar', 'status', 'password_hash',
            'default_payout_type', 'default_payout_name', 'default_payout_account', 
            'default_payout_bank', 'default_address', 'register_ip', 'register_location',
            'last_login_ip', 'last_login_location',
            'deregister_status', 'deregister_reason', 'deregister_apply_time', 'deregister_reject_reason'
        ];
        $fields = [];
        $params = [];
        foreach ($data as $key => $val) {
            if (in_array($key, $allowed, true)) {
                $fields[] = "`{$key}` = ?";
                $params[] = $val;
            }
        }
        if (empty($fields)) {
            return 0;
        }

        $fields[] = "`updated_at` = ?";
        $params[] = time();
        $params[] = $id;

        $sql = "UPDATE `{$this->table}` SET " . implode(', ', $fields) . " WHERE `id` = ?";
        return $this->db->execute($sql, $params);
    }

    /**
     * 记录用户最后登录信息 (支持实时解析归属地)
     */
    public function recordLogin(int $id, string $ip, string $location = ''): void
    {
        if (empty($location) && !empty($ip)) {
            $geo = \App\Service\IpService::getInstance()->resolve($ip);
            $location = $geo['location'] ?? '';
        }
        $sql = "UPDATE `{$this->table}` SET `last_login_time` = ?, `last_login_ip` = ?, `last_login_location` = ? WHERE `id` = ?";
        $this->db->execute($sql, [time(), $ip, $location, $id]);
    }

    /**
     * 检测用户当前是否拥有正在履约中的订单 (用于注销合规前置拦截)
     */
    public function hasActiveOrders(int $userId): bool
    {
        $p = $this->db->getPrefix();
        $sql = "SELECT `id` FROM `{$p}rc_order` 
                WHERE `user_id` = ? AND `status` IN ('pending_send', 'in_transit', 'received', 'inspecting', 'price_confirming') 
                LIMIT 1";
        return $this->db->fetchOne($sql, [$userId]) !== null;
    }

    /**
     * 获取用户订单全流程概览看板统计
     */
    public function getUserOrderStatistics(int $userId): array
    {
        $p = $this->db->getPrefix();
        $sql = "SELECT 
                    COUNT(*) AS `total_orders`,
                    SUM(CASE WHEN `status` = 'pending_send' THEN 1 ELSE 0 END) AS `pending_send_count`,
                    SUM(CASE WHEN `status` = 'in_transit' THEN 1 ELSE 0 END) AS `in_transit_count`,
                    SUM(CASE WHEN `status` IN ('received', 'inspecting') THEN 1 ELSE 0 END) AS `inspecting_count`,
                    SUM(CASE WHEN `status` = 'price_confirming' THEN 1 ELSE 0 END) AS `price_confirming_count`,
                    SUM(CASE WHEN `status` = 'completed' THEN 1 ELSE 0 END) AS `completed_count`,
                    SUM(CASE WHEN `status` = 'completed' THEN `final_price` ELSE 0 END) AS `total_income`
                FROM `{$p}rc_order` 
                WHERE `user_id` = ?";
        $stats = $this->db->fetchOne($sql, [$userId]);
        return [
            'total_orders'           => (int)($stats['total_orders'] ?? 0),
            'pending_send_count'     => (int)($stats['pending_send_count'] ?? 0),
            'in_transit_count'       => (int)($stats['in_transit_count'] ?? 0),
            'inspecting_count'       => (int)($stats['inspecting_count'] ?? 0),
            'price_confirming_count' => (int)($stats['price_confirming_count'] ?? 0),
            'completed_count'        => (int)($stats['completed_count'] ?? 0),
            'total_income'           => number_format((float)($stats['total_income'] ?? 0), 2, '.', '')
        ];
    }
}
