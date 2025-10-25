import Sidebar from './Sidebar'
import Header from './Header'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#EAEDED]">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col">
        <Header />
        <main className="flex-1 pt-[57px]">
          {children}
        </main>
      </div>
    </div>
  )
}
