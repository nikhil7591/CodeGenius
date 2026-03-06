# """
# auto_dataset_generator.py
# ══════════════════════════════════════════════════════════════
# Jab bhi koi ZIP upload ho aur process ho,
# yeh script automatically us repo ki files scan karke
# ek accurate dataset JSON generate karta hai.

# Saved at:
#     backend/evaluation/datasets/<repo_name>.json

# Usage (manual):
#     python auto_dataset_generator.py <repo_name>
#     python auto_dataset_generator.py IntelliChat-main

# Automatic (rag_pipeline.py se call hota hai):
#     from auto_dataset_generator import generate_dataset_for_repo
#     generate_dataset_for_repo(repo_name, filenames)
# ══════════════════════════════════════════════════════════════
# """

# import os
# import sys
# import json


# # ══════════════════════════════════════════════════════════════
# # CATEGORY TEMPLATES
# # Har template = ek query + usse match karne wale keywords
# # Yeh kisi bhi project pe kaam karte hain
# # ══════════════════════════════════════════════════════════════
# CATEGORY_TEMPLATES = [
#     {
#         "category": "Server / Entry Point",
#         "query": "What is the main entry point or server file of this application?",
#         "keywords": ["main", "app", "server", "index", "run", "start", "init", "manage"]
#     },
#     {
#         "category": "API / Routing",
#         "query": "How are API routes or endpoints defined in this project?",
#         "keywords": ["route", "router", "api", "endpoint", "controller", "handler", "views", "url"]
#     },
#     {
#         "category": "API / Routing",
#         "query": "How does the project handle HTTP requests and responses?",
#         "keywords": ["route", "app", "controller", "request", "response", "middleware", "server", "flask", "express"]
#     },
#     {
#         "category": "Authentication",
#         "query": "How does this project handle user authentication and login?",
#         "keywords": ["auth", "login", "token", "jwt", "session", "password", "middleware", "protected", "guard", "verify"]
#     },
#     {
#         "category": "Authentication",
#         "query": "How is token generation or OTP verification implemented?",
#         "keywords": ["token", "otp", "generatetoken", "verify", "auth", "jwt", "otpgenerater", "credential"]
#     },
#     {
#         "category": "Database",
#         "query": "How does this project connect to the database?",
#         "keywords": ["db", "database", "dbconnect", "connect", "connection", "mongo", "mysql", "postgres", "sqlite", "mongoose", "sequelize", "orm"]
#     },
#     {
#         "category": "Database",
#         "query": "How are database models or schemas defined in this project?",
#         "keywords": ["model", "schema", "entity", "collection", "user", "message", "conversation", "status", "mongoose", "table"]
#     },
#     {
#         "category": "Frontend / UI",
#         "query": "How is the user interface or frontend structured?",
#         "keywords": ["app", "component", "page", "layout", "navbar", "sidebar", "index", "html", "jsx", "tsx", "homepage", "dashboard"]
#     },
#     {
#         "category": "Frontend / UI",
#         "query": "How does the frontend communicate with the backend API?",
#         "keywords": ["api", "service", "fetch", "axios", "http", "request", "client", "hook", "aiservice", "chat.service", "url.service"]
#     },
#     {
#         "category": "State Management",
#         "query": "How is state management handled in the frontend?",
#         "keywords": ["store", "state", "redux", "context", "zustand", "hook", "usestore", "reducer", "slice", "chatstore", "layoutstore"]
#     },
#     {
#         "category": "Chat / Messaging",
#         "query": "How is the chat or messaging feature implemented?",
#         "keywords": ["chat", "message", "chatcontroller", "chatroute", "chatwindow", "chatlist", "chatpage", "messagebubble", "conversation", "functions"]
#     },
#     {
#         "category": "Real-time / Socket",
#         "query": "How is real-time communication or WebSocket implemented?",
#         "keywords": ["socket", "websocket", "realtime", "socketservice", "socketmiddleware", "emit", "event", "io"]
#     },
#     {
#         "category": "Video Call",
#         "query": "How does this project handle video calls or live features?",
#         "keywords": ["video", "call", "videocall", "videocallmodal", "videocallmanager", "webrtc", "peer", "stream"]
#     },
#     {
#         "category": "AI / ML",
#         "query": "How is AI or a language model integrated into this project?",
#         "keywords": ["ai", "llm", "groq", "openai", "gemini", "model", "generate", "aiservice", "ml_models", "embedding", "predict", "inference"]
#     },
#     {
#         "category": "AI / ML",
#         "query": "How does the project generate AI responses or use language models?",
#         "keywords": ["llm", "groq", "generate", "prompt", "response", "model", "aiservice", "completion", "ollama", "app"]
#     },
#     {
#         "category": "Embedding / Vector",
#         "query": "How are files or text converted into vector embeddings?",
#         "keywords": ["embedding", "embeddings", "vector", "encode", "sentence", "transformer", "bge", "model"]
#     },
#     {
#         "category": "Vector Store",
#         "query": "How is the vector store or ChromaDB used for storing and querying embeddings?",
#         "keywords": ["vector_store", "chroma", "collection", "vector", "store", "embed", "database", "query"]
#     },
#     {
#         "category": "RAG Pipeline",
#         "query": "How does the RAG pipeline process and retrieve relevant documents?",
#         "keywords": ["rag", "pipeline", "retrieve", "retriever", "parent_child", "chunk", "rag_pipeline"]
#     },
#     {
#         "category": "Chunking",
#         "query": "How are files split into chunks for the retrieval system?",
#         "keywords": ["chunk", "split", "parent", "child", "text", "splitter", "parent_child_retriever"]
#     },
#     {
#         "category": "HyDE",
#         "query": "How is query expansion or hypothetical document embedding used?",
#         "keywords": ["hyde", "hypothetical", "expand", "query", "expansion"]
#     },
#     {
#         "category": "Security",
#         "query": "How does this project implement security checks or jailbreak detection?",
#         "keywords": ["jailbreak", "guard", "security", "verify", "safe", "check", "protect", "sanitize"]
#     },
#     {
#         "category": "File Handling",
#         "query": "How does this project handle file uploads or read different file types?",
#         "keywords": ["upload", "file", "utils", "read", "extract", "zip", "multer", "storage", "pdf", "parse"]
#     },
#     {
#         "category": "NLP / Text Processing",
#         "query": "How does this project process or analyze text and language?",
#         "keywords": ["nlp", "text", "functions", "ml_models", "stop_hinglish", "theme_manager", "analyze", "language", "sentiment", "tokenize"]
#     },
#     {
#         "category": "Configuration",
#         "query": "How are environment variables and configuration managed?",
#         "keywords": ["config", "settings", "env", "dotenv", "constants", "setup", "environment", "cloudinary", "cloudinaryconfig"]
#     },
#     {
#         "category": "Email / Notifications",
#         "query": "How does this project send emails or notifications?",
#         "keywords": ["email", "mail", "emailservice", "smtp", "otp", "send", "nodemailer", "notification", "alert", "otpgenerater"]
#     },
#     {
#         "category": "Media / Storage",
#         "query": "How does this project handle image or media storage using cloud services?",
#         "keywords": ["cloudinary", "cloudinaryconfig", "image", "media", "storage", "upload", "s3", "blob", "photo"]
#     },
#     {
#         "category": "Evaluation",
#         "query": "How is the system evaluated using metrics like precision recall and MRR?",
#         "keywords": ["evaluator", "metrics", "precision", "recall", "mrr", "metric_score", "evaluate", "f1", "score"]
#     },
#     {
#         "category": "Utilities",
#         "query": "What utility or helper functions are used across the project?",
#         "keywords": ["utils", "helper", "util", "functions", "formattime", "responsehandler", "loader", "spinner", "cn", "common"]
#     },
#     {
#         "category": "Error Handling",
#         "query": "How are errors and exceptions handled in this project?",
#         "keywords": ["error", "exception", "handler", "catch", "responsehandler", "middleware", "log", "utils", "try"]
#     },
#     {
#         "category": "UI Components",
#         "query": "What reusable UI components are defined in this project?",
#         "keywords": ["component", "navbar", "sidebar", "layout", "modal", "workflowmodal", "loader", "spinner", "header", "button", "card", "cartoon"]
#     },
#     {
#         "category": "Interview / DSA",
#         "query": "How is the interview preparation or DSA practice feature implemented?",
#         "keywords": ["interview", "dsa", "interviewpage", "dsapage", "question", "practice", "problem", "aiservice", "solution"]
#     },
#     {
#         "category": "Project Structure",
#         "query": "What is the overall structure and architecture of this project?",
#         "keywords": ["app", "main", "index", "server", "readme", "config", "core", "manage", "init"]
#     },
# ]


