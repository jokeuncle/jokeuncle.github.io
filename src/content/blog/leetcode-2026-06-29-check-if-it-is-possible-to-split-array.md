---
title: "每日算法消化：#2811 Check if it is Possible to Split Array"
description: "Codex 深度消化 LeetCode #2811 Check if it is Possible to Split Array：这题只学一个点：长度超过 2 的数组，最后必须有一对相邻元素先撑住中间过程；所以只要找是否存在相邻两数之和 >= m。"
pubDate: 2026-06-29
author: Lei
tags: ["learning-log", "leetcode", "algorithm", "codex", "medium", "array", "dynamic-programming", "greedy"]
draft: false
---

> 今日来源：Lumen Brief / Yo LeetCode。原题：[Check if it is Possible to Split Array](https://leetcode.com/problems/check-if-it-is-possible-to-split-array/)。

## 题目信息

- 难度：Medium
- 通过率：34.6%
- Topic：Array / Dynamic Programming / Greedy
- 推荐解法：动态规划
- 复杂度：时间 `见官方题解`，空间 `见官方题解`

## 今天只需要学会一个东西

这题只学一个点：长度超过 2 的数组，最后必须有一对相邻元素先撑住中间过程；所以只要找是否存在相邻两数之和 >= m。

## 人话题意

- 你有一个数组，每次可以把一个连续数组切成左右两段。
- 切出来的每一段必须是“好数组”：要么长度是 1，要么元素和至少是 m。
- 目标是最后把所有数都切成单独一个数。
- 问：有没有一种切法可以做到。

## 最小例子

- 例子：nums = [2, 3, 3, 2, 3], m = 6
- 看相邻两数：2+3=5，不够。
- 继续看：3+3=6，够了。
- 这对 [3,3] 可以当作“安全核心”。
- 之后可以不断从旁边切掉单个数，单个数天然是好数组。
- 所以答案是 true。

## 关键想法

- 如果数组长度是 1 或 2，一定可以成功：长度 1 不用切，长度 2 可以直接切成两个单个数。
- 如果长度大于 2，必须找到某一对相邻元素，它们的和至少是 m。
- 原因是：切到最后之前，总会出现一个长度为 2 的连续小数组；它要能继续被保留下来，之前它的和必须满足 >= m。
- 所以本题核心不是尝试所有切法，而是检查有没有一个合格的相邻二元组。

## 跟做步骤

- 先令 n = nums.length。
- 如果 n <= 2，直接返回 true。
- 从左到右检查每一对相邻元素 nums[i] 和 nums[i + 1]。
- 如果 nums[i] + nums[i + 1] >= m，说明找到安全核心，返回 true。
- 如果全部相邻对都不够，返回 false。

## 参考代码

```typescript
function canSplitArray(nums: number[], m: number): boolean {
    const n = nums.length;

    if (n <= 2) {
        return true;
    }

    for (let i = 0; i < n - 1; i++) {
        if (nums[i] + nums[i + 1] >= m) {
            return true;
        }
    }

    return false;
}
```

## 补空练习

- 补空 1：长度很短时直接成功：if (nums.length <= ____) return true;
- 补空 2：检查相邻两数：nums[i] + nums[____] >= m
- 补空 3：找到合格相邻对后应该立刻：return ____;

## 常见错误

- 误以为要真的模拟每一次切分；其实只需要找相邻两数之和。
- 忘记处理 n <= 2：这两种情况一定可以成功。
- 检查了任意两个数，而不是相邻两个数；切分保持连续，所以必须是相邻。
- 把条件写成 > m；题目要求是大于等于 m。

## 下一步小练

- 再练一题同类感觉：看到“切到最后但中间要合法”，先想最后几步必须留下什么结构。
- 手画 n=3 的情况：只有两种第一刀，很容易看出为什么必须有一对相邻和 >= m。

---

这篇日志由 `yo leetcode` 自动生成，学习包来源：Codex 深度消化。
