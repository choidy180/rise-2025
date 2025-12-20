"use client";

import React, { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

type From = "bottom" | "top" | "left" | "right";

export interface AnimatedContentProps {
  children: React.ReactNode;
  from?: From;
  distance?: number;
  duration?: number;
  ease?: string;
  initialOpacity?: number;
  animateOpacity?: boolean;
  scale?: number;
  threshold?: number;
  delay?: number;
  onComplete?: () => void;
  direction?: "vertical" | "horizontal";
  reverse?: boolean;
}

const AnimatedContent: React.FC<AnimatedContentProps> = ({
  children,
  from = "bottom",
  distance = 100,
  duration = 0.8,
  ease = "power3.out",
  initialOpacity = 0,
  animateOpacity = true,
  scale = 1,
  threshold = 0.1,
  delay = 0,
  onComplete,
  direction,
  reverse,
}) => {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof window !== "undefined") {
      gsap.registerPlugin(ScrollTrigger);
    }

    gsap.killTweensOf(el);
    ScrollTrigger.getAll().forEach((t) => {
      if ((t as any).vars?.trigger === el) t.kill();
    });

    let axis: "x" | "y";
    let sign: 1 | -1;

    if (direction) {
      axis = direction === "horizontal" ? "x" : "y";
      sign = reverse ? -1 : 1;
    } else {
      if (from === "left" || from === "right") {
        axis = "x";
        sign = from === "left" ? -1 : 1;
      } else {
        axis = "y";
        sign = from === "top" ? -1 : 1;
      }
    }

    const offset = sign * distance;
    const clamped = Math.max(0, Math.min(1, threshold));
    const startPct = (1 - clamped) * 100;

    const initial: any =
      axis === "y" ? { x: 0, y: offset } : { y: 0, x: offset };

    gsap.set(el, {
      ...initial,
      scale,
      opacity: animateOpacity ? initialOpacity : 1,
      willChange: "transform, opacity",
    });

    const tween = gsap.to(el, {
      ...(axis === "y" ? { y: 0 } : { x: 0 }),
      scale: 1,
      opacity: 1,
      duration,
      ease,
      delay,
      onComplete,
      scrollTrigger: {
        trigger: el,
        start: `top ${startPct}%`,
        toggleActions: "play none none none",
        once: true,
      },
    });

    return () => {
      try {
        tween.scrollTrigger?.kill(true);
      } catch {}
      try {
        tween.kill();
      } catch {}
      gsap.killTweensOf(el);
    };
  }, [
    from,
    distance,
    duration,
    ease,
    initialOpacity,
    animateOpacity,
    scale,
    threshold,
    delay,
    onComplete,
    direction,
    reverse,
  ]);

  // ✅ margin-top: 60px 추가
  return (
    <div ref={ref} style={{ marginTop: 60 }}>
      {children}
    </div>
  );
};

export default AnimatedContent;
