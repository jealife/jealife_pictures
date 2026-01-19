export default function robots() {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/settings/', '/submit/', '/photos/*/edit/'],
        },
        sitemap: 'https://jealife-pictures.vercel.app/sitemap.xml',
    };
}
