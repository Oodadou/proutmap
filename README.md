# Prout Map 💨

Appli iOS + Android pour placer ses prouts sur une carte, les noter, comparer ses stats
avec ses amis dans des ligues… et l'option ultime : **« Oups je t'ai pété dessus !! xD »**.

- **Appli** : React Native + Expo (SDK 58), Expo Router, TypeScript
- **Serveur** : Supabase (base Postgres, connexion, fonctions)
- **Connexion** : Google (iOS + Android) et Apple (iOS)
- **Compilation et envoi sur les stores** : EAS (service cloud d'Expo). Pas besoin de Mac.

---

## Ce que fait l'appli

| Onglet | Contenu |
|---|---|
| 🗺️ Carte | Tes prouts, ceux de tes amis et ceux reçus (filtres). Bouton « Prouter ici ». |
| ➕ Nouveau prout | Position GPS, type (silencieux, tonitruant…), puissance/odeur/discrétion, note, son + animation |
| 😈 Oups je t'ai pété dessus !! xD | **Un ami de l'appli** : il reçoit une notif et le prout apparaît sur sa carte. **Juste un nom** : partage du message par SMS/WhatsApp. |
| 📊 Stats | Total, aujourd'hui, semaine, record, série de jours, moyennes, victime préférée, prouts reçus |
| 👯 Amis | Code ami à 6 caractères, demandes, retrait/blocage |
| 🏆 Ligues | Créer/rejoindre avec un code, classement semaine/mois/année/toujours |
| 🙂 Moi | Pseudo, politique de confidentialité, déconnexion, **suppression du compte** (obligatoire Apple) |

---

## Arborescence

```
src/app/            Écrans (Expo Router)
  login.tsx         Connexion Google / Apple
  new-fart.tsx      Ajout d'un prout + option « Oups »
  (tabs)/           Carte, Stats, Amis, Ligues, Moi
  league/[id].tsx   Classement d'une ligue
src/lib/            Supabase, API, connexion, notifications, sons
src/components/     Boutons, cartes, animation de nuages
assets/sounds/      5 bruitages générés pour l'appli (libres de droits)
supabase/migrations/0001_init.sql      Tables + sécurité + fonctions
supabase/functions/notify-victim/      Notification push à la victime
supabase/tests/     Tests de sécurité SQL (facultatif)
docs/               Politique de confidentialité à publier
```

---

## Mise en route pas à pas

### 0. Outils sur ton PC
- Node.js 22 LTS : https://nodejs.org
- Dans le dossier du projet : `npm install`

### 1. Supabase (le serveur)
1. Crée un compte sur https://supabase.com, puis un projet (région **Europe – Paris** ou Francfort).
2. **SQL Editor** → colle le contenu de `supabase/migrations/0001_init.sql` → **Run**.
3. **Project Settings → API** : copie l'URL et la clé `anon` dans `.env` (copie `.env.example` en `.env`).
4. Déploie la fonction de notification :
   ```bash
   npx supabase login
   npx supabase link --project-ref TON_REF_PROJET
   npx supabase functions deploy notify-victim
   ```

### 2. Connexion Google
1. https://console.cloud.google.com → nouveau projet « Prout Map ».
2. **API et services → Écran de consentement OAuth** : type Externe, nom de l'appli, e-mail.
3. **Identifiants → Créer un ID client OAuth**, trois fois :
   - **Application Web** → c'est le `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
   - **iOS** (bundle ID = `IOS_BUNDLE_ID`) → `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, et son « schéma d'URL inversé » → `GOOGLE_IOS_URL_SCHEME`
   - **Android** (nom de package = `ANDROID_PACKAGE`, empreinte SHA-1 donnée par `npx eas-cli@latest credentials`, et plus tard aussi celle de *Play App Signing* dans la Play Console)
4. Dans Supabase : **Authentication → Providers → Google** → activer, mettre l'ID client Web
   et l'ID client iOS dans « Client IDs » (séparés par une virgule), cocher **Skip nonce checks**.

### 3. Connexion Apple (iOS)
1. Compte Apple Developer actif (voir budget).
2. https://developer.apple.com/account → **Identifiers** → ton App ID → coche **Sign in with Apple**
   (EAS le fait aussi automatiquement au premier build).
3. Supabase : **Authentication → Providers → Apple** → activer, mettre le bundle ID dans « Client IDs ».

### 4. Carte
La carte utilise OpenStreetMap : rien à configurer.

### 5. Expo / EAS
```bash
npx eas-cli@latest login          # compte gratuit sur expo.dev
npx eas-cli@latest init           # crée le projet, note l'ID dans EAS_PROJECT_ID
```
Envoie aussi les variables de `.env` à EAS (sinon les builds cloud ne les voient pas) :
**expo.dev → ton projet → Environment variables** (environnements *development*, *preview* et *production*).

### 6. Tester sur ton téléphone
```bash
npx eas-cli@latest build --profile development --platform android   # ou ios
npx expo start
```
Installe le build reçu (lien/QR code), ouvre-le : il se connecte à `expo start`.
(Expo Go ne suffit pas : l'appli utilise la connexion Google et les cartes.)

### 7. Publier
```bash
npx eas-cli@latest build --profile production --platform all
npx eas-cli@latest submit --platform ios       # vers App Store Connect / TestFlight
npx eas-cli@latest submit --platform android   # vers Google Play (1er envoi : à la main dans la Play Console)
```
Puis remplis les fiches dans App Store Connect et la Play Console (captures, description,
classification d'âge, questionnaire de confidentialité, URL de la politique de confidentialité).

### 8. Mises à jour
- Code JavaScript uniquement → `npx eas-cli@latest update` (sans repasser par la validation).
- Nouveau module natif ou nouvelle permission → nouveau build + envoi.

---

## Tests SQL (facultatif)
`supabase/tests/` contient un scénario qui vérifie la sécurité (un inconnu ne voit pas tes prouts,
on ne peut péter que sur un ami accepté, suppression de compte…). Il se lance sur un Postgres local :
`psql -f local_prelude.sql -f ../migrations/0001_init.sql -f rls_test.sql`.

---

## Version démo (sans serveur ni compte)

Si `EXPO_PUBLIC_DEMO=1` ou si aucune adresse Supabase n'est configurée, l'appli démarre en **mode démo** :
pas de connexion, tout reste sur le téléphone, 3 faux amis (Kévin, Sophie, Tonton Marcel) placés autour de toi,
et quand tu leur pètes dessus, ils se vengent 8 secondes plus tard par une notification.

**APK démo fabriqué par GitHub, sans ordinateur** : le fichier `.github/workflows/apk-demo.yml` compile l'APK
à chaque envoi de code sur la branche `main` et le publie à une adresse fixe :
`https://github.com/<utilisateur>/<dépôt>/releases/download/demo/ProutMap-demo.apk`
(le dépôt doit être public pour que tes amis puissent télécharger sans compte GitHub).

Avec Expo à la place : `npx eas-cli@latest build --profile demo --platform android`.

La carte utilise OpenStreetMap (aucune clé). Pour un lancement à grande échelle, remplacer `TILE_URL`
dans `src/components/fart-map.tsx` par un fournisseur de tuiles (MapTiler, Stadia Maps…).
