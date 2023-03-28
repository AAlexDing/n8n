import { Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { Delete, Get, Post, RestController } from '@/decorators';
import { AuthenticatedRequest, MFA } from '@/requests';
import type { User } from '@db/entities/User';
import { BadRequestError } from '@/ResponseHelper';
import { MultiFactorAuthService } from '@/MultiFactorAuthService';
import { UserSettings } from 'n8n-core';
import { AES, enc } from 'crypto-js';

const issuer = 'n8n';

@RestController('/mfa')
export class MFAController {
	constructor(
		private userRepository: Repository<User>,
		private mfaService: MultiFactorAuthService,
	) {}

	@Get('/qr')
	async getQRCode(req: AuthenticatedRequest) {
		const { email, id, mfaEnabled } = req.user;

		const { mfaSecret, mfaRecoveryCodes } = await this.getSecretAndRecoveryCodes(id);

		if (mfaEnabled)
			throw new BadRequestError(
				'MFA already enabled. Disable it to generate new secret and recovery codes',
			);

		if (mfaSecret && mfaRecoveryCodes.length) {
			const encryptionKey = await UserSettings.getEncryptionKey();

			const decryptedSecret = AES.decrypt(mfaSecret, encryptionKey).toString(enc.Utf8);

			const decryptedRecoveryCodes = mfaRecoveryCodes.map((code) =>
				AES.decrypt(code, encryptionKey).toString(enc.Utf8),
			);

			const qrCode = this.mfaService.createQrUrlFromSecret({
				secret: decryptedSecret,
				label: email,
			});

			return {
				secret: decryptedSecret,
				recoveryCodes: decryptedRecoveryCodes,
				qrCode,
			};
		}

		const codes = Array.from(Array(10)).map(() => uuid());

		const { secret, url } = this.mfaService.generateSecret({
			issuer,
			label: email,
		});

		const encryptionKey = await UserSettings.getEncryptionKey();

		const encryptedSecret = AES.encrypt(secret, encryptionKey).toString();

		const encryptedRecoveryCodes = codes.map((code) => AES.encrypt(code, encryptionKey).toString());

		await this.userRepository.update(id, {
			mfaSecret: encryptedSecret,
			mfaRecoveryCodes: encryptedRecoveryCodes,
		});

		return {
			secret,
			qrCode: url,
			recoveryCodes: codes,
		};
	}

	@Post('/enable')
	async activateMFA(req: MFA.Activate) {
		const { token = null } = req.body;
		const { id, mfaEnabled } = req.user;

		const { mfaSecret, mfaRecoveryCodes } = await this.getSecretAndRecoveryCodes(id);

		if (!token) throw new BadRequestError('Token is required to enable MFA feature');

		if (mfaEnabled) throw new BadRequestError('MFA already enabled');

		if (!mfaSecret || !mfaRecoveryCodes.length) {
			throw new BadRequestError('Cannot enable MFA without generating secret and recovery codes');
		}

		const encryptionKey = await UserSettings.getEncryptionKey();

		const decryptedSecret = AES.decrypt(mfaSecret, encryptionKey).toString(enc.Utf8);

		const verified = this.mfaService.verifySecret({ secret: decryptedSecret, token, window: 10 });

		if (!verified)
			throw new BadRequestError('MFA token expired. Close the modal and enable MFA again.');

		await this.userRepository.update(id, { mfaEnabled: true });
	}

	@Delete('/disable')
	async disableMFA(req: AuthenticatedRequest) {
		const { id } = req.user;
		await this.userRepository.update(id, {
			mfaEnabled: false,
			mfaSecret: null,
			mfaRecoveryCodes: [],
		});
	}

	@Post('/verify')
	async verifyMFA(req: MFA.Verify) {
		const { id } = req.user;
		const { token } = req.body;

		const { mfaSecret: secret } = await this.getSecretAndRecoveryCodes(id);

		if (!token) throw new BadRequestError('Token is required to enable MFA feature');

		if (!secret) throw new BadRequestError('No MFA secret se for this user');

		const encryptionKey = await UserSettings.getEncryptionKey();

		const decryptedSecret = AES.decrypt(secret, encryptionKey).toString(enc.Utf8);

		const verified = this.mfaService.verifySecret({ secret: decryptedSecret, token });

		if (!verified) throw new BadRequestError('MFA secret could not be verified');
	}

	private async getSecretAndRecoveryCodes(userId: string) {
		return this.userRepository.findOneOrFail({
			where: { id: userId },
			select: ['id', 'mfaSecret', 'mfaRecoveryCodes'],
		});
	}
}
