// This fixed function runs in the browser. The model cannot supply JavaScript.
// Authentication inputs and hidden fields never enter its observation.
export const observePageSource = String.raw`(() => {
  const visible = (el) => !!el.getClientRects().length && getComputedStyle(el).visibility !== "hidden";
  const secret = (el) => /password|one-time-code|cc-|otp|verification|security.code|token|secret/i.test([
    el.getAttribute("type"), el.getAttribute("autocomplete"), el.getAttribute("name"),
    el.getAttribute("id"), el.getAttribute("aria-label"),
  ].join(" "));
  const text = document.body.innerText;
  const elements = [...document.querySelectorAll("a,button,input,textarea,select,[role=button]")]
    .filter((el) => visible(el) && !secret(el));
  const blocked = text.length > 14000 || elements.length > 150 || elements.some((el) => (el.value || '').length > 4000 || (el instanceof HTMLSelectElement && (el.multiple || el.options.length > 100))) ||
    /[?&](token|code|secret|key|signature|access_token)=/i.test(location.search) || [...document.querySelectorAll("input")].some((el) => visible(el) && secret(el)) ||
    /captcha|verify (you are|you're) human|verification code|two.factor authentication/i.test(text) ||
    [...document.querySelectorAll("iframe")].some((el) => visible(el) && /captcha|challenge|turnstile/i.test(el.src));
  if (blocked) return { url: location.origin + location.pathname, title: "User verification required", text: "", controls: [], blocked: true };
  const controls = elements.map((el, id) => {
    el.setAttribute("data-jobswitch-control", String(id));
    const input = el;
    const label = el.getAttribute("aria-label") || input.labels?.[0]?.innerText ||
      el.innerText || el.getAttribute("placeholder") || el.getAttribute("name") || el.tagName;
    return {
      id, tag: el.tagName.toLowerCase(), type: el.getAttribute("type") || "",
      label: label.slice(0, 300), value: (input.value || "").slice(0, 4000),
      href: el instanceof HTMLAnchorElement ? el.href : "",
      options: el instanceof HTMLSelectElement ? [...el.options].map((o) => o.value).slice(0, 100) : [],
      checked: !!input.checked, disabled: !!input.disabled,
    };
  });
  return { url: location.href, title: document.title.slice(0, 300), text: text.slice(0, 14000), controls, blocked: false };
})`;

export const observationCode = `return await page.evaluate(${observePageSource});`;
