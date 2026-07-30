-- ============================================================================
-- JEaLiFe Pictures — données de référence
--   · Tous les pays africains, avec leur région et leur appartenance CEMAC.
--   · Les thèmes de départ, orientés Gabon puis Afrique.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Pays d'Afrique
-- ----------------------------------------------------------------------------
insert into public.countries (code, name_fr, slug, region, is_african, is_cemac, emoji) values
  -- Afrique centrale (CEMAC en premier)
  ('GA', 'Gabon',                        'gabon',                    'afrique-centrale', true, true,  '🇬🇦'),
  ('CM', 'Cameroun',                     'cameroun',                 'afrique-centrale', true, true,  '🇨🇲'),
  ('CF', 'République centrafricaine',    'centrafrique',             'afrique-centrale', true, true,  '🇨🇫'),
  ('CG', 'Congo-Brazzaville',            'congo-brazzaville',        'afrique-centrale', true, true,  '🇨🇬'),
  ('GQ', 'Guinée équatoriale',           'guinee-equatoriale',       'afrique-centrale', true, true,  '🇬🇶'),
  ('TD', 'Tchad',                        'tchad',                    'afrique-centrale', true, true,  '🇹🇩'),
  ('CD', 'République démocratique du Congo', 'rd-congo',             'afrique-centrale', true, false, '🇨🇩'),
  ('AO', 'Angola',                       'angola',                   'afrique-centrale', true, false, '🇦🇴'),
  ('ST', 'Sao Tomé-et-Principe',         'sao-tome-et-principe',     'afrique-centrale', true, false, '🇸🇹'),

  -- Afrique de l'Ouest
  ('BJ', 'Bénin',                        'benin',                    'afrique-de-l-ouest', true, false, '🇧🇯'),
  ('BF', 'Burkina Faso',                 'burkina-faso',             'afrique-de-l-ouest', true, false, '🇧🇫'),
  ('CV', 'Cap-Vert',                     'cap-vert',                 'afrique-de-l-ouest', true, false, '🇨🇻'),
  ('CI', 'Côte d''Ivoire',               'cote-d-ivoire',            'afrique-de-l-ouest', true, false, '🇨🇮'),
  ('GM', 'Gambie',                       'gambie',                   'afrique-de-l-ouest', true, false, '🇬🇲'),
  ('GH', 'Ghana',                        'ghana',                    'afrique-de-l-ouest', true, false, '🇬🇭'),
  ('GN', 'Guinée',                       'guinee',                   'afrique-de-l-ouest', true, false, '🇬🇳'),
  ('GW', 'Guinée-Bissau',                'guinee-bissau',            'afrique-de-l-ouest', true, false, '🇬🇼'),
  ('LR', 'Liberia',                      'liberia',                  'afrique-de-l-ouest', true, false, '🇱🇷'),
  ('ML', 'Mali',                         'mali',                     'afrique-de-l-ouest', true, false, '🇲🇱'),
  ('MR', 'Mauritanie',                   'mauritanie',               'afrique-de-l-ouest', true, false, '🇲🇷'),
  ('NE', 'Niger',                        'niger',                    'afrique-de-l-ouest', true, false, '🇳🇪'),
  ('NG', 'Nigeria',                      'nigeria',                  'afrique-de-l-ouest', true, false, '🇳🇬'),
  ('SN', 'Sénégal',                      'senegal',                  'afrique-de-l-ouest', true, false, '🇸🇳'),
  ('SL', 'Sierra Leone',                 'sierra-leone',             'afrique-de-l-ouest', true, false, '🇸🇱'),
  ('TG', 'Togo',                         'togo',                     'afrique-de-l-ouest', true, false, '🇹🇬'),

  -- Afrique du Nord
  ('DZ', 'Algérie',                      'algerie',                  'afrique-du-nord',  true, false, '🇩🇿'),
  ('EG', 'Égypte',                       'egypte',                   'afrique-du-nord',  true, false, '🇪🇬'),
  ('LY', 'Libye',                        'libye',                    'afrique-du-nord',  true, false, '🇱🇾'),
  ('MA', 'Maroc',                        'maroc',                    'afrique-du-nord',  true, false, '🇲🇦'),
  ('SD', 'Soudan',                       'soudan',                   'afrique-du-nord',  true, false, '🇸🇩'),
  ('TN', 'Tunisie',                      'tunisie',                  'afrique-du-nord',  true, false, '🇹🇳'),

  -- Afrique de l'Est
  ('BI', 'Burundi',                      'burundi',                  'afrique-de-l-est', true, false, '🇧🇮'),
  ('KM', 'Comores',                      'comores',                  'afrique-de-l-est', true, false, '🇰🇲'),
  ('DJ', 'Djibouti',                     'djibouti',                 'afrique-de-l-est', true, false, '🇩🇯'),
  ('ER', 'Érythrée',                     'erythree',                 'afrique-de-l-est', true, false, '🇪🇷'),
  ('ET', 'Éthiopie',                     'ethiopie',                 'afrique-de-l-est', true, false, '🇪🇹'),
  ('KE', 'Kenya',                        'kenya',                    'afrique-de-l-est', true, false, '🇰🇪'),
  ('MG', 'Madagascar',                   'madagascar',               'afrique-de-l-est', true, false, '🇲🇬'),
  ('MW', 'Malawi',                       'malawi',                   'afrique-de-l-est', true, false, '🇲🇼'),
  ('MU', 'Maurice',                      'maurice',                  'afrique-de-l-est', true, false, '🇲🇺'),
  ('MZ', 'Mozambique',                   'mozambique',               'afrique-de-l-est', true, false, '🇲🇿'),
  ('RW', 'Rwanda',                       'rwanda',                   'afrique-de-l-est', true, false, '🇷🇼'),
  ('SC', 'Seychelles',                   'seychelles',               'afrique-de-l-est', true, false, '🇸🇨'),
  ('SO', 'Somalie',                      'somalie',                  'afrique-de-l-est', true, false, '🇸🇴'),
  ('SS', 'Soudan du Sud',                'soudan-du-sud',            'afrique-de-l-est', true, false, '🇸🇸'),
  ('TZ', 'Tanzanie',                     'tanzanie',                 'afrique-de-l-est', true, false, '🇹🇿'),
  ('UG', 'Ouganda',                      'ouganda',                  'afrique-de-l-est', true, false, '🇺🇬'),
  ('ZM', 'Zambie',                       'zambie',                   'afrique-de-l-est', true, false, '🇿🇲'),
  ('ZW', 'Zimbabwe',                     'zimbabwe',                 'afrique-de-l-est', true, false, '🇿🇼'),

  -- Afrique australe
  ('BW', 'Botswana',                     'botswana',                 'afrique-australe', true, false, '🇧🇼'),
  ('LS', 'Lesotho',                      'lesotho',                  'afrique-australe', true, false, '🇱🇸'),
  ('NA', 'Namibie',                      'namibie',                  'afrique-australe', true, false, '🇳🇦'),
  ('SZ', 'Eswatini',                     'eswatini',                 'afrique-australe', true, false, '🇸🇿'),
  ('ZA', 'Afrique du Sud',               'afrique-du-sud',           'afrique-australe', true, false, '🇿🇦'),

  -- Hors Afrique : le strict nécessaire pour la diaspora et les voyages.
  ('FR', 'France',                       'france',                   'europe',        false, false, '🇫🇷'),
  ('BE', 'Belgique',                     'belgique',                 'europe',        false, false, '🇧🇪'),
  ('CH', 'Suisse',                       'suisse',                   'europe',        false, false, '🇨🇭'),
  ('PT', 'Portugal',                     'portugal',                 'europe',        false, false, '🇵🇹'),
  ('ES', 'Espagne',                      'espagne',                  'europe',        false, false, '🇪🇸'),
  ('GB', 'Royaume-Uni',                  'royaume-uni',              'europe',        false, false, '🇬🇧'),
  ('DE', 'Allemagne',                    'allemagne',                'europe',        false, false, '🇩🇪'),
  ('IT', 'Italie',                       'italie',                   'europe',        false, false, '🇮🇹'),
  ('CA', 'Canada',                       'canada',                   'ameriques',     false, false, '🇨🇦'),
  ('US', 'États-Unis',                   'etats-unis',               'ameriques',     false, false, '🇺🇸'),
  ('BR', 'Brésil',                       'bresil',                   'ameriques',     false, false, '🇧🇷'),
  ('AE', 'Émirats arabes unis',          'emirats-arabes-unis',      'asie',          false, false, '🇦🇪'),
  ('TR', 'Turquie',                      'turquie',                  'asie',          false, false, '🇹🇷'),
  ('CN', 'Chine',                        'chine',                    'asie',          false, false, '🇨🇳'),
  ('IN', 'Inde',                         'inde',                     'asie',          false, false, '🇮🇳')
