<?php
/**
 * 启灵同城生活服务 - 管理后台服务类目与项目管理控制器
 * 负责分类增删改查、服务项目管理、阶梯定价规格维护及上下架
 * 编码：UTF-8 无 BOM
 */

namespace App\Controller\Admin;

use App\Controller\Admin\AdminBaseController;
use App\Common\Request;
use App\Model\ServiceModel;
use App\Service\AuthService;

class ServiceController extends AdminBaseController
{
    private $serviceModel;

    public function __construct()
    {
        parent::__construct();
        $this->serviceModel = new ServiceModel();
    }

    // ==========================================
    // 1. 服务分类管理
    // ==========================================

    /**
     * 服务分类列表
     */
    public function categoryList(): void
    {
        $bizType = trim((string)Request::get('biz_type', 'all'));
        $list = $this->serviceModel->getCategoryList($bizType, false);
        $this->success($list, '获取分类列表成功');
    }

    /**
     * 保存/更新服务分类
     */
    public function saveCategory(): void
    {
        $id = Request::postInt('id', 0);
        $name = trim((string)Request::post('name', ''));
        $bizType = trim((string)Request::post('biz_type', 'service'));
        $icon = trim((string)Request::post('icon', ''));
        $sort = Request::postInt('sort', Request::postInt('sort_order', 0));
        
        $rawStatus = Request::post('status', null);
        $isShow = Request::postInt('is_show', 1);
        if ($rawStatus !== null) {
            $isShow = ($rawStatus === 'active' || $rawStatus === '1' || $rawStatus === 1) ? 1 : 0;
        }

        if (empty($name)) {
            $this->error('分类名称不能为空');
        }

        $savedId = $this->serviceModel->saveCategory([
            'id'       => $id,
            'name'     => $name,
            'biz_type' => $bizType,
            'icon'     => $icon,
            'sort'     => $sort,
            'is_show'  => $isShow
        ]);

        $action = $id > 0 ? 'update_service_category' : 'create_service_category';
        (new AuthService())->logAdminAction($this->getAdminId(), $action, "保存服务分类: [{$name}] ID: {$savedId}");

        $this->success(['id' => $savedId], '分类保存成功');
    }

    /**
     * 删除服务分类
     */
    public function deleteCategory(): void
    {
        $id = Request::postInt('id', 0);
        if ($id <= 0) {
            $this->error('分类 ID 不能为空');
        }

        $errorMsg = '';
        $ok = $this->serviceModel->deleteCategory($id, $errorMsg);
        if ($ok) {
            (new AuthService())->logAdminAction($this->getAdminId(), 'delete_service_category', "删除服务分类 ID: {$id}");
            $this->success(null, '分类删除成功');
        } else {
            $this->error($errorMsg ?: '删除失败');
        }
    }

    // ==========================================
    // 2. 服务项目管理
    // ==========================================

    /**
     * 服务项目列表 (支持分类筛选、状态与关键词检索)
     */
    public function itemList(): void
    {
        $categoryId = Request::getInt('category_id', 0);
        $bizType = trim((string)Request::get('biz_type', 'all'));
        $status = Request::get('status', 'all');
        $isHot = Request::get('is_hot', 'all');
        $keyword = trim((string)Request::get('keyword', ''));
        $page = Request::getInt('page', 1);
        $pageSize = Request::getInt('page_size', 15);

        $filter = [
            'category_id' => $categoryId,
            'biz_type'    => $bizType,
            'status'      => $status,
            'is_hot'      => $isHot,
            'keyword'     => $keyword
        ];

        $res = $this->serviceModel->searchItems($filter, $page, $pageSize);
        $this->success($res, '获取服务项目列表成功');
    }

    /**
     * 获取单个服务项目详情 (用于编辑回显)
     */
    public function getItem(): void
    {
        $id = Request::getInt('id', Request::getInt('item_id', 0));
        if ($id <= 0) {
            $this->error('项目 ID 不能为空');
        }

        $item = $this->serviceModel->getItemById($id, true);
        if (!$item) {
            $this->error('服务项目不存在', 404);
        }

        $this->success($item, '获取服务详情成功');
    }

