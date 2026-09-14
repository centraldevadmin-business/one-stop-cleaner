import os

filepath = 'public/investors.html'
with open(filepath, 'r') as f:
    content = f.read()

# Fix Meta
content = content.replace('<title>For Cleaners — One Stop Cleaner</title>', '<title>Partner With Us — One Stop Cleaner</title>')
content = content.replace('Grow your cleaning business or freelance cleaning career. Join the waitlist to get found by ready-to-book clients and get paid securely via escrow. Coming soon to Australia.', 'Partner with One Stop Cleaner. We are building the most trusted home services marketplace in Australia. Join us as an investor or strategic partner.')
content = content.replace('<meta property="og:title" content="For Cleaners — One Stop Cleaner" />', '<meta property="og:title" content="Partner With Us — One Stop Cleaner" />')
content = content.replace('<meta property="og:description" content="Grow your cleaning business. Get found by clients, get paid securely. Join the waitlist." />', '<meta property="og:description" content="Partner with us to redefine the home services industry in Australia." />')

# Fix Hero text
content = content.replace('Grow your cleaning <br class="hidden sm:block" /><span class="grad-text">business.</span>', 'Invest in the future of <br class="hidden sm:block" /><span class="grad-text">home services.</span>')
content = content.replace("Whether you're an independent cleaner or a cleaning company, get found by clients who are ready to book — and get paid securely and on time. Join the waitlist and be first in line.", "We're building more than a booking platform — a trusted ecosystem connecting service professionals, product suppliers, and the families who need them. Partner with us.")
content = content.replace('<p class="text-slate-500 text-sm mt-1">For cleaners &amp; cleaning companies.</p>', '<p class="text-slate-500 text-sm mt-1">For strategic partners & investors.</p>')

# Fix Form placeholders
content = content.replace('placeholder="SparkleClean Co."', 'placeholder="Acme Capital"')

# Fix Body sections
content = content.replace('<h2 class="reveal font-display font-extrabold tracking-tight text-4xl sm:text-5xl text-navy-950 mt-4">Cleaners, teams &amp; companies</h2>', '<h2 class="reveal font-display font-extrabold tracking-tight text-4xl sm:text-5xl text-navy-950 mt-4">Investors, angels &amp; partners</h2>')
content = content.replace('<h3 class="font-display font-bold text-xl text-navy-950 mb-3">Independent cleaners</h3>', '<h3 class="font-display font-bold text-xl text-navy-950 mb-3">Angel Investors</h3>')
content = content.replace('<h3 class="font-display font-bold text-xl text-navy-950 mb-3">Cleaning companies</h3>', '<h3 class="font-display font-bold text-xl text-navy-950 mb-3">Venture Capital</h3>')

with open(filepath, 'w') as f:
    f.write(content)

print("investors.html fixed")
