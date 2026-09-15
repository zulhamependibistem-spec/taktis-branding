import re, zipfile, shutil, time

DOC = "src/lib/surat/template.docx"

z = zipfile.ZipFile(DOC)
names = z.namelist()
data = {n: z.read(n) for n in names}

NS = '<w:hdr xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:cx="http://schemas.microsoft.com/office/drawing/2014/chartex" xmlns:cx1="http://schemas.microsoft.com/office/drawing/2015/9/8/chartex" xmlns:cx2="http://schemas.microsoft.com/office/drawing/2015/10/21/chartex" xmlns:cx3="http://schemas.microsoft.com/office/drawing/2016/5/9/chartex" xmlns:cx4="http://schemas.microsoft.com/office/drawing/2016/5/10/chartex" xmlns:cx5="http://schemas.microsoft.com/office/drawing/2016/5/11/chartex" xmlns:cx6="http://schemas.microsoft.com/office/drawing/2016/5/12/chartex" xmlns:cx7="http://schemas.microsoft.com/office/drawing/2016/5/13/chartex" xmlns:cx8="http://schemas.microsoft.com/office/drawing/2016/5/14/chartex" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:aink="http://schemas.microsoft.com/office/drawing/2016/ink" xmlns:am3d="http://schemas.microsoft.com/office/drawing/2017/model3d" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:oel="http://schemas.microsoft.com/office/2019/extlst" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" xmlns:w16cex="http://schemas.microsoft.com/office/word/2018/wordml/cex" xmlns:w16cid="http://schemas.microsoft.com/office/word/2016/wordml/cid" xmlns:w16="http://schemas.microsoft.com/office/word/2018/wordml" xmlns:w16du="http://schemas.microsoft.com/office/word/2023/wordml/word16du" xmlns:w16sdtdh="http://schemas.microsoft.com/office/word/2020/wordml/sdtdatahash" xmlns:w16sdtfl="http://schemas.microsoft.com/office/word/2024/wordml/sdtformatlock" xmlns:w16se="http://schemas.microsoft.com/office/word/2015/wordml/symex" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14 w15 w16se w16cid w16 w16cex w16sdtdh w16sdtfl w16du wp14">'

BOLD = '<w:b/><w:color w:val="1A2C86"/><w:sz w:val="22"/><w:szCs w:val="22"/>'
NORM = '<w:color w:val="1A2C86"/><w:sz w:val="22"/><w:szCs w:val="22"/>'
FONT = '<w:rFonts w:ascii="Verdana" w:eastAsia="Verdana" w:hAnsi="Verdana" w:cs="Verdana"/>'

def run(txt, bold=False, br=False):
    rpr = '<w:rPr>' + FONT + (BOLD if bold else NORM) + '</w:rPr>'
    body = '<w:t xml:space="preserve">' + txt + '</w:t>' if not br else '<w:br/>'
    return '<w:r>' + rpr + body + '</w:r>'

def para(*runs, spacing='270', jc='right'):
    return ('<w:p><w:pPr><w:spacing w:line="' + spacing + '" w:lineRule="exact"/>'
            + '<w:jc w:val="' + jc + '"/><w:rPr>' + FONT + NORM + '</w:rPr></w:pPr>'
            + ''.join(runs) + '</w:p>')

# kop 4 baris right-aligned (mirror reference txbxContent, tanpa VML)
header = (
    NS
    + para(run('PT BISTEM JAYA MANDIRI', bold=True))
    + para(run('Jl. H. Taiman No. 36 Gedong, Ps. Rebo')
           + run('', br=True)
           + run('Jakarta Timur 13760 - (021) 22877557')
           + run('', br=True)
           + run('www.bistem.co.id', bold=True))
    + '</w:hdr>'
)
data['word/header1.xml'] = header.encode('utf8')

# --- document.xml: reorder body ke urutan visual reference PDF page 1 ---
d = data['word/document.xml'].decode('utf8')

paras = re.findall(r'<w:p(?: [^>]*)?>.*?</w:p>|<w:p/>', d, re.S)
assert len(paras) == 102, f'expected 102 paras, got {len(paras)}'

# hapus column-break sisa dari reference (di single-column jadi page-break)
paras = [p.replace('<w:br w:type="column"/>', '') for p in paras]

