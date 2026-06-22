import os
import logging
import numpy as np
from typing import List, Tuple, Dict, Any

from backend.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try importing Google GenAI SDK
try:
    from google import genai
    GENAI_AVAILABLE = True
except ImportError:
    logger.warning("google-genai package not found. Embedding search will use fallback mode.")
    GENAI_AVAILABLE = False

class VectorStoreManager:
    def __init__(self, index_path: str = "./faiss_index"):
        self.index_path = index_path
        self.dimension = 768  # Dimension for Gemini text-embedding-004
        self.index_file = os.path.join(index_path, "embeddings.npy")
        
        # Initialize Google GenAI client for embeddings
        self.client = None
        if GENAI_AVAILABLE and settings.GEMINI_API_KEY:
            try:
                logger.info("Initializing Gemini Embeddings Client...")
                self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
                logger.info("Gemini Embeddings Client initialized successfully.")
            except Exception as e:
                logger.error(f"Error initializing Gemini client: {e}. Fallback active.")
                
        # Load or create NumPy embeddings array
        self.vectors = None
        self.load_index()

    def get_embeddings(self, texts: List[str]) -> np.ndarray:
        """Generate embeddings for a list of texts using Gemini API, with mock fallback if offline."""
        if self.client is not None:
            try:
                logger.info(f"Generating Gemini embeddings for {len(texts)} chunks...")
                embeddings_list = []
                # Call Gemini embed_content API
                # Batch processing to handle multiple texts
                for text in texts:
                    response = self.client.models.embed_content(
                        model="text-embedding-004",
                        contents=text
                    )
                    # Retrieve float list values
                    values = response.embeddings[0].values
                    embeddings_list.append(values)
                
                return np.array(embeddings_list).astype('float32')
            except Exception as e:
                logger.error(f"Error calling Gemini Embeddings: {e}. Falling back to mock embeddings.")
        
        # Fallback: Deterministic mock embedding based on character hashes
        logger.warning("Generating mock embeddings for offline demonstration...")
        embeddings = []
        for text in texts:
            vec = np.zeros(self.dimension)
            for i, char in enumerate(text[:self.dimension]):
                vec[i] = ord(char) / 255.0
            # Normalize vector to ensure unit length
            norm = np.linalg.norm(vec)
            if norm > 0:
                vec = vec / norm
            embeddings.append(vec)
        return np.array(embeddings).astype('float32')

    def add_chunks(self, chunks: List[str]) -> List[int]:
        """Add chunks to the in-memory array and return their index IDs."""
        if not chunks:
            return []
            
        new_vectors = self.get_embeddings(chunks) # shape (N, 768)
        
        if self.vectors is None:
            start_id = 0
            self.vectors = new_vectors
        else:
            start_id = len(self.vectors)
            self.vectors = np.vstack([self.vectors, new_vectors])
            
        end_id = len(self.vectors)
        
        # Save index to disk
        self.save_index()
        
        return list(range(start_id, end_id))
        
    def search(self, query: str, k: int = 5) -> List[Tuple[int, float]]:
        """Search using Cosine Similarity. Returns list of (index_id, distance)."""
        if self.vectors is None or len(self.vectors) == 0:
            logger.warning("Embeddings database is empty. Cannot search.")
            return []
            
        query_vector = self.get_embeddings([query])[0] # shape (768,)
        
        # Compute Cosine Similarity
        # Dot product
        dot_product = np.dot(self.vectors, query_vector) # shape (N,)
        # Norms
        norm_v = np.linalg.norm(self.vectors, axis=1) # shape (N,)
        norm_q = np.linalg.norm(query_vector)
        
        # Epsilon to prevent divide by zero
        similarities = dot_product / (norm_v * norm_q + 1e-10)
        
        # Retrieve top k highest similarities
        top_k = min(k, len(self.vectors))
        top_indices = np.argsort(similarities)[::-1][:top_k]
        
        results = []
        for idx in top_indices:
            # Distance is represented as 1.0 - similarity (like FAISS L2 behavior)
            distance = float(1.0 - similarities[idx])
            results.append((int(idx), distance))
            
        return results
        
    def save_index(self):
        """Save the NumPy embeddings array to disk."""
        if self.vectors is None:
            return
        try:
            os.makedirs(self.index_path, exist_ok=True)
            np.save(self.index_file, self.vectors)
            logger.info(f"Embeddings successfully saved to {self.index_file}. Total vectors: {len(self.vectors)}")
        except Exception as e:
            logger.error(f"Error saving embeddings to file: {e}")

    def load_index(self):
        """Load the NumPy embeddings array from disk."""
        if os.path.exists(self.index_file):
            try:
                logger.info(f"Loading existing embeddings array from {self.index_file}...")
                self.vectors = np.load(self.index_file)
                logger.info(f"Embeddings array loaded. Total vectors: {len(self.vectors)}")
            except Exception as e:
                logger.error(f"Error loading embeddings file: {e}. Starting fresh.")
                self.vectors = None
        else:
            logger.info("No existing embeddings file found. Starting fresh.")
            self.vectors = None

    def clear_index(self):
        """Reset the vector store array and delete the local file."""
        self.vectors = None
        if os.path.exists(self.index_file):
            try:
                os.remove(self.index_file)
            except Exception as e:
                logger.error(f"Could not remove embeddings file: {e}")
        logger.info("Embeddings array reset successfully.")

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
            
    return [c for c in chunks if len(c) > 10]
