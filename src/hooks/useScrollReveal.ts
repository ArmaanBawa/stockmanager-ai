'use client';

import { useEffect, useCallback } from 'react';

export function useScrollReveal() {
  const handleScroll = useCallback(() => {
    // Parallax elements
    const parallaxEls = document.querySelectorAll('[data-parallax]');
    parallaxEls.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const speed = parseFloat((el as HTMLElement).dataset.parallax || '0.1');
      const offset = (rect.top - window.innerHeight / 2) * speed;
      (el as HTMLElement).style.transform = `translateY(${offset}px)`;
    });

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
    // Intersection observer for reveal animations
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
        { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
      );
      elements.forEach((el) => observer.observe(el));
    }

    // Scroll listener for parallax & scale
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // initial call

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);
}
