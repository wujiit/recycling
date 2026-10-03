<?php
/**
 * 商业正版授权控制器
 * 负责查看授权状态、保存授权码与触发远程联网验证
 */

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Common\Request;
use App\Service\LicenseService;

class LicenseController extends AdminBaseController
{
    private $licenseService;

    public function __construct()
    {
        parent::__construct();
        $this->licenseService = LicenseService::getInstance();
    }

    /**
     * 获取当前系统授权概况
     */
    public function getInfo(): void
    {
        $info = $this->licenseService->getLicenseInfo();
        $this->success($info, '获取授权状态成功');
    }

    /**
     * 保存授权配置并立即联网激活
     */
    public function saveAndVerify(): void
    {
        $serverUrl = trim((string)Request::post('server_url', ''));
        $licenseKey = trim((string)Request::post('license_key', ''));

        if (empty($serverUrl)) {
            $serverUrl = $this->licenseService->getConfig('license_server_url', LicenseService::DEFAULT_SERVER_URL);
        }
        if (empty($serverUrl)) {
            $serverUrl = LicenseService::DEFAULT_SERVER_URL;
        }

        // 保存服务器地址
        $this->licenseService->setConfig('license_server_url', $serverUrl);

        // 如果传入了新的非脱敏授权码，进行更新
        if (!empty($licenseKey) && strpos($licenseKey, '****') === false) {
            $this->licenseService->setConfig('license_key', $licenseKey);
        } else {
            $licenseKey = $this->licenseService->getConfig('license_key', '');
        }

        if (empty($licenseKey)) {
            $this->error('正版授权密钥 (License Key) 不能为空');
        }

        // 发起远程验证
        $result = $this->licenseService->verifyOnline($licenseKey, $serverUrl);

        if ($result['code'] === 200) {
            $this->success($result['data'], $result['msg']);
        } else {
            $this->error($result['msg'], $result['code'], $result['data'] ?? null);
        }
    }

    /**
     * 重新联网核验授权
     */
    public function recheck(): void
    {
        $result = $this->licenseService->verifyOnline();
        if ($result['code'] === 200) {
            $this->success($result['data'], $result['msg']);
        } else {
            $this->error($result['msg'], $result['code'], $result['data'] ?? null);
        }
    }
}
