import CreditsView from "./CreditsView";

export const metadata = {
    title: "Crédits",
    description:
        "Achetez des crédits pour débloquer les photos, illustrations et vidéos Premium de JEaLiFe Stock.",
    alternates: { canonical: "/credits" },
};

export default function Page() {
    return <CreditsView />;
}
