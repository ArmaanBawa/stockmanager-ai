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
  }, []);

  useEffect(() => {
    // Small delay to let layout settle
    const timer = setTimeout(() => {
      const elements = document.querySelectorAll('[data-reveal]');
      if (elements.length) {
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                const el = entry.target as HTMLElement;
                const delay = el.dataset.revealDelay || '0';
                el.style.transitionDelay = `${delay}ms`;
                el.classList.add('revealed');
                observer.unobserve(el);
              }
            });
          },
          { threshold: 0.05, rootMargin: '20px 0px -20px 0px' }
        );
        elements.forEach((el) => observer.observe(el));
      }

      // Scroll listener for scale effects
      window.addEventListener('scroll', handleScroll, { passive: true });
      handleScroll();
    }, 100);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);
}
