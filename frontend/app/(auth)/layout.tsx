export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F0F0F0] flex">

      {/* Left — Geometric composition panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1040C0] border-r-4 border-[#121212] relative overflow-hidden flex-col justify-between p-12">

        {/* Dot grid texture */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(#fff 2px, transparent 2px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Geometric composition */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Large circle */}
          <div className="absolute w-64 h-64 rounded-full border-4 border-white/30 top-16 left-8" />
          {/* Rotated square */}
          <div className="absolute w-48 h-48 border-4 border-[#F0C020] rotate-45 bottom-20 right-12" />
          {/* Small red square */}
          <div className="absolute w-20 h-20 bg-[#D02020] border-4 border-[#121212] bottom-40 left-20" />
          {/* Medium yellow circle */}
          <div className="absolute w-32 h-32 rounded-full bg-[#F0C020]/20 border-4 border-[#F0C020]/50 top-1/2 right-8" />
        </div>

        {/* Brand */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-4 h-4 rounded-full bg-[#D02020] border-2 border-white" />
            <div className="w-4 h-4 bg-[#F0C020] border-2 border-white" />
            <div
              className="w-4 h-4 border-2 border-white"
              style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)', backgroundColor: 'white' }}
            />
          </div>
          <h1 className="text-5xl font-black uppercase tracking-tighter text-white leading-[0.9]">
            BOT<br />BUILDER
          </h1>
          <p className="text-white/70 font-medium mt-4 text-sm uppercase tracking-widest">
            WhatsApp & Instagram Platform
          </p>
        </div>

        {/* Bottom tagline */}
        <div className="relative z-10">
          <div className="border-t-4 border-white/30 pt-6">
            <p className="text-white font-bold uppercase tracking-wider text-sm">
              Build. Deploy. Automate.
            </p>
            <p className="text-white/60 text-sm font-medium mt-1">
              Configure your chatbot without a single line of code.
            </p>
          </div>
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile brand */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-3 h-3 rounded-full bg-[#D02020] border-2 border-[#121212]" />
            <div className="w-3 h-3 bg-[#F0C020] border-2 border-[#121212]" />
            <div
              className="w-3 h-3 border-2 border-[#121212]"
              style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)', backgroundColor: '#1040C0' }}
            />
            <span className="text-lg font-black uppercase tracking-tighter text-[#121212] ml-1">BotBuilder</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
