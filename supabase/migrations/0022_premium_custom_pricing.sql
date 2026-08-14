-- ============================================================================
-- JEaLiFe Pictures — tarification libre encadrée pour les contributeurs
-- professionnels
--
--   Des photographes professionnels consultés ont apprécié la plateforme
--   mais refusé le principe d'un prix unique : leur travail se retrouvait
--   vendu au même tarif qu'une photo d'amateur. Plutôt qu'un simple palier
--   de prix décidé par l'admin (qui ne répond qu'à moitié à la demande —
--   « je veux fixer MON prix »), ce chantier donne au contributeur la main
--   sur le prix de CHAQUE photo Premium qu'il publie, dans une fourchette
--   que l'admin définit par type de média — la liberté demandée, avec le
--   garde-fou explicitement voulu par l'utilisateur (« pas de prix
--   exagérés »).
--
--   Ce privilège est distinct du badge « vérifié » existant (identité
--   confirmée) : un contributeur peut être vérifié sans avoir la main sur
--   ses prix, et inversement. Il s'accorde au cas par cas par un admin,
--   jamais automatiquement.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Statut du contributeur — distinct de `is_verified`.
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists can_price_premium boolean not null default false;

-- Étend la garde existante (migration 0004) : sans ça, la policy « chacun
-- modifie son propre profil » laisserait n'importe quel compte s'accorder
-- ce statut lui-même.
create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role := old.role;
    new.is_verified := old.is_verified;
    new.is_contributor := old.is_contributor;
    new.can_price_premium := old.can_price_premium;
  end if;
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 2. Fourchette de prix par type de média — le garde-fou de l'admin.
-- ----------------------------------------------------------------------------
alter table public.premium_pricing
  add column if not exists min_credits_cost int not null default 1,
  add column if not exists max_credits_cost int not null default 5;

-- Valeurs de départ : une vidéo coûte déjà plus cher par défaut (migration
-- 0019), sa fourchette part donc plus haute elle aussi.
update public.premium_pricing set min_credits_cost = 1, max_credits_cost = 5
  where media_type in ('photo', 'illustration');
update public.premium_pricing set min_credits_cost = 3, max_credits_cost = 15
  where media_type = 'video';

alter table public.premium_pricing
  drop constraint if exists premium_pricing_range_chk;
alter table public.premium_pricing
  add constraint premium_pricing_range_chk check (max_credits_cost >= min_credits_cost and min_credits_cost > 0);

-- Remplace `set_premium_pricing(text, int)` : signature différente, donc
-- l'ancienne fonction est explicitement retirée plutôt que laissée à côté,
-- inutilisée et trompeuse pour qui relira ce fichier plus tard.
drop function if exists public.set_premium_pricing(text, int);

create or replace function public.set_premium_pricing(
  p_media_type text,
  p_credits_cost int,
  p_min_credits_cost int,
  p_max_credits_cost int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Permission refusée.' using errcode = '42501';
  end if;
  if p_credits_cost <= 0 or p_min_credits_cost <= 0 then
    raise exception 'Les prix doivent être positifs.';
  end if;
  if p_max_credits_cost < p_min_credits_cost then
    raise exception 'Le prix maximum doit être supérieur ou égal au minimum.';
  end if;

  insert into public.premium_pricing (media_type, credits_cost, min_credits_cost, max_credits_cost)
  values (p_media_type, p_credits_cost, p_min_credits_cost, p_max_credits_cost)
  on conflict (media_type) do update
    set credits_cost = excluded.credits_cost,
        min_credits_cost = excluded.min_credits_cost,
        max_credits_cost = excluded.max_credits_cost;
end;
$$;

revoke all on function public.set_premium_pricing(text, int, int, int) from public, anon;
grant execute on function public.set_premium_pricing(text, int, int, int) to authenticated;

-- ----------------------------------------------------------------------------
-- 3. Prix choisi par le contributeur, média par média.
-- ----------------------------------------------------------------------------
alter table public.media
  add column if not exists custom_credits_cost int;

alter table public.media
  drop constraint if exists media_custom_credits_cost_chk;
alter table public.media
  add constraint media_custom_credits_cost_chk check (custom_credits_cost is null or custom_credits_cost > 0);

-- Un contributeur non éligible ne doit jamais pouvoir fixer un prix, et un
-- contributeur éligible ne doit jamais dépasser la fourchette de l'admin —
-- vérifié ici, pas seulement dans l'interface, puisque `media` reste
-- modifiable en écriture directe par son propriétaire (RLS, migration
-- 0001) sans passer par une fonction dédiée.
create or replace function public.validate_custom_premium_price()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_can_price boolean;
  v_min int;
  v_max int;
begin
  if new.custom_credits_cost is null then
    return new;
  end if;

  -- Un prix déjà en place et inchangé n'est pas revalidé : retirer le
  -- statut à un contributeur ne doit pas casser ses fiches déjà publiées.
  if tg_op = 'UPDATE' and new.custom_credits_cost is not distinct from old.custom_credits_cost then
    return new;
  end if;

  select can_price_premium into v_can_price from public.profiles where id = new.user_id;
  if not coalesce(v_can_price, false) then
    raise exception 'Ce contributeur ne peut pas fixer son propre prix.' using errcode = '42501';
  end if;

  -- `media.type` est un enum, `premium_pricing.media_type` est du texte
  -- (même écart qu'ailleurs, voir spend_credits_for_download plus bas).
  select min_credits_cost, max_credits_cost into v_min, v_max
    from public.premium_pricing where media_type = new.type::text;

  if v_min is null then
    raise exception 'Aucune fourchette de prix configurée pour ce type de média.';
  end if;

  if new.custom_credits_cost < v_min or new.custom_credits_cost > v_max then
    raise exception 'Le prix doit être compris entre % et % crédits.', v_min, v_max;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_custom_premium_price on public.media;
create trigger trg_validate_custom_premium_price
before insert or update on public.media
for each row execute function public.validate_custom_premium_price();

-- ----------------------------------------------------------------------------
-- 4. Le prix réellement facturé doit préférer le prix personnalisé.
-- ----------------------------------------------------------------------------
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

  select id, type, user_id, is_premium, custom_credits_cost into v_media
  from public.media where id = p_media_id;

  if not found or not v_media.is_premium then
    raise exception 'Ce média n''est pas premium ou n''existe pas.';
  end if;
  if v_media.user_id = auth.uid() then
    raise exception 'Inutile d''acheter votre propre média.';
  end if;

  if v_media.custom_credits_cost is not null then
    v_cost := v_media.custom_credits_cost;
  else
    select credits_cost into v_cost from public.premium_pricing where media_type = v_media.type::text;
  end if;

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
