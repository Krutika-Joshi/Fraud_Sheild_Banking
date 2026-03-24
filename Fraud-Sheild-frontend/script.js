let scanner;
/* ---------------- AUTH CHECK ---------------- */

const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "login.html";
}
/* ---------------- LOGOUT ---------------- */

function logout() {
    localStorage.removeItem("token");
    window.location.href = "login.html";
}

/*----------------- LOGIN---------------*/

let currentRole = "user";


/* Login */
async function loginUser() {

    let email = document.getElementById("user").value;
    let password = document.getElementById("pass").value;

    let message = document.getElementById("loginMessage");

    try {

        const res = await fetch(
            "http://localhost:5000/api/auth/login",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email: email,
                    password: password
                })
            }
        );

        const data = await res.json();

        if (res.ok) {

            localStorage.setItem("token", data.accessToken || data.token);

            message.innerText = "Login successful";

            setTimeout(() => {

                if (data.role === "admin") {
                    window.location.href = "admin.html";
                } else {
                    window.location.href = "dashboard.html";
                }

            }, 1000);

        } else {

            message.innerText = data.message;

        }

    } catch (error) {

        message.innerText = "Server error";

    }

}

/* ---------------- MODAL CONTROLS ---------------- */

function openDeposit() {
    document.getElementById("depositModal").style.display = "flex";
}

function closeDeposit() {
    document.getElementById("depositModal").style.display = "none";
}

function openWithdraw() {
    document.getElementById("withdrawModal").style.display = "flex";
}

function closeWithdraw() {
    document.getElementById("withdrawModal").style.display = "none";
}
async function openQR() {

    document.getElementById("qrModal").style.display = "flex";

    try {

        const res = await fetch(
            "http://localhost:5000/api/account/balance",
            {
                headers: {
                    Authorization: "Bearer " + token
                }
            }
        );

        const data = await res.json();

        const accountId = data.accountId;

        const qrRes = await fetch(
            "http://localhost:5000/api/account/generate-qr/" + accountId,
            {
                headers: {
                    Authorization: "Bearer " + token
                }
            }
        );

        const qrData = await qrRes.json();
        console.log(qrData);

        if (qrData.qrCode) {

            document.getElementById("qrImage").src = qrData.qrCode;

        } else {

            console.log("QR code not received");

        }

    } catch (error) {

        console.log("QR load error:", error);

    }

}
function closeQR(){
document.getElementById("qrModal").style.display="none";
}


async function openScanner() {

    document.getElementById("scanResult").innerText = "";

    document.getElementById("scanModal").style.display = "flex";

    scanner = new Html5Qrcode("reader");

    scanner.start(
        { facingMode: "environment" },
        {
            fps: 10,
            qrbox: 250
        },

        async (qrCodeMessage) => {

            try {

                let data;
                try {
                    data = JSON.parse(qrCodeMessage);
                } catch (e) {
                    data = { accountNumber: qrCodeMessage };
                    console.log("QR parse error:", qrCodeMessage);
                    document.getElementById("scanResult").innerText = "Invalid QR format";
                    return;
                }

                const res = await fetch(
                    "http://localhost:5000/api/account/verify-qr",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: "Bearer " + token
                        },
                        body: JSON.stringify({
                            accountNumber: data.accountNumber
                        })
                    }
                );

                const result = await res.json();

                if (result.status === "safe") {

                    document.getElementById("scanModal").style.display = "none";

                    document.getElementById("paymentModal").style.display = "flex";

                    document.getElementById("receiverName").innerText =
                        "Account: " + result.accountName;

                    document.getElementById("receiverAccount").innerText =
                        "Account Number: " + result.accountNumber;

                } else {

                    document.getElementById("scanResult").innerText = result.message;

                }

                scanner.stop();

            } catch (error) {

                console.log("QR verification error:", error);

            }

        },

        (error) => {
            console.log(error);
        }

    );

}
function closeScanner() {

    document.getElementById("scanModal").style.display = "none";

    if (scanner) {
        scanner.stop();
    }

}

