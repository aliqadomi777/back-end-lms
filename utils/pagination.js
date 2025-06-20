import { AppError } from './AppError.js';

/**
 * Default pagination configuration
 */
const DEFAULT_CONFIG = {
  page: 1,
  limit: 10,
  maxLimit: 100,
  defaultSort: 'createdAt',
  defaultOrder: 'DESC'
};

/**
 * Parse and validate pagination parameters
 * @param {Object} query - Request query parameters
 * @param {Object} options - Pagination options
 * @returns {Object} Parsed pagination parameters
 */
export const parsePaginationParams = (query = {}, options = {}) => {
  const config = { ...DEFAULT_CONFIG, ...options };
  
  // Parse page number
  let page = parseInt(query.page) || config.page;
  if (page < 1) {
    page = 1;
  }

  // Parse limit
  let limit = parseInt(query.limit) || config.limit;
  if (limit < 1) {
    limit = config.limit;
  }
  if (limit > config.maxLimit) {
    limit = config.maxLimit;
  }

  // Calculate offset
  const offset = (page - 1) * limit;

  // Parse sort parameters
  const sortBy = query.sortBy || config.defaultSort;
  const sortOrder = (query.sortOrder || config.defaultOrder).toUpperCase();
  
  // Validate sort order
  if (!['ASC', 'DESC'].includes(sortOrder)) {
    throw new AppError('Sort order must be ASC or DESC', 400);
  }

  return {
    page,
    limit,
    offset,
    sortBy,
    sortOrder
  };
};

/**
 * Create pagination metadata
 * @param {number} totalCount - Total number of records
 * @param {Object} params - Pagination parameters
 * @returns {Object} Pagination metadata
 */
export const createPaginationMeta = (totalCount, params) => {
  const { page, limit } = params;
  const totalPages = Math.ceil(totalCount / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    currentPage: page,
    totalPages,
    totalCount,
    limit,
    hasNextPage,
    hasPrevPage,
    nextPage: hasNextPage ? page + 1 : null,
    prevPage: hasPrevPage ? page - 1 : null
  };
};

/**
 * Create paginated response
 * @param {Array} data - Array of data items
 * @param {number} totalCount - Total number of records
 * @param {Object} params - Pagination parameters
 * @param {Object} additionalMeta - Additional metadata
 * @returns {Object} Paginated response
 */
export const createPaginatedResponse = (data, totalCount, params, additionalMeta = {}) => {
  const pagination = createPaginationMeta(totalCount, params);
  
  return {
    data,
    pagination,
    meta: {
      ...additionalMeta,
      timestamp: new Date().toISOString()
    }
  };
};

/**
 * Generate Sequelize pagination options
 * @param {Object} params - Pagination parameters
 * @param {Array} allowedSortFields - Allowed fields for sorting
 * @returns {Object} Sequelize options
 */
export const getSequelizePaginationOptions = (params, allowedSortFields = []) => {
  const { limit, offset, sortBy, sortOrder } = params;
  
  const options = {
    limit,
    offset
  };

  // Add sorting if sortBy is in allowed fields
  if (allowedSortFields.length === 0 || allowedSortFields.includes(sortBy)) {
    options.order = [[sortBy, sortOrder]];
  }

  return options;
};

/**
 * Generate MongoDB pagination options
 * @param {Object} params - Pagination parameters
 * @param {Array} allowedSortFields - Allowed fields for sorting
 * @returns {Object} MongoDB options
 */
export const getMongoDBPaginationOptions = (params, allowedSortFields = []) => {
  const { limit, offset, sortBy, sortOrder } = params;
  
  const options = {
    limit,
    skip: offset
  };

  // Add sorting if sortBy is in allowed fields
  if (allowedSortFields.length === 0 || allowedSortFields.includes(sortBy)) {
    options.sort = {
      [sortBy]: sortOrder === 'ASC' ? 1 : -1
    };
  }

  return options;
};

/**
 * Paginate array data (for in-memory pagination)
 * @param {Array} data - Array of data
 * @param {Object} params - Pagination parameters
 * @returns {Object} Paginated result
 */
/**
 * Simple paginate function for backward compatibility
 * @param {Array} data - Array of data to paginate
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Object} Paginated result
 */
