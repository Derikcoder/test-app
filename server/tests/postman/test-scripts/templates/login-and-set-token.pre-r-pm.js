// Request-scoped login helper.
// Use this in a dedicated auth request Pre-request script if needed.

const baseUrl = pm.collectionVariables.get('BASE_URL');
const email = pm.collectionVariables.get('AUTH_EMAIL') || 'john@example.com';
const password = pm.collectionVariables.get('AUTH_PASSWORD') || 'password123';

pm.sendRequest({
  url: baseUrl + '/api/auth/login',
  method: 'POST',
  header: {
    'Content-Type': 'application/json'
  },
  body: {
    mode: 'raw',
    raw: JSON.stringify({ email, password })
  }
}, function (err, res) {
  if (err) {
    console.error('[AUTH] Login request failed:', err);
    return;
  }

  const json = res.json();
  if (json && json.data && json.data.token) {
    pm.collectionVariables.set('AUTH_TOKEN', json.data.token);
    console.log('[AUTH] AUTH_TOKEN set from login response');
  } else {
    console.error('[AUTH] No token found in login response body:', json);
  }
});
