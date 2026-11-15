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
              className={`px-1.5 py-0.5 text-[10px] font-bold rounded-[3px] cursor-pointer ${
                filter === cat
                  ? 'bg-black text-white'
                  : 'bg-[#F0F0F0] text-[#666666] hover:text-black'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-2 overflow-y-auto">
        {filtered.map((tool) => (
          <a
            key={tool.name}
            href={tool.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between p-2.5 bg-[#F5F5F5] hover:bg-black hover:text-white border border-black/10 rounded-[4px] transition-colors group"
          >
            <div>
              <div className="text-[12px] font-bold">{tool.name}</div>
              <div className="text-[10px] text-[#666666] group-hover:text-neutral-300">
                [{tool.category}]
              </div>
            </div>
            <ArrowUpRight size={14} />
          </a>
        ))}
      </div>
    </WidgetCard>
  );
}