# CAT-SRPGE — Passerelle documentaire (BRANCHE DE DÉVELOPPEMENT)
**Non déployée, non validée en production. Aucun document réel à utiliser.**

## Ce qui est prêt
- `PasserelleDocuments.gs`: vérification du jeton Firebase par l'API officielle Identity Toolkit, vérification de l'appartenance de l'opération via règles Realtime Database, dépôt PDF/PNG/JPEG (4 Mo max), lecture des pièces uniquement pour le propriétaire ou un administrateur Firebase.
- `InterfaceDocuments.html`: interface indépendante hébergée par Apps Script, connexion Firebase, dépôt et consultation des documents. Le responsable se connecte avec un compte Firebase auquel les règles RTDB donnent lecture de `/dossiers`.
- Dossiers Drive créés côté serveur, sous `ROOT_FOLDER_ID/UID-<uid>/OPID-<operationId>`. Les ID Drive ne sont jamais fournis par le navigateur pour choisir la destination.

## Limites à tester AVANT déploiement
1. Copier les deux fichiers dans le projet Google Apps Script **CAT-SRPGE — Gestion sécurisée des justificatifs**. Ne pas remplacer `Code.gs` et ne pas publier immédiatement.
2. Configurer sous Paramètres du projet > Propriétés du script : `ROOT_FOLDER_ID` (dossier à accès limité dédié aux tests) et `FIREBASE_API_KEY` (clé web du même projet Firebase).
3. Les autorisations actuelles `drive.readonly` ne permettent pas le dépôt. Le manifeste devra déclarer explicitement `https://www.googleapis.com/auth/drive`, `https://www.googleapis.com/auth/script.external_request`, et les autorisations éventuellement requises par Apps Script; **la portée Drive est large** et ne doit être accordée qu'à un compte propriétaire de stockage dédié. Examiner le consentement avant de l'accepter.
4. Pour déployer en application Web, le serveur doit exécuter en tant que propriétaire. L'accès web anonyme ne doit être autorisé **que si** les vérifications Firebase serveur et les essais négatifs sont passés. Les comptes de test doivent être seuls utilisateurs.
5. La connexion Firebase dans l'interface Apps Script a lieu sur un **autre domaine** que les deux portails et peut nécessiter une nouvelle connexion.
6. Tester : accès autorisé du propriétaire, refus avec UID d'autrui, refus avec mauvaise opération, refus sans jeton, contrôle de taille et signature PDF, responsable autorisé, utilisateur ordinaire refusé pour consultation d'autrui, vérification des autorisations Drive.
7. Le document fictif déjà présent dans `CAT-CS7RSS/OP-001` ne sera **pas** listé automatiquement : il faudra tester le NOUVEAU dépôt dans le dossier généré à partir du couple UID/operationId, ou migrer la pièce après validation.
8. Les deux portails GitHub publics ne sont pas encore raccordés à cette interface. Nous n'y intégrerons un lien qu'après le test de sécurité du déploiement.
9. Des mécanismes supplémentaires sont nécessaires pour la production : limitation de débit, contrôle antivirus, supervision, sauvegardes, gestion des doublons, tailles/quotas, comportement mobile, conformité à la politique de confidentialité, accès des vrais membres.

## Prudence
Le service Apps Script est exécuté avec les privilèges Drive de son propriétaire : la validation côté serveur des comptes et des opérations est obligatoire. L'autorisation `drive` n'est **pas** restreinte au dossier de test. Les PDF restent dans un Drive privé, sans publication par lien. Ne jamais partager les ID tokens ni les mots de passe.
