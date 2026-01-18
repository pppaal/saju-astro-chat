# backend_ai/app/tarot_embeddings/cache_methods.py
"""
Cache and embedding management mixin for TarotAdvancedEmbeddings.
Contains cache handling, embedding preparation, and export/import functionality.
"""

import os
import time
import hashlib
import torch
from typing import Dict, Any, Optional


class CacheMethodsMixin:
    """Mixin providing cache and embedding management for TarotAdvancedEmbeddings."""

    def _calculate_data_hash(self) -> str:
        """Calculate hash based on file modification times (for cache invalidation)."""
        hash_data = []

        if not os.path.exists(self.rules_dir):
            return ""

        try:
            for filename in sorted(os.listdir(self.rules_dir)):
                if filename.endswith('.json'):
                    filepath = os.path.join(self.rules_dir, filename)
                    mtime = os.path.getmtime(filepath)
                    size = os.path.getsize(filepath)
                    hash_data.append(f"{filename}:{mtime}:{size}")

            hash_str = "|".join(hash_data)
            return hashlib.md5(hash_str.encode()).hexdigest()[:16]
        except Exception as e:
            print(f"[TarotAdvancedEmbeddings] Hash calculation error: {e}")
            return str(time.time())  # fallback: current time

    def clear_cache(self) -> bool:
        """Delete cache file and regenerate embeddings."""
        try:
            if os.path.exists(self.embed_cache_path):
                os.remove(self.embed_cache_path)
                print("[TarotAdvancedEmbeddings] Cache cleared")

            self.embeddings = None
            self._prepare_embeddings()
            return True
        except Exception as e:
            print(f"[TarotAdvancedEmbeddings] Failed to clear cache: {e}")
            return False

    def is_cache_valid(self) -> bool:
        """Check cache validity."""
        if not os.path.exists(self.embed_cache_path):
            return False

        try:
            cache = torch.load(self.embed_cache_path, map_location='cpu', weights_only=True)
            cached_hash = cache.get('data_hash', '')
            current_hash = self._calculate_data_hash()

            return cached_hash == current_hash and cache.get('model_name') == self.model_name
        except Exception:
            return False

    def _prepare_embeddings(self):
        """Generate or load embeddings with cache invalidation."""
        if not self.entries:
            self._log("No entries to embed", level='warning')
            return

        # Calculate current data hash
        self._data_hash = self._calculate_data_hash()

        # Check cache with hash validation
        if os.path.exists(self.embed_cache_path):
            try:
                cache = torch.load(self.embed_cache_path, map_location='cpu', weights_only=True)

                # Cache validity check: entry count + data hash + model name
                cache_valid = (
                    cache.get('entry_count') == len(self.entries) and
                    cache.get('data_hash') == self._data_hash and
                    cache.get('model_name') == self.model_name
                )

                if cache_valid:
                    self.embeddings = cache['embeddings']
                    # float16 conversion (optional)
                    if self.use_float16 and self.embeddings.dtype != torch.float16:
                        self.embeddings = self.embeddings.half()
                        self._log("Converted embeddings to float16 for memory optimization")
                    self._log(f"Loaded cached embeddings ({len(self.entries)} entries, hash={self._data_hash[:8]})")
                    return
                else:
                    reason = []
                    if cache.get('entry_count') != len(self.entries):
                        reason.append(f"entry count mismatch ({cache.get('entry_count')} != {len(self.entries)})")
                    if cache.get('data_hash') != self._data_hash:
                        reason.append("data files changed")
                    if cache.get('model_name') != self.model_name:
                        reason.append(f"model changed ({cache.get('model_name')} -> {self.model_name})")
                    self._log(f"Cache invalidated: {', '.join(reason)}")

            except Exception as e:
                self._log(f"Cache load failed: {e}", level='warning')

        # Check if model is available
        if self.model is None:
            self._log("Model not available, skipping embedding generation", level='warning')
            return

        # Generate new embeddings with retry
        max_retries = 2
        for attempt in range(max_retries):
            try:
                self._log(f"Generating embeddings for {len(self.entries)} entries (model: {self.model_name})...")
                texts = [e['text'] for e in self.entries]
                self.embeddings = self.model.encode(
                    texts,
                    convert_to_tensor=True,
                    normalize_embeddings=True,
                    show_progress_bar=len(texts) > 100 and self.verbose,
                    batch_size=32
                )

                # float16 conversion (optional)
                if self.use_float16:
                    self.embeddings = self.embeddings.half()
                    self._log("Using float16 embeddings for memory optimization")

                self._log(f"Generated {self.embeddings.shape[0]} embeddings (dtype: {self.embeddings.dtype})")
                break
            except Exception as e:
                self._log(f"Embedding generation attempt {attempt + 1} failed: {e}", level='error')
                if attempt == max_retries - 1:
                    self._log("All embedding attempts failed", level='error')
                    return

        # Save cache with metadata
        try:
            # Always save cache as float32 (for compatibility)
            embeddings_to_save = self.embeddings.float() if self.use_float16 else self.embeddings
            torch.save({
                'entry_count': len(self.entries),
                'embeddings': embeddings_to_save,
                'data_hash': self._data_hash,
                'model_name': self.model_name,
                'created_at': time.time()
            }, self.embed_cache_path)
            self._log(f"Saved embeddings to cache (hash={self._data_hash[:8]})")
        except Exception as e:
            self._log(f"Failed to save cache: {e}", level='error')

    def clear_query_cache(self):
        """Clear query result cache."""
        if self._query_cache:
            self._query_cache.clear()
            self._log("Query cache cleared")

    def get_query_cache_stats(self) -> Dict[str, Any]:
        """Get query cache statistics."""
        if self._query_cache:
            return {
                'enabled': True,
                'size': len(self._query_cache),
                'max_size': self._query_cache.maxsize
            }
        return {'enabled': False}

    # =========================================================================
    # Export / Import
    # =========================================================================
    def export_embeddings(self, filepath: str) -> bool:
        """
        Export embeddings and entries to file.

        Args:
            filepath: Export file path (.pt or .pth)

        Returns:
            Success status
        """
        try:
            if self.embeddings is None:
                self._log("No embeddings to export", level='error')
                return False

            export_data = {
                'version': '3.0',
                'entries': self.entries,
                'embeddings': self.embeddings.cpu().float(),  # Save as CPU + float32
                'model_name': self.model_name,
                'data_hash': self._data_hash,
                'categories_summary': self.get_categories_summary(),
                'exported_at': time.time()
            }

            torch.save(export_data, filepath)
            self._log(f"Exported {len(self.entries)} entries to {filepath}")
            return True

        except Exception as e:
            self._log(f"Export failed: {e}", level='error')
            return False

    def import_embeddings(self, filepath: str, validate: bool = True) -> bool:
        """
        Import exported embedding file.

        Args:
            filepath: Import file path
            validate: Whether to validate model name

        Returns:
            Success status
        """
        try:
            if not os.path.exists(filepath):
                self._log(f"Import file not found: {filepath}", level='error')
                return False

            import_data = torch.load(filepath, map_location='cpu', weights_only=False)

            # Version check
            version = import_data.get('version', 'unknown')
            self._log(f"Importing embeddings (version: {version})")

            # Model validation (optional)
            if validate and import_data.get('model_name') != self.model_name:
                self._log(
                    f"Model mismatch: imported={import_data.get('model_name')}, current={self.model_name}",
                    level='warning'
                )

            # Load data
            self.entries = import_data['entries']
            self.embeddings = import_data['embeddings']
            self._data_hash = import_data.get('data_hash', '')

            # Apply float16 option
            if self.use_float16:
                self.embeddings = self.embeddings.half()

            # Move to device
            if self.device != 'cpu' and self.embeddings is not None:
                try:
                    self.embeddings = self.embeddings.to(self.device)
                except Exception:
                    pass  # Keep on CPU if GPU move fails

            self._log(f"Imported {len(self.entries)} entries from {filepath}")
            return True

        except Exception as e:
            self._log(f"Import failed: {e}", level='error')
            return False