export const paginate = (data, page = 1, limit = 10) => {
  const totalCount = data.length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedData = data.slice(startIndex, endIndex);
  
  const totalPages = Math.ceil(totalCount / limit);
  
  return {
    data: paginatedData,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };
};

export const paginateArray = (data, params) => {
  const { page, limit, sortBy, sortOrder } = params;
  const totalCount = data.length;
  
  // Sort data if sortBy is provided
  let sortedData = [...data];
  if (sortBy) {
    sortedData.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      
      if (aValue < bValue) {
        return sortOrder === 'ASC' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortOrder === 'ASC' ? 1 : -1;
      }
      return 0;
    });
  }
  
  // Paginate
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedData = sortedData.slice(startIndex, endIndex);
  
  return createPaginatedResponse(paginatedData, totalCount, params);
};

/**
 * Create search and filter options
 * @param {Object} query - Request query parameters
 * @param {Array} searchFields - Fields to search in
 * @param {Object} filterFields - Field mappings for filtering
 * @returns {Object} Search and filter options
 */
export const createSearchAndFilterOptions = (query = {}, searchFields = [], filterFields = {}) => {
  const options = {
    search: {},
    filters: {}
  };

  // Handle search
  if (query.search && searchFields.length > 0) {
    options.search = {
      term: query.search.trim(),
      fields: searchFields
    };
  }

  // Handle filters
  Object.keys(filterFields).forEach(key => {
    if (query[key] !== undefined && query[key] !== '') {
      const fieldConfig = filterFields[key];
      
      if (typeof fieldConfig === 'string') {
        // Simple field mapping
        options.filters[fieldConfig] = query[key];
      } else if (typeof fieldConfig === 'object') {
        // Complex field configuration
        const { field, type = 'exact', transform } = fieldConfig;
        let value = query[key];
        
        // Apply transformation if provided
        if (transform && typeof transform === 'function') {
          value = transform(value);
        }
        
        // Apply filter type
        switch (type) {
          case 'exact':
            options.filters[field] = value;
            break;
          case 'like':
            options.filters[field] = { like: `%${value}%` };
            break;
          case 'in':
            options.filters[field] = { in: Array.isArray(value) ? value : [value] };
            break;
          case 'range':
            if (value.min !== undefined || value.max !== undefined) {
              options.filters[field] = {};
              if (value.min !== undefined) options.filters[field].gte = value.min;
              if (value.max !== undefined) options.filters[field].lte = value.max;
            }
            break;
          case 'date':
            options.filters[field] = new Date(value);
            break;
          case 'boolean':
            options.filters[field] = value === 'true' || value === true;
            break;
          default:
            options.filters[field] = value;
        }
      }
    }
  });

  return options;
};

/**
 * Generate Sequelize where clause from search and filter options
 * @param {Object} searchAndFilterOptions - Search and filter options
 * @param {Object} Op - Sequelize operators
 * @returns {Object} Sequelize where clause
 */
export const generateSequelizeWhereClause = (searchAndFilterOptions, Op) => {
  const { search, filters } = searchAndFilterOptions;
  const where = {};

  // Add search conditions
  if (search.term && search.fields.length > 0) {
    const searchConditions = search.fields.map(field => ({
      [field]: {
        [Op.iLike]: `%${search.term}%`
      }
    }));
    
    where[Op.or] = searchConditions;
  }

  // Add filter conditions
  Object.keys(filters).forEach(field => {
    const value = filters[field];
    
    if (typeof value === 'object' && value !== null) {
      if (value.like) {
        where[field] = { [Op.iLike]: value.like };
      } else if (value.in) {
        where[field] = { [Op.in]: value.in };
      } else if (value.gte !== undefined || value.lte !== undefined) {
        where[field] = {};
        if (value.gte !== undefined) where[field][Op.gte] = value.gte;
        if (value.lte !== undefined) where[field][Op.lte] = value.lte;
      } else {
        where[field] = value;
      }
    } else {
      where[field] = value;
    }
  });

  return where;
};

/**
 * Paginate with search and filters
 * @param {Object} model - Database model
 * @param {Object} query - Request query parameters
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Paginated result with search and filters
 */
