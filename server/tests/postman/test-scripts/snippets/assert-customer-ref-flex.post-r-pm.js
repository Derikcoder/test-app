// Handles both populated customer object and raw customer ID string
pm.test('[REF] Service call customer reference matches CUSTOMER_OBJECT_ID', function () {
  const body = pm.response.json();
  pm.expect(body).to.have.property('data');
  pm.expect(body.data).to.have.property('customer');

  const customerId = (typeof body.data.customer === 'object' && body.data.customer !== null)
    ? body.data.customer._id
    : body.data.customer;

  pm.expect(customerId).to.eql(pm.collectionVariables.get('CUSTOMER_OBJECT_ID'));
});
