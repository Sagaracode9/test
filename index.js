// ==UserScript==
// @name         saBot Claimer Modern UI
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Multi akun, turnstile random, modern UI, siap tempel. Berdasarkan script asli + request UI improvement by user
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

  // --- MODERN CSS ---
  if (typeof GM_addStyle !== 'undefined') GM_addStyle(`
#fb-claimer-root * {
  box-sizing: border-box;
  font-family: 'Fira Mono', monospace;
  letter-spacing: 0.01em;
}
#fb-claimer-root {
  all: unset;
  position: fixed;
  top: 0; left: 0; width: 100vw; min-height: 100vh;
  z-index: 99999;
  background: linear-gradient(135deg, #19223c 0%, #192b35 100%);
  color: #ececec;
}
.fb-claimer-panel {
  background: #212f3d;
  margin-top: 34px;
  border-radius: 20px;
  padding: 0 0 24px 0;
  box-shadow: 0 6px 30px #000a, 0 0px 1px #17313b;
  transition: box-shadow .15s;
}
#fb-claimer-modal {
  background:rgba(28,38,54,0.98);
  position:fixed;left:0;top:0;width:100vw;height:100vh;
  display:flex;align-items:center;justify-content:center;z-index:1000;
}
#fb-claimer-modal .popup-inner {
  background: #273851;
  padding: 42px 30px;
  border-radius: 19px;
  min-width: 260px;max-width:94vw;
  box-shadow:0 12px 64px #000e;
  border: 1.5px solid #3a5067;
  text-align:center;
}
#fb-loginPassword, #fb-apiKeyInput, #fb-checkBonusCode, #fb-bonusCodeInput, #fb-turnstileToken {
  width: 100%;
  padding: 15px 19px;
  margin-bottom: 17px;
  border-radius: 11px;
  border: 1.5px solid #3a5067;
  background: #1b2534;
  color: #fff9;
  font-size: 1em;
  transition: border .15s;
  outline: none;
}
#fb-loginPassword:focus, #fb-apiKeyInput:focus, #fb-checkBonusCode:focus, #fb-bonusCodeInput:focus, #fb-turnstileToken:focus {
  border-color: #4cdd7f;
  background: #232c3d;
  color: #baff84;
}
#fb-loginBtn, #fb-connectAPI, #fb-btnCheckBonus, #fb-claimBonus, .account-item .fb-del {
  border-radius: 10px;
  border: none;
  background: linear-gradient(91deg,#1c61d5,#3bc1f5 90%);
  color: #fff;
  padding: 13px 22px;
  font-weight: 700;
  font-size:1.08em;
  cursor:pointer;
  margin-bottom: 7px;
  box-shadow:0 1px 7px #0003;
  transition:background .18s,box-shadow .18s,transform .12s;
}
#fb-loginBtn:hover, #fb-connectAPI:hover, #fb-btnCheckBonus:hover, #fb-claimBonus:hover, .account-item .fb-del:hover {
  background: linear-gradient(91deg,#45a6e4,#33eea2 95%);
  color:#223447;
  box-shadow:0 3px 20px #06fae744,0 1px 7px #0003;
  transform:translateY(-1px) scale(1.03);
}
#fb-claimer-header {
  background: #232f41;
  padding: 23px 44px;
  font-size: 2.1em;
  border-radius: 0 0 24px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 14px #0005;
  position: sticky;top:0;z-index:9;
}
#fb-claimer-title { font-weight: bold; color: #8cffd1; font-size:1.1em; }
#fb-claimer-site { font-size: 0.7em; color: #fff9; letter-spacing: 0.03em;}
#fb-claimer-main { max-width: 740px; margin: 38px auto 68px auto; }
.fb-claimer-panel .panel-title {
  background:linear-gradient(93deg,#2377e7,#7dfcbe 95%);
  color: #162130;
  font-weight: bold;
  border-radius: 20px 20px 0 0;
  padding: 16px 34px;
  font-size: 1.14em;
  letter-spacing: 1px;
  box-shadow: 0 2px 10px #0003;
  font-family: inherit;
}
.panel-content { padding: 24px 29px 0 29px; }
.user-info { margin-bottom:13px; font-size:1.14em; }
.user-info div { margin-bottom:10px; }
.user-status-row { font-size:.99em; color:#ffd54f; margin-top:7px; font-weight:600;}
.fb-viphost, .fb-faucet { font-size:.93em; color:#ffe7a4; margin-top:8px; }
.account-list { margin-bottom:16px; }
.account-item {
  background: #223447;
  border-radius: 13px;
  padding: 13px 16px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size:1em;
  border:2px solid transparent;
  box-shadow:0 1px 9px #0002;
  transition:background .15s,border .13s;
}
.account-item.active, .account-item.active:hover {
  background: #173853;
  border-color: #43ffbe;
  color:#d6fffd;
}
.account-item .label { font-weight: 700; color: #84ffe5; letter-spacing:.01em; }
.account-item .btns button {
  border:none;background:transparent;font-size:1.25em;cursor:pointer;margin-left:7px;color:#8cf;opacity:.75;
  transition:color .12s,opacity .15s;
}
.account-item .btns button:hover {color:#fb7979;opacity:1;}
.api-form { display: flex; gap: 9px; margin-top: 15px; align-items: stretch;}
.api-form input { flex:1; }
.api-warning {
  color: #ffe892;
  font-size: 0.97em;
  margin-top: 9px;
  padding: 9px 13px;
  background: rgba(255, 232, 146, 0.09);
  border-left: 3px solid #ffe892;
  border-radius: 5px;
}
.section-title {
  font-weight: bold;
  margin-top: 28px;
  margin-bottom: 15px;
  font-size: 1.12em;
  color: #9effc3;
}
.checkcode-form, .claim-form {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 15px;
  flex-wrap: wrap;
}
.checkcode-form input, .claim-form input, .claim-form select, .checkcode-form select {
  min-width: 120px;
  margin-bottom: 0;
}
.claim-form label { white-space:nowrap; color: #ececec;}
#fb-turnstileToken { width:70%;margin-left:9px;margin-bottom:0;}
.status {
  margin: 17px 0 0 0;
  font-size:1.1em;
  color:#fcf259;
  min-height:28px;
  font-weight:600;
  text-align:center;
  padding: 4px 0;
  letter-spacing:0.03em;
  border-radius:8px;
  background:rgba(255,255,180,0.05);
}
.error { color:#ff6767;background:rgba(255,50,50,0.07);}
.success { color:#43ffbe;background:rgba(55,255,200,0.09);}
.log-box {
  margin-top: 17px;
  background: #172537;
  border-radius: 10px;
  padding: 14px;
  font-size: 0.97em;
  min-height: 60px;
  max-height: 190px;
  overflow-y: auto;
  border: 1.5px solid #284e7d;
  color: #b2e7e9;
  line-height: 1.65;
  letter-spacing:0.01em;
}
.log-box div {margin-bottom:4px;}
.log-box div:last-child {margin-bottom:0;}
@media (max-width:700px){
  #fb-claimer-main{max-width:99vw;}
  .fb-claimer-panel{padding-left:0;padding-right:0;}
  #fb-claimer-header{padding: 13px 12px;font-size:1.11em;}
  .panel-content{padding: 11px 7vw 0 7vw;}
  .user-info{font-size:.98em;}
  .fb-claimer-panel .panel-title{font-size:.97em;padding:8px 10vw;}
}
  `);

  // --- HTML
  const root = document.createElement('div');
  root.id = "fb-claimer-root";
  root.innerHTML = `
    <div id="fb-claimer-modal"><div class="popup-inner">
      <h3 style="margin:0 0 14px 0; color:#FCF259;">Enter Password</h3>
      <input type="password" id="fb-loginPassword" maxlength="100" placeholder="Enter Password">
      <button id="fb-loginBtn">Login</button>
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

  // --- STATE & LOGIC (tidak diubah dari versi fix-mu, tapi dengan highlight akun terakhir)
  let accounts = [];
  let activeApiKey = null;

  function loadAccounts() {
      try { accounts = JSON.parse(GM_getValue(LS_ACCOUNTS, "[]")); } catch { accounts = []; }
      renderAccounts();
  }
  function saveAccounts() { GM_setValue(LS_ACCOUNTS, JSON.stringify(accounts)); }
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
  function renderAccounts() {
      const wrap = document.getElementById('fb-accounts');
      wrap.innerHTML = "";
      if (accounts.length === 0)
          wrap.innerHTML = "<div style='color:#a0a0a0; font-size:0.9em; text-align:center; padding:10px 0;'>No accounts connected yet.</div>";
      accounts.forEach((acc, idx) => {
          const div = document.createElement('div');
          div.className = "account-item" + (activeApiKey && acc.apiKey === activeApiKey ? " active" : "");
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
  function randTurnstileToken() {
      const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
      let token = "0.";
      for(let i=0; i<190; i++) token += charset[Math.floor(Math.random()*charset.length)];
      return token;
  }

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

  document.getElementById('fb-connectAPI').onclick = async function() {
      const input = document.getElementById('fb-apiKeyInput').value.trim();
      if (!input) return showStatus('API Key required', "error");
      if (input.length !== 96) return showStatus('API Key must be 96 chars', "error");
      activeApiKey = input;
      showStatus('Connecting to API...');
      let userId = "-", userName = "-", userStatus = "";
      try {
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
      document.getElementById('fb-userId').textContent = userId;
      document.getElementById('fb-userName').textContent = userName;
      document.getElementById('fb-userStatus').textContent = userStatus;
      document.getElementById('fb-userCredits').textContent = usdt;
      document.getElementById('fb-viphost').textContent = "VIP Host: " + viphost;
      document.getElementById('fb-faucet').textContent = "Faucet: " + faucet;
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
