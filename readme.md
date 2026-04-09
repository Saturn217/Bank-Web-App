# 🏦 Bank of Saturn – Backend

A robust and secure digital banking backend built with **Node.js, Express, and MongoDB**.

This system simulates a real-world banking infrastructure with support for authentication, account management, savings with interest, bill payments, transaction security, notifications, and admin monitoring.

---

## 🚀 Features

### 🏦 Core Banking

* User registration & JWT authentication
* Main account:

  * Deposit
  * Withdrawal
  * Transfer
* Savings account:

  * Deposit & withdrawal
* Monthly savings interest (0.5%) via cron job
* Daily transaction limits with automatic reset
* Transaction PIN (4digits)
* 3 failed PIN attempts → 30-minute lock

---

### 💡 Bill Payments

* Airtime (MTN, Airtel, Glo, 9mobile)
* Internet data subscriptions
* Electricity (IBEDC, IKEDC, EKEDC, AEDC, etc.)
* Water bills
* Strong validation:

  * 11-digit phone numbers
  * 7-digit meter numbers

---

### 🔔 Notifications

* In-app notification system
* Unread badge counter
* Mark as read (single/all)
* Filtering & pagination support

---

### 📧 Email System

* Welcome email with ₦100,000 bonus
* OTP for password reset
* Transaction alerts:

  * Transfers
  * Deposits
  * Withdrawals

---

### 🛠 Admin Dashboard

* System overview:

  * Total users
  * Total balances
  * Interest paid
* User management:

  * Search users
  * View balances
  * Reset PIN
* High-value transaction monitoring
* Suspicious activity detection

---

## 🔐 Security Features

* JWT authentication with protected routes
* Transaction PIN with brute-force protection
* Rate limiting on sensitive endpoints
* Daily transaction limit enforcement
* Secure password and PIN hashing using bcrypt

---

## 💰 Transaction Limits

* Daily Deposit Limit: ₦1,000,000
* Daily Withdrawal Limit: ₦1,000,000
* Daily Transfer Limit: ₦2,000,000
* Single Transaction Limit: ₦500,000

---

## 🧰 Tech Stack

* **Runtime:** Node.js
* **Framework:** Express.js
* **Database:** MongoDB + Mongoose
* **Authentication:** JWT
* **Hashing:** bcrypt
* **Email:** Nodemailer + EJS
* **Scheduler:** node-cron
* **Rate Limiting:** express-rate-limit
* **Environment Management:** dotenv

---

## ⚙️ Installation

### 1. Clone the repository

```bash
git clone https://github.com/Saturn217/Bank-Web-App.git
cd bank-of-saturn
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create environment variables

Create a `.env` file in the root directory:

```
PORT=5000
MONGO_URI=your_mongodb_connection
JWT_SECRET=your_secret_key

EMAIL_USER=your_email
EMAIL_PASS=your_email_password

DAILY_DEPOSIT_LIMIT=1000000
DAILY_WITHDRAWAL_LIMIT=1000000
DAILY_TRANSFER_LIMIT=2000000
SINGLE_TRANSACTION_LIMIT=500000
```

---

### 4. Run the server

```bash
npm run dev
```

---

## 📄 API Documentation & Testing

The full API documentation for **Bank of Saturn** is available via Postman.

It includes:

* All endpoints (Auth, Account, Savings, Notifications, Admin)
* Example request bodies and responses
* JWT authentication ready to use
* Live testing support

👉 **View and Test API:**
https://bos-bank-api-documentation.docs.buildwithfern.com/



> ⚠️ Note: Update the `BASE_URL` variable in Postman to your deployed backend (e.g., `https://bank-web-app-eight.vercel.app/api/v1/r`) and login to obtain a JWT token for protected endpoints.

---

## ⏱ Scheduled Jobs

* Monthly savings interest distribution (0.5%)
* Daily transaction limit reset

> ⚠️ Note: If deployed on serverless platforms (e.g., Vercel), external cron services may be required.

---

## 📌 Important Notes

* All protected routes require:

```
Authorization: Bearer <your_token>
```

* Transaction PIN is required for withdrawals and transfers
* Daily limits reset automatically every 24 hours
* Notifications are generated for major account activities

---

## 🧪 Future Improvements

* Virtual debit card system
* KYC verification
* Fraud detection system
* Mobile app integration
* Advanced analytics dashboard

---

## 👨‍💻 Author

Built by **Mubarak Muhammed**

---
