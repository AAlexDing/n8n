/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type { INodeTypeDescription } from 'n8n-workflow';
import * as calendar from './calendar/Calendar.resource';
import * as contact from './contact/Contact.resource';
import * as draft from './draft/Draft.resource';
import * as event from './event/Event.resource';
import * as folder from './folder/Folder.resource';
import * as folderMessage from './folderMessage/FolderMessage.resource';
import * as message from './message/Message.resource';
import * as messageAttachment from './messageAttachment/MessageAttachment.resource';

export const versionDescription: INodeTypeDescription = {
	displayName: 'Microsoft Outlook',
	name: 'microsoftOutlook',
	group: ['transform'],
	icon: 'file:outlook.svg',
	version: 2,
	subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
	description: 'Consume Microsoft Outlook API',
	defaults: {
		name: 'Microsoft Outlook',
	},
	inputs: ['main'],
	outputs: ['main'],
	credentials: [
		{
			name: 'microsoftOutlookOAuth2Api',
			required: true,
		},
	],
	properties: [
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			default: 'message',
			options: [
				{
					name: 'Calendar',
					value: 'calendar',
				},
				{
					name: 'Contact',
					value: 'contact',
				},
				{
					name: 'Draft',
					value: 'draft',
				},
				{
					name: 'Event',
					value: 'event',
				},
				{
					name: 'Folder',
					value: 'folder',
				},
				{
					name: 'Folder Message',
					value: 'folderMessage',
				},
				{
					name: 'Message',
					value: 'message',
				},
				{
					name: 'Message Attachment',
					value: 'messageAttachment',
				},
			],
		},
		...calendar.description,
		...contact.description,
		...draft.description,
		...event.description,
		...folder.description,
		...folderMessage.description,
		...message.description,
		...messageAttachment.description,
	],
};
