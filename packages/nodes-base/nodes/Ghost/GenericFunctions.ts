import { OptionsWithUri } from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import { IDataObject, JsonObject, NodeApiError } from 'n8n-workflow';

export async function ghostApiRequest(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	// tslint:disable-next-line:no-any
	body: any = {},
	query: IDataObject = {},
	uri?: string,
	// tslint:disable-next-line:no-any
): Promise<any> {
	const source = this.getNodeParameter('source', 0) as string;

	let credentials;
	let version;
	let credentialType;

	if (source === 'contentApi') {
		//https://ghost.org/faq/api-versioning/
		version = 'v3';
		credentialType = 'ghostContentApi';
	} else {
		version = 'v2';
		credentialType = 'ghostAdminApi';
	}

	credentials = await this.getCredentials(credentialType);

	const options: OptionsWithUri = {
		method,
		qs: query,
		uri: uri || `${credentials.url}/ghost/api/${version}${endpoint}`,
		body,
		json: true,
	};

	try {
		return await this.helpers.requestWithAuthentication.call(this, credentialType, options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function ghostApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: string,
	endpoint: string,
	// tslint:disable-next-line:no-any
	body: any = {},
	query: IDataObject = {},
	// tslint:disable-next-line:no-any
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;

	query.limit = 50;
	query.page = 1;

	do {
		responseData = await ghostApiRequest.call(this, method, endpoint, body, query);
		query.page = responseData.meta.pagination.next;
		returnData.push.apply(returnData, responseData[propertyName]);
	} while (query.page !== null);
	return returnData;
}

// tslint:disable-next-line:no-any
export function validateJSON(json: string | undefined): any {
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = undefined;
	}
	return result;
}
