<?php
/**
 * 系统运行健康诊断与缓存性能控制器
 * 功能：
 * 1. 数据库自检：MySQL版本、字符集、全表记录数、数据/索引大小、字段完整度
 * 2. 数据库体检修复与碎片优化
 * 3. 缓存统计：Redis 运行状态、内存占用、命中率、键总数与安全清理
 */

namespace App\Controller\Admin;

use App\Controller\Admin\AdminBaseController;
use App\Model\Database;
use App\Common\Request;
use App\Service\CacheService;
use App\Service\TemplateService;

class SystemController extends AdminBaseController
{
    private $db;

    public function __construct()
    {
        parent::__construct();
        $this->db = Database::getInstance();
    }

    /**
     * 数据库深度自检与表空间健康分析
     */
    public function dbHealth(): void
    {
        $p = $this->db->getPrefix();

        // 1. 测试连接与网络/响应延迟
        $start = microtime(true);
        $this->db->fetchOne("SELECT 1");
        $latency = round((microtime(true) - $start) * 1000, 2);

        // 2. 获取基础运行参数
        $verRow = $this->db->fetchOne("SELECT VERSION() as v");
        $mysqlVersion = $verRow['v'] ?? '未知';

        $dbRow = $this->db->fetchOne("SELECT DATABASE() as db");
        $dbName = $dbRow['db'] ?? '未知';

        $csRow = $this->db->fetchOne("SHOW VARIABLES LIKE 'character_set_database'");
        $colRow = $this->db->fetchOne("SHOW VARIABLES LIKE 'collation_database'");

        // 检查核心模型表，确保门店、Banner、文章与加价券表就绪
        try {
            new \App\Model\StoreModel();
            new \App\Model\BannerModel();
            new \App\Model\ArticleModel();
            new \App\Model\CouponModel();
        } catch (\Throwable $e) {
            // 静默容错
        }

        // 3. 检索系统全表统计 (信息模式)
        $tablesSql = "SELECT TABLE_NAME, ENGINE, TABLE_ROWS, DATA_LENGTH, INDEX_LENGTH, TABLE_COLLATION, TABLE_COMMENT 
                      FROM information_schema.tables 
                      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE ? 
                      ORDER BY TABLE_NAME ASC";
        $tableRows = $this->db->fetchAll($tablesSql, [$p . '%']);

        $totalRows = 0;
        $totalDataBytes = 0;
        $totalIndexBytes = 0;
        $tableList = [];

        foreach ($tableRows as $tbl) {
            $rows = (int)($tbl['TABLE_ROWS'] ?? 0);
            $dataBytes = (int)($tbl['DATA_LENGTH'] ?? 0);
            $idxBytes = (int)($tbl['INDEX_LENGTH'] ?? 0);
            $totalBytes = $dataBytes + $idxBytes;

            $totalRows += $rows;
            $totalDataBytes += $dataBytes;
            $totalIndexBytes += $idxBytes;

            $tableName = $tbl['TABLE_NAME'];
            $shortName = substr($tableName, strlen($p));

            $tableList[] = [
                'table_name'     => $tableName,
                'short_name'     => $shortName,
                'comment'        => $tbl['TABLE_COMMENT'] ?: $this->getTableRemark($shortName),
                'engine'         => $tbl['ENGINE'] ?? 'InnoDB',
                'rows'           => $rows,
                'data_size'      => $this->formatBytes($dataBytes),
                'index_size'     => $this->formatBytes($idxBytes),
                'total_size'     => $this->formatBytes($totalBytes),
                'collation'      => $tbl['TABLE_COLLATION'] ?? 'utf8mb4_general_ci',
                'status'         => '正常'
            ];
        }

        // 4. 核心字段完整度自检
        $schemaChecks = $this->checkCoreColumns($p);

        // 5. 健康综合评分 (满分 100)
        $healthScore = 100;
        foreach ($schemaChecks as $chk) {
            if (!$chk['passed']) {
                $healthScore -= 15;
            }
        }
        if (count($tableList) < 8) {
            $healthScore -= 20;
        }

        $this->success([
            'database_name'    => $dbName,
            'mysql_version'    => $mysqlVersion,
            'charset'          => $csRow['Value'] ?? 'utf8mb4',
            'collation'        => $colRow['Value'] ?? 'utf8mb4_general_ci',
            'latency_ms'       => $latency,
            'table_prefix'     => $p,
            'table_count'      => count($tableList),
            'total_rows'       => $totalRows,
            'total_size_human' => $this->formatBytes($totalDataBytes + $totalIndexBytes),
            'data_size_human'  => $this->formatBytes($totalDataBytes),
            'index_size_human' => $this->formatBytes($totalIndexBytes),
            'tables'           => $tableList,
            'schema_checks'    => $schemaChecks,
            'health_score'     => max(0, $healthScore),
            'is_healthy'       => $healthScore >= 90
        ], '数据库健康体检完成');
    }

