<?php
/**
 * 启灵独立回收系统 - 后台订单管理控制器
 * 规范：严格分页限制，支持按单号/手机号/状态检索
 * 编码：UTF-8 无 BOM
 */

namespace App\Controller\Admin;

use App\Controller\Admin\AdminBaseController;
use App\Common\Request;
use App\Model\Database;
use App\Model\OrderModel;
use App\Model\InspectionModel;
use App\Model\PayoutModel;

class OrderController extends AdminBaseController
{
    private $orderModel;
    private $inspectionModel;
    private $payoutModel;
    private $db;

    public function __construct()
    {
        parent::__construct();
        $this->orderModel = new OrderModel();
        $this->inspectionModel = new InspectionModel();
        $this->payoutModel = new PayoutModel();
        $this->db = Database::getInstance();
    }

    /**
     * 订单列表 (多维检索与分页)
     */
    public function list(): void
    {
        $p = $this->db->getPrefix();
        $status = (string)Request::get('status', '');
        $keyword = (string)Request::get('keyword', '');
        $fulfillment = (string)Request::get('fulfillment_type', '');
        $bizType = (string)Request::get('biz_type', '');
        $page = Request::getInt('page', 1);
        $pageSize = Request::getInt('page_size', 15);

        $conditions = ["`deleted_at` IS NULL"];
        $params = [];

        if (!empty($status) && $status !== 'all') {
            $conditions[] = "`status` = ?";
            $params[] = $status;
        }
        if (!empty($bizType) && $bizType !== 'all') {
            $conditions[] = "`biz_type` = ?";
            $params[] = $bizType;
        }
        if (!empty($fulfillment) && $fulfillment !== 'all') {
            $conditions[] = "`fulfillment_type` = ?";
            $params[] = $fulfillment;
        }
        if (!empty($keyword)) {
            $conditions[] = "(`order_sn` LIKE ? OR `contact_mobile` LIKE ? OR `express_sn` LIKE ?)";
            $like = '%' . $keyword . '%';
            $params[] = $like;
            $params[] = $like;
            $params[] = $like;
        }

        $whereSql = implode(' AND ', $conditions);
        $offset = max(0, ($page - 1) * $pageSize);

        $countSql = "SELECT COUNT(*) as `total` FROM `{$p}rc_order` WHERE {$whereSql}";
        $totalRow = $this->db->fetchOne($countSql, $params);
        $total = (int)($totalRow['total'] ?? 0);

        // 关键性能优化：列表查询显式排除 shipping_routes (longtext) 与 shipping_fee_detail，大幅降低 MySQL 内存与网络 I/O 开销
        $fields = "`id`, `order_sn`, `biz_type`, `user_id`, `device_id`, `device_name`, `estimate_price`, `final_price`, "
                . "`subsidy_amount`, `negotiation_remark`, `negotiation_status`, `appraisal_mode`, `quick_tier_name`, "
                . "`fulfillment_type`, `mail_sub_type`, `store_id`, `store_name`, `payout_type`, `payout_name`, `payout_account`, `payout_bank`, "
                . "`pay_type`, `pay_status`, `pay_price`, `pay_time`, `pay_trade_no`, "
                . "`technician_id`, `technician_name`, `technician_mobile`, `service_start_time`, `service_finish_time`, "
                . "`status`, `contact_name`, `contact_mobile`, `contact_address`, `appointment_time`, "
                . "`express_company`, `express_sn`, `refund_express_sn`, `shipping_fee`, `shipping_weight`, `shipping_real_weight`, "
                . "`shipping_courier_phone`, `shipping_courier_name`, `shipping_dispatch_status`, `user_remark`, `created_at`, `updated_at`";

        $sql = "SELECT {$fields} FROM `{$p}rc_order` WHERE {$whereSql} ORDER BY `id` DESC LIMIT {$offset}, {$pageSize}";
        $list = $this->db->fetchAll($sql, $params);

        $this->success([
            'list'      => $list,
            'total'     => $total,
            'page'      => $page,
            'page_size' => $pageSize
        ], '获取订单列表成功');
    }

    /**
     * 订单详情 (包含初评快照、质检复核报告与放款流水)
     */
    public function detail(): void
    {
        $id = Request::getInt('id', 0);
        if ($id <= 0) {
            $this->error('订单 ID 不能为空');
        }

        $order = $this->orderModel->findById($id);
        if (!$order) {
            $this->error('订单不存在', 404);
        }

        $order['inspection'] = $this->inspectionModel->getByOrderId($id);
        $order['payout'] = $this->payoutModel->getByOrderId($id);

        $this->success($order, '获取订单详情成功');
    }

