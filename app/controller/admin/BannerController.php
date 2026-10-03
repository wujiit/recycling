<?php
/**
 * 启灵独立回收系统 - 管理后台首页轮播 Banner 控制器
 * 职责：负责首页轮播广告的增删改查、排序、状态切换与多端适配管理
 * 规范：严格继承 AdminBaseController 鉴权中间层，遵循单一职责与 PDO 预处理
 * 编码：UTF-8 无 BOM
 */

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Controller\Admin\AdminBaseController;
use App\Common\Request;
use App\Model\BannerModel;

class BannerController extends AdminBaseController
{
    private $bannerModel;

    public function __construct()
    {
        parent::__construct();
        $this->bannerModel = new BannerModel();
    }

    /**
     * 轮播 Banner 列表查询
     */
    public function list(): void
    {
        $keyword = trim((string)Request::get('keyword', ''));
        $status = (string)Request::get('status', 'all');

        $activeOnly = ($status === '1');
        $banners = $this->bannerModel->getAllBanners($activeOnly, $keyword);

        if ($status === '0') {
            $banners = array_values(array_filter($banners, function($b) {
                return (int)$b['status'] === 0;
            }));
        }

        $this->success($banners, '获取Banner列表成功');
    }

    /**
     * 获取单个 Banner 详情
     */
    public function detail(): void
    {
        $id = Request::getInt('id', 0);
        if ($id <= 0) {
            $this->error('Banner参数无效');
        }

        $banner = $this->bannerModel->getBannerById($id);
        if (!$banner) {
            $this->error('Banner不存在或已被删除');
        }

        $this->success($banner, '获取Banner详情成功');
    }

    /**
     * 保存 Banner (新增 / 编辑)
     */
    public function save(): void
    {
        $id = Request::getInt('id', 0);
        $title = trim((string)Request::post('title', ''));
        $subtitle = trim((string)Request::post('subtitle', ''));
        $badge = trim((string)Request::post('badge', ''));
        $imagePc = trim((string)Request::post('image_pc', ''));
        $imageM = trim((string)Request::post('image_m', ''));
        $linkType = trim((string)Request::post('link_type', 'none'));
        $linkValue = trim((string)Request::post('link_value', ''));
        $linkMiniapp = trim((string)Request::post('link_miniapp', ''));
        $btnText = trim((string)Request::post('btn_text', '立即查看'));
        $sortOrder = Request::getInt('sort_order', 100);
        $status = Request::getInt('status', 1);

        if (empty($title)) {
            $this->error('Banner大标题不能为空');
        }

        if (empty($imagePc)) {
            $this->error('请上传或填写PC端横幅大图URL');
        }

        $allowedLinkTypes = ['none', 'category', 'device', 'action', 'url'];
        if (!in_array($linkType, $allowedLinkTypes, true)) {
            $linkType = 'none';
        }

        $data = [
            'title'        => $title,
            'subtitle'     => $subtitle,
            'badge'        => $badge,
            'image_pc'     => $imagePc,
            'image_m'      => !empty($imageM) ? $imageM : $imagePc,
            'link_type'    => $linkType,
            'link_value'   => $linkValue,
            'link_miniapp' => $linkMiniapp,
            'btn_text'     => !empty($btnText) ? $btnText : '立即查看',
            'sort_order'   => $sortOrder,
            'status'       => $status === 1 ? 1 : 0
        ];

        $resId = $this->bannerModel->saveBanner($data, $id);
        if ($resId > 0) {
            \App\Service\CacheService::getInstance()->delete('platform_info:appraisal');
            \App\Service\CacheService::getInstance()->delete('appraisal:banners:all');
            $this->success(['id' => $resId], $id > 0 ? 'Banner编辑成功' : 'Banner创建成功');
        } else {
            $this->error('Banner保存失败，请检查输入参数');
        }
    }

    /**
     * 删除 Banner
     */
    public function delete(): void
    {
        $id = Request::getInt('id', 0);
        if ($id <= 0) {
            $this->error('Banner参数无效');
        }

        $res = $this->bannerModel->deleteBanner($id);
        if ($res) {
            \App\Service\CacheService::getInstance()->delete('platform_info:appraisal');
            \App\Service\CacheService::getInstance()->delete('appraisal:banners:all');
            $this->success(null, 'Banner已成功删除');
        } else {
            $this->error('Banner删除失败');
        }
    }

    /**
     * 切换启停状态
     */
    public function toggleStatus(): void
    {
        $id = Request::getInt('id', 0);
        if ($id <= 0) {
            $this->error('Banner参数无效');
        }

        $res = $this->bannerModel->toggleStatus($id);
        if ($res) {
            \App\Service\CacheService::getInstance()->delete('platform_info:appraisal');
            \App\Service\CacheService::getInstance()->delete('appraisal:banners:all');
            $this->success(null, '状态切换成功');
        } else {
            $this->error('状态切换失败或Banner不存在');
        }
    }
}

