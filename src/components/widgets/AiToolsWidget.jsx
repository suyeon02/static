import React, { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import WidgetCard from '../common/WidgetCard';

const AI_LIST = [
  // LLM
  { name: 'ChatGPT', category: 'LLM', url: 'https://chatgpt.com' },
  { name: 'Claude', category: 'LLM', url: 'https://claude.ai' },
  { name: 'Gemini', category: 'LLM', url: 'https://gemini.google.com' },
  { name: 'Perplexity', category: 'LLM', url: 'https://perplexity.ai' },
  { name: 'Grok', category: 'LLM', url: 'https://grok.com' },
  { name: 'DeepSeek', category: 'LLM', url: 'https://chat.deepseek.com' },

  // CODE
  { name: 'Cursor', category: 'CODE', url: 'https://cursor.com' },
  { name: 'GitHub Copilot', category: 'CODE', url: 'https://github.com/features/copilot' },
  { name: 'Windsurf', category: 'CODE', url: 'https://windsurf.com' },
  { name: 'Bolt.new', category: 'CODE', url: 'https://bolt.new' },
  { name: 'Lovable', category: 'CODE', url: 'https://lovable.dev' },
  { name: 'Replit', category: 'CODE', url: 'https://replit.com' },

  // DESIGN
  { name: 'v0.dev', category: 'DESIGN', url: 'https://v0.dev' },
  { name: 'Figma', category: 'DESIGN', url: 'https://figma.com' },
  { name: 'Google Stitch', category: 'DESIGN', url: 'https://stitch.withgoogle.com' },
  { name: 'Framer', category: 'DESIGN', url: 'https://framer.com' },
  { name: 'Canva AI', category: 'DESIGN', url: 'https://canva.com' },
  { name: 'Relume', category: 'DESIGN', url: 'https://relume.io' },

  // MEDIA
  { name: 'Midjourney', category: 'MEDIA', url: 'https://midjourney.com' },
  { name: 'Runway', category: 'MEDIA', url: 'https://runwayml.com' },
  { name: 'Suno', category: 'MEDIA', url: 'https://suno.com' },
  { name: 'ElevenLabs', category: 'MEDIA', url: 'https://elevenlabs.io' },
  { name: 'Leonardo AI', category: 'MEDIA', url: 'https://leonardo.ai' },
  { name: 'Kling AI', category: 'MEDIA', url: 'https://klingai.com' },

  // DOCS
  { name: 'NotebookLM', category: 'DOCS', url: 'https://notebooklm.google.com' },
  { name: 'Gamma', category: 'DOCS', url: 'https://gamma.app' },
  { name: 'Notion AI', category: 'DOCS', url: 'https://notion.so' },
  { name: 'Napkin AI', category: 'DOCS', url: 'https://napkin.ai' },
];

const CATEGORIES = ['ALL', 'LLM', 'CODE', 'DESIGN', 'MEDIA', 'DOCS'];

export default function AiToolsWidget({ compact = true }) {
  const [filter, setFilter] = useState('ALL');

  const filtered =
    filter === 'ALL'
      ? AI_LIST
      : AI_LIST.filter((tool) => tool.category === filter);

  return (
    <WidgetCard title="AI_TOOLS">
      {/* Category filters — below title */}
      <div className="mb-3 flex flex-wrap gap-1">
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

      {/* Tool grid */}
      <div
        className={`grid grid-cols-2 gap-2 content-start sm:grid-cols-3 ${
          compact
            ? 'max-h-52 overflow-y-auto pr-1 lg:grid-cols-2'
            : 'lg:grid-cols-4'
        }`}
      >
        {filtered.map((tool) => (
          <a
            key={tool.name}
            href={tool.url}
            target="_blank"
            rel="noreferrer"
            className="group flex items-center justify-between gap-2 rounded-md border border-line-soft bg-canvas p-3 transition-all hover:border-ink hover:bg-ink hover:text-white hover:shadow-sm"
          >
            <div className="min-w-0">
              <div className="truncate text-small font-semibold">
                {tool.name}
              </div>
              <div className="mt-0.5 text-meta text-muted group-hover:text-neutral-300">
                {tool.category}
              </div>
            </div>
            <ArrowUpRight
              size={14}
              className="shrink-0 opacity-50 transition-opacity group-hover:opacity-100"
              aria-hidden="true"
            />
          </a>
        ))}
      </div>
    </WidgetCard>
  );
}