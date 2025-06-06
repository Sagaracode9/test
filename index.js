// == FvckinBot Claimer UI via JS ==

// 1. Tambah CSS Style
const style = document.createElement('style');
style.textContent = `
  body { background: #182533; color: #fff; font-family: monospace; margin:0;padding:0; }
  .container { max-width:420px; margin:32px auto; background:#223447; border-radius:16px; box-shadow:0 2px 16px #0009; padding: 26px 22px 32px 22px;}
  h2 { color: #fcf259; text-align:center; font-weight:700; margin-top:0;}
  label { display:block; margin-top:14px; }
  input, select { background: #1a2c38; border:1px solid #304158; border-radius:7px; color:#fcf259; font-family: inherit; font-size:15px; padding:7px; margin-top:7px; width:90%;}
  button { background: #1475e1; color:#fff; border:none; border-radius:9px; padding:9px 21px; font-weight:bold; cursor:pointer; margin-top:14px; margin-right:10px; transition:background .2s;}
  button:hover { background: #0d437c; }
  .section { margin-bottom:22px; }
  .hidden { display:none; }
  .popup { background:#223447e9; position:fixed; left:0;top:0;width:100vw;height:100vh; display:flex; align-items:center;justify-content:center; z-index:10;}
  .popup-inner { background:#253a50; padding:36px 28px; border-radius:13px; min-width:260px; max-width:95vw; box-shadow:0 6px 36px #000b;}
  .log-table { width:100%; margin-top:13px; font-size:13px;}
  .log-table tr:nth-child(even) { background:#2d4250;}
  .log-table tr:nth-child(odd) { background:#1a2c38;}
  .log-table th, .log-table td { padding:6px 8px;}
  .status { margin-top:16px; font-size:15px; color:#fcf259;}
  .error { color: #ff6767; }
  .success { color: #baff84; }
`;
document.head.appendChild(style);

// 2. Buat Struktur HTML
const mainHTML = `
  <div class="container">
    <h2>FvckinBot™ Claimer</h2>
    <div id="userPanel" class="section hidden">
      <div><b>User:</b> <span id="username">-</span></div>
      <div><b>ID:</b> <span id="userid">-</span></div>
      <div><b>Credits:</b> <span id="credits">-</span></div>
    </div>
    <div class="section hidden" id="apiSection">
      <label>API Key:
        <input type="password" id="apiKeyInput" maxlength="100">
      </label>
      <button id="connectAPI">Connect API</button>
      <button id="pasteClipboard">Paste</button>
    </div>
    <div class="section hidden" id="claimSection">
      <label>Bonus Code:
        <input type="text" id="bonusCodeInput" maxlength="50">
      </label>
      <button id="claimBonus">Claim Bonus</button>
    </div>
    <div class="status" id="status"></div>
    <div class="section">
      <h3 style="margin-bottom:8px; color:#FCF259;">Log History</h3>
      <table class="log-table" id="logTable">
        <tr><th>Time</th><th>Action</th><th>Details</th></tr>
      </table>
    </div>
  </div>
  <div id="licensePopup" class="popup">
    <div class="popup-inner">
      <h3 style="margin:0 0 14px 0; color:#FCF259;">Enter Password</h3>
      <input type="password" id="licenseInput" maxlength="100" style="width:100%; margin-bottom:15px;">
      <button id="loginLicense">Login</button>
      <div id="licenseErr" style="color:#ff6767;margin-top:10px;"></div>
    </div>
  </div>
`;

// Hapus popup lama jika ada (biar aman untuk reload)
const existPopup = document.getElementById('licensePopup');
if(existPopup) existPopup.remove();

const existMain = document.querySelector('.container');
if(existMain) existMain.remove();

document.body.insertAdjacentHTML('beforeend', mainHTML);

// ============== Logic App ====================

// Helper masking
function mask(str, show=4) {
  if (!str || str.length <= show*2) return str.replace(/./g, '*');
  return str.slice(0,show)+'...'+str.slice(-show);
}
// Status display
function showStatus(msg, type=null) {
  const s = document.getElementById('status');
  s.textContent = msg;
  s.className = "status" + (type ? (" "+type) : "");
}
// Log table
function logAction(action, details) {
  const t = document.getElementById('logTable');
  const tr = document.createElement('tr');
  const time = new Date().toLocaleTimeString();
  tr.innerHTML = `<td>${time}</td><td>${action}</td><td>${details}</td>`;
  t.appendChild(tr);
}

