import re

with open('public/js/shared.js', 'r') as f:
    content = f.read()

# Remove the broken contact form section and the partner form section (since they are both dead anyway, or at least the broken part is)
pattern = r'/\* ---------- Contact form \(multi-intent\) ---------- \*/.*?/\* ---------- Scroll reveal ---------- \*/'

new_content = re.sub(pattern, '/* ---------- Scroll reveal ---------- */', content, flags=re.DOTALL)

with open('public/js/shared.js', 'w') as f:
    f.write(new_content)

print("Fixed shared.js")
