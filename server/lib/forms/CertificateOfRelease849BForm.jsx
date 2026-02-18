import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 50,
    paddingTop: 40,
    paddingBottom: 60,
    fontFamily: 'Times-Roman',
    fontSize: 12,
    lineHeight: 1.6,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Times-Bold',
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: 1,
  },
  paragraph: {
    marginBottom: 4,
  },
  bodyText: {
    fontSize: 12,
    fontFamily: 'Times-Roman',
  },
  // Inline field: underlined value within running text
  fieldInline: {
    fontFamily: 'Times-Bold',
    textDecoration: 'underline',
    fontSize: 12,
  },
  // Blank underline for empty fields
  blankLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#000',
  },
  // Field label (small, underneath a line)
  fieldLabel: {
    fontSize: 8,
    textAlign: 'center',
    color: '#333',
    marginTop: 1,
  },
  // Row containers
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  // Underlined value box
  fieldValue: {
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    minHeight: 16,
    paddingBottom: 1,
    paddingHorizontal: 4,
  },
  fieldValueText: {
    fontSize: 12,
    fontFamily: 'Times-Roman',
  },
  // Legal text block
  legalBlock: {
    marginTop: 12,
    marginBottom: 12,
    paddingLeft: 40,
  },
  legalText: {
    fontSize: 11,
    fontFamily: 'Times-Roman',
    lineHeight: 1.5,
  },
  // Signature area
  signatureSection: {
    marginTop: 24,
  },
  signatureRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  signatureLabel: {
    fontSize: 12,
    fontFamily: 'Times-Roman',
    width: 180,
  },
  signatureLine: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    minHeight: 16,
    paddingBottom: 1,
    paddingHorizontal: 4,
  },
  unitLabel: {
    fontSize: 12,
    fontFamily: 'Times-Roman',
    width: 100,
    textAlign: 'right',
    marginLeft: 8,
  },
  unitLine: {
    width: 100,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    minHeight: 16,
    paddingBottom: 1,
    paddingHorizontal: 4,
  },
  printLabel: {
    fontSize: 8,
    textAlign: 'center',
    color: '#333',
    marginTop: 1,
    marginBottom: 12,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 50,
    right: 50,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 9,
    fontFamily: 'Times-Roman',
  },
  footerUpdate: {
    fontSize: 9,
    fontFamily: 'Times-Roman',
    textAlign: 'right',
  },
});

function formatDate (dateStr) {
  if (!dateStr) return { month: '', date: '', year: '' };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { month: '', date: '', year: '' };
  return {
    month: d.toLocaleString('en-US', { month: 'long' }),
    date: String(d.getDate()),
    year: String(d.getFullYear()),
  };
}

