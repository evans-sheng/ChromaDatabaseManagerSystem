/**
 * Author: ewen2seong@gmail.com
 * License: Completely free (完全免费)
 * Commercial use: Prohibited (禁止商业使用)
 */

import api, { setBaseURL } from './api.js'
import { mockData, mockDelay } from './mock.js'
import { API_ENDPOINTS } from '../utils/constants.js'
import { isValidIP, isValidPort, generateUUID } from '../utils/helpers.js'
import llmService from './llm.js'

// 是否使用Mock数据
const USE_MOCK = false

class ChromaDBService {
  constructor() {
    this.baseURL = 'http://localhost:8000'
    this.connectionTimeout = 10000 // 10秒超时
    
    // 缓存管理
    this.collectionDataCache = new Map() // 集合数据缓存
    this.collectionCountCache = new Map() // 集合数量缓存
    this.cacheTimestamps = new Map() // 缓存时间戳
    this.cacheTTL = 5 * 60 * 1000 // 缓存5分钟
    
    // 防重复调用管理
    this.activeRequests = new Map() // 正在进行的请求
    this.lastRequestTime = new Map() // 上次请求时间
    this.requestThrottle = 1000 // 1秒内不允许重复相同请求

    this.isConnected = false
  }

  // 设置连接配置
  setConnection(config) {
    this.baseURL = `http://${config.ip}:${config.port}`
    setBaseURL(this.baseURL)
  }

  // 测试连接
  async testConnection(config) {
    if (USE_MOCK) {
      await mockDelay(1000)
      // 模拟连接成功
      this.isConnected = true
      return {
        success: true,
        message: '连接成功',
        version: '0.4.15',
        status: 'healthy'
      }
    }

    try {
      this.setConnection(config)
      const response = await api.get('/api/heartbeat')
      this.isConnected = true
      return {
        success: true,
        message: '连接成功',
        ...response
      }
    } catch (error) {
      this.isConnected = false
      throw {
        success: false,
        message: '连接失败: ' + error.message
      }
    }
  }

  // 获取集合列表
  async getCollections(tenant = 'default_tenant', database = 'default_database') {
    if (USE_MOCK) {
      await mockDelay()
      return mockData.generateCollections()
    }

    try {
      // 使用v2 API格式的完整路径
      const apiPath = `/api/v2/tenants/${tenant}/databases/${database}/collections`
      const response = await api.get(apiPath)
      return response
    } catch (error) {
      throw error
    }
  }

  // 获取集合详情
  async getCollectionInfo(collectionName, tenant = 'default_tenant', database = 'default_database') {
    if (USE_MOCK) {
      await mockDelay()
      const collections = mockData.generateCollections()
      return collections.find(col => col.name === collectionName) || collections[0]
    }

    try {
      // 使用v2 API格式的完整路径
      const apiPath = `/api/v2/tenants/${tenant}/databases/${database}/collections/${collectionName}`
      const response = await api.get(apiPath)
      return response
    } catch (error) {
      throw error
    }
  }

  // 获取文档列表
  async getDocuments(collectionId, nResults = 1000, tenant = 'default_tenant', database = 'default_database') {
    // 构建缓存键和请求键
    const cacheKey = `${tenant}_${database}_${collectionId}`
    const requestKey = `getDocuments_${cacheKey}_${nResults}`
    
    // 防重复调用检查
    const now = Date.now()
    const lastTime = this.lastRequestTime.get(requestKey) || 0
    if (this.activeRequests.has(requestKey)) {
      console.log('请求正在进行中，等待结果:', requestKey)
      return await this.activeRequests.get(requestKey)
    }
    if (now - lastTime < this.requestThrottle) {
      console.log('请求过于频繁，使用缓存:', requestKey)
      if (this.collectionDataCache.has(cacheKey)) {
        return this.collectionDataCache.get(cacheKey)
      }
    }
    
    // 检查缓存中是否已有数据且未过期
    const cacheTime = this.cacheTimestamps.get(cacheKey) || 0
    if (this.collectionDataCache.has(cacheKey) && (now - cacheTime < this.cacheTTL)) {
      console.log('使用缓存的集合数据:', cacheKey)
      return this.collectionDataCache.get(cacheKey)
    }

    if (USE_MOCK) {
      await mockDelay()
      const mockResult = mockData.generateDocuments(1, nResults)
      // 缓存mock数据
      this.collectionDataCache.set(cacheKey, mockResult)
      this.cacheTimestamps.set(cacheKey, now)
      return mockResult
    }

    // 创建请求Promise并缓存
    const requestPromise = this._performGetDocuments(collectionId, nResults, tenant, database, cacheKey)
    this.activeRequests.set(requestKey, requestPromise)
    this.lastRequestTime.set(requestKey, now)

    try {
      const result = await requestPromise
      return result
    } finally {
      // 清除活跃请求记录
      this.activeRequests.delete(requestKey)
    }
  }

