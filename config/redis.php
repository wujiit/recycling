<?php
// Redis 独立多网站隔离缓存配置
return [
    'enable'   => true,             // 是否启用 Redis，未开启或异常时自动降级为文件缓存
    'host'     => '127.0.0.1',
    'port'     => 6379,
    'password' => '',               // 密码，若无则留空
    'db_index' => 6,                // 专属 DB 库号（0-15），指定 DB 6 与同服其他站点隔离
    'prefix'   => 'sys_recycle:',   // 强制业务前缀，严禁全局清空，保障同服其他网站零受损
    'timeout'  => 2.0,
];
