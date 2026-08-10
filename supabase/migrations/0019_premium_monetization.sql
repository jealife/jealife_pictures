-- ============================================================================
-- JEaLiFe Pictures — monétisation Premium par crédits
--
--   Le site est entièrement gratuit aujourd'hui, sans revenu, alors que
--   l'hébergement (Cloudflare R2) coûte chaque mois. Principe retenu avec
--   l'utilisateur : tout ce qui est déjà publié reste gratuit pour toujours ;
--   à chaque nouvel envoi, le contributeur choisit lui-même Gratuit ou
--   Premium pour cette photo/vidéo/illustration précise. Un visiteur achète
--   des crédits (par lots, prix Mobile Money à venir) et les dépense sur du
--   contenu Premium ; le contributeur touche une part de chaque dépense sur
--   son propre contenu.
--
--   Cette migration construit tout le système SAUF le fournisseur de
--   paiement Mobile Money lui-même (encaissement des lots, versement aux
--   contributeurs) — ce qui n'existe pas encore. Le réglage
--   `payments_enabled` (table `site_settings`, migration 0004) sert
--   d'interrupteur côté interface : tant qu'il vaut `false`, les pages
--   concernées affichent un état « Bientôt disponible » plutôt que d'appeler
--   `purchase_credits`/`spend_credits_for_download`. Le jour où un
--   fournisseur est branché, il ne reste qu'à faire passer les lignes de
--   `credit_purchases` de `pending` à `completed` (et créditer le
--   portefeuille en conséquence) puis à basculer l'interrupteur.
--
--   Le versement aux contributeurs reste manuel pour l'instant : l'admin
--   envoie l'argent par Mobile Money de sa propre main, puis l'enregistre via
--   `mark_payout_paid`. L'automatisation du versement viendra plus tard.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Média : bascule Premium
-- ----------------------------------------------------------------------------
alter table public.media
  add column if not exists is_premium boolean not null default false;

-- ----------------------------------------------------------------------------
-- 2. Portefeuilles — table séparée de `profiles`, à dessein. `profiles` a
--    déjà un trigger (`protect_profile_privileges`, migration 0004) qui ne
--    protège que certaines colonnes (`role`, `is_verified`...) contre une
--    auto-modification, et sa policy d'update laisse par ailleurs chacun
--    modifier sa propre ligne. Ajouter des soldes financiers dessus
--    obligerait à étendre ce trigger pour chaque nouvelle colonne. Ici,
--    aucune policy d'écriture n'existe pour un client normal : seule une
--    fonction `security definer` peut modifier un portefeuille — la
--    protection tient par construction, pas par discipline de code.
-- ----------------------------------------------------------------------------
create table public.wallets (
  user_id               uuid primary key references public.profiles(id) on delete cascade,
  credit_balance        int not null default 0 check (credit_balance >= 0),
  earnings_balance_fcfa int not null default 0 check (earnings_balance_fcfa >= 0),
  updated_at            timestamptz not null default now()
);

alter table public.wallets enable row level security;

create policy "Chacun consulte son propre portefeuille, un admin consulte tous."
  on public.wallets for select
  using (auth.uid() = user_id or public.is_admin());

