import SubmitForm from "./SubmitForm";

export const metadata = {
    title: "Publier une image",
    description: "Publiez vos photos, illustrations ou vidéos sur JEaLiFe Stock. Vous gardez vos droits, retrait possible à tout moment.",
    alternates: { canonical: "/submit" },
};

export default function Page() {
    return <SubmitForm />;
}
