interface StatCardProps {
  label: string
  value: string | number
  accent?: 'blue' | 'red' | 'yellow' | 'black'
}

const accentStyles = {
  blue: 'border-t-[#1040C0]',
  red: 'border-t-[#D02020]',
  yellow: 'border-t-[#F0C020]',
  black: 'border-t-[#121212]',
}

export default function StatCard({ label, value, accent = 'black' }: StatCardProps) {
  return (
    <div
      className={`border-4 border-[#121212] border-t-8 ${accentStyles[accent]} bg-white shadow-[4px_4px_0px_0px_#121212] p-5`}
    >
      <p className="text-xs font-black uppercase tracking-widest text-[#121212]/50 mb-2">{label}</p>
      <p className="text-4xl font-black tracking-tighter text-[#121212]">{value}</p>
    </div>
  )
}
