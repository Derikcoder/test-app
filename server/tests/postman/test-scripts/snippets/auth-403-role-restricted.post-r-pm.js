pm.test('[AUTH-403] Insufficient role is blocked', function () {
  pm.expect(pm.response.code).to.eql(403);
});

pm.test('[AUTH-403] Error message present and readable', function () {
  const responseBodyJson = pm.response.json();
  pm.expect(responseBodyJson).to.have.property('message');
  pm.expect(responseBodyJson.message).to.be.a('string').and.not.empty;
});

pm.test('[AUTH-403] No privileged payload is leaked', function () {
  const responseBodyJson = pm.response.json();
  pm.expect(responseBodyJson).to.not.have.property('data');
  pm.expect(responseBodyJson).to.not.have.property('token');
});
