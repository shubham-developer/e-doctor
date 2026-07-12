import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BUCKET = process.env.B2_BUCKET_NAME!;

let client: S3Client | null = null;

function getClient(): S3Client {
  if (client) return client;
  const rawEndpoint = process.env.B2_ENDPOINT ?? "";
  const endpoint = /^https?:\/\//.test(rawEndpoint)
    ? rawEndpoint
    : `https://${rawEndpoint}`;
  client = new S3Client({
    endpoint,
    region: process.env.B2_REGION,
    credentials: {
      accessKeyId: process.env.B2_KEY_ID!,
      secretAccessKey: process.env.B2_APPLICATION_KEY!,
    },
  });
  return client;
}

export async function uploadObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function deleteObject(key: string): Promise<void> {
  await getClient().send(
    new DeleteObjectCommand({ Bucket: BUCKET, Key: key }),
  );
}

export async function getSignedFileUrl(
  key: string,
  opts: {
    filename?: string;
    contentType?: string;
    download?: boolean;
    expiresIn?: number;
  } = {},
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ...(opts.filename && {
      ResponseContentDisposition: `${opts.download ? "attachment" : "inline"}; filename="${encodeURIComponent(opts.filename)}"`,
    }),
    ...(opts.contentType && { ResponseContentType: opts.contentType }),
  });
  return getSignedUrl(getClient(), command, {
    expiresIn: opts.expiresIn ?? 300,
  });
}
