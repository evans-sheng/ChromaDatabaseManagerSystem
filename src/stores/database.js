/**
 * Author: ewen2seong@gmail.com
 * License: Completely free (完全免费)
 * Commercial use: Prohibited (禁止商业使用)
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import chromadbService from '../services/chromadb.js'
import { VIEW_TYPES, PAGINATION, SEARCH_CONFIG } from '../utils/constants.js'
import { useConnectionStore } from './connection.js'

export const useDatabaseStore = defineStore('database', () => {
  // 状态
  const currentView = ref(VIEW_TYPES.DOCUMENT_QUERY)
  const loading = ref(false)
  const error = ref('')

  // 集合数据缓存状态
  const collectionData = ref(null) // 存储完整的集合数据 {ids, embeddings, documents, metadatas}
  const currentCollectionId = ref(null) // 当前缓存的集合ID

  // 防重复调用状态
  const isRefreshing = ref(false)
  const lastRefreshTime = ref(0)

  // 文档查询相关状态
  const documents = ref([])
  const currentPage = ref(1)
  const pageSize = ref(10)
  const totalDocuments = ref(0)

  // 语义搜索相关状态
  const searchQuery = ref('')
  const searchResults = ref([])
  const searchMetadataFilter = ref({})
  const searchNResults = ref(50)
  const lastSearchQuery = ref('')

  // 文档上传相关状态
  const uploadProgress = ref(0)
  const uploadStatus = ref('idle') // 'idle' | 'uploading' | 'success' | 'error'

  // 计算属性
  const hasDocuments = computed(() => documents.value.length > 0)
  const hasSearchResults = computed(() => searchResults.value.length > 0)
  const totalPages = computed(() => Math.ceil(totalDocuments.value / pageSize.value))
  
  // 分页信息计算属性
  const pagination = computed(() => ({
    current: currentPage.value,
    pageSize: pageSize.value,
    total: totalDocuments.value,
    totalPages: totalPages.value
  }))

  // 动作
  const setCurrentView = (view) => {
    currentView.value = view
    clearError()
  }

  const clearError = () => {
    error.value = ''
  }

  // 从集合数据中提取文档信息
  const extractDocumentsFromCollectionData = (data) => {
    if (!data || !data.ids) {
      return []
    }

    const { ids, embeddings, documents, metadatas } = data
    const extractedDocuments = []

    // 确保所有数组长度一致
    const length = ids.length
    
    for (let i = 0; i < length; i++) {
      extractedDocuments.push({
        id: ids[i] || `doc_${i}`,
        content: documents && documents[i] ? documents[i] : '',
        embedding: embeddings && embeddings[i] ? embeddings[i] : null,
        metadata: metadatas && metadatas[i] ? metadatas[i] : {}
      })
    }

    return extractedDocuments
  }

  // 文档查询相关动作
  const loadDocuments = async (page = 1, size = 10) => {
    const connectionStore = useConnectionStore()
    
    if (!connectionStore.isConnected || !connectionStore.currentCollection) {
      throw new Error('请先连接数据库并选择集合')
    }

    try {
      loading.value = true
      error.value = ''

      const collectionId = connectionStore.currentCollection.id
      
      // 检查是否需要重新加载集合数据
      if (!collectionData.value || currentCollectionId.value !== collectionId) {
        console.log('加载新集合数据:', collectionId)
        
        // 获取完整的集合数据
        const result = await chromadbService.getDocuments(
          collectionId,
          10000, // 获取足够多的数据
          connectionStore.connectionForm.tenant,
          connectionStore.connectionForm.database
        )

        // 缓存集合数据
        collectionData.value = result
        currentCollectionId.value = collectionId
        
        console.log('集合数据结构:', {
          ids: result.ids?.length || 0,
          embeddings: result.embeddings?.length || 0,
          documents: result.documents?.length || 0,
          metadatas: result.metadatas?.length || 0
        })
      } else {
        console.log('使用缓存的集合数据:', collectionId)
      }

      // 从缓存的集合数据中提取文档
      const allDocuments = extractDocumentsFromCollectionData(collectionData.value)
      
      // 客户端分页
      const startIndex = (page - 1) * size
      const endIndex = startIndex + size
      const paginatedDocuments = allDocuments.slice(startIndex, endIndex)
      
      documents.value = paginatedDocuments
      currentPage.value = page
      pageSize.value = size
      totalDocuments.value = allDocuments.length
      
      return {
        success: true,
        documents: paginatedDocuments,
        total: allDocuments.length,
        page: page,
        size: size
      }
    } catch (err) {
      error.value = err.message || '加载文档失败'
      documents.value = []
      throw err
    } finally {
      loading.value = false
    }
  }

  const refreshDocuments = async () => {
    // 防止重复调用 - 如果正在刷新或距离上次刷新不到1秒，则跳过
    const now = Date.now()
    if (isRefreshing.value || (now - lastRefreshTime.value < 1000)) {
      console.log('跳过重复的refreshDocuments调用')
      return
    }

    try {
      isRefreshing.value = true
      lastRefreshTime.value = now
      
      // 强制重新获取数据，清除当前集合缓存标识
      currentCollectionId.value = null
      // 同时清除服务层缓存
      chromadbService.clearAllCache()
      return await loadDocuments(currentPage.value, pageSize.value)
    } finally {
      isRefreshing.value = false
    }
  }

  const changePage = async (page) => {
    return await loadDocuments(page, pageSize.value)
  }

  const changePageSize = async (size) => {
    return await loadDocuments(1, size)
  }

  // 获取所有文档（用于搜索功能）
  const getAllDocuments = async () => {
    const connectionStore = useConnectionStore()
    
    if (!connectionStore.isConnected || !connectionStore.currentCollection) {
      throw new Error('请先连接数据库并选择集合')
    }

    try {
      const collectionId = connectionStore.currentCollection.id
      
      // 检查是否需要重新加载集合数据
      if (!collectionData.value || currentCollectionId.value !== collectionId) {
        console.log('加载新集合数据用于搜索:', collectionId)
        
        // 获取完整的集合数据
        const result = await chromadbService.getDocuments(
          collectionId,
          10000, // 获取足够多的数据
          connectionStore.connectionForm.tenant,
          connectionStore.connectionForm.database
        )

        // 缓存集合数据
        collectionData.value = result
        currentCollectionId.value = collectionId
      }

      // 从缓存的集合数据中提取所有文档
      return extractDocumentsFromCollectionData(collectionData.value)
    } catch (err) {
      console.error('获取所有文档失败:', err)
      throw err
    }
  }

  // 语义搜索相关动作
  const performSearch = async () => {
    const connectionStore = useConnectionStore()
    
    if (!connectionStore.isConnected || !connectionStore.currentCollection) {
      throw new Error('请先连接数据库并选择集合')
    }

    if (!searchQuery.value.trim()) {
      throw new Error('搜索查询不能为空')
    }

    try {
      loading.value = true
      error.value = ''

      const searchParams = {
        query: searchQuery.value.trim(),
        collectionId: connectionStore.currentCollection.id,
        nResults: searchNResults.value,
        metadataFilter: searchMetadataFilter.value,
        tenant: connectionStore.connectionForm.tenant,
        database: connectionStore.connectionForm.database
      }

      const result = await chromadbService.semanticSearch(searchParams)
      searchResults.value = result.results
      lastSearchQuery.value = searchQuery.value
      
      return {
        success: true,
        results: result.results,
        query: searchQuery.value,
        count: result.results.length
      }
    } catch (err) {
      error.value = err.message || '搜索失败'
      searchResults.value = []
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateSearchQuery = (query) => {
    searchQuery.value = query
  }

  const updateSearchNResults = (nResults) => {
    searchNResults.value = nResults
  }

  const updateSearchMetadataFilter = (filter) => {
    searchMetadataFilter.value = filter
  }

  const clearSearchResults = () => {
    searchResults.value = []
    searchQuery.value = ''
    lastSearchQuery.value = ''
    searchMetadataFilter.value = {}
  }

  // 文档上传相关动作
  const uploadDocument = async (documentData) => {
    const connectionStore = useConnectionStore()
    
    if (!connectionStore.isConnected || !connectionStore.currentCollection) {
      throw new Error('请先连接数据库并选择集合')
    }

    uploadStatus.value = 'uploading'
    uploadProgress.value = 0
    error.value = ''
    
    try {
      loading.value = true

      // 检查是否是文件上传还是文本上传
      if (documentData instanceof File || documentData.file) {
        // 文件上传 - 使用原有的FormData方式
        const uploadParams = {
          file: documentData instanceof File ? documentData : documentData.file,
          collectionId: connectionStore.currentCollection.id,
          chunkSize: documentData.chunkSize || 1000,
          chunkOverlap: documentData.chunkOverlap || 200,
          metadata: documentData.metadata || {
            type: 'other',
            attribution: 'other'
          },
          tenant: connectionStore.connectionForm.tenant,
          database: connectionStore.connectionForm.database
        }

        const result = await chromadbService.uploadDocument(uploadParams)
        uploadStatus.value = 'success'
        uploadProgress.value = 100
        
        return {
          success: true,
          documentId: result.documentId,
          message: result.message
        }
      } else {
        // 文本或JSON上传 - 使用新的JSON格式upsert
        const documents = Array.isArray(documentData.content) 
          ? documentData.content 
          : [documentData.content || documentData.textContent]
        
        const metadatas = documentData.metadatas || [documentData.metadata || {}]
        
        const uploadParams = {
          collectionId: connectionStore.currentCollection.id,
          documents: documents,
          metadatas: metadatas,
          ids: documentData.ids || [], // 可选的自定义ID
          embeddings: documentData.embeddings || [], // 可选的自定义嵌入向量
          tenant: connectionStore.connectionForm.tenant,
          database: connectionStore.connectionForm.database
        }

        const result = await chromadbService.upsertDocuments(uploadParams)
        uploadStatus.value = 'success'
        uploadProgress.value = 100
        
        return {
          success: true,
          documentCount: result.documentCount,
          ids: result.ids,
          message: result.message
        }
      }
      
    } catch (err) {
      uploadStatus.value = 'error'
      error.value = err.message || '上传失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  const resetUploadStatus = () => {
    uploadStatus.value = 'idle'
    uploadProgress.value = 0
  }

  // 清除集合数据缓存
  const clearCollectionCache = () => {
    collectionData.value = null
    currentCollectionId.value = null
    documents.value = []
    totalDocuments.value = 0
    currentPage.value = 1
    
    // 同时清除服务层缓存
    chromadbService.clearAllCache()
    console.log('已清除数据库store中的集合缓存')
  }

  // 重置状态
  const reset = () => {
    currentView.value = VIEW_TYPES.DOCUMENT_QUERY
    loading.value = false
    error.value = ''
    
    // 清除集合数据缓存
    clearCollectionCache()
    
    // 重置文档查询状态
    documents.value = []
    currentPage.value = 1
    pageSize.value = 10
    totalDocuments.value = 0
    
    // 重置搜索状态
    searchQuery.value = ''
    searchResults.value = []
    searchMetadataFilter.value = {}
    searchNResults.value = 50
    lastSearchQuery.value = ''
    
    // 重置上传状态
    uploadStatus.value = 'idle'
    uploadProgress.value = 0
  }

  // 文档删除相关动作
  const deleteDocument = async (documentId) => {
    const connectionStore = useConnectionStore()
    
    if (!connectionStore.isConnected || !connectionStore.currentCollection) {
      throw new Error('请先连接数据库并选择集合')
    }

    if (!documentId) {
      throw new Error('文档ID不能为空')
    }

    try {
      loading.value = true
      error.value = ''

      const deleteParams = {
        collectionId: connectionStore.currentCollection.id,
        ids: [documentId],
        tenant: connectionStore.connectionForm.tenant,
        database: connectionStore.connectionForm.database
      }

      const result = await chromadbService.deleteDocuments(deleteParams)
      
      // 删除成功后清除集合缓存，强制重新加载数据
      clearCollectionCache()
      
      // 重新加载当前页面的文档
      await loadDocuments(currentPage.value, pageSize.value)
      
      return {
        success: true,
        message: result.message,
        deletedCount: result.deletedCount
      }
    } catch (err) {
      error.value = err.message || '删除文档失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  // 批量删除文档
  const deleteDocuments = async (documentIds) => {
    const connectionStore = useConnectionStore()
    
    if (!connectionStore.isConnected || !connectionStore.currentCollection) {
      throw new Error('请先连接数据库并选择集合')
    }

    if (!documentIds || documentIds.length === 0) {
      throw new Error('文档ID列表不能为空')
    }

    try {
      loading.value = true
      error.value = ''

      const deleteParams = {
        collectionId: connectionStore.currentCollection.id,
        ids: documentIds,
        tenant: connectionStore.connectionForm.tenant,
        database: connectionStore.connectionForm.database
      }

      const result = await chromadbService.deleteDocuments(deleteParams)
      
      // 删除成功后清除集合缓存，强制重新加载数据
      clearCollectionCache()
      
      // 重新加载当前页面的文档
      await loadDocuments(currentPage.value, pageSize.value)
      
      return {
        success: true,
        message: result.message,
        deletedCount: result.deletedCount
      }
    } catch (err) {
      error.value = err.message || '删除文档失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    // 状态
    currentView,
    loading,
    error,
    
    // 集合数据缓存状态
    collectionData: computed(() => collectionData.value),
    currentCollectionId: computed(() => currentCollectionId.value),
    
    // 防重复调用状态
    isRefreshing: computed(() => isRefreshing.value),
    
    // 文档查询状态
    documents,
    currentPage,
    pageSize,
    totalDocuments,
    hasDocuments,
    totalPages,
    pagination,
    
    // 语义搜索状态
    searchQuery,
    searchResults,
    searchMetadataFilter,
    searchNResults,
    lastSearchQuery,
    hasSearchResults,
    
    // 文档上传状态
    uploadProgress,
    uploadStatus,
    
    // 动作
    setCurrentView,
    clearError,
    
    // 文档查询动作
    loadDocuments,
    refreshDocuments,
    changePage,
    changePageSize,
    
    // 获取所有文档（用于搜索功能）
    getAllDocuments,
    
    // 语义搜索动作
    performSearch,
    updateSearchQuery,
    updateSearchNResults,
    updateSearchMetadataFilter,
    clearSearchResults,
    
    // 文档上传动作
    uploadDocument,
    resetUploadStatus,
    
    // 文档删除动作
    deleteDocument,
    deleteDocuments,
    
    // 缓存管理
    clearCollectionCache,
    
    // 重置
    reset
  }
}) 