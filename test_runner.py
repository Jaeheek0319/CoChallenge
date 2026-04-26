from google.adk.agents.llm_agent import LlmAgent
from google.adk.agents.sequential_agent import SequentialAgent
from google.adk import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
import uuid
import os
from dotenv import load_dotenv
import asyncio

load_dotenv()

MODEL_ID = "gemma-4-26b-a4b-it"

agent1 = LlmAgent(name="A1", model=MODEL_ID, instruction="Say 'ONE'")
agent2 = LlmAgent(name="A2", model=MODEL_ID, instruction="Say 'TWO'")
pipeline = SequentialAgent(name="P", sub_agents=[agent1, agent2])

runner = Runner(app_name="Test", agent=pipeline, session_service=InMemorySessionService(), auto_create_session=True)

async def main():
    events = runner.run_async(
        user_id="u1", session_id=str(uuid.uuid4()),
        new_message=types.Content(role="user", parts=[types.Part.from_text(text="Go")])
    )
    async for event in events:
        print("\n--- NEW EVENT ---")
        print("Type:", type(event))
        print("Dir:", [d for d in dir(event) if not d.startswith('_')])
        
        # Check common fields
        for attr in ['text', 'content', 'message', 'data', 'delta', 'status']:
            if hasattr(event, attr):
                val = getattr(event, attr)
                print(f"Attr '{attr}' (type {type(val)}): {val}")
                if attr == 'message' and val:
                    print(f"  message.content type: {type(val.content)}")
                    if hasattr(val.content, 'parts'):
                        print(f"  message.content.parts: {val.content.parts}")
        
asyncio.run(main())
