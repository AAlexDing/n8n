import { Service } from 'typedi';
import * as speakeasy from 'speakeasy';

@Service()
export class MultiFactorAuthService {
	createQrUrlFromSecret(data: { secret: string; label?: string }) {
		return speakeasy.otpauthURL({
			secret: data.secret,
			label: data.label ?? '',
			encoding: 'base32',
		});
	}

	generateSecret(data: { issuer?: string; label: string }) {
		const { base32, otpauth_url } = speakeasy.generateSecret({
			issuer: data.issuer ?? '',
			name: data.label,
			otpauth_url: true,
		});
		return {
			secret: base32,
			url: otpauth_url,
		};
	}

	verifySecret({ secret, token, window = 0 }: { secret: string; token: string; window: number }) {
		return speakeasy.totp.verify({
			secret,
			token,
			encoding: 'base32',
			window,
		});
	}

	generateMfaOneTimeToken(data: { secret: string }) {
		return speakeasy.totp({
			secret: data.secret,
			encoding: 'base32',
		});
	}
}
