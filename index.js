(function() {
   // --- CSS inject
   const style = document.createElement('style');
   style.textContent = ` ... /* (CSS sama seperti di atas, singkat di sini) */ `;
   document.head.appendChild(style);

   // --- UI HTML root
   const root = document.createElement('div');
   root.id = "fb-claimer-root";
   root.innerHTML = `
     <!-- ... UI sama seperti di script-mu di atas ... -->
   `;
   document.body.appendChild(root);

   // --- STATE
   let accountList = [{ name: "Budakcina" }, { name: "sabot" }];
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
     // 3. VIP / Faucet (tanpa variables)
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
