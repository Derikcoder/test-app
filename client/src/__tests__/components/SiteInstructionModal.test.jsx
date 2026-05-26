/**
 * @file SiteInstructionModal.test.jsx
 * @description Regression tests for site instruction cost payload separation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SiteInstructionModal from '../../components/SiteInstructionModal';
import api from '../../api/axios';

vi.mock('../../api/axios', () => ({
  default: {
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
  },
}));

const token = 'test-token';
const samplePhoto = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2x9sAAAAASUVORK5CYII=';

const serviceCall = {
  _id: 'sc-123',
  quotation: { quotationNumber: 'QT-000123' },
};

const invoiceSeed = {
  _id: 'inv-1',
  invoiceNumber: 'INV-000001',
  documentType: 'proForma',
  workflowStatus: 'draft',
  title: 'Site Instruction',
  serviceType: 'Preventive Maintenance',
  lineItems: [{ description: 'Service Work', quantity: 1, unitPrice: 0, photos: [samplePhoto, samplePhoto] }],
  partsFulfilmentMode: 'inHouseProcurement',
  partsProcurementCost: 0,
  distanceTravelledKm: 0,
  travelRatePerKm: 8.5,
  travelTimeMinutes: 0,
  procurementDistanceTravelledKm: 0,
  procurementTravelTimeMinutes: 0,
  timeTravelledCost: 0,
  consumablesRate: 0,
  vatRate: 15,
  siteInstruction: {},
};

describe('SiteInstructionModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(api.post).mockResolvedValue({
      data: {
        invoice: invoiceSeed,
      },
    });

    vi.mocked(api.put).mockResolvedValue({
      data: invoiceSeed,
    });
  });

  it('keeps procurement travel inputs separate from call-out travel inputs in save payload', async () => {
    render(
      <SiteInstructionModal
        token={token}
        serviceCall={serviceCall}
        triggerClassName="btn"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /create site instruction/i }));

    const procurementDistanceInput = (await screen.findByText(/procurement distance travelled/i))
      .closest('div')
      .querySelector('input');
    const procurementTimeInput = screen.getByText(/procurement travel time/i)
      .closest('div')
      .querySelector('input');
    const calloutDistanceInput = screen.getByText(/^distance travelled \(km\)$/i)
      .closest('div')
      .querySelector('input');
    const calloutTimeInput = screen.getByText(/^travel time \(minutes\)$/i)
      .closest('div')
      .querySelector('input');

    expect(procurementDistanceInput).toBeTruthy();
    expect(procurementTimeInput).toBeTruthy();
    expect(calloutDistanceInput).toBeTruthy();
    expect(calloutTimeInput).toBeTruthy();

    fireEvent.change(procurementDistanceInput, { target: { value: '120' } });
    fireEvent.change(procurementTimeInput, { target: { value: '240' } });
    fireEvent.change(calloutDistanceInput, { target: { value: '5' } });
    fireEvent.change(calloutTimeInput, { target: { value: '15' } });

    fireEvent.click(screen.getByRole('button', { name: /save draft/i }));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        '/invoices/inv-1',
        expect.objectContaining({
          procurementDistanceTravelledKm: 120,
          procurementTravelTimeMinutes: 240,
          distanceTravelledKm: 5,
          travelTimeMinutes: 15,
          partsProcurementCost: 3620,
        }),
        {
          headers: { Authorization: 'Bearer test-token' },
        }
      );
    });
  });

  it('requires two invoice part photos before allowing another line item', async () => {
    const invoiceSeedWithoutPhotos = {
      ...invoiceSeed,
      lineItems: [{ description: 'Service Work', quantity: 1, unitPrice: 0, photos: [] }],
    };

    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        invoice: invoiceSeedWithoutPhotos,
      },
    });

    render(
      <SiteInstructionModal
        token={token}
        serviceCall={serviceCall}
        triggerClassName="btn"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /create site instruction/i }));

    const addItemButton = await screen.findByRole('button', { name: /add item/i });
    expect(addItemButton).toBeDisabled();

    const photoInput = screen.getByLabelText(/upload photos for invoice part 1/i);

    fireEvent.change(photoInput, {
      target: {
        files: [new File(['photo-one'], 'photo-one.png', { type: 'image/png' })],
      },
    });

    await waitFor(() => {
      expect(addItemButton).toBeDisabled();
    });

    fireEvent.change(photoInput, {
      target: {
        files: [new File(['photo-two'], 'photo-two.png', { type: 'image/png' })],
      },
    });

    await waitFor(() => {
      expect(addItemButton).toBeEnabled();
    });
  });
});
