export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FFFDF5] flex">

      {/* Left — Neo-Brutalist brand panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#FF6B6B] border-r-4 border-black relative overflow-hidden flex-col justify-between p-12">

        {/* Halftone texture */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(#000 1.5px, transparent 1.5px)',
            backgroundSize: '20px 20px',
          }}
        />

        {/* Geometric floating shapes */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Large yellow square */}
          <div className="absolute w-56 h-56 border-4 border-black bg-[#FFD93D] shadow-[8px_8px_0px_0px_#000] rotate-12 top-12 right-8" />
          {/* Muted violet circle */}
          <div className="absolute w-40 h-40 rounded-full border-4 border-black bg-[#C4B5FD] shadow-[6px_6px_0px_0px_#000] bottom-32 left-8" />
          {/* Black square sticker */}
          <div className="absolute w-24 h-24 border-4 border-black bg-black bottom-12 right-20 -rotate-6" />
          {/* Cream small square */}
          <div className="absolute w-16 h-16 border-4 border-black bg-[#FFFDF5] top-1/2 left-1/3 rotate-3" />
        </div>

        {/* Brand mark */}
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-5 h-5 rounded-full bg-black border-2 border-black" />
            <div className="w-5 h-5 bg-[#FFD93D] border-2 border-black" />
            <div
              className="w-5 h-5 border-2 border-black"
              style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)', backgroundColor: '#C4B5FD' }}
            />
          </div>
          <div className="border-4 border-black bg-black inline-block px-4 py-2 shadow-[8px_8px_0px_0px_#FFD93D] -rotate-1">
            <h1 className="text-5xl font-black uppercase tracking-tighter text-white leading-none">
              BOT<br />BUILDER
            </h1>
          </div>
          <p className="text-black font-black mt-6 text-sm uppercase tracking-widest">
            WhatsApp &amp; Instagram Platform
          </p>
        </div>

        {/* Bottom tagline */}
        <div className="relative z-10">
          <div className="border-t-4 border-black pt-6">
            <p className="text-black font-black uppercase tracking-wider text-sm">
              Build. Deploy. Automate.
            </p>
            <p className="text-black/60 text-sm font-bold mt-1">
              Configure your chatbot without a single line of code.
            </p>
          </div>
        </div>
      </div>

      {/* Right — Form area */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#FFFDF5]">
        <div className="w-full max-w-md">
          {/* Mobile brand */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-4 h-4 rounded-full bg-[#FF6B6B] border-2 border-black" />
            <div className="w-4 h-4 bg-[#FFD93D] border-2 border-black" />
            <div
              className="w-4 h-4 border-2 border-black"
              style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)', backgroundColor: '#C4B5FD' }}
            />
            <span className="text-lg font-black uppercase tracking-tighter text-black ml-1">
              BotBuilder
            </span>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
