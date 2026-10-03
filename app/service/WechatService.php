<?php
/**
 * 微信小程序生态服务
 * 负责微信登录授权、手机号获取与接口交互
 */

namespace App\Service;

use App\Model\Database;

class WechatService
{
    private $appId = '';
    private $appSecret = '';
    private $cache;

    public function __construct()
    {
        $this->cache = CacheService::getInstance();
        $this->loadConfig();
    }

    private function loadConfig(): void
    {
        try {
            $db = Database::getInstance();
            $p = $db->getPrefix();
            $sql = "SELECT `config_key`, `config_value` FROM `{$p}sys_config` 
                    WHERE `config_key` IN ('miniapp_appid', 'miniapp_secret', 'wechat_appid', 'wechat_appsecret')";
            $rows = $db->fetchAll($sql);
            $configs = [];
            foreach ($rows as $row) {
                $configs[$row['config_key']] = (string)($row['config_value'] ?? '');
            }
            $this->appId = !empty($configs['miniapp_appid']) ? $configs['miniapp_appid'] : ($configs['wechat_appid'] ?? '');
            $this->appSecret = !empty($configs['miniapp_secret']) ? $configs['miniapp_secret'] : ($configs['wechat_appsecret'] ?? '');
        } catch (\Throwable $e) {
        }
    }

    /**
     * 微信小程序登录凭证校验 (code2session)
     */
    public function code2session(string $code): array
    {
        if (empty($this->appId) || empty($this->appSecret)) {
            // 未配置时提供友好兜底
            return [
                'code' => 400,
                'msg'  => '后台尚未配置微信小程序 AppID 与 AppSecret，请先在后台「小程序装修 -> 开发与基础设置」中填写'
            ];
        }

        $url = sprintf(
            'https://api.weixin.qq.com/sns/jscode2session?appid=%s&secret=%s&js_code=%s&grant_type=authorization_code',
            $this->appId,
            $this->appSecret,
            urlencode($code)
        );

        $res = $this->httpGet($url);
        if (!$res) {
            return ['code' => 500, 'msg' => '微信服务器请求超时，请检查网络'];
        }

        $json = json_decode($res, true);
        if (isset($json['errcode']) && $json['errcode'] !== 0) {
            return ['code' => 400, 'msg' => '微信授权失败: ' . ($json['errmsg'] ?? '')];
        }

        return [
            'code' => 200,
            'data' => [
                'openid'      => $json['openid'] ?? '',
                'session_key' => $json['session_key'] ?? '',
                'unionid'     => $json['unionid'] ?? ''
            ]
        ];
    }

    /**
     * 获取微信接口调用凭证 AccessToken (自动带隔离缓存)
     */
    public function getAccessToken(): ?string
    {
        $cacheKey = 'wechat_access_token';
        $cachedToken = $this->cache->get($cacheKey);
        if ($cachedToken) {
            return $cachedToken;
        }

        if (empty($this->appId) || empty($this->appSecret)) {
            return null;
        }

        $url = sprintf(
            'https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=%s&secret=%s',
            $this->appId,
            $this->appSecret
        );

        $res = $this->httpGet($url);
        $json = json_decode($res ?: '', true);
        if (!empty($json['access_token'])) {
            $token = $json['access_token'];
            $expiresIn = max(60, (int)($json['expires_in'] ?? 7200) - 300);
            $this->cache->set($cacheKey, $token, $expiresIn);
            return $token;
        }

        return null;
    }

