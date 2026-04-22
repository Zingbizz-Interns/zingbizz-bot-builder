interface StatCardProps {
  label: string
  value: string | number
  accent?: 'blue' | 'red' | 'yellow' | 'black'
}

const accentStyles = {
  blue: 'border-t-[#FF6B6B]',
  red: 'border-t-[#FF6B6B]',
  yellow: 'border-t-[#FFD93D]',
  black: 'border-t-[#000000]',
}

export default function StatCard({ label, value, accent = 'black' }: StatCardProps) {
  return (
    <div
      className={`border-4 border-black border-t-8 ${accentStyles[accent]} bg-white shadow-[4px_4px_0px_0px_#000] p-5`}
    >
      <p className="text-xs font-black uppercase tracking-widest text-black/50 mb-2">{label}</p>
      <p className="text-4xl font-black tracking-tighter text-black">{value}</p>
    </div>
  )
}
