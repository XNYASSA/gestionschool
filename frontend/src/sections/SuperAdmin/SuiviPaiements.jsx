import { useState, useEffect, useMemo } from 'react'
import { CheckCircle, XCircle, Loader, Users, ChevronRight, ArrowLeft, School, Layers, Wallet, PiggyBank, Phone, Search } from 'lucide-react'
import { apiClient } from '../../api/client'
import { formatFCFA } from '../../utils/formatters'
import BoutonsExport from '../../components/BoutonsExport'
import { nomFichierSur } from '../../utils/exportTableau'

function calculerStatutEleve(fraisEleve) {
  const montantDu = fraisEleve.reduce((sum, f) => sum + f.montantDu, 0)
  const montantPaye = fraisEleve.reduce((sum, f) => sum + f.montantPaye, 0)

  let statut = 'IMPAYE'
  if (montantPaye >= montantDu && montantDu > 0) statut = 'SOLDE'
  else if (montantPaye > 0) statut = 'PARTIEL'

  return { montantDu, montantPaye, statut }
}

const POSTES_SUIVIS = ['inscription', 'tranche1', 'tranche2', 'tranche3']

// "Inscription" = frais d'inscription + tous les frais hors tranches de pension (livret médical, laboratoire, TD...)
function extrairePostes(fraisEleve) {
  const somme = (liste) => liste.length ? { du: liste.reduce((s, f) => s + f.montantDu, 0), paye: liste.reduce((s, f) => s + f.montantPaye, 0) } : null
  const postes = { inscription: somme(fraisEleve.filter(fr => !/^tranche\d+$/.test(fr.tranche))) }
  for (const tranche of POSTES_SUIVIS.slice(1)) {
    postes[tranche] = somme(fraisEleve.filter(fr => fr.tranche === tranche))
  }
  return postes
}

