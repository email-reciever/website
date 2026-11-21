import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import type { TocItem } from "@/lib/toc";

/** Section rail for long reads — prose stays primary, the TOC only navigates. */
export function ArticleToc({ items }: { items: TocItem[] }) {
  const t = useT();
  const [active, setActive] = useState("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -68% 0px" },
    );
    for (const item of items) {
      const element = document.getElementById(item.id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [items]);

  if (!items.length) return null;

  return (
    <nav aria-label="目录">
      <div className="mono-label mb-3">
        {t("contents")} / {items.length}
      </div>
      <div className="flex flex-col">
        {items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className="toc-link"
            data-active={active === item.id}
          >
            {item.level === 3 && <span className="mr-1 opacity-40">—</span>}
            {item.text}
          </a>
        ))}
      </div>
    </nav>
  );
}
