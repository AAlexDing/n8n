import type { IExecuteFunctions } from 'n8n-core';
import type {
	IBinaryKeyData,
	IDataObject,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { jsonParse, NodeOperationError } from 'n8n-workflow';
import { updateDisplayOptions } from '../../../../../utils/utilities';
import { discordApiMultiPartRequest, discordApiRequest } from '../../transport';
import { textChannelRLC, userRLC } from '../common.description';

import FormData from 'form-data';
import { isEmpty } from 'lodash';
import { parseDiscordError, prepareErrorData } from '../../helpers/utils';

const embedFields: INodeProperties[] = [
	{
		displayName: 'Author',
		name: 'author',
		type: 'string',
		default: '',
		description: 'The name of the author',
		placeholder: 'e.g. John Doe',
	},
	{
		displayName: 'Color',
		name: 'color',
		// eslint-disable-next-line n8n-nodes-base/node-param-color-type-unused
		type: 'string',
		default: '',
		description: 'Color code of the embed',
		placeholder: 'e.g. 12123432',
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		default: '',
		description: 'The description of embed',
		placeholder: 'e.g. My description',
		typeOptions: {
			rows: 2,
		},
	},
	{
		displayName: 'Timestamp',
		name: 'timestamp',
		type: 'string',
		default: '',
		description: 'The time displayed at the bottom of the embed. Provide in ISO8601 format.',
		placeholder: 'e.g. 2023-02-08 09:30:26',
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		description: 'The title of embed',
		placeholder: "e.g. Embed's title",
	},
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		default: '',
		description: 'The URL where you want to link the embed to',
		placeholder: 'e.g. https://discord.com/',
	},
	{
		displayName: 'URL Image',
		name: 'image',
		type: 'string',
		default: '',
		description: 'Source URL of image (only supports http(s) and attachments)',
		placeholder: 'e.g. https://example.com/image.png',
	},
	{
		displayName: 'URL Thumbnail',
		name: 'thumbnail',
		type: 'string',
		default: '',
		description: 'Source URL of thumbnail (only supports http(s) and attachments)',
		placeholder: 'e.g. https://example.com/image.png',
	},
	{
		displayName: 'URL Video',
		name: 'video',
		type: 'string',
		default: '',
		description: 'Source URL of video',
		placeholder: 'e.g. https://example.com/video.mp4',
	},
];

export const embedFieldsDescription = updateDisplayOptions(
	{
		show: {
			inputMethod: ['fields'],
		},
	},
	embedFields,
);