async function processTransaction(){

const amount = document.getElementById("paymentAmount").value;
const type = document.getElementById("transactionType").value;

if(!amount || amount <= 0){
document.getElementById("paymentMessage").innerText = "Enter valid amount";
return;
}

let url = "";

if(type === "deposit"){
url = "http://localhost:5000/api/account/deposit";
}
else{
url = "http://localhost:5000/api/account/withdraw";
}

try{

const res = await fetch(
url,
{
method:"POST",
headers:{
"Content-Type":"application/json",
Authorization:"Bearer "+token
},
body:JSON.stringify({
amount:Number(amount)
})
}
);

const data = await res.json();

document.getElementById("paymentMessage").innerText = data.message;

setTimeout(()=>{

closePayment();
loadAccountBalance();
loadTransactionHistory();

},1500);

}catch(error){

document.getElementById("paymentMessage").innerText="Transaction failed";

}

}

function closePayment(){

document.getElementById("paymentModal").style.display="none";

document.getElementById("paymentAmount").value="";
document.getElementById("paymentMessage").innerText="";
document.getElementById("transactionType").value="deposit";

}
/* ---------------- LOAD USER INFO ---------------- */

async function loadUserInfo() {

    try {

        const res = await fetch(
            "http://localhost:5000/api/protected/me",
            {
                headers: {
                    Authorization: "Bearer " + token
                }
            }
        );

        const data = await res.json();

        if (data.name) {
            document.getElementById("userName").innerText = data.name;
        }

    } catch (error) {
        console.log("User fetch error");
    }

}


/* ---------------- LOAD ACCOUNT BALANCE ---------------- */

async function loadAccountBalance() {

    try {

        const res = await fetch(
            "http://localhost:5000/api/account/balance",
            {
                headers: {
                    Authorization: "Bearer " + token
                }
            }
        );

        const data = await res.json();

        if(res.ok){
            document.getElementById("accountBalance").innerText =
            "₹" + data.balance;
        }
        else{
            console.log(data);
        }
        
    } catch (error) {
        console.log("Balance fetch error");
    }

}


/* ---------------- LOAD TRANSACTION HISTORY ---------------- */

async function loadTransactionHistory() {

    const table = document.getElementById("historyTable");

    table.innerHTML = "";

    try {

        const res = await fetch(
            "http://localhost:5000/api/account/transactions",
            {
                headers: {
                    Authorization: "Bearer " + token
                }
            }
        );

        const data = await res.json();

        data.forEach(tx => {

            const rowClass = tx.status === "flagged" ? "fraud-row" : "";

            table.innerHTML += `
                <tr class="${rowClass}">
                    <td>${tx.type}</td>
                    <td>₹${tx.amount}</td>
                    <td>${tx.status}</td>
                    <td>${new Date(tx.createdAt).toLocaleDateString()}</td>
                </tr>
            `;

        });

        /* -------- Dashboard Stats -------- */

        document.getElementById("totalTx").innerText = data.length;

        const approvedCount = data.filter(tx => tx.status === "approved").length;
        const pendingCount = data.filter(tx => tx.status === "pending").length;
        const flaggedCount = data.filter(tx => tx.status === "flagged").length;

        document.getElementById("approvedTx").innerText = approvedCount;
        document.getElementById("fraudScore").innerText = flaggedCount;

        /* -------- Fraud Risk Logic -------- */

        let risk = "LOW";

        if (flaggedCount >= 3) {
            risk = "HIGH";
        } else if (flaggedCount >= 1) {
            risk = "MEDIUM";
        }

        document.getElementById("riskLevel").innerText = risk;

        const warning = document.getElementById("fraudWarning");

        async function loadAccountStatus() {

    try {

        const res = await fetch(
            "http://localhost:5000/api/account/status",
            {
                headers: {
                    Authorization: "Bearer " + token
                }
            }
        );

        const data = await res.json();

        const statusElement = document.getElementById("accountStatus");
        const warning = document.getElementById("fraudWarning");

        if (data.status === "frozen") {

            statusElement.innerText = "FROZEN 🔴";
            statusElement.style.color = "red";

            warning.style.display = "block";

        } else {

            statusElement.innerText = "ACTIVE 🟢";
            statusElement.style.color = "green";

            warning.style.display = "none";

        }

    } catch (error) {

        console.log("Status fetch error");

    }

}

    } catch (error) {

        console.log("Error loading transactions");

    }

}


