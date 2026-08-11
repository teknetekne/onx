import os
import glob
import re

html_files = glob.glob('/Users/tekne/dev/onx/*.html')

for filepath in html_files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    is_en = os.path.basename(filepath).startswith('en-') or os.path.basename(filepath) == 'en.html'

    # Extract logos
    logos_match = re.search(r'<div class="[^"]*footer-building[^"]*">(.*?)</div>', content, re.DOTALL)
    logos_html = logos_match.group(1).strip() if logos_match else ''
    if not logos_html:
        logos_html = """<a href="https://www.on.com.tr/" target="_blank" rel="noopener noreferrer">
            <img src="images/on-logo.svg" alt="ON Logo" class="footer-on-logo" />
          </a>
          <a href="https://www.burgan.com.tr/" target="_blank" rel="noopener noreferrer">
            <img src="images/burgan-logo-footer.png" alt="Burgan Bank" class="footer-building-img" />
          </a>"""
          
    # Legal links
    if is_en:
        legal_links_html = """<a href="en-privacy-policy.html">Privacy Policy</a><a href="en-data-disclosure.html">Data Disclosure</a><a href="en-cookie-notice.html">Cookie Notice</a><a href="en-application-terms.html">Application Terms</a>"""
        copyright_text = "&copy; 2026 ONx Ventures. All Rights Reserved."
    else:
        legal_links_html = """<a href="gizlilik-politikasi.html">Gizlilik Politikası</a><a href="girisimcilik-programi-kvkk-aydinlatma-metni.html">KVKK Aydınlatma Metni</a><a href="cerez-aydinlatma-metni.html">Çerez Aydınlatma Metni</a><a href="basvuru-ve-degerlendirme-kosullari.html">Başvuru Koşulları</a>"""
        copyright_text = "&copy; 2026 ONx Ventures. Tüm Hakları Saklıdır."

    # New structure:
    # 1. A div for legal nav and logos above the line
    # 2. A div for footer bottom with the copyright text
    new_footer_html = f"""<div class="footer-extras" style="grid-column: 1 / -1; display: flex; justify-content: space-between; align-items: center; width: 100%; flex-wrap: wrap; gap: 2rem; margin-top: 1rem;">
          <nav class="footer-legal" style="display: flex; gap: 1.5rem; font-size: 0.95rem;">
            {legal_links_html}
          </nav>
          <div class="footer-building" style="display: flex; align-items: center; gap: 1.5rem;">
            {logos_html}
          </div>
        </div>
        <div class="footer-bottom" style="grid-column: 1 / -1; width: 100%; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 2rem; margin-top: 2rem;">
          <div class="copyright" style="color: var(--text-muted); font-size: 0.85rem; text-align: left;">
            {copyright_text}
          </div>
        </div>"""

    # We need to replace the current <div class="footer-bottom"...>...</div>
    # The current one spans from <div class="footer-bottom" to the closing </div> right before </footer>
    
    # Safely replace it
    pattern = r'<div class="footer-bottom".*?</div>\s*</div>'
    if re.search(pattern, content, re.DOTALL):
        content = re.sub(pattern, new_footer_html, content, flags=re.DOTALL)
    else:
        # Fallback if structure differs slightly
        bottom_start = content.find('<div class="footer-bottom"')
        if bottom_start != -1:
            footer_end = content.find('</footer>', bottom_start)
            if footer_end != -1:
                content = content[:bottom_start] + new_footer_html + '\n      ' + content[footer_end:]

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Footer layout updated again.")
