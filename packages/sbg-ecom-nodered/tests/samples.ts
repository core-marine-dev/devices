/* REAL frames from an SBG ELLIPSE, base64 — each one carved from the committed corpus at
   `packages/sbg-ecom/tests/fixtures/stream-mixed.bin`, where every frame was CRC-checked
   before it was committed.

   Base64 because that is what a flow file and an inject node can carry: neither can hold
   a Buffer, which is exactly why the wrapper accepts base64 on `payload`. */

export const EKF_EULER = '/1oGACAAmGQpnj9gx7t2hfi7KhW4v68bIzu6ASM7galSPdQIAAARRTM='
export const STATUS = '/1oBABoAOCA3nn8ApwDzYQAADyEAANQIAAALAD31AAAtYDM='
export const UTC_TIME = '/1oCABUAOCA3nqcA5wcDHAkmCgAAAAAgUl4MpZIz'
export const SHIP_MOTION = '/1oJAC4A+N0nnukDoEAAAAAAAAAAALDRjjoAAAAAAAAAACOCOjoAAAAAAAAAAKR647kLAAgKMw=='
export const GPS1_POS = '/1oOADkA+N0nnoCwlQA4Tl4M6dRvCBA1REBmlgwZ8swNwEhy+e8B3YJAkPNIQnVxqz91cas/qmDEPxP/////jUkz'
export const GPS1_HDT = '/1oPAB4A+KgbngEAGEteDAAAAAAAADRDAAAAAAAAtEIAAAAA/0wz'

// A real NMEA sentence from the SAME capture, sitting between two binary frames — the
// device emits both on one wire (manual §2.1.4).
export const GGA = '$GPGGA,093809.00,4024.87353533,N,00343.50462837,W,1,20,2.6,603.685,M,50.238,M,,*71\r\n'

// Bytes that cannot start a frame, to prove nothing is dropped silently.
export const JUNK = 'AQID//4='
