<template>
  <div class="semantic-search">
    <div class="search-header">
      <h3>语义搜索</h3>
    </div>
    
    <div v-if="!isConnected" class="no-connection">
      <el-empty 
        description="请先连接数据库并选择集合"
        :image-size="100"
      />
    </div>
    
    <div v-else class="search-content">
      <!-- 搜索配置区域 -->
      <el-collapse v-model="searchConfigCollapsed" class="search-config" @change="handleSearchConfigChange">
        <el-collapse-item name="searchConfig">
          <template #title>
            <div class="search-config-header">
              <span>搜索配置</span>
            </div>
          </template>
          
          <el-form :model="searchForm" label-width="120px">
            <el-form-item label="搜索问题" required>
              <el-input
                v-model="searchForm.query"
                type="textarea"
                :rows="3"
                placeholder="请输入要搜索的问题或关键词..."
                :disabled="loading"
              />
            </el-form-item>
            
            <el-form-item label="文档召回数量">
              <el-input-number
                v-model="searchForm.nResults"
                :min="1"
                :max="100"
                :disabled="loading"
                style="width: 200px"
              />
              <span class="form-tip">默认50，最大100</span>
            </el-form-item>
            
            <el-form-item label="元数据过滤">
              <div class="metadata-filter">
                <div 
                  v-for="(filter, index) in metadataFilters" 
                  :key="index"
                  class="filter-item"
                >
                  <el-input
                    v-model="filter.key"
                    placeholder="键"
                    style="width: 120px; margin-right: 8px"
                    :disabled="loading"
                  />
                  <el-input
                    v-model="filter.value"
                    placeholder="值"
                    style="width: 120px; margin-right: 8px"
                    :disabled="loading"
                  />
                  <el-button
                    type="danger"
                    size="small"
                    :icon="Delete"
                    @click="removeFilter(index)"
                    :disabled="loading"
                  />
                </div>
                
                <el-button
                  type="primary"
                  size="small"
                  :icon="Plus"
                  @click="addFilter"
                  :disabled="loading"
                >
                  添加过滤器
                </el-button>
              </div>
            </el-form-item>
            
            <el-form-item>
              <el-button
                type="primary"
                :icon="Search"
                @click="performSearch"
                :loading="loading"
                style="margin-right: 12px"
              >
                开始搜索
              </el-button>
              
              <el-button
                type="default"
                @click="clearResults"
                :disabled="loading"
              >
                清除结果
              </el-button>
            </el-form-item>
          </el-form>
        </el-collapse-item>
      </el-collapse>
      
      <!-- 搜索结果区域 -->
      <div v-if="hasSearchResults" class="search-results">
        <div class="results-header">
          <h4>搜索结果</h4>
          <el-tag type="info">
            找到 {{ searchResults.length }} 条相关文档
          </el-tag>
        </div>
        
        <div class="results-list">
          <el-card 
            v-for="(result, index) in searchResults" 
            :key="result.id"
            class="document-card"
            shadow="hover"
          >
            <div class="document-header">
              <div class="document-id">
                <el-tag type="info" size="small">ID: {{ result.id }}</el-tag>
                <el-tag type="success" size="small">
                  相似度: {{ result.distance !== undefined && result.distance !== null && typeof result.distance === 'number' && !isNaN(result.distance) ? (1 - result.distance).toFixed(3) : '未知' }}
                </el-tag>
                <el-tag type="warning" size="small">
                  距离: {{ result.distance !== undefined && result.distance !== null && typeof result.distance === 'number' && !isNaN(result.distance) ? result.distance.toFixed(3) : '未知' }}
                </el-tag>
              </div>
              <div class="document-meta">
                <el-tag 
                  v-if="result.metadata?.type" 
                  :type="getTypeTagType(result.metadata.type)"
                  size="small"
                >
                  {{ result.metadata.type }}
                </el-tag>
                <el-tag 
                  v-if="result.metadata?.attribution" 
                  type="success"
                  size="small"
                >
                  {{ result.metadata.attribution }}
                </el-tag>
              </div>
            </div>
            
            <div class="document-content">
              <div class="content-text">
                <span v-html="highlightSearchKeyword(truncateText(result.content, 300))"></span>
              </div>
              
              <el-button 
                v-if="result.content && result.content.length > 300"
                type="text" 
                size="small"
                @click="showFullContent(result)"
              >
                查看完整内容
              </el-button>
            </div>
            
            <!-- 向量信息显示 -->
            <div v-if="result.vector" class="document-embedding">
              <el-collapse v-model="expandedEmbedding">
                <el-collapse-item title="向量信息" :name="`embedding-${index}`">
                  <div class="embedding-info">
                    <div class="embedding-stats">
                      <el-tag size="small" type="info">
                        维度: {{ result.vector.length }}
                      </el-tag>
                      <el-tag size="small" type="success">
                        前10维: {{ getVectorPreview(result.vector) }}
                      </el-tag>
                    </div>
                    <div class="embedding-preview">
                      <span class="preview-label">向量预览:</span>
                      <code class="embedding-values">
                        [{{ result.vector.slice(0, 5).map(v => typeof v === 'number' && !isNaN(v) ? v.toFixed(4) : '0.0000').join(', ') }}...{{ result.vector.slice(-2).map(v => typeof v === 'number' && !isNaN(v) ? v.toFixed(4) : '0.0000').join(', ') }}]
                      </code>
                    </div>
                  </div>
                </el-collapse-item>
              </el-collapse>
            </div>
            
            <!-- 元数据显示 -->
            <div class="document-metadata" v-if="result.metadata">
              <el-collapse v-model="expandedMetadata">
                <el-collapse-item title="元数据" :name="`metadata-${index}`">
                  <div class="metadata-content">
                    <div 
                      v-for="(value, key) in result.metadata" 
                      :key="key"
                      class="metadata-item"
                    >
                      <span class="metadata-key">{{ key }}:</span>
                      <span class="metadata-value">{{ formatMetadataValue(value) }}</span>
                    </div>
                  </div>
                </el-collapse-item>
              </el-collapse>
            </div>
          </el-card>
        </div>
      </div>
      
      <div v-else-if="!loading && lastSearchQuery" class="no-results">
        <el-empty 
          description="未找到相关文档"
          :image-size="80"
        >
          <el-button type="primary" @click="performSearch">
            重新搜索
          </el-button>
        </el-empty>
      </div>
    </div>
    
    <!-- 完整文档对话框 -->
    <el-dialog
      v-model="documentDialogVisible"
      title="完整文档内容"
      width="60%"
      :before-close="handleCloseDocumentDialog"
    >
      <div class="full-document">
        <div class="document-header">
          <el-tag type="info">ID: {{ selectedResult?.id }}</el-tag>
          <el-tag type="success">
            相似度: {{ selectedResult && selectedResult.distance !== undefined && selectedResult.distance !== null && typeof selectedResult.distance === 'number' && !isNaN(selectedResult.distance) ? (1 - selectedResult.distance).toFixed(3) : '' }}
          </el-tag>
          <el-tag type="warning">
            距离: {{ selectedResult && selectedResult.distance !== undefined && selectedResult.distance !== null && typeof selectedResult.distance === 'number' && !isNaN(selectedResult.distance) ? selectedResult.distance.toFixed(3) : '' }}
          </el-tag>
        </div>
        <div class="document-body">
          <span v-html="highlightSearchKeyword(selectedResult?.content || '')"></span>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { ref, computed, reactive } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { Search, Plus, Delete } from '@element-plus/icons-vue'

