import React, { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import WidgetCard from '../common/WidgetCard';

const AI_LIST = [
  { name: 'ChatGPT', category: 'LLM', url: 'https://chatgpt.com' },
  { name: 'Claude', category: 'LLM', url: 'https://claude.ai' },
  { name: 'Gemini', category: 'LLM', url: 'https://gemini.google.com' },
  { name: 'Cursor', category: 'CODE', url: 'https://cursor.com' },
  { name: 'v0.dev', category: 'DESIGN', url: 'https://v0.dev' },
  { name: 'Perplexity', category: 'LLM', url: 'https://perplexity.ai' },
];

const CATEGORIES = ['ALL', 'LLM', 'CODE', 'DESIGN'];

export default function AiToolsWidget() {
  const [filter, setFilter] = useState('ALL');

  const filtered =
    filter === 'ALL'
      ? AI_LIST
      : AI_LIST.filter((tool) => tool.category === filter);

  return (
    <WidgetCard
      title="AI_TOOLS"
      rightSlot={
        <div className="flex gap-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              type="button"
              aria-pressed={filter === cat}
              className={`ui-segment ${
                filter === cat ? 'ui-segment-active' : 'ui-segment-idle'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-2 overflow-y-auto content-start">
        {filtered.map((tool) => (
          <a
            key={tool.name}
            href={tool.url}
            target="_blank"
            rel="noreferrer"
            className="group flex items-center justify-between gap-2 rounded border border-line-soft bg-canvas p-3 transition-colors hover:border-ink hover:bg-ink hover:text-white"
          >
            <div>
              <div className="text-small font-bold">{tool.name}</div>
              <div className="mt-0.5 text-meta text-muted group-hover:text-neutral-300">
                [{tool.category}]
              </div>
            </div>
            <ArrowUpRight size={14} className="shrink-0" aria-hidden="true" />
          </a>
        ))}
      </div>
    </WidgetCard>
  );
}