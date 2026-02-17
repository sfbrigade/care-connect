import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const h = React.createElement;

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
  },
  header: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  label: {
    fontSize: 10,
    fontWeight: 'bold',
    width: 120,
  },
  value: {
    fontSize: 10,
    flex: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#666',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

function Field ({ label, value }) {
  return h(View, { style: styles.row },
    h(Text, { style: styles.label }, `${label}:`),
    h(Text, { style: styles.value }, value || 'N/A')
  );
}

function Section ({ title, children }) {
  return h(View, { style: styles.section },
    h(Text, { style: styles.sectionTitle }, title),
    children
  );
}

export default function TestForm ({ data = {} }) {
  const {
    subjectFirstName = 'John',
    subjectLastName = 'Doe',
    dateOfBirth = '1990-01-15',
    caseNumber = '2026-TEST-001',
    officerName = 'Officer Smith',
    badgeNumber = '12345',
    incidentDate = new Date().toLocaleDateString(),
    incidentLocation = '123 Main Street, San Francisco, CA',
    notes = 'This is a test form generated using @react-pdf/renderer. It demonstrates how to create PDF documents using React components.',
  } = data;

  return h(Document, null,
    h(Page, { size: 'LETTER', style: styles.page },
      h(Text, { style: styles.header }, 'Test Transfer Form'),

      h(Section, { title: 'Subject Information' },
        h(Field, { label: 'Last Name', value: subjectLastName }),
        h(Field, { label: 'First Name', value: subjectFirstName }),
        h(Field, { label: 'Date of Birth', value: dateOfBirth })
      ),

      h(Section, { title: 'Case Information' },
        h(Field, { label: 'Case Number', value: caseNumber }),
        h(Field, { label: 'Incident Date', value: incidentDate }),
        h(Field, { label: 'Location', value: incidentLocation })
      ),

      h(Section, { title: 'Officer Information' },
        h(Field, { label: 'Officer Name', value: officerName }),
        h(Field, { label: 'Badge Number', value: badgeNumber })
      ),

      h(Section, { title: 'Notes' },
        h(Text, { style: { fontSize: 10, lineHeight: 1.4 } }, notes)
      ),

      h(View, { style: styles.footer },
        h(Text, null, `Generated: ${new Date().toLocaleString()}`),
        h(Text, null, 'Page 1 of 1')
      )
    )
  );
}
