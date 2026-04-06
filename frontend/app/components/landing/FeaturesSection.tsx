import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  BarChart,
  Share2,
  UserPlus,
  Users,
  Workflow,
  Zap,
} from 'lucide-react';
import AnimatedContent from '../AnimatedContent';
import { cn } from '../BauhausButton';

type FeatureVariant = 'default' | 'blue' | 'red';
type IconShape = 'circle' | 'square' | 'diamond' | 'arch';

interface Feature {
  title: string;
  description: string;
  icon: LucideIcon;
  delay: number;
  iconShape: IconShape;
  iconColor: string;
  iconClassName: string;
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
    iconColor: 'text-white',
    iconClassName: 'bg-bauhaus-blue',
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
    iconColor: 'text-black',
    iconClassName: 'bg-bauhaus-yellow',
  },
  {
    title: 'Dynamic Triggers',
    description:
      'Set exact keyword mapping or system events to trigger specific bot flows automatically and reliably.',
    icon: Zap,
    delay: 0.3,
    iconShape: 'diamond',
    iconColor: 'text-white',
    iconClassName: 'bg-bauhaus-red',
  },
  {
    title: 'Testing Sandbox',
    description:
      'Run simulations and test boundaries before deploying your logic to live production environments.',
    icon: Activity,
    delay: 0.4,
    iconShape: 'square',
    iconColor: 'text-white',
    iconClassName: 'bg-bauhaus-black',
  },
  {
    title: 'Team Roles',
    description:
      'Multi-tenant architecture supporting sub-accounts. Assign strict read/edit permissions across your team.',
    icon: Users,
    delay: 0.5,
    iconShape: 'circle',
    iconColor: 'text-black',
    iconClassName: 'bg-white',
    cardVariant: 'blue',
  },
  {
    title: 'Contact CRM',
    description:
      'A built-in relational database. Track user profiles, interaction history, and contextual contact states.',
    icon: UserPlus,
    delay: 0.6,
    iconShape: 'arch',
    iconColor: 'text-black',
    iconClassName: 'bg-bauhaus-yellow',
  },
  {
    title: 'Deep Analytics',
    description:
      'Systematic performance tracking. Measure engagement loops, drop-offs, and true visual routing success.',
    icon: BarChart,
    delay: 0.7,
    iconShape: 'square',
    iconColor: 'text-black',
    iconClassName: 'bg-white shadow-hard-sm',
    cardVariant: 'red',
  },
];

function FeatureIcon({
  icon: Icon,
  iconColor,
  iconClassName,
  iconShape,
}: Pick<Feature, 'icon' | 'iconColor' | 'iconClassName' | 'iconShape'>) {
  const shapeClassName = {
    circle: 'rounded-full',
    square: '',
    diamond: 'rotate-12 transition-transform group-hover:rotate-0',
    arch: 'rounded-r-full border-l-0',
  }[iconShape];

  return (
    <div
      className={cn(
        'mb-6 flex h-16 w-16 items-center justify-center border-4 border-black',
        iconClassName,
        shapeClassName
      )}
    >
      <Icon className={cn('h-8 w-8', iconColor)} strokeWidth={2} />
    </div>
  );
}

function FeatureCard({
  title,
  description,
  icon,
  iconShape,
  iconColor,
  iconClassName,
  cardVariant = 'default',
  contentClassName,
}: Feature) {
  const cardStyles = {
    default: 'bg-white text-black',
    blue: 'bg-bauhaus-blue text-white',
    red: 'bg-bauhaus-red text-white',
  }[cardVariant];

  const descriptionStyles = cardVariant === 'default' ? 'text-gray-700' : 'text-white/90';

  return (
    <div
      className={cn(
        'group flex h-full flex-col border-4 border-black p-8 shadow-hard-lg transition-transform duration-300 hover:-translate-y-2',
        cardStyles,
        contentClassName
      )}
    >
      <FeatureIcon
        icon={icon}
        iconShape={iconShape}
        iconColor={iconColor}
        iconClassName={iconClassName}
      />
      <div>
        <h3 className="mb-3 text-2xl font-black uppercase md:text-3xl">{title}</h3>
        <p className={cn('font-medium leading-relaxed', descriptionStyles)}>{description}</p>
      </div>
    </div>
  );
}

export default function FeaturesSection() {
  return (
    <section
      id="features"
      className="w-full max-w-7xl mx-auto border-x-4 border-black bg-bauhaus-white px-4 py-20 sm:px-6 lg:px-8 lg:py-32"
    >
      <div className="mb-16 text-center">
        <AnimatedContent direction="vertical" distance={50}>
          <h2 className="mb-6 text-5xl font-black uppercase tracking-tighter md:text-6xl">
            Complete <span className="text-bauhaus-red">Control</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg font-medium">
            Everything you need to manage your automation empire from a single dashboard.
          </p>
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
