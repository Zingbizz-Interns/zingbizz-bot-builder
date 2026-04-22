export default function Footer() {
  return (
    <footer className="w-full max-w-7xl mx-auto flex flex-col items-center justify-between gap-6 border-x-4 border-b-4 border-black bg-black p-8 text-white sm:p-12 md:flex-row">
      {/* Brand */}
      <div className="flex items-center gap-3 text-2xl font-black uppercase tracking-tighter">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-full bg-[#FF6B6B] border-2 border-white" />
          <div className="w-4 h-4 bg-[#FFD93D] border-2 border-white" />
          <div
            className="w-4 h-4 bg-[#C4B5FD] border-2 border-white"
            style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}
          />
        </div>
        ZingBizz
      </div>

      {/* Links */}
      <div className="flex gap-8 text-sm font-bold uppercase tracking-widest text-white/50">
        <a href="#" className="hover:text-white underline-offset-4 hover:underline transition-colors">
          Privacy
        </a>
        <a href="#" className="hover:text-white underline-offset-4 hover:underline transition-colors">
          Terms
        </a>
        <a href="#" className="hover:text-white underline-offset-4 hover:underline transition-colors">
          Contact
        </a>
      </div>

      {/* Copyright */}
      <p className="text-xs font-bold uppercase tracking-widest text-white/30">
        © {new Date().getFullYear()} ZingBizz
      </p>
    </footer>
  );
}
