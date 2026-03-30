// Generate reusable run identifiers for unique payload fields
const ts = Date.now();
pm.collectionVariables.set('TS', String(ts));
pm.collectionVariables.set('RUN_ID', 'RUN-' + ts);
pm.collectionVariables.set('CUSTOMER_ID_QA', 'CUST-QA-' + ts);
pm.collectionVariables.set('INVOICE_NUMBER_QA', 'INV-QA-' + ts);

console.log('[PRE] TS:', pm.collectionVariables.get('TS'));
console.log('[PRE] RUN_ID:', pm.collectionVariables.get('RUN_ID'));