# # ══════════════════════════════════════════════════════════════
# # HELPER FUNCTIONS
# # ══════════════════════════════════════════════════════════════

# def filename_matches(filename: str, keywords: list) -> bool:
#     """
#     Filename mein koi bhi keyword match hota hai?
#     Case insensitive, special chars ignore karta hai.

#     Example:
#         filename_matches("authController.js", ["auth", "login"]) → True
#         filename_matches("auth_views.py",     ["auth", "login"]) → True
#         filename_matches("cartModel.js",      ["auth", "login"]) → False
#     """
#     clean = filename.lower().replace("-", "").replace("_", "").replace(".", "")
#     for kw in keywords:
#         kw_clean = kw.lower().replace("-", "").replace("_", "").replace(".", "")
#         if kw_clean in clean:
#             return True
#     return False


# def get_filenames_from_chunks(repo_name: str) -> list:
#     """
#     Repo ke chunks JSON se actual filenames nikalo.
#     Yeh file ZIP process hone ke baad automatically banti hai.
#     """
#     chunks_path = os.path.join(
#         os.path.dirname(os.path.dirname(__file__)),
#         "chunks", f"{repo_name}.json"
#     )
#     filenames = set()
#     if os.path.exists(chunks_path):
#         try:
#             with open(chunks_path, encoding="utf-8") as f:
#                 data = json.load(f)
#             for chunk in data.get("chunks", []):
#                 fname = chunk.get("filename", "").strip()
#                 if fname:
#                     filenames.add(fname)
#             print(f"  [AUTOGEN] {len(filenames)} unique files found in chunks JSON", flush=True)
#         except Exception as e:
#             print(f"  [AUTOGEN] Could not read chunks JSON: {e}", flush=True)

