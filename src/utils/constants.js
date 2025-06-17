/**
 * Author: ewen2seong@gmail.com
 * License: Completely free (完全免费)
 * Commercial use: Prohibited (禁止商业使用)
 */

// 默认连接配置
export const DEFAULT_CONNECTION = {
  ip: '127.0.0.1',
  port: 8000,
  tenant: 'default_tenant',
  database: 'default_database'
}

// 视图类型
export const VIEW_TYPES = {
  DOCUMENT_QUERY: 'document-query',
  SEMANTIC_SEARCH: 'semantic-search',
  DOCUMENT_UPLOAD: 'document-upload',
  COLLECTION_MANAGEMENT: 'collection-management'
}

// 连接状态
export const CONNECTION_STATUS = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ERROR: 'error'
}

// 分页配置
export const PAGINATION = {
  PAGE_SIZE: 10,
  DEFAULT_PAGE: 1
}

// 语义搜索配置
export const SEARCH_CONFIG = {
  DEFAULT_N_RESULTS: 50
}

// 文档类型
export const DOCUMENT_TYPES = {
  JAVA: 'java',
  DOC: 'doc',
  OTHER: 'other'
}

// 文档归属
export const DOCUMENT_ATTRIBUTION = {
  OTA: 'OTA',
  OTHER: 'other'
}

// API 端点
export const API_ENDPOINTS = {
  CONNECT: '/api/connect',
  COLLECTIONS: '/api/v2/tenants',
  DOCUMENTS: '/api/documents',
  SEARCH: '/api/search',
  UPLOAD: '/api/upload'
} 