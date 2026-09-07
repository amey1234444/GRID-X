import styles from './operating-principles.module.css';

/*
 * The five operating principles, drawn as one continuous timeline rather than a
 * row of equal cards.
 *
 * The cards alternate above and below the line so the eye is pulled along it,
 * and a light runs the path end to end — the section argues that one record
 * carries the work from released drawing to approved payment, so the artwork
 * has to read as a single unbroken run rather than five separate claims.
 *
 * Layout is absolute against the 1672 x 941 canvas the composition was drawn
 * on; see the module stylesheet for how it collapses below 980px.
 */

function LayersIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path d="M12 3 3.75 7.35 12 11.7l8.25-4.35L12 3Z" />
      <path d="m4.65 11.1 7.35 3.9 7.35-3.9" />
      <path d="m4.65 15.45 7.35 3.9 7.35-3.9" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <rect x="5.4" y="9.3" width="13.2" height="10.5" rx="1.7" />
      <path d="M8.1 9.3V6.9a3.9 3.9 0 0 1 7.8 0v2.4" />
      <path d="M12 13.1v2.9" />
    </svg>
  );
}

function EvidenceIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <rect x="5.3" y="4.8" width="13.4" height="15" rx="1.8" />
      <path d="M9.1 4.8V3.5h5.8v1.3" />
      <path d="m8.6 12 2.2 2.2 4.6-4.6" />
    </svg>
  );
}

function GaugeIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path d="M4.1 17.5a8.4 8.4 0 1 1 15.8 0" />
      <path d="m12 13.1 4.2-4.1" />
      <circle cx="12" cy="13.1" r="1" />
    </svg>
  );
}

function WalletIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path d="M4.2 6.6h12.1a2 2 0 0 1 2 2v10H5.7a2.4 2.4 0 0 1-2.4-2.4V7.8a3.1 3.1 0 0 1 3.1-3.1h9.1" />
      <path d="M15.2 11h4.2v4.2h-4.2a2.1 2.1 0 0 1 0-4.2Z" />
      <circle cx="15.8" cy="13.1" r=".45" />
    </svg>
  );
}

const principles = [
  {
    number: '01',
    eyebrow: 'RECORD',
    title: 'One record',
    copy: 'Every module writes to one shared job record.',
    Icon: LayersIcon,
    position: styles.cardOne,
  },
  {
    number: '02',
    eyebrow: 'CONTROL',
    title: 'Controlled by default',
    copy: 'Access stays scoped, time-bound and observable.',
    Icon: LockIcon,
    position: styles.cardTwo,
  },
  {
    number: '03',
    eyebrow: 'EVIDENCE',
    title: 'Evidence at each gate',
    copy: 'Work advances only on recorded evidence.',
    Icon: EvidenceIcon,
    position: styles.cardThree,
  },
  {
    number: '04',
    eyebrow: 'SCORE',
    title: 'Continuously scored',
    copy: 'Partner performance updates as work happens.',
    Icon: GaugeIcon,
    position: styles.cardFour,
  },
  {
    number: '05',
    eyebrow: 'PAYMENT',
    title: 'Audited to payment',
    copy: 'Every decision remains traceable through payment.',
    Icon: WalletIcon,
    position: styles.cardFive,
  },
];

/*
 * One path, used three times: as the dim base line, as the travelling light
 * (via stroke-dasharray) and as the motion track for the dot (via mpath). They
 * cannot drift apart because there is only one `d` to change.
 */
const FLOW_PATH =
  'M -20 622 C 160 656 318 548 514 548 C 676 548 724 650 829 615 C 929 582 958 527 1107 560 C 1248 591 1322 619 1450 603 C 1541 592 1605 566 1692 560';

/** Where the numbered markers sit on the path, and where each card drops its connector. */
const nodes = [
  { n: '01', x: 191, y: 622, connector: 'M191 557 L191 622' },
  { n: '02', x: 519, y: 548, connector: 'M519 601 L519 548' },
  { n: '03', x: 829, y: 615, connector: 'M829 550 L829 615' },
  { n: '04', x: 1108, y: 559, connector: 'M1108 609 L1108 559' },
  { n: '05', x: 1451, y: 603, connector: 'M1451 540 L1451 603' },
];

export function OperatingPrinciples(): React.JSX.Element {
  return (
    <section className={styles.section} aria-labelledby="operating-principles-title">
      <div className={styles.backgroundGrid} aria-hidden />

      <div className={styles.stage}>
        <header className={styles.header}>
          <div className={styles.kicker}>
            <span>OPERATING PRINCIPLES</span>
            <span className={styles.kickerRule} />
          </div>

          <h2 id="operating-principles-title" className={styles.title}>
            One system. No private versions
            <br />
            of the truth.
          </h2>

          <p className={styles.subtitle}>
            From released drawing to approved payment, every action
            <br />
            remains attached to the same record.
          </p>
        </header>

        <aside className={styles.sideNote} aria-label="Principle summary">
          <span className={styles.sideNoteRule} />
          <div>
            <span>SAME RECORD</span>
            <span>GREATER CLARITY</span>
            <span>REAL PROGRESS</span>
          </div>
        </aside>

        <svg
          className={styles.flow}
          viewBox="0 0 1672 941"
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <filter id="op-runner-softness" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="2.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <path className={styles.flowBase} d={FLOW_PATH} />

          {/* pathLength normalises the dash to the path, so the light keeps its
              length at any rendered width. */}
          <path
            id="operating-principles-flow"
            className={styles.flowRunner}
            d={FLOW_PATH}
            pathLength="1000"
          />

          {nodes.map((node) => (
            <path key={`connector-${node.n}`} className={styles.connector} d={node.connector} />
          ))}

          {nodes.map((node) => (
            <g key={node.n} className={styles.node}>
              <circle cx={node.x} cy={node.y} r="20.2" />
              <text x={node.x} y={node.y + 4.3} textAnchor="middle">
                {node.n}
              </text>
            </g>
          ))}

          <circle className={styles.runnerDot} r="4.2" filter="url(#op-runner-softness)">
            <animateMotion dur="7.8s" repeatCount="indefinite" rotate="auto">
              <mpath href="#operating-principles-flow" />
            </animateMotion>
          </circle>
        </svg>

        <div className={styles.cards}>
          {principles.map(({ number, eyebrow, title, copy, Icon, position }) => (
            <article key={number} className={`${styles.card} ${position}`} tabIndex={0}>
              <div className={styles.cardTop}>
                <div className={styles.iconBox}>
                  <Icon className={styles.icon} />
                </div>
                <span className={styles.cardNumber}>{number}</span>
              </div>

              <span className={styles.cardEyebrow}>{eyebrow}</span>
              <h3>{title}</h3>
              <p>{copy}</p>

              <div className={styles.hoverArrow} aria-hidden>
                &#8599;
              </div>
            </article>
          ))}
        </div>

        <div className={styles.bottomLeft} aria-hidden>
          <span className={styles.smallRule} />
          <span>A MORE</span>
          <span>OPEN BUILT ENVIRONMENT</span>
        </div>

        <div className={styles.bottomRight} aria-hidden>
          <span className={styles.verticalRule} />
          <div>
            <span>SAME WORK.</span>
            <span>A CLEARER TOMORROW.</span>
          </div>
        </div>
      </div>
    </section>
  );
}
