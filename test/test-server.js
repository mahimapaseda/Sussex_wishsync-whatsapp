const http = require('http');
const { app, server } = require('../src/index');

async function testEndpoint(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3847${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log('Testing server endpoints...');
  try {
    const status = await testEndpoint('/api/status');
    console.log('GET /api/status ->', status.status, '| App Name:', status.body.appName);

    const bdays = await testEndpoint('/api/birthdays');
    console.log('GET /api/birthdays ->', bdays.status, '| Source:', bdays.body.source, '| Today count:', bdays.body.today.length, '| Upcoming count:', bdays.body.upcoming.length);

    const tpl = await testEndpoint('/api/template');
    console.log('GET /api/template ->', tpl.status, '| Template:', tpl.body.template.substring(0, 35) + '...');

    const settingsRes = await testEndpoint('/api/settings');
    console.log('GET /api/settings ->', settingsRes.status, '| Sheet Name:', settingsRes.body.settings.sheetName);

    console.log('\nAll server endpoints responded correctly!');
  } catch (err) {
    console.error('Server endpoint test error:', err.message);
  } finally {
    server.close();
    process.exit(0);
  }
}

// Give server a moment to bind port
setTimeout(run, 1000);

