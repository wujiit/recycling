<?php
/**
 * 启灵同城生活服务平台 - 一键重装同步【同城便民综合生活服务平台】示范数据与系统配置
 * 访问路径: https://huishou.jingxialai.com/sync_city_life.php
 * 安全说明: 执行完毕后可随时保留或删除，用于极速修复与强制对齐线上环境数据库。
 */

declare(strict_types=1);

define('ROOT_PATH', dirname(__DIR__));
date_default_timezone_set('Asia/Shanghai');

header('Content-Type: text/html; charset=utf-8');

// 1. 读取数据库配置
$configFile = ROOT_PATH . DIRECTORY_SEPARATOR . 'runtime' . DIRECTORY_SEPARATOR . 'database.php';
if (!file_exists($configFile)) {
    die('<h2 style="color:red;text-align:center;margin-top:50px;">❌ 错误: runtime/database.php 数据库配置文件不存在，请先完成系统安装！</h2>');
}

$dbConfig = require $configFile;
$host = $dbConfig['host'] ?? '127.0.0.1';
$port = (int)($dbConfig['port'] ?? 3306);
$database = $dbConfig['database'] ?? '';
$username = $dbConfig['username'] ?? 'root';
$password = $dbConfig['password'] ?? '';
$prefix = $dbConfig['prefix'] ?? 'ql_';
$charset = $dbConfig['charset'] ?? 'utf8mb4';

try {
    $dsn = "mysql:host={$host};port={$port};dbname={$database};charset={$charset}";
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
} catch (PDOException $e) {
    die('<h2 style="color:red;text-align:center;margin-top:50px;">❌ 数据库连接失败: ' . htmlspecialchars($e->getMessage()) . '</h2>');
}

$now = time();
$logs = [];

function batchInsertSafe(PDO $pdo, string $table, array $columns, array $rows): void {
    if (empty($rows)) return;
    $colSql = '`' . implode('`, `', $columns) . '`';
    $rowPlaceholder = '(' . implode(', ', array_fill(0, count($columns), '?')) . ')';
    $placeholdersSql = implode(', ', array_fill(0, count($rows), $rowPlaceholder));

    $flatParams = [];
    foreach ($rows as $row) {
        foreach ($row as $val) {
            $flatParams[] = $val;
        }
    }
    $sql = "INSERT INTO `{$table}` ({$colSql}) VALUES {$placeholdersSql}";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($flatParams);
}

