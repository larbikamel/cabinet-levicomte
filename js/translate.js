// ══════════════════════════════════════════════════
//  translate.js — Traduction CRO EN/AR
//  Cabinet Le Vicomte Web App
// ══════════════════════════════════════════════════
'use strict';

// ─── Boutons de traduction dans la liste CRO ──────
function renderCROTranslateButtons(croId) {
  return `
    <button class="btn-translate" onclick="translateCROWeb(${croId},'en')" title="English PDF">EN</button>
    <button class="btn-translate" onclick="translateCROWeb(${croId},'ar')" title="النسخة العربية" style="font-family:serif;">ع</button>`;
}

// ─── Traduction principale ─────────────────────────
async function translateCROWeb(croId, lang) {
  const db = getDB();
  const cro = db.cro.find(c => c.id === croId);
  const patient = db.patients.find(p => p.id === _currentPatientId);
  if (!cro || !patient) return;

  // Vérifier clé API dans localStorage
  const apiKey = localStorage.getItem('clv_anthropic_key');
  if (!apiKey) {
    const key = prompt('Entrez votre clé API Anthropic\n(elle sera mémorisée sur cet appareil) :');
    if (!key || !key.startsWith('sk-')) {
      toast('Clé API invalide', 'error');
      return;
    }
    localStorage.setItem('clv_anthropic_key', key);
  }

  const langLabel = lang === 'en' ? 'English' : 'العربية';
  toast(lang === 'en' ? 'Translating to English…' : 'جاري الترجمة…', 'info');

  // Bouton en cours
  const btns = document.querySelectorAll('.btn-translate');
  btns.forEach(b => { b.disabled = true; });

  try {
    // Préparer le texte à traduire
    const sections = {
      'Type d\'intervention':      cro.type_intervention,
      'Position opératoire':       cro.position,
      'Technique opératoire':      cro.technique,
      'Incidents peropératoires':  cro.incidents,
      'Pertes sanguines':          cro.pertes_sanguines,
      'Drainage':                  cro.drainage,
      'Fermeture':                 cro.fermeture,
      'Suites opératoires':        cro.suites_imm,
      'Prescriptions':             cro.prescriptions,
    };

    const toTranslate = Object.entries(sections)
      .filter(([,v]) => v && v.trim())
      .map(([k,v]) => `[${k}]\n${v}`)
      .join('\n\n');

    const systemPrompt = lang === 'en'
      ? `You are a medical translator specializing in plastic and reconstructive surgery. Translate the following French operative report sections into precise, professional English medical terminology. Keep the same structure with section headers in square brackets. Translate only, no commentary.`
      : `أنت مترجم طبي متخصص في جراحة التجميل. ترجم الأقسام التالية من الفرنسية إلى العربية الطبية الدقيقة. احتفظ بنفس البنية مع عناوين الأقسام بين قوسين مربعين. ترجم فقط.`;

    // Appel API Anthropic
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': localStorage.getItem('clv_anthropic_key'),
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        messages: [{ role: 'user', content: `${systemPrompt}\n\nText to translate:\n\n${toTranslate}` }]
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'API error ' + response.status);
    }

    const data = await response.json();
    const translatedText = data.content?.[0]?.text || '';

    if (!translatedText) throw new Error('Réponse vide');

    // Parser les sections traduites
    const translated = {};
    let currentKey = null;
    let currentContent = [];

    translatedText.split('\n').forEach(line => {
      const match = line.match(/^\[(.+?)\]$/);
      if (match) {
        if (currentKey) translated[currentKey] = currentContent.join('\n').trim();
        currentKey = match[1];
        currentContent = [];
      } else if (currentKey) {
        currentContent.push(line);
      }
    });
    if (currentKey) translated[currentKey] = currentContent.join('\n').trim();

    // Générer et imprimer le PDF traduit
    printTranslatedCRO(cro, patient, translated, lang);
    toast(lang === 'en' ? '✅ English PDF ready' : '✅ ملف PDF العربي جاهز', 'success');

  } catch(e) {
    console.error(e);
    toast((lang === 'en' ? 'Translation error: ' : 'خطأ: ') + e.message, 'error');
  } finally {
    btns.forEach(b => { b.disabled = false; });
  }
}

