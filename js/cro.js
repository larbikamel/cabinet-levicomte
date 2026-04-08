// ══════════════════════════════════════════════════
//  cro.js — Module CRO mobile
// ══════════════════════════════════════════════════
'use strict';

const CRO_TYPES = [
  'Liposuccion', 'Liposuccion + Lipostructure',
  'Abdominoplastie', 'Abdominoplastie + Liposuccion',
  'Rhinoplastie', "Mammoplastie d'augmentation",
  'Mammoplastie de réduction', 'Mastopexie', 'Mastopexie + Augmentation',
  'Blépharoplastie supérieure', 'Blépharoplastie inférieure', 'Blépharoplastie 4 paupières',
  'Lifting cervicofacial', 'Gynécomastie', 'Otoplastie',
  'Brachioplastie', 'Cruroplastie', 'Mentoplastie', 'Lifting frontal',
  'Lipofilling facial', 'Labiaplastie', 'Exérèse cutanée / Cicatrice',
  'Reconstruction mammaire', 'Lipostructure des fesses (BBL)',
  'Chirurgie du tendon', 'Lambeau de couverture', 'Chirurgie du canal carpien',
  'Infection de la main', 'Chirurgie des brûlés', 'Autre'
];

function renderTabCRO(container, patient, db) {
  const cros = (db.cro || []).filter(c => c.patient_id === patient.id)
    .sort((a, b) => (b.date_intervention||'').localeCompare(a.date_intervention||''));

  container.innerHTML = `
    <div style="display:flex;justify-content:flex-end;margin-bottom:12px;">
      <button class="btn-primary" onclick="showAddCRO()">+ Nouveau CRO</button>
    </div>
    ${cros.length === 0 ? '<div style="text-align:center;color:var(--text3);padding:40px;">Aucun compte rendu</div>' :
      cros.map(c => `
        <div class="cro-item">
          <div class="cro-type">${esc(c.type_intervention||'')}</div>
          <div class="cro-date">${c.date_intervention ? formatDate(c.date_intervention) : '—'} · ${c.etablissement||'Cabinet Le Vicomte'}</div>
          ${c.technique ? `<div style="font-size:13px;color:var(--text2);margin-top:6px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${esc(c.technique.substring(0,150))}…</div>` : ''}
          <div class="cro-actions">
            <button class="btn-secondary btn-sm" onclick="editCRO(${c.id})">Modifier</button>
            <button class="btn-secondary btn-sm" onclick="printCROFromList(${c.id})">Imprimer</button>
          </div>
        </div>`).join('')}`;
}

function showAddCRO() {
  const container = document.getElementById('cro-form-content');
  if (!container) return;

  container.innerHTML = `
    <div class="form-group">
      <label class="form-label">Type d'intervention *</label>
      <select class="form-select" id="cro-type-mobile">
        <option value="">— Choisir —</option>
        ${CRO_TYPES.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Date d'intervention *</label>
      <input class="form-input" type="date" id="cro-date-mobile" value="${new Date().toISOString().split('T')[0]}">
    </div>
    <div class="form-group">
      <label class="form-label">Établissement</label>
      <input class="form-input" id="cro-etab-mobile" value="Cabinet Le Vicomte, Sousse">
    </div>
    <div class="form-group">
      <label class="form-label">Anesthésie</label>
      <select class="form-select" id="cro-anesth-mobile">
        <option value="générale">Générale</option>
        <option value="locale">Locale</option>
        <option value="loco-régionale">Loco-régionale</option>
        <option value="sédation">Sédation</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Durée (minutes)</label>
      <input class="form-input" type="number" id="cro-duree-mobile" placeholder="ex: 90">
    </div>
    <div class="form-group">
      <label class="form-label">Anesthésiste</label>
      <input class="form-input" id="cro-anesthesiste-mobile" placeholder="Dr. Prénom NOM">
    </div>
    <div class="form-group">
      <label class="form-label">Position opératoire</label>
      <input class="form-input" id="cro-position-mobile" placeholder="Décubitus dorsal…">
    </div>
    <div class="form-group">
      <label class="form-label">Technique opératoire</label>
      <textarea class="form-textarea" id="cro-technique-mobile" rows="6" placeholder="Description de la technique…"></textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Incidents peropératoires</label>
      <input class="form-input" id="cro-incidents-mobile" value="Aucun incident peropératoire notable">
    </div>
    <div class="form-group">
      <label class="form-label">Pertes sanguines</label>
      <input class="form-input" id="cro-pertes-mobile" placeholder="Minimes &lt; 100 mL">
    </div>
    <div class="form-group">
      <label class="form-label">Fermeture</label>
      <textarea class="form-textarea" id="cro-fermeture-mobile" rows="3" placeholder="Plans de fermeture…"></textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Suites opératoires immédiates</label>
      <textarea class="form-textarea" id="cro-suites-mobile" rows="3" placeholder="Réveil sans incident…"></textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Prescriptions post-opératoires</label>
      <textarea class="form-textarea" id="cro-prescriptions-mobile" rows="4" placeholder="Antalgiques, antibiotiques…"></textarea>
    </div>`;

  showModal('modal-add-cro');
}

