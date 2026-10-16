// Sheet-backed UserRepository: { findByEmail(email: Email value): User | null }.
// Rows come through the shared row cache (about 60 s), so the allowlist is not re-read on every request.
// Users are managed by hand in the sheet, nothing is seeded.
Auth.Persistence.GoogleSheet.UserRepository = {
  SCHEMA: {
    sheetName: 'users',
    headers: ['id', 'email', 'role', 'active', 'created_at', 'updated_at'],
    numericColumns: []
  },

  ACTIVE_FLAG: 'true',

  // Row -> User mapping stays here: sheet columns and flag text are persistence details.
  toUser: function (row) {
    return {
      id: row.id,
      email: Auth.Domain.Email.normalize(row.email),
      role: Auth.Domain.Role.parse(row.role),
      active: String(row.active).trim().toLowerCase() === Auth.Persistence.GoogleSheet.UserRepository.ACTIVE_FLAG
    };
  },

  create: function (source, cache) {
    var table = new SpreadsheetTable(source, Auth.Persistence.GoogleSheet.UserRepository.SCHEMA, cache);
    return {
      findByEmail: function (email) {
        var users = table.readAll().map(Auth.Persistence.GoogleSheet.UserRepository.toUser);
        for (var i = 0; i < users.length; i++) {
          if (Auth.Domain.User.hasEmail(users[i], email)) return users[i];
        }
        return null;
      }
    };
  }
};
