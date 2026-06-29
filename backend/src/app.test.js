const health = require('./health');

describe('FinSmart API', () => {
  test('health handler returns API status', () => {
    const res = {
      json: jest.fn(),
    };

    health({}, res);

    expect(res.json).toHaveBeenCalledWith({
      status: 'ok',
      app: 'FinSmart',
      timestamp: expect.any(String),
    });
  });
});
