'use client';

import { useEffect, useCallback } from 'react';

export function useScrollReveal() {
  const handleScroll = useCallback(() => {
    // Scale-on-scroll elements
    const scaleEls = document.querySelectorAll('[data-scale-scroll]');
    scaleEls.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const viewH = window.innerHeight;
      const progress = Math.max(0, Math.min(1, 1 - (rect.top / viewH)));
      const from = parseFloat((el as HTMLElement).dataset.scaleFrom || '0.92');
      const scale = from + (1 - from) * progress;
      const opacity = Math.max(0, Math.min(1, progress * 1.5));
      (el as HTMLElement).style.transform = `scale(${scale})`;
      (el as HTMLElement).style.opacity = `${opacity}`;
    });

    // Safety net: reveal any [data-reveal] elements that have been scrolled past
    // but were missed by the IntersectionObserver (fast scroll scenario)
    const revealEls = document.querySelectorAll('[data-reveal]:not(.revealed)');
    revealEls.forEach((el) => {
      const rect = el.getBoundingClientRect();
      // If the element's bottom is above the viewport bottom, it should be visible
      if (rect.top < window.innerHeight) {
        const htmlEl = el as HTMLElement;
        const delay = htmlEl.dataset.revealDelay || '0';
        htmlEl.style.transitionDelay = `${delay}ms`;
        htmlEl.classList.add('revealed');
      }
    });
  }, []);

  useEffect(() => {
    // Set up IntersectionObserver immediately (no delay)
    const elements = document.querySelectorAll('[data-reveal]');
    let observer: IntersectionObserver | null = null;

    if (elements.length) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const el = entry.target as HTMLElement;
              const delay = el.dataset.revealDelay || '0';
              el.style.transitionDelay = `${delay}ms`;
              el.classList.add('revealed');
              observer?.unobserve(el);
            }
          });
        },
        { threshold: 0.01, rootMargin: '50px 0px -10px 0px' }
      );
      elements.forEach((el) => observer!.observe(el));

      // Immediately reveal any elements already in view on load
      elements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          const htmlEl = el as HTMLElement;
          const delay = htmlEl.dataset.revealDelay || '0';
          htmlEl.style.transitionDelay = `${delay}ms`;
          htmlEl.classList.add('revealed');
          observer?.unobserve(el);
        }
      });
    }

    // Scroll listener for scale effects + safety-net reveals
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      observer?.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);
}
