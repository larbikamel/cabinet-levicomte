// ══════════════════════════════════════════════════
//  drive.js — Google Drive API
//  Cabinet Le Vicomte Web App
// ══════════════════════════════════════════════════
'use strict';

const DB_FILENAME = 'cabinet_levicomte.json';
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

let _fileId = null;
let _db = null;
let _lastSync = null;
let _isSaving = false;

// ─── Structure de la base vide ────────────────────
function emptyDB() {
  return {
    patients: [],
    interventions: [],
    cro: [],
    antecedents: [],
    documents: [],
    rdv: [],
    suivis: [],
    equipe_db: {
      anesthesistes: [],
      techniciens: [],
      instrumentistes: [],
      circulantes: [],
      salles: []
    },
    version: '29',
    created_at: new Date().toISOString()
  };
}

// ─── Initialiser la DB depuis Drive ───────────────
async function initDB() {
  setLoadingText('Recherche de votre base de données…');

  try {
    // Chercher le fichier existant
    const token = getAccessToken();
    const searchResp = await fetch(
      `${DRIVE_API}/files?q=name='${DB_FILENAME}' and trashed=false&fields=files(id,name,modifiedTime)`,
      { headers: { Authorization: 'Bearer ' + token } }
    );
    const searchData = await searchResp.json();

    if (searchData.files && searchData.files.length > 0) {
      // Fichier trouvé — le charger
      _fileId = searchData.files[0].id;
      setLoadingText('Chargement de vos données…');
      await readDB();
    } else {
      // Fichier non trouvé — créer une nouvelle base
      setLoadingText('Création de votre base de données…');
      _db = emptyDB();
      await createDBFile();
    }

    _lastSync = new Date();
    return true;

  } catch(e) {
    console.error('initDB error:', e);
    // Fallback : utiliser le cache local
    const cached = localStorage.getItem('clv_db_cache');
    if (cached) {
      try {
        _db = JSON.parse(cached);
        setLoadingText('Mode hors-ligne — données en cache');
        await new Promise(r => setTimeout(r, 800));
        return true;
      } catch(e2) {}
    }
    throw new Error('Impossible de charger la base de données : ' + e.message);
  }
}

// ─── Lire la DB depuis Drive ──────────────────────
async function readDB() {
  if (!_fileId) return;
  const token = getAccessToken();
  const resp = await fetch(
    `${DRIVE_API}/files/${_fileId}?alt=media`,
    { headers: { Authorization: 'Bearer ' + token } }
  );
  if (!resp.ok) throw new Error('Lecture Drive impossible');
  _db = await resp.json();

  // Assurer les tableaux manquants
  _db.patients      = _db.patients      || [];
  _db.interventions = _db.interventions || [];
  _db.cro           = _db.cro           || [];
  _db.antecedents   = _db.antecedents   || [];
  _db.documents     = _db.documents     || [];
  _db.rdv           = _db.rdv           || [];
  _db.suivis        = _db.suivis        || [];
  _db.equipe_db     = _db.equipe_db     || { anesthesistes:[], techniciens:[], instrumentistes:[], circulantes:[], salles:[] };
  _db.equipe_db.anesthesistes  = _db.equipe_db.anesthesistes  || [];
  _db.equipe_db.techniciens    = _db.equipe_db.techniciens    || [];
  _db.equipe_db.instrumentistes= _db.equipe_db.instrumentistes|| [];
  _db.equipe_db.circulantes    = _db.equipe_db.circulantes    || [];
  _db.equipe_db.salles         = _db.equipe_db.salles         || [];

  // Cache local
  localStorage.setItem('clv_db_cache', JSON.stringify(_db));
  _lastSync = new Date();
}

// ─── Écrire la DB dans Drive ──────────────────────
async function writeDB() {
  if (_isSaving) return;
  _isSaving = true;
  try {
    await ensureToken();
    const token = getAccessToken();
    const content = JSON.stringify(_db, null, 2);
    const blob = new Blob([content], { type: 'application/json' });

    if (_fileId) {
      // Mettre à jour le fichier existant
      await fetch(`${DRIVE_UPLOAD}/files/${_fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: blob
      });
    } else {
      await createDBFile();
    }

    // Cache local
    localStorage.setItem('clv_db_cache', JSON.stringify(_db));
    _lastSync = new Date();
  } finally {
    _isSaving = false;
  }
}

// ─── Créer le fichier Drive ───────────────────────
async function createDBFile() {
  const token = getAccessToken();
  const content = JSON.stringify(_db, null, 2);

  // Multipart upload
  const boundary = '-------Cabinet_LV_Boundary';
  const metadata = JSON.stringify({ name: DB_FILENAME, mimeType: 'application/json' });
  const body = `--${boundary}\r\nContent-Type: application/json\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${content}\r\n--${boundary}--`;

  const resp = await fetch(`${DRIVE_UPLOAD}/files?uploadType=multipart&fields=id`, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': `multipart/related; boundary="${boundary}"`
    },
    body
  });
  const data = await resp.json();
  _fileId = data.id;
  localStorage.setItem('clv_file_id', _fileId);
}

// ─── Sync manuelle ────────────────────────────────
async function syncNow() {
  const syncBtn = document.querySelector('.sync-container .btn-primary');
  if (syncBtn) { syncBtn.disabled = true; syncBtn.textContent = 'Synchronisation…'; }
  try {
    await ensureToken();
    await readDB();
    renderCurrentView();
    updateSyncUI();
    toast('Base de données synchronisée ✓', 'success');
  } catch(e) {
    toast('Erreur de synchronisation : ' + e.message, 'error');
  } finally {
    if (syncBtn) { syncBtn.disabled = false; syncBtn.textContent = 'Synchroniser maintenant'; }
  }
}

// ─── Helpers DB ───────────────────────────────────
function getDB() { return _db; }
function getLastSync() { return _lastSync; }

function nextId(table) {
  const arr = _db[table] || [];
  return arr.length > 0 ? Math.max(...arr.map(x => x.id || 0)) + 1 : 1;
}

function updateSyncUI() {
  const timeEl = document.getElementById('sync-last-time');
  const infoEl = document.getElementById('sync-db-info');
  if (timeEl && _lastSync) {
    timeEl.textContent = 'Dernière sync : ' + _lastSync.toLocaleTimeString('fr-FR');
  }
  if (infoEl && _db) {
    infoEl.textContent = `${(_db.patients||[]).length} patients · ${(_db.cro||[]).length} CRO`;
  }
}
