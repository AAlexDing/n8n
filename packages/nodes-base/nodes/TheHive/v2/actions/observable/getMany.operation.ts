import type { IExecuteFunctions } from 'n8n-core';
import type {
	IDataObject,
	IHttpRequestMethods,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '../../../../../utils/utilities';
import { returnAllAndLimit } from '../common.description';
import {
	Id,
	Parent,
	prepareOptional,
	prepareRangeQuery,
	prepareSortQuery,
} from '../../helpers/utils';
import type { BodyWithQuery } from '../../helpers/interfaces';
import { theHiveApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Case ID',
		name: 'caseId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the case',
	},
	...returnAllAndLimit,
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Sort',
				name: 'sort',
				type: 'string',
				placeholder: '±Attribut, exp +status',
				description: 'Specify the sorting attribut, + for asc, - for desc',
				default: '',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['observable'],
		operation: ['getMany'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	let responseData: IDataObject | IDataObject[] = [];

	const credentials = await this.getCredentials('theHiveApi');

	const returnAll = this.getNodeParameter('returnAll', i);

	const version = credentials.apiVersion;

	const options = this.getNodeParameter('options', i);

	const caseId = this.getNodeParameter('caseId', i);

	let endpoint;

	let method: IHttpRequestMethods;

	let body: IDataObject = {};

	const qs: IDataObject = {};

	let limit = undefined;

	if (!returnAll) {
		limit = this.getNodeParameter('limit', i);
	}

	if (version === 'v1') {
		endpoint = '/v1/query';

		method = 'POST';

		body = {
			query: [
				{
					_name: 'getCase',
					idOrName: caseId,
				},
				{
					_name: 'observables',
				},
			],
		};

		prepareSortQuery(options.sort as string, body as BodyWithQuery);

		if (limit !== undefined) {
			prepareRangeQuery(`0-${limit}`, body as BodyWithQuery);
		}

		qs.name = 'observables';
	} else {
		method = 'POST';

		endpoint = '/case/artifact/_search';

		if (limit !== undefined) {
			qs.range = `0-${limit}`;
		}

		body.query = Parent('case', Id(caseId as string));

		Object.assign(qs, prepareOptional(options));
	}

	responseData = await theHiveApiRequest.call(this, method, endpoint, body, qs);

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
