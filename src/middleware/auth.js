const supabase = require('../supabase');

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Token de autenticación requerido' });
  }

  const token = authHeader.replace('Bearer ', '');

  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }

  const { error: sessionError } = await supabase.auth.setSession({
    access_token: token,
    refresh_token: token,
  });
  if (sessionError) {
    return res.status(401).json({ error: 'Error al establecer sesión' });
  }

  req.user = user;
  next();
}

module.exports = requireAuth;
