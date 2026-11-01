// The `preSend` steps of the ProofTell node's operations: n8n's declarative routing puts every parameter into the
// JSON body, blank or not. The api reads a blank as absent today; the node does not lean on that: it sends only
// what was given, and an assessment with nothing to assess is refused here, with n8n's message and description,
// instead of by the api with a 400.
import { NodeOperationError } from 'n8n-workflow';
import type { IExecuteSingleFunctions, IHttpRequestOptions } from 'n8n-workflow';

const IDENTITY_FIELDS = ['phone', 'email', 'ip'] as const;

function isBlank(value: unknown): boolean {
	return (
		value === undefined ||
		value === null ||
		(typeof value === 'string' && value.trim() === '') ||
		(typeof value === 'object' && Object.keys(value as object).length === 0)
	);
}

function bodyOf(requestOptions: IHttpRequestOptions): Record<string, unknown> | undefined {
	const body = requestOptions.body;
	if (body && typeof body === 'object' && !Array.isArray(body)) {
		return body as Record<string, unknown>;
	}
	return undefined;
}

/** Removes the fields the user left blank, so that only what was given reaches the api. */
export async function dropBlankFields(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const body = bodyOf(requestOptions);
	if (body) {
		for (const [key, value] of Object.entries(body)) {
			if (isBlank(value)) {
				delete body[key];
			}
		}
	}
	return requestOptions;
}

/** An assessment needs a phone number, an email address or an IP address: refuses the request without one. */
export async function requireAnIdentity(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const body = bodyOf(requestOptions) ?? {};
	if (!IDENTITY_FIELDS.some((field) => !isBlank(body[field]))) {
		throw new NodeOperationError(
			this.getNode(),
			"Give at least one of 'Phone Number', 'Email Address' and 'IP Address'.",
			{
				itemIndex: this.getItemIndex(),
				description:
					'An assessment scores what it is given; with nothing given there is nothing to score.',
			},
		);
	}
	return requestOptions;
}
