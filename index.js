// ==UserScript==
// @name         saBot Claimer (Rebuild)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  A user script to manage accounts, check, and claim bonuses on Stake.com via GraphQL API.
// @author       Gemini AI (Rebuild based on user's code)
// @match        https://stake.com/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_info
// ==/UserScript==

(function() {
    'use strict';

    // --- Configuration & Constants ---
    // URL Endpoint GraphQL Stake.com
    const API_URL = "https://stake.com/_api/graphql";
    // Password untuk login ke UI tool ini (GANTI DENGAN PASSWORD ANDA YANG LEBIH SULIT!)
    // PERHATIAN: Password di hardcode tidak aman untuk aplikasi produksi.
    const AUTH_PASSWORD = "sagara321"; // <--- GANTI INI!
    
    // Kunci untuk penyimpanan data di localStorage atau GM_setValue (Tampermonkey)
    const LOCAL_STORAGE_KEY_ACCOUNTS = "fbClaimer_accounts";
    const LOCAL_STORAGE_KEY_API_KEY = "fbClaimer_apiKey"; // Untuk persistensi API Key

    // --- DOM Element References (Akan diisi setelah HTML di-render) ---
    const elements = {};

    // --- State Variables ---
    let accounts = [];
    let currentApiKey = null;

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
        msgDiv.textContent = `${time}: ${msg}`;
        msgDiv.classList.add(type);
        elements.logBox.appendChild(msgDiv);
        elements.logBox.scrollTop = elements.logBox.scrollHeight; // Auto-scroll ke bawah
    }

    /**
     * Memuat data akun dan API Key dari penyimpanan lokal.
     * Menggunakan GM_getValue untuk Tampermonkey/Greasemonkey atau localStorage sebagai fallback.
     */
    function loadState() {
        let storedAccounts = GM_getValue(LOCAL_STORAGE_KEY_ACCOUNTS, null);
        if (storedAccounts) {
            try {
                accounts = JSON.parse(storedAccounts);
            } catch (e) {
                logMessage("Failed to parse stored accounts. Resetting.", "error");
                accounts = [];
            }
        }

        currentApiKey = GM_getValue(LOCAL_STORAGE_KEY_API_KEY, null);
        if (currentApiKey) {
            elements.apiKeyInput.value = currentApiKey; // Menampilkan API Key di input jika ada
            logMessage("Loaded API Key from storage.", "info");
        }
        renderAccounts(); // Render daftar akun setelah dimuat
    }

    /**
     * Menyimpan data akun dan API Key ke penyimpanan lokal.
     * Menggunakan GM_setValue untuk Tampermonkey/Greasemonkey atau localStorage sebagai fallback.
     */
    function saveState() {
        GM_setValue(LOCAL_STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
        if (currentApiKey) {
            GM_setValue(LOCAL_STORAGE_KEY_API_KEY, currentApiKey);
        } else {
            GM_deleteValue(LOCAL_STORAGE_KEY_API_KEY);
        }
        logMessage("State saved.", "info");
    }

    /**
     * Memperbarui tampilan daftar akun di UI.
     */
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

        // Menambahkan event listener setelah elemen di-render
        elements.accountsList.querySelectorAll('.fb-del').forEach(btn => {
            btn.onclick = function() {
                const index = Number(btn.dataset.idx);
                if (confirm(`Are you sure you want to delete account: ${accounts[index].name}?`)) {
                    const deletedAccountName = accounts[index].name;
                    accounts.splice(index, 1);
                    saveState();
                    renderAccounts();
                    logMessage(`Account '${deletedAccountName}' deleted.`, "info");
                }
            };
        });
        elements.accountsList.querySelectorAll('.fb-set').forEach(btn => {
            btn.onclick = function() {
                alert(`Settings for ${accounts[Number(btn.dataset.idx)].name} (not implemented yet)`);
            };
        });
    }

    /**
     * Melakukan panggilan ke API GraphQL.
     * @param {string} query - String query/mutasi GraphQL.
     * @param {object} [variables={}] - Variabel untuk query/mutasi.
     * @param {object} [customHeaders={}] - Header kustom tambahan.
     * @returns {Promise<object>} Data hasil dari API.
     * @throws {Error} Jika ada error dari API atau jaringan.
     */
    async function callGraphQL(query, variables = {}, customHeaders = {}) {
        const headers = {
            "Content-Type": "application/json",
            ...customHeaders
        };
        if (currentApiKey) {
            headers["x-access-token"] = currentApiKey;
        }

        try {
            const res = await fetch(API_URL, {
                method: "POST",
                headers: headers,
                body: JSON.stringify({ query, variables })
            });

            // Periksa status HTTP, karena GraphQL akan mengembalikan 200 OK bahkan untuk error logika
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`HTTP Error: ${res.status} ${res.statusText} - ${errorText}`);
            }

            const json = await res.json();
            if (json.errors && json.errors.length > 0) {
                // Log detail error GraphQL jika ada
                logMessage(`GraphQL Error: ${JSON.stringify(json.errors)}`, "error");
                throw new Error(json.errors[0].message || "GraphQL error occurred.");
            }
            return json.data;
        } catch (e) {
            logMessage(`Network/Parsing Error: ${e.message}`, "error");
            throw new Error(`Failed to communicate with API: ${e.message}`);
        }
    }

    /**
     * Mengambil metadata pengguna dari API.
     * @returns {Promise<object|null>} Data pengguna atau null jika gagal.
     */
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

    /**
     * Mengambil saldo pengguna dari API.
     * @returns {Promise<object|null>} Objek saldo pengguna atau null jika gagal.
     */
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
            // Sesuaikan dengan skema GraphQL, 'balances' adalah objek, bukan array
            return data.user ? data.user.balances : null;
        } catch (e) {
            logMessage(`Error fetching UserBalances: ${e.message}`, "error");
            return null;
        }
    }

    /**
     * Mengambil data VIP dan Faucet pengguna dari API.
     * @returns {Promise<object|null>} Data VIP/Faucet pengguna atau null jika gagal.
     */
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
    }

    /**
     * Handler untuk tombol Connect API.
     * Mengambil info user, saldo, VIP, dan Faucet.
     */
    async function handleConnectAPI() {
        const inputApiKey = elements.apiKeyInput.value.trim();
        if (!inputApiKey) {
            showStatus('API Key required', "error");
            return;
        }
        if (inputApiKey.length !== 96) {
            showStatus('API Key must be 96 characters', "error");
            return;
        }

        currentApiKey = inputApiKey; // Set API Key untuk percobaan koneksi
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
                isConnected = true; // Berhasil mengambil UserMeta, anggap koneksi berhasil
            }
        } catch (e) {
            logMessage(`Initial UserMeta fetch failed: ${e.message}`, "error");
            // Koneksi gagal, reset API key
            currentApiKey = null;
            elements.apiKeyInput.value = '';
            showStatus('Failed to connect API. Invalid Key or Network Error.', "error");
            return; // Hentikan eksekusi lebih lanjut
        }

        if (isConnected) {
            try {
                const userBalances = await fetchUserBalances();
                if (userBalances && userBalances.available) {
                    if (userBalances.available.currency.toLowerCase() === "usdt") {
                        usdt = userBalances.available.amount;
                    }
                    // Jika ada vault balance
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

            // Update UI dengan data yang diambil
            elements.userId.textContent = userId;
            elements.userName.textContent = userName;
            elements.userStatus.textContent = userStatus;
            elements.userCredits.textContent = usdt;
            elements.vipHost.textContent = "VIP Host: " + viphost;
            elements.faucet.textContent = "Faucet: " + faucet;

            // Tambahkan akun ke daftar jika belum ada
            if (userName && !accounts.some(acc => acc.name === userName)) {
                accounts.push({ name: userName, apiKey: currentApiKey });
                saveState();
                renderAccounts();
                logMessage(`Account '${userName}' added to list.`, "info");
            }
            showStatus('API Connected!', "success");
            logMessage(`Connected as ${userName}.`, "info");
            elements.apiKeyInput.value = ''; // Kosongkan input setelah berhasil konek
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
            showStatus('Connect API Key first', 'error');
            return;
        }
        const code = elements.checkBonusCodeInput.value.trim();
        if (!code) {
            showStatus('Input bonus code!', 'error');
            return;
        }
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

    /**
     * Handler untuk tombol Claim Bonus.
     */
    async function handleClaimBonus() {
        if (!currentApiKey) {
            showStatus('Connect API Key first', "error");
            return;
        }
        const code = elements.bonusCodeInput.value.trim();
        if (!code) {
            showStatus('Input bonus code', "error");
            return;
        }
        const claimType = elements.claimTypeSelect.value;
        // Turnstile token sangat penting untuk keamanan.
        // Dalam produksi, ini HARUS didapatkan dari widget Cloudflare Turnstile yang valid di frontend.
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
        const variables = { code, currency: "USDT", turnstileToken }; // Asumsi mata uang default adalah USDT

        try {
            const data = await callGraphQL(mutation, variables);
            const dataKey = claimType === "ClaimConditionBonusCode" ? "claimConditionBonusCode" : "claimBonusCode";

            if (data && data[dataKey]) {
                const claimed = data[dataKey];
                showStatus(`Claimed: ${claimed.amount} ${claimed.currency}`, "success");
                logMessage(`CLAIM SUCCESS for '${code}': Amount ${claimed.amount} ${claimed.currency}, Redeemed: ${claimed.redeemed}.`, "success");

                // Perbarui saldo USDT di UI jika data saldo dikembalikan oleh mutasi
                const user = claimed.user;
                if (user && user.balances) {
                    let usdtAmount = "-";
                    if (user.balances.available && user.balances.available.currency.toLowerCase() === "usdt") {
                        usdtAmount = user.balances.available.amount;
                    }
                    if (user.balances.vault && user.balances.vault.currency.toLowerCase() === "usdt") {
                         usdtAmount = `${usdtAmount} (Vault: ${user.balances.vault.amount})`;
                    }
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

    // --- Initialization Function ---
    function initialize() {
        // --- CSS Injection ---
        // Menggunakan GM_addStyle untuk Tampermonkey/Greasemonkey yang lebih baik
        // Namun, jika ini bukan UserScript (misal, bagian dari HTML), maka pakai document.createElement('style')
        if (typeof GM_addStyle !== 'undefined') {
            GM_addStyle(`
                #fb-claimer-root * {
                    box-sizing: border-box;
                    font-family: 'Fira Mono', monospace;
                    transition: all 0.2s ease-in-out;
                }
                #fb-claimer-root {
                    all: unset; /* Reset all properties for true isolation */
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    min-height: 100vh;
                    z-index: 99999;
                    background: #151c23;
                    color: #e0e0e0;
                    overflow-y: auto;
                    font-size: 14px; /* Default font size */
                }
                /* Modal Styling */
                #fb-claimer-modal {
                    background: #223447e9;
                    position: fixed;
                    left: 0;
                    top: 0;
                    width: 100vw;
                    height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }
                #fb-claimer-modal .popup-inner {
                    background: #253a50;
                    padding: 36px 28px;
                    border-radius: 13px;
                    min-width: 280px;
                    max-width: 95vw;
                    box-shadow: 0 8px 40px #000a;
                    text-align: center;
                }
                #fb-loginPassword {
                    width: 100%;
                    padding: 10px 15px;
                    border-radius: 8px;
                    border: 1px solid #3a5067;
                    background: #1d2b3c;
                    color: #e0e0e0;
                    margin-bottom: 15px;
                    outline: none;
                }
                #fb-loginPassword::placeholder {
                    color: #92a4b8;
                }
                #fb-loginBtn {
                    width: 100%;
                    padding: 10px 15px;
                    border-radius: 8px;
                    border: none;
                    background: #2488ff;
                    color: #fff;
                    font-weight: bold;
                    cursor: pointer;
                    transition: background 0.2s ease;
                }
                #fb-loginBtn:hover {
                    background: #1e70d4;
                }
                #fb-loginErr {
                    color: #ff6767;
                    min-height: 20px;
                    font-size: 0.9em;
                    margin-top: 10px;
                }
                /* Header Styling */
                #fb-claimer-header {
                    background: #212f3d;
                    padding: 18px 32px;
                    font-size: 1.7em;
                    border-radius: 0 0 14px 14px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    box-shadow: 0 2px 8px #0005;
                    position: sticky;
                    top: 0;
                    z-index: 99;
                }
                #fb-claimer-title {
                    font-weight: bold;
                    color: #baff84;
                }
                #fb-claimer-site {
                    font-size: 0.85em;
                    color: #fff9;
                }
                /* Main Content Styling */
                #fb-claimer-main {
                    max-width: 720px;
                    margin: 36px auto 60px auto;
                    padding: 0 15px;
                }
                .fb-claimer-panel {
                    background: #223447;
                    margin-top: 28px;
                    border-radius: 12px;
                    padding: 0;
                    box-shadow: 0 4px 20px #0009;
                    overflow: hidden;
                }
                .fb-claimer-panel .panel-title {
                    background: #2488ff;
                    color: #fff;
                    font-weight: bold;
                    border-radius: 12px 12px 0 0;
                    padding: 13px 24px;
                    font-size: 1.1em;
                    letter-spacing: 1px;
                }
                .panel-content {
                    padding: 20px 24px;
                }
                /* User Info Styling */
                .user-info {
                    font-size: 1.05em;
                }
                .user-info div {
                    margin-bottom: 8px;
                }
                .user-info span {
                    font-weight: 500;
                    color: #baff84;
                }
                .user-status-row {
                    font-size: 0.95em;
                    color: #ffd54f;
                    margin-top: 5px;
                    margin-bottom: 12px !important;
                }
                .fb-viphost, .fb-faucet {
                    font-size: 0.95em;
                    color: #ffe7a4;
                    margin-top: 8px;
                }
                /* Account List Styling */
                .account-list {
                    margin-bottom: 15px;
                }
                .account-item {
                    background: #2d4250;
                    border-radius: 8px;
                    padding: 10px 15px;
                    margin-bottom: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    font-size: 1em;
                }
                .account-item .label {
                    font-weight: 600;
                    color: #f0f0f0;
                }
                .account-item .btns button {
                    border: none;
                    background: transparent;
                    font-size: 1.2em;
                    cursor: pointer;
                    margin-left: 10px;
                    color: #fff;
                    opacity: 0.7;
                    transition: opacity 0.2s ease;
                }
                .account-item .btns button:hover {
                    opacity: 1;
                }
                /* Form Input & Button Styling (General) */
                .api-form, .checkcode-form, .claim-form {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-top: 15px;
                    flex-wrap: wrap;
                }
                input[type="text"], input[type="password"], select {
                    flex: 1;
                    padding: 10px 15px;
                    border-radius: 8px;
                    border: 1px solid #3a5067;
                    background: #1d2b3c;
                    color: #e0e0e0;
                    outline: none;
                    min-width: 150px;
                }
                input[type="text"]::placeholder, input[type="password"]::placeholder {
                    color: #92a4b8;
                }
                button {
                    border-radius: 8px;
                    border: none;
                    background: #2488ff;
                    color: #fff;
                    padding: 10px 20px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: background 0.2s ease;
                }
                button:hover {
                    background: #1e70d4;
                }
                #fb-pasteClipboard {
                    background: #3a5067;
                    padding: 10px 15px;
                }
                #fb-pasteClipboard:hover {
                    background: #2f4050;
                }
                .api-warning {
                    color: #ffe892;
                    font-size: 0.9em;
                    margin-top: 10px;
                }
                .section-title {
                    font-weight: bold;
                    margin-top: 28px;
                    margin-bottom: 15px;
                    font-size: 1.15em;
                    color: #baff84;
                }
                /* Status & Log Styling */
                .status {
                    margin: 18px 0 0 0;
                    font-size: 1em;
                    color: #fcf259;
                    min-height: 25px;
                    font-weight: 500;
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
                    margin-top: 15px;
                    background: #162130;
                    border-radius: 8px;
                    padding: 12px;
                    font-size: 0.9em;
                    min-height: 80px;
                    max-height: 200px;
                    overflow-y: auto;
                    border: 1px solid #2d4250;
                    color: #a0a0a0;
                }
                .log-box div {
                    margin-bottom: 4px;
                }
                .log-box div:last-child {
                    margin-bottom: 0;
                }
                /* Responsif */
                @media (max-width: 768px) {
                    #fb-claimer-header {
                        padding: 15px 20px;
                        font-size: 1.5em;
                    }
                    #fb-claimer-main {
                        margin: 25px auto 40px auto;
                        padding: 0 10px;
                    }
                    .fb-claimer-panel .panel-title {
                        padding: 12px 20px;
                        font-size: 1em;
                    }
                    .panel-content {
                        padding: 15px 20px;
                    }
                    .api-form, .checkcode-form, .claim-form {
                        flex-direction: column;
                        align-items: stretch;
                    }
                    input[type="text"], input[type="password"], select, button {
                        width: 100%;
                        margin-right: 0;
                    }
                    #fb-pasteClipboard {
                        width: auto;
                        align-self: flex-end;
                    }
                    .claim-form button {
                        margin-top: 10px;
                    }
                }
            `);
        } else {
            const style = document.createElement('style');
            style.textContent = `/* (fallback CSS here, same as above) */`; // Duplicate CSS for non-Tampermonkey
            document.head.appendChild(style);
        }

        // --- HTML Injection ---
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
        elements.connectApiBtn.onclick = handleConnectAPI;
        elements.pasteClipboardBtn.onclick = handlePasteClipboard;
        elements.btnCheckBonus.onclick = handleCheckBonusAvailability;
        elements.claimBonusBtn.onclick = handleClaimBonus;
        elements.bonusCodeInput.addEventListener('keydown', (e) => {
            if (e.key === "Enter") handleClaimBonus();
        });

        // --- Initial State Load ---
        // Jika Anda ingin melewati modal login untuk pengembangan,
        // Anda bisa menyembunyikan modal dan menampilkan konten utama di sini.
        // elements.modal.style.display = "none";
        // elements.mainContent.style.display = "";
        // loadState(); // Pastikan data dimuat jika login di-bypass
    }

    // Jalankan fungsi inisialisasi ketika DOM sudah siap
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();