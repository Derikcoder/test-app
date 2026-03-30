// Requires collection variable: INVOICE_SCHEMA_V1_1
// Store the full JSON schema text from invoice.schema.v1.1.json in that variable.
pm.test('[SCHEMA v1.1] Response matches invoice schema v1.1', function () {
  const schemaText = pm.collectionVariables.get('INVOICE_SCHEMA_V1_1');
  pm.expect(schemaText, 'Missing INVOICE_SCHEMA_V1_1 collection variable').to.be.a('string').and.not.empty;

  let schema;
  try {
    schema = JSON.parse(schemaText);
  } catch (e) {
    throw new Error('INVOICE_SCHEMA_V1_1 is not valid JSON: ' + e.message);
  }

  const body = pm.response.json();
  pm.expect(body).to.have.jsonSchema(schema);
});