async function saveCRO() {
  const get = id => document.getElementById(id)?.value?.trim() || '';
  const type = get('cro-type-mobile');
  const date = get('cro-date-mobile');
  if (!type) { toast('Choisissez un type d\'intervention', 'error'); return; }
  if (!date) { toast('Date requise', 'error'); return; }

  const db = getDB();
  const newCRO = {
    id: nextId('cro'),
    patient_id: _currentPatientId,
    type_intervention: type,
    date_intervention: date,
    chirurgien: 'Dr Larbi Kamel',
    etablissement: get('cro-etab-mobile') || 'Cabinet Le Vicomte, Sousse',
    anesthesie: get('cro-anesth-mobile') || 'générale',
    duree_minutes: parseInt(get('cro-duree-mobile')) || null,
    anesthesiste: get('cro-anesthesiste-mobile'),
    position: get('cro-position-mobile'),
    technique: get('cro-technique-mobile'),
    incidents: get('cro-incidents-mobile'),
    pertes_sanguines: get('cro-pertes-mobile'),
    fermeture: get('cro-fermeture-mobile'),
    suites_imm: get('cro-suites-mobile'),
    prescriptions: get('cro-prescriptions-mobile'),
    created_at: new Date().toISOString(),
    source: 'mobile'
  };

  db.cro.push(newCRO);
  await writeDB();
  closeModal('modal-add-cro');
  toast('CRO enregistré ✓', 'success');

  // Rafraîchir l'onglet CRO
  const patient = db.patients.find(p => p.id === _currentPatientId);
  if (patient) renderTabCRO(document.getElementById('dossier-content'), patient, db);
}

function editCRO(id) {
  toast('Modification — disponible dans la prochaine mise à jour');
}

function printCROFromList(id) {
  const db = getDB();
  const cro = db.cro.find(c => c.id === id);
  const patient = db.patients.find(p => p.id === _currentPatientId);
  if (!cro || !patient) return;
  printCRODocument(cro, patient);
}

