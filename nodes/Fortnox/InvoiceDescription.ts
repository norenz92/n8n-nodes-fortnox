import type { INodeProperties } from 'n8n-workflow';

export const invoiceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['invoice'],
			},
		},
		options: [
			{
				name: 'Bookkeep',
				value: 'bookkeep',
				action: 'Bookkeep an invoice',
				description: 'Finalize an invoice in accounting',
			},
			{
				name: 'Cancel',
				value: 'cancel',
				action: 'Cancel an invoice',
				description: 'Cancel an invoice',
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Create an invoice',
				description: 'Create a new invoice',
			},
			{
				name: 'Credit',
				value: 'credit',
				action: 'Credit an invoice',
				description: 'Create a credit note for an invoice',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get an invoice',
				description: 'Retrieve an invoice by document number',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many invoices',
				description: 'List invoices with optional filters',
			},
			{
				name: 'Send',
				value: 'send',
				action: 'Send an invoice',
				description: 'Send an invoice via email',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update an invoice',
				description: 'Update a draft (unbooked) invoice',
			},
		],
		default: 'getMany',
	},
];

/**
 * Shared row fields used in both create and update invoice row definitions.
 */
const invoiceRowFields: INodeProperties[] = [
	{
		displayName: 'Article Number',
		name: 'ArticleNumber',
		type: 'string',
		default: '',
		description: 'Article number from Fortnox article register',
	},
	{
		displayName: 'Account Number',
		name: 'AccountNumber',
		type: 'number',
		default: 0,
		description:
			'Account number. Required if no ArticleNumber is provided.',
	},
	{
		displayName: 'Delivered Quantity',
		name: 'DeliveredQuantity',
		type: 'number',
		default: 1,
		description: 'Quantity delivered or invoiced',
	},
	{
		displayName: 'Description',
		name: 'Description',
		type: 'string',
		default: '',
		description: 'Line item description',
	},
	{
		displayName: 'Price',
		name: 'Price',
		type: 'number',
		default: 0,
		description: 'Unit price excluding VAT',
	},
];

/**
 * Shared additional/update fields for create and update operations.
 * Alphabetized by displayName per n8n lint rule.
 */
const commonInvoiceFields: INodeProperties[] = [
	{
		displayName: 'Comments',
		name: 'Comments',
		type: 'string',
		default: '',
		description: 'Comments on the invoice',
	},
	{
		displayName: 'Currency',
		name: 'Currency',
		type: 'string',
		default: '',
		description: 'Currency code (e.g., SEK, EUR, USD)',
	},
	{
		displayName: 'Due Date',
		name: 'DueDate',
		type: 'string',
		default: '',
		description: 'Invoice due date (YYYY-MM-DD)',
	},
	{
		displayName: 'Freight',
		name: 'Freight',
		type: 'number',
		default: 0,
		description: 'Freight amount',
	},
	{
		displayName: 'Invoice Date',
		name: 'InvoiceDate',
		type: 'string',
		default: '',
		description: 'Invoice date (YYYY-MM-DD)',
	},
	{
		displayName: 'Invoice Type',
		name: 'InvoiceType',
		type: 'options',
		options: [
			{ name: 'Cash', value: 'CASH' },
			{ name: 'Credit', value: 'CREDIT' },
			{ name: 'Invoice', value: 'INVOICE' },
		],
		default: 'INVOICE',
	},
	{
		displayName: 'Language',
		name: 'Language',
		type: 'options',
		options: [
			{ name: 'English', value: 'EN' },
			{ name: 'Swedish', value: 'SV' },
		],
		default: 'SV',
		description: 'Invoice language',
	},
	{
		displayName: 'Our Reference',
		name: 'OurReference',
		type: 'string',
		default: '',
		description: 'Internal reference',
	},
	{
		displayName: 'Terms Of Payment',
		name: 'TermsOfPayment',
		type: 'string',
		default: '',
		description: 'Payment terms code from Fortnox',
	},
	{
		displayName: 'VAT Included',
		name: 'VATIncluded',
		type: 'boolean',
		default: false,
		description: 'Whether prices include VAT',
	},
	{
		displayName: 'Your Order Number',
		name: 'YourOrderNumber',
		type: 'string',
		default: '',
		description: 'Customer order number',
	},
	{
		displayName: 'Your Reference',
		name: 'YourReference',
		type: 'string',
		default: '',
		description: 'Customer reference',
	},
];

