import { useCallback, useEffect, useState } from 'react';

function readHashPage(pages, fallback) {
  const id = window.location.hash.slice(1);
  return Object.hasOwn(pages, id) ? id : fallback;
}

export default function useHashPage(pages, fallback) {
  const [page, setPage] = useState(() => readHashPage(pages, fallback));

  useEffect(() => {
    const handleHashChange = () => setPage(readHashPage(pages, fallback));
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [pages, fallback]);

  const navigate = useCallback(
    (id) => {
      if (!Object.hasOwn(pages, id)) return;
      setPage(id);
      if (window.location.hash !== `#${id}`) window.location.hash = id;
    },
    [pages]
  );

  return [page, navigate];
}
