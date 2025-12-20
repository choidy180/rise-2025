// SplitText.tsx
"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText as GSAPSplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, GSAPSplitText, useGSAP);

type SplitHostEl = HTMLElement & { _rbsplitInstance?: { revert: () => void } | null };
type TagName = "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  ease?: gsap.TweenVars["ease"];
  splitType?: string;
  from?: gsap.TweenVars;
  to?: gsap.TweenVars;
  threshold?: number;
  rootMargin?: string;
  textAlign?: React.CSSProperties["textAlign"];
  tag?: TagName;
  onLetterAnimationComplete?: () => void;
  /** ✅ 줄 간격 커스텀 (예: 1.15, "20px") */
  lineHeight?: React.CSSProperties["lineHeight"];
}

const SplitText: React.FC<SplitTextProps> = ({
  text,
  className = "",
  delay = 100,
  duration = 0.6,
  ease = "power3.out",
  splitType = "chars",
  from = { opacity: 0, y: 40 },
  to = { opacity: 1, y: 0 },
  threshold = 0.1,
  rootMargin = "-100px",
  textAlign = "center",
  tag = "p",
  onLetterAnimationComplete,
  lineHeight = 1.2, // ✅ 기본 라인하이트 조금 타이트하게
}) => {
  const hostRef = useRef<SplitHostEl | null>(null);
  const setHostRef = useCallback((node: HTMLElement | null) => {
    hostRef.current = (node as SplitHostEl) ?? null;
  }, []);

  const animationCompletedRef = useRef(false);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined" || !("fonts" in document)) {
      setFontsLoaded(true);
      return;
    }
    const ff = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (!ff) {
      setFontsLoaded(true);
      return;
    }
    if (ff.status === "loaded") setFontsLoaded(true);
    else ff.ready.finally(() => setFontsLoaded(true));
  }, []);

  useGSAP(
    () => {
      const el = hostRef.current;
      if (!el || !text || !fontsLoaded) return;

      if (el._rbsplitInstance) {
        try { el._rbsplitInstance.revert(); } catch {}
        el._rbsplitInstance = null;
      }

      const clamped = Math.min(Math.max(threshold, 0), 1);
      const startPct = (1 - clamped) * 100;

      const marginMatch = /^(-?\d+(?:\.\d+)?)(px|em|rem|%)?$/.exec(rootMargin || "");
      const marginValue = marginMatch ? parseFloat(marginMatch[1]) : 0;
      const marginUnit = marginMatch ? marginMatch[2] || "px" : "px";
      const sign = marginValue === 0 ? "" : marginValue < 0 ? `-=${Math.abs(marginValue)}${marginUnit}` : `+=${marginValue}${marginUnit}`;
      const start = `top ${startPct}%${sign}`;

      let targets: HTMLElement[] | undefined;
      const assignTargets = (self: any) => {
        const wantChars = splitType.includes("chars");
        const wantWords = splitType.includes("words");
        const wantLines = splitType.includes("lines");
        if (wantChars && self.chars?.length) targets = self.chars as HTMLElement[];
        if (!targets && wantWords && self.words?.length) targets = self.words as HTMLElement[];
        if (!targets && wantLines && self.lines?.length) targets = self.lines as HTMLElement[];
        if (!targets) targets = (self.chars || self.words || self.lines) as HTMLElement[];
      };

      const splitInstance = new (GSAPSplitText as any)(el, {
        type: splitType,
        smartWrap: true,
        autoSplit: splitType === "lines",
        linesClass: "split-line",
        wordsClass: "split-word",
        charsClass: "split-char",
        reduceWhiteSpace: false,
        onSplit: (self: any) => {
          assignTargets(self);
          const tween = gsap.fromTo(
            targets!,
            { ...from },
            {
              ...to,
              duration,
              ease,
              stagger: delay / 1000,
              scrollTrigger: {
                trigger: el,
                start,
                once: true,
                ...( { fastScrollEnd: true, anticipatePin: 0.4 } as any ),
              } as any,
              onComplete: () => {
                animationCompletedRef.current = true;
                onLetterAnimationComplete?.();
              },
              willChange: "transform, opacity",
              force3D: true,
            }
          );
          return tween;
        },
      });

      el._rbsplitInstance = splitInstance;

      return () => {
        ScrollTrigger.getAll().forEach((st) => {
          if ((st as any).trigger === el) st.kill();
        });
        try { splitInstance?.revert?.(); } catch {}
        if (el) el._rbsplitInstance = null;
      };
    },
    {
      scope: hostRef,
      dependencies: [
        text, delay, duration, ease as any, splitType,
        JSON.stringify(from), JSON.stringify(to),
        threshold, rootMargin, fontsLoaded, onLetterAnimationComplete,
      ],
    }
  );

  const style: React.CSSProperties = {
    textAlign,
    overflow: "hidden",
    display: "inline-block",
    whiteSpace: "normal",
    wordWrap: "break-word",
    willChange: "transform, opacity",
    lineHeight,                // ✅ 줄 간격 여기서 직접 제어
  };
  const classes = `split-parent ${className || ""}`.trim();

  switch (tag) {
    case "h1": return <h1 ref={setHostRef} style={style} className={classes}>{text}</h1>;
    case "h2": return <h2 ref={setHostRef} style={style} className={classes}>{text}</h2>;
    case "h3": return <h3 ref={setHostRef} style={style} className={classes}>{text}</h3>;
    case "h4": return <h4 ref={setHostRef} style={style} className={classes}>{text}</h4>;
    case "h5": return <h5 ref={setHostRef} style={style} className={classes}>{text}</h5>;
    case "h6": return <h6 ref={setHostRef} style={style} className={classes}>{text}</h6>;
    default:   return <p  ref={setHostRef} style={style} className={classes}>{text}</p>;
  }
};

export default SplitText;
