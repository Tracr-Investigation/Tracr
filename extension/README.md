# Extension Tracr — Archivage de sources

Extension navigateur (Manifest V3, Chrome / Edge / Brave) pour capturer des
**preuves OSINT** horodatées et les envoyer dans une enquête Tracr.

## Fonctionnalités

- **Connexion** avec ton compte Tracr (pseudo / mot de passe → JWT stocké localement).
- **Capture d'écran**, 3 modes :
  - **Page entière** — défilement + assemblage automatique (toute la hauteur).
  - **Visible** — uniquement la zone affichée (rapide).
  - **Sélection** — dessine un rectangle sur la page pour ne capturer qu'une zone.
- **Archivage MHTML** de la page (DOM + ressources, texte sélectionnable).
- **Page entière + MHTML** en un clic (liés par un même `capture_group`).
- **Page autonome (HTML)** — un seul fichier HTML avec tout le CSS inliné et les
  URLs absolutisées (style SingleFile). S'affiche directement dans l'onglet Sources
  du site (iframe sandbox), sans moteur de rejeu.
- **Clic droit sur une image / vidéo** → « Tracr : archiver ce média ».
- Titre par défaut = titre de l'onglet (modifiable), horodatage automatique,
  empreinte **SHA-256** calculée côté serveur (intégrité de la preuve).
- Interface alignée sur la DA Tracr (thème sombre, accent violet, logo).

## Installation (mode développeur)

1. Ouvre `chrome://extensions` (ou `edge://extensions`).
2. Active **Mode développeur** (en haut à droite).
3. Clique **Charger l'extension non empaquetée** et sélectionne le dossier
   `extension/` de ce dépôt.
4. Épingle l'icône Tracr dans la barre d'outils.

Les utilisateurs peuvent aussi télécharger l'extension empaquetée depuis l'onglet
**Sources** d'une enquête (bouton « Télécharger »). Ce zip est servi par le front
depuis `frontend/public/tracr-extension.zip`.

### Régénérer le zip distribué (après modif de l'extension)

```powershell
$stage = Join-Path $env:TEMP 'tracr-extension'
Remove-Item -Recurse -Force $stage -ErrorAction SilentlyContinue
New-Item -ItemType Directory $stage | Out-Null
Copy-Item -Recurse extension\* $stage
Remove-Item -Force $stage\icons\generate_icons.py -ErrorAction SilentlyContinue
Compress-Archive -Path "$stage\*" -DestinationPath frontend\public\tracr-extension.zip -Force
Remove-Item -Recurse -Force $stage
```

## Configuration

Au premier lancement, renseigne l'URL du serveur (défaut `http://localhost:8000`)
puis connecte-toi. Le serveur doit autoriser l'origine de l'extension — c'est déjà
le cas côté backend via `allow_origin_regex` (`chrome-extension://...`).

## Utilisation

1. Ouvre la page à archiver, clique sur l'icône Tracr.
2. Choisis l'**enquête** de destination, ajuste le **titre**.
3. Clique **Capturer l'écran**, **Archiver la page (MHTML)** ou **Les deux**.
4. Pour un média précis : clic droit dessus → « Tracr : archiver ce média »
   (utilise la dernière enquête sélectionnée dans le popup).

Les sources apparaissent dans l'onglet **Sources** de l'enquête sur le site.

## Limitations connues (MVP)

- La capture **page entière** assemble plusieurs captures par défilement ; les
  éléments en `position: fixed` peuvent se répéter, et la hauteur est plafonnée
  (~16000 px appareil) pour rester sous les limites du canvas.
- Les pages `chrome://` et la boutique d'extensions ne sont pas capturables.
- L'archivage d'un média par clic droit cible la **dernière enquête** ouverte
  dans le popup (ouvre le popup au moins une fois pour en choisir une).
- Le **MHTML** est un instantané d'**une** page (re-rendu fidèle à l'ouverture),
  pas un site navigable type Wayback Machine.
- Le CSS dynamique que le MHTML rate (`adoptedStyleSheets`, `<style>` remplis par
  `insertRule`) est ré-injecté avant capture — ciblé, sans fetch réseau, pour rester
  rapide. Les `<style>`/`<link>` classiques sont déjà gérés nativement par MHTML.
  Reste non couvert : le **Shadow DOM** (encapsulé, non sérialisé par MHTML).

## Fichiers

| Fichier | Rôle |
|---|---|
| `manifest.json` | déclaration MV3, permissions |
| `api.js` | couche partagée (login, liste enquêtes, upload) |
| `popup.html/.css/.js` | interface de connexion et de capture |
| `background.js` | service worker + menu contextuel média |
