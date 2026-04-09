// ══════════════════════════════════════════════════
//  equipe.js — Carnet d'adresses équipe opératoire
//  Cabinet Le Vicomte Web App
// ══════════════════════════════════════════════════
'use strict';

// ─── Construire les datalists HTML ────────────────
function buildEquipeDatalist() {
  const db = getDB();
  const eq = db.equipe_db || {};

  // Supprimer anciens datalists
  ['dl-anesth','dl-tech','dl-instru','dl-circu','dl-salle'].forEach(id => {
    const old = document.getElementById(id);
    if (old) old.remove();
  });

  // Créer nouveaux datalists
  const lists = [
    ['dl-anesth',   eq.anesthesistes  || []],
    ['dl-tech',     eq.techniciens    || []],
    ['dl-instru',   eq.instrumentistes|| []],
    ['dl-circu',    eq.circulantes    || []],
    ['dl-salle',    eq.salles         || []],
  ];

  lists.forEach(([id, items]) => {
    const dl = document.createElement('datalist');
    dl.id = id;
    items.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      dl.appendChild(opt);
    });
    document.body.appendChild(dl);
  });
}

// ─── Lier les datalists aux champs équipe ─────────
function attachEquipeAutocomplete() {
  buildEquipeDatalist();
  const map = {
    'm-anesthesiste':  'dl-anesth',
    'm-technicien':    'dl-tech',
    'm-instrumentiste':'dl-instru',
    'm-circulante':    'dl-circu',
    'm-salle':         'dl-salle',
  };
  Object.entries(map).forEach(([inputId, listId]) => {
    const el = document.getElementById(inputId);
    if (el) {
      el.setAttribute('list', listId);
      el.setAttribute('autocomplete', 'off');
      // Sauvegarder quand on quitte le champ
      el.addEventListener('blur', () => saveEquipeMember(inputId, el.value.trim()));
    }
  });
}

// ─── Sauvegarder un nouveau membre ────────────────
async function saveEquipeMember(fieldId, value) {
  if (!value || value.length < 3) return;
  const db = getDB();
  const eq = db.equipe_db;

  const map = {
    'm-anesthesiste':   'anesthesistes',
    'm-technicien':     'techniciens',
    'm-instrumentiste': 'instrumentistes',
    'm-circulante':     'circulantes',
    'm-salle':          'salles',
  };

  const key = map[fieldId];
  if (!key) return;

  // Ajouter si pas déjà présent
  if (!eq[key].includes(value)) {
    eq[key].push(value);
    eq[key].sort();
    await writeDB();
    buildEquipeDatalist(); // Mettre à jour les suggestions
  }
}

// ─── Page de gestion de l'équipe ──────────────────
function renderEquipeManager() {
  const db = getDB();
  const eq = db.equipe_db || {};
  const container = document.getElementById('equipe-manager-content');
  if (!container) return;

  const renderCategory = (title, key, placeholder) => `
    <div class="card" style="margin-bottom:12px;">
      <div class="card-header">
        <div class="card-title">${title}</div>
        <button class="btn-primary btn-sm" onclick="addEquipeMemberUI('${key}','${placeholder}')">+ Ajouter</button>
      </div>
      <div class="card-body" id="equipe-list-${key}">
        ${(eq[key]||[]).length === 0
          ? `<div style="color:var(--text3);font-size:13px;">Aucun membre enregistré</div>`
          : (eq[key]||[]).map(name => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);">
              <span style="font-size:14px;">${esc(name)}</span>
              <button onclick="deleteEquipeMember('${key}','${esc(name)}')"
                style="background:none;border:none;color:var(--danger);font-size:18px;cursor:pointer;padding:4px;">×</button>
            </div>`).join('')}
      </div>
    </div>`;

  container.innerHTML = `
    ${renderCategory('Anesthésistes-Réanimateurs', 'anesthesistes', 'Dr. Prénom NOM')}
    ${renderCategory('Techniciens d\'anesthésie', 'techniciens', 'Prénom NOM')}
    ${renderCategory('Instrumentistes', 'instrumentistes', 'Prénom NOM')}
    ${renderCategory('Infirmières circulantes', 'circulantes', 'Prénom NOM')}
    ${renderCategory('Salles opératoires', 'salles', 'ex: Salle 2')}`;
}

function addEquipeMemberUI(key, placeholder) {
  const name = prompt(`Ajouter un membre :\n(${placeholder})`);
  if (!name || name.trim().length < 2) return;
  const db = getDB();
  const eq = db.equipe_db;
  if (!eq[key].includes(name.trim())) {
    eq[key].push(name.trim());
    eq[key].sort();
    writeDB().then(() => {
      buildEquipeDatalist();
      renderEquipeManager();
      toast(`${name.trim()} ajouté(e) ✓`, 'success');
    });
  } else {
    toast('Déjà dans la liste', 'error');
  }
}

async function deleteEquipeMember(key, name) {
  if (!confirm(`Supprimer "${name}" de la liste ?`)) return;
  const db = getDB();
  db.equipe_db[key] = db.equipe_db[key].filter(n => n !== name);
  await writeDB();
  buildEquipeDatalist();
  renderEquipeManager();
  toast(`${name} supprimé(e)`, 'success');
}