import { useConnectionStore } from '../stores/connection.js'
import { useDatabaseStore } from '../stores/database.js'
import { truncateText } from '../utils/helpers.js'

export default {
  name: 'SemanticSearch',
  components: {
    Search,
    Plus,
    Delete
  },
  setup() {
    const connectionStore = useConnectionStore()
    const databaseStore = useDatabaseStore()
    
    const { isConnected } = storeToRefs(connectionStore)
    const { 
      searchResults, 
      loading, 
      hasSearchResults, 
      lastSearchQuery,
      searchQuery,
      searchNResults 
    } = storeToRefs(databaseStore)
    
    // 本地状态
    const searchForm = reactive({
      query: '',
      nResults: 50
    })
    
    const metadataFilters = ref([])
    const documentDialogVisible = ref(false)
    const selectedResult = ref(null)
    const expandedEmbedding = ref([])
    const expandedMetadata = ref([])
    const searchConfigCollapsed = ref(['searchConfig'])
    
    // 同步搜索表单与store
    searchForm.query = searchQuery.value
    searchForm.nResults = searchNResults.value
    
    // 方法
    const addFilter = () => {
      metadataFilters.value.push({ key: '', value: '' })
    }
    
    const removeFilter = (index) => {
      metadataFilters.value.splice(index, 1)
    }
    
    const buildMetadataFilter = () => {
      const filter = {}
      metadataFilters.value.forEach(item => {
        if (item.key.trim() && item.value.trim()) {
          filter[item.key.trim()] = item.value.trim()
        }
      })
      return filter
    }
    
    const performSearch = async () => {
      if (!searchForm.query.trim()) {
        ElMessage.warning('请输入搜索问题')
        return
      }
      
      try {
        // 更新store中的搜索参数
        databaseStore.updateSearchQuery(searchForm.query)
        databaseStore.updateSearchNResults(searchForm.nResults)
        databaseStore.updateSearchMetadataFilter(buildMetadataFilter())
        
        // 执行搜索
        await databaseStore.performSearch()
        
        // 只有当有查询数据返回时，才自动折叠搜索配置
        if (searchResults.value && searchResults.value.length > 0) {
          searchConfigCollapsed.value = []
        }
        
        ElMessage.success(`搜索完成，找到 ${searchResults.value.length} 条相关文档`)
      } catch (error) {
        ElMessage.error(error.message || '搜索失败')
      }
    }
    
    const clearResults = () => {
      databaseStore.clearSearchResults()
      searchForm.query = ''
      searchForm.nResults = 50
      metadataFilters.value = []
    }
    
    const showFullDocument = (result) => {
      selectedResult.value = result
      documentDialogVisible.value = true
    }
    
    const handleCloseDocumentDialog = () => {
      documentDialogVisible.value = false
      selectedResult.value = null
    }
    
    const getTypeTagType = (type) => {
      switch (type) {
        case 'java':
          return 'warning'
        case 'doc':
          return 'success'
        default:
          return 'info'
      }
    }
    
    const getVectorPreview = (vector) => {
      if (!vector || !Array.isArray(vector)) return '无'
      return vector.slice(0, 10).map(v => typeof v === 'number' && !isNaN(v) ? v.toFixed(3) : '0.000').join(', ')
    }
    
    const highlightSearchKeyword = (text) => {
      if (!searchForm.query.trim()) return text
      const regex = new RegExp(`(${searchForm.query.trim()})`, 'gi')
      return text.replace(regex, '<span class="highlight">$1</span>')
    }
    
    const showFullContent = (result) => {
      selectedResult.value = result
      documentDialogVisible.value = true
    }
    
    const formatMetadataValue = (value) => {
      if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value)
      }
      return value
    }
    
    const handleSearchConfigChange = () => {
      // Handle search config change if needed
    }
    
    return {
      isConnected,
      searchResults,
      loading,
      hasSearchResults,
      lastSearchQuery,
      searchForm,
      metadataFilters,
      documentDialogVisible,
      selectedResult,
      expandedEmbedding,
      expandedMetadata,
      searchConfigCollapsed,
      addFilter,
      removeFilter,
      performSearch,
      clearResults,
      showFullDocument,
      handleCloseDocumentDialog,
      getTypeTagType,
      getVectorPreview,
      truncateText,
      highlightSearchKeyword,
      showFullContent,
      formatMetadataValue,
      handleSearchConfigChange
    }
  }
}
</script>

