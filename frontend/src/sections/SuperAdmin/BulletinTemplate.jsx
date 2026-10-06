// Reproduction fidèle du modèle papier fourni par le client (bulletin APC bilingue FR/EN,
// en-tête MINESEC/MINEDUB, tableau des notes groupé par matière, bloc discipline / conseil de
// classe / travail du trimestre, courbe de progression, visas).
//
// Langue : les sections anglophones (école dont le nom court contient "ANGLOPHONE") ont un bulletin
// entièrement en anglais (textes fixes, mentions anglaises du barème, nombres à point décimal) ;
// l'en-tête gouvernemental reste bilingue dans les deux cas.
//
// Données non disponibles dans l'application, signalées ici plutôt que devinées :
//  - "Compétence..." par matière : aucune compétence réelle n'est saisie nulle part — texte fixe.
//  - Colonne "NC" : toujours à 0 (son usage exact sur le modèle papier n'est pas connu).
//  - Photo de l'élève : pas de système de dépôt de photo — silhouette générique.
//  - Discipline (absences/retards) : calculée depuis l'appel (Présences) sur une période de
//    trimestre estimée par défaut (voir backend/src/utils/bulletinData.js) — à confirmer par école.
//  - Exclusion / conseil de classe (TH, EN, FEL...) et observation : saisie manuelle, à renseigner
//    dans le panneau "Discipline et conseil de classe" avant impression.
import { useState } from 'react'

const LOGO_EXTENSIONS = ['png', 'jpg', 'jpeg']

const CONSEIL_IDS = ['tableauHonneur', 'encouragement', 'felicitations', 'avertissementTravail', 'blameTravail', 'avertissementConduite', 'blameConduite']

