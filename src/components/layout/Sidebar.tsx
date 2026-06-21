'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '#', icon: '⊞', label: 'Dashboard' },
  { href: '#', icon: '💲', label: 'My Commission' },
  { href: '#', icon: '👤', label: 'My Account' },
  { href: '#', icon: '🌊', label: 'Flood Rater' },
  { href: '#', icon: '📋', label: 'My Policies' },
  { href: '/quote', icon: '🏪', label: 'Carrier Store', badge: 'New', active_prefix: '/quote' },
  { href: '#', icon: '📚', label: 'Resource Center' },
]

export default function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="w-[200px] min-w-[200px] bg-white border-r border-gray-200 py-4 shrink-0">
      {NAV.map((item) => {
        const isActive = item.active_prefix && pathname.startsWith(item.active_prefix)
        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium transition-colors ${
              isActive
                ? 'text-brand-600 bg-brand-50 font-semibold'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <span className="w-4 text-center text-sm">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <span className="text-[9px] font-bold bg-brand-600 text-white rounded px-1.5 py-0.5">
                {item.badge}
              </span>
            )}
          </Link>
        )
      })}
    </aside>
  )
}
