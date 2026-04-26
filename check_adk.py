from google.adk.agents.llm_agent import LlmAgent
from google.adk.agents.sequential_agent import SequentialAgent

print("LlmAgent fields:", list(LlmAgent.model_fields.keys()))
print("SequentialAgent fields:", list(SequentialAgent.model_fields.keys()))

print("SequentialAgent call:", hasattr(SequentialAgent, '__call__'))
