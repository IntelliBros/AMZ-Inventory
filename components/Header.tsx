'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ChevronDownIcon, PlusIcon } from '@heroicons/react/24/outline'

interface Team {
  id: string
  name: string
  owner_id: string
  role: string
}

export default function Header() {
  const router = useRouter()
  const supabase = createClient()
  const [teams, setTeams] = useState<Team[]>([])
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showNewTeamModal, setShowNewTeamModal] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchTeams()
  }, [])

  const fetchTeams = async () => {
    try {
      const response = await fetch('/api/teams', {
        credentials: 'include'
      })

      if (response.ok) {
        const { teams: fetchedTeams } = await response.json()
        setTeams(fetchedTeams)

        // Get current team from localStorage or default to first
        const cachedTeamId = localStorage.getItem('current_team_id')
        const current = cachedTeamId
          ? fetchedTeams.find((t: Team) => t.id === cachedTeamId)
          : fetchedTeams[0]

        if (current) {
          setCurrentTeam(current)
        }
      }
    } catch (err) {
      console.error('Error fetching teams:', err)
    }
  }

  const handleSwitchTeam = async (team: Team) => {
    try {
      const response = await fetch('/api/teams/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ team_id: team.id }),
      })

      if (response.ok) {
        setCurrentTeam(team)
        localStorage.setItem('current_team_id', team.id)
        setShowDropdown(false)
        router.refresh() // Reload data with new team
      }
    } catch (err) {
      console.error('Error switching team:', err)
    }
  }

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTeamName.trim()) return

    setLoading(true)
    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newTeamName.trim() }),
      })

      if (response.ok) {
        const { team } = await response.json()
        await fetchTeams()
        await handleSwitchTeam({ ...team, role: 'owner' })
        setShowNewTeamModal(false)
        setNewTeamName('')
      }
    } catch (err) {
      console.error('Error creating team:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('current_team_id')
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      <header className="fixed top-0 right-0 left-64 bg-[#232F3E] border-b border-[#37475A] shadow-sm z-20">
        <div className="px-6 py-3 flex justify-end items-center gap-4">
          {/* Team Selector */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="px-4 py-2 text-sm font-medium text-white bg-[#37475A] hover:bg-[#485769] rounded transition-colors shadow-sm flex items-center gap-2"
            >
              {currentTeam?.name || 'Select Team'}
              <ChevronDownIcon className="w-4 h-4" />
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-30">
                <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">
                  Your Teams
                </div>
                {teams.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => handleSwitchTeam(team)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center justify-between ${
                      currentTeam?.id === team.id ? 'bg-gray-50 font-medium' : ''
                    }`}
                  >
                    <span>{team.name}</span>
                    {currentTeam?.id === team.id && (
                      <span className="text-xs text-[#FF9900]">✓</span>
                    )}
                  </button>
                ))}
                <div className="border-t border-gray-200 mt-1 pt-1">
                  <button
                    onClick={() => {
                      setShowDropdown(false)
                      setShowNewTeamModal(true)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-[#FF9900] hover:bg-gray-100 flex items-center gap-2"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Create New Team
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            className="px-4 py-2 text-sm font-medium text-[#232F3E] bg-[#FF9900] hover:bg-[#FF9900]/90 rounded transition-colors shadow-sm"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* New Team Modal */}
      {showNewTeamModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Create New Team</h3>
              <button
                onClick={() => setShowNewTeamModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Team Name *
                </label>
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF9900]"
                  placeholder="My New Team"
                  required
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewTeamModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#FF9900] text-white rounded-md hover:bg-[#e88b00] disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
