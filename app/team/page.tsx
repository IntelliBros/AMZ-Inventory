import { getCurrentUser } from '@/lib/auth'
import { cookies } from 'next/headers'
import MainLayout from '@/components/MainLayout'
import TeamManagement from '@/components/TeamManagement'

export default async function TeamPage() {
  // Get current user from cookie
  const cookieStore = await cookies()
  const token = cookieStore.get('auth-token')?.value
  const currentUser = await getCurrentUser(token)

  if (!currentUser) {
    throw new Error('Not authenticated')
  }

  return (
    <MainLayout>
      <div className="px-8 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[#0F1111]">Team Management</h2>
          <p className="mt-1 text-sm text-gray-600">
            Invite team members to access your inventory data. Set their role to control what they can do.
          </p>
        </div>

        <TeamManagement currentUser={currentUser} />
      </div>
    </MainLayout>
  )
}
