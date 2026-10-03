<?php
/**
 * 启灵独立回收系统 - 后台质检验机控制器
 * 规范：质检员录入验机实测结果，自动核算差价并生成专业报告
 * 编码：UTF-8 无 BOM
 */

namespace App\Controller\Admin;

use App\Controller\Admin\AdminBaseController;
use App\Common\Request;
use App\Service\InspectionService;

class InspectionController extends AdminBaseController
{
    private $inspectionService;

    public function __construct()
    {
        parent::__construct();
        $this->inspectionService = new InspectionService();
    }

    /**
     * 提交验机复核质检报告
     */
    public function submit(): void
    {
        $orderId = Request::postInt('order_id', 0);
        $imei = (string)Request::post('imei', '');
        $photos = Request::post('real_photos', []);
        $actualItemIds = Request::post('actual_item_ids', []);
        $remark = (string)Request::post('remark', '');
        $manualPrice = (float)Request::post('inspection_price', 0.0);

        if ($orderId <= 0) {
            $this->error('订单参数无效');
        }
        if (empty($imei)) {
            $this->error('请录入设备的 IMEI 码或序列号');
        }
        if ($manualPrice <= 0 && (!is_array($actualItemIds) || empty($actualItemIds))) {
            $this->error('请录入核定回收价格或勾选实测成色选项');
        }

        $res = $this->inspectionService->submitInspection(
            $orderId,
            $this->getAdminId(), // 当前操作的质检员管理员ID
            $imei,
            (array)$photos,
            (array)$actualItemIds,
            $remark,
            $manualPrice
        );

        if ($res['code'] === 200) {
            $this->success($res['data'], $res['msg']);
        } else {
            $this->error($res['msg'], $res['code']);
        }
    }
}
