<?php
/**
 * 全局参数设置控制器
 * 负责系统配置、支付参数、履约设置等的读取与更新
 */

namespace App\Controller\Admin;

use App\Controller\Admin\AdminBaseController;
use App\Common\Request;
use App\Model\Database;

class ConfigController extends AdminBaseController
{
    private $db;

    public function __construct()
    {
        parent::__construct();
        $this->db = Database::getInstance();
    }

    /**
     * 获取系统全套参数配置 (支持高速缓存)
     */
    public function getConfigs(): void
    {
        $cache = \App\Service\CacheService::getInstance();
        $cached = $cache->get('sys_config:all');
        if (is_array($cached)) {
            $this->success($cached, '获取配置成功');
            return;
        }

        $p = $this->db->getPrefix();
        $sql = "SELECT `group_name`, `config_key`, `config_value`, `remark` FROM `{$p}sys_config`";
        $rows = $this->db->fetchAll($sql);

        $configs = [];
        $hasPayoutPwd = false;
        foreach ($rows as $row) {
            // 敏感字段保护：不向前端返回密码哈希
            if ($row['config_key'] === 'payout_security_password_hash') {
                $hasPayoutPwd = !empty($row['config_value']);
                continue;
            }
            $configs[$row['config_key']] = $row['config_value'];
        }
        $configs['payout_security_password_set'] = $hasPayoutPwd ? '1' : '0';
        $cache->set('sys_config:all', $configs, 3600);

        $this->success($configs, '获取配置成功');
    }

    /**
     * 保存参数配置
     */
    public function saveConfigs(): void
    {
        $configs = Request::post('configs', []);
        if (!is_array($configs) || empty($configs)) {
            $this->error('配置数据不能为空');
        }

        $p = $this->db->getPrefix();
        $sql = "INSERT INTO `{$p}sys_config` (`group_name`, `config_key`, `config_value`, `updated_at`) 
                VALUES ('system', ?, ?, ?) 
                ON DUPLICATE KEY UPDATE `config_value` = VALUES(`config_value`), `updated_at` = VALUES(`updated_at`)";

        $now = time();
        foreach ($configs as $k => $v) {
            $key = trim((string)$k);
            if (empty($key)) {
                continue;
            }

            // 支付密码独立哈希存储
            if ($key === 'payout_security_password') {
                $pwdVal = trim((string)$v);
                if (!empty($pwdVal) && $pwdVal !== '******') {
                    $hash = password_hash($pwdVal, PASSWORD_DEFAULT);
                    $this->db->execute($sql, ['payout_security_password_hash', $hash, $now]);
                }
                continue;
            }

            $this->db->execute($sql, [$key, (string)$v, $now]);
        }

        // 配置变更时主动清理系统配置与平台聚合缓存
        $cache = \App\Service\CacheService::getInstance();
        $cache->delete('sys_config:all');
        $cache->delete('platform_info:appraisal');

        $this->success(null, '系统配置已保存更新');
    }

    /**
     * 获取全套行业业务模板列表及当前模式
     */
    public function getTemplates(): void
    {
        $svc = new \App\Service\TemplateService();
        $this->success([
            'current' => $svc->getCurrentTemplateKey(),
            'meta'    => $svc->getCurrentTemplateMeta(),
            'list'    => $svc->getTemplateList()
        ], '获取业务模板成功');
    }

    /**
     * 一键切换行业业务模板并装载该行业标准库
     */
    public function switchTemplate(): void
    {
        $templateKey = (string)Request::post('template', 'universal');
        $initData = (bool)Request::post('init_data', true);

        $svc = new \App\Service\TemplateService();
        $res = $svc->switchTemplate($templateKey, $initData);
        if ($res['code'] === 200) {
            $this->success($res['data'], $res['msg']);
        } else {
            $this->error($res['msg'], $res['code']);
        }
    }

    /**
     * 依据当前生效的行业模板一键同步小程序端装修参数
     */
    public function syncMiniappTemplate(): void
    {
        $svc = new \App\Service\TemplateService();
        $res = $svc->syncMiniappToCurrentTemplate();
        if ($res['code'] === 200) {
            $this->success($res['data'], $res['msg']);
        } else {
            $this->error($res['msg'], $res['code'] ?? 500);
        }
    }

    /**
     * 获取全套视觉主题风格模版列表及当前生效风格
     */
    public function getThemeStyles(): void
    {
        $svc = new \App\Service\TemplateService();
        $this->success([
            'current' => $svc->getCurrentThemeStyle(),
            'list'    => $svc->getThemeStyleList(),
        ], '获取主题风格列表成功');
    }

