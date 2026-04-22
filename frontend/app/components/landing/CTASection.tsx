import AnimatedContent from '../AnimatedContent';
import NeoButton from '../NeoButton';
import { ArrowRight, Star } from 'lucide-react';

export default function CTASection() {
  return (
    <section className="relative w-full max-w-7xl mx-auto overflow-hidden border-x-4 border-b-4 border-black bg-[#FFD93D] px-8 py-24 text-center">
      {/* Halftone texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: 'radial-gradient(#000 1.5px, transparent 1.5px)',
          backgroundSize: '20px 20px',
        }}
      />

      {/* Corner stickers */}
      <div className="absolute top-0 left-0 h-24 w-24 border-r-4 border-b-4 border-black bg-[#FF6B6B]" />
      <div className="absolute right-0 bottom-0 h-24 w-24 border-l-4 border-t-4 border-black bg-black" />

      {/* Spinning star decorations */}
      <Star
        className="absolute top-8 right-32 h-12 w-12 fill-black text-black animate-spin-slow opacity-20"
        strokeWidth={0}
      />
      <Star
        className="absolute bottom-8 left-32 h-8 w-8 fill-black text-black animate-spin-slow opacity-20"
        strokeWidth={0}
        style={{ animationDirection: 'reverse' }}
      />

      <div className="relative z-10 mx-auto max-w-3xl">
        <AnimatedContent direction="vertical" distance={40}>
          <h2 className="mb-8 text-6xl font-black uppercase tracking-tighter md:text-8xl leading-none">
            Ready to
            <br />
            <span className="bg-[#FF6B6B] border-4 border-black px-3 inline-block shadow-[8px_8px_0px_0px_#000] -rotate-2 mt-2">
              Automate?
            </span>
          </h2>
          <p className="mb-12 text-xl font-bold max-w-lg mx-auto">
            Join thousands building powerful bots today. No fluff, just results.
          </p>
          <NeoButton variant="dark" size="lg" className="px-16 py-8 text-2xl shadow-[8px_8px_0px_0px_#FF6B6B]">
            Deploy Your Bot <ArrowRight className="ml-3 h-6 w-6" />
          </NeoButton>
        </AnimatedContent>
      </div>
    </section>
  );
}
