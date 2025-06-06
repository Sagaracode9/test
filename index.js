// ==UserScript==
// @name         saBot Claimer MultiAccount [FIX ENUM + MULTI + TURNSTILE]
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Fix enum GraphQL, multi akun, random turnstile, auto nama Stake, UI siap tempel!
// @author       Gemini AI
// @match        https://stake.com/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
  const API_URL = "https://stake.com/_api/graphql";
  const AUTH_PASSWORD = "sagara321";
  const LS_ACCOUNTS = "sb_accs";

  // --- CSS
  if (typeof GM_addStyle !== 'undefined') GM_addStyle(`#fb-claimer-root *{box-sizing:border-box;font-family:monospace;}#fb-claimer-root{all:unset;position:fixed;top:0;left:0;width:100vw;min-height:100vh;z-index:99999;background:#151c23;color:#e0e0e0;}.fb-claimer-panel{background:#223447;margin-top:28px;border-radius:12px;padding:0 0 24px 0;box-shadow:0 2px 16px #0009;}#fb-claimer-modal{background:#223447e9;position:fixed;left:0;top:0;width:100vw;height:100vh;display:flex;align-items:center;justify-content:center;z-index:1000;}#fb-claimer-modal .popup-inner{background:#253a50;padding:36px 28px;border-radius:13px;min-width:260px;max-width:95vw;box-shadow:0 6px 36px #000b;}#fb-claimer-header{background:#212f3d;padding:18px 32px;font-size:1.7em;border-radius:0 0 14px 14px;display:flex;justify-content:space-between;align-items:center;}#fb-claimer-main{max-width:700px;margin:36px auto 60px auto;}.fb-claimer-panel .panel-title{background:#2488ff;color:#fff;font-weight:bold;border-radius:12px 12px 0 0;padding:13px 24px;font-size:1.12em;letter-spacing:1px;}.panel-content{padding:20px 24px 0 24px;}.account-list{margin-bottom:12px;}.account-item{background:#2d4250;border-radius:7px;padding:9px 13px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;font-size:1em;}.account-item .label{font-weight:600;color:#baff84;}.account-item .btns button{border:none;background:transparent;font-size:1.15em;cursor:pointer;margin-left:7px;}input,select{background:#1a2c38;border:1px solid #304158;border-radius:7px;color:#fcf259;font-family:inherit;font-size:15px;padding:7px;margin-top:7px;width:90%;}button{background:#1475e1;color:#fff;border:none;border-radius:9px;padding:9px 21px;font-weight:bold;cursor:pointer;margin-top:14px;margin-right:10px;transition:background .2s;}button:hover{background:#0d437c;}.status{margin-top:16px;font-size:15px;color:#fcf259;}.error{color:#ff6767;}.success{color:#baff84;}.log-box{margin-top:13px;background:#162130;border-radius:7px;padding:8px 12px;font-size:.93em;min-height:36px;max-height:180px;overflow:auto;}@media(max-width:700px){#fb-claimer-main{max-width:99vw;}}`);

  // --- HTML
  const root = document.createElement('div');
  root.id = "fb-claimer-root";
  root.innerHTML = `
    <div id="fb-claimer-modal"><div class="popup-inner">
      <h3 style="margin:0 0 14px 0; color:#FCF259;">Enter Password</h3>
      <input type="password" id="fb-loginPassword" maxlength="100" style="width:100%; margin-bottom:15px;" placeholder="Enter Password">
      <button id="fb-loginBtn" style="width:100%;margin-bottom:10px;">Login</button>
      <div id="fb-loginErr" style="color:#ff6767; min-height:20px;"></div>
    </div></div>
    <div id="fb-claimer-header"><span id="fb-claimer-title">saBot Claimer</span><span id="fb-claimer-site">Site: stake.bet</span></div>
    <div id="fb-claimer-main" style="display:none;">
      <div class="fb-claimer-panel">
        <div class="panel-title">USER & BALANCE INFO</div>
        <div class="panel-content user-info">
           <div>User Id: <span id="fb-userId">-</span></div>
           <div>User Name: <span id="fb-userName">-</span></div>
           <div class="user-status-row" id="fb-userStatus"></div>
           <div>Credits (USDT): <span id="fb-userCredits">-</span></div>
           <div class="fb-viphost" id="fb-viphost"></div>
           <div class="fb-faucet" id="fb-faucet"></div>
        </div>
      </div>
      <div class="fb-claimer-panel">
        <div class="panel-title">CONNECTED ACCOUNTS</div>
        <div class="panel-content">
           <div id="fb-accounts" class="account-list"></div>
           <div class="api-form">
             <input type="password" id="fb-apiKeyInput" maxlength="96" placeholder="Enter API Key (96 characters)">
             <button id="fb-pasteClipboard" title="Paste from clipboard">📋</button>
             <button id="fb-connectAPI">Connect</button>
           </div>
           <div class="api-warning">Multiple account: Use at your own risk.</div>
        </div>
      </div>
      <div class="fb-claimer-panel">
        <div class="panel-title">BONUS & CLAIM</div>
        <div class="panel-content">
           <div class="checkcode-form" style="margin-bottom:12px;">
             <input type="text" id="fb-checkBonusCode" maxlength="50" placeholder="Check Bonus Code Availability">
             <select id="fb-couponType" style="padding:8px;border-radius:7px;background:#232f3a;color:#fff;">
                <option value="bonus">BONUS</option>
                <option value="coupon">COUPON</option>
             </select>
             <button id="fb-btnCheckBonus">Check</button>
           </div>
           <div class="claim-form" style="margin-top:8px;">
             <input type="text" id="fb-bonusCodeInput" maxlength="50" placeholder="Enter Bonus Code">
             <select id="fb-claimType" style="padding:8px;border-radius:7px;background:#232f3a;color:#fff;">
                <option value="ClaimBonusCode">Normal</option>
                <option value="ClaimConditionBonusCode">Condition</option>
             </select>
             <button id="fb-claimBonus">Claim Bonus</button>
           </div>
           <div style="margin-top:8px;">
             <label>Turnstile Token:
                <input type="text" id="fb-turnstileToken" style="width:60%;padding:5px;border-radius:7px;background:#232f3a;color:#fff;" placeholder="Auto-random if empty">
             </label>
           </div>
           <div class="status" id="fb-status"></div>
           <div class="log-box" id="fb-log"></div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  // --- STATE
  let accounts = [];
  let activeApiKey = null;

  // --- Storage
  function loadAccounts() {
      try { accounts = JSON.parse(GM_getValue(LS_ACCOUNTS, "[]")); } catch { accounts = []; }
      renderAccounts();
  }
  function saveAccounts() { GM_setValue(LS_ACCOUNTS, JSON.stringify(accounts)); }

  // --- UI helpers
  function showStatus(msg, type = null) {
      const s = document.getElementById('fb-status');
      s.textContent = msg;
      s.className = "status" + (type ? (" " + type) : "");
  }
  function log(msg) {
      const logDiv = document.getElementById('fb-log');
      logDiv.innerHTML += `<div>${new Date().toLocaleTimeString()}: ${msg}</div>`;
      logDiv.scrollTop = logDiv.scrollHeight;
  }

  // --- Render Account List
  function renderAccounts() {
      const wrap = document.getElementById('fb-accounts');
      wrap.innerHTML = "";
      if (accounts.length === 0)
          wrap.innerHTML = "<div style='color:#a0a0a0; font-size:0.9em; text-align:center; padding:10px 0;'>No accounts connected yet.</div>";
      accounts.forEach((acc, idx) => {
          const div = document.createElement('div');
          div.className = "account-item";
          div.innerHTML = `
              <span class="label">${acc.name || "(Unnamed)"}</span>
              <span class="btns">
                <button title="Delete" data-idx="${idx}" class="fb-del">🗑️</button>
              </span>
          `;
          wrap.appendChild(div);
      });
      wrap.querySelectorAll('.fb-del').forEach(btn => {
          btn.onclick = function() {
              const i = Number(btn.dataset.idx);
              accounts.splice(i, 1);
              saveAccounts();
              renderAccounts();
          };
      });
  }

  // --- Random Turnstile Token Generator
  function randTurnstileToken() {
      const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
      let token = "0.";
      for(let i=0; i<190; i++) token += charset[Math.floor(Math.random()*charset.length)];
      return token;
  }

  // --- Login
  document.getElementById('fb-loginBtn').onclick = function() {
      const val = document.getElementById('fb-loginPassword').value.trim();
      if (!val) return document.getElementById('fb-loginErr').textContent = "Password required!";
      if (val !== AUTH_PASSWORD) return document.getElementById('fb-loginErr').textContent = "Wrong password!";
      document.getElementById('fb-claimer-modal').style.display = "none";
      document.getElementById('fb-claimer-main').style.display = "";
      loadAccounts();
  };
  document.getElementById('fb-loginPassword').addEventListener('keydown', function(e) {
      if (e.key === "Enter") document.getElementById('fb-loginBtn').click();
  });

  // --- Connect API & Load Data (VIP meta TANPA variables!)
  document.getElementById('fb-connectAPI').onclick = async function() {
      const input = document.getElementById('fb-apiKeyInput').value.trim();
      if (!input) return showStatus('API Key required', "error");
      if (input.length !== 96) return showStatus('API Key must be 96 chars', "error");
      activeApiKey = input;
      showStatus('Connecting to API...');
      let userId = "-", userName = "-", userStatus = "";
      try {
          // 1. UserMeta (untuk nama akun, dsb)
          const query = `query UserMeta($name: String, $signupCode: Boolean = false) {
              user(name: $name) {
                id name isMuted isRainproof isBanned createdAt campaignSet
                selfExclude { id status active createdAt expireAt }
                signupCode @include(if: $signupCode) { id code { id code } }
              }
          }`;
          const res = await fetch(API_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-access-token": activeApiKey },
              body: JSON.stringify({ query, variables: { name: null, signupCode: false } })
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
              // Tambah account (unique by name)
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
      // 2. UserBalances
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
      // 3. VIP / Faucet (NO variables!)
      let viphost = "-", faucet = "-";
      try {
          const query = `query VipMeta {
            user {
              vipInfo { host { name contactHandle contactLink email availableDays } }
              reload: faucet { value active }
            }
          }`;
          const res = await fetch(API_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-access-token": activeApiKey },
              body: JSON.stringify({ query })
          });
          const json = await res.json();
          if (json.data && json.data.user) {
              if (json.data.user.vipInfo && json.data.user.vipInfo.host) {
                  const h = json.data.user.vipInfo.host;
                  viphost = (h.name ? h.name : "-") +
                      (h.contactHandle ? " (" + h.contactHandle + ")" : "") +
                      (h.contactLink ? " [" + h.contactLink + "]" : "");
              }
              if (json.data.user.reload) {
                  const f = json.data.user.reload;
                  faucet = (f.active ? "Active" : "Inactive") + ", Value: " + f.value;
              }
          }
      } catch (e) {}
      // Update UI
      document.getElementById('fb-userId').textContent = userId;
      document.getElementById('fb-userName').textContent = userName;
      document.getElementById('fb-userStatus').textContent = userStatus;
      document.getElementById('fb-userCredits').textContent = usdt;
      document.getElementById('fb-viphost').textContent = "VIP Host: " + viphost;
      document.getElementById('fb-faucet').textContent = "Faucet: " + faucet;
      showStatus('API Connected!', "success");
      document.getElementById('fb-apiKeyInput').value = '';
  };

  // Paste clipboard
  document.getElementById('fb-pasteClipboard').onclick = async function() {
      try {
          const text = await navigator.clipboard.readText();
          document.getElementById('fb-apiKeyInput').value = text || '';
      } catch { showStatus('Clipboard not accessible', "error"); }
  };

  // --- CHECK BONUS CODE AVAILABILITY (enum selalu lowercase)
  document.getElementById('fb-btnCheckBonus').onclick = async function() {
      if (!activeApiKey) return showStatus('Connect API Key first', 'error');
      const code = document.getElementById('fb-checkBonusCode').value.trim();
      if (!code) return showStatus('Input code!', 'error');
      let couponType = document.getElementById('fb-couponType').value;
      couponType = couponType.toLowerCase(); // PATCH: enum harus lowercase
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

  // --- CLAIM BONUS (turnstile random jika kosong)
  document.getElementById('fb-claimBonus').onclick = async function() {
      if (!activeApiKey) return showStatus('Connect API Key first', "error");
      const code = document.getElementById('fb-bonusCodeInput').value.trim();
      if (!code) return showStatus('Input bonus code', "error");
      const type = document.getElementById('fb-claimType').value;
      let turnstileToken = document.getElementById('fb-turnstileToken').value.trim();
      if (!turnstileToken) {
          turnstileToken = randTurnstileToken();
          document.getElementById('fb-turnstileToken').value = turnstileToken;
      }
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
      const variables = { code, currency: "usdt", turnstileToken };
      try {
          const res = await fetch(API_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-access-token": activeApiKey },
              body: JSON.stringify({ query: mutation, variables })
          });
          const json = await res.json();
          const dataKey = type === "ClaimConditionBonusCode" ? "claimConditionBonusCode" : "claimBonusCode";
          if (json.data && json.data[dataKey]) {
              showStatus(`Claimed: ${json.data[dataKey].amount} ${json.data[dataKey].currency}`, "success");
              log("CLAIM " + code + " = " + JSON.stringify(json.data[dataKey]));
              // Update USDT balance
              const user = json.data[dataKey].user;
              if (user && user.balances) {
                  let usdt = "-";
                  if (user.balances.available && user.balances.available.currency?.toLowerCase() === "usdt") usdt = user.balances.available.amount;
                  if (user.balances.vault && user.balances.vault.currency?.toLowerCase() === "usdt") usdt += ` (Vault: ${user.balances.vault.amount})`;
                  document.getElementById('fb-userCredits').textContent = usdt;
              }
          } else if (json.errors && json.errors.length) {
              showStatus(json.errors[0].message, "error");
              log("CLAIM ERR " + code + ": " + json.errors[0].message);
          } else {
              showStatus('Unknown error on bonus claim', "error");
          }
      } catch (e) { showStatus('Error on bonus claim', "error"); }
  };
  document.getElementById('fb-bonusCodeInput').addEventListener('keydown', function(e) {
      if (e.key === "Enter") document.getElementById('fb-claimBonus').click();
  });

})();
