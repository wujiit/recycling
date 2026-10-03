<?php
/**
 * 估价问答模型
 * 负责回收估价问答题目与选项的管理及查询
 */

namespace App\Model;

class QuestionModel
{
    private $db;
    private $p;
    private static $indexesChecked = false;

    public function __construct()
    {
        $this->db = Database::getInstance();
        $this->p = $this->db->getPrefix();
        $this->ensureIndexes();
    }

    /**
     * 自动检测并补齐问答题目高频查询复合索引 (消除全表扫描)
     */
    private function ensureIndexes(): void
    {
        if (self::$indexesChecked) {
            return;
        }
        $cache = \App\Service\CacheService::getInstance();
        if ($cache->get('schema_ensured:question_v1')) {
            self::$indexesChecked = true;
            return;
        }
        self::$indexesChecked = true;
        try {
            $existingIndexes = $this->db->fetchAll("SHOW INDEX FROM `{$this->p}rc_question`");
            $indexNames = array_column($existingIndexes, 'Key_name');
            if (!in_array('idx_device_cat', $indexNames, true)) {
                @$this->db->execute("ALTER TABLE `{$this->p}rc_question` ADD INDEX `idx_device_cat` (`device_id`, `category_id`)");
            }
            if (!in_array('idx_sort', $indexNames, true)) {
                @$this->db->execute("ALTER TABLE `{$this->p}rc_question` ADD INDEX `idx_sort` (`sort`)");
            }

            $cache->set('schema_ensured:question_v1', 1, 86400 * 30);
        } catch (\Throwable $e) {
            // 静默容灾
        }
    }

    /**
     * 获取品类专属或通用的完整问答树（包含下级所有选项）
     */
    public function getFullQuestionMatrix(int $categoryId, int $deviceId = 0): array
    {
        // 1. 查找适用于该机型或品类的问答题主项 (device_id 匹配 或 category_id 匹配 或 0 通用)
        if ($deviceId > 0) {
            $qSql = "SELECT `id`, `category_id`, IFNULL(`device_id`, 0) AS `device_id`, `title`, `sub_title`, `type`, `is_required`, `sort`
                     FROM `{$this->p}rc_question`
                     WHERE `device_id` = ? OR (`device_id` = 0 AND (`category_id` = ? OR `category_id` = 0))
                     ORDER BY `device_id` DESC, `sort` DESC, `id` ASC LIMIT 50";
            $questions = $this->db->fetchAll($qSql, [$deviceId, $categoryId]);
        } else {
            $qSql = "SELECT `id`, `category_id`, IFNULL(`device_id`, 0) AS `device_id`, `title`, `sub_title`, `type`, `is_required`, `sort`
                     FROM `{$this->p}rc_question`
                     WHERE `category_id` = ? OR `category_id` = 0
                     ORDER BY `sort` DESC, `id` ASC LIMIT 50";
            $questions = $this->db->fetchAll($qSql, [$categoryId]);
        }

        if (empty($questions)) {
            return [];
        }

        $questionIds = array_column($questions, 'id');
        $placeholders = implode(',', array_fill(0, count($questionIds), '?'));

        // 2. 批量查询全部下级选项
        $iSql = "SELECT `id`, `question_id`, `name`, `desc_text`, IFNULL(`image`, '') AS `image`, `deduct_type`, `deduct_value`, `is_fault`, `sort`
                 FROM `{$this->p}rc_question_item`
                 WHERE `question_id` IN ({$placeholders})
                 ORDER BY `sort` DESC, `id` ASC";
        $items = $this->db->fetchAll($iSql, $questionIds);

        // 内存中按 question_id 分组聚合
        $groupedItems = [];
        foreach ($items as $item) {
            $qid = (int)$item['question_id'];
            $groupedItems[$qid][] = $item;
        }

        foreach ($questions as &$q) {
            $qid = (int)$q['id'];
            $q['items'] = $groupedItems[$qid] ?? [];
        }
        unset($q);

        return $questions;
    }

