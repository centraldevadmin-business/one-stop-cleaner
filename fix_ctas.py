import re

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Fix partner button
    content = re.sub(
        r'<button[^>]*data-cta="partner"[^>]*>(.*?)</button>',
        r'<a href="investors.html" class="btn btn--primary btn--lg">\1</a>',
        content,
        flags=re.DOTALL
    )
    
    # Fix grow-business buttons (preserving class if possible, or just using primary)
    content = re.sub(
        r'<button[^>]*class="([^"]*)"[^>]*data-cta="grow-business"[^>]*>(.*?)</button>',
        r'<a href="cleaners.html" class="\1">\2</a>',
        content,
        flags=re.DOTALL
    )
    
    # Also fix "Australia" to "your city" in services.html
    if 'services.html' in filepath:
        content = content.replace("Launching soon in Australia", "Launching soon in your city")

    with open(filepath, 'w') as f:
        f.write(content)

fix_file('public/index.html')
fix_file('public/services.html')
print("Fixed CTAs!")
