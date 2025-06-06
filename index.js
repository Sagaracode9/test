// ==UserScript==
// @name         saBot Claimer Modern UI Bootstrap (Rebuild Final)
// @namespace    http://tampermonkey.net/
// @version      3.1
// @description  Modern multi-account Stake bonus claimer with Bootstrap 5 UI, removable login, and scrollable content.
// @author       Gemini AI
// @match        https://stake.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_addStyle
// @grant        unsafeWindow // Diperlukan untuk window.crypto.randomUUID()
// ==/UserScript==

(function() {
    'use strict';

    // --- Configuration & Constants ---
    const API_URL = "https://stake.com/_api/graphql";
    const AUTH_PASSWORD = "sagara321"; // WARNING: GANTI DENGAN PASSWORD KUAT ANDA!
    const LS_ACCOUNTS = "sb_accs"; // Local Storage Key for accounts
    const LS_LAST_ACTIVE_API_KEY = "sb_last_active_key"; // To remember last active API key

    // --- DOM Element References ---
    const elements = {};

    // --- State Variables ---
    let accounts = []; // Array of { name: string, apiKey: string }
    let activeApiKey = null; // API Key of the currently active account

    // --- Helper Functions ---

    /**
     * Injeksi Bootstrap 5.3 CDN jika belum ada.
     * Menggunakan method DOM langsung agar lebih cepat termuat.
     */
    function injectBootstrap() {
        if (!document.getElementById("bs-claimer-bootstrap-css")) {
            const link = document.createElement("link");
            link.id = "bs-claimer-bootstrap-css";
            link.rel = "stylesheet";
            link.href = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css";
            document.head.appendChild(link);
        }
        if (!document.getElementById("bs-claimer-bootstrap-js")) {
            const script = document.createElement("script");
            script.id = "bs-claimer-bootstrap-js";
            script.src = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js";
            document.body.appendChild(script);
        }
    }

    /**
     * Menampilkan pesan status di UI.
     * @param {string} msg - Pesan yang akan ditampilkan.
     * @param {string} [type=null] - Tipe pesan ('success', 'error', 'info'). Sesuai class Bootstrap.
     */
    function showStatus(msg, type = null) {
        const s = elements.statusDisplay;
        s.innerHTML = msg;
        s.className = `alert py-2 px-3 mb-1 small ${type === "success" ? "alert-success" : type === "error" ? "alert-danger" : "alert-info"}`;
        s.style.display = msg ? "" : "none";
    }

    /**
     * Menambahkan pesan ke kotak log.
     * @param {string} msg - Pesan yang akan dicatat.
     * @param {string} [type='info'] - Tipe pesan ('success', 'error', 'info').
     */
    function logMessage(msg, type = "info") {
        const logDiv = elements.logBox;
        // Menggunakan Bootstrap text colors
        const typeClass = type === "success" ? "text-success" : type === "error" ? "text-danger" : "text-light";
        logDiv.innerHTML += `<div>${new Date().toLocaleTimeString()}: <span class="${typeClass}">${msg}</span></div>`;
        logDiv.scrollTop = logDiv.scrollHeight;
    }

    /**
     * Memuat akun dari GM_setValue.
     */
    function loadAccounts() {
        try {
            accounts = JSON.parse(GM_getValue(LS_ACCOUNTS, "[]"));
        } catch (e) {
            logMessage("Error loading accounts from storage: " + e.message, "error");
            accounts = [];
        }
        const lastApiKey = GM_getValue(LS_LAST_ACTIVE_API_KEY, null);
        if (lastApiKey) {
            const foundAccount = accounts.find(acc => acc.apiKey === lastApiKey);
            if (foundAccount) {
                activeApiKey = lastApiKey;
                logMessage(`Loaded last active API Key for ${foundAccount.name}.`, "info");
                // Langsung update UI dengan info akun ini
                updateUserInfo(foundAccount.apiKey);
            }
        }
        renderAccounts();
    }

    /**
     * Menyimpan akun ke GM_setValue.
     */
    function saveAccounts() {
        GM_setValue(LS_ACCOUNTS, JSON.stringify(accounts));
        if (activeApiKey) {
            GM_setValue(LS_LAST_ACTIVE_API_KEY, activeApiKey);
        } else {
            GM_deleteValue(LS_LAST_ACTIVE_API_KEY);
        }
    }

    /**
     * Merender daftar akun di UI.
     */
    function renderAccounts() {
        const wrap = elements.accountsList;
        wrap.innerHTML = "";
        if (accounts.length === 0) {
            wrap.innerHTML = `<div class="text-muted small py-2">No accounts connected yet.</div>`;
        }
        accounts.forEach((acc, idx) => {
            const isActive = activeApiKey && acc.apiKey === activeApiKey;
            const div = document.createElement('div');
            div.className = `d-flex justify-content-between align-items-center py-2 px-3 mb-2 border rounded ${isActive ? 'bg-success bg-opacity-10 border-success' : 'bg-secondary bg-opacity-10 border-secondary'}`;
            div.innerHTML = `
                <span class="fw-semibold ${isActive ? 'text-success' : 'text-info'}">${acc.name || "(Unnamed)"}</span>
                <div>
                    ${!isActive ? `<button class="btn btn-sm btn-outline-primary me-2 load-account-btn" data-api-key="${acc.apiKey}">Load</button>` : `<span class="badge bg-success me-2">Active</span>`}
                    <button class="btn btn-sm btn-danger delete-account-btn" data-idx="${idx}">🗑️</button>
                </div>
            `;
            wrap.appendChild(div);
        });

        wrap.querySelectorAll('.delete-account-btn').forEach(btn => {
            btn.onclick = function() {
                const i = Number(btn.dataset.idx);
                if (confirm(`Are you sure you want to delete account: ${accounts[i].name || "(Unnamed)"}?`)) {
                    // Jika akun yang dihapus adalah akun aktif, reset activeApiKey
                    if (accounts[i].apiKey === activeApiKey) {
                        activeApiKey = null;
                        elements.userId.textContent = "-";
                        elements.userName.textContent = "-";
                        elements.userStatus.textContent = "";
                        elements.userCredits.textContent = "-";
                        elements.vipHost.textContent = "";
                        elements.faucet.textContent = "";
                        showStatus('Active account disconnected.', 'info');
                    }
                    accounts.splice(i, 1);
                    saveAccounts();
                    renderAccounts();
                    logMessage("Account deleted.", "info");
                }
            };
        });

        wrap.querySelectorAll('.load-account-btn').forEach(btn => {
            btn.onclick = function() {
                activeApiKey = btn.dataset.apiKey;
                saveAccounts(); // Simpan API key yang baru aktif
                showStatus('Loading account data...', 'info');
                updateUserInfo(activeApiKey);
                renderAccounts(); // Re-render untuk update status active
            };
        });
    }

    /**
     * Menghasilkan token mirip Turnstile secara acak untuk placeholder.
     * PENTING: Ini BUKAN token Turnstile yang valid untuk klaim nyata.
     */
    function randTurnstileToken() {
        try {
            // Prefer window.crypto.randomUUID if available for better randomness
            return `0.${unsafeWindow.crypto.randomUUID().replace(/-/g, '')}${Math.random().toString(36).substring(2, 15)}`;
        } catch (e) {
            // Fallback if window.crypto is not available
            const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
            let token = "0.";
            for(let i=0; i<190; i++) token += charset[Math.floor(Math.random()*charset.length)];
            return token;
        }
    }

    /**
     * Melakukan panggilan ke API GraphQL.
     * @param {string} query - String query/mutasi GraphQL.
     * @param {object} [variables={}] - Variabel untuk query/mutasi.
     * @returns {Promise<object>} Data hasil dari API.
     * @throws {Error} Jika ada error dari API atau jaringan.
     */
    async function callGraphQL(query, variables = {}) {
        if (!activeApiKey) {
            throw new Error("No API Key connected. Please connect an account first.");
        }
        try {
            const res = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-access-token": activeApiKey },
                body: JSON.stringify({ query, variables })
            });

            if (!res.ok) {
                const errorBody = await res.json().catch(() => ({})); // Try to parse JSON error
                throw new Error(`HTTP Error: ${res.status} ${res.statusText}. Detail: ${errorBody.message || JSON.stringify(errorBody) || 'No further details.'}`);
            }

            const json = await res.json();
            if (json.errors && json.errors.length > 0) {
                throw new Error(json.errors[0].message || "GraphQL error occurred.");
            }
            return json.data;
        } catch (e) {
            logMessage(`API Call Error: ${e.message}`, "error");
            throw new Error(`Failed to communicate with API: ${e.message}`);
        }
    }

    /**
     * Memperbarui info pengguna di UI berdasarkan API Key yang aktif.
     * @param {string} apiKeyToUse - API Key yang akan digunakan untuk fetch data.
     */
    async function updateUserInfo(apiKeyToUse) {
        activeApiKey = apiKeyToUse; // Pastikan global activeApiKey terupdate
        let userId = "-", userName = "-", userStatus = "", usdt = "-", viphost = "-", faucet = "-";

        elements.userId.textContent = "-";
        elements.userName.textContent = "-";
        elements.userStatus.textContent = "";
        elements.userCredits.textContent = "-";
        elements.vipHost.textContent = "";
        elements.faucet.textContent = "";
        showStatus('Fetching user data...', 'info');

        try {
            // UserMeta
            const userMetaQuery = `query UserMeta($name: String, $signupCode: Boolean = false) {
                user(name: $name) {
                    id name isMuted isRainproof isBanned createdAt campaignSet
                    selfExclude { id status active createdAt expireAt }
                    signupCode @include(if: $signupCode) { id code { id code } }
                }
            }`;
            const userMetaData = await callGraphQL(userMetaQuery, { name: null, signupCode: false });
            if (userMetaData && userMetaData.user) {
                const u = userMetaData.user;
                userId = u.id || "-";
                userName = u.name || "-";
                userStatus = [
                    u.isBanned ? "BANNED" : null,
                    u.isMuted ? "MUTED" : null,
                    u.isRainproof ? "RAINPROOF" : null,
                    u.campaignSet ? "CAMPAIGN" : null,
                    (u.selfExclude && u.selfExclude.active) ? "SELF-EXCLUDED" : null
                ].filter(Boolean).join(", ") || "Active";
                logMessage(`UserMeta fetched for ${userName}.`, "info");
            } else {
                throw new Error("Failed to get user meta data.");
            }

            // UserBalances
            const userBalancesQuery = `query UserBalances { user { id balances { available { amount currency } vault { amount currency } } } }`;
            const userBalancesData = await callGraphQL(userBalancesQuery);
            if (userBalancesData && userBalancesData.user && userBalancesData.user.balances) {
                const bal = userBalancesData.user.balances;
                if (bal.available && bal.available.currency?.toLowerCase() === "usdt") usdt = bal.available.amount;
                if (bal.vault && bal.vault.currency?.toLowerCase() === "usdt") usdt += ` (Vault: ${bal.vault.amount})`;
                logMessage("UserBalances fetched.", "info");
            }

            // VipMeta / Faucet
            const vipMetaQuery = `query VipMeta {
                user {
                    vipInfo { host { name contactHandle contactLink email availableDays } }
                    reload: faucet { value active }
                }
            }`;
            const vipMetaData = await callGraphQL(vipMetaQuery);
            if (vipMetaData && vipMetaData.user) {
                if (vipMetaData.user.vipInfo && vipMetaData.user.vipInfo.host) {
                    const h = vipMetaData.user.vipInfo.host;
                    viphost = (h.name ? h.name : "-") +
                        (h.contactHandle ? " (" + h.contactHandle + ")" : "") +
                        (h.contactLink ? " [" + h.contactLink + "]" : "");
                }
                if (vipMetaData.user.reload) {
                    const f = vipMetaData.user.reload;
                    faucet = (f.active ? "Active" : "Inactive") + ", Value: " + f.value;
                }
                logMessage("VIP/Faucet data fetched.", "info");
            }

            // Update UI
            elements.userId.textContent = userId;
            elements.userName.textContent = userName;
            elements.userStatus.textContent = userStatus;
            elements.userCredits.textContent = usdt;
            elements.vipHost.textContent = "VIP Host: " + viphost;
            elements.faucet.textContent = "Faucet: " + faucet;
            showStatus('User data loaded successfully!', "success");
        } catch (e) {
            showStatus('Failed to load user data: ' + e.message, "error");
            logMessage(`Failed to load user data for API Key: ${e.message}`, "error");
            // Clear UI on error
            elements.userId.textContent = "-";
            elements.userName.textContent = "-";
            elements.userStatus.textContent = "Error";
            elements.userCredits.textContent = "-";
            elements.vipHost.textContent = "Error";
            elements.faucet.textContent = "Error";
            activeApiKey = null; // Invalidate current API key
            saveAccounts(); // Save state with null activeApiKey
            renderAccounts(); // Re-render to show no active account
        }
    }


    // --- Event Handlers ---

    /**
     * Handler untuk tombol login.
     */
    function handleLogin() {
        const val = elements.loginPassword.value.trim();
        if (!val) return elements.loginErr.textContent = "Password required!";
        if (val !== AUTH_PASSWORD) return elements.loginErr.textContent = "Wrong password!";

        elements.modal.classList.remove('d-block');
        elements.modal.classList.add('d-none'); // Hide modal completely
        elements.modal.setAttribute('aria-hidden', 'true');
        elements.mainContent.style.display = ""; // Show main content
        loadAccounts(); // Load accounts after successful login
        elements.turnstileTokenInput.value = randTurnstileToken(); // Generate initial Turnstile token
    }

    /**
     * Handler untuk tombol Connect/Update API Key.
     */
    document.getElementById('fb-connectAPI').onclick = async function() {
        const inputApiKey = elements.apiKeyInput.value.trim();
        if (!inputApiKey) return showStatus('API Key required', "error");
        if (inputApiKey.length !== 96) return showStatus('API Key must be 96 chars', "error");

        const tempApiKey = inputApiKey; // Use temp key for initial check
        let fetchedUserName = null;

        showStatus('Verifying API Key...', "info");
        logMessage("Attempting to verify API Key...", "info");

        try {
            const userMetaQuery = `query UserMeta { user { name } }`; // Minimal query for name
            const res = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-access-token": tempApiKey },
                body: JSON.stringify({ query: userMetaQuery })
            });
            const json = await res.json();

            if (json.data && json.data.user && json.data.user.name) {
                fetchedUserName = json.data.user.name;
                logMessage(`API Key valid for user: ${fetchedUserName}.`, "success");
            } else if (json.errors && json.errors.length) {
                throw new Error(json.errors[0].message);
            } else {
                throw new Error("Failed to retrieve user name with provided API Key.");
            }
        } catch (e) {
            showStatus('API Key verification failed: ' + e.message, "error");
            logMessage(`API Key verification failed: ${e.message}`, "error");
            elements.apiKeyInput.value = '';
            return;
        }

        // If verification successful
        const existingAccountIndex = accounts.findIndex(acc => acc.name === fetchedUserName);
        if (existingAccountIndex !== -1) {
            // Update existing account's API key
            accounts[existingAccountIndex].apiKey = tempApiKey;
            logMessage(`API Key updated for existing account '${fetchedUserName}'.`, "info");
        } else {
            // Add new account
            accounts.push({ name: fetchedUserName, apiKey: tempApiKey });
            logMessage(`New account '${fetchedUserName}' added.`, "info");
        }
        activeApiKey = tempApiKey; // Set as active
        saveAccounts();
        renderAccounts();
        updateUserInfo(activeApiKey); // Reload full user info
        elements.apiKeyInput.value = ''; // Clear input
        showStatus('Account connected/updated!', "success");
    };


    document.getElementById('fb-pasteClipboard').onclick = async function() {
        try {
            const text = await navigator.clipboard.readText();
            elements.apiKeyInput.value = text || '';
            if (text) {
                showStatus('API Key pasted from clipboard.', "info");
            } else {
                showStatus('Clipboard is empty.', "warning");
            }
        } catch (e) {
            showStatus('Clipboard not accessible: ' + e.message, "error");
            logMessage('Clipboard paste error: ' + e.message, "error");
        }
    };

    /**
     * Handler untuk tombol Check Bonus Code Availability.
     */
    document.getElementById('fb-btnCheckBonus').onclick = async function() {
        if (!activeApiKey) return showStatus('Connect an API Key first or load an account.', 'error');
        const code = elements.checkBonusCodeInput.value.trim();
        if (!code) return showStatus('Input code!', 'error');
        const couponType = elements.couponTypeSelect.value.toUpperCase(); // Ensure uppercase for ENUM

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
                const statusMessage = `Availability: ${isAvailable ? "Available" : "Not Available"}`;
                showStatus(statusMessage, isAvailable ? "success" : "danger"); // danger for not available
                logMessage(`Code '${code}' is ${isAvailable ? "AVAILABLE" : "NOT AVAILABLE"}.`, isAvailable ? "success" : "error");
            } else {
                showStatus('Unexpected response for bonus availability.', "error");
                logMessage('Unexpected bonus availability response.', "error");
            }
        } catch (e) {
            showStatus(`Error checking code: ${e.message}`, "error");
        }
    };

    /**
     * Handler untuk tombol Claim Bonus.
     */
    document.getElementById('fb-claimBonus').onclick = async function() {
        if (!activeApiKey) return showStatus('Connect an API Key first or load an account.', "error");
        const code = elements.bonusCodeInput.value.trim();
        if (!code) return showStatus('Input bonus code', "error");
        const type = elements.claimTypeSelect.value;
        let turnstileToken = elements.turnstileTokenInput.value.trim();

        if (!turnstileToken || turnstileToken.startsWith("0.")) { // Assume "0." is start of random token
            turnstileToken = randTurnstileToken();
            elements.turnstileTokenInput.value = turnstileToken; // Update UI with new random token
            showStatus('WARNING: Using generated Turnstile token. Real claims usually fail without valid token from widget!', "warning");
            logMessage('WARNING: Using GENERATED Turnstile token. Real claims usually fail without valid token from widget!', "warning");
            // return; // Uncomment this if you want to strictly prevent claims with generated token
        }
        
        showStatus('Claiming bonus...', "info");
        logMessage(`Attempting to claim bonus: '${code}' (Type: ${type})...`, "info");

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
            const dataKey = type === "ClaimConditionBonusCode" ? "claimConditionBonusCode" : "claimBonusCode";

            if (data && data[dataKey]) {
                const claimed = data[dataKey];
                showStatus(`Claimed: ${claimed.amount} ${claimed.currency}`, "success");
                logMessage(`CLAIM SUCCESS: '${code}' - Amount: ${claimed.amount} ${claimed.currency}, Redeemed: ${claimed.redeemed}.`, "success");

                const user = claimed.user;
                if (user && user.balances) {
                    let usdtBalance = "-";
                    if (user.balances.available && user.balances.available.currency?.toLowerCase() === "usdt") {
                        usdtBalance = user.balances.available.amount;
                    }
                    if (user.balances.vault && user.balances.vault.currency?.toLowerCase() === "usdt") {
                        usdtBalance = `${usdtBalance} (Vault: ${user.balances.vault.amount})`;
                    }
                    elements.userCredits.textContent = usdtBalance;
                }
            } else {
                showStatus('Unknown error or response on bonus claim.', "error");
                logMessage('Unknown bonus claim response.', "error");
            }
        } catch (e) {
            showStatus(`Error on bonus claim: ${e.message}`, "error");
            logMessage(`CLAIM ERROR: '${code}' - ${e.message}`, "error");
        } finally {
            // Generate a new random token for the next claim attempt
            elements.turnstileTokenInput.value = randTurnstileToken();
        }
    };
    elements.bonusCodeInput.addEventListener('keydown', function(e) {
        if (e.key === "Enter") elements.claimBonusBtn.click();
    });

    // --- Initialization ---
    function initialize() {
        injectBootstrap(); // Ensure Bootstrap is loaded

        // Map DOM elements to references
        elements.modal = document.getElementById('fb-claimer-modal');
        elements.loginPassword = document.getElementById('fb-loginPassword');
        elements.loginBtn = document.getElementById('fb-loginBtn');
        elements.loginErr = document.getElementById('fb-loginErr');
        elements.mainContent = document.getElementById('fb-claimer-panel-main'); // Changed ID
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

        // Check if already logged in (e.g., from previous session)
        // If AUTH_PASSWORD is 'sagara321', this simple check may not be secure for production.
        // For development, we can auto-hide the login if it's already shown.
        // This is a simplified check assuming if the main content is meant to be visible.
        // For real persistence, you might store a login state in GM_setValue.
        // For now, let's assume login is always needed until explicit login.

        // Initial setup for the Turnstile token input
        elements.turnstileTokenInput.value = randTurnstileToken(); // Generate initial token

        // Attach Login Event Listener
        elements.loginBtn.onclick = handleLogin;
        elements.loginPassword.addEventListener('keydown', function(e) {
            if (e.key === "Enter") elements.loginBtn.click();
        });
    }

    // Run initialization when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();
