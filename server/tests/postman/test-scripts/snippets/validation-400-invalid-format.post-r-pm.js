pm.test('[VALIDATION-400] Invalid format returns 400', function () {
  pm.expect(pm.response.code).to.eql(400);
});

pm.test('[VALIDATION-400] Error message hints validation/format issue', function () {
  const responseBodyJson = pm.response.json();
  pm.expect(responseBodyJson).to.have.property('message');
  const message = responseBodyJson.message.toLowerCase();
  pm.expect(message).to.satisfy(function (m) {
    return m.includes('invalid') || m.includes('format') || m.includes('required') || m.includes('validation');
  });
});

pm.test('[VALIDATION-400] Response time remains acceptable', function () {
  pm.expect(pm.response.responseTime).to.be.below(3000);
});