function printCRODocument(cro, patient) {
  const patName = `${patient.prenom||''} ${(patient.nom||'').toUpperCase()}`.trim();
  const dob = patient.date_naissance ? formatDate(patient.date_naissance) + ` (${calcAge(patient.date_naissance)} ans)` : '';
  const today = new Date().toLocaleDateString('fr-FR', {day:'numeric', month:'long', year:'numeric'});

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
    <title>CRO ${patName}</title>
    <style>
      @page{margin:0;size:A4;}*{margin:0;padding:0;box-sizing:border-box;}
      body{font-family:'Times New Roman',serif;font-size:11px;color:#1a1a1a;}
      .page{width:210mm;min-height:297mm;padding:18mm 16mm 30mm;}
      .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:10px;border-bottom:2px solid #1558a3;margin-bottom:14px;}
      .doc-title{text-align:center;font-size:14px;font-weight:bold;color:#1558a3;text-decoration:underline;margin-bottom:12px;}
      .patient-box{background:#f0f4f8;border:1px solid #c8d4e0;border-radius:4px;padding:8px 14px;margin-bottom:12px;font-size:11px;line-height:1.9;display:flex;justify-content:space-between;}
      .section{margin:10px 0;}
      .section-title{font-weight:bold;color:#1558a3;font-size:10px;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #cdd;padding-bottom:2px;margin-bottom:4px;}
      .content{font-size:11px;line-height:1.7;white-space:pre-wrap;}
      .sig{margin-top:24px;display:flex;justify-content:flex-end;}
      .sig-box{width:200px;text-align:center;}
      .sig-line{border-top:1px solid #1558a3;margin-top:36px;padding-top:4px;font-size:9px;color:#777;}
      .footer{position:fixed;bottom:0;left:0;right:0;padding:5px 16mm;border-top:1.5px solid #1558a3;display:flex;justify-content:space-between;}
      .footer span{font-size:8px;color:#666;}
    </style>
  </head><body><div class="page">
    <div class="header">
      <div><div style="font-size:14px;font-weight:bold;color:#1558a3;">DR. LARBI <strong>Kamel</strong></div>
        <div style="font-size:9px;color:#555;margin-top:2px;">Chirurgien Plasticien, Réparateur & Esthétique<br>CNOM 9750</div></div>
      <div style="width:44px;height:44px;border:2px solid #1558a3;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:bold;color:#1558a3;">LK</div>
      <div style="text-align:right;font-size:9px;color:#555;">${today}</div>
    </div>
    <div class="doc-title">COMPTE RENDU OPÉRATOIRE</div>
    <div class="patient-box">
      <div><strong>Patient(e) :</strong> ${patName}<br>${dob?'<strong>Né(e) le :</strong> '+dob:''}
      </div>
      <div style="text-align:right;"><strong>Intervention :</strong> ${cro.type_intervention}<br>
        <strong>Date :</strong> ${cro.date_intervention ? formatDate(cro.date_intervention) : '—'}<br>
        ${cro.duree_minutes?'<strong>Durée :</strong> '+cro.duree_minutes+' min<br>':''}
        <strong>Anesthésie :</strong> ${cro.anesthesie||'—'}
      </div>
    </div>
    ${cro.position?`<div class="section"><div class="section-title">Position opératoire</div><div class="content">${cro.position}</div></div>`:''}
    ${cro.technique?`<div class="section"><div class="section-title">Technique opératoire</div><div class="content">${cro.technique}</div></div>`:''}
    ${cro.incidents?`<div class="section"><div class="section-title">Incidents peropératoires</div><div class="content">${cro.incidents}</div></div>`:''}
    ${cro.pertes_sanguines?`<div class="section"><div class="section-title">Pertes sanguines</div><div class="content">${cro.pertes_sanguines}</div></div>`:''}
    ${cro.fermeture?`<div class="section"><div class="section-title">Fermeture</div><div class="content">${cro.fermeture}</div></div>`:''}
    ${cro.suites_imm?`<div class="section"><div class="section-title">Suites immédiates</div><div class="content">${cro.suites_imm}</div></div>`:''}
    ${cro.prescriptions?`<div class="section"><div class="section-title">Prescriptions</div><div class="content">${cro.prescriptions}</div></div>`:''}
    <div class="sig"><div class="sig-box">
      <div style="font-size:10px;color:#555;">Sousse, le ${today}</div>
      <div class="sig-line">Dr. LARBI Kamel — CNOM 9750</div>
    </div></div>
  </div>
  <div class="footer">
    <span>Cabinet Le Vicomte — Blvd 14 Janvier 2011, Bureau 22 — 4000 Sousse</span>
    <span>(+216) 73 220 107 · dr.larbi@gmail.com</span>
  </div>
  <script>window.onload=()=>window.print();<\/script>
  </body></html>`;

  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); }
  else toast('Activez les pop-ups pour imprimer');
}
