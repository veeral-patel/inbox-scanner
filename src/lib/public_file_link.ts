import axios from 'axios';
import Bluebird from 'bluebird';
import { isDropboxFileLink, isGoogleDriveFileLink } from './file_link';

export async function isPublicDropboxFileLink(
  theUrl: string
): Promise<boolean> {
  if (isDropboxFileLink(theUrl)) {
    const response = await axios.get(theUrl);
    return response.status === 301;
  }
  return false;
}

export async function isPublicGoogleDriveFileLink(theUrl: string) {
  if (isGoogleDriveFileLink(theUrl)) {
    const response = await axios.get(theUrl);
    return response.status === 200;
  }
  return false;
}

// Gets all the public URLs from a list of URLs
export async function getPublicUrls(urls: string[]): Promise<string[]> {
  const results = await Bluebird.map(urls, (theUrl) => {
    if (
      isPublicDropboxFileLink(theUrl) ||
      isPublicGoogleDriveFileLink(theUrl)
    ) {
      return theUrl;
    }
    return null;
  });

  let publicUrls: string[] = [];
  results.forEach((result) => {
    if (result) publicUrls.push(result);
  });
  return publicUrls;
}
