// Reproduction du modèle papier fourni par le client (bulletin bilingue
// FR/EN, en-tête MINESEC, tableau des notes, bloc "Travail du trimestre").
// Les blocs Discipline / Conseil de classe restent des cadres vides pour
// l'instant : aucune donnée n'existe encore pour ces informations
// (absences, retards, décisions du conseil...).

// Logos des écoles — à compléter au fur et à mesure qu'ils sont fournis.
// En attendant, un badge avec les initiales de l'école tient la place.
const LOGOS_ECOLE = {
  // CRP_FRANCOPHONE: '/logos/crp.png',
}

const TRIMESTRE_LABELS = { 1: 'PREMIER', 2: 'DEUXIÈME', 3: 'TROISIÈME' }

function formatDateFr(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function LogoEcole({ nomCourt }) {
  const url = LOGOS_ECOLE[nomCourt]
  if (url) return <img src={url} alt={nomCourt} className="w-16 h-16 object-contain" />
  return (
    <div className="w-16 h-16 rounded-full bg-red-700 text-white flex items-center justify-center font-extrabold text-lg border-2 border-red-900">
      {nomCourt?.slice(0, 3)}
    </div>
  )
}

function ministereParNiveau(niveauEcole) {
  return niveauEcole === 'MATERNELLE_PRIMAIRE'
    ? { fr: "MINISTÈRE DE L'ÉDUCATION DE BASE", en: 'MINISTRY OF BASIC EDUCATION' }
    : { fr: 'MINISTÈRE DES ENSEIGNEMENTS SECONDAIRES', en: 'MINISTRY OF SECONDARY EDUCATION' }
}

function Champ({ label, value }) {
  return (
    <p className="whitespace-nowrap">
      <span className="text-slate-600">{label} :</span> <span className="font-semibold">{value ?? '-'}</span>
    </p>
  )
}

export default function BulletinTemplate({ data }) {
  const { eleve, ecole, effectif, rang, notes, totalCoefficients, totalPoints, moyenneGenerale, appreciation, trimestre, anneeScolaire } = data
  const ministere = ministereParNiveau(ecole.niveau)

  return (
    <div className="bg-white text-black mx-auto" style={{ width: '210mm', minHeight: '297mm', padding: '10mm', fontFamily: 'Arial, sans-serif' }}>
      {/* En-tête bilingue */}
      <div className="grid grid-cols-2 text-[10px] text-center leading-tight">
        <div>
          <p className="font-bold">RÉPUBLIQUE DU CAMEROUN</p>
          <p className="italic">Paix - Travail - Patrie</p>
          <p className="font-semibold mt-1">{ministere.fr}</p>
          <p>DÉLÉGATION RÉGIONALE DU CENTRE</p>
          <p>DÉLÉGATION DÉPARTEMENTALE DU MFOUNDI</p>
        </div>
        <div>
          <p className="font-bold">REPUBLIC OF CAMEROON</p>
          <p className="italic">Peace - Work - Fatherland</p>
          <p className="font-semibold mt-1">{ministere.en}</p>
          <p>DIVISIONAL DELEGATION OF THE CENTER</p>
          <p>SUBDIVISIONAL DELEGATION OF MFOUNDI</p>
        </div>
      </div>

      {/* Logo + nom de l'école */}
      <div className="flex flex-col items-center mt-2 mb-3">
        <LogoEcole nomCourt={ecole.nomCourt} />
        <h1 className="text-2xl font-extrabold text-red-700 tracking-wide text-center mt-1">{ecole.nomComplet?.toUpperCase()}</h1>
        <p className="text-[10px] text-center">
          {ecole.adresse} — Tél : {ecole.telephone} — Email : {ecole.email}
        </p>
      </div>

      {/* Titre */}
      <div className="border-2 border-black text-center font-bold py-1 mb-2 text-sm">
        BULLETIN DU {TRIMESTRE_LABELS[trimestre] || trimestre}ᵉ TRIMESTRE
      </div>

      {/* Infos élève */}
      <div className="border-2 border-black p-2 mb-2 text-xs flex justify-between gap-3">
        <div className="space-y-1 flex-1">
          <Champ label="Nom et prénom" value={`${eleve.nom} ${eleve.prenom}`} />
          <div className="grid grid-cols-2 gap-4">
            <Champ label="Date de naissance" value={formatDateFr(eleve.dateNaissance)} />
            <Champ label="Sexe/Gender" value={eleve.sexe === 'FEMININ' ? 'FÉMININ' : 'MASCULIN'} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Champ label="Matricule" value={eleve.matricule} />
            <Champ label="Classe" value={eleve.classe} />
            <Champ label="Effectif" value={`${effectif} élèves`} />
          </div>
          <Champ label="Année scolaire" value={anneeScolaire} />
        </div>
        <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-[9px] text-slate-400 shrink-0">
          Photo
        </div>
      </div>

      {/* Tableau des notes */}
      <table className="w-full border-collapse border border-black text-[11px]">
        <thead>
          <tr className="bg-slate-100">
            <th className="border border-black px-1 py-1 text-left">Matières</th>
            <th className="border border-black px-1 py-1 w-16">Note</th>
            <th className="border border-black px-1 py-1 w-12">Coef</th>
            <th className="border border-black px-1 py-1 w-16">N x C</th>
            <th className="border border-black px-1 py-1 w-24">Mention</th>
            <th className="border border-black px-1 py-1 text-left">Observation</th>
          </tr>
        </thead>
        <tbody>
          {notes.length === 0 ? (
            <tr>
              <td colSpan={6} className="border border-black px-2 py-4 text-center text-slate-400">
                Aucune note validée pour ce trimestre
              </td>
            </tr>
          ) : (
            notes.map((n, i) => (
              <tr key={i}>
                <td className="border border-black px-1 py-0.5">{n.matiere}</td>
                <td className={`border border-black px-1 py-0.5 text-center font-semibold ${n.note < 10 ? 'text-red-600' : 'text-green-700'}`}>{n.note}</td>
                <td className="border border-black px-1 py-0.5 text-center">{n.coefficient}</td>
                <td className="border border-black px-1 py-0.5 text-center">{(n.note * n.coefficient).toFixed(2)}</td>
                <td className="border border-black px-1 py-0.5 text-center">{n.mention}</td>
                <td className="border border-black px-1 py-0.5">{n.observation || ''}</td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr className="font-bold bg-slate-50">
            <td className="border border-black px-1 py-1 text-right">Total</td>
            <td className="border border-black px-1 py-1"></td>
            <td className="border border-black px-1 py-1 text-center">{totalCoefficients}</td>
            <td className="border border-black px-1 py-1 text-center">{totalPoints.toFixed(2)}</td>
            <td className="border border-black px-1 py-1 text-center" colSpan={2}>Moyenne : {moyenneGenerale}/20 — {appreciation}</td>
          </tr>
        </tfoot>
      </table>

      {/* Discipline / Conseil de classe / Travail du trimestre */}
      <div className="grid grid-cols-3 gap-2 mt-2 text-[10px]">
        <div className="border border-black p-2">
          <p className="font-bold text-center border-b border-black pb-1 mb-1">DISCIPLINE TRIMESTRE {trimestre}</p>
          <div className="space-y-1">
            <p>☐ Exclusion Définitive</p>
            <p>☐ Absentéisme</p>
            <p>☐ Conduite déplorable</p>
            <p>Nombre de jours d'absence : ____</p>
            <p>Retards : ____</p>
            <p>Convocations : ____</p>
          </div>
        </div>
        <div className="border border-black p-2">
          <p className="font-bold text-center border-b border-black pb-1 mb-1">CONSEIL DE CLASSE TRIMESTRE {trimestre}</p>
          <div className="space-y-1">
            <p>☐ TH  ☐ EN  ☐ FEL  ☐ AT  ☐ BT  ☐ BC</p>
            <p className="mt-1">Observation du conseil :</p>
            <p className="border-b border-slate-300 h-4"></p>
          </div>
        </div>
        <div className="border border-black p-2">
          <p className="font-bold text-center border-b border-black pb-1 mb-1">TRAVAIL TRIMESTRE {trimestre}</p>
          <div className="space-y-1">
            <p>Coefficients total : <span className="font-semibold">{totalCoefficients}</span></p>
            <p>Total points : <span className="font-semibold">{totalPoints.toFixed(2)}</span></p>
            <p>Rang : <span className="font-semibold">{rang}ᵉ / {effectif}</span></p>
            <p>Moyenne générale : <span className="font-semibold">{moyenneGenerale}/20</span></p>
            <p>Nombre de matières : <span className="font-semibold">{notes.length}</span></p>
          </div>
        </div>
      </div>

      {/* Visas */}
      <div className="grid grid-cols-2 gap-2 mt-3 text-[10px]">
        <div className="border border-black p-2 h-16">
          <p className="font-semibold">Visa du Professeur Principal</p>
        </div>
        <div className="border border-black p-2 h-16">
          <p className="font-semibold">Visa du Chef d'Établissement</p>
        </div>
      </div>
    </div>
  )
}
