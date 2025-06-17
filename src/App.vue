<template>
  <div class="app-container">
    <!-- 左侧边栏 -->
    <div class="sidebar">
      <div class="sidebar-content">
        <ConnectionPanel />
        <DatabaseInfo />
      </div>
    </div>
    
    <!-- 右侧主内容区域 -->
    <div class="main-content">
      <!-- 顶部导航 -->
      <div class="content-header">
        <el-radio-group 
          v-model="currentView" 
          @change="handleViewChange"
          size="large"
        >
          <el-radio-button :label="VIEW_TYPES.DOCUMENT_QUERY">
            文档查询
          </el-radio-button>
          <el-radio-button :label="VIEW_TYPES.SEMANTIC_SEARCH">
            语义搜索
          </el-radio-button>
          <el-radio-button :label="VIEW_TYPES.DOCUMENT_UPLOAD">
            文档上传
          </el-radio-button>
          <el-radio-button :label="VIEW_TYPES.COLLECTION_MANAGEMENT">
            集合管理
          </el-radio-button>
        </el-radio-group>
      </div>
      
      <!-- 主体内容 -->
      <div class="content-body">
        <LoadingSpinner v-if="loading" />
        
        <!-- 错误提示 -->
        <el-alert
          v-if="error"
          :title="error"
          type="error"
          :closable="true"
          @close="clearError"
          style="margin-bottom: 16px;"
        />
        
        <!-- 动态组件 -->
        <component 
          :is="currentViewComponent" 
          v-if="!loading"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'

import { useConnectionStore } from './stores/connection.js'
import { useDatabaseStore } from './stores/database.js'
import { VIEW_TYPES } from './utils/constants.js'

import ConnectionPanel from './components/ConnectionPanel.vue'
import DatabaseInfo from './components/DatabaseInfo.vue'
import LoadingSpinner from './components/LoadingSpinner.vue'
import DocumentQuery from './views/DocumentQuery.vue'
import SemanticSearch from './views/SemanticSearch.vue'
import DocumentUpload from './views/DocumentUpload.vue'
import CollectionManagement from './views/CollectionManagement.vue'

export default {
  name: 'App',
  components: {
    ConnectionPanel,
    DatabaseInfo,
    LoadingSpinner,
    DocumentQuery,
    SemanticSearch,
    DocumentUpload,
    CollectionManagement
  },
  setup() {
    const connectionStore = useConnectionStore()
    const databaseStore = useDatabaseStore()
    
    const { isConnecting, error: connectionError } = storeToRefs(connectionStore)
    const { currentView, loading: databaseLoading, error: databaseError } = storeToRefs(databaseStore)
    
    // 计算属性
    const loading = computed(() => (isConnecting?.value || false) || (databaseLoading?.value || false))
    const error = computed(() => (connectionError?.value || '') || (databaseError?.value || ''))
    
    const currentViewComponent = computed(() => {
      switch (currentView.value) {
        case VIEW_TYPES.SEMANTIC_SEARCH:
          return SemanticSearch
        case VIEW_TYPES.DOCUMENT_UPLOAD:
          return DocumentUpload
        case VIEW_TYPES.COLLECTION_MANAGEMENT:
          return CollectionManagement
        default:
          return DocumentQuery
      }
    })
    
    // 方法
    const handleViewChange = (view) => {
      databaseStore.setCurrentView(view)
      
      // 如果切换到文档查询视图且已连接，自动加载第一页数据
      if (view === VIEW_TYPES.DOCUMENT_QUERY && connectionStore.isConnected) {
        loadDocuments()
      }
    }
    
    const loadDocuments = async () => {
      try {
        await databaseStore.loadDocuments(1)
      } catch (err) {
        ElMessage.error(err.message || '加载文档失败')
      }
    }
    
    const clearError = () => {
      connectionStore.clearError()
      databaseStore.clearError()
    }
    
    // 生命周期
    onMounted(() => {
      // 应用启动时的初始化逻辑
      console.log('ChromaDB 向量数据库管理系统已启动')
    })
    
    return {
      VIEW_TYPES,
      currentView,
      loading,
      error,
      currentViewComponent,
      handleViewChange,
      clearError
    }
  }
}
</script> 