/* ---------------- FRAUD ALERT PANEL ---------------- */

async function loadFraudAlerts() {

    try {

        const res = await fetch(
            "http://localhost:5000/api/account/transactions",
            {
                headers: {
                    Authorization: "Bearer " + token
                }
            }
        );

        const data = await res.json();

        const fraudBox = document.getElementById("fraudAlerts");

        const flagged = data.filter(tx => tx.status === "flagged");

        if (flagged.length === 0) {

            fraudBox.innerHTML = `
                <p class="login-hint">
                    No suspicious activity detected
                </p>
            `;
            return;
        }

        fraudBox.innerHTML = "";

        flagged.slice(0,5).forEach(tx => {

            fraudBox.innerHTML += `
                <div class="fraud-item">
                    <div>
                        ⚠ Suspicious ${tx.type} of <strong>₹${tx.amount}</strong>
                    </div>

                    <div class="fraud-date">
                        ${new Date(tx.createdAt).toLocaleString()}
                    </div>
                </div>
            `;

        });

    } catch (error) {

        console.log("Fraud alert error");

    }

}

/* ---------------- ACCOUNT STATUS ---------------- */

async function loadAccountStatus() {

    try {

        const res = await fetch(
            "http://localhost:5000/api/account/status",
            {
                headers: {
                    Authorization: "Bearer " + token
                }
            }
        );

        const data = await res.json();

        const statusElement = document.getElementById("accountStatus");

        if (data.status === "frozen") {

            statusElement.innerText = "FROZEN 🔴";
            statusElement.style.color = "red";

        } else {

            statusElement.innerText = "ACTIVE 🟢";
            statusElement.style.color = "green";

        }

    } catch (error) {
        console.log("Status fetch error");
    }

}


/* ---------------- DEPOSIT MONEY ---------------- */

async function depositMoney() {

    const amount = document.getElementById("depositAmount").value;
    const message = document.getElementById("depositMessage");

    if (!amount || amount <= 0) {

        message.style.color = "orange";
        message.innerText = "Enter a valid amount";
        return;

    }

    try {

        const res = await fetch(
            "http://localhost:5000/api/account/deposit",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + token
                },
                body: JSON.stringify({
                    amount: Number(amount)
                })
            }
        );

        const data = await res.json();

        if (res.ok) {

            message.style.color = "green";
            message.innerText = "Deposit successful";

            setTimeout(() => {
                location.reload();
            }, 1000);

        } else {

            message.style.color = "red";
            message.innerText = data.message;

        }

    } catch (error) {

        message.style.color = "red";
        message.innerText = "Server error";

    }

}


/* ---------------- WITHDRAW MONEY ---------------- */

async function withdrawMoney() {

    const amount = document.getElementById("withdrawAmount").value;
    const message = document.getElementById("withdrawMessage");

    if (!amount || amount <= 0) {
        message.style.color = "orange";
        message.innerText = "Enter a valid amount";
        return;
    }

    try {

        const res = await fetch(
            "http://localhost:5000/api/account/withdraw",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + token
                },
                body: JSON.stringify({
                    amount: Number(amount)
                })
            }
        );

        const data = await res.json();

        if (res.ok) {

            message.style.color = "green";
            message.innerText = data.message;

            closeWithdraw();

            setTimeout(() => {
                location.reload();
            }, 1200);

        } else {

            message.style.color = "red";
            message.innerText = data.message;

        }

    } catch (error) {

        message.style.color = "red";
        message.innerText = "Server error";

    }

}

async function createAccountIfNeeded(){

    try{

        const res = await fetch(
            "http://localhost:5000/api/account/create",
            {
                method:"POST",
                headers:{
                    Authorization:"Bearer " + token
                }
            }
        );

        if(res.status === 400){
            console.log("Account already exists");
        }

    }catch(error){
        console.log("Account creation skipped");
    }

}

/* ---------------- INIT ---------------- */
async function init(){

    await createAccountIfNeeded();

    loadUserInfo();
    loadAccountBalance();
    loadTransactionHistory();
    loadFraudAlerts();
    loadAccountStatus();

}

init();