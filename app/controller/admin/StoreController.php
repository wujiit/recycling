<?php
/**
 * 启灵独立回收系统 - 管理后台门店管理控制器
 * 职责：负责服务网点/线下门店的增删改查、状态切换与默认推荐设置
 * 规范：严格继承 AdminBaseController 鉴权中间层，遵循单一职责与 PDO 预处理
 * 编码：UTF-8 无 BOM
 */

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Controller\Admin\AdminBaseController;
use App\Common\Request;
use App\Model\StoreModel;

class StoreController extends AdminBaseController
{
    private $storeModel;

    public function __construct()
    {
        parent::__construct();
        $this->storeModel = new StoreModel();
    }

    /**
     * 门店列表查询
     */
    public function list(): void
    {
        $keyword = trim((string)Request::get('keyword', ''));
        $status = (string)Request::get('status', 'all');

        $activeOnly = ($status === '1');
        $stores = $this->storeModel->getAllStores($activeOnly, $keyword);

        // 如果筛选禁用状态 0
        if ($status === '0') {
            $stores = array_values(array_filter($stores, function($s) {
                return (int)$s['status'] === 0;
            }));
        }

        $this->success($stores, '获取门店列表成功');
    }

    /**
     * 获取单个门店详情
     */
    public function detail(): void
    {
        $id = Request::getInt('id', 0);
        if ($id <= 0) {
            $this->error('门店参数无效');
        }

        $store = $this->storeModel->getStoreById($id);
        if (!$store) {
            $this->error('门店不存在或已被删除');
        }

        $this->success($store, '获取门店详情成功');
    }

    /**
     * 新增或编辑门店
     */
    public function save(): void
    {
        $id = Request::postInt('id', 0);
        $name = trim((string)Request::post('name', ''));
        $phone = trim((string)Request::post('phone', ''));
        $address = trim((string)Request::post('address', ''));
        $businessHours = trim((string)Request::post('business_hours', '周一至周日 09:00 - 21:00'));
        $trafficGuide = trim((string)Request::post('traffic_guide', ''));
        $status = Request::postInt('status', 1);
        $sort = Request::postInt('sort', 100);
        $isDefault = Request::postInt('is_default', 0);

        if (empty($name)) {
            $this->error('请输入门店或网点名称');
        }
        if (empty($phone)) {
            $this->error('请输入门店联系电话或客服手机号');
        }
        if (empty($address)) {
            $this->error('请输入门店详细地址');
        }

        $data = [
            'id'             => $id,
            'name'           => $name,
            'phone'          => $phone,
            'address'        => $address,
            'business_hours' => $businessHours,
            'traffic_guide'  => $trafficGuide,
            'status'         => ($status === 1 ? 1 : 0),
            'sort'           => $sort,
            'is_default'     => ($isDefault === 1 ? 1 : 0),
        ];

        $savedId = $this->storeModel->saveStore($data);
        if ($savedId > 0) {
            $this->success(['id' => $savedId], $id > 0 ? '门店信息更新成功' : '新增门店成功');
        } else {
            $this->error('保存门店失败，请稍后重试');
        }
    }

    /**
     * 删除门店
     */
    public function delete(): void
    {
        $id = Request::postInt('id', 0);
        if ($id <= 0) {
            $this->error('请指定要删除的门店');
        }

        $store = $this->storeModel->getStoreById($id);
        if (!$store) {
            $this->error('门店不存在');
        }

        $res = $this->storeModel->deleteStore($id);
        if ($res) {
            $this->success(null, '门店删除成功');
        } else {
            $this->error('删除门店失败');
        }
    }

    /**
     * 切换营业状态
     */
    public function toggleStatus(): void
    {
        $id = Request::postInt('id', 0);
        if ($id <= 0) {
            $this->error('请指定门店');
        }

        $res = $this->storeModel->toggleStatus($id);
        if ($res) {
            $this->success(null, '门店状态已更新');
        } else {
            $this->error('更新状态失败');
        }
    }

    /**
     * 设为默认门店
     */
    public function setDefault(): void
    {
        $id = Request::postInt('id', 0);
        if ($id <= 0) {
            $this->error('请指定门店');
        }

        $res = $this->storeModel->setDefault($id);
        if ($res) {
            $this->success(null, '已将该门店设为默认门店');
        } else {
            $this->error('设置默认门店失败');
        }
    }
}
