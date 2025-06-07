// ==UserScript==
// @name         saBot Stake Claimer - Unified Form Full Logic
// @namespace    http://tampermonkey.net/
// @version      5.0
// @description  Check and Claim Stake Bonus with Captcha + Unified Logic + Password Protected Panel + API Key Management
// @author       Gemini
// @match        https://stake.com/*
// @grant        none
// ==/UserScript==

(function() {
  const API_URL = "https://stake.com/_api/graphql";
  const AUTH_PASSWORD = "sagara321";
  const T_SITEKEY = "0x4AAAAAAAGD4gMGOTFnvupz";
  const SUPPORTED_CURRENCIES = ["usdt","btc","eth","ltc","bch","xrp","trx","doge","shib","usdc","dai","bnb","busd","ape","sand","uni","cro","sol","pol","link","eos"];

  let activeApiKey = null;
  let widgetId = null;

  const inject = (url, type, id) => {
    if (document.getElementById(id)) return;
    const el = document.createElement(type);
    el.id = id;
    if (type === "link") {
      el.rel = "stylesheet";
      el.href = url;
    } else {
      el.src = url;
      el.async = true;
      el.defer = true;
    }
    document.head.appendChild(el);
  };

  inject("https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css", "link", "bs-css");
  inject("https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js", "script", "bs-js");
  inject("https://challenges.cloudflare.com/turnstile/v0/api.js", "script", "cf-turnstile");

  const html = `
  <div id="sb-modal" class="modal fade show d-block" tabindex="-1" style="background:rgba(0,0,0,0.8);z-index:99999;">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header bg-dark text-white">
          <h5 class="modal-title">Stake Claimer Login</h5>
        </div>
        <div class="modal-body">
          <input type="password" id="sb-pass" class="form-control mb-2" placeholder="Enter Password">
          <div id="sb-err" class="text-danger small"></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary w-100" id="sb-loginBtn">Login</button>
        </div>
      </div>
    </div>
  </div>
  <div id="sb-panel" style="display:none;max-width:600px;margin:20px auto;background:#fefefe;padding:20px;border-radius:8px;z-index:99999;">
    <h4 class="mb-3">Stake Claimer - Unified</h4>
    <input type="text" id="sb-code" class="form-control mb-2" placeholder="Bonus / Coupon Code">
    <div class="row g-2 mb-2">
      <div class="col-4"><select id="sb-type" class="form-select"><option value="bonus">BONUS</option><option value="coupon">COUPON</option></select></div>
      <div class="col-4"><select id="sb-claimType" class="form-select"><option value="ClaimBonusCode">Normal</option><option value="ClaimConditionBonusCode">Condition</option></select></div>
      <div class="col-4"><select id="sb-currency" class="form-select"></select></div>
    </div>
    <div class="mb-2"><div id="sb-turnstile"></div></div>
    <input type="text" id="sb-token" class="form-control mb-2" placeholder="Captcha token" readonly>
    <button id="sb-action" class="btn btn-success w-100">Check & Claim</button>
    <div id="sb-msg" class="mt-3 text-center small"></div>
  </div>
  `;

  const root = document.createElement("div");
  root.innerHTML = html;
  document.body.appendChild(root);

  const showMsg = (msg, type = "info") => {
    document.getElementById("sb-msg").innerHTML = `<span class="text-${type}">${msg}</span>`;
  };

  const renderCurrency = () => {
    const el = document.getElementById("sb-currency");
    el.innerHTML = "";
    SUPPORTED_CURRENCIES.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c.toUpperCase();
      el.appendChild(opt);
    });
  };

  const renderTurnstile = () => {
    if (window.turnstile) {
      widgetId = window.turnstile.render('#sb-turnstile', {
        sitekey: T_SITEKEY,
        callback: token => document.getElementById("sb-token").value = token,
        "error-callback": () => document.getElementById("sb-token").value = ""
      });
    }
  };

  document.getElementById("sb-loginBtn").onclick = () => {
    const pass = document.getElementById("sb-pass").value.trim();
    if (!pass) return document.getElementById("sb-err").textContent = "Password required.";
    if (pass !== AUTH_PASSWORD) return document.getElementById("sb-err").textContent = "Wrong password.";
    document.getElementById("sb-modal").style.display = "none";
    document.getElementById("sb-panel").style.display = "block";
    renderCurrency();
    setTimeout(renderTurnstile, 1000);
  };

  document.getElementById("sb-action").onclick = async () => {
    const code = document.getElementById("sb-code").value.trim();
    const couponType = document.getElementById("sb-type").value;
    const claimType = document.getElementById("sb-claimType").value;
    const currency = document.getElementById("sb-currency").value;
    const token = document.getElementById("sb-token").value.trim();

    if (!code) return showMsg("Enter code!", "danger");
    if (!token) return showMsg("Complete the captcha!", "danger");

    if (!activeApiKey) {
      const api = prompt("Enter API Key (96 chars):");
      if (!api || api.length !== 96) return showMsg("Invalid API Key", "danger");
      activeApiKey = api;
    }

    // Step 1: Check
    showMsg("Checking code...");
    const checkQuery = `query BonusCodeAvailability($code: String!, $couponType: CouponType!) {
      bonusCodeAvailability(code: $code, couponType: $couponType)
    }`;
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-access-token": activeApiKey },
        body: JSON.stringify({ query: checkQuery, variables: { code, couponType } })
      });
      const json = await res.json();
      if (!json?.data?.bonusCodeAvailability) return showMsg("Code not available", "danger");
    } catch (e) {
      return showMsg("Check failed", "danger");
    }

    // Step 2: Claim
    showMsg("Claiming bonus...");
    const claimQuery = claimType === "ClaimConditionBonusCode"
      ? `mutation ClaimConditionBonusCode($code: String!, $currency: CurrencyEnum!, $turnstileToken: String!) {
          claimConditionBonusCode(code: $code, currency: $currency, turnstileToken: $turnstileToken) {
            amount currency
          }
        }`
      : `mutation ClaimBonusCode($code: String!, $currency: CurrencyEnum!, $turnstileToken: String!) {
          claimBonusCode(code: $code, currency: $currency, turnstileToken: $turnstileToken) {
            amount currency
          }
        }`;
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-access-token": activeApiKey },
        body: JSON.stringify({ query: claimQuery, variables: { code, currency, turnstileToken: token } })
      });
      const json = await res.json();
      const key = claimType === "ClaimConditionBonusCode" ? "claimConditionBonusCode" : "claimBonusCode";
      if (json?.data?.[key]) {
        showMsg(`Claimed: ${json.data[key].amount} ${json.data[key].currency}`, "success");
        if (window.turnstile && widgetId) window.turnstile.reset(widgetId);
        document.getElementById("sb-token").value = "";
      } else {
        showMsg("Claim failed: " + (json.errors?.[0]?.message || "Unknown error"), "danger");
        if (window.turnstile && widgetId) window.turnstile.reset(widgetId);
        document.getElementById("sb-token").value = "";
      }
    } catch (e) {
      showMsg("Error during claim", "danger");
    }
  };
})();