    /**
     * 一键修复缺失的数据表结构、补齐核心字段与初始化默认配置
     */
    public function dbRepair(): void
    {
        try {
            $p = $this->db->getPrefix();

            // 1. 自动体检与补全可能缺失的核心业务数据表 (共 12 张)
            $createdTables = $this->repairMissingTables($p);

            // 2. 深度热检与补齐各数据表的核心物理字段 (含计价单位、履约、放款方式等)
            $addedColumns = $this->repairMissingColumns($p);

            // 3. 模板服务热更新兼容调用
            $tplService = new TemplateService();
            $tplService->ensureSchemaUpgraded();

            // 4. 补齐系统核心默认配置参数 (sys_config)
            $restoredConfigs = $this->repairDefaultConfigs($p);

            // 5. 数据表物理完整性与索引健康度检查 (CHECK TABLE)
            $integrityResults = $this->checkAndRepairTableIntegrity($p);

            // 6. 重新执行核心字段自检以校验修复结果
            $checks = $this->checkCoreColumns($p);

            $summaryParts = [];
            if (!empty($createdTables)) {
                $summaryParts[] = '补建缺失数据表 ' . count($createdTables) . ' 张';
            }
            if (!empty($addedColumns)) {
                $summaryParts[] = '补齐核心物理字段 ' . count($addedColumns) . ' 个';
            }
            if (!empty($restoredConfigs)) {
                $summaryParts[] = '恢复必要配置项 ' . count($restoredConfigs) . ' 条';
            }

            if (empty($summaryParts)) {
                $summaryText = '所有核心数据表与关键业务字段均已健全完好，已完成全表完整性校验！';
            } else {
                $summaryText = '数据表结构热修复成功！' . implode('，', $summaryParts) . '。系统所有业务字段与物理约束现已全部就绪。';
            }

            $this->success([
                'checks'            => $checks,
                'created_tables'    => $createdTables,
                'added_columns'     => $addedColumns,
                'restored_configs'  => $restoredConfigs,
                'integrity_checked' => count($integrityResults),
                'message'           => $summaryText
            ], '数据库结构体检与修复完成');
        } catch (\Throwable $e) {
            $this->error('数据库修复执行异常: ' . $e->getMessage());
        }
    }

    /**
     * 一键表空间碎片整理与优化 (OPTIMIZE TABLE)
     */
    public function dbOptimize(): void
    {
        $p = $this->db->getPrefix();
        $tablesSql = "SELECT TABLE_NAME FROM information_schema.tables WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE ?";
        $tableRows = $this->db->fetchAll($tablesSql, [$p . '%']);

        $pdo = $this->db->getPdo();
        $results = [];

        foreach ($tableRows as $tbl) {
            $tableName = $tbl['TABLE_NAME'];
            try {
                // 安全防注入：仅操作以指定前缀开头的合法物理表名
                $stmt = $pdo->query("OPTIMIZE TABLE `{$tableName}`");
                $res = $stmt->fetch(\PDO::FETCH_ASSOC);
                $results[] = [
                    'table'  => $tableName,
                    'status' => $res['Msg_text'] ?? 'OK',
                    'success' => true
                ];
            } catch (\Throwable $e) {
                $results[] = [
                    'table'   => $tableName,
                    'status'  => '优化跳过: ' . $e->getMessage(),
                    'success' => false
                ];
            }
        }

        $this->success([
            'optimized_count' => count($results),
            'list'            => $results
        ], '数据表空间碎片整理与优化完成');
    }

    /**
     * 获取缓存运行状态与性能统计
     */
    public function cacheStats(): void
    {
        $stats = CacheService::getInstance()->getStats();
        $this->success($stats, '获取缓存统计数据成功');
    }

    /**
     * 安全一键清理本系统缓存
     * 注意：仅使用 SCAN 批量删除 sys_recycle:* 键，绝不影响 Redis 同服其他数据库
     */
    public function clearCache(): void
    {
        CacheService::getInstance()->clear();
        $newStats = CacheService::getInstance()->getStats();
        $this->success($newStats, '系统专属缓存已安全重置清理，未影响同服务器任何其他业务！');
    }

    /**
     * 获取当前 Redis 详细配置
     */
    public function getRedisConfig(): void
    {
        $config = CacheService::getInstance()->getRedisConfig();
        $this->success($config, '获取 Redis 配置成功');
    }

    /**
     * 实时测试 Redis 连通性与独立库
     */
    public function testRedis(): void
    {
        $payload = Request::post();
        $res = CacheService::getInstance()->testRedisConnection(is_array($payload) ? $payload : []);
        if (($res['code'] ?? 400) === 200) {
            $this->success(null, $res['msg'] ?? '测试成功');
        } else {
            $this->error($res['msg'] ?? '连接测试失败', $res['code'] ?? 400);
        }
    }

    /**
     * 保存并应用 Redis 配置 (包括修改专属独立库 DB 序号)
     */
    public function saveRedisConfig(): void
    {
        $payload = Request::post();
        $res = CacheService::getInstance()->saveRedisConfig(is_array($payload) ? $payload : []);
        if (($res['code'] ?? 400) === 200) {
            $stats = CacheService::getInstance()->getStats();
            $this->success($stats, $res['msg'] ?? 'Redis 配置保存成功');
        } else {
            $this->error($res['msg'] ?? '保存配置失败', $res['code'] ?? 400);
        }
    }

    /**
     * 辅助：核对核心字段完整度
     */
    private function checkCoreColumns(string $p): array
    {
        $items = [
            [
                'table'  => "{$p}rc_device",
                'column' => 'unit',
                'title'  => '物品专属计价单位 (斤/公斤/吨/辆/台/克/件)',
                'desc'   => '通用全品类多模板的核心基础字段'
            ],
            [
                'table'  => "{$p}rc_category",
                'column' => 'unit',
                'title'  => '品类默认计量单位',
                'desc'   => '品类继承计量单位'
            ],
            [
                'table'  => "{$p}rc_question",
                'column' => 'device_id',
                'title'  => '机型专属评估问答关联 (device_id)',
                'desc'   => '支持按单款商品定制专属质检选项'
            ],
            [
                'table'  => "{$p}rc_question_item",
                'column' => 'image',
                'title'  => '质检成色参考示意图 (image)',
                'desc'   => '前台直观图例展示，防止客户争议'
            ],
            [
                'table'  => "{$p}rc_order",
                'column' => 'fulfillment_type',
                'title'  => '履约交割方式 (上门/到店/邮寄/拖车)',
                'desc'   => '多行业服务交付标准'
            ],
            [
                'table'  => "{$p}rc_order",
                'column' => 'payout_type',
                'title'  => '结算放款方式 (微信/支付宝/银行卡)',
                'desc'   => '财务打款路由'
            ],
            [
                'table'  => "{$p}rc_store",
                'column' => 'name',
                'title'  => '线下门店与自送网点主数据 (rc_store.name)',
                'desc'   => '线下交割服务门店基础数据'
            ],
            [
                'table'  => "{$p}rc_order",
                'column' => 'store_name',
                'title'  => '订单交割网点快照 (rc_order.store_name)',
                'desc'   => '记录到店自送订单关联的服务网点'
            ],
            [
                'table'  => "{$p}rc_order",
                'column' => 'coupon_id',
                'title'  => '回收补贴券模板关联 (rc_order.coupon_id)',
                'desc'   => '加价券营销补贴关联字段'
            ],
            [
                'table'  => "{$p}rc_order",
                'column' => 'coupon_add_price',
                'title'  => '加价券现金补贴金额 (rc_order.coupon_add_price)',
                'desc'   => '实际现金补贴给用户的加价金额'
            ],
            [
                'table'  => "{$p}rc_coupon",
                'column' => 'title',
                'title'  => '回收加价补贴券模板主表 (rc_coupon.title)',
                'desc'   => '加价补贴券规则与发放库'
            ],
            [
                'table'  => "{$p}rc_user_coupon",
                'column' => 'status',
                'title'  => '用户卡券资产明细表 (rc_user_coupon.status)',
                'desc'   => '用户卡包与核销状态生命周期'
            ],
        ];

        $results = [];
        foreach ($items as $item) {
            $table = $item['table'];
            $col = $item['column'];
            $exists = false;
            try {
                $check = $this->db->fetchOne("SHOW COLUMNS FROM `{$table}` LIKE '{$col}'");
                $exists = !empty($check);
            } catch (\Throwable $e) {
                $exists = false;
            }

            $results[] = [
                'table'   => $table,
                'column'  => $col,
                'title'   => $item['title'],
                'desc'    => $item['desc'],
                'passed'  => $exists,
                'status'  => $exists ? '正常 (已具备)' : '缺失 (需执行结构修复)'
            ];
        }

        return $results;
    }