function formatTime (dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function UnderlinedValue ({ value, width, align }) {
  return (
    <View style={[styles.fieldValue, width ? { width } : { flex: 1 }, align ? { alignItems: align } : {}]}>
      <Text style={styles.fieldValueText}>{value || ''}</Text>
    </View>
  );
}

export default function CertificateOfRelease849BForm ({ data = {} }) {
  const {
    subjectName = '',
    detentionDate = null,
    releaseDate = null,
    deputyRankNameStar = '',
    unitIdentifier = '',
  } = data;

  const detention = formatDate(detentionDate);
  const detentionTime = formatTime(detentionDate);
  const release = formatDate(releaseDate);
  const releaseTime = formatTime(releaseDate);

  return (
    <Document>
      <Page size='LETTER' style={styles.page}>
        <Text style={styles.title}>
          SAN FRANCISCO SHERIFF&apos;S DEPARTMENT CERTIFICATE OF RELEASE
        </Text>

        {/* Paragraph 1: detention */}
        <View style={{ marginBottom: 4 }}>
          <View style={styles.row}>
            <Text style={styles.bodyText}>
              As required by the provisions of Penal Code Section 851.6 (as amended by Stats 1975, ch.1117), I hereby certify that the
            </Text>
          </View>
          <View style={[styles.row, { marginTop: 2 }]}>
            <Text style={styles.bodyText}>taking into custody of </Text>
            <UnderlinedValue value={subjectName} />
            <Text style={styles.bodyText}> on </Text>
            <UnderlinedValue value={`${detention.month}  ${detention.date}  ${detention.year}`} width={200} />
            <Text style={styles.bodyText}> at</Text>
          </View>
          <View style={[styles.row, { marginBottom: 0, marginTop: -1 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Subject&apos;s Name</Text>
            </View>
            <View style={{ width: 200 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                <Text style={styles.fieldLabel}>Month</Text>
                <Text style={styles.fieldLabel}>Date</Text>
                <Text style={styles.fieldLabel}>Year</Text>
              </View>
            </View>
            <View style={{ width: 12 }} />
          </View>
        </View>

        <View style={{ marginBottom: 12 }}>
          <View style={styles.row}>
            <UnderlinedValue value={detentionTime} width={80} />
            <Text style={styles.bodyText}> hours by the San Francisco Sheriff&apos;s Department was a detention only, not an arrest.</Text>
          </View>
          <View style={[styles.row, { marginBottom: 0, marginTop: -1 }]}>
            <View style={{ width: 80 }}>
              <Text style={styles.fieldLabel}>Time</Text>
            </View>
          </View>
        </View>

        {/* Paragraph 2: release */}
        <View style={{ marginBottom: 4 }}>
          <View style={styles.row}>
            <UnderlinedValue value={subjectName} />
            <Text style={styles.bodyText}> was released on </Text>
            <UnderlinedValue value={`${release.month}  ${release.date}  ${release.year}  ${releaseTime}`} width={300} />
          </View>
          <View style={[styles.row, { marginBottom: 0, marginTop: -1 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Subject&apos;s Name</Text>
            </View>
            <View style={{ width: 300 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                <Text style={styles.fieldLabel}>Month</Text>
                <Text style={styles.fieldLabel}>Date</Text>
                <Text style={styles.fieldLabel}>Year</Text>
                <Text style={styles.fieldLabel}>Time</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Legal provisions */}
        <View style={{ marginTop: 8, marginBottom: 4 }}>
          <Text style={styles.bodyText}>
            by the San Francisco Sheriff&apos;s Department pursuant to the provisions of:
          </Text>
        </View>
        <View style={styles.legalBlock}>
          <Text style={styles.legalText}>
            paragraph (1) of subdivision (b) of Penal Code Section 849, paragraph (3) of Penal Code Section 849, Penal Code
          </Text>
          <Text style={styles.legalText}>
            Section 849.5, and Penal Code Section 851.6 - pertinent portions of which appear on the reverse of this certificate.
          </Text>
        </View>

        {/* Deputy info */}
        <View style={styles.signatureSection}>
          {/* Deputy Rank, Name & Star# + Unit Identifier */}
          <View style={styles.signatureRow}>
            <Text style={styles.signatureLabel}>Deputy&apos;s Rank, Name &amp; Star#</Text>
            <View style={[styles.signatureLine, { marginRight: 8 }]}>
              <Text style={styles.fieldValueText}>{deputyRankNameStar}</Text>
            </View>
            <Text style={styles.unitLabel}>Unit Identifier:</Text>
            <View style={styles.unitLine}>
              <Text style={styles.fieldValueText}>{unitIdentifier}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', marginBottom: 12 }}>
            <View style={{ width: 180 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.printLabel}>Print</Text>
            </View>
          </View>

          {/* Deputy Signature & Star# */}
          <View style={styles.signatureRow}>
            <Text style={styles.signatureLabel}>Deputy&apos;s Signature &amp; Star#</Text>
            <View style={styles.signatureLine}>
              <Text style={styles.fieldValueText} />
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>White to Citizen</Text>
            <Text style={styles.footerText}>Canary to Central Records &amp; Warrants Unit</Text>
            <View>
              <Text style={styles.footerUpdate}>Pink to Incident Report</Text>
              <Text style={styles.footerUpdate}>Updated 04-22-2019</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
