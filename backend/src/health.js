function health(req, res) {
  res.json({ status: 'ok', app: 'FinSmart', timestamp: new Date().toISOString() });
}

module.exports = health;
