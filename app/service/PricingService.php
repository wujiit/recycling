<?php
/**
 * 估价规则引擎
 * 核心逻辑：
 * 1. 基础指导价 - ∑(固定扣减金额) - (基础价 × ∑扣减百分比) + 促销加价
 * 2. 兜底保障机制：严重损坏机型保留最低残值底价 (默认 50 元)，防止算成负数
 * 3. 估价规则缓存读取：高并发估价性能保障
 */

namespace App\Service;

use App\Model\DeviceModel;
use App\Model\QuestionModel;

class PricingService
{
    private $deviceModel;
    private $questionModel;
    private $cache;

    public function __construct()
    {
        $this->deviceModel = new DeviceModel();
        $this->questionModel = new QuestionModel();
        $this->cache = CacheService::getInstance();
    }

    /**
     * 获取机型完整问答估价树 (支持 Redis 隔离缓存，毫秒响应)
     */
    public function getDeviceAppraisalMatrix(int $deviceId): ?array
    {
        $device = $this->deviceModel->getDeviceById($deviceId);
        if (!$device || (int)$device['status'] !== 1) {
            return null;
        }

        $cacheKey = 'device_matrix:' . $deviceId;
        $cachedMatrix = $this->cache->get($cacheKey);
        if ($cachedMatrix !== null) {
            return $cachedMatrix;
        }

        $categoryId = (int)$device['category_id'];
        $matrix = $this->questionModel->getFullQuestionMatrix($categoryId, $deviceId);

        $quickTiers = $this->getQuickTiers((float)$device['guide_price'], $categoryId);

        $result = [
            'device'   => [
                'id'          => (int)$device['id'],
                'name'        => $device['name'],
                'brand_name'  => $device['brand_name'] ?? '',
                'cover_img'   => $device['cover_img'],
                'guide_price' => (float)$device['guide_price'],
                'unit'        => $device['unit'] ?? '台',
            ],
            'quick_tiers'   => $quickTiers,
            'question_tree' => $matrix
        ];

        // 缓存 1 小时
        $this->cache->set($cacheKey, $result, 3600);
        return $result;
    }

    /**
     * 生成极速估价核心成色档位列表 (双模式估价之懒人档)
     */
    public function getQuickTiers(float $guidePrice, int $categoryId = 0): array
    {
        if ($guidePrice <= 0) {
            $guidePrice = 1.0;
        }

        // 计算底线残值保底
        if ($guidePrice <= 50.00) {
            $floorPrice = min($guidePrice, max(1.00, round($guidePrice * 0.05, 2)));
        } else {
            $floorPrice = min($guidePrice, max(10.00, round($guidePrice * 0.05, 2)));
        }

        $tier99Price = max($floorPrice, round($guidePrice * 0.93, 2));
        $tier95Price = max($floorPrice, round($guidePrice * 0.82, 2));
        $tier85Price = max($floorPrice, round($guidePrice * 0.68, 2));
        $tier70Price = max($floorPrice, round($guidePrice * 0.48, 2));
        $tierBrokenPrice = $floorPrice;

        return [
            [
                'id'             => 'tier_99',
                'name'           => '99新 · 几乎全新',
                'badge'          => '成色极佳',
                'desc'           => '机身完好无痕迹，功能全正常，屏幕显示完美',
                'discount_rate'  => 93,
                'estimate_price' => $tier99Price,
                'deduct_amount'  => round($guidePrice - $tier99Price, 2)
            ],
            [
                'id'             => 'tier_95',
                'name'           => '95新 · 轻微使用',
                'badge'          => '主流推荐',
                'desc'           => '屏幕完好无裂痕，机身有极细微正常使用痕迹，功能完好',
                'discount_rate'  => 82,
                'estimate_price' => $tier95Price,
                'deduct_amount'  => round($guidePrice - $tier95Price, 2)
            ],
            [
                'id'             => 'tier_85',
                'name'           => '85新 · 正常磨损',
                'badge'          => '常见成色',
                'desc'           => '机身有轻微磕碰或掉漆，屏幕有轻微细划痕但显示正常',
                'discount_rate'  => 68,
                'estimate_price' => $tier85Price,
                'deduct_amount'  => round($guidePrice - $tier85Price, 2)
            ],
            [
                'id'             => 'tier_70',
                'name'           => '7成新 · 较多磕碰',
                'badge'          => '外观瑕疵',
                'desc'           => '机身有较多磕碰或凹陷，屏幕划痕较重但触摸功能完好',
                'discount_rate'  => 48,
                'estimate_price' => $tier70Price,
                'deduct_amount'  => round($guidePrice - $tier70Price, 2)
            ],
            [
                'id'             => 'tier_broken',
                'name'           => '重损 · 碎屏/不开机',
                'badge'          => '残值回收',
                'desc'           => '屏幕碎裂、进水维修史、机身严重弯曲或无法开机',
                'discount_rate'  => 15,
                'estimate_price' => $tierBrokenPrice,
                'deduct_amount'  => round($guidePrice - $tierBrokenPrice, 2)
            ]
        ];
    }

