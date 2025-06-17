/**
 * Author: ewen2seong@gmail.com
 * License: Completely free (完全免费)
 * Commercial use: Prohibited (禁止商业使用)
 */

// Mock数据生成器
export const mockData = {
  // 生成集合列表
  generateCollections() {
    return [
      {
        name: 'documents_collection',
        id: 'col_001',
        dimension: 384,
        count: 1250
      },
      {
        name: 'knowledge_base',
        id: 'col_002', 
        dimension: 768,
        count: 856
      },
      {
        name: 'user_queries',
        id: 'col_003',
        dimension: 384,
        count: 2341
      }
    ]
  },

  // 生成文档列表
  generateDocuments(page = 1, pageSize = 10) {
    const total = 1250
    const ids = []
    const embeddings = []
    const documents = []
    const metadatas = []
    
    for (let i = 0; i < Math.min(total, pageSize * 10); i++) {
      const index = i + 1
      
      ids.push(`doc_${index.toString().padStart(4, '0')}`)
      
      // 生成384维的向量
      embeddings.push(Array.from({length: 384}, () => Math.random() * 2 - 1))
      
      documents.push(`这是第${index}个文档的内容。包含了关于向量数据库管理的相关信息，用于演示文档查询功能。文档内容可能很长，需要进行适当的截断显示。`)
      
      metadatas.push({
        type: index % 3 === 0 ? 'java' : index % 3 === 1 ? 'doc' : 'other',
        attribution: index % 2 === 0 ? 'OTA' : 'other',
        created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        size: Math.floor(Math.random() * 10000) + 1000
      })
    }
    
    return {
      ids,
      embeddings,
      documents,
      metadatas
    }
  },

  // 生成搜索结果
  generateSearchResults(query, nResults = 50) {
    const results = []
    const actualResults = Math.min(nResults, 20) // 限制返回数量
    
    for (let i = 0; i < actualResults; i++) {
      results.push({
        id: `search_result_${i + 1}`,
        content: `与"${query}"相关的搜索结果内容 ${i + 1}。这里包含了匹配的文档内容，展示了语义搜索的效果。`,
        document: `完整文档内容 ${i + 1}，包含更多详细信息...`,
        distance: Math.random() * 0.5 + 0.1, // 0.1-0.6之间的距离
        vector: Array.from({length: 384}, () => Math.random() * 2 - 1), // 384维向量
        metadata: {
          type: i % 3 === 0 ? 'java' : i % 3 === 1 ? 'doc' : 'other',
          attribution: i % 2 === 0 ? 'OTA' : 'other',
          relevance_score: Math.random() * 0.4 + 0.6 // 0.6-1.0之间的相关性分数
        }
      })
    }
    
    // 按距离排序（距离越小越相关）
    results.sort((a, b) => a.distance - b.distance)
    
    return {
      results,
      query,
      total: actualResults
    }
  },

  // 生成上传结果
  generateUploadResult(fileName, chunkSize = 1000) {
    const fileSize = Math.floor(Math.random() * 50000) + 10000
    const totalChunks = Math.ceil(fileSize / chunkSize)
    const chunks = []
    
    for (let i = 0; i < totalChunks; i++) {
      chunks.push({
        id: `chunk_${i + 1}`,
        content: `文件"${fileName}"的第${i + 1}个分块内容。这里包含了文档切割后的具体内容片段。`,
        document: `完整的分块文档内容 ${i + 1}...`,
        vector: Array.from({length: 384}, () => Math.random() * 2 - 1),
        metadata: {
          chunk_index: i,
          chunk_size: Math.min(chunkSize, fileSize - i * chunkSize),
          source_file: fileName
        }
      })
    }
    
    return {
      fileName,
      totalChunks,
      chunks,
      uploadTime: new Date().toISOString(),
      status: 'success'
    }
  },

  // 生成JSON格式upsert结果
  generateUpsertResult(documents, metadatas = []) {
    const documentCount = documents.length
    const ids = []
    
    // 生成UUID格式的ID
    for (let i = 0; i < documentCount; i++) {
      ids.push(`${Math.random().toString(36).substr(2, 8)}-${Math.random().toString(36).substr(2, 4)}-4${Math.random().toString(36).substr(2, 3)}-${Math.random().toString(36).substr(2, 4)}-${Math.random().toString(36).substr(2, 12)}`)
    }
    
    return {
      success: true,
      documentCount,
      ids,
      message: '文档上传成功',
      uploadTime: new Date().toISOString(),
      status: 'success'
    }
  }
}

// Mock API响应延迟
export function mockDelay(ms = 500) {
  return new Promise(resolve => setTimeout(resolve, ms))
} 