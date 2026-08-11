import os
import glob

tr_files = [
    '/Users/tekne/dev/onx/gizlilik-politikasi.html',
    '/Users/tekne/dev/onx/girisimcilik-programi-kvkk-aydinlatma-metni.html',
    '/Users/tekne/dev/onx/cerez-aydinlatma-metni.html',
    '/Users/tekne/dev/onx/basvuru-ve-degerlendirme-kosullari.html'
]

en_files = [
    '/Users/tekne/dev/onx/en-privacy-policy.html',
    '/Users/tekne/dev/onx/en-data-disclosure.html',
    '/Users/tekne/dev/onx/en-cookie-notice.html',
    '/Users/tekne/dev/onx/en-application-terms.html'
]

tr_titles = [
    'Gizlilik Politikası',
    'KVKK Aydınlatma Metni',
    'Çerez Aydınlatma Metni',
    'Başvuru Koşulları'
]

en_titles = [
    'Privacy Policy',
    'Data Disclosure',
    'Cookie Notice',
    'Application Terms'
]

def update_files(files, titles):
    for i, filepath in enumerate(files):
        if not os.path.exists(filepath):
            continue
            
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # extract just the basename for href
        basenames = [os.path.basename(f) for f in files]
        
        # build the nav html
        nav_html = '\n          <nav class="legal-page-nav" style="margin-bottom: 2.5rem; display: flex; gap: 1.5rem; flex-wrap: wrap; padding-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1);">\n'
        for j, other_file in enumerate(basenames):
            active_style = 'color: var(--accent); border-bottom: 1px solid var(--accent); font-weight: 600;' if j == i else 'color: var(--text-muted); text-decoration: none;'
            
            # Use style class logic if we have it or inline style for hover effect isn't easy here, 
            # I will just rely on the existing style or just inline text style.
            # I'll add an onmouseover/onmouseout if needed, but it's easier to just rely on generic CSS if available.
            nav_html += f'            <a href="{other_file}" style="{active_style} transition: color 0.3s ease;">{titles[j]}</a>\n'
        nav_html += '          </nav>\n'
        
        # inject just before <div class="legal-content">
        if 'class="legal-page-nav"' not in content:
            content = content.replace('<div class="legal-content">', nav_html + '          <div class="legal-content">')
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)

update_files(tr_files, tr_titles)
update_files(en_files, en_titles)

print("Legal nav added")
