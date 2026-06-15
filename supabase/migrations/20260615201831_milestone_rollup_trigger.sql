-- Milestone roll-up trigger
--
-- Keeps package_milestones (and package/project start/end dates) in sync with
-- milestone_tasks regardless of which client writes (web or mobile). This ports
-- the EXACT logic from src/lib/db.ts -> rollUpMilestoneTasks into the database so
-- that mobile writes no longer leave package_milestones / package / project dates
-- stale.
--
-- NOTE: the JS rollUpMilestoneTasks is intentionally kept for now as a
-- belt-and-suspenders measure; it will be retired in a follow-up once this trigger
-- is verified in production.

-- ---------------------------------------------------------------------------
-- Roll-up function
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER so it can write package_milestones / packages / projects under
-- RLS. It is owned by the migration role (superuser-equivalent in Supabase), which
-- can write all three tables and bypasses RLS. search_path is pinned for safety.
--
-- CRITICAL: this function only writes package_milestones, packages and projects.
-- It never writes milestone_tasks, so the AFTER trigger below cannot recurse.
create or replace function public.roll_up_package_milestones(p_package_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_project_id uuid;
begin
  if p_package_id is null then
    return;
  end if;

  -- 1. Upsert the 6 execution milestones for this package.
  --    progress = round(avg(coalesce(progress, 0))) over that milestone's tasks
  --    (matches the JS: round of the average of task progress, missing -> 0).
  --    A LEFT JOIN onto the fixed milestone list guarantees a row per milestone
  --    even when it has no tasks (avg over the single coalesced 0 row -> 0).
  --    completed_at = now() when the rounded average is exactly 100, else null
  --    (this mirrors the JS, which re-stamps completed_at on every roll-up at 100).
  insert into public.package_milestones
    (package_id, milestone_name, display_order, progress, completed_at)
  select
    p_package_id,
    m.name,
    m.ord,
    round(avg(coalesce(t.progress, 0)))                                    as progress,
    case when round(avg(coalesce(t.progress, 0))) = 100 then now() else null end as completed_at
  from (values
    ('Mobilisation',              1),
    ('Preliminaries',             2),
    ('Procurement',               3),
    ('Installation',              4),
    ('Testing and Commissioning', 5),
    ('Handover',                  6)
  ) as m(name, ord)
  left join public.milestone_tasks t
    on t.package_id = p_package_id
   and t.milestone_name = m.name
  group by m.name, m.ord
  on conflict (package_id, milestone_name) do update
    set progress      = excluded.progress,
        display_order  = excluded.display_order,
        completed_at   = excluded.completed_at;
        -- completed_by is intentionally left untouched.

  -- 2. Roll package start/end dates up from its tasks (null when no dated tasks).
  update public.packages pk
  set start_date = (select min(t.start_date) from public.milestone_tasks t where t.package_id = p_package_id),
      end_date   = (select max(t.end_date)   from public.milestone_tasks t where t.package_id = p_package_id)
  where pk.id = p_package_id
  returning pk.project_id into v_project_id;

  -- 3. Cascade to the parent project: min/max across ALL packages in the project
  --    (uses the package dates just updated above).
  if v_project_id is not null then
    update public.projects pr
    set start_date = sub.min_start,
        end_date   = sub.max_end
    from (
      select pk.project_id,
             min(pk.start_date) as min_start,
             max(pk.end_date)   as max_end
      from public.packages pk
      where pk.project_id = v_project_id
      group by pk.project_id
    ) sub
    where pr.id = sub.project_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Trigger wrapper
-- ---------------------------------------------------------------------------
create or replace function public.trg_roll_up_milestone_tasks()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    perform public.roll_up_package_milestones(old.package_id);
    return old;
  else
    perform public.roll_up_package_milestones(new.package_id);
    return new;
  end if;
end;
$$;

drop trigger if exists roll_up_milestone_tasks on public.milestone_tasks;

create trigger roll_up_milestone_tasks
after insert or update or delete on public.milestone_tasks
for each row
execute function public.trg_roll_up_milestone_tasks();

-- ---------------------------------------------------------------------------
-- Backfill existing data so stored roll-ups match current tasks immediately.
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in select id from public.packages loop
    perform public.roll_up_package_milestones(r.id);
  end loop;
end;
$$;
