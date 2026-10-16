# CAT-SRPGE — Plan de recette de sécurité multiutilisateur

**État : NON VALIDÉ — ne pas activer l'accès public ni utiliser de documents réels.**

## Préconditions
- Version de test de `PasserelleDocuments.gs` installée séparément, sans écraser V3 avant validation.
- Deux comptes Firebase fictifs A et B, chacun avec dossier et OPID permanents distincts ; un compte Direction explicitement autorisé.
- Google Apps Script exécuté en tant que propriétaire du compte Google CAT-SRPGE, documents Drive privés.
- Conserver `Qui a accès : Moi uniquement` jusqu'à revue de sécurité et déploiement de test contrôlé.

## Essais obligatoires (résultats à noter PASS/FAIL)

| ID | Scénario | Résultat attendu |
|----|----------|------------------|
| S01 | A dépose un PDF fictif sur OPID-A | Dépôt autorisé ; document présent uniquement sous UID-A/OPID-A |
| S02 | A consulte et télécharge ce PDF | Autorisé |
| S03 | B tente de lister UID-A et OPID-A | Refus serveur, même si URL et OPID sont connus |
| S04 | B tente de télécharger l'identifiant Drive du PDF de A avec UID/OPID de B | Refus serveur |
| S05 | B tente de téléverser sur UID-A/OPID-A | Refus serveur |
| S06 | A tente de téléverser sur UID-A/OPID-B | Refus serveur |
| S07 | Direction consulte UID-A/OPID-A | Consultation autorisée si règles Firebase admin confirmées |
| S08 | Direction essaie de téléverser au nom de A | Refus serveur |
| S09 | Compte non connecté ou token invalide/expiré | Refus serveur |
| S10 | Fichier >4 Mo, faux PDF, MIME interdit | Refus serveur |
| S11 | Dépôts concurrents et >12 dépôts par heure | Limite effectivement appliquée, sans perdre la confidentialité |
| S12 | Accès direct par URL Google Drive du document depuis B | Refus Google Drive (fichier non partagé) |
| S13 | Lien public Actionnaires → Apps Script | UID personnel déduit de la connexion, OPID correct et permanent |
| S14 | Lien Responsables → Apps Script | UID+OPID préremplis, contrôle admin serveur, pas de fuite cross-user |
| S15 | Nouvelle connexion depuis navigateur hors compte Google CAT | Fonctionne seulement APRÈS revue du déploiement ouvert et protection anti-abus |

## Points techniques non résolus
- La publication d'une web app propriétaire accessible largement donne accès aux méthodes `google.script.run` : authentification Firebase requise **dans chaque fonction exposée**. Les méthodes auxiliaires suffixées `_` doivent rester privées ; ne jamais exporter DriveApp sans garde.
- Quotas Apps Script / Drive, abus de stockage, concurrence et nettoyage des fichiers de test demandent validation réelle.
- Vérifier toutes les règles Firebase Realtime Database en conditions A/B/admin.
- Les noms lisibles Drive ne sont pas encore implémentés et ne doivent jamais servir d'identifiant d'autorisation.
- Ne pas déclarer les preuves « vérifiées » à partir d'un simple champ Oui/Non.
- Ne pas exposer de vrais documents avant réussite des cas de séparation des comptes.

## État actuel
L'OPID depuis l'URL a été prérempli avec succès sur V3, un document fictif a été retrouvé. Cette preuve ne démontre **pas** le fonctionnement ouvert à plusieurs actionnaires. La V3 reste privée.
