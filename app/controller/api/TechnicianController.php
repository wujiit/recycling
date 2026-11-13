<?php
/**
 * 启灵同城生活服务 - 师傅移动端工作台控制器
 * 负责师傅资料统计、接单大厅抢单、工单履约、开始作业打卡与拍照完工核销
 * 编码：UTF-8 无 BOM
 */

namespace App\Controller\Api;

use App\Controller\Controller;
use App\Common\Request;
use App\Service\AuthService;
use App\Service\TechnicianService;
use App\Model\TechnicianModel;

class TechnicianController extends Controller
{
    private $authService;
    private $technicianService;
    private $technicianModel;

    public function __construct()
    {
        $this->authService = new AuthService();
        $this->technicianService = new TechnicianService();
        $this->technicianModel = new TechnicianModel();
    }

    /**
     * 获取登录用户
     */
    private function getAuthedUser(): array
    {
        $token = (string)Request::get('token', Request::post('token', ''));
        if (empty($token)) {
            $this->error('请先登录师傅或会员账号', 401);
        }
        $user = $this->authService->checkUserToken($token);
        if (!$user) {
            $this->error('登录态已失效，请重新登录', 401);
        }
        return $user;
    }

    /**
     * 获取已认证的师傅档案
     */
    private function getAuthedTechnician(): array
    {
        $user = $this->getAuthedUser();
        $tech = $this->technicianModel->findByUser((int)$user['id'], (string)($user['mobile'] ?? ''));
        if (!$tech) {
            $this->error('您尚未认证为服务师傅，请先提交入驻申请', 403, ['not_registered' => true]);
        }
        if ((int)$tech['status'] === 0) {
            $this->error('您的师傅资质正在审核中，请耐心等待管理员审核', 403, ['pending_audit' => true]);
        }
        if ((int)$tech['status'] !== 1) {
            $this->error('您的师傅账号已被冻结或停用，请联系客服', 403);
        }
        return $tech;
    }

    /**
     * 师傅工作台主页资料与今日工单指标概览
     * GET /api/technician/profile
     */
    public function profile(): void
    {
        $user = $this->getAuthedUser();
        $res = $this->technicianService->getProfile($user);
        $this->success($res['data'], '获取工作台数据成功');
    }

    /**
     * 切换师傅出车开工/收工休息状态
     * POST /api/technician/toggleOnline
     */
    public function toggleOnline(): void
    {
        $tech = $this->getAuthedTechnician();
        $isOnline = Request::postInt('is_online', 1);

        $res = $this->technicianService->toggleOnline((int)$tech['id'], $isOnline);
        if ($res['code'] === 200) {
            $this->success(null, $res['msg']);
        } else {
            $this->error($res['msg'], $res['code']);
        }
    }

    /**
     * 接单大厅：查询可抢公共待接工单池
     * GET /api/technician/pool?page=1
     */
    public function pool(): void
    {
        $tech = $this->getAuthedTechnician();
        $page = Request::getInt('page', 1);
        $pageSize = Request::getInt('page_size', 15);

        $res = $this->technicianService->getPool((int)$tech['id'], $page, $pageSize);
        if ($res['code'] === 200) {
            $this->success($res['data'], '获取接单大厅工单成功');
        } else {
            $this->error($res['msg'], $res['code']);
        }
    }

    /**
     * 师傅抢单
     * POST /api/technician/grab
     */
    public function grab(): void
    {
        $tech = $this->getAuthedTechnician();
        $orderId = Request::postInt('order_id', 0);
        if ($orderId <= 0) {
            $this->error('工单 ID 不能为空');
        }

        $res = $this->technicianService->grabOrder((int)$tech['id'], $orderId);
        if ($res['code'] === 200) {
            $this->success($res['data'] ?? null, $res['msg']);
        } else {
            $this->error($res['msg'], $res['code']);
        }
    }

    /**
     * 师傅我的工单列表
     * GET /api/technician/myOrders?status_group=todo&page=1
     */
    public function myOrders(): void
    {
        $tech = $this->getAuthedTechnician();
        $statusGroup = trim((string)Request::get('status_group', 'all'));
        $page = Request::getInt('page', 1);
        $pageSize = Request::getInt('page_size', 15);

        $res = $this->technicianService->getMyOrders((int)$tech['id'], $statusGroup, $page, $pageSize);
        $this->success($res['data'], '获取我的工单成功');
    }

    /**
     * 师傅查看单个工单详细信息 (包含精准导航地址与拨号电话)
     * GET /api/technician/orderDetail?order_id=1
     */
    public function orderDetail(): void
    {
        $tech = $this->getAuthedTechnician();
        $orderId = Request::getInt('order_id', 0);
        if ($orderId <= 0) {
            $this->error('工单 ID 不能为空');
        }

        $res = $this->technicianService->getOrderDetail((int)$tech['id'], $orderId);
        if ($res['code'] === 200) {
            $this->success($res['data'], '获取工单详情成功');
        } else {
            $this->error($res['msg'], $res['code']);
        }
    }

    /**
     * 师傅到达现场开始服务打卡
     * POST /api/technician/startService
     */
    public function startService(): void
    {
        $tech = $this->getAuthedTechnician();
        $orderId = Request::postInt('order_id', 0);
        if ($orderId <= 0) {
            $this->error('工单 ID 不能为空');
        }

        $res = $this->technicianService->startOrderService((int)$tech['id'], $orderId);
        if ($res['code'] === 200) {
            $this->success($res['data'] ?? null, $res['msg']);
        } else {
            $this->error($res['msg'], $res['code']);
        }
    }

    /**
     * 师傅完工拍照核销与凭证上传
     * POST /api/technician/finishService
     */
    public function finishService(): void
    {
        $tech = $this->getAuthedTechnician();
        $orderId = Request::postInt('order_id', 0);
        $images = Request::post('service_images', []);
        $remark = trim((string)Request::post('remark', ''));

        if ($orderId <= 0) {
            $this->error('工单 ID 不能为空');
        }
        if (!is_array($images) || empty($images)) {
            $this->error('请至少上传一张服务完工/作业现场核销凭证照片');
        }

        $res = $this->technicianService->finishOrderService((int)$tech['id'], $orderId, $images, $remark);
        if ($res['code'] === 200) {
            $this->success($res['data'] ?? null, $res['msg']);
        } else {
            $this->error($res['msg'], $res['code']);
        }
    }

    /**
     * 会员自主申请入驻成为师傅
     * POST /api/technician/apply
     */
    public function apply(): void
    {
        $user = $this->getAuthedUser();
        $data = [
            'name'          => trim((string)Request::post('name', '')),
            'mobile'        => trim((string)Request::post('mobile', $user['mobile'] ?? '')),
            'id_card'       => trim((string)Request::post('id_card', '')),
            'city_name'     => trim((string)Request::post('city_name', '深圳市')),
            'district_name' => trim((string)Request::post('district_name', '全城')),
            'service_types' => trim((string)Request::post('service_types', 'service'))
        ];

        $res = $this->technicianService->applyTechnician((int)$user['id'], $data);
        if ($res['code'] === 200) {
            $this->success($res['data'] ?? null, $res['msg']);
        } else {
            $this->error($res['msg'], $res['code']);
        }
    }
}
