// Save IDs for chained tests
const body = pm.response.json();

pm.test('[CHAIN] Response has _id', function () {
  pm.expect(body).to.have.property('data');
  pm.expect(body.data).to.have.property('_id');
});

if (body.data && body.data._id) {
  // Use this in customer-create requests
  if (pm.info.requestName.toLowerCase().includes('customer')) {
    pm.collectionVariables.set('CUSTOMER_OBJECT_ID', body.data._id);
    console.log('[CHAIN] CUSTOMER_OBJECT_ID set to:', body.data._id);
  }

  // Use this in service-call-create requests
  if (pm.info.requestName.toLowerCase().includes('service call')) {
    pm.collectionVariables.set('SERVICE_CALL_ID', body.data._id);
    console.log('[CHAIN] SERVICE_CALL_ID set to:', body.data._id);
  }
}
