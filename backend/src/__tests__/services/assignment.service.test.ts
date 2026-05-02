/**
 * Assignment Service Tests
 *
 * Covers:
 * - calculateAssignedUserIds: FIXED, ROUND_ROBIN, MIXED, default modes
 * - Edge cases: empty pools, null index
 */

import * as assignmentService from '../../services/recurring-chores/assignment.service'

describe('Assignment Service', () => {
  describe('calculateAssignedUserIds', () => {
    it('should return fixed assignees for FIXED mode', () => {
      const result = assignmentService.calculateAssignedUserIds(
        'FIXED',
        [2, 3],
        [],
        null
      )

      expect(result.assignedUserIds).toEqual([2, 3])
      expect(result.roundRobinIndex).toBeNull()
    })

    it('should return single user from pool for ROUND_ROBIN mode', () => {
      const result = assignmentService.calculateAssignedUserIds(
        'ROUND_ROBIN',
        [],
        [2, 3, 4],
        0
      )

      expect(result.assignedUserIds).toEqual([2])
      expect(result.roundRobinIndex).toBe(0)
    })

    it('should rotate round-robin index', () => {
      const result1 = assignmentService.calculateAssignedUserIds(
        'ROUND_ROBIN',
        [],
        [2, 3, 4],
        0
      )
      const result2 = assignmentService.calculateAssignedUserIds(
        'ROUND_ROBIN',
        [],
        [2, 3, 4],
        1
      )
      const result3 = assignmentService.calculateAssignedUserIds(
        'ROUND_ROBIN',
        [],
        [2, 3, 4],
        2
      )

      expect(result1.assignedUserIds).toEqual([2])
      expect(result2.assignedUserIds).toEqual([3])
      expect(result3.assignedUserIds).toEqual([4])
    })

    it('should wrap around when round-robin index exceeds pool size', () => {
      const result = assignmentService.calculateAssignedUserIds(
        'ROUND_ROBIN',
        [],
        [2, 3],
        5
      )

      // 5 % 2 = 1 → pool[1] = 3
      expect(result.assignedUserIds).toEqual([3])
      expect(result.roundRobinIndex).toBe(5)
    })

    it('should return empty array for ROUND_ROBIN with empty pool', () => {
      const result = assignmentService.calculateAssignedUserIds(
        'ROUND_ROBIN',
        [],
        [],
        0
      )

      expect(result.assignedUserIds).toEqual([])
      expect(result.roundRobinIndex).toBeNull()
    })

    it('should handle MIXED mode with both fixed and round-robin assignees', () => {
      const result = assignmentService.calculateAssignedUserIds(
        'MIXED',
        [2],
        [3, 4],
        0
      )

      expect(result.assignedUserIds).toEqual([2, 3])
      expect(result.roundRobinIndex).toBe(0)
    })

    it('should return only fixed assignees for MIXED mode when pool is empty', () => {
      const result = assignmentService.calculateAssignedUserIds(
        'MIXED',
        [2, 3],
        [],
        null
      )

      expect(result.assignedUserIds).toEqual([2, 3])
      expect(result.roundRobinIndex).toBeNull()
    })

    it('should use index 0 when roundRobinIndex is null for ROUND_ROBIN', () => {
      const result = assignmentService.calculateAssignedUserIds(
        'ROUND_ROBIN',
        [],
        [2, 3, 4],
        null
      )

      expect(result.assignedUserIds).toEqual([2])
      expect(result.roundRobinIndex).toBe(0)
    })

    it('should return empty for unknown assignment mode', () => {
      const result = assignmentService.calculateAssignedUserIds(
        'UNKNOWN',
        [2],
        [3],
        0
      )

      expect(result.assignedUserIds).toEqual([])
      expect(result.roundRobinIndex).toBeNull()
    })
  })
})