const TEXTES = {
  fr: {
    locale: 'fr-FR',
    titre: (t) => `BULLETIN DU ${({ 1: 'PREMIER', 2: 'DEUXIÈME', 3: 'TROISIÈME' })[t] || `${t}ᵉ`} TRIMESTRE`,
    nom: 'Nom et prénom :', naissance: 'Date de naissance :', lieuPrefixe: 'à', matricule: 'Matricule :', annee: 'Année scolaire :',
    sexe: 'Sexe/Gender :', sexes: { FEMININ: 'FEMININ', MASCULIN: 'MASCULIN' }, classe: 'Classe', redoublant: 'Redoublant ?', oui: 'OUI', non: 'NON',
    effectif: 'Effectif', eleves: 'élèves',
    colonnes: ['MATIÈRES', 'COMPÉTENCES', 'EVAL1', 'EVAL2', 'Note', 'Coef', 'NxC', 'NC', 'APC', 'Mention'],
    competence: 'Compétence...', groupe: (n) => `GROUPE ${n} / MOY =`, moyennesPeriodes: 'Moyennes des périodes',
    programmeNonDefini: "Le programme de cette classe (matières et coefficients) n'est pas encore défini",
    legende: "ABS = Absences, CON = Consignes, EXP = Expulsion au cours, T.H. = Tableau d'honneur, ENC = Encouragement, FEL = Félicitation, A.T. = Avertissement Travail, B.T. = Blâme Travail, A.C. = Avertissement Conduite, B.C. = Blâme Conduite, EXC = Exclusion, Nbr jour = Nombre de jour d'exclusion, PN = Première note, DN = Dernière note.",
    discipline: (t) => `DISCIPLINE TRIMESTRE ${t}`, conseil: (t) => `CONSEIL DE CLASSE TRIMESTRE ${t}`, travail: (t) => `TRAVAIL TRIMESTRE ${t}`,
    exclu: 'Exclu(e)', jours: 'Jr', natures: 'Natures', justifiees: 'J', nonJustifiees: 'NJ',
    exclusionDefinitive: 'Exclusion Définitive', absence: 'Absence', absenteisme: 'Absentéisme', retards: 'Retards',
    conduiteDeplorable: 'Conduite déplorable', convocation: 'Convocation',
    abreviationsConseil: ['TH', 'EN', 'FEL', 'AT', 'BT', 'AC', 'BC'],
    coef: 'Coef', total: 'Total', rang: 'Rang', moy: 'Moy..', nbMoySup: 'Nb Moy>=10', nbMoyInf: 'Nb Moy<10',
    pMoy: 'P Moye...', dMoy: 'D Moye...', moyenneGenerale: 'Moyenne Générale', nombreMatieres: 'Nombre Matières',
    courbe: 'COURBE PROGRESSION', visaPP: 'VISA PROF. PRINCIPAL', observation: 'OBSERVATION DU CONSEIL', visaChef: 'VISA CHEF ÉTABLISSEMENT',
    rangLabel: (r) => (r === 1 ? '1er' : `${r}è`)
  },
  en: {
    locale: 'en-GB',
    titre: (t) => `${({ 1: 'FIRST', 2: 'SECOND', 3: 'THIRD' })[t] || `TERM ${t}`} TERM REPORT CARD`,
    nom: 'Name :', naissance: 'Date of birth :', lieuPrefixe: 'at', matricule: 'Registration No :', annee: 'Academic year :',
    sexe: 'Gender :', sexes: { FEMININ: 'FEMALE', MASCULIN: 'MALE' }, classe: 'Class', redoublant: 'Repeater ?', oui: 'YES', non: 'NO',
    effectif: 'Enrolment', eleves: 'students',
    colonnes: ['SUBJECTS', 'COMPETENCES', 'EVAL1', 'EVAL2', 'Mark', 'Coef', 'MxC', 'NC', 'APC', 'Remark'],
    competence: 'Competence...', groupe: (n) => `GROUP ${n} / AVG =`, moyennesPeriodes: 'Period averages',
    programmeNonDefini: 'The programme of this class (subjects and coefficients) has not been defined yet',
    legende: 'ABS = Absences, DET = Detentions, EXP = Expulsion from class, H.R. = Honour roll, ENC = Encouragement, CONG = Congratulations, W.W. = Warning for work, B.W. = Blame for work, W.C. = Warning for conduct, B.C. = Blame for conduct, EXC = Exclusion, No. days = Number of days of exclusion, FM = First mark, LM = Last mark.',
    discipline: (t) => `DISCIPLINE TERM ${t}`, conseil: (t) => `CLASS COUNCIL TERM ${t}`, travail: (t) => `ACADEMIC WORK TERM ${t}`,
    exclu: 'Excluded', jours: 'Days', natures: 'Type', justifiees: 'J', nonJustifiees: 'NJ',
    exclusionDefinitive: 'Permanent exclusion', absence: 'Absence', absenteisme: 'Absenteeism', retards: 'Lateness',
    conduiteDeplorable: 'Poor conduct', convocation: 'Parent summons',
    abreviationsConseil: ['HR', 'ENC', 'CONG', 'WW', 'BW', 'WC', 'BC'],
    coef: 'Coef', total: 'Total', rang: 'Rank', moy: 'Avg..', nbMoySup: 'No. Avg>=10', nbMoyInf: 'No. Avg<10',
    pMoy: 'Best avg...', dMoy: 'Lowest avg...', moyenneGenerale: 'General Average', nombreMatieres: 'No. of Subjects',
    courbe: 'PROGRESS CURVE', visaPP: "CLASS MASTER'S VISA", observation: "CLASS COUNCIL'S REMARK", visaChef: "PRINCIPAL'S VISA",
    rangLabel: (r) => {
      if (!r) return ''
      const fin = r % 100 >= 11 && r % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' })[r % 10] || 'th'
      return `${r}${fin}`
    }
  }
}

const langueEcole = (ecole) => (/ANGLOPHONE/i.test(ecole.nomCourt || '') ? 'en' : 'fr')

function formatDate(iso, locale) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// Identité visuelle de l'en-tête, reprise des en-têtes papier fournis par chaque établissement.
// Les écoles secondaires Rosa Parks (sections francophone, anglophone, technique) partagent le même
// en-tête. Les coordonnées (BP, tél., email) viennent de la fiche de chaque école.
const DELEGATIONS_EN_DEFAUT = ['DIVISIONAL DELEGATION OF THE CENTER', 'SUBDIVISIONAL DELEGATION OF MFOUNDI']