#     return list(filenames)


# # ══════════════════════════════════════════════════════════════
# # MAIN GENERATOR FUNCTION
# # ══════════════════════════════════════════════════════════════

# def generate_dataset_for_repo(repo_name: str, filenames: list = None) -> str:
#     """
#     Repo ki files ke basis pe accurate dataset generate karo.

#     Args:
#         repo_name : ZIP ka naam (e.g. "IntelliChat-main")
#         filenames : Optional — agar ZIP process ke time pass karo to
#                     chunks JSON read karne ki zarurat nahi

#     Returns:
#         Path to generated dataset JSON file
#     """
#     print(f"\n  [AUTOGEN] ══ Generating dataset for: {repo_name} ══", flush=True)

#     # Filenames get karo
#     if not filenames:
#         filenames = get_filenames_from_chunks(repo_name)

#     if not filenames:
#         print(f"  [AUTOGEN] ERROR: No files found for '{repo_name}'", flush=True)
#         print(f"  [AUTOGEN] Upload the ZIP first via /api/upload", flush=True)
#         return None

#     print(f"  [AUTOGEN] Files in repo: {sorted(filenames)}", flush=True)

#     # Har template ke liye check karo — matching files hain?
#     generated_queries = []
#     for template in CATEGORY_TEMPLATES:
#         # Woh files nikalo jo is template ke keywords se match karti hain
#         matched_files = [f for f in filenames if filename_matches(f, template["keywords"])]

#         if not matched_files:
#             # Yeh feature is project mein hai hi nahi — skip karo
#             continue

#         # Sirf woh keywords rakho jo actually match hue
#         active_keywords = [
#             kw for kw in template["keywords"]
#             if any(filename_matches(f, [kw]) for f in filenames)
#         ]

#         generated_queries.append({
#             "id":                     len(generated_queries) + 1,
#             "category":               template["category"],
#             "query":                  template["query"],
#             "relevant_docs_keywords": active_keywords if active_keywords else template["keywords"],
#             "matched_files":          matched_files
#         })

#     print(f"  [AUTOGEN] Generated {len(generated_queries)} relevant queries", flush=True)

#     # Datasets folder mein save karo
#     datasets_dir = os.path.join(os.path.dirname(__file__), "datasets")
#     os.makedirs(datasets_dir, exist_ok=True)

#     save_path = os.path.join(datasets_dir, f"{repo_name}.json")
#     with open(save_path, "w", encoding="utf-8") as f:
#         json.dump(generated_queries, f, indent=2, ensure_ascii=False)

