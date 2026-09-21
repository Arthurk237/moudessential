(function () {
  const form = document.getElementById("signup-form");
  const firstNameInput = document.getElementById("first-name");
  const emailInput = document.getElementById("email");
  const countryInput = document.getElementById("country");
  const submitBtn = document.getElementById("submit-btn");
  const statusEl = document.getElementById("form-status");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    statusEl.textContent = "";
    statusEl.className = "form-status";

    const firstName = firstNameInput?.value.trim() || "";
    const email = emailInput.value.trim();
    const country = countryInput?.value.trim() || "";

    if (!email) {
      statusEl.textContent = "Please enter your email address.";
      statusEl.classList.add("is-error");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Joining…";

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, email, country }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong. Please try again.");
      }

      // Force the exact confirmation message regardless of server response
      const confirmation = "You are officially in the list. We will be the first to let you know when MOUD launches.";
      form.innerHTML = `
        <div class="confirmation">
          <p class="confirmation-title">You're officially in.</p>
          <p class="confirmation-copy">${confirmation}</p>
        </div>
      `;
      statusEl.textContent = "";
    } catch (err) {
      statusEl.textContent = err.message || "Something went wrong. Please try again.";
      statusEl.classList.add("is-error");
      submitBtn.disabled = false;
      submitBtn.textContent = "Join the Waitlist";
    }
  });
})();
