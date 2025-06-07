// ==UserScript==
// @name         Stake Bonus Claimer - Unified UI Final
// @namespace    http://tampermonkey.net/
// @version      5.2
// @description  Check & Claim Stake bonus with one form + Captcha + Password + API Key + Inject Fix + Ready on page load
// @author       
// @match        https://stake.com/*
// @grant        none
// ==/UserScript==

(function () {
  const API_URL = "https://stake.com/_api/graphql";
  const AUTH_PASSWORD = "sagara321";
  const T_SITEKEY = "0x4AAAAAAAGD4gMGOTFnvupz";
  const SUPPORTED_CURRENCIES = ["usdt", "btc", "eth", "ltc", "bch", "xrp", "trx", "doge", "shib", "usdc", "dai", "bnb", "busd", "ape", "sand", "uni", "cro", "sol", "pol", "link", "eos"];
  let activeApiKey = null;
  let turnstileWidgetId = null;

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

  // Inject UI after page fully loaded
  window.addEventListener("load", () => {
    const wrap = document.createElement("div");
    wrap.innerHTML = html;
    document.body.appendChild(wrap);

    document.getElementById("sb-loginBtn").onclick = () => {
      const pass = document.getElementById("sb-pass").value.trim();
      if (pass !== AUTH_PASSWORD) return document.getElementById("sb-loginErr").textContent = "Wrong password!";
      document.getElementById("sb-login").remove();
      document.getElementById("sb-panel").style.display = "block";
      fillCurrency();
      const turnstileTimer = setInterval(() => {
        if (window.turnstile) {
          clearInterval(turnstileTimer);
          turnstileWidgetId = window.turnstile.render("#sb-turnstile", {
            sitekey: T_SITEKEY,
            callback: token => document.getElementById("sb-token").value = token,
            "error-callback": () => document.getElementById("sb-token").value = ""
          });
        }
      }, 500);
    };

    document.getElementById("sb-action").onclick = async () => {
      const code = document.getElementById("sb-code").value.trim();
      const couponType = document.getElementById("sb-type").value;
      const claimType = document.getElementById("sb-claimType").value;
      const currency = document.getElementById("sb-currency").value;
      const token = document.getElementById("sb-token").value.trim();

      if (!code) return status("Code required", "danger");
      if (!token) return status("Complete captcha", "danger");

      if (!activeApiKey) {
        const input = prompt("Enter Stake API Key (96 chars):");
        if (!input || input.length !== 96) return status("Invalid API Key", "danger");
        activeApiKey = input;
      }

      status("Checking code...");
      try {
        const check = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-access-token": activeApiKey },
          body: JSON.stringify({
            query: `query BonusCodeAvailability($code: String!, $couponType: CouponType!) {
              bonusCodeAvailability(code: $code, couponType: $couponType)
            }`,
            variables: { code, couponType }
          })
        });
        const res = await check.json();
        if (!res?.data?.bonusCodeAvailability) return status("Code not available", "danger");
      } catch {
        return status("Check error", "danger");
      }

      status("Claiming...");
      const mutation = claimType === "ClaimConditionBonusCode"
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
          body: JSON.stringify({ query: mutation, variables: { code, currency, turnstileToken: token } })
        });
        const json = await res.json();
        const key = claimType === "ClaimConditionBonusCode" ? "claimConditionBonusCode" : "claimBonusCode";
        if (json?.data?.[key]) {
          status(`Claimed: ${json.data[key].amount} ${json.data[key].currency}`, "success");
          if (window.turnstile && turnstileWidgetId) window.turnstile.reset(turnstileWidgetId);
          document.getElementById("sb-token").value = "";
        } else {
          status("Claim failed: " + (json?.errors?.[0]?.message || "Unknown"), "danger");
        }
      } catch {
        status("Claim error", "danger");
      }
    };

    function status(msg, type = "info") {
      document.getElementById("sb-status").innerHTML = `<span class="text-${type}">${msg}</span>`;
    }

    function fillCurrency() {
      const sel = document.getElementById("sb-currency");
      sel.innerHTML = SUPPORTED_CURRENCIES.map(c => `<option value="${c}">${c.toUpperCase()}</option>`).join('');
    }
  });
})();
