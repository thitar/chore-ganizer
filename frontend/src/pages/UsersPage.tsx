import { useState, useEffect } from 'react'
import { useUsers } from '../hooks/useUsers'
import { useAuth } from '../hooks/useAuth'
import { AppShell } from '../components/AppShell'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Toast } from '../components/ui/Toast'
import { Avatar } from '../components/ui/Avatar'
import { ConfirmDelete } from '../components/ConfirmDelete'
import { Plus, Trash2 } from 'lucide-react'

const ROLE_BADGE: Record<string, string> = {
  PARENT: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  CHILD: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
}

export function UsersPage() {
  const { user: currentUser } = useAuth()
  const { users, isLoading, error, createUser, isCreating, deleteUser, isDeleting } = useUsers()
  const [showForm, setShowForm] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'PARENT' | 'CHILD'>('CHILD')
  const [color, setColor] = useState('#3B82F6')
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  function resetForm() {
    setName('')
    setEmail('')
    setPassword('')
    setRole('CHILD')
    setColor('#3B82F6')
    setFormError(null)
  }

  function cancelForm() {
    setShowForm(false)
    resetForm()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    try {
      await createUser({ name, email, password, role, color })
      cancelForm()
      setSuccessMessage('User created!')
    } catch {
      setFormError('Failed to create user. Check inputs and try again.')
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteUser(id)
      setDeletingId(null)
      setSuccessMessage('User deleted.')
    } catch {
      setFormError('Failed to delete user.')
    }
  }

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <span className="ml-3 text-zinc-400">Loading users...</span>
        </div>
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell>
        <div className="text-center py-12">
          <h2 className="font-display text-2xl font-bold text-zinc-100 mb-2">Something went wrong</h2>
          <p className="text-zinc-400 mb-4">Unable to load users. Check your connection and try again.</p>
          <Button onClick={() => window.location.reload()}>Try again</Button>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <PageHeader title="Family Members" />
      <p className="text-zinc-400 mb-6">Manage your family member accounts.</p>

      {users.length === 0 && !showForm ? (
        <div className="text-center py-12">
          <p className="text-lg font-bold text-zinc-100 mb-1">No family members yet</p>
          <p className="text-zinc-400 mb-4">Create one to get started.</p>
          <Button onClick={() => setShowForm(true)} className="mx-auto">
            <Plus className="h-4 w-4" /> Create User
          </Button>
        </div>
      ) : (
        <>
          {!showForm && (
            <Button onClick={() => setShowForm(true)} className="mb-4">
              <Plus className="h-4 w-4" /> Create User
            </Button>
          )}

          {showForm && (
            <Card className="p-6 mb-4">
              {formError && <div className="alert-error mb-4">{formError}</div>}
              <h3 className="text-lg font-bold text-zinc-100 mb-4">New Family Member</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-normal text-zinc-400 mb-1">Name</label>
                  <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="input" required />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-normal text-zinc-400 mb-1">Email</label>
                  <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" required />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-normal text-zinc-400 mb-1">Password (min 6 chars)</label>
                  <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" required minLength={6} />
                </div>
                <div>
                  <label htmlFor="role" className="block text-sm font-normal text-zinc-400 mb-1">Role</label>
                  <select id="role" value={role} onChange={(e) => setRole(e.target.value as 'PARENT' | 'CHILD')} className="input">
                    <option value="CHILD">Child</option>
                    <option value="PARENT">Parent</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="color" className="block text-sm font-normal text-zinc-400 mb-1">Color</label>
                  <input id="color" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-16 h-10 rounded-xl border border-edge" />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button type="submit" loading={isCreating} onClick={handleSubmit}>
                  {isCreating ? 'Creating...' : 'Create'}
                </Button>
                <Button type="button" variant="secondary" onClick={cancelForm} disabled={isCreating}>
                  Cancel
                </Button>
              </div>
            </Card>
          )}

          <Card>
            <div className="grid grid-cols-12 px-4 py-3 border-b border-edge bg-white/5 text-sm font-normal text-zinc-400">
              <div className="col-span-3">Name</div>
              <div className="col-span-2">Role</div>
              <div className="col-span-1">Color</div>
              <div className="col-span-6 text-right">Actions</div>
            </div>
            <div className="divide-y divide-edge">
              {users.map((u) => (
                <div key={u.id}>
                  <div className="px-4 py-3 grid grid-cols-12 gap-4 items-center hover:bg-white/5">
                    <div className="col-span-3 flex items-center gap-2">
                      <Avatar name={u.name} color={u.color} size="sm" />
                      <span className="font-bold text-zinc-100">{u.name}</span>
                    </div>
                    <div className="col-span-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-normal ${ROLE_BADGE[u.role] ?? 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'}`}>
                        {u.role}
                      </span>
                    </div>
                    <div className="col-span-1">
                      <span className="w-6 h-6 rounded-full inline-block" style={{ backgroundColor: u.color }} />
                    </div>
                    <div className="col-span-6 text-right">
                      {u.id === currentUser?.id ? (
                        <span className="text-sm text-zinc-500">You</span>
                      ) : (
                        <button onClick={() => setDeletingId(u.id)} className="p-1 text-zinc-500 hover:text-rose-400" aria-label="Delete user">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  {deletingId === u.id && (
                    <div className="px-4 pb-3">
                      <ConfirmDelete
                        message="Delete this family member? They will lose access immediately. This cannot be undone."
                        deleteLabel="Delete"
                        keepLabel="Keep"
                        onDelete={() => handleDelete(u.id)}
                        onCancel={() => setDeletingId(null)}
                        isDeleting={isDeleting}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {successMessage && (
        <Toast kind="success">{successMessage}</Toast>
      )}
    </AppShell>
  )
}
