import AnimatedContent from '../AnimatedContent';
import FAQAccordion from '../FAQAccordion';

const FAQ_ITEMS = [
  {
    question: 'Does this require coding knowledge?',
    answer:
      'No. The interface relies entirely on visual geometric construction. Draw the logic, and the system handles the underlying syntax.',
  },
  {
    question: 'Can I export my bot flows?',
    answer:
      'Yes. All logic blocks can be serialized into JSON payloads for version control or migration at any time.',
  },
  {
    question: 'What platforms are supported natively?',
    answer:
      'We currently offer native OAuth bindings for WhatsApp Business APIs and Instagram Direct. More platforms are constantly being added to the registry.',
  },
];

export default function FAQSection() {
  return (
    <section
      id="faq"
      className="w-full max-w-7xl mx-auto border-x-4 border-black bg-bauhaus-white px-4 py-20 sm:px-6 lg:px-8 lg:py-32"
    >
      <div className="mx-auto max-w-4xl">
        <AnimatedContent direction="vertical" distance={50}>
          <h2 className="mb-12 text-center text-5xl font-black uppercase tracking-tighter md:text-6xl">
            Questions?
          </h2>
        </AnimatedContent>

        <AnimatedContent direction="vertical" distance={30} delay={0.1}>
          {FAQ_ITEMS.map((item) => (
            <FAQAccordion key={item.question} {...item} />
          ))}
        </AnimatedContent>
      </div>
    </section>
  );
}
