import glob, re

original_footer = """        <div>
          <h4 class="font-semibold text-white mb-4 text-sm">Company</h4>
          <ul class="space-y-3 text-sm">
            <li><a href="about.html" class="hover:text-mint-400 transition-colors">About</a></li>
            <li><a href="#" class="hover:text-mint-400 transition-colors">Press</a></li>
            <li><a href="#" class="hover:text-mint-400 transition-colors">Careers</a></li>
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
            <li><a href="terms.html" class="hover:text-mint-400 transition-colors">Terms of service</a></li>
            <li><a href="#" class="hover:text-mint-400 transition-colors">Cookie policy</a></li>
            <li><a href="investors.html" class="hover:text-mint-400 transition-colors">Partnerships</a></li>
          </ul>
        </div>"""

for filepath in glob.glob('public/*.html'):
    with open(filepath, 'r') as f:
        content = f.read()

    # Find the current block starting from Company up to the end of Legal
    pattern = r'<div>\s*<h4[^>]*>Company</h4>.*?</ul>\s*</div>\s*<div>\s*<h4[^>]*>Services</h4>.*?</ul>\s*</div>\s*<div>\s*<h4[^>]*>Legal</h4>.*?</ul>\s*</div>'
    
    content = re.sub(pattern, original_footer, content, flags=re.DOTALL)

    with open(filepath, 'w') as f:
        f.write(content)

print("Footers reverted to exact original state!")
