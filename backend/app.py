from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import sys
import json
import threading
import traceback
import requests
from dotenv import load_dotenv
from pathlib import Path

from rag_pipeline import RAGPipeline
from vector_store import VectorStore

load_dotenv()

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', 'uploads')
MAX_UPLOAD_SIZE = int(os.getenv('MAX_UPLOAD_SIZE', 100000000))
VECTOR_STORE_PATH = os.getenv('VECTOR_STORE_PATH', './chroma_data')

# FIXED: Set Flask's MAX_CONTENT_LENGTH so Werkzeug enforces the limit
# before the entire body is buffered into RAM
app.config['MAX_CONTENT_LENGTH'] = MAX_UPLOAD_SIZE

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

vector_store = VectorStore(persist_directory=VECTOR_STORE_PATH)
rag_pipeline = RAGPipeline(vector_store)
current_repo_name = None

# Global upload progress tracker + lock for thread safety
_progress_lock = threading.Lock()
upload_progress = {
    'status': 'idle',      # idle | uploading | processing | done | error
    'message': '',
    'progress': 0          # 0-100
}


def _set_progress(status: str, message: str, progress: int):
    """Thread-safe in-place update of upload_progress."""
    with _progress_lock:
        upload_progress['status'] = status
        upload_progress['message'] = message
        upload_progress['progress'] = progress


def get_groq_response(context: str, query: str) -> dict:
    try:
        from groq import Groq
    except ImportError:
        return {"error": "groq package not installed. Run: pip install groq"}

    try:
        api_key = os.getenv('GROQ_API_KEY')
        if not api_key or api_key.strip() == "":
            return {"error": "GROQ_API_KEY not configured"}

        print("[LLM] Trying Groq API...")

        client = Groq(api_key=api_key)
        model = os.getenv('GROQ_MODEL', 'llama-3.1-8b-instant')

        system_prompt = "You are a code analysis expert. Answer questions about code concisely and clearly."

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Code Context:\n{context[:4000]}\n\nQuestion: {query}"}
        ]

        response = client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=1024,
            temperature=0.5
        )

        answer = response.choices[0].message.content
        if not answer or not answer.strip():
            return {"error": "Groq returned empty response"}

        print("[LLM] Groq response received")
        return {
            "answer": answer,
            "model": "Groq",
            "model_name": model
        }

    except Exception as e:
        print(f"[LLM] Groq error: {str(e)}")
        return {"error": f"Groq error: {str(e)}"}


def get_ollama_response(context: str, query: str) -> dict:
    try:
        base_url = os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')
        model = os.getenv('OLLAMA_MODEL', 'tinyllama')

        print(f"[LLM] Trying Ollama ({model})...")

        try:
            health = requests.get(f'{base_url}/api/tags', timeout=5)
            if health.status_code != 200:
                return {"error": f"Ollama returned status {health.status_code}"}
        except requests.exceptions.ConnectionError:
            return {"error": f"Ollama not running at {base_url}. Start it with: ollama serve"}
        except requests.exceptions.Timeout:
            return {"error": f"Ollama at {base_url} timed out"}

        prompt = f"""Analyze this code and answer the question concisely.

Code:
{context[:3000]}

Question: {query}

Answer:"""

        response = requests.post(
            f'{base_url}/api/generate',
            json={
                "model": model,
                "prompt": prompt,
                "stream": False
            },
            timeout=120
        )

        if response.status_code == 200:
            data = response.json()
            answer = data.get('response', '').strip()
            if answer:
                print("[LLM] Ollama response received")
                return {
                    "answer": answer,
                    "model": "Ollama",
                    "model_name": model
                }
            return {"error": "Ollama returned empty response"}

        if response.status_code == 404:
            return {"error": f"Model '{model}' not found. Run: ollama pull {model}"}

        return {"error": f"Ollama error: HTTP {response.status_code}"}

    except Exception as e:
        print(f"[LLM] Ollama error: {str(e)}")
        return {"error": str(e)}