#     print(f"  [AUTOGEN] ✓ Dataset saved → evaluation/datasets/{repo_name}.json", flush=True)
#     print(f"  [AUTOGEN] ✓ Total queries: {len(generated_queries)}", flush=True)

#     return save_path


# # ══════════════════════════════════════════════════════════════
# # MANUAL RUN
# # ══════════════════════════════════════════════════════════════

# if __name__ == "__main__":
#     if len(sys.argv) < 2:
#         print("Usage: python auto_dataset_generator.py <repo_name>")
#         print("Example: python auto_dataset_generator.py IntelliChat-main")
#         sys.exit(1)

#     repo = sys.argv[1]
#     path = generate_dataset_for_repo(repo)
#     if path:
#         print(f"\n  ✓ Dataset created at: {path}")
#     else:
#         print(f"\n  ✗ Failed. Make sure ZIP is uploaded first.")

"""
auto_dataset_generator.py  —  FIXED VERSION
════════════════════════════════════════════════════════════
Fixes:
1. Keywords ab sirf EXACT meaningful filenames se match karte hain
2. False positive matches hataye (vector_store ≠ state management)
3. Har template mein EXCLUDE keywords hain jo wrong matches rokein
4. Matched files bhi keywords mein add hote hain → precision badhti hai
════════════════════════════════════════════════════════════
"""

import os
import sys
import json


