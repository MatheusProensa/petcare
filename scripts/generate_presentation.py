"""
PetCare — Gerador de apresentação PDF profissional para empresas e investidores.
"""
import os, math
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether, Image as RLImage, PageBreak,
)
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.pdfgen import canvas
from reportlab.platypus.flowables import Flowable
from reportlab.graphics.shapes import Drawing, Rect, Circle, String, Line, Polygon
from reportlab.graphics import renderPDF
from PIL import Image as PILImage
import io

# ─── Paleta oficial PetCare ────────────────────────────────────────────────
ORANGE     = HexColor('#E66A3A')
ORANGE_STR = HexColor('#D2562A')
ORANGE_SFT = HexColor('#FBE6DA')
NAVY       = HexColor('#1B2940')
NAVY_LT    = HexColor('#2C3E5A')
NAVY_MED   = HexColor('#4A586E')
CREAM      = HexColor('#FBF5EF')
CREAM_DK   = HexColor('#F4EDE6')
BORDER     = HexColor('#EEE2D8')
SUCCESS    = HexColor('#0E9F6E')
SUCCESS_SF = HexColor('#DEF3EA')
INFO       = HexColor('#2C72B8')
INFO_SF    = HexColor('#DEEAF6')
WARNING    = HexColor('#C9760F')
WARNING_SF = HexColor('#FBEBD3')
ACCENT     = HexColor('#7C3AED')
ACCENT_SF  = HexColor('#ECE3FB')
WHITE      = HexColor('#FFFFFF')
TEXT_SUBTLE= HexColor('#6A788C')

W, H = A4
BASE = '/home/user/petcare'
ICON_PATH  = f'{BASE}/assets/branding/icon.png'
LOGO_PATH  = f'{BASE}/assets/branding/logo-light.png'
OUT_PATH   = f'{BASE}/PetCare-Apresentacao.pdf'

# ─── Helpers ───────────────────────────────────────────────────────────────

def rgba_to_pil(path):
    """Converte RGBA PNG para RGB com fundo branco."""
    img = PILImage.open(path)
    if img.mode == 'RGBA':
        bg = PILImage.new('RGB', img.size, (255, 255, 255))
        bg.paste(img, mask=img.split()[3])
        return bg
    return img.convert('RGB')

def icon_png_rgb():
    """Retorna ícone como bytes RGB PNG."""
    img = rgba_to_pil(ICON_PATH)
    buf = io.BytesIO()
    img.save(buf, 'PNG')
    buf.seek(0)
    return buf

class ColorRect(Flowable):
    """Retângulo colorido de largura total."""
    def __init__(self, width, height, fill, radius=0):
        super().__init__()
        self.width = width
        self.height = height
        self.fill = fill
        self.radius = radius

    def draw(self):
        self.canv.setFillColor(self.fill)
        self.canv.roundRect(0, 0, self.width, self.height, self.radius, fill=1, stroke=0)

class HLine(Flowable):
    def __init__(self, width, color, thickness=0.5):
        super().__init__()
        self.width = width
        self.height = thickness + 2
        self.color = color
        self.thickness = thickness

    def draw(self):
        self.canv.setStrokeColor(self.color)
        self.canv.setLineWidth(self.thickness)
        self.canv.line(0, self.height / 2, self.width, self.height / 2)

class IconBadge(Flowable):
    """Círculo colorido com emoji/texto central — usado em cards de feature."""
    def __init__(self, size, bg, text, text_size=18):
        super().__init__()
        self.width = size
        self.height = size
        self.bg = bg
        self.text = text
        self.text_size = text_size

    def draw(self):
        r = self.width / 2
        self.canv.setFillColor(self.bg)
        self.canv.circle(r, r, r, fill=1, stroke=0)
        self.canv.setFillColor(WHITE)
        self.canv.setFont('Helvetica-Bold', self.text_size)
        self.canv.drawCentredString(r, r - self.text_size * 0.35, self.text)

# ─── Estilos ───────────────────────────────────────────────────────────────

def make_styles():
    s = {}
    def ps(name, **kw):
        base = kw.pop('parent', None)
        if base:
            p = ParagraphStyle(name, parent=s[base])
        else:
            p = ParagraphStyle(name)
        for k, v in kw.items():
            setattr(p, k, v)
        s[name] = p
        return p

    ps('body',       fontName='Helvetica', fontSize=10, leading=15,
                     textColor=NAVY, spaceBefore=0, spaceAfter=0)
    ps('body_sm',    parent='body', fontSize=9, leading=13, textColor=NAVY_MED)
    ps('body_muted', parent='body', fontSize=9, leading=13, textColor=TEXT_SUBTLE)

    ps('h1', fontName='Helvetica-Bold', fontSize=36, leading=42,
             textColor=WHITE, alignment=TA_CENTER)
    ps('h1_dark', parent='h1', textColor=NAVY)
    ps('h2', fontName='Helvetica-Bold', fontSize=22, leading=28,
             textColor=NAVY, spaceBefore=4, spaceAfter=4)
    ps('h2_white', parent='h2', textColor=WHITE)
    ps('h3', fontName='Helvetica-Bold', fontSize=15, leading=20,
             textColor=NAVY, spaceBefore=2, spaceAfter=2)
    ps('h3_orange', parent='h3', textColor=ORANGE)
    ps('h3_white',  parent='h3', textColor=WHITE)
    ps('h4', fontName='Helvetica-Bold', fontSize=11, leading=15, textColor=NAVY)
    ps('h4_orange', parent='h4', textColor=ORANGE)
    ps('h4_white',  parent='h4', textColor=WHITE)

    ps('tag', fontName='Helvetica-Bold', fontSize=8, leading=10,
              textColor=ORANGE, spaceBefore=0, spaceAfter=0)
    ps('tag_white', parent='tag', textColor=HexColor('#FFB27A'))

    ps('caption', fontName='Helvetica', fontSize=8, leading=11,
                  textColor=TEXT_SUBTLE, alignment=TA_CENTER)

    ps('bullet', parent='body', bulletIndent=10, leftIndent=18,
                 spaceAfter=3, leading=14)
    ps('footer', fontName='Helvetica', fontSize=8, textColor=TEXT_SUBTLE,
                 alignment=TA_CENTER)

    ps('big_number', fontName='Helvetica-Bold', fontSize=32, leading=36,
                     textColor=ORANGE, alignment=TA_CENTER)
    ps('big_label',  fontName='Helvetica', fontSize=10, leading=13,
                     textColor=NAVY_MED, alignment=TA_CENTER)

    ps('tagline', fontName='Helvetica', fontSize=14, leading=20,
                  textColor=HexColor('#FFD9BE'), alignment=TA_CENTER)

    ps('cover_sub', fontName='Helvetica', fontSize=11, leading=16,
                    textColor=HexColor('#CBD5E1'), alignment=TA_CENTER)

    ps('pill_text', fontName='Helvetica-Bold', fontSize=9, leading=11,
                    textColor=WHITE)

    return s

ST = make_styles()

# ─── Página de capa (canvas) ───────────────────────────────────────────────

