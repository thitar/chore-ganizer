import { useAdminDashboard } from '../hooks/useAdmin'
import { HealthStatusCard, ChoreStatsCard, PointSummaryCard, ActivityFeed, RateLimitCard, NotifConfigCard, UserTableCompact } from '../components/admin'

export function AdminPage() {
  const { data, loading, error, refresh } = useAdminDashboard()

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <HealthStatusCard data={data?.health ?? null} loading={loading} error={error} />
        <ChoreStatsCard data={data?.choreStats ?? null} loading={loading} error={error} />
        <PointSummaryCard data={data?.pointSummary ?? null} loading={loading} error={error} />
        <ActivityFeed data={data?.activity ?? null} loading={loading} error={error} />
        <RateLimitCard data={data?.rateLimits ?? null} loading={loading} error={error} />
        <NotifConfigCard data={null} loading={loading} error={error} />
      </div>
    </div>
  )
}
