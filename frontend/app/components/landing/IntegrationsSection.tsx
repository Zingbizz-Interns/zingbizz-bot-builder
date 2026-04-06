import type { LucideIcon } from 'lucide-react';
import { MessageCircle, Share2 } from 'lucide-react';
import AnimatedContent from '../AnimatedContent';
import MagnetLines from '../MagnetLines';
import { cn } from '../BauhausButton';

interface IntegrationItem {
  label: string;
  icon?: LucideIcon;
  rounded?: 'full' | 'none';
}

const INTEGRATIONS: IntegrationItem[] = [
  { label: 'WhatsApp', icon: MessageCircle, rounded: 'full' },
  { label: 'API', rounded: 'none' },
  { label: 'Instagram', icon: Share2, rounded: 'full' },
];

function IntegrationIcon({ label, icon: Icon, rounded = 'full' }: IntegrationItem) {
  return (
    <div
      aria-label={label}
      className={cn(
        'flex h-24 w-24 cursor-pointer items-center justify-center border-4 border-black bg-muted shadow-hard-sm transition-transform hover:scale-110',
        rounded === 'full' ? 'rounded-full' : 'rounded-none'
      )}
    >
      {Icon ? (
        <Icon className="h-10 w-10 text-black" fill={label === 'WhatsApp' ? 'currentColor' : undefined} strokeWidth={label === 'WhatsApp' ? 1 : 2} />
      ) : (
        <span className="text-2xl font-black uppercase">{label}</span>
      )}
    </div>
  );
}

export default function IntegrationsSection() {
  return (
    <section className="relative flex min-h-[600px] w-full items-center justify-center overflow-hidden border-y-4 border-black bg-bauhaus-black">
      <div className="absolute inset-0 opacity-40">
        <MagnetLines
          rows={12}
          columns={12}
          containerSize="100%"
          lineColor="#F0C020"
          lineWidth="4px"
          lineHeight="40px"
        />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl border-4 border-black bg-white px-6 py-24 text-center shadow-accent-red-xl">
        <AnimatedContent direction="vertical" distance={40}>
          <h2 className="mb-6 text-5xl font-black uppercase tracking-tighter md:text-6xl">
            Universal <span className="text-bauhaus-blue">Binding</span>
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-lg font-medium">
            Seamlessly construct endpoints with the platforms that matter.
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
