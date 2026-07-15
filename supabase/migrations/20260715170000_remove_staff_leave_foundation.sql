-- The product does not manage employee leave or statutory annual leave.
-- Remove the previously introduced leave foundation without touching other product data.
drop table if exists public.staff_leave_requests;
drop table if exists public.annual_leave_grants;
drop table if exists public.staff_employment_records;
drop table if exists public.organization_leave_settings;

drop type if exists public.leave_request_status;
drop type if exists public.leave_calculation_basis;
