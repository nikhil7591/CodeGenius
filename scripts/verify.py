#!/usr/bin/env python3
"""
Quick verification script to test CodeGenius with markdown rendering and workflow feature.
Run this after uploading a test repository.
"""

import requests
import json
import time

BASE_URL = "http://localhost:5000"

def test_health():
    """Test if backend is running."""
    try:
        resp = requests.get(f"{BASE_URL}/api/health", timeout=5)
        print(f"✓ Backend Health: {resp.json()}")
        return True
    except Exception as e:
        print(f"✗ Backend Health Failed: {e}")
        return False

def test_workflow(repo_name):
    """Test workflow generation."""
    try:
        resp = requests.get(f"{BASE_URL}/api/workflow?repo={repo_name}", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            print(f"✓ Workflow Generated:")
            print(f"  - Nodes: {len(data.get('nodes', []))}")
            print(f"  - Edges: {len(data.get('edges', []))}")
            print(f"\n  Node Types:")
            for node in data.get('nodes', [])[:8]:
                print(f"    - {node['id']}: {node['label']} ({node['type']})")
            return True
        else:
            print(f"✗ Workflow Error: {resp.status_code} - {resp.text}")
            return False
    except Exception as e:
        print(f"✗ Workflow Request Failed: {e}")
        return False

def test_chat(repo_name, query="What's the structure of this project?"):
    """Test chat with markdown response."""
    try:
        resp = requests.post(
            f"{BASE_URL}/api/chat",
            json={"query": query},
            timeout=15
        )
        if resp.status_code == 200:
            data = resp.json()
            print(f"✓ Chat Response:")
            print(f"  - Status: {data.get('status')}")
            print(f"  - Model: {data.get('model')}")
            print(f"  - Answer Length: {len(data.get('answer', ''))} chars")
            print(f"  - Sources: {len(data.get('sources', []))} files")
            # Check if answer contains markdown indicators
            has_markdown = any(x in data.get('answer', '') for x in ['```', '##', '-', '**'])
            print(f"  - Contains Markdown: {'Yes' if has_markdown else 'No (plain text OK)'}")
            return True
        else:
            print(f"✗ Chat Error: {resp.status_code}")
            return False
    except Exception as e:
        print(f"✗ Chat Request Failed: {e}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("CodeGenius Feature Verification")
    print("=" * 60)
    
    if not test_health():
        print("\n⚠️  Backend is not running. Start it with: python app.py")
        exit(1)
    
    print("\n" + "=" * 60)
    print("Testing with sample repository...")
    print("=" * 60)
    
    # Test with a sample repo (change this to match your uploaded repo)
    TEST_REPO = "my-test-project"  # Change this to your actual repo name
    
    print(f"\nTesting with repo: {TEST_REPO}")
    print("-" * 60)
    
    print("\n1. Testing Workflow Generation:")
    test_workflow(TEST_REPO)
    
    print("\n2. Testing Chat (Markdown Rendering):")
    test_chat(TEST_REPO)
    
    print("\n" + "=" * 60)
    print("Verification Complete!")
    print("=" * 60)
    print("\nFrontend Tests:")
    print("1. Open http://localhost:5173 in browser")
    print("2. Upload a ZIP file")
    print("3. Ask a question - check for markdown rendering:")
    print("   ✓ Code blocks with copy button")
    print("   ✓ Inline code styled as cyan pill")
    print("   ✓ Headers with colors")
    print("   ✓ Lists with bullets")
    print("4. Click 'View Workflow' button in sidebar")
    print("   ✓ Modal opens with animated nodes")
    print("   ✓ SVG arrows connect nodes")
    print("   ✓ Nodes float/pulse on hover")
    print("   ✓ Zoom controls work")
