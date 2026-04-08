// ══════════════════════════════════════════════════
//  certificats.js — Certificats médicaux
// ══════════════════════════════════════════════════
'use strict';

const CERT_TYPES = [
  { id: 'repos', label: 'Arrêt de travail / Repos' },
  { id: 'presence', label: 'Certificat de présence' },
  { id: 'aptitude', label: 'Certificat d\'aptitude' },
  { id: 'medical_general', label: 'Certificat médical général' },
  { id: 'incapacite', label: 'Certificat d\'incapacité temporaire' },
];

function renderTabCertificats(container, patient, db) {
  const today = new Date().toISOString().split('T')[0];

  container.innerHTML = `
    <div class="card">
      <div class="card-header"><div class="card-title">Certificats médicaux</div></div>
      <div class="card-body">
        <div class="form-group">
          <label class="form-label">Type de certificat</label>
          <select class="form-select" id="cert-type" onchange="updateCertForm()">
            <option value="">— Choisir —</option>
            ${CERT_TYPES.map(t => `<option value="${t.id}">${t.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Date du certificat</label>
          <input class="form-input" type="date" id="cert-date" value="${today}">
        </div>
        <div id="cert-specific-fields"></div>
        <div class="form-group">
          <label class="form-label">Texte libre / précisions</label>
          <textarea class="form-textarea" id="cert-texte" rows="5" placeholder="Contenu du certificat…"></textarea>
        </div>
      </div>
      <div class="card-action">
        <button class="btn-primary btn-full" onclick="printCertificat()">Générer et imprimer</button>
      </div>
    </div>`;
}

function updateCertForm() {
  const type = document.getElementById('cert-type')?.value;
  const container = document.getElementById('cert-specific-fields');
  if (!container) return;

  if (type === 'repos') {
    container.innerHTML = `
      <div class="form-group">
        <label class="form-label">Durée du repos</label>
        <input class="form-input" id="cert-duree" placeholder="ex: 7 jours, 2 semaines">
      </div>
      <div class="form-group">
        <label class="form-label">Date de début</label>
        <input class="form-input" type="date" id="cert-debut" value="${new Date().toISOString().split('T')[0]}">
      </div>`;
    document.getElementById('cert-texte').placeholder = 'Repos et arrêt de travail prescrits suite à intervention chirurgicale…';
  } else if (type === 'presence') {
    container.innerHTML = `
      <div class="form-group">
        <label class="form-label">Motif de présence</label>
        <input class="form-input" id="cert-motif" placeholder="consultation, intervention chirurgicale…">
      </div>`;
  } else if (type === 'incapacite') {
    container.innerHTML = `
      <div class="form-group">
        <label class="form-label">Durée d'incapacité</label>
        <input class="form-input" id="cert-duree-inc" placeholder="ex: 3 semaines">
      </div>
      <div class="form-group">
        <label class="form-label">Taux d'incapacité (%)</label>
        <input class="form-input" type="number" id="cert-taux" placeholder="ex: 50">
      </div>`;
  } else {
    container.innerHTML = '';
  }
}

function printCertificat() {
  const db = getDB();
  const patient = db.patients.find(p => p.id === _currentPatientId);
  if (!patient) return;

  const type = document.getElementById('cert-type')?.value;
  if (!type) { toast('Choisissez un type de certificat', 'error'); return; }

  const patName = `${patient.prenom||''} ${(patient.nom||'').toUpperCase()}`.trim();
  const dob = patient.date_naissance ? formatDate(patient.date_naissance) + ` (${calcAge(patient.date_naissance)} ans)` : '';
  const certDate = document.getElementById('cert-date')?.value;
  const texte = document.getElementById('cert-texte')?.value?.trim() || '';
  const today = certDate ? new Date(certDate).toLocaleDateString('fr-FR', {day:'numeric', month:'long', year:'numeric'}) : new Date().toLocaleDateString('fr-FR', {day:'numeric', month:'long', year:'numeric'});
  const typeLabel = CERT_TYPES.find(t => t.id === type)?.label || 'Certificat médical';

  // Construire le contenu
  let contenu = texte;
  if (!contenu) {
    const get = id => document.getElementById(id)?.value?.trim() || '';
    if (type === 'repos') {
      const duree = get('cert-duree') || '—';
      const debut = get('cert-debut') ? formatDate(get('cert-debut')) : '—';
      contenu = `Je soussigné, Dr LARBI Kamel, Chirurgien Plasticien et Esthétique, certifie avoir examiné en consultation ce jour :\n\n${patName}${dob ? ', né(e) le ' + dob : ''}\n\nEt lui prescrit un repos avec arrêt de travail de ${duree}, à compter du ${debut}.\n\nCertificat établi à la demande de l'intéressé(e) et remis en main propre pour valoir ce que de droit.`;
    } else if (type === 'presence') {
      const motif = get('cert-motif') || 'consultation médicale';
      contenu = `Je soussigné, Dr LARBI Kamel, Chirurgien Plasticien et Esthétique, certifie que :\n\n${patName}${dob ? ', né(e) le ' + dob : ''}\n\nA été reçu(e) en ${motif} en mon cabinet ce jour, ${today}.\n\nCertificat établi à la demande de l'intéressé(e) et remis en main propre pour valoir ce que de droit.`;
    } else {
      contenu = `Je soussigné, Dr LARBI Kamel, Chirurgien Plasticien et Esthétique (CNOM 9750), certifie avoir examiné :\n\n${patName}${dob ? ', né(e) le ' + dob : ''}\n\n[Complétez le contenu du certificat]\n\nCertificat établi à la demande de l'intéressé(e) et remis en main propre pour valoir ce que de droit.`;
    }
  }

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
    <title>${typeLabel}</title>
    <style>
      @page{margin:0;size:A4;}*{margin:0;padding:0;box-sizing:border-box;}
      body{font-family:'Times New Roman',serif;font-size:12px;color:#1a1a1a;}
      .page{width:210mm;min-height:297mm;padding:20mm 18mm 30mm;}
      .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:12px;border-bottom:2px solid #1558a3;margin-bottom:20px;}
      .doc-title{text-align:center;font-size:15px;font-weight:bold;color:#1558a3;text-decoration:underline;letter-spacing:1px;margin-bottom:24px;}
      .content{font-size:12px;line-height:2;white-space:pre-wrap;text-align:justify;}
      .sig{margin-top:40px;display:flex;justify-content:flex-end;}
      .sig-box{width:220px;text-align:center;}
      .sig-line{border-top:1px solid #1558a3;margin-top:50px;padding-top:6px;font-size:10px;color:#555;}
      .footer{position:fixed;bottom:0;left:0;right:0;padding:6px 18mm;border-top:1.5px solid #1558a3;display:flex;justify-content:space-between;}
      .footer span{font-size:8px;color:#666;}
    </style>
  </head><body><div class="page">
    <div class="header">
      <div><div style="font-size:15px;font-weight:bold;color:#1558a3;">DR. LARBI <strong>Kamel</strong></div>
        <div style="color:#b8914a;font-size:9px;margin:2px 0;letter-spacing:2px;">— ⊙ —</div>
        <div style="font-size:9px;color:#555;line-height:1.5;">Chirurgien Plasticien, Réparateur & Esthétique<br>CNOM 9750 — Cabinet Le Vicomte, Sousse</div></div>
      <div style="text-align:right;">
        <div style="font-size:11px;font-weight:bold;color:#1558a3;direction:rtl;">الدكتور كمال العربي</div>
        <div style="font-size:9px;color:#555;direction:rtl;">إختصاصي في جراحة الترميم و التجميل</div>
        <div style="font-size:10px;color:#555;margin-top:4px;">Sousse, le ${today}</div>
      </div>
    </div>
    <div class="doc-title">${typeLabel.toUpperCase()}</div>
    <div class="content">${contenu.replace(/\n/g,'<br>')}</div>
    <div class="sig"><div class="sig-box">
      <div style="font-size:10px;color:#555;">Sousse, le ${today}</div>
      <div class="sig-line">Dr. LARBI Kamel — Chirurgien Plasticien<br>CNOM 9750 — Signature et cachet</div>
    </div></div>
  </div>
  <div class="footer">
    <span>Cabinet Le Vicomte — Blvd 14 Janvier 2011, Bureau 22 — 4000 Sousse</span>
    <span>(+216) 73 220 107 · dr.larbi@gmail.com · WhatsApp +21698442080</span>
  </div>
  <script>window.onload=()=>window.print();<\/script>
  </body></html>`;

  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); }
  else toast('Activez les pop-ups pour imprimer');
}
