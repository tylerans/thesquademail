// Google Drive Picker integration
// Requires VITE_GOOGLE_CLIENT_ID and VITE_GOOGLE_API_KEY in .env

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY as string | undefined;
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

let gapiLoaded = false;
let gisLoaded = false;
let tokenClient: any = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

async function ensureGapiLoaded(): Promise<void> {
  if (gapiLoaded) return;
  await loadScript('https://apis.google.com/js/api.js');
  await new Promise<void>((resolve) => window.gapi.load('client:picker', resolve));
  await window.gapi.client.init({ apiKey: API_KEY, discoveryDocs: [] });
  gapiLoaded = true;
}

async function ensureGisLoaded(): Promise<void> {
  if (gisLoaded) return;
  await loadScript('https://accounts.google.com/gsi/client');
  gisLoaded = true;
}

async function getAccessToken(): Promise<string> {
  await ensureGisLoaded();
  return new Promise((resolve, reject) => {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID!,
      scope: SCOPES,
      callback: (resp: any) => {
        if (resp.error) reject(new Error(resp.error));
        else resolve(resp.access_token);
      },
    });
    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  url: string;
}

export async function openDrivePicker(): Promise<DriveFile[]> {
  if (!CLIENT_ID || !API_KEY) {
    throw new Error(
      'Google Drive is not configured. Add VITE_GOOGLE_CLIENT_ID and VITE_GOOGLE_API_KEY to your environment variables.'
    );
  }

  await ensureGapiLoaded();
  const accessToken = await getAccessToken();

  return new Promise((resolve) => {
    const picker = new window.google.picker.PickerBuilder()
      .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
      .setOAuthToken(accessToken)
      .setDeveloperKey(API_KEY!)
      .setCallback((data: any) => {
        if (data.action === window.google.picker.Action.PICKED) {
          const files: DriveFile[] = data.docs.map((doc: any) => ({
            id: doc.id,
            name: doc.name,
            mimeType: doc.mimeType,
            url: doc.url,
          }));
          resolve(files);
        } else if (data.action === window.google.picker.Action.CANCEL) {
          resolve([]);
        }
      })
      .addView(window.google.picker.ViewId.DOCS)
      .build();

    picker.setVisible(true);
  });
}

export function isDriveConfigured(): boolean {
  return !!(CLIENT_ID && API_KEY);
}
