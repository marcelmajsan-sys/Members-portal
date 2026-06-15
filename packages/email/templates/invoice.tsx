import { Heading, Hr, Section, Text } from "@react-email/components";
import * as React from "react";
import { Layout } from "./layout.js";

interface InvoiceEmailProps {
  firstName: string;
  invoiceNumber: string;
  amount: string;
  currency: string;
  dueDate: string;
}

export function InvoiceEmail({
  firstName,
  invoiceNumber,
  amount,
  currency,
  dueDate,
}: InvoiceEmailProps) {
  return (
    <Layout preview={`Račun ${invoiceNumber}`}>
      <Heading as="h1" style={heading}>
        Novi račun
      </Heading>
      <Text style={paragraph}>Poštovani {firstName},</Text>
      <Text style={paragraph}>
        U privitku se nalazi vaš novi račun. Molimo vas da ga podmirите do
        navedenog roka.
      </Text>

      <Section style={invoiceBox}>
        <Text style={invoiceRow}>
          <strong>Broj računa:</strong> {invoiceNumber}
        </Text>
        <Hr style={divider} />
        <Text style={invoiceRow}>
          <strong>Iznos:</strong> {amount} {currency}
        </Text>
        <Hr style={divider} />
        <Text style={invoiceRow}>
          <strong>Rok plaćanja:</strong> {dueDate}
        </Text>
      </Section>

      <Text style={paragraph}>
        Ako imate pitanja u vezi s ovim računom, slobodno nas kontaktirajte.
      </Text>
      <Text style={paragraph}>Srdačan pozdrav,</Text>
      <Text style={paragraph}>Tim eCommerce HR</Text>
    </Layout>
  );
}

const heading: React.CSSProperties = {
  color: "#1B365D",
  fontSize: "28px",
  fontWeight: 700,
  marginBottom: "16px",
};

const paragraph: React.CSSProperties = {
  color: "#333333",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 12px",
};

const invoiceBox: React.CSSProperties = {
  backgroundColor: "#f9f9fb",
  border: "1px solid #e0e0e0",
  borderRadius: "8px",
  padding: "16px 24px",
  margin: "24px 0",
};

const invoiceRow: React.CSSProperties = {
  color: "#333333",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "8px 0",
};

const divider: React.CSSProperties = {
  borderColor: "#e0e0e0",
  margin: "4px 0",
};

export default InvoiceEmail;
