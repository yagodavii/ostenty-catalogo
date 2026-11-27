UPDATE admin_users
SET is_admin = 1
WHERE lower(trim(email)) IN (
  'yagodavi012@hotmail.com',
  'juliamendesperes@gmail.com',
  'ostentysemijoiasbr@gmail.com'
);
