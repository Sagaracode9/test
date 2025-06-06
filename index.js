// ==UserScript==
// @name         saBot Claimer (Multi-Account & Turnstile Placeholder)
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Manage multiple Stake.com accounts, check, and claim bonuses with improved UI and Turnstile placeholder.
// @author       Gemini AI
// @match        https://stake.com/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_info
// @grant        unsafeWindow // Diperlukan untuk mengakses window.crypto untuk generate random UUID
// ==/UserScript==

(function() {
    'use strict';

    // --- Configuration & Constants ---
    const API_URL = "https://stake.com/_api/graphql";
    const AUTH_PASSWORD = "sagara321"; // WARNING: GANTI DENGAN PASSWORD KUAT ANDA!
    const LOCAL_STORAGE_KEY_ACCOUNTS = "fbClaimer_accounts";
    const LOCAL_STORAGE_KEY_CURRENT_API_KEY_IDX = "fbClaimer_currentApiKeyIndex"; // Index akun yang sedang aktif

    // --- DOM Element References (Akan diisi setelah HTML di-render) ---
    const elements = {};

    // --- State Variables ---
    // accounts: Array of { name: string, apiKey: string }
    let accounts = [];
    let currentAccountIndex = -1; // Index akun yang sedang aktif di `accounts` array

    // --- Helper Functions ---
    /**
     * Menampilkan pesan status di UI.
     * @param {string} msg - Pesan yang akan ditampilkan.
     * @param {string} [type=null] - Tipe pesan ('success', 'error', 'info'). Akan ditambahkan sebagai class CSS.
     */
    function showStatus(msg, type = null) {
        elements.statusDisplay.textContent = msg;
        elements.statusDisplay.className = "status" + (type ? (" " + type) : "");
    }

    /**
     * Menambahkan pesan ke kotak log.
     * @param {string} msg - Pesan yang akan dicatat.
     * @param {string} [type='info'] - Tipe pesan ('success', 'error', 'info'). Digunakan untuk styling.
     */
    function logMessage(msg, type = "info") {
        const time = new Date().toLocaleTimeString();
        const msgDiv = document.createElement('div');
        msgDiv.innerHTML = `<div>${time}: <span class="${type}">${msg}</span></div>`;
        elements.logBox.appendChild(msgDiv);
        elements.logBox.scrollTop = elements.logBox.scrollHeight; // Auto-scroll ke bawah
    }

    /**
     * Memuat data akun dan API Key dari penyimpanan lokal.
     * Menggunakan GM_getValue untuk Tampermonkey/Greasemonkey.
     */
    function loadState() {
        let storedAccounts = GM_getValue(LOCAL_STORAGE_KEY_ACCOUNTS, '[]');
        try {
            accounts = JSON.parse(storedAccounts);
        } catch (e) {
            logMessage("Failed to parse stored accounts. Resetting.", "error");
            accounts = [];
        }

        currentAccountIndex = GM_getValue(LOCAL_STORAGE_KEY_CURRENT_API_KEY_IDX, -1);
        if (currentAccountIndex >= accounts.length || currentAccountIndex < 0) {
            currentAccountIndex = accounts.length > 0 ? 0 : -1; // Set ke akun pertama jika ada, atau -1
        }
        
        renderAccountSelector(); // Render dropdown akun
        selectAccount(currentAccountIndex); // Pilih akun yang terakhir aktif
    }

    /**
     * Menyimpan data akun dan API Key ke penyimpanan lokal.
     * Menggunakan GM_setValue untuk Tampermonkey/Greasemonkey.
     */
    function saveState() {
        GM_setValue(LOCAL_STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
        GM_setValue(LOCAL_STORAGE_KEY_CURRENT_API_KEY_IDX, currentAccountIndex);
        logMessage("State saved.", "info");
    }

    /**
     * Menghasilkan UUID random untuk placeholder Turnstile.
     * Ini BUKAN token Turnstile yang valid.
     */
    function generateUUID() {
        // Menggunakan API Web Crypto yang lebih aman dan benar-benar random
        // Perlu @grant unsafeWindow di Tampermonkey
        try {
            return unsafeWindow.crypto.randomUUID();
        } catch (e) {
            // Fallback untuk lingkungan tanpa window.crypto atau unsafeWindow tidak granted
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }
    }

    /**
     * Mengisi input Turnstile dengan nilai placeholder random.
     */
    function setRandomTurnstilePlaceholder() {
        elements.turnstileTokenInput.value = `DEMO-TOKEN-${generateUUID()}`;
    }

    /**
     * Memperbarui tampilan daftar akun di UI dan selector.
     */
    function renderAccountSelector() {
        elements.accountsList.innerHTML = "";
        elements.accountSelector.innerHTML = ""; // Clear existing options

        if (accounts.length === 0) {
            elements.accountsList.innerHTML = "<div style='color:#a0a0a0; font-size:0.9em; text-align:center; padding:10px 0;'>No accounts connected yet.</div>";
            elements.accountSelector.innerHTML = "<option value='-1'>No accounts</option>";
            elements.accountSelector.disabled = true;
            elements.claimBonusBtn.disabled = true; // Disable claim if no account
            elements.btnCheckBonus.disabled = true; // Disable check if no account
            // Reset UI info
            elements.userId.textContent = "-";
            elements.userName.textContent = "-";
            elements.userStatus.textContent = "N/A";
            elements.userCredits.textContent = "-";
            elements.vipHost.textContent = "VIP Host: N/A";
            elements.faucet.textContent = "Faucet: N/A";
            return;
        }

        elements.accountSelector.disabled = false;
        elements.claimBonusBtn.disabled = false;
        elements.btnCheckBonus.disabled = false;

        accounts.forEach((acc, idx) => {
            // Render di Account List
            const div = document.createElement('div');
            div.className = "account-item";
            div.innerHTML = `
                <span class="label">${acc.name}</span>
                <span class="btns">
                    <button title="Set Active" data-idx="${idx}" class="fb-set-active">✅</button>
                    <button title="Delete" data-idx="${idx}" class="fb-del">🗑️</button>
                </span>
            `;
            elements.accountsList.appendChild(div);

            // Render di Account Selector
            const option = document.createElement('option');
            option.value = idx;
            option.textContent = acc.name;
            elements.accountSelector.appendChild(option);
        });

        // Add event listeners after rendering
        elements.accountsList.querySelectorAll('.fb-del').forEach(btn => {
            btn.onclick = function() {
                const indexToDelete = Number(btn.dataset.idx);
                if (confirm(`Are you sure you want to delete account: ${accounts[indexToDelete].name}?`)) {
                    const deletedAccountName = accounts[indexToDelete].name;
                    accounts.splice(indexToDelete, 1);
                    
                    // Adjust currentAccountIndex if deleted account was active
                    if (currentAccountIndex === indexToDelete) {
                        currentAccountIndex = accounts.length > 0 ? 0 : -1;
                    } else if (currentAccountIndex > indexToDelete) {
                        currentAccountIndex--; // Shift index if account before it was deleted
                    }
                    
                    saveState();
                    renderAccountSelector(); // Re-render both lists
                    selectAccount(currentAccountIndex); // Re-select active account
                    logMessage(`Account '${deletedAccountName}' deleted.`, "info");
                }
            };
        });

        elements.accountsList.querySelectorAll('.fb-set-active').forEach(btn => {
            btn.onclick = function() {
                const indexToActivate = Number(btn.dataset.idx);
                selectAccount(indexToActivate);
            };
        });
        
        // Pastikan dropdown menampilkan akun yang aktif
        if (currentAccountIndex !== -1) {
             elements.accountSelector.value = currentAccountIndex;
        }
    }

    /**
     * Memilih akun aktif dari daftar dan memperbarui API Key.
     * @param {number} index - Index akun di array `accounts`.
     */
    function selectAccount(index) {
        if (index >= 0 && index < accounts.length) {
            currentAccountIndex = index;
            currentApiKey = accounts[index].apiKey;
            saveState(); // Simpan index akun aktif
            
            // Perbarui UI info dengan data dari akun yang dipilih (jika tersedia)
            elements.apiKeyInput.value = accounts[index].apiKey; // Tampilkan API key di input
            // Refresh info pengguna dari API untuk akun yang baru dipilih
            handleConnectAPI(false); // Panggil tanpa menyimpan API key lagi
            logMessage(`Switched to account: ${accounts[index].name}`, "info");
        } else {
            currentAccountIndex = -1;
            currentApiKey = null;
            saveState();
            elements.apiKeyInput.value = '';
            logMessage("No account selected.", "info");
             // Reset UI info
            elements.userId.textContent = "-";
            elements.userName.textContent = "-";
            elements.userStatus.textContent = "N/A";
            elements.userCredits.textContent = "-";
            elements.vipHost.textContent = "VIP Host: N/A";
            elements.faucet.textContent = "Faucet: N/A";
        }
        elements.accountSelector.value = currentAccountIndex; // Update dropdown
    }

    /**
     * Melakukan panggilan ke API GraphQL.
     * @param {string} query - String query/mutasi GraphQL.
     * @param {object} [variables={}] - Variabel untuk query/mutasi.
     * @returns {Promise<object>} Data hasil dari API.
     * @throws {Error} Jika ada error dari API atau jaringan.
     */
    async function callGraphQL(query, variables = {}) {
        const headers = {
            "Content-Type": "application/json",
        };
        if (currentApiKey) {
            headers["x-access-token"] = currentApiKey;
        } else {
            throw new Error("No API Key connected. Please connect an account first.");
        }

        try {
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
                throw new Error(json.errors[0].message || "GraphQL error occurred.");
            }
            return json.data;
        } catch (e) {
            throw new Error(`API Error: ${e.message}`);
        }
    }

    // --- API Calls (Using new callGraphQL helper) ---
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
            return data.user ? data.user.balances : null;
        } catch (e) {
            logMessage(`Error fetching UserBalances: ${e.message}`, "error");
            return null;
        }
    }

    async function fetchVipFaucetData() {
        const query = `
            query VipMeta {
                user {
                    vipInfo {
                        host { name contactHandle contactLink email availableDays }
                    }
                    reload: faucet { value active }
                }
            }`;
        try {
            const data = await callGraphQL(query); // No variables in this query
            return data.user || null;
        } catch (e) {
            logMessage(`Error fetching VIP/Faucet data: ${e.message}`, "error");
            return null;
        }
    }

    // --- Event Handlers ---

    /**
     * Handler untuk tombol login.
     */
    function handleLogin() {
        const val = elements.loginPassword.value.trim();
        if (!val) {
            elements.loginErr.textContent = "Password required!";
            return;
        }
        if (val !== AUTH_PASSWORD) {
            elements.loginErr.textContent = "Wrong password!";
            return;
        }
        elements.modal.style.display = "none";
        elements.mainContent.style.display = "";
        loadState(); // Muat data setelah login berhasil
        setRandomTurnstilePlaceholder(); // Generate initial Turnstile placeholder
    }

    /**
     * Handler untuk tombol Connect API.
     * @param {boolean} [saveNewKey=true] - Apakah key baru harus disimpan/diperbarui.
     */
    async function handleConnectAPI(saveNewKey = true) {
        let inputApiKey = elements.apiKeyInput.value.trim();
        let useThisKey = saveNewKey ? inputApiKey : currentApiKey;

        if (!useThisKey) {
            showStatus('API Key required', "error");
            return;
        }
        if (useThisKey.length !== 96) {
            showStatus('API Key must be 96 characters', "error");
            return;
        }

        currentApiKey = useThisKey; // Set global currentApiKey
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
            } else {
                throw new Error("Failed to fetch UserMeta (no user data).");
            }
        } catch (e) {
            logMessage(`Initial UserMeta fetch failed: ${e.message}`, "error");
            showStatus('API connection failed: ' + e.message, "error");
            // Clear API key in UI if this was a new connection attempt
            if (saveNewKey) {
                currentApiKey = null;
                elements.apiKeyInput.value = '';
            }
            return; // Stop further execution if UserMeta fails
        }

        if (isConnected) {
            try {
                const userBalances = await fetchUserBalances();
                if (userBalances && userBalances.available) {
                    if (userBalances.available.currency.toLowerCase() === "usdt") {
                        usdt = userBalances.available.amount;
                    }
                    if (userBalances.vault && userBalances.vault.currency.toLowerCase() === "usdt") {
                        usdt = `${usdt} (Vault: ${userBalances.vault.amount})`;
                    }
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
            } catch (e) {
                logMessage(`Error fetching VIP/Faucet data: ${e.message}`, "error");
            }

            // Update UI
            elements.userId.textContent = userId;
            elements.userName.textContent = userName;
            elements.userStatus.textContent = userStatus;
            elements.userCredits.textContent = usdt;
            elements.vipHost.textContent = "VIP Host: " + viphost;
            elements.faucet.textContent = "Faucet: " + faucet;

            // Add/Update account to list if this was a "Connect" action
            if (saveNewKey && userName) {
                const existingAccountIndex = accounts.findIndex(acc => acc.name === userName);
                if (existingAccountIndex !== -1) {
                    // Update existing account's API key
                    accounts[existingAccountIndex].apiKey = currentApiKey;
                    currentAccountIndex = existingAccountIndex;
                    logMessage(`API Key updated for existing account '${userName}'.`, "info");
                } else {
                    // Add new account
                    accounts.push({ name: userName, apiKey: currentApiKey });
                    currentAccountIndex = accounts.length - 1; // Set this new account as active
                    logMessage(`New account '${userName}' added.`, "info");
                }
                saveState();
                renderAccountSelector(); // Re-render selector and list
                selectAccount(currentAccountIndex); // Ensure the correct account is selected in dropdown
            }

            showStatus('API Connected!', "success");
            logMessage(`Currently active account: ${userName}.`, "info");
            elements.apiKeyInput.value = ''; // Clear input after successful connect/update
        }
    }

    /**
     * Handler untuk tombol Paste from Clipboard.
     */
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

    /**
     * Handler untuk tombol Check Bonus Code Availability.
     */
    async function handleCheckBonusAvailability() {
        if (!currentApiKey) {
            showStatus('Connect API Key first or select an account', 'error');
            return;
        }
        const code = elements.checkBonusCodeInput.value.trim();
        if (!code) {
            showStatus('Input code!', 'error');
            return;
        }
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
                showStatus(statusMessage, isAvailable ? "success" : "error");
                logMessage(`CheckCode: '${code}' is ${isAvailable ? "AVAILABLE" : "NOT AVAILABLE"}.`, isAvailable ? "success" : "info");
            } else {
                showStatus('Unexpected response for bonus availability.', "error");
                logMessage('Unexpected bonus availability response.', "error");
            }
        } catch (e) {
            showStatus(`Error checking code: ${e.message}`, "error");
            logMessage(`CheckCode Error: ${e.message}`, "error");
        }
    }

    /**
     * Handler untuk tombol Claim Bonus.
     */
    async function handleClaimBonus() {
        if (!currentApiKey) {
            showStatus('Connect API Key first or select an account', "error");
            return;
        }
        const code = elements.bonusCodeInput.value.trim();
        if (!code) {
            showStatus('Input bonus code', "error");
            return;
        }
        const type = elements.claimTypeSelect.value;
        const turnstileToken = elements.turnstileTokenInput.value.trim();

        // Regenerate Turnstile token if it's the placeholder, for a new "random" value
        if (turnstileToken.startsWith("DEMO-TOKEN-")) {
            setRandomTurnstilePlaceholder();
            showStatus('Using DEMO Turnstile token. Real claims require valid token!', "error");
            logMessage('WARNING: Using DEMO Turnstile token. Real claims require valid token!', "error");
            return; // Hentikan klaim jika masih menggunakan DEMO-TOKEN
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
        const variables = { code, currency: "USDT", turnstileToken }; // CurrencyEnum biasanya UPPERCASE

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
                    if (user.balances.available && user.balances.available.currency.toLowerCase() === "usdt") {
                        usdtBalance = user.balances.available.amount;
                    }
                    if (user.balances.vault && user.balances.vault.currency.toLowerCase() === "usdt") {
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
            // Generate new placeholder after each claim attempt
            setRandomTurnstilePlaceholder();
        }
    }

    // --- Initialization Function ---
    function initialize() {
        // --- CSS Injection ---
        // Menggunakan GM_addStyle untuk UserScript yang lebih baik
        GM_addStyle(`
            /* Reset dasar dan box-sizing untuk semua elemen di dalam root */
            #fb-claimer-root *, #fb-claimer-root *::before, #fb-claimer-root *::after {
                box-sizing: border-box;
                font-family: 'Fira Mono', monospace;
                transition: all 0.2s ease-in-out; /* Smooth transitions for UI changes */
            }

            /* Root container utama aplikasi */
            #fb-claimer-root {
                all: unset; /* Mengisolasi sepenuhnya dari gaya situs */
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                min-height: 100vh;
                z-index: 99999; /* Pastikan selalu di atas elemen situs */
                background: #151c23; /* Warna latar belakang gelap */
                color: #e0e0e0; /* Warna teks umum yang lebih halus */
                overflow-y: auto; /* Memungkinkan scroll jika konten melebihi tinggi layar */
                padding-bottom: 50px; /* Ruang tambahan di bawah untuk kenyamanan */
            }

            /* Modal (untuk login) */
            #fb-claimer-modal {
                background: rgba(34, 52, 71, 0.95); /* Semi-transparan untuk efek overlay */
                position: fixed;
                left: 0;
                top: 0;
                width: 100vw;
                height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 100000; /* Di atas root utama */
            }
            #fb-claimer-modal .popup-inner {
                background: #253a50; /* Warna latar belakang popup */
                padding: 40px 30px; /* Padding lebih besar */
                border-radius: 15px; /* Sudut lebih melengkung */
                min-width: 300px;
                max-width: 90vw; /* Lebih responsif */
                box-shadow: 0 10px 45px rgba(0, 0, 0, 0.7); /* Bayangan lebih dalam */
                text-align: center;
                border: 1px solid #3a5067; /* Border tipis */
            }
            #fb-loginPassword {
                width: 100%;
                padding: 12px 18px; /* Padding lebih nyaman */
                border-radius: 8px;
                border: 1px solid #3a5067;
                background: #1d2b3c;
                color: #e0e0e0;
                margin-bottom: 20px;
                outline: none;
                font-size: 1em;
            }
            #fb-loginPassword::placeholder {
                color: #92a4b8;
            }
            #fb-loginBtn {
                width: 100%;
                padding: 12px 18px;
                border-radius: 8px;
                border: none;
                background: #2488ff;
                color: #fff;
                font-weight: bold;
                cursor: pointer;
                transition: background 0.2s ease;
                font-size: 1.1em;
            }
            #fb-loginBtn:hover {
                background: #1e70d4;
            }
            #fb-loginErr {
                color: #ff6767;
                min-height: 20px;
                font-size: 0.95em;
                margin-top: 15px;
            }

            /* Header Aplikasi */
            #fb-claimer-header {
                background: #212f3d;
                padding: 18px 32px;
                font-size: 1.8em; /* Ukuran font lebih besar */
                border-radius: 0 0 16px 16px; /* Sudut bawah lebih melengkung */
                display: flex;
                justify-content: space-between;
                align-items: center;
                box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4); /* Bayangan lebih jelas */
                position: sticky; /* Tetap di atas saat di-scroll */
                top: 0;
                z-index: 99;
            }
            #fb-claimer-title {
                font-weight: bold;
                color: #baff84; /* Warna hijau cerah untuk judul */
            }
            #fb-claimer-site {
                font-size: 0.8em; /* Ukuran font sedikit lebih kecil dari sebelumnya */
                color: #fff9;
            }

            /* Main Content Area */
            #fb-claimer-main {
                max-width: 800px; /* Lebar maksimum lebih besar */
                margin: 40px auto 60px auto; /* Margin lebih besar */
                padding: 0 20px; /* Padding samping untuk responsivitas */
            }

            /* Panel umum */
            .fb-claimer-panel {
                background: #223447;
                margin-top: 32px; /* Margin atas lebih besar */
                border-radius: 12px;
                padding: 0; /* Padding diatur di panel-content */
                box-shadow: 0 6px 25px rgba(0, 0, 0, 0.6); /* Bayangan lebih menonjol */
                overflow: hidden;
            }
            .fb-claimer-panel .panel-title {
                background: #2488ff; /* Warna judul panel */
                color: #fff;
                font-weight: bold;
                border-radius: 12px 12px 0 0;
                padding: 15px 28px; /* Padding lebih besar */
                font-size: 1.15em; /* Ukuran font lebih besar */
                letter-spacing: 1.2px; /* Jarak huruf lebih renggang */
                text-transform: uppercase; /* Huruf kapital semua */
            }
            .panel-content {
                padding: 25px 28px; /* Padding yang konsisten di semua sisi */
            }

            /* Info Pengguna */
            .user-info {
                font-size: 1.05em;
            }
            .user-info div {
                margin-bottom: 10px; /* Spasi antar baris */
            }
            .user-info span {
                font-weight: 500;
                color: #baff84;
            }
            .user-status-row {
                font-size: 0.95em;
                color: #ffd54f; /* Warna kuning-oranye */
                margin-top: 8px;
                margin-bottom: 15px !important;
                border-top: 1px solid #3a5067;
                padding-top: 10px;
            }
            .fb-viphost, .fb-faucet {
                font-size: 0.9em; /* Ukuran font sedikit lebih kecil */
                color: #ffe7a4;
                margin-top: 10px;
            }

            /* Daftar Akun Terhubung */
            .account-list {
                margin-bottom: 20px;
            }
            .account-item {
                background: #2d4250;
                border-radius: 10px; /* Sudut lebih melengkung */
                padding: 12px 18px; /* Padding lebih besar */
                margin-bottom: 12px; /* Spasi antar item */
                display: flex;
                align-items: center;
                justify-content: space-between;
                font-size: 1em;
                border: 1px solid #3a5067;
            }
            .account-item .label {
                font-weight: 600;
                color: #f0f0f0;
            }
            .account-item .btns button {
                border: none;
                background: transparent;
                font-size: 1.3em; /* Ukuran ikon lebih besar */
                cursor: pointer;
                margin-left: 10px;
                color: #a0a0a0; /* Warna ikon lebih lembut */
                opacity: 0.8;
                transition: opacity 0.2s ease, transform 0.2s ease;
            }
            .account-item .btns button:hover {
                opacity: 1;
                transform: scale(1.1); /* Efek zoom saat hover */
            }
            .account-item .btns button:active {
                transform: scale(0.95); /* Efek klik */
            }

            /* Form API Key dan Account Selector */
            .api-section-controls {
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
                align-items: center;
                margin-bottom: 15px;
            }
            #fb-accountSelector {
                flex-grow: 1; /* Mengambil ruang yang tersedia */
                min-width: 150px;
            }
            .api-form {
                display: flex;
                gap: 12px; /* Spasi antar elemen form */
                margin-top: 15px;
                flex-wrap: wrap; /* Untuk responsif */
                align-items: stretch; /* Agar tinggi input/button sama */
                width: 100%; /* Pastikan form mengambil 100% lebar */
            }
            .api-form input {
                flex: 1; /* Input mengambil sisa ruang */
                min-width: 200px; /* Minimum width agar tidak terlalu sempit */
            }
            /* Styling umum untuk input teks dan select */
            input[type="text"], input[type="password"], select {
                padding: 12px 18px;
                border-radius: 8px;
                border: 1px solid #3a5067;
                background: #1d2b3c;
                color: #e0e0e0;
                outline: none;
                font-size: 1em;
            }
            input[type="text"]::placeholder, input[type="password"]::placeholder {
                color: #92a4b8;
            }
            /* Styling umum untuk tombol */
            button {
                border-radius: 8px;
                border: none;
                background: #2488ff;
                color: #fff;
                padding: 12px 22px; /* Padding lebih besar */
                font-weight: bold;
                cursor: pointer;
                transition: background 0.2s ease, transform 0.1s ease;
                font-size: 1.05em;
                white-space: nowrap; /* Mencegah teks tombol pecah baris */
            }
            button:hover {
                background: #1e70d4;
            }
            button:active {
                transform: translateY(1px); /* Efek tombol tertekan */
            }
            #fb-pasteClipboard {
                background: #3a5067;
                padding: 12px 18px; /* Padding lebih kecil untuk ikon */
            }
            #fb-pasteClipboard:hover {
                background: #2f4050;
            }

            .api-warning {
                color: #ffe892;
                font-size: 0.9em;
                margin-top: 15px;
                padding: 10px 15px;
                background: rgba(255, 232, 146, 0.1);
                border-left: 4px solid #ffe892;
                border-radius: 4px;
            }

            /* Section title (jika digunakan) */
            .section-title {
                font-weight: bold;
                margin-top: 32px;
                margin-bottom: 15px;
                font-size: 1.2em;
                color: #baff84;
            }

            /* Form Cek Bonus & Klaim */
            .checkcode-form, .claim-form {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-top: 15px;
                flex-wrap: wrap; /* Responsif */
            }
            .checkcode-form input, .claim-form input {
                flex: 1;
                min-width: 180px;
            }
            .claim-form label {
                white-space: nowrap; /* Mencegah "Turnstile Token:" pecah baris */
                color: #e0e0e0;
            }
            #fb-turnstileToken {
                flex: 1;
                min-width: 150px;
            }

            /* Status dan Log Box */
            .status {
                margin: 20px 0 0 0;
                font-size: 1.05em;
                color: #fcf259;
                min-height: 28px; /* Tinggi minimum agar tidak bergeser */
                font-weight: 500;
                text-align: center;
                padding: 5px 0;
            }
            .error {
                color: #ff6767;
            }
            .success {
                color: #baff84;
            }
            .info { /* For log messages */
                color: #a0a0a0;
            }
            .log-box {
                margin-top: 18px;
                background: #162130;
                border-radius: 10px;
                padding: 15px;
                font-size: 0.9em;
                min-height: 100px; /* Tinggi minimum lebih besar */
                max-height: 250px; /* Tinggi maksimum untuk scroll */
                overflow-y: auto;
                border: 1px solid #2d4250;
                color: #a0a0a0;
                line-height: 1.6; /* Spasi baris lebih nyaman */
            }
            .log-box div {
                margin-bottom: 5px;
            }
            .log-box div:last-child {
                margin-bottom: 0;
            }
            .log-box div.error {
                color: #ff8a8a;
            }
            .log-box div.success {
                color: #c8ffb3;
            }

            /* Media Queries untuk responsivitas */
            @media (max-width: 768px) {
                #fb-claimer-header {
                    padding: 15px 20px;
                    font-size: 1.5em;
                }
                #fb-claimer-main {
                    margin: 30px auto 50px auto;
                    padding: 0 10px;
                }
                .fb-claimer-panel .panel-title {
                    padding: 12px 20px;
                    font-size: 1em;
                }
                .panel-content {
                    padding: 15px 20px;
                }
                /* Form elemen akan menumpuk secara vertikal */
                .api-form, .checkcode-form, .claim-form, .api-section-controls {
                    flex-direction: column;
                    align-items: stretch;
                }
                input[type="text"], input[type="password"], select, button {
                    width: 100%;
                    margin-right: 0;
                }
                #fb-pasteClipboard {
                    width: auto; /* Biarkan tombol paste tetap kecil */
                    align-self: flex-end; /* Posisikan di kanan bawah jika di flex-column */
                }
                .claim-form button, .checkcode-form button {
                    margin-top: 10px;
                }
                #fb-turnstileToken {
                    width: 100% !important; /* Force full width on small screens */
                }
            }
        `);
    }

    // --- UI HTML root (Rebuilt HTML structure with new Account Selector) ---
    const root = document.createElement('div');
    root.id = "fb-claimer-root";
    root.innerHTML = `
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
                <div class="panel-title">ACCOUNT MANAGEMENT</div>
                <div class="panel-content">
                    <div class="api-section-controls">
                        <label for="fb-accountSelector" style="white-space:nowrap;">Select Account:</label>
                        <select id="fb-accountSelector">
                            <option value="-1">Loading Accounts...</option>
                        </select>
                        <button id="fb-loadSelectedAccount">Load Account</button>
                    </div>

                    <div id="fb-accounts" class="account-list">
                        </div>
                    <hr style="border-color:#3a5067; margin:20px 0;">
                    
                    <div class="api-form">
                        <input type="password" id="fb-apiKeyInput" maxlength="96" placeholder="Enter New/Existing API Key (96 chars)">
                        <button id="fb-pasteClipboard" title="Paste from clipboard">📋</button>
                        <button id="fb-connectAPI">Connect/Update Account</button>
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
                    <div class="claim-form">
                        <input type="text" id="fb-bonusCodeInput" maxlength="50" placeholder="Enter Bonus Code">
                        <select id="fb-claimType">
                            <option value="ClaimBonusCode">Normal</option>
                            <option value="ClaimConditionBonusCode">Condition</option>
                        </select>
                        <button id="fb-claimBonus">Claim Bonus</button>
                    </div>
                    <div style="margin-top:15px; display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                        <label>Turnstile Token:</label>
                        <input type="text" id="fb-turnstileToken" placeholder="DEMO-TOKEN-xxxxxxxx">
                    </div>
                    <div class="status" id="fb-status"></div>
                    <div class="log-box" id="fb-log"></div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(root);

    // --- Map DOM elements to references after they are added to the DOM ---
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
    elements.accountSelector = document.getElementById('fb-accountSelector'); // New element
    elements.loadSelectedAccountBtn = document.getElementById('fb-loadSelectedAccount'); // New element
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

    // --- Attach Event Listeners ---
    elements.loginBtn.onclick = handleLogin;
    elements.loginPassword.addEventListener('keydown', (e) => {
        if (e.key === "Enter") handleLogin();
    });
    elements.connectApiBtn.onclick = () => handleConnectAPI(true); // Always save/update when clicking "Connect"
    elements.loadSelectedAccountBtn.onclick = () => selectAccount(Number(elements.accountSelector.value));
    elements.accountSelector.onchange = (e) => selectAccount(Number(e.target.value)); // Langsung ganti akun saat dipilih
    elements.pasteClipboardBtn.onclick = handlePasteClipboard;
    elements.btnCheckBonus.onclick = handleCheckBonusAvailability;
    elements.claimBonusBtn.onclick = handleClaimBonus;
    elements.bonusCodeInput.addEventListener('keydown', (e) => {
        if (e.key === "Enter") handleClaimBonus();
    });

    // --- Initialization ---
    // Jalankan fungsi inisialisasi ketika DOM sudah siap
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    function initialize() {
        // Initials loads and settings
        setRandomTurnstilePlaceholder(); // Generate a placeholder on load
        // Initial state load is now called after successful login
    }
})();
