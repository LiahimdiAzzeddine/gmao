begin;

do $$
declare
  column_record record;
  updated_rows bigint;
  old_origin constant text := 'https://pksyspuplpclinehzjdq.supabase.co';
  new_origin constant text := 'https://gmao.supabase.facilitysolutiongroup.ma';
begin
  for column_record in
    select columns.table_schema, columns.table_name, columns.column_name, columns.udt_name
    from information_schema.columns as columns
    join information_schema.tables as tables
      on tables.table_schema = columns.table_schema
     and tables.table_name = columns.table_name
    where columns.table_schema = 'public'
      and tables.table_type = 'BASE TABLE'
      and columns.udt_name in ('text', '_text', 'json', 'jsonb')
  loop
    if column_record.udt_name = 'text' then
      execute format(
        'update %I.%I set %I = replace(%I, $1, $2) where %I like $3',
        column_record.table_schema,
        column_record.table_name,
        column_record.column_name,
        column_record.column_name,
        column_record.column_name
      ) using old_origin, new_origin, '%' || old_origin || '%';
    elsif column_record.udt_name = '_text' then
      execute format(
        'update %I.%I set %I = array(select replace(value, $1, $2) from unnest(%I) as value) where array_to_string(%I, '''') like $3',
        column_record.table_schema,
        column_record.table_name,
        column_record.column_name,
        column_record.column_name,
        column_record.column_name
      ) using old_origin, new_origin, '%' || old_origin || '%';
    else
      execute format(
        'update %I.%I set %I = replace(%I::text, $1, $2)::%s where %I::text like $3',
        column_record.table_schema,
        column_record.table_name,
        column_record.column_name,
        column_record.column_name,
        column_record.udt_name,
        column_record.column_name
      ) using old_origin, new_origin, '%' || old_origin || '%';
    end if;

    get diagnostics updated_rows = row_count;
    if updated_rows > 0 then
      raise notice 'Replaced legacy Storage URL in %.% (% rows)',
        column_record.table_name,
        column_record.column_name,
        updated_rows;
    end if;
  end loop;
end
$$;

commit;
