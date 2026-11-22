const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

/** Bytes of a small valid PNG used by the deferred clipboard provider. */
export const png = Uint8Array.from(atob(base64), character => character.charCodeAt(0));
