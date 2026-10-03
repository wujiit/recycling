<?php
/**
 * 启灵独立回收系统 - 安装向导第 1 步：运行环境与目录权限检测
 * 编码：UTF-8 无 BOM
 */
if (!defined('IN_INSTALL')) exit('Access Denied');
?>
<div class="section-title">第一步：服务器运行环境与扩展自检</div>
<table class="table-box">
    <thead>
        <tr>
            <th>项目名称</th>
            <th>最低需求</th>
            <th>当前环境</th>
            <th>检查结果</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>PHP 版本</td>
            <td>PHP 7.4 及以上</td>
            <td><?= htmlspecialchars($env['php_version']) ?></td>
            <td>
                <?php if ($env['php_ok']): ?>
                    <span class="badge-pass">✓ 符合要求</span>
                <?php else: ?>
                    <span class="badge-fail">✕ 版本过低 (需 >= 7.4)</span>
                <?php endif; ?>
            </td>
        </tr>
        <?php foreach ($env['extensions'] as $extKey => $ext): ?>
        <tr>
            <td><?= htmlspecialchars($ext['name']) ?></td>
            <td><?= $ext['required'] ? '必须启用' : '可选 (具备容灾降级)' ?></td>
            <td><?= $ext['installed'] ? '已安装' : '未安装' ?></td>
            <td>
                <?php if ($ext['installed']): ?>
                    <span class="badge-pass">✓ 支持</span>
                <?php elseif (!$ext['required']): ?>
                    <span class="badge-pass" style="background:#eef2f7;color:#718096;">○ 自动降级文件缓存</span>
                <?php else: ?>
                    <span class="badge-fail">✕ 缺失，请在 php.ini 或环境中开启</span>
                <?php endif; ?>
            </td>
        </tr>
        <?php endforeach; ?>
    </tbody>
</table>

<div class="section-title">核心目录读写权限检测</div>
<table class="table-box">
    <thead>
        <tr>
            <th>目录名称</th>
            <th>权限要求</th>
            <th>当前状态</th>
            <th>检查结果</th>
        </tr>
    </thead>
    <tbody>
        <?php foreach ($env['dirs'] as $dir): ?>
        <tr>
            <td><?= htmlspecialchars($dir['name']) ?></td>
            <td>可读可写 (chmod 755/777)</td>
            <td><?= $dir['writable'] ? '可读写' : '不可写' ?></td>
            <td>
                <?php if ($dir['writable']): ?>
                    <span class="badge-pass">✓ 正常</span>
                <?php else: ?>
                    <span class="badge-fail">✕ 无写权限，请在服务器设置权限(chmod 777)</span>
                <?php endif; ?>
            </td>
        </tr>
        <?php endforeach; ?>
    </tbody>
</table>

<div class="btn-group">
    <button type="button" class="btn btn-secondary" onclick="window.location.reload();">重新检测</button>
    <?php if ($env['all_passed']): ?>
        <a href="index.php?step=2" class="btn btn-primary">下一步：配置数据库与参数 →</a>
    <?php else: ?>
        <button type="button" class="btn btn-primary btn-disabled" title="请先处理上述不符合项">环境未达标，暂不可进入下一步</button>
    <?php endif; ?>
</div>
