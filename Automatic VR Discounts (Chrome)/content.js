// 10% Off The Quest Store — content script
// Finds a creator/affiliate/discount code field at checkout and fills in the
// code for the current store. Never overwrites a code the user already typed,
// never touches gift-card/payment fields, and never places an order.

(() => {
  const AUTO_APPLY = true;
  const DEBUG = false;
  const DEFAULTS = { enabled: true };

  // Per-store config. `allow` lets a field through even if it also mentions
  // gift cards (Shopify's combined "Discount code or gift card" box).
  const SITES = [
    { hosts: /(^|\.)(meta|oculus)\.com$/i, code: "lop" },
    { hosts: /(^|\.)pimax\.com$/i, code: "MinibattleLop",
      allow: /discount code|reductions/i },
    { hosts: /(^|\.)kat-vr\.com$/i, code: "MinibattleLop",
      allow: /discount code/i },
  ];

  const site = SITES.find((s) => s.hosts.test(location.hostname));
  if (!site) return;

  // Field must look like a creator / affiliate / promo code input...
  const WANT = /(creator|affiliate|referr|promo|coupon|discount|offer|reductions)[\s_-]*(code)?|support[\s_-]*a[\s_-]*creator/i;
  // ...and must NOT be a gift card / store credit / payment field.
  const AVOID = /gift|redeem|wallet|card[\s_-]*number|cvv|cvc|security|postal|zip|email|phone|password|search/i;
  // Buttons that apply a code (never "place order"/"buy"/"pay").
  const APPLY = /^(apply|add|submit code|use code|redeem code|apply code)$/i;
  const NEVER_CLICK = /place order|buy|pay|purchase|complete|confirm|checkout/i;

  let settings = { ...DEFAULTS };
  const handled = new WeakSet();

  const log = (...a) => DEBUG && console.log("[QuestStore10]", ...a);

  function describe(el) {
    const label = el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null;
    return [
      el.name, el.id, el.placeholder,
      el.getAttribute("aria-label"),
      el.getAttribute("data-testid"),
      el.getAttribute("autocomplete"),
      label?.textContent,
      el.closest("label")?.textContent,
    ].filter(Boolean).join(" ");
  }

  function isCandidate(el) {
    if (handled.has(el) || el.disabled || el.readOnly) return false;
    if (el.type && !["text", "search", ""].includes(el.type)) return false;
    if (!el.offsetParent && getComputedStyle(el).position !== "fixed") return false; // hidden
    const text = describe(el);
    if (site.allow && site.allow.test(text)) return true;
    return WANT.test(text) && !AVOID.test(text);
  }

  // React/other frameworks ignore direct .value assignment; use the native setter.
  function setValue(el, value) {
    const proto = Object.getPrototypeOf(el);
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    setter ? setter.call(el, value) : (el.value = value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function findApplyButton(input) {
    let scope = input.parentElement;
    for (let i = 0; i < 5 && scope; i++, scope = scope.parentElement) {
      const btns = scope.querySelectorAll("button, [role='button'], input[type='submit']");
      for (const b of btns) {
        const t = (b.textContent || b.value || b.getAttribute("aria-label") || "").trim();
        if (APPLY.test(t) && !NEVER_CLICK.test(t)) return b;
      }
    }
    return null;
  }

  function tryFill() {
    if (!settings.enabled) return;
    for (const el of document.querySelectorAll("input")) {
      if (!isCandidate(el)) continue;
      handled.add(el);

      if (el.value.trim()) {
        log("Field already has a code, leaving it alone:", el.value);
        continue;
      }

      setValue(el, site.code);
      log("Filled", site.code, "into", el);

      if (AUTO_APPLY) {
        // Delay so the framework registers the input and enables the button.
        setTimeout(() => {
          const btn = findApplyButton(el);
          if (btn && !btn.disabled) { btn.click(); log("Clicked apply", btn); }
          else log("No enabled apply button found; code entered only.");
        }, 400);
      }
    }
  }

  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => { scheduled = false; tryFill(); }, 300);
  });

  chrome.storage.sync.get(DEFAULTS, (s) => {
    settings = { enabled: s.enabled };
    tryFill();
    observer.observe(document.documentElement, { childList: true, subtree: true });
  });

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.enabled) settings.enabled = changes.enabled.newValue;
  });
})();
