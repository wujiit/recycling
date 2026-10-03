<?php
/**
 * 启灵独立回收系统 - 后台文章与单页管理控制器
 * 职责：负责平台单页、条款协议（免责声明、用户协议、隐私政策）、回收指南等内容的增删改查
 * 规范：严格继承 AdminBaseController 鉴权中间层，遵循单一职责与 PDO 预处理
 * 编码：UTF-8 无 BOM
 */

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Controller\Admin\AdminBaseController;
use App\Common\Request;
use App\Model\ArticleModel;

class ArticleController extends AdminBaseController
{
    private $articleModel;

    public function __construct()
    {
        parent::__construct();
        $this->articleModel = new ArticleModel();
    }

    /**
     * 文章/单页列表查询
     */
    public function list(): void
    {
        $keyword = trim((string)Request::get('keyword', ''));
        $category = trim((string)Request::get('category', 'all'));
        $status = (string)Request::get('status', 'all');

        $activeOnly = ($status === '1');
        $articles = $this->articleModel->getAllArticles($activeOnly, $keyword, $category);

        if ($status === '0') {
            $articles = array_values(array_filter($articles, function ($a) {
                return (int)$a['status'] === 0;
            }));
        }

        $this->success($articles, '获取文章单页列表成功');
    }

    /**
     * 单篇文章详情
     */
    public function detail(): void
    {
        $id = Request::getInt('id', 0);
        if ($id <= 0) {
            $this->error('文章参数无效');
        }

        $article = $this->articleModel->getArticleById($id);
        if (!$article) {
            $this->error('文章不存在或已被删除');
        }

        $this->success($article, '获取文章详情成功');
    }

    /**
     * 保存文章 (新增 / 更新)
     */
    public function save(): void
    {
        $id = Request::getInt('id', 0);
        $title = trim((string)Request::post('title', ''));
        $slug = trim((string)Request::post('slug', ''));
        $category = trim((string)Request::post('category', 'guide'));
        $summary = trim((string)Request::post('summary', ''));
        $content = (string)Request::post('content', '');
        $coverImage = trim((string)Request::post('cover_image', ''));
        $isFooter = Request::getInt('is_footer', 1);
        $footerColumn = trim((string)Request::post('footer_column', 'guide'));
        $sortOrder = Request::getInt('sort_order', 100);
        $status = Request::getInt('status', 1);

        if ($title === '') {
            $this->error('文章标题不能为空');
        }

        if ($slug === '') {
            $slug = 'art_' . time();
        }

        // 验证 slug 是否唯一
        $existing = $this->articleModel->getArticleBySlug($slug);
        if ($existing && (int)$existing['id'] !== $id) {
            $this->error('英文别名 (Slug) 已存在，请更换唯一标识');
        }

        $saveData = [
            'id'            => $id,
            'title'         => $title,
            'slug'          => $slug,
            'category'      => $category,
            'summary'       => $summary,
            'content'       => $content,
            'cover_image'   => $coverImage,
            'is_footer'     => $isFooter,
            'footer_column' => $footerColumn,
            'sort_order'    => $sortOrder,
            'status'        => $status,
        ];

        $savedId = $this->articleModel->saveArticle($saveData);

        // 清理首页缓存
        \App\Service\CacheService::getInstance()->delete('platform_info:appraisal');

        $this->success(['id' => $savedId], '文章保存成功');
    }

    /**
     * 删除文章
     */
    public function delete(): void
    {
        $id = Request::getInt('id', 0);
        if ($id <= 0) {
            $this->error('文章参数无效');
        }

        $res = $this->articleModel->deleteArticle($id);
        if ($res) {
            \App\Service\CacheService::getInstance()->delete('platform_info:appraisal');
            $this->success(null, '文章已成功删除');
        } else {
            $this->error('删除失败，文章可能不存在');
        }
    }

    /**
     * 快速切换底部展示开关
     */
    public function toggleFooter(): void
    {
        $id = Request::getInt('id', 0);
        $isFooter = Request::getInt('is_footer', 1);

        if ($id <= 0) {
            $this->error('参数无效');
        }

        $article = $this->articleModel->getArticleById($id);
        if (!$article) {
            $this->error('文章不存在');
        }

        $article['is_footer'] = $isFooter;
        $this->articleModel->saveArticle($article);

        \App\Service\CacheService::getInstance()->delete('platform_info:appraisal');

        $this->success(null, '底部展示设置已更新');
    }
}
