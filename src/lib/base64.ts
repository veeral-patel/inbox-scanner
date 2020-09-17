// Decodes a base64 encoded string
export function base64Decode(input: string): string {
  let buff = new Buffer(input, 'base64');
  return buff.toString('ascii');
}
