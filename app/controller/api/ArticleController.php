<?php
/**
 * 启灵同城服务系统 - 前台文章与单页接口控制器
 * 提供文章单页详情、协议条款内容调取及浏览量统计
 */

declare(strict_types=1);

namespace App\Controller\Api;

use App\Controller\Controller;
use App\Common\Request;
use App\Common\Response;
use App\Model\ArticleModel;

class ArticleController extends Controller
{
    private $articleModel;

    public function __construct()
    {
        $this->articleModel = new ArticleModel();
    }

    /**
     * 前台文章列表 (公开已发布)
     */
    public function list(): void
    {
        $category = trim((string)Request::get('category', 'all'));
        $articles = $this->articleModel->getAllArticles(true, '', $category);
        Response::success($articles, '获取文章列表成功');
    }

    /**
     * 前台底部专用文章列表 (公开已发布且勾选底部展示)
     */
    public function footer(): void
    {
        $articles = $this->articleModel->getFooterArticlesGrouped();
        Response::success($articles, '获取底部文章成功');
    }

    /**
     * 前台与小程序端官方公告列表 (公开跑马灯与弹窗播报)
     * GET /api/article/notices
     */
    public function notices(): void
    {
        $limit = Request::getInt('limit', 10);
        $notices = $this->articleModel->getNotices($limit);
        Response::success($notices, '获取最新公告列表成功');
    }

    /**
     * 前台文章单页详情 (支持通过 ID 或 Slug 查询)
     */
    public function detail(): void
    {
        $id = Request::getInt('id', 0);
        $slug = trim((string)Request::get('slug', ''));

        $article = null;
        if ($id > 0) {
            $article = $this->articleModel->getArticleById($id);
        } elseif ($slug !== '') {
            // 兼容历史别名映射
            if ($slug === 'about-us') {
                $slug = 'about';
            } elseif ($slug === 'inspection-rules') {
                $slug = 'quality-payout';
            }
            $article = $this->articleModel->getArticleBySlug($slug);
        }

        if (!$article || (int)$article['status'] !== 1) {
            Response::error('文章或单页不存在或已下架', 404);
            return;
        }

        // 自增阅读计数
        $this->articleModel->incrementViewCount((int)$article['id']);
        $article['view_count'] = (int)$article['view_count'] + 1;

        Response::success($article, '获取文章详情成功');
    }
}