function enteteEcole(ecole) {
  if (ecole.niveau === 'SECONDAIRE' && /rosa\s*parks/i.test(ecole.nomComplet || '')) {
    return { logo: 'CRP', titre: 'COLLEGE ROSA PARKS', couleurTitre: '#b91c1c', couleurFilet: '#b91c1c', titreItalique: false, delegationsEn: DELEGATIONS_EN_DEFAUT }
  }
  if (ecole.nomCourt === 'CBM') {
    return { logo: 'CBM', titre: 'COLLEGE BILINGUE LES MASTERS', couleurTitre: '#0088c8', couleurFilet: '#0088c8', titreItalique: true, delegationsEn: ['CENTER REGIONAL DELEGATION', 'MFOUNDI DIVISIONAL DELEGATION'] }
  }
  return {
    logo: ecole.nomCourt,
    titre: ecole.nomComplet,
    couleurTitre: '#b91c1c',
    couleurFilet: '#b91c1c',
    titreItalique: false,
    delegationsEn: [
      ecole.delegationRegionale ? `DIVISIONAL DELEGATION OF ${ecole.delegationRegionale}` : DELEGATIONS_EN_DEFAUT[0],
      ecole.delegationDepartementale ? `SUBDIVISIONAL DELEGATION OF ${ecole.delegationDepartementale}` : DELEGATIONS_EN_DEFAUT[1]
    ]
  }
}

// Cherche /logos/<nom>.png puis .jpg puis .jpeg ; à défaut, un badge avec les initiales de l'école.
function LogoEcole({ nomCourt }) {
  const [tentative, setTentative] = useState(0)
  if (tentative >= LOGO_EXTENSIONS.length) {
    return (
      <div className="w-16 h-16 rounded-full bg-red-700 text-white flex items-center justify-center font-extrabold text-sm border-2 border-red-900 shrink-0 mx-auto">
        {nomCourt?.slice(0, 3)}
      </div>
    )
  }
  return (
    <img
      src={`/logos/${nomCourt}.${LOGO_EXTENSIONS[tentative]}`}
      alt={nomCourt}
      className="h-16 object-contain shrink-0 mx-auto"
      onError={() => setTentative(t => t + 1)}
    />
  )
}

// Silhouette générique en l'absence de tout système de dépôt de photo d'élève.
function PhotoPlaceholder() {
  return (
    <div className="w-16 h-20 rounded bg-amber-50 border border-slate-300 flex items-center justify-center shrink-0 overflow-hidden">
      <svg viewBox="0 0 24 24" className="w-11 h-11 text-amber-700" fill="currentColor">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
      </svg>
    </div>
  )
}

function ministereParNiveau(niveauEcole) {
  return niveauEcole === 'MATERNELLE_PRIMAIRE'
    ? { fr: "MINISTÈRE DE L'ÉDUCATION DE BASE", en: 'MINISTRY OF BASIC EDUCATION' }
    : { fr: 'MINISTÈRE DES ENSEIGNEMENTS SECONDAIRES', en: 'MINISTRY OF SECONDARY EDUCATION' }
}

const rougeSi = (condition) => (condition ? 'text-red-600' : 'text-black')

function Boite({ coche }) {
  return <span className="inline-block w-3 h-3 border border-black text-center leading-none text-[9px] align-middle">{coche ? '✓' : ''}</span>
}

function Case({ coche, label }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Boite coche={coche} />
      {label}
    </span>
  )
}

