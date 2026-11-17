import React, { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import WidgetCard from '../common/WidgetCard';

const AI_LIST = [
  // LLM (대화 · 추론 · 검색)
  { name: 'ChatGPT', category: 'LLM', url: 'https://chatgpt.com' },
  { name: 'Claude', category: 'LLM', url: 'https://claude.ai' },
  { name: 'Gemini', category: 'LLM', url: 'https://gemini.google.com' },
  { name: 'Perplexity', category: 'LLM', url: 'https://perplexity.ai' },
  { name: 'Grok', category: 'LLM', url: 'https://grok.com' },
  { name: 'DeepSeek', category: 'LLM', url: 'https://chat.deepseek.com' },

  // CODE (개발 · 에디터 · 풀스택 빌더)
  { name: 'Cursor', category: 'CODE', url: 'https://cursor.com' },
  { name: 'GitHub Copilot', category: 'CODE', url: 'https://github.com/features/copilot' },
  { name: 'Windsurf', category: 'CODE', url: 'https://windsurf.com' },
  { name: 'Bolt.new', category: 'CODE', url: 'https://bolt.new' },
  { name: 'Lovable', category: 'CODE', url: 'https://lovable.dev' },
  { name: 'Replit', category: 'CODE', url: 'https://replit.com' },

  // DESIGN (UI/UX · 프로토타입 · 그래픽)
  { name: 'v0.dev', category: 'DESIGN', url: 'https://v0.dev' },
  { name: 'Figma', category: 'DESIGN', url: 'https://figma.com' },
  { name: 'Google Stitch', category: 'DESIGN', url: 'https://stitch.withgoogle.com' },
  { name: 'Framer', category: 'DESIGN', url: 'https://framer.com' },
  { name: 'Canva AI', category: 'DESIGN', url: 'https://canva.com' },
  { name: 'Relume', category: 'DESIGN', url: 'https://relume.io' },

  // MEDIA (이미지 · 영상 · 음악 · 음성)
  { name: 'Midjourney', category: 'MEDIA', url: 'https://midjourney.com' },
  { name: 'Runway', category: 'MEDIA', url: 'https://runwayml.com' },
  { name: 'Suno', category: 'MEDIA', url: 'https://suno.com' },
  { name: 'ElevenLabs', category: 'MEDIA', url: 'https://elevenlabs.io' },
  { name: 'Leonardo AI', category: 'MEDIA', url: 'https://leonardo.ai' },
  { name: 'Kling AI', category: 'MEDIA', url: 'https://klingai.com' },

  // DOCS (문서 · 프레젠테이션 · 노트)
  { name: 'NotebookLM', category: 'DOCS', url: 'https://notebooklm.google.com' },
  { name: 'Gamma', category: 'DOCS', url: 'https://gamma.app' },
  { name: 'Notion AI', category: 'DOCS', url: 'https://notion.so' },
  { name: 'Napkin AI', category: 'DOCS', url: 'https://napkin.ai' },
];

const CATEGORIES = ['ALL', 'LLM', 'CODE', 'DESIGN', 'MEDIA', 'DOCS'];

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
        <div className="flex flex-wrap justify-end gap-1">
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
      <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto pr-1 content-start">
        {filtered.map((tool) => (
          <a
            key={tool.name}
            href={tool.url}
            target="_blank"
            rel="noreferrer"
            className="group flex items-center justify-between gap-2 rounded border border-line-soft bg-canvas p-3 transition-colors hover:border-ink hover:bg-ink hover:text-white"
          >
            <div className="min-w-0">
              <div className="truncate text-small font-bold">{tool.name}</div>
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