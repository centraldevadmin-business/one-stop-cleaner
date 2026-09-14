import glob, re, os

html_files = glob.glob("public/*.html")
all_targets = [os.path.basename(f) for f in html_files] + ["", "#"]

broken_links = []
for file in html_files:
    with open(file, "r") as f:
        content = f.read()
    links = re.findall(r'href="([^"h][^"]*)"', content)
    for link in links:
        if link.startswith("mailto:") or link.startswith("tel:"):
            continue
        if link.startswith("#"):
            continue
        if "?" in link:
            link = link.split("?")[0]
        if "#" in link:
            link = link.split("#")[0]
        if link not in all_targets:
            broken_links.append((file, link))

if broken_links:
    for file, link in set(broken_links):
        print(f"Broken link in {file}: {link}")
else:
    print("No broken links found!")
