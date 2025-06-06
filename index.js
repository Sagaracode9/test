// ==UserScript==
// @name         saBot Claimer (HTML Rebuild)
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  A user script to manage accounts, check, and claim bonuses on Stake.com via GraphQL API, with rebuilt UI.
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
    const API_URL = "https://stake.com/_api/graphql";
    const AUTH_PASSWORD = "sagara321"; // WARNING: Hardcoded password is NOT secure for production apps! GANTI INI!
    const LOCAL_STORAGE_KEY_ACCOUNTS = "fbClaimer_accounts";
    const LOCAL_STORAGE_KEY_API_KEY = "fbClaimer_apiKey";

    // --- CSS inject (Rebuilt Styles) ---
    // Menggunakan GM_addStyle untuk injeksi CSS yang lebih baik pada UserScript
    // Ini memastikan gaya diterapkan secara lebih terisolasi.
    if (typeof GM_addStyle !== 'undefined') {
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

            /* Form API Key */
            .api-form {
                display: flex;
                gap: 12px; /* Spasi antar elemen form */
                margin-top: 15px;
                flex-wrap: wrap; /* Untuk responsif */
                align-items: stretch; /* Agar tinggi input/button sama */
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
            .log-box .error {
                color: #ff8a8a;
            }
            .log-box .success {
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
                .api-form, .checkcode-form, .claim-form {
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
    } else {
        // Fallback for non-Tampermonkey environments (e.g., direct script inclusion)
        const style = document.createElement('style');
        style.textContent = `
            /* Duplikat CSS di sini jika tidak menggunakan Tampermonkey */
            /* (Untuk menjaga ukuran file, saya tidak akan menempelkan ulang di sini) */
        `;
        document.head.appendChild(style);
    }

    // --- UI HTML root (Rebuilt HTML structure with same IDs) ---
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
                            <option value="bonus">BONUS</option>
                            <option value="coupon">COUPON</option>
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
                        <input type="text" id="fb-turnstileToken" placeholder="DEMO-TOKEN or real">
                    </div>
                    <div class="status" id="fb-status"></div>
                    <div class="log-box" id="fb-log"></div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(root);

    // --- DOM Element References (Re-map after HTML injection) ---
    // Pastikan semua referensi elemen diperbarui setelah root.innerHTML diatur
    const elements = {
        root: document.getElementById('fb-claimer-root'),
        modal: document.getElementById('fb-claimer-modal'),
        loginPassword: document.getElementById('fb-loginPassword'),
        loginBtn: document.getElementById('fb-loginBtn'),
        loginErr: document.getElementById('fb-loginErr'),
        mainContent: document.getElementById('fb-claimer-main'),
        userId: document.getElementById('fb-userId'),
        userName: document.getElementById('fb-userName'),
        userStatus: document.getElementById('fb-userStatus'),
        userCredits: document.getElementById('fb-userCredits'),
        vipHost: document.getElementById('fb-viphost'),
        faucet: document.getElementById('fb-faucet'),
        accountsList: document.getElementById('fb-accounts'),
        apiKeyInput: document.getElementById('fb-apiKeyInput'),
        pasteClipboardBtn: document.getElementById('fb-pasteClipboard'),
        connectApiBtn: document.getElementById('fb-connectAPI'),
        checkBonusCodeInput: document.getElementById('fb-checkBonusCode'),
        couponTypeSelect: document.getElementById('fb-couponType'),
        btnCheckBonus: document.getElementById('fb-btnCheckBonus'),
        bonusCodeInput: document.getElementById('fb-bonusCodeInput'),
        claimTypeSelect: document.getElementById('fb-claimType'),
        claimBonusBtn: document.getElementById('fb-claimBonus'),
        turnstileTokenInput: document.getElementById('fb-turnstileToken'),
        statusDisplay: document.getElementById('fb-status'),
        logBox: document.getElementById('fb-log'),
    };

    // --- STATE (Original logic remains) ---
    let accountList = []; // Mulai kosong, akan dimuat dari storage
    let apiKey = null;

    // --- RENDER ACCOUNTS (Original logic remains) ---
    function renderAccounts() {
        const wrap = elements.accountsList; // Menggunakan referensi elements
        wrap.innerHTML = "";
        if (accountList.length === 0) {
            wrap.innerHTML = "<div style='color:#a0a0a0; font-size:0.9em; text-align:center; padding:10px 0;'>No accounts connected yet.</div>";
        }
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
                const index = Number(btn.dataset.idx);
                if (confirm(`Are you sure you want to delete account: ${accountList[index].name}?`)) {
                    accountList.splice(index, 1);
                    saveState(); // Simpan perubahan setelah hapus
                    renderAccounts();
                    log("Account deleted.");
                }
            };
        });
        wrap.querySelectorAll('.fb-set').forEach(btn => {
            btn.onclick = function() {
                alert('Setting for ' + accountList[Number(btn.dataset.idx)].name);
            };
        });
    }

    // --- Helper Functions (Original logic remains, adapted to elements object) ---
    function showStatus(msg, type = null) {
        const s = elements.statusDisplay; // Menggunakan referensi elements
        s.textContent = msg;
        s.className = "status" + (type ? (" " + type) : "");
    }
    function log(msg) {
        const logDiv = elements.logBox; // Menggunakan referensi elements
        logDiv.innerHTML += `<div>${new Date().toLocaleTimeString()}: ${msg}</div>`;
        logDiv.scrollTop = logDiv.scrollHeight;
    }

    // --- Data Persistence (GM_getValue/GM_setValue for UserScript) ---
    function loadState() {
        const storedAccounts = GM_getValue(LOCAL_STORAGE_KEY_ACCOUNTS, '[]');
        try {
            accountList = JSON.parse(storedAccounts);
        } catch (e) {
            log("Error loading accounts from storage: " + e.message);
            accountList = []; // Reset jika ada error parsing
        }
        apiKey = GM_getValue(LOCAL_STORAGE_KEY_API_KEY, null);
        if (apiKey) {
            elements.apiKeyInput.value = apiKey; // Populate input if key exists
        }
        renderAccounts();
    }

    function saveState() {
        GM_setValue(LOCAL_STORAGE_KEY_ACCOUNTS, JSON.stringify(accountList));
        if (apiKey) {
            GM_setValue(LOCAL_STORAGE_KEY_API_KEY, apiKey);
        } else {
            GM_deleteValue(LOCAL_STORAGE_KEY_API_KEY);
        }
    }


    // --- LOGIN (Original logic remains, adapted to elements object) ---
    elements.loginBtn.onclick = function() {
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
        loadState(); // Muat state setelah login
    };
    elements.loginPassword.addEventListener('keydown', function(e) {
        if (e.key === "Enter") elements.loginBtn.click();
    });

    // --- CONNECT API (Original logic remains, adapted to elements object) ---
    elements.connectApiBtn.onclick = async function() {
        const input = elements.apiKeyInput.value.trim();
        if (!input) return showStatus('API Key required', "error");
        if (input.length !== 96) return showStatus('API Key must be 96 chars', "error");
        apiKey = input; // Set global apiKey state
        saveState(); // Simpan API key
        showStatus('Connecting to API...');
        log("Connecting to API...");

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
            const res = await fetch(API_URL, {
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
                ].filter(Boolean).join(", ") || "Active"; // Tambahkan "Active" jika tidak ada status lain
                log("UserMeta fetched successfully.");

                // Tambahkan akun ke accountList jika belum ada
                if (userName && !accountList.some(acc => acc.name === userName)) {
                    accountList.push({ name: userName, apiKey: apiKey }); // Simpan API key bersama akun
                    saveState();
                    renderAccounts();
                    log(`Account '${userName}' added to list.`);
                }

            } else if (json.errors && json.errors.length) {
                throw new Error(json.errors[0].message);
            } else {
                throw new Error("Failed to fetch user meta.");
            }
        } catch (e) {
            log("UserMeta error: " + e.message);
            showStatus('API connection failed: ' + e.message, "error");
            apiKey = null; // Clear API key on failure
            elements.apiKeyInput.value = ''; // Clear input
            return; // Stop further execution if UserMeta fails
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
            const res = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-access-token": apiKey },
                body: JSON.stringify({ query })
            });
            const json = await res.json();
            if (json.data && json.data.user && json.data.user.balances) {
                // GraphQL schema menunjukkan balances sebagai objek, bukan array, dengan available dan vault langsung
                // Ubah logika akses jika json.data.user.balances bukan array
                const userBalances = json.data.user.balances;
                if (userBalances.available && userBalances.available.currency.toLowerCase() === "usdt") {
                    usdt = userBalances.available.amount;
                }
                if (userBalances.vault && userBalances.vault.currency.toLowerCase() === "usdt") {
                    usdt = `${usdt} (Vault: ${userBalances.vault.amount})`;
                }
                log("UserBalances fetched successfully.");
            } else if (json.errors && json.errors.length) {
                throw new Error(json.errors[0].message);
            }
        } catch (e) {
            log("UserBalances error: " + e.message);
        }

        // 3. VIP / Faucet (Original query did not have variables in its definition)
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
            const res = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-access-token": apiKey },
                body: JSON.stringify({ query }) // Tidak ada variables untuk VipMeta sesuai skema yang Anda berikan sebelumnya
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
                log("VIP/Faucet data fetched successfully.");
            } else if (json.errors && json.errors.length) {
                throw new Error(json.errors[0].message);
            }
        } catch (e) {
            log("VipMeta error: " + e.message);
        }

        // Update UI
        elements.userId.textContent = userId;
        elements.userName.textContent = userName;
        elements.userStatus.textContent = userStatus;
        elements.userCredits.textContent = usdt;
        elements.vipHost.textContent = "VIP Host: " + viphost;
        elements.faucet.textContent = "Faucet: " + faucet;

        showStatus('API Connected!', "success");
        log("Connected as " + userName);
        elements.apiKeyInput.value = ''; // Clear input after successful connection
    };

    // Paste clipboard (Original logic remains, adapted to elements object)
    elements.pasteClipboardBtn.onclick = async function() {
        try {
            const text = await navigator.clipboard.readText();
            elements.apiKeyInput.value = text || '';
            if (text) {
                showStatus('API Key pasted from clipboard.', "info");
                log("Pasted API Key from clipboard.");
            } else {
                showStatus('Clipboard is empty.', "error");
            }
        } catch (e) {
            showStatus('Clipboard not accessible or empty', "error");
            log('Clipboard error: ' + e.message);
        }
    };

    // --- CHECK BONUS CODE AVAILABILITY (Original logic remains, adapted to elements object) ---
    elements.btnCheckBonus.onclick = async function() {
        if (!apiKey) return showStatus('Connect API Key first', 'error');
        const code = elements.checkBonusCodeInput.value.trim();
        if (!code) return showStatus('Input code!', 'error');
        let couponType = elements.couponTypeSelect.value;
        couponType = couponType.toUpperCase(); // Ensure uppercase for CouponType Enum as per GraphQL schema
        const query = `query BonusCodeAvailability($code: String!, $couponType: CouponType!) {
            bonusCodeAvailability(code: $code, couponType: $couponType)
        }`;
        const variables = { code, couponType };
        showStatus('Checking code availability...', "info");
        log(`Checking bonus code: ${code} (Type: ${couponType})...`);
        try {
            const res = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-access-token": apiKey },
                body: JSON.stringify({ query, variables })
            });
            const json = await res.json();
            if (json.data && typeof json.data.bonusCodeAvailability !== "undefined") {
                const statusType = json.data.bonusCodeAvailability ? "success" : "error";
                showStatus("Availability: " + (json.data.bonusCodeAvailability ? "Available" : "Not Available"), statusType);
                log("CheckCode: " + code + " = " + json.data.bonusCodeAvailability);
            } else if (json.errors && json.errors.length) {
                showStatus(json.errors[0].message, "error");
                log("CheckCode Error: " + json.errors[0].message);
            } else {
                showStatus('Unknown error checking bonus availability.', "error");
                log("Unknown response for bonus availability check.");
            }
        } catch (e) {
            showStatus('Error checking code: ' + e.message, "error");
            log('CheckCode Error: ' + e.message);
        }
    };

    // --- CLAIM BONUS (Original logic remains, adapted to elements object) ---
    elements.claimBonusBtn.onclick = async function() {
        if (!apiKey) return showStatus('Connect API Key first', "error");
        const code = elements.bonusCodeInput.value.trim();
        if (!code) return showStatus('Input bonus code', "error");
        const type = elements.claimTypeSelect.value;
        const turnstileToken = elements.turnstileTokenInput.value.trim() || "DEMO-TOKEN";

        showStatus('Claiming bonus...', "info");
        log(`Attempting to claim bonus: ${code} (Type: ${type})...`);

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
            const res = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-access-token": apiKey },
                body: JSON.stringify({ query: mutation, variables })
            });
            const json = await res.json();
            const dataKey = type === "ClaimConditionBonusCode" ? "claimConditionBonusCode" : "claimBonusCode";

            if (json.data && json.data[dataKey]) {
                const claimed = json.data[dataKey];
                showStatus(`Claimed: ${claimed.amount} ${claimed.currency}`, "success");
                log(`CLAIM SUCCESS: ${code} - Amount: ${claimed.amount} ${claimed.currency}, Redeemed: ${claimed.redeemed}.`);

                // Update USDT balance from the returned user object
                const user = claimed.user;
                if (user && user.balances) {
                    let usdtBalance = "-";
                    // Correctly access balances as an object with available/vault
                    if (user.balances.available && user.balances.available.currency.toLowerCase() === "usdt") {
                        usdtBalance = user.balances.available.amount;
                    }
                    if (user.balances.vault && user.balances.vault.currency.toLowerCase() === "usdt") {
                        usdtBalance = `${usdtBalance} (Vault: ${user.balances.vault.amount})`;
                    }
                    elements.userCredits.textContent = usdtBalance;
                }
            } else if (json.errors && json.errors.length) {
                showStatus(json.errors[0].message, "error");
                log("CLAIM ERROR: " + code + " - " + json.errors[0].message);
            } else {
                showStatus('Unknown error on bonus claim.', "error");
                log("Unknown response for bonus claim.");
            }
        } catch (e) {
            showStatus('Error on bonus claim: ' + e.message, "error");
            log('CLAIM Error: ' + e.message);
        }
    };
    elements.bonusCodeInput.addEventListener('keydown', function(e) {
        if (e.key === "Enter") elements.claimBonusBtn.click();
    });

    // --- Initialization Function ---
    function initialize() {
        // HTML Injection (already done above)
        // DOM element mapping (already done above)
        // Event Listeners (already done above)

        // Initial state load
        loadState(); // This will also call renderAccounts()
    }

    // Run initialization when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();
