<?php
/**
 * 启灵独立回收系统 - PSR-4 规范极简自动加载器
 * 说明：零 Composer 依赖，纯原生运行，解压即用，方便宝塔及各类服务器极速部署
 * 编码：UTF-8 无 BOM
 */

namespace App\Common;

class Autoloader
{
    /**
     * 注册自动加载器
     */
    public static function register(): void
    {
        spl_autoload_register([self::class, 'load']);
    }

    /**
     * 命名空间加载映射逻辑
     * 规则：App\ 命名空间对应 app/ 目录
     */
    public static function load(string $class): void
    {
        $prefix = 'App\\';
        // dirname(__DIR__) 即为 app/ 根目录
        $baseDir = dirname(__DIR__) . DIRECTORY_SEPARATOR;

        $len = strlen($prefix);
        if (strncmp($prefix, $class, $len) !== 0) {
            return;
        }

        $relativeClass = substr($class, $len);

        // 1. 尝试直接路径匹配
        $file = $baseDir . str_replace('\\', DIRECTORY_SEPARATOR, $relativeClass) . '.php';
        if (is_file($file)) {
            require $file;
            return;
        }

        // 2. 兼容 Linux 大小写敏感环境：目录转小写 + 类名保持原样 (StudlyCaps)
        // 例如 App\Common\Response -> app/common/Response.php
        // 例如 App\Controller\Api\AppraisalController -> app/controller/api/AppraisalController.php
        $parts = explode('\\', $relativeClass);
        $className = array_pop($parts);
        $subDir = strtolower(implode(DIRECTORY_SEPARATOR, $parts));
        $fileLower = $baseDir . ($subDir !== '' ? $subDir . DIRECTORY_SEPARATOR : '') . $className . '.php';
        if (is_file($fileLower)) {
            require $fileLower;
            return;
        }
    }
}