    /**
     * 一键切换全站视觉主题风格模版 (无损换肤)
     */
    public function switchThemeStyle(): void
    {
        $themeKey = (string)Request::post('theme_key', 'tech_blue');
        $customColors = Request::post('custom_colors', []);

        $svc = new \App\Service\TemplateService();
        $res = $svc->switchThemeStyle($themeKey, is_array($customColors) ? $customColors : []);
        if ($res['code'] === 200) {
            $this->success($res['data'], $res['msg']);
        } else {
            $this->error($res['msg'], $res['code']);
        }
    }

    /**
     * 测试灵简 IP 归属地接口 API Key 连通性
     */
    public function testIpApi(): void
    {
        $apiKey = (string)Request::post('api_key', '');
        $ip = (string)Request::post('ip', '114.114.114.114');

        if (empty($apiKey)) {
            $p = $this->db->getPrefix();
            $row = $this->db->fetchOne("SELECT `config_value` FROM `{$p}sys_config` WHERE `config_key` = 'lingjian_ip_api_key' LIMIT 1");
            $apiKey = (string)($row['config_value'] ?? '');
        }

        $svc = \App\Service\IpService::getInstance();
        $res = $svc->testKey($apiKey, $ip);

        if ($res['code'] === 200) {
            $this->success($res['data'], $res['msg']);
        } else {
            $this->error($res['msg'], $res['code'], $res['data']);
        }
    }

    /**
     * 测试顺丰速运接口连通性 (支持临时覆盖参数测试)
     */
    public function testSfExpress(): void
    {
        $override = [
            'sf_partner_id'   => (string)Request::post('sf_partner_id', ''),
            'sf_check_word'   => (string)Request::post('sf_check_word', ''),
            'sf_sign_type'    => (string)Request::post('sf_sign_type', 'simple'),
            'sf_env'          => (string)Request::post('sf_env', 'sandbox'),
            'sf_monthly_card' => (string)Request::post('sf_monthly_card', ''),
        ];

        $svc = new \App\Service\SfExpressService();
        $res = $svc->testConnection($override);

        if ($res['code'] === 200) {
            $this->success($res['data'] ?? null, $res['msg']);
        } else {
            $this->error($res['msg'], $res['code'], $res['data'] ?? null);
        }
    }

    /**
     * 测试微信小程序开发凭证连通性 (实时握手微信公众平台 API)
     */
    public function testWechatCredentials(): void
    {
        $appId = trim((string)Request::post('appid', ''));
        $appSecret = trim((string)Request::post('secret', ''));

        $svc = new \App\Service\WechatService();
        $res = $svc->testCredentials($appId, $appSecret);

        if ($res['code'] === 200) {
            $this->success($res['data'] ?? null, $res['msg']);
        } else {
            $this->error($res['msg'], $res['code'], $res['data'] ?? null);
        }
    }

    /**
     * 获取行业模板列表与当前配置
     */
    public function getIndustryScenarios(): void
    {
        $svc = new \App\Service\TemplateService();
        $this->success([
            'current'   => $svc->getCurrentIndustryScenario(),
            'scenarios' => $svc->getIndustryScenarios(),
        ], '获取行业配置成功');
    }

    /**
     * 应用行业模板与示范数据
     */
    public function applyIndustryScenario(): void
    {
        try {
            $scenarioKey = (string)Request::post('scenario_key', '');
            $seedData = (bool)Request::post('seed_data', true);

            if (empty($scenarioKey)) {
                $this->error('请选择要应用的行业模板');
            }

            $svc = new \App\Service\TemplateService();
            $res = $svc->applyIndustryScenario($scenarioKey, $seedData);
            if ($res['code'] === 200) {
                $this->success($res['data'], $res['msg']);
            } else {
                $this->error($res['msg'], $res['code']);
            }
        } catch (\Throwable $e) {
            $this->error('套用模板失败: ' . $e->getMessage() . ' (' . basename($e->getFile()) . ':' . $e->getLine() . ')', 500);
        }
    }

    /**
     * 保存业务功能开关、角色称谓与自定义表单字段
     */
    public function saveDynamicBlocks(): void
    {
        $toggles = Request::post('toggles', []);
        $terminology = Request::post('terminology', []);
        $customFields = Request::post('custom_fields', []);

        if (!is_array($toggles)) $toggles = [];
        if (!is_array($terminology)) $terminology = [];
        if (!is_array($customFields)) $customFields = [];

        $svc = new \App\Service\TemplateService();
        $res = $svc->saveDynamicBlocks($toggles, $terminology, $customFields);
        if ($res['code'] === 200) {
            $this->success($res['data'], $res['msg']);
        } else {
            $this->error($res['msg'], $res['code']);
        }
    }
}



