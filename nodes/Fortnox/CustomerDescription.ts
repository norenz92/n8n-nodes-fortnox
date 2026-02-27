import type { INodeProperties } from 'n8n-workflow';

export const customerOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['customer'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a customer',
				description: 'Create a new customer',
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a customer',
				description: 'Delete a customer',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a customer',
				description: 'Retrieve a customer by customer number',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many customers',
				description: 'List customers with optional filters',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a customer',
				description: 'Update a customer record',
			},
		],
		default: 'getMany',
	},
];

/**
 * Shared additional/update fields for create and update operations.
 * Alphabetized by displayName per n8n lint rule.
 */
const commonCustomerFields: INodeProperties[] = [
	{
		displayName: 'Active',
		name: 'Active',
		type: 'boolean',
		default: false,
		description: 'Whether customer is active',
	},
	{
		displayName: 'Address Line 1',
		name: 'Address1',
		type: 'string',
		default: '',
		description: 'Primary address line',
	},
	{
		displayName: 'Address Line 2',
		name: 'Address2',
		type: 'string',
		default: '',
		description: 'Secondary address line',
	},
	{
		displayName: 'City',
		name: 'City',
		type: 'string',
		default: '',
		description: 'City name',
	},
	{
		displayName: 'Comments',
		name: 'Comments',
		type: 'string',
		default: '',
		description: 'Comments on the customer',
	},
	{
		displayName: 'Cost Center',
		name: 'CostCenter',
		type: 'string',
		default: '',
		description: 'Default cost center code',
	},
	{
		displayName: 'Country Code',
		name: 'CountryCode',
		type: 'string',
		default: '',
		description: 'Two-letter country code (e.g., SE)',
	},
	{
		displayName: 'Currency',
		name: 'Currency',
		type: 'string',
		default: '',
		description: 'Default currency code (e.g., SEK)',
	},
	{
		displayName: 'Customer Number',
		name: 'CustomerNumber',
		type: 'string',
		default: '',
		description: 'Unique identifier (auto-generated if omitted on create)',
	},
	{
		displayName: 'Delivery Address Line 1',
		name: 'DeliveryAddress1',
		type: 'string',
		default: '',
		description: 'Primary delivery address line',
	},
	{
		displayName: 'Delivery Address Line 2',
		name: 'DeliveryAddress2',
		type: 'string',
		default: '',
		description: 'Secondary delivery address line',
	},
	{
		displayName: 'Delivery City',
		name: 'DeliveryCity',
		type: 'string',
		default: '',
		description: 'Delivery city name',
	},
	{
		displayName: 'Delivery Country Code',
		name: 'DeliveryCountryCode',
		type: 'string',
		default: '',
		description: 'Two-letter delivery country code',
	},
	{
		displayName: 'Delivery Fax',
		name: 'DeliveryFax',
		type: 'string',
		default: '',
		description: 'Delivery fax number',
	},
	{
		displayName: 'Delivery Name',
		name: 'DeliveryName',
		type: 'string',
		default: '',
		description: 'Delivery recipient name',
	},
	{
		displayName: 'Delivery Phone 1',
		name: 'DeliveryPhone1',
		type: 'string',
		default: '',
		description: 'Primary delivery phone number',
	},
	{
		displayName: 'Delivery Phone 2',
		name: 'DeliveryPhone2',
		type: 'string',
		default: '',
		description: 'Secondary delivery phone number',
	},
	{
		displayName: 'Delivery Zip Code',
		name: 'DeliveryZipCode',
		type: 'string',
		default: '',
		description: 'Delivery postal code',
	},
	{
		displayName: 'Email',
		name: 'Email',
		type: 'string',
		default: '',
		description: 'Primary email address',
	},
	{
		displayName: 'Email Invoice',
		name: 'EmailInvoice',
		type: 'string',
		default: '',
		description: 'Email address for invoices',
	},
	{
		displayName: 'Email Invoice BCC',
		name: 'EmailInvoiceBCC',
		type: 'string',
		default: '',
		description: 'BCC email for invoices',
	},
	{
		displayName: 'Email Invoice CC',
		name: 'EmailInvoiceCC',
		type: 'string',
		default: '',
		description: 'CC email for invoices',
	},
	{
		displayName: 'Email Offer',
		name: 'EmailOffer',
		type: 'string',
		default: '',
		description: 'Email address for offers',
	},
	{
		displayName: 'Email Offer BCC',
		name: 'EmailOfferBCC',
		type: 'string',
		default: '',
		description: 'BCC email for offers',
	},
	{
		displayName: 'Email Offer CC',
		name: 'EmailOfferCC',
		type: 'string',
		default: '',
		description: 'CC email for offers',
	},
	{
		displayName: 'Email Order',
		name: 'EmailOrder',
		type: 'string',
		default: '',
		description: 'Email address for orders',
	},
	{
		displayName: 'Email Order BCC',
		name: 'EmailOrderBCC',
		type: 'string',
		default: '',
		description: 'BCC email for orders',
	},
	{
		displayName: 'Email Order CC',
		name: 'EmailOrderCC',
		type: 'string',
		default: '',
		description: 'CC email for orders',
	},
	{
		displayName: 'Fax',
		name: 'Fax',
		type: 'string',
		default: '',
		description: 'Fax number',
	},
	{
		displayName: 'GLN',
		name: 'GLN',
		type: 'string',
		default: '',
		description: 'Global Location Number',
	},
	{
		displayName: 'GLN Delivery',
		name: 'GLNDelivery',
		type: 'string',
		default: '',
		description: 'Delivery GLN',
	},
	{
		displayName: 'Invoice Administration Fee',
		name: 'InvoiceAdministrationFee',
		type: 'number',
		default: 0,
		description: 'Default invoice administration fee',
	},
	{
		displayName: 'Invoice Discount',
		name: 'InvoiceDiscount',
		type: 'number',
		default: 0,
		description: 'Default invoice discount percentage',
	},
	{
		displayName: 'Invoice Freight',
		name: 'InvoiceFreight',
		type: 'number',
		default: 0,
		description: 'Default invoice freight amount',
	},
	{
		displayName: 'Invoice Remark',
		name: 'InvoiceRemark',
		type: 'string',
		default: '',
		description: 'Default remark on invoices',
	},
	{
		displayName: 'Organisation Number',
		name: 'OrganisationNumber',
		type: 'string',
		default: '',
		description: 'Company registration number',
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
		description: 'Primary phone number',
	},
	{
		displayName: 'Phone 2',
		name: 'Phone2',
		type: 'string',
		default: '',
		description: 'Secondary phone number',
	},
	{
		displayName: 'Price List',
		name: 'PriceList',
		type: 'string',
		default: '',
		description: 'Default price list code',
	},
	{
		displayName: 'Project',
		name: 'Project',
		type: 'string',
		default: '',
		description: 'Default project code',
	},
	{
		displayName: 'Sales Account',
		name: 'SalesAccount',
		type: 'number',
		default: 0,
		description: 'Default sales account',
	},
	{
		displayName: 'Show Price VAT Included',
		name: 'ShowPriceVATIncluded',
		type: 'boolean',
		default: false,
		description: 'Whether to show prices with VAT included',
	},
	{
		displayName: 'Terms Of Delivery',
		name: 'TermsOfDelivery',
		type: 'string',
		default: '',
		description: 'Default delivery terms code',
	},
	{
		displayName: 'Terms Of Payment',
		name: 'TermsOfPayment',
		type: 'string',
		default: '',
		description: 'Default payment terms code',
	},
	{
		displayName: 'Type',
		name: 'Type',
		type: 'options',
		options: [
			{ name: 'Company', value: 'COMPANY' },
			{ name: 'Private', value: 'PRIVATE' },
		],
		default: 'COMPANY',
		description: 'Customer type',
	},
	{
		displayName: 'VAT Number',
		name: 'VATNumber',
		type: 'string',
		default: '',
		description: 'VAT registration number',
	},
	{
		displayName: 'VAT Type',
		name: 'VATType',
		type: 'options',
		options: [
			{ name: 'EU Reversed VAT', value: 'EUREVERSEDVAT' },
			{ name: 'EU VAT', value: 'EUVAT' },
			{ name: 'Export', value: 'EXPORT' },
			{ name: 'SE Reversed VAT', value: 'SEREVERSEDVAT' },
			{ name: 'SE VAT', value: 'SEVAT' },
		],
		default: 'SEVAT',
	},
	{
		displayName: 'Visiting Address',
		name: 'VisitingAddress',
		type: 'string',
		default: '',
		description: 'Visiting street address',
	},
	{
		displayName: 'Visiting City',
		name: 'VisitingCity',
		type: 'string',
		default: '',
		description: 'Visiting city name',
	},
	{
		displayName: 'Visiting Country Code',
		name: 'VisitingCountryCode',
		type: 'string',
		default: '',
		description: 'Two-letter visiting country code',
	},
	{
		displayName: 'Visiting Zip Code',
		name: 'VisitingZipCode',
		type: 'string',
		default: '',
		description: 'Visiting postal code',
	},
	{
		displayName: 'WWW',
		name: 'WWW',
		type: 'string',
		default: '',
		description: 'Website URL',
	},
	{
		displayName: 'Way Of Delivery',
		name: 'WayOfDelivery',
		type: 'string',
		default: '',
		description: 'Default delivery method code',
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
		description: 'Postal code',
	},
];

