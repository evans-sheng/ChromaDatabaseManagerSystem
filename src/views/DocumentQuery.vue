<template>
  <div class="document-query">
    <!-- 固定头部区域 -->
    <div class="query-header-fixed">
      <div class="header-top">
        <div class="header-left">
          <h3>文档查询</h3>
        </div>
        
        <div class="header-right">
          <!-- 搜索区域 -->
          <div class="search-input-group">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索文档内容、ID或元数据..."
              size="small"
              clearable
              @keyup.enter="handleSearch"
              @clear="clearSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-button 
              type="primary" 
              size="small"
              @click="handleSearch"
              :disabled="!isConnected || !searchKeyword.trim()"
            >
              搜索
            </el-button>
            <el-button 
              v-if="isSearching"
              size="small"
              @click="clearSearch"
            >
              清除
            </el-button>
          </div>
        </div>
      </div>
      
      <!-- 搜索结果提示 -->
      <div v-if="searchResults.length > 0 || isSearching" class="search-info">
        <el-tag v-if="isSearching" type="info" size="small">
          搜索关键词: "{{ currentSearchKeyword }}" 找到 {{ searchResults.length }} 条结果
        </el-tag>
      </div>
    </div>
    
    <!-- 可滚动内容区域 -->
    <div class="query-content-scrollable">
      <div v-if="!isConnected" class="no-connection">
        <el-empty 
          description="请先连接数据库并选择集合"
          :image-size="100"
        />
      </div>
      
      <div v-else-if="!hasDocuments && !loading && !isSearching" class="no-data">
        <el-empty 
          description="暂无文档数据"
          :image-size="100"
        >
          <el-button type="primary" @click="refreshDocuments">
            刷新数据
          </el-button>
        </el-empty>
      </div>
      
      <div v-else-if="isSearching && searchResults.length === 0 && !loading" class="no-search-results">
        <el-empty 
          description="未找到匹配的文档"
          :image-size="80"
        >
          <el-button @click="clearSearch">
            清除搜索
          </el-button>
        </el-empty>
      </div>
      
      <div v-else class="documents-content">
        <!-- 文档列表 -->
        <div class="documents-list">
          <el-card 
            v-for="(document, index) in displayDocuments" 
            :key="document.id"
            class="document-card"
            shadow="hover"
          >
            <div class="document-header">
              <div class="document-id">
                <el-tag type="info" size="small">ID: {{ document.id }}</el-tag>
              </div>
              <div class="document-actions">
                <div class="document-meta">
                  <el-tag 
                    v-if="document.metadata?.type" 
                    :type="getTypeTagType(document.metadata.type)"
                    size="small"
                  >
                    {{ document.metadata.type }}
                  </el-tag>
                  <el-tag 
                    v-if="document.metadata?.attribution" 
                    type="success"
                    size="small"
                  >
                    {{ document.metadata.attribution }}
                  </el-tag>
                </div>
                <el-button 
                  type="danger" 
                  size="small"
                  plain
                  :disabled="loading"
                  @click="confirmDeleteDocument(document)"
                >
                  删除
                </el-button>
              </div>
            </div>
            
            <div class="document-content">
              <div class="content-text">
                <span v-html="highlightSearchKeyword(truncateText(document.content, 200))"></span>
              </div>
              
              <el-button 
                v-if="document.content && document.content.length > 200"
                type="text" 
                size="small"
                @click="showFullContent(document)"
              >
                查看完整内容
              </el-button>
            </div>
            
            <!-- 向量信息显示 -->
            <div v-if="document.embedding" class="document-embedding">
              <el-collapse>
                <el-collapse-item title="向量信息" :name="`embedding-${index}`">
                  <div class="embedding-info">
                    <div class="embedding-stats">
                      <el-tag size="small" type="info">
                        维度: {{ document.embedding.length }}
                      </el-tag>
                      <el-tag size="small" type="success">
                        前10维: {{ getEmbeddingPreview(document.embedding) }}
                      </el-tag>
                    </div>
                    <div class="embedding-preview">
                      <span class="preview-label">向量预览:</span>
                      <code class="embedding-values">
                        [{{ document.embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ') }}...{{ document.embedding.slice(-2).map(v => v.toFixed(4)).join(', ') }}]
                      </code>
                    </div>
                  </div>
                </el-collapse-item>
              </el-collapse>
            </div>
            
            <div class="document-metadata" v-if="document.metadata">
              <el-collapse v-model="expandedMetadata">
                <el-collapse-item title="元数据" :name="`metadata-${index}`">
                  <div class="metadata-content">
                    <div 
                      v-for="(value, key) in document.metadata" 
                      :key="key"
                      class="metadata-item"
                    >
                      <span class="metadata-key">{{ key }}:</span>
                      <span class="metadata-value" v-html="highlightSearchKeyword(formatMetadataValue(value))"></span>
                    </div>
                  </div>
                </el-collapse-item>
              </el-collapse>
            </div>
          </el-card>
        </div>
        
        <!-- 分页 -->
        <div v-if="!isSearching" class="pagination-container">
          <el-pagination
            v-model:current-page="pagination.current"
            v-model:page-size="pagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </div>
    </div>
    
    <!-- 完整内容对话框 -->
    <el-dialog
      v-model="contentDialogVisible"
      title="完整文档内容"
      width="60%"
      :before-close="handleCloseContentDialog"
    >
      <div class="full-content">
        <div class="content-header">
          <el-tag type="info">ID: {{ selectedDocument?.id }}</el-tag>
        </div>
        <div class="content-body">
          <span v-html="highlightSearchKeyword(selectedDocument?.content || '')"></span>
        </div>
      </div>
    </el-dialog>

    <!-- 删除确认对话框 -->
    <el-dialog
      v-model="deleteDialogVisible"
      title="确认删除"
      width="400px"
      :before-close="handleCloseDeleteDialog"
    >
      <div class="delete-content">
        <p>确定要删除以下文档吗？此操作不可撤销。</p>
        <div class="document-info">
          <el-tag type="info">ID: {{ documentToDelete?.id }}</el-tag>
          <div class="content-preview">
            {{ truncateText(documentToDelete?.content || '', 100) }}
          </div>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleCloseDeleteDialog">取消</el-button>
          <el-button type="danger" @click="handleDeleteDocument" :loading="loading">
            确认删除
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'

import { useConnectionStore } from '../stores/connection.js'
import { useDatabaseStore } from '../stores/database.js'
import { truncateText, formatTimestamp } from '../utils/helpers.js'

export default {
  name: 'DocumentQuery',
  components: {
    Search
  },
  setup() {
    const connectionStore = useConnectionStore()
    const databaseStore = useDatabaseStore()
    
    const { isConnected, currentCollection } = storeToRefs(connectionStore)
    const { documents, pagination, loading, hasDocuments } = storeToRefs(databaseStore)
    
    // 本地状态
    const contentDialogVisible = ref(false)
    const selectedDocument = ref(null)
    const searchKeyword = ref('')
    const isSearching = ref(false)
    const currentSearchKeyword = ref('')
    const searchResults = ref([])
    const expandedMetadata = ref(new Set())
    const deleteDialogVisible = ref(false)
    const documentToDelete = ref(null)
    
    // 计算属性
    const displayDocuments = computed(() => {
      return isSearching.value ? searchResults.value : documents.value
    })
    
    // 初始化所有文档的元数据为展开状态
    const initializeExpandedState = () => {
      const newExpanded = new Set()
      displayDocuments.value.forEach((doc, index) => {
        if (doc.metadata) {
          newExpanded.add(`metadata-${index}`)
        }
      })
      expandedMetadata.value = newExpanded
    }
    
    // 方法
    const refreshDocuments = async () => {
      try {
        // 调用store的刷新方法，会强制重新获取数据
        await databaseStore.refreshDocuments()
      } catch (error) {
        ElMessage.error(error.message || '加载文档失败')
      }
    }
    
    const handleSizeChange = async (size) => {
      try {
        await databaseStore.changePageSize(size)
      } catch (error) {
        ElMessage.error(error.message || '加载文档失败')
      }
    }
    
    const handleCurrentChange = async (page) => {
      try {
        await databaseStore.changePage(page)
      } catch (error) {
        ElMessage.error(error.message || '加载文档失败')
      }
    }
    
    const showFullContent = (document) => {
      selectedDocument.value = document
      contentDialogVisible.value = true
    }
    
    const handleCloseContentDialog = () => {
      contentDialogVisible.value = false
      selectedDocument.value = null
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
    
    const formatMetadataValue = (value) => {
      if (typeof value === 'object') {
        return JSON.stringify(value, null, 2)
      }
      if (typeof value === 'string' && value.includes('T') && value.includes('Z')) {
        return formatTimestamp(value)
      }
      return value
    }
    
    const getEmbeddingPreview = (embedding) => {
      if (!embedding || !Array.isArray(embedding)) return '无'
      if (embedding.length > 10) {
        return embedding.slice(0, 10).map(v => v.toFixed(4)).join(', ')
      }
      return embedding.map(v => v.toFixed(4)).join(', ')
    }
    
    const handleSearch = async () => {
      if (!searchKeyword.value.trim()) {
        ElMessage.warning('请输入搜索关键词')
        return
      }
      
      try {
        isSearching.value = true
        currentSearchKeyword.value = searchKeyword.value.trim()
        
        // 从所有文档中搜索匹配的内容
        const allDocuments = await databaseStore.getAllDocuments()
        const keyword = currentSearchKeyword.value.toLowerCase()
        
        const filteredDocuments = allDocuments.filter(doc => {
          // 搜索文档ID
          if (doc.id && doc.id.toLowerCase().includes(keyword)) {
            return true
          }
          
          // 搜索文档内容
          if (doc.content && doc.content.toLowerCase().includes(keyword)) {
            return true
          }
          
          // 搜索元数据
          if (doc.metadata) {
            const metadataString = JSON.stringify(doc.metadata).toLowerCase()
            if (metadataString.includes(keyword)) {
              return true
            }
          }
          
          return false
        })
        
        searchResults.value = filteredDocuments
        
        // 初始化搜索结果的展开状态
        setTimeout(() => {
          initializeExpandedState()
        }, 100)
        
        ElMessage.success(`找到 ${filteredDocuments.length} 条匹配的文档`)
      } catch (error) {
        ElMessage.error(error.message || '搜索失败')
      }
    }
    
    const clearSearch = () => {
      searchKeyword.value = ''
      currentSearchKeyword.value = ''
      searchResults.value = []
      isSearching.value = false
    }
    
    const highlightSearchKeyword = (text) => {
      if (!currentSearchKeyword.value || !text) return text
      const regex = new RegExp(`(${currentSearchKeyword.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
      return String(text).replace(regex, '<span class="highlight">$1</span>')
    }
    
    const confirmDeleteDocument = (document) => {
      documentToDelete.value = document
      deleteDialogVisible.value = true
    }
    
    const handleCloseDeleteDialog = () => {
      deleteDialogVisible.value = false
      documentToDelete.value = null
    }
    
    const handleDeleteDocument = async () => {
      if (!documentToDelete.value) return
      
      try {
        await databaseStore.deleteDocument(documentToDelete.value.id)
        ElMessage.success('文档删除成功')
        await refreshDocuments()
        handleCloseDeleteDialog()
      } catch (error) {
        ElMessage.error(error.message || '删除文档失败')
      }
    }
    
    // 监听连接状态变化
    watch([isConnected, currentCollection], ([connected, collection]) => {
      if (connected && collection) {
        // 添加防抖，避免重复调用
        setTimeout(() => {
          if (isConnected.value && currentCollection.value && 
              currentCollection.value.id === collection.id) {
            refreshDocuments()
          }
        }, 100)
      }
    })
    
    // 监听文档变化，初始化展开状态
    watch(displayDocuments, () => {
      setTimeout(() => {
        initializeExpandedState()
      }, 100)
    }, { immediate: true })
    
    // 生命周期
    onMounted(() => {
      // 添加延迟，让watch先完成
      setTimeout(() => {
        if (isConnected.value && currentCollection.value && documents.value.length === 0) {
          refreshDocuments()
        }
      }, 200)
    })
    
    return {
      documents,
      pagination,
      loading,
      hasDocuments,
      isConnected,
      contentDialogVisible,
      selectedDocument,
      searchKeyword,
      isSearching,
      currentSearchKeyword,
      searchResults,
      displayDocuments,
      expandedMetadata,
      refreshDocuments,
      handleSizeChange,
      handleCurrentChange,
      showFullContent,
      handleCloseContentDialog,
      getTypeTagType,
      formatMetadataValue,
      truncateText,
      getEmbeddingPreview,
      handleSearch,
      clearSearch,
      highlightSearchKeyword,
      deleteDialogVisible,
      documentToDelete,
      confirmDeleteDocument,
      handleCloseDeleteDialog,
      handleDeleteDocument
    }
  }
}
</script>

<style scoped>
.document-query {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.query-header-fixed {
  position: sticky;
  top: -2px;
  z-index: 10;
  background-color: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 4px 16px 3px 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 10px;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.header-left {
  flex-shrink: 0;
}

.header-right {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
}

.header-top h3 {
  margin: 0;
  color: #303133;
  font-size: 15px;
  line-height: 1.2;
}

.search-input-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.search-input-group .el-input {
  width: 260px;
}

.search-info {
  margin-top: 4px;
  padding: 2px 6px;
  background-color: #f0f9ff;
  border: 1px solid #b3d8ff;
  border-radius: 3px;
  font-size: 11px;
  color: #409eff;
  line-height: 1.3;
}

.query-content-scrollable {
  flex: 1;
  overflow-y: auto;
}

.no-connection,
.no-data,
.no-search-results {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.documents-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.documents-list {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 20px;
}

.document-card {
  margin-bottom: 6px;
  border-radius: 4px;
}

.document-card:last-child {
  margin-bottom: 0;
}

.document-card .el-card__body {
  padding: 2px;
}

.document-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.document-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.document-meta {
  display: flex;
  gap: 3px;
}

.document-content {
  margin-bottom: 4px;
}

.content-text {
  line-height: 1.3;
  color: #606266;
  margin-bottom: 3px;
  white-space: pre-wrap;
  font-size: 13px;
}

.document-embedding {
  margin-bottom: 4px;
}

.embedding-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.embedding-stats {
  display: flex;
  gap: 3px;
}

.embedding-preview {
  margin-top: 3px;
}

.preview-label {
  font-weight: bold;
  color: #409eff;
  margin-right: 3px;
  font-size: 12px;
}

.embedding-values {
  color: #606266;
  word-break: break-all;
  font-size: 11px;
}

.document-metadata {
  border-top: 1px solid #ebeef5;
  padding-top: 4px;
}

.metadata-content {
  background-color: #f8f9fa;
  padding: 4px;
  border-radius: 2px;
  font-family: 'Courier New', monospace;
  font-size: 11px;
}

.metadata-item {
  display: flex;
  margin-bottom: 1px;
}

.metadata-item:last-child {
  margin-bottom: 0;
}

.metadata-key {
  font-weight: bold;
  color: #409eff;
  min-width: 100px;
  font-size: 11px;
}

.metadata-value {
  color: #606266;
  word-break: break-all;
  font-size: 11px;
}

.pagination-container {
  display: flex;
  justify-content: center;
  padding: 20px 0;
  border-top: 1px solid #ebeef5;
}

.full-content {
  max-height: 60vh;
  overflow-y: auto;
}

.full-content .content-header {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
}

.full-content .content-body {
  line-height: 1.8;
  color: #606266;
  white-space: pre-wrap;
  font-size: 14px;
}

.highlight {
  background-color: #ffeb3b;
  color: #333;
  font-weight: bold;
  padding: 1px 2px;
  border-radius: 2px;
}

.delete-content {
  padding: 16px;
}

.document-info {
  margin-top: 16px;
}

.content-preview {
  margin-top: 8px;
  padding: 8px;
  background-color: #f8f9fa;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style> 