    /**
     * 更新订单状态 (如签收入库、录入物流、录入退货物流等)
     */
    public function updateStatus(): void
    {
        $id = Request::postInt('id', 0);
        $status = (string)Request::post('status', '');
        $extra = [];

        if (Request::post('express_sn')) {
            $extra['express_sn'] = (string)Request::post('express_sn');
        }
        if (Request::post('express_company')) {
            $extra['express_company'] = (string)Request::post('express_company');
        }
        if (Request::post('refund_express_sn')) {
            $extra['refund_express_sn'] = (string)Request::post('refund_express_sn');
        }
        if (Request::post('final_price')) {
            $extra['final_price'] = (float)Request::post('final_price');
        }
        if (Request::post('payout_type')) {
            $extra['payout_type'] = trim((string)Request::post('payout_type'));
        }
        if (Request::post('payout_name')) {
            $extra['payout_name'] = trim((string)Request::post('payout_name'));
        }
        if (Request::post('payout_account')) {
            $extra['payout_account'] = trim((string)Request::post('payout_account'));
        }
        if (Request::post('payout_bank')) {
            $extra['payout_bank'] = trim((string)Request::post('payout_bank'));
        }
        if (Request::post('user_remark')) {
            $extra['user_remark'] = trim((string)Request::post('user_remark'));
        }
        if (Request::post('pay_type')) {
            $extra['pay_type'] = trim((string)Request::post('pay_type'));
        }
        if (Request::post('pay_status') !== null && Request::post('pay_status') !== '') {
            $extra['pay_status'] = Request::postInt('pay_status', 0);
        }
        if (Request::post('pay_price') !== null && Request::post('pay_price') !== '') {
            $extra['pay_price'] = (float)Request::post('pay_price');
        }
        if (Request::post('pay_trade_no')) {
            $extra['pay_trade_no'] = trim((string)Request::post('pay_trade_no'));
        }
        if (Request::post('technician_id') !== null && Request::post('technician_id') !== '') {
            $extra['technician_id'] = Request::postInt('technician_id', 0);
        }
        if (Request::post('technician_name')) {
            $extra['technician_name'] = trim((string)Request::post('technician_name'));
        }
        if (Request::post('technician_mobile')) {
            $extra['technician_mobile'] = trim((string)Request::post('technician_mobile'));
        }
        if (Request::post('service_images')) {
            $extra['service_images'] = Request::post('service_images');
        }

        $ok = $this->orderModel->updateStatus($id, $status, $extra);
        if ($ok) {
            $this->success(null, '订单状态更新成功');
        } else {
            $this->error('更新失败');
        }
    }

    /**
     * 删除订单 (彻底清理)
     */
    public function delete(): void
    {
        $id = Request::postInt('id', 0);
        if ($id <= 0) {
            $this->error('订单 ID 不能为空');
        }
        $p = $this->db->getPrefix();
        // 核心资产软删除保护：保留明细与结算财务核验流水，杜绝物理硬删
        $this->db->execute("UPDATE `{$p}rc_order` SET `deleted_at` = ? WHERE `id` = ?", [date('Y-m-d H:i:s'), $id]);
        $this->success(null, '订单已成功转入回收站(软删除)，历史财务留痕完整保全');
    }

    /**
     * 客服发起在线还价与差价协商专享补贴
     */
    public function proposeNegotiation(): void
    {
        $orderId = Request::postInt('order_id', 0);
        $subsidyAmount = (float)Request::post('subsidy_amount', 0.0);
        $remark = trim((string)Request::post('remark', ''));

        if ($orderId <= 0) {
            $this->error('订单 ID 不能为空');
        }
        if ($subsidyAmount < 0) {
            $this->error('协商补贴金额不能为负数');
        }

        $orderService = new \App\Service\OrderService();
        $res = $orderService->proposeNegotiation($orderId, $subsidyAmount, $remark, $this->getAdminId());
        if ($res['code'] === 200) {
            $this->success($res['data'] ?? null, $res['msg']);
        } else {
            $this->error($res['msg'], $res['code']);
        }
    }

