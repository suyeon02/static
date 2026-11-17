import useSwipePanels from '../../hooks/useSwipePanels';

const STACKED_LAYOUT = 'items-start md:flex-col md:items-stretch md:gap-6';

export default function SwipePanels({
  labels,
  label,
  controller,
  className = STACKED_LAYOUT,
  wrapperClassName = '',
  children,
}) {
  const ownController = useSwipePanels();
  const { panelsRef, activePanel, goToPanel, handleScroll } = controller ?? ownController;

  return (
    <div className={wrapperClassName}>
      <nav aria-label={label} className="mb-3 grid gap-1 md:hidden" style={{ gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))` }}>
        {labels.map((tab, index) => (
          <button
            key={tab}
            type="button"
            onClick={() => goToPanel(index)}
            aria-current={activePanel === index ? 'true' : undefined}
            className={`ui-segment h-8 truncate tracking-[0.04em] ${
              activePanel === index ? 'ui-segment-active' : 'ui-segment-idle'
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>
      <div
        ref={panelsRef}
        onScroll={handleScroll}
        className={`scrollbar-none flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain *:w-full *:shrink-0 *:snap-start *:snap-always md:snap-none md:overflow-visible md:*:w-auto ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
