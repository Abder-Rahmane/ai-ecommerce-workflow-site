# Operator — site vitrine

Site public statique de présentation de **Operator** *(Commerce Operations Platform)*, projet en développement dont le nom juridique/projet reste **AI E-commerce Operator** (mentionné discrètement dans le footer et les pages légales).

100 % statique : pas de backend, pas de base de données, pas de login, aucune API. **Aucune requête externe** : pas de CDN, pas de police web distante, pas de cookie, pas de traceur (la police Geist est hébergée dans le dépôt).

```
index.html            Page principale (anglais)
privacy.html          Privacy Policy
terms.html            Terms of Service
styles.css            Styles (mobile-first) + tokens de couleur / typo en haut du fichier
script.js             Config email, menu mobile, scène 3D du hero, progression du workflow
favicon.svg           Favicon (même système visuel que le logo)
assets/logo-mark.svg  Symbole du logo (couleur) · logo-mark-mono.svg (monochrome)
assets/og-image.png   Image de partage (Open Graph / Twitter), 1200×630
assets/fonts/         Geist Sans (variable, licence SIL OFL) + licence
sitemap.xml · robots.txt
scripts/set-domain.sh Change l'URL du site dans tous les fichiers SEO
.nojekyll             Dit à GitHub Pages de servir les fichiers tels quels
```

---

## 1. Lancer le site en local

Aucune installation ni build. Deux options :

**Option A — double-clic** : ouvrez `index.html` dans votre navigateur. Ça fonctionne, car il n'y a ni module ni requête réseau.

**Option B — petit serveur local (recommandé, identique à la production)** :

```bash
cd ai-ecommerce-workflow-site
python3 -m http.server 8000
# puis ouvrez http://localhost:8000
```

(Alternative Node : `npx serve .`)

---

## 2. Publier sur GitHub Pages

