<?php
/**
 * 机型库配置控制器
 * 支持机型上下架、指导价编辑、批量调价与问答管理
 */

namespace App\Controller\Admin;

use App\Controller\Admin\AdminBaseController;
use App\Common\Request;
use App\Model\Database;
use App\Model\DeviceModel;
use App\Model\QuestionModel;
use App\Service\CacheService;

class DeviceController extends AdminBaseController
{
    private $deviceModel;
    private $questionModel;
    private $db;

    public function __construct()
    {
        parent::__construct();
        $this->deviceModel = new DeviceModel();
        $this->questionModel = new QuestionModel();
        $this->db = Database::getInstance();
    }

    /**
     * 机型列表 (支持分类、品牌、搜索筛选、状态筛选)
     */
    public function list(): void
    {
        $catId = Request::getInt('category_id', 0) ?: null;
        $brandId = Request::getInt('brand_id', 0) ?: null;
        $keyword = (string)Request::get('keyword', '');
        $statusParam = Request::get('status', 'all');
        $status = ($statusParam === 'all' || $statusParam === '') ? null : (int)$statusParam;
        $page = Request::getInt('page', 1);
        $pageSize = Request::getInt('page_size', 20);

        $res = $this->deviceModel->searchDevices($catId, $brandId, $keyword, $page, $pageSize, $status);
        $this->success($res, '获取机型列表成功');
    }

    /**
     * 删除机型
     */
    public function delete(): void
    {
        $id = Request::postInt('id', 0);
        if ($id <= 0) {
            $this->error('机型 ID 不能为空');
        }
        $p = $this->db->getPrefix();
        $this->db->execute("DELETE FROM `{$p}rc_device` WHERE `id` = ?", [$id]);
        CacheService::getInstance()->delete('device_matrix:' . $id);
        $this->success(null, '机型已成功删除');
    }

    /**
     * 获取全部分类
     */
    public function categories(): void
    {
        $p = $this->db->getPrefix();
        $sql = "SELECT `c`.`id`, `c`.`name`, `c`.`icon`, IFNULL(`c`.`unit`, '台') AS `unit`, `c`.`sort`, `c`.`is_show`,
                       (SELECT COUNT(*) FROM `{$p}rc_device` `d` WHERE `d`.`category_id` = `c`.`id`) AS `device_count`
                FROM `{$p}rc_category` `c`
                ORDER BY `c`.`sort` DESC, `c`.`id` ASC";
        $categories = $this->db->fetchAll($sql);
        $this->success($categories, '获取分类成功');
    }

    /**
     * 保存或更新分类
     */
    public function saveCategory(): void
    {
        $id = Request::postInt('id', 0);
        $name = trim((string)Request::post('name', ''));
        $icon = (string)Request::post('icon', '/uploads/default/cat_default.png');
        $unit = trim((string)Request::post('unit', '台'));
        $sort = Request::postInt('sort', 50);
        $isShow = Request::postInt('is_show', 1);

        if (empty($name)) {
            $this->error('品类名称不能为空');
        }

        $p = $this->db->getPrefix();
        $now = time();
        if ($id > 0) {
            $sql = "UPDATE `{$p}rc_category` SET `name` = ?, `icon` = ?, `unit` = ?, `sort` = ?, `is_show` = ? WHERE `id` = ?";
            $this->db->execute($sql, [$name, $icon, $unit, $sort, $isShow, $id]);
        } else {
            $sql = "INSERT INTO `{$p}rc_category` (`name`, `icon`, `unit`, `sort`, `is_show`, `created_at`) VALUES (?, ?, ?, ?, ?, ?)";
            $this->db->execute($sql, [$name, $icon, $unit, $sort, $isShow, $now]);
        }
        CacheService::getInstance()->delete('appraisal:categories:show');
        CacheService::getInstance()->delete('platform_info:appraisal');
        $this->success(null, '品类分类保存成功');
    }

    /**
     * 删除分类
     */
    public function deleteCategory(): void
    {
        $id = Request::postInt('id', 0);
        if ($id <= 0) {
            $this->error('品类 ID 不能为空');
        }
        $p = $this->db->getPrefix();
        $deviceCount = (int)$this->db->fetchColumn("SELECT COUNT(*) FROM `{$p}rc_device` WHERE `category_id` = ?", [$id]);
        if ($deviceCount > 0) {
            $this->error("该品类下仍关联 {$deviceCount} 件商品，请先将商品移至其他品类或删除后再删除品类");
        }
        $this->db->execute("DELETE FROM `{$p}rc_category` WHERE `id` = ?", [$id]);
        CacheService::getInstance()->delete('appraisal:categories:show');
        CacheService::getInstance()->delete('platform_info:appraisal');
        $this->success(null, '品类已删除');
    }

    /**
     * 获取品牌列表
     */
    public function brands(): void
    {
        $catId = Request::getInt('category_id', 0);
        $p = $this->db->getPrefix();
        $where = $catId > 0 ? "WHERE `b`.`category_id` = ?" : "";
        $params = $catId > 0 ? [$catId] : [];
        $sql = "SELECT `b`.*, `c`.`name` AS `category_name` 
                FROM `{$p}rc_brand` `b` 
                LEFT JOIN `{$p}rc_category` `c` ON `b`.`category_id` = `c`.`id` 
                {$where} ORDER BY `b`.`sort` DESC, `b`.`id` ASC";
        $brands = $this->db->fetchAll($sql, $params);
        $this->success($brands, '获取品牌成功');
    }

