'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function Header() {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="fixed top-0 right-0 left-64 bg-[#232F3E] border-b border-[#37475A] shadow-sm z-20">
      <div className="px-6 py-3 flex justify-end items-center">
        <button
          onClick={handleSignOut}
          className="px-4 py-2 text-sm font-medium text-[#232F3E] bg-[#FF9900] hover:bg-[#FF9900]/90 rounded transition-colors shadow-sm"
        >
          Sign Out
        </button>
      </div>
    </header>
  )
}
