import type { INodeProperties } from 'n8n-workflow';

export const orderOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['order'],
			},
		},
		options: [
			{
				name: 'Cancel',
				value: 'cancel',
				action: 'Cancel an order',
				description: 'Cancel an order',
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Create an order',
				description: 'Create a new sales order',
			},
			{
				name: 'Create Invoice',
				value: 'createInvoice',
				action: 'Create invoice from order',
				description: 'Convert an order to an invoice',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get an order',
				description: 'Retrieve an order by document number',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many orders',
				description: 'List orders with optional filters',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update an order',
				description: 'Update an order',
			},
		],
		default: 'getMany',
	},
];

/**
 * Shared row fields used in both create and update order row definitions.
 * Alphabetized by displayName.
 */
const orderRowFields: INodeProperties[] = [
	{
		displayName: 'Account Number',
		name: 'AccountNumber',
		type: 'number',
		default: 0,
		description: 'Revenue account (required if no ArticleNumber)',
	},
	{
		displayName: 'Article Number',
		name: 'ArticleNumber',
		type: 'string',
		default: '',
		description: 'Article from register',
	},
	{
		displayName: 'Cost Center',
		name: 'CostCenter',
		type: 'string',
		default: '',
		description: 'Row cost center',
	},
	{
		displayName: 'Delivered Quantity',
		name: 'DeliveredQuantity',
		type: 'number',
		default: 0,
		description: 'Quantity delivered',
	},
	{
		displayName: 'Description',
		name: 'Description',
		type: 'string',
		default: '',
		description: 'Line item description',
	},
	{
		displayName: 'Discount',
		name: 'Discount',
		type: 'number',
		default: 0,
		description: 'Discount value',
	},
	{
		displayName: 'Discount Type',
		name: 'DiscountType',
		type: 'options',
		options: [
			{ name: 'Amount', value: 'AMOUNT' },
			{ name: 'Percent', value: 'PERCENT' },
		],
		default: 'PERCENT',
	},
	{
		displayName: 'Housework',
		name: 'HouseWork',
		type: 'boolean',
		default: false,
		description: 'Whether this is ROT/RUT housework',
	},
	{
		displayName: 'Housework Hours To Report',
		name: 'HouseWorkHoursToReport',
		type: 'number',
		default: 0,
		description: 'Hours for housework',
	},
	{
		displayName: 'Housework Type',
		name: 'HouseWorkType',
		type: 'string',
		default: '',
		description: 'Housework type code',
	},
	{
		displayName: 'Ordered Quantity',
		name: 'OrderedQuantity',
		type: 'number',
		default: 1,
		description: 'Quantity ordered',
	},
	{
		displayName: 'Price',
		name: 'Price',
		type: 'number',
		default: 0,
		description: 'Unit price',
	},
	{
		displayName: 'Project',
		name: 'Project',
		type: 'string',
		default: '',
		description: 'Row project code',
	},
	{
		displayName: 'Unit',
		name: 'Unit',
		type: 'string',
		default: '',
		description: 'Unit of measure',
	},
	{
		displayName: 'VAT',
		name: 'VAT',
		type: 'number',
		default: 0,
		description: 'VAT percentage',
	},
];

/**
 * Shared additional/update fields for create and update operations.
 * Alphabetized by displayName per n8n lint rule.
 */