// AUTH PASSWORD SEDERHANA
function loginLicense() {
  const input = document.getElementById('licenseInput').value.trim();
  if (!input) {
    document.getElementById('licenseErr').textContent = "Password required!";
    return;
  }
  if (input !== "sagara321") {
    document.getElementById('licenseErr').textContent = "Wrong password!";
    return;
  }
  document.getElementById('licensePopup').style.display = "none";
  document.getElementById('userPanel').classList.remove('hidden');
  document.getElementById('apiSection').classList.remove('hidden');
  showStatus('Login success!', "success");
  logAction('Login', 'Password accepted');
  document.getElementById('licenseInput').value = '';
}

// Update user info panel
function updateUserPanel(data) {
  document.getElementById('username').textContent = mask(data.username);
  document.getElementById('userid').textContent = mask(data.id,3);
  document.getElementById('credits').textContent = data.credits;
}
// API KEY & GRAPHQL
let apiKey = null;
let userSession = {};
async function connectAPI() {
  const input = document.getElementById('apiKeyInput').value.trim();
  if (!input) return showStatus('API Key required', "error");
  if (input.length !== 96) return showStatus('API Key must be 96 chars', "error");
  apiKey = input;
  // Query GraphQL untuk get user meta
  const userData = await fetchUserMeta(apiKey);
  if (!userData) return showStatus('Invalid API Key', "error");
  userSession = userData;
  updateUserPanel(userSession);
  document.getElementById('claimSection').classList.remove('hidden');
  showStatus('API Connected!', "success");
  logAction('API', mask(apiKey));
  document.getElementById('apiKeyInput').value = '';
}
async function fetchUserMeta(apiKey) {
  const query = `
    query UserMeta {
      user {
        id
        name
        credits
      }
    }
  `;
  try {
    const res = await fetch("https://stake.com/_api/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": apiKey
      },
      body: JSON.stringify({ query })
    });
    const json = await res.json();
    if (!json.data || !json.data.user) return null;
    return {
      id: json.data.user.id || '',
      username: json.data.user.name || '',
      credits: json.data.user.credits || 0
    };
  } catch (e) {
    showStatus('Error connecting API server', "error");
    return null;
  }
}
// CLAIM BONUS CODE (GraphQL mutation)
async function claimBonus() {
  const code = document.getElementById('bonusCodeInput').value.trim();
  if (!code) return showStatus('Code required', "error");
  if (!apiKey) return showStatus('No API Key connected', "error");
  const mutation = `
    mutation ClaimBonusCode($code: String!, $currency: String!, $turnstileToken: String!) {
      claimBonusCode(
        code: $code,
        currency: $currency,
        turnstileToken: $turnstileToken
      ) {
        bonusCode { id code }
        amount
        currency
        user { id balances { available { amount currency } } }
        redeemed
      }
    }
  `;
  const variables = {
    code: code,
    currency: "usdt",
    turnstileToken: "DEMO-TOKEN"
  };
  try {
    const res = await fetch("https://stake.com/_api/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": apiKey
      },
      body: JSON.stringify({ query: mutation, variables })
    });
    const json = await res.json();
    if (json.data && json.data.claimBonusCode && json.data.claimBonusCode.amount) {
      showStatus(`Bonus Claimed: ${json.data.claimBonusCode.amount} ${json.data.claimBonusCode.currency}`, "success");
      logAction('Claim', `${mask(code)} = ${json.data.claimBonusCode.amount} ${json.data.claimBonusCode.currency}`);
      // Update credits jika dapat
      if (json.data.claimBonusCode.user && json.data.claimBonusCode.user.id === userSession.id) {
        updateUserPanel({
          ...userSession,
          credits: json.data.claimBonusCode.user.balances.available[0].amount
        });
      }
    } else if (json.errors && json.errors.length) {
      showStatus(json.errors[0].message, "error");
    } else {
      showStatus('Unknown error on bonus claim', "error");
    }
  } catch (e) {
    showStatus('Error on bonus claim', "error");
  }
}
// CLIPBOARD
async function pasteClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    document.getElementById('apiKeyInput').value = text || '';
  } catch {
    showStatus('Clipboard not accessible', "error");
  }
}

// ==== EVENT BINDING (setelah HTML sudah diinsert) ====
document.getElementById('loginLicense').onclick = loginLicense;
document.getElementById('connectAPI').onclick = connectAPI;
document.getElementById('pasteClipboard').onclick = pasteClipboard;
document.getElementById('claimBonus').onclick = claimBonus;
document.getElementById('licensePopup').style.display = 'flex';
