// ══════════════════════════════════════════════════
//  patients.js — Gestion de la liste patients
// ══════════════════════════════════════════════════
'use strict';

let _patientFilter = '';

function renderPatients() {
  const db = getDB();
  const container = document.getElementById('patient-list');
  if (!container) return;

  const q = _patientFilter.toLowerCase();
  let patients = (db.patients || []).slice()
    .sort((a, b) => (a.nom||'').localeCompare(b.nom||'', 'fr'));

  if (q) {
    patients = patients.filter(p =>
      (p.nom||'').toLowerCase().includes(q) ||
      (p.prenom||'').toLowerCase().includes(q) ||
      (p.telephone||'').includes(q)
    );
  }

  // Mettre à jour le compteur
  const countEl = document.getElementById('header-patient-count');
  if (countEl) countEl.textContent = `${(db.patients||[]).length} patient${(db.patients||[]).length > 1 ? 's' : ''}`;

  if (patients.length === 0) {
    container.innerHTML = `
      <div class="patient-empty">
        <div class="patient-empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.4"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <div style="font-size:16px;font-weight:600;color:var(--text2);margin-bottom:6px;">${q ? 'Aucun résultat' : 'Aucun patient'}</div>
        <div style="font-size:14px;">${q ? 'Essayez un autre nom' : 'Appuyez sur + pour ajouter un patient'}</div>
      </div>`;
    return;
  }

  // Grouper par lettre
  let lastLetter = '';
  container.innerHTML = patients.map(p => {
    const letter = (p.nom||'?')[0].toUpperCase();
    const header = letter !== lastLetter ? `<div style="padding:8px 16px 4px;font-size:12px;font-weight:700;color:var(--text3);background:var(--bg);letter-spacing:0.1em;">${letter}</div>` : '';
    lastLetter = letter;

    const initiales = ((p.prenom||'?')[0] + (p.nom||'?')[0]).toUpperCase();
    const age = p.date_naissance ? calcAge(p.date_naissance) + ' ans' : '';
    const db = getDB();
    const interventions = db.interventions.filter(i => i.patient_id === p.id);
    const lastInterv = interventions.sort((a,b) => (b.date_intervention||'').localeCompare(a.date_intervention||''))[0];

    return `${header}
      <div class="patient-item" onclick="openDossier(${p.id})">
        <div class="patient-avatar ${p.sexe==='F'?'female':''}">${initiales}</div>
        <div class="patient-info">
          <div class="patient-name">${esc(p.prenom||'')} ${esc((p.nom||'').toUpperCase())}</div>
          <div class="patient-meta">${[age, p.telephone||'', lastInterv?.type_intervention||''].filter(Boolean).join(' · ')}</div>
        </div>
        <svg class="patient-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
      </div>`;
  }).join('');
}

function filterPatients(value) {
  _patientFilter = value;
  renderPatients();
}

// ─── Ajouter un patient ───────────────────────────
function showAddPatient() {
  // Reset form
  ['np-prenom','np-nom','np-tel'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const ddnEl = document.getElementById('np-ddn');
  if (ddnEl) ddnEl.value = '';
  const sexeEl = document.getElementById('np-sexe');
  if (sexeEl) sexeEl.value = '';

  showModal('modal-add-patient');
  setTimeout(() => document.getElementById('np-prenom')?.focus(), 100);
}

async function saveNewPatient() {
  const prenom = document.getElementById('np-prenom')?.value?.trim();
  const nom = document.getElementById('np-nom')?.value?.trim();
  if (!prenom || !nom) {
    toast('Prénom et nom obligatoires', 'error');
    return;
  }

  const db = getDB();
  const newPatient = {
    id: nextId('patients'),
    prenom,
    nom: nom.toUpperCase(),
    date_naissance: document.getElementById('np-ddn')?.value || null,
    sexe: document.getElementById('np-sexe')?.value || '',
    telephone: document.getElementById('np-tel')?.value?.trim() || '',
    created_at: new Date().toISOString()
  };

  db.patients.push(newPatient);
  await writeDB();
  closeModal('modal-add-patient');
  renderPatients();
  toast(`Dossier ${newPatient.prenom} ${newPatient.nom} créé ✓`, 'success');

  // Ouvrir le dossier
  setTimeout(() => openDossier(newPatient.id), 300);
}