def draw_cover(c: canvas.Canvas, doc):
    """Capa totalmente desenhada no canvas — não usa flowables."""
    c.saveState()

    # Fundo degradê navy
    c.setFillColor(NAVY)
    c.rect(0, 0, W, H, fill=1, stroke=0)

    # Faixa laranja diagonal no topo
    p = c.beginPath()
    p.moveTo(0, H)
    p.lineTo(W, H)
    p.lineTo(W, H - 220)
    p.lineTo(0, H - 280)
    p.close()
    c.setFillColor(ORANGE)
    c.drawPath(p, fill=1, stroke=0)

    # Faixa laranja mais escura
    p2 = c.beginPath()
    p2.moveTo(0, H)
    p2.lineTo(W, H)
    p2.lineTo(W, H - 80)
    p2.lineTo(0, H - 120)
    p2.close()
    c.setFillColor(ORANGE_STR)
    c.drawPath(p2, fill=1, stroke=0)

    # Círculos decorativos
    c.setFillColor(HexColor('#FFFFFF0A'))  # semi-transparente branco
    c.setFillAlpha(0.06)
    c.circle(W - 60, H - 40, 180, fill=1, stroke=0)
    c.setFillAlpha(0.04)
    c.circle(30, H - 200, 140, fill=1, stroke=0)
    c.setFillAlpha(1)

    # Ícone do app
    try:
        buf = icon_png_rgb()
        icon_size = 100
        ix = (W - icon_size) / 2
        iy = H - 210
        c.drawImage(buf, ix, iy, width=icon_size, height=icon_size,
                    preserveAspectRatio=True, mask='auto')
    except Exception:
        pass

    # Nome do app
    c.setFillColor(WHITE)
    c.setFont('Helvetica-Bold', 48)
    c.drawCentredString(W / 2, H - 270, 'PetCare')

    # Tagline
    c.setFillColor(HexColor('#FFD9BE'))
    c.setFont('Helvetica', 16)
    c.drawCentredString(W / 2, H - 298, 'O prontuário digital do seu pet')

    # Linha divisória
    c.setStrokeColor(ORANGE_SFT)
    c.setLineWidth(1)
    c.line(W/2 - 80, H - 318, W/2 + 80, H - 318)

    # Subtítulo
    c.setFillColor(HexColor('#CBD5E1'))
    c.setFont('Helvetica', 11)
    c.drawCentredString(W / 2, H - 338,
        'Apresentação de produto · Versão 1.0')

    # ─── Bloco de stats ──────────────────────────────────────────────────
    stats = [
        ('100%', 'Privacidade'),
        ('0', 'Conta necessária'),
        ('∞', 'Pets cadastrados'),
        ('7+', 'Módulos integrados'),
    ]
    box_w = W / len(stats)
    box_y = H/2 - 50
    for i, (num, label) in enumerate(stats):
        bx = i * box_w
        # fundo card
        c.setFillColor(HexColor('#FFFFFF08'))
        c.setFillAlpha(0.08)
        c.roundRect(bx + 8, box_y, box_w - 16, 90, 8, fill=1, stroke=0)
        c.setFillAlpha(1)
        # número
        c.setFillColor(ORANGE)
        c.setFont('Helvetica-Bold', 28)
        c.drawCentredString(bx + box_w/2, box_y + 52, num)
        # label
        c.setFillColor(HexColor('#94A3B8'))
        c.setFont('Helvetica', 9)
        c.drawCentredString(bx + box_w/2, box_y + 32, label)

    # ─── Pills de features ───────────────────────────────────────────────
    pills = [
        '🐾  Vacinas',
        '💊  Medicamentos',
        '📊  Peso & Crescimento',
        '📄  Documentos',
        '🚨  Emergência',
        '🔔  Lembretes',
        '❤️  Memórias',
        '✈️  Kit Viagem',
    ]
    pill_h = 26
    pill_pad = 12
    pill_gap = 8
    pill_y_start = H/2 - 120

    # calcular larguras
    c.setFont('Helvetica-Bold', 9)
    row1 = pills[:4]
    row2 = pills[4:]

    for row_idx, row in enumerate([row1, row2]):
        widths = []
        for p in row:
            tw = c.stringWidth(p, 'Helvetica-Bold', 9)
            widths.append(tw + pill_pad * 2)
        total_w = sum(widths) + pill_gap * (len(row) - 1)
        x = (W - total_w) / 2
        y = pill_y_start - row_idx * (pill_h + 10)

        for i, (p, pw) in enumerate(zip(row, widths)):
            bx = x + sum(widths[:i]) + i * pill_gap
            c.setFillColor(ORANGE_STR)
            c.roundRect(bx, y, pw, pill_h, pill_h/2, fill=1, stroke=0)
            c.setFillColor(WHITE)
            c.setFont('Helvetica-Bold', 9)
            c.drawCentredString(bx + pw/2, y + 8, p)

    # ─── Rodapé ──────────────────────────────────────────────────────────
    c.setFillColor(HexColor('#334155'))
    c.rect(0, 0, W, 50, fill=1, stroke=0)
    c.setFillColor(HexColor('#64748B'))
    c.setFont('Helvetica', 8)
    c.drawString(20, 18, 'petcare · matheu.proensa@gmail.com')
    c.drawRightString(W - 20, 18, '© 2026 PetCare. Todos os direitos reservados.')

    c.restoreState()


def draw_page_bg(c: canvas.Canvas, doc, page_num: int, total: int, title: str):
    """Fundo e rodapé padrão para páginas internas."""
    c.saveState()

    # Fundo creme
    c.setFillColor(CREAM)
    c.rect(0, 0, W, H, fill=1, stroke=0)

    # Faixa lateral esquerda laranja fina
    c.setFillColor(ORANGE)
    c.rect(0, 0, 4, H, fill=1, stroke=0)

    # Header topo
    c.setFillColor(WHITE)
    c.rect(0, H - 44, W, 44, fill=1, stroke=0)
    c.setFillColor(BORDER)
    c.setLineWidth(0.5)
    c.line(0, H - 44, W, H - 44)

    # Logo no header
    try:
        buf = icon_png_rgb()
        c.drawImage(buf, 12, H - 36, width=24, height=24,
                    preserveAspectRatio=True, mask='auto')
    except Exception:
        pass
    c.setFillColor(ORANGE)
    c.setFont('Helvetica-Bold', 11)
    c.drawString(42, H - 26, 'PetCare')
    c.setFillColor(TEXT_SUBTLE)
    c.setFont('Helvetica', 9)
    c.drawRightString(W - 16, H - 26, title)

    # Rodapé
    c.setFillColor(NAVY)
    c.rect(0, 0, W, 36, fill=1, stroke=0)
    c.setFillColor(HexColor('#64748B'))
    c.setFont('Helvetica', 8)
    c.drawString(16, 13, 'PetCare · O prontuário digital do seu pet')
    c.setFillColor(WHITE)
    c.setFont('Helvetica-Bold', 8)
    c.drawRightString(W - 16, 13, f'{page_num}')

    c.restoreState()


# ─── Construtores de conteúdo ──────────────────────────────────────────────

def section_header(title: str, subtitle: str = '', accent=ORANGE, page_w=None):
    """Cabeçalho de seção com traço laranja."""
    pw = page_w or (W - 48)
    items = []
    items.append(Spacer(1, 6))

    # Badge de seção
    pill = Table([[Paragraph(title.upper(), ST['tag'])]],
                 colWidths=[None])
    pill.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), ORANGE_SFT),
        ('TOPPADDING',    (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING',   (0,0), (-1,-1), 10),
        ('RIGHTPADDING',  (0,0), (-1,-1), 10),
        ('ROUNDEDCORNERS', [6]),
    ]))
    items.append(pill)
    items.append(Spacer(1, 8))
    if subtitle:
        items.append(Paragraph(subtitle, ST['h2']))
    items.append(Spacer(1, 4))
    items.append(HLine(pw, ORANGE, 2))
    items.append(Spacer(1, 16))
    return items


