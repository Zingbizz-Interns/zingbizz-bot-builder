import AnimatedContent from '../AnimatedContent';
import TestimonialCard from '../TestimonialCard';

const TESTIMONIALS = [
  {
    quote:
      'ZingBizz removed the friction entirely. We constructed our sales flow using geometric logic, and conversion spiked by 40%. Pure function.',
    author: 'Mark V.',
    role: 'Head of Growth',
    imageColor: 'red' as const,
    delay: 0.1,
  },
  {
    quote:
      'The absence of clutter is staggering. We no longer write backend routing; we simply draw the pathways and let the system execute.',
    author: 'Elena G.',
    role: 'Technical Director',
    imageColor: 'muted' as const,
    delay: 0.3,
  },
];

export default function TestimonialsSection() {
  return (
    <section className="w-full max-w-7xl mx-auto border-x-4 border-black bg-[#FFD93D] px-4 py-20 sm:px-6 lg:px-8 lg:py-32">
      {/* Grid texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundSize: '40px 40px',
          backgroundImage:
            'linear-gradient(to right, rgba(0,0,0,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.15) 1px, transparent 1px)',
        }}
      />

      <div className="relative mb-16">
        <AnimatedContent direction="vertical" distance={50}>
          <h2 className="text-5xl font-black uppercase tracking-tighter md:text-7xl leading-none -rotate-1 inline-block">
            Functional{' '}
            <span className="bg-[#FF6B6B] border-4 border-black px-2 inline-block shadow-[6px_6px_0px_0px_#000] rotate-2">
              Proof
            </span>
          </h2>
        </AnimatedContent>
      </div>

      <div className="relative grid gap-8 md:grid-cols-2">
        {TESTIMONIALS.map((testimonial) => (
          <AnimatedContent
            key={testimonial.author}
            direction="vertical"
            distance={50}
            delay={testimonial.delay}
          >
            <TestimonialCard {...testimonial} />
          </AnimatedContent>
        ))}
      </div>
    </section>
  );
}
