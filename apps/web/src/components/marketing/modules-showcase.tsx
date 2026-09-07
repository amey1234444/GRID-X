'use client';

import { useState, type CSSProperties } from 'react';

import styles from './modules-showcase.module.css';

/*
 * The modules, presented as the order the work actually moves in.
 *
 * The six cards alternate dark and warm white. That is the point of the
 * composition rather than decoration: six identical dark panels in a 3 x 2 grid
 * read as a feature checklist, and the section is trying to say these are
 * consecutive stages of one job. The alternation gives the eye a rhythm to
 * follow across and down.
 *
 * The timeline above them is the same six stages. Hovering or focusing a card
 * lights its stage, and clicking a stage lights its card, so the two halves are
 * one control rather than a picture with a list underneath.
 *
 * Content comes in as props. The platform page already holds the module copy
 * and the live record rows that the explorer further down the page renders, and
 * two hand-maintained copies of that would drift within a release.
 */

export type ShowcaseMetric = {
  label: string;
  value: string;
  /** Renders the value in the positive tint and fills the status dot. */
  good?: boolean;
};

export type ShowcaseModule = {
  /** Anchor of the matching card in the explorer below — the card links to it. */
  id: string;
  index: string;
  label: string;
  /** The one word this stage is known by on the timeline. */
  timelineLabel: string;
  title: string;
  description: string;
  image: string;
  metrics: ShowcaseMetric[];
};

function BlueprintWireframe(): React.JSX.Element {
  return (
    <svg className={styles.blueprint} viewBox="0 0 720 310" fill="none" aria-hidden>
      <g opacity=".76">
        <path d="M50 220 248 88l248 88-198 121L50 220Z" />
        <path d="M248 88v104m0 0 248-16M248 192 50 220m198-28 50 105" />
        <path d="M113 189 247 118l178 61-132 78-180-68Z" />
        <path d="M144 171v55m70-92v113m92-95v91m60-71v53" />
        <rect x="174" y="148" width="116" height="72" rx="2" />
        <circle cx="232" cy="184" r="25" />
        <circle cx="232" cy="184" r="12" />
        <path d="M174 148 228 116l115 40-53 31m53-31v72" />
        <path d="m297 297 56-35 91 31-57 35" />
        <path d="M495 176 610 116m-115 60 73 26 106-55" />
        <circle cx="574" cy="132" r="29" />
        <circle cx="574" cy="132" r="15" />
      </g>
    </svg>
  );
}

function ArrowIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  );
}

