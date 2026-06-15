import { Button, Heading, Text } from "@react-email/components";
import * as React from "react";
import { Layout } from "./layout.js";

interface PasswordResetEmailProps {
  firstName: string;
  resetUrl: string;
}

export function PasswordResetEmail({
  firstName,
  resetUrl,
}: PasswordResetEmailProps) {
  return (
    <Layout preview="Zahtjev za promjenu lozinke">
      <Heading as="h1" style={heading}>
        Promjena lozinke
      </Heading>
      <Text style={paragraph}>Poštovani {firstName},</Text>
      <Text style={paragraph}>
        Primili smo zahtjev za promjenu lozinke vašeg računa. Kliknite na gumb
        ispod kako biste postavili novu lozinku.
      </Text>

      <Button href={resetUrl} style={button}>
        Promijeni lozinku
      </Button>

      <Text style={paragraph}>
        Ako niste zatražili promjenu lozinke, možete zanemariti ovu poruku. Vaša
        lozinka neće biti promijenjena.
      </Text>
      <Text style={smallText}>
        Poveznica vrijedi 60 minuta. Nakon toga, morat ćete zatražiti novu
        promjenu lozinke.
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

const button: React.CSSProperties = {
  backgroundColor: "#1B365D",
  borderRadius: "6px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "15px",
  fontWeight: 600,
  padding: "12px 32px",
  textDecoration: "none",
  textAlign: "center" as const,
  margin: "16px 0 24px",
};

const smallText: React.CSSProperties = {
  color: "#8c8c8c",
  fontSize: "13px",
  lineHeight: "20px",
  margin: "0 0 12px",
};

export default PasswordResetEmail;