    /**
     * 保存/更新服务项目
     */
    public function saveItem(): void
    {
        $id = Request::postInt('id', Request::postInt('item_id', 0));
        $categoryId = Request::postInt('category_id', 0);
        $bizType = trim((string)Request::post('biz_type', 'service'));
        $title = trim((string)Request::post('title', ''));
        $subTitle = trim((string)Request::post('sub_title', ''));
        $coverImage = trim((string)Request::post('cover_image', ''));
        $bannerImages = Request::post('banner_images', []);
        
        // 兼容 price 和 base_price
        $price = (float)Request::post('price', Request::post('base_price', 0.00));
        $originalPrice = (float)Request::post('original_price', Request::post('oprice', 0.00));
        $priceUnit = trim((string)Request::post('price_unit', Request::post('unit', '次')));
        $pricingType = trim((string)Request::post('pricing_type', 'fixed'));
        $serviceDuration = Request::postInt('service_duration', Request::postInt('duration', 60));
        $guaranteeTags = trim((string)Request::post('guarantee_tags', Request::post('tags', '')));
        $noticeTips = (string)Request::post('notice_tips', Request::post('instructions', ''));
        $contentDetail = (string)Request::post('content_detail', Request::post('content', ''));
        $salesCount = Request::postInt('sales_count', 0);
        $isHot = Request::postInt('is_hot', 0);
        
        $rawStatus = Request::post('status', 1);
        $status = ($rawStatus === 'active' || $rawStatus === 1 || $rawStatus === '1') ? 1 : 0;
        $sort = Request::postInt('sort', Request::postInt('sort_order', 0));
        $specs = Request::post('specs', []);

        if (empty($title)) {
            $this->error('服务项目名称不能为空');
        }
        if ($categoryId <= 0) {
            $this->error('请选择所属服务分类');
        }

        $data = [
            'id'                 => $id,
            'category_id'        => $categoryId,
            'biz_type'           => $bizType,
            'title'              => $title,
            'sub_title'          => $subTitle,
            'cover_image'        => $coverImage,
            'banner_images_list' => is_array($bannerImages) ? $bannerImages : [],
            'price'              => $price,
            'original_price'     => $originalPrice,
            'price_unit'         => $priceUnit,
            'pricing_type'       => $pricingType,
            'service_duration'   => $serviceDuration,
            'guarantee_tags'     => $guaranteeTags,
            'notice_tips'        => $noticeTips,
            'content_detail'     => $contentDetail,
            'sales_count'        => $salesCount,
            'is_hot'             => $isHot,
            'status'             => $status,
            'sort'               => $sort,
            'specs'              => is_array($specs) ? $specs : []
        ];

        $savedId = $this->serviceModel->saveItem($data);
        $action = $id > 0 ? 'update_service_item' : 'create_service_item';
        (new AuthService())->logAdminAction($this->getAdminId(), $action, "保存服务项目: [{$title}] ID: {$savedId}");

        $this->success(['id' => $savedId], '服务项目保存成功');
    }

    /**
     * 删除服务项目
     */
    public function deleteItem(): void
    {
        $id = Request::postInt('id', 0);
        if ($id <= 0) {
            $this->error('项目 ID 不能为空');
        }

        $ok = $this->serviceModel->deleteItem($id);
        if ($ok) {
            (new AuthService())->logAdminAction($this->getAdminId(), 'delete_service_item', "删除服务项目 ID: {$id}");
            $this->success(null, '服务项目已删除');
        } else {
            $this->error('删除失败');
        }
    }

