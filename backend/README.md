# AuraCraft Backend API

> Node.js · Express · MongoDB Atlas · JWT · Razorpay · Firebase Phone OTP

## Quick Start

### 1. Prerequisites
- Node.js ≥ 18
- npm ≥ 9
- [MongoDB Atlas](https://cloud.mongodb.com) free account
- [Razorpay](https://razorpay.com) test account  
- Firebase project with **Phone Authentication** enabled

### 2. Install Dependencies
```bash
cd backend
npm install
```

### 3. Set Up Environment
```bash
cp .env.example .env
# Fill in all values in .env (see below)
```

### 4. Seed Demo Salons
```bash
npm run seed
```

### 5. Start the Server
```bash
# Development (with auto-restart)
npm run dev

# Production
npm start
```
Server starts on **http://localhost:5000**

---

## Environment Variables (`.env`)

| Variable | Where to Get |
|---|---|
| `MONGODB_URI` | MongoDB Atlas → Connect → Drivers |
| `JWT_SECRET` | Run: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `RAZORPAY_KEY_ID` | Razorpay Dashboard → Settings → API Keys (Test Mode) |
| `RAZORPAY_KEY_SECRET` | Same page as above |
| `FIREBASE_PROJECT_ID` | Firebase Console → Project Settings → General |
| `FIREBASE_CLIENT_EMAIL` | Firebase Console → Project Settings → Service Accounts → Generate Key |
| `FIREBASE_PRIVATE_KEY` | Same JSON file from Service Accounts |
| `FRONTEND_URL` | `http://localhost:5173` (dev) or your Netlify/Vercel URL (prod) |

---

## API Reference

### Base URL
- **Dev:** `http://localhost:5000/api`
- **Prod:** `https://your-backend.onrender.com/api`

### Authentication
All protected routes require:
```
Authorization: Bearer <jwt_token>
```

---

### Auth Routes — `/api/auth`

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/register` | Public | Register with email + password |
| `POST` | `/login` | Public | Login with email + password |
| `POST` | `/firebase-otp` | Public | Verify Firebase OTP token → get JWT |
| `GET` | `/me` | 🔒 User | Get current user profile |

#### POST `/auth/register`
```json
{ "name": "Ayush", "email": "ayush@example.com", "password": "secret123" }
```
Response: `{ token, user: { id, name, email, role, loyaltyPoints } }`

#### POST `/auth/login`
```json
{ "email": "ayush@example.com", "password": "secret123" }
```
Response: `{ token, user: { id, name, email, role, salonId } }`

#### POST `/auth/firebase-otp`
```json
{ "firebaseIdToken": "<id_token_from_firebase_sdk>", "name": "Ayush" }
```
Response: `{ token, user: { id, name, phone, role } }`

---

### Salon Routes — `/api/salons`

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/` | Public | List salons (with filters) |
| `GET` | `/:id` | Public | Salon detail |
| `POST` | `/` | 🔒 Admin | Create salon |
| `PUT` | `/:id` | 🔒 Admin | Update salon |
| `DELETE` | `/:id` | 🔒 Admin | Soft-delete salon |

#### GET `/salons?lat=19.06&lng=72.83&radius=5&category=barber&search=blade&sort=distance`
```json
{
  "salons": [ { "_id", "name", "category", "location", "rating", "distance" } ],
  "count": 7
}
```

#### POST `/salons` (Admin)
```json
{
  "name": "My Salon",
  "category": "barber",
  "address": "123, Main St",
  "location": { "lat": 19.06, "lng": 72.83 },
  "openTime": "09:00",
  "closeTime": "21:00",
  "services": [{ "id": "s1", "name": "Haircut", "price": 300, "duration": 30, "category": "small" }]
}
```

---

### Booking Routes — `/api/bookings`

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/` | 🔒 User | Create booking (pending payment) |
| `GET` | `/me` | 🔒 User | User's own bookings |
| `PUT` | `/:id/confirm` | 🔒 User | Confirm after payment |
| `GET` | `/salon/:salonId` | 🔒 Admin | All bookings for salon |
| `PUT` | `/:id/status` | 🔒 Admin | Update booking status |

#### POST `/bookings`
```json
{
  "salonId": "<salon_id>",
  "serviceId": "s001",
  "date": "2026-03-01",
  "time": "10:00",
  "couponCode": "BLADE20"
}
```
Response: `{ booking: { id, finalAmount, status: "pendingPayment" } }`

---

### Payment Routes — `/api/payments`

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/create-order` | 🔒 User | Create Razorpay order |
| `POST` | `/verify` | 🔒 User | Verify payment signature |

#### POST `/payments/create-order`
```json
{ "bookingId": "<booking_id>" }
```
Response: `{ orderId, amount, currency, keyId }` ← pass these to Razorpay popup

#### POST `/payments/verify`
```json
{
  "razorpay_order_id": "order_xxx",
  "razorpay_payment_id": "pay_xxx",
  "razorpay_signature": "sha256_hmac_signature",
  "bookingId": "<booking_id>"
}
```

---

### Slot Routes — `/api/slots`

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/:salonId?date=YYYY-MM-DD` | Public | Get slots for a salon + date |
| `POST` | `/:salonId` | 🔒 Admin | Add slots for a date |
| `DELETE` | `/:salonId?date=YYYY-MM-DD` | 🔒 Admin | Remove un-booked slots |

#### POST `/slots/:salonId` (Admin)
```json
{ "date": "2026-03-01", "times": ["09:00", "09:30", "10:00", "10:30"] }
```

---

## Frontend Integration

### Set API base URL
Add to `vite.config.js` (if you use a proxy) or set in `.env` on the frontend:
```env
VITE_API_URL=http://localhost:5000/api
```

### Booking + Payment flow (frontend)
```js
// 1. Create booking
const { data: { booking } } = await api.post('/bookings', { salonId, serviceId, date, time });

// 2. Create Razorpay order + open popup
const { ok } = await initiatePayment(booking.id, { name, email });

// 3. On success: booking is auto-confirmed by verify endpoint
```

### OTP Login flow (frontend)
```js
// 1. Send OTP (Firebase sends SMS)
await sendPhoneOTP('+919876543210');

// 2. User enters OTP
const { ok, session } = await verifyPhoneOTP('123456');
// → JWT stored, session set
```

---

## Deployment

### Backend → Render (free tier)
1. Push `backend/` folder to GitHub
2. New Web Service on [render.com](https://render.com)
3. Build command: `npm install`
4. Start command: `npm start`
5. Add all env vars from `.env` in Render dashboard
6. Done! URL: `https://auracraft-api.onrender.com`

### Frontend → Netlify/Vercel
1. Set `VITE_API_URL=https://auracraft-api.onrender.com/api`
2. Build: `npm run build`
3. Deploy `dist/` folder

---

## Free vs Paid Services

| Service | Free? | Notes |
|---|---|---|
| MongoDB Atlas M0 | ✅ Free | 512 MB, plenty for this app |
| Firebase Phone OTP | ✅ Free | 10 SMS/day free; >10 costs ~₹0.30/SMS |
| Leaflet + OpenStreetMap | ✅ Free | No API key needed |
| Render backend hosting | ✅ Free | Sleeps after 15 min idle |
| Netlify/Vercel frontend | ✅ Free | Unlimited for static sites |
| Razorpay | ✅ Test free | 2% fee in live mode |
| MSG91/Twilio SMS | ❌ Paid | Alternative to Firebase OTP if you need higher volume |
| Google Maps API | ❌ Paid | Use Leaflet instead |

---

## Firebase Phone Auth Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project → **Authentication** → **Sign-in method**
3. Enable **Phone** provider
4. In **Settings → Authorized domains**, add your frontend domain
5. For testing, add test phone numbers under **Phone** provider settings
   - Example: `+91 9999999999` → OTP: `123456`

---

## Razorpay Test Mode Setup

1. Sign up at [razorpay.com](https://razorpay.com)
2. Dashboard → **Settings → API Keys → Generate Test Key**
3. Copy `Key ID` and `Key Secret` to `.env`
4. Test card: `4111 1111 1111 1111`, any future date, any CVV
5. Test UPI: `success@razorpay`
