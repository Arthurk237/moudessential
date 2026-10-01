/*
  MOUD waitlist signup
  --------------------
  Every <form data-waitlist-form> on the site is sent to /api/subscribe.
  server.js saves the signup to data/emails.json and syncs it to Shopify
  (customer tagged "MOUD waitlist", email marketing consent = subscribed).
  See INTEGRATION.md for the Shopify side.

  Fields read from each form by name: email (required), firstName, country.
  The form needs the Node server running (npm start) — opening the HTML file
  directly or with Live Server shows the design, but signups can't reach Shopify.
*/
(function () {
  "use strict";

  const ENDPOINT = "/api/subscribe";
  const TIMEOUT_MS = 25000;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const MESSAGES = {
    joined: "You're officially in. We'll let you know first.",
    alreadyJoined: "You're already on the list. We'll let you know first.",
    invalidEmail: "Please enter a valid email address.",
    generic: "Something went wrong. Please try again.",
    unavailable: "Signups aren't available right now. Please try again in a moment.",
    slow: "This is taking longer than usual. Please try again.",
  };

  const forms = Array.from(document.querySelectorAll("form[data-waitlist-form]"));
  if (!forms.length) return;

  const valueOf = (form, name) => {
    const el = form.elements[name];
    return el && typeof el.value === "string" ? el.value.trim() : "";
  };

  const setStatus = (form, text, kind) => {
    const el = form.querySelector("[data-form-status]");
    if (!el) return;
    el.textContent = text || "";
    el.classList.toggle("is-error", kind === "error");
    el.classList.toggle("is-success", kind === "success");
  };

  const setBusy = (form, busy) => {
    const button = form.querySelector('button[type="submit"]');
    form.setAttribute("aria-busy", busy ? "true" : "false");
    if (!button) return;
    if (!button.dataset.label) button.dataset.label = button.textContent;
    button.disabled = busy;
    button.textContent = busy ? "Joining…" : button.dataset.label;
  };

  // Once someone has joined, every waitlist form on the page shows the confirmation.
  const markJoined = (message) => {
    forms.forEach((form) => {
      form.classList.add("is-joined");
      form.setAttribute("aria-busy", "false");
      form.querySelectorAll("input, button").forEach((el) => { el.disabled = true; });
      setStatus(form, message, "success");
    });
  };

  const devHint = (detail) => {
    console.warn(
      "[MOUD] Signup couldn't reach " + ENDPOINT + " (" + detail + "). " +
      "Run the site with `npm start` and open http://localhost:3000 — the server is what saves signups and sends them to Shopify."
    );
  };

  forms.forEach((form) => {
    const emailInput = form.elements.email;

    if (emailInput) {
      emailInput.addEventListener("input", () => {
        emailInput.removeAttribute("aria-invalid");
        if (form.querySelector(".form-status.is-error")) setStatus(form, "");
      });
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (form.classList.contains("is-joined") || form.getAttribute("aria-busy") === "true") return;

      const email = valueOf(form, "email");
      if (!EMAIL_RE.test(email)) {
        setStatus(form, MESSAGES.invalidEmail, "error");
        if (emailInput) {
          emailInput.setAttribute("aria-invalid", "true");
          emailInput.focus();
        }
        return;
      }

      setStatus(form, "");
      setBusy(form, true);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        const res = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            email,
            firstName: valueOf(form, "firstName"),
            country: valueOf(form, "country"),
          }),
          signal: controller.signal,
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          if (res.status === 404 || res.status === 405) {
            devHint("HTTP " + res.status);
            throw new Error(MESSAGES.unavailable);
          }
          throw new Error(data.error || MESSAGES.generic);
        }

        markJoined(data.alreadySubscribed ? MESSAGES.alreadyJoined : MESSAGES.joined);
      } catch (err) {
        setBusy(form, false);
        let message = err && err.message ? err.message : MESSAGES.generic;
        if (err && err.name === "AbortError") {
          message = MESSAGES.slow;
        } else if (err instanceof TypeError) {
          // fetch() itself failed: offline, or the page isn't being served by server.js
          devHint(location.protocol === "file:" ? "page opened as a file" : err.message);
          message = MESSAGES.unavailable;
        }
        setStatus(form, message, "error");
      } finally {
        clearTimeout(timer);
      }
    });
  });
})();
