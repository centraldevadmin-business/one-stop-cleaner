import glob, re, os

new_footer_html = """        <div>
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
            <li><a href="index.html" class="hover:text-mint-400 transition-colors">For clients</a></li>
            <li><a href="cleaners.html" class="hover:text-mint-400 transition-colors">For cleaners</a></li>
            <li><a href="products.html" class="hover:text-mint-400 transition-colors">Products</a></li>
            <li><a href="index.html" class="hover:text-mint-400 transition-colors">How it works</a></li>
          </ul>
        </div>
        <div>
          <h4 class="font-semibold text-white mb-4 text-sm">Legal</h4>
          <ul class="space-y-3 text-sm">
            <li><a href="privacy.html" class="hover:text-mint-400 transition-colors">Privacy policy</a></li>
            <li><a href="terms.html" class="hover:text-mint-400 transition-colors">Terms and conditions</a></li>
          </ul>
        </div>"""

for filepath in glob.glob('public/*.html'):
    with open(filepath, 'r') as f:
        content = f.read()

    # Find the block starting from Company up to the end of Legal
    pattern = r'<div>\s*<h4[^>]*>Company</h4>.*?</ul>\s*</div>\s*<div>\s*<h4[^>]*>Services</h4>.*?</ul>\s*</div>\s*<div>\s*<h4[^>]*>Legal</h4>.*?</ul>\s*</div>'
    
    content = re.sub(pattern, new_footer_html, content, flags=re.DOTALL)

    with open(filepath, 'w') as f:
        f.write(content)

# Delete the unnecessary pages
if os.path.exists('public/services.html'):
    os.remove('public/services.html')
if os.path.exists('public/clients.html'):
    os.remove('public/clients.html')

print("Footers updated and unnecessary pages deleted!")
