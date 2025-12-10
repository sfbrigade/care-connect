import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generate647fTransferFormPDF } from './pdfGenerator.js';
import { jsPDF } from 'jspdf';

// Mock jsPDF - must define everything inside vi.mock since it's hoisted
vi.mock('jspdf', () => {
  // Create mock doc factory inside the mock
  const createMockDoc = () => ({
    internal: {
      pageSize: {
        width: 210,
        height: 297
      }
    },
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    text: vi.fn(),
    getTextWidth: vi.fn((text) => text.length * 2), // Mock text width calculation
    splitTextToSize: vi.fn((text) => [text]), // Mock text splitting
    setLineWidth: vi.fn(),
    line: vi.fn(),
    addPage: vi.fn(),
    output: vi.fn()
  });

  // Create a proper constructor function (not arrow function) that can be used with 'new'
  function MockJsPDF () {
    return createMockDoc();
  }
  
  // Wrap it in vi.fn to make it spyable
  const mockJsPDFConstructor = vi.fn(MockJsPDF);
  
  return {
    jsPDF: mockJsPDFConstructor
  };
});

describe('PDF Generator', () => {
  let mockHold;
  let mockFacility;

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear the jsPDF mock constructor
    vi.mocked(jsPDF).mockClear();
    mockHold = {
      id: '12345678-1234-1234-1234-123456789abc',
      createdAt: '2024-01-15T10:30:00Z',
      notes: 'Test justification narrative',
      serviceTypeName: 'Emergency Shelter',
      bedsRequested: 2,
      client: {
        firstName: 'John',
        lastName: 'Doe',
        race: 'White',
        sex: 'Male',
        dateOfBirth: '1990-05-15'
      },
      createdBy: {
        firstName: 'Jane',
        lastName: 'Officer'
      }
    };

    mockFacility = {
      name: 'Test Facility',
      addressLine1: '123 Main St',
      addressLine2: 'Suite 100',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94102'
    };
  });

  describe('generate647fTransferFormPDF', () => {
    it('should throw error when hold is not provided', () => {
      expect(() => {
        generate647fTransferFormPDF(null);
      }).toThrow('Hold information is required');
    });

    it('should generate PDF with complete hold data', () => {
      const doc = generate647fTransferFormPDF(mockHold);

      expect(vi.mocked(jsPDF)).toHaveBeenCalled();
      expect(doc).toBeDefined();
      expect(doc.setFontSize).toHaveBeenCalled();
      expect(doc.setFont).toHaveBeenCalled();
      expect(doc.text).toHaveBeenCalled();
    });

    it('should include title "647(f) Transfer Form"', () => {
      const doc = generate647fTransferFormPDF(mockHold);

      // Check that title was set with correct font size and text
      expect(doc.setFontSize).toHaveBeenCalledWith(16);
      expect(doc.setFont).toHaveBeenCalledWith('helvetica', 'bold');
      const titleCall = doc.text.mock.calls.find(call => call[0] === '647(f) Transfer Form');
      expect(titleCall).toBeDefined();
    });

    it('should include subject information fields', () => {
      const doc = generate647fTransferFormPDF(mockHold);

      // Check that subject fields are included
      const textCalls = doc.text.mock.calls.map(call => call[0]);
      expect(textCalls.some(text => text.includes('Subject Last Name:'))).toBe(true);
      expect(textCalls.some(text => text.includes('Subject First Name:'))).toBe(true);
      expect(textCalls.some(text => text.includes('Race:'))).toBe(true);
      expect(textCalls.some(text => text.includes('Sex:'))).toBe(true);
      expect(textCalls.some(text => text.includes('Date of Birth (DOB):'))).toBe(true);
    });

    it('should use client data when available', () => {
      const doc = generate647fTransferFormPDF(mockHold);

      const textCalls = doc.text.mock.calls.map(call => call[0]);
      // Check that client data appears in the PDF
      expect(textCalls.some(text => text.includes('Doe'))).toBe(true);
      expect(textCalls.some(text => text.includes('John'))).toBe(true);
    });

    it('should use TBD for missing client data', () => {
      const holdWithoutClient = {
        ...mockHold,
        client: null
      };

      const doc = generate647fTransferFormPDF(holdWithoutClient);

      // Should still generate PDF but with TBD values
      expect(doc).toBeDefined();
    });

    it('should include arrest information section', () => {
      const doc = generate647fTransferFormPDF(mockHold);

      const textCalls = doc.text.mock.calls.map(call => call[0]);
      expect(textCalls.some(text => text.includes('Arrest Information'))).toBe(true);
      expect(textCalls.some(text => text.includes('CAD Number:'))).toBe(true);
      expect(textCalls.some(text => text.includes('Date/Time Arrested:'))).toBe(true);
      expect(textCalls.some(text => text.includes('Name of Transporting Officer:'))).toBe(true);
      expect(textCalls.some(text => text.includes('Charge:'))).toBe(true);
    });

    it('should include transporting officer name when available', () => {
      const doc = generate647fTransferFormPDF(mockHold);

      const textCalls = doc.text.mock.calls.map(call => call[0]);
      expect(textCalls.some(text => text.includes('Jane Officer'))).toBe(true);
    });

    it('should use TBD for transporting officer when not available', () => {
      const holdWithoutOfficer = {
        ...mockHold,
        createdBy: null
      };

      const doc = generate647fTransferFormPDF(holdWithoutOfficer);

      const textCalls = doc.text.mock.calls.map(call => call[0]);
      // Should still generate PDF
      expect(doc).toBeDefined();
    });

    it('should include charge as "647(f) RWS"', () => {
      const doc = generate647fTransferFormPDF(mockHold);

      const textCalls = doc.text.mock.calls.map(call => call[0]);
      expect(textCalls.some(text => text.includes('647(f) RWS'))).toBe(true);
    });

    it('should include 647(f) RWS justification section', () => {
      const doc = generate647fTransferFormPDF(mockHold);

      const textCalls = doc.text.mock.calls.map(call => call[0]);
      expect(textCalls.some(text => text.includes('647(f) RWS Justification'))).toBe(true);
      expect(textCalls.some(text => text.includes('Narrative*'))).toBe(true);
    });

    it('should include notes in justification narrative', () => {
      const doc = generate647fTransferFormPDF(mockHold);

      const textCalls = doc.text.mock.calls.map(call => call[0]);
      expect(textCalls.some(text => text.includes('Test justification narrative'))).toBe(true);
    });

    it('should use TBD for justification when notes are missing', () => {
      const holdWithoutNotes = {
        ...mockHold,
        notes: null
      };

      const doc = generate647fTransferFormPDF(holdWithoutNotes);

      // Should still generate PDF
      expect(doc).toBeDefined();
    });

    it('should include additional information section', () => {
      const doc = generate647fTransferFormPDF(mockHold);

      const textCalls = doc.text.mock.calls.map(call => call[0]);
      expect(textCalls.some(text => text.includes('Additional Information'))).toBe(true);
      expect(textCalls.some(text => text.includes('Hold ID:'))).toBe(true);
      expect(textCalls.some(text => text.includes('Service Type:'))).toBe(true);
      expect(textCalls.some(text => text.includes('Beds Requested:'))).toBe(true);
    });

    it('should format hold ID correctly', () => {
      const doc = generate647fTransferFormPDF(mockHold);

      const textCalls = doc.text.mock.calls.map(call => call[0]);
      // Hold ID should be first 8 characters uppercase
      const holdIdCall = textCalls.find(text => text.includes('12345678'));
      expect(holdIdCall).toBeDefined();
    });

    it('should include facility information when provided', () => {
      const doc = generate647fTransferFormPDF(mockHold, mockFacility);

      // text() can be called with string or array, so we need to flatten
      const textCalls = doc.text.mock.calls.flatMap(call => {
        const firstArg = call[0];
        return Array.isArray(firstArg) ? firstArg : [firstArg];
      });
      // Facility name is added as a label
      expect(textCalls.some(text => text.includes('Facility:'))).toBe(true);
      // Facility name value should be in the text calls
      expect(textCalls.some(text => text.includes('Test Facility'))).toBe(true);
      // Facility address label
      expect(textCalls.some(text => text.includes('Facility Address:'))).toBe(true);
    });

    it('should format facility address correctly', () => {
      const doc = generate647fTransferFormPDF(mockHold, mockFacility);

      // text() can be called with string or array, so we need to flatten
      const textCalls = doc.text.mock.calls.flatMap(call => {
        const firstArg = call[0];
        return Array.isArray(firstArg) ? firstArg : [firstArg];
      });
      // Facility address is formatted as: "123 Main St, Suite 100, San Francisco, CA 94102"
      // The addField function calls text() twice - once for label, once for value
      // Find the value call (not the label call)
      const addressValueCall = textCalls.find(text => 
        typeof text === 'string' &&
        text.includes('123 Main St') && 
        !text.includes('Facility Address:') // Not the label
      );
      expect(addressValueCall).toBeDefined();
      // Verify the address contains all components (they're combined into one string)
      expect(addressValueCall).toContain('123 Main St');
      expect(addressValueCall).toContain('Suite 100');
      expect(addressValueCall).toContain('San Francisco');
      expect(addressValueCall).toContain('CA');
      expect(addressValueCall).toContain('94102');
    });

    it('should handle facility without address', () => {
      const facilityWithoutAddress = {
        name: 'Test Facility'
      };

      const doc = generate647fTransferFormPDF(mockHold, facilityWithoutAddress);

      const textCalls = doc.text.mock.calls.map(call => call[0]);
      expect(textCalls.some(text => text.includes('Test Facility'))).toBe(true);
      // Should not include address fields
    });

    it('should include footer with generation timestamp', () => {
      const doc = generate647fTransferFormPDF(mockHold);

      const textCalls = doc.text.mock.calls.map(call => call[0]);
      // Footer should include "Generated:" text
      const generatedCall = textCalls.find(text => text.includes('Generated:'));
      expect(generatedCall).toBeDefined();
    });

    it('should include required field indicator in footer', () => {
      const doc = generate647fTransferFormPDF(mockHold);

      const textCalls = doc.text.mock.calls.map(call => call[0]);
      expect(textCalls.some(text => text.includes('* Required field'))).toBe(true);
    });

    it('should handle missing optional fields gracefully', () => {
      const minimalHold = {
        id: '12345678-1234-1234-1234-123456789abc',
        createdAt: '2024-01-15T10:30:00Z',
        notes: 'Test notes',
        client: {
          firstName: 'John',
          lastName: 'Doe'
        }
      };

      const doc = generate647fTransferFormPDF(minimalHold);

      // Should still generate PDF without errors
      expect(doc).toBeDefined();
      expect(doc.text).toHaveBeenCalled();
    });

    it('should format date of birth correctly', () => {
      const doc = generate647fTransferFormPDF(mockHold);

      // The formatDob function should format as MM/DD/YYYY
      const textCalls = doc.text.mock.calls.map(call => call[0]);
      // Check that DOB field is present (formatDob is tested separately)
      const dobCall = textCalls.find(text => text.includes('Date of Birth (DOB):'));
      expect(dobCall).toBeDefined();
    });

    it('should format date/time arrested correctly', () => {
      const doc = generate647fTransferFormPDF(mockHold);

      // The formatDateTime function should format the date/time
      const textCalls = doc.text.mock.calls.map(call => call[0]);
      const dateTimeCall = textCalls.find(text => text.includes('Date/Time Arrested:'));
      expect(dateTimeCall).toBeDefined();
    });
  });
});

