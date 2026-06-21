const STEPS = [
  { label: 'Business Info' },
  { label: 'Carriers' },
  { label: 'Application' },
  { label: 'Results' },
]

export default function ProgressSteps({ current }: { current: number }) {
  return (
    <div className="flex items-start px-6 py-4">
      {STEPS.map((step, i) => {
        const done    = i < current
        const active  = i === current

        return (
          <div key={step.label} className="flex items-start flex-1 last:flex-none">
            {/* Step node */}
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              {/* Circle */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  done
                    ? 'bg-brand-600 text-white'
                    : active
                    ? 'bg-brand-600 text-white ring-4 ring-brand-100'
                    : 'bg-gray-100 text-gray-400 border border-gray-200'
                }`}
              >
                {done ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7l3.5 3.5 5.5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  i + 1
                )}
              </div>

              {/* Label */}
              <span
                className={`text-[10px] font-semibold whitespace-nowrap transition-colors ${
                  active
                    ? 'text-brand-600'
                    : done
                    ? 'text-gray-500'
                    : 'text-gray-300'
                }`}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line — not after last step */}
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mt-4 mx-1.5 transition-colors duration-300 ${
                  i < current ? 'bg-brand-600' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
