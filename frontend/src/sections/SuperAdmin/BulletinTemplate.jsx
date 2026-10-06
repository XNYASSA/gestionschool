// Reproduction fidèle du modèle papier fourni par le client (bulletin APC bilingue FR/EN,
// en-tête MINESEC/MINEDUB, tableau des notes groupé par matière, bloc discipline / conseil de
// classe / travail du trimestre, courbe de progression, visas).
//
// Mise en page alignée au détail près sur le modèle papier (en-tête à 3 colonnes avec logo au
// centre, ordre exact des champs de la fiche élève, bloc discipline/conseil/travail reconstruit
// en mini-tableaux à la place de simples lignes de texte).
//
// Données non disponibles dans l'application, signalées ici plutôt que devinées :
//  - "Compétence..." par matière : aucune compétence réelle n'est saisie nulle part — texte fixe.
//  - Colonne "NC" : toujours à 0 (son usage exact sur le modèle papier n'est pas connu).
//  - Photo de l'élève : pas de système de dépôt de photo — silhouette générique.
//  - Signatures / cachet (Prof. Principal, Chef d'établissement) : pas de système de signature
//    numérique — seul le nom est affiché.
//  - Discipline (absences/retards) : calculée depuis l'appel (Présences) sur une période de
//    trimestre estimée par défaut (voir backend/src/utils/bulletinData.js) — à confirmer par école.
//  - Exclusion / conseil de classe (TH, EN, FEL...) et observation : saisie manuelle, à renseigner
//    dans le panneau "Discipline et conseil de classe" avant impression.
import { useState } from 'react'

const LOGO_EXTENSIONS = ['png', 'jpg', 'jpeg']

const TRIMESTRE_LABELS = { 1: 'PREMIER', 2: 'DEUXIÈME', 3: 'TROISIÈME' }

const ABREVIATIONS_CONSEIL = [
  { id: 'tableauHonneur', label: 'TH' },
  { id: 'encouragement', label: 'EN' },
  { id: 'felicitations', label: 'FEL' },
  { id: 'avertissementTravail', label: 'AT' },
  { id: 'blameTravail', label: 'BT' },
  { id: 'avertissementConduite', label: 'AC' },
  { id: 'blameConduite', label: 'BC' }
]

function formatDateFr(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// Cherche /logos/<nomCourt>.png puis .jpg puis .jpeg ; à défaut, un badge avec les initiales de l'école.
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
const formatNote = (n) => (n === null || n === undefined ? '' : Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/,00$/, ''))

