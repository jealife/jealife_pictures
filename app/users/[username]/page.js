import { redirect } from "next/navigation";

/**
 * Anciens liens de profil : `/users/[username]` a été remplacé par
 * `/@[username]` (même format que le compte Unsplash de la marque), plus
 * court et reconnaissable. On redirige plutôt que de casser les liens déjà
 * partagés.
 */
export default async function LegacyUserProfileRedirect({ params }) {
    const { username } = await params;
    redirect(`/@${username}`);
}