try {
    $pdo->beginTransaction();

    // =============== 1. 重建三大核心生活服务分类与项目 ===============
    $pdo->exec("DELETE FROM `{$prefix}rc_service_spec`");
    $pdo->exec("DELETE FROM `{$prefix}rc_service_item`");
    $pdo->exec("DELETE FROM `{$prefix}rc_service_category`");

    $categories = [
        [1, 'service', '上门宠物与伴宠服务', '🐕', 100, 1, $now, $now],
        [2, 'service', '家政保洁与家电清洗', '🧹', 90, 1, $now, $now],
        [3, 'service', '家庭维修与安装快修', '🛠️', 80, 1, $now, $now]
    ];
    batchInsertSafe($pdo, "{$prefix}rc_service_category", ['id', 'biz_type', 'name', 'icon', 'sort', 'is_show', 'created_at', 'updated_at'], $categories);
    $logs[] = "✅ 已注入 3 大专属生活服务品类: 上门宠物与伴宠服务 / 家政保洁与家电清洗 / 家庭维修与安装快修";

    $serviceItems = [
        // 行业 1: 上门宠物与伴宠服务
        [1, 1, 'service', '狗狗专属户外散步遛弯服务', '专业佩戴牵引绳 · 户外散步30-60分钟 · GPS轨迹打卡', '/uploads/default/service_dog.svg', 35.00, 45.00, '次', 'spec', 45, '持证宠托师,GPS轨迹打卡,安全防暴冲,爱宠意外险', '请自备牵引绳、拾便袋与水壶；如有护食、攻击倾向请提前告知并备好安全嘴套。', '<p>专业持证宠托师上门，佩戴安全双保险牵引绳，全程记录运动轨迹与排便拍照，实时回传主人。</p>', 328, 1, 100, 1, $now, $now],
        [2, 1, 'service', '猫咪无应激上门喂食护理', '更换新鲜水粮 · 清洗粮碗水碗 · 猫砂清理除臭消毒 · 陪玩梳毛', '/uploads/default/pet_cat.svg', 40.00, 50.00, '次', 'spec', 30, '实名宠托师,高清视频回传,全套消毒,无应激护理', '请将猫粮、罐头、冻干及猫砂放置于显眼处，并提供钥匙或智能门锁密码。', '<p>专人进门双手消毒穿鞋套，清洗餐具，按量添加粮水，清理猫砂盆，观察猫咪健康状态并录制视频回传。</p>', 265, 1, 95, 1, $now, $now],
        [3, 1, 'service', '宠物上门温水洗护烘干', '自带专业折叠浴盆 · 进口低敏沐浴露 · 负离子吹水烘干', '/uploads/default/pet_bath.svg', 98.00, 128.00, '次', 'spec', 60, '自带全套工具,低敏香波,轻柔吹水,免去到店应激', '服务需家里提供温水与电源，洗护前请确保爱宠已接种狂犬疫苗。', '<p>免去带爱宠去宠物店交叉感染与路途应激风险，资深宠托师上门自带工具洗护美容。</p>', 156, 0, 90, 1, $now, $now],
        // 行业 2: 家政保洁与家电清洗
        [4, 2, 'service', '油烟机全拆深度高温蒸洗', '140℃高温蒸气灭菌 · 纳米级去重油垢 · 风轮深度清洁 · 试机验收', '/uploads/default/service_hood.svg', 129.00, 169.00, '台', 'spec', 90, '官方认证师傅,不满意重洗,损坏包赔,无隐形收费', '请确保现场水电畅通；若油烟机年久老化严重无法正常拆装，师傅现场告知并协商免拆清洗方案。', '<p>专业师傅携带专业高压高温蒸汽机上门，全方位分解陈年油垢，高温杀菌除味，彻底恢复强劲排烟吸力。</p>', 582, 1, 100, 1, $now, $now],
        [5, 2, 'service', '变频挂机空调高温深度拆洗', '拆卸面罩滤网 · 蒸发器140℃高温蒸汽灭菌 · 环保抑菌防霉', '/uploads/default/appliance_ac.svg', 89.00, 119.00, '台', 'spec', 60, '140℃高温灭菌,深度除垢,试机验收,无二次污染', '清洗前请确保空调能正常通电开启；服务需自备水电源。', '<p>专业清洗设备高温高压脉冲冲洗，深层消除冷凝水霉斑与军团菌，送风清新更省电。</p>', 430, 1, 95, 1, $now, $now],
        [6, 2, 'service', '全屋日常精细保洁 (4小时整屋)', '全屋分区专布专用 · 边角除尘 · 厨房卫浴深度清洁 · 垃圾带走', '/uploads/default/service_clean.svg', 169.00, 219.00, '次', 'spec', 240, '实名认证阿姨,全套专业工具,迟到必赔,清洁不满意免单', '服务范围不含室外外墙高空擦窗、古董字画及拆洗重度油污电器；请预先妥善保管贵重首饰现金。', '<p>标准4小时保洁服务，涵盖客餐厅、卧室、厨房表面油污擦拭、卫生间水垢除菌及地面深度清拖。</p>', 612, 1, 90, 1, $now, $now],
        // 行业 3: 家庭维修与安装快修
        [7, 3, 'service', '家庭电路跳闸与短路故障排查', '专业万用表摇表排查 · 快速定位短路点 · 修复恢复通电', '/uploads/default/service_circuit.svg', 60.00, 80.00, '次', 'spec', 45, '持证电工,专业仪器排查,修不好不收钱,质保90天', '上门费包含初级故障排查；如需更换空开或重新穿线，材料费另计。', '<p>持证电工上门，分路排查漏保跳闸、零火线接反与插座无电，修不好不收费，官方质保90天。</p>', 289, 1, 100, 1, $now, $now],
        [8, 3, 'service', '家庭管道强力疏通/漏水排障', '专业疏通机/内窥镜探查 · 快速上门 · 疏通不成功不收费', '/uploads/default/service_pipe.svg', 88.00, 120.00, '次', 'fixed', 45, '急速上门,明码标价,修不好不收钱,质保90天', '基础费包含30分钟内常规机械疏通；疏通后当面通水试验；不通不收费。', '<p>解决地漏返水、马桶堵塞、下水道不畅等突发状况，专业机械设备高效通畅。</p>', 345, 1, 95, 1, $now, $now],
        [9, 3, 'service', '防盗门锁体更换与超C级锁芯升级', '全铜超C级锁芯 · 防暴力开启 · 适配各类防盗门', '/uploads/default/service_lock.svg', 120.00, 160.00, '套', 'spec', 45, '超C级全铜防盗,防暴力破拆,当面试锁验收,质保1年', '师傅上门须核验业主身份证明方可作业。', '<p>防盗门卡死、钥匙拔不出、锁舌失灵快速上门更换新锁体与超C级锁芯。</p>', 198, 0, 90, 1, $now, $now]
    ];
    $itemCols = ['id', 'category_id', 'biz_type', 'title', 'sub_title', 'cover_image', 'price', 'original_price', 'price_unit', 'pricing_type', 'service_duration', 'guarantee_tags', 'notice_tips', 'content_detail', 'sales_count', 'is_hot', 'sort', 'status', 'created_at', 'updated_at'];
    batchInsertSafe($pdo, "{$prefix}rc_service_item", $itemCols, $serviceItems);
    $logs[] = "✅ 已注入 9 款精选生活服务核心项目 (宠物遛狗、猫咪喂食、宠物洗护、油烟机、空调、全屋保洁、电路维修、管道疏通、防盗锁)";

    $serviceSpecs = [
        [1, 1, '小型犬遛狗 (体型<10kg / 散步30分钟)', 35.00, '次', '如柯基、泰迪、比熊、雪纳瑞', 10, 1, 1, $now],
        [2, 1, '中型犬遛狗 (体型10-25kg / 散步45分钟)', 50.00, '次', '如柴犬、边牧、萨摩耶、哈士奇', 9, 0, 1, $now],
        [3, 1, '大型犬遛狗 (体型>25kg / 散步60分钟)', 70.00, '次', '如金毛、拉布拉多、阿拉斯加、巨贵', 8, 0, 1, $now],
        [4, 2, '单猫家庭 (标准护理20分钟)', 40.00, '次', '适合1只猫咪家庭', 10, 1, 1, $now],
        [5, 2, '多猫家庭 (2-3只猫 / 深度护理35分钟)', 60.00, '次', '适合2-3只猫咪深度喂食与铲砂', 9, 0, 1, $now],
        [6, 3, '小型犬/猫咪温水洗护 (<10kg)', 98.00, '次', '含洗护、吹水烘干、修脚毛趾甲', 10, 1, 1, $now],
        [7, 3, '中大型犬温水洗护 (>10kg)', 148.00, '次', '含全套去污顺毛与烘干吹水', 9, 0, 1, $now],
        [8, 4, '侧吸式/中式油烟机全拆清洗 (1台)', 129.00, '台', '适合常规侧吸或老式中式油烟机', 10, 1, 1, $now],
        [9, 4, '欧式/顶吸式油烟机全拆清洗 (1台)', 149.00, '台', '适合常规T型、塔型顶吸油烟机', 9, 0, 1, $now],
        [10, 4, '集成灶深度拆洗 (1台)', 199.00, '台', '包含下排风道、集油盒与灶台全套清洗', 8, 0, 1, $now],
        [11, 5, '单台挂机空调深度清洗 (1-1.5匹)', 89.00, '台', '适合常规壁挂空调', 10, 1, 1, $now],
        [12, 5, '单台圆柱柜机深度清洗 (2-3匹)', 129.00, '台', '适合客厅大型柜机', 9, 0, 1, $now],
        [13, 5, '两台挂机空调特惠套餐', 158.00, '台', '两居室超值套餐', 8, 0, 1, $now],
        [14, 6, '2小时基础保洁 (中小户型/局部)', 99.00, '次', '适合 50㎡ 以下或局部区域保洁', 10, 0, 1, $now],
        [15, 6, '3小时深度保洁 (两居室标准)', 139.00, '次', '适合 50-80㎡ 居室整屋擦拭打扫', 9, 0, 1, $now],
        [16, 6, '4小时整屋深度大扫除 (三居室推荐)', 169.00, '次', '适合 80-120㎡ 居室全屋深度保洁', 8, 1, 1, $now],
        [17, 7, '基础电路跳闸排查修复', 60.00, '次', '排查跳闸短路故障点', 10, 1, 1, $now],
        [18, 7, '单极/双极空气开关更换 (含工时配件)', 95.00, '次', '含国标品牌空开配件', 9, 0, 1, $now],
        [19, 9, '用户自备锁芯师傅人工上门更换', 80.00, '套', '客户自备锁具上门安装', 10, 1, 1, $now],
        [20, 9, '全包套餐：超C级防盗锁芯 + 上门换锁', 158.00, '套', '含超C级叶片锁芯与师傅工时', 9, 0, 1, $now]
    ];
    $specCols = ['id', 'service_id', 'spec_name', 'spec_price', 'spec_unit', 'spec_desc', 'sort', 'is_default', 'status', 'created_at'];
    batchInsertSafe($pdo, "{$prefix}rc_service_spec", $specCols, $serviceSpecs);
    $logs[] = "✅ 已注入 20 项阶梯规格及明码标价数据";

    // =============== 2. 清理废品旧数据，重装精品 3C 数码回收库 ===============
    $pdo->exec("DELETE FROM `{$prefix}rc_device`");
    $pdo->exec("DELETE FROM `{$prefix}rc_brand`");
    $pdo->exec("DELETE FROM `{$prefix}rc_category`");
    $pdo->exec("DELETE FROM `{$prefix}rc_question_item`");
    $pdo->exec("DELETE FROM `{$prefix}rc_question`");

    $rcCats = [
        [1, '智能手机', '/uploads/cat_phone.png', '台', 100, 1, $now],
        [2, '笔记本', '/uploads/cat_laptop.png', '台', 90, 1, $now],
        [3, '平板电脑', '/uploads/cat_tablet.png', '台', 80, 1, $now],
        [4, '摄影摄像', '/uploads/cat_camera.png', '台', 70, 1, $now],
        [5, '智能穿戴', '/uploads/cat_watch.png', '件', 60, 1, $now]
    ];
    batchInsertSafe($pdo, "{$prefix}rc_category", ['id', 'name', 'icon', 'unit', 'sort', 'is_show', 'created_at'], $rcCats);

    $rcBrands = [
        [1, 1, 'Apple / 苹果', 'A', 100, $now],
        [2, 1, 'HUAWEI / 华为', 'H', 95, $now],
        [3, 1, 'Xiaomi / 小米', 'X', 90, $now],
        [4, 2, 'Apple Mac', 'A', 95, $now],
        [5, 2, 'Lenovo / 联想', 'L', 85, $now],
        [6, 4, 'Sony / 索尼', 'S', 90, $now]
    ];
    batchInsertSafe($pdo, "{$prefix}rc_brand", ['id', 'category_id', 'name', 'first_letter', 'sort', 'created_at'], $rcBrands);

    $rcDevices = [
        [1, 1, 1, 'iPhone 15 Pro Max', '/uploads/default/phone_15promax.svg', 6800.00, '台', 100, 1, 1, $now, $now],
        [2, 1, 2, 'HUAWEI Mate 60 Pro', '/uploads/default/phone_mate60.svg', 5200.00, '台', 95, 1, 1, $now, $now],
        [3, 1, 3, '小米 14 Ultra', '/uploads/default/phone_mi14.svg', 4800.00, '台', 90, 1, 1, $now, $now],
        [4, 2, 4, 'MacBook Pro 16寸 M3 Max', '/uploads/default/macbook_pro.svg', 16500.00, '台', 95, 1, 1, $now, $now],
        [5, 3, 1, 'iPad Pro 12.9寸 M2芯片', '/uploads/default/ipad_pro.svg', 5600.00, '台', 90, 1, 1, $now, $now],
        [6, 4, 6, '索尼 Alpha 7M4 全画幅机身', '/uploads/default/sony_a7m4.svg', 11500.00, '台', 85, 1, 1, $now, $now]
    ];
    batchInsertSafe($pdo, "{$prefix}rc_device", ['id', 'category_id', 'brand_id', 'name', 'cover_img', 'guide_price', 'unit', 'sort', 'is_hot', 'status', 'created_at', 'updated_at'], $rcDevices);
    $logs[] = "✅ 已净化回收库：彻底剔除废铁/烂铜/报废车，替换为 3C 旗舰数码机型（苹果、华为、小米等）";

    // =============== 3. 写入同城生活服务综合平台系统配置 ===============
    $configs = [
        'industry_scenario'        => 'city_life',
        'site_name'                => '启灵同城便民生活',
        'brand_name'               => '启灵同城服务',
        'site_slogan'              => '宠物上门 · 家政保洁 · 家庭维修 · 闲置变现',
        'theme_style'              => 'tech_blue',
        'theme_primary_color'      => '#1e58ff',
        'module_service_enabled'   => '1',
        'module_recycle_enabled'   => '1',
        'service_terminology_technician' => '师傅/宠托师',
        'service_terminology_order'      => '预约服务单',
        'hero_badge_text'          => '✨ 综合到家生活服务平台',
        'hero_title'               => '专业师傅随时待命 · 宠物家政维修到家',
        'hero_subtitle'            => '严选持证技师 · 标准化定价 · 爽约包赔 · 官方售后保障 · 闲置数码高价回收',
        'hero_search_btn_text'     => '搜索服务/数码',
        'hero_search_placeholder'  => '搜遛狗、空调清洗、修水龙头、iPhone回收...',
        'hero_hot_tags'            => json_encode(['狗狗遛弯', '空调拆洗', '油烟机清洗', '换锁芯', 'iPhone15回收', '管道疏通'], JSON_UNESCAPED_UNICODE),
        'hero_metrics'             => json_encode([
            ['value' => '30分钟', 'label' => '极速就近响应'],
            ['value' => '100%实名', 'label' => '持证背景调查'],
            ['value' => '明码标价', 'label' => '绝无隐形加费'],
            ['value' => '官方质保', 'label' => '爽约返修包赔']
        ], JSON_UNESCAPED_UNICODE),
        'industry_custom_fields'   => json_encode([
            ['key' => 'pet_type', 'label' => '宠物种类', 'type' => 'radio', 'category_type' => 'pet', 'options' => ['猫咪', '狗狗', '异宠/鸟类兔类'], 'placeholder' => '', 'required' => 0],
            ['key' => 'pet_breed', 'label' => '宠物品种 / 昵称', 'type' => 'text', 'category_type' => 'pet', 'options' => [], 'placeholder' => '如：柯基 / 金毛 / 英短 / 兔子 (选填)', 'required' => 0],
            ['key' => 'pet_habits', 'label' => '爱宠性情与特殊嘱咐', 'type' => 'text', 'category_type' => 'pet', 'options' => [], 'placeholder' => '如：较胆小怕生、有护食倾向、喜欢飞盘等 (选填)', 'required' => 0],
            ['key' => 'house_area', 'label' => '房屋建筑面积 (㎡)', 'type' => 'number', 'category_type' => 'cleaning', 'options' => [], 'placeholder' => '如：89 (日常保洁选填)', 'required' => 0],
            ['key' => 'house_layout', 'label' => '户型结构', 'type' => 'select', 'category_type' => 'cleaning', 'options' => ['一室一厅', '两室一厅/两室两厅', '三室两厅', '四室及以上/复式'], 'placeholder' => '请选择户型结构', 'required' => 0],
            ['key' => 'fault_desc', 'label' => '故障现象简述', 'type' => 'text', 'category_type' => 'repair', 'options' => [], 'placeholder' => '如：总闸跳闸、水管漏水、门锁卡死 (维修必填)', 'required' => 0],
            ['key' => 'need_parts', 'label' => '配件材料提供方式', 'type' => 'radio', 'category_type' => 'repair', 'options' => ['师傅代买配件 (凭票实报实销)', '用户已自备配件', '无需配件材料'], 'placeholder' => '', 'required' => 0],
            ['key' => 'service_special_notes', 'label' => '上门特殊提醒与门禁说明', 'type' => 'text', 'category_type' => 'common', 'options' => [], 'placeholder' => '如：智能密码锁 886622 / 门口地垫下 / 家有老人轻声', 'required' => 0]
        ], JSON_UNESCAPED_UNICODE),
    ];

    $cfgStmt = $pdo->prepare("INSERT INTO `{$prefix}sys_config` (`group_name`, `config_key`, `config_value`, `updated_at`) 
                              VALUES ('system', ?, ?, ?) 
                              ON DUPLICATE KEY UPDATE `config_value` = VALUES(`config_value`), `updated_at` = VALUES(`updated_at`)");
    foreach ($configs as $k => $v) {
        $cfgStmt->execute([$k, (string)$v, $now]);
    }
    $logs[] = "✅ 已写入全套行业场景系统参数 (包括功能开关、角色称谓、首页 Hero 标语与金刚区)";

    $pdo->commit();
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    die('<h2 style="color:red;text-align:center;margin-top:50px;">❌ 执行同步异常: ' . htmlspecialchars($e->getMessage()) . '</h2>');
}

// 4. 清理系统与模版缓存
$cacheDir = ROOT_PATH . DIRECTORY_SEPARATOR . 'runtime' . DIRECTORY_SEPARATOR . 'cache';
$clearedFiles = 0;
if (is_dir($cacheDir)) {
    $files = scandir($cacheDir);
    foreach ($files as $f) {
        if ($f === '.' || $f === '..' || $f === '.gitkeep') continue;
        if (strpos($f, '.auth.cache') !== false) continue; // 保护管理员登录态
        @unlink($cacheDir . DIRECTORY_SEPARATOR . $f);
        $clearedFiles++;
    }
}
$logs[] = "✅ 已安全清理服务端缓存文件 ({$clearedFiles} 个文件)，管理员登录状态已完好保留";

// 5. 渲染极简清爽管理控制台
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>同城便民综合生活服务平台 · 示范数据同步就绪</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", sans-serif; background: #f1f5f9; color: #1e293b; padding: 40px 20px; }
        .container { max-width: 720px; margin: 0 auto; background: #ffffff; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.06); padding: 36px 32px; }
        .header { text-align: center; margin-bottom: 28px; }
        .icon { font-size: 56px; margin-bottom: 12px; }
        h1 { font-size: 24px; color: #0f172a; margin-bottom: 8px; }
        .desc { font-size: 14px; color: #64748b; }
        .log-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin: 24px 0; font-size: 14px; line-height: 2; color: #334155; }
        .btn-group { display: flex; gap: 14px; justify-content: center; margin-top: 28px; flex-wrap: wrap; }
        .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 14px 28px; border-radius: 10px; font-size: 15px; font-weight: 600; text-decoration: none; cursor: pointer; transition: all 0.2s; }
        .btn-primary { background: #1e58ff; color: #ffffff; box-shadow: 0 4px 14px rgba(30,88,255,0.3); }
        .btn-primary:hover { background: #1645cf; transform: translateY(-1px); }
        .btn-secondary { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; }
        .btn-secondary:hover { background: #e2e8f0; }
        .badge { display: inline-block; background: #dcfce7; color: #15803d; font-size: 12px; padding: 4px 10px; border-radius: 20px; font-weight: 700; margin-bottom: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="icon">🚀</div>
            <span class="badge">同步执行成功</span>
            <h1>【同城便民综合平台】数据已装载完毕</h1>
            <p class="desc">3大核心到家生活服务分类、9大精品服务项目、20项阶梯规格及数码回收库已成功注入数据库！</p>
        </div>

        <div class="log-box">
            <?php foreach ($logs as $log): ?>
                <div><?= htmlspecialchars($log) ?></div>
            <?php endforeach; ?>
        </div>

        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px;font-size:13px;color:#1e40af;line-height:1.6;">
            💡 <strong>温馨提示：</strong><br>
            1. 前台首页已自动排布为：<strong>【四大金刚核心入口】+【同城便民生活服务专区 (按3大分类筛选)】+【二手数码闲置变现】</strong>。<br>
            2. 后台已完全就绪，可在【生活服务】中自由编辑分类、价格、规格与师傅排班。
        </div>

        <div class="btn-group">
            <a href="/index.html?t=<?= time() ?>" target="_blank" class="btn btn-primary">👉 立刻打开前台首页检验效果</a>
            <a href="/admin/index.html?t=<?= time() ?>" target="_blank" class="btn btn-secondary">👉 进入管理后台查看</a>
        </div>
    </div>
</body>
</html>
