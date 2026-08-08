"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * Classement (médias les plus populaires, contributeurs les plus
 * téléchargés) : comparaison de magnitude par identité, donc une seule
 * teinte séquentielle plutôt qu'une couleur par ligne (voir dataviz :
 * "Compare magnitude → sequential, one hue").
 */
export default function RankingBars({ title, items, color, valueLabel, metricControl, emptyLabel = "Pas encore de données." }) {
    const [tableView, setTableView] = useState(false);
    const maxValue = Math.max(1, ...items.map((i) => i.value));

    return (
        <div className="border border-gray-100 dark:border-zinc-800 rounded-2xl p-5 bg-white dark:bg-zinc-900">
            <div className="flex items-start justify-between mb-4 gap-3">
                <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100">{title}</h3>
                <div className="flex items-center gap-3 shrink-0">
                    {metricControl}
                    <button
                        type="button"
                        onClick={() => setTableView((v) => !v)}
                        className="text-xs font-semibold text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 transition-colors underline underline-offset-2"
                    >
                        {tableView ? "Graphique" : "Tableau"}
                    </button>
                </div>
            </div>

            {items.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-zinc-500 py-6 text-center">{emptyLabel}</p>
            ) : tableView ? (
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-gray-400 dark:text-zinc-500">
                            <th className="font-medium py-1">Nom</th>
                            <th className="font-medium py-1 text-right">{valueLabel}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item) => (
                            <tr key={item.key} className="border-t border-gray-50 dark:border-zinc-800">
                                <td className="py-1.5 text-gray-700 dark:text-zinc-300">
                                    <span className="flex items-center gap-2 min-w-0">
                                        {item.imageUrl && (
                                            <Image
                                                src={item.imageUrl}
                                                alt=""
                                                width={24}
                                                height={24}
                                                className="w-6 h-6 rounded object-cover shrink-0"
                                            />
                                        )}
                                        <span className="truncate">{item.label}</span>
                                    </span>
                                </td>
                                <td className="py-1.5 text-right text-gray-900 dark:text-zinc-100 font-medium tabular-nums">
                                    {item.value.toLocaleString("fr-FR")}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <ul className="space-y-3">
                    {items.map((item, i) => (
                        <li key={item.key}>
                            <div className="flex items-center justify-between text-xs mb-1 gap-2">
                                <span className="flex items-center gap-2 min-w-0 text-gray-700 dark:text-zinc-300 font-medium">
                                    <span className="text-gray-300 dark:text-zinc-600 font-bold tabular-nums shrink-0">{i + 1}</span>
                                    {item.imageUrl && (
                                        <Image
                                            src={item.imageUrl}
                                            alt=""
                                            width={28}
                                            height={28}
                                            className="w-7 h-7 rounded object-cover shrink-0"
                                        />
                                    )}
                                    <span className="truncate">{item.label}</span>
                                </span>
                                <span className="text-gray-900 dark:text-zinc-100 font-bold tabular-nums shrink-0">
                                    {item.value.toLocaleString("fr-FR")}
                                </span>
                            </div>
                            <div className="h-2 rounded-full bg-gray-50 dark:bg-zinc-800 overflow-hidden">
                                <div
                                    className="h-full rounded-r-full"
                                    style={{ width: `${Math.max(4, (item.value / maxValue) * 100)}%`, backgroundColor: color }}
                                />
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
