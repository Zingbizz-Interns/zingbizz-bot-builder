import type { LucideIcon } from 'lucide-react';
import { MessageCircle, Share2 } from 'lucide-react';
import AnimatedContent from '../AnimatedContent';
import MagnetLines from '../MagnetLines';
import { cn } from '../NeoButton';

interface IntegrationItem {
  label: string;
  icon?: LucideIcon;
  rounded?: 'full' | 'none';
  bg?: string;
}

const INTEGRATIONS: IntegrationItem[] = [
  { label: 'WhatsApp', icon: MessageCircle, rounded: 'full', bg: 'bg-[#FFD93D]' },
  { label: 'API',      rounded: 'none',   bg: 'bg-[#C4B5FD]' },
  { label: 'Instagram', icon: Share2,    rounded: 'none',   bg: 'bg-[#FF6B6B]' },
];

function IntegrationIcon({ label, icon: Icon, rounded = 'full', bg = 'bg-[#FFFDF5]' }: IntegrationItem) {
  return (
    <div
      aria-label={label}
      className={cn(
        'flex h-24 w-24 cursor-pointer items-center justify-center border-4 border-black shadow-[6px_6px_0px_0px_#000] transition-transform duration-100 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
        bg,
        rounded === 'full' ? 'rounded-full' : 'rounded-none'
      )}
    >
      {Icon ? (
        <Icon
          className="h-10 w-10 text-black"
          fill={label === 'WhatsApp' ? 'currentColor' : undefined}
          strokeWidth={label === 'WhatsApp' ? 1 : 2.5}
        />
      ) : (
        <span className="text-2xl font-black uppercase">{label}</span>
      )}
    </div>
  );
}

export default function IntegrationsSection() {
  return (
    <section className="relative flex min-h-[600px] w-full items-center justify-center overflow-hidden border-y-4 border-black bg-black">
      {/* MagnetLines background */}
      <div className="absolute inset-0 opacity-30">
        <MagnetLines
          rows={12}
          columns={12}
          containerSize="100%"
          lineColor="#FFD93D"
          lineWidth="4px"
          lineHeight="40px"
        />
      </div>

      {/* Card */}
      <div className="relative z-10 mx-auto max-w-4xl border-4 border-black bg-[#FFFDF5] px-6 py-24 text-center shadow-[16px_16px_0px_0px_#FF6B6B]">
        <AnimatedContent direction="vertical" distance={40}>
          <h2 className="mb-4 text-5xl font-black uppercase tracking-tighter md:text-7xl leading-none">
            Universal
            <br />
            <span className="bg-[#FFD93D] border-4 border-black px-2 inline-block shadow-[4px_4px_0px_0px_#000] -rotate-1">
              Binding
            </span>
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-lg font-bold">
            Seamlessly connect to the platforms your customers live on.
          </p>

          <div className="flex flex-wrap justify-center gap-8">
            {INTEGRATIONS.map((item) => (
              <IntegrationIcon key={item.label} {...item} />
            ))}
          </div>
        </AnimatedContent>
      </div>
    </section>
  );
}
