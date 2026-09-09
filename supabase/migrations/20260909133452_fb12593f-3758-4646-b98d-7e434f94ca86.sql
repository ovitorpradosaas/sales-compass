revoke all on function public.bootstrap_workspace() from public;
revoke all on function public.bootstrap_workspace() from anon;
grant execute on function public.bootstrap_workspace() to authenticated;