// ─── PDF traduit ──────────────────────────────────
function printTranslatedCRO(cro, patient, translated, lang) {
  const isAr = lang === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';
  const patName = `${patient.prenom||''} ${(patient.nom||'').toUpperCase()}`.trim();
  const dob = patient.date_naissance ? formatDate(patient.date_naissance) + ` (${calcAge(patient.date_naissance)} ${isAr?'سنة':'ans'})` : '';
  const today = new Date().toLocaleDateString('fr-FR', {day:'numeric',month:'long',year:'numeric'});

  let eq = {};
  try { const s = JSON.parse(cro.notes||'{}'); if(s._type==='enriched_v1') eq=s.equipe||{}; } catch(e) {}

  const L = isAr ? {
    title: 'تقرير العملية الجراحية',
    badge: 'النسخة العربية',
    patient: 'المريض/المريضة', dob: 'تاريخ الميلاد', file: 'الملف',
    intervention: 'نوع التدخل', date: 'التاريخ', duration: 'المدة',
    anesthesia: 'التخدير', estab: 'المستشفى',
    team: 'الفريق الجراحي', surgeon: 'الجراح', anesthesist: 'طبيب التخدير',
    nurse: 'الممرض/ة المساعد/ة', circulating: 'ممرض/ة التداول',
    sign: 'التوقيع والختم',
    sections: {
      'Position opératoire': 'وضعية المريض',
      'Technique opératoire': 'التقنية الجراحية',
      'Incidents peropératoires': 'الحوادث أثناء العملية',
      'Pertes sanguines': 'الخسائر الدموية',
      'Drainage': 'التصريف',
      'Fermeture': 'الإغلاق',
      'Suites opératoires': 'المتابعة الفورية',
      'Prescriptions': 'الوصفة الطبية',
    }
  } : {
    title: 'OPERATIVE REPORT',
    badge: 'ENGLISH VERSION',
    patient: 'Patient', dob: 'Date of birth', file: 'File',
    intervention: 'Procedure', date: 'Date', duration: 'Duration',
    anesthesia: 'Anesthesia', estab: 'Institution',
    team: 'Surgical team', surgeon: 'Surgeon', anesthesist: 'Anesthesiologist',
    nurse: 'Scrub nurse', circulating: 'Circulating nurse',
    sign: 'Signature & stamp',
    sections: {
      'Position opératoire': 'Patient position',
      'Technique opératoire': 'Operative technique',
      'Incidents peropératoires': 'Intraoperative events',
      'Pertes sanguines': 'Blood loss',
      'Drainage': 'Drainage',
      'Fermeture': 'Wound closure',
      'Suites opératoires': 'Postoperative course',
      'Prescriptions': 'Prescriptions & Instructions',
    }
  };

  const font = isAr
    ? "'Traditional Arabic','Arial Unicode MS','Noto Naskh Arabic',serif"
    : "'Times New Roman',Georgia,serif";

  const getT = (frKey) => {
    const match = Object.entries(translated).find(([k]) =>
      k.toLowerCase().replace(/[éèê]/g,'e').includes(frKey.toLowerCase().replace(/[éèê]/g,'e'))
    );
    return match ? match[1] : '';
  };

  const section = (frKey) => {
    const content = getT(frKey);
    if (!content) return '';
    const title = L.sections[frKey] || frKey;
    return `<div style="margin:10px 0;">
      <div style="font-weight:bold;color:#1a2a4a;font-size:10px;text-transform:uppercase;letter-spacing:1px;
        border-bottom:1.5px solid #1558a3;padding-bottom:3px;margin-bottom:5px;">${title}</div>
      <div style="font-size:11px;line-height:1.8;white-space:pre-wrap;text-align:justify;">${content}</div>
    </div>`;
  };

  const anesth = cro.anesthesiste || eq.anesthesiste || '';
  const instru = cro.instrumentiste || eq.instrumentiste || '';

  const html = `<!DOCTYPE html><html lang="${lang}" dir="${dir}"><head><meta charset="UTF-8">
    <title>${L.title} — ${patName}</title>
    <style>
      @page{margin:0;size:A4;}*{margin:0;padding:0;box-sizing:border-box;}
      body{font-family:${font};font-size:11px;color:#1a1a1a;direction:${dir};}
      .page{width:210mm;min-height:297mm;padding:18mm 16mm 30mm 16mm;}
      .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:10px;border-bottom:2px solid #1558a3;margin-bottom:14px;}
      .badge{display:inline-block;background:#1558a3;color:white;font-size:9px;font-weight:bold;padding:2px 10px;border-radius:10px;letter-spacing:0.1em;margin-bottom:6px;}
      .doc-title{text-align:center;font-size:15px;font-weight:bold;color:#1558a3;text-decoration:underline;letter-spacing:1.5px;margin-bottom:4px;}
      .doc-sub{text-align:center;font-size:11px;color:#b8914a;margin-bottom:12px;font-style:italic;}
      .patient-box{background:#f0f4f8;border:1px solid #c8d4e0;border-radius:4px;padding:8px 14px;margin-bottom:12px;font-size:11px;line-height:1.9;display:flex;justify-content:space-between;}
      .equipe-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;background:#f9f7f2;border:1px solid #e0d8c8;border-radius:4px;padding:8px 14px;margin-bottom:12px;font-size:10.5px;}
      .eq-lbl{font-size:8.5px;color:#999;text-transform:uppercase;letter-spacing:0.1em;}
      .sig-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:24px;padding-top:14px;border-top:1px dashed #ccc;}
      .sig-box{border:1px solid #ccc;border-radius:6px;padding:10px 14px;text-align:center;}
      .sig-line{border-top:1px solid #ccc;margin-top:38px;padding-top:6px;font-size:8px;color:#aaa;}
      .footer{position:fixed;bottom:0;left:0;right:0;background:white;padding:5px 16mm;border-top:1.5px solid #1558a3;display:flex;justify-content:space-between;}
      .footer span{font-size:8px;color:#666;font-family:Arial,sans-serif;}
    </style>
  </head><body><div class="page">
    <div class="header">
      <div>
        <div style="font-size:14px;font-weight:bold;color:#1558a3;">DR. LARBI <strong>Kamel</strong></div>
        <div style="color:#b8914a;font-size:9px;margin:2px 0;letter-spacing:2px;">— ⊙ —</div>
        <div style="font-size:9px;color:#555;line-height:1.4;">Chirurgien Plasticien, Réparateur & Esthétique<br>CNOM 9750 — Cabinet Le Vicomte, Sousse</div>
      </div>
      <div style="width:46px;height:46px;border:2px solid #1558a3;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:bold;color:#1558a3;font-family:'Times New Roman',serif;">LK</div>
      <div style="text-align:right;direction:rtl;">
        <div style="font-size:12px;font-weight:bold;color:#1558a3;">الدكتور كمال العربي</div>
        <div style="font-size:9px;color:#555;line-height:1.5;">إختصاصي في جراحة الترميم و التجميل</div>
        <div style="font-size:9px;color:#555;margin-top:2px;">${today}</div>
      </div>
    </div>

    <div style="text-align:center;margin-bottom:4px;"><span class="badge">${L.badge}</span></div>
    <div class="doc-title">${L.title}</div>
    <div class="doc-sub">${getT('Type') || cro.type_intervention}</div>

    <div class="patient-box">
      <div>
        <strong>${L.patient} :</strong> ${patName}<br>
        ${dob ? `<strong>${L.dob} :</strong> ${dob}<br>` : ''}
        <strong>${L.file} :</strong> #${String(patient.id||'').padStart(4,'0')}
      </div>
      <div style="text-align:${isAr?'left':'right'};color:#555;">
        <strong style="color:#1558a3;">${L.date} :</strong> ${cro.date_intervention?formatDate(cro.date_intervention):'—'}<br>
        ${cro.duree_minutes?`<strong style="color:#1558a3;">${L.duration} :</strong> ${cro.duree_minutes} min<br>`:''}
        <strong style="color:#1558a3;">${L.anesthesia} :</strong> ${cro.anesthesie||'—'}
      </div>
    </div>

    ${anesth||instru ? `
    <div class="equipe-grid">
      <div><div class="eq-lbl">${L.surgeon}</div><div>Dr LARBI KAMEL — CNOM 9750</div></div>
      ${anesth?`<div><div class="eq-lbl">${L.anesthesist}</div><div>${anesth}</div></div>`:''}
      ${instru?`<div><div class="eq-lbl">${L.nurse}</div><div>${instru}</div></div>`:''}
    </div>` : ''}

    ${section('Position opératoire')}
    ${section('Technique opératoire')}
    ${section('Incidents peropératoires')}
    ${section('Pertes sanguines')}
    ${section('Drainage')}
    ${section('Fermeture')}
    ${section('Suites opératoires')}
    ${section('Prescriptions')}

    <div class="sig-grid">
      <div class="sig-box">
        <div style="font-size:8.5px;text-transform:uppercase;letter-spacing:0.1em;color:#b8914a;margin-bottom:3px;">${L.surgeon}</div>
        <div style="font-size:12px;font-weight:bold;color:#1558a3;">Dr. LARBI Kamel</div>
        <div style="font-size:9px;color:#555;">Plastic Surgeon / جراح تجميل<br>CNOM 9750</div>
        <div class="sig-line">${L.sign}</div>
      </div>
      <div class="sig-box">
        <div style="font-size:8.5px;text-transform:uppercase;letter-spacing:0.1em;color:#b8914a;margin-bottom:3px;">${L.anesthesist}</div>
        <div style="font-size:12px;font-weight:bold;">${anesth||'________________________'}</div>
        <div style="font-size:9px;color:#555;">Anesthesiologist / طبيب التخدير</div>
        <div class="sig-line">${L.sign}</div>
      </div>
    </div>

  </div>
  <div class="footer">
    <span>Dr LARBI KAMEL — CNOM 9750 — Cabinet Le Vicomte, Sousse</span>
    <span>📞 (+216) 73 220 107 · ✉ dr.larbi@gmail.com</span>
  </div>
  <script>window.onload=()=>window.print();<\/script>
  </body></html>`;

  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); }
  else toast('Activez les pop-ups pour imprimer');
}
