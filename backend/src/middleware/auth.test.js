jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

const jwt = require('jsonwebtoken');
const authMiddleware = require('./auth');

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

describe('auth middleware', () => {
  const originalSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  test('allows requests with a valid bearer token', () => {
    const decodedToken = { userId: 42, email: 'user@example.com' };
    jwt.verify.mockReturnValue(decodedToken);
    const req = { headers: { authorization: 'Bearer valid-token' } };
    const res = createResponse();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret');
    expect(req.user).toEqual(decodedToken);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  test.each([
    ['missing authorization header', undefined],
    ['null authorization header', null],
    ['empty authorization header', ''],
    ['wrong auth scheme', 'Basic valid-token'],
  ])('rejects %s', (_caseName, authorization) => {
    const req = { headers: { authorization } };
    const res = createResponse();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorised: No token provided' });
    expect(jwt.verify).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects an empty bearer token', () => {
    jwt.verify.mockImplementation(() => {
      throw new Error('jwt malformed');
    });
    const req = { headers: { authorization: 'Bearer ' } };
    const res = createResponse();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith('', 'test-secret');
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorised: Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects expired or invalid tokens when jwt verification throws', () => {
    jwt.verify.mockImplementation(() => {
      throw new Error('jwt expired');
    });
    const req = { headers: { authorization: 'Bearer expired-token' } };
    const res = createResponse();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith('expired-token', 'test-secret');
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorised: Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });
});
