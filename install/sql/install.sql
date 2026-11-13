-- 启灵独立二手回收系统 - 核心数据库结构与行业预置数据
-- 编码：UTF-8 无 BOM
-- 数据库引擎：InnoDB，字符集：utf8mb4

SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- 1. 管理员表 (sys_admin)
-- ----------------------------
DROP TABLE IF EXISTS `__PREFIX__sys_admin`;
CREATE TABLE `__PREFIX__sys_admin` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `username` varchar(64) NOT NULL DEFAULT '' COMMENT '登录账号',
  `password_hash` varchar(255) NOT NULL DEFAULT '' COMMENT '密码哈希(BCRYPT)',
  `salt` varchar(32) NOT NULL DEFAULT '' COMMENT '安全盐值',
  `realname` varchar(64) NOT NULL DEFAULT '' COMMENT '姓名',
  `role` varchar(32) NOT NULL DEFAULT 'admin' COMMENT '角色: admin-超级管理员, inspector-质检员, finance-财务',
  `status` tinyint(1) NOT NULL DEFAULT '1' COMMENT '状态: 1-启用, 0-禁用',
  `last_login_time` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '最后登录时间',
  `last_login_ip` varchar(45) NOT NULL DEFAULT '' COMMENT '最后登录IP',
  `created_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '创建时间',
  `updated_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统管理员表';

-- ----------------------------
-- 1.1 管理员安全操作日志表 (sys_admin_log)
-- ----------------------------
DROP TABLE IF EXISTS `__PREFIX__sys_admin_log`;
CREATE TABLE `__PREFIX__sys_admin_log` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT '日志ID',
  `admin_id` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '管理员ID',
  `admin_name` varchar(64) NOT NULL DEFAULT '' COMMENT '管理员姓名',
  `action` varchar(64) NOT NULL DEFAULT '' COMMENT '动作类型',
  `detail` varchar(255) NOT NULL DEFAULT '' COMMENT '详细描述',
  `ip` varchar(45) NOT NULL DEFAULT '' COMMENT '操作IP',
  `user_agent` varchar(255) NOT NULL DEFAULT '' COMMENT '客户端UA',
  `created_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '操作时间',
  PRIMARY KEY (`id`),
  KEY `idx_admin_id` (`admin_id`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理员安全操作日志表';

-- ----------------------------
-- 2. 系统全局配置表 (sys_config)
-- ----------------------------
DROP TABLE IF EXISTS `__PREFIX__sys_config`;
CREATE TABLE `__PREFIX__sys_config` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `group_name` varchar(32) NOT NULL DEFAULT 'system' COMMENT '配置分组',
  `config_key` varchar(64) NOT NULL DEFAULT '' COMMENT '配置键名',
  `config_value` text COMMENT '配置键值(JSON或字符串)',
  `remark` varchar(255) NOT NULL DEFAULT '' COMMENT '配置说明',
  `updated_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_config_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统全局参数配置表';

