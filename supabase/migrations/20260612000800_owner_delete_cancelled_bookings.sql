create or replace function public.delete_booking_permanently_if_owner(p_booking_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_fk record;
  v_is_owner boolean := false;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Only the owner can delete bookings permanently.' using errcode = '42501';
  end if;

  select exists (
    select 1
    from auth.users auth_user
    join public.admin_users admin_user
      on admin_user.user_id = auth_user.id
      or lower(coalesce(admin_user.email, '')) = lower(coalesce(auth_user.email, ''))
    where auth_user.id = v_uid
      and lower(coalesce(auth_user.email, '')) = 'contacto@ondamultimedia.com'
      and coalesce(admin_user.is_active, true) is true
      and coalesce(admin_user.role, 'owner') = 'owner'
  )
  into v_is_owner;

  if v_is_owner is not true then
    raise exception 'Only the owner can delete bookings permanently.' using errcode = '42501';
  end if;

  select *
  into v_booking
  from public.bookings booking
  where booking.id = p_booking_id
  for update;

  if not found then
    raise exception 'Booking was not found.' using errcode = 'P0002';
  end if;

  if v_booking.status <> 'cancelled' then
    raise exception 'Only cancelled bookings can be deleted permanently.' using errcode = '23514';
  end if;

  if to_regclass('public.booking_slots') is not null
    and exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'booking_slots'
        and column_name = 'booking_id'
    )
  then
    execute 'delete from public.booking_slots where booking_id = $1'
    using p_booking_id;
  end if;

  if to_regclass('public.booking_payments') is not null then
    delete from public.booking_payments payment
    where payment.booking_id = p_booking_id;
  end if;

  if to_regclass('public.booking_email_recipients') is not null then
    delete from public.booking_email_recipients recipient
    where recipient.booking_id = p_booking_id;
  end if;

  if to_regclass('public.email_logs') is not null then
    delete from public.email_logs email_log
    where email_log.booking_id = p_booking_id;
  end if;

  if to_regclass('public.files') is not null then
    delete from public.files file_record
    where file_record.booking_id = p_booking_id;
  end if;

  for v_fk in
    select
      constraint_namespace.nspname as schema_name,
      constraint_table.relname as table_name,
      constraint_column.attname as column_name
    from pg_constraint constraint_record
    join pg_class constraint_table
      on constraint_table.oid = constraint_record.conrelid
    join pg_namespace constraint_namespace
      on constraint_namespace.oid = constraint_table.relnamespace
    join unnest(constraint_record.conkey) with ordinality as constraint_key(attnum, position)
      on true
    join unnest(constraint_record.confkey) with ordinality as referenced_key(attnum, position)
      on referenced_key.position = constraint_key.position
    join pg_attribute constraint_column
      on constraint_column.attrelid = constraint_record.conrelid
      and constraint_column.attnum = constraint_key.attnum
    join pg_attribute referenced_column
      on referenced_column.attrelid = constraint_record.confrelid
      and referenced_column.attnum = referenced_key.attnum
    where constraint_record.contype = 'f'
      and constraint_record.confrelid = 'public.bookings'::regclass
      and referenced_column.attname = 'id'
      and cardinality(constraint_record.conkey) = 1
      and cardinality(constraint_record.confkey) = 1
      and constraint_record.confdeltype <> 'c'
  loop
    execute format(
      'delete from %I.%I where %I = $1',
      v_fk.schema_name,
      v_fk.table_name,
      v_fk.column_name
    )
    using p_booking_id;
  end loop;

  if v_booking.discount_code_id is not null
    and to_regclass('public.discount_codes') is not null
  then
    update public.discount_codes discount_code
    set used_count = greatest(coalesce(discount_code.used_count, 0) - 1, 0),
        updated_at = now()
    where discount_code.id = v_booking.discount_code_id
      and coalesce(discount_code.used_count, 0) > 0;
  end if;

  delete from public.bookings booking
  where booking.id = p_booking_id
    and booking.status = 'cancelled';

  if not found then
    raise exception 'Booking could not be deleted permanently.' using errcode = '22023';
  end if;

  return p_booking_id;
end;
$$;

revoke all on function public.delete_booking_permanently_if_owner(uuid) from public;
grant execute on function public.delete_booking_permanently_if_owner(uuid) to authenticated;

notify pgrst, 'reload schema';
