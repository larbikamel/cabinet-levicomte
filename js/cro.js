// ══════════════════════════════════════════════════
//  cro.js — Module CRO mobile — Version complète
//  Identique à l'app Mac Cabinet Le Vicomte v29
// ══════════════════════════════════════════════════
'use strict';

let _editCROId = null;

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
    ${cros.length === 0 ? '<div style="text-align:center;color:var(--text3);padding:40px;">Aucun compte rendu opératoire</div>' :
      cros.map(c => `
        <div class="cro-item">
          <div class="cro-type">${esc(c.type_intervention||'')}</div>
          <div class="cro-date">${c.date_intervention?formatDate(c.date_intervention):'—'} · ${c.etablissement||'Cabinet Le Vicomte'}</div>
          ${c.technique?`<div style="font-size:13px;color:var(--text2);margin-top:6px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${esc(c.technique.substring(0,120))}…</div>`:''}
          <div class="cro-actions">
            <button class="btn-secondary btn-sm" onclick="editCROMobile(${c.id})">Modifier</button>
            <button class="btn-secondary btn-sm" onclick="printCROFromList(${c.id})">Imprimer</button>
            <button class="btn-secondary btn-sm" style="color:var(--danger);" onclick="deleteCROMobile(${c.id})">Supprimer</button>
          </div>
        </div>`).join('')}`;
}

function showAddCRO(croData) {
  _editCROId = croData ? croData.id : null;
  const container = document.getElementById('cro-form-content');
  if (!container) return;
  const d = croData || {};
  const sel = (id, opts, def) => `<select class="form-select" id="${id}">${opts.map(o=>`<option ${(d[id]||def||opts[0])===o?'selected':''}>${o}</option>`).join('')}</select>`;
  const inp = (id, ph, type) => `<input class="form-input" id="${id}" type="${type||'text'}" placeholder="${ph||''}" value="${esc(d[id]||'')}">`;

  container.innerHTML = `<div style="display:flex;flex-direction:column;gap:14px;">
    <div class="card" style="margin:0;"><div class="card-header"><div class="card-title">Informations générales</div></div><div class="card-body">
      <div class="form-group"><label class="form-label">Type d'intervention *</label>
        <select class="form-select" id="cro-type-mobile" onchange="onCROTypeMobileChange(this.value)">
          <option value="">— Choisir —</option>
          ${CRO_TYPES.map(t=>`<option value="${esc(t)}" ${d.type_intervention===t?'selected':''}>${esc(t)}</option>`).join('')}
        </select></div>
      <div class="form-group"><label class="form-label">Date *</label>
        <input class="form-input" type="date" id="cro-date-mobile" value="${d.date_intervention||new Date().toISOString().split('T')[0]}"></div>
      <div class="form-group"><label class="form-label">Durée (min)</label>${inp('cro-duree-mobile','ex: 90','number')}</div>
      <div class="form-group"><label class="form-label">Établissement</label>
        <input class="form-input" id="cro-etab-mobile" value="${esc(d.etablissement||'Cabinet Le Vicomte, Sousse')}"></div>
      <div class="form-group"><label class="form-label">Anesthésie</label>${sel('cro-anesth-mobile',['générale','locale','loco-régionale','sédation'],d.anesthesie)}</div>
    </div></div>

    <div class="card" style="margin:0;"><div class="card-header"><div class="card-title">Équipe opératoire</div></div><div class="card-body">
      <div class="form-group"><label class="form-label">Anesthésiste</label>${inp('m-anesthesiste','Dr. Prénom NOM')}</div>
      <div class="form-group"><label class="form-label">Technicien anesthésie</label>${inp('m-technicien','Prénom NOM')}</div>
      <div class="form-group"><label class="form-label">Instrumentiste</label>${inp('m-instrumentiste','Prénom NOM')}</div>
      <div class="form-group"><label class="form-label">Circulante</label>${inp('m-circulante','Prénom NOM')}</div>
      <div class="form-group"><label class="form-label">Salle opératoire</label>${inp('m-salle','ex: Salle 2')}</div>
    </div></div>

    <div id="cro-specific-mobile"></div>

    <div class="card" style="margin:0;"><div class="card-header"><div class="card-title">Technique opératoire</div>
      <button class="btn-primary btn-sm" onclick="generateCROTextMobile()">✦ Générer</button>
    </div><div class="card-body">
      <div class="form-group"><label class="form-label">Position</label>${inp('cro-position-mobile','Décubitus dorsal…')}</div>
      <div class="form-group"><label class="form-label">Texte technique</label>
        <textarea class="form-textarea" id="cro-technique-mobile" rows="8" placeholder="Appuyez sur ✦ Générer…">${esc(d.technique||'')}</textarea></div>
    </div></div>

    <div class="card" style="margin:0;"><div class="card-header"><div class="card-title">Suites opératoires</div></div><div class="card-body">
      <div class="form-group"><label class="form-label">Incidents peropératoires</label>
        <input class="form-input" id="cro-incidents-mobile" value="${esc(d.incidents||'Aucun incident peropératoire notable')}"></div>
      <div class="form-group"><label class="form-label">Pertes sanguines</label>${inp('cro-pertes-mobile','Minimes < 100 mL')}</div>
      <div class="form-group"><label class="form-label">Drainage</label>${inp('cro-drainage-mobile','Sans drainage / Redon aspiratif')}</div>
      <div class="form-group"><label class="form-label">Fermeture</label>
        <textarea class="form-textarea" id="cro-fermeture-mobile" rows="3">${esc(d.fermeture||'')}</textarea></div>
      <div class="form-group"><label class="form-label">Suites immédiates</label>
        <textarea class="form-textarea" id="cro-suites-mobile" rows="2">${esc(d.suites_imm||'Réveil sans incident, hémodynamique stable.')}</textarea></div>
      <div class="form-group"><label class="form-label">Prescriptions</label>
        <textarea class="form-textarea" id="cro-prescriptions-mobile" rows="5">${esc(d.prescriptions||'')}</textarea></div>
    </div></div>
  </div>`;

  // Restaurer équipe depuis notes
  try {
    const saved = JSON.parse(d.notes||'{}');
    if (saved._type === 'enriched_v1' && saved.equipe) {
      Object.entries(saved.equipe).forEach(([k,v]) => {
        const el = document.getElementById('m-'+k);
        if (el) el.value = v;
      });
    }
  } catch(e) {}

  showModal('modal-add-cro');
  if (d.type_intervention) setTimeout(() => onCROTypeMobileChange(d.type_intervention, d), 120);
}

function onCROTypeMobileChange(type, existingData) {
  const container = document.getElementById('cro-specific-mobile');
  if (!container) return;
  const d = existingData || {};
  const sel = (id, opts, def) => `<select class="form-select" id="${id}">${opts.map(o=>`<option ${(d[id]||def||opts[0])===o?'selected':''}>${o}</option>`).join('')}</select>`;
  const inp = (id, ph, t) => `<input class="form-input" id="${id}" type="${t||'text'}" placeholder="${ph||''}" value="${esc(d[id]||'')}">`;

  let html = '';

  if (type === "Mammoplastie d'augmentation" || type === 'Mastopexie + Augmentation') {
    html = `<div class="card" style="margin:0;"><div class="card-header"><div class="card-title">Prothèses mammaires</div></div><div class="card-body">
      <div class="form-group"><label class="form-label">Marque</label>${sel('sp-marque',['Mentor','Allergan (Natrelle)','Motiva','Sebbin','Polytech','Autre'])}</div>
      <div class="form-group"><label class="form-label">Référence</label>${inp('sp-ref','ex: CPG 322')}</div>
      <div class="form-group"><label class="form-label">Volume Droit (cc)</label>${inp('sp-vol-d','300','number')}</div>
      <div class="form-group"><label class="form-label">Volume Gauche (cc)</label>${inp('sp-vol-g','300','number')}</div>
      <div class="form-group"><label class="form-label">Profil</label>${sel('sp-profil',['Modéré','Modéré Plus','Haut','Extra-haut'])}</div>
      <div class="form-group"><label class="form-label">Surface</label>${sel('sp-surface',['Lisse','Microtexturée','Texturée'])}</div>
      <div class="form-group"><label class="form-label">Forme</label>${sel('sp-forme',['Ronde','Anatomique'])}</div>
      <div class="form-group"><label class="form-label">Loge</label>${sel('sp-loge',['Rétromusculaire','Rétroglandulaire','Dual-plane I','Dual-plane II','Dual-plane III'])}</div>
      <div class="form-group"><label class="form-label">Voie d\'abord</label>${sel('sp-voie',['Sous-mammaire','Péri-aréolaire','Axillaire'])}</div>
      <div class="form-group"><label class="form-label">Longueur incision</label>${inp('sp-incision-aug','ex: 4 cm')}</div>
    </div></div>`;

  } else if (type.includes('Abdominoplastie')) {
    html = `<div class="card" style="margin:0;"><div class="card-header"><div class="card-title">Données abdominoplastie</div></div><div class="card-body">
      <div class="form-group"><label class="form-label">Plicature</label>${sel('sp-plicature',['Plicature complète','Plicature sus-ombilicale','Plicature sous-ombilicale','Sans plicature'])}</div>
      <div class="form-group"><label class="form-label">Résection cutanée (cm)</label>${inp('sp-resection','ex: 8 x 22 cm')}</div>
      <div class="form-group"><label class="form-label">Ombilic</label>${sel('sp-ombilic',['Transposition ombilicale','Néo-ombilic','Conservation en place'])}</div>
      <div class="form-group"><label class="form-label">Liposuccion associée</label>${sel('sp-lipo',['Non','Flancs bilatéraux','Flancs + pubis','Flancs + dos','Autres zones'])}</div>
      <div class="form-group"><label class="form-label">Étapes réalisées</label><div class="pill-group">
        ${[['abdo-e1','Incision basse arciforme'],['abdo-e2','Décollement du lambeau'],['abdo-e3','Libération ombilicale'],
           ['abdo-e4','Plicature musculo-aponévrotique'],['abdo-e5','Résection cutanée'],['abdo-e6','Lipoaspiration'],
           ['abdo-e7','Ombilicoplastie'],['abdo-e8','Drainage redon'],['abdo-e9','Fermeture plans'],['abdo-e10','Ceinture contention']
          ].map(([id,label])=>`<label class="pill" id="${id}-lbl"><input type="checkbox" id="${id}" onchange="this.closest('label').classList.toggle('checked',this.checked)">${label}</label>`).join('')}
      </div></div>
    </div></div>`;

  } else if (type === 'Rhinoplastie') {
    html = `<div class="card" style="margin:0;"><div class="card-header"><div class="card-title">Données rhinoplastie</div></div><div class="card-body">
      <div class="form-group"><label class="form-label">Approche</label>${sel('sp-approche',['Ouverte (open rhinoplasty)','Fermée (endonasale)'])}</div>
      <div class="form-group"><label class="form-label">Traitement de la bosse</label>${sel('sp-bosse',['Résection à la râpe + ostéotomes','Résection à la râpe seule','Traitement conservateur','Sans traitement'])}</div>
      <div class="form-group"><label class="form-label">Ostéotomies</label>${sel('sp-osteo',['Ostéotomies latérales bilatérales','Ostéotomies latérales + médiale','Sans ostéotomie'])}</div>
      <div class="form-group"><label class="form-label">Septoplastie</label>${sel('sp-septo',['Non','Septoplastie de redressement','Résection partielle'])}</div>
      <div class="form-group"><label class="form-label">Greffes cartilagineuses</label>${sel('sp-greffe',['Aucune','Tip graft','Greffe de columelle','Spreader grafts','Multiples greffes'])}</div>
    </div></div>`;

  } else if (type === 'Mammoplastie de réduction' || type === 'Mastopexie') {
    const isRed = type === 'Mammoplastie de réduction';
    html = `<div class="card" style="margin:0;"><div class="card-header"><div class="card-title">Données ${isRed?'réduction':'mastopexie'}</div></div><div class="card-body">
      <div class="form-group"><label class="form-label">Technique de tracé</label>${sel('sp-tracage',['Wise (ancre)','Verticale','Hall-Findlay','Lejour','Péri-aréolaire'])}</div>
      <div class="form-group"><label class="form-label">Pédicule</label>${sel('sp-pedicule',['Supéro-médial','Supérieur','Inférieur','Central'])}</div>
      ${isRed?`<div class="form-group"><label class="form-label">Poids réséqué Droit (g)</label>${inp('sp-poids-d','ex: 450','number')}</div>
      <div class="form-group"><label class="form-label">Poids réséqué Gauche (g)</label>${inp('sp-poids-g','ex: 420','number')}</div>
      <div class="form-group"><label class="form-label">Anatomopathologie</label>${sel('sp-anapath',['Envoyée','Non envoyée'])}</div>`:''}
      <div class="form-group"><label class="form-label">Transposition aréolaire D (cm)</label>${inp('sp-transpo-d','ex: 8','number')}</div>
      <div class="form-group"><label class="form-label">Transposition aréolaire G (cm)</label>${inp('sp-transpo-g','ex: 8','number')}</div>
    </div></div>`;

  } else if (type === 'Gynécomastie') {
    html = `<div class="card" style="margin:0;"><div class="card-header"><div class="card-title">Données gynécomastie</div></div><div class="card-body">
      <div class="form-group"><label class="form-label">Grade de Simon</label>${sel('sp-grade',['I','IIa','IIb','III'])}</div>
      <div class="form-group"><label class="form-label">Technique</label>${sel('sp-tech-gyne',['Liposuccion + exérèse glande','Liposuccion seule','Exérèse glande seule','Liposuccion + exérèse + plastie cutanée'])}</div>
      <div class="form-group"><label class="form-label">Volume aspiré Droit (ml)</label>${inp('sp-vol-d','ex: 300','number')}</div>
      <div class="form-group"><label class="form-label">Volume aspiré Gauche (ml)</label>${inp('sp-vol-g','ex: 280','number')}</div>
      <div class="form-group"><label class="form-label">Poids réséqué Droit (g)</label>${inp('sp-poids-d','ex: 45','number')}</div>
      <div class="form-group"><label class="form-label">Poids réséqué Gauche (g)</label>${inp('sp-poids-g','ex: 40','number')}</div>
    </div></div>`;

  } else if (type.includes('Blépharoplastie')) {
    html = `<div class="card" style="margin:0;"><div class="card-header"><div class="card-title">Données blépharoplastie</div></div><div class="card-body">
      <div class="form-group"><label class="form-label">Paupières traitées</label>${sel('sp-paupiere',['Supérieures bilatérales','Inférieures bilatérales','4 paupières'])}</div>
      <div class="form-group"><label class="form-label">Anesthésie locale</label>${sel('sp-anesthesie-blepha',['Locale + sédation','Générale','Locale seule'])}</div>
      <div class="form-group"><label class="form-label">Résection sup. Droite (mm)</label>${inp('sp-resec-sup-d','ex: 8','number')}</div>
      <div class="form-group"><label class="form-label">Résection sup. Gauche (mm)</label>${inp('sp-resec-sup-g','ex: 8','number')}</div>
      <div class="form-group"><label class="form-label">Voie inférieure</label>${sel('sp-voie-inf',['Transcutanée','Transconjonctivale'])}</div>
      <div class="form-group"><label class="form-label">Canthopexie</label>${sel('sp-canthopexie',['Non','Canthopexie latérale','Canthopexie médiale'])}</div>
    </div></div>`;

  } else if (type === 'Liposuccion' || type === 'Liposuccion + Lipostructure') {
    html = `<div class="card" style="margin:0;"><div class="card-header"><div class="card-title">Données liposuccion</div></div><div class="card-body">
      <div class="form-group"><label class="form-label">Zones traitées</label>${inp('sp-zones','Abdomen, flancs, cuisses…')}</div>
      <div class="form-group"><label class="form-label">Volume total aspiré (ml)</label>${inp('sp-volumes','ex: 2500','number')}</div>
      <div class="form-group"><label class="form-label">Calibre canules</label><input class="form-input" id="sp-canules" value="${esc(d['sp-canules']||'3-4 mm')}"></div>
      ${type==='Liposuccion + Lipostructure'?`
      <div class="form-group"><label class="form-label">Volume réinjecté (ml)</label>${inp('sp-lipostructure','ex: 200','number')}</div>
      <div class="form-group"><label class="form-label">Zone de réinjection</label>${inp('sp-zone-greffe','ex: fesses, visage…')}</div>`:''}
    </div></div>`;
  }

  container.innerHTML = html;

  // Restaurer les valeurs sp-* si édition
  if (existingData) {
    try {
      const saved = JSON.parse(existingData.notes||'{}');
      if (saved._type === 'enriched_v1' && saved.specific) {
        Object.entries(saved.specific).forEach(([k,v]) => {
          const el = document.getElementById(k);
          if (el) el.value = v;
        });
        (saved.etapes||[]).forEach(id => {
          const cb = document.getElementById(id);
          if (cb) { cb.checked = true; cb.closest('label')?.classList.add('checked'); }
        });
      }
    } catch(e) {}
  }
}

function generateCROTextMobile() {
  const type = document.getElementById('cro-type-mobile')?.value;
  if (!type) { toast("Choisissez d'abord un type d'intervention", 'error'); return; }

  const db = getDB();
  const patient = db.patients.find(p => p.id === _currentPatientId) || {};
  const patDesc = [patient.prenom+' '+(patient.nom||'').toUpperCase(),
    patient.date_naissance?calcAge(patient.date_naissance)+' ans':'',
    patient.poids?patient.poids+' kg':''].filter(Boolean).join(', ');

  const g = id => document.getElementById(id)?.value?.trim() || '';
  const anesth = g('m-anesthesiste');
  const duree = g('cro-duree-mobile');
  const sfx = duree ? ' Durée opératoire : '+duree+' minutes.' : '';
  let texte = '';

  if (type === "Mammoplastie d'augmentation" || type === 'Mastopexie + Augmentation') {
    const marque=g('sp-marque')||'[marque]', ref=g('sp-ref'), volD=g('sp-vol-d'), volG=g('sp-vol-g');
    const profil=g('sp-profil')||'Modéré Plus', surface=g('sp-surface')||'Lisse';
    const forme=g('sp-forme')||'Ronde', loge=g('sp-loge')||'Rétromusculaire', voie=g('sp-voie')||'Sous-mammaire';
    const incision=g('sp-incision-aug');
    const voieLow=voie.toLowerCase();
    const inc=voieLow.includes('sous-mammaire')?`incision dans le sillon sous-mammaire${incision?' de '+incision:' de longueur adaptée'}`
      :voieLow.includes('aréolaire')?`incision péri-aréolaire inférieure${incision?' de '+incision:''}`
      :voieLow.includes('axillaire')?`incision axillaire${incision?' de '+incision:''}`:voieLow;
    const prep=loge.toLowerCase().includes('rétromusculaire')?'Décollement en plan rétromusculaire (sous le grand pectoral), hémostase soigneuse.'
      :loge.toLowerCase().includes('rétroglandulaire')?'Décollement en plan rétroglandulaire, hémostase soigneuse.'
      :`Décollement en ${loge}, hémostase soigneuse.`;
    const descD=`${marque}${ref?' (réf. '+ref+')':''} — ${volD?volD+' cc':'[volume] cc'} — profil ${profil} — surface ${surface} — ${forme}`;
    const descG=`${marque}${ref?' (réf. '+ref+')':''} — ${volG?volG+' cc':'[volume] cc'} — profil ${profil} — surface ${surface} — ${forme}`;
    texte=`${patDesc}, installée en décubitus dorsal.${anesth?' Anesthésie générale : '+anesth+'.':''}\n\nPréparation champ opératoire stérile. Infiltration vasoconstrictrice locale.\n\nCôté droit : ${inc}. ${prep} Test eau oxygénée négatif. Rinçage sérum physiologique. Prothèse ${descD}. Vérification position et symétrie.\n\nCôté gauche : même procédure. Prothèse ${descG}. Symétrie bilatérale vérifiée en position semi-assise.\n\nFermeture loge Vicryl 2/0. Sous-cutané Vicryl 3/0. Surjet intradermique PDS 3/0. Soutien-gorge mis en place.${sfx} Réveil sans incident.`;

  } else if (type.includes('Abdominoplastie')) {
    const plicature=g('sp-plicature')||'plicature complète', resection=g('sp-resection'), lipo=g('sp-lipo');
    texte=`${patDesc}, installée en décubitus dorsal.${anesth?' Anesthésie générale : '+anesth+'.':''}\n\nMarquage préopératoire en position debout. Incision basse arciforme sus-pubienne. Décollement du lambeau jusqu\'aux rebords costaux. Désombilic.\n\n${plicature} des grands droits au PDS 1.\n\n${lipo&&lipo!=='Non'?'Liposuccion : '+lipo+'. ':''}${resection?'Résection cutanée '+resection+'. ':'Résection du tablier excédentaire. '}Transposition ombilicale. Vérification esthétique.\n\nFermeture Vicryl 2/0, 3/0, surjet PDS 3/0. Redon aspiratif. Ceinture de contention.${sfx} Réveil sans incident.`;

  } else if (type === 'Rhinoplastie') {
    const approche=g('sp-approche')||'Ouverte', bosse=g('sp-bosse'), osteo=g('sp-osteo'), septo=g('sp-septo');
    texte=`${patDesc}, décubitus dorsal tête en extension.${anesth?' Anesthésie générale : '+anesth+'.':''}\n\nInfiltration vasoconstrictrice. Approche ${approche.toLowerCase()}.\n\n${bosse?bosse+'. ':''}${osteo?osteo+'. ':''}${septo&&septo!=='Non'?septo+'. ':''}Traitement de la pointe. Vérification symétrie.\n\nContention nasale mise en place.${sfx} Réveil sans incident.`;

  } else if (type === 'Gynécomastie') {
    const grade=g('sp-grade')||'IIa', tech=g('sp-tech-gyne'), volD=g('sp-vol-d'), volG=g('sp-vol-g'), pD=g('sp-poids-d'), pG=g('sp-poids-g');
    texte=`M. ${(patient.nom||'').toUpperCase()}${patient.date_naissance?', '+calcAge(patient.date_naissance)+' ans':''}, gynécomastie grade ${grade}.${anesth?' Anesthésiste : '+anesth+'.':''}\n\n${tech&&tech.includes('Liposuccion')?`Infiltration tumescente. Liposuccion : droit ${volD?volD+' ml':'[v] ml'}, gauche ${volG?volG+' ml':'[v] ml'}.\n\n`:''} ${tech&&tech.includes('exérèse')?`Incisions péri-aréolaires. Résection glandulaire : droit ${pD?pD+' g':'[p] g'}, gauche ${pG?pG+' g':'[p] g'}. Anatomopathologie envoyée.`:''}\n\nFermeture PDS 4/0. Compression mise en place.${sfx} Réveil sans incident.`;

  } else if (type === 'Liposuccion' || type === 'Liposuccion + Lipostructure') {
    const zones=g('sp-zones')||'[zones]', vol=g('sp-volumes'), canules=g('sp-canules')||'3-4 mm';
    texte=`${patDesc}, installé(e) selon les zones.${anesth?' Anesthésiste : '+anesth+'.':''}\n\nMarquage préopératoire debout. Infiltration tumescente solution de Klein. Liposuccion canule ${canules}, technique va-et-vient multidirectionnel.\n\nZones traitées : ${zones}. Volume aspiré : ${vol?vol+' ml':'[volume] ml'}. Vérification symétrie.\n\nFermeture orifices fils simples. Compression immédiate.${sfx} Réveil sans incident.`;

  } else {
    texte = `${patDesc}.\n\n[Technique opératoire — ${type}]\n\n${sfx?sfx+' ':''} Réveil sans incident.`;
  }

  const el = document.getElementById('cro-technique-mobile');
  if (el) { el.value = texte.replace(/\n\n+/g,'\n\n').trim(); toast('Texte généré ✓', 'success'); }
}

async function saveCRO() {
  const get = id => document.getElementById(id)?.value?.trim()||'';
  const type=get('cro-type-mobile'), date=get('cro-date-mobile');
  if (!type) { toast("Choisissez un type d'intervention",'error'); return; }
  if (!date) { toast('Date requise','error'); return; }

  const db = getDB();
  const specific={};
  ['sp-marque','sp-ref','sp-vol-d','sp-vol-g','sp-profil','sp-surface','sp-forme','sp-loge','sp-voie',
   'sp-incision-aug','sp-plicature','sp-resection','sp-ombilic','sp-lipo','sp-approche','sp-bosse',
   'sp-osteo','sp-septo','sp-greffe','sp-tracage','sp-pedicule','sp-poids-d','sp-poids-g','sp-anapath',
   'sp-transpo-d','sp-transpo-g','sp-grade','sp-tech-gyne','sp-zones','sp-volumes','sp-canules',
   'sp-lipostructure','sp-zone-greffe','sp-paupiere','sp-anesthesie-blepha','sp-resec-sup-d',
   'sp-resec-sup-g','sp-voie-inf','sp-canthopexie'].forEach(id=>{
     const el=document.getElementById(id); if(el&&el.value) specific[id]=el.value;
  });
  const etapes=[];
  document.querySelectorAll('[id^="abdo-e"]').forEach(cb=>{if(cb.type==='checkbox'&&cb.checked)etapes.push(cb.id);});
  const equipe={anesthesiste:get('m-anesthesiste'),technicien:get('m-technicien'),instrumentiste:get('m-instrumentiste'),circulante:get('m-circulante'),salle:get('m-salle')};

  const croData={
    patient_id:_currentPatientId, type_intervention:type, date_intervention:date,
    chirurgien:'Dr Larbi Kamel', etablissement:get('cro-etab-mobile')||'Cabinet Le Vicomte, Sousse',
    anesthesie:get('cro-anesth-mobile')||'générale', duree_minutes:parseInt(get('cro-duree-mobile'))||null,
    anesthesiste:equipe.anesthesiste, technicien:equipe.technicien,
    instrumentiste:equipe.instrumentiste, circulante:equipe.circulante, salle:equipe.salle,
    position:get('cro-position-mobile'), technique:get('cro-technique-mobile'),
    incidents:get('cro-incidents-mobile'), pertes_sanguines:get('cro-pertes-mobile'),
    drainage:get('cro-drainage-mobile'), fermeture:get('cro-fermeture-mobile'),
    suites_imm:get('cro-suites-mobile'), prescriptions:get('cro-prescriptions-mobile'),
    notes:JSON.stringify({_type:'enriched_v1',specific,equipe,etapes}),
    source:'mobile', updated_at:new Date().toISOString()
  };

  if (_editCROId) {
    const idx=db.cro.findIndex(c=>c.id===_editCROId);
    if(idx>=0) db.cro[idx]={...db.cro[idx],...croData};
  } else {
    croData.id=nextId('cro'); croData.created_at=new Date().toISOString(); db.cro.push(croData);
  }

  await writeDB();
  closeModal('modal-add-cro');
  _editCROId=null;
  toast('CRO enregistré ✓','success');
  const patient=db.patients.find(p=>p.id===_currentPatientId);
  if(patient) renderTabCRO(document.getElementById('dossier-content'),patient,db);
}

function editCROMobile(id) {
  const db=getDB(), cro=db.cro.find(c=>c.id===id);
  if (!cro) return;
  showAddCRO(cro);
}

async function deleteCROMobile(id) {
  if (!confirm('Supprimer ce compte rendu ?')) return;
  const db=getDB(); db.cro=db.cro.filter(c=>c.id!==id);
  await writeDB(); toast('CRO supprimé','success');
  const patient=db.patients.find(p=>p.id===_currentPatientId);
  if(patient) renderTabCRO(document.getElementById('dossier-content'),patient,db);
}

function printCROFromList(id) {
  const db=getDB();
  const cro=db.cro.find(c=>c.id===id);
  const patient=db.patients.find(p=>p.id===_currentPatientId);
  if(cro&&patient) printCRODocument(cro,patient);
}

function printCRODocument(cro, patient) {
  const patName=`${patient.prenom||''} ${(patient.nom||'').toUpperCase()}`.trim();
  const dob=patient.date_naissance?formatDate(patient.date_naissance)+` (${calcAge(patient.date_naissance)} ans)`:'';
  const today=new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});
  let eq={};
  try{const s=JSON.parse(cro.notes||'{}');if(s._type==='enriched_v1')eq=s.equipe||{};}catch(e){}
  const anesth=cro.anesthesiste||eq.anesthesiste||'', instru=cro.instrumentiste||eq.instrumentiste||'', circu=cro.circulante||eq.circulante||'';
  const sec=(t,c)=>c?`<div style="margin:10px 0;"><div style="font-weight:bold;color:#1558a3;font-size:10px;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #cdd;padding-bottom:2px;margin-bottom:4px;">${t}</div><div style="font-size:11px;line-height:1.7;white-space:pre-wrap;">${c}</div></div>`:'';
  const html=`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>CRO ${patName}</title>
  <style>@page{margin:0;size:A4;}*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Times New Roman',serif;font-size:11px;color:#1a1a1a;}.page{width:210mm;min-height:297mm;padding:18mm 16mm 30mm;}.header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:10px;border-bottom:2px solid #1558a3;margin-bottom:14px;}.doc-title{text-align:center;font-size:14px;font-weight:bold;color:#1558a3;text-decoration:underline;letter-spacing:1.5px;margin-bottom:12px;}.patient-box{background:#f0f4f8;border:1px solid #c8d4e0;border-radius:4px;padding:8px 14px;margin-bottom:12px;font-size:11px;line-height:1.9;display:flex;justify-content:space-between;}.equipe-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;background:#f9f7f2;border:1px solid #e0d8c8;border-radius:4px;padding:8px 14px;margin-bottom:12px;font-size:10.5px;}.eq-lbl{font-size:8.5px;color:#999;text-transform:uppercase;letter-spacing:0.1em;}.sig{margin-top:24px;display:flex;justify-content:flex-end;}.sig-box{width:200px;text-align:center;}.sig-line{border-top:1px solid #1558a3;margin-top:36px;padding-top:4px;font-size:9px;color:#777;}.footer{position:fixed;bottom:0;left:0;right:0;padding:5px 16mm;border-top:1.5px solid #1558a3;display:flex;justify-content:space-between;}.footer span{font-size:8px;color:#666;}</style>
  </head><body><div class="page">
  <div class="header"><div><div style="font-size:14px;font-weight:bold;color:#1558a3;">DR. LARBI <strong>Kamel</strong></div><div style="font-size:9px;color:#555;margin-top:2px;">Chirurgien Plasticien, Réparateur &amp; Esthétique<br>CNOM 9750 — Cabinet Le Vicomte, Sousse</div></div>
  <div style="width:44px;height:44px;border:2px solid #1558a3;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:bold;color:#1558a3;">LK</div>
  <div style="text-align:right;font-size:9px;color:#555;"><div style="font-size:11px;font-weight:bold;color:#1558a3;direction:rtl;">الدكتور كمال العربي</div>${today}</div></div>
  <div class="doc-title">COMPTE RENDU OPÉRATOIRE</div>
  <div class="patient-box"><div><strong>Patient(e) :</strong> ${patName}${dob?'<br><strong>Né(e) le :</strong> '+dob:''}</div>
  <div style="text-align:right;"><strong>Intervention :</strong> ${cro.type_intervention}<br><strong>Date :</strong> ${cro.date_intervention?formatDate(cro.date_intervention):'—'}<br>${cro.duree_minutes?'<strong>Durée :</strong> '+cro.duree_minutes+' min<br>':''}<strong>Anesthésie :</strong> ${cro.anesthesie||'—'}</div></div>
  ${anesth||instru||circu?`<div class="equipe-grid"><div><div class="eq-lbl">Chirurgien</div><div>Dr LARBI KAMEL — CNOM 9750</div></div>${anesth?'<div><div class="eq-lbl">Anesthésiste</div><div>'+anesth+'</div></div>':''}${instru?'<div><div class="eq-lbl">Instrumentiste</div><div>'+instru+'</div></div>':''}${circu?'<div><div class="eq-lbl">Circulante</div><div>'+circu+'</div></div>':''}</div>`:''}
  ${sec('Position opératoire',cro.position)}${sec('Technique opératoire',cro.technique)}${sec('Incidents peropératoires',cro.incidents||'Aucun incident peropératoire notable.')}${sec('Pertes sanguines',cro.pertes_sanguines)}${sec('Drainage',cro.drainage)}${sec('Fermeture',cro.fermeture)}${sec('Suites immédiates',cro.suites_imm)}${sec('Prescriptions',cro.prescriptions)}
  <div class="sig"><div class="sig-box"><div style="font-size:10px;color:#555;">Sousse, le ${today}</div><div class="sig-line">Dr. LARBI Kamel — CNOM 9750<br>Chirurgien Plasticien</div></div></div>
  </div><div class="footer"><span>Cabinet Le Vicomte — Blvd 14 Janvier 2011, Bureau 22 — 4000 Sousse</span><span>(+216) 73 220 107 · dr.larbi@gmail.com</span></div>
  <script>window.onload=()=>window.print();<\/script></body></html>`;
  const w=window.open('','_blank'); if(w){w.document.write(html);w.document.close();}else toast('Activez les pop-ups pour imprimer');
}
