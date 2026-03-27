pm.test('[AUTH-401] Request without token is rejected', function () {
  pm.expect(pm.response.code).to.eql(401);
});

pm.test('[AUTH-401] Error payload contains message', function () {
  const responseBodyJson = pm.response.json();
  pm.expect(responseBodyJson).to.have.property('message');
  pm.expect(responseBodyJson.message).to.be.a('string').and.not.empty;
});

pm.test('[AUTH-401] Error payload does not expose data', function () {
  const responseBodyJson = pm.response.json();
  pm.expect(responseBodyJson).to.not.have.property('data');
});
