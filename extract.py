import json

path = r'C:\Users\compu\.gemini\antigravity\brain\4ff0395a-a038-4019-babf-3bc30175712c\.system_generated\logs\overview.txt'
with open(path, 'r', encoding='utf-8') as f:
    for line in f:
        data = json.loads(line)
        if data.get('step_index') == 163:
            tool_calls = data.get('tool_calls', [])
            for tc in tool_calls:
                args = tc.get('args', {})
                if 'CodeContent' in args:
                    with open(r'c:\Users\compu\Lahacks\app_adk.py', 'w', encoding='utf-8') as out:
                        out.write(args['CodeContent'])
                    exit(0)
