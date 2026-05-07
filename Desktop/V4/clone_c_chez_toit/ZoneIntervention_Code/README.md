# Module Zone d'Intervention

Ce dossier contient tout le code nécessaire pour intégrer une section "Zone d'Intervention" dynamique dans un projet Next.js (App Router).

## Structure du dossier

- `components/ZoneIntervention.tsx` : Le composant de la section principale à afficher sur votre page d'accueil ou page de contact.
- `app/zone/[slug]/page.tsx` : La page dynamique qui génère automatiquement une page dédiée pour chaque ville (SEO optimisé).
- `README.md` : Ce fichier d'instructions.

## Installation

1. **Copier les composants** :
   - Copiez `ZoneIntervention.tsx` dans votre dossier `src/components/`.
   - Copiez le dossier `zone/` (contenant `[slug]/page.tsx`) dans votre dossier `src/app/`.

2. **Configuration Tailwind** :
   Le code utilise des classes Tailwind CSS standard. Assurez-vous d'avoir Tailwind installé. Les couleurs ont été remplacées par des codes hexadécimaux pour éviter les erreurs de configuration, mais vous pouvez les personnaliser :
   - Couleur principale (Rose) : `#EA559D`
   - Fond sombre : `#020617`
   - Fond surface : `#1E293B`

3. **Utilisation** :
   Importez le composant dans votre page principale :
   ```tsx
   import ZoneIntervention from '@/components/ZoneIntervention';

   export default function Page() {
     return (
       <main>
         {/* Autres sections... */}
         <ZoneIntervention />
       </main>
     );
   }
   ```

## Personnalisation

- **Liste des villes** : Modifiez la constante `zones` dans les deux fichiers (`ZoneIntervention.tsx` et `page.tsx`) pour ajouter ou retirer des villes.
- **Textes et SEO** : Les textes de la page dynamique sont dans `page.tsx`. Vous pouvez modifier la fonction `generateMetadata` pour ajuster les titres et descriptions SEO.

## Dépendances

- Next.js 13+ (App Router)
- React
- Tailwind CSS
