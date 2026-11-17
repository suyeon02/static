import { useCallback, useRef, useState } from 'react';

function panelOffset(container, panel) {
  return panel.offsetLeft - container.offsetLeft;
}

export default function useSwipePanels() {
  const panelsRef = useRef(null);
  const [activePanel, setActivePanel] = useState(0);

  const goToPanel = useCallback((index) => {
    const container = panelsRef.current;
    const panel = container?.children[index];
    if (!panel || container.scrollWidth <= container.clientWidth + 1) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    container.scrollTo({
      left: panelOffset(container, panel),
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
    setActivePanel(index);
  }, []);

  const handleScroll = useCallback(() => {
    const container = panelsRef.current;
    if (!container) return;
    let nearest = 0;
    let nearestDistance = Infinity;
    Array.from(container.children).forEach((panel, index) => {
      const distance = Math.abs(panelOffset(container, panel) - container.scrollLeft);
      if (distance < nearestDistance) {
        nearest = index;
        nearestDistance = distance;
      }
    });
    setActivePanel(nearest);
  }, []);

  return { panelsRef, activePanel, goToPanel, handleScroll };
}
