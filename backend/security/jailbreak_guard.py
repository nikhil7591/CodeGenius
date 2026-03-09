# import re

# class JailbreakGuard:
#     def __init__(self):
#         self.blocklist = [
#             r"ignore previous instructions",
#             r"reveal system prompt",
#             r"show api keys",
#             r"bypass security",
#             r"jailbreak",
#             r"disregard",
#             r"you are a new ai",
#             r"developer mode"
#         ]

#     def is_safe_query(self, query: str) -> bool:
#         """
#         Check if the query contains any known jailbreak patterns.
#         Returns False if the query is unsafe, True otherwise.
#         """
#         if not query:
#             return True
            
#         query_lower = query.lower()
#         for pattern in self.blocklist:
#             if re.search(pattern, query_lower):
#                 return False
#         return True

import re


class JailbreakGuard:
    def __init__(self):

        # ── LAYER 1: Jailbreak / Harmful patterns ─────────────────────────────
        # Ye patterns directly malicious intent dikhate hain
        self.jailbreak_patterns = [
            r"ignore previous instructions",
            r"ignore all instructions",
            r"ignore your instructions",
            r"reveal system prompt",
            r"show (me )?(your |the )?(system prompt|prompt|instructions)",
            r"show api keys?",
            r"show (me )?(all )?(secrets?|credentials?|passwords?|env)",
            r"bypass security",
            r"bypass (your )?(restrictions?|rules?|filters?|guidelines?)",
            r"jailbreak",
            r"disregard (your )?(previous |all )?(instructions?|rules?|guidelines?)",
            r"you are a new ai",
            r"you are now",
            r"act as (a )?(different|unrestricted|free)",
            r"developer mode",
            r"dan mode",
            r"pretend (you are|to be) (a )?(different|unrestricted)",
            r"forget (your )?(previous |all )?(instructions?|training|rules?)",
            r"override (your )?(instructions?|rules?|guidelines?)",
            r"enable unrestricted mode",
        ]

        # ── LAYER 2: Off-topic / Non-code patterns ─────────────────────────────
        # Ye queries code/programming se bilkul related nahi hain
        # CodeGenius sirf uploaded ZIP codebase ke baare mein answer karta hai
        self.offtopic_patterns = [
            # General knowledge / world questions
            r"^(who is|who was|who are) (?!the author|the developer|the creator|defined|responsible)",
            r"^(what is the capital|capital of)",
            r"^(what is the population|population of)",
            r"^(tell me about) (history|geography|politics|religion|sports|music|movies?|food)",
            r"(weather|temperature|forecast) (in|at|of|today|tomorrow)",
            r"^(how to cook|recipe for|how do i make)",
            r"^(best (movie|song|book|restaurant|hotel|place|travel))",
            r"(cricket|football|soccer|hockey|basketball|tennis|sports?) (score|match|team|player|result)",
            r"^(who won|who will win) (the )?(match|game|election|award|prize)",
            r"(stock (price|market)|share price|crypto|bitcoin|ethereum) (of|for|today)",

            # Personal / emotional queries
            r"^(i feel|i am feeling|i am sad|i am happy|i am depressed|i am lonely)",
            r"^(can you be my|be my (friend|girlfriend|boyfriend|companion))",
            r"^(do you love|do you like|do you have feelings)",
            r"^(tell me a joke|make me laugh|say something funny)",
            r"^(write me a poem|write a poem|write a song)",

            # Medical / Legal / Financial
            r"^(what medicine|which medicine|what drug|which drug) (should i|can i|do i)",
            r"(symptoms? of|treatment for|cure for) (?!error|bug|issue|exception|problem|warning)",
            r"^(legal advice|am i liable|can i sue|file a case)",
            r"^(should i invest|investment advice|buy (stocks?|crypto|bitcoin))",

            # Casual / greetings (non-technical)
            r"^(what('s| is) (your name|your age|your gender))",
            r"^(who (made|created|built) you)",
            r"^(are you (human|real|alive|sentient|conscious))",
            r"^(what can you do|what are your capabilities)",
            r"^(hello|hi|hey|howdy|sup|what'?s up)[^a-z]*$",
            r"^(good (morning|afternoon|evening|night))[^a-z]*$",
            r"^(thank(s| you)|thx|ty)[^a-z]*$",
            r"^(bye|goodbye|see you|cya)[^a-z]*$",
        ]

        # ── Code-related keywords whitelist ───────────────────────────────────
        # Agar query mein ye words hain toh ALLOW karo — ye clearly code queries hain
        self.code_keywords = [
            "function", "class", "method", "variable", "import", "module",
            "file", "code", "script", "component", "api", "endpoint", "route",
            "database", "query", "model", "schema", "config", "setup", "install",
            "error", "bug", "exception", "debug", "fix", "issue", "problem",
            "how does", "how do", "where is", "where does", "which file",
            "what does", "explain", "what is the", "how is",
            "frontend", "backend", "server", "client", "request", "response",
            "fetch", "axios", "flask", "react", "python", "javascript", "typescript",
            "html", "css", "json", "rest", "http", "post", "get",
            "vector", "embedding", "rag", "llm", "groq", "ollama", "chromadb",
            "chunk", "retriev", "pipeline", "deploy", "run", "start",
            "architecture", "structure", "flow", "logic", "implement",
            "authentication", "auth", "token", "jwt",
            "test", "evaluat", "metric", "performance",
            "loop", "array", "list", "dict", "object", "string", "integer",
            "return", "parameter", "argument", "output", "input",
            "render", "component", "props", "state", "hook",
        ]

    # ──────────────────────────────────────────────────────────────────────────
    # PUBLIC METHOD
    # ──────────────────────────────────────────────────────────────────────────

    def is_safe_query(self, query: str) -> bool:
        """
        Two-layer check:
        Layer 1 — Jailbreak / malicious patterns → block karo
        Layer 2 — Off-topic / non-code queries   → block karo

        Returns:
            True  → Query safe hai, process karo
            False → Query block karo
        """
        if not query or not query.strip():
            return False

        query_lower = query.lower().strip()

        # ── Layer 1: Jailbreak check ──────────────────────────────────────────
        for pattern in self.jailbreak_patterns:
            if re.search(pattern, query_lower):
                print(f"[SECURITY] Jailbreak pattern matched: '{pattern}'", flush=True)
                return False

        # ── Whitelist check — agar code keyword hai toh directly allow ─────────
        # Off-topic check se pehle — taaki valid code queries galti se block na hon
        for kw in self.code_keywords:
            if kw in query_lower:
                return True

        # ── Layer 2: Off-topic check ──────────────────────────────────────────
        for pattern in self.offtopic_patterns:
            if re.search(pattern, query_lower):
                print(f"[SECURITY] Off-topic pattern matched: '{pattern}'", flush=True)
                return False

        # ── Default: allow karo ───────────────────────────────────────────────
        # Agar koi pattern match nahi hua toh safe maano
        return True

    def get_block_reason(self, query: str) -> str:
        """
        Debugging ke liye — kyun block hua ye batata hai.
        """
        if not query or not query.strip():
            return "Empty query"

        query_lower = query.lower().strip()

        for pattern in self.jailbreak_patterns:
            if re.search(pattern, query_lower):
                return f"Jailbreak attempt detected"

        for kw in self.code_keywords:
            if kw in query_lower:
                return "Allowed — code keyword found"

        for pattern in self.offtopic_patterns:
            if re.search(pattern, query_lower):
                return f"Off-topic query — not related to code analysis"

        return "Allowed — no block pattern matched"
