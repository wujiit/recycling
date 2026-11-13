/**
 * 系统安装向导交互脚本
 */

document.addEventListener('DOMContentLoaded', function () {
    // 1. 数据库连通性异步测试
    const btnTestDb = document.getElementById('btn-test-db');
    if (btnTestDb) {
        btnTestDb.addEventListener('click', function () {
            const host = document.getElementById('db_host')?.value || '127.0.0.1';
            const port = document.getElementById('db_port')?.value || '3306';
            const user = document.getElementById('db_user')?.value || '';
            const pass = document.getElementById('db_pass')?.value || '';
            const name = document.getElementById('db_name')?.value || '';
            const resultBox = document.getElementById('db-test-result');

            if (!resultBox) return;

            resultBox.className = 'test-result';
            resultBox.style.display = 'block';
            resultBox.innerText = '正在尝试连接数据库，请稍候...';
            btnTestDb.classList.add('btn-disabled');

            fetch('index.php?act=test_db', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ host, port, user, password: pass, database: name })
            })
            .then(res => res.json())
            .then(data => {
                btnTestDb.classList.remove('btn-disabled');
                if (data.code === 200) {
                    resultBox.className = 'test-result success';
                    resultBox.innerText = data.msg;
                } else {
                    resultBox.className = 'test-result error';
                    resultBox.innerText = data.msg;
                }
            })
            .catch(err => {
                btnTestDb.classList.remove('btn-disabled');
                resultBox.className = 'test-result error';
                resultBox.innerText = '网络请求异常，请检查网络或服务状态';
            });
        });
    }

    // 2. Redis 连通性异步测试 (多网站隔离库验证)
    const btnTestRedis = document.getElementById('btn-test-redis');
    if (btnTestRedis) {
        btnTestRedis.addEventListener('click', function () {
            const enable = document.getElementById('redis_enable')?.checked ? 1 : 0;
            const host = document.getElementById('redis_host')?.value || '127.0.0.1';
            const port = document.getElementById('redis_port')?.value || '6379';
            const pass = document.getElementById('redis_pass')?.value || '';
            const dbIndex = document.getElementById('redis_db')?.value || '2';
            const prefix = document.getElementById('redis_prefix')?.value || 'sys_recycle:';
            const resultBox = document.getElementById('redis-test-result');

            if (!resultBox) return;

            resultBox.className = 'test-result';
            resultBox.style.display = 'block';
            resultBox.innerText = '正在测试 Redis 连通性与隔离库...';
            btnTestRedis.classList.add('btn-disabled');

            fetch('index.php?act=test_redis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enable, host, port, password: pass, db_index: dbIndex, prefix })
            })
            .then(res => res.json())
            .then(data => {
                btnTestRedis.classList.remove('btn-disabled');
                if (data.code === 200) {
                    resultBox.className = 'test-result success';
                    resultBox.innerText = data.msg;
                } else {
                    resultBox.className = 'test-result error';
                    resultBox.innerText = data.msg;
                }
            })
            .catch(err => {
                btnTestRedis.classList.remove('btn-disabled');
                resultBox.className = 'test-result error';
                resultBox.innerText = '网络请求异常，无法连接服务端';
            });
        });
    }

    // 2.1 仅保存数据库配置并直达后台（免重复建表）
    const btnSaveDbOnly = document.getElementById('btn-save-db-only');
    if (btnSaveDbOnly) {
        btnSaveDbOnly.addEventListener('click', function () {
            const host = document.getElementById('db_host')?.value || '127.0.0.1';
            const port = document.getElementById('db_port')?.value || '3306';
            const user = document.getElementById('db_user')?.value || '';
            const pass = document.getElementById('db_pass')?.value || '';
            const name = document.getElementById('db_name')?.value || '';
            const prefix = document.getElementById('db_prefix')?.value || 'ql_';
            const resultBox = document.getElementById('db-test-result');

            if (!user || !name) {
                if (resultBox) {
                    resultBox.className = 'test-result error';
                    resultBox.style.display = 'block';
                    resultBox.innerText = '请填写数据库用户名和数据库名';
                }
                return;
            }

            btnSaveDbOnly.classList.add('btn-disabled');
            if (resultBox) {
                resultBox.className = 'test-result';
                resultBox.style.display = 'block';
                resultBox.innerText = '正在验证数据库连接并保存配置...';
            }

            const redisEnable = document.getElementById('redis_enable')?.checked ? 1 : 0;
            const redisHost = document.getElementById('redis_host')?.value || '127.0.0.1';
            const redisPort = document.getElementById('redis_port')?.value || '6379';
            const redisPass = document.getElementById('redis_pass')?.value || '';
            const redisDb = document.getElementById('redis_db')?.value || '6';
            const redisPrefix = document.getElementById('redis_prefix')?.value || 'sys_recycle:';

            fetch('index.php?act=save_db_only', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    db: { host, port, user, password: pass, database: name, prefix },
                    redis: { enable: redisEnable, host: redisHost, port: redisPort, password: redisPass, db_index: redisDb, prefix: redisPrefix }
                })
            })
            .then(res => res.json())
            .then(data => {
                btnSaveDbOnly.classList.remove('btn-disabled');
                if (data.code === 200) {
                    if (resultBox) {
                        resultBox.className = 'test-result success';
                        resultBox.innerText = data.msg;
                    }
                    setTimeout(() => {
                        window.location.href = '/admin/';
                    }, 600);
                } else {
                    if (resultBox) {
                        resultBox.className = 'test-result error';
                        resultBox.innerText = data.msg;
                    }
                }
            })
            .catch(err => {
                btnSaveDbOnly.classList.remove('btn-disabled');
                if (resultBox) {
                    resultBox.className = 'test-result error';
                    resultBox.innerText = '网络请求异常，请检查服务状态';
                }
            });
        });
    }

    // 3. 开始执行安装提交
    const formInstall = document.getElementById('form-install');
    if (formInstall) {
        formInstall.addEventListener('submit', function (e) {
            e.preventDefault();
            const btnSubmit = document.getElementById('btn-submit-install');
            if (btnSubmit) btnSubmit.classList.add('btn-disabled');

            // 收集数据
            const payload = {
                force: 1,
                db: {
                    host: document.getElementById('db_host')?.value || '127.0.0.1',
                    port: document.getElementById('db_port')?.value || '3306',
                    user: document.getElementById('db_user')?.value || '',
                    password: document.getElementById('db_pass')?.value || '',
                    database: document.getElementById('db_name')?.value || '',
                    prefix: document.getElementById('db_prefix')?.value || 'ql_'
                },
                redis: {
                    enable: document.getElementById('redis_enable')?.checked ? 1 : 0,
                    host: document.getElementById('redis_host')?.value || '127.0.0.1',
                    port: document.getElementById('redis_port')?.value || '6379',
                    password: document.getElementById('redis_pass')?.value || '',
                    db_index: document.getElementById('redis_db')?.value || '2',
                    prefix: document.getElementById('redis_prefix')?.value || 'sys_recycle:'
                },
                admin: {
                    username: document.getElementById('admin_user')?.value || 'admin',
                    password: document.getElementById('admin_pass')?.value || '',
                    realname: document.getElementById('admin_realname')?.value || '超级管理员'
                },
                app: {
                    name: document.getElementById('app_name')?.value || '启灵同城服务'
                }
            };

            // 切换展示执行进度卡片
            const installConfigBox = document.getElementById('install-config-box');
            const installProgressBox = document.getElementById('install-progress-box');
            if (installConfigBox && installProgressBox) {
                installConfigBox.style.display = 'none';
                installProgressBox.style.display = 'block';
            }

            const fill = document.getElementById('progress-fill');
            const status = document.getElementById('progress-status');

            if (fill) fill.style.width = '20%';
            if (status) status.innerText = '正在校验配置并连接数据库服务...';

            let progressTimer = setTimeout(() => {
                if (fill) fill.style.width = '60%';
                if (status) status.innerText = '正在导入专表结构与预置全品类问答模板...';
            }, 600);

            // 发起真实安装请求
            fetch('index.php?act=do_install', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            .then(res => res.json())
            .then(data => {
                clearTimeout(progressTimer);
                if (data.code === 200) {
                    if (fill) {
                        fill.style.background = '#27ae60';
                        fill.style.width = '100%';
                    }
                    if (status) {
                        status.style.color = '#27ae60';
                        status.innerText = '安装完成！正在跳转至完成页...';
                    }
                    setTimeout(() => {
                        window.location.href = 'index.php?step=4';
                    }, 800);
                } else {
                    if (fill) {
                        fill.style.background = '#e53e3e';
                        fill.style.width = '100%';
                    }
                    if (status) {
                        status.style.color = '#e53e3e';
                        status.innerText = '安装失败: ' + (data.msg || '未知错误');
                    }
                    if (btnSubmit) btnSubmit.classList.remove('btn-disabled');
                    const btnRetry = document.getElementById('btn-retry-box');
                    if (btnRetry) btnRetry.style.display = 'block';
                }
            })
            .catch(err => {
                clearTimeout(progressTimer);
                if (fill) {
                    fill.style.background = '#e53e3e';
                    fill.style.width = '100%';
                }
                if (status) {
                    status.style.color = '#e53e3e';
                    status.innerText = '安装请求失败: ' + (err.message || '网络或服务端异常，请检查控制台');
                }
                if (btnSubmit) btnSubmit.classList.remove('btn-disabled');
                const btnRetry = document.getElementById('btn-retry-box');
                if (btnRetry) btnRetry.style.display = 'block';
            });
        });
    }
});