  // 实际执行API请求的方法
  async _performGetDocuments(collectionId, nResults, tenant, database, cacheKey) {
    try {
      console.log('调用API获取集合数据:', cacheKey)
      // 构建API路径，使用集合ID而不是名称
      const apiPath = `/api/v2/tenants/${tenant}/databases/${database}/collections/${collectionId}/get`
      
      // 如果是本地服务，使用代理
      const isLocal = this.baseURL.includes('localhost') || this.baseURL.includes('127.0.0.1')
      
      let response
      if (isLocal && this.baseURL.includes(':8000')) {
        // 使用代理访问本地服务
        response = await api.post(apiPath, {
          n_results: nResults
        })
      } else {
        // 直接访问远程服务
        const fullUrl = `${this.baseURL}${apiPath}`
        response = await api.post(fullUrl, {
          n_results: nResults
        })
      }
      
      // 缓存API响应数据
      this.collectionDataCache.set(cacheKey, response)
      this.cacheTimestamps.set(cacheKey, Date.now())
      return response
    } catch (error) {
      throw error
    }
  }

  // 检查集合数据是否已缓存
  isCollectionCached(collectionId, tenant = 'default_tenant', database = 'default_database') {
    const cacheKey = `${tenant}_${database}_${collectionId}`
    return this.collectionDataCache.has(cacheKey)
  }

  // 清除特定集合的缓存
  clearCollectionCache(collectionId, tenant = 'default_tenant', database = 'default_database') {
    const cacheKey = `${tenant}_${database}_${collectionId}`
    this.collectionDataCache.delete(cacheKey)
    console.log('已清除集合缓存:', cacheKey)
  }

  // 清除所有缓存
  clearAllCache() {
    this.collectionDataCache.clear()
    this.collectionCountCache.clear()
    this.cacheTimestamps.clear()
    this.activeRequests.clear()
    this.lastRequestTime.clear()
    console.log('已清除所有缓存和活跃请求')
  }

  // 获取集合文档数量
  async getCollectionCount(collectionId, tenant = 'default_tenant', database = 'default_database') {
    if (USE_MOCK) {
      await mockDelay()
      return Math.floor(Math.random() * 2000) + 500 // 模拟500-2500之间的随机数量
    }

    try {
      // 构建API路径
      const apiPath = `/api/v2/tenants/${tenant}/databases/${database}/collections/${collectionId}/count`
      
      // 如果是本地服务，使用代理
      const isLocal = this.baseURL.includes('localhost') || this.baseURL.includes('127.0.0.1')
      
      let response
      if (isLocal && this.baseURL.includes(':8000')) {
        // 使用代理访问本地服务
        response = await api.get(apiPath)
      } else {
        // 直接访问远程服务
        const fullUrl = `${this.baseURL}${apiPath}`
        response = await api.get(fullUrl)
      }
      
      // 返回数量，API可能返回数字或包含count字段的对象
      return typeof response === 'number' ? response : (response.count || response.total || 0)
    } catch (error) {
      console.warn('获取集合文档数量失败:', error.message)
      return 0
    }
  }