on conflict (code) do update
  set name_fr    = excluded.name_fr,
      slug       = excluded.slug,
      region     = excluded.region,
      is_african = excluded.is_african,
      is_cemac   = excluded.is_cemac,
      emoji      = excluded.emoji;

-- ----------------------------------------------------------------------------
-- Thèmes de départ
--
--   `is_featured` détermine ce qui apparaît dans la barre de navigation : ce
--   sont volontairement des thèmes universels (nature, portrait, culture…),
--   pas des noms de lieux. Les thèmes géographiques existent bien, mais en
--   second rang — ils se remplissent au fil des publications et servent de
--   pages d'atterrissage pour la recherche, sans occuper la vitrine.
-- ----------------------------------------------------------------------------
insert into public.topics (slug, name, description, is_featured) values
  ('nature',             'Nature',               'Forêts, fleuves, mangroves, savanes.', true),
  ('faune',              'Faune',                'Animaux sauvages, oiseaux, vie marine.', true),
  ('portrait',           'Portrait',             'Visages, regards, personnes.', true),
  ('culture',            'Culture',              'Rites, masques, danses, artisanat, patrimoine.', true),
  ('plages',             'Plages & océan',       'Littoral, sable, vagues, horizons.', true),
  ('vie-quotidienne',    'Vie quotidienne',      'Marchés, transports, commerces, rue.', true),
  ('architecture',       'Architecture',         'Bâti urbain, habitat, chantiers.', true),
  ('voyage',             'Voyage',               'Itinéraires, transports, découvertes.', true),

  ('paysage',            'Paysage',              'Grands espaces, reliefs, points de vue.', false),
  ('mode',               'Mode',                 'Textile, création, stylisme.', false),
  ('cuisine',            'Cuisine',              'Produits, plats et savoir-faire culinaires.', false),
  ('musique',            'Musique',              'Concerts, instruments, scènes.', false),
  ('sport',              'Sport',                'Football, athlétisme, sports de rue.', false),
  ('travail',            'Travail & métiers',    'Artisans, commerçants, bureaux, entreprises.', false),
  ('agriculture',        'Agriculture',          'Plantations, pêche, élevage, forêt.', false),
  ('fond-d-ecran',       'Fond d''écran',        'Formats verticaux et horizontaux pour vos écrans.', false),
  ('textures',           'Textures & motifs',    'Matières, tissus, surfaces, détails.', false),
  ('nuit',               'Nuit',                 'Lumières nocturnes, ciels étoilés.', false),
  ('couchers-de-soleil', 'Couchers de soleil',   'Fins de journée et lumières rasantes.', false),

  -- Thèmes de lieux : utiles pour classer vos propres images, discrets tant
  -- qu'ils sont vides.
  ('parcs-nationaux',    'Parcs nationaux',      'Aires protégées et réserves.', false),
  ('libreville',         'Libreville',           'Bord de mer, marchés, quartiers, vie urbaine.', false),
  ('lope',               'Lopé',                 'Parc national de la Lopé, patrimoine mondial.', false),
  ('ivindo',             'Ivindo',               'Chutes de Kongou et de Mingouli, forêt primaire.', false),
  ('loango',             'Loango',               'Là où la forêt rencontre l''océan.', false),
  ('pongara',            'Pongara',              'Plages et mangroves face à Libreville.', false),
  ('port-gentil',        'Port-Gentil',          'Ville côtière et port industriel.', false),
  ('franceville',        'Franceville',          'Haut-Ogooué, plateaux Batéké.', false),
  ('oyem',               'Oyem',                 'Woleu-Ntem, nord forestier.', false),
  ('lambarene',          'Lambaréné',            'L''Ogooué et l''hôpital Albert-Schweitzer.', false)
on conflict (slug) do update
  set name        = excluded.name,
      description = excluded.description,
      is_featured = excluded.is_featured;
