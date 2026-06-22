import Link from 'next/link'

export default function Topbar() {
  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-5 gap-4 shrink-0">
      {/* User */}
      <div className="flex items-center gap-2 min-w-[160px]">
        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700">
          C
        </div>
        <span className="text-sm font-semibold text-gray-900">Chris</span>
        <span className="text-xs text-gray-400">▾</span>
      </div>

      {/* Logo */}
      <div className="flex-1 text-center text-[15px] font-extrabold tracking-wide text-gray-900">
        FIRST <span className="text-orange-500">C</span>ONNECT
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 min-w-[160px] justify-end">
        <Link
          href="/quote"
          className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors"
        >
          <span className="text-base leading-none">＋</span> New Quote
        </Link>
        <button className="text-gray-400 hover:text-gray-600 text-lg">🔔</button>
      </div>
    </header>
  )
}
