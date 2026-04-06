export default function Footer() {
  return (
    <footer className="w-full max-w-7xl mx-auto flex flex-col items-center justify-between gap-6 border-x-4 border-b-4 border-black bg-bauhaus-black p-8 text-white sm:p-12 md:flex-row">
      <div className="flex items-center gap-2 text-2xl font-black uppercase tracking-tighter">
        <div
          className="h-6 w-6 border-2 border-black bg-bauhaus-yellow"
          style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}
        />
        ZingBizz
      </div>
      <div className="flex gap-8 text-sm font-bold uppercase tracking-widest text-muted">
        <a href="#" className="underline-offset-4 hover:text-white hover:underline">
          Privacy
        </a>
        <a href="#" className="underline-offset-4 hover:text-white hover:underline">
          Terms
        </a>
        <a href="#" className="underline-offset-4 hover:text-white hover:underline">
          Contact
        </a>
      </div>
    </footer>
  );
}
