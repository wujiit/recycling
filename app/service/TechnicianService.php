<?php
/**
 * 启灵同城生活服务 - 师傅工作台业务服务
 * 负责师傅身份认证、在线状态切换、抢单大厅、作业打卡与核销完工业务
 * 编码：UTF-8 无 BOM
 */

namespace App\Service;

use App\Model\Database;
use App\Model\TechnicianModel;
use App\Model\OrderModel;
use App\Helper\Str;

class TechnicianService
{
    /** @var TechnicianModel */
    private $technicianModel;
    /** @var OrderModel */
    private $orderModel;
    /** @var Database */
    private $db;
    /** @var string */
    private $p;

    public function __construct()
    {
        $this->technicianModel = new TechnicianModel();
        $this->orderModel = new OrderModel();
        $this->db = Database::getInstance();
        $this->p = $this->db->getPrefix();
    }

    /**
     * 获取师傅工作台主页资料与关键指标统计
     */
    public function getProfile(array $user): array
    {
        $userId = (int)($user['id'] ?? 0);
        $mobile = (string)($user['mobile'] ?? '');

        $tech = $this->technicianModel->findByUser($userId, $mobile);
        if (!$tech) {
            return [
                'code' => 200,
                'data' => [
                    'is_technician' => false,
                    'status'        => -1,
                    'status_text'   => '未认证'
                ]
            ];
        }

        $techId = (int)$tech['id'];
        $todayStart = strtotime(date('Y-m-d 00:00:00'));

        // 今日已完工单数
        $todayDoneRow = $this->db->fetchOne(
            "SELECT COUNT(*) as `c` FROM `{$this->p}rc_order` WHERE `technician_id` = ? AND `status` = 'completed' AND `service_finish_time` >= ?",
            [$techId, $todayStart]
        );
        $todayDoneCount = (int)($todayDoneRow['c'] ?? 0);

        // 当前正在履约中的工单数 (已接单待上门 + 作业中)
        $doingRow = $this->db->fetchOne(
            "SELECT COUNT(*) as `c` FROM `{$this->p}rc_order` WHERE `technician_id` = ? AND `status` IN ('dispatched', 'in_service')",
            [$techId]
        );
        $doingCount = (int)($doingRow['c'] ?? 0);

        // 待抢单大厅可用工单数
        $poolRow = $this->db->fetchOne(
            "SELECT COUNT(*) as `c` FROM `{$this->p}rc_order` WHERE `status` = 'pending_dispatch' AND `technician_id` = 0 AND (`pay_status` = 1 OR `pay_type` = 'offline')"
        );
        $poolCount = (int)($poolRow['c'] ?? 0);

        $statusMap = [
            0 => '审核中',
            1 => '已认证',
            2 => '已冻结'
        ];

        return [
            'code' => 200,
            'data' => [
                'is_technician'     => true,
                'technician_id'     => $techId,
                'name'              => $tech['name'],
                'mobile'            => $tech['mobile'],
                'avatar'            => $tech['avatar'] ?: '/uploads/default/avatar_default.svg',
                'star_rating'       => (float)$tech['star_rating'],
                'total_order_count' => (int)$tech['order_count'],
                'today_done_count'  => $todayDoneCount,
                'doing_count'       => $doingCount,
                'pool_count'        => $poolCount,
                'deposit_balance'   => (float)$tech['deposit_balance'],
                'city_name'         => $tech['city_name'],
                'district_name'     => $tech['district_name'],
                'service_types'     => $tech['service_types'],
                'status'            => (int)$tech['status'],
                'status_text'       => $statusMap[(int)$tech['status']] ?? '未知',
                'is_online'         => (int)$tech['is_online'] === 1,
                'audit_remark'      => $tech['audit_remark'] ?? ''
            ]
        ];
    }