// Courbe de progression EVAL1 → EVAL2 (moyenne générale pondérée de chaque évaluation)
function CourbeProgression({ eval1, eval2 }) {
  const largeur = 130
  const hauteur = 70
  const y = (v) => hauteur - (Math.max(0, Math.min(20, v ?? 0)) / 20) * hauteur
  const x1 = 20
  const x2 = largeur - 5
  return (
    <svg width={largeur} height={hauteur + 14} className="mx-auto">
      {[0, 5, 10, 15, 20].map(v => (
        <g key={v}>
          <line x1={x1} y1={y(v)} x2={largeur} y2={y(v)} stroke="#ccc" strokeWidth="0.5" />
          <text x="0" y={y(v) + 3} fontSize="8">{v}</text>
        </g>
      ))}
      {eval1 !== null && eval2 !== null && (
        <>
          <line x1={x1} y1={y(eval1)} x2={x2} y2={y(eval2)} stroke="#c00" strokeWidth="1.5" />
          <circle cx={x1} cy={y(eval1)} r="2.5" fill="#c00" />
          <circle cx={x2} cy={y(eval2)} r="2.5" fill="#c00" />
        </>
      )}
      <text x={x1 - 8} y={hauteur + 12} fontSize="8">EVAL1</text>
      <text x={x2 - 10} y={hauteur + 12} fontSize="8">EVAL2</text>
    </svg>
  )
}

