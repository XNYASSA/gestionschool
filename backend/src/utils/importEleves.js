import { creerInscriptionsFraisPourEleve, synchroniserPaiementsCibles } from './inscriptionsFrais.js'

// Valeur enregistrée quand un fichier importé ne fournit pas le parent ou son téléphone : l'élève
// est créé quand même et l'écran le signale en rouge jusqu'à ce que l'information soit ajoutée.
export const NON_RENSEIGNE = 'Non renseigné'

const LIBELLES_POSTES = { inscription: 'Inscription', tranche1: 'Tranche 1', tranche2: 'Tranche 2', tranche3: 'Tranche 3' }
const texteExces = (exces) => exces.length === 0
  ? ''
  : ` — attention : ${exces.map(e => `${e.montant.toLocaleString('fr-FR')} FCFA de ${LIBELLES_POSTES[e.tranche]} dépassent le montant dû`).join(', ')}`

// Importe des lignes d'élèves (avec leurs montants déjà payés) dans UNE école. Chaque ligne est
// traitée indépendamment : une ligne en erreur n'interrompt pas les autres. Un élève déjà présent
// (même nom + prénom + classe) est mis à jour au lieu d'être dupliqué.
// Utilisé par la route POST /eleves/import et par les scripts d'import.
export async function importerLignesEleves(prisma, ecoleId, lignes) {
  const classesEcole = await prisma.classe.findMany({ where: { ecoleId } })
  const classeParNom = new Map(classesEcole.map(c => [c.nom.trim().toLowerCase(), c]))

  const elevesExistants = await prisma.eleve.findMany({ select: { matricule: true } })
  let prochainNumero = 1
  elevesExistants.forEach(e => {
    const match = e.matricule.match(/\d+/)
    if (match) prochainNumero = Math.max(prochainNumero, parseInt(match[0]) + 1)
  })
  const matriculesExistants = new Set(elevesExistants.map(e => e.matricule))

  const resultats = []

  for (let i = 0; i < lignes.length; i++) {
    const numeroLigne = i + 1
    const ligne = lignes[i] || {}
    try {
      const { matricule: matriculeFourni, nom, prenom, sexe, dateNaissance, classe, filiere, nomParent, lieuParente, telephoneParent, emailParent, adresseParent, inscription, tranche1, tranche2, tranche3 } = ligne
      const montantsPostes = { inscription, tranche1, tranche2, tranche3 }

      if (!nom || !classe) {
        throw new Error('Nom et classe requis pour créer un élève')
      }
      const parentFourni = String(nomParent ?? '').trim()
      const telephoneFourni = String(telephoneParent ?? '').trim()
      const infosManquantes = [!String(prenom ?? '').trim() && 'prénom', !parentFourni && 'nom du parent', !telephoneFourni && 'téléphone du parent'].filter(Boolean)

      let sexeNormalise = null
      if (sexe) {
        sexeNormalise = /^m/i.test(String(sexe).trim()) ? 'MASCULIN' : /^f/i.test(String(sexe).trim()) ? 'FEMININ' : null
        if (!sexeNormalise) {
          throw new Error(`Sexe invalide : "${sexe}" (attendu M ou F)`)
        }
      }

      const classeTrouvee = classeParNom.get(String(classe).trim().toLowerCase())
      if (!classeTrouvee) {
        throw new Error(`Classe "${classe}" introuvable dans cette école`)
      }

      let dateNaissanceParsed = null
      if (dateNaissance) {
        dateNaissanceParsed = new Date(dateNaissance)
        if (isNaN(dateNaissanceParsed.getTime())) {
          throw new Error(`Date de naissance invalide : "${dateNaissance}"`)
        }
      }

      const nomTrim = String(nom).trim()
      const prenomTrim = String(prenom ?? '').trim()
      const matriculeFourniTrim = matriculeFourni ? String(matriculeFourni).trim() : ''

      // Reconnaît un élève déjà importé (même nom + prénom + classe) pour le
      // mettre à jour au lieu de le dupliquer — le fichier de la secrétaire
      // grossit au fil de l'année et est réimporté en entier à chaque fois.
      const eleveExistant = await prisma.eleve.findFirst({
        where: { classeId: classeTrouvee.id, nom: nomTrim, prenom: prenomTrim }
      })

      // Un matricule déjà porté par un autre élève (les numéros des fichiers ne sont pas uniques
      // entre sections) reçoit un suffixe plutôt que de bloquer l'import de l'élève.
      let matriculeRetenu = matriculeFourniTrim
      let noteMatricule = ''
      if (matriculeRetenu && eleveExistant && matriculeRetenu !== eleveExistant.matricule && matriculesExistants.has(matriculeRetenu)) {
        matriculeRetenu = '' // l'élève garde son matricule actuel
      } else if (matriculeRetenu && !eleveExistant && matriculesExistants.has(matriculeRetenu)) {
        let suffixe = 2
        while (matriculesExistants.has(`${matriculeFourniTrim}-${suffixe}`)) suffixe++
        matriculeRetenu = `${matriculeFourniTrim}-${suffixe}`
        noteMatricule = ` — matricule « ${matriculeFourniTrim} » déjà pris, enregistré « ${matriculeRetenu} »`
      }
      const texteManquants = infosManquantes.length ? ` — à compléter : ${infosManquantes.join(', ')}` : ''

      if (eleveExistant) {
        const eleve = await prisma.eleve.update({
          where: { id: eleveExistant.id },
          data: {
            ...(matriculeRetenu && { matricule: matriculeRetenu }),
            ...(sexeNormalise && { sexe: sexeNormalise }),
            ...(String(filiere ?? '').trim() && { filiere: String(filiere).trim() }),
            ...(dateNaissanceParsed && { dateNaissance: dateNaissanceParsed }),
            ...(parentFourni && { nomParent: parentFourni }),
            ...(lieuParente && { lieuParente }),
            ...(telephoneFourni && { telephoneParent: telephoneFourni }),
            ...(emailParent && { emailParent }),
            ...(adresseParent && { adresseParent })
          }
        })
        if (matriculeRetenu) {
          matriculesExistants.delete(eleveExistant.matricule)
          matriculesExistants.add(eleve.matricule)
        }

        const { exces } = await synchroniserPaiementsCibles(prisma, eleve.id, montantsPostes)

        resultats.push({
          ligne: numeroLigne,
          succes: true,
          infosManquantes: infosManquantes.length > 0 && (!parentFourni && eleveExistant.nomParent === NON_RENSEIGNE || !telephoneFourni && eleveExistant.telephoneParent === NON_RENSEIGNE || !prenomTrim),
          message: `${prenomTrim} ${nomTrim} (${eleve.matricule}) mis à jour${noteMatricule}${texteExces(exces)}`
        })
        continue
      }

      let matricule
      if (matriculeRetenu) {
        matricule = matriculeRetenu
      } else {
        do {
          matricule = `MAT${String(prochainNumero).padStart(3, '0')}`
          prochainNumero++
        } while (matriculesExistants.has(matricule))
      }
      matriculesExistants.add(matricule)

      const eleve = await prisma.eleve.create({
        data: {
          matricule,
          nom: nomTrim,
          prenom: prenomTrim,
          sexe: sexeNormalise,
          dateNaissance: dateNaissanceParsed,
          classeId: classeTrouvee.id,
          filiere: String(filiere ?? '').trim() || null,
          nomParent: parentFourni || NON_RENSEIGNE,
          lieuParente: lieuParente || null,
          telephoneParent: telephoneFourni || NON_RENSEIGNE,
          emailParent: emailParent || null,
          adresseParent: adresseParent || null
        }
      })

      const postesFrais = await creerInscriptionsFraisPourEleve(prisma, eleve.id, ecoleId, classeTrouvee.niveau)
      const { exces } = await synchroniserPaiementsCibles(prisma, eleve.id, montantsPostes)

      resultats.push({
        ligne: numeroLigne,
        succes: true,
        infosManquantes: infosManquantes.length > 0,
        sansBareme: postesFrais.length === 0,
        message: postesFrais.length === 0
          ? `${prenomTrim} ${nomTrim} (${matricule}) créé(e) — aucun barème de frais pour le niveau "${classeTrouvee.niveau}"${texteManquants}`
          : `${prenomTrim} ${nomTrim} (${matricule}) créé(e)${noteMatricule}${texteExces(exces)}${texteManquants}`
      })
    } catch (err) {
      resultats.push({ ligne: numeroLigne, succes: false, message: err.message })
    }
  }

  return resultats
}
