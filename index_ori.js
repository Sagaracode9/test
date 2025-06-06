// ==UserScript==
// @name         saBot Claimer - Turnstile Edition
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Multi-account Stake Claimer with Cloudflare Turnstile
// @match        https://stake.com/*
// @grant        none
// ==/UserScript==

(function() {
  const API_URL = "https://stake.com/_api/graphql";
  const AUTH_PASSWORD = "sagara321";
  const LS_ACCOUNTS = "sb_accs";
  const T_SITEKEY = "0x4AAAAAAAGD4gMGOTFnvupz"; // <-- Ganti dengan sitekey kamu!

  // Inject Bootstrap (CSS only, for simple style)
  if (!document.getElementById("bs-claimer-bootstrap")) {
    const link = document.createElement("link");
    link.id = "bs-claimer-bootstrap";
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css";
    document.head.appendChild(link);
  }

  // Inject Turnstile
  if (!window.turnstile && !document.getElementById("cf-turnstile-script")) {
    const script = document.createElement("script");
    script.id = "cf-turnstile-script";
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    document.head.appendChild(script);
  }

  // --- UI
  const root = document.createElement("div");
  root.id = "fb-claimer-root";
  root.innerHTML = `
  <div class="modal fade show d-block" id="fb-claimer-modal" tabindex="-1" aria-modal="true" role="dialog"
    style="background:rgba(34,44,55,0.96);z-index:2147483647;">
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
  <div id="fb-claimer-panel-main" class="container-fluid p-0" style="display:none;max-width:760px;margin:60px auto 50px auto;z-index:2147483647;position:relative;height:90vh;">
    <nav class="navbar navbar-expand navbar-dark bg-primary rounded-bottom mb-4 px-4 py-2 shadow" style="z-index:999;">
      <span class="navbar-brand fw-bold">saBot Claimer</span>
      <span class="ms-auto text-light small">Site: stake.bet</span>
    </nav>
    <div style="height:calc(90vh - 80px);overflow-y:auto;padding-right:10px;">
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
        <div>Credits (USDT): <span id="fb-userCredits" class="fw-semibold text-warning">-</span></div>
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
          Multiple account: Use at your own risk.<br>
          <b>Captcha Turnstile</b> harus diisi tiap akun sebelum claim.
        </div>
      </div>
    </div>
    <div class="card shadow mb-4">
      <div class="card-header fw-semibold bg-gradient text-primary">Bonus & Claim</div>
      <div class="card-body">
        <div class="row g-2 align-items-center mb-3">
          <div class="col-7 col-md-8">
            <input type="text" class="form-control" id="fb-checkBonusCode" maxlength="50" placeholder="Check Bonus Code Availability">
          </div>
          <div class="col-3 col-md-2">
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
          <div class="col-7 col-md-8">
            <input type="text" class="form-control" id="fb-bonusCodeInput" maxlength="50" placeholder="Enter Bonus Code">
          </div>
          <div class="col-3 col-md-2">
            <select id="fb-claimType" class="form-select">
              <option value="ClaimBonusCode">Normal</option>
              <option value="ClaimConditionBonusCode">Condition</option>
            </select>
          </div>
          <div class="col-2 col-md-2">
            <button id="fb-claimBonus" class="btn btn-primary w-100">Claim</button>
          </div>
        </div>
        <div class="mb-2" id="fb-turnstile-widgets-info">
          <label class="form-label mb-1">Captcha Turnstile (isi satu per akun sebelum claim):</label>
          <div id="fb-turnstile-widgets"></div>
        </div>
        <div id="fb-status" class="alert py-2 px-3 mb-1 small" style="display:none;"></div>
        <div id="fb-log" class="border rounded small bg-dark-subtle p-2" style="min-height:60px;max-height:170px;overflow-y:auto;"></div>
      </div>
    </div>
    </div>
  </div>
  `;
  document.body.appendChild(root);

  // --- Scroll style (biar full page tetap bisa scroll)
  root.style.position = "fixed";
  root.style.top = "0";
  root.style.left = "0";
  root.style.width = "100vw";
  root.style.height = "100vh";
  root.style.overflow = "auto";
  root.style.zIndex = "2147483647";
  root.style.background = "rgba(28,36,46,0.97)";
  root.style.pointerEvents = "auto";

  // --- STATE
  let accounts = [];
  let activeApiKey = null;
  let turnstileReady = false;

  function loadAccounts() {
    try { accounts = JSON.parse(localStorage.getItem(LS_ACCOUNTS) || "[]"); } catch { accounts = []; }
    renderAccounts();
    renderTurnstile();
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
    logDiv.innerHTML += `<div>${new Date().toLocaleTimeString()}: ${msg}</div>`;
    logDiv.scrollTop = logDiv.scrollHeight;
  }
  function renderAccounts() {
    const wrap = document.getElementById('fb-accounts');
    wrap.innerHTML = "";
    if (accounts.length === 0) {
      wrap.innerHTML = `<div class="text-muted small py-2">No accounts connected yet.</div>`;
    }
    accounts.forEach((acc, idx) => {
      const div = document.createElement('div');
      div.className = "alert alert-secondary d-flex justify-content-between align-items-center py-2 mb-2";
      div.innerHTML = `<span class="fw-semibold text-info">${acc.name || "(Unnamed)"}</span>
      <button class="btn btn-sm btn-danger ms-2" data-idx="${idx}">🗑️</button>`;
      wrap.appendChild(div);
    });
    wrap.querySelectorAll('button.btn-danger').forEach(btn => {
      btn.onclick = function() {
        const i = Number(btn.dataset.idx);
        accounts.splice(i, 1);
        saveAccounts();
        renderAccounts();
        renderTurnstile();
      };
    });
  }

  // --- Turnstile per akun
  function renderTurnstile() {
    const wrap = document.getElementById("fb-turnstile-widgets");
    wrap.innerHTML = "";
    // Tunggu window.turnstile ready
    if (!window.turnstile) {
      setTimeout(renderTurnstile, 400); return;
    }
    // Buat satu widget untuk setiap akun
    accounts.forEach((acc, idx) => {
      const cont = document.createElement("div");
      cont.id = "turnstile-widget-" + idx;
      cont.style.display = "inline-block";
      cont.style.marginRight = "18px";
      wrap.appendChild(cont);

      // Reset property
      acc.turnstileToken = "";
      acc.turnstileWidgetId = window.turnstile.render(cont, {
        sitekey: T_SITEKEY,
        callback: function(token) {
          acc.turnstileToken = token;
        },
        "error-callback": function() {
          acc.turnstileToken = "";
          showStatus("Captcha error, please solve again for account " + (acc.name || idx), "error");
        }
      });
    });
  }

  // --- Login Modal
  document.getElementById('fb-loginBtn').onclick = function() {
    const val = document.getElementById('fb-loginPassword').value.trim();
    if (!val) return document.getElementById('fb-loginErr').textContent = "Password required!";
    if (val !== AUTH_PASSWORD) return document.getElementById('fb-loginErr').textContent = "Wrong password!";
    document.getElementById('fb-claimer-modal').style.display = "none";
    document.getElementById('fb-claimer-panel-main').style.display = "";
    loadAccounts();
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
      const query = `query UserMeta($name: String) {
        user(name: $name) {
          id name isMuted isRainproof isBanned createdAt campaignSet
          selfExclude { id status active createdAt expireAt }
        }
      }`;
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
          renderTurnstile();
        }
      } else throw new Error(json.errors?.[0]?.message || "UserMeta failed.");
    } catch (e) {
      showStatus('API connection failed: ' + e.message, "error");
      activeApiKey = null; document.getElementById('fb-apiKeyInput').value = '';
      return;
    }
    let usdt = "-";
    try {
      const query = `query UserBalances { user { id balances { available { amount currency } vault { amount currency } } } }`;
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-access-token": activeApiKey },
        body: JSON.stringify({ query })
      });
      const json = await res.json();
      if (json.data && json.data.user && json.data.user.balances) {
        let bal = json.data.user.balances;
        if (bal.available && bal.available.currency?.toLowerCase() === "usdt") usdt = bal.available.amount;
        if (bal.vault && bal.vault.currency?.toLowerCase() === "usdt") usdt += ` (Vault: ${bal.vault.amount})`;
      }
    } catch (e) { log("UserBalances error: "+e.message); }
    document.getElementById('fb-userId').textContent = userId;
    document.getElementById('fb-userName').textContent = userName;
    document.getElementById('fb-userStatus').textContent = userStatus;
    document.getElementById('fb-userCredits').textContent = usdt;
    showStatus('API Connected!', "success");
    document.getElementById('fb-apiKeyInput').value = '';
    renderAccounts();
    renderTurnstile();
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
    const query = `query BonusCodeAvailability($code: String!, $couponType: CouponType!) {
      bonusCodeAvailability(code: $code, couponType: $couponType)
    }`;
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
    if (accounts.length === 0) return showStatus('No account connected', "error");
    const code = document.getElementById('fb-bonusCodeInput').value.trim();
    if (!code) return showStatus('Input bonus code', "error");
    const type = document.getElementById('fb-claimType').value;

    let errorAccounts = [];
    let successAccounts = [];
    let claimCount = 0;
    // Satu per akun, pakai token turnstile-nya
    for (let i = 0; i < accounts.length; ++i) {
      const acc = accounts[i];
      if (!acc.turnstileToken) {
        errorAccounts.push(`${acc.name || '(Unnamed)'}` + " belum mengisi captcha!");
        continue;
      }
      const variables = { code, currency: "usdt", turnstileToken: acc.turnstileToken };
      const mutation =
        type === "ClaimConditionBonusCode"
        ? `mutation ClaimConditionBonusCode($code: String!, $currency: CurrencyEnum!, $turnstileToken: String!) {
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
        }`
        : `mutation ClaimBonusCode($code: String!, $currency: CurrencyEnum!, $turnstileToken: String!) {
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
        }`;
      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-access-token": acc.apiKey },
          body: JSON.stringify({ query: mutation, variables })
        });
        const json = await res.json();
        const dataKey = type === "ClaimConditionBonusCode" ? "claimConditionBonusCode" : "claimBonusCode";
        if (json.data && json.data[dataKey]) {
          successAccounts.push(`${acc.name || '(Unnamed)'}: Claimed ${json.data[dataKey].amount} ${json.data[dataKey].currency}`);
          // reset token so must solve again (1x pakai)
          acc.turnstileToken = "";
          window.turnstile && acc.turnstileWidgetId && window.turnstile.reset(acc.turnstileWidgetId);
          claimCount++;
        } else if (json.errors && json.errors.length) {
          errorAccounts.push(`${acc.name || '(Unnamed)'}: ${json.errors[0].message}`);
          // reset juga biar solve ulang jika error
          acc.turnstileToken = "";
          window.turnstile && acc.turnstileWidgetId && window.turnstile.reset(acc.turnstileWidgetId);
        } else {
          errorAccounts.push(`${acc.name || '(Unnamed)'}: Unknown error`);
        }
      } catch (e) {
        errorAccounts.push(`${acc.name || '(Unnamed)'}: Network error`);
      }
    }
    if (successAccounts.length) showStatus(successAccounts.join("<br>"), "success");
    if (errorAccounts.length) showStatus(errorAccounts.join("<br>"), "error");
    log("CLAIM " + code + " -- Success: " + successAccounts.length + ", Failed: " + errorAccounts.length);
  };
  document.getElementById('fb-bonusCodeInput').addEventListener('keydown', function(e) {
    if (e.key === "Enter") document.getElementById('fb-claimBonus').click();
  });
})();
