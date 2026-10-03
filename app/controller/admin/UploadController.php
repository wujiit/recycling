<?php
/**
 * 图片与附件上传控制器
 * 负责文件扩展名与 MIME 校验、安全过滤及文件保存
 */

namespace App\Controller\Admin;

use App\Controller\Admin\AdminBaseController;
use App\Common\Response;

class UploadController extends AdminBaseController
{
    /**
     * 上传单张图片（用于选项参考示意图、机型封面图、品类图标等）
     */
    public function image(): void
    {
        $file = $_FILES['file'] ?? ($_FILES['image'] ?? null);
        if (!$file || empty($file['tmp_name'])) {
            $this->error('未检测到上传文件');
        }

        if ($file['error'] !== UPLOAD_ERR_OK) {
            $this->error('文件上传失败，错误代码: ' . (int)$file['error']);
        }

        // 1. 限制文件大小 (最大 5MB)
        $maxSize = 5 * 1024 * 1024;
        if ($file['size'] > $maxSize) {
            $this->error('上传图片大小不能超过 5MB');
        }

        // 2. 校验文件扩展名白名单
        $origName = $file['name'] ?? '';
        $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
        $allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'];
        if (!in_array($ext, $allowedExts, true)) {
            $this->error('仅允许上传 JPG, PNG, WEBP, GIF, SVG 格式图片');
        }

        // 3. 校验真实图片内容与 MIME 类型 (防假图片伪造脚本)
        if ($ext === 'svg') {
            $content = (string)@file_get_contents($file['tmp_name']);
            // 防范 SVG 脚本与伪协议注入
            $dangerousPatterns = [
                '/<script/i',
                '/[\s\'"]on[a-z]+\s*=/i',
                '/href\s*=\s*[\'"]?\s*javascript:/i',
                '/xlink:href\s*=\s*[\'"]?\s*javascript:/i',
                '/<foreignobject/i',
                '/data:\s*text\/html/i'
            ];
            $hasDangerous = false;
            foreach ($dangerousPatterns as $pattern) {
                if (preg_match($pattern, $content)) {
                    $hasDangerous = true;
                    break;
                }
            }
            if (!$content || stripos($content, '<svg') === false || $hasDangerous) {
                $this->error('非法或包含潜在危险脚本的 SVG 图片，已被安全拦截');
            }
        } else {
            $imgInfo = @getimagesize($file['tmp_name']);
            if (!$imgInfo) {
                $this->error('非法图片文件，图片内容校验未通过');
            }

            $allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
            if (!in_array($imgInfo['mime'], $allowedMimes, true)) {
                $this->error('图片 MIME 类型不合法: ' . $imgInfo['mime']);
            }
        }

        // 4. 创建按月份隔离的存储目录
        $month = date('Ym');
        $saveRelDir = '/uploads/' . $month . '/';
        $saveFullDir = ROOT_PATH . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . $month;

        if (!is_dir($saveFullDir)) {
            if (!@mkdir($saveFullDir, 0755, true)) {
                $this->error('创建上传目录失败，请检查服务器 uploads/ 目录写入权限');
            }
        }

        // 5. 生成随机安全文件名
        $filename = date('dHis') . '_' . bin2hex(random_bytes(6)) . '.' . $ext;
        $destPath = $saveFullDir . DIRECTORY_SEPARATOR . $filename;

        if (!move_uploaded_file($file['tmp_name'], $destPath)) {
            $this->error('保存图片文件失败，请检查目录权限');
        }

        $url = $saveRelDir . $filename;
        $this->success([
            'url'      => $url,
            'filename' => $filename,
            'size'     => (int)$file['size'],
            'ext'      => $ext
        ], '图片上传成功');
    }
}