export const paginateWithSearchAndFilters = async (model, query, options = {}) => {
  const {
    searchFields = [],
    filterFields = {},
    allowedSortFields = [],
    include = [],
    attributes,
    defaultSort = 'createdAt',
    defaultOrder = 'DESC'
  } = options;

  // Parse pagination parameters
  const paginationParams = parsePaginationParams(query, {
    defaultSort,
    defaultOrder
  });

  // Create search and filter options
  const searchAndFilterOptions = createSearchAndFilterOptions(query, searchFields, filterFields);

  // Generate where clause (this would need to be adapted based on your ORM)
  // For Sequelize:
  // const where = generateSequelizeWhereClause(searchAndFilterOptions, Op);
  
  // Get pagination options
  const paginationOptions = getSequelizePaginationOptions(paginationParams, allowedSortFields);

  // Build query options
  const queryOptions = {
    ...paginationOptions,
    // where, // Uncomment when using with Sequelize
    include,
    attributes
  };

  // Execute query (this would need to be adapted based on your ORM)
  // const { rows: data, count: totalCount } = await model.findAndCountAll(queryOptions);
  
  // For now, return the structure that would be used
  return {
    queryOptions,
    paginationParams,
    searchAndFilterOptions
  };
};

/**
 * Validate pagination parameters
 * @param {Object} params - Pagination parameters
 * @param {Object} options - Validation options
 * @returns {boolean} Is valid
 */
export const validatePaginationParams = (params, options = {}) => {
  const { maxLimit = 100, allowedSortFields = [] } = options;
  const { page, limit, sortBy } = params;

  if (page < 1) {
    throw new AppError('Page number must be greater than 0', 400);
  }

  if (limit < 1 || limit > maxLimit) {
    throw new AppError(`Limit must be between 1 and ${maxLimit}`, 400);
  }

  if (allowedSortFields.length > 0 && !allowedSortFields.includes(sortBy)) {
    throw new AppError(`Sort field '${sortBy}' is not allowed. Allowed fields: ${allowedSortFields.join(', ')}`, 400);
  }

  return true;
};

/**
 * Create pagination links
 * @param {Object} pagination - Pagination metadata
 * @param {string} baseUrl - Base URL for links
 * @param {Object} queryParams - Additional query parameters
 * @returns {Object} Pagination links
 */
export const createPaginationLinks = (pagination, baseUrl, queryParams = {}) => {
  const { currentPage, totalPages, hasNextPage, hasPrevPage } = pagination;
  
  const createUrl = (page) => {
    const params = new URLSearchParams({ ...queryParams, page: page.toString() });
    return `${baseUrl}?${params.toString()}`;
  };

  const links = {
    self: createUrl(currentPage),
    first: createUrl(1),
    last: createUrl(totalPages)
  };

  if (hasPrevPage) {
    links.prev = createUrl(currentPage - 1);
  }

  if (hasNextPage) {
    links.next = createUrl(currentPage + 1);
  }

  return links;
};

/**
 * Create cursor-based pagination
 * @param {Array} data - Array of data items
 * @param {Object} params - Pagination parameters
 * @param {string} cursorField - Field to use as cursor
 * @returns {Object} Cursor-based pagination result
 */
export const createCursorPagination = (data, params, cursorField = 'id') => {
  const { limit } = params;
  const hasMore = data.length > limit;
  
  // Remove extra item if we have more
  if (hasMore) {
    data.pop();
  }

  const cursors = {
    hasMore,
    nextCursor: hasMore && data.length > 0 ? data[data.length - 1][cursorField] : null,
    prevCursor: data.length > 0 ? data[0][cursorField] : null
  };

  return {
    data,
    cursors,
    meta: {
      count: data.length,
      hasMore,
      timestamp: new Date().toISOString()
    }
  };
};

export default {
  parsePaginationParams,
  createPaginatedResponse,
  getMongoDBPaginationOptions,
  paginate,
  paginateArray,
  createSearchAndFilterOptions,
  generateSequelizeWhereClause,
  paginateWithSearchAndFilters,
  validatePaginationParams,
  createPaginationLinks,
  createCursorPagination,
  DEFAULT_CONFIG
};