import ActivityView from "./ActivityView";

export const metadata = {
    title: "Activité",
    robots: { index: false, follow: false },
};

export default function Page() {
    return <ActivityView />;
}
