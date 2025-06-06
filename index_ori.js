(function(){
  const API_URL = "/_api/graphql";
  const LS_ACCOUNTS = "my_accounts_stake";
  let accounts = [];
  let activeApiKey = null;

  // HTML inject (versi clean, gaya mirip asli)
  const root = document.createElement('div');
  root.id = "sb-v2-root";
  root.style = 'position:fixed;top:0;left:0;z-index:2147483647;width:100vw;min-height:100vh;background:rgba(28,36,46,0.97);font-family:monospace;';
  root.innerHTML = `
    <div style="max-width:480px;margin:80px auto;padding:24px 22px 30px 22px;background:#17222d;border-radius:16px;box-shadow:0 0 30px #000a;">
      <h3 style="font-weight:bold;color:#ffd600;margin-bottom:15px;">FvckinBot™ Claimer</h3>
      <div>
        <label>API Key (96 chars):</label>
        <input type="password" id="apiKeyInput" maxlength="96" class="form-control" style="width:100%;" autocomplete="off">
        <button id="connectAPI" style="margin:8px 0 16px 0;padding:5px 16px;">Connect</button>
        <span id="apiStatus" style="margin-left:10px;color:#f44;font-weight:bold;"></span>
      </div>
      <div style="margin:8px 0 18px 0;">
        <div><b>Accounts:</b></div>
        <div id="accountsList"></div>
      </div>
      <div style="margin-bottom:12px;">
        <input type="text" id="bonusCodeInput" class="form-control" placeholder="Enter Bonus Code" style="width:60%;display:inline-block;">
        <select id="couponType" style="margin-left:8px;">
          <option value="bonus">BONUS</option>
          <option value="condition">COUPON</option>
        </select>
        <button id="btnCheckBonus" style="margin-left:6px;">Check</button>
        <span id="checkBonusStatus" style="margin-left:10px;"></span>
      </div>
      <div style="margin-bottom:12px;">
        <select id="claimCurrency" style="margin-right:8px;">
          <option value="usdt">USDT</option>
          <option value="btc">BTC</option>
          <option value="eth">ETH</option>
          <option value="bnb">BNB</option>
          <option value="busd">BUSD</option>
        </select>
        <input type="text" id="turnstileToken" class="form-control" placeholder="Turnstile Token (Cloudflare)" style="width:56%;display:inline-block;">
        <button id="btnClaim" style="margin-left:8px;">Claim</button>
        <span id="claimStatus" style="margin-left:8px;"></span>
      </div>
      <div id="sbLog" style="font-size:13px;line-height:1.5;margin-top:18px;color:#aaa;height:84px;overflow:auto;border:1px solid #22313a;padding:7px 11px;background:#131a22;border-radius:7px;"></div>
      <div style="margin-top:18px;color:#446;">by FvckinBot™</div>
    </div>
  `;
  document.body.appendChild(root);

  // Helper log/status
  function log(s) {
    const d = document.getElementById('sbLog');
    d.innerHTML += `<div>${new Date().toLocaleTimeString()}: ${s}</div>`;
    d.scrollTop = d.scrollHeight;
  }
  function showStatus(id, msg, ok) {
    const el = document.getElementById(id);
    el.textContent = msg || '';
    el.style.color = ok===false ? "#f44" : (ok===true ? "#3dbd5d" : "#ffd600");
  }
  function renderAccounts() {
    const list = document.getElementById('accountsList');
    list.innerHTML = "";
    accounts.forEach((acc, i) => {
      const div = document.createElement('div');
      div.style = "padding:3px 0;";
      div.innerHTML = `<span style="color:#16f;font-weight:bold;">${acc.username||'-'}</span>
      <button data-i="${i}" style="margin-left:8px;color:#fff;background:#d44;padding:0 8px 1px 8px;border:none;border-radius:3px;cursor:pointer;">X</button>`;
      list.appendChild(div);
    });
    Array.from(list.querySelectorAll('button')).forEach(btn=>{
      btn.onclick = () => { accounts.splice(+btn.dataset.i,1); saveAccounts(); renderAccounts(); };
    });
  }
  function saveAccounts(){ localStorage.setItem(LS_ACCOUNTS, JSON.stringify(accounts)); }
  function loadAccounts(){ try{ accounts = JSON.parse(localStorage.getItem(LS_ACCOUNTS)||"[]"); }catch{ accounts=[]; } renderAccounts(); }

  // Connect API
  document.getElementById('connectAPI').onclick = async function(){
    const apiKey = document.getElementById('apiKeyInput').value.trim();
    if (!apiKey || apiKey.length!==96) { showStatus('apiStatus',"Invalid Key!",false); return; }
    showStatus('apiStatus',"Checking...",null);
    try {
      const q = `query UserMeta($name: String, $signupCode: Boolean = false) {
        user(name: $name) {
          id name isMuted isRainproof isBanned createdAt campaignSet
        }
      }`;
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {"Content-Type":"application/json","x-access-token":apiKey},
        body: JSON.stringify({query:q, variables:{name:null, signupCode:false}})
      });
      const json = await res.json();
      if(json.data && json.data.user) {
        let u = json.data.user;
        showStatus('apiStatus',`Connected as ${u.name||u.id}`,true);
        activeApiKey = apiKey;
        if (!accounts.some(a=>a.apiKey===apiKey)) {
          accounts.push({apiKey, username:u.name||u.id, currency:'usdt'});
          saveAccounts();
          renderAccounts();
        }
      } else {
        showStatus('apiStatus',json.errors && json.errors.length ? json.errors[0].message : "API error",false);
        activeApiKey = null;
      }
    } catch(e){
      showStatus('apiStatus',"Conn Error",false);
      activeApiKey = null;
    }
  };

  // Check Bonus Code Availability
  document.getElementById('btnCheckBonus').onclick = async function(){
    if (!activeApiKey) return showStatus('checkBonusStatus',"Connect API first",false);
    const code = document.getElementById('bonusCodeInput').value.trim();
    let couponType = document.getElementById('couponType').value; // "bonus" / "condition"
    if (!code) return showStatus('checkBonusStatus',"Input code",false);
    showStatus('checkBonusStatus',"Checking...",null);
    try {
      const query = `query BonusCodeAvailability($code: String!, $couponType: CouponType!) {
        bonusCodeAvailability(code: $code, couponType: $couponType)
      }`;
      const variables = { code, couponType };
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {"Content-Type":"application/json","x-access-token":activeApiKey},
        body: JSON.stringify({query, variables})
      });
      const json = await res.json();
      if (json.data && typeof json.data.bonusCodeAvailability!=="undefined") {
        showStatus('checkBonusStatus',json.data.bonusCodeAvailability?"AVAILABLE":"Not Available",json.data.bonusCodeAvailability);
        log("Check: "+code+" = "+json.data.bonusCodeAvailability);
      } else if (json.errors && json.errors.length){
        showStatus('checkBonusStatus',json.errors[0].message,false);
        log("Check ERR: "+json.errors[0].message);
      }
    } catch (e) { showStatus('checkBonusStatus','Error',false); }
  };

  // Claim Bonus
  document.getElementById('btnClaim').onclick = async function(){
    if (!activeApiKey) return showStatus('claimStatus',"Connect API first",false);
    const code = document.getElementById('bonusCodeInput').value.trim();
    let couponType = document.getElementById('couponType').value; // "bonus" / "condition"
    const currency = document.getElementById('claimCurrency').value;
    const turnstileToken = document.getElementById('turnstileToken').value.trim();
    if (!code) return showStatus('claimStatus',"Input code",false);
    if (!turnstileToken) return showStatus('claimStatus',"Turnstile required",false);

    let mutation, opName;
    if(couponType==="condition"){
      mutation = `mutation ClaimConditionBonusCode($code: String!, $currency: CurrencyEnum!, $turnstileToken: String!) {
        claimConditionBonusCode(code: $code, currency: $currency, turnstileToken: $turnstileToken) {
          bonusCode { id code __typename }
          amount currency
          user { id balances { available { amount currency __typename } vault { amount currency __typename } __typename } __typename }
          __typename
        }
      }`; opName="claimConditionBonusCode";
    }else{
      mutation = `mutation ClaimBonusCode($code: String!, $currency: CurrencyEnum!, $turnstileToken: String!) {
        claimBonusCode(code: $code, currency: $currency, turnstileToken: $turnstileToken) {
          bonusCode { id code __typename }
          amount currency
          user { id balances { available { amount currency __typename } __typename } __typename }
          redeemed __typename
        }
      }`; opName="claimBonusCode";
    }
    const variables = { code, currency, turnstileToken };
    showStatus('claimStatus',"Claiming...",null);
    try{
      const res = await fetch(API_URL, {
        method:"POST",
        headers:{"Content-Type":"application/json","x-access-token":activeApiKey},
        body: JSON.stringify({ query: mutation, variables })
      });
      const json = await res.json();
      if (json.errors && json.errors.length && json.errors[0].message && json.errors[0].message.includes('invalidTurnstile')){
        showStatus('claimStatus',"ERROR: Turnstile token invalid! Harus dari widget asli Cloudflare.",false);
        log("Claim ERR: invalidTurnstile");
        return;
      }
      if(json.data && json.data[opName]){
        let amount = json.data[opName].amount, curr = json.data[opName].currency;
        showStatus('claimStatus',`Claimed: ${amount} ${curr}`,true);
        log(`CLAIM: ${code} (${curr}) = ${amount}`);
      } else if (json.errors && json.errors.length){
        showStatus('claimStatus',json.errors[0].message,false);
        log("Claim ERR: "+json.errors[0].message);
      } else {
        showStatus('claimStatus',"Unknown error",false);
      }
    }catch(e){ showStatus('claimStatus','Error',false);}
  };

  // Initial
  loadAccounts();
})();