# ══════════════════════════════════════════════════════════════
# CATEGORY TEMPLATES — FIXED
# Har template mein:
#   keywords : yeh match honge
#   exclude  : agar sirf yeh match ho aur koi aur nahi → skip karo
# ══════════════════════════════════════════════════════════════
CATEGORY_TEMPLATES = [
    {
        "category": "Server / Entry Point",
        "query": "What is the main entry point or server file of this application?",
        "keywords": ["app", "main", "server", "index"],
        "exclude": []
    },
    {
        "category": "API / Routing",
        "query": "How are API routes or endpoints defined in this project?",
        "keywords": ["route", "router", "controller", "handler", "views", "endpoint"],
        "exclude": []
    },
    {
        "category": "API / Routing",
        "query": "How does the project handle HTTP requests and responses?",
        "keywords": ["app", "route", "controller", "middleware", "server"],
        "exclude": []
    },
    {
        "category": "Authentication",
        "query": "How does this project handle user authentication and login?",
        "keywords": ["auth", "login", "authmiddleware", "authcontroller", "authroute", "protected", "guard", "verify"],
        "exclude": ["jailbreak"]   # jailbreak_guard.py auth nahi hai
    },
    {
        "category": "Authentication",
        "query": "How is token generation or OTP verification implemented?",
        "keywords": ["generatetoken", "token", "otp", "otpgenerater", "verify"],
        "exclude": []
    },
    {
        "category": "Database",
        "query": "How does this project connect to the database?",
        "keywords": ["dbconnect", "database", "db", "connect", "mongo", "mysql", "postgres", "sqlite", "mongoose", "sequelize"],
        "exclude": []
    },
    {
        "category": "Database",
        "query": "How are database models or schemas defined in this project?",
        # FIX: "message" sirf Message.js k liye — ChatMessage.jsx nahi
        "keywords": ["model", "schema", "entity", "collection", "mongoose", "sequelize"],
        "exclude": ["chat", "jsx", "component"]
    },
    {
        "category": "Frontend / UI",
        "query": "How is the user interface or frontend structured?",
        "keywords": ["app", "page", "layout", "navbar", "sidebar", "index", "html", "jsx", "tsx", "homepage", "dashboard"],
        "exclude": []
    },
    {
        "category": "Frontend / UI",
        "query": "How does the frontend communicate with the backend API?",
        "keywords": ["service", "aiservice", "chat.service", "url.service", "user.service", "api.ts"],
        "exclude": []
    },
    {
        "category": "State Management",
        "query": "How is state management handled in the frontend?",
        # FIX: vector_store.py ko exclude karo — woh state management nahi hai
        "keywords": ["usestore", "chatstore", "layoutstore", "useloginstore", "usestatusstore", "videocallstore", "themestore", "redux", "zustand"],
        "exclude": ["vector", "chroma"]
    },
    {
        "category": "Chat / Messaging",
        "query": "How is the chat or messaging feature implemented?",
        "keywords": ["chat", "chatcontroller", "chatroute", "chatwindow", "chatlist", "chatpage", "chatmessage", "chatinput", "messagebubble", "conversation"],
        "exclude": []
    },
    {
        "category": "Real-time / Socket",
        "query": "How is real-time communication or WebSocket implemented?",
        "keywords": ["socket", "websocket", "socketservice", "socketmiddleware", "video-call-events", "emit", "io"],
        "exclude": []
    },
    {
        "category": "Video Call",
        "query": "How does this project handle video calls or live features?",
        "keywords": ["videocall", "videocallmodal", "videocallmanager", "video-call", "webrtc"],
        "exclude": []
    },
    {
        "category": "AI / ML",
        "query": "How is AI or a language model integrated into this project?",
        "keywords": ["aiservice", "ml_models", "groq", "openai", "gemini", "llm", "hyde"],
        "exclude": []
    },
    {
        "category": "AI / ML",
        "query": "How does the project generate AI responses or use language models?",
        "keywords": ["app", "aiservice", "groq", "llm", "generate", "prompt"],
        "exclude": []
    },
    {
        "category": "Embedding / Vector",
        "query": "How are files or text converted into vector embeddings?",
        "keywords": ["embeddings", "embedding"],
        "exclude": []
    },
    {
        "category": "Vector Store",
        "query": "How is the vector store or ChromaDB used for storing and querying embeddings?",
        "keywords": ["vector_store"],
        "exclude": []
    },
    {
        "category": "RAG Pipeline",
        "query": "How does the RAG pipeline process and retrieve relevant documents?",
        "keywords": ["rag_pipeline"],
        "exclude": []
    },
    {
        "category": "Chunking",
        "query": "How are files split into chunks for the retrieval system?",
        "keywords": ["parent_child_retriever"],
        "exclude": []
    },
    {
        "category": "HyDE",
        "query": "How is query expansion or hypothetical document embedding used?",
        "keywords": ["hyde"],
        "exclude": []
    },
    {
        "category": "Security",
        # FIX: Query change karo — jailbreak word nahi hoga taaki guard block na kare
        "query": "How does this project protect against malicious or unsafe user inputs?",
        "keywords": ["jailbreak_guard", "verify", "guard"],
        "exclude": []
    },
    {
        "category": "File Handling",
        "query": "How does this project handle file uploads or read different file types?",
        "keywords": ["utils", "fileupload"],
        "exclude": []
    },
    {
        "category": "Email / Notifications",
        "query": "How does this project send emails or notifications?",
        "keywords": ["emailservice", "email", "mail", "smtp", "nodemailer", "otpgenerater"],
        "exclude": []
    },
    {
        "category": "Media / Storage",
        "query": "How does this project handle image or media storage using cloud services?",
        # FIX: FileUpload.jsx sirf UI component hai — cloud storage nahi
        # Yeh category tabhi generate ho jab actual cloud storage files hon
        "keywords": ["cloudinary", "cloudinaryconfig", "s3", "blob", "media"],
        "exclude": []
    },
    {
        "category": "Evaluation",
        "query": "How is the system evaluated using metrics like precision recall and MRR?",
        "keywords": ["evaluator", "metrics"],
        "exclude": []
    },
    {
        "category": "Utilities",
        "query": "What utility or helper functions are used across the project?",
        "keywords": ["utils"],
        "exclude": []
    },
    {
        "category": "Error Handling",
        "query": "How are errors and exceptions handled in this project?",
        "keywords": ["utils", "responsehandler", "errorhandler"],
        "exclude": []
    },
    {
        "category": "UI Components",
        "query": "What reusable UI components are defined in this project?",
        "keywords": ["navbar", "workflowmodal", "sidebar", "layout", "loader", "spinner", "cartoon"],
        "exclude": []
    },
    {
        "category": "Interview / DSA",
        "query": "How is the interview preparation or DSA practice feature implemented?",
        "keywords": ["interviewpage", "dsapage", "interview", "dsa"],
        "exclude": []
    },
    {
        "category": "NLP / Text Processing",
        "query": "How does this project process or analyze text and language?",
        "keywords": ["functions", "ml_models", "stop_hinglish", "theme_manager", "nlp"],
        "exclude": []
    },
    {
        "category": "Configuration",
        "query": "How are environment variables and configuration managed?",
        "keywords": ["cloudinaryconfig", "config", "settings", "setup"],
        "exclude": []
    },
    {
        "category": "Project Structure",
        "query": "What is the overall structure and architecture of this project?",
        "keywords": ["app", "main", "server", "index"],
        "exclude": []
    },
]