-- ----------------------------
-- 3. 前台用户表 (rc_user)
-- ----------------------------
DROP TABLE IF EXISTS `__PREFIX__rc_user`;
CREATE TABLE `__PREFIX__rc_user` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `openid` varchar(128) NOT NULL DEFAULT '' COMMENT '微信小程序OpenID',
  `unionid` varchar(128) NOT NULL DEFAULT '' COMMENT '微信UnionID',
  `password_hash` varchar(255) NOT NULL DEFAULT '' COMMENT '登录密码哈希',
  `mobile` varchar(20) NOT NULL DEFAULT '' COMMENT '绑定手机号',
  `nickname` varchar(64) NOT NULL DEFAULT '' COMMENT '昵称',
  `realname` varchar(64) NOT NULL DEFAULT '' COMMENT '真实姓名',
  `avatar` varchar(255) NOT NULL DEFAULT '' COMMENT '头像URL',
  `default_payout_type` varchar(32) NOT NULL DEFAULT 'alipay' COMMENT '默认收款方式: alipay/wechat/bank/cash',
  `default_payout_name` varchar(64) NOT NULL DEFAULT '' COMMENT '默认收款人',
  `default_payout_account` varchar(128) NOT NULL DEFAULT '' COMMENT '默认收款账号',
  `default_payout_bank` varchar(128) NOT NULL DEFAULT '' COMMENT '默认收款银行',
  `default_address` varchar(255) NOT NULL DEFAULT '' COMMENT '默认详细交割地址',
  `register_ip` varchar(45) NOT NULL DEFAULT '' COMMENT '注册IP',
  `register_location` varchar(128) NOT NULL DEFAULT '' COMMENT '注册归属地',
  `risk_tag` varchar(32) NOT NULL DEFAULT 'normal' COMMENT '风控标签: normal正常, trusted优质, dispute争议, fraud欺诈预警',
  `status` tinyint(1) NOT NULL DEFAULT '1' COMMENT '状态: 1-正常, 0-冻结',
  `deregister_status` varchar(32) NOT NULL DEFAULT 'none' COMMENT '注销状态: none无, pending审核中, rejected已驳回',
  `deregister_reason` varchar(255) NOT NULL DEFAULT '' COMMENT '注销申请原因',
  `deregister_apply_time` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '注销申请时间',
  `deregister_reject_reason` varchar(255) NOT NULL DEFAULT '' COMMENT '注销驳回原因',
  `last_login_time` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '最后登录时间',
  `last_login_ip` varchar(45) NOT NULL DEFAULT '' COMMENT '最后登录IP',
  `last_login_location` varchar(128) NOT NULL DEFAULT '' COMMENT '登录归属地',
  `created_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '注册时间',
  `updated_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '更新时间',
  `deleted_at` timestamp NULL DEFAULT NULL COMMENT '软删除时间戳',
  PRIMARY KEY (`id`),
  KEY `idx_openid` (`openid`),
  KEY `idx_mobile` (`mobile`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='前台会员用户表';

-- ----------------------------
-- 4. 回收品类表 (rc_category)
-- ----------------------------
DROP TABLE IF EXISTS `__PREFIX__rc_category`;
CREATE TABLE `__PREFIX__rc_category` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '品类ID',
  `name` varchar(64) NOT NULL DEFAULT '' COMMENT '品类名称',
  `icon` varchar(255) NOT NULL DEFAULT '' COMMENT '品类图标',
  `unit` varchar(32) NOT NULL DEFAULT '台' COMMENT '品类默认单位',
  `sort` int(11) NOT NULL DEFAULT '0' COMMENT '排序(越大越前)',
  `is_show` tinyint(1) NOT NULL DEFAULT '1' COMMENT '显示状态: 1-显示, 0-隐藏',
  `created_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '创建时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='回收品类分类表';

-- ----------------------------
-- 5. 回收品牌表 (rc_brand)
-- ----------------------------
DROP TABLE IF EXISTS `__PREFIX__rc_brand`;
CREATE TABLE `__PREFIX__rc_brand` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '品牌ID',
  `category_id` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '所属品类ID',
  `name` varchar(64) NOT NULL DEFAULT '' COMMENT '品牌名称',
  `logo` varchar(255) NOT NULL DEFAULT '' COMMENT '品牌LOGO',
  `first_letter` char(1) NOT NULL DEFAULT 'A' COMMENT '首字母索引',
  `sort` int(11) NOT NULL DEFAULT '0' COMMENT '排序',
  `is_hot` tinyint(1) NOT NULL DEFAULT '0' COMMENT '热门标记: 1-热门, 0-普通',
  `created_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_category` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='回收品牌表';

-- ----------------------------
-- 6. 回收机型库表 (rc_device)
-- ----------------------------
DROP TABLE IF EXISTS `__PREFIX__rc_device`;
CREATE TABLE `__PREFIX__rc_device` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '机型ID',
  `category_id` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '所属品类ID',
  `brand_id` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '所属品牌ID',
  `name` varchar(128) NOT NULL DEFAULT '' COMMENT '具体型号名称',
  `cover_img` varchar(255) NOT NULL DEFAULT '' COMMENT '机型封面图',
  `guide_price` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '最高官方指导回收基础价',
  `unit` varchar(32) NOT NULL DEFAULT '台' COMMENT '计价单位',
  `sort` int(11) NOT NULL DEFAULT '0' COMMENT '排序',
  `is_hot` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否热门推荐',
  `status` tinyint(1) NOT NULL DEFAULT '1' COMMENT '状态: 1-上架, 0-下架',
  `created_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '创建时间',
  `updated_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_brand` (`brand_id`),
  KEY `idx_category` (`category_id`),
  KEY `idx_cat_status_sort` (`category_id`, `status`, `sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='回收机型型号库';

-- ----------------------------
-- 7. 估价问答题目主表 (rc_question)
-- ----------------------------
DROP TABLE IF EXISTS `__PREFIX__rc_question`;
CREATE TABLE `__PREFIX__rc_question` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '问答题ID',
  `category_id` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '通用分类ID(0为全通用)',
  `device_id` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '标的物ID(0为品类通用)',
  `title` varchar(128) NOT NULL DEFAULT '' COMMENT '评估问题标题(如:屏幕外观)',
  `sub_title` varchar(255) NOT NULL DEFAULT '' COMMENT '引导辅助说明文案',
  `type` enum('radio','checkbox') NOT NULL DEFAULT 'radio' COMMENT '题目类型: 单选/多选',
  `is_required` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否必填',
  `sort` int(11) NOT NULL DEFAULT '0' COMMENT '答题顺序',
  `created_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_device_cat` (`device_id`, `category_id`),
  KEY `idx_sort` (`sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='估价问答问题表';

-- ----------------------------
-- 8. 估价问答选项细项表 (rc_question_item)
-- ----------------------------
DROP TABLE IF EXISTS `__PREFIX__rc_question_item`;
CREATE TABLE `__PREFIX__rc_question_item` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '选项ID',
  `question_id` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '所属问答ID',
  `name` varchar(128) NOT NULL DEFAULT '' COMMENT '选项文案(如:屏幕无划痕)',
  `desc_text` varchar(255) NOT NULL DEFAULT '' COMMENT '详细质检标准说明',
  `image` varchar(255) NOT NULL DEFAULT '' COMMENT '选项参考示例图URL',
  `deduct_type` enum('fixed','ratio') NOT NULL DEFAULT 'fixed' COMMENT '扣减模式: fixed-固定金额, ratio-扣减百分比',
  `deduct_value` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '扣减数值(金额或百分比数值)',
  `is_fault` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否为故障/瑕疵项: 1-瑕疵, 0-完好',
  `sort` int(11) NOT NULL DEFAULT '0' COMMENT '排序',
  `created_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_question` (`question_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='估价问答选项表';

-- ----------------------------
-- 9. 回收订单主表 (rc_order)
-- ----------------------------
DROP TABLE IF EXISTS `__PREFIX__rc_order`;
CREATE TABLE `__PREFIX__rc_order` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '订单ID',
  `order_sn` varchar(32) NOT NULL DEFAULT '' COMMENT '业务订单号',
  `biz_type` varchar(32) NOT NULL DEFAULT 'recycle' COMMENT '业务板块: recycle-二手回收, service-上门生活服务, errand-同城跑腿',
  `user_id` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '提交用户ID',
  `device_id` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '回收机型ID/服务类目ID',
  `device_name` varchar(128) NOT NULL DEFAULT '' COMMENT '下单时项目/机型名称快照',
  `estimate_price` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '用户提交时预估价/服务基础价',
  `final_price` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '质检最终确认成交价/服务实付标准价',
  `coupon_id` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '使用的补贴券模板ID',
  `user_coupon_id` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '领取的加价券记录ID',
  `coupon_add_price` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '加价券实际补贴现金金额',
  `fulfillment_type` enum('mail','store','home') NOT NULL DEFAULT 'mail' COMMENT '履约模式: mail-邮寄, store-到店, home-上门',
  `mail_sub_type` varchar(32) NOT NULL DEFAULT '' COMMENT '邮寄子模式: sf_pickup-顺丰上门取件, self_delivery-自行寄送',
  `store_id` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '交割门店ID',
  `store_name` varchar(128) NOT NULL DEFAULT '' COMMENT '交割门店名称快照',
  `payout_type` varchar(32) NOT NULL DEFAULT 'alipay' COMMENT '结算放款方式: alipay-支付宝, bank-银行卡, wechat-微信, cash-现金, offline-线下对公',
  `payout_name` varchar(64) NOT NULL DEFAULT '' COMMENT '客户收款人实名',
  `payout_account` varchar(128) NOT NULL DEFAULT '' COMMENT '客户收款账号(支付宝/微信/银行卡号)',
  `payout_bank` varchar(128) NOT NULL DEFAULT '' COMMENT '收款开户银行名称(仅银行卡)',
  `pay_type` varchar(32) NOT NULL DEFAULT 'none' COMMENT '用户支付渠道: none-无需支付, wechat-微信支付, alipay-支付宝, balance-余额, offline-线下后付',
  `pay_status` tinyint(1) NOT NULL DEFAULT '0' COMMENT '支付状态: 0-未支付/待支付, 1-已支付, 2-已退款',
  `pay_price` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '用户实际在线支付金额',
  `pay_time` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '支付成功时间戳',
  `pay_trade_no` varchar(64) NOT NULL DEFAULT '' COMMENT '第三方支付交易流水号',
  `payout_audit_status` varchar(32) NOT NULL DEFAULT 'none' COMMENT '大额打款审核状态: none-常规免审, approved-已终审通过',
  `payout_audit_remark` varchar(255) NOT NULL DEFAULT '' COMMENT '大额审批备注',
  `payout_audit_time` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '大额审批时间',
  `payout_audit_admin_id` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '审批管理员ID',
  `technician_id` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '服务师傅/技术人员ID',
  `technician_name` varchar(64) NOT NULL DEFAULT '' COMMENT '服务师傅姓名',
  `technician_mobile` varchar(20) NOT NULL DEFAULT '' COMMENT '服务师傅联系电话',
  `status` varchar(32) NOT NULL DEFAULT 'pending_send' COMMENT '状态: pending_send-待寄出/待到店, in_transit-物流运输中, received-已签收待质检, inspecting-质检中, price_confirming-差价协商中, completed-已成交已打款, cancelled-已取消, refunded-已退货, pending_pay-待支付, pending_dispatch-待派单, dispatched-已派单, in_service-服务中',
  `contact_name` varchar(64) NOT NULL DEFAULT '' COMMENT '联系人姓名',
  `contact_mobile` varchar(20) NOT NULL DEFAULT '' COMMENT '联系电话',
  `contact_address` varchar(255) NOT NULL DEFAULT '' COMMENT '上门/退货收件详细地址',
  `appointment_time` varchar(64) NOT NULL DEFAULT '' COMMENT '预约上门/到店时间段',
  `service_start_time` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '开始服务时间戳',
  `service_finish_time` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '完成服务时间戳',
  `service_images` text COMMENT '服务核销/作业现场凭证照片JSON快照',
  `express_company` varchar(64) NOT NULL DEFAULT '' COMMENT '寄出快递公司(如顺丰速运)',
  `express_sn` varchar(64) NOT NULL DEFAULT '' COMMENT '寄件物流快递单号',
  `refund_express_sn` varchar(64) NOT NULL DEFAULT '' COMMENT '退货寄回物流单号',
  `shipping_fee` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '顺丰速运实扣运费金额',
  `shipping_weight` decimal(8,2) NOT NULL DEFAULT '0.00' COMMENT '顺丰计费重量(kg)',
  `shipping_real_weight` decimal(8,2) NOT NULL DEFAULT '0.00' COMMENT '顺丰实际重量(kg)',
  `shipping_fee_detail` text NULL COMMENT '顺丰运费明细JSON快照',
  `shipping_routes` longtext NULL COMMENT '顺丰速运物流路由轨迹节点列表JSON快照',
  `shipping_courier_phone` varchar(32) NOT NULL DEFAULT '' COMMENT '顺丰取件收派员联系手机号',
  `shipping_courier_name` varchar(64) NOT NULL DEFAULT '' COMMENT '顺丰取件收派员工号/姓名',
  `shipping_dispatch_status` varchar(128) NOT NULL DEFAULT '' COMMENT '顺丰订单调度最新状态描述',
  `user_remark` varchar(255) NOT NULL DEFAULT '' COMMENT '用户留言备注',
  `custom_fields` text NULL COMMENT '动态预约表单自定义键值对快照JSON',
  `created_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '下单时间',
  `updated_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '更新时间',
  `deleted_at` timestamp NULL DEFAULT NULL COMMENT '软删除时间戳',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_order_sn` (`order_sn`),
  KEY `idx_biz_status` (`biz_type`, `status`),
  KEY `idx_biz_user` (`biz_type`, `user_id`),
  KEY `idx_technician` (`technician_id`, `status`),
  KEY `idx_user` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_contact_mobile` (`contact_mobile`),
  KEY `idx_express_sn` (`express_sn`),
  KEY `idx_user_status` (`user_id`, `status`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='同城生活服务与回收综合订单主表';

-- ----------------------------
-- 10. 订单初评选项快照表 (rc_order_detail)
-- ----------------------------
DROP TABLE IF EXISTS `__PREFIX__rc_order_detail`;
CREATE TABLE `__PREFIX__rc_order_detail` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `order_id` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '订单ID',
  `question_id` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '问题ID',
  `question_title` varchar(128) NOT NULL DEFAULT '' COMMENT '问题题目快照',
  `item_id` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '选项ID',
  `item_name` varchar(128) NOT NULL DEFAULT '' COMMENT '用户所选选项快照',
  `deduct_amount` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '初评计算该项扣减金额',
  PRIMARY KEY (`id`),
  KEY `idx_order` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单用户初评问答快照表';

-- ----------------------------
-- 11. 订单质检报告表 (rc_order_inspection)
-- ----------------------------
DROP TABLE IF EXISTS `__PREFIX__rc_order_inspection`;
CREATE TABLE `__PREFIX__rc_order_inspection` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单专业质检复核报告表';

-- ----------------------------
-- 12. 资金打款流水表 (rc_payout_log)
-- ----------------------------
DROP TABLE IF EXISTS `__PREFIX__rc_payout_log`;
CREATE TABLE `__PREFIX__rc_payout_log` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '流水ID',
  `order_id` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '订单ID',
  `out_bill_no` varchar(64) NOT NULL DEFAULT '' COMMENT '商户唯一打款单据号(防重复幂等键)',
  `channel` varchar(32) NOT NULL DEFAULT 'wechat' COMMENT '打款渠道: wechat-微信商家转账到零钱, offline-线下对公转账',
  `amount` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '实际转账金额',
  `status` varchar(32) NOT NULL DEFAULT 'processing' COMMENT '状态: success-成功, fail-失败, processing-处理中',
  `transaction_id` varchar(128) NOT NULL DEFAULT '' COMMENT '微信支付单号或第三方凭证',
  `err_msg` varchar(255) NOT NULL DEFAULT '' COMMENT '失败原因说明',
  `created_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '打款触发时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_out_bill_no` (`out_bill_no`),
  KEY `idx_order` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='资金结算打款安全流水表';

-- ----------------------------
-- 13. 线下门店与网点自送表 (rc_store)
-- ----------------------------
DROP TABLE IF EXISTS `__PREFIX__rc_store`;
CREATE TABLE `__PREFIX__rc_store` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='线下门店与到店交投网点表';

-- ----------------------------
-- 15. 首页轮播 Banner 表 (rc_banner)
-- ----------------------------
DROP TABLE IF EXISTS `__PREFIX__rc_banner`;
CREATE TABLE `__PREFIX__rc_banner` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='首页轮播Banner广告表';

-- ----------------------------
-- 16. 文章与条款单页表 (rc_article)
-- ----------------------------
DROP TABLE IF EXISTS `__PREFIX__rc_article`;
CREATE TABLE `__PREFIX__rc_article` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文章与条款单页信息表';

-- ----------------------------
-- 17. 回收加价补贴券模板表 (rc_coupon)
-- ----------------------------
DROP TABLE IF EXISTS `__PREFIX__rc_coupon`;
CREATE TABLE `__PREFIX__rc_coupon` (
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
  `deleted_at` timestamp NULL DEFAULT NULL COMMENT '软删除时间戳',
  PRIMARY KEY (`id`),
  KEY `idx_status_sort` (`status`, `sort`),
  KEY `idx_auto_grant` (`is_auto_grant`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='回收加价补贴券模板表';

-- ----------------------------
-- 18. 用户领取的加价券资产明细表 (rc_user_coupon)
-- ----------------------------
DROP TABLE IF EXISTS `__PREFIX__rc_user_coupon`;
CREATE TABLE `__PREFIX__rc_user_coupon` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户加价补贴券卡包表';

-- ----------------------------
-- 预置行业通用基础数据
-- ----------------------------

-- 初始化官方首家线下服务旗舰总店
INSERT INTO `__PREFIX__rc_store` (`id`, `name`, `phone`, `address`, `business_hours`, `traffic_guide`, `status`, `sort`, `is_default`, `created_at`, `updated_at`) VALUES
(1, '启灵同城服务旗舰总店', '400-800-8888', '高新技术产业开发区科技大道88号综合回收服务大厦1层大厅', '周一至周日 09:00 - 21:00', '地铁直达/自驾前往提供专属临时停车位，到店现场快速验机结算', 1, 100, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP());

-- 初始化系统基础配置
INSERT INTO `__PREFIX__sys_config` (`group_name`, `config_key`, `config_value`, `remark`, `updated_at`) VALUES
('system', 'site_name', '启灵同城服务', '系统站点名称', UNIX_TIMESTAMP()),
('system', 'service_tel', '400-800-8888', '客服联系电话', UNIX_TIMESTAMP()),
('system', 'price_lock_days', '7', '下单估价锁定期(天)', UNIX_TIMESTAMP()),
('system', 'lingjian_ip_enabled', '1', '是否开启灵简IP归属地查询解析', UNIX_TIMESTAMP()),
('system', 'lingjian_ip_api_key', '', '灵简IP查询接口API密钥(X-API-Key)', UNIX_TIMESTAMP()),
('system', 'site_nav_menu', '', '前台自定义多级导航菜单JSON配置', UNIX_TIMESTAMP()),
('system', 'admin_entry_secret', '', '管理后台安全访问暗号(为空则保持默认直接访问)', UNIX_TIMESTAMP()),
('wechat', 'miniapp_appid', '', '微信小程序AppID', UNIX_TIMESTAMP()),
('wechat', 'miniapp_secret', '', '微信小程序AppSecret', UNIX_TIMESTAMP()),
('wechat', 'mch_id', '', '微信商户号', UNIX_TIMESTAMP()),
('wechat', 'mch_v3_key', '', '微信支付APIv3密钥', UNIX_TIMESTAMP()),
('payment', 'pay_dev_mock_enabled', '1', '开发测试极速模拟支付通道: 1-启用, 0-关闭', UNIX_TIMESTAMP()),
('payment', 'wechat_pay_enabled', '1', '微信支付收单总开关: 1-开启, 0-关闭', UNIX_TIMESTAMP()),
('payment', 'wechat_pay_mchid', '', '微信支付商户号(收单专享)', UNIX_TIMESTAMP()),
('payment', 'wechat_pay_appid', '', '微信支付关联AppID(收单专享)', UNIX_TIMESTAMP()),
('payment', 'wechat_pay_v3_key', '', '微信支付APIv3密钥(收单专享)', UNIX_TIMESTAMP()),
('payment', 'wechat_pay_cert_serial_no', '', '微信商户证书序列号(收单专享)', UNIX_TIMESTAMP()),
('payment', 'wechat_pay_private_key', '', '微信商户API私钥(收单专享)', UNIX_TIMESTAMP()),
('payment', 'wechat_pay_platform_public_key', '', '微信支付平台公钥/证书', UNIX_TIMESTAMP()),
('payment', 'alipay_pay_enabled', '1', '支付宝收单总开关: 1-开启, 0-关闭', UNIX_TIMESTAMP()),
('payment', 'alipay_pay_appid', '', '支付宝收单AppID', UNIX_TIMESTAMP()),
('payment', 'alipay_pay_sign_type', 'cert', '支付宝收单签名方式: cert/normal', UNIX_TIMESTAMP()),
('payment', 'alipay_pay_private_key', '', '支付宝收单应用私钥', UNIX_TIMESTAMP()),
('payment', 'alipay_pay_public_key', '', '支付宝收单公钥或公钥证书', UNIX_TIMESTAMP()),
('sf', 'sf_pay_method', '2', '顺丰运费付款方式: 1-寄方付(寄件人自付补贴), 2-收方付(到付/收方月结), 3-第三方付', UNIX_TIMESTAMP()),
('sf', 'sf_freight_tag', '运费补贴·推荐', '前台顺丰卡片展示标签', UNIX_TIMESTAMP()),
('sf', 'sf_freight_rule', '【平台寄送与运费承担规则说明】\n1. 顺丰上门取件：用户选择预约顺丰上门取件，系统将自动下发顺丰官方揽件预约，顺丰小哥将按约定时间携带专业包装上门验视取机。\n2. 运费承担与补贴政策：\n   - 订单经质检核验并最终达成一致成交的订单，平台承担寄件运费或按平台标准发放运费补贴（最高补贴25元，随最终回收款一并结清打款）；\n   - 若用户选择自行寄送，寄出后请在【我的回收订单】中录入快递单号，订单成交同样享受运费补贴政策。\n3. 运费自理特别说明：\n   - 若寄送物品为山寨仿冒机、严重名不符实、已被锁死无法解绑账号密码，或质检后用户拒绝方案要求退回的，往返寄送运费需由用户自行承担。', '平台寄送与运费补贴规则说明', UNIX_TIMESTAMP()),
('system', 'hero_mode', 'search', '首页首屏展示模式: search-极速搜索模式, banner-品牌画卷轮播模式', UNIX_TIMESTAMP()),
('system', 'hero_badge_enabled', '1', '首屏官方保障小徽章显隐: 1-显示, 0-隐藏', UNIX_TIMESTAMP()),
('system', 'hero_badge_text', '官方自营 · 顺丰免费上门 · 10秒快速估价 · 秒级放款到账', '首屏官方保障小徽章文案', UNIX_TIMESTAMP()),
('system', 'hero_title', '全品类高价回收 · 10秒快速估价', '首屏核心大标题', UNIX_TIMESTAMP()),
('system', 'hero_subtitle', '智能算法公允核价 · 顺丰免费上门包邮 · 隐私彻底粉碎无忧', '首屏利益点副标题', UNIX_TIMESTAMP()),
('system', 'hero_search_btn_text', '立即估价', '首屏主搜索按钮文案', UNIX_TIMESTAMP()),
('system', 'hero_hot_tags', '[{\"label\":\"iPhone 15 Pro\",\"keyword\":\"iPhone 15 Pro\"},{\"label\":\"Mate 60 Pro\",\"keyword\":\"Mate 60 Pro\"},{\"label\":\"小米 14\",\"keyword\":\"小米14\"},{\"label\":\"MacBook Pro\",\"keyword\":\"MacBook\"},{\"label\":\"iPad Pro\",\"keyword\":\"iPad\"}]', '首屏热门搜索词列表JSON', UNIX_TIMESTAMP()),
('system', 'hero_metrics', '[{\"icon\":\"bag\",\"val\":\"120万+\",\"lbl\":\"累计完成回收\"},{\"icon\":\"clock\",\"val\":\"10秒\",\"lbl\":\"智能公允测算\"},{\"icon\":\"truck\",\"val\":\"0元\",\"lbl\":\"顺丰双向保价包邮\"},{\"icon\":\"shield\",\"val\":\"100%\",\"lbl\":\"隐私深度粉碎销毁\"}]', '首屏核心保障承诺指标JSON', UNIX_TIMESTAMP()),
('system', 'hero_banner_autoplay', '4', 'Banner自动轮播间隔秒数', UNIX_TIMESTAMP()),
('system', 'hero_banner_floating_estimate', '1', 'Banner轮播模式下是否嵌入悬浮快速估价卡片', UNIX_TIMESTAMP()),
('system', 'footer_desc', '官方直营全品类数字化回收服务平台。智能算法精准核价，顺丰免费上门包邮，专业质检秒级放款，隐私深度粉碎销毁，致力共创安全、透明、绿色的循环生态。', '前台底部品牌愿景口号与循环倡导简介', UNIX_TIMESTAMP()),
('system', 'footer_service_tel', '400-800-8888', '底部客服热线', UNIX_TIMESTAMP()),
('system', 'footer_service_time', '周一至周日 09:00 - 21:00 (节假日不休)', '底部客服在线接待时间', UNIX_TIMESTAMP()),
('system', 'footer_service_email', 'service@qilingrecycle.com', '官方客服/商务邮箱', UNIX_TIMESTAMP()),
('system', 'footer_address', '深圳市南山区粤海街道高新南一道科兴科学园B座302室', '总部及质检收件中心详细地址', UNIX_TIMESTAMP()),
('system', 'footer_qrcode_wechat', '/uploads/default/site_logo.svg', '专属客服微信二维码图片URL', UNIX_TIMESTAMP()),
('system', 'footer_qrcode_wechat_title', '微信扫码 · 专属客服 1对1', '专属客服微信二维码下方标题', UNIX_TIMESTAMP()),
('system', 'footer_qrcode_mp', '', '官方公众号/小程序二维码图片URL', UNIX_TIMESTAMP()),
('system', 'footer_qrcode_mp_title', '关注官方公众号 · 获取最新行情', '官方公众号二维码下方标题', UNIX_TIMESTAMP());

-- 初始化首页轮播 Banner 示例
INSERT INTO `__PREFIX__rc_banner` (`id`, `title`, `subtitle`, `badge`, `image_pc`, `image_m`, `link_type`, `link_value`, `btn_text`, `sort_order`, `status`, `created_at`, `updated_at`) VALUES
(1, '全品类高价回收 · 官方直营更放心', '智能算法公允核价 · 顺丰免费上门包邮 · 隐私深度粉碎销毁', '官方保障', '/uploads/default/banner_digital.svg', '/uploads/default/banner_digital.svg', 'category', '1', '立即估价', 10, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
(2, '废旧物资再生 · 绿色循环倡导者', '废铜废铝废钢 · 电缆电线 · 动力电池 · 上门过磅结算', '环保再生', '/uploads/default/banner_scrap.svg', '/uploads/default/banner_scrap.svg', 'action', 'appointment', '一键呼叫上门', 20, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
(3, '名表黄金奢侈品 · 权威鉴定高额变现', '足金999按日实时结算 · 瑞士名表大牌箱包 · 顺丰保价密封', '尊享质检', '/uploads/default/banner_luxury.svg', '/uploads/default/banner_luxury.svg', 'category', '4', '实时金价换算', 30, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP());

-- 初始化系统预置核心法务条款与回收指南单页 (开箱即用)
INSERT INTO `__PREFIX__rc_article` (`id`, `title`, `slug`, `category`, `summary`, `content`, `cover_image`, `is_footer`, `footer_column`, `is_hot`, `view_count`, `sort_order`, `status`, `created_at`, `updated_at`) VALUES
(1, '免责声明与服务规范', 'disclaimer', 'about', '关于平台估价、商品成色判定、法务所有权与不可抗力等权责明确说明。', '<h3>一、 物品来源合法性与权属承诺</h3>\n<p>用户在启灵同城服务平台提交任何二手设备或闲置物资回收订单前，必须保证交售物品拥有完整、合法的处分权与所有权，严禁交售任何通过盗窃、抢劫、诈骗、走私等非法途径获取的赃物。若经质检或公安机关核查属于涉案物品，平台有权直接扣押设备、冻结订单并移交司法机关追究刑事责任。</p>\n<h3>二、 回收价格与市场行情波动免责</h3>\n<p>二手回收行业价格受上游元器件行情、供应链变动及市场供需影响。平台系统估价基于智能估价算法与用户当前自选属性即时生成，且提供最长7天的保价锁定期。若因用户在保价期外寄出、实际机况与勾选严重不符，质检工程师将出具权威复检报告并给出二次核验公允价。若用户不同意二次报价，可随时申请原件无条件退回。</p>\n<h3>三、 山寨高仿与防盗网络锁机</h3>\n<p>对于存在“山寨机”、“高仿假货”、“激活锁/查找锁未退出”的设备，由于无法进行正常系统抹除与合法流转，平台将无法受理回收，相关往返运费需由寄件方全额自行承担。</p>', '', 1, 'about', 0, 128, 10, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
(2, '用户服务与交易协议', 'user-agreement', 'about', '规范用户在平台进行二手估价、下单预约、寄件交付及资金结算的权利与义务。', '<h3>一、 协议生效与适用范围</h3>\n<p>欢迎使用启灵同城服务平台。当您勾选本协议并点击“提交订单”或“立即估价”时，即表示您已充分阅读、理解并自愿接受本协议全部条款约束。</p>\n<h3>二、 预约交割与履约方式</h3>\n<p>1. <strong>免费上门服务</strong>：在已开通上门覆盖的城市区域，官方质检工程师将按照您预约的时间准时上门，当面验机过磅、现场出具报告并秒级放款结清。</p>\n<p>2. <strong>顺丰快速寄送</strong>：下单后系统自动为您预约顺丰小哥上门取件，顺丰运费按平台补贴政策统一结算，运单轨迹实时同步更新。</p>\n<p>3. <strong>线下门店自送</strong>：您亦可携带物品前往本平台直营或合作门店交投，现场人工验货立等结算。</p>\n<h3>三、 质检与结算规则</h3>\n<p>平台承诺收货后24小时内由专业质检中心完成全方位复核。质检过程全程录像存证，确保公正透明。复检结果与初评一致的，系统立即通过您指定的收款方式极速打款。</p>', '', 1, 'about', 0, 256, 20, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
(3, '用户隐私与安全政策', 'privacy-policy', 'about', '我们如何保护您的个人信息，以及我们采用的数据底层粉碎与清除技术承诺。', '<h3>一、 个人隐私数据深度粉碎承诺</h3>\n<p>启灵同城服务高度重视用户的个人隐私与数字资产安全。所有成交入库的手机、平板、电脑等存储介质设备，均统一送入符合国际 ACI 数据安全标准的无尘数据销毁中心，采用符合美国 DoD 5220.22-M 规范的“多轮物理全盘覆写技术”进行不可逆深度粉碎销毁，确保照片、聊天记录、账号密码、通话记录等任何数据绝无被恢复可能。</p>\n<h3>二、 个人信息收集与最小化原则</h3>\n<p>我们仅收集您在下单时必要的基础信息（如姓名、联系电话、取件地址与收款账号），用于物流预约与货款自动结算。我们承诺不会将您的个人隐私信息向任何第三方商业机构或广告商出售、转让或出租。</p>', '', 1, 'about', 0, 312, 30, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
(4, '关于我们与资质荣誉', 'about-us', 'about', '专注全品类数字化绿色循环回收，致力于建立透明、公允、高价的回收服务生态。', '<h3>平台简介</h3>\n<p>启灵同城服务是国内领先的全品类数字化循环经济回收服务平台，业务涵盖智能手机、数码3C、废旧金属、家电重货、再生资源与奢侈名表黄金等多个行业品类。平台以“让闲置变资产，让绿色成习惯”为企业使命，通过自研的智能估价算法、透明质检体系与极速秒级放款链路，为广大个人用户和企业客户提供专业、安心、高价的回收服务。</p>\n<h3>核心服务保障</h3>\n<p>1. <strong>官方直营质检</strong>：杜绝中间商层层压价，自主运营标准化质检中心与工程师团队；</p>\n<p>2. <strong>全国顺丰包邮</strong>：携手顺丰速运深度 API 直连，上门取件、全程保价、运费补贴；</p>\n<p>3. <strong>隐私彻底销毁</strong>：国家网安认证，国际标准数据粉碎抹除，出具正规销毁报告；</p>\n<p>4. <strong>确认极速放款</strong>：质检确认无误后，微信零钱/支付宝/银行卡自动秒级放款到账。</p>', '', 1, 'about', 0, 520, 40, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
(5, '顺丰包邮与寄送指南', 'sf-guide', 'guide', '顺丰快速寄送交割全流程说明：小哥上门取件、设备安全打包与运费补贴规则。', '<h3>一、 顺丰小哥上门取件流程</h3>\n<p>1. <strong>在线下单预约</strong>：在前台选择“快速寄送”提交订单后，系统将自动通过顺丰丰桥 API 将订单指派给您所在辖区的顺丰小哥；</p>\n<p>2. <strong>小哥联系取件</strong>：顺丰小哥将在半小时内与您电话确认上门取件时间；</p>\n<p>3. <strong>专用包装密封</strong>：小哥将自带顺丰专业防震气泡袋与安全封条，现场完成称重密封封箱。</p>\n<h3>二、 寄送前的重要准备工作</h3>\n<p>1. <strong>退出账号密码与锁机码</strong>：请务必退出 Apple ID / 华为账号 / 小米账号 / 锁屏密码；</p>\n<p>2. <strong>自行备份重要资料</strong>：因平台质检入库后将对设备进行底层深度粉碎抹除，请提前做好重要数据备份；</p>\n<p>3. <strong>原装配件随箱附赠</strong>：若有原装包装盒、充电器等配件，请一并随箱寄出以获得更高质检溢价。</p>', '', 1, 'guide', 1, 890, 10, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
(6, '质检评级与放款细则', 'inspection-rules', 'guide', '全透明质检定级标准、无拆修判定与确认后极速秒级放款到账机制。', '<h3>一、 专业质检流程与录像存证</h3>\n<p>仓库收货签收后，由质检中心在专业防静电无尘工作台进行全面功能测试，开箱验机与检测全程高清录像存证。检测范围包括但不限于：屏幕显示触控、电池健康寿命、摄像头变焦防抖、主板芯片有无进水受潮、外壳边框划痕磕碰等40余项精密检测指标。</p>\n<h3>二、 秒级极速放款规则</h3>\n<p>1. 复检机况与用户初评一致的，系统自动秒级打款；</p>\n<p>2. 若成色存在轻微出入，工程师出具包含实拍高清图文的质检报告，并在用户个人中心推送协商确认；</p>\n<p>3. 用户点击【确认成交】后，资金通过支付宝单笔转账或微信支付商家转账即刻到达您的个人钱包。</p>', '', 1, 'guide', 0, 674, 20, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP());

-- 初始化常用回收品类
INSERT INTO `__PREFIX__rc_category` (`id`, `name`, `icon`, `sort`, `is_show`, `created_at`) VALUES
(1, '手机数码', '/uploads/default/cat_phone.png', 100, 1, UNIX_TIMESTAMP()),
(2, '平板电脑', '/uploads/default/cat_pad.png', 90, 1, UNIX_TIMESTAMP()),
(3, '笔记本电脑', '/uploads/default/cat_laptop.png', 80, 1, UNIX_TIMESTAMP()),
(4, '摄影摄像', '/uploads/default/cat_camera.png', 70, 1, UNIX_TIMESTAMP()),
(5, '智能穿戴', '/uploads/default/cat_watch.png', 60, 1, UNIX_TIMESTAMP());

-- 初始化核心主流品牌
INSERT INTO `__PREFIX__rc_brand` (`id`, `category_id`, `name`, `logo`, `first_letter`, `sort`, `is_hot`, `created_at`) VALUES
(1, 1, 'Apple / 苹果', '/uploads/default/brand_apple.png', 'A', 100, 1, UNIX_TIMESTAMP()),
(2, 1, 'HUAWEI / 华为', '/uploads/default/brand_huawei.png', 'H', 90, 1, UNIX_TIMESTAMP()),
(3, 1, 'Xiaomi / 小米', '/uploads/default/brand_xiaomi.png', 'X', 80, 1, UNIX_TIMESTAMP()),
(4, 1, 'OPPO', '/uploads/default/brand_oppo.png', 'O', 70, 0, UNIX_TIMESTAMP()),
(5, 1, 'vivo', '/uploads/default/brand_vivo.png', 'V', 60, 0, UNIX_TIMESTAMP()),
(6, 1, 'Honor / 荣耀', '/uploads/default/brand_honor.png', 'H', 50, 0, UNIX_TIMESTAMP()),
(7, 2, 'Apple iPad', '/uploads/default/brand_apple.png', 'A', 100, 1, UNIX_TIMESTAMP()),
(8, 2, 'HUAWEI / 华为平板', '/uploads/default/brand_huawei.png', 'H', 90, 1, UNIX_TIMESTAMP()),
(9, 3, 'Apple MacBook', '/uploads/default/brand_apple.png', 'A', 100, 1, UNIX_TIMESTAMP()),
(10, 3, 'Lenovo / 联想', '/uploads/default/brand_lenovo.png', 'L', 90, 1, UNIX_TIMESTAMP()),
(11, 4, 'Sony / 索尼相机', '/uploads/default/brand_sony.png', 'S', 100, 1, UNIX_TIMESTAMP()),
(12, 4, 'Canon / 佳能相机', '/uploads/default/brand_canon.png', 'C', 90, 1, UNIX_TIMESTAMP()),
(13, 5, 'Apple Watch', '/uploads/default/brand_apple.png', 'A', 100, 1, UNIX_TIMESTAMP()),
(14, 5, 'HUAWEI Watch', '/uploads/default/brand_huawei.png', 'H', 90, 1, UNIX_TIMESTAMP());

-- 初始化主流热门回收机型
INSERT INTO `__PREFIX__rc_device` (`id`, `category_id`, `brand_id`, `name`, `cover_img`, `guide_price`, `sort`, `is_hot`, `status`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 'iPhone 15 Pro Max', '/uploads/default/dev_ip15promax.png', 6800.00, 100, 1, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
(2, 1, 1, 'iPhone 15 Pro', '/uploads/default/dev_ip15pro.png', 5800.00, 95, 1, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
(3, 1, 1, 'iPhone 14 Pro Max', '/uploads/default/dev_ip14promax.png', 4800.00, 90, 1, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
(4, 1, 2, 'HUAWEI Mate 60 Pro', '/uploads/default/dev_mate60pro.png', 5200.00, 85, 1, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
(5, 1, 3, 'Xiaomi 14 Ultra', '/uploads/default/dev_mi14u.png', 4500.00, 80, 1, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
(6, 2, 7, 'iPad Pro 11寸 M4版', '/uploads/default/dev_ipadpro.png', 5600.00, 100, 1, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
(7, 2, 8, 'HUAWEI MatePad Pro 13.2', '/uploads/default/dev_matepad.png', 4200.00, 90, 1, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
(8, 3, 9, 'MacBook Pro 16寸 M3 Max', '/uploads/default/dev_mbp16.png', 14500.00, 100, 1, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
(9, 3, 10, 'ThinkPad X1 Carbon', '/uploads/default/dev_thinkpad.png', 6200.00, 90, 1, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
(10, 4, 11, 'Sony A7M4 微单机身', '/uploads/default/dev_a7m4.png', 11800.00, 100, 1, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
(11, 4, 12, 'Canon EOS R6 Mark II', '/uploads/default/dev_r6m2.png', 12500.00, 90, 1, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
(12, 5, 13, 'Apple Watch Ultra 2', '/uploads/default/dev_watchultra2.png', 3800.00, 100, 1, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
(13, 5, 14, 'HUAWEI Watch GT 4', '/uploads/default/dev_watchgt4.png', 1100.00, 90, 1, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP());

-- 初始化常用手机问答评估模板
INSERT INTO `__PREFIX__rc_question` (`id`, `category_id`, `title`, `sub_title`, `type`, `is_required`, `sort`, `created_at`) VALUES
(1, 1, '存储容量', '请在手机【设置-关于本机】中确认', 'radio', 1, 100, UNIX_TIMESTAMP()),
(2, 1, '机身外观与边框', '裸机观察四周边框与背板', 'radio', 1, 90, UNIX_TIMESTAMP()),
(3, 1, '屏幕显示与外观', '亮屏白底观察是否有划痕或色斑', 'radio', 1, 80, UNIX_TIMESTAMP()),
(4, 1, '维修与拆机史', '是否曾在官方或第三方维修', 'radio', 1, 70, UNIX_TIMESTAMP()),
(5, 1, '功能与电池状态', '指纹/面容/无线/电池健康度', 'radio', 1, 60, UNIX_TIMESTAMP());

-- 初始化选项与扣减规则
INSERT INTO `__PREFIX__rc_question_item` (`question_id`, `name`, `desc_text`, `deduct_type`, `deduct_value`, `is_fault`, `sort`, `created_at`) VALUES
(1, '1TB', '大容量加价', 'fixed', 0.00, 0, 100, UNIX_TIMESTAMP()),
(1, '512GB', '标准大容量', 'fixed', -400.00, 0, 90, UNIX_TIMESTAMP()),
(1, '256GB', '主流容量', 'fixed', -800.00, 0, 80, UNIX_TIMESTAMP()),
(1, '128GB', '基础容量', 'fixed', -1200.00, 0, 70, UNIX_TIMESTAMP()),

(2, '充新 / 完美无任何痕迹', '机身如新，无任何掉漆划伤', 'fixed', 0.00, 0, 100, UNIX_TIMESTAMP()),
(2, '轻微使用痕迹', '细小反光微痕，无磕碰凹陷', 'fixed', -150.00, 1, 90, UNIX_TIMESTAMP()),
(2, '有明显磕碰 / 掉漆', '边角有撞击凹陷或大面积掉漆', 'fixed', -350.00, 1, 80, UNIX_TIMESTAMP()),
(2, '机身弯曲 / 后盖碎裂', '后盖玻璃开裂或机身变形', 'fixed', -600.00, 1, 70, UNIX_TIMESTAMP()),

(3, '完美无划痕 / 显示正常', '屏幕通透无微痕，显示无斑', 'fixed', 0.00, 0, 100, UNIX_TIMESTAMP()),
(3, '细微划痕 / 亮屏不可见', '仅息屏强光可见细微发丝划痕', 'fixed', -180.00, 1, 90, UNIX_TIMESTAMP()),
(3, '屏幕划伤 / 亮屏可见', '指甲可刮到，或有多处明显刮痕', 'fixed', -400.00, 1, 80, UNIX_TIMESTAMP()),
(3, '外屏碎裂 / 内屏完好', '玻璃开裂但触摸与显示正常', 'fixed', -800.00, 1, 70, UNIX_TIMESTAMP()),
(3, '内屏损坏 / 漏液横线老化', '屏幕有黑斑/横竖彩线/频闪', 'fixed', -1600.00, 1, 60, UNIX_TIMESTAMP()),

(4, '全原装 / 无拆无修', '各部件均为原厂，防拆标完好', 'fixed', 0.00, 0, 100, UNIX_TIMESTAMP()),
(4, '官方售后维修过', 'Apple直营店或官方授权维修', 'fixed', -200.00, 1, 90, UNIX_TIMESTAMP()),
(4, '第三方拆机维修', '曾更换副厂屏/副厂电池/小修', 'fixed', -500.00, 1, 80, UNIX_TIMESTAMP()),
(4, '主板严重维修 / 进水', '主板飞线/焊接/防水标变红', 'fixed', -1500.00, 1, 70, UNIX_TIMESTAMP()),

(5, '全部功能正常 / 电池≥85%', '各项功能完好，电池耐用', 'fixed', 0.00, 0, 100, UNIX_TIMESTAMP()),
(5, '电池健康度低于80%', '系统提示维修或电池鼓包', 'fixed', -180.00, 1, 90, UNIX_TIMESTAMP()),
(5, '面容/指纹失效', '无法录入或识别生物特征', 'fixed', -450.00, 1, 80, UNIX_TIMESTAMP()),
(5, '摄像头抖动/黑屏/斑点', '拍照有污斑或无法对焦', 'fixed', -500.00, 1, 70, UNIX_TIMESTAMP());

-- 初始化官方推荐加价补贴券
INSERT INTO `__PREFIX__rc_coupon` (`id`, `title`, `sub_title`, `type`, `amount`, `max_amount`, `min_estimate_price`, `category_id`, `valid_days`, `total_count`, `received_count`, `used_count`, `is_auto_grant`, `status`, `sort`, `created_at`, `updated_at`) VALUES
(1, '新人首单极速加价礼包', '首单立享加价补贴，全品类无门槛通用', 'fixed', 15.00, 0.00, 50.00, 0, 14, 9999, 0, 0, 1, 1, 100, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
(2, '数码高价回收翻倍券', '数码手机专属，满1000立加60元', 'fixed', 60.00, 0.00, 1000.00, 1, 7, 5000, 0, 0, 1, 1, 90, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
(3, '大额回收尊享补贴券', '全场满3000立加180元现金', 'fixed', 180.00, 0.00, 3000.00, 0, 7, 2000, 0, 0, 0, 1, 80, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
(4, '黄金奢品专享增值券', '高客单回收加价3%，最高补贴300元', 'percent', 3.00, 300.00, 2000.00, 0, 15, 1000, 0, 0, 0, 1, 70, UNIX_TIMESTAMP(), UNIX_TIMESTAMP());

-- ----------------------------
-- 19. 同城综合生活服务分类表 (rc_service_category)
-- ----------------------------
DROP TABLE IF EXISTS `__PREFIX__rc_service_category`;
CREATE TABLE `__PREFIX__rc_service_category` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '分类ID',
  `name` varchar(64) NOT NULL DEFAULT '' COMMENT '服务分类名称',
  `biz_type` varchar(32) NOT NULL DEFAULT 'service' COMMENT '所属大板块: service-上门服务, errand-同城跑腿',
  `icon` varchar(255) NOT NULL DEFAULT '' COMMENT '分类图标URL',
  `sort` int(11) NOT NULL DEFAULT '0' COMMENT '排序权重(越大越前)',
  `is_show` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否展示: 1-显示, 0-隐藏',
  `created_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '创建时间',
  `updated_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_biz_show` (`biz_type`, `is_show`, `sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='同城服务分类表';

-- ----------------------------
-- 20. 同城生活服务项目主表 (rc_service_item)
-- ----------------------------
DROP TABLE IF EXISTS `__PREFIX__rc_service_item`;
CREATE TABLE `__PREFIX__rc_service_item` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '项目ID',
  `category_id` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '所属分类ID',
  `biz_type` varchar(32) NOT NULL DEFAULT 'service' COMMENT '所属业务板块: service-上门服务, errand-同城跑腿',
  `title` varchar(128) NOT NULL DEFAULT '' COMMENT '服务项目名称',
  `sub_title` varchar(255) NOT NULL DEFAULT '' COMMENT '副标题/服务卖点摘要',
  `cover_image` varchar(255) NOT NULL DEFAULT '' COMMENT '封面头图URL',
  `banner_images` text NULL COMMENT '多图轮播相册JSON',
  `price` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '基础展示起步价',
  `original_price` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '市场划线参考原价',
  `price_unit` varchar(32) NOT NULL DEFAULT '次' COMMENT '计价单位: 次, 小时, 台, ㎡, 单',
  `pricing_type` varchar(32) NOT NULL DEFAULT 'fixed' COMMENT '定价方式: fixed-一口价, spec-多规格阶梯价, deposit-预约意向定金',
  `service_duration` int(11) NOT NULL DEFAULT '60' COMMENT '预计服务耗时(分钟)',
  `guarantee_tags` varchar(255) NOT NULL DEFAULT '' COMMENT '官方服务保障标签逗号分隔',
  `notice_tips` text NULL COMMENT '服务须知与预约规则',
  `content_detail` longtext NULL COMMENT '服务详情图文/作业流程',
  `sales_count` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '累计服务单数',
  `is_hot` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否精选热门推荐',
  `status` tinyint(1) NOT NULL DEFAULT '1' COMMENT '状态: 1-上架营业中, 0-已下架',
  `sort` int(11) NOT NULL DEFAULT '0' COMMENT '排序权重',
  `created_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '创建时间',
  `updated_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_cat_status` (`category_id`, `status`, `sort`),
  KEY `idx_biz_status` (`biz_type`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='同城生活服务项目表';

-- ----------------------------
-- 21. 服务规格与加项表 (rc_service_spec)
-- ----------------------------
DROP TABLE IF EXISTS `__PREFIX__rc_service_spec`;
CREATE TABLE `__PREFIX__rc_service_spec` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '规格ID',
  `service_id` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '关联服务项目ID',
  `spec_name` varchar(128) NOT NULL DEFAULT '' COMMENT '规格/套餐名',
  `spec_price` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '该规格独立价格',
  `spec_unit` varchar(32) NOT NULL DEFAULT '' COMMENT '该规格计价单位',
  `spec_desc` varchar(255) NOT NULL DEFAULT '' COMMENT '规格说明/适用场景',
  `sort` int(11) NOT NULL DEFAULT '0' COMMENT '排序权重',
  `is_default` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否为默认选中规格: 1-是, 0-否',
  `status` tinyint(1) NOT NULL DEFAULT '1' COMMENT '状态: 1-启用, 0-停用',
  `created_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_service` (`service_id`, `status`, `sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='服务规格与加项表';

-- 初始化同城生活服务分类
INSERT INTO `__PREFIX__rc_service_category` (`id`, `name`, `biz_type`, `icon`, `sort`, `is_show`, `created_at`, `updated_at`) VALUES
(1, '家电清洗', 'service', '/uploads/default/icon_cleaning.svg', 100, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
(2, '家庭保洁', 'service', '/uploads/default/icon_housekeep.svg', 90, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
(3, '上门维修', 'service', '/uploads/default/icon_repair.svg', 80, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
(4, '宠物生活', 'service', '/uploads/default/icon_pet.svg', 70, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
(5, '同城跑腿', 'errand',  '/uploads/default/icon_errand.svg', 60, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP());

-- 初始化同城生活服务项目
INSERT INTO `__PREFIX__rc_service_item` (`id`, `category_id`, `biz_type`, `title`, `sub_title`, `cover_image`, `banner_images`, `price`, `original_price`, `price_unit`, `pricing_type`, `service_duration`, `guarantee_tags`, `notice_tips`, `content_detail`, `sales_count`, `is_hot`, `status`, `sort`, `created_at`, `updated_at`) VALUES
(1, 1, 'service', '油烟机全拆深度高温蒸洗', '140℃高温蒸气灭菌 · 顽固油垢全溶解 · 试机验收', '/uploads/default/service_hood.svg', '[\"/uploads/default/service_hood.svg\"]', 129.00, 169.00, '台', 'spec', 90, '官方认证师傅,不满意重洗,损坏包赔,无隐形收费', '请确保现场水电畅通；若油烟机年久老化严重无法正常拆装，师傅现场告知并协商免拆清洗方案。', '<p>专业师傅携带专业高温蒸汽机上门作业，全方位分解陈年油垢，高温杀菌除味，还您洁净厨房。</p>', 328, 1, 1, 100, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
(2, 2, 'service', '日常家庭深度保洁 (4小时整屋)', '全屋分区专布专用 · 边角除尘 · 厨房卫浴深度清洁', '/uploads/default/service_clean.svg', '[\"/uploads/default/service_clean.svg\"]', 169.00, 219.00, '次', 'spec', 240, '实名认证阿姨,全套专业工具,迟到必赔,清洁不满意免单', '服务范围不含室外外墙高空擦窗、古董字画及拆洗重度油污电器；请预先妥善保管贵重首饰现金。', '<p>标准4小时保洁服务，涵盖客餐厅、卧室、厨房表面油污擦拭、卫生间水垢除菌及地面深度清拖。</p>', 582, 1, 1, 90, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
(3, 4, 'service', '专业上门遛狗陪伴 (30分钟)', '实时GPS运动轨迹打卡 · 随身捡便袋 · 擦爪喂水', '/uploads/default/service_dog.svg', '[\"/uploads/default/service_dog.svg\"]', 49.00, 69.00, '次', 'spec', 30, '实名宠托师,全程轨迹留痕,佩戴防暴冲牵引,意外医疗保障', '仅限已注射狂犬疫苗的健康犬只；如犬只有护食、暴冲攻击倾向请提前告知并配备安全嘴套。', '<p>专业持证宠托师上门，按时牵遛爱宠，草坪漫步排便排气，作业全程视频照片实时回传主人。</p>', 216, 1, 1, 80, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
(4, 3, 'service', '家庭管道疏通/漏水排障', '专业疏通机/内窥镜探查 · 快速上门 · 疏通不成功不收费', '/uploads/default/service_pipe.svg', '[\"/uploads/default/service_pipe.svg\"]', 88.00, 120.00, '次', 'fixed', 45, '急速上门,明码标价,修不好不收钱,质保90天', '基础费包含30分钟内常规机械疏通；如需管道更换或高压水车疏通，师傅勘测后出具透明报价由客户确认后再施工。', '<p>解决地漏返水、马桶堵塞、下水道不畅等突发状况，专业机械设备高效通畅。</p>', 412, 1, 1, 70, UNIX_TIMESTAMP(), UNIX_TIMESTAMP());

-- 初始化生活服务规格细项
INSERT INTO `__PREFIX__rc_service_spec` (`id`, `service_id`, `spec_name`, `spec_price`, `spec_unit`, `spec_desc`, `sort`, `is_default`, `status`, `created_at`) VALUES
(1, 1, '侧吸式/中式油烟机 (1台)', 129.00, '台', '适合常规侧吸或老式中式油烟机', 10, 1, 1, UNIX_TIMESTAMP()),
(2, 1, '欧式/顶吸式油烟机 (1台)', 149.00, '台', '适合常规T型、塔型顶吸油烟机', 9, 0, 1, UNIX_TIMESTAMP()),
(3, 1, '集成灶深度拆洗 (1台)', 199.00, '台', '包含下排风道、集油盒与灶台全套清洗', 8, 0, 1, UNIX_TIMESTAMP()),
(4, 2, '2小时基础保洁 (中小户型/局部)', 99.00, '次', '适合 50㎡ 以下或局部区域保洁', 10, 0, 1, UNIX_TIMESTAMP()),
(5, 2, '3小时深度保洁 (两居室标准)', 139.00, '次', '适合 50-80㎡ 居室整屋擦拭打扫', 9, 0, 1, UNIX_TIMESTAMP()),
(6, 2, '4小时整屋深度大扫除 (三居室推荐)', 169.00, '次', '适合 80-120㎡ 居室全屋深度保洁', 8, 1, 1, UNIX_TIMESTAMP()),
(7, 3, '小型犬遛狗 (10kg以下)', 49.00, '次', '如柯基、泰迪、比熊、雪纳瑞', 10, 1, 1, UNIX_TIMESTAMP()),
(8, 3, '中型犬遛狗 (10-25kg)', 69.00, '次', '如柴犬、边牧、萨摩耶、哈士奇', 9, 0, 1, UNIX_TIMESTAMP()),
(9, 3, '大型犬遛狗 (25kg以上)', 89.00, '次', '如金毛、拉布拉多、阿拉斯加、巨贵', 8, 0, 1, UNIX_TIMESTAMP());

-- ----------------------------
-- 22. 同城生活服务师傅档案表 (rc_technician)
-- ----------------------------
DROP TABLE IF EXISTS `__PREFIX__rc_technician`;
CREATE TABLE `__PREFIX__rc_technician` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '师傅ID',
  `user_id` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '绑定的前台会员用户ID',
  `name` varchar(64) NOT NULL DEFAULT '' COMMENT '师傅实名姓名',
  `mobile` varchar(20) NOT NULL DEFAULT '' COMMENT '师傅联系手机号',
  `avatar` varchar(255) NOT NULL DEFAULT '/uploads/default/avatar_default.svg' COMMENT '师傅实名头像URL',
  `id_card` varchar(32) NOT NULL DEFAULT '' COMMENT '身份证号码',
  `service_types` varchar(255) NOT NULL DEFAULT 'service,errand' COMMENT '承接业务类型逗号分隔',
  `service_categories` varchar(255) NOT NULL DEFAULT '' COMMENT '承接服务分类ID列表逗号分隔',
  `city_name` varchar(64) NOT NULL DEFAULT '深圳市' COMMENT '常驻服务城市',
  `district_name` varchar(128) NOT NULL DEFAULT '全城服务' COMMENT '主要服务区域/商圈',
  `star_rating` decimal(3,2) NOT NULL DEFAULT '5.00' COMMENT '星级信誉评分',
  `order_count` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '累计完工单数',
  `deposit_balance` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '履约保证金金额',
  `status` tinyint(1) NOT NULL DEFAULT '1' COMMENT '认证审核状态: 0-待审核, 1-已认证在职, 2-已冻结/未通过',
  `is_online` tinyint(1) NOT NULL DEFAULT '1' COMMENT '接单开工状态: 1-出车接单中, 0-收工休息中',
  `audit_remark` varchar(255) NOT NULL DEFAULT '' COMMENT '审核备注/驳回说明',
  `created_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '入驻时间',
  `updated_at` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_mobile` (`mobile`),
  KEY `idx_status_online` (`status`, `is_online`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='同城生活服务师傅/技师档案表';

-- 初始化示例金牌师傅档案
INSERT INTO `__PREFIX__rc_technician` (`id`, `user_id`, `name`, `mobile`, `avatar`, `id_card`, `service_types`, `service_categories`, `city_name`, `district_name`, `star_rating`, `order_count`, `deposit_balance`, `status`, `is_online`, `audit_remark`, `created_at`, `updated_at`) VALUES
(1, 1, '张建国 (金牌师傅)', '13800138000', '/uploads/default/avatar_default.svg', '440301198501010000', 'service,errand,recycle', '1,2,3,4,5', '深圳市', '南山区,福田区,宝安区', 5.00, 156, 1000.00, 1, 1, '官方自营特约金牌认证师傅', UNIX_TIMESTAMP(), UNIX_TIMESTAMP());

SET FOREIGN_KEY_CHECKS = 1;