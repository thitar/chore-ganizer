import { useState, useEffect } from 'react'
import { useUsers } from '../hooks/useUsers'
import { useAuth } from '../hooks/useAuth'
import { NavBar } from '../components/NavBar'
import { ConfirmDelete } from '../components/ConfirmDelete'
import { Plus, Trash2 } from 'lucide-react'

const ROLE_BADGE: Record<string, string> = {
  PARENT: 'bg-purple-100 text-purple-800',
  CHILD: 'bg-blue-100 text-blue-800',
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
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          <span className="ml-3 text-gray-500">Loading users...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-4">Unable to load users. Check your connection and try again.</p>
          <button onClick={() => window.location.reload()} className="bg-primary text-white px-4 py-2 min-h-[44px] rounded-lg hover:bg-primary-hover">
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Family Members</h2>
        <p className="text-gray-600 mb-6">Manage your family member accounts.</p>

        {users.length === 0 && !showForm ? (
          <div className="text-center py-12">
            <p className="text-lg font-bold text-gray-900 mb-1">No family members yet</p>
            <p className="text-gray-600 mb-4">Create one to get started.</p>
            <button onClick={() => setShowForm(true)} className="bg-primary text-white px-4 py-2 min-h-[44px] rounded-lg hover:bg-primary-hover flex items-center gap-1 mx-auto">
              <Plus className="h-4 w-4" /> Create User
            </button>
          </div>
        ) : (
          <>
            {!showForm && (
              <button onClick={() => setShowForm(true)} className="bg-primary text-white px-4 py-2 min-h-[44px] rounded-lg hover:bg-primary-hover mb-4 flex items-center gap-1">
                <Plus className="h-4 w-4" /> Create User
              </button>
            )}

            {showForm && (
              <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 mb-4">
                {formError && <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{formError}</div>}
                <h3 className="text-lg font-bold text-gray-900 mb-4">New Family Member</h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-normal text-gray-700 mb-1">Name</label>
                    <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-ring" required />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-normal text-gray-700 mb-1">Email</label>
                    <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-ring" required />
                  </div>
                  <div>
                    <label htmlFor="password" className="block text-sm font-normal text-gray-700 mb-1">Password (min 6 chars)</label>
                    <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-ring" required minLength={6} />
                  </div>
                  <div>
                    <label htmlFor="role" className="block text-sm font-normal text-gray-700 mb-1">Role</label>
                    <select id="role" value={role} onChange={(e) => setRole(e.target.value as 'PARENT' | 'CHILD')} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-ring bg-white">
                      <option value="CHILD">Child</option>
                      <option value="PARENT">Parent</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="color" className="block text-sm font-normal text-gray-700 mb-1">Color</label>
                    <input id="color" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-16 h-10 border rounded-lg" />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button type="submit" disabled={isCreating} className="bg-primary text-white px-4 py-2 min-h-[44px] rounded-lg hover:bg-primary-hover disabled:opacity-50">
                    {isCreating ? 'Creating...' : 'Create'}
                  </button>
                  <button type="button" onClick={cancelForm} disabled={isCreating} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="bg-white rounded-lg shadow-md">
              <div className="grid grid-cols-12 px-4 py-3 border-b bg-gray-50 text-sm font-normal text-gray-500">
                <div className="col-span-3">Name</div>
                <div className="col-span-2">Role</div>
                <div className="col-span-1">Color</div>
                <div className="col-span-6 text-right">Actions</div>
              </div>
              <div className="divide-y">
                {users.map((u) => (
                  <div key={u.id}>
                    <div className="px-4 py-3 grid grid-cols-12 gap-4 items-center hover:bg-gray-50">
                      <div className="col-span-3 font-bold text-gray-900">{u.name}</div>
                      <div className="col-span-2">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-normal ${ROLE_BADGE[u.role] ?? 'bg-gray-100 text-gray-800'}`}>
                          {u.role}
                        </span>
                      </div>
                      <div className="col-span-1">
                        <span className="w-6 h-6 rounded-full inline-block" style={{ backgroundColor: u.color }} />
                      </div>
                      <div className="col-span-6 text-right">
                        {u.id === currentUser?.id ? (
                          <span className="text-sm text-gray-400">You</span>
                        ) : (
                          <button onClick={() => setDeletingId(u.id)} className="p-1 text-gray-400 hover:text-red-600" aria-label="Delete user">
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
            </div>
          </>
        )}
      </main>

      {successMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-50 text-green-700 px-4 py-2 rounded-lg shadow-md">
          {successMessage}
        </div>
      )}
    </div>
  )
}
