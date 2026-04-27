function saveSession(token, user) {
  localStorage.setItem(CONFIG.TOKEN_KEY, token);
  localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user));
  localStorage.setItem(CONFIG.ROLE_KEY, user.role);
  localStorage.setItem(CONFIG.USERNAME_KEY, user.nombre + ' ' + user.apellido);
}

function getToken() {
  return localStorage.getItem(CONFIG.TOKEN_KEY) || null;
}

function getUser() {
  const userStr = localStorage.getItem(CONFIG.USER_KEY);
  return userStr ? JSON.parse(userStr) : null;
}

function decodeToken() {
  const token = getToken();
  if (!token) return null;
  
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch (err) {
    return null;
  }
}

function getTokenExpiresAt() {
  const payload = decodeToken();
  if (!payload || !payload.exp) return null;
  return new Date(payload.exp * 1000);
}

function getTokenRemainingMs() {
  const token = getToken();
  if (!token) return 0;
  const expiresAt = getTokenExpiresAt();
  if (!expiresAt) return 0;
  return Math.max(0, expiresAt.getTime() - Date.now());
}

function getUserRole() {
  const payload = decodeToken();
  if (!payload) return null;
  return payload.role || (payload.roles && payload.roles[0]) || null;
}

function getUserName() {
  const payload = decodeToken();
  if (!payload) return null;
  return payload.nombre || payload.sub || null;
}

function isAuthenticated() {
  const token = getToken();
  if (!token) return false;
  
  const payload = decodeToken();
  if (!payload || !payload.exp) return false;
  
  return payload.exp > Date.now() / 1000;
}

function logout() {
  localStorage.removeItem(CONFIG.TOKEN_KEY);
  localStorage.removeItem(CONFIG.USER_KEY);
  localStorage.removeItem(CONFIG.ROLE_KEY);
  localStorage.removeItem(CONFIG.USERNAME_KEY);
  
  if (window.supabaseClient) {
    supabaseClient.auth.signOut().catch(console.error);
  }
  
  window.location.replace('/pages/login.html');
}

function requireAuth() {
  if (!isAuthenticated()) {
    logout();
  }
}

function requireAdmin() {
  requireAuth();
  if (getUserRole() !== 'ADMIN') {
    window.location.replace('/pages/dashboard.html');
  }
}

window.Auth = {
  saveSession, 
  getToken, 
  getUser, 
  decodeToken,
  getTokenExpiresAt, 
  getTokenRemainingMs,
  getUserRole, 
  getUserName, 
  isAuthenticated,
  logout, 
  requireAuth, 
  requireAdmin
};
