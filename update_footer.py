import os
import glob
import re

html_files = glob.glob('/Users/tekne/dev/onx/*.html')

for filepath in html_files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    is_en = os.path.basename(filepath).startswith('en-') or os.path.basename(filepath) == 'en.html'
    
    if is_en:
        legal_title = "Legal"
        legal_links = """
          <ul class="footer-nav-links">
            <li><div class="nav-item"><a href="en-privacy-policy.html" class="nav-title">Privacy Policy</a></div></li>
            <li><div class="nav-item"><a href="en-data-disclosure.html" class="nav-title">Data Disclosure</a></div></li>
            <li><div class="nav-item"><a href="en-cookie-notice.html" class="nav-title">Cookie Notice</a></div></li>
            <li><div class="nav-item"><a href="en-application-terms.html" class="nav-title">Application Terms</a></div></li>
          </ul>"""
        copyright_text = "&copy; 2026 ONx Ventures. All Rights Reserved."
    else:
        legal_title = "Yasal"
        legal_links = """
          <ul class="footer-nav-links">
            <li><div class="nav-item"><a href="gizlilik-politikasi.html" class="nav-title">Gizlilik Politikası</a></div></li>
            <li><div class="nav-item"><a href="girisimcilik-programi-kvkk-aydinlatma-metni.html" class="nav-title">KVKK Aydınlatma Metni</a></div></li>
            <li><div class="nav-item"><a href="cerez-aydinlatma-metni.html" class="nav-title">Çerez Aydınlatma Metni</a></div></li>
            <li><div class="nav-item"><a href="basvuru-ve-degerlendirme-kosullari.html" class="nav-title">Başvuru Koşulları</a></div></li>
          </ul>"""
        copyright_text = "&copy; 2026 ONx Ventures. Tüm Hakları Saklıdır."
        
    legal_col = f"""
        <div class="footer-legal-col" style="display: flex; flex-direction: column; gap: 1.5rem;">
          <span class="footer-contact-title">{legal_title}</span>{legal_links}
        </div>"""

    if '<div class="footer-legal-col"' not in content:
        content = content.replace('<div class="footer-building">', legal_col + '\n\n        <div class="footer-building">')
    
    pattern = r'<div class="footer-bottom">.*?</footer>'
    replacement = f'<div class="footer-bottom">\n          <div class="copyright">{copyright_text}</div>\n        </div>\n      </footer>'
    
    new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

print("HTML files updated")
