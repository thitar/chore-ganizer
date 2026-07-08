interface AssignmentInfo {
  id: number
  template: { title: string; points: number }
  dueDate: Date
}

export function assignedBody(a: AssignmentInfo) {
  return {
    title: 'Chore-Ganizer',
    body: `${a.template.title} — due ${a.dueDate.toISOString().slice(0, 10)}`,
    priority: 3 as const,
    tags: ['clipboard', 'bell'],
    click: `/chores/${a.id}`,
  }
}

export function dueSoonBody(a: AssignmentInfo) {
  return {
    title: 'Chore-Ganizer',
    body: `${a.template.title} — ${a.template.points} pts, due today`,
    priority: 4 as const,
    tags: ['warning', 'alarm_clock'],
    click: `/chores/${a.id}`,
  }
}

export function badgeEarnedBody(badge: { name: string; description: string; emoji: string }) {
  return {
    title: 'Chore-Ganizer',
    body: `${badge.emoji} Badge earned: ${badge.name} — ${badge.description}`,
    priority: 3 as const,
    tags: ['trophy'],
    click: '/profile',
  }
}

export function completedBody(a: AssignmentInfo) {
  return {
    title: 'Chore-Ganizer',
    body: `${a.template.title} — +${a.template.points} points earned`,
    priority: 2 as const,
    tags: ['white_check_mark', 'star'],
    click: `/chores/${a.id}`,
  }
}
