-- Child attendance is outside the current product scope.
-- Drop the data tables, trigger, and enum without touching organizations, events, or profiles.
drop table if exists public.attendance_closures;
drop table if exists public.attendance_records;

drop function if exists public.reject_closed_attendance_write();
drop type if exists public.attendance_status;
