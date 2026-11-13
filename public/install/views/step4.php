<?php
/**
 * 启灵独立回收系统 - 安装向导第 4 步：安装完成与安全锁定引导
 * 编码：UTF-8 无 BOM
 */
if (!defined('IN_INSTALL')) exit('Access Denied');
?>
<div class="success-card">
    <div class="success-icon">✓</div>
    <div class="success-title">恭喜！启灵同城服务已成功安装就绪</div>
    <p style="color: #718096; font-size: 14px;">数据库专表已全部建好，行业默认品类库与问答模板已自动预置完成。</p>

    <div class="info-table">
        <div class="info-row">
            <span class="info-label">后台管理地址</span>
            <span class="info-value"><a href="/admin/" style="color:#1e58ff; text-decoration:none;">/admin/ (点击直达)</a></span>
        </div>
        <div class="info-row">
            <span class="info-label">超级管理员账号</span>
            <span class="info-value">您刚才设置的账号 (默认 admin)</span>
        </div>
        <div class="info-row">
            <span class="info-label">系统安全锁状态</span>
            <span class="info-value" style="color:#27ae60;">已自动锁定 (install.lock)</span>
        </div>
        <div class="info-row">
            <span class="info-label">Redis 隔离模式</span>
            <span class="info-value" style="color:#27ae60;">专属 DB 与 sys_recycle: 前缀已启用</span>
        </div>
    </div>

    <div style="background: #fffaf0; border: 1px solid #feebc8; border-radius: 8px; padding: 14px 20px; text-align: left; max-width: 500px; margin: 20px auto; font-size: 13px; color: #c05621;">
        <strong>安全生产建议：</strong><br>
        1. 系统已自动生成 <code>install.lock</code> 文件，严防外部重复重装；<br>
        2. 为了极致安全，您可在服务器中将 <code>install</code> 目录直接删除或重命名。
    </div>

    <div class="btn-group" style="justify-content: center; border-top: none; padding-top: 10px;">
        <a href="/admin/" class="btn btn-primary" style="padding: 0 40px;">进入系统后台管理工作台 →</a>
    </div>
</div>
