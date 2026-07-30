import SkeletonCard from "./SkeletonCard";

/** Squelette de grille rendu côté serveur, le temps que la grille s'hydrate. */
export default function GridFallback({ columns = 4, count = 12 }) {
    const grid = Array.from({ length: columns }, () => []);
    [...Array(count)].forEach((_, index) => grid[index % columns].push(index));

    return (
        <div className="max-w-[1600px] mx-auto px-4 py-8">
            <div className="flex flex-row gap-6">
                {grid.map((column, columnIndex) => (
                    <div
                        key={columnIndex}
                        className={`flex-1 flex flex-col gap-6 ${columnIndex > 0 ? "hidden sm:flex" : ""} ${
                            columnIndex > 1 ? "lg:flex" : ""
                        }`}
                    >
                        {column.map((index) => <SkeletonCard key={index} index={index} />)}
                    </div>
                ))}
            </div>
        </div>
    );
}
