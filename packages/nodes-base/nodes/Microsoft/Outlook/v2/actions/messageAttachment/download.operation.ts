import { IExecuteFunctions } from 'n8n-core';
import { INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { microsoftApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Binary Property',
		name: 'binaryPropertyName',
		description: 'Name of the binary property to which to write the data of the read file',
		type: 'string',
		required: true,
		default: 'data',
		displayOptions: {
			show: {
				resource: ['messageAttachment'],
				operation: ['download'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const messageId = this.getNodeParameter('messageId', index) as string;
	const attachmentId = this.getNodeParameter('attachmentId', index) as string;
	const dataPropertyNameDownload = this.getNodeParameter('binaryPropertyName', index) as string;

	// Get attachment details first
	const attachmentDetails = await microsoftApiRequest.call(
		this,
		'GET',
		`/messages/${messageId}/attachments/${attachmentId}`,
		undefined,
		{ $select: 'id,name,contentType' },
	);

	let mimeType: string | undefined;
	if (attachmentDetails.contentType) {
		mimeType = attachmentDetails.contentType;
	}
	const fileName = attachmentDetails.name;

	const response = await microsoftApiRequest.call(
		this,
		'GET',
		`/messages/${messageId}/attachments/${attachmentId}/$value`,
		undefined,
		{},
		undefined,
		{},
		{ encoding: null, resolveWithFullResponse: true },
	);

	const newItem: INodeExecutionData = {
		json: items[index].json,
		binary: {},
	};

	if (items[index].binary !== undefined) {
		// Create a shallow copy of the binary data so that the old
		// data references which do not get changed still stay behind
		// but the incoming data does not get changed.
		Object.assign(newItem.binary!, items[index].binary);
	}

	items[index] = newItem;
	const data = Buffer.from(response.body as string, 'utf8');
	items[index].binary![dataPropertyNameDownload] = await this.helpers.prepareBinaryData(
		data as unknown as Buffer,
		fileName,
		mimeType,
	);

	return items;
}