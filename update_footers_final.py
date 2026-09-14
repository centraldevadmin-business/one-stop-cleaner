import glob, re

new_footer = """        <div>
          <h4 class="font-semibold text-white mb-4 text-sm">Company</h4>
          <ul class="space-y-3 text-sm">
            <li><a href="about.html" class="hover:text-mint-400 transition-colors">About</a></li>
            <li><a href="products.html" class="hover:text-mint-400 transition-colors">Products</a></li>
            <li><a href="news.html" class="hover:text-mint-400 transition-colors">News</a></li>
          </ul>
        </div>
        <div>
          <h4 class="font-semibold text-white mb-4 text-sm">Services</h4>
          <ul class="space-y-3 text-sm">
            <li><a href="clients.html" class="hover:text-mint-400 transition-colors">For clients</a></li>
            <li><a href="cleaners.html" class="hover:text-mint-400 transition-colors">For cleaners</a></li>
            <li><a href="products.html" class="hover:text-mint-400 transition-colors">Products</a></li>
            <li><a href="services.html" class="hover:text-mint-400 transition-colors">How it works</a></li>
          </ul>
        </div>
        <div>
          <h4 class="font-semibold text-white mb-4 text-sm">Legal</h4>
          <ul class="space-y-3 text-sm">
            <li><a href="privacy.html" class="hover:text-mint-400 transition-colors">Privacy policy</a></li>
            <li><a href="terms.html" class="hover:text-mint-400 transition-colors">Terms</a></li>
          </ul>
        </div>"""

for filepath in glob.glob('public/*.html'):
    with open(filepath, 'r') as f:
        content = f.read()

    pattern = r'<div>\s*<h4[^>]*>Company</h4>.*?</ul>\s*</div>\s*<div>\s*<h4[^>]*>Services</h4>.*?</ul>\s*</div>\s*<div>\s*<h4[^>]*>Legal</h4>.*?</ul>\s*</div>'
    
    content = re.sub(pattern, new_footer, content, flags=re.DOTALL)

    with open(filepath, 'w') as f:
        f.write(content)

print("Footers updated successfully!")
