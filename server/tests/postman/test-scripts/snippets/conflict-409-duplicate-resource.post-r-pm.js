pm.test('[CONFLICT-409] Duplicate resource is rejected', function () {
  pm.expect(pm.response.code).to.eql(409);
});

pm.test('[CONFLICT-409] Conflict message is returned', function () {
  const responseBodyJson = pm.response.json();
  pm.expect(responseBodyJson).to.have.property('message');
  pm.expect(responseBodyJson.message).to.be.a('string').and.not.empty;
});

pm.test('[CONFLICT-409] Message hints duplicate or conflict cause', function () {
  const responseBodyJson = pm.response.json();
  const message = responseBodyJson.message.toLowerCase();
  pm.expect(message).to.satisfy(function (m) {
    return m.includes('duplicate') || m.includes('already') || m.includes('exists') || m.includes('conflict');
  });
});
