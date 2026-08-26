---
name: focused-change
description: Effectue une modification ciblée dans un projet sans explorer inutilement le dépôt.
disable-model-invocation: true
---

# Modification ciblée

Utilise cette procédure uniquement lorsque l'utilisateur invoque `/focused-change`.

## Procédure

1. Reformuler la demande en une phrase.
2. Demander ou identifier le périmètre exact : fichier, fonction ou dossier.
3. Lire uniquement les fichiers nécessaires.
4. Ne pas scanner tout le dépôt.
5. Proposer un plan de trois étapes maximum avant une modification importante.
6. Modifier uniquement le code nécessaire.
7. Lancer un test ciblé, jamais toute la suite sans raison.
8. Répondre avec :
   - Résumé de la modification.
   - Fichiers touchés.
   - Test exécuté.
   - Risques éventuels.

## Contraintes

- Ne pas toucher aux fichiers `.env`.
- Ne pas modifier les dépendances sans autorisation.
- Ne pas produire de longue explication si une réponse courte suffit.
- Si la demande est ambiguë, poser une seule question précise.