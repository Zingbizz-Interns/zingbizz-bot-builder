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
    imageColor: 'blue' as const,
    delay: 0.3,
  },
];

export default function TestimonialsSection() {
  return (
    <section className="w-full max-w-7xl mx-auto border-x-4 border-black bg-bauhaus-white px-4 py-20 sm:px-6 lg:px-8 lg:py-32">
      <div className="mb-16 text-center">
        <AnimatedContent direction="vertical" distance={50}>
          <h2 className="mb-6 text-5xl font-black uppercase tracking-tighter md:text-6xl">
            Functional <span className="text-bauhaus-red">Proof</span>
          </h2>
        </AnimatedContent>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
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