export default function SuiviPaiements() {
  const [frais, setFrais] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [selectedEcole, setSelectedEcole] = useState(null) // { id, nom }
  const [selectedClasse, setSelectedClasse] = useState(null) // { id, nom }
  const [listeGlobale, setListeGlobale] = useState(null) // 'PAYE' | 'NON_PAYE' | null — toutes écoles confondues
  const [rechercheGlobale, setRechercheGlobale] = useState('')

  useEffect(() => {
    loadFrais()
  }, [])

  const loadFrais = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await apiClient.getFrais()
      setFrais(data)
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des paiements')
    } finally {
      setLoading(false)
    }
  }

  // Regrouper les frais par élève avec toutes les infos utiles
  const elevesAvecStatut = useMemo(() => {
    const parEleve = {}
    for (const f of frais) {
      if (!f.eleve) continue
      const id = f.eleve.id
      if (!parEleve[id]) parEleve[id] = { eleve: f.eleve, frais: [] }
      parEleve[id].frais.push(f)
    }

    return Object.values(parEleve).map(({ eleve, frais: fraisEleve }) => {
      const { montantDu, montantPaye, statut } = calculerStatutEleve(fraisEleve)
      const datesPayees = fraisEleve.filter(f => f.montantPaye > 0 && f.datePayement).map(f => f.datePayement)
      return {
        id: eleve.id,
        nom: eleve.nom,
        prenom: eleve.prenom,
        matricule: eleve.matricule,
        sexe: eleve.sexe,
        classeId: eleve.classeId,
        classeNom: eleve.classe?.nom || '-',
        ecoleId: eleve.classe?.ecole?.id,
        ecoleNom: eleve.classe?.ecole?.nomCourt || '-',
        parent: eleve.nomParent,
        lieuParente: eleve.lieuParente,
        tel: eleve.telephoneParent,
        montantDu,
        montantPaye,
        restant: montantDu - montantPaye,
        postes: extrairePostes(fraisEleve),
        statut,
        // Le dernier versement n'est daté que s'il a été saisi ou importé après cette fonctionnalité :
        // un élève payé lors d'un import plus ancien peut ne pas en avoir.
        dernierPaiement: datesPayees.length ? datesPayees.sort()[datesPayees.length - 1] : null
      }
    })
  }, [frais])

  // Niveau 1 : agrégation par école
  const ecolesSummary = useMemo(() => {
    const map = {}
    elevesAvecStatut.forEach(e => {
      if (!e.ecoleId) return
      if (!map[e.ecoleId]) {
        map[e.ecoleId] = { id: e.ecoleId, nom: e.ecoleNom, percu: 0, restant: 0, nbEleves: 0 }
      }
      map[e.ecoleId].percu += e.montantPaye
      map[e.ecoleId].restant += e.restant
      map[e.ecoleId].nbEleves += 1
    })
    return Object.values(map).sort((a, b) => a.nom.localeCompare(b.nom))
  }, [elevesAvecStatut])

  // Totaux globaux, toutes écoles confondues
  const totauxGlobaux = useMemo(() => {
    const totalPercu = elevesAvecStatut.reduce((sum, e) => sum + e.montantPaye, 0)
    const totalRestant = elevesAvecStatut.reduce((sum, e) => sum + e.restant, 0)
    const enfantsAyantPaye = elevesAvecStatut.filter(e => e.montantPaye > 0).length
    const enfantsNonPayes = elevesAvecStatut.filter(e => e.montantPaye === 0).length
    return { totalPercu, totalRestant, enfantsAyantPaye, enfantsNonPayes }
  }, [elevesAvecStatut])

  // Niveau 2 : agrégation par classe (pour l'école sélectionnée)
  const classesSummary = useMemo(() => {
    if (!selectedEcole) return []
    const map = {}
    elevesAvecStatut.filter(e => e.ecoleId === selectedEcole.id).forEach(e => {
      if (!map[e.classeId]) {
        map[e.classeId] = { id: e.classeId, nom: e.classeNom, percu: 0, restant: 0, nbEleves: 0 }
      }
      map[e.classeId].percu += e.montantPaye
      map[e.classeId].restant += e.restant
      map[e.classeId].nbEleves += 1
    })
    return Object.values(map).sort((a, b) => a.nom.localeCompare(b.nom))
  }, [elevesAvecStatut, selectedEcole])

  // Niveau 3 : élèves de la classe sélectionnée, séparés solvables / insolvables
  const elevesClasse = useMemo(() => {
    if (!selectedClasse) return { solvables: [], insolvables: [] }
    const eleves = elevesAvecStatut
      .filter(e => e.classeId === selectedClasse.id)
      .sort((a, b) => a.nom.localeCompare(b.nom) || a.prenom.localeCompare(b.prenom))
    return {
      solvables: eleves.filter(e => e.statut === 'SOLDE'),
      insolvables: eleves.filter(e => e.statut !== 'SOLDE')
    }
  }, [elevesAvecStatut, selectedClasse])

  // Liste globale (toutes écoles) affichée après clic sur les cartes "Enfants ayant payé" / "n'ayant pas payé"
  const elevesListeGlobale = useMemo(() => {
    if (!listeGlobale) return []
    const base = elevesAvecStatut.filter(e => listeGlobale === 'PAYE' ? e.montantPaye > 0 : e.montantPaye === 0)
    const terme = rechercheGlobale.trim().toLowerCase()
    const filtres = terme
      ? base.filter(e => `${e.nom} ${e.prenom} ${e.matricule} ${e.parent} ${e.tel}`.toLowerCase().includes(terme))
      : base
    return filtres.sort((a, b) => a.ecoleNom.localeCompare(b.ecoleNom) || a.classeNom.localeCompare(b.classeNom) || a.nom.localeCompare(b.nom))
  }, [elevesAvecStatut, listeGlobale, rechercheGlobale])

  const ouvrirListeGlobale = (type) => {
    setSelectedEcole(null)
    setSelectedClasse(null)
    setRechercheGlobale('')
    setListeGlobale(type)
  }

  const exportListeGlobale = () => ({
    sections: [{
      titre: listeGlobale === 'PAYE' ? 'ENFANTS AYANT PAYÉ' : "ENFANTS N'AYANT PAS PAYÉ",
      nomFeuille: listeGlobale === 'PAYE' ? 'Ont payé' : "N'ont pas payé",
      paysage: true,
      entete: [`Toutes écoles — ${elevesListeGlobale.length} élève(s)`],
      colonnes: [
        { titre: 'École' }, { titre: 'Classe' }, { titre: 'Élève' }, { titre: 'Parent' }, { titre: 'Téléphone' },
        { titre: 'Payé', centre: true, type: 'note' }, { titre: 'Dû', centre: true, type: 'note' }, { titre: 'Reste à payer', centre: true, type: 'note' },
        { titre: 'Dernier versement' }
      ],
      lignes: elevesListeGlobale.map(e => [
        e.ecoleNom, e.classeNom, `${e.nom} ${e.prenom}`, e.parent || '', e.tel || '',
        e.montantPaye, e.montantDu, Math.max(0, e.restant),
        e.dernierPaiement ? new Date(e.dernierPaiement).toLocaleDateString('fr-FR') : ''
      ])
    }],
    nomFichier: `enfants-${nomFichierSur(listeGlobale === 'PAYE' ? 'ayant-paye' : 'non-payes')}`
  })

  const getStatusBadge = (statut) => {
    if (statut === 'SOLDE') return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">✓ Soldé</span>
    if (statut === 'PARTIEL') return <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">⚠ Partiel</span>
    return <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">✗ Non soldé</span>
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2 bg-white rounded-lg shadow-md">
        <Loader className="w-5 h-5 animate-spin" /> Chargement...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Totaux globaux, toutes écoles confondues */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-green-600" />
            <p className="text-xs font-medium text-slate-600">Total perçu (toutes écoles)</p>
          </div>
          <p className="text-xl font-bold text-green-600">{formatFCFA(totauxGlobaux.totalPercu)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-red-500">
          <div className="flex items-center gap-2 mb-1">
            <PiggyBank className="w-4 h-4 text-red-600" />
            <p className="text-xs font-medium text-slate-600">Restant à percevoir (toutes écoles)</p>
          </div>
          <p className="text-xl font-bold text-red-600">{formatFCFA(totauxGlobaux.totalRestant)}</p>
        </div>
        <button
          onClick={() => ouvrirListeGlobale('PAYE')}
          className={`bg-white rounded-lg shadow-md p-4 border-l-4 text-left transition hover:shadow-lg hover:ring-2 hover:ring-blue-400 ${listeGlobale === 'PAYE' ? 'ring-2 ring-blue-400 border-blue-500' : 'border-blue-500'}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-blue-600" />
            <p className="text-xs font-medium text-slate-600">Enfants ayant payé</p>
          </div>
          <p className="text-xl font-bold text-blue-600">{totauxGlobaux.enfantsAyantPaye}</p>
          <p className="text-[11px] text-blue-500 mt-1">Voir la liste →</p>
        </button>
        <button
          onClick={() => ouvrirListeGlobale('NON_PAYE')}
          className={`bg-white rounded-lg shadow-md p-4 border-l-4 text-left transition hover:shadow-lg hover:ring-2 hover:ring-slate-400 ${listeGlobale === 'NON_PAYE' ? 'ring-2 ring-slate-400 border-slate-500' : 'border-slate-400'}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-4 h-4 text-slate-600" />
            <p className="text-xs font-medium text-slate-600">Enfants n'ayant pas payé</p>
          </div>
          <p className="text-xl font-bold text-slate-700">{totauxGlobaux.enfantsNonPayes}</p>
          <p className="text-[11px] text-slate-500 mt-1">Voir la liste →</p>
        </button>
      </div>

      <div className="flex items-center gap-2 text-sm text-slate-500">
        <button
          onClick={() => { setSelectedEcole(null); setSelectedClasse(null); setListeGlobale(null) }}
          className={`hover:text-blue-600 transition ${!selectedEcole && !listeGlobale ? 'font-bold text-slate-900' : ''}`}
        >
          🏫 Écoles
        </button>
        {listeGlobale && (
          <>
            <ChevronRight className="w-4 h-4" />
            <span className="font-bold text-slate-900">{listeGlobale === 'PAYE' ? 'Enfants ayant payé' : "Enfants n'ayant pas payé"}</span>
          </>
        )}
        {selectedEcole && (
          <>
            <ChevronRight className="w-4 h-4" />
            <button
              onClick={() => setSelectedClasse(null)}
              className={`hover:text-blue-600 transition ${!selectedClasse ? 'font-bold text-slate-900' : ''}`}
            >
              {selectedEcole.nom}
            </button>
          </>
        )}
        {selectedClasse && (
          <>
            <ChevronRight className="w-4 h-4" />
            <span className="font-bold text-slate-900">{selectedClasse.nom}</span>
          </>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">⚠️ {error}</div>
      )}

      {/* Liste globale (toutes écoles) : enfants ayant payé / n'ayant pas payé */}
      {listeGlobale && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setListeGlobale(null)} className="p-2 hover:bg-slate-100 rounded-lg transition">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <h2 className="text-2xl font-bold text-slate-900">
              {listeGlobale === 'PAYE' ? '✓ Enfants ayant payé' : "✗ Enfants n'ayant pas payé"} — toutes écoles ({elevesListeGlobale.length})
            </h2>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={rechercheGlobale}
                onChange={(e) => setRechercheGlobale(e.target.value)}
                placeholder="Rechercher un élève, un parent, un numéro..."
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <BoutonsExport construire={exportListeGlobale} disabled={elevesListeGlobale.length === 0} />
          </div>

          <EleveGroupTable
            title={listeGlobale === 'PAYE' ? 'Élèves ayant versé au moins un paiement' : "Élèves n'ayant encore rien payé"}
            icon={listeGlobale === 'PAYE' ? <CheckCircle className="w-5 h-5 text-blue-600" /> : <XCircle className="w-5 h-5 text-slate-600" />}
            eleves={elevesListeGlobale}
            getStatusBadge={getStatusBadge}
            avecEcoleClasse
          />
        </div>
      )}

      {/* NIVEAU 1 : Écoles */}
      {!listeGlobale && !selectedEcole && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">💰 Statuts de paiement par école</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ecolesSummary.map(ecole => (
              <button
                key={ecole.id}
                onClick={() => setSelectedEcole({ id: ecole.id, nom: ecole.nom })}
                className="bg-white rounded-lg shadow-md p-5 text-left hover:shadow-lg hover:ring-2 hover:ring-blue-400 transition group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <School className="w-5 h-5 text-blue-600" />
                    <h3 className="font-bold text-slate-900">{ecole.nom}</h3>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition" />
                </div>
                <p className="text-xs text-slate-500 mb-3">{ecole.nbEleves} élève{ecole.nbEleves > 1 ? 's' : ''}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-500">Frais perçus</p>
                    <p className="font-bold text-green-600">{formatFCFA(ecole.percu)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Restant à percevoir</p>
                    <p className="font-bold text-red-600">{formatFCFA(ecole.restant)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* NIVEAU 2 : Classes de l'école sélectionnée */}
      {selectedEcole && !selectedClasse && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setSelectedEcole(null)} className="p-2 hover:bg-slate-100 rounded-lg transition">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <h2 className="text-2xl font-bold text-slate-900">Classes — {selectedEcole.nom}</h2>
          </div>
          {classesSummary.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center text-slate-500">Aucune classe avec des frais enregistrés</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {classesSummary.map(classe => (
                <button
                  key={classe.id}
                  onClick={() => setSelectedClasse({ id: classe.id, nom: classe.nom })}
                  className="bg-white rounded-lg shadow-md p-4 text-left hover:shadow-lg hover:ring-2 hover:ring-blue-400 transition group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-blue-600" />
                      <h3 className="font-bold text-slate-900">{classe.nom}</h3>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition" />
                  </div>
                  <p className="text-xs text-slate-500 mb-2">{classe.nbEleves} élève{classe.nbEleves > 1 ? 's' : ''}</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Perçu</span>
                      <span className="font-semibold text-green-600">{formatFCFA(classe.percu)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Restant</span>
                      <span className="font-semibold text-red-600">{formatFCFA(classe.restant)}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* NIVEAU 3 : Élèves de la classe sélectionnée */}
      {selectedClasse && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <button onClick={() => setSelectedClasse(null)} className="p-2 hover:bg-slate-100 rounded-lg transition">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <h2 className="text-2xl font-bold text-slate-900">Élèves — {selectedClasse.nom}</h2>
          </div>

          <div className="flex items-center gap-4 text-sm text-slate-600">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-500" /> Garçons : <strong className="text-slate-900">{[...elevesClasse.solvables, ...elevesClasse.insolvables].filter(e => e.sexe === 'MASCULIN').length}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-pink-500" /> Filles : <strong className="text-slate-900">{[...elevesClasse.solvables, ...elevesClasse.insolvables].filter(e => e.sexe === 'FEMININ').length}</strong>
            </span>
          </div>

          {/* Élèves solvables */}
          <EleveGroupTable
            title="Élèves solvables (à jour)"
            icon={<CheckCircle className="w-5 h-5 text-green-600" />}
            eleves={elevesClasse.solvables}
            getStatusBadge={getStatusBadge}
          />

          {/* Élèves insolvables */}
          <EleveGroupTable
            title="Élèves insolvables (solde restant)"
            icon={<XCircle className="w-5 h-5 text-red-600" />}
            eleves={elevesClasse.insolvables}
            getStatusBadge={getStatusBadge}
          />
        </div>
      )}
    </div>
  )
}

function PosteCell({ poste }) {
  if (!poste) return <span className="text-slate-300">—</span>
  const couleur = poste.paye >= poste.du && poste.du > 0
    ? 'text-green-600'
    : poste.paye > 0
      ? 'text-orange-600'
      : 'text-slate-400'
  if (poste.paye > poste.du) {
    return (
      <span className="font-semibold text-red-600" title="Le montant payé dépasse le montant dû : à vérifier">
        {formatFCFA(poste.paye)}
        <span className="text-red-400 font-normal"> / {formatFCFA(poste.du)}</span>
        <span className="block text-xs">⚠ Trop-perçu de {formatFCFA(poste.paye - poste.du)} à vérifier</span>
      </span>
    )
  }
  return (
    <span className={`font-semibold ${couleur}`}>
      {formatFCFA(poste.paye)}
      <span className="text-slate-400 font-normal"> / {formatFCFA(poste.du)}</span>
    </span>
  )
}

// Numéro nettoyé pour un lien tel: (garde le premier numéro si plusieurs sont séparés par / ou ,)
const lienTel = (tel) => (tel || '').split(/[/,]/)[0].replace(/[^\d+]/g, '')

function TelephoneCell({ tel }) {
  const numero = lienTel(tel)
  if (!numero) return <span className="text-slate-300">—</span>
  return (
    <a href={`tel:${numero}`} onClick={(e) => e.stopPropagation()} className="text-blue-600 hover:underline inline-flex items-center gap-1">
      <Phone className="w-3.5 h-3.5" /> {tel}
    </a>
  )
}

function EleveGroupTable({ title, icon, eleves, getStatusBadge, avecEcoleClasse = false }) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center gap-2">
        {icon}
        <h3 className="font-bold text-slate-900">{title} ({eleves.length})</h3>
      </div>
      {eleves.length === 0 ? (
        <div className="p-6 text-center text-slate-500">Aucun élève dans cette catégorie</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {avecEcoleClasse && <th className="px-6 py-3 text-left font-semibold text-slate-700">École</th>}
                {avecEcoleClasse && <th className="px-6 py-3 text-left font-semibold text-slate-700">Classe</th>}
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Élève</th>
                <th className="px-6 py-3 text-center font-semibold text-slate-700">Sexe</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Parent</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Téléphone</th>
                <th className="px-6 py-3 text-center font-semibold text-slate-700">Inscription</th>
                <th className="px-6 py-3 text-center font-semibold text-slate-700">Tranche 1</th>
                <th className="px-6 py-3 text-center font-semibold text-slate-700">Tranche 2</th>
                <th className="px-6 py-3 text-center font-semibold text-slate-700">Tranche 3</th>
                <th className="px-6 py-3 text-center font-semibold text-slate-700">Statut</th>
                <th className="px-6 py-3 text-center font-semibold text-slate-700">Reste à payer</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Dernier versement</th>
              </tr>
            </thead>
            <tbody>
              {eleves.map(eleve => (
                <tr key={eleve.id} className="border-b border-slate-200 hover:bg-slate-50">
                  {avecEcoleClasse && <td className="px-6 py-3 text-slate-600">{eleve.ecoleNom}</td>}
                  {avecEcoleClasse && <td className="px-6 py-3 text-slate-600">{eleve.classeNom}</td>}
                  <td className="px-6 py-3 text-slate-900">{eleve.nom} {eleve.prenom}</td>
                  <td className="px-6 py-3 text-center text-slate-600">{eleve.sexe === 'MASCULIN' ? '♂ M' : eleve.sexe === 'FEMININ' ? '♀ F' : '-'}</td>
                  <td className="px-6 py-3 text-slate-600">{eleve.parent}{eleve.lieuParente ? ` (${eleve.lieuParente})` : ''}</td>
                  <td className="px-6 py-3"><TelephoneCell tel={eleve.tel} /></td>
                  {POSTES_SUIVIS.map(tranche => (
                    <td key={tranche} className="px-6 py-3 text-center font-mono">
                      <PosteCell poste={eleve.postes[tranche]} />
                    </td>
                  ))}
                  <td className="px-6 py-3 text-center">{getStatusBadge(eleve.statut)}</td>
                  <td className="px-6 py-3 text-center font-mono">
                    <span className={eleve.restant > 0 ? 'font-semibold text-red-600' : 'text-green-600'}>{formatFCFA(Math.max(0, eleve.restant))}</span>
                  </td>
                  <td className="px-6 py-3 text-slate-600 whitespace-nowrap">
                    {eleve.dernierPaiement ? new Date(eleve.dernierPaiement).toLocaleDateString('fr-FR') : <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
