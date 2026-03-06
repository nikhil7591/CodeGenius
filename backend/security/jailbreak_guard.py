import re

class JailbreakGuard:
    def __init__(self):
        self.blocklist = [
            r"ignore previous instructions",
            r"reveal system prompt",
            r"show api keys",
            r"bypass security",
            r"jailbreak",
            r"disregard",
            r"you are a new ai",
            r"developer mode"
        ]

    def is_safe_query(self, query: str) -> bool:
        """
        Check if the query contains any known jailbreak patterns.
        Returns False if the query is unsafe, True otherwise.
        """
        if not query:
            return True
            
        query_lower = query.lower()
        for pattern in self.blocklist:
            if re.search(pattern, query_lower):
                return False
        return True