    /**
     * 后台管理员一键呼叫顺丰速运揽件 (仅限寄送回收订单)
     */
    public function callSfExpress(): void
    {
        $orderId = Request::postInt('order_id', 0);
        if ($orderId <= 0) {
            $this->error('订单 ID 不能为空');
        }

        $orderService = new \App\Service\OrderService();
        $res = $orderService->callSfExpress($orderId);

        if ($res['code'] === 200) {
            $this->success($res['data'] ?? null, $res['msg']);
        } else {
            $this->error($res['msg'], $res['code'], $res['data'] ?? null);
        }
    }

    /**
     * 后台管理员派单指派上门师傅/技术人员
     */
    public function dispatchTechnician(): void
    {
        $orderId = Request::postInt('order_id', 0);
        $technicianId = Request::postInt('technician_id', 0);
        $technicianName = trim((string)Request::post('technician_name', ''));
        $technicianMobile = trim((string)Request::post('technician_mobile', ''));

        if ($orderId <= 0) {
            $this->error('订单 ID 不能为空');
        }
        if (empty($technicianName) || empty($technicianMobile)) {
            $this->error('师傅姓名与联系电话不能为空');
        }

        $orderService = new \App\Service\OrderService();
        $res = $orderService->dispatchTechnician($orderId, $technicianId, $technicianName, $technicianMobile, $this->getAdminId());

        if ($res['code'] === 200) {
            $this->success($res['data'] ?? null, $res['msg']);
        } else {
            $this->error($res['msg'], $res['code']);
        }
    }

    /**
     * 后台管理员完工核销与作业凭证归档
     */
    public function finishService(): void
    {
        $orderId = Request::postInt('order_id', 0);
        $serviceImages = Request::post('service_images', []);
        $notes = trim((string)Request::post('notes', ''));

        if ($orderId <= 0) {
            $this->error('订单 ID 不能为空');
        }

        $orderService = new \App\Service\OrderService();
        $res = $orderService->finishService($orderId, (array)$serviceImages, $notes, $this->getAdminId());

        if ($res['code'] === 200) {
            $this->success(null, $res['msg']);
        } else {
            $this->error($res['msg'], $res['code']);
        }
    }

    /**
     * 获取未处理订单与待办统计 (用于后台即时小红点角标与新订单提醒)
     * GET /admin/order/pendingCount
     */
    public function pendingCount(): void
    {
        $p = $this->db->getPrefix();
        
        $sql = "SELECT 
                    COUNT(CASE WHEN (`biz_type` = 'service' OR `biz_type` = 'errand') AND (`pay_status` = 1 OR `pay_price` <= 0.00) AND `status` = 'pending_dispatch' THEN 1 END) as `service_pending_dispatch`,
                    COUNT(CASE WHEN (`biz_type` = 'recycle' OR `biz_type` IS NULL OR `biz_type` = '') AND `status` IN ('pending_send', 'in_transit', 'received', 'inspecting', 'price_confirming') THEN 1 END) as `recycle_pending`,
                    COUNT(CASE WHEN (`biz_type` = 'recycle' OR `biz_type` IS NULL OR `biz_type` = '') AND `status` = 'completed' THEN 1 END) as `recycle_payout_pending`,
                    COUNT(CASE WHEN `status` IN ('pending_send', 'pending_dispatch', 'received', 'inspecting') OR ((`biz_type` = 'service' OR `biz_type` = 'errand') AND (`pay_status` = 1 OR `pay_price` <= 0.00) AND `status` = 'pending_dispatch') THEN 1 END) as `total_pending`,
                    MAX(`created_at`) as `latest_order_time`,
                    (SELECT `order_sn` FROM `{$p}rc_order` ORDER BY `id` DESC LIMIT 1) as `latest_order_sn`
                FROM `{$p}rc_order`";
        $row = $this->db->fetchOne($sql) ?: [];

        $this->success([
            'total_pending'             => (int)($row['total_pending'] ?? 0),
            'service_pending_dispatch'  => (int)($row['service_pending_dispatch'] ?? 0),
            'recycle_pending'           => (int)($row['recycle_pending'] ?? 0),
            'recycle_payout_pending'    => (int)($row['recycle_payout_pending'] ?? 0),
            'latest_order_time'         => (int)($row['latest_order_time'] ?? 0),
            'latest_order_sn'           => (string)($row['latest_order_sn'] ?? ''),
        ], '获取待处理订单统计成功');
    }
}

