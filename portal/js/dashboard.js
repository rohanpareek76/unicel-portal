(function () {
  const user = Portal.getUser();
  if (!user || !Portal.getToken()) {
    window.location.href = "login.html";
    return;
  }

  const ROLE_LABEL = { founder: "Founder", director: "Director", hoi: "Head of Institution" };
  const QUEUE_TITLE = {
    founder: "Company-wide applications",
    director: "Applications awaiting your risk review",
    hoi: "New applications to verify",
  };
  const ACTION_LABEL = {
    recommend: "Recommend",
    approve: "Approve",
    reject: "Reject",
    escalate: "Escalate to Founder",
  };
  const STATUS_LABEL = {
    SUBMITTED: "Submitted",
    DIRECTOR_REVIEW: "With Director",
    FOUNDER_REVIEW: "With Founder",
    DISBURSED: "Disbursed",
    REJECTED: "Rejected",
  };

  document.getElementById("who-name").textContent = user.name;
  document.getElementById("who-role").textContent = ROLE_LABEL[user.role] || user.role;
  document.getElementById("queue-title").textContent = QUEUE_TITLE[user.role] || "Applications";

  document.getElementById("logout-btn").addEventListener("click", () => {
    Portal.clearSession();
    window.location.href = "login.html";
  });

  if (user.role === "hoi") {
    document.getElementById("new-loan-panel").style.display = "block";
  }
  if (user.role === "founder") {
    document.getElementById("summary-cards").style.display = "grid";
    loadSummary();
  }

  document.getElementById("new-loan-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const body = {
      applicant_name: document.getElementById("nl-name").value.trim(),
      village: document.getElementById("nl-village").value.trim(),
      purpose: document.getElementById("nl-purpose").value.trim(),
      amount: Number(document.getElementById("nl-amount").value),
    };
    try {
      await Portal.api("/api/loans", { method: "POST", body: JSON.stringify(body) });
      e.target.reset();
      showToast("Application logged.");
      loadLoans();
    } catch (err) {
      showToast(err.message);
    }
  });

  async function loadSummary() {
    try {
      const { totals } = await Portal.api("/api/stats/summary");
      const cards = [
        { num: totals.total_applications, label: "Total applications" },
        { num: "₹" + Number(totals.total_disbursed).toLocaleString("en-IN"), label: "Disbursed to date" },
        { num: totals.pending, label: "Pending across the chain" },
        { num: totals.rejected, label: "Rejected" },
      ];
      document.getElementById("summary-cards").innerHTML = cards.map(c =>
        `<div class="summary-card"><div class="num">${c.num}</div><div class="label">${c.label}</div></div>`
      ).join("");
    } catch (err) {
      // Non-fatal — dashboard still works without the summary strip
    }
  }

  async function loadLoans() {
    const listEl = document.getElementById("loan-list");
    try {
      const { loans } = await Portal.api("/api/loans");
      document.getElementById("queue-count").textContent = loans.length + (loans.length === 1 ? " case" : " cases");

      if (loans.length === 0) {
        listEl.innerHTML = `<div class="empty-note">Nothing here right now.</div>`;
        return;
      }

      listEl.innerHTML = loans.map(renderRow).join("");

      listEl.querySelectorAll("[data-action]").forEach(btn => {
        btn.addEventListener("click", () => handleDecision(btn.dataset.id, btn.dataset.action));
      });
    } catch (err) {
      listEl.innerHTML = `<div class="empty-note">Could not load applications: ${err.message}</div>`;
    }
  }

  function renderRow(loan) {
    const actions = (loan.availableActions || []).map(a =>
      `<button class="${a}" data-id="${loan.id}" data-action="${a}">${ACTION_LABEL[a]}</button>`
    ).join("");

    return `
      <div class="loan-row">
        <div>
          <div class="applicant">${escapeHtml(loan.applicant_name)}</div>
          <div class="village">${escapeHtml(loan.village)} — ${escapeHtml(loan.purpose)}</div>
        </div>
        <div class="amount">₹${Number(loan.amount).toLocaleString("en-IN")}</div>
        <div><span class="status-pill status-${loan.status}">${STATUS_LABEL[loan.status] || loan.status}</span></div>
        <div style="font-size:0.78rem; color: var(--ink-soft);">#${loan.id}</div>
        <div class="row-actions">${actions || "—"}</div>
      </div>
    `;
  }

  async function handleDecision(loanId, action) {
    let remarks = "";
    if (action === "reject" || action === "escalate") {
      remarks = window.prompt("Add a short remark for this decision (optional):") || "";
    }
    try {
      await Portal.api(`/api/loans/${loanId}/decision`, {
        method: "PATCH",
        body: JSON.stringify({ action, remarks }),
      });
      showToast("Decision recorded.");
      loadLoans();
      if (user.role === "founder") loadSummary();
    } catch (err) {
      showToast(err.message);
    }
  }

  function showToast(msg) {
    const toast = document.getElementById("toast");
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2600);
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, s => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[s]));
  }

  loadLoans();
})();
