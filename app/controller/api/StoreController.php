<?php
/**
 * 启灵回收系统 - 客户端线下门店网点控制器
 * 为前台估价下单提供营业中的线下自提/自送门店与网点列表查询
 */

declare(strict_types=1);

namespace App\Controller\Api;

use App\Controller\Controller;
use App\Common\Request;
use App\Model\StoreModel;

class StoreController extends Controller
{
    private $storeModel;

    public function __construct()
    {
        $this->storeModel = new StoreModel();
    }

    /**
     * 获取营业中的线下网点列表 (前台下单选择使用)
     */
    public function list(): void
    {
        $keyword = trim((string)Request::get('keyword', ''));
        // 仅查询营业中状态 status = 1 的门店
        $stores = $this->storeModel->getAllStores(true, $keyword);

        $this->success($stores, '获取服务网点列表成功');
    }

    /**
     * 获取指定网点详情
     */
    public function detail(): void
    {
        $id = Request::getInt('id', 0);
        if ($id <= 0) {
            $this->error('门店参数无效');
        }

        $store = $this->storeModel->getStoreById($id);
        if (!$store || (int)$store['status'] !== 1) {
            $this->error('该服务网点暂未对外营业或不存在');
        }

        $this->success($store, '获取网点详情成功');
    }
}
