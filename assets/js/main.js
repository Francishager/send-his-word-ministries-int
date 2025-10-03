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

// WhatsApp chat popover (small composer near the floating icon)
(function() {
  const waButtons = document.querySelectorAll('a.whatsapp-float');
  if (!waButtons.length) return;

  // Build (or reuse) the popover composer
  let popEl = document.getElementById('waChatPopover');
  if (!popEl) {
    popEl = document.createElement('div');
    popEl.id = 'waChatPopover';
    popEl.className = 'wa-composer d-none';
    popEl.setAttribute('role', 'dialog');
    popEl.setAttribute('aria-label', 'WhatsApp chat composer');
    popEl.setAttribute('aria-hidden', 'true');
    popEl.innerHTML = `
      <div class="wa-header d-flex align-items-center gap-2">
        <i class="fab fa-whatsapp text-white"></i>
        <span class="small fw-semibold text-white">WhatsApp</span>
      </div>
      <form id="waChatForm" class="p-2">
        <div class="wa-input d-flex align-items-end gap-2">
          <textarea id="waMessage" class="form-control form-control-sm wa-textarea" rows="3" placeholder="Type a message" required></textarea>
          <button type="submit" class="wa-send-btn" aria-label="Send"><i class="fa-solid fa-paper-plane"></i></button>
        </div>
        <div class="wa-error">Please enter a message.</div>
      </form>`;
    document.body.appendChild(popEl);
  }

  const form = popEl.querySelector('#waChatForm');
  const messageEl = popEl.querySelector('#waMessage');

  function extractPhone(el) {
    const dataPhone = el.getAttribute('data-wa-phone');
    if (dataPhone) return dataPhone.replace(/\D/g, '');
    const href = el.getAttribute('href') || '';
    const match = href.match(/wa\.me\/(\d+)/);
    if (match && match[1]) return match[1];
    return '1234567890'; // fallback
  }

  function showPopover(phone) {
    popEl.dataset.phone = phone;
    popEl.classList.remove('d-none');
    popEl.setAttribute('aria-hidden', 'false');
    // Focus after next frame so it's reliably visible
    requestAnimationFrame(() => messageEl.focus());
  }

  function hidePopover(clear = false) {
    popEl.classList.add('d-none');
    popEl.setAttribute('aria-hidden', 'true');
    if (clear) messageEl.value = '';
    messageEl.classList.remove('is-invalid');
    popEl.classList.remove('show-error');
  }

  // Toggle on icon click
  waButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const phone = extractPhone(btn);
      // If already open for this phone, toggle/close
      const isHidden = popEl.classList.contains('d-none');
      if (isHidden || popEl.dataset.phone !== phone) {
        showPopover(phone);
      } else {
        hidePopover();
      }
    }, { passive: false });
  });

  // Click outside to close
  document.addEventListener('click', (e) => {
    if (popEl.classList.contains('d-none')) return;
    const isClickInside = popEl.contains(e.target) || e.target.closest('a.whatsapp-float');
    if (!isClickInside) hidePopover();
  });

  // ESC to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hidePopover();
  });

  // Remove invalid style on input
  messageEl.addEventListener('input', () => {
    messageEl.classList.remove('is-invalid');
    popEl.classList.remove('show-error');
  });

  // Submit handler
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = messageEl.value.trim();
    if (!text) {
      messageEl.classList.add('is-invalid');
      popEl.classList.add('show-error');
      return;
    }
    const phone = popEl.dataset.phone || '1234567890';
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    hidePopover(true);
    window.open(url, '_blank');
  });
})();

