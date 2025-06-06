(function() {
  // 1. Inject CSS
  const css = `
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
    @media (max-width:700px){
      #fb-claimer-main {max-width:99vw;}
      .fb-claimer-panel {padding-left:0;padding-right:0;}
    }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // 2. Root Element
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
      <span id="fb-claimer-title">FvckinBot Claimer</span>
      <span id="fb-claimer-site">Site: stake.bet</span>
    </div>
    <div id="fb-claimer-main" style="display:none;">
      <div class="fb-claimer-panel">
        <div class="panel-title">TELEGRAM BOT INFO</div>
        <div class="panel-content user-info">
          <div>User Id: <span id="fb-userId">DEMO USER</span></div>
          <div>Credits: <span id="fb-userCredits">500</span></div>
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

  // 3. Data & Logic
  let accountList = [
    { name: "Budakcina" },
    { name: "FvckinGambler" }
  ];
  let apiKey = null;
  let userSession = {
    id: "DEMO USER",
    username: "DEMO USER",
    credits: 500
  };

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
    // Bind Delete
    wrap.querySelectorAll('.fb-del').forEach(btn=>{
      btn.onclick = function(){
        accountList.splice(Number(btn.dataset.idx),1);
        renderAccounts();
      };
    });
    // Bind Settings (example)
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

  // 4. Login Logic
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
    // Success!
    document.getElementById('fb-claimer-modal').style.display = "none";
    document.getElementById('fb-claimer-main').style.display = "";
    renderAccounts();
    document.getElementById('fb-userId').textContent = userSession.id;
    document.getElementById('fb-userCredits').textContent = userSession.credits;
  };
  document.getElementById('fb-loginPassword').addEventListener('keydown',function(e){
    if(e.key==="Enter") document.getElementById('fb-loginBtn').click();
  });

  // 5. API Connect
  document.getElementById('fb-connectAPI').onclick = async function(){
    const input = document.getElementById('fb-apiKeyInput').value.trim();
    if(!input) return showStatus('API Key required', "error");
    if(input.length !== 96) return showStatus('API Key must be 96 chars', "error");
    apiKey = input;
    showStatus('Connecting to API...');
    try{
      const query = `
        query UserMeta {
          user { id name credits }
        }
      `;
      const res = await fetch("https://stake.com/_api/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-access-token": apiKey
        },
        body: JSON.stringify({ query })
      });
      const json = await res.json();
      if(!json.data || !json.data.user) {
        showStatus('Invalid API Key', "error");
        return;
      }
      userSession = {
        id: json.data.user.id || 'UNKNOWN',
        username: json.data.user.name || '-',
        credits: json.data.user.credits || 0
      };
      document.getElementById('fb-userId').textContent = userSession.id;
      document.getElementById('fb-userCredits').textContent = userSession.credits;
      accountList.push({ name: userSession.username });
      renderAccounts();
      showStatus('API Connected!', "success");
      document.getElementById('fb-apiKeyInput').value = '';
    }catch(e){
      showStatus('Error connecting API', "error");
    }
  };
  document.getElementById('fb-pasteClipboard').onclick = async function(){
    try{
      const text = await navigator.clipboard.readText();
      document.getElementById('fb-apiKeyInput').value = text || '';
    }catch{
      showStatus('Clipboard not accessible', "error");
    }
  };

  // 6. Claim Bonus
  document.getElementById('fb-claimBonus').onclick = async function(){
    const code = document.getElementById('fb-bonusCodeInput').value.trim();
    if(!code) return showStatus('Code required', "error");
    if(!apiKey) return showStatus('No API Key connected', "error");
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
      if(json.data && json.data.claimBonusCode && json.data.claimBonusCode.amount){
        showStatus(`Bonus Claimed: ${json.data.claimBonusCode.amount} ${json.data.claimBonusCode.currency}`, "success");
        // Update credits jika dapat
        if(json.data.claimBonusCode.user && json.data.claimBonusCode.user.id === userSession.id){
          document.getElementById('fb-userCredits').textContent = json.data.claimBonusCode.user.balances.available[0].amount;
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
