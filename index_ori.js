// ==UserScript==
// @name         saBot Claimer Modern UI + Turnstile
// @namespace    http://tampermonkey.net/
// @version      4.0
// @description  Multi-account Stake bonus claimer + Cloudflare Turnstile captcha widget
// @author       Gemini AI
// @match        https://stake.com/*
// @grant        none
// ==/UserScript==

(function() {
  // ---- Konstanta ----
  const API_URL = "https://stake.com/_api/graphql";
  const AUTH_PASSWORD = "sagara321";
  const LS_ACCOUNTS = "sb_accs";
  const T_SITEKEY = "0x4AAAAAAAGD4gMGOTFnvupz";
  const SUPPORTED_CURRENCIES = [
    "usdt", "btc", "eth", "ltc", "bch", "xrp", "trx", "doge", "shib", "usdc", "dai", "bnb", "busd", "ape", "sand", "uni", "cro", "sol", "pol", "link", "eos"
  ];

  // --- Inject Bootstrap 5.3 CDN jika belum ada
  function injectBootstrap() {
    if (!document.getElementById("bs-claimer-bootstrap")) {
      const link = document.createElement("link");
      link.id = "bs-claimer-bootstrap";
      link.rel = "stylesheet";
      link.href = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css";
      document.head.appendChild(link);
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js";
      document.body.appendChild(script);
    }
  }
  injectBootstrap();

  // --- Inject Cloudflare Turnstile JS jika belum ada
  function injectTurnstile() {
    if (!document.getElementById("cf-turnstile-js")) {
      const sc = document.createElement("script");
      sc.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      sc.async = true;
      sc.defer = true;
      sc.id = "cf-turnstile-js";
      document.head.appendChild(sc);
    }
  }
  injectTurnstile();

  // --- UI Root
  const root = document.createElement('div');
  root.id = "fb-claimer-root";
  root.innerHTML = 
  <div class="modal fade show d-block" id="fb-claimer-modal" tabindex="-1" aria-modal="true" role="dialog" style="background:rgba(34,44,55,0.96);z-index:2147483647;">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content shadow border-0">
        <div class="modal-header bg-primary text-white">
          <h5 class="modal-title">saBot Claimer Login</h5>
        </div>
        <div class="modal-body">
          <input type="password" class="form-control form-control-lg mb-3" id="fb-loginPassword" maxlength="100" placeholder="Enter Password">
          <div class="invalid-feedback d-block text-danger" id="fb-loginErr"></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-success w-100" id="fb-loginBtn">Login</button>
        </div>
      </div>
    </div>
  </div>
  <div id="fb-claimer-panel-main" class="container-fluid p-0" style="display:none;max-width:720px;margin:60px auto 50px auto;z-index:2147483647;position:relative;height:95vh;overflow-y:auto;">
    <nav class="navbar navbar-expand navbar-dark bg-primary rounded-bottom mb-4 px-4 py-2 shadow" style="z-index:999;">
      <span class="navbar-brand fw-bold">saBot Claimer</span>
      <span class="ms-auto text-light small">Site: stake.bet</span>
    </nav>
    <div class="card shadow mb-4">
      <div class="card-header fw-semibold bg-gradient text-primary">User & Balance Info</div>
      <div class="card-body">
        <div class="row row-cols-2 row-cols-sm-2 g-2 small">
          <div>User ID: <span id="fb-userId" class="fw-bold text-info">-</span></div>
          <div>User Name: <span id="fb-userName" class="fw-bold text-success">-</span></div>
        </div>
        <div class="my-2">
          <span id="fb-userStatus" class="badge bg-warning text-dark"></span>
        </div>
        <div>Credits: <span id="fb-userCredits" class="fw-semibold text-warning">-</span></div>
        <div id="fb-viphost" class="text-secondary small mt-1"></div>
        <div id="fb-faucet" class="text-secondary small"></div>
      </div>
    </div>
    <div class="card shadow mb-4">
      <div class="card-header fw-semibold bg-gradient text-primary">Connected Accounts</div>
      <div class="card-body">
        <div id="fb-accounts" class="mb-2"></div>
        <div class="input-group mb-2">
          <input type="password" class="form-control" id="fb-apiKeyInput" maxlength="96" placeholder="Enter API Key (96 characters)">
          <button class="btn btn-outline-secondary" type="button" id="fb-pasteClipboard" title="Paste from clipboard">📋</button>
          <button class="btn btn-primary" type="button" id="fb-connectAPI">Connect</button>
        </div>
        <div class="alert alert-warning py-2 px-3 mb-0 small">
          Multiple account: Use at your own risk.
        </div>
      </div>
    </div>
    <div class="card shadow mb-4">
      <div class="card-header fw-semibold bg-gradient text-primary">Bonus & Claim</div>
      <div class="card-body">
        <div class="row g-2 align-items-center mb-3">
          <div class="col-7 col-md-7">
            <input type="text" class="form-control" id="fb-checkBonusCode" maxlength="50" placeholder="Check Bonus Code Availability">
          </div>
          <div class="col-3 col-md-3">
            <select id="fb-couponType" class="form-select">
              <option value="bonus">BONUS</option>
              <option value="coupon">COUPON</option>
            </select>
          </div>
          <div class="col-2 col-md-2">
            <button id="fb-btnCheckBonus" class="btn btn-success w-100">Check</button>
          </div>
        </div>
        <div class="row g-2 align-items-center mb-3">
          <div class="col-4 col-md-4">
            <input type="text" class="form-control" id="fb-bonusCodeInput" maxlength="50" placeholder="Enter Bonus Code">
          </div>
          <div class="col-4 col-md-4">
            <select id="fb-claimCurrency" class="form-select"></select>
          </div>
          <div class="col-2 col-md-2">
            <select id="fb-claimType" class="form-select">
              <option value="ClaimBonusCode">Normal</option>
              <option value="ClaimConditionBonusCode">Condition</option>
            </select>
          </div>
          <div class="col-2 col-md-2">
            <button id="fb-claimBonus" class="btn btn-primary w-100">Claim</button>
          </div>
        </div>
        <div class="mb-2">
          <label class="form-label mb-1">Captcha (Cloudflare Turnstile, wajib isi):</label>
          <div id="fb-turnstile-widget"></div>
          <input type="text" class="form-control mt-2" id="fb-turnstileToken" placeholder="Token diisi otomatis oleh captcha" readonly>
        </div>
        <div id="fb-status" class="alert py-2 px-3 mb-1 small" style="display:none;"></div>
        <div id="fb-log" class="border rounded small bg-dark-subtle p-2" style="min-height:60px;max-height:170px;overflow-y:auto;"></div>
      </div>
    </div>
  </div>
  ;
  document.body.appendChild(root);

  // Always on top + scrollable
  root.style.position = "fixed";
  root.style.top = "0";
  root.style.left = "0";
  root.style.width = "100vw";
  root.style.minHeight = "100vh";
  root.style.zIndex = "2147483647";
  root.style.background = "rgba(28,36,46,0.97)";
  root.style.pointerEvents = "auto";
  root.style.overflowY = "auto";
  root.style.height = "100vh";

  // --- STATE, LOGIC
  let accounts = [];
  let activeApiKey = null;
  function loadAccounts() {
    try { accounts = JSON.parse(localStorage.getItem(LS_ACCOUNTS) || "[]"); } catch { accounts = []; }
    renderAccounts();
  }
  function saveAccounts() { localStorage.setItem(LS_ACCOUNTS, JSON.stringify(accounts)); }
  function showStatus(msg, type = null) {
    const s = document.getElementById('fb-status');
    s.innerHTML = msg;
    s.className = "alert py-2 px-3 mb-1 small " + (type === "success" ? "alert-success" : type === "error" ? "alert-danger" : "alert-info");
    s.style.display = msg ? "" : "none";
  }
  function log(msg) {
    const logDiv = document.getElementById('fb-log');
    logDiv.innerHTML += <div>${new Date().toLocaleTimeString()}: ${msg}</div>;
    logDiv.scrollTop = logDiv.scrollHeight;
  }
  function renderAccounts() {
    const wrap = document.getElementById('fb-accounts');
    wrap.innerHTML = "";
    if (accounts.length === 0) {
      wrap.innerHTML = <div class="text-muted small py-2">No accounts connected yet.</div>;
    }
    accounts.forEach((acc, idx) => {
      const div = document.createElement('div');
      div.className = "alert alert-secondary d-flex justify-content-between align-items-center py-2 mb-2" + (activeApiKey && acc.apiKey === activeApiKey ? " border-success border-2" : "");
      div.innerHTML = <span class="fw-semibold text-info">${acc.name || "(Unnamed)"}</span>
      <button class="btn btn-sm btn-danger ms-2" data-idx="${idx}">🗑️</button>;
      wrap.appendChild(div);
    });
    wrap.querySelectorAll('button.btn-danger').forEach(btn => {
      btn.onclick = function() {
        const i = Number(btn.dataset.idx);
        accounts.splice(i, 1);
        saveAccounts();
        renderAccounts();
      };
    });
  }

  // --- Render currency dropdown
  function renderCurrencyDropdown() {
    const select = document.getElementById("fb-claimCurrency");
    select.innerHTML = "";
    for (const cur of SUPPORTED_CURRENCIES) {
      const opt = document.createElement("option");
      opt.value = cur;
      opt.innerText = cur.toUpperCase();
      select.appendChild(opt);
    }
  }
  renderCurrencyDropdown();

  // --- Turnstile widget logic
  let turnstileWidgetId = null;
  function renderTurnstile() {
    if (window.turnstile && document.getElementById('fb-turnstile-widget')) {
      // Clear widget container
      document.getElementById('fb-turnstile-widget').innerHTML = "";
      // Render widget
      turnstileWidgetId = window.turnstile.render('#fb-turnstile-widget', {
        sitekey: T_SITEKEY,
        callback: function(token) {
          document.getElementById('fb-turnstileToken').value = token;
        },
        "error-callback": function() {
          document.getElementById('fb-turnstileToken').value = "";
        }
      });
    }
  }
  // Try render if loaded after dom
  setTimeout(() => { if (window.turnstile) renderTurnstile(); }, 1500);
  // Render again if API loaded later
  window.onload = function() {
    setTimeout(() => { if (window.turnstile) renderTurnstile(); }, 1000);
  };
  // Utility: rerender widget if needed
  function resetTurnstile() {
    if (window.turnstile && turnstileWidgetId !== null) {
      window.turnstile.reset(turnstileWidgetId);
      document.getElementById('fb-turnstileToken').value = "";
    }
  }

  // --- Modal Login
  document.getElementById('fb-loginBtn').onclick = function() {
    const val = document.getElementById('fb-loginPassword').value.trim();
    if (!val) return document.getElementById('fb-loginErr').textContent = "Password required!";
    if (val !== AUTH_PASSWORD) return document.getElementById('fb-loginErr').textContent = "Wrong password!";
    document.getElementById('fb-claimer-modal').style.display = "none";
    document.getElementById('fb-claimer-panel-main').style.display = "";
    loadAccounts();
    setTimeout(renderTurnstile, 600); // widget
  };
  document.getElementById('fb-loginPassword').addEventListener('keydown', function(e) {
    if (e.key === "Enter") document.getElementById('fb-loginBtn').click();
  });

  // --- Connect API
  document.getElementById('fb-connectAPI').onclick = async function() {
    const input = document.getElementById('fb-apiKeyInput').value.trim();
    if (!input) return showStatus('API Key required', "error");
    if (input.length !== 96) return showStatus('API Key must be 96 chars', "error");
    activeApiKey = input;
    showStatus('Connecting to API...');
    let userId = "-", userName = "-", userStatus = "";
    try {
      const query = query UserMeta($name: String) {
        user(name: $name) {
          id name isMuted isRainproof isBanned createdAt campaignSet
          selfExclude { id status active createdAt expireAt }
        }
      };
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-access-token": activeApiKey },
        body: JSON.stringify({ query, variables: { name: null } })
      });
      const json = await res.json();
      if (json.data && json.data.user) {
        const u = json.data.user;
        userId = u.id || "-";
        userName = u.name || "-";
        userStatus = [
          u.isBanned ? "BANNED" : null,
          u.isMuted ? "MUTED" : null,
          u.isRainproof ? "RAINPROOF" : null,
          u.campaignSet ? "CAMPAIGN" : null,
          (u.selfExclude && u.selfExclude.active) ? "SELF-EXCLUDED" : null
        ].filter(Boolean).join(", ");
        if (userName && !accounts.some(a => a.name === userName)) {
          accounts.push({ name: userName, apiKey: activeApiKey });
          saveAccounts();
          renderAccounts();
        }
      } else throw new Error(json.errors?.[0]?.message || "UserMeta failed.");
    } catch (e) {
      showStatus('API connection failed: ' + e.message, "error");
      activeApiKey = null; document.getElementById('fb-apiKeyInput').value = '';
      return;
    }
    let usdt = "-";
    try {
      const query = query UserBalances { user { id balances { available { amount currency } vault { amount currency } } } };
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-access-token": activeApiKey },
        body: JSON.stringify({ query })
      });
      const json = await res.json();
      if (json.data && json.data.user && json.data.user.balances) {
        let bal = json.data.user.balances;
        if (bal.available && bal.available.currency?.toLowerCase() === "usdt") usdt = bal.available.amount;
        if (bal.vault && bal.vault.currency?.toLowerCase() === "usdt") usdt +=  (Vault: ${bal.vault.amount});
      }
    } catch (e) { log("UserBalances error: "+e.message); }
    document.getElementById('fb-userId').textContent = userId;
    document.getElementById('fb-userName').textContent = userName;
    document.getElementById('fb-userStatus').textContent = userStatus;
    document.getElementById('fb-userCredits').textContent = usdt;
    showStatus('API Connected!', "success");
    document.getElementById('fb-apiKeyInput').value = '';
    renderAccounts();
  };

  document.getElementById('fb-pasteClipboard').onclick = async function() {
    try {
      const text = await navigator.clipboard.readText();
      document.getElementById('fb-apiKeyInput').value = text || '';
    } catch { showStatus('Clipboard not accessible', "error"); }
  };

  document.getElementById('fb-btnCheckBonus').onclick = async function() {
    if (!activeApiKey) return showStatus('Connect API Key first', 'error');
    const code = document.getElementById('fb-checkBonusCode').value.trim();
    if (!code) return showStatus('Input code!', 'error');
    let couponType = document.getElementById('fb-couponType').value;
    couponType = couponType.toLowerCase();
    const query = query BonusCodeAvailability($code: String!, $couponType: CouponType!) {
      bonusCodeAvailability(code: $code, couponType: $couponType)
    };
    const variables = { code, couponType };
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-access-token": activeApiKey },
        body: JSON.stringify({ query, variables })
      });
      const json = await res.json();
      if (json.data && typeof json.data.bonusCodeAvailability !== "undefined") {
        showStatus("Availability: " + (json.data.bonusCodeAvailability ? "Available" : "Not Available"), json.data.bonusCodeAvailability ? "success" : "error");
        log("CheckCode: " + code + " = " + json.data.bonusCodeAvailability);
      } else if (json.errors && json.errors.length) {
        showStatus(json.errors[0].message, "error");
        log("CheckCode Error: " + json.errors[0].message);
      }
    } catch (e) { showStatus('Error checking code', "error"); }
  };

  document.getElementById('fb-claimBonus').onclick = async function() {
    if (!activeApiKey) return showStatus('Connect API Key first', "error");
    const code = document.getElementById('fb-bonusCodeInput').value.trim();
    if (!code) return showStatus('Input bonus code', "error");
    const type = document.getElementById('fb-claimType').value;
    const currency = document.getElementById('fb-claimCurrency').value;
    let turnstileToken = document.getElementById('fb-turnstileToken').value.trim();

    // Jika belum isi captcha, error!
    if (!turnstileToken) {
      showStatus('Silakan selesaikan captcha (klik centang pada widget) sebelum claim!', "error");
      return;
    }

    const mutation =
      type === "ClaimConditionBonusCode"
      ? mutation ClaimConditionBonusCode($code: String!, $currency: CurrencyEnum!, $turnstileToken: String!) {
          claimConditionBonusCode(
             code: $code
             currency: $currency
             turnstileToken: $turnstileToken
          ) {
             bonusCode { id code }
             amount
             currency
             user { id balances { available { amount currency } vault { amount currency } } }
             redeemed
          }
      }
      : mutation ClaimBonusCode($code: String!, $currency: CurrencyEnum!, $turnstileToken: String!) {
          claimBonusCode(
             code: $code
             currency: $currency
             turnstileToken: $turnstileToken
          ) {
             bonusCode { id code }
             amount
             currency
             user { id balances { available { amount currency } vault { amount currency } } }
             redeemed
          }
      };
    const variables = { code, currency, turnstileToken };
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-access-token": activeApiKey },
        body: JSON.stringify({ query: mutation, variables })
      });
      const json = await res.json();
      const dataKey = type === "ClaimConditionBonusCode" ? "claimConditionBonusCode" : "claimBonusCode";
      if (json.data && json.data[dataKey]) {
        showStatus(Claimed: ${json.data[dataKey].amount} ${json.data[dataKey].currency}, "success");
        log("CLAIM " + code + " = " + JSON.stringify(json.data[dataKey]));
        const user = json.data[dataKey].user;
        if (user && user.balances) {
          let bal = "-";
          if (user.balances.available && user.balances.available.currency?.toLowerCase() === currency) bal = user.balances.available.amount;
          if (user.balances.vault && user.balances.vault.currency?.toLowerCase() === currency) bal +=  (Vault: ${user.balances.vault.amount});
          document.getElementById('fb-userCredits').textContent = bal;
        }
        resetTurnstile();
      } else if (json.errors && json.errors.length) {
        showStatus(json.errors[0].message, "error");
        log("CLAIM ERR " + code + ": " + json.errors[0].message);
        resetTurnstile();
      } else {
        showStatus('Unknown error on bonus claim', "error");
        resetTurnstile();
      }
    } catch (e) {
      showStatus('Error on bonus claim', "error");
      resetTurnstile();
    }
  };
  document.getElementById('fb-bonusCodeInput').addEventListener('keydown', function(e) {
    if (e.key === "Enter") document.getElementById('fb-claimBonus').click();
  });

  // --- Rerender Turnstile widget on script load
  setTimeout(renderTurnstile, 2000);
})();