    /**
     * 测试微信小程序开发凭证连通性
     */
    public function testCredentials(string $appId = '', string $appSecret = ''): array
    {
        $id = !empty($appId) ? trim($appId) : $this->appId;
        $sec = !empty($appSecret) ? trim($appSecret) : $this->appSecret;

        if (empty($id) || empty($sec)) {
            return [
                'code' => 400,
                'msg'  => '请先填写微信小程序 AppID 与 AppSecret'
            ];
        }

        $url = sprintf(
            'https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=%s&secret=%s',
            urlencode($id),
            urlencode($sec)
        );

        $res = $this->httpGet($url);
        if (!$res) {
            return [
                'code' => 500,
                'msg'  => '请求微信公众平台接口超时，请检查服务器出网或网络状态'
            ];
        }

        $json = json_decode($res, true);
        if (!empty($json['access_token'])) {
            return [
                'code' => 200,
                'msg'  => '微信公众平台开发凭据验证通过！接口联通正常。'
            ];
        }

        $errcode = (int)($json['errcode'] ?? 0);
        $errmsg = (string)($json['errmsg'] ?? '未知错误');

        if ($errcode === 40013) {
            return ['code' => 400, 'msg' => '微信提示: AppID 格式无效或不正确 (errcode 40013)'];
        }
        if ($errcode === 40125) {
            return ['code' => 400, 'msg' => '微信提示: AppSecret 密钥不正确，请在微信公众平台重置后重新填写 (errcode 40125)'];
        }
        if ($errcode === 40164) {
            return ['code' => 400, 'msg' => '微信提示: 当前服务器 IP 未加入微信开发设置的 IP 白名单 (errcode 40164)'];
        }

        return ['code' => 400, 'msg' => "微信公众平台校验失败 [{$errcode}]: {$errmsg}"];
    }

    /**
     * 获取微信小程序用户授权手机号 (官方接口 wxa/business/getuserphonenumber)
     */
    public function getUserPhoneNumber(string $code): array
    {
        $code = trim($code);
        if (empty($code)) {
            return ['code' => 400, 'msg' => '缺少手机号授权凭据 Code'];
        }

        $token = $this->getAccessToken();
        if (!$token) {
            return ['code' => 500, 'msg' => '微信 AccessToken 获取失败，请检查后台「小程序装修 -> 开发与基础设置」中的 AppID 与 AppSecret'];
        }

        $url = 'https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=' . $token;
        $res = $this->httpPostJson($url, ['code' => $code]);
        if (!$res) {
            return ['code' => 500, 'msg' => '微信公众平台手机号接口请求超时，请检查网络'];
        }

        $json = json_decode($res, true);
        if (isset($json['errcode']) && $json['errcode'] === 0 && !empty($json['phone_info'])) {
            $purePhone = (string)($json['phone_info']['purePhoneNumber'] ?? ($json['phone_info']['phoneNumber'] ?? ''));
            return [
                'code' => 200,
                'msg'  => '获取手机号成功',
                'data' => [
                    'phone'      => $purePhone,
                    'phone_info' => $json['phone_info']
                ]
            ];
        }

        $errcode = (int)($json['errcode'] ?? -1);
        $errmsg = (string)($json['errmsg'] ?? '未知错误');
        if ($errcode === 40029) {
            return ['code' => 400, 'msg' => '手机号授权凭据已失效，请重新点击授权 (errcode 40029)'];
        }
        return ['code' => 400, 'msg' => "微信手机号授权失败 [{$errcode}]: {$errmsg}"];
    }

    /**
     * 发送微信服务通知订阅消息 (质检完成/差价确认提醒)
     */
    public function sendSubscribeMessage(string $openid, string $templateId, array $data, string $page = ''): bool
    {
        $token = $this->getAccessToken();
        if (!$token) {
            return false;
        }

        $url = 'https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=' . $token;
        $payload = [
            'touser'      => $openid,
            'template_id' => $templateId,
            'page'        => $page,
            'data'        => $data
        ];

        $res = $this->httpPostJson($url, $payload);
        $json = json_decode($res ?: '', true);
        return isset($json['errcode']) && $json['errcode'] === 0;
    }

    /**
     * 基础 HTTP GET 请求封装
     */
    private function httpGet(string $url): ?string
    {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 3);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        $res = curl_exec($ch);
        curl_close($ch);
        return $res !== false ? (string)$res : null;
    }

    /**
     * 基础 HTTP POST JSON 请求封装
     */
    private function httpPostJson(string $url, array $data): ?string
    {
        $json = json_encode($data, JSON_UNESCAPED_UNICODE);
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $json);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 3);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json; charset=utf-8',
            'Content-Length: ' . strlen($json)
        ]);
        $res = curl_exec($ch);
        curl_close($ch);
        return $res !== false ? (string)$res : null;
    }
}