    /**
     * 切换出车开工/收工休息状态
     */
    public function toggleOnline(int $technicianId, int $isOnline): array
    {
        $tech = $this->technicianModel->findById($technicianId);
        if (!$tech) {
            return ['code' => 404, 'msg' => '师傅档案不存在'];
        }
        if ((int)$tech['status'] !== 1) {
            return ['code' => 403, 'msg' => '当前账号处于未认证或冻结状态，无法开工接单'];
        }

        $ok = $this->technicianModel->updateOnlineStatus($technicianId, $isOnline ? 1 : 0);
        $stateText = $isOnline ? '开工接单中' : '已收工休息';
        return $ok ? ['code' => 200, 'msg' => "状态已切换为: {$stateText}"] : ['code' => 500, 'msg' => '切换失败'];
    }

    /**
     * 接单大厅：查询可抢公共工单池 (隐私脱敏保护)
     */
    public function getPool(int $technicianId, int $page = 1, int $pageSize = 15): array
    {
        $tech = $this->technicianModel->findById($technicianId);
        if (!$tech || (int)$tech['status'] !== 1) {
            return ['code' => 403, 'msg' => '只有已认证师傅才可查看接单大厅'];
        }

        $res = $this->technicianModel->getDispatchPool($page, $pageSize);

        // 抢单前敏感信息脱敏（仅展示区域和姓氏，抢单成功后再展示具体门牌号与完整电话）
        foreach ($res['list'] as &$item) {
            $item['contact_name'] = Str::maskName($item['contact_name'] ?? '');
            $item['contact_mobile'] = Str::maskMobile($item['contact_mobile'] ?? '');
            $fullAddr = (string)($item['contact_address'] ?? '');
            // 保留前段地址，隐藏详细门牌号
            if (mb_strlen($fullAddr) > 10) {
                $item['contact_address'] = mb_substr($fullAddr, 0, 8) . '**** (接单后可见详细门牌)';
            }
            if (!empty($item['custom_fields'])) {
                $decodedCf = json_decode($item['custom_fields'], true);
                $item['custom_fields_map'] = is_array($decodedCf) ? $decodedCf : [];
            } else {
                $item['custom_fields_map'] = [];
            }
        }
        unset($item);

        return ['code' => 200, 'data' => $res];
    }

    /**
     * 师傅抢单 (乐观锁排他防并发)
     */
    public function grabOrder(int $technicianId, int $orderId): array
    {
        $tech = $this->technicianModel->findById($technicianId);
        if (!$tech || (int)$tech['status'] !== 1) {
            return ['code' => 403, 'msg' => '只有已认证师傅才具备抢单资格'];
        }
        if ((int)$tech['is_online'] !== 1) {
            return ['code' => 400, 'msg' => '您当前处于收工休息状态，请先开启出车接单开关'];
        }

        $order = $this->orderModel->findById($orderId);
        if (!$order) {
            return ['code' => 404, 'msg' => '工单不存在'];
        }

        if ($order['status'] !== 'pending_dispatch' || (int)$order['technician_id'] !== 0) {
            return ['code' => 400, 'msg' => '手慢了，该工单刚刚已被其他师傅接单或派发！'];
        }

        $ok = $this->technicianModel->grabOrder($orderId, $technicianId, $tech['name'], $tech['mobile']);
        if ($ok) {
            return [
                'code' => 200,
                'msg'  => '恭喜抢单成功！请准时联系客户并按约定时间上门服务。',
                'data' => [
                    'order_id' => $orderId,
                    'order_sn' => $order['order_sn']
                ]
            ];
        }

        return ['code' => 400, 'msg' => '抢单失败，该工单可能已被其他师傅抢先接单'];
    }

    /**
     * 师傅我的工单列表 (包含完整客户联系方式与上门地址)
     */
    public function getMyOrders(int $technicianId, string $statusGroup = 'all', int $page = 1, int $pageSize = 15): array
    {
        $tech = $this->technicianModel->findById($technicianId);
        if (!$tech) {
            return ['code' => 404, 'msg' => '师傅档案不存在'];
        }

        $res = $this->technicianModel->getTechnicianOrders($technicianId, $statusGroup, $page, $pageSize);
        foreach ($res['list'] as &$item) {
            $item['status_text'] = OrderService::getStatusText($item['status'], $item['biz_type'] ?? 'service');
            if (!empty($item['service_images'])) {
                $decoded = json_decode($item['service_images'], true);
                $item['service_images_list'] = is_array($decoded) ? $decoded : [];
            } else {
                $item['service_images_list'] = [];
            }
            if (!empty($item['custom_fields'])) {
                $decodedCf = json_decode($item['custom_fields'], true);
                $item['custom_fields_map'] = is_array($decodedCf) ? $decodedCf : [];
            } else {
                $item['custom_fields_map'] = [];
            }
        }
        unset($item);

        return ['code' => 200, 'data' => $res];
    }

