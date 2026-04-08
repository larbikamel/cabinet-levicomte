// ══════════════════════════════════════════════════
//  auth.js — Google OAuth 2.0
//  Cabinet Le Vicomte Web App
// ══════════════════════════════════════════════════
'use strict';

const CLIENT_ID = '975070087661-rdlfd9isneia3mmatiu42fqdlok6hko3.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';

let _tokenClient = null;
let _accessToken = null;
let _userInfo = null;
let _tokenExpiry = 0;

// ─── Initialisation ───────────────────────────────
function initAuth() {
  // Vérifier si un token est stocké localement
  const stored = localStorage.getItem('clv_token');
  if (stored) {
    try {
      const data = JSON.parse(stored);
      if (data.expiry > Date.now()) {
        _accessToken = data.token;
        _tokenExpiry = data.expiry;
        _userInfo = data.userInfo;
        return true; // Token valide
      }
    } catch(e) {}
  }
  return false;
}

// ─── Connexion Google ─────────────────────────────
function googleLogin() {
  const statusEl = document.getElementById('login-status');
  if (statusEl) statusEl.textContent = 'Connexion en cours…';

  if (!window.google) {
    if (statusEl) statusEl.textContent = 'Erreur : API Google non chargée. Vérifiez votre connexion.';
    return;
  }

  _tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: async (response) => {
      if (response.error) {
        if (statusEl) statusEl.textContent = 'Erreur : ' + response.error;
        showScreen('login');
        return;
      }
      _accessToken = response.access_token;
      _tokenExpiry = Date.now() + (response.expires_in * 1000);

      // Récupérer les infos utilisateur
      try {
        const userResp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: 'Bearer ' + _accessToken }
        });
        _userInfo = await userResp.json();
      } catch(e) {
        _userInfo = { name: 'Dr LARBI Kamel', email: '' };
      }

      // Sauvegarder localement
      localStorage.setItem('clv_token', JSON.stringify({
        token: _accessToken,
        expiry: _tokenExpiry,
        userInfo: _userInfo
      }));

      // Lancer l'app
      await initApp();
    },
  });

  _tokenClient.requestAccessToken({ prompt: 'consent' });
}

// ─── Déconnexion ──────────────────────────────────
function logout() {
  if (_accessToken) {
    google.accounts.oauth2.revoke(_accessToken);
  }
  _accessToken = null;
  _userInfo = null;
  _tokenExpiry = 0;
  localStorage.removeItem('clv_token');
  localStorage.removeItem('clv_db_cache');
  showScreen('login');
}

function confirmLogout() {
  if (confirm('Se déconnecter de Cabinet Le Vicomte ?')) {
    logout();
  }
}

// ─── Getters ──────────────────────────────────────
function getAccessToken() { return _accessToken; }
function getUserInfo() { return _userInfo; }
function isAuthenticated() { return !!_accessToken && Date.now() < _tokenExpiry; }

// ─── Renouvellement automatique ───────────────────
async function ensureToken() {
  if (!isAuthenticated() && _tokenClient) {
    return new Promise((resolve) => {
      _tokenClient.callback = async (response) => {
        if (!response.error) {
          _accessToken = response.access_token;
          _tokenExpiry = Date.now() + (response.expires_in * 1000);
          localStorage.setItem('clv_token', JSON.stringify({
            token: _accessToken, expiry: _tokenExpiry, userInfo: _userInfo
          }));
        }
        resolve(!response.error);
      };
      _tokenClient.requestAccessToken({ prompt: '' });
    });
  }
  return isAuthenticated();
}
