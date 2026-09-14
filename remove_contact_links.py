import os, glob, re

for filepath in glob.glob('public/*.html'):
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Remove standard <li> wrappers if they exist
    content = re.sub(r'\s*<li>\s*<a[^>]*href="contact\.html[^"]*"[^>]*>.*?</a>\s*</li>', '', content, flags=re.IGNORECASE)
    
    # Remove standard <a> links (e.g. in mobile menus or footers without li)
    content = re.sub(r'\s*<a[^>]*href="contact\.html[^"]*"[^>]*>.*?</a>', '', content, flags=re.IGNORECASE)

    with open(filepath, 'w') as f:
        f.write(content)

print("Contact links removed!")