def feature_card(emoji: str, title: str, desc: str, bg=ORANGE_SFT, title_color=NAVY,
                 w=None, compact=False):
    """Card de feature com ícone, título e descrição."""
    icon_size = 36 if not compact else 28
    pad = 10 if not compact else 8
    title_style = ParagraphStyle('fc_title', fontName='Helvetica-Bold',
                                  fontSize=11 if not compact else 10,
                                  leading=14, textColor=title_color)
    desc_style  = ParagraphStyle('fc_desc', fontName='Helvetica',
                                  fontSize=9, leading=13, textColor=NAVY_MED)

    icon_cell = Table([[Paragraph(emoji, ParagraphStyle(
        'em', fontName='Helvetica', fontSize=icon_size * 0.5, leading=icon_size,
        alignment=TA_CENTER))]],
        colWidths=[icon_size + 8], rowHeights=[icon_size + 8])
    icon_cell.setStyle(TableStyle([
        ('BACKGROUND',    (0,0), (-1,-1), bg),
        ('ROUNDEDCORNERS', [icon_size // 2]),
        ('ALIGN',         (0,0), (-1,-1), 'CENTER'),
        ('VALIGN',        (0,0), (-1,-1), 'MIDDLE'),
    ]))

    text_cell = [
        Paragraph(title, title_style),
        Spacer(1, 2),
        Paragraph(desc, desc_style),
    ]

    col_w = (w or 245) - icon_size - 20
    tbl = Table([[icon_cell, text_cell]], colWidths=[icon_size + 12, col_w])
    tbl.setStyle(TableStyle([
        ('VALIGN',  (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING',  (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING',   (0,0), (-1,-1), 0),
        ('BOTTOMPADDING',(0,0), (-1,-1), 0),
    ]))

    outer = Table([[tbl]], colWidths=[w or 245])
    outer.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), WHITE),
        ('ROUNDEDCORNERS', [10]),
        ('BOX',        (0,0), (-1,-1), 0.5, BORDER),
        ('TOPPADDING',    (0,0), (-1,-1), pad),
        ('BOTTOMPADDING', (0,0), (-1,-1), pad),
        ('LEFTPADDING',   (0,0), (-1,-1), pad),
        ('RIGHTPADDING',  (0,0), (-1,-1), pad),
    ]))
    return outer


