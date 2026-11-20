const passHash = crypto.createHash('sha256').update(password).digest('hex');

const query = `
  SELECT id, full_name, username, email, role, is_active
  FROM users
  WHERE (username = '${identifier}' OR email = '${identifier}')
    AND password_hash = '${passHash}'
  LIMIT 1;
`;
const result = await pool.query(query);