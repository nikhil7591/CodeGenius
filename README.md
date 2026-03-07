# CodeGenius

CodeGenius is a Full-Stack AI-Powered RAG (Retrieval-Augmented Generation) Code Analysis tool. It allows you to upload any code repository as a ZIP archive, parses the codebase using intelligent chunking, and provides a beautiful chat interface to ask questions about the code. 

## 🚀 Features
- **Upload Repositories**: Process entire repositories efficiently via ZIP upload.
- **AI Chat with Context**: Uses RAG to retrieve relevant code chunks before passing them to the AI for generation.
- **Architecture Workflow Generation**: Automatically draws a Mermaid flowchart for your project architecture by heuristically analyzing file types and code samples.
- **Multi-LLM Support**: Built-in support for Groq (Llama-3-8b-instant) for lightning-fast inference, with fallback to local Ollama models.
- **RAG Evaluation Script**: Built-in Python script (`evaluator.py`) to systematically test and evaluate RAG precision, recall, and MRR against ground-truth datasets.

## 🛠️ Tech Stack
- **Frontend**: React, Vite, TailwindCSS
- **Backend**: Python, Flask, Werkzeug
- **Vector Database**: ChromaDB (locally persisted)
- **Embeddings**: Sentence-Transformers inside a custom RAG Pipeline (with HyDE support for hypothetical document expansion).

## 📋 Setup Instructions

### 1. Backend Setup
The backend runs on **Flask** and default port `5000`.

```bash
cd backend

# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure Environment Variables
# Create a .env file based on the keys needed (e.g., GROQ_API_KEY)
echo "GROQ_API_KEY=your_api_key_here" > .env

# Run the Flask Server
python app.py
```

### 2. Frontend Setup
The frontend runs on **Vite + React** and default port `5173`.

```bash
cd frontend

# Install dependencies (use npm or yarn/pnpm)
npm install

# Run the development server
npm run dev
```

## 🧩 Running the Application
1. Start both the backend and frontend servers as shown above.
2. Open your browser to `http://localhost:5173`
3. Click on the **Upload ZIP** option to ingest a codebase (e.g., `CodeGenius.zip`). Wait for the chunking and embedding to finish.
4. Start chatting! Ask questions like:
   - *"Which file serves as the main Python entry point for this app?"*
   - *"Where is the ChromaDB connection initialized?"*
5. Click **View Workflow** to see an AI-generated architectural diagram of the uploaded codebase.

## 📊 Running Evaluations
If you want to test the accuracy of the Retrieval-Augmented Generation pipeline:

```bash
cd backend
python evaluation\evaluator.py CodeGenius
```
*(This parses `./evaluation/datasets/CodeGenius.json` and outputs a beautiful ASCII table with precision and MRR scores!)*

## 📄 License
MIT License
