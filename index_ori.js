// ==UserScript==
// @name         saBot Claimer - Check & Claim Unified
// @namespace    http://tampermonkey.net/
// @version      4.1
// @description  Stake Claimer dengan 1 Form untuk Check dan Claim Bonus + Captcha Turnstile
// @author       Gemini AI
// @match        https://stake.com/*
// @grant        none
// ==/UserScript==

(function() {
  const API_URL = "https://stake.com/_api/graphql";
  const AUTH_PASSWORD = "sagara321";
  const LS_ACCOUNTS = "sb_accs";
  const T_SITEKEY = "0x4AAAAAAAGD4gMGOTFnvupz";
  const SUPPORTED_CURRENCIES = ["usdt","btc","eth","ltc","bch","xrp","trx","doge","shib","usdc","dai","bnb","busd","ape","sand","uni","cro","sol","pol","link","eos"];

  function inject(url, type, id) {
    if (document.getElementById(id)) return;
    const el = document.createElement(type);
    if (type === "link") {
      el.rel = "stylesheet";
      el.href = url;
    } else {
      el.src = url;
      el.async = true;
      el.defer = true;
    }
    el.id = id;
    document.head.appendChild(el);
  }

  inject("https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css", "link", "bs-css");
  inject("https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js", "script", "bs-js");
  inject("https://challenges.cloudflare.com/turnstile/v0/api.js", "script", "cf-turnstile");

  const html = `
  <div class="modal fade show d-block" id="sb-modal" tabindex="-1" aria-modal="true" role="dialog" style="background:rgba(0,0,0,0.8);z-index:99999;">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content shadow border-0">
        <div class="modal-header bg-dark text-white">
          <h5 class="modal-title">saBot Claimer Login</h5>
        </div>
        <div class="modal-body">
          <input type="password" class="form-control mb-3" id="sb-loginPass" placeholder="Enter Password">
          <div id="sb-loginErr" class="text-danger small"></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary w-100" id="sb-loginBtn">Login</button>
        </div>
      </div>
    </div>
  </div>
  <div id="sb-panel" style="display:none;padding:20px;max-width:600px;margin:20px auto;background:#fff;border-radius:8px;z-index:99999;position:relative;">
    <h4 class="mb-3">Stake Bonus Claimer</h4>
    <div class="mb-3">
      <input type="text" id="sb-code" class="form-control mb-2" placeholder="Enter Bonus or Coupon Code">
      <div class="row g-2 mb-2">
        <div class="col-4"><select id="sb-type" class="form-select"><option value="bonus">BONUS</option><option value="coupon">COUPON</option></select></div>
        <div class="col-4"><select id="sb-claimType" class="form-select"><option value="ClaimBonusCode">Normal</option><option value="ClaimConditionBonusCode">Condition</option></select></div>
        <div class="col-4"><select id="sb-currency" class="form-select"></select></div>
      </div>
      <div class="mb-2"><div id="sb-turnstile"></div></div>
      <input type="text" id="sb-token" class="form-control mb-2" placeholder="Captcha token auto-filled" readonly>
      <button id="sb-checkClaim" class="btn btn-success w-100">Check & Claim</button>
      <div id="sb-status" class="mt-3 small text-center"></div>
    </div>
  </div>
  `;
  const root = document.createElement("div");
  root.innerHTML = html;
  document.body.appendChild(root);

  let activeApiKey = null;
  const renderCurrency = () => {
    const el = document.getElementById("sb-currency");
    SUPPORTED_CURRENCIES.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c.toUpperCase();
      el.appendChild(opt);
    });
  };

  const show = (msg, type = "info") => {
    const el = document.getElementById("sb-status");
    el.innerHTML = `<span class="text-${type}">${msg}</span>`;
  };

  let widgetId = null;
  const renderTurnstile = () => {
    if (window.turnstile) {
      widgetId = window.turnstile.render('#sb-turnstile', {
        sitekey: T_SITEKEY,
        callback: token => document.getElementById("sb-token").value = token,
        "error-callback": () => document.getElementById("sb-token").value = ""
      });
    }
  };

  // LOGIN
  document.getElementById("sb-loginBtn").onclick = () => {
    const pass = document.getElementById("sb-loginPass").value.trim();
    if (!pass) return document.getElementById("sb-loginErr").textContent = "Password required.";
    if (pass !== AUTH_PASSWORD) return document.getElementById("sb-loginErr").textContent = "Wrong password.";
    document.getElementById("sb-modal").style.display = "none";
    document.getElementById("sb-panel").style.display = "block";
    renderCurrency();
    setTimeout(renderTurnstile, 1200);
  };

  // MAIN ACTION
  document.getElementById("sb-checkClaim").onclick = async () => {
    const code = document.getElementById("sb-code").value.trim();
    const couponType = document.getElementById("sb-type").value;
    const claimType = document.getElementById("sb-claimType").value;
    const currency = document.getElementById("sb-currency").value;
    const token = document.getElementById("sb-token").value.trim();

    if (!activeApiKey) {
      const apiKey = prompt("Enter API Key (96 chars):");
      if (!apiKey || apiKey.length !== 96) return show("Invalid API Key", "danger");
      activeApiKey = apiKey;
    }

    if (!code) return show("Enter code!", "danger");
    if (!token) return show("Captcha required!", "danger");

    show("Checking availability...", "info");

    const checkQuery = `query BonusCodeAvailability($code: String!, $couponType: CouponType!) {
      bonusCodeAvailability(code: $code, couponType: $couponType)
    }`;
    const checkRes = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-access-token": activeApiKey },
      body: JSON.stringify({ query: checkQuery, variables: { code, couponType } })
    });
    const checkJson = await checkRes.json();
    if (!checkJson?.data?.bonusCodeAvailability) return show("Code not available.", "danger");

    show("Claiming...", "info");

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
    const claimRes = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-access-token": activeApiKey },
      body: JSON.stringify({ query: claimQuery, variables: { code, currency, turnstileToken: token } })
    });
    const claimJson = await claimRes.json();
    const key = claimType === "ClaimConditionBonusCode" ? "claimConditionBonusCode" : "claimBonusCode";
    if (claimJson?.data?.[key]) {
      show(`Claimed ${claimJson.data[key].amount} ${claimJson.data[key].currency}`, "success");
      if (window.turnstile && widgetId) window.turnstile.reset(widgetId);
      document.getElementById("sb-token").value = "";
    } else {
      show("Claim failed: " + (claimJson?.errors?.[0]?.message || "Unknown"), "danger");
      if (window.turnstile && widgetId) window.turnstile.reset(widgetId);
      document.getElementById("sb-token").value = "";
    }
  };

})();