// AJAX newsletter subscription (in-page)
(() => {
  const form = document.getElementById('newsletterForm');
  if (!form) return;
  const statusEl = document.getElementById('newsletterStatus');
  const submitBtn = document.getElementById('newsletterSubmit');

  function setStatus(type, text) {
    if (!statusEl) return;
    statusEl.className = 'alert mt-3 alert-' + (type === 'success' ? 'success' : 'danger');
    statusEl.textContent = text;
    statusEl.classList.remove('d-none');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (statusEl) statusEl.classList.add('d-none');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = submitBtn?.dataset?.loading || 'Subscribing...';
    }

    try {
      const fd = new FormData(form);
      const action = form.getAttribute('action') || 'subscribe.php';
      const resp = await fetch(action, {
        method: 'POST',
        body: fd,
        headers: { 'Accept': 'application/json' },
        credentials: 'same-origin'
      });
      const data = await resp.json().catch(() => null);
      if (resp.ok && data && data.ok) {
        setStatus('success', data.message || 'Subscribed! Thank you.');
        form.reset();
      } else {
        const msg = data && data.error ? data.error : 'Unable to subscribe at the moment. Please try again later.';
        setStatus('error', msg);
      }
    } catch (err) {
      setStatus('error', 'Network error. Please try again.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = submitBtn?.dataset?.text || 'Subscribe';
      }
    }
  });
})();

// Pre-decode carousel images to avoid black flashes during fade transitions
(() => {
  const carousels = document.querySelectorAll('.carousel.carousel-fade');
  if (!carousels.length || typeof bootstrap === 'undefined') return;

  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return; // don't alter behavior for reduced motion users

  function decodeImg(img) {
    if (!img) return Promise.resolve();
    if (img.complete) return Promise.resolve();
    if (typeof img.decode === 'function') {
      return img.decode().catch(() => {});
    }
    return new Promise((resolve) => {
      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', resolve, { once: true });
    });
  }

  function nextItem(carouselEl, fromItem) {
    const items = Array.from(carouselEl.querySelectorAll('.carousel-item'));
    if (!items.length) return null;
    const startIndex = Math.max(0, items.indexOf(fromItem));
    const nextIndex = (startIndex + 1) % items.length;
    return items[nextIndex] || null;
  }

  carousels.forEach((el) => {
    const instance = bootstrap.Carousel.getOrCreateInstance(el);
    // Pause auto-cycling until we decode the first two slides
    instance.pause();

    const isHero = !!el.closest('.hero');
    if (isHero) {
      // Decode all hero images up-front to avoid any mid-sequence flashes
      const imgs = Array.from(el.querySelectorAll('.carousel-item img'));
      Promise.allSettled(imgs.map(decodeImg)).then(() => {
        requestAnimationFrame(() => instance.cycle());
      });
    } else {
      // Non-hero: decode first two, then start
      const active = el.querySelector('.carousel-item.active');
      const upcoming = nextItem(el, active);
      const activeImg = active ? active.querySelector('img') : null;
      const upcomingImg = upcoming ? upcoming.querySelector('img') : null;
      Promise.allSettled([decodeImg(activeImg), decodeImg(upcomingImg)]).then(() => {
        requestAnimationFrame(() => instance.cycle());
      });
    }

    // After each slide, decode the next upcoming slide's image
    el.addEventListener('slid.bs.carousel', (e) => {
      const current = e.relatedTarget; // now-active .carousel-item
      const upNext = nextItem(el, current);
      const img = upNext ? upNext.querySelector('img') : null;
      decodeImg(img);
    });
  });
})();

// AJAX contact form submission (in-page send)
(() => {
  const form = document.getElementById('contactForm');
  if (!form) return;
  const statusEl = document.getElementById('contactStatus');
  const submitBtn = document.getElementById('contactSubmit');

  function setStatus(type, text) {
    if (!statusEl) return;
    statusEl.className = 'alert mt-3 alert-' + (type === 'success' ? 'success' : 'danger');
    statusEl.textContent = text;
    statusEl.classList.remove('d-none');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (statusEl) statusEl.classList.add('d-none');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = submitBtn?.dataset?.loading || 'Sending...';
    }

    try {
      const fd = new FormData(form);
      const action = form.getAttribute('action') || 'contact.php';
      const resp = await fetch(action, {
        method: 'POST',
        body: fd,
        headers: { 'Accept': 'application/json' },
        credentials: 'same-origin'
      });
      const data = await resp.json().catch(() => null);
      if (resp.ok && data && data.ok) {
        setStatus('success', data.message || 'Message sent. Thank you!');
        form.reset();
      } else {
        const msg = data && data.error ? data.error : 'Unable to subscribe at the moment. Please try again later.';
        setStatus('error', msg);
      }
    } catch (err) {
      setStatus('error', 'Network error. Please try again.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = submitBtn?.dataset?.text || 'Subscribe';
      }
    }
  });
})();
