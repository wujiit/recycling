<?php
/**
 * 启灵独立回收系统 - 本地图库与媒体资源管理控制器
 * 功能：统一管理系统预设矢量图例、管理员上传图片及用户回收/质检图片
 * 安全：严格防范目录遍历（Path Traversal）与脚本上传，保护系统预设核心资产
 * 编码：UTF-8 无 BOM
 */

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Controller\Admin\AdminBaseController;
use App\Common\Request;
use App\Common\Response;

class MediaController extends AdminBaseController
{
    /**
     * 允许管理的图片扩展名白名单
     */
    private const ALLOWED_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'ico'];

    /**
     * 获取本地图库文件列表与统计
     */
    public function list(): void
    {
        $source = (string)Request::get('source', 'all'); // all, default, uploads
        $keyword = trim((string)Request::get('keyword', ''));
        $page = max(1, (int)Request::get('page', 1));
        $limitParam = Request::get('limit') ?: Request::get('page_size', 24);
        $pageSize = min(100, max(1, (int)$limitParam));

        $uploadsBase = ROOT_PATH . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'uploads';
        if (!is_dir($uploadsBase)) {
            @mkdir($uploadsBase, 0755, true);
        }

        $allFiles = [];
        $totalBytes = 0;
        $defaultCount = 0;
        $uploadCount = 0;

        // 递归扫描 uploads 目录
        $this->scanDirectory($uploadsBase, $uploadsBase, $allFiles, $totalBytes, $defaultCount, $uploadCount);

        // 1. 来源筛选
        if ($source === 'default') {
            $filtered = array_filter($allFiles, fn($f) => $f['source'] === 'default');
        } elseif ($source === 'uploads' || $source === 'upload') {
            $filtered = array_filter($allFiles, fn($f) => $f['source'] === 'upload');
        } else {
            $filtered = $allFiles;
        }

        // 2. 关键词检索 (匹配文件名)
        if ($keyword !== '') {
            $kwLower = mb_strtolower($keyword, 'UTF-8');
            $filtered = array_filter($filtered, function($f) use ($kwLower) {
                return mb_stripos(mb_strtolower($f['filename'], 'UTF-8'), $kwLower) !== false;
            });
        }

        // 3. 排序 (按最新修改时间倒序)
        usort($filtered, function($a, $b) {
            return $b['mtime'] <=> $a['mtime'];
        });

        $total = count($filtered);
        $offset = ($page - 1) * $pageSize;
        $pagedList = array_slice($filtered, $offset, $pageSize);
        $totalPages = $pageSize > 0 ? (int)ceil($total / $pageSize) : 1;

        $this->success([
            'list'        => array_values($pagedList),
            'total'       => $total,
            'page'        => $page,
            'limit'       => $pageSize,
            'page_size'   => $pageSize,
            'total_pages' => $totalPages,
            'stats'       => [
                'total_count'           => count($allFiles),
                'default_count'         => $defaultCount,
                'upload_count'          => $uploadCount,
                'total_size'            => $this->formatBytes($totalBytes),
                'total_bytes_formatted' => $this->formatBytes($totalBytes)
            ]
        ], '获取本地图库列表成功');
    }

    /**
     * 安全删除图片
     */
    public function delete(): void
    {
        $url = trim((string)(Request::post('url') ?: Request::post('path', '')));
        if (empty($url)) {
            $this->error('未指定要删除的图片路径');
        }

        // 安全防穿透与格式校验
        if (strpos($url, '..') !== false || !str_starts_with($url, '/uploads/')) {
            $this->error('非法的文件路径');
        }

        // 保护系统预设图例
        if (str_starts_with($url, '/uploads/default/')) {
            $this->error('系统内置图例属于基础资产，受到系统保护禁止删除');
        }

        $uploadsBase = ROOT_PATH . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'uploads';
        $fullPath = ROOT_PATH . DIRECTORY_SEPARATOR . 'public' . str_replace('/', DIRECTORY_SEPARATOR, $url);

        $realBase = realpath($uploadsBase);
        $realPath = realpath($fullPath);

        if (!$realPath || !$realBase || !str_starts_with($realPath, $realBase)) {
            $this->error('目标文件不存在或路径不合法');
        }

        if (!is_file($realPath)) {
            $this->error('目标文件已被移除或不存在');
        }

        if (!@unlink($realPath)) {
            $this->error('删除文件失败，请检查服务器磁盘权限');
        }

        $this->success(null, '图片已成功安全移出图库');
    }

    /**
     * 辅助：递归扫描目录
     */
    private function scanDirectory(string $dir, string $base, array &$allFiles, int &$totalBytes, int &$defaultCount, int &$uploadCount): void
    {
        $items = @scandir($dir);
        if ($items === false) return;

        foreach ($items as $item) {
            if ($item === '.' || $item === '..') continue;

            $full = $dir . DIRECTORY_SEPARATOR . $item;
            if (is_dir($full)) {
                $this->scanDirectory($full, $base, $allFiles, $totalBytes, $defaultCount, $uploadCount);
            } elseif (is_file($full)) {
                $ext = strtolower(pathinfo($item, PATHINFO_EXTENSION));
                if (!in_array($ext, self::ALLOWED_EXTS, true)) continue;

                $rel = str_replace([$base, DIRECTORY_SEPARATOR], ['', '/'], $full);
                $url = '/uploads' . $rel;
                $size = (int)@filesize($full);
                $mtime = (int)@filemtime($full);
                $isDefault = str_starts_with($url, '/uploads/default/');

                $totalBytes += $size;
                if ($isDefault) {
                    $defaultCount++;
                } else {
                    $uploadCount++;
                }

                // 尺寸探测
                $dimStr = 'SVG 矢量';
                if ($ext !== 'svg') {
                    $info = @getimagesize($full);
                    if ($info && isset($info[0], $info[1])) {
                        $dimStr = $info[0] . ' × ' . $info[1];
                    } else {
                        $dimStr = '位图';
                    }
                }

                $allFiles[] = [
                    'url'             => $url,
                    'path'            => $url,
                    'name'            => $item,
                    'filename'        => $item,
                    'ext'             => $ext,
                    'size'            => $size,
                    'size_bytes'      => $size,
                    'size_human'      => $this->formatBytes($size),
                    'size_formatted'  => $this->formatBytes($size),
                    'mtime'           => $mtime,
                    'mtime_human'     => date('Y-m-d H:i', $mtime),
                    'mtime_formatted' => date('Y-m-d H:i', $mtime),
                    'dimension'       => $dimStr,
                    'dimensions'      => $dimStr,
                    'source'          => $isDefault ? 'default' : 'upload',
                    'source_label'    => $isDefault ? '平台内置图例' : '自主/用户上传'
                ];
            }
        }
    }

    /**
     * 格式化文件大小
     */
    private function formatBytes(int $bytes): string
    {
        if ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 2) . ' MB';
        }
        if ($bytes >= 1024) {
            return number_format($bytes / 1024, 1) . ' KB';
        }
        return $bytes . ' B';
    }
}
