pm.test('[VALIDATION-422] Semantically invalid payload returns 422', function () {
  pm.expect(pm.response.code).to.eql(422);
});

pm.test('[VALIDATION-422] Error payload contains message', function () {
  const responseBodyJson = pm.response.json();
  pm.expect(responseBodyJson).to.have.property('message');
  pm.expect(responseBodyJson.message).to.be.a('string').and.not.empty;
});

pm.test('[VALIDATION-422] Optional errors array shape is valid when present', function () {
  const responseBodyJson = pm.response.json();
  if (responseBodyJson.errors !== undefined) {
    pm.expect(responseBodyJson.errors).to.be.an('array');
  }
});
