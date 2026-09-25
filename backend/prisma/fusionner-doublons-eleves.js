import { PrismaClient } from '@prisma/client'
import { calculerStatut } from '../src/utils/inscriptionsFrais.js'

const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes('--dry-run')
const CLASSE_PREFEREE = (process.argv.find(a => a.startsWith('--preferer-classe=')) || '').slice('--preferer-classe='.length).trim()

// Fusionne les élèves enregistrés plusieurs fois (même nom et prénom, dans la même classe) : les imports
// répétés d'un même fichier avaient créé des copies qui faussent les effectifs et les montants perçus.
//  - une seule fiche est conservée : celle qui porte un vrai matricule (pas MATxxx), puis la plus payée, puis la plus ancienne ;
//  - les copies portent les mêmes versements : pour chaque poste on garde le montant le plus élevé (jamais la somme) ;
//  - le parent, le téléphone et les autres informations connues d'une copie sont reportés sur la fiche conservée ;
//  - un groupe dont une copie a des reçus, notes, présences, bulletins ou vérifications n'est PAS fusionné (listé) ;
//  - les élèves de même nom dans des classes différentes ne sont pas touchés (listés pour vérification), sauf avec
//    --preferer-classe=NOM : la copie située dans cette classe est alors conservée et les autres y sont fusionnées.

const NON_RENSEIGNE = 'Non renseigné'
const manquant = (v) => !String(v ?? '').trim() || String(v).trim().toLowerCase() === NON_RENSEIGNE.toLowerCase()
const cle = (e) => `${e.nom} ${e.prenom}`.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(' ').filter(Boolean).sort().join(' ')
const estMatriculeAuto = (m) => /^MAT\d+$/.test(m)
const fcfa = (n) => `${Number(n).toLocaleString('fr-FR')} FCFA`
const totalPaye = (e) => e.inscriptionsFrais.reduce((s, f) => s + f.montantPaye, 0)

const charger = () => prisma.eleve.findMany({
  include: {
    classe: { include: { ecole: true } },
    inscriptionsFrais: true,
    _count: { select: { paiements: true, notes: true, presences: true, bulletins: true, verificationsPaiement: true, notesEvaluations: true, anomaliesDetectees: true } }
  }
})

function regrouper(eleves, cleGroupe) {
  const groupes = new Map()
  eleves.forEach(e => {
    const k = cleGroupe(e)
    if (!groupes.has(k)) groupes.set(k, [])
    groupes.get(k).push(e)
  })
  return [...groupes.values()].filter(g => g.length > 1)
}

const stats = { fusionnes: 0, supprimes: 0, montantRetire: 0 }
const nonFusionnes = []

