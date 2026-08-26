import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * AnimatedNumber — angka yang naik dari 0 ke nilainya saat pertama terlihat.
 *
 * Angka yang langsung muncul terasa statis; angka yang berhitung menarik mata
 * ke tempat yang benar. Animasi hanya berjalan sekali per nilai, dan sama
 * sekali tidak berjalan bila sistem meminta "kurangi gerak" — di situ
 * angkanya langsung final, bukan sekadar lebih cepat.
 *
 * @param {number} value        nilai akhir
 * @param {(n:number)=>string} format  pemformat, mis. (n) => `Rp ${n.toLocaleString("id-ID")}`
 * @param {number} duration     durasi ms
 * @param {number} decimals     jumlah angka di belakang koma
 */
export default function AnimatedNumber({
  value = 0,
  format,
  duration = 900,
  decimals = 0,
  className,
  prefix = "",
  suffix = "",
}) {
  const target = Number.isFinite(Number(value)) ? Number(value) : 0;
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef(null);
  const nodeRef = useRef(null);
  const seenRef = useRef(false);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    if (reduce) {
      setDisplay(target);
      fromRef.current = target;
      return;
    }

    const run = () => {
      const from = fromRef.current;
      const delta = target - from;
      if (delta === 0) return;
      const start = performance.now();

      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        // easeOutExpo — cepat di awal lalu mendarat halus
        const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        setDisplay(from + delta * eased);
        if (t < 1) rafRef.current = requestAnimationFrame(tick);
        else fromRef.current = target;
      };
      rafRef.current = requestAnimationFrame(tick);
    };

    // Tunggu sampai elemen benar-benar terlihat: kartu di paruh bawah
    // dashboard tidak ada gunanya berhitung sebelum digulir ke sana.
    const node = nodeRef.current;
    if (!node || typeof IntersectionObserver === "undefined" || seenRef.current) {
      run();
      return () => cancelAnimationFrame(rafRef.current);
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          seenRef.current = true;
          io.disconnect();
          run();
        }
      },
      { threshold: 0.25 }
    );
    io.observe(node);

    return () => {
      io.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  const rounded =
    decimals > 0
      ? Number(display).toFixed(decimals)
      : Math.round(display);

  const text = format
    ? format(Number(rounded))
    : `${prefix}${Number(rounded).toLocaleString("id-ID")}${suffix}`;

  return (
    <span ref={nodeRef} className={cn("tabular", className)}>
      {text}
    </span>
  );
}
