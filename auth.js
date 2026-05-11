// ============================================
// ARMenu Auth System — Appwrite Based
// Replace APPWRITE_ENDPOINT and APPWRITE_PROJECT_ID below
// ============================================

const APPWRITE_ENDPOINT = 'https://fra.cloud.appwrite.io/v1'; // e.g. https://cloud.appwrite.io/v1
const APPWRITE_PROJECT_ID = '6a019527003229bfbfbd';

// ── Appwrite API helper ──
const AW = {
  async call(path, method = 'GET', body = null, extraHeaders = {}) {
    const res = await fetch(`${APPWRITE_ENDPOINT}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': APPWRITE_PROJECT_ID,
        'X-Appwrite-Response-Format': '1.0.0',
        ...extraHeaders
      },
      credentials: 'include',
      body: body ? JSON.stringify(body) : null
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  },

  // Account (auth)
  account: {
    create: (userId, email, password, name) =>
      AW.call('/account', 'POST', { userId, email, password, name }),
    createSession: (email, password) =>
      AW.call('/account/sessions/email', 'POST', { email, password }),
    get: () => AW.call('/account', 'GET'),
    deleteSession: (sessionId) =>
      AW.call(`/account/sessions/${sessionId}`, 'DELETE'),
    updatePassword: (password, oldPassword) =>
      AW.call('/account/password', 'PATCH', { password, oldPassword }),
  },

  // Database
  db: {
    createDoc: (dbId, collId, docId, data) =>
      AW.call(`/databases/${dbId}/collections/${collId}/documents`, 'POST', {
        documentId: docId, data
      }),
    getDoc: (dbId, collId, docId) =>
      AW.call(`/databases/${dbId}/collections/${collId}/documents/${docId}`, 'GET'),
    updateDoc: (dbId, collId, docId, data) =>
      AW.call(`/databases/${dbId}/collections/${collId}/documents/${docId}`, 'PATCH', { data }),
    listDocs: (dbId, collId, queries = []) => {
      const q = queries.map(q => `queries[]=${encodeURIComponent(q)}`).join('&');
      return AW.call(`/databases/${dbId}/collections/${collId}/documents${q ? '?' + q : ''}`, 'GET');
    }
  }
};

// ── IDs (fill these after creating in Appwrite console) ──
const DB_ID = 'armenu-db';
const COL_RESTAURANTS = 'restaurants';
const COL_DISHES = 'dishes';
const COL_SCANS = 'qr_scans';

// Generate unique ID
function genId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// ── SIGNUP ──
async function authSignup(data) {
  const { email, password, restaurantName, ownerName, phone, city, restaurantType } = data;

  // 1. Create Appwrite account
  const userId = genId();
  await AW.account.create(userId, email, password, ownerName);

  // 2. Create session (login immediately)
  await AW.account.createSession(email, password);

  // 3. Get account to get real userId
  const account = await AW.account.get();

  // 4. Create restaurant profile in DB
  await AW.db.createDoc(DB_ID, COL_RESTAURANTS, account.$id, {
    email,
    restaurantName,
    ownerName,
    phone,
    city,
    restaurantType,
    plan: 'trial',
    trialEnds: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: true
  });

  // 5. Cache user
  sessionStorage.setItem('armenu_user', JSON.stringify({
    id: account.$id,
    email: account.email,
    restaurantName,
    ownerName,
    plan: 'trial'
  }));

  return account;
}

// ── LOGIN ──
async function authLogin(email, password) {
  // 1. Create Appwrite session
  await AW.account.createSession(email, password);

  // 2. Get account info
  const account = await AW.account.get();

  // 3. Get restaurant profile
  const profile = await AW.db.getDoc(DB_ID, COL_RESTAURANTS, account.$id);

  // 4. Cache user
  sessionStorage.setItem('armenu_user', JSON.stringify({
    id: account.$id,
    email: account.email,
    restaurantName: profile.restaurantName,
    ownerName: profile.ownerName,
    plan: profile.plan || 'trial',
    trialEnds: profile.trialEnds
  }));

  return account;
}

// ── AUTH CHECK (call on every protected page) ──
async function authCheck(redirectTo = 'login.html') {
  try {
    const account = await AW.account.get();
    if (!account) throw new Error('Not logged in');

    // Try to get from cache first (fast)
    let user = JSON.parse(sessionStorage.getItem('armenu_user') || 'null');

    if (!user || user.id !== account.$id) {
      // Refresh from DB
      const profile = await AW.db.getDoc(DB_ID, COL_RESTAURANTS, account.$id);
      user = {
        id: account.$id,
        email: account.email,
        restaurantName: profile.restaurantName,
        ownerName: profile.ownerName,
        plan: profile.plan || 'trial',
        trialEnds: profile.trialEnds
      };
      sessionStorage.setItem('armenu_user', JSON.stringify(user));
    }

    return user;
  } catch (e) {
    sessionStorage.clear();
    window.location.href = redirectTo;
    return null;
  }
}

// ── LOGOUT ──
async function authLogout() {
  try {
    await AW.account.deleteSession('current');
  } catch (e) {}
  sessionStorage.clear();
  window.location.href = 'login.html';
}

// ── GET CACHED USER (fast, no network) ──
function getUser() {
  return JSON.parse(sessionStorage.getItem('armenu_user') || 'null');
}

// ── RESET PASSWORD (requires old password) ──
async function authResetPassword(email, oldPassword, newPassword) {
  await AW.account.createSession(email, oldPassword);
  await AW.account.updatePassword(newPassword, oldPassword);
}