const properties: INodeProperties[] = [
	{
		displayName: 'Send To',
		name: 'sendTo',
		type: 'options',
		options: [
			{
				name: 'User',
				value: 'user',
			},
			{
				name: 'Channel',
				value: 'channel',
			},
		],
		default: 'channel',
		description: 'Send message to a channel or DM to a user',
	},

	{
		...userRLC,
		displayOptions: {
			show: {
				sendTo: ['user'],
			},
		},
	},
	{
		...textChannelRLC,
		displayOptions: {
			show: {
				sendTo: ['channel'],
			},
		},
	},
	{
		displayName: 'Content',
		name: 'content',
		type: 'string',
		default: '',
		required: true,
		description: 'The content of the message (up to 2000 characters)',
		placeholder: 'e.g. My message',
		typeOptions: {
			rows: 2,
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Flags',
				name: 'flags',
				type: 'multiOptions',
				default: [],
				description:
					'Message flags. <a href="https://discord.com/developers/docs/resources/channel#message-object-message-flags" target="_blank">More info</a>.”.',
				options: [
					{
						name: 'Suppress Embeds',
						value: 'SUPPRESS_EMBEDS',
					},
					{
						name: 'Suppress Notifications',
						value: 'SUPPRESS_NOTIFICATIONS',
					},
				],
			},
			{
				displayName: 'Message Reference ID',
				name: 'message_reference',
				type: 'string',
				default: '',
				description: 'Fill this to make your message a reply',
				placeholder: 'e.g. 1059467601836773386',
			},
			{
				displayName: 'Text-to-Speech (TTS)',
				name: 'tts',
				type: 'boolean',
				default: false,
				description: 'Whether to have a bot reading the message directly in the channel',
			},
		],
	},
	{
		displayName: 'Embeds',
		name: 'embeds',
		type: 'fixedCollection',
		placeholder: 'Add Embeds',
		typeOptions: {
			multipleValues: true,
		},
		default: [],
		options: [
			{
				displayName: 'Values',
				name: 'values',
				values: [
					{
						displayName: 'Input Method',
						name: 'inputMethod',
						type: 'options',
						options: [
							{
								name: 'Enter Fields',
								value: 'fields',
							},
							{
								name: 'Raw JSON',
								value: 'json',
							},
						],
						default: 'json',
					},
					{
						displayName: 'JSON',
						name: 'json',
						type: 'json',
						default: [],
						typeOptions: {
							rows: 2,
						},
						displayOptions: {
							show: {
								inputMethod: ['json'],
							},
						},
					},
					...embedFieldsDescription,
				],
			},
		],
	},
	{
		displayName: 'Files',
		name: 'files',
		type: 'fixedCollection',
		placeholder: 'Add Files',
		typeOptions: {
			multipleValues: true,
		},
		default: [],
		options: [
			{
				displayName: 'Values',
				name: 'values',
				values: [
					{
						displayName: 'Input Data Field Name',
						name: 'inputFieldName',
						type: 'string',
						default: 'data',
						description: 'The contents of the file being sent with the message',
						placeholder: 'e.g. data',
						hint: 'The name of the input field containing the binary file data to be sent',
					},
				],
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['message'],
		operation: ['send'],
	},
	hide: {
		authentication: ['webhook'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

function prepareOptions(options: IDataObject, guildId: string) {
	if (options.flags) {
		if ((options.flags as string[]).length === 2) {
			options.flags = (1 << 2) + (1 << 12);
		} else if ((options.flags as string[]).includes('SUPPRESS_EMBEDS')) {
			options.flags = 1 << 2;
		} else if ((options.flags as string[]).includes('SUPPRESS_NOTIFICATIONS')) {
			options.flags = 1 << 12;
		}
	}

	if (options.message_reference) {
		options.message_reference = {
			message_id: options.message_reference,
			guild_id: guildId,
		};
	}

	return options;
}

function prepareEmbeds(this: IExecuteFunctions, embeds: IDataObject[]) {
	return embeds
		.map((embed) => {
			if (embed.inputMethod === 'json') {
				if (typeof embed.json === 'object') {
					return embed.json;
				}
				try {
					return jsonParse(embed.json as string);
				} catch (error) {
					throw new NodeOperationError(this.getNode(), 'Not a valid JSON', error);
				}
			}

			const embedReturnData: IDataObject = {};

			delete embed.inputMethod;

			for (const key of Object.keys(embed)) {
				if (embed[key] !== '') {
					embedReturnData[key] = embed[key];
				}
			}

			if (embedReturnData.author) {
				embedReturnData.author = {
					name: embedReturnData.author,
				};
			}
			if (embedReturnData.video) {
				embedReturnData.video = {
					url: embedReturnData.video,
					width: 1270,
					height: 720,
				};
			}
			if (embedReturnData.thumbnail) {
				embedReturnData.thumbnail = {
					url: embedReturnData.thumbnail,
				};
			}
			if (embedReturnData.image) {
				embedReturnData.image = {
					url: embedReturnData.image,
				};
			}

			return embedReturnData.filter;
		})
		.filter((embed) => !isEmpty(embed));
}

async function prepareMultiPartForm(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
	files: IDataObject[],
	jsonPayload: IDataObject,
	i: number,
) {
	const multiPartBody = new FormData();
	const attachments: IDataObject[] = [];
	const filesData: IDataObject[] = [];

	for (const [index, file] of files.entries()) {
		const binaryData = (items[i].binary as IBinaryKeyData)?.[file.inputFieldName as string];

		if (!binaryData) {
			throw new NodeOperationError(
				this.getNode(),
				`Input item [${i}] does not contain binary data on property ${file.inputFieldName}`,
			);
		}
		attachments.push({
			id: index,
			filename: binaryData.fileName,
		});
		filesData.push({
			data: await this.helpers.getBinaryDataBuffer(i, file.inputFieldName as string),
			name: binaryData.fileName,
			mime: binaryData.mimeType,
		});
	}

	multiPartBody.append('payload_json', JSON.stringify({ ...jsonPayload, attachments }), {
		contentType: 'application/json',
	});

	for (const [index, binaryData] of filesData.entries()) {
		multiPartBody.append(`files[${index}]`, binaryData.data, {
			contentType: binaryData.name as string,
			filename: binaryData.mime as string,
		});
	}

	return multiPartBody;
}

export async function execute(
	this: IExecuteFunctions,
	guildId: string,
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];
	const items = this.getInputData();

	for (let i = 0; i < items.length; i++) {
		const content = this.getNodeParameter('content', i) as string;
		const options = prepareOptions(this.getNodeParameter('options', i, {}), guildId);

		const embeds = (this.getNodeParameter('embeds', i, undefined) as IDataObject)
			?.values as IDataObject[];
		const files = (this.getNodeParameter('files', i, undefined) as IDataObject)
			?.values as IDataObject[];

		const body: IDataObject = {
			content,
			...options,
		};

		if (embeds) {
			body.embeds = prepareEmbeds.call(this, embeds);
		}

		try {
			const sendTo = this.getNodeParameter('sendTo', i) as string;

			let channelId = '';

			if (sendTo === 'user') {
				const userId = this.getNodeParameter('userId', i, undefined, {
					extractValue: true,
				}) as string;

				channelId = (
					(await discordApiRequest.call(this, 'POST', '/users/@me/channels', {
						recipient_id: userId,
					})) as IDataObject
				).id as string;
			}

			if (sendTo === 'channel') {
				channelId = this.getNodeParameter('channelId', i, undefined, {
					extractValue: true,
				}) as string;
			}

			if (!channelId) {
				throw new NodeOperationError(this.getNode(), 'Channel ID is required');
			}

			let response: IDataObject[] = [];

			if (files?.length) {
				const multiPartBody = await prepareMultiPartForm.call(this, items, files, body, i);

				response = await discordApiMultiPartRequest.call(
					this,
					'POST',
					`/channels/${channelId}/messages`,
					multiPartBody,
				);
			} else {
				response = await discordApiRequest.call(
					this,
					'POST',
					`/channels/${channelId}/messages`,
					body,
				);
			}

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(response),
				{ itemData: { item: i } },
			);

			returnData.push(...executionData);
		} catch (error) {
			const err = parseDiscordError.call(this, error);

			if (this.continueOnFail()) {
				returnData.push(...prepareErrorData.call(this, err, i));
				continue;
			}

			throw err;
		}
	}

	return returnData;
}