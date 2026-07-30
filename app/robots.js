export default function robots() {
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            // `/auth/` et `/reset-password` sont des pages de transition : les
            // indexer n'apporte rien et expose des URL à usage unique.
            disallow: [
                "/settings",
                "/submit",
                "/auth/",
                "/reset-password",
                "/photos/*/edit",
            ],
        },
        sitemap: "https://stock.jealife.com//sitemap.xml",
    };
}
