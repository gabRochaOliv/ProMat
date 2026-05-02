/* ProMat Landing — Auth inline + interações */

(function () {
  'use strict';

  /* ========== NAV STICKY ========== */
  const nav = document.getElementById('nav');
  const onScroll = () => {
    if (window.scrollY > 20) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ========== FAQ ========== */
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

  /* ========== PRICING TOGGLE ========== */
  const btnMensal = document.getElementById('btn-mensal');
  const btnAnual  = document.getElementById('btn-anual');
  const priceAmount  = document.getElementById('price-amount');
  const billingNote  = document.getElementById('billing-note');

  if (btnMensal && btnAnual && priceAmount && billingNote) {
    btnMensal.addEventListener('click', () => {
      btnMensal.classList.add('active');
      btnAnual.classList.remove('active');
      priceAmount.innerHTML = '29<span class="cents">,90</span>';
      billingNote.textContent = 'Cobrado mensalmente';
    });
    btnAnual.addEventListener('click', () => {
      btnAnual.classList.add('active');
      btnMensal.classList.remove('active');
      priceAmount.innerHTML = '14<span class="cents">,90</span>';
      billingNote.textContent = 'R$ 178,80 cobrados anualmente';
    });
  }

  /* ========== SCROLL-SPY mecanismo ========== */
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

})();
