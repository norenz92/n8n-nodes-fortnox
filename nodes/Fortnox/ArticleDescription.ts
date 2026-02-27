import type { INodeProperties } from 'n8n-workflow';

export const articleOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['article'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create an article',
				description: 'Create a new article',
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete an article',
				description: 'Delete an article',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get an article',
				description: 'Retrieve an article by article number',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many articles',
				description: 'List articles with optional filters',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update an article',
				description: 'Update an article',
			},
		],
		default: 'getMany',
	},
];

/**
 * Shared additional/update fields for create and update operations.
 * Alphabetized by displayName per n8n lint rule.
 */
const commonArticleFields: INodeProperties[] = [
	{
		displayName: 'Active',
		name: 'Active',
		type: 'boolean',
		default: false,
		description: 'Whether article is active',
	},
	{
		displayName: 'Article Number',
		name: 'ArticleNumber',
		type: 'string',
		default: '',
		description: 'Unique identifier (auto-generated if omitted)',
	},
	{
		displayName: 'Bulky',
		name: 'Bulky',
		type: 'boolean',
		default: false,
		description: 'Whether article is bulky (affects shipping)',
	},
	{
		displayName: 'Construction Account',
		name: 'ConstructionAccount',
		type: 'number',
		default: 0,
		description: 'Construction account number',
	},
	{
		displayName: 'Depth',
		name: 'Depth',
		type: 'number',
		default: 0,
		description: 'Article depth (mm)',
	},
	{
		displayName: 'Description',
		name: 'Description',
		type: 'string',
		default: '',
		description: 'Article description',
	},
	{
		displayName: 'EAN',
		name: 'EAN',
		type: 'string',
		default: '',
		description: 'EAN barcode number',
	},
	{
		displayName: 'EU Account',
		name: 'EUAccount',
		type: 'number',
		default: 0,
		description: 'EU sales account',
	},
	{
		displayName: 'EU VAT Account',
		name: 'EUVATAccount',
		type: 'number',
		default: 0,
		description: 'EU VAT account',
	},
	{
		displayName: 'Expired',
		name: 'Expired',
		type: 'boolean',
		default: false,
		description: 'Whether article is expired',
	},
	{
		displayName: 'Export Account',
		name: 'ExportAccount',
		type: 'number',
		default: 0,
		description: 'Export sales account',
	},
	{
		displayName: 'Height',
		name: 'Height',
		type: 'number',
		default: 0,
		description: 'Article height (mm)',
	},
	{
		displayName: 'Housework',
		name: 'Housework',
		type: 'boolean',
		default: false,
		description: 'ROT/RUT housework article',
	},
	{
		displayName: 'Housework Type',
		name: 'HouseworkType',
		type: 'string',
		default: '',
		description: 'Housework type code for ROT/RUT deductions',
	},
	{
		displayName: 'Manufacturer',
		name: 'Manufacturer',
		type: 'string',
		default: '',
		description: 'Manufacturer name',
	},
	{
		displayName: 'Manufacturer Article Number',
		name: 'ManufacturerArticleNumber',
		type: 'string',
		default: '',
		description: 'Manufacturer article number',
	},
	{
		displayName: 'Note',
		name: 'Note',
		type: 'string',
		default: '',
		description: 'Internal note',
	},
	{
		displayName: 'Purchase Account',
		name: 'PurchaseAccount',
		type: 'number',
		default: 0,
		description: 'Purchase account number',
	},
	{
		displayName: 'Purchase Price',
		name: 'PurchasePrice',
		type: 'number',
		default: 0,
		description: 'Purchase price',
	},
	{
		displayName: 'Quantity In Stock',
		name: 'QuantityInStock',
		type: 'number',
		default: 0,
		description: 'Current quantity in stock',
	},
	{
		displayName: 'Sales Account',
		name: 'SalesAccount',
		type: 'number',
		default: 0,
		description: 'Sales revenue account',
	},
	{
		displayName: 'Stock Goods',
		name: 'StockGoods',
		type: 'boolean',
		default: false,
		description: 'Whether article is stocked',
	},
	{
		displayName: 'Stock Place',
		name: 'StockPlace',
		type: 'string',
		default: '',
		description: 'Location in warehouse',
	},
	{
		displayName: 'Stock Warning',
		name: 'StockWarning',
		type: 'number',
		default: 0,
		description: 'Low stock warning level',
	},
	{
		displayName: 'Supplier Number',
		name: 'SupplierNumber',
		type: 'string',
		default: '',
		description: 'Supplier reference',
	},
	{
		displayName: 'Type',
		name: 'Type',
		type: 'options',
		options: [
			{ name: 'Service', value: 'SERVICE' },
			{ name: 'Stock', value: 'STOCK' },
		],
		default: 'STOCK',
		description: 'Article type',
	},
	{
		displayName: 'Unit',
		name: 'Unit',
		type: 'string',
		default: '',
		description: 'Unit of measure (e.g., pcs, h, kg)',
	},
	{
		displayName: 'VAT',
		name: 'VAT',
		type: 'number',
		default: 0,
		description: 'VAT percentage',
	},
	{
		displayName: 'Webshop Article',
		name: 'WebshopArticle',
		type: 'boolean',
		default: false,
		description: 'Whether visible in webshop',
	},
	{
		displayName: 'Weight',
		name: 'Weight',
		type: 'number',
		default: 0,
		description: 'Article weight (g)',
	},
	{
		displayName: 'Width',
		name: 'Width',
		type: 'number',
		default: 0,
		description: 'Article width (mm)',
	},
];

export const articleFields: INodeProperties[] = [
	// ---------------------------------------------------------------
	// A. Article Number (shared by get, update, delete)
	// ---------------------------------------------------------------
	{
		displayName: 'Article Number',
		name: 'articleNumber',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['article'],
				operation: ['get', 'update', 'delete'],
			},
		},
		default: '',
		description: 'The article number in Fortnox',
	},

	// ---------------------------------------------------------------
	// B. Description (required for create)
	// ---------------------------------------------------------------
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['article'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'Article description',
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
				resource: ['article'],
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
				resource: ['article'],
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
				resource: ['article'],
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
				description: 'Filter articles by status',
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
					{ name: 'Article Number', value: 'articlenumber' },
					{ name: 'Quantity In Stock', value: 'quantityinstock' },
					{ name: 'Reserved Quantity', value: 'reservedquantity' },
					{ name: 'Stock Value', value: 'stockvalue' },
				],
				default: 'articlenumber',
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
				resource: ['article'],
				operation: ['create'],
			},
		},
		default: {},
		options: commonArticleFields,
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
				resource: ['article'],
				operation: ['update'],
			},
		},
		default: {},
		options: [...commonArticleFields],
	},
];
