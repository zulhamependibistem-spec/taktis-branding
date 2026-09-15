-- v6: absensi TL (tanpa outlet)
alter table attendance alter column outlet_id drop not null;
create unique index if not exists attendance_tl_user_date_idx
    on attendance (user_id, report_date)
    where outlet_id is null;