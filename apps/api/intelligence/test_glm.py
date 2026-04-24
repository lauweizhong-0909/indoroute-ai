import asyncio
from ilmu_client import IlmuAIClient  # Make sure this matches!

async def run_test():
    print("⏳ Initializing Ilmu AI client...")
    client = IlmuAIClient()
    
    print("🚀 Sending request...")
    prompt = "Hello! Please introduce your core capabilities in one sentence."
    
    try:
        reply = await client.generate_response(prompt)
        print(f"\n✅ Successfully received response:\n{reply}")
    except Exception as e:
        print(f"\n❌ Test failed: {e}")

if __name__ == "__main__":
    asyncio.run(run_test())