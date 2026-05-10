# 🍽️ ARMenu — 3D AR Smart Menu SaaS Platform

## 📁 File Structure

```
ar_platform/
├── public/
│   └── index.html          ← Landing/Marketing page
├── restaurant/
│   ├── signup.html         ← Restaurant owner signup (Firebase Auth)
│   ├── login.html          ← Login page
│   ├── dashboard.html      ← Owner dashboard (stats + dishes)
│   ├── dishes.html         ← Dish management (Add/Edit/Delete + AI 3D)
│   ├── qr-codes.html       ← QR code generator
│   ├── 3d-models.html      ← 3D model manager
│   ├── analytics.html      ← AR scan analytics
│   ├── subscription.html   ← Plan upgrade
│   └── settings.html       ← Profile settings
├── ar/
│   ├── index.html          ← AR Viewer (opens on QR scan — MindAR.js)
│   └── demo.html           ← Interactive AR demo (no camera needed)
├── admin/
│   └── index.html          ← Super Admin Panel (platform settings, AI tools, revenue)
└── assets/
    └── targets.mind        ← MindAR image tracking target (generate from mindar.io)
```

---

## 🚀 Setup Steps

### 1. Firebase Setup
1. Go to https://firebase.google.com → Create project
2. Enable:
   - Authentication (Email/Password)
   - Firestore Database
   - Storage
3. Copy your config from Project Settings
4. Replace `YOUR_API_KEY`, `YOUR_PROJECT_ID` etc. in ALL files

### 2. Firestore Collections
```
restaurants/
  {uid}/
    restaurantName, ownerName, email, phone, city,
    restaurantType, plan, trialEnds, dishCount, isActive

dishes/
  {dishId}/
    restaurantId, name, price, description, category,
    isAvailable, imageUrl, has3D, model3dUrl, qrScans, createdAt
```

### 3. AR Targets (MindAR)
- Go to https://hiukim.github.io/mind-ar-js-doc/tools/compile
- Upload a flat image (table marker / QR code sheet)
- Download `.mind` file → put in `assets/targets.mind`

### 4. AI 3D Generation (Meshy.ai)
- Sign up at https://meshy.ai
- Get API key → paste in Admin Panel → 3D AI Tools
- API endpoint: `https://api.meshy.ai/v1/image-to-3d`

### 5. Deploy to Vercel
```bash
npm install -g vercel
cd ar_platform
vercel --prod
```

---

## 💰 Business Model
| Plan | Price | Commission |
|------|-------|-----------|
| Basic | ₹999/mo | 20 dishes, 5 AI/mo |
| Pro | ₹1,999/mo | Unlimited, 30 AI/mo |
| Enterprise | ₹4,999/mo | Unlimited + White label |

---

## 🔑 Key Pages
- Landing: `public/index.html`
- AR Demo: `ar/demo.html`
- Admin Login: `admin/index.html`
- Restaurant Signup: `restaurant/signup.html`

**Firebase config chahiye sab files mein — `YOUR_API_KEY` replace karo.**
