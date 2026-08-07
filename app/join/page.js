import JoinPageClient from "./JoinForm";

export const metadata = {
    title: "Créer un compte",
    description: "Créez votre compte JEaLiFe Stock pour publier vos images ou constituer vos collections.",
    alternates: { canonical: "/join" },
};

export default function Page() {
    return <JoinPageClient />;
}