# ══════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ══════════════════════════════════════════════════════════════

def clean(s: str) -> str:
    """Lowercase + special chars remove."""
    return s.lower().replace("-", "").replace("_", "").replace(".", "")


def filename_matches(filename: str, keywords: list) -> bool:
    """Filename mein keyword match check karo."""
    fc = clean(filename)
    for kw in keywords:
        if clean(kw) in fc:
            return True
    return False


def filename_excluded(filename: str, exclude: list) -> bool:
    """Filename mein exclude keyword hai?"""
    if not exclude:
        return False
    fc = clean(filename)
    for ex in exclude:
        if clean(ex) in fc:
            return True
    return False


def get_filenames_from_chunks(repo_name: str) -> list:
    """Chunks JSON se actual filenames nikalo."""
    chunks_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        "chunks", f"{repo_name}.json"
    )
    filenames = set()
    if os.path.exists(chunks_path):
        try:
            with open(chunks_path, encoding="utf-8") as f:
                data = json.load(f)
            for chunk in data.get("chunks", []):
                fname = chunk.get("filename", "").strip()
                if fname:
                    filenames.add(fname)
            print(f"  [AUTOGEN] {len(filenames)} unique files found", flush=True)
        except Exception as e:
            print(f"  [AUTOGEN] Could not read chunks JSON: {e}", flush=True)
    return list(filenames)


# ══════════════════════════════════════════════════════════════
# MAIN GENERATOR
# ══════════════════════════════════════════════════════════════

def generate_dataset_for_repo(repo_name: str, filenames: list = None) -> str:
    """
    Repo ki actual files ke basis pe accurate dataset generate karo.
    """
    print(f"\n  [AUTOGEN] Generating dataset for: {repo_name}", flush=True)

    if not filenames:
        filenames = get_filenames_from_chunks(repo_name)

    if not filenames:
        print(f"  [AUTOGEN] ERROR: No files found. Upload ZIP first.", flush=True)
        return None

    generated_queries = []

    for template in CATEGORY_TEMPLATES:
        keywords = template["keywords"]
        exclude  = template.get("exclude", [])

        # Woh files nikalo jo:
        # 1. Keywords se match karti hain
        # 2. Exclude list mein nahi hain
        matched_files = [
            f for f in filenames
            if filename_matches(f, keywords) and not filename_excluded(f, exclude)
        ]

        if not matched_files:
            # Yeh feature is project mein nahi → skip
            continue

        # FIX 1: Active keywords = sirf woh jo actually match hue
        active_keywords = []
        for kw in keywords:
            if any(filename_matches(f, [kw]) and not filename_excluded(f, exclude)
                   for f in filenames):
                active_keywords.append(kw)

        # FIX: Matched filenames bhi keywords mein add karo (without extension)
        # Taaki retrieval ke time exact filename match bhi ho sake
        for mf in matched_files:
            name_no_ext = os.path.splitext(mf)[0].lower()  # e.g. "embeddings"
            if name_no_ext not in active_keywords:
                active_keywords.append(name_no_ext)

        generated_queries.append({
            "id":                     len(generated_queries) + 1,
            "category":               template["category"],
            "query":                  template["query"],
            "relevant_docs_keywords": active_keywords,
            "matched_files":          matched_files
        })

    print(f"  [AUTOGEN] Generated {len(generated_queries)} queries", flush=True)

    # Save to datasets folder
    datasets_dir = os.path.join(os.path.dirname(__file__), "datasets")
    os.makedirs(datasets_dir, exist_ok=True)
    save_path = os.path.join(datasets_dir, f"{repo_name}.json")

    with open(save_path, "w", encoding="utf-8") as f:
        json.dump(generated_queries, f, indent=2, ensure_ascii=False)

    print(f"  [AUTOGEN] ✓ Saved → evaluation/datasets/{repo_name}.json", flush=True)
    return save_path


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python auto_dataset_generator.py <repo_name>")
        sys.exit(1)
    repo = sys.argv[1]
    path = generate_dataset_for_repo(repo)
    if path:
        print(f"\n  ✓ Dataset: {path}")
    else:
        print(f"\n  ✗ Failed.")