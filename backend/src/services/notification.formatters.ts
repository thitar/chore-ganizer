export function dueSoonBody(assignment: {
  id: number
  template: { title: string; points: number }
  dueDate: Date
}) {
  return {
    title: 'Chore-Ganizer',
    body: `${assignment.template.title} — ${assignment.template.points} pts, due today`,
    priority: 4 as const,
    tags: ['warning', 'alarm_clock'],
    click: `/chores/${assignment.id}`,
  }
}
