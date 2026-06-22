import os
import logging
import numpy as np
import faiss
from typing import List, Tuple, Dict, Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try importing SentenceTransformers, fallback to Mock or Gemini if unavailable
try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    logger.warning("sentence-transformers package not installed. Embedding search will use fallback mode.")
    SENTENCE_TRANSFORMERS_AVAILABLE = False

class VectorStoreManager:
    def __init__(self, index_path: str = "./faiss_index", model_name: str = "all-MiniLM-L6-v2"):
        self.index_path = index_path
        self.model_name = model_name
        self.dimension = 384  # Dimension for all-MiniLM-L6-v2
        self.index_file = os.path.join(index_path, "index.faiss")
        
        # Load embedding model
        self.model = None
        if SENTENCE_TRANSFORMERS_AVAILABLE:
            try:
                logger.info(f"Loading SentenceTransformer model: {model_name}...")
                self.model = SentenceTransformer(model_name)
                logger.info("SentenceTransformer model loaded successfully.")
            except Exception as e:
                logger.error(f"Error loading SentenceTransformer: {e}. Fallback to mock embedding will be active.")
                
        # Initialize FAISS Index
        if os.path.exists(self.index_file):
            try:
                logger.info(f"Loading existing FAISS index from {self.index_file}...")
                self.index = faiss.read_index(self.index_file)
                logger.info(f"FAISS index loaded. Total items: {self.index.ntotal}")
            except Exception as e:
                logger.error(f"Error loading FAISS index: {e}. Creating new index.")
                self.index = faiss.IndexFlatL2(self.dimension)
        else:
            logger.info("No existing FAISS index found. Creating new IndexFlatL2 index.")
            self.index = faiss.IndexFlatL2(self.dimension)
            
    def get_embeddings(self, texts: List[str]) -> np.ndarray:
        """Generate embeddings for a list of texts, with mock fallback if model is not loaded."""
        if self.model is not None:
            try:
                embeddings = self.model.encode(texts)
                return np.array(embeddings).astype('float32')
            except Exception as e:
                logger.error(f"Error generating embeddings: {e}. Falling back to mock embeddings.")
        
        # Fallback: Deterministic mock embedding based on character hashes
        logger.warning("Generating mock embeddings...")
        embeddings = []
        for text in texts:
            # Create a deterministic mock vector
            vec = np.zeros(self.dimension)
            for i, char in enumerate(text[:self.dimension]):
                vec[i] = ord(char) / 255.0
            # Normalize vector
            norm = np.linalg.norm(vec)
            if norm > 0:
                vec = vec / norm
            embeddings.append(vec)
        return np.array(embeddings).astype('float32')

    def add_chunks(self, chunks: List[str]) -> List[int]:
        """Add chunks to the FAISS index and return their corresponding index IDs."""
        if not chunks:
            return []
            
        embeddings = self.get_embeddings(chunks)
        start_id = self.index.ntotal
        self.index.add(embeddings)
        end_id = self.index.ntotal
        
        # Save index to disk
        self.save_index()
        
        return list(range(start_id, end_id))
        
    def search(self, query: str, k: int = 5) -> List[Tuple[int, float]]:
        """Search the FAISS index for the query. Returns list of (index_id, distance)."""
        if self.index.ntotal == 0:
            logger.warning("FAISS index is empty. Cannot search.")
            return []
            
        query_embedding = self.get_embeddings([query])
        # FAISS search returns distances and indexes
        distances, indexes = self.index.search(query_embedding, min(k, self.index.ntotal))
        
        results = []
        for dist, idx in zip(distances[0], indexes[0]):
            if idx != -1:  # -1 represents no match found
                results.append((int(idx), float(dist)))
        return results
        
    def save_index(self):
        """Save the FAISS index to disk."""
        try:
            os.makedirs(self.index_path, exist_ok=True)
            faiss.write_index(self.index, self.index_file)
            logger.info(f"FAISS index successfully saved to {self.index_file}. Total size: {self.index.ntotal}")
        except Exception as e:
            logger.error(f"Error saving FAISS index: {e}")

    def clear_index(self):
        """Reset the vector store index."""
        self.index = faiss.IndexFlatL2(self.dimension)
        if os.path.exists(self.index_file):
            try:
                os.remove(self.index_file)
            except Exception as e:
                logger.error(f"Could not remove index file: {e}")
        logger.info("FAISS Index reset successfully.")

# Global instance for app lifecycle
vector_store_manager = VectorStoreManager()

def chunk_text(text: str, chunk_size: int = 1000, chunk_overlap: int = 200) -> List[str]:
    """Split text into overlapping chunks recursively or by characters."""
    if not text:
        return []
        
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        # Try to find a natural boundary (newline, period, space)
        if end < len(text):
            boundary = -1
            for separator in ['\n\n', '\n', '. ', ' ']:
                idx = text.rfind(separator, start + int(chunk_size * 0.5), end)
                if idx != -1:
                    boundary = idx + len(separator)
                    break
            if boundary != -1:
                end = boundary
        
        chunks.append(text[start:end].strip())
        start = end - chunk_overlap
        if start >= len(text) or end == len(text):
            break
            
    # Remove empty or whitespace-only chunks
    return [c for c in chunks if len(c) > 10]
