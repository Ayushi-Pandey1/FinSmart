jest.mock('../db', () => ({
  query: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
}));

const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { login } = require('./authController');

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

describe('authController.login', () => {
  const originalSecret = process.env.JWT_SECRET;
  const originalExpiresIn = process.env.JWT_EXPIRES_IN;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRES_IN = '1h';
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalSecret;
    process.env.JWT_EXPIRES_IN = originalExpiresIn;
  });

  test('returns token and user for valid credentials', async () => {
    const user = {
      id: 7,
      email: 'user@example.com',
      password_hash: 'hashed-password',
      first_name: 'Test',
      last_name: 'User',
      monthly_income: '3500.00',
    };
    pool.query.mockResolvedValue({ rows: [user] });
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue('signed-token');
    const req = { body: { email: 'user@example.com', password: 'password123' } };
    const res = createResponse();

    await login(req, res);

    expect(pool.query).toHaveBeenCalledWith('SELECT * FROM users WHERE email = $1', ['user@example.com']);
    expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashed-password');
    expect(jwt.sign).toHaveBeenCalledWith(
      { userId: 7, email: 'user@example.com' },
      'test-secret',
      { expiresIn: '1h' }
    );
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      token: 'signed-token',
      user: {
        id: 7,
        email: 'user@example.com',
        firstName: 'Test',
        lastName: 'User',
        monthlyIncome: '3500.00',
      },
    });
  });

  test.each([
    ['missing email', { password: 'password123' }],
    ['missing password', { email: 'user@example.com' }],
    ['empty email', { email: '', password: 'password123' }],
    ['empty password', { email: 'user@example.com', password: '' }],
    ['null values', { email: null, password: null }],
  ])('returns validation error for %s', async (_caseName, body) => {
    const req = { body };
    const res = createResponse();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Email and password are required' });
    expect(pool.query).not.toHaveBeenCalled();
    expect(bcrypt.compare).not.toHaveBeenCalled();
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  test('returns invalid credentials when user is not found', async () => {
    pool.query.mockResolvedValue({ rows: [] });
    const req = { body: { email: 'missing@example.com', password: 'password123' } };
    const res = createResponse();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid email or password' });
    expect(bcrypt.compare).not.toHaveBeenCalled();
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  test('returns invalid credentials when password does not match', async () => {
    pool.query.mockResolvedValue({
      rows: [{ id: 7, email: 'user@example.com', password_hash: 'hashed-password' }],
    });
    bcrypt.compare.mockResolvedValue(false);
    const req = { body: { email: 'user@example.com', password: 'wrong-password' } };
    const res = createResponse();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid email or password' });
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  test('returns server error when database lookup fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    pool.query.mockRejectedValue(new Error('database unavailable'));
    const req = { body: { email: 'user@example.com', password: 'password123' } };
    const res = createResponse();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Server error during login' });
    expect(console.error).toHaveBeenCalledWith('Login error:', expect.any(Error));
    console.error.mockRestore();
  });
});
