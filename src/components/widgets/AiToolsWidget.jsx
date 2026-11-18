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
  {
    name: 'GitHub Copilot',
    category: 'CODE',
    url: 'https://github.com/features/copilot',
  },
  { name: 'Windsurf', category: 'CODE', url: 'https://windsurf.com' },
  { name: 'Bolt.new', category: 'CODE', url: 'https://bolt.new' },
  { name: 'Lovable', category: 'CODE', url: 'https://lovable.dev' },
  { name: 'Replit', category: 'CODE', url: 'https://replit.com' },

  // DESIGN
  { name: 'v0.dev', category: 'DESIGN', url: 'https://v0.dev' },
  { name: 'Figma', category: 'DESIGN', url: 'https://figma.com' },
  {
    name: 'Google Stitch',
    category: 'DESIGN',
    url: 'https://stitch.withgoogle.com',
  },
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
  {
    name: 'NotebookLM',
    category: 'DOCS',
    url: 'https://notebooklm.google.com',
  },
  { name: 'Gamma', category: 'DOCS', url: 'https://gamma.app' },
  { name: 'Notion AI', category: 'DOCS', url: 'https://notion.so' },
  { name: 'Napkin AI', category: 'DOCS', url: 'https://napkin.ai' },
];

const CATEGORIES = ['ALL', 'LLM', 'CODE', 'DESIGN', 'MEDIA', 'DOCS'];

function ToolIcon({ tool, compact }) {
  const [hasError, setHasError] = useState(false);

  // 개별 icon 경로를 지정하면 해당 이미지를 우선 사용합니다.
  const iconUrl = tool.icon || new URL('/favicon.ico', tool.url).href;

  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line-soft bg-white ${
        compact ? 'size-9' : 'size-11'
      }`}
      aria-hidden="true"
    >
      {hasError ? (
        <span
          className={`font-bold text-neutral-700 ${
            compact ? 'text-[14px]' : 'text-[18px]'
          }`}
        >
          {tool.name.charAt(0).toUpperCase()}
        </span>
      ) : (
        <img
          src={iconUrl}
          alt=""
          width={compact ? 22 : 28}
          height={compact ? 22 : 28}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
          className={`object-contain ${
            compact ? 'size-[22px]' : 'size-7'
          }`}
        />
      )}
    </span>
  );
}

export default function AiToolsWidget({ compact = true }) {
  const [filter, setFilter] = useState('ALL');

  const filtered =
    filter === 'ALL'
      ? AI_LIST
      : AI_LIST.filter((tool) => tool.category === filter);

  const content = (
    <div className="flex min-h-0 min-w-0 flex-col">
      {/* Category filters */}
      <div
        role="group"
        aria-label="AI 도구 카테고리"
        className={`flex flex-wrap items-center gap-1.5 ${
          compact ? 'mb-3' : 'mb-5'
        }`}
      >
        {CATEGORIES.map((cat) => {
          const isActive = filter === cat;

          return (
            <button
              key={cat}
              type="button"
              onClick={() => setFilter(cat)}
              aria-pressed={isActive}
              aria-label={cat === 'ALL' ? '전체 도구' : `${cat} 도구`}
              className={`ui-segment inline-flex min-h-8 items-center justify-center px-3 ${
                isActive ? 'ui-segment-active' : 'ui-segment-idle'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Full-page summary */}
      {!compact && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="text-small text-muted"
          >
            {filter === 'ALL' ? '전체 도구' : `${filter} 도구`}

            <span className="ml-2 font-semibold text-ink">
              {filtered.length}
            </span>
          </p>

          <p className="text-small text-muted">
            도구를 선택하면 새 탭에서 열립니다.
          </p>
        </div>
      )}

      {/* Tool grid */}
      <ul
        aria-label="AI 도구 목록"
        className={`m-0 grid min-w-0 list-none content-start ${
          compact
            ? 'max-h-52 grid-cols-1 gap-2 overflow-y-auto overscroll-contain p-1 sm:grid-cols-2'
            : 'grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
        }`}
      >
        {filtered.map((tool) => (
          <li key={tool.name} className="min-w-0">
            <a
              href={tool.url}
              target="_blank"
              rel="noopener noreferrer"
              title={tool.name}
              aria-label={`${tool.name} — 새 탭에서 열기`}
              className={`group flex h-full min-w-0 items-center justify-between gap-3 rounded-md border border-line-soft bg-canvas transition-colors hover:border-ink hover:bg-ink hover:text-white focus-visible:border-ink focus-visible:bg-ink focus-visible:text-white ${
                compact ? 'min-h-[72px] p-3' : 'min-h-24 p-4'
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <ToolIcon tool={tool} compact={compact} />

                <div className="min-w-0">
                  <div
                    className={`break-words font-semibold leading-snug ${
                      compact ? 'text-small' : 'text-[14px]'
                    }`}
                  >
                    {tool.name}
                  </div>

                  <div className="mt-1 text-meta leading-normal tracking-wide text-muted group-hover:text-neutral-300 group-focus-visible:text-neutral-300">
                    {tool.category}
                  </div>
                </div>
              </div>

              <ArrowUpRight
                size={compact ? 14 : 16}
                className="shrink-0 text-muted transition-colors group-hover:text-white group-focus-visible:text-white"
                aria-hidden="true"
              />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );

  if (compact) {
    return <WidgetCard title="AI_TOOLS">{content}</WidgetCard>;
  }

  return (
    <section
      aria-label="AI 도구 모음"
      className="ui-card min-w-0"
    >
      {content}
    </section>
  );
}