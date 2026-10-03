<?php
/**
 * 启灵独立回收系统 - 后台网站导航菜单控制器
 * 职责：支持网站多级主菜单/子菜单可视化配置、品类联动与自定义外链
 * 编码：UTF-8 无 BOM
 */

namespace App\Controller\Admin;

use App\Controller\Admin\AdminBaseController;
use App\Common\Request;
use App\Service\MenuService;
use App\Model\DeviceModel;

class MenuController extends AdminBaseController
{
    private $menuService;
    private $deviceModel;

    public function __construct()
    {
        parent::__construct();
        $this->menuService = new MenuService();
        $this->deviceModel = new DeviceModel();
    }

    /**
     * 获取当前菜单列表及可用品类选项
     */
    public function list(): void
    {
        $menus = $this->menuService->getMenus(false);

        // 获取可选的品类库，供管理员下拉绑定
        $categories = $this->deviceModel->getCategoryList(true);

        $this->success([
            'menus'      => $menus,
            'categories' => $categories
        ], '获取前台导航菜单成功');
    }

    /**
     * 保存前台导航菜单树
     */
    public function save(): void
    {
        $menus = Request::post('menus', []);
        if (!is_array($menus)) {
            $this->error('菜单数据格式不正确');
        }

        $res = $this->menuService->saveMenus($menus);
        if ($res['code'] === 200) {
            $this->success($res['data'], $res['msg']);
        } else {
            $this->error($res['msg']);
        }
    }

    /**
     * 一键重置前台导航菜单为基于当前行业模板的品类结构
     */
    public function reset(): void
    {
        $res = $this->menuService->resetDefaultMenus();
        if ($res['code'] === 200) {
            $this->success($res['data'], '前台导航菜单已成功重置为默认品类导航');
        } else {
            $this->error($res['msg']);
        }
    }
}
