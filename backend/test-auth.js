const http = require('http');

const request = (path, data) => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 3000,
        path: path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          resolve(JSON.parse(body));
        });
      }
    );
    req.on('error', (e) => reject(e));
    req.write(postData);
    req.end();
  });
};

async function runTests() {
  const timestamp = Date.now();
  const phone = `99${timestamp.toString().substring(5)}`; // 10 digit
  const email = `testuser${timestamp}@example.com`;
  const name = `testuser_${timestamp}`;
  const password = 'Password123!';

  console.log('--- Registering User ---');
  try {
    const data = await request('/api/auth/register', { name, email, phone, password, role: 'customer' });
    console.log('Registration:', data);
    
    if(!data.success) {
      console.log('Registration failed, aborting test.');
      return;
    }
    
    console.log('\n--- Testing Email Login ---');
    let emailLogin = await request('/api/auth/login', { identifier: email, password, role: 'customer' });
    console.log('Email Login:', emailLogin.success, emailLogin.message || 'OK');

    console.log('\n--- Testing Phone Login ---');
    let phoneLogin = await request('/api/auth/login', { identifier: phone, password, role: 'customer' });
    console.log('Phone Login:', phoneLogin.success, phoneLogin.message || 'OK');

    console.log('\n--- Testing Username Login ---');
    let nameLogin = await request('/api/auth/login', { identifier: name, password, role: 'customer' });
    console.log('Username Login:', nameLogin.success, nameLogin.message || 'OK');

    console.log('\n✅ All tests complete.');
  } catch(e) {
    console.error('Test error:', e);
  }
}
runTests();