<style scoped>
.semantic-search {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.search-header {
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}

.search-header h3 {
  margin: 0;
  color: #303133;
}

.no-connection {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.search-config {
  margin-bottom: 20px;
  border-radius: 8px;
  border: 1px solid #dcdfe6;
  background-color: #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12), 0 0 6px rgba(0, 0, 0, 0.04);
}

.search-config :deep(.el-collapse-item__header) {
  background-color: #f5f7fa;
  border-bottom: 1px solid #dcdfe6;
  padding: 12px 16px;
  font-weight: 600;
  color: #303133;
  border-radius: 8px 8px 0 0;
}

.search-config :deep(.el-collapse-item__content) {
  padding: 16px;
  border-radius: 0 0 8px 8px;
}

.search-config :deep(.el-collapse-item__wrap) {
  border-bottom: none;
}

.search-config :deep(.el-collapse-item) {
  border-bottom: none;
}

.search-config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-left: 8px;
}

.metadata-filter {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-item {
  display: flex;
  align-items: center;
}

.search-results {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
}

.results-header h4 {
  margin: 0;
  color: #303133;
}

.results-list {
  flex: 1;
  overflow-y: auto;
}

.document-card {
  margin-bottom: 16px;
  border-radius: 8px;
}

.document-card:last-child {
  margin-bottom: 0;
}

.document-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.document-id,
.document-meta {
  display: flex;
  gap: 8px;
}

.document-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.content-text {
  line-height: 1.6;
  color: #606266;
  background-color: #f8f9fa;
  padding: 12px;
  border-radius: 4px;
  white-space: pre-wrap;
}

.document-embedding {
  border-top: 1px solid #ebeef5;
  padding-top: 12px;
}

.embedding-info {
  background-color: #f8f9fa;
  padding: 12px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

.embedding-stats {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.embedding-stats span {
  color: #606266;
}

.embedding-preview {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #ebeef5;
}

.preview-label {
  font-weight: 600;
  color: #303133;
}

.embedding-values {
  color: #606266;
}

.document-metadata {
  border-top: 1px solid #ebeef5;
  padding-top: 12px;
}

.metadata-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.metadata-item {
  display: flex;
  gap: 8px;
}

.metadata-key {
  font-weight: 600;
  color: #303133;
}

.metadata-value {
  color: #606266;
}

.highlight {
  background-color: #fffbf0;
  color: #e6a23c;
  padding: 2px 4px;
  border-radius: 2px;
  font-weight: 600;
}

.no-results {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.full-document {
  max-height: 60vh;
  overflow-y: auto;
}

.full-document .document-header {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
}

.full-document .document-body {
  line-height: 1.8;
  color: #303133;
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style> 