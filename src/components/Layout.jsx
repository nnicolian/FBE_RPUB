import Sidebar from './Sidebar'
import TopBar from './TopBar'

// App shell in the SAIP / FIP style: sidebar on the left, top bar, page content.
export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-ink-50">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto w-full animate-fade-in print:p-0 print:max-w-none">{children}</main>
      </div>
    </div>
  )
}
