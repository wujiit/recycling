<?php
/**
 * 启灵独立回收系统 - 前台菜单与多级导航业务服务
 * 职责：支持多级导航菜单配置与品类联动生成
 * 编码：UTF-8 无 BOM
 */

namespace App\Service;

use App\Model\Database;
use App\Model\DeviceModel;

class MenuService
{
    private $db;
    private $deviceModel;

    public function __construct()
    {
        $this->db = Database::getInstance();
        $this->deviceModel = new DeviceModel();
    }

    /**
     * 获取前台导航菜单树
     * @param bool $onlyActive 是否仅获取已启用的菜单 (前台展示用)
     * @return array
     */
    public function getMenus(bool $onlyActive = false): array
    {
        $p = $this->db->getPrefix();
        $sql = "SELECT `config_value` FROM `{$p}sys_config` WHERE `config_key` = 'site_nav_menu' LIMIT 1";
        $row = $this->db->fetchOne($sql);
        $raw = (string)($row['config_value'] ?? '');

        $menus = [];
        if (!empty($raw)) {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                $menus = $decoded;
            }
        }

        // 若尚未配置自定义菜单，自动从品类库生成默认菜单
        if (empty($menus)) {
            $menus = $this->generateDefaultFromCategories();
        }

        // 彻底清空图标杂质与历史图片路径，确保菜单纯粹简洁高雅
        foreach ($menus as &$m) {
            $m['icon'] = '';
            if (!empty($m['children']) && is_array($m['children'])) {
                foreach ($m['children'] as &$sub) {
                    $sub['icon'] = '';
                }
            }
        }
        unset($m, $sub);

        if ($onlyActive) {
            $menus = $this->filterActiveMenus($menus);
        }

