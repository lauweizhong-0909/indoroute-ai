from glm_client import ZAIClient

def run_test():
    try:
        client = ZAIClient()
        print("正在连接 Z.AI GLM 进行测试...")
        
        response = client.call(
            system_prompt="You are a helpful system diagnostics assistant.",
            context_data={"project": "IndoRoute AI", "module": "test"},
            user_query="Confirm you are online and receiving my data. Return a JSON with two keys: 'status' (value: 'online') and 'project_name'."
        )
        
        print("\n✅ 测试成功！成功接收并解析 JSON 数据:")
        print(response)
        print(f"提取的状态: {response.get('status')}")
        
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")

if __name__ == "__main__":
    run_test()