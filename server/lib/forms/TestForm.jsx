import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

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
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}:</Text>
      <Text style={styles.value}>{value || 'N/A'}</Text>
    </View>
  );
}

function Section ({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
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

  return (
    <Document>
      <Page size='LETTER' style={styles.page}>
        <Text style={styles.header}>Test Transfer Form</Text>

        <Section title='Subject Information'>
          <Field label='Last Name' value={subjectLastName} />
          <Field label='First Name' value={subjectFirstName} />
          <Field label='Date of Birth' value={dateOfBirth} />
        </Section>

        <Section title='Case Information'>
          <Field label='Case Number' value={caseNumber} />
          <Field label='Incident Date' value={incidentDate} />
          <Field label='Location' value={incidentLocation} />
        </Section>

        <Section title='Officer Information'>
          <Field label='Officer Name' value={officerName} />
          <Field label='Badge Number' value={badgeNumber} />
        </Section>

        <Section title='Notes'>
          <Text style={{ fontSize: 10, lineHeight: 1.4 }}>{notes}</Text>
        </Section>

        <View style={styles.footer}>
          <Text>Generated: {new Date().toLocaleString()}</Text>
          <Text>Page 1 of 1</Text>
        </View>
      </Page>
    </Document>
  );
}
