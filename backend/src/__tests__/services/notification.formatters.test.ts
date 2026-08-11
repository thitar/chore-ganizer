import { assignedBody, dueSoonBody, completedBody, badgeEarnedBody, overdueBody } from '../../services/notification.formatters'

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
      const result = completedBody(mockAssignment)
      expect(result).toEqual({
        title: 'Chore-Ganizer',
        body: 'Wash Dishes — +10 points earned',
        priority: 2,
        tags: ['white_check_mark', 'star'],
        click: '/chores/42',
      })
    })

    it('body shows +0 points earned when template.points is 0', () => {
      const zeroPointsAssignment = {
        ...mockAssignment,
        template: { title: 'Clean Room', points: 0 },
      }
      const result = completedBody(zeroPointsAssignment)
      expect(result.body).toContain('+0 points earned')
    })
  })

  describe('edge cases', () => {
    it('dueDate is a Date object — produces correct YYYY-MM-DD', () => {
      const result = assignedBody(mockAssignment)
      expect(result.body).toMatch(/2026-07-15/)
    })
  })

  describe('badgeEarnedBody', () => {
    it('formats a badge-earned push', () => {
      const r = badgeEarnedBody({
        name: 'First Chore',
        description: 'Complete your first chore',
        emoji: '\u{1F389}',
      })
      expect(r.title).toBe('Chore-Ganizer')
      expect(r.body).toBe('\u{1F389} Badge earned: First Chore \u2014 Complete your first chore')
      expect(r.priority).toBe(3)
      expect(r.click).toBe('/profile')
    })
  })

  describe('overdueBody', () => {
    it('returns overdue priority 5, warning/exclamation tags, and click URL', () => {
      const today = new Date(new Date().toISOString().slice(0, 10))
      const result = overdueBody({ ...mockAssignment, dueDate: today })
      expect(result.title).toBe('Chore-Ganizer')
      expect(result.body).toBe('Wash Dishes — overdue')
      expect(result.priority).toBe(5)
      expect(result.tags).toEqual(['warning', 'exclamation'])
      expect(result.click).toBe('/chores/42')
    })

    it('pluralizes days when overdue by more than one day', () => {
      const due = new Date(Date.now() - 5 * 86400000)
      const result = overdueBody({ ...mockAssignment, dueDate: due })
      expect(result.body).toContain('overdue 5 days')
    })
  })
})

describe('nudgeBody', () => {
  it('builds a gentle-reminder push with the parent name', () => {
    const { nudgeBody } = require('../../services/notification.formatters')
    const out = nudgeBody(
      { id: 9, template: { title: 'Load dishwasher', points: 20 }, dueDate: new Date('2026-08-11') },
      'Dad'
    )
    expect(out).toEqual({
      title: 'Chore-Ganizer',
      body: 'Gentle reminder 👀 "Load dishwasher" is waiting · from Dad',
      priority: 3,
      tags: ['bell', 'eyes'],
      click: '/chores/9',
    })
  })
})
