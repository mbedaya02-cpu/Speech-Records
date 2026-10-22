/**
 * Auth.gs — username/password login, salted password hashes, session tokens.
 */

var SESSION_SECONDS = 21600; // 6 hours (CacheService maximum)

var Auth = {
  hash: function (salt, password) {
    var h = salt + '|' + password;
    for (var i = 0; i < 500; i++) {
      var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h, Utilities.Charset.UTF_8);
      h = bytes.map(function (b) { var v = (b < 0 ? b + 256 : b).toString(16); return v.length === 1 ? '0' + v : v; }).join('');
    }
    return h;
  },
  setPassword: function (user, password) {
    if (!password || String(password).length < 8) throw apiError(400, 'Password too short.', { password: { message: 'كلمة المرور 8 أحرف على الأقل' } });
    user.salt = Utilities.getUuid();
    user.passHash = Auth.hash(user.salt, String(password));
  },
  findByIdentity: function (identity) {
    identity = String(identity || '').trim().toLowerCase();
    if (!identity) return null;
    var users = Db.all('users');
    for (var i = 0; i < users.length; i++) {
      var u = users[i];
      if (String(u.username || '').toLowerCase() === identity || (u.email && String(u.email).toLowerCase() === identity)) return u;
    }
    return null;
  },
  login: function (identity, password) {
    var u = Auth.findByIdentity(identity);
    if (!u || !u.passHash || Auth.hash(u.salt, String(password || '')) !== u.passHash || u.active !== true) {
      Utilities.sleep(400); // slow down guessing
      throw apiError(400, 'Failed to authenticate.');
    }
    var token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
    CacheService.getScriptCache().put('s_' + token, u.id, SESSION_SECONDS);
    return { token: token, user: u };
  },
  userFromToken: function (token) {
    if (!token) return null;
    var cache = CacheService.getScriptCache();
    var id = cache.get('s_' + token);
    if (!id) return null;
    var u = Db.get('users', id);
    if (!u || u.active !== true) return null;
    cache.put('s_' + token, id, SESSION_SECONDS); // sliding expiry
    return u;
  },
  logout: function (token) { if (token) CacheService.getScriptCache().remove('s_' + token); },
};
