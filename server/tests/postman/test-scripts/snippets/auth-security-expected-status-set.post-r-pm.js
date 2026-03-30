// Use this for endpoints where you intentionally probe auth/security behavior.
// Expected statuses for this snippet: 401, 403, 409.
pm.test('[SECURITY] Status is one of expected auth/security outcomes', function () {
  pm.expect(pm.response.code).to.be.oneOf([401, 403, 409]);
});

pm.test('[SECURITY] Error payload includes message and excludes data', function () {
  const responseBodyJson = pm.response.json();
  pm.expect(responseBodyJson).to.have.property('message');
  pm.expect(responseBodyJson.message).to.be.a('string').and.not.empty;
  pm.expect(responseBodyJson).to.not.have.property('data');
});