export const customerFields: INodeProperties[] = [
	// ---------------------------------------------------------------
	// A. Customer Number (shared by get, update, delete)
	// ---------------------------------------------------------------
	{
		displayName: 'Customer Number',
		name: 'customerNumber',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['customer'],
				operation: ['get', 'update', 'delete'],
			},
		},
		default: '',
		description: 'The customer number in Fortnox',
	},

	// ---------------------------------------------------------------
	// B. Name (required for create)
	// ---------------------------------------------------------------
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['customer'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'Customer name (required)',
	},

	// ---------------------------------------------------------------
	// C. Return All toggle (getMany)
	// ---------------------------------------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['customer'],
				operation: ['getMany'],
			},
		},
		default: false,
		description:
			'Whether to return all results or only up to a given limit',
	},

	// ---------------------------------------------------------------
	// D. Limit (getMany when returnAll=false)
	// ---------------------------------------------------------------
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['customer'],
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
	// E. Filters (collection for getMany) -- alphabetized by name
	// ---------------------------------------------------------------
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		displayOptions: {
			show: {
				resource: ['customer'],
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
					{ name: 'Active', value: 'active' },
					{ name: 'Inactive', value: 'inactive' },
				],
				default: 'active',
				description: 'Filter customers by status',
			},
			{
				displayName: 'Last Modified',
				name: 'lastmodified',
				type: 'string',
				default: '',
				description:
					'Filter by last modified date (YYYY-MM-DD HH:MM)',
			},
			{
				displayName: 'Sort By',
				name: 'sortby',
				type: 'options',
				options: [
					{ name: 'Customer Number', value: 'customernumber' },
					{ name: 'Name', value: 'name' },
				],
				default: 'customernumber',
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
		],
	},

	// ---------------------------------------------------------------
	// F. Additional Fields (collection for create)
	// ---------------------------------------------------------------
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['customer'],
				operation: ['create'],
			},
		},
		default: {},
		options: commonCustomerFields,
	},

	// ---------------------------------------------------------------
	// G. Update Fields (collection for update)
	// ---------------------------------------------------------------
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['customer'],
				operation: ['update'],
			},
		},
		default: {},
		options: [...commonCustomerFields],
	},
];
