import { Heading, Text } from "@react-email/components";
import * as React from "react";
import { Layout } from "./layout.js";

interface WelcomeEmailProps {
  firstName: string;
}

export function WelcomeEmail({ firstName }: WelcomeEmailProps) {
  return (
    <Layout preview={`Dobrodošli, ${firstName}!`}>
      <Heading as="h1" style={heading}>
        Dobrodošli!
      </Heading>
      <Text style={paragraph}>Poštovani {firstName},</Text>
      <Text style={paragraph}>
        Hvala vam što ste se pridružili udruzi eCommerce Hrvatska. Vaš račun je
        uspješno kreiran i spremni ste za početak.
      </Text>
      <Text style={paragraph}>
        Ako imate bilo kakvih pitanja, slobodno nas kontaktirajte.
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

export default WelcomeEmail;
