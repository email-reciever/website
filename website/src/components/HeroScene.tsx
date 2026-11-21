import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ox: number;
  oy: number;
  r: number;
  alpha: number;
}

/**
 * The single cinematic set-piece: a drifting particle field that reacts to the
 * pointer with a soft spring. Hand-rolled 2D canvas (no off-the-shelf WebGL
 * demo) so it stays cheap, degrades to a static frame on reduced-motion, and
 * never fights the content for attention.
 */
export function HeroScene() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pointer = { x: -9999, y: -9999 };
    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let raf = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(90, Math.max(28, Math.floor((width * height) / 16000)));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.16,
        vy: -0.05 - Math.random() * 0.12,
        ox: 0,
        oy: 0,
        r: 0.5 + Math.random() * 1.4,
        alpha: 0.12 + Math.random() * 0.5,
      }));
    };

    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
    };
    const onLeave = () => {
      pointer.x = -9999;
      pointer.y = -9999;
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        if (!reduced) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < -12) p.x = width + 12;
          if (p.x > width + 12) p.x = -12;
          if (p.y < -12) p.y = height + 12;
          if (p.y > height + 12) p.y = -12;

          const dx = pointer.x - p.x;
          const dy = pointer.y - p.y;
          const dist2 = dx * dx + dy * dy;
          const range = 260 * 260;
          const pull = dist2 < range ? (1 - dist2 / range) * 0.24 : 0;
          p.ox += (dx * pull - p.ox) * 0.075;
          p.oy += (dy * pull - p.oy) * 0.075;
        }

        const x = p.x + p.ox;
        const y = p.y + p.oy;
        ctx.beginPath();
        ctx.arc(x, y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 229, 255, ${p.alpha})`;
        ctx.fill();
      }

      if (!reduced) raf = requestAnimationFrame(draw);
    };

    resize();
    draw();
    const observer = new ResizeObserver(() => {
      resize();
      if (reduced) draw();
    });
    observer.observe(canvas);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <canvas ref={ref} tabIndex={-1} aria-hidden="true" />;
}
