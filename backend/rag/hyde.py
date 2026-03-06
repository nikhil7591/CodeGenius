import os
import requests
from typing import Optional

class HyDE:
    def __init__(self):
        self.groq_api_key = os.getenv('GROQ_API_KEY')
        self.groq_model = os.getenv('GROQ_MODEL', 'llama-3.1-8b-instant')
        self.ollama_base_url = os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')
        self.ollama_model = os.getenv('OLLAMA_MODEL', 'tinyllama')

    def generate_hypothetical_answer(self, query: str) -> str:
        """
        Generate a hypothetical answer to the given query.
        This hypothetical answer is used to improve embedding matching.
        Returns the hypothetical answer merged with query, or just the original query on failure.
        """
        prompt = f"Please write a short, hypothetical code snippet or explanation that answers the following question. The answer doesn't need to be perfectly accurate, but should contain relevant technical keywords.\nQuestion: {query}\nHypothetical Answer:"
        
        # Try Groq
        if self.groq_api_key:
            try:
                from groq import Groq
                client = Groq(api_key=self.groq_api_key)
                response = client.chat.completions.create(
                    model=self.groq_model,
                    messages=[
                        {"role": "system", "content": "You are a coding assistant. Generate short hypothetical technical answers with relevant keywords to improve search retrieval."},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=256,
                    temperature=0.3
                )
                answer = response.choices[0].message.content
                if answer and answer.strip():
                    return f"{query}\n{answer.strip()}"
            except Exception as e:
                print(f"[HyDE] Groq failed: {e}")

        # Try Ollama (fallback)
        try:
            response = requests.post(
                f'{self.ollama_base_url}/api/generate',
                json={"model": self.ollama_model, "prompt": prompt, "stream": False},
                timeout=10
            )
            if response.status_code == 200:
                answer = response.json().get('response', '').strip()
                if answer:
                    return f"{query}\n{answer}"
        except Exception as e:
            print(f"[HyDE] Ollama failed: {e}")

        # Fallback to returning just the query if models fail
        return query
