-- handle_new_user sadece trigger tarafından çalıştırılmalı, API'den değil.
-- Postgres yeni fonksiyonlara varsayılan olarak "herkes çalıştırabilir" (public) izni verir;
-- Supabase ayrıca anon ve authenticated rollerine de verir. Üçünden de geri alıyoruz.
-- Trigger yine çalışır: trigger'lar bu izinden bağımsız olarak tetiklenir.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
