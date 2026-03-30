// Use when endpoint may return either 400 or 422 depending on validator layer.
pm.test('[VALIDATION] Status is 400 or 422', function () {
  pm.expect(pm.response.code).to.be.oneOf([400, 422]);
});

pm.test('[VALIDATION] Error payload has message and no data', function () {
  const responseBodyJson = pm.response.json();
  pm.expect(responseBodyJson).to.have.property('message');
  pm.expect(responseBodyJson.message).to.be.a('string').and.not.empty;
  pm.expect(responseBodyJson).to.not.have.property('data');
});
