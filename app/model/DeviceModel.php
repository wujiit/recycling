<?php
/**
 * 品类、品牌与机型数据模型
 * 负责回收品类、品牌及具体机型/物品的管理与查询
 */

namespace App\Model;

class DeviceModel
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
     * 自动检测并补齐机型与分类核心字段
     */
    private function ensureColumns(): void
    {
        if (self::$columnsChecked) {
            return;
        }
        $cache = \App\Service\CacheService::getInstance();
        if ($cache->get('schema_ensured:device_v1')) {
            self::$columnsChecked = true;
            return;
        }
        self::$columnsChecked = true;

        try {
            // 自动检测并补齐 rc_category.unit
            $catUnit = $this->db->fetchOne("SHOW COLUMNS FROM `{$this->p}rc_category` LIKE 'unit'");
            if (empty($catUnit)) {
                @$this->db->execute("ALTER TABLE `{$this->p}rc_category` ADD COLUMN `unit` VARCHAR(32) NOT NULL DEFAULT '台' COMMENT '品类默认单位' AFTER `icon`");
            }

            // 自动检测并补齐 rc_device.unit 与 cover_img
            $devUnit = $this->db->fetchOne("SHOW COLUMNS FROM `{$this->p}rc_device` LIKE 'unit'");
            if (empty($devUnit)) {
                @$this->db->execute("ALTER TABLE `{$this->p}rc_device` ADD COLUMN `unit` VARCHAR(32) NOT NULL DEFAULT '台' COMMENT '计价单位' AFTER `guide_price`");
            }
            $devCover = $this->db->fetchOne("SHOW COLUMNS FROM `{$this->p}rc_device` LIKE 'cover_img'");
            if (empty($devCover)) {
                @$this->db->execute("ALTER TABLE `{$this->p}rc_device` ADD COLUMN `cover_img` VARCHAR(255) NOT NULL DEFAULT '/uploads/default/dev_default.svg' COMMENT '机型封面图' AFTER `name`");
            }

            // 自动检测并补齐机型筛选复合高频索引 (category_id, status, sort)
            $existingIndexes = $this->db->fetchAll("SHOW INDEX FROM `{$this->p}rc_device`");
            $indexNames = array_column($existingIndexes, 'Key_name');
            if (!in_array('idx_cat_status_sort', $indexNames, true)) {
                @$this->db->execute("ALTER TABLE `{$this->p}rc_device` ADD INDEX `idx_cat_status_sort` (`category_id`, `status`, `sort`)");
            }

            $cache->set('schema_ensured:device_v1', 1, 86400 * 30);
        } catch (\Throwable $e) {
            // 静默容灾
        }
    }

    /**
     * 获取全部品类列表
     */
    public function getCategoryList(bool $onlyShow = true): array
    {
        $where = $onlyShow ? "WHERE `is_show` = 1" : "";
        $sql = "SELECT `id`, `name`, `icon`, IFNULL(`unit`, '台') AS `unit`, `sort` FROM `{$this->p}rc_category` {$where} ORDER BY `sort` DESC, `id` ASC LIMIT 50";
        return $this->db->fetchAll($sql);
    }

    /**
     * 根据品类 ID 获取品牌列表
     */
    public function getBrandsByCategory(int $categoryId, int $limit = 50): array
    {
        $sql = "SELECT `id`, `category_id`, `name`, `logo`, `first_letter`, `sort`, `is_hot` 
                FROM `{$this->p}rc_brand` 
                WHERE `category_id` = ? 
                ORDER BY `is_hot` DESC, `sort` DESC, `first_letter` ASC LIMIT ?";
        return $this->db->fetchAll($sql, [$categoryId, $limit]);
    }

    /**
     * 获取指定机型详情
     */
    public function getDeviceById(int $id): ?array
    {
        $sql = "SELECT `d`.*, `b`.`name` AS `brand_name`, `c`.`name` AS `category_name`
                FROM `{$this->p}rc_device` `d`
                LEFT JOIN `{$this->p}rc_brand` `b` ON `d`.`brand_id` = `b`.`id`
                LEFT JOIN `{$this->p}rc_category` `c` ON `d`.`category_id` = `c`.`id`
                WHERE `d`.`id` = ? LIMIT 1";
        return $this->db->fetchOne($sql, [$id]);
    }

    /**
     * 检索机型列表 (支持搜索关键词与分类筛选及状态)
     */
    public function searchDevices(?int $categoryId, ?int $brandId, string $keyword, int $page = 1, int $pageSize = 20, ?int $status = 1): array
    {
        $conditions = ["1=1"];
        $params = [];

        if ($status !== null && $status !== -1) {
            $conditions[] = "`d`.`status` = ?";
            $params[] = $status;
        }
        if (!empty($categoryId)) {
            $conditions[] = "`d`.`category_id` = ?";
            $params[] = $categoryId;
        }
        if (!empty($brandId)) {
            $conditions[] = "`d`.`brand_id` = ?";
            $params[] = $brandId;
        }
        if ($keyword !== '') {
            $conditions[] = "`d`.`name` LIKE ?";
            $params[] = '%' . $keyword . '%';
        }

        $whereSql = implode(' AND ', $conditions);
        $offset = max(0, ($page - 1) * $pageSize);

        // 统计总数
        $countSql = "SELECT COUNT(*) as `total` FROM `{$this->p}rc_device` `d` WHERE {$whereSql}";
        $totalRow = $this->db->fetchOne($countSql, $params);
        $total = (int)($totalRow['total'] ?? 0);

        // 分页获取
        $sql = "SELECT `d`.`id`, `d`.`category_id`, `d`.`brand_id`, `d`.`name`, 
                       IFNULL(NULLIF(`d`.`cover_img`, ''), '/uploads/default/dev_default.svg') AS `cover_img`, 
                       `d`.`guide_price`, IFNULL(`d`.`unit`, IFNULL(`c`.`unit`, '台')) AS `unit`, 
                       `d`.`sort`, `d`.`is_hot`, `d`.`status`, 
                       `b`.`name` AS `brand_name`, `c`.`name` AS `category_name`
                FROM `{$this->p}rc_device` `d`
                LEFT JOIN `{$this->p}rc_brand` `b` ON `d`.`brand_id` = `b`.`id`
                LEFT JOIN `{$this->p}rc_category` `c` ON `d`.`category_id` = `c`.`id`
                WHERE {$whereSql}
                ORDER BY `d`.`is_hot` DESC, `d`.`sort` DESC, `d`.`id` DESC
                LIMIT {$offset}, {$pageSize}";
        $list = $this->db->fetchAll($sql, $params);

        return ['list' => $list, 'total' => $total, 'page' => $page, 'page_size' => $pageSize];
    }

    /**
     * 批量按比例或固定金额浮动调整指导价 (管理员高效运营)
     */
    public function batchAdjustPrice(?int $brandId, string $mode, float $value): int
    {
        $where = $brandId > 0 ? "WHERE `brand_id` = ?" : "";
        $now = time();

        if ($mode === 'percent') {
            // 按百分比浮动 (如 1.05 表示上浮 5%)
            $sql = "UPDATE `{$this->p}rc_device` SET `guide_price` = ROUND(`guide_price` * ?, 2), `updated_at` = ? {$where}";
        } else {
            // 按固定金额增减 (如 +50 或 -50)
            $sql = "UPDATE `{$this->p}rc_device` SET `guide_price` = GREATEST(10.00, `guide_price` + ?), `updated_at` = ? {$where}";
        }

        $params = [$value, $now];
        if ($brandId > 0) {
            $params[] = $brandId;
        }
        return $this->db->execute($sql, $params);
    }
}
