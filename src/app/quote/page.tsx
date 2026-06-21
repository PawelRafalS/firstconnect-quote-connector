'use client'
export const dynamic = 'force-dynamic'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'

const CARRIER_LOGOS = [
  'hippo','AonEdge','bamboo','BLINK','Clearcover','coterie','Cover',
  'getcovered','SP','GreatAmerican','INFINITY','KEMPER','Ladder',
  'mileauto','NEXT','Openly','plumlife','Stillwater','88TEND','Travelers','velocity',
]

const PRODUCTS = [
  {
    id: 'gl', label: 'General\nLiability',
    icon: (
      <svg width="42" height="42" viewBox="0 0 42 42" fill="none">
        <rect x="8" y="9" width="26" height="24" rx="2" stroke="#2563eb" strokeWidth="1.8"/>
        <line x1="14" y1="9" x2="14" y2="33" stroke="#2563eb" strokeWidth="1.5"/>
        <line x1="8" y1="18" x2="34" y2="18" stroke="#2563eb" strokeWidth="1.5"/>
        <line x1="11" y1="23" x2="17" y2="23" stroke="#2563eb" strokeWidth="1.5"/>
        <line x1="11" y1="27" x2="17" y2="27" stroke="#2563eb" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    id: 'bop', label: 'Business\nOwner\'s Policy',
    icon: (
      <svg width="42" height="42" viewBox="0 0 42 42" fill="none">
        <rect x="11" y="19" width="20" height="14" rx="2" stroke="#2563eb" strokeWidth="1.8"/>
        <path d="M16 19V16a5 5 0 0110 0v3" stroke="#2563eb" strokeWidth="1.8"/>
        <circle cx="21" cy="26" r="2.5" fill="#2563eb" opacity=".4"/>
        <line x1="21" y1="28.5" x2="21" y2="31" stroke="#2563eb" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    id: 'pl', label: 'Professional\nLiability',
    icon: (
      <svg width="42" height="42" viewBox="0 0 42 42" fill="none">
        <path d="M21 7L30 12V23C30 28 25 32 21 34C17 32 12 28 12 23V12L21 7Z" stroke="#2563eb" strokeWidth="1.8"/>
        <path d="M16 22l4 4 7-7" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: 'wc', label: 'Worker\'s\nComp',
    icon: (
      <svg width="42" height="42" viewBox="0 0 42 42" fill="none">
        <circle cx="21" cy="13" r="5" stroke="#2563eb" strokeWidth="1.8"/>
        <path d="M13 33v-3a8 8 0 0116 0v3" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M26 21l3 9M16 21l-3 9" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="13" y1="29" x2="29" y2="29" stroke="#2563eb" strokeWidth="1.5"/>
      </svg>
    ),
  },
]

export default function ProductSelectionPage() {
  const router = useRouter()
  return (
    <AppShell>
      {/* Carrier Portals */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <p className="text-xs font-bold text-gray-700 mb-3">Carrier Portals</p>
        <div className="flex flex-wrap gap-2.5">
          {CARRIER_LOGOS.map((name) => (
            <div key={name} className="h-6 px-2.5 border border-gray-200 rounded text-[10px] font-semibold text-gray-500 bg-gray-50 flex items-center">
              {name}
            </div>
          ))}
        </div>
      </div>

      {/* Quote Connector card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-b from-brand-50 to-white px-6 py-5 text-center border-b border-gray-100">
          <p className="text-sm font-extrabold tracking-wide text-gray-900 mb-3">
            Quote <span className="text-orange-500">C</span>onnector
          </p>
          <h1 className="text-2xl font-bold text-brand-600">Product Selection</h1>
          <p className="text-xs text-gray-500 mt-1">Select a product to quote</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          <button className="px-5 py-3 text-sm font-semibold text-gray-400 border-b-2 border-transparent -mb-px">Personal</button>
          <button className="px-5 py-3 text-sm font-semibold text-brand-600 border-b-2 border-brand-600 -mb-px">Commercial</button>
        </div>

        {/* Product cards */}
        <div className="flex justify-center gap-4 px-6 py-6">
          {PRODUCTS.map((p) => {
            const isWC = p.id === 'wc'
            return (
              <button
                key={p.id}
                onClick={() => isWC && router.push('/quote/basics')}
                className={`w-36 flex flex-col items-center gap-2.5 px-3 pt-5 pb-4 rounded-xl border-[1.5px] transition-all text-center cursor-pointer
                  ${isWC
                    ? 'border-brand-600 shadow-[0_0_0_2px_#dbeafe]'
                    : 'border-gray-200 opacity-60 cursor-not-allowed hover:border-blue-200'}`}
              >
                <div className="w-11 h-11 flex items-center justify-center">{p.icon}</div>
                <p className="text-xs font-semibold text-gray-700 whitespace-pre-line leading-tight">{p.label}</p>
                <div className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center mt-1 text-xs
                  ${isWC ? 'bg-brand-600 border-brand-600 text-white' : 'border-gray-300'}`}>
                  {isWC && '✓'}
                </div>
              </button>
            )
          })}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button className="h-9 px-4 border border-gray-300 rounded-lg text-xs font-semibold text-gray-600 bg-white hover:bg-gray-50">
            Back
          </button>
          <button
            onClick={() => router.push('/quote/basics')}
            className="h-9 px-6 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Start
          </button>
        </div>
      </div>
    </AppShell>
  )
}
