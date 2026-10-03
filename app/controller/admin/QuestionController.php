<?php
/**
 * 估价与质检选项设置控制器
 * 负责分品类/分机型自定义评估题目与选项设置及图例配置
 */

namespace App\Controller\Admin;

use App\Controller\Admin\AdminBaseController;
use App\Common\Request;
use App\Model\QuestionModel;
use App\Model\DeviceModel;
use App\Service\CacheService;

class QuestionController extends AdminBaseController
{
    private $questionModel;
    private $deviceModel;

    public function __construct()
    {
        parent::__construct();
        $this->questionModel = new QuestionModel();
        $this->deviceModel = new DeviceModel();
    }

    /**
     * 获取评估题目与选项列表 (支持按品类 category_id 及机型 device_id 筛选)
     */
    public function list(): void
    {
        $catParam = Request::get('category_id', 'all');
        $categoryId = ($catParam === 'all' || $catParam === '') ? null : (int)$catParam;
        $deviceId = Request::getInt('device_id', 0) ?: null;

        $list = $this->questionModel->getQuestionList($categoryId, $deviceId);
        $categories = $this->deviceModel->getCategoryList(false);

        $this->success([
            'list'       => $list,
            'categories' => $categories
        ], '获取评估题目与选项配置成功');
    }

    /**
     * 保存或更新评估题目
     */
    public function saveQuestion(): void
    {
        $id = Request::postInt('id', 0);
        $categoryId = Request::postInt('category_id', 0);
        $deviceId = Request::postInt('device_id', 0);
        $title = trim((string)Request::post('title', ''));
        $subTitle = trim((string)Request::post('sub_title', ''));
        $type = (string)Request::post('type', 'radio');
        $isRequired = Request::postInt('is_required', 1);
        $sort = Request::postInt('sort', 0);

        if (empty($title)) {
            $this->error('题目标题不能为空');
        }

        $qid = $this->questionModel->saveQuestion([
            'id'          => $id,
            'category_id' => $categoryId,
            'device_id'   => $deviceId,
            'title'       => $title,
            'sub_title'   => $subTitle,
            'type'        => $type,
            'is_required' => $isRequired,
            'sort'        => $sort
        ]);

        CacheService::getInstance()->clear();
        $this->success(['id' => $qid], '评估题目保存成功');
    }

    /**
     * 删除评估题目及其所有选项
     */
    public function deleteQuestion(): void
    {
        $id = Request::postInt('id', 0);
        if ($id <= 0) {
            $this->error('题目 ID 不能为空');
        }

        $this->questionModel->deleteQuestion($id);
        CacheService::getInstance()->clear();
        $this->success(null, '题目及其选项已成功删除');
    }

    /**
     * 保存或更新选项细项 (含参考示意图)
     */
    public function saveItem(): void
    {
        $id = Request::postInt('id', 0);
        $questionId = Request::postInt('question_id', 0);
        $name = trim((string)Request::post('name', ''));
        $descText = trim((string)Request::post('desc_text', ''));
        $image = trim((string)Request::post('image', ''));
        $deductType = (string)Request::post('deduct_type', 'fixed');
        $deductValue = (float)Request::post('deduct_value', 0.00);
        $isFault = Request::postInt('is_fault', 0);
        $sort = Request::postInt('sort', 0);

        if ($questionId <= 0) {
            $this->error('所属题目 ID 不能为空');
        }
        if (empty($name)) {
            $this->error('选项文案不能为空');
        }

        $itemId = $this->questionModel->saveItem([
            'id'           => $id,
            'question_id'  => $questionId,
            'name'         => $name,
            'desc_text'    => $descText,
            'image'        => $image,
            'deduct_type'  => $deductType,
            'deduct_value' => $deductValue,
            'is_fault'     => $isFault,
            'sort'         => $sort
        ]);

        CacheService::getInstance()->clear();
        $this->success(['id' => $itemId], '选项配置保存成功');
    }

    /**
     * 删除选项
     */
    public function deleteItem(): void
    {
        $id = Request::postInt('id', 0);
        if ($id <= 0) {
            $this->error('选项 ID 不能为空');
        }

        $this->questionModel->deleteItem($id);
        CacheService::getInstance()->clear();
        $this->success(null, '选项已成功删除');
    }
}
