'use client';

import { useEffect, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { productModules, moduleRows } from './content';

const summaries: Record<string, string> = {
  allocation:
    'Match the job to a partner with the capability, capacity and approval to deliver it.',
  drawings: 'Put the released revision in the right hands, with access tied to the assigned job.',
  material:
    'Follow material from issue to consumption, scrap and return. Keep every difference visible.',
  quality: 'Connect measured results, acceptance and rework to the lot that needs the decision.',
  payments:
    'Bring accepted quantity, agreed rates and reconciled material together before approval.',
  insight: 'Read performance from the same operational records that move your jobs forward.',
};
const labels = ['Allocation', 'Drawings', 'Material', 'Quality', 'Payments', 'Reporting'];

export function ModuleExplorer(): React.JSX.Element {
  const [selected, setSelected] = useState(productModules[0].id);
  useEffect(() => {
    const sync = () => {
      const id = window.location.hash.slice(1);
      if (productModules.some((module) => module.id === id)) setSelected(id);
    };
    sync();
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    return () => {
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('popstate', sync);
    };
  }, []);
  return (
    <Tabs
      value={selected}
      onValueChange={(value) => {
        setSelected(value);
        window.history.replaceState(window.history.state, '', `#${value}`);
      }}
      className="m-module-explorer"
    >
      <div className="m-module-anchors" aria-hidden="true">
        {productModules.map((module) => (
          <span id={module.id} key={module.id} />
        ))}
      </div>
      <TabsList className="m-module-tabs" aria-label="Explore platform modules">
        {productModules.map((module, i) => (
          <TabsTrigger key={module.id} value={module.id}>
            {labels[i]}
          </TabsTrigger>
        ))}
      </TabsList>
      {productModules.map((module, index) => (
        <TabsContent key={module.id} value={module.id} className="m-module-panel">
          <div className="m-module-explanation">
            <p className="m-eyebrow">
              {String(index + 1).padStart(2, '0')} / {module.label}
            </p>
            <h3>{module.title}</h3>
            <p>{summaries[module.id]}</p>
            <details className="m-disclosure">
              <summary>
                Explore this module <ChevronDown size={16} aria-hidden="true" />
              </summary>
              <p>{module.detail}</p>
              <ul className="m-check-list">
                {module.points.map((point) => (
                  <li key={point}>
                    <Check size={15} aria-hidden="true" />
                    {point}
                  </li>
                ))}
              </ul>
            </details>
          </div>
          <div className="m-record-stage">
            <figure className="m-module-record">
              <figcaption className="m-caption">
                ILLUSTRATIVE RECORD / {labels[index].toUpperCase()}
              </figcaption>
              <h4>{module.title}</h4>
              {moduleRows[module.id].map((row) => (
                <div className="m-data-row" key={row.label}>
                  <span>{row.label}</span>
                  <strong>{row.value}</strong>
                </div>
              ))}
              <blockquote>{module.rule}</blockquote>
            </figure>
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
