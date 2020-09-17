import axios from 'axios';
import { isDropboxFileLink, isGoogleDriveFileLink } from './file_link';

export async function isPublicDropboxFileLink(
  theUrl: string
): Promise<boolean> {
  if (isDropboxFileLink(theUrl)) {
    const response = await axios.get(theUrl);
    return response.status === 301; // to do: check if this status code is right
  }
  return false;
}

export async function isPublicGoogleDriveFileLink(theUrl: string) {
  if (isGoogleDriveFileLink(theUrl)) {
    const response = await axios.get(theUrl);
    return response.status === 200; // to do: check if this status code is right
  }
  return false;
}
