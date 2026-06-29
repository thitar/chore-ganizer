import { assignedBody, dueSoonBody, completedBody } from '../../services/notification.formatters'

describe('notification.formatters', () => {
  const mockAssignment = {
    id: 42,
    template: { title: 'Wash Dishes', points: 10 },
    dueDate: new Date('2026-07-15T00:00:00Z'),
  }

  describe('assignedBody', () => {
    it('returns correct title, body with due date, priority 3, tags, and click URL', () => {
      const result = assignedBody(mockAssignment)
      expect(result).toEqual({
        title: 'Chore-Ganizer',
        body: 'Wash Dishes — due 2026-07-15',
        priority: 3,
        tags: ['clipboard', 'bell'],
        click: '/chores/42',
      })
    })

    it('body contains chore title and due date, not user name', () => {
      const result = assignedBody(mockAssignment)
      expect(result.body).toContain('Wash Dishes')
      expect(result.body).toContain('2026-07-15')
      expect(result.body).not.toContain('name')
    })

    it('click path is relative', () => {
      const result = assignedBody(mockAssignment)
      expect(result.click).toBe('/chores/42')
    })
  })

  describe('dueSoonBody', () => {
    it('returns correct title, body with points and due today, priority 4, tags, and click URL', () => {
      const result = dueSoonBody(mockAssignment)
      expect(result).toEqual({
        title: 'Chore-Ganizer',
        body: 'Wash Dishes — 10 pts, due today',
        priority: 4,
        tags: ['warning', 'alarm_clock'],
        click: '/chores/42',
      })
    })

    it('body shows correct points', () => {
      const result = dueSoonBody(mockAssignment)
      expect(result.body).toContain('10 pts')
    })
  })

  describe('completedBody', () => {
    it('returns correct title, body with points earned, priority 2, tags, and click URL', () => {
      const result = completedBody(mockAssignment, { name: 'Alice' })
      expect(result).toEqual({
        title: 'Chore-Ganizer',
        body: 'Wash Dishes — +10 points earned',
        priority: 2,
        tags: ['white_check_mark', 'star'],
        click: '/chores/42',
      })
    })

    it('body does not use the completer parameter', () => {
      const result = completedBody(mockAssignment, { name: 'Alice' })
      expect(result.body).not.toContain('Alice')
    })

    it('body shows +0 points earned when template.points is 0', () => {
      const zeroPointsAssignment = {
        ...mockAssignment,
        template: { title: 'Clean Room', points: 0 },
      }
      const result = completedBody(zeroPointsAssignment, { name: 'Bob' })
      expect(result.body).toContain('+0 points earned')
    })
  })

  describe('edge cases', () => {
    it('dueDate is a Date object — produces correct YYYY-MM-DD', () => {
      const result = assignedBody(mockAssignment)
      expect(result.body).toMatch(/2026-07-15/)
    })

    it('completer.name is any string — body does not include it', () => {
      const result = completedBody(mockAssignment, { name: 'AnyName123' })
      expect(result.body).not.toContain('AnyName123')
    })
  })
})