    /**
     * 保存或更新品牌
     */
    public function saveBrand(): void
    {
        $id = Request::postInt('id', 0);
        $categoryId = Request::postInt('category_id', 1);
        $name = trim((string)Request::post('name', ''));
        $logo = (string)Request::post('logo', '/uploads/default/brand_default.png');
        $firstLetter = mb_strtoupper(mb_substr(trim((string)Request::post('first_letter', 'A')), 0, 1, 'UTF-8'), 'UTF-8');
        $sort = Request::postInt('sort', 0);
        $isHot = Request::postInt('is_hot', 0);

        if (empty($name)) {
            $this->error('品牌名称不能为空');
        }

        $p = $this->db->getPrefix();
        $now = time();
        if ($id > 0) {
            $sql = "UPDATE `{$p}rc_brand` SET `category_id` = ?, `name` = ?, `logo` = ?, `first_letter` = ?, `sort` = ?, `is_hot` = ? WHERE `id` = ?";
            $this->db->execute($sql, [$categoryId, $name, $logo, $firstLetter, $sort, $isHot, $id]);
        } else {
            $sql = "INSERT INTO `{$p}rc_brand` (`category_id`, `name`, `logo`, `first_letter`, `sort`, `is_hot`, `created_at`) VALUES (?, ?, ?, ?, ?, ?, ?)";
            $this->db->execute($sql, [$categoryId, $name, $logo, $firstLetter, $sort, $isHot, $now]);
        }
        CacheService::getInstance()->delete('appraisal:brands:' . $categoryId);
        $this->success(null, '品牌保存成功');
    }

    /**
     * 删除品牌
     */
    public function deleteBrand(): void
    {
        $id = Request::postInt('id', 0);
        if ($id <= 0) {
            $this->error('品牌 ID 不能为空');
        }
        $p = $this->db->getPrefix();
        $brand = $this->db->fetchOne("SELECT `category_id` FROM `{$p}rc_brand` WHERE `id` = ?", [$id]);
        $this->db->execute("DELETE FROM `{$p}rc_brand` WHERE `id` = ?", [$id]);
        if (!empty($brand['category_id'])) {
            CacheService::getInstance()->delete('appraisal:brands:' . $brand['category_id']);
        }
        $this->success(null, '品牌已删除');
    }

    /**
     * 保存或更新机型
     */
    public function save(): void
    {
        $id = Request::postInt('id', 0);
        $categoryId = Request::postInt('category_id', 1);
        $brandId = Request::postInt('brand_id', 1);
        $name = (string)Request::post('name', '');
        $coverImg = (string)Request::post('cover_img', '/uploads/default/dev_default.png');
        $guidePrice = (float)Request::post('guide_price', 0.00);
        $unit = (string)Request::post('unit', '台');
        $sort = Request::postInt('sort', 0);
        $isHot = Request::postInt('is_hot', 0);
        $status = Request::postInt('status', 1);

        if (empty($name)) {
            $this->error('机型或商品名称不能为空');
        }
        if ($guidePrice <= 0) {
            $this->error('官方指导回收价必须大于 0 元');
        }

        $p = $this->db->getPrefix();
        $now = time();

        if ($id > 0) {
            $sql = "UPDATE `{$p}rc_device` 
                    SET `category_id` = ?, `brand_id` = ?, `name` = ?, `cover_img` = ?, 
                        `guide_price` = ?, `unit` = ?, `sort` = ?, `is_hot` = ?, `status` = ?, `updated_at` = ? 
                    WHERE `id` = ?";
            $this->db->execute($sql, [$categoryId, $brandId, $name, $coverImg, $guidePrice, $unit, $sort, $isHot, $status, $now, $id]);
            CacheService::getInstance()->delete('device_matrix:' . $id);
        } else {
            $sql = "INSERT INTO `{$p}rc_device` 
                    (`category_id`, `brand_id`, `name`, `cover_img`, `guide_price`, `unit`, `sort`, `is_hot`, `status`, `created_at`, `updated_at`) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            $this->db->execute($sql, [$categoryId, $brandId, $name, $coverImg, $guidePrice, $unit, $sort, $isHot, $status, $now, $now]);
        }

        $this->success(null, '回收机型信息保存成功');
    }

    /**
     * 批量调价 (按品牌上浮/下调百分比或固定金额)
     */
    public function batchAdjust(): void
    {
        $brandId = Request::postInt('brand_id', 0) ?: null;
        $mode = (string)Request::post('mode', 'amount'); // percent 或 amount
        $value = (float)Request::post('value', 0.0);

        if ($mode === 'percent' && ($value < 0.5 || $value > 2.0)) {
            $this->error('浮动比例参数无效 (例: 1.05 表示上浮 5%)');
        }
        if ($mode === 'amount' && abs($value) > 5000) {
            $this->error('固定调价金额超出合理范围');
        }

        $affected = $this->deviceModel->batchAdjustPrice($brandId, $mode, $value);
        // 清空机型估价缓存
        CacheService::getInstance()->clear();

        $this->success(['affected' => $affected], '批量调价完成，已更新 ' . $affected . ' 款机型');
    }

    /**
     * 获取指定分类的完整问答属性树
     */
    public function getQuestionMatrix(): void
    {
        $catId = Request::getInt('category_id', 1);
        $matrix = $this->questionModel->getFullQuestionMatrix($catId);
        $this->success($matrix, '获取问答属性成功');
    }
}