export const invoiceFields: INodeProperties[] = [
	// ---------------------------------------------------------------
	// A. Document Number (shared by get, update, bookkeep, cancel,
	//    credit, send)
	// ---------------------------------------------------------------
	{
		displayName: 'Document Number',
		name: 'documentNumber',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['invoice'],
				operation: [
					'get',
					'update',
					'bookkeep',
					'cancel',
					'credit',
					'send',
				],
			},
		},
		default: '',
		description: 'The invoice document number in Fortnox',
	},

	// ---------------------------------------------------------------
	// B. Customer Number (required for create)
	// ---------------------------------------------------------------
	{
		displayName: 'Customer Number',
		name: 'customerNumber',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['invoice'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'The customer number from Fortnox customer register',
	},

	// ---------------------------------------------------------------
	// C. Invoice Rows (fixedCollection for create)
	// ---------------------------------------------------------------
	{
		displayName: 'Invoice Rows',
		name: 'invoiceRows',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: ['invoice'],
				operation: ['create'],
			},
		},
		default: {},
		description:
			'Line items for the invoice. Each row requires either an ArticleNumber or an AccountNumber.',
		options: [
			{
				displayName: 'Row',
				name: 'row',
				values: invoiceRowFields,
			},
		],
	},

	// ---------------------------------------------------------------
	// D. Return All toggle (getMany)
	// ---------------------------------------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['invoice'],
				operation: ['getMany'],
			},
		},
		default: false,
		description:
			'Whether to return all results or only up to a given limit',
	},

	// ---------------------------------------------------------------
	// E. Limit (getMany when returnAll=false)
	// ---------------------------------------------------------------
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['invoice'],
				operation: ['getMany'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 50,
		description: 'Max number of results to return',
	},

	// ---------------------------------------------------------------
	// F. Filters (collection for getMany) -- alphabetized by name
	// ---------------------------------------------------------------
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		displayOptions: {
			show: {
				resource: ['invoice'],
				operation: ['getMany'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Filter',
				name: 'filter',
				type: 'options',
				options: [
					{ name: 'Cancelled', value: 'cancelled' },
					{ name: 'Fully Paid', value: 'fullypaid' },
					{ name: 'Unbooked', value: 'unbooked' },
					{ name: 'Unpaid', value: 'unpaid' },
					{ name: 'Unpaid Overdue', value: 'unpaidoverdue' },
				],
				default: 'cancelled',
				description: 'Filter invoices by status',
			},
			{
				displayName: 'From Date',
				name: 'fromdate',
				type: 'string',
				default: '',
				description: 'Return invoices from this date (YYYY-MM-DD)',
			},
			{
				displayName: 'Sort By',
				name: 'sortby',
				type: 'options',
				options: [
					{ name: 'Customer Name', value: 'CustomerName' },
					{ name: 'Customer Number', value: 'CustomerNumber' },
					{ name: 'Document Number', value: 'DocumentNumber' },
					{ name: 'OCR', value: 'OCR' },
					{ name: 'Total', value: 'Total' },
				],
				default: 'DocumentNumber',
				description: 'Sort results by field',
			},
			{
				displayName: 'Sort Order',
				name: 'sortorder',
				type: 'options',
				options: [
					{ name: 'Ascending', value: 'ascending' },
					{ name: 'Descending', value: 'descending' },
				],
				default: 'ascending',
				description: 'Sort direction',
			},
			{
				displayName: 'To Date',
				name: 'todate',
				type: 'string',
				default: '',
				description: 'Return invoices up to this date (YYYY-MM-DD)',
			},
		],
	},

	// ---------------------------------------------------------------
	// G. Additional Fields (collection for create)
	// ---------------------------------------------------------------
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['invoice'],
				operation: ['create'],
			},
		},
		default: {},
		options: commonInvoiceFields,
	},

	// ---------------------------------------------------------------
	// H. Update Fields (collection for update)
	// ---------------------------------------------------------------
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['invoice'],
				operation: ['update'],
			},
		},
		default: {},
		description: 'Only unbooked (draft) invoices can be updated',
		options: [
			{
				displayName: 'Customer Number',
				name: 'CustomerNumber',
				type: 'string',
				default: '',
				description: 'Change the customer on the invoice',
			},
			...commonInvoiceFields,
			{
				displayName: 'Invoice Rows',
				name: 'InvoiceRows',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				description:
					'Updated line items for the invoice. Each row requires either an ArticleNumber or an AccountNumber.',
				options: [
					{
						displayName: 'Row',
						name: 'row',
						values: invoiceRowFields,
					},
				],
			},
		],
	},
];
