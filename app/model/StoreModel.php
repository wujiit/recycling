<?php
/**
 * 线下门店数据模型
 * 负责线下门店的新增、编辑、状态切换与到店服务管理
 */

declare(strict_types=1);

namespace App\Model;

class StoreModel
{
    private $db;
    private $p;
    private static $tableChecked = false;

    public function __construct()
    {
        $this->db = Database::getInstance();
        $this->p = $this->db->getPrefix();
        $this->ensureTable();
    }

    /**
     * 自愈式初始化检测门店数据表与预置默认门店
     */
    private function ensureTable(): void
    {
        if (self::$tableChecked) {
            return;
        }
        $cache = \App\Service\CacheService::getInstance();
        if ($cache->get('schema_ensured:store_v1')) {
            self::$tableChecked = true;
            return;
        }
        self::$tableChecked = true;

        try {
            $tables = $this->db->fetchAll("SHOW TABLES LIKE '{$this->p}rc_store'");
            if (empty($tables)) {
                $sql = "CREATE TABLE IF NOT EXISTS `{$this->p}rc_store` (
                    `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '门店ID',
                    `name` varchar(128) NOT NULL DEFAULT '' COMMENT '门店/网点名称',
                    `phone` varchar(32) NOT NULL DEFAULT '' COMMENT '门店联系电话/客服手机',
                    `address` varchar(255) NOT NULL DEFAULT '' COMMENT '详细地址(省市区门牌)',
                    `business_hours` varchar(128) NOT NULL DEFAULT '' COMMENT '营业时间说明',
                    `traffic_guide` varchar(255) NOT NULL DEFAULT '' COMMENT '交通路线指引',
                    `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT '状态: 1-营业中, 0-暂停营业',
                    `sort` int(11) NOT NULL DEFAULT 100 COMMENT '排序权重(数值越大越靠前)',
                    `is_default` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否默认门店: 1-是, 0-否',
                    `created_at` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '创建时间',
                    `updated_at` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '更新时间',
                    PRIMARY KEY (`id`),
                    KEY `idx_status` (`status`),
                    KEY `idx_sort` (`sort`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='线下门店与到店交投网点表'";
                $this->db->execute($sql);

                // 预置一家官方默认旗舰服务网点，保障即开即用
                $now = time();
                $insertDefaultSql = "INSERT INTO `{$this->p}rc_store` (
                    `name`, `phone`, `address`, `business_hours`, `traffic_guide`, `status`, `sort`, `is_default`, `created_at`, `updated_at`
                ) VALUES (?, ?, ?, ?, ?, 1, 100, 1, ?, ?)";
                $this->db->execute($insertDefaultSql, [
                    '启灵官方回收旗舰总店',
                    '400-800-8888',
                    '高新技术产业开发区科技大道88号综合回收服务大厦1层大厅',
                    '周一至周日 09:00 - 21:00',
                    '地铁直达/自驾前往提供专属临时停车位，到店现场快速验机结算',
                    $now,
                    $now
                ]);
            }
            $cache->set('schema_ensured:store_v1', 1, 86400 * 30);
        } catch (\Throwable $e) {
            $logDir = dirname(dirname(__DIR__)) . DIRECTORY_SEPARATOR . 'runtime' . DIRECTORY_SEPARATOR . 'logs';
            if (!is_dir($logDir)) {
                @mkdir($logDir, 0755, true);
            }
            @file_put_contents($logDir . DIRECTORY_SEPARATOR . date('Y-m-d') . '.log', sprintf("[%s] StoreModel ensureTable: %s\n", date('Y-m-d H:i:s'), $e->getMessage()), FILE_APPEND | LOCK_EX);
        }
    }

    /**
     * 获取门店列表
     * @param bool $activeOnly 是否仅查询营业中的门店
     * @param string $keyword 搜索关键词
     * @return array
     */
    public function getAllStores(bool $activeOnly = false, string $keyword = ''): array
    {
        $where = [];
        $params = [];

        if ($activeOnly) {
            $where[] = "`status` = 1";
        }

        if (!empty($keyword)) {
            $where[] = "(`name` LIKE ? OR `address` LIKE ? OR `phone` LIKE ?)";
            $k = '%' . $keyword . '%';
            $params[] = $k;
            $params[] = $k;
            $params[] = $k;
        }

        $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';
        $sql = "SELECT * FROM `{$this->p}rc_store` {$whereClause} ORDER BY `is_default` DESC, `sort` DESC, `id` ASC";

        return $this->db->fetchAll($sql, $params);
    }

