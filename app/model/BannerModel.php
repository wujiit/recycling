<?php
/**
 * 首页轮播广告模型
 * 负责首页轮播幻灯片数据的增删改查、排序、状态切换与展示
 */

declare(strict_types=1);

namespace App\Model;

use App\Service\CacheService;

class BannerModel
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
     * 自愈式初始化检测 Banner 数据表与预置默认图文
     */
    private function ensureTable(): void
    {
        if (self::$tableChecked) {
            return;
        }
        $cache = CacheService::getInstance();
        if ($cache->get('schema_ensured:banner_v1')) {
            self::$tableChecked = true;
            return;
        }
        self::$tableChecked = true;

        try {
            $tables = $this->db->fetchAll("SHOW TABLES LIKE '{$this->p}rc_banner'");
            if (empty($tables)) {
                $sql = "CREATE TABLE IF NOT EXISTS `{$this->p}rc_banner` (
                    `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Banner ID',
                    `title` varchar(128) NOT NULL DEFAULT '' COMMENT 'Banner大标题',
                    `subtitle` varchar(255) NOT NULL DEFAULT '' COMMENT 'Banner副标题/描述',
                    `badge` varchar(64) NOT NULL DEFAULT '' COMMENT '活动小角标',
                    `image_pc` varchar(255) NOT NULL DEFAULT '' COMMENT 'PC端宽屏画卷图URL',
                    `image_m` varchar(255) NOT NULL DEFAULT '' COMMENT '移动端图URL',
                    `link_type` varchar(32) NOT NULL DEFAULT 'none' COMMENT '跳转类型: category, device, action, url, none',
                    `link_value` varchar(255) NOT NULL DEFAULT '' COMMENT '网页端跳转目标值',
                    `link_miniapp` varchar(255) NOT NULL DEFAULT '' COMMENT '小程序端专属页面路径/行为(可选)',
                    `btn_text` varchar(64) NOT NULL DEFAULT '立即查看' COMMENT 'CTA按钮文案',
                    `sort_order` int(11) NOT NULL DEFAULT 100 COMMENT '排序权重(越小越靠前)',
                    `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT '状态: 1-启用, 0-禁用',
                    `created_at` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '创建时间',
                    `updated_at` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '更新时间',
                    PRIMARY KEY (`id`),
                    KEY `idx_status_sort` (`status`, `sort_order`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='首页轮播Banner广告表'";
                $this->db->execute($sql);

                // 预置 3 条高规格开箱即用行业级 Banner
                $now = time();
                $insertSql = "INSERT INTO `{$this->p}rc_banner` 
                    (`title`, `subtitle`, `badge`, `image_pc`, `image_m`, `link_type`, `link_value`, `link_miniapp`, `btn_text`, `sort_order`, `status`, `created_at`, `updated_at`) VALUES 
                    ('全品类高价回收 · 官方直营更放心', '官方标准透明报价 · 顺丰免费上门包邮 · 个人隐私安全清除', '官方保障', '/uploads/default/banner_digital.svg', '/uploads/default/banner_digital.svg', 'category', '1', '/pages/category/index', '立即估价', 10, 1, {$now}, {$now}),
                    ('废旧物资再生 · 绿色循环倡导者', '废铜废铝废钢 · 电缆电线 · 动力电池 · 上门过磅结算', '环保再生', '/uploads/default/banner_scrap.svg', '/uploads/default/banner_scrap.svg', 'action', 'appointment', '/pages/order/index', '一键呼叫上门', 20, 1, {$now}, {$now}),
                    ('名表黄金奢侈品 · 权威鉴定高额变现', '足金999按日实时结算 · 瑞士名表大牌箱包 · 顺丰保价密封', '尊享质检', '/uploads/default/banner_luxury.svg', '/uploads/default/banner_luxury.svg', 'category', '4', '/pages/category/index', '实时金价换算', 30, 1, {$now}, {$now})";
                $this->db->execute($insertSql);
            } else {
                // 自愈式升级：为既有表补齐 link_miniapp 字段
                $cols = $this->db->fetchAll("SHOW COLUMNS FROM `{$this->p}rc_banner` LIKE 'link_miniapp'");
                if (empty($cols)) {
                    $this->db->execute("ALTER TABLE `{$this->p}rc_banner` ADD COLUMN `link_miniapp` varchar(255) NOT NULL DEFAULT '' COMMENT '小程序端专属页面路径/行为(可选)' AFTER `link_value`");
                }
            }
            $cache->set('schema_ensured:banner_v1', 1, 86400 * 30);
        } catch (\Throwable $e) {
            // 静默容错
        }
    }

    /**
     * 获取 Banner 列表
     *
     * @param bool   $activeOnly 是否仅获取启用状态
     * @param string $keyword    搜索关键词 (标题/副标题)
     * @return array
     */
    public function getAllBanners(bool $activeOnly = false, string $keyword = ''): array
    {
        $sql = "SELECT * FROM `{$this->p}rc_banner` WHERE 1=1";
        $params = [];

        if ($activeOnly) {
            $sql .= " AND `status` = 1";
        }

        if (!empty($keyword)) {
            $sql .= " AND (`title` LIKE ? OR `subtitle` LIKE ? OR `badge` LIKE ?)";
            $k = '%' . $keyword . '%';
            $params[] = $k;
            $params[] = $k;
            $params[] = $k;
        }

        $sql .= " ORDER BY `sort_order` ASC, `id` ASC";

        return $this->db->fetchAll($sql, $params);
    }

    /**
     * 根据 ID 获取单个 Banner 详情
     *
     * @param int $id Banner ID
     * @return array|null
     */
    public function getBannerById(int $id): ?array
    {
        $sql = "SELECT * FROM `{$this->p}rc_banner` WHERE `id` = ? LIMIT 1";
        $row = $this->db->fetchOne($sql, [$id]);
        return $row ?: null;
    }

    /**
     * 新增或编辑保存 Banner
     *
     * @param array $data 数据载荷
     * @param int   $id   0 为新增，>0 为编辑更新
     * @return int 成功返回 Banner ID，失败返回 0
     */
    public function saveBanner(array $data, int $id = 0): int
    {
        $now = time();
        $title = trim((string)($data['title'] ?? ''));
        $subtitle = trim((string)($data['subtitle'] ?? ''));
        $badge = trim((string)($data['badge'] ?? ''));
        $imagePc = trim((string)($data['image_pc'] ?? ''));
        $imageM = trim((string)($data['image_m'] ?? '')) ?: $imagePc;
        $linkType = trim((string)($data['link_type'] ?? 'none'));
        $linkValue = trim((string)($data['link_value'] ?? ''));
        $linkMiniapp = trim((string)($data['link_miniapp'] ?? ''));
        $btnText = trim((string)($data['btn_text'] ?? '立即查看')) ?: '立即查看';
        $sortOrder = isset($data['sort_order']) ? (int)$data['sort_order'] : 100;
        $status = isset($data['status']) ? (int)$data['status'] : 1;

        if (empty($title)) {
            return 0;
        }

        if ($id > 0) {
            $sql = "UPDATE `{$this->p}rc_banner` SET 
                `title` = ?, 
                `subtitle` = ?, 
                `badge` = ?, 
                `image_pc` = ?, 
                `image_m` = ?, 
                `link_type` = ?, 
                `link_value` = ?, 
                `link_miniapp` = ?, 
                `btn_text` = ?, 
                `sort_order` = ?, 
                `status` = ?, 
                `updated_at` = ? 
                WHERE `id` = ?";
            $this->db->execute($sql, [
                $title, $subtitle, $badge, $imagePc, $imageM,
                $linkType, $linkValue, $linkMiniapp, $btnText, $sortOrder, $status, $now, $id
            ]);
            $this->clearCache();
            return $id;
        } else {
            $sql = "INSERT INTO `{$this->p}rc_banner` 
                (`title`, `subtitle`, `badge`, `image_pc`, `image_m`, `link_type`, `link_value`, `link_miniapp`, `btn_text`, `sort_order`, `status`, `created_at`, `updated_at`) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            $this->db->execute($sql, [
                $title, $subtitle, $badge, $imagePc, $imageM,
                $linkType, $linkValue, $linkMiniapp, $btnText, $sortOrder, $status, $now, $now
            ]);
            $newId = (int)$this->db->getLastInsertId();
            $this->clearCache();
            return $newId;
        }
    }

    /**
     * 删除指定 Banner
     *
     * @param int $id
     * @return bool
     */
    public function deleteBanner(int $id): bool
    {
        if ($id <= 0) {
            return false;
        }
        $sql = "DELETE FROM `{$this->p}rc_banner` WHERE `id` = ?";
        $this->db->execute($sql, [$id]);
        $this->clearCache();
        return true;
    }

    /**
     * 切换启停状态
     *
     * @param int $id
     * @return bool
     */
    public function toggleStatus(int $id): bool
    {
        $banner = $this->getBannerById($id);
        if (!$banner) {
            return false;
        }

        $newStatus = ((int)$banner['status'] === 1) ? 0 : 1;
        $now = time();
        $sql = "UPDATE `{$this->p}rc_banner` SET `status` = ?, `updated_at` = ? WHERE `id` = ?";
        $this->db->execute($sql, [$newStatus, $now, $id]);
        $this->clearCache();
        return true;
    }

    /**
     * 清理 Banner 与平台聚合前端缓存
     */
    public function clearCache(): void
    {
        $cache = CacheService::getInstance();
        $cache->delete('platform_info:appraisal');
        $cache->delete('banners:active');
    }
}
