// ==UserScript==
// @name         saBot Claimer (Rebuild, Multi-Query, Fix)
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Multi-query account/bonus manager Stake.com, auto UI, USDT vault/available fixed. By GeminiAI
// @author       Gemini AI (based on user request)
// @match        https://stake.com/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// ==/UserScript==

(function() {
    'use strict';

    // --- Configuration
    const API_URL = "https://stake.com/_api/graphql";
    const AUTH_PASSWORD = "sagara321";
    const STORAGE_KEY_ACCOUNTS = "fbClaimer_accounts";
    const STORAGE_KEY_API_KEY = "fbClaimer_apiKey";
    const elements = {};

    let accounts = [];
    let currentApiKey = null;

    function showStatus(msg, type = null) {
        elements.statusDisplay.textContent = msg;
        elements.statusDisplay.className = "status" + (type ? (" " + type) : "");
    }
    function logMessage(msg, type = "info") {
        const time = new Date().toLocaleTimeString();
        const msgDiv = document.createElement('div');
        msgDiv.textContent = `${time}: ${msg}`;
        msgDiv.classList.add(type);
        elements.logBox.appendChild(msgDiv);
        elements.logBox.scrollTop = elements.logBox.scrollHeight;
    }
    function loadState() {
        let storedAccounts = GM_getValue(STORAGE_KEY_ACCOUNTS, null);
        if (storedAccounts) {
            try { accounts = JSON.parse(storedAccounts); }
            catch (e) { accounts = []; }
        }
        currentApiKey = GM_getValue(STORAGE_KEY_API_KEY, null);
        if (currentApiKey) {
            elements.apiKeyInput.value = currentApiKey;
        }
        renderAccounts();
    }
    function saveState() {
        GM_setValue(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
        if (currentApiKey) GM_setValue(STORAGE_KEY_API_KEY, currentApiKey);
        else GM_deleteValue(STORAGE_KEY_API_KEY);
    }
    function renderAccounts() {
        elements.accountsList.innerHTML = "";
        if (accounts.length === 0) {
            elements.accountsList.innerHTML = "<div style='color:#a0a0a0; font-size:0.9em; text-align:center; padding:10px 0;'>No accounts connected yet.</div>";
        }
        accounts.forEach((acc, idx) => {
            const div = document.createElement('div');
            div.className = "account-item";
            div.innerHTML = `
                <span class="label">${acc.name}</span>
                <span class="btns">
                    <button title="Settings" data-idx="${idx}" class="fb-set">⚙️</button>
                    <button title="Delete" data-idx="${idx}" class="fb-del">🗑️</button>
                </span>
            `;
            elements.accountsList.appendChild(div);
        });
        elements.accountsList.querySelectorAll('.fb-del').forEach(btn => {
            btn.onclick = function() {
                const index = Number(btn.dataset.idx);
                if (confirm(`Delete account: ${accounts[index].name}?`)) {
                    accounts.splice(index, 1);
                    saveState();
                    renderAccounts();
                    logMessage(`Account deleted.`, "info");
                }
            };
        });
        elements.accountsList.querySelectorAll('.fb-set').forEach(btn => {
            btn.onclick = function() {
                alert(`Settings for ${accounts[Number(btn.dataset.idx)].name} (not implemented yet)`);
            };
        });
    }
    async function callGraphQL(query, variables = {}, customHeaders = {}) {
        const headers = { "Content-Type": "application/json", ...customHeaders };
        if (currentApiKey) headers["x-access-token"] = currentApiKey;
        const res = await fetch(API_URL, {
            method: "POST",
            headers: headers,
            body: JSON.stringify({ query, variables })
        });
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`HTTP Error: ${res.status} ${res.statusText} - ${errorText}`);
        }
        const json = await res.json();
        if (json.errors && json.errors.length > 0) {
            logMessage(`GraphQL Error: ${JSON.stringify(json.errors)}`, "error");
            throw new Error(json.errors[0].message || "GraphQL error occurred.");
        }
        return json.data;
    }
    async function fetchUserMetaData() {
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
        try {
            const data = await callGraphQL(query, { name: null, signupCode: false });
            return data.user || null;
        } catch (e) {
            logMessage(`Error fetching UserMeta: ${e.message}`, "error");
            return null;
        }
    }
    async function fetchUserBalances() {
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
        try {
            const data = await callGraphQL(query);
            // 'balances' adalah array!
            if (data.user && Array.isArray(data.user.balances)) {
                return data.user.balances;
            }
            return null;
        } catch (e) {
            logMessage(`Error fetching UserBalances: ${e.message}`, "error");
            return null;
        }
    }
    async function fetchVipFaucetData() {
        const query = `
            query VipMeta($dailyBonusEnabled: Boolean!, $topUpEnabled: Boolean!) {
                user {
                    vipInfo {
                        host { name contactHandle contactLink email availableDays }
                    }
                    reload: faucet { value active }
                }
            }`;
        try {
            const data = await callGraphQL(query, { dailyBonusEnabled: false, topUpEnabled: false });
            return data.user || null;
        } catch (e) {
            logMessage(`Error fetching VIP/Faucet data: ${e.message}`, "error");
            return null;
        }
    }
    // --- Handlers ---
    function handleLogin() {
        const val = elements.loginPassword.value.trim();
        if (!val) { elements.loginErr.textContent = "Password required!"; return; }
        if (val !== AUTH_PASSWORD) { elements.loginErr.textContent = "Wrong password!"; return; }
        elements.modal.style.display = "none";
        elements.mainContent.style.display = "";
        loadState();
    }
    async function handleConnectAPI() {
        const inputApiKey = elements.apiKeyInput.value.trim();
        if (!inputApiKey) { showStatus('API Key required', "error"); return; }
        if (inputApiKey.length !== 96) { showStatus('API Key must be 96 characters', "error"); return; }
        currentApiKey = inputApiKey;
        showStatus('Connecting to API...', "info");
        logMessage("Attempting API connection...", "info");
        let userId = "-", userName = "-", userStatus = "N/A", usdt = "-", viphost = "N/A", faucet = "N/A";
        let isConnected = false;
        try {
            const userMeta = await fetchUserMetaData();
            if (userMeta) {
                userId = userMeta.id || "-";
                userName = userMeta.name || "-";
                userStatus = [
                    userMeta.isBanned ? "BANNED" : null,
                    userMeta.isMuted ? "MUTED" : null,
                    userMeta.isRainproof ? "RAINPROOF" : null,
                    userMeta.campaignSet ? "CAMPAIGN" : null,
                    (userMeta.selfExclude && userMeta.selfExclude.active) ? "SELF-EXCLUDED" : null
                ].filter(Boolean).join(", ") || "Active";
                logMessage(`UserMeta fetched for ${userName}.`, "success");
                isConnected = true;
            }
        } catch (e) {
            logMessage(`Initial UserMeta fetch failed: ${e.message}`, "error");
            currentApiKey = null;
            elements.apiKeyInput.value = '';
            showStatus('Failed to connect API. Invalid Key or Network Error.', "error");
            return;
        }
        if (isConnected) {
            try {
                const userBalances = await fetchUserBalances();
                if (userBalances) {
                    let usdtBal = "-", usdtVault = "-";
                    for (const bal of userBalances) {
                        if (bal.available && bal.available.currency && bal.available.currency.toLowerCase() === "usdt") {
                            usdtBal = bal.available.amount;
                        }
                        if (bal.vault && bal.vault.currency && bal.vault.currency.toLowerCase() === "usdt") {
                            usdtVault = bal.vault.amount;
                        }
                    }
                    usdt = usdtBal;
                    if (usdtVault !== "-") usdt += ` (Vault: ${usdtVault})`;
                    logMessage("UserBalances fetched.", "success");
                }
            } catch (e) {
                logMessage(`Error fetching UserBalances: ${e.message}`, "error");
            }
            try {
                const vipFaucetData = await fetchVipFaucetData();
                if (vipFaucetData) {
                    if (vipFaucetData.vipInfo && vipFaucetData.vipInfo.host) {
                        const h = vipFaucetData.vipInfo.host;
                        viphost = (h.name ? h.name : "-") +
                            (h.contactHandle ? ` (${h.contactHandle})` : "") +
                            (h.contactLink ? ` [${h.contactLink}]` : "");
                    }
                    if (vipFaucetData.reload) {
                        const f = vipFaucetData.reload;
                        faucet = (f.active ? "Active" : "Inactive") + `, Value: ${f.value}`;
                    }
                    logMessage("VIP/Faucet data fetched.", "success");
                }
            } catch (e) { logMessage(`Error fetching VIP/Faucet data: ${e.message}`, "error"); }
            elements.userId.textContent = userId;
            elements.userName.textContent = userName;
            elements.userStatus.textContent = userStatus;
            elements.userCredits.textContent = usdt;
            elements.vipHost.textContent = "VIP Host: " + viphost;
            elements.faucet.textContent = "Faucet: " + faucet;
            // Add account if not exists
            if (userName && !accounts.some(acc => acc.name === userName)) {
                accounts.push({ name: userName, apiKey: currentApiKey });
                saveState();
                renderAccounts();
                logMessage(`Account '${userName}' added to list.`, "info");
            }
            showStatus('API Connected!', "success");
            logMessage(`Connected as ${userName}.`, "info");
            elements.apiKeyInput.value = '';
        }
    }
    async function handlePasteClipboard() {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                elements.apiKeyInput.value = text.trim();
                showStatus('API Key pasted from clipboard.', "info");
            } else {
                showStatus('Clipboard is empty.', "error");
            }
        } catch (e) {
            showStatus('Clipboard not accessible or empty. ' + e.message, "error");
            logMessage('Clipboard paste error: ' + e.message, "error");
        }
    }
    async function handleCheckBonusAvailability() {
        if (!currentApiKey) { showStatus('Connect API Key first', 'error'); return; }
        const code = elements.checkBonusCodeInput.value.trim();
        if (!code) { showStatus('Input bonus code!', 'error'); return; }
        const couponType = elements.couponTypeSelect.value;
        showStatus('Checking bonus code...', "info");
        logMessage(`Checking availability for code: '${code}' (Type: ${couponType})...`, "info");
        const query = `query BonusCodeAvailability($code: String!, $couponType: CouponType!) {
            bonusCodeAvailability(code: $code, couponType: $couponType)
        }`;
        const variables = { code, couponType };
        try {
            const data = await callGraphQL(query, variables);
            if (typeof data.bonusCodeAvailability !== "undefined") {
                const isAvailable = data.bonusCodeAvailability;
                showStatus(`Availability: ${isAvailable ? "Available" : "Not Available"}`, isAvailable ? "success" : "error");
                logMessage(`Code '${code}' is ${isAvailable ? "AVAILABLE" : "NOT AVAILABLE"}.`, isAvailable ? "success" : "info");
            } else {
                showStatus('Unexpected response for bonus availability.', "error");
                logMessage('Unexpected bonus availability response.', "error");
            }
        } catch (e) {
            showStatus(`Error checking code: ${e.message}`, "error");
            logMessage(`CheckCode Error: ${e.message}`, "error");
        }
    }
    async function handleClaimBonus() {
        if (!currentApiKey) { showStatus('Connect API Key first', "error"); return; }
        const code = elements.bonusCodeInput.value.trim();
        if (!code) { showStatus('Input bonus code', "error"); return; }
        const claimType = elements.claimTypeSelect.value;
        const turnstileToken = elements.turnstileTokenInput.value.trim() || "DEMO-TOKEN";
        showStatus('Claiming bonus...', "info");
        logMessage(`Attempting to claim bonus '${code}' (${claimType})...`, "info");
        const mutation =
            claimType === "ClaimConditionBonusCode"
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
                        balances { available { amount currency } vault { amount currency } }
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
                        balances { available { amount currency } vault { amount currency } }
                    }
                    redeemed
                }
            }`;
        const variables = { code, currency: "USDT", turnstileToken };
        try {
            const data = await callGraphQL(mutation, variables);
            const dataKey = claimType === "ClaimConditionBonusCode" ? "claimConditionBonusCode" : "claimBonusCode";
            if (data && data[dataKey]) {
                const claimed = data[dataKey];
                showStatus(`Claimed: ${claimed.amount} ${claimed.currency}`, "success");
                logMessage(`CLAIM SUCCESS for '${code}': Amount ${claimed.amount} ${claimed.currency}, Redeemed: ${claimed.redeemed}.`, "success");
                // Update saldo USDT jika balances dikembalikan
                const user = claimed.user;
                if (user && Array.isArray(user.balances)) {
                    let usdtBal = "-", usdtVault = "-";
                    for (const bal of user.balances) {
                        if (bal.available && bal.available.currency && bal.available.currency.toLowerCase() === "usdt") {
                            usdtBal = bal.available.amount;
                        }
                        if (bal.vault && bal.vault.currency && bal.vault.currency.toLowerCase() === "usdt") {
                            usdtVault = bal.vault.amount;
                        }
                    }
                    let usdtAmount = usdtBal;
                    if (usdtVault !== "-") usdtAmount += ` (Vault: ${usdtVault})`;
                    elements.userCredits.textContent = usdtAmount;
                }
            } else {
                showStatus('Unknown error or response on bonus claim.', "error");
                logMessage('Unknown bonus claim response.', "error");
            }
        } catch (e) {
            showStatus(`Error on bonus claim: ${e.message}`, "error");
            logMessage(`CLAIM ERROR for '${code}': ${e.message}`, "error");
        }
    }

    // --- Init & UI inject
    function initialize() {
        if (typeof GM_addStyle !== 'undefined') GM_addStyle(`.status.success{color:#baff84}.status.error{color:#ff6767} /*...dst, gunakan CSS seperti contoh sebelumnya untuk styling lengkap*/`);
        elements.root = document.createElement('div');
        elements.root.id = "fb-claimer-root";
        elements.root.innerHTML = `
            <div id="fb-claimer-modal">
                <div class="popup-inner">
                    <h3 style="margin:0 0 18px 0; color:#FCF259;">Enter Password</h3>
                    <input type="password" id="fb-loginPassword" maxlength="100" placeholder="Enter Password">
                    <button id="fb-loginBtn">Login</button>
                    <div id="fb-loginErr"></div>
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
                        <div>User ID: <span id="fb-userId">-</span></div>
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
                        <div class="api-warning">
                            Please be aware that maintaining multiple accounts may pose risks.
                        </div>
                    </div>
                </div>
                <div class="fb-claimer-panel">
                    <div class="panel-title">BONUS & CLAIM</div>
                    <div class="panel-content">
                        <div class="checkcode-form">
                            <input type="text" id="fb-checkBonusCode" maxlength="50" placeholder="Check Bonus Code Availability">
                            <select id="fb-couponType">
                                <option value="BONUS">BONUS</option>
                                <option value="COUPON">COUPON</option>
                            </select>
                            <button id="fb-btnCheckBonus">Check</button>
                        </div>
                        <div class="claim-form" style="margin-top:15px;">
                            <input type="text" id="fb-bonusCodeInput" maxlength="50" placeholder="Enter Bonus Code">
                            <select id="fb-claimType">
                                <option value="ClaimBonusCode">Normal</option>
                                <option value="ClaimConditionBonusCode">Condition</option>
                            </select>
                            <button id="fb-claimBonus">Claim Bonus</button>
                        </div>
                        <div style="margin-top:15px; display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                            <label style="white-space:nowrap;">Turnstile Token:</label>
                            <input type="text" id="fb-turnstileToken" style="flex:1; min-width:180px;" placeholder="DEMO-TOKEN or real">
                        </div>
                        <div class="status" id="fb-status"></div>
                        <div class="log-box" id="fb-log"></div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(elements.root);
        elements.modal = document.getElementById('fb-claimer-modal');
        elements.loginPassword = document.getElementById('fb-loginPassword');
        elements.loginBtn = document.getElementById('fb-loginBtn');
        elements.loginErr = document.getElementById('fb-loginErr');
        elements.mainContent = document.getElementById('fb-claimer-main');
        elements.userId = document.getElementById('fb-userId');
        elements.userName = document.getElementById('fb-userName');
        elements.userStatus = document.getElementById('fb-userStatus');
        elements.userCredits = document.getElementById('fb-userCredits');
        elements.vipHost = document.getElementById('fb-viphost');
        elements.faucet = document.getElementById('fb-faucet');
        elements.accountsList = document.getElementById('fb-accounts');
        elements.apiKeyInput = document.getElementById('fb-apiKeyInput');
        elements.pasteClipboardBtn = document.getElementById('fb-pasteClipboard');
        elements.connectApiBtn = document.getElementById('fb-connectAPI');
        elements.checkBonusCodeInput = document.getElementById('fb-checkBonusCode');
        elements.couponTypeSelect = document.getElementById('fb-couponType');
        elements.btnCheckBonus = document.getElementById('fb-btnCheckBonus');
        elements.bonusCodeInput = document.getElementById('fb-bonusCodeInput');
        elements.claimTypeSelect = document.getElementById('fb-claimType');
        elements.claimBonusBtn = document.getElementById('fb-claimBonus');
        elements.turnstileTokenInput = document.getElementById('fb-turnstileToken');
        elements.statusDisplay = document.getElementById('fb-status');
        elements.logBox = document.getElementById('fb-log');
        elements.loginBtn.onclick = handleLogin;
        elements.loginPassword.addEventListener('keydown', (e) => {
            if (e.key === "Enter") handleLogin();
        });
        elements.connectApiBtn.onclick = handleConnectAPI;
        elements.pasteClipboardBtn.onclick = handlePasteClipboard;
        elements.btnCheckBonus.onclick = handleCheckBonusAvailability;
        elements.claimBonusBtn.onclick = handleClaimBonus;
        elements.bonusCodeInput.addEventListener('keydown', (e) => {
            if (e.key === "Enter") handleClaimBonus();
        });
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();
