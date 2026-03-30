pm.test('[AUTH-401] Invalid or expired token is rejected', function () {
  pm.expect(pm.response.code).to.eql(401);
});

pm.test('[AUTH-401] Message indicates token failure', function () {
  const responseBodyJson = pm.response.json();
  pm.expect(responseBodyJson).to.have.property('message');
  pm.expect(responseBodyJson.message.toLowerCase()).to.satisfy(function (m) {
    return m.includes('token') || m.includes('authorized') || m.includes('unauthorized');
  });
});

pm.test('[AUTH-401] Response time remains acceptable', function () {
  pm.expect(pm.response.responseTime).to.be.below(3000);
});