    /**
     * 根据选项 ID 列表批量获取选项详情 (用于估价引擎与质检比对)
     */
    public function getItemsByIds(array $itemIds): array
    {
        if (empty($itemIds)) {
            return [];
        }

        $cleanIds = array_values(array_unique(array_filter(array_map('intval', $itemIds))));
        if (empty($cleanIds)) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($cleanIds), '?'));
        $sql = "SELECT `i`.*, IFNULL(`i`.`image`, '') AS `image`, `q`.`title` AS `question_title`
                FROM `{$this->p}rc_question_item` `i`
                LEFT JOIN `{$this->p}rc_question` `q` ON `i`.`question_id` = `q`.`id`
                WHERE `i`.`id` IN ({$placeholders})";
        return $this->db->fetchAll($sql, $cleanIds);
    }

    /**
     * 后台列表查询：根据品类与机型筛选问答题目及关联选项
     */
    public function getQuestionList(?int $categoryId = null, ?int $deviceId = null): array
    {
        $conditions = ["1=1"];
        $params = [];

        if ($categoryId !== null && $categoryId !== -1) {
            $conditions[] = "`q`.`category_id` = ?";
            $params[] = $categoryId;
        }
        if ($deviceId !== null && $deviceId > 0) {
            $conditions[] = "`q`.`device_id` = ?";
            $params[] = $deviceId;
        }

        $whereSql = implode(' AND ', $conditions);

        $qSql = "SELECT `q`.*, IFNULL(`q`.`device_id`, 0) AS `device_id`,
                        `c`.`name` AS `category_name`,
                        `d`.`name` AS `device_name`
                 FROM `{$this->p}rc_question` `q`
                 LEFT JOIN `{$this->p}rc_category` `c` ON `q`.`category_id` = `c`.`id`
                 LEFT JOIN `{$this->p}rc_device` `d` ON `q`.`device_id` = `d`.`id`
                 WHERE {$whereSql}
                 ORDER BY `q`.`sort` DESC, `q`.`id` ASC LIMIT 100";
        $questions = $this->db->fetchAll($qSql, $params);

        if (empty($questions)) {
            return [];
        }

        $questionIds = array_column($questions, 'id');
        $placeholders = implode(',', array_fill(0, count($questionIds), '?'));

        $iSql = "SELECT `id`, `question_id`, `name`, `desc_text`, IFNULL(`image`, '') AS `image`, 
                        `deduct_type`, `deduct_value`, `is_fault`, `sort`
                 FROM `{$this->p}rc_question_item`
                 WHERE `question_id` IN ({$placeholders})
                 ORDER BY `sort` DESC, `id` ASC";
        $items = $this->db->fetchAll($iSql, $questionIds);

        $groupedItems = [];
        foreach ($items as $item) {
            $qid = (int)$item['question_id'];
            $groupedItems[$qid][] = $item;
        }

        foreach ($questions as &$q) {
            $qid = (int)$q['id'];
            $q['items'] = $groupedItems[$qid] ?? [];
            if ($q['category_id'] == 0) {
                $q['category_name'] = '全行业通用标准';
            }
        }
        unset($q);

        return $questions;
    }

    /**
     * 保存或更新问题
     */
    public function saveQuestion(array $data): int
    {
        $id = (int)($data['id'] ?? 0);
        $categoryId = (int)($data['category_id'] ?? 0);
        $deviceId = (int)($data['device_id'] ?? 0);
        $title = trim((string)($data['title'] ?? ''));
        $subTitle = trim((string)($data['sub_title'] ?? ''));
        $type = in_array($data['type'] ?? '', ['radio', 'checkbox']) ? $data['type'] : 'radio';
        $isRequired = !empty($data['is_required']) ? 1 : 0;
        $sort = (int)($data['sort'] ?? 0);
        $now = time();

        if ($id > 0) {
            $sql = "UPDATE `{$this->p}rc_question` 
                    SET `category_id` = ?, `device_id` = ?, `title` = ?, `sub_title` = ?, 
                        `type` = ?, `is_required` = ?, `sort` = ?
                    WHERE `id` = ?";
            $this->db->execute($sql, [$categoryId, $deviceId, $title, $subTitle, $type, $isRequired, $sort, $id]);
            return $id;
        } else {
            $sql = "INSERT INTO `{$this->p}rc_question` 
                    (`category_id`, `device_id`, `title`, `sub_title`, `type`, `is_required`, `sort`, `created_at`) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
            $this->db->execute($sql, [$categoryId, $deviceId, $title, $subTitle, $type, $isRequired, $sort, $now]);
            return (int)$this->db->lastInsertId();
        }
    }

    /**
     * 删除问题及其全部选项
     */
    public function deleteQuestion(int $id): bool
    {
        if ($id <= 0) return false;
        $this->db->execute("DELETE FROM `{$this->p}rc_question_item` WHERE `question_id` = ?", [$id]);
        $this->db->execute("DELETE FROM `{$this->p}rc_question` WHERE `id` = ?", [$id]);
        return true;
    }

    /**
     * 保存或更新选项细项 (含参考示例图)
     */
    public function saveItem(array $data): int
    {
        $id = (int)($data['id'] ?? 0);
        $questionId = (int)($data['question_id'] ?? 0);
        $name = trim((string)($data['name'] ?? ''));
        $descText = trim((string)($data['desc_text'] ?? ''));
        $image = trim((string)($data['image'] ?? ''));
        $deductType = in_array($data['deduct_type'] ?? '', ['fixed', 'ratio']) ? $data['deduct_type'] : 'fixed';
        $deductValue = (float)($data['deduct_value'] ?? 0.00);
        $isFault = !empty($data['is_fault']) ? 1 : 0;
        $sort = (int)($data['sort'] ?? 0);
        $now = time();

        if ($id > 0) {
            $sql = "UPDATE `{$this->p}rc_question_item` 
                    SET `question_id` = ?, `name` = ?, `desc_text` = ?, `image` = ?, 
                        `deduct_type` = ?, `deduct_value` = ?, `is_fault` = ?, `sort` = ?
                    WHERE `id` = ?";
            $this->db->execute($sql, [$questionId, $name, $descText, $image, $deductType, $deductValue, $isFault, $sort, $id]);
            return $id;
        } else {
            $sql = "INSERT INTO `{$this->p}rc_question_item` 
                    (`question_id`, `name`, `desc_text`, `image`, `deduct_type`, `deduct_value`, `is_fault`, `sort`, `created_at`) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
            $this->db->execute($sql, [$questionId, $name, $descText, $image, $deductType, $deductValue, $isFault, $sort, $now]);
            return (int)$this->db->lastInsertId();
        }
    }

    /**
     * 删除选项
     */
    public function deleteItem(int $id): bool
    {
        if ($id <= 0) return false;
        $this->db->execute("DELETE FROM `{$this->p}rc_question_item` WHERE `id` = ?", [$id]);
        return true;
    }
}
