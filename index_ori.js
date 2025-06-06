(function(){
  // ===== CSS dan HTML string =====
  var style = `
    <style>
      body { background: #151d27; color: #eee; font-family: monospace; margin: 0; }
      .hidden { display: none; }
      .center { display: flex; flex-direction: column; align-items: center; margin-top: 2em; }
      .popup { background: #222c38; padding: 2em; border-radius: 8px; box-shadow: 0 0 24px #0008; }
      .log-table { width: 100%; margin-top: 2em; border-collapse: collapse; }
      .log-table th, .log-table td { border: 1px solid #444; padding: 6px; text-align: left; }
      .accounts-list { margin-top: 1em; }
      .error { color: #f44; }
      .success { color: #4f4; }
      input, select { padding: 4px 8px; border-radius: 5px; border: 1px solid #888; margin-bottom: 8px; }
      button { padding: 4px 12px; border-radius: 5px; border: none; background: #1475e1; color: #fff; cursor: pointer; }
      button:disabled { opacity: 0.5; }
      .mt-2 { margin-top: 1em; }
      .mb-2 { margin-bottom: 1em; }
      .flex-row { display: flex; align-items: center; gap: 8px; }
      .account-entry { background: #1a2c38; margin-bottom: 6px; border-radius: 5px; padding: 6px 12px; display: flex; align-items: center; gap: 1em; }
      .del-btn { background: #f44; color: #fff; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; }
    </style>
  `;
  var html = `
    <div class="center">
      <h2>FvckinBot™ Claimer</h2>
      <div id="statusLine" class="mb-2">Status: <span id="statusText">Not connected</span></div>
      <div id="userInfo" class="mb-2">
        User ID: <span id="userId">-</span> | Credits: <span id="userCredits">-</span>
      </div>
      <div id="licensePopup" class="popup hidden">
        <div style="font-weight:bold;">Enter License Key</div>
        <input type="text" id="licenseInput" style="width:320px" autocomplete="off">
        <div id="licenseError" class="error mb-2"></div>
        <button id="licenseBtn">Login</button>
      </div>
      <div id="mainContent" class="">
        <h4>Add Account (API Key)</h4>
        <input type="text" id="apiKeyInput" placeholder="Paste 96-char API Key" style="width:320px">
        <button id="connectAccBtn">Connect</button>
        <span id="accountErrorMsg" class="error"></span>
        <div class="accounts-list" id="accountsList"></div>
        <h4 class="mt-2">Manual Claim</h4>
        <div class="flex-row">
          <input type="text" id="redeemCodeInput" placeholder="Enter claim code" style="width:200px">
          <button id="dropClaimBtn">Drop</button>
          <button id="bonusClaimBtn">Bonus</button>
        </div>
        <span id="redeemErrorMsg" class="error"></span>
        <span id="redeemSuccessMsg" class="success"></span>
        <h4 class="mt-2">History</h4>
        <table class="log-table">
          <thead>
            <tr><th>Date</th><th>Action</th><th>Details</th></tr>
          </thead>
          <tbody id="historyList"></tbody>
        </table>
        <div id="logs" style="margin-top:2em;">
          <h4>Log</h4>
          <div id="logEntries"></div>
        </div>
      </div>
    </div>
  `;

  document.open();
  document.write(style + html);
  document.close();

  // ====== Logic JS after UI displayed ======
  // --- State
  let licenseKey = localStorage.getItem('licenseKey');
  let ws = null;
  let licenseAuthed = false;
  let userData = { id: '-', credits: 0 };
  let userAccounts = [];

  const websocketEndpoint = 'wss://b113f308-530d-4b65-964f-24d57e2cbe10-00-2j0vqotdaqayc.sisko.replit.dev:3000';
  const mainApiPath = '/_api/graphql';
  const currencies = ['btc', 'eth', 'bnb', 'usdt', 'dai', 'busd', 'cro', 'ltc', 'bch', 'doge', 'uni', 'sand', 'ape', 'shib', 'usdc', 'trx', 'eos', 'xrp', 'pol', 'link'];
  const claimTypes = { drop: [200, 100], bonus: [100, 50], reload: 20 };

  // --- Helper selectors
  const licensePopup = document.getElementById('licensePopup');
  const licenseInput = document.getElementById('licenseInput');
  const licenseBtn = document.getElementById('licenseBtn');
  const licenseError = document.getElementById('licenseError');
  const mainContent = document.getElementById('mainContent');
  const statusLine = document.getElementById('statusLine');
  const statusText = document.getElementById('statusText');
  const userIdSpan = document.getElementById('userId');
  const userCreditsSpan = document.getElementById('userCredits');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const connectAccBtn = document.getElementById('connectAccBtn');
  const accountsList = document.getElementById('accountsList');
  const accountErrorMsg = document.getElementById('accountErrorMsg');
  const redeemCodeInput = document.getElementById('redeemCodeInput');
  const dropClaimBtn = document.getElementById('dropClaimBtn');
  const bonusClaimBtn = document.getElementById('bonusClaimBtn');
  const redeemErrorMsg = document.getElementById('redeemErrorMsg');
  const redeemSuccessMsg = document.getElementById('redeemSuccessMsg');
  const historyList = document.getElementById('historyList');
  const logEntries = document.getElementById('logEntries');

  // --- UI helpers
  function setStatus(txt, connected) {
    statusText.textContent = txt;
    statusLine.style.color = connected ? "#4fc94f" : "#f44";
  }
  function updateUserUI() {
    userIdSpan.textContent = userData.id;
    userCreditsSpan.textContent = userData.credits;
  }
  function showLicensePopup() {
    licensePopup.classList.remove('hidden');
    mainContent.classList.add('hidden');
  }
  function hideLicensePopup() {
    licensePopup.classList.add('hidden');
    mainContent.classList.remove('hidden');
  }
  function addLog(level, message) {
    const entry = document.createElement('div');
    entry.textContent = `[${new Date().toLocaleString()}] [${level.toUpperCase()}] ${message}`;
    logEntries.appendChild(entry);
    logEntries.scrollTop = logEntries.scrollHeight;
  }
  function addHistory(action, details) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${new Date().toLocaleString()}</td><td>${action}</td><td>${details}</td>`;
    historyList.prepend(tr);
  }
  function renderAccounts() {
    accountsList.innerHTML = '';
    userAccounts.forEach((acc, idx) => {
      const el = document.createElement('div');
      el.className = 'account-entry';
      el.innerHTML = `
        <b>${acc.username}</b> (${acc.currency.toUpperCase()})
        <select data-idx="${idx}" class="currency-sel">${currencies.map(c=>`<option value="${c}" ${c===acc.currency?'selected':''}>${c.toUpperCase()}</option>`).join('')}</select>
        <button class="del-btn" title="Delete Account" data-idx="${idx}">&times;</button>
      `;
      accountsList.appendChild(el);
    });
  }

  // --- API logic
  function getDomain() {
    return window.location.hostname === 'localhost'
      ? 'localhost'
      : window.location.hostname;
  }
  async function graphqlFetch(apiKey, payload) {
    const res = await fetch(`https://${getDomain()}${mainApiPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-access-token': apiKey },
      credentials: 'include',
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`${res.statusText} (${res.status})`);
    return res.json();
  }
  async function fetchUsername(apiKey) {
    try {
      const data = await graphqlFetch(apiKey, {
        variables: { signupCode: true },
        query: `query UserMeta($name: String, $signupCode: Boolean = false) {
          user(name: $name) { id name }
        }`
      });
      return data.data.user.name;
    } catch { return null; }
  }
  async function claimBonusCode(account, code, claimType) {
    try {
      let operationName = claimType === 'drop' ? 'ClaimDropCode' : 'ClaimBonusCode';
      let query = claimType === 'drop'
        ? `mutation ClaimDropCode($code: String!, $currency: CurrencyEnum!, $turnstileToken: String!) { claimDropCode(code: $code, currency: $currency, turnstileToken: $turnstileToken) { bonusCode { id code } amount currency user { id balances { available { amount currency } } } } }`
        : `mutation ClaimBonusCode($code: String!, $currency: CurrencyEnum!, $turnstileToken: String!) { claimBonusCode(code: $code, currency: $currency, turnstileToken: $turnstileToken) { bonusCode { id code } amount currency user { id balances { available { amount currency } } } redeemed } }`;
      const payload = {
        operationName,
        variables: {
          currency: account.currency.toUpperCase(),
          code,
          turnstileToken: account.turnstileToken || ""
        },
        query
      };
      const data = await graphqlFetch(account.apiKey, payload);
      if (data.data && data.data[operationName]) {
        return `${data.data[operationName].amount.toFixed(8)} ${account.currency.toUpperCase()} Successfully claimed`;
      } else if (data.errors) {
        return data.errors[0].errorType;
      }
      return 'unknownError';
    } catch {
      return 'unknownError';
    }
  }

  // --- WebSocket
  function connectWebSocket(endpoint, license) {
    ws = new WebSocket(endpoint);
    ws.addEventListener('open', () => {
      ws.send(JSON.stringify({ type: 'licenseAuth', license: license }));
      setStatus('Connecting...', false);
      addLog('INFO', 'WebSocket open, authenticating license...');
    });
    ws.addEventListener('message', evt => {
      const data = JSON.parse(evt.data);
      if (data.type === 'authenticated') {
        licenseAuthed = true;
        localStorage.setItem('licenseKey', license);
        licenseKey = license;
        userData = { id: data.id, credits: data.credits };
        updateUserUI();
        setStatus('Connected', true);
        hideLicensePopup();
        addLog('OPEN', 'License authenticated.');
        addHistory('Login', 'License authenticated.');
      }
      if (data.type === 'refreshed') {
        userData = { id: data.id, credits: data.credits };
        updateUserUI();
        addLog('INFO', 'User Data Refreshed.');
      }
      if (data.type === 'codeComing' && data.result && data.result.code) {
        claimCodeForAllAccounts(data.result.code, data.result.type, data.result.amount);
        addLog('INFO', `Code Coming [${data.result.code}]`);
      }
    });
    ws.addEventListener('close', evt => {
      setStatus('Disconnected', false);
      showLicensePopup();
      addLog('ERROR', `Connection closed (Code: ${evt.code}, Reason: ${evt.reason || 'N/A'})`);
    });
    ws.addEventListener('error', () => {
      setStatus('Error', false);
      addLog('ERROR', 'WebSocket error');
    });
  }

  // --- Account logic
  async function addAccount(apiKey) {
    if (!apiKey || apiKey.length !== 96) {
      accountErrorMsg.textContent = 'API Key must be exactly 96 characters.';
      return;
    }
    if (userAccounts.length >= 5) {
      accountErrorMsg.textContent = 'Maximum 5 accounts allowed.';
      return;
    }
    const username = await fetchUsername(apiKey);
    if (!username) {
      accountErrorMsg.textContent = 'Invalid API Key or unable to fetch username.';
      return;
    }
    accountErrorMsg.textContent = '';
    userAccounts.push({
      isLocal: true,
      apiKey,
      username,
      currency: 'usdt'
    });
    renderAccounts();
    addHistory('Connect Account', username);
    apiKeyInput.value = '';
  }
  function removeAccount(idx) {
    userAccounts.splice(idx, 1);
    renderAccounts();
  }

  // --- Bulk claim
  async function claimCodeForAllAccounts(code, claimType = 'drop', amountLimit) {
    if (!code || userAccounts.length === 0 || userData.credits < 100) return;
    redeemErrorMsg.textContent = '';
    redeemSuccessMsg.textContent = '';
    let errors = [];
    let successes = [];
    await Promise.all(userAccounts.map(async (acc, idx) => {
      try {
        const res = await claimBonusCode(acc, code, claimType);
        if (res.includes('Successfully claimed')) {
          successes.push(`${acc.username}: ${claimType.toUpperCase()} [${code}] ${res}`);
          userData.credits -= claimTypes[claimType][1] || 50;
        } else {
          errors.push(`${acc.username}: ${claimType.toUpperCase()} [${code}] ${res}`);
        }
        addHistory(acc.username, `[${code}] ${res}`);
        updateUserUI();
      } catch (e) {
        errors.push(`${acc.username}: ${claimType.toUpperCase()} [${code}] Error`);
      }
    }));
    if (successes.length) {
      redeemSuccessMsg.textContent = successes.join('\n');
    }
    if (errors.length) {
      redeemErrorMsg.textContent = errors.join('\n');
    }
  }

  // --- Event listeners
  licenseBtn.addEventListener('click', () => {
    const val = licenseInput.value.trim();
    if (!val) {
      licenseError.textContent = 'Please enter a license key.';
      return;
    }
    licenseError.textContent = '';
    connectWebSocket(websocketEndpoint, val);
  });
  connectAccBtn.addEventListener('click', () => {
    addAccount(apiKeyInput.value.trim());
  });
  accountsList.addEventListener('change', e => {
    if (e.target.classList.contains('currency-sel')) {
      const idx = +e.target.getAttribute('data-idx');
      userAccounts[idx].currency = e.target.value;
    }
  });
  accountsList.addEventListener('click', e => {
    if (e.target.classList.contains('del-btn')) {
      const idx = +e.target.getAttribute('data-idx');
      removeAccount(idx);
    }
  });
  dropClaimBtn.addEventListener('click', () => {
    const code = redeemCodeInput.value.trim();
    if (!code) {
      redeemErrorMsg.textContent = 'Please enter a redeem code.';
      return;
    }
    claimCodeForAllAccounts(code, 'drop');
  });
  bonusClaimBtn.addEventListener('click', () => {
    const code = redeemCodeInput.value.trim();
    if (!code) {
      redeemErrorMsg.textContent = 'Please enter a redeem code.';
      return;
    }
    claimCodeForAllAccounts(code, 'bonus');
  });

  // --- On load
  window.addEventListener('DOMContentLoaded', () => {
    renderAccounts();
    updateUserUI();
    if (licenseKey) {
      connectWebSocket(websocketEndpoint, licenseKey);
      hideLicensePopup();
    } else {
      showLicensePopup();
      setStatus('License Required', false);
    }
  });

  // Fallback in case DOMContentLoaded already happened (paste di console)
  if(document.readyState === "complete" || document.readyState === "interactive"){
    renderAccounts();
    updateUserUI();
    if (licenseKey) {
      connectWebSocket(websocketEndpoint, licenseKey);
      hideLicensePopup();
    } else {
      showLicensePopup();
      setStatus('License Required', false);
    }
  }

})();
