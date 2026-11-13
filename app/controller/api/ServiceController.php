<?php
/**
 * 启灵同城生活服务 - 客户端服务类目与项目控制器
 * 负责分类检索、推荐服务轮播/聚合、服务详情与规格选择
 * 编码：UTF-8 无 BOM
 */

namespace App\Controller\Api;

use App\Controller\Controller;
use App\Common\Request;
use App\Model\ServiceModel;

class ServiceController extends Controller
{
    private $serviceModel;

    public function __construct()
    {
        $this->serviceModel = new ServiceModel();
    }

    /**
     * 获取同城生活服务分类列表
     * GET /api/service/categories?biz_type=service
     */
    public function categories(): void
    {
        $bizType = trim((string)Request::get('biz_type', 'service'));
        $list = $this->serviceModel->getCategoryList($bizType, true);
        $this->success($list, '获取服务分类成功');
    }

    /**
     * 检索服务项目列表 (支持按分类、关键词、热门推荐及分页)
     * GET /api/service/list?category_id=1&keyword=清洗&page=1
     */
    public function list(): void
    {
        $categoryId = Request::getInt('category_id', 0);
        $bizType = trim((string)Request::get('biz_type', 'service'));
        $isHot = Request::get('is_hot', 'all');
        $keyword = trim((string)Request::get('keyword', ''));
        $page = Request::getInt('page', 1);
        $pageSize = Request::getInt('page_size', 15);

        $filter = [
            'status'      => 1, // 仅展示上架营业中的项目
            'category_id' => $categoryId,
            'biz_type'    => $bizType,
            'is_hot'      => $isHot,
            'keyword'     => $keyword
        ];

        $res = $this->serviceModel->searchItems($filter, $page, $pageSize);
        $this->success($res, '获取服务列表成功');
    }

    /**
     * 获取首页精选热门服务项目
     * GET /api/service/hot?limit=6&biz_type=service
     */
    public function hot(): void
    {
        $limit = Request::getInt('limit', 6);
        $bizType = trim((string)Request::get('biz_type', 'service'));
        $list = $this->serviceModel->getHotItems(min(20, max(1, $limit)), $bizType);
        $this->success($list, '获取热门服务成功');
    }

    /**
     * 获取指定服务项目详情 (包含多图相册、官方保障标签及可选规格列表)
     * GET /api/service/detail?id=1
     */
    public function detail(): void
    {
        $id = Request::getInt('id', 0);
        if ($id <= 0) {
            $this->error('服务项目 ID 不能为空');
        }

        $item = $this->serviceModel->getItemById($id, true);
        if (!$item) {
            $this->error('服务项目不存在或已下架', 404);
        }

        $this->success($item, '获取服务详情成功');
    }

    /**
     * 获取当前系统生效的行业配置与预约表单字段 (主题色、称谓、功能开关与自定义字段)
     * GET /api/service/scenarioInfo
     */
    public function scenarioInfo(): void
    {
        $svc = new \App\Service\TemplateService();
        $info = $svc->getCurrentIndustryScenario();
        $this->success($info, '获取行业配置成功');
    }
}
