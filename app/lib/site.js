/**
 * Adresse publique du site, en un seul endroit.
 *
 * Elle était recopiée dans le plan de site, robots.txt, les métadonnées de
 * base et les données structurées — avec un slash final dans certaines copies
 * et pas dans d'autres. Comme les gabarits ajoutent eux-mêmes un `/`, toutes
 * les URL du plan de site sortaient en `https://…//photos/12-…`, et robots.txt
 * déclarait un `//sitemap.xml`. Des URL malformées dans un plan de site, c'est
 * un catalogue que Google n'explore pas.
 *
 * `NEXT_PUBLIC_SITE_URL` permet de pointer une préproduction sans toucher au
 * code ; le slash final est retiré quoi qu'il arrive.
 */
export const SITE_URL = (
    process.env.NEXT_PUBLIC_SITE_URL || 'https://stock.jealife.com'
).replace(/\/+$/, '');

export const SITE_NAME = 'JEaLiFe Stock';

/** Construit une URL absolue à partir d'un chemin, sans doubler les slashs. */
export function absoluteUrl(path = '/') {
    if (!path || path === '/') return SITE_URL;
    return `${SITE_URL}/${String(path).replace(/^\/+/, '')}`;
}

/**
 * Sérialise des données structurées (JSON-LD) pour un
 * `<script type="application/ld+json" dangerouslySetInnerHTML>`.
 *
 * `JSON.stringify` seul n'échappe jamais `<` : un titre, une bio ou une
 * description contenant `</script><script>...` refermait la vraie balise
 * `<script>` et en ouvrait une nouvelle, exécutable — ces champs viennent
 * tous d'un formulaire (envoi, profil, collection), donc entièrement
 * contrôlés par n'importe quel compte. `<` reste un `<` valide en JSON
 * (les moteurs de recherche le décodent normalement) mais ne peut plus
 * refermer de balise HTML.
 */
export function jsonLdScript(data) {
    return JSON.stringify(data).replace(/</g, '\\u003c');
}
