/* ProMat Landing — interações mínimas (scroll-spy, nav sticky, CTA) */

(function () {
  'use strict';

  // Rota de signup do app. Ajuste conforme o deploy (ex.: https://promat.app/?ref=lp&action=signup)
  const SIGNUP_URL = '/?ref=lp&action=signup';

  /* ========== NAV STICKY — estado ao rolar ========== */
  const nav = document.getElementById('nav');
  const onScroll = () => {
    if (window.scrollY > 20) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ========== CTAs → signup ========== */
  document.querySelectorAll('[data-cta]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const origin = el.getAttribute('data-cta') || 'lp';
      const url = SIGNUP_URL + (SIGNUP_URL.includes('?') ? '&' : '?') + 'cta=' + encodeURIComponent(origin);
      window.location.href = url;
    });
  });

  /* ========== SCROLL-SPY do mecanismo ========== */
  const mechCards = document.querySelectorAll('.mech-card');
  const mechItems = document.querySelectorAll('.mech-sidebar li');

  if (mechCards.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            mechItems.forEach((li) => {
              li.classList.toggle('active', li.getAttribute('data-target') === id);
            });
          }
        });
      },
      { rootMargin: '-40% 0px -50% 0px', threshold: 0 }
    );
    mechCards.forEach((card) => observer.observe(card));
  }

  /* clique no sidebar leva ao card */
  mechItems.forEach((li) => {
    li.addEventListener('click', () => {
      const id = li.getAttribute('data-target');
      const target = document.getElementById(id);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  /* ========== FAQ — fecha outros ao abrir (opcional) ========== */
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach((item) => {
    item.addEventListener('toggle', () => {
      if (item.open) {
        faqItems.forEach((other) => {
          if (other !== item) other.open = false;
        });
      }
    });
  });
})();
