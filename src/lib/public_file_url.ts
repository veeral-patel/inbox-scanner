import axios from 'axios';
import Bluebird from 'bluebird';
import { isDropboxFileUrl, isGoogleDriveFileUrl } from './file_url';
import { notEmpty } from './util';

// [Testable]
async function isPublicDropboxFileUrl(theUrl: string): Promise<boolean> {
  if (isDropboxFileUrl(theUrl)) {
    const response = await axios.get(theUrl);
    return response.status === 301;
  }
  return false;
}

// [Testable]
async function isPublicGoogleDriveFileUrl(theUrl: string) {
  if (isGoogleDriveFileUrl(theUrl)) {
    const response = await axios.get(theUrl);
    return response.status === 200;
  }
  return false;
}

// Gets all the public URLs from a list of URLs. [Testable]
export async function getPublicUrls(urls: string[]): Promise<string[]> {
  const publicUrls = await Bluebird.map(urls, (theUrl) => {
    if (isPublicDropboxFileUrl(theUrl) || isPublicGoogleDriveFileUrl(theUrl))
      return theUrl;
    return null;
  });

  return publicUrls.filter(notEmpty);
}
