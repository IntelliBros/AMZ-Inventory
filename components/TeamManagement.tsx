'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface TeamMember {
  id: string
  owner_id: string
  member_id: string
  role: 'admin' | 'editor' | 'viewer'
  created_at: string
  member: {
    id: string
    email: string
  }
}

interface TeamManagementProps {
  currentUser: {
    id: string
    email: string
  }
}

export default function TeamManagement({ currentUser }: TeamManagementProps) {
  const router = useRouter()
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [newMemberRole, setNewMemberRole] = useState<'admin' | 'editor' | 'viewer'>('viewer')

  // Team name state
  const [teamName, setTeamName] = useState('')
  const [isEditingTeamName, setIsEditingTeamName] = useState(false)
  const [teamNameLoading, setTeamNameLoading] = useState(false)

  useEffect(() => {
    fetchTeamMembers()
    fetchTeamSettings()

    // Listen for team changes
    const handleTeamChange = () => {
      fetchTeamMembers()
      fetchTeamSettings()
    }

    window.addEventListener('teamChanged', handleTeamChange)

    return () => {
      window.removeEventListener('teamChanged', handleTeamChange)
    }
  }, [])

  const fetchTeamSettings = async () => {
    try {
      const response = await fetch('/api/team/settings', {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch team settings')
      }

      const { team_name } = await response.json()
      setTeamName(team_name || 'Amazon FBA')
    } catch (err: any) {
      console.error('Error fetching team settings:', err)
      setTeamName('Amazon FBA')
    }
  }

  const fetchTeamMembers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/team', {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch team members')
      }

      const { teamMembers: members } = await response.json()
      setTeamMembers(members)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setAddLoading(true)

    try {
      const response = await fetch('/api/team', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          memberEmail: newMemberEmail,
          role: newMemberRole,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add team member')
      }

      // Refresh team members list
      await fetchTeamMembers()
      setShowAddModal(false)
      setNewMemberEmail('')
      setNewMemberRole('viewer')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setAddLoading(false)
    }
  }

  const handleUpdateRole = async (memberId: string, newRole: 'admin' | 'editor' | 'viewer') => {
    try {
      setError(null)
      const response = await fetch(`/api/team/${memberId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ role: newRole }),
      })

      if (!response.ok) {
        throw new Error('Failed to update team member role')
      }

      // Refresh team members list
      await fetchTeamMembers()
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleRemoveMember = async (memberId: string, memberEmail: string) => {
    if (!confirm(`Are you sure you want to remove ${memberEmail} from your team?`)) {
      return
    }

    try {
      setError(null)
      const response = await fetch(`/api/team/${memberId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to remove team member')
      }

      // Refresh team members list
      await fetchTeamMembers()
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleUpdateTeamName = async () => {
    if (!teamName.trim()) {
      setError('Team name cannot be empty')
      return
    }

    try {
      setError(null)
      setTeamNameLoading(true)
      const response = await fetch('/api/team/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ team_name: teamName.trim() }),
      })

      if (!response.ok) {
        throw new Error('Failed to update team name')
      }

      // Update localStorage cache so sidebar doesn't flash old name
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('team_name', teamName.trim())
          // Trigger event so Sidebar and Header update
          window.dispatchEvent(new CustomEvent('teamChanged', { detail: { name: teamName.trim() } }))
        } catch {
          // Ignore localStorage errors
        }
      }

      setIsEditingTeamName(false)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setTeamNameLoading(false)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800'
      case 'editor':
        return 'bg-blue-100 text-blue-800'
      case 'viewer':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Full access - can view, edit, and delete all data'
      case 'editor':
        return 'Can view and edit data, but cannot delete'
      case 'viewer':
        return 'Read-only access to view data'
      default:
        return ''
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Team Name Editor */}
      <div className="bg-white border border-gray-200 rounded-md p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Team Name
            </label>
            {isEditingTeamName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF9900]"
                  placeholder="Enter team name"
                  disabled={teamNameLoading}
                />
                <button
                  onClick={handleUpdateTeamName}
                  disabled={teamNameLoading}
                  className="px-4 py-2 bg-[#FF9900] text-white rounded-md hover:bg-[#e88b00] disabled:opacity-50 transition-colors"
                >
                  {teamNameLoading ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setIsEditingTeamName(false)
                    fetchTeamSettings()
                  }}
                  disabled={teamNameLoading}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <p className="text-lg font-semibold text-gray-900">{teamName}</p>
                <button
                  onClick={() => setIsEditingTeamName(true)}
                  className="text-sm text-[#FF9900] hover:text-[#e88b00]"
                >
                  Edit
                </button>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              This name will appear in the sidebar and throughout the app.
            </p>
          </div>
        </div>
      </div>

      {/* Add Member Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-[#FF9900] text-white rounded-md hover:bg-[#e88b00] transition-colors"
        >
          Add Team Member
        </button>
      </div>

      {/* Current User Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-1">Account Owner</h3>
        <p className="text-sm text-blue-800">{currentUser.email}</p>
        <p className="text-xs text-blue-600 mt-1">You have full access to all data and can manage team members.</p>
      </div>

      {/* Team Members List */}
      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Loading team members...</p>
        </div>
      ) : teamMembers.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 border border-gray-200 rounded-md">
          <p className="text-gray-500">No team members yet. Click "Add Team Member" to invite someone.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Added
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {teamMembers.map((member) => (
                <tr key={member.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{member.member.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={member.role}
                      onChange={(e) => handleUpdateRole(member.id, e.target.value as 'admin' | 'editor' | 'viewer')}
                      className="text-xs px-2 py-1 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF9900]"
                    >
                      <option value="admin">Admin</option>
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">{getRoleDescription(member.role)}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(member.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleRemoveMember(member.id, member.member.email)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Add Team Member</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF9900]"
                  placeholder="colleague@example.com"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  The user must already have an account with this email.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value as 'admin' | 'editor' | 'viewer')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF9900]"
                  required
                >
                  <option value="viewer">Viewer (Read-only)</option>
                  <option value="editor">Editor (Read & Write)</option>
                  <option value="admin">Admin (Full access)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {getRoleDescription(newMemberRole)}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  disabled={addLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#FF9900] text-white rounded-md hover:bg-[#e88b00] disabled:opacity-50"
                  disabled={addLoading}
                >
                  {addLoading ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
