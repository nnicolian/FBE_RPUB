import { GraduationCap } from 'lucide-react'

// Sign-in / reset-password frame in the SAIP / FIP style: dark navy backdrop, logo, white card.
export default function AuthShell({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ink-900 via-ink-800 to-ink-900 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/10">
            <GraduationCap className="h-8 w-8 text-accent-400" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-white tracking-tight">Research &amp; Publications</h1>
          <p className="mt-1 text-sm text-ink-400">AUST · Faculty of Business &amp; Economics</p>
        </div>
        <div className="rounded-2xl bg-white shadow-2xl p-8 animate-fade-in">{children}</div>
      </div>
    </div>
  )
}
