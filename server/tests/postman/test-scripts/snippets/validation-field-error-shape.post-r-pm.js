// Generic field-level error shape assertion for 400/422 validation responses.
pm.test('[VALIDATION] Status is 400 or 422', function () {
  pm.expect(pm.response.code).to.be.oneOf([400, 422]);
});

pm.test('[VALIDATION] errors[] has expected field/message shape when present', function () {
  const responseBodyJson = pm.response.json();

  if (responseBodyJson.errors !== undefined) {
    pm.expect(responseBodyJson.errors).to.be.an('array');

    responseBodyJson.errors.forEach(function (err) {
      pm.expect(err).to.be.an('object');
      if (err.field !== undefined) {
        pm.expect(err.field).to.be.a('string').and.not.empty;
      }
      if (err.message !== undefined) {
        pm.expect(err.message).to.be.a('string').and.not.empty;
      }
    });
  }
});
