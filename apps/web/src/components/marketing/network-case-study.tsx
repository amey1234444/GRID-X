import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CircleCheck } from 'lucide-react';

const metrics = [
  { value: '20', label: 'operational modules' },
  { value: '13', label: 'controlled role profiles' },
  { value: '4', label: 'evidence gates' },
  { value: '1', label: 'connected record' },
];

export function NetworkCaseStudy(): React.JSX.Element {
  return (
    <article className="network-case-card relative isolate min-h-[720px] overflow-hidden rounded-[22px] p-6 text-[#111] sm:p-10 lg:p-14">
      <Image
        src="/media/gridx-network-case-study.webp"
        alt="A connected precision manufacturing facility with CNC cells and material handling"
        fill
        priority={false}
        sizes="(max-width: 1024px) 100vw, 1400px"
        className="network-case-media object-cover object-center"
      />
      <div className="network-case-scrim absolute inset-0" aria-hidden />

      <div className="relative z-10 flex items-center justify-between gap-4">
        <span className="font-mono text-[0.5625rem] uppercase tracking-[0.13em] text-black/52">
          Controlled transaction / 01
        </span>
        <span className="hidden items-center gap-2 rounded-full border border-black/12 bg-white/45 px-3 py-1.5 font-mono text-[0.5rem] uppercase tracking-[0.1em] text-black/58 backdrop-blur-md sm:flex">
          <CircleCheck className="h-3 w-3" /> Evidence chain intact
        </span>
      </div>

      <div className="relative z-10 mt-14 max-w-[720px] sm:mt-20">
        <h2 className="max-w-[680px] text-balance font-display text-[clamp(2.75rem,5.4vw,5rem)] font-medium leading-[0.96] tracking-[-0.055em]">
          From issued job to verified payment.
        </h2>
        <p className="mt-7 max-w-lg text-[0.9375rem] leading-7 text-black/62">
          Every allocation, released revision, material movement, inspection and approval travels
          with the same operational record.
        </p>
        <Link
          href="/platform#modules"
          className="mt-8 inline-flex h-11 items-center gap-2 rounded-full bg-[#111] px-5 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
        >
          Explore the control flow <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <dl className="relative z-10 mt-20 grid gap-2 sm:grid-cols-2 lg:absolute lg:bottom-10 lg:left-10 lg:right-10 lg:grid-cols-4 xl:left-14 xl:right-14">
        {metrics.map((metric, index) => (
          <div
            key={metric.label}
            className="network-case-metric min-h-[145px] rounded-[16px] border border-black/10 bg-[#efefec]/88 p-5 backdrop-blur-md sm:p-6"
          >
            <div className="flex items-start justify-between">
              <dt className="max-w-[11rem] text-[0.6875rem] font-medium leading-5 text-black/58">
                {metric.label}
              </dt>
              <span className="font-mono text-[0.5rem] tracking-[0.12em] text-black/28">
                0{index + 1}
              </span>
            </div>
            <dd className="mt-7 text-[clamp(2.4rem,4vw,4rem)] font-light leading-none tracking-[-0.055em]">
              {metric.value}
            </dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