        return $menus;
    }

    /**
     * 保存前台导航菜单树
     * @param array $menuList
     * @return array
     */
    public function saveMenus(array $menuList): array
    {
        $cleanTree = $this->normalizeMenuTree($menuList);
        $json = json_encode($cleanTree, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $p = $this->db->getPrefix();
        $sql = "INSERT INTO `{$p}sys_config` (`group_name`, `config_key`, `config_value`, `updated_at`) 
                VALUES ('system', 'site_nav_menu', ?, ?) 
                ON DUPLICATE KEY UPDATE `config_value` = VALUES(`config_value`), `updated_at` = VALUES(`updated_at`)";
        
        $this->db->execute($sql, [$json, time()]);

        // 导航菜单变更后主动清理缓存，实现热更新
        $cache = \App\Service\CacheService::getInstance();
        $cache->delete('sys_config:all');
        $cache->delete('platform_info:appraisal');

        return [
            'code' => 200,
            'msg'  => '前台自定义导航菜单已成功保存',
            'data' => $cleanTree
        ];
    }

    /**
     * 一键重置为基于现有品类库的默认导航菜单
     * @return array
     */
    public function resetDefaultMenus(): array
    {
        $defaults = $this->generateDefaultFromCategories();
        return $this->saveMenus($defaults);
    }

    /**
     * 从当前业务模板的品类库动态构建初始菜单结构
     * @return array
     */
    public function generateDefaultFromCategories(): array
    {
        $categories = $this->deviceModel->getCategoryList(true);

        $menuList = [];
        $menuId = 1;

        // 默认第一项：全部行业品类
        $menuList[] = [
            'id'        => $menuId++,
            'title'     => '全部行业品类',
            'type'      => 'category',
            'target_id' => 0,
            'url'       => '',
            'target'    => '_self',
            'icon'      => '',
            'badge'     => '',
            'sort'      => 1,
            'status'    => 1,
            'children'  => []
        ];

        // 遍历所有品类，每个品类作为独立主菜单项
        $sort = 2;
        foreach ($categories as $cat) {
            $catId = (int)$cat['id'];

            // 查询该品类下的知名品牌作为二级子菜单 (如苹果、华为、小米等)
            $brands = $this->deviceModel->getBrandsByCategory($catId, 6);

            $children = [];
            $childSort = 1;
            foreach ($brands as $b) {
                $children[] = [
                    'id'        => $menuId++,
                    'title'     => $b['name'],
                    'type'      => 'category',
                    'target_id' => $catId,
                    'url'       => '',
                    'target'    => '_self',
                    'icon'      => '',
                    'badge'     => '',
                    'sort'      => $childSort++,
                    'status'    => 1,
                    'children'  => []
                ];
            }

            $menuList[] = [
                'id'        => $menuId++,
                'title'     => $cat['name'],
                'type'      => 'category',
                'target_id' => $catId,
                'url'       => '',
                'target'    => '_self',
                'icon'      => '',
                'badge'     => '',
                'sort'      => $sort++,
                'status'    => 1,
                'children'  => $children
            ];
        }

        return $menuList;
    }

    /**
     * 清洗菜单树数据结构，防止 XSS 与异常数据
     * @param array $items
     * @return array
     */
    private function normalizeMenuTree(array $items): array
    {
        $clean = [];
        $seq = 1;

        foreach ($items as $item) {
            if (!is_array($item)) continue;

            $title = trim((string)($item['title'] ?? ''));
            if ($title === '') continue;

            $type = in_array($item['type'] ?? '', ['category', 'link']) ? $item['type'] : 'category';
            $targetId = (int)($item['target_id'] ?? 0);
            $url = trim((string)($item['url'] ?? ''));
            $target = ($item['target'] ?? '_self') === '_blank' ? '_blank' : '_self';
            $icon = trim((string)($item['icon'] ?? ''));
            $badge = trim((string)($item['badge'] ?? ''));
            $sort = isset($item['sort']) ? (int)$item['sort'] : $seq;
            $status = isset($item['status']) && (int)$item['status'] === 0 ? 0 : 1;

            $children = [];
            if (!empty($item['children']) && is_array($item['children'])) {
                $subSeq = 1;
                foreach ($item['children'] as $child) {
                    if (!is_array($child)) continue;
                    $childTitle = trim((string)($child['title'] ?? ''));
                    if ($childTitle === '') continue;

                    $childType = in_array($child['type'] ?? '', ['category', 'link']) ? $child['type'] : 'category';
                    $children[] = [
                        'id'        => (int)($child['id'] ?? (time() . $subSeq)),
                        'title'     => $childTitle,
                        'type'      => $childType,
                        'target_id' => (int)($child['target_id'] ?? 0),
                        'url'       => trim((string)($child['url'] ?? '')),
                        'target'    => ($child['target'] ?? '_self') === '_blank' ? '_blank' : '_self',
                        'icon'      => '',
                        'badge'     => trim((string)($child['badge'] ?? '')),
                        'sort'      => isset($child['sort']) ? (int)$child['sort'] : $subSeq,
                        'status'    => isset($child['status']) && (int)$child['status'] === 0 ? 0 : 1,
                        'children'  => []
                    ];
                    $subSeq++;
                }
            }

            $clean[] = [
                'id'        => (int)($item['id'] ?? (time() . $seq)),
                'title'     => $title,
                'type'      => $type,
                'target_id' => $targetId,
                'url'       => $url,
                'target'    => $target,
                'icon'      => '',
                'badge'     => $badge,
                'sort'      => $sort,
                'status'    => $status,
                'children'  => $children
            ];
            $seq++;
        }

        // 按 sort 排序
        usort($clean, function ($a, $b) {
            return $a['sort'] <=> $b['sort'];
        });

        return $clean;
    }

    /**
     * 过滤仅保留已启用的菜单项
     * @param array $tree
     * @return array
     */
    private function filterActiveMenus(array $tree): array
    {
        $filtered = [];
        foreach ($tree as $item) {
            if (isset($item['status']) && (int)$item['status'] === 0) {
                continue;
            }

            $activeChildren = [];
            if (!empty($item['children']) && is_array($item['children'])) {
                foreach ($item['children'] as $child) {
                    if (!isset($child['status']) || (int)$child['status'] === 1) {
                        $activeChildren[] = $child;
                    }
                }
            }
            $item['children'] = $activeChildren;
            $filtered[] = $item;
        }
        return $filtered;
    }
}
