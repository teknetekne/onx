import os
import glob
import re

html_files = glob.glob('/Users/tekne/dev/onx/*.html')

for filepath in html_files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    is_en = os.path.basename(filepath).startswith('en-') or os.path.basename(filepath) == 'en.html'

    # Step 1: Remove the injected <div class="footer-legal-col">...</div>
    content = re.sub(r'<div class="footer-legal-col".*?</div>\s*<div class="footer-building">', '<div class="footer-building">', content, flags=re.DOTALL)
    # Also if the above failed because of spaces, let's just remove the col block completely.
    content = re.sub(r'<div class="footer-legal-col".*?</ul>\s*</div>', '', content, flags=re.DOTALL)

    # Step 2: Remove the existing footer-building and footer-bottom and replace them with a unified footer-bottom
    
    # First extract the building logos
    building_match = re.search(r'<div class="footer-building">(.*?)</div>', content, re.DOTALL)
    logos_html = building_match.group(1).strip() if building_match else ''
    
    # In some versions it might have been deleted, if not found, we construct manually.
    if not logos_html:
        logos_html = """<a href="https://www.on.com.tr/" target="_blank" rel="noopener noreferrer">
            <img src="images/on-logo.svg" alt="ON Logo" class="footer-on-logo" />
          </a>
          <a href="https://www.burgan.com.tr/" target="_blank" rel="noopener noreferrer">
            <img src="images/burgan-logo-footer.png" alt="Burgan Bank" class="footer-building-img" />
          </a>"""
    
    # Prepare legal links for footer bottom
    if is_en:
        legal_links_html = """<a href="en-privacy-policy.html">Privacy Policy</a><a href="en-data-disclosure.html">Data Disclosure</a><a href="en-cookie-notice.html">Cookie Notice</a><a href="en-application-terms.html">Application Terms</a>"""
        copyright_text = "&copy; 2026 ONx Ventures. All Rights Reserved."
    else:
        legal_links_html = """<a href="gizlilik-politikasi.html">Gizlilik Politikası</a><a href="girisimcilik-programi-kvkk-aydinlatma-metni.html">KVKK Aydınlatma Metni</a><a href="cerez-aydinlatma-metni.html">Çerez Aydınlatma Metni</a><a href="basvuru-ve-degerlendirme-kosullari.html">Başvuru Koşulları</a>"""
        copyright_text = "&copy; 2026 ONx Ventures. Tüm Hakları Saklıdır."

    new_footer_bottom = f"""<div class="footer-bottom" style="display: flex; justify-content: space-between; align-items: center; grid-column: 1 / -1; width: 100%; flex-wrap: wrap; gap: 2rem; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 2rem; margin-top: 2rem;">
          <div class="footer-bottom-left" style="display: flex; align-items: center; gap: 2rem; flex-wrap: wrap;">
            <div class="copyright" style="color: var(--text-muted); font-size: 0.85rem;">{copyright_text}</div>
            <nav class="footer-legal" style="display: flex; gap: 1.5rem; font-size: 0.85rem;">
              {legal_links_html}
            </nav>
          </div>
          <div class="footer-bottom-right footer-building" style="display: flex; align-items: center; gap: 1.5rem; border: none; padding-top: 0; margin-top: 0;">
            {logos_html}
          </div>
        </div>"""
    
    # Remove old <div class="footer-building">...</div> and <div class="footer-bottom">...</div>
    content = re.sub(r'<div class="footer-building">.*?</div>', '', content, flags=re.DOTALL)
    
    # In case there's another footer-bottom with just copyright
    content = re.sub(r'<div class="footer-bottom">\s*<div class="copyright">.*?</div>\s*</div>', new_footer_bottom, content, flags=re.DOTALL)
    # If the regex didn't catch it, fallback replace:
    if '<div class="footer-bottom">' in content and new_footer_bottom not in content:
        content = re.sub(r'<div class="footer-bottom">.*?</div>', new_footer_bottom, content, flags=re.DOTALL)
        
    # Remove trailing </div> from footer-bottom replacements that might have nested divs if regex matched too little
    # Wait, the regex `.*?` with `re.DOTALL` might match up to the FIRST `</div>` which is the closing tag of `<div class="copyright">`!
    # Ah, regex for nested html is bad. Let's do it safer.
    
    # Let's clean footer from end of <div class="footer-contact">...</div> to </footer>
    contact_match = re.search(r'(<div class="footer-contact">.*?</ul>\s*</div>)', content, re.DOTALL)
    if contact_match:
        before_footer_bottom = content[:contact_match.end()]
        footer_end_match = re.search(r'</footer>', content[contact_match.end():])
        if footer_end_match:
            after_footer_bottom = content[contact_match.end() + footer_end_match.start():]
            content = before_footer_bottom + '\n        ' + new_footer_bottom + '\n      ' + after_footer_bottom
    
    # Step 3: Move legal-page-nav to header in legal pages
    legal_nav_match = re.search(r'<nav class="legal-page-nav".*?</nav>', content, re.DOTALL)
    if legal_nav_match:
        nav_html = legal_nav_match.group(0)
        # We need to remove the inline style completely and add standard styles.
        # It's better to just reconstruct it.
        # But wait, let's extract the links.
        links = re.findall(r'<a href="([^"]+)"[^>]*>(.*?)</a>', nav_html)
        
        # Build new nav
        new_nav = '<nav class="header-legal-nav" style="display: flex; gap: 1.5rem; align-items: center; margin: 0 auto;">\n'
        for href, text in links:
            # Check if this link is the current file to mark it active
            active_style = 'color: #FFF; border-bottom: 1px solid var(--accent); font-weight: 500;' if href == os.path.basename(filepath) else 'color: var(--text-muted); text-decoration: none;'
            new_nav += f'            <a href="{href}" style="{active_style} font-size: 0.95rem; transition: color 0.3s ease;">{text}</a>\n'
        new_nav += '          </nav>'

        # Remove old nav from body
        content = content.replace(nav_html, '')
        
        # Inject into header
        if '<header id="top" class="simple-header">' in content:
            # Find the header
            header_pattern = r'(<header id="top" class="simple-header">.*?)(<a href="[^"]+" class="btn-return">)'
            content = re.sub(header_pattern, r'\1' + new_nav + r'\n        \2', content, flags=re.DOTALL)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Layout updated.")
