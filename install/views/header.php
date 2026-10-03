<?php
/**
 * 启灵独立回收系统 - 安装向导公共头部
 * 编码：UTF-8 无 BOM
 */
if (!defined('IN_INSTALL')) exit('Access Denied');
$currentStep = (int)($step ?? 1);
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>系统图形化安装向导 - 启灵专业二手回收系统</title>
    <link rel="stylesheet" href="assets/install.css">
</head>
<body>
<div class="install-container">
    <div class="install-header">
        <h1>启灵专业二手回收系统 · 安装向导</h1>
        <p>全品类二手回收业务系统 · 极速一键部署与专表数据库初始化</p>
    </div>
    <div class="install-steps">
        <div class="step-item <?= $currentStep === 1 ? 'active' : ($currentStep > 1 ? 'completed' : '') ?>">
            <span class="step-num"><?= $currentStep > 1 ? '✓' : '1' ?></span>
            <span>环境与权限检测</span>
        </div>
        <div class="step-item <?= $currentStep === 2 ? 'active' : ($currentStep > 2 ? 'completed' : '') ?>">
            <span class="step-num"><?= $currentStep > 2 ? '✓' : '2' ?></span>
            <span>数据库与参数配置</span>
        </div>
        <div class="step-item <?= $currentStep === 3 ? 'active' : ($currentStep > 3 ? 'completed' : '') ?>">
            <span class="step-num"><?= $currentStep > 3 ? '✓' : '3' ?></span>
            <span>自动化建表与注入</span>
        </div>
        <div class="step-item <?= $currentStep === 4 ? 'active' : '' ?>">
            <span class="step-num">4</span>
            <span>完成并锁定</span>
        </div>
    </div>
    <div class="install-body">