    /**
     * 根据 ID 获取门店详情
     */
    public function getStoreById(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }
        $sql = "SELECT * FROM `{$this->p}rc_store` WHERE `id` = ? LIMIT 1";
        $store = $this->db->fetchOne($sql, [$id]);
        return $store ?: null;
    }

    /**
     * 获取默认推荐门店
     */
    public function getDefaultStore(): ?array
    {
        $sql = "SELECT * FROM `{$this->p}rc_store` WHERE `status` = 1 AND `is_default` = 1 LIMIT 1";
        $store = $this->db->fetchOne($sql);
        if (!$store) {
            // 没有特别设为默认的，取第一个有效门店
            $sql = "SELECT * FROM `{$this->p}rc_store` WHERE `status` = 1 ORDER BY `sort` DESC, `id` ASC LIMIT 1";
            $store = $this->db->fetchOne($sql);
        }
        return $store ?: null;
    }

    /**
     * 保存门店 (新增或更新)
     */
    public function saveStore(array $data): int
    {
        $id = (int)($data['id'] ?? 0);
        $name = trim((string)($data['name'] ?? ''));
        $phone = trim((string)($data['phone'] ?? ''));
        $address = trim((string)($data['address'] ?? ''));
        $businessHours = trim((string)($data['business_hours'] ?? '周一至周日 09:00 - 21:00'));
        $trafficGuide = trim((string)($data['traffic_guide'] ?? ''));
        $status = isset($data['status']) ? (int)$data['status'] : 1;
        $sort = isset($data['sort']) ? (int)$data['sort'] : 100;
        $isDefault = !empty($data['is_default']) ? 1 : 0;
        $now = time();

        if ($isDefault === 1) {
            // 若设置为默认门店，先重置其他门店的默认标记
            if ($id > 0) {
                $this->db->execute("UPDATE `{$this->p}rc_store` SET `is_default` = 0 WHERE `id` != ?", [$id]);
            } else {
                $this->db->execute("UPDATE `{$this->p}rc_store` SET `is_default` = 0");
            }
        }

        if ($id > 0) {
            $sql = "UPDATE `{$this->p}rc_store` SET
                `name` = ?, `phone` = ?, `address` = ?, `business_hours` = ?,
                `traffic_guide` = ?, `status` = ?, `sort` = ?, `is_default` = ?,
                `updated_at` = ?
                WHERE `id` = ?";
            $this->db->execute($sql, [
                $name, $phone, $address, $businessHours,
                $trafficGuide, $status, $sort, $isDefault,
                $now, $id
            ]);
            return $id;
        }

        $sql = "INSERT INTO `{$this->p}rc_store` (
            `name`, `phone`, `address`, `business_hours`,
            `traffic_guide`, `status`, `sort`, `is_default`,
            `created_at`, `updated_at`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $this->db->execute($sql, [
            $name, $phone, $address, $businessHours,
            $trafficGuide, $status, $sort, $isDefault,
            $now, $now
        ]);
        return (int)$this->db->lastInsertId();
    }

    /**
     * 删除门店
     */
    public function deleteStore(int $id): bool
    {
        if ($id <= 0) {
            return false;
        }
        $sql = "DELETE FROM `{$this->p}rc_store` WHERE `id` = ?";
        return $this->db->execute($sql, [$id]) > 0;
    }

    /**
     * 切换门店营业状态
     */
    public function toggleStatus(int $id): bool
    {
        $store = $this->getStoreById($id);
        if (!$store) {
            return false;
        }
        $newStatus = ((int)$store['status'] === 1) ? 0 : 1;
        $now = time();
        $sql = "UPDATE `{$this->p}rc_store` SET `status` = ?, `updated_at` = ? WHERE `id` = ?";
        return $this->db->execute($sql, [$newStatus, $now, $id]) > 0;
    }

    /**
     * 设置门店为默认门店
     */
    public function setDefault(int $id): bool
    {
        if ($id <= 0) {
            return false;
        }
        $this->db->beginTransaction();
        try {
            $this->db->execute("UPDATE `{$this->p}rc_store` SET `is_default` = 0");
            $this->db->execute("UPDATE `{$this->p}rc_store` SET `is_default` = 1, `status` = 1, `updated_at` = ? WHERE `id` = ?", [time(), $id]);
            $this->db->commit();
            return true;
        } catch (\Throwable $e) {
            $this->db->rollBack();
            return false;
        }
    }
}
