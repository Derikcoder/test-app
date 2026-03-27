// Basic status and payload shape checks
pm.test('[BASE] Status is success (200/201)', function () {
  pm.expect(pm.response.code).to.be.oneOf([200, 201]);
});

pm.test('[BASE] Response has data object or array', function () {
  const body = pm.response.json();
  pm.expect(body).to.have.property('data');
  pm.expect(body.data).to.satisfy((v) => Array.isArray(v) || (v && typeof v === 'object'));
});