const commonOrderFields: INodeProperties[] = [
	{
		displayName: 'Address Line 1',
		name: 'Address1',
		type: 'string',
		default: '',
		description: 'Billing address line 1',
	},
	{
		displayName: 'Address Line 2',
		name: 'Address2',
		type: 'string',
		default: '',
		description: 'Billing address line 2',
	},
	{
		displayName: 'Administration Fee',
		name: 'AdministrationFee',
		type: 'number',
		default: 0,
		description: 'Administration fee amount',
	},
	{
		displayName: 'City',
		name: 'City',
		type: 'string',
		default: '',
		description: 'Billing city',
	},
	{
		displayName: 'Comments',
		name: 'Comments',
		type: 'string',
		default: '',
		description: 'Order comments',
	},
	{
		displayName: 'Copy Remarks',
		name: 'CopyRemarks',
		type: 'boolean',
		default: false,
		description: 'Whether to copy remarks to invoice',
	},
	{
		displayName: 'Cost Center',
		name: 'CostCenter',
		type: 'string',
		default: '',
		description: 'Cost center code',
	},
	{
		displayName: 'Country',
		name: 'Country',
		type: 'string',
		default: '',
		description: 'Billing country',
	},
	{
		displayName: 'Currency',
		name: 'Currency',
		type: 'string',
		default: '',
		description: 'Currency code (e.g., SEK)',
	},
	{
		displayName: 'Currency Rate',
		name: 'CurrencyRate',
		type: 'number',
		default: 0,
		description: 'Exchange rate',
	},
	{
		displayName: 'Currency Unit',
		name: 'CurrencyUnit',
		type: 'number',
		default: 0,
	},
	{
		displayName: 'Customer Name',
		name: 'CustomerName',
		type: 'string',
		default: '',
		description: 'Customer display name',
	},
	{
		displayName: 'Delivery Address Line 1',
		name: 'DeliveryAddress1',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Delivery Address Line 2',
		name: 'DeliveryAddress2',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Delivery City',
		name: 'DeliveryCity',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Delivery Country',
		name: 'DeliveryCountry',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Delivery Date',
		name: 'DeliveryDate',
		type: 'string',
		default: '',
		description: 'Delivery date (YYYY-MM-DD)',
	},
	{
		displayName: 'Delivery Name',
		name: 'DeliveryName',
		type: 'string',
		default: '',
		description: 'Delivery recipient name',
	},
	{
		displayName: 'Delivery Zip Code',
		name: 'DeliveryZipCode',
		type: 'string',
		default: '',
		description: 'Delivery postal code',
	},
	{
		displayName: 'External Invoice Reference 1',
		name: 'ExternalInvoiceReference1',
		type: 'string',
		default: '',
	},
	{
		displayName: 'External Invoice Reference 2',
		name: 'ExternalInvoiceReference2',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Freight',
		name: 'Freight',
		type: 'number',
		default: 0,
		description: 'Freight amount',
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
		description: 'Order language',
	},
	{
		displayName: 'Not Completed',
		name: 'NotCompleted',
		type: 'boolean',
		default: false,
		description: 'Whether order is not fully completed',
	},
	{
		displayName: 'Order Date',
		name: 'OrderDate',
		type: 'string',
		default: '',
		description: 'Order date (YYYY-MM-DD)',
	},
	{
		displayName: 'Our Reference',
		name: 'OurReference',
		type: 'string',
		default: '',
		description: 'Internal reference',
	},
	{
		displayName: 'Phone 1',
		name: 'Phone1',
		type: 'string',
		default: '',
		description: 'Phone number 1',
	},
	{
		displayName: 'Phone 2',
		name: 'Phone2',
		type: 'string',
		default: '',
		description: 'Phone number 2',
	},
	{
		displayName: 'Price List',
		name: 'PriceList',
		type: 'string',
		default: '',
		description: 'Price list code',
	},
	{
		displayName: 'Print Template',
		name: 'PrintTemplate',
		type: 'string',
		default: '',
		description: 'Print template name',
	},
	{
		displayName: 'Project',
		name: 'Project',
		type: 'string',
		default: '',
		description: 'Project code',
	},
	{
		displayName: 'Remarks',
		name: 'Remarks',
		type: 'string',
		default: '',
		description: 'Order remarks',
	},
	{
		displayName: 'Terms Of Delivery',
		name: 'TermsOfDelivery',
		type: 'string',
		default: '',
		description: 'Delivery terms code',
	},
	{
		displayName: 'Terms Of Payment',
		name: 'TermsOfPayment',
		type: 'string',
		default: '',
		description: 'Payment terms code',
	},
	{
		displayName: 'VAT Included',
		name: 'VATIncluded',
		type: 'boolean',
		default: false,
		description: 'Whether prices include VAT',
	},
	{
		displayName: 'Way Of Delivery',
		name: 'WayOfDelivery',
		type: 'string',
		default: '',
		description: 'Delivery method code',
	},
	{
		displayName: 'Your Order Number',
		name: 'YourOrderNumber',
		type: 'string',
		default: '',
		description: "Customer's order number",
	},
	{
		displayName: 'Your Reference',
		name: 'YourReference',
		type: 'string',
		default: '',
		description: "Customer's reference",
	},
	{
		displayName: 'Zip Code',
		name: 'ZipCode',
		type: 'string',
		default: '',
		description: 'Billing postal code',
	},
];

export const orderFields: INodeProperties[] = [
	// ---------------------------------------------------------------
	// A. Document Number (shared by get, update, cancel, createInvoice)
	// ---------------------------------------------------------------
	{
		displayName: 'Document Number',
		name: 'documentNumber',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['order'],
				operation: ['get', 'update', 'cancel', 'createInvoice'],
			},
		},
		default: '',
		description: 'The order document number in Fortnox',
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
				resource: ['order'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'The customer number from Fortnox customer register',
	},

	// ---------------------------------------------------------------
	// C. Order Rows (fixedCollection for create)
	// ---------------------------------------------------------------
	{
		displayName: 'Order Rows',
		name: 'orderRows',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: ['order'],
				operation: ['create'],
			},
		},
		default: {},
		description:
			'Line items for the order. Each row requires either an ArticleNumber or an AccountNumber.',
		options: [
			{
				displayName: 'Row',
				name: 'row',
				values: orderRowFields,
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
				resource: ['order'],
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
				resource: ['order'],
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
				resource: ['order'],
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
					{ name: 'Expired', value: 'expired' },
					{ name: 'Invoice Created', value: 'invoicecreated' },
					{ name: 'Invoice Not Created', value: 'invoicenotcreated' },
				],
				default: 'cancelled',
				description: 'Filter orders by status',
			},
			{
				displayName: 'From Date',
				name: 'fromdate',
				type: 'string',
				default: '',
				description: 'Return orders from this date (YYYY-MM-DD)',
			},
			{
				displayName: 'Last Modified',
				name: 'lastmodified',
				type: 'string',
				default: '',
				description: 'Filter by last modified date (YYYY-MM-DD HH:MM)',
			},
			{
				displayName: 'Sort By',
				name: 'sortby',
				type: 'options',
				options: [
					{ name: 'Customer Name', value: 'customername' },
					{ name: 'Customer Number', value: 'customernumber' },
					{ name: 'Document Number', value: 'documentnumber' },
					{ name: 'Order Date', value: 'orderdate' },
				],
				default: 'documentnumber',
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
				description: 'Return orders up to this date (YYYY-MM-DD)',
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
				resource: ['order'],
				operation: ['create'],
			},
		},
		default: {},
		options: commonOrderFields,
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
				resource: ['order'],
				operation: ['update'],
			},
		},
		default: {},
		description: 'Fields to update on the order',
		options: [
			...commonOrderFields,
			{
				displayName: 'Order Rows',
				name: 'OrderRows',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				description:
					'Updated line items for the order. Each row requires either an ArticleNumber or an AccountNumber.',
				options: [
					{
						displayName: 'Row',
						name: 'row',
						values: orderRowFields,
					},
				],
			},
		],
	},
];
