/**
 * Upload a Live Studio media file (video / image) with real progress. Uses XHR
 * (fetch/server-actions can't report upload progress) against the streaming proxy
 * route `/api/studio/media`, which forwards to Laravel with the admin token.
 */
export function uploadStudioMediaWithProgress(
  file: File,
  onProgress: (fraction: number) => void,
): Promise<{ url: string; name: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/studio/media");
    xhr.setRequestHeader("X-Studio-Upload", "1");

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = (JSON.parse(xhr.responseText) as { data: { url: string; name: string } }).data;
          resolve(data);
        } catch {
          reject(new Error("Réponse invalide du serveur."));
        }
      } else {
        let message = `Échec de l'envoi (HTTP ${xhr.status}).`;
        try {
          message = (JSON.parse(xhr.responseText) as { message?: string }).message ?? message;
        } catch {
          /* keep default */
        }
        reject(new Error(message));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Erreur réseau pendant l'envoi.")));

    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}
