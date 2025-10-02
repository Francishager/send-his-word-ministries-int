// Main site-wide JS

// Smooth scroll for in-page anchors
document.addEventListener('click', function(e) {
  const a = e.target.closest('a[href^="#"]');
  if (a && a.getAttribute('href') !== '#') {
    const id = a.getAttribute('href');
    const el = document.querySelector(id);
    if (el) {
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth' });
      const nav = document.querySelector('.navbar');
      if (nav && window.getComputedStyle(nav).position === 'fixed') {
        setTimeout(() => window.scrollBy({ top: -8, left: 0, behavior: 'instant' }), 300);
      }
    }
  }
});

// Collapse navbar after clicking a nav-link (on mobile)
const navCollapse = document.getElementById('navbarNav');
if (navCollapse) {
  navCollapse.addEventListener('click', (e) => {
    if (e.target.classList.contains('nav-link')) {
      const bsCollapse = bootstrap.Collapse.getOrCreateInstance(navCollapse);
      bsCollapse.hide();
    }
  });
}

// Fade-up intersection observer
(function() {
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const targets = document.querySelectorAll('.fade-up');
  if (!targets.length) return;

  if (prefersReduced || typeof IntersectionObserver === 'undefined') {
    targets.forEach(el => el.classList.add('in-view'));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        io.unobserve(entry.target);
      }
    }
  }, { threshold: 0.15 });

  targets.forEach(el => io.observe(el));
})();
