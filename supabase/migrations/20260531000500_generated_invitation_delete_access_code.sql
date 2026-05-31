alter table public.generated_invitations
  add column if not exists access_code text;

update public.generated_invitations generated
set access_code = attendee.access_code
from public.event_attendees attendee
where generated.attendee_id = attendee.id
  and generated.access_code is null
  and attendee.access_code is not null;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'generated_invitations'
      and policyname = 'generated invitations delete authenticated'
  ) then
    create policy "generated invitations delete authenticated"
      on public.generated_invitations
      for delete
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'generated invitations delete authenticated'
  ) then
    create policy "generated invitations delete authenticated"
      on storage.objects
      for delete
      to authenticated
      using (bucket_id = 'generated-invitations');
  end if;
end $$;
