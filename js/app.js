// ══════════════════════════════════════════════════
//  app.js — Logique principale
//  Cabinet Le Vicomte Web App
// ══════════════════════════════════════════════════
'use strict';

let _currentPatientId = null;
let _currentDossierTab = 'infos';
let _currentView = 'patients';

// ─── Démarrage de l'app ───────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Bouton login
  document.getElementById('btn-google-login').addEventListener('click', googleLogin);

  // Vérifier si déjà connecté
  if (initAuth()) {
    showScreen('loading');
    setLoadingText('Connexion en cours…');
    try {
      await initDB();
      await showScreen('app');
      renderPatients();
      updateSyncUI();
      updateUserUI();
    } catch(e) {
      showScreen('login');
      document.getElementById('login-status').textContent = 'Erreur : ' + e.message;
    }
  } else {
    showScreen('login');
  }

  // Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});

// ─── Initialisation après connexion ───────────────
async function initApp() {
  showScreen('loading');
  try {
    await initDB();
    showScreen('app');
    renderPatients();
    updateSyncUI();
    updateUserUI();
    buildEquipeDatalist();
  } catch(e) {
    showScreen('login');
    document.getElementById('login-status').textContent = 'Erreur : ' + e.message;
  }
}

// ─── Gestion des écrans ───────────────────────────
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('screen-' + name);
  if (el) el.classList.add('active');
}

function setLoadingText(text) {
  const el = document.getElementById('loading-text');
  if (el) el.textContent = text;
}

// ─── Gestion des vues ─────────────────────────────
function showView(name) {
  _currentView = name;

  // Nav buttons
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.view === name);
  });

  // Views
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const viewEl = document.getElementById('view-' + name);
  if (viewEl) viewEl.classList.add('active');

  // Rendu spécifique
  if (name === 'sync') updateSyncUI();
}

function renderCurrentView() {
  if (_currentView === 'patients') renderPatients();
  else if (_currentView === 'dossier' && _currentPatientId) openDossier(_currentPatientId);
}

// ─── Dossier patient ──────────────────────────────
function openDossier(patientId) {
  _currentPatientId = patientId;
  _currentView = 'dossier';

  const db = getDB();
  const patient = db.patients.find(p => p.id === patientId);
  if (!patient) return;

  // Activer la vue dossier
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-dossier').classList.add('active');

  // Nom dans le header
  document.getElementById('dossier-patient-name').textContent =
    `${patient.prenom || ''} ${(patient.nom || '').toUpperCase()}`.trim();

  // Activer l'onglet en cours
  switchDossierTab(_currentDossierTab);
}

function switchDossierTab(tab) {
  _currentDossierTab = tab;
  document.querySelectorAll('.dtab').forEach(t => {
    t.classList.toggle('active', t.getAttribute('onclick')?.includes(`'${tab}'`));
  });
  renderDossierTab(tab);
}

function renderDossierTab(tab) {
  const container = document.getElementById('dossier-content');
  const db = getDB();
  const patient = db.patients.find(p => p.id === _currentPatientId);
  if (!patient || !container) return;

  if (tab === 'infos')        renderTabInfos(container, patient, db);
  else if (tab === 'antecedents') renderTabAntecedents(container, patient, db);
  else if (tab === 'cro')     renderTabCRO(container, patient, db);
  else if (tab === 'preop')   renderTabPreop(container, patient, db);
  else if (tab === 'certificats') renderTabCertificats(container, patient, db);
  else if (tab === 'equipe')  renderTabEquipeDB(container, patient, db);
}

// ─── Onglet Infos patient ─────────────────────────
function renderTabInfos(container, patient, db) {
  const age = patient.date_naissance ? calcAge(patient.date_naissance) + ' ans' : '—';
  const interv = db.interventions.filter(i => i.patient_id === patient.id);
  const lastInterv = interv.sort((a,b) => (b.date_intervention||'').localeCompare(a.date_intervention||''))[0];

  container.innerHTML = `
    <div class="card">
      <div class="card-header"><div class="card-title">Identité</div></div>
      <div class="card-body">
        <div class="info-row"><span class="info-label">Nom complet</span><span class="info-value">${esc(patient.prenom||'')} ${esc((patient.nom||'').toUpperCase())}</span></div>
        <div class="info-row"><span class="info-label">Date de naissance</span><span class="info-value">${patient.date_naissance ? formatDate(patient.date_naissance) + ' · ' + age : '—'}</span></div>
        <div class="info-row"><span class="info-label">Sexe</span><span class="info-value">${patient.sexe === 'F' ? 'Féminin' : patient.sexe === 'M' ? 'Masculin' : '—'}</span></div>
        <div class="info-row"><span class="info-label">Téléphone</span><span class="info-value">${esc(patient.telephone||'—')}</span></div>
        <div class="info-row"><span class="info-label">Email</span><span class="info-value">${esc(patient.email||'—')}</span></div>
        <div class="info-row"><span class="info-label">Poids</span><span class="info-value">${patient.poids ? patient.poids + ' kg' : '—'}</span></div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title">Interventions (${interv.length})</div>
        <button class="btn-primary btn-sm" onclick="showAddIntervention()">+ Ajouter</button>
      </div>
      <div class="card-body" style="padding:0;">
        ${interv.length === 0 ? '<div style="padding:16px;color:var(--text3);text-align:center;">Aucune intervention</div>' :
          interv.map(i => `
            <div class="info-row" style="padding:12px 16px;">
              <div>
                <div style="font-weight:600;font-size:14px;">${esc(i.type_intervention||'')}</div>
                <div style="font-size:12px;color:var(--text3);">${i.date_intervention ? formatDate(i.date_intervention) : ''}</div>
              </div>
              <span class="badge-interv">${esc(i.statut||'planifiée')}</span>
            </div>`).join('')}
      </div>
    </div>`;
}

