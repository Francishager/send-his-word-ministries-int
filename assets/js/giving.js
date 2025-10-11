(function(){
  const form = document.getElementById('givingForm');
  if (!form) return;
  const statusEl = document.getElementById('givingStatus');
  const submitBtn = document.getElementById('givingSubmit');
  const currencySel = document.getElementById('currency');
  const amountSymbol = document.getElementById('amountSymbol');
  const givingModal = document.getElementById('givingModal');
  const phoneInput = document.getElementById('phone');
  const phoneHidden = document.getElementById('phone_hidden');
  const phoneHelp = document.getElementById('phoneHelp');

  const symbols = { KES: 'KSh', UGX: 'USh', TZS: 'TSh', USD: '$', EUR: '€', GBP: '£' };

  function updateSymbol() {
    if (!amountSymbol || !currencySel) return;
    const code = (currencySel.value || '').toUpperCase();
    amountSymbol.textContent = code ? (symbols[code] || code) : '';
  }
  // Initialize symbol and react to changes
  updateSymbol();
  if (currencySel) {
    currencySel.addEventListener('change', updateSymbol);
    currencySel.addEventListener('input', updateSymbol);
  }

  // Modal behaviors: focus and reset status
  if (givingModal) {
    givingModal.addEventListener('shown.bs.modal', function(){
      const amountInput = document.getElementById('amount');
      if (amountInput) amountInput.focus();
      updateSymbol();
      // Re-init phone plugin after becoming visible to ensure dial code shows
      if (window.intlTelInput && phoneInput) {
        try { if (iti && iti.destroy) { iti.destroy(); } } catch (_) {}
        initPhonePlugin();
        // Ensure search is injected when dropdown opens next
        setTimeout(function(){
          const containerEl = phoneInput.closest('.iti');
          const flagBtn = containerEl?.querySelector('.iti__selected-flag') || containerEl?.querySelector('.iti__flag-container');
          if (flagBtn) {
            ['click','mousedown','keydown','focus'].forEach(function(evt){
              flagBtn.addEventListener(evt, function(){ setTimeout(scanAndAddSearch, 50); });
            });
          }
        }, 0);
      }
    });
    givingModal.addEventListener('hide.bs.modal', function(){
      if (statusEl) statusEl.classList.add('d-none');
    });
  }

  // ----- International phone input (flags, dial code, validation) -----
  let iti = null;
  let lastPhoneValue = '';
  let maxDigits = 15;

  function countDigits(str){
    return (str.match(/\d/g) || []).length;
  }
  function setPhoneHelp(msg, isError){
    if (!phoneHelp) return;
    phoneHelp.textContent = msg;
    phoneHelp.classList.toggle('text-danger', !!isError);
  }
  function updateMaxDigitsFromPlaceholder(){
    if (!phoneInput) return;
    const ph = phoneInput.getAttribute('placeholder') || '';
    const digits = countDigits(ph);
    maxDigits = digits || 15;
  }

  function initPhonePlugin() {
    if (!window.intlTelInput || !phoneInput) return;
    // Initialize plugin
    iti = window.intlTelInput(phoneInput, {
      separateDialCode: true,
      autoPlaceholder: 'polite',
      nationalMode: true,
      initialCountry: 'auto',
      formatOnDisplay: true,
      preferredCountries: ['ke','ug','tz','us','gb','de','fr','ng','za'],
      geoIpLookup: function(callback) {
        try {
          fetch('https://ipapi.co/json/')
            .then(function(res){ return res.ok ? res.json() : null; })
            .then(function(d){
              const cc = (d && d.country_code ? d.country_code.toLowerCase() : 'ke');
              callback(cc);
            })
            .catch(function(){ callback('ke'); });
        } catch (_) { callback('ke'); }
      },
      dropdownContainer: document.body,
      utilsScript: 'https://cdn.jsdelivr.net/npm/intl-tel-input@18.5.12/build/js/utils.js'
    });
    // Hint user can type to search countries
    if (!phoneInput.placeholder) {
      phoneInput.placeholder = 'Type to search country, then enter phone';
    }
    updateMaxDigitsFromPlaceholder();
    phoneInput.addEventListener('countrychange', function(){
      updateMaxDigitsFromPlaceholder();
      lastPhoneValue = phoneInput.value;
      setPhoneHelp('Both email and phone are required.', false);
    });
    // Guard against duplicate sanitizer listeners
    if (!phoneInput.dataset.sanitizerAttached) {
      phoneInput.addEventListener('input', function(){
        // Disallow letters or other symbols; allow digits, space, (), -
        const cleaned = phoneInput.value.replace(/[^0-9()\-\s]/g, '');
        if (cleaned !== phoneInput.value) phoneInput.value = cleaned;
        const digits = countDigits(phoneInput.value);
        // Validate with plugin for "too long" per-country, fallback to placeholder heuristic
        let tooLong = false;
        if (iti && typeof iti.getValidationError === 'function') {
          const err = iti.getValidationError();
          // 3 = TOO_LONG in intl-tel-input
          if (err === 3) tooLong = true;
        }
        if (tooLong || digits > maxDigits) {
          phoneInput.value = lastPhoneValue;
          setPhoneHelp('Phone number too long for selected country.', true);
        } else {
          lastPhoneValue = phoneInput.value;
          setPhoneHelp('Both email and phone are required.', false);
        }
      });
      phoneInput.dataset.sanitizerAttached = '1';
    }

    // Hook up country dropdown search on open
    const containerEl = phoneInput.closest('.iti');
    const flagBtn = containerEl?.querySelector('.iti__selected-flag') || containerEl?.querySelector('.iti__flag-container');
    if (flagBtn) {
      ['click','mousedown','keydown','focus'].forEach(function(evt){
        flagBtn.addEventListener(evt, function(){ setTimeout(scanAndAddSearch, 50); });
      });
    }
  

  // Initialize once at load
  initPhonePlugin();

  // External country search input next to phone input
  const phoneSearch = document.getElementById('phoneCountrySearch');
  const allCountries = (window.intlTelInputGlobals && window.intlTelInputGlobals.getCountryData) ? window.intlTelInputGlobals.getCountryData() : [];

  function normalize(str){ return (str || '').toString().trim().toLowerCase(); }
  function digitsOnly(str){ return (str || '').replace(/\D+/g, ''); }
  function bestMatchCountry(query){
    const q = normalize(query);
    if (!q) return null;
    const qDigits = digitsOnly(q).replace(/^0+/, '');
    // 1) Match by dial code if digits entered (like +256 or 256)
    if (qDigits) {
      const dialMatch = allCountries.find(c => c.dialCode === qDigits);
      if (dialMatch) return dialMatch;
    }
    // 2) Match by ISO2 (e.g., 'ug') or start of name, then includes
    let match = allCountries.find(c => normalize(c.iso2) === q || normalize(c.iso2).startsWith(q));
    if (match) return match;
    match = allCountries.find(c => normalize(c.name).startsWith(q));
    if (match) return match;
    match = allCountries.find(c => normalize(c.name).includes(q));
    return match || null;
  }
  function openPhoneDropdown() {
    const container = phoneInput?.closest('.iti');
    const flag = container?.querySelector('.iti__selected-flag, .iti__flag-container');
    if (flag) flag.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }
  function filterCountryList(q) {
    const list = document.querySelector('.iti__country-list');
    if (!list) return;
    const query = (q || '').trim().toLowerCase();
    const items = Array.from(list.querySelectorAll('.iti__country'));
    items.forEach(function(li){
      const name = (li.querySelector('.iti__country-name')?.textContent || '').toLowerCase();
      const dial = (li.querySelector('.iti__dial-code')?.textContent || '').toLowerCase();
      const code = (li.getAttribute('data-country-code') || '').toLowerCase();
      const match = !query || name.includes(query) || dial.includes(query) || code.includes(query);
      li.style.display = match ? '' : 'none';
    });
    // If only one visible, auto-select it for instant UX
    const visible = items.filter(li => li.style.display !== 'none');
    if (visible.length === 1) {
      visible[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
  }
  if (phoneSearch) {
    phoneSearch.addEventListener('focus', function(){
      openPhoneDropdown();
      setTimeout(function(){
        const m = bestMatchCountry(phoneSearch.value);
        if (m && iti && m.iso2) { iti.setCountry(m.iso2); updateMaxDigitsFromPlaceholder(); }
        filterCountryList(phoneSearch.value);
      }, 0);
    });
    phoneSearch.addEventListener('input', function(){
      openPhoneDropdown();
      setTimeout(function(){
        const m = bestMatchCountry(phoneSearch.value);
        if (m && iti && m.iso2) { iti.setCountry(m.iso2); updateMaxDigitsFromPlaceholder(); }
        filterCountryList(phoneSearch.value);
      }, 0);
    });
    phoneSearch.addEventListener('keydown', function(e){
      if (e.key === 'Enter') {
        e.preventDefault();
        openPhoneDropdown();
        setTimeout(function(){
          const list = document.querySelector('.iti__country-list');
          if (!list) return;
          const m = bestMatchCountry(phoneSearch.value);
          if (m && iti && m.iso2) { iti.setCountry(m.iso2); updateMaxDigitsFromPlaceholder(); }
          const firstVisible = Array.from(list.querySelectorAll('.iti__country')).find(li => li.style.display !== 'none');
          if (firstVisible) firstVisible.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }, 0);
      }
    });
  }

  // Prevent numbers in letter-only fields (first and last name)
  const firstNameEl = document.getElementById('first_name');
  const lastNameEl = document.getElementById('last_name');
  function sanitizeName(el){
    if (!el) return;
    el.addEventListener('input', function(){
      // Allow letters (unicode), spaces, apostrophes, hyphens
      const v = el.value;
      const cleaned = v.replace(/[^\p{L} '\-]/gu, '');
      if (cleaned !== v) el.value = cleaned;
    });
  }
  sanitizeName(firstNameEl);
  sanitizeName(lastNameEl);

  // Ensure amount remains numeric with optional decimal
  const amountEl = document.getElementById('amount');
  if (amountEl) {
    amountEl.addEventListener('input', function(){
      const v = amountEl.value;
      // Keep digits and at most one dot
      const cleaned = v.replace(/[^0-9.]/g, '').replace(/\.(?=.*\.)/g, '');
      if (cleaned !== v) amountEl.value = cleaned;
    });
  }
    // Add an explicit search field to any open dropdown and filter countries
    function addSearchForList(list) {
      if (!list || list.dataset.hasSearch === '1') return;
      const dropdown = list.parentElement;
      if (!dropdown) return;
      const wrap = document.createElement('div');
      wrap.className = 'iti__search-wrap px-2 pt-2';
      const input = document.createElement('input');
      input.type = 'search';
      input.className = 'form-control form-control-sm iti__search';
      input.placeholder = 'Search country or code';
      wrap.appendChild(input);
      dropdown.insertBefore(wrap, list);
      list.dataset.hasSearch = '1';
      input.addEventListener('input', function(){
        const q = input.value.trim().toLowerCase();
        const items = list.querySelectorAll('.iti__country');
        items.forEach(function(li){
          const name = (li.querySelector('.iti__country-name')?.textContent || '').toLowerCase();
          const dial = (li.querySelector('.iti__dial-code')?.textContent || '').toLowerCase();
          const code = (li.getAttribute('data-country-code') || '').toLowerCase();
          const match = !q || name.includes(q) || dial.includes(q) || code.includes(q);
          li.style.display = match ? '' : 'none';
        });
      });
      setTimeout(function(){ input.focus(); }, 0);
    }

    function scanAndAddSearch() {
      document.querySelectorAll('.iti__country-list').forEach(addSearchForList);
    }

    // Observe DOM for dropdown list creation
    const mo = new MutationObserver(function(mutations){
      for (const m of mutations) {
        m.addedNodes.forEach(function(node){
          if (!(node instanceof HTMLElement)) return;
          if (node.matches && node.matches('.iti__country-list')) {
            addSearchForList(node);
          } else {
            const list = node.querySelector?.('.iti__country-list');
            if (list) addSearchForList(list);
          }
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  function setStatus(type, text) {
    if (!statusEl) return;
    statusEl.className = 'alert mt-3 alert-' + (type === 'success' ? 'success' : 'danger');
    statusEl.textContent = text;
    statusEl.classList.remove('d-none');
  }

  form.addEventListener('submit', async function(e){
    e.preventDefault();
    if (statusEl) statusEl.classList.add('d-none');

    // Require both email and phone
    const email = form.querySelector('input[name="email"]').value.trim();
    if (!email) { setStatus('error', 'Email is required.'); return; }

    // Validate phone using intl-tel-input if available
    let e164 = '';
    if (iti) {
      if (!iti.isValidNumber()) {
        const err = iti.getValidationError();
        const msgMap = { 0: 'Invalid phone number.', 1: 'Invalid country code.', 2: 'Phone number too short.', 3: 'Phone number too long.', 4: 'Invalid phone number.' };
        setStatus('error', msgMap[err] || 'Invalid phone number.');
        return;
      }
      e164 = iti.getNumber();
      if (phoneHidden) phoneHidden.value = e164;
    } else {
      // Fallback: require non-empty
      const raw = (phoneInput && phoneInput.value || '').trim();
      if (!raw) { setStatus('error', 'Phone is required.'); return; }
      if (phoneHidden) phoneHidden.value = raw;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = submitBtn?.dataset?.loading || 'Redirecting...';
    }

    try {
      const fd = new FormData(form);
      // Ensure hidden E.164 phone is sent
      if (phoneHidden) fd.set('phone', phoneHidden.value || '');
      const resp = await fetch(form.getAttribute('action') || 'api/pesapal/create-order.php', {
        method: 'POST',
        body: fd,
        headers: { 'Accept': 'application/json' },
        credentials: 'same-origin'
      });
      const data = await resp.json().catch(()=>null);
      if (resp.ok && data && data.ok && data.redirect_url) {
        // Redirect to Pesapal hosted checkout
        window.location.href = data.redirect_url;
      } else {
        const msg = (data && (data.error || data.message)) || 'Unable to start payment. Please try again.';
        setStatus('error', msg);
      }
    } catch (err) {
      setStatus('error', 'Network error. Please try again.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = submitBtn?.dataset?.text || 'Give Now';
      }
    }
  });
})();
