(function() {

  // --- CSS inject

  const style = document.createElement('style');

  style.textContent = `

    #fb-claimer-root * { box-sizing:border-box; }

    #fb-claimer-root { all:unset; position:fixed; top:0; left:0; width:100vw; min-height:100vh; z-index:99999; background:#151c23; color:#fff; font-family: 'Fira Mono', monospace; }

    #fb-claimer-modal { background:#223447e9; position:fixed; left:0;top:0;width:100vw;height:100vh; display:flex; align-items:center;justify-content:center; z-index:1000;}

    #fb-claimer-modal .popup-inner { background:#253a50; padding:36px 28px; border-radius:13px; min-width:260px; max-width:95vw; box-shadow:0 6px 36px #000b;}

    #fb-claimer-header { background: #212f3d; padding: 18px 32px; font-size: 1.7em; border-radius: 0 0 14px 14px; display:flex; justify-content:space-between; align-items:center; }

    #fb-claimer-title { font-weight: bold; }

    #fb-claimer-site { font-size: 0.85em; color: #fff9; }

    #fb-claimer-main { max-width: 660px; margin: 36px auto 60px auto; }

    .fb-claimer-panel { background: #223447; margin-top: 28px; border-radius: 12px; padding: 0 0 24px 0; box-shadow: 0 2px 16px #0009; }

    .fb-claimer-panel .panel-title { background: #2488ff; color: #fff; font-weight: bold; border-radius: 12px 12px 0 0; padding: 11px 24px; font-size: 1.09em; letter-spacing:1px;}

    .panel-content { padding: 20px 24px 0 24px; }

    .user-info { margin-bottom:10px; font-size:1.09em;}

    .user-info div { margin-bottom:7px; }

    .user-status-row { font-size:.97em; color:#ffd54f;}

    .fb-viphost, .fb-faucet { font-size:.95em; color:#ffe7a4; margin-top:7px;}

    .account-list { margin-bottom:12px; }

    .account-item { background: #2d4250; border-radius: 7px; padding: 9px 13px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; font-size:1em;}

    .account-item .label { font-weight: 600;}

    .account-item .btns button { border:none; background:transparent; font-size:1.15em; cursor:pointer; margin-left:7px;}

    .api-form { display: flex; gap: 8px; margin-top: 10px; }

    .api-form input { flex:1; padding: 8px; border-radius:7px; border: none; background: #232f3a; color: #fff;}

    .api-form button { border-radius: 7px; border: none; background: #2488ff; color: #fff; padding: 8px 14px; font-weight: bold; cursor:pointer;}

    .api-warning { color: #ffe892; font-size: 0.93em; margin-top: 7px;}

    .section-title { font-weight: bold; margin-top:24px; margin-bottom:12px; font-size:1.1em;}

    .claim-form input, .checkcode-form input { padding:8px; border-radius:7px; border:none; background:#232f3a; color:#fff; margin-right:8px;}

    .claim-form button, .checkcode-form button { border-radius: 7px; border: none; background: #2488ff; color: #fff; padding: 8px 18px; font-weight: bold; cursor:pointer;}

    .status { margin: 15px 0 0 0; font-size:1em; color:#fcf259; min-height:22px;}

    .error { color:#ff6767;}

    .success { color:#baff84;}

    .log-box { margin-top:13px; background:#162130; border-radius:7px; padding:8px 12px; font-size:.93em; min-height:36px;}

    @media (max-width:700px){

      #fb-claimer-main {max-width:99vw;}

      .fb-claimer-panel {padding-left:0;padding-right:0;}

    }

  `;

  document.head.appendChild(style);



  // --- UI HTML root

  const root = document.createElement('div');

  root.id = "fb-claimer-root";

  root.innerHTML = `

    <div id="fb-claimer-modal">

      <div class="popup-inner">

        <h3 style="margin:0 0 14px 0; color:#FCF259;">Enter Password</h3>

        <input type="password" id="fb-loginPassword" maxlength="100" style="width:100%; margin-bottom:15px;" placeholder="Enter Password">

        <button id="fb-loginBtn" style="width:100%;margin-bottom:10px;">Login</button>

        <div id="fb-loginErr" style="color:#ff6767; min-height:20px;"></div>

      </div>

    </div>

    <div id="fb-claimer-header">

      <span id="fb-claimer-title">saBot Claimer</span>

      <span id="fb-claimer-site">Site: stake.bet</span>

    </div>

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

        <div class="panel-title">CONNECTS ACCOUNTS</div>

        <div class="panel-content">

           <div id="fb-accounts" class="account-list"></div>

           <div class="api-form">

             <input type="password" id="fb-apiKeyInput" maxlength="100" placeholder="Enter API Key (96 characters)">

             <button id="fb-pasteClipboard" title="Paste from clipboard">📋</button>

             <button id="fb-connectAPI">Connect</button>

           </div>

           <div class="api-warning">

             Please be aware that maintaining multiple accounts may pose risks.

           </div>

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

                <input type="text" id="fb-turnstileToken" style="width:60%;padding:5px;border-radius:7px;background:#232f3a;color:#fff;" placeholder="DEMO-TOKEN or real">

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

  let accountList = [{ name: "Demo account" }, { name: "sabot" }];

  let apiKey = null;



  // --- RENDER ACCOUNTS

  function renderAccounts() {

    const wrap = document.getElementById('fb-accounts');

    wrap.innerHTML = "";

    accountList.forEach((acc, idx) => {

      const div = document.createElement('div');

      div.className = "account-item";

      div.innerHTML = `

        <span class="label">${acc.name}</span>

        <span class="btns">

           <button title="Settings" data-idx="${idx}" class="fb-set">⚙️</button>

           <button title="Delete" data-idx="${idx}" class="fb-del">🗑️</button>

        </span>

      `;

      wrap.appendChild(div);

    });

    wrap.querySelectorAll('.fb-del').forEach(btn => {

      btn.onclick = function() {

        accountList.splice(Number(btn.dataset.idx), 1);

        renderAccounts();

      };

    });

    wrap.querySelectorAll('.fb-set').forEach(btn => {

      btn.onclick = function() {

        alert('Setting for ' + accountList[Number(btn.dataset.idx)].name);

      };

    });

  }

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



  // --- LOGIN

  document.getElementById('fb-loginBtn').onclick = function() {

    const val = document.getElementById('fb-loginPassword').value.trim();

    if (!val) {

      document.getElementById('fb-loginErr').textContent = "Password required!";

      return;

    }

    if (val !== "sagara321") {

      document.getElementById('fb-loginErr').textContent = "Wrong password!";

      return;

    }

    document.getElementById('fb-claimer-modal').style.display = "none";

    document.getElementById('fb-claimer-main').style.display = "";

    renderAccounts();

  };

  document.getElementById('fb-loginPassword').addEventListener('keydown', function(e) {

    if (e.key === "Enter") document.getElementById('fb-loginBtn').click();

  });



  // --- CONNECT API

  document.getElementById('fb-connectAPI').onclick = async function() {

    const input = document.getElementById('fb-apiKeyInput').value.trim();

    if (!input) return showStatus('API Key required', "error");

    if (input.length !== 96) return showStatus('API Key must be 96 chars', "error");

    apiKey = input;

    showStatus('Connecting to API...');

    // 1. UserMeta

    let userId = "-", userName = "-", userStatus = "";

    try {

      const query = `

      query UserMeta($name: String, $signupCode: Boolean = false) {

        user(name: $name) {

           id

           name

           isMuted

           isRainproof

           isBanned

           createdAt

           campaignSet

           selfExclude { id status active createdAt expireAt }

           signupCode @include(if: $signupCode) { id code { id code } }

        }

      }`;

      const res = await fetch("https://stake.com/_api/graphql", {

        method: "POST",

        headers: { "Content-Type": "application/json", "x-access-token": apiKey },

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

      }

    } catch (e) {

      log("UserMeta error: " + e.message);

    }

    // 2. UserBalances

    let usdt = "-";

    try {

      const query = `

      query UserBalances {

        user {

           id

           balances {

             available { amount currency }

             vault { amount currency }

           }

        }

      }`;

      const res = await fetch("https://stake.com/_api/graphql", {

        method: "POST",

        headers: { "Content-Type": "application/json", "x-access-token": apiKey },

        body: JSON.stringify({ query })

      });

      const json = await res.json();

      if (json.data && json.data.user && json.data.user.balances) {

        for (const bal of json.data.user.balances) {

           if (bal.available && bal.available.currency === "usdt") {

             usdt = bal.available.amount;

             break;

           }

        }

      }

    } catch (e) {

      log("UserBalances error: " + e.message);

    }

    // 3. VIP / Faucet (TANPA variables)

    let viphost = "-", faucet = "-";

    try {

      const query = `

      query VipMeta {

        user {

           vipInfo {

             host { name contactHandle contactLink email availableDays }

           }

           reload: faucet { value active }

        }

      }`;

      const res = await fetch("https://stake.com/_api/graphql", {

        method: "POST",

        headers: { "Content-Type": "application/json", "x-access-token": apiKey },

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

    } catch (e) { log("VipMeta error: " + e.message); }

    // Update UI

    document.getElementById('fb-userId').textContent = userId;

    document.getElementById('fb-userName').textContent = userName;

    document.getElementById('fb-userStatus').textContent = userStatus;

    document.getElementById('fb-userCredits').textContent = usdt;

    document.getElementById('fb-viphost').textContent = "VIP Host: " + viphost;

    document.getElementById('fb-faucet').textContent = "Faucet: " + faucet;

    showStatus('API Connected!', "success");

    log("Connected as " + userName);

    document.getElementById('fb-apiKeyInput').value = '';

  };



  // Paste clipboard

  document.getElementById('fb-pasteClipboard').onclick = async function() {

    try {

      const text = await navigator.clipboard.readText();

      document.getElementById('fb-apiKeyInput').value = text || '';

    } catch {

      showStatus('Clipboard not accessible', "error");

    }

  };



  // --- CHECK BONUS CODE AVAILABILITY

  document.getElementById('fb-btnCheckBonus').onclick = async function() {

    if (!apiKey) return showStatus('Connect API Key first', 'error');

    const code = document.getElementById('fb-checkBonusCode').value.trim();

    if (!code) return showStatus('Input code!', 'error');

    let couponType = document.getElementById('fb-couponType').value;

    couponType = couponType.toLowerCase(); // FIX: CouponType must be lowercase

    const query = `query BonusCodeAvailability($code: String!, $couponType: CouponType!) {

      bonusCodeAvailability(code: $code, couponType: $couponType)

    }`;

    const variables = { code, couponType };

    try {

      const res = await fetch("https://stake.com/_api/graphql", {

        method: "POST",

        headers: { "Content-Type": "application/json", "x-access-token": apiKey },

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

    } catch (e) {

      showStatus('Error checking code', "error");

    }

  };



  // --- CLAIM BONUS (pilih normal / condition)

  document.getElementById('fb-claimBonus').onclick = async function() {

    if (!apiKey) return showStatus('Connect API Key first', "error");

    const code = document.getElementById('fb-bonusCodeInput').value.trim();

    if (!code) return showStatus('Input bonus code', "error");

    const type = document.getElementById('fb-claimType').value;

    const turnstileToken = document.getElementById('fb-turnstileToken').value.trim() || "DEMO-TOKEN";

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

           user {

             id

             balances { available { amount currency } }

           }

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

           user {

             id

             balances { available { amount currency } }

           }

           redeemed

        }

      }`;

    const variables = { code, currency: "usdt", turnstileToken }; // FIX: usdt lowercase

    try {

      const res = await fetch("https://stake.com/_api/graphql", {

        method: "POST",

        headers: { "Content-Type": "application/json", "x-access-token": apiKey },

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

          for (const b of user.balances) {

            if (b.available && b.available.currency === "usdt") {

              usdt = b.available.amount;

              break;

            }

          }

          document.getElementById('fb-userCredits').textContent = usdt;

        }

      } else if (json.errors && json.errors.length) {

        showStatus(json.errors[0].message, "error");

        log("CLAIM ERR " + code + ": " + json.errors[0].message);

      } else {

        showStatus('Unknown error on bonus claim', "error");

      }

    } catch (e) {

      showStatus('Error on bonus claim', "error");

    }

  };

  document.getElementById('fb-bonusCodeInput').addEventListener('keydown', function(e) {

    if (e.key === "Enter") document.getElementById('fb-claimBonus').click();

  });

})();
