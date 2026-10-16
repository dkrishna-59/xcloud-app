/**
 * Google Drive Integration Service for XCloud Web Application
 * Handles OAuth2 (GIS), Google Picker API, Direct Import, Resumable Export, and Backups.
 */

export const getGoogleClientId = (): string => {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || localStorage.getItem('xcloud_google_client_id') || "550097665326-t6u7sqh1hrvq16tqpobqjhi6d0vju7un.apps.googleusercontent.com";
  }
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "550097665326-t6u7sqh1hrvq16tqpobqjhi6d0vju7un.apps.googleusercontent.com";
};

export const getGoogleApiKey = (): string => {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_GOOGLE_API_KEY || localStorage.getItem('xcloud_google_api_key') || "";
  }
  return process.env.NEXT_PUBLIC_GOOGLE_API_KEY || "";
};

const SCOPES = "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file";

let tokenClient: any = null;
let accessToken: string | null = null;

export const loadGoogleApiScripts = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const isGisLoaded = typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2;
    const isGapiLoaded = typeof window !== 'undefined' && (window as any).gapi?.picker;

    if (isGisLoaded && isGapiLoaded) {
      resolve();
      return;
    }

    if (!document.getElementById('gapi-script')) {
      const scriptGapi = document.createElement('script');
      scriptGapi.id = 'gapi-script';
      scriptGapi.src = 'https://apis.google.com/js/api.js';
      scriptGapi.onload = () => {
        (window as any).gapi.load('picker', {
          callback: () => {
            if ((window as any).google?.accounts?.oauth2) resolve();
          },
          onerror: reject
        });
      };
      scriptGapi.onerror = reject;
      document.body.appendChild(scriptGapi);
    }

    if (!document.getElementById('gis-script')) {
      const scriptGis = document.createElement('script');
      scriptGis.id = 'gis-script';
      scriptGis.src = 'https://accounts.google.com/gsi/client';
      scriptGis.async = true;
      scriptGis.defer = true;
      scriptGis.onload = () => {
        if ((window as any).gapi?.load) {
          (window as any).gapi.load('picker', { callback: () => {} });
        }
        resolve();
      };
      scriptGis.onerror = reject;
      document.body.appendChild(scriptGis);
    }

    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const gisReady = (window as any).google?.accounts?.oauth2;
      const gapiReady = (window as any).gapi?.picker;
      if (gisReady) {
        if (!gapiReady && (window as any).gapi?.load) {
          (window as any).gapi.load('picker', { callback: () => {} });
        }
        clearInterval(interval);
        resolve();
      } else if (attempts > 35) {
        clearInterval(interval);
        reject(new Error("Google Identity Services failed to load. Please check your connection or ad blocker."));
      }
    }, 200);
  });
};

export const getGoogleAccessToken = async (promptConsent: boolean = false): Promise<string> => {
  if (accessToken && !promptConsent) {
    return accessToken;
  }

  if (typeof window !== 'undefined' && !promptConsent) {
    const cached = sessionStorage.getItem('xcloud_gdrive_token');
    if (cached) {
      accessToken = cached;
      return cached;
    }
  }

  await loadGoogleApiScripts();

  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new Error("Missing Google Client ID.");
  }

  return new Promise((resolve, reject) => {
    let attempts = 0;
    const checkGIS = () => {
      const oauth2 = (window as any).google?.accounts?.oauth2;
      if (!oauth2) {
        attempts++;
        if (attempts > 20) {
          reject(new Error("Google Identity Services not loaded yet. Please try again."));
        } else {
          setTimeout(checkGIS, 300);
        }
        return;
      }

      tokenClient = oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: (response: any) => {
          if (response.error) {
            reject(new Error(response.error));
            return;
          }
          accessToken = response.access_token;
          if (typeof window !== 'undefined' && accessToken) {
            sessionStorage.setItem('xcloud_gdrive_token', accessToken);
          }
          resolve(accessToken!);
        },
      });

      tokenClient.requestAccessToken({ prompt: promptConsent ? 'consent' : 'none' });
    };

    checkGIS();
  });
};

export const disconnectGoogleDrive = () => {
  accessToken = null;
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('xcloud_gdrive_token');
  }
  if (tokenClient && accessToken) {
    (window as any).google.accounts.oauth2.revoke(accessToken, () => {
      console.log("[DRIVE] Access token revoked.");
    });
  }
};