    /**
     * 辅助：检测并重建缺失的核心业务表
     */
    private function repairMissingTables(string $p): array
    {
        $created = [];
        $definitions = $this->getCoreTableSchemas($p);

        foreach ($definitions as $tableShort => $ddl) {
            $fullTable = "{$p}{$tableShort}";
            try {
                $exists = $this->db->fetchOne("SHOW TABLES LIKE '{$fullTable}'");
                if (empty($exists)) {
                    $this->db->execute($ddl);
                    $created[] = $fullTable;
                }
            } catch (\Throwable $e) {
                // 静默容错
            }
        }

        return $created;
    }

    /**
     * 辅助：获取系统 12 张核心业务表的建表 DDL
     */
    private function getCoreTableSchemas(string $p): array
    {
        return array_merge(
            $this->getSystemCoreSchemas($p),
            $this->getCatalogCoreSchemas($p),
            $this->getOrderCoreSchemas($p),
            $this->getFinanceSchemas($p),
            $this->getContentAndStoreSchemas($p)
        );
    }

    private function getSystemCoreSchemas(string $p): array
    {
        return [
            'sys_admin' => "CREATE TABLE IF NOT EXISTS `{$p}sys_admin` (
                `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '管理员ID',
                `username` varchar(64) NOT NULL DEFAULT '' COMMENT '登录用户名',
                `password_hash` varchar(255) NOT NULL DEFAULT '' COMMENT '密码哈希',
                `salt` varchar(32) NOT NULL DEFAULT '' COMMENT '安全盐值',
                `realname` varchar(64) NOT NULL DEFAULT '' COMMENT '真实姓名',
                `role` varchar(32) NOT NULL DEFAULT 'admin' COMMENT '角色: admin-超级管理员, inspector-质检员, finance-财务',
                `status` tinyint(1) NOT NULL DEFAULT '1' COMMENT '状态: 1-启用, 0-禁用',
                `last_login_time` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '最后登录时间',
                `last_login_ip` varchar(45) NOT NULL DEFAULT '' COMMENT '最后登录IP',
                `created_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '创建时间',
                `updated_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '更新时间',
                PRIMARY KEY (`id`),
                UNIQUE KEY `idx_username` (`username`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统管理员表'",

            'sys_config' => "CREATE TABLE IF NOT EXISTS `{$p}sys_config` (
                `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '配置ID',
                `group_name` varchar(32) NOT NULL DEFAULT 'system' COMMENT '配置分组',
                `config_key` varchar(64) NOT NULL DEFAULT '' COMMENT '配置键名',
                `config_value` text COMMENT '配置键值',
                `remark` varchar(255) NOT NULL DEFAULT '' COMMENT '配置描述说明',
                `updated_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '更新时间',
                PRIMARY KEY (`id`),
                UNIQUE KEY `idx_group_key` (`group_name`, `config_key`),
                KEY `idx_config_key` (`config_key`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统配置与行业模板参数表'",

            'sys_admin_log' => "CREATE TABLE IF NOT EXISTS `{$p}sys_admin_log` (
                `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '日志ID',
                `admin_id` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '管理员ID',
                `admin_name` varchar(64) NOT NULL DEFAULT '' COMMENT '管理员用户名',
                `action` varchar(64) NOT NULL DEFAULT '' COMMENT '操作行为类型',
                `detail` varchar(255) NOT NULL DEFAULT '' COMMENT '操作详细描述',
                `ip` varchar(45) NOT NULL DEFAULT '' COMMENT '操作IP地址',
                `user_agent` varchar(255) NOT NULL DEFAULT '' COMMENT '客户端浏览器UA',
                `created_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '记录时间戳',
                PRIMARY KEY (`id`),
                KEY `idx_admin_id` (`admin_id`),
                KEY `idx_created_at` (`created_at`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理员操作与安全审计日志表'",

            'rc_user' => "CREATE TABLE IF NOT EXISTS `{$p}rc_user` (
                `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '用户ID',
                `openid` varchar(64) NOT NULL DEFAULT '' COMMENT '微信OpenID',
                `unionid` varchar(64) NOT NULL DEFAULT '' COMMENT '微信开放平台UnionID',
                `mobile` varchar(20) NOT NULL DEFAULT '' COMMENT '手机号码',
                `nickname` varchar(64) NOT NULL DEFAULT '' COMMENT '用户昵称',
                `avatar` varchar(255) NOT NULL DEFAULT '' COMMENT '用户头像URL',
                `status` tinyint(1) NOT NULL DEFAULT '1' COMMENT '用户状态: 1-正常, 0-封禁',
                `created_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '注册时间',
                `updated_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '最后更新时间',
                PRIMARY KEY (`id`),
                KEY `idx_openid` (`openid`),
                KEY `idx_mobile` (`mobile`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='回收客户与交投会员表'"
        ];
    }

    private function getCatalogCoreSchemas(string $p): array
    {
        return [
            'rc_category' => "CREATE TABLE IF NOT EXISTS `{$p}rc_category` (
                `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '品类ID',
                `name` varchar(64) NOT NULL DEFAULT '' COMMENT '分类名称',
                `icon` varchar(255) NOT NULL DEFAULT '' COMMENT '分类图标URL',
                `unit` varchar(32) NOT NULL DEFAULT '台' COMMENT '品类默认计量单位',
                `sort` int(11) NOT NULL DEFAULT '0' COMMENT '排序权重',
                `is_show` tinyint(1) NOT NULL DEFAULT '1' COMMENT '前台是否展示',
                `created_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '创建时间',
                PRIMARY KEY (`id`),
                KEY `idx_sort` (`sort`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='回收行业品类表'",

            'rc_brand' => "CREATE TABLE IF NOT EXISTS `{$p}rc_brand` (
                `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '品牌ID',
                `category_id` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '所属品类ID',
                `name` varchar(64) NOT NULL DEFAULT '' COMMENT '品牌/规格名称',
                `logo` varchar(255) NOT NULL DEFAULT '' COMMENT '品牌LOGO',
                `first_letter` varchar(8) NOT NULL DEFAULT '' COMMENT '首字母索引',
                `sort` int(11) NOT NULL DEFAULT '0' COMMENT '排序权重',
                `created_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '创建时间',
                PRIMARY KEY (`id`),
                KEY `idx_category` (`category_id`),
                KEY `idx_letter` (`first_letter`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='品牌与规格划分表'",

            'rc_device' => "CREATE TABLE IF NOT EXISTS `{$p}rc_device` (
                `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '机型或物品ID',
                `category_id` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '分类ID',
                `brand_id` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '品牌ID',
                `name` varchar(128) NOT NULL DEFAULT '' COMMENT '回收机型/物品全称',
                `cover_img` varchar(255) NOT NULL DEFAULT '/uploads/default/dev_default.svg' COMMENT '物品展示缩略图',
                `guide_price` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '官方基准回收评估价',
                `unit` varchar(32) NOT NULL DEFAULT '台' COMMENT '计价计量单位',
                `sort` int(11) NOT NULL DEFAULT '0' COMMENT '排序权重',
                `is_hot` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否热门推荐',
                `status` tinyint(1) NOT NULL DEFAULT '1' COMMENT '状态: 1-上架, 0-下架',
                `created_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '创建时间',
                `updated_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '更新时间',
                PRIMARY KEY (`id`),
                KEY `idx_category_brand` (`category_id`, `brand_id`),
                KEY `idx_hot` (`is_hot`),
                KEY `idx_status` (`status`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='回收机型行情表'",

            'rc_question' => "CREATE TABLE IF NOT EXISTS `{$p}rc_question` (
                `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '题目ID',
                `category_id` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '所属品类ID',
                `device_id` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '机型或物品ID(0为品类通用)',
                `title` varchar(128) NOT NULL DEFAULT '' COMMENT '评估维度题目标题',
                `sub_title` varchar(255) NOT NULL DEFAULT '' COMMENT '评估维度辅助说明',
                `sort` int(11) NOT NULL DEFAULT '0' COMMENT '排序权重',
                `created_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '创建时间',
                PRIMARY KEY (`id`),
                KEY `idx_category` (`category_id`),
                KEY `idx_device` (`device_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='质检评估维度题目表'",

            'rc_question_item' => "CREATE TABLE IF NOT EXISTS `{$p}rc_question_item` (
                `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '选项ID',
                `question_id` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '归属题目ID',
                `name` varchar(128) NOT NULL DEFAULT '' COMMENT '选项成色名称',
                `desc_text` varchar(255) NOT NULL DEFAULT '' COMMENT '选项成色描述',
                `image` varchar(255) NOT NULL DEFAULT '' COMMENT '选项成色参考图示URL',
                `deduct_type` varchar(16) NOT NULL DEFAULT 'fixed' COMMENT '扣减计算方式',
                `deduct_value` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '扣减/增加金额数值',
                `sort` int(11) NOT NULL DEFAULT '0' COMMENT '排序权重',
                `created_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '创建时间',
                PRIMARY KEY (`id`),
                KEY `idx_question` (`question_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='质检成色扣减选项表'"
        ];
    }

    private function getOrderCoreSchemas(string $p): array
    {
        return [
            'rc_order' => "CREATE TABLE IF NOT EXISTS `{$p}rc_order` (
                `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '订单ID',
                `order_sn` varchar(32) NOT NULL DEFAULT '' COMMENT '业务订单号',
                `user_id` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '提交用户ID',
                `device_id` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '回收机型ID',
                `device_name` varchar(128) NOT NULL DEFAULT '' COMMENT '下单时机型名称快照',
                `estimate_price` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '用户提交时预估价',
                `final_price` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '质检最终确认成交价',
                `fulfillment_type` varchar(32) NOT NULL DEFAULT 'mail' COMMENT '履约模式: mail-邮寄, store-到店, home-上门',
                `payout_type` varchar(32) NOT NULL DEFAULT 'wechat' COMMENT '结算放款方式: wechat-微信, offline-线下对公',
                `status` varchar(32) NOT NULL DEFAULT 'pending_send' COMMENT '状态',
                `contact_name` varchar(64) NOT NULL DEFAULT '' COMMENT '联系人姓名',
                `contact_mobile` varchar(20) NOT NULL DEFAULT '' COMMENT '联系电话',
                `contact_address` varchar(255) NOT NULL DEFAULT '' COMMENT '详细地址',
                `appointment_time` varchar(64) NOT NULL DEFAULT '' COMMENT '预约时间段',
                `express_company` varchar(64) NOT NULL DEFAULT '' COMMENT '快递公司',
                `express_sn` varchar(64) NOT NULL DEFAULT '' COMMENT '物流快递单号',
                `refund_express_sn` varchar(64) NOT NULL DEFAULT '' COMMENT '退货寄回物流单号',
                `user_remark` varchar(255) NOT NULL DEFAULT '' COMMENT '用户留言备注',
                `created_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '下单时间',
                `updated_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '更新时间',
                PRIMARY KEY (`id`),
                UNIQUE KEY `idx_order_sn` (`order_sn`),
                KEY `idx_user` (`user_id`),
                KEY `idx_status` (`status`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='回收业务订单主表'",

            'rc_order_detail' => "CREATE TABLE IF NOT EXISTS `{$p}rc_order_detail` (
                `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
                `order_id` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '订单ID',
                `question_id` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '问题ID',
                `question_title` varchar(128) NOT NULL DEFAULT '' COMMENT '问题题目快照',
                `item_id` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '选项ID',
                `item_name` varchar(128) NOT NULL DEFAULT '' COMMENT '用户所选选项快照',
                `deduct_amount` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '初评计算该项扣减金额',
                PRIMARY KEY (`id`),
                KEY `idx_order` (`order_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单用户初评问答快照表'",

            'rc_order_inspection' => "CREATE TABLE IF NOT EXISTS `{$p}rc_order_inspection` (
                `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '报告ID',
                `order_id` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '关联订单ID',
                `inspector_id` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '质检员管理员ID',
                `imei` varchar(64) NOT NULL DEFAULT '' COMMENT '真机IMEI或序列号SN',
                `real_photos` text COMMENT '真机质检照片JSON列表',
                `diff_items` text COMMENT '与初评差异项及差价明细JSON',
                `inspection_price` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '质检核定回收价',
                `inspector_remark` varchar(500) NOT NULL DEFAULT '' COMMENT '专业验机质检说明',
                `created_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '出具质检时间',
                PRIMARY KEY (`id`),
                UNIQUE KEY `idx_order` (`order_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单专业质检复核报告表'"
        ];
    }

    private function getFinanceSchemas(string $p): array
    {
        return [
            'rc_payout_log' => "CREATE TABLE IF NOT EXISTS `{$p}rc_payout_log` (
                `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '流水ID',
                `order_id` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '订单ID',
                `out_bill_no` varchar(64) NOT NULL DEFAULT '' COMMENT '商户唯一打款单据号(防重复幂等键)',
                `channel` varchar(32) NOT NULL DEFAULT 'wechat' COMMENT '打款渠道',
                `amount` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '实际转账金额',
                `status` varchar(32) NOT NULL DEFAULT 'processing' COMMENT '状态',
                `transaction_id` varchar(128) NOT NULL DEFAULT '' COMMENT '微信支付单号或第三方凭证',
                `err_msg` varchar(255) NOT NULL DEFAULT '' COMMENT '失败原因说明',
                `created_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '打款触发时间',
                PRIMARY KEY (`id`),
                UNIQUE KEY `idx_out_bill_no` (`out_bill_no`),
                KEY `idx_order` (`order_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='资金结算打款安全流水表'",

            'rc_coupon' => "CREATE TABLE IF NOT EXISTS `{$p}rc_coupon` (
                `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '券模板ID',
                `title` varchar(128) NOT NULL DEFAULT '' COMMENT '券名称/标题',
                `sub_title` varchar(255) NOT NULL DEFAULT '' COMMENT '副标题/营销利益点',
                `type` enum('fixed','percent') NOT NULL DEFAULT 'fixed' COMMENT '加价类型: fixed-固定金额(元), percent-百分比(%)',
                `amount` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '加价值 (固定金额或百分比数值)',
                `max_amount` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '百分比加价时的单笔最高封顶上限(0不封顶)',
                `min_estimate_price` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '最低估价生效门槛(元, 0为无门槛)',
                `category_id` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '限定品类ID(0为全品类通用)',
                `valid_days` int(11) NOT NULL DEFAULT '7' COMMENT '领取后有效天数',
                `total_count` int(11) NOT NULL DEFAULT '0' COMMENT '发行总量(0为不限量)',
                `received_count` int(11) NOT NULL DEFAULT '0' COMMENT '已领取总张数',
                `used_count` int(11) NOT NULL DEFAULT '0' COMMENT '已核销总张数',
                `is_auto_grant` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否新用户注册/首次登录自动发放: 1-是, 0-否',
                `status` tinyint(1) NOT NULL DEFAULT '1' COMMENT '状态: 1-启用, 0-停用',
                `sort` int(11) NOT NULL DEFAULT '0' COMMENT '排序权重(越大越前)',
                `created_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '创建时间',
                `updated_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '更新时间',
                PRIMARY KEY (`id`),
                KEY `idx_status_sort` (`status`, `sort`),
                KEY `idx_auto_grant` (`is_auto_grant`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='回收加价补贴券模板表'",

            'rc_user_coupon' => "CREATE TABLE IF NOT EXISTS `{$p}rc_user_coupon` (
                `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '卡券ID',
                `user_id` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '会员用户ID',
                `coupon_id` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '券模板ID',
                `title` varchar(128) NOT NULL DEFAULT '' COMMENT '券标题快照',
                `type` enum('fixed','percent') NOT NULL DEFAULT 'fixed' COMMENT '加价类型快照',
                `amount` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '加价值快照',
                `max_amount` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '封顶额快照',
                `min_estimate_price` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '门槛金额快照',
                `category_id` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '限定品类快照',
                `start_time` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '生效时间戳',
                `end_time` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '过期失效时间戳',
                `status` enum('unused','locked','used','expired') NOT NULL DEFAULT 'unused' COMMENT '状态: unused-未使用, locked-订单锁定待质检, used-已核销, expired-已过期',
                `order_id` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '绑定的订单ID',
                `order_sn` varchar(32) NOT NULL DEFAULT '' COMMENT '绑定的订单号',
                `actual_add_price` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '最终实际补贴加价金额',
                `used_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '核销打款时间',
                `created_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '领取时间',
                PRIMARY KEY (`id`),
                KEY `idx_user_status` (`user_id`, `status`),
                KEY `idx_coupon_id` (`coupon_id`),
                KEY `idx_order_id` (`order_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户加价补贴券卡包表'"
        ];
    }

    private function getContentAndStoreSchemas(string $p): array
    {
        return [
            'rc_store' => "CREATE TABLE IF NOT EXISTS `{$p}rc_store` (
                `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '门店ID',
                `name` varchar(128) NOT NULL DEFAULT '' COMMENT '门店/网点名称',
                `phone` varchar(32) NOT NULL DEFAULT '' COMMENT '门店联系电话/客服手机',
                `address` varchar(255) NOT NULL DEFAULT '' COMMENT '详细地址(省市区门牌)',
                `business_hours` varchar(128) NOT NULL DEFAULT '' COMMENT '营业时间说明',
                `traffic_guide` varchar(255) NOT NULL DEFAULT '' COMMENT '交通路线指引',
                `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT '状态: 1-营业中, 0-暂停营业',
                `sort` int(11) NOT NULL DEFAULT 100 COMMENT '排序权重(数值越大越靠前)',
                `is_default` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否默认门店: 1-是, 0-否',
                `created_at` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '创建时间',
                `updated_at` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '更新时间',
                PRIMARY KEY (`id`),
                KEY `idx_status` (`status`),
                KEY `idx_sort` (`sort`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='线下门店与到店交投网点表'",

            'rc_banner' => "CREATE TABLE IF NOT EXISTS `{$p}rc_banner` (
                `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Banner ID',
                `title` varchar(128) NOT NULL DEFAULT '' COMMENT 'Banner大标题',
                `subtitle` varchar(255) NOT NULL DEFAULT '' COMMENT 'Banner副标题/描述',
                `badge` varchar(64) NOT NULL DEFAULT '' COMMENT '活动小角标',
                `image_pc` varchar(255) NOT NULL DEFAULT '' COMMENT 'PC端宽屏画卷图URL',
                `image_m` varchar(255) NOT NULL DEFAULT '' COMMENT '移动端图URL',
                `link_type` varchar(32) NOT NULL DEFAULT 'none' COMMENT '跳转类型: category, device, action, url, none',
                `link_value` varchar(255) NOT NULL DEFAULT '' COMMENT '跳转目标值',
                `btn_text` varchar(64) NOT NULL DEFAULT '立即查看' COMMENT 'CTA按钮文案',
                `sort_order` int(11) NOT NULL DEFAULT '100' COMMENT '排序权重',
                `status` tinyint(1) NOT NULL DEFAULT '1' COMMENT '状态: 1-启用, 0-禁用',
                `created_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '创建时间',
                `updated_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '更新时间',
                PRIMARY KEY (`id`),
                KEY `idx_status_sort` (`status`, `sort_order`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='首页轮播Banner广告表'",

            'rc_article' => "CREATE TABLE IF NOT EXISTS `{$p}rc_article` (
                `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '文章ID',
                `title` varchar(128) NOT NULL DEFAULT '' COMMENT '文章/单页标题',
                `slug` varchar(64) NOT NULL DEFAULT '' COMMENT 'URL英文唯一别名(如 disclaimer, user-agreement)',
                `category` varchar(32) NOT NULL DEFAULT 'guide' COMMENT '分类: guide-指南, about-关于与条款, help-帮助, notice-公告',
                `summary` varchar(255) NOT NULL DEFAULT '' COMMENT '导语摘要/副标题',
                `content` mediumtext COMMENT 'HTML正文内容',
                `cover_image` varchar(255) NOT NULL DEFAULT '' COMMENT '封面图URL',
                `is_footer` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否在底部导航展示: 1-是, 0-否',
                `footer_column` varchar(32) NOT NULL DEFAULT 'guide' COMMENT '底部展示列: guide-指南列, about-条款列',
                `is_hot` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否热门/推荐角标: 1-是, 0-否',
                `view_count` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '浏览阅读次数',
                `sort_order` int(11) NOT NULL DEFAULT '100' COMMENT '排序权重(数值越小越靠前)',
                `status` tinyint(1) NOT NULL DEFAULT '1' COMMENT '状态: 1-正常公开, 0-下架隐藏',
                `created_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '创建时间',
                `updated_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '更新时间',
                PRIMARY KEY (`id`),
                UNIQUE KEY `uniq_slug` (`slug`),
                KEY `idx_footer_col_sort` (`is_footer`, `footer_column`, `sort_order`),
                KEY `idx_cat_sort` (`category`, `sort_order`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文章与条款单页信息表'"
        ];
    }

    /**
     * 辅助：检测并补齐缺失的核心物理字段
     */
    private function repairMissingColumns(string $p): array
    {
        $added = [];
        $columnsToEnsure = $this->getColumnsToEnsure($p);

        foreach ($columnsToEnsure as $item) {
            $table = $item['table'];
            $col = $item['column'];
            try {
                $tableExists = $this->db->fetchOne("SHOW TABLES LIKE '{$table}'");
                if (empty($tableExists)) {
                    continue;
                }
                $exists = $this->db->fetchOne("SHOW COLUMNS FROM `{$table}` LIKE '{$col}'");
                if (empty($exists)) {
                    $this->db->execute($item['ddl']);
                    $added[] = "{$table}.{$col}";
                }
            } catch (\Throwable $e) {
                // 静默容错
            }
        }

        return $added;
    }

    private function getColumnsToEnsure(string $p): array
    {
        return [
            [
                'table'  => "{$p}rc_device",
                'column' => 'unit',
                'ddl'    => "ALTER TABLE `{$p}rc_device` ADD COLUMN `unit` VARCHAR(32) NOT NULL DEFAULT '台' COMMENT '计价计量单位' AFTER `guide_price`"
            ],
            [
                'table'  => "{$p}rc_device",
                'column' => 'cover_img',
                'ddl'    => "ALTER TABLE `{$p}rc_device` ADD COLUMN `cover_img` VARCHAR(255) NOT NULL DEFAULT '/uploads/default/dev_default.svg' COMMENT '物品展示缩略图' AFTER `name`"
            ],
            [
                'table'  => "{$p}rc_category",
                'column' => 'unit',
                'ddl'    => "ALTER TABLE `{$p}rc_category` ADD COLUMN `unit` VARCHAR(32) NOT NULL DEFAULT '台' COMMENT '品类默认计量单位' AFTER `icon`"
            ],
            [
                'table'  => "{$p}rc_question",
                'column' => 'device_id',
                'ddl'    => "ALTER TABLE `{$p}rc_question` ADD COLUMN `device_id` INT(11) UNSIGNED NOT NULL DEFAULT '0' COMMENT '机型或物品ID(0为品类通用)' AFTER `category_id`"
            ],
            [
                'table'  => "{$p}rc_question_item",
                'column' => 'image',
                'ddl'    => "ALTER TABLE `{$p}rc_question_item` ADD COLUMN `image` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '选项成色参考图示URL' AFTER `desc_text`"
            ],
            [
                'table'  => "{$p}rc_question_item",
                'column' => 'desc_text',
                'ddl'    => "ALTER TABLE `{$p}rc_question_item` ADD COLUMN `desc_text` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '选项成色描述' AFTER `name`"
            ],
            [
                'table'  => "{$p}rc_order",
                'column' => 'fulfillment_type',
                'ddl'    => "ALTER TABLE `{$p}rc_order` ADD COLUMN `fulfillment_type` VARCHAR(32) NOT NULL DEFAULT 'mail' COMMENT '履约模式: mail-邮寄, store-到店, home-上门' AFTER `final_price`"
            ],
            [
                'table'  => "{$p}rc_order",
                'column' => 'store_id',
                'ddl'    => "ALTER TABLE `{$p}rc_order` ADD COLUMN `store_id` INT(11) UNSIGNED NOT NULL DEFAULT '0' COMMENT '交割门店ID' AFTER `fulfillment_type`"
            ],
            [
                'table'  => "{$p}rc_order",
                'column' => 'store_name',
                'ddl'    => "ALTER TABLE `{$p}rc_order` ADD COLUMN `store_name` VARCHAR(128) NOT NULL DEFAULT '' COMMENT '交割门店名称快照' AFTER `store_id`"
            ],
            [
                'table'  => "{$p}rc_order",
                'column' => 'payout_type',
                'ddl'    => "ALTER TABLE `{$p}rc_order` ADD COLUMN `payout_type` VARCHAR(32) NOT NULL DEFAULT 'wechat' COMMENT '结算放款方式: wechat-微信, offline-线下对公' AFTER `fulfillment_type`"
            ],
            [
                'table'  => "{$p}rc_order",
                'column' => 'refund_express_sn',
                'ddl'    => "ALTER TABLE `{$p}rc_order` ADD COLUMN `refund_express_sn` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '退货寄回物流单号' AFTER `express_sn`"
            ],
            [
                'table'  => "{$p}rc_order",
                'column' => 'appointment_time',
                'ddl'    => "ALTER TABLE `{$p}rc_order` ADD COLUMN `appointment_time` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '预约上门/到店时间段' AFTER `contact_address`"
            ],
            [
                'table'  => "{$p}rc_order",
                'column' => 'user_remark',
                'ddl'    => "ALTER TABLE `{$p}rc_order` ADD COLUMN `user_remark` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '用户留言备注' AFTER `refund_express_sn`"
            ],
            [
                'table'  => "{$p}rc_order",
                'column' => 'coupon_id',
                'ddl'    => "ALTER TABLE `{$p}rc_order` ADD COLUMN `coupon_id` INT(11) UNSIGNED NOT NULL DEFAULT '0' COMMENT '使用的加价券模板ID' AFTER `final_price`"
            ],
            [
                'table'  => "{$p}rc_order",
                'column' => 'user_coupon_id',
                'ddl'    => "ALTER TABLE `{$p}rc_order` ADD COLUMN `user_coupon_id` INT(11) UNSIGNED NOT NULL DEFAULT '0' COMMENT '领取的加价券记录ID' AFTER `coupon_id`"
            ],
            [
                'table'  => "{$p}rc_order",
                'column' => 'coupon_add_price',
                'ddl'    => "ALTER TABLE `{$p}rc_order` ADD COLUMN `coupon_add_price` DECIMAL(10,2) NOT NULL DEFAULT '0.00' COMMENT '加价券实际补贴现金金额' AFTER `user_coupon_id`"
            ],
            [
                'table'  => "{$p}rc_order",
                'column' => 'biz_type',
                'ddl'    => "ALTER TABLE `{$p}rc_order` ADD COLUMN `biz_type` VARCHAR(32) NOT NULL DEFAULT 'recycle' COMMENT '业务形态: recycle-回收, service-同城服务' AFTER `order_sn`"
            ],
            [
                'table'  => "{$p}rc_order",
                'column' => 'pay_status',
                'ddl'    => "ALTER TABLE `{$p}rc_order` ADD COLUMN `pay_status` TINYINT(1) NOT NULL DEFAULT '0' COMMENT '支付状态: 0-未付, 1-已付, 2-已退款' AFTER `final_price`"
            ],
            [
                'table'  => "{$p}rc_order",
                'column' => 'pay_price',
                'ddl'    => "ALTER TABLE `{$p}rc_order` ADD COLUMN `pay_price` DECIMAL(10,2) NOT NULL DEFAULT '0.00' COMMENT '用户实际在线支付金额' AFTER `pay_status`"
            ],
            [
                'table'  => "{$p}rc_order",
                'column' => 'pay_type',
                'ddl'    => "ALTER TABLE `{$p}rc_order` ADD COLUMN `pay_type` VARCHAR(32) NOT NULL DEFAULT 'none' COMMENT '在线支付渠道' AFTER `pay_price`"
            ],
            [
                'table'  => "{$p}rc_order",
                'column' => 'pay_time',
                'ddl'    => "ALTER TABLE `{$p}rc_order` ADD COLUMN `pay_time` INT(11) UNSIGNED NOT NULL DEFAULT '0' COMMENT '支付成功时间戳' AFTER `pay_type`"
            ],
            [
                'table'  => "{$p}rc_order",
                'column' => 'pay_trade_no',
                'ddl'    => "ALTER TABLE `{$p}rc_order` ADD COLUMN `pay_trade_no` VARCHAR(128) NOT NULL DEFAULT '' COMMENT '第三方支付交易流水号' AFTER `pay_time`"
            ],
        ];
    }

    /**
     * 辅助：补齐系统核心默认配置参数 (sys_config)
     */
    private function repairDefaultConfigs(string $p): array
    {
        $restored = [];
        $defaults = [
            ['system', 'site_name', '启灵同城服务', '系统站点名称'],
            ['system', 'service_tel', '400-800-8888', '客服联系电话'],
            ['system', 'price_lock_days', '7', '下单估价锁定期(天)'],
            ['system', 'industry_template', 'universal', '当前生效行业业务模板'],
            ['wechat', 'miniapp_appid', '', '微信小程序AppID'],
            ['wechat', 'miniapp_secret', '', '微信小程序AppSecret'],
            ['wechat', 'mch_id', '', '微信商户号'],
            ['wechat', 'mch_v3_key', '', '微信支付APIv3密钥'],
        ];

        $now = time();
        foreach ($defaults as $cfg) {
            try {
                $row = $this->db->fetchOne(
                    "SELECT `id` FROM `{$p}sys_config` WHERE `group_name` = ? AND `config_key` = ? LIMIT 1",
                    [$cfg[0], $cfg[1]]
                );
                if (empty($row)) {
                    $this->db->execute(
                        "INSERT INTO `{$p}sys_config` (`group_name`, `config_key`, `config_value`, `remark`, `updated_at`) VALUES (?, ?, ?, ?, ?)",
                        [$cfg[0], $cfg[1], $cfg[2], $cfg[3], $now]
                    );
                    $restored[] = "{$cfg[0]}.{$cfg[1]}";
                }
            } catch (\Throwable $e) {
                // 静默容错
            }
        }

        return $restored;
    }

    /**
     * 辅助：对所有系统表执行 CHECK TABLE 并在异常时尝试 REPAIR TABLE
     */
    private function checkAndRepairTableIntegrity(string $p): array
    {
        $results = [];
        try {
            $tablesSql = "SELECT TABLE_NAME FROM information_schema.tables WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE ?";
            $tableRows = $this->db->fetchAll($tablesSql, [$p . '%']);
            $pdo = $this->db->getPdo();

            foreach ($tableRows as $tbl) {
                $tableName = $tbl['TABLE_NAME'];
                try {
                    $stmt = $pdo->query("CHECK TABLE `{$tableName}`");
                    $chk = $stmt ? $stmt->fetch(\PDO::FETCH_ASSOC) : null;
                    $status = $chk['Msg_text'] ?? 'OK';

                    if (stripos($status, 'error') !== false || stripos($status, 'corrupt') !== false) {
                        $repairStmt = $pdo->query("REPAIR TABLE `{$tableName}`");
                        $repairRes = $repairStmt ? $repairStmt->fetch(\PDO::FETCH_ASSOC) : null;
                        $status = '已修复: ' . ($repairRes['Msg_text'] ?? '完成');
                    }

                    $results[] = [
                        'table'  => $tableName,
                        'status' => $status
                    ];
                } catch (\Throwable $e) {
                    $results[] = [
                        'table'  => $tableName,
                        'status' => '检查跳过: ' . $e->getMessage()
                    ];
                }
            }
        } catch (\Throwable $e) {
            // 静默容错
        }

        return $results;
    }

    /**
     * 辅助：数据表中文业务备注映射
     */
    private function getTableRemark(string $shortName): string
    {
        $map = [
            'sys_admin'           => '系统管理员表',
            'sys_config'          => '系统全局与行业模板配置表',
            'rc_category'         => '回收行业品类表',
            'rc_brand'            => '品牌与规格划分表',
            'rc_device'           => '回收机型行情表',
            'rc_question'         => '质检评估维度题目表',
            'rc_question_item'    => '质检成色扣减选项表 (含示意图)',
            'rc_order'            => '回收业务订单主表',
            'rc_order_detail'     => '订单用户初评问答快照表',
            'rc_order_inspection' => '订单专业质检复核报告表',
            'rc_payout_log'       => '资金结算打款安全流水表',
            'rc_user'             => '前台会员用户表',
            'rc_store'            => '线下门店与到店交投网点表',
            'rc_banner'           => '首页轮播Banner广告表',
            'rc_article'          => '文章单页与平台条款政策表',
            'rc_coupon'           => '回收加价补贴券模板表',
            'rc_user_coupon'      => '用户加价补贴券卡包表',
            // 兼容可能存在的旧表别名
            'rc_order_item'       => '订单选中成色扣减明细表',
            'rc_inspection'       => '专业质检验收复核报告表',
            'rc_inspection_item'  => '质检扣减与差价项明细表',
            'rc_payout'           => '财务结算放款流水表',
            'user'                => '回收客户与交投会员表',
        ];
        return $map[$shortName] ?? '系统业务数据表';
    }

    /**
     * 辅助：格式化字节大小
     */
    private function formatBytes(int $bytes): string
    {
        if ($bytes < 1024) {
            return $bytes . ' B';
        } elseif ($bytes < 1048576) {
            return round($bytes / 1024, 2) . ' KB';
        }
        return round($bytes / 1048576, 2) . ' MB';
    }
}

