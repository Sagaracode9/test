(function() {
  // CSS inject
  const style = document.createElement('style');
  style.textContent = `
    #fb-claimer-root * { box-sizing:border-box; }
    #fb-claimer-root { all:unset; position:fixed; top:0; left:0; width:100vw; min-height:100vh; z-index:99999; background:#151c23; color:#fff; font-family: 'Fira Mono', monospace; }
    #fb-claimer-modal { background:#223447e9; position:fixed; left:0;top:0;width:100vw;height:100vh; display:flex; align-items:center;justify-content:center; z-index:1000;}
    #fb-claimer-modal .popup-inner { background:#253a50; padding:36px 28px; border-radius:13px; min-width:260px; max-width:95vw; box-shadow:0 6px 36px #000b;}
    #fb-claimer-header { background: #212f3d; padding: 18px 32px; font-size: 1.7em; border-radius: 0 0 14px 14px; display:flex; justify-content:space-between; align-items:center; }
    #fb-claimer-title { font-weight: bold; }
    #fb-claimer-site { font-size: 0.85em; color: #fff9; }
    #fb-claimer-main { max-width: 600px; margin: 36px auto 60px auto; }
    .fb-claimer-panel { background: #223447; margin-top: 28px; border-radius: 12px; padding: 0 0 24px 0; box-shadow: 0 2px 16px #0009; }
    .fb-claimer-panel .panel-title { background: #2488ff; color: #fff; font-weight: bold; border-radius: 12px 12px 0 0; padding: 11px 24px; font-size: 1.09em; letter-spacing:1px;}
    .panel-content { padding: 20px 24px 0 24px; }
    .user-info { margin-bottom:10px; font-size:1.15em;}
    .user-info div { margin-bottom:6px; }
    .account-list { margin-bottom:12px; }
    .account-item { background: #2d4250; border-radius: 7px; padding: 9px 13px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; font-size:1em;}
    .account-item .label { font-weight: 600;}
    .account-item .btns button { border:none; background:transparent; font-size:1.15em; cursor:pointer; margin-left:7px;}
    .api-form { display: flex; gap: 8px; margin-top: 10px; }
    .api-form input { flex:1; padding: 8px; border-radius:7px; border: none; background: #232f3a; color: #fff;}
    .api-form button { border-radius: 7px; border: none; background: #2488ff; color: #fff; padding: 8px 14px; font-weight: bold; cursor:pointer;}
    .api-warning { color: #ffe892; font-size: 0.93em; margin-top: 7px;}
    .section-title { font-weight: bold; margin-top:24px; margin-bottom:12px; font-size:1.1em;}
    .claim-form input { padding:8px; border-radius:7px; border:none; background:#232f3a; color:#fff; margin-right:8px;}
    .claim-form button { border-radius: 7px; border: none; background: #2488ff; color: #fff; padding: 8px 18px; font-weight: bold; cursor:pointer;}
    .status { margin: 15px 0 0 0; font-size:1em; color:#fcf259; min-height:22px;}
    .error { color:#ff6767;}
    .success { color:#baff84;}
    .fb-viphost, .fb-faucet { font-size:.97em; color:#ffecb1; margin-top:9px;}
    @media (max-width:700px){
      #fb-claimer-main {max-width:99vw;}
      .fb-claimer-panel {padding-left:0;padding-right:0;}
    }
  `;
  document.head.appendChild(style);

  // Root & HTML
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
      <span id="fb-claimer-title">SaBot Claimer</span>
      <span id="fb-claimer-site">Site: stake.bet</span>
    </div>
    <div id="fb-claimer-main" style="display:none;">
      <div class="fb-claimer-panel">
        <div class="panel-title">TELEGRAM BOT INFO</div>
        <div class="panel-content user-info">
          <div>User Id: <span id="fb-userId">-</span></div>
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
        <div class="panel-title">MANUAL CLAIM</div>
        <div class="panel-content">
          <div class="claim-form" style="margin-top:8px;">
            <input type="text" id="fb-bonusCodeInput" maxlength="50" placeholder="Enter Bonus Code">
            <button id="fb-claimBonus">Claim Bonus</button>
          </div>
          <div class="status" id="fb-status"></div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  // Akun list dummy & state
  let accountList = [
    { name: "Test" },
    { name: "Sabot" }
  ];
  let apiKey = null;
  let userSession = { id: "-", username: "-", credits: "-" };

  function renderAccounts(){
    const wrap = document.getElementById('fb-accounts');
    wrap.innerHTML = "";
    accountList.forEach((acc,idx)=>{
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
    wrap.querySelectorAll('.fb-del').forEach(btn=>{
      btn.onclick = function(){
        accountList.splice(Number(btn.dataset.idx),1);
        renderAccounts();
      };
    });
    wrap.querySelectorAll('.fb-set').forEach(btn=>{
      btn.onclick = function(){
        alert('Setting for '+accountList[Number(btn.dataset.idx)].name);
      };
    });
  }
  function showStatus(msg, type=null){
    const s = document.getElementById('fb-status');
    s.textContent = msg;
    s.className = "status" + (type ? (" "+type) : "");
  }

  // LOGIN
  document.getElementById('fb-loginBtn').onclick = function(){
    const val = document.getElementById('fb-loginPassword').value.trim();
    if(!val){
      document.getElementById('fb-loginErr').textContent = "Password required!";
      return;
    }
    if(val !== "sagara321"){
      document.getElementById('fb-loginErr').textContent = "Wrong password!";
      return;
    }
    document.getElementById('fb-claimer-modal').style.display = "none";
    document.getElementById('fb-claimer-main').style.display = "";
    renderAccounts();
    document.getElementById('fb-userId').textContent = userSession.id;
    document.getElementById('fb-userCredits').textContent = userSession.credits;
  };
  document.getElementById('fb-loginPassword').addEventListener('keydown',function(e){
    if(e.key==="Enter") document.getElementById('fb-loginBtn').click();
  });

  // --- MULTI QUERY on Connect API ---
  document.getElementById('fb-connectAPI').onclick = async function(){
    const input = document.getElementById('fb-apiKeyInput').value.trim();
    if(!input) return showStatus('API Key required', "error");
    if(input.length !== 96) return showStatus('API Key must be 96 chars', "error");
    apiKey = input;
    showStatus('Connecting to API...');

    // --- Multi query: UserBalances & VipMeta ---
    const userBalancesQ = `
      query UserBalances {
        user {
          id
          balances {
            available { amount currency }
            vault { amount currency }
          }
        }
      }
    `;
    const vipMetaQ = `
      query VipMeta($dailyBonusEnabled: Boolean!, $topUpEnabled: Boolean!) {
        user {
          vipInfo {
            host {
              name
              contactHandle
              contactLink
              email
              availableDays
            }
          }
          reload: faucet {
            id value active claimInterval lastClaim expireAt createdAt updatedAt expireCount
          }
        }
      }
    `;
    // 1. Ambil Balances
    let userId = "-", usdt = "-";
    try {
      const res = await fetch("https://stake.com/_api/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-access-token": apiKey
        },
        body: JSON.stringify({ query: userBalancesQ })
      });
      const json = await res.json();
      if(!json.data || !json.data.user) {
        showStatus('Invalid API Key', "error");
        return;
      }
      userId = json.data.user.id || "-";
      if(json.data.user.balances && Array.isArray(json.data.user.balances)) {
        for(const bal of json.data.user.balances) {
          if(bal.available && bal.available.currency === "usdt") {
            usdt = bal.available.amount;
            break;
          }
        }
      }
    } catch(e) {
      showStatus('Error connecting API (balances)', "error");
      return;
    }
    // 2. Ambil VIP/Host/Reload
    let viphost = "-", faucet = "-";
    try {
      const res2 = await fetch("https://stake.com/_api/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-access-token": apiKey
        },
        body: JSON.stringify({
          query: vipMetaQ,
          variables: { dailyBonusEnabled:false, topUpEnabled:false }
        })
      });
      const json2 = await res2.json();
      if(json2.data && json2.data.user) {
        if(json2.data.user.vipInfo && json2.data.user.vipInfo.host) {
          const h = json2.data.user.vipInfo.host;
          viphost = (h.name ? h.name : "-") +
            (h.contactHandle ? " ("+h.contactHandle+")" : "") +
            (h.contactLink ? " ["+h.contactLink+"]" : "");
        }
        if(json2.data.user.reload) {
          const f = json2.data.user.reload;
          faucet = (f.active ? "Active" : "Inactive") + ", Value: " + f.value;
        }
      }
    } catch(e) {
      // skip
    }
    // Update UI
    document.getElementById('fb-userId').textContent = userId;
    document.getElementById('fb-userCredits').textContent = usdt;
    document.getElementById('fb-viphost').textContent = "VIP Host: " + viphost;
    document.getElementById('fb-faucet').textContent = "Faucet: " + faucet;

    showStatus('API Connected!', "success");
    document.getElementById('fb-apiKeyInput').value = '';
  };

  // Paste from clipboard
  document.getElementById('fb-pasteClipboard').onclick = async function(){
    try{
      const text = await navigator.clipboard.readText();
      document.getElementById('fb-apiKeyInput').value = text || '';
    }catch{
      showStatus('Clipboard not accessible', "error");
    }
  };

  // CLAIM BONUS (update USDT credits after claim)
  document.getElementById('fb-claimBonus').onclick = async function(){
    const code = document.getElementById('fb-bonusCodeInput').value.trim();
    if(!code) return showStatus('Code required', "error");
    if(!apiKey) return showStatus('No API Key connected', "error");
    const mutation = `
      mutation ClaimBonusCode($code: String!, $currency: CurrencyEnum!, $turnstileToken: String!) {
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
            balances {
              available {
                amount
                currency
              }
            }
          }
          redeemed
        }
      }
    `;
    const variables = {
      code: code,
      currency: "usdt",
      turnstileToken: "DEMO-TOKEN"
    };
    try{
      const res = await fetch("https://stake.com/_api/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-access-token": apiKey
        },
        body: JSON.stringify({ query: mutation, variables })
      });
      const json = await res.json();
      if(json.data && json.data.claimBonusCode){
        showStatus(
          `Bonus Claimed: ${json.data.claimBonusCode.amount} ${json.data.claimBonusCode.currency}`,
          "success"
        );
        // Update USDT balance
        const user = json.data.claimBonusCode.user;
        if(user && user.balances) {
          let usdt = "-";
          for(const b of user.balances) {
            if(b.available && b.available.currency === "usdt") {
              usdt = b.available.amount;
              break;
            }
          }
          document.getElementById('fb-userCredits').textContent = usdt;
        }
      }else if(json.errors && json.errors.length){
        showStatus(json.errors[0].message, "error");
      }else{
        showStatus('Unknown error on bonus claim', "error");
      }
    }catch(e){
      showStatus('Error on bonus claim', "error");
    }
  };
  document.getElementById('fb-bonusCodeInput').addEventListener('keydown',function(e){
    if(e.key==="Enter") document.getElementById('fb-claimBonus').click();
  });
})();