-- ----------------------------------------------------------------------------
-- 3. Prix par type de média, en crédits — lecture publique (le prix doit
--    s'afficher avant même de se connecter), écriture réservée admin.
-- ----------------------------------------------------------------------------
create table public.premium_pricing (
  media_type   text primary key check (media_type in ('photo', 'illustration', 'video')),
  credits_cost int not null check (credits_cost > 0)
);

alter table public.premium_pricing enable row level security;

create policy "Le prix par type de média est public."
  on public.premium_pricing for select using (true);

-- Valeurs de départ, modifiables depuis /admin/monetization — la vidéo vaut
-- plus, elle coûte plus cher à produire et à stocker.
insert into public.premium_pricing (media_type, credits_cost) values
  ('photo', 1),
  ('illustration', 1),
  ('video', 3)
on conflict (media_type) do nothing;

create or replace function public.set_premium_pricing(p_media_type text, p_credits_cost int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Permission refusée.' using errcode = '42501';
  end if;
  if p_credits_cost <= 0 then
    raise exception 'Le coût en crédits doit être positif.';
  end if;

  insert into public.premium_pricing (media_type, credits_cost)
  values (p_media_type, p_credits_cost)
  on conflict (media_type) do update set credits_cost = excluded.credits_cost;
end;
$$;

revoke all on function public.set_premium_pricing(text, int) from public, anon;
grant execute on function public.set_premium_pricing(text, int) to authenticated;

-- ----------------------------------------------------------------------------
-- 4. Lots de crédits — lecture publique des lots actifs, écriture admin.
-- ----------------------------------------------------------------------------
create table public.credit_packs (
  id         bigint generated by default as identity primary key,
  credits    int not null check (credits > 0),
  price_fcfa int not null check (price_fcfa > 0),
  is_active  boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.credit_packs enable row level security;

create policy "Les lots actifs sont publics, un admin voit aussi les inactifs."
  on public.credit_packs for select using (is_active or public.is_admin());

-- Un seul lot au départ, exactement ce que l'utilisateur a décrit (10
-- crédits / 5000 FCFA) — d'autres lots pourront être ajoutés depuis le
-- Dashboard sans changement de schéma.
insert into public.credit_packs (credits, price_fcfa, sort_order) values
  (10, 5000, 0);

-- Un seul point d'entrée pour créer ou modifier un lot : `p_id` nul crée,
-- renseigné met à jour. Pas de suppression — désactiver plutôt que
-- supprimer, pour ne jamais casser l'historique d'achats qui référence un
-- `pack_id`.
create or replace function public.save_credit_pack(
  p_id bigint,
  p_credits int,
  p_price_fcfa int,
  p_is_active boolean default true
)
returns public.credit_packs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.credit_packs;
begin
  if not public.is_admin() then
    raise exception 'Permission refusée.' using errcode = '42501';
  end if;
  if p_credits <= 0 or p_price_fcfa <= 0 then
    raise exception 'Crédits et prix doivent être positifs.';
  end if;

  if p_id is null then
    insert into public.credit_packs (credits, price_fcfa, is_active)
    values (p_credits, p_price_fcfa, p_is_active)
    returning * into v_row;
  else
    update public.credit_packs
    set credits = p_credits, price_fcfa = p_price_fcfa, is_active = p_is_active
    where id = p_id
    returning * into v_row;

    if not found then
      raise exception 'Ce lot n''existe pas.';
    end if;
  end if;

  return v_row;
end;
$$;

revoke all on function public.save_credit_pack(bigint, int, int, boolean) from public, anon;
grant execute on function public.save_credit_pack(bigint, int, int, boolean) to authenticated;

-- ----------------------------------------------------------------------------
-- 5. Journal des achats de crédits — prêt pour le futur fournisseur Mobile
--    Money : ce sera lui qui fera passer une ligne de `pending` à
--    `completed` et créditera le portefeuille. Rien n'écrit encore de ligne
--    `completed` — le client n'appelle même pas `purchase_credits` tant que
--    `payments_enabled` est faux (page « Bientôt disponible »).
-- ----------------------------------------------------------------------------
create table public.credit_purchases (
  id                bigint generated by default as identity primary key,
  user_id           uuid not null references public.profiles(id) on delete cascade,
  pack_id           bigint not null references public.credit_packs(id),
  credits           int not null,
  price_fcfa        int not null,
  status            text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  payment_reference text,
  created_at        timestamptz not null default now()
);

alter table public.credit_purchases enable row level security;

create policy "Chacun consulte ses propres achats, un admin consulte tous."
  on public.credit_purchases for select
  using (auth.uid() = user_id or public.is_admin());

create or replace function public.purchase_credits(p_pack_id bigint)
returns public.credit_purchases
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pack public.credit_packs;
  v_purchase public.credit_purchases;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.' using errcode = '42501';
  end if;

  select * into v_pack from public.credit_packs where id = p_pack_id and is_active;
  if not found then
    raise exception 'Ce lot de crédits n''existe pas ou n''est plus disponible.';
  end if;

  insert into public.wallets (user_id) values (auth.uid()) on conflict (user_id) do nothing;

  insert into public.credit_purchases (user_id, pack_id, credits, price_fcfa, status)
  values (auth.uid(), v_pack.id, v_pack.credits, v_pack.price_fcfa, 'pending')
  returning * into v_purchase;

  return v_purchase;
end;
$$;

revoke all on function public.purchase_credits(bigint) from public, anon;
grant execute on function public.purchase_credits(bigint) to authenticated;

-- ----------------------------------------------------------------------------
-- 6. Téléchargements Premium — le mouvement d'argent central : chaque ligne
--    est à la fois un débit crédit chez l'acheteur et un crédit FCFA chez le
--    contributeur.
-- ----------------------------------------------------------------------------
create table public.premium_downloads (
  id                       bigint generated by default as identity primary key,
  media_id                 bigint not null references public.media(id) on delete cascade,
  buyer_id                 uuid not null references public.profiles(id),
  contributor_id           uuid not null references public.profiles(id),
  credits_spent            int not null,
  contributor_earning_fcfa int not null,
  created_at               timestamptz not null default now()
);

alter table public.premium_downloads enable row level security;

create policy "L'acheteur, le contributeur ou un admin consultent la ligne."
  on public.premium_downloads for select
  using (auth.uid() = buyer_id or auth.uid() = contributor_id or public.is_admin());

-- Dépense de crédits pour un téléchargement Premium — cœur du système. Le
-- `where ... and credit_balance >= v_cost` dans l'UPDATE est ce qui empêche
-- un double-clic ou deux requêtes concurrentes de dépenser deux fois le même
-- crédit : l'UPDATE ne trouve aucune ligne à modifier si le solde est déjà
-- insuffisant (`found` reste faux), et c'est nous qui levons l'exception,
-- plutôt que de laisser un solde passer sous zéro entre deux vérifications
-- séparées.
create or replace function public.spend_credits_for_download(p_media_id bigint)
returns public.premium_downloads
language plpgsql
security definer
set search_path = public
as $$
declare
  v_media record;
  v_cost int;
  v_share numeric;
  v_credit_value numeric;
  v_earning int;
  v_new_balance int;
  v_download public.premium_downloads;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.' using errcode = '42501';
  end if;

  select id, type, user_id, is_premium into v_media
  from public.media where id = p_media_id;

  if not found or not v_media.is_premium then
    raise exception 'Ce média n''est pas premium ou n''existe pas.';
  end if;
  if v_media.user_id = auth.uid() then
    raise exception 'Inutile d''acheter votre propre média.';
  end if;

  -- `media.type` est un enum (`public.media_type`), `premium_pricing.media_type`
  -- est du texte : Postgres ne compare pas un enum à une colonne texte sans
  -- cast explicite (seul un littéral texte se coerce automatiquement).
  select credits_cost into v_cost from public.premium_pricing where media_type = v_media.type::text;
  if v_cost is null then
    raise exception 'Aucun tarif configuré pour ce type de média.';
  end if;

  insert into public.wallets (user_id) values (auth.uid()) on conflict (user_id) do nothing;
  insert into public.wallets (user_id) values (v_media.user_id) on conflict (user_id) do nothing;

  update public.wallets
  set credit_balance = credit_balance - v_cost, updated_at = now()
  where user_id = auth.uid() and credit_balance >= v_cost
  returning credit_balance into v_new_balance;

  if not found then
    raise exception 'Crédits insuffisants.';
  end if;

  -- Valeur de référence d'UN crédit en FCFA, indépendante du prix d'un lot
  -- particulier : un lot peut être vendu avec un rabais au volume sans
  -- changer ce que touche le contributeur par crédit dépensé sur son média.
  select (value::numeric) into v_share from public.site_settings where key = 'contributor_share_percent';
  select (value::numeric) into v_credit_value from public.site_settings where key = 'credit_value_fcfa';
  v_earning := round(v_cost * coalesce(v_credit_value, 500) * coalesce(v_share, 35) / 100);

  update public.wallets
  set earnings_balance_fcfa = earnings_balance_fcfa + v_earning, updated_at = now()
  where user_id = v_media.user_id;

  insert into public.premium_downloads (media_id, buyer_id, contributor_id, credits_spent, contributor_earning_fcfa)
  values (p_media_id, auth.uid(), v_media.user_id, v_cost, v_earning)
  returning * into v_download;

  return v_download;
end;
$$;

revoke all on function public.spend_credits_for_download(bigint) from public, anon;
grant execute on function public.spend_credits_for_download(bigint) to authenticated;

-- ----------------------------------------------------------------------------
-- 7. Versements — gérés à la main au démarrage : l'admin envoie l'argent par
--    Mobile Money de sa main, puis enregistre le versement ici, ce qui
--    décrémente le solde en attente du contributeur.
-- ----------------------------------------------------------------------------
create table public.payouts (
  id               bigint generated by default as identity primary key,
  contributor_id   uuid not null references public.profiles(id),
  amount_fcfa      int not null check (amount_fcfa > 0),
  status           text not null default 'pending' check (status in ('pending', 'paid')),
  note             text,
  paid_by_admin_id uuid references auth.users on delete set null,
  created_at       timestamptz not null default now(),
  paid_at          timestamptz
);

alter table public.payouts enable row level security;

create policy "Le contributeur ou un admin consultent le versement."
  on public.payouts for select
  using (auth.uid() = contributor_id or public.is_admin());

create or replace function public.mark_payout_paid(p_contributor_id uuid, p_amount_fcfa int, p_note text default null)
returns public.payouts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance int;
  v_payout public.payouts;
begin
  if not public.is_admin() then
    raise exception 'Permission refusée.' using errcode = '42501';
  end if;
  if p_amount_fcfa <= 0 then
    raise exception 'Le montant doit être positif.';
  end if;

  update public.wallets
  set earnings_balance_fcfa = earnings_balance_fcfa - p_amount_fcfa, updated_at = now()
  where user_id = p_contributor_id and earnings_balance_fcfa >= p_amount_fcfa
  returning earnings_balance_fcfa into v_balance;

  if not found then
    raise exception 'Solde insuffisant pour ce versement.';
  end if;

  insert into public.payouts (contributor_id, amount_fcfa, status, note, paid_by_admin_id, paid_at)
  values (p_contributor_id, p_amount_fcfa, 'paid', p_note, auth.uid(), now())
  returning * into v_payout;

  return v_payout;
end;
$$;

revoke all on function public.mark_payout_paid(uuid, int, text) from public, anon;
grant execute on function public.mark_payout_paid(uuid, int, text) to authenticated;

-- ----------------------------------------------------------------------------
-- 8. Portefeuille personnel — créé à la volée au premier accès, pas à
--    l'inscription : évite de toucher le trigger `handle_new_user` existant
--    pour une fonctionnalité encore optionnelle.
-- ----------------------------------------------------------------------------
create or replace function public.get_my_wallet()
returns public.wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.wallets;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.' using errcode = '42501';
  end if;

  insert into public.wallets (user_id)
  values (auth.uid())
  on conflict (user_id) do nothing;

  select * into v_wallet from public.wallets where user_id = auth.uid();
  return v_wallet;
end;
$$;

revoke all on function public.get_my_wallet() from public, anon;
grant execute on function public.get_my_wallet() to authenticated;

-- ----------------------------------------------------------------------------
-- 9. Réglages (table `site_settings` existante, migration 0004)
-- ----------------------------------------------------------------------------
insert into public.site_settings (key, value) values
  ('payments_enabled', 'false'),
  ('contributor_share_percent', '35'),
  ('credit_value_fcfa', '500')
on conflict (key) do nothing;
