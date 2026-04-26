import os

file_path = 'src/pages/Workspace.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_block = """            ) : previewUrl ? (
              <iframe 
                src={previewUrl} 
                className="w-full h-full border-none bg-white"
                title="preview"
              />
            ) : ("""

new_block = """            ) : previewUrl ? (
              <div className="w-full h-full overflow-hidden bg-white relative">
                <iframe 
                  src={previewUrl} 
                  className="border-none absolute top-0 left-0 origin-top-left"
                  style={{
                    width: '200%',
                    height: '200%',
                    transform: 'scale(0.5)',
                  }}
                  title="preview"
                />
              </div>
            ) : ("""

if old_block in content:
    new_content = content.replace(old_block, new_block)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully updated Workspace.tsx")
else:
    # Try with different line endings or slight variations if needed
    print("Could not find the block")
    # Let's try a more robust match if it failed
    import re
    pattern = re.escape(old_block).replace(r'\ ', r'\s*')
    if re.search(pattern, content):
        new_content = re.sub(pattern, new_block, content)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("Successfully updated Workspace.tsx using regex")
    else:
        print("Block not found even with regex")