def two_col_cards(cards_data, page_w=None):
    """Grade 2 colunas de feature cards."""
    pw = page_w or (W - 48)
    col_w = (pw - 12) / 2
    rows = []
    for i in range(0, len(cards_data), 2):
        left = feature_card(*cards_data[i], w=col_w)
        if i + 1 < len(cards_data):
            right = feature_card(*cards_data[i+1], w=col_w)
        else:
            right = Spacer(col_w, 1)
        rows.append([left, right])

    tbl = Table(rows, colWidths=[col_w, col_w], hAlign='LEFT')
    tbl.setStyle(TableStyle([
        ('LEFTPADDING',   (0,0), (-1,-1), 0),
        ('RIGHTPADDING',  (0,0), (-1,-1), 0),
        ('TOPPADDING',    (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ('COLPADDING',    (0,0), (-1,-1), 6),
    ]))
    return tbl


def stat_row(stats):
    """Linha de números grandes (impacto visual)."""
    cells = []
    for num, label, color in stats:
        num_p  = Paragraph(num, ParagraphStyle('sn', fontName='Helvetica-Bold',
                           fontSize=30, leading=34, textColor=color, alignment=TA_CENTER))
        lbl_p  = Paragraph(label, ParagraphStyle('sl', fontName='Helvetica', fontSize=9,
                           leading=12, textColor=NAVY_MED, alignment=TA_CENTER))
        cells.append([num_p, Spacer(1, 4), lbl_p])

    col_w = (W - 48) / len(stats)
    tbl = Table([cells[i:i+1] if len(cells[i]) else [] for i in range(len(cells))],
                # hack — montar como col única por stat
                )
    # montar corretamente
    row = []
    for stat in stats:
        num, label, color = stat
        inner = Table([
            [Paragraph(num, ParagraphStyle('sn2', fontName='Helvetica-Bold',
                       fontSize=30, leading=34, textColor=color, alignment=TA_CENTER))],
            [Paragraph(label, ParagraphStyle('sl2', fontName='Helvetica', fontSize=9,
                       leading=12, textColor=NAVY_MED, alignment=TA_CENTER))],
        ], colWidths=[col_w - 4])
        inner.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), WHITE),
            ('BOX',        (0,0), (-1,-1), 0.5, BORDER),
            ('ROUNDEDCORNERS', [10]),
            ('TOPPADDING',    (0,0), (-1,-1), 16),
            ('BOTTOMPADDING', (0,0), (-1,-1), 16),
            ('LEFTPADDING',   (0,0), (-1,-1), 4),
            ('RIGHTPADDING',  (0,0), (-1,-1), 4),
        ]))
        row.append(inner)

    tbl2 = Table([row], colWidths=[col_w] * len(stats))
    tbl2.setStyle(TableStyle([
        ('LEFTPADDING',   (0,0), (-1,-1), 2),
        ('RIGHTPADDING',  (0,0), (-1,-1), 2),
        ('TOPPADDING',    (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
    ]))
    return tbl2


def highlight_box(text, bg=ORANGE_SFT, border=ORANGE, text_color=NAVY, page_w=None):
    pw = page_w or (W - 48)
    p = Paragraph(text, ParagraphStyle('hb', fontName='Helvetica', fontSize=10,
                                        leading=16, textColor=text_color))
    tbl = Table([[p]], colWidths=[pw])
    tbl.setStyle(TableStyle([
        ('BACKGROUND',    (0,0), (-1,-1), bg),
        ('LINEBEFORE',    (0,0), (-1,-1), 4, border),
        ('TOPPADDING',    (0,0), (-1,-1), 12),
        ('BOTTOMPADDING', (0,0), (-1,-1), 12),
        ('LEFTPADDING',   (0,0), (-1,-1), 16),
        ('RIGHTPADDING',  (0,0), (-1,-1), 16),
    ]))
    return tbl


def dark_card(content_rows, page_w=None, bg=NAVY):
    pw = page_w or (W - 48)
    tbl = Table(content_rows, colWidths=[pw])
    tbl.setStyle(TableStyle([
        ('BACKGROUND',    (0,0), (-1,-1), bg),
        ('ROUNDEDCORNERS', [12]),
        ('TOPPADDING',    (0,0), (-1,-1), 20),
        ('BOTTOMPADDING', (0,0), (-1,-1), 20),
        ('LEFTPADDING',   (0,0), (-1,-1), 20),
        ('RIGHTPADDING',  (0,0), (-1,-1), 20),
    ]))
    return tbl


def roadmap_item(phase: str, title: str, items: list, status: str, status_color):
    phase_p  = Paragraph(phase.upper(),  ParagraphStyle('rp',  fontName='Helvetica-Bold',
                          fontSize=8, textColor=status_color))
    title_p  = Paragraph(title,          ParagraphStyle('rt',  fontName='Helvetica-Bold',
                          fontSize=12, leading=16, textColor=NAVY))
    status_p = Paragraph(f'● {status}',  ParagraphStyle('rs',  fontName='Helvetica',
                          fontSize=9, textColor=status_color))
    items_p  = Paragraph('<br/>'.join(f'· {i}' for i in items),
                          ParagraphStyle('ri', fontName='Helvetica', fontSize=9,
                                         leading=14, textColor=NAVY_MED))
    tbl = Table([
        [phase_p,  status_p],
        [title_p,  ''],
        [items_p,  ''],
    ], colWidths=[200, None])
    tbl.setStyle(TableStyle([
        ('SPAN',          (0,1), (-1,1)),
        ('SPAN',          (0,2), (-1,2)),
        ('BACKGROUND',    (0,0), (-1,-1), WHITE),
        ('BOX',           (0,0), (-1,-1), 0.5, BORDER),
        ('LINEBEFORE',    (0,0), (-1,-1), 3, status_color),
        ('ROUNDEDCORNERS', [8]),
        ('TOPPADDING',    (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ('LEFTPADDING',   (0,0), (-1,-1), 14),
        ('RIGHTPADDING',  (0,0), (-1,-1), 10),
        ('ALIGN',         (1,0), (1,0), 'RIGHT'),
    ]))
    return tbl


# ─── Montagem do documento ─────────────────────────────────────────────────

class PDFPresentation:
    def __init__(self):
        self.page_count  = 0
        self.page_titles = {}
        self.story       = []
        self.sections    = []  # [(title, start_page)]

    def build(self):
        doc = SimpleDocTemplate(
            OUT_PATH,
            pagesize=A4,
            leftMargin=24, rightMargin=24,
            topMargin=58, bottomMargin=46,
            title='PetCare — Apresentação de Produto',
            author='Matheus Proensa',
            subject='Prontuário digital para pets',
        )

        pages = [
            self._page_cover,
            self._page_overview,
            self._page_features,
            self._page_modules_1,
            self._page_modules_2,
            self._page_privacy,
            self._page_tech,
            self._page_roadmap,
            self._page_contact,
        ]

        story = []
        for i, page_fn in enumerate(pages):
            content = page_fn()
            story.extend(content)
            if i < len(pages) - 1:
                story.append(PageBreak())

        # Page numbers tracking
        page_info = {'num': 0, 'titles': {
            1: 'Capa',
            2: 'Visão Geral',
            3: 'Funcionalidades',
            4: 'Módulos — Saúde & Documentos',
            5: 'Módulos — Experiência',
            6: 'Privacidade & Segurança',
            7: 'Tecnologia',
            8: 'Roadmap',
            9: 'Contato',
        }}

        def on_page(canvas, doc):
            page_info['num'] += 1
            n = page_info['num']
            title = page_info['titles'].get(n, '')
            if n == 1:
                draw_cover(canvas, doc)
            else:
                draw_page_bg(canvas, doc, n, len(pages), title)

        doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
        return OUT_PATH

    # ── Página 1: Capa ────────────────────────────────────────────────────
    def _page_cover(self):
        # Conteúdo vazio — tudo desenhado no canvas
        return [Spacer(1, 1)]

    # ── Página 2: Visão Geral ─────────────────────────────────────────────
    def _page_overview(self):
        pw = W - 48
        s = []
        s += section_header('Produto', 'O que é o PetCare?', page_w=pw)

        s.append(Paragraph(
            'O <b>PetCare</b> é um aplicativo mobile de <b>prontuário digital para pets</b> '
            '— desenvolvido para donos que querem centralizar toda a saúde do seu animal '
            'em um único lugar, de forma simples, bonita e 100% privada.',
            ST['body']
        ))
        s.append(Spacer(1, 12))

        # Bloco de destaque
        s.append(highlight_box(
            '🐾  Vacinas · Medicamentos · Peso · Consultas · Documentos · Memórias '
            '— tudo salvo no celular, sem conta, sem nuvem obrigatória, sem internet.',
            page_w=pw
        ))
        s.append(Spacer(1, 20))

        # Stats
        s.append(stat_row([
            ('100%',  'Dados no dispositivo', ORANGE),
            ('0',     'Conta necessária',      SUCCESS),
            ('7+',    'Módulos integrados',    INFO),
            ('∞',     'Pets por usuário',      ACCENT),
        ]))
        s.append(Spacer(1, 20))

        # Problema × Solução
        s += section_header('Contexto', 'O problema que resolvemos', page_w=pw)

        prob_sol = [
            ('😰  O problema', [
                'Donos de pets gerenciam informações de saúde em papéis soltos, '
                'grupos de WhatsApp e cadernetas físicas que se perdem.',
                'Na emergência, ninguém sabe o histórico de vacinas ou alergias do animal.',
                'Lembretes de reforço são esquecidos, resultando em pets desprotegidos.',
            ], NAVY, ORANGE_SFT),
            ('✅  A solução', [
                'Um único app com todo o histórico de saúde do pet — sempre no bolso.',
                'Cartão de emergência offline com dados críticos sempre disponíveis.',
                'Lembretes automáticos de vacinas, remédios e consultas de retorno.',
            ], WHITE, NAVY),
        ]

        col_w = (pw - 10) / 2
        row = []
        for title, pts, txt_c, bg in prob_sol:
            title_p = Paragraph(title, ParagraphStyle(
                'pt', fontName='Helvetica-Bold', fontSize=12, leading=16, textColor=txt_c))
            pts_p = Paragraph(
                '<br/><br/>'.join(f'· {p}' for p in pts),
                ParagraphStyle('pp', fontName='Helvetica', fontSize=9,
                               leading=14, textColor=txt_c))
            cell = Table([[title_p], [Spacer(1,8)], [pts_p]], colWidths=[col_w - 20])
            cell.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), bg),
                ('ROUNDEDCORNERS', [10]),
                ('TOPPADDING',    (0,0), (-1,-1), 14),
                ('BOTTOMPADDING', (0,0), (-1,-1), 14),
                ('LEFTPADDING',   (0,0), (-1,-1), 14),
                ('RIGHTPADDING',  (0,0), (-1,-1), 14),
            ]))
            row.append(cell)

        ps_tbl = Table([row], colWidths=[col_w, col_w])
        ps_tbl.setStyle(TableStyle([
            ('LEFTPADDING',   (0,0), (-1,-1), 0),
            ('RIGHTPADDING',  (1,0), (1,0), 0),
            ('TOPPADDING',    (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ('COLPADDING',    (0,0), (-1,-1), 5),
        ]))
        s.append(ps_tbl)

        # Público-alvo
        s.append(Spacer(1, 16))
        s += section_header('Audiência', 'Para quem é?', page_w=pw)

        targets = [
            ('👨‍👩‍👧', 'Tutores de pets',
             'Famílias com cães, gatos, pássaros e outros animais que querem organizar a saúde dos pets.'),
            ('🏥', 'Clínicas veterinárias',
             'Ferramenta de valor para indicar a clientes como organização do histórico do animal.'),
            ('🐕', 'Criadores & Canis',
             'Gestão de múltiplos animais com histórico individual completo por pet.'),
            ('✈️', 'Viajantes com pets',
             'Kit viagem em PDF com vacinas e contatos de emergência para qualquer destino.'),
        ]
        s.append(two_col_cards(targets, page_w=pw))
        return s

    # ── Página 3: Funcionalidades ─────────────────────────────────────────
    def _page_features(self):
        pw = W - 48
        s = []
        s += section_header('Funcionalidades', 'Tudo que o PetCare oferece', page_w=pw)

        features = [
            ('🛡️', 'Carteira de Vacinação Digital',
             'Registre vacinas com fabricante, lote e clínica. Alertas automáticos de reforço. '
             'Reconhece equivalências entre marcas (Nobivac, Vanguard etc.).'),
            ('💊', 'Controle de Medicamentos',
             'Acompanhe remédios com data de início, fim, dosagem e frequência. '
             'Lembretes no horário certo — 1x/dia, 2x/dia, a cada 8h ou 12h.'),
            ('📊', 'Evolução de Peso',
             'Histórico de pesagens com gráfico de evolução ao longo do tempo. '
             'Ideal para monitorar crescimento de filhotes ou controle de peso.'),
            ('❤️', 'Linha da Vida',
             'Timeline completa com toda a história do pet — desde a adoção até '
             'a última consulta. Filtre por tipo e exporte em PDF.'),
            ('📸', 'Memórias com Fotos',
             'Registre momentos especiais com fotos, título e descrição. '
             'O app lembra você todo ano na data da memória.'),
            ('🚨', 'Cartão de Emergência',
             'Dados do tutor, veterinário, alergias e condições de saúde sempre '
             'disponíveis — mesmo offline — para mostrar no pronto-socorro.'),
            ('📄', 'Documentos e Exames',
             'Anexe carteirinhas, receitas e exames em PDF diretamente '
             'no prontuário do pet. Visualização integrada.'),
            ('🔔', 'Lembretes Inteligentes',
             'Notificações para vacinas, consultas, doses e datas especiais. '
             'Resumo matinal quando há itens pendentes.'),
            ('✈️', 'Kit Viagem PDF',
             'Gere um PDF com vacinas, medicamentos ativos e contatos de '
             'emergência — perfeito para viagens e consultas avulsas.'),
            ('🎭', 'Modo Demonstração',
             'Carrega pets e histórico fictícios para explorar o app sem '
             'precisar cadastrar dados reais. Ideal para apresentações.'),
            ('🌓', 'Tema Claro & Escuro',
             'Interface premium com suporte a modo escuro e claro, '
             'fontes refinadas e identidade visual exclusiva.'),
            ('💾', 'Backup JSON',
             'Exporte e importe backup completo em JSON — com '
             'pré-visualização de conteúdo antes de restaurar.'),
        ]

        s.append(two_col_cards(features, page_w=pw))
        return s

    # ── Página 4: Módulos Saúde & Documentos ─────────────────────────────
    def _page_modules_1(self):
        pw = W - 48
        s = []
        s += section_header('Módulos', 'Saúde & Documentos em detalhe', page_w=pw)

        modules = [
            {
                'icon': '🛡️', 'color': SUCCESS, 'soft': SUCCESS_SF,
                'title': 'Vacinas',
                'items': [
                    'Suporte a V8, V10, Antirrábica, Leishmaniose, Giardia, Bordetella,'
                    ' Tríplice Felina, Quádrupla Felina, Leucemia Felina e outras.',
                    'Status automático: Em dia · Reforço próximo · Atrasada · Reforço aplicado.',
                    'Reconhecimento de marcas equivalentes para evitar duplicatas.',
                    'Registro completo: fabricante, lote, dose, clínica, veterinário responsável.',
                ],
            },
            {
                'icon': '💊', 'color': WARNING, 'soft': WARNING_SF,
                'title': 'Medicamentos',
                'items': [
                    'Tratamentos temporários (data início/fim) ou uso contínuo.',
                    'Barra de progresso visual do tratamento.',
                    'Marcação de dose tomada com registro de horário.',
                    'Badge de contagem de doses pendentes no dia.',
                    'Alerta automático de fim de tratamento.',
                ],
            },
            {
                'icon': '📊', 'color': INFO, 'soft': INFO_SF,
                'title': 'Peso & Crescimento',
                'items': [
                    'Histórico de pesagens com data e observações.',
                    'Gráfico de evolução ao longo do tempo.',
                    'Cálculo de variação percentual entre pesagens.',
                    'Ideal para acompanhamento pós-cirúrgico e filhotes.',
                ],
            },
            {
                'icon': '📄', 'color': ACCENT, 'soft': ACCENT_SF,
                'title': 'Documentos',
                'items': [
                    'Categorias: Exame · Receita · Carteirinha · Outro.',
                    'Suporte a PDF e imagens (câmera ou galeria).',
                    'Visualização integrada sem sair do app.',
                    'Associação direta ao prontuário do pet.',
                ],
            },
        ]

        col_w = (pw - 10) / 2

        def module_card(m, w):
            title_p = Table([[
                Paragraph(m['icon'], ParagraphStyle('mi', fontName='Helvetica',
                          fontSize=22, leading=26, textColor=m['color'])),
                Paragraph(m['title'], ParagraphStyle('mt', fontName='Helvetica-Bold',
                          fontSize=14, leading=18, textColor=NAVY)),
            ]], colWidths=[36, w - 36 - 28])
            title_p.setStyle(TableStyle([
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ('LEFTPADDING', (0,0), (-1,-1), 0),
                ('RIGHTPADDING', (0,0), (-1,-1), 0),
                ('TOPPADDING', (0,0), (-1,-1), 0),
                ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ]))

            items_html = ''.join(
                f'<para bulletText="·" bulletIndent="6" leftIndent="14" '
                f'spaceBefore="3">{i}</para>' for i in m['items']
            )
            items_p = Paragraph(
                '<br/>'.join(f'· {i}' for i in m['items']),
                ParagraphStyle('mli', fontName='Helvetica', fontSize=9,
                               leading=14, textColor=NAVY_MED)
            )

            card = Table([
                [title_p],
                [HLine(w - 28, m['color'], 1)],
                [Spacer(1, 4)],
                [items_p],
            ], colWidths=[w - 28])
            card.setStyle(TableStyle([
                ('BACKGROUND',    (0,0), (-1,-1), WHITE),
                ('BOX',           (0,0), (-1,-1), 0.5, BORDER),
                ('LINEBEFORE',    (0,0), (-1,-1), 4, m['color']),
                ('ROUNDEDCORNERS', [8]),
                ('TOPPADDING',    (0,0), (-1,-1), 14),
                ('BOTTOMPADDING', (0,0), (-1,-1), 14),
                ('LEFTPADDING',   (0,0), (-1,-1), 14),
                ('RIGHTPADDING',  (0,0), (-1,-1), 14),
            ]))
            return card

        row1 = [module_card(modules[0], col_w), module_card(modules[1], col_w)]
        row2 = [module_card(modules[2], col_w), module_card(modules[3], col_w)]

        grid = Table([row1, row2], colWidths=[col_w, col_w])
        grid.setStyle(TableStyle([
            ('LEFTPADDING',   (0,0), (-1,-1), 0),
            ('RIGHTPADDING',  (0,0), (-1,-1), 0),
            ('TOPPADDING',    (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 10),
            ('COLPADDING',    (0,0), (-1,-1), 6),
        ]))
        s.append(grid)

        # Seção consultas / histórico
        s.append(Spacer(1, 10))
        s += section_header('Histórico', 'Prontuário completo por pet', page_w=pw)
        s.append(Paragraph(
            'Cada pet tem sua própria <b>Linha da Vida</b> — uma timeline agrupada por mês '
            'com todos os eventos registrados: vacinas, consultas, remédios, vermífugos, '
            'memórias e observações.',
            ST['body']
        ))
        s.append(Spacer(1, 8))

        status_pills = [
            ('✅  Concluído',   SUCCESS,  SUCCESS_SF),
            ('⏰  Em dia',      INFO,     INFO_SF),
            ('⚠️  Próximo',    WARNING,  WARNING_SF),
            ('🚨  Atrasado',   HexColor('#D6493B'), HexColor('#FBE3DF')),
        ]

        pill_cells = []
        for label, color, bg in status_pills:
            p = Table([[Paragraph(label, ParagraphStyle('sp', fontName='Helvetica-Bold',
                        fontSize=8, textColor=color))]],
                      colWidths=[(pw - 30) / 4])
            p.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), bg),
                ('ROUNDEDCORNERS', [6]),
                ('TOPPADDING',    (0,0), (-1,-1), 5),
                ('BOTTOMPADDING', (0,0), (-1,-1), 5),
                ('LEFTPADDING',   (0,0), (-1,-1), 10),
                ('RIGHTPADDING',  (0,0), (-1,-1), 10),
            ]))
            pill_cells.append(p)

        pill_tbl = Table([pill_cells], colWidths=[(pw - 30)/4]*4)
        pill_tbl.setStyle(TableStyle([
            ('LEFTPADDING',   (0,0), (-1,-1), 0),
            ('RIGHTPADDING',  (0,0), (-1,-1), 0),
            ('TOPPADDING',    (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ('COLPADDING',    (0,0), (-1,-1), 5),
        ]))
        s.append(pill_tbl)

        return s

    # ── Página 5: Módulos Experiência ─────────────────────────────────────
    def _page_modules_2(self):
        pw = W - 48
        s = []
        s += section_header('Experiência', 'Interface & Usabilidade', page_w=pw)

        # Dashboard em destaque
        dash_content = [
            [Paragraph('📱  Dashboard', ParagraphStyle('dh', fontName='Helvetica-Bold',
                        fontSize=16, leading=20, textColor=WHITE))],
            [Spacer(1, 8)],
            [Paragraph(
                'A tela principal do PetCare entrega um resumo inteligente do dia: '
                'saudação dinâmica (Bom dia / Boa tarde / Boa noite), cards de saúde '
                'com contagem de pets, alertas e remédios ativos, próximos eventos '
                'com urgência codificada por cor, e acesso rápido a todos os módulos.',
                ParagraphStyle('db', fontName='Helvetica', fontSize=10,
                               leading=15, textColor=HexColor('#CBD5E1'))
            )],
            [Spacer(1, 10)],
            [Table([[
                Paragraph('Pets cadastrados', ParagraphStyle('di', fontName='Helvetica',
                           fontSize=9, textColor=HexColor('#94A3B8'))),
                Paragraph('Alertas ativos', ParagraphStyle('di2', fontName='Helvetica',
                           fontSize=9, textColor=HexColor('#94A3B8'))),
                Paragraph('Remédios em uso', ParagraphStyle('di3', fontName='Helvetica',
                           fontSize=9, textColor=HexColor('#94A3B8'))),
            ]], colWidths=[(pw - 40)/3]*3)],
        ]
        s.append(dark_card(dash_content, page_w=pw))
        s.append(Spacer(1, 16))

        # Três cards de UX
        ux_cards = [
            ('🌓', 'Tema Claro & Escuro',
             'Paleta exclusiva: laranja #E66A3A, navy #1B2940, creme #FBF5EF. '
             'Suporte nativo a modo escuro com cores otimizadas para telas AMOLED.'),
            ('🔔', 'Notificações Inteligentes',
             'Sistema de lembretes baseado em datas: reforços de vacina, doses de remédio, '
             'consultas de retorno e aniversários do pet. Resumo matinal com pendências.'),
            ('✈️', 'Kit Viagem em PDF',
             'Exportação rápida de um PDF com as vacinas em dia, medicamentos ativos '
             'e contatos de emergência — pronto para apresentar em qualquer lugar.'),
            ('🎭', 'Modo Demo',
             'Carregue pets fictícios e histórico de exemplo em segundos para '
             'demonstrar o app sem expor dados reais. Perfeito para apresentações.'),
            ('💾', 'Backup Completo',
             'Exportação em JSON com todos os dados do app. Pré-visualização de '
             'conteúdo antes de restaurar. Compartilhamento via e-mail, Drive ou AirDrop.'),
            ('🔍', 'Busca Global',
             'Pesquise por qualquer registro — vacina, consulta, remédio, documento — '
             'diretamente na tela de busca sem navegar por menus.'),
        ]
        s.append(two_col_cards(ux_cards, page_w=pw))

        # Seção de Alimentação
        s.append(Spacer(1, 12))
        s += section_header('Feeding', 'Controle de Alimentação', page_w=pw)
        s.append(highlight_box(
            '🍽️  Tela de Alimentação com lembretes diários de ração — configure '
            'horários de refeição e o app notifica na hora certa, mantendo a '
            'rotina alimentar do pet sempre em dia.',
            page_w=pw
        ))

        return s

    # ── Página 6: Privacidade & Segurança ────────────────────────────────
    def _page_privacy(self):
        pw = W - 48
        s = []
        s += section_header('Privacidade', 'Segurança e proteção de dados', page_w=pw)

        s.append(Paragraph(
            'O PetCare foi construído com <b>privacidade como princípio fundamental</b>, '
            'não como recurso opcional. Todos os dados ficam exclusivamente no dispositivo '
            'do usuário.',
            ST['body']
        ))
        s.append(Spacer(1, 14))

        privacy_points = [
            ('🔒', 'Dados 100% locais',
             'Nenhuma informação é enviada para servidores externos. '
             'Tudo fica armazenado no próprio celular do usuário.'),
            ('🚫', 'Zero rastreamento',
             'O app não utiliza analytics, publicidade, '
             'pixels de rastreamento ou qualquer serviço de terceiros.'),
            ('👤', 'Sem conta obrigatória',
             'Não é necessário criar uma conta ou fornecer e-mail. '
             'O app funciona completamente offline desde a primeira abertura.'),
            ('📱', 'Permissões mínimas',
             'Câmera (fotos do pet), Notificações (lembretes) e '
             'Armazenamento (backup/documentos). Nenhuma permissão desnecessária.'),
            ('💾', 'Backup controlado pelo usuário',
             'O backup em JSON é gerado localmente e compartilhado '
             'pelo próprio usuário, para onde ele quiser — sem intermediários.'),
            ('🗑️', 'Exclusão completa',
             'Desinstalar o app remove todos os dados automaticamente. '
             'Sem rastros em servidores, sem contas para deletar.'),
        ]

        s.append(two_col_cards(privacy_points, page_w=pw))
        s.append(Spacer(1, 14))

        # LGPD
        s += section_header('Conformidade', 'LGPD & Regulatório', page_w=pw)
        lgpd_rows = [
            ('Base legal',        'Não aplicável — não há processamento de dados pessoais em servidores'),
            ('Titular dos dados', 'O usuário mantém controle total sobre seus dados'),
            ('Transferência',     'Nenhuma transferência para terceiros'),
            ('Retenção',          'Dados existem apenas enquanto o app está instalado'),
            ('Direito de acesso', 'Usuário acessa e exporta todos os dados via backup JSON'),
        ]

        tbl_data = [
            [Paragraph('Requisito LGPD', ParagraphStyle('th', fontName='Helvetica-Bold',
                        fontSize=9, textColor=WHITE)),
             Paragraph('Implementação no PetCare', ParagraphStyle('th2', fontName='Helvetica-Bold',
                        fontSize=9, textColor=WHITE))],
        ]
        for req, impl in lgpd_rows:
            tbl_data.append([
                Paragraph(req, ParagraphStyle('td', fontName='Helvetica-Bold',
                           fontSize=9, textColor=NAVY)),
                Paragraph(impl, ParagraphStyle('td2', fontName='Helvetica',
                           fontSize=9, textColor=NAVY_MED, leading=13)),
            ])

        lgpd_tbl = Table(tbl_data, colWidths=[pw * 0.3, pw * 0.7])
        lgpd_tbl.setStyle(TableStyle([
            ('BACKGROUND',    (0,0), (-1,0), NAVY),
            ('BACKGROUND',    (0,1), (-1,1), CREAM_DK),
            ('BACKGROUND',    (0,3), (-1,3), CREAM_DK),
            ('ROWBACKGROUNDS',(0,1), (-1,-1), [WHITE, CREAM_DK]),
            ('BOX',           (0,0), (-1,-1), 0.5, BORDER),
            ('INNERGRID',     (0,0), (-1,-1), 0.5, BORDER),
            ('TOPPADDING',    (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('LEFTPADDING',   (0,0), (-1,-1), 10),
            ('RIGHTPADDING',  (0,0), (-1,-1), 10),
            ('ROUNDEDCORNERS', [6]),
        ]))
        s.append(lgpd_tbl)

        return s

    # ── Página 7: Tecnologia ──────────────────────────────────────────────
    def _page_tech(self):
        pw = W - 48
        s = []
        s += section_header('Tecnologia', 'Stack técnica e arquitetura', page_w=pw)

        s.append(Paragraph(
            'O PetCare é um app cross-platform desenvolvido com tecnologias modernas '
            'que garantem performance nativa, manutenibilidade e publicação simultânea '
            'em iOS e Android.',
            ST['body']
        ))
        s.append(Spacer(1, 14))

        tech_stack = [
            ('⚛️', 'React Native + Expo',
             'Framework cross-platform com performance próxima ao nativo. '
             'Hot reload, OTA updates e suporte a câmera, notificações e storage.'),
            ('📘', 'TypeScript',
             'Tipagem estática em 100% do código — '
             'menos bugs, melhor autocompletar, refactoring seguro.'),
            ('🗂️', 'AsyncStorage',
             'Persistência local assíncrona com plano de migração '
             'para SQLite (documentado em docs/SQLITE_MIGRATION.md).'),
            ('🔥', 'Firebase Auth + RTDB',
             'Autenticação com Google e sincronização opcional em nuvem — '
             'usuário escolhe se quer habilitar o backup remoto.'),
            ('🧭', 'React Navigation',
             'Navegação em native-stack com transições nativas '
             'e tipagem completa via TypeScript.'),
            ('📦', 'EAS Build',
             'Pipeline de build gerenciado pela Expo — '
             'gera AAB para Play Store e IPA para App Store sem configuração nativa.'),
        ]

        s.append(two_col_cards(tech_stack, page_w=pw))
        s.append(Spacer(1, 14))

        # Tabela comparativa
        s += section_header('Plataformas', 'Compatibilidade', page_w=pw)

        compat_data = [
            [Paragraph('', ST['body']),
             Paragraph('Android', ParagraphStyle('ch', fontName='Helvetica-Bold',
                        fontSize=10, textColor=WHITE, alignment=TA_CENTER)),
             Paragraph('iOS', ParagraphStyle('ch2', fontName='Helvetica-Bold',
                        fontSize=10, textColor=WHITE, alignment=TA_CENTER)),
             Paragraph('Web (Expo)', ParagraphStyle('ch3', fontName='Helvetica-Bold',
                        fontSize=10, textColor=WHITE, alignment=TA_CENTER))],
        ]
        features = [
            ('Prontuário completo', '✅', '✅', '✅'),
            ('Notificações locais',  '✅', '✅', '⚠️ limitado'),
            ('Câmera / Galeria',    '✅', '✅', '✅'),
            ('Backup JSON',         '✅', '✅', '✅'),
            ('Kit Viagem PDF',      '✅', '✅', '✅'),
            ('Firebase Sync',       '✅', '✅', '✅'),
        ]
        for feat, a, i, w_val in features:
            compat_data.append([
                Paragraph(feat, ST['body_sm']),
                Paragraph(a, ParagraphStyle('ca', fontName='Helvetica', fontSize=10,
                           textColor=SUCCESS, alignment=TA_CENTER)),
                Paragraph(i, ParagraphStyle('ci', fontName='Helvetica', fontSize=10,
                           textColor=SUCCESS, alignment=TA_CENTER)),
                Paragraph(w_val, ParagraphStyle('cw', fontName='Helvetica', fontSize=10,
                           textColor=INFO if w_val == '✅' else WARNING, alignment=TA_CENTER)),
            ])

        col_widths = [pw * 0.4, pw * 0.2, pw * 0.2, pw * 0.2]
        compat_tbl = Table(compat_data, colWidths=col_widths)
        compat_tbl.setStyle(TableStyle([
            ('BACKGROUND',     (0,0), (-1,0), NAVY),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [WHITE, CREAM_DK]),
            ('BOX',            (0,0), (-1,-1), 0.5, BORDER),
            ('INNERGRID',      (0,0), (-1,-1), 0.5, BORDER),
            ('TOPPADDING',     (0,0), (-1,-1), 7),
            ('BOTTOMPADDING',  (0,0), (-1,-1), 7),
            ('LEFTPADDING',    (0,0), (-1,-1), 10),
            ('RIGHTPADDING',   (0,0), (-1,-1), 10),
            ('ROUNDEDCORNERS', [6]),
        ]))
        s.append(compat_tbl)

        return s

    # ── Página 8: Roadmap ─────────────────────────────────────────────────
    def _page_roadmap(self):
        pw = W - 48
        s = []
        s += section_header('Futuro', 'Roadmap de produto', page_w=pw)

        s.append(Paragraph(
            'O PetCare está em evolução contínua. Veja o que está planejado '
            'para as próximas versões:',
            ST['body']
        ))
        s.append(Spacer(1, 14))

        phases = [
            {
                'phase': 'v1.0 — Lançado',
                'title': 'Base completa de saúde e histórico',
                'items': [
                    'Carteira de vacinação digital com alertas',
                    'Controle de medicamentos e doses',
                    'Linha da Vida — timeline completa',
                    'Kit Viagem em PDF',
                    'Cartão de emergência offline',
                    'Backup JSON local',
                ],
                'status': 'Disponível',
                'status_color': SUCCESS,
            },
            {
                'phase': 'v1.1 — Em desenvolvimento',
                'title': 'Performance & Migração de banco',
                'items': [
                    'Migração de AsyncStorage para SQLite',
                    'Queries indexadas para grandes volumes de dados',
                    'Cache de imagens e PDF otimizado',
                    'Melhorias de UX na Linha da Vida',
                ],
                'status': 'Em desenvolvimento',
                'status_color': WARNING,
            },
            {
                'phase': 'v1.2 — Planejado',
                'title': 'Social & Multi-tutor',
                'items': [
                    'Múltiplos tutores por pet (família, clínica, cuidador)',
                    'Notificações push remotas via Firebase',
                    'Sincronização em nuvem automática',
                    'Compartilhamento de prontuário com veterinário',
                ],
                'status': 'Planejado',
                'status_color': INFO,
            },
            {
                'phase': 'v2.0 — Visão',
                'title': 'Plataforma & B2B',
                'items': [
                    'Portal web para clínicas veterinárias',
                    'Integração com sistemas de agendamento',
                    'Relatórios de saúde populacionais (opt-in)',
                    'API para parceiros e petshops',
                ],
                'status': 'Visão futura',
                'status_color': ACCENT,
            },
        ]

        col_w = (pw - 10) / 2
        row1 = [roadmap_item(**phases[0]), roadmap_item(**phases[1])]
        row2 = [roadmap_item(**phases[2]), roadmap_item(**phases[3])]

        # Ajustar para col_w individual
        def rm_card(phase):
            pf  = Paragraph(phase['phase'].upper(),
                             ParagraphStyle('rp', fontName='Helvetica-Bold', fontSize=8,
                                            textColor=phase['status_color']))
            tit = Paragraph(phase['title'],
                             ParagraphStyle('rt', fontName='Helvetica-Bold', fontSize=12,
                                            leading=16, textColor=NAVY))
            sta = Paragraph(f'● {phase["status"]}',
                             ParagraphStyle('rs', fontName='Helvetica', fontSize=9,
                                            textColor=phase['status_color']))
            its = Paragraph('<br/>'.join(f'· {i}' for i in phase['items']),
                             ParagraphStyle('ri', fontName='Helvetica', fontSize=9,
                                            leading=14, textColor=NAVY_MED))

            header = Table([[pf, sta]], colWidths=[col_w * 0.6 - 14, col_w * 0.4 - 14])
            header.setStyle(TableStyle([
                ('LEFTPADDING',   (0,0), (-1,-1), 0),
                ('RIGHTPADDING',  (0,0), (-1,-1), 0),
                ('TOPPADDING',    (0,0), (-1,-1), 0),
                ('BOTTOMPADDING', (0,0), (-1,-1), 0),
                ('ALIGN',         (1,0), (1,0), 'RIGHT'),
            ]))

            card = Table([[header], [Spacer(1, 4)], [tit], [Spacer(1, 6)], [its]],
                         colWidths=[col_w - 28])
            card.setStyle(TableStyle([
                ('BACKGROUND',    (0,0), (-1,-1), WHITE),
                ('BOX',           (0,0), (-1,-1), 0.5, BORDER),
                ('LINEBEFORE',    (0,0), (-1,-1), 4, phase['status_color']),
                ('ROUNDEDCORNERS', [8]),
                ('TOPPADDING',    (0,0), (-1,-1), 12),
                ('BOTTOMPADDING', (0,0), (-1,-1), 12),
                ('LEFTPADDING',   (0,0), (-1,-1), 14),
                ('RIGHTPADDING',  (0,0), (-1,-1), 10),
            ]))
            return card

        grid = Table(
            [[rm_card(phases[0]), rm_card(phases[1])],
             [rm_card(phases[2]), rm_card(phases[3])]],
            colWidths=[col_w, col_w]
        )
        grid.setStyle(TableStyle([
            ('LEFTPADDING',   (0,0), (-1,-1), 0),
            ('RIGHTPADDING',  (0,0), (-1,-1), 0),
            ('TOPPADDING',    (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 10),
            ('COLPADDING',    (0,0), (-1,-1), 6),
        ]))
        s.append(grid)

        # Oportunidade de negócio
        s.append(Spacer(1, 14))
        s += section_header('Oportunidade', 'Por que o mercado pet?', page_w=pw)

        mkt_data = [
            ('R$ 68 bi+', 'Mercado pet brasileiro 2024'),
            ('35%',       'Lares com algum animal de estimação no Brasil'),
            ('8,5%',      'Crescimento anual do setor pet'),
            ('Top 3',     'Brasil no ranking mundial de mercado pet'),
        ]

        col_w2 = pw / len(mkt_data)
        mkt_cells = []
        for num, lbl in mkt_data:
            inner = Table([
                [Paragraph(num, ParagraphStyle('mn', fontName='Helvetica-Bold',
                            fontSize=22, leading=26, textColor=ORANGE, alignment=TA_CENTER))],
                [Paragraph(lbl, ParagraphStyle('ml', fontName='Helvetica', fontSize=8,
                            leading=12, textColor=NAVY_MED, alignment=TA_CENTER))],
            ], colWidths=[col_w2 - 8])
            inner.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), WHITE),
                ('BOX',        (0,0), (-1,-1), 0.5, BORDER),
                ('ROUNDEDCORNERS', [8]),
                ('TOPPADDING',    (0,0), (-1,-1), 14),
                ('BOTTOMPADDING', (0,0), (-1,-1), 14),
                ('LEFTPADDING',   (0,0), (-1,-1), 4),
                ('RIGHTPADDING',  (0,0), (-1,-1), 4),
            ]))
            mkt_cells.append(inner)

        mkt_tbl = Table([mkt_cells], colWidths=[col_w2] * len(mkt_data))
        mkt_tbl.setStyle(TableStyle([
            ('LEFTPADDING',   (0,0), (-1,-1), 2),
            ('RIGHTPADDING',  (0,0), (-1,-1), 2),
            ('TOPPADDING',    (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ]))
        s.append(mkt_tbl)

        return s

    # ── Página 9: Contato ─────────────────────────────────────────────────
    def _page_contact(self):
        pw = W - 48
        s = []
        s += section_header('Contato', 'Vamos conversar?', page_w=pw)

        s.append(Paragraph(
            'Estamos abertos a parcerias, investimentos, integrações com clínicas '
            'veterinárias e oportunidades de distribuição. Entre em contato:',
            ST['body']
        ))
        s.append(Spacer(1, 16))

        # Card de contato
        contact_content = [
            [Paragraph('📧  E-mail', ParagraphStyle('cl', fontName='Helvetica-Bold',
                        fontSize=10, textColor=HexColor('#94A3B8')))],
            [Paragraph('matheu.proensa@gmail.com', ParagraphStyle('cv', fontName='Helvetica-Bold',
                        fontSize=16, leading=20, textColor=WHITE))],
            [Spacer(1, 12)],
            [Paragraph('📱  App', ParagraphStyle('cl2', fontName='Helvetica-Bold',
                        fontSize=10, textColor=HexColor('#94A3B8')))],
            [Paragraph('PetCare — disponível em breve na Play Store e App Store',
                        ParagraphStyle('cv2', fontName='Helvetica', fontSize=12,
                                        leading=16, textColor=WHITE))],
            [Spacer(1, 12)],
            [Paragraph('🐙  Código', ParagraphStyle('cl3', fontName='Helvetica-Bold',
                        fontSize=10, textColor=HexColor('#94A3B8')))],
            [Paragraph('github.com/matheusproensa/petcare',
                        ParagraphStyle('cv3', fontName='Helvetica', fontSize=12,
                                        leading=16, textColor=HexColor('#7CB9F0')))],
        ]
        s.append(dark_card(contact_content, page_w=pw))
        s.append(Spacer(1, 20))

        # Por que apostar no PetCare
        s += section_header('Proposta', 'Por que apostar no PetCare?', page_w=pw)

        reasons = [
            ('💡', 'Produto real e funcional',
             'Não é um conceito. É um app completo, com 12+ funcionalidades, '
             'disponível para download e testável imediatamente.'),
            ('🔒', 'Privacidade como diferencial',
             'Em um mercado de dados, o PetCare se posiciona como o app '
             'que NÃO coleta dados — um diferencial crescente com consumidores.'),
            ('📈', 'Mercado em expansão',
             'O Brasil é o 3º maior mercado pet do mundo com crescimento de 8,5% a.a. '
             'e déficit de soluções digitais de qualidade para tutores.'),
            ('🏗️', 'Arquitetura escalável',
             'Base técnica sólida (TypeScript + Expo + Firebase) que suporta '
             'crescimento para B2B, multi-tenant e integrações veterinárias.'),
        ]
        s.append(two_col_cards(reasons, page_w=pw))
        s.append(Spacer(1, 16))

        # Assinatura final
        s.append(HLine(pw, ORANGE, 1.5))
        s.append(Spacer(1, 12))
        s.append(Paragraph(
            'PetCare — O prontuário digital do seu pet',
            ParagraphStyle('sig', fontName='Helvetica-Bold', fontSize=14,
                            leading=18, textColor=NAVY, alignment=TA_CENTER)
        ))
        s.append(Paragraph(
            '🐾  Porque seu pet merece o melhor cuidado — organizado, acessível e seguro.',
            ParagraphStyle('sig2', fontName='Helvetica', fontSize=10,
                            leading=14, textColor=TEXT_SUBTLE, alignment=TA_CENTER)
        ))
        s.append(Spacer(1, 6))
        s.append(Paragraph(
            'versão 1.0 · junho 2026 · matheu.proensa@gmail.com',
            ST['footer']
        ))

        return s


if __name__ == '__main__':
    print('Gerando apresentação PDF...')
    p = PDFPresentation()
    out = p.build()
    print(f'✅  PDF gerado em: {out}')