export function ModulesShowcase({ modules }: { modules: ShowcaseModule[] }): React.JSX.Element {
  const [active, setActive] = useState(0);

  return (
    <section className={styles.section} aria-labelledby="modules-heading">
      <div className={styles.ambient} aria-hidden />
      <div className={styles.grid} aria-hidden />
      <div className={styles.noise} aria-hidden />

      <div className={styles.inner}>
        <header className={styles.hero}>
          <div className={styles.heroContent}>
            <p className={styles.kicker}>FROM DECISION TO PAYMENT</p>

            <h2 id="modules-heading" className={styles.heading}>
              The modules
            </h2>

            <p className={styles.intro}>
              Listed in the order the work actually moves — from the
              <br className={styles.desktopBreak} />
              decision to outsource through to the payment that closes it.
            </p>
          </div>

          <div className={styles.heroPhoto} aria-hidden>
            <div className={styles.heroPhotoImage} />
          </div>

          <BlueprintWireframe />

          <div className={styles.heroMeta}>
            <span className={styles.metaRule} />
            <p>
              A MORE
              <br />
              CONNECTED
              <br />
              SUPPLY CHAIN
            </p>
            <span className={styles.metaDash} />
          </div>

          <p className={styles.processLabel}>
            PEOPLE&nbsp;&nbsp;/&nbsp;&nbsp;PROCESS&nbsp;&nbsp;/&nbsp;&nbsp;PROGRESS
          </p>

          <div className={styles.flowQuote} aria-hidden>
            <span />
            <em>
              A smoother
              <br />
              flow forward
            </em>
          </div>
        </header>

        <div className={styles.timelineWrap}>
          <svg
            className={styles.timelineMotion}
            viewBox="0 0 1000 32"
            preserveAspectRatio="none"
            aria-hidden
          >
            <defs>
              <linearGradient id="modules-pulse-gradient" x1="0" x2="1">
                <stop offset="0" stopColor="#c18b4f" stopOpacity="0" />
                <stop offset=".45" stopColor="#e9b879" stopOpacity=".45" />
                <stop offset=".6" stopColor="#fff3dc" stopOpacity="1" />
                <stop offset="1" stopColor="#c18b4f" stopOpacity="0" />
              </linearGradient>
              <filter
                id="modules-pulse-glow"
                x="-50%"
                y="-100%"
                width="200%"
                height="300%"
              >
                <feGaussianBlur stdDeviation="2.2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <line className={styles.timelineBaseSvg} x1="12" y1="16" x2="988" y2="16" />
            {/* The dash and the dot share this path, so the light and the point
                travelling with it can never fall out of step. */}
            <path
              id="modules-flow-path"
              className={styles.timelinePulse}
              pathLength="1000"
              d="M12 16H988"
            />
            <circle r="3.2" className={styles.timelineDot} filter="url(#modules-pulse-glow)">
              <animateMotion dur="6.8s" repeatCount="indefinite">
                <mpath href="#modules-flow-path" />
              </animateMotion>
            </circle>
          </svg>

          <ol className={styles.timeline} aria-label="Module workflow">
            {modules.map((item, index) => (
              <li
                key={item.id}
                className={active === index ? styles.timelineActive : undefined}
              >
                <button
                  type="button"
                  onClick={() => setActive(index)}
                  aria-label={`Highlight ${item.title}`}
                >
                  <span className={styles.timelineIndex}>{item.index}</span>
                  <span className={styles.timelineNode} />
                  <span className={styles.timelineName}>{item.timelineLabel}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>

        <div className={styles.cards}>
          {modules.map((item, index) => {
            const cardStyle = {
              '--card-art': `url("${item.image}")`,
              '--delay': `${index * 65}ms`,
            } as CSSProperties;

            return (
              <article
                key={item.id}
                className={[
                  styles.card,
                  index % 2 === 0 ? styles.dark : styles.light,
                  active === index ? styles.activeCard : '',
                ].join(' ')}
                style={cardStyle}
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
              >
                <div className={styles.cardArt} aria-hidden />

                <div className={styles.cardHeader}>
                  <span className={styles.cardIndex}>{item.index}</span>
                  <span className={styles.moduleTag}>/ &nbsp; {item.label}</span>
                </div>

                <h3>{item.title}</h3>
                <p className={styles.description}>{item.description}</p>

                <div className={styles.divider} />

                <dl className={styles.metrics}>
                  {item.metrics.map((metric) => (
                    <div className={styles.metric} key={metric.label}>
                      <dt>
                        <span
                          className={[styles.statusDot, metric.good ? styles.statusGood : ''].join(
                            ' ',
                          )}
                          aria-hidden
                        />
                        {metric.label}
                      </dt>
                      <dd className={metric.good ? styles.goodValue : undefined}>{metric.value}</dd>
                    </div>
                  ))}
                </dl>

                <div className={styles.cardFooter}>
                  <a href={`#${item.id}`}>
                    <span>View technical spec</span>
                    <span className={styles.inlineArrow}>&rarr;</span>
                  </a>

                  <a
                    className={styles.roundArrow}
                    href={`#${item.id}`}
                    aria-label={`Open ${item.title}`}
                  >
                    <ArrowIcon />
                  </a>
                </div>
              </article>
            );
          })}
        </div>

        <footer className={styles.footer}>
          <span>SIX MODULES. A CLEARER TOMORROW.</span>
          <span className={styles.footerLine} />
          <span>BUILT FOR WHAT&apos;S NEXT.</span>
        </footer>
      </div>
    </section>
  );
}