export const openGooglePicker = async (
  onSelect: (documents: any[]) => void,
  mimeType: string = '',
  selectFolder: boolean = false
): Promise<void> => {
  await loadGoogleApiScripts();
  const token = await getGoogleAccessToken(false);
  const clientId = getGoogleClientId();
  const apiKey = getGoogleApiKey();

  return new Promise((resolve, reject) => {
    const google = (window as any).google;
    const gapi = (window as any).gapi;

    if (!google || !gapi || !gapi.load) {
      reject(new Error("Google API script not loaded."));
      return;
    }

    gapi.load('picker', {
      callback: () => {
        try {
          const viewId = selectFolder ? 'folders' : 'docs';
          const view = new gapi.picker.View(viewId);
          if (mimeType && !selectFolder) {
            view.setMimeTypes(mimeType);
          }

          const picker = new gapi.picker.PickerBuilder()
            .enableFeature(gapi.picker.Feature.NAV_HIDDEN)
            .enableFeature(selectFolder ? gapi.picker.Feature.SELECT_FOLDERS_ENABLED : gapi.picker.Feature.MULTISELECT_ENABLED)
            .setAppId(clientId.split('-')[0])
            .setOAuthToken(token)
            .addView(view)
            .setDeveloperKey(apiKey)
            .setCallback((data: any) => {
              if (data[gapi.picker.Response.ACTION] === gapi.picker.Action.PICKED) {
                const docs = data[gapi.picker.Response.DOCUMENTS];
                onSelect(docs);
                resolve();
              } else if (data[gapi.picker.Response.ACTION] === gapi.picker.Action.CANCEL) {
                resolve();
              }
            })
            .build();

          picker.setVisible(true);
        } catch (err) {
          reject(err);
        }
      }
    });
  });
};

export const downloadDriveFile = async (fileId: string, mimeType: string): Promise<{ blob: Blob; fileName: string; mimeType: string }> => {
  const token = await getGoogleAccessToken(false);

  let url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  let exportMime = mimeType;

  if (mimeType === 'application/vnd.google-apps.document') {
    exportMime = 'application/pdf';
    url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${exportMime}`;
  } else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
    exportMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${exportMime}`;
  } else if (mimeType === 'application/vnd.google-apps.presentation') {
    exportMime = 'application/pdf';
    url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${exportMime}`;
  }

  const metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,mimeType`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const meta = await metaRes.json();
  let fileName = meta.name || `imported_file_${Date.now()}`;

  if (mimeType === 'application/vnd.google-apps.document' && !fileName.endsWith('.pdf')) fileName += '.pdf';
  if (mimeType === 'application/vnd.google-apps.spreadsheet' && !fileName.endsWith('.xlsx')) fileName += '.xlsx';

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) throw new Error("Failed to download file from Google Drive");
  const blob = await res.blob();
  return { blob, fileName, mimeType: exportMime };
};

export const uploadToGoogleDrive = async (
  fileBlob: Blob,
  fileName: string,
  parentFolderId?: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  const token = await getGoogleAccessToken(false);

  const metadata: any = {
    name: fileName,
  };
  if (parentFolderId && parentFolderId !== 'root') {
    metadata.parents = [parentFolderId];
  }

  const initRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Upload-Content-Type': fileBlob.type || 'application/octet-stream',
      'X-Upload-Content-Length': fileBlob.size.toString(),
    },
    body: JSON.stringify(metadata)
  });

  if (!initRes.ok) throw new Error("Failed to initiate resumable upload to Google Drive");
  const uploadUrl = initRes.headers.get('Location');
  if (!uploadUrl) throw new Error("No upload URL returned from Google Drive");

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', fileBlob.type || 'application/octet-stream');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201) {
        const data = JSON.parse(xhr.responseText);
        resolve(data.id);
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during Google Drive upload"));
    xhr.send(fileBlob);
  });
};

export interface SharedDrive {
  id: string;
  name: string;
  kind: string;
}

export const listSharedDrives = async (): Promise<SharedDrive[]> => {
  const token = await getGoogleAccessToken(false);
  const res = await fetch('https://www.googleapis.com/drive/v3/drives?pageSize=50', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed to list Shared Drives");
  const data = await res.json();
  return data.drives || [];
};

export const fetchNativeDriveFiles = async (): Promise<any[]> => {
  const token = await getGoogleAccessToken(true);
  const res = await fetch('https://www.googleapis.com/drive/v3/files?pageSize=50&q=trashed%3Dfalse&fields=files(id,name,mimeType,size)', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed to fetch Google Drive files");
  const data = await res.json();
  return data.files || [];
};

export const createGoogleWorkspaceFile = async (
  title: string,
  mimeType: 'application/vnd.google-apps.document' | 'application/vnd.google-apps.spreadsheet' | 'application/vnd.google-apps.presentation',
  parentFolderId?: string
): Promise<{ fileId: string; webViewLink: string }> => {
  const token = await getGoogleAccessToken(false);

  const metadata: any = {
    name: title,
    mimeType
  };
  if (parentFolderId && parentFolderId !== 'root') {
    metadata.parents = [parentFolderId];
  }

  const res = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(metadata)
  });

  if (!res.ok) throw new Error("Failed to create Google Workspace file");
  const data = await res.json();

  const metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${data.id}?fields=webViewLink,id`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const meta = await metaRes.json();

  return { fileId: data.id, webViewLink: meta.webViewLink || `https://docs.google.com/file/d/${data.id}/edit` };
};