  // 语义搜索
  async semanticSearch(params) {
    const {
      query,
      collectionId,
      nResults = 50,
      metadataFilter = {},
      tenant = 'default_tenant',
      database = 'default_database'
    } = params

    if (USE_MOCK) {
      await mockDelay(800)
      return mockData.generateSearchResults(query, nResults)
    }

    try {
      console.log('开始语义搜索，查询文本:', query)
      
      let queryEmbedding
      try {
        // 尝试使用LLM服务生成查询文本的嵌入向量
        queryEmbedding = await llmService.generateEmbedding(query)
        console.log('生成查询嵌入向量成功，维度:', queryEmbedding.length)
      } catch (llmError) {
        console.warn('LLM服务不可用，将使用query_texts代替:', llmError.message)
        
        // 如果LLM服务不可用，回退到使用query_texts
        const requestData = {
          query_texts: [query],
          n_results: nResults,
          where: Object.keys(metadataFilter).length > 0 ? metadataFilter : undefined,
          include: ['documents', 'metadatas', 'distances', 'embeddings']
        }

        // 构建API路径 - 使用正确的ChromaDB v2 API格式
        const apiPath = `/api/v2/tenants/${tenant}/databases/${database}/collections/${collectionId}/query`
        
        console.log('使用query_texts调用ChromaDB查询API:', apiPath)
        
        // 如果是本地服务，使用代理
        const isLocal = this.baseURL.includes('localhost') || this.baseURL.includes('127.0.0.1')
        
        let response
        if (isLocal && this.baseURL.includes(':8000')) {
          // 使用代理访问本地服务
          response = await api.post(apiPath, requestData)
        } else {
          // 直接访问远程服务
          const fullUrl = `${this.baseURL}${apiPath}`
          response = await api.post(fullUrl, requestData)
        }
        
        console.log('ChromaDB查询响应:', response)
        
        // 处理响应数据，转换为前端需要的格式
        const results = this.transformSearchResults(response, query)
        
        return {
          results,
          query,
          total: results.length
        }
      }
      
      // 构建请求数据，使用query_embeddings
      const requestData = {
        query_embeddings: [queryEmbedding],
        n_results: nResults,
        where: Object.keys(metadataFilter).length > 0 ? metadataFilter : undefined,
        include: ['documents', 'metadatas', 'distances', 'embeddings']
      }

      // 构建API路径 - 使用正确的ChromaDB v2 API格式
      const apiPath = `/api/v2/tenants/${tenant}/databases/${database}/collections/${collectionId}/query`
      
      console.log('调用ChromaDB查询API:', apiPath)
      console.log('请求参数:', {
        ...requestData,
        query_embeddings: `[嵌入向量，维度: ${queryEmbedding.length}]` // 不打印完整向量，太长了
      })

      // 如果是本地服务，使用代理
      const isLocal = this.baseURL.includes('localhost') || this.baseURL.includes('127.0.0.1')
      
      let response
      if (isLocal && this.baseURL.includes(':8000')) {
        // 使用代理访问本地服务
        response = await api.post(apiPath, requestData)
      } else {
        // 直接访问远程服务
        const fullUrl = `${this.baseURL}${apiPath}`
        response = await api.post(fullUrl, requestData)
      }
      
      console.log('ChromaDB查询响应:', response)
      
      // 处理响应数据，转换为前端需要的格式
      const results = this.transformSearchResults(response, query)
      
      return {
        results,
        query,
        total: results.length
      }
      
    } catch (error) {
      console.error('语义搜索失败:', error)
      throw error
    }
  }

  /**
   * 转换ChromaDB查询结果为前端需要的格式
   * @param {Object} response - ChromaDB API响应
   * @param {string} query - 原始查询文本
   * @returns {Array} - 转换后的搜索结果
   */
  transformSearchResults(response, query) {
    if (!response || !response.ids || !Array.isArray(response.ids) || response.ids.length === 0) {
      return []
    }

    // ChromaDB返回的数据结构是二维数组，第一维是查询批次，第二维是结果列表
    // 因为我们只发送一个查询，所以取每个字段的第一个元素[0]，得到结果列表
    const ids = response.ids[0] || []
    const documents = response.documents && response.documents[0] ? response.documents[0] : []
    const distances = response.distances && response.distances[0] ? response.distances[0] : []
    const embeddings = response.embeddings && response.embeddings[0] ? response.embeddings[0] : []
    const metadatas = response.metadatas && response.metadatas[0] ? response.metadatas[0] : []
    
    const results = []

    // 确保所有数组长度一致，以ids的长度为准
    const length = ids.length
    
    for (let i = 0; i < length; i++) {
      results.push({
        id: ids[i] || `result_${i}`,
        content: documents[i] || '',
        document: documents[i] || '', // 用作完整文档内容
        distance: distances[i] !== undefined ? 
          (typeof distances[i] === 'number' ? distances[i] : parseFloat(distances[i]) || 1.0) : 1.0,
        vector: embeddings[i] || null,
        metadata: metadatas[i] || {}
      })
    }

    // 按距离排序（距离越小越相关）
    results.sort((a, b) => a.distance - b.distance)
    
    console.log(`转换搜索结果完成，共 ${results.length} 条`)
    return results
  }

