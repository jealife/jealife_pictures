
export const topics = [
    "Fond d'écran",
    "Nature",
    "Libreville",
    "Culture",
    "Faune",
    "Plages",
    "Architecture",
    "Portrait",
    "Voyage",
    "Textures",
    "Affaires",
    "Mode"
];

const JEALIFE_AUTHOR = {
    name: "JEaLiFe Pictures",
    username: "jealife_pictures",
    avatar: "https://images.unsplash.com/profile-1679489218992-ebe123352692image?ixlib=rb-4.0.3&crop=faces&fit=crop&w=128&h=128",
    bio: "Capturer l'essence du Gabon et de l'Afrique. Compte officiel.",
    location: "Libreville, Gabon",
    total_photos: 154,
    total_likes: 12400
};

export const photos = [
    {
        id: 1,
        url: "https://images.unsplash.com/photo-1547471080-165f61765106?q=80&w=1200",
        alt: "Beautiful landscape of Gabon",
        author: JEALIFE_AUTHOR,
        likes: 124,
        location: "Libreville, Gabon"
    },
    {
        id: 2,
        url: "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?q=80&w=1200",
        alt: "Gabonese Forest",
        author: JEALIFE_AUTHOR,
        likes: 89,
        location: "Lopé National Park"
    },
    {
        id: 3,
        url: "https://images.unsplash.com/photo-1548695602-0e447b2c556b?q=80&w=1200",
        alt: "Gorilla in Gabon",
        author: JEALIFE_AUTHOR,
        likes: 432,
        location: "Loango National Park"
    },
    {
        id: 4,
        url: "https://images.unsplash.com/photo-1528271537-60e140b977bc?q=80&w=1200",
        alt: "Libreville Coast",
        author: JEALIFE_AUTHOR,
        likes: 215,
        location: "Pointe-Denis"
    },
    {
        id: 5,
        url: "https://images.unsplash.com/photo-1496317556649-f930d733eea3?q=80&w=1200",
        alt: "Libreville Business District",
        author: JEALIFE_AUTHOR,
        likes: 67,
        location: "Centre-Ville, Libreville"
    },
    {
        id: 6,
        url: "https://images.unsplash.com/photo-1481819613568-3701cbc70156?q=80&w=1200",
        alt: "Rainforest Texture",
        author: JEALIFE_AUTHOR,
        likes: 156,
        location: "Ivindo"
    },
    {
        id: 7,
        url: "https://images.unsplash.com/photo-1628173516164-3e911470438d?q=80&w=1200",
        alt: "African Elephant",
        author: JEALIFE_AUTHOR,
        likes: 890,
        location: "Pongara"
    },
    {
        id: 8,
        url: "https://images.unsplash.com/photo-1523805009345-7448845a9e53?q=80&w=1200",
        alt: "Gabon Beach Sunset",
        author: JEALIFE_AUTHOR,
        likes: 342,
        location: "Cap Estérias"
    },
    {
        id: 9,
        url: "https://images.unsplash.com/photo-1534531173927-aed1d8198632?q=80&w=1200",
        alt: "Portrait of local culture",
        author: JEALIFE_AUTHOR,
        likes: 521,
        location: "Oyem"
    },
    {
        id: 10,
        url: "https://images.unsplash.com/photo-1590418606746-fa095034c4f0?q=80&w=1200",
        alt: "Gabonese Cuisine",
        author: JEALIFE_AUTHOR,
        likes: 234,
        location: "Lambaréné"
    }
];

export const illustrations = [
    {
        id: 101,
        url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200",
        alt: "Abstract Digital Art",
        author: JEALIFE_AUTHOR,
        likes: 45,
        location: "Digital"
    },
    {
        id: 102,
        url: "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?q=80&w=1200",
        alt: "Paper Cutout Landscape",
        author: JEALIFE_AUTHOR,
        likes: 120,
        location: "Art Studio"
    },
    {
        id: 103,
        url: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1200",
        alt: "Neon Synthwave City",
        author: JEALIFE_AUTHOR,
        likes: 302,
        location: "Digital"
    },
    {
        id: 104,
        url: "https://images.unsplash.com/photo-1614730341194-75c60740a2d3?q=80&w=1200",
        alt: "Gold Fluid Texture",
        author: JEALIFE_AUTHOR,
        likes: 567,
        location: "Digital"
    }
];

export const videos = [
    {
        id: 201,
        url: "https://videos.pexels.com/video-files/855564/855564-sd_640_360_30fps.mp4", // Free stock video placeholder
        thumbnail: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=1200",
        alt: "Nature Timelapse",
        duration: "0:15",
        author: JEALIFE_AUTHOR,
        likes: 88,
        location: "Lopé"
    },
    {
        id: 202,
        url: "https://videos.pexels.com/video-files/2882787/2882787-sd_640_360_25fps.mp4",
        thumbnail: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200",
        alt: "Ocean Waves",
        duration: "0:32",
        author: JEALIFE_AUTHOR,
        likes: 156,
        location: "Port-Gentil"
    },
    {
        id: 203,
        url: "https://videos.pexels.com/video-files/4434242/4434242-sd_640_360_24fps.mp4",
        thumbnail: "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=1200",
        alt: "City Traffic",
        duration: "0:45",
        author: JEALIFE_AUTHOR,
        likes: 210,
        location: "Libreville"
    }
];

export const users = [
    JEALIFE_AUTHOR
];

export const collections = [
    {
        id: 1,
        title: "Gabon Wildlife",
        total_photos: 45,
        preview_photos: [
            "https://images.unsplash.com/photo-1548695602-0e447b2c556b?q=80&w=400",
            "https://images.unsplash.com/photo-1628173516164-3e911470438d?q=80&w=400",
            "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?q=80&w=400"
        ],
        author: { name: "JEaLiFe Pictures" },
        tags: ["wildlife", "nature", "animals"]
    },
    {
        id: 2,
        title: "Libreville Architecture",
        total_photos: 12,
        preview_photos: [
            "https://images.unsplash.com/photo-1496317556649-f930d733eea3?q=80&w=400",
            "https://images.unsplash.com/photo-1528271537-60e140b977bc?q=80&w=400",
            "https://images.unsplash.com/photo-1481819613568-3701cbc70156?q=80&w=400"
        ],
        author: { name: "JEaLiFe Pictures" },
        tags: ["city", "architecture", "urban"]
    },
    {
        id: 3,
        title: "Beach Vibes",
        total_photos: 28,
        preview_photos: [
            "https://images.unsplash.com/photo-1523805009345-7448845a9e53?q=80&w=400",
            "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=400",
            "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=400"
        ],
        author: { name: "JEaLiFe Pictures" },
        tags: ["beach", "sea", "summer"]
    }
];
