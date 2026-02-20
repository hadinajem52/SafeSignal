"""
pytest configuration — adds the ml-service root to sys.path so that
tests can import local modules (cache_manager, config, providers, etc.)
regardless of which directory pytest is invoked from.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