  // 文档上传
  async uploadDocument(params) {
    const {
      file,
      collectionId,
      chunkSize = 1000,
      chunkOverlap = 200,
      metadata = {},
      tenant = 'default_tenant',
      database = 'default_database'
    } = params

    if (USE_MOCK) {
      await mockDelay(2000)
      return mockData.generateUploadResult(file.name, chunkSize)
    }

    try {
      // 构建API路径 - 使用ChromaDB v2 API格式
      const apiPath = `/api/v2/tenants/${tenant}/databases/${database}/collections/${collectionId}/upsert`
      
      const formData = new FormData()
      formData.append('file', file)
      formData.append('chunk_size', chunkSize.toString())
      formData.append('chunk_overlap', chunkOverlap.toString())
      formData.append('metadata', JSON.stringify(metadata))

      console.log('使用ChromaDB v2 API上传文档:', apiPath)
      
      // 如果是本地服务，使用代理
      const isLocal = this.baseURL.includes('localhost') || this.baseURL.includes('127.0.0.1')
      
      let response
      if (isLocal && this.baseURL.includes(':8000')) {
        // 使用代理访问本地服务
        response = await api.post(apiPath, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
      } else {
        // 直接访问远程服务
        const fullUrl = `${this.baseURL}${apiPath}`
        response = await api.post(fullUrl, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
      }
      
      return response
    } catch (error) {
      throw error
    }
  }

  // 获取连接状态
  getConnectionStatus() {
    return this.isConnected
  }

  /**
   * JSON格式的文档上传到集合 (upsert)
   * @param {Object} params - 上传参数
   * @param {string} params.collectionId - 集合ID
   * @param {Array<string>} params.documents - 文档内容数组
   * @param {Array<Object>} params.metadatas - 元数据数组（可选）
   * @param {Array<string>} params.ids - 文档ID数组（可选，会自动生成UUID）
   * @param {Array<Array<number>>} params.embeddings - 嵌入向量数组（可选，会自动生成）
   * @param {string} params.tenant - 租户名称
   * @param {string} params.database - 数据库名称
   * @returns {Promise<Object>} 上传结果
   */
  async upsertDocuments(params) {
    const {
      collectionId,
      documents = [],
      metadatas = [],
      ids = [],
      embeddings = [],
      tenant = 'default_tenant',
      database = 'default_database'
    } = params

    if (!documents || documents.length === 0) {
      throw new Error('文档内容不能为空')
    }

    if (USE_MOCK) {
      await mockDelay(2000)
      return mockData.generateUpsertResult(documents, metadatas)
    }

    try {
      console.log('开始JSON格式文档上传:', {
        collectionId,
        documentCount: documents.length,
        hasCustomIds: ids.length > 0,
        hasCustomEmbeddings: embeddings.length > 0
      })

      // 准备IDs - 如果没有提供则生成UUID
      const finalIds = ids.length > 0 ? ids : documents.map(() => generateUUID())

      // 准备嵌入向量 - 如果没有提供则调用LLM生成
      let finalEmbeddings = embeddings
      if (embeddings.length === 0) {
        console.log('开始生成文档嵌入向量...')
        finalEmbeddings = []
        
        for (let i = 0; i < documents.length; i++) {
          try {
            const embedding = await llmService.generateEmbedding(documents[i])
            finalEmbeddings.push(embedding)
            console.log(`文档 ${i + 1}/${documents.length} 嵌入向量生成完成`)
          } catch (error) {
            console.error(`文档 ${i + 1} 嵌入向量生成失败:`, error)
            throw new Error(`生成文档 ${i + 1} 的嵌入向量失败: ${error.message}`)
          }
        }
      }

      // 准备元数据 - 如果数量不足则补充空对象
      const finalMetadatas = metadatas.length > 0 ? metadatas : documents.map(() => ({}))
      
      // 确保数组长度一致
      if (finalIds.length !== documents.length || 
          finalEmbeddings.length !== documents.length || 
          finalMetadatas.length !== documents.length) {
        throw new Error('IDs、嵌入向量、元数据和文档数组长度必须一致')
      }

      // 构建请求体
      const requestBody = {
        ids: finalIds,
        embeddings: finalEmbeddings,
        metadatas: finalMetadatas,
        documents: documents,
        uris: null
      }

      // 构建API路径
      const apiPath = `/api/v2/tenants/${tenant}/databases/${database}/collections/${collectionId}/upsert`
      
      console.log('调用ChromaDB JSON upsert API:', apiPath)
      console.log('请求数据结构:', {
        ids: requestBody.ids.length,
        embeddings: `${requestBody.embeddings.length} vectors (${requestBody.embeddings[0]?.length || 0} dimensions)`,
        metadatas: requestBody.metadatas.length,
        documents: requestBody.documents.length
      })

      // 如果是本地服务，使用代理
      const isLocal = this.baseURL.includes('localhost') || this.baseURL.includes('127.0.0.1')
      
      let response
      if (isLocal && this.baseURL.includes(':8000')) {
        // 使用代理访问本地服务
        response = await api.post(apiPath, requestBody, {
          headers: {
            'Content-Type': 'application/json'
          }
        })
      } else {
        // 直接访问远程服务
        const fullUrl = `${this.baseURL}${apiPath}`
        response = await api.post(fullUrl, requestBody, {
          headers: {
            'Content-Type': 'application/json'
          }
        })
      }
      
      console.log('JSON upsert 上传响应:', response)
      
      return {
        success: true,
        documentCount: documents.length,
        ids: finalIds,
        message: '文档上传成功'
      }
      
    } catch (error) {
      console.error('JSON格式文档上传失败:', error)
      throw error
    }
  }

  /**
   * 删除文档
   * @param {Object} params - 删除参数
   * @param {string} params.collectionId - 集合ID
   * @param {Array<string>} params.ids - 要删除的文档ID数组
   * @param {string} params.tenant - 租户名称
   * @param {string} params.database - 数据库名称
   * @returns {Promise<Object>} 删除结果
   */
  async deleteDocuments(params) {
    const {
      collectionId,
      ids = [],
      tenant = 'default_tenant',
      database = 'default_database'
    } = params

    if (!ids || ids.length === 0) {
      throw new Error('文档ID不能为空')
    }

    if (USE_MOCK) {
      await mockDelay(500)
      return {
        success: true,
        deletedCount: ids.length,
        message: '文档删除成功'
      }
    }

    try {
      console.log('开始删除文档:', {
        collectionId,
        ids,
        count: ids.length
      })

      // 构建请求体
      const requestBody = {
        ids: ids,
        where: null,
        where_document: null
      }

      // 构建API路径
      const apiPath = `/api/v2/tenants/${tenant}/databases/${database}/collections/${collectionId}/delete`
      
      console.log('调用ChromaDB删除API:', apiPath)
      console.log('请求数据:', requestBody)

      // 如果是本地服务，使用代理
      const isLocal = this.baseURL.includes('localhost') || this.baseURL.includes('127.0.0.1')
      
      let response
      if (isLocal && this.baseURL.includes(':8000')) {
        // 使用代理访问本地服务
        response = await api.post(apiPath, requestBody, {
          headers: {
            'Content-Type': 'application/json'
          }
        })
      } else {
        // 直接访问远程服务
        const fullUrl = `${this.baseURL}${apiPath}`
        response = await api.post(fullUrl, requestBody, {
          headers: {
            'Content-Type': 'application/json'
          }
        })
      }
      
      console.log('删除文档响应:', response)
      
      // 删除成功后清除相关缓存
      this.clearCollectionCache(collectionId, tenant, database)
      
      return {
        success: true,
        deletedCount: ids.length,
        message: '文档删除成功'
      }
      
    } catch (error) {
      console.error('删除文档失败:', error)
      throw error
    }
  }

  /**
   * 创建或更新集合
   * @param {Object} params - 创建参数
   * @param {string} params.name - 集合名称
   * @param {Object} params.metadata - 元数据（可选）
   * @param {Object} params.configuration - 配置（可选）
   * @param {boolean} params.getOrCreate - 是否获取或创建
   * @param {string} params.tenant - 租户名称
   * @param {string} params.database - 数据库名称
   * @returns {Promise<Object>} 创建结果
   */
  async createCollection(params) {
    const {
      name,
      metadata = null,
      configuration = {
        hnsw: null,
        spann: null,
        embedding_function: {
          name: "default",
          type: "known",
          config: {}
        }
      },
      getOrCreate = true,
      tenant = 'default_tenant',
      database = 'default_database'
    } = params

    if (!name || !name.trim()) {
      throw new Error('集合名称不能为空')
    }

    if (USE_MOCK) {
      await mockDelay(1000)
      return {
        success: true,
        collection: {
          id: generateUUID(),
          name: name.trim(),
          metadata,
          configuration,
          count: 0
        },
        message: '集合创建成功'
      }
    }

    try {
      console.log('开始创建集合:', {
        name: name.trim(),
        metadata,
        configuration,
        getOrCreate
      })

      // 构建请求体
      const requestBody = {
        name: name.trim(),
        metadata,
        configuration,
        get_or_create: getOrCreate
      }

      // 构建API路径
      const apiPath = `/api/v2/tenants/${tenant}/databases/${database}/collections`
      
      console.log('调用ChromaDB创建集合API:', apiPath)
      console.log('请求数据:', requestBody)

      // 如果是本地服务，使用代理
      const isLocal = this.baseURL.includes('localhost') || this.baseURL.includes('127.0.0.1')
      
      let response
      if (isLocal && this.baseURL.includes(':8000')) {
        // 使用代理访问本地服务
        response = await api.post(apiPath, requestBody, {
          headers: {
            'Content-Type': 'application/json'
          }
        })
      } else {
        // 直接访问远程服务
        const fullUrl = `${this.baseURL}${apiPath}`
        response = await api.post(fullUrl, requestBody, {
          headers: {
            'Content-Type': 'application/json'
          }
        })
      }
      
      console.log('创建集合响应:', response)
      
      return {
        success: true,
        collection: response,
        message: '集合创建成功'
      }
      
    } catch (error) {
      console.error('创建集合失败:', error)
      throw error
    }
  }

  /**
   * 删除集合
   * @param {Object} params - 删除参数
   * @param {string} params.collectionName - 集合名称
   * @param {string} params.tenant - 租户名称
   * @param {string} params.database - 数据库名称
   * @returns {Promise<Object>} 删除结果
   */
  async deleteCollection(params) {
    const {
      collectionName,
      tenant = 'default_tenant',
      database = 'default_database'
    } = params

    if (!collectionName || !collectionName.trim()) {
      throw new Error('集合名称不能为空')
    }

    if (USE_MOCK) {
      await mockDelay(500)
      return {
        success: true,
        message: '集合删除成功'
      }
    }

    try {
      console.log('开始删除集合:', collectionName.trim())

      // 构建API路径
      const apiPath = `/api/v2/tenants/${tenant}/databases/${database}/collections/${encodeURIComponent(collectionName.trim())}`
      
      console.log('调用ChromaDB删除集合API:', apiPath)

      // 如果是本地服务，使用代理
      const isLocal = this.baseURL.includes('localhost') || this.baseURL.includes('127.0.0.1')
      
      let response
      if (isLocal && this.baseURL.includes(':8000')) {
        // 使用代理访问本地服务
        response = await api.delete(apiPath, {
          headers: {
            'Content-Type': 'application/json'
          }
        })
      } else {
        // 直接访问远程服务
        const fullUrl = `${this.baseURL}${apiPath}`
        response = await api.delete(fullUrl, {
          headers: {
            'Content-Type': 'application/json'
          }
        })
      }
      
      console.log('删除集合响应:', response)
      
      return {
        success: true,
        message: '集合删除成功'
      }
      
    } catch (error) {
      console.error('删除集合失败:', error)
      throw error
    }
  }
}

// 创建单例实例
export default new ChromaDBService() 