export default function BulletinTemplate({ data }) {
  const {
    eleve, ecole, effectif, rang, groupes, coefTotal, nxcTotal, moyenneGenerale,
    moyenneEval1, moyenneEval2, programmeDefini, matieresTotal, classe, discipline, professeurPrincipal,
    bulletin, trimestre, anneeScolaire
  } = data
  const langue = langueEcole(ecole)
  const t = TEXTES[langue]
  const ministere = ministereParNiveau(ecole.niveau)
  const entete = enteteEcole(ecole)
  const bulletinManuel = bulletin || {}
  const cocheConseil = (id) => !!bulletinManuel[id]
  const mentionDe = (o) => (langue === 'en' ? o.mentionEn || o.mention : o.mention)

  const formatNote = (n) => (n === null || n === undefined ? '' : Number(n).toLocaleString(t.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/[.,]00$/, ''))
  const format2 = (n) => (n === null || n === undefined ? '' : Number(n).toLocaleString(t.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))

  const totalColonnes = 10

  return (
    <div lang={langue} className="bg-white text-black mx-auto" style={{ width: '210mm', minHeight: '297mm', padding: '8mm', fontFamily: 'Arial, sans-serif' }}>
      {/* En-tête bilingue : FR | logo | EN */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-[9px] text-center leading-tight">
        <div>
          <p className="font-bold">RÉPUBLIQUE DU CAMEROUN</p>
          <p className="italic">Paix - Travail - Patrie</p>
          <p className="font-semibold mt-1">{ministere.fr}</p>
          <p>DÉLÉGATION RÉGIONALE {ecole.delegationRegionale || 'DU CENTRE'}</p>
          <p>DÉLÉGATION DÉPARTEMENTALE {ecole.delegationDepartementale || 'DU MFOUNDI'}</p>
        </div>
        <LogoEcole nomCourt={entete.logo} />
        <div>
          <p className="font-bold">REPUBLIC OF CAMEROON</p>
          <p className="italic">Peace - Work - Fatherland</p>
          <p className="font-semibold mt-1">{ministere.en}</p>
          <p>{entete.delegationsEn[0]}</p>
          <p>{entete.delegationsEn[1]}</p>
        </div>
      </div>

      {/* Nom de l'école + coordonnées + filet aux couleurs de l'école */}
      <div className="flex flex-col items-center mt-1">
        <h1 className={`text-2xl font-extrabold tracking-wide text-center uppercase ${entete.titreItalique ? 'italic' : ''}`} style={{ color: entete.couleurTitre }}>{entete.titre}</h1>
        <p className="text-[10px] text-center mt-0.5 italic font-semibold">
          {ecole.adresse} - Tel : {ecole.telephone} - Email : {ecole.email}
        </p>
        <div className="w-full mt-1" style={{ borderTop: `4px solid ${entete.couleurFilet}` }} />
      </div>

      {/* Titre */}
      <div className="text-center font-bold text-lg underline mt-2 mb-2">{t.titre(trimestre)}</div>

      {/* Infos élève : nom/naissance/matricule/année à gauche, sexe/classe/redoublant au centre,
          effectif (sur la ligne "Classe"), photo à l'extrémité droite alignée en haut */}
      <div className="flex items-start gap-3 text-[11px] mb-2">
        <div className="space-y-0.5 flex-1">
          <p><span className="text-slate-700">{t.nom}</span> <strong>{eleve.nom} {eleve.prenom}</strong></p>
          <p><span className="text-slate-700">{t.naissance}</span> {formatDate(eleve.dateNaissance, t.locale)}{eleve.lieuNaissance ? ` ${t.lieuPrefixe} ${eleve.lieuNaissance}` : ''}</p>
          <p><span className="text-slate-700">{t.matricule}</span> {eleve.matricule}</p>
          <p><span className="text-slate-700">{t.annee}</span> {anneeScolaire}</p>
        </div>
        <div className="space-y-0.5 flex-1">
          <p><span className="text-slate-700">{t.sexe}</span> {t.sexes[eleve.sexe] || ''}</p>
          <p><span className="text-slate-700">{t.classe}</span> <strong>{eleve.classe}</strong></p>
          <p className="flex items-center gap-2"><span className="text-slate-700">{t.redoublant}</span> <Case coche={eleve.redouble} label={t.oui} /> <Case coche={!eleve.redouble} label={t.non} /></p>
        </div>
        <div className="space-y-0.5 shrink-0 w-28">
          <p>&nbsp;</p>
          <p><span className="text-slate-700">{t.effectif}</span> <span className="ml-2">{effectif} {t.eleves}</span></p>
        </div>
        <PhotoPlaceholder />
      </div>

      {/* Tableau des notes, groupé par matière */}
      <table className="w-full border-collapse border border-black text-[9.5px]">
        <thead>
          <tr className="bg-slate-200">
            {t.colonnes.map((titre, i) => (
              <th key={titre} className={`border border-black px-1 py-1 ${i < 2 ? 'text-left' : ''} ${['', '', 'w-10', 'w-10', 'w-10', 'w-8', 'w-12', 'w-7', 'w-10', 'w-20'][i]}`}>{titre}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {!programmeDefini ? (
            <tr>
              <td colSpan={totalColonnes} className="border border-black px-2 py-4 text-center text-slate-400">{t.programmeNonDefini}</td>
            </tr>
          ) : (
            groupes.map(groupe => (
              <>
                {groupe.lignes.map(l => (
                  <tr key={l.matiereId}>
                    <td className="border border-black px-1 py-0.5">
                      {l.matiere}
                      {l.enseignant && <span className="block text-[8px] text-slate-500 font-normal normal-case">{l.enseignant}</span>}
                    </td>
                    <td className="border border-black px-1 py-0.5 text-slate-400 italic">{t.competence}</td>
                    <td className={`border border-black px-1 py-0.5 text-center font-semibold ${rougeSi(l.eval1 !== null && l.eval1 < 10)}`}>{formatNote(l.eval1)}</td>
                    <td className={`border border-black px-1 py-0.5 text-center font-semibold ${rougeSi(l.eval2 !== null && l.eval2 < 10)}`}>{formatNote(l.eval2)}</td>
                    <td className={`border border-black px-1 py-0.5 text-center font-semibold ${rougeSi(l.note !== null && l.note < 10)}`}>{formatNote(l.note)}</td>
                    <td className="border border-black px-1 py-0.5 text-center">{l.coefficient}</td>
                    <td className={`border border-black px-1 py-0.5 text-center ${rougeSi(l.note !== null && l.note < 10)}`}>{formatNote(l.nxc)}</td>
                    <td className="border border-black px-1 py-0.5 text-center">0</td>
                    <td className={`border border-black px-1 py-0.5 text-center ${rougeSi(l.note !== null && l.note < 10)}`}>{l.apc}</td>
                    <td className={`border border-black px-1 py-0.5 ${rougeSi(l.note !== null && l.note < 10)}`}>{mentionDe(l)}</td>
                  </tr>
                ))}
                <tr key={`${groupe.nom}-total`} className="bg-slate-100 font-semibold">
                  <td className="border border-black px-1 py-0.5" colSpan={2}>
                    {t.groupe(groupe.numero)} <span className={rougeSi(groupe.moyenne !== null && groupe.moyenne < 10)}>{formatNote(groupe.moyenne)}</span>
                  </td>
                  <td className="border border-black" colSpan={3}></td>
                  <td className="border border-black px-1 py-0.5 text-center">{groupe.coefTotal}</td>
                  <td className="border border-black px-1 py-0.5 text-center">{formatNote(groupe.nxcTotal)}</td>
                  <td className="border border-black" colSpan={2}></td>
                  <td className={`border border-black px-1 py-0.5 ${rougeSi(groupe.moyenne !== null && groupe.moyenne < 10)}`}>{mentionDe(groupe)}</td>
                </tr>
              </>
            ))
          )}
          {programmeDefini && (
            <tr className="bg-slate-100 font-semibold">
              <td className="border border-black px-1 py-1" colSpan={2}>{t.moyennesPeriodes}</td>
              <td className="border border-black px-1 py-1 text-center">{formatNote(moyenneEval1)}</td>
              <td className="border border-black px-1 py-1 text-center">{formatNote(moyenneEval2)}</td>
              <td className="border border-black" colSpan={6}></td>
            </tr>
          )}
        </tbody>
      </table>
      <p className="text-[7px] text-slate-500 italic leading-tight mt-0.5">{t.legende}</p>

      {/* Discipline / Conseil de classe / Travail du trimestre — un seul tableau continu, collé */}
      {/* 16 colonnes : Discipline (5) | Conseil de classe (7) | Travail (4), disposition du modèle papier */}
      <table className="w-full border-collapse border border-black text-[10px] mt-2 table-fixed">
        <colgroup>
          <col style={{ width: '16%' }} /><col style={{ width: '5.5%' }} /><col style={{ width: '8.5%' }} /><col style={{ width: '5%' }} /><col style={{ width: '5.5%' }} />
          {CONSEIL_IDS.map(id => <col key={id} style={{ width: '4.5%' }} />)}
          <col style={{ width: '9.5%' }} /><col style={{ width: '7%' }} /><col style={{ width: '5%' }} /><col style={{ width: '6.5%' }} />
        </colgroup>
        <thead>
          <tr className="bg-slate-200">
            <th className="border border-black py-1 px-1" colSpan={5}>{t.discipline(trimestre)}</th>
            <th className="border border-black py-1 px-1" colSpan={7}>{t.conseil(trimestre)}</th>
            <th className="border border-black py-1 px-1" colSpan={4}>{t.travail(trimestre)}</th>
          </tr>
        </thead>
        <tbody className="italic">
          <tr>
            <td className="border border-black px-1 py-1"><Case coche={!!bulletinManuel.joursExclusion} label={t.exclu} /></td>
            <td className="border border-black px-1 py-1 text-center">{bulletinManuel.joursExclusion ? `${bulletinManuel.joursExclusion} ` : ''}{t.jours}</td>
            <td className="border border-black px-1 py-1 text-center not-italic font-semibold">{t.natures}</td>
            <td className="border border-black px-1 py-1 text-center not-italic font-semibold">{t.justifiees}</td>
            <td className="border border-black px-1 py-1 text-center not-italic font-semibold">{t.nonJustifiees}</td>
            {t.abreviationsConseil.map((label, i) => (
              <td key={CONSEIL_IDS[i]} className="border border-black px-0.5 py-1 text-center font-semibold">{label}</td>
            ))}
            <td className="border border-black px-1 py-1">{t.coef}</td>
            <td className="border border-black px-1 py-1 text-right not-italic">{format2(coefTotal)}</td>
            <td className="border border-black px-1 py-1">{t.total}</td>
            <td className="border border-black px-1 py-1 text-right not-italic">{format2(nxcTotal)}</td>
          </tr>
          <tr>
            <td className="border border-black px-1 py-1 text-right">{t.exclusionDefinitive}</td>
            <td className="border border-black px-1 py-1 text-center"><Boite coche={bulletinManuel.exclusionDefinitive} /></td>
            <td className="border border-black px-1 py-1">{t.absence}</td>
            <td className="border border-black px-1 py-1 text-center not-italic">{discipline.absencesJustifiees || ''}</td>
            <td className="border border-black px-1 py-1 text-center not-italic">{discipline.absencesNonJustifiees || ''}</td>
            {CONSEIL_IDS.map(id => (
              <td key={id} className="border border-black px-0.5 py-1 text-center"><Boite coche={cocheConseil(id)} /></td>
            ))}
            <td className="border border-black px-1 py-1">{t.rang}</td>
            <td className="border border-black px-1 py-1 text-center not-italic">{t.rangLabel(rang)}</td>
            <td className="border border-black px-1 py-1">{t.moy}</td>
            <td className={`border border-black px-1 py-1 text-right not-italic ${rougeSi(moyenneGenerale !== null && moyenneGenerale < 10)}`}>{format2(moyenneGenerale)}</td>
          </tr>
          <tr>
            <td className="border border-black px-1 py-1 text-right">{t.absenteisme}</td>
            <td className="border border-black px-1 py-1 text-center"><Boite coche={bulletinManuel.absenteisme} /></td>
            <td className="border border-black px-1 py-1">{t.retards}</td>
            <td className="border border-black px-1 py-1 text-center not-italic" colSpan={2}>{discipline.retards || ''}</td>
            <td className="border border-black px-1 py-1" colSpan={3}>{t.nbMoySup}</td>
            <td className="border border-black px-1 py-1 text-center not-italic">{classe.nbAuDessus}</td>
            <td className="border border-black px-1 py-1" colSpan={2}>{t.pMoy}</td>
            <td className="border border-black px-1 py-1 text-right not-italic">{format2(classe.plusForteMoyenne)}</td>
            <td className="border border-black px-1 py-1" colSpan={3}>{t.moyenneGenerale}</td>
            <td className="border border-black px-1 py-1 text-right not-italic">{format2(classe.moyenneGenerale)}</td>
          </tr>
          <tr>
            <td className="border border-black px-1 py-1 text-right">{t.conduiteDeplorable}</td>
            <td className="border border-black px-1 py-1 text-center"><Boite coche={bulletinManuel.conduiteDeplorable} /></td>
            <td className="border border-black px-1 py-1" colSpan={2}>{t.convocation}</td>
            <td className="border border-black px-1 py-1 text-center"><Boite coche={bulletinManuel.convocation} /></td>
            <td className="border border-black px-1 py-1" colSpan={3}>{t.nbMoyInf}</td>
            <td className="border border-black px-1 py-1 text-center not-italic">{classe.nbEnDessous}</td>
            <td className="border border-black px-1 py-1" colSpan={2}>{t.dMoy}</td>
            <td className="border border-black px-1 py-1 text-right not-italic">{format2(classe.plusFaibleMoyenne)}</td>
            <td className="border border-black px-1 py-1" colSpan={3}>{t.nombreMatieres}</td>
            <td className="border border-black px-1 py-1 text-right not-italic">{matieresTotal}</td>
          </tr>
        </tbody>
      </table>

      {/* Courbe de progression / Visas / Observation — même principe, un seul tableau continu */}
      <table className="w-full border-collapse border border-black text-[10px] mt-2">
        <thead>
          <tr className="bg-slate-100">
            <th className="border border-black py-1.5 px-1">{t.courbe}</th>
            <th className="border border-black py-1.5 px-1">{t.visaPP}</th>
            <th className="border border-black py-1.5 px-1">{t.observation}</th>
            <th className="border border-black py-1.5 px-1">{t.visaChef}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-black align-middle p-1.5 h-24"><CourbeProgression eval1={moyenneEval1} eval2={moyenneEval2} /></td>
            <td className="border border-black align-bottom text-center p-1.5 h-24">{professeurPrincipal || ''}</td>
            <td className="border border-black align-middle text-center p-1.5 h-24 font-semibold">{bulletinManuel.observationConseil || ''}</td>
            <td className="border border-black p-1.5 h-24"></td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
