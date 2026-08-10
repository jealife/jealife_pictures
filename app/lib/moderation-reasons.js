/**
 * Dictionnaire universel des motifs de non-publication.
 * Partagé entre le client (page admin de modération) et le serveur (templates d'emails).
 */
export const REJECTION_REASONS = {
    quality: {
        label: "Qualité ou netteté insuffisante",
        emailTitle: "Résolution, flou ou bruit excessif",
        advice: "Assurez-vous d'envoyer des prises bien mises au point, avec une résolution minimale de 5 Mpx, et sans bruit numérique trop prononcé.",
    },
    watermark: {
        label: "Présence de filigrane, logo ou texte incrusté",
        emailTitle: "Filigrane, logo ou texte incrusté",
        advice: "Les visuels soumis doivent être vierges de tout filigrane, logo de marque, signature, horodatage ou texte en surimpression.",
    },
    rights: {
        label: "Droit à l'image / Droit d'auteur / Marque",
        emailTitle: "Droits à l'image ou propriété intellectuelle",
        advice: "Assurez-vous de posséder l'intégralité des droits d'auteur et d'avoir le consentement écrit des personnes identifiables (droit à l'image).",
    },
    screenshot: {
        label: "Capture d'écran ou document non original",
        emailTitle: "Capture d'écran ou document non original",
        advice: "Seules les photographies et illustrations originales créées ou capturées par vos soins sont acceptées sur la plateforme.",
    },
    duplicate: {
        label: "Photo déjà présente ou doublon",
        emailTitle: "Doublon ou image très similaire",
        advice: "Cette image ou une version quasi identique figure déjà dans votre galerie ou sur la plateforme.",
    },
    editorial: {
        label: "Non conforme aux critères éditoriaux",
        emailTitle: "Ligne éditoriale et critères artistiques",
        advice: "L'image ne correspond pas tout à fait à la ligne artistique ou aux critères de cadrage et de composition recherchés sur JEaLiFe Stock.",
    },
    autre: {
        label: "Autre motif (détails ci-dessous)",
        emailTitle: "Critères de modération",
        advice: "N'hésitez pas à réviser la photo ou à vérifier nos consignes avant votre prochain envoi.",
    },
};
