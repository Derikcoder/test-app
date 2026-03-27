pm.test('[VALIDATION-400] Missing/invalid required fields return 400', function () {
  pm.expect(pm.response.code).to.eql(400);
});

pm.test('[VALIDATION-400] Error payload contains message', function () {
  const responseBodyJson = pm.response.json();
  pm.expect(responseBodyJson).to.have.property('message');
  pm.expect(responseBodyJson.message).to.be.a('string').and.not.empty;
});

pm.test('[VALIDATION-400] Response does not include success data payload', function () {
  const responseBodyJson = pm.response.json();
  pm.expect(responseBodyJson).to.not.have.property('data');
});
