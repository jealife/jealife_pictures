"use client";

import { useId, useMemo, useRef, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";

const WIDTH = 600;
const HEIGHT = 180;
const PAD = { top: 14, right: 12, bottom: 24, left: 40 };

// Jetons de couleur du skill dataviz (references/palette.md), déclinés pour
// les deux modes du site (voir ThemeContext). Les teintes de série (passées
// en prop `color`) restent les mêmes valeurs dans les deux modes ou leur pas
// "dark" du même slot catégoriel — c'est l'appelant qui choisit.
const INK = {
    light: { primary: "#0b0b0b", muted: "#898781", grid: "#e1e0d9", axis: "#c3c2b7" },
    dark: { primary: "#ffffff", muted: "#898781", grid: "#2c2c2a", axis: "#383835" },
};

function formatDateLabel(iso) {
    const d = new Date(`${iso}T00:00:00`);
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

// Arrondit le plafond de l'axe Y à une valeur "ronde" (1, 2, 5 ×10^n) plutôt
// qu'au maximum brut : des graduations à 0 / 7 / 14 se lisent mal.
function niceMax(max) {
    if (max <= 0) return 1;
    const magnitude = 10 ** Math.floor(Math.log10(max));
    const normalized = max / magnitude;
    const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
    return step * magnitude;
}

/**
 * Graphique de tendance à une seule série (téléchargements, envois ou
 * inscriptions par jour). Pas de légende : une seule couleur, le titre du
 * bloc dit déjà ce qui est tracé (voir dataviz : "a single series needs no
 * legend box").
 */
export default function TrendChart({ title, data, color, total }) {
    const { resolvedTheme } = useTheme();
    const ink = INK[resolvedTheme] || INK.light;
    const gradientId = useId().replace(/:/g, "");
    const [hoverIndex, setHoverIndex] = useState(null);
    const [tableView, setTableView] = useState(false);
    const svgRef = useRef(null);

    const plotWidth = WIDTH - PAD.left - PAD.right;
    const plotHeight = HEIGHT - PAD.top - PAD.bottom;

    const maxValue = useMemo(
        () => niceMax(Math.max(1, ...data.map((d) => d.value))),
        [data]
    );

    const points = useMemo(() => {
        if (data.length === 0) return [];
        return data.map((d, i) => ({
            ...d,
            x: PAD.left + (data.length === 1 ? 0 : (i / (data.length - 1)) * plotWidth),
            y: PAD.top + plotHeight - (d.value / maxValue) * plotHeight,
        }));
    }, [data, maxValue, plotWidth, plotHeight]);

    const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
    const areaPath = points.length > 0
        ? `${linePath} L ${points[points.length - 1].x.toFixed(2)} ${(PAD.top + plotHeight).toFixed(2)} L ${points[0].x.toFixed(2)} ${(PAD.top + plotHeight).toFixed(2)} Z`
        : "";

    // Dédoublonné : sur un petit total (maxValue <= 2), les fractions 0 / 0.5 / 1
    // arrondissent parfois sur le même entier (ex. maxValue=1 → 0, 1, 1), ce qui
    // affichait deux fois la même graduation et faisait planter React sur des
    // clés dupliquées.
    const yTicks = [...new Set([0, 0.5, 1].map((f) => Math.round(maxValue * f)))];
    const lastPoint = points[points.length - 1];
    const hovered = hoverIndex != null ? points[hoverIndex] : null;

    const handlePointerMove = (event) => {
        if (!svgRef.current || points.length === 0) return;
        const rect = svgRef.current.getBoundingClientRect();
        const relativeX = ((event.clientX - rect.left) / rect.width) * WIDTH;
        let nearest = 0;
        let nearestDist = Infinity;
        points.forEach((p, i) => {
            const dist = Math.abs(p.x - relativeX);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = i;
            }
        });
        setHoverIndex(nearest);
    };

    return (
        <div className="border border-gray-100 dark:border-zinc-800 rounded-2xl p-5 bg-white dark:bg-zinc-900">
            <div className="flex items-start justify-between mb-1 gap-2">
                <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100">{title}</h3>
                    <p className="text-2xl font-extrabold text-gray-900 dark:text-zinc-100 mt-1 tabular-nums">
                        {total.toLocaleString("fr-FR")}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setTableView((v) => !v)}
                    className="text-xs font-semibold text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 transition-colors underline underline-offset-2 shrink-0"
                >
                    {tableView ? "Graphique" : "Tableau"}
                </button>
            </div>

            {tableView ? (
                <div className="mt-4 max-h-48 overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-gray-400 dark:text-zinc-500">
                                <th className="font-medium py-1">Date</th>
                                <th className="font-medium py-1 text-right">Valeur</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((d) => (
                                <tr key={d.date} className="border-t border-gray-50 dark:border-zinc-800">
                                    <td className="py-1 text-gray-600 dark:text-zinc-400">{formatDateLabel(d.date)}</td>
                                    <td className="py-1 text-right text-gray-900 dark:text-zinc-100 font-medium tabular-nums">{d.value}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="relative mt-3">
                    <svg
                        ref={svgRef}
                        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                        className="w-full h-auto touch-none"
                        onPointerMove={handlePointerMove}
                        onPointerLeave={() => setHoverIndex(null)}
                        role="img"
                        aria-label={`${title} : ${total} sur la période`}
                    >
                        <defs>
                            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={color} stopOpacity="0.14" />
                                <stop offset="100%" stopColor={color} stopOpacity="0" />
                            </linearGradient>
                        </defs>

                        {yTicks.map((t) => {
                            const y = PAD.top + plotHeight - (t / maxValue) * plotHeight;
                            return (
                                <g key={t}>
                                    <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y} y2={y} stroke={ink.grid} strokeWidth="1" />
                                    <text x={PAD.left - 8} y={y} textAnchor="end" dominantBaseline="middle" fontSize="10" fill={ink.muted}>
                                        {t.toLocaleString("fr-FR")}
                                    </text>
                                </g>
                            );
                        })}

                        <line
                            x1={PAD.left} x2={WIDTH - PAD.right}
                            y1={PAD.top + plotHeight} y2={PAD.top + plotHeight}
                            stroke={ink.axis} strokeWidth="1"
                        />

                        {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}
                        {linePath && (
                            <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        )}

                        {hovered && (
                            <>
                                <line
                                    x1={hovered.x} x2={hovered.x} y1={PAD.top} y2={PAD.top + plotHeight}
                                    stroke={ink.axis} strokeWidth="1" strokeDasharray="2 2"
                                />
                                <circle cx={hovered.x} cy={hovered.y} r="4" fill={color} stroke={resolvedTheme === "dark" ? "#1a1a19" : "#fcfcfb"} strokeWidth="2" />
                            </>
                        )}

                        {/* Valeur directe au dernier point (dataviz : "Lines → value at the end"). */}
                        {lastPoint && (
                            <text
                                x={lastPoint.x} y={Math.max(PAD.top + 8, lastPoint.y - 10)}
                                textAnchor="end" fontSize="11" fontWeight="700" fill={ink.primary}
                            >
                                {lastPoint.value.toLocaleString("fr-FR")}
                            </text>
                        )}
                    </svg>

                    {hovered && (
                        <div
                            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap"
                            style={{ left: `${(hovered.x / WIDTH) * 100}%`, top: `${(hovered.y / HEIGHT) * 100}%` }}
                        >
                            <span className="font-bold tabular-nums">{hovered.value.toLocaleString("fr-FR")}</span>{" "}
                            <span className="text-gray-300 dark:text-zinc-500">{formatDateLabel(hovered.date)}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
