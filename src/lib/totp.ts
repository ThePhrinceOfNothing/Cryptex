import * as OTPAuth from 'otpauth';

export interface TOTPInfo {
  token: string;
  secondsRemaining: number;
}

/**
 * Generates a TOTP token and calculates the remaining seconds in the current 30-second epoch.
 */
export const getTOTP = (secret: string): TOTPInfo | null => {
  try {
    // Basic cleanup of the secret (removing spaces, converting to uppercase)
    const cleanSecret = secret.replace(/\s+/g, '').toUpperCase();
    
    const totp = new OTPAuth.TOTP({
      issuer: 'Cryptex Vault',
      label: 'Account',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(cleanSecret),
    });

    const token = totp.generate();
    
    // Calculate how many seconds remain in this 30s epoch
    const now = Math.floor(Date.now() / 1000);
    const secondsRemaining = 30 - (now % 30);

    return { token, secondsRemaining };
  } catch (err) {
    console.error("Invalid TOTP secret:", err);
    return null;
  }
};

