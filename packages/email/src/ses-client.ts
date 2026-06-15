import { SESClient } from "@aws-sdk/client-ses";

const region = process.env.AWS_REGION ?? "eu-central-1";

export const sesClient = new SESClient({ region });
