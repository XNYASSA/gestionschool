import { PrismaClient } from '@prisma/client'
import { calculerStatut } from '../src/utils/inscriptionsFrais.js'

const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes('--dry-run')

// Fusionne les élèves enregistrés plusieurs fois (même nom et prénom, dans la même classe) : les imports
// répétés d'un même fichier avaient créé des copies qui faussent les effectifs et les montants perçus.
//  - une seule fiche est conservée : celle qui porte un vrai matricule (pas MATxxx), puis la plus payée, puis la plus ancienne ;
//  - les copies portent les mêmes versements : pour chaque poste on garde le montant le plus élevé (jamais la somme) ;
//  - le parent, le téléphone et les autres informations connues d'une copie sont reportés sur la fiche conservée ;
//  - un groupe dont une copie a des reçus, notes, présences, bulletins ou vérifications n'est PAS fusionné (listé) ;
//  - les élèves de même nom dans des classes différentes ne sont pas touchés (listés pour vérification).

const NON_RENSEIGNE = 'Non renseigné'
const manquant = (v) => !String(v ?? '').trim() || String(v).trim().toLowerCase() === NON_RENSEIGNE.toLowerCase()
const cle = (e) => `${e.nom} ${e.prenom}`.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(' ').filter(Boolean).sort().join(' ')
const estMatriculeAuto = (m) => /^MAT\d+$/.test(m)
const fcfa = (n) => `${Number(n).toLocaleString('fr-FR')} FCFA`

const totalPaye = (e) => e.inscriptionsFrais.reduce((s, f) => s + f.montantPaye, 0)

async function main() {
  console.log(DRY_RUN ? '### SIMULATION — aucune modification ###' : '### FUSION RÉELLE ###')
  const eleves = await prisma.eleve.findMany({
    include: {
      classe: { include: { ecole: true } },
      inscriptionsFrais: true,
      _count: { select: { paiements: true, notes: true, presences: true, bulletins: true, verificationsPaiement: true, notesEvaluations: true, anomaliesDetectees: true } }
    }
  })

  const parNomEtClasse = new Map()
  const parNomEcole = new Map()
  eleves.forEach(e => {
    const k1 = `${e.classeId}|${cle(e)}`
    if (!parNomEtClasse.has(k1)) parNomEtClasse.set(k1, [])
    parNomEtClasse.get(k1).push(e)
    const k2 = `${e.classe.ecoleId}|${cle(e)}`
    if (!parNomEcole.has(k2)) parNomEcole.set(k2, [])
    parNomEcole.get(k2).push(e)
  })

  let fusionnes = 0, supprimes = 0, montantRetire = 0
  const nonFusionnes = []

  for (const groupe of parNomEtClasse.values()) {
    if (groupe.length < 2) continue
    const nom = `${groupe[0].nom} ${groupe[0].prenom} [${groupe[0].classe.ecole.nomCourt} / ${groupe[0].classe.nom}]`

    const avecLiens = groupe.filter(e => Object.values(e._count).some(n => n > 0))
    if (avecLiens.length > 0) {
      nonFusionnes.push(`${nom} : ${avecLiens.map(e => e.matricule).join(', ')} ont des reçus/notes/présences/bulletins — à fusionner à la main`)
      continue
    }

    const classes = [...groupe].sort((a, b) =>
      (estMatriculeAuto(a.matricule) - estMatriculeAuto(b.matricule)) || (totalPaye(b) - totalPaye(a)) || (a.createdAt - b.createdAt))
    const garde = classes[0]
    const autres = classes.slice(1)

    // Informations à reporter sur la fiche conservée
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

    // Versements : le plus élevé de chaque poste
    const maxParPoste = new Map()
    groupe.forEach(e => e.inscriptionsFrais.forEach(f => maxParPoste.set(f.tranche, Math.max(maxParPoste.get(f.tranche) || 0, f.montantPaye))))
    const majPostes = garde.inscriptionsFrais.filter(f => maxParPoste.get(f.tranche) > f.montantPaye)

    const retire = autres.reduce((s, e) => s + totalPaye(e), 0)
    console.log(`- ${nom} : ${groupe.length} copies → garde ${garde.matricule} ; supprime ${autres.map(e => e.matricule).join(', ')}` +
      `${Object.keys(donnees).length ? ` ; reporte ${Object.keys(donnees).join(', ')}` : ''}` +
      `${majPostes.length ? ` ; ${majPostes.length} poste(s) relevé(s) au maximum` : ''} ; total payé avant ${fcfa(groupe.reduce((s, e) => s + totalPaye(e), 0))} → après ${fcfa(garde.inscriptionsFrais.reduce((s, f) => s + Math.max(f.montantPaye, maxParPoste.get(f.tranche) || 0), 0))}`)

    fusionnes++
    supprimes += autres.length
    montantRetire += retire

    if (DRY_RUN) continue
    await prisma.$transaction(async (tx) => {
      if (Object.keys(donnees).length) await tx.eleve.update({ where: { id: garde.id }, data: donnees })
      for (const f of majPostes) {
        const nouveau = maxParPoste.get(f.tranche)
        await tx.inscriptionFrais.update({ where: { id: f.id }, data: { montantPaye: nouveau, statut: calculerStatut(f.montantDu, nouveau) } })
      }
      await tx.eleve.deleteMany({ where: { id: { in: autres.map(e => e.id) } } })
    })
  }

  parNomEcole.forEach(groupe => {
    const classesDistinctes = new Set(groupe.map(e => e.classeId))
    if (groupe.length > 1 && classesDistinctes.size > 1) {
      nonFusionnes.push(`${groupe[0].nom} ${groupe[0].prenom} [${groupe[0].classe.ecole.nomCourt}] : présent dans plusieurs classes (${groupe.map(e => `${e.matricule} ${e.classe.nom}`).join(', ')}) — à vérifier`)
    }
  })

  console.log(`\nGroupes fusionnés : ${fusionnes} | fiches supprimées : ${supprimes} | versements en double retirés : ${fcfa(montantRetire)}`)
  console.log(`Non fusionnés (${nonFusionnes.length}) :`)
  nonFusionnes.forEach(l => console.log('  ⚠ ' + l))
}

main().catch(e => { console.error('ERREUR', e); process.exit(1) }).finally(() => prisma.$disconnect())
