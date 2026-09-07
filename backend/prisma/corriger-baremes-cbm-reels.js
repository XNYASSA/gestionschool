import { PrismaClient } from '@prisma/client'
import { synchroniserInscriptionsFrais } from '../src/utils/inscriptionsFrais.js'

const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes('--dry-run')

// Montants dérivés du fichier de report de la secrétaire du CBM
// (SCOLARITE-CBM.xlsx, colonnes "Pension Total" / "Inscription", valeurs
// modales cohérentes sur l'ensemble des élèves d'un même groupe de niveaux).
// Le partage entre les 3 tranches n'est PAS confirmé par le fichier (qui ne
// donne que les paiements partiels réels, pas l'échéancier) — réparti
// équitablement en attendant que le client confirme l'échéancier exact.
// Remplace le placeholder unique (dont les montants avaient dérivé à 850 000 F
// en production suite à une modification manuelle) par 4 barèmes réels.
const BAREMES_CBM = [
  {
    libelle: '6ème-5ème-4ème (réel provisoire)',
    niveaux: ['6ème', '5ème', '4ème Espagnol', '4ème Allemand'],
    montantInscription: 21000,
    tranches: [30000, 30000, 30000] // total 111 000 F
  },
  {
    libelle: '3ème (réel provisoire)',
    niveaux: ['3ème Espagnol', '3ème Allemand'],
    montantInscription: 26000,
    tranches: [30000, 30000, 30000] // total 116 000 F
  },
  {
    libelle: '2nde (réel provisoire)',
    niveaux: ['2nde Espagnol', '2nde Allemand', '2nde C'],
    montantInscription: 26000,
    tranches: [33000, 33000, 34000] // total 126 000 F
  },
  {
    libelle: '1ère-Tle (réel provisoire)',
    niveaux: ['1ère Espagnol', '1ère Allemand', '1ère D', '1ère C', 'Tle Espagnol', 'Tle Allemand', 'Tle D', 'Tle C'],
    montantInscription: 31000,
    tranches: [33000, 33000, 34000] // total 131 000 F
  }
]

async function main() {
  console.log(DRY_RUN ? '🔍 Mode dry-run — aucune écriture en base\n' : '✍️  Correction des barèmes CBM\n')

  const cbm = await prisma.ecole.findUnique({ where: { nomCourt: 'CBM' } })
  if (!cbm) { console.log('⚠️  École CBM introuvable.'); return }

  for (const bareme of BAREMES_CBM) {
    let config = await prisma.configurationFrais.findFirst({ where: { ecoleId: cbm.id, libelle: bareme.libelle } })

    if (!config) {
      console.log(`${DRY_RUN ? '[DRY-RUN] ' : ''}Création du barème "${bareme.libelle}" (inscription ${bareme.montantInscription} F, tranches ${bareme.tranches.join('/')} F)`)
      if (!DRY_RUN) {
        config = await prisma.configurationFrais.create({
          data: {
            ecoleId: cbm.id,
            libelle: bareme.libelle,
            montantInscription: bareme.montantInscription,
            tranches: { create: bareme.tranches.map((montant, i) => ({ numero: i + 1, montant })) }
          }
        })
      }
    } else {
      console.log(`Barème "${bareme.libelle}" existe déjà, vérification des montants.`)
      if (config.montantInscription !== bareme.montantInscription) {
        console.log(`${DRY_RUN ? '[DRY-RUN] ' : ''}  → montantInscription ${config.montantInscription} -> ${bareme.montantInscription}`)
        if (!DRY_RUN) await prisma.configurationFrais.update({ where: { id: config.id }, data: { montantInscription: bareme.montantInscription } })
      }
      const tranchesExistantes = await prisma.tranche.findMany({ where: { configurationFraisId: config.id } })
      for (let i = 0; i < bareme.tranches.length; i++) {
        const numero = i + 1
        const montant = bareme.tranches[i]
        const existante = tranchesExistantes.find(t => t.numero === numero)
        if (!existante) {
          console.log(`${DRY_RUN ? '[DRY-RUN] ' : ''}  → création tranche ${numero} = ${montant} F`)
          if (!DRY_RUN) await prisma.tranche.create({ data: { configurationFraisId: config.id, numero, montant } })
        } else if (existante.montant !== montant) {
          console.log(`${DRY_RUN ? '[DRY-RUN] ' : ''}  → tranche ${numero} : ${existante.montant} -> ${montant} F`)
          if (!DRY_RUN) await prisma.tranche.update({ where: { id: existante.id }, data: { montant } })
        }
      }
    }

    for (const niveau of bareme.niveaux) {
      const lien = await prisma.configurationFraisNiveau.findUnique({ where: { ecoleId_niveau: { ecoleId: cbm.id, niveau } } })
      if (!lien) {
        console.log(`${DRY_RUN ? '[DRY-RUN] ' : ''}  → rattachement niveau "${niveau}"`)
        if (!DRY_RUN) await prisma.configurationFraisNiveau.create({ data: { configurationFraisId: config.id, ecoleId: cbm.id, niveau } })
      } else if (!config || lien.configurationFraisId !== config.id) {
        console.log(`${DRY_RUN ? '[DRY-RUN] ' : ''}  → niveau "${niveau}" déplacé vers ce barème`)
        if (!DRY_RUN) await prisma.configurationFraisNiveau.update({ where: { id: lien.id }, data: { configurationFraisId: config.id } })
      }
    }
  }

  if (!DRY_RUN) {
    console.log('\n✍️  Resynchronisation des fiches de frais des élèves déjà inscrits...')
    for (const bareme of BAREMES_CBM) {
      const config = await prisma.configurationFrais.findFirst({ where: { ecoleId: cbm.id, libelle: bareme.libelle }, include: { tranches: true } })
      await synchroniserInscriptionsFrais(prisma, config.id, 'inscription', "Frais d'inscription", config.montantInscription)
      for (const t of config.tranches) {
        await synchroniserInscriptionsFrais(prisma, config.id, `tranche${t.numero}`, `Tranche ${t.numero}`, t.montant)
      }
    }

    // Les montants déjà versés avaient été répartis selon l'ancien barème
    // placeholder (tranches plus élevées) : certains postes affichent
    // désormais "payé > dû". Redistribue le total réellement payé par élève
    // sur les nouveaux postes, dans l'ordre (inscription puis tranches).
    console.log('\n✍️  Redistribution des montants déjà versés sur les nouveaux postes...')
    const elevesCbm = await prisma.eleve.findMany({ where: { classe: { ecoleId: cbm.id } }, include: { inscriptionsFrais: true } })
    for (const eleve of elevesCbm) {
      const totalPaye = eleve.inscriptionsFrais.reduce((s, p) => s + p.montantPaye, 0)
      const postesOrdonnes = [...eleve.inscriptionsFrais].sort((a, b) => (a.tranche === 'inscription' ? -1 : a.tranche.localeCompare(b.tranche)))
      let restant = totalPaye
      for (const poste of postesOrdonnes) {
        const nouveauPaye = Math.max(0, Math.min(restant, poste.montantDu))
        restant -= nouveauPaye
        if (nouveauPaye !== poste.montantPaye) {
          await prisma.inscriptionFrais.update({ where: { id: poste.id }, data: { montantPaye: nouveauPaye } })
        }
      }
    }
  }

  console.log(DRY_RUN ? '\n🔍 Dry-run terminé — relancer sans --dry-run pour appliquer.' : '\n✅ Terminé.')
}

main()
  .catch(e => { console.error('❌ Erreur:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