// ─── Onglet Antécédents ───────────────────────────
function renderTabAntecedents(container, patient, db) {
  const ant = db.antecedents.find(a => a.patient_id === patient.id) || {};

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div class="card-title">Antécédents</div>
        <button class="btn-primary btn-sm" onclick="saveAntecedents()">Enregistrer</button>
      </div>
      <div class="card-body">
        <div class="form-group">
          <label class="form-label">Antécédents médicaux</label>
          <textarea class="form-textarea" id="ant-medicaux" rows="4" placeholder="HTA, diabète, allergies…">${esc(ant.antecedents_medicaux||'')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Antécédents chirurgicaux</label>
          <textarea class="form-textarea" id="ant-chirurgicaux" rows="4" placeholder="Opérations antérieures…">${esc(ant.antecedents_chirurgicaux||'')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Antécédents familiaux</label>
          <textarea class="form-textarea" id="ant-familiaux" rows="3" placeholder="Pathologies familiales significatives…">${esc(ant.antecedents_familiaux||'')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Traitements en cours</label>
          <textarea class="form-textarea" id="ant-traitements" rows="3" placeholder="Médicaments, posologies…">${esc(ant.traitements||'')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Allergies</label>
          <input class="form-input" id="ant-allergies" value="${esc(ant.allergies||'')}" placeholder="Pénicilline, latex, iode…">
        </div>
      </div>
    </div>`;
}

async function saveAntecedents() {
  const db = getDB();
  const get = id => document.getElementById(id)?.value?.trim() || '';

  const existing = db.antecedents.findIndex(a => a.patient_id === _currentPatientId);
  const data = {
    patient_id: _currentPatientId,
    antecedents_medicaux:    get('ant-medicaux'),
    antecedents_chirurgicaux:get('ant-chirurgicaux'),
    antecedents_familiaux:   get('ant-familiaux'),
    traitements:             get('ant-traitements'),
    allergies:               get('ant-allergies'),
    updated_at: new Date().toISOString()
  };

  if (existing >= 0) {
    db.antecedents[existing] = { ...db.antecedents[existing], ...data };
  } else {
    data.id = nextId('antecedents');
    db.antecedents.push(data);
  }

  await writeDB();
  toast('Antécédents enregistrés ✓');
}

// ─── Onglet Préop ─────────────────────────────────
function renderTabPreop(container, patient, db) {
  const interv = db.interventions.filter(i => i.patient_id === patient.id);
  const lastInterv = interv.sort((a,b) => (b.date_intervention||'').localeCompare(a.date_intervention||''))[0];

  container.innerHTML = `
    <div class="card">
      <div class="card-header"><div class="card-title">Bilan préopératoire</div></div>
      <div class="card-body">
        <div class="form-group">
          <label class="form-label">Intervention</label>
          <input class="form-input" id="preop-intervention" value="${esc(lastInterv?.type_intervention||'')}" placeholder="Type d'intervention">
        </div>
        <div class="form-group">
          <label class="form-label">Date prévue</label>
          <input class="form-input" type="date" id="preop-date" value="${lastInterv?.date_intervention||''}">
        </div>
        <div class="section-title">Biologie</div>
        <div class="pill-group" id="bio-pills">
          ${renderBioPills()}
        </div>
        <div class="section-title" style="margin-top:16px;">Imagerie</div>
        <div class="pill-group" id="img-pills">
          ${renderImgPills()}
        </div>
        <div class="section-title" style="margin-top:16px;">Consultations</div>
        <div class="pill-group" id="cons-pills">
          ${renderConsPills()}
        </div>
      </div>
      <div class="card-action">
        <button class="btn-primary btn-full" onclick="printBilanPreop()">Imprimer les ordonnances</button>
      </div>
    </div>`;

  // Init pills
  document.querySelectorAll('.pill input').forEach(cb => {
    const lbl = cb.closest('.pill');
    cb.addEventListener('change', () => lbl.classList.toggle('checked', cb.checked));
  });
}

function renderBioPills() {
  const items = [
    ['bio-nfs','NFS'], ['bio-tp','TP'], ['bio-tca','TCA'], ['bio-fibri','Fibrinogène'],
    ['bio-glyc','Glycémie'], ['bio-creat','Créatinine'], ['bio-iono','Ionogramme'],
    ['bio-gpe','Groupage + RAI'], ['bio-hbs','AgHBs'], ['bio-hcv','VHC'], ['bio-vih','VIH']
  ];
  return items.map(([id, label]) =>
    `<label class="pill"><input type="checkbox" id="${id}">${label}</label>`
  ).join('');
}

function renderImgPills() {
  const items = [
    ['img-rx-thorax','Radio thorax'], ['img-ecg','ECG'], ['img-echo-sein','Écho mammaire'],
    ['img-mammo','Mammographie'], ['img-echo-abdo','Écho abdominale'],
    ['img-echo-doppler','Écho-doppler MI'], ['img-scanner-sinus','Scanner sinus']
  ];
  return items.map(([id, label]) =>
    `<label class="pill"><input type="checkbox" id="${id}">${label}</label>`
  ).join('');
}

function renderConsPills() {
  const items = [
    ['cons-anesth','Anesthésie (obligatoire)'], ['cons-cardio','Cardiologie'],
    ['cons-pneumo','Pneumologie'], ['cons-endocrino','Endocrinologie']
  ];
  return items.map(([id, label]) =>
    `<label class="pill checked"><input type="checkbox" id="${id}" ${id==='cons-anesth'?'checked':''}>${label}</label>`
  ).join('');
}

// ─── Helpers ──────────────────────────────────────
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' });
  } catch(e) { return dateStr; }
}

function calcAge(dateStr) {
  if (!dateStr) return '';
  const dob = new Date(dateStr);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  if (today.getMonth() < dob.getMonth() ||
      (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())) age--;
  return age;
}

function toast(msg, type) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast show';
  if (type === 'error') el.style.background = '#e24b4a';
  else if (type === 'success') el.style.background = '#1D9E75';
  else el.style.background = '#1a1a2e';
  setTimeout(() => el.classList.remove('show'), 3000);
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

function showModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'flex';
}

function updateUserUI() {
  const u = getUserInfo();
  if (!u) return;
  const nameEl = document.getElementById('user-name');
  const emailEl = document.getElementById('user-email');
  if (nameEl) nameEl.textContent = u.name || 'Dr LARBI Kamel';
  if (emailEl) emailEl.textContent = u.email || '';
}

function showAddIntervention() {
  toast('Fonctionnalité disponible dans la prochaine version', 'info');
}

function printBilanPreop() {
  toast("Impression bilan — fonctionnalité en cours d'implémentation");
}

function renderTabEquipeDB(container, patient, db) {
  container.innerHTML = `
    <div style="margin-bottom:12px;font-size:13px;color:var(--text3);">
      Gérez ici les membres de l'équipe — ils apparaîtront en suggestions dans les CRO.
    </div>
    <div id="equipe-manager-content"></div>`;
  renderEquipeManager();
}

function globalSearch(query) {
  const db = getDB();
  const container = document.getElementById('search-results');
  if (!container) return;
  if (!query || query.length < 2) { container.innerHTML = ''; return; }

  const q = query.toLowerCase();
  const results = db.patients.filter(p =>
    (p.nom||'').toLowerCase().includes(q) ||
    (p.prenom||'').toLowerCase().includes(q) ||
    (p.telephone||'').includes(q)
  );

  if (results.length === 0) {
    container.innerHTML = '<div style="text-align:center;color:var(--text3);padding:24px;">Aucun résultat</div>';
    return;
  }

  container.innerHTML = results.map(p => `
    <div class="search-result-item" onclick="openDossier(${p.id})">
      <div class="patient-avatar ${p.sexe==='F'?'female':''}">${(p.prenom||'?')[0]}${(p.nom||'?')[0]}</div>
      <div>
        <div style="font-weight:600;">${esc(p.prenom||'')} ${esc((p.nom||'').toUpperCase())}</div>
        <div style="font-size:13px;color:var(--text3);">${p.date_naissance ? calcAge(p.date_naissance)+' ans' : ''} ${p.telephone||''}</div>
      </div>
    </div>`).join('');
}

// ─── Import depuis fichier local ──────────────────
function showImportDB() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      // Vérifier que c'est bien une base Cabinet Le Vicomte
      if (!data.patients && !data.cro) {
        toast('Fichier non reconnu', 'error');
        return;
      }
      // Normaliser les clés
      const db = getDB();
      if (data.patients)      db.patients      = data.patients;
      if (data.interventions) db.interventions = data.interventions;
      if (data.cro)           db.cro           = data.cro;
      if (data.antecedents)   db.antecedents   = data.antecedents;
      if (data.documents)     db.documents     = data.documents;
      if (data.rdv)           db.rdv           = data.rdv;
      if (data.suivis)        db.suivis        = data.suivis;
      await writeDB();
      renderPatients();
      updateSyncUI();
      toast(`✓ Import réussi — ${(db.patients||[]).length} patients chargés`, 'success');
    } catch(e) {
      toast('Erreur lecture fichier : ' + e.message, 'error');
    }
  };
  input.click();
}