// Fusionne `groupe` sur la fiche `garde` ; retourne rien (affiche et applique)
async function fusionner(groupe, garde, libelle) {
  const autres = groupe.filter(e => e.id !== garde.id)

  const premierRenseigne = (champ) => groupe.map(e => e[champ]).find(v => !manquant(v))
  const donnees = {}
  if (manquant(garde.nomParent) && premierRenseigne('nomParent')) donnees.nomParent = premierRenseigne('nomParent')
  if (manquant(garde.telephoneParent) && premierRenseigne('telephoneParent')) donnees.telephoneParent = premierRenseigne('telephoneParent')
  for (const champ of ['sexe', 'dateNaissance', 'lieuParente', 'emailParent', 'adresseParent', 'filiere']) {
    if (garde[champ] === null || garde[champ] === undefined || garde[champ] === '') {
      const v = groupe.map(e => e[champ]).find(x => x !== null && x !== undefined && x !== '')
      if (v !== undefined) donnees[champ] = v
    }
  }

  const maxParPoste = new Map()
  groupe.forEach(e => e.inscriptionsFrais.forEach(f => maxParPoste.set(f.tranche, Math.max(maxParPoste.get(f.tranche) || 0, f.montantPaye))))
  const majPostes = garde.inscriptionsFrais.filter(f => maxParPoste.get(f.tranche) > f.montantPaye)

  console.log(`- ${libelle} : ${groupe.length} copies → garde ${garde.matricule} [${garde.classe.nom}] ; supprime ${autres.map(e => `${e.matricule} [${e.classe.nom}]`).join(', ')}` +
    `${Object.keys(donnees).length ? ` ; reporte ${Object.keys(donnees).join(', ')}` : ''}` +
    `${majPostes.length ? ` ; ${majPostes.length} poste(s) relevé(s) au maximum` : ''} ; total payé avant ${fcfa(groupe.reduce((s, e) => s + totalPaye(e), 0))} → après ${fcfa(garde.inscriptionsFrais.reduce((s, f) => s + Math.max(f.montantPaye, maxParPoste.get(f.tranche) || 0), 0))}`)

  stats.fusionnes++
  stats.supprimes += autres.length
  stats.montantRetire += autres.reduce((s, e) => s + totalPaye(e), 0)
  if (DRY_RUN) return

  await prisma.$transaction(async (tx) => {
    if (Object.keys(donnees).length) await tx.eleve.update({ where: { id: garde.id }, data: donnees })
    for (const f of majPostes) {
      const nouveau = maxParPoste.get(f.tranche)
      await tx.inscriptionFrais.update({ where: { id: f.id }, data: { montantPaye: nouveau, statut: calculerStatut(f.montantDu, nouveau) } })
    }
    await tx.eleve.deleteMany({ where: { id: { in: autres.map(e => e.id) } } })
  })
}

const aDesLiens = (e) => Object.values(e._count).some(n => n > 0)
const libelleGroupe = (g) => `${g[0].nom} ${g[0].prenom} [${g[0].classe.ecole.nomCourt}${new Set(g.map(e => e.classeId)).size === 1 ? ` / ${g[0].classe.nom}` : ''}]`

async function main() {
  console.log(DRY_RUN ? '### SIMULATION — aucune modification ###' : '### FUSION RÉELLE ###')

  // 1) Même nom dans la même classe
  for (const groupe of regrouper(await charger(), e => `${e.classeId}|${cle(e)}`)) {
    const liens = groupe.filter(aDesLiens)
    if (liens.length > 0) { nonFusionnes.push(`${libelleGroupe(groupe)} : ${liens.map(e => e.matricule).join(', ')} ont des reçus/notes/présences/bulletins — à fusionner à la main`); continue }
    const garde = [...groupe].sort((a, b) => (estMatriculeAuto(a.matricule) - estMatriculeAuto(b.matricule)) || (totalPaye(b) - totalPaye(a)) || (a.createdAt - b.createdAt))[0]
    await fusionner(groupe, garde, libelleGroupe(groupe))
  }

  // 2) Même nom dans des classes différentes de la même école
  const apres = await charger()
  for (const groupe of regrouper(apres, e => `${e.classe.ecoleId}|${cle(e)}`)) {
    if (new Set(groupe.map(e => e.classeId)).size < 2) continue
    const dansPreferee = CLASSE_PREFEREE ? groupe.filter(e => e.classe.nom === CLASSE_PREFEREE) : []
    if (dansPreferee.length === 1 && !groupe.some(aDesLiens)) {
      await fusionner(groupe, dansPreferee[0], libelleGroupe(groupe))
    } else {
      nonFusionnes.push(`${libelleGroupe(groupe)} : présent dans plusieurs classes (${groupe.map(e => `${e.matricule} ${e.classe.nom}`).join(', ')}) — à vérifier`)
    }
  }

  console.log(`\nGroupes fusionnés : ${stats.fusionnes} | fiches supprimées : ${stats.supprimes} | versements en double retirés : ${fcfa(stats.montantRetire)}`)
  console.log(`Non fusionnés (${nonFusionnes.length}) :`)
  nonFusionnes.forEach(l => console.log('  ⚠ ' + l))
}

main().catch(e => { console.error('ERREUR', e); process.exit(1) }).finally(() => prisma.$disconnect())
