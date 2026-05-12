#!/bin/sh
set -e

echo "==> Installing dependencies..."
npm install

echo "==> Generating test/config.json from environment variables..."
node -e "
const cfg = {
  server: process.env.MSSQL_SERVER || 'mssql',
  port: parseInt(process.env.MSSQL_PORT || '1433'),
  username: 'sa',
  password: process.env.MSSQL_SA_PASSWORD,
  database: 'testdb',
  encyption: false,
  tdsVersion: '7_4',
  trustServerCertificate: true,
  useUTC: true,
  connectTimeout: 15000,
  requestTimeout: 15000,
  cancelTimeout: 5000
};
require('fs').writeFileSync('test/config.json', JSON.stringify(cfg, null, 4));
console.log('test/config.json written');
"

echo "==> Running tests..."
npm test
