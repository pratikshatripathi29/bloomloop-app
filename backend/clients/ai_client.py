import json
import logging
import os
import re
from typing import Any, Dict, List, Optional
from groq import Groq
from core.config import settings

logger = logging.getLogger(__name__)

# Primary and fallback models available on Groq
GROQ_MODELS = [
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "qwen/qwen3.8-27b",
]


class AIClient:
    """Groq AI Client for BloomLoop CRM intelligence features.
    
    Security & Privacy Guarantees:
    - Never receives or processes customer PII (emails, phone numbers, addresses).
    - Only generates structured JSON specifications; never generates or executes raw SQL.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.GROQ_API_KEY
        if not self.api_key:
            logger.warning("GROQ_API_KEY is not configured in environment.")
            self.client = None
        else:
            self.client = Groq(api_key=self.api_key)

    def _call_groq_json(self, messages: List[Dict[str, str]], temperature: float = 0.3) -> Dict[str, Any]:
        """Invoke Groq with fallback models and parse JSON response."""
        if not self.client:
            raise RuntimeError(
                "Groq AI is unavailable. Please verify that GROQ_API_KEY is configured in backend/.env"
            )

        last_error = None
        for model in GROQ_MODELS:
            try:
                response = self.client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=temperature,
                    response_format={"type": "json_object"},
                )
                raw_content = response.choices[0].message.content.strip()
                # Remove markdown fences if present
                clean_content = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw_content, flags=re.DOTALL)
                return json.loads(clean_content)
            except Exception as exc:
                logger.warning(f"Failed Groq invocation with model {model}: {exc}")
                last_error = exc

        raise RuntimeError(f"AI service error across available models: {last_error}")

    def generate_campaign_drafts(
        self,
        goal: str,
        tone: str,
        channel: str = "email",
    ) -> List[str]:
        """Generate 3 creative, high-converting campaign message drafts based on goal and tone."""
        system_prompt = (
            "You are an expert CRM marketing copywriter for BloomLoop CRM. "
            "Your task is to generate exactly 3 distinct, high-converting message drafts "
            "based on the user's campaign goal and desired tone. "
            "Do NOT include customer personal names, emails, or phone numbers. "
            "Use standard personalization tags like {{first_name}} where appropriate. "
            "You must return a valid JSON object with the key 'drafts' containing an array of 3 strings."
        )

        user_content = (
            f"Campaign Goal: {goal}\n"
            f"Tone: {tone}\n"
            f"Channel: {channel}\n\n"
            "Respond ONLY with a JSON object: {\"drafts\": [\"Draft 1...\", \"Draft 2...\", \"Draft 3...\"]}"
        )

        data = self._call_groq_json(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            temperature=0.7,
        )

        drafts = data.get("drafts", [])
        if not isinstance(drafts, list) or len(drafts) < 3:
            # Fallback or pad to ensure 3 drafts
            while len(drafts) < 3:
                drafts.append(f"Special Offer for you: {goal}")
        return drafts[:3]

    def suggest_segment_filters(self, description: str) -> Dict[str, Any]:
        """Convert a plain English description into a valid segment filters JSON object.
        
        Allowed filter fields strictly enforced:
        - city: string (searches city)
        - min_total_spent: number
        - max_total_spent: number
        - min_order_count: integer
        - days_since_last_order: integer
        - churn_score_min: number (0.0 to 100.0)
        """
        system_prompt = (
            "You are a CRM database filtering assistant for BloomLoop CRM. "
            "Given a plain-English audience description, extract filtering criteria strictly "
            "matching ONLY these allowed fields:\n"
            "- city (string: e.g. 'New York', 'Austin')\n"
            "- min_total_spent (number: minimum total spent in dollars)\n"
            "- max_total_spent (number: maximum total spent in dollars)\n"
            "- min_order_count (integer: minimum number of orders)\n"
            "- days_since_last_order (integer: last order was N+ days ago or never)\n"
            "- churn_score_min (number: minimum churn risk score from 0.0 to 100.0)\n\n"
            "Rules:\n"
            "1. ONLY output allowed keys. Omit any key not mentioned or implied.\n"
            "2. Never output customer names, emails, or phone numbers.\n"
            "3. Return a JSON object with two keys:\n"
            "   - 'filters': the dictionary of allowed filter fields.\n"
            "   - 'explanation': a short 1-sentence plain text summary of the filter criteria."
        )

        user_content = (
            f"Target Audience Description: \"{description}\"\n\n"
            "Generate the corresponding JSON object with 'filters' and 'explanation'."
        )

        data = self._call_groq_json(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            temperature=0.1,
        )

        filters = data.get("filters", {})
        explanation = data.get("explanation", f"Segment matching: {description}")

        # Clean filter values
        allowed_keys = {
            "city",
            "min_total_spent",
            "max_total_spent",
            "min_order_count",
            "days_since_last_order",
            "churn_score_min",
        }
        cleaned_filters = {k: v for k, v in filters.items() if k in allowed_keys and v is not None and v != ""}

        return {
            "filters": cleaned_filters,
            "explanation": explanation,
        }

    def generate_analytics_spec(self, question: str) -> Dict[str, Any]:
        """Convert a natural language business question into a safe, structured query specification.
        
        The AI generates ONLY structured specification parameters.
        The AI is STRICTLY FORBIDDEN from generating or returning SQL code.
        """
        system_prompt = (
            "You are a business intelligence query translator for BloomLoop CRM. "
            "You translate natural language questions about customers, revenue, and orders into "
            "a structured JSON query spec. "
            "CRITICAL SECURITY RULE: You must NEVER generate SQL syntax. "
            "You only pick from the allowed enum fields below:\n\n"
            "Allowed 'metric' (must pick one):\n"
            "- 'total_customers'\n"
            "- 'total_revenue'\n"
            "- 'average_order_value'\n"
            "- 'average_total_spent'\n"
            "- 'total_orders'\n"
            "- 'average_churn_score'\n\n"
            "Allowed 'group_by' (pick one or null):\n"
            "- 'city'\n"
            "- 'state'\n"
            "- 'country'\n"
            "- null\n\n"
            "Allowed 'filters' (optional dictionary with keys from: city, min_total_spent, max_total_spent, min_order_count, days_since_last_order, churn_score_min)\n\n"
            "Return a JSON object with:\n"
            "- 'metric': string from allowed metrics\n"
            "- 'group_by': string from allowed group_by or null\n"
            "- 'filters': dictionary of filters\n"
            "- 'title': concise friendly chart/metric title\n"
            "- 'summary': brief explanation of what is being measured"
        )

        user_content = (
            f"Question: \"{question}\"\n\n"
            "Return ONLY the structured JSON query spec."
        )

        data = self._call_groq_json(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            temperature=0.1,
        )

        return data


# Global singleton instance
ai_client = AIClient()
