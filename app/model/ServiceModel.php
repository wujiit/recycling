<?php
/**
 * 启灵同城生活服务 - 服务类目、项目与规格数据模型
 * 负责同城综合生活服务（家电清洗、保洁、维修、上门遛狗、跑腿等）分类、项目及规格管理
 * 编码：UTF-8 无 BOM
 */

namespace App\Model;

use App\Service\CacheService;

class ServiceModel
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
     * 自动检测并初始化服务类目、项目与规格数据表
     */
    private function ensureTables(): void
    {
        if (self::$tablesChecked) {
            return;
        }
        $cache = CacheService::getInstance();
        if ($cache->get('schema_ensured:service_v1')) {
            self::$tablesChecked = true;
            return;
        }
        self::$tablesChecked = true;

        try {
            // 1. 服务分类表 (rc_service_category)
            $catSql = "CREATE TABLE IF NOT EXISTS `{$this->p}rc_service_category` (
                `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '分类ID',
                `name` varchar(64) NOT NULL DEFAULT '' COMMENT '服务分类名称',
                `biz_type` varchar(32) NOT NULL DEFAULT 'service' COMMENT '所属大板块: service-上门服务, errand-同城跑腿',
                `icon` varchar(255) NOT NULL DEFAULT '' COMMENT '分类图标URL',
                `sort` int(11) NOT NULL DEFAULT 0 COMMENT '排序权重(越大越前)',
                `is_show` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否展示: 1-显示, 0-隐藏',
                `created_at` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '创建时间',
                `updated_at` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '更新时间',
                PRIMARY KEY (`id`),
                KEY `idx_biz_show` (`biz_type`, `is_show`, `sort`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='同城服务分类表'";
            $this->db->execute($catSql);

            // 2. 服务项目主表 (rc_service_item)
            $itemSql = "CREATE TABLE IF NOT EXISTS `{$this->p}rc_service_item` (
                `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '项目ID',
                `category_id` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '所属分类ID',
                `biz_type` varchar(32) NOT NULL DEFAULT 'service' COMMENT '所属业务板块: service-上门服务, errand-同城跑腿',
                `title` varchar(128) NOT NULL DEFAULT '' COMMENT '服务项目名称',
                `sub_title` varchar(255) NOT NULL DEFAULT '' COMMENT '副标题/服务卖点摘要',
                `cover_image` varchar(255) NOT NULL DEFAULT '' COMMENT '封面头图URL',
                `banner_images` text NULL COMMENT '多图轮播相册JSON',
                `price` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT '基础展示起步价',
                `original_price` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT '市场划线参考原价',
                `price_unit` varchar(32) NOT NULL DEFAULT '次' COMMENT '计价单位: 次, 小时, 台, ㎡, 单',
                `pricing_type` varchar(32) NOT NULL DEFAULT 'fixed' COMMENT '定价方式: fixed-一口价, spec-多规格阶梯价, deposit-预约意向定金',
                `service_duration` int(11) NOT NULL DEFAULT 60 COMMENT '预计服务耗时(分钟)',
                `guarantee_tags` varchar(255) NOT NULL DEFAULT '' COMMENT '官方服务保障标签逗号分隔',
                `notice_tips` text NULL COMMENT '服务须知与预约规则',
                `content_detail` longtext NULL COMMENT '服务详情图文/作业流程',
                `sales_count` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '累计服务单数',
                `is_hot` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否精选热门推荐',
                `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT '状态: 1-上架营业中, 0-已下架',
                `sort` int(11) NOT NULL DEFAULT 0 COMMENT '排序权重',
                `created_at` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '创建时间',
                `updated_at` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '更新时间',
                PRIMARY KEY (`id`),
                KEY `idx_cat_status` (`category_id`, `status`, `sort`),
                KEY `idx_biz_status` (`biz_type`, `status`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='同城生活服务项目表'";
            $this->db->execute($itemSql);

            // 3. 服务项目规格与加项细则表 (rc_service_spec)
            $specSql = "CREATE TABLE IF NOT EXISTS `{$this->p}rc_service_spec` (
                `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '规格ID',
                `service_id` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '关联服务项目ID',
                `spec_name` varchar(128) NOT NULL DEFAULT '' COMMENT '规格/套餐名',
                `spec_price` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT '该规格独立价格',
                `spec_unit` varchar(32) NOT NULL DEFAULT '' COMMENT '该规格计价单位',
                `spec_desc` varchar(255) NOT NULL DEFAULT '' COMMENT '规格说明/适用场景',
                `sort` int(11) NOT NULL DEFAULT 0 COMMENT '排序权重',
                `is_default` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否为默认选中规格: 1-是, 0-否',
                `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT '状态: 1-启用, 0-停用',
                `created_at` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '创建时间',
                PRIMARY KEY (`id`),
                KEY `idx_service` (`service_id`, `status`, `sort`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='服务规格与加项表'";
            $this->db->execute($specSql);

            // 初始化默认服务分类数据
            $catCount = $this->db->fetchOne("SELECT COUNT(*) AS `c` FROM `{$this->p}rc_service_category`");
            if ((int)($catCount['c'] ?? 0) === 0) {
                $now = time();
                $seedCats = [
                    ['家电清洗', 'service', '/uploads/default/icon_cleaning.svg', 100],
                    ['家庭保洁', 'service', '/uploads/default/icon_housekeep.svg', 90],
                    ['上门维修', 'service', '/uploads/default/icon_repair.svg', 80],
                    ['宠物生活', 'service', '/uploads/default/icon_pet.svg', 70],
                    ['同城跑腿', 'errand',  '/uploads/default/icon_errand.svg', 60],
                ];
                $seedSql = "INSERT INTO `{$this->p}rc_service_category` (`name`, `biz_type`, `icon`, `sort`, `is_show`, `created_at`, `updated_at`) VALUES (?, ?, ?, ?, 1, ?, ?)";
                foreach ($seedCats as $sc) {
                    $this->db->execute($seedSql, [$sc[0], $sc[1], $sc[2], $sc[3], $now, $now]);
                }
            }

            $cache->set('schema_ensured:service_v1', 1, 86400 * 30);
        } catch (\Throwable $e) {
            // 静默容灾
        }
    }

    // ==========================================
    // 1. 服务分类 (Category) 操作方法
    // ==========================================

    /**
     * 获取服务分类列表 (支持业务板块筛选)
     */
    public function getCategoryList(string $bizType = 'service', bool $onlyShow = true): array
    {
        $conditions = [];
        $params = [];

        if ($onlyShow) {
            $conditions[] = "`is_show` = 1";
        }
        if (!empty($bizType) && $bizType !== 'all') {
            $conditions[] = "`biz_type` = ?";
            $params[] = $bizType;
        }

        $whereSql = !empty($conditions) ? "WHERE " . implode(' AND ', $conditions) : "";
        $sql = "SELECT `id`, `name`, `biz_type`, `icon`, `sort`, `is_show` 
                FROM `{$this->p}rc_service_category` 
                {$whereSql} 
                ORDER BY `sort` DESC, `id` ASC";
        $list = $this->db->fetchAll($sql, $params);
        foreach ($list as &$c) {
            $c['sort_order'] = (int)$c['sort'];
            $c['status'] = ((int)$c['is_show'] === 1) ? 'active' : 'inactive';
        }
        unset($c);
        return $list;
    }

    /**
     * 根据 ID 获取分类详情
     */
    public function getCategoryById(int $id): ?array
    {
        $sql = "SELECT * FROM `{$this->p}rc_service_category` WHERE `id` = ? LIMIT 1";
        return $this->db->fetchOne($sql, [$id]);
    }

    /**
     * 保存/更新服务分类
     */
    public function saveCategory(array $data): int
    {
        $id = (int)($data['id'] ?? 0);
        $name = trim((string)($data['name'] ?? ''));
        $bizType = trim((string)($data['biz_type'] ?? 'service'));
        $icon = trim((string)($data['icon'] ?? ''));
        $sort = (int)($data['sort'] ?? 0);
        $isShow = isset($data['is_show']) ? (int)$data['is_show'] : 1;
        $now = time();

        if ($id > 0) {
            $sql = "UPDATE `{$this->p}rc_service_category` 
                    SET `name` = ?, `biz_type` = ?, `icon` = ?, `sort` = ?, `is_show` = ?, `updated_at` = ? 
                    WHERE `id` = ?";
            $this->db->execute($sql, [$name, $bizType, $icon, $sort, $isShow, $now, $id]);
            return $id;
        } else {
            $sql = "INSERT INTO `{$this->p}rc_service_category` (`name`, `biz_type`, `icon`, `sort`, `is_show`, `created_at`, `updated_at`) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)";
            $this->db->execute($sql, [$name, $bizType, $icon, $sort, $isShow, $now, $now]);
            return (int)$this->db->lastInsertId();
        }
    }

    /**
     * 删除服务分类 (若存在关联服务项目则拦截保护)
     */
    public function deleteCategory(int $id, ?string &$errorMsg = null): bool
    {
        $itemCount = $this->db->fetchOne("SELECT COUNT(*) as `c` FROM `{$this->p}rc_service_item` WHERE `category_id` = ?", [$id]);
        if ((int)($itemCount['c'] ?? 0) > 0) {
            $errorMsg = '该分类下存在已发布的服务项目，请先将项目迁移或删除后再删除分类';
            return false;
        }

        $sql = "DELETE FROM `{$this->p}rc_service_category` WHERE `id` = ?";
        return $this->db->execute($sql, [$id]) > 0;
    }

    // ==========================================
    // 2. 服务项目 (Service Item) 操作方法
    // ==========================================

    /**
     * 搜索查询服务项目列表 (支持多维组合筛选与分页)
     */
    public function searchItems(array $filter = [], int $page = 1, int $pageSize = 15): array
    {
        $conditions = ["1=1"];
        $params = [];

        if (isset($filter['status']) && $filter['status'] !== -1 && $filter['status'] !== 'all' && $filter['status'] !== '') {
            $rawStatus = $filter['status'];
            $stInt = -1;
            if ($rawStatus === 'active' || $rawStatus === '1' || $rawStatus === 1) {
                $stInt = 1;
            } elseif ($rawStatus === 'inactive' || $rawStatus === '0' || $rawStatus === 0) {
                $stInt = 0;
            }
            if ($stInt !== -1) {
                $conditions[] = "`i`.`status` = ?";
                $params[] = $stInt;
            }
        }
        if (!empty($filter['category_id']) && (int)$filter['category_id'] > 0) {
            $conditions[] = "`i`.`category_id` = ?";
            $params[] = (int)$filter['category_id'];
        }
        if (!empty($filter['biz_type']) && $filter['biz_type'] !== 'all') {
            $conditions[] = "`i`.`biz_type` = ?";
            $params[] = $filter['biz_type'];
        }
        if (isset($filter['is_hot']) && $filter['is_hot'] !== '' && $filter['is_hot'] !== 'all') {
            $conditions[] = "`i`.`is_hot` = ?";
            $params[] = (int)$filter['is_hot'];
        }
        if (!empty($filter['keyword'])) {
            $conditions[] = "(`i`.`title` LIKE ? OR `i`.`sub_title` LIKE ?)";
            $like = '%' . trim((string)$filter['keyword']) . '%';
            $params[] = $like;
            $params[] = $like;
        }

        $whereSql = implode(' AND ', $conditions);
        $offset = max(0, ($page - 1) * $pageSize);

        $countSql = "SELECT COUNT(*) as `total` FROM `{$this->p}rc_service_item` `i` WHERE {$whereSql}";
        $totalRow = $this->db->fetchOne($countSql, $params);
        $total = (int)($totalRow['total'] ?? 0);

        $sql = "SELECT `i`.`id`, `i`.`category_id`, `i`.`biz_type`, `i`.`title`, `i`.`sub_title`, 
                       `i`.`cover_image`, `i`.`price`, `i`.`original_price`, `i`.`price_unit`, 
                       `i`.`pricing_type`, `i`.`service_duration`, `i`.`guarantee_tags`, 
                       `i`.`sales_count`, `i`.`is_hot`, `i`.`status`, `i`.`sort`, `i`.`created_at`,
                       `c`.`name` AS `category_name`,
                       (SELECT COUNT(*) FROM `{$this->p}rc_service_spec` WHERE `service_id` = `i`.`id`) AS `specs_count`
                FROM `{$this->p}rc_service_item` `i`
                LEFT JOIN `{$this->p}rc_service_category` `c` ON `i`.`category_id` = `c`.`id`
                WHERE {$whereSql}
                ORDER BY `i`.`is_hot` DESC, `i`.`sort` DESC, `i`.`id` DESC
                LIMIT {$offset}, {$pageSize}";
        $list = $this->db->fetchAll($sql, $params);

        foreach ($list as &$item) {
            $item['base_price'] = $item['price'];
            $item['unit'] = $item['price_unit'];
            $item['sort_order'] = $item['sort'];
            $item['specs_count'] = (int)($item['specs_count'] ?? 0);
        }
        unset($item);

        return [
            'list'      => $list,
            'total'     => $total,
            'page'      => $page,
            'page_size' => $pageSize
        ];
    }

    /**
     * 获取精选推荐服务项目列表
     */
    public function getHotItems(int $limit = 6, string $bizType = 'service'): array
    {
        $params = [];
        $where = ["`status` = 1"];
        if (!empty($bizType) && $bizType !== 'all') {
            $where[] = "`biz_type` = ?";
            $params[] = $bizType;
        }
        $whereSql = implode(' AND ', $where);

        $sql = "SELECT `id`, `category_id`, `biz_type`, `title`, `sub_title`, `cover_image`, 
                       `price`, `original_price`, `price_unit`, `guarantee_tags`, `sales_count`
                FROM `{$this->p}rc_service_item`
                WHERE {$whereSql}
                ORDER BY `is_hot` DESC, `sort` DESC, `id` DESC
                LIMIT {$limit}";
        return $this->db->fetchAll($sql, $params);
    }

    /**
     * 根据 ID 获取服务项目完整详情 (附带相册、保障标签与规格列表)
     */
    public function getItemById(int $id, bool $withSpecs = true): ?array
    {
        $sql = "SELECT `i`.*, `c`.`name` AS `category_name`
                FROM `{$this->p}rc_service_item` `i`
                LEFT JOIN `{$this->p}rc_service_category` `c` ON `i`.`category_id` = `c`.`id`
                WHERE `i`.`id` = ? LIMIT 1";
        $item = $this->db->fetchOne($sql, [$id]);
        if (!$item) {
            return null;
        }

        // 解析相册 JSON
        if (!empty($item['banner_images'])) {
            $decoded = json_decode($item['banner_images'], true);
            $item['banner_images_list'] = is_array($decoded) ? $decoded : [];
        } else {
            $item['banner_images_list'] = !empty($item['cover_image']) ? [$item['cover_image']] : [];
        }

        // 解析保障标签
        $item['guarantee_tags_list'] = !empty($item['guarantee_tags']) 
            ? array_filter(array_map('trim', explode(',', $item['guarantee_tags']))) 
            : [];

        if ($withSpecs) {
            $item['specs'] = $this->getSpecsByServiceId($id, false);
        }

        // 统一别名映射，保证所有控制器与前端视图调用无缝兼容
        $item['base_price'] = $item['price'];
        $item['unit'] = $item['price_unit'];
        $item['sort_order'] = $item['sort'];
        $item['content'] = $item['content_detail'];
        $item['instructions'] = $item['notice_tips'];

        return $item;
    }

    /**
     * 保存/更新服务项目 (主表及多规格联合写入)
     */
    public function saveItem(array $data): int
    {
        $id = (int)($data['id'] ?? 0);
        $categoryId = (int)($data['category_id'] ?? 0);
        $bizType = trim((string)($data['biz_type'] ?? 'service'));
        $title = trim((string)($data['title'] ?? ''));
        $subTitle = trim((string)($data['sub_title'] ?? ''));
        $coverImage = trim((string)($data['cover_image'] ?? ''));
        $price = (float)($data['price'] ?? 0.00);
        $originalPrice = (float)($data['original_price'] ?? 0.00);
        $priceUnit = trim((string)($data['price_unit'] ?? '次'));
        $pricingType = trim((string)($data['pricing_type'] ?? 'fixed'));
        $serviceDuration = (int)($data['service_duration'] ?? 60);
        $guaranteeTags = trim((string)($data['guarantee_tags'] ?? ''));
        $noticeTips = (string)($data['notice_tips'] ?? '');
        $contentDetail = (string)($data['content_detail'] ?? '');
        $salesCount = (int)($data['sales_count'] ?? 0);
        $isHot = isset($data['is_hot']) ? (int)$data['is_hot'] : 0;
        $status = isset($data['status']) ? (int)$data['status'] : 1;
        $sort = (int)($data['sort'] ?? 0);
        $now = time();

        $bannerImages = '';
        if (isset($data['banner_images_list']) && is_array($data['banner_images_list'])) {
            $bannerImages = json_encode($data['banner_images_list'], JSON_UNESCAPED_UNICODE);
        } elseif (isset($data['banner_images'])) {
            $bannerImages = is_string($data['banner_images']) ? $data['banner_images'] : json_encode($data['banner_images'], JSON_UNESCAPED_UNICODE);
        }

        if ($id > 0) {
            $sql = "UPDATE `{$this->p}rc_service_item` SET
                    `category_id` = ?, `biz_type` = ?, `title` = ?, `sub_title` = ?, `cover_image` = ?, `banner_images` = ?,
                    `price` = ?, `original_price` = ?, `price_unit` = ?, `pricing_type` = ?, `service_duration` = ?,
                    `guarantee_tags` = ?, `notice_tips` = ?, `content_detail` = ?, `sales_count` = ?,
                    `is_hot` = ?, `status` = ?, `sort` = ?, `updated_at` = ?
                    WHERE `id` = ?";
            $this->db->execute($sql, [
                $categoryId, $bizType, $title, $subTitle, $coverImage, $bannerImages,
                $price, $originalPrice, $priceUnit, $pricingType, $serviceDuration,
                $guaranteeTags, $noticeTips, $contentDetail, $salesCount,
                $isHot, $status, $sort, $now, $id
            ]);
            $itemId = $id;
        } else {
            $sql = "INSERT INTO `{$this->p}rc_service_item` (
                    `category_id`, `biz_type`, `title`, `sub_title`, `cover_image`, `banner_images`,
                    `price`, `original_price`, `price_unit`, `pricing_type`, `service_duration`,
                    `guarantee_tags`, `notice_tips`, `content_detail`, `sales_count`,
                    `is_hot`, `status`, `sort`, `created_at`, `updated_at`
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            $this->db->execute($sql, [
                $categoryId, $bizType, $title, $subTitle, $coverImage, $bannerImages,
                $price, $originalPrice, $priceUnit, $pricingType, $serviceDuration,
                $guaranteeTags, $noticeTips, $contentDetail, $salesCount,
                $isHot, $status, $sort, $now, $now
            ]);
            $itemId = (int)$this->db->lastInsertId();
        }

        // 同步保存规格列表
        if (isset($data['specs']) && is_array($data['specs'])) {
            $this->syncItemSpecs($itemId, $data['specs']);
        }

        return $itemId;
    }

    /**
     * 删除服务项目及其规格
     */
    public function deleteItem(int $id): bool
    {
        $this->db->execute("DELETE FROM `{$this->p}rc_service_spec` WHERE `service_id` = ?", [$id]);
        return $this->db->execute("DELETE FROM `{$this->p}rc_service_item` WHERE `id` = ?", [$id]) > 0;
    }

    /**
     * 快速更新项目上下架状态
     */
    public function updateItemStatus(int $id, int $status): bool
    {
        $sql = "UPDATE `{$this->p}rc_service_item` SET `status` = ?, `updated_at` = ? WHERE `id` = ?";
        return $this->db->execute($sql, [$status, time(), $id]) > 0;
    }

    // ==========================================
    // 3. 服务规格 (Service Spec) 操作方法
    // ==========================================

    /**
     * 获取指定服务项目的规格列表
     */
    public function getSpecsByServiceId(int $serviceId, bool $onlyActive = true): array
    {
        $where = $onlyActive ? "AND `status` = 1" : "";
        $sql = "SELECT `id`, `service_id`, `spec_name`, `spec_price`, `spec_unit`, `spec_desc`, `sort`, `is_default`, `status`
                FROM `{$this->p}rc_service_spec`
                WHERE `service_id` = ? {$where}
                ORDER BY `is_default` DESC, `sort` DESC, `id` ASC";
        $list = $this->db->fetchAll($sql, [$serviceId]);

        foreach ($list as &$s) {
            $s['price'] = (float)$s['spec_price'];
            $s['spec_price'] = (float)$s['spec_price'];
            $s['unit'] = $s['spec_unit'];
            $s['desc'] = $s['spec_desc'];
            $s['sort_order'] = (int)$s['sort'];
        }
        unset($s);

        return $list;
    }

    /**
     * 同步全套规格项 (全量更新或按需原子替换)
     */
    public function syncItemSpecs(int $serviceId, array $specs): void
    {
        if ($serviceId <= 0) {
            return;
        }

        $now = time();
        $existing = $this->getSpecsByServiceId($serviceId, false);
        $existingIds = array_column($existing, 'id');
        $keptIds = [];

        foreach ($specs as $spec) {
            $specId = (int)($spec['id'] ?? 0);
            $name = trim((string)($spec['spec_name'] ?? $spec['name'] ?? ''));
            if (empty($name)) {
                continue;
            }
            $price = (float)($spec['spec_price'] ?? $spec['price'] ?? 0.00);
            $unit = trim((string)($spec['spec_unit'] ?? $spec['unit'] ?? ''));
            $desc = trim((string)($spec['spec_desc'] ?? $spec['desc'] ?? ''));
            $sort = (int)($spec['sort'] ?? $spec['sort_order'] ?? 0);
            $isDefault = !empty($spec['is_default']) ? 1 : 0;
            $status = isset($spec['status']) ? (int)$spec['status'] : 1;

            if ($specId > 0 && in_array($specId, $existingIds, true)) {
                $sql = "UPDATE `{$this->p}rc_service_spec` 
                        SET `spec_name` = ?, `spec_price` = ?, `spec_unit` = ?, `spec_desc` = ?, `sort` = ?, `is_default` = ?, `status` = ?
                        WHERE `id` = ? AND `service_id` = ?";
                $this->db->execute($sql, [$name, $price, $unit, $desc, $sort, $isDefault, $status, $specId, $serviceId]);
                $keptIds[] = $specId;
            } else {
                $sql = "INSERT INTO `{$this->p}rc_service_spec` 
                        (`service_id`, `spec_name`, `spec_price`, `spec_unit`, `spec_desc`, `sort`, `is_default`, `status`, `created_at`)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
                $this->db->execute($sql, [$serviceId, $name, $price, $unit, $desc, $sort, $isDefault, $status, $now]);
                $keptIds[] = (int)$this->db->lastInsertId();
            }
        }

        // 删除已被前端移除的旧规格
        $toDelete = array_diff($existingIds, $keptIds);
        if (!empty($toDelete)) {
            $placeholders = implode(',', array_fill(0, count($toDelete), '?'));
            $this->db->execute("DELETE FROM `{$this->p}rc_service_spec` WHERE `id` IN ({$placeholders})", array_values($toDelete));
        }
    }
}
