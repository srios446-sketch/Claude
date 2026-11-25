-- Envío de notificaciones: cada 5 segundos revisa si hay avisos que ya tocan y, solo entonces,
-- llama a la función `enviar-notificaciones`. Requiere en Vault: url_enviar y cron_secret.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule(jobid) from cron.job where jobname in ('evasof-enviar', 'evasof-limpiar');

select cron.schedule('evasof-enviar', '5 seconds', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'url_enviar'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000)
  where exists (select 1 from public.notificaciones where estado = 'pendiente' and enviar_en <= now() + interval '2 seconds');
$$);

select cron.schedule('evasof-limpiar', '17 4 * * *', $$ select public.limpiar_notificaciones(); $$);
