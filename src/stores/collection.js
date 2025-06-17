/**
 * Author: ewen2seong@gmail.com
 * License: Completely free (完全免费)
 * Commercial use: Prohibited (禁止商业使用)
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import chromadbService from '../services/chromadb.js'
import { useConnectionStore } from './connection.js'
import { useDatabaseStore } from './database.js'

export const useCollectionStore = defineStore('collection', () => {
  // 状态
  const loading = ref(false)
  const error = ref('')
  const collections = ref([])
  const currentEditingCollection = ref(null)
  const dialogVisible = ref(false)
  const dialogMode = ref('create') // 'create' | 'edit'

  // 分页相关状态
  const currentPage = ref(1)
  const pageSize = ref(15)
  const totalCollections = ref(0)

  // 表单数据
  const collectionForm = ref({
    name: '',
    metadata: null,
    configuration: {
      hnsw: null,
      spann: null,
      embedding_function: {
        name: "default",
        type: "known",
        config: {}
      }
    },
    getOrCreate: true
  })

  // 计算属性
  const hasCollections = computed(() => collections.value.length > 0)
  const isDialogOpen = computed(() => dialogVisible.value)
  const dialogTitle = computed(() => 
    dialogMode.value === 'create' ? '创建集合' : '集合详情'
  )
  
  // 分页相关计算属性
  const totalPages = computed(() => Math.ceil(totalCollections.value / pageSize.value))
  const pagination = computed(() => ({
    current: currentPage.value,
    pageSize: pageSize.value,
    total: totalCollections.value,
    totalPages: totalPages.value
  }))
  
  // 分页后的集合列表
  const paginatedCollections = computed(() => {
    const startIndex = (currentPage.value - 1) * pageSize.value
    const endIndex = startIndex + pageSize.value
    return collections.value.slice(startIndex, endIndex)
  })

  // 动作
  const clearError = () => {
    error.value = ''
  }

  // 加载集合列表
  const loadCollections = async () => {
    const connectionStore = useConnectionStore()
    
    if (!connectionStore.isConnected) {
      throw new Error('请先连接数据库')
    }

    try {
      loading.value = true
      error.value = ''

      const result = await chromadbService.getCollections(
        connectionStore.connectionForm.tenant,
        connectionStore.connectionForm.database
      )

      collections.value = result || []
      totalCollections.value = collections.value.length
      
      // 获取每个集合的实际文档数量
      const updatedCollections = await Promise.all(
        collections.value.map(async (col) => {
          try {
            const actualCount = await chromadbService.getCollectionCount(
              col.id,
              connectionStore.connectionForm.tenant,
              connectionStore.connectionForm.database
            )
            return { ...col, count: actualCount }
          } catch (error) {
            console.warn(`获取集合 ${col.name} 文档数量失败:`, error.message)
            return col
          }
        })
      )

      collections.value = updatedCollections
      totalCollections.value = updatedCollections.length
      
      return {
        success: true,
        collections: updatedCollections
      }
    } catch (err) {
      error.value = err.message || '加载集合列表失败'
      collections.value = []
      totalCollections.value = 0
      throw err
    } finally {
      loading.value = false
    }
  }

  // 创建集合
  const createCollection = async (collectionData) => {
    const connectionStore = useConnectionStore()
    
    if (!connectionStore.isConnected) {
      throw new Error('请先连接数据库')
    }

    try {
      loading.value = true
      error.value = ''

      const createParams = {
        ...collectionData,
        tenant: connectionStore.connectionForm.tenant,
        database: connectionStore.connectionForm.database
      }

      const result = await chromadbService.createCollection(createParams)
      
      // 创建成功后重新加载集合列表
      await loadCollections()
      
      return {
        success: true,
        collection: result.collection,
        message: result.message
      }
    } catch (err) {
      error.value = err.message || '创建集合失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  // 删除集合
  const deleteCollection = async (collectionName) => {
    const connectionStore = useConnectionStore()
    const databaseStore = useDatabaseStore()
    
    if (!connectionStore.isConnected) {
      throw new Error('请先连接数据库')
    }

    if (!collectionName) {
      throw new Error('集合名称不能为空')
    }

    try {
      loading.value = true
      error.value = ''

      const deleteParams = {
        collectionName,
        tenant: connectionStore.connectionForm.tenant,
        database: connectionStore.connectionForm.database
      }

      const result = await chromadbService.deleteCollection(deleteParams)
      
      // 删除成功后重新加载集合列表
      await loadCollections()
      
      // 如果删除的是当前选中的集合，清除选择
      if (connectionStore.currentCollection && 
          connectionStore.currentCollection.name === collectionName) {
        connectionStore.currentCollection = null
        connectionStore.connectionForm.collection = ''
        databaseStore.clearCollectionCache()
      }
      
      return {
        success: true,
        message: result.message
      }
    } catch (err) {
      error.value = err.message || '删除集合失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  // 打开创建对话框
  const openCreateDialog = () => {
    dialogMode.value = 'create'
    currentEditingCollection.value = null
    collectionForm.value = {
      name: '',
      metadata: null,
      configuration: {
        hnsw: null,
        spann: null,
        embedding_function: {
          name: "default",
          type: "known",
          config: {}
        }
      },
      getOrCreate: true
    }
    dialogVisible.value = true
  }

  // 打开详情对话框
  const openEditDialog = (collection) => {
    dialogMode.value = 'edit'
    currentEditingCollection.value = collection
    collectionForm.value = {
      name: collection.name,
      metadata: collection.metadata,
      configuration: collection.configuration || {
        hnsw: null,
        spann: null,
        embedding_function: {
          name: "default",
          type: "known",
          config: {}
        }
      },
      getOrCreate: true
    }
    dialogVisible.value = true
  }

  // 关闭对话框
  const closeDialog = () => {
    dialogVisible.value = false
    currentEditingCollection.value = null
    collectionForm.value = {
      name: '',
      metadata: null,
      configuration: {
        hnsw: null,
        spann: null,
        embedding_function: {
          name: "default",
          type: "known",
          config: {}
        }
      },
      getOrCreate: true
    }
  }

  // 分页相关方法
  const changePage = (page) => {
    currentPage.value = page
  }

  const changePageSize = (size) => {
    pageSize.value = size
    currentPage.value = 1 // 重置到第一页
  }

  // 重置状态
  const reset = () => {
    loading.value = false
    error.value = ''
    collections.value = []
    currentEditingCollection.value = null
    dialogVisible.value = false
    dialogMode.value = 'create'
    
    // 重置分页状态
    currentPage.value = 1
    pageSize.value = 15
    totalCollections.value = 0
    
    collectionForm.value = {
      name: '',
      metadata: null,
      configuration: {
        hnsw: null,
        spann: null,
        embedding_function: {
          name: "default",
          type: "known",
          config: {}
        }
      },
      getOrCreate: true
    }
  }

  return {
    // 状态
    loading,
    error,
    collections,
    currentEditingCollection,
    dialogVisible,
    dialogMode,
    collectionForm,
    
    // 分页状态
    currentPage,
    pageSize,
    totalCollections,
    
    // 计算属性
    hasCollections,
    isDialogOpen,
    dialogTitle,
    totalPages,
    pagination,
    paginatedCollections,
    
    // 动作
    clearError,
    loadCollections,
    createCollection,
    deleteCollection,
    openCreateDialog,
    openEditDialog,
    closeDialog,
    
    // 分页动作
    changePage,
    changePageSize,
    
    reset
  }
}) 