    /**
     * 上下架状态切换
     */
    public function updateStatus(): void
    {
        $id = Request::postInt('id', 0);
        $rawStatus = Request::post('status');
        $status = 1;
        if ($rawStatus === 'inactive' || $rawStatus === '0' || $rawStatus === 0) {
            $status = 0;
        } elseif ($rawStatus === 'active' || $rawStatus === '1' || $rawStatus === 1) {
            $status = 1;
        }
        if ($id <= 0) {
            $this->error('项目 ID 不能为空');
        }

        $ok = $this->serviceModel->updateItemStatus($id, $status);
        if ($ok) {
            $label = $status === 1 ? '上架营业' : '下架停业';
            (new AuthService())->logAdminAction($this->getAdminId(), 'update_service_status', "切换服务项目 ID: {$id} 为 {$label}");
            $this->success(null, "服务项目已成功{$label}");
        } else {
            $this->error('操作失败');
        }
    }

    // ==========================================
    // 3. 服务规格管理
    // ==========================================

    /**
     * 获取指定项目的规格列表
     */
    public function specList(): void
    {
        $serviceId = Request::getInt('service_id', Request::getInt('item_id', Request::getInt('id', 0)));
        if ($serviceId <= 0) {
            $this->error('服务项目 ID 不能为空');
        }

        $list = $this->serviceModel->getSpecsByServiceId($serviceId, false);
        $this->success($list, '获取规格列表成功');
    }

    /**
     * 同步更新规格列表
     */
    public function syncSpecs(): void
    {
        $serviceId = Request::postInt('service_id', Request::postInt('item_id', Request::postInt('id', 0)));
        $specs = Request::post('specs', []);

        if ($serviceId <= 0) {
            $this->error('服务项目 ID 不能为空');
        }
        if (!is_array($specs)) {
            $this->error('规格数据格式错误');
        }

        $this->serviceModel->syncItemSpecs($serviceId, $specs);
        (new AuthService())->logAdminAction($this->getAdminId(), 'sync_service_specs', "同步服务项目 ID: {$serviceId} 的规格列表");

        $this->success(null, '规格已成功同步保存');
    }

    // ==========================================
    // 4. 生活服务在线预约表单字段管理
    // ==========================================

    /**
     * 获取当前生效的生活服务预约表单字段
     */
    public function getBookingFields(): void
    {
        $svc = new \App\Service\TemplateService();
        $scenario = $svc->getCurrentIndustryScenario();
        $fields = $scenario['custom_fields'] ?? [];
        $this->success($fields, '获取预约表单字段成功');
    }

    /**
     * 保存生活服务在线预约表单字段设置
     */
    public function saveBookingFields(): void
    {
        $fields = Request::post('custom_fields', []);
        if (!is_array($fields)) {
            $this->error('表单字段格式错误');
        }

        $cleanFields = [];
        foreach ($fields as $f) {
            $label = trim((string)($f['label'] ?? ''));
            $key = trim((string)($f['key'] ?? ''));
            if ($label === '' || $key === '') {
                continue;
            }

            $opts = $f['options'] ?? [];
            if (is_string($opts)) {
                $opts = array_values(array_filter(array_map('trim', preg_split('/[,，]/', $opts))));
            }

            $cleanFields[] = [
                'key'           => strtolower(preg_replace('/[^a-zA-Z0-9_]/', '_', $key)),
                'label'         => $label,
                'type'          => trim((string)($f['type'] ?? 'text')),
                'category_type' => trim((string)($f['category_type'] ?? 'common')),
                'options'       => is_array($opts) ? array_values($opts) : [],
                'placeholder'   => trim((string)($f['placeholder'] ?? '')),
                'required'      => !empty($f['required']) ? 1 : 0
            ];
        }

        $svc = new \App\Service\TemplateService();
        $curScenario = $svc->getCurrentIndustryScenario();
        $toggles = $curScenario['feature_toggles'] ?? [];
        $terminology = $curScenario['terminology'] ?? [];

        $res = $svc->saveDynamicBlocks($toggles, $terminology, $cleanFields);
        if ($res['code'] === 200) {
            (new AuthService())->logAdminAction($this->getAdminId(), 'save_booking_fields', '更新生活服务预约表单字段配置');
            $this->success($cleanFields, '预约表单字段已成功保存并立即生效');
        } else {
            $this->error($res['msg'] ?? '保存失败');
        }
    }
}
