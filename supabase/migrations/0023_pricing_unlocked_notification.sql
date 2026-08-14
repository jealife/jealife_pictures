-- ============================================================================
-- JEaLiFe Pictures — notifier un contributeur qui vient d'obtenir le droit
-- de fixer son propre prix Premium (migration 0022).
--
--   Sans ça, ce statut ne se découvre qu'en tombant dessus par hasard au
--   prochain envoi. Même logique que le reste du fil d'activité (migration
--   0021) : un déclencheur automatique, pas un rappel que l'admin devrait
--   penser à envoyer lui-même.
-- ============================================================================

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('like', 'collection_add', 'premium_purchase', 'payout_paid', 'pricing_unlocked'));

create or replace function public.notify_on_pricing_unlocked()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (recipient_id, actor_id, type)
  values (new.id, auth.uid(), 'pricing_unlocked');
  return new;
end;
$$;

-- Uniquement sur le passage false → true : ni un renouvellement sans
-- changement, ni un retrait du statut, ne doivent redéclencher la
-- notification.
drop trigger if exists trg_notify_on_pricing_unlocked on public.profiles;
create trigger trg_notify_on_pricing_unlocked
after update on public.profiles
for each row
when (old.can_price_premium = false and new.can_price_premium = true)
execute function public.notify_on_pricing_unlocked();
