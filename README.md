# ChromaDatabaseManagerSystem
ChromaDB Vector Database Management System: A modern web-based management interface for ChromaDB vector databases, built with Vue.js 3 and Element Plus.

## 🚀 Features

### Database Connection Management
- **Real-time Connection Testing**: Connect to ChromaDB instances with configurable IP, port, tenant, and database settings
- **Connection Status Monitoring**: Visual indicators for connection status with automatic reconnection capabilities
- **Multi-tenant Support**: Support for multiple tenants and databases within a single ChromaDB instance

### Collection Management
- **Collection Overview**: View all collections with metadata, document counts, and configuration details
- **Collection Details**: Read-only detailed view of collection properties including embedding functions and metadata
- **Collection Creation**: Create new collections with custom configurations and metadata
- **Collection Deletion**: Safe deletion with confirmation dialogs
- **Pagination Support**: Efficient browsing of large collection lists

### Document Operations
- **Document Query**: Browse all documents in a collection with pagination (10 items per page)
- **Document Details**: View document content, metadata, and unique identifiers
- **Document Deletion**: Remove individual or multiple documents from collections

### Semantic Search
- **Vector Similarity Search**: Perform semantic searches using natural language queries
- **Metadata Filtering**: Apply optional metadata filters to refine search results
- **Configurable Results**: Adjust the number of returned results (default: 50)
- **Detailed Results**: View document content, metadata, similarity scores, and vector embeddings

### Document Upload
- **File Upload**: Upload documents with automatic text processing and chunking
- **Document Segmentation**: Configurable chunk size and overlap settings for optimal vector generation
- **Metadata Assignment**: 
  - Document type classification (Java, Doc, or custom)
  - Attribution settings (OTA or custom)
- **Upload Progress**: Real-time upload status with detailed result reporting
- **Batch Processing**: View detailed information for each processed document chunk

## 🛠️ Technology Stack

- **Frontend Framework**: Vue.js 3 with Composition API
- **UI Components**: Element Plus
- **State Management**: Pinia
- **HTTP Client**: Axios
- **Build Tool**: Vite
- **Styling**: SCSS with scoped styles

## 📦 Installation

### Prerequisites
- Node.js (version 16 or higher)
- npm or yarn package manager
- ChromaDB instance (local or remote)

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ChromaDatabaseManagerSystem
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Development server**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5173`

4. **Production build**
   ```bash
   npm run build
   ```

5. **Preview production build**
   ```bash
   npm run preview
   ```

## 🚀 Deployment

### Local Development
1. Start your ChromaDB instance (default: `http://localhost:8000`)
2. Run the development server: `npm run dev`
3. Access the application at `http://localhost:5173`

### Production Deployment
1. Build the application: `npm run build`
2. Serve the `dist` folder using any static file server
3. Configure your web server to handle Vue.js routing (SPA mode)

### Docker Deployment (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 5173
CMD ["npm", "run", "preview"]
```

## 📖 Usage Guide

### Initial Setup
1. **Connect to ChromaDB**
   - Enter your ChromaDB server IP address (default: 127.0.0.1)
   - Specify the port (default: 8000)
   - Configure tenant and database names (defaults: default_tenant, default_database)
   - Click "Connect" to establish connection

2. **Select Collection**
   - Choose from available collections in the dropdown menu
   - View collection details in the left sidebar

### Managing Collections
1. **View Collections**: Navigate to "Collection Management" to see all available collections
2. **Create Collection**: Click "Create Collection" and fill in the required details
3. **View Details**: Click "Details" button to view read-only collection information
4. **Delete Collection**: Use the "Delete" button with confirmation for safe removal

### Document Operations
1. **Browse Documents**: Use the "Document Query" tab to view all documents
2. **Search Documents**: Use the "Semantic Search" tab for vector-based searches
3. **Upload Documents**: Use the "Document Upload" tab to add new content

### Advanced Features
- **Metadata Filtering**: Use JSON format for complex metadata queries
- **Batch Operations**: Select multiple documents for bulk operations
- **Real-time Updates**: Automatic refresh of data when changes occur

## 🔧 Configuration

### Environment Variables
- `VITE_API_BASE_URL`: Base URL for ChromaDB API (default: auto-detected)
- `VITE_MOCK_MODE`: Enable mock data mode for development (default: false)

### ChromaDB Configuration
Ensure your ChromaDB instance is configured to accept connections from the web interface:
```python
# Example ChromaDB server configuration
import chromadb
from chromadb.config import Settings

client = chromadb.HttpClient(
    host="localhost",
    port=8000,
    settings=Settings(
        chroma_server_cors_allow_origins=["*"]
    )
)
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🐛 Support

For issues, feature requests, or questions:
1. Check the existing issues on GitHub
2. Create a new issue with detailed information
3. Include system information and error logs when applicable

## 🔄 Version History

- **v1.0.0**: Initial release with core functionality
  - Collection management
  - Document query and upload
  - Semantic search capabilities
  - Modern Vue.js 3 interface 
