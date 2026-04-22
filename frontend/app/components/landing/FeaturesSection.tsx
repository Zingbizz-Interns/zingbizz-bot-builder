import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  BarChart,
  Share2,
  Star,
  UserPlus,
  Users,
  Workflow,
  Zap,
} from 'lucide-react';
import AnimatedContent from '../AnimatedContent';
import { cn } from '../NeoButton';

type FeatureVariant = 'cream' | 'yellow' | 'red' | 'muted' | 'black';
type IconShape = 'circle' | 'square' | 'diamond';

interface Feature {
  title: string;
  description: string;
  icon: LucideIcon;
  delay: number;
  iconShape: IconShape;
  iconBg: string;
  iconColor: string;
  cardVariant?: FeatureVariant;
  className?: string;
  contentClassName?: string;
}

const FEATURES: Feature[] = [
  {
    title: 'Visual Flow Builder',
    description:
      'Construct intricate conversation pathways using our drag-and-drop structural editor. No code, pure geometric logic mapping. Instantly build, connect, and deploy complex bot behaviors.',
    icon: Workflow,
    delay: 0.1,
    iconShape: 'square',
    iconBg: 'bg-black',
    iconColor: 'text-[#FFD93D]',
    className: 'lg:col-span-3',
    contentClassName: 'md:flex-row md:items-center gap-8',
  },
  {
    title: 'Omnichannel',
    description:
      'Native OAuth bindings for WhatsApp Business APIs and Instagram Direct. Connect your platforms instantly.',
    icon: Share2,
    delay: 0.2,
    iconShape: 'circle',
    iconBg: 'bg-[#FFD93D]',
    iconColor: 'text-black',
  },
  {
    title: 'Dynamic Triggers',
    description:
      'Set exact keyword mapping or system events to trigger specific bot flows automatically and reliably.',
    icon: Zap,
    delay: 0.3,
    iconShape: 'diamond',
    iconBg: 'bg-[#FF6B6B]',
    iconColor: 'text-black',
    cardVariant: 'cream',
  },
  {
    title: 'Testing Sandbox',
    description:
      'Run simulations and test boundaries before deploying your logic to live production environments.',
    icon: Activity,
    delay: 0.4,
    iconShape: 'square',
    iconBg: 'bg-black',
    iconColor: 'text-white',
  },
  {
    title: 'Team Roles',
    description:
      'Multi-tenant architecture supporting sub-accounts. Assign strict read/edit permissions across your team.',
    icon: Users,
    delay: 0.5,
    iconShape: 'circle',
    iconBg: 'bg-[#FFFDF5]',
    iconColor: 'text-black',
    cardVariant: 'yellow',
  },
  {
    title: 'Contact CRM',
    description:
      'A built-in relational database. Track user profiles, interaction history, and contextual contact states.',
    icon: UserPlus,
    delay: 0.6,
    iconShape: 'square',
    iconBg: 'bg-[#FFD93D]',
    iconColor: 'text-black',
  },
  {
    title: 'Deep Analytics',
    description:
      'Systematic performance tracking. Measure engagement loops, drop-offs, and true visual routing success.',
    icon: BarChart,
    delay: 0.7,
    iconShape: 'square',
    iconBg: 'bg-[#FFFDF5]',
    iconColor: 'text-black',
    cardVariant: 'red',
  },
];

const cardVariantStyles: Record<FeatureVariant, string> = {
  cream:  'bg-[#FFFDF5] text-black',
  yellow: 'bg-[#FFD93D] text-black',
  red:    'bg-[#FF6B6B] text-black',
  muted:  'bg-[#C4B5FD] text-black',
  black:  'bg-black text-white',
};

function FeatureIcon({
  icon: Icon,
  iconBg,
  iconColor,
  iconShape,
}: Pick<Feature, 'icon' | 'iconBg' | 'iconColor' | 'iconShape'>) {
  const shapeClass = {
    circle:  'rounded-full',
    square:  '',
    diamond: 'rotate-12 group-hover:rotate-0 transition-transform duration-300',
  }[iconShape];

  return (
    <div
      className={cn(
        'mb-6 flex h-16 w-16 shrink-0 items-center justify-center border-4 border-black shadow-[4px_4px_0px_0px_#000]',
        iconBg,
        shapeClass
      )}
    >
      <Icon className={cn('h-8 w-8', iconColor)} strokeWidth={2.5} />
    </div>
  );
}

function FeatureCard({
  title,
  description,
  icon,
  iconShape,
  iconBg,
  iconColor,
  cardVariant = 'cream',
  contentClassName,
}: Feature) {
  return (
    <div
      className={cn(
        'group flex h-full flex-col border-4 border-black p-8 shadow-[8px_8px_0px_0px_#000]',
        'transition-transform duration-200 hover:-translate-y-2 hover:shadow-[12px_12px_0px_0px_#000]',
        cardVariantStyles[cardVariant],
        contentClassName
      )}
    >
      <FeatureIcon icon={icon} iconShape={iconShape} iconBg={iconBg} iconColor={iconColor} />
      <div>
        <h3 className="mb-3 text-2xl font-black uppercase tracking-tight md:text-3xl">{title}</h3>
        <p className="font-bold leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

export default function FeaturesSection() {
  return (
    <section
      id="features"
      className="w-full max-w-7xl mx-auto border-x-4 border-black bg-[#FFFDF5] px-4 py-20 sm:px-6 lg:px-8 lg:py-32"
    >
      {/* Section header */}
      <div className="mb-16">
        <AnimatedContent direction="vertical" distance={50}>
          <div className="flex items-start gap-4">
            <Star className="h-8 w-8 fill-[#FF6B6B] text-[#FF6B6B] shrink-0 mt-2 animate-spin-slow" strokeWidth={0} />
            <div>
              <h2 className="text-5xl font-black uppercase tracking-tighter md:text-7xl leading-none">
                Complete <br />
                <span className="bg-[#FF6B6B] border-4 border-black px-2 inline-block shadow-[6px_6px_0px_0px_#000] rotate-1">
                  Control
                </span>
              </h2>
              <p className="mt-4 max-w-2xl text-lg font-bold">
                Everything you need to manage your automation empire from a single dashboard.
              </p>
            </div>
          </div>
        </AnimatedContent>
      </div>

      <div className="grid auto-rows-fr grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <AnimatedContent
            key={feature.title}
            direction="vertical"
            distance={40}
            delay={feature.delay}
            className={feature.className}
          >
            <FeatureCard {...feature} />
          </AnimatedContent>
        ))}
      </div>
    </section>
  );
}
