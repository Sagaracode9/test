// ==UserScript==
// @name         Stake Bonus Claimer - Unified Form
// @namespace    https://github.com/yourusername
// @version      1.0
// @description  Check and Claim Stake Bonus/Coupon in One Form with Captcha + API Key + UI + Turnstile Integration
// @author       
// @match        https://stake.com/*
// @icon         https://stake.com/favicon.ico
// @downloadURL  https://raw.githubusercontent.com/yourusername/yourrepo/main/scripts/stake-bonus-claimer.user.js
// @updateURL    https://raw.githubusercontent.com/yourusername/yourrepo/main/scripts/stake-bonus-claimer.user.js
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const API_URL = "https://stake.com/_api/graphql";
  const AUTH_PASSWORD = "sagara321";
  const T_SITEKEY = "0x4AAAAAAAGD4gMGOTFnvupz";
  const SUPPORTED_CURRENCIES = ["usdt", "btc", "eth", "ltc", "bch", "xrp", "trx", "doge", "shib", "usdc", "dai", "bnb", "busd", "ape", "sand", "uni", "cro", "sol", "pol", "link", "eos"];
  let activeApiKey = null;
  let turnstileWidgetId = null;

  function injectResource(url, type, id) {
    if (document.getElementById(id)) return;
    const el = document.createElement(type);
    el.id = id;
    if (type === 'link') {
      el.rel = 'stylesheet';
      el.href = url;
    } else {
      el.src = url;
      el.async = true;
      el.defer = true;
    }
    document.head.appendChild(el);
  }

  // Inject Bootstrap & Turnstile
  injectResource("https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css", "link", "bs-css");
  injectResource("https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js", "script", "bs-js");
  injectResource("https://challenges.cloudflare.com/turnstile/v0/api.js", "script", "cf-turnstile");

  // HTML UI
  const html = `
    <div id="sb-login" style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.85);z-index:99999;display:flex;align-items:center;justify-content:center;">
      <div class="card shadow p-4" style="width:300px;">
        <h5 class="mb-3">Stake Claimer Login</h5>
        <input type="password" id="sb-pass" class="form-control mb-2" placeholder="Enter Password">
        <button class="btn btn-primary w-100" id="sb-loginBtn">Login</button>
        <div id="sb-loginErr" class="text-danger mt-2 small"></div>
      </div>
    </div>
    <div id="sb-panel" class="container" style="max-width:600px;margin-top:40px;display:none;z-index:9999;">
      <div class="card p-4 shadow">
        <h4 class="mb-3">Stake Bonus Claimer</h4>
        <input type="text" id="sb-code" class="form-control mb-2" placeholder="Enter Bonus/Coupon Code">
        <div class="row g-2 mb-2">
          <div class="col-4"><select id="sb-type" class="form-select"><option value="bonus">BONUS</option><option value="coupon">COUPON</option></select></div>
          <div class="col-4"><select id="sb-claimType" class="form-select"><option value="ClaimBonusCode">Normal</option><option value="ClaimConditionBonusCode">Condition</option></select></div>
          <div class="col-4"><select id="sb-currency" class="form-select"></select></div>
        </div>
        <div class="mb-2"><div id="sb-turnstile"></div></div>
        <input type="text" id="sb-token" class="form-control mb-2" placeholder="Captcha Token" readonly>
        <button class="btn btn-success w-100" id="sb-action">Check & Claim</button>
        <div id="sb-status" class="mt-3 text-center small"></div>
      </div>
    </div>
  `;

  const container = document.createElement("div");
  container.innerHTML = html;
  document.body.appendChild(container);

  function showStatus(msg, type = "info") {
    document.getElementById("sb-status").innerHTML = `<span class="text-${type}">${msg}</span>`;
  }

  function renderCurrencyOptions() {
    const el = document.getElementById("sb-currency");
    el.innerHTML = SUPPORTED_CURRENCIES.map(c => `<option value="${c}">${c.toUpperCase()}</option>`).join('');
  }

  function renderTurnstile() {
    if (window.turnstile) {
      turnstileWidgetId = window.turnstile.render('#sb-turnstile', {
        sitekey: T_SITEKEY,
        callback: token => document.getElementById("sb-token").value = token,
        "error-callback": () => document.getElementById("sb-token").value = ""
      });
    }
  }

  // Login logic
  document.getElementById("sb-loginBtn").onclick = () => {
    const input = document.getElementById("sb-pass").value.trim();
    if (input !== AUTH_PASSWORD) {
      document.getElementById("sb-loginErr").textContent = "Wrong password!";
      return;
    }
    document.getElementById("sb-login").remove();
    document.getElementById("sb-panel").style.display = "block";
    renderCurrencyOptions();
    const intv = setInterval(() => {
      if (window.turnstile) {
        clearInterval(intv);
        renderTurnstile();
      }
    }, 500);
  };

  // Main logic: Check & Claim
  document.getElementById("sb-action").onclick = async () => {
    const code = document.getElementById("sb-code").value.trim();
    const couponType = document.getElementById("sb-type").value;
    const claimType = document.getElementById("sb-claimType").value;
    const currency = document.getElementById("sb-currency").value;
    const token = document.getElementById("sb-token").value.trim();

    if (!code) return showStatus("Code required!", "danger");
    if (!token) return showStatus("Complete captcha first!", "danger");

    if (!activeApiKey) {
      const input = prompt("Enter Stake API Key (96 chars):");
      if (!input || input.length !== 96) return showStatus("Invalid API Key", "danger");
      activeApiKey = input;
    }

    showStatus("Checking code...");
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
      if (!json?.data?.bonusCodeAvailability) return showStatus("Code not available", "danger");
    } catch {
      return showStatus("Error during check", "danger");
    }

    showStatus("Claiming bonus...");
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
        const amt = json.data[key].amount;
        const cur = json.data[key].currency;
        showStatus(`Claimed: ${amt} ${cur}`, "success");
        if (window.turnstile && turnstileWidgetId) window.turnstile.reset(turnstileWidgetId);
        document.getElementById("sb-token").value = "";
      } else {
        showStatus("Claim failed: " + (json.errors?.[0]?.message || "Unknown"), "danger");
        if (window.turnstile && turnstileWidgetId) window.turnstile.reset(turnstileWidgetId);
        document.getElementById("sb-token").value = "";
      }
    } catch {
      showStatus("Claim error occurred", "danger");
    }
  };

})();
