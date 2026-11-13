<?php
/**
 * 启灵同城生活服务 - 管理后台师傅/技师管理控制器
 * 负责师傅档案维护、资质审核认证、星级评定、手动派单候选人检索
 * 编码：UTF-8 无 BOM
 */

namespace App\Controller\Admin;

use App\Controller\Admin\AdminBaseController;
use App\Common\Request;
use App\Model\TechnicianModel;
use App\Service\AuthService;

class TechnicianController extends AdminBaseController
{
    private $technicianModel;

    public function __construct()
    {
        parent::__construct();
        $this->technicianModel = new TechnicianModel();
    }

    /**
     * 师傅列表与多维检索
     */
    public function list(): void
    {
        $status = Request::get('status', 'all');
        $isOnline = Request::get('is_online', 'all');
        $cityName = trim((string)Request::get('city_name', ''));
        $keyword = trim((string)Request::get('keyword', ''));
        $page = Request::getInt('page', 1);
        $pageSize = Request::getInt('page_size', 15);

        $filter = [
            'status'    => $status,
            'is_online' => $isOnline,
            'city_name' => $cityName,
            'keyword'   => $keyword
        ];

        $res = $this->technicianModel->searchTechnicians($filter, $page, $pageSize);
        $this->success($res, '获取师傅列表成功');
    }

    /**
     * 获取单个师傅档案详情
     */
    public function detail(): void
    {
        $id = Request::getInt('id', 0);
        if ($id <= 0) {
            $this->error('师傅 ID 不能为空');
        }

        $tech = $this->technicianModel->findById($id);
        if (!$tech) {
            $this->error('师傅档案不存在', 404);
        }

        $this->success($tech, '获取师傅详情成功');
    }

    /**
     * 保存/编辑师傅档案
     */
    public function save(): void
    {
        $id = Request::postInt('id', 0);
        $userId = Request::postInt('user_id', 0);
        $name = trim((string)Request::post('name', ''));
        $mobile = trim((string)Request::post('mobile', ''));
        $avatar = trim((string)Request::post('avatar', ''));
        $idCard = trim((string)Request::post('id_card', ''));
        $serviceTypes = trim((string)Request::post('service_types', 'service,errand'));
        $serviceCategories = trim((string)Request::post('service_categories', ''));
        $cityName = trim((string)Request::post('city_name', '深圳市'));
        $districtName = trim((string)Request::post('district_name', '全城服务'));
        $starRating = (float)Request::post('star_rating', 5.00);
        $depositBalance = (float)Request::post('deposit_balance', 0.00);
        $status = Request::postInt('status', 1);
        $isOnline = Request::postInt('is_online', 1);
        $auditRemark = trim((string)Request::post('audit_remark', ''));

        if (empty($name) || empty($mobile)) {
            $this->error('师傅姓名与联系手机号不能为空');
        }

        $savedId = $this->technicianModel->save([
            'id'                 => $id,
            'user_id'            => $userId,
            'name'               => $name,
            'mobile'             => $mobile,
            'avatar'             => $avatar ?: '/uploads/default/avatar_default.svg',
            'id_card'            => $idCard,
            'service_types'      => $serviceTypes,
            'service_categories' => $serviceCategories,
            'city_name'          => $cityName,
            'district_name'      => $districtName,
            'star_rating'        => $starRating,
            'deposit_balance'    => $depositBalance,
            'status'             => $status,
            'is_online'          => $isOnline,
            'audit_remark'       => $auditRemark
        ]);

        $action = $id > 0 ? 'update_technician' : 'create_technician';
        (new AuthService())->logAdminAction($this->getAdminId(), $action, "保存师傅档案: [{$name}] ID: {$savedId}");

        $this->success(['id' => $savedId], '师傅档案保存成功');
    }

    /**
     * 审核师傅入驻资质申请
     */
    public function audit(): void
    {
        $id = Request::postInt('id', 0);
        $status = Request::postInt('status', 1); // 1-通过认证, 2-驳回/未通过
        $remark = trim((string)Request::post('audit_remark', ''));

        if ($id <= 0) {
            $this->error('师傅 ID 不能为空');
        }

        $tech = $this->technicianModel->findById($id);
        if (!$tech) {
            $this->error('师傅档案不存在', 404);
        }

        $this->technicianModel->save([
            'id'           => $id,
            'status'       => $status,
            'is_online'    => $status === 1 ? 1 : 0,
            'audit_remark' => $remark ?: ($status === 1 ? '官方资质审核通过' : '审核未通过')
        ]);

        $statusLabel = $status === 1 ? '审核通过并授权接单' : '驳回资质申请';
        (new AuthService())->logAdminAction($this->getAdminId(), 'audit_technician', "审核师傅 [{$tech['name']}] (ID: {$id}): {$statusLabel}");

        $this->success(null, "师傅资质已处理: {$statusLabel}");
    }

    /**
     * 删除师傅档案
     */
    public function delete(): void
    {
        $id = Request::postInt('id', 0);
        if ($id <= 0) {
            $this->error('师傅 ID 不能为空');
        }

        $errorMsg = '';
        $ok = $this->technicianModel->delete($id, $errorMsg);
        if ($ok) {
            (new AuthService())->logAdminAction($this->getAdminId(), 'delete_technician', "删除师傅档案 ID: {$id}");
            $this->success(null, '师傅档案已删除');
        } else {
            $this->error($errorMsg ?: '删除失败');
        }
    }

    /**
     * 手动派单下拉选用：获取所有已认证且在职的师傅精简列表
     */
    public function options(): void
    {
        $res = $this->technicianModel->searchTechnicians(['status' => 1], 1, 100);
        $options = [];
        foreach ($res['list'] as $item) {
            $options[] = [
                'id'            => (int)$item['id'],
                'name'          => $item['name'],
                'mobile'        => $item['mobile'],
                'is_online'     => (int)$item['is_online'] === 1,
                'city_name'     => $item['city_name'],
                'district_name' => $item['district_name'],
                'star_rating'   => (float)$item['star_rating'],
                'order_count'   => (int)$item['order_count']
            ];
        }
        $this->success($options, '获取可用师傅选项成功');
    }
}