const format2 = (n) => (n === null || n === undefined ? '' : Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))

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
    eleve, ecole, effectif, rang, rangLabel, groupes, coefTotal, nxcTotal, moyenneGenerale, mentionGenerale,
    moyenneEval1, moyenneEval2, programmeDefini, matieresTotal, classe, discipline, professeurPrincipal,
    chefEtablissement, bulletin, trimestre, anneeScolaire
  } = data
  const ministere = ministereParNiveau(ecole.niveau)
  const bulletinManuel = bulletin || {}
  const cocheParAbreviation = (id) => !!bulletinManuel[id]

  const totalColonnes = 10

  return (
    <div className="bg-white text-black mx-auto" style={{ width: '210mm', minHeight: '297mm', padding: '8mm', fontFamily: 'Arial, sans-serif' }}>
      {/* En-tête bilingue : FR | logo | EN */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-[9px] text-center leading-tight">
        <div>
          <p className="font-bold">RÉPUBLIQUE DU CAMEROUN</p>
          <p className="italic">Paix - Travail - Patrie</p>
          <p className="font-semibold mt-1">{ministere.fr}</p>
          <p>DÉLÉGATION RÉGIONALE {ecole.delegationRegionale || 'DU CENTRE'}</p>
          <p>DÉLÉGATION DÉPARTEMENTALE {ecole.delegationDepartementale || 'DU MFOUNDI'}</p>
        </div>
        <LogoEcole nomCourt={ecole.nomCourt} />
        <div>
          <p className="font-bold">REPUBLIC OF CAMEROON</p>
          <p className="italic">Peace - Work - Fatherland</p>
          <p className="font-semibold mt-1">{ministere.en}</p>
          <p>DIVISIONAL DELEGATION {ecole.delegationRegionale ? `OF ${ecole.delegationRegionale}` : 'OF THE CENTER'}</p>
          <p>SUBDIVISIONAL DELEGATION {ecole.delegationDepartementale ? `OF ${ecole.delegationDepartementale}` : 'OF MFOUNDI'}</p>
        </div>
      </div>

      {/* Nom de l'école + adresse + filet rouge */}
      <div className="flex flex-col items-center mt-1">
        <h1 className="text-2xl font-extrabold text-red-700 tracking-wide text-center uppercase">{ecole.nomComplet}</h1>
        <p className="text-[10px] text-center mt-0.5">
          {ecole.adresse} — Tél : {ecole.telephone} — Email : {ecole.email}
        </p>
        <div className="w-full border-t-4 border-red-700 mt-1" />
      </div>

      {/* Titre */}
      <div className="text-center font-bold text-lg underline mt-2 mb-2">
        BULLETIN DU {TRIMESTRE_LABELS[trimestre] || `${trimestre}ᵉ`} TRIMESTRE
      </div>

      {/* Infos élève : nom/naissance/matricule/année à gauche, sexe/classe/redoublant au centre,
          effectif (sur la ligne "Classe"), photo à l'extrémité droite alignée en haut */}
      <div className="flex items-start gap-3 text-[11px] mb-2">
        <div className="space-y-0.5 flex-1">
          <p><span className="text-slate-700">Nom et prénom :</span> <strong>{eleve.nom} {eleve.prenom}</strong></p>
          <p><span className="text-slate-700">Date de naissance :</span> {formatDateFr(eleve.dateNaissance)}{eleve.lieuNaissance ? ` à ${eleve.lieuNaissance}` : ''}</p>
          <p><span className="text-slate-700">Matricule :</span> {eleve.matricule}</p>
          <p><span className="text-slate-700">Année scolaire :</span> {anneeScolaire}</p>
        </div>
        <div className="space-y-0.5 flex-1">
          <p><span className="text-slate-700">Sexe/Gender :</span> {eleve.sexe === 'FEMININ' ? 'FEMININ' : eleve.sexe === 'MASCULIN' ? 'MASCULIN' : ''}</p>
          <p><span className="text-slate-700">Classe</span> <strong>{eleve.classe}</strong></p>
          <p className="flex items-center gap-2"><span className="text-slate-700">Redoublant ?</span> <Case coche={eleve.redouble} label="OUI" /> <Case coche={!eleve.redouble} label="NON" /></p>
        </div>
        <div className="space-y-0.5 shrink-0 w-28">
          <p>&nbsp;</p>
          <p><span className="text-slate-700">Effectif</span> <span className="ml-2">{effectif} élèves</span></p>
        </div>
        <PhotoPlaceholder />
      </div>

      {/* Tableau des notes, groupé par matière */}
      <table className="w-full border-collapse border border-black text-[9.5px]">
        <thead>
          <tr className="bg-slate-200">
            <th className="border border-black px-1 py-1 text-left">MATIÈRES</th>
            <th className="border border-black px-1 py-1 text-left">COMPÉTENCES</th>
            <th className="border border-black px-1 py-1 w-10">EVAL1</th>
            <th className="border border-black px-1 py-1 w-10">EVAL2</th>
            <th className="border border-black px-1 py-1 w-10">Note</th>
            <th className="border border-black px-1 py-1 w-8">Coef</th>
            <th className="border border-black px-1 py-1 w-12">NxC</th>
            <th className="border border-black px-1 py-1 w-7">NC</th>
            <th className="border border-black px-1 py-1 w-10">APC</th>
            <th className="border border-black px-1 py-1 w-20">Mention</th>
          </tr>
        </thead>
        <tbody>
          {!programmeDefini ? (
            <tr>
              <td colSpan={totalColonnes} className="border border-black px-2 py-4 text-center text-slate-400">
                Le programme de cette classe (matières et coefficients) n'est pas encore défini
              </td>
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
                    <td className="border border-black px-1 py-0.5 text-slate-400 italic">Compétence...</td>
                    <td className={`border border-black px-1 py-0.5 text-center font-semibold ${rougeSi(l.eval1 !== null && l.eval1 < 10)}`}>{formatNote(l.eval1)}</td>
                    <td className={`border border-black px-1 py-0.5 text-center font-semibold ${rougeSi(l.eval2 !== null && l.eval2 < 10)}`}>{formatNote(l.eval2)}</td>
                    <td className={`border border-black px-1 py-0.5 text-center font-semibold ${rougeSi(l.note !== null && l.note < 10)}`}>{formatNote(l.note)}</td>
                    <td className="border border-black px-1 py-0.5 text-center">{l.coefficient}</td>
                    <td className={`border border-black px-1 py-0.5 text-center ${rougeSi(l.note !== null && l.note < 10)}`}>{formatNote(l.nxc)}</td>
                    <td className="border border-black px-1 py-0.5 text-center">0</td>
                    <td className={`border border-black px-1 py-0.5 text-center ${rougeSi(l.note !== null && l.note < 10)}`}>{l.apc}</td>
                    <td className={`border border-black px-1 py-0.5 ${rougeSi(l.note !== null && l.note < 10)}`}>{l.mention}</td>
                  </tr>
                ))}
                <tr key={`${groupe.nom}-total`} className="bg-slate-100 font-semibold">
                  <td className="border border-black px-1 py-0.5" colSpan={2}>
                    GROUPE {groupe.numero} / MOY = <span className={rougeSi(groupe.moyenne !== null && groupe.moyenne < 10)}>{formatNote(groupe.moyenne)}</span>
                  </td>
                  <td className="border border-black" colSpan={3}></td>
                  <td className="border border-black px-1 py-0.5 text-center">{groupe.coefTotal}</td>
                  <td className="border border-black px-1 py-0.5 text-center">{formatNote(groupe.nxcTotal)}</td>
                  <td className="border border-black" colSpan={2}></td>
                  <td className={`border border-black px-1 py-0.5 ${rougeSi(groupe.moyenne !== null && groupe.moyenne < 10)}`}>{groupe.mention}</td>
                </tr>
              </>
            ))
          )}
          {programmeDefini && (
            <tr className="bg-slate-100 font-semibold">
              <td className="border border-black px-1 py-1" colSpan={2}>Moyennes des périodes</td>
              <td className="border border-black px-1 py-1 text-center">{formatNote(moyenneEval1)}</td>
              <td className="border border-black px-1 py-1 text-center">{formatNote(moyenneEval2)}</td>
              <td className="border border-black" colSpan={6}></td>
            </tr>
          )}
        </tbody>
      </table>
      <p className="text-[7px] text-slate-500 italic leading-tight mt-0.5">
        ABS = Absences, CON = Consignes, EXP = Expulsion au cours, T.H. = Tableau d'honneur, ENC = Encouragement, FEL = Félicitation,
        A.T. = Avertissement Travail, B.T. = Blâme Travail, A.C. = Avertissement Conduite, B.C. = Blâme Conduite, EXC = Exclusion,
        Nbr jour = Nombre de jour d'exclusion, PN = Première note, DN = Dernière note.
      </p>

      {/* Discipline / Conseil de classe / Travail du trimestre — un seul tableau continu, collé */}
      {/* 16 colonnes : Discipline (5) | Conseil de classe (7) | Travail (4), disposition du modèle papier */}
      <table className="w-full border-collapse border border-black text-[10px] mt-2 table-fixed">
        <colgroup>
          <col style={{ width: '16%' }} /><col style={{ width: '5.5%' }} /><col style={{ width: '8.5%' }} /><col style={{ width: '5%' }} /><col style={{ width: '5.5%' }} />
          {ABREVIATIONS_CONSEIL.map(({ id }) => <col key={id} style={{ width: '4.5%' }} />)}
          <col style={{ width: '9.5%' }} /><col style={{ width: '7%' }} /><col style={{ width: '5%' }} /><col style={{ width: '6.5%' }} />
        </colgroup>
        <thead>
          <tr className="bg-slate-200">
            <th className="border border-black py-1 px-1" colSpan={5}>DISCIPLINE TRIMESTRE {trimestre}</th>
            <th className="border border-black py-1 px-1" colSpan={7}>CONSEIL DE CLASSE TRIMESTRE {trimestre}</th>
            <th className="border border-black py-1 px-1" colSpan={4}>TRAVAIL TRIMESTRE {trimestre}</th>
          </tr>
        </thead>
        <tbody className="italic">
          <tr>
            <td className="border border-black px-1 py-1"><Case coche={!!bulletinManuel.joursExclusion} label="Exclu(e)" /></td>
            <td className="border border-black px-1 py-1 text-center">{bulletinManuel.joursExclusion ? `${bulletinManuel.joursExclusion} ` : ''}Jr</td>
            <td className="border border-black px-1 py-1 text-center not-italic font-semibold">Natures</td>
            <td className="border border-black px-1 py-1 text-center not-italic font-semibold">J</td>
            <td className="border border-black px-1 py-1 text-center not-italic font-semibold">NJ</td>
            {ABREVIATIONS_CONSEIL.map(({ id, label }) => (
              <td key={id} className="border border-black px-0.5 py-1 text-center font-semibold">{label}</td>
            ))}
            <td className="border border-black px-1 py-1">Coef</td>
            <td className="border border-black px-1 py-1 text-right not-italic">{format2(coefTotal)}</td>
            <td className="border border-black px-1 py-1">Total</td>
            <td className="border border-black px-1 py-1 text-right not-italic">{format2(nxcTotal)}</td>
          </tr>
          <tr>
            <td className="border border-black px-1 py-1 text-right">Exclusion Définitive</td>
            <td className="border border-black px-1 py-1 text-center"><Boite coche={bulletinManuel.exclusionDefinitive} /></td>
            <td className="border border-black px-1 py-1">Absence</td>
            <td className="border border-black px-1 py-1 text-center not-italic">{discipline.absencesJustifiees || ''}</td>
            <td className="border border-black px-1 py-1 text-center not-italic">{discipline.absencesNonJustifiees || ''}</td>
            {ABREVIATIONS_CONSEIL.map(({ id }) => (
              <td key={id} className="border border-black px-0.5 py-1 text-center"><Boite coche={cocheParAbreviation(id)} /></td>
            ))}
            <td className="border border-black px-1 py-1">Rang</td>
            <td className="border border-black px-1 py-1 text-center not-italic">{rangLabel}</td>
            <td className="border border-black px-1 py-1">Moy..</td>
            <td className={`border border-black px-1 py-1 text-right not-italic ${rougeSi(moyenneGenerale !== null && moyenneGenerale < 10)}`}>{format2(moyenneGenerale)}</td>
          </tr>
          <tr>
            <td className="border border-black px-1 py-1 text-right">Absentéisme</td>
            <td className="border border-black px-1 py-1 text-center"><Boite coche={bulletinManuel.absenteisme} /></td>
            <td className="border border-black px-1 py-1">Retards</td>
            <td className="border border-black px-1 py-1 text-center not-italic" colSpan={2}>{discipline.retards || ''}</td>
            <td className="border border-black px-1 py-1" colSpan={3}>Nb Moy&gt;=10</td>
            <td className="border border-black px-1 py-1 text-center not-italic">{classe.nbAuDessus}</td>
            <td className="border border-black px-1 py-1" colSpan={2}>P Moye...</td>
            <td className="border border-black px-1 py-1 text-right not-italic">{format2(classe.plusForteMoyenne)}</td>
            <td className="border border-black px-1 py-1" colSpan={3}>Moyenne Générale</td>
            <td className="border border-black px-1 py-1 text-right not-italic">{format2(classe.moyenneGenerale)}</td>
          </tr>
          <tr>
            <td className="border border-black px-1 py-1 text-right">Conduite déplorable</td>
            <td className="border border-black px-1 py-1 text-center"><Boite coche={bulletinManuel.conduiteDeplorable} /></td>
            <td className="border border-black px-1 py-1" colSpan={2}>Convocation</td>
            <td className="border border-black px-1 py-1 text-center"><Boite coche={bulletinManuel.convocation} /></td>
            <td className="border border-black px-1 py-1" colSpan={3}>Nb Moy&lt;10</td>
            <td className="border border-black px-1 py-1 text-center not-italic">{classe.nbEnDessous}</td>
            <td className="border border-black px-1 py-1" colSpan={2}>D Moye...</td>
            <td className="border border-black px-1 py-1 text-right not-italic">{format2(classe.plusFaibleMoyenne)}</td>
            <td className="border border-black px-1 py-1" colSpan={3}>Nombre Matières</td>
            <td className="border border-black px-1 py-1 text-right not-italic">{matieresTotal}</td>
          </tr>
        </tbody>
      </table>

      {/* Courbe de progression / Visas / Observation — même principe, un seul tableau continu */}
      <table className="w-full border-collapse border border-black text-[10px] mt-2">
        <thead>
          <tr className="bg-slate-100">
            <th className="border border-black py-1.5 px-1">COURBE PROGRESSION</th>
            <th className="border border-black py-1.5 px-1">VISA PROF. PRINCIPAL</th>
            <th className="border border-black py-1.5 px-1">OBSERVATION DU CONSEIL</th>
            <th className="border border-black py-1.5 px-1">VISA CHEF ÉTABLISSEMENT</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-black align-middle p-1.5 h-24"><CourbeProgression eval1={moyenneEval1} eval2={moyenneEval2} /></td>
            <td className="border border-black align-middle text-center p-1.5 h-24">{professeurPrincipal || <span className="text-slate-400 italic">Non désigné</span>}</td>
            <td className="border border-black align-middle text-center p-1.5 h-24 font-semibold">{bulletinManuel.observationConseil || ''}</td>
            <td className="border border-black align-middle text-center p-1.5 h-24">{chefEtablissement || <span className="text-slate-400 italic">Non désigné</span>}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
