# Entities Workspace

Purpose: central place for UAT entity definitions and reusable data templates.

## Structure

- personas/
  - application-management/
  - field-service-agents/
  - customer-types/
- templates/
  - machines/
  - invoice invoiced-details templates

## Recommended Workflow

1. Start with the shared persona template at entities/templates/persona.template.txt.
2. Create or update persona files under entities/personas/.
3. Use machine templates under entities/templates/machines/ when creating service calls.
4. Add scenario-specific files as UAT expands.
5. Use the invoiced-details template to normalize real invoice breakdowns before modeling new services.

## Naming Convention

- Persona files: persona.<group>.<role>.txt
- Machine templates: machine.<category>.<type>.template.txt
- Invoice section templates: invoice.<section>.template.txt

## Canonical Invoice Breakdown

Use [entities/templates/invoice.invoiced-details.template.txt](/home/derick/React Projects/test-app/entities/templates/invoice.invoiced-details.template.txt) as the reference structure for the invoiced-details section under real-world invoices.
