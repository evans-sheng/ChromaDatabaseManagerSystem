/**
 * Author: ewen2seong@gmail.com
 * License: Completely free (完全免费)
 * Commercial use: Prohibited (禁止商业使用)
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../services/api.js'

export const useConnectionStore = defineStore('connection', () => {
  // 状态
  const connectionForm = ref({
    ip: 'localhost',
    port: 8000,
    tenant: 'default_tenant',
    database: 'default_database',
    collection: ''
  })
  
  const isConnected = ref(false)
  const isConnecting = ref(false)
  const connectionError = ref('')
  const collections = ref([])
  const currentCollection = ref(null)
  
  // 计算属性
  const connectionStatus = computed(() => {
    if (isConnecting.value) return 'connecting'
    if (isConnected.value) return 'connected'
    if (connectionError.value) return 'error'
    return 'disconnected'
  })
  
  const connectionStatusText = computed(() => {
    switch (connectionStatus.value) {
      case 'connecting':
        return '连接中...'
      case 'connected':
        return '已连接'
      case 'error':
        return '连接失败'
      default:
        return '未连接'
    }
  })
  
  const connectionAddress = computed(() => {
    return `${connectionForm.value.ip}:${connectionForm.value.port}`
  })
  
  // 方法
  const connect = async () => {
    isConnecting.value = true
    connectionError.value = ''
    
    try {
      // 验证连接参数
      if (!connectionForm.value.ip || !connectionForm.value.port) {
        throw new Error('请填写完整的连接信息')
      }
      
      // 如果是localhost或127.0.0.1，使用代理
      const isLocal = connectionForm.value.ip === 'localhost' || 
                     connectionForm.value.ip === '127.0.0.1' ||
                     connectionForm.value.ip === '::1'
      
      let response
      if (isLocal && connectionForm.value.port === 8000) {
        // 使用代理访问本地服务
        const apiPath = `/api/v2/tenants/${connectionForm.value.tenant}/databases/${connectionForm.value.database}/collections`
        response = await api.get(apiPath)
      } else {
        // 直接访问远程服务（需要远程服务器支持CORS）
        const baseURL = `http://${connectionForm.value.ip}:${connectionForm.value.port}`
        const apiUrl = `${baseURL}/api/v2/tenants/${connectionForm.value.tenant}/databases/${connectionForm.value.database}/collections`
        response = await api.get(apiUrl)
      }
      
      // 如果API调用成功（状态码200），设置为已连接
      collections.value = response || []
      isConnected.value = true
      
      // 如果有预设的集合名称，尝试选择
      if (connectionForm.value.collection && Array.isArray(collections.value)) {
        const targetCollection = collections.value.find(
          c => c.name === connectionForm.value.collection
        )
        if (targetCollection) {
          // 使用selectCollection方法获取实际文档数量
          await selectCollection(targetCollection)
        }
      }
      
      return { success: true, collections: collections.value }
      
    } catch (error) {
      connectionError.value = error.message || '连接失败'
      isConnected.value = false
      collections.value = []
      currentCollection.value = null
      throw error
    } finally {
      isConnecting.value = false
    }
  }
  
  const disconnect = async () => {
    try {
      // 模拟断开连接过程
      await new Promise(resolve => setTimeout(resolve, 500))
      
      isConnected.value = false
      collections.value = []
      currentCollection.value = null
      connectionError.value = ''
      
      // 断开连接时清除数据库缓存
      import('./database.js').then(({ useDatabaseStore }) => {
        const databaseStore = useDatabaseStore()
        databaseStore.clearCollectionCache()
        console.log('断开连接，已清除所有缓存')
      })
      
      return { success: true }
      
    } catch (error) {
      connectionError.value = error.message
      throw error
    }
  }
  
  const selectCollection = async (collection) => {
    if (!isConnected.value) {
      throw new Error('请先连接数据库')
    }
    
    // 检查是否切换到不同的集合
    const isChangingCollection = !currentCollection.value || 
                                currentCollection.value.id !== collection.id

    // 获取实际的文档数量
    try {
      // 动态导入chromadb服务以获取文档数量
      const { default: chromadbService } = await import('../services/chromadb.js')
      
      const actualCount = await chromadbService.getCollectionCount(
        collection.id,
        connectionForm.value.tenant,
        connectionForm.value.database
      )
      
      // 更新集合对象的文档数量
      const updatedCollection = {
        ...collection,
        count: actualCount
      }
      
      currentCollection.value = updatedCollection
      connectionForm.value.collection = updatedCollection.name
      
      console.log(`集合 ${updatedCollection.name} 实际文档数量: ${actualCount}`)
      
    } catch (error) {
      console.warn('获取集合文档数量失败，使用默认值:', error.message)
      currentCollection.value = collection
      connectionForm.value.collection = collection.name
    }
    
    // 如果切换到不同的集合，清除数据库缓存
    if (isChangingCollection) {
      // 动态导入database store以避免循环依赖
      import('./database.js').then(({ useDatabaseStore }) => {
        const databaseStore = useDatabaseStore()
        databaseStore.clearCollectionCache()
        console.log('切换集合，已清除缓存:', collection.name)
      })
    }
    
    return { success: true, collection: currentCollection.value }
  }
  
  const updateConnectionForm = (updates) => {
    Object.assign(connectionForm.value, updates)
  }
  
  const clearError = () => {
    connectionError.value = ''
  }
  
  const refreshCollections = async () => {
    if (!isConnected.value) {
      throw new Error('请先连接数据库')
    }
    
    try {
      // 重新获取集合列表
      const response = await api.get(`/api/v2/tenants/${connectionForm.value.tenant}/databases/${connectionForm.value.database}/collections`)
      collections.value = response || []
      
      // 获取每个集合的实际文档数量
      const { default: chromadbService } = await import('../services/chromadb.js')
      
      const updatedCollections = await Promise.all(
        collections.value.map(async (col) => {
          try {
            const actualCount = await chromadbService.getCollectionCount(
              col.id,
              connectionForm.value.tenant,
              connectionForm.value.database
            )
            return { ...col, count: actualCount }
          } catch (error) {
            console.warn(`获取集合 ${col.name} 文档数量失败:`, error.message)
            return col // 保持原有数量
          }
        })
      )
      
      collections.value = updatedCollections
      
      // 更新当前选中的集合信息
      if (currentCollection.value) {
        const updatedCurrent = updatedCollections.find(
          c => c.id === currentCollection.value.id
        )
        if (updatedCurrent) {
          currentCollection.value = updatedCurrent
        }
      }
      
      console.log('已刷新集合列表及文档数量')
      return { success: true, collections: updatedCollections }
      
    } catch (error) {
      connectionError.value = error.message
      throw error
    }
  }
  
  const validateConnection = () => {
    const errors = []
    
    if (!connectionForm.value.ip.trim()) {
      errors.push('IP地址不能为空')
    }
    
    if (!connectionForm.value.port || connectionForm.value.port < 1 || connectionForm.value.port > 65535) {
      errors.push('端口号必须在1-65535之间')
    }
    
    if (!connectionForm.value.tenant.trim()) {
      errors.push('租户名称不能为空')
    }
    
    if (!connectionForm.value.database.trim()) {
      errors.push('数据库名称不能为空')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
  
  // 重置状态
  const reset = () => {
    connectionForm.value = {
      ip: 'localhost',
      port: 8000,
      tenant: 'default_tenant',
      database: 'default_database',
      collection: ''
    }
    isConnected.value = false
    isConnecting.value = false
    connectionError.value = ''
    collections.value = []
    currentCollection.value = null
  }
  
  return {
    // 状态
    connectionForm,
    isConnected,
    isConnecting,
    connectionError,
    collections,
    currentCollection,
    
    // 计算属性
    connectionStatus,
    connectionStatusText,
    connectionAddress,
    
    // 方法
    connect,
    disconnect,
    selectCollection,
    updateConnectionForm,
    clearError,
    refreshCollections,
    validateConnection,
    reset
  }
}) 