def generate_context_answer(context: str, query: str) -> dict:
    if not context or not context.strip():
        return {
            "answer": "I found no relevant code for your question. Try rephrasing or ask about a different part of the codebase.",
            "model": "Context",
            "model_name": "RAG-only"
        }

    lines = context.strip().split('\n')
    snippet = '\n'.join(lines[:30])

    return {
        "answer": f"Both Groq and Ollama are unavailable, but here are the most relevant code sections I found:\n\n```\n{snippet}\n```\n\nPlease configure Groq (set GROQ_API_KEY) or start Ollama (ollama serve) for AI-powered analysis.",
        "model": "Context",
        "model_name": "RAG-only"
    }


def generate_answer(context: str, query: str) -> dict:
    result = get_groq_response(context, query)
    if "error" not in result:
        return result

    print(f"Groq unavailable ({result['error']}), falling back to Ollama...")

    result = get_ollama_response(context, query)
    if "error" not in result:
        return result

    print(f"Ollama unavailable ({result['error']}), falling back to context-only...")

    return generate_context_answer(context, query)


@app.route('/api/health', methods=['GET'])
def health_check():
    try:
        groq_available = False
        api_key = os.getenv('GROQ_API_KEY')
        if api_key and api_key.strip():
            try:
                from groq import Groq
                groq_available = True
            except ImportError:
                groq_available = False

        ollama_available = False
        try:
            ollama_url = os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')
            resp = requests.get(f'{ollama_url}/api/tags', timeout=3)
            ollama_available = resp.status_code == 200
        except Exception:
            ollama_available = False

        return jsonify({
            "status": "healthy",
            "groq_available": groq_available,
            "ollama_available": ollama_available,
            "vector_store": vector_store.get_collection_info()
        })
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500


@app.route('/api/progress', methods=['GET'])
def get_progress():
    """Polling endpoint for frontend to track real upload/processing progress."""
    with _progress_lock:
        return jsonify(dict(upload_progress))


@app.route('/api/upload', methods=['POST'])
def upload_repository():
    global current_repo_name

    try:
        _set_progress('uploading', 'Receiving file...', 52)
        print(f"\n[UPLOAD] === Upload request received ===", flush=True)

        if 'file' not in request.files:
            _set_progress('error', 'No file part in request', 0)
            print(f"[UPLOAD] ERROR: No file part in request", flush=True)
            return jsonify({"error": "No file part in request"}), 400

        file = request.files['file']

        if file.filename == '':
            _set_progress('error', 'No file selected', 0)
            print(f"[UPLOAD] ERROR: No file selected", flush=True)
            return jsonify({"error": "No file selected"}), 400

        if not file.filename.lower().endswith('.zip'):
            _set_progress('error', 'Only ZIP files allowed', 0)
            print(f"[UPLOAD] ERROR: Not a ZIP file: {file.filename}", flush=True)
            return jsonify({"error": "Only ZIP files are allowed"}), 400

        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)

        print(f"[UPLOAD] File: {file.filename} ({file_size / 1024 / 1024:.1f} MB)", flush=True)

        if file_size > MAX_UPLOAD_SIZE:
            _set_progress('error', 'File too large', 0)
            print(f"[UPLOAD] ERROR: File too large ({file_size} bytes)", flush=True)
            return jsonify({"error": f"File too large ({file_size / 1024 / 1024:.1f} MB). Max: {MAX_UPLOAD_SIZE // 1000000} MB"}), 413

        if file_size == 0:
            _set_progress('error', 'File is empty', 0)
            print(f"[UPLOAD] ERROR: File is empty", flush=True)
            return jsonify({"error": "Uploaded file is empty"}), 400

        filename = secure_filename(file.filename)
        if not filename:
            _set_progress('error', 'Invalid filename', 0)
            print(f"[UPLOAD] ERROR: Invalid filename", flush=True)
            return jsonify({"error": "Invalid filename"}), 400

        repo_name = request.form.get('repo_name', Path(filename).stem)
        # Sanitize repo_name to avoid path injection
        repo_name = secure_filename(repo_name) or Path(filename).stem
        filepath = os.path.join(UPLOAD_FOLDER, filename)

        _set_progress('processing', 'Saving file to disk...', 55)
        print(f"[UPLOAD] Saving file to disk: {filepath}", flush=True)
        file.save(filepath)

        if not os.path.exists(filepath):
            _set_progress('error', 'File failed to save', 0)
            print(f"[UPLOAD] ERROR: File failed to save to disk", flush=True)
            return jsonify({"error": "File failed to save"}), 500

        _set_progress('processing', 'Extracting ZIP & scanning files...', 60)
        print(f"[UPLOAD] ✓ File saved. Starting processing for: {repo_name}", flush=True)
        print(f"[UPLOAD] Please wait... this can take 1-5 minutes on 8GB RAM systems", flush=True)

        # Hook into RAGPipeline to update progress during chunking/embedding
        def on_progress(stage: str, pct: int):
            _set_progress('processing', stage, pct)
            print(f"[UPLOAD] Progress {pct}%: {stage}", flush=True)

        result = rag_pipeline.process_repository(filepath, repo_name, progress_callback=on_progress)

        _set_progress('done', 'Processing complete!', 100)
        print(f"[UPLOAD] ✓ Processing complete: {result.get('message', '')}", flush=True)
        current_repo_name = repo_name

        try:
            os.remove(filepath)
            print(f"[UPLOAD] Cleaned up uploaded ZIP file", flush=True)
        except Exception:
            pass

        print(f"[UPLOAD] ✓ Sending success response to frontend", flush=True)
        return jsonify(result), 200

    except Exception as e:
        _set_progress('error', str(e), 0)
        print(f"[UPLOAD] ✗ FATAL ERROR: {str(e)}", flush=True)
        traceback.print_exc()
        sys.stdout.flush()
        return jsonify({"error": str(e)}), 500


@app.route('/api/chat', methods=['POST'])
def chat():
    global current_repo_name
    try:
        # FIXED: Return 400 (not 500) when no repository is loaded
        if not current_repo_name:
            return jsonify({"error": "No repository loaded. Please upload a ZIP file first."}), 400

        # FIXED: Guard against vector_store having no collection (e.g. after server restart)
        if vector_store.collection is None:
            # Try to reconnect to the persisted collection
            reconnected = vector_store.try_reconnect(current_repo_name)
            if not reconnected:
                current_repo_name = None
                return jsonify({"error": "Repository data was lost (server may have restarted). Please re-upload your ZIP file."}), 400

        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid JSON body"}), 400

        query = data.get('query', '').strip()

        if not query:
            return jsonify({"error": "Empty query"}), 400

        print(f"[CHAT] Retrieving context for: {query}")
        retrieval_result = rag_pipeline.retrieve(query, n_results=5)
        print(f"[CHAT] Retrieval status: {retrieval_result.get('status')}")

        if retrieval_result.get('error'):
            return jsonify(retrieval_result), 500

        context_parts = []
        sources = []

        for result in retrieval_result['results']:
            context_parts.append(f"[{result['filename']}]\n{result['chunk']}")
            source_info = {
                "filename": result['filename'],
                "filepath": result['source'],
                "relevance": result['relevance']
            }
            if source_info not in sources:
                sources.append(source_info)

        formatted_context = "\n\n".join(context_parts)

        print(f"[CHAT] Generating answer with {len(sources)} sources...")
        llm_result = generate_answer(formatted_context, query)
        print(f"[CHAT] Answer generated via {llm_result.get('model', 'unknown')}")

        return jsonify({
            "status": "success",
            "query": query,
            "answer": llm_result['answer'],
            "model": llm_result['model'],
            "model_name": llm_result['model_name'],
            "sources": sources,
            "repository": current_repo_name
        }), 200

    except Exception as e:
        print(f"[CHAT] Error: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route('/api/repository-info', methods=['GET'])
def repository_info():
    try:
        if not current_repo_name:
            return jsonify({"loaded": False}), 200

        info = rag_pipeline.get_repository_summary(current_repo_name)
        return jsonify({
            "loaded": True,
            "repository": current_repo_name,
            "info": info
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/reset', methods=['POST'])
def reset_store():
    global current_repo_name

    try:
        vector_store.reset()
        current_repo_name = None
        rag_pipeline.repository_metadata.clear()
        _set_progress('idle', '', 0)

        return jsonify({
            "status": "success",
            "message": "Vector store cleared"
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/workflow', methods=['GET'])
def get_workflow():
    """Generate a workflow flowchart from the repo's saved chunks JSON."""
    repo = request.args.get('repo', '').strip()
    if not repo:
        return jsonify({'error': 'Missing ?repo= parameter'}), 400

    chunks_path = os.path.join(os.path.dirname(__file__), 'chunks', f'{repo}.json')
    if not os.path.exists(chunks_path):
        return jsonify({'error': f'No chunks found for "{repo}". Please upload and process the ZIP first.'}), 404

    try:
        with open(chunks_path, encoding='utf-8') as f:
            chunks_data = json.load(f)
    except Exception as e:
        return jsonify({'error': f'Failed to read chunks: {str(e)}'}), 500

    chunks_list = chunks_data.get('chunks', [])
    total_chunks = chunks_data.get('total_chunks', 0)
    total_files  = chunks_data.get('total_files', 0)

    # ── Build enriched context ──────────────────────────────────────────────
    # Collect unique filenames grouped by extension
    filenames = list({c.get('filename', '') for c in chunks_list if c.get('filename')})
    file_list = '\n'.join(f'- {fn}' for fn in sorted(filenames)[:50])

    # Pick up to 8 representative code/content snippets from different files
    seen_files = set()
    snippets = []
    for chunk in chunks_list:
        fname = chunk.get('filename', '')
        text  = chunk.get('text', '')
        if fname and fname not in seen_files and text and len(text.strip()) > 60:
            seen_files.add(fname)
            # Take first 300 chars of the chunk as a sample
            preview = text.strip()[:300].replace('\n', ' ').strip()
            snippets.append(f"[{fname}]: {preview}")
        if len(snippets) >= 8:
            break

    snippets_text = '\n\n'.join(snippets) if snippets else '(no code snippets available)'

    prompt = f"""You are a software architecture expert. Analyze this real codebase and produce an ACCURATE workflow flowchart that reflects how this specific project actually works.

Repository: {repo}
Total files: {total_files} | Total chunks: {total_chunks}

Files in this repo:
{file_list}

Real code/content samples from key files:
{snippets_text}

Based on the ACTUAL files and code above, return ONLY a valid JSON object (no markdown, no explanation, no ```):
{{
  "nodes": [
    {{"id": "n1", "label": "Short Label", "description": "One sentence what this does.", "type": "entry"}},
    ...
  ],
  "edges": [
    {{"from": "n1", "to": "n2"}},
    ...
  ]
}}

Rules:
- 6 to 9 nodes total, ordered logically from start to finish
- Node types (pick exactly from): entry, process, decision, database, api, output
- First node MUST be type "entry", last node MUST be type "output"
- All edges must form one connected flow (no orphan nodes)
- Labels: max 4 words. Descriptions: max 14 words.
- MUST reflect the actual project — not a generic template. Use real module/feature names from the files.
- If it is a document/PDF/Office project, describe document processing flow.
- If it is a web app, describe frontend → backend → DB → response flow.
- If it is a data science project, describe data → model → output flow.
"""

    # Try Groq first
    groq_key = os.getenv('GROQ_API_KEY', '').strip()
    groq_model = os.getenv('GROQ_MODEL', 'llama-3.1-8b-instant')

    if groq_key:
        try:
            from groq import Groq
            client = Groq(api_key=groq_key)
            resp = client.chat.completions.create(
                model=groq_model,
                messages=[{'role': 'user', 'content': prompt}],
                temperature=0.3,
                max_tokens=1500,
            )
            raw = resp.choices[0].message.content.strip()

            # Strip any markdown code fences robustly
            import re
            json_match = re.search(r'\{[\s\S]*\}', raw)
            if json_match:
                raw = json_match.group(0)

            graph = json.loads(raw)

            # Validate graph has required keys
            if 'nodes' in graph and 'edges' in graph and len(graph['nodes']) >= 2:
                print(f'[WORKFLOW] Groq generated {len(graph["nodes"])} nodes', flush=True)
                return jsonify(graph), 200
            else:
                raise ValueError("Groq returned invalid graph structure")

        except Exception as e:
            print(f'[WORKFLOW] Groq failed ({e}), falling back to heuristic...', flush=True)

    # ── Smarter heuristic fallback ────────────────────────────────────────────
    exts = {}
    for fn in filenames:
        ext = os.path.splitext(fn)[1].lower()
        exts[ext] = exts.get(ext, 0) + 1

    has_py    = '.py'  in exts
    has_jsx   = any(e in exts for e in ['.jsx', '.tsx', '.js', '.ts'])
    has_db    = any(e in exts for e in ['.db', '.sql', '.sqlite'])
    has_pdf   = '.pdf' in exts
    has_docx  = any(e in exts for e in ['.docx', '.doc'])
    has_excel = any(e in exts for e in ['.xlsx', '.xls', '.xlsm', '.csv'])
    has_pptx  = any(e in exts for e in ['.pptx', '.ppt'])
    has_ml    = any(fn.lower() in ('model.py', 'train.py', 'predict.py', 'inference.py')
                    for fn in filenames)

    nodes, edges = [], []
    nid = [0]

    def add_node(label, desc, typ):
        nid[0] += 1
        nid_str = f'n{nid[0]}'
        nodes.append({'id': nid_str, 'label': label, 'description': desc, 'type': typ})
        if len(nodes) > 1:
            edges.append({'from': f'n{nid[0]-1}', 'to': nid_str})
        return nid_str

    # Choose flow type based on detected content
    if has_pdf or has_docx or has_excel or has_pptx:
        # Document processing flow
        add_node('Document Upload', 'User uploads PDF/Word/Excel/PPT file', 'entry')
        add_node('File Extraction', 'Text extracted from document contents', 'process')
        add_node('Text Chunking', 'Content split into indexed segments', 'process')
        add_node('Embedding Engine', 'Sentence transformer creates embeddings', 'api')
        add_node('Vector Storage', 'ChromaDB stores document embeddings', 'database')
        add_node('Query & Retrieval', 'RAG retrieves relevant document sections', 'decision')
        add_node('AI Answer', 'LLM generates answer from context', 'output')
    elif has_ml and has_py:
        # ML/Data science flow
        add_node('Raw Data Input', 'Dataset loaded for processing', 'entry')
        add_node('Data Processing', 'Cleaning, feature engineering, transforms', 'process')
        add_node('Model Training', 'ML model trained on processed data', 'process')
        add_node('Evaluation', 'Model performance measured and tuned', 'decision')
        add_node('Model Storage', 'Trained model persisted to disk', 'database')
        add_node('Prediction API', 'Model served via API endpoint', 'api')
        add_node('Output Results', 'Predictions returned to caller', 'output')
    elif has_jsx and has_py:
        # Full-stack web app
        add_node('User Request', 'Browser sends request via React UI', 'entry')
        add_node('React Frontend', 'UI components handle interaction', 'process')
        add_node('REST API', 'Flask/FastAPI routes and validates request', 'api')
        add_node('Business Logic', 'Core backend processing and computation', 'process')
        if has_db:
            add_node('Database', 'Persistent storage layer queried', 'database')
        add_node('LLM / RAG', 'AI model generates intelligent response', 'decision')
        add_node('Response Output', 'Structured JSON returned to frontend', 'output')
    elif has_py:
        # Python backend / CLI
        add_node('Input / Trigger', 'Request or event enters the system', 'entry')
        add_node('API / Router', 'Routes request to correct handler', 'api')
        add_node('Core Logic', 'Main processing and business rules applied', 'process')
        if has_db:
            add_node('Data Store', 'Database queried or updated', 'database')
        add_node('Result Processing', 'Output formatted and validated', 'decision')
        add_node('Response', 'Final result returned to caller', 'output')
    else:
        # Generic fallback
        add_node('Input', 'Data or request enters pipeline', 'entry')
        add_node('Processing', 'Core transformation applied', 'process')
        add_node('Logic Layer', 'Decision or routing performed', 'decision')
        add_node('Storage', 'Data persisted or retrieved', 'database')
        add_node('Output', 'Result delivered to consumer', 'output')

    print(f'[WORKFLOW] Heuristic generated {len(nodes)} nodes', flush=True)
    return jsonify({'nodes': nodes, 'edges': edges}), 200


@app.errorhandler(413)
def request_entity_too_large(error):
    return jsonify({"error": f"File too large. Maximum allowed size is {MAX_UPLOAD_SIZE // 1000000} MB."}), 413


@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500


if __name__ == '__main__':
    print("Starting CodeGenius Backend...")
    print(f"Upload folder: {UPLOAD_FOLDER}")
    print(f"Vector store: {VECTOR_STORE_PATH}")
    print(f"Max upload size: {MAX_UPLOAD_SIZE // 1000000} MB")
    app.run(debug=False, host='0.0.0.0', port=5000, use_reloader=False, threaded=True)
