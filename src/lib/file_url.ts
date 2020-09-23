// Gets the URLs that look like cloud based file urls. [Not testing]
export function getFileUrls(urls: string[]): string[] {
  return urls.filter(
    (theUrl) => isGoogleDriveFileUrl(theUrl) || isDropboxFileUrl(theUrl)
  );
}

// Outputs whether an URL is a Google Drive file url by simply checking
// if the URL contains one of a few substrings. [Testable]
export function isGoogleDriveFileUrl(theUrl: string): boolean {
  return [
    'drive.google.com',
    'docs.google.com',
    'sheets.google.com',
    'forms.google.com',
    'slides.google.com',
  ].some((host) => theUrl.includes(host) && theUrl !== host);
}

// Outputs whether an URL is a Dropbox file url by simply checking
// if the URL contains one of a few substrings. [Testable]
export function isDropboxFileUrl(theUrl: string): boolean {
  return ['dropbox.com/s/', 'dropbox.com/scl/'].some(
    (host) => theUrl.includes(host) && theUrl !== host
  );
}