    /**
     * 师傅查看单个工单完整详情 (含导航、客户电话及快照选项)
     */
    public function getOrderDetail(int $technicianId, int $orderId): array
    {
        $order = $this->orderModel->findById($orderId);
        if (!$order) {
            return ['code' => 404, 'msg' => '工单不存在'];
        }

        if ((int)$order['technician_id'] !== $technicianId) {
            return ['code' => 403, 'msg' => '无权查看非本人名下的工单详情'];
        }

        $order['status_text'] = OrderService::getStatusText($order['status'], $order['biz_type'] ?? 'service');
        if (!empty($order['service_images'])) {
            $decoded = json_decode($order['service_images'], true);
            $order['service_images_list'] = is_array($decoded) ? $decoded : [];
        } else {
            $order['service_images_list'] = [];
        }
        if (!empty($order['custom_fields'])) {
            $decodedCf = json_decode($order['custom_fields'], true);
            $order['custom_fields_map'] = is_array($decodedCf) ? $decodedCf : [];
        } else {
            $order['custom_fields_map'] = [];
        }

        return ['code' => 200, 'data' => $order];
    }

    /**
     * 师傅到达现场开始服务打卡
     */
    public function startOrderService(int $technicianId, int $orderId): array
    {
        $order = $this->orderModel->findById($orderId);
        if (!$order) {
            return ['code' => 404, 'msg' => '工单不存在'];
        }

        if ((int)$order['technician_id'] !== $technicianId) {
            return ['code' => 403, 'msg' => '无权操作非本人名下的工单'];
        }

        if ($order['status'] !== 'dispatched') {
            return ['code' => 400, 'msg' => '当前工单状态不允许开始服务'];
        }

        $now = time();
        $ok = $this->orderModel->updateStatus($orderId, 'in_service', [
            'service_start_time' => $now
        ]);

        return $ok 
            ? ['code' => 200, 'msg' => '打卡成功，服务已正式开始！', 'data' => ['service_start_time' => $now]]
            : ['code' => 500, 'msg' => '打卡失败，请重试'];
    }

    /**
     * 师傅完工拍照核销与提交凭证
     */
    public function finishOrderService(int $technicianId, int $orderId, array $serviceImages, string $remark = ''): array
    {
        $order = $this->orderModel->findById($orderId);
        if (!$order) {
            return ['code' => 404, 'msg' => '工单不存在'];
        }

        if ((int)$order['technician_id'] !== $technicianId) {
            return ['code' => 403, 'msg' => '无权操作非本人名下的工单'];
        }

        if (!in_array($order['status'], ['dispatched', 'in_service'], true)) {
            return ['code' => 400, 'msg' => '当前工单状态不允许完工核销'];
        }

        $now = time();
        $extra = [
            'service_finish_time' => $now,
            'service_images'      => $serviceImages
        ];
        if (!empty($remark)) {
            $extra['user_remark'] = trim(($order['user_remark'] ?? '') . ' 【师傅完工说明: ' . $remark . '】');
        }

        $ok = $this->orderModel->updateStatus($orderId, 'completed', $extra);
        if ($ok) {
            // 递增师傅完工总单数
            $this->technicianModel->incrementOrderCount($technicianId);
            return [
                'code' => 200,
                'msg'  => '工单完工核销成功，已归档！',
                'data' => [
                    'order_id'            => $orderId,
                    'service_finish_time' => $now
                ]
            ];
        }

        return ['code' => 500, 'msg' => '完工核销失败，请重试'];
    }

    /**
     * 会员自主申请入驻（全自营模式下已关闭公开入驻）
     */
    public function applyTechnician(int $userId, array $data): array
    {
        return [
            'code' => 403,
            'msg'  => '暂无操作权限'
        ];
    }
}
