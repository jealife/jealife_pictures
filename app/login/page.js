import LoginPageClient from "./LoginForm";

export const metadata = {
    title: "Connexion",
    description: "Connectez-vous à votre compte JEaLiFe Stock.",
    alternates: { canonical: "/login" },
};

export default function Page() {
    return <LoginPageClient />;
}
