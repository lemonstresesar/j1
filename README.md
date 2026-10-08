# For him and her - Boutique en ligne Douala

Boutique de vente en ligne complète pour « For him and her » (vêtements, chaussures, parfums, sacs et accessoires pour hommes et femmes) à Douala, Cameroun.

## Architecture & Technologies
- **Frontend** : React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Vite
- **Base de données en temps réel** : Google Cloud Firebase Firestore
- **Authentification** : Firebase Authentication (un seul compte vendeuse)
- **Partage Social & WhatsApp** : Middleware côté serveur pour balises Open Graph dynamiques (`og:title`, `og:image`, `og:description`) sur `/produit/:id` et `/pack/:id`.
- **Commandes** : Enregistrement automatique dans Firestore (`orders`) + message WhatsApp préformaté en français ou en anglais vers le numéro de la boutique (+237 6 96 60 55 86).

---

## 1. Première connexion (Espace Vendeuse / Admin)

1. Rendez-vous sur la route `/admin` (ou cliquez sur le cadenas / lien « Accès Vendeuse » en bas de page).
2. **Écran de configuration initiale** :
   - Si aucun compte n'existe encore, un écran unique de création du compte administratrice s'affiche.
   - Saisissez un **identifiant** (ex : `patronne` ou `laura`) et un **mot de passe** (minimum 6 caractères).
   - L'identifiant est automatiquement mappé en adresse interne sécurisée Firebase Auth (`identifiant@forhimandher.app`).
   - Une fois ce compte créé, cet écran est **verrouillé définitivement** et aucun autre compte ne peut être créé.
3. **Assistant de démarrage** :
   - L'assistant confirme l'initialisation des lieux de livraison préconfigurés à Douala (Akwa, Bonanjo, Bonapriso, Deido, Makepe, Bonamoussadi, etc.) avec leurs tarifs en FCFA.
   - Il valide également l'activation du catalogue initial et vous dirige vers le **Tableau de Bord**.
4. **Déconnexion automatique** :
   - Pour des raisons de sécurité, la session vendeuse est automatiquement fermée après **30 minutes d'inactivité**.

---

## 2. Modification manuelle du mot de passe (Procédure Développeur)

Conformément aux spécifications, il n'y a pas de lien public « Mot de passe oublié » sur l'interface pour empêcher les tentatives d'usurpation.
Si la vendeuse oublie son mot de passe, le développeur peut le réinitialiser de deux façons simples :

### Méthode 1 : Depuis la Console Firebase (Recommandée)
1. Ouvrez la [Console Firebase](https://console.firebase.google.com/) sur le projet `optical-tokenizer-sdtd0`.
2. Allez dans **Authentication** > **Users**.
3. Repérez l'utilisateur ayant l'adresse e-mail `identifiant@forhimandher.app`.
4. Cliquez sur le menu **⋯** (trois points) à droite de la ligne de l'utilisateur, puis choisissez **« Modifier le mot de passe »** (ou « Envoyer un e-mail de réinitialisation »).
5. Saisissez le nouveau mot de passe souhaité et validez. La vendeuse peut se reconnecter immédiatement avec son identifiant habituel et ce nouveau mot de passe.

### Méthode 2 : En ligne de commande (Firebase Admin SDK / CLI)
```bash
# Avec le Firebase CLI ou un script Admin SDK :
firebase auth:export users.json
# Ou mise à jour par UID :
# admin.auth().updateUser(uid, { password: 'NouveauMotDePasse123' })
```

---

## 3. Fonctionnalités Clés
- **Bilingue FR / EN** : Interface client commutable instantanément, message WhatsApp envoyé dans la langue choisie.
- **Gombo de la semaine** : Gestion des packs hebdomadaires avec date de fin automatique.
- **Calculatrice de Chiffre d'Affaires** : Exclut strictement les commandes annulées et respecte le fuseau horaire `Africa/Douala` avec semaine débutant le lundi.
- **Compression d'images client** : Réduction automatique à 800px côté navigateur avant envoi.
- **Protection Anti-Spam** : Champ piège honeypot invisible et délai de sécurité minimum entre deux commandes.
