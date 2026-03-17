/**
 * Client-side Firebase Admin operations using service account + Google OAuth2 REST API.
 * Used for operations that require Admin SDK (e.g. deleting users from Firebase Auth).
 * All secrets are read from environment variables — never hardcoded.
 */

const SERVICE_ACCOUNT = {
  client_email: import.meta.env.VITE_FIREBASE_ADMIN_CLIENT_EMAIL as string,
  private_key: (import.meta.env.VITE_FIREBASE_ADMIN_PRIVATE_KEY as string)?.replace(/\\n/g, "\n"),
  project_id: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
};

/** Sign a JWT using the Web Crypto API (RS256) */
async function signJwt(payload: object, privateKeyPem: string): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const encode = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const signingInput = `${encode(header)}.${encode(payload)}`;

  // Import the private key
  const pemBody = privateKeyPem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\n/g, "");
  const binaryDer = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  return `${signingInput}.${sigB64}`;
}

/** Get a Google OAuth2 access token using the service account */
async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: SERVICE_ACCOUNT.client_email,
    scope: "https://www.googleapis.com/auth/firebase https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const jwt = await signJwt(payload, SERVICE_ACCOUNT.private_key);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to get access token: ${err}`);
  }

  const data = await res.json();
  return data.access_token;
}

/**
 * Delete a user from Firebase Authentication using the Admin REST API.
 * @param uid The Firebase Auth UID of the user to delete
 */
export async function deleteAuthUser(uid: string): Promise<void> {
  const accessToken = await getAccessToken();

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${SERVICE_ACCOUNT.project_id}/accounts:delete`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ localId: uid }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to delete auth user: ${err}`);
  }
}