    /**
     * 根据极速成色档位获取估价详情
     */
    public function calculateQuickTierPrice(int $deviceId, string $tierId): array
    {
        $device = $this->deviceModel->getDeviceById($deviceId);
        if (!$device) {
            return ['code' => 400, 'msg' => '机型不存在'];
        }

        $guidePrice = (float)$device['guide_price'];
        $tiers = $this->getQuickTiers($guidePrice, (int)$device['category_id']);
        $matched = null;
        foreach ($tiers as $t) {
            if ($t['id'] === $tierId) {
                $matched = $t;
                break;
            }
        }
        if (!$matched) {
            $matched = $tiers[1] ?? $tiers[0]; // 默认 95新
        }

        return [
            'code' => 200,
            'data' => [
                'guide_price'    => $guidePrice,
                'total_deduct'   => $matched['deduct_amount'],
                'estimate_price' => $matched['estimate_price'],
                'appraisal_mode' => 'quick',
                'quick_tier'     => $matched,
                'breakdown'      => [
                    [
                        'question_id'    => 0,
                        'question_title' => '快速成色评估',
                        'id'             => 0,
                        'name'           => $matched['name'] . ' (' . $matched['desc'] . ')',
                        'deduct_amount'  => -$matched['deduct_amount'],
                        'is_fault'       => $matched['id'] === 'tier_broken' ? 1 : 0
                    ]
                ]
            ]
        ];
    }

    /**
     * 计算预估回收价格
     *
     * @param int $deviceId 机型ID
     * @param array $selectedItemIds 用户勾选的选项ID数组 [1, 5, 8, 12]
     * @return array 包含预估总价及各项扣减明细快照
     */
    public function calculateEstimatePrice(int $deviceId, array $selectedItemIds): array
    {
        $device = $this->deviceModel->getDeviceById($deviceId);
        if (!$device) {
            return ['code' => 400, 'msg' => '评估机型不存在或已下架'];
        }

        $guidePrice = (float)$device['guide_price'];
        if (empty($selectedItemIds)) {
            return [
                'code' => 200,
                'data' => [
                    'guide_price'    => $guidePrice,
                    'total_deduct'   => 0.00,
                    'estimate_price' => $guidePrice,
                    'breakdown'      => []
                ]
            ];
        }

        // 批量获取勾选的所有选项详情 (零 N+1 查询)
        $items = $this->questionModel->getItemsByIds($selectedItemIds);

        $fixedDeductTotal = 0.0;
        $ratioDeductTotal = 0.0;
        $breakdown = [];

        foreach ($items as $item) {
            $deductType = $item['deduct_type'] ?? 'fixed';
            $deductVal = (float)$item['deduct_value'];
            $actualItemDeduct = 0.0;

            if ($deductType === 'fixed') {
                // 固定金额扣减 (如果是正数表示加价，如大内存)
                $fixedDeductTotal += $deductVal;
                $actualItemDeduct = $deductVal;
            } elseif ($deductType === 'ratio') {
                // 百分比扣减 (例如 0.1 表示扣减 10%)
                $ratioDeduct = round($guidePrice * ($deductVal / 100), 2);
                $ratioDeductTotal += $ratioDeduct;
                $actualItemDeduct = $ratioDeduct;
            }

            $breakdown[] = [
                'question_id'    => (int)$item['question_id'],
                'question_title' => $item['question_title'] ?? '',
                'id'             => (int)$item['id'],
                'name'           => $item['name'],
                'deduct_amount'  => $actualItemDeduct,
                'is_fault'       => (int)($item['is_fault'] ?? 0)
            ];
        }

        // 最终价 = 指导价 + 各项调整 (各项调整本身为负数即为扣减)
        $rawPrice = $guidePrice + $fixedDeductTotal - $ratioDeductTotal;

        // 托底保护：动态自适应高价值数码与小额/低价/废品回收等多元业务场景 (规则 1)
        if ($guidePrice <= 0) {
            $minFloorPrice = 0.00;
        } elseif ($guidePrice <= 50.00) {
            // 小额/废品类目：残值底线为指导价的 5% 或最低 1 元（不得超过指导价本身）
            $minFloorPrice = min($guidePrice, max(1.00, round($guidePrice * 0.05, 2)));
        } else {
            // 较高价值数码/家电/奢品类目：保留合理残值底线（不低于指导价 5% 或 10 元，不超过指导价）
            $minFloorPrice = min($guidePrice, max(10.00, round($guidePrice * 0.05, 2)));
        }

        // 确保最终预估价不低于底线残值，且绝不超过原指导价
        $finalEstimatePrice = max($minFloorPrice, round($rawPrice, 2));
        $finalEstimatePrice = min($guidePrice, $finalEstimatePrice);
        $totalDeduct = max(0.00, round($guidePrice - $finalEstimatePrice, 2));

        return [
            'code' => 200,
            'data' => [
                'guide_price'    => $guidePrice,
                'total_deduct'   => $totalDeduct,
                'estimate_price' => $finalEstimatePrice,
                'breakdown'      => $breakdown
            ]
        ];
    }
}