1. Poussez le code sur GitHub (déjà le cas pour ce dépôt).
2. Le dépôt ne contient pour l'instant que la branche `claude/gracious-knuth-bg62bq` (il n'y a pas de `main`). Pas besoin d'en créer une : GitHub Pages peut publier n'importe quelle branche. (Si vous préférez une branche `main` plus tard : *Branches → Rename*, ou créez-la depuis cette branche, puis choisissez-la à l'étape 5.)
3. Sur GitHub : **Settings → Pages**.
4. *Build and deployment* → **Source : Deploy from a branch**.
5. *Branch* : **`claude/gracious-knuth-bg62bq`** (ou `main` si vous en avez créé une), dossier **`/ (root)`** → **Save**.
6. Attendez 1 à 2 minutes. Le site est alors en ligne sur :
   `https://abder-rahmane.github.io/ai-ecommerce-workflow-site/`

Tous les chemins du site sont relatifs : il fonctionne aussi bien sous ce sous-dossier que sur un domaine personnalisé à la racine.

---

## 3. Connecter votre domaine IONOS

1. **Sur GitHub** — *Settings → Pages → Custom domain* : saisissez votre domaine (par exemple `www.votre-domaine.com`, ou `votre-domaine.com`) → **Save**.
   GitHub crée automatiquement un fichier `CNAME` à la racine du dépôt (ne le supprimez pas).
2. **Chez IONOS** — *Domaines & SSL → votre domaine → DNS* (ou *Gérer les enregistrements DNS*) et ajoutez/modifiez les enregistrements de l'étape 4 ci-dessous. Supprimez au préalable les anciens enregistrements `A`, `AAAA` ou `CNAME` qui pointent vers un hébergement/une page de parking IONOS pour le même nom d'hôte.
3. Mettez à jour l'URL dans les metadata (voir point 7).
4. Attendez la propagation DNS (en général quelques minutes, jusqu'à 24 h).

Conseil : choisissez **un seul domaine canonique**, par exemple `www.votre-domaine.com`, et gardez l'autre en redirection (GitHub redirige automatiquement le domaine nu vers `www` et inversement quand les deux sont configurés).

---

## 4. Quels DNS modifier chez IONOS

Remplacez `abder-rahmane` par votre nom d'utilisateur GitHub si besoin.

**Domaine nu (apex) `votre-domaine.com`** — 4 enregistrements `A` (nom d'hôte `@`) :

| Type | Nom d'hôte | Valeur |
|------|-----------|--------|
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |

Optionnel (IPv6) — 4 enregistrements `AAAA` (nom d'hôte `@`) :

| Type | Nom d'hôte | Valeur |
|------|-----------|--------|
| AAAA | `@` | `2606:50c0:8000::153` |
| AAAA | `@` | `2606:50c0:8001::153` |
| AAAA | `@` | `2606:50c0:8002::153` |
| AAAA | `@` | `2606:50c0:8003::153` |

**Sous-domaine `www`** — 1 enregistrement `CNAME` :

| Type | Nom d'hôte | Valeur |
|------|-----------|--------|
| CNAME | `www` | `abder-rahmane.github.io` |

Remarques :
- Ne mettez **jamais** de `https://` ni de chemin dans la valeur du CNAME : uniquement `abder-rahmane.github.io`.
- Si vous n'utilisez que `www`, le CNAME suffit. Si vous utilisez le domaine nu, il faut les `A`.
- Vérification : `dig votre-domaine.com +noall +answer` et `dig www.votre-domaine.com +noall +answer`.
- Sécurité (conseillé) : *GitHub → Settings (de votre compte) → Pages → Add a domain* pour vérifier votre domaine via un enregistrement TXT, afin que personne d'autre ne puisse le revendiquer.

---

## 5. Activer HTTPS dans GitHub Pages

1. Une fois le DNS propagé, retournez dans **Settings → Pages**.
2. GitHub vérifie le domaine (une coche verte « DNS check successful » apparaît) puis génère un certificat Let's Encrypt (peut prendre jusqu'à ~1 h).
3. Cochez **Enforce HTTPS**.
4. Si la case est grisée : attendez, ou retirez puis ré-ajoutez le domaine dans *Custom domain*, et vérifiez qu'il n'y a pas d'enregistrement `A`/`AAAA`/`CNAME` parasite chez IONOS.

---

## 6. Où remplacer l'adresse email

Dans **`script.js`**, tout en haut du fichier :

```js
const SITE_CONFIG = {
  CONTACT_EMAIL: "",            // ← mettez votre adresse ici, par ex. "hello@votre-domaine.com"
  EMAIL_SUBJECT: "Hello from the Operator website",
};
```

Cette unique valeur alimente automatiquement :
- le bouton « Email us » et l'adresse affichée dans la section Contact ;
- les liens email des pages `privacy.html` et `terms.html`.

Tant que `CONTACT_EMAIL` est vide, le bouton est désactivé et affiche « Contact address coming soon » (aucun lien cassé).

> Astuce anti-spam : l'adresse n'apparaît pas en clair dans le HTML, elle est insérée par JavaScript.

---

## 7. Où modifier le domaine utilisé dans les metadata

L'URL du site apparaît dans : `index.html` (canonical, `og:url`, `og:image`, `twitter:image`, JSON-LD), `privacy.html` et `terms.html` (canonical, `og:url`, `og:image`), `sitemap.xml` et `robots.txt`.

**Méthode simple — une seule commande** (depuis la racine du dépôt) :

```bash
./scripts/set-domain.sh https://www.votre-domaine.com
```

Le script remplace l'ancienne URL (`https://abder-rahmane.github.io/ai-ecommerce-workflow-site`) par la nouvelle dans tous ces fichiers. Il peut être relancé autant de fois que nécessaire.

**Méthode manuelle** : rechercher/remplacer `https://abder-rahmane.github.io/ai-ecommerce-workflow-site` par votre URL dans les 5 fichiers ci-dessus.

Pensez aussi à la date `Last updated` dans `privacy.html` / `terms.html` quand vous modifiez leur contenu.

---

## Personnalisation rapide

- **Textes** : tout est dans `index.html`, section par section (Hero, Workflow, Capabilities, Learning loop, About, Contact).
- **Couleurs et typographie** : variables CSS en haut de `styles.css` (`:root`) :
  `--bg #08090B`, `--ink #F4F4F2`, `--muted #8A8F98`, `--accent #7C5CFF` (`--accent-2 #A99BFF` pour le texte accentué), police `Geist` (corps 420, labels 500, titres 620).
- **Logo** : le symbole est défini une seule fois (`<symbol id="logo">` dans chaque page) et existe en fichiers SVG dans `assets/`. Pour le changer, modifiez le `<symbol>` (index, privacy, terms), `favicon.svg` et `assets/logo-mark*.svg`.
- **Image de partage** : remplacez `assets/og-image.png` (1200×630).
- **Accessibilité / performance** : `prefers-reduced-motion` est respecté (la scène du hero devient une image fixe, tout le contenu reste visible) ; sur mobile la scène est allégée (moins de particules, 30 fps, pas de parallaxe souris) ; toutes les animations se mettent en pause hors écran.
