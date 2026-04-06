import AnimatedContent from '../AnimatedContent';
import BauhausButton from '../BauhausButton';

export default function CTASection() {
  return (
    <section className="relative w-full max-w-7xl mx-auto overflow-hidden border-x-4 border-b-4 border-black bg-white px-8 py-24 text-center">
      <div className="absolute top-0 left-0 h-32 w-32 border-r-4 border-b-4 border-black bg-bauhaus-red" />
      <div className="absolute right-0 bottom-0 h-32 w-32 rounded-tl-full border-l-4 border-t-4 border-black bg-bauhaus-blue" />

      <div className="relative z-10 mx-auto max-w-3xl">
        <AnimatedContent direction="vertical" distance={40}>
          <h2 className="mb-8 text-6xl font-black uppercase tracking-tighter md:text-7xl">
            Ready to <br />
            <span className="text-bauhaus-red">Automate?</span>
          </h2>
          <p className="mb-12 text-xl font-medium">
            Join thousands building modern, functional bots today. No fluff, just results.
          </p>
          <BauhausButton variant="yellow" shape="square" className="px-16 py-8 text-2xl shadow-hard-lg">
            Deploy Your Bot
          </BauhausButton>
        </AnimatedContent>
      </div>
    </section>
  );
}