# kalibrasi gap: para17 (Jakarta->Kepada) kecilkan agar Kepada naik ke y~167,
# para21 (sebelum Dengan Hormat) perbesar agar Dengan Hormat turun ke y~246
paras[17] = paras[17].replace('w:line="200"', 'w:line="120"')
paras[21] = paras[21].replace('w:line="220"', 'w:line="420"')

# emulasi kolom reference: SURAT TUGAS di tengah (ref col2 x~288), Jakarta di kanan (ref col3 x~435)
# indeks ORIGINAL (belum reorder): 14=SURAT TUGAS, 20=Jakarta
paras[14] = paras[14].replace('<w:spacing', '<w:jc w:val="center"/><w:spacing')
paras[14] = paras[14].replace('<w:ind w:left="1564"/>', '')
paras[20] = paras[20].replace('<w:ind w:hanging="450"/>', '<w:ind w:left="7400"/>')

# SURAT IZIN mulai halaman 2: pageBreakBefore diabaikan docx-preview.
# Simulasikan page break referensi dengan paragraf break tersendiri
# (<w:br w:type="page"/> yang dihormati Word & docx-preview) tepat sebelum
# para 54 (logo+garis kop halaman2), agar pict page-anchored masuk halaman 2.
# pageBreakBefore pada 60 DIBUANG agar SURAT IZIN tidak lompat ekstra.
assert '<w:pageBreakBefore/>' in paras[60]
paras[60] = paras[60].replace('<w:pageBreakBefore/>', '')
assert '<w:pict' in paras[54]
BREAKPARA = ('<w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="exact"/></w:pPr>'
             '<w:r><w:br w:type="page"/></w:r></w:p>')

BODY = []
for i in range(23, 102):
    if i == 54:
        BODY.append(BREAKPARA)
    BODY.append(i)

# urutan target: SURAT TUGAS(14) -> No Surat(15) -> (spasi) -> Jakarta(20)
#                -> Kepada block(10-13) -> (spasi) -> Dengan Hormat(22) -> body(23...)
# paras 4-9 (empty spacer kolom-1 reference) DIBUANG, drop dari body.
ORDER = (
    [0, 1, 2, 3,                      # 4 empty spacer (SURAT TUGAS di y~106)
     14, 15,                          # SURAT TUGAS, No Surat
     16,                              # gap kecil (Jakarta di y~144)
     20,                              # Jakarta, {tanggal}
     17,                              # 1 gap (Kepada di y~165) -- 17/18/19 jadi 1
     10, 11, 12, 13,                  # Kepada block
     21,                              # gap
     22]                              # Dengan Hormat
    + BODY
)
assert len(ORDER) == len(set(ORDER)) == 95, f'para list invalid: {len(ORDER)}/{len(set(ORDER))}'

new_p = ''.join(paras[i] if isinstance(i, int) else i for i in ORDER)
# strip inline sectPr dari pPr paragraf mana pun (section break kiri) dan
# pasang SATU body-level sectPr final (mirror reference sectPr 3)
new_p = re.sub(r'<w:sectPr[^>]*>.*?</w:sectPr>', '', new_p, flags=re.S)

final_sect = ('<w:sectPr w:rsidR="00172EF6">'
              '<w:headerReference w:type="default" r:id="rId7"/>'
              '<w:pgSz w:w="11920" w:h="16840"/>'
              '<w:pgMar w:top="1420" w:right="400" w:bottom="280" w:left="1300" w:header="392" w:footer="720" w:gutter="0"/>'
              '<w:cols w:space="720"/>'
              '</w:sectPr>')

d = re.sub(r'<w:body>.*?</w:body>',
           lambda m: '<w:body>' + new_p + final_sect + '</w:body>',
           d, flags=re.S)
assert len(re.findall(r'<w:sectPr', d)) == 1
data['word/document.xml'] = d.encode('utf8')

# --- simpan ---
tmp = 'src/lib/surat/_fix2.docx'
z2 = zipfile.ZipFile(tmp, 'w', zipfile.ZIP_DEFLATED)
for n in names:
    z2.writestr(n, data[n])
z2.close()
z.close()
time.sleep(0.3)
shutil.move(tmp, DOC)
print('rebuilt OK ->', DOC)

import docx
doc = docx.Document(DOC)
sec = doc.sections[0]
print('pgsz:', sec.page_width.twips, sec.page_height.twips, '| mar t/r/b/l:', sec.top_margin.twips, sec.right_margin.twips, sec.bottom_margin.twips, sec.left_margin.twips)
for p in doc.paragraphs[:26]:
    if p.text.strip():
        print(repr(p.